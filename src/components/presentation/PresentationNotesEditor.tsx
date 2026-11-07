'use client';

import { useState } from 'react';
import { EMPTY_PRESENTATION_NOTES, type PresentationNotes } from '@/lib/presentation/notes';

const fields: { key: keyof PresentationNotes; label: string; hint: string }[] = [
  { key: 'role', label: 'บทบาทที่ลงมือทำจริง', hint: 'ทำส่วนไหนเอง และมีหลักฐานใด (ไม่ใส่ชื่อบุคคล)' },
  { key: 'skills', label: 'ทักษะที่ได้ฝึก', hint: 'ระบุจากประสบการณ์จริง ไม่คัดคำโฆษณา' },
  { key: 'targetField', label: 'สาขาที่สนใจ & ความเชื่อมโยง', hint: 'ไม่ต้องใส่ชื่อโรงเรียนหรือสถาบัน' },
  { key: 'results', label: 'ผลที่ได้จริง / สถานะการทดลอง', hint: 'หากยังไม่ได้ทดลองให้เขียนว่ายังเป็นแผน แยกผลจริงจากสมมติฐาน' },
  { key: 'learning', label: 'สิ่งที่เรียนรู้ ข้อจำกัด & ขั้นต่อไป', hint: 'พบอะไรที่ไม่เป็นไปตามคาด และจะปรับอย่างไร' },
];

export function PresentationNotesEditor({ notes, onSave }: { notes: PresentationNotes | null; onSave: (notes: PresentationNotes) => boolean | void }) {
  const [draft, setDraft] = useState(notes ?? EMPTY_PRESENTATION_NOTES);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(notes ?? EMPTY_PRESENTATION_NOTES);
  return <details className="rounded-2xl border border-accent/30 bg-surface p-4">
    <summary className="min-h-11 cursor-pointer font-semibold text-callout text-accent-text py-3">เติมบทบาท ทักษะ และผลจริงด้วยตนเอง</summary>
    <form className="mt-3 space-y-4" onSubmit={e => {
      e.preventDefault(); setMessage(''); setError('');
      try {
        const ok = onSave(draft);
        if (ok === false) {
          setDraft(EMPTY_PRESENTATION_NOTES);
          setError('โครงงานถูกลบแล้ว จึงไม่บันทึกข้อความลงพื้นที่จัดเก็บ');
          return;
        }
        setMessage('บันทึกข้อความของคุณแล้ว เทมเพลตและไฟล์ส่งออกใช้ฉบับนี้');
      }
      catch { setError('ยังไม่บันทึก กรุณาตรวจพื้นที่จัดเก็บและลองใหม่ ข้อความที่พิมพ์ยังอยู่'); }
    }}>
      <p className="text-caption text-ink-2">ไม่บังคับกรอก เว้นว่างได้ แอปจะไม่แต่งข้อมูลแทนคุณ เก็บแยกตาม Project ในเบราว์เซอร์นี้ ไม่ใส่ชื่อจริง โรงเรียน หรือข้อมูลติดต่อ</p>
      {fields.map(field => <label key={field.key} className="block text-callout font-semibold">{field.label}
        <textarea rows={3} maxLength={1500} aria-label={field.label} className="mt-2 w-full min-w-0 rounded-xl border border-separator p-3 text-callout font-normal" value={draft[field.key]} placeholder={field.hint} onChange={e => { setDraft({ ...draft, [field.key]: e.target.value }); setMessage(''); }} />
      </label>)}
      <p className="text-caption text-ink-3">{dirty ? 'มีข้อความยังไม่บันทึก — บันทึกก่อนเปลี่ยนแท็บ/โครงงานหรือส่งออก' : 'ใช้ข้อความที่บันทึกแล้วเท่านั้น'}</p>
      <button className="min-h-11 w-full rounded-xl bg-accent px-4 py-3 text-callout font-semibold text-white" type="submit">บันทึกข้อความประกอบพอร์ต & Pitch</button>
      {message && <p role="status" className="text-callout text-good">{message}</p>}
      {error && <p role="alert" className="text-callout text-risk">{error}</p>}
    </form>
  </details>;
}
