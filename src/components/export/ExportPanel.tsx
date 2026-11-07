'use client';

import { useState } from 'react';
import { FileDown, FileText, Link2, Printer } from 'lucide-react';
import type { Project } from '@/types/domain';
import type { PresentationNotes } from '@/lib/presentation/notes';
import { encodeSharePayload } from '@/lib/export/share-link';
import { openPrintPreview } from '@/lib/export/pdf-export';

const buttonClass = 'min-h-[44px] rounded-xl px-3 py-3 text-callout font-semibold flex items-center justify-center gap-2 border border-accent/30 disabled:opacity-50';
const actionClass = `${buttonClass} bg-surface text-accent-text hover:bg-accent-tint`;

export function ExportPanel({ project, presentationNotes }: { project: Project; presentationNotes?: PresentationNotes }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [showDocs, setShowDocs] = useState(false);
  const [shareConsent, setShareConsent] = useState(false);
  const [includeTemplates, setIncludeTemplates] = useState(true);
  const input = { title: project.proposal.title.trim() || project.title, proposal: project.proposal, plan: project.plan, includeTemplates, ...(includeTemplates && presentationNotes ? { presentationNotes } : {}) };

  async function downloadWord(forDocs = false) {
    setBusy(true);
    setMessage('');
    try {
      const { generateProposalDocxBlob, getProposalExportFilename } = await import('@/lib/export/docx-export');
      const fonts = await Promise.all(['/fonts/Sarabun-Regular.ttf', '/fonts/Sarabun-Bold.ttf'].map(async path => {
        const response = await fetch(path);
        if (!response.ok) throw new Error('โหลดแบบอักษรไทยไม่สำเร็จ');
        return new Uint8Array(await response.arrayBuffer());
      }));
      const blob = await generateProposalDocxBlob({ ...input, fonts: { regular: fonts[0], bold: fonts[1] } });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getProposalExportFilename(input.title);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setShowDocs(forDocs);
      setMessage('ส่งไฟล์ Word ให้เบราว์เซอร์ดาวน์โหลดแล้ว');
    } catch {
      setMessage('ดาวน์โหลด Word ไม่สำเร็จ กรุณาลองใหม่ (ต้องโหลดแบบอักษรไทยได้)');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    setMessage('');
    setShareUrl('');
    try {
      const token = await encodeSharePayload(input);
      const url = `${window.location.origin}/share#${token}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setMessage('คัดลอกลิงก์อ่านอย่างเดียวแล้ว');
      } catch {
        setMessage('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกและคัดลอกลิงก์ด้านล่าง');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'สร้างลิงก์ไม่สำเร็จ กรุณาดาวน์โหลด Word หรือ PDF แทน');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="export-heading" className="rounded-3xl border border-accent/30 bg-surface p-5 space-y-4 min-w-0">
      <div>
        <h2 id="export-heading" className="font-bold text-ink">ส่งออก ข้อเสนอโครงงานและแผนงาน</h2>
        <p className="mt-1 text-caption text-ink-2 leading-relaxed">ส่งออกฉบับที่บันทึกแล้วเท่านั้น — กด “บันทึกการแก้ไข” ในแต่ละแท็บก่อนส่งออก ไม่เสียโควตา AI</p>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-callout text-ink-2 cursor-pointer">
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-indigo-600" checked={includeTemplates} disabled={busy} onChange={e => { setIncludeTemplates(e.target.checked); setShareUrl(''); }} />
        <span>แนบพอร์ต TCAS + Abstract ≤250 คำ + โครงร่าง Pitch 3 นาที</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button className={`${buttonClass} bg-accent text-white hover:bg-accent-press`} disabled={busy} onClick={() => {
          try { openPrintPreview(input); } catch { setMessage('เปิดหน้าพิมพ์ไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บในเบราว์เซอร์'); }
        }}><Printer aria-hidden className="h-4 w-4 shrink-0" />PDF / พิมพ์</button>
        <button className={actionClass} disabled={busy} onClick={() => downloadWord()}><FileDown aria-hidden className="h-4 w-4 shrink-0" />Word (.docx)</button>
        <button className={actionClass} disabled={busy} onClick={() => downloadWord(true)}><FileText aria-hidden className="h-4 w-4 shrink-0" />Google Docs</button>
        <button className={actionClass} disabled={busy || !shareConsent} onClick={share}><Link2 aria-hidden className="h-4 w-4 shrink-0" />ลิงก์อ่านอย่างเดียว</button>
      </div>
      <label className="flex gap-3 items-start min-h-[44px] text-caption leading-relaxed text-ink-2 cursor-pointer">
        <input className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" type="checkbox" checked={shareConsent} onChange={event => setShareConsent(event.target.checked)} />
        <span>ฉันตรวจแล้วว่าเอกสารไม่มีชื่อจริง โรงเรียน หรือข้อมูลส่วนตัว ทุกคนที่มีลิงก์อ่านและส่งต่อได้ ลิงก์เป็นสำเนา ณ ตอนนี้ ไม่อัปเดตตามการแก้ไข และเรียกคืนไม่ได้ ข้อมูลอยู่ในส่วน # ของ URL ไม่ส่งให้เซิร์ฟเวอร์</span>
      </label>
      {message && <p role="status" className="text-callout text-accent-text break-words">{message}</p>}
      {shareUrl && <label className="block text-caption text-ink-2">ลิงก์สำหรับคัดลอก
        <textarea readOnly aria-label="ลิงก์อ่านอย่างเดียว" className="mt-2 w-full min-w-0 rounded-xl border p-3 text-caption break-all" rows={3} value={shareUrl} onFocus={event => event.target.select()} />
      </label>}
      {showDocs && <div className="rounded-2xl bg-accent-tint p-4 text-callout text-ink-2 space-y-2">
        <h3 className="font-bold">เปิดใน Google Docs</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>เก็บไฟล์ .docx ที่ดาวน์โหลดไว้</li>
          <li>เปิด Google Drive → ใหม่ → อัปโหลดไฟล์ แล้วเลือกไฟล์ .docx</li>
          <li>คลิกขวาที่ไฟล์ → เปิดด้วย → Google เอกสาร</li>
        </ol>
        <a className="inline-flex items-center min-h-[44px] underline font-semibold text-accent-text" href="https://drive.google.com/drive/u/0/my-drive" target="_blank" rel="noopener noreferrer">เปิด Google Drive เพื่อนำเข้า</a>
        <p className="text-caption">การนำเข้าเอกสารไม่ขอสิทธิ์ Drive และแอปไม่อัปโหลดให้ คุณส่งไฟล์ไปยัง Google เอง การเข้าสู่ระบบแอปเป็นอีกตัวเลือกหนึ่ง ไม่จำเป็นสำหรับส่งออก</p>
      </div>}
    </section>
  );
}
