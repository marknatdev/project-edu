import { NextResponse } from 'next/server';
import { z } from 'zod';
import { quotaStore, getQuotaExceededMessage } from '@/lib/ai/quota';
import { callAiGateway } from '@/lib/ai/gateway';
import { IdeaSchema, ConstraintsSchema, PivotCoachingSchema } from '@/lib/schemas';
import type { CoachingTier, PivotCoaching, EvaluationAxis } from '@/types/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PivotRequestSchema = z
  .object({
    anonymousId: z.string().min(1),
    idea: IdeaSchema,
    redAxes: z
      .array(z.enum(['novelty', 'feasibility', 'impact', 'rigor', 'fit']))
      .min(1),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
    constraints: ConstraintsSchema.optional(),
    unlockedTiers: z
      .array(z.union([z.literal(1), z.literal(2), z.literal(3)]))
      .optional(),
  })
  .strict();

interface AxisPivotGuide {
  tier1: string;
  tier2Lenses: string[];
  tier3Examples: string[];
}

const AXIS_PIVOT_GUIDES: Record<EvaluationAxis, AxisPivotGuide> = {
  feasibility: {
    tier1:
      'เมื่อพิจารณาด้านความเป็นไปได้ (Feasibility) มีอุปกรณ์หรือขั้นตอนใดที่อาจซับซ้อนหรืองบประมาณสูงเกินไป และพอจะปรับใช้วัสดุหรือเครื่องมือที่เข้าถึงได้ง่ายในโรงเรียนแทนได้บ้างครับ?',
    tier2Lenses: [
      'ลดขนาดสเกลการทดลองลงมาเป็นแบบจำลองขนาดเล็ก (Scale-down Prototype)',
      'ใช้วัสดุเหลือใช้หรือทรัพยากรธรรมชาติที่มีในท้องถิ่นแทนอุปกรณ์สั่งซื้อ',
    ],
    tier3Examples: [
      'ปรับจากการสร้างเครื่องจักรกลขนาดใหญ่ เป็นการจำลองระบบควบคุมด้วยไมโครคอนโทรลเลอร์ขนาดย่อม',
      'ปรับจากการทดสอบในพื้นที่จริง เป็นการทดสอบสารสกัดในหลอดทดลองของห้องแล็บโรงเรียน',
    ],
  },
  novelty: {
    tier1:
      'ในด้านความแปลกใหม่ (Novelty) ลองคิดดูว่าอะไรคือจุดเด่นเฉพาะตัว หรือมุมมองใหม่ในการแก้ปัญหานี้ที่ต่างจากงานวิจัยที่มีอยู่แล้วครับ?',
    tier2Lenses: [
      'ผสานข้ามสาขาวิชา เช่น นำชีววิทยามาผสานกับระบบเซนเซอร์ IoT หรือโมเดลคณิตศาสตร์',
      'เน้นแก้ปัญหาเฉพาะเจาะจงของบริบทท้องถิ่นที่ยังไม่เคยมีใครศึกษามาก่อน',
    ],
    tier3Examples: [
      'นำสารสกัดจากพืชพื้นถิ่นที่ไม่เคยมีการบันทึกฤทธิ์ทางชีวภาพมาทดสอบคุณสมบัติ',
      'ออกแบบโครงสร้างรังผึ้งจากวัสดุคอมโพสิตชีวภาพเพื่อเพิ่มความทนทานต่อแรงกระแทก',
    ],
  },
  impact: {
    tier1:
      'ในด้านผลกระทบ (Impact) ใครคือกลุ่มคนที่เดือดร้อนที่สุดจากปัญหานี้ และถ้าโครงงานนี้สำเร็จจะช่วยแก้ปัญหาให้พวกเขาได้อย่างไรบ้างครับ?',
    tier2Lenses: [
      'มุ่งเน้นความคุ้มค่าทางเศรษฐกิจและการลดค่าใช้จ่ายให้ชุมชน',
      'มุ่งเน้นการลดมลพิษและการฟื้นฟูสิ่งแวดล้อมอย่างยั่งยืน',
    ],
    tier3Examples: [
      'เน้นการช่วยเหลือเกษตรกรรายย่อยในการลดการสูญเสียผลผลิตหลังการเก็บเกี่ยว',
      'คำนวณและวัดปริมาณขยะพลาสติกหรือคาร์บอนที่ลดลงได้อย่างเป็นรูปธรรม',
    ],
  },
  rigor: {
    tier1:
      'ในด้านความรัดกุมทางวิชาการ (Rigor) มีการออกแบบการทดลอง ตัวแปรควบคุม และการเก็บข้อมูลอย่างไรเพื่อให้ผลการทดลองน่าเชื่อถือครับ?',
    tier2Lenses: [
      'กำหนดตัวแปรต้น ตัวแปรตาม และตัวแปรควบคุมให้ชัดเจนและวัดค่าได้จริง',
      'วางแผนทำการทดลองซ้ำอย่างน้อย 3-5 ซ้ำ (Replications) เพื่อคำนวณค่าเฉลี่ยและความคลาดเคลื่อน',
    ],
    tier3Examples: [
      'เพิ่มชุดการทดลองควบคุม (Control Group) ที่ใช้สารมาตรฐานเปรียบเทียบ',
      'ใช้สถิติพื้นฐาน เช่น t-test หรือค่าความแปรปรวน (ANOVA) ในการวิเคราะห์นัยสำคัญ',
    ],
  },
  fit: {
    tier1:
      'ในด้านความสอดคล้อง (Fit) จะปรับแผนงานและขั้นตอนการทำงานอย่างไรให้สอดคล้องกับกรอบเวลาและเกณฑ์การประเมินมากที่สุดครับ?',
    tier2Lenses: [
      'แบ่งงานเป็นขั้นตอนรายสัปดาห์ (Milestones) เพื่อติดตามความคืบหน้า',
      'มุ่งเน้นการส่งมอบผลงานชิ้นหลักก่อน แล้วจึงพัฒนาส่วนต่อขยายหากมีเวลาเหลือ',
    ],
    tier3Examples: [
      'จัดลำดับความสำคัญโดยตัดฟังก์ชันที่ไม่จำเป็นต่อการแข่งขันออกก่อน',
      'เน้นการบันทึกสมุดบันทึกการทดลอง (Logbook) อย่างละเอียดทุกสัปดาห์',
    ],
  },
};

const AiPivotResponseSchema = z.object({
  tier1Prompt: z.string().min(1),
  tier2Lenses: z.array(z.string()).optional(),
  tier3Examples: z.array(z.string()).optional(),
  selectedAngle: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PivotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid input or disallowed fields detected (Zero-PII violated)',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { anonymousId, idea, redAxes, tier: requestedTier, unlockedTiers } =
    parsed.data;

  // Enforce proposal quota (2 per day)
  const quotaResult = await quotaStore.consume(anonymousId, 'proposal', 1);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        messageTh: getQuotaExceededMessage('proposal'),
        remaining: quotaResult.record.remaining,
        resetAt: quotaResult.record.resetAt,
      },
      { status: 429 }
    );
  }

  // Tier 3 lock enforcement: Tier 3 can only be used if Tier 1 and 2 were unlocked
  const hasTier1 = unlockedTiers?.includes(1) ?? true;
  const hasTier2 = unlockedTiers?.includes(2) ?? false;

  let effectiveTier: CoachingTier = requestedTier;
  if (requestedTier === 3 && (!hasTier1 || !hasTier2)) {
    effectiveTier = hasTier1 ? 2 : 1;
  }

  // Primary red axis to focus coaching on
  const primaryRedAxis = redAxes[0] ?? 'feasibility';
  const guide = AXIS_PIVOT_GUIDES[primaryRedAxis];

  const defaultPrompt = guide.tier1;
  const defaultLenses = effectiveTier >= 2 ? guide.tier2Lenses : undefined;
  const defaultExamples = effectiveTier === 3 ? guide.tier3Examples : undefined;

  const systemPrompt = `คุณคือครูที่ปรึกษาโครงงาน (Socratic Pivot Coach)
ช่วยเหลือผู้เรียนเมื่อผลการประเมินมีจุดอ่อนในด้าน ${redAxes.join(', ')}
ปฏิบัติตาม ADR 0002:
- Tier 1: ถามคำถามชวนคิดเพื่อให้นักเรียนแก้จุดอ่อนด้วยตนเอง
- Tier 2: ให้กรอบความคิด/คำใบ้ (Lenses)
- Tier 3: เสนอตัวอย่างทางเลือก (Examples) สั้นๆ เมื่อนักเรียนติดตันจริง`;

  const userPrompt = `นักเรียนกำลังต้องการปรับปรุงโครงงาน
หัวข้อ: ${idea.title}
คำอธิบาย: ${idea.description}
ด้านที่ต้องปรับปรุง (Red Axes): ${redAxes.join(', ')}
ระดับความช่วยเหลือ: Tier ${effectiveTier}
สร้างผลการโค้ชชิ่งในรูปแบบ JSON`;

  const gatewayResult = await callAiGateway({
    schema: AiPivotResponseSchema,
    prompt: userPrompt,
    systemPrompt,
    fallback: () => ({
      tier1Prompt: defaultPrompt,
      tier2Lenses: defaultLenses,
      tier3Examples: defaultExamples,
      selectedAngle: `แนวทางปรับปรุงด้าน ${primaryRedAxis}`,
    }),
  });

  const coachingCandidate: PivotCoaching = {
    tier: effectiveTier,
    tier1Prompt: gatewayResult.data.tier1Prompt || defaultPrompt,
    tier2Lenses:
      effectiveTier >= 2
        ? gatewayResult.data.tier2Lenses ?? defaultLenses
        : undefined,
    tier3Examples:
      effectiveTier === 3
        ? gatewayResult.data.tier3Examples ?? defaultExamples
        : undefined,
    selectedAngle: gatewayResult.data.selectedAngle,
  };

  const coaching = PivotCoachingSchema.parse(coachingCandidate);

  return NextResponse.json({
    source: gatewayResult.source,
    coaching,
  });
}
