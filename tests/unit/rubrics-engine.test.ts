import { describe, it, expect } from 'vitest';
import type {
  Goal,
  GradeLevel,
  TopicCard,
  Constraints,
  EvaluationAxis,
  RubricPreset,
} from '@/types/domain';
import {
  RubricPresetSchema,
  FitScoreSchema,
  GoalSchema,
  GradeLevelSchema,
} from '@/lib/schemas';
import {
  scoreToBadge,
  computeFitScore,
  computeEvaluationScore,
  getRubricPreset,
} from '@/lib/rubrics/engine';
import { RUBRIC_PRESETS } from '@/lib/rubrics/presets';

describe('scoreToBadge', () => {
  it('maps scores 7-10 to green', () => {
    expect(scoreToBadge(7)).toBe('green');
    expect(scoreToBadge(8)).toBe('green');
    expect(scoreToBadge(9)).toBe('green');
    expect(scoreToBadge(10)).toBe('green');
  });

  it('maps scores 4-6 to yellow', () => {
    expect(scoreToBadge(4)).toBe('yellow');
    expect(scoreToBadge(5)).toBe('yellow');
    expect(scoreToBadge(6)).toBe('yellow');
  });

  it('maps scores 1-3 to red', () => {
    expect(scoreToBadge(1)).toBe('red');
    expect(scoreToBadge(2)).toBe('red');
    expect(scoreToBadge(3)).toBe('red');
  });

  it('handles boundary scores accurately', () => {
    // 3 is red, 4 is yellow
    expect(scoreToBadge(3)).toBe('red');
    expect(scoreToBadge(4)).toBe('yellow');
    // 6 is yellow, 7 is green
    expect(scoreToBadge(6)).toBe('yellow');
    expect(scoreToBadge(7)).toBe('green');
  });

  it('rejects out-of-range integer scores', () => {
    expect(() => scoreToBadge(0)).toThrow();
    expect(() => scoreToBadge(11)).toThrow();
    expect(() => scoreToBadge(-1)).toThrow();
    expect(() => scoreToBadge(100)).toThrow();
  });

  it('rejects non-integer and non-finite scores', () => {
    expect(() => scoreToBadge(6.5)).toThrow();
    expect(() => scoreToBadge(3.2)).toThrow();
    expect(() => scoreToBadge(0.9)).toThrow();
    expect(() => scoreToBadge(NaN)).toThrow();
    expect(() => scoreToBadge(Infinity)).toThrow();
    expect(() => scoreToBadge(-Infinity)).toThrow();
  });
});

describe('Rubric Presets and getRubricPreset', () => {
  it('provides a valid RubricPreset for every Goal x GradeLevel combination', () => {
    for (const goal of GoalSchema.options) {
      for (const gradeLevel of GradeLevelSchema.options) {
        const preset = getRubricPreset(goal, gradeLevel);

        expect(preset).toBeDefined();
        expect(preset.goal).toBe(goal);
        expect(preset.gradeLevel).toBe(gradeLevel);

        // Validates against canonical Zod schema
        const parsed = RubricPresetSchema.safeParse(preset);
        expect(parsed.success).toBe(true);

        // Sum of weights must equal 1.0
        const { novelty, feasibility, impact, rigor, fit } = preset.weights;
        const totalWeight = novelty + feasibility + impact + rigor + fit;
        expect(totalWeight).toBeCloseTo(1.0, 5);

        // Every axis weight must be positive
        expect(novelty).toBeGreaterThan(0);
        expect(feasibility).toBeGreaterThan(0);
        expect(impact).toBeGreaterThan(0);
        expect(rigor).toBeGreaterThan(0);
        expect(fit).toBeGreaterThan(0);

        // Criteria must have non-empty guidance in Thai
        expect(preset.criteria.novelty.trim().length).toBeGreaterThan(0);
        expect(preset.criteria.feasibility.trim().length).toBeGreaterThan(0);
        expect(preset.criteria.impact.trim().length).toBeGreaterThan(0);
        expect(preset.criteria.rigor.trim().length).toBeGreaterThan(0);
        expect(preset.criteria.fit.trim().length).toBeGreaterThan(0);

        // Heuristic flag marked true
        expect(preset.isHeuristic).toBe(true);
      }
    }
  });

  it('exports RUBRIC_PRESETS array covering all 14 presets (7 goals x 2 grades)', () => {
    expect(RUBRIC_PRESETS.length).toBe(
      GoalSchema.options.length * GradeLevelSchema.options.length
    );
  });

  it('throws on unknown goal or gradeLevel', () => {
    expect(() => getRubricPreset('invalid_goal' as Goal, 'm_ton')).toThrow();
    expect(() => getRubricPreset('ysc', 'university' as GradeLevel)).toThrow();
  });
});

describe('computeFitScore', () => {
  const baselineCard: TopicCard = {
    id: 'card-bio-01',
    subjectId: 'sub-science',
    subfieldId: 'field-biology',
    title: 'การศึกษาประสิทธิภาพของสารสกัดจากพืชสมุนไพรในการยับยั้งแบคทีเรีย',
    phenomenon: 'สารสกัดจากใบฝรั่งและเปลือกมังคุดมีสารที่มีฤทธิ์ต้านจุลชีพ',
    curiosityHook: 'เราสามารถใช้พืชสวนครัวในท้องถิ่นแทนสารเคมีฆ่าเชื้อได้หรือไม่?',
    targetGradeLevels: ['m_ton', 'm_plai'],
    difficulty: 'intermediate',
    estimatedWeeks: 6,
    estimatedBudgetBaht: 800,
    requiredEquipment: ['บีกเกอร์', 'จานเพาะเชื้อ', 'ตู้บ่ม'],
    minTeamSize: 2,
    maxTeamSize: 3,
    requiredSkills: ['การเตรียมสารละลาย', 'การเพาะเลี้ยงเชื้อจุลินทรีย์'],
  };

  const baselineConstraints: Constraints = {
    timeWeeks: 8,
    budgetBaht: 1000,
    equipment: ['บีกเกอร์', 'จานเพาะเชื้อ', 'ตู้บ่ม', 'ไมโครสโคป'],
    teamSize: 2,
    skills: ['การเตรียมสารละลาย', 'การเพาะเลี้ยงเชื้อจุลินทรีย์', 'สถิติพื้นฐาน'],
  };

  it('calculates a 100% fit score when constraints comfortably satisfy card requirements', () => {
    const result = computeFitScore(baselineCard, baselineConstraints, 'm_plai');

    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({
      time: 100,
      budget: 100,
      equipment: 100,
      teamSize: 100,
      skills: 100,
      gradeLevel: 100,
    });

    const parsed = FitScoreSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('satisfies monotonicity: lower budget strictly lowers budget fit', () => {
    const fit100 = computeFitScore(baselineCard, { ...baselineConstraints, budgetBaht: 800 }, 'm_plai');
    const fit75 = computeFitScore(baselineCard, { ...baselineConstraints, budgetBaht: 600 }, 'm_plai');
    const fit50 = computeFitScore(baselineCard, { ...baselineConstraints, budgetBaht: 400 }, 'm_plai');
    const fit0 = computeFitScore(baselineCard, { ...baselineConstraints, budgetBaht: 0 }, 'm_plai');

    expect(fit100.breakdown.budget).toBe(100);
    expect(fit75.breakdown.budget).toBe(75);
    expect(fit50.breakdown.budget).toBe(50);
    expect(fit0.breakdown.budget).toBe(0);

    expect(fit100.score).toBeGreaterThan(fit75.score);
    expect(fit75.score).toBeGreaterThan(fit50.score);
    expect(fit50.score).toBeGreaterThan(fit0.score);
  });

  it('satisfies monotonicity: shorter time strictly lowers time fit', () => {
    // Card requires 6 weeks
    const fitFull = computeFitScore(baselineCard, { ...baselineConstraints, timeWeeks: 6 }, 'm_plai');
    const fitHalf = computeFitScore(baselineCard, { ...baselineConstraints, timeWeeks: 3 }, 'm_plai');
    const fitZero = computeFitScore(baselineCard, { ...baselineConstraints, timeWeeks: 0 }, 'm_plai');

    expect(fitFull.breakdown.time).toBe(100);
    expect(fitHalf.breakdown.time).toBe(50);
    expect(fitZero.breakdown.time).toBe(0);

    expect(fitFull.score).toBeGreaterThan(fitHalf.score);
    expect(fitHalf.score).toBeGreaterThan(fitZero.score);
  });

  it('satisfies monotonicity: missing required equipment lowers equipment fit', () => {
    // Card requires 3 items
    const all3 = computeFitScore(baselineCard, baselineConstraints, 'm_plai');
    const only2 = computeFitScore(
      baselineCard,
      { ...baselineConstraints, equipment: ['บีกเกอร์', 'จานเพาะเชื้อ'] },
      'm_plai'
    );
    const none = computeFitScore(
      baselineCard,
      { ...baselineConstraints, equipment: [] },
      'm_plai'
    );

    expect(all3.breakdown.equipment).toBe(100);
    expect(only2.breakdown.equipment).toBe(67);
    expect(none.breakdown.equipment).toBe(0);

    expect(all3.score).toBeGreaterThan(only2.score);
    expect(only2.score).toBeGreaterThan(none.score);
  });

  it('penalizes team size when outside card min/max range', () => {
    // Card min 2, max 3
    const fitInMin = computeFitScore(baselineCard, { ...baselineConstraints, teamSize: 2 }, 'm_plai');
    const fitInMax = computeFitScore(baselineCard, { ...baselineConstraints, teamSize: 3 }, 'm_plai');
    const fitSolo = computeFitScore(baselineCard, { ...baselineConstraints, teamSize: 1 }, 'm_plai');
    const fitTooLarge = computeFitScore(baselineCard, { ...baselineConstraints, teamSize: 5 }, 'm_plai');

    expect(fitInMin.breakdown.teamSize).toBe(100);
    expect(fitInMax.breakdown.teamSize).toBe(100);
    expect(fitSolo.breakdown.teamSize).toBeLessThan(100);
    expect(fitTooLarge.breakdown.teamSize).toBeLessThan(100);
  });

  it('penalizes grade level mismatch', () => {
    const plaiCard: TopicCard = {
      ...baselineCard,
      targetGradeLevels: ['m_plai'],
    };

    const matchPlai = computeFitScore(plaiCard, baselineConstraints, 'm_plai');
    const mismatchTon = computeFitScore(plaiCard, baselineConstraints, 'm_ton');

    expect(matchPlai.breakdown.gradeLevel).toBe(100);
    expect(mismatchTon.breakdown.gradeLevel).toBeLessThan(100);
    expect(matchPlai.score).toBeGreaterThan(mismatchTon.score);
  });

  it('handles edge cases: zero-budget project and zero-budget constraint', () => {
    const freeCard: TopicCard = {
      ...baselineCard,
      estimatedBudgetBaht: 0,
    };

    // When card needs 0 baht, student with 0 baht still gets 100% budget fit
    const freeFit = computeFitScore(freeCard, { ...baselineConstraints, budgetBaht: 0 }, 'm_plai');
    expect(freeFit.breakdown.budget).toBe(100);
  });

  it('is completely deterministic and pure across repeated calls', () => {
    const run1 = computeFitScore(baselineCard, baselineConstraints, 'm_plai');
    const run2 = computeFitScore(baselineCard, baselineConstraints, 'm_plai');
    const run3 = computeFitScore(baselineCard, baselineConstraints, 'm_plai');

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });
});

describe('computeEvaluationScore', () => {
  const samplePreset: RubricPreset = {
    id: 'test-preset',
    goal: 'ysc',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์ทดสอบ YSC ม.ปลาย',
    descriptionTh: 'คำอธิบายเกณฑ์ทดสอบ',
    weights: {
      novelty: 0.25,
      feasibility: 0.15,
      impact: 0.15,
      rigor: 0.30,
      fit: 0.15,
    },
    criteria: {
      novelty: 'เกณฑ์ความใหม่',
      feasibility: 'เกณฑ์ความเป็นไปได้',
      impact: 'เกณฑ์ผลกระทบ',
      rigor: 'เกณฑ์สมมติฐานและวิธีวัด',
      fit: 'เกณฑ์ความเหมาะกับเป้าหมาย',
    },
    isHeuristic: true,
  };

  it('computes weighted overall score and badge with known worked example', () => {
    // Weighted calculation:
    // novelty: 8 * 0.25 = 2.00
    // feasibility: 6 * 0.15 = 0.90
    // impact: 9 * 0.15 = 1.35
    // rigor: 7 * 0.30 = 2.10
    // fit: 8 * 0.15 = 1.20
    // Total sum = 2.00 + 0.90 + 1.35 + 2.10 + 1.20 = 7.55
    // Rounded to 1 decimal place: 7.6 (or round to badge: 7.6 -> 8 -> green)
    const axesScores: Record<EvaluationAxis, number> = {
      novelty: 8,
      feasibility: 6,
      impact: 9,
      rigor: 7,
      fit: 8,
    };

    const evaluation = computeEvaluationScore(axesScores, samplePreset);

    expect(evaluation.overallScore).toBe(7.55);
    expect(evaluation.overallBadge).toBe('green');
  });

  it('computes low score and red badge accurately', () => {
    const lowScores: Record<EvaluationAxis, number> = {
      novelty: 2,
      feasibility: 3,
      impact: 2,
      rigor: 2,
      fit: 3,
    };
    // 2*0.25 + 3*0.15 + 2*0.15 + 2*0.30 + 3*0.15 = 0.5 + 0.45 + 0.3 + 0.6 + 0.45 = 2.30
    const evaluation = computeEvaluationScore(lowScores, samplePreset);
    expect(evaluation.overallScore).toBe(2.3);
    expect(evaluation.overallBadge).toBe('red');
  });

  it('computes mid score and yellow badge accurately', () => {
    const midScores: Record<EvaluationAxis, number> = {
      novelty: 5,
      feasibility: 5,
      impact: 5,
      rigor: 5,
      fit: 5,
    };
    // 5 * 1.0 = 5.0
    const evaluation = computeEvaluationScore(midScores, samplePreset);
    expect(evaluation.overallScore).toBe(5);
    expect(evaluation.overallBadge).toBe('yellow');
  });

  it('rejects invalid axis scores outside 1-10', () => {
    const invalidScores: Record<EvaluationAxis, number> = {
      novelty: 0,
      feasibility: 5,
      impact: 5,
      rigor: 5,
      fit: 5,
    };
    expect(() => computeEvaluationScore(invalidScores, samplePreset)).toThrow();
  });
});
