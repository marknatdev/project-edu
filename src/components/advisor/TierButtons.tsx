'use client';

import React from 'react';
import { MessageSquare, Compass, HelpCircle, Lock } from 'lucide-react';
import type { CoachingTier } from '@/lib/ai/socratic-coach';
import { canRequestTier, type ChatState } from '@/lib/advisor/chat-reducer';

export interface TierButtonsProps {
  state: ChatState;
  onSelectTier: (tier: CoachingTier) => void;
  disabled?: boolean;
}

export function TierButtons({
  state,
  onSelectTier,
  disabled = false,
}: TierButtonsProps) {
  const tier1Check = canRequestTier(state, 1);
  const tier2Check = canRequestTier(state, 2);
  const tier3Check = canRequestTier(state, 3);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 font-prompt">
          ระดับความช่วยเหลือจากครูที่ปรึกษา (3-Tier Pedagogy):
        </span>
        <span className="text-[11px] text-slate-400 font-prompt">
          ปลดล็อกตามลำดับ
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Tier 1 Button */}
        <button
          type="button"
          onClick={() => onSelectTier(1)}
          disabled={disabled || !tier1Check.allowed}
          className={`min-h-[44px] px-3 py-2 rounded-2xl border text-xs font-semibold font-prompt text-left flex items-center justify-between gap-2 transition-all shadow-xs ${
            state.currentTier === 1
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-100 ring-2 ring-indigo-300'
              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={tier1Check.reasonTh}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 shrink-0 text-indigo-400" />
            <div>
              <div className="font-bold">ถามชวนคิด</div>
              <div className="text-[10px] opacity-80">Tier 1: Socratic</div>
            </div>
          </div>
          {state.currentTier === 1 && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
              ใช้งานอยู่
            </span>
          )}
        </button>

        {/* Tier 2 Button */}
        <button
          type="button"
          onClick={() => onSelectTier(2)}
          disabled={disabled || !tier2Check.allowed}
          className={`min-h-[44px] px-3 py-2 rounded-2xl border text-xs font-semibold font-prompt text-left flex items-center justify-between gap-2 transition-all shadow-xs ${
            state.currentTier === 2
              ? 'bg-amber-600 text-white border-amber-700 shadow-amber-100 ring-2 ring-amber-300'
              : tier2Check.allowed
                ? 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                : 'bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={tier2Check.reasonTh}
        >
          <div className="flex items-center gap-2">
            {tier2Check.allowed ? (
              <Compass className="w-4 h-4 shrink-0 text-amber-500" />
            ) : (
              <Lock className="w-4 h-4 shrink-0 text-slate-400" />
            )}
            <div>
              <div className="font-bold">ขอคำใบ้</div>
              <div className="text-[10px] opacity-80">Tier 2: Guided Hints</div>
            </div>
          </div>
          {state.currentTier === 2 ? (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
              ใช้งานอยู่
            </span>
          ) : !tier2Check.allowed ? (
            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
              ล็อก
            </span>
          ) : null}
        </button>

        {/* Tier 3 Button */}
        <button
          type="button"
          onClick={() => onSelectTier(3)}
          disabled={disabled || !tier3Check.allowed}
          className={`min-h-[44px] px-3 py-2 rounded-2xl border text-xs font-semibold font-prompt text-left flex items-center justify-between gap-2 transition-all shadow-xs ${
            state.currentTier === 3
              ? 'bg-rose-600 text-white border-rose-700 shadow-rose-100 ring-2 ring-rose-300'
              : tier3Check.allowed
                ? 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                : 'bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={tier3Check.reasonTh}
        >
          <div className="flex items-center gap-2">
            {tier3Check.allowed ? (
              <HelpCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <Lock className="w-4 h-4 shrink-0 text-slate-400" />
            )}
            <div>
              <div className="font-bold">คิดไม่ออกจริงๆ</div>
              <div className="text-[10px] opacity-80">Tier 3: Last Resort</div>
            </div>
          </div>
          {state.currentTier === 3 ? (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
              ใช้งานอยู่
            </span>
          ) : !tier3Check.allowed ? (
            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
              ล็อก
            </span>
          ) : null}
        </button>
      </div>

      {/* Lock explanation helper when hovering or attempting */}
      {state.error && state.error.includes('ปลดล็อก') && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-prompt flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  );
}
