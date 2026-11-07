import type { Constraints, Goal } from '@/types/domain';

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
  source?: 'ai' | 'fallback';
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
    constraints?: Constraints;
    goal?: Goal;
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
export interface AspectPrompts {
  tier1: string;
  tier2: { content: string; lenses: string[] };
  tier3: { content: string; examples: string[] };
}

export const FALLBACK_PROMPTS: Record<CoachAspect, AspectPrompts> = {
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
