import { NextResponse } from 'next/server';
import { boundedText, BodyLimitError } from '@/lib/http/bounded-body';
import { requestSupabase } from '@/lib/supabase/server';
import { appOrigin, safeNext, sameOrigin } from '@/lib/auth/paths';
import { admitAuth } from '@/lib/auth/admission.server';
import { PersistenceError } from '@/lib/persistence/contracts';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  if (!sameOrigin(req, true)) return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  let input: { next?: unknown };
  try {
    input = JSON.parse(await boundedText(req, 2048));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('INVALID_INPUT');
  } catch (e) { return NextResponse.json({ error: e instanceof BodyLimitError ? 'TOO_LARGE' : 'INVALID_INPUT' }, { status: e instanceof BodyLimitError ? 413 : 400, headers: { 'Cache-Control': 'no-store' } }); }
  try {
    const next = safeNext(input.next);
    const who=await admitAuth(req);
    const callback = new URL('/auth/callback', appOrigin(req)); callback.searchParams.set('next', next);
    const context = requestSupabase(req);
    const { data, error } = await context.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.href, scopes: 'openid email profile', skipBrowserRedirect: true } });
    if (error || !data.url) throw Error('AUTH_UNAVAILABLE');
    const response=context.apply(NextResponse.json({ url: data.url }));
    return who?who.apply(response):response;
  } catch(e) { return NextResponse.json({ error: e instanceof PersistenceError&&e.status===429?'AUTH_RATE_LIMIT':'AUTH_UNAVAILABLE' }, { status: e instanceof PersistenceError&&e.status===429?429:503, headers: { 'Cache-Control': 'no-store' } }); }
}
