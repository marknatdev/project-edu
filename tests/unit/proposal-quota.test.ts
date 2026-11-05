import { describe, it, expect, beforeEach } from 'vitest';
import {
  quotaStore,
  DAILY_LIMITS,
  getQuotaExceededMessage,
} from '@/lib/ai/quota';
import {
  checkProposalQuota,
  consumeProposalQuota,
} from '@/lib/proposal/quota-client';

describe('Proposal Quota Enforcement (2/day, ADR 0001 & ADR 0002)', () => {
  const learnerId = 'learner-quota-test-01';

  beforeEach(async () => {
    // Reset quotaStore state
    await quotaStore.reset();
  });

  describe('Seam 1: Daily Limit & Consumption Rules', () => {
    it('configures daily proposal quota limit to exactly 2', () => {
      expect(DAILY_LIMITS.proposal).toBe(2);
    });

    it('allows 2 generations per day, then strictly blocks the 3rd with polite Thai notice', async () => {
      // Check initial quota without consuming
      const initial = await checkProposalQuota(learnerId);
      expect(initial.allowed).toBe(true);
      expect(initial.remaining).toBe(2);
      expect(initial.limit).toBe(2);

      // 1st generation consumes 1
      const first = await consumeProposalQuota(learnerId);
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(1);

      // 2nd generation consumes 1
      const second = await consumeProposalQuota(learnerId);
      expect(second.allowed).toBe(true);
      expect(second.remaining).toBe(0);

      // 3rd generation must be blocked
      const third = await consumeProposalQuota(learnerId);
      expect(third.allowed).toBe(false);
      expect(third.remaining).toBe(0);
      expect(third.messageTh).toContain('ครบ 2 ครั้งแล้ว');
      expect(third.messageTh).toBe(getQuotaExceededMessage('proposal'));
    });

    it('viewing existing proposals and manual editing never consume quota', async () => {
      // Check status repeatedly
      await checkProposalQuota(learnerId);
      await checkProposalQuota(learnerId);
      const status = await checkProposalQuota(learnerId);

      // Remaining must still be full (2)
      expect(status.remaining).toBe(2);
    });

    it('resets quota on next day in Asia/Bangkok time', async () => {
      // Day 1
      const day1 = new Date('2026-11-05T10:00:00.000Z');
      await quotaStore.consume(learnerId, 'proposal', 1, day1);
      await quotaStore.consume(learnerId, 'proposal', 1, day1);

      const exhausted = await quotaStore.check(learnerId, 'proposal', day1);
      expect(exhausted.remaining).toBe(0);

      // Day 2 (after midnight in Bangkok)
      const day2 = new Date('2026-11-06T01:00:00.000Z');
      const resetRemaining = await quotaStore.check(learnerId, 'proposal', day2);
      expect(resetRemaining.remaining).toBe(2);

      const day2Attempt = await quotaStore.consume(learnerId, 'proposal', 1, day2);
      expect(day2Attempt.allowed).toBe(true);
      expect(day2Attempt.record.remaining).toBe(1);
    });
  });
});
