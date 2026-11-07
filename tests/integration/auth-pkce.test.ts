import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/auth/login/route';
import { GET as callback } from '@/app/auth/callback/route';
import { POST as logout } from '@/app/auth/logout/route';
import { GET as sessionStatus } from '@/app/auth/session/route';
import { authCookie, authUser, authSession } from '../fixtures/auth';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ppctndzkerwiokjfaklw.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_test');
  vi.stubEnv('APP_ORIGIN', 'https://app.test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Supabase SSR PKCE HTTP flow (SDK real, provider network simulated)', () => {
  it('does not replace a Strict Guest capability omitted on the cross-site OAuth return (production admission path)',async()=>{
    const started=await login(new Request('https://app.test/auth/login',{method:'POST',headers:{origin:'https://app.test'},body:JSON.stringify({next:'/proposal'})}));
    const verifier=started.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-service-only');
    vi.stubEnv('APP_GUEST_SECRET','synthetic-guest-signing-key-for-production-path-test');
    vi.stubGlobal('fetch',vi.fn(async(input:string|URL|Request)=>{
      const url=String(input);
      if(url.includes('/rest/v1/rpc/edu_bind_owner')) return Response.json(1);
      if(url.includes('/rest/v1/rpc/edu_foundation')) return Response.json(true);
      if(url.includes('/token?grant_type=pkce'))return Response.json(authSession());
      if(url.endsWith('/user'))return Response.json(authUser);
      throw Error('unexpected synthetic provider request');
    }));
    // Browser still owns its original Strict Guest cookie, but intentionally
    // sends only the Lax verifier on this cross-site top-level callback.
    const response=await callback(new Request('https://app.test/auth/callback?code=synthetic&next=/proposal',{headers:{cookie:verifier}}));
    expect(response.headers.get('location')).toBe('https://app.test/proposal');
    expect(response.headers.getSetCookie().some(c=>c.startsWith('edu-coaching-owner='))).toBe(false);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });
  it('clears the PKCE verifier when callback admission is rate limited or the backend fails', async () => {
    const started=await login(new Request('https://app.test/auth/login',{method:'POST',headers:{origin:'https://app.test'},body:JSON.stringify({next:'/proposal'})}));
    const verifier=started.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    const verifierNames=verifier.split('; ').map(c=>c.split('=')[0]);
    expect(verifierNames.length).toBeGreaterThan(1);
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-service-only');
    vi.stubEnv('APP_GUEST_SECRET','synthetic-guest-signing-key-for-production-path-test');
    for (const admission of [() => Response.json(false), () => new Response('down', { status: 500 })]) {
      const exchange=vi.fn();
      vi.stubGlobal('fetch',vi.fn(async(input:string|URL|Request)=>{
        const url=String(input);
        if(url.includes('/rest/v1/rpc/edu_bind_owner')) return Response.json(1);
        if(url.includes('/rest/v1/rpc/edu_foundation')) return admission();
        if(url.includes('/token?grant_type=pkce')){exchange();return Response.json(authSession());}
        throw Error('unexpected synthetic provider request');
      }));
      const response=await callback(new Request('https://app.test/auth/callback?code=synthetic&next=/proposal',{headers:{cookie:verifier}}));
      expect(new URL(response.headers.get('location')!).search).toBe('?status=unavailable');
      expect(exchange).not.toHaveBeenCalled();
      // @supabase/ssr writes legacy, per-flow slot and flow-index verifier cookies; all must be cleared.
      const setCookies=response.headers.getSetCookie();
      for (const name of verifierNames) expect(setCookies.find(c=>c.startsWith(name+'='))).toContain('Max-Age=0');
      expect(response.headers.getSetCookie().some(c=>c.startsWith('edu-coaching-owner='))).toBe(false);
    }
  });
  it('reports only verified sign-in status and signs out locally without deleting guest work', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/user')) return Response.json(authUser);
      if (String(input).includes('/logout?scope=local')) return new Response(null, { status: 204 });
      throw Error('unexpected network');
    }));
    const cookie = authCookie() + '; edu-coaching-owner=synthetic-guest-work';
    const status = await sessionStatus(new Request('https://app.test/auth/session', { headers: { cookie } }));
    expect(await status.json()).toEqual({ authenticated: true, workspace: 'account', decisionRequired: true,
      scope: 'account:367878358188186b734b3b92e696fb2b4cc711c3a90e39857209484304b50f16' });
    const response = await logout(new Request('https://app.test/auth/logout', { method: 'POST', headers: { cookie, origin: 'https://app.test' } }));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(response.headers.get('set-cookie')).not.toContain('edu-coaching-owner');
    expect(await response.json()).toEqual({ signedOut: true });
  });
  it('exchanges the callback code using its verifier and verifies the user before setting a session', async () => {
    const started = await login(new Request('https://app.test/auth/login', { method: 'POST', headers: { origin: 'https://app.test' }, body: JSON.stringify({ next: '/proposal' }) }));
    const verifier = started.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
      app_metadata: { provider: 'google' }, user_metadata: { full_name: 'SYNTHETIC NEVER STORE' }, email: 'synthetic@example.invalid', created_at: '2026-11-01T00:00:00Z' };
    const access = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'synthetic'].join('.');
    const network = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/token?grant_type=pkce')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ auth_code: 'synthetic-code', code_verifier: expect.any(String) });
        return Response.json({ access_token: access, token_type: 'bearer', refresh_token: 'synthetic-refresh', expires_in: 3600, user });
      }
      if (url.endsWith('/user')) return Response.json(user);
      throw Error('Unexpected provider request: ' + url);
    });
    vi.stubGlobal('fetch', network);
    const response = await callback(new Request('https://app.test/auth/callback?code=synthetic-code&next=%2Fproposal', { headers: { cookie: verifier } }));
    expect(response.headers.get('location')).toBe('https://app.test/proposal');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(network.mock.calls.some(c => String(c[0]).endsWith('/user'))).toBe(true);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain(user.email);
  });
  it('rejects bad codes, missing verifiers and provider cancellation without exposing provider text or external redirects', async () => {
    const provider = vi.fn(async () => Response.json({ error: 'invalid_grant', error_description: 'RAW_PROVIDER_SECRET' }, { status: 400 }));
    vi.stubGlobal('fetch', provider);
    for (const suffix of ['?code=bad&next=//attacker.invalid', '?code=bad&next=https://attacker.invalid', '?error=access_denied&error_description=RAW_PROVIDER_SECRET', '']) {
      const response = await callback(new Request('https://app.test/auth/callback' + suffix, { headers: { 'x-forwarded-host': 'attacker.invalid' } }));
      const target = new URL(response.headers.get('location')!);
      expect(target.origin).toBe('https://app.test');
      expect(target.pathname).toBe('/auth');
      expect(target.search).not.toContain('RAW_PROVIDER');
      expect(await response.text()).not.toContain('RAW_PROVIDER');
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(provider).not.toHaveBeenCalled(); // SDK refuses a missing PKCE verifier locally.
  });
  it.each(['//attacker.invalid', '/\\\\attacker.invalid', '/%2f%2fattacker.invalid', 'https://attacker.invalid', '/auth/logout', '/api/ai/coach', '/proposal/../auth/login'])('refuses unallowlisted return path %s', async next => {
    const response = await login(new Request('https://app.test/auth/login', { method: 'POST', headers: { origin: 'https://app.test' }, body: JSON.stringify({ next }) }));
    const url = new URL((await response.json()).url);
    expect(url.searchParams.get('redirect_to')).toBe('https://app.test/auth/callback?next=%2F');
  });
  it('blocks login/logout CSRF and never treats an unverified cached identity as authenticated', async () => {
    for (const handler of [login, logout]) {
      const response = await handler(new Request('https://app.test/auth/login', { method: 'POST', headers: { origin: 'https://attacker.invalid' }, body: '{}' }));
      expect(response.status).toBe(403);
    }
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'bad_jwt', msg: 'RAW_PROVIDER_SECRET' }, { status: 401 })));
    const response = await sessionStatus(new Request('https://app.test/auth/session', { headers: { cookie: authCookie() } }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ authenticated: false });
  });
  it('starts Google sign-in with an S256 verifier cookie and only sign-in scopes', async () => {
    const response = await login(new Request('https://app.test/auth/login', { method: 'POST', headers: { origin: 'https://app.test' }, body: JSON.stringify({ next: '/proposal' }) }));
    expect(response.status).toBe(200);
    const url = new URL((await response.json()).url);
    expect(url.origin).toBe('https://ppctndzkerwiokjfaklw.supabase.co');
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('redirect_to')).toBe('https://app.test/auth/callback?next=%2Fproposal');
    expect(url.searchParams.get('scopes')).not.toMatch(/drive|calendar|offline/);
    expect(response.headers.get('set-cookie')).toContain('code-verifier=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
