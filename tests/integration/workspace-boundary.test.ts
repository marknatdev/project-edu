import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { POST } from '@/app/api/ai/coach/route';
import { authCookie, authUser } from '../fixtures/auth';
import { connectLocalFoundationStore } from '@/lib/persistence/sqlite-store.server';
import { GET as sessionStatus } from '@/app/auth/session/route';
import { createMemoryStorage, scopedStorage, saveIdea, getIdea } from '@/lib/storage/store';
import { ideaFixture } from '../fixtures/repairs';
import { conversationFixture } from '../fixtures/coaching';
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(resolve(tmpdir(), 'import-boundary-')); vi.stubEnv('COACH_DB_PATH', resolve(dir, 'test.sqlite'));
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ppctndzkerwiokjfaklw.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'synthetic');
  vi.stubEnv('APP_ORIGIN', 'https://app.test');
  vi.stubEnv('AI_BASE_URL', ''); vi.stubGlobal('fetch', vi.fn(async () => Response.json(authUser)));
});
afterEach(async () => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); if (dir) await rm(dir, { recursive: true }); });
describe('Guest/account context opt-in at authenticated HTTP persistence boundary (synthetic Auth)', () => {
  it('does not persist Guest-local context in a newly signed-in account before a workspace decision', async () => {
    const response = await POST(new Request('https://app.test/api/ai/coach', { method: 'POST', headers: { origin: 'https://app.test', cookie: authCookie().split(';')[0] },
      body: JSON.stringify({ action: 'open', topicKey: 'card:guest-card', context: { track: 'discovery_track', gradeLevel: 'm_ton', goal: 'curiosity' } }) }));
    expect(response.status).toBe(409);
    expect(await (await connectLocalFoundationStore(`u:${authUser.id}`)).read('coaching', 'card:guest-card')).toBeNull();
  });

  it('ADR 0003: a signed-in user is always the account; a guest workspace cookie or header grants no Guest ownership', async () => {
    const initial = await (await sessionStatus(new Request('https://app.test/auth/session', { headers: { cookie: authCookie() } }))).json();
    expect(initial).toMatchObject({ authenticated: true, decisionRequired: false, workspace: 'account' });
    const cookie = authCookie() + '; edu-workspace=guest'; // legacy chooser cookie is ignored
    const status = await sessionStatus(new Request('https://app.test/auth/session', { headers: { cookie } }));
    expect(await status.json()).toEqual({ ...initial, workspace: 'account' });
    const coach = await POST(new Request('https://app.test/api/ai/coach', { method: 'POST', headers: { origin: 'https://app.test', cookie, 'x-edu-workspace': 'guest' }, body: JSON.stringify({ action: 'open', topicKey: 'card:guest-card', context: { track: 'discovery_track', gradeLevel: 'm_ton', goal: 'curiosity' } }) }));
    expect(coach.status).toBe(409);
    expect(await (await connectLocalFoundationStore(`u:${authUser.id}`)).read('coaching', 'card:guest-card')).toBeNull();
  });

  it('ADR 0003: with Auth configured, a request without a signed-in session gets 401 and no Guest capability', async () => {
    const coach = await POST(new Request('https://app.test/api/ai/coach', { method: 'POST', headers: { origin: 'https://app.test', 'x-edu-workspace': 'guest' }, body: JSON.stringify({ action: 'open', topicKey: 'card:x', context: { track: 'idea_track', gradeLevel: 'm_ton', goal: 'curiosity' } }) }));
    expect(coach.status).toBe(401);
    expect(coach.headers.getSetCookie().join(';')).not.toContain('edu-coaching-owner=');
    expect(JSON.stringify(await coach.json())).toContain('กรุณาเข้าสู่ระบบอีกครั้ง');
    const status = await sessionStatus(new Request('https://app.test/auth/session'));
    expect(status.status).toBe(401);
  });

  it('separate-account selection rejects a stale mounted Guest writer before account persistence', async () => {
    const cookie = authCookie();
    const response = await POST(new Request('https://app.test/api/ai/coach', { method: 'POST', headers: { origin: 'https://app.test', cookie, 'x-edu-workspace': 'guest' }, body: JSON.stringify({ action: 'open', topicKey: 'stale-guest', context: { track: 'idea_track', gradeLevel: 'm_ton', goal: 'curiosity' } }) }));
    expect(response.status).toBe(409);
    expect(await (await connectLocalFoundationStore(`u:${authUser.id}`)).read('coaching', 'stale-guest')).toBeNull();
  });

  it('legacy Guest and two account local workspaces never fall through or overwrite each other', () => {
    const raw = createMemoryStorage();
    const guest = scopedStorage(raw, 'guest'), a = scopedStorage(raw, 'account:a'), b = scopedStorage(raw, 'account:b');
    saveIdea(ideaFixture({ id: 'same-id', title: 'Guest title' }), guest);
    expect(getIdea('same-id', a)).toBeNull();
    saveIdea(ideaFixture({ id: 'same-id', title: 'Account A title' }), a);
    saveIdea(ideaFixture({ id: 'same-id', title: 'Account B title' }), b);
    expect(getIdea('same-id', guest)?.title).toBe('Guest title');
    expect(getIdea('same-id', a)?.title).toBe('Account A title');
    expect(getIdea('same-id', b)?.title).toBe('Account B title');
  });

  it('resumes an existing account room without importing a missing Guest-local card snapshot', async () => {
    const stored = { ...conversationFixture(), topicKey: 'card:legacy-account-card' };
    const account = await connectLocalFoundationStore(`u:${authUser.id}`);
    await account.write({ collection: 'coaching', key: stored.topicKey, expected: null,
      next: { id: stored.id, revision: stored.revision, data: { ...stored, receipts: {} } } });
    const cookie = authCookie();
    const session = await (await sessionStatus(new Request('https://app.test/auth/session', { headers: { cookie } }))).json();
    const request = (key: string) => POST(new Request('https://app.test/api/ai/coach', { method: 'POST', headers: { cookie, origin: 'https://app.test', 'x-edu-workspace': session.scope }, body: JSON.stringify({ action: 'resume', topicKey: key }) }));
    const resumed = await request(stored.topicKey);
    expect(resumed.status).toBe(200);
    expect((await resumed.json()).conversation).toEqual(stored);
    expect((await request('card:guest-only-card')).status).toBe(404);
    expect(await account.read('coaching', 'card:guest-only-card')).toBeNull();
  });
});
