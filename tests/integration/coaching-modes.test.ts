import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST } from '@/app/api/ai/coach/route';
import { PRIOR_WORK } from '@/data/prior-work';
import { matchPriorWork, resolveMode, stripLinks } from '@/lib/ai/coach-modes';
import { createInitialCoachState, nextCoachTurn } from '@/lib/ai/socratic-coach';

// ADR 0004: chat modes replace the tier ladder for /api/ai/coach. Real route +
// local durable store; AI unconfigured => deterministic server fallback.
let testDir: string;
beforeEach(() => {
  testDir = resolve('.local/coaching-tests', crypto.randomUUID());
  mkdirSync(testDir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(testDir, 'conversations.sqlite'));
  vi.stubEnv('AI_BASE_URL', '');
});
afterEach(() => { rmSync(testDir, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function client() {
  let cookie = '';
  const call = async (body: object) => {
    const response = await POST(new Request('http://localhost/api/ai/coach', { method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) }));
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
    return { status: response.status, data: await response.json() };
  };
  return {
    call,
    open: () => call({ action: 'open', topicKey: 'idea:modes', context: { track: 'idea_track', gradeLevel: 'm_ton', goal: 'curiosity',
      ownIdea: { id: 'i1', title: 'ระบบ IoT รดน้ำในแปลงเกษตร', description: 'ใช้เซนเซอร์ความชื้นดินควบคุมการรดน้ำ' } } }),
    turn: (current: { conversation: { id: string; revision: number } }, extra: object) => call({ action: 'turn',
      conversationId: current.conversation.id, revision: current.conversation.revision, requestId: crypto.randomUUID(), ...extra }),
  };
}

describe('ADR 0004 coaching chat modes', () => {
  it('auto picks a mode from the message; explicit modes win', () => {
    expect(resolveMode('auto', 'มีใครเคยทำเรื่องคล้ายกันไหม')).toBe('research');
    expect(resolveMode('auto', 'คิดไม่ออก ช่วยคิดไอเดียหน่อย')).toBe('ideate');
    expect(resolveMode('auto', 'วัดความสูงทุกเช้า')).toBe('ask');
    expect(resolveMode(undefined, undefined)).toBe('ask');
    expect(resolveMode('ideate', 'มีใครเคยทำไหม')).toBe('ideate');
  });

  it('strips model links so research never cites a source outside the curated list', () => {
    expect(stripLinks('อ่านที่ https://fake.example/paper และ www.made-up.org/x หรือ journal.ac.th/abc นะ')).not.toMatch(/https?:|www\.|\.ac\.th|\.org/);
    expect(stripLinks('วัดความสูงของต้น')).toBe('วัดความสูงของต้น');
  });

  it('matches only curated prior work ids', () => {
    const ids = matchPriorWork({ text: 'IoT รดน้ำ smart farm เซนเซอร์' });
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(PRIOR_WORK.some(w => w.id === id)).toBe(true);
  });

  it('research mode returns curated ids and no links even when the model invents sources', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://ai.example.com/v1'); vi.stubEnv('AI_API_KEY', 'synthetic'); vi.stubEnv('AI_MODEL', 'synthetic');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({
      content: 'อ่านงาน “Fake Study 2099” ที่ https://invented.example/paper', lenses: ['ค้นที่ www.invented.org'] }) } }] })));
    const state = createInitialCoachState('guest', 'idea:x');
    const turn = await nextCoachTurn(state, { mode: 'research', learnerResponse: 'มีใครเคยทำ IoT รดน้ำแปลงเกษตรไหม', ideaContext: { title: 'IoT รดน้ำ smart farm' } });
    expect(turn.mode).toBe('research');
    expect(turn.source).toBe('ai'); // the invented links really came from the model and were removed
    expect(JSON.stringify(turn)).not.toMatch(/https?:\/\/|www\./);
    for (const id of turn.priorWorkIds ?? []) expect(PRIOR_WORK.some(w => w.id === id)).toBe(true);
  });

  it('ideate gives starting points immediately with no tier unlock, and they go through the own-words step', async () => {
    const c = client();
    const opened = await c.open();
    expect(opened.status).toBe(200);
    const idea = await c.turn(opened.data, { mode: 'ideate', learnerResponse: 'คิดไม่ออก' });
    expect(idea.status).toBe(200);
    expect(idea.data.turn.mode).toBe('ideate');
    expect(idea.data.turn.examples.length).toBeGreaterThan(0);
    // Stored as a tier-3 example turn, which the chat reducer routes into the RewriteGate.
    expect(idea.data.conversation.state.history.at(-1)).toMatchObject({ mode: 'ideate', tier: 3 });
  });

  it('modes are part of the idempotency fingerprint and stale revisions still conflict', async () => {
    const c = client();
    const opened = await c.open();
    const requestId = crypto.randomUUID();
    const body = { action: 'turn', conversationId: opened.data.conversation.id, revision: opened.data.conversation.revision, requestId };
    expect((await c.call({ ...body, mode: 'ask', learnerResponse: 'ก' })).status).toBe(200);
    expect((await c.call({ ...body, mode: 'ask', learnerResponse: 'ก' })).status).toBe(200);
    expect((await c.call({ ...body, mode: 'research', learnerResponse: 'ก' })).status).toBe(409);
    expect((await c.call({ ...body, requestId: crypto.randomUUID(), mode: 'ask' })).status).toBe(409);
  });

  it('rejects unknown modes', async () => {
    const c = client();
    const opened = await c.open();
    expect((await c.turn(opened.data, { mode: 'answer-for-me' })).status).toBe(400);
  });
});
