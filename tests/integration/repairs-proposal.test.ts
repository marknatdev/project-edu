import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST } from '@/app/api/ai/proposal/route';
import { cookieJar } from '../fixtures/repairs';

// DEF-04 public seam: real /api/ai/proposal handler + durable local adapter.
let dir: string;
beforeEach(() => {
  dir = resolve('.local/repairs-tests', crypto.randomUUID());
  mkdirSync(dir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
const proposal = (jar: ReturnType<typeof cookieJar>, body: object) => jar.send(POST, '/api/ai/proposal', { body });

describe('DEF-04 proposal allowance is server-bound (2/day per verified owner)', () => {
  it('rejects a caller-chosen anonymousId', async () => {
    const forged = await proposal(cookieJar(), { anonymousId: 'guest-learner', action: 'check' });
    expect(forged.status).toBe(400);
  });

  it('allows exactly two consumptions per owner; a second browser keeps its own two', async () => {
    const a = cookieJar(), b = cookieJar();
    expect((await proposal(a, { action: 'check' })).data).toMatchObject({ allowed: true, remaining: 2, limit: 2 });
    expect((await proposal(a, { action: 'consume', requestId: crypto.randomUUID() })).data).toMatchObject({ allowed: true, remaining: 1 });
    expect((await proposal(a, { action: 'consume', requestId: crypto.randomUUID() })).data).toMatchObject({ allowed: true, remaining: 0 });
    const third = await proposal(a, { action: 'consume', requestId: crypto.randomUUID() });
    expect(third.status).toBe(429);
    expect(third.data).toMatchObject({ allowed: false, error: 'QUOTA_EXCEEDED' });
    expect((await proposal(b, { action: 'check' })).data).toMatchObject({ allowed: true, remaining: 2 });
  });

  it('a retried consume with the same requestId is charged once', async () => {
    const jar = cookieJar(), requestId = crypto.randomUUID();
    await proposal(jar, { action: 'consume', requestId });
    const retry = await proposal(jar, { action: 'consume', requestId });
    expect(retry.data).toMatchObject({ allowed: true, remaining: 1 });
    expect((await proposal(jar, { action: 'check' })).data.remaining).toBe(1);
  });
});
