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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col justify-between overflow-hidden">
        {/* Grip bar for mobile sheet feel */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 id="compare-sheet-title" className="text-base font-bold text-slate-900 font-prompt">
              เปรียบเทียบเคียงข้าง 2 หัวข้อ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="ปิดหน้าต่างเปรียบเทียบ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* Card Titles Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col justify-between">
              <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                หัวข้อ A (ซ้าย)
              </div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 font-prompt line-clamp-3">
                {cardA.title}
              </div>
            </div>

            <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-2xl flex flex-col justify-between">
              <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1">
                หัวข้อ B (ขวา)
              </div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 font-prompt line-clamp-3">
                {cardB.title}
              </div>
            </div>
          </div>

          {/* Dimension Comparison List */}
          <div className="space-y-2">
            {comparison.dimensions.map((dim) => (
              <div
                key={dim.key}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between text-slate-500 font-semibold text-[11px]">
                  <span>{dim.label}</span>
                  {dim.winnerNote && (
                    <span className="text-[10px] text-slate-400 line-clamp-1">{dim.winnerNote}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Left cell (A) */}
                  <div
                    className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                      dim.winner === 'a'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{dim.valueA}</span>
                    {dim.winner === 'a' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>

                  {/* Right cell (B) */}
                  <div
                    className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 ${
                      dim.winner === 'b'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{dim.valueB}</span>
                    {dim.winner === 'b' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Takeaway Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
            <div className="font-bold font-prompt text-amber-900 flex items-center gap-1">
              <span>💡 บทสรุปการเปรียบเทียบ</span>
            </div>
            <p className="leading-relaxed">{comparison.takeaway}</p>
          </div>
        </div>

        {/* Action Buttons: Choose Left or Choose Right */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectCard(cardA);
              onClose();
            }}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs font-prompt shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
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
            className="min-h-[44px] px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs font-prompt shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span>เลือกหัวข้อขวา</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
