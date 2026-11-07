/**
 * ADR 0004 chat-mode helpers: pure and deterministic so the server can enforce
 * the research rule (curated prior work only) independently of the model.
 */
import { PRIOR_WORK } from '@/data/prior-work';
import type { CoachMode, ResolvedCoachMode } from '@/lib/advisor/coach-contract';

const RESEARCH = /ค้น|อ้างอิง|งานวิจัย|เคยทำ|มีใคร|แหล่ง|บทความ|อ่านเพิ่ม|คล้าย|prior|paper|research/i;
const IDEATE = /ไอเดีย|คิดไม่ออก|ช่วยคิด|เสนอ|ตัวอย่าง|แนวทาง|ทำอะไรดี|ระดมความคิด|idea/i;

/** shortcut: keyword classifier for `auto`; switch to an AI pick if learners report wrong modes. */
export function resolveMode(mode: CoachMode | undefined, message: string | undefined): ResolvedCoachMode {
  if (mode && mode !== 'auto') return mode;
  const text = message ?? '';
  if (RESEARCH.test(text)) return 'research';
  if (IDEATE.test(text)) return 'ideate';
  return 'ask';
}

/** Removes anything link-like from model output: research links come only from PRIOR_WORK by id. */
export function stripLinks(text: string): string {
  return text.replace(/\bhttps?:\/\/\S+|\bwww\.\S+|\b[\w-]+\.(?:com|org|net|edu|ac\.th|or\.th|go\.th|co\.th|in\.th)(?:\/\S*)?/gi, '').replace(/[ \t]{2,}/g, ' ').trim();
}

const tokens = (text: string) => text.toLowerCase().split(/[\s,.;:()\[\]"'“”]+/).filter(t => t.length >= 2);

/** Up to `limit` curated prior-work ids ranked by keyword/title overlap with the learner's topic. */
export function matchPriorWork(input: { text: string; subfieldId?: string }, limit = 3): string[] {
  const hay = input.text.toLowerCase();
  const words = new Set(tokens(input.text));
  const scored = PRIOR_WORK.map(work => {
    let score = 0;
    for (const k of work.keywords) if (hay.includes(k.toLowerCase())) score += 3;
    for (const w of tokens(work.title)) if (words.has(w)) score += 1;
    if (input.subfieldId && work.subfieldIds.includes(input.subfieldId)) score += 2;
    return { id: work.id, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.id);
}

export const MODE_LABEL_TH: Record<ResolvedCoachMode, string> = { ask: 'ถาม', research: 'ค้นคว้า', ideate: 'คิดไอเดีย' };
