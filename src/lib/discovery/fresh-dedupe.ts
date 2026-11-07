/**
 * Conservative semantic-repeat screening for fresh starter ideas.
 *
 * Thai has no word spacing, so similarity uses character bigrams after
 * removing generic "template" words (การศึกษา, ผลของ, ต่อ, with, for, ...).
 * Conservative means: only a clearly same idea (very similar title, or similar
 * title AND similar problem) is a repeat. Related angles on one interest are
 * kept: the learner's skip of one card never vetoes a whole subject. This is a
 * heuristic, NOT proof of novelty; Prior Work is evaluated separately.
 */
export interface IdeaText { title: string; problem: string }

const THAI_FILLERS = ['การศึกษา', 'ศึกษา', 'มีผลต่อ', 'ผลของ', 'อย่างไร', 'ภายใน', 'โดยใช้', 'ด้วย', 'ของ', 'ต่อ', 'การ', 'ใน', 'ที่', 'และ', 'ตอน', 'ช่วง'];
const EN_STOP = new Set(['a', 'an', 'the', 'of', 'for', 'with', 'in', 'at', 'on', 'and', 'to', 'by', 'using', 'how', 'does', 'is', 'are']);

function normalize(text: string): string {
  let s = text.normalize('NFKC').toLocaleLowerCase('th');
  s = s.split(/[^\p{L}\p{M}\p{N}]+/u).filter(word => word && !EN_STOP.has(word)).join(' ');
  for (const filler of THAI_FILLERS) s = s.split(filler).join(' ');
  return s.replace(/\s+/g, '');
}
function bigrams(text: string): Set<string> {
  const s = normalize(text), out = new Set<string>();
  if (s.length === 1) out.add(s);
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}
function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return (2 * shared) / (a.size + b.size);
}

export function similarity(a: IdeaText, b: IdeaText): { title: number; problem: number } {
  return { title: dice(bigrams(a.title), bigrams(b.title)), problem: dice(bigrams(a.problem), bigrams(b.problem)) };
}

export function isSemanticRepeat(a: IdeaText, b: IdeaText): boolean {
  const s = similarity(a, b);
  return s.title >= 0.8 || (s.title >= 0.6 && s.problem >= 0.4);
}
