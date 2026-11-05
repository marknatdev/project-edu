'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ProjectToolWorkspace } from '@/components/project/ProjectToolWorkspace';
import { CompetitionCalendar } from '@/components/calendar/CompetitionCalendar';
import { AppShell } from '@/components/shell/AppShell';

export default function CalendarPage() {
  return <AppShell><div className="mx-auto max-w-3xl space-y-5">
    <header><p className="text-xs font-semibold text-indigo-600">เตรียมแข่ง • วางแผนล่วงหน้า</p><h1 className="mt-1 text-2xl font-extrabold font-prompt">ปฏิทินแข่ง & แผนรายสัปดาห์</h1><p className="mt-2 text-sm text-slate-600">สำรวจช่วงของแต่ละเวที แล้วกลับไปจัดแผนงานของโครงงานตามวันส่งที่ตรวจสอบแล้ว</p></header>
    <Suspense fallback={<p>กำลังโหลดโครงงาน…</p>}><ProjectToolWorkspace>{({ project }) => <>
      {project && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <h2 className="font-bold text-emerald-950 break-words">แผนงานของ {project.title}</h2>
        <p className="text-sm text-emerald-900">{project.plan.totalWeeks} สัปดาห์ • เสร็จแล้ว {project.plan.milestones.filter((m) => m.completed).length}/{project.plan.milestones.length} งาน</p>
        <p className="text-xs text-emerald-900">วันส่งใน Plan: {new Date(project.plan.targetDeadline).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })} • วันที่ผู้เรียนตั้งไว้ ไม่ใช่กำหนดจากผู้จัด</p>
        <Link href={`/proposal?projectId=${encodeURIComponent(project.id)}&tab=plan`} className="min-h-11 inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">เปิดแผนงานรายสัปดาห์ →</Link>
      </section>}
      <CompetitionCalendar />
    </>}</ProjectToolWorkspace></Suspense>
  </div></AppShell>;
}
