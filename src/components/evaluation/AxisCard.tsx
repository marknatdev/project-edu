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
    ? 'bg-good-tint text-good border-good/30'
    : isYellow
      ? 'bg-caution-tint text-caution border-caution/30'
      : 'bg-risk-tint text-risk border-risk/40';

  const fillBarColorClass = isGreen
    ? 'bg-good'
    : isYellow
      ? 'bg-caution'
      : 'bg-risk';

  const percent = Math.min(100, Math.max(10, axis.score * 10));

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-e1 ${
        isRed
          ? 'bg-surface border-risk/40 ring-2 ring-rose-100'
          : 'bg-surface border-separator'
      } ${isRedHighlighted ? 'ring-4 ring-rose-300' : ''}`}
    >
      {/* Header: Axis Title & Score Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-callout sm:text-base font-bold text-ink">
            {axis.nameTh}
          </h4>
          <span className="text-caption text-ink-3">
            {axis.nameEn}
          </span>
        </div>

        {/* Text label + emoji (not color alone - AC-7) */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-caption font-bold  self-start sm:self-auto shrink-0 ${badgeColorClass}`}
          aria-label={axis.ariaLabel}
        >
          <span className="text-callout" aria-hidden="true">
            {axis.emoji}
          </span>
          <span>{axis.score}/10</span>
          <span className="text-caption font-medium opacity-90">
            • {axis.labelTh}
          </span>
        </div>
      </div>

      {/* Score Track Fill Bar */}
      <div className="mt-3 w-full bg-surface-2 rounded-full h-2.5 overflow-hidden">
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
      <div className="mt-3.5 space-y-2 text-caption sm:text-callout">
        <p className="text-ink-2 leading-relaxed">
          <strong className="text-ink">เหตุผลประกอบ: </strong>
          {axis.rationale}
        </p>

        <div className="p-3 rounded-2xl bg-surface-2 border border-separator text-ink space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-accent-text text-caption">
            <Sparkles className="w-3.5 h-3.5 text-accent-text shrink-0" />
            <span>คำแนะนำจากครูที่ปรึกษา (Coaching Advice):</span>
          </div>
          <p className="text-caption text-ink-2 leading-relaxed">
            {axis.feedback}
          </p>
        </div>
      </div>

      {/* Action: Trigger Socratic Pivot Workshop for red axes */}
      {isRed && onOpenPivot && (
        <div className="mt-3 pt-3 border-t border-risk/40">
          <button
            type="button"
            onClick={() => onOpenPivot(axis.key)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-risk-tint hover:bg-risk-tint active:bg-risk-tint border border-risk/40 text-risk font-bold text-caption sm:text-callout flex items-center justify-center gap-2 transition-all shadow-e1"
          >
            <span>เข้าสู่ Pivot Workshop เพื่อพัฒนาด้านนี้</span>
            <ArrowUpRight className="w-4 h-4 text-risk" />
          </button>
        </div>
      )}
    </div>
  );
}
