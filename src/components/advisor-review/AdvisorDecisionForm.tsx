'use client';

import { useState } from 'react';
import { encodeAdvisorDecision, type AdvisorRequest } from '@/lib/advisor-review/codec';

export function AdvisorDecisionForm({ request }: { request: AdvisorRequest }) {
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState('');
  const [decision, setDecision] = useState('');
  const [message, setMessage] = useState('');
  function respond(value: 'approved' | 'revision') {
    const code = encodeAdvisorDecision({ version: 1, requestId: request.requestId, fingerprint: request.fingerprint,
      comment: comment.trim(), decision: value, decidedAt: new Date().toISOString() });
    setResult(code); setDecision(value === 'approved' ? 'อนุมัติ' : 'ขอให้แก้ไข'); setMessage('');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(result); setMessage('คัดลอกรหัสส่งกลับแล้ว'); }
    catch { setMessage('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกรหัสด้านล่างเพื่อคัดลอกด้วยตนเอง'); }
  }
  return <section className="print-controls rounded-3xl border border-accent/30 bg-surface p-5 space-y-4" aria-label="ส่งผลตรวจกลับนักเรียน">
    <h2 className="text-lg font-bold">ให้ความเห็นต่อเอกสารฉบับนี้</h2>
    <p className="text-callout text-ink-2">ไม่เก็บชื่อครูหรือโรงเรียน ไม่ยืนยันตัวตน ผลนี้ไม่ใช่ลายเซ็นดิจิทัลหรืออนุมัติ SRC/IRB ปุ่มด้านล่างสร้างรหัสเท่านั้น ไม่ส่งผลไปหานักเรียนอัตโนมัติ</p>
    <label className="block text-callout font-semibold">ความเห็น (ไม่ใส่ชื่อจริง / โรงเรียน / ข้อมูลติดต่อ)
      <textarea aria-label="ความเห็นครูที่ปรึกษา" rows={4} maxLength={1500} className="mt-2 w-full min-w-0 rounded-xl border p-3 text-callout" value={comment} onChange={e => { setComment(e.target.value); setResult(''); }} />
    </label>
    <label className="flex items-start min-h-11 gap-3 text-callout leading-relaxed cursor-pointer">
      <input type="checkbox" checked={consent} className="h-5 w-5 mt-1 shrink-0 accent-indigo-600" onChange={e => { setConsent(e.target.checked); setResult(''); }} />
      <span>ตรวจแล้วว่าความเห็นไม่มีข้อมูลส่วนบุคคล และเข้าใจว่าต้องส่งรหัสกลับให้นักเรียนเอง</span>
    </label>
    <div className="grid grid-cols-2 gap-2">
      <button className="min-h-11 rounded-xl bg-good px-3 py-3 text-callout font-semibold text-white disabled:opacity-50" disabled={!consent} onClick={() => respond('approved')}>อนุมัติเอกสาร</button>
      <button className="min-h-11 rounded-xl bg-accent px-3 py-3 text-callout font-semibold text-white disabled:opacity-50" disabled={!consent || !comment.trim()} onClick={() => respond('revision')}>ขอให้แก้ไข</button>
    </div>
    <p className="text-caption text-ink-3">หากขอให้แก้ไข กรุณาระบุความเห็นเพื่อให้นักเรียนรู้ว่าควรปรับอะไร</p>
    {result && <div className="space-y-3 rounded-2xl bg-accent-tint p-4 text-callout">
      <p role="status" className="font-bold">สร้างผล “{decision}” แล้ว — ยังไม่ส่งให้นักเรียน</p>
      <p>ส่งรหัสหรือลิงก์ด้านล่างให้นักเรียนผ่านช่องทางที่ใช้อยู่ นักเรียนต้องเลือกโครงงานเดิมแล้วกดบันทึกผลตอบกลับ</p>
      <button className="min-h-11 rounded-xl bg-accent px-4 py-3 text-white font-semibold" onClick={copy}>คัดลอกรหัสส่งกลับ</button>
      <label className="block text-caption font-semibold">รหัสส่งกลับ
        <textarea aria-label="รหัสส่งกลับให้นักเรียน" readOnly rows={4} className="mt-2 w-full min-w-0 rounded-xl border p-3 text-caption break-all" value={result} onFocus={e => e.target.select()} />
      </label>
      <label className="block text-caption font-semibold">ลิงก์ส่งกลับ
        <textarea aria-label="ลิงก์ส่งกลับให้นักเรียน" readOnly rows={3} className="mt-2 w-full min-w-0 rounded-xl border p-3 text-caption break-all" value={`${window.location.origin}/proposal#advisor=${result}`} onFocus={e => e.target.select()} />
      </label>
      {message && <p role="status">{message}</p>}
    </div>}
  </section>;
}
