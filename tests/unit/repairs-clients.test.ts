import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEvaluation } from '@/lib/evaluation/eval-client';
import { openPivot, advancePivot } from '@/lib/pivot/pivot-client';
import { checkProposalQuota, consumeProposalQuota } from '@/lib/proposal/quota-client';
import { ideaFixture } from '../fixtures/repairs';

// Browser client seam: what leaves the browser and how server answers are
// surfaced. fetch is stubbed with server-contract responses (no real server).
afterEach(() => { vi.unstubAllGlobals(); });
function captureFetch(status: number, body: object) {
  const calls: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: init.body ? JSON.parse(String(init.body)) : {} });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }));
  return calls;
}
const pivotView = { id: '6f1c2b8e-8f7b-4e43-9d0e-6a9a3f1b2c3d', revision: 1, axis: 'feasibility', unlockedTiers: [1], tier1Prompt: 'คำถาม', source: 'fallback' };

describe('DEF-04 browser clients never send a quota identity', () => {
  it('evaluation sends only the idea with same-origin credentials and distinguishes quota from rate limiting', async () => {
    const calls = captureFetch(429, { error: 'QUOTA_EXCEEDED', messageTh: 'ครบ 5 ครั้ง', quota: { used: 5, limit: 5, remaining: 0, resetAt: '2026-11-06T17:00:00.000Z' } });
    const quota = await fetchEvaluation({ idea: ideaFixture() });
    expect(calls[0].body).not.toHaveProperty('anonymousId');
    expect(calls[0].init.credentials).toBe('same-origin');
    expect(quota).toMatchObject({ success: false, quotaExceeded: true });
    captureFetch(429, { error: 'RATE_LIMITED', messageTh: 'ถี่เกินไป' });
    const rate = await fetchEvaluation({ idea: ideaFixture() });
    expect(rate).toMatchObject({ success: false, quotaExceeded: false, error: 'ถี่เกินไป' });
  });

  it('proposal allowance is read and consumed on the server with an idempotency key, not a browser counter', async () => {
    const calls = captureFetch(200, { success: true, allowed: true, remaining: 1, limit: 2, resetAt: '2026-11-06T17:00:00.000Z' });
    await checkProposalQuota();
    const consumed = await consumeProposalQuota();
    expect(calls.map(c => c.url)).toEqual(['/api/ai/proposal', '/api/ai/proposal']);
    expect(calls[0].body).toEqual({ action: 'check' });
    expect(calls[1].body.action).toBe('consume');
    expect(String(calls[1].body.requestId)).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(calls)).not.toContain('anonymousId');
    expect(consumed).toMatchObject({ allowed: true, remaining: 1 });
  });

  it('an unreachable proposal server is reported as unavailable, never as a fresh allowance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const status = await consumeProposalQuota();
    expect(status).toMatchObject({ allowed: false, unavailable: true });
    expect(status.messageTh).toBeTruthy();
  });
});

describe('DEF-02 Pivot client carries no client progression', () => {
  it('open/advance send only action, idea/axis or pivot id+revision+answer', async () => {
    const calls = captureFetch(200, { pivot: pivotView });
    const opened = await openPivot({ idea: ideaFixture(), axis: 'feasibility' });
    expect(opened).toMatchObject({ ok: true, pivot: { unlockedTiers: [1] } });
    await advancePivot({ pivot: pivotView as never, requestedTier: 2, learnerResponse: 'คำตอบ' });
    expect(Object.keys(calls[0].body).sort()).toEqual(['action', 'axis', 'idea']);
    expect(Object.keys(calls[1].body).sort()).toEqual(['action', 'learnerResponse', 'pivotId', 'requestId', 'requestedTier', 'revision']);
    expect(JSON.stringify(calls)).not.toMatch(/unlockedTiers|anonymousId/);
  });

  it('a locked tier returns the authoritative server state for resync', async () => {
    captureFetch(409, { error: 'TIER_LOCKED', messageTh: 'ตอบระดับ 1 ก่อน', pivot: pivotView });
    const locked = await advancePivot({ pivot: pivotView as never, requestedTier: 3 });
    expect(locked).toMatchObject({ ok: false, kind: 'locked', messageTh: 'ตอบระดับ 1 ก่อน', pivot: { unlockedTiers: [1] } });
  });

  it('offline never fabricates server progression or Tier 3 examples', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const result = await advancePivot({ pivot: { ...pivotView, unlockedTiers: [1, 2] } as never, requestedTier: 3 });
    expect(result).toMatchObject({ ok: false, kind: 'offline' });
    expect(JSON.stringify(result)).not.toContain('tier3Examples');
  });
});
