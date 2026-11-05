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

export type CoachAspect = 'problem' | 'objective' | 'methodology' | 'measurement';

export const COACH_ASPECTS: readonly CoachAspect[] = [
  'problem',
  'objective',
  'methodology',
  'measurement',
] as const;

export interface CoachAspectProgress {
  problem: boolean;
  objective: boolean;
  methodology: boolean;
  measurement: boolean;
}

export type CoachingTier = 1 | 2 | 3;

export interface CoachTurnHistory {
  turnIndex: number;
  tier: CoachingTier;
  aspect?: CoachAspect;
  content: string;
  lenses?: string[];
  examples?: string[];
  learnerResponse?: string;
  timestamp: string;
}

export interface CoachSessionState {
  anonymousId: string;
  ideaId?: string;
  turnCount: number; // 0..8
  unlockedTiers: CoachingTier[]; // starts with [1]
  aspectProgress: CoachAspectProgress;
  history: CoachTurnHistory[];
  isComplete: boolean;
}

export interface CoachTurnRequest {
  requestedTier?: CoachingTier; // default 1
  learnerResponse?: string; // response to the previous turn
  targetAspect?: CoachAspect; // optional explicit target
  ideaContext?: {
    title?: string;
    description?: string;
    subfieldId?: string;
    gradeLevel?: 'm_ton' | 'm_plai';
  };
}

export interface CoachTurnResult {
  source: 'ai' | 'fallback';
  tier: CoachingTier;
  tierDowngraded?: boolean;
  aspect: CoachAspect | 'completed';
  content: string;
  lenses?: string[];
  examples?: string[];
  state: CoachSessionState;
}

export function createInitialCoachState(
  anonymousId: string,
  ideaId?: string
): CoachSessionState {
  return {
    anonymousId,
    ideaId,
    turnCount: 0,
    unlockedTiers: [1],
    aspectProgress: {
      problem: false,
      objective: false,
      methodology: false,
      measurement: false,
    },
    history: [],
    isComplete: false,
  };
}

// Fallback bank for deterministic responses
interface AspectPrompts {
  tier1: string;
  tier2: { content: string; lenses: string[] };
  tier3: { content: string; examples: string[] };
}

const FALLBACK_PROMPTS: Record<CoachAspect, AspectPrompts> = {
  problem: {
    tier1:
      'ลองสังเกตปัญหาในชีวิตประจำวัน โรงเรียน หรือชุมชนรอบตัว มีปัญหาหรือจุดติดขัดอะไรที่พบบ่อยและอยากแก้ไขมากที่สุดครับ?',
    tier2: {
      content: 'กรอบชวนคิด: ลองวิเคราะห์ปัญหาจากมุมมองเหล่านี้ดูครับ',
      lenses: [
        'มุมมองผู้ใช้งาน: ใครคือกลุ่มคนที่เดือดร้อนหรือได้รับผลกระทบจากปัญหานี้มากที่สุด?',
        'มุมมองความถี่และผลกระทบ: ปัญหานี้เกิดขึ้นบ่อยแค่ไหน และถ้าไม่แก้จะเกิดความเสียหายอย่างไร?',
      ],
    },
    tier3: {
      content:
        'ตัวอย่างแนวทางการระบุปัญหา (โปรดเลือกและนำไปปรับใช้ด้วยภาษาของตัวเอง):',
      examples: [
        'ตัวอย่างที่ 1: ปัญหาขยะอินทรีย์หรือเศษอาหารในโรงอาหารที่ส่งกลิ่นและกำจัดยากในแต่ละวัน',
        'ตัวอย่างที่ 2: ปัญหาน้ำท่วมขังหรือระบายน้ำช้าในแปลงเกษตรของชุมชนหลังฝนตกหนัก',
      ],
    },
  },
  objective: {
    tier1:
      'ถ้าทำโครงงานนี้สำเร็จ เป้าหมายที่ชัดเจนที่สุดคือต้องการให้เกิดการเปลี่ยนแปลงอะไร หรือพิสูจน์สิ่งใดครับ?',
    tier2: {
      content: 'กรอบชวนคิด: กำหนดเป้าหมายให้ชัดเจนและวัดผลได้จริง',
      lenses: [
        'ตั้งเป้าหมายแบบ SMART: มีผลลัพธ์หรือตัวเลขเป้าหมายที่ระบุได้ชัดเจน',
        'จำกัดขอบเขต: ปรับขนาดเป้าหมายให้ทำสำเร็จได้จริงภายใน 4-8 สัปดาห์',
      ],
    },
    tier3: {
      content:
        'ตัวอย่างการตั้งเป้าหมาย (โปรดนำไปเรียบเรียงต่อด้วยตนเอง):',
      examples: [
        'ตัวอย่างที่ 1: พัฒนาแผ่นรองกันกระแทกจากเส้นใยธรรมชาติที่ลดการแตกหักได้เทียบเท่าโฟมสังเคราะห์',
        'ตัวอย่างที่ 2: สร้างระบบแจ้งเตือนระดับน้ำอัตโนมัติที่ส่งข้อมูลผ่านสมาร์ทโฟนได้ภายใน 5 วินาที',
      ],
    },
  },
  methodology: {
    tier1:
      'คิดว่าจะใช้วิธีการ การทดลอง หรือเครื่องมืออะไรในการศึกษาหรือแก้ปัญหานี้ให้เห็นผลจริงครับ?',
    tier2: {
      content: 'กรอบชวนคิด: เลือกเครื่องมือและวิธีที่เข้าถึงได้และเหมาะสมกับเวลา',
      lenses: [
        'ใช้วัสดุหรือทรัพยากรที่มีอยู่แล้วในท้องถิ่นหรือโรงเรียนเพื่อลดค่าใช้จ่าย',
        'เริ่มจากแบบจำลองขนาดย่อม (Prototype) เพื่อทดสอบแนวคิดก่อนทำจริง',
      ],
    },
    tier3: {
      content:
        'ตัวอย่างวิธีดำเนินงาน (ให้นำไปอธิบายขั้นตอนด้วยความเข้าใจของตนเอง):',
      examples: [
        'ตัวอย่างที่ 1: นำเส้นใยพืชมาตากแห้ง บดผสมกับแป้งมันสำปะหลัง แล้วอัดขึ้นรูปด้วยแม่พิมพ์ความร้อน',
        'ตัวอย่างที่ 2: เขียนโปรแกรมตรวจจับภาพด้วยโมเดล Edge AI บนบอร์ดไมโครคอนโทรลเลอร์ ESP32-CAM',
      ],
    },
  },
  measurement: {
    tier1:
      'จะรู้ได้อย่างไรว่าวิธีที่เราทดลองได้ผล จะวัดหรือเก็บข้อมูลอะไรเป็นตัวเลขหรือตัวบ่งชี้ความสำเร็จครับ?',
    tier2: {
      content: 'กรอบชวนคิด: กำหนดตัวแปรและข้อมูลที่จะบันทึกอย่างเป็นระบบ',
      lenses: [
        'เปรียบเทียบก่อนและหลัง: มีชุดควบคุม (Control Group) เพื่อเปรียบเทียบความแตกต่างชัดเจน',
        'วัดตัวแปรเชิงปริมาณ: เช่น เวลา อุณหภูมิ น้ำหนัก หรือเปอร์เซ็นต์ความแม่นยำ',
      ],
    },
    tier3: {
      content:
        'ตัวอย่างการวัดผลเชิงวิทยาศาสตร์ (ปรับให้เหมาะกับโครงงานของคุณ):',
      examples: [
        'ตัวอย่างที่ 1: วัดแรงกดที่แผ่นรองรับได้ก่อนแตกหัก (นิวตัน) และชั่งน้ำหนักที่ลดลงจากการย่อยสลายในดินทุก 7 วัน',
        'ตัวอย่างที่ 2: วัดความถูกต้องในการตรวจจับ (Accuracy %) เปรียบเทียบกับการนับด้วยสายตามนุษย์ 50 ครั้ง',
      ],
    },
  },
};

const COMPLETION_SUMMARY_THAI =
  'ยอดเยี่ยมมากครับ! คุณได้ร่วมคิดและระบุครบถ้วนทั้งปัญหา วัตถุประสงค์ วิธีการ และการวัดผลแล้ว พร้อมนำไปประเมินโครงงาน (Evaluate) หรือจัดทำร่างข้อเสนอโครงงาน (Proposal) ต่อได้ทันทีครับ';

const AiCoachResponseSchema = z.object({
  content: z.string().min(1),
  lenses: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
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

  // 2. Check completion: if all 4 aspects are complete OR cap of 8 reached
  const allAspectsCovered =
    state.aspectProgress.problem &&
    state.aspectProgress.objective &&
    state.aspectProgress.methodology &&
    state.aspectProgress.measurement;

  if (allAspectsCovered || state.turnCount >= 8) {
    state.isComplete = true;
    return {
      source: 'fallback',
      tier: 1,
      aspect: 'completed',
      content: COMPLETION_SUMMARY_THAI,
      state,
    };
  }

  // 3. Determine tier and enforce ADR 0002 lock rules:
  // - Tier 1: always unlocked
  // - Tier 2: unlocked if Tier 1 was shown in history or unlockedTiers
  // - Tier 3: unlocked ONLY if BOTH Tier 1 AND Tier 2 were shown in history!
  const hasShownTier1 =
    state.unlockedTiers.includes(1) ||
    state.history.some((h) => h.tier === 1);
  const hasShownTier2 =
    state.unlockedTiers.includes(2) ||
    state.history.some((h) => h.tier === 2);

  const desiredTier: CoachingTier = request.requestedTier ?? 1;
  let effectiveTier: CoachingTier = 1;
  let tierDowngraded = false;

  if (desiredTier === 3) {
    if (hasShownTier1 && hasShownTier2) {
      effectiveTier = 3;
    } else {
      // Tier 3 is locked! Downgrade fail-closed to Tier 2 (or Tier 1 if Tier 1 not yet shown)
      tierDowngraded = true;
      effectiveTier = hasShownTier1 ? 2 : 1;
    }
  } else if (desiredTier === 2) {
    if (hasShownTier1) {
      effectiveTier = 2;
    } else {
      tierDowngraded = true;
      effectiveTier = 1;
    }
  } else {
    effectiveTier = 1;
  }

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
  state.turnCount += 1;
  if (state.turnCount >= 8) {
    state.isComplete = true;
  }

  // 6. Generate content (Gateway with deterministic fallback)
  const prompts = FALLBACK_PROMPTS[targetAspect];
  let defaultContent = '';
  let defaultLenses: string[] | undefined;
  let defaultExamples: string[] | undefined;

  if (effectiveTier === 1) {
    defaultContent = prompts.tier1;
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
      ? gatewayResult.data.lenses ?? defaultLenses
      : undefined;
  const finalExamples =
    effectiveTier === 3
      ? gatewayResult.data.examples ?? defaultExamples
      : undefined;

  // 7. Append turn to history
  const turnHistory: CoachTurnHistory = {
    turnIndex: state.turnCount,
    tier: effectiveTier,
    aspect: targetAspect,
    content: finalContent,
    lenses: finalLenses,
    examples: finalExamples,
    timestamp: new Date().toISOString(),
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

// In-memory server store for coach sessions keyed by `${anonymousId}:${ideaId || 'default'}`
export class InMemoryCoachSessionStore {
  private sessions = new Map<string, CoachSessionState>();

  private buildKey(anonymousId: string, ideaId?: string): string {
    return `${anonymousId}:${ideaId || 'default'}`;
  }

  getOrCreate(anonymousId: string, ideaId?: string): CoachSessionState {
    const key = this.buildKey(anonymousId, ideaId);
    let session = this.sessions.get(key);
    if (!session) {
      session = createInitialCoachState(anonymousId, ideaId);
      this.sessions.set(key, session);
    }
    return session;
  }

  save(session: CoachSessionState): void {
    const key = this.buildKey(session.anonymousId, session.ideaId);
    this.sessions.set(key, session);
  }

  reset(anonymousId?: string): void {
    if (!anonymousId) {
      this.sessions.clear();
      return;
    }
    const prefix = `${anonymousId}:`;
    for (const key of Array.from(this.sessions.keys())) {
      if (key.startsWith(prefix)) {
        this.sessions.delete(key);
      }
    }
  }
}

declare global {
  var __projectEduCoachSessionStore: InMemoryCoachSessionStore | undefined;
}

export const coachSessionStore: InMemoryCoachSessionStore =
  globalThis.__projectEduCoachSessionStore ??
  (globalThis.__projectEduCoachSessionStore = new InMemoryCoachSessionStore());
