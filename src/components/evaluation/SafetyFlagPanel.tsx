'use client';

import React from 'react';
import { ShieldAlert, Info, CheckCircle2 } from 'lucide-react';
import type { SafetyFlag } from '@/types/domain';

export interface SafetyFlagPanelProps {
  safetyFlags: SafetyFlag[];
}

const CATEGORY_NAMES_TH: Record<string, string> = {
  biological_agents: 'เชื้อจุลินทรีย์ / สารชีวภาพ (Biological Agents)',
  hazardous_chemicals: 'สารเคมีอันตราย / วัตถุไวไฟ (Hazardous Chemicals)',
  human_subjects: 'อาสาสมัครมนุษย์ (Human Subjects)',
  vertebrate_animals: 'สัตว์มีกระดูกสันหลัง (Vertebrate Animals)',
  high_voltage_radiation: 'ไฟฟ้าแรงสูง / รังสี / เลเซอร์ (High Voltage & Radiation)',
};

export function SafetyFlagPanel({ safetyFlags }: SafetyFlagPanelProps) {
  const flaggedItems = safetyFlags.filter((f) => f.flagged);

  if (flaggedItems.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-900 font-prompt">
            ไม่พบธงความปลอดภัยจากคำที่ตรวจเบื้องต้น
          </h4>
          <p className="text-xs text-emerald-700 font-prompt mt-0.5">
            การไม่พบคำเสี่ยงไม่ใช่การรับรองความปลอดภัย ให้ครูทบทวนแผนและข้อกำหนดก่อนลงมือจริง
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/90 p-4 sm:p-6 shadow-xs space-y-4">
      {/* Panel Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold font-prompt">
            <span>⚠️ คำเตือนความปลอดภัย (SRC/ISEF Advisory)</span>
            <span>• ไม่ปิดกั้น (Non-blocking)</span>
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-amber-950 font-prompt">
            พบประเด็นที่ต้องขออนุมัติล่วงหน้าหรือระมัดระวังเป็นพิเศษ
          </h3>
          <p className="text-xs text-amber-800 font-prompt leading-relaxed">
            ระบบตรวจพบเนื้อหาที่อาจต้องผ่านการอนุมัติจากคณะกรรมการความปลอดภัยทางวิทยาศาสตร์ (SRC) ก่อนเริ่มทดลองจริง ทั้งนี้ข้อแนะนำนี้<strong>ไม่ปิดกั้นการร่างข้อเสนอโครงงาน</strong>
          </p>
        </div>
      </div>

      {/* Flagged Category List */}
      <div className="space-y-2.5 pt-1">
        {flaggedItems.map((flag, idx) => {
          const categoryName =
            CATEGORY_NAMES_TH[flag.category] || flag.category;

          return (
            <div
              key={`${flag.category}_${idx}`}
              className="p-3.5 rounded-2xl bg-white/80 border border-amber-200 text-xs sm:text-sm font-prompt space-y-1.5 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-slate-900">
                  {categoryName}
                </span>
                {flag.requiresPreApproval && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                    ให้ครูตรวจการกำกับดูแลและข้อกำหนดอนุมัติ
                  </span>
                )}
              </div>

              {flag.reasonTh && (
                <p className="text-xs text-slate-700">
                  <strong className="text-slate-900">เหตุผลที่ตรวจพบ: </strong>
                  {flag.reasonTh}
                </p>
              )}

              {flag.matchedTerms && flag.matchedTerms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                  <span>คำที่ตรวจพบ:</span>
                  {flag.matchedTerms.map((term, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono text-[10px]"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              {flag.advisoryTh && (
                <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50 text-[11px] text-amber-800">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>{flag.advisoryTh}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
