import { describe, expect, it } from 'vitest';
import { isSemanticRepeat } from '@/lib/discovery/fresh-dedupe';

// S2: conservative semantic-repeat policy. Expected verdicts are hand-judged
// by meaning (independent of the algorithm), not recomputed from it.
const idea = (title: string, problem: string) => ({ title, problem });

describe('isSemanticRepeat (S2) — conservative', () => {
  it.each([
    ['exact repeat with spacing/punctuation changes',
      idea('ผลของสีหลังคาต่ออุณหภูมิในห้อง', 'บ้านร้อนตอนบ่าย'),
      idea('ผลของสีหลังคา ต่ออุณหภูมิในห้อง!', 'บ้านร้อนตอนบ่าย')],
    ['Thai paraphrase of the same idea',
      idea('การศึกษาผลของสีหลังคาต่ออุณหภูมิภายในห้อง', 'ห้องเรียนชั้นบนร้อนมากในช่วงบ่าย'),
      idea('สีของหลังคามีผลต่ออุณหภูมิภายในห้องอย่างไร', 'ห้องชั้นบนของโรงเรียนร้อนในตอนบ่าย')],
    ['English case/word-order variant',
      idea('Smart plant watering with soil moisture sensor', 'Plants at school dry out'),
      idea('Soil moisture sensor for smart plant watering', 'School plants dry out')],
  ])('%s → repeat', (_label, a, b) => {
    expect(isSemanticRepeat(a, b)).toBe(true);
  });

  it.each([
    ['different variable in the same subject',
      idea('ผลของสีหลังคาต่ออุณหภูมิในห้อง', 'บ้านร้อนตอนบ่าย'),
      idea('ผลของความเค็มของดินต่อการงอกของเมล็ดถั่วเขียว', 'ดินริมทะเลเค็ม')],
    ['same template words, different topic',
      idea('การศึกษาผลของแสงต่อการเจริญเติบโตของผักบุ้ง', 'ผักบุ้งในโรงเรียนโตช้า'),
      idea('การศึกษาผลของเสียงเพลงต่อสมาธิในการอ่านหนังสือ', 'นักเรียนเสียสมาธิตอนอ่าน')],
    ['related but distinct angle on one interest',
      idea('ตู้ฟักไข่ควบคุมอุณหภูมิด้วยไมโครคอนโทรลเลอร์', 'ฟักไข่ที่บ้านอุณหภูมิไม่คงที่'),
      idea('แอปบันทึกการเติบโตของลูกไก่', 'จำน้ำหนักลูกไก่แต่ละวันไม่ได้')],
  ])('%s → not a repeat', (_label, a, b) => {
    expect(isSemanticRepeat(a, b)).toBe(false);
  });
});
