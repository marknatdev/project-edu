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
      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center space-y-2 shadow-xs">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-700 font-prompt">
          ยังไม่พบผลงานอ้างอิงที่ตรงกันโดยตรงในคลังข้อมูล
        </h4>
        <p className="text-xs text-slate-500 font-prompt max-w-md mx-auto">
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
          <h3 className="text-base sm:text-lg font-bold text-slate-900 font-prompt flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>งานวิจัยและโครงงานเดิมที่ใกล้เคียง (Verified Prior Work)</span>
          </h3>
          <p className="text-xs text-slate-500 font-prompt mt-0.5">
            คัดสรรจากฐานข้อมูลโครงงานประกวดจริงและวารสารวิจัยไทย • มีลิงก์ตรวจสอบได้ทุกชิ้น
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold font-prompt border border-indigo-100">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{priorWork.length} ผลงาน</span>
        </span>
      </div>

      {/* Card List (Mobile-First, no table overflow) */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {priorWork.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-all"
          >
            {/* Top row: Venue badge and Year */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 text-[11px] font-bold font-prompt">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>{item.competitionOrVenue}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono font-medium">
                ปี {item.year}
              </span>
            </div>

            {/* Title */}
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 font-prompt leading-snug">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 font-prompt mt-1">
                <strong>คณะผู้จัดทำ:</strong> {item.authors}
              </p>
            </div>

            {/* Summary & Difference */}
            <div className="space-y-1.5 text-xs sm:text-sm font-prompt bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-slate-700 leading-relaxed">
                <strong className="text-slate-900">สรุปผลงาน: </strong>
                {item.summary}
              </p>
              {item.difference && (
                <p className="text-indigo-900 leading-relaxed pt-1 border-t border-slate-200/60">
                  <strong className="text-indigo-950">จุดที่โครงงานนี้พัฒนาต่อ/แตกต่าง: </strong>
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
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold font-prompt text-xs sm:text-sm border border-slate-200 hover:border-indigo-200 transition-all w-full sm:w-auto"
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
