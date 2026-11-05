import { NextResponse } from 'next/server';
import { z } from 'zod';
import { quotaStore, getQuotaExceededMessage } from '@/lib/ai/quota';
import { callAiGateway } from '@/lib/ai/gateway';
import { IdeaSchema, ConstraintsSchema, PivotCoachingSchema } from '@/lib/schemas';
import type { CoachingTier, PivotCoaching } from '@/types/domain';
import { AXIS_PIVOT_GUIDES } from '@/lib/pivot/guides';

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
