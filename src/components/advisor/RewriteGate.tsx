'use client';

import React, { useState } from 'react';
import { AlertCircle, PenLine } from 'lucide-react';
import { isRewriteAcceptable } from '@/lib/advisor/chat-reducer';

export interface RewriteGateProps {
  exampleText: string;
  issuedExamples?: string[];
  onSubmitRewrite: (rewrittenText: string) => void;
  onDefer?: () => void;
  error?: string | null;
  initialText?: string;
  onDraftChange?: (text: string) => void;
}

/** Own-words step (ADR 0002/0004): an AI starting point becomes the learner's idea only after they rewrite it. */
export function RewriteGate({ exampleText, onSubmitRewrite, onDefer, error: externalError, initialText = '', issuedExamples, onDraftChange }: RewriteGateProps) {
  const [text, setText] = useState(initialText);
  const [localError, setLocalError] = useState<string | null>(null);
  const examples = issuedExamples?.length ? issuedExamples : [exampleText];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = examples.map(example => isRewriteAcceptable(example, text)).find(result => !result.acceptable) ?? { acceptable: true };
    if (!check.acceptable) { setLocalError(check.reasonTh ?? 'ข้อความยังไม่ผ่านเกณฑ์'); return; }
    setLocalError(null);
    onSubmitRewrite(text.trim());
  };

  const length = text.trim().length;
  const remaining = Math.max(0, 15 - length);
  const displayError = localError || externalError;

  return (
    <section aria-labelledby="rewrite-title" className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-e1">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-text"><PenLine className="h-5 w-5" aria-hidden /></span>
        <div>
          <h2 id="rewrite-title" className="text-headline">เขียนแนวทางด้วยภาษาของคุณ</h2>
          <p className="text-callout text-ink-2">จุดตั้งต้นจาก AI ยังไม่ใช่ไอเดียของคุณ เลือกแนวที่ชอบ แล้วเล่าว่าคุณจะทำอย่างไร</p>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {examples.map((example, i) => <li key={i} className="rounded-xl bg-surface-2 px-3 py-2 text-callout text-ink-2">{example}</li>)}
      </ul>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="student-rewrite" className="font-medium">แนวทางของฉัน</label>
          <textarea id="student-rewrite" rows={4} value={text} aria-describedby="rewrite-help" aria-invalid={Boolean(displayError)}
            onChange={e => { setText(e.target.value); onDraftChange?.(e.target.value); if (localError) setLocalError(null); }}
            placeholder="เช่น ฉันจะลองเปลี่ยน… แล้ววัด…"
            className={`w-full resize-none rounded-xl border bg-surface px-3.5 py-3 placeholder:text-ink-3 ${displayError ? 'border-2 border-risk' : 'border-control'}`} />
          <p id="rewrite-help" className="text-callout text-ink-2">{remaining > 0 ? `เขียนอีกอย่างน้อย ${remaining} ตัวอักษร` : `${length} ตัวอักษร`} · ห้ามคัดลอกข้อความตัวอย่างตรง ๆ</p>
          {displayError && <p role="alert" className="flex items-start gap-1.5 text-callout text-risk"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{displayError}</p>}
        </div>
        <button type="submit" disabled={remaining > 0} className="min-h-[50px] rounded-xl bg-accent px-5 font-medium text-accent-on hover:bg-accent-press disabled:opacity-40">ใช้แนวทางของฉัน</button>
        {onDefer && <button type="button" onClick={onDefer} className="min-h-11 rounded-xl px-4 font-medium text-accent-text hover:bg-surface-2">ยังไม่เลือก คุยต่อก่อน</button>}
      </form>
    </section>
  );
}
