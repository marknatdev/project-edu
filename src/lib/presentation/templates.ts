import type { ExportInput } from '@/lib/export/snapshot';
import { PresentationNotesSchema } from './notes';

const missing = '(ยังไม่ได้ระบุ — เติมด้วยตนเอง)';
const content = (text: string) => text.trim() || missing;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function countTemplateWords(text: string): number {
  return Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(text)).filter(s => s.isWordLike).length;
}

function excerpt(text: string, maxWords: number, maxChars = 6000): string {
  const source = text.trim();
  let words = 0;
  let end = 0;
  for (const segment of new Intl.Segmenter('th', { granularity: 'word' }).segment(source)) {
    if ((segment.isWordLike && ++words > maxWords) || segment.index + segment.segment.length > maxChars) break;
    end = segment.index + segment.segment.length;
  }
  return end < source.length ? `${source.slice(0, end).trimEnd()}…` : source;
}

/** Reorders learner-authored content only. No invented methods, results, skills or citations. */
export function assemblePresentationTemplates(input: Pick<ExportInput, 'title' | 'proposal' | 'presentationNotes'>) {
  const p = input.proposal;
  const notes = input.presentationNotes ? PresentationNotesSchema.parse(input.presentationNotes) : null;
  const role = notes && [notes.role, notes.skills, notes.targetField].filter(t => t.trim()).join(' • ');
  const learning = notes && [notes.results, notes.learning].filter(t => t.trim()).join(' • ');
  const title = p.title.trim() || input.title.trim() || 'โครงงานของฉัน';
  const measure = p.variables.dependent.filter(t => t.trim()).join(', ');
  const controls = p.variables.controlled.filter(t => t.trim()).join(', ');
  const objectives = p.objectives.filter(t => t.trim()).join('; ');
  const sections = [
    { heading: 'ปัญหาที่สนใจ', text: content(p.problemStatement) },
    { heading: 'เป้าหมายของโครงงาน', text: content(objectives) },
    { heading: 'กระบวนการที่วางแผน', text: content(p.methodology) },
    { heading: 'การวัดผล', text: content(measure) },
    { heading: 'บทบาท / ทักษะ / สาขาที่สนใจ', text: role || '(ยังไม่ได้ระบุ — เติมด้วยตนเองจากสิ่งที่ลงมือทำจริง พร้อมหลักฐาน)' },
    { heading: 'ผลลัพธ์ / สิ่งที่เรียนรู้', text: learning || '(ยังไม่ได้ระบุผลการทดลอง — เติมผลจริงและข้อจำกัดด้วยตนเอง ไม่ใช้แผนงานแทนผลสำเร็จ)' },
  ].map(section => ({ ...section, text: excerpt(section.text, 45, 320) }));
  const abstractFields = [
    ['ปัญหา', content(p.problemStatement), 45], ['วัตถุประสงค์', content(objectives), 35],
    ['สมมติฐาน (ยังไม่ใช่ผล)', content(p.hypothesis), 30], ['วิธีทำที่วางแผน', content(p.methodology), 70],
    ['สิ่งที่จะวัด', content(measure), 25], ['ผลลัพธ์ที่ผู้เรียนระบุ (ยังไม่ตรวจสอบ)', notes?.results.trim() || 'ยังไม่ได้ระบุผลการทดลอง', 35],
  ] as const;
  const body = abstractFields.map(([label, value, budget]) => `${label}: ${excerpt(value, budget, 1800)}`).join('\n');
  const resultNote = notes?.results.trim() ? 'ผลลัพธ์ข้างต้นเป็นข้อมูลจากผู้เรียน ยังไม่ตรวจสอบอิสระ' : 'ผลลัพธ์: ยังไม่ได้ระบุผลการทดลอง';
  const text = `${excerpt(body, 250 - countTemplateWords(resultNote))}\n${resultNote}`;
  const truncated = abstractFields.some(([, value, budget]) => excerpt(value, budget, 1800) !== value) || countTemplateWords(body) > 250 - countTemplateWords(resultNote);
  return {
    portfolio: { title: excerpt(title, 25, 120), sections },
    abstract: { text, wordCount: countTemplateWords(text), truncated },
    pitch: [
      { startSeconds: 0, endSeconds: 30, heading: 'ปัญหา & เป้าหมาย', text: `${content(p.problemStatement)}\nเป้าหมาย: ${content(objectives)}` },
      { startSeconds: 30, endSeconds: 105, heading: 'วิธีทำ & วิธีวัด', text: `${content(p.methodology)}\nสิ่งที่จะวัด: ${content(measure)}\nตัวแปรควบคุม: ${content(controls)}` },
      { startSeconds: 105, endSeconds: 180, heading: 'หลักฐาน ข้อจำกัด & ขั้นต่อไป', text: `${learning || 'เติมผลจริง ข้อจำกัด และขั้นต่อไปด้วยตนเอง'}\nบทบาท / ทักษะ: ${role || missing}\nข้อมูลนี้ผู้เรียนระบุเอง หากยังไม่ได้ทดลองให้บอกว่าเป็นแผน ห้ามอ้างว่าได้ผลแล้ว` },
    ].map(part => ({ ...part, range: `${clock(part.startSeconds)}–${clock(part.endSeconds)}` })),
  };
}
export type PresentationTemplates = ReturnType<typeof assemblePresentationTemplates>;
