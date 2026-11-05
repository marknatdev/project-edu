/**
 * Rubric Presets for Project Edu
 *
 * Grounded in RESEARCH.md §6.1 (Synthesized 5-Axis Evaluation Model)
 * and §6.2 (Target Grading Level Differentiation).
 *
 * NOTE ON WEIGHTS:
 * All weights defined below are HEURISTIC models synthesized from competition
 * guidelines and educational research in RESEARCH.md. They do NOT constitute
 * official scoring rubrics published by YSC/NSC/สพฐ./ISEF organizers.
 * Official criteria are qualitative or use different scoring scales;
 * our 5-axis framework harmonizes them for consistent guidance.
 * All presets have `isHeuristic: true`.
 */

import { GOALS } from '@/types/domain';
import type { Goal, GradeLevel, RubricPreset } from '@/types/domain';

export const RUBRIC_PRESETS: readonly RubricPreset[] = [
  // =========================================================================
  // 1. YSC (Young Scientist Competition)
  // Emphasis: Research rigor (30 pts in YSC), scientific method, novelty, impact
  // Reference: RESEARCH.md §6.1 & §6.2
  // =========================================================================
  {
    id: 'rubric-ysc-m_ton',
    goal: 'ysc',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์โครงงาน YSC (ม.ต้น)',
    descriptionTh:
      'มุ่งเน้นการตั้งปัญหาอย่างมีเหตุผล ระเบียบวิธีทางวิทยาศาสตร์เบื้องต้น การสังเกตอย่างเป็นระบบ ใช้อุปกรณ์ปลอดภัยและทำได้จริงในโรงเรียน',
    weights: {
      novelty: 0.2,
      feasibility: 0.25,
      impact: 0.15,
      rigor: 0.25,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีความคิดริเริ่มและเป็นโจทย์ที่ผู้เรียนสนใจด้วยตนเอง แตกต่างจากโครงงานทั่วไปในชั้นเรียน',
      feasibility:
        'ขั้นตอนปลอดภัย ใช้วัสดุอุปกรณ์ที่หาได้ในโรงเรียนหรือท้องถิ่น ควบคุมเวลาได้เหมาะสม',
      impact:
        'แก้ปัญหาใกล้ตัว ชุมชน หรือแสดงความเข้าใจในปรากฏการณ์ธรรมชาติ',
      rigor:
        'นิยามปัญหาชัดเจน ระบุตัวแปรต้น ตัวแปรตาม ตัวแปรควบคุม และมีวิธีวัดผลที่ตรวจสอบได้',
      fit:
        'ตรงตามสาขาของ YSC และขอบเขตการเรียนรู้ระดับมัธยมศึกษาตอนต้น',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-ysc-m_plai',
    goal: 'ysc',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์โครงงาน YSC (ม.ปลาย)',
    descriptionTh:
      'เน้นระเบียบวิธีวิจัยเชิงลึก (Scientific Rigor) การตั้งสมมติฐานและการทดสอบที่มีการควบคุมอย่างรัดกุม ความคิดริเริ่มสร้างสรรค์ และการต่อยอดสู่ระดับนานาชาติ',
    weights: {
      novelty: 0.25,
      feasibility: 0.15,
      impact: 0.15,
      rigor: 0.3,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีความคิดริเริ่ม มีช่องว่างความรู้ (Knowledge Gap) ที่ชัดเจน หรือประยุกต์ใช้วิธีการใหม่',
      feasibility:
        'มีแผนการทดลองที่รัดกุม คำนึงถึงความปลอดภัยและข้อกำหนดทางจริยธรรม/SRC อย่างเคร่งครัด',
      impact:
        'มีประโยชน์ทางวิชาการ สิ่งแวดล้อม หรือมีศักยภาพในการต่อยอดเชิงประยุกต์',
      rigor:
        'ระเบียบวิธีวิจัยแม่นยำ กำหนดกลุ่มทดลองและกลุ่มควบคุม (Control Group) ชัดเจน วิเคราะห์ผลเชิงสถิติได้',
      fit:
        'ตรงตามสาขาการประกวด YSC และสอดคล้องกับมาตรฐานทางวิทยาศาสตร์ระดับสากล',
    },
    isHeuristic: true,
  },

  // =========================================================================
  // 2. NSC (National Software Contest)
  // Emphasis: Software innovation, technical architecture, feasibility, utility
  // Reference: RESEARCH.md §6.1 & §6.2
  // =========================================================================
  {
    id: 'rubric-nsc-m_ton',
    goal: 'nsc',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์การประกวดโปรแกรมคอมพิวเตอร์ NSC (ม.ต้น)',
    descriptionTh:
      'เน้นความคิดริเริ่มสร้างสรรค์ นวัตกรรมซอฟต์แวร์ ความเป็นไปได้ทางเทคนิค และการออกแบบโปรแกรมที่ใช้งานได้จริง',
    weights: {
      novelty: 0.2,
      feasibility: 0.3,
      impact: 0.2,
      rigor: 0.15,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'แนวคิดแปลกใหม่ มีฟังก์ชันหรือมุมมองที่สร้างสรรค์ในการแก้ปัญหา',
      feasibility:
        'สถาปัตยกรรมระบบไม่ซับซ้อนเกินระดับ ม.ต้น พัฒนาเสร็จทันตามกำหนดและทดสอบได้จริง',
      impact:
        'มีประโยชน์ต่อการเรียนรู้ ความบันเทิง หรือการใช้งานในชีวิตประจำวัน',
      rigor:
        'การออกแบบขั้นตอนวิธี (Algorithm) ถูกต้อง จัดการข้อผิดพลาดและข้อมูลทดสอบได้ดี',
      fit:
        'ตรงตามหมวดการแข่งขัน NSC สำหรับระดับมัธยมศึกษาตอนต้น',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-nsc-m_plai',
    goal: 'nsc',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์การประกวดโปรแกรมคอมพิวเตอร์ NSC (ม.ปลาย)',
    descriptionTh:
      'เน้นนวัตกรรมซอฟต์แวร์ การออกแบบสถาปัตยกรรม ความสมบูรณ์ของระบบ การนำไปประยุกต์ใช้จริง และความปลอดภัยของข้อมูล',
    weights: {
      novelty: 0.25,
      feasibility: 0.2,
      impact: 0.25,
      rigor: 0.15,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีความโดดเด่นด้านนวัตกรรม เทคโนโลยี หรือการบูรณาการ AI/IoT ในรูปแบบใหม่',
      feasibility:
        'โครงสร้างโค้ดมีคุณภาพ เครื่องมือและไลบรารีเหมาะสม ระบบมีความเสถียร',
      impact:
        'แก้ไขปัญหาได้จริงในเชิงธุรกิจ ชุมชน หรือสาธารณสุข และมีกลุ่มผู้ใช้เป้าหมายชัดเจน',
      rigor:
        'มีแผนการทดสอบระบบ (System Testing) ครอบคลุม วัดประสิทธิภาพและประสิทธิผลอย่างเป็นรูปธรรม',
      fit:
        'ตรงตามหมวดการแข่งขัน NSC สำหรับระดับมัธยมศึกษาตอนปลาย',
    },
    isHeuristic: true,
  },

  // =========================================================================
  // 3. ศิลปหัตถกรรมนักเรียน สพฐ. (silapa)
  // Emphasis: สพฐ. 100-pt rubric (Creativity 5, Method/Tools 15, Utility 5, Rigor 25, Category 50)
  // Reference: RESEARCH.md §6.1 & §6.2
  // =========================================================================
  {
    id: 'rubric-silapa-m_ton',
    goal: 'silapa',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์โครงงานวิทยาศาสตร์ งานศิลปหัตถกรรมนักเรียน (ม.ต้น)',
    descriptionTh:
      'อิงตามเกณฑ์ สพฐ. 100 คะแนน เน้นกระบวนการทางวิทยาศาสตร์ การใช้วัสดุในท้องถิ่น และการตอบโจทย์ตามประเภทโครงงาน',
    weights: {
      novelty: 0.15,
      feasibility: 0.25,
      impact: 0.15,
      rigor: 0.25,
      fit: 0.2,
    },
    criteria: {
      novelty:
        'มีความคิดริเริ่มสร้างสรรค์ ดัดแปลงหรือประยุกต์ภูมิปัญญาท้องถิ่น',
      feasibility:
        'ใช้วัสดุอุปกรณ์ที่ประหยัด ปลอดภัย และดำเนินการได้ด้วยตนเองภายใต้การดูแลของครู',
      impact:
        'นำไปใช้ประโยชน์ในโรงเรียน ครัวเรือน หรือชุมชนท้องถิ่นได้อย่างเป็นรูปธรรม',
      rigor:
        'กำหนดวัตถุประสงค์ สมมติฐาน ตัวแปร และบันทึกผลการทดลองอย่างเป็นระบบ',
      fit:
        'สอดคล้องกับระเบียบและเกณฑ์การแข่งขันโครงงานของ สพฐ. อย่างเคร่งครัด',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-silapa-m_plai',
    goal: 'silapa',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์โครงงานวิทยาศาสตร์ งานศิลปหัตถกรรมนักเรียน (ม.ปลาย)',
    descriptionTh:
      'อิงตามเกณฑ์ สพฐ. 100 คะแนน เน้นการค้นคว้าเชิงลึก ความถูกต้องทางวิชาการ กระบวนการทดลองที่ละเอียด และการนำไปใช้ประโยชน์จริง',
    weights: {
      novelty: 0.15,
      feasibility: 0.2,
      impact: 0.2,
      rigor: 0.25,
      fit: 0.2,
    },
    criteria: {
      novelty:
        'มีความคิดริเริ่มสร้างสรรค์ ต่อยอดองค์ความรู้เดิมหรือแก้ปัญหาที่ยังไม่มีใครทำ',
      feasibility:
        'แผนการทดลองมีความเป็นไปได้สูง จัดหาอุปกรณ์และสารเคมีได้อย่างถูกต้องปลอดภัย',
      impact:
        'สร้างมูลค่าเพิ่ม แก้ปัญหาสิ่งแวดล้อม หรือนำไปพัฒนาเป็นนวัตกรรมชุมชน',
      rigor:
        'ระเบียบวิธีทดลองมีมาตรฐาน มีการทดลองซ้ำ (Replication) และวิเคราะห์ข้อมูลอย่างมีหลักวิชา',
      fit:
        'ถูกต้องตามแบบฟอร์มและข้อกำหนดของงานศิลปหัตถกรรมนักเรียน สพฐ.',
    },
    isHeuristic: true,
  },

  // =========================================================================
  // 4. ISEF (Regeneron International Science and Engineering Fair)
  // Emphasis: Creativity (20), Design/Methodology (15), Execution (20), Impact (10)
  // Reference: RESEARCH.md §6.1 & §6.2
  // =========================================================================
  {
    id: 'rubric-isef-m_ton',
    goal: 'isef',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์โครงงานมาตรฐาน ISEF (ม.ต้น)',
    descriptionTh:
      'เตรียมความพร้อมสู่มาตรฐานสากล เน้นกระบวนการทางวิทยาศาสตร์ที่รัดกุม ความปลอดภัยตามระเบียบ SRC และความอยากรู้อยากเห็นที่เป็นเอกลักษณ์',
    weights: {
      novelty: 0.25,
      feasibility: 0.2,
      impact: 0.15,
      rigor: 0.25,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'คำถามวิจัยมาจากความสงสัยใคร่รู้เฉพาะตัว มีแนวทางแก้ปัญหาที่สร้างสรรค์',
      feasibility:
        'ปฏิบัติตามมาตรฐานความปลอดภัย SRC/ISEF ไม่มีความเสี่ยงที่เกินควบคุม',
      impact:
        'สื่อสารความสำคัญของงานวิจัยต่อความเข้าใจทางวิทยาศาสตร์ได้ชัดเจน',
      rigor:
        'มีการตั้งคำถาม สมมติฐาน การเก็บข้อมูล และบันทึกสมุดบันทึกการทดลอง (Research Log)',
      fit:
        'สอดคล้องกับหมวดหมู่งานวิจัยและจริยธรรมของ ISEF',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-isef-m_plai',
    goal: 'isef',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์โครงงานมาตรฐาน ISEF (ม.ปลาย)',
    descriptionTh:
      'อิงเกณฑ์ Regeneron ISEF (Creativity 20, Design 15, Execution 20, Contribution 10) มุ่งเน้นระเบียบวิธีวิจัยขั้นสูงและการสร้างองค์ความรู้ใหม่',
    weights: {
      novelty: 0.3,
      feasibility: 0.15,
      impact: 0.15,
      rigor: 0.25,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีความคิดสร้างสรรค์ระดับสูง (Creativity) สร้างแนวทางหรือทฤษฎีใหม่ที่ก้าวหน้ากว่างานเดิม',
      feasibility:
        'มีแบบแผนการทดลองที่มีประสิทธิภาพ ควบคุมตัวแปรแทรกซ้อน และผ่านเกณฑ์การประเมินความเสี่ยง SRC',
      impact:
        'สร้างผลกระทบต่อแวดวงวิชาการ (Contribution to Field) หรือแก้ปัญหาระดับโลก',
      rigor:
        'การเก็บและวิเคราะห์ข้อมูลเชิงลึก (Execution & Data Collection) มีความแม่นยำสูงทางสถิติ',
      fit:
        'สอดคล้องกับมาตรฐานทางวิทยาศาสตร์และการนำเสนอในระดับนานาชาติ',
    },
    isHeuristic: true,
  },

  // =========================================================================
  // 5. Classroom (ส่งงานในชั้นเรียน)
  // Emphasis: Learning objectives, feasibility within school semester, safety
  // Reference: CONTEXT.md "เป้าหมาย (Goal)"
  // =========================================================================
  {
    id: 'rubric-classroom-m_ton',
    goal: 'classroom',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์โครงงานในชั้นเรียน (ม.ต้น)',
    descriptionTh:
      'เน้นความเข้าใจกระบวนการเรียนรู้ การทำงานร่วมกัน ความเป็นไปได้ และความปลอดภัยในการทดลอง',
    weights: {
      novelty: 0.1,
      feasibility: 0.35,
      impact: 0.15,
      rigor: 0.25,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีความสนใจเฉพาะตัวของผู้เรียนและปรับใช้กับเรื่องที่เรียนในห้องเรียนได้',
      feasibility:
        'ทำสำเร็จได้ตามตารางเวลาเรียน ไม่เป็นภาระงบประมาณ และปลอดภัย',
      impact:
        'ช่วยให้เข้าใจบทเรียนลึกซึ้งขึ้นและแบ่งปันให้เพื่อนในห้องเรียนได้',
      rigor:
        'มีขั้นตอนการทำงานชัดเจน บันทึกผลและสรุปผลตามกระบวนการทางวิทยาศาสตร์',
      fit:
        'สอดคล้องกับตัวชี้วัดและหลักสูตรแกนกลางของวิชา',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-classroom-m_plai',
    goal: 'classroom',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์โครงงานในชั้นเรียน (ม.ปลาย)',
    descriptionTh:
      'เน้นการประยุกต์ความรู้ในวิชาเรียน การวางแผนอย่างมีระบบ และการนำเสนอข้อสรุปอย่างมีหลักการ',
    weights: {
      novelty: 0.15,
      feasibility: 0.3,
      impact: 0.15,
      rigor: 0.25,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีการตั้งคำถามที่ท้าทายความคิดและบูรณาการข้ามวิชา',
      feasibility:
        'บริหารจัดการเวลาและทรัพยากรได้อย่างเหมาะสม เสร็จทันตามกำหนดภาคเรียน',
      impact:
        'นำเสนอความรู้ที่เป็นประโยชน์และอภิปรายผลเชิงวิชาการได้',
      rigor:
        'ระบุตัวแปร เก็บข้อมูลอย่างมีมาตรฐาน และอ้างอิงแหล่งข้อมูลที่น่าเชื่อถือ',
      fit:
        'ตรงตามวัตถุประสงค์การเรียนรู้ของรายวิชาโครงงาน',
    },
    isHeuristic: true,
  },

  // =========================================================================
  // 6. Portfolio (Portfolio / TCAS)
  // Emphasis: Personal passion, authentic ownership, observable impact
  // Reference: CONTEXT.md "เป้าหมาย (Goal)"
  // =========================================================================
  {
    id: 'rubric-portfolio-m_ton',
    goal: 'portfolio',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์โครงงานสะสมผลงาน (ม.ต้น)',
    descriptionTh:
      'เน้นการค้นหาตนเอง ความหลงใหลในสิ่งที่ทำ และการบันทึกเส้นทางการเรียนรู้',
    weights: {
      novelty: 0.2,
      feasibility: 0.25,
      impact: 0.25,
      rigor: 0.15,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'สะท้อนเอกลักษณ์และความถนัดเฉพาะตัวของผู้เรียน',
      feasibility:
        'ลงมือทำได้ด้วยตนเอง มีหลักฐานกระบวนการทำงานที่น่าเชื่อถือ',
      impact:
        'สร้างผลงานที่นำไปจัดแสดงหรือบอกเล่าเรื่องราวความมุ่งมั่นได้ชัดเจน',
      rigor:
        'มีขั้นตอนการทำงานที่เป็นระเบียบ สามารถอธิบายที่มาและผลลัพธ์ได้',
      fit:
        'เหมาะสำหรับการสะสมในแฟ้มผลงานเพื่อพัฒนาศักยภาพผู้เรียน',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-portfolio-m_plai',
    goal: 'portfolio',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์โครงงานสำหรับ Portfolio/TCAS (ม.ปลาย)',
    descriptionTh:
      'เน้นความโดดเด่นเพื่อยื่นศึกษาต่อระดับมหาวิทยาลัย ความชัดเจนของบทบาทผู้ทำ และผลลัพธ์ที่สร้าง Impact',
    weights: {
      novelty: 0.25,
      feasibility: 0.2,
      impact: 0.25,
      rigor: 0.2,
      fit: 0.1,
    },
    criteria: {
      novelty:
        'แสดงความคิดริเริ่มและศักยภาพที่โดดเด่น สอดคล้องกับสาขาที่ต้องการศึกษาต่อ',
      feasibility:
        'มีความสมบูรณ์ของชิ้นงาน/รายงาน พร้อมแสดงหลักฐานการมีส่วนร่วมจริง',
      impact:
        'มีผลลัพธ์เชิงประจักษ์ นำเสนอได้น่าประทับใจ และสร้างคุณค่าต่อสังคม',
      rigor:
        'ใช้ทักษะและระเบียบวิธีที่แสดงถึงความพร้อมในระดับอุดมศึกษา',
      fit:
        'ตรงกับคุณสมบัติและเกณฑ์การคัดเลือกของหลักสูตร/คณะเป้าหมาย',
    },
    isHeuristic: true,
  },

  // =========================================================================
  // 7. Curiosity (ทำเพราะอยากทำ)
  // Emphasis: Freedom of exploration, maker mindset, high curiosity enjoyment
  // Reference: CONTEXT.md "เป้าหมาย (Goal)"
  // =========================================================================
  {
    id: 'rubric-curiosity-m_ton',
    goal: 'curiosity',
    gradeLevel: 'm_ton',
    nameTh: 'เกณฑ์โครงงานตามความสนใจส่วนตัว (ม.ต้น)',
    descriptionTh:
      'เน้นความสนุกในการทดลอง ความคิดสร้างสรรค์อิสระ และการเรียนรู้ผ่านการลงมือทำ',
    weights: {
      novelty: 0.25,
      feasibility: 0.35,
      impact: 0.1,
      rigor: 0.15,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'เกิดจากคำถามที่ตนเองสงสัยอย่างแท้จริงและสนุกกับการหาคำตอบ',
      feasibility:
        'ทำได้ง่ายด้วยอุปกรณ์รอบตัว ไม่เครียด และบริหารเวลาได้ด้วยตนเอง',
      impact:
        'ตอบโจทย์ความอยากรู้ของตนเองและสามารถเล่าให้ผู้อื่นฟังได้อย่างน่าสนใจ',
      rigor:
        'มีการจดบันทึกการสังเกตและการทดลองอย่างซื่อสัตย์ต่อผลลัพธ์',
      fit:
        'ตอบสนองต่อเป้าหมายการเรียนรู้อย่างมีความสุขของผู้เรียน',
    },
    isHeuristic: true,
  },
  {
    id: 'rubric-curiosity-m_plai',
    goal: 'curiosity',
    gradeLevel: 'm_plai',
    nameTh: 'เกณฑ์โครงงานตามความสนใจส่วนตัว (ม.ปลาย)',
    descriptionTh:
      'เน้นการสำรวจประเด็นที่ลึกซึ้งตามความสนใจ การทดลองสร้างสรรค์แบบ Maker และการเรียนรู้นอกห้องเรียน',
    weights: {
      novelty: 0.3,
      feasibility: 0.3,
      impact: 0.1,
      rigor: 0.15,
      fit: 0.15,
    },
    criteria: {
      novelty:
        'มีความเป็นตัวของตัวเองสูง ท้าทายและไม่จำกัดอยู่แค่ในตำรา',
      feasibility:
        'สามารถจัดหาทรัพยากรและเรียนรู้ทักษะใหม่ที่จำเป็นได้ด้วยตนเอง',
      impact:
        'สร้างผลงานต้นแบบ (Prototype) หรือข้อค้นพบที่น่าภูมิใจ',
      rigor:
        'มีกระบวนการคิดและทดลองอย่างมีหลักการ มีการแก้ปัญหาอย่างเป็นระบบ',
      fit:
        'สอดคล้องกับความสนใจและเป้าหมายส่วนตัวอย่างแท้จริง',
    },
    isHeuristic: true,
  },
];

/**
 * Retrieve the RubricPreset for a given Goal and GradeLevel.
 * Throws an Error if goal or gradeLevel is not supported.
 */
export function getRubricPreset(goal: Goal, gradeLevel: GradeLevel): RubricPreset {
  if (!GOALS.includes(goal)) {
    throw new Error(`Unsupported goal: ${String(goal)}`);
  }
  if (gradeLevel !== 'm_ton' && gradeLevel !== 'm_plai') {
    throw new Error(`Unsupported grade level: ${String(gradeLevel)}`);
  }

  const preset = RUBRIC_PRESETS.find(
    (p) => p.goal === goal && p.gradeLevel === gradeLevel
  );

  if (!preset) {
    throw new Error(`Rubric preset not found for goal: ${goal}, gradeLevel: ${gradeLevel}`);
  }

  return preset;
}
