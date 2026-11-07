'use client';

import React from 'react';
import { X, Award, CheckCircle, ArrowRight } from 'lucide-react';
import type { TopicCard, Constraints, GradeLevel } from '@/types/domain';
import { compareTwo } from '@/lib/discovery/shortlist';

export interface CompareSheetProps {
  cardA: TopicCard | null;
  cardB: TopicCard | null;
  constraints: Constraints;
  gradeLevel: GradeLevel;
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (card: TopicCard) => void;
}

export function CompareSheet({
  cardA,
  cardB,
  constraints,
  gradeLevel,
  isOpen,
  onClose,
  onSelectCard,
}: CompareSheetProps) {
  if (!isOpen || !cardA || !cardB) return null;

  const comparison = compareTwo(cardA, cardB, constraints, gradeLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-e3 max-h-[92vh] flex flex-col justify-between overflow-hidden">
        {/* Grip bar for mobile sheet feel */}
        <div className="w-12 h-1.5 bg-control rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-separator shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-tint text-accent-text flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 id="compare-sheet-title" className="text-body font-bold text-ink">
              เปรียบเทียบเคียงข้าง 2 หัวข้อ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-3 hover:text-ink-2 hover:bg-surface-2 transition-colors"
            aria-label="ปิดหน้าต่างเปรียบเทียบ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* Card Titles Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-accent-tint border border-accent/30 rounded-2xl flex flex-col justify-between">
              <div className="text-caption font-bold text-accent-text uppercase tracking-wider mb-1">
                หัวข้อ A (ซ้าย)
              </div>
              <div className="font-bold text-caption sm:text-callout text-ink line-clamp-3">
                {cardA.title}
              </div>
            </div>

            <div className="p-3 bg-accent-tint border border-accent/30 rounded-2xl flex flex-col justify-between">
              <div className="text-caption font-bold text-accent-text uppercase tracking-wider mb-1">
                หัวข้อ B (ขวา)
              </div>
              <div className="font-bold text-caption sm:text-callout text-ink line-clamp-3">
                {cardB.title}
              </div>
            </div>
          </div>

          {/* Dimension Comparison List */}
          <div className="space-y-2">
            {comparison.dimensions.map((dim) => (
              <div
                key={dim.key}
                className="bg-surface-2 border border-separator rounded-2xl p-2.5 space-y-1.5 text-caption"
              >
                <div className="flex items-center justify-between text-ink-3 font-semibold text-caption">
                  <span>{dim.label}</span>
                  {dim.winnerNote && (
                    <span className="text-caption text-ink-3 line-clamp-1">{dim.winnerNote}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Left cell (A) */}
                  <div
                    className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                      dim.winner === 'a'
                        ? 'bg-good-tint border-good/30 text-good'
                        : 'bg-surface border-separator text-ink-2'
                    }`}
                  >
                    <span>{dim.valueA}</span>
                    {dim.winner === 'a' && <CheckCircle className="w-3.5 h-3.5 text-good" />}
                  </div>

                  {/* Right cell (B) */}
                  <div
                    className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                      dim.winner === 'b'
                        ? 'bg-good-tint border-good/30 text-good'
                        : 'bg-surface border-separator text-ink-2'
                    }`}
                  >
                    <span>{dim.valueB}</span>
                    {dim.winner === 'b' && <CheckCircle className="w-3.5 h-3.5 text-good" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Takeaway Box */}
          <div className="p-3.5 rounded-2xl bg-caution-tint border border-caution/30 text-caption text-caution space-y-1">
            <div className="font-bold text-caution flex items-center gap-1">
              <span>บทสรุปการเปรียบเทียบ</span>
            </div>
            <p className="leading-relaxed">{comparison.takeaway}</p>
          </div>
        </div>

        {/* Action Buttons: Choose Left or Choose Right */}
        <div className="pt-3 border-t border-separator grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectCard(cardA);
              onClose();
            }}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-accent hover:bg-accent-press text-white font-bold text-caption shadow-e1 flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span>เลือกหัวข้อซ้าย</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectCard(cardB);
              onClose();
            }}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-accent hover:bg-accent-press text-white font-bold text-caption shadow-e1 flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span>เลือกหัวข้อขวา</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
