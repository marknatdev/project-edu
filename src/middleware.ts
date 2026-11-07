import { NextResponse, type NextRequest } from 'next/server';
import { requestSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

/** Next 15 uses middleware.ts (not the Next16 proxy convention). */
export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();
  const context = requestSupabase(request);
  if (!context.hasSessionCookie) return NextResponse.next(); // Guest pages never require Google.
  try { await context.client.auth.getUser(); }
  catch { /* No UI redirect/network error leak. Protected routes revalidate/fail closed. */ }
  for (const cookie of context.getAll()) request.cookies.set(cookie.name, cookie.value);
  // Forward refreshed cookies to server components AND back to the browser.
  return context.apply(NextResponse.next({ request }));
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|icons/|manifest.webmanifest|sw.js).*)'] };
