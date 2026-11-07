'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { decodeSharePayload } from '@/lib/export/share-link';
import { printProposal, takePrintSnapshot } from '@/lib/export/pdf-export';
import type { ExportSnapshot } from '@/lib/export/snapshot';
import { ProposalDocument } from './ProposalDocument';
import './document.css';

export function DocumentReader({ mode }: { mode: 'share' | 'print' }) {
  const [snapshot, setSnapshot] = useState<ExportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const printSnapshot = useRef<ExportSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    // Do not initialize or read the learner store on shared documents.
    async function load() {
      setSnapshot(null);
      setLoading(true);
      setError('');
      try {
        if (mode === 'print' && printSnapshot.current === undefined) printSnapshot.current = takePrintSnapshot();
        const data = mode === 'share'
          ? await decodeSharePayload(window.location.hash.slice(1))
          : printSnapshot.current ?? null;
        if (!cancelled) {
          setSnapshot(data);
          if (!data) setError('ไม่พบฉบับสำหรับพิมพ์ กรุณากลับไปส่งออกจากหน้า Proposal อีกครั้ง');
        }
      } catch {
        if (!cancelled) setError(mode === 'share'
          ? 'เปิดลิงก์ไม่ได้ ลิงก์อาจไม่ครบ เสียหาย ใหญ่เกิน หรือเป็นเวอร์ชันที่ยังไม่รองรับ กรุณาขอลิงก์ใหม่'
          : 'เปิดฉบับสำหรับพิมพ์ไม่ได้ กรุณาส่งออกใหม่');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    if (mode === 'share') window.addEventListener('hashchange', load);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', load);
    };
  }, [mode]);

  useEffect(() => {
    if (snapshot) document.title = `${snapshot.proposal.title || snapshot.title || 'Proposal'} — Project Edu`;
  }, [snapshot]);

  async function print() {
    setPrinting(true);
    setError('');
    try { await printProposal(); }
    catch { setError('โหลดแบบอักษรไทยไม่สำเร็จ กรุณาเชื่อมต่อแล้วลองพิมพ์อีกครั้ง'); }
    finally { setPrinting(false); }
  }

  return (
    <main className="document-reader max-w-4xl mx-auto px-4 py-6 sm:p-8 space-y-5">
      <header className="print-controls rounded-2xl border border-accent/30 bg-surface p-4 space-y-3">
        <h1 className="text-headline font-bold">{mode === 'share' ? 'สำเนาอ่านอย่างเดียว — ข้อเสนอโครงงานและแผนงาน' : 'ตัวอย่างก่อนพิมพ์ / ดาวน์โหลด PDF'}</h1>
        <p className="text-callout text-ink-2 leading-relaxed">{mode === 'share'
          ? 'สำเนานี้ไม่เชื่อมกับพื้นที่ทำงาน แก้ไขไม่ได้ และไม่เปลี่ยนตามต้นฉบับ ผู้มีลิงก์สามารถอ่านและส่งต่อได้'
          : 'เลือก “บันทึกเป็น PDF / Save as PDF” ในหน้าต่างพิมพ์ ขนาด A4 ปิดหัวกระดาษ/ท้ายกระดาษเพื่อไม่พิมพ์ URL — Proposal แบบย่อ 1 หน้า และ Plan แยกหน้า เนื้อหายาวอาจใช้หลายหน้าโดยไม่ตัดข้อความ'}</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={!snapshot || printing} onClick={print} className="min-h-[44px] px-4 py-2 rounded-xl bg-accent text-white font-semibold disabled:opacity-50">{printing ? 'กำลังเตรียมแบบอักษรไทย...' : 'พิมพ์ / บันทึกเป็น PDF'}</button>
          <Link className="inline-flex items-center min-h-[44px] px-4 text-callout text-accent-text underline" href="/proposal">กลับไปพื้นที่ทำงานของฉัน</Link>
        </div>
      </header>
      {loading && <p role="status">กำลังเปิดเอกสาร...</p>}
      {error && <p className="print-controls text-callout rounded-xl bg-caution-tint text-caution p-4" role="alert">{error}</p>}
      {snapshot && <ProposalDocument snapshot={snapshot} />}
    </main>
  );
}
