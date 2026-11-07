'use client';

import { useEffect, useState } from 'react';
import { decodeAdvisorRequest, type AdvisorRequest } from '@/lib/advisor-review/codec';
import { ProposalDocument } from '@/components/export/ProposalDocument';
import { AdvisorDecisionForm } from './AdvisorDecisionForm';
import '@/components/export/document.css';

/** Intentionally isolated from the learner store, login, and workspace navigation. */
export function AdvisorReader() {
  const [request, setRequest] = useState<AdvisorRequest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let generation = 0;
    let cancelled = false;
    async function load() {
      const current = ++generation;
      setRequest(null); setError(''); setLoading(true);
      try {
        const decoded = await decodeAdvisorRequest(window.location.hash.slice(1));
        if (!cancelled && current === generation) setRequest(decoded);
      } catch { if (!cancelled && current === generation) setError('เปิดคำขอตรวจไม่ได้ ลิงก์อาจเสียหาย ไม่ครบ หรือใหญ่เกิน กรุณาขอลิงก์ใหม่จากนักเรียน'); }
      finally { if (!cancelled && current === generation) setLoading(false); }
    }
    void load(); window.addEventListener('hashchange', load);
    return () => { cancelled = true; window.removeEventListener('hashchange', load); };
  }, []);
  return <main className="document-reader mx-auto max-w-4xl px-4 py-6 sm:p-8 space-y-5">
    <header className="print-controls rounded-3xl bg-accent p-5 text-white space-y-2">
      <p className="text-caption font-bold text-accent-tint">ADVISOR REVIEW · ไม่ต้องล็อกอิน</p>
      <h1 className="text-xl font-bold">สำเนาอ่านอย่างเดียวสำหรับครูที่ปรึกษา</h1>
      <p className="text-callout leading-relaxed">Proposal + Plan และเทมเพลต ณ ตอนส่งตรวจ แก้ไขไม่ได้ ไม่เชื่อมกับพื้นที่ทำงาน ไม่มีระบบส่งผลอัตโนมัติหรือยืนยันตัวตน ใครที่มีลิงก์ก็อ่านและสร้างผลตอบกลับได้ ไม่ใช่อนุมัติความปลอดภัยหรือเกณฑ์การแข่งขัน</p>
    </header>
    {loading && <p role="status">กำลังเปิดสำเนาเอกสาร…</p>}
    {error && <p role="alert" className="rounded-xl bg-caution-tint p-4 text-callout text-caution">{error}</p>}
    {request && <><ProposalDocument snapshot={request.snapshot} /><AdvisorDecisionForm key={request.requestId} request={request} /></>}
  </main>;
}
