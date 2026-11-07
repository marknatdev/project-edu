'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Compass, Download, FileText, Gauge, MessageCircle, type LucideIcon } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { getActiveProject, getEvaluations, getIdeas, getInterview } from '@/lib/storage/store';
import { journeySteps, type JourneyStep } from '@/lib/journey';

const ICON: Record<JourneyStep['key'], LucideIcon> = { topic: Compass, coach: MessageCircle, evaluate: Gauge, proposal: FileText, export: Download };
const STATUS_TH = { done: 'เสร็จแล้ว', current: 'ทำต่อที่นี่', todo: 'ยังไม่เริ่ม' } as const;
const NEXT_TH: Record<JourneyStep['key'], string> = {
  topic: 'ตอบคำถามสั้น ๆ แล้วเลือกการ์ดไอเดียที่สนใจ',
  coach: 'คุยกับครูที่ปรึกษาเพื่อทำให้ไอเดียเป็นของคุณ',
  evaluate: 'ดูจุดแข็งและสิ่งที่ควรปรับใน 5 ด้าน',
  proposal: 'เรียบเรียงข้อเสนอโครงงานและแผนรายสัปดาห์',
  export: 'ส่งออก PDF หรือ Word ให้ครูตรวจ',
};

/** Home hub (Figma "H หน้าหลัก"): where you are in five steps and one "ทำต่อ" action. */
export default function HomePage() {
  const [steps, setSteps] = useState<JourneyStep[] | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    const ideas = [...getIdeas()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const project = getActiveProject();
    const latest = ideas[0] ?? null;
    setTitle(project?.title ?? latest?.title ?? null);
    setSteps(journeySteps({
      hasInterview: Boolean(getInterview()),
      latestIdeaId: latest?.id ?? null,
      hasEvaluation: latest ? getEvaluations().some(e => e.ideaId === latest.id) : false,
      activeProjectId: project?.id ?? null,
    }));
  }, []);

  const current = steps?.find(s => s.status === 'current') ?? steps?.[steps.length - 1];
  const index = current && steps ? steps.indexOf(current) : 0;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <header>
          <h1 className="text-large-title">{title ? 'ทำโครงงานต่อ' : 'เริ่มโครงงานแรก'}</h1>
          <p className="text-callout text-ink-2 [overflow-wrap:anywhere]">{title ? `โครงงานของคุณ: ${title}` : 'ทำทีละขั้น ตั้งแต่หาหัวข้อจนส่งข้อเสนอให้ครู'}</p>
        </header>

        {!steps || !current ? <p role="status" className="text-ink-2">กำลังโหลดความคืบหน้า…</p> : <>
          <section aria-labelledby="continue-title" className="flex flex-col gap-3.5 rounded-2xl bg-surface p-5 shadow-e1">
            <div className="flex flex-col gap-2">
              <p className="flex justify-between text-caption text-ink-2"><span>ขั้นที่ {index + 1} จาก {steps.length} · {current.label}</span></p>
              <div className="grid grid-cols-5 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={steps.filter(s => s.status === 'done').length} aria-label="ความคืบหน้าโครงงาน">
                {steps.map(s => <span key={s.key} className={`h-1.5 rounded-full ${s.status === 'done' ? 'bg-accent' : s.status === 'current' ? 'bg-accent/40' : 'bg-separator'}`} />)}
              </div>
            </div>
            <h2 id="continue-title" className="text-headline">{index === 0 && !title ? 'เริ่มจากหาหัวข้อ' : 'ทำต่อจากเดิม'}</h2>
            <p className="text-ink-2">{NEXT_TH[current.key]}</p>
            <Link href={current.href} className="flex min-h-[50px] items-center justify-center rounded-xl bg-accent px-5 font-medium text-accent-on hover:bg-accent-press">{index === 0 && !title ? 'เริ่ม' : 'ทำต่อ'}</Link>
          </section>

          <nav aria-label="ขั้นตอนโครงงาน">
            <ol className="overflow-hidden rounded-2xl bg-surface shadow-e1">
              {steps.map(step => {
                const Icon = step.status === 'done' ? Check : ICON[step.key];
                return <li key={step.key} className="border-b border-separator last:border-b-0">
                  <Link href={step.href} aria-current={step.status === 'current' ? 'step' : undefined} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.status === 'done' ? 'bg-good-tint text-good' : step.status === 'current' ? 'bg-accent-tint text-accent-text' : 'bg-surface-2 text-ink-2'}`}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
                    <span className="flex-1">{step.label}</span>
                    <span className={`text-caption ${step.status === 'done' ? 'text-good' : step.status === 'current' ? 'text-accent-text' : 'text-ink-2'}`}>{STATUS_TH[step.status]}</span>
                  </Link>
                </li>;
              })}
            </ol>
          </nav>
        </>}
      </div>
    </AppShell>
  );
}
