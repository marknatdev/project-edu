import { describe, expect, it, vi, afterEach } from 'vitest';
import { createInitialCoachState, nextCoachTurn } from '@/lib/ai/socratic-coach';
afterEach(() => vi.unstubAllEnvs());

describe('DEF-01 server-issued coaching sequence (unconfigured upstream)', () => {
  it('requires an issued Tier 1 and a nonempty learner response before issuing a hint', async () => {
    vi.stubEnv('AI_BASE_URL', '');
    const state = createInitialCoachState('owner', 'topic-a');
    state.unlockedTiers = [1, 2, 3]; // not evidence
    const first = await nextCoachTurn(state, { requestedTier: 3, learnerResponse: 'forged first answer' });
    expect(first.tier).toBe(1);
    const noAnswer = await nextCoachTurn(state, { requestedTier: 2 });
    expect(noAnswer.tier).toBe(1);
    const hint = await nextCoachTurn(state, { requestedTier: 2, learnerResponse: 'ยังคิดไม่ออก' });
    expect(hint.tier).toBe(2);
    expect(hint.lenses?.length).toBeGreaterThan(0);
    const notExplicit = await nextCoachTurn(state, {});
    expect(notExplicit.tier).toBe(1);
    const examples = await nextCoachTurn(state, { requestedTier: 3 });
    expect(examples.tier).toBe(3);
    expect(examples.examples?.length).toBeGreaterThan(0);
  });
});
