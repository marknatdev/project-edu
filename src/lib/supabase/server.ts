import 'server-only';
import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getSupabaseConfig } from './client';

export function requestSupabase(req: Request) {
  const config = getSupabaseConfig();
  if (!config) throw Error('AUTH_UNAVAILABLE');
  const jar = new Map(parseCookieHeader(req.headers.get('cookie') ?? '').map(c => [c.name, c.value ?? '']));
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const secure = new URL(req.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  const client = createServerClient(config.url, config.anonKey, {
    cookieOptions: { httpOnly: true, secure, sameSite: 'lax', path: '/' },
    cookies: {
      getAll() { return [...jar].map(([name, value]) => ({ name, value })); },
      setAll(changes) { for (const { name, value, options } of changes) {
        jar.set(name, value);
        pending.set(name, { name, value, options: { ...options, httpOnly: true, secure, sameSite: 'lax', path: '/' } });
      } },
    },
  });
  return {
    client,
    getAll() { return [...jar].map(([name, value]) => ({ name, value })); },
    hasSessionCookie: [...jar.keys()].some(name => /^sb-.+-auth-token(?:\.\d+)?$/.test(name)),
    apply(response: NextResponse) {
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Vary', 'Cookie');
      for (const cookie of pending.values()) response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    },
    clearVerifier(response: NextResponse) {
      for (const name of jar.keys()) if (/^sb-.+-auth-token(?:-flow-[A-Za-z0-9_-]{8,64}|-flows)?-code-verifier(?:\.\d+)?$/.test(name)) {
        response.cookies.set(name, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
      }
      response.headers.set('Cache-Control', 'no-store'); return response;
    },
  };
}
export type RequestSupabase = ReturnType<typeof requestSupabase>;
