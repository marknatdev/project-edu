'use client';

import React, { Suspense, useEffect, useReducer, useState } from 'react';
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
} from '@/lib/advisor/chat-reducer';
import { fetchCoachTurn } from '@/lib/advisor/coach-client';
import { TierButtons } from '@/components/advisor/TierButtons';
import { ProgressChips } from '@/components/advisor/ProgressChips';
import { ChatThread } from '@/components/advisor/ChatThread';
import { RewriteGate } from '@/components/advisor/RewriteGate';
import { VariablesLiteForm } from '@/components/advisor/VariablesLiteForm';
import { getInterview, getLearner } from '@/lib/storage/store';
import { TOPIC_CARDS } from '@/data/topic-cards';
import type { CoachingTier } from '@/lib/ai/socratic-coach';
import type { IdeaVariablesLite, TopicCard } from '@/types/domain';

function IdeaChatView() {
  const searchParams = useSearchParams();

  const topicCardId = searchParams.get('topicCardId');
  const [topicCard, setTopicCard] = useState<TopicCard | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);

  // Initialize state reducer
  const [state, dispatch] = useReducer(chatReducer, null, () => {
    return createInitialChatState({
      track: topicCardId ? 'discovery_track' : 'idea_track',
      topicCard: null,
    });
  });

  // Client hydration and topic card resolution
  useEffect(() => {
    const learner = getLearner();
    const interview = getInterview();
    const resolvedCard = topicCardId
      ? TOPIC_CARDS.find((c) => c.id === topicCardId) ?? null
      : null;

    setTopicCard(resolvedCard);

    // Re-initialize with learner context and resolved card
    const initialState = createInitialChatState({
      track: resolvedCard ? 'discovery_track' : 'idea_track',
      topicCard: resolvedCard,
      gradeLevel: interview?.gradeLevel ?? learner?.gradeLevel ?? 'm_ton',
      goal: interview?.goal ?? 'curiosity',
    });

    // Reset reducer state with hydrated initial state
    dispatch({
      type: 'COACH_RESPONSE_SUCCESS',
      response: {
        content: initialState.messages[0].content,
        tier: 1,
        aspect: 'problem',
      },
    });

    setIsClientReady(true);
  }, [topicCardId]);

  // Handler: Student sends message in chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || state.isWaitingForResponse) return;

    setInputMessage('');

    // 1. Dispatch student message
    dispatch({ type: 'STUDENT_SEND_MESSAGE', content: trimmed });

    // 2. Request Coach turn from /api/ai/coach
    const learner = getLearner();
    const anonymousId = learner?.id ?? 'guest-learner';

    const apiResult = await fetchCoachTurn({
      anonymousId,
      requestedTier: state.currentTier,
      learnerResponse: trimmed,
      ideaContext: {
        title: state.topicCard?.title ?? 'โครงงานของผู้เรียน',
        description: state.topicCard?.phenomenon,
        subfieldId: state.topicCard?.subfieldId,
        gradeLevel: state.gradeLevel,
      },
    });

    if (apiResult.success && apiResult.data) {
      dispatch({
        type: 'COACH_RESPONSE_SUCCESS',
        response: {
          content: apiResult.data.content,
          tier: apiResult.data.tier,
          aspect: apiResult.data.aspect,
          lenses: apiResult.data.lenses,
          examples: apiResult.data.examples,
        },
      });
    } else {
      // Offline fallback handling
      dispatch({
        type: 'COACH_RESPONSE_FAILURE',
        error: apiResult.error ?? 'ไม่สามารถเชื่อมต่อ AI ได้ สลับเป็นระบบชวนคิดอัตโนมัติ',
      });
    }
  };

  // Handler: Change tier
  const handleSelectTier = async (tier: CoachingTier) => {
    dispatch({ type: 'REQUEST_TIER', tier });

    // If student changes tier, trigger a coach hint immediately for the new tier
    if (state.messages.length > 0 && !state.isWaitingForResponse) {
      const learner = getLearner();
      const lastStudentMsg = [...state.messages]
        .reverse()
        .find((m) => m.role === 'student');

      const apiResult = await fetchCoachTurn({
        anonymousId: learner?.id ?? 'guest-learner',
        requestedTier: tier,
        learnerResponse: lastStudentMsg?.content ?? '',
        ideaContext: {
          title: state.topicCard?.title,
          description: state.topicCard?.phenomenon,
          subfieldId: state.topicCard?.subfieldId,
          gradeLevel: state.gradeLevel,
        },
      });

      if (apiResult.success && apiResult.data) {
        dispatch({
          type: 'COACH_RESPONSE_SUCCESS',
          response: {
            content: apiResult.data.content,
            tier: apiResult.data.tier,
            aspect: apiResult.data.aspect,
            lenses: apiResult.data.lenses,
            examples: apiResult.data.examples,
          },
        });
      } else {
        dispatch({
          type: 'COACH_RESPONSE_FAILURE',
          error: 'สลับคำแนะนำตามระดับที่เลือก (โหมดออฟไลน์)',
        });
      }
    }
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

  if (!isClientReady) {
    return (
      <div className="p-8 text-center text-slate-500 font-prompt text-sm">
        กำลังโหลดข้อมูลครูที่ปรึกษา AI...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
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
            <span>โหมดอัตโนมัติ (Deterministic Offline Guidance): คุณยังสามารถพัฒนาโครงงานและบันทึกไอเดียได้ตามปกติ</span>
          </div>
        )}
      </div>

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

          {/* Tier 3 Rewrite Gate (if triggered) */}
          {state.phase === 'rewrite' && state.pendingTier3Example && (
            <RewriteGate
              exampleText={state.pendingTier3Example}
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
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs sm:text-sm font-prompt text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                />
                <button
                  type="submit"
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
                    onClick={() =>
                      dispatch({
                        type: 'COACH_RESPONSE_SUCCESS',
                        response: {
                          content: 'ยอดเยี่ยมครับ! เรามาสรุปตัวแปรกันต่อได้เลยครับ',
                          tier: 1,
                          aspect: 'completed',
                        },
                      })
                    }
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 font-prompt py-1 px-2 flex items-center gap-1 min-h-[36px]"
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
        <IdeaChatView />
      </Suspense>
    </AppShell>
  );
}
