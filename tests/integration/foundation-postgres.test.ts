import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { POST as coach } from '@/app/api/ai/coach/route';
import { postgresFixture } from '../support/postgres';
import { connectFoundationStore } from '@/lib/persistence/supabase-store.server';
import type { OwnerKey } from '@/lib/persistence/contracts';
import { TOPIC_CARDS } from '@/data/topic-cards';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const a: OwnerKey = 'u:11111111-1111-4111-8111-111111111111';

describe('real PostgreSQL 17 foundation RPC, not mocked storage', () => {
  it('executes the distributable RLS verification script with rollback', async () => {
    await pg.pool.query(await readFile(resolve('supabase/tests/foundation-rls.sql'),'utf8'));
  });
  it('uses signed guest ownership and Postgres for the real coaching route in production (REST transport simulated)', async () => {
    vi.stubEnv('NODE_ENV','production'); vi.stubEnv('APP_ORIGIN','https://app.test');
    vi.stubEnv('APP_GUEST_SECRET','synthetic-signing-secret-for-foundation-tests-only');
    vi.stubEnv('PERSISTENCE_BACKEND','supabase'); vi.stubEnv('AI_BASE_URL','');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://ppctndzkerwiokjfaklw.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-server-only-key');
    const network = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.origin).toBe('https://ppctndzkerwiokjfaklw.supabase.co');
      const name = url.pathname.split('/').pop()!;
      const result = await pg.rpc.rpc(name, JSON.parse(String(init?.body)));
      return Response.json(result.error ?? result.data, { status: result.error ? 400 : 200 });
    });
    vi.stubGlobal('fetch',network);
    const response = await coach(new Request('https://app.test/api/ai/coach', { method:'POST',headers:{origin:'https://app.test'},
      body:JSON.stringify({action:'open',topicKey:'cloud-route',context:{track:'idea_track',gradeLevel:'m_plai',goal:'ysc'}}) }));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('=v1.');
    const cookie=response.headers.get('set-cookie')!.split(';')[0];
    const data=await response.json();
    const resumed=await coach(new Request('https://app.test/api/ai/coach',{method:'POST',headers:{origin:'https://app.test',cookie},
      body:JSON.stringify({action:'open',topicKey:'cloud-route',context:{track:'idea_track',gradeLevel:'m_plai',goal:'ysc'}})}));
    expect((await resumed.json()).conversation).toEqual(data.conversation);
    expect(network).toHaveBeenCalled();
    const statuses=[];
    for(let i=0;i<11;i++) statuses.push((await coach(new Request('https://app.test/api/ai/coach',{method:'POST',headers:{origin:'https://app.test',cookie},body:JSON.stringify({action:'open',topicKey:'rate-'+i,context:{track:'idea_track',gradeLevel:'m_plai',goal:'ysc'}})}))).status);
    expect(statuses.slice(0,10)).toEqual(Array(10).fill(200));expect(statuses[10]).toBe(429);
  });
  it('enforces the shared auth admission ceiling across independently bound owners',async()=>{
    const stores=await Promise.all(Array.from({length:40},(_,i)=>connectFoundationStore(pg.rpc,`g:${i.toString(16).padStart(64,'0')}`)));
    const results=await Promise.all(stores.map(s=>s.allowRequest('auth')));
    expect(results.filter(Boolean)).toHaveLength(30);expect(results.filter(x=>!x)).toHaveLength(10);
  });
  it('reserves capacity and charges only accepted unique cards, replaying the same completed intent', async () => {
    const store = await connectFoundationStore(pg.rpc, `g:${'a'.repeat(64)}`);
    const intent = { requestId: crypto.randomUUID(), fingerprint: 'personalized-request-a', count: 5 };
    const pending = await store.beginBatch(intent);
    expect(pending.claimed).toBe(true);
    expect(pending.quota).toMatchObject({ used: 0, reserved: 5, remaining: 30, freeRemaining: 5, extraRemaining: 30 });
    const finished = await store.completeBatch(pending.leaseId, [TOPIC_CARDS[0], TOPIC_CARDS[1], TOPIC_CARDS[0]]);
    expect(finished.cards).toEqual([TOPIC_CARDS[0], TOPIC_CARDS[1]]);
    expect(finished.quota).toMatchObject({ used: 2, reserved: 0, remaining: 33, freeRemaining: 3, extraRemaining: 30 });
    const retry = await store.beginBatch(intent);
    expect(retry.state).toBe('complete');
    expect(retry.claimed).toBe(false);
    expect(retry.cards).toEqual(finished.cards);
    expect((await store.cardQuota()).used).toBe(2);
  });
  it('has one CAS winner over independent database connections and idempotent same-payload replay', async () => {
    const owner: OwnerKey = `g:${'b'.repeat(64)}`;
    const x = await connectFoundationStore(pg.rpc, owner), y = await connectFoundationStore(pg.rpc, owner);
    const first = { id: crypto.randomUUID(), revision: 1, data: { answer: 'first' } };
    await x.write({ collection: 'coaching', key: 'cas', expected: null, next: first });
    const receipt = { id: crypto.randomUUID(), fingerprint: 'same-intent' };
    const write = { collection: 'coaching' as const, key: 'cas', expected: { id: first.id, revision: 1 }, next: { ...first, revision: 2, data: { answer: 'accepted' } }, receipt };
    const replay = await Promise.all([x.write(write), y.write(write)]);
    expect(replay[0]).toEqual(replay[1]);
    await expect(y.write({ ...write, receipt: { ...receipt, fingerprint: 'changed' } })).rejects.toMatchObject({ status: 409 });
    const outcomes = await Promise.allSettled([x.write({ ...write, expected: { id: first.id, revision: 2 }, next: { ...first, revision: 3 }, receipt: { id: crypto.randomUUID(), fingerprint: 'one' } }),
      y.write({ ...write, expected: { id: first.id, revision: 2 }, next: { ...first, revision: 3 }, receipt: { id: crypto.randomUUID(), fingerprint: 'two' } })]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(x => x.status === 'rejected')).toHaveLength(1);
    expect((await y.read('coaching', 'cas'))?.revision).toBe(3);
  });
  it('reserves the 35-card limit across concurrent connections without duplicate generation claims', async () => {
    const owner: OwnerKey = `g:${'c'.repeat(64)}`;
    const stores = await Promise.all(Array.from({ length: 10 }, () => connectFoundationStore(pg.rpc, owner)));
    const input = { requestId: crypto.randomUUID(), fingerprint: 'one-intent', count: 5 };
    const same = await Promise.all(stores.map(s => s.beginBatch(input)));
    expect(same.filter(x => x.claimed)).toHaveLength(1);
    expect(new Set(same.map(x => x.leaseId)).size).toBe(1);
    const rest = await Promise.allSettled(stores.map(s => s.beginBatch({ ...input, requestId: crypto.randomUUID() })));
    expect(rest.filter(x => x.status === 'fulfilled')).toHaveLength(6);
    expect(rest.filter(x => x.status === 'rejected')).toHaveLength(4);
    expect(await stores[0].cardQuota()).toMatchObject({ used: 0, reserved: 35, remaining: 0 });
    await stores[0].failBatch(same[0].leaseId);
    expect(await stores[0].cardQuota()).toMatchObject({ used: 0, reserved: 30, remaining: 5 });
    await expect(stores[0].beginBatch({ ...input, fingerprint: 'changed' })).rejects.toMatchObject({ status: 409 });
  });
  it('counts duplicates/malformed candidates as zero and preserves successful partial work', async () => {
    const s = await connectFoundationStore(pg.rpc, `g:${'d'.repeat(64)}`);
    const begin = () => s.beginBatch({ requestId: crypto.randomUUID(), fingerprint: 'test', count: 5 });
    const b = await begin();
    await s.completeBatch(b.leaseId, [TOPIC_CARDS[2]]);
    const next = await begin();
    const done = await s.completeBatch(next.leaseId, [
      { ...TOPIC_CARDS[2], id: 'different-id-same-content' },
      { ...TOPIC_CARDS[3], title: '' }, TOPIC_CARDS[4],
    ]);
    expect(done.cards).toEqual([TOPIC_CARDS[4]]);
    expect(done.quota).toMatchObject({ used: 2, reserved: 0, remaining: 33 });
    expect((await s.completeBatch(next.leaseId, [TOPIC_CARDS[5]])).cards).toEqual(done.cards);
  });
  it('revokes an old guest and in-flight leases; account wipe fences old operations but allows new work', async () => {
    const guest: OwnerKey = `g:${'e'.repeat(64)}`;
    const s = await connectFoundationStore(pg.rpc, guest);
    const pending = await s.beginBatch({ requestId: crypto.randomUUID(), fingerprint: 'test', count: 5 });
    await s.wipe();
    await expect(s.completeBatch(pending.leaseId, [TOPIC_CARDS[0]])).rejects.toMatchObject({ status: 410 });
    await expect(connectFoundationStore(pg.rpc, guest)).rejects.toMatchObject({ status: 410 });
    const account: OwnerKey = 'u:33333333-3333-4333-8333-333333333333';
    const old = await connectFoundationStore(pg.rpc, account);
    await old.write({ collection: 'discovery', key: 'answers', expected: null, next: { id: crypto.randomUUID(), revision: 1, data: { answers: ['solar'] } } });
    await old.wipe();
    await expect(old.read('discovery', 'answers')).rejects.toMatchObject({ status: 410 });
    const fresh = await connectFoundationStore(pg.rpc, account);
    expect(await fresh.read('discovery', 'answers')).toBeNull();
    expect(await fresh.cardQuota()).toMatchObject({ used: 0, reserved: 0 });
  });
  it('executes RLS as two authenticated roles, denies anonymous access and denies client writes/RPC', async () => {
    const own = await connectFoundationStore(pg.rpc, a);
    await own.write({ collection: 'coaching', key: 'rls-fixture', expected: null, next: { id: crypto.randomUUID(), revision: 1, data: { synthetic: true } } });
    const one = await pg.pool.connect();
    try {
      await one.query('BEGIN'); await one.query('SET LOCAL ROLE authenticated');
      await one.query("SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true)");
      const rows = (await one.query('SELECT owner_key FROM public.edu_records')).rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every(row => row.owner_key === a)).toBe(true);
      await one.query("SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true)");
      expect((await one.query('SELECT * FROM public.edu_records')).rows).toEqual([]);
      await expect(one.query('DELETE FROM public.edu_records')).rejects.toMatchObject({ code: '42501' });
      await one.query('ROLLBACK');
      await one.query('BEGIN'); await one.query('SET LOCAL ROLE anon');
      await expect(one.query('SELECT * FROM public.edu_records')).rejects.toMatchObject({ code: '42501' });
      await one.query('ROLLBACK');
      await one.query('BEGIN'); await one.query('SET LOCAL ROLE authenticated');
      await expect(one.query("SELECT public.edu_bind_owner('g:'||repeat('f',64))")).rejects.toMatchObject({ code: '42501' });
      await one.query('ROLLBACK');
    } finally { one.release(); }
  });
  it('consumes evaluation/proposal allowances idempotently and refuses excess without consuming the other kind', async () => {
    const s = await connectFoundationStore(pg.rpc, `g:${'f'.repeat(64)}`);
    const first = { kind: 'proposal' as const, requestId: crypto.randomUUID(), fingerprint: 'proposal-one' };
    expect(await s.consumeQuota(first)).toMatchObject({ allowed: true, used: 1, remaining: 1 });
    expect(await s.consumeQuota(first)).toMatchObject({ allowed: true, used: 1, remaining: 1 });
    await expect(s.consumeQuota({...first,count:2})).rejects.toMatchObject({status:409});
    expect(await s.consumeQuota({ ...first, requestId: crypto.randomUUID() })).toMatchObject({ allowed: true, used: 2, remaining: 0 });
    expect(await s.consumeQuota({ ...first, requestId: crypto.randomUUID() })).toMatchObject({ allowed: false, used: 2, remaining: 0 });
    expect(await s.consumeQuota({ ...first, kind: 'evaluate', requestId: crypto.randomUUID() })).toMatchObject({ allowed: true, used: 1, remaining: 4 });
    await expect(s.consumeQuota({ ...first, fingerprint: 'changed' })).rejects.toMatchObject({ status: 409 });
    const boundary = await pg.pool.query("SELECT public.edu_bangkok_day('2026-11-05T16:59:59Z')::text AS day,public.edu_bangkok_day('2026-11-05T17:00:00Z')::text AS next_day");
    expect(boundary.rows[0]).toEqual({ day: '2026-11-05', next_day: '2026-11-06' });
  });
  it('exposes non-consuming quota checks and paginated accepted snapshots for successor modules', async () => {
    const s=await connectFoundationStore(pg.rpc,`g:${'1'.repeat(64)}`);
    expect(await s.quotaStatus('proposal')).toMatchObject({ used:0,remaining:2,limit:2 });
    const b=await s.beginBatch({requestId:crypto.randomUUID(),fingerprint:'list',count:5});
    await s.completeBatch(b.leaseId,[TOPIC_CARDS[0],TOPIC_CARDS[1]]);
    const first=await s.listCards({limit:1});
    expect(first.cards).toHaveLength(1); expect(first.nextCursor).toBeTruthy();
    const second=await s.listCards({limit:1,cursor:first.nextCursor!});
    expect(second.cards).toHaveLength(1); expect(second.nextCursor).toBeNull();
    expect(new Set([...first.cards,...second.cards].map(x=>x.id))).toEqual(new Set([TOPIC_CARDS[0].id,TOPIC_CARDS[1].id]));
    const other=await connectFoundationStore(pg.rpc,`g:${'2'.repeat(64)}`);
    expect((await other.listCards({limit:100})).cards).toEqual([]);
  });
  it('resumes owner-bound records across independent adapters and denies another owner', async () => {
    const first = await connectFoundationStore(pg.rpc, a);
    const next = { id: crypto.randomUUID(), revision: 1, data: { answer: 'ยังคิดไม่ออก' } };
    await first.write({ collection: 'coaching', key: 'topic-a', expected: null, next });
    expect(await (await connectFoundationStore(pg.rpc, a)).read('coaching', 'topic-a')).toEqual(next);
    const other = await connectFoundationStore(pg.rpc, 'u:22222222-2222-4222-8222-222222222222');
    expect(await other.read('coaching', 'topic-a')).toBeNull();
  });
  it('recovers expired pending work after restart, fences its old lease, and preserves completed idempotency', async () => {
    vi.stubEnv('CARD_BATCH_LEASE_SECONDS','1');
    const owner=`g:${'4'.repeat(64)}` as const;
    const crashedWorker=await connectFoundationStore(pg.rpc,owner);
    const intent={requestId:crypto.randomUUID(),fingerprint:'crashed-intent',count:5};
    const abandoned=await crashedWorker.beginBatch(intent);
    expect(abandoned.leaseExpiresAt).toBeTruthy();
    await pg.restart();
    await new Promise(r=>setTimeout(r,1100));
    const resumed=await connectFoundationStore(pg.rpc,owner);
    expect(await resumed.cardQuota()).toMatchObject({used:0,reserved:0,remaining:35});
    const recovery=await resumed.beginBatch(intent);
    expect(recovery.claimed).toBe(true); expect(recovery.leaseId).not.toBe(abandoned.leaseId);
    await expect(crashedWorker.completeBatch(abandoned.leaseId,[TOPIC_CARDS[0]])).rejects.toMatchObject({status:404});
    const done=await resumed.completeBatch(recovery.leaseId,[TOPIC_CARDS[0]]);
    expect(done.quota).toMatchObject({used:1,reserved:0,remaining:34});
    expect((await resumed.beginBatch(intent)).cards).toEqual(done.cards);
  },30_000);
  it('retains records, receipts and quota after the actual Postgres process restarts', async () => {
    const owner=`g:${'3'.repeat(64)}` as const;
    const old=await connectFoundationStore(pg.rpc,owner);
    const record={id:crypto.randomUUID(),revision:1,data:{restart:true}};
    await old.write({collection:'discovery',key:'restart',expected:null,next:record});
    const intent={requestId:crypto.randomUUID(),fingerprint:'restart-batch',count:5};
    const b=await old.beginBatch(intent); await old.completeBatch(b.leaseId,[TOPIC_CARDS[0]]);
    await pg.restart();
    const fresh=await connectFoundationStore(pg.rpc,owner);
    expect(await fresh.read('discovery','restart')).toEqual(record);
    expect((await fresh.beginBatch(intent)).cards).toEqual([TOPIC_CARDS[0]]);
    expect(await fresh.cardQuota()).toMatchObject({used:1,reserved:0,remaining:34});
  },30_000);
});
