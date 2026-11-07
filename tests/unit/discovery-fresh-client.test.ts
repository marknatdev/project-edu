import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestFreshCards, fetchCardQuota } from '@/lib/discovery/fresh-client';
import type { FreshCardsRequest } from '@/lib/discovery/fresh-contract';

/** Browser transport only. The server responses below are hand-written fixtures. */
const body = { requestId: '11111111-1111-4111-8111-111111111111', count: 5,
  learner: { gradeLevel: 'm_ton', constraints: { timeWeeks: 4, budgetBaht: 300, equipment: [], teamSize: 1, skills: [] } },
  interest: { answers: [{ question: 'สนใจอะไร', answer: 'ยังไม่รู้' }] }, seenCardIds: [] } as FreshCardsRequest;
const quota = { day: '2026-11-06', used: 0, reserved: 0, remaining: 35, freeRemaining: 5, extraRemaining: 30, resetAt: '2026-11-06T17:00:00.000Z' };
const respond = (status: number, payload: unknown) => vi.fn(async () => new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('fresh-card browser transport (D3)', () => {
  it('posts the exact stored body same-origin and returns the server union unchanged', async () => {
    const unavailable = { status: 'unavailable', code: 'AI_UNCONFIGURED', requestId: body.requestId, retryable: true, quota, messageTh: 'ยังไม่ได้เชื่อมต่อบริการ AI' };
    const fetcher = respond(503, unavailable);
    expect(await requestFreshCards(body, fetcher)).toEqual(unavailable);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/discovery/cards');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', cache: 'no-store' });
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('never turns an invalid "ok" payload into cards', async () => {
    const result = await requestFreshCards(body, respond(200, { status: 'ok', cards: [{ id: 'x', title: 'แค่ชื่อ' }], quota }));
    expect(result.status).toBe('http_error');
    expect('cards' in result).toBe(false);
  });

  it('reports network failures and non-JSON errors truthfully as retryable (same intent)', async () => {
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    expect(await requestFreshCards(body, offline)).toMatchObject({ status: 'network_error' });
    const persistence = await requestFreshCards(body, respond(503, { error: 'PERSISTENCE_UNAVAILABLE', messageTh: 'ระบบบันทึกโควตาและการ์ดยังไม่พร้อม' }));
    expect(persistence).toEqual({ status: 'http_error', httpStatus: 503, messageTh: 'ระบบบันทึกโควตาและการ์ดยังไม่พร้อม' });
    const html = await requestFreshCards(body, respond(502, '<html>bad gateway</html>'));
    expect(html).toMatchObject({ status: 'http_error', httpStatus: 502 });
    expect((html as { messageTh: string }).messageTh).toMatch(/ไม่ได้ใช้โควตา|ยังอยู่/);
  });

  it('reads the real daily allowance without generating', async () => {
    const fetcher = respond(200, { quota });
    expect(await fetchCardQuota(fetcher)).toEqual(quota);
    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]).toMatchObject({ method: 'GET' });
    expect(await fetchCardQuota(respond(503, { error: 'PERSISTENCE_UNAVAILABLE' }))).toBeNull();
  });
});
