import { describe, it, expect } from 'vitest';
import { buildEvaluationView } from '@/lib/evaluation/view-model';
import type { Evaluation, EvaluationAxes } from '@/types/domain';

describe('Evaluation View Model', () => {
  const baseAxes: EvaluationAxes = {
    novelty: { score: 8, badge: 'green', rationale: 'แปลกใหม่', feedback: 'ต่อยอดได้ดี' },
    feasibility: { score: 5, badge: 'yellow', rationale: 'งบจำกัด', feedback: 'ลดขนาดสเกล' },
    impact: { score: 2, badge: 'red', rationale: 'กลุ่มเป้าหมายแคบ', feedback: 'ขยายผลกระทบ' },
    rigor: { score: 9, badge: 'green', rationale: 'มีกลุ่มควบคุมชัดเจน', feedback: 'วิเคราะห์สถิติเพิ่ม' },
    fit: { score: 3, badge: 'red', rationale: 'ไม่ตรงเป้าหมาย YSC', feedback: 'ปรับกรอบคิด' },
  };

  const sampleEvaluation: Evaluation = {
    id: 'eval_123',
    ideaId: 'idea_456',
    overallScore: 6,
    overallBadge: 'yellow',
    axes: baseAxes,
    safetyFlags: [],
    priorWork: [],
    evaluatedAt: '2026-11-05T10:00:00.000Z',
  };

  it('Seam 1 & 2: maps scores to bands, emojis, and non-color text labels', () => {
    const view = buildEvaluationView(sampleEvaluation, {
      quotaRemaining: 3,
    });

    // Overall
    expect(view.overall.score).toBe(6);
    expect(view.overall.badge).toBe('yellow');
    expect(view.overall.emoji).toBe('🟡');
    expect(view.overall.labelTh).toBe('ควรปรับปรุง / พัฒนาต่อ');

    // Axes checks: green, yellow, red with text labels (not color alone - AC-7)
    expect(view.axes.novelty.score).toBe(8);
    expect(view.axes.novelty.badge).toBe('green');
    expect(view.axes.novelty.emoji).toBe('🟢');
    expect(view.axes.novelty.labelTh).toBe('แข็งแรง / โดดเด่น');
    expect(view.axes.novelty.nameTh).toBe('ความคิดริเริ่มสร้างสรรค์ (Novelty)');

    expect(view.axes.feasibility.score).toBe(5);
    expect(view.axes.feasibility.badge).toBe('yellow');
    expect(view.axes.feasibility.emoji).toBe('🟡');
    expect(view.axes.feasibility.labelTh).toBe('ควรปรับปรุง / พัฒนาต่อ');

    expect(view.axes.impact.score).toBe(2);
    expect(view.axes.impact.badge).toBe('red');
    expect(view.axes.impact.emoji).toBe('🔴');
    expect(view.axes.impact.labelTh).toBe('เสี่ยงสูง / ต้องปรับปรุง');
  });

  it('Seam 3: provides deterministic fallback text when rationale or feedback is empty', () => {
    const blankAxesEvaluation: Evaluation = {
      ...sampleEvaluation,
      axes: {
        ...baseAxes,
        novelty: { score: 7, badge: 'green', rationale: '   ', feedback: '' },
      },
    };

    const view = buildEvaluationView(blankAxesEvaluation);
    expect(view.axes.novelty.rationale.length).toBeGreaterThan(10);
    expect(view.axes.novelty.feedback.length).toBeGreaterThan(10);
    expect(view.axes.novelty.rationale).toContain('หัวข้อมีความคิดริเริ่ม');
  });

  it('Seam 4: strictly filters out fabricated Prior Work and keeps only verified DB records', () => {
    const evaluationWithHallucinatedWork: Evaluation = {
      ...sampleEvaluation,
      priorWork: [
        // Real entry that exists in DB
        {
          id: 'ibraille-isef2025',
          title: 'ไอเบรลล์',
          authors: 'ศิวกร สุวรรณหงส์',
          year: 2025,
          competitionOrVenue: 'REGENERON ISEF 2025',
          url: 'https://www.nstda.or.th/home/news_post/isef-20250518',
          summary: 'แพลตฟอร์มการเรียนรู้อักษรเบรลล์',
          difference: 'ใช้ระบบประมวลผลภาพ',
        },
        // Hallucinated / Fabricated entry from AI
        {
          id: 'fake-paper-123',
          title: 'A Fabricated Study on Bananas and Sound Waves',
          authors: 'John Doe',
          year: 2026,
          competitionOrVenue: 'Made Up Conference',
          url: 'https://example-fake-domain.com/banana',
          summary: 'Fake summary',
          difference: 'None',
        },
        // Real ID but fabricated mismatch URL
        {
          id: 'sprinkler-polar-isef2018',
          title: 'การศึกษาสมการเชิงขั้ว',
          authors: 'ใครก็ไม่รู้',
          year: 2018,
          competitionOrVenue: 'Intel ISEF 2018',
          url: 'https://malicious-fake-site.com/sprinkler',
          summary: 'summary',
          difference: 'diff',
        },
      ],
    };

    const view = buildEvaluationView(evaluationWithHallucinatedWork);

    expect(view.priorWork).toHaveLength(1);
    expect(view.priorWork[0].id).toBe('ibraille-isef2025');
    expect(view.priorWork.some((p) => p.id === 'fake-paper-123')).toBe(false);
    expect(view.priorWork.some((p) => p.id === 'sprinkler-polar-isef2018')).toBe(false);
  });

  it('Seam 5: Safety Flag panel formats warnings without blocking proposal access', () => {
    const evaluationWithFlags: Evaluation = {
      ...sampleEvaluation,
      safetyFlags: [
        {
          category: 'biological_agents',
          flagged: true,
          reasonTh: 'ตรวจพบการใช้เชื้อราและแบคทีเรีย',
          advisoryTh: 'ต้องมีครูที่ปรึกษาควบคุมและขออนุมัติคณะกรรมการ SRC',
          requiresPreApproval: true,
          matchedTerms: ['เชื้อรา'],
          blocking: false,
        },
        {
          category: 'hazardous_chemicals',
          flagged: false,
          reasonTh: '',
          advisoryTh: '',
          requiresPreApproval: false,
        },
      ],
    };

    const view = buildEvaluationView(evaluationWithFlags);

    expect(view.hasSafetyFlags).toBe(true);
    expect(view.safetyFlags).toHaveLength(1);
    expect(view.safetyFlags[0].category).toBe('biological_agents');
    expect(view.safetyFlags[0].requiresPreApproval).toBe(true);
    // Non-blocking: student can still proceed to Proposal (AC-7)
    expect(view.canProceedToProposal).toBe(true);
  });

  it('Seam 6: enforces re-evaluation quota gating with polite Thai message', () => {
    const viewWithQuota = buildEvaluationView(sampleEvaluation, { quotaRemaining: 2 });
    expect(viewWithQuota.canReevaluate).toBe(true);
    expect(viewWithQuota.quotaRemaining).toBe(2);
    expect(viewWithQuota.quotaMessageTh).toBeUndefined();

    const viewQuotaExceeded = buildEvaluationView(sampleEvaluation, { quotaRemaining: 0 });
    expect(viewQuotaExceeded.canReevaluate).toBe(false);
    expect(viewQuotaExceeded.quotaRemaining).toBe(0);
    expect(viewQuotaExceeded.quotaMessageTh).toContain('ครบตามโควตา');
  });

  it('Seam 7: extracts red axes for Pivot Workshop triggering', () => {
    const view = buildEvaluationView(sampleEvaluation);
    expect(view.hasRedAxes).toBe(true);
    expect(view.redAxes).toEqual(['impact', 'fit']);

    // Case with no red axes (all green/yellow)
    const allGoodEvaluation: Evaluation = {
      ...sampleEvaluation,
      axes: {
        novelty: { score: 9, badge: 'green', rationale: '', feedback: '' },
        feasibility: { score: 7, badge: 'green', rationale: '', feedback: '' },
        impact: { score: 6, badge: 'yellow', rationale: '', feedback: '' },
        rigor: { score: 8, badge: 'green', rationale: '', feedback: '' },
        fit: { score: 7, badge: 'green', rationale: '', feedback: '' },
      },
    };

    const goodView = buildEvaluationView(allGoodEvaluation);
    expect(goodView.hasRedAxes).toBe(false);
    expect(goodView.redAxes).toEqual([]);
  });
});
