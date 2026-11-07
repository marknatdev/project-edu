'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Compass,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Users,
  Wrench,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import type { GradeLevel, Goal, Track } from '@/types/domain';
import {
  determineTrackRoute,
  validateInterviewStep,
  createInterviewFromDraft,
  GOAL_OPTIONS,
  EQUIPMENT_OPTIONS,
  SKILL_OPTIONS,
  type InterviewDraft,
} from '@/lib/interview/routing';
import {
  getConsent,
  saveConsent,
  getLearner,
  saveLearner,
  getInterview,
  saveInterview,
  getDefaultStorage,
  getWipeGeneration,
} from '@/lib/storage/store';
import { useWipeInvalidation } from '@/lib/storage/use-wipe-invalidation';

export function InterviewWizard() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [consentAccepted, setConsentAccepted] = useState<boolean>(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form draft state
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | undefined>(undefined);
  const [goal, setGoal] = useState<Goal | undefined>(undefined);
  const [timeWeeks, setTimeWeeks] = useState<number>(8);
  const [budgetBaht, setBudgetBaht] = useState<number>(1000);
  const [equipment, setEquipment] = useState<string[]>(['computer']);
  const [teamSize, setTeamSize] = useState<number>(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [hasInitialIdea, setHasInitialIdea] = useState<boolean | undefined>(undefined);
  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>(undefined);
  const [wiped, markWiped] = useWipeInvalidation();
  // Generation of the answers pre-filled below; a later wipe makes Submit stale.
  const loaded = useRef<{ storage: ReturnType<typeof getDefaultStorage>; generation: string } | null>(null);

  useEffect(() => {
    const storage = getDefaultStorage();
    loaded.current = { storage, generation: getWipeGeneration(storage) };
    const currentConsent = getConsent();
    setConsentAccepted(currentConsent.accepted);

    // Pre-fill existing interview if learner already started
    const existing = getInterview();
    if (existing) {
      setGradeLevel(existing.gradeLevel);
      setGoal(existing.goal);
      setTimeWeeks(existing.constraints.timeWeeks);
      setBudgetBaht(existing.constraints.budgetBaht);
      setEquipment(existing.constraints.equipment);
      setTeamSize(existing.constraints.teamSize);
      setSkills(existing.constraints.skills);
      setHasInitialIdea(existing.hasInitialIdea);
      setSelectedTrack(existing.selectedTrack);
    }
  }, []);

  const handleQuickAcceptConsent = () => {
    saveConsent({ accepted: true, acceptedAt: new Date().toISOString() });
    setConsentAccepted(true);
    setErrorMessages([]);
  };

  const currentDraft: InterviewDraft = {
    gradeLevel,
    goal,
    constraints: {
      timeWeeks,
      budgetBaht,
      equipment,
      teamSize,
      skills,
    },
    hasInitialIdea,
    selectedTrack,
  };

  const handleNextStep = () => {
    setErrorMessages([]);

    if (!consentAccepted) {
      setErrorMessages(['กรุณายินยอมเงื่อนไขการคุ้มครองข้อมูลเยาวชน (Zero-PII) ก่อนดำเนินการต่อ']);
      return;
    }

    const validation = validateInterviewStep(step, currentDraft);
    if (!validation.valid) {
      setErrorMessages(validation.errors);
      return;
    }

    if (step < 4) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMessages([]);
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    setErrorMessages([]);

    if (!consentAccepted) {
      setErrorMessages(['กรุณายินยอมเงื่อนไขการคุ้มครองข้อมูลเยาวชน (Zero-PII) ก่อนบันทึก']);
      return;
    }

    const validation = validateInterviewStep(4, currentDraft);
    if (!validation.valid) {
      setErrorMessages(validation.errors);
      return;
    }

    if (!gradeLevel || !goal) {
      setErrorMessages(['กรุณากรอกข้อมูลให้ครบถ้วนทุกขั้นตอน']);
      return;
    }

    setSubmitting(true);

    try {
      const { storage, generation } = loaded.current ?? { storage: getDefaultStorage(), generation: '' };
      // 1. Ensure or initialize Zero-PII Learner profile
      let learner = getLearner(storage);
      const nowIso = new Date().toISOString();
      if (!learner || learner.gradeLevel !== gradeLevel) {
        learner = {
          id: learner?.id ?? `learner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          gradeLevel,
          createdAt: learner?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        if (!saveLearner(learner, storage, generation)) { markWiped(); return; }
      }

      // 2. Create and persist Interview
      const interview = createInterviewFromDraft(currentDraft, learner.id);
      if (!saveInterview(interview, storage, generation)) { markWiped(); return; }

      // 3. Navigate to target route
      const targetRoute = determineTrackRoute(interview);
      router.push(targetRoute);
    } catch (err) {
      console.error('Failed to submit interview:', err);
      setErrorMessages(['เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง']);
      setSubmitting(false);
    }
  };

  const toggleEquipment = (id: string) => {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (wiped) return <p role="status" className="max-w-2xl mx-auto text-callout">ลบข้อมูลแล้ว กรุณาโหลดหน้าใหม่เพื่อเริ่มสัมภาษณ์ใหม่</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* PDPA Consent Alert Banner if not accepted */}
      {!consentAccepted && (
        <div className="p-4 sm:p-5 rounded-2xl bg-caution-tint border border-caution/30 text-caution shadow-e1 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-caution shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-callout">
                การคุ้มครองความเป็นส่วนตัวเยาวชน (Zero-PII)
              </h4>
              <p className="text-caption text-caution leading-relaxed">
                ระบบนี้ไม่มีการเก็บชื่อจริงหรือโรงเรียน ข้อมูลจะจัดเก็บในเบราว์เซอร์ของคุณเท่านั้น โปรดยินยอมเพื่อเริ่มการสัมภาษณ์
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickAcceptConsent}
              className="px-4 py-2 rounded-xl bg-caution text-white font-semibold text-caption hover:bg-caution transition shadow-2xs min-h-[40px]"
            >
              ยินยอมและดำเนินการต่อ
            </button>
            <Link
              href="/consent"
              className="px-3 py-2 text-caption font-medium text-caution hover:underline min-h-[40px] inline-flex items-center"
            >
              อ่านนโยบายความยินยอมฉบับเต็ม
            </Link>
          </div>
        </div>
      )}

      {/* Wizard Header & Progress Bar */}
      <div className="bg-surface backdrop-blur-md border border-accent/30 rounded-3xl p-5 sm:p-7 shadow-e1 space-y-4">
        <div className="flex items-center justify-between text-caption text-ink-3 font-medium">
          <span className="font-bold text-accent-text">
            ขั้นตอนที่ {step} จาก 4
          </span>
          <span>
            {step === 1 && 'ระดับชั้นของผู้เรียน'}
            {step === 2 && 'เป้าหมายโครงงาน'}
            {step === 3 && 'ข้อจำกัดและความพร้อม'}
            {step === 4 && 'เลือกเส้นทางเริ่มต้น'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-2 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-accent h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step 1: GradeLevel */}
        {step === 1 && (
          <div className="space-y-5 pt-2 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-ink">
                คุณกำลังศึกษาอยู่ในระดับชั้นใด?
              </h2>
              <p className="text-caption sm:text-callout text-ink-2">
                ระดับชั้นจะช่วยให้ระบบคัดสรร Topic Cards และเกณฑ์การประเมิน (Rubrics) ที่เหมาะสมกับคุณ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setGradeLevel('m_ton')}
                className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 min-h-[120px] ${
                  gradeLevel === 'm_ton'
                    ? 'border-accent bg-accent-tint shadow-e1'
                    : 'border-separator bg-surface hover:border-accent/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl"></span>
                  {gradeLevel === 'm_ton' && (
                    <CheckCircle2 className="w-5 h-5 text-accent-text" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-ink text-base">
                    มัธยมศึกษาตอนต้น (ม.ต้น)
                  </div>
                  <div className="text-caption text-ink-3">
                    ม.1 - ม.3 • เน้นการสังเกต วิทยาศาสตร์พื้นฐาน และการประดิษฐ์ต้นแบบ
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGradeLevel('m_plai')}
                className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 min-h-[120px] ${
                  gradeLevel === 'm_plai'
                    ? 'border-accent bg-accent-tint shadow-e1'
                    : 'border-separator bg-surface hover:border-accent/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl"></span>
                  {gradeLevel === 'm_plai' && (
                    <CheckCircle2 className="w-5 h-5 text-accent-text" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-ink text-base">
                    มัธยมศึกษาตอนปลาย (ม.ปลาย)
                  </div>
                  <div className="text-caption text-ink-3">
                    ม.4 - ม.6 • การวิจัยเชิงลึก โมเดล AI/IoT วิเคราะห์เชิงคณิตศาสตร์ และงานแข่งขัน
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <div className="space-y-5 pt-2 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-ink">
                เป้าหมายหลักในการทำโครงงานครั้งนี้คืออะไร?
              </h2>
              <p className="text-caption sm:text-callout text-ink-2">
                แต่ละเป้าหมายมีน้ำหนักการประเมิน 5 ด้าน (ความใหม่, ความเป็นไปได้, ผลกระทบ, ระเบียบวิธี, Fit) ที่แตกต่างกัน
              </p>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGoal(opt.value)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition flex items-start justify-between gap-3 min-h-[64px] ${
                    goal === opt.value
                      ? 'border-accent bg-accent-tint shadow-e1'
                      : 'border-separator bg-surface hover:border-accent/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-callout">
                        {opt.labelTh}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-2 text-ink-2 text-caption font-semibold">
                        {opt.badgeTh}
                      </span>
                    </div>
                    <p className="text-caption text-ink-3 leading-relaxed">
                      {opt.descriptionTh}
                    </p>
                  </div>
                  {goal === opt.value && (
                    <CheckCircle2 className="w-5 h-5 text-accent-text shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Constraints */}
        {step === 3 && (
          <div className="space-y-6 pt-2 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-ink">
                ข้อจำกัดและความพร้อมของผู้เรียน
              </h2>
              <p className="text-caption sm:text-callout text-ink-2">
                ระบบคำนวณ Fit Score (0–100) โดยนำข้อจำกัดเหล่านี้ไปเทียบกับความต้องการของแต่ละหัวข้อโครงงาน
              </p>
            </div>

            {/* Time weeks */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-caption font-bold text-ink-2">
                <Clock className="w-4 h-4 text-accent-text" />
                <span>เวลาที่มีจนถึงวันส่งงาน / วันแข่งขัน: {timeWeeks} สัปดาห์</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[2, 4, 8, 12, 16, 24].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setTimeWeeks(w)}
                    className={`px-3.5 py-2 rounded-xl text-caption font-medium border transition min-h-[40px] ${
                      timeWeeks === w
                        ? 'bg-accent text-white border-accent shadow-2xs'
                        : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                    }`}
                  >
                    {w} สัปดาห์
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Baht */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-caption font-bold text-ink-2">
                <Wallet className="w-4 h-4 text-accent-text" />
                <span>งบประมาณที่มี: {budgetBaht.toLocaleString('th-TH')} บาท</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 500, 1000, 2500, 5000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudgetBaht(b)}
                    className={`px-3.5 py-2 rounded-xl text-caption font-medium border transition min-h-[40px] ${
                      budgetBaht === b
                        ? 'bg-accent text-white border-accent shadow-2xs'
                        : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                    }`}
                  >
                    {b === 0 ? '0 บาท (ไม่มีงบ)' : `${b.toLocaleString('th-TH')} บาท`}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Size */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-caption font-bold text-ink-2">
                <Users className="w-4 h-4 text-accent-text" />
                <span>จำนวนสมาชิกในกลุ่ม: {teamSize} คน</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTeamSize(s)}
                    className={`px-3.5 py-2 rounded-xl text-caption font-medium border transition min-h-[40px] ${
                      teamSize === s
                        ? 'bg-accent text-white border-accent shadow-2xs'
                        : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                    }`}
                  >
                    {s === 1 ? '1 คน (ทำเดี่ยว)' : `${s} คน`}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment Multi-select */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-caption font-bold text-ink-2">
                <Wrench className="w-4 h-4 text-accent-text" />
                <span>อุปกรณ์ที่สามารถเข้าถึงได้ (เลือกได้หลายข้อ)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => {
                  const selected = equipment.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleEquipment(item.id)}
                      className={`px-3 py-2 rounded-xl text-caption font-medium border transition min-h-[40px] flex items-center gap-1.5 ${
                        selected
                          ? 'bg-accent-tint border-accent text-accent-text'
                          : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                      }`}
                    >
                      <span>{selected ? '✓' : '+'}</span>
                      <span>{item.labelTh}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skills Multi-select */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-caption font-bold text-ink-2">
                <BookOpen className="w-4 h-4 text-accent-text" />
                <span>ทักษะและความถนัดของทีม (เลือกได้หลายข้อ)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((item) => {
                  const selected = skills.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSkill(item.id)}
                      className={`px-3 py-2 rounded-xl text-caption font-medium border transition min-h-[40px] flex items-center gap-1.5 ${
                        selected
                          ? 'bg-accent-tint border-accent/30 text-accent-text'
                          : 'bg-surface text-ink-2 border-separator hover:bg-surface-2'
                      }`}
                    >
                      <span>{selected ? '✓' : '+'}</span>
                      <span>{item.labelTh}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Track Choice */}
        {step === 4 && (
          <div className="space-y-5 pt-2 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-semibold text-ink">
                คุณมีไอเดียโครงงานในใจแล้วหรือยัง?
              </h2>
              <p className="text-caption sm:text-callout text-ink-2">
                เลือกเส้นทางที่ตรงกับสถานะปัจจุบันของคุณเพื่อเริ่มต้นกระบวนการได้อย่างตรงจุด
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2">
              {/* Option A: Idea Track */}
              <button
                type="button"
                onClick={() => {
                  setHasInitialIdea(true);
                  setSelectedTrack('idea_track');
                }}
                className={`p-5 rounded-2xl border-2 text-left transition flex items-start gap-4 min-h-[96px] ${
                  hasInitialIdea === true && selectedTrack === 'idea_track'
                    ? 'border-accent bg-accent-tint shadow-e1'
                    : 'border-separator bg-surface hover:border-accent/30'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-accent-tint text-accent-text flex items-center justify-center shrink-0">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-base">
                      มีไอเดียหรือหัวข้อในใจแล้ว (Idea Track)
                    </span>
                    {hasInitialIdea === true && (
                      <CheckCircle2 className="w-5 h-5 text-accent-text" />
                    )}
                  </div>
                  <p className="text-caption text-ink-2 leading-relaxed">
                    คุณมีประเด็นที่สนใจอยากทำอยู่แล้ว ให้ครูที่ปรึกษา AI (Socratic Advisor) ชวนคิด ถามคำถามเจาะลึก 4 ด้าน และประเมินโครงงานทันที
                  </p>
                </div>
              </button>

              {/* Option B: Discovery Track */}
              <button
                type="button"
                onClick={() => {
                  setHasInitialIdea(false);
                  setSelectedTrack('discovery_track');
                }}
                className={`p-5 rounded-2xl border-2 text-left transition flex items-start gap-4 min-h-[96px] ${
                  hasInitialIdea === false && selectedTrack === 'discovery_track'
                    ? 'border-accent bg-accent-tint shadow-e1'
                    : 'border-separator bg-surface hover:border-accent/30'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-good-tint text-good flex items-center justify-center shrink-0">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-base">
                      ยังไม่มีไอเดีย อยากเริ่มค้นหา (Discovery Track)
                    </span>
                    {hasInitialIdea === false && (
                      <CheckCircle2 className="w-5 h-5 text-accent-text" />
                    )}
                  </div>
                  <p className="text-caption text-ink-2 leading-relaxed">
                    คุยสั้น ๆ เรื่องที่สนใจ แล้วให้ AI สร้างการ์ดไอเดียตั้งต้นเฉพาะคุณครั้งละ 5 ใบ ปัดการ์ดเพื่อค้นหาเรื่องที่ใช่ และสร้าง Shortlist เปรียบเทียบ
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Error message box */}
        {errorMessages.length > 0 && (
          <div className="p-3 rounded-xl bg-risk-tint border border-risk/40 text-risk text-caption space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-risk" />
              <span>โปรดตรวจสอบข้อมูลต่อไปนี้:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-caption">
              {errorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-separator flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 rounded-xl border border-separator hover:bg-surface-2 text-ink-2 font-semibold text-caption sm:text-callout transition flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-press text-white font-semibold text-caption sm:text-callout transition flex items-center gap-1.5 shadow-e1 min-h-[44px]"
            >
              <span>ถัดไป</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-press disabled:opacity-50 text-white font-bold text-caption sm:text-callout transition flex items-center gap-1.5 shadow-e2 min-h-[44px]"
            >
              <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกและเริ่มต้นโครงงาน'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
