"""DEF-01 production app verification: real Chromium + real Next/SQLite.
AI_BASE_URL/AI_API_KEY/AI_MODEL are deliberately empty in the child process.
No live AI: server-issued deterministic fallback; noncatalog cards are test fixtures.
Run from repo: python docs/verification/personalized-discovery/run-def01-browser.py
"""
import base64
from io import BytesIO
from PIL import Image
import json
import os
import shutil
import socket
import psutil
import subprocess
import time
import urllib.request
from pathlib import Path
from websockets.sync.client import connect
from websockets.typing import Origin

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / 'docs/verification/personalized-discovery/def01'
EVIDENCE.mkdir(exist_ok=True)
PROFILE = ROOT / '.local/def01-browser-profile'
DB_DIR = ROOT / '.local/def01-browser-db'
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
PORT = 3018
BASE = f'http://127.0.0.1:{PORT}'
server = chrome = connection = None
sequence = 0
session_id = None
rows = []
server_pids = []
log = (EVIDENCE / 'runtime.log').open('w', encoding='utf-8')


def listening():
    with socket.socket() as s:
        s.settimeout(.25)
        return s.connect_ex(('127.0.0.1', PORT)) == 0


def start_server():
    global server
    if listening():
        raise RuntimeError('Test port already occupied; refusing to affect another server')
    env = os.environ.copy()
    env.update({'AI_BASE_URL': '', 'AI_API_KEY': '', 'AI_MODEL': '',
                'COACH_DB_PATH': str(DB_DIR / 'conversations.sqlite'), 'NEXT_TELEMETRY_DISABLED': '1'})
    server = subprocess.Popen(['node', str(ROOT / 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', str(PORT)], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
    server_pids.append(server.pid)
    for _ in range(200):
        if server.poll() is not None:
            raise RuntimeError('Task-owned Next server exited')
        try:
            with urllib.request.urlopen(BASE + '/idea', timeout=1) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(.1)
    raise TimeoutError('Next production server not ready')


def stop_server():
    global server
    if server:
        server.terminate()
        server.wait(timeout=20)
        server = None
        for _ in range(100):
            if not listening():
                return
            time.sleep(.1)
        raise RuntimeError('Task-owned listener did not stop')


def cdp(method, **params):
    global sequence
    sequence += 1
    message = {'id': sequence, 'method': method, 'params': params}
    if session_id:
        message['sessionId'] = session_id
    connection.send(json.dumps(message))
    while True:
        response = json.loads(connection.recv(timeout=45))
        if response.get('id') == sequence:
            if 'error' in response:
                raise RuntimeError((method, response['error']))
            return response.get('result', {})


def js(expression):
    result = cdp('Runtime.evaluate', expression=expression, returnByValue=True, awaitPromise=True, userGesture=True)
    if 'exceptionDetails' in result:
        raise RuntimeError(result['exceptionDetails'])
    return result.get('result', {}).get('value')


def start_browser():
    global chrome, connection, session_id
    session_id = None
    (PROFILE / 'DevToolsActivePort').unlink(missing_ok=True)
    chrome = subprocess.Popen([str(CHROME), '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--metrics-recording-only', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--remote-allow-origins=http://127.0.0.1', '--window-size=1280,960', '--user-data-dir=' + str(PROFILE), 'about:blank'], stdout=log, stderr=subprocess.STDOUT)
    for _ in range(400):
        try:
            port = (PROFILE / 'DevToolsActivePort').read_text().splitlines()[0]
            break
        except (OSError, IndexError):
            time.sleep(.05)
    else:
        raise TimeoutError('Chrome debugging port file unavailable')
    with urllib.request.urlopen('http://127.0.0.1:' + port + '/json/version') as response:
        version = json.load(response)
    connection = connect(version['webSocketDebuggerUrl'], origin=Origin('http://127.0.0.1'), max_size=40*1024*1024)
    target = cdp('Target.createTarget', url='about:blank')['targetId']
    session_id = cdp('Target.attachToTarget', targetId=target, flatten=True)['sessionId']
    setup_page()
    return version['Browser']


def setup_page():
    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Network.enable')
    cdp('Page.addScriptToEvaluateOnNewDocument', source="window.__errors=[];window.__requests=[];const realFetch=window.fetch;window.fetch=async(...args)=>{try{const r=await realFetch(...args);if(String(args[0]).includes('/api/ai/coach'))window.__requests.push({status:r.status,body:await r.clone().json()});return r}catch(e){window.__requests.push({error:String(e)});throw e}};addEventListener('error',e=>window.__errors.push(e.message));addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)))")


def stop_browser():
    global chrome, connection, session_id
    if connection:
        session_id = None
        try:
            cdp('Browser.close')
        except Exception:
            pass
        connection.close()
        connection = None
    if chrome:
        try:
            chrome.wait(timeout=20)
        except subprocess.TimeoutExpired:
            root = psutil.Process(chrome.pid)
            children = root.children(recursive=True)
            for child in children:
                child.kill()
            root.kill()
            psutil.wait_procs(children + [root], timeout=10)
        chrome = None
    # Windows Chrome may leave renderer/crash handlers briefly holding the
    # test profile. Match only our exact profile, never a user's Chrome.
    owned = [p for p in psutil.process_iter(['name', 'cmdline']) if p.info['name'].lower() == 'chrome.exe' and str(PROFILE) in ' '.join(p.info.get('cmdline') or [])]
    _, alive = psutil.wait_procs(owned, timeout=5)
    for child in alive:
        child.kill()
    psutil.wait_procs(alive, timeout=5)


def wait(expression, timeout=20):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            value = js(f'Boolean({expression})')
            if value:
                return value
        except RuntimeError:
            pass
        time.sleep(.08)
    try:
        diagnostic = {'url': js('location.href'), 'text': js('document.body.innerText'), 'errors': js('window.__errors || []'), 'requests': js('window.__requests || []'), 'keys': js('Object.keys(localStorage)')}
        (EVIDENCE / 'timeout-diagnostic.json').write_text(json.dumps(diagnostic, ensure_ascii=False, indent=2), encoding='utf-8')
    except Exception:
        pass
    raise TimeoutError(expression)


def check(name, condition, detail=None):
    passed = bool(condition)
    rows.append({'name': name, 'passed': passed, 'detail': detail})
    (EVIDENCE / 'browser-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    if not passed:
        diagnostic = {'text': js('document.body.innerText'), 'cache': js("Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('edtech:coaching:')).map(k=>[k,JSON.parse(localStorage.getItem(k))]))")}
        (EVIDENCE / 'failed-check-diagnostic.json').write_text(json.dumps(diagnostic, ensure_ascii=False, indent=2), encoding='utf-8')
        raise AssertionError((name, detail))


def navigate(path):
    cdp('Page.navigate', url=BASE + path)
    wait("document.readyState === 'complete'")


def click(text):
    return js(f"(() => {{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.includes({json.dumps(text)}));if(!b || b.disabled) throw Error('button not ready: '+{json.dumps(text)});b.click();return true}})()")


def button_disabled(text):
    return js(f"[...document.querySelectorAll('button')].find(e=>e.textContent.includes({json.dumps(text)}))?.disabled")


def fill(selector, text):
    js(f'document.querySelector({json.dumps(selector)}).focus()')
    cdp('Input.dispatchKeyEvent', type='keyDown', key='a', code='KeyA', modifiers=2, windowsVirtualKeyCode=65)
    cdp('Input.dispatchKeyEvent', type='keyUp', key='a', code='KeyA', modifiers=2, windowsVirtualKeyCode=65)
    cdp('Input.insertText', text=text)
    wait(f'document.querySelector({json.dumps(selector)}).value === {json.dumps(text)}')
    time.sleep(.12)


def enter():
    cdp('Input.dispatchKeyEvent', type='keyDown', key='Enter', code='Enter', windowsVirtualKeyCode=13, text='\r', unmodifiedText='\r')
    cdp('Input.dispatchKeyEvent', type='keyUp', key='Enter', code='Enter', windowsVirtualKeyCode=13)


def cache(card='sci-phy-01'):
    return js(f"JSON.parse(localStorage.getItem('edtech:coaching:'+encodeURIComponent('card:'+{json.dumps(card)})))")


def ready(card='sci-phy-01'):
    wait('window.__requests?.length > 0')
    wait("[...document.querySelectorAll('button')].some(e=>e.textContent.includes('เชื่อมต่อบทสนทนา') && !e.disabled)")
    wait(f"JSON.parse(localStorage.getItem('edtech:coaching:'+encodeURIComponent('card:'+{json.dumps(card)})))?.cached?.state.history.length > 0")


def shot(name, width):
    cdp('Page.bringToFront')
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=960, deviceScaleFactor=1, mobile=width < 768)
    js('window.scrollTo(0,0)')
    time.sleep(.15)
    overflow = js('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    check(f'{name}: no page overflow at {width}px', overflow['scroll'] <= overflow['width'], overflow)
    sizes = js("[...document.querySelectorAll('button,a[href],input,textarea')].map(e=>({tag:e.tagName,text:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,50),r:e.getBoundingClientRect()})).filter(x=>x.r.width>0 && x.r.height>0).filter(x=>x.r.height<39.5 || x.r.width<39.5).map(x=>({text:x.text,h:x.r.height,w:x.r.width}))")
    check(f'{name}: touch controls at least 40px', not sizes, sizes)
    image = cdp('Page.captureScreenshot', format='png', captureBeyondViewport=False, fromSurface=True)['data']
    pixels = base64.b64decode(image)
    colors = Image.open(BytesIO(pixels)).convert('RGB').getcolors(maxcolors=1000)
    check(f'{name}: screenshot is rendered, not blank', colors is None or len(colors) > 100)
    (EVIDENCE / f'{name}-{width}.png').write_bytes(pixels)
    check(f'{name}: no browser JS errors', not js('window.__errors || []'), js('window.__errors || []'))


def api(body):
    return js(f"(async()=>{{const r=await fetch('/api/ai/coach',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({json.dumps(body, ensure_ascii=False)})}});return {{status:r.status,data:await r.json()}}}})()")


try:
    if PROFILE.exists() or DB_DIR.exists():
        raise RuntimeError('Task-owned browser/database path already exists; inspect before reusing')
    PROFILE.mkdir(parents=True)
    DB_DIR.mkdir(parents=True)
    start_server()
    browser_version = start_browser()
    print('BROWSER:', browser_version, flush=True)
    print('MODE: real production Next + SQLite; unconfigured upstream; server fallback, not live AI', flush=True)
    navigate('/consent')
    now = '2026-11-05T10:00:00Z'
    constraints = {'timeWeeks': 6, 'budgetBaht': 900, 'equipment': ['โทรศัพท์', 'ไม้บรรทัด'], 'teamSize': 2, 'skills': ['วัดระยะ']}
    state = {'schemaVersion': 2, 'consent': {'accepted': True, 'acceptedAt': now}, 'learner': {'id': 'browser-fixture-learner', 'gradeLevel': 'm_plai', 'createdAt': now, 'updatedAt': now}, 'interview': {'id': 'interview-fixture', 'learnerId': 'browser-fixture-learner', 'gradeLevel': 'm_plai', 'goal': 'ysc', 'constraints': constraints, 'hasInitialIdea': False, 'selectedTrack': 'discovery_track', 'completedAt': now}, 'swipeHistory': [], 'ideas': [], 'projects': [], 'evaluations': [], 'pivots': [], 'activeProjectId': None}
    js('localStorage.setItem("edtech:state", '+json.dumps(json.dumps(state, ensure_ascii=False))+');localStorage.setItem("unrelated-verification","keep")')
    # Two first-use tabs navigate before the owner cookie exists; Web Locks
    # serialize their operations before each POST can mint a new owner.
    first_session = session_id
    cdp('Page.navigate', url=BASE + '/idea?topicCardId=sci-phy-01')
    session_id = None
    second_target = cdp('Target.createTarget', url='about:blank')['targetId']
    second_session = cdp('Target.attachToTarget', targetId=second_target, flatten=True)['sessionId']
    session_id = second_session
    setup_page()
    navigate('/idea?topicCardId=sci-phy-02')
    ready('sci-phy-02')
    second_id = cache('sci-phy-02')['cached']['id']
    session_id = first_session
    ready()
    opened = cache()['cached']
    check('server opening hydrated actual selected card', 'การลดทอนความร้อน' in js('document.body.innerText'))
    check('hydrate grade/goal/constraints, no completed aspects', opened['context']['gradeLevel'] == 'm_plai' and opened['context']['goal'] == 'ysc' and opened['context']['constraints'] == constraints and not any(opened['state']['aspectProgress'].values()))
    check('one server-issued opening, no duplicated client greeting', len(opened['state']['history']) == 1)
    check('hint and examples initially locked', button_disabled('ขอคำใบ้') and button_disabled('คิดไม่ออกจริง'))
    other = api({'action': 'open', 'topicKey': 'card:sci-phy-02', 'context': opened['context']})
    check('first-use concurrent tabs share the same cookie owner', other['status'] == 200 and other['data']['conversation']['id'] == second_id)
    check('HttpOnly owner credential not visible to JavaScript', 'edu-coaching-owner=' not in js('document.cookie'))
    forged = api({'action': 'turn', 'conversationId': opened['id'], 'revision': 1, 'requestId': '629533db-032a-4ab9-a36f-32b39e991717', 'requestedTier': 3, 'state': {'unlockedTiers': [1, 2, 3], 'history': [{'tier': 2}]}})
    check('real HTTP API rejects tampered unsigned browser state', forged['status'] == 400 and 'turn' not in forged['data'])
    for width in [320, 360, 390, 1280]:
        shot('opening', width)
    cdp('Emulation.setDeviceMetricsOverride', width=360, height=960, deviceScaleFactor=1, mobile=True)
    # Native keyboard Enter submits the short/stuck answer, no length/correctness check.
    fill('input[aria-label="คำตอบของคุณ"]', 'ยังคิดไม่ออก')
    check('keyboard focus reaches answer input', js('document.activeElement.getAttribute("aria-label")') == 'คำตอบของคุณ')
    enter()
    wait("[...document.querySelectorAll('button')].some(e=>e.textContent.includes('ขอคำใบ้') && !e.disabled)")
    answered = cache()['cached']
    check('stuck response accepted by real server', answered['state']['history'][0]['learnerResponse'] == 'ยังคิดไม่ออก')
    check('normal answer did not implicitly request examples', answered['turn']['tier'] == 1 and button_disabled('คิดไม่ออกจริง'))
    # Exercise native Tab + Enter activation, not only programmatic clicks.
    js("[...document.querySelectorAll('button')].find(e=>e.textContent.includes('ถามชวนคิด')).focus()")
    cdp('Input.dispatchKeyEvent', type='keyDown', key='Tab', code='Tab', windowsVirtualKeyCode=9)
    cdp('Input.dispatchKeyEvent', type='keyUp', key='Tab', code='Tab', windowsVirtualKeyCode=9)
    check('native Tab reaches the enabled hint control', js("document.activeElement.textContent.includes('ขอคำใบ้')"))
    enter()
    wait("[...document.querySelectorAll('button')].some(e=>e.textContent.includes('คิดไม่ออกจริง') && !e.disabled)")
    hinted = cache()['cached']
    check('actual issued Tier 2 has lenses', hinted['turn']['tier'] == 2 and bool(hinted['turn']['lenses']))
    shot('hint', 360)
    # Restart the app process, then reload this actual browser page.
    before_restart = hinted
    stop_server()
    check('server listener really stopped', not listening())
    start_server()
    check('restart uses a different server process', server_pids[-1] != server_pids[-2])
    cdp('Page.reload', ignoreCache=True)
    ready()
    after_restart = cache()['cached']
    check('server restart + browser reload retain exact conversation/history/progress', after_restart == before_restart)
    check('resumed examples remain eligible without extra answer after hint', not button_disabled('คิดไม่ออกจริง'))
    shot('restart-resume', 390)
    # Close Chromium completely and reopen its persistent profile.
    stop_browser()
    browser_version = start_browser()
    navigate('/idea?topicCardId=sci-phy-01')
    ready()
    check('full browser close/reopen resumes the same conversation and hint', cache()['cached'] == before_restart)
    click('คิดไม่ออกจริง')
    wait('document.querySelector("#student-rewrite")')
    examples = cache()['cached']
    check('only explicit Tier 3 click issued examples', examples['turn']['tier'] == 3 and len(examples['turn']['examples']) >= 2)
    fill('#student-rewrite', examples['turn']['examples'][1])
    click('ยืนยันแนวทางของฉัน')
    wait("document.body.innerText.includes('กรุณาเขียนใหม่')")
    check('copying the second issued example is rejected too', js('!!document.querySelector("#student-rewrite")') and 'กรุณาเขียนใหม่' in js('document.body.innerText'))
    rewrite = 'ฉันจะเปรียบเทียบกล่องจำลองหลังคาที่มีช่องลมต่างกัน แล้วบันทึกอุณหภูมิทุกห้านาทีเพื่อดูว่าระบายความร้อนได้ต่างกันอย่างไร'
    fill('#student-rewrite', rewrite)
    cdp('Page.reload', ignoreCache=True)
    ready()
    wait('document.querySelector("#student-rewrite")')
    check('partial rewrite text survives refresh without bypassing the gate', js('document.querySelector("#student-rewrite").value') == rewrite)
    for width in [320, 360, 390, 1280]:
        shot('rewrite', width)
    click('ยืนยันแนวทางของฉัน')
    wait('!document.querySelector("#student-rewrite")')
    check('own-words explanation is retained', cache()['work']['studentRewrite'] == rewrite)
    # Different topics do not inherit any coaching gates.
    navigate('/idea?topicCardId=sci-phy-02')
    ready('sci-phy-02')
    check('other topic still has fresh gates', button_disabled('ขอคำใบ้') and button_disabled('คิดไม่ออกจริง'))
    cdp('Network.setBlockedURLs', urls=['*/api/ai/coach'])
    fill('input[aria-label="คำตอบของคุณ"]', 'ฉบับร่างหัวข้อใหม่ ยังคิดไม่ออก')
    enter()
    wait("document.body.innerText.includes('ฉบับร่างที่ยังไม่ยืนยันกับเซิร์ฟเวอร์')")
    wait("window.__requests.some(r=>r.error)")
    wait("JSON.parse(localStorage.getItem('edtech:coaching:'+encodeURIComponent('card:sci-phy-02')))?.work?.drafts.some(d=>d.content.includes('ฉบับร่างหัวข้อใหม่'))")
    cdp('Network.setBlockedURLs', urls=[])
    cdp('Page.reload', ignoreCache=True)
    ready('sci-phy-02')
    check('fresh-topic offline answer does not unlock hints/examples after online resume', button_disabled('ขอคำใบ้') and button_disabled('คิดไม่ออกจริง') and cache('sci-phy-02')['cached']['revision'] == 1 and 'ฉบับร่างหัวข้อใหม่' in js('document.body.innerText'))
    navigate('/idea?topicCardId=sci-phy-01')
    ready()
    check('returning topic restores history and own explanation', cache()['cached']['id'] == examples['id'] and cache()['work']['studentRewrite'] == rewrite)
    # Simulated API outage is not an upstream mock: block real browser fetches.
    cdp('Network.setBlockedURLs', urls=['*/api/ai/coach'])
    fill('input[aria-label="คำตอบของคุณ"]', 'ฉบับร่างตอนออฟไลน์ต้องไม่หาย')
    enter()
    wait("document.body.innerText.includes('ฉบับร่างที่ยังไม่ยืนยันกับเซิร์ฟเวอร์')")
    wait("window.__requests.some(r=>r.error)")
    check('offline learner text is kept without new server progression', any(d['content'] == 'ฉบับร่างตอนออฟไลน์ต้องไม่หาย' for d in cache()['work']['drafts']) and cache()['cached']['revision'] == examples['revision'])
    check('offline cannot grant hints or examples', button_disabled('ขอคำใบ้') and button_disabled('คิดไม่ออกจริง'))
    shot('offline-draft', 360)
    cdp('Page.reload', ignoreCache=True)
    ready()
    check('offline draft survives refresh', 'ฉบับร่างตอนออฟไลน์ต้องไม่หาย' in js('document.body.innerText'))
    cdp('Network.setBlockedURLs', urls=[])
    click('เชื่อมต่อบทสนทนา')
    ready()
    check('online recovery retains draft and explains it is unverified', 'ฉบับร่างที่ยังไม่ยืนยันกับเซิร์ฟเวอร์' in js('document.body.innerText'))
    click('ส่งฉบับร่างเพื่อตอบคำถาม')
    wait("!document.body.innerText.includes('ฉบับร่างที่ยังไม่ยืนยันกับเซิร์ฟเวอร์')")
    check('explicit draft resend becomes a server-recorded answer', any(h.get('learnerResponse') == 'ฉบับร่างตอนออฟไลน์ต้องไม่หาย' for h in cache()['cached']['state']['history']))
    # Test a noncatalog selected snapshot through the real page and real route.
    generated = {'id': 'generated-browser-fixture', 'subjectId': 'science', 'subfieldId': 'sci_physics', 'title': 'การ์ดจำลองทดสอบ: ช่องลมกับอุณหภูมิ', 'phenomenon': 'ข้อมูลจำลองเพื่อทดสอบการส่ง snapshot ไม่ใช่ผลสร้าง AI สด', 'curiosityHook': 'จะวัดความต่างได้อย่างไร', 'targetGradeLevels': ['m_plai'], 'difficulty': 'beginner', 'estimatedWeeks': 3, 'estimatedBudgetBaht': 300, 'requiredEquipment': ['โทรศัพท์'], 'minTeamSize': 1, 'maxTeamSize': 3, 'requiredSkills': []}
    js('localStorage.setItem("edtech:topic-card:"+encodeURIComponent('+json.dumps(generated['id'])+'),'+json.dumps(json.dumps(generated, ensure_ascii=False))+')')
    navigate('/idea?topicCardId=' + generated['id'])
    ready(generated['id'])
    generated_session = cache(generated['id'])['cached']
    check('noncatalog snapshot resolves, hydrates and reaches authoritative API', generated_session['context']['topicCard'] == generated and generated['title'] in js('document.body.innerText'))
    shot('generated-snapshot-fixture', 360)
    # Native confirmation for start-new and independent topic preservation.
    old_id = generated_session['id']
    # CDP must accept the synchronous confirm while the click is not awaiting JS.
    cdp('Runtime.evaluate', expression="setTimeout(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('เริ่มบทสนทนาใหม่')).click(),0)")
    time.sleep(.1)
    cdp('Page.handleJavaScriptDialog', accept=True)
    wait("[...document.querySelectorAll('button')].some(e=>e.textContent.includes('เชื่อมต่อบทสนทนา') && !e.disabled)")
    wait("JSON.parse(localStorage.getItem('edtech:coaching:'+encodeURIComponent('card:generated-browser-fixture')))?.cached?.id !== " + json.dumps(old_id))
    check('start-new resets identity/history/gates', cache(generated['id'])['cached']['state']['history'].__len__() == 1 and button_disabled('ขอคำใบ้') and button_disabled('คิดไม่ออกจริง'))
    check('start-new leaves other topic history intact', cache('sci-phy-01')['cached']['id'] == examples['id'])
    # Another open tab has unsent work while this topic is reset elsewhere.
    resetter_session = session_id
    session_id = None
    displaced_target = cdp('Target.createTarget', url='about:blank')['targetId']
    displaced_session = cdp('Target.attachToTarget', targetId=displaced_target, flatten=True)['sessionId']
    session_id = displaced_session
    setup_page()
    navigate('/idea?topicCardId=generated-browser-fixture')
    ready(generated['id'])
    cdp('Network.setBlockedURLs', urls=['*/api/ai/coach'])
    fill('input[aria-label="คำตอบของคุณ"]', 'งานที่ยังไม่ส่งในหน้าต่างอื่น')
    enter()
    wait("document.body.innerText.includes('ฉบับร่างที่ยังไม่ยืนยันกับเซิร์ฟเวอร์')")
    wait("window.__requests.some(r=>r.error)")
    cdp('Network.setBlockedURLs', urls=[])
    session_id = resetter_session
    # Resync before reset so the comparison targets the current authoritative id.
    click('เชื่อมต่อบทสนทนา')
    ready(generated['id'])
    previous_id = cache(generated['id'])['cached']['id']
    cdp('Runtime.evaluate', expression="setTimeout(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('เริ่มบทสนทนาใหม่')).click(),0)")
    time.sleep(.1)
    cdp('Page.handleJavaScriptDialog', accept=True)
    wait("JSON.parse(localStorage.getItem('edtech:coaching:'+encodeURIComponent('card:generated-browser-fixture')))?.cached?.id !== " + json.dumps(previous_id))
    session_id = displaced_session
    wait("document.body.innerText.includes('เริ่มใหม่จากอีกหน้าต่าง')")
    click('เชื่อมต่อบทสนทนา')
    ready(generated['id'])
    wait("document.body.innerText.includes('บทสนทนาเปลี่ยนแล้ว')")
    check('cross-tab reset preserves displaced draft without granting gates', 'งานที่ยังไม่ส่งในหน้าต่างอื่น' in js('document.body.innerText') and button_disabled('ขอคำใบ้') and button_disabled('คิดไม่ออกจริง'))
    # Cross-tab wipe through the real UI must erase mounted in-memory sessions.
    stale_session = session_id
    session_id = None
    wipe_target = cdp('Target.createTarget', url='about:blank')['targetId']
    wipe_session = cdp('Target.attachToTarget', targetId=wipe_target, flatten=True)['sessionId']
    session_id = wipe_session
    setup_page()
    navigate('/consent')
    wait("document.body.innerText.includes('ลบข้อมูลทั้งหมด')")
    click('ลบข้อมูลทั้งหมด')
    wait("document.body.innerText.includes('ยืนยันการลบ')")
    # Consent's native modal confirm button contains 'ลบข้อมูลถาวร'.
    names = js("[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width).map(e=>e.textContent.trim())")
    confirm = next((n for n in names if 'ลบ' in n and ('ถาวร' in n or 'ยืนยัน' in n or 'เดี๋ยวนี้' in n)), None)
    if not confirm:
        raise RuntimeError(('Cannot identify real wipe confirmation', names))
    click(confirm)
    wait("document.body.innerText.includes('ลบข้อมูล')")
    session_id = stale_session
    wait("document.body.innerText.includes('ไม่มีการบันทึกประวัติเก่ากลับคืน')")
    check('cross-tab wipe clears mounted state and disables stale autosave', not js('document.querySelector(\'input[aria-label="คำตอบของคุณ"]\')'))
    check('wipe removes app local keys but not unrelated data', js("Object.keys(localStorage).filter(k=>k.startsWith('edtech:')).length") == 0 and js("localStorage.getItem('unrelated-verification')") == 'keep')
    shot('cross-tab-wiped', 360)
    navigate('/idea?topicCardId=sci-phy-01')
    ready()
    check('after wipe, reopening starts a new server conversation with fresh gates', cache()['cached']['id'] != examples['id'] and cache()['cached']['state']['history'].__len__() == 1 and button_disabled('คิดไม่ออกจริง'))
    summary = {'browser': browser_version, 'checks': len(rows), 'passed': sum(r['passed'] for r in rows), 'failed': sum(not r['passed'] for r in rows), 'mode': 'Real production app/SQLite; upstream unconfigured; deterministic server coaching; generated snapshot explicitly test fixture', 'server_processes': server_pids, 'widths': [320, 360, 390, 1280], 'full_browser_restart': True, 'server_restart': True, 'live_ai': False}
    (EVIDENCE / 'browser-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print('SUMMARY:', json.dumps(summary, ensure_ascii=False), flush=True)
finally:
    stop_browser()
    stop_server()
    log.close()
    for path in [PROFILE, DB_DIR]:
        for _ in range(30):
            try:
                shutil.rmtree(path)
                break
            except FileNotFoundError:
                break
            except PermissionError:
                time.sleep(.2)
        if path.exists():
            raise RuntimeError('Task-owned verification data cleanup failed: ' + str(path))
