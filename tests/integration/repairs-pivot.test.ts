import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST as pivotPOST } from '@/app/api/ai/pivot/route';
import { POST as proposalPOST } from '@/app/api/ai/proposal/route';
import { GET as evaluateGET } from '@/app/api/ai/evaluate/route';
import { cookieJar, ideaFixture } from '../fixtures/repairs';

// DEF-02/03 public seam: real /api/ai/pivot handler + durable local adapter.
// AI unconfigured => deterministic server guidance labelled 'fallback'.
let dir: string;
beforeEach(() => {
  dir = resolve('.local/repairs-tests', crypto.randomUUID());
  mkdirSync(dir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
  vi.stubEnv('AI_BASE_URL', '');
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

type Jar = ReturnType<typeof cookieJar>;
const pivot = (jar: Jar, body: object) => jar.send(pivotPOST, '/api/ai/pivot', { body });
const open = (jar: Jar, axis = 'feasibility', idea = ideaFixture()) => pivot(jar, { action: 'open', idea, axis });
const turn = (jar: Jar, current: { id: string; revision: number }, extra: object) =>
  pivot(jar, { action: 'turn', pivotId: current.id, revision: current.revision, requestId: crypto.randomUUID(), ...extra });

describe('DEF-02 Pivot tiers are server authority bound to owner + idea', () => {
  it('rejects client-asserted unlockedTiers, tier and anonymousId fields', async () => {
    const jar = cookieJar();
    for (const forged of [
      { anonymousId: 'guest_user', idea: ideaFixture(), redAxes: ['feasibility'], tier: 3, unlockedTiers: [1, 2] },
      { action: 'open', idea: ideaFixture(), axis: 'feasibility', unlockedTiers: [1, 2, 3] },
    ]) {
      const response = await pivot(jar, forged);
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.data)).not.toContain('tier3Examples');
    }
  });

  it('opens at Tier 1 only and refuses Tier 3 or an unanswered Tier 2 request', async () => {
    const jar = cookieJar();
    const opened = await open(jar);
    expect(opened.status).toBe(200);
    expect(opened.data.pivot).toMatchObject({ unlockedTiers: [1], axis: 'feasibility' });
    expect(opened.data.pivot.tier1Prompt).toBeTruthy();
    expect(opened.data.pivot.tier3Examples).toBeUndefined();
    const jump = await turn(jar, opened.data.pivot, { requestedTier: 3 });
    expect(jump.status).toBe(409);
    expect(jump.data.error).toBe('TIER_LOCKED');
    expect(jump.data.pivot.tier3Examples).toBeUndefined();
    const unanswered = await turn(jar, opened.data.pivot, { requestedTier: 2, learnerResponse: '   ' });
    expect(unanswered.status).toBe(409);
    expect(unanswered.data.pivot.unlockedTiers).toEqual([1]);
  });

  it('allows the legitimate answer -> hint -> examples progression and resumes it after reload', async () => {
    const jar = cookieJar();
    const opened = await open(jar);
    const hint = await turn(jar, opened.data.pivot, { requestedTier: 2, learnerResponse: 'ยังคิดไม่ออกว่าจะลดงบอย่างไร' });
    expect(hint.status).toBe(200);
    expect(hint.data.pivot.unlockedTiers).toEqual([1, 2]);
    expect(hint.data.pivot.tier2Lenses.length).toBeGreaterThan(0);
    expect(hint.data.pivot.source).toBe('fallback');
    const examples = await turn(jar, hint.data.pivot, { requestedTier: 3 });
    expect(examples.status).toBe(200);
    expect(examples.data.pivot.unlockedTiers).toEqual([1, 2, 3]);
    expect(examples.data.pivot.tier3Examples.length).toBeGreaterThanOrEqual(2);
    const resumed = await open(jar);
    expect(resumed.data.pivot).toMatchObject({ id: opened.data.pivot.id, unlockedTiers: [1, 2, 3] });
    // Each axis is its own progression.
    expect((await open(jar, 'novelty')).data.pivot.unlockedTiers).toEqual([1]);
  });

  it('isolates owners: another browser cannot advance or read a pivot by its id', async () => {
    const a = cookieJar(), b = cookieJar();
    const opened = await open(a);
    const hint = await turn(a, opened.data.pivot, { requestedTier: 2, learnerResponse: 'ลองใช้ขวดพลาสติก' });
    const stolen = await turn(b, hint.data.pivot, { requestedTier: 3 });
    expect(stolen.status).toBe(404);
    expect(stolen.data.pivot).toBeUndefined();
    const own = await open(b);
    expect(own.data.pivot.id).not.toBe(opened.data.pivot.id);
    expect(own.data.pivot.unlockedTiers).toEqual([1]);
  });

  it('binds progression to the idea content: edited idea text starts again at Tier 1', async () => {
    const jar = cookieJar();
    const opened = await open(jar);
    await turn(jar, opened.data.pivot, { requestedTier: 2, learnerResponse: 'ตอบแล้ว' });
    const edited = await open(jar, 'feasibility', ideaFixture({ description: 'คำอธิบายใหม่ที่ต่างไปจากเดิมทั้งหมด' }));
    expect(edited.data.pivot.id).not.toBe(opened.data.pivot.id);
    expect(edited.data.pivot.unlockedTiers).toEqual([1]);
  });

  it('rejects a stale revision and replays a duplicated requestId without a second step', async () => {
    const jar = cookieJar();
    const opened = await open(jar);
    const requestId = crypto.randomUUID();
    const body = { action: 'turn', pivotId: opened.data.pivot.id, revision: 1, requestId, requestedTier: 2, learnerResponse: 'ตอบ' };
    const first = await pivot(jar, body);
    const replay = await pivot(jar, body);
    expect(replay.status).toBe(200);
    expect(replay.data.pivot.revision).toBe(first.data.pivot.revision);
    const stale = await turn(jar, opened.data.pivot, { requestedTier: 3 });
    expect(stale.status).toBe(409);
    expect(stale.data.pivot.revision).toBe(first.data.pivot.revision);
  });
});

describe('DEF-03 Pivot never consumes evaluation or proposal allowances', () => {
  it('full progression on several axes leaves 2 proposals and 5 evaluations; exhausted proposals do not block Pivot', async () => {
    const jar = cookieJar();
    for (const axis of ['feasibility', 'novelty', 'rigor']) {
      const opened = await open(jar, axis);
      const hint = await turn(jar, opened.data.pivot, { requestedTier: 2, learnerResponse: 'ลองคิดแล้ว' });
      expect((await turn(jar, hint.data.pivot, { requestedTier: 3 })).status).toBe(200);
    }
    expect((await jar.send(proposalPOST, '/api/ai/proposal', { body: { action: 'check' } })).data).toMatchObject({ remaining: 2, limit: 2 });
    expect((await jar.send(evaluateGET, '/api/ai/evaluate', { method: 'GET' })).data.quota).toMatchObject({ used: 0, remaining: 5 });
    for (let i = 0; i < 2; i++) await jar.send(proposalPOST, '/api/ai/proposal', { body: { action: 'consume', requestId: crypto.randomUUID() } });
    expect((await open(jar, 'impact')).status).toBe(200);
  });

  it('has its own per-owner rate control that never touches the proposal allowance', async () => {
    const jar = cookieJar();
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) statuses.push((await open(jar, 'fit', ideaFixture({ id: `idea-rate-${i}` }))).status);
    expect(statuses.slice(0, 12).every(s => s === 200)).toBe(true);
    expect(statuses[12]).toBe(429);
    expect((await jar.send(proposalPOST, '/api/ai/proposal', { body: { action: 'check' } })).data.remaining).toBe(2);
  });
});
