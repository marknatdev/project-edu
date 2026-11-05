import type { Goal } from '@/types/domain';

export interface CompetitionSeason {
  id: Extract<Goal, 'ysc' | 'nsc' | 'silapa' | 'isef'>;
  name: string;
  stage: string;
  startMonth: number;
  endMonth: number;
  windowLabel: string;
  note: string;
  sourceUrl: string;
  sourceLabel: string;
  checkedOn: string;
}

/** Sources and corrections are documented in RESEARCH.md §11.
 * Annual projections are approximate planning aids, not current-year rules.
 */
export const COMPETITION_SEASONS: CompetitionSeason[] = [
  {
    id: 'ysc', name: 'YSC', stage: 'ช่วงเตรียมข้อเสนอโครงงาน',
    startMonth: 8, endMonth: 9, windowLabel: 'ส.ค. – ก.ย.',
    note: 'อิงประกาศ YSC 2027 ที่รับรหัสถึง 25 ส.ค. 2569 และข้อเสนอถึง 10 ก.ย. 2569 ไม่ใช่ ต.ค.–พ.ย. ตามตัวอย่างเดิม ปีถัดไปต้องตรวจใหม่',
    sourceUrl: 'https://www.nstda.or.th/ysc/ysc2026', sourceLabel: 'สวทช. • ประกาศ YSC 2027', checkedOn: '2026-11-05',
  },
  {
    id: 'nsc', name: 'NSC', stage: 'ช่วงเตรียมข้อเสนอโครงการซอฟต์แวร์',
    startMonth: 5, endMonth: 5, windowLabel: 'พ.ค.',
    note: 'อิงประกาศ NSC 2026 ของศูนย์ประสานงาน ม.ศิลปากร (1–29 พ.ค. 2569) ช่วงรับสมัครเปลี่ยนได้ ไม่ใช่ ส.ค.–ก.ย. ตามตัวอย่างเดิม',
    sourceUrl: 'https://sc.su.ac.th/การแข่งขันพัฒนาโปรแกรม', sourceLabel: 'คณะวิทยาศาสตร์ ม.ศิลปากร • NSC 2026', checkedOn: '2026-11-05',
  },
  {
    id: 'silapa', name: 'ศิลปหัตถกรรม', stage: 'ช่วงติดตามประกาศเขตพื้นที่ / เตรียมแข่งขัน',
    startMonth: 9, endMonth: 12, windowLabel: 'ก.ย. – ธ.ค.',
    note: 'ช่วงกว้างจาก RESEARCH.md เท่านั้น ไม่มีปฏิทินกลางทุกเขต ตัวอย่างสงขลา–สตูลปี 2569 แข่งตั้งแต่ ส.ค. จึงต้องสอบถามครูและเขตพื้นที่ก่อนช่วงนี้',
    sourceUrl: 'https://art74.vichakan.net/sm-ska', sourceLabel: 'ระบบงานศิลปหัตถกรรม • สพม.สงขลา สตูล', checkedOn: '2026-11-05',
  },
  {
    id: 'isef', name: 'Regeneron ISEF', stage: 'ช่วงงานรอบนานาชาติ ไม่ใช่ช่วงสมัครโดยตรง',
    startMonth: 5, endMonth: 5, windowLabel: 'พ.ค.',
    note: 'อิงเดือนจัดงาน ISEF 2027 (8–14 พ.ค.) ต้องผ่านเวทีในเครือก่อน กำหนดของเวทีคัดเลือกและการอนุมัติอาจเร็วกว่านี้หลายเดือน',
    sourceUrl: 'https://www.societyforscience.org/isef/affiliated-fair-network', sourceLabel: 'Society for Science • Affiliated Fair Network', checkedOn: '2026-11-05',
  },
];
