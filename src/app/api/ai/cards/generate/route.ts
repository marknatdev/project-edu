import { NextResponse } from 'next/server';
import { z } from 'zod';
import { quotaStore, getQuotaExceededMessage } from '@/lib/ai/quota';
import { callAiGateway } from '@/lib/ai/gateway';
import { SUBFIELDS } from '@/data/subfields';
import { TopicCardSchema } from '@/lib/schemas';
import type { TopicCard, GradeLevel, DifficultyLevel } from '@/types/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CardsGenerateSchema = z
  .object({
    anonymousId: z.string().min(1),
    subfieldId: z.string().min(1),
    gradeLevel: z.enum(['m_ton', 'm_plai']),
    count: z.number().int().min(1).max(5).default(3),
    existingCardIds: z.array(z.string()).optional(),
  })
  .strict();

const GeneratedCardJsonSchema = z.object({
  cards: z.array(
    z.object({
      title: z.string().min(1),
      phenomenon: z.string().min(1),
      curiosityHook: z.string().min(1),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      estimatedWeeks: z.number().int().min(1).max(20),
      estimatedBudgetBaht: z.number().min(0).max(10000),
      requiredEquipment: z.array(z.string()).min(1),
      minTeamSize: z.number().int().min(1),
      maxTeamSize: z.number().int().min(1),
      requiredSkills: z.array(z.string()).min(1),
    })
  ),
});

function createDeterministicFallbackCards(
  subfieldId: string,
  gradeLevel: GradeLevel,
  count: number
): TopicCard[] {
  const subfield = SUBFIELDS.find((s) => s.id === subfieldId) ?? SUBFIELDS[0];
  const targetGradeLevels: GradeLevel[] =
    gradeLevel === 'm_ton' ? ['m_ton'] : ['m_plai'];
  const difficulty: DifficultyLevel =
    gradeLevel === 'm_ton' ? 'beginner' : 'intermediate';

  const cards: TopicCard[] = [];
  for (let i = 1; i <= count; i++) {
    const card: TopicCard = {
      id: `${subfield.id}_gen_${i}`,
      subjectId: subfield.subjectId,
      subfieldId: subfield.id,
      title: `แนวทางศึกษาปรากฏการณ์${subfield.nameTh} แนวคิดที่ ${i}`,
      phenomenon: `การสังเกตการเปลี่ยนแปลงและผลกระทบของ${subfield.nameTh}ในชีวิตประจำวันรูปแบบที่ ${i}`,
      curiosityHook: `ทำไมปรากฏการณ์นี้จึงเกิดขึ้น และเราจะออกแบบวิธีการเพื่อศึกษาหรือแก้ไขได้อย่างไร?`,
      targetGradeLevels,
      difficulty,
      estimatedWeeks: gradeLevel === 'm_ton' ? 4 : 6,
      estimatedBudgetBaht: gradeLevel === 'm_ton' ? 500 : 1000,
      requiredEquipment: ['อุปกรณ์บันทึกข้อมูล', 'เครื่องมือวัดพื้นฐาน'],
      minTeamSize: 1,
      maxTeamSize: 3,
      requiredSkills: ['การสังเกต', 'การบันทึกผล'],
    };

    cards.push(TopicCardSchema.parse(card));
  }

  return cards;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CardsGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid input or disallowed fields detected (Zero-PII violated)',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { anonymousId, subfieldId, gradeLevel, count } = parsed.data;

  // Enforce quota
  const quotaResult = await quotaStore.consume(anonymousId, 'cards', count);
  if (!quotaResult.allowed) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        messageTh: getQuotaExceededMessage('cards'),
        remaining: quotaResult.record.remaining,
        resetAt: quotaResult.record.resetAt,
      },
      { status: 429 }
    );
  }

  const subfield = SUBFIELDS.find((s) => s.id === subfieldId) ?? SUBFIELDS[0];
  const fallbackCards = createDeterministicFallbackCards(subfieldId, gradeLevel, count);

  const systemPrompt = `คุณคือผู้เชี่ยวชาญการออกแบบการ์ดหัวข้อโครงงานวิทยาศาสตร์และนวัตกรรม (Topic Card) สำหรับนักเรียนระดับ ${gradeLevel === 'm_ton' ? 'มัธยมต้น' : 'มัธยมปลาย'}
สร้างการ์ดที่เป็น "ประเด็นตั้งต้นหรือปรากฏการณ์ชวนสังเกต" ไม่ใช่โครงงานสำเร็จรูป`;

  const userPrompt = `ต้องการสร้างการ์ดหัวข้อโครงงานใหม่จำนวน ${count} ใบ
สาขาย่อย: ${subfield.nameTh} (${subfield.nameEn})
คำอธิบายสาขา: ${subfield.description}
ระดับชั้น: ${gradeLevel}
สร้างรายการ cards ในรูปแบบ JSON ให้ครบตาม Schema`;

  const gatewayResult = await callAiGateway({
    schema: GeneratedCardJsonSchema,
    prompt: userPrompt,
    systemPrompt,
    fallback: () => ({
      cards: fallbackCards.map((c) => ({
        title: c.title,
        phenomenon: c.phenomenon,
        curiosityHook: c.curiosityHook,
        difficulty: c.difficulty,
        estimatedWeeks: c.estimatedWeeks,
        estimatedBudgetBaht: c.estimatedBudgetBaht,
        requiredEquipment: c.requiredEquipment,
        minTeamSize: c.minTeamSize,
        maxTeamSize: c.maxTeamSize,
        requiredSkills: c.requiredSkills,
      })),
    }),
  });

  // Convert and strictly validate with TopicCardSchema
  const validatedCards: TopicCard[] = [];
  gatewayResult.data.cards.forEach((item, index) => {
    const candidate: TopicCard = {
      id: `${subfield.id}_ai_${Date.now()}_${index + 1}`,
      subjectId: subfield.subjectId,
      subfieldId: subfield.id,
      title: item.title,
      phenomenon: item.phenomenon,
      curiosityHook: item.curiosityHook,
      targetGradeLevels: [gradeLevel],
      difficulty: item.difficulty,
      estimatedWeeks: item.estimatedWeeks,
      estimatedBudgetBaht: item.estimatedBudgetBaht,
      requiredEquipment: item.requiredEquipment,
      minTeamSize: item.minTeamSize,
      maxTeamSize: item.maxTeamSize,
      requiredSkills: item.requiredSkills,
    };

    const validated = TopicCardSchema.safeParse(candidate);
    if (validated.success) {
      validatedCards.push(validated.data);
    } else {
      validatedCards.push(fallbackCards[index] ?? fallbackCards[0]);
    }
  });

  return NextResponse.json({
    source: gatewayResult.source,
    cards: validatedCards.slice(0, count),
  });
}
