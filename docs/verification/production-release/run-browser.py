"""Isolated Chromium UI verification. No real account/provider interaction."""
import ast,base64,json,os,socket,subprocess,time,urllib.request,shutil
from pathlib import Path
from websockets.sync.client import connect
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/verification/production-release/browser';OUT.mkdir(exist_ok=True)
PROFILE=ROOT/'.local/foundation-browser-profile'
if PROFILE.exists(): raise RuntimeError('Refuse existing browser profile')
PROFILE.mkdir(parents=True);(PROFILE/'test-owned.marker').write_text('foundation-ui')
BASE='http://127.0.0.1:3026';PORT=3026
with socket.socket() as s:
 if s.connect_ex(('127.0.0.1',PORT))==0: raise RuntimeError('Test port occupied')
log=(OUT/'runtime.txt').open('w',encoding='utf8')
env=os.environ.copy();env.update(APP_ORIGIN=BASE,AI_BASE_URL='',AI_API_KEY='',AI_MODEL='',NEXT_PUBLIC_SUPABASE_URL='https://ppctndzkerwiokjfaklw.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic_test',SUPABASE_SERVICE_ROLE_KEY='',APP_GUEST_SECRET='synthetic-browser-test-secret-not-production-012345')
server=subprocess.Popen(['node',str(ROOT/'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',str(PORT)],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
chrome=connection=None;seq=0;session=None;checks=[]
def cdp(method,**params):
 global seq
 seq+=1;msg={'id':seq,'method':method,'params':params}
 if session:msg['sessionId']=session
 connection.send(json.dumps(msg))
 while True:
  r=json.loads(connection.recv(timeout=30))
  if r.get('id')==seq:
   if 'error'in r:raise RuntimeError(r['error'])
   return r.get('result',{})
def js(expression):
 r=cdp('Runtime.evaluate',expression=expression,returnByValue=True,awaitPromise=True)
 if 'exceptionDetails'in r:raise RuntimeError(r['exceptionDetails'])
 return r.get('result',{}).get('value')
def wait(expr):
 for _ in range(200):
  if js('Boolean('+expr+')'):return
  time.sleep(.1)
 raise RuntimeError('Timeout '+expr)
def click(text):
 box=js("(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.includes("+json.dumps(text)+")&&e.getBoundingClientRect().width);if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
 if not box:raise RuntimeError('Missing button '+text)
 cdp('Input.dispatchMouseEvent',type='mousePressed',button='left',clickCount=1,**box);cdp('Input.dispatchMouseEvent',type='mouseReleased',button='left',clickCount=1,**box)
def check(name,value):
 checks.append({'name':name,'passed':bool(value)});(OUT/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8')
 if not value:raise RuntimeError('FAIL '+name)
def nav(path):cdp('Page.navigate',url=BASE+path);time.sleep(1);wait("document.readyState==='complete'")
try:
 for _ in range(200):
  try:
   urllib.request.urlopen(BASE+'/auth',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise RuntimeError('Next not ready')
 chrome=subprocess.Popen(['C:/Program Files/Google/Chrome/Application/chrome.exe','--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--remote-allow-origins=http://127.0.0.1','--user-data-dir='+str(PROFILE),'about:blank'],stdout=log,stderr=subprocess.STDOUT)
 for _ in range(200):
  try:port=(PROFILE/'DevToolsActivePort').read_text().splitlines()[0];break
  except Exception:time.sleep(.1)
 version=json.load(urllib.request.urlopen('http://127.0.0.1:'+port+'/json/version'))
 connection=connect(version['webSocketDebuggerUrl'],origin='http://127.0.0.1',max_size=30*1024*1024)
 target=cdp('Target.createTarget',url='about:blank')['targetId'];session=cdp('Target.attachToTarget',targetId=target,flatten=True)['sessionId']
 cdp('Page.enable');cdp('Runtime.enable');cdp('Network.enable')
 cdp('Page.addScriptToEvaluateOnNewDocument',source="window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)))")
 for width in [360,1280]:
  cdp('Emulation.setDeviceMetricsOverride',width=width,height=960,deviceScaleFactor=1,mobile=width<600)
  nav('/proposal');wait("document.body.innerText.includes('บัญชี Google (ไม่บังคับ)')")
  check(f'{width} Save/Export offer visible',js("document.querySelectorAll('aside[aria-label=\"บัญชีเสริมสำหรับการบันทึกและส่งออก\"]').length>=2"))
  check(f'{width} no horizontal overflow',js('document.documentElement.scrollWidth<=innerWidth'))
  before=js("localStorage.getItem('edtech:state')")
  click('เข้าสู่ระบบ Google (ไม่บังคับ)');wait("document.querySelector('dialog[open]')")
  check(f'{width} opt-in identity/Drive disclosure',js("document.querySelector('dialog[open]').innerText.includes('Supabase Auth')&&document.querySelector('dialog[open]').innerText.includes('Drive')"))
  check(f'{width} primary login label visible',js("(()=>{const e=[...document.querySelectorAll('dialog[open] button')].find(e=>e.textContent.includes('ยินยอม'));const s=getComputedStyle(e);return s.color!==s.backgroundColor&&s.backgroundColor!=='rgba(0, 0, 0, 0)'})()"))
  cdp('Input.dispatchKeyEvent',type='keyDown',key='Escape',code='Escape',windowsVirtualKeyCode=27);cdp('Input.dispatchKeyEvent',type='keyUp',key='Escape',code='Escape',windowsVirtualKeyCode=27)
  wait("!document.querySelector('dialog[open]')")
  check(f'{width} cancel retains local work',js("localStorage.getItem('edtech:state')")==before)
  click('บันทึกการแก้ไข');wait("document.body.innerText.includes('บันทึกการแก้ไขเรียบร้อย')")
  check(f'{width} Guest save succeeds without login',True)
  before=js("localStorage.getItem('edtech:state')")
  click('เข้าสู่ระบบ Google (ไม่บังคับ)');wait("document.querySelector('dialog[open]')")
  click('ยินยอมและเข้าสู่ระบบ Google');wait("document.querySelector('dialog[open] [role=status]')")
  check(f'{width} unconfigured login truthful and no data loss',js("localStorage.getItem('edtech:state')")==before)
  shot=cdp('Page.captureScreenshot',format='png',captureBeyondViewport=False)['data'];(OUT/f'optional-login-{width}.png').write_bytes(base64.b64decode(shot))
  check(f'{width} no JS exceptions',js('window.__errors.length')==0)
 nav('/auth/callback?error=access_denied&error_description=not-reflected&next=//attacker.invalid')
 wait("document.body.innerText.includes('ยกเลิก')")
 check('cancel remains same-origin and sanitized',js("location.origin")==BASE and 'not-reflected'not in js('document.body.innerText'))
 headers=urllib.request.urlopen(BASE+'/auth').headers
 check('real HTTP security headers',headers.get('X-Content-Type-Options')=='nosniff' and "frame-ancestors 'none'" in headers.get('Content-Security-Policy',''))
 check('auth HTTP no-cache and no-referrer',headers.get('Referrer-Policy')=='no-referrer' and 'no-store' in headers.get('Cache-Control',''))
 summary={'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed']for x in checks),'browser':version['Browser'],'live_oauth':False,'live_ai':False,'mode':'Real production Next/Chromium; backend intentionally missing and auth unavailable; local Save remains usable'}
 (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(summary,ensure_ascii=False))
finally:
 if connection:
  session=None
  try:cdp('Browser.close')
  except Exception:pass
  connection.close()
 if chrome:
  try:chrome.wait(timeout=15)
  except subprocess.TimeoutExpired:chrome.terminate();chrome.wait(timeout=15)
 server.terminate();server.wait(timeout=20);log.close()
 if (PROFILE/'test-owned.marker').read_text()=='foundation-ui':
  for _ in range(30):
   try:shutil.rmtree(PROFILE);break
   except PermissionError:time.sleep(.2)
