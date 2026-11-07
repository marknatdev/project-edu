import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as evaluatePOST, GET as evaluateGET } from '@/app/api/ai/evaluate/route';
import { POST as pivotPOST } from '@/app/api/ai/pivot/route';
import { POST as proposalPOST } from '@/app/api/ai/proposal/route';
import { DELETE as wipeDELETE } from '@/app/api/ai/coach/route';
import { postgresFixture } from '../support/postgres';
import { authUser } from '../fixtures/auth';
import { cookieJar, ideaFixture } from '../fixtures/repairs';

// DEF-02/03/04 on the PRODUCTION persistence path: real Next route handlers,
// signed Guest capability / verified-account principal, supabase-js and a REAL
// local PostgreSQL 17 running all shipped migrations (0001-0005). Simulated:
// only the HTTP hop to PostgREST/Auth (fetch -> same SQL function / synthetic
// user). AI unconfigured => labelled fallback guidance, NOT live AI evidence.
let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);
const ORIGIN = 'https://app.test';
const SUPABASE = 'https://ppctndzkerwiokjfaklw.supabase.co';
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('APP_ORIGIN', ORIGIN);
  vi.stubEnv('APP_GUEST_SECRET', 'synthetic-repairs-cloud-guest-secret-test-only-01');
  vi.stubEnv('PERSISTENCE_BACKEND', 'supabase'); vi.stubEnv('AI_BASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-server-only-key');
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    if (url.pathname === '/auth/v1/user') {
      const token = new Headers(init?.headers).get('authorization')?.split(' ')[1] ?? '';
      const sub = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString() || '{}').sub;
      return sub ? Response.json({ ...authUser, id: sub }) : Response.json({ msg: 'invalid' }, { status: 401 });
    }
    const result = await pg.rpc.rpc(url.pathname.split('/').pop()!, JSON.parse(String(init?.body)));
    return Response.json(result.error ?? result.data, { status: result.error ? 400 : 200 });
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

/** Synthetic signed-in account cookie for a given Auth UUID (never a real token). */
function accountCookie(id: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: id, exp })).toString('base64url'), 'synthetic'].join('.');
  const session = { access_token, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { ...authUser, id } };
  return 'sb-ppctndzkerwiokjfaklw-auth-token=base64-' + Buffer.from(JSON.stringify(session)).toString('base64url') + '; edu-workspace=account';
}
type Jar = ReturnType<typeof cookieJar>;
const evaluate = (jar: Jar, idea = ideaFixture()) => jar.send(evaluatePOST, '/api/ai/evaluate', { body: { idea } });
const proposal = (jar: Jar, body: object) => jar.send(proposalPOST, '/api/ai/proposal', { body });
const pivot = (jar: Jar, body: object) => jar.send(pivotPOST, '/api/ai/pivot', { body });
const turn = (jar: Jar, p: { id: string; revision: number }, extra: object) =>
  pivot(jar, { action: 'turn', pivotId: p.id, revision: p.revision, requestId: crypto.randomUUID(), ...extra });
async function ownerOf(jar: Jar): Promise<string> {
  // Owner digest is derived server-side; read back only through the DB fixture.
  const token = /v1\.([a-f0-9]{64})\./.exec(jar.cookie)?.[1];
  const { createHash } = await import('node:crypto');
  return 'g:' + createHash('sha256').update(token!).digest('hex');
}

describe('release repairs on real PostgreSQL 17 (production config; REST/Auth hop simulated; AI unconfigured)', () => {
  it('production refuses private or non-HTTPS AI endpoints before sending learner data or keys', async () => {
    vi.stubEnv('AI_API_KEY', 'synthetic-ai-key'); vi.stubEnv('AI_MODEL', 'synthetic-model');
    for (const url of ['http://127.0.0.1:20128/v1', 'http://ai.example.com/v1', 'https://localhost/v1', 'https://169.254.169.254/v1', 'https://[::1]/v1']) {
      vi.stubEnv('AI_BASE_URL', url);
      const r = await evaluate(cookieJar(ORIGIN));
      expect(r.status).toBe(200);
      expect(r.data.source).toBe('fallback');
    }
    const upstream = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/chat/completions'));
    expect(upstream).toHaveLength(0);
  });

  it('concurrent independent Guests and accounts each get exactly 5 evaluations; no shared or caller-chosen pool', async () => {
    const guestA = cookieJar(ORIGIN), guestB = cookieJar(ORIGIN), account1 = cookieJar(ORIGIN), account2 = cookieJar(ORIGIN);
    account1.cookie = accountCookie('22222222-2222-4222-8222-222222222222');
    account2.cookie = accountCookie('33333333-3333-4333-8333-333333333333');
    await evaluate(guestA); await evaluate(guestB); // issue capabilities first
    const burst = async (jar: Jar, n: number) => Promise.all(Array.from({ length: n }, () => evaluate(jar)));
    const [a, b, c, d] = await Promise.all([burst(guestA, 7), burst(guestB, 7), burst(account1, 8), burst(account2, 8)]);
    const ok = (rs: { status: number }[]) => rs.filter(r => r.status === 200).length;
    expect(ok(a) + 1).toBe(5); expect(ok(b) + 1).toBe(5); expect(ok(c)).toBe(5); expect(ok(d)).toBe(5);
    for (const r of [...a, ...b, ...c, ...d]) expect([200, 429]).toContain(r.status);
    const used = await pg.pool.query("SELECT owner_key, used FROM public.edu_daily_quota WHERE kind='evaluate' AND owner_key=ANY($1) ORDER BY owner_key",
      [[await ownerOf(guestA), await ownerOf(guestB), 'u:22222222-2222-4222-8222-222222222222', 'u:33333333-3333-4333-8333-333333333333']]);
    expect(used.rows.map(r => r.used)).toEqual([5, 5, 5, 5]);
    expect(used.rows.map(r => r.owner_key)).toContain('u:22222222-2222-4222-8222-222222222222');
    const forged = await guestA.send(evaluatePOST, '/api/ai/evaluate', { body: { anonymousId: 'u:33333333-3333-4333-8333-333333333333', idea: ideaFixture() } });
    expect(forged.status).toBe(400);
    expect((await account2.send(evaluateGET, '/api/ai/evaluate?anonymousId=guest', { method: 'GET' })).data.quota.remaining).toBe(0);
    expect((await cookieJar(ORIGIN).send(evaluateGET, '/api/ai/evaluate', { method: 'GET' })).data.quota.remaining).toBe(5);
  });

  it('Pivot progression is owner-bound, CAS-serialized, restart-durable and never writes evaluate/proposal usage', async () => {
    const learner = cookieJar(ORIGIN), outsider = cookieJar(ORIGIN), account = cookieJar(ORIGIN);
    account.cookie = accountCookie('44444444-4444-4444-8444-444444444444');
    const opened = await pivot(learner, { action: 'open', idea: ideaFixture(), axis: 'rigor' });
    expect(opened.status).toBe(200);
    expect(opened.set).toContain('Secure');
    expect((await turn(learner, opened.data.pivot, { requestedTier: 3 })).status).toBe(409);
    // Two tabs race the same revision: exactly one advances.
    const race = await Promise.all([1, 2, 3].map(() => turn(learner, opened.data.pivot, { requestedTier: 2, learnerResponse: 'วัดซ้ำ 3 ครั้ง' })));
    expect(race.filter(r => r.status === 200).length).toBe(1);
    expect(race.filter(r => r.status === 409).length).toBe(2);
    const hint = race.find(r => r.status === 200)!;
    for (const stranger of [outsider, account]) {
      await pivot(stranger, { action: 'open', idea: ideaFixture(), axis: 'rigor' });
      expect((await turn(stranger, hint.data.pivot, { requestedTier: 3 })).status).toBe(404);
    }
    await pg.restart();
    const examples = await turn(learner, hint.data.pivot, { requestedTier: 3 });
    expect(examples.status).toBe(200);
    expect(examples.data.pivot.unlockedTiers).toEqual([1, 2, 3]);
    const quotaRows = await pg.pool.query('SELECT kind FROM public.edu_daily_quota WHERE owner_key=$1', [await ownerOf(learner)]);
    expect(quotaRows.rows).toEqual([]);
    expect((await proposal(learner, { action: 'check' })).data.remaining).toBe(2);
  }, 60_000);

  it('applies migration 0005 admission: Pivot 12/owner/min independent of proposal allowance', async () => {
    const jar = cookieJar(ORIGIN);
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) statuses.push((await pivot(jar, { action: 'open', idea: ideaFixture({ id: `idea-pg-rate-${i}` }), axis: 'impact' })).status);
    expect(statuses.filter(s => s === 200).length).toBe(12);
    expect(statuses[12]).toBe(429);
    expect((await proposal(jar, { action: 'consume', requestId: crypto.randomUUID() })).status).toBe(200);
  });

  it('proposal 2/day is idempotent per owner and resets on the next Bangkok database day', async () => {
    const jar = cookieJar(ORIGIN);
    const requestId = crypto.randomUUID();
    await Promise.all([1, 2, 3].map(() => proposal(jar, { action: 'consume', requestId })));
    expect((await proposal(jar, { action: 'check' })).data.remaining).toBe(1);
    expect((await proposal(jar, { action: 'consume', requestId: crypto.randomUUID() })).status).toBe(200);
    expect((await proposal(jar, { action: 'consume', requestId: crypto.randomUUID() })).status).toBe(429);
    // Simulate the database clock crossing Bangkok midnight: yesterday's usage
    // must not count today (quota day is computed in SQL, not by the caller).
    await pg.pool.query("UPDATE public.edu_daily_quota SET quota_day=quota_day-1 WHERE owner_key=$1", [await ownerOf(jar)]);
    expect((await proposal(jar, { action: 'check' })).data).toMatchObject({ allowed: true, remaining: 2 });
  });

  it('explicit wipe erases Pivot progression; a new capability starts again at Tier 1', async () => {
    const jar = cookieJar(ORIGIN);
    const opened = await pivot(jar, { action: 'open', idea: ideaFixture(), axis: 'fit' });
    await turn(jar, opened.data.pivot, { requestedTier: 2, learnerResponse: 'ตอบแล้ว' });
    const owner = await ownerOf(jar);
    const wiped = await jar.send(wipeDELETE, '/api/ai/coach', { method: 'DELETE' });
    expect(wiped.status).toBe(200);
    expect((await pg.pool.query("SELECT 1 FROM public.edu_records WHERE owner_key=$1 AND collection='pivot'", [owner])).rowCount).toBe(0);
    jar.cookie = '';
    const fresh = await pivot(jar, { action: 'open', idea: ideaFixture(), axis: 'fit' });
    expect(fresh.data.pivot.unlockedTiers).toEqual([1]);
  });
});
