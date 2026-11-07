import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as coach } from '@/app/api/ai/coach/route';
import { POST as cards } from '@/app/api/ai/cards/generate/route';
import { POST as evaluate } from '@/app/api/ai/evaluate/route';
import { POST as proposal } from '@/app/api/ai/proposal/route';
import { POST as pivot } from '@/app/api/ai/pivot/route';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ideaFixture } from '../fixtures/repairs';
import { POST as freshCards } from '@/app/api/discovery/cards/route';
afterEach(() => { vi.unstubAllEnvs(); });
describe('production/serverless missing authority fails closed', () => {
  it('rejects oversized collections before Zod validation on every repaired public JSON boundary', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('APP_ORIGIN', 'https://app.test');
    const body = JSON.stringify({ items: Array.from({ length: 40_000 }, () => null) });
    for (const handler of [coach, evaluate, proposal, pivot, freshCards]) {
      const r = await handler(new Request('https://app.test/api/test', { method: 'POST', headers: { origin: 'https://app.test' }, body }));
      expect(r.status).toBe(413);
      expect(r.headers.get('set-cookie')).toBeNull();
    }
  });

  it('never opens SQLite when cloud configuration is missing', async () => {
    const db = resolve('.local/foundation-tests', crypto.randomUUID() + '.sqlite');
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('COACH_DB_PATH', db);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', ''); vi.stubEnv('APP_GUEST_SECRET', 'synthetic-test-signing-key-long-enough-012345');
    const response = await coach(new Request('https://app.test/api/ai/coach', { method: 'POST', body: JSON.stringify({ action: 'open', topicKey: 'test', context: { track: 'idea_track', gradeLevel: 'm_plai', goal: 'ysc' } }) }));
    expect(response.status).toBe(503); expect(existsSync(db)).toBe(false);
  });
  it('keeps legacy cards gated and repaired owner-bound endpoints fail closed without cloud credentials', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('APP_ORIGIN', 'https://app.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const legacy = await cards(new Request('https://app.test/api/ai/cards/generate', { method: 'POST', body: '{}' }));
    expect(legacy.status).toBe(503);
    for (const [handler, body] of [[evaluate, { idea: ideaFixture() }], [proposal, { action: 'check' }], [pivot, { action: 'open', idea: ideaFixture(), axis: 'rigor' }]] as const) {
      const response = await handler(new Request('https://app.test/api/ai/test', { method: 'POST', headers: { origin: 'https://app.test' }, body: JSON.stringify(body) }));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: 'PERSISTENCE_UNAVAILABLE' });
    }
  });
});
