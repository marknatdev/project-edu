'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { VariableIsolatorCanvas } from '@/components/variables/VariableIsolatorCanvas';
import { SafetyChecklist } from '@/components/safety/SafetyChecklist';
import { getActiveProject, getIdea, getIdeas, saveIdea } from '@/lib/storage/store';
import { screenIdea } from '@/lib/safety/screener';
import type { Idea } from '@/types/domain';

function VariablesContent() {
  const params = useSearchParams();
  const ideaId = params.get('ideaId');
  const [idea, setIdea] = useState<Idea | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const active = getActiveProject();
    const ideas = getIdeas();
    setIdea(ideaId ? getIdea(ideaId) : (active ? getIdea(active.ideaId) : ideas.at(-1) ?? null));
    setReady(true);
  }, [ideaId]);

  function persist(patch: Partial<Pick<Idea, 'isolator' | 'safetyChecklist'>>): boolean {
    if (!idea) return false;
    try {
      const latest = getIdea(idea.id);
      if (!latest) throw new Error('Idea missing');
      const updated = { ...latest, ...patch, updatedAt: new Date().toISOString() };
      saveIdea(updated);
      setIdea(updated);
      setMessage('บันทึกบนเครื่องนี้แล้ว • หากแก้ตัวแปร ให้กดประเมินใหม่ในหน้าประเมิน');
      return true;
    } catch {
      setMessage('บันทึกไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บและลองอีกครั้ง');
      return false;
    }
  }

  if (!ready) return <p className="p-6 text-callout">กำลังโหลดไอเดีย...</p>;
  if (!idea) return <div className="mx-auto max-w-xl space-y-4 p-4">
    <h1 className="text-xl font-bold">ยังไม่พบไอเดียสำหรับตารางแยกตัวแปร</h1>
    <Link href="/idea" className="inline-flex min-h-[44px] items-center rounded-xl bg-accent px-4 text-white">พัฒนาไอเดียกับครูที่ปรึกษา</Link>
  </div>;

  return <div className="mx-auto max-w-4xl space-y-5 pb-24 break-words">
    <p className="rounded-2xl border border-accent/30 bg-surface p-4 text-callout text-ink-2">ไอเดีย: <strong>{idea.title}</strong></p>
    <VariableIsolatorCanvas key={idea.id} idea={idea} onSave={(isolator) => persist({ isolator })} />
    {message && <p role="status" className="rounded-2xl border border-accent/30 bg-surface p-3 text-callout">{message}</p>}
    <SafetyChecklist flags={screenIdea(idea)} completed={idea.safetyChecklist ?? []} onChange={(safetyChecklist) => persist({ safetyChecklist })} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Link className="flex min-h-[44px] items-center justify-center rounded-2xl bg-accent p-3 text-callout font-bold text-white" href={`/evaluation?ideaId=${encodeURIComponent(idea.id)}`}>ไปประเมิน 5 ด้าน →</Link>
      <Link className="flex min-h-[44px] items-center justify-center rounded-2xl border border-accent/30 bg-surface p-3 text-callout font-bold text-accent-text" href={`/proposal?ideaId=${encodeURIComponent(idea.id)}`}>ร่าง Proposal ต่อ (ไม่ปิดกั้น)</Link>
    </div>
  </div>;
}

export default function VariablesPage() {
  return <AppShell><Suspense fallback={<p className="p-4">กำลังโหลด...</p>}><VariablesContent /></Suspense></AppShell>;
}
