'use client';

import React, { useState } from 'react';
import { Flag, X, CheckCircle } from 'lucide-react';
import type { TopicCard } from '@/types/domain';

export interface ReportCardModalProps {
  card: TopicCard | null;
  isOpen: boolean;
  onClose: () => void;
  onReport: (cardId: string, reason: string) => void;
}

const REPORT_REASONS = [
  'อุปกรณ์หาไม่ได้จริง / ราคาสูงเกินไป',
  'มีข้อกังวลด้านความปลอดภัยหรือสารอันตราย',
  'เนื้อหาไม่ชัดเจนหรือไม่เหมาะกับระดับชั้น',
  'การทดลองซ้ำซ้อนกับสิ่งที่รู้กันอยู่แล้วทั่วไป',
  'อื่นๆ (แจ้งปัญหาทั่วไป)',
];

export function ReportCardModal({
  card,
  isOpen,
  onClose,
  onReport,
}: ReportCardModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || !card) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReport(card.id, selectedReason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitted) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <h3 id="report-dialog-title" className="text-base font-bold text-slate-900 font-prompt">
              รายงานปัญหาการ์ดหัวข้อ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitted}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="ปิดหน้าต่างรายงาน"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <div className="text-base font-bold text-slate-800 font-prompt">
              ขอบคุณสำหรับการรายงาน
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              เราได้บันทึกความคิดเห็นและจะนำไปปรับปรุงคุณภาพการ์ดหัวข้อต่อไป
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                การ์ดที่รายงาน
              </div>
              <div className="font-bold text-sm text-slate-800 line-clamp-1 mt-0.5">
                {card.title}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 font-prompt">
                กรุณาระบุเหตุผลที่ต้องการรายงาน
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'border-indigo-500 bg-indigo-50/60 font-semibold text-indigo-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
              >
                ยืนยันการรายงาน
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
