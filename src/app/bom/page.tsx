'use client';

import { Suspense } from 'react';
import { ProjectToolWorkspace } from '@/components/project/ProjectToolWorkspace';
import { BomEditor } from '@/components/bom/BomEditor';
import { AppShell } from '@/components/shell/AppShell';

export default function BomPage() {
  return <AppShell><div className="mx-auto max-w-2xl space-y-5">
    <header><p className="text-caption font-semibold text-accent-text">เตรียมโครงงาน</p><h1 className="mt-1 text-2xl font-semibold">งบประมาณ & อุปกรณ์ (BOM)</h1><p className="mt-2 text-callout text-ink-2">สำรวจวัสดุที่ต้องใช้ ลองใช้ของในโรงเรียนแทน แล้วดูว่างบพอหรือยัง</p></header>
    <Suspense fallback={<p>กำลังโหลดโครงงาน…</p>}><ProjectToolWorkspace>{({ project, budgetBaht, lockSelection }) => project && <BomEditor key={project.id} project={project} budgetBaht={budgetBaht} lockSelection={lockSelection} />}</ProjectToolWorkspace></Suspense>
  </div></AppShell>;
}
