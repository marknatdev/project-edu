'use client';

import React, { useEffect, useState, useMemo, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Filter, Layers, BarChart3 } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import {
  getInterview,
  addSwipeAction,
  undoLastSwipeAction,
  saveIdea,
  getLearner,
} from '@/lib/storage/store';
import { TOPIC_CARDS } from '@/data/topic-cards';
import { SUBFIELDS } from '@/data/subfields';
import { buildDiscoveryDeck } from '@/lib/discovery/deck';
import {
  initSwipeSession,
  swipeCard,
  undoSwipe,
  reportCardInSession,
  shouldGoToShortlist,
  type SwipeSessionState,
} from '@/lib/discovery/session';
import { fetchAiGeneratedCards } from '@/lib/discovery/ai-cards';
import { SubjectSubfieldPicker } from '@/components/discovery/SubjectSubfieldPicker';
import { SwipeDeck } from '@/components/discovery/SwipeDeck';
import { ShortlistMatrix } from '@/components/discovery/ShortlistMatrix';
import type { Interview, TopicCard, Constraints, GradeLevel, Idea } from '@/types/domain';

type ActiveView = 'picker' | 'swipe' | 'shortlist';

const DEFAULT_CONSTRAINTS: Constraints = {
  timeWeeks: 8,
  budgetBaht: 2500,
  equipment: ['คอมพิวเตอร์', 'สมาร์ทโฟน'],
  teamSize: 2,
  skills: ['วิทยาศาสตร์พื้นฐาน', 'คอมพิวเตอร์พื้นฐาน'],
};

function DiscoveryContent() {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('picker');

  // Filter state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('science');
  const [selectedSubfieldIds, setSelectedSubfieldIds] = useState<string[] | 'unknown'>('unknown');

  // Swipe session state
  const [session, setSession] = useState<SwipeSessionState>(() => initSwipeSession([]));
  const [hasInitializedDeck, setHasInitializedDeck] = useState(false);

  // AI Generation state
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiRemainingQuota, setAiRemainingQuota] = useState<number | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 3000);
  }, []);

  // Load interview on mount
  useEffect(() => {
    const storedInterview = getInterview();
    if (storedInterview) {
      setInterview(storedInterview);
    }
  }, []);

  const gradeLevel: GradeLevel = interview?.gradeLevel ?? 'm_ton';
  const constraints: Constraints = interview?.constraints ?? DEFAULT_CONSTRAINTS;

  // Catalog filtering for preview & deck construction
  const matchingCards = useMemo(() => {
    return buildDiscoveryDeck(
      {
        subjectId: selectedSubjectId,
        subfieldIds: selectedSubfieldIds,
        gradeLevel,
        constraints,
        reportedCardIds: session.reportedCardIds,
      },
      TOPIC_CARDS
    );
  }, [selectedSubjectId, selectedSubfieldIds, gradeLevel, constraints, session.reportedCardIds]);

  // Handle deck initialization when user starts or switches filters
  const handleProceedToDeck = () => {
    setSession(
      initSwipeSession(
        matchingCards,
        session.shortlist,
        session.superLikedCardIds,
        session.reportedCardIds
      )
    );
    setHasInitializedDeck(true);
    setActiveView('swipe');
  };

  // Swipe action handler
  const handleSwipe = (direction: 'skip' | 'interested' | 'do_it_now') => {
    if (session.deck.length === 0) return;
    const activeCard = session.deck[0];
    const timestamp = new Date().toISOString();

    // 1. Reducer step
    const nextState = swipeCard(session, direction, timestamp);
    setSession(nextState);

    // 2. Storage sync
    addSwipeAction({
      cardId: activeCard.id,
      direction,
      timestamp,
    });

    // 3. Auto-transition to shortlist upon 5 likes
    if (shouldGoToShortlist(nextState) && session.shortlist.length < 5) {
      showToast('🎉 สะสมครบ 5 ใบแล้ว! กำลังเปิดตารางเปรียบเทียบ Shortlist');
      setTimeout(() => {
        setActiveView('shortlist');
      }, 700);
    }
  };

  // Undo swipe handler
  const handleUndo = () => {
    if (session.swipedHistory.length === 0) return;

    // 1. Reducer step
    const nextState = undoSwipe(session);
    setSession(nextState);

    // 2. Storage sync
    undoLastSwipeAction();
  };

  // Report card handler
  const handleReportCard = (cardId: string) => {
    const nextState = reportCardInSession(session, cardId);
    setSession(nextState);
  };

  // Generate AI cards
  const handleGenerateAiCard = async () => {
    setIsAiGenerating(true);
    const learner = getLearner();
    const anonymousId = learner?.id ?? 'guest-learner';

    // Pick target subfield
    let targetSubfieldId = 'comp_ai_ml';
    if (Array.isArray(selectedSubfieldIds) && selectedSubfieldIds.length > 0) {
      targetSubfieldId = selectedSubfieldIds[0];
    } else {
      const firstInSubject = SUBFIELDS.find((s) => s.subjectId === selectedSubjectId);
      if (firstInSubject) targetSubfieldId = firstInSubject.id;
    }

    const result = await fetchAiGeneratedCards({
      anonymousId,
      subfieldId: targetSubfieldId,
      gradeLevel,
      count: 2,
    });

    setIsAiGenerating(false);

    if (result.remaining !== undefined) {
      setAiRemainingQuota(result.remaining);
    }

    if (result.success && result.cards.length > 0) {
      // Prepend generated cards to active deck
      setSession((prev) => ({
        ...prev,
        deck: [...result.cards, ...prev.deck],
      }));
      showToast(`✨ สร้างการ์ดใหม่ ${result.cards.length} ใบ (ผ่านการตรวจสอบความปลอดภัย)`);
    } else {
      showToast(result.messageTh ?? 'ไม่สามารถสร้างการ์ดได้ในขณะนี้');
    }
  };

  // Final topic selection handler: saves Idea and routes forward
  const handleSelectFinalTopic = (card: TopicCard) => {
    const learner = getLearner();
    const idea: Idea = {
      id: `idea-${Date.now()}`,
      learnerId: learner?.id ?? 'guest-learner',
      title: card.title,
      description: `${card.phenomenon}\n\nจุดประกายความคิด: ${card.curiosityHook}`,
      source: 'discovery_track',
      sourceTopicCardId: card.id,
      gradeLevel,
      goal: interview?.goal ?? 'curiosity',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveIdea(idea);
    showToast(`เลือก "${card.title.slice(0, 20)}..." สำเร็จ! บันทึกเป็นไอเดียแล้ว`);

    // Redirect to idea track / coaching
    setTimeout(() => {
      router.push('/idea');
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Track Title & Top Nav Switcher */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 font-prompt">
              Discovery Track
            </h1>
            <p className="text-[11px] text-slate-500">
              ค้นหาหัวข้อโครงงานผ่านการ์ดหัวข้อ 90 ใบ พร้อมคำนวณ Fit Score
            </p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold font-prompt">
          <button
            type="button"
            onClick={() => setActiveView('picker')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              activeView === 'picker'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เลือกสาขา</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!hasInitializedDeck) {
                handleProceedToDeck();
              } else {
                setActiveView('swipe');
              }
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              activeView === 'swipe'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ปัดการ์ด</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('shortlist')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeView === 'shortlist'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Shortlist</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[10px]">
              {session.shortlist.length}/5
            </span>
          </button>
        </div>
      </div>

      {/* Main View Render */}
      {activeView === 'picker' && (
        <SubjectSubfieldPicker
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
          selectedSubfieldIds={selectedSubfieldIds}
          onSelectSubfields={setSelectedSubfieldIds}
          onProceedToDeck={handleProceedToDeck}
          matchingCardCount={matchingCards.length}
        />
      )}

      {activeView === 'swipe' && (
        <SwipeDeck
          deck={session.deck}
          shortlistCount={session.shortlist.length}
          canUndo={session.swipedHistory.length > 0}
          onSwipe={handleSwipe}
          onUndo={handleUndo}
          onReportCard={handleReportCard}
          onGenerateAiCard={handleGenerateAiCard}
          isAiGenerating={isAiGenerating}
          aiRemainingQuota={aiRemainingQuota}
          onGoToShortlist={() => setActiveView('shortlist')}
          onBackToFilter={() => setActiveView('picker')}
        />
      )}

      {activeView === 'shortlist' && (
        <ShortlistMatrix
          cards={session.shortlist}
          superLikedCardIds={session.superLikedCardIds}
          constraints={constraints}
          gradeLevel={gradeLevel}
          onSelectFinalTopic={handleSelectFinalTopic}
          onBackToDeck={() => setActiveView('swipe')}
        />
      )}

      {/* Persistent Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/90 text-white text-xs font-semibold shadow-xl backdrop-blur-md pointer-events-none transition-all"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function DiscoveryPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500 font-prompt text-sm">
            กำลังโหลดข้อมูลสำรวจหัวข้อ...
          </div>
        }
      >
        <DiscoveryContent />
      </Suspense>
    </AppShell>
  );
}
