import { NextResponse } from 'next/server';
import { z } from 'zod';
import { quotaStore, getQuotaExceededMessage } from '@/lib/ai/quota';
import { callAiGateway } from '@/lib/ai/gateway';
import { getRubricPreset } from '@/lib/rubrics/presets';
import { computeEvaluationScore, scoreToBadge } from '@/lib/rubrics/engine';
import { screenIdea } from '@/lib/safety/screener';
import { findPriorWork } from '@/lib/prior-work/match';
import { IdeaSchema, ConstraintsSchema, EvaluationSchema } from '@/lib/schemas';
import type {
  Evaluation,
  EvaluationAxes,
  EvaluationAxis,
  VerifiedPriorWork,
} from '@/types/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EvaluateRequestSchema = z
  .object({
    anonymousId: z.string().min(1),
    idea: IdeaSchema,
    constraints: ConstraintsSchema.optional(),
  })
  .strict();

const AiAxisSchema = z.object({
  score: z.number().int().min(1).max(10).optional(),
  rationale: z.string().min(1),
  feedback: z.string().min(1),
});

const AiEvaluateResponseSchema = z.object({
  axes: z.object({
    novelty: AiAxisSchema,
    feasibility: AiAxisSchema,
    impact: AiAxisSchema,
    rigor: AiAxisSchema,
    fit: AiAxisSchema,
  }),
  priorWorkIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid input or disallowed fields detected (Zero-PII violated)',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { anonymousId, idea } = parsed.data;

  // Enforce quota (5 evaluations per day)
  const quotaResult = await quotaStore.consume(anonymousId, 'evaluate', 1);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        messageTh: getQuotaExceededMessage('evaluate'),
        remaining: quotaResult.record.remaining,
        resetAt: quotaResult.record.resetAt,
      },
      { status: 429 }
    );
  }

  // 1. M1 Rubric preset for goal x gradeLevel
  const preset = getRubricPreset(idea.goal, idea.gradeLevel);

  // 2. M1 Deterministic Safety Screener
  const safetyFlags = screenIdea(`${idea.title} ${idea.description}`);

  // 3. M2.2 Deterministic Prior Work Matcher
  const matchedPriorWork: VerifiedPriorWork[] = findPriorWork(idea, 3);
  const matchedDbMap = new Map<string, VerifiedPriorWork>(
    matchedPriorWork.map((pw) => [pw.id, pw])
  );

  // 4. Default / Fallback Axis Evaluations
  const defaultAxes: EvaluationAxes = {
    novelty: {
      score: 7,
      badge: 'green',
      rationale:
        'หัวข้อมีความคิดสร้างสรรค์และมีประเด็นท้าทายที่น่าสนใจในการต่อยอดจากสิ่งรอบตัว',
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
        'สามารถเก็บข้อมูลผลกระทบเชิงปริมาณหรือความคิดเห็นจากกลุ่มผู้ใช้จริงเพื่อยืนยันประโยชน์',
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

  const systemPrompt = `คุณคือผู้ประเมินโครงงานวิทยาศาสตร์และนวัตกรรมมืออาชีพ
วิเคราะห์ไอเดียโครงงานตามเกณฑ์ 5 ด้าน: novelty, feasibility, impact, rigor, fit
แต่ละด้านให้คะแนนเป็นจำนวนเต็ม 1-10 พร้อมระบุ rationale และ feedback ภาษาไทยที่กระชับและสร้างสรรค์
ห้ามสร้างหรือแต่งข้อมูลผลงานอ้างอิงเองเด็ดขาด`;

  const userPrompt = `ประเมินโครงงานของนักเรียน:
หัวข้อ: ${idea.title}
คำอธิบาย: ${idea.description}
ระดับชั้น: ${idea.gradeLevel}
เป้าหมาย: ${idea.goal}
เกณฑ์ Rubric: ${preset.nameTh} (${preset.descriptionTh})
น้ำหนักเกณฑ์: Novelty=${preset.weights.novelty}, Feasibility=${preset.weights.feasibility}, Impact=${preset.weights.impact}, Rigor=${preset.weights.rigor}, Fit=${preset.weights.fit}
ผลงานอ้างอิงที่มีในระบบ: ${matchedPriorWork.map((pw) => pw.id + ': ' + pw.title).join(' | ')}
สร้างผลการประเมินในรูปแบบ JSON`;

  const gatewayResult = await callAiGateway({
    schema: AiEvaluateResponseSchema,
    prompt: userPrompt,
    systemPrompt,
    fallback: () => ({
      axes: {
        novelty: {
          score: defaultAxes.novelty.score,
          rationale: defaultAxes.novelty.rationale,
          feedback: defaultAxes.novelty.feedback,
        },
        feasibility: {
          score: defaultAxes.feasibility.score,
          rationale: defaultAxes.feasibility.rationale,
          feedback: defaultAxes.feasibility.feedback,
        },
        impact: {
          score: defaultAxes.impact.score,
          rationale: defaultAxes.impact.rationale,
          feedback: defaultAxes.impact.feedback,
        },
        rigor: {
          score: defaultAxes.rigor.score,
          rationale: defaultAxes.rigor.rationale,
          feedback: defaultAxes.rigor.feedback,
        },
        fit: {
          score: defaultAxes.fit.score,
          rationale: defaultAxes.fit.rationale,
          feedback: defaultAxes.fit.feedback,
        },
      },
      priorWorkIds: matchedPriorWork.map((pw) => pw.id),
    }),
  });

  // Construct axes with scoreToBadge ensuring integer 1..10 and strictly matching badges
  const finalAxes: EvaluationAxes = {} as EvaluationAxes;
  const axisKeys: EvaluationAxis[] = [
    'novelty',
    'feasibility',
    'impact',
    'rigor',
    'fit',
  ];

  for (const axis of axisKeys) {
    const aiAxis = gatewayResult.data.axes[axis];
    const score =
      typeof aiAxis?.score === 'number'
        ? Math.min(10, Math.max(1, Math.round(aiAxis.score)))
        : defaultAxes[axis].score;
    const badge = scoreToBadge(score);

    finalAxes[axis] = {
      score,
      badge,
      rationale: aiAxis?.rationale || defaultAxes[axis].rationale,
      feedback: aiAxis?.feedback || defaultAxes[axis].feedback,
    };
  }

  // Compute overall score according to Rubric weights
  const { overallScore: calculatedOverall, overallBadge } =
    computeEvaluationScore(finalAxes, preset);
  const overallScore = Math.min(10, Math.max(1, Math.round(calculatedOverall)));

  // Strict DB-only citations: NEVER allow AI to fabricate citations or URLs
  // Only accept IDs that are genuinely present in our verified DB matches!
  let finalPriorWork: VerifiedPriorWork[] = [];
  if (gatewayResult.data.priorWorkIds && gatewayResult.data.priorWorkIds.length > 0) {
    for (const id of gatewayResult.data.priorWorkIds) {
      const match = matchedDbMap.get(id);
      if (match && !finalPriorWork.some((p) => p.id === match.id)) {
        finalPriorWork.push(match);
      }
    }
  }

  // If no DB citations matched from AI list, default to matchedPriorWork from database
  if (finalPriorWork.length === 0) {
    finalPriorWork = matchedPriorWork;
  }

  const evaluationCandidate: Evaluation = {
    id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ideaId: idea.id,
    overallScore,
    overallBadge,
    axes: finalAxes,
    safetyFlags,
    priorWork: finalPriorWork,
    evaluatedAt: new Date().toISOString(),
  };

  const evaluation = EvaluationSchema.parse(evaluationCandidate);

  return NextResponse.json({
    source: gatewayResult.source,
    evaluation,
  });
}
