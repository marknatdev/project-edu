import { describe, it, expect } from 'vitest';
import {
  rankShortlist,
  sortShortlist,
  recommendOne,
  compareTwo,
} from '@/lib/discovery/shortlist';
import type { TopicCard, Constraints } from '@/types/domain';

// Fixture cards with distinct characteristics
const cardFastCheap: TopicCard = {
  id: 'fast_cheap',
  subjectId: 'science',
  subfieldId: 'sci_physics',
  title: 'พลังงานแสงจากขวดน้ำ',
  phenomenon: 'แสงหักเหในขวดใส',
  curiosityHook: 'ส่องสว่างในห้องมืดได้อย่างไร?',
  targetGradeLevels: ['m_ton', 'm_plai'],
  difficulty: 'beginner',
  estimatedWeeks: 2,
  estimatedBudgetBaht: 100,
  requiredEquipment: ['ขวดน้ำ'],
  minTeamSize: 1,
  maxTeamSize: 2,
  requiredSkills: ['การวัดค่าความสว่าง'],
};

const cardSlowExpensive: TopicCard = {
  id: 'slow_expensive',
  subjectId: 'science',
  subfieldId: 'sci_chemistry',
  title: 'สังเคราะห์อนุภาคนาโน',
  phenomenon: 'อนุภาคโลหะระดับนาโนเมตร',
  curiosityHook: 'ต้านแบคทีเรียได้จริงไหม?',
  targetGradeLevels: ['m_plai'],
  difficulty: 'advanced',
  estimatedWeeks: 12,
  estimatedBudgetBaht: 5000,
  requiredEquipment: ['เครื่องหมุนเหวี่ยง', 'สารเคมี'],
  minTeamSize: 2,
  maxTeamSize: 3,
  requiredSkills: ['การใช้ปิเปตต์', 'การเตรียมสารละลาย'],
  safetyCategories: ['hazardous_chemicals'],
};

const cardBalanced: TopicCard = {
  id: 'balanced',
  subjectId: 'science',
  subfieldId: 'sci_biology',
  title: 'การงอกของเมล็ดพันธุ์พื้นบ้าน',
  phenomenon: 'เมล็ดพันธุ์ท้องถิ่นทนแล้ง',
  curiosityHook: 'สารสกัดพืชเร่งการงอกได้ไหม?',
  targetGradeLevels: ['m_ton', 'm_plai'],
  difficulty: 'intermediate',
  estimatedWeeks: 4,
  estimatedBudgetBaht: 400,
  requiredEquipment: ['จานเพาะเชื้อ'],
  minTeamSize: 1,
  maxTeamSize: 3,
  requiredSkills: ['การเพาะเลี้ยงเนื้อเยื่อ'],
};

const constraints: Constraints = {
  timeWeeks: 6,
  budgetBaht: 1000,
  equipment: ['ขวดน้ำ', 'จานเพาะเชื้อ'],
  teamSize: 2,
  skills: ['การวัดค่าความสว่าง', 'การเพาะเลี้ยงเนื้อเยื่อ'],
};

describe('Seam 3: Shortlist ranking, meters, reasons, and pros/cons', () => {
  it('ranks shortlisted cards using computeFitScore against learner constraints', () => {
    const ranked = rankShortlist(
      [cardSlowExpensive, cardFastCheap, cardBalanced],
      constraints,
      'm_ton'
    );

    expect(ranked.length).toBe(3);
    // cardFastCheap fits well (weeks 2 <= 6, budget 100 <= 1000, equip available)
    // cardSlowExpensive exceeds both weeks (12 > 6) and budget (5000 > 1000) and grade (m_plai only)
    expect(ranked[0].card.id).toBe('fast_cheap');
    expect(ranked[ranked.length - 1].card.id).toBe('slow_expensive');
    expect(ranked[0].fitScore.score).toBeGreaterThan(ranked[ranked.length - 1].fitScore.score);
  });

  it('computes timeRatio and budgetRatio accurately against constraints', () => {
    const ranked = rankShortlist([cardFastCheap], constraints, 'm_ton');
    const item = ranked[0];

    // cardFastCheap: weeks 2 / 6 = 0.33, budget 100 / 1000 = 0.1
    expect(item.timeRatio).toBeCloseTo(0.33, 2);
    expect(item.budgetRatio).toBeCloseTo(0.1, 2);
  });

  it('generates plain-Thai "ทำไมได้ Fit นี้" explanation reasons', () => {
    const ranked = rankShortlist([cardFastCheap], constraints, 'm_ton');
    const item = ranked[0];

    expect(item.reasons.length).toBeGreaterThan(0);
    expect(item.reasons.some((r) => r.includes('เวลา') || r.includes('สัปดาห์'))).toBe(true);
    expect(item.reasons.some((r) => r.includes('งบ') || r.includes('บาท'))).toBe(true);
  });

  it('generates pros and cons highlighting safety or constraint warnings', () => {
    const ranked = rankShortlist([cardSlowExpensive], constraints, 'm_plai');
    const item = ranked[0];

    expect(item.cons.length).toBeGreaterThan(0);
    // cardSlowExpensive has hazardous_chemicals or high budget/time
    expect(
      item.cons.some((c) => c.includes('ความปลอดภัย') || c.includes('งบประมาณ') || c.includes('เวลา'))
    ).toBe(true);
  });

  it('sorts shortlist by fit, budget, and weeks', () => {
    const ranked = rankShortlist(
      [cardFastCheap, cardBalanced, cardSlowExpensive],
      constraints,
      'm_ton'
    );

    // Sort by budget ascending (cheapest first: 100, 400, 5000)
    const byBudget = sortShortlist(ranked, 'budget');
    expect(byBudget.map((i) => i.card.id)).toEqual(['fast_cheap', 'balanced', 'slow_expensive']);

    // Sort by weeks ascending (fastest first: 2, 4, 12)
    const byWeeks = sortShortlist(ranked, 'weeks');
    expect(byWeeks.map((i) => i.card.id)).toEqual(['fast_cheap', 'balanced', 'slow_expensive']);

    // Sort by fit descending
    const byFit = sortShortlist(ranked, 'fit');
    expect(byFit[0].fitScore.score).toBeGreaterThanOrEqual(byFit[1].fitScore.score);
  });
});

describe('Seam 4: Comparison & 1-Card Recommendation', () => {
  it('recommends top 1 card with highest Fit score and Thai rationale', () => {
    const ranked = rankShortlist(
      [cardSlowExpensive, cardFastCheap, cardBalanced],
      constraints,
      'm_ton'
    );

    const recommendation = recommendOne(ranked);
    expect(recommendation).not.toBeNull();
    expect(recommendation!.item.card.id).toBe('fast_cheap');
    expect(recommendation!.reason).toContain('Fit');
  });

  it('returns null recommendation when shortlist is empty', () => {
    expect(recommendOne([])).toBeNull();
  });

  it('compares two cards side-by-side with per-dimension winner and takeaway', () => {
    const cmp = compareTwo(cardFastCheap, cardSlowExpensive, constraints, 'm_ton');

    expect(cmp.cardA.id).toBe('fast_cheap');
    expect(cmp.cardB.id).toBe('slow_expensive');
    expect(cmp.dimensions.length).toBeGreaterThanOrEqual(5);

    // Fit score winner should be 'a'
    const fitDim = cmp.dimensions.find((d) => d.key === 'fit');
    expect(fitDim?.winner).toBe('a');

    // Budget winner should be 'a' (lower budget wins)
    const budgetDim = cmp.dimensions.find((d) => d.key === 'budget');
    expect(budgetDim?.winner).toBe('a');

    // Weeks winner should be 'a' (faster weeks wins)
    const weeksDim = cmp.dimensions.find((d) => d.key === 'weeks');
    expect(weeksDim?.winner).toBe('a');

    // Safety winner should be 'a' (fast_cheap has no hazardous chemicals)
    const safetyDim = cmp.dimensions.find((d) => d.key === 'safety');
    expect(safetyDim?.winner).toBe('a');

    expect(cmp.takeaway).toBeTruthy();
  });
});
