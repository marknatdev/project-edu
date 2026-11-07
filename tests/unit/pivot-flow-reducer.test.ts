import { describe, it, expect } from 'vitest';
import {
  createInitialPivotState,
  pivotReducer,
} from '@/lib/pivot/pivot-reducer';
import type { Idea, Constraints } from '@/types/domain';
import type { PivotView } from '@/lib/pivot/pivot-dto';
const servedExamples: PivotView = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', revision: 3, axis: 'feasibility', unlockedTiers: [1, 2, 3],
  tier1Prompt: 'คำถามจากเซิร์ฟเวอร์', tier2Lenses: ['คำใบ้จากเซิร์ฟเวอร์'],
  tier3Examples: ['ลองเทียบการสกัดด้วยน้ำอุ่นกับน้ำเย็น', 'ลองลดขนาดการทดลองและควบคุมอุณหภูมิ'], source: 'fallback' };

describe('Pivot Flow Reducer (ADR 0002 & AC-8)', () => {
  const sampleIdea: Idea = {
    id: 'idea_001',
    learnerId: 'learner_123',
    title: 'สารสกัดจากเปลือกมังคุดยับยั้งเชื้อราบนผลส้ม',
    description: 'ศึกษาประสิทธิภาพสารสกัดเปลือกมังคุดในการลดการเน่าเสียของส้มสายน้ำผึ้งหลังเก็บเกี่ยว',
    goal: 'ysc',
    gradeLevel: 'm_plai',
    source: 'discovery_track',
    sourceTopicCardId: 'tc_biology_01',
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
  };

  const sampleConstraints: Constraints = {
    timeWeeks: 12,
    budgetBaht: 2500,
    equipment: ['ห้องแล็บโรงเรียน', 'กล้องจุลทรรศน์'],
    teamSize: 2,
    skills: ['ชีววิทยาเบื้องต้น'],
  };

  it('Seam 8: initializes state with red axes, active axis, and non-blocking proposal access', () => {
    const state = createInitialPivotState({
      idea: sampleIdea,
      redAxes: ['feasibility', 'novelty'],
      constraints: sampleConstraints,
    });

    expect(state.originalIdea.id).toBe('idea_001');
    expect(state.redAxes).toEqual(['feasibility', 'novelty']);
    expect(state.activeAxis).toBe('feasibility');
    expect(state.currentTier).toBe(1);
    expect(state.unlockedTiers).toEqual([1]);
    expect(state.canAccessProposal).toBe(true);
    expect(state.tier1Prompt.length).toBeGreaterThan(10);
  });

  it('Seam 9: Tier 1 Socratic question is immediately available and canAccessProposal remains true', () => {
    const state = createInitialPivotState({
      idea: sampleIdea,
      redAxes: ['feasibility'],
      constraints: sampleConstraints,
    });

    expect(state.currentTier).toBe(1);
    expect(state.unlockedTiers).toContain(1);
    expect(state.canAccessProposal).toBe(true);
  });

  it('Seam 10: Tier 2 lens is locked until unlocked; cannot jump directly to Tier 2 without unlocking', () => {
    let state = createInitialPivotState({
      idea: sampleIdea,
      redAxes: ['feasibility'],
      constraints: sampleConstraints,
    });

    // Attempting to select Tier 2 while still locked does not change currentTier
    state = pivotReducer(state, { type: 'SELECT_TIER', tier: 2 });
    expect(state.currentTier).toBe(1);
    expect(state.unlockedTiers).not.toContain(2);

    // Explicitly unlock Tier 2
    state = pivotReducer(state, { type: 'UNLOCK_TIER_2' });
    expect(state.currentTier).toBe(2);
    expect(state.unlockedTiers).toContain(2);
    expect(state.tier2Lenses.length).toBeGreaterThan(0);
    expect(state.canAccessProposal).toBe(true);
  });

  it('Seam 11: Tier 3 is strictly locked (ADR 0002) until Tier 1 and Tier 2 are unlocked; provides 2-3 angles', () => {
    let state = createInitialPivotState({
      idea: sampleIdea,
      redAxes: ['feasibility'],
      constraints: sampleConstraints,
    });

    // Requesting Tier 3 without unlocking Tier 2 first fails with an error
    state = pivotReducer(state, { type: 'REQUEST_TIER_3' });
    expect(state.currentTier).toBe(1);
    expect(state.unlockedTiers).not.toContain(3);
    expect(state.error).toContain('ปุ่มมุมมองใหม่จะปลดล็อกหลังจากได้ลองคิดคำถามระดับ 1 และขอคำใบ้ระดับ 2');

    // Unlock Tier 2 first
    state = pivotReducer(state, { type: 'UNLOCK_TIER_2' });
    expect(state.unlockedTiers).toEqual([1, 2]);

    // Only an authoritative server response supplies examples.
    state = pivotReducer(state, { type: 'SERVER_SYNC', pivot: servedExamples });
    state = pivotReducer(state, { type: 'REQUEST_TIER_3' });
    expect(state.currentTier).toBe(3);
    expect(state.unlockedTiers).toEqual([1, 2, 3]);
    expect(state.error).toBeNull();

    // Verify 2-3 angles constraint
    expect(state.tier3Examples.length).toBeGreaterThanOrEqual(2);
    expect(state.tier3Examples.length).toBeLessThanOrEqual(3);

    // Receiving new angles trims to at most 3
    state = pivotReducer(state, {
      type: 'SET_COACHING_DATA',
      tier3Examples: ['Angle A', 'Angle B', 'Angle C', 'Angle D'],
    });
    expect(state.tier3Examples).toHaveLength(3);
    expect(state.tier3Examples).toEqual(['Angle A', 'Angle B', 'Angle C']);
    expect(state.canAccessProposal).toBe(true);
  });

  it('Seam 12: falls back to deterministic axis guide on network or quota error without losing state', () => {
    let state = createInitialPivotState({
      idea: sampleIdea,
      redAxes: ['novelty'],
      constraints: sampleConstraints,
    });

    state = pivotReducer(state, { type: 'UNLOCK_TIER_2' });
    state = pivotReducer(state, {
      type: 'COACH_FAILURE_FALLBACK',
      error: 'Quota exceeded or network timeout',
    });

    expect(state.error).toBe('Quota exceeded or network timeout');
    expect(state.tier1Prompt).toContain('ในด้านความแปลกใหม่');
    expect(state.tier2Lenses.length).toBeGreaterThanOrEqual(1);
    expect(state.tier3Examples).toEqual([]);
    expect(state.canAccessProposal).toBe(true);
  });

  it('Seam 13: ADR 0002 Student Rewrite Gate prevents overwriting idea and enforces honest rewrite', () => {
    let state = createInitialPivotState({
      idea: sampleIdea,
      redAxes: ['feasibility'],
      constraints: sampleConstraints,
    });
    state = pivotReducer(state, { type: 'SERVER_SYNC', pivot: servedExamples });
    state = pivotReducer(state, { type: 'SELECT_TIER', tier: 3 });

    const chosenAngle = state.tier3Examples[0];
    state = pivotReducer(state, { type: 'SELECT_ANGLE', angle: chosenAngle });
    expect(state.pendingAngle).toBe(chosenAngle);
    // Student idea description is NOT yet altered!
    expect(state.updatedIdea).toBeNull();

    // 1. Rejects rewrite shorter than 15 chars
    state = pivotReducer(state, { type: 'SUBMIT_REWRITE', rewrite: 'สั้นเกิน' });
    expect(state.error).toContain('อย่างน้อย 15 ตัวอักษร');
    expect(state.updatedIdea).toBeNull();

    // 2. Rejects verbatim copy of chosenAngle
    state = pivotReducer(state, { type: 'SUBMIT_REWRITE', rewrite: chosenAngle });
    expect(state.error).toContain('ห้ามคัดลอก');
    expect(state.updatedIdea).toBeNull();

    // 3. Accepts genuine rewrite in student own words
    const honestRewrite =
      'เราจะเปลี่ยนจากการสร้างเครื่องสกัดขนาดใหญ่ มาใช้การแช่สกัดด้วยน้ำร้อนในห้องแล็บโรงเรียนแทนเพื่อประหยัดงบประมาณ';
    state = pivotReducer(state, { type: 'SUBMIT_REWRITE', rewrite: honestRewrite });

    expect(state.error).toBeNull();
    expect(state.studentRewrite).toBe(honestRewrite);
    expect(state.updatedIdea).not.toBeNull();
    expect(state.updatedIdea?.usedTier3Example).toBe(true);
    expect(state.updatedIdea?.tier3Rewrite).toBe(honestRewrite);
    expect(state.updatedIdea?.description).toContain(honestRewrite);
    expect(state.pivotRecord).not.toBeNull();
    expect(state.pivotRecord?.originalIdeaId).toBe('idea_001');
    expect(state.pivotRecord?.coaching.selectedAngle).toBe(chosenAngle);

    // Can still proceed to proposal
    expect(state.canAccessProposal).toBe(true);
  });
});
