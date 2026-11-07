import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  getWipeGeneration,
  wipeAllLearnerData,
  saveEvaluation,
  savePivot,
  STORAGE_KEY,
} from '@/lib/storage/store';
import {
  readPresentationNotes,
  savePresentationNotes,
} from '@/lib/presentation/notes-store';
import type { Evaluation, Pivot } from '@/types/domain';

describe('Iteration 3 Defects Remediation', () => {
  it('D1: saveEvaluation refuses to resurrect storage after a wipe', () => {
    const storage = createMemoryStorage();
    const generation = getWipeGeneration(storage);

    // Initial wipe in another tab / consent view
    wipeAllLearnerData(storage);
    expect(getWipeGeneration(storage)).not.toBe(generation);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();

    // Late evaluation response arrives
    const evaluation: Evaluation = {
      id: 'eval_probe',
      ideaId: 'privacy-probe-idea',
      overallScore: 7,
      overallBadge: 'green',
      axes: {
        novelty: { score: 7, badge: 'green', rationale: 'ok', feedback: 'ok' },
        feasibility: { score: 7, badge: 'green', rationale: 'ok', feedback: 'ok' },
        impact: { score: 7, badge: 'green', rationale: 'ok', feedback: 'ok' },
        rigor: { score: 7, badge: 'green', rationale: 'ok', feedback: 'ok' },
        fit: { score: 7, badge: 'green', rationale: 'ok', feedback: 'ok' },
      },
      safetyFlags: [],
      priorWork: [],
      evaluatedAt: '2026-11-06T03:00:00Z',
    };

    const saved = saveEvaluation(evaluation, storage, generation);
    expect(saved).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull(); // Still erased!
  });

  it('D1 (Pivot): savePivot refuses to resurrect storage after a wipe', () => {
    const storage = createMemoryStorage();
    const generation = getWipeGeneration(storage);
    wipeAllLearnerData(storage);

    const pivot: Pivot = {
      id: 'pivot_probe',
      originalIdeaId: 'privacy-probe-idea',
      redAxes: ['feasibility'],
      coaching: { tier: 1, tier1Prompt: 'prompt' },
      createdAt: '2026-11-06T03:00:00Z',
    };

    const saved = savePivot(pivot, storage, generation);
    expect(saved).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('D2: savePresentationNotes refuses to resurrect notes after a wipe', () => {
    const storage = createMemoryStorage();
    const notes = {
      role: 'บทบาทที่ลงมือทำจริง',
      skills: 'ทักษะที่ได้ฝึก',
      targetField: 'สาขา',
      results: 'ผลการทดลอง',
      learning: 'สิ่งที่ได้เรียนรู้',
    };

    // Save initially
    expect(savePresentationNotes('proj_01', notes, storage)).toBe(true);
    expect(readPresentationNotes('proj_01', storage)).toEqual(notes);

    // Cross-tab wipe
    const generation = getWipeGeneration(storage);
    wipeAllLearnerData(storage);
    expect(readPresentationNotes('proj_01', storage)).toBeNull();

    // User clicks save in still-mounted editor
    const saved = savePresentationNotes('proj_01', notes, storage, generation);
    expect(saved).toBe(false);

    // Storage must NOT contain any presentation notes!
    expect(readPresentationNotes('proj_01', storage)).toBeNull();
    const allKeys = storage.getAllKeys?.() ?? [];
    expect(allKeys.some((k) => k.includes('presentation'))).toBe(false);
  });

  it('Centralized wipe generation changes on every wipe', () => {
    const storage = createMemoryStorage();
    const initial = getWipeGeneration(storage);

    wipeAllLearnerData(storage);
    const first = getWipeGeneration(storage);
    expect(first).not.toBe(initial);

    wipeAllLearnerData(storage);
    expect(getWipeGeneration(storage)).not.toBe(first);
  });
});
