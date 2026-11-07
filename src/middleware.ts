import { NextResponse, type NextRequest } from 'next/server';
import { requestSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { appOrigin, safeNext } from '@/lib/auth/paths';

/** Reachable before sign-in: the sign-in flow itself, JSON APIs (they return 401
 * themselves), read-only share/advisor links, and the privacy notice. */
const PUBLIC = /^\/(auth|api|share|advisor-review|consent)(\/|$)/;

/** Next 15 uses middleware.ts (not the Next16 proxy convention). */
export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next(); // No Auth configured: local Guest-only dev.
  const isPublic = PUBLIC.test(request.nextUrl.pathname);
  const context = requestSupabase(request);
  let signedIn = false;
  if (context.hasSessionCookie) {
    try { signedIn = !!(await context.client.auth.getUser()).data.user; }
    catch { /* No UI redirect/network error leak; treated as signed out (fail closed). */ }
  }
  if (!signedIn && !isPublic) {
    // ADR 0003: every app page requires a verified Google account.
    let origin: string;
    try { origin = appOrigin(request); } catch { return new NextResponse('AUTH_UNAVAILABLE', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    const login = new URL('/auth', origin);
    const next = safeNext(request.nextUrl.pathname + request.nextUrl.search);
    if (next !== '/') login.searchParams.set('next', next);
    const response = NextResponse.redirect(login, 303);
    response.headers.set('Cache-Control', 'no-store');
    return context.apply(response);
  }
  if (!context.hasSessionCookie) return NextResponse.next();
  for (const cookie of context.getAll()) request.cookies.set(cookie.name, cookie.value);
  // Forward refreshed cookies to server components AND back to the browser.
  return context.apply(NextResponse.next({ request }));
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|icons/|manifest.webmanifest|sw.js).*)'] };
