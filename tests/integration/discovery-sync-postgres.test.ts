import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresFixture } from '../support/postgres';

let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

/** Runs SQL as a signed-in Supabase user (role authenticated + JWT subject), like PostgREST does. */
async function asUser<T>(uid: string | null, sql: string, args: unknown[] = [], claims: object = {}): Promise<T> {
  const client = await pg.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${uid ? 'authenticated' : 'anon'}`);
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)",
      [uid ?? '', JSON.stringify({ sub: uid, ...claims })]);
    const result = await client.query(sql, args);
    await client.query('COMMIT');
    return result.rows[0]?.r as T;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

type Item = { kind: string; itemId: string; payload?: object; deleted?: boolean; updatedAt: string };
type Page = { items: (Item & { seq: number })[]; cursor: number | null };
const push = (uid: string, items: Item[]) => asUser<number>(uid, 'SELECT public.edu_discovery_push($1::jsonb) AS r', [JSON.stringify(items)]);
const pull = (uid: string, after = 0) => asUser<Page>(uid, 'SELECT public.edu_discovery_pull($1) AS r', [after]);
const at = (s: number) => new Date(Date.UTC(2026, 10, 9, 10, 0, s)).toISOString();

describe('discovery sync RPCs (ADR 0008)', () => {
  it('merges newest-wins per item, a removal wins a tie, and the cursor only returns newer rows', async () => {
    expect(await push(ALICE, [
      { kind: 'shortlist', itemId: 'sci-phy-01', updatedAt: at(1) },
      { kind: 'swipe', itemId: 'sci-phy-01', payload: { action: 'like' }, updatedAt: at(1) },
    ])).toBe(2);

    const first = await pull(ALICE);
    expect(first.items.map(i => i.itemId)).toEqual(['sci-phy-01', 'sci-phy-01']);

    // An older copy from another device does not overwrite; a newer removal does.
    expect(await push(ALICE, [{ kind: 'shortlist', itemId: 'sci-phy-01', deleted: true, updatedAt: at(0) }])).toBe(0);
    expect(await push(ALICE, [{ kind: 'shortlist', itemId: 'sci-phy-01', deleted: true, updatedAt: at(1) }])).toBe(1);
    expect(await push(ALICE, [{ kind: 'shortlist', itemId: 'sci-phy-01', deleted: false, updatedAt: at(1) }])).toBe(0);

    const next = await pull(ALICE, first.cursor!);
    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toMatchObject({ kind: 'shortlist', deleted: true });
    expect((await pull(ALICE, next.cursor!)).items).toEqual([]);
  });

  it('keeps accounts apart', async () => {
    await push(BOB, [{ kind: 'idea', itemId: 'idea_1', payload: { text: 'ของบ็อบ' }, updatedAt: at(5) }]);
    expect((await pull(ALICE)).items.some(i => i.itemId === 'idea_1')).toBe(false);
    expect((await pull(BOB)).items.map(i => i.itemId)).toEqual(['idea_1']);
  });

  it('refuses signed-out, anonymous, bad input and far-future clocks', async () => {
    await expect(asUser(null, 'SELECT public.edu_discovery_pull(0) AS r')).rejects.toThrow(/permission denied/);
    await expect(asUser(ALICE, 'SELECT public.edu_discovery_pull(0) AS r', [], { is_anonymous: true })).rejects.toThrow(/AUTH_REQUIRED/);
    await expect(push(ALICE, [{ kind: 'secret', itemId: 'x', updatedAt: at(1) }])).rejects.toThrow(/check constraint/);
    await expect(push(ALICE, [{ kind: 'swipe', itemId: 'x', updatedAt: '2099-01-01T00:00:00Z' }])).rejects.toThrow(/INVALID_TIMESTAMP/);
    await expect(asUser(ALICE, 'SELECT * FROM public.edu_discovery_items')).rejects.toThrow(/permission denied/);
  });

  it('wipes on request and when the web wipe bumps the owner generation', async () => {
    await asUser(ALICE, 'SELECT public.edu_discovery_wipe() AS r');
    expect((await pull(ALICE)).items).toEqual([]);

    await pg.pool.query("INSERT INTO public.edu_owners(owner_key) VALUES ($1)", [`u:${BOB}`]);
    await pg.pool.query('UPDATE public.edu_owners SET generation = generation + 1 WHERE owner_key = $1', [`u:${BOB}`]);
    expect((await pull(BOB)).items).toEqual([]);
  });
});
