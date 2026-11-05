import type {
  Evaluation,
  EvaluationAxis,
  ScoreBadge,
  SafetyFlag,
  VerifiedPriorWork,
} from '@/types/domain';
import { scoreToBadge } from '@/lib/rubrics/engine';
import { PRIOR_WORK } from '@/data/prior-work';

export interface AxisViewItem {
  key: EvaluationAxis;
  nameTh: string;
  nameEn: string;
  score: number;
  badge: ScoreBadge;
  emoji: string;
  labelTh: string;
  ariaLabel: string;
  rationale: string;
  feedback: string;
}

export interface OverallViewItem {
  score: number;
  badge: ScoreBadge;
  emoji: string;
  labelTh: string;
  ariaLabel: string;
}

export interface EvaluationViewOptions {
  quotaRemaining?: number;
  priorWorkDb?: VerifiedPriorWork[];
}

export interface EvaluationViewModel {
  id: string;
  ideaId: string;
  evaluatedAt: string;
  overall: OverallViewItem;
  axes: Record<EvaluationAxis, AxisViewItem>;
  axesList: AxisViewItem[];
  priorWork: VerifiedPriorWork[];
  safetyFlags: SafetyFlag[];
  hasSafetyFlags: boolean;
  canProceedToProposal: boolean;
  canReevaluate: boolean;
  quotaRemaining: number;
  quotaMessageTh?: string;
  redAxes: EvaluationAxis[];
  hasRedAxes: boolean;
}

export const AXIS_META: Record<
  EvaluationAxis,
  { nameTh: string; nameEn: string; defaultRationale: string; defaultFeedback: string }
> = {
  novelty: {
    nameTh: 'ความคิดริเริ่มสร้างสรรค์ (Novelty)',
    nameEn: 'Novelty & Originality',
    defaultRationale: 'หัวข้อมีความคิดริเริ่มสร้างสรรค์และมีประเด็นท้าทายที่น่าสนใจ',
    defaultFeedback: 'ลองสำรวจเอกสารงานวิจัยเพิ่มเติมเพื่อระบุความแตกต่างและจุดเด่นเฉพาะตัว',
  },
  feasibility: {
    nameTh: 'ความเป็นไปได้จริงตามงบ/เวลา (Feasibility)',
    nameEn: 'Feasibility & Resources',
    defaultRationale: 'ขอบเขตและอุปกรณ์อยู่ในระดับที่สามารถจัดหาและดำเนินการได้จริงตามระดับชั้น',
    defaultFeedback: 'ควรวางแผนการทดลองและตารางการทำงานล่วงหน้าเพื่อป้องกันปัญหาเรื่องระยะเวลา',
  },
  impact: {
    nameTh: 'ผลกระทบและประโยชน์นำไปใช้ (Impact)',
    nameEn: 'Impact & Relevance',
    defaultRationale: 'ผลสัมฤทธิ์ของโครงงานมีศักยภาพในการแก้ไขปัญหาจริงและเกิดประโยชน์ต่อผู้ใช้หรือชุมชน',
    defaultFeedback: 'ระบุกลุ่มผู้ได้รับผลประโยชน์และวิธีการวัดคุณค่าเชิงผลกระทบให้ชัดเจนขึ้น',
  },
  rigor: {
    nameTh: 'สมมติฐานและการวัดผล (Rigor & Metrics)',
    nameEn: 'Scientific Rigor & Methodology',
    defaultRationale: 'แนวคิดมีความเป็นวิทยาศาสตร์ แต่ยังจำเป็นต้องระบุตัวแปรและวิธีการควบคุมอย่างรัดกุม',
    defaultFeedback: 'ควรกำหนดตัวแปรต้น ตัวแปรตาม และตัวแปรควบคุมให้ชัดเจน และทำซ้ำเพื่อความน่าเชื่อถือ',
  },
  fit: {
    nameTh: 'ความเหมาะสมกับเป้าหมาย/เกณฑ์ (Goal Alignment)',
    nameEn: 'Goal Alignment & Fit',
    defaultRationale: 'สอดคล้องกับเป้าหมายการแข่งขันและเกณฑ์การประเมินของระดับชั้นที่เลือก',
    defaultFeedback: 'ปรับปรุงการนำเสนอให้ตอบโจทย์เกณฑ์ของเวทีการประกวดที่ตั้งเป้าหมายไว้',
  },
};

export const BADGE_META: Record<
  ScoreBadge,
  { emoji: string; labelTh: string; ariaLabel: string }
> = {
  green: {
    emoji: '🟢',
    labelTh: 'แข็งแรง / โดดเด่น',
    ariaLabel: 'ระดับดีมาก (7-10)',
  },
  yellow: {
    emoji: '🟡',
    labelTh: 'ควรปรับปรุง / พัฒนาต่อ',
    ariaLabel: 'ระดับปานกลาง (4-6)',
  },
  red: {
    emoji: '🔴',
    labelTh: 'เสี่ยงสูง / ต้องปรับปรุง',
    ariaLabel: 'ระดับเสี่ยงสูง (1-3)',
  },
};

export function buildEvaluationView(
  evaluation: Evaluation,
  options: EvaluationViewOptions = {}
): EvaluationViewModel {
  const { quotaRemaining = 0 } = options;

  // 1. Overall
  const overallScoreClamped = Math.min(10, Math.max(1, Math.round(evaluation.overallScore)));
  const overallBadge = scoreToBadge(overallScoreClamped);
  const overallMeta = BADGE_META[overallBadge];

  const overall: OverallViewItem = {
    score: overallScoreClamped,
    badge: overallBadge,
    emoji: overallMeta.emoji,
    labelTh: overallMeta.labelTh,
    ariaLabel: overallMeta.ariaLabel,
  };

  // 2. Axes
  const axisKeys: EvaluationAxis[] = ['novelty', 'feasibility', 'impact', 'rigor', 'fit'];
  const axesResult = {} as Record<EvaluationAxis, AxisViewItem>;
  const axesList: AxisViewItem[] = [];
  const redAxes: EvaluationAxis[] = [];

  for (const key of axisKeys) {
    const rawAxis = evaluation.axes[key];
    const score = Math.min(10, Math.max(1, Math.round(rawAxis.score)));
    const badge = scoreToBadge(score);
    const meta = BADGE_META[badge];
    const axisInfo = AXIS_META[key];

    if (badge === 'red') {
      redAxes.push(key);
    }

    const item: AxisViewItem = {
      key,
      nameTh: axisInfo.nameTh,
      nameEn: axisInfo.nameEn,
      score,
      badge,
      emoji: meta.emoji,
      labelTh: meta.labelTh,
      ariaLabel: `${axisInfo.nameTh}: ${meta.ariaLabel}`,
      rationale: rawAxis.rationale?.trim() || axisInfo.defaultRationale,
      feedback: rawAxis.feedback?.trim() || axisInfo.defaultFeedback,
    };

    axesResult[key] = item;
    axesList.push(item);
  }

  // 3. Safety flags (non-blocking)
  const flaggedItems = evaluation.safetyFlags.filter((f) => f.flagged);

  // 4. Prior work
  const verifiedDb = options.priorWorkDb ?? PRIOR_WORK;
  const verifiedMap = new Map<string, VerifiedPriorWork>(verifiedDb.map((p) => [p.id, p]));
  const verifiedPriorWork: VerifiedPriorWork[] = [];

  for (const pw of evaluation.priorWork) {
    const dbMatch = verifiedMap.get(pw.id);
    if (dbMatch && dbMatch.url === pw.url) {
      verifiedPriorWork.push(dbMatch);
    }
  }

  const canReevaluate = quotaRemaining > 0;

  return {
    id: evaluation.id,
    ideaId: evaluation.ideaId,
    evaluatedAt: evaluation.evaluatedAt,
    overall,
    axes: axesResult,
    axesList,
    priorWork: verifiedPriorWork,
    safetyFlags: flaggedItems,
    hasSafetyFlags: flaggedItems.length > 0,
    canProceedToProposal: true,
    canReevaluate,
    quotaRemaining,
    quotaMessageTh: canReevaluate
      ? undefined
      : 'วันนี้คุณประเมินโครงงานครบตามโควตาแล้ว สามารถกลับมาประเมินใหม่ได้ในวันพรุ่งนี้',
    redAxes,
    hasRedAxes: redAxes.length > 0,
  };
}
