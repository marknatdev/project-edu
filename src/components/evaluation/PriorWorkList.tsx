'use client';

import React from 'react';
import { BookOpen, ExternalLink, Award, CheckCircle } from 'lucide-react';
import type { VerifiedPriorWork } from '@/types/domain';

export interface PriorWorkListProps {
  priorWork: VerifiedPriorWork[];
}

export function PriorWorkList({ priorWork }: PriorWorkListProps) {
  if (priorWork.length === 0) {
    return (
      <div className="rounded-3xl border border-separator bg-surface p-5 text-center space-y-2 shadow-e1">
        <BookOpen className="w-8 h-8 text-ink-3 mx-auto" />
        <h4 className="text-callout font-bold text-ink-2">
          ยังไม่พบผลงานอ้างอิงที่ตรงกันโดยตรงในคลังข้อมูล
        </h4>
        <p className="text-caption text-ink-3 max-w-md mx-auto">
          ระบบคัดเลือกเฉพาะโครงงานจริงจากเวทีประกวดไทย (YSC, NSC, ISEF) และวารสารวิจัย ThaiJO ที่มี URL ตรวจสอบได้เท่านั้น ห้าม AI แต่งอ้างอิงเองเด็ดขาด
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Note */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-text" />
            <span>งานวิจัยและโครงงานเดิมที่ใกล้เคียง (Verified Prior Work)</span>
          </h3>
          <p className="text-caption text-ink-3 mt-0.5">
            คัดสรรจากฐานข้อมูลโครงงานประกวดจริงและวารสารวิจัยไทย • มีลิงก์ตรวจสอบได้ทุกชิ้น
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-tint text-accent-text text-caption font-bold border border-accent/30">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{priorWork.length} ผลงาน</span>
        </span>
      </div>

      {/* Card List (Mobile-First, no table overflow) */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {priorWork.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-separator bg-surface p-4 sm:p-5 shadow-e1 space-y-3 hover:border-accent/30 transition-all"
          >
            {/* Top row: Venue badge and Year */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-tint border border-accent/30 text-accent-text text-caption font-bold">
                <Award className="w-3.5 h-3.5 text-accent-text" />
                <span>{item.competitionOrVenue}</span>
              </div>
              <span className="text-caption text-ink-3 font-mono font-medium">
                ปี {item.year}
              </span>
            </div>

            {/* Title */}
            <div>
              <h4 className="text-callout sm:text-base font-bold text-ink leading-snug">
                {item.title}
              </h4>
              <p className="text-caption text-ink-3 mt-1">
                <strong>คณะผู้จัดทำ:</strong> {item.authors}
              </p>
            </div>

            {/* Summary & Difference */}
            <div className="space-y-1.5 text-caption sm:text-callout bg-surface-2 p-3 rounded-2xl border border-separator">
              <p className="text-ink-2 leading-relaxed">
                <strong className="text-ink">สรุปผลงาน: </strong>
                {item.summary}
              </p>
              {item.difference && (
                <p className="text-accent-text leading-relaxed pt-1 border-t border-separator">
                  <strong className="text-ink">จุดที่โครงงานนี้พัฒนาต่อ/แตกต่าง: </strong>
                  {item.difference}
                </p>
              )}
            </div>

            {/* External Link Button (>= 40px touch target) */}
            <div className="pt-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-surface-2 hover:bg-accent-tint text-ink-2 hover:text-accent-text font-bold text-caption sm:text-callout border border-separator hover:border-accent/30 transition-all w-full sm:w-auto"
                aria-label={`เปิดอ่านผลงาน ${item.title} บนหน้าเว็บต้นทาง`}
              >
                <span>เปิดดูหลักฐานผลงานต้นฉบับ (Verifiable URL)</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
