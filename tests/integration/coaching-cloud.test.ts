import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, DELETE } from '@/app/api/ai/coach/route';
import { postgresFixture } from '../support/postgres';

// DEF-01 against the production persistence path: real Next route handlers,
// signed Guest capability, supabase-js RPC client and a REAL local PostgreSQL 17
// running the shipped migrations. Only the HTTP hop to PostgREST is simulated
// (fetch -> same SQL function). AI is unconfigured: deterministic server-issued
// guidance, NOT live AI evidence.
let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);
const ORIGIN = 'https://app.test';
const SECRET = 'synthetic-def01-cloud-guest-secret-test-only-0001';
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('APP_ORIGIN', ORIGIN);
  vi.stubEnv('APP_GUEST_SECRET', SECRET); vi.stubEnv('PERSISTENCE_BACKEND', 'supabase');
  vi.stubEnv('AI_BASE_URL', ''); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ppctndzkerwiokjfaklw.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-server-only-key');
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const name = new URL(String(input)).pathname.split('/').pop()!;
    const result = await pg.rpc.rpc(name, JSON.parse(String(init?.body)));
    return Response.json(result.error ?? result.data, { status: result.error ? 400 : 200 });
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const context = { track: 'discovery_track', gradeLevel: 'm_plai', goal: 'ysc' };
function browser() {
  let cookie = '';
  const self = {
    get cookie() { return cookie; },
    set cookie(value: string) { cookie = value; },
    async call(body: object) {
      const response = await POST(new Request(ORIGIN + '/api/ai/coach', { method: 'POST',
        headers: { origin: ORIGIN, 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) }));
      const set = response.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: response.status, set, data: await response.json() };
    },
    open(topicKey: string, extra: object = {}) { return self.call({ action: 'open', topicKey, context: { ...context, ...extra } }); },
    turn(current: { conversation: { id: string; revision: number } }, extra: object = {}) {
      return self.call({ action: 'turn', conversationId: current.conversation.id, revision: current.conversation.revision,
        requestId: crypto.randomUUID(), ...extra });
    },
  };
  return self;
}

describe('DEF-01 coaching on the production Supabase/Postgres backend (REST hop simulated, AI unconfigured)', () => {
  it('gates Tier 3 on server history and resumes the exact conversation after a real Postgres restart', async () => {
    const learner = browser();
    const opened = await learner.open('card:cloud-a');
    expect(opened.status).toBe(200);
    expect(opened.set).toMatch(/edu-coaching-owner=v1\.[a-f0-9]{64}\.[a-f0-9]{64}/);
    expect(opened.set).toContain('Secure');
    expect(opened.data.turn.tier).toBe(1);
    // First-turn Tier 3 and a hint without an answer are downgraded.
    const premature = await learner.turn(opened.data, { requestedTier: 3 });
    expect(premature.data.turn.tier).toBe(1);
    expect(premature.data.turn.examples).toBeUndefined();
    // Stuck answer is accepted verbatim, no length/correctness check.
    const answered = await learner.turn(premature.data, { learnerResponse: 'ยังคิดไม่ออก' });
    expect(answered.data.conversation.state.history.some((h: { learnerResponse?: string }) => h.learnerResponse === 'ยังคิดไม่ออก')).toBe(true);
    expect(answered.data.turn.tier).toBe(1);
    const tooEarly = await learner.turn(answered.data, { requestedTier: 3 });
    expect(tooEarly.data.turn.tier).toBe(2); // hint is issued first, never examples
    expect(tooEarly.data.turn.tierDowngraded).toBe(true);
    expect(tooEarly.data.turn.lenses.length).toBeGreaterThan(0);

    await pg.restart(); // real database process restart between requests

    const resumed = await learner.open('card:cloud-a', { gradeLevel: 'm_ton', goal: 'curiosity' });
    expect(resumed.status).toBe(200);
    expect(resumed.data.conversation).toEqual(tooEarly.data.conversation);
    const examples = await learner.turn(resumed.data, { requestedTier: 3 });
    expect(examples.status).toBe(200);
    expect(examples.data.turn.tier).toBe(3);
    expect(examples.data.turn.examples.length).toBeGreaterThan(0);
    expect(examples.data.conversation.context.gradeLevel).toBe('m_plai');
  }, 60_000);

  it('isolates topics and owners, rejects forged state/cookies, and fences an old handle after start-new', async () => {
    const learner = browser(), other = browser();
    const a = await learner.open('card:iso-a');
    const answered = await learner.turn(a.data, { learnerResponse: 'ก' });
    const withHint = await learner.turn(answered.data, { requestedTier: 2 });
    expect(withHint.data.turn.tier).toBe(2);
    const b = await learner.open('card:iso-b');
    expect(b.data.conversation.id).not.toBe(a.data.conversation.id);
    expect((await learner.turn(b.data, { requestedTier: 3 })).data.turn.tier).toBe(1);
    // Another browser cannot address this conversation id.
    expect((await other.turn(withHint.data, { requestedTier: 3 })).status).toBe(404);
    // Unsigned/forged progression and forged capability cookies are refused.
    expect((await learner.call({ action: 'turn', conversationId: a.data.conversation.id, revision: withHint.data.conversation.revision,
      requestId: crypto.randomUUID(), requestedTier: 3, state: { unlockedTiers: [1, 2, 3] } })).status).toBe(400);
    const forged = browser();
    forged.cookie = 'edu-coaching-owner=v1.' + 'a'.repeat(64) + '.' + 'b'.repeat(64);
    expect((await forged.open('card:iso-a')).status).toBe(401);
    // Start-new: fresh identity + gates; old handle fenced; other topic intact.
    const reset = await learner.call({ action: 'reset', topicKey: 'card:iso-a', conversationId: a.data.conversation.id, context });
    expect(reset.status).toBe(200);
    expect(reset.data.conversation.id).not.toBe(a.data.conversation.id);
    expect(reset.data.conversation.state.history).toHaveLength(1);
    expect((await learner.turn(reset.data, { requestedTier: 3 })).data.turn.tier).toBe(1);
    expect((await learner.turn(withHint.data, { requestedTier: 3 })).status).toBe(404);
    expect((await learner.open('card:iso-b')).data.conversation.id).toBe(b.data.conversation.id);
  }, 60_000);

  it('clears an unverifiable Guest capability (e.g. rotated secret) so the browser can recover instead of a permanent 401', async () => {
    const learner = browser();
    learner.cookie = 'edu-coaching-owner=v1.' + 'c'.repeat(64) + '.' + 'd'.repeat(64);
    const refused = await learner.open('card:recover');
    expect(refused.status).toBe(401);
    expect(refused.data).not.toHaveProperty('turn');
    expect(refused.set).toMatch(/edu-coaching-owner=;.*Max-Age=0/i);
    // Next request carries no capability -> a fresh signed owner, no old data.
    learner.cookie = '';
    const fresh = await learner.open('card:recover');
    expect(fresh.status).toBe(200);
    expect(fresh.data.conversation.state.history).toHaveLength(1);
  }, 60_000);

  it('wipe erases every topic for that owner, revokes its capability, and leaves other owners untouched', async () => {
    const learner = browser(), other = browser();
    const first = await learner.open('card:wipe-a'); await learner.open('card:wipe-b');
    const kept = await other.open('card:wipe-a');
    const oldCookie = learner.cookie;
    const wiped = await DELETE(new Request(ORIGIN + '/api/ai/coach', { method: 'DELETE', headers: { origin: ORIGIN, cookie: oldCookie } }));
    expect(wiped.status).toBe(200);
    expect(wiped.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await learner.turn(first.data)).status).toBe(410);
    expect((await other.open('card:wipe-a')).data.conversation).toEqual(kept.data.conversation);
    const fresh = browser();
    const reopened = await fresh.open('card:wipe-a');
    expect(reopened.data.conversation.id).not.toBe(first.data.conversation.id);
    expect(reopened.data.conversation.state.history).toHaveLength(1);
  }, 60_000);
});
