'use client';

import React from 'react';
import { CheckCircle2, Circle, HelpCircle } from 'lucide-react';
import type { CoachAspectProgress } from '@/lib/ai/socratic-coach';

export interface ProgressChipsProps {
  progress: CoachAspectProgress;
  questionCount: number;
  maxQuestions?: number;
}

interface AspectItem {
  id: keyof CoachAspectProgress;
  labelTh: string;
  subTh: string;
}

const ASPECTS: AspectItem[] = [
  { id: 'problem', labelTh: '1. ปัญหา', subTh: 'Problem' },
  { id: 'objective', labelTh: '2. วัตถุประสงค์', subTh: 'Objective' },
  { id: 'methodology', labelTh: '3. วิธีการ', subTh: 'Methodology' },
  { id: 'measurement', labelTh: '4. สิ่งที่จะวัด', subTh: 'Measurement' },
];

export function ProgressChips({
  progress,
  questionCount,
  maxQuestions = 8,
}: ProgressChipsProps) {
  const completedCount = Object.values(progress).filter(Boolean).length;

  return (
    <div className="bg-white/90 border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 font-prompt">
            ความคืบหน้าประเด็นสำคัญ (4 ด้าน)
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
            {completedCount}/4 ด้าน
          </span>
        </div>

        {/* Question Counter (<= 8 Questions Cap on Idea Track) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 font-prompt">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            คำถามที่ {Math.min(questionCount + 1, maxQuestions)}/{maxQuestions}
          </span>
        </div>
      </div>

      {/* Progress Bars / Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {ASPECTS.map((aspect) => {
          const isDone = progress[aspect.id];
          return (
            <div
              key={aspect.id}
              className={`p-2 rounded-xl border text-xs font-prompt flex items-center gap-2 transition-all ${
                isDone
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200/70 text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 shrink-0 text-slate-300" />
              )}
              <div className="min-w-0">
                <div className="truncate text-xs">{aspect.labelTh}</div>
                <div className="text-[10px] opacity-75">{aspect.subTh}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
