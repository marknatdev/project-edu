import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { postgresFixture } from '../support/postgres';
import { connectFoundationStore } from '@/lib/persistence/supabase-store.server';
import { connectLocalFoundationStore } from '@/lib/persistence/sqlite-store.server';
import { generateFreshCards } from '@/lib/discovery/fresh-cards.server';
import { FreshCardsRequestSchema } from '@/lib/discovery/fresh-contract';
import { syntheticDistinct } from '../fixtures/fresh-cards';
import type { FoundationStore } from '@/lib/persistence/contracts';

let pg: Awaited<ReturnType<typeof postgresFixture>>;
let dir: string;
beforeAll(async () => { pg = await postgresFixture(); dir = await mkdtemp(resolve(tmpdir(), 'semantic-')); }, 120_000);
afterAll(async () => { vi.unstubAllEnvs(); await pg?.close(); if (dir) await rm(dir, { recursive: true }); }, 30_000);
const request = () => FreshCardsRequestSchema.parse({ requestId: crypto.randomUUID(), count: 1,
  learner: { gradeLevel: 'm_ton', constraints: { timeWeeks: 6, budgetBaht: 300, equipment: [], teamSize: 2, skills: [] } },
  interest: { answers: [{ question: 'สนใจอะไร', answer: 'ตู้ปลา' }] } });

describe('serialized semantic acceptance (real DBs; injected AI fixture, NOT live AI)', () => {
  it.each(['sqlite', 'postgres'] as const)('%s charges only one simultaneous non-identical water-filter idea', async backend => {
    vi.stubEnv('COACH_DB_PATH', resolve(dir, 'race.sqlite'));
    const owner = `g:${crypto.randomUUID().replaceAll('-', '').repeat(2)}` as const;
    const connect = (): Promise<FoundationStore> => backend === 'sqlite' ? connectLocalFoundationStore(owner) : connectFoundationStore(pg.rpc, owner);
    const base = { ...syntheticDistinct(1)[0], title: 'ตัวกรองน้ำตู้ปลาจากวัสดุเหลือใช้', problem: 'น้ำในตู้ปลาขุ่นเร็วและต้องเปลี่ยนน้ำบ่อย' };
    let arrivals = 0;
    let release!: () => void;
    const gate = new Promise<void>(ok => { release = ok; });
    const ai = vi.fn(async () => {
      const i = arrivals++;
      if (arrivals === 2) release();
      await gate;
      return { ok: true as const, data: { cards: [{ ...base, title: base.title + (i ? 'แบบประหยัด' : '') }] } };
    });
    const intents = [request(), request()];
    const results = await Promise.all(intents.map(async intent => generateFreshCards(await connect(), intent, { ai: ai as never })));
    expect(results.filter(r => r.status === 'ok')).toHaveLength(1);
    expect(results.filter(r => r.status === 'unavailable')).toHaveLength(1);
    expect(await (await connect()).cardQuota()).toMatchObject({ used: 1, reserved: 0, remaining: 34 });
    const replay = await generateFreshCards(await connect(), intents[results.findIndex(r => r.status === 'ok')], { ai: ai as never });
    expect(replay).toMatchObject({ status: 'ok', replayed: true, accepted: 1 });
    expect(ai).toHaveBeenCalledTimes(2);
    expect((await (await connect()).listCards({ limit: 100 })).cards).toHaveLength(1);
  });
});
