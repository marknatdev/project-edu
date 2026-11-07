import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { postgresFixture } from '../support/postgres';
import { connectFoundationStore } from '@/lib/persistence/supabase-store.server';
import { generateFreshCards } from '@/lib/discovery/fresh-cards.server';
import { FreshCardsRequestSchema } from '@/lib/discovery/fresh-contract';
import type { OwnerKey } from '@/lib/persistence/contracts';
import { mockUpstream, syntheticDistinct } from '../fixtures/fresh-cards';

// S3 over the REAL cloud adapter: repository migrations on a test-owned local
// PostgreSQL 17 (service-role RPC; hosted PostgREST/JWT not exercised). The
// upstream model is a MOCKED fetch — NOT live AI evidence.
let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);
beforeEach(() => {
  vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1');
  vi.stubEnv('AI_API_KEY', 'synthetic-test-key');
  vi.stubEnv('AI_MODEL', 'mock-model');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const owner = (c: string): OwnerKey => `g:${c.repeat(64)}`;
const request = () => FreshCardsRequestSchema.parse({
  requestId: crypto.randomUUID(),
  learner: { gradeLevel: 'm_plai', constraints: { timeWeeks: 8, budgetBaht: 1000, equipment: [], teamSize: 3, skills: ['Python'] } },
  interest: { answers: [{ question: 'อยากทำเรื่องอะไร', answer: 'ยังไม่รู้' }, { question: 'ชอบทำอะไรตอนว่าง', answer: 'เล่นเกม' }] },
});

describe('fresh cards on real PostgreSQL 17 (MOCKED upstream)', () => {
  it('persists starter snapshots (jsonb round-trip) and replays them after a real database restart', async () => {
    const upstream = mockUpstream(() => ({ cards: syntheticDistinct(5) }));
    const intent = request();
    const first = await generateFreshCards(await connectFoundationStore(pg.rpc, owner('5')), intent);
    expect(first).toMatchObject({ status: 'ok', accepted: 5, quota: { used: 5, freeRemaining: 0 } });
    await pg.restart();
    const replay = await generateFreshCards(await connectFoundationStore(pg.rpc, owner('5')), intent);
    expect(replay).toMatchObject({ status: 'ok', replayed: true, accepted: 5, quota: { used: 5, reserved: 0 } });
    expect(replay.status === 'ok' && replay.cards).toEqual(first.status === 'ok' && first.cards);
    expect(replay.status === 'ok' && replay.cards[0].starter).toMatchObject({ origin: 'ai_fresh', noveltyChecked: false });
    expect(upstream.calls).toHaveLength(1);
  }, 60_000);

  it('production route: signed guest + supabase-js transport (REST hop simulated) + real Postgres; restart-safe replay', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('APP_ORIGIN', 'https://app.test');
    vi.stubEnv('APP_GUEST_SECRET', 'synthetic-signing-secret-for-fresh-card-tests-only');
    vi.stubEnv('PERSISTENCE_BACKEND', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ppctndzkerwiokjfaklw.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-server-only-key');
    const upstream = mockUpstream(() => ({ cards: syntheticDistinct(5) }));
    const model = upstream.fetchMock;
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.origin !== 'https://ppctndzkerwiokjfaklw.supabase.co') return model(input as string, init);
      const result = await pg.rpc.rpc(url.pathname.split('/').pop()!, JSON.parse(String(init?.body)));
      return Response.json(result.error ?? result.data, { status: result.error ? 400 : 200 });
    }));
    const { POST, GET } = await import('@/app/api/discovery/cards/route');
    const intent = { ...request(), count: 5 };
    const call = (cookie = '') => POST(new Request('https://app.test/api/discovery/cards', { method: 'POST',
      headers: { origin: 'https://app.test', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(intent) }));
    const first = await call();
    expect(first.status).toBe(200);
    const cookie = first.headers.get('set-cookie')!.split(';')[0];
    expect(cookie).toMatch(/^edu-coaching-owner=v1\./);
    expect(first.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    const firstData = await first.json();
    expect(firstData).toMatchObject({ status: 'ok', accepted: 5, quota: { used: 5, freeRemaining: 0, extraRemaining: 30 } });
    await pg.restart();
    const replay = await call(cookie);
    expect(await replay.json()).toMatchObject({ status: 'ok', replayed: true, cards: firstData.cards });
    const quota = await GET(new Request('https://app.test/api/discovery/cards', { headers: { origin: 'https://app.test', cookie } }));
    expect(await quota.json()).toMatchObject({ quota: { used: 5, reserved: 0, remaining: 30 } });
    expect(upstream.calls).toHaveLength(1);
  }, 60_000);

  it('double-submit across independent connections: one model call, one charge', async () => {
    const upstream = mockUpstream(() => ({ cards: syntheticDistinct(5) }), { delayMs: 150 });
    const intent = request();
    const results = await Promise.all(Array.from({ length: 6 }, async () => generateFreshCards(await connectFoundationStore(pg.rpc, owner('6')), intent)));
    expect(upstream.calls).toHaveLength(1);
    // Exactly one submit generates. Others overlap it (pending) or, when a
    // connection is slow to open under load, arrive after it and replay the
    // identical batch. Neither path may call the model or charge again.
    const fresh = results.filter(r => r.status === 'ok' && !r.replayed);
    expect(fresh).toHaveLength(1);
    const others = results.filter(r => r !== fresh[0]);
    expect(others.every(r => r.status === 'pending' || (r.status === 'ok' && r.replayed))).toBe(true);
    for (const r of others) if (r.status === 'ok' && fresh[0].status === 'ok') expect(r.cards).toEqual(fresh[0].cards);
    expect(await (await connectFoundationStore(pg.rpc, owner('6'))).cardQuota()).toMatchObject({ used: 5, reserved: 0 });
  });

  it('concurrent distinct intents never exceed 35 accepted cards; failures are not charged', async () => {
    let n = 0;
    mockUpstream(() => (n++ % 3 === 2 ? new Response('down', { status: 502 }) : { cards: syntheticDistinct(5) }), { delayMs: 20 });
    const results = await Promise.all(Array.from({ length: 12 }, async () => generateFreshCards(await connectFoundationStore(pg.rpc, owner('7')), request())));
    const accepted = results.reduce((sum, r) => sum + (r.status === 'ok' ? r.accepted : 0), 0);
    const quota = await (await connectFoundationStore(pg.rpc, owner('7'))).cardQuota();
    expect(accepted).toBeLessThanOrEqual(35);
    expect(quota).toMatchObject({ used: accepted, reserved: 0 });
    expect(results.some(r => r.status === 'unavailable')).toBe(true);
  });
});
