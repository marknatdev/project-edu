'use client';

import React, { Suspense, useEffect, useReducer, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowUp, CheckCircle2, MoreHorizontal, WifiOff } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import {
  chatReducer,
  createInitialChatState,
  localWorkFromChat,
} from '@/lib/advisor/chat-reducer';
import { fetchCoachTurn } from '@/lib/advisor/coach-client';
import { ModePicker } from '@/components/advisor/ModePicker';
import { ProgressChips } from '@/components/advisor/ProgressChips';
import { ChatThread } from '@/components/advisor/ChatThread';
import { RewriteGate } from '@/components/advisor/RewriteGate';
import { VariablesLiteForm } from '@/components/advisor/VariablesLiteForm';
import { getInterview, getLearner, getIdea } from '@/lib/storage/store';
import { clearCoachingLocal, ideaTopicKey, loadCoachingLocal, resolveCoachingCard, saveCoachingLocal } from '@/lib/advisor/coaching-local';
import { COACH_INVALIDATION_EVENT, COACH_INVALIDATION_KEY, notifyCoachingInvalidation, type CoachingInvalidation } from '@/lib/advisor/coaching-invalidation';
import { getWipeGeneration, wipeAllLearnerData } from '@/lib/storage/store';
import type { CoachContext } from '@/lib/advisor/coach-dto';
import type { CoachMode } from '@/lib/advisor/coach-contract';
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
  const [mode, setMode] = useState<CoachMode>('auto');
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

  const requestTurn = async (text?: string, draftId?: string) => {
    if (busy.current || invalidated.current) return;
    const epoch = requestEpoch.current;
    const id = draftId ?? crypto.randomUUID();
    if (text && !draftId) dispatch({ type: 'STUDENT_SEND_MESSAGE', content: text, id });
    else dispatch({ type: 'REQUEST_STARTED' });
    if (!state.conversation || !state.serverVerified) {
      dispatch({ type: 'COACH_RESPONSE_FAILURE', error: 'ข้อความเก็บเป็นฉบับร่างแล้ว กดเชื่อมต่อใหม่ แล้วส่งฉบับร่างอีกครั้ง' });
      return;
    }
    busy.current = true;
    try {
      const result = await fetchCoachTurn({ action: 'turn', conversationId: state.conversation.id,
        revision: state.conversation.revision, requestId: id, mode, learnerResponse: text }, lifetime.current.signal);
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
    await requestTurn(text);
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

  const secondary = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-surface-2 px-4 font-medium text-ink hover:bg-separator disabled:opacity-40';
  const primary = 'inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-accent px-5 font-medium text-accent-on hover:bg-accent-press disabled:opacity-40';
  const topicTitle = state.savedIdea?.title ?? topicCard?.title;

  if (isErased) return <section role="status" className="flex flex-col gap-4 rounded-3xl bg-surface p-6"><h1 className="text-title">ลบข้อมูลแล้ว</h1><p className="text-ink-2">บทสนทนาและฉบับร่างในหน้านี้ถูกลบแล้ว ไม่มีการบันทึกประวัติเก่ากลับคืน</p><Link href="/interview" className={primary}>เริ่มต้นใหม่</Link></section>;
  if (!isClientReady) return <p role="status" className="py-12 text-center text-ink-2">กำลังเปิดบทสนทนากับครูที่ปรึกษา…</p>;

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-large-title">ที่ปรึกษา</h1>
          {topicTitle && <p className="text-callout text-ink-2 [overflow-wrap:anywhere]">{topicTitle}</p>}
        </div>
        <details className="relative shrink-0">
          <summary aria-label="ตัวเลือกบทสนทนา" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-accent-text hover:bg-surface-2 [&::-webkit-details-marker]:hidden"><MoreHorizontal className="h-6 w-6" aria-hidden /></summary>
          <div className="absolute right-0 z-20 mt-2 flex w-64 flex-col rounded-2xl bg-surface p-2 shadow-e2">
            <button type="button" onClick={() => window.location.assign(`/idea?new=${crypto.randomUUID()}`)} className="min-h-11 rounded-lg px-3 text-left hover:bg-surface-2">เริ่มไอเดียเรื่องใหม่</button>
            {topicKey !== 'idea:own' && <Link href="/idea" className="flex min-h-11 items-center rounded-lg px-3 hover:bg-surface-2">กลับบทสนทนาไอเดียเดิม</Link>}
            <button type="button" onClick={reconnect} disabled={state.isWaitingForResponse} className="min-h-11 rounded-lg px-3 text-left hover:bg-surface-2 disabled:opacity-40">โหลดบทสนทนาล่าสุด</button>
            <button type="button" onClick={startNew} disabled={state.isWaitingForResponse || !state.conversation} className="min-h-11 rounded-lg px-3 text-left text-risk hover:bg-risk-tint disabled:opacity-40">เริ่มบทสนทนานี้ใหม่</button>
          </div>
        </details>
      </header>

      {topicCard?.starter && (
        <details className="rounded-2xl bg-surface p-4 shadow-e1" data-testid="selected-starter">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">การ์ดตั้งต้นที่เลือก (AI สร้างจากคำตอบของคุณ)</summary>
          <dl className="flex flex-col gap-2 text-callout">
            <div><dt className="text-ink-2">ปัญหา</dt><dd>{topicCard.starter.problem}</dd></div>
            <div><dt className="text-ink-2">แนวทางทดลองคร่าว ๆ</dt><dd>{topicCard.starter.roughDirection}</dd></div>
            <div><dt className="text-ink-2">เชื่อมกับความสนใจ</dt><dd>{topicCard.starter.interestLink}</dd></div>
          </dl>
          <p className="mt-2 text-caption text-ink-2">ยังไม่ใช่โครงงานสำเร็จรูปและยังไม่ตรวจความใหม่ ครูที่ปรึกษาจะชวนคิดต่อให้เป็นไอเดียของคุณเอง</p>
        </details>
      )}

      {state.isOffline && <p role="status" className="flex items-start gap-2 rounded-xl bg-caution-tint px-4 py-3 text-callout text-caution"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ข้อความจะเก็บเป็นฉบับร่างในเครื่อง</p>}
      {(state.error || storageError) && <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-caution-tint px-4 py-3 text-callout text-caution">{state.error || storageError}{!state.serverVerified && <button type="button" onClick={reconnect} disabled={state.isWaitingForResponse} className="min-h-11 rounded-lg px-2 font-medium underline underline-offset-4">เชื่อมต่อใหม่</button>}</p>}

      {(state.phase === 'chatting' || state.phase === 'rewrite') && (
        <>
          <div className="sticky top-14 z-10 -mx-5 flex flex-col gap-3 border-b border-separator bg-bg/95 px-5 pb-3 pt-1 backdrop-blur-xl md:top-0 md:mx-0 md:px-0">
            <ModePicker value={mode} onChange={setMode} disabled={state.isWaitingForResponse || state.phase === 'rewrite'} />
            <ProgressChips progress={state.aspectProgress} questionCount={state.questionCount} maxQuestions={8} />
          </div>

          <ChatThread messages={state.messages} isWaitingForResponse={state.isWaitingForResponse} />

          {state.drafts.length > 0 && <section aria-label="ฉบับร่างที่ยังไม่ได้ส่ง" className="flex flex-col gap-3 rounded-2xl bg-caution-tint p-4">
            <h2 className="font-medium text-caution">ฉบับร่างที่ยังไม่ได้ส่ง</h2>
            {state.drafts.map(draft => <div key={draft.id} className="flex flex-col gap-2">
              <p className="whitespace-pre-wrap text-callout">{draft.content}</p>
              <button type="button" disabled={state.isWaitingForResponse || !state.serverVerified} onClick={() => requestTurn(draft.content, draft.id)} className={secondary}>ส่งฉบับร่างนี้</button>
            </div>)}
          </section>}

          {state.phase === 'rewrite' && state.pendingTier3Example && (
            <RewriteGate
              exampleText={state.pendingTier3Example}
              issuedExamples={[...(state.conversation?.state.history ?? [])].reverse().find(h => h.examples?.length)?.examples}
              initialText={rewriteInput}
              onDraftChange={setRewriteInput}
              onSubmitRewrite={handleSubmitRewrite}
              onDefer={() => dispatch({ type: 'DEFER_REWRITE' })}
              error={state.error}
            />
          )}

          {state.phase === 'chatting' && (
            <form onSubmit={handleSendMessage} className="sticky bottom-[92px] z-10 flex flex-col gap-2 md:bottom-6">
              <div className="flex items-center gap-2 rounded-3xl border border-control bg-surface py-1.5 pl-4 pr-1.5 shadow-e1 focus-within:ring-[3px] focus-within:ring-accent">
                <label htmlFor="coach-input" className="sr-only">ข้อความถึงครูที่ปรึกษา</label>
                <input id="coach-input" type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} disabled={state.isWaitingForResponse}
                  placeholder="พิมพ์ข้อความถึงครูที่ปรึกษา…" maxLength={8000} enterKeyHint="send"
                  className="min-h-11 min-w-0 flex-1 bg-transparent placeholder:text-ink-3 focus:outline-none" />
                <button type="submit" aria-label="ส่งข้อความ" disabled={!inputMessage.trim() || state.isWaitingForResponse}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on hover:bg-accent-press disabled:opacity-40"><ArrowUp className="h-5 w-5" aria-hidden /></button>
              </div>
              {state.questionCount >= 2 && (
                <button type="button" onClick={() => dispatch({ type: 'GO_TO_VARIABLES' })} className="self-end rounded-lg px-3 py-2 text-callout font-medium text-accent-text hover:bg-surface-2 min-h-11">พร้อมแล้ว ไปสรุปตัวแปร</button>
              )}
            </form>
          )}
        </>
      )}

      {state.phase === 'variables' && <VariablesLiteForm initialValues={state.variablesDraft} onSubmitVariables={handleSubmitVariables} />}

      {state.phase === 'done' && state.savedIdea && (
        <section aria-labelledby="saved-title" className="flex flex-col gap-5 rounded-3xl bg-surface p-6 shadow-e1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-good-tint text-good"><CheckCircle2 className="h-6 w-6" aria-hidden /></span>
            <div className="min-w-0">
              <p className="text-caption text-good">บันทึกไอเดียแล้ว</p>
              <h2 id="saved-title" className="text-title [overflow-wrap:anywhere]">{state.savedIdea.title}</h2>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 text-callout">
            <div><p className="text-ink-2">คำอธิบาย</p><p className="whitespace-pre-wrap">{state.savedIdea.description}</p></div>
            {state.savedIdea.variables && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-separator pt-3">
                <dt className="text-ink-2">ตัวแปรต้น</dt><dd>{state.savedIdea.variables.independent}</dd>
                <dt className="text-ink-2">ตัวแปรตาม</dt><dd>{state.savedIdea.variables.dependent}</dd>
                <dt className="text-ink-2">ตัวแปรควบคุม</dt><dd>{state.savedIdea.variables.controlled.join(', ')}</dd>
                <dt className="text-ink-2">ชุดควบคุม</dt><dd>{state.savedIdea.variables.controlGroup}</dd>
                <dt className="text-ink-2">จำนวนซ้ำ</dt><dd>n = {state.savedIdea.variables.replicates}</dd>
              </dl>
            )}
            {state.savedIdea.usedTier3Example && state.savedIdea.tier3Rewrite && (
              <div className="border-t border-separator pt-3"><p className="text-ink-2">แนวทางที่คุณเขียนเอง</p><p>“{state.savedIdea.tier3Rewrite}”</p></div>
            )}
          </div>
          <Link href={`/evaluation?ideaId=${encodeURIComponent(state.savedIdea.id)}`} className={primary}>ไปประเมินไอเดีย<ArrowRight className="h-5 w-5" aria-hidden /></Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/variables?ideaId=${encodeURIComponent(state.savedIdea.id)}`} className={`${secondary} flex-1`}>ตารางตัวแปรและความปลอดภัย</Link>
            <Link href="/discovery" className={`${secondary} flex-1`}>กลับไปดูหัวข้ออื่น</Link>
          </div>
        </section>
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
  if (missing) return <p role="alert" className="rounded-xl bg-caution-tint px-4 py-3 text-caution">ไม่พบไอเดียนี้ในเครื่อง ไม่มีการเปิดหรือเขียนทับบทสนทนาอื่น <Link href="/idea" className="font-medium underline">กลับไอเดียเดิม</Link></p>;
  return route ? <IdeaChatView key={route.topicKey} {...route} /> : <p role="status" className="py-12 text-center text-ink-2">กำลังโหลดไอเดีย…</p>;
}

export default function IdeaPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <p role="status" className="py-12 text-center text-ink-2">กำลังเปิดบทสนทนากับครูที่ปรึกษา…</p>
        }
      >
        <IdeaChatRouter />
      </Suspense>
    </AppShell>
  );
}
