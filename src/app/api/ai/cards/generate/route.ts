import { NextResponse } from 'next/server';
import { readBody } from '@/lib/persistence/owner-route.server';
import { legacyProductionGate } from '@/lib/persistence/legacy-route.server';
import { z } from 'zod';
import { quotaStore, getQuotaExceededMessage } from '@/lib/ai/quota';
import { callAiStrict } from '@/lib/ai/gateway';
import { SUBFIELDS } from '@/data/subfields';
import { TopicCardSchema } from '@/lib/schemas';
import type { TopicCard } from '@/types/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * LEGACY seed-deck "more cards" endpoint (local development only; production
 * returns 503 via legacyProductionGate). Superseded by POST /api/discovery/cards.
 * It no longer fabricates template cards: when AI is unavailable it says so,
 * and it charges only cards actually returned by the model.
 */
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

const UNAVAILABLE_TH = 'ตอนนี้สร้างการ์ดใหม่ด้วย AI ไม่ได้ และไม่ได้ใช้โควตา การ์ดเดิมของคุณยังอยู่ ลองใหม่ภายหลัง';

export async function POST(req: Request) {
  const gate = legacyProductionGate(); if (gate) return gate;
  const read = await readBody(req);
  if ('response' in read) return read.response;
  const body = read.body;

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

  // Check (do not consume) before generation; charge accepted cards afterwards.
  const quotaBefore = await quotaStore.check(anonymousId, 'cards');
  if (quotaBefore.remaining < count) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        messageTh: getQuotaExceededMessage('cards'),
        remaining: quotaBefore.remaining,
        resetAt: quotaBefore.resetAt,
      },
      { status: 429 }
    );
  }

  const subfield = SUBFIELDS.find((s) => s.id === subfieldId) ?? SUBFIELDS[0];

  const systemPrompt = `คุณคือผู้เชี่ยวชาญการออกแบบการ์ดหัวข้อโครงงานวิทยาศาสตร์และนวัตกรรม (Topic Card) สำหรับนักเรียนระดับ ${gradeLevel === 'm_ton' ? 'มัธยมต้น' : 'มัธยมปลาย'}
สร้างการ์ดที่เป็น "ประเด็นตั้งต้นหรือปรากฏการณ์ชวนสังเกต" ไม่ใช่โครงงานสำเร็จรูป ห้ามใส่แหล่งอ้างอิงหรืออ้างว่าเป็นไอเดียใหม่ที่ยืนยันแล้ว`;

  const userPrompt = `ต้องการสร้างการ์ดหัวข้อโครงงานใหม่จำนวน ${count} ใบ
สาขาย่อย: ${subfield.nameTh} (${subfield.nameEn})
คำอธิบายสาขา: ${subfield.description}
ระดับชั้น: ${gradeLevel}
สร้างรายการ cards ในรูปแบบ JSON ให้ครบตาม Schema`;

  const result = await callAiStrict({ schema: GeneratedCardJsonSchema, prompt: userPrompt, systemPrompt, maxTokens: 2000 });
  if (!result.ok) {
    return NextResponse.json({ error: 'AI_UNAVAILABLE', cards: [], messageTh: UNAVAILABLE_TH }, { status: 503 });
  }

  // Strictly validate; malformed items are dropped, never replaced by templates.
  const validatedCards: TopicCard[] = [];
  result.data.cards.slice(0, count).forEach((item, index) => {
    const validated = TopicCardSchema.safeParse({
      id: `${subfield.id}_ai_${Date.now()}_${index + 1}`,
      subjectId: subfield.subjectId,
      subfieldId: subfield.id,
      targetGradeLevels: [gradeLevel],
      ...item,
    });
    if (validated.success) validatedCards.push(validated.data);
  });
  if (!validatedCards.length) {
    return NextResponse.json({ error: 'AI_OUTPUT_UNUSABLE', cards: [], messageTh: UNAVAILABLE_TH }, { status: 503 });
  }

  const charged = await quotaStore.consume(anonymousId, 'cards', validatedCards.length);
  return NextResponse.json({
    source: 'ai',
    cards: validatedCards,
    remaining: charged.record.remaining,
  });
}
