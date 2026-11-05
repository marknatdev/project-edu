import type { AxisEvaluation, VariableIsolator } from '@/types/domain';
import { scoreToBadge } from '@/lib/rubrics/engine';

// Conservative recognized units; unfamiliar units remain a coaching hint, never a gate.
export const QUANTITATIVE_UNITS = [
  '°C', 'K', 'วินาที', 'นาที', 'ชั่วโมง', 'วัน', 'มม.', 'ซม.', 'เมตร',
  'กรัม', 'กิโลกรัม', 'มิลลิลิตร', 'ลิตร', 'นิวตัน', 'โวลต์', 'แอมแปร์', 'วัตต์',
  '%', 'F1-score (0–1)', 'จำนวน (ครั้ง)', 'คะแนน (0–10)',
  's', 'ms', 'min', 'h', 'mm', 'cm', 'm', 'g', 'kg', 'mg', 'mL', 'L', 'N', 'V', 'A', 'W', 'pH',
];

export function checkRigor(design?: VariableIsolator) {
  const checks = [
    { id: 'comparison', passed: Boolean(design && (design.preset === 'science' ? design.controlGroup : design.baseline).trim()),
      hintTh: 'จะเทียบกับชุดควบคุมหรือ Baseline ใด เพื่อแยกผลของสิ่งที่เปลี่ยน?' },
    { id: 'unit', passed: Boolean(design?.unit.trim() && (QUANTITATIVE_UNITS.includes(design.unit.trim()) || design.customUnitConfirmed === true)),
      hintTh: 'จะรายงานเป็นหน่วยใด เช่น °C วินาที % หรือ F1-score (0–1)?' },
    { id: 'replicates', passed: Boolean(design && Number.isSafeInteger(design.replicates) && design.replicates >= 3),
      hintTh: 'จะทำซ้ำอย่างอิสระอย่างน้อย 3 ครั้งได้อย่างไร? n ≥ 3 เป็นคำชวนคิด ไม่ใช่เกณฑ์รับรองทางสถิติ' },
  ];
  return { checks, passed: checks.every((check) => check.passed) };
}

/** App heuristic, not an official rubric or a scientific-validity guarantee. */
export function evaluateIsolator(design: VariableIsolator): AxisEvaluation {
  const result = checkRigor(design);
  const count = result.checks.filter((check) => check.passed).length;
  const fieldsComplete = design.preset === 'science'
    ? Boolean(design.independent.trim() && design.dependent.trim() && design.controlled.some((value) => value.trim()))
    : Boolean(design.input.trim() && design.output.trim() && design.metric.trim() && design.dataSplit.trim());
  const missingFieldsHint = design.preset === 'science'
    ? 'จะระบุตัวแปรต้น ตัวแปรตาม และตัวแปรควบคุมให้ครบได้อย่างไร?'
    : 'จะระบุ Input / Output / Metric และแยกข้อมูลฝึก-ตรวจสอบ-ทดสอบ (Data split) อย่างไรเพื่อไม่ให้ข้อมูลรั่ว?';
  const score = Math.min(1 + count * 2, fieldsComplete ? 7 : 5);
  return {
    score, badge: scoreToBadge(score),
    rationale: `Rigor Check จากตารางแยกตัวแปร: ครบ ${count}/3 ข้อ (เกณฑ์ชวนคิดของแอป ไม่ใช่คะแนนทางการ)`,
    feedback: !fieldsComplete ? missingFieldsHint : result.passed
      ? 'มีชุดเปรียบเทียบ หน่วยวัด และ n ≥ 3 แล้ว จะยืนยันความเป็นอิสระของแต่ละครั้งและความเหมาะสมของวิธีวิเคราะห์กับครูอย่างไร?'
      : result.checks.filter((check) => !check.passed).map((check) => check.hintTh).join(' '),
  };
}
