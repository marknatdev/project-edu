import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectFoundationStore } from '@/lib/persistence/supabase-store.server';
afterEach(() => vi.restoreAllMocks());
describe('Supabase persistence transport errors are untrusted', () => {
  it('rejects malformed quota/batch responses instead of using a cast as validation', async () => {
    const store = await connectFoundationStore({ rpc: async name => name === 'edu_bind_owner' ? { data: 1,error:null } : { data:{ used:-1, remaining:999, cards:[{ title:'bad' }] },error:null } }, `g:${'a'.repeat(64)}`);
    await expect(store.cardQuota()).rejects.toMatchObject({ status:503,code:'PERSISTENCE_UNAVAILABLE' });
    await expect(store.beginBatch({ requestId:crypto.randomUUID(),fingerprint:'test',count:5 })).rejects.toMatchObject({ status:503 });
  });
  it('does not expose provider/transport errors from the public adapter contract', async () => {
    await expect(connectFoundationStore({ rpc: async () => { throw Error('RAW_PROVIDER_CONNECTION_SECRET'); } }, `g:${'a'.repeat(64)}`))
      .rejects.toMatchObject({ status:503,message:'PERSISTENCE_UNAVAILABLE' });
  });
});
