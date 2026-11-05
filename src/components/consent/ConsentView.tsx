'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  CloudOff,
  UserX,
} from 'lucide-react';
import {
  getConsent,
  saveConsent,
  wipeAllLearnerData,
  type PdpaConsent,
} from '@/lib/storage/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export function ConsentView() {
  const [consent, setConsentState] = useState<PdpaConsent>({
    accepted: false,
    acceptedAt: null,
  });
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    setConsentState(getConsent());
    setSupabaseReady(isSupabaseConfigured());
  }, []);

  const handleAcceptConsent = () => {
    const updated: PdpaConsent = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
    };
    saveConsent(updated);
    setConsentState(updated);
    setAcceptSuccess(true);
    setTimeout(() => setAcceptSuccess(false), 3000);
  };

  const handleConfirmWipe = () => {
    wipeAllLearnerData();
    setConsentState({ accepted: false, acceptedAt: null });
    setShowWipeModal(false);
    setWipeSuccess(true);
    setTimeout(() => {
      setWipeSuccess(false);
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title & Badge */}
      <div className="bg-white/85 backdrop-blur-md border border-indigo-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Zero-PII Privacy Protection</span>
          </span>
          {consent.accepted ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ยินยอมแล้ว</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>รอการยินยอม</span>
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-prompt">
          ความยินยอมและการคุ้มครองข้อมูลเยาวชน (PDPA)
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-prompt">
          Project Edu ยึดมั่นในหลักการ <strong>Zero-PII (Zero Personally Identifiable Information)</strong> เพื่อคุ้มครองความเป็นส่วนตัวของนักเรียน ม.ต้น และ ม.ปลาย อย่างเคร่งครัด
        </p>
      </div>

      {/* 3 Core Principles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/80 border border-indigo-50 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm font-prompt">
            ไม่เก็บข้อมูลส่วนบุคคล
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-prompt">
            ระบบไม่มีการถามหรือบันทึกชื่อ-นามสกุลจริง โรงเรียน เลขบัตร หรือเบอร์โทรศัพท์เด็ดขาด
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 border border-pink-50 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm font-prompt">
            เก็บข้อมูลในเครื่องคุณ (Local-First)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-prompt">
            ประวัติการสัมภาษณ์ ไอเดีย และการประเมินจะถูกจัดเก็บใน Local Storage ของอุปกรณ์เครื่องนี้
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 border border-emerald-50 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm font-prompt">
            สิทธิ์ควบคุมเป็นของคุณ 100%
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-prompt">
            คุณสามารถล้างและลบข้อมูลโครงงานทั้งหมดออกจากอุปกรณ์ได้ในคลิกเดียวตลอดเวลา
          </p>
        </div>
      </div>

      {/* Comparison: Guest Mode vs Google OAuth */}
      <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 font-prompt">
          เปรียบเทียบโหมดการใช้งาน: Guest Mode vs Google Sign-In
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guest Mode Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border-2 border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 text-sm">
                1. โหมด Guest (แนะนำสำหรับทุกคน)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                พร้อมใช้งานทันที
              </span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside font-prompt leading-relaxed">
              <li>ไม่ต้องสมัครสมาชิกและไม่ต้องผูกอีเมลใด ๆ</li>
              <li>ข้อมูลการสัมภาษณ์และการปัดการ์ดบันทึกในอุปกรณ์นี้</li>
              <li>หากล้างแคชหรือประวัติเบราว์เซอร์ ข้อมูลจะถูกลบออก</li>
              <li>ใช้งาน Socratic Coach และประเมินโครงงานได้ตามโควตารายวัน</li>
            </ul>
          </div>

          {/* Google Sign In Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">
                2. บัญชี Google (ตัวเลือกเสริม)
              </span>
              {supabaseReady ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold">
                  เปิดใช้งานแล้ว
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-medium flex items-center gap-1">
                  <CloudOff className="w-3 h-3" />
                  <span>ยังไม่เปิดให้บริการ</span>
                </span>
              )}
            </div>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside font-prompt leading-relaxed">
              <li>ใช้สำหรับบันทึกผลงานข้ามอุปกรณ์เมื่อระบบคลาวด์พร้อมให้บริการ</li>
              <li>ระบบจะแปลงเป็นรหัสนิรนาม (Anonymous ID) โดยไม่นำชื่อหรืออีเมลไปเปิดเผย</li>
              <li>
                {!supabaseReady &&
                  'ปัจจุบันสภาพแวดล้อมนี้ยังไม่ได้ตั้งค่าคลาวด์ ท่านจึงสามารถใช้งานต่อในโหมด Guest ได้อย่างเต็มรูปแบบ'}
              </li>
            </ul>
          </div>
        </div>

        {/* Consent Action Box */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-prompt">
            {consent.accepted
              ? `คุณได้ให้ความยินยอมเมื่อ ${new Date(
                  consent.acceptedAt ?? ''
                ).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'โปรดยืนยันความยินยอมก่อนเริ่มทำแบบสัมภาษณ์'}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleAcceptConsent}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition shadow-sm min-h-[44px] flex items-center justify-center gap-2 ${
                consent.accepted
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{consent.accepted ? 'ยินยอมเรียบร้อยแล้ว' : 'ฉันยินยอมและยอมรับเงื่อนไข'}</span>
            </button>
          </div>
        </div>

        {acceptSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>บันทึกความยินยอมเรียบร้อยแล้ว คุณสามารถเริ่มทำแบบสัมภาษณ์ได้ทันที</span>
          </div>
        )}
      </div>

      {/* Delete all data (Data Wipe Section) */}
      <div className="bg-white/85 backdrop-blur-md border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-600">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <h2 className="text-lg font-bold font-prompt">
            การจัดการข้อมูลส่วนตัว (Data Erasure)
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed font-prompt">
          ตามมาตรฐาน PDPA ท่านมีสิทธิ์ในการลบข้อมูลทั้งหมดที่เคยบันทึกไว้ในอุปกรณ์นี้ได้ทันที เมื่อกดปุ่มด้านล่าง ข้อมูลทั้งหมดรวมถึงประวัติการสัมภาษณ์ การปัดการ์ด และไอเดียจะถูกทำลายทิ้งอย่างถาวร
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowWipeModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition min-h-[44px] flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>ลบข้อมูลทั้งหมดของฉัน (Wipe All My Data)</span>
          </button>
        </div>
      </div>

      {/* Quick link to Interview if consented */}
      {consent.accepted && (
        <div className="flex justify-end pt-2">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition min-h-[44px]"
          >
            <span>ไปที่แบบสัมภาษณ์โครงงาน</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-slate-900 text-lg font-prompt">
                คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-prompt">
                ข้อมูลโครงงาน ประวัติการปัดการ์ด การประเมิน และการตั้งค่าความยินยอมทั้งหมดในเบราว์เซอร์นี้จะถูกล้างทิ้งทันที และไม่สามารถกู้คืนได้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 min-h-[44px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-xs sm:text-sm hover:bg-rose-700 shadow-sm min-h-[44px]"
              >
                ยืนยันการลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success notification */}
      {wipeSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>ลบข้อมูลทั้งหมดออกจากอุปกรณ์เรียบร้อยแล้ว</span>
        </div>
      )}
    </div>
  );
}
