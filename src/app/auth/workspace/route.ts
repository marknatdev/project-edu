import { NextResponse } from 'next/server';
import { readBody } from '@/lib/persistence/owner-route.server';
import { resolvePrincipal, WORKSPACE_COOKIE } from '@/lib/auth/principal.server';
export const dynamic = 'force-dynamic';
/** Explicitly choose where to CONTINUE, not an import/sync endpoint. Guest
 * snapshots/history/gates are never copied into an account by this operation. */
export async function POST(req: Request) {
  const input = await readBody(req, 1024);
  if ('response' in input) return input.response;
  const decision = (input.body as { decision?: unknown } | null)?.decision;
  if (decision !== 'guest' && decision !== 'account') return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  try {
    const who = await resolvePrincipal(req, { allowUndecided: true });
    if (!who.authenticated) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    const response = who.apply(NextResponse.json({ selected: decision, imported: false }));
    response.cookies.set(WORKSPACE_COOKIE, decision, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' || new URL(req.url).protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
