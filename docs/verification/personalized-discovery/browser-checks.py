# Run inside functions.browser_exec, whose js/cdp/navigation helpers are pre-imported.
# No Playwright dependency; Chrome DevTools drives a real Chromium browser.
# Only demo-prefixed localStorage is read/cleared. All content is fixed/mock data.
import base64
import json
import time
from pathlib import Path
from typing import Any, Callable

# Supplied by browser_exec's execution namespace, not by the project.
js: Callable[..., Any]
cdp: Callable[..., Any]
fill_input: Callable[..., Any]
wait_for_load: Callable[..., Any]

ROOT = Path('D:/millmaker/EdTech')
OUT = ROOT / 'docs/verification/personalized-discovery/mockup'
OUT.mkdir(parents=True, exist_ok=True)
RESULTS = OUT / 'browser-results.json'
URL = 'file:///D:/millmaker/EdTech/docs/mockups/personalized-discovery.html'
DATA = 'project-edu-personalized-discovery-demo-v1'
QUOTA = 'project-edu-personalized-discovery-demo-quota-v1'

def record(name, passed, detail=None):
    rows = json.loads(RESULTS.read_text(encoding='utf-8')) if RESULTS.exists() else []
    rows.append({'check': name, 'passed': bool(passed), 'detail': detail})
    RESULTS.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(('PASS' if passed else 'FAIL') + ': ' + name + ((' | ' + str(detail)) if detail is not None else ''))
    assert passed, name

def read_demo():
    return js(f'JSON.parse(localStorage.getItem({json.dumps(DATA)}))')

def used():
    return js(f'JSON.parse(localStorage.getItem({json.dumps(QUOTA)})).used')

def click(selector):
    js(f'document.querySelector({json.dumps(selector)}).click()')

def text(selector):
    return js(f'document.querySelector({json.dumps(selector)}).textContent')

def fill(selector, value):
    fill_input(selector, value)

def key(name):
    codes = {'Tab': 9, 'Enter': 13, 'ArrowLeft':37, 'ArrowRight':39, 'ArrowUp':38, 'Escape':27}
    params = {'type':'keyDown', 'key':name, 'code':name, 'windowsVirtualKeyCode':codes[name], 'nativeVirtualKeyCode':codes[name]}
    if name=='Enter':
        params['text']='\r'
        params['unmodifiedText']='\r'
    cdp('Input.dispatchKeyEvent', **params)
    cdp('Input.dispatchKeyEvent', type='keyUp', key=name, code=name, windowsVirtualKeyCode=codes[name], nativeVirtualKeyCode=codes[name])
    time.sleep(.05)

def viewport(width, height=900):
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=width<500)
    # Reload the saved stage after changing emulation to recreate the compositor.
    js('location.reload()')
    wait_for_load()
    time.sleep(.5)

def capture(name, focus_main=False, full=False, preserve_scroll=False):
    if not preserve_scroll:
        # Full-page captures start at the top so the sticky disclosure appears at
        # the document top, rather than midway through the stitched screenshot.
        js('document.activeElement.blur(); scrollTo(0,0)')
    js("document.body.style.opacity='0.999';setTimeout(()=>document.body.style.opacity='1',30)")
    time.sleep(.2)
    # Chromium can stall its compositor when captureBeyondViewport=False after
    # changing mobile emulation. Use a real full-page capture; never a blank fallback.
    options = {'format':'png', 'captureBeyondViewport':True, 'fromSurface':True, '_response_timeout':30}
    if full:
        metrics = cdp('Page.getLayoutMetrics')['cssContentSize']
        options['clip'] = {'x':0, 'y':0, 'width':metrics['width'], 'height':metrics['height'], 'scale':1}
    shot = cdp('Page.captureScreenshot', **options)
    path = OUT / (name + '.png')
    path.write_bytes(base64.b64decode(shot['data']))
    print('SCREENSHOT:', path)

def layout(name):
    metrics = js('''(() => {
      const visible = e => e.checkVisibility({checkVisibilityCSS:true}) && e.getClientRects().length;
      const elements = [...document.querySelectorAll('button,input,select,textarea,summary')].filter(visible);
      return { viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth,
        smallTargets:elements.filter(e => e.getBoundingClientRect().height<40 || e.getBoundingClientRect().width<40).map(e=>({tag:e.tagName,text:e.textContent.slice(0,60)})),
        disclosure:getComputedStyle(document.querySelector('#disclosure')).position,
        resources:performance.getEntriesByType('resource').map(x=>x.name),
        title:document.querySelector('#stageTitle').textContent };
    })()''')
    record(name, metrics['scrollWidth']<=metrics['viewport'] and not metrics['smallTargets'] and metrics['disclosure']=='sticky' and not metrics['resources'], metrics)

def reset_demo():
    js(f'localStorage.removeItem({json.dumps(DATA)});localStorage.removeItem({json.dumps(QUOTA)});location.reload()')
    wait_for_load()

def scenario(value):
    js(f"document.querySelector('#scenario').value={json.dumps(value)};document.querySelector('#scenario').dispatchEvent(new Event('change',{{bubbles:true}}))")

def generate_next():
    click('#navDeck')
    js("document.querySelector('#refineBox').open=true")
    click('#refineForm .primary')
    time.sleep(2.6)

# Each phase persists its results before later phases can fail.
def phase_interview():
    RESULTS.write_text('[]', encoding='utf-8')
    reset_demo()
    cdp('Page.addScriptToEvaluateOnNewDocument', source="window.__demoErrors=[];addEventListener('error',e=>window.__demoErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__demoErrors.push(String(e.reason)))")
    viewport(360)
    layout('360px initial layout, touch targets and no external resources')
    # Unknown path must be guided, not silently changed into a catalog.
    click('[data-choice="3"]')
    record('Unknown interest adapts next question, without showing a catalog', 'สิ่งใกล้ตัว' in text('.question') and len(read_demo()['cards'])==0)
    click('[data-choice="3"]')
    click('[data-choice="2"]')
    record('Unknown path asks fourth question', 'คำถามที่ 4' in text('#stage'))
    click('[data-choice="1"]')
    record('Adaptive unknown interview finishes at 4 answers', read_demo()['stage']=='summary' and len(read_demo()['answers'])==4)
    capture('mobile-360-summary-four-questions', True)
    # Clear only interview via actual control: quota and saved cards must remain.
    js("document.querySelector('#demoTools').open=true")
    click('#restart')
    click('[data-choice="1"]')
    record('Known interest adapts follow-up to plants', 'แสงไม่เท่ากัน' in text('.choices'))
    click('[data-choice="0"]')
    record('Clear interest finishes at 2 answers', read_demo()['stage']=='summary' and len(read_demo()['answers'])==2)
    # Typed draft must persist before submission.
    fill('#summary','อยากเปรียบเทียบการประหยัดน้ำในการปลูกพืชด้วยอุปกรณ์เดิม')
    js('location.reload()');wait_for_load()
    record('Editable summary survives refresh', 'ประหยัดน้ำ' in js("document.querySelector('#summary').value"))
    for width in [320,360,390,1280]:
        viewport(width)
        layout(str(width)+'px summary no horizontal page overflow')
    viewport(360)
    capture('mobile-360-summary', True)
    click('#summaryForm .primary')
    record('Loading persistently discloses simulated work and no premature charge', read_demo()['stage']=='loading' and used()==0 and 'ไม่ได้ติดต่อโมเดล' in text('#stage'))
    capture('mobile-360-loading', True)
    time.sleep(2.6)
    state=read_demo()
    record('First successful simulated batch accepts exactly 5 unique fixed cards', len(state['cards'])==5 and len(set(c['id'] for c in state['cards']))==5 and all(c['title'] and c['problem'] and c['direction'] and c['source']=='fixed-demo-fixture' for c in state['cards']), [c['id'] for c in state['cards']])
    record('First five successful cards exhaust free allowance only', used()==5 and text('#freeQuota')=='0' and text('#extraQuota')=='30')
    viewport(1280,960);layout('Desktop deck layout');capture('desktop-deck')
    viewport(360,900);layout('360px deck layout');capture('mobile-360-deck',True)


def phase_selection():
    viewport(360)
    # Real CDP keyboard, scoped to focused deck card.
    js("document.querySelector('#activeCard').focus()")
    record('Card focus has visible keyboard outline', js("getComputedStyle(document.activeElement).outlineStyle")=='solid')
    key('ArrowRight')
    record('Keyboard right arrow shortlists first card',len(read_demo()['shortlist'])==1)
    key('ArrowLeft')
    record('Keyboard left arrow skips only one card',len(read_demo()['shortlist'])==1 and read_demo()['reactions'][-1]['action']=='skip')
    click('[data-action="undo"]')
    record('Undo restores skipped card without quota charge',read_demo()['cursor']==1 and used()==5)
    # Real mouse pointer drag on the dedicated touch-safe handle.
    js("document.querySelector('#dragSurface').scrollIntoView({block:'center'})")
    box=js("(() => {const r=document.querySelector('#dragSurface').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
    cdp('Input.dispatchMouseEvent',type='mouseMoved',x=box['x'],y=box['y'])
    cdp('Input.dispatchMouseEvent',type='mousePressed',x=box['x'],y=box['y'],button='left',clickCount=1)
    for dx in [20,40,70,95]: cdp('Input.dispatchMouseEvent',type='mouseMoved',x=box['x']+dx,y=box['y'],buttons=1)
    record('Dragging does not cause horizontal page overflow', js('document.documentElement.scrollWidth <= 360'))
    capture('mobile-360-drag', preserve_scroll=True)
    cdp('Input.dispatchMouseEvent',type='mouseReleased',x=box['x']+95,y=box['y'],button='left',clickCount=1)
    record('Real pointer drag right shortlists second card',len(read_demo()['shortlist'])==2)
    click('[data-action="like"]')
    record('Button alternative shortlists third card',len(read_demo()['shortlist'])==3)
    click('#navShortlist')
    ids=read_demo()['shortlist']
    click('[data-compare="'+ids[0]+'"]');click('[data-compare="'+ids[1]+'"]')
    click('#compareButton')
    record('Compare opens with exactly two selected cards',read_demo()['stage']=='compare' and js("document.querySelectorAll('.compare-grid .mini-card').length")==2)
    for width in [320,360,390,1280]:
        viewport(width);layout(str(width)+'px compare responsive layout')
    viewport(1280,960);capture('desktop-compare')
    viewport(360);capture('mobile-360-compare',True,True)
    click('[data-select="'+ids[1]+'"]')
    state=read_demo(); selected=next(c for c in state['cards'] if c['id']==state['selected'])
    record('Coaching receives exact selected fixed-card snapshot and learner context',state['selected']==ids[1] and selected['title'] in text('#stage') and 'ประหยัดน้ำ' in text('#stage') and 'snapshot' in text('#stage'))
    fill('#coachDraft','ฉันอยากเปรียบเทียบวิธีใช้น้ำให้น้อยลง และจะขอครูช่วยเลือกวิธีวัด')
    # Test real Tab / Enter on draft-save button.
    js("document.querySelector('#coachDraft').focus()")
    key('Tab')
    record('Tab moves from draft to primary save action', 'บันทึกคำตอบร่าง' in js('document.activeElement.textContent'))
    key('Enter')
    record('Keyboard Enter saves draft but grants no production unlocks','ยังไม่ได้ส่งให้ AI' in text('#announcement'))
    js('location.reload()');wait_for_load()
    record('Refresh resumes selected-card handoff and typed draft', read_demo()['stage']=='coach' and read_demo()['selected']==ids[1] and 'ขอครู' in js("document.querySelector('#coachDraft').value"))
    for width in [320,360,390,1280]: viewport(width);layout(str(width)+'px coaching handoff layout')
    viewport(360);capture('mobile-360-coaching',True,True)
    # No keyboard listener may hijack arrows in an editable input.
    js("document.querySelector('#coachDraft').focus()")
    before=read_demo()['cursor'];key('ArrowLeft')
    record('Arrow key in text field does not swipe a card',read_demo()['stage']=='coach' and read_demo()['cursor']==before)
    # Up arrow is another real keyboard path into coaching.
    click('#navDeck');js("document.querySelector('#activeCard').focus()");key('ArrowUp')
    record('Keyboard up arrow selects the current card for coaching',read_demo()['stage']=='coach')
    record('No uncaught browser errors after handoff',js('window.__demoErrors || []')==[])


def phase_errors_quota():
    viewport(360)
    original=len(read_demo()['cards'])
    for mode,phrase in [('unavailable','ไม่พร้อม'),('timeout','หมดเวลา'),('malformed','ใช้ไม่ได้'),('duplicates','ซ้ำ')]:
        scenario(mode)
        generate_next()
        record(mode+' retains answers/cards and does not charge',read_demo()['stage']=='error' and phrase in text('#stage') and used()==5 and len(read_demo()['cards'])==original and len(read_demo()['answers'])==2)
        layout('360px '+mode+' error layout')
        if mode=='unavailable': capture('mobile-360-unavailable-no-charge',True)
    # Retry uses retained request id, then accept partial work without fake padding.
    scenario('partial'); click('[data-action="retry"]');time.sleep(2.6)
    record('Partial success accepts and charges only 3, without padding',len(read_demo()['batch'])==3 and len(read_demo()['cards'])==8 and used()==8 and text('#extraQuota')=='27')
    capture('mobile-360-partial-three',True)
    fill_id=read_demo()['cards'][0]['id']
    # Real editable refinement must survive and alter keyword-ranked fixture context.
    js("document.querySelector('#refineBox').open=true")
    fill('#refinement','อยากเน้นคอมพิวเตอร์และข้อมูล ไม่ต้องซื้ออุปกรณ์')
    scenario('success')
    click('#refineForm .primary');time.sleep(2.6)
    record('Refined next batch is unique and carries typed refinement',len(read_demo()['cards'])==13 and used()==13 and 'คอมพิวเตอร์' in text('.feedback') and len({c['id'] for c in read_demo()['cards']})==13)
    # A restart must not renew free allowance or remove previously accepted cards.
    js("document.querySelector('#demoTools').open=true");click('#restart')
    record('Restart interview preserves daily quota and previous cards',used()==13 and text('#freeQuota')=='0' and len(read_demo()['cards'])==13 and len(read_demo()['answers'])==0)
    fill('#answer','ข้อมูลและคอมพิวเตอร์');click('#answerForm .primary')
    fill('#answer','อยากจำลองการจัดตาราง');click('#answerForm .primary')
    click('#summaryForm .primary')
    # Attempt another submission immediately: busy UI must suppress it.
    js("document.querySelector('#navChat').click(); document.querySelector('#navDeck').click()")
    record('Concurrent UI submissions/navigation disabled during generation',read_demo()['stage']=='loading' and used()==13)
    time.sleep(2.6)
    record('Double interaction produces exactly one five-card batch',used()==18 and len(read_demo()['cards'])==18)
    # Refresh while generating: no accepted work, no charge. Retry once only.
    click('#navDeck');js("document.querySelector('#refineBox').open=true");click('#refineForm .primary')
    js('location.reload()');wait_for_load()
    record('Reload interrupted generation is truthful and uncharged',read_demo()['stage']=='error' and 'ขัดจังหวะ' in text('#stage') and used()==18)
    click('[data-action="retry"]');time.sleep(2.6)
    record('Retry after interrupted generation accepts one batch only',used()==23 and len(read_demo()['cards'])==23)
    for expected in [28,33,35]:
        generate_next()
        record('Quota progression accepts '+str(expected)+' total unique cards',used()==expected and len(read_demo()['cards'])==expected)
    record('Daily maximum is first 5 free plus 30 extra, last partial counted exactly',text('#freeQuota')=='0' and text('#extraQuota')=='0' and len(read_demo()['batch'])==2)
    generate_next()
    record('Daily cap prevents further charges or cards',used()==35 and len(read_demo()['cards'])==35 and 'ครบสิทธิ์' in text('#announcement'))
    capture('mobile-360-quota-exhausted',True)
    js('location.reload()');wait_for_load()
    record('Exhausted quota and all saved snapshots survive refresh',used()==35 and len(read_demo()['cards'])==35)
    js("document.querySelector('#demoTools').open=true");click('#nextDay')
    record('Explicit simulated Bangkok next-day resets free5/extra30 but preserves seen cards',used()==0 and text('#freeQuota')=='5' and text('#extraQuota')=='30' and len(read_demo()['cards'])==35 and '+1' in text('#clockNote'))
    generate_next()
    record('Fixture exhaustion is disclosed, not fabricated into new generation',used()==0 and len(read_demo()['cards'])==35 and 'ตัวอย่างคงที่ครบ' in text('#announcement'))
    record('No browser errors or external resources after all scenarios',(js('window.__demoErrors || []')==[]) and js("performance.getEntriesByType('resource').length")==0)


def phase_review_fixes():
    # UI regressions found in the two-axis read-only audit, plus resilience.
    viewport(360)
    reset_demo()
    click('[data-choice="3"]');click('[data-choice="0"]');click('[data-choice="0"]')
    record('Guided interest path can finish at exactly 3 answers',len(read_demo()['answers'])==3 and read_demo()['stage']=='summary')
    fill('#summary','อยากลองทำการทดลอง')
    click('#summaryForm .primary');time.sleep(2.6)
    current=read_demo()['batch'][0]
    click('#navDeck');js("document.querySelector('#refineBox').open=true");click('[data-action="saved"]')
    js('document.querySelector('+json.dumps('[data-save="'+current+'"]')+').focus()')
    key('Enter')
    record('Saved-card addition restores focus to same-card select action',js('document.activeElement.dataset.select')==current and read_demo()['shortlist']==[current])
    click('#navDeck');click('[data-action="like"]');click('[data-action="undo"]')
    record('Undo does not remove a card independently saved before the like',current in read_demo()['shortlist'] and read_demo()['cursor']==0)
    click('[data-action="skip"]')
    # Read visible cards after no-skip versus skip runs to test adaptation at UI seam.
    generate_next()
    skipped_batch=read_demo()['batch']
    record('Undo is disabled across a newly accepted batch',js("document.querySelector('[data-action=undo]').disabled")==True)
    batch_before=list(skipped_batch)
    click('[data-action="undo"]')
    record('Disabled cross-batch undo cannot strand the current deck',read_demo()['batch']==batch_before)
    reset_demo();click('[data-choice="0"]');click('[data-choice="0"]')
    fill('#summary','อยากลองทำการทดลอง');click('#summaryForm .primary');time.sleep(2.6)
    generate_next()
    unskipped_batch=read_demo()['batch']
    record('One skip changes subsequent fixed-fixture ranking without excluding its whole subject',skipped_batch!=unskipped_batch,{'without_skip':unskipped_batch,'with_skip':skipped_batch})
    # Complete a 5-card shortlist, exercise full/empty and comparison limits.
    for _ in range(5): click('[data-action="like"]')
    record('Five likes automatically enter shortlist',len(read_demo()['shortlist'])==5 and read_demo()['stage']=='shortlist')
    ids=read_demo()['shortlist']
    click('[data-compare="'+ids[0]+'"]');click('[data-compare="'+ids[1]+'"]');click('[data-compare="'+ids[2]+'"]')
    record('Compare selection stays capped at two cards',len(read_demo()['compare'])==2 and 'ครั้งละ 2' in text('#announcement'))
    for width in [320,360,390,1280]: viewport(width);layout(str(width)+'px full shortlist layout')
    viewport(360);capture('mobile-360-shortlist',True)
    click('#navDeck');js("document.querySelector('#refineBox').open=true");click('[data-action="saved"]')
    unsaved=next(c['id'] for c in read_demo()['cards'] if c['id'] not in read_demo()['shortlist'])
    click('[data-save="'+unsaved+'"]')
    record('Full shortlist rejects sixth card without charge',len(read_demo()['shortlist'])==5 and 'เต็ม 5' in text('#announcement') and used()==10)
    click('#navShortlist')
    for card_id in list(read_demo()['shortlist']): click('[data-remove="'+card_id+'"]')
    record('Removing saved shortlist entries produces a useful empty state',not read_demo()['shortlist'] and 'ยังไม่มีการ์ดที่สนใจ' in text('#stage') and len(read_demo()['cards'])==10)
    # Real touch swipes on the dedicated handle preserve page scrolling elsewhere.
    click('#navDeck')
    # Current deck exhausted, so create a new simulated batch first.
    generate_next()
    for width in [320,360,390]:
        viewport(width);layout(str(width)+'px deck controls and overflow')
    viewport(360)
    def touch_drag(dx,dy):
        js("document.querySelector('#dragSurface').scrollIntoView({block:'center'})")
        b=js("(() => {let r=document.querySelector('#dragSurface').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
        cdp('Input.dispatchTouchEvent',type='touchStart',touchPoints=[{'x':b['x'],'y':b['y']}])
        cdp('Input.dispatchTouchEvent',type='touchMove',touchPoints=[{'x':b['x']+dx,'y':b['y']+dy}])
        cdp('Input.dispatchTouchEvent',type='touchEnd',touchPoints=[])
    touch_drag(-90,0)
    record('Real touch swipe left skips one card',read_demo()['reactions'][-1]['action']=='skip')
    touch_drag(0,-85)
    record('Real touch swipe up selects current snapshot for coaching',read_demo()['stage']=='coach')
    click('#navDeck');scenario('unavailable');generate_next()
    for width in [320,360,390,1280]: viewport(width);layout(str(width)+'px unavailable no-charge error layout')
    viewport(1280,960);capture('desktop-unavailable-no-charge')
    # Corrupt only disposable demo data; preserve the quota ledger independently.
    previous_usage=used()
    js('localStorage.setItem('+json.dumps(DATA)+',JSON.stringify({version:1,stage:"deck",answers:[],cards:[]}));location.reload()')
    wait_for_load()
    record('Incomplete saved demo state recovers without crashing or renewing quota',used()==previous_usage and 'อ่านข้อมูลเดิมไม่ได้' in text('#storageWarning') and js('window.__demoErrors || []')==[])
    js('localStorage.setItem('+json.dumps(DATA)+',JSON.stringify({version:1,answers:null,cards:[]}));location.reload()')
    wait_for_load()
    record('Invalid collection types recover to usable interview',read_demo()['stage']=='chat' and js('document.querySelectorAll(".choices button").length')==4 and used()==previous_usage)
    # Deny localStorage only for this own isolated demo document.
    deny=cdp('Page.addScriptToEvaluateOnNewDocument',source="Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Test-only storage denied','SecurityError')}})")['identifier']
    js('location.reload()');wait_for_load()
    record('Storage denial shows truthful unsaved warning while UI remains usable','บันทึกในเครื่องไม่ได้' in text('#storageWarning') and 'โปรดตรวจ' in text('#saveStatus') and js('document.querySelectorAll(".choices button").length')==4)
    capture('desktop-storage-unavailable')
    cdp('Page.removeScriptToEvaluateOnNewDocument',identifier=deny)
    js('location.reload()');wait_for_load()
    # End clean, representative screenshots at the requested small widths.
    reset_demo()
    for width in [320,360,390,1280]:
        viewport(width);layout(str(width)+'px final initial interview layout')
        capture(('desktop' if width==1280 else 'mobile-'+str(width))+'-chat')
    record('Final console errors empty',js('window.__demoErrors || []')==[])


def run_phase(name):
    globals()['phase_'+name]()
