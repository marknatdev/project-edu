import { describe, expect, it } from 'vitest';
import { buildSafetyChecklist } from '@/lib/safety/checklist';
import { screenIdea } from '@/lib/safety/screener';

// Family names grounded in RESEARCH.md §8.2 and §10, not the prototype's form numbers.
describe('Safety Flag → non-blocking Safety & IRB checklist', () => {
  it('includes risks that appear only in the learner’s saved isolator, not just the Idea description', () => {
    const flags = screenIdea({
      id: 'risk-in-design', learnerId: 'guest', title: 'เปรียบเทียบวัสดุ', description: 'วัดผล',
      source: 'idea_track', gradeLevel: 'm_ton', goal: 'ysc',
      createdAt: '2026-11-05T00:00:00.000Z', updatedAt: '2026-11-05T00:00:00.000Z',
      isolator: { preset: 'science', independent: 'กรดเข้มข้น', dependent: '', controlled: [], controlGroup: '', unit: '', replicates: 0 },
    });
    expect(buildSafetyChecklist(flags).map((item) => item.id)).toContain('chemical-supervision');
  });

  it.each([
    ['ทดลองปลากัด', 'animal-permission', 'แบบฟอร์มขออนุญาตใช้สัตว์ทดลอง'],
    ['เพาะเชื้อรา', 'lab-review', 'BSL-1/BSL-2'],
    ['กรดเข้มข้น', 'chemical-supervision', 'สารเคมี'],
    ['ไฟฟ้าแรงสูง', 'device-supervision', 'ไฟฟ้าแรงสูง'],
  ])('maps %s to the grounded family/supervision step', (text, id, title) => {
    const item = buildSafetyChecklist(screenIdea(text)).find((entry) => entry.id === id);
    expect(item?.titleTh).toContain(title);
    expect(item?.source).toMatch(/^RESEARCH.md §(8.2|10)$/);
    expect(item?.blocking).toBe(false);
  });

  it('has no checklist without active flags and deduplicates shared supervision steps', () => {
    expect(buildSafetyChecklist([])).toEqual([]);
    expect(buildSafetyChecklist(screenIdea('แบบสอบถาม').map((flag) => ({ ...flag, flagged: false })))).toEqual([]);
    const flags = screenIdea('แบบสอบถาม ปลากัด เพาะเชื้อรา กรดเข้มข้น ไฟฟ้าแรงสูง');
    const ids = buildSafetyChecklist([...flags, ...flags]).map((item) => item.id);
    expect(ids).toEqual(['advisor-review', 'approval-review', 'human-consent', 'animal-permission', 'lab-review', 'chemical-supervision', 'device-supervision']);
  });

  it('offers Informed Consent and advisor/IRB review for human-subject flags', () => {
    const items = buildSafetyChecklist(screenIdea('แบบสอบถามอาสาสมัครมนุษย์'));
    expect(items.map((item) => item.id)).toEqual(['advisor-review', 'approval-review', 'human-consent']);
    expect(items.find((item) => item.id === 'human-consent')?.titleTh).toContain('Informed Consent');
    expect(items.every((item) => item.blocking === false)).toBe(true);
  });
});
