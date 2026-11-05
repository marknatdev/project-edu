/**
 * Canonical Domain Types for Project Edu
 * Based strictly on CONTEXT.md and PLAN.md
 */

// 1. GradeLevel (ผู้เรียน ม.ต้น หรือ ม.ปลาย)
export type GradeLevel = 'm_ton' | 'm_plai';

// 2. Goal (เป้าหมาย: งานแข่ง 4 เวที + 3 นอกงานแข่ง ตาม CONTEXT.md และ PLAN AC-3)
export const GOALS = [
  'ysc',
  'nsc',
  'silapa',
  'isef',
  'classroom',
  'portfolio',
  'curiosity',
] as const;
export type Goal = (typeof GOALS)[number];

// 3. Track (เส้นทางมีไอเดีย / เส้นทางค้นหา)
export const TRACKS = ['idea_track', 'discovery_track'] as const;
export type Track = (typeof TRACKS)[number];

// 4. Constraints (ข้อจำกัด: เวลา งบ อุปกรณ์ สมาชิก ทักษะ)
export interface Constraints {
  timeWeeks: number;
  budgetBaht: number;
  equipment: string[];
  teamSize: number;
  skills: string[];
}

// 5. Learner (ผู้เรียน: Zero-PII by construction, strictly no real-name or school)
export interface Learner {
  id: string;
  gradeLevel: GradeLevel;
  createdAt: string;
  updatedAt: string;
}

// 6. Interview (การสัมภาษณ์: เลือกระดับชั้น เป้าหมาย ข้อจำกัด และเส้นทาง)
export interface Interview {
  id: string;
  learnerId: string;
  gradeLevel: GradeLevel;
  goal: Goal;
  constraints: Constraints;
  hasInitialIdea: boolean;
  selectedTrack: Track;
  completedAt: string;
}

// 7. Subject (วิชา: กลุ่มความรู้ระดับบนสุด เช่น วิทยาศาสตร์, คอมพิวเตอร์, คณิตศาสตร์)
export interface Subject {
  id: string;
  nameTh: string;
  nameEn: string;
  description: string;
  icon: string;
}

// 8. Subfield (สาขาย่อย: หัวข้อย่อยภายในวิชา)
export interface Subfield {
  id: string;
  subjectId: string;
  nameTh: string;
  nameEn: string;
  description: string;
  icon: string;
}

// 9. TopicCard (การ์ดหัวข้อ: ประเด็นตั้งต้นหรือปรากฏการณ์ชวนสังเกต)
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface TopicCard {
  id: string;
  subjectId: string;
  subfieldId: string;
  title: string;
  phenomenon: string;
  curiosityHook: string;
  targetGradeLevels: GradeLevel[];
  difficulty: DifficultyLevel;
  estimatedWeeks: number;
  estimatedBudgetBaht: number;
  requiredEquipment: string[];
  minTeamSize: number;
  maxTeamSize: number;
  requiredSkills: string[];
  safetyCategories?: SafetyCategory[];
}

// 10. SwipeAction (การตอบสนองต่อการ์ด: ข้าม, สนใจ, อยากทำเลย, ย้อนกลับ)
export const SWIPE_DIRECTIONS = ['skip', 'interested', 'do_it_now', 'undo'] as const;
export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

export interface SwipeAction {
  cardId: string;
  direction: SwipeDirection;
  timestamp: string;
}

// 11. FitScore (คะแนนความเข้ากัน 0-100 ของ TopicCard กับข้อจำกัดผู้เรียน)
export interface FitScoreBreakdown {
  time: number;
  budget: number;
  equipment: number;
  teamSize: number;
  skills: number;
  gradeLevel: number;
}

export interface FitScore {
  score: number;
  breakdown: FitScoreBreakdown;
}

// 12. ShortlistItem (การ์ดที่ปัดสนใจ 5 ใบเพื่อเทียบเคียงกัน)
export interface ShortlistItem {
  card: TopicCard;
  fitScore: FitScore;
  addedAt: string;
}

// 13. Idea (ไอเดีย: หัวข้อที่เลือกแล้ว + มุมมองของผู้เรียน)
export interface IdeaVariablesLite {
  independent: string;
  dependent: string;
  controlled: string[];
  controlGroup: string;
  replicates: number;
}

export type VariableIsolator =
  | { preset: 'science'; independent: string; dependent: string; controlled: string[];
      controlGroup: string; unit: string; replicates: number; customUnitConfirmed?: boolean }
  | { preset: 'computing'; input: string; output: string; baseline: string;
      metric: string; unit: string; dataSplit: string; replicates: number; customUnitConfirmed?: boolean };

export interface Idea {
  id: string;
  learnerId: string;
  title: string;
  description: string;
  source: Track;
  sourceTopicCardId?: string;
  gradeLevel: GradeLevel;
  goal: Goal;
  variables?: IdeaVariablesLite;
  isolator?: VariableIsolator;
  safetyChecklist?: string[];
  usedTier3Example?: boolean;
  tier3Rewrite?: string;
  createdAt: string;
  updatedAt: string;
}

// 14. Evaluation (การประเมิน 5 ด้าน: novelty, feasibility, impact, rigor, fit)
export const EVALUATION_AXES = ['novelty', 'feasibility', 'impact', 'rigor', 'fit'] as const;
export type EvaluationAxis = (typeof EVALUATION_AXES)[number];

export const SCORE_BADGES = ['green', 'yellow', 'red'] as const;
export type ScoreBadge = (typeof SCORE_BADGES)[number];

export interface AxisEvaluation {
  score: number;
  badge: ScoreBadge;
  rationale: string;
  feedback: string;
}

export interface EvaluationAxes {
  novelty: AxisEvaluation;
  feasibility: AxisEvaluation;
  impact: AxisEvaluation;
  rigor: AxisEvaluation;
  fit: AxisEvaluation;
}

export interface Evaluation {
  id: string;
  ideaId: string;
  overallScore: number;
  overallBadge: ScoreBadge;
  axes: EvaluationAxes;
  safetyFlags: SafetyFlag[];
  priorWork: PriorWork[];
  evaluatedAt: string;
}

// 15. RubricPreset (ชุดเกณฑ์ประเมิน: เป้าหมาย × ระดับชั้น)
export interface RubricPresetWeights {
  novelty: number;
  feasibility: number;
  impact: number;
  rigor: number;
  fit: number;
}

export interface RubricPresetCriteria {
  novelty: string;
  feasibility: string;
  impact: string;
  rigor: string;
  fit: string;
}

export interface RubricPreset {
  id: string;
  goal: Goal;
  gradeLevel: GradeLevel;
  nameTh: string;
  descriptionTh: string;
  weights: RubricPresetWeights;
  criteria: RubricPresetCriteria;
  isHeuristic: boolean;
}

// 16. PriorWork (งานที่คล้ายกัน: โครงงานหรืองานวิจัยที่มีอยู่จริง มี URL ตรวจสอบได้)
export interface PriorWork {
  id: string;
  title: string;
  authors: string;
  year: number;
  competitionOrVenue: string;
  url: string;
  summary: string;
  difference: string;
  subfieldIds?: string[];
  keywords?: string[];
  verifiedAt?: string;
  observedTitle?: string;
}

export interface VerifiedPriorWork extends PriorWork {
  subfieldIds: string[];
  keywords: string[];
  verifiedAt: string;
  observedTitle: string;
}

// 17. SafetyFlag (ธงความปลอดภัย: มาตรฐาน SRC/ISEF 5 หมวดความเสี่ยง)
export const SAFETY_CATEGORIES = [
  'hazardous_chemicals',
  'vertebrate_animals',
  'human_subjects',
  'biological_agents',
  'high_voltage_radiation',
] as const;
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export interface SafetyFlag {
  category: SafetyCategory;
  flagged: boolean;
  reasonTh: string;
  advisoryTh: string;
  requiresPreApproval: boolean;
  matchedTerms?: string[];
  blocking?: boolean;
}

// 18. Pivot & PivotCoaching (มุมใหม่ & การโค้ชชวนคิดแบบ 3 ระดับ)
export type CoachingTier = 1 | 2 | 3;

export interface PivotCoaching {
  tier: CoachingTier;
  tier1Prompt: string;
  tier2Lenses?: string[];
  tier3Examples?: string[];
  selectedAngle?: string;
}

export interface Pivot {
  id: string;
  originalIdeaId: string;
  redAxes: EvaluationAxis[];
  coaching: PivotCoaching;
  newIdeaTitle?: string;
  newIdeaDescription?: string;
  createdAt: string;
}

// 19. Proposal (ข้อเสนอโครงงาน 1 หน้า: ที่มา วัตถุประสงค์ สมมติฐาน ตัวแปร วิธีทำ)
export interface ProposalVariables {
  independent: string[];
  dependent: string[];
  controlled: string[];
}

export interface Proposal {
  title: string;
  problemStatement: string;
  objectives: string[];
  hypothesis: string;
  variables: ProposalVariables;
  methodology: string;
}

// 20. Plan (แผนงานรายสัปดาห์จากวันนี้ถึงวันส่งงาน)
export interface PlanMilestone {
  week: number;
  title: string;
  description: string;
  deliverable: string;
  completed: boolean;
}

export interface Plan {
  targetDeadline: string;
  totalWeeks: number;
  milestones: PlanMilestone[];
}

// 21. Project (โครงงาน: ไอเดียที่ผ่านการประเมินแล้ว + Proposal + Plan)
export type ProjectStatus = 'in_progress' | 'ready_for_review' | 'completed';

export interface Project {
  id: string;
  learnerId: string;
  ideaId: string;
  title: string;
  proposal: Proposal;
  plan: Plan;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
