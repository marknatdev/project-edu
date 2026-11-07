"""Reproducible real-Chromium verification for Deliverable A, no upstream AI.

Uses the installed Chrome executable and Python's installed websockets package.
No project dependency/package-lock changes. Creates a disposable Chrome profile
only inside this verification directory, then removes that task-owned profile.
"""
import json
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path
from websockets.sync.client import connect
from websockets.typing import Origin


ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / 'docs/verification/personalized-discovery'
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
PROFILE = EVIDENCE / '.chromium-profile'
if PROFILE.exists():
    raise RuntimeError('Task-owned profile directory already exists; inspect before reusing it')
PROFILE.mkdir()
chrome_log = (EVIDENCE / 'chromium.log').open('w', encoding='utf-8')
process = subprocess.Popen([
    str(CHROME), '--headless=new', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--metrics-recording-only',
    '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--remote-allow-origins=http://127.0.0.1', '--window-size=1280,960',
    '--user-data-dir=' + str(PROFILE), 'about:blank',
], stdout=chrome_log, stderr=subprocess.STDOUT)
connection = None
sequence = 0
session_id = None

def cdp(method, **params):
    global sequence
    timeout = params.pop('_response_timeout', 30)
    sequence += 1
    command = {'id': sequence, 'method': method, 'params': params}
    if session_id:
        command['sessionId'] = session_id
    assert connection is not None
    connection.send(json.dumps(command))
    while True:
        response = json.loads(connection.recv(timeout=timeout))
        if response.get('id') == sequence:
            if 'error' in response:
                raise RuntimeError(f'{method}: {response["error"]}')
            return response.get('result', {})

def js(expression):
    result = cdp('Runtime.evaluate', expression=expression, returnByValue=True,
                 awaitPromise=True, userGesture=True)
    if 'exceptionDetails' in result:
        raise RuntimeError(result['exceptionDetails'])
    return result.get('result', {}).get('value')

def wait_for_load():
    for _ in range(100):
        try:
            if js('document.readyState') == 'complete':
                return
        except RuntimeError:
            pass
        time.sleep(.05)
    raise TimeoutError('Document did not complete loading')

def fill_input(selector, value):
    js(f'(() => {{const e=document.querySelector({json.dumps(selector)});e.focus();e.value="";e.dispatchEvent(new Event("input",{{bubbles:true}}));}})()')
    cdp('Input.insertText', text=value)

try:
    port_file = PROFILE / 'DevToolsActivePort'
    for _ in range(200):
        if port_file.exists():
            break
        if process.poll() is not None:
            raise RuntimeError('Chrome exited before debugging became available')
        time.sleep(.05)
    port = port_file.read_text().splitlines()[0]
    with urllib.request.urlopen('http://127.0.0.1:' + port + '/json/version') as response:
        version = json.load(response)
    connection = connect(version['webSocketDebuggerUrl'], origin=Origin('http://127.0.0.1'), max_size=40*1024*1024)
    target = cdp('Target.createTarget', url='about:blank')['targetId']
    session_id = cdp('Target.attachToTarget', targetId=target, flatten=True)['sessionId']
    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Page.addScriptToEvaluateOnNewDocument', source="window.__demoErrors=[];addEventListener('error',e=>window.__demoErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__demoErrors.push(String(e.reason)))")
    cdp('Page.navigate', url=(ROOT / 'docs/mockups/personalized-discovery.html').as_uri())
    wait_for_load()
    print('BROWSER:', version['Browser'])
    print('TARGET: standalone file, fixed fixtures only, no upstream calls')
    exec(compile((EVIDENCE / 'browser-checks.py').read_text(encoding='utf-8'), str(EVIDENCE / 'browser-checks.py'), 'exec'), globals())
    for phase in ['interview', 'selection', 'errors_quota', 'review_fixes']:
        if 'phase_' + phase in globals():
            globals()['run_phase'](phase)
    rows = json.loads((EVIDENCE / 'mockup/browser-results.json').read_text(encoding='utf-8'))
    summary = {'browser': version['Browser'], 'mode': 'Headless real Chromium via CDP; all AI content fixed/demo fixtures', 'checks': len(rows), 'passed': sum(r['passed'] for r in rows), 'failed': sum(not r['passed'] for r in rows)}
    (EVIDENCE / 'mockup/browser-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print('SUMMARY:', json.dumps(summary, ensure_ascii=False))
finally:
    if connection:
        try:
            session_id = None
            cdp('Browser.close')
        except Exception:
            pass
        connection.close()
    try:
        process.wait(timeout=15)
    except subprocess.TimeoutExpired:
        # Stop only the process tree created by this runner.
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True, check=False)
    chrome_log.close()
    for attempt in range(20):
        try:
            shutil.rmtree(PROFILE)
            break
        except PermissionError:
            time.sleep(.25)
    if PROFILE.exists():
        raise RuntimeError('Chrome profile cleanup failed; task-owned profile remains')
