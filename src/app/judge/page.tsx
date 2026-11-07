'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { ProjectToolWorkspace } from '@/components/project/ProjectToolWorkspace';
import { JudgePractice } from '@/components/judge/JudgePractice';

export default function JudgePage() {
  return <AppShell><div className="mx-auto min-w-0 max-w-2xl">
    <Suspense fallback={<p role="status">กำลังโหลดโครงงาน…</p>}><ProjectToolWorkspace view="judge" intro="ฝึกอธิบายไอเดียของคุณด้วยเหตุผลและหลักฐาน ไม่ใช่ท่องคำตอบสำเร็จรูป">{({ project, lockSelection }) => project && <JudgePractice key={project.id} project={project} lockSelection={lockSelection} />}</ProjectToolWorkspace></Suspense>
  </div></AppShell>;
}
