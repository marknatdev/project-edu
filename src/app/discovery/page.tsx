'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Sparkles, GraduationCap } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { getInterview } from '@/lib/storage/store';
import type { Interview } from '@/types/domain';

export default function DiscoveryPage() {
  const [interview, setInterview] = useState<Interview | null>(null);

  useEffect(() => {
    setInterview(getInterview());
  }, []);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white/85 backdrop-blur-md border border-indigo-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>Discovery Track</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-prompt">
            เส้นทางค้นหาหัวข้อ (Discovery Track)
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-prompt">
            ค้นหาหัวข้อโครงงานที่ใช่สำหรับคุณผ่าน Topic Cards 90 ใบ พร้อมคำนวณ Fit Score ตามข้อจำกัดจริงของผู้เรียน
          </p>
        </div>

        {interview ? (
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-800 font-prompt">
                ข้อมูลการสัมภาษณ์ของผู้เรียน
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                {interview.gradeLevel === 'm_ton' ? 'มัธยมศึกษาตอนต้น' : 'มัธยมศึกษาตอนปลาย'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">เป้าหมาย</div>
                <div className="font-bold text-slate-800 pt-0.5 uppercase">{interview.goal}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">เวลาที่มี</div>
                <div className="font-bold text-slate-800 pt-0.5">{interview.constraints.timeWeeks} สัปดาห์</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">งบประมาณ</div>
                <div className="font-bold text-slate-800 pt-0.5">{interview.constraints.budgetBaht.toLocaleString('th-TH')} บาท</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-medium">จำนวนสมาชิก</div>
                <div className="font-bold text-slate-800 pt-0.5">{interview.constraints.teamSize} คน</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 text-indigo-950 text-xs sm:text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold font-prompt text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>พร้อมเข้าสู่การปัดการ์ดหัวข้อ (Swipe Deck & Shortlist)</span>
              </div>
              <p className="text-xs text-indigo-800/90 leading-relaxed font-prompt">
                ระบบจัดเตรียมชุดการ์ด 90 ใบ และตัวคำนวณ Fit Score เรียบร้อยแล้ว (จะเปิดระบบ Swipe Deck แบบเต็มใน Milestone 3.2)
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md border border-amber-200 rounded-3xl p-6 text-center space-y-4">
            <p className="text-sm text-slate-600 font-prompt">
              คุณยังไม่ได้ทำแบบสัมภาษณ์ กรุณาทำแบบสัมภาษณ์เพื่อกำหนดระดับชั้นและข้อจำกัดก่อนเริ่มต้นค้นหาการ์ดหัวข้อ
            </p>
            <Link
              href="/interview"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs sm:text-sm hover:bg-indigo-700 min-h-[44px]"
            >
              <GraduationCap className="w-4 h-4" />
              <span>เริ่มทำแบบสัมภาษณ์</span>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
