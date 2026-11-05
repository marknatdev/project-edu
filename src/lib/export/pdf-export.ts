import { createExportSnapshot, ExportSnapshotSchema, type ExportInput, type ExportSnapshot } from './snapshot';

const PRINT_KEY = 'project-edu:print-snapshot';

/** Same-tab, one-use transfer: no student content in the request URL or on a server. */
export function openPrintPreview(input: ExportInput): void {
  sessionStorage.setItem(PRINT_KEY, JSON.stringify(createExportSnapshot(input)));
  window.location.assign('/print');
}

export function takePrintSnapshot(): ExportSnapshot | null {
  const raw = sessionStorage.getItem(PRINT_KEY);
  sessionStorage.removeItem(PRINT_KEY);
  if (!raw) return null;
  return ExportSnapshotSchema.parse(JSON.parse(raw));
}

/** Wait for the actual Thai faces, not just CSS, before opening Save as PDF. */
export async function printProposal(): Promise<void> {
  const faces = await Promise.all([
    document.fonts.load('400 14px "Sarabun Export"', 'ข้อเสนอโครงงาน'),
    document.fonts.load('700 14px "Sarabun Export"', 'ข้อเสนอโครงงาน'),
  ]);
  await document.fonts.ready;
  if (faces.some(loaded => loaded.length === 0)) throw new Error('โหลดแบบอักษรไทยไม่สำเร็จ กรุณาลองใหม่');
  window.print();
}
