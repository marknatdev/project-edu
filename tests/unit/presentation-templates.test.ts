import { describe, expect, it } from 'vitest';
import { assemblePresentationTemplates } from '@/lib/presentation/templates';
import { readPresentationNotes, savePresentationNotes } from '@/lib/presentation/notes-store';
import { createMemoryStorage, createProject, deleteProject, getProject, wipeAllLearnerData } from '@/lib/storage/store';
import { readJudgeAnswers, saveJudgeAnswer } from '@/lib/judge/answers';
import { beginAdvisorReview, readAdvisorReview } from '@/lib/advisor-review/review-store';
import { exportFixture } from '../fixtures/export';

describe('student-content presentation templates', () => {
  it('deletes the Project’s notes, practice answers and advisor request without deleting another Project’s records', async () => {
    const storage = createMemoryStorage();
    for (const id of ['a', 'b']) {
      createProject({ id, ...exportFixture }, storage);
      savePresentationNotes(id, { role: id, skills: '', learning: '', targetField: '', results: '' }, storage);
      saveJudgeAnswer(id, 'ysc:rigor', id, storage);
      await beginAdvisorReview(id, storage);
    }
    expect(deleteProject('a', storage)).toBe(true);
    expect(getProject('a', storage)).toBeNull();
    expect(readPresentationNotes('a', storage)).toBeNull();
    expect(readJudgeAnswers('a', storage)).toEqual({});
    expect(readAdvisorReview('a', storage)).toBeNull();
    expect(readPresentationNotes('b', storage)?.role).toBe('b');
    expect(readJudgeAnswers('b', storage)).toEqual({ 'ysc:rigor': 'b' });
    expect(readAdvisorReview('b', storage)).not.toBeNull();
  });
  it('persists learner reflections per Project, never loses other work, and erases them with PDPA wipe', () => {
    const storage = createMemoryStorage();
    const notes = { role: 'ออกแบบ', skills: '', learning: '', targetField: '', results: '' };
    savePresentationNotes('a', notes, storage);
    expect(readPresentationNotes('a', storage)).toEqual(notes);
    expect(readPresentationNotes('b', storage)).toBeNull();
    expect(() => savePresentationNotes('a', { ...notes, role: 'x'.repeat(1501) }, storage)).toThrow();
    expect(readPresentationNotes('a', storage)?.role).toBe('ออกแบบ');
    wipeAllLearnerData(storage);
    expect(readPresentationNotes('a', storage)).toBeNull();
  });
  it('uses only explicit student-authored role, skills, learning and results, keeping empty fields honest', () => {
    const templates = assemblePresentationTemplates({ ...exportFixture, presentationNotes: {
      role: 'ฉันออกแบบมุมแผง', skills: 'วิเคราะห์ข้อมูล', learning: 'เมฆทำให้ค่าผันผวน',
      targetField: 'พลังงาน', results: 'ยังทดสอบเพียงหนึ่งวัน ไม่สรุปผล',
    } });
    const portfolio = templates.portfolio.sections.map(s => s.text).join('\n');
    expect(portfolio).toContain('ฉันออกแบบมุมแผง');
    expect(portfolio).toContain('วิเคราะห์ข้อมูล');
    expect(portfolio).toContain('เมฆทำให้ค่าผันผวน');
    expect(templates.abstract.text).toContain('ยังทดสอบเพียงหนึ่งวัน ไม่สรุปผล');
    expect(templates.pitch[2].text).toContain('เมฆทำให้ค่าผันผวน');
    expect(templates.abstract.wordCount).toBeLessThanOrEqual(250);
  });
  it('bounds the abstract to 250 segmented Thai/English words and makes excerpting explicit', () => {
    const input = structuredClone(exportFixture);
    input.proposal.problemStatement = 'problem '.repeat(350);
    input.proposal.methodology = 'measure '.repeat(350);
    const output = assemblePresentationTemplates(input);
    const independentEnglishWords = output.abstract.text.match(/\b(?:problem|measure)\b/g) ?? [];
    expect(independentEnglishWords.length).toBeLessThanOrEqual(250);
    expect(output.abstract.wordCount).toBeLessThanOrEqual(250);
    expect(output.abstract.truncated).toBe(true);
    expect(output.abstract.text).toContain('ยังไม่ได้ระบุผลการทดลอง');
    expect(output.portfolio.sections[0].text.length).toBeLessThanOrEqual(321);
    const thai = structuredClone(exportFixture);
    thai.proposal.methodology = 'ทดลองวัดกำลังไฟและเปรียบเทียบผล'.repeat(500);
    const template = assemblePresentationTemplates(thai);
    expect(template.abstract.wordCount).toBeLessThanOrEqual(250);
    expect(template.abstract.truncated).toBe(true);
  });
  it('assembles TCAS and timed pitch from the saved Project without inventing achievements, roles or results', () => {
    const before = structuredClone(exportFixture);
    const result = assemblePresentationTemplates(exportFixture);
    expect(result.portfolio.title).toBe('พลังงานแสงอาทิตย์');
    expect(result.portfolio.sections[0]).toEqual({ heading: 'ปัญหาที่สนใจ', text: 'ชุมชนต้องการลดค่าไฟ' });
    expect(result.portfolio.sections.find(s => s.heading === 'บทบาท / ทักษะ / สาขาที่สนใจ')?.text).toContain('เติมด้วยตนเอง');
    expect(result.abstract.text).toContain('วัดกำลังไฟวันละ 3 ครั้ง');
    expect(result.abstract.text).toContain('ยังไม่ได้ระบุผลการทดลอง');
    expect(result.pitch.map(p => [p.startSeconds, p.endSeconds])).toEqual([[0, 30], [30, 105], [105, 180]]);
    expect(result.pitch[0].text).toContain('ชุมชนต้องการลดค่าไฟ');
    expect(JSON.stringify(result)).not.toContain('ตารางกำลังไฟ'); // planned deliverable is NOT an achieved result
    expect(exportFixture).toEqual(before);
  });
});
