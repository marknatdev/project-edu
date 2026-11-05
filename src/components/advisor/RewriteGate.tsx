'use client';

import React, { useState } from 'react';
import { PenTool, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { isRewriteAcceptable } from '@/lib/advisor/chat-reducer';

export interface RewriteGateProps {
  exampleText: string;
  onSubmitRewrite: (rewrittenText: string) => void;
  error?: string | null;
}

export function RewriteGate({
  exampleText,
  onSubmitRewrite,
  error: externalError,
}: RewriteGateProps) {
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = isRewriteAcceptable(exampleText, text);
    if (!check.acceptable) {
      setLocalError(check.reasonTh ?? 'ข้อความยังไม่ผ่านเกณฑ์');
      return;
    }
    setLocalError(null);
    onSubmitRewrite(text.trim());
  };

  const currentLength = text.trim().length;
  const isTooShort = currentLength < 15;
  const displayError = localError || externalError;

  return (
    <div className="bg-rose-50/80 border-2 border-rose-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
      {/* Gate Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 border border-rose-200">
          <PenTool className="w-5 h-5 text-rose-600" />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold font-prompt">
            <span>🆘 ด่านเรียบเรียงไอเดีย (Tier 3 Rewrite Gate)</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-prompt">
            เรียบเรียงแนวคิดด้วยสำนวนของคุณเอง
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-prompt leading-relaxed">
            ตามหลักการ Socratic AI (ADR 0002) AI ไม่สามารถคิดหรือเขียนโครงงานแทนนักเรียนได้
            กรุณานำตัวอย่างไปคิดต่อยอดและเขียนอธิบายด้วยภาษาของคุณเองก่อนไปต่อครับ
          </p>
        </div>
      </div>

      {/* Example Box */}
      <div className="p-3.5 rounded-2xl bg-white border border-rose-200/80 space-y-1.5">
        <span className="text-[11px] font-bold text-rose-700 font-prompt">
          📌 ตัวอย่างแนวทางตั้งต้นจากครูที่ปรึกษา:
        </span>
        <p className="text-xs sm:text-sm text-slate-800 font-prompt italic font-medium">
          &ldquo;{exampleText}&rdquo;
        </p>
      </div>

      {/* Student Rewrite Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="student-rewrite"
            className="block text-xs font-bold text-slate-700 font-prompt mb-1.5"
          >
            เขียนแนวคิดในมุมมองของคุณ (ขั้นต่ำ 15 ตัวอักษร และห้ามคัดลอกตรงๆ):
          </label>
          <textarea
            id="student-rewrite"
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (localError) setLocalError(null);
            }}
            placeholder="ตัวอย่าง: กลุ่มเราจะนำแนวคิดนี้ไปปรับใช้โดย..."
            className="w-full p-3.5 rounded-2xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm font-prompt text-slate-800 placeholder:text-slate-400 resize-none transition-all outline-none"
          />
          <div className="flex items-center justify-between mt-1 text-[11px] font-prompt text-slate-500">
            <span>
              {isTooShort ? (
                <span className="text-amber-600">
                  ต้องเขียนอีกอย่างน้อย {Math.max(0, 15 - currentLength)} ตัวอักษร
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> ความยาวผ่านเกณฑ์
                </span>
              )}
            </span>
            <span>{currentLength} ตัวอักษร</span>
          </div>
        </div>

        {/* Error message */}
        {displayError && (
          <div className="p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs font-prompt flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isTooShort}
          className={`w-full min-h-[44px] px-4 py-2.5 rounded-2xl font-bold font-prompt text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
            isTooShort
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 active:scale-[0.99]'
          }`}
        >
          <span>ยืนยันแนวทางของฉัน →</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
