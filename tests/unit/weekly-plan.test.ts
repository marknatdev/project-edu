import { describe, it, expect } from 'vitest';
import {
  generateWeeklyPlan,
  togglePlanMilestone,
  updatePlanMilestone,
  addPlanMilestone,
  removePlanMilestone,
  calculatePlanProgress,
} from '@/lib/plan/weekly-plan';
import type { Plan } from '@/types/domain';

describe('Weekly Plan Generator & Checklist (AC-9 Plan)', () => {
  describe('Seam 1: Plan Generation from Constraints & Methodology', () => {
    it('generates an 8-week plan distributed across standard scientific phases', () => {
      const plan = generateWeeklyPlan({
        totalWeeks: 8,
        methodology: 'สกัดเพกตินจากเปลือกส้มโอ 1%, 3%, 5% แล้วทดสอบความแน่นเนื้อและชั่งน้ำหนักมะม่วงทุก 3 วัน',
      });

      expect(plan.totalWeeks).toBe(8);
      expect(plan.milestones.length).toBeGreaterThanOrEqual(4);
      // All milestones initially incomplete
      expect(plan.milestones.every((m) => !m.completed)).toBe(true);

      // Verify sequence covers the weeks 1 through 8
      const first = plan.milestones[0];
      const last = plan.milestones[plan.milestones.length - 1];
      expect(first.week).toBe(1);
      expect(last.week).toBe(8);

      // Early phase mentions review/variables/advisor
      expect(first.title).toMatch(/ทบทวน|วางแผน|ตัวแปร|ครูที่ปรึกษา/);
      // Final phase mentions analysis/reporting
      expect(last.title).toMatch(/วิเคราะห์|สรุป|รูปเล่ม|นำเสนอ/);

      // Student methodology incorporated into milestone description/deliverable
      const joinedDescriptions = plan.milestones.map((m) => `${m.description} ${m.deliverable}`).join(' ');
      expect(joinedDescriptions).toContain('สกัดเพกติน');
    });

    it('generates a 4-week compressed plan with 4 single-week milestones', () => {
      const plan = generateWeeklyPlan({
        totalWeeks: 4,
      });

      expect(plan.totalWeeks).toBe(4);
      expect(plan.milestones).toHaveLength(4);
      expect(plan.milestones.map((m) => m.week)).toEqual([1, 2, 3, 4]);
    });

    it('handles edge case: 1 week plan with single comprehensive milestone', () => {
      const plan = generateWeeklyPlan({
        totalWeeks: 1,
      });

      expect(plan.totalWeeks).toBe(1);
      expect(plan.milestones).toHaveLength(1);
      expect(plan.milestones[0].week).toBe(1);
    });

    it('clamps invalid weeks: 0 clamped to 1, negative clamped to 1, >52 clamped to 52', () => {
      const planZero = generateWeeklyPlan({ totalWeeks: 0 });
      expect(planZero.totalWeeks).toBe(1);

      const planNegative = generateWeeklyPlan({ totalWeeks: -5 });
      expect(planNegative.totalWeeks).toBe(1);

      const planExcessive = generateWeeklyPlan({ totalWeeks: 100 });
      expect(planExcessive.totalWeeks).toBe(52);
    });

    it('sets a valid future targetDeadline ISO string based on weeks', () => {
      const now = new Date('2026-11-05T00:00:00.000Z');
      const plan = generateWeeklyPlan({ totalWeeks: 6, fromDate: now });

      expect(new Date(plan.targetDeadline).getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Seam 2: Checklist Progress & Immutable Operations', () => {
    const samplePlan: Plan = {
      targetDeadline: '2026-12-31T00:00:00.000Z',
      totalWeeks: 4,
      milestones: [
        { week: 1, title: 'สัปดาห์ 1: วางแผน', description: 'ทบทวนวรรณกรรม', deliverable: 'กรอบตัวแปร', completed: false },
        { week: 2, title: 'สัปดาห์ 2: เตรียมของ', description: 'จัดหาอุปกรณ์', deliverable: 'ชุดทดลอง', completed: false },
        { week: 3, title: 'สัปดาห์ 3: ทดลอง', description: 'เก็บข้อมูล', deliverable: 'ตารางบันทึก', completed: false },
        { week: 4, title: 'สัปดาห์ 4: วิเคราะห์', description: 'สรุปผล', deliverable: 'รูปเล่มฉบับร่าง', completed: false },
      ],
    };

    it('toggles milestone completion immutably', () => {
      const updated = togglePlanMilestone(samplePlan, 0);

      expect(updated.milestones[0].completed).toBe(true);
      // Original remains untouched (immutability)
      expect(samplePlan.milestones[0].completed).toBe(false);

      // Toggle back
      const reverted = togglePlanMilestone(updated, 0);
      expect(reverted.milestones[0].completed).toBe(false);
    });

    it('calculates progress percentage correctly (handles 0, partial, complete, and empty)', () => {
      // 0 completed
      expect(calculatePlanProgress(samplePlan)).toEqual({
        completedCount: 0,
        totalCount: 4,
        percentage: 0,
      });

      // 1 of 4 completed = 25%
      const oneDone = togglePlanMilestone(samplePlan, 0);
      expect(calculatePlanProgress(oneDone)).toEqual({
        completedCount: 1,
        totalCount: 4,
        percentage: 25,
      });

      // 2 of 4 completed = 50%
      const twoDone = togglePlanMilestone(oneDone, 1);
      expect(calculatePlanProgress(twoDone)).toEqual({
        completedCount: 2,
        totalCount: 4,
        percentage: 50,
      });

      // Empty plan handles divide-by-zero safely
      const emptyPlan: Plan = {
        targetDeadline: '2026-12-31T00:00:00.000Z',
        totalWeeks: 1,
        milestones: [],
      };
      expect(calculatePlanProgress(emptyPlan)).toEqual({
        completedCount: 0,
        totalCount: 0,
        percentage: 0,
      });
    });

    it('updates milestone text fields immutably', () => {
      const updated = updatePlanMilestone(samplePlan, 1, {
        title: 'สัปดาห์ 2: เตรียมสารละลายเพกติน',
        deliverable: 'สารละลาย 3 ความเข้มข้น',
      });

      expect(updated.milestones[1].title).toBe('สัปดาห์ 2: เตรียมสารละลายเพกติน');
      expect(updated.milestones[1].deliverable).toBe('สารละลาย 3 ความเข้มข้น');
      expect(samplePlan.milestones[1].title).toBe('สัปดาห์ 2: เตรียมของ');
    });

    it('adds and removes milestones immutably', () => {
      const added = addPlanMilestone(samplePlan, {
        week: 5,
        title: 'สัปดาห์ 5: ซ้อมนำเสนอต่อหน้าชั้น',
        description: 'เตรียมสไลด์และฝึกตอบคำถาม',
        deliverable: 'สไลด์ 10 แผ่น',
        completed: false,
      });

      expect(added.milestones).toHaveLength(5);
      expect(added.milestones[4].title).toBe('สัปดาห์ 5: ซ้อมนำเสนอต่อหน้าชั้น');
      expect(samplePlan.milestones).toHaveLength(4);

      const removed = removePlanMilestone(added, 4);
      expect(removed.milestones).toHaveLength(4);
      expect(added.milestones).toHaveLength(5);
    });
  });
});
