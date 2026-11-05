import type { ExportInput } from '@/lib/export/snapshot';
import { assemblePresentationTemplates } from '@/lib/presentation/templates';

export function PresentationDocument({ input, view = 'all' }: { input: Pick<ExportInput, 'title' | 'proposal' | 'presentationNotes'>; view?: 'all' | 'tcas' | 'pitch' }) {
  const templates = assemblePresentationTemplates(input);
  return <>
    {view !== 'pitch' && <section className="proposal-sheet template-sheet portfolio-sheet">
      <h2>TCAS — โครงร่างพอร์ต 1 หน้า</h2><h1>{templates.portfolio.title}</h1>
      <p className="document-subtitle">คัดข้อความจาก Proposal ที่บันทึกไว้ ข้อความยาวใช้ส่วนต้น (…) ตรวจและเติมจากประสบการณ์จริง ไม่ใช่แบบฟอร์มทางการ</p>
      {templates.portfolio.sections.map(section => <section className="document-section" key={section.heading}><h3>{section.heading}</h3><p>{section.text}</p></section>)}
    </section>}
    {view !== 'tcas' && <>
      <section className="proposal-sheet template-sheet abstract-sheet">
        <h2>บทคัดย่อ (Abstract)</h2>
        <p className="document-subtitle">{templates.abstract.wordCount}/250 คำ — ตัดคำไทย/อังกฤษด้วย Intl.Segmenter; ตรวจวิธีนับของเวทีอีกครั้ง</p>
        {templates.abstract.truncated && <p className="mb-3 text-sm text-amber-800">คัดเฉพาะส่วนต้น (…) ไม่ใช่การสรุปความหมาย กรุณาทบทวนก่อนใช้</p>}
        <p>{templates.abstract.text}</p>
      </section>
      <section className="proposal-sheet template-sheet pitch-sheet">
        <h2>โครงร่างนำเสนอ 3 นาที (Pitch)</h2>
        {templates.pitch.map(part => <section className="document-section" key={part.startSeconds}><h3>{part.range} · {part.heading}</h3><p>{part.text}</p></section>)}
        <p className="document-subtitle">โครงร่างสำหรับซ้อม ไม่รับประกันว่าจะพูดจบใน 3 นาที กรุณาจับเวลาจริงและปรับด้วยภาษาของตนเอง</p>
      </section>
    </>}
  </>;
}
