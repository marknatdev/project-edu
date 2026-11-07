"""Iteration 3 regression: real Chrome/two tabs + next start + disposable PG17.
Synthetic Auth/AI fixtures and simulated clock are explicitly labelled; no live providers.
Run python <this script> wipe|quota|routing|import [--skip-build].
"""
from pathlib import Path
import argparse, base64, json, os, shutil, threading, time, zipfile
parser=argparse.ArgumentParser();parser.add_argument('case');parser.add_argument('--skip-build',action='store_true');args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'docs/verification/personalized-discovery/discovery-ui/run-discovery-ui-browser.py'
EVIDENCE=Path(__file__).resolve().parent/args.case;EVIDENCE.mkdir(parents=True,exist_ok=True)
s=SOURCE.read_text(encoding='utf-8').split('# =====================================================================')[0]
s=s.replace("EVIDENCE = ROOT / 'docs/verification/personalized-discovery/discovery-ui'",'EVIDENCE = Path('+repr(str(EVIDENCE))+')')
s=s.replace("SHIM = EVIDENCE / 'rest-shim.mjs'", "SHIM = ROOT / 'docs/verification/personalized-discovery/discovery-ui/rest-shim.mjs'")
s=s.replace('discovery-ui-browser-profile','remediation-browser-profile').replace('discovery-ui-pg','remediation-browser-pg')
s=s.replace('3021, 55494, 55493, 55495','3043, 55554, 55553, 55555')
s=s.replace("'AI_BASE_URL': f'http://127.0.0.1:{MOCK_PORT}/v1' if ai_configured else ''", "'NODE_OPTIONS': '--import=' + (ROOT/'docs/verification/production-release/review-remediation/mock-transport.mjs').as_uri(), 'AI_BASE_URL': 'https://mock-upstream.invalid/v1' if ai_configured else ''")
ns={'__file__':str(SOURCE),'__name__':'remediation_helpers'};exec(compile(s,str(SOURCE),'exec'),ns)
globals().update({k:ns[k] for k in ['js','cdp','wait','click','fill','navigate','viewport','seed_learner','check','shot']})

def tab(path):
    target=cdp('Target.createTarget',url=ns['BASE']+path)['targetId']
    ns['session_id']=cdp('Target.attachToTarget',targetId=target,flatten=True)['sessionId']
    cdp('Page.enable');cdp('Runtime.enable');cdp('Network.enable')
    wait("document.readyState==='complete'")

def summary():
    navigate('/discovery');wait("document.querySelector('[data-testid=interest-question]')")
    click('สิ่งแวดล้อมรอบตัว');wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('สิ่งแวดล้อมรอบตัว')")
    click('อยากลดขยะ');wait("document.querySelector('#interest-summary')")

def wipe():
    wait("[...document.querySelectorAll('button')].some(e=>e.textContent.includes('Wipe All My Data'))")
    time.sleep(.3)
    click('Wipe All My Data');click('ยืนยันการลบข้อมูล')
    wait("document.body.innerText.includes('ลบข้อมูลทั้งหมดออกจากอุปกรณ์เรียบร้อยแล้ว')")

def fixture_login():
    # Real SSR getUser uses a labelled local synthetic Auth transport, not Google.
    uid='11111111-1111-4111-8111-111111111111';exp=int(time.time())+3600
    enc=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
    token=enc(b'{"alg":"HS256"}')+'.'+enc(json.dumps({'sub':uid,'exp':exp}).encode())+'.synthetic'
    session={'access_token':token,'refresh_token':'synthetic-refresh','token_type':'bearer','expires_in':3600,'expires_at':exp,'user':{'id':uid,'aud':'authenticated','role':'authenticated','app_metadata':{},'user_metadata':{},'created_at':'2026-11-01T00:00:00Z'}}
    cdp('Network.setCookie',name='sb-127-auth-token',value='base64-'+enc(json.dumps(session).encode()),url=ns['BASE'],httpOnly=True,secure=True,sameSite='Lax')

try:
    for name in ['PROFILE','DB_DIR']:
        p=ns[name]
        if p.exists():shutil.rmtree(p)
        p.mkdir(parents=True)
    if not args.skip_build:ns['build_for_harness']()
    mock=ns['ThreadingHTTPServer'](('127.0.0.1',ns['MOCK_PORT']),ns['MockUpstream']);threading.Thread(target=mock.serve_forever,daemon=True).start()
    ns['start_shim']();ns['start_server'](True);browser=ns['start_browser']();viewport(360);seed_learner()
    if args.case=='wipe-queued':
        summary()
        js("window.__held=navigator.locks.request('edu-coaching-owner',async()=>{window.__locked=true;await new Promise(r=>window.__release=r)});true")
        wait('window.__locked');click('สร้างการ์ด 5 ใบ');wait("document.body.innerText.includes('กำลังให้ AI สร้างการ์ด')")
        main=ns['session_id'];tab('/consent');wipe();ns['session_id']=main;time.sleep(.3);js('window.__release()');time.sleep(3)
        check('wipe cancels queued Web Lock intent before it can mint a new Guest owner',not [r for r in ns['requests']() if r['method']=='POST'],ns['requests']())
        check('queued intent cannot restore erased local work',ns['session_state']() is None)
    elif args.case=='wipe':
        summary();before=ns['session_state']();main=ns['session_id'];tab('/consent');wipe();ns['session_id']=main
        time.sleep(.5)
        # Try an edit if the stale summary is still mounted (pre-fix reproduction).
        if js("Boolean(document.querySelector('#interest-summary'))"):fill('#interest-summary','แก้ไขหลังลบข้อมูลจากอีกแท็บ')
        time.sleep(.3)
        check('two-tab Wipe prevents old-answer resurrection',js("localStorage.getItem('edtech:discovery-fresh:v1')===null"),{'beforeAnswers':len(before['answers']),'after':ns['session_state']()})
        check('mounted Discovery writer stops and shows erased state','ลบข้อมูลแล้ว' in ns['body_text']())
        shot('two-tab-erased',360)
        # Separate fresh owner, delayed REAL route+model fixture completes AFTER wipe.
        cdp('Network.clearBrowserCookies');seed_learner();summary();ns['MOCK']['delay']=3
        click('สร้างการ์ด 5 ใบ');wait("document.body.innerText.includes('กำลังให้ AI สร้างการ์ด')")
        wait("(window.__requests||[]).some(r=>r.method==='POST'&&r.url==='/api/discovery/cards')")
        deadline=time.time()+10
        while not ns['MOCK']['cards'] and time.time()<deadline:time.sleep(.05)
        check('delayed model fixture actually started before erase',bool(ns['MOCK']['cards']))
        main=ns['session_id'];tab('/consent');wipe();ns['session_id']=main;time.sleep(4)
        check('late model response cannot recreate local cards/answers/pending intent',js("localStorage.getItem('edtech:discovery-fresh:v1')===null"))
        post=next(r for r in ns['requests']() if r['method']=='POST')
        check('server tombstone fences late model acceptance',post.get('status')==410,post)
        check('no follow-up quota/poll writer after erase',len(ns['requests']())<=2,ns['requests']())
        shot('late-response-erased',1280,full=False)
    elif args.case=='import-save':
        summary();click('สร้างการ์ด 5 ใบ');wait("document.querySelector('[data-testid=active-card]')",timeout=60)
        click('↑ เลือกใบนี้');wait("document.querySelector('[data-testid=selected-starter]')")
        ideaid=js("JSON.parse(localStorage.getItem('edtech:state')).ideas.at(-1).id")
        navigate('/proposal?ideaId='+ideaid)
        selector='input[placeholder="ระบุชื่อโครงงานฉบับสมบูรณ์..."]';wait('document.querySelector('+json.dumps(selector)+')')
        draft='ร่าง Guest ก่อนยืนยันบัญชี ต้องไม่ย้ายหรือหาย'
        fill(selector,draft)
        # Execute real PKCE start/admission, but interrupt its returned URL before
        # provider navigation. Auth sign-in below remains a separate fixture.
        js("window.__realLogin=window.fetch;window.fetch=async(...a)=>{const r=await window.__realLogin(...a);if(String(a[0])==='/auth/login'){window.__loginStatus=r.status;return Response.json({},{status:503})}return r}")
        click('เข้าสู่ระบบ Google (ไม่บังคับ)');wait('document.querySelector("dialog[open]")');click('ยินยอมและเข้าสู่ระบบ Google');wait('window.__loginStatus')
        guest=js("JSON.parse(localStorage.getItem('edtech:state'))")
        check('Save/Export sign-in persists unsaved Guest draft BEFORE navigation',guest['projects'][-1]['proposal']['title']==draft and js('window.__loginStatus')==200)
        click('ใช้งานต่อโดยไม่เข้าสู่ระบบ')
        check('cancelled/interrupted sign-in leaves Guest draft and editor intact',js('document.querySelector('+json.dumps(selector)+').value')==draft)
        fixture_login();navigate('/proposal?ideaId='+ideaid);wait("document.body.innerText.includes('เลือกพื้นที่งานก่อนทำต่อ')")
        check('verified account return from Save/Export mounts no project writer before decision',js("JSON.parse(localStorage.getItem('edtech:state')).projects.at(-1).proposal.title")==draft and not any(k.startswith('edtech:account:') for k in js('Object.keys(localStorage)')))
        click('ใช้พื้นที่บัญชีแยก');wait("document.body.innerText.includes('พื้นที่บัญชีแยก — ไม่อ่านหรือย้ายงาน Guest เดิม')")
        wait('document.querySelector('+json.dumps(selector)+')')
        check('decline Guest continuation never copies the saved/export draft into account',js('document.querySelector('+json.dumps(selector)+').value')!=draft and js("JSON.parse(localStorage.getItem('edtech:state')).projects.at(-1).proposal.title")==draft)
        click('กลับไปทำงาน Guest เดิม');wait('document.querySelector('+json.dumps(selector)+')?.value==='+json.dumps(draft))
        ns['reload']();wait('document.querySelector('+json.dumps(selector)+')?.value==='+json.dumps(draft))
        check('explicit Guest continuation restores saved draft after account transition and reload',js('document.querySelector('+json.dumps(selector)+').value')==draft)
        downloads=EVIDENCE/'downloads'/str(time.time_ns());downloads.mkdir(parents=True,exist_ok=False)
        before_downloads=set(downloads.glob('*.docx'))
        cdp('Browser.setDownloadBehavior',behavior='allow',downloadPath=str(downloads))
        click('บันทึกการแก้ไข');click('Word (.docx)');wait("document.body.innerText.includes('ส่งไฟล์ Word ให้เบราว์เซอร์ดาวน์โหลดแล้ว')",timeout=60)
        deadline=time.time()+20
        while not (set(downloads.glob('*.docx'))-before_downloads) and time.time()<deadline:time.sleep(.1)
        files=list(set(downloads.glob('*.docx'))-before_downloads)
        check('Guest export after verified sign-in downloads real DOCX with the preserved Guest draft',bool(files) and draft in zipfile.ZipFile(files[0]).read('word/document.xml').decode())
        # Check the checkbox's real label hit target, not its 20px glyph.
        original_js=ns['js']
        def label_target_js(expr):
            if "querySelectorAll('button,a[href],input,textarea,select,summary')" in expr:
                expr=expr.replace('e.getBoundingClientRect()', "(e.matches('input[type=checkbox]') ? e.closest('label') : e).getBoundingClientRect()")
            return original_js(expr)
        ns['js']=label_target_js
        shot('guest-save-export-after-sign-in',1280,full=False)
    elif args.case=='import':
        summary();click('สร้างการ์ด 5 ใบ');wait("document.querySelector('[data-testid=active-card]')",timeout=60)
        cardid=js("document.querySelector('[data-testid=active-card]').dataset.cardId")
        click('↑ เลือกใบนี้');wait("document.querySelector('[data-testid=selected-starter]')")
        wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        guestroom=ns['requests']('/api/ai/coach')[-1]['response']['conversation']['id']
        snapshot=js("localStorage.getItem('edtech:topic-card:'+encodeURIComponent("+json.dumps(cardid)+"))")
        click('เข้าสู่ระบบ Google (ไม่บังคับ)');wait('document.querySelector("dialog[open]")');click('ใช้งานต่อโดยไม่เข้าสู่ระบบ')
        check('cancel optional Google choice preserves Guest work',js("document.querySelector('[data-testid=selected-starter]')!==null"))
        # Fixture token is verified through the real SSR SDK -> labelled local Auth
        # transport. This is NOT a Google OAuth sign-in/callback demonstration.
        fixture_login()
        navigate('/idea?topicCardId='+cardid);wait("document.body.innerText.includes('เลือกพื้นที่งานก่อนทำต่อ')")
        check('verified account transition does not auto-open/copy Guest context',not ns['requests']('/api/ai/coach'))
        shot('explicit-workspace-choice-synthetic-auth',360)
        click('ใช้พื้นที่บัญชีแยก');wait("document.body.innerText.includes('ไม่มีบทสนทนานี้ในพื้นที่บัญชี')")
        declined=ns['requests']('/api/ai/coach')
        check('declining Guest continuation performs resume-only 404, never creates account context',len(declined)==1 and declined[0]['body']=={'action':'resume','topicKey':'card:'+cardid} and declined[0].get('status')==404,declined)
        check('decline preserves original Guest snapshot byte-for-byte',js("localStorage.getItem('edtech:topic-card:'+encodeURIComponent("+json.dumps(cardid)+"))")==snapshot)
        navigate('/idea');wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        accountroom=ns['requests']('/api/ai/coach')[-1]['response']['conversation']
        check('separate account starts without Guest card/interview context',not accountroom['context'].get('topicCard') and not accountroom['context'].get('constraints'))
        navigate('/idea?topicCardId='+cardid);wait("document.body.innerText.includes('ไม่มีบทสนทนานี้ในพื้นที่บัญชี')")
        click('กลับไปทำงาน Guest เดิม');wait("document.querySelector('[data-testid=selected-starter]')")
        wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        check('explicit continue Guest resumes original Guest owner, never account copy',ns['requests']('/api/ai/coach')[-1]['response']['conversation']['id']==guestroom)
        ns['reload']();wait("document.querySelector('[data-testid=selected-starter]')")
        wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        check('Guest continuation and snapshot survive reload after sign-in',ns['requests']('/api/ai/coach')[-1]['response']['conversation']['id']==guestroom)
        click('สลับไปพื้นที่บัญชีแยก');wait("document.body.innerText.includes('ไม่มีบทสนทนานี้ในพื้นที่บัญชี')")
        navigate('/idea');wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        check('returning to account preserves its original account-owned context',ns['requests']('/api/ai/coach')[-1]['response']['conversation']==accountroom)
        shot('account-context-kept-separate',1280,full=False)
    elif args.case=='routing':
        now='2026-11-06T03:00:00Z'
        ideas=[{'id':f'project-{i}','learnerId':'browser-fixture-learner','title':title,'description':desc,'goal':'classroom','gradeLevel':'m_plai','source':'idea_track','createdAt':now,'updatedAt':now} for i,title,desc in [('A','ตัวกรองน้ำจากของเหลือใช้','เปรียบเทียบวัสดุกรองสามแบบ'),('B','แผ่นบังแสงลดความร้อน','วัดอุณหภูมิเมื่อเปลี่ยนวัสดุบังแสง')]]
        js(f"(()=>{{let s=JSON.parse(localStorage.getItem('edtech:state'));s.ideas={json.dumps(ideas,ensure_ascii=False)};localStorage.setItem('edtech:state',JSON.stringify(s))}})()")
        def room(id):
            navigate('/idea?ideaId='+id)
            wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
            return next(r['response']['conversation'] for r in ns['requests']('/api/ai/coach') if r.get('status')==200)
        a=room('project-A')
        for tier in [1,2,3]:
            command={'action':'turn','conversationId':a['id'],'revision':a['revision'],'requestId':js('crypto.randomUUID()'),'requestedTier':tier}
            if tier==1:command['learnerResponse']='ยังคิดไม่ออก'
            result=js("fetch('/api/ai/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:"+json.dumps(json.dumps(command,ensure_ascii=False))+"}).then(async r=>({status:r.status,data:await r.json()}))")
            check('first Idea server progression tier '+str(tier),result['status']==200,result)
            a=result['data']['conversation']
        b=room('project-B')
        check('two saved own Ideas open separate stable server conversations',a['id']!=b['id'],{'a':a,'b':b})
        check('second own Idea cannot inherit first Idea Tier 3/history',b['turn']['tier']==1 and len(b['state']['history'])==1)
        check('saved Idea context, not current interview, reaches PostgreSQL',b['context'].get('ownIdea',{}).get('title')==ideas[1]['title'],b['context'])
        ns['stop_server']();ns['start_server'](True)
        a2=room('project-A');check('first Idea context and Tier 3 resume after real app restart',a2==a)
        shot('saved-idea-resume',360)
        navigate('/evaluation?ideaId=project-B');wait("document.querySelector('a[href^=\"/idea?ideaId=\"]')")
        js("document.querySelector('a[href^=\"/idea?ideaId=\"]').click()");wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        check('evaluation edit returns to second own Idea',ns['requests']('/api/ai/coach')[-1]['response']['conversation']['id']==b['id'])
        click('เริ่มไอเดียของฉันเรื่องใหม่');wait("location.search.includes('new=')")
        wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        newroom=ns['requests']('/api/ai/coach')[-1]['response']['conversation']
        check('explicit genuinely new own topic has fresh id, context and gates',newroom['id'] not in [a['id'],b['id']] and newroom['turn']['tier']==1 and len(newroom['state']['history'])==1 and not newroom['context'].get('ownIdea'))
        # Actual fresh generated selection -> evaluation -> edit must keep card room.
        summary();click('สร้างการ์ด 5 ใบ');wait("document.querySelector('[data-testid=active-card]')",timeout=60)
        cardid=js("document.querySelector('[data-testid=active-card]').dataset.cardId")
        click('↑ เลือกใบนี้');wait("document.querySelector('[data-testid=selected-starter]')")
        wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        original=ns['requests']('/api/ai/coach')[-1]['response']['conversation']
        generated=js("JSON.parse(localStorage.getItem('edtech:state')).ideas.find(i=>i.sourceTopicCardId==="+json.dumps(cardid)+")")
        navigate('/evaluation?ideaId='+generated['id']);wait("document.querySelector('a[href^=\"/idea?ideaId=\"]')",timeout=60)
        js("document.querySelector('a[href^=\"/idea?ideaId=\"]').click()");wait("document.querySelector('[data-testid=selected-starter]')")
        wait("(window.__requests||[]).some(r=>r.url==='/api/ai/coach'&&r.status===200)")
        resumed=ns['requests']('/api/ai/coach')[-1]['response']['conversation']
        check('generated-card evaluation edit preserves snapshot and original conversation',resumed['id']==original['id'] and resumed['context']['topicCard']['id']==cardid)
        shot('generated-evaluation-edit',1280,full=False)
    elif args.case=='quota':
        # Only the quota clock/GET responses are simulated. Browser remains real.
        js("""window.__quotaReads=0;window.__qFetch=window.fetch;
        window.fetch=async(...a)=>{if(String(a[0])==='/api/discovery/cards'&&(!a[1]?.method||a[1].method==='GET')){
          window.__quotaReads++;const renewed=window.__quotaReads>1;
          return Response.json({quota:{day:renewed?'2026-11-07':'2026-11-06',used:renewed?0:35,reserved:0,remaining:renewed?35:0,freeRemaining:renewed?5:0,extraRemaining:renewed?30:0,resetAt:new Date(Date.now()+(renewed?86400000:1500)).toISOString()}})}return window.__qFetch(...a)}""")
        # Client navigation retains the labelled fetch fixture.
        wait("document.querySelector('a[href=\"/discovery\"]')")
        js("document.querySelector('a[href=\"/discovery\"]').click()")
        wait("document.querySelector('[data-testid=interest-question]')")
        click('สิ่งแวดล้อมรอบตัว');wait("document.querySelector('[data-testid=interest-question]')?.textContent.includes('สิ่งแวดล้อมรอบตัว')")
        click('อยากลดขยะ');wait("document.querySelector('#interest-summary')")
        check('mocked exhausted quota disables generation initially',ns['button_disabled']('สร้างการ์ด 5 ใบ'))
        time.sleep(2)
        check('server resetAt revalidates exhausted quota WITHOUT reload or foreground events',js('window.__quotaReads>=2') and not ns['button_disabled']('สร้างการ์ด 5 ใบ'),{'reads':js('window.__quotaReads')})
        shot('renewed-quota-mocked-clock',360)
        time.sleep(1.1)
        n=js('window.__quotaReads');js("window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))")
        time.sleep(.5)
        check('focus/visibility recovery refreshes once, not a busy loop',n<js('window.__quotaReads')<=n+1,{'before':n,'after':js('window.__quotaReads')})
        time.sleep(2);check('available quota does not busy-poll',js('window.__quotaReads')<=n+1)
    else:raise RuntimeError('case not implemented: '+args.case)
    rows=ns['rows'];report={'case':args.case,'browser':browser,'passed':sum(r['passed'] for r in rows),'total':len(rows),'mode':'real Chrome + Next production + local PG17; synthetic AI/Auth; no hosted providers'}
    (EVIDENCE/'summary.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report)
finally:
    ns['stop_browser']();ns['stop_server']();ns['stop_shim']()
