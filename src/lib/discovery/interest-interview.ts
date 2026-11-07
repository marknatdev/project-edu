/**
 * Adaptive interest interview for Discovery (client-safe, deterministic).
 * Asks 2–4 short Thai questions, one at a time, about what the learner wants
 * to work on. It never asks for constraints already captured by the main
 * Interview (grade, goal, budget, time, equipment, team, skills) and never for
 * a real name or school. “ยังไม่รู้” is a valid answer: the next question guides
 * toward near-life interests instead of silently picking a catalog subject.
 * These are scripted guide questions, not AI output.
 */
import type { Goal, GradeLevel } from '@/types/domain';

export interface InterestAnswer { question: string; answer: string }
export interface InterestQuestion { text: string; choices: string[] }
export type InterestStep = { done: false; question: InterestQuestion } | { done: true };
export interface KnownLearnerContext { gradeLevel?: GradeLevel; goal?: Goal }

export const MAX_INTEREST_QUESTIONS = 4;
const UNCERTAIN = /ยังไม่รู้|ยังคิดไม่ออก|ไม่แน่ใจ|ไม่รู้/;
export const isUncertainAnswer = (text: string) => UNCERTAIN.test(text);

const OPENING: InterestQuestion = {
  text: 'ช่วงนี้มีเรื่องอะไรที่เธออยากลองทำหรือสงสัยเป็นพิเศษ?',
  choices: ['สิ่งแวดล้อมรอบตัว', 'พืชและการปลูก', 'คอมพิวเตอร์และข้อมูล', 'ยังไม่รู้'],
};

function followUp(first: string): InterestQuestion {
  const choices = /พืช|ปลูก|ต้นไม้/.test(first) ? ['ต้นไม้แห้งเร็ว', 'แสงไม่เท่ากัน', 'ยังคิดไม่ออก']
    : /คอม|ข้อมูล|แอป|เกม|โค้ด/.test(first) ? ['มองไม่เห็นงานที่ค้าง', 'ข้อมูลอ่านยาก', 'ยังคิดไม่ออก']
    : ['อยากลดการใช้น้ำ', 'อยากลดขยะ', 'ยังคิดไม่ออก'];
  return { text: `จากเรื่อง “${first}” มีปัญหาหรือสิ่งที่เธออยากเข้าใจให้มากขึ้นตรงไหน?`, choices };
}

const GUIDE: InterestQuestion = {
  text: 'ไม่เป็นไรเลย ลองเริ่มจากสิ่งใกล้ตัว เรื่องไหนที่เธออยากสังเกตดู?',
  choices: ['น้ำที่ใช้ทุกวัน', 'ต้นไม้ริมหน้าต่าง', 'แอปที่ใช้จัดการงาน', 'ยังไม่แน่ใจ'],
};
const GUIDE_AGAIN: InterestQuestion = {
  text: 'ลองนึกถึงวันธรรมดาของเธอ มีอะไรที่ทำให้รำคาญใจ หรืออยากให้ง่ายขึ้นบ้าง?',
  choices: ['ของในบ้านเสียหรือสิ้นเปลือง', 'อากาศร้อนหรือฝุ่น', 'การจดจำหรือจัดตารางงาน', 'ยังคิดไม่ออก'],
};

function deepen(previous: string): InterestQuestion {
  return { text: `ถ้าเริ่มจาก “${previous}” เธออยากสังเกตความแตกต่างหรือช่วยแก้ปัญหาส่วนไหน?`,
    choices: ['เปรียบเทียบสิ่งที่วัดได้', 'ลองออกแบบเครื่องมือช่วย', 'ยังคิดไม่ออก'] };
}
const LAST: InterestQuestion = {
  text: 'ลองเลือกวิธีเริ่มเล็ก ๆ ที่อยากทำที่สุดก็พอ ยังเปลี่ยนใจได้ภายหลัง',
  choices: ['วัดและบันทึกด้วยของที่มี', 'ทำแบบจำลองบนคอมพิวเตอร์', 'ลองทั้งสองแบบ', 'ยังไม่รู้'],
};

/** Done after 2 confident answers, after 3 when the last is confident, always by 4. */
export function isInterviewComplete(answers: InterestAnswer[]): boolean {
  const n = answers.length;
  if (n >= MAX_INTEREST_QUESTIONS) return true;
  if (n === 2) return !answers.some(a => isUncertainAnswer(a.answer));
  if (n === 3) return !isUncertainAnswer(answers[2].answer);
  return false;
}

export function nextInterestQuestion(answers: InterestAnswer[], _known: KnownLearnerContext = {}): InterestStep {
  void _known; // Known constraints are reused by the generator, never asked again here.
  if (isInterviewComplete(answers)) return { done: true };
  const n = answers.length;
  if (n === 0) return { done: false, question: OPENING };
  const last = answers[n - 1].answer.trim();
  const confident = [...answers].reverse().find(a => !isUncertainAnswer(a.answer))?.answer.trim();
  if (n === 1) return { done: false, question: isUncertainAnswer(last) ? GUIDE : followUp(last) };
  if (n === 2) {
    if (!confident) return { done: false, question: GUIDE_AGAIN };
    return { done: false, question: isUncertainAnswer(last) ? followUp(confident) : deepen(last) };
  }
  return { done: false, question: confident ? { ...LAST, text: `จากเรื่อง “${confident}” ${LAST.text}` } : LAST };
}

export function interestSummaryDraft(answers: InterestAnswer[]): string {
  return answers.map(a => a.answer.trim()).filter(Boolean).join(' · ');
}
