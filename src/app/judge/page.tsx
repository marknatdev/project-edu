'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { ProjectToolWorkspace } from '@/components/project/ProjectToolWorkspace';
import { JudgePractice } from '@/components/judge/JudgePractice';

export default function JudgePage() {
  return <AppShell><div className="mx-auto max-w-3xl space-y-5 min-w-0">
    <header><p className="text-xs font-bold text-pink-600">MOCK JUDGE · Q&A</p><h1 className="mt-2 text-2xl font-extrabold">ซ้อมตอบคำถามกรรมการ</h1><p className="mt-2 text-sm text-slate-600">ฝึกอธิบาย Idea ของคุณด้วยเหตุผล หลักฐาน และความเข้าใจ ไม่ใช่ท่องคำตอบสำเร็จรูป</p></header>
    <Suspense fallback={<p role="status">กำลังโหลดโครงงาน…</p>}><ProjectToolWorkspace>{({ project, lockSelection }) => project && <JudgePractice key={project.id} project={project} lockSelection={lockSelection} />}</ProjectToolWorkspace></Suspense>
  </div></AppShell>;
}
