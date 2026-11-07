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
      className="rounded-3xl border-2 border-risk/40 bg-surface p-4 sm:p-6 shadow-e1 space-y-5"
    >
      {/* Workshop Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-risk/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-risk-tint text-risk text-caption font-bold">
            <Sparkles className="w-3.5 h-3.5 text-risk" />
            <span>Socratic Pivot Workshop (AC-8)</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-ink">
            ห้องทดลองปรับมุมมองใหม่ สำหรับจุดที่ต้องพัฒนา (Red Axes)
          </h3>
          <p className="text-caption text-ink-2">
            ช่วยวิเคราะห์และปรับมุมมองโครงงานตามลำดับ 3 ระดับ (ADR 0002) โดยไม่ตัดสิทธิ์การเขียนข้อเสนอโครงงาน
          </p>
        </div>

        {/* Non-blocking skip to Proposal button */}
        <Link
          href={`/proposal?ideaId=${state.originalIdea.id}`}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-2xl bg-surface-2 hover:bg-separator text-ink-2 font-bold text-caption transition-all shrink-0 w-full sm:w-auto"
        >
          <span>ข้ามไปเขียน Proposal →</span>
        </Link>
      </div>

      {/* Red Axes Tabs (if multiple red axes) */}
      {redAxes.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-caption font-bold text-ink-2">
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
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-caption font-bold  transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-risk text-white shadow-e1'
                      : 'bg-risk-tint text-risk hover:bg-risk-tint border border-risk/40'
                  }`}
                >
                  <span></span>
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
          className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-caption font-bold  text-left flex items-center justify-between gap-2 transition-all ${
            state.currentTier === 1
              ? 'bg-accent text-white border-accent  ring-2 ring-accent'
              : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
          }`}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>ระดับ 1: คำถามชวนคิด</span>
          </div>
          <span className="text-caption px-1.5 py-0.5 rounded bg-surface">พร้อมใช้</span>
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
          className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-caption font-bold  text-left flex items-center justify-between gap-2 transition-all ${
            state.currentTier === 2
              ? 'bg-accent text-white border-accent  ring-2 ring-accent'
              : hasTier2
                ? 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                : 'bg-surface-2 text-ink-3 border-separator hover:border-control'
          }`}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 shrink-0" />
            <span>ระดับ 2: กรอบความคิด/คำใบ้</span>
          </div>
          {hasTier2 ? (
            <span className="text-caption px-1.5 py-0.5 rounded bg-surface">ปลดล็อกแล้ว</span>
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-ink-3" />
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
          className={`min-h-[44px] px-3 py-2.5 rounded-2xl border text-caption font-bold  text-left flex items-center justify-between gap-2 transition-all ${
            state.currentTier === 3
              ? 'bg-risk text-white border-risk/40  ring-2 ring-rose-200'
              : hasTier3 || serverHasTier2
                ? 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                : 'bg-surface-2 text-ink-3 border-separator cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span>ระดับ 3: มุมมองใหม่ (2-3 ทาง)</span>
          </div>
          {hasTier3 ? (
            <span className="text-caption px-1.5 py-0.5 rounded bg-surface">ปลดล็อกแล้ว</span>
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-ink-3" />
          )}
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-2 p-3 rounded-2xl bg-caution-tint border border-caution/30 text-caution text-caption">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {/* Tier 1 Content: Socratic Question Prompt */}
      {state.currentTier === 1 && (
        <div className="rounded-2xl bg-accent-tint border border-accent/30 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-accent-text font-bold text-caption sm:text-callout">
            <HelpCircle className="w-4 h-4 text-accent-text shrink-0" />
            <span>คำถามชวนคิดสำหรับด้าน {activeAxisMeta.nameTh}:</span>
          </div>
          <p className="text-ink text-callout sm:text-base leading-relaxed bg-surface p-3.5 rounded-xl border border-accent/30">
            {state.tier1Prompt}
          </p>
          <form onSubmit={handleSubmitTier1} className="pt-2 space-y-2">
            <label htmlFor="pivot-tier1-answer" className="block text-caption font-bold text-ink-2">
              คำตอบของคุณ (ตอบสั้น ๆ หรือบอกว่ายังคิดไม่ออกก็ได้)
            </label>
            <textarea
              id="pivot-tier1-answer"
              value={tier1Answer}
              onChange={(e) => setTier1Answer(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="ลองเขียนสิ่งที่คุณคิดก่อน..."
              className="w-full p-3 rounded-xl border border-accent/30 focus:border-accent focus:ring-2 focus:ring-accent text-callout text-ink outline-hidden resize-none bg-surface"
            />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-caption text-ink-3">
                ส่งคำตอบระดับ 1 ก่อน จึงขอรับคำใบ้กรอบความคิดในระดับ 2 ได้
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !tier1Answer.trim()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-accent hover:bg-accent-press disabled:opacity-50 text-white text-caption font-bold transition-all shadow-e1 flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>{isSubmitting ? 'กำลังส่ง...' : 'ส่งคำตอบและขอกรอบความคิด (Tier 2) →'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tier 2 Content: Thinking Lenses */}
      {state.currentTier === 2 && (
        <div className="rounded-2xl bg-caution-tint border border-caution/30 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-caution font-bold text-caption sm:text-callout">
            <Compass className="w-4 h-4 text-caution shrink-0" />
            <span>กรอบความคิดและคำใบ้เพื่อปรับปรุง (Thinking Lenses):</span>
          </div>

          <div className="space-y-2">
            {state.tier2Lenses.map((lens, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface rounded-xl border border-caution/30 text-caption sm:text-callout text-ink leading-relaxed flex items-start gap-2 shadow-e1"
              >
                <span className="font-bold text-caution shrink-0">{idx + 1}.</span>
                <span>{lens}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-caution/30">
            <span className="text-caption text-ink-3">
              ลองนำกรอบความคิดด้านบนไปปรับแผน หากติดตันจริง ๆ สามารถขอตัวอย่างมุมมองใหม่ (Last Resort)
            </span>
            <button
              type="button"
              onClick={() => void handleRequestTier3()}
              disabled={isSubmitting || !serverHasTier2}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-risk hover:bg-risk text-white text-caption font-bold transition-all shadow-e1 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
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
        <div className="rounded-2xl bg-risk-tint border border-risk/40 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-rose-950 font-bold text-caption sm:text-callout">
            <Lightbulb className="w-4 h-4 text-risk shrink-0" />
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
                      ? 'bg-surface border-risk/40 ring-2 ring-rose-200 shadow-e1'
                      : 'bg-surface border-separator hover:border-risk/40 hover:bg-surface'
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
                        <span className="text-caption font-semibold text-risk">
                          แนวทางที่ {idx + 1}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md bg-risk-tint text-risk text-caption font-bold">
                            เลือกแนวทางนี้
                          </span>
                        )}
                      </div>
                      <p className="text-caption sm:text-callout text-ink leading-relaxed font-medium">
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
              <div className="p-4 rounded-2xl bg-surface border-2 border-risk/40 shadow-e1 space-y-3">
                <div className="flex items-center gap-2 text-caption font-bold text-risk">
                  <PenTool className="w-4 h-4 text-risk shrink-0" />
                  <span>ด่านเรียบเรียงไอเดียด้วยภาษาของตนเอง (Rewrite Gate):</span>
                </div>
                <p className="text-caption text-ink-2">
                  เพื่อป้องกันการคัดลอก กรุณาเขียนสรุปแนวทางนี้ด้วยภาษาและความเข้าใจของคุณเอง (อย่างน้อย 15 ตัวอักษร)
                </p>

                <form onSubmit={handleSubmitRewrite} className="space-y-3">
                  <textarea
                    value={rewriteInput}
                    onChange={(e) => setRewriteInput(e.target.value)}
                    placeholder="เขียนอธิบายว่าคุณจะนำแนวทางนี้ไปปรับใช้อย่างไร..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-control focus:border-risk/40 focus:ring-2 focus:ring-rose-200 text-caption sm:text-callout text-ink outline-hidden resize-none"
                  />

                  {rewriteError && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-risk-tint text-risk text-caption font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{rewriteError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                    <span className="text-caption text-ink-3">
                      จำนวนตัวอักษร: {rewriteInput.trim().length} / 15
                    </span>
                    <button
                      type="submit"
                      disabled={rewriteInput.trim().length < 15}
                      className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-risk hover:bg-risk disabled:opacity-50 text-white font-bold text-caption sm:text-callout transition-all shadow-e1 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>บันทึกการปรับมุมมองใหม่</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <p className="text-caption text-ink-3 italic text-center pt-1">
              คลิกเลือกแนวทางมุมมองใหม่ด้านบน 1 ข้อ เพื่อเข้าสู่ด่านเรียบเรียงไอเดีย
            </p>
          )}

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-good-tint border border-good/30 text-good text-caption sm:text-callout space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle className="w-4 h-4 text-good shrink-0" />
                <span>บันทึกการปรับปรุงมุมมองใหม่ลงในโครงงานเรียบร้อยแล้ว!</span>
              </div>
              <p className="text-caption text-good">
                คุณสามารถประเมินโครงงานใหม่อีกครั้งเพื่อดูคะแนนที่อัปเดต หรือเดินทางต่อไปยังหน้าข้อเสนอโครงงาน (Proposal) ได้ทันที
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <Link
                  href={`/proposal?ideaId=${state.originalIdea.id}`}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-good hover:bg-good text-white font-bold text-caption transition-all shadow-e1 inline-flex items-center gap-1.5"
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
