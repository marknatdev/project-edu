'use client';

import { useEffect, useState } from 'react';
import { COMPETITION_SEASONS } from '@/data/competitions';
import { approximateWindow, thailandToday } from '@/lib/calendar/countdown';

export function CompetitionCalendar() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  if (!now) return <p role="status">กำลังคำนวณช่วงเวลา…</p>;

  return <section className="space-y-4" aria-label="ช่วงวางแผนเวทีแข่งขัน">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
      <p className="font-bold">⚠️ ทุกช่วงเป็นค่าประมาณเพื่อวางแผน ไม่ใช่วันรับสมัครทางการ</p>
      <p>นับถึงต้น/ปลายเดือนโดยประมาณ ไม่ใช่วันปิดรับสมัคร และไม่ยืนยันว่ากำลังเปิดรับสมัคร ต้องตรวจประกาศผู้จัดปีล่าสุดและปรึกษาครูก่อนเสมอ</p>
      <p className="text-xs">วันนี้ {thailandToday(now)} • เวลาไทย (Asia/Bangkok) • ช่วงที่ผ่านแล้วแสดงรอบวางแผนปีถัดไป</p>
    </div>
    <ul className="grid gap-4 sm:grid-cols-2">
      {COMPETITION_SEASONS.map((competition) => {
        const window = approximateWindow(competition, now);
        return <li key={competition.id} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm flex flex-col gap-3">
          <div><span className="inline-flex rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">โดยประมาณ • ยังไม่ยืนยันรอบนี้</span><h2 className="mt-2 font-extrabold text-lg text-slate-900">{competition.name}</h2><p className="text-xs text-slate-500">{competition.stage}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold text-indigo-700">{competition.windowLabel} {Number(window.start.slice(0, 4)) + 543} (ประมาณ)</p><p className="mt-1 text-lg font-bold text-slate-900">~{window.days} วัน</p><p className="text-xs text-slate-600">{window.phase === 'upcoming' ? 'ถึงต้นช่วงวางแผนโดยประมาณ' : 'ถึงปลายช่วงวางแผนโดยประมาณ'}<br />ไม่ใช่วันปิดรับสมัคร</p></div>
          <p className="text-xs leading-relaxed text-slate-600 flex-1">{competition.note}</p>
          <a href={competition.sourceUrl} target="_blank" rel="noopener noreferrer" className="min-h-11 flex items-center rounded-xl border border-indigo-100 p-2 text-xs font-semibold text-indigo-700 break-words">ตรวจประกาศผู้จัด ↗<br />{competition.sourceLabel}</a>
          <p className="text-[11px] text-slate-500">แหล่งอ้างอิง RESEARCH.md §11 • ตรวจเมื่อ {competition.checkedOn}</p>
        </li>;
      })}
    </ul>
  </section>;
}
