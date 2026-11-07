'use client';

import React from 'react';
import { ArrowUpRight, Check, Info, ShieldAlert } from 'lucide-react';
import type { AxisViewItem } from '@/lib/evaluation/view-model';
import type { EvaluationAxis } from '@/types/domain';

export interface AxisCardProps {
  axis: AxisViewItem;
  onOpenPivot?: (axisKey: EvaluationAxis) => void;
  isRedHighlighted?: boolean;
}

const STYLE = {
  green: { badge: 'bg-good-tint text-good', bar: 'bg-good', icon: Check },
  yellow: { badge: 'bg-caution-tint text-caution', bar: 'bg-caution', icon: Info },
  red: { badge: 'bg-risk-tint text-risk', bar: 'bg-risk', icon: ShieldAlert },
} as const;

/** Figma 07 axis row: name, status (icon + text, never colour alone), score and bar; reasons on demand. */
export function AxisCard({ axis, onOpenPivot, isRedHighlighted = false }: AxisCardProps) {
  const style = STYLE[axis.badge];
  const Icon = style.icon;
  const percent = Math.min(100, Math.max(10, axis.score * 10));

  return (
    <article className={`flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-e1 ${isRedHighlighted ? 'ring-2 ring-risk' : ''}`}>
      <div className="flex items-center gap-2">
        <h3 className="flex-1 font-medium">{axis.nameTh.replace(/\s*\([A-Za-z &/-]+\)$/, '')}</h3>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption ${style.badge}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />{axis.labelTh}
        </span>
        <span className="font-medium tabular-nums" aria-label={axis.ariaLabel}>{axis.score}/10</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={axis.score} aria-valuemin={1} aria-valuemax={10} aria-label={axis.nameTh}>
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${percent}%` }} />
      </div>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer items-center text-callout font-medium text-accent-text">ดูเหตุผลและคำแนะนำ</summary>
        <div className="flex flex-col gap-2 text-callout">
          <p className="text-ink-2">{axis.rationale}</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-ink"><span className="text-ink-2">คำแนะนำ: </span>{axis.feedback}</p>
        </div>
      </details>
      {axis.badge === 'red' && onOpenPivot && (
        <button type="button" onClick={() => onOpenPivot(axis.key)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-risk-tint px-4 font-medium text-risk">
          หามุมใหม่สำหรับด้านนี้<ArrowUpRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </article>
  );
}
