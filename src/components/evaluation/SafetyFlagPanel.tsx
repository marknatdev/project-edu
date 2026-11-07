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
      <div className="rounded-3xl border border-good/30 bg-good-tint p-4 sm:p-5 shadow-e1 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-good-tint flex items-center justify-center shrink-0 border border-good/30">
          <CheckCircle2 className="w-5 h-5 text-good" />
        </div>
        <div>
          <h4 className="text-callout font-bold text-good">
            ไม่พบธงความปลอดภัยจากคำที่ตรวจเบื้องต้น
          </h4>
          <p className="text-caption text-good mt-0.5">
            การไม่พบคำเสี่ยงไม่ใช่การรับรองความปลอดภัย ให้ครูทบทวนแผนและข้อกำหนดก่อนลงมือจริง
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-caution/30 bg-caution-tint p-4 sm:p-6 shadow-e1 space-y-4">
      {/* Panel Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-caution-tint flex items-center justify-center shrink-0 border border-caution/30">
          <ShieldAlert className="w-5 h-5 text-caution" />
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-caution-tint text-caution text-caption font-bold">
            <span>คำเตือนความปลอดภัย (SRC/ISEF Advisory)</span>
            <span>• ไม่ปิดกั้น (Non-blocking)</span>
          </div>
          <h3 className="text-callout sm:text-body font-semibold text-caution">
            พบประเด็นที่ต้องขออนุมัติล่วงหน้าหรือระมัดระวังเป็นพิเศษ
          </h3>
          <p className="text-caption text-caution leading-relaxed">
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
              className="p-3.5 rounded-2xl bg-surface border border-caution/30 text-caption sm:text-callout space-y-1.5 shadow-e1"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-ink">
                  {categoryName}
                </span>
                {flag.requiresPreApproval && (
                  <span className="px-2 py-0.5 rounded-md bg-risk-tint text-risk text-caption font-bold">
                    ให้ครูตรวจการกำกับดูแลและข้อกำหนดอนุมัติ
                  </span>
                )}
              </div>

              {flag.reasonTh && (
                <p className="text-caption text-ink-2">
                  <strong className="text-ink">เหตุผลที่ตรวจพบ: </strong>
                  {flag.reasonTh}
                </p>
              )}

              {flag.matchedTerms && flag.matchedTerms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-caption text-ink-3">
                  <span>คำที่ตรวจพบ:</span>
                  {flag.matchedTerms.map((term, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-1.5 py-0.2 rounded bg-caution-tint text-caution font-mono text-caption"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              {flag.advisoryTh && (
                <div className="flex items-start gap-1.5 p-2 rounded-xl bg-caution-tint text-caption text-caution">
                  <Info className="w-3.5 h-3.5 text-caution shrink-0 mt-0.5" />
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
