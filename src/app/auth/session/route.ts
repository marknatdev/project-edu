import { NextResponse } from 'next/server';
import { resolvePrincipal, workspaceScope } from '@/lib/auth/principal.server';
import { PersistenceError } from '@/lib/persistence/contracts';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const who = await resolvePrincipal(req, { allowUndecided: true });
    // Opaque local provenance key, never an authorization credential or Auth PII.
    const response = NextResponse.json({ authenticated: who.authenticated, workspace: who.kind, scope: workspaceScope(who), decisionRequired: who.decisionRequired }, { headers: { 'Cache-Control': 'no-store' } });
    return who.authenticated ? who.apply(response) : response;
  } catch (e) { return NextResponse.json(e instanceof PersistenceError && e.status === 401 ? { authenticated: false } : { error: 'AUTH_UNAVAILABLE' }, { status: e instanceof PersistenceError && e.status === 401 ? 401 : 503, headers: { 'Cache-Control': 'no-store' } }); }
}
