'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Lightbulb,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { getInterview } from '@/lib/storage/store';
import type { Interview } from '@/types/domain';

export default function HomePage() {
  const [interview, setInterview] = useState<Interview | null>(null);

  useEffect(() => {
    setInterview(getInterview());
  }, []);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero Card */}
        <div className="bg-white/85 backdrop-blur-md border border-indigo-500/20 shadow-sm rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="space-y-4">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Project Edu
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                ม.ต้น & ม.ปลาย
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Zero-PII Guest Mode
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-prompt">
              ผู้ช่วยเริ่มต้นโครงงาน ม.ต้น และ ม.ปลาย
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-prompt">
              เปลี่ยนความสงสัยรอบตัวให้เป็นหัวข้อโครงงานที่จับต้องได้ พร้อมรับคำแนะนำแบบ Socratic จากครูที่ปรึกษา AI
              และวิเคราะห์ความเป็นไปได้ตามข้อจำกัดจริงของผู้เรียน
            </p>
          </div>

          {/* Primary Action Banner */}
          {interview ? (
            <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-sm text-indigo-950 font-prompt">
                    คุณบันทึกข้อมูลการสัมภาษณ์ไว้แล้ว
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900 text-xs font-semibold">
                  {interview.gradeLevel === 'm_ton' ? 'ม.ต้น' : 'ม.ปลาย'} • {interview.goal.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed font-prompt">
                เวลา {interview.constraints.timeWeeks} สัปดาห์ • งบ {interview.constraints.budgetBaht.toLocaleString('th-TH')} บาท • {interview.constraints.teamSize} คน
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={interview.selectedTrack === 'idea_track' ? '/idea' : '/discovery'}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs sm:text-sm hover:bg-indigo-700 transition shadow-2xs flex items-center gap-1.5 min-h-[40px]"
                >
                  <span>เข้าสู่ {interview.selectedTrack === 'idea_track' ? 'Idea Track' : 'Discovery Track'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/interview"
                  className="px-3.5 py-2 rounded-xl border border-indigo-300 text-indigo-800 font-medium text-xs hover:bg-indigo-100/60 transition flex items-center gap-1 min-h-[40px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ปรับแก้แบบสัมภาษณ์</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Link
                href="/interview"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base shadow-md shadow-indigo-200 transition min-h-[48px] w-full sm:w-auto"
              >
                <Sparkles className="w-5 h-5" />
                <span>เริ่มต้นทำแบบสัมภาษณ์โครงงาน (4 ขั้นตอน)</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Track selection cards overview (A+B Neo-Pop & Glass) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Link
              href="/discovery"
              className="p-5 rounded-2xl bg-white/70 border border-indigo-100 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3 group min-h-[140px]"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg mb-3 shadow">
                  <Compass className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-800 mb-1 font-prompt group-hover:text-indigo-600 transition">
                  1. เส้นทางค้นหา (Discovery Track)
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed font-prompt">
                  สำหรับผู้เรียนที่ยังไม่มีหัวข้อ คุยสั้น ๆ เรื่องที่สนใจ ให้ AI สร้างการ์ดไอเดียตั้งต้นครั้งละ 5 ใบ ปัดการ์ด และจัด Shortlist เปรียบเทียบ
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-indigo-600 gap-1 pt-1">
                <span>เริ่มสำรวจการ์ด</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            <Link
              href="/idea"
              className="p-5 rounded-2xl bg-white/70 border border-pink-100 shadow-xs hover:border-pink-300 transition-all flex flex-col justify-between space-y-3 group min-h-[140px]"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold text-lg mb-3 shadow">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-800 mb-1 font-prompt group-hover:text-pink-600 transition">
                  2. เส้นทางมีไอเดีย (Idea Track)
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed font-prompt">
                  สำหรับผู้เรียนที่มีไอเดียในใจแล้ว เล่ารายละเอียดให้ครูที่ปรึกษา AI ช่วยถามเจาะลึก 4 ด้าน และประเมิน 5 แกน
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-pink-600 gap-1 pt-1">
                <span>พัฒนาไอเดียกับ AI</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>

          {/* Privacy & Zero-PII Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>การคุ้มครองข้อมูลเยาวชน (Zero-PII & Local-First)</span>
              </span>
              <Link
                href="/consent"
                className="text-indigo-600 hover:underline font-semibold"
              >
                ดูนโยบาย PDPA
              </Link>
            </div>
            <p className="leading-relaxed font-prompt">
              ระบบไม่เก็บชื่อจริง โรงเรียน หรือข้อมูลติดต่อใด ๆ ทั้งหมดจัดเก็บในเบราว์เซอร์ของอุปกรณ์นี้ และคุณสามารถกดลบข้อมูลทั้งหมดได้ตลอดเวลา
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
