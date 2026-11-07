/**
 * Socratic Coach State Machine for Project Edu
 * Implements ADR 0002 (Socratic Advisor First AI Pedagogy).
 *
 * Rules:
 * 1. 3-tier progressive scaffolding:
 *    - Tier 1: Socratic Questioning (default, guides student to think, never writes idea)
 *    - Tier 2: Thinking Lenses (provides hints/lenses when stuck)
 *    - Tier 3: Last Resort Examples (unlocked ONLY after Tier 1 and Tier 2 were shown in history)
 * 2. Idea Track:
 *    - Tracks 4 core aspects: problem, objective, methodology, measurement.
 *    - Targets next unfilled aspect sequentially.
 *    - Strict cap of <= 8 questions.
 * 3. Deterministic offline fallback with Thai prompts.
 */

import { z } from 'zod';
import { callAiGateway } from './gateway';
import { matchPriorWork, resolveMode, stripLinks } from './coach-modes';

export * from '@/lib/advisor/coach-contract';
import { COACH_ASPECTS, FALLBACK_PROMPTS, type CoachAspect, type CoachingTier, type CoachSessionState, type CoachTurnRequest, type CoachTurnResult, type CoachTurnHistory } from '@/lib/advisor/coach-contract';

const COMPLETION_SUMMARY_THAI =
  'ยอดเยี่ยมมากครับ! คุณได้ร่วมคิดและระบุครบถ้วนทั้งปัญหา วัตถุประสงค์ วิธีการ และการวัดผลแล้ว พร้อมนำไปประเมินโครงงาน (Evaluate) หรือจัดทำร่างข้อเสนอโครงงาน (Proposal) ต่อได้ทันทีครับ';

const AiCoachResponseSchema = z.object({
  content: z.string().min(1).max(8000),
  lenses: z.array(z.string().min(1).max(2000)).max(4).optional(),
  examples: z.array(z.string().min(1).max(2000)).max(3).optional(),
});

/**
 * Executes a single turn of the Socratic Coach according to ADR 0002.
 */
export async function nextCoachTurn(
  state: CoachSessionState,
  request: CoachTurnRequest
): Promise<CoachTurnResult> {
  // 1. Process previous turn response if supplied
  if (request.learnerResponse && request.learnerResponse.trim().length > 0) {
    if (state.history.length > 0) {
      const lastTurn = state.history[state.history.length - 1];
      lastTurn.learnerResponse = request.learnerResponse.trim();
      if (lastTurn.aspect) {
        state.aspectProgress[lastTurn.aspect] = true;
      }
    }
  }

  if (request.mode) return modeTurn(state, request);

  // 2. Check completion: if all 4 aspects are complete OR cap of 8 reached
  const allAspectsCovered =
    state.aspectProgress.problem &&
    state.aspectProgress.objective &&
    state.aspectProgress.methodology &&
    state.aspectProgress.measurement;

  if ((request.requestedTier ?? 1) === 1 && (allAspectsCovered || state.turnCount >= 8)) {
    state.isComplete = true;
    return {
      source: 'fallback',
      tier: 1,
      aspect: 'completed',
      content: COMPLETION_SUMMARY_THAI,
      state,
    };
  }

  // Only ordered server-issued history is evidence. unlockedTiers is display data.
  const answeredTier1 = state.history.findIndex((h) => h.tier === 1 && Boolean(h.learnerResponse?.trim()));
  const hasAnswer = answeredTier1 >= 0;
  const hasHintAfterAnswer = hasAnswer && state.history.some((h, index) =>
    index > answeredTier1 && h.tier === 2 && Boolean(h.lenses?.length));
  const desiredTier: CoachingTier = request.requestedTier ?? 1;
  const effectiveTier: CoachingTier = desiredTier === 3 && hasHintAfterAnswer
    ? 3 : desiredTier >= 2 && hasAnswer ? 2 : 1;
  const tierDowngraded = desiredTier !== effectiveTier;

  // Record newly unlocked tier
  if (!state.unlockedTiers.includes(effectiveTier)) {
    state.unlockedTiers.push(effectiveTier);
  }

  // 4. Select target aspect
  let targetAspect: CoachAspect;
  if (request.targetAspect && !state.aspectProgress[request.targetAspect]) {
    targetAspect = request.targetAspect;
  } else {
    const nextUnfilled = COACH_ASPECTS.find((asp) => !state.aspectProgress[asp]);
    targetAspect = nextUnfilled ?? 'problem';
  }

  // 5. Increment turnCount
  if (effectiveTier === 1) state.turnCount += 1;
  if (state.turnCount >= 8) {
    state.isComplete = true;
  }

  // 6. Generate content (Gateway with deterministic fallback)
  const prompts = FALLBACK_PROMPTS[targetAspect];
  let defaultContent = '';
  let defaultLenses: string[] | undefined;
  let defaultExamples: string[] | undefined;

  if (effectiveTier === 1) {
    defaultContent = request.ideaContext?.title && state.history.length === 0
      ? `หัวข้อ: ${request.ideaContext.title}\n${request.ideaContext.description ?? ''}\n${prompts.tier1}`
      : prompts.tier1;
  } else if (effectiveTier === 2) {
    defaultContent = prompts.tier2.content;
    defaultLenses = prompts.tier2.lenses;
  } else {
    defaultContent = prompts.tier3.content;
    defaultExamples = prompts.tier3.examples;
  }

  const systemPrompt = `คุณคือครูที่ปรึกษาโครงงานวิทยาศาสตร์และนวัตกรรม (Socratic Coach)
ปฏิบัติตามหลักการ ADR 0002 อย่างเคร่งครัด:
- Tier 1: ตั้งคำถามชวนคิดเพื่อให้นักเรียนตอบ ไม่บอกไอเดียสำเร็จรูป ห้ามเขียนแทน
- Tier 2: ให้กรอบการคิดหรือคำใบ้ 2 ข้อ (lenses) เพื่อให้นักเรียนนำไปคิดต่อ
- Tier 3: เสนอตัวอย่างแนวทางสั้นๆ 2 ข้อ (examples) สำหรับกรณีนักเรียนติดตันจริง
ตอบเป็นภาษาไทยที่เป็นมิตร ให้กำลังใจ และกระชับ`;

  const userPrompt = `นักเรียนกำลังพัฒนาโครงงาน
หัวข้อ: ${request.ideaContext?.title ?? 'โครงงานของนักเรียน'}
คำอธิบาย: ${request.ideaContext?.description ?? 'ยังไม่มีรายละเอียด'}
ระดับชั้น: ${request.ideaContext?.gradeLevel ?? 'ไม่ระบุ'}
เป้าหมาย: ${request.ideaContext?.goal ?? 'curiosity'}
ข้อจำกัดที่ทราบแล้ว (ไม่ถามซ้ำ): ${JSON.stringify(request.ideaContext?.constraints ?? {})}
ระดับความช่วยเหลือปัจจุบัน: Tier ${effectiveTier}
ประเด็นที่กำลังคุย: ${targetAspect}
คำตอบล่าสุดของนักเรียน: ${request.learnerResponse ?? 'เพิ่งเริ่มคุย'}
สร้างคำถามชวนคิด กรอบคิด หรือตัวอย่างในรูปแบบ JSON ตาม Schema`;

  const gatewayResult = await callAiGateway({
    schema: AiCoachResponseSchema,
    prompt: userPrompt,
    systemPrompt,
    fallback: () => ({
      content: defaultContent,
      lenses: defaultLenses,
      examples: defaultExamples,
    }),
  });

  const finalContent = gatewayResult.data.content || defaultContent;
  const finalLenses =
    effectiveTier === 2
      ? gatewayResult.data.lenses?.length ? gatewayResult.data.lenses : defaultLenses
      : undefined;
  const finalExamples =
    effectiveTier === 3
      ? gatewayResult.data.examples?.length ? gatewayResult.data.examples : defaultExamples
      : undefined;

  // 7. Append turn to history
  const turnHistory: CoachTurnHistory = {
    turnIndex: state.history.length + 1,
    tier: effectiveTier,
    aspect: targetAspect,
    content: finalContent,
    lenses: finalLenses,
    examples: finalExamples,
    timestamp: new Date().toISOString(),
    source: gatewayResult.source,
  };

  state.history.push(turnHistory);

  return {
    source: gatewayResult.source,
    tier: effectiveTier,
    tierDowngraded,
    aspect: targetAspect,
    content: finalContent,
    lenses: finalLenses,
    examples: finalExamples,
    state,
  };
}

const RESEARCH_FALLBACK = {
  content: 'ลองตั้งคำค้นจากสิ่งที่คุณจะเปลี่ยนและสิ่งที่คุณจะวัด แล้วอ่านว่างานที่ใกล้เคียงทำอะไรไปแล้ว เรื่องของคุณต่างตรงไหน',
  lenses: [
    'คำค้น: นำชื่อตัวแปรต้นกับตัวแปรตามมาต่อกัน เช่น “แสงไฟ LED การเจริญเติบโตของพืช”',
    'แหล่งค้น: ThaiJO, คลังโครงงาน NSC/YSC และเว็บไซต์ของ สวทช. แล้วจดชื่อเรื่องกับปีที่ทำ',
  ],
};
const NO_PRIOR_WORK = 'ยังไม่มีงานในคลังที่ทีมคัดไว้ซึ่งใกล้เคียงเรื่องนี้ ลองค้นเองตามคำค้นด้านล่าง แล้วจดชื่อเรื่องกับแหล่งที่มาไว้';

/**
 * ADR 0004 mode turn: the learner picks ask / research / ideate (or auto) at any
 * time; no tier unlock is checked. Research cites curated PRIOR_WORK ids only,
 * ideate returns starting points that still go through the own-words rewrite.
 */
async function modeTurn(state: CoachSessionState, request: CoachTurnRequest): Promise<CoachTurnResult> {
  const mode = resolveMode(request.mode, request.learnerResponse);
  const all = COACH_ASPECTS.every(a => state.aspectProgress[a]);
  if (mode === 'ask' && (all || state.turnCount >= 8)) {
    state.isComplete = true;
    return { source: 'fallback', tier: 1, mode, aspect: 'completed', content: COMPLETION_SUMMARY_THAI, state };
  }
  const aspect: CoachAspect = request.targetAspect && !state.aspectProgress[request.targetAspect]
    ? request.targetAspect : COACH_ASPECTS.find(a => !state.aspectProgress[a]) ?? 'problem';
  const tier: CoachingTier = mode === 'ask' ? 1 : mode === 'research' ? 2 : 3;
  if (!state.unlockedTiers.includes(tier)) state.unlockedTiers.push(tier);
  if (mode === 'ask') state.turnCount += 1;
  if (state.turnCount >= 8) state.isComplete = true;

  const prompts = FALLBACK_PROMPTS[aspect];
  const ctx = request.ideaContext;
  const priorWorkIds = mode === 'research'
    ? matchPriorWork({ text: [ctx?.title, ctx?.description, request.learnerResponse].filter(Boolean).join(' '), subfieldId: ctx?.subfieldId })
    : undefined;
  const fallback = mode === 'ask'
    ? { content: ctx?.title && state.history.length === 0 ? `หัวข้อ: ${ctx.title}\n${prompts.tier1}` : prompts.tier1 }
    : mode === 'research'
      ? { content: priorWorkIds?.length ? RESEARCH_FALLBACK.content : NO_PRIOR_WORK, lenses: RESEARCH_FALLBACK.lenses }
      : { content: 'จุดตั้งต้นให้คุณคิดต่อ (เลือกหนึ่งแนวแล้วเขียนใหม่ด้วยภาษาของคุณ):', examples: prompts.tier3.examples };

  const systemPrompt = `คุณคือครูที่ปรึกษาโครงงานวิทยาศาสตร์ คอมพิวเตอร์ และคณิตศาสตร์ ของนักเรียนมัธยม (ADR 0004)
โหมดปัจจุบัน: ${mode === 'ask' ? 'ถาม — ตอบด้วยคำถามชวนคิดหนึ่งคำถาม ไม่เขียนโครงงานแทน' : mode === 'research'
    ? 'ค้นคว้า — สอนว่าจะค้นอะไร ที่ไหน อ่านอย่างไร ให้คำค้น 2 ข้อใน lenses ห้ามใส่ลิงก์ ชื่อเว็บไซต์เฉพาะเจาะจงของงานวิจัย หรือชื่องานวิจัยที่แต่งขึ้น'
    : 'คิดไอเดีย — ชวนระดมความคิด และเสนอทิศทางสั้น ๆ 2 ข้อใน examples เป็นจุดตั้งต้น ไม่ใช่โครงงานสำเร็จรูป'}
ตอบเป็นภาษาไทยที่เป็นมิตร กระชับ เหมาะกับนักเรียนมัธยม`;
  const userPrompt = `หัวข้อ: ${ctx?.title ?? 'โครงงานของนักเรียน'}
คำอธิบาย: ${ctx?.description ?? 'ยังไม่มีรายละเอียด'}
ระดับชั้น: ${ctx?.gradeLevel ?? 'ไม่ระบุ'} · เป้าหมาย: ${ctx?.goal ?? 'curiosity'}
ข้อจำกัดที่ทราบแล้ว (ไม่ถามซ้ำ): ${JSON.stringify(ctx?.constraints ?? {})}
ประเด็นที่ยังขาด: ${aspect}
ข้อความล่าสุดของนักเรียน: ${request.learnerResponse ?? 'เพิ่งเริ่มคุย'}
ตอบในรูปแบบ JSON ตาม Schema`;
  const result = await callAiGateway({ schema: AiCoachResponseSchema, prompt: userPrompt, systemPrompt, fallback: () => fallback });
  const content = stripLinks(result.data.content || fallback.content) || fallback.content;
  const lenses = mode === 'research' ? (result.data.lenses?.length ? result.data.lenses.map(stripLinks).filter(Boolean) : fallback.lenses) : undefined;
  const examples = mode === 'ideate' ? (result.data.examples?.length ? result.data.examples.map(stripLinks).filter(Boolean) : fallback.examples) : undefined;
  state.history.push({ turnIndex: state.history.length + 1, tier, mode, aspect, content, lenses, examples,
    ...(priorWorkIds ? { priorWorkIds } : {}), timestamp: new Date().toISOString(), source: result.source });
  return { source: result.source, tier, mode, aspect, content, lenses, examples, ...(priorWorkIds ? { priorWorkIds } : {}), state };
}
