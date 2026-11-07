'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { CoachAspectProgress } from '@/lib/advisor/coach-contract';

export interface ProgressChipsProps {
  progress: CoachAspectProgress;
  questionCount: number;
  maxQuestions?: number;
}

const ASPECTS: { id: keyof CoachAspectProgress; label: string }[] = [
  { id: 'problem', label: 'ปัญหา' },
  { id: 'objective', label: 'วัตถุประสงค์' },
  { id: 'methodology', label: 'วิธีการ' },
  { id: 'measurement', label: 'สิ่งที่จะวัด' },
];

/** Compact "x of 4" progress for the idea: done aspects show a check and text, never colour alone. */
export function ProgressChips({ progress }: ProgressChipsProps) {
  const done = ASPECTS.filter(a => progress[a.id]).length;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-ink-2">ไอเดียครบแล้ว {done} จาก 4 ด้าน</p>
      <ul className="flex flex-wrap gap-1.5">
        {ASPECTS.map(({ id, label }) => {
          const on = progress[id];
          return (
            <li key={id} className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-caption ${on ? 'bg-good-tint text-good' : 'bg-surface-2 text-ink-2'}`}>
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {label}<span className="sr-only">{on ? ' (ครบแล้ว)' : ' (ยังไม่ครบ)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
