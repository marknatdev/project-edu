import { NextResponse } from 'next/server';
import { requestSupabase } from '@/lib/supabase/server';
import { appOrigin, safeNext } from '@/lib/auth/paths';
import { admitAuth } from '@/lib/auth/admission.server';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const input = new URL(req.url).searchParams;
  // Never reflect provider error_description, code, identity or forwarded-host.
  let origin: string;
  try { origin = appOrigin(req); }
  catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  const failure = (status: string) => {
    const response=NextResponse.redirect(new URL(`/auth?status=${status}`, origin),303);
    response.headers.set('Cache-Control','no-store'); response.headers.set('Referrer-Policy','no-referrer'); return response;
  };
  let context: ReturnType<typeof requestSupabase> | undefined;
  try {
    context = requestSupabase(req);
    if (input.has('error')) return context.clearVerifier(failure(input.get('error') === 'access_denied' ? 'cancelled' : 'error'));
    const code = input.get('code');
    if (!code || code.length > 4096) return context.clearVerifier(failure('error'));
    // The Strict Guest cookie is absent on a cross-site OAuth return. Admission
    // may create an ephemeral principal, but MUST NOT replace the browser's
    // existing persistent Guest capability with that temporary identity.
    await admitAuth(req);
    const exchanged = await context.client.auth.exchangeCodeForSession(code);
    if (exchanged.error) return context.clearVerifier(failure('error'));
    // getSession() is never authorization. Revalidate against Supabase Auth.
    const verified = await context.client.auth.getUser();
    if (verified.error || !verified.data.user) return context.clearVerifier(failure('error'));
    const response = NextResponse.redirect(new URL(safeNext(input.get('next')), origin), 303);
    return context.apply(response);
  } catch {
    // Rate limit/backend failure must not leave a reusable PKCE verifier behind.
    return context ? context.clearVerifier(failure('unavailable')) : failure('unavailable');
  }
}
