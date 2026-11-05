'use client';

import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { AxisViewItem } from '@/lib/evaluation/view-model';
import type { EvaluationAxis } from '@/types/domain';

export interface AxisCardProps {
  axis: AxisViewItem;
  onOpenPivot?: (axisKey: EvaluationAxis) => void;
  isRedHighlighted?: boolean;
}

export function AxisCard({
  axis,
  onOpenPivot,
  isRedHighlighted = false,
}: AxisCardProps) {
  const isRed = axis.badge === 'red';
  const isYellow = axis.badge === 'yellow';
  const isGreen = axis.badge === 'green';

  const badgeColorClass = isGreen
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : isYellow
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-rose-50 text-rose-800 border-rose-200';

  const fillBarColorClass = isGreen
    ? 'bg-emerald-500'
    : isYellow
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const percent = Math.min(100, Math.max(10, axis.score * 10));

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
        isRed
          ? 'bg-white border-rose-200 ring-2 ring-rose-100'
          : 'bg-white border-slate-200'
      } ${isRedHighlighted ? 'ring-4 ring-rose-300' : ''}`}
    >
      {/* Header: Axis Title & Score Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 font-prompt">
            {axis.nameTh}
          </h4>
          <span className="text-[11px] text-slate-400 font-prompt">
            {axis.nameEn}
          </span>
        </div>

        {/* Text label + emoji (not color alone - AC-7) */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold font-prompt self-start sm:self-auto shrink-0 ${badgeColorClass}`}
          aria-label={axis.ariaLabel}
        >
          <span className="text-sm" aria-hidden="true">
            {axis.emoji}
          </span>
          <span>{axis.score}/10</span>
          <span className="text-[11px] font-medium opacity-90">
            • {axis.labelTh}
          </span>
        </div>
      </div>

      {/* Score Track Fill Bar */}
      <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillBarColorClass}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={axis.score}
          aria-valuemin={1}
          aria-valuemax={10}
        />
      </div>

      {/* Rationale & Coaching Advice */}
      <div className="mt-3.5 space-y-2 text-xs sm:text-sm font-prompt">
        <p className="text-slate-700 leading-relaxed">
          <strong className="text-slate-900">เหตุผลประกอบ: </strong>
          {axis.rationale}
        </p>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-indigo-700 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>คำแนะนำจากครูที่ปรึกษา (Coaching Advice):</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {axis.feedback}
          </p>
        </div>
      </div>

      {/* Action: Trigger Socratic Pivot Workshop for red axes */}
      {isRed && onOpenPivot && (
        <div className="mt-3 pt-3 border-t border-rose-100">
          <button
            type="button"
            onClick={() => onOpenPivot(axis.key)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-800 font-bold font-prompt text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <span>💡 เข้าสู่ Pivot Workshop เพื่อพัฒนาด้านนี้</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      )}
    </div>
  );
}
