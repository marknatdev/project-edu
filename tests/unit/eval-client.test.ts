import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchEvaluation,
  fetchPivot,
  generateOfflineEvaluation,
  generateOfflinePivotCoaching,
} from '@/lib/evaluation/eval-client';
import type { Idea } from '@/types/domain';

describe('Evaluation & Pivot Client (ADR 0001 & ADR 0002)', () => {
  const sampleIdea: Idea = {
    id: 'idea_eval_01',
    learnerId: 'learner_123',
    title: 'ไบโอพลาสติกจากเปลือกทุเรียนเสริมใยสับปะรด',
    description: 'พัฒนาและทดสอบความแข็งแรงของฟิล์มไบโอพลาสติกย่อยสลายได้ทางชีวภาพเพื่อลดขยะบรรจุภัณฑ์',
    goal: 'ysc',
    gradeLevel: 'm_plai',
    source: 'discovery_track',
    createdAt: '2026-11-05T10:00:00.000Z',
    updatedAt: '2026-11-05T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates deterministic offline evaluation when offline', () => {
    const offlineEval = generateOfflineEvaluation(sampleIdea);
    expect(offlineEval.ideaId).toBe(sampleIdea.id);
    expect(offlineEval.overallScore).toBeGreaterThanOrEqual(1);
    expect(offlineEval.overallScore).toBeLessThanOrEqual(10);
    expect(offlineEval.axes.novelty.score).toBe(7);
    expect(offlineEval.axes.rigor.score).toBe(6);
    expect(offlineEval.priorWork.length).toBeGreaterThan(0);
  });

  it('generates deterministic offline pivot coaching for red axes', () => {
    const coaching = generateOfflinePivotCoaching('feasibility', 3);
    expect(coaching.tier).toBe(3);
    expect(coaching.tier1Prompt).toContain('เมื่อพิจารณาด้านความเป็นไปได้');
    expect(coaching.tier2Lenses?.length).toBeGreaterThanOrEqual(1);
    expect(coaching.tier3Examples?.length).toBeGreaterThanOrEqual(2);
  });

  it('fetchEvaluation returns evaluation data on 200 OK', async () => {
    const mockEval = generateOfflineEvaluation(sampleIdea);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        source: 'ai',
        evaluation: mockEval,
        quota: { used: 1, limit: 5, remaining: 4, resetAt: '2026-11-06T00:00:00.000Z' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchEvaluation({
      anonymousId: 'anon-1',
      idea: sampleIdea,
    });

    expect(result.success).toBe(true);
    expect(result.evaluation?.id).toBe(mockEval.id);
    expect(result.quota?.remaining).toBe(4);
  });

  it('fetchEvaluation gracefully handles 429 quota exhaustion', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Quota exceeded',
        messageTh: 'วันนี้คุณประเมินโครงงานครบตามโควตา 5 ครั้งแล้ว',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchEvaluation({
      anonymousId: 'anon-1',
      idea: sampleIdea,
    });

    expect(result.success).toBe(false);
    expect(result.quotaExceeded).toBe(true);
    expect(result.error).toContain('ครบตามโควตา 5 ครั้งแล้ว');
    expect(result.quota?.remaining).toBe(0);
  });

  it('fetchEvaluation falls back to deterministic evaluation on network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network offline'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchEvaluation({
      anonymousId: 'anon-1',
      idea: sampleIdea,
    });

    expect(result.success).toBe(true);
    expect(result.source).toBe('fallback');
    expect(result.evaluation?.ideaId).toBe(sampleIdea.id);
  });

  it('fetchPivot falls back gracefully on network failure or 429', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchPivot({
      anonymousId: 'anon-1',
      idea: sampleIdea,
      redAxes: ['novelty'],
      tier: 2,
    });

    expect(result.success).toBe(true);
    expect(result.source).toBe('fallback');
    expect(result.coaching?.tier).toBe(2);
    expect(result.coaching?.tier2Lenses?.length).toBeGreaterThan(0);
  });
});
