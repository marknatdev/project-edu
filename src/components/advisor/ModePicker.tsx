'use client';

import React, { useRef } from 'react';
import { Lightbulb, MessageCircle, Search, Sparkles, type LucideIcon } from 'lucide-react';
import type { CoachMode } from '@/lib/advisor/coach-contract';

const OPTIONS: { mode: CoachMode; label: string; hint: string; icon: LucideIcon }[] = [
  { mode: 'auto', label: 'อัตโนมัติ', hint: 'เลือกโหมดให้จากข้อความของคุณ', icon: Sparkles },
  { mode: 'ask', label: 'ถาม', hint: 'ครูตอบด้วยคำถามชวนคิด', icon: MessageCircle },
  { mode: 'research', label: 'ค้นคว้า', hint: 'แนะนำคำค้นและงานที่เกี่ยวข้องจากคลังที่ทีมคัดไว้', icon: Search },
  { mode: 'ideate', label: 'คิดไอเดีย', hint: 'ระดมความคิด ได้จุดตั้งต้นไปเขียนต่อเอง', icon: Lightbulb },
];

/** ADR 0004 mode picker (Figma "Mode Picker"): a radiogroup with roving focus and arrow keys. */
export function ModePicker({ value, onChange, disabled }: { value: CoachMode; onChange: (mode: CoachMode) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (index: number) => {
    const next = (index + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].mode);
    refs.current[next]?.focus();
  };
  const current = OPTIONS.findIndex(o => o.mode === value);
  return (
    <div role="radiogroup" aria-label="โหมดการคุย" className="grid grid-cols-4 gap-0.5 rounded-xl bg-surface-2 p-[3px]">
      {OPTIONS.map(({ mode, label, hint, icon: Icon }, i) => {
        const on = mode === value;
        return (
          <button key={mode} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} title={hint}
            tabIndex={on ? 0 : -1} disabled={disabled} onClick={() => onChange(mode)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(current + 1); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(current - 1); }
            }}
            className={`flex min-h-11 items-center justify-center gap-1 rounded-[9px] px-1 text-caption transition-colors disabled:opacity-40 ${on ? 'bg-surface text-ink shadow-e1' : 'text-ink-2 hover:text-ink'}`}>
            <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-accent-text' : ''}`} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const MODE_HINT: Record<CoachMode, string> = Object.fromEntries(OPTIONS.map(o => [o.mode, o.hint])) as Record<CoachMode, string>;
