import { describe, it, expect } from 'vitest';
import { buildDiscoveryDeck } from '@/lib/discovery/deck';
import type { TopicCard, Constraints } from '@/types/domain';

const sampleCards: TopicCard[] = [
  {
    id: 'sci_phys_1',
    subjectId: 'science',
    subfieldId: 'sci_physics',
    title: 'พลังงานคลื่นเสียง',
    phenomenon: 'เสียงดังทำให้กระจกสั่น',
    curiosityHook: 'เปลี่ยนเสียงเป็นพลังงานได้ไหม?',
    targetGradeLevels: ['m_ton', 'm_plai'],
    difficulty: 'beginner',
    estimatedWeeks: 4,
    estimatedBudgetBaht: 500,
    requiredEquipment: ['ลำโพง', 'ไมโครโฟน'],
    minTeamSize: 1,
    maxTeamSize: 3,
    requiredSkills: ['การต่อวงจรพื้นฐาน'],
  },
  {
    id: 'sci_chem_1',
    subjectId: 'science',
    subfieldId: 'sci_chemistry',
    title: 'พอลิเมอร์จากเปลือกส้ม',
    phenomenon: 'เปลือกส้มมีสารเพกทิน',
    curiosityHook: 'ทำพลาสติกย่อยสลายได้จากขยะส้ม?',
    targetGradeLevels: ['m_plai'],
    difficulty: 'intermediate',
    estimatedWeeks: 8,
    estimatedBudgetBaht: 1500,
    requiredEquipment: ['บีกเกอร์', 'เตาให้ความร้อน'],
    minTeamSize: 2,
    maxTeamSize: 3,
    requiredSkills: ['การสกัดสาร'],
  },
  {
    id: 'sci_bio_1',
    subjectId: 'science',
    subfieldId: 'sci_biology',
    title: 'การเจริญเติบโตของแหนเป็ด',
    phenomenon: 'แหนเป็ดโตเร็วมากในน้ำขัง',
    curiosityHook: 'บำบัดน้ำเสียด้วยแหนเป็ดได้ไหม?',
    targetGradeLevels: ['m_ton'],
    difficulty: 'beginner',
    estimatedWeeks: 3,
    estimatedBudgetBaht: 300,
    requiredEquipment: ['กะละมัง', 'น้ำตัวอย่าง'],
    minTeamSize: 1,
    maxTeamSize: 2,
    requiredSkills: ['การบันทึกผล'],
  },
  {
    id: 'comp_ai_1',
    subjectId: 'computer',
    subfieldId: 'comp_ai_ml',
    title: 'ตรวจจับโรคใบข้าวด้วยภาพถ่าย',
    phenomenon: 'ใบข้าวมีรอยด่างสีน้ำตาล',
    curiosityHook: 'ใช้ AI จำแนกโรคพืชจากมือถือ?',
    targetGradeLevels: ['m_ton', 'm_plai'],
    difficulty: 'intermediate',
    estimatedWeeks: 6,
    estimatedBudgetBaht: 0,
    requiredEquipment: ['สมาร์ทโฟน', 'คอมพิวเตอร์'],
    minTeamSize: 1,
    maxTeamSize: 3,
    requiredSkills: ['Python เบื้องต้น'],
  },
];

const defaultConstraints: Constraints = {
  timeWeeks: 10,
  budgetBaht: 3000,
  equipment: ['คอมพิวเตอร์', 'สมาร์ทโฟน'],
  teamSize: 2,
  skills: ['Python'],
};

describe('Seam 1: Deck building & filtering (buildDiscoveryDeck)', () => {
  it('filters strictly by subjectId', () => {
    const deck = buildDiscoveryDeck(
      {
        subjectId: 'science',
        subfieldIds: ['sci_physics'],
        gradeLevel: 'm_ton',
        constraints: defaultConstraints,
      },
      sampleCards
    );

    expect(deck.length).toBe(1);
    expect(deck[0].id).toBe('sci_phys_1');
    expect(deck.every((c) => c.subjectId === 'science')).toBe(true);
  });

  it('filters by multiple subfields when provided', () => {
    const deck = buildDiscoveryDeck(
      {
        subjectId: 'science',
        subfieldIds: ['sci_physics', 'sci_biology'],
        gradeLevel: 'm_ton',
        constraints: defaultConstraints,
      },
      sampleCards
    );

    const ids = deck.map((c) => c.id);
    expect(ids).toContain('sci_phys_1');
    expect(ids).toContain('sci_bio_1');
    expect(ids).not.toContain('sci_chem_1');
  });

  it('filters by grade level: excludes cards where gradeLevel is not in targetGradeLevels', () => {
    // sci_chem_1 is m_plai only
    const deckMTon = buildDiscoveryDeck(
      {
        subjectId: 'science',
        subfieldIds: ['sci_chemistry'],
        gradeLevel: 'm_ton',
        constraints: defaultConstraints,
      },
      sampleCards
    );
    expect(deckMTon.length).toBe(0);

    const deckMPlai = buildDiscoveryDeck(
      {
        subjectId: 'science',
        subfieldIds: ['sci_chemistry'],
        gradeLevel: 'm_plai',
        constraints: defaultConstraints,
      },
      sampleCards
    );
    expect(deckMPlai.length).toBe(1);
    expect(deckMPlai[0].id).toBe('sci_chem_1');
  });

  it('handles "ยังไม่รู้" (mixed mode): interleaves cards across all subfields in the subject deterministically', () => {
    const cards: TopicCard[] = [
      { ...sampleCards[0], id: 'phys_a', subfieldId: 'sub_a' },
      { ...sampleCards[0], id: 'phys_b', subfieldId: 'sub_a' },
      { ...sampleCards[0], id: 'chem_a', subfieldId: 'sub_b' },
      { ...sampleCards[0], id: 'chem_b', subfieldId: 'sub_b' },
      { ...sampleCards[0], id: 'bio_a', subfieldId: 'sub_c' },
    ];

    const deck = buildDiscoveryDeck(
      {
        subjectId: 'science',
        subfieldIds: 'unknown', // "ยังไม่รู้"
        gradeLevel: 'm_ton',
        constraints: defaultConstraints,
      },
      cards
    );

    // Should interleave sub_a, sub_b, sub_c round-robin
    expect(deck.length).toBe(5);
    const subfieldOrder = deck.map((c) => c.subfieldId);
    expect(subfieldOrder[0]).toBe('sub_a');
    expect(subfieldOrder[1]).toBe('sub_b');
    expect(subfieldOrder[2]).toBe('sub_c');
    expect(subfieldOrder[3]).toBe('sub_a');
    expect(subfieldOrder[4]).toBe('sub_b');
  });

  it('does not mutate original input cards array', () => {
    const originalLength = sampleCards.length;
    buildDiscoveryDeck(
      {
        subjectId: 'science',
        subfieldIds: 'unknown',
        gradeLevel: 'm_ton',
        constraints: defaultConstraints,
      },
      sampleCards
    );
    expect(sampleCards.length).toBe(originalLength);
  });
});
