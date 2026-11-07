'use client';

import React, { useEffect, useRef } from 'react';
import { BookOpen, Compass, ExternalLink, Info } from 'lucide-react';
import type { ChatMessage } from '@/lib/advisor/chat-reducer';
import { PRIOR_WORK } from '@/data/prior-work';
import { MODE_LABEL_TH } from '@/lib/ai/coach-modes';

export interface ChatThreadProps {
  messages: ChatMessage[];
  isWaitingForResponse: boolean;
}

// Pre-ADR 0004 turns carry only a tier; a tier-1 question reads as the ask mode, hints/examples get no mode label.
const LEGACY_TIER_LABEL = { 1: 'ถาม', 2: null, 3: null } as const;

function PriorWorkList({ ids }: { ids: string[] }) {
  const works = ids.map(id => PRIOR_WORK.find(w => w.id === id)).filter(w => w !== undefined);
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-separator bg-surface">
      {works.length === 0 && <p className="px-4 py-3 text-callout text-ink-2">ยังไม่มีงานในคลังที่ใกล้เคียงเรื่องนี้</p>}
      <ul>
        {works.map(work => (
          <li key={work.id} className="flex items-center gap-3 border-b border-separator px-3.5 py-3 last:border-b-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-text"><BookOpen className="h-[18px] w-[18px]" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-callout text-ink [overflow-wrap:anywhere]">{work.title}</span>
              <span className="block text-caption text-ink-2">{work.competitionOrVenue} · {work.year}</span>
            </span>
            <a href={work.url} target="_blank" rel="noopener noreferrer" aria-label={`เปิดแหล่งข้อมูล: ${work.title}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-text hover:bg-surface-2"><ExternalLink className="h-5 w-5" aria-hidden /></a>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-1.5 bg-surface-2 px-3.5 py-2.5 text-caption text-ink-2"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />แสดงเฉพาะงานจากคลังที่ทีมคัดไว้ AI ไม่สร้างแหล่งอ้างอิงเอง</p>
    </div>
  );
}

export function ChatThread({ messages, isWaitingForResponse }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
  }, [messages, isWaitingForResponse]);

  return (
    <div role="log" aria-live="polite" aria-label="บทสนทนากับครูที่ปรึกษา" className="flex flex-col gap-4">
      {messages.length === 0 && <p className="text-callout text-ink-2">กำลังเปิดบทสนทนา หากเชื่อมต่อไม่ได้ คุณยังพิมพ์เก็บเป็นฉบับร่างได้</p>}
      {messages.map(msg => {
        if (msg.role === 'student') {
          return (
            <div key={msg.id} className="flex justify-end">
              <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-accent px-3.5 py-3 text-accent-on [overflow-wrap:anywhere]">
                <span className="sr-only">คุณ: </span>{msg.content}
              </p>
            </div>
          );
        }
        const modeLabel = msg.mode ? MODE_LABEL_TH[msg.mode] : msg.tier ? LEGACY_TIER_LABEL[msg.tier] : null;
        return (
          <div key={msg.id} className="flex max-w-[88%] flex-col gap-1.5 md:max-w-[75%]">
            <span className="flex items-center gap-1.5 text-caption text-ink-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-tint text-accent-text"><Compass className="h-3.5 w-3.5" aria-hidden /></span>
              ครูที่ปรึกษา{modeLabel ? ` · โหมด${modeLabel}` : ''}
            </span>
            <div className="rounded-2xl rounded-tl-md border border-separator bg-surface px-3.5 py-3">
              {msg.source === 'fallback' && <p className="mb-1.5 text-caption text-ink-3">คำแนะนำสำรองจากเซิร์ฟเวอร์ (ไม่ได้เรียก AI สด)</p>}
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{msg.content}</p>
              {msg.lenses && msg.lenses.length > 0 && (
                <div className="mt-3 border-t border-separator pt-3">
                  <p className="text-caption text-ink-2">{msg.mode === 'research' ? 'คำค้นและที่ค้นแนะนำ' : 'กรอบชวนคิด'}</p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {msg.lenses.map((lens, i) => <li key={i} className="rounded-xl bg-surface-2 px-3 py-2 text-callout">{lens}</li>)}
                  </ul>
                </div>
              )}
              {msg.examples && msg.examples.length > 0 && (
                <div className="mt-3 border-t border-separator pt-3">
                  <p className="text-caption text-ink-2">จุดตั้งต้น · เลือกแล้วเขียนใหม่ด้วยภาษาของคุณ</p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {msg.examples.map((example, i) => <li key={i} className="rounded-xl bg-accent-tint px-3 py-2 text-callout text-ink">{example}</li>)}
                  </ul>
                </div>
              )}
            </div>
            {msg.priorWorkIds && <PriorWorkList ids={msg.priorWorkIds} />}
          </div>
        );
      })}
      {isWaitingForResponse && (
        <p role="status" className="flex w-fit items-center gap-2 rounded-2xl border border-separator bg-surface px-3.5 py-2.5 text-callout text-ink-2">
          <span className="flex gap-1" aria-hidden>
            {[0, 150, 300].map(d => <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${d}ms` }} />)}
          </span>
          ครูที่ปรึกษากำลังคิด…
        </p>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
