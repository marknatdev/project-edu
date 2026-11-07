'use client';

import React, { Suspense, useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  RotateCcw,
  BookOpen,
  Layers,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { appFetch, getWorkspaceScope } from '@/lib/auth/workspace-client';
import { AxisCard } from '@/components/evaluation/AxisCard';
import { SafetyChecklist } from '@/components/safety/SafetyChecklist';
import { screenIdea } from '@/lib/safety/screener';
import { SafetyFlagPanel } from '@/components/evaluation/SafetyFlagPanel';
import { PriorWorkList } from '@/components/evaluation/PriorWorkList';
import { PivotWorkshop } from '@/components/evaluation/PivotWorkshop';
import {
  buildEvaluationView,
  type EvaluationViewModel,
} from '@/lib/evaluation/view-model';
import {
  fetchEvaluation,
  type QuotaInfo,
} from '@/lib/evaluation/eval-client';
import {
  getIdeas,
  getIdea,
  saveIdea,
  getEvaluations,
  saveEvaluation,
  getInterview,
  getDefaultStorage,
  getWipeGeneration,
  WIPE_GENERATION_KEY,
} from '@/lib/storage/store';
import {
  COACH_INVALIDATION_EVENT,
  COACH_INVALIDATION_KEY,
  type CoachingInvalidation,
} from '@/lib/advisor/coaching-invalidation';
import { getRubricPreset } from '@/lib/rubrics/presets';
import type { Evaluation, EvaluationAxis, Idea } from '@/types/domain';

function EvaluationContent() {
  const searchParams = useSearchParams();
  const ideaIdParam = searchParams.get('ideaId');

  const [idea, setIdea] = useState<Idea | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [viewModel, setViewModel] = useState<EvaluationViewModel | null>(null);
  const [quota, setQuota] = useState<QuotaInfo>({
    used: 0,
    limit: 5,
    remaining: 5,
    resetAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedRedAxis, setHighlightedRedAxis] = useState<EvaluationAxis | null>(null);
  const quotaRemaining = useRef(5);
  const requestEpoch = useRef(0);

  const performEvaluation = useCallback(
    async (targetIdea: Idea) => {
      setIsLoading(true);
      setErrorMessage(null);

      const epoch = ++requestEpoch.current;
      const scope = getWorkspaceScope();
      const storage = getDefaultStorage();
      const startGen = getWipeGeneration(storage);
      const currentIdeas = getIdeas(storage);
      if (!currentIdeas.some((i) => i.id === targetIdea.id)) {
        setIsLoading(false);
        return;
      }

      const interview = getInterview(storage);
      const constraints = interview?.constraints;

      const res = await fetchEvaluation({
        idea: targetIdea,
        constraints,
      });

      if (requestEpoch.current !== epoch || getWorkspaceScope() !== scope || getWipeGeneration(storage) !== startGen) {
        return;
      }
      setIsLoading(false);
      setIsReevaluating(false);
      const liveIdeas = getIdeas(storage);
      if (!liveIdeas.some((i) => i.id === targetIdea.id)) {
        return;
      }

      if (res.quota) {
        quotaRemaining.current = res.quota.remaining;
        setQuota(res.quota);
      }

      if (res.evaluation) {
        if (!saveEvaluation(res.evaluation, storage, startGen)) return;
        setEvaluation(res.evaluation);
        const remaining = res.quota?.remaining ?? quotaRemaining.current;
        const vm = buildEvaluationView(res.evaluation, { quotaRemaining: remaining });
        setViewModel(vm);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    },
    []
  );

  useEffect(() => {
    const invalidateRequests = () => { requestEpoch.current++; };
    const handleWipe = () => {
      invalidateRequests();
      setIdea(null);
      setEvaluation(null);
      setViewModel(null);
      setIsLoading(false);
      setIsReevaluating(false);
      setErrorMessage(null);
      setHighlightedRedAxis(null);
    };
    const custom = (event: Event) => {
      const detail = (event as CustomEvent<CoachingInvalidation>)?.detail;
      if (detail?.action === 'wipe') handleWipe();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === COACH_INVALIDATION_KEY && event.newValue) {
        try {
          const detail = JSON.parse(event.newValue);
          if (detail?.action === 'wipe') handleWipe();
        } catch { /* ignored */ }
      }
      if (event.key === WIPE_GENERATION_KEY || event.key === null) {
        handleWipe();
      }
    };
    window.addEventListener(COACH_INVALIDATION_EVENT, custom);
    window.addEventListener('storage', storage);
    return () => {
      invalidateRequests();
      window.removeEventListener(COACH_INVALIDATION_EVENT, custom);
      window.removeEventListener('storage', storage);
    };
  }, []);

  // Load Idea and existing Evaluation on mount
  useEffect(() => {
    const allIdeas = getIdeas();
    let currentIdea: Idea | null = null;

    if (ideaIdParam) {
      currentIdea = allIdeas.find((i) => i.id === ideaIdParam) ?? null;
    }
    if (!currentIdea && allIdeas.length > 0) {
      currentIdea = allIdeas[allIdeas.length - 1];
    }

    setIdea(currentIdea);

    if (!currentIdea) {
      setIsLoading(false);
      return;
    }

    // Check store for existing evaluation of this idea
    const allEvals = getEvaluations();
    const existing = allEvals.filter((e) => e.ideaId === currentIdea!.id)
      .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))[0];

    if (existing) {
      setEvaluation(existing);
      const vm = buildEvaluationView(existing, { quotaRemaining: quotaRemaining.current });
      setViewModel(vm);
      setIsLoading(false);
    } else {
      // First-time evaluation for this idea
      performEvaluation(currentIdea);
    }
  }, [ideaIdParam, performEvaluation]);

  // Query quota from GET /api/ai/evaluate
  useEffect(() => {
    // First POST issues the Guest cookie; don't race it with a second owner.
    if (!evaluation) return;
    let live = true;
    const epoch = requestEpoch.current;
    const storage = getDefaultStorage();
    const generation = getWipeGeneration(storage);
    const scope = getWorkspaceScope();
    appFetch('/api/ai/evaluate', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!live || epoch !== requestEpoch.current || generation !== getWipeGeneration(storage) || scope !== getWorkspaceScope()) return;
        if (data?.quota) {
          quotaRemaining.current = data.quota.remaining;
          setQuota(data.quota);
          if (evaluation) {
            setViewModel(buildEvaluationView(evaluation, { quotaRemaining: data.quota.remaining }));
          }
        }
      })
      .catch(() => {
        // Ignore network error for quota GET
      });
    return () => { live = false; };
  }, [evaluation]);

  const handleReevaluate = () => {
    if (!idea || quota.remaining <= 0 || isReevaluating) return;
    setIsReevaluating(true);
    performEvaluation(idea);
  };

  const handleOpenPivot = (axisKey: EvaluationAxis) => {
    setHighlightedRedAxis(axisKey);
    const elem = document.getElementById('pivot-workshop');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. Empty State: No Idea found
  if (!isLoading && !idea) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-accent-tint border border-accent/30 text-accent-text flex items-center justify-center mx-auto shadow-e1">
          <BookOpen className="w-7 h-7" />
        </div>
        <h1 className="text-title">
          ยังไม่พบข้อมูลโครงงานสำหรับประเมิน
        </h1>
        <p className="text-callout text-ink-2 leading-relaxed max-w-md mx-auto">
          กรุณาเริ่มต้นจากการเลือกหัวข้อในหน้าค้นหา หรือเล่าไอเดียโครงงานของคุณกับครูที่ปรึกษา AI เพื่อเริ่มการประเมิน 5 ด้าน
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/discovery"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent-press text-white font-bold text-callout flex items-center justify-center gap-2 transition-all shadow-e1"
          >
            <Layers className="w-4 h-4" />
            <span>ไปหาหัวข้อ</span>
          </Link>
          <Link
            href="/interview"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-surface-2 hover:bg-separator text-ink-2 font-bold text-callout flex items-center justify-center gap-2 transition-all"
          >
            <span>เริ่มสัมภาษณ์เป้าหมาย</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoading && !viewModel && errorMessage && idea) {
    return <section role="alert" className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-title">ยังประเมินโครงงานไม่ได้</h1>
      <p className="text-callout text-caution">{errorMessage}</p>
      <p className="text-callout text-ink-2">ไอเดียและงานในเครื่องยังอยู่ คุณแก้ไขต่อหรือเขียนข้อเสนอด้วยตนเองได้</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={quota.remaining <= 0} onClick={() => void performEvaluation(idea)} className="min-h-[44px] rounded-xl bg-accent px-4 py-2 text-callout text-white disabled:opacity-50">ลองประเมินใหม่</button>
        <Link className="inline-flex min-h-[44px] items-center px-3 text-callout underline" href={`/idea?ideaId=${idea.id}`}>กลับไปแก้ไอเดีย</Link>
        <Link className="inline-flex min-h-[44px] items-center px-3 text-callout underline" href={`/proposal?ideaId=${idea.id}`}>เขียนข้อเสนอโครงงาน</Link>
      </div>
    </section>;
  }

  // 2. Loading State
  if (isLoading || !viewModel || !idea) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-accent-tint border border-accent/30 text-accent-text flex items-center justify-center mx-auto animate-pulse">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="text-headline font-bold text-ink">
          กำลังประเมินโครงงาน 5 ด้าน...
        </h3>
        <p className="text-caption sm:text-callout text-ink-3 max-w-sm mx-auto leading-relaxed">
          ระบบกำลังวิเคราะห์ความแปลกใหม่ ความเป็นไปได้ ผลกระทบ ความรัดกุม และความเหมาะสมตามเกณฑ์ของระดับชั้น พร้อมสืบค้นผลงานอ้างอิง
        </p>
      </div>
    );
  }

  const preset = getRubricPreset(idea.goal, idea.gradeLevel);
  const overallBadgeClass =
    viewModel.overall.badge === 'green'
      ? 'bg-good-tint text-good border-good/30'
      : viewModel.overall.badge === 'yellow'
        ? 'bg-caution-tint text-caution border-caution/30'
        : 'bg-risk-tint text-risk border-risk/40';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-28">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-large-title">ประเมินไอเดีย</h1>
          <p className="text-callout text-ink-2">{preset.nameTh} · คะแนน 1–10 ต่อด้าน · ประเมินเมื่อ {new Date(viewModel.evaluatedAt).toLocaleDateString('th-TH')}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-e1">
          <p className="font-medium [overflow-wrap:anywhere]">{idea.title}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-callout font-medium ${overallBadgeClass}`} aria-label={viewModel.overall.ariaLabel}>
              ภาพรวม {viewModel.overall.score}/10 · {viewModel.overall.labelTh}
            </span>
            <button type="button" onClick={handleReevaluate} disabled={isReevaluating || !viewModel.canReevaluate} title={viewModel.quotaMessageTh}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium text-accent-text hover:bg-surface-2 disabled:opacity-40">
              <RotateCcw className={`h-4 w-4 ${isReevaluating ? 'animate-spin' : ''}`} aria-hidden />
              {isReevaluating ? 'กำลังประเมินใหม่…' : `ประเมินใหม่ (เหลือ ${quota.remaining}/5)`}
            </button>
          </div>
          {viewModel.quotaMessageTh && <p className="text-caption text-caution">{viewModel.quotaMessageTh}</p>}
        </div>
      </header>

      {errorMessage && <p role="alert" className="flex items-start gap-2 rounded-xl bg-caution-tint px-4 py-3 text-callout text-caution"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{errorMessage}</p>}

      {/* 5-Axis Score Cards */}
      <div className="space-y-3">
        <div className="flex flex-col">
          <h2 className="text-headline">คะแนน 5 ด้าน</h2>
          <span className="text-caption text-ink-2">
            สเกล 1–10 · 7–10 ดี · 4–6 ควรปรับ · 1–3 ต้องแก้
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {viewModel.axesList.map((axis) => (
            <AxisCard
              key={axis.key}
              axis={axis}
              onOpenPivot={handleOpenPivot}
              isRedHighlighted={highlightedRedAxis === axis.key}
            />
          ))}
        </div>
      </div>

      {/* Socratic Pivot Workshop for Red Axes (AC-8) */}
      {viewModel.hasRedAxes && (
        <PivotWorkshop
          key={JSON.stringify([idea.id, idea.title, idea.description])}
          idea={idea}
          redAxes={viewModel.redAxes}
          constraints={getInterview()?.constraints}
          onIdeaUpdated={(updated) => {
            setIdea(updated);
          }}
        />
      )}

      {/* Safety advice never blocks progress */}
      <SafetyFlagPanel safetyFlags={[...viewModel.safetyFlags, ...screenIdea(idea)].filter((flag, index, flags) => flags.findIndex((entry) => entry.category === flag.category) === index)} />
      <SafetyChecklist flags={[...viewModel.safetyFlags, ...screenIdea(idea)]} completed={idea.safetyChecklist ?? []} onChange={(safetyChecklist) => {
        try {
          const latest = getIdea(idea.id);
          if (!latest) throw new Error('Idea missing');
          const updated = { ...latest, safetyChecklist };
          saveIdea(updated);
          setIdea(updated);
        } catch {
          setErrorMessage('บันทึกเช็กลิสต์ไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บและลองอีกครั้ง');
        }
      }} />

      <Link href={`/variables?ideaId=${encodeURIComponent(idea.id)}`} className="flex min-h-11 items-center justify-between rounded-xl bg-surface px-4 py-3 font-medium text-accent-text shadow-e1">ตารางตัวแปรและชุดควบคุม<ArrowRight className="h-4 w-4" aria-hidden /></Link>
      <p className="-mt-3 text-caption text-ink-2">คะแนนสมมติฐานและวิธีวัดผลใช้ตารางที่บันทึกตอนประเมิน แก้ตารางแล้วกดประเมินใหม่เพื่ออัปเดต</p>

      {/* Prior work */}
      <PriorWorkList priorWork={viewModel.priorWork} />

      {/* Fixed Bottom Action Floating Bar */}
      <div className="fixed bottom-[92px] md:bottom-0 left-0 right-0 md:left-[248px] p-3 sm:p-4 bg-surface/95 backdrop-blur-xl border-t border-separator z-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 sm:flex-row">
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            {viewModel.hasRedAxes && (
              <button
                type="button"
                onClick={() => handleOpenPivot(viewModel.redAxes[0])}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl bg-risk-tint hover:bg-risk-tint text-risk border border-risk/40 text-caption font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>ปรับมุมมองใหม่</span>
              </button>
            )}

            {/* Non-blocking: always can proceed to proposal */}
            <Link
              href={`/proposal?ideaId=${idea.id}`}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl bg-accent hover:bg-accent-press active:bg-accent-press text-white font-bold text-caption sm:text-callout flex items-center justify-center gap-2 transition-all shadow-e2"
            >
              <span>ไปเขียนข้อเสนอโครงงานต่อ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto py-16 px-4 text-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-caption text-ink-3">กำลังเตรียมหน้าประเมิน...</p>
          </div>
        }
      >
        <EvaluationContent />
      </Suspense>
    </AppShell>
  );
}
