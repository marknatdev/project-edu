import { assembleProposal, verifyProposalProvenance } from '@/lib/proposal/assemble';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ai/evaluate/route';
import { generateOfflineEvaluation } from '@/lib/evaluation/eval-client';
import { createMemoryStorage, getIdea, saveIdea } from '@/lib/storage/store';
import type { Idea } from '@/types/domain';
import { createIsolator } from '@/lib/variables/presets';
import { checkRigor } from '@/lib/variables/rigor';

export const sampleIdea: Idea = {
  id: 'isolator-idea', learnerId: 'guest', title: 'วัสดุหุ้มแก้ว', description: 'เปรียบเทียบอุณหภูมิ',
  source: 'idea_track', gradeLevel: 'm_ton', goal: 'classroom',
  createdAt: '2026-11-05T00:00:00.000Z', updatedAt: '2026-11-05T00:00:00.000Z',
};

const science = {
  preset: 'science' as const,
  independent: 'วัสดุหุ้ม', dependent: 'อุณหภูมิ', controlled: ['ปริมาณน้ำ'],
  controlGroup: 'ไม่หุ้มวัสดุ', unit: '°C', replicates: 3,
};

describe('Variable & Control Isolator rigor check', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('keeps the deterministic rigor evidence authoritative even when configured AI suggests a perfect score', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://ai.example.test/v1');
    vi.stubEnv('AI_API_KEY', 'test-only');
    vi.stubEnv('AI_MODEL', 'test-only');
    const axis = { score: 10, rationale: 'คำแนะนำ', feedback: 'ทบทวนกับครู' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ axes: { novelty: axis, feasibility: axis, impact: axis, rigor: axis, fit: axis } }) } }] }) }));
    const response = await POST(new Request('http://localhost/api/ai/evaluate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: { ...sampleIdea, isolator: { ...science, controlGroup: '', unit: '', replicates: 0 } } }),
    }));
    const body = await response.json();
    expect(body.source).toBe('ai');
    expect(body.evaluation.axes.rigor).toMatchObject({ score: 1, badge: 'red' });
    expect(body.evaluation.axes.impact.score).toBe(10);
  });

  it('copies computing learner inputs into a fresh Proposal but preserves edited Proposal variables', () => {
    const idea: Idea = { ...sampleIdea, isolator: { preset: 'computing', input: 'ภาพวัสดุ', output: 'ชนิดวัสดุ', baseline: 'วิธีเดิม', metric: 'F1-score', dataSplit: '70/15/15 ไม่ซ้ำ', unit: 'F1-score (0–1)', replicates: 3 } };
    const proposal = assembleProposal({ idea });
    expect(proposal.variables).toEqual({ independent: ['ภาพวัสดุ'], dependent: ['ชนิดวัสดุ'], controlled: [] });
    expect(generateOfflineEvaluation(idea).axes.rigor.score).toBe(7);
    expect(verifyProposalProvenance(proposal, { idea }).valid).toBe(true);
    const edited = { ...proposal, variables: { independent: ['ฉบับแก้ไขเอง'], dependent: [], controlled: [] } };
    expect(assembleProposal({ idea, existingProposal: edited, preserveEdits: true }).variables).toEqual(edited.variables);
    expect(checkRigor({ ...science, unit: ' ', customUnitConfirmed: true }).passed).toBe(false);
  });

  it('carries the latest saved science design into a new Proposal, not superseded Variables Lite copies', () => {
    const storage = createMemoryStorage();
    saveIdea({ ...sampleIdea, isolator: science, variables: { independent: 'เก่า', dependent: 'เก่า', controlled: ['เก่า'], controlGroup: 'เก่า', replicates: 1 } }, storage);
    const sources = { idea: getIdea(sampleIdea.id, storage), studentAnswers: { independentVar: 'เก่า' } };
    const proposal = assembleProposal(sources);
    expect(proposal.variables).toEqual({ independent: ['วัสดุหุ้ม'], dependent: ['อุณหภูมิ'], controlled: ['ปริมาณน้ำ'] });
    expect(verifyProposalProvenance(proposal, sources).valid).toBe(true);
  });

  it('reuses only learner-provided science fields and never invents a computing design', () => {
    const variables = { independent: science.independent, dependent: science.dependent, controlled: science.controlled, controlGroup: science.controlGroup, replicates: 3 };
    expect(createIsolator({ ...sampleIdea, variables }, 'science')).toEqual({ ...science, unit: '' });
    const computing = createIsolator(sampleIdea, 'computing');
    expect(computing).toEqual({ preset: 'computing', input: '', output: '', baseline: '', metric: '', unit: '', dataSplit: '', replicates: 0 });
    expect(checkRigor({ ...computing, baseline: 'วิธีเดิม', unit: 'F1-score (0–1)', replicates: 3 }).passed).toBe(true);
    expect(createIsolator({ ...sampleIdea, isolator: science }, 'science')).toEqual(science);
  });

  it('does not rate an otherwise blank design green merely because three checklist fields are filled', () => {
    const blank = { ...createIsolator(sampleIdea, 'computing'), baseline: 'วิธีเดิม', unit: '%', replicates: 3 };
    const result = generateOfflineEvaluation({ ...sampleIdea, isolator: blank });
    expect(result.axes.rigor.score).toBe(5);
    expect(result.axes.rigor.feedback).toContain('Input');
  });

  it('uses the saved rigor evidence through the Evaluation HTTP boundary with AI unconfigured', async () => {
    vi.stubEnv('AI_API_KEY', '');
    const response = await POST(new Request('http://localhost/api/ai/evaluate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: { ...sampleIdea, isolator: science } }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.source).toBe('fallback');
    expect(body.evaluation.axes.rigor).toMatchObject({ score: 7, badge: 'green' });
  });
  it('feeds saved designs into Evaluation rigor while other axes stay unchanged offline', () => {
    const complete = generateOfflineEvaluation({ ...sampleIdea, isolator: science });
    const incomplete = generateOfflineEvaluation({ ...sampleIdea, isolator: { ...science, controlGroup: '', unit: '', replicates: 0 } });
    expect(complete.axes.rigor).toMatchObject({ score: 7, badge: 'green' });
    expect(incomplete.axes.rigor).toMatchObject({ score: 1, badge: 'red' });
    expect(incomplete.axes.rigor.feedback).toContain('ชุดควบคุม');
    expect(complete.axes.novelty).toEqual(incomplete.axes.novelty);
    expect(complete.overallScore).toBeGreaterThan(incomplete.overallScore);
  });
  it('resumes a computing design and checklist on the same Idea in Guest Mode, including incomplete drafts', () => {
    const storage = createMemoryStorage();
    const isolator = {
      preset: 'computing' as const, input: 'ภาพวัสดุ', output: 'ชนิดวัสดุ', baseline: '',
      metric: 'F1-score', unit: 'F1-score (0–1)', dataSplit: 'train 70 / validation 15 / test 15 ไม่ซ้ำกัน', replicates: 0,
    };
    saveIdea({ ...sampleIdea, isolator, safetyChecklist: ['human-consent'] }, storage);
    expect(getIdea(sampleIdea.id, storage)).toMatchObject({ isolator, safetyChecklist: ['human-consent'] });
    saveIdea({ ...sampleIdea, id: 'legacy' }, storage);
    expect(getIdea('legacy', storage)?.isolator).toBeUndefined();
  });
  it.each(['Ω', 'Hz', 'lux', 'mg/L'])('accepts the learner’s explicitly quantitative custom unit %s without inventing a scale', (unit) => {
    const isolator = { ...science, unit, customUnitConfirmed: true };
    expect(checkRigor(isolator).passed).toBe(true);
    const storage = createMemoryStorage();
    saveIdea({ ...sampleIdea, isolator }, storage);
    expect(getIdea(sampleIdea.id, storage)?.isolator).toMatchObject({ unit, customUnitConfirmed: true });
  });

  it.each(['', '  ', 'ดีมาก', 'ไม่ทราบ', 'สีสวย'])('does not count "%s" as a quantitative unit', (unit) => {
    expect(checkRigor({ ...science, unit }).checks.find((check) => check.id === 'unit')?.passed).toBe(false);
  });

  it.each([0, 1, 2, 2.9, 3.5, NaN, Infinity])('does not count n=%s as at least three independent repeats', (replicates) => {
    expect(checkRigor({ ...science, replicates }).passed).toBe(false);
  });

  it('reports missing comparison with a Thai coaching hint without blocking', () => {
    const result = checkRigor({ ...science, controlGroup: '  ' });
    expect(result.passed).toBe(false);
    expect(result.checks[0].hintTh).toContain('ชุดควบคุม');
    expect(checkRigor().checks.map((check) => check.passed)).toEqual([false, false, false]);
  });

  it('recognizes a science design with comparison, quantitative unit and three repeats', () => {
    const result = checkRigor(science);
    expect(result.passed).toBe(true);
    expect(result.checks.map((check) => [check.id, check.passed])).toEqual([
      ['comparison', true], ['unit', true], ['replicates', true],
    ]);
  });
});
