import { describe, it, expect } from 'vitest';
import { nextInterestQuestion, interestSummaryDraft, type InterestAnswer } from '@/lib/discovery/interest-interview';

const known = { gradeLevel: 'm_plai' as const, goal: 'classroom' as const };
const answer = (question: string, text: string): InterestAnswer => ({ question, answer: text });

function ask(answers: InterestAnswer[]) {
  const step = nextInterestQuestion(answers, known);
  if (step.done) throw new Error('expected another question');
  return step.question;
}

describe('adaptive interest interview (D1)', () => {
  it('opens with one interest question whose choices include "ยังไม่รู้", then follows up on the answer', () => {
    const first = ask([]);
    expect(first.text).toMatch(/อยาก|สนใจ|สงสัย/);
    expect(first.choices).toContain('ยังไม่รู้');
    const second = ask([answer(first.text, 'ตู้ปลาที่บ้าน')]);
    expect(second.text).toContain('ตู้ปลาที่บ้าน');
    expect(second.choices).toContain('ยังคิดไม่ออก');
  });

  it('answers "ยังไม่รู้" with a guiding near-life question instead of picking a catalog subject, and keeps asking', () => {
    const first = ask([]);
    const guide = ask([answer(first.text, 'ยังไม่รู้')]);
    expect(guide.text).toMatch(/ไม่เป็นไร|ใกล้ตัว/);
    expect(guide.choices.length).toBeGreaterThanOrEqual(3);
    // Not the catalog subject names (วิทยาศาสตร์ / คอมพิวเตอร์ / คณิตศาสตร์) as a silent default.
    expect(guide.choices.join(' ')).not.toMatch(/^(วิทยาศาสตร์|คณิตศาสตร์)$/);
    const third = ask([answer(first.text, 'ยังไม่รู้'), answer(guide.text, 'น้ำที่ใช้ทุกวัน')]);
    expect(third.text).toContain('น้ำที่ใช้ทุกวัน');
  });

  it('finishes after 2 confident answers, after 3 when the last is confident, and always by 4', () => {
    const q1 = ask([]).text;
    const two = [answer(q1, 'ตู้ปลา'), answer('q2', 'น้ำขุ่นเร็ว')];
    expect(nextInterestQuestion(two, known).done).toBe(true);
    const unsure = [answer(q1, 'ยังไม่รู้'), answer('q2', 'น้ำที่ใช้ทุกวัน')];
    expect(nextInterestQuestion(unsure, known).done).toBe(false);
    expect(nextInterestQuestion([...unsure, answer('q3', 'อยากลดการใช้น้ำ')], known).done).toBe(true);
    const stuck = [answer(q1, 'ยังไม่รู้'), answer('q2', 'ยังไม่แน่ใจ'), answer('q3', 'ยังคิดไม่ออก')];
    expect(nextInterestQuestion(stuck, known).done).toBe(false);
    expect(nextInterestQuestion([...stuck, answer('q4', 'ยังไม่รู้')], known).done).toBe(true);
  });

  it('never asks for already-known constraints or identifying details in any path', () => {
    const paths = [['ตู้ปลา', 'ยังคิดไม่ออก', 'ยังคิดไม่ออก'], ['ยังไม่รู้', 'ยังไม่แน่ใจ', 'ยังคิดไม่ออก'], ['ยังไม่รู้', 'แอปที่ใช้จัดการงาน', 'ยังคิดไม่ออก']];
    for (const path of paths) {
      const answers: InterestAnswer[] = [];
      for (const text of path) {
        const step = nextInterestQuestion(answers, known);
        if (step.done) break;
        expect(step.question.text).not.toMatch(/งบ|บาท|สัปดาห์|ระยะเวลา|อุปกรณ์|สมาชิก|ทีม|ทักษะ|ระดับชั้น|ชื่อ|โรงเรียน/);
        answers.push(answer(step.question.text, text));
      }
    }
  });

  it('drafts an editable summary from what the learner said', () => {
    expect(interestSummaryDraft([answer('a', 'ตู้ปลา'), answer('b', ' น้ำขุ่นเร็ว ')])).toBe('ตู้ปลา · น้ำขุ่นเร็ว');
  });
});
