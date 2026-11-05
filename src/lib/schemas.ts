import { z } from 'zod';
import {
  GOALS,
  TRACKS,
  SWIPE_DIRECTIONS,
  EVALUATION_AXES,
  SCORE_BADGES,
  SAFETY_CATEGORIES,
} from '@/types/domain';
import type {
  GradeLevel,
  Goal,
  Track,
  Constraints,
  Learner,
  Interview,
  Subject,
  Subfield,
  DifficultyLevel,
  TopicCard,
  SwipeDirection,
  SwipeAction,
  FitScoreBreakdown,
  FitScore,
  ShortlistItem,
  Idea,
  EvaluationAxis,
  ScoreBadge,
  AxisEvaluation,
  EvaluationAxes,
  Evaluation,
  RubricPresetWeights,
  RubricPresetCriteria,
  RubricPreset,
  PriorWork,
  VerifiedPriorWork,
  SafetyCategory,
  SafetyFlag,
  CoachingTier,
  PivotCoaching,
  Pivot,
  ProposalVariables,
  Proposal,
  PlanMilestone,
  Plan,
  ProjectStatus,
  Project,
} from '@/types/domain';

// Type equality utilities for compile-time drift detection
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;
export type Assert<T extends true> = T;

// 1. GradeLevel
export const GradeLevelSchema = z.enum(['m_ton', 'm_plai']);
export type _GradeLevelCheck = Assert<Equals<z.infer<typeof GradeLevelSchema>, GradeLevel>>;

// 2. Goal
export const GoalSchema = z.enum(GOALS);
export type _GoalCheck = Assert<Equals<z.infer<typeof GoalSchema>, Goal>>;

// 3. Track
export const TrackSchema = z.enum(TRACKS);
export type _TrackCheck = Assert<Equals<z.infer<typeof TrackSchema>, Track>>;

// 4. Constraints
export const ConstraintsSchema = z.object({
  timeWeeks: z.number().int().min(1),
  budgetBaht: z.number().min(0),
  equipment: z.array(z.string()),
  teamSize: z.number().int().min(1).max(10),
  skills: z.array(z.string()),
});
export type _ConstraintsCheck = Assert<Equals<z.infer<typeof ConstraintsSchema>, Constraints>>;

// 5. Learner (Zero-PII by construction: strictly rejects unknown fields like realName or schoolName)
export const LearnerSchema = z
  .object({
    id: z.string().min(1),
    gradeLevel: GradeLevelSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type _LearnerCheck = Assert<Equals<z.infer<typeof LearnerSchema>, Learner>>;

// 6. Interview
export const InterviewSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  gradeLevel: GradeLevelSchema,
  goal: GoalSchema,
  constraints: ConstraintsSchema,
  hasInitialIdea: z.boolean(),
  selectedTrack: TrackSchema,
  completedAt: z.string().datetime(),
});
export type _InterviewCheck = Assert<Equals<z.infer<typeof InterviewSchema>, Interview>>;

// 7. Subject
export const SubjectSchema = z.object({
  id: z.string().min(1),
  nameTh: z.string().min(1),
  nameEn: z.string().min(1),
  description: z.string(),
  icon: z.string(),
});
export type _SubjectCheck = Assert<Equals<z.infer<typeof SubjectSchema>, Subject>>;

// 8. Subfield
export const SubfieldSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  nameTh: z.string().min(1),
  nameEn: z.string().min(1),
  description: z.string(),
  icon: z.string(),
});
export type _SubfieldCheck = Assert<Equals<z.infer<typeof SubfieldSchema>, Subfield>>;

// Forward reference for TopicCardSchema & EvaluationSchema
export const SafetyCategorySchema = z.enum(SAFETY_CATEGORIES);
export type _SafetyCategoryCheck = Assert<Equals<z.infer<typeof SafetyCategorySchema>, SafetyCategory>>;

// 9. TopicCard
export const DifficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type _DifficultyLevelCheck = Assert<Equals<z.infer<typeof DifficultyLevelSchema>, DifficultyLevel>>;

export const TopicCardSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  subfieldId: z.string().min(1),
  title: z.string().min(1),
  phenomenon: z.string().min(1),
  curiosityHook: z.string().min(1),
  targetGradeLevels: z.array(GradeLevelSchema).min(1),
  difficulty: DifficultyLevelSchema,
  estimatedWeeks: z.number().int().min(1),
  estimatedBudgetBaht: z.number().min(0),
  requiredEquipment: z.array(z.string()),
  minTeamSize: z.number().int().min(1),
  maxTeamSize: z.number().int().min(1),
  requiredSkills: z.array(z.string()),
  safetyCategories: z.array(SafetyCategorySchema).optional(),
});
export type _TopicCardCheck = Assert<Equals<z.infer<typeof TopicCardSchema>, TopicCard>>;

// 10. SwipeAction
export const SwipeDirectionSchema = z.enum(SWIPE_DIRECTIONS);
export type _SwipeDirectionCheck = Assert<Equals<z.infer<typeof SwipeDirectionSchema>, SwipeDirection>>;

export const SwipeActionSchema = z.object({
  cardId: z.string().min(1),
  direction: SwipeDirectionSchema,
  timestamp: z.string().datetime(),
});
export type _SwipeActionCheck = Assert<Equals<z.infer<typeof SwipeActionSchema>, SwipeAction>>;

// 11. FitScore
export const FitScoreBreakdownSchema = z.object({
  time: z.number().int().min(0).max(100),
  budget: z.number().int().min(0).max(100),
  equipment: z.number().int().min(0).max(100),
  teamSize: z.number().int().min(0).max(100),
  skills: z.number().int().min(0).max(100),
  gradeLevel: z.number().int().min(0).max(100),
});
export type _FitScoreBreakdownCheck = Assert<Equals<z.infer<typeof FitScoreBreakdownSchema>, FitScoreBreakdown>>;

export const FitScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: FitScoreBreakdownSchema,
});
export type _FitScoreCheck = Assert<Equals<z.infer<typeof FitScoreSchema>, FitScore>>;

// 12. ShortlistItem
export const ShortlistItemSchema = z.object({
  card: TopicCardSchema,
  fitScore: FitScoreSchema,
  addedAt: z.string().datetime(),
});
export type _ShortlistItemCheck = Assert<Equals<z.infer<typeof ShortlistItemSchema>, ShortlistItem>>;

// 13. Idea
export const IdeaSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  source: TrackSchema,
  sourceTopicCardId: z.string().optional(),
  gradeLevel: GradeLevelSchema,
  goal: GoalSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type _IdeaCheck = Assert<Equals<z.infer<typeof IdeaSchema>, Idea>>;

// 14. Evaluation
export const EvaluationAxisSchemaEnum = z.enum(EVALUATION_AXES);
export type _EvaluationAxisCheck = Assert<Equals<z.infer<typeof EvaluationAxisSchemaEnum>, EvaluationAxis>>;

export const ScoreBadgeSchema = z.enum(SCORE_BADGES);
export type _ScoreBadgeCheck = Assert<Equals<z.infer<typeof ScoreBadgeSchema>, ScoreBadge>>;

export const ScoreAxisSchema = z.number().int().min(1).max(10);

export const EvaluationAxisSchema = z.object({
  score: ScoreAxisSchema,
  badge: ScoreBadgeSchema,
  rationale: z.string(),
  feedback: z.string(),
});
export type _AxisEvaluationCheck = Assert<Equals<z.infer<typeof EvaluationAxisSchema>, AxisEvaluation>>;

export const EvaluationAxesSchema = z.object({
  novelty: EvaluationAxisSchema,
  feasibility: EvaluationAxisSchema,
  impact: EvaluationAxisSchema,
  rigor: EvaluationAxisSchema,
  fit: EvaluationAxisSchema,
});
export type _EvaluationAxesCheck = Assert<Equals<z.infer<typeof EvaluationAxesSchema>, EvaluationAxes>>;

// Forward reference for EvaluationSchema
export const SafetyFlagSchema = z.object({
  category: SafetyCategorySchema,
  flagged: z.boolean(),
  reasonTh: z.string(),
  advisoryTh: z.string(),
  requiresPreApproval: z.boolean(),
  matchedTerms: z.array(z.string()).optional(),
  blocking: z.boolean().optional(),
});
export type _SafetyFlagCheck = Assert<Equals<z.infer<typeof SafetyFlagSchema>, SafetyFlag>>;

export const PriorWorkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  authors: z.string().min(1),
  year: z.number().int(),
  competitionOrVenue: z.string().min(1),
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), {
    message: 'Must be an http(s) URL',
  }),
  summary: z.string(),
  difference: z.string(),
  subfieldIds: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  verifiedAt: z.string().optional(),
  observedTitle: z.string().optional(),
});
export type _PriorWorkCheck = Assert<Equals<z.infer<typeof PriorWorkSchema>, PriorWork>>;

export const VerifiedPriorWorkSchema = PriorWorkSchema.extend({
  subfieldIds: z.array(z.string()).min(1),
  keywords: z.array(z.string()).min(1),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observedTitle: z.string().min(1),
  url: z.string().url().refine((u) => /^https:\/\//i.test(u), {
    message: 'Must be an https URL',
  }),
});
export type _VerifiedPriorWorkCheck = Assert<Equals<z.infer<typeof VerifiedPriorWorkSchema>, VerifiedPriorWork>>;

export const EvaluationSchema = z.object({
  id: z.string().min(1),
  ideaId: z.string().min(1),
  overallScore: z.number().int().min(1).max(10),
  overallBadge: ScoreBadgeSchema,
  axes: EvaluationAxesSchema,
  safetyFlags: z.array(SafetyFlagSchema),
  priorWork: z.array(PriorWorkSchema),
  evaluatedAt: z.string().datetime(),
});
export type _EvaluationCheck = Assert<Equals<z.infer<typeof EvaluationSchema>, Evaluation>>;

// 15. RubricPreset
export const RubricPresetWeightsSchema = z.object({
  novelty: z.number().min(0).max(1),
  feasibility: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  rigor: z.number().min(0).max(1),
  fit: z.number().min(0).max(1),
});
export type _RubricPresetWeightsCheck = Assert<Equals<z.infer<typeof RubricPresetWeightsSchema>, RubricPresetWeights>>;

export const RubricPresetCriteriaSchema = z.object({
  novelty: z.string(),
  feasibility: z.string(),
  impact: z.string(),
  rigor: z.string(),
  fit: z.string(),
});
export type _RubricPresetCriteriaCheck = Assert<Equals<z.infer<typeof RubricPresetCriteriaSchema>, RubricPresetCriteria>>;

export const RubricPresetSchema = z.object({
  id: z.string().min(1),
  goal: GoalSchema,
  gradeLevel: GradeLevelSchema,
  nameTh: z.string().min(1),
  descriptionTh: z.string(),
  weights: RubricPresetWeightsSchema,
  criteria: RubricPresetCriteriaSchema,
  isHeuristic: z.boolean(),
});
export type _RubricPresetCheck = Assert<Equals<z.infer<typeof RubricPresetSchema>, RubricPreset>>;

// 18. Pivot & PivotCoaching
export const CoachingTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type _CoachingTierCheck = Assert<Equals<z.infer<typeof CoachingTierSchema>, CoachingTier>>;

export const PivotCoachingSchema = z.object({
  tier: CoachingTierSchema,
  tier1Prompt: z.string().min(1),
  tier2Lenses: z.array(z.string()).optional(),
  tier3Examples: z.array(z.string()).optional(),
  selectedAngle: z.string().optional(),
});
export type _PivotCoachingCheck = Assert<Equals<z.infer<typeof PivotCoachingSchema>, PivotCoaching>>;

export const PivotSchema = z.object({
  id: z.string().min(1),
  originalIdeaId: z.string().min(1),
  redAxes: z.array(EvaluationAxisSchemaEnum),
  coaching: PivotCoachingSchema,
  newIdeaTitle: z.string().optional(),
  newIdeaDescription: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type _PivotCheck = Assert<Equals<z.infer<typeof PivotSchema>, Pivot>>;

// 19. Proposal
export const ProposalVariablesSchema = z.object({
  independent: z.array(z.string()),
  dependent: z.array(z.string()),
  controlled: z.array(z.string()),
});
export type _ProposalVariablesCheck = Assert<Equals<z.infer<typeof ProposalVariablesSchema>, ProposalVariables>>;

export const ProposalSchema = z.object({
  title: z.string().min(1),
  problemStatement: z.string().min(1),
  objectives: z.array(z.string()).min(1),
  hypothesis: z.string().min(1),
  variables: ProposalVariablesSchema,
  methodology: z.string().min(1),
});
export type _ProposalCheck = Assert<Equals<z.infer<typeof ProposalSchema>, Proposal>>;

// 20. Plan
export const PlanMilestoneSchema = z.object({
  week: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string(),
  deliverable: z.string(),
  completed: z.boolean(),
});
export type _PlanMilestoneCheck = Assert<Equals<z.infer<typeof PlanMilestoneSchema>, PlanMilestone>>;

export const PlanSchema = z.object({
  targetDeadline: z.string().datetime(),
  totalWeeks: z.number().int().min(1),
  milestones: z.array(PlanMilestoneSchema),
});
export type _PlanCheck = Assert<Equals<z.infer<typeof PlanSchema>, Plan>>;

// 21. Project
export const ProjectStatusSchema = z.enum(['in_progress', 'ready_for_review', 'completed']);
export type _ProjectStatusCheck = Assert<Equals<z.infer<typeof ProjectStatusSchema>, ProjectStatus>>;

export const ProjectSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  ideaId: z.string().min(1),
  title: z.string().min(1),
  proposal: ProposalSchema,
  plan: PlanSchema,
  status: ProjectStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type _ProjectCheck = Assert<Equals<z.infer<typeof ProjectSchema>, Project>>;
