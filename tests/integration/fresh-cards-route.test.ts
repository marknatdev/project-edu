import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST, GET } from '@/app/api/discovery/cards/route';
import { mockUpstream, syntheticDistinct } from '../fixtures/fresh-cards';

// S4: the real route handler over the local durable adapter. Upstream model is
// a MOCKED fetch (fixtures/fresh-cards.ts) — NOT live AI evidence.
let dir: string;
beforeEach(() => {
  dir = resolve('.local/fresh-cards-route-tests', crypto.randomUUID());
  mkdirSync(dir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
  vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1');
  vi.stubEnv('AI_API_KEY', 'synthetic-test-key');
  vi.stubEnv('AI_MODEL', 'mock-model');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); rmSync(dir, { recursive: true, force: true }); });

const body = (extra: Record<string, unknown> = {}) => ({
  requestId: crypto.randomUUID(),
  learner: { gradeLevel: 'm_ton', constraints: { timeWeeks: 4, budgetBaht: 200, equipment: ['มือถือ'], teamSize: 1, skills: [] } },
  interest: { answers: [{ question: 'อยากทำเรื่องอะไร', answer: 'ยังไม่รู้ แต่ชอบแมว' }] },
  ...extra,
});
function client() {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async post(payload: unknown, headers: Record<string, string> = {}) {
      const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const response = await POST(new Request('http://localhost/api/discovery/cards', { method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: raw }));
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
      return { response, data: await response.json() };
    },
    async quota() {
      const response = await GET(new Request('http://localhost/api/discovery/cards', { headers: cookie ? { cookie } : {} }));
      return { response, data: await response.json() };
    },
  };
}

describe('POST/GET /api/discovery/cards (S4)', () => {
  it('generates for a server-issued guest owner and reports the real remaining allowance', async () => {
    mockUpstream(() => ({ cards: syntheticDistinct(5) }));
    const c = client();
    const { response, data } = await c.post(body());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(c.cookie).toMatch(/^edu-coaching-owner=/);
    expect(data).toMatchObject({ status: 'ok', source: 'ai', accepted: 5, quota: { used: 5, freeRemaining: 0, extraRemaining: 30 } });
    expect(data.noticeTh).toMatch(/ไม่รับรองว่าไม่มีใครทำมาก่อน/);
    expect((await c.quota()).data).toMatchObject({ quota: { used: 5, remaining: 30 } });
    // A different browser (no capability) has its own allowance.
    expect((await client().quota()).data).toMatchObject({ quota: { used: 0, remaining: 35 } });
  });

  it.each([
    ['caller-chosen identity', body({ anonymousId: 'victim' })],
    ['unknown field', body({ verified: true })],
    ['too many interest answers', body({ interest: { answers: Array(5).fill({ question: 'q', answer: 'a' }) } })],
    ['over-long answer', body({ interest: { answers: [{ question: 'q', answer: 'ก'.repeat(501) }] } })],
    ['empty answer', body({ interest: { answers: [{ question: 'q', answer: '   ' }] } })],
    ['count above 5', body({ count: 6 })],
    ['non-uuid request id', body({ requestId: 'retry-1' })],
    ['injected seen id', body({ seenCardIds: ['<script>'] })],
    ['too many seen ids', body({ seenCardIds: Array.from({ length: 101 }, (_, i) => `fresh_${i}`) })],
  ])('rejects %s with 400 and calls no model', async (_label, payload) => {
    const upstream = mockUpstream(() => ({ cards: syntheticDistinct(5) }));
    expect((await client().post(payload)).response.status).toBe(400);
    expect(upstream.calls).toHaveLength(0);
  });

  it('rejects oversized bodies, malformed JSON and cross-site requests', async () => {
    const upstream = mockUpstream(() => ({ cards: syntheticDistinct(5) }));
    expect((await client().post(JSON.stringify(body({ pad: 'x'.repeat(17_000) })))).response.status).toBe(413);
    expect((await client().post('{not json')).response.status).toBe(400);
    expect((await client().post(body(), { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' })).response.status).toBe(403);
    expect(upstream.calls).toHaveLength(0);
  });

  it('maps outcomes to honest HTTP statuses and keeps learner text out of logs', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockUpstream(() => new Response('echo: ยังไม่รู้ แต่ชอบแมว', { status: 500 }));
    const c = client();
    const failed = body();
    const unavailable = await c.post(failed);
    expect(unavailable.response.status).toBe(503);
    expect(unavailable.data).toMatchObject({ status: 'unavailable', code: 'AI_UNAVAILABLE', retryable: true, quota: { used: 0 } });
    expect((await c.post(failed)).response.status).toBe(409); // failed intent: ask for a new request id
    vi.stubEnv('AI_BASE_URL', '');
    const unconfigured = await c.post(body());
    expect(unconfigured.response.status).toBe(503);
    expect(unconfigured.data).toMatchObject({ code: 'AI_UNCONFIGURED' });
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls, ...log.mock.calls]);
    expect(logged).not.toContain('ชอบแมว');
    expect(logged).not.toContain('synthetic-test-key');
  });

  it('refuses a tampered guest capability without granting a fresh allowance silently', async () => {
    mockUpstream(() => ({ cards: syntheticDistinct(5) }));
    const { response } = await client().post(body(), { cookie: 'edu-coaching-owner=not-a-valid-capability' });
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toMatch(/edu-coaching-owner=;/);
  });

  it('a generated (non-catalog) card is accepted as coaching context with its starter metadata intact', async () => {
    mockUpstream(() => ({ cards: syntheticDistinct(1) }));
    const c = client();
    const { data } = await c.post(body({ count: 1 }));
    const card = data.cards[0];
    vi.stubEnv('AI_BASE_URL', ''); // coaching's documented offline guidance (not live AI)
    const { POST: coach } = await import('@/app/api/ai/coach/route');
    const response = await coach(new Request('http://localhost/api/ai/coach', { method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: c.cookie },
      body: JSON.stringify({ action: 'open', topicKey: `card:${card.id}`, context: { track: 'discovery_track', gradeLevel: 'm_ton', goal: 'ysc', topicCard: card } }) }));
    expect(response.status).toBe(200);
    const opened = await response.json();
    expect(opened.conversation.context.topicCard).toEqual(card);
    expect(opened.conversation.context.topicCard.starter.noveltyChecked).toBe(false);
  });

  it('applies a per-owner admission limit before any model call', async () => {
    const upstream = mockUpstream(() => ({ cards: syntheticDistinct(1) }));
    const c = client();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await c.post(body({ count: 1 }))).response.status);
    expect(statuses.slice(0, 6)).toEqual(Array(6).fill(200));
    expect(statuses[6]).toBe(429);
    expect(upstream.calls).toHaveLength(6);
  });
});
