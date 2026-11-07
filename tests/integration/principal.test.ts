import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { resolvePrincipal } from '@/lib/auth/principal.server';
import { authCookie, authUser } from '../fixtures/auth';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('request principal (server-issued capability / verified Auth seam)', () => {
  it('binds account ownership only to a freshly verified user, not cached session identity or custom caller IDs', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://ppctndzkerwiokjfaklw.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_synthetic_test');
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json(authUser)));
    const who=await resolvePrincipal(new Request('https://app.test',{headers:{cookie:authCookie(),'x-owner-id':'attacker'}}), { allowUndecided: true });
    expect(who.owner).toBe('u:'+authUser.id);
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({msg:'bad token'},{status:401})));
    await expect(resolvePrincipal(new Request('https://app.test',{headers:{cookie:authCookie()}}))).rejects.toMatchObject({status:401});
    // ADR 0003: no session means no principal at all, not a Guest; sign-in admission still gets a Guest key.
    await expect(resolvePrincipal(new Request('https://app.test'))).rejects.toMatchObject({status:401,code:'AUTH_REQUIRED'});
    expect((await resolvePrincipal(new Request('https://app.test'),{guestOnly:true})).kind).toBe('guest');
  });
  it('issues an authenticated guest capability, resumes it, and refuses tampering/caller-selected tokens', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('APP_GUEST_SECRET', 'synthetic-guest-signing-key-for-tests-only-0123456789');
    const first = await resolvePrincipal(new Request('https://app.test/api/ai/coach'));
    const response = first.apply(NextResponse.json({ ok: true }));
    const cookie = response.headers.getSetCookie().find(c => c.startsWith('edu-coaching-owner='))!.split(';')[0];
    expect(cookie).toMatch(/=v1\.[a-f0-9]{64}\.[a-f0-9]{64}$/);
    const resumed = await resolvePrincipal(new Request('https://app.test/api/ai/coach', { headers: { cookie } }));
    expect(resumed.owner).toBe(first.owner);
    await expect(resolvePrincipal(new Request('https://app.test', { headers: { cookie: 'edu-coaching-owner=' + 'a'.repeat(64) } }))).rejects.toMatchObject({ status: 401 });
    await expect(resolvePrincipal(new Request('https://app.test', { headers: { cookie: cookie.slice(0,-8) + '00000000' } }))).rejects.toMatchObject({ status: 401 });
  });
});
