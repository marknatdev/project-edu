'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ProjectToolWorkspace } from '@/components/project/ProjectToolWorkspace';
import { CompetitionCalendar } from '@/components/calendar/CompetitionCalendar';
import { AppShell } from '@/components/shell/AppShell';

export default function CalendarPage() {
  return <AppShell><div className="mx-auto max-w-2xl">
    <Suspense fallback={<p>กำลังโหลดโครงงาน…</p>}><ProjectToolWorkspace view="calendar" intro="ดูช่วงเวลาของแต่ละเวที แล้วจัดแผนงานให้ทันวันส่ง">{({ project }) => <>
      {project && <section className="rounded-2xl border border-good/30 bg-good-tint p-4 space-y-3">
        <h2 className="font-bold text-good break-words">แผนงานของ {project.title}</h2>
        <p className="text-callout text-good">{project.plan.totalWeeks} สัปดาห์ • เสร็จแล้ว {project.plan.milestones.filter((m) => m.completed).length}/{project.plan.milestones.length} งาน</p>
        <p className="text-caption text-good">วันส่งใน Plan: {new Date(project.plan.targetDeadline).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })} • วันที่ผู้เรียนตั้งไว้ ไม่ใช่กำหนดจากผู้จัด</p>
        <Link href={`/proposal?projectId=${encodeURIComponent(project.id)}&tab=plan`} className="min-h-11 inline-flex items-center rounded-xl bg-good px-4 py-2 text-callout font-semibold text-white">เปิดแผนงานรายสัปดาห์ →</Link>
      </section>}
      <CompetitionCalendar />
    </>}</ProjectToolWorkspace></Suspense>
  </div></AppShell>;
}
