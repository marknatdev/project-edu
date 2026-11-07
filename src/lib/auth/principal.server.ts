import 'server-only';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { parseCookieHeader } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { requestSupabase, type RequestSupabase } from '@/lib/supabase/server';
import { PersistenceError, type OwnerKey } from '@/lib/persistence/contracts';
import { requiresCloudPersistence } from '@/lib/persistence/config';
export const GUEST_COOKIE = 'edu-coaching-owner';
export const WORKSPACE_COOKIE = 'edu-workspace';
export const workspaceScope = (who: Pick<RequestPrincipal, 'owner' | 'kind'>) => who.kind === 'guest' ? 'guest' : 'account:' + createHash('sha256').update(who.owner).digest('hex');
export interface RequestPrincipal { owner: OwnerKey; kind: 'guest' | 'account'; authenticated: boolean; decisionRequired: boolean; apply(response: NextResponse): NextResponse }

/** Ownership never comes from JSON anonymousId/unlockedTiers, a custom header,
 * or getSession(). Only verified Auth ID or a signed server-issued capability. */
export async function resolvePrincipal(req: Request, options: { guestOnly?: boolean; ignoreWorkspace?: boolean; allowUndecided?: boolean } = {}): Promise<RequestPrincipal> {
  let auth: RequestSupabase | undefined;
  let authenticated = false;
  const selection = parseCookieHeader(req.headers.get('cookie') ?? '').find(c => c.name === WORKSPACE_COOKIE)?.value;
  if (!options.guestOnly && isSupabaseConfigured()) {
    auth = requestSupabase(req);
    if (auth.hasSessionCookie) {
      const { data, error } = await auth.client.auth.getUser();
      if (error || !data.user || !/^[a-f0-9-]{36}$/i.test(data.user.id)) throw new PersistenceError(error && error.status && error.status >= 500 ? 503 : 401, 'AUTH_VERIFICATION_REQUIRED');
      authenticated = true;
      if (selection !== 'guest' || options.ignoreWorkspace) {
        const who: RequestPrincipal = { owner: `u:${data.user.id}`, kind: 'account', authenticated: true,
          decisionRequired: selection !== 'account' && selection !== 'guest', apply: response => auth!.apply(response) };
        if (!options.allowUndecided && (who.decisionRequired || req.headers.get('x-edu-workspace') !== workspaceScope(who))) throw new PersistenceError(409, 'WORKSPACE_DECISION_REQUIRED');
        return who;
      }
    }
  }
  const saved = parseCookieHeader(req.headers.get('cookie') ?? '').find(c => c.name === GUEST_COOKIE)?.value;
  const secret = process.env.APP_GUEST_SECRET;
  if (requiresCloudPersistence() && (!secret || Buffer.byteLength(secret) < 32)) throw new PersistenceError(503, 'GUEST_IDENTITY_UNAVAILABLE');
  if (secret && Buffer.byteLength(secret) < 32) throw new PersistenceError(503, 'GUEST_IDENTITY_UNAVAILABLE');
  const sign = (token: string) => createHmac('sha256', secret!).update('edu-guest:v1:' + token).digest('hex');
  let token: string;
  if (saved) {
    if (secret) {
      const match = /^v1\.([a-f0-9]{64})\.([a-f0-9]{64})$/.exec(saved);
      if (!match || !timingSafeEqual(Buffer.from(sign(match[1]), 'hex'), Buffer.from(match[2], 'hex'))) throw new PersistenceError(401, 'GUEST_VERIFICATION_REQUIRED');
      token = match[1];
    } else {
      // Backward-compatible local development only; 256-bit capability remains
      // unguessable. Production/serverless NEVER accepts this unsigned form.
      if (!/^[a-f0-9]{64}$/.test(saved)) throw new PersistenceError(401, 'GUEST_VERIFICATION_REQUIRED');
      token = saved;
    }
  } else { token = randomBytes(32).toString('hex'); }
  const owner: OwnerKey = `g:${createHash('sha256').update(token).digest('hex')}`;
  if (!options.guestOnly && !options.allowUndecided && req.headers.has('x-edu-workspace') && req.headers.get('x-edu-workspace') !== 'guest') throw new PersistenceError(409, 'WORKSPACE_CHANGED');
  return { owner, kind: 'guest', authenticated, decisionRequired: false, apply(response) {
    auth?.apply(response);
    response.headers.set('Cache-Control', 'no-store');
    if (!saved) response.cookies.set(GUEST_COOKIE, secret ? `v1.${token}.${sign(token)}` : token, {
      httpOnly: true, sameSite: 'strict', secure: requiresCloudPersistence() || new URL(req.url).protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } };
}
