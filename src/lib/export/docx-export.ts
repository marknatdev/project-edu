import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,

  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { assemblePresentationTemplates } from '@/lib/presentation/templates';
import type { PresentationNotes } from '@/lib/presentation/notes';
import type { Proposal, Plan } from '@/types/domain';
import { Buffer } from 'buffer';

export interface ExportDocxOptions {
  title: string;
  proposal: Proposal;
  plan?: Plan | null;
  includeTemplates?: boolean;
  presentationNotes?: PresentationNotes;
  fonts?: { regular: Uint8Array; bold: Uint8Array };
}

const THAI_FONT = 'Sarabun';


const DEFAULT_FONT_CONFIG = {
  name: THAI_FONT,
  cs: THAI_FONT,
  ascii: THAI_FONT,
  hAnsi: THAI_FONT,
  hint: 'cs' as const,
};

/**
 * Helper to produce standard formatted text runs with Thai font specifications.
 */
function createRun(
  text: string,
  options: {
    bold?: boolean;
    size?: number; // half-points: 32 = 16pt
    color?: string;
    italics?: boolean;
  } = {}
): TextRun {
  return new TextRun({
    text,
    font: DEFAULT_FONT_CONFIG,
    size: options.size ?? 28, // half-points: 28 = 14pt
    sizeComplexScript: options.size ?? 28,
    language: { value: 'th-TH', eastAsia: 'th-TH' },
    bold: options.bold ?? false,
    italics: options.italics ?? false,
    color: options.color ?? '111827',
  });
}

function createHeading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 160, after: 80 },
    keepNext: true,
    children: [
      createRun(text, {
        bold: true,
        size: level === HeadingLevel.TITLE ? 40 : 32,
        color: '1E3A8A',
      }),
    ],
  });
}

function createParagraph(
  text: string,
  options: {
    indent?: number;
    bullet?: boolean;
    bold?: boolean;
    color?: string;
  } = {}
): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    bullet: options.bullet ? { level: 0 } : undefined,
    children: text.split(/\r?\n/).flatMap((line, index) => [
      ...(index > 0 ? [new TextRun({ break: 1 })] : []),
      createRun(line, { bold: options.bold, color: options.color }),
    ]),
  });
}

/**
 * Builds an AST Document representing the Thai Scientific Project Proposal.
 */
export function buildProposalDocument(options: ExportDocxOptions): Document {
  const { title, proposal, plan } = options;
  const projectTitle = proposal.title.trim() || title.trim() || 'ข้อเสนอโครงงาน';

  const docChildren: (Paragraph | Table)[] = [];

  // Title
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        createRun(projectTitle, {
          bold: true,
          size: 36, // 18pt
          color: '1E293B',
        }),
      ],
    })
  );

  // Subtitle
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 360 },
      children: [
        createRun('ข้อเสนอโครงงาน (Proposal) & แผนการดำเนินงาน', {
          italics: true,
          size: 28, // 14pt
          color: '64748B',
        }),
      ],
    })
  );

  // 1. ที่มาและความสำคัญของปัญหา
  docChildren.push(createHeading('1. ที่มาและความสำคัญของปัญหา'));
  docChildren.push(
    createParagraph(
      proposal.problemStatement?.trim() || '(ยังไม่ได้ระบุ)'
    )
  );

  // 2. วัตถุประสงค์
  docChildren.push(createHeading('2. วัตถุประสงค์'));
  if (proposal.objectives && proposal.objectives.length > 0) {
    proposal.objectives.forEach((obj, idx) => {
      docChildren.push(createParagraph(`${idx + 1}. ${obj}`));
    });
  } else {
    docChildren.push(createParagraph('(ยังไม่ได้ระบุ)'));
  }

  // 3. สมมติฐาน
  docChildren.push(createHeading('3. สมมติฐาน'));
  docChildren.push(
    createParagraph(proposal.hypothesis?.trim() || '(ยังไม่ได้ระบุ)')
  );

  // 4. ตัวแปรที่ศึกษา
  docChildren.push(createHeading('4. ตัวแปรที่ศึกษา'));
  docChildren.push(
    createParagraph(
      `4.1 ตัวแปรต้น (Independent Variable): ${proposal.variables.independent.join(', ') || '(ยังไม่ได้ระบุ)'}`
    )
  );
  docChildren.push(
    createParagraph(
      `4.2 ตัวแปรตาม (Dependent Variable): ${proposal.variables.dependent.join(', ') || '(ยังไม่ได้ระบุ)'}`
    )
  );

  const controlled = proposal.variables?.controlled ?? [];
  if (controlled.length > 0) {
    docChildren.push(
      createParagraph(
        `4.3 ตัวแปรควบคุม (Controlled Variables): ${controlled.join(', ')}`
      )
    );
  } else {
    docChildren.push(
      createParagraph('4.3 ตัวแปรควบคุม (Controlled Variables): (ยังไม่ได้ระบุ)')
    );
  }

  // 5. แผนการดำเนินงานและวิธีทดลอง
  docChildren.push(createHeading('5. แผนการดำเนินงานและวิธีทดลอง'));
  docChildren.push(
    createParagraph(proposal.methodology?.trim() || '(ยังไม่ได้ระบุ)')
  );

  // The Plan starts on its own page; never omit its deadline or progress.
  if (plan) {
    docChildren.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { before: 200, after: 120 },
        children: [
          createRun('แผนงานรายสัปดาห์ (Weekly Milestones):', {
            bold: true,
            size: 30,
            color: '334155',
          }),
        ],
      })
    );

    docChildren.push(createParagraph(`ระยะเวลา ${plan.totalWeeks} สัปดาห์ • วันส่ง ${plan.targetDeadline.slice(0, 10)}`));
    if (plan.milestones.length === 0) docChildren.push(createParagraph('(ยังไม่ได้ระบุ)'));

    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [createParagraph('ช่วงเวลา', { bold: true })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [createParagraph('กิจกรรม / หมุดหมาย', { bold: true })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [createParagraph('ผลงานส่งมอบ (Deliverable)', { bold: true })],
          }),
        ],
      }),
    ];

    plan.milestones.forEach((m) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [createParagraph(`สัปดาห์ที่ ${m.week}`)],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                createParagraph(m.title, { bold: true }),
                ...(m.description ? [createParagraph(m.description)] : []),
              ],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [createParagraph(m.deliverable || '-'), createParagraph(`สถานะ: ${m.completed ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}`)],
            }),
          ],
        })
      );
    });

    const milestoneTable = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    docChildren.push(milestoneTable);
  }

  if (options.includeTemplates) {
    const templates = assemblePresentationTemplates({ title, proposal, presentationNotes: options.presentationNotes });
    const newPage = (heading: string) => new Paragraph({ pageBreakBefore: true, keepNext: true,
      spacing: { before: 80, after: 120 }, children: [createRun(heading, { bold: true, size: 30 })] });
    const compact = (text: string, bold = false) => new Paragraph({
      spacing: { before: 60, after: 60 }, keepNext: bold,
      children: [createRun(text, { size: 22, bold })],
    });
    docChildren.push(newPage('TCAS — โครงร่างพอร์ต 1 หน้า'), compact(templates.portfolio.title, true));
    docChildren.push(compact('คัดข้อความจาก Proposal ที่บันทึกไว้ ข้อความยาวใช้ส่วนต้น (…) ตรวจและเติมจากประสบการณ์จริง ไม่ใช่แบบฟอร์มทางการ'));
    for (const section of templates.portfolio.sections) docChildren.push(compact(section.heading, true), compact(section.text));
    docChildren.push(newPage('บทคัดย่อ (Abstract)'), createParagraph(`${templates.abstract.wordCount}/250 คำ — ตัดคำไทย/อังกฤษด้วย Intl.Segmenter; ตรวจวิธีนับของเวทีอีกครั้ง`));
    if (templates.abstract.truncated) docChildren.push(createParagraph('คัดเฉพาะส่วนต้น (…) ไม่ใช่การสรุปความหมาย กรุณาทบทวนก่อนใช้'));
    docChildren.push(createParagraph(templates.abstract.text), newPage('โครงร่างนำเสนอ 3 นาที (Pitch)'));
    templates.pitch.forEach(part => docChildren.push(createHeading(`${part.range} ${part.heading}`), createParagraph(part.text)));
    docChildren.push(createParagraph('โครงร่างสำหรับซ้อม ไม่รับประกันว่าจะพูดจบใน 3 นาที กรุณาจับเวลาจริงและปรับด้วยภาษาของตนเอง'));
  }

  return new Document({
    creator: 'Project Edu',
    fonts: options.fonts ? [{
      name: THAI_FONT,
      data: Buffer.from(options.fonts.regular),
      bold: Buffer.from(options.fonts.bold),
    }] : undefined,
    styles: {
      default: {
        document: {
          run: {
            font: DEFAULT_FONT_CONFIG,
            size: 32,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 850, // approximately 15mm on A4
              bottom: 850,
              left: 850,
              right: 850,
            },
          },
        },
        children: docChildren,
      },
    ],
  });
}

/**
 * Generates a DOCX file Buffer (for Node.js, Vitest, and SSR environments).
 */
export async function generateProposalDocxBuffer(
  options: ExportDocxOptions
): Promise<Buffer> {
  const doc = buildProposalDocument(options);
  return await Packer.toBuffer(doc);
}

/**
 * Generates a DOCX file Blob (for Browser direct download).
 */
export async function generateProposalDocxBlob(
  options: ExportDocxOptions
): Promise<Blob> {
  const doc = buildProposalDocument(options);
  return await Packer.toBlob(doc);
}

/**
 * Sanitizes filesystem characters, not personal information.
 * The learner must review document/title contents before sharing.
 */
export function getProposalExportFilename(title: string): string {
  const cleanTitle = title
    .replace(/[<>:"/\\|?*\p{Cc}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, '-');

  if (!cleanTitle) {
    return 'proposal-project.docx';
  }

  return `proposal-${cleanTitle}.docx`;
}
