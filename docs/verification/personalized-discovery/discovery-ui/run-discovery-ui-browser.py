"""Discovery UI integration — real-browser verification (card t_ea82b33e).

Real headless Chrome -> real `next start` (NODE_ENV=production, PERSISTENCE_BACKEND=supabase,
signed Guest capability) -> supabase-js RPC -> rest-shim.mjs (test-only PostgREST stand-in,
copied from def01-cloud with one change: it also reports 'cards' admission windows) -> REAL
local PostgreSQL 17 running the repository's supabase/migrations (0001-0004).

The AI upstream (used by fresh-card generation AND by coaching while it is configured) is a
LABELLED MOCK OpenAI-compatible server in this script. Its responses are hand-written /
synthetic samples, NOT model output. Nothing here is live-AI evidence. All keys are synthetic
per-run values. Hosted Supabase, Vercel and Google OAuth are NOT exercised.

Run from repo root:  python docs/verification/personalized-discovery/discovery-ui/run-discovery-ui-browser.py
"""
import base64
import json
import os
import secrets
import shutil
import socket
import subprocess
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path

import psutil
from PIL import Image
from websockets.sync.client import connect
from websockets.typing import Origin

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = ROOT / 'docs/verification/personalized-discovery/discovery-ui'
SHOTS = EVIDENCE / 'screenshots'
SHOTS.mkdir(parents=True, exist_ok=True)
PROFILE = ROOT / '.local/discovery-ui-browser-profile'
DB_DIR = ROOT / '.local/discovery-ui-pg'
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
SHIM = EVIDENCE / 'rest-shim.mjs'
PORT, SHIM_HTTP, SHIM_PG, MOCK_PORT = 3021, 55494, 55493, 55495  # outside Windows excluded ranges
BASE = f'http://127.0.0.1:{PORT}'
SUPABASE_URL = f'http://127.0.0.1:{SHIM_HTTP}'
SYN = {'guest': secrets.token_hex(32), 'service': 'synthetic-service-' + secrets.token_hex(8),
       'publishable': 'synthetic-publishable-' + secrets.token_hex(8), 'pg': secrets.token_hex(16),
       'control': secrets.token_hex(16), 'ai': 'synthetic-ai-key-' + secrets.token_hex(8)}
log = (EVIDENCE / 'runtime.log').open('w', encoding='utf-8')
rows = []
server = shim = chrome = connection = None
session_id = None
sequence = 0
server_pids = []

# ---------------- MOCK upstream (labelled; NOT an AI) ----------------
MOCK = {'mode': 'ok', 'cards': [], 'coach': [], 'delay': 0.0}
POOL = [  # hand-written sample candidates (MOCK), loosely about the learner's fish-tank interest
    ('ตัวกรองน้ำตู้ปลาจากกะลามะพร้าว', 'น้ำในตู้ปลาที่บ้านขุ่นเร็วจนต้องเปลี่ยนน้ำบ่อย', 'เทียบความใสของน้ำเมื่อใช้วัสดุกรองราคาถูกสามแบบ ถ่ายภาพด้วยมือถือทุกวัน'),
    ('แสงไฟกับตะไคร่ในตู้ปลา', 'ผนังตู้มีตะไคร่ขึ้นเร็วเมื่อเปิดไฟนาน', 'เปลี่ยนชั่วโมงเปิดไฟแล้ววัดพื้นที่ตะไคร่จากภาพถ่าย'),
    ('พืชน้ำช่วยให้น้ำใสได้แค่ไหน', 'ไม่แน่ใจว่าพืชน้ำช่วยลดความขุ่นจริงหรือไม่', 'เทียบตู้จำลองที่มีและไม่มีพืชน้ำ วัดความขุ่นด้วยแผ่นสีขาว'),
    ('ปริมาณอาหารปลากับความขุ่นของน้ำ', 'ให้อาหารปลามากเกินไปอาจทำให้น้ำเสียเร็ว', 'แบ่งปริมาณอาหารเป็นสามระดับในภาชนะจำลองแล้วบันทึกความขุ่น'),
    ('สมุดบันทึกตู้ปลาบนสเปรดชีต', 'ลืมว่าเปลี่ยนน้ำหรือล้างกรองครั้งล่าสุดเมื่อไร', 'ออกแบบตารางบันทึกแล้วทดลองใช้สองสัปดาห์ เทียบจำนวนครั้งที่ลืม'),
    ('ผ้าคลุมตู้กับอุณหภูมิน้ำตอนกลางคืน', 'น้ำในตู้เย็นลงมากช่วงเช้ามืด', 'วัดอุณหภูมิน้ำทุกชั่วโมงเมื่อคลุมด้วยวัสดุต่างกัน'),
    ('ความถี่ในการเปลี่ยนน้ำที่เหมาะกับตู้เล็ก', 'เปลี่ยนน้ำบ่อยเหนื่อย แต่เปลี่ยนน้อยน้ำขุ่น', 'ทดลองรอบเปลี่ยนน้ำสามแบบในตู้จำลองแล้วบันทึกความใส'),
    ('ตะแกรงกันเศษใบไม้ลงอ่างน้ำ', 'เศษใบไม้ร่วงลงอ่างน้ำหน้าบ้านทำให้น้ำเน่า', 'ทำตะแกรงจากวัสดุเหลือใช้แล้วนับเศษใบไม้ที่ดักได้ต่อวัน'),
    ('ภาชนะเก็บน้ำฝนไว้รดต้นไม้', 'น้ำประปาที่ใช้รดต้นไม้มีค่าใช้จ่าย', 'เทียบปริมาณน้ำฝนที่เก็บได้จากภาชนะรูปทรงต่างกัน'),
    ('สีของภาชนะกับการเกิดตะไคร่', 'ภาชนะใสมีตะไคร่ขึ้นเร็ว', 'ใส่น้ำเท่ากันในภาชนะต่างสีแล้ววัดตะไคร่จากภาพ'),
]
CURSOR = {'i': 0}
THAI = 'กขคงจฉชซญดตถทธนบปผพฟภมยรลวศสหอฮ'


def rnd(n):
    return ''.join(secrets.choice(THAI) for _ in range(n))


def candidate(title, problem, direction, **extra):
    base = {'title': title, 'problem': problem, 'roughDirection': direction, 'interestLink': 'ต่อยอดจากตู้ปลาที่บ้านของผู้เรียน',
            'subfieldId': 'sci_environment', 'difficulty': 'beginner', 'estimatedWeeks': 5, 'estimatedBudgetBaht': 300,
            'requiredEquipment': ['มือถือ', 'ขวดพลาสติก'], 'minTeamSize': 1, 'maxTeamSize': 3, 'requiredSkills': ['การสังเกต'],
            'fitNotes': ['ใช้งบไม่เกินที่มี', 'ทำเสร็จได้ในเวลาที่กำหนด'], 'safetyConcerns': []}
    base.update(extra)
    return base


def unique_batch(n):
    out = []
    for _ in range(n):
        i = CURSOR['i']; CURSOR['i'] += 1
        out.append(candidate(*POOL[i]) if i < len(POOL) else candidate('ไอเดียทดสอบ' + rnd(12), 'ปัญหาทดสอบ' + rnd(16), 'ทดลองทดสอบ' + rnd(16)))
    return out


class MockUpstream(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('content-length', 0))) or b'{}')
        user = next((m['content'] for m in body.get('messages', []) if m['role'] == 'user'), '')
        auth_ok = self.headers.get('authorization') == 'Bearer ' + SYN['ai']
        if user.startswith('สร้างการ์ดไอเดียตั้งต้น'):
            data = json.loads(user.split('\n')[1])
            MOCK['cards'].append({'auth_ok': auth_ok, 'data': data, 'mode': MOCK['mode']})
            if MOCK['delay']:
                time.sleep(MOCK['delay'])
            mode = MOCK['mode']
            if mode == 'down':
                self.send_response(502); self.end_headers(); self.wfile.write(b'mock upstream down'); return
            if mode == 'partial':
                content = json.dumps({'cards': unique_batch(2) + [
                    {'title': 'ไม่ครบ'},
                    candidate('ถังหมักจากเศษอาหาร', 'ดูงานวิจัยที่ https://example.org/x', 'หมักแล้ววัดอุณหภูมิ'),
                    candidate('สีหลังคากับความร้อน', 'เป็นไอเดียใหม่ที่ไม่เคยมีใครทำมาก่อน', 'วัดอุณหภูมิ'),
                ]}, ensure_ascii=False)
            else:
                content = json.dumps({'cards': unique_batch(data['count'])}, ensure_ascii=False)
        else:
            # Coaching prompt: fixed labelled MOCK reply so the server records 'ai' turns.
            MOCK['coach'].append({'auth_ok': auth_ok, 'prompt': user})
            topic = next((l[len('หัวข้อ: '):] for l in user.split(chr(10)) if l.startswith('หัวข้อ: ')), '?')
            content = json.dumps({'content': f'คำถามจาก MOCK (ไม่ใช่ AI) เรื่อง “{topic}”: ปัญหานี้เกิดกับเธอบ่อยแค่ไหน และจะวัดได้อย่างไร?',
                                  'lenses': ['ลองลดสเกลให้ทดสอบในห้องได้', 'ลองใช้ของในบ้าน'],
                                  'examples': ['ตัวอย่าง MOCK 1: เทียบวัสดุกรองสองแบบ', 'ตัวอย่าง MOCK 2: วัดความขุ่นทุกวัน']}, ensure_ascii=False)
        payload = json.dumps({'choices': [{'message': {'content': content}}]}).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(payload)


# ---------------- process helpers (from def01-cloud / fresh-cards runners) ----------------
def port_open(port):
    with socket.socket() as s:
        s.settimeout(.25)
        return s.connect_ex(('127.0.0.1', port)) == 0


def shim_env():
    env = os.environ.copy()
    env.update({'SHIM_DATA_DIR': str(DB_DIR), 'SHIM_PG_PORT': str(SHIM_PG), 'SHIM_HTTP_PORT': str(SHIM_HTTP),
                'SHIM_PG_PASSWORD': SYN['pg'], 'SHIM_SERVICE_KEY': SYN['service'], 'SHIM_CONTROL_TOKEN': SYN['control']})
    return env


def start_shim():
    global shim
    if port_open(SHIM_HTTP) or port_open(SHIM_PG):
        raise RuntimeError('Shim/DB port occupied; refusing to affect another process')
    if not (DB_DIR / 'data').exists():
        subprocess.check_call(['node', str(SHIM), 'init'], cwd=ROOT, env=shim_env(), stdout=log, stderr=subprocess.STDOUT)
    shim = subprocess.Popen(['node', str(SHIM), 'serve'], cwd=ROOT, env=shim_env(), stdout=log, stderr=subprocess.STDOUT)
    for _ in range(300):
        if shim.poll() is not None:
            raise RuntimeError('shim exited')
        if port_open(SHIM_HTTP):
            return
        time.sleep(.1)
    raise TimeoutError('shim not ready')


def stop_shim():
    global shim
    if not shim:
        return
    try:
        urllib.request.urlopen(urllib.request.Request(SUPABASE_URL + '/__control/stop', method='POST', headers={'x-control-token': SYN['control']}), timeout=10).read()
    except Exception:
        pass
    try:
        shim.wait(timeout=40)
    except subprocess.TimeoutExpired:
        shim.kill(); shim.wait(timeout=10)
    shim = None


def build_for_harness():
    env = os.environ.copy()
    env.update({'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': SYN['publishable'],
                'AI_BASE_URL': '', 'AI_API_KEY': '', 'AI_MODEL': '', 'NEXT_TELEMETRY_DISABLED': '1'})
    with (EVIDENCE / 'harness-build.txt').open('w', encoding='utf-8') as out:
        code = subprocess.call(['node', str(ROOT / 'node_modules/next/dist/bin/next'), 'build'], cwd=ROOT, env=env, stdout=out, stderr=subprocess.STDOUT)
    if code:
        raise RuntimeError('harness build failed; see harness-build.txt')


def start_server(ai_configured=True):
    global server
    if port_open(PORT):
        raise RuntimeError('app port occupied')
    env = os.environ.copy()
    env.pop('COACH_DB_PATH', None)
    env.update({'PERSISTENCE_BACKEND': 'supabase', 'SUPABASE_SERVICE_ROLE_KEY': SYN['service'], 'APP_GUEST_SECRET': SYN['guest'],
                'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': SYN['publishable'],
                'APP_ORIGIN': BASE, 'NEXT_TELEMETRY_DISABLED': '1',
                'AI_BASE_URL': f'http://127.0.0.1:{MOCK_PORT}/v1' if ai_configured else '',
                'AI_API_KEY': SYN['ai'] if ai_configured else '', 'AI_MODEL': 'mock-model-not-ai' if ai_configured else ''})
    log.write(f'\n=== next start (ai_configured={ai_configured}) ===\n'); log.flush()
    server = subprocess.Popen(['node', str(ROOT / 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', str(PORT)],
                              cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
    server_pids.append(server.pid)
    for _ in range(300):
        if server.poll() is not None:
            raise RuntimeError('next exited')
        try:
            with urllib.request.urlopen(BASE + '/discovery', timeout=1) as r:
                if r.status == 200:
                    return
        except Exception:
            time.sleep(.1)
    raise TimeoutError('next not ready')


def stop_server():
    global server
    if not server:
        return
    try:
        for child in psutil.Process(server.pid).children(recursive=True):
            child.kill()
    except psutil.NoSuchProcess:
        pass
    server.kill(); server.wait(timeout=20); server = None
    for _ in range(100):
        if not port_open(PORT):
            return
        time.sleep(.1)


def rate_rows():
    req = urllib.request.Request(SUPABASE_URL + '/__control/rate', headers={'x-control-token': SYN['control']})
    return json.load(urllib.request.urlopen(req, timeout=10))


def pace(cards_needed=1, coach_needed=1):
    """Wait for the REAL production admission windows (cards 6/owner/min, coach 12/owner/min)."""
    while True:
        busy = [r for r in rate_rows() if (r['kind'] == 'cards' and not r['global'] and r['used'] > 6 - cards_needed - 1)
                or (r['kind'] == 'coach' and not r['global'] and r['used'] > 12 - coach_needed - 2)
                or (r['global'] and r['used'] >= 55)]
        if not busy:
            return
        delay = max(r['seconds_left'] for r in busy) + .5
        print(f'PACE: waiting {delay:.1f}s for production admission window', flush=True)
        time.sleep(delay)


# ---------------- CDP helpers ----------------
INSTRUMENT = ("window.__errors=[];window.__requests=[];const realFetch=window.fetch;window.fetch=async(...args)=>{const u=String(args[0]);"
              "const rec=u.includes('/api/discovery/cards')||u.includes('/api/ai/coach');let entry=null;"
              "if(rec){entry={url:u,method:(args[1]&&args[1].method)||'GET',body:args[1]&&args[1].body?JSON.parse(args[1].body):null};window.__requests.push(entry)}"
              "try{const r=await realFetch(...args);if(entry){entry.status=r.status;try{entry.response=await r.clone().json()}catch(e){}}return r}"
              "catch(e){if(entry)entry.error=String(e);throw e}};"
              "addEventListener('error',e=>window.__errors.push(e.message));addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)))")


def cdp(method, **params):
    global sequence
    sequence += 1
    message = {'id': sequence, 'method': method, 'params': params}
    if session_id:
        message['sessionId'] = session_id
    connection.send(json.dumps(message))
    while True:
        response = json.loads(connection.recv(timeout=60))
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
    chrome = subprocess.Popen([str(CHROME), '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
                               '--disable-component-update', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                               '--disable-backgrounding-occluded-windows', '--metrics-recording-only', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
                               '--remote-allow-origins=http://127.0.0.1', '--window-size=1280,960', '--user-data-dir=' + str(PROFILE), 'about:blank'], stdout=log, stderr=subprocess.STDOUT)
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
    connection = connect(version['webSocketDebuggerUrl'], origin=Origin('http://127.0.0.1'), max_size=60 * 1024 * 1024, ping_interval=None, max_queue=None)
    target = cdp('Target.createTarget', url='about:blank')['targetId']
    session_id = cdp('Target.attachToTarget', targetId=target, flatten=True)['sessionId']
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Network.enable')
    cdp('Page.addScriptToEvaluateOnNewDocument', source=INSTRUMENT)
    return version['Browser']


def stop_browser():
    global chrome, connection, session_id
    if connection:
        session_id = None
        try:
            cdp('Browser.close')
        except Exception:
            pass
        connection.close(); connection = None
    if chrome:
        try:
            chrome.wait(timeout=20)
        except subprocess.TimeoutExpired:
            chrome.kill()
        chrome = None
    owned = [p for p in psutil.process_iter(['name', 'cmdline']) if (p.info['name'] or '').lower() == 'chrome.exe' and str(PROFILE) in ' '.join(p.info.get('cmdline') or [])]
    _, alive = psutil.wait_procs(owned, timeout=5)
    for child in alive:
        child.kill()


def viewport(width, height=900):
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width < 768)


def wait(expression, timeout=30):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            if js(f'Boolean({expression})'):
                return True
        except RuntimeError:
            pass
        time.sleep(.08)
    diagnostic = {'expression': expression, 'url': js('location.href'), 'text': js('document.body.innerText')[:4000],
                  'errors': js('window.__errors || []'), 'requests': js('window.__requests || []')}
    (EVIDENCE / 'timeout-diagnostic.json').write_text(json.dumps(diagnostic, ensure_ascii=False, indent=2), encoding='utf-8')
    raise TimeoutError(expression)


def check(name, condition, detail=None):
    passed = bool(condition)
    rows.append({'name': name, 'passed': passed, 'detail': detail})
    (EVIDENCE / 'browser-results.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    if not passed:
        try:
            (EVIDENCE / 'failed-check-diagnostic.json').write_text(json.dumps({'name': name, 'detail': detail, 'text': js('document.body.innerText')[:6000],
                                                                                 'session': session_state(), 'requests': requests()[-6:]}, ensure_ascii=False, indent=2), encoding='utf-8')
        except Exception:
            pass
        raise AssertionError((name, detail))


def navigate(path):
    cdp('Page.navigate', url=BASE + path)
    wait("document.readyState === 'complete'")


def reload():
    cdp('Page.reload', ignoreCache=True)
    time.sleep(.3)
    wait("document.readyState === 'complete'")


def body_text():
    return js('document.body.innerText')


def click(text, exact=False):
    cond = f"e.textContent.trim()==={json.dumps(text)}" if exact else f"e.textContent.includes({json.dumps(text)})"
    return js(f"(() => {{const b=[...document.querySelectorAll('button,a')].find(e=>{cond});if(!b || b.disabled) throw Error('button not ready: '+{json.dumps(text)});b.scrollIntoView({{block:'center'}});b.click();return true}})()")


def button_disabled(text):
    return js(f"[...document.querySelectorAll('button')].find(e=>e.textContent.includes({json.dumps(text)}))?.disabled")


def fill(selector, text):
    js(f'(()=>{{const e=document.querySelector({json.dumps(selector)});e.scrollIntoView({{block:"center"}});e.focus();e.select();}})()')
    cdp('Input.insertText', text=text)
    wait(f'document.querySelector({json.dumps(selector)}).value === {json.dumps(text)}')
    time.sleep(.1)


def key(name, code, vk):
    cdp('Input.dispatchKeyEvent', type='keyDown', key=name, code=code, windowsVirtualKeyCode=vk)
    cdp('Input.dispatchKeyEvent', type='keyUp', key=name, code=code, windowsVirtualKeyCode=vk)


def session_state():
    return js("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')||'null')")


def requests(kind='/api/discovery/cards'):
    return [r for r in (js('window.__requests || []') or []) if kind in r['url']]


def server_quota():
    return js("fetch('/api/discovery/cards',{cache:'no-store'}).then(r=>r.json()).then(j=>j.quota)")


def shot(name, width, full=True):
    viewport(width)
    time.sleep(.25)
    overflow = js('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    check(f'{name}: no horizontal page overflow at {width}px', overflow['scroll'] <= overflow['width'], overflow)
    small = js("[...document.querySelectorAll('button,a[href],input,textarea,select,summary')].map(e=>({text:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,50),r:e.getBoundingClientRect()})).filter(x=>x.r.width>0&&x.r.height>0).filter(x=>x.r.height<39.5||x.r.width<39.5).map(x=>({text:x.text,h:Math.round(x.r.height),w:Math.round(x.r.width)}))")
    check(f'{name}: interactive controls at least 40px at {width}px', not small, small)
    image = cdp('Page.captureScreenshot', format='png', captureBeyondViewport=False, fromSurface=True)['data']
    pixels = base64.b64decode(image)
    colors = Image.open(BytesIO(pixels)).convert('RGB').getcolors(maxcolors=1000)
    check(f'{name}: screenshot rendered (not blank) at {width}px', colors is None or len(colors) > 100)
    (SHOTS / f'{name}-{width}.png').write_bytes(pixels)
    if full:
        h = min(js('document.documentElement.scrollHeight'), 6000)
        data = cdp('Page.captureScreenshot', format='png', captureBeyondViewport=True, fromSurface=True, clip={'x': 0, 'y': 0, 'width': width, 'height': h, 'scale': 1})['data']
        (SHOTS / f'{name}-{width}-full.png').write_bytes(base64.b64decode(data))
    check(f'{name}: no browser JS errors', not js('window.__errors || []'), js('window.__errors || []'))


def seed_learner():
    navigate('/consent')
    now = '2026-11-06T03:00:00Z'
    constraints = {'timeWeeks': 6, 'budgetBaht': 1000, 'equipment': ['smartphone', 'computer'], 'teamSize': 2, 'skills': ['coding', 'data_math']}
    state = {'schemaVersion': 2, 'consent': {'accepted': True, 'acceptedAt': now}, 'learner': {'id': 'browser-fixture-learner', 'gradeLevel': 'm_plai', 'createdAt': now, 'updatedAt': now},
             'interview': {'id': 'interview-fixture', 'learnerId': 'browser-fixture-learner', 'gradeLevel': 'm_plai', 'goal': 'classroom', 'constraints': constraints,
                           'hasInitialIdea': False, 'selectedTrack': 'discovery_track', 'completedAt': now},
             'swipeHistory': [], 'ideas': [], 'projects': [], 'evaluations': [], 'pivots': [], 'activeProjectId': None}
    js(f"localStorage.setItem('edtech:state', {json.dumps(json.dumps(state, ensure_ascii=False))})")


def last_post():
    posts = [r for r in requests() if r['method'] == 'POST']
    return posts[-1] if posts else None


def wait_post_done(count_before):
    wait(f"(window.__requests||[]).filter(r=>r.url.includes('/api/discovery/cards') && r.method==='POST' && r.status).length > {count_before}", timeout=60)
    wait("!document.body.innerText.includes('กำลังให้ AI สร้างการ์ด')", timeout=60)


def posts_done():
    return len([r for r in requests() if r['method'] == 'POST' and r.get('status')])


# =====================================================================
try:
    for path in (PROFILE, DB_DIR):  # task-owned scratch dirs from a previous run of THIS script only
        if path.exists():
            shutil.rmtree(path)
    PROFILE.mkdir(parents=True)
    DB_DIR.mkdir(parents=True)
    mock_server = ThreadingHTTPServer(('127.0.0.1', MOCK_PORT), MockUpstream)
    threading.Thread(target=mock_server.serve_forever, daemon=True).start()
    build_for_harness()
    start_shim()
    start_server(ai_configured=True)
    browser = start_browser()
    print('BROWSER:', browser, flush=True)
    print('MODE: real next start + supabase-js -> local REST shim -> real PostgreSQL 17; card upstream = LABELLED MOCK (not AI)', flush=True)
    viewport(360)
    seed_learner()

    # ---- 1. Interest chat, “ยังไม่รู้” guidance (360px) ----
    navigate('/discovery')
    wait("document.querySelector('[data-testid=interest-question]')")
    text = body_text()
    check('discovery opens with the adaptive interest chat, not the seed catalog deck', 'เริ่มจากเรื่องที่คุณอยากทำ' in text and 'เลือกสาขา' not in text and '90' not in text and not js("document.querySelector('[data-testid=active-card]')"))
    wait("document.querySelector('[data-testid=quota-free]')")
    check('real server quota shown before any generation (5 free / 30 extra)', js("document.querySelector('[data-testid=quota-free]').textContent") == '5' and js("document.querySelector('[data-testid=quota-extra]').textContent") == '30')
    shot('01-chat-start', 360)
    click('ยังไม่รู้', exact=True)
    wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('ใกล้ตัว')")
    check('“ยังไม่รู้” gets a guiding near-life question (no silent subject pick, no cards)', not session_state()['cards'] and 'ไม่เป็นไร' in js("document.querySelector('[data-testid=interest-question]').textContent"))
    shot('02-chat-unknown-guided', 360)
    fill('#interest-answer', 'ตู้ปลาที่บ้าน น้ำขุ่นเร็วมาก')
    js("document.querySelector('#interest-answer').closest('form').requestSubmit()")
    wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('ตู้ปลาที่บ้าน')")
    check('follow-up question adapts to the typed answer', 'ตู้ปลาที่บ้าน น้ำขุ่นเร็วมาก' in js("document.querySelector('[data-testid=interest-question]').textContent"))
    q_texts = [a['question'] for a in session_state()['answers']] + [js("document.querySelector('[data-testid=interest-question]').textContent")]
    check('interest questions never ask known constraints or identity', not any(w in q for q in q_texts for w in ['งบ', 'สัปดาห์', 'อุปกรณ์', 'ทีม', 'ทักษะ', 'ชื่อ', 'โรงเรียน', 'ระดับชั้น']), q_texts)
    click('เปรียบเทียบสิ่งที่วัดได้')
    wait("document.querySelector('#interest-summary')")
    check('summary after 3 answers (first was “ยังไม่รู้”), one question at a time', len(session_state()['answers']) == 3)
    fill('#interest-summary', 'อยากทำให้น้ำในตู้ปลาที่บ้านใสนานขึ้นด้วยของราคาถูก')
    shot('03-summary-editable', 360)

    # ---- 2. Real generate5 (MOCK upstream, delayed to capture loading) ----
    MOCK['delay'] = 2.5
    pace()
    n0 = posts_done()
    click('สร้างการ์ด 5 ใบ')
    wait("document.body.innerText.includes('กำลังให้ AI สร้างการ์ด')", timeout=10)
    check('truthful loading state: no quota charged until accepted', 'ยังไม่หักโควตา' in body_text())
    shot('04-loading', 360, full=False)
    wait_post_done(n0)
    MOCK['delay'] = 0
    wait("document.querySelector('[data-testid=active-card]')")
    first = last_post()
    st = session_state()
    sent = MOCK['cards'][-1]['data']
    check('generation request carried the edited summary, answers and interview constraints', first['body']['interest']['summary'] == 'อยากทำให้น้ำในตู้ปลาที่บ้านใสนานขึ้นด้วยของราคาถูก'
          and first['body']['learner']['constraints']['budgetBaht'] == 1000 and 'สมาร์ตโฟน / แท็บเล็ต' in first['body']['learner']['constraints']['equipment'], first['body'])
    check('server prompt to the (MOCK) upstream contained the learner interest + constraints; key only server-side',
          sent['interestSummary'] == 'อยากทำให้น้ำในตู้ปลาที่บ้านใสนานขึ้นด้วยของราคาถูก' and sent['learner']['budgetBaht'] == 1000 and MOCK['cards'][-1]['auth_ok']
          and SYN['ai'] not in json.dumps(js('JSON.stringify(localStorage)')))
    check('5 accepted fresh cards persisted with snapshots', len(st['cards']) == 5 and all(c['id'].startswith('fresh_') and c['starter']['origin'] == 'ai_fresh' for c in st['cards']))
    check('quota after first 5: free 0/5, extra 30/30 (server truth)', js("document.querySelector('[data-testid=quota-free]').textContent") == '0' and js("document.querySelector('[data-testid=quota-extra]').textContent") == '30')
    text = body_text()
    check('card shows truthful source/limits; no “verified” or safety-passed claim', 'AI สร้างใหม่จากคำตอบของคุณ' in text and 'ยังไม่ตรวจความใหม่' in text and 'ตรวจคำเบื้องต้น' in text
          and 'Verified' not in text and 'ผ่านการตรวจสอบความปลอดภัย' not in text)
    shot('05-deck', 360)

    # ---- 3. Skip / like (keyboard + buttons), undo, refresh resume ----
    js("document.querySelector('[data-testid=active-card]').focus()")
    key('ArrowLeft', 'ArrowLeft', 37)
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).cursor === 1")
    click('สนใจ →')
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).shortlist.length === 1")
    js("document.querySelector('[data-testid=active-card]').focus()")
    key('ArrowRight', 'ArrowRight', 39)
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).shortlist.length === 2")
    click('ย้อนการปัดล่าสุด')
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).shortlist.length === 1")
    click('สนใจ →')
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).shortlist.length === 2")
    st = session_state()
    check('one skip does not remove other same-subject cards from the batch', len(st['batch']) == 5 and st['cursor'] == 3 and [r['action'] for r in st['reactions']] == ['skip', 'like', 'like'])
    cards_before = [c['id'] for c in st['cards']]
    reload()
    wait("document.querySelector('[data-testid=active-card]')")
    st2 = session_state()
    check('refresh resumes the same deck position, cards, swipes and shortlist (no new generation)',
          st2['cursor'] == 3 and [c['id'] for c in st2['cards']] == cards_before and st2['shortlist'] == st['shortlist'] and all(r['method'] == 'GET' for r in requests()))
    check('active card after refresh is the 4th card of the batch', js("document.querySelector('[data-testid=active-card]').dataset.cardId") == st['batch'][3])

    # ---- 4. Refine + more5 using likes/skips/typed refinement ----
    js("document.querySelector('#refine-box').open=true")
    fill('#refinement', 'ไม่ต้องซื้ออุปกรณ์เพิ่ม ใช้ของในบ้าน')
    n0 = posts_done()
    pace()
    click('ขอการ์ดเพิ่ม 5 ใบ')
    wait_post_done(n0)
    more = last_post()
    sent = MOCK['cards'][-1]['data']
    liked_titles = [c['title'] for c in st['cards'] if c['id'] in st['shortlist']]
    skipped_title = next(c['title'] for c in st['cards'] if c['id'] == st['reactions'][0]['id'])
    check('more5 request used likes, skips, typed refinement and all seen ids', more['body']['refinement']['text'] == 'ไม่ต้องซื้ออุปกรณ์เพิ่ม ใช้ของในบ้าน'
          and set(more['body']['refinement']['likedCardIds']) == set(st['shortlist']) and more['body']['refinement']['skippedCardIds'] == [st['reactions'][0]['id']]
          and set(more['body']['seenCardIds']) == set(cards_before), more['body'])
    check('server prompt carried liked/skipped ideas and seen titles to avoid (MOCK upstream)', sent['refinement'] == 'ไม่ต้องซื้ออุปกรณ์เพิ่ม ใช้ของในบ้าน'
          and any(i['title'] in liked_titles for i in sent['likedIdeas']) and any(i['title'] == skipped_title for i in sent['skippedIdeas']) and set(sent['alreadySeenTitles']) >= {c['title'] for c in st['cards']})
    st = session_state()
    check('previous cards kept and 5 new unique cards added (10 total, no repeats)', len(st['cards']) == 10 and len({c['title'] for c in st['cards']}) == 10 and len(st['batch']) == 5 and st['cursor'] == 0)
    check('quota: extra 25/30 after second batch', js("document.querySelector('[data-testid=quota-extra]').textContent") == '25')

    # ---- 5. Partial batch: only accepted are charged; no template fill ----
    MOCK['mode'] = 'partial'
    js("document.querySelector('#refine-box').open=true")
    n0 = posts_done(); pace()
    click('ขอการ์ดเพิ่ม 5 ใบ')
    wait_post_done(n0)
    MOCK['mode'] = 'ok'
    st = session_state()
    check('partial batch: honest “2 จาก 5”, charged 2, no filler cards', st['notice']['kind'] == 'partial' and '2 จาก 5' in st['notice']['messageTh'] and len(st['cards']) == 12 and len(st['batch']) == 2
          and js("document.querySelector('[data-testid=quota-extra]').textContent") == '23')
    shot('06-partial', 360)

    # ---- 6. Upstream unavailable → truthful error, nothing charged, retry gets a NEW requestId ----
    MOCK['mode'] = 'down'
    js("document.querySelector('#refine-box').open=true")
    n0 = posts_done(); pace()
    click('ขอการ์ดเพิ่ม 5 ใบ')
    wait_post_done(n0)
    failed = last_post()
    st = session_state()
    check('unavailable: Thai error, answers + 12 cards kept, quota unchanged, no fake cards', failed['status'] == 503 and failed['response']['code'] == 'AI_UNAVAILABLE'
          and st['notice']['kind'] == 'error' and len(st['cards']) == 12 and len(st['answers']) == 3 and js("document.querySelector('[data-testid=quota-extra]').textContent") == '23'
          and 'ติดต่อบริการ AI ไม่ได้' in body_text())
    shot('07-unavailable-retry', 360)
    MOCK['mode'] = 'ok'
    n0 = posts_done(); pace()
    click('ลองใหม่')
    wait_post_done(n0)
    retried = last_post()
    check('retry after a failed intent uses a NEW requestId and succeeds', retried['status'] == 200 and retried['body']['requestId'] != failed['body']['requestId'] and len(session_state()['cards']) == 17)

    # ---- 7. Network failure → same intent kept; retry resends identical id/body; charged once ----
    cdp('Network.setBlockedURLs', urls=['*/api/discovery/cards'])
    js("document.querySelector('#refine-box').open=true")
    pace()
    click('ขอการ์ดเพิ่ม 5 ใบ')
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).notice?.retry === 'same'")
    st = session_state()
    blocked_id = st['pending']['requestId']
    check('network failure: truthful “เชื่อมต่อเซิร์ฟเวอร์ไม่ได้”, pending intent kept with its exact body', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' in body_text() and st['pending'] is not None and len(st['cards']) == 17)
    reload()  # refresh while an intent is pending: resumes the SAME intent automatically
    time.sleep(1)
    cdp('Network.setBlockedURLs', urls=[])
    if session_state()['pending']:
        n0 = posts_done(); pace()
        click('ลองใหม่')
        wait_post_done(n0)
    resent = [r for r in requests() if r['method'] == 'POST' and r.get('status') == 200][-1]
    check('retry after network failure resent the SAME requestId; 5 cards added once', resent['body']['requestId'] == blocked_id and len(session_state()['cards']) == 22
          and server_quota()['used'] == 22)

    # ---- 8. Shortlist, compare 2, select → coaching with the generated card's actual context ----
    click('3 คัดเลือก')
    wait("document.body.innerText.includes('เก็บไว้คิดต่อ')")
    ids = session_state()['shortlist']
    js("[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('เลือกเทียบ'))[0].click()")
    js("[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('เลือกเทียบ') && !b.textContent.includes('✓'))[0].click()")
    wait("JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1')).compare.length === 2")
    shot('08-shortlist', 360)
    click('เทียบ 2/2')
    wait("document.body.innerText.includes('สองเรื่องนี้')")
    check('compare view shows both cards with constraint fit text', js("document.querySelectorAll('article[data-card-id]').length") == 2 and 'เทียบกับข้อจำกัดของคุณ' in body_text())
    shot('09-compare', 360)
    st = session_state()
    chosen = next(c for c in st['cards'] if c['id'] == st['compare'][0])
    pace(coach_needed=3)
    js("[...document.querySelectorAll('article[data-card-id]')][0].querySelector('button').click()")
    wait(f"location.pathname === '/idea' && location.search.includes({json.dumps(chosen['id'])})")
    wait("(window.__requests||[]).some(r=>r.url.includes('/api/ai/coach') && r.status===200)", timeout=60)
    opened = [r for r in requests('/api/ai/coach') if r.get('status') == 200][-1]
    ctx = opened['body']['context']
    check('coach open sent the selected generated card snapshot + constraints (not a catalog lookup)', ctx['topicCard']['id'] == chosen['id'] and ctx['topicCard']['starter']['roughDirection'] == chosen['starter']['roughDirection']
          and ctx['constraints']['budgetBaht'] == 1000 and opened['body']['topicKey'] == 'card:' + chosen['id'])
    coach_prompt = MOCK['coach'][-1]['prompt'] if MOCK['coach'] else ''
    check('server coaching prompt was built from that card’s problem + rough direction + interest link (MOCK upstream)',
          chosen['title'] in coach_prompt and chosen['starter']['roughDirection'] in coach_prompt and 'เชื่อมกับความสนใจ' in coach_prompt)
    wait(f"document.body.innerText.includes({json.dumps(chosen['title'][:20])})")
    wait("document.querySelector('[data-testid=selected-starter]')")
    check('coaching page shows the selected generated card’s own problem/direction/interest link',
          chosen['starter']['roughDirection'] in js("document.querySelector('[data-testid=selected-starter]').innerText") and chosen['starter']['interestLink'] in body_text())
    js('window.scrollTo(0,0)')
    shot('10-coach-selected-card', 360)
    shot('10-coach-selected-card', 1280)
    viewport(360)
    conv_a = opened['response']['conversation']['id']

    # ---- 9. Coaching gate preserved: Tier 3 locked until answer + Tier-2 hint; rewrite gate ----
    tier3_disabled = "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('คิดไม่ออกจริง'))?.disabled"
    check('Tier 3 locked on the first turn of this generated-card conversation', js(tier3_disabled) is True)
    pace(coach_needed=3)
    fill('input[aria-label="คำตอบของคุณ"]', 'ยังคิดไม่ออก')
    js('document.querySelector("input[aria-label=\'คำตอบของคุณ\']").closest("form").requestSubmit()')
    wait("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('ขอคำใบ้')) && ![...document.querySelectorAll('button')].find(b=>b.textContent.includes('ขอคำใบ้')).disabled", timeout=40)
    check('Tier 3 still locked after the answer, before a Tier-2 hint', js(tier3_disabled) is True)
    click('ขอคำใบ้')
    wait(f"!{tier3_disabled}", timeout=40)
    pace(coach_needed=2)
    click('คิดไม่ออกจริง')
    wait('document.querySelector("#student-rewrite")', timeout=40)
    issued = [r for r in requests('/api/ai/coach') if r.get('status') == 200][-1]['response']['conversation']['turn']
    check('explicit Tier 3 (after answer + Tier-2 hint) issues examples and opens the own-words gate', issued['tier'] == 3 and len(issued['examples']) >= 2 and 'ด้วยภาษาของคุณเอง' in body_text())
    fill('#student-rewrite', issued['examples'][0])
    click('ยืนยันแนวทางของฉัน')
    wait("document.body.innerText.includes('กรุณาเขียนใหม่')")
    check('copying an issued example is rejected by the rewrite gate', js('!!document.querySelector("#student-rewrite")'))
    shot('11-rewrite-gate', 360)

    # ---- 10. A different generated card is an isolated conversation with its own context ----
    navigate('/discovery')
    wait("document.body.innerText.includes('ค้นหาเรื่องที่อยากทำ')")
    click('2 สำรวจการ์ด')
    wait("document.querySelector('[data-testid=deck-counts]')")
    click('การ์ดที่บันทึกทั้งหมด')
    wait("document.body.innerText.includes('ทุกใบที่เคยได้รับยังอยู่')")
    st = session_state()
    other = next(c for c in st['cards'] if c['id'] not in (chosen['id'],) and c['id'] not in st['shortlist'])
    pace(coach_needed=2)
    js(f"document.querySelector('li[data-card-id={json.dumps(other['id'])}]').querySelectorAll('button')[1].click()")
    wait(f"location.search.includes({json.dumps(other['id'])})")
    wait(f"(window.__requests||[]).some(r=>r.url.includes('/api/ai/coach') && r.status===200 && r.body?.topicKey==={json.dumps('card:' + other['id'])})", timeout=60)
    opened_b = [r for r in requests('/api/ai/coach') if r.get('status') == 200 and r['body'].get('topicKey') == 'card:' + other['id']][-1]
    conv_b = opened_b['response']['conversation']
    check('second card: separate conversation, its own context, fresh Tier-1 gate', conv_b['id'] != conv_a and conv_b['context']['topicCard']['id'] == other['id']
          and len(conv_b['state']['history']) == 1 and chosen['starter']['roughDirection'] not in json.dumps(conv_b, ensure_ascii=False))
    pace(coach_needed=2)
    navigate('/idea?topicCardId=' + chosen['id'])
    wait(f"(window.__requests||[]).some(r=>r.url.includes('/api/ai/coach') && r.status===200 && r.body?.topicKey==={json.dumps('card:' + chosen['id'])})", timeout=60)
    back = [r for r in requests('/api/ai/coach') if r.get('status') == 200 and r['body'].get('topicKey') == 'card:' + chosen['id']][-1]['response']['conversation']
    check('returning to the first card resumes its own conversation history', back['id'] == conv_a and len(back['state']['history']) >= 3)

    # ---- 11. Next server restart → discovery resumes; quota is server-durable ----
    stop_server(); start_server(ai_configured=True)
    navigate('/discovery')
    wait("document.querySelector('[data-testid=quota-free]')")
    check('after a real Next restart: same saved cards and server quota (22 used)', len(session_state()['cards']) == 22 and server_quota()['used'] == 22)

    # ---- 12. Exhaust 35/day; topic switch / new interview does not renew ----
    for expected in (27, 32, 35):
        click('2 สำรวจการ์ด')
        wait("document.querySelector('[data-testid=deck-counts]')")
        js("document.querySelector('#refine-box').open=true")
        n0 = posts_done(); pace()
        click('ขอการ์ดเพิ่ม 5 ใบ')
        wait_post_done(n0)
        check(f'allowance consumed honestly to {expected}', server_quota()['used'] == expected)
    calls_before = len(MOCK['cards'])
    check('at 35/35 the UI shows 0 free / 0 extra and disables more', js("document.querySelector('[data-testid=quota-extra]').textContent") == '0' and button_disabled('ขอการ์ดเพิ่ม 5 ใบ'))
    # Server-side enforcement too (bypassing the disabled button): 429, no model call.
    forced = js("(async()=>{const s=JSON.parse(localStorage.getItem('edtech:discovery-fresh:v1'));const b={requestId:crypto.randomUUID(),count:5,learner:{gradeLevel:'m_plai',goal:'classroom',constraints:{timeWeeks:6,budgetBaht:1000,equipment:[],teamSize:2,skills:[]}},interest:{answers:s.answers},seenCardIds:[]};const r=await fetch('/api/discovery/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return {status:r.status,data:await r.json()}})()")
    check('server refuses the 36th card: 429 quota_exhausted, no upstream call', forced['status'] == 429 and forced['data']['status'] == 'quota_exhausted' and len(MOCK['cards']) == calls_before)
    shot('12-quota-exhausted', 360)
    click('เริ่มคุยใหม่')
    wait("document.querySelector('[data-testid=interest-question]')")
    click('พืชและการปลูก'); wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('พืชและการปลูก')")
    click('ต้นไม้แห้งเร็ว'); wait("document.querySelector('#interest-summary')")
    renewal = {'button_disabled': button_disabled('สร้างการ์ดเพิ่ม 5 ใบ'), 'server_quota': server_quota(), 'cards': len(session_state()['cards'])}
    check('new interview/topic does not renew the daily allowance (button disabled, quota 0, all 35 cards kept)',
          renewal['button_disabled'] and renewal['server_quota']['remaining'] == 0 and renewal['cards'] == 35, renewal)

    # ---- 13. Desktop + other widths ----
    click('2 สำรวจการ์ด'); wait("document.querySelector('[data-testid=deck-counts]')")
    for w in (320, 390, 1280):
        shot(f'13-deck-{w}', w)
    click('3 คัดเลือก'); wait("document.body.innerText.includes('เก็บไว้คิดต่อ')")
    shot('14-shortlist-desktop', 1280)
    click('1 คุยความสนใจ'); wait("document.querySelector('#interest-summary')")
    shot('15-summary-desktop', 1280)
    viewport(360)

    # ---- 14. AI unconfigured → honest failure, not fabricated success (fresh owner) ----
    stop_server(); start_server(ai_configured=False)
    cdp('Network.clearBrowserCookies')
    js('localStorage.clear()')
    seed_learner()
    navigate('/discovery')
    wait("document.querySelector('[data-testid=interest-question]')")
    click('สิ่งแวดล้อมรอบตัว'); wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('สิ่งแวดล้อมรอบตัว')")
    click('อยากลดขยะ'); wait("document.querySelector('#interest-summary')")
    calls_before = len(MOCK['cards'])
    n0 = posts_done(); pace()
    click('สร้างการ์ด 5 ใบ')
    wait_post_done(n0)
    res = last_post()
    st = session_state()
    check('AI unconfigured: 503 AI_UNCONFIGURED, Thai message, zero cards, nothing charged, no upstream call', res['status'] == 503 and res['response']['code'] == 'AI_UNCONFIGURED'
          and not st['cards'] and server_quota()['used'] == 0 and 'ยังไม่ได้เชื่อมต่อบริการ AI' in body_text() and len(MOCK['cards']) == calls_before and len(st['answers']) == 2)
    shot('16-ai-unconfigured', 360)
    shot('16-ai-unconfigured', 1280)

    # ---- 15. No incidental regressions on other pages ----
    viewport(360)
    for path, marker in (('/', ''), ('/interview', 'สัมภาษณ์'), ('/idea', 'ครูที่ปรึกษา'), ('/evaluation', ''), ('/proposal', ''), ('/consent', '')):
        pace(coach_needed=2)
        navigate(path)
        time.sleep(1.2)
        check(f'regression smoke {path}: loads without JS errors' + (f' and shows “{marker}”' if marker else ''), not js('window.__errors || []') and (marker in body_text()), js('window.__errors || []'))

    server_log = (EVIDENCE / 'runtime.log').read_text(encoding='utf-8', errors='replace')
    check('server logs contain no learner interest text or synthetic secrets', 'ตู้ปลาที่บ้าน น้ำขุ่นเร็วมาก' not in server_log and SYN['ai'] not in server_log and SYN['guest'] not in server_log)
    summary = {'passed': sum(r['passed'] for r in rows), 'total': len(rows), 'browser': browser, 'server_pids': server_pids,
               'mock_card_calls': len(MOCK['cards']), 'mock_coach_calls': len(MOCK['coach']),
               'note': 'AI upstream = LABELLED MOCK (hand-written/synthetic samples); not live AI evidence.'}
    (EVIDENCE / 'browser-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print('SUMMARY', json.dumps(summary, ensure_ascii=False), flush=True)
finally:
    try:
        stop_browser()
    finally:
        try:
            stop_server()
        finally:
            stop_shim()
