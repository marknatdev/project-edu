'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/types/domain';
import { advisorReviewMatches, beginAdvisorReview, importAdvisorDecision, readAdvisorReview, type AdvisorReviewRecord } from '@/lib/advisor-review/review-store';

const button = 'min-h-11 rounded-xl px-4 py-3 text-callout font-semibold disabled:opacity-50';

export function AdvisorReviewPanel({ project }: { project: Project }) {
  const [record, setRecord] = useState<AdvisorReviewRecord | null>(null);
  const [matches, setMatches] = useState(false);
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [returnCode, setReturnCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const saved = readAdvisorReview(project.id);
        const isCurrent = saved ? await advisorReviewMatches(project, saved) : false;
        if (!cancelled) { setRecord(saved); setMatches(isCurrent); }
      } catch { if (!cancelled) setError('อ่านบันทึกการตรวจไม่ได้ จึงไม่เขียนทับข้อมูลเดิม กรุณาตรวจพื้นที่จัดเก็บ'); }
      finally { if (!cancelled) setReady(true); }
    }
    void load();
    if (window.location.hash.startsWith('#advisor=')) setReturnCode(window.location.href);
    return () => { cancelled = true; };
  }, [project]);

  async function share() {
    setBusy(true); setError(''); setMessage(''); setShareUrl('');
    try {
      const token = await beginAdvisorReview(project.id);
      const url = `${window.location.origin}/advisor-review#${token}`;
      setRecord(readAdvisorReview(project.id)); setMatches(true); setShareUrl(url);
      setMessage('สร้างคำขอตรวจใหม่แล้ว รหัสจากคำขอเก่าจะใช้ไม่ได้ ส่งลิงก์นี้ให้ครูด้วยตนเอง');
    } catch { setError('สร้างลิงก์ไม่ได้ อาจเก็บข้อมูลไม่ได้หรือเอกสารใหญ่เกิน ลองใหม่หรือส่งไฟล์ให้ครูตรวจนอกแอป'); }
    finally { setBusy(false); }
  }
  async function receive() {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await importAdvisorDecision(project.id, returnCode);
      setRecord(saved); setMatches(true); setReturnCode('');
      setMessage('บันทึกผลตอบกลับในอุปกรณ์นี้แล้ว — ยังไม่ได้ยืนยันตัวตนครู');
      if (window.location.hash.startsWith('#advisor=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { setError(e instanceof Error ? e.message : 'นำเข้าผลไม่สำเร็จ โปรดลองใหม่'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="advisor-heading" className="rounded-3xl border border-accent/30 bg-surface p-5 space-y-4 min-w-0">
    <h2 id="advisor-heading" className="text-lg font-bold">ครูที่ปรึกษาตรวจ & ส่งผลกลับ</h2>
    <div className="rounded-2xl border border-caution/30 bg-caution-tint p-4 text-callout leading-relaxed text-caution">
      <p className="font-bold">ไม่มีระบบหลังบ้าน · ไม่ยืนยันตัวตน · ไม่ใช่ลายเซ็นดิจิทัล</p>
      <p>ครูเปิดสำเนาอ่านอย่างเดียวโดยไม่ล็อกอิน ให้ความเห็นแล้วส่งรหัส/ลิงก์กลับ นักเรียนต้องวางรหัสที่นี่จึงบันทึกผลได้ ไม่ซิงก์อัตโนมัติ และใครที่มีลิงก์ก็สร้างผลตอบกลับได้</p>
      <p className="mt-2">“อนุมัติ” หมายถึงผลตอบกลับต่อเอกสารฉบับนี้เท่านั้น ไม่ใช่อนุมัติความปลอดภัย SRC/IRB หรือรับรองการสมัครแข่งขัน ต้องยืนยันกับครูจริงก่อนลงมือทดลอง</p>
    </div>
    <div className="rounded-2xl bg-surface-2 p-4 text-callout" aria-live="polite">
      <p className="font-bold">สถานะ: {!ready ? 'กำลังโหลด…' : !record ? 'ยังไม่ได้ส่งตรวจ' : !matches ? 'เอกสารเปลี่ยนแล้ว — ต้องส่งตรวจใหม่' : !record.decision ? 'รอวางรหัสส่งกลับจากครู' : record.decision.decision === 'approved' ? 'ได้รับผล “อนุมัติ” (ไม่ยืนยันตัวตน)' : 'ได้รับผล “ขอให้แก้ไข” (ไม่ยืนยันตัวตน)'}</p>
      {record?.decision && <div className="mt-2 space-y-1 break-words">
        {!matches && <p>ผลเก่าด้านล่างไม่ครอบคลุมฉบับปัจจุบัน</p>}
        <p className="whitespace-pre-wrap">ความเห็น: {record.decision.comment || '(ไม่มีความเห็น)'}</p>
        <p className="text-caption text-ink-3">เวลาที่ผู้ตอบระบุ: {new Date(record.decision.decidedAt).toLocaleString('th-TH')} (ไม่ได้ตรวจสอบ)</p>
      </div>}
    </div>
    <label className="flex min-h-11 gap-3 items-start text-callout cursor-pointer leading-relaxed">
      <input className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
      <span>ตรวจแล้วว่า Proposal + Plan และเทมเพลตไม่มีชื่อจริง โรงเรียน หรือข้อมูลส่วนตัว ทุกคนที่มีลิงก์อ่านและส่งต่อได้ เป็นสำเนาไม่อัปเดตและเรียกคืนไม่ได้ เนื้อหาอยู่ใน # ของ URL ไม่ส่งให้เซิร์ฟเวอร์ การสร้างคำขอใหม่แทนคำขอเดิม</span>
    </label>
    <button className={`${button} w-full bg-accent text-white`} disabled={busy || !consent || !ready} onClick={share}>สร้างลิงก์ส่งครูตรวจฉบับที่บันทึกแล้ว</button>
    {shareUrl && <label className="block text-caption font-semibold">ลิงก์ส่งครูตรวจ (เลือกทั้งหมดเพื่อคัดลอก)
      <textarea aria-label="ลิงก์ส่งครูตรวจ" readOnly rows={3} className="mt-2 w-full min-w-0 rounded-xl border p-3 text-caption break-all" value={shareUrl} onFocus={e => e.target.select()} />
    </label>}
    <label className="block text-callout font-semibold">วางรหัส / ลิงก์ที่ครูส่งกลับ
      <textarea aria-label="รหัสส่งกลับจากครู" rows={3} maxLength={12000} className="mt-2 w-full min-w-0 rounded-xl border p-3 text-caption break-all" value={returnCode} onChange={e => setReturnCode(e.target.value)} placeholder="วางรหัสในโครงงานที่ส่งตรวจนี้เท่านั้น" />
    </label>
    <button className={`${button} w-full bg-good text-white`} disabled={busy || !returnCode.trim() || !ready} onClick={receive}>ตรวจฉบับ & บันทึกผลตอบกลับ</button>
    {message && <p role="status" className="text-callout text-accent-text">{message}</p>}
    {error && <p role="alert" className="text-callout text-risk break-words">{error}</p>}
  </section>;
}
