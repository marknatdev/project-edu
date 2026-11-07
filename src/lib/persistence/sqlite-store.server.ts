import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PersistenceError, type FoundationStore, type OwnerKey, type RecordSnapshot, type CardBatch, type CardQuota } from './contracts';
import { requiresCloudPersistence } from './config';
import { acceptedCardCandidates, semanticRepeat } from './cards.server';
import { batchLeaseSeconds } from './lease.server';
import type { TopicCard } from '@/types/domain';

type Receipt = { fingerprint: string; key: string; id: string };
type Batch = Omit<CardBatch, 'claimed' | 'quota'> & { fingerprint: string; capacity: number; day: string; expired?:boolean };
type State = { epoch: number; revoked: boolean; records: Record<string, RecordSnapshot>; receipts: Record<string, Receipt>;
  quotas: Record<string, { used: number; reserved: number }>; batches: Record<string, Batch>; seen: Record<string, TopicCard>; quotaReceipts: Record<string, { fingerprint: string; count:number; result: { allowed: boolean; used: number; remaining: number; resetAt: string } }> };
const freshState = (): State => ({ epoch: 1, revoked: false, records: {}, receipts: {}, quotas: {}, batches: {}, seen: {}, quotaReceipts: {} });
const fail = (status: number): never => { throw new PersistenceError(status, `PERSISTENCE_${status}`); };
function day(now: Date) { return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0,10); }
function resetAt(date: string) { return new Date(new Date(date + 'T17:00:00Z').getTime()).toISOString(); }
function quota(state: State, date: string): CardQuota {
  const q = state.quotas[date + ':cards'] ?? { used: 0, reserved: 0 };
  return { day: date, ...q, remaining: 35-q.used-q.reserved, freeRemaining: Math.max(0,5-q.used), extraRemaining: 30-Math.max(0,q.used-5), resetAt: resetAt(date) };
}
/** Local-only durable adapter. One SQLite transaction/owner document per mutation,
 * no process-global state. Mirrors cloud contract; NEVER imported as a fallback. */
export async function connectLocalFoundationStore(owner: OwnerKey, now: () => Date = () => new Date()): Promise<FoundationStore> {
  if (requiresCloudPersistence()) throw new PersistenceError(503, 'PERSISTENCE_UNAVAILABLE');
  const path = resolve(process.env.COACH_DB_PATH || '.local/coaching/conversations.sqlite');
  const transact = <T>(fn: (state: State, db:DatabaseSync) => T, expectedEpoch?: number): T => {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(path);
    try {
      db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS foundation_owners(owner TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS foundation_rates(bucket TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL);');
      db.exec('BEGIN IMMEDIATE');
      const row = db.prepare('SELECT data FROM foundation_owners WHERE owner=?').get(owner);
      const state: State = row ? JSON.parse(String(row.data)) : freshState();
      // One-time non-destructive import of existing DEF-01 local conversations.
      if (!row && db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='conversations'").get()) {
        const legacyOwner = owner.startsWith('g:') ? owner.slice(2) : owner;
        if (db.prepare('SELECT 1 FROM revoked_owners WHERE owner=?').get(legacyOwner)) state.revoked = true;
        for (const old of db.prepare('SELECT data FROM conversations WHERE owner=?').all(legacyOwner)) {
          const data = JSON.parse(String(old.data));
          state.records['coaching:' + data.topicKey] = { id: data.id, revision: data.revision, data };
        }
      }
      if (state.revoked || expectedEpoch !== undefined && expectedEpoch !== state.epoch) fail(410);
      for (const b of Object.values(state.batches)) if (b.state==='pending' && Date.parse(b.leaseExpiresAt)<=now().getTime()) {
        state.quotas[b.day+':cards'].reserved-=b.capacity;b.state='failed';b.expired=true;
      }
      const result = fn(state,db);
      db.prepare('INSERT INTO foundation_owners(owner,data) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data').run(owner, JSON.stringify(state));
      db.exec('COMMIT'); return result;
    } catch (error) { try { db.exec('ROLLBACK'); } catch {} throw error; }
    finally { db.close(); }
  };
  const epoch = transact(s => s.epoch);
  const run = <T>(fn: (s: State, db:DatabaseSync) => T) => transact(fn, epoch);
  const batchView = (s: State, b: Batch, claimed = false): CardBatch => ({ requestId: b.requestId, leaseId: b.leaseId, leaseExpiresAt:b.leaseExpiresAt, claimed, state: b.state,
    reserved: b.state === 'pending' ? b.capacity : 0, cards: b.cards, quota: quota(s,b.day) });
  const finish = (leaseId: string, cards: TopicCard[]): CardBatch => run(s => {
    const b = Object.values(s.batches).find(b => b.leaseId === leaseId); if (!b) return fail(404);
    if (b.expired) fail(409);
    if (b.state === 'pending') {
      for (const { fingerprint, card } of acceptedCardCandidates(cards)) {
        if (b.cards.length >= b.capacity) break;
        if (s.seen[fingerprint] || Object.values(s.seen).some(x => x.id === card.id) || semanticRepeat(card, Object.values(s.seen))) continue;
        s.seen[fingerprint] = card; b.cards.push(card);
      }
      const q = s.quotas[b.day + ':cards']; q.reserved -= b.capacity; q.used += b.cards.length;
      b.state = b.cards.length ? 'complete' : 'failed';
    }
    return batchView(s,b);
  });
  return {
    async read(collection,key) { return run(s => s.records[collection + ':' + key] ?? null); },
    async readById(collection,id) { return run(s => Object.entries(s.records).find(([key,row]) => key.startsWith(collection + ':') && row.id === id)?.[1] ?? null); },
    async write(input) { return run(s => {
      const key = input.collection + ':' + input.key, current = s.records[key];
      const receiptKey = input.collection + ':' + input.receipt?.id, receipt = s.receipts[receiptKey];
      if (input.receipt && receipt) {
        if (receipt.fingerprint !== input.receipt.fingerprint || receipt.key !== key || current?.id !== receipt.id) fail(409);
        return current;
      }
      if (!input.expected && current) return current;
      if (input.expected && (!current || current.id !== input.expected.id || input.expected.revision !== null && current.revision !== input.expected.revision)) fail(409);
      if (!input.expected || input.expected.revision === null) {
        if (input.next.revision !== 1 || current?.id === input.next.id) fail(400);
      } else if (input.next.revision !== current.revision+1 || input.next.id !== current.id) fail(400);
      s.records[key] = input.next;
      if (input.receipt) s.receipts[receiptKey] = { fingerprint: input.receipt.fingerprint, key, id: input.next.id };
      return input.next;
    }); },
    async wipe() { run((s,db) => {
      const next = freshState(); next.epoch = s.epoch+1; next.revoked = owner.startsWith('g:');
      // Erase content, but keep the same account's today counters (numbers only)
      // so a wipe cannot renew daily AI allowances. Abandoned reservations are
      // released (their batches are erased); a revoked Guest keeps nothing.
      const today = day(now()) + ':';
      if (!next.revoked) for (const [key, q] of Object.entries(s.quotas)) if (key.startsWith(today)) next.quotas[key] = { used: q.used, reserved: 0 };
      Object.assign(s,next);
      // Remove legacy copies in the SAME transaction, retaining revocation.
        if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='conversations'").get()) {
          const legacy = owner.startsWith('g:') ? owner.slice(2) : owner;
          db.prepare('INSERT OR IGNORE INTO revoked_owners(owner) VALUES(?)').run(legacy);
          db.prepare('DELETE FROM conversations WHERE owner=?').run(legacy);
        }
    });
      const db = new DatabaseSync(path); try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } finally { db.close(); }
    },
    async cardQuota() { return run(s => quota(s,day(now()))); },
    async allowRequest(kind) { return run((_s,db)=>{
      const current=now().getTime(),seconds=kind==='auth'?600:60,ownerLimit=kind==='coach'||kind==='pivot'?12:6,globalLimit=kind==='auth'?30:60;
      db.prepare('DELETE FROM foundation_rates WHERE expires<=?').run(current);
      const take=(bucket:string,limit:number,window:number)=>{
        const existing=db.prepare('SELECT used FROM foundation_rates WHERE bucket=?').get(bucket);
        if (existing&&Number(existing.used)>=limit) return false;
        db.prepare('INSERT INTO foundation_rates VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET used=used+1').run(bucket,current+window*1000);return true;
      };
      return take(kind+':'+owner,ownerLimit,seconds)&&take(kind+':global',globalLimit,60);
    }); },
    async quotaStatus(kind) { return run(s => { const date=day(now()),limit=kind==='evaluate'?5:2,used=s.quotas[date+':'+kind]?.used??0;
      return {used,remaining:limit-used,limit,resetAt:resetAt(date)}; }); },
    async listCards({limit,cursor}) { return run(s => {
      if (!Number.isInteger(limit)||limit<1||limit>100) fail(400);
      const keys=Object.keys(s.seen).sort().filter(key=>!cursor||key>cursor), page=keys.slice(0,limit);
      return {cards:page.map(key=>s.seen[key]),nextCursor:keys.length>limit?page[page.length-1]:null};
    }); },
    async beginBatch(input) { return run(s => {
      let b = s.batches[input.requestId];
      if (b) { if (b.fingerprint !== input.fingerprint || b.capacity !== input.count) fail(409); if (!b.expired) return batchView(s,b); }
      if (!Number.isInteger(input.count) || input.count < 1 || input.count > 5) fail(400);
      const date = day(now()), q = s.quotas[date + ':cards'] ??= { used: 0, reserved: 0 };
      if (q.used + q.reserved + input.count > 35) fail(429);
      q.reserved += input.count;
      b = s.batches[input.requestId] = { ...input, capacity: input.count, leaseId: randomUUID(),leaseExpiresAt:new Date(now().getTime()+batchLeaseSeconds()*1000).toISOString(), day: date, reserved: input.count, state: 'pending', cards: [] };
      return batchView(s,b,true);
    }); },
    async completeBatch(leaseId,cards) { return finish(leaseId,cards); },
    async failBatch(leaseId) { return finish(leaseId,[]); },
    async consumeQuota(input) { return run(s => {
      const key = input.kind + ':' + input.requestId, receipt = s.quotaReceipts[key];
      if (receipt) { if (receipt.fingerprint !== input.fingerprint || receipt.count !== (input.count??1)) fail(409); return receipt.result; }
      const date = day(now()), count = input.count ?? 1, limit = input.kind === 'evaluate' ? 5 : 2;
      if (!Number.isInteger(count) || count < 1) fail(400);
      const q = s.quotas[date + ':' + input.kind] ??= { used: 0, reserved: 0 };
      const allowed = q.used + count <= limit; if (allowed) q.used += count;
      const result = { allowed, used: q.used, remaining: limit-q.used, resetAt: resetAt(date) };
      s.quotaReceipts[key] = { fingerprint: input.fingerprint, count, result }; return result;
    }); },
  };
}
