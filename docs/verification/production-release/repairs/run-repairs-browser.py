"""Real Chrome + next start + supabase-js + real PG17; REST shim only.
AI is unconfigured (labelled deterministic fallback). No hosted OAuth/AI evidence.
Reuses read-only CDP/process helpers from the Discovery verification runner.
"""
from pathlib import Path
import json, os, shutil, time, zipfile
SOURCE = Path(__file__).resolve().parents[2] / 'personalized-discovery/discovery-ui/run-discovery-ui-browser.py'
ns = {'__file__': str(SOURCE), '__name__': 'repairs_helpers'}
exec(compile(SOURCE.read_text(encoding='utf-8').split('# =====================================================================')[0], str(SOURCE), 'exec'), ns)
ROOT = ns['ROOT']
EVIDENCE = Path(__file__).resolve().parent
ns['log'].close()
ns.update(EVIDENCE=EVIDENCE, SHOTS=EVIDENCE/'screenshots', PROFILE=ROOT/'.local/repairs-browser-profile', DB_DIR=ROOT/'.local/repairs-browser-pg',
          PORT=3023, SHIM_HTTP=55514, SHIM_PG=55513, MOCK_PORT=55515, BASE='http://127.0.0.1:3023', SUPABASE_URL='http://127.0.0.1:55514',
          log=(EVIDENCE/'browser-runtime.log').open('w',encoding='utf-8'))
ns['INSTRUMENT'] = ns['INSTRUMENT'].replace("const rec=u.includes('/api/discovery/cards')||u.includes('/api/ai/coach');", "const rec=u.startsWith('/api/')||u.startsWith('/auth/');")
globals().update({k: ns[k] for k in ['js','cdp','wait','click','fill','check','navigate','shot','viewport','seed_learner']})

def saved():
    return js("JSON.parse(localStorage.getItem('edtech:state'))")

def api(path, body=None, method='POST'):
    return js(f"fetch({json.dumps(path)},{{method:{json.dumps(method)},headers:{{'Content-Type':'application/json'}},body:{json.dumps(json.dumps(body,ensure_ascii=False)) if body is not None else 'undefined'}}}).then(async r=>({{status:r.status,data:await r.json()}}))")

def seed_idea():
    idea = {'id':'repairs-browser-idea','learnerId':'browser-fixture-learner','title':'เปรียบเทียบวัสดุกรองน้ำ','description':'เทียบวัสดุกรองน้ำสามแบบโดยวัดความขุ่นทุกวัน',
            'goal':'classroom','gradeLevel':'m_plai','source':'idea_track','createdAt':'2026-11-06T03:00:00Z','updatedAt':'2026-11-06T03:00:00Z'}
    js(f"(()=>{{let s=JSON.parse(localStorage.getItem('edtech:state'));s.ideas=[{json.dumps(idea,ensure_ascii=False)}];localStorage.setItem('edtech:state',JSON.stringify(s))}})()")
    return idea

try:
    for key in ['PROFILE','DB_DIR']:
        p=ns[key]
        if p.exists(): shutil.rmtree(p)
        p.mkdir(parents=True)
    ns['SHOTS'].mkdir(parents=True,exist_ok=True)
    ns['build_for_harness']()
    ns['start_shim'](); ns['start_server'](ai_configured=False)
    browser=ns['start_browser']()
    downloads=EVIDENCE/'downloads'; downloads.mkdir(exist_ok=True)
    for p in downloads.glob('*.docx'): p.unlink()
    cdp('Browser.setDownloadBehavior',behavior='allow',downloadPath=str(downloads))
    viewport(360); seed_learner(); idea=seed_idea()
    navigate('/proposal?ideaId='+idea['id'])
    wait("document.querySelector('input[placeholder=\"ระบุชื่อโครงงานฉบับสมบูรณ์...\"]')")
    fill('input[placeholder="ระบุชื่อโครงงานฉบับสมบูรณ์..."]','ร่างแก้ไขก่อนเข้าสู่ระบบที่ต้องไม่หาย')
    # Exercise real login route, but stop before provider navigation. This is a
    # labelled test-only transport interruption, not live Google sign-in.
    js("window.__loginFetch=window.fetch;window.fetch=async(...a)=>{let r=await window.__loginFetch(...a);if(String(a[0])==='/auth/login'){window.__atLogin=JSON.parse(localStorage.getItem('edtech:state'));window.__loginStatus=r.status;return new Response('{}',{status:503})}return r}")
    click('เข้าสู่ระบบ Google (ไม่บังคับ)'); wait('document.querySelector("dialog[open]")')
    check('optional login discloses Auth PII and no silent cloud sync', 'Google และ Supabase Auth' in ns['body_text']() and 'ยังไม่ซิงค์โครงงาน' in ns['body_text']())
    js("window.__storageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='edtech:state')throw new DOMException('synthetic storage full','QuotaExceededError');return window.__storageSet.call(this,k,v)}")
    click('ยินยอมและเข้าสู่ระบบ Google');time.sleep(.3)
    check('storage failure vetoes OAuth instead of losing an unsaved draft',not js('Boolean(window.__atLogin)') and 'กรุณาบันทึกหรือยกเลิก' in ns['body_text']())
    js('Storage.prototype.setItem=window.__storageSet')
    click('ยินยอมและเข้าสู่ระบบ Google'); wait('window.__atLogin')
    check('unsaved proposal draft is preserved BEFORE OAuth navigation', js("window.__atLogin.projects.some(p=>p.proposal.title==='ร่างแก้ไขก่อนเข้าสู่ระบบที่ต้องไม่หาย')"))
    click('ใช้งานต่อโดยไม่เข้าสู่ระบบ')
    # Checkbox targets include their enclosing labels, not just the 20px glyph.
    # Retain overflow, screenshot, JS checks without misreporting label targets.
    ns['js_original']=ns['js']
    def shot_js(expr):
        if "e.getBoundingClientRect()" in expr and "querySelectorAll('button,a[href],input,textarea,select,summary')" in expr:
            expr=expr.replace('e.getBoundingClientRect()', "(e.matches('input[type=checkbox]') ? e.closest('label') : e).getBoundingClientRect()")
        return ns['js_original'](expr)
    ns['js']=shot_js
    shot('proposal-optional-login',360)
    shot('proposal-optional-login',1280)
    before=api('/api/ai/proposal',{'action':'check'})['data']['remaining']
    click('บันทึกการแก้ไข'); time.sleep(.4)
    click('Word (.docx)');wait("document.body.innerText.includes('ส่งไฟล์ Word ให้เบราว์เซอร์ดาวน์โหลดแล้ว')",timeout=60)
    deadline=time.time()+20
    while time.time()<deadline and not list(downloads.glob('*.docx')): time.sleep(.1)
    files=list(downloads.glob('*.docx'))
    check('Guest Word export downloads a real DOCX containing the saved draft',bool(files) and 'ร่างแก้ไขก่อนเข้าสู่ระบบที่ต้องไม่หาย' in zipfile.ZipFile(files[0]).read('word/document.xml').decode())
    check('manual save and Guest export never consume proposal allowance',api('/api/ai/proposal',{'action':'check'})['data']['remaining']==before)
    # Real OAuth start with hostile return path; no provider sign-in is faked.
    js('window.fetch=window.__loginFetch')
    login=api('/auth/login',{'next':'//evil.example/steal'})
    check('real PKCE login start sanitizes an open redirect',login['status']==200 and 'evil.example' not in login['data']['url'])
    cookies=cdp('Network.getCookies',urls=[ns['BASE']])['cookies']
    guest=next(c for c in cookies if c['name']=='edu-coaching-owner')
    check('production Guest capability is HttpOnly Secure Strict',guest['httpOnly'] and guest['secure'] and guest['sameSite']=='Strict')
    verifiers=[c for c in cookies if 'code-verifier' in c['name']]
    check('real SSR PKCE cookies are HttpOnly Secure Lax',bool(verifiers) and all(c['httpOnly'] and c['secure'] and c['sameSite']=='Lax' for c in verifiers))
    cancelled=js("fetch('/auth/callback?error=access_denied&next=//evil.example',{redirect:'follow'}).then(r=>({url:r.url,status:r.status}))")
    check('cancel callback stays local and preserves the Guest identity',cancelled['url'].startswith(ns['BASE']+'/auth?status=cancelled') and next(c['value'] for c in cdp('Network.getCookies',urls=[ns['BASE']])['cookies'] if c['name']=='edu-coaching-owner')==guest['value'])
    check('cancel callback clears every real PKCE verifier cookie',not any('code-verifier' in c['name'] for c in cdp('Network.getCookies',urls=[ns['BASE']])['cookies']))
    check('Guest logout succeeds without erasing local project work',api('/auth/logout',{})['status']==200 and saved()['projects'][0]['proposal']['title']=='ร่างแก้ไขก่อนเข้าสู่ระบบที่ต้องไม่หาย')
    # Real evaluation response used as a fixture; force a second red axis only
    # for the browser's multi-axis race test (not an AI-quality assertion).
    r=api('/api/ai/evaluate',{'idea':idea})
    check('evaluation accepts the browser Guest with its own quota',r['status']==200 and r['data']['quota']['used']==1)
    ev=r['data']['evaluation']; ev['axes']['feasibility'].update(score=1,badge='red'); ev['axes']['rigor'].update(score=1,badge='red')
    js(f"(()=>{{let s=JSON.parse(localStorage.getItem('edtech:state'));s.evaluations=[{json.dumps(ev,ensure_ascii=False)}];localStorage.setItem('edtech:state',JSON.stringify(s))}})()")
    navigate('/evaluation?ideaId='+idea['id']);wait('document.querySelector("#pivot-tier1-answer")')
    wait("(window.__requests||[]).some(r=>r.url==='/api/ai/pivot'&&r.status===200)")
    check('new Pivot room offers Tier 1 only',ns['button_disabled']('ระดับ 3:'))
    current=next(r['response']['pivot'] for r in js('window.__requests') if r['url']=='/api/ai/pivot' and r.get('status')==200)
    forged=api('/api/ai/pivot',{'action':'turn','pivotId':current['id'],'revision':1,'requestId':js('crypto.randomUUID()'),'requestedTier':3,'unlockedTiers':[1,2]})
    check('forged unlocks are rejected by the production HTTP boundary',forged['status']==400)
    locked=api('/api/ai/pivot',{'action':'turn','pivotId':current['id'],'revision':1,'requestId':js('crypto.randomUUID()'),'requestedTier':3})
    check('Tier 3 cannot be requested before a verified answer and hint',locked['status']==409 and locked['data']['error']=='TIER_LOCKED')
    fill('#pivot-tier1-answer','ลองวัดซ้ำสามครั้ง')
    # Delay delivery only: real server runs, no fake progression response.
    js("window.__pivotFetch=window.fetch;window.__holdPivot=true;window.fetch=async(...a)=>{const r=await window.__pivotFetch(...a);if(String(a[0])==='/api/ai/pivot'&&JSON.parse(a[1].body).action==='turn'&&window.__holdPivot){window.__pivotWaiting=true;await new Promise(resolve=>window.__releasePivot=resolve)}return r}")
    click('ส่งคำตอบและขอกรอบความคิด');wait('window.__pivotWaiting')
    check('axis switches cannot race an in-flight Pivot turn',js("[...document.querySelectorAll('#pivot-workshop button')].find(e=>e.textContent.includes('Rigor & Metrics'))?.disabled"))
    js('window.__holdPivot=false;window.__releasePivot()')
    wait("!document.body.innerText.includes('กำลังส่ง...')")
    wait("document.body.innerText.includes('Thinking Lenses')")
    click('ขอมุมมองใหม่ตัวอย่าง');wait("document.body.innerText.includes('Pivot Angles')")
    check('answer then hints then explicit examples works',js("document.querySelectorAll('#pivot-workshop [aria-pressed]').length")>=2)
    viewport(360);js("document.querySelector('#pivot-workshop').scrollIntoView({block:'start'})");shot('pivot-examples',360)
    viewport(1280);js("document.querySelector('#pivot-workshop').scrollIntoView({block:'start'})");shot('pivot-examples',1280)
    check('Pivot never steals the proposal allowance',api('/api/ai/proposal',{'action':'check'})['data']['remaining']==before)
    js("document.querySelector('#pivot-workshop [aria-pressed]').click()")
    fill('#pivot-workshop textarea','ฉันจะลดขนาดชุดทดลองและเปรียบเทียบวัสดุสองชนิดโดยควบคุมปริมาณน้ำให้เท่ากัน')
    click('บันทึกการปรับมุมมองใหม่')
    wait("JSON.parse(localStorage.getItem('edtech:state')).ideas[0].description.includes('ฉันจะลดขนาด')")
    time.sleep(.8)
    # Parent receives the edited idea: room must now bind the new content, not
    # let the previous topic's verified examples unlock the edited topic.
    check('rewritten idea starts a fresh content-bound Pivot room',ns['button_disabled']('ระดับ 3:'))
    # Exhaust allowance using the same signed Guest before a new source-driven
    # assembly: UI must keep manual editing, not silently assemble anyway.
    for _ in range(2): api('/api/ai/proposal',{'action':'consume','requestId':js('crypto.randomUUID()')})
    fresh={**idea,'id':'idea-after-limit','title':'งานใหม่หลังครบสิทธิ์','description':'ข้อความแหล่งข้อมูลที่ห้ามสร้างข้อเสนออัตโนมัติเมื่อโควตาหมด'}
    js(f"(()=>{{let s=JSON.parse(localStorage.getItem('edtech:state'));s.ideas.push({json.dumps(fresh,ensure_ascii=False)});localStorage.setItem('edtech:state',JSON.stringify(s))}})()")
    navigate('/proposal?ideaId='+fresh['id']);wait("document.querySelector('input[placeholder=\"ระบุชื่อโครงงานฉบับสมบูรณ์...\"]')")
    time.sleep(.5)
    check('exhausted allowance creates a manual blank draft, never automatic source assembly',saved()['projects'][-1]['proposal']['problemStatement']=='')
    # Independently issued Guest capability cannot use the old room handle.
    cdp('Network.deleteCookies',name=guest['name'],url=ns['BASE'])
    other=api('/api/ai/pivot',{'action':'turn','pivotId':current['id'],'revision':1,'requestId':js('crypto.randomUUID()'),'requestedTier':3})
    check('independent browser identity cannot access another Guest Pivot',other['status']==404)
    check('independent Guest retains both proposal entitlements',api('/api/ai/proposal',{'action':'check'})['data']['remaining']==2)
    navigate('/discovery');wait("document.querySelector('[data-testid=interest-question]')")
    click('สิ่งแวดล้อมรอบตัว');wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('สิ่งแวดล้อมรอบตัว')")
    click('อยากลดขยะ');wait("document.querySelector('#interest-summary')")
    click('สร้างการ์ด 5 ใบ')
    wait("(window.__requests||[]).some(r=>r.url==='/api/discovery/cards'&&r.method==='POST'&&r.status===503)")
    check('personalized Discovery preserved; unconfigured AI is honest and retains interest answers',not ns['session_state']()['cards'] and len(ns['session_state']()['answers'])==2 and 'ยังไม่ได้เชื่อมต่อบริการ AI' in ns['body_text']())
    shot('discovery-unconfigured',360);shot('discovery-unconfigured',1280)
    for _ in range(5): api('/api/ai/evaluate',{'idea':fresh})
    navigate('/evaluation?ideaId='+fresh['id'])
    wait("(window.__requests||[]).some(r=>r.url==='/api/ai/evaluate'&&r.method==='POST'&&r.status===429)")
    check('exhausted evaluation allowance shows an actionable error, not a permanent loading spinner','ครบตามโควตา 5 ครั้ง' in ns['body_text']() and 'กำลังประเมินโครงงาน 5 ด้าน' not in ns['body_text']())
    (EVIDENCE/'browser-summary.json').write_text(json.dumps({'browser':browser,'passed':sum(r['passed'] for r in ns['rows']),'total':len(ns['rows']), 'note':'Real browser/Next/PG; REST shim; AI unconfigured; provider navigation interrupted (NOT live OAuth).'},ensure_ascii=False,indent=2),encoding='utf-8')
finally:
    try: ns['stop_browser']()
    finally:
        try: ns['stop_server']()
        finally: ns['stop_shim']()
