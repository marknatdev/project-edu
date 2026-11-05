import {
  GradeLevelSchema,
  GoalSchema,
  ConstraintsSchema,
  TrackSchema,
  InterviewSchema,
} from '@/lib/schemas';
import type {
  GradeLevel,
  Goal,
  Constraints,
  Track,
  Interview,
} from '@/types/domain';

export interface InterviewDraft {
  gradeLevel?: GradeLevel;
  goal?: Goal;
  constraints?: Constraints;
  hasInitialIdea?: boolean;
  selectedTrack?: Track;
}

export interface StepValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CompleteInterviewValidationResult {
  valid: boolean;
  data?: Interview;
  errors: string[];
}

/**
 * Determines the target route based on interview track choice or initial idea status.
 */
export function determineTrackRoute(params: {
  hasInitialIdea?: boolean;
  selectedTrack?: Track;
}): string {
  if (params.selectedTrack === 'idea_track' || params.hasInitialIdea === true) {
    return '/idea';
  }
  return '/discovery';
}

/**
 * Validates a single step of the interview draft.
 * Step 1: GradeLevel (ม.ต้น / ม.ปลาย)
 * Step 2: Goal (เวทีแข่งขัน / เป้าหมายการเรียนรู้)
 * Step 3: Constraints (เวลา, งบประมาณ, อุปกรณ์, สมาชิก, ทักษะ)
 * Step 4: Track choice (มีไอเดียแล้ว vs ค้นหาหัวข้อใหม่)
 */
export function validateInterviewStep(
  step: number,
  data: Partial<InterviewDraft>
): StepValidationResult {
  const errors: string[] = [];

  switch (step) {
    case 1: {
      const parsed = GradeLevelSchema.safeParse(data.gradeLevel);
      if (!parsed.success) {
        errors.push('กรุณาเลือกระดับชั้นของผู้เรียน (ม.ต้น หรือ ม.ปลาย)');
      }
      break;
    }

    case 2: {
      const parsed = GoalSchema.safeParse(data.goal);
      if (!parsed.success) {
        errors.push('กรุณาเลือกเป้าหมายในการทำโครงงาน');
      }
      break;
    }

    case 3: {
      const parsed = ConstraintsSchema.safeParse(data.constraints);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        }
      }
      break;
    }

    case 4: {
      if (typeof data.hasInitialIdea !== 'boolean') {
        errors.push('กรุณาระบุว่าท่านมีไอเดียเริ่มต้นแล้วหรือยัง');
      }
      const trackParsed = TrackSchema.safeParse(data.selectedTrack);
      if (!trackParsed.success) {
        errors.push('กรุณาเลือกเส้นทางที่ต้องการ (Idea Track หรือ Discovery Track)');
      }
      break;
    }

    default:
      errors.push(`ขั้นตอนที่ ${step} ไม่ถูกต้อง`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a full Interview object against the canonical domain schema.
 */
export function validateCompleteInterview(
  data: unknown
): CompleteInterviewValidationResult {
  const parsed = InterviewSchema.safeParse(data);
  if (parsed.success) {
    return {
      valid: true,
      data: parsed.data,
      errors: [],
    };
  }

  return {
    valid: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}

/**
 * Creates a fully validated Interview object from a complete draft and learner ID.
 */
export function createInterviewFromDraft(
  draft: InterviewDraft,
  learnerId: string
): Interview {
  const selectedTrack: Track =
    draft.selectedTrack ?? (draft.hasInitialIdea ? 'idea_track' : 'discovery_track');

  const candidate = {
    id: `interview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    learnerId,
    gradeLevel: draft.gradeLevel,
    goal: draft.goal,
    constraints: draft.constraints,
    hasInitialIdea: Boolean(draft.hasInitialIdea),
    selectedTrack,
    completedAt: new Date().toISOString(),
  };

  return InterviewSchema.parse(candidate);
}

// Canonical display metadata for UI choices

export const GOAL_OPTIONS: ReadonlyArray<{
  value: Goal;
  labelTh: string;
  badgeTh: string;
  descriptionTh: string;
}> = [
  {
    value: 'ysc',
    labelTh: 'การประกวดโครงงานของนักวิทยาศาสตร์รุ่นเยาว์ (YSC)',
    badgeTh: 'งานแข่งขัน',
    descriptionTh: 'มุ่งเน้นกระบวนการทางวิทยาศาสตร์ นวัตกรรม และมาตรฐานสากล SRC/ISEF',
  },
  {
    value: 'nsc',
    labelTh: 'การแข่งขันพัฒนาโปรแกรมคอมพิวเตอร์แห่งประเทศไทย (NSC)',
    badgeTh: 'งานแข่งขัน',
    descriptionTh: 'ซอฟต์แวร์ ฮาร์ดแวร์ แอปพลิเคชัน ปัญญาประดิษฐ์ (AI) และ IoT',
  },
  {
    value: 'silapa',
    labelTh: 'งานศิลปหัตถกรรมนักเรียน',
    badgeTh: 'สพฐ.',
    descriptionTh: 'โครงงานวิทยาศาสตร์ สิ่งประดิษฐ์ และโครงงานคณิตศาสตร์ตามระดับชั้น',
  },
  {
    value: 'isef',
    labelTh: 'โครงงานระดับนานาชาติ (Regeneron ISEF)',
    badgeTh: 'ระดับโลก',
    descriptionTh: 'ระเบียบวิจัยเข้มข้น ความแปลกใหม่สูง และผ่านเกณฑ์ความปลอดภัยเคร่งครัด',
  },
  {
    value: 'classroom',
    labelTh: 'ส่งงาน / โครงงานในชั้นเรียน',
    badgeTh: 'การเรียนรู้',
    descriptionTh: 'เน้นความเข้าใจหลักการ ทำได้จริงตามเวลาภาคเรียน และงบประมาณประหยัด',
  },
  {
    value: 'portfolio',
    labelTh: 'จัดทำผลงานสะสม (Portfolio / ยื่น TCAS)',
    badgeTh: 'สะสมผลงาน',
    descriptionTh: 'แสดงทักษะความเชี่ยวชาญ ความสนใจลึกซึ้ง และการแก้ปัญหาจริง',
  },
  {
    value: 'curiosity',
    labelTh: 'ทำเพราะความสนใจ / แก้ปัญหาใกล้ตัว',
    badgeTh: 'ความสนใจ',
    descriptionTh: 'อิสระในการค้นคว้า เรียนรู้สิ่งใหม่ ไม่ยึดติดกับกรอบการแข่งขัน',
  },
];

export const EQUIPMENT_OPTIONS: ReadonlyArray<{
  id: string;
  labelTh: string;
}> = [
  { id: 'computer', labelTh: 'คอมพิวเตอร์ / โน้ตบุ๊ก' },
  { id: 'smartphone', labelTh: 'สมาร์ตโฟน / แท็บเล็ต' },
  { id: 'basic_lab', labelTh: 'ห้องทดลองวิทยาศาสตร์พื้นฐาน' },
  { id: 'sensors', labelTh: 'เซนเซอร์ตรวจวัด (แสง, ความชื้น, อุณหภูมิ, ฝุ่น)' },
  { id: 'arduino_microcontroller', labelTh: 'ไมโครคอนโทรลเลอร์ (Arduino / ESP32 / Micro:bit)' },
  { id: 'workshop_tools', labelTh: 'เครื่องมืองานช่าง / อุปกรณ์ประกอบโมเดล' },
  { id: 'specialized_lab', labelTh: 'ห้องปฏิบัติการเฉพาะทาง (มหาวิทยาลัย/ศูนย์วิจัย)' },
];

export const SKILL_OPTIONS: ReadonlyArray<{
  id: string;
  labelTh: string;
}> = [
  { id: 'coding', labelTh: 'การเขียนโค้ด / โปรแกรมมิ่ง' },
  { id: 'science_lab', labelTh: 'การทดลองและใช้อุปกรณ์วิทยาศาสตร์' },
  { id: 'circuit_electronics', labelTh: 'วงจรอิเล็กทรอนิกส์และฮาร์ดแวร์' },
  { id: 'data_math', labelTh: 'คณิตศาสตร์และการวิเคราะห์ข้อมูล' },
  { id: 'handicraft_building', labelTh: 'งานประดิษฐ์และประกอบชิ้นงาน' },
  { id: 'presentation', labelTh: 'การสื่อสารและนำเสนอผลงาน' },
];
