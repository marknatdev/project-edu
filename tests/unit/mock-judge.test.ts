import { describe, expect, it } from 'vitest';
import { reviewJudgeAnswer, selectJudgeQuestions } from '@/lib/judge/practice';
import { readJudgeAnswers, saveJudgeAnswer } from '@/lib/judge/answers';
import { createMemoryStorage, wipeAllLearnerData } from '@/lib/storage/store';
import type { Evaluation } from '@/types/domain';

export const evaluation: Evaluation = {
  id: 'eval-a', ideaId: 'idea-a', overallScore: 5, overallBadge: 'yellow',
  axes: {
    novelty: { score: 6, badge: 'yellow', rationale: '', feedback: '' },
    feasibility: { score: 8, badge: 'green', rationale: '', feedback: '' },
    impact: { score: 5, badge: 'yellow', rationale: '', feedback: '' },
    rigor: { score: 2, badge: 'red', rationale: '', feedback: '' },
    fit: { score: 9, badge: 'green', rationale: '', feedback: '' },
  }, safetyFlags: [], priorWork: [], evaluatedAt: '2026-11-05T00:00:00.000Z',
};

describe('Mock Judge practice', () => {
  it.each(['ysc', 'nsc', 'tcas'] as const)('uses persona-specific questions and stable score order for %s', persona => {
    const tied = structuredClone(evaluation);
    tied.axes.novelty.score = 2;
    tied.axes.novelty.badge = 'green'; // corrupted/stale color must not override the score
    const questions = selectJudgeQuestions({ persona, ideaId: 'idea-a', evaluation: tied });
    expect(questions.map(q => q.axis)).toEqual(['novelty', 'rigor', 'impact']);
    expect(questions.every(q => q.persona === persona && q.targeted)).toBe(true);
    expect(new Set(questions.map(q => q.id)).size).toBe(3);
  });
  it('uses honest general practice for a missing, foreign or all-green Evaluation', () => {
    const green = structuredClone(evaluation);
    for (const axis of Object.values(green.axes)) axis.score = 8;
    for (const current of [undefined, { ...evaluation, ideaId: 'other' }, green]) {
      const result = selectJudgeQuestions({ persona: 'tcas', ideaId: 'idea-a', evaluation: current });
      expect(result.map(q => q.axis)).toEqual(['novelty', 'feasibility', 'impact']);
      expect(result.every(q => !q.targeted)).toBe(true);
    }
  });
  it('keeps saved answers on failed writes and refuses malformed or oversized replacements', () => {
    const storage = createMemoryStorage();
    saveJudgeAnswer('a', 'ysc:rigor', 'ต้นฉบับ', storage);
    const failing = { ...storage, setItem: () => { throw new Error('quota'); } };
    expect(() => saveJudgeAnswer('a', 'ysc:rigor', 'ฉบับแก้', failing)).toThrow('quota');
    expect(() => saveJudgeAnswer('a', 'ysc:rigor', 'x'.repeat(6001), storage)).toThrow();
    expect(() => saveJudgeAnswer('a', '__proto__', 'x', storage)).toThrow();
    expect(readJudgeAnswers('a', storage)['ysc:rigor']).toBe('ต้นฉบับ');
  });

  it('saves answers separately per Project and persona, survives reload, and participates in PDPA erasure', () => {
    const storage = createMemoryStorage();
    saveJudgeAnswer('project-a', 'ysc:rigor', 'ชุดควบคุมของฉัน', storage);
    saveJudgeAnswer('project-a', 'nsc:rigor', 'baseline ของฉัน', storage);
    expect(readJudgeAnswers('project-a', storage)).toEqual({ 'ysc:rigor': 'ชุดควบคุมของฉัน', 'nsc:rigor': 'baseline ของฉัน' });
    expect(readJudgeAnswers('project-b', storage)).toEqual({});
    wipeAllLearnerData(storage);
    expect(readJudgeAnswers('project-a', storage)).toEqual({});
  });
  it('returns axis-specific self-review feedback, not a fabricated correctness score or model answer', () => {
    const question = selectJudgeQuestions({ persona: 'nsc', ideaId: 'idea-a', evaluation })[0];
    expect(() => reviewJudgeAnswer(question, '   ')).toThrow('คำตอบ');
    expect(reviewJudgeAnswer(question, 'จะแยกชุดทดสอบออกจากชุดฝึก')).toEqual({
      source: 'rubric',
      message: 'นี่คือกรอบทบทวนด้วยตนเอง ไม่ใช่การตรวจความถูกต้องของคำตอบหรือคะแนนกรรมการ',
      checklist: ['ระบุสิ่งที่เปรียบเทียบและ baseline/ชุดควบคุม', 'ระบุ metric/หน่วย วิธีวัดซ้ำ และการป้องกันข้อมูลรั่วหรือตัวแปรแทรกซ้อน', 'บอกข้อจำกัดและหลักฐานที่ยังต้องเก็บ'],
      followUp: question.prompt,
    });
  });
  it('targets red axes before yellow axes and skips green axes for this Idea', () => {
    const questions = selectJudgeQuestions({ persona: 'ysc', ideaId: 'idea-a', evaluation });
    expect(questions.map(q => q.axis)).toEqual(['rigor', 'impact', 'novelty']);
    expect(questions[0].prompt).toContain('ชุดควบคุม');
  });
});
