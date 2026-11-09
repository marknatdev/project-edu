import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { postgresFixture } from '../support/postgres';
import { createHandler, FoundationError, toCard } from '../../supabase/functions/ai-topic-cards/handler';

let pg: Awaited<ReturnType<typeof postgresFixture>>;
beforeAll(async () => { pg = await postgresFixture(); }, 120_000);
afterAll(async () => { if (pg) await pg.close(); }, 30_000);

const UID = '33333333-3333-4333-8333-333333333333';
const OWNER = `u:${UID}`;

const call = async (name: string, args: Record<string, unknown>) => {
  const { data, error } = await pg.rpc.rpc(name, args);
  if (error) throw new FoundationError(error.message);
  return data;
};

const card = (title: string, extra: object = {}) => ({
  title, problem: `ปัญหาที่สังเกตได้เกี่ยวกับ${title}ในโรงเรียน`, curiosityHook: `ถ้าเปลี่ยน${title}จะเกิดอะไรขึ้น?`,
  difficulty: 'beginner', estimatedWeeks: 6, estimatedBudgetBaht: 400, requiredEquipment: ['เทอร์โมมิเตอร์'],
  minTeamSize: 1, maxTeamSize: 3, requiredSkills: ['การจดบันทึก'], ...extra,
});

function handler(model: () => Response | Promise<Response>) {
  return createHandler({
    getUser: async t => (t === 'good' ? { id: UID, isAnonymous: false } : null),
    bindOwner: async owner => (await call('edu_bind_owner', { p_owner: owner })) as number,
    foundation: (owner, epoch, op, input) => call('edu_foundation', { p_owner: owner, p_epoch: epoch, p_op: op, p_input: input }),
    fetchImpl: (async () => model()) as unknown as typeof fetch,
    randomUUID,
    now: () => new Date('2026-11-09T10:00:00Z'),
    env: { baseUrl: 'https://omni.example/v1', apiKey: 'k', model: 'm' },
  });
}

const modelReturns = (cards: unknown[]) => () =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ cards }) } }] }), { status: 200 });

const request = (body: object = { subfieldId: 'sci_physics', subfieldName: 'ฟิสิกส์', gradeLevel: 'm_plai', interest: 'หลังคา' }, token = 'good') =>
  new Request('https://fn.example/ai-topic-cards', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) });

const quota = async () => {
  const epoch = (await call('edu_bind_owner', { p_owner: OWNER })) as number;
  return (await call('edu_foundation', { p_owner: OWNER, p_epoch: epoch, p_op: 'cardQuota', p_input: {} })) as { used: number; reserved: number };
};

describe('ai-topic-cards edge handler against the shared card quota', () => {
  it('rejects signed-out learners before touching quota', async () => {
    const res = await handler(modelReturns([]))(request(undefined, 'bad'));
    expect(res.status).toBe(401);
  });

  it('charges only accepted cards, stores them in the shared ledger, and drops cards with references', async () => {
    const res = await handler(modelReturns([
      card('ความร้อนใต้หลังคาจาก'),
      card('ฝุ่นบนแผงโซลาร์เซลล์'),
      card('เสียงสะท้อนในห้องเรียน', { requiredSkills: ['อ่าน https://example.com'] }),
    ]))(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cards.map((c: { title: string }) => c.title)).toEqual(['ความร้อนใต้หลังคาจาก', 'ฝุ่นบนแผงโซลาร์เซลล์']);
    expect(body.cards[0]).toMatchObject({ subjectId: 'science', subfieldId: 'sci_physics', starter: { origin: 'ai_fresh', noveltyChecked: false } });
    expect(await quota()).toMatchObject({ used: 2, reserved: 0 });
  });

  it('does not charge when every card repeats one the learner already has', async () => {
    const res = await handler(modelReturns([card('ความร้อนใต้หลังคาจาก')]))(request());
    expect(res.status).toBe(502);
    expect(await quota()).toMatchObject({ used: 2, reserved: 0 });
  });

  it('does not charge when the model fails', async () => {
    const res = await handler(() => new Response('boom', { status: 500 }))(request());
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('boom');
    expect(await quota()).toMatchObject({ used: 2, reserved: 0 });
  });

  it('returns 429 once the day quota (shared with the web) is used up', async () => {
    await pg.pool.query("UPDATE public.edu_daily_quota SET used = 35 WHERE owner_key = $1 AND kind = 'cards'", [OWNER]);
    const res = await handler(modelReturns([card('ไอเดียใหม่')]))(request());
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('QUOTA_EXCEEDED');
  });

  it('validates candidates', () => {
    const ctx = { subfieldId: 'sci_physics', gradeLevel: 'm_ton', requestId: 'r', generatedAt: 'now', id: 'x' };
    expect(toCard(card('ok'), ctx)).not.toBeNull();
    expect(toCard(card('ok', { minTeamSize: 4, maxTeamSize: 2 }), ctx)).toBeNull();
    expect(toCard(card('ok', { difficulty: 'easy' }), ctx)).toBeNull();
    expect(toCard(card('ok', { curiosityHook: 'งานนี้ไม่มีใครทำ' }), ctx)).toBeNull();
  });
});
