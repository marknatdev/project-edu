import { AXIS_PIVOT_GUIDES } from './guides';
import type {
  CoachingTier,
  EvaluationAxis,
  Idea,
  Constraints,
  Pivot,
  PivotCoaching,
} from '@/types/domain';
import { isRewriteAcceptable } from '@/lib/advisor/chat-reducer';
import type { PivotView } from './pivot-dto';

export interface InitPivotParams {
  idea: Idea;
  redAxes: EvaluationAxis[];
  constraints?: Constraints;
  activeAxis?: EvaluationAxis;
}

export interface PivotState {
  originalIdea: Idea;
  constraints?: Constraints;
  redAxes: EvaluationAxis[];
  activeAxis: EvaluationAxis;
  currentTier: CoachingTier;
  unlockedTiers: CoachingTier[];
  tier1Prompt: string;
  tier2Lenses: string[];
  tier3Examples: string[];
  pendingAngle: string | null;
  studentRewrite: string | null;
  updatedIdea: Idea | null;
  pivotRecord: Pivot | null;
  canAccessProposal: boolean;
  isWaitingForResponse: boolean;
  error: string | null;
}

export type PivotAction =
  | { type: 'SWITCH_AXIS'; axis: EvaluationAxis }
  | { type: 'SELECT_TIER'; tier: CoachingTier }
  | { type: 'UNLOCK_TIER_2' }
  | { type: 'REQUEST_TIER_3' }
  | {
      type: 'SET_COACHING_DATA';
      tier1Prompt?: string;
      tier2Lenses?: string[];
      tier3Examples?: string[];
    }
  | { type: 'SELECT_ANGLE'; angle: string }
  | { type: 'SUBMIT_REWRITE'; rewrite: string }
  | { type: 'SERVER_SYNC'; pivot: PivotView }
  | { type: 'COACH_FAILURE_FALLBACK'; error?: string }
  | { type: 'SET_LOADING'; loading: boolean };

export function createInitialPivotState(params: InitPivotParams): PivotState {
  const { idea, redAxes, constraints } = params;
  const activeAxis = params.activeAxis ?? redAxes[0] ?? 'feasibility';
  const guide = AXIS_PIVOT_GUIDES[activeAxis] ?? AXIS_PIVOT_GUIDES.feasibility;

  return {
    originalIdea: idea,
    constraints,
    redAxes,
    activeAxis,
    currentTier: 1,
    unlockedTiers: [1],
    tier1Prompt: guide.tier1,
    tier2Lenses: guide.tier2Lenses,
    // DEF-02: Tier 3 examples only ever arrive from the server after verified
    // Tier 1 answer + Tier 2 hint; never pre-filled or fabricated locally.
    tier3Examples: [],
    pendingAngle: null,
    studentRewrite: null,
    updatedIdea: null,
    pivotRecord: null,
    canAccessProposal: true, // Never blocks access to Proposal (AC-8)
    isWaitingForResponse: false,
    error: null,
  };
}

export function pivotReducer(state: PivotState, action: PivotAction): PivotState {
  switch (action.type) {
    case 'SWITCH_AXIS': {
      const newAxis = action.axis;
      const guide = AXIS_PIVOT_GUIDES[newAxis] ?? AXIS_PIVOT_GUIDES.feasibility;

      return {
        ...state,
        activeAxis: newAxis,
        currentTier: 1,
        unlockedTiers: [1],
        tier1Prompt: guide.tier1,
        tier2Lenses: guide.tier2Lenses,
        tier3Examples: [],
        pendingAngle: null,
        studentRewrite: null,
        error: null,
      };
    }

    case 'SERVER_SYNC': {
      // Server authority replaces local unlock state entirely (DEF-02).
      const p = action.pivot;
      if (p.axis !== state.activeAxis) return state;
      const unlockedTiers = [...p.unlockedTiers] as CoachingTier[];
      return {
        ...state,
        unlockedTiers,
        currentTier: unlockedTiers.includes(state.currentTier) ? state.currentTier : unlockedTiers[unlockedTiers.length - 1],
        tier1Prompt: p.tier1Prompt,
        tier2Lenses: p.tier2Lenses ?? state.tier2Lenses,
        tier3Examples: p.tier3Examples?.slice(0, 3) ?? [],
        isWaitingForResponse: false,
        error: null,
      };
    }

    case 'SELECT_TIER': {
      // Cannot select a tier that is not unlocked
      if (!state.unlockedTiers.includes(action.tier)) {
        return state;
      }
      return {
        ...state,
        currentTier: action.tier,
      };
    }

    case 'UNLOCK_TIER_2': {
      const unlocked = state.unlockedTiers.includes(2)
        ? state.unlockedTiers
        : [...state.unlockedTiers, 2 as CoachingTier].sort();

      return {
        ...state,
        unlockedTiers: unlocked,
        currentTier: 2,
      };
    }

    case 'REQUEST_TIER_3': {
      // ADR 0002 progressive locking:
      // Tier 3 strictly requires both Tier 1 AND Tier 2 to have been unlocked!
      if (!state.unlockedTiers.includes(1) || !state.unlockedTiers.includes(2)) {
        return {
          ...state,
          error: 'ปุ่มมุมมองใหม่จะปลดล็อกหลังจากได้ลองคิดคำถามระดับ 1 และขอคำใบ้ระดับ 2 แล้วเท่านั้น',
        };
      }

      const unlocked = state.unlockedTiers.includes(3)
        ? state.unlockedTiers
        : [...state.unlockedTiers, 3 as CoachingTier].sort();

      return {
        ...state,
        unlockedTiers: unlocked,
        currentTier: 3,
        error: null,
      };
    }

    case 'SET_COACHING_DATA': {
      // Enforce 2..3 angles for Tier 3
      let sanitizedExamples = state.tier3Examples;
      if (action.tier3Examples && action.tier3Examples.length > 0) {
        sanitizedExamples = action.tier3Examples.slice(0, 3);
        if (sanitizedExamples.length === 1 && state.tier3Examples.length >= 2) {
          sanitizedExamples.push(state.tier3Examples[1]);
        }
      }

      return {
        ...state,
        tier1Prompt: action.tier1Prompt || state.tier1Prompt,
        tier2Lenses: action.tier2Lenses || state.tier2Lenses,
        tier3Examples: sanitizedExamples,
        isWaitingForResponse: false,
        error: null,
      };
    }

    case 'SELECT_ANGLE': {
      return {
        ...state,
        pendingAngle: action.angle,
      };
    }

    case 'SUBMIT_REWRITE': {
      if (!state.pendingAngle) {
        return {
          ...state,
          error: 'กรุณาเลือกมุมมองใหม่ที่ต้องการก่อนเขียนอธิบาย',
        };
      }

      const check = isRewriteAcceptable(state.pendingAngle, action.rewrite);
      if (!check.acceptable) {
        return {
          ...state,
          error: check.reasonTh ?? 'ข้อความยังไม่ผ่านเกณฑ์การเขียนใหม่',
        };
      }

      const coachingRecord: PivotCoaching = {
        tier: state.currentTier,
        tier1Prompt: state.tier1Prompt,
        tier2Lenses: state.tier2Lenses,
        tier3Examples: state.tier3Examples,
        selectedAngle: state.pendingAngle,
      };

      const now = new Date().toISOString();
      const pivotId = `pivot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const newIdeaDescription = `${state.originalIdea.description}\n\n[ปรับปรุงมุมมองใหม่ตามคำแนะนำด้าน ${state.activeAxis}]: ${action.rewrite.trim()}`;

      const updatedIdea: Idea = {
        ...state.originalIdea,
        description: newIdeaDescription,
        usedTier3Example: state.currentTier === 3,
        tier3Rewrite: action.rewrite.trim(),
        updatedAt: now,
      };

      const pivotRecord: Pivot = {
        id: pivotId,
        originalIdeaId: state.originalIdea.id,
        redAxes: state.redAxes,
        coaching: coachingRecord,
        newIdeaTitle: state.originalIdea.title,
        newIdeaDescription,
        createdAt: now,
      };

      return {
        ...state,
        studentRewrite: action.rewrite.trim(),
        updatedIdea,
        pivotRecord,
        error: null,
      };
    }

    case 'COACH_FAILURE_FALLBACK': {
      // Deterministic local Tier 1/2 guidance on network error. ADR 0002: offline
      // steps are not Tier 3 evidence, so Tier 3 examples are never filled here.
      const guide = AXIS_PIVOT_GUIDES[state.activeAxis] ?? AXIS_PIVOT_GUIDES.feasibility;
      return {
        ...state,
        tier1Prompt: guide.tier1,
        tier2Lenses: guide.tier2Lenses,
        isWaitingForResponse: false,
        error: action.error ?? null,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isWaitingForResponse: action.loading,
      };
    }

    default:
      return state;
  }
}
