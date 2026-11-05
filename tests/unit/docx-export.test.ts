// @vitest-environment node
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import type { Proposal, Plan } from '@/types/domain';
import { exportFixture } from '../fixtures/export';
import {
  generateProposalDocxBuffer,
  getProposalExportFilename,
} from '@/lib/export/docx-export';

describe('DOCX Export (Seam 1)', () => {
  it('appends TCAS, bounded abstract and 3-minute pitch only on explicit opt-in', async () => {
    const output = await generateProposalDocxBuffer({ ...exportFixture, includeTemplates: true, presentationNotes: {
      role: 'ออกแบบต้นแบบด้วยตนเอง', skills: '', learning: '', targetField: '', results: 'ข้อมูลยังไม่พอสรุป',
    } });
    const xml = await (await JSZip.loadAsync(output)).file('word/document.xml')!.async('text');
    expect(xml).toContain('TCAS — โครงร่างพอร์ต 1 หน้า');
    expect(xml).toContain('บทคัดย่อ');
    expect(xml).toContain('0:30–1:45');
    expect(xml).toContain('วัดกำลังไฟวันละ 3 ครั้ง');
    expect(xml).toContain('ออกแบบต้นแบบด้วยตนเอง');
    expect(xml).toContain('ข้อมูลยังไม่พอสรุป');
    const legacy = await generateProposalDocxBuffer(exportFixture);
    const oldXml = await (await JSZip.loadAsync(legacy)).file('word/document.xml')!.async('text');
    expect(oldXml).not.toContain('TCAS');
  });
  const sampleProposal: Proposal = {
    title: 'การศึกษาพลาสติกชีวภาพ',
    problemStatement: 'ปัญหาขยะพลาสติกในชุมชนและการย่อยสลายช้า',
    objectives: [
      'ศึกษาประสิทธิภาพของสารสกัดจากเปลือกส้มในการเร่งการย่อย',
      'เปรียบเทียบระยะเวลาการย่อยสลายกับชุดควบคุม',
    ],
    hypothesis: 'ถ้าใช้สารสกัดจากเปลือกส้มเข้มข้น 10% ขยะพลาสติกชีวภาพจะย่อยสลายเร็วขึ้น 30%',
    variables: {
      independent: ['ความเข้มข้นของสารสกัดเปลือกส้ม'],
      dependent: ['อัตราการย่อยสลายของแผ่นพลาสติกชีวภาพ (ร้อยละน้ำหนักที่ลดลง)'],
      controlled: ['อุณหภูมิห้อง 25°C', 'ความชื้น 65%', 'ขนาดชิ้นพลาสติก 2x2 cm'],
    },
    methodology: 'เตรียมสารสกัด นำแผ่นพลาสติกแช่ในสารละลาย ชั่งน้ำหนักทุก 3 วัน บันทึกผล 5 ซ้ำ',

  };

  const samplePlan: Plan = {
    targetDeadline: '2026-12-01',
    totalWeeks: 4,
    milestones: [
      {
        week: 1,
        title: 'เตรียมสารสกัดและแผ่นพลาสติกชีวภาพ',
        description: 'สกัดสารจากเปลือกส้มและเตรียมตัวอย่าง',
        deliverable: 'สารสกัดความเข้มข้น 5%, 10%, 15% พร้อมใช้งาน',
        completed: true,
      },
      {
        week: 2,
        title: 'เริ่มการทดลองและบันทึกผลรอบที่ 1',
        description: 'แช่ตัวอย่างในสารสกัดและวัดน้ำหนักเริ่มต้น',
        deliverable: 'ตารางบันทึกค่าน้ำหนักวันแรก',
        completed: false,
      },
    ],
  };

  it('embeds licensed Thai regular and bold faces for readers without installed Thai fonts', async () => {
    const { readFile } = await import('node:fs/promises');
    const buffer = await generateProposalDocxBuffer({
      title: sampleProposal.title, proposal: sampleProposal, plan: samplePlan,
      fonts: {
        regular: await readFile('public/fonts/Sarabun-Regular.ttf'),
        bold: await readFile('public/fonts/Sarabun-Bold.ttf'),
      },
    });
    const zip = await JSZip.loadAsync(buffer);
    const fontTable = await zip.file('word/fontTable.xml')!.async('text');
    expect(fontTable).toContain('w:embedRegular');
    expect(fontTable).toContain('w:embedBold');
    const xml = await zip.file('word/document.xml')!.async('text');
    expect(xml).toContain('w:cs="Sarabun"');
    expect(xml).toContain('w:val="th-TH"');
  });

  it('preserves student line breaks and escapes markup instead of treating it as XML', async () => {
    const buffer = await generateProposalDocxBuffer({
      title: 'ทดสอบ', proposal: { ...sampleProposal, methodology: 'บรรทัดแรก\nบรรทัดสอง <script> & ตัวอย่าง' },
    });
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('text');
    expect(xml).toContain('<w:br/>');
    expect(xml).toContain('&lt;script&gt; &amp; ตัวอย่าง');
    expect(xml).not.toContain('<script>');
  });

  it('exports the Plan deadline, duration and progress on a separate page', async () => {
    const buffer = await generateProposalDocxBuffer({ title: sampleProposal.title, proposal: sampleProposal, plan: samplePlan });
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('text');
    expect(xml).toContain('ระยะเวลา 4 สัปดาห์');
    expect(xml).toContain('2026-12-01');
    expect(xml).toContain('เสร็จแล้ว');
    expect(xml).toContain('ยังไม่เสร็จ');
    expect(xml).toContain('w:pageBreakBefore');
  });

  it('generates a non-empty buffer that can be loaded as a valid docx zip archive', async () => {
    const buffer = await generateProposalDocxBuffer({
      title: 'การศึกษาพลาสติกชีวภาพ',
      proposal: sampleProposal,
      plan: samplePlan,
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('word/document.xml')).not.toBeNull();
  });

  it('contains Thai proposal section headings and student content in document.xml', async () => {
    const buffer = await generateProposalDocxBuffer({
      title: 'การศึกษาพลาสติกชีวภาพ',
      proposal: sampleProposal,
      plan: samplePlan,
    });

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')!.async('text');

    // Section headings (Thai literals from standard scientific project proposal format)
    expect(docXml).toContain('ที่มาและความสำคัญของปัญหา');
    expect(docXml).toContain('วัตถุประสงค์');
    expect(docXml).toContain('สมมติฐาน');
    expect(docXml).toContain('ตัวแปรที่ศึกษา');
    expect(docXml).toContain('แผนการดำเนินงานและวิธีทดลอง');

    // Student content in Thai
    expect(docXml).toContain('ปัญหาขยะพลาสติกในชุมชนและการย่อยสลายช้า');
    expect(docXml).toContain('ศึกษาประสิทธิภาพของสารสกัดจากเปลือกส้ม');
    expect(docXml).toContain('ความเข้มข้นของสารสกัดเปลือกส้ม');
    expect(docXml).toContain('เตรียมสารสกัด นำแผ่นพลาสติกแช่ในสารละลาย');

    // Weekly plan milestone items
    expect(docXml).toContain('สัปดาห์ที่ 1');
    expect(docXml).toContain('เตรียมสารสกัดและแผ่นพลาสติกชีวภาพ');
  });

  it('configures Thai font with complex script (cs) support', async () => {
    const buffer = await generateProposalDocxBuffer({
      title: 'โครงงานวิทยาศาสตร์',
      proposal: sampleProposal,
      plan: samplePlan,
    });

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')!.async('text');

    // Check that TH Sarabun New or Sarabun is specified
    const hasThaiFont =
      docXml.includes('TH Sarabun New') ||
      docXml.includes('Sarabun') ||
      docXml.includes('Prompt');
    expect(hasThaiFont).toBe(true);
  });

  it('handles empty or partial proposal and plan gracefully without throwing', async () => {
    const emptyProposal: Proposal = {
      title: 'โครงงานว่างเปล่า',
      problemStatement: '',
      objectives: [],
      hypothesis: '',
      variables: {
        independent: [],
        dependent: [],
        controlled: [],
      },
      methodology: '',

    };

    const emptyPlan: Plan = {
      targetDeadline: '2026-12-01',
      totalWeeks: 0,
      milestones: [],
    };

    const buffer = await generateProposalDocxBuffer({
      title: 'โครงงานว่างเปล่า',
      proposal: emptyProposal,
      plan: emptyPlan,
    });

    expect(buffer).toBeDefined();
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')!.async('text');
    expect(docXml).toContain('โครงงานว่างเปล่า');
    expect(docXml).toContain('(ยังไม่ได้ระบุ)');
  });

  it('generates a clean Zero-PII filename with sanitized title', () => {
    expect(getProposalExportFilename('โครงงาน เปลือกส้ม 101')).toBe(
      'proposal-โครงงาน-เปลือกส้ม-101.docx'
    );
    expect(getProposalExportFilename('  Special / \\ : * ? " < > | Project  ')).toBe(
      'proposal-Special-Project.docx'
    );
    expect(getProposalExportFilename('')).toBe('proposal-project.docx');
  });
});
