import type { Subject, Subfield } from '@/types/domain';

export const SUBJECTS: Subject[] = [
  {
    id: 'science',
    nameTh: 'วิทยาศาสตร์',
    nameEn: 'Science',
    description: 'ฟิสิกส์ เคมี ชีววิทยา และวิทยาศาสตร์สิ่งแวดล้อม',
    icon: 'Atom',
  },
  {
    id: 'computer',
    nameTh: 'คอมพิวเตอร์ / AI / IoT',
    nameEn: 'Computer, AI & IoT',
    description: 'วิทยาการคอมพิวเตอร์ ปัญญาประดิษฐ์ ระบบสมองกลฝังตัว และอินเทอร์เน็ตของสรรพสิ่ง',
    icon: 'Cpu',
  },
  {
    id: 'mathematics',
    nameTh: 'คณิตศาสตร์',
    nameEn: 'Mathematics',
    description: 'คณิตศาสตร์บริสุทธิ์ สถิติ และคณิตศาสตร์ประยุกต์',
    icon: 'Sigma',
  },
];

export const SUBFIELDS: Subfield[] = [
  // Science subfields
  {
    id: 'sci_physics',
    subjectId: 'science',
    nameTh: 'ฟิสิกส์และพลังงาน',
    nameEn: 'Physics & Energy',
    description: 'กลศาสตร์ คลื่น แสง เสียง ความร้อน และพลังงานทดแทน',
    icon: 'Zap',
  },
  {
    id: 'sci_chemistry',
    subjectId: 'science',
    nameTh: 'เคมีและวัสดุศาสตร์',
    nameEn: 'Chemistry & Material Science',
    description: 'สารเคมีในชีวิตประจำวัน ปฏิกิริยาเคมี และวัสดุชีวภาพ',
    icon: 'FlaskConical',
  },
  {
    id: 'sci_biology',
    subjectId: 'science',
    nameTh: 'ชีววิทยาและการเกษตร',
    nameEn: 'Biology & Agriculture',
    description: 'พืช แมลง การเจริญเติบโต และนิเวศวิทยาการเกษตร',
    icon: 'Leaf',
  },
  {
    id: 'sci_environment',
    subjectId: 'science',
    nameTh: 'วิทยาศาสตร์สิ่งแวดล้อมและโลก',
    nameEn: 'Environmental & Earth Science',
    description: 'คุณภาพน้ำ อากาศ ดิน ขยะ และการเปลี่ยนแปลงสภาพภูมิอากาศ',
    icon: 'Globe',
  },

  // Computer subfields
  {
    id: 'comp_ai_ml',
    subjectId: 'computer',
    nameTh: 'ปัญญาประดิษฐ์และการเรียนรู้ของเครื่อง',
    nameEn: 'AI & Machine Learning',
    description: 'คอมพิวเตอร์วิทัศน์ การประมวลผลภาษาธรรมชาติ และแบบจำลองจำแนกข้อมูล',
    icon: 'Bot',
  },
  {
    id: 'comp_iot_hardware',
    subjectId: 'computer',
    nameTh: 'ไอโอทีและระบบสมองกลฝังตัว',
    nameEn: 'IoT & Embedded Systems',
    description: 'ไมโครคอนโทรลเลอร์ เซนเซอร์ การตรวจวัดทางกายภาพ และการควบคุมอัตโนมัติ',
    icon: 'Cpu',
  },
  {
    id: 'comp_software_app',
    subjectId: 'computer',
    nameTh: 'การพัฒนาซอฟต์แวร์และแอปพลิเคชัน',
    nameEn: 'Software & Application Development',
    description: 'เว็บแอป โมบายล์แอป ระบบบริหารจัดการ และเครื่องมือช่วยการเรียนรู้',
    icon: 'Binary',
  },
  {
    id: 'comp_data_science',
    subjectId: 'computer',
    nameTh: 'วิทยาการข้อมูลและการวิเคราะห์',
    nameEn: 'Data Science & Analytics',
    description: 'การรวบรวมข้อมูล การวิเคราะห์แนวโน้ม และการสร้างภาพข้อมูล (Data Visualization)',
    icon: 'Database',
  },

  // Mathematics subfields
  {
    id: 'math_applied',
    subjectId: 'mathematics',
    nameTh: 'คณิตศาสตร์ประยุกต์และแบบจำลอง',
    nameEn: 'Applied Mathematics & Modeling',
    description: 'แบบจำลองทางคณิตศาสตร์จำลองการเคลื่อนที่ การแพร่กระจาย และระบบพลวัต',
    icon: 'Calculator',
  },
  {
    id: 'math_stats_prob',
    subjectId: 'mathematics',
    nameTh: 'สถิติและความน่าจะเป็นในชีวิตจริง',
    nameEn: 'Statistics & Probability',
    description: 'การสุ่มตัวอย่าง การกระจายตัว การคาดการณ์ และการวิเคราะห์ความเสี่ยง',
    icon: 'ChartColumn',
  },
  {
    id: 'math_discrete',
    subjectId: 'mathematics',
    nameTh: 'คณิตศาสตร์ไม่ต่อเนื่องและทฤษฎีกราฟ',
    nameEn: 'Discrete Mathematics & Graph Theory',
    description: 'เส้นทางที่สั้นที่สุด เครือข่าย การจัดสรรทรัพยากร และตรรกศาสตร์',
    icon: 'Shapes',
  },
  {
    id: 'math_geometry',
    subjectId: 'mathematics',
    nameTh: 'เรขาคณิตและการคำนวณเชิงมิติ',
    nameEn: 'Geometry & Spatial Computation',
    description: 'รูปทรงเรขาคณิต พื้นผิว ปริมาตร แฟร็กทัล และความสมมาตรในธรรมชาติ',
    icon: 'Compass',
  },
];
