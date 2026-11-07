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
  type PdpaConsent,
} from '@/lib/storage/store';
import { wipeLearnerDataWithCoaching } from '@/lib/advisor/privacy-client';
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

  const handleConfirmWipe = async () => {
    try { await wipeLearnerDataWithCoaching(); }
    catch { window.alert('ยังลบบทสนทนาบนเซิร์ฟเวอร์ไม่ได้ ข้อมูลในเครื่องยังอยู่ กรุณาเชื่อมต่อแล้วลองใหม่'); return; }
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
      <div className="bg-surface backdrop-blur-md border border-accent/30 rounded-3xl p-6 sm:p-8 shadow-e1 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-tint border border-accent/30 text-caption font-semibold text-accent-text">
            <ShieldCheck className="w-4 h-4 text-accent-text" />
            <span>เก็บข้อมูลเท่าที่จำเป็น</span>
          </span>
          {consent.accepted ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-good-tint border border-good/30 text-caption font-semibold text-good">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ยินยอมแล้ว</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-caution-tint border border-caution/30 text-caption font-semibold text-caution">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>รอการยินยอม</span>
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">
          ความยินยอมและการคุ้มครองข้อมูลเยาวชน (PDPA)
        </h1>
        <p className="text-callout sm:text-base text-ink-2 leading-relaxed">
          โปรไฟล์โครงงานไม่ถามชื่อจริงหรือโรงเรียน ต้องเข้าสู่ระบบด้วย Google ก่อนใช้งาน ซึ่ง Google และ Supabase Auth จะประมวลผลข้อมูลบัญชีตามรายละเอียดด้านล่าง
        </p>
      </div>

      {/* 3 Core Principles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-accent/30 shadow-e1 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-accent-tint text-accent-text flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-ink text-callout">
            โปรไฟล์ไม่ถามชื่อจริงหรือโรงเรียน
          </h3>
          <p className="text-caption text-ink-2 leading-relaxed">
            ไม่ขอชื่อจริง โรงเรียน เลขบัตร หรือเบอร์โทรในข้อมูลโครงงาน โปรดไม่พิมพ์ข้อมูลส่วนตัวลงคำตอบหรือข้อความที่ส่งให้ AI
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-accent/30 shadow-e1 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-accent-tint text-accent-text flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-ink text-callout">
            เก็บข้อมูลในเครื่องคุณ (Local-First)
          </h3>
          <p className="text-caption text-ink-2 leading-relaxed">
            การสัมภาษณ์ ไอเดีย และการประเมินเก็บในอุปกรณ์ ส่วนบทสนทนาชวนคิดและการ์ดที่ใช้คุยจะเก็บบนเซิร์ฟเวอร์ด้วยคุกกี้รหัสนิรนาม เพื่อกลับมาคุยต่อหลังรีสตาร์ตได้ โปรดไม่พิมพ์ชื่อจริง โรงเรียน หรือข้อมูลติดต่อ
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-good/30 shadow-e1 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-good-tint text-good flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-ink text-callout">
            สิทธิ์ควบคุมเป็นของคุณ 100%
          </h3>
          <p className="text-caption text-ink-2 leading-relaxed">
            กดลบข้อมูลเพื่อขอล้างข้อมูลในอุปกรณ์และบทสนทนาบนเซิร์ฟเวอร์ ต้องออนไลน์เพื่อยืนยันการลบ ถ้าเชื่อมต่อไม่ได้จะแจ้งให้ลองใหม่ ไม่อ้างว่าลบสำเร็จ
          </p>
        </div>
      </div>

      {/* Account (ADR 0003: Google sign-in is required before using the app) */}
      <div className="bg-surface backdrop-blur-md border border-separator rounded-3xl p-6 sm:p-8 shadow-e1 space-y-6">
        <h2 className="text-lg font-bold text-ink">
          บัญชีที่ใช้งาน
        </h2>

        <div className="grid grid-cols-1 gap-4">
          <div className="p-5 rounded-2xl bg-surface-2 border border-separator space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink text-callout">
                บัญชี Google (จำเป็นก่อนใช้งาน)
              </span>
              {supabaseReady ? (
                <span className="px-2 py-0.5 rounded-full bg-accent-tint text-accent-text text-caption font-semibold">
                  ตั้งค่าจุดเชื่อมต่อแล้ว
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-separator text-ink-2 text-caption font-medium flex items-center gap-1">
                  <CloudOff className="w-3 h-3" />
                  <span>ยังไม่เปิดให้บริการ</span>
                </span>
              )}
            </div>
            <ul className="text-caption text-ink-2 space-y-2 list-disc list-inside leading-relaxed">
              <li>ต้องเข้าสู่ระบบด้วย Google ก่อนใช้งานทุกหน้า ยกเว้นหน้านี้และลิงก์อ่านอย่างเดียว ข้อมูลการสัมภาษณ์และการปัดการ์ดยังบันทึกในอุปกรณ์นี้ และยังไม่ซิงค์โครงงานข้ามอุปกรณ์</li>
              <li>Google และ Supabase Auth ประมวลผลชื่อ อีเมล และข้อมูลยืนยันบัญชีเพื่อการลงชื่อเข้าใช้ ไม่ใช่การใช้งานแบบไร้ข้อมูลส่วนบุคคลทั้งหมด</li>
              <li>แอปใช้เพียงรหัสบัญชีที่ตรวจสอบแล้วเพื่อแยกสิทธิ์ ไม่คัดลอกชื่อหรืออีเมลลงข้อมูลโครงงาน บันทึกเหตุการณ์ หรือคำสั่งให้ AI และไม่ขอสิทธิ์ Google Drive หรือ Calendar</li>
              <li>งาน Guest ที่เคยทำก่อนหน้านี้ไม่ถูกย้ายเข้าบัญชี และจะไม่แสดงหลังเข้าสู่ระบบ กดลบข้อมูลด้านล่างเพื่อลบทั้งงานในเครื่องและบทสนทนาเดิมได้</li>
              <li>ล้างแคชจะลบข้อมูลในเครื่อง แต่ไม่ใช่คำขอลบบทสนทนาบนเซิร์ฟเวอร์ ควรกดลบข้อมูลในแอปก่อน</li>
              {!supabaseReady && <li>สภาพแวดล้อมนี้ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ จึงใช้งานแบบไม่ต้องเข้าสู่ระบบได้เฉพาะตอนพัฒนาเท่านั้น</li>}
            </ul>
          </div>
        </div>

        {/* Consent Action Box */}
        <div className="pt-4 border-t border-separator flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-caption text-ink-3">
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
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-callout transition shadow-e1 min-h-[44px] flex items-center justify-center gap-2 ${
                consent.accepted
                  ? 'bg-good text-white hover:bg-good'
                  : 'bg-accent text-white hover:bg-accent-press'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{consent.accepted ? 'ยินยอมเรียบร้อยแล้ว' : 'ฉันยินยอมและยอมรับเงื่อนไข'}</span>
            </button>
          </div>
        </div>

        {acceptSuccess && (
          <div className="p-3 rounded-xl bg-good-tint border border-good/30 text-good text-caption flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-good" />
            <span>บันทึกความยินยอมเรียบร้อยแล้ว คุณสามารถเริ่มทำแบบสัมภาษณ์ได้ทันที</span>
          </div>
        )}
      </div>

      {/* Delete all data (Data Wipe Section) */}
      <div className="bg-surface backdrop-blur-md border border-risk/40 rounded-3xl p-6 sm:p-8 shadow-e1 space-y-4">
        <div className="flex items-center gap-2 text-risk">
          <Trash2 className="w-5 h-5 text-risk" />
          <h2 className="text-lg font-bold">
            การจัดการข้อมูลส่วนตัว (Data Erasure)
          </h2>
        </div>

        <p className="text-callout text-ink-2 leading-relaxed">
          การลบจะขอล้างข้อมูลโครงงานในอุปกรณ์และข้อมูลบทสนทนา/การ์ดที่แอปจัดเก็บสำหรับบัญชีหรือ Guest ในเบราว์เซอร์นี้ (บัญชีจะยังเก็บเฉพาะตัวเลขโควตาที่ใช้ไปของวันนี้ ไม่มีเนื้อหางาน) ต้องออนไลน์และได้รับคำยืนยันจากเซิร์ฟเวอร์ก่อน สำเนาสำรองอยู่ภายใต้นโยบายผู้ให้บริการ การลบนี้ไม่ลบบัญชี Google หรือ Supabase Auth และไม่ถอนสิทธิ์ Google; จัดการการเชื่อมต่อได้ในบัญชี Google ของคุณ
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowWipeModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-risk-tint border border-risk/40 text-risk hover:bg-risk-tint font-semibold text-callout transition min-h-[44px] flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-risk" />
            <span>ลบข้อมูลทั้งหมดของฉัน (Wipe All My Data)</span>
          </button>
        </div>
      </div>

      {/* Quick link to Interview if consented */}
      {consent.accepted && (
        <div className="flex justify-end pt-2">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent hover:bg-accent-press text-white font-bold text-callout shadow-e2 transition min-h-[44px]"
          >
            <span>ไปที่แบบสัมภาษณ์โครงงาน</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-e3 border border-separator space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-risk-tint text-risk flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-ink text-lg">
                คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด?
              </h3>
              <p className="text-caption sm:text-callout text-ink-2 leading-relaxed">
                ข้อมูลโครงงาน ประวัติการปัดการ์ด การประเมิน และการตั้งค่าความยินยอมทั้งหมดในเบราว์เซอร์นี้จะถูกล้างทิ้งทันที และไม่สามารถกู้คืนได้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-separator text-ink-2 font-semibold text-caption sm:text-callout hover:bg-surface-2 min-h-[44px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                className="px-4 py-2.5 rounded-xl bg-risk text-white font-semibold text-caption sm:text-callout hover:bg-risk shadow-e1 min-h-[44px]"
              >
                ยืนยันการลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success notification */}
      {wipeSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-ink text-white px-5 py-3.5 rounded-2xl shadow-e3 flex items-center gap-2 text-callout">
          <CheckCircle2 className="w-4 h-4 text-good" />
          <span>ลบข้อมูลทั้งหมดออกจากอุปกรณ์เรียบร้อยแล้ว</span>
        </div>
      )}
    </div>
  );
}
