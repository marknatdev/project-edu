import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { POST as cards } from '@/app/api/discovery/cards/route';
import { POST as coach } from '@/app/api/ai/coach/route';
import { mockUpstream, candidate } from '../fixtures/fresh-cards';

// D4: a selected generated card enters per-topic coaching with its real
// context. Card generation upstream is a MOCKED fetch (hand-written sample,
// NOT live AI). Coaching runs with AI unconfigured: its documented
// deterministic server fallback, also NOT live AI.
let dir: string;
beforeEach(() => {
  dir = resolve('.local/discovery-handoff-tests', crypto.randomUUID());
  mkdirSync(dir, { recursive: true });
  vi.stubEnv('COACH_DB_PATH', resolve(dir, 'foundation.sqlite'));
  vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1');
  vi.stubEnv('AI_API_KEY', 'synthetic-test-key');
  vi.stubEnv('AI_MODEL', 'mock-model');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); rmSync(dir, { recursive: true, force: true }); });

async function generate(cookie = '') {
  const response = await cards(new Request('http://localhost/api/discovery/cards', { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ requestId: crypto.randomUUID(), count: 2,
      learner: { gradeLevel: 'm_plai', goal: 'classroom', constraints: { timeWeeks: 6, budgetBaht: 500, equipment: ['มือถือ'], teamSize: 2, skills: [] } },
      interest: { answers: [{ question: 'สนใจเรื่องอะไร', answer: 'ตู้ปลาที่บ้าน' }] } }) }));
  return { data: await response.json(), cookie: cookie || response.headers.get('set-cookie')!.split(';')[0] };
}
async function coachCall(cookie: string, body: unknown) {
  const response = await coach(new Request('http://localhost/api/ai/coach', { method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) }));
  return { status: response.status, data: await response.json() };
}

describe('generated card → per-topic coaching handoff (D4)', () => {
  it('opens coaching from the generated card’s own problem, rough direction and interest link, isolated per card topic', async () => {
    mockUpstream(() => ({ cards: [
      candidate({ title: 'ตัวกรองน้ำตู้ปลาจากกะลามะพร้าว', problem: 'น้ำในตู้ปลาขุ่นเร็ว', roughDirection: 'เทียบความใสของน้ำเมื่อใช้วัสดุกรองสามแบบ', interestLink: 'ต่อจากตู้ปลาที่บ้าน' }),
      candidate({ title: 'แอปบันทึกเวลาให้อาหารปลา', problem: 'ลืมให้อาหารปลาหรือให้ซ้ำ', roughDirection: 'ออกแบบหน้าจอบันทึกแล้วทดลองใช้หนึ่งสัปดาห์', interestLink: 'ต่อจากการเลี้ยงปลา', subfieldId: 'comp_software_app' }),
    ] }));
    const { data, cookie } = await generate();
    expect(data.status).toBe('ok');
    const [first, second] = data.cards;
    vi.stubEnv('AI_BASE_URL', ''); // coaching: documented offline guidance (not live AI)
    const context = (topicCard: unknown) => ({ track: 'discovery_track', gradeLevel: 'm_plai', goal: 'classroom',
      constraints: { timeWeeks: 6, budgetBaht: 500, equipment: ['มือถือ'], teamSize: 2, skills: [] }, topicCard });
    const a = await coachCall(cookie, { action: 'open', topicKey: `card:${first.id}`, context: context(first) });
    expect(a.status).toBe(200);
    const opening = a.data.conversation.turn.content as string;
    expect(opening).toContain('ตัวกรองน้ำตู้ปลาจากกะลามะพร้าว');
    expect(opening).toContain('น้ำในตู้ปลาขุ่นเร็ว');
    expect(opening).toContain('เทียบความใสของน้ำเมื่อใช้วัสดุกรองสามแบบ');
    expect(opening).toContain('ต่อจากตู้ปลาที่บ้าน');
    // Tier gates preserved: a first-turn Tier-3 request is downgraded, never examples.
    const early = await coachCall(cookie, { action: 'turn', conversationId: a.data.conversation.id, revision: a.data.conversation.revision,
      requestId: crypto.randomUUID(), requestedTier: 3 });
    expect(early.data.turn.tier).not.toBe(3);
    expect(early.data.turn.examples ?? []).toHaveLength(0);
    // A second generated card is its own conversation with its own context and fresh gates.
    const b = await coachCall(cookie, { action: 'open', topicKey: `card:${second.id}`, context: context(second) });
    expect(b.data.conversation.id).not.toBe(a.data.conversation.id);
    expect(b.data.conversation.turn.content).toContain('ออกแบบหน้าจอบันทึกแล้วทดลองใช้หนึ่งสัปดาห์');
    expect(b.data.conversation.turn.content).not.toContain('กะลามะพร้าว');
    expect(b.data.conversation.state.history).toHaveLength(1);
  });
});
