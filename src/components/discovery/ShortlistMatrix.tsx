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
      score >= 80 ? 'text-good' : score >= 60 ? 'text-caution' : 'text-ink-3';

    return (
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            className="text-accent-on"
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
          <span className="text-caption font-semibold text-ink leading-none">
            {score}
          </span>
          <span className="text-[8px] font-semibold text-ink-3">FIT</span>
        </div>
      </div>
    );
  };

  if (cards.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-surface border border-separator rounded-3xl p-8 text-center space-y-4 shadow-e1">
        <div className="w-16 h-16 rounded-3xl bg-accent-tint text-accent-text flex items-center justify-center mx-auto text-large-title">
          
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-headline text-ink">
            ยังไม่มีหัวข้อใน รายการที่สนใจ
          </h3>
          <p className="text-caption text-ink-3 max-w-xs mx-auto leading-relaxed">
            ปัดขวา (สนใจ) หรือปัดขึ้น (อยากทำเลย) เพื่อสะสมหัวข้อโครงงานที่น่าสนใจให้ครบ 5 ใบ
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToDeck}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-press text-white font-bold text-caption shadow-e1 inline-flex items-center gap-2 cursor-pointer transition-all"
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
          <h2 className="text-headline sm:text-headline font-semibold text-ink flex items-center gap-2">
            <span>รายการที่สนใจ เปรียบเทียบ</span>
            <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-accent-tint text-accent-text">
              {cards.length} ใบ
            </span>
          </h2>
          <p className="text-caption text-ink-3">
            แตะ ☐ เทียบ 2 หัวข้อเพื่อดูเคียงข้างกัน หรือเลือกหัวข้อที่ดีที่สุดไปต่อ
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToDeck}
          className="min-h-11 px-3 py-1.5 rounded-xl border border-separator bg-surface hover:bg-surface-2 text-caption font-semibold text-ink-2 flex items-center gap-1 transition-all"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ปัดเพิ่ม</span>
        </button>
      </div>

      {/* 2. Top-1 Recommendation Hero Banner */}
      {recommendation && (
        <div className="text-white rounded-3xl p-4 sm:p-5 shadow-e2 border border-accent space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-caution text-amber-300 border border-caution/30 text-caption font-bold">
              <Trophy className="w-3.5 h-3.5 text-caution" />
              <span>หัวข้อแนะนำอันดับ 1 สำหรับคุณ</span>
            </span>
            <span className="text-caption font-bold text-accent-tint">
              Fit {recommendation.item.fitScore.score}%
            </span>
          </div>

          <div>
            <h3 className="font-bold text-callout sm:text-body text-white leading-snug">
              {recommendation.item.superLiked && ''}
              {recommendation.item.card.title}
            </h3>
            <p className="text-caption text-indigo-200/90 leading-relaxed mt-1 line-clamp-2">
              {recommendation.reason}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-caption text-indigo-300 flex items-center gap-3">
              <span>~{recommendation.item.card.estimatedWeeks} สัปดาห์</span>
              <span>•</span>
              <span>~{recommendation.item.card.estimatedBudgetBaht.toLocaleString()} ฿</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectFinalTopic(recommendation.item.card)}
              className="min-h-11 px-3.5 py-1.5 rounded-xl bg-caution hover:bg-caution text-ink font-bold text-caption shadow-e1 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>เลือกหัวข้อนี้</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Sorting Toolbar Tabs */}
      <div className="flex items-center justify-between gap-1 p-1 bg-surface-2 rounded-2xl">
        <button
          type="button"
          onClick={() => setSortKey('fit')}
          className={`flex-1 min-h-11 px-2 py-1.5 rounded-xl text-caption font-bold  transition-all flex items-center justify-center gap-1 ${
            sortKey === 'fit'
              ? 'bg-surface text-accent-text shadow-e1 ring-1 ring-separator'
              : 'text-ink-2 hover:text-ink'
          }`}
          aria-pressed={sortKey === 'fit'}
        >
          <span>Fit สูง</span>
        </button>

        <button
          type="button"
          onClick={() => setSortKey('budget')}
          className={`flex-1 min-h-11 px-2 py-1.5 rounded-xl text-caption font-bold  transition-all flex items-center justify-center gap-1 ${
            sortKey === 'budget'
              ? 'bg-surface text-accent-text shadow-e1 ring-1 ring-separator'
              : 'text-ink-2 hover:text-ink'
          }`}
          aria-pressed={sortKey === 'budget'}
        >
          <span>ประหยัด</span>
        </button>

        <button
          type="button"
          onClick={() => setSortKey('weeks')}
          className={`flex-1 min-h-11 px-2 py-1.5 rounded-xl text-caption font-bold  transition-all flex items-center justify-center gap-1 ${
            sortKey === 'weeks'
              ? 'bg-surface text-accent-text shadow-e1 ring-1 ring-separator'
              : 'text-ink-2 hover:text-ink'
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
              className={`bg-surface rounded-3xl p-4 sm:p-5 border transition-all space-y-3 shadow-e1 ${
                isSelected
                  ? 'border-accent ring-2 ring-accent bg-accent-tint'
                  : isTop
                    ? 'border-accent/30   to-white'
                    : 'border-separator hover:border-control'
              }`}
            >
              {/* Card Header: Rank, Fit Ring, Title & Subfield */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold shrink-0 mt-0.5 ${
                      isTop
                        ? 'bg-caution text-ink font-semibold'
                        : 'bg-surface-2 text-ink-2'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-caption font-bold text-accent-text uppercase">
                        {getSubfieldName(item.card.subfieldId)}
                      </span>
                      {item.superLiked && (
                        <span className="inline-flex items-center gap-0.5 text-caption font-bold px-1.5 py-0.2 rounded-full bg-caution-tint text-caution">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-caution" />
                          <span>อยากทำเลย</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-callout sm:text-body text-ink leading-snug">
                      {item.card.title}
                    </h3>
                  </div>
                </div>

                {/* Fit Score Ring */}
                {renderFitRing(item.fitScore.score)}
              </div>

              {/* Progress Meters (Time & Budget vs Learner's Constraints) */}
              <div className="grid grid-cols-2 gap-2 bg-surface-2 p-2.5 rounded-2xl border border-separator text-caption">
                {/* Time meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-caption text-ink-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-ink-3" />
                      <span>ระยะเวลา</span>
                    </span>
                    <span className="font-bold text-ink">
                      {item.card.estimatedWeeks}/{constraints.timeWeeks} สัปดาห์
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-separator rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.timeRatio <= 1 ? 'bg-good' : 'bg-risk'
                      }`}
                      style={{ width: `${Math.min(100, item.timeRatio * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Budget meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-caption text-ink-2">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-ink-3" />
                      <span>งบประมาณ</span>
                    </span>
                    <span className="font-bold text-ink">
                      {item.card.estimatedBudgetBaht.toLocaleString()}/{constraints.budgetBaht.toLocaleString()} ฿
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-separator rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.budgetRatio <= 1 ? 'bg-good' : 'bg-risk'
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-caution-tint text-caution border border-caution/30 text-caption font-semibold">
                      <AlertTriangle className="w-3 h-3 text-caution" />
                      <span>มีประเด็น SRC</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-good-tint text-good border border-good/30 text-caption font-semibold">
                      <ShieldCheck className="w-3 h-3 text-good" />
                      <span>ปลอดภัย</span>
                    </span>
                  )}

                  {item.pros[0] && (
                    <span className="text-caption px-2 py-0.5 rounded-full bg-accent-tint text-accent-text line-clamp-1 max-w-[180px]">
                      {item.pros[0]}
                    </span>
                  )}
                </div>

                {/* Expand / Collapse "ทำไมได้ Fit นี้" */}
                <button
                  type="button"
                  onClick={() => toggleReasonExpand(item.card.id)}
                  className="text-caption font-semibold text-accent-text hover:text-accent-text flex items-center gap-0.5 cursor-pointer py-1"
                >
                  <span>ทำไมได้ Fit นี้?</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expanded "ทำไมได้ Fit นี้" & Pros/Cons */}
              {isExpanded && (
                <div className="bg-surface-2 rounded-2xl p-3 border border-separator text-caption space-y-2 animate-fade-in">
                  <div className="space-y-1">
                    <div className="font-bold text-caption text-ink-2">เหตุผลความเข้ากัน (Fit Breakdown):</div>
                    <ul className="space-y-1 text-ink-2 text-caption pl-3 list-disc">
                      {item.reasons.map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-1 border-t border-separator grid grid-cols-1 sm:grid-cols-2 gap-2 text-caption">
                    <div className="space-y-0.5 text-good bg-good-tint p-2 rounded-xl">
                      <div className="font-bold">✨ จุดเด่น / ข้อดี:</div>
                      <div className="text-good leading-relaxed">{item.pros.join(' • ')}</div>
                    </div>
                    <div className="space-y-0.5 text-caution bg-caution-tint p-2 rounded-xl">
                      <div className="font-bold">ข้อควรระวัง:</div>
                      <div className="text-caution leading-relaxed">{item.cons.join(' • ')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Footer: Compare Checkbox & Select Topic Button */}
              <div className="flex items-center justify-between pt-2 border-t border-separator">
                {/* Compare Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleCompare(item.card.id)}
                  className={`min-h-11 px-3 py-1.5 rounded-xl border text-caption font-bold  transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-ink-3" />
                  )}
                  <span>เทียบ</span>
                </button>

                {/* Final Selection Button */}
                <button
                  type="button"
                  onClick={() => onSelectFinalTopic(item.card)}
                  className="min-h-11 px-4 py-1.5 rounded-xl bg-ink hover:bg-accent text-white font-bold text-caption shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
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
        <div className="fixed bottom-[92px] md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-3">
          <div className="bg-surface text-ink rounded-2xl p-3 shadow-e3 flex items-center justify-between gap-2">
            <span className="text-caption font-medium text-ink">
              เลือกเทียบแล้ว <b className="text-accent-text">{selectedForCompare.length}</b>/2 หัวข้อ
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCompare}
                className="min-h-11 px-2.5 py-1 rounded-xl bg-surface-2 text-caption font-medium text-ink hover:bg-separator transition-all"
              >
                ล้าง
              </button>

              <button
                type="button"
                disabled={selectedForCompare.length < 2}
                onClick={() => setCompareSheetOpen(true)}
                className="min-h-11 px-3.5 py-1 rounded-xl bg-accent hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-caption font-bold transition-all shadow-e1 flex items-center gap-1"
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
