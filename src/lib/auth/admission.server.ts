import 'server-only';
import { resolvePrincipal } from './principal.server';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { requiresCloudPersistence } from '@/lib/persistence/config';
import { PersistenceError } from '@/lib/persistence/contracts';
/** No raw IP/name/email in rate records. Global ceilings bound rotating Guests. */
export async function admitAuth(req:Request) {
  if (!requiresCloudPersistence()) return null;
  const who=await resolvePrincipal(req,{guestOnly:true}),store=await foundationForOwner(who.owner);
  if (!await store.allowRequest('auth')) throw new PersistenceError(429,'AUTH_RATE_LIMIT');
  return who;
}
