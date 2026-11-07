import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST, DELETE } from '@/app/api/ai/coach/route';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach } from 'vitest';
import { TOPIC_CARDS } from '@/data/topic-cards';

let testDir: string;
beforeEach(() => {
  testDir = resolve('.local/coaching-tests', crypto.randomUUID());
  mkdirSync(testDir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(testDir, 'conversations.sqlite'));
  vi.stubEnv('AI_BASE_URL', '');
});
afterEach(() => { rmSync(testDir, { recursive: true, force: true }); vi.unstubAllGlobals(); });
const context = { track: 'discovery_track', gradeLevel: 'm_plai', goal: 'ysc' };
function browserClient() {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async call(body: object, customCookie?: string) {
      const response = await POST(new Request('http://localhost/api/ai/coach', { method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: customCookie ?? cookie }, body: JSON.stringify(body) }));
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
      return { response, data: await response.json() };
    },
    async open(topicKey = 'card:a') { return this.call({ action: 'open', topicKey, context }); },
    async advance(data: { conversation: { id: string; revision: number } }, extra: object = {}) {
      return this.call({ action: 'turn', conversationId: data.conversation.id, revision: data.conversation.revision,
        requestId: crypto.randomUUID(), ...extra });
    },
  };
}


// Public seam: real route handler + durable storage. AI is explicitly unconfigured
// in these tests, exercising server-issued deterministic guidance, not live AI.
afterEach(() => { vi.unstubAllEnvs(); });

describe('DEF-01 authoritative coaching API (server fallback, not live AI)', () => {
  it('accepts same-origin browser requests when Next normalizes its internal URL hostname', async () => {
    const response = await POST(new Request('http://localhost:3018/api/ai/coach', { method: 'POST',
      headers: { host: '127.0.0.1:3018', origin: 'http://127.0.0.1:3018', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ action: 'open', topicKey: 'card:host', context }) }));
    expect(response.status).toBe(200);
  });
  it('isolates two topics and two cookie owners; a public learner/id string cannot impersonate an owner', async () => {
    const a = browserClient(), b = browserClient();
    const first = await a.open();
    expect(first.response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(first.response.headers.get('set-cookie')).toContain('SameSite=strict');
    expect(first.response.headers.get('cache-control')).toBe('no-store');
    const hint = await a.advance(first.data, { requestedTier: 2, learnerResponse: 'ยังคิดไม่ออก' });
    expect(hint.data.turn.tier).toBe(2);
    const otherTopic = await a.open('card:b');
    expect(otherTopic.data.conversation.id).not.toBe(first.data.conversation.id);
    expect((await a.advance(otherTopic.data, { requestedTier: 3 })).data.turn.tier).toBe(1);
    expect((await a.open()).data.conversation.state.history).toEqual(hint.data.conversation.state.history);
    const outsider = await b.advance(hint.data, { requestedTier: 3 });
    expect(outsider.response.status).toBe(404);
    const own = await b.open();
    expect(own.data.conversation.id).not.toBe(first.data.conversation.id);
    expect(own.data.turn.tier).toBe(1);
  });

  it('does not treat an initial answer, blank answer or default unlocked tier as prior progression', async () => {
    const client = browserClient();
    const initial = await client.open();
    const blank = await client.advance(initial.data, { requestedTier: 3, learnerResponse: '   ' });
    expect(blank.data.turn.tier).toBe(1);
    expect(blank.data.turn.examples).toBeUndefined();
    const hintAttempt = await client.advance(blank.data, { requestedTier: 2 });
    expect(hintAttempt.data.turn.tier).toBe(1);
    const real = await client.advance(hintAttempt.data, { requestedTier: 2, learnerResponse: 'ยังคิดไม่ออก' });
    expect(real.data.turn.tier).toBe(2);
    const examples = await client.advance(real.data, { requestedTier: 3 });
    expect(examples.data.turn.tier).toBe(3);
  });

  it('preserves generated-card snapshots without a catalog lookup or mutable browser replacement', async () => {
    const client = browserClient();
    const card = { ...TOPIC_CARDS[0], id: 'generated-test-only', title: 'การ์ดจำลองใหม่สำหรับทดสอบ' };
    const first = await client.call({ action: 'open', topicKey: 'card:' + card.id, context: { ...context, topicCard: card } });
    expect(first.data.conversation.context.topicCard).toEqual(card);
    expect(first.data.turn.content).toContain(card.title);
    const resumed = await client.call({ action: 'open', topicKey: 'card:' + card.id, context: { ...context, topicCard: { ...card, title: 'tampered context' } } });
    expect(resumed.data.conversation.context.topicCard.title).toBe(card.title);
    expect(resumed.data.conversation.id).toBe(first.data.conversation.id);
  });

  it('starts a new conversation with fresh gates, invalidates the old handle and preserves another topic', async () => {
    const client = browserClient();
    const a = await client.open(), b = await client.open('card:b');
    const hint = await client.advance(a.data, { learnerResponse: 'ก', requestedTier: 2 });
    const reset = await client.call({ action: 'reset', topicKey: 'card:a', conversationId: a.data.conversation.id, context });
    expect(reset.response.status).toBe(200);
    expect(reset.data.conversation.id).not.toBe(a.data.conversation.id);
    expect(reset.data.conversation.state.history).toHaveLength(1);
    expect(reset.data.turn.tier).toBe(1);
    expect((await client.advance(hint.data, { requestedTier: 3 })).response.status).toBe(404);
    expect((await client.open('card:b')).data.conversation).toEqual(b.data.conversation);
    expect((await client.call({ action: 'reset', topicKey: 'card:a', conversationId: a.data.conversation.id, context })).response.status).toBe(409);
  });

  it('deletes all owned conversations and revokes the old cookie; another owner is unaffected', async () => {
    const a = browserClient(), b = browserClient();
    const first = await a.open(); await a.open('card:b');
    const other = await b.open();
    const wiped = await DELETE(new Request('http://localhost/api/ai/coach', { method: 'DELETE', headers: { cookie: a.cookie } }));
    expect(wiped.status).toBe(200);
    expect(await wiped.json()).toEqual({ deleted: true });
    expect(wiped.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await a.advance(first.data)).response.status).toBe(410);
    expect((await b.open()).data.conversation).toEqual(other.data.conversation);
    const freshBrowser = browserClient();
    expect((await freshBrowser.open()).data.conversation.state.history).toHaveLength(1);
  });

  it('makes concurrent retries idempotent and rejects stale/conflicting writes without losing the winner', async () => {
    const client = browserClient(); const first = await client.open();
    const body = { action: 'turn', conversationId: first.data.conversation.id, revision: first.data.conversation.revision,
      requestId: crypto.randomUUID(), requestedTier: 2, learnerResponse: 'ยังคิดไม่ออก' };
    const retries = await Promise.all([client.call(body), client.call(body)]);
    expect(retries.map(r => r.response.status)).toEqual([200, 200]);
    expect(retries[0].data.conversation.state.history).toHaveLength(2);
    expect(retries[0].data.conversation).toEqual(retries[1].data.conversation);
    expect((await client.call({ ...body, learnerResponse: 'different' })).response.status).toBe(409);
    const current = retries[0].data;
    const contenders = await Promise.all([client.advance(current, { requestedTier: 3 }), client.advance(current, { requestedTier: 1 })]);
    expect(contenders.map(r => r.response.status).sort()).toEqual([200, 409]);
    const resumed = await client.open();
    expect(resumed.data.conversation.revision).toBe(3);
    expect(resumed.data.conversation.state.history).toHaveLength(3);
    // Retrying an already accepted learner draft after reload returns current truth, not another answer.
    expect((await client.call({ ...body, revision: 3 })).data.conversation.revision).toBe(3);
  });

  it('fails closed for malformed/oversized/unknown fields, cross-origin requests and unavailable storage', async () => {
    const client = browserClient();
    expect((await client.call({ action: 'open', topicKey: 'a', context, unlockedTiers: [1, 2, 3] })).response.status).toBe(400);
    expect((await client.call({ action: 'open', topicKey: 'a', context, history: [{ tier: 2 }] })).response.status).toBe(400);
    const cross = await POST(new Request('http://localhost/api/ai/coach', { method: 'POST', headers: { origin: 'https://attacker.invalid' }, body: JSON.stringify({ action: 'open', topicKey: 'a', context }) }));
    expect(cross.status).toBe(403);
    expect((await POST(new Request('http://localhost/api/ai/coach', { method: 'POST', body: 'not json' }))).status).toBe(400);
    expect((await POST(new Request('http://localhost/api/ai/coach', { method: 'POST', body: 'x'.repeat(65537) }))).status).toBe(413);
    vi.stubEnv('COACH_DB_PATH', testDir); // directory, not a usable database
    const unavailable = await client.open();
    expect(unavailable.response.status).toBe(503);
    expect(unavailable.data).not.toHaveProperty('turn');
    expect(JSON.stringify(unavailable.data)).not.toContain(testDir);
  });

  it('does not resurrect an in-flight topic creation after explicit wipe (upstream explicitly mocked)', async () => {
    const client = browserClient();
    await client.open();
    vi.stubEnv('AI_BASE_URL', 'http://mock-upstream.invalid/v1');
    vi.stubEnv('AI_API_KEY', 'mock-test-key-not-a-secret');
    vi.stubEnv('AI_MODEL', 'mock-only');
    let finish!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(r => { started = r; });
    vi.stubGlobal('fetch', vi.fn(() => { started(); return new Promise<Response>(r => { finish = () => r(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ content: 'คำถามจำลอง?' }) } }] }))); }); }));
    const pending = client.open('card:in-flight');
    await entered;
    const wiped = await DELETE(new Request('http://localhost/api/ai/coach', { method: 'DELETE', headers: { cookie: client.cookie } }));
    expect(wiped.status).toBe(200);
    finish();
    expect((await pending).response.status).toBe(410);
    vi.stubEnv('AI_BASE_URL', '');
    expect((await client.open()).response.status).toBe(410);
  });

  it('opens a stable topic, resumes its server history and permits the exact Tier-1-answer/hint/explicit-example sequence', async () => {
    vi.stubEnv('AI_BASE_URL', '');
    let cookie = '';
    const call = async (body: object) => {
      const response = await POST(new Request('http://localhost/api/ai/coach', {
        method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body),
      }));
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
      expect(response.status).toBe(200);
      return response.json();
    };
    const opened = await call({ action: 'open', topicKey: 'card:a', context: { track: 'discovery_track', gradeLevel: 'm_plai', goal: 'ysc' } });
    expect(opened.turn.tier).toBe(1);
    expect(opened.conversation.id).toBeTruthy();
    const advance = async (current: typeof opened, extra: object) => call({ action: 'turn', conversationId: current.conversation.id,
      revision: current.conversation.revision, requestId: crypto.randomUUID(), ...extra });
    const premature = await advance(opened, { requestedTier: 3 });
    expect(premature.turn.tier).toBe(1);
    const answered = await advance(premature, { learnerResponse: 'ก', requestedTier: 1 });
    expect(answered.conversation.state.history[1].learnerResponse).toBe('ก');
    const hint = await advance(answered, { requestedTier: 2 });
    expect(hint.turn.tier).toBe(2);
    const resumed = await call({ action: 'open', topicKey: 'card:a', context: { track: 'idea_track', gradeLevel: 'm_ton', goal: 'curiosity' } });
    expect(resumed.conversation).toEqual(hint.conversation);
    const examples = await advance(resumed, { requestedTier: 3 });
    expect(examples.turn.tier).toBe(3);
    expect(examples.turn.examples.length).toBeGreaterThan(0);
    expect(examples.conversation.context.gradeLevel).toBe('m_plai');
  });

  it('rejects unsigned browser state instead of granting fabricated tier progression', async () => {
    const response = await POST(new Request('http://localhost/api/ai/coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId: 'attacker', requestedTier: 3,
        state: { anonymousId: 'attacker', turnCount: 0, unlockedTiers: [1, 2],
          history: [], aspectProgress: {}, isComplete: false } }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).not.toHaveProperty('turn');
  });
});
