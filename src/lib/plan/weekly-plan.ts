import type { Plan, PlanMilestone } from '@/types/domain';

export interface GeneratePlanOptions {
  totalWeeks?: number;
  methodology?: string;
  fromDate?: Date;
}

interface PhaseTemplate {
  title: string;
  defaultDescription: string;
  defaultDeliverable: string;
}

const SCIENTIFIC_PHASES: PhaseTemplate[] = [
  {
    title: 'ทบทวนวรรณกรรม ยืนยันตัวแปร และปรึกษาครูที่ปรึกษา',
    defaultDescription: 'ทบทวนงานวิจัยที่เกี่ยวข้อง กำหนดตัวแปรต้น-ตาม-ควบคุมอย่างรัดกุม และขอคำปรึกษาครูที่ปรึกษาโครงงาน',
    defaultDeliverable: 'กรอบแนวคิดโครงงานและตารางตัวแปรที่ครูเห็นชอบ',
  },
  {
    title: 'จัดเตรียมอุปกรณ์ วัสดุสารเคมี และชุดทดลอง/พัฒนา',
    defaultDescription: 'จัดหาและตรวจสอบความพร้อมของอุปกรณ์ เครื่องมือ และจัดเตรียมสารละลายหรือสภาพแวดล้อมการทดสอบ',
    defaultDeliverable: 'ชุดอุปกรณ์และสารเคมี/ระบบต้นแบบพร้อมทำการทดสอบ',
  },
  {
    title: 'ดำเนินการทดลอง/พัฒนา และบันทึกผลอย่างเป็นระบบ',
    defaultDescription: 'ลงมือทดลองตามขั้นตอน ทำซ้ำเพื่อความน่าเชื่อถือ และบันทึกผลเชิงปริมาณ/คุณภาพ',
    defaultDeliverable: 'สมุดบันทึกผลการทดลองและตารางข้อมูลดิบ',
  },
  {
    title: 'วิเคราะห์ผล สรุปการทดลอง และจัดทำรูปเล่มข้อเสนอโครงงาน',
    defaultDescription: 'ประมวลผลทางสถิติ แปลความหมายผลการทดลอง สรุปข้อค้นพบ และจัดพิมพ์รูปเล่มฉบับสมบูรณ์',
    defaultDeliverable: 'รูปเล่มข้อเสนอโครงงานและบทสรุปการนำเสนอ',
  },
];

/**
 * Generates an editable weekly plan based on learner constraints (weeks) and methodology.
 * Clamps weeks between 1 and 52 (default 8).
 */
export function generateWeeklyPlan(options: GeneratePlanOptions = {}): Plan {
  const rawWeeks = options.totalWeeks ?? 8;
  const totalWeeks = Math.max(1, Math.min(52, Math.floor(rawWeeks)));
  const fromDate = options.fromDate ?? new Date();

  // Target deadline = fromDate + (totalWeeks * 7 days)
  const deadlineMs = fromDate.getTime() + totalWeeks * 7 * 24 * 60 * 60 * 1000;
  const targetDeadline = new Date(deadlineMs).toISOString();

  const studentMethodology = options.methodology?.trim();
  const methodSnippet = studentMethodology ? ` (${studentMethodology.slice(0, 80)})` : '';

  const milestones: PlanMilestone[] = [];

  if (totalWeeks === 1) {
    // 1-week compact project
    milestones.push({
      week: 1,
      title: 'สัปดาห์ 1: วางแผน ดำเนินการ และสรุปผลโครงงาน',
      description: studentMethodology
        ? `ดำเนินการตามระเบียบวิธีวิจัย: ${studentMethodology}`
        : 'วางแผนงาน ยืนยันตัวแปร จัดเตรียมอุปกรณ์ ลงมือทดลอง และสรุปผล',
      deliverable: 'ข้อเสนอโครงงานและตารางบันทึกผลเบื้องต้น',
      completed: false,
    });
  } else if (totalWeeks <= 3) {
    // 2-3 weeks: 1 milestone per week
    for (let w = 1; w <= totalWeeks; w++) {
      const phaseIdx = Math.min(w - 1, SCIENTIFIC_PHASES.length - 1);
      const phase = SCIENTIFIC_PHASES[phaseIdx];
      milestones.push({
        week: w,
        title: `สัปดาห์ ${w}: ${phase.title}`,
        description: w === 2 && studentMethodology
          ? `ดำเนินการขั้นตอน: ${studentMethodology}`
          : phase.defaultDescription,
        deliverable: phase.defaultDeliverable,
        completed: false,
      });
    }
  } else {
    // 4+ weeks: distributed evenly across 4 phases
    // We create milestones spanning the weeks
    const phaseCount = 4;
    const baseWeeksPerPhase = Math.floor(totalWeeks / phaseCount);
    let remainder = totalWeeks % phaseCount;

    let currentStartWeek = 1;

    for (let i = 0; i < phaseCount; i++) {
      const phaseWeeks = baseWeeksPerPhase + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      const endWeek = currentStartWeek + phaseWeeks - 1;
      const weekLabel = currentStartWeek === endWeek
        ? `สัปดาห์ ${currentStartWeek}`
        : `สัปดาห์ ${currentStartWeek}–${endWeek}`;

      const phase = SCIENTIFIC_PHASES[i];

      let desc = phase.defaultDescription;
      if ((i === 1 || i === 2) && studentMethodology) {
        desc = `${phase.defaultDescription} — รายละเอียดขั้นตอน: ${studentMethodology}`;
      }

      milestones.push({
        week: currentStartWeek,
        title: `${weekLabel}: ${phase.title}`,
        description: desc,
        deliverable: i === 2 && studentMethodology
          ? `${phase.defaultDeliverable} จากการทดสอบ${methodSnippet}`
          : phase.defaultDeliverable,
        completed: false,
      });

      currentStartWeek = endWeek + 1;
    }

    // Ensure the last milestone reflects the final week boundary
    if (milestones.length > 0) {
      milestones[milestones.length - 1].week = totalWeeks;
    }
  }

  return {
    targetDeadline,
    totalWeeks,
    milestones,
  };
}

/**
 * Toggles a milestone completion state immutably.
 */
export function togglePlanMilestone(plan: Plan, milestoneIndex: number): Plan {
  if (milestoneIndex < 0 || milestoneIndex >= plan.milestones.length) {
    return plan;
  }

  return {
    ...plan,
    milestones: plan.milestones.map((m, idx) =>
      idx === milestoneIndex ? { ...m, completed: !m.completed } : m
    ),
  };
}

/**
 * Updates text/deliverable of a milestone immutably.
 */
export function updatePlanMilestone(
  plan: Plan,
  milestoneIndex: number,
  patch: Partial<PlanMilestone>
): Plan {
  if (milestoneIndex < 0 || milestoneIndex >= plan.milestones.length) {
    return plan;
  }

  return {
    ...plan,
    milestones: plan.milestones.map((m, idx) =>
      idx === milestoneIndex ? { ...m, ...patch } : m
    ),
  };
}

/**
 * Adds a new milestone to the plan immutably.
 */
export function addPlanMilestone(
  plan: Plan,
  milestone: Omit<PlanMilestone, 'week'> & { week?: number }
): Plan {
  const newWeek = milestone.week ?? (plan.milestones.length > 0
    ? Math.max(...plan.milestones.map((m) => m.week)) + 1
    : 1);

  return {
    ...plan,
    milestones: [
      ...plan.milestones,
      {
        week: newWeek,
        title: milestone.title,
        description: milestone.description,
        deliverable: milestone.deliverable,
        completed: !!milestone.completed,
      },
    ],
  };
}

/**
 * Removes a milestone by index immutably.
 */
export function removePlanMilestone(plan: Plan, milestoneIndex: number): Plan {
  if (milestoneIndex < 0 || milestoneIndex >= plan.milestones.length) {
    return plan;
  }

  return {
    ...plan,
    milestones: plan.milestones.filter((_, idx) => idx !== milestoneIndex),
  };
}

export interface PlanProgress {
  completedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Computes checklist completion progress.
 */
export function calculatePlanProgress(plan: Plan): PlanProgress {
  const totalCount = plan.milestones.length;
  if (totalCount === 0) {
    return {
      completedCount: 0,
      totalCount: 0,
      percentage: 0,
    };
  }

  const completedCount = plan.milestones.filter((m) => m.completed).length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    completedCount,
    totalCount,
    percentage,
  };
}
