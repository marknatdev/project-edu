import { EVALUATION_AXES, type Evaluation, type EvaluationAxis } from '@/types/domain';

export const JUDGE_PERSONAS = ['ysc', 'nsc', 'tcas'] as const;
export type JudgePersona = typeof JUDGE_PERSONAS[number];
export interface JudgeQuestion {
  id: string;
  persona: JudgePersona;
  axis: EvaluationAxis;
  prompt: string;
  targeted: boolean;
}

const bank: Record<JudgePersona, Record<EvaluationAxis, string>> = {
  ysc: {
    novelty: 'งานของคุณต่างจากงานที่คล้ายกันตรงไหน และมีหลักฐานใดให้ตรวจสอบความต่างนั้น?',
    feasibility: 'หากเวลา งบ หรืออุปกรณ์ไม่พอ คุณจะลดขอบเขตส่วนใดโดยยังตอบคำถามวิจัยเดิมได้?',
    impact: 'ปัญหานี้สำคัญกับใคร และคุณจะวัดประโยชน์โดยไม่อ้างผลเกินข้อมูลได้อย่างไร?',
    rigor: 'คุณจะใช้ชุดควบคุมใด ควบคุมตัวแปรแทรกซ้อนอย่างไร และวัดซ้ำพร้อมหน่วยอะไร?',
    fit: 'งานนี้ตอบเป้าหมายที่เลือกอย่างไร และส่วนใดที่คุณยังต้องตรวจเกณฑ์ของเวทีปีปัจจุบัน?',
  },
  nsc: {
    novelty: 'ระบบหรืออัลกอริทึมของคุณต่างจาก baseline ที่มีอยู่ตรงไหน และจะเปรียบเทียบอย่างเป็นธรรมอย่างไร?',
    feasibility: 'คุณจะทำต้นแบบส่วนใดก่อน และจะจัดการข้อจำกัดข้อมูล ฮาร์ดแวร์ หรือเวลาพัฒนาอย่างไร?',
    impact: 'ผู้ใช้เป้าหมายมีปัญหาอะไร และคุณจะทดสอบการใช้งานจริงโดยคุ้มครองข้อมูลส่วนบุคคลอย่างไร?',
    rigor: 'คุณจะแบ่งข้อมูลฝึก/ทดสอบ ป้องกันข้อมูลรั่ว และเปรียบเทียบ metric กับ baseline อย่างไร?',
    fit: 'ต้นแบบแสดงทักษะการพัฒนาซอฟต์แวร์ส่วนใด และคุณทำส่วนไหนด้วยตนเอง?',
  },
  tcas: {
    novelty: 'มุมมองที่คุณคิดขึ้นเองคืออะไร และคุณเรียนรู้อะไรจากการเปรียบเทียบกับงานเดิม?',
    feasibility: 'เมื่อเจอข้อจำกัด คุณตัดสินใจแก้ปัญหาอย่างไร และมีบันทึกใดแสดงกระบวนการนั้น?',
    impact: 'โครงงานช่วยให้คุณเข้าใจปัญหาของผู้อื่นอย่างไร และยังมีข้อจำกัดอะไร?',
    rigor: 'คุณอธิบายวิธีวัดผลและเหตุผลที่เลือกวิธีนี้ด้วยภาษาของตนเองได้อย่างไร?',
    fit: 'บทบาทของคุณ ทักษะที่ได้ และความเชื่อมโยงกับสาขาที่สนใจคืออะไร มีหลักฐานใดรองรับ?',
  },
};

const reviewChecklist: Record<EvaluationAxis, string[]> = {
  novelty: ['บอกความต่างจากงานเดิมด้วยภาษาของตนเอง', 'อ้างเฉพาะแหล่งที่ตรวจสอบได้', 'แยกข้อสันนิษฐานออกจากสิ่งที่มีหลักฐาน'],
  feasibility: ['ระบุข้อจำกัดเวลา งบ และอุปกรณ์', 'อธิบายขอบเขตต้นแบบที่ทำได้จริง', 'เตรียมแผนสำรองและจุดที่ต้องขอครูช่วย'],
  impact: ['ระบุกลุ่มผู้ได้รับประโยชน์โดยไม่ใช้ข้อมูลส่วนบุคคล', 'บอกวิธีวัดประโยชน์แทนการกล่าวอ้างลอย ๆ', 'แยกผลที่คาดหวังออกจากผลที่ทดลองแล้ว'],
  rigor: ['ระบุสิ่งที่เปรียบเทียบและ baseline/ชุดควบคุม', 'ระบุ metric/หน่วย วิธีวัดซ้ำ และการป้องกันข้อมูลรั่วหรือตัวแปรแทรกซ้อน', 'บอกข้อจำกัดและหลักฐานที่ยังต้องเก็บ'],
  fit: ['อธิบายบทบาทที่ตนเองลงมือทำจริง', 'เชื่อมเป้าหมายกับทักษะหรือหลักฐาน', 'ตรวจเกณฑ์ปีปัจจุบันกับผู้จัดหรือครู ไม่ใช้คำตอบนี้แทนเกณฑ์ทางการ'],
};

export function reviewJudgeAnswer(question: JudgeQuestion, answer: string) {
  if (!answer.trim() || answer.length > 6000) throw new Error('กรุณาเขียนคำตอบ 1–6,000 ตัวอักษร');
  return {
    source: 'rubric' as const,
    message: 'นี่คือกรอบทบทวนด้วยตนเอง ไม่ใช่การตรวจความถูกต้องของคำตอบหรือคะแนนกรรมการ',
    checklist: [...reviewChecklist[question.axis]], followUp: question.prompt,
  };
}

/** Scores, not potentially inconsistent color labels, determine weak axes. */
export function selectJudgeQuestions(input: {
  persona: JudgePersona; ideaId: string; evaluation?: Evaluation | null;
}): JudgeQuestion[] {
  const evaluation = input.evaluation?.ideaId === input.ideaId ? input.evaluation : null;
  const ranked = [...EVALUATION_AXES].sort((a, b) =>
    (evaluation?.axes[a].score ?? 0) - (evaluation?.axes[b].score ?? 0));
  const weak = evaluation ? ranked.filter(axis => evaluation.axes[axis].score < 7) : [];
  return (weak.length ? weak : ranked).slice(0, 3).map(axis => ({
    id: `${input.persona}:${axis}`, persona: input.persona, axis,
    prompt: bank[input.persona][axis], targeted: weak.length > 0,
  }));
}
