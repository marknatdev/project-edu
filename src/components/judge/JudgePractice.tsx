'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Evaluation, Project } from '@/types/domain';
import { getDefaultStorage, getEvaluations, getIdea, getWipeGeneration } from '@/lib/storage/store';
import { useWipeInvalidation } from '@/lib/storage/use-wipe-invalidation';
import { AXIS_META } from '@/lib/evaluation/view-model';
import { JUDGE_PERSONAS, selectJudgeQuestions, reviewJudgeAnswer, type JudgePersona } from '@/lib/judge/practice';
import { readJudgeAnswers, saveJudgeAnswer } from '@/lib/judge/answers';

const button = 'min-h-11 rounded-xl px-4 py-3 text-callout font-semibold disabled:opacity-50';
const personas = { ysc: 'YSC · วิธีวิจัย & ชุดควบคุม', nsc: 'NSC · ระบบ & การใช้งานจริง', tcas: 'TCAS · บทบาท & การเรียนรู้' };

export function JudgePractice({ project, lockSelection }: { project: Project; lockSelection: (locked: boolean) => void }) {
  const [persona, setPersona] = useState<JudgePersona>('ysc');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [stale, setStale] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<ReturnType<typeof reviewJudgeAnswer> | null>(null);
  const [error, setError] = useState('');
  const [readFailed, setReadFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [wiped, markWiped] = useWipeInvalidation();
  // Storage scope + wipe generation captured with the answers this editor shows.
  const loaded = useRef<{ storage: ReturnType<typeof getDefaultStorage>; generation: string } | null>(null);
  const questions = selectJudgeQuestions({ persona, ideaId: project.ideaId, evaluation });
  const question = questions[index];
  const saved = answers[question.id] ?? '';
  const dirty = draft !== saved;

  useEffect(() => {
    const idea = getIdea(project.ideaId);
    const latest = idea ? getEvaluations().filter(e => e.ideaId === idea.id).sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))[0] ?? null : null;
    setEvaluation(latest);
    setStale(!!idea && !!latest && idea.updatedAt > latest.evaluatedAt);
    try {
      const storage = getDefaultStorage();
      loaded.current = { storage, generation: getWipeGeneration(storage) };
      const stored = readJudgeAnswers(project.id, storage);
      setAnswers(stored);
      const first = selectJudgeQuestions({ persona: 'ysc', ideaId: project.ideaId, evaluation: latest })[0];
      setDraft(stored[first.id] ?? '');
    } catch { setReadFailed(true); setError('อ่านคำตอบที่บันทึกไว้ไม่ได้ จึงไม่เขียนทับข้อมูลเดิม กรุณาตรวจพื้นที่จัดเก็บในเบราว์เซอร์'); }
    setReady(true);
  }, [project.id, project.ideaId]);

  useEffect(() => { lockSelection(dirty && !wiped); return () => lockSelection(false); }, [dirty, wiped, lockSelection]);

  function move(nextPersona: JudgePersona, nextIndex: number) {
    const next = selectJudgeQuestions({ persona: nextPersona, ideaId: project.ideaId, evaluation })[nextIndex];
    setPersona(nextPersona); setIndex(nextIndex); setDraft(answers[next.id] ?? ''); setFeedback(null); setError('');
  }
  function save() {
    try {
      const result = reviewJudgeAnswer(question, draft);
      if (!loaded.current || !saveJudgeAnswer(project.id, question.id, draft, loaded.current.storage, loaded.current.generation)) { markWiped(); return; }
      setAnswers({ ...answers, [question.id]: draft }); setFeedback(result); setError('');
    } catch { setError('ยังไม่บันทึกคำตอบ กรุณาเขียน 1–6,000 ตัวอักษรและตรวจพื้นที่จัดเก็บ แล้วลองใหม่'); }
  }
  if (wiped) return <p role="status">ลบข้อมูลแล้ว กรุณาเปิดโครงงานใหม่ก่อนฝึกตอบ</p>;
  if (!ready) return <p role="status">กำลังโหลดคำถาม…</p>;
  return <section className="space-y-4 min-w-0" aria-label="ฝึกตอบคำถาม">
    <div className="rounded-2xl bg-accent-tint border border-accent/30 p-4 text-callout leading-relaxed text-ink">
      <p className="font-bold">คลังคำถามจำลอง · ทำงานโดยไม่ใช้ AI</p>
      <p>เรียงด้านที่ต้องแก้ก่อนด้านที่ควรปรับ จากผลประเมินของไอเดียนี้ ไม่ใช่คำถามหรือเกณฑ์ทางการ คำตอบเป็นของคุณเอง ไม่สร้างคำตอบตัวอย่างแทนผู้เรียน</p>
      <p className="mt-2 text-caption">{evaluation ? `อิงผลประเมิน ${new Date(evaluation.evaluatedAt).toLocaleDateString('th-TH')}` : 'ยังไม่มี Evaluation ของไอเดียนี้ — ใช้คำถามฝึกทั่วไป ไม่อ้างว่าเป็นจุดอ่อน'}</p>
      {stale && <p className="mt-2 text-caution">ไอเดีย เปลี่ยนหลังประเมิน คำถามยังอิงผลเดิม กรุณาประเมินใหม่เมื่อพร้อม</p>}
      <Link href={`/evaluation?ideaId=${encodeURIComponent(project.ideaId)}`} className="inline-flex items-center min-h-11 underline font-semibold">ไปประเมิน ไอเดีย</Link>
    </div>
    <label className="block text-callout font-semibold">เลือกบทบาทกรรมการ
      <select className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-control bg-surface p-3 text-callout" aria-label="เลือกบทบาทกรรมการ" disabled={dirty} value={persona} onChange={e => move(e.target.value as JudgePersona, 0)}>
        {JUDGE_PERSONAS.map(p => <option value={p} key={p}>{personas[p]}</option>)}
      </select>
    </label>
    <div className="rounded-3xl border border-accent/30 bg-surface p-5 space-y-4 shadow-e1">
      <p className="text-caption font-bold text-accent-text">คำถาม {index + 1}/{questions.length} · {question.targeted ? 'ฝึกด้านที่ควรพัฒนา' : 'ฝึกทั่วไป'}</p>
      <h2 className="text-callout font-bold text-accent-text">{AXIS_META[question.axis].nameTh}</h2>
      {evaluation && <p className="text-caption font-semibold">{evaluation.axes[question.axis].score < 4 ? 'ควรปรับปรุง' : evaluation.axes[question.axis].score < 7 ? 'ควรพัฒนา' : 'แข็งแรง'} · {evaluation.axes[question.axis].score}/10</p>}
      <p className="font-semibold leading-relaxed">{question.prompt}</p>
      <label className="block text-callout font-semibold">คำตอบของฉัน (ไม่ใส่ชื่อจริง / โรงเรียน)
        <textarea aria-label="คำตอบซ้อมกรรมการ" className="mt-2 w-full min-w-0 rounded-xl border border-control p-3 text-callout leading-relaxed" rows={5} maxLength={6000} disabled={readFailed} value={draft} onChange={e => { setDraft(e.target.value); setFeedback(null); }} placeholder="อธิบายเหตุผลและหลักฐานด้วยภาษาของคุณเอง…" />
      </label>
      <p className="text-caption text-ink-3">{draft.length}/6,000 ตัวอักษร · {dirty ? 'ยังไม่บันทึก — บันทึกหรือยกเลิกก่อนเปลี่ยนคำถาม/โครงงาน' : 'คำตอบที่บันทึกในอุปกรณ์นี้'}</p>
      <div className="grid grid-cols-2 gap-2">
        <button className={`${button} bg-accent text-white col-span-2`} disabled={readFailed || !draft.trim()} onClick={save}>บันทึก & ทบทวนคำตอบ</button>
        {dirty && <button className={`${button} border col-span-2`} onClick={() => { setDraft(saved); setFeedback(null); }}>ยกเลิกการแก้ไขคำตอบ</button>}
        <button className={`${button} border text-ink-2`} disabled={dirty || index === 0} onClick={() => move(persona, index - 1)}>คำถามก่อนหน้า</button>
        <button className={`${button} border text-accent-text`} disabled={dirty || index === questions.length - 1} onClick={() => move(persona, index + 1)}>คำถามถัดไป</button>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-caution-tint p-4 text-callout text-caution">{error}</p>}
    {feedback && <div role="status" className="rounded-2xl border border-good/30 bg-good-tint p-5 space-y-3 text-callout text-good">
      <h3 className="font-bold">บันทึกแล้ว · Feedback แบบกรอบทบทวน</h3>
      <p>{feedback.message}</p>
      <ul className="list-disc pl-5 space-y-2">{feedback.checklist.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="text-caption">ลองอ่านคำตอบเทียบทีละข้อ หากยังไม่มีหลักฐานให้ระบุว่ายังไม่ทราบ แล้วกลับไปเก็บข้อมูล ไม่ใช่เพิ่มข้อความเพื่อให้ดูได้คะแนน</p>
    </div>}
  </section>;
}
