import type {
  Evaluation,
  EvaluationAxes,
  EvaluationAxis,
  Idea,
  Constraints,
  CoachingTier,
  PivotCoaching,
  VerifiedPriorWork,
} from '@/types/domain';
import { getRubricPreset } from '@/lib/rubrics/presets';
import { computeEvaluationScore } from '@/lib/rubrics/engine';
import { screenIdea } from '@/lib/safety/screener';
import { findPriorWork } from '@/lib/prior-work/match';
import { PRIOR_WORK } from '@/data/prior-work';
import { AXIS_PIVOT_GUIDES } from '@/lib/pivot/guides';

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface FetchEvaluationParams {
  anonymousId: string;
  idea: Idea;
  constraints?: Constraints;
}

export interface EvaluationApiResponse {
  success: boolean;
  evaluation?: Evaluation;
  quota?: QuotaInfo;
  source?: 'ai' | 'fallback';
  error?: string;
  quotaExceeded?: boolean;
}

export interface FetchPivotParams {
  anonymousId: string;
  idea: Idea;
  redAxes: EvaluationAxis[];
  tier: CoachingTier;
  constraints?: Constraints;
  unlockedTiers?: CoachingTier[];
}

export interface PivotApiResponse {
  success: boolean;
  coaching?: PivotCoaching;
  quota?: QuotaInfo;
  source?: 'ai' | 'fallback';
  error?: string;
  quotaExceeded?: boolean;
}

/**
 * Pure local deterministic evaluation generator used when offline or AI call fails.
 */
export function generateOfflineEvaluation(idea: Idea): Evaluation {
  const preset = getRubricPreset(idea.goal, idea.gradeLevel);
  const safetyFlags = screenIdea(`${idea.title} ${idea.description}`);
  const rawMatchedPriorWork: VerifiedPriorWork[] = findPriorWork(idea, 3);
  const matchedPriorWork: VerifiedPriorWork[] =
    rawMatchedPriorWork.length > 0 ? rawMatchedPriorWork : PRIOR_WORK.slice(0, 3);

  const defaultAxes: EvaluationAxes = {
    novelty: {
      score: 7,
      badge: 'green',
      rationale:
        'หัวข้อมีความคิดริเริ่มสร้างสรรค์และมีประเด็นท้าทายที่น่าสนใจในการต่อยอดจากสิ่งรอบตัว',
      feedback:
        'ลองสำรวจเอกสารงานวิจัยเพิ่มเติมเพื่อระบุความแตกต่างและจุดเด่นเฉพาะตัวของโครงงานให้ชัดเจนขึ้น',
    },
    feasibility: {
      score: 7,
      badge: 'green',
      rationale:
        'ขอบเขตและอุปกรณ์อยู่ในระดับที่สามารถจัดหาและดำเนินการได้จริงตามระดับชั้น',
      feedback:
        'ควรวางแผนการทดลองและตารางการทำงานล่วงหน้าเพื่อป้องกันปัญหาเรื่องระยะเวลา',
    },
    impact: {
      score: 8,
      badge: 'green',
      rationale:
        'ผลสัมฤทธิ์ของโครงงานมีศักยภาพในการแก้ไขปัญหาจริงและเกิดประโยชน์ต่อผู้ใช้หรือชุมชน',
      feedback:
        'ระบุกลุ่มผู้ได้รับผลประโยชน์และวิธีการวัดคุณค่าเชิงผลกระทบให้ชัดเจนยิ่งขึ้น',
    },
    rigor: {
      score: 6,
      badge: 'yellow',
      rationale:
        'แนวคิดมีความเป็นวิทยาศาสตร์ แต่ยังจำเป็นต้องระบุตัวแปรและวิธีการควบคุมอย่างรัดกุม',
      feedback:
        'ควรกำหนดตัวแปรต้น ตัวแปรตาม และตัวแปรควบคุมให้ชัดเจน และทำซ้ำเพื่อความน่าเชื่อถือ',
    },
    fit: {
      score: 8,
      badge: 'green',
      rationale:
        'สอดคล้องกับเป้าหมายการแข่งขันและเกณฑ์การประเมินของระดับชั้นที่เลือก',
      feedback:
        'ปรับปรุงการนำเสนอให้ตอบโจทย์เกณฑ์ของเวทีการประกวดที่ตั้งเป้าหมายไว้',
    },
  };

  const { overallScore, overallBadge } = computeEvaluationScore(defaultAxes, preset);

  return {
    id: `eval_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ideaId: idea.id,
    overallScore: Math.round(overallScore),
    overallBadge,
    axes: defaultAxes,
    safetyFlags,
    priorWork: matchedPriorWork,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Pure local deterministic pivot coaching generator used when offline or AI call fails.
 */
export function generateOfflinePivotCoaching(
  primaryAxis: EvaluationAxis,
  tier: CoachingTier
): PivotCoaching {
  const guide = AXIS_PIVOT_GUIDES[primaryAxis] ?? AXIS_PIVOT_GUIDES.feasibility;
  return {
    tier,
    tier1Prompt: guide.tier1,
    tier2Lenses: tier >= 2 ? guide.tier2Lenses : undefined,
    tier3Examples: tier === 3 ? guide.tier3Examples.slice(0, 3) : undefined,
  };
}

/**
 * Fetch evaluation from /api/ai/evaluate with automatic offline and quota fallback.
 */
export async function fetchEvaluation(
  params: FetchEvaluationParams
): Promise<EvaluationApiResponse> {
  try {
    const res = await fetch('/api/ai/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        quotaExceeded: true,
        error:
          data.messageTh ||
          'วันนี้คุณประเมินโครงงานครบตามโควตา 5 ครั้งแล้ว สามารถกลับมาใหม่ได้ในวันพรุ่งนี้',
        quota: {
          used: 5,
          limit: 5,
          remaining: 0,
          resetAt: data.resetAt || new Date().toISOString(),
        },
      };
    }

    if (!res.ok) {
      // Offline / server error fallback
      const offlineEval = generateOfflineEvaluation(params.idea);
      return {
        success: true,
        evaluation: offlineEval,
        source: 'fallback',
        error: `Server responded with ${res.status}, using offline fallback`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      evaluation: data.evaluation,
      quota: data.quota,
      source: data.source ?? 'ai',
    };
  } catch (err) {
    // Network / fetch rejection fallback
    const offlineEval = generateOfflineEvaluation(params.idea);
    return {
      success: true,
      evaluation: offlineEval,
      source: 'fallback',
      error: err instanceof Error ? err.message : 'Network error, using offline fallback',
    };
  }
}

/**
 * Fetch pivot guidance from /api/ai/pivot with automatic offline and quota fallback.
 */
export async function fetchPivot(params: FetchPivotParams): Promise<PivotApiResponse> {
  const primaryAxis = params.redAxes[0] ?? 'feasibility';

  try {
    const res = await fetch('/api/ai/pivot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.status === 429) {
      const offlineCoaching = generateOfflinePivotCoaching(primaryAxis, params.tier);
      return {
        success: true,
        coaching: offlineCoaching,
        source: 'fallback',
        quotaExceeded: true,
        error: 'โควตาข้อเสนอแนะพิเศษเต็มแล้ว ใช้คำแนะนำชวนคิดจากฐานข้อมูลระบบ',
      };
    }

    if (!res.ok) {
      const offlineCoaching = generateOfflinePivotCoaching(primaryAxis, params.tier);
      return {
        success: true,
        coaching: offlineCoaching,
        source: 'fallback',
      };
    }

    const data = await res.json();
    return {
      success: true,
      coaching: data.coaching,
      quota: data.quota,
      source: data.source ?? 'ai',
    };
  } catch {
    const offlineCoaching = generateOfflinePivotCoaching(primaryAxis, params.tier);
    return {
      success: true,
      coaching: offlineCoaching,
      source: 'fallback',
    };
  }
}
