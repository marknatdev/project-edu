import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { connectLocalFoundationStore } from '@/lib/persistence/sqlite-store.server';
import { generateFreshCards } from '@/lib/discovery/fresh-cards.server';
import type { FreshCardsRequestInput } from '@/lib/discovery/fresh-contract';
import { FreshCardsRequestSchema } from '@/lib/discovery/fresh-contract';
import { TOPIC_CARDS } from '@/data/topic-cards';
import type { OwnerKey } from '@/lib/persistence/contracts';
import { mockUpstream, candidate, distinctCandidates, syntheticDistinct } from '../fixtures/fresh-cards';

// S3 over the REAL local durable adapter (SQLite file). The upstream model is a
// MOCKED OpenAI-compatible fetch (fixtures/fresh-cards.ts): contract evidence
// for our code, NOT live AI evidence.
let dir: string;
let clock: Date;
const owner: OwnerKey = `g:${'a'.repeat(64)}`;
const store = (who: OwnerKey = owner) => connectLocalFoundationStore(who, () => clock);
const request = (overrides: Partial<FreshCardsRequestInput> = {}) => FreshCardsRequestSchema.parse({
  requestId: crypto.randomUUID(),
  learner: { gradeLevel: 'm_ton', goal: 'ysc', constraints: { timeWeeks: 6, budgetBaht: 300, equipment: ['มือถือ'], teamSize: 2, skills: ['วาดรูป'] } },
  interest: { answers: [
    { question: 'ช่วงนี้สนใจเรื่องอะไร', answer: 'ชอบเลี้ยงปลากัดและดูแลตู้ปลา' },
    { question: 'อยากแก้ปัญหาอะไร', answer: 'น้ำในตู้ขุ่นเร็ว' },
  ] },
  ...overrides,
});

beforeEach(() => {
  dir = resolve('.local/fresh-cards-tests', crypto.randomUUID());
  mkdirSync(dir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
  vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1');
  vi.stubEnv('AI_API_KEY', 'synthetic-test-key');
  vi.stubEnv('AI_MODEL', 'mock-model');
  clock = new Date('2026-11-06T05:00:00Z'); // 12:00 Bangkok
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); rmSync(dir, { recursive: true, force: true }); });

describe('generateFreshCards (S3) — idempotency and concurrency (MOCKED upstream)', () => {
  it('replays a completed intent without a second model call or charge', async () => {
    const upstream = mockUpstream(() => ({ cards: distinctCandidates(5) }));
    const s = await store();
    const intent = request();
    const first = await generateFreshCards(s, intent);
    const retry = await generateFreshCards(await store(), intent);
    expect(retry).toMatchObject({ status: 'ok', replayed: true, accepted: 5, rejected: null });
    expect(retry.status === 'ok' && retry.cards).toEqual(first.status === 'ok' && first.cards);
    expect(upstream.calls).toHaveLength(1);
    expect(await s.cardQuota()).toMatchObject({ used: 5, reserved: 0 });
  });

  it('refuses reuse of a request id for a different intent', async () => {
    mockUpstream(() => ({ cards: distinctCandidates(5) }));
    const s = await store();
    const intent = request();
    await generateFreshCards(s, intent);
    const changed = { ...intent, interest: { answers: [{ question: 'สนใจอะไร', answer: 'ดนตรี' }] } };
    expect(await generateFreshCards(s, changed)).toMatchObject({ status: 'conflict' });
    expect(await s.cardQuota()).toMatchObject({ used: 5 });
  });

  it('keeps a failed intent failed (no silent re-generation) and asks for a new request id', async () => {
    const upstream = mockUpstream(() => new Response('down', { status: 503 }));
    const s = await store();
    const intent = request();
    expect(await generateFreshCards(s, intent)).toMatchObject({ status: 'unavailable' });
    expect(await generateFreshCards(s, intent)).toMatchObject({ status: 'failed_intent', retryWithNewRequestId: true });
    expect(upstream.calls).toHaveLength(1);
    expect(await s.cardQuota()).toMatchObject({ used: 0, reserved: 0 });
  });

  it('double-submits of one intent produce exactly one model call and one charge', async () => {
    const upstream = mockUpstream(() => ({ cards: distinctCandidates(5) }), { delayMs: 150 });
    const intent = request();
    const results = await Promise.all(Array.from({ length: 6 }, async () => generateFreshCards(await store(), intent)));
    expect(upstream.calls).toHaveLength(1);
    expect(results.filter(r => r.status === 'ok')).toHaveLength(1);
    expect(results.filter(r => r.status === 'pending')).toHaveLength(5);
    const after = await generateFreshCards(await store(), intent);
    expect(after).toMatchObject({ status: 'ok', replayed: true, accepted: 5 });
    expect(await (await store()).cardQuota()).toMatchObject({ used: 5, reserved: 0 });
  });

  it('concurrent different intents can never spend more than 35 accepted cards per day', async () => {
    // Mutually distinct candidates so repeat-screening is not what limits spending here.
    mockUpstream(() => ({ cards: syntheticDistinct(5) }), { delayMs: 30 });
    const results = await Promise.all(Array.from({ length: 10 }, async () => generateFreshCards(await store(), request())));
    const accepted = results.reduce((sum, r) => sum + (r.status === 'ok' ? r.accepted : 0), 0);
    expect(accepted).toBeLessThanOrEqual(35);
    expect(results.filter(r => r.status === 'quota_exhausted').length).toBeGreaterThanOrEqual(3);
    const quota = await (await store()).cardQuota();
    expect(quota.used).toBe(accepted);
    expect(quota).toMatchObject({ reserved: 0 });
    expect(quota.used + quota.remaining).toBe(35);
  });
});

describe('generateFreshCards (S3) — daily allowance (MOCKED upstream)', () => {
  const uniqueBatch = () => ({ cards: syntheticDistinct(5) });

  it('free partials: 3 accepted leave 2 free, the next batch spills into the 30 extra', async () => {
    mockUpstream((_call, i) => i === 0 ? { cards: distinctCandidates(3) } : uniqueBatch());
    const s = await store();
    expect(await generateFreshCards(s, request())).toMatchObject({ status: 'ok', accepted: 3, partial: true,
      quota: { used: 3, freeRemaining: 2, extraRemaining: 30, remaining: 32 } });
    expect(await generateFreshCards(s, request())).toMatchObject({ status: 'ok', accepted: 5,
      quota: { used: 8, freeRemaining: 0, extraRemaining: 27, remaining: 27 } });
  });

  it('switching topic / restarting the interview does not renew the free allowance; 35 is the daily ceiling', async () => {
    const upstream = mockUpstream(uniqueBatch);
    const s = await store();
    const topics = ['ปลากัด', 'ดนตรี', 'หุ่นยนต์', 'ทำอาหาร', 'ฟุตบอล', 'ต้นไม้', 'ดาราศาสตร์'];
    for (const topic of topics) {
      const r = await generateFreshCards(await store(), request({ interest: { answers: [{ question: 'สนใจอะไร', answer: topic }] } }));
      expect(r.status).toBe('ok');
    }
    expect(await s.cardQuota()).toMatchObject({ used: 35, remaining: 0, freeRemaining: 0, extraRemaining: 0 });
    const calls = upstream.calls.length;
    const over = await generateFreshCards(s, request({ interest: { answers: [{ question: 'สนใจอะไร', answer: 'เรื่องใหม่' }] } }));
    expect(over).toMatchObject({ status: 'quota_exhausted', quota: { used: 35, remaining: 0 } });
    expect(over.status === 'quota_exhausted' && over.messageTh).toMatch(/เที่ยงคืน/);
    expect(upstream.calls).toHaveLength(calls);
  });

  it('requests only the remaining allowance when fewer than 5 remain', async () => {
    const upstream = mockUpstream(uniqueBatch);
    const s = await store();
    for (let i = 0; i < 6; i++) await generateFreshCards(s, request());
    const inBetween = await generateFreshCards(s, request({ count: 3 }));
    expect(inBetween).toMatchObject({ status: 'ok', accepted: 3 });
    const last = await generateFreshCards(s, request());
    expect(last).toMatchObject({ status: 'ok', accepted: 2, requested: 2, partial: false, quota: { used: 35, remaining: 0 } });
    expect(JSON.parse(upstream.calls.at(-1)!.prompt.split('\n')[1]).count).toBe(2);
  });

  it('rolls over at Bangkok midnight (17:00 UTC), not UTC midnight, and replays old intents', async () => {
    mockUpstream(uniqueBatch);
    clock = new Date('2026-11-06T16:59:00Z'); // 23:59 Bangkok
    const s = await store();
    const lateIntent = request();
    for (let i = 0; i < 6; i++) await generateFreshCards(s, i === 0 ? lateIntent : request());
    await generateFreshCards(s, request());
    expect(await s.cardQuota()).toMatchObject({ day: '2026-11-06', used: 35, resetAt: '2026-11-06T17:00:00.000Z' });
    clock = new Date('2026-11-06T17:00:00Z'); // 00:00 Bangkok next day
    expect(await s.cardQuota()).toMatchObject({ day: '2026-11-07', used: 0, freeRemaining: 5, extraRemaining: 30 });
    expect(await generateFreshCards(s, lateIntent)).toMatchObject({ status: 'ok', replayed: true, accepted: 5 });
    expect(await s.cardQuota()).toMatchObject({ used: 0 });
    expect(await generateFreshCards(s, request())).toMatchObject({ status: 'ok', accepted: 5, quota: { day: '2026-11-07', used: 5, freeRemaining: 0 } });
  });

  it('persists counters and completed results across a fresh process-level store (restart)', async () => {
    const upstream = mockUpstream(uniqueBatch);
    const intent = request();
    const first = await generateFreshCards(await store(), intent);
    vi.resetModules(); // new module graph, as after an app restart; same durable file
    const { connectLocalFoundationStore: reconnect } = await import('@/lib/persistence/sqlite-store.server');
    const { generateFreshCards: regenerate } = await import('@/lib/discovery/fresh-cards.server');
    const after = await reconnect(owner, () => clock);
    expect(await after.cardQuota()).toMatchObject({ used: 5, reserved: 0 });
    const replay = await regenerate(after, intent);
    expect(replay).toMatchObject({ status: 'ok', replayed: true });
    expect(replay.status === 'ok' && replay.cards).toEqual(first.status === 'ok' && first.cards);
    expect(upstream.calls).toHaveLength(1);
  });
});

describe('generateFreshCards (S3) — personalization (MOCKED upstream)', () => {
  it('builds 5 starter ideas from interest + constraints, charges the free allowance, never uses the seed catalog', async () => {
    const upstream = mockUpstream(() => ({ cards: distinctCandidates(5) }));
    const result = await generateFreshCards(await store(), request());
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result).toMatchObject({ source: 'ai', replayed: false, accepted: 5, requested: 5, partial: false,
      rejected: { invalid: 0, unsupportedClaims: 0, repeats: 0 } });
    expect(result.quota).toMatchObject({ used: 5, reserved: 0, freeRemaining: 0, extraRemaining: 30, remaining: 30 });
    const catalogIds = new Set(TOPIC_CARDS.map(c => c.id));
    for (const card of result.cards) {
      expect(catalogIds.has(card.id)).toBe(false);
      expect(card.id).toMatch(/^fresh_[a-f0-9-]{36}$/);
      expect(card.targetGradeLevels).toEqual(['m_ton']);
      expect(card.starter).toMatchObject({ origin: 'ai_fresh', safetyScreen: 'preliminary', noveltyChecked: false, requestId: result.requestId });
      expect(card.phenomenon).toBe(card.starter!.problem);
      expect(card.starter!.roughDirection.length).toBeGreaterThan(0);
    }
    // The prompt is personalized from the learner's own answers and constraints.
    expect(upstream.calls).toHaveLength(1);
    const prompt = upstream.calls[0].prompt;
    expect(prompt).toContain('ชอบเลี้ยงปลากัดและดูแลตู้ปลา');
    expect(prompt).toContain('น้ำในตู้ขุ่นเร็ว');
    expect(prompt).toContain('300');
    expect(prompt).toContain('มือถือ');
    expect(upstream.calls[0].system).toMatch(/ไม่ใช่โครงงานสำเร็จรูป/);
    expect(upstream.calls[0].system).toMatch(/ห้าม.*(แหล่งอ้างอิง|อ้างอิง)/);
  });

  it.each([
    ['unconfigured', 'AI_UNCONFIGURED', () => { vi.stubEnv('AI_BASE_URL', ''); return mockUpstream(() => ({ cards: distinctCandidates(5) })); }],
    ['unreachable', 'AI_UNAVAILABLE', () => mockUpstream(() => new Response('down', { status: 502 }))],
    ['malformed output', 'AI_OUTPUT_UNUSABLE', () => mockUpstream(() => 'this is not json')],
    ['every candidate invalid', 'AI_OUTPUT_UNUSABLE', () => mockUpstream(() => ({ cards: [{ title: 'x' }, candidate({ subfieldId: 'not_a_subfield' })] }))],
  ] as const)('%s → truthful unavailable, no cards, no charge, reservation released', async (_label, code, arrange) => {
    const upstream = arrange();
    const s = await store();
    const result = await generateFreshCards(s, request());
    expect(result).toMatchObject({ status: 'unavailable', code, retryable: true });
    expect('cards' in result).toBe(false);
    expect(result.status === 'unavailable' && result.messageTh).toMatch(/สร้างการ์ด.*ไม่ได้/);
    expect(await s.cardQuota()).toMatchObject({ used: 0, reserved: 0, remaining: 35, freeRemaining: 5 });
    if (code === 'AI_UNCONFIGURED') expect(upstream.calls).toHaveLength(0);
  });

  it('a timed-out model call is unavailable and charges nothing', async () => {
    mockUpstream(() => ({ cards: distinctCandidates(5) }), { delayMs: 200 });
    const s = await store();
    const result = await generateFreshCards(s, request(), { timeoutMs: 20 });
    expect(result).toMatchObject({ status: 'unavailable', code: 'AI_TIMEOUT' });
    expect(await s.cardQuota()).toMatchObject({ used: 0, reserved: 0 });
  });

  it('keeps only valid, claim-free candidates and charges exactly the accepted partial count (no fillers)', async () => {
    mockUpstream(() => ({ cards: [
      ...distinctCandidates(2),
      { title: 'ไม่ครบ' },                                                              // invalid shape
      candidate({ title: 'ไอเดียตัวกรองอากาศ', problem: 'ฝุ่นในห้อง', estimatedWeeks: 500 }), // out of bounds
      candidate({ title: 'กล่องเก็บความเย็นจากโฟม', problem: 'ดูงานวิจัยที่ https://example.org/paper เพื่อยืนยัน' }),
      candidate({ title: 'ระบบเตือนน้ำท่วม', problem: 'เป็นไอเดียใหม่ที่ไม่เคยมีใครทำมาก่อน' }),
      candidate({ title: 'เครื่องวัดเสียงในห้องเรียน', problem: 'ห้องเรียนเสียงดัง', roughDirection: 'ทดลองได้ปลอดภัย 100% ไม่ต้องมีครูดูแล' }),
      candidate({ title: 'สบู่จากน้ำมันใช้แล้ว', problem: 'น้ำมันเหลือทิ้ง', references: ['Smith et al. (2019)'] }),
      candidate({ title: 'Verified original idea: solar dryer', problem: 'fruit spoils quickly', roughDirection: 'compare dryers (doi:10.1000/xyz)' }),
    ] }));
    const s = await store();
    const result = await generateFreshCards(s, request());
    expect(result).toMatchObject({ status: 'ok', accepted: 2, requested: 5, partial: true,
      rejected: { invalid: 2, unsupportedClaims: 5, repeats: 0 } });
    if (result.status !== 'ok') return;
    expect(result.cards.map(c => c.title)).toEqual(distinctCandidates(2).map(c => c.title));
    expect(await s.cardQuota()).toMatchObject({ used: 2, reserved: 0, freeRemaining: 3, remaining: 33 });
    expect(JSON.stringify(result.cards)).not.toMatch(/https?:|doi|et al|references/i);
  });

  it('never accepts more cards than the reserved capacity even if the model returns extra', async () => {
    mockUpstream(() => ({ cards: distinctCandidates(8) }));
    const s = await store();
    const result = await generateFreshCards(s, request({ count: 3 }));
    expect(result).toMatchObject({ status: 'ok', accepted: 3, requested: 3, partial: false, rejected: { invalid: 0, unsupportedClaims: 0, repeats: 0 } });
    expect(await s.cardQuota()).toMatchObject({ used: 3, reserved: 0 });
  });

  it('rejects semantic and exact repeats of already-seen ideas and of each other, charging only unique cards', async () => {
    const roof = candidate({ title: 'ผลของสีหลังคาต่ออุณหภูมิภายในห้อง', problem: 'ห้องเรียนชั้นบนร้อนมากในช่วงบ่าย' });
    mockUpstream(() => ({ cards: [roof] }));
    const s = await store();
    expect(await generateFreshCards(s, request({ count: 1 }))).toMatchObject({ status: 'ok', accepted: 1 });
    mockUpstream(() => ({ cards: [
      candidate({ title: 'สีของหลังคามีผลต่ออุณหภูมิภายในห้องอย่างไร', problem: 'ห้องชั้นบนของโรงเรียนร้อนในตอนบ่าย' }), // paraphrase of seen
      roof,                                                                                                   // exact repeat
      ...distinctCandidates(2),
      { ...distinctCandidates(1)[0], title: distinctCandidates(1)[0].title + ' !' },                           // repeat inside batch
    ] }));
    const second = await generateFreshCards(s, request());
    expect(second).toMatchObject({ status: 'ok', accepted: 2, requested: 5, partial: true, rejected: { repeats: 3, invalid: 0, unsupportedClaims: 0 } });
    expect(await s.cardQuota()).toMatchObject({ used: 3, reserved: 0 });
  });

  it('uses own liked/skipped/seen cards as context without vetoing a subject, and ignores foreign ids', async () => {
    mockUpstream(() => ({ cards: distinctCandidates(3) }));
    const s = await store();
    const first = await generateFreshCards(s, request({ count: 3 }));
    if (first.status !== 'ok') throw Error('setup');
    const foreignStore = await store(`g:${'b'.repeat(64)}`);
    mockUpstream(() => ({ cards: [candidate({ title: 'ไอเดียลับของคนอื่น', problem: 'ไม่ควรรั่วไหลไปยังเจ้าของอื่น' })] }));
    const foreign = await generateFreshCards(foreignStore, request({ count: 1 }));
    if (foreign.status !== 'ok') throw Error('setup');
    const upstream = mockUpstream(() => ({ cards: distinctCandidates(2, 4) }));
    await generateFreshCards(s, request({ count: 2,
      refinement: { text: 'อยากได้แนวที่ใช้มือถือวัดผล', likedCardIds: [first.cards[0].id, foreign.cards[0].id], skippedCardIds: [first.cards[1].id] },
      seenCardIds: [first.cards[2].id, 'fresh_unknown'] }));
    const prompt = upstream.calls[0].prompt;
    const data = JSON.parse(prompt.split('\n')[1]);
    expect(data.likedIdeas.map((x: { title: string }) => x.title)).toEqual([first.cards[0].title]);
    expect(data.skippedIdeas.map((x: { title: string }) => x.title)).toEqual([first.cards[1].title]);
    expect(data.alreadySeenTitles).toEqual(expect.arrayContaining(first.cards.map(c => c.title)));
    expect(data.refinement).toBe('อยากได้แนวที่ใช้มือถือวัดผล');
    expect(prompt).not.toContain('ไอเดียลับของคนอื่น');
    expect(prompt).toMatch(/ยังเสนอสาขาเดียวกันได้/);
  });

  it('redacts contact details from learner text before it reaches the model', async () => {
    const upstream = mockUpstream(() => ({ cards: distinctCandidates(1) }));
    await generateFreshCards(await store(), request({ count: 1, interest: { answers: [
      { question: 'สนใจอะไร', answer: 'ติดต่อหนูที่ 081-234-5678 หรือ me@example.com ชอบหุ่นยนต์' }] } }));
    expect(upstream.calls[0].prompt).not.toMatch(/081-234-5678|me@example\.com/);
    expect(upstream.calls[0].prompt).toContain('ชอบหุ่นยนต์');
  });

  it('marks keyword-screened safety categories as preliminary, without blocking the idea', async () => {
    mockUpstream(() => ({ cards: [candidate({ title: 'ผลของน้ำหมักต่อความใสของน้ำในตู้ปลากัด', problem: 'ตู้ปลากัดขุ่นเร็ว ต้องเปลี่ยนน้ำบ่อย',
      roughDirection: 'เลี้ยงปลากัดในตู้ทดลองหลายตู้ เปรียบเทียบความขุ่นของน้ำ', safetyConcerns: [] })] }));
    const result = await generateFreshCards(await store(), request({ count: 1 }));
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.cards[0].safetyCategories).toContain('vertebrate_animals');
    expect(result.cards[0].starter!.safetyScreen).toBe('preliminary');
  });
});
