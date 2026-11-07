'use client';

import React, { Suspense, useEffect, useReducer, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lightbulb,
  Send,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import {
  chatReducer,
  createInitialChatState,
  canRequestTier,
  localWorkFromChat,
} from '@/lib/advisor/chat-reducer';
import { fetchCoachTurn } from '@/lib/advisor/coach-client';
import { TierButtons } from '@/components/advisor/TierButtons';
import { ProgressChips } from '@/components/advisor/ProgressChips';
import { ChatThread } from '@/components/advisor/ChatThread';
import { RewriteGate } from '@/components/advisor/RewriteGate';
import { VariablesLiteForm } from '@/components/advisor/VariablesLiteForm';
import { getInterview, getLearner, getIdea } from '@/lib/storage/store';
import { clearCoachingLocal, ideaTopicKey, loadCoachingLocal, resolveCoachingCard, saveCoachingLocal } from '@/lib/advisor/coaching-local';
import { COACH_INVALIDATION_EVENT, COACH_INVALIDATION_KEY, notifyCoachingInvalidation, type CoachingInvalidation } from '@/lib/advisor/coaching-invalidation';
import { getWipeGeneration, wipeAllLearnerData } from '@/lib/storage/store';
import type { CoachContext } from '@/lib/advisor/coach-dto';
import type { CoachingTier } from '@/lib/advisor/coach-contract';
import type { Idea, IdeaVariablesLite } from '@/types/domain';

function IdeaChatView({ topicCardId, topicKey, savedIdea, resumeOnly = false }: { topicCardId: string | null; topicKey: string; savedIdea?: Idea | null; resumeOnly?: boolean }) {
  const [inputMessage, setInputMessage] = useState('');
  const [rewriteInput, setRewriteInput] = useState('');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const busy = useRef(false);
  const invalidated = useRef(false);
  // Wipe generation seen right after this view's last local write (null: none yet).
  const writtenGeneration = useRef<string | null>(null);
  const requestEpoch = useRef(0);
  const lifetime = useRef(new AbortController());
  // Set when another tab started this topic over: our in-memory conversation is
  // stale and must never be written back over the shared local cache.
  const displaced = useRef(false);
  const [isErased, setIsErased] = useState(false);
  const context = useRef<CoachContext>({ track: 'idea_track', gradeLevel: 'm_ton', goal: 'curiosity' });
  const [state, dispatch] = useReducer(chatReducer, null, () => createInitialChatState({ track: topicCardId ? 'discovery_track' : 'idea_track' }));
  const topicCard = state.topicCard;

  useEffect(() => {
    let active = true;
    if (!invalidated.current) lifetime.current = new AbortController();
    const epoch = requestEpoch.current;
    const learner = getLearner();
    const interview = getInterview();
    const card = topicCardId ? resolveCoachingCard(topicCardId) : null;
    context.current = { track: topicCardId ? 'discovery_track' : 'idea_track', topicCard: card,
      ...(savedIdea ? { ownIdea: { id: savedIdea.id, title: savedIdea.title, description: savedIdea.description } } : {}),
      gradeLevel: savedIdea?.gradeLevel ?? interview?.gradeLevel ?? learner?.gradeLevel ?? 'm_ton', goal: savedIdea?.goal ?? interview?.goal ?? 'curiosity',
      constraints: interview?.constraints };
    let restored = createInitialChatState(context.current);
    if (savedIdea) restored = { ...restored, savedIdea, variablesDraft: savedIdea.variables ?? {} };
    const local = loadCoachingLocal(topicKey);
    if (local) {
      if (local.cached) restored = chatReducer(restored, { type: 'SERVER_HYDRATE', conversation: local.cached });
      restored = { ...restored, phase: local.work.phase, variablesDraft: local.work.variablesDraft,
        studentRewrite: local.work.studentRewrite, savedIdea: local.work.savedIdea ?? savedIdea ?? null,
        drafts: local.work.drafts.map(d => ({ ...d, role: 'student' as const, unverified: true })) };
      setInputMessage(local.work.input);
      setRewriteInput(local.work.rewriteInput);
    }
    dispatch({ type: 'RESTORE', state: restored });
    setIsClientReady(true);
    busy.current = true;
    dispatch({ type: 'REQUEST_STARTED' });
    fetchCoachTurn(resumeOnly ? { action: 'resume', topicKey } : { action: 'open', topicKey, context: context.current }, lifetime.current.signal).then(result => {
      if (!active || invalidated.current || epoch !== requestEpoch.current) return;
      if (result.success && result.conversation) dispatch({ type: 'SERVER_HYDRATE', conversation: result.conversation });
      else dispatch({ type: 'COACH_RESPONSE_FAILURE', error: result.error });
    }).finally(() => { if (active) busy.current = false; });
    return () => { active = false; lifetime.current.abort(); };
  }, [topicCardId, topicKey, savedIdea, resumeOnly]);

  useEffect(() => {
    const invalidate = (detail: CoachingInvalidation) => {
      if (detail.action === 'wipe') {
        invalidated.current = true; requestEpoch.current++; busy.current = false;
        lifetime.current.abort();
        setInputMessage(''); setRewriteInput(''); setIsErased(true);
        dispatch({ type: 'RESTORE', state: createInitialChatState(context.current) });
        // Remove a stale write of ours that raced cross-tab delivery — only if we wrote in the
        // current generation; a late event must not erase work created after that wipe.
        if (writtenGeneration.current === getWipeGeneration()) wipeAllLearnerData();
      } else if (detail.action === 'reset' && detail.topicKey === topicKey) {
        requestEpoch.current++; busy.current = false; displaced.current = true;
        dispatch({ type: 'COACH_RESPONSE_FAILURE', error: 'หัวข้อนี้เริ่มใหม่จากอีกหน้าต่างแล้ว ฉบับร่างในหน้านี้ยังอยู่ กรุณาโหลดบทสนทนาล่าสุด' });
      }
    };
    const custom = (event: Event) => invalidate((event as CustomEvent<CoachingInvalidation>).detail);
    const storage = (event: StorageEvent) => {
      if (event.key === COACH_INVALIDATION_KEY && event.newValue) {
        try { invalidate(JSON.parse(event.newValue)); } catch { /* Invalid external marker is not authority. */ }
      }
    };
    window.addEventListener(COACH_INVALIDATION_EVENT, custom);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(COACH_INVALIDATION_EVENT, custom); window.removeEventListener('storage', storage); };
  }, [topicKey]);

  useEffect(() => {
    if (!isClientReady || invalidated.current) return;
    try {
      saveCoachingLocal(topicKey, { ...localWorkFromChat(state, inputMessage), rewriteInput }, displaced.current ? null : state.conversation);
      writtenGeneration.current = getWipeGeneration();
      setStorageError(null);
    } catch { setStorageError('เครื่องนี้บันทึกฉบับร่างไม่ได้ กรุณาคัดลอกข้อความก่อนปิดหน้า'); }
  }, [state, inputMessage, rewriteInput, isClientReady, topicKey]);

  const requestTurn = async (tier: CoachingTier, text?: string, draftId?: string) => {
    if (busy.current || invalidated.current) return;
    const epoch = requestEpoch.current;
    const id = draftId ?? crypto.randomUUID();
    if (text && !draftId) dispatch({ type: 'STUDENT_SEND_MESSAGE', content: text, id });
    else dispatch({ type: 'REQUEST_STARTED' });
    if (!state.conversation || !state.serverVerified) {
      dispatch({ type: 'COACH_RESPONSE_FAILURE', error: 'ข้อความเก็บเป็นฉบับร่างแล้ว กดเชื่อมต่อบทสนทนา จากนั้นส่งฉบับร่างเพื่อตอบคำถามระดับ 1 บนเซิร์ฟเวอร์' });
      return;
    }
    busy.current = true;
    try {
      const result = await fetchCoachTurn({ action: 'turn', conversationId: state.conversation.id,
        revision: state.conversation.revision, requestId: id, requestedTier: tier, learnerResponse: text }, lifetime.current.signal);
      if (invalidated.current || epoch !== requestEpoch.current) return;
      if (result.success && result.conversation) dispatch({ type: 'SERVER_HYDRATE', conversation: result.conversation, acknowledgedDraftId: text ? id : undefined });
      else dispatch({ type: 'COACH_RESPONSE_FAILURE', error: result.error });
    } finally { busy.current = false; }
  };
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || busy.current) return;
    const text = inputMessage.trim();
    setInputMessage('');
    // A normal answer never implicitly requests Tier 3.
    await requestTurn(1, text);
  };
  const handleSelectTier = async (tier: CoachingTier) => {
    if (!canRequestTier(state, tier).allowed || busy.current) return;
    await requestTurn(tier);
  };
  const reconnect = async () => {
    if (busy.current || invalidated.current) return;
    const epoch = requestEpoch.current;
    busy.current = true;
    dispatch({ type: 'REQUEST_STARTED' });
    try {
      const result = await fetchCoachTurn(resumeOnly ? { action: 'resume', topicKey } : { action: 'open', topicKey, context: context.current }, lifetime.current.signal);
      if (invalidated.current || epoch !== requestEpoch.current) return;
      if (result.success && result.conversation) { displaced.current = false; dispatch({ type: 'SERVER_HYDRATE', conversation: result.conversation }); }
      else dispatch({ type: 'COACH_RESPONSE_FAILURE', error: result.error });
    } finally { busy.current = false; }
  };
  const startNew = async () => {
    if (busy.current || !state.conversation || !window.confirm('เริ่มบทสนทนาใหม่ในหัวข้อนี้? ประวัติและฉบับร่างเดิมของหัวข้อนี้จะถูกลบ หัวข้ออื่นยังอยู่')) return;
    const epoch = requestEpoch.current;
    busy.current = true;
    dispatch({ type: 'REQUEST_STARTED' });
    try {
      const result = await fetchCoachTurn({ action: 'reset', topicKey, conversationId: state.conversation.id, context: state.conversation.context }, lifetime.current.signal);
      if (invalidated.current || epoch !== requestEpoch.current) return;
      if (result.success && result.conversation) {
        try { clearCoachingLocal(topicKey); } catch { setStorageError('เครื่องนี้ลบฉบับร่างไม่ได้'); }
        // Notify other tabs without invalidating this explicitly reset view.
        notifyCoachingInvalidation('reset', topicKey);
        // The same-window listener also receives this event; this view is the
        // one that reset, so it holds the new authoritative conversation.
        displaced.current = false;
        setInputMessage(''); setRewriteInput('');
        dispatch({ type: 'RESTORE', state: createInitialChatState(result.conversation.context) });
        dispatch({ type: 'SERVER_HYDRATE', conversation: result.conversation });
      } else dispatch({ type: 'COACH_RESPONSE_FAILURE', error: result.error });
    } finally { busy.current = false; }
  };

  // Handler: Student submits rewrite for Tier 3 example
  const handleSubmitRewrite = (rewrittenText: string) => {
    dispatch({ type: 'SUBMIT_REWRITE', rewrittenText });
  };

  // Handler: Student submits variables lite form
  const handleSubmitVariables = (variables: IdeaVariablesLite) => {
    dispatch({ type: 'SET_VARIABLES', variables });

    const learner = getLearner();
    dispatch({
      type: 'FINALIZE_IDEA',
      learnerId: learner?.id ?? 'guest-learner',
    });
  };

  if (isErased) return <section role="status" className="space-y-4 rounded-2xl bg-white p-6"><h1 className="text-lg font-bold">ลบข้อมูลแล้ว</h1><p>บทสนทนาและฉบับร่างในหน้านี้ถูกลบแล้ว ไม่มีการบันทึกประวัติเก่ากลับคืน</p><Link href="/interview" className="inline-flex min-h-[44px] items-center rounded-xl bg-indigo-600 px-4 text-white">เริ่มต้นใหม่</Link></section>;
  if (!isClientReady) {
    return (
      <div className="p-8 text-center text-slate-500 font-prompt text-sm">
        กำลังโหลดข้อมูลครูที่ปรึกษา AI...
      </div>
    );
  }

  return (
    <div className="max-w-3xl min-w-0 mx-auto space-y-5 pb-12 break-words">
      {/* Header Bar */}
      <div className="bg-white/90 backdrop-blur-md border border-indigo-100 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 font-prompt">
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <span>
              {state.track === 'discovery_track'
                ? 'เส้นทางค้นหา (Discovery → Idea)'
                : 'เส้นทางมีไอเดีย (Idea Track)'}
            </span>
          </div>

          {topicCard && (
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 font-prompt truncate max-w-[260px]">
              📌 {topicCard.title}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-prompt">
            🧑‍🏫 ครูที่ปรึกษาโครงงาน Socratic AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-prompt mt-1 leading-relaxed">
            AI ไม่คิดไอเดียสำเร็จรูปแทนคุณ แต่จะถามชวนคิด 3 ระดับ เจาะลึก 4 ด้าน จนได้โครงงานที่คุณเป็นเจ้าของเอง
          </p>
        </div>

        {/* Offline notice if fallback is active */}
        {state.isOffline && (
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-prompt flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
<span>ออฟไลน์ / ยังไม่ยืนยันกับเซิร์ฟเวอร์: เก็บข้อความเป็นฉบับร่าง ไม่ใช้ปลดล็อกระดับคำแนะนำ</span>
          </div>
        )}
      </div>

      {topicCard?.starter && (
        <details open className="min-w-0 rounded-2xl border border-purple-200 bg-purple-50/70 p-3 text-sm text-slate-800" data-testid="selected-starter">
          <summary className="min-h-[44px] cursor-pointer py-2 font-bold text-purple-900">การ์ดตั้งต้นที่เลือก (AI สร้างจากคำตอบของคุณ)</summary>
          <p><b>ปัญหา:</b> {topicCard.starter.problem}</p>
          <p><b>แนวทางทดลองคร่าว ๆ:</b> {topicCard.starter.roughDirection}</p>
          <p><b>เชื่อมกับความสนใจ:</b> {topicCard.starter.interestLink}</p>
          <p className="mt-1 text-xs text-slate-600">ยังไม่ใช่โครงงานสำเร็จรูปและยังไม่ตรวจความใหม่ ครูที่ปรึกษาจะชวนคิดต่อจากการ์ดนี้ให้เป็นไอเดียของคุณเอง</p>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.location.assign(`/idea?new=${crypto.randomUUID()}`)} className="min-h-[44px] rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-800">เริ่มไอเดียของฉันเรื่องใหม่</button>
        {topicKey !== 'idea:own' && <Link href="/idea" className="inline-flex min-h-[44px] items-center px-3 text-sm underline">กลับบทสนทนาไอเดียเดิม (ก่อนแยกหัวข้อ)</Link>}
        <button type="button" onClick={reconnect} disabled={state.isWaitingForResponse} className="min-h-[44px] rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-800 disabled:opacity-50">เชื่อมต่อบทสนทนา / โหลดล่าสุด</button>
        <button type="button" onClick={startNew} disabled={state.isWaitingForResponse || !state.conversation} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50">เริ่มบทสนทนาใหม่</button>
      </div>
      {(state.error || storageError) && <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{state.error || storageError}</p>}
      {!state.serverVerified && <p role="status" className="text-sm text-amber-900">ประวัติในเครื่องยังไม่ใช่หลักฐานปลดล็อก กรุณาเชื่อมต่อเพื่อยืนยันคำถามระดับ 1 ส่งคำตอบ (ตอบว่ายังคิดไม่ออกได้) แล้วขอคำใบ้ระดับ 2</p>}
      {state.serverVerified && state.conversation?.turn.source === 'fallback' && <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700">คำแนะนำสำรองอัตโนมัติจากเซิร์ฟเวอร์ — ไม่ได้เรียก AI สด แต่บันทึกขั้นตอนสนทนาได้</p>}
      {/* Phase 1: Chatting & Socratic Exploration */}
      {(state.phase === 'chatting' || state.phase === 'rewrite') && (
        <div className="space-y-4">
          {/* Progress chips & Question Counter */}
          <ProgressChips
            progress={state.aspectProgress}
            questionCount={state.questionCount}
            maxQuestions={8}
          />

          {/* 3-Tier Switcher Buttons */}
          <TierButtons
            state={state}
            onSelectTier={handleSelectTier}
            disabled={state.isWaitingForResponse || state.phase === 'rewrite'}
          />

          {/* Chat Messages View */}
          <ChatThread
            messages={state.messages}
            isWaitingForResponse={state.isWaitingForResponse}
          />

          {state.drafts.length > 0 && <section aria-label="ฉบับร่างที่ยังไม่ยืนยัน" className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <h2 className="text-sm font-bold">ฉบับร่างที่ยังไม่ยืนยันกับเซิร์ฟเวอร์</h2>
            {state.drafts.map(draft => <div key={draft.id} className="space-y-2">
              <p className="whitespace-pre-wrap text-sm">{draft.content}</p>
              <button type="button" disabled={state.isWaitingForResponse || !state.serverVerified} onClick={() => requestTurn(1, draft.content, draft.id)} className="min-h-[44px] rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">ส่งฉบับร่างเพื่อตอบคำถาม</button>
            </div>)}
          </section>}
          {/* Tier 3 Rewrite Gate (if triggered) */}
          {state.phase === 'rewrite' && state.pendingTier3Example && (
            <RewriteGate
              exampleText={state.pendingTier3Example}
              issuedExamples={state.conversation?.state.history.flatMap(h => h.examples ?? [])}
              initialText={rewriteInput}
              onDraftChange={setRewriteInput}
              onSubmitRewrite={handleSubmitRewrite}
              error={state.error}
            />
          )}

          {/* Chat Input Row (hidden during rewrite gate) */}
          {state.phase === 'chatting' && (
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={state.isWaitingForResponse}
                  placeholder="พิมพ์คำตอบหรือมุมมองของคุณที่นี่..."
                  aria-label="คำตอบของคุณ"
                  maxLength={8000}
                  className="flex-1 min-w-0 min-h-[44px] px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs sm:text-sm font-prompt text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
                <button
                  type="submit"
                  aria-label="ส่งคำตอบ"
                  disabled={!inputMessage.trim() || state.isWaitingForResponse}
                  className="min-h-[44px] px-4 sm:px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-prompt text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">ส่งคำตอบ</span>
                </button>
              </div>

              {/* Skip to variables button when at least 2 questions answered */}
              {state.questionCount >= 2 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'GO_TO_VARIABLES' })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 font-prompt py-1 px-2 flex items-center gap-1 min-h-[44px]"
                  >
                    <span>พร้อมแล้ว ข้ามไปสรุปตัวแปรต่อ →</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Phase 2: Variables Step Lite */}
      {state.phase === 'variables' && (
        <div className="space-y-4">
          <VariablesLiteForm
            initialValues={state.variablesDraft}
            onSubmitVariables={handleSubmitVariables}
          />
        </div>
      )}

      {/* Phase 3: Done & Saved Idea Summary */}
      {state.phase === 'done' && state.savedIdea && (
        <div className="bg-white/95 border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold font-prompt">
                <span>✨ บันทึกโครงงานสำเร็จ!</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-prompt mt-1">
                {state.savedIdea.title}
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm font-prompt text-slate-700">
            <div>
              <span className="font-bold text-slate-900">คำอธิบายโครงงาน:</span>
              <p className="mt-1 whitespace-pre-wrap">{state.savedIdea.description}</p>
            </div>

            {state.savedIdea.variables && (
              <div className="pt-3 border-t border-slate-200/80 space-y-1.5">
                <span className="font-bold text-slate-900">ตัวแปรและการทดลอง (Variables Lite):</span>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>
                    <strong className="text-slate-800">ตัวแปรต้น:</strong>{' '}
                    {state.savedIdea.variables.independent}
                  </li>
                  <li>
                    <strong className="text-slate-800">ตัวแปรตาม:</strong>{' '}
                    {state.savedIdea.variables.dependent}
                  </li>
                  <li>
                    <strong className="text-slate-800">ตัวแปรควบคุม:</strong>{' '}
                    {state.savedIdea.variables.controlled.join(', ')}
                  </li>
                  <li>
                    <strong className="text-slate-800">ชุดควบคุม:</strong>{' '}
                    {state.savedIdea.variables.controlGroup}
                  </li>
                  <li>
                    <strong className="text-slate-800">จำนวนซ้ำ:</strong>{' '}
                    n = {state.savedIdea.variables.replicates}
                  </li>
                </ul>
              </div>
            )}

            {state.savedIdea.usedTier3Example && state.savedIdea.tier3Rewrite && (
              <div className="pt-3 border-t border-slate-200/80">
                <span className="font-bold text-rose-800">
                  สำนวนภาษาของผู้เรียน (Tier 3 Rewrite):
                </span>
                <p className="mt-1 italic text-slate-600">&ldquo;{state.savedIdea.tier3Rewrite}&rdquo;</p>
              </div>
            )}
          </div>

          <Link href={`/variables?ideaId=${encodeURIComponent(state.savedIdea.id)}`} className="flex min-h-[44px] items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-bold text-indigo-800">
            ตารางแยกตัวแปร & ชุดควบคุม + เช็กลิสต์ความปลอดภัย →
          </Link>
          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href={`/evaluation?ideaId=${state.savedIdea.id}`}
              className="w-full sm:flex-1 min-h-[44px] px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-prompt text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100"
            >
              <span>ไปประเมินโครงงาน 5 ด้านต่อ (Evaluation) →</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/discovery"
              className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-prompt text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>กลับสู่ Discovery</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaChatRouter() {
  const params = useSearchParams();
  const query = params.toString();
  const [route, setRoute] = useState<{ topicCardId: string | null; topicKey: string; savedIdea?: Idea | null; resumeOnly?: boolean } | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    const search = new URLSearchParams(query);
    const ideaId = search.get('ideaId');
    const idea = ideaId ? getIdea(ideaId) : null;
    if (ideaId && !idea) { setMissing(true); setRoute(null); return; }
    setMissing(false);
    const cardId = idea?.sourceTopicCardId ?? search.get('topicCardId');
    if (cardId && !resolveCoachingCard(cardId)) {
      // Never read Guest snapshots as account context. Existing cloud rooms
      // can still resume by their unchanged card key, without importing text.
      setRoute({ topicCardId: cardId, topicKey: ideaTopicKey(cardId), resumeOnly: true }); return;
    }
    // Retain existing card keys and the old unbound own room. When a local
    // legacy room identifies this saved Idea, resume it rather than orphan it.
    const legacy = idea && !cardId ? loadCoachingLocal('idea:own') : null;
    const topicKey = idea?.coachingTopicKey ?? (cardId ? ideaTopicKey(cardId) :
      legacy?.work.savedIdea?.id === idea?.id && idea ? 'idea:own' :
      idea ? `idea:${idea.id}` : search.get('new') ? `idea:${search.get('new')}` : 'idea:own');
    setRoute({ topicCardId: cardId, topicKey, savedIdea: idea });
  }, [query]);
  if (missing) return <p role="alert">ไม่พบไอเดียนี้ในเครื่อง ไม่มีการเปิดหรือเขียนทับบทสนทนาอื่น <Link href="/idea">กลับไอเดียเดิม</Link></p>;
  return route ? <IdeaChatView key={route.topicKey} {...route} /> : <p>กำลังโหลดไอเดีย…</p>;
}

export default function IdeaPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500 font-prompt text-sm">
            กำลังโหลดหน้าสนทนากับครูที่ปรึกษา AI...
          </div>
        }
      >
        <IdeaChatRouter />
      </Suspense>
    </AppShell>
  );
}
