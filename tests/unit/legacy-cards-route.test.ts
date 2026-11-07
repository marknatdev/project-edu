import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ai/cards/generate/route';
import { quotaStore } from '@/lib/ai/quota';

// S5: legacy seed-deck endpoint (local dev only; production-gated). Upstream is
// a MOCKED fetch where configured — NOT live AI evidence.
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const call = (anonymousId: string) => POST(new Request('http://localhost/api/ai/cards/generate', { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anonymousId, subfieldId: 'sci_physics', gradeLevel: 'm_plai', count: 2 }) }));

describe('legacy POST /api/ai/cards/generate (S5)', () => {
  it('never returns template cards as AI output and charges nothing when AI is unavailable', async () => {
    vi.stubEnv('AI_BASE_URL', '');
    const id = 'legacy-' + crypto.randomUUID();
    const response = await call(id);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.cards ?? []).toEqual([]);
    expect(data.messageTh).toMatch(/สร้างการ์ด.*ไม่ได้/);
    expect((await quotaStore.check(id, 'cards')).used).toBe(0);
  });

  it('charges only the AI cards actually returned when configured', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://mock-upstream.invalid/v1'); vi.stubEnv('AI_API_KEY', 'synthetic'); vi.stubEnv('AI_MODEL', 'mock');
    const card = { title: 'ชิงช้าสวรรค์จำลองกับแรงหนีศูนย์กลาง', phenomenon: 'ของในรถเหวี่ยงตอนเลี้ยว', curiosityHook: 'แรงเหวี่ยงขึ้นกับอะไร',
      difficulty: 'intermediate', estimatedWeeks: 4, estimatedBudgetBaht: 300, requiredEquipment: ['มือถือ'], minTeamSize: 1, maxTeamSize: 2, requiredSkills: ['วัดเวลา'] };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ cards: [card] }) } }] })));
    const id = 'legacy-' + crypto.randomUUID();
    const response = await call(id);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({ source: 'ai' });
    expect(data.cards).toHaveLength(1);
    expect((await quotaStore.check(id, 'cards')).used).toBe(1);
  });
});
