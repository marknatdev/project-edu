import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { authCookie, authSession, authUser } from '../fixtures/auth';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ppctndzkerwiokjfaklw.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_test');
  vi.stubEnv('APP_ORIGIN', 'https://app.test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Next15 refresh middleware using real SSR SDK / simulated Auth network', () => {
  it('refreshes an expired cookie on both the forwarded request and outgoing response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/token?grant_type=refresh_token')) return Response.json(authSession());
      if (url.endsWith('/user')) return Response.json(authUser);
      throw Error('unexpected test network');
    }));
    const response = await middleware(new NextRequest('https://app.test/proposal', { headers: { cookie: authCookie(true) } }));
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('x-middleware-request-cookie')).toContain('sb-ppctndzkerwiokjfaklw-auth-token=');
    expect(response.headers.get('x-middleware-request-cookie')).not.toBe(authCookie(true));
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('ADR 0003: redirects app pages to sign-in when signed out or verification fails, keeping a safe next', async () => {
    const signedOut = await middleware(new NextRequest('https://app.test/proposal?tab=plan'));
    expect(signedOut.status).toBe(303);
    expect(signedOut.headers.get('location')).toBe('https://app.test/auth?next=%2Fproposal%3Ftab%3Dplan');
    expect(signedOut.headers.get('cache-control')).toBe('no-store');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ msg: 'bad token' }, { status: 401 })));
    const rejected = await middleware(new NextRequest('https://app.test/', { headers: { cookie: authCookie() } }));
    expect(rejected.headers.get('location')).toBe('https://app.test/auth');
    const unsafe = await middleware(new NextRequest('https://app.test/print'));
    expect(unsafe.headers.get('location')).toBe('https://app.test/auth');
  });
  it('lets the sign-in flow, APIs, read-only links and the privacy notice through without a session', async () => {
    for (const path of ['/auth', '/auth/callback?code=x', '/api/ai/coach', '/share', '/advisor-review', '/consent']) {
      const response = await middleware(new NextRequest('https://app.test' + path));
      expect(response.headers.get('location'), path).toBeNull();
    }
    expect((await middleware(new NextRequest('https://app.test/authx'))).status).toBe(303);
  });
});
