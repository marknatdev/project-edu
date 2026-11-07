import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { selectPersistenceBackend } from './config';
import { connectFoundationStore } from './supabase-store.server';
import type { FoundationStore, OwnerKey, RpcTransport } from './contracts';
/** Lazy request-time selection. Missing/unavailable cloud never falls back local. */
export async function foundationForOwner(owner: OwnerKey): Promise<FoundationStore> {
  if (selectPersistenceBackend() === 'sqlite') {
    const { connectLocalFoundationStore } = await import('./sqlite-store.server');
    return connectLocalFoundationStore(owner);
  }
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return connectFoundationStore(client as RpcTransport, owner);
}
