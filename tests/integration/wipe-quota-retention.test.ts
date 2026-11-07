import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { connectLocalFoundationStore } from '@/lib/persistence/sqlite-store.server';
import { connectFoundationStore } from '@/lib/persistence/supabase-store.server';
import type { FoundationStore, OwnerKey } from '@/lib/persistence/contracts';
import { TOPIC_CARDS } from '@/data/topic-cards';
import { postgresFixture } from '../support/postgres';

// Review M3: an explicit project-data wipe erases learner content and advances
// the owner generation, but must NOT renew the same account's daily AI
// allowances (evaluate 5, proposal 2, cards 35). Real SQLite and real PG17.
let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);

describe.each(['sqlite', 'postgres'] as const)('wipe keeps same-day quota counters (%s)', backend => {
  let dir: string;
  const connect = (owner: OwnerKey) => backend === 'sqlite' ? connectLocalFoundationStore(owner) : connectFoundationStore(pg.rpc, owner);
  const consume = (s: FoundationStore, kind: 'evaluate' | 'proposal') => s.consumeQuota({ kind, requestId: randomUUID(), fingerprint: 'synthetic' });
  /** Storage-at-rest view: which quota counters remain for an owner (counts only). */
  async function storedQuota(owner: OwnerKey): Promise<{ key: string; used: number; reserved: number }[]> {
    if (backend === 'postgres') {
      const { rows } = await pg.pool.query('SELECT quota_day::text AS day, kind, used, reserved FROM public.edu_daily_quota WHERE owner_key=$1 ORDER BY 1,2', [owner]);
      return rows.map(r => ({ key: `${r.day}:${r.kind}`, used: r.used, reserved: r.reserved }));
    }
    const db = new DatabaseSync(resolve(dir, 'foundation.sqlite'));
    try {
      const row = db.prepare('SELECT data FROM foundation_owners WHERE owner=?').get(owner);
      const quotas: Record<string, { used: number; reserved: number }> = row ? JSON.parse(String(row.data)).quotas : {};
      return Object.entries(quotas).sort().map(([key, q]) => ({ key, used: q.used, reserved: q.reserved }));
    } finally { db.close(); }
  }
  beforeEach(() => {
    dir = mkdtempSync(resolve(process.env.TMPDIR ?? '.local', 'wipe-quota-'));
    vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it('account wipe erases content and fences old writers, but cannot renew evaluate/proposal/card allowances', async () => {
    const owner: OwnerKey = `u:${randomUUID()}`;
    const old = await connect(owner);
    await old.write({ collection: 'discovery', key: 'answers', expected: null, next: { id: randomUUID(), revision: 1, data: { answers: ['solar'] } } });
    for (let i = 0; i < 5; i++) expect((await consume(old, 'evaluate')).allowed).toBe(true);
    for (let i = 0; i < 2; i++) expect((await consume(old, 'proposal')).allowed).toBe(true);
    const done = await old.beginBatch({ requestId: randomUUID(), fingerprint: 'synthetic', count: 5 });
    await old.completeBatch(done.leaseId, TOPIC_CARDS.slice(0, 3));
    const pending = await old.beginBatch({ requestId: randomUUID(), fingerprint: 'synthetic', count: 5 });
    expect(await old.cardQuota()).toMatchObject({ used: 3, reserved: 5 });

    await old.wipe();

    // Wipe generation still advances: old adapter and in-flight lease are rejected.
    await expect(old.read('discovery', 'answers')).rejects.toMatchObject({ status: 410 });
    await expect(old.completeBatch(pending.leaseId, [TOPIC_CARDS[5]])).rejects.toMatchObject({ status: 410 });
    const fresh = await connect(owner);
    // Learner content is erased.
    expect(await fresh.read('discovery', 'answers')).toBeNull();
    expect((await fresh.listCards({ limit: 100 })).cards).toEqual([]);
    // Same-day counters survive; the abandoned reservation is released, never charged.
    expect(await fresh.quotaStatus('evaluate')).toMatchObject({ used: 5, remaining: 0 });
    expect(await fresh.quotaStatus('proposal')).toMatchObject({ used: 2, remaining: 0 });
    expect(await fresh.cardQuota()).toMatchObject({ used: 3, reserved: 0, remaining: 32 });
    expect(await consume(fresh, 'evaluate')).toMatchObject({ allowed: false, used: 5, remaining: 0 });
    expect(await consume(fresh, 'proposal')).toMatchObject({ allowed: false, used: 2, remaining: 0 });
    // Repeated wipes do not renew either.
    await fresh.wipe();
    const again = await connect(owner);
    expect(await again.quotaStatus('evaluate')).toMatchObject({ used: 5, remaining: 0 });
    expect(await again.cardQuota()).toMatchObject({ used: 3, reserved: 0 });
    // At rest only numeric counters remain for this owner.
    for (const row of await storedQuota(owner)) expect(Object.keys(row).sort()).toEqual(['key', 'reserved', 'used']);
  });

  it('wipe drops previous-day counters (not needed for enforcement) and leaves no counters for a revoked guest', async () => {
    const owner: OwnerKey = `u:${randomUUID()}`;
    const s = await connect(owner);
    await consume(s, 'evaluate');
    const today = (await storedQuota(owner)).map(r => r.key);
    expect(today).toHaveLength(1);
    // Synthetic stale counter from an earlier Bangkok day.
    if (backend === 'postgres') {
      await pg.pool.query("INSERT INTO public.edu_daily_quota(owner_key,quota_day,kind,used) VALUES($1,public.edu_bangkok_day()-1,'evaluate',4)", [owner]);
    } else {
      const db = new DatabaseSync(resolve(dir, 'foundation.sqlite'));
      try {
        const state = JSON.parse(String(db.prepare('SELECT data FROM foundation_owners WHERE owner=?').get(owner)!.data));
        state.quotas['2000-01-01:evaluate'] = { used: 4, reserved: 0 };
        db.prepare('UPDATE foundation_owners SET data=? WHERE owner=?').run(JSON.stringify(state), owner);
      } finally { db.close(); }
    }
    expect(await storedQuota(owner)).toHaveLength(2);
    await s.wipe();
    expect((await storedQuota(owner)).map(r => r.key)).toEqual(today);

    // A wiped Guest capability is permanently revoked; a replacement Guest is a
    // different owner, so its counters cannot be carried and are not retained.
    const guest: OwnerKey = `g:${randomUUID().replaceAll('-', '').repeat(2)}`;
    const g = await connect(guest);
    await consume(g, 'evaluate');
    await g.wipe();
    await expect(connect(guest)).rejects.toMatchObject({ status: 410 });
    expect(await storedQuota(guest)).toEqual([]);
  });
});
