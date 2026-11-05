import type { ExportSnapshot } from '@/lib/export/snapshot';
import { PresentationDocument } from './PresentationDocument';

const missing = '(ยังไม่ได้ระบุ)';

export function ProposalDocument({ snapshot }: { snapshot: ExportSnapshot }) {
  const { proposal, plan } = snapshot;
  const sections = [
    { title: '1. ที่มาและความสำคัญของปัญหา', text: proposal.problemStatement },
    { title: '2. วัตถุประสงค์', text: proposal.objectives.map((item, index) => `${index + 1}. ${item}`).join('\n') },
    { title: '3. สมมติฐาน', text: proposal.hypothesis },
    { title: '4. ตัวแปรที่ศึกษา', text: [
      `ตัวแปรต้น: ${proposal.variables.independent.join(', ') || missing}`,
      `ตัวแปรตาม: ${proposal.variables.dependent.join(', ') || missing}`,
      `ตัวแปรควบคุม: ${proposal.variables.controlled.join(', ') || missing}`,
    ].join('\n') },
    { title: '5. วิธีดำเนินการ / วิธีทดลอง', text: proposal.methodology },
  ];
  return (
    <article className="proposal-document">
      <section className="proposal-sheet">
        <h1>{proposal.title.trim() || snapshot.title || 'ข้อเสนอโครงงาน'}</h1>
        <p className="document-subtitle">ข้อเสนอโครงงาน (Proposal) — จากคำตอบของผู้เรียน</p>
        {sections.map(section => <section className="document-section" key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.text.trim() || missing}</p>
        </section>)}
      </section>
      <section className="plan-sheet">
        <h2>แผนงานรายสัปดาห์ (Plan)</h2>
        <p>ระยะเวลา {plan.totalWeeks} สัปดาห์ • วันส่ง {new Date(plan.targetDeadline).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
        {plan.milestones.length === 0 && <p>{missing}</p>}
        {plan.milestones.map((milestone, index) => <section className="document-section" key={index}>
          <h3>สัปดาห์ที่ {milestone.week}: {milestone.title}</h3>
          <p>{milestone.description || missing}</p>
          <p>ผลงานส่งมอบ: {milestone.deliverable || missing}</p>
          <p>สถานะ: {milestone.completed ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}</p>
        </section>)}
      </section>
      {snapshot.includeTemplates && <PresentationDocument input={snapshot} />}
    </article>
  );
}
