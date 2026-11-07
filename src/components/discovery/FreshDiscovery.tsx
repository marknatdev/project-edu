'use client';

/**
 * Personalized Discovery UI: adaptive interest chat → editable summary →
 * real fresh-card generation (POST /api/discovery/cards) → swipe deck →
 * shortlist / compare → selected generated card handed to per-topic coaching.
 * Source, quota and failure states are always the server's truth; nothing here
 * substitutes catalog or template cards for a failed generation.
 */
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { getInterview, getLearner, saveIdea, getDefaultStorage } from '@/lib/storage/store';
import { saveTopicCardSnapshot } from '@/lib/advisor/coaching-local';
import { COACH_INVALIDATION_EVENT, COACH_INVALIDATION_KEY, type CoachingInvalidation } from '@/lib/advisor/coaching-invalidation';
import { getWipeGeneration, wipeAllLearnerData } from '@/lib/storage/store';
import { SUBFIELDS } from '@/data/subfields';
import { EQUIPMENT_OPTIONS, SKILL_OPTIONS } from '@/lib/interview/routing';
import { nextInterestQuestion } from '@/lib/discovery/interest-interview';
import { FRESH_LIMITS, FRESH_NOTICE_TH } from '@/lib/discovery/fresh-contract';
import {
  buildFreshCardsRequest, createDiscoverySession, discoveryReducer, loadDiscoverySession, saveDiscoverySession, MAX_SHORTLIST,
  type DiscoverySession, type DiscoveryStage, type FreshClientResult,
} from '@/lib/discovery/fresh-session';
import { fetchCardQuota, requestFreshCards } from '@/lib/discovery/fresh-client';
import type { Idea, Interview, SafetyCategory, TopicCard } from '@/types/domain';
import type { CardQuota } from '@/lib/persistence/contracts';

const btn = 'min-h-[44px] min-w-[44px] rounded-2xl border px-4 py-2 text-callout font-bold  transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent';
const primary = `${btn} border-accent bg-accent-press text-white shadow-[0_4px_0_#3730A3] hover:bg-accent-press`;
const secondary = `${btn} border-control bg-surface text-ink hover:border-accent/30 hover:bg-accent-tint`;
const panel = 'min-w-0 rounded-3xl border border-accent/30 bg-surface p-4 shadow-e1 sm:p-6';
const POLL_MS = 10_000; // polls count against the 6/min admission limit: poll slowly
const MAX_POLLS = 12;
const BOUNDARY_RETRIES = 3; // re-reads at +2s, +4s, +8s if resetAt has not advanced

const SAFETY_TH: Record<SafetyCategory, string> = {
  hazardous_chemicals: 'สารเคมีอันตราย', vertebrate_animals: 'สัตว์มีกระดูกสันหลัง', human_subjects: 'การทดสอบกับคน',
  biological_agents: 'เชื้อจุลินทรีย์ / สารชีวภาพ', high_voltage_radiation: 'ไฟฟ้าแรงสูง / รังสี',
};
const subfieldName = (id: string) => SUBFIELDS.find(s => s.id === id)?.nameTh ?? id;
const labelOf = (options: ReadonlyArray<{ id: string; labelTh: string }>, id: string) => options.find(o => o.id === id)?.labelTh ?? id;
const formatBaht = (n: number) => new Intl.NumberFormat('th-TH').format(n);

function Heading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="space-y-1">
      <p className="text-caption font-bold uppercase tracking-wider text-accent-text">{eyebrow}</p>
      <h1 id="discovery-stage-title" tabIndex={-1} className="text-xl font-semibold leading-snug text-ink outline-none sm:text-2xl">{title}</h1>
      <p className="text-callout text-ink-2">{desc}</p>
    </div>
  );
}

function QuotaPanel({ quota }: { quota: CardQuota | null }) {
  return (
    <section aria-label="สิทธิ์สร้างการ์ดวันนี้" className="rounded-2xl bg-ink p-3 text-callout text-white">
      {quota ? (
        <>
          <p>ฟรีเหลือ <strong className="text-good" data-testid="quota-free">{quota.freeRemaining}</strong>/5 ใบ · ขอเพิ่มเหลือ <strong className="text-good" data-testid="quota-extra">{quota.extraRemaining}</strong>/30 ใบ</p>
          <p className="text-caption text-ink-3">วันนี้ใช้แล้ว {quota.used} ใบ{quota.reserved ? ` · กำลังจอง ${quota.reserved} ใบ` : ''} · เริ่มนับใหม่ {new Date(quota.resetAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })} (เวลาประเทศไทย)</p>
          <p className="text-caption text-ink-3">นับเฉพาะการ์ดที่สร้างสำเร็จและไม่ซ้ำ · เปลี่ยนเรื่องหรือเริ่มคุยใหม่ไม่ได้คืนสิทธิ์</p>
        </>
      ) : <p className="text-caption text-ink-3">ยังอ่านสิทธิ์ที่เหลือจากเซิร์ฟเวอร์ไม่ได้ ระบบจะแจ้งตัวเลขจริงหลังติดต่อได้</p>}
    </section>
  );
}

function CardDetails({ card }: { card: TopicCard }) {
  const s = card.starter;
  return (
    <div className="min-w-0 space-y-2 break-words">
      <p className="rounded-lg bg-accent-tint px-2 py-1 text-caption font-semibold text-accent-text">ที่มา: AI สร้างใหม่จากคำตอบของคุณ · {subfieldName(card.subfieldId)} · ยังไม่ตรวจความใหม่ (Prior Work)</p>
      <h2 className="text-lg font-semibold leading-snug text-ink">{card.title}</h2>
      <p className="text-caption font-bold text-accent-text">ปัญหาที่ชวนสำรวจ</p>
      <p className="text-callout text-ink">{s?.problem ?? card.phenomenon}</p>
      {s && <><p className="text-caption font-bold text-accent-text">แนวทางทดลองคร่าว ๆ</p><p className="text-callout text-ink">{s.roughDirection}</p>
        <p className="text-caption font-bold text-accent-text">เชื่อมกับความสนใจ</p><p className="text-callout text-ink">{s.interestLink}</p></>}
      <div className="flex flex-wrap gap-2 text-caption">
        <span className="rounded-full bg-accent-tint px-2 py-1 text-accent-text">ประมาณ {formatBaht(card.estimatedBudgetBaht)} บาท</span>
        <span className="rounded-full bg-good-tint px-2 py-1 text-good">ประมาณ {card.estimatedWeeks} สัปดาห์</span>
        <span className="rounded-full bg-surface-2 px-2 py-1 text-ink-2">ทีม {card.minTeamSize}–{card.maxTeamSize} คน</span>
      </div>
      {s?.fitNotes?.length ? <ul className="list-disc pl-5 text-caption text-ink-2">{s.fitNotes.map(n => <li key={n}>{n}</li>)}</ul> : null}
      <div className="rounded-xl border border-caution/30 bg-caution-tint p-2 text-caption text-caution">
        <b>ธงความปลอดภัย (ตรวจคำเบื้องต้น ไม่ใช่การรับรองความปลอดภัย):</b>{' '}
        {card.safetyCategories?.length ? card.safetyCategories.map(c => SAFETY_TH[c]).join(', ') + ' — ต้องมีครูดูแลหรือขออนุมัติก่อนทำจริง' : 'ไม่พบคำเสี่ยงจากการตรวจเบื้องต้น ควรปรึกษาครูก่อนทดลองเสมอ'}
      </div>
    </div>
  );
}

const Guardrail = () => <p className="text-caption text-ink-2">เป็นเพียงไอเดียตั้งต้น ยังไม่ใช่โครงงานสำเร็จรูป ต้องคิดต่อ ปรับ และอธิบายด้วยภาษาของคุณเอง · งบและเวลาเป็นค่าประมาณ</p>;

function Notice({ session, busy, onRetry, onDismiss, canGenerate }: { session: DiscoverySession; busy: boolean; onRetry: () => void; onDismiss: () => void; canGenerate: boolean }) {
  if (busy) return (
    <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-tint p-3 text-callout text-accent-text">
      <Loader2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" />
      <div><b>กำลังให้ AI สร้างการ์ดไอเดียตั้งต้นจากคำตอบของคุณ…</b><p className="text-caption">ยังไม่หักโควตาจนกว่าจะได้รับการ์ดที่ผ่านเกณฑ์ คำตอบและการ์ดเดิมยังอยู่</p></div>
    </div>
  );
  const n = session.notice;
  if (!n) return null;
  const tone = n.kind === 'success' ? 'border-good/30 bg-good-tint text-good' : n.kind === 'partial' || n.kind === 'pending' ? 'border-caution/30 bg-caution-tint text-caution' : 'border-risk/40 bg-risk-tint text-risk';
  return (
    <div role={n.kind === 'error' || n.kind === 'quota' ? 'alert' : 'status'} className={`space-y-2 rounded-2xl border p-3 text-callout ${tone}`} data-testid="generation-notice" data-kind={n.kind}>
      <p className="font-semibold">{n.messageTh}</p>
      {(n.kind === 'error' || n.kind === 'quota') && <p className="text-caption">รอบนี้ไม่ได้รับการ์ดใหม่ · ไม่มีการนำการ์ดคลังเดิมมาแทน{session.cards.length ? ` · การ์ดที่สร้างไว้ ${session.cards.length} ใบยังอยู่` : ''}</p>}
      <div className="flex flex-wrap gap-2">
        {n.retry && n.kind !== 'quota' && <button type="button" className={primary} onClick={onRetry} disabled={!canGenerate}><RotateCcw aria-hidden className="mr-1 inline h-4 w-4" />ลองใหม่</button>}
        <button type="button" className={secondary} onClick={onDismiss}>ปิดข้อความ</button>
      </div>
    </div>
  );
}

function InterestChat({ session, dispatch, interview }: { session: DiscoverySession; dispatch: React.Dispatch<Parameters<typeof discoveryReducer>[1]>; interview: Interview }) {
  const step = nextInterestQuestion(session.answers, { gradeLevel: interview.gradeLevel, goal: interview.goal });
  const submit = (answer: string) => { if (!step.done && answer.trim()) dispatch({ type: 'ANSWER', question: step.question.text, answer }); };
  return (
    <div className="space-y-4">
      <Heading eyebrow="01 / รู้จักความสนใจ" title="เริ่มจากเรื่องที่คุณอยากทำ" desc="คุยสั้น ๆ ทีละข้อ 2–4 คำถาม ไม่ต้องมีไอเดียที่ชัดเจนก็เริ่มได้ ตอบว่า “ยังไม่รู้” ได้เสมอ" />
      <ol className="space-y-3" aria-label="บทสนทนาความสนใจ">
        {session.answers.map((a, i) => (
          <li key={i} className="space-y-2">
            <div className="rounded-2xl rounded-bl-sm border border-separator bg-surface p-3 text-callout"><b className="text-caption text-ink-3">ผู้ช่วยค้นหาเรื่อง (คำถามนำทาง ไม่ใช่ AI)</b><p className="whitespace-pre-wrap">{a.question}</p></div>
            <div className="ml-6 rounded-2xl rounded-br-sm border border-accent/30 bg-accent-tint p-3 text-callout"><b className="text-caption">คุณ</b><p className="whitespace-pre-wrap break-words">{a.answer}</p></div>
          </li>
        ))}
      </ol>
      {step.done ? (
        <button type="button" className={primary} onClick={() => dispatch({ type: 'GO', stage: 'summary' })}>ดูสรุปความสนใจ</button>
      ) : (
        <div className="space-y-3">
          <p className="text-caption text-ink-3">คำถามที่ {session.answers.length + 1} · ไม่เกิน 4 ข้อ</p>
          <h2 className="border-l-4 border-accent pl-3 text-base font-bold text-ink" data-testid="interest-question">{step.question.text}</h2>
          <div className="flex flex-wrap gap-2">
            {step.question.choices.map(choice => <button key={choice} type="button" className={secondary} onClick={() => submit(choice)}>{choice}</button>)}
          </div>
          <form className="space-y-2" onSubmit={e => { e.preventDefault(); submit(session.answerDraft); }}>
            <label htmlFor="interest-answer" className="block text-callout font-semibold">หรือเล่าในแบบของคุณ</label>
            <textarea id="interest-answer" value={session.answerDraft} maxLength={FRESH_LIMITS.answerChars} onChange={e => dispatch({ type: 'SET_DRAFT', draft: e.target.value })}
              placeholder="ไม่ต้องพิมพ์ชื่อจริงหรือชื่อโรงเรียน" className="min-h-[96px] w-full rounded-xl border border-control p-3 text-base" />
            <button type="submit" className={primary} disabled={!session.answerDraft.trim()}>ส่งคำตอบ →</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ConstraintChips({ interview }: { interview: Interview }) {
  const c = interview.constraints;
  return (
    <details className="rounded-2xl border border-separator bg-surface p-3 text-callout">
      <summary className="min-h-[44px] cursor-pointer py-2 font-semibold">ข้อจำกัดที่ทราบแล้ว (นำไปใช้ต่อ ไม่ถามซ้ำ)</summary>
      <p className="text-ink-2">{interview.gradeLevel === 'm_plai' ? 'ม.ปลาย' : 'ม.ต้น'} · งบประมาณ {formatBaht(c.budgetBaht)} บาท · {c.timeWeeks} สัปดาห์ · ทีม {c.teamSize} คน</p>
      <p className="text-ink-2">อุปกรณ์: {c.equipment.map(e => labelOf(EQUIPMENT_OPTIONS, e)).join(', ') || '—'}</p>
      <p className="text-ink-2">ทักษะ: {c.skills.map(s => labelOf(SKILL_OPTIONS, s)).join(', ') || '—'}</p>
    </details>
  );
}

function FreshDeck({ session, dispatch, onSelect, onGenerate, canGenerate, announce }: {
  session: DiscoverySession; dispatch: React.Dispatch<Parameters<typeof discoveryReducer>[1]>; onSelect: (card: TopicCard) => void;
  onGenerate: () => void; canGenerate: boolean; announce: (m: string) => void;
}) {
  const card = session.cards.find(c => c.id === session.batch[session.cursor]);
  const cardRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const likes = session.reactions.filter(r => r.action === 'like').length;
  const skips = session.reactions.filter(r => r.action === 'skip').length;
  const last = session.reactions.at(-1);
  const canUndo = Boolean(last && last.batch.join(',') === session.batch.join(','));
  const swipe = (action: 'like' | 'skip') => {
    if (!card) return;
    if (action === 'like' && !session.shortlist.includes(card.id) && session.shortlist.length >= MAX_SHORTLIST) { announce('Shortlist เต็ม 5 ใบแล้ว นำบางใบออกก่อน หรือกด “เลือกใบนี้” ไปคุยต่อได้เลย'); return; }
    dispatch({ type: 'SWIPE', action });
    announce(action === 'like' ? 'เก็บใน Shortlist แล้ว' : 'ข้ามใบนี้แล้ว ไม่ได้ตัดเรื่องทั้งสาขาออก');
    requestAnimationFrame(() => cardRef.current?.focus());
  };
  return (
    <div className="space-y-4">
      <Heading eyebrow="02 / สำรวจทีละใบ" title="มีเรื่องไหนที่อยากลองต่อบ้าง?" desc="ปัดหรือกดปุ่มเพื่อเก็บสิ่งที่สนใจ ข้ามใบเดียวไม่ได้หมายถึงไม่ชอบทั้งสาขา" />
      <p className="text-caption text-accent-text" data-testid="deck-counts">ความสนใจ: {session.summary || '—'}{session.refinement ? ` · บอกเพิ่ม: ${session.refinement}` : ''}<br />การ์ดที่ได้รับสะสม {session.cards.length} ใบ · สนใจ {likes} · ข้าม {skips}</p>
      <p className="rounded-xl bg-surface-2 p-2 text-caption text-ink-2">{FRESH_NOTICE_TH}</p>
      {card ? (
        <>
          <p className="text-caption text-ink-3">รอบนี้ใบที่ {session.cursor + 1}/{session.batch.length}</p>
          <div className="h-1.5 rounded bg-separator"><div className="h-full rounded" style={{ width: `${((session.cursor + 1) / session.batch.length) * 100}%` }} /></div>
          <article ref={cardRef} tabIndex={0} data-testid="active-card" data-card-id={card.id}
            aria-label={`การ์ด ${card.title} กดลูกศรซ้ายเพื่อข้าม ขวาเพื่อสนใจ ขึ้นเพื่อเลือก`}
            onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'ArrowLeft') { e.preventDefault(); swipe('skip'); } else if (e.key === 'ArrowRight') { e.preventDefault(); swipe('like'); } else if (e.key === 'ArrowUp') { e.preventDefault(); onSelect(card); } }}
            className="min-w-0 rounded-3xl border-2 border-slate-800 bg-surface p-4 shadow-[5px_5px_0_#1E293B] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent">
            <div aria-hidden className="mb-3 grid min-h-[72px] cursor-grab touch-none select-none place-items-center rounded-2xl text-caption font-semibold text-ink-2"
              onPointerDown={e => { if (e.button === 0 && e.isPrimary) { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); } }}
              onPointerCancel={() => { drag.current = null; }}
              onPointerUp={e => { const start = drag.current; drag.current = null; if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y;
                if (dy < -65 && Math.abs(dy) > Math.abs(dx)) onSelect(card); else if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy)) swipe(dx > 0 ? 'like' : 'skip'); }}>
              <Sparkles className="h-6 w-6 text-accent-text" />ลากตรงนี้ ← ข้าม · → สนใจ · ↑ เลือก
            </div>
            <CardDetails card={card} />
          </article>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className={`${secondary} whitespace-nowrap px-1`} onClick={() => swipe('skip')}>← ข้าม</button>
            <button type="button" className={`${btn} whitespace-nowrap border-accent/30 bg-accent-tint px-1 text-accent-text`} onClick={() => onSelect(card)}>↑ เลือกใบนี้</button>
            <button type="button" className={`${btn} whitespace-nowrap border-good/30 bg-good-tint px-1 text-good`} onClick={() => swipe('like')}>สนใจ →</button>
          </div>
          <p className="text-caption text-ink-3">ใช้ปุ่มได้เสมอ หรือโฟกัสที่การ์ดแล้วกดลูกศร ← → ↑</p>
        </>
      ) : (
        <div className="rounded-2xl border border-caution/30 bg-caution-tint p-3 text-callout text-caution">ดูการ์ดรอบนี้ครบแล้ว ({session.batch.length} ใบ) เลือกจาก Shortlist หรือบอกเพิ่มเพื่อขอรอบถัดไป</div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondary} disabled={!canUndo} onClick={() => { dispatch({ type: 'UNDO' }); announce('ย้อนการปัดล่าสุดแล้ว โควตายังคงเดิม'); }}>↶ ย้อนการปัดล่าสุด</button>
        <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'shortlist' })}>ดู Shortlist ({session.shortlist.length}/5)</button>
        <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'saved' })}>การ์ดที่บันทึกทั้งหมด ({session.cards.length})</button>
      </div>
      <Guardrail />
      <details id="refine-box" className="rounded-2xl border border-dashed border-control p-3" open={!card}>
        <summary className="min-h-[44px] cursor-pointer py-2 text-callout font-semibold">ยังไม่ตรงใจ? ปรับความสนใจแล้วขอเพิ่มอีก 5 ใบ</summary>
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); onGenerate(); }}>
          <label htmlFor="refine-summary" className="block text-callout font-semibold">สิ่งที่อยากทำ / ปัญหาที่สนใจ</label>
          <textarea id="refine-summary" value={session.summary} maxLength={FRESH_LIMITS.summaryChars} onChange={e => dispatch({ type: 'SET_SUMMARY', summary: e.target.value })} className="min-h-[80px] w-full rounded-xl border border-control p-3 text-base" />
          <label htmlFor="refinement" className="block text-callout font-semibold">อยากปรับอะไรในรอบถัดไป? (ไม่บังคับ)</label>
          <textarea id="refinement" value={session.refinement} maxLength={FRESH_LIMITS.refinementChars} onChange={e => dispatch({ type: 'SET_REFINEMENT', refinement: e.target.value })}
            placeholder="เช่น เน้นเรื่องน้ำ ไม่ต้องใช้อุปกรณ์เพิ่ม" className="min-h-[80px] w-full rounded-xl border border-control p-3 text-base" />
          <p className="text-caption text-ink-3">ระบบส่งการ์ดที่คุณสนใจ/ข้าม และการ์ดที่เคยเห็นไปด้วย เพื่อไม่ให้ได้แนวทางเดิมซ้ำ</p>
          <button type="submit" className={primary} disabled={!canGenerate || !session.summary.trim()}>ขอการ์ดเพิ่ม 5 ใบ</button>
        </form>
      </details>
    </div>
  );
}

function MiniCard({ card, children, selected }: { card: TopicCard; children?: React.ReactNode; selected?: boolean }) {
  return (
    <li className={`min-w-0 list-none rounded-2xl border bg-surface p-3 ${selected ? 'border-2 border-accent' : 'border-control'}`} data-card-id={card.id}>
      <p className="mb-1 text-caption font-semibold text-accent-text">AI สร้างจากคำตอบของคุณ</p>
      <h2 className="text-base font-bold text-ink">{card.title}</h2>
      <p className="text-callout text-ink-2">{card.starter?.problem ?? card.phenomenon}</p>
      <p className="mt-1 text-caption text-ink-3">ประมาณ {formatBaht(card.estimatedBudgetBaht)} บาท · {card.estimatedWeeks} สัปดาห์</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

function fitLine(card: TopicCard, interview: Interview): string {
  const c = interview.constraints;
  return `งบ${card.estimatedBudgetBaht <= c.budgetBaht ? 'ไม่เกิน' : 'เกิน'} ${formatBaht(c.budgetBaht)} บาท · เวลา${card.estimatedWeeks <= c.timeWeeks ? 'ไม่เกิน' : 'เกิน'} ${c.timeWeeks} สัปดาห์ · ทีม ${c.teamSize} คน${c.teamSize >= card.minTeamSize && c.teamSize <= card.maxTeamSize ? 'อยู่ในช่วง' : 'ไม่อยู่ในช่วง'}ที่การ์ดประมาณไว้`;
}

export function FreshDiscovery() {
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [session, dispatch] = useReducer(discoveryReducer, null, createDiscoverySession);
  const [ready, setReady] = useState(false);
  const [erased, setErased] = useState(false);
  const invalidated = useRef(false);
  // Wipe generation seen right after this view's last local write (null: none yet).
  const writtenGeneration = useRef<string | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const inFlight = useRef(false);
  const polls = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((m: string) => setAnnouncement(m), []);

  const send = useCallback(async (requestId: string, body: Parameters<typeof requestFreshCards>[0]) => {
    if (inFlight.current || invalidated.current || !mounted.current) return;
    const started = epoch.current;
    inFlight.current = true; setBusy(true);
    let result: FreshClientResult;
    try { result = await requestFreshCards(body, undefined, lifetime.current?.signal); } finally {
      if (started === epoch.current && mounted.current && !invalidated.current) { inFlight.current = false; setBusy(false); }
    }
    if (!mounted.current || invalidated.current || started !== epoch.current) return;
    dispatch({ type: 'GENERATION_RESULT', requestId, result });
    announce(result.status === 'ok' ? `ได้รับการ์ด ${result.accepted} ใบ` : result.messageTh);
    if (result.status === 'pending' && polls.current < MAX_POLLS) {
      polls.current++;
      pollTimer.current = setTimeout(() => { const p = sessionRef.current.pending; if (p) void send(p.requestId, p.body); }, POLL_MS);
    } else polls.current = 0;
  }, [announce]);

  useEffect(() => {
    mounted.current = true;
    lifetime.current = new AbortController();
    const invalidate = (detail: CoachingInvalidation) => {
      if (detail.action !== 'wipe') return;
      invalidated.current = true; epoch.current++; inFlight.current = false; polls.current = 0;
      lifetime.current?.abort();
      if (pollTimer.current) clearTimeout(pollTimer.current);
      sessionRef.current = createDiscoverySession();
      dispatch({ type: 'RESTORE', session: createDiscoverySession() });
      setBusy(false); setInterview(null); setStorageWarning(null); setAnnouncement(''); setErased(true);
      // Remove a stale write of ours that raced cross-tab delivery — only if we wrote in the
      // current generation; a late event must not erase work created after that wipe.
      if (writtenGeneration.current === getWipeGeneration()) wipeAllLearnerData();
    };
    const custom = (event: Event) => invalidate((event as CustomEvent<CoachingInvalidation>).detail);
    const storage = (event: StorageEvent) => {
      if (event.key === COACH_INVALIDATION_KEY && event.newValue) {
        try { invalidate(JSON.parse(event.newValue)); } catch { /* Not an authority token. */ }
      }
    };
    window.addEventListener(COACH_INVALIDATION_EVENT, custom); window.addEventListener('storage', storage);
    return () => {
      // This is a generation counter, not a DOM ref: cleanup must fence the
      // current asynchronous operations, including an earlier wipe generation.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      mounted.current = false; epoch.current++;
      lifetime.current?.abort();
      if (pollTimer.current) clearTimeout(pollTimer.current);
      window.removeEventListener(COACH_INVALIDATION_EVENT, custom); window.removeEventListener('storage', storage);
    };
  }, []);

  // Load interview + saved session; resume an interrupted intent with the SAME id/body.
  useEffect(() => {
    const iv = getInterview();
    setInterview(iv);
    const loaded = loadDiscoverySession(getDefaultStorage());
    if (loaded.corrupt) setStorageWarning('อ่านข้อมูลการค้นหาเดิมในเครื่องไม่ได้ จึงเริ่มใหม่ การ์ดที่สร้างแล้วยังถูกนับโควตาบนเซิร์ฟเวอร์ตามจริง');
    dispatch({ type: 'RESTORE', session: loaded.session });
    setReady(true);
    if (loaded.session.cards.length || loaded.session.answers.length) announce('กลับมาทำต่อจากที่บันทึกไว้ในเบราว์เซอร์นี้');
    if (loaded.session.pending) void send(loaded.session.pending.requestId, loaded.session.pending.body);
    return () => { if (pollTimer.current) clearTimeout(pollTimer.current); };
  }, [announce, send]);

  useEffect(() => {
    if (!ready || invalidated.current || !mounted.current) return;
    try { saveDiscoverySession(session, getDefaultStorage()); writtenGeneration.current = getWipeGeneration(); }
    catch { setStorageWarning('บันทึกในเครื่องไม่ได้ ข้อมูลรอบนี้อยู่เฉพาะแท็บนี้ และอาจหายเมื่อรีเฟรช'); }
  }, [session, ready]);

  // Serialize initial/foreground reads; retain one reset refresh behind a slow read.
  const quotaRefresh = useRef<((force?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    if (!ready || erased) return;
    let live = true;
    let reading = false;
    let boundaryQueued = false;
    let lastRead = 0;
    const started = epoch.current;
    const current = () => live && mounted.current && !invalidated.current && started === epoch.current;
    const refresh = async (force = false) => {
      if (!current()) return;
      if (reading) { if (force) boundaryQueued = true; return; }
      if (!force && Date.now() - lastRead < 1000) return;
      reading = true; lastRead = Date.now();
      const previousQuota = sessionRef.current.quota;
      try {
        const q = await fetchCardQuota(undefined, lifetime.current?.signal);
        // A queued reset or newer generation result makes this read obsolete.
        if (q && current() && !boundaryQueued && sessionRef.current.quota === previousQuota) dispatch({ type: 'QUOTA', quota: q });
      } finally {
        reading = false;
        if (boundaryQueued && current()) { boundaryQueued = false; void refresh(true); }
      }
    };
    quotaRefresh.current = refresh;
    void refresh(true);
    const foreground = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', foreground); document.addEventListener('visibilitychange', foreground);
    return () => {
      live = false; boundaryQueued = false; quotaRefresh.current = null;
      window.removeEventListener('focus', foreground); document.removeEventListener('visibilitychange', foreground);
    };
  }, [ready, erased]);

  // Arm once per server reset timestamp. If the server still reports the same
  // resetAt (client clock ahead), re-read a bounded number of times with backoff;
  // a new resetAt re-runs this effect and cancels the remaining retries.
  const quotaResetAt = session.quota?.resetAt;
  useEffect(() => {
    if (!ready || erased) return;
    const reset = quotaResetAt ? Date.parse(quotaResetAt) : NaN;
    if (!Number.isFinite(reset)) return;
    const msUntilReset = reset - Date.now();
    let retries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const arm = (ms: number) => {
      timer = setTimeout(() => {
        void quotaRefresh.current?.(true);
        if (retries < BOUNDARY_RETRIES) arm(2000 * 2 ** retries++);
      }, ms);
    };
    arm(msUntilReset > 0 ? Math.min(msUntilReset + 50, 2_147_000_000) : 1500);
    return () => clearTimeout(timer);
  }, [ready, erased, quotaResetAt]);

  const stageRef = useRef<DiscoveryStage>(session.stage);
  useEffect(() => {
    if (stageRef.current !== session.stage) { stageRef.current = session.stage; requestAnimationFrame(() => document.getElementById('discovery-stage-title')?.focus()); }
  }, [session.stage]);

  const quotaEmpty = Boolean(session.quota && session.quota.remaining === 0 && session.quota.reserved === 0);
  const canGenerate = !busy && !quotaEmpty && session.answers.length > 0;

  const generate = useCallback(() => {
    const s = sessionRef.current;
    if (!interview || inFlight.current || invalidated.current || !mounted.current) return;
    if (s.pending && s.notice?.retry !== 'new') { void send(s.pending.requestId, s.pending.body); return; }
    if (!s.summary.trim() || !s.answers.length) { dispatch({ type: 'GO', stage: 'summary' }); announce('ช่วยเล่าความสนใจสั้น ๆ ก่อน'); return; }
    if (pollTimer.current) clearTimeout(pollTimer.current);
    polls.current = 0;
    const requestId = crypto.randomUUID();
    const body = buildFreshCardsRequest(s, interview, requestId);
    dispatch({ type: 'GENERATION_STARTED', requestId, body });
    void send(requestId, body);
  }, [interview, send, announce]);

  const select = (card: TopicCard) => {
    if (invalidated.current || !mounted.current) return;
    dispatch({ type: 'SELECT', id: card.id });
    try {
      saveTopicCardSnapshot(card);
      const learner = getLearner();
      const now = new Date().toISOString();
      const idea: Idea = { id: `idea-${Date.now()}`, learnerId: learner?.id ?? 'guest-learner', title: card.title,
        description: `${card.starter?.problem ?? card.phenomenon}\n\nแนวทางทดลองคร่าว ๆ: ${card.starter?.roughDirection ?? card.curiosityHook}`,
        source: 'discovery_track', sourceTopicCardId: card.id, gradeLevel: interview?.gradeLevel ?? 'm_ton', goal: interview?.goal ?? 'curiosity', createdAt: now, updatedAt: now };
      saveIdea(idea); writtenGeneration.current = getWipeGeneration();
    } catch { setStorageWarning('บันทึกการ์ดที่เลือกในเครื่องไม่ได้ กรุณาลองอีกครั้ง'); return; }
    announce('ส่งการ์ดที่เลือกไปคุยกับครูที่ปรึกษาแล้ว');
    router.push(`/idea?topicCardId=${encodeURIComponent(card.id)}`);
  };

  if (erased) return <section role="status" className={`${panel} space-y-3`}><h1 className="text-lg font-bold">ลบข้อมูลแล้ว</h1><p>หยุดการค้นหาและลบคำตอบ การ์ด และคำขอที่ค้างในหน้านี้แล้ว ไม่บันทึกข้อมูลเก่ากลับคืน</p><Link href="/interview" className={`${primary} inline-flex items-center`}>เริ่มต้นใหม่</Link></section>;
  if (!ready || interview === undefined) return <p className="p-8 text-center text-callout text-ink-3">กำลังโหลดการค้นหาเรื่องที่อยากทำ…</p>;
  if (!interview) return (
    <section className={`${panel} mx-auto max-w-2xl space-y-3`}>
      <Heading eyebrow="ก่อนเริ่มค้นหา" title="ทำแบบสัมภาษณ์สั้น ๆ ก่อนนะ" desc="ต้องรู้ระดับชั้น เป้าหมาย และข้อจำกัด (เวลา งบ อุปกรณ์ ทีม ทักษะ) ก่อน การ์ดจึงจะเหมาะกับคุณ ระบบจะไม่เดาค่าแทน" />
      <Link href="/interview" className={`${primary} inline-flex items-center`}>ไปทำแบบสัมภาษณ์</Link>
    </section>
  );

  const byId = (id: string) => session.cards.find(c => c.id === id);
  const navItems: Array<[string, DiscoveryStage, boolean]> = [['1 คุยความสนใจ', session.answers.length && session.summary ? 'summary' : 'chat', true],
    ['2 สำรวจการ์ด', 'deck', session.cards.length > 0], [`3 คัดเลือก (${session.shortlist.length}/5)`, 'shortlist', session.cards.length > 0]];
  const current = (stage: DiscoveryStage) => (stage === 'summary' && session.stage === 'chat') || stage === session.stage || (stage === 'deck' && session.stage === 'saved') || (stage === 'shortlist' && session.stage === 'compare');

  return (
    <div className="mx-auto max-w-5xl min-w-0 space-y-4 break-words">
      <header className={`${panel} flex flex-wrap items-center gap-3`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-good-tint text-good"><Compass aria-hidden className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink sm:text-lg">ค้นหาเรื่องที่อยากทำ (Discovery)</p>
          <p className="text-caption text-ink-2">คุยสั้น ๆ แล้วให้ AI สร้างการ์ดไอเดียตั้งต้นเฉพาะคุณ ครั้งละ 5 ใบ · บันทึกในเบราว์เซอร์นี้ รีเฟรชแล้วทำต่อได้</p>
        </div>
      </header>
      {storageWarning && <p role="alert" className="rounded-2xl border border-risk/40 bg-risk-tint p-3 text-callout text-risk">{storageWarning}</p>}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${panel} space-y-3 self-start`} aria-label="ขั้นตอนและสิทธิ์">
          <nav aria-label="ขั้นตอนค้นหา" className="grid grid-cols-3 gap-1 lg:grid-cols-1">
            {navItems.map(([label, stage, enabled]) => (
              <button key={label} type="button" disabled={!enabled || busy} aria-current={current(stage) ? 'step' : undefined} onClick={() => dispatch({ type: 'GO', stage })}
                className={`min-h-[44px] rounded-xl border px-2 text-caption font-bold sm:text-callout lg:text-left ${current(stage) ? 'border-accent/30 bg-accent-tint text-accent-text' : 'border-transparent bg-transparent text-ink-2'} disabled:opacity-50`}>{label}</button>
            ))}
          </nav>
          <QuotaPanel quota={session.quota} />
          <ConstraintChips interview={interview} />
          <button type="button" className={`${secondary} w-full`} disabled={busy} onClick={() => { dispatch({ type: 'RESTART_INTERVIEW' }); announce('เริ่มคุยใหม่แล้ว การ์ดเดิมและโควตาวันนี้ยังคงอยู่'); }}>เริ่มคุยใหม่ · ไม่คืนโควตา</button>
        </aside>
        <main className={`${panel} space-y-4`} id="discovery-main">
          <Notice session={session} busy={busy} onRetry={generate} onDismiss={() => dispatch({ type: 'DISMISS_NOTICE' })} canGenerate={!busy && !quotaEmpty} />
          {session.stage === 'chat' && <InterestChat session={session} dispatch={dispatch} interview={interview} />}
          {session.stage === 'summary' && (
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); generate(); }}>
              <Heading eyebrow="01 / สรุปก่อนสำรวจ" title="ฟังดูเป็นเรื่องที่คุณสนใจไหม?" desc="แก้สรุปให้ตรงใจ แล้วให้ AI สร้างการ์ดไอเดียตั้งต้น 5 ใบจากคำตอบและข้อจำกัดของคุณ" />
              <label htmlFor="interest-summary" className="block text-callout font-semibold">สิ่งที่อยากทำ / ปัญหาที่สนใจ</label>
              <textarea id="interest-summary" value={session.summary} maxLength={FRESH_LIMITS.summaryChars} onChange={e => dispatch({ type: 'SET_SUMMARY', summary: e.target.value })} className="min-h-[110px] w-full rounded-xl border border-control p-3 text-base" />
              <p className="text-caption text-ink-3">แก้ได้ตามใจ · ข้อจำกัดเดิมถูกนำไปใช้ต่อ · การ์ดเป็นไอเดียตั้งต้น ไม่ใช่โครงงานสำเร็จรูป</p>
              {quotaEmpty && <p role="status" className="text-callout text-risk">วันนี้ใช้สิทธิ์สร้างการ์ดครบแล้ว การ์ดที่สร้างไว้ยังอยู่ สร้างใหม่ได้หลังเที่ยงคืนตามเวลาประเทศไทย</p>}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={`${primary} w-full sm:w-auto`} disabled={!canGenerate || !session.summary.trim()}>{session.cards.length ? 'สร้างการ์ดเพิ่ม 5 ใบ →' : 'สร้างการ์ด 5 ใบ →'}</button>
                <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'chat' })}>กลับไปดูบทสนทนา</button>
                {session.cards.length > 0 && <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'deck' })}>ดูการ์ดเดิม ({session.cards.length})</button>}
              </div>
            </form>
          )}
          {session.stage === 'deck' && <FreshDeck session={session} dispatch={dispatch} onSelect={select} onGenerate={generate} canGenerate={canGenerate} announce={announce} />}
          {session.stage === 'shortlist' && (
            <div className="space-y-3">
              <Heading eyebrow="03 / คัดเลือก" title="เก็บไว้คิดต่อ แล้วเลือกสิ่งที่ใช่" desc="Shortlist ได้ไม่เกิน 5 ใบ เลือกเทียบ 2 ใบ หรือเลือกใบเดียวไปคุยกับครูที่ปรึกษาได้เลย" />
              {session.shortlist.length ? (
                <ul className="space-y-3">{session.shortlist.map(byId).filter((c): c is TopicCard => Boolean(c)).map(c => (
                  <MiniCard key={c.id} card={c} selected={session.compare.includes(c.id)}>
                    <button type="button" className={secondary} aria-pressed={session.compare.includes(c.id)} onClick={() => { if (!session.compare.includes(c.id) && session.compare.length >= 2) { announce('เทียบได้ครั้งละ 2 ใบ ยกเลิกใบที่เลือกก่อน'); return; } dispatch({ type: 'TOGGLE_COMPARE', id: c.id }); }}>{session.compare.includes(c.id) ? '✓ เลือกเทียบแล้ว' : '＋ เลือกเทียบ'}</button>
                    <button type="button" className={primary} onClick={() => select(c)}>เลือกไปคุยต่อ</button>
                    <button type="button" className={secondary} onClick={() => { dispatch({ type: 'REMOVE_SHORTLIST', id: c.id }); announce('นำออกจาก Shortlist แล้ว การ์ดยังอยู่ในที่บันทึก'); }}>นำออก</button>
                  </MiniCard>))}</ul>
              ) : <p className="rounded-2xl border border-caution/30 bg-caution-tint p-3 text-callout text-caution">ยังไม่มีการ์ดที่สนใจ กลับไปสำรวจแล้วกด “สนใจ” เพื่อเก็บไว้ที่นี่</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primary} disabled={session.compare.length !== 2} onClick={() => dispatch({ type: 'GO', stage: 'compare' })}>เทียบ {session.compare.length}/2 ใบ →</button>
                <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'deck' })}>← กลับไปสำรวจ</button>
              </div>
              <Guardrail />
            </div>
          )}
          {session.stage === 'compare' && (
            <div className="space-y-3">
              <Heading eyebrow="03 / เปรียบเทียบ" title="สองเรื่องนี้ ต่างกันตรงไหน?" desc="ดูปัญหา แนวทาง งบ และเวลาเคียงกัน ตัวเลขเป็นค่าประมาณจาก AI ไม่ใช่คะแนนรับรอง" />
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {session.compare.map(byId).filter((c): c is TopicCard => Boolean(c)).map(c => (
                  <article key={c.id} className="min-w-0 space-y-2 rounded-2xl border border-control border-t-4 border-t-indigo-500 bg-surface p-3" data-card-id={c.id}>
                    <CardDetails card={c} />
                    <p className="text-caption font-bold text-accent-text">เทียบกับข้อจำกัดของคุณ</p>
                    <p className="text-callout text-ink-2">{fitLine(c, interview)} · ยังต้องตรวจอุปกรณ์และวิธีทำกับครู</p>
                    <button type="button" className={`${primary} w-full`} onClick={() => select(c)}>เลือกเรื่องนี้ →</button>
                  </article>
                ))}
              </div>
              <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'shortlist' })}>← กลับ Shortlist</button>
            </div>
          )}
          {session.stage === 'saved' && (
            <div className="space-y-3">
              <Heading eyebrow="บันทึกในเครื่อง" title="ทุกใบที่เคยได้รับยังอยู่" desc="กลับมาเลือกได้หลังรีเฟรช โดยไม่ใช้โควตาซ้ำ" />
              <ul className="space-y-3">{session.cards.map(c => (
                <MiniCard key={c.id} card={c}>
                  <button type="button" className={secondary} disabled={session.shortlist.includes(c.id) || session.shortlist.length >= MAX_SHORTLIST} onClick={() => dispatch({ type: 'ADD_SHORTLIST', id: c.id })}>{session.shortlist.includes(c.id) ? 'อยู่ใน Shortlist แล้ว' : 'เก็บใน Shortlist'}</button>
                  <button type="button" className={primary} onClick={() => select(c)}>เลือกไปคุยต่อ</button>
                </MiniCard>))}</ul>
              <button type="button" className={secondary} onClick={() => dispatch({ type: 'GO', stage: 'deck' })}>← กลับไปสำรวจ</button>
            </div>
          )}
          <p role="status" aria-live="polite" aria-atomic="true" className="min-h-[1.5em] text-callout text-accent-text" data-testid="announcement">{announcement}</p>
        </main>
      </div>
    </div>
  );
}
