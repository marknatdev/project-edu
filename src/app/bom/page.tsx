'use client';

import { Suspense } from 'react';
import { ProjectToolWorkspace } from '@/components/project/ProjectToolWorkspace';
import { BomEditor } from '@/components/bom/BomEditor';
import { AppShell } from '@/components/shell/AppShell';

export default function BomPage() {
  return <AppShell><div className="mx-auto max-w-2xl">
    <Suspense fallback={<p>กำลังโหลดโครงงาน…</p>}><ProjectToolWorkspace view="bom" intro="สำรวจวัสดุที่ต้องใช้ ลองใช้ของในโรงเรียนแทน แล้วดูว่างบพอหรือยัง">{({ project, budgetBaht, lockSelection }) => project && <BomEditor key={project.id} project={project} budgetBaht={budgetBaht} lockSelection={lockSelection} />}</ProjectToolWorkspace></Suspense>
  </div></AppShell>;
}
