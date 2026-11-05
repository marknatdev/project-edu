import type { SafetyFlag } from '@/types/domain';

export interface SafetyChecklistItem {
  id: string;
  titleTh: string;
  detailTh: string;
  source: 'RESEARCH.md §8.2' | 'RESEARCH.md §10';
  blocking: false;
}

const advisor: SafetyChecklistItem = {
  id: 'advisor-review', titleTh: 'วางแผนการดูแลกับครูที่ปรึกษาหรือผู้เชี่ยวชาญ',
  detailTh: 'ทบทวนความเสี่ยง อุปกรณ์คุ้มครอง และขั้นตอนที่ต้องมีผู้ใหญ่กำกับก่อนลงมือจริง ไม่บันทึกชื่อหรือลายเซ็นในแอป',
  source: 'RESEARCH.md §8.2', blocking: false,
};
const approval: SafetyChecklistItem = {
  id: 'approval-review', titleTh: 'ตรวจข้อกำหนดอนุมัติ IRB/SRC และแบบฟอร์ม ISEF / YSC ปีที่สมัคร',
  detailTh: 'ให้ครูตรวจ Rules Wizard / ประกาศของผู้จัดและยืนยันว่าต้องขออนุมัติอะไร ก่อนเริ่มทดลองหรือเก็บข้อมูลจริง รายการนี้ไม่ใช่คำอนุมัติ',
  source: 'RESEARCH.md §8.2', blocking: false,
};
const consent: SafetyChecklistItem = {
  id: 'human-consent', titleTh: 'ใบยินยอมอาสาสมัคร (Informed Consent)',
  detailTh: 'ปรึกษาครูและ IRB เรื่องข้อมูลที่เก็บ การยินยอม และการคุ้มครองอาสาสมัคร ใช้เอกสารตามที่ผู้จัดกำหนด ไม่อัปโหลดข้อมูลอาสาสมัครลงแอป',
  source: 'RESEARCH.md §10', blocking: false,
};

const families: Partial<Record<SafetyFlag['category'], SafetyChecklistItem>> = {
  human_subjects: consent,
  vertebrate_animals: {
    id: 'animal-permission', titleTh: 'แบบฟอร์มขออนุญาตใช้สัตว์ทดลอง',
    detailTh: 'นำแผนการใช้สัตว์ให้ครูและคณะกรรมการที่เกี่ยวข้องตรวจ เลือกเอกสารและผู้กำกับตามบริบทจริงก่อนเริ่มทดลอง',
    source: 'RESEARCH.md §10', blocking: false,
  },
  biological_agents: {
    id: 'lab-review', titleTh: 'เอกสารรับรองห้องปฏิบัติการ / ทบทวน BSL-1/BSL-2',
    detailTh: 'ให้ครูหรือผู้เชี่ยวชาญยืนยันระดับห้องปฏิบัติการที่เหมาะสม วิธีดูแลและกำจัดวัสดุ ห้ามอนุมานระดับ BSL จากคำที่ตรวจพบ',
    source: 'RESEARCH.md §10', blocking: false,
  },
  hazardous_chemicals: {
    id: 'chemical-supervision', titleTh: 'ทบทวนความเสี่ยงสารเคมีและการกำกับดูแล',
    detailTh: 'ตรวจอุปกรณ์คุ้มครอง สถานที่ และขั้นตอนกับครูหรือผู้เชี่ยวชาญ แล้วให้ผู้จัดยืนยันแบบฟอร์มที่เกี่ยวข้อง',
    source: 'RESEARCH.md §8.2', blocking: false,
  },
  high_voltage_radiation: {
    id: 'device-supervision', titleTh: 'ทบทวนไฟฟ้าแรงสูง / รังสีและผู้เชี่ยวชาญกำกับ',
    detailTh: 'ให้ผู้เชี่ยวชาญตรวจอุปกรณ์ สถานที่ และมาตรการคุ้มครองก่อนใช้งานจริง ตรวจเอกสารตามเวทีและปีที่สมัครกับครู',
    source: 'RESEARCH.md §8.2', blocking: false,
  },
};

/** Advisories only: no form numbers or procedural lab instructions inferred from flags. */
export function buildSafetyChecklist(flags: SafetyFlag[]): SafetyChecklistItem[] {
  const active = flags.filter((flag) => flag.flagged);
  if (!active.length) return [];
  const categories = new Set(active.map((flag) => flag.category));
  return [advisor, approval, ...Object.entries(families)
    .filter(([category]) => categories.has(category as SafetyFlag['category']))
    .map(([, item]) => item)];
}
