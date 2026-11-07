import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST, GET } from '@/app/api/ai/evaluate/route';
import { cookieJar, ideaFixture } from '../fixtures/repairs';

// DEF-04 public seam: real /api/ai/evaluate handler + durable local adapter.
// AI is deliberately unconfigured (deterministic server fallback, NOT live AI).
let dir: string;
beforeEach(() => {
  dir = resolve('.local/repairs-tests', crypto.randomUUID());
  mkdirSync(dir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
  vi.stubEnv('AI_BASE_URL', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); rmSync(dir, { recursive: true, force: true }); });

const evaluate = (jar: ReturnType<typeof cookieJar>, body: object = { idea: ideaFixture() }) => jar.send(POST, '/api/ai/evaluate', { body });

describe('DEF-04 evaluation quota is bound to the server-verified owner', () => {
  it('rejects a caller-chosen anonymousId instead of using it as the quota identity', async () => {
    const jar = cookieJar();
    const forged = await evaluate(jar, { anonymousId: 'guest', idea: ideaFixture() });
    expect(forged.status).toBe(400);
    expect(forged.data.evaluation).toBeUndefined();
  });

  it('gives two independent browsers their own 5/day allowance (no shared guest pool)', async () => {
    const a = cookieJar(), b = cookieJar();
    for (let i = 0; i < 5; i++) expect((await evaluate(a)).status).toBe(200);
    const sixth = await evaluate(a);
    expect(sixth.status).toBe(429);
    expect(sixth.data.error).toBe('QUOTA_EXCEEDED');
    const other = await evaluate(b);
    expect(other.status).toBe(200);
    expect(other.data.quota).toMatchObject({ used: 1, limit: 5, remaining: 4 });
    expect(a.cookie).not.toBe(b.cookie);
  });

  it('GET reports only the caller\'s own allowance; ?anonymousId cannot read or select another pool', async () => {
    const a = cookieJar(), b = cookieJar();
    await evaluate(a); await evaluate(a);
    const own = await a.send(GET, '/api/ai/evaluate', { method: 'GET' });
    expect(own.data.quota).toMatchObject({ used: 2, remaining: 3, limit: 5 });
    await evaluate(b);
    const probe = await b.send(GET, '/api/ai/evaluate?anonymousId=guest', { method: 'GET' });
    expect(probe.data.quota).toMatchObject({ used: 1, remaining: 4 });
  });

  it('refuses a forged Guest capability cookie and clears it instead of charging anyone', async () => {
    const jar = cookieJar();
    jar.cookie = 'edu-coaching-owner=' + 'z'.repeat(64);
    const forged = await evaluate(jar);
    expect(forged.status).toBe(401);
    expect(forged.set).toMatch(/Max-Age=0/i);
  });

  it('resets the allowance at Bangkok midnight, not per request or per idea', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-06T16:59:00Z')); // 23:59 Asia/Bangkok
    const jar = cookieJar();
    for (let i = 0; i < 5; i++) expect((await evaluate(jar, { idea: ideaFixture({ id: `idea-${i}` }) })).status).toBe(200);
    const blocked = await evaluate(jar, { idea: ideaFixture({ id: 'idea-new' }) });
    expect(blocked.status).toBe(429);
    expect(blocked.data.resetAt).toBe('2026-11-06T17:00:00.000Z');
    vi.setSystemTime(new Date('2026-11-06T17:01:30Z')); // 00:01 next Bangkok day (new rate window too)
    const nextDay = await evaluate(jar);
    expect(nextDay.status).toBe(200);
    expect(nextDay.data.quota).toMatchObject({ used: 1, remaining: 4 });
  });
});
