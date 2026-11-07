'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  RotateCcw,
  Sparkles,
  Heart,
  X,
  Star,
  Flag,
  Clock,
  Coins,
  Users,
  Wrench,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import type { TopicCard } from '@/types/domain';
import { SUBFIELDS } from '@/data/subfields';
import { ReportCardModal } from './ReportCardModal';

export interface SwipeDeckProps {
  deck: TopicCard[];
  shortlistCount: number;
  canUndo: boolean;
  onSwipe: (direction: 'skip' | 'interested' | 'do_it_now') => void;
  onUndo: () => void;
  onReportCard: (cardId: string, reason: string) => void;
  onGenerateAiCard: () => void;
  isAiGenerating?: boolean;
  aiRemainingQuota?: number;
  onGoToShortlist: () => void;
  onBackToFilter?: () => void;
}

export function SwipeDeck({
  deck,
  shortlistCount,
  canUndo,
  onSwipe,
  onUndo,
  onReportCard,
  onGenerateAiCard,
  isAiGenerating = false,
  aiRemainingQuota,
  onGoToShortlist,
  onBackToFilter,
}: SwipeDeckProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [dragDirection, setDragDirection] = useState<'skip' | 'interested' | 'do_it_now' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prefersReducedMotion = useReducedMotion();
  const activeCard = deck[0] as (TopicCard & { isAiGenerated?: boolean }) | undefined;
  const nextCard = deck[1] as TopicCard | undefined;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when a modal is open or user is typing in an input
      if (reportModalOpen || (e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSwipe('skip');
        showToast('ข้ามการ์ด');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSwipe('interested');
        showToast(`สนใจ! เพิ่มเข้า Shortlist (${Math.min(shortlistCount + 1, 5)}/5)`);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onSwipe('do_it_now');
        showToast(`🌟 อยากทำเลย! ปักหมุดพิเศษ (${Math.min(shortlistCount + 1, 5)}/5)`);
      } else if (e.key === 'z' || e.key === 'Backspace') {
        if (canUndo) {
          e.preventDefault();
          onUndo();
          showToast('ย้อนกลับการปัดการ์ด');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipe, onUndo, canUndo, shortlistCount, reportModalOpen, showToast]);

  const handleActionClick = (direction: 'skip' | 'interested' | 'do_it_now') => {
    if (!activeCard) return;
    onSwipe(direction);
    if (direction === 'skip') {
      showToast('ข้ามการ์ด');
    } else if (direction === 'interested') {
      showToast(`สนใจ! เพิ่มเข้า Shortlist (${Math.min(shortlistCount + 1, 5)}/5)`);
    } else if (direction === 'do_it_now') {
      showToast(`🌟 อยากทำเลย! ปักหมุดพิเศษ (${Math.min(shortlistCount + 1, 5)}/5)`);
    }
  };

  const getSubfieldName = (subfieldId: string) => {
    const s = SUBFIELDS.find((item) => item.id === subfieldId);
    return s ? s.nameTh : subfieldId;
  };

  const getDifficultyBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
            ระดับเริ่มต้น
          </span>
        );
      case 'intermediate':
        return (
          <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold">
            ระดับปานกลาง
          </span>
        );
      case 'advanced':
        return (
          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
            ระดับสูง
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 overflow-x-hidden px-1">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {onBackToFilter ? (
          <button
            type="button"
            onClick={onBackToFilter}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-all"
            aria-label="ย้อนกลับไปเปลี่ยนสาขา"
          >
            <span>← สาขาวิชา</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-slate-700 font-prompt">
            🃏 สำรวจหัวข้อ ({deck.length} ใบในสำรับ)
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* AI Card Button */}
          <button
            type="button"
            onClick={onGenerateAiCard}
            disabled={isAiGenerating}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold font-prompt transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="ให้ AI ช่วยสร้างการ์ดใหม่ตามข้อจำกัด"
            aria-label="สร้างการ์ด AI เพิ่ม"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span>{isAiGenerating ? 'กำลังสร้าง...' : 'การ์ด AI'}</span>
            {typeof aiRemainingQuota === 'number' && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {aiRemainingQuota}
              </span>
            )}
          </button>

          {/* Shortlist Counter / Link */}
          <button
            type="button"
            onClick={onGoToShortlist}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-bold font-prompt text-xs transition-all flex items-center gap-1.5 ${
              shortlistCount >= 5
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 animate-pulse'
                : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
            aria-label={`ไปหน้า Shortlist มีอยู่ ${shortlistCount} จาก 5 ใบ`}
          >
            <span>📊 Shortlist</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                shortlistCount >= 5 ? 'bg-white text-emerald-700 font-black' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {shortlistCount}/5
            </span>
          </button>
        </div>
      </div>

      {/* 2. Swipe Deck Area */}
      <div className="relative w-full h-[460px] sm:h-[480px] flex items-center justify-center select-none pt-2">
        {activeCard ? (
          <div className="relative w-full h-full">
            {/* Background Preview Card (Next Card) */}
            {nextCard && (
              <div
                className="absolute inset-0 bg-white/70 border border-slate-200/70 rounded-3xl p-5 shadow-xs transform scale-[0.95] translate-y-3 pointer-events-none transition-all duration-300 opacity-60"
                aria-hidden="true"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{getSubfieldName(nextCard.subfieldId)}</span>
                  <span>ถัดไป</span>
                </div>
                <div className="mt-3 font-bold text-base text-slate-700 line-clamp-2">
                  {nextCard.title}
                </div>
              </div>
            )}

            {/* Active Foreground Interactive Card */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeCard.id}
                drag={prefersReducedMotion ? false : true}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.8}
                onDrag={(_, info) => {
                  if (info.offset.y < -70 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
                    setDragDirection('do_it_now');
                  } else if (info.offset.x > 60) {
                    setDragDirection('interested');
                  } else if (info.offset.x < -60) {
                    setDragDirection('skip');
                  } else {
                    setDragDirection(null);
                  }
                }}
                onDragEnd={(_, info) => {
                  const x = info.offset.x;
                  const y = info.offset.y;
                  setDragDirection(null);

                  if (y < -80 && Math.abs(y) > Math.abs(x)) {
                    handleActionClick('do_it_now');
                  } else if (x > 80) {
                    handleActionClick('interested');
                  } else if (x < -80) {
                    handleActionClick('skip');
                  }
                }}
                initial={{ scale: 0.96, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  scale: 0.8,
                  opacity: 0,
                  transition: { duration: 0.2 },
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute inset-0 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden"
              >
                {/* Drag Indicator Overlay */}
                {dragDirection && (
                  <div
                    className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-all ${
                      dragDirection === 'interested'
                        ? 'bg-emerald-500/15 border-4 border-emerald-500/60 rounded-3xl'
                        : dragDirection === 'do_it_now'
                          ? 'bg-amber-500/15 border-4 border-amber-500/60 rounded-3xl'
                          : 'bg-rose-500/15 border-4 border-rose-500/60 rounded-3xl'
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl text-lg font-black font-prompt shadow-lg ${
                        dragDirection === 'interested'
                          ? 'bg-emerald-600 text-white'
                          : dragDirection === 'do_it_now'
                            ? 'bg-amber-600 text-white'
                            : 'bg-rose-600 text-white'
                      }`}
                    >
                      {dragDirection === 'interested'
                        ? '♥ สนใจ'
                        : dragDirection === 'do_it_now'
                          ? '★ อยากทำเลย'
                          : '✕ ข้าม'}
                    </div>
                  </div>
                )}

                {/* Card Top: Badges & Subfield & Report */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg line-clamp-1">
                      {getSubfieldName(activeCard.subfieldId)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {getDifficultyBadge(activeCard.difficulty)}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="รายงานปัญหาการ์ดใบนี้"
                        aria-label="รายงานปัญหาการ์ดใบนี้"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-prompt leading-snug pt-1">
                    {activeCard.title}
                  </h3>
                </div>

                {/* Card Middle: Phenomenon & Curiosity Hook */}
                <div className="space-y-3 py-2">
                  <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-100 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ปรากฏการณ์ชวนสังเกต</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {activeCard.phenomenon}
                    </p>
                  </div>

                  <div className="bg-indigo-50/70 rounded-2xl p-3 border border-indigo-100/80 space-y-1">
                    <div className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>จุดประกายความคิด (Curiosity Hook)</span>
                    </div>
                    <p className="text-xs sm:text-sm text-indigo-950 font-medium leading-relaxed">
                      &ldquo;{activeCard.curiosityHook}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Metadata Badges (Weeks, Budget, Team, Equipment) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>~{activeCard.estimatedWeeks} สัปดาห์</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg">
                      <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>~{activeCard.estimatedBudgetBaht.toLocaleString()} ฿</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{activeCard.minTeamSize}-{activeCard.maxTeamSize} คน</span>
                    </div>
                  </div>

                  {activeCard.requiredEquipment && activeCard.requiredEquipment.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">
                        อุปกรณ์: {activeCard.requiredEquipment.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          /* Empty Deck State */
          <div className="w-full h-full bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
              🎉
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 font-prompt">
                สำรวจการ์ดในหมวดนี้ครบแล้ว!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {shortlistCount > 0
                  ? `คุณเลือกการ์ดที่สนใจไว้ ${shortlistCount} ใบ ไปดูการเปรียบเทียบใน Shortlist ได้เลย`
                  : 'ยังไม่มีการ์ดที่เลือก สามารถกดปุ่มย้อนกลับหรือเปลี่ยนหมวดวิชาเพื่อสำรวจใหม่'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full max-w-xs">
              {shortlistCount > 0 && (
                <button
                  type="button"
                  onClick={onGoToShortlist}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-xs flex items-center justify-center gap-1"
                >
                  <span>ไปดูตาราง Shortlist ({shortlistCount})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {canUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ย้อนกลับการ์ดล่าสุด</span>
                </button>
              )}
              {onBackToFilter && (
                <button
                  type="button"
                  onClick={onBackToFilter}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-xs hover:bg-slate-200"
                >
                  เลือกสาขาวิชาอื่น
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Equal-Weight Action Buttons (Mobile-first ≥44px touch targets) */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {/* Undo Button */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-2xs active:scale-95"
          title="ย้อนกลับการ์ดก่อนหน้า (z / Backspace)"
          aria-label="ย้อนกลับการ์ดก่อนหน้า"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Skip Button (← ข้าม) */}
        <button
          type="button"
          onClick={() => handleActionClick('skip')}
          disabled={!activeCard}
          className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 disabled:opacity-40 transition-all font-bold text-xs sm:text-sm font-prompt flex items-center justify-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
          aria-label="ข้ามการ์ดนี้ (ปัดซ้าย)"
        >
          <X className="w-4 h-4 text-rose-500 stroke-[2.5]" />
          <span>ข้าม</span>
        </button>

        {/* Super Like Button (↑ อยากทำเลย) */}
        <button
          type="button"
          onClick={() => handleActionClick('do_it_now')}
          disabled={!activeCard}
          className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white disabled:opacity-40 transition-all font-bold text-xs sm:text-sm font-prompt flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
          aria-label="อยากทำเลย (ปัดขึ้น)"
        >
          <Star className="w-4 h-4 fill-amber-200 text-amber-200" />
          <span>อยากทำเลย</span>
        </button>

        {/* Interested Button (→ สนใจ) */}
        <button
          type="button"
          onClick={() => handleActionClick('interested')}
          disabled={!activeCard}
          className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-40 transition-all font-bold text-xs sm:text-sm font-prompt flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
          aria-label="สนใจ เก็บเข้า Shortlist (ปัดขวา)"
        >
          <Heart className="w-4 h-4 fill-white text-white" />
          <span>สนใจ</span>
        </button>
      </div>

      {/* Swipe Hint */}
      <p className="text-center text-[11px] text-slate-600 pt-0.5">
        👆 ใช้นิ้วลากการ์ด (← ข้าม • ↑ อยากทำเลย • → สนใจ) หรือกดปุ่มด้านบน
      </p>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 text-white text-xs font-semibold shadow-xl backdrop-blur-md pointer-events-none transition-all animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* Report Modal */}
      <ReportCardModal
        card={activeCard ?? null}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onReport={(cardId, reason) => {
          onReportCard(cardId, reason);
          showToast('บันทึกการรายงานแล้ว');
        }}
      />
    </div>
  );
}
