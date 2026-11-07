'use client';

import React, { Suspense, useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Layers,
  ArrowLeft,
  RefreshCw,
  Lightbulb,
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
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4 font-prompt">
        <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          ยังไม่พบข้อมูลโครงงานสำหรับประเมิน
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          กรุณาเริ่มต้นจากการเลือกหัวข้อในหน้าค้นหา หรือเล่าไอเดียโครงงานของคุณกับครูที่ปรึกษา AI เพื่อเริ่มการประเมิน 5 ด้าน
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/discovery"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>ไปค้นหาไอเดีย (Discovery Track)</span>
          </Link>
          <Link
            href="/interview"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>เริ่มสัมภาษณ์เป้าหมาย</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoading && !viewModel && errorMessage && idea) {
    return <section role="alert" className="max-w-xl mx-auto p-6 space-y-4 font-prompt">
      <h2 className="font-bold text-slate-900">ยังประเมินโครงงานไม่ได้</h2>
      <p className="text-sm text-amber-900">{errorMessage}</p>
      <p className="text-sm text-slate-600">ไอเดียและงานในเครื่องยังอยู่ คุณแก้ไขต่อหรือเขียนข้อเสนอด้วยตนเองได้</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={quota.remaining <= 0} onClick={() => void performEvaluation(idea)} className="min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">ลองประเมินใหม่</button>
        <Link className="inline-flex min-h-[44px] items-center px-3 text-sm underline" href={`/idea?ideaId=${idea.id}`}>กลับไปแก้ไอเดีย</Link>
        <Link className="inline-flex min-h-[44px] items-center px-3 text-sm underline" href={`/proposal?ideaId=${idea.id}`}>เขียนข้อเสนอโครงงาน</Link>
      </div>
    </section>;
  }

  // 2. Loading State
  if (isLoading || !viewModel || !idea) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4 font-prompt">
        <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          กำลังประเมินโครงงาน 5 ด้าน...
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          ระบบกำลังวิเคราะห์ความแปลกใหม่ ความเป็นไปได้ ผลกระทบ ความรัดกุม และความเหมาะสมตามเกณฑ์ของระดับชั้น พร้อมสืบค้นผลงานอ้างอิง
        </p>
      </div>
    );
  }

  const preset = getRubricPreset(idea.goal, idea.gradeLevel);
  const overallBadgeClass =
    viewModel.overall.badge === 'green'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : viewModel.overall.badge === 'yellow'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-6 pb-28 font-prompt">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-2 text-xs font-prompt">
        <Link
          href={`/idea?ideaId=${idea.id}`}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-slate-500 hover:text-indigo-600 py-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับสู่รายละเอียดไอเดีย</span>
        </Link>
        <span className="text-slate-400">
          ประเมินเมื่อ: {new Date(viewModel.evaluatedAt).toLocaleDateString('th-TH')}
        </span>
      </div>

      {/* Error Alert Banner (if any) */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-prompt flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold font-prompt">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>ผลการประเมินไอเดีย 5 ด้าน (5-Axis Evaluation Dashboard)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-prompt">
              {idea.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
              {idea.description}
            </p>
          </div>

          {/* Re-evaluate Button within Daily Quota */}
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReevaluate}
              disabled={isReevaluating || !viewModel.canReevaluate}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold font-prompt flex items-center gap-2 transition-all shadow-xs ${
                viewModel.canReevaluate
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-indigo-300 active:bg-slate-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title={viewModel.quotaMessageTh}
            >
              <RotateCcw
                className={`w-4 h-4 ${isReevaluating ? 'animate-spin text-indigo-600' : 'text-slate-500'}`}
              />
              <span>
                {isReevaluating ? 'กำลังประเมินใหม่...' : 'ประเมินใหม่'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono border border-slate-200">
                เหลือ {quota.remaining}/5
              </span>
            </button>
            {viewModel.quotaMessageTh && (
              <span className="text-[11px] text-amber-700">
                {viewModel.quotaMessageTh}
              </span>
            )}
          </div>
        </div>

        {/* Overall Score Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500">
              เกณฑ์จำลองอ้างอิง:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">
                {preset.nameTh}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-mono">
                {preset.isHeuristic ? 'Heuristic Model' : 'Official'}
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-lg">
              {preset.descriptionTh}
            </p>
          </div>

          {/* Overall score badge with text label (not color alone - AC-7) */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-200">
            <span className="text-xs font-bold text-slate-500 sm:text-right">
              คะแนนภาพรวม (Overall Score):
            </span>
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm sm:text-base font-black ${overallBadgeClass}`}
              aria-label={viewModel.overall.ariaLabel}
            >
              <span>{viewModel.overall.emoji}</span>
              <span>{viewModel.overall.score}.0 / 10</span>
              <span className="text-xs font-bold opacity-90">
                • {viewModel.overall.labelTh}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Screener Flags (Non-blocking) */}
      <Link href={`/variables?ideaId=${encodeURIComponent(idea.id)}`} className="flex min-h-[44px] items-center rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-bold text-indigo-800">
        ตารางแยกตัวแปร & ชุดควบคุม →
      </Link>
      <p className="text-xs text-slate-600">คะแนนด้านสมมติฐาน/วิธีวัดผลใช้ตารางที่บันทึก ณ เวลาประเมิน หากแก้ตารางแล้ว ให้กดประเมินใหม่เพื่ออัปเดตคะแนน (ตามโควตา)</p>
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

      {/* 5-Axis Score Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 font-prompt">
            คะแนนประเมิน 5 มิติ (5 Evaluation Axes)
          </h2>
          <span className="text-xs text-slate-400">
            สเกล 1–10 (🟢 7–10 | 🟡 4–6 | 🔴 1–3)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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

      {/* Verified Prior Work Section */}
      <PriorWorkList priorWork={viewModel.priorWork} />

      {/* Fixed Bottom Action Floating Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="hidden sm:block text-xs font-prompt text-slate-500">
            {viewModel.hasRedAxes ? (
              <span className="text-rose-700 font-bold flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-rose-600" />
                <span>มี {viewModel.redAxes.length} ด้านที่สามารถพัฒนาต่อได้ใน Pivot Workshop</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">
                ✓ ผลการประเมินผ่านเกณฑ์พร้อมสำหรับการเขียนข้อเสนอโครงงาน
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {viewModel.hasRedAxes && (
              <button
                type="button"
                onClick={() => handleOpenPivot(viewModel.redAxes[0])}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold font-prompt transition-all flex items-center justify-center gap-1.5"
              >
                <span>ปรับมุมมองใหม่ (Pivot)</span>
              </button>
            )}

            {/* Non-blocking: always can proceed to proposal */}
            <Link
              href={`/proposal?ideaId=${idea.id}`}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold font-prompt text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100"
            >
              <span>ไปเขียนข้อเสนอโครงงานต่อ (Proposal)</span>
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
          <div className="max-w-2xl mx-auto py-16 px-4 text-center font-prompt">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-xs text-slate-500">กำลังเตรียมหน้าประเมิน...</p>
          </div>
        }
      >
        <EvaluationContent />
      </Suspense>
    </AppShell>
  );
}
