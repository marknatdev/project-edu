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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitted) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-6 shadow-e3 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-separator">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-caution-tint text-caution flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </div>
            <h3 id="report-dialog-title" className="text-body font-bold text-ink">
              รายงานปัญหาการ์ดหัวข้อ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitted}
            className="p-1.5 rounded-full text-ink-3 hover:text-ink-2 hover:bg-surface-2 transition-colors"
            aria-label="ปิดหน้าต่างรายงาน"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-good mx-auto animate-bounce" />
            <div className="text-body font-bold text-ink">
              ขอบคุณสำหรับการรายงาน
            </div>
            <p className="text-caption text-ink-3 leading-relaxed">
              เราได้บันทึกความคิดเห็นและจะนำไปปรับปรุงคุณภาพการ์ดหัวข้อต่อไป
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-surface-2 rounded-2xl p-3 border border-separator">
              <div className="text-caption font-semibold text-ink-3 uppercase tracking-wider">
                การ์ดที่รายงาน
              </div>
              <div className="font-bold text-callout text-ink line-clamp-1 mt-0.5">
                {card.title}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-caption font-bold text-ink-2">
                กรุณาระบุเหตุผลที่ต้องการรายงาน
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-caption cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'border-accent bg-accent-tint font-semibold text-accent-text'
                        : 'border-separator text-ink-2 hover:bg-surface-2'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-accent-text focus:ring-accent w-4 h-4"
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
                className="flex-1 min-h-11 px-4 py-2 rounded-xl border border-separator text-ink-2 text-caption font-semibold hover:bg-surface-2"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 min-h-11 px-4 py-2 rounded-xl bg-caution hover:bg-caution text-white text-caption font-bold shadow-e1"
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
