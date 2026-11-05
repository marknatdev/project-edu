import {
  quotaStore,
  DAILY_LIMITS,
  getQuotaExceededMessage,
} from '@/lib/ai/quota';

export interface ProposalQuotaStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  messageTh?: string;
}

/**
 * Checks the learner's remaining proposal quota for today without consuming it.
 * Viewing existing proposals and manual editing never consume quota.
 */
export async function checkProposalQuota(
  anonymousId: string,
  now?: Date
): Promise<ProposalQuotaStatus> {
  const record = await quotaStore.check(anonymousId, 'proposal', now);
  const allowed = record.remaining > 0;

  return {
    allowed,
    remaining: record.remaining,
    limit: DAILY_LIMITS.proposal,
    resetAt: record.resetAt,
    messageTh: allowed ? undefined : getQuotaExceededMessage('proposal'),
  };
}

/**
 * Consumes 1 unit of proposal generation quota for today.
 * Triggered only when generating / re-assembling a proposal from answers.
 */
export async function consumeProposalQuota(
  anonymousId: string,
  now?: Date
): Promise<ProposalQuotaStatus> {
  const result = await quotaStore.consume(anonymousId, 'proposal', 1, now);

  return {
    allowed: result.allowed,
    remaining: result.record.remaining,
    limit: DAILY_LIMITS.proposal,
    resetAt: result.record.resetAt,
    messageTh: result.allowed ? undefined : getQuotaExceededMessage('proposal'),
  };
}
