'use client';

import React, { useEffect, useState } from 'react';
import {
  Compass,
  HelpCircle,
  Sparkles,
  Lock,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  PenTool,
  RefreshCw,
} from 'lucide-react';
import type {
  EvaluationAxis,
  Idea,
  Constraints,
} from '@/types/domain';
import {
  createInitialPivotState,
  pivotReducer,
  type PivotState,
} from '@/lib/pivot/pivot-reducer';
import { openPivot, advancePivot, type PivotResult } from '@/lib/pivot/pivot-client';
import type { PivotView } from '@/lib/pivot/pivot-dto';
import { isRewriteAcceptable } from '@/lib/advisor/chat-reducer';
import { AXIS_META } from '@/lib/evaluation/view-model';
import { saveIdea, savePivot } from '@/lib/storage/store';
import Link from 'next/link';

export interface PivotWorkshopProps {
  idea: Idea;
  redAxes: EvaluationAxis[];
  constraints?: Constraints;
  onIdeaUpdated?: (updatedIdea: Idea) => void;
}

export function PivotWorkshop({
  idea,
  redAxes,
  constraints,
  onIdeaUpdated,
}: PivotWorkshopProps) {
  const [state, setState] = useState<PivotState>(() =>
    createInitialPivotState({
      idea,
      redAxes,
      constraints,
    })
  );

  const [rewriteInput, setRewriteInput] = useState('');
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  // DEF-02: server-authoritative progression for owner + idea + axis. Without it
  // (offline/unavailable) the workshop offers local Tier 1/2 guidance only.
  const [serverPivot, setServerPivot] = useState<PivotView | null>(null);
  const [tier1Answer, setTier1Answer] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const applyResult = (result: PivotResult) => {
    const pivot = result.pivot;
    if (pivot) {
      setServerPivot(pivot);
      setState((prev) => pivotReducer(prev, { type: 'SERVER_SYNC', pivot }));
      if (pivot.tier1Response) setTier1Answer((prev) => prev || pivot.tier1Response || '');
    }
    if (!result.ok) {
      if (result.kind === 'not_found') setServerPivot(null);
      setNotice(result.messageTh);
    } else {
      setNotice(null);
    }
  };

  const originalIdea = state.originalIdea;
  const activeAxis = state.activeAxis;
  useEffect(() => {
    let live = true;
    setServerPivot(null);
    void openPivot({ idea: originalIdea, axis: activeAxis }).then((result) => { if (live) applyResult(result); });
    return () => { live = false; };
  }, [originalIdea, activeAxis]);

  if (redAxes.length === 0) {
    return null;
  }

  const activeAxisMeta = AXIS_META[state.activeAxis];
  const hasTier2 = state.unlockedTiers.includes(2);
  const hasTier3 = state.unlockedTiers.includes(3);
  const serverHasTier2 = serverPivot?.unlockedTiers.some(t => t === 2) ?? false;

  // Switch Red Axis
  const handleSwitchAxis = (axis: EvaluationAxis) => {
    if (isSubmitting) return;
    setServerPivot(null);
    setState((prev) => pivotReducer(prev, { type: 'SWITCH_AXIS', axis }));
    setRewriteInput('');
    setRewriteError(null);
    setSavedSuccess(false);
    setTier1Answer('');
    setNotice(null);
  };

  // Tier 1 answer -> Tier 2 lenses. The server records the answer; offline the
  // hint is local only and is never evidence for Tier 3 (ADR 0002).
  const handleSubmitTier1 = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const answer = tier1Answer.trim();
    if (!answer) {
      setNotice('ลองตอบคำถามระดับ 1 ด้วยความคิดของตัวเองก่อน ตอบสั้น ๆ หรือบอกว่ายังคิดไม่ออกก็ได้');
      return;
    }
    if (serverHasTier2) {
      setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 2 }));
      return;
    }
    setIsSubmitting(true);
    const result = serverPivot
      ? await advancePivot({ pivot: serverPivot, requestedTier: 2, learnerResponse: answer })
      : await openPivot({ idea: state.originalIdea, axis: state.activeAxis }).then((opened) =>
          opened.ok ? advancePivot({ pivot: opened.pivot, requestedTier: 2, learnerResponse: answer }) : opened);
    setIsSubmitting(false);
    if (result.ok) {
      applyResult(result);
      setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 2 }));
      return;
    }
    if (result.kind === 'offline' || result.kind === 'unavailable') {
      setState((prev) => pivotReducer(pivotReducer(prev, { type: 'COACH_FAILURE_FALLBACK' }), { type: 'UNLOCK_TIER_2' }));
      setNotice('ใช้คำใบ้ระดับ 2 ที่เก็บในเครื่องไปก่อน (ยังไม่ได้บันทึกบนเซิร์ฟเวอร์) ตัวอย่างระดับ 3 ต้องเชื่อมต่อแล้วส่งคำตอบระดับ 1 อีกครั้ง');
      return;
    }
    applyResult(result);
  };

  // Tier 3 (Last Resort Angles): server-verified only, never offline.
  const handleRequestTier3 = async () => {
    if (!serverPivot || !serverHasTier2) {
      setNotice('ตัวอย่างมุมมองใหม่จะเปิดหลังจากส่งคำตอบระดับ 1 และได้รับกรอบความคิดระดับ 2 ที่บันทึกบนเซิร์ฟเวอร์แล้ว');
      return;
    }
    setIsSubmitting(true);
    const result = await advancePivot({ pivot: serverPivot, requestedTier: 3 });
    setIsSubmitting(false);
    applyResult(result);
    if (result.ok) setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 3 }));
  };

  // Select an angle to rewrite
  const handleSelectAngle = (angle: string) => {
    setState((prev) => pivotReducer(prev, { type: 'SELECT_ANGLE', angle }));
    setRewriteInput('');
    setRewriteError(null);
  };

  // Submit student rewrite (Rewrite Gate)
  const handleSubmitRewrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.pendingAngle) return;

    const check = isRewriteAcceptable(state.pendingAngle, rewriteInput);
    if (!check.acceptable) {
      setRewriteError(check.reasonTh ?? 'ข้อความยังไม่ผ่านเกณฑ์การเขียนใหม่');
      return;
    }

    setRewriteError(null);
    const nextState = pivotReducer(state, {
      type: 'SUBMIT_REWRITE',
      rewrite: rewriteInput,
    });
    setState(nextState);

    if (nextState.updatedIdea && nextState.pivotRecord) {
      // Persist to store
      saveIdea(nextState.updatedIdea);
      savePivot(nextState.pivotRecord);
      setSavedSuccess(true);
      if (onIdeaUpdated) {
        onIdeaUpdated(nextState.updatedIdea);
      }
    }
  };

  return (
    <div
      id="pivot-workshop"
      className="rounded-3xl border-2 border-rose-300 bg-white p-4 sm:p-6 shadow-sm space-y-5"
    >
      {/* Workshop Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold font-prompt">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Socratic Pivot Workshop (AC-8)</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-prompt">
            ห้องทดลองปรับมุมมองใหม่ สำหรับจุดที่ต้องพัฒนา (Red Axes)
          </h3>
          <p className="text-xs text-slate-600 font-prompt">
            ช่วยวิเคราะห์และปรับมุมมองโครงงานตามลำดับ 3 ระดับ (ADR 0002) โดยไม่ตัดสิทธิ์การเขียนข้อเสนอโครงงาน
          </p>
        </div>

        {/* Non-blocking skip to Proposal button */}
        <Link
          href={`/proposal?ideaId=${state.originalIdea.id}`}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-prompt text-xs transition-all shrink-0 w-full sm:w-auto"
        >
          <span>ข้ามไปเขียน Proposal →</span>
        </Link>
      </div>

      {/* Red Axes Tabs (if multiple red axes) */}
      {redAxes.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-600 font-prompt">
            เลือกด้านที่ต้องการปรับมุมมอง:
          </span>
          <div className="flex flex-wrap gap-2">
            {redAxes.map((axis) => {
              const meta = AXIS_META[axis];
              const isSelected = state.activeAxis === axis;
              return (
                <button
                  key={axis}
                  type="button"
                  onClick={() => handleSwitchAxis(axis)}
                  disabled={isSubmitting}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-xs font-bold font-prompt transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <span>🔴</span>
                  <span>{meta.nameTh}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Progressive 3-Tier Scaffolding Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Tier 1 Tab */}
        <button
          type="button"
          onClick={() => setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 1 }))}
          className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-xs font-bold font-prompt text-left flex items-center justify-between gap-2 transition-all ${
            state.currentTier === 1
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-100 ring-2 ring-indigo-200'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>ระดับ 1: คำถามชวนคิด</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">พร้อมใช้</span>
        </button>

        {/* Tier 2 Tab */}
        <button
          type="button"
          onClick={() => {
            if (hasTier2) {
              setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 2 }));
            } else {
              setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 1 }));
              setNotice('ตอบคำถามระดับ 1 ก่อน แล้วกดขอกรอบความคิดระดับ 2');
            }
          }}
          disabled={isSubmitting}
          className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-xs font-bold font-prompt text-left flex items-center justify-between gap-2 transition-all ${
            state.currentTier === 2
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-100 ring-2 ring-indigo-200'
              : hasTier2
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 shrink-0" />
            <span>ระดับ 2: กรอบความคิด/คำใบ้</span>
          </div>
          {hasTier2 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">ปลดล็อกแล้ว</span>
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          )}
        </button>

        {/* Tier 3 Tab */}
        <button
          type="button"
          onClick={() => {
            if (hasTier3) {
              setState((prev) => pivotReducer(prev, { type: 'SELECT_TIER', tier: 3 }));
            } else if (serverHasTier2) {
              void handleRequestTier3();
            }
          }}
          disabled={(!hasTier3 && !serverHasTier2) || isSubmitting}
          className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-xs font-bold font-prompt text-left flex items-center justify-between gap-2 transition-all ${
            state.currentTier === 3
              ? 'bg-rose-600 text-white border-rose-700 shadow-rose-100 ring-2 ring-rose-200'
              : hasTier3 || serverHasTier2
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span>ระดับ 3: มุมมองใหม่ (2-3 ทาง)</span>
          </div>
          {hasTier3 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">ปลดล็อกแล้ว</span>
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          )}
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-prompt">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tier 1 Content: Socratic Question Prompt */}
      {state.currentTier === 1 && (
        <div className="rounded-2xl bg-indigo-50/60 border border-indigo-200 p-4 sm:p-5 space-y-3 font-prompt">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>คำถามชวนคิดสำหรับด้าน {activeAxisMeta.nameTh}:</span>
          </div>
          <p className="text-slate-800 text-sm sm:text-base leading-relaxed bg-white p-3.5 rounded-xl border border-indigo-100">
            {state.tier1Prompt}
          </p>
          <form onSubmit={handleSubmitTier1} className="pt-2 space-y-2">
            <label htmlFor="pivot-tier1-answer" className="block text-xs font-bold text-slate-700">
              คำตอบของคุณ (ตอบสั้น ๆ หรือบอกว่ายังคิดไม่ออกก็ได้)
            </label>
            <textarea
              id="pivot-tier1-answer"
              value={tier1Answer}
              onChange={(e) => setTier1Answer(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="ลองเขียนสิ่งที่คุณคิดก่อน..."
              className="w-full p-3 rounded-xl border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm text-slate-900 outline-hidden font-prompt resize-none bg-white"
            />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                ส่งคำตอบระดับ 1 ก่อน จึงขอรับคำใบ้กรอบความคิดในระดับ 2 ได้
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !tier1Answer.trim()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>{isSubmitting ? 'กำลังส่ง...' : 'ส่งคำตอบและขอกรอบความคิด (Tier 2) →'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tier 2 Content: Thinking Lenses */}
      {state.currentTier === 2 && (
        <div className="rounded-2xl bg-amber-50/60 border border-amber-200 p-4 sm:p-5 space-y-3 font-prompt">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
            <Compass className="w-4 h-4 text-amber-600 shrink-0" />
            <span>กรอบความคิดและคำใบ้เพื่อปรับปรุง (Thinking Lenses):</span>
          </div>

          <div className="space-y-2">
            {state.tier2Lenses.map((lens, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-amber-100 text-xs sm:text-sm text-slate-800 leading-relaxed flex items-start gap-2 shadow-xs"
              >
                <span className="font-bold text-amber-600 shrink-0">{idx + 1}.</span>
                <span>{lens}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-amber-200/60">
            <span className="text-xs text-slate-500">
              ลองนำกรอบความคิดด้านบนไปปรับแผน หากติดตันจริง ๆ สามารถขอตัวอย่างมุมมองใหม่ (Last Resort)
            </span>
            <button
              type="button"
              onClick={() => void handleRequestTier3()}
              disabled={isSubmitting || !serverHasTier2}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังประมวลผล...</span>
                </>
              ) : (
                <span>ขอมุมมองใหม่ตัวอย่าง (Tier 3 Last Resort) →</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tier 3 Content: 2-3 Pivot Angles + Rewrite Gate */}
      {state.currentTier === 3 && (
        <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-4 sm:p-5 space-y-4 font-prompt">
          <div className="flex items-center gap-2 text-rose-950 font-bold text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4 text-rose-600 shrink-0" />
            <span>ทางเลือกมุมมองใหม่ 2–3 แนวทาง (Pivot Angles):</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {state.tier3Examples.map((angle, idx) => {
              const isSelected = state.pendingAngle === angle;
              return (
                <div
                  key={idx}
                  onClick={() => handleSelectAngle(angle)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-rose-600 ring-2 ring-rose-200 shadow-sm'
                      : 'bg-white/90 border-slate-200 hover:border-rose-300 hover:bg-white'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectAngle(angle);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-rose-600">
                          แนวทางที่ {idx + 1}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                            เลือกแนวทางนี้
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                        {angle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ADR 0002 Rewrite Gate */}
          {state.pendingAngle ? (
            <div className="pt-2 space-y-3">
              <div className="p-4 rounded-2xl bg-white border-2 border-rose-300 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                  <PenTool className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>ด่านเรียบเรียงไอเดียด้วยภาษาของตนเอง (Rewrite Gate):</span>
                </div>
                <p className="text-xs text-slate-600">
                  เพื่อป้องกันการคัดลอก กรุณาเขียนสรุปแนวทางนี้ด้วยภาษาและความเข้าใจของคุณเอง (อย่างน้อย 15 ตัวอักษร)
                </p>

                <form onSubmit={handleSubmitRewrite} className="space-y-3">
                  <textarea
                    value={rewriteInput}
                    onChange={(e) => setRewriteInput(e.target.value)}
                    placeholder="เขียนอธิบายว่าคุณจะนำแนวทางนี้ไปปรับใช้อย่างไร..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm text-slate-900 outline-hidden font-prompt resize-none"
                  />

                  {rewriteError && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{rewriteError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-slate-400">
                      จำนวนตัวอักษร: {rewriteInput.trim().length} / 15
                    </span>
                    <button
                      type="submit"
                      disabled={rewriteInput.trim().length < 15}
                      className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>บันทึกการปรับมุมมองใหม่</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center pt-1">
              👆 คลิกเลือกแนวทางมุมมองใหม่ด้านบน 1 ข้อ เพื่อเข้าสู่ด่านเรียบเรียงไอเดีย
            </p>
          )}

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-prompt space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>บันทึกการปรับปรุงมุมมองใหม่ลงในโครงงานเรียบร้อยแล้ว!</span>
              </div>
              <p className="text-xs text-emerald-700">
                คุณสามารถประเมินโครงงานใหม่อีกครั้งเพื่อดูคะแนนที่อัปเดต หรือเดินทางต่อไปยังหน้าข้อเสนอโครงงาน (Proposal) ได้ทันที
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <Link
                  href={`/proposal?ideaId=${state.originalIdea.id}`}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>ไปเขียนข้อเสนอโครงงานต่อ (Proposal) →</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
