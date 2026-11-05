/**
 * Pure, deterministic Rubric and Fit Score engine for Project Edu.
 * Based on PLAN.md §1.2 and CONTEXT.md ubiquitous language.
 */

import type {
  ScoreBadge,
  TopicCard,
  Constraints,
  GradeLevel,
  FitScore,
  FitScoreBreakdown,
  RubricPreset,
  EvaluationAxis,
  EvaluationAxes,
  AxisEvaluation,
} from '@/types/domain';
import { ScoreAxisSchema, FitScoreSchema } from '@/lib/schemas';
import { getRubricPreset, RUBRIC_PRESETS } from './presets';

export { getRubricPreset, RUBRIC_PRESETS };

/**
 * Visual badge emoji mapping for score badges (7-10 🟢, 4-6 🟡, 1-3 🔴).
 */
export const SCORE_BADGE_EMOJIS: Readonly<Record<ScoreBadge, string>> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
};

/**
 * Convert a ScoreBadge ('green' | 'yellow' | 'red') to its visual emoji.
 */
export function scoreBadgeToEmoji(badge: ScoreBadge): string {
  return SCORE_BADGE_EMOJIS[badge] ?? '⚪';
}

/**
 * Convert an evaluation axis integer score (1..10) to a ScoreBadge ('green' | 'yellow' | 'red').
 *
 * Thresholds:
 * - 🟢 7..10: green (แข็งแรง / โดดเด่น)
 * - 🟡 4..6: yellow (ปานกลาง / ต้องพัฒนาต่อ)
 * - 🔴 1..3: red (ต้องปรับปรุง / จุดอ่อนสำคัญ)
 *
 * Throws a ZodError or RangeError if score is not an integer in 1..10.
 */
export function scoreToBadge(score: number): ScoreBadge {
  // Enforces integer in 1..10 range strictly
  ScoreAxisSchema.parse(score);

  if (score >= 7) {
    return 'green';
  }
  if (score >= 4) {
    return 'yellow';
  }
  return 'red';
}

/**
 * Helper to normalize string for case-insensitive and whitespace-insensitive matching.
 */
function normalizeItem(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Computes a deterministic FitScore (0..100 integer) + per-factor breakdown
 * comparing a TopicCard against a learner's Constraints and GradeLevel.
 *
 * Breakdown factors (each 0..100 integer):
 * 1. time: Available weeks vs estimated weeks needed
 * 2. budget: Available budget vs estimated budget needed
 * 3. equipment: Match ratio of required equipment vs available equipment
 * 4. teamSize: Team size relative to [minTeamSize, maxTeamSize]
 * 5. skills: Match ratio of required skills vs available skills
 * 6. gradeLevel: Target grade level match (100 for exact match, 50 for mismatch)
 */
export function computeFitScore(
  card: TopicCard,
  constraints: Constraints,
  gradeLevel: GradeLevel
): FitScore {
  // 1. Time Factor (0..100)
  let timeScore = 100;
  if (card.estimatedWeeks > 0) {
    if (constraints.timeWeeks < card.estimatedWeeks) {
      const ratio = constraints.timeWeeks / card.estimatedWeeks;
      timeScore = Math.round(Math.max(0, Math.min(100, ratio * 100)));
    }
  }

  // 2. Budget Factor (0..100)
  let budgetScore = 100;
  if (card.estimatedBudgetBaht > 0) {
    if (constraints.budgetBaht < card.estimatedBudgetBaht) {
      const ratio = constraints.budgetBaht / card.estimatedBudgetBaht;
      budgetScore = Math.round(Math.max(0, Math.min(100, ratio * 100)));
    }
  }

  // 3. Equipment Factor (0..100)
  let equipmentScore = 100;
  if (card.requiredEquipment.length > 0) {
    const availableEquip = new Set(constraints.equipment.map(normalizeItem));
    const matchedCount = card.requiredEquipment.filter((item) =>
      availableEquip.has(normalizeItem(item))
    ).length;
    equipmentScore = Math.round((matchedCount / card.requiredEquipment.length) * 100);
  }

  // 4. Team Size Factor (0..100)
  let teamSizeScore = 100;
  if (
    constraints.teamSize < card.minTeamSize &&
    card.minTeamSize > 0
  ) {
    const ratio = constraints.teamSize / card.minTeamSize;
    teamSizeScore = Math.round(Math.max(0, Math.min(100, ratio * 100)));
  } else if (
    constraints.teamSize > card.maxTeamSize &&
    constraints.teamSize > 0
  ) {
    const ratio = card.maxTeamSize / constraints.teamSize;
    teamSizeScore = Math.round(Math.max(0, Math.min(100, ratio * 100)));
  }

  // 5. Skills Factor (0..100)
  let skillsScore = 100;
  if (card.requiredSkills.length > 0) {
    const availableSkills = new Set(constraints.skills.map(normalizeItem));
    const matchedCount = card.requiredSkills.filter((item) =>
      availableSkills.has(normalizeItem(item))
    ).length;
    skillsScore = Math.round((matchedCount / card.requiredSkills.length) * 100);
  }

  // 6. Grade Level Factor (0..100)
  let gradeLevelScore = 100;
  if (!card.targetGradeLevels.includes(gradeLevel)) {
    // Grade mismatch penalty: 50% fit
    gradeLevelScore = 50;
  }

  const breakdown: FitScoreBreakdown = {
    time: timeScore,
    budget: budgetScore,
    equipment: equipmentScore,
    teamSize: teamSizeScore,
    skills: skillsScore,
    gradeLevel: gradeLevelScore,
  };

  // Overall Score: equal-weighted average of 6 factors rounded to 0..100 integer
  const rawAverage =
    (timeScore +
      budgetScore +
      equipmentScore +
      teamSizeScore +
      skillsScore +
      gradeLevelScore) /
    6;

  const score = Math.round(Math.max(0, Math.min(100, rawAverage)));

  const fitScore: FitScore = {
    score,
    breakdown,
  };

  // Validate output against canonical FitScoreSchema
  return FitScoreSchema.parse(fitScore);
}

/**
 * Computes the weighted overall evaluation score and corresponding badge
 * across the 5 evaluation axes according to a RubricPreset.
 *
 * @param axes - Either a Record<EvaluationAxis, number> or an EvaluationAxes object.
 * @param preset - The RubricPreset containing axis weights (summing to 1.0).
 * @returns { overallScore: number (1..10 rounded to 2 decimals), overallBadge: ScoreBadge }
 */
export function computeEvaluationScore(
  axes: Record<EvaluationAxis, number> | EvaluationAxes,
  preset: RubricPreset
): { overallScore: number; overallBadge: ScoreBadge } {
  function getScore(axis: EvaluationAxis): number {
    const entry = (axes as Record<string, number | AxisEvaluation>)[axis];
    if (entry === undefined) {
      throw new Error(`Missing score for axis: ${axis}`);
    }
    const num = typeof entry === 'number' ? entry : entry.score;
    return ScoreAxisSchema.parse(num);
  }

  const noveltyScore = getScore('novelty');
  const feasibilityScore = getScore('feasibility');
  const impactScore = getScore('impact');
  const rigorScore = getScore('rigor');
  const fitScore = getScore('fit');

  const weightedSum =
    noveltyScore * preset.weights.novelty +
    feasibilityScore * preset.weights.feasibility +
    impactScore * preset.weights.impact +
    rigorScore * preset.weights.rigor +
    fitScore * preset.weights.fit;

  // Round to 2 decimal places for precision
  const overallScore = Math.round(weightedSum * 100) / 100;

  // Map to badge using rounded integer clamped to 1..10
  const badgeInteger = Math.min(10, Math.max(1, Math.round(overallScore)));
  const overallBadge = scoreToBadge(badgeInteger);

  return {
    overallScore,
    overallBadge,
  };
}
