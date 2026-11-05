import { describe, it, expect, vi } from 'vitest';
import { fetchAiGeneratedCards } from '@/lib/discovery/ai-cards';
import type { TopicCard } from '@/types/domain';

const mockAiCard: TopicCard = {
  id: 'ai_card_1',
  subjectId: 'computer',
  subfieldId: 'comp_ai_ml',
  title: 'ระบบแยกประเภทขยะด้วยการประมวลผลภาพ',
  phenomenon: 'ขยะพลาสติกและกระดาษปนกันในโรงเรียน',
  curiosityHook: 'ใช้กล้องแยกขยะอัตโนมัติได้ไหม?',
  targetGradeLevels: ['m_ton'],
  difficulty: 'beginner',
  estimatedWeeks: 4,
  estimatedBudgetBaht: 500,
  requiredEquipment: ['กล้องเว็บแคม', 'คอมพิวเตอร์'],
  minTeamSize: 1,
  maxTeamSize: 3,
  requiredSkills: ['Python เบื้องต้น'],
};

describe('Seam 5: AI Card Generation Client Helper (fetchAiGeneratedCards)', () => {
  it('successfully fetches and validates AI-generated cards with verified badge', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        cards: [mockAiCard],
        remaining: 29,
        resetAt: new Date().toISOString(),
      }),
    });

    const result = await fetchAiGeneratedCards({
      anonymousId: 'anon-123',
      subfieldId: 'comp_ai_ml',
      gradeLevel: 'm_ton',
      count: 1,
      fetcher: mockFetch as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    expect(result.cards.length).toBe(1);
    expect(result.cards[0].id).toBe('ai_card_1');
    expect(result.cards[0].isAiGenerated).toBe(true);
    expect(result.cards[0].verified).toBe(true);
    expect(result.remaining).toBe(29);
  });

  it('handles 429 quota exceeded with plain-Thai notice and no crash', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Quota exceeded',
        messageTh: 'คุณใช้โควตาสร้างการ์ดหัวข้อด้วย AI ครบจำนวน 30 ใบสำหรับวันนี้แล้ว',
        remaining: 0,
        resetAt: new Date().toISOString(),
      }),
    });

    const result = await fetchAiGeneratedCards({
      anonymousId: 'anon-123',
      subfieldId: 'comp_ai_ml',
      gradeLevel: 'm_ton',
      fetcher: mockFetch as unknown as typeof fetch,
    });

    expect(result.success).toBe(false);
    expect(result.quotaExceeded).toBe(true);
    expect(result.messageTh).toContain('ครบจำนวน 30 ใบ');
    expect(result.cards).toEqual([]);
  });

  it('handles network / gateway failure gracefully with informative Thai error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchAiGeneratedCards({
      anonymousId: 'anon-123',
      subfieldId: 'comp_ai_ml',
      gradeLevel: 'm_ton',
      fetcher: mockFetch as unknown as typeof fetch,
    });

    expect(result.success).toBe(false);
    expect(result.cards).toEqual([]);
    expect(result.messageTh).toContain('ไม่สามารถเชื่อมต่อ');
  });
});
