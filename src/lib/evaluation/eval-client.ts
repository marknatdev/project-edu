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
import { evaluateIsolator } from '@/lib/variables/rigor';
import { appFetch } from '@/lib/auth/workspace-client';
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

// DEF-04: no anonymousId — the server binds quota to the verified owner.
export interface FetchEvaluationParams {
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

/**
 * Pure local deterministic evaluation generator used when offline or AI call fails.
 */
export function generateOfflineEvaluation(idea: Idea): Evaluation {
  const preset = getRubricPreset(idea.goal, idea.gradeLevel);
  const safetyFlags = screenIdea(idea);
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

  if (idea.isolator) defaultAxes.rigor = evaluateIsolator(idea.isolator);

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
 * Pure local deterministic pivot guidance for offline use. ADR 0002: offline
 * steps are never Tier 3 evidence, so this never returns Tier 3 examples.
 */
export function generateOfflinePivotCoaching(
  primaryAxis: EvaluationAxis,
  tier: CoachingTier
): PivotCoaching {
  const guide = AXIS_PIVOT_GUIDES[primaryAxis] ?? AXIS_PIVOT_GUIDES.feasibility;
  const offlineTier: CoachingTier = tier >= 2 ? 2 : 1;
  return {
    tier: offlineTier,
    tier1Prompt: guide.tier1,
    tier2Lenses: offlineTier === 2 ? guide.tier2Lenses : undefined,
  };
}

/**
 * Fetch evaluation from /api/ai/evaluate with automatic offline and quota fallback.
 */
export async function fetchEvaluation(
  params: FetchEvaluationParams
): Promise<EvaluationApiResponse> {
  try {
    const res = await appFetch('/api/ai/evaluate', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: params.idea, constraints: params.constraints }),
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      if (data.error === 'RATE_LIMITED') {
        return { success: false, quotaExceeded: false, error: data.messageTh || 'ขอประเมินถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' };
      }
      return {
        success: false,
        quotaExceeded: true,
        error:
          data.messageTh ||
          'วันนี้คุณประเมินโครงงานครบตามโควตา 5 ครั้งแล้ว สามารถกลับมาใหม่ได้ในวันพรุ่งนี้',
        quota: data.quota ?? {
          used: 5,
          limit: 5,
          remaining: 0,
          resetAt: data.resetAt || new Date().toISOString(),
        },
      };
    }

    if ([401, 403, 409, 410].includes(res.status)) {
      return { success: false, error: 'สิทธิ์หรือพื้นที่งานเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ก่อนประเมิน งานเดิมยังอยู่' };
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
