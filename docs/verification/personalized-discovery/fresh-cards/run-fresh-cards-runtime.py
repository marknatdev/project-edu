"""Fresh-card API runtime verification (card t_b16ea6da) — PRODUCTION server path.

Real `next start` (NODE_ENV=production, PERSISTENCE_BACKEND=supabase, signed Guest
capability) -> supabase-js RPC -> def01-cloud/rest-shim.mjs (test-only PostgREST
stand-in) -> REAL local PostgreSQL 17 running the repository's supabase/migrations
(incl. 0004). The AI upstream is a LABELLED MOCK OpenAI-compatible server in this
script: its responses are hand-written samples, NOT model output. Nothing here is
live-AI evidence. All keys/secrets are synthetic per-run values (never real).
Hosted Supabase PostgREST/JWT/RLS and Vercel are NOT exercised.

Run from repo root:  python docs/verification/personalized-discovery/fresh-cards/run-fresh-cards-runtime.py
"""
import json
import os
import secrets
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import psutil

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = ROOT / 'docs/verification/personalized-discovery/fresh-cards'
DB_DIR = ROOT / '.local/fresh-cards-runtime-pg'
SHIM = ROOT / 'docs/verification/personalized-discovery/def01-cloud/rest-shim.mjs'
PORT, SHIM_HTTP, SHIM_PG, MOCK_PORT = 3019, 55394, 55393, 55395  # outside Windows excluded ranges
BASE = f'http://127.0.0.1:{PORT}'
SUPABASE_URL = f'http://127.0.0.1:{SHIM_HTTP}'
SYN = {'guest': secrets.token_hex(32), 'service': 'synthetic-service-' + secrets.token_hex(8),
       'publishable': 'synthetic-publishable-' + secrets.token_hex(8), 'pg': secrets.token_hex(16),
       'control': secrets.token_hex(16), 'ai': 'synthetic-ai-key-' + secrets.token_hex(8)}
LEARNER_SECRET_TEXT = 'หนูชอบเลี้ยงปลากัดสีน้ำเงินที่บ้านคุณยาย'  # must never appear in server logs
log = (EVIDENCE / 'runtime.log').open('w', encoding='utf-8')
rows = []
server = shim = None


def record(name, ok, detail):
    rows.append({'check': name, 'pass': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)


# ---------------- MOCK upstream (labelled; not an AI) ----------------
MOCK = {'mode': 'ok', 'calls': [], 'delay': 0.0}
POOL = [
    ('ตู้ปลากัดกรองน้ำด้วยถ่านจากกะลามะพร้าว', 'น้ำในตู้ปลากัดขุ่นเร็ว', 'เปรียบเทียบความใสของน้ำในตู้ที่ใช้วัสดุกรองต่างกัน'),
    ('แอปเตือนเวลาให้อาหารปลา', 'ลืมให้อาหารปลาหรือให้ซ้ำ', 'ออกแบบแอปง่าย ๆ แล้วทดลองใช้ 1 สัปดาห์'),
    ('ไฟ LED ช่วยให้พืชน้ำในตู้โต', 'พืชน้ำในตู้เหี่ยวเพราะแสงน้อย', 'เทียบการโตของพืชน้ำใต้แสงสีต่างกัน'),
    ('เครื่องวัดอุณหภูมิน้ำราคาถูก', 'ไม่รู้ว่าน้ำในตู้ร้อนเกินไปเมื่อไร', 'ประกอบเซนเซอร์อุณหภูมิกับบอร์ดราคาถูกแล้วเทียบกับเทอร์โมมิเตอร์'),
    ('สถิติพฤติกรรมการว่ายของปลาในแต่ละช่วงวัน', 'ไม่รู้ว่าปลาเครียดช่วงไหน', 'บันทึกวิดีโอแล้วนับรอบการว่ายในแต่ละช่วงเวลา'),
    ('ที่บังแดดตู้ปลาจากกล่องกระดาษ', 'แดดส่องตู้ทำให้ตะไคร่ขึ้น', 'วัดปริมาณตะไคร่เมื่อมีและไม่มีที่บังแดด'),
    ('กระถางรดน้ำเองจากขวดพลาสติก', 'ต้นไม้หน้าบ้านเหี่ยวเมื่อไม่มีคนรดน้ำ', 'เทียบความชื้นดินระหว่างไส้ตะเกียงต่างชนิด'),
    ('เกมการ์ดทบทวนคำศัพท์ชีววิทยา', 'จำคำศัพท์ชีววิทยาไม่ได้', 'เทียบคะแนนก่อนและหลังเล่นเกม'),
]
CURSOR = {'i': 0}


def card(title, problem, direction, **extra):
    base = {'title': title, 'problem': problem, 'roughDirection': direction, 'interestLink': 'ต่อยอดจากความชอบของผู้เรียน',
            'subfieldId': 'sci_environment', 'difficulty': 'beginner', 'estimatedWeeks': 5, 'estimatedBudgetBaht': 250,
            'requiredEquipment': ['มือถือ'], 'minTeamSize': 1, 'maxTeamSize': 3, 'requiredSkills': ['การสังเกต'],
            'fitNotes': ['ใช้งบไม่เกิน 300 บาท'], 'safetyConcerns': []}
    base.update(extra)
    return base


THAI = 'กขคงจฉชซญดตถทธนบปผพฟภมยรลวศสหอฮ'


def rnd(n):
    return ''.join(secrets.choice(THAI) for _ in range(n))


def unique_batch(n):
    # First pass: hand-written pool. Afterwards: synthetic random-letter samples
    # (mutually distinct) so repeat-screening does not limit quota scenarios.
    out = []
    for _ in range(n):
        i = CURSOR['i']; CURSOR['i'] += 1
        if i < len(POOL):
            out.append(card(*POOL[i]))
        else:
            out.append(card('ไอเดีย' + rnd(14), 'ปัญหา' + rnd(18), 'ทดลอง' + rnd(18)))
    return out


class MockUpstream(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('content-length', 0))) or b'{}')
        auth_ok = self.headers.get('authorization') == 'Bearer ' + SYN['ai']
        user = next((m['content'] for m in body.get('messages', []) if m['role'] == 'user'), '')
        count = json.loads(user.split('\n')[1])['count'] if '\n' in user else 5
        MOCK['calls'].append({'auth_ok': auth_ok, 'model': body.get('model'), 'max_tokens': body.get('max_tokens'), 'prompt': user, 'count': count})
        if MOCK['delay']:
            time.sleep(MOCK['delay'])
        mode = MOCK['mode']
        if mode == 'down':
            self.send_response(502); self.end_headers(); self.wfile.write(('upstream echo ' + user[:50]).encode()); return
        if mode == 'garbage':
            content = 'not json at all'
        elif mode == 'partial':
            first = POOL[0]
            content = json.dumps({'cards': unique_batch(2) + [
                {'title': 'ไม่ครบ'},
                card('ถังหมักปุ๋ยจากเศษอาหาร', 'ดูงานวิจัยที่ https://example.org/x', 'หมักแล้ววัดอุณหภูมิ'),
                card('สีของหลังคากับความร้อน', 'เป็นไอเดียใหม่ที่ไม่เคยมีใครทำมาก่อน', 'วัดอุณหภูมิ'),
                card(first[0] + '!', first[1], first[2]),  # exact repeat of an already accepted card
            ]}, ensure_ascii=False)
        else:
            content = json.dumps({'cards': unique_batch(count)}, ensure_ascii=False)
        payload = json.dumps({'choices': [{'message': {'content': content}}]}).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(payload)


# ---------------- process helpers ----------------
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
    for p in (SHIM_HTTP, SHIM_PG):
        if port_open(p):
            raise RuntimeError(f'port {p} occupied; refusing to affect another process')
    if not (DB_DIR / 'data').exists():
        DB_DIR.mkdir(parents=True, exist_ok=True)
        subprocess.check_call(['node', str(SHIM), 'init'], cwd=ROOT, env=shim_env(), stdout=log, stderr=subprocess.STDOUT)
    shim = subprocess.Popen(['node', str(SHIM), 'serve'], cwd=ROOT, env=shim_env(), stdout=log, stderr=subprocess.STDOUT)
    for _ in range(300):
        if port_open(SHIM_HTTP):
            return
        time.sleep(.1)
    raise TimeoutError('shim not ready')


def stop_shim():
    global shim
    if not shim:
        return
    try:
        urllib.request.urlopen(urllib.request.Request(SUPABASE_URL + '/__control/stop', method='POST',
                                                      headers={'x-control-token': SYN['control']}), timeout=10).read()
    except Exception:
        pass
    try:
        shim.wait(timeout=40)
    except subprocess.TimeoutExpired:
        shim.kill()
    shim = None


def build():
    env = os.environ.copy()
    env.update({'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': SYN['publishable'],
                'NEXT_TELEMETRY_DISABLED': '1'})
    with (EVIDENCE / 'runtime-harness-build.txt').open('w', encoding='utf-8') as out:
        code = subprocess.call(['node', str(ROOT / 'node_modules/next/dist/bin/next'), 'build'], cwd=ROOT, env=env, stdout=out, stderr=subprocess.STDOUT)
    if code:
        raise RuntimeError('harness build failed')


SERVER_LOG = EVIDENCE / 'runtime-next-server.log'


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
    out = SERVER_LOG.open('a', encoding='utf-8')
    out.write(f'\n=== next start (ai_configured={ai_configured}) ===\n'); out.flush()
    server = subprocess.Popen(['node', str(ROOT / 'node_modules/next/dist/bin/next'), 'start', '-p', str(PORT), '-H', '127.0.0.1'],
                              cwd=ROOT, env=env, stdout=out, stderr=subprocess.STDOUT)
    for _ in range(600):
        if port_open(PORT):
            return
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


class Client:
    def __init__(self):
        self.cookie = ''

    def call(self, method, path, body=None, headers=None):
        h = {'Origin': BASE, 'Content-Type': 'application/json'}
        if self.cookie:
            h['Cookie'] = self.cookie
        h.update(headers or {})
        data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode())
        req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
        try:
            res = urllib.request.urlopen(req, timeout=60)
        except urllib.error.HTTPError as e:
            res = e
        cookie = res.headers.get('Set-Cookie')
        if cookie and cookie.startswith('edu-coaching-owner=') and not cookie.startswith('edu-coaching-owner=;'):
            self.cookie = cookie.split(';')[0]
        raw = res.read()
        try:
            return res.status, json.loads(raw)
        except Exception:
            return res.status, {'raw': raw[:200].decode('utf-8', 'replace')}

    def post(self, body, **kw):
        return self.call('POST', '/api/discovery/cards', body, **kw)

    def quota(self):
        status, data = self.call('GET', '/api/discovery/cards')
        if 'quota' not in data:
            print('GET quota failed', status, data, flush=True)
        return data.get('quota')


def body(answer='ยังไม่รู้ แต่ชอบดูแลสัตว์เลี้ยง', count=5, request_id=None):
    return {'requestId': request_id or str(uuid.uuid4()), 'count': count,
            'learner': {'gradeLevel': 'm_ton', 'goal': 'ysc', 'constraints': {'timeWeeks': 6, 'budgetBaht': 300, 'equipment': ['มือถือ'], 'teamSize': 2, 'skills': ['วาดรูป']}},
            'interest': {'answers': [{'question': 'ช่วงนี้สนใจเรื่องอะไร', 'answer': answer}, {'question': 'อยากแก้ปัญหาอะไร', 'answer': 'น้ำในตู้ขุ่นเร็ว'}]}}


def run():
    mock = ThreadingHTTPServer(('127.0.0.1', MOCK_PORT), MockUpstream)
    threading.Thread(target=mock.serve_forever, daemon=True).start()
    start_shim()
    build()
    SERVER_LOG.write_text('', encoding='utf-8')
    start_server(True)

    # 1. personalization + free allowance
    a = Client()
    q0 = a.quota()
    record('initial quota', q0 and q0['remaining'] == 35 and q0['freeRemaining'] == 5, q0)
    first_body = body(LEARNER_SECRET_TEXT)
    window_start = time.time()
    s, d = a.post(first_body)
    record('generate 5 personalized starter cards (200)', s == 200 and d.get('accepted') == 5 and d['quota']['freeRemaining'] == 0 and d['quota']['extraRemaining'] == 30,
           {'status': s, 'accepted': d.get('accepted'), 'quota': d.get('quota'), 'titles': [c['title'] for c in d.get('cards', [])]})
    record('cards are fresh starter snapshots, not seed catalog',
           s == 200 and all(c['id'].startswith('fresh_') and c['starter']['noveltyChecked'] is False and c['starter']['safetyScreen'] == 'preliminary' for c in d['cards']),
           [c['id'] for c in d.get('cards', [])])
    last = MOCK['calls'][-1]
    record('prompt carries learner answer + constraints; bearer key sent server-side only',
           LEARNER_SECRET_TEXT in last['prompt'] and '"budgetBaht":300' in last['prompt'] and last['auth_ok'] and last['max_tokens'] == 2400,
           {'auth_ok': last['auth_ok'], 'max_tokens': last['max_tokens'], 'count': last['count']})
    first_cards = d.get('cards', [])

    # 2. idempotent replay
    calls = len(MOCK['calls'])
    s, d = a.post(first_body)
    record('same request id replays without a model call or charge', s == 200 and d.get('replayed') is True and d['cards'] == first_cards and len(MOCK['calls']) == calls and d['quota']['used'] == 5,
           {'status': s, 'replayed': d.get('replayed'), 'used': d.get('quota', {}).get('used')})
    changed = dict(first_body, interest={'answers': [{'question': 'สนใจอะไร', 'answer': 'ดนตรี'}]})
    s, d = a.post(changed)
    record('same request id with different intent -> 409 conflict', s == 409 and d.get('status') == 'conflict', {'status': s})

    # 3. partial + bad outputs + repeats
    MOCK['mode'] = 'partial'
    s, d = a.post(body())
    record('partial: only valid unique claim-free cards accepted and charged',
           s == 200 and d.get('accepted') == 2 and d.get('partial') is True and d.get('rejected') == {'invalid': 1, 'unsupportedClaims': 2, 'repeats': 1} and d['quota']['used'] == 7,
           {'status': s, 'accepted': d.get('accepted'), 'rejected': d.get('rejected'), 'quota': d.get('quota')})

    # 4. unreachable / garbage -> truthful unavailable, no charge
    MOCK['mode'] = 'down'
    down_body = body()
    s, d = a.post(down_body)
    record('upstream 502 -> 503 AI_UNAVAILABLE, no charge', s == 503 and d.get('code') == 'AI_UNAVAILABLE' and d['quota']['used'] == 7 and 'cards' not in d,
           {'status': s, 'code': d.get('code'), 'messageTh': d.get('messageTh'), 'used': d.get('quota', {}).get('used')})
    s, d = a.post(down_body)
    record('retrying a failed intent -> 409 failed_intent (new request id required)', s == 409 and d.get('retryWithNewRequestId') is True, {'status': s})
    calls = len(MOCK['calls'])
    s, d = a.post(body())
    record('7th request in a minute: per-owner admission -> 429 rate_limited before any model call',
           s == 429 and d.get('status') == 'rate_limited' and len(MOCK['calls']) == calls, {'status': s})
    MOCK['mode'] = 'garbage'
    g = Client()
    s, d = g.post(body())
    record('malformed model output -> 503 AI_OUTPUT_UNUSABLE, no charge', s == 503 and d.get('code') == 'AI_OUTPUT_UNUSABLE' and d['quota']['used'] == 0, {'status': s, 'code': d.get('code')})

    # 5. concurrency: one intent double-submitted from 5 threads
    MOCK['mode'] = 'ok'; MOCK['delay'] = 1.5
    b = Client(); b.quota()
    same = body()
    calls = len(MOCK['calls'])
    results = []
    threads = [threading.Thread(target=lambda: results.append(b.post(same))) for _ in range(5)]
    [t.start() for t in threads]; [t.join() for t in threads]
    statuses = sorted(r[0] for r in results)
    record('5 concurrent submits of one intent -> one model call, one 200 + pending 202s', len(MOCK['calls']) - calls == 1 and statuses.count(200) == 1 and statuses.count(202) == 4,
           {'statuses': statuses, 'model_calls': len(MOCK['calls']) - calls})
    MOCK['delay'] = 0
    record('concurrent intent charged exactly once', b.quota()['used'] == 5, b.quota())

    # 6. security/validation
    c = Client()
    s, _ = c.post(dict(body(), anonymousId='victim'))
    record('caller-chosen anonymousId rejected (400)', s == 400, {'status': s})
    s, _ = c.post(body(), headers={'Origin': 'https://evil.example', 'Sec-Fetch-Site': 'cross-site'})
    record('cross-site request rejected (403)', s == 403, {'status': s})
    s, _ = c.post(json.dumps(dict(body(), pad='x' * 17000)).encode())
    record('oversized body rejected (413)', s == 413, {'status': s})
    s, _ = c.post(body(), headers={'Cookie': 'edu-coaching-owner=v1.' + '0' * 64 + '.' + '0' * 64})
    record('forged guest capability rejected (401)', s == 401, {'status': s})

    # 7. restart Next server, then replay + quota persisted
    used_before = a.quota()['used']
    stop_server(); start_server(True)
    calls = len(MOCK['calls'])
    s, d = a.post(first_body)
    record('after Next restart: per-owner admission window is durable (still 429 inside the minute)',
           s == 429 and len(MOCK['calls']) == calls, {'status': s, 'seconds_since_window_start': round(time.time() - window_start, 1)})
    time.sleep(max(0, 62 - (time.time() - window_start)))
    s, d = a.post(first_body)
    record('after Next restart: completed intent replays identical cards, no model call', s == 200 and d.get('replayed') is True and d['cards'] == first_cards and len(MOCK['calls']) == calls,
           {'status': s, 'replayed': d.get('replayed')})
    record('after Next restart: daily counter persisted (no silent reset)', a.quota()['used'] == used_before, {'used_before': used_before, 'used_after': a.quota()['used']})

    # 8. restart database too
    stop_server(); stop_shim(); start_shim(); start_server(True)
    s, d = a.post(first_body)
    record('after DB + Next restart: replay still identical', s == 200 and d.get('replayed') is True and d['cards'] == first_cards, {'status': s})

    # 9. exhaustion across topics for a fresh owner (6/min admission -> paced)
    e = Client(); e.quota()
    topics = ['ปลากัด', 'ดนตรี', 'หุ่นยนต์', 'ทำอาหาร', 'ฟุตบอล', 'ต้นไม้', 'ดาราศาสตร์']
    outcomes = []
    for i, topic in enumerate(topics):
        if i == 6:
            time.sleep(62)
        outcomes.append(e.post(body(topic))[0])
    qe = e.quota()
    record('topic switches do not renew allowance: 7 topics x 5 = 35 then exhausted', outcomes == [200] * 7 and qe['used'] == 35 and qe['remaining'] == 0, {'statuses': outcomes, 'quota': qe})
    calls = len(MOCK['calls'])
    s, d = e.post(body('เรื่องใหม่'))
    record('36th card -> 429 quota_exhausted without model call', s == 429 and d.get('status') == 'quota_exhausted' and len(MOCK['calls']) == calls,
           {'status': s, 'messageTh': d.get('messageTh')})

    # 10. AI unconfigured: honest unavailable; other features keep documented fallback
    stop_server(); start_server(False)
    u = Client()
    s, d = u.post(body())
    record('AI unconfigured -> 503 AI_UNCONFIGURED, nothing charged', s == 503 and d.get('code') == 'AI_UNCONFIGURED' and d['quota']['used'] == 0,
           {'status': s, 'messageTh': d.get('messageTh')})
    s, d = u.call('POST', '/api/ai/coach', {'action': 'open', 'topicKey': 'fresh-runtime', 'context': {'track': 'discovery_track', 'gradeLevel': 'm_ton', 'goal': 'ysc'}})
    record('coaching keeps its documented offline fallback (labelled fallback)', s == 200 and d.get('turn', {}).get('source') == 'fallback', {'status': s, 'source': d.get('turn', {}).get('source')})
    stop_server()

    text = SERVER_LOG.read_text(encoding='utf-8')
    record('server logs contain no learner text or synthetic keys', LEARNER_SECRET_TEXT not in text and SYN['ai'] not in text and SYN['service'] not in text and SYN['guest'] not in text,
           {'log_bytes': len(text)})
    mock.shutdown()


try:
    run()
finally:
    try:
        stop_server()
    except Exception:
        pass
    stop_shim()
    marker = DB_DIR / 'test-owned.marker'
    if marker.exists() and marker.read_text() == 'def01-browser':
        shutil.rmtree(DB_DIR, ignore_errors=True)
    summary = {'harness': 'next start (production) + supabase-js + rest-shim + local PostgreSQL 17; MOCK upstream (not live AI)',
               'passed': sum(r['pass'] for r in rows), 'total': len(rows), 'mock_upstream_calls': len(MOCK['calls'])}
    (EVIDENCE / 'runtime-results.json').write_text(json.dumps({'summary': summary, 'checks': rows}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary))
    log.close()
