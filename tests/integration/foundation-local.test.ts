import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { connectLocalFoundationStore } from '@/lib/persistence/sqlite-store.server';
import { TOPIC_CARDS } from '@/data/topic-cards';
let path: string | undefined;
afterEach(() => { if (path) rmSync(path, { recursive: true, force: true }); path = undefined; vi.unstubAllEnvs(); });
describe('local development uses the same async persistence seam', () => {
  it('preserves card quota across topics, admits only one retry claim, and resets at Bangkok midnight', async () => {
    path=resolve('.local/foundation-tests',crypto.randomUUID());mkdirSync(path,{recursive:true});
    vi.stubEnv('PERSISTENCE_BACKEND','sqlite');vi.stubEnv('COACH_DB_PATH',resolve(path,'data.sqlite'));
    let now=new Date('2026-11-05T16:59:59Z');
    const owner=`g:${'b'.repeat(64)}` as const;
    const s=await connectLocalFoundationStore(owner,()=>now), other=await connectLocalFoundationStore(owner,()=>now);
    const intent={requestId:crypto.randomUUID(),fingerprint:'local-test',count:5};
    const claims=await Promise.all([s.beginBatch(intent),other.beginBatch(intent)]);
    expect(claims.filter(x=>x.claimed)).toHaveLength(1);
    await s.completeBatch(claims[0].leaseId,TOPIC_CARDS.slice(0,5));
    await s.write({collection:'discovery',key:'new-topic',expected:null,next:{id:crypto.randomUUID(),revision:1,data:{interest:'math'}}});
    expect(await other.cardQuota()).toMatchObject({day:'2026-11-05',used:5,freeRemaining:0,extraRemaining:30});
    const next=await other.beginBatch({...intent,requestId:crypto.randomUUID()});
    await s.completeBatch(next.leaseId,[TOPIC_CARDS[5]]);
    expect(await s.cardQuota()).toMatchObject({used:6,freeRemaining:0,extraRemaining:29});
    now=new Date('2026-11-05T17:00:00Z');
    expect(await s.cardQuota()).toMatchObject({day:'2026-11-06',used:0,reserved:0,remaining:35,freeRemaining:5});
    expect((await other.beginBatch(intent)).state).toBe('complete'); // old intent does not regenerate on a new day
    expect((await s.listCards({limit:100})).cards).toHaveLength(6);
  });
  it('persists snapshots through a new adapter and fences in-flight writes on wipe', async () => {
    path = resolve('.local/foundation-tests', crypto.randomUUID()); mkdirSync(path, { recursive: true });
    vi.stubEnv('PERSISTENCE_BACKEND', 'sqlite'); vi.stubEnv('COACH_DB_PATH', resolve(path, 'data.sqlite'));
    const owner = `g:${'a'.repeat(64)}` as const;
    const one = await foundationForOwner(owner);
    const record = { id: crypto.randomUUID(), revision: 1, data: { local: true } };
    await one.write({ collection: 'discovery', key: 'interview', expected: null, next: record });
    const two = await foundationForOwner(owner);
    expect(await two.read('discovery', 'interview')).toEqual(record);
    await two.wipe();
    await expect(one.write({ collection: 'discovery', key: 'interview', expected: null, next: record })).rejects.toMatchObject({ status: 410 });
  });
});
