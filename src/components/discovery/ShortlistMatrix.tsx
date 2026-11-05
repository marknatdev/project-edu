'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Clock,
  Coins,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  Star,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { TopicCard, Constraints, GradeLevel } from '@/types/domain';
import {
  rankShortlist,
  sortShortlist,
  recommendOne,
  type ShortlistSortKey,
} from '@/lib/discovery/shortlist';
import { CompareSheet } from './CompareSheet';
import { SUBFIELDS } from '@/data/subfields';

export interface ShortlistMatrixProps {
  cards: TopicCard[];
  superLikedCardIds?: string[];
  constraints: Constraints;
  gradeLevel: GradeLevel;
  onSelectFinalTopic: (card: TopicCard) => void;
  onBackToDeck: () => void;
}

export function ShortlistMatrix({
  cards,
  superLikedCardIds = [],
  constraints,
  gradeLevel,
  onSelectFinalTopic,
  onBackToDeck,
}: ShortlistMatrixProps) {
  const [sortKey, setSortKey] = useState<ShortlistSortKey>('fit');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  // Rank using computeFitScore against learner constraints
  const rankedItems = rankShortlist(cards, constraints, gradeLevel, superLikedCardIds);
  const sortedItems = sortShortlist(rankedItems, sortKey);
  const recommendation = recommendOne(rankedItems);

  const toggleReasonExpand = (cardId: string) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleToggleCompare = (cardId: string) => {
    if (selectedForCompare.includes(cardId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== cardId));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare([...selectedForCompare, cardId]);
      } else {
        // Replace second selection
        setSelectedForCompare([selectedForCompare[0], cardId]);
      }
    }
  };

  const clearCompare = () => setSelectedForCompare([]);

  const compareCardA = cards.find((c) => c.id === selectedForCompare[0]) ?? null;
  const compareCardB = cards.find((c) => c.id === selectedForCompare[1]) ?? null;

  const getSubfieldName = (subfieldId: string) => {
    const s = SUBFIELDS.find((item) => item.id === subfieldId);
    return s ? s.nameTh : subfieldId;
  };

  const renderFitRing = (score: number) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const strokeColor =
      score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-slate-400';

    return (
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="text-slate-100"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            className={`${strokeColor} transition-all duration-500`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black font-prompt text-slate-800 leading-none">
            {score}
          </span>
          <span className="text-[8px] font-semibold text-slate-400">FIT</span>
        </div>
      </div>
    );
  };

  if (cards.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-3xl">
          🃏
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-slate-900 font-prompt">
            ยังไม่มีหัวข้อใน Shortlist
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            ปัดขวา (สนใจ) หรือปัดขึ้น (อยากทำเลย) เพื่อสะสมหัวข้อโครงงานที่น่าสนใจให้ครบ 5 ใบ
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToDeck}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs font-prompt shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all"
        >
          <span>ไปปัดการ์ดหัวข้อ</span>
          <span>→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 overflow-x-hidden px-1">
      {/* 1. Header & Count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 font-prompt flex items-center gap-2">
            <span>📊 Shortlist เปรียบเทียบ</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {cards.length} ใบ
            </span>
          </h2>
          <p className="text-[11px] text-slate-500">
            แตะ ☐ เทียบ 2 หัวข้อเพื่อดูเคียงข้างกัน หรือเลือกหัวข้อที่ดีที่สุดไปต่อ
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToDeck}
          className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-all"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ปัดเพิ่ม</span>
        </button>
      </div>

      {/* 2. Top-1 Recommendation Hero Banner */}
      {recommendation && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-indigo-700/40 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>หัวข้อแนะนำอันดับ 1 สำหรับคุณ</span>
            </span>
            <span className="text-xs font-bold text-indigo-200 font-prompt">
              Fit {recommendation.item.fitScore.score}%
            </span>
          </div>

          <div>
            <h3 className="font-bold text-sm sm:text-base text-white font-prompt leading-snug">
              {recommendation.item.superLiked && '🌟 '}
              {recommendation.item.card.title}
            </h3>
            <p className="text-[11px] text-indigo-200/90 leading-relaxed mt-1 line-clamp-2">
              {recommendation.reason}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] text-indigo-300 flex items-center gap-3">
              <span>~{recommendation.item.card.estimatedWeeks} สัปดาห์</span>
              <span>•</span>
              <span>~{recommendation.item.card.estimatedBudgetBaht.toLocaleString()} ฿</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectFinalTopic(recommendation.item.card)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-prompt shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>เลือกหัวข้อนี้</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Sorting Toolbar Tabs */}
      <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setSortKey('fit')}
          className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold font-prompt transition-all flex items-center justify-center gap-1 ${
            sortKey === 'fit'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={sortKey === 'fit'}
        >
          <span>🎯 Fit สูง</span>
        </button>

        <button
          type="button"
          onClick={() => setSortKey('budget')}
          className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold font-prompt transition-all flex items-center justify-center gap-1 ${
            sortKey === 'budget'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={sortKey === 'budget'}
        >
          <span>💰 ประหยัด</span>
        </button>

        <button
          type="button"
          onClick={() => setSortKey('weeks')}
          className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold font-prompt transition-all flex items-center justify-center gap-1 ${
            sortKey === 'weeks'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={sortKey === 'weeks'}
        >
          <span>⏳ เร็วสุด</span>
        </button>
      </div>

      {/* 4. Ranked Cards List */}
      <div className="space-y-3">
        {sortedItems.map((item, index) => {
          const isSelected = selectedForCompare.includes(item.card.id);
          const isExpanded = expandedReasons[item.card.id] ?? false;
          const isTop = index === 0 && sortKey === 'fit';

          // Safe / Warning status
          const hasSafetyFlag =
            (item.card.safetyCategories && item.card.safetyCategories.length > 0) || false;

          return (
            <div
              key={item.card.id}
              className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all space-y-3 shadow-xs ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                  : isTop
                    ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white'
                    : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Card Header: Rank, Fit Ring, Title & Subfield */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isTop
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">
                        {getSubfieldName(item.card.subfieldId)}
                      </span>
                      {item.superLiked && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>อยากทำเลย</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 font-prompt leading-snug">
                      {item.card.title}
                    </h3>
                  </div>
                </div>

                {/* Fit Score Ring */}
                {renderFitRing(item.fitScore.score)}
              </div>

              {/* Progress Meters (Time & Budget vs Learner's Constraints) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 text-xs">
                {/* Time meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>ระยะเวลา</span>
                    </span>
                    <span className="font-bold text-slate-800">
                      {item.card.estimatedWeeks}/{constraints.timeWeeks} สัปดาห์
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.timeRatio <= 1 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.timeRatio * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Budget meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-slate-400" />
                      <span>งบประมาณ</span>
                    </span>
                    <span className="font-bold text-slate-800">
                      {item.card.estimatedBudgetBaht.toLocaleString()}/{constraints.budgetBaht.toLocaleString()} ฿
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.budgetRatio <= 1 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.budgetRatio * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Safety Tag & Quick Pros/Cons */}
              <div className="flex items-center justify-between flex-wrap gap-1.5 pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasSafetyFlag ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>มีประเด็น SRC</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>ปลอดภัย</span>
                    </span>
                  )}

                  {item.pros[0] && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 line-clamp-1 max-w-[180px]">
                      👍 {item.pros[0]}
                    </span>
                  )}
                </div>

                {/* Expand / Collapse "ทำไมได้ Fit นี้" */}
                <button
                  type="button"
                  onClick={() => toggleReasonExpand(item.card.id)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer py-1"
                >
                  <span>ทำไมได้ Fit นี้?</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expanded "ทำไมได้ Fit นี้" & Pros/Cons */}
              {isExpanded && (
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs space-y-2 animate-fade-in">
                  <div className="space-y-1">
                    <div className="font-bold text-[11px] text-slate-700">เหตุผลความเข้ากัน (Fit Breakdown):</div>
                    <ul className="space-y-1 text-slate-600 text-[11px] pl-3 list-disc">
                      {item.reasons.map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-0.5 text-emerald-900 bg-emerald-50/60 p-2 rounded-xl">
                      <div className="font-bold">✨ จุดเด่น / ข้อดี:</div>
                      <div className="text-emerald-700 leading-relaxed">{item.pros.join(' • ')}</div>
                    </div>
                    <div className="space-y-0.5 text-amber-900 bg-amber-50/60 p-2 rounded-xl">
                      <div className="font-bold">⚠️ ข้อควรระวัง:</div>
                      <div className="text-amber-700 leading-relaxed">{item.cons.join(' • ')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Footer: Compare Checkbox & Select Topic Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {/* Compare Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleCompare(item.card.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-bold font-prompt transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>เทียบ</span>
                </button>

                {/* Final Selection Button */}
                <button
                  type="button"
                  onClick={() => onSelectFinalTopic(item.card)}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs font-prompt shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <span>เลือกหัวข้อนี้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Sticky Bottom Compare Bar */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-3">
          <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-2 border border-slate-700">
            <span className="text-xs font-bold text-slate-200 font-prompt">
              เลือกเทียบแล้ว <b className="text-amber-400">{selectedForCompare.length}</b>/2 หัวข้อ
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCompare}
                className="min-h-[36px] px-2.5 py-1 rounded-xl border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all"
              >
                ล้าง
              </button>

              <button
                type="button"
                disabled={selectedForCompare.length < 2}
                onClick={() => setCompareSheetOpen(true)}
                className="min-h-[36px] px-3.5 py-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold font-prompt transition-all shadow-xs flex items-center gap-1"
              >
                <span>เทียบ 2 หัวข้อ</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Compare Bottom Sheet */}
      <CompareSheet
        cardA={compareCardA}
        cardB={compareCardB}
        constraints={constraints}
        gradeLevel={gradeLevel}
        isOpen={compareSheetOpen}
        onClose={() => setCompareSheetOpen(false)}
        onSelectCard={(chosen) => {
          onSelectFinalTopic(chosen);
        }}
      />
    </div>
  );
}
