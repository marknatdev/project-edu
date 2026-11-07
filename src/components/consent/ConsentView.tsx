'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
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
import { AccountButton } from '@/components/auth/AccountAccess';

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

  const facts = [
    { icon: UserX, title: 'บัญชี Google', text: 'ใช้ยืนยันตัวตนเท่านั้น แอปเก็บเพียงรหัสบัญชี' },
    { icon: Lock, title: 'สิ่งที่เราไม่เก็บ', text: 'ชื่อจริง อีเมล โรงเรียน เลขบัตร หรือเบอร์โทร โปรดอย่าพิมพ์ข้อมูลเหล่านี้ลงในคำตอบ' },
    { icon: Database, title: 'บทสนทนาและไอเดีย', text: 'บทสนทนากับที่ปรึกษาเก็บบนเซิร์ฟเวอร์ด้วยรหัสบัญชีเพื่อคุยต่อได้ ไอเดียและเอกสารเก็บในเบราว์เซอร์ของเครื่องนี้' },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header>
        <h1 className="text-large-title">ความช่วยเหลือ</h1>
        <p className="text-callout text-ink-2">ความเป็นส่วนตัวและข้อมูลของคุณ (PDPA)</p>
      </header>

      <ul className="overflow-hidden rounded-2xl bg-surface shadow-e1">
        {facts.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 border-b border-separator px-4 py-3.5 last:border-b-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-text"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
            <span><span className="block font-medium">{title}</span><span className="block text-callout text-ink-2">{text}</span></span>
          </li>
        ))}
      </ul>

      <details className="rounded-2xl bg-surface p-4 shadow-e1">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between font-medium">
          รายละเอียดการเข้าสู่ระบบและการใช้ข้อมูล
          {supabaseReady
            ? <span className="rounded-full bg-accent-tint px-2 py-0.5 text-caption text-accent-text">เชื่อมต่อแล้ว</span>
            : <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-caption text-ink-2"><CloudOff className="h-3.5 w-3.5" aria-hidden />ยังไม่เปิดให้บริการ</span>}
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-callout text-ink-2">
          <li>ต้องเข้าสู่ระบบด้วย Google ก่อนใช้งานทุกหน้า ยกเว้นหน้านี้และลิงก์อ่านอย่างเดียว ข้อมูลการสัมภาษณ์และการปัดการ์ดยังบันทึกในอุปกรณ์นี้ และยังไม่ซิงค์โครงงานข้ามอุปกรณ์</li>
          <li>Google และ Supabase Auth ประมวลผลชื่อ อีเมล และข้อมูลยืนยันบัญชีเพื่อการลงชื่อเข้าใช้</li>
          <li>แอปไม่คัดลอกชื่อหรืออีเมลลงข้อมูลโครงงาน บันทึกเหตุการณ์ หรือคำสั่งให้ AI และไม่ขอสิทธิ์ Google Drive หรือ Calendar</li>
          <li>งาน Guest ที่เคยทำก่อนหน้านี้ไม่ถูกย้ายเข้าบัญชีและจะไม่แสดงหลังเข้าสู่ระบบ ลบได้ด้วยปุ่มลบข้อมูลด้านล่าง</li>
          <li>ล้างแคชเบราว์เซอร์จะลบข้อมูลในเครื่อง แต่ไม่ลบบทสนทนาบนเซิร์ฟเวอร์ ควรกดลบข้อมูลในแอปก่อน</li>
          {!supabaseReady && <li>สภาพแวดล้อมนี้ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ จึงใช้งานแบบไม่ต้องเข้าสู่ระบบได้เฉพาะตอนพัฒนาเท่านั้น</li>}
        </ul>
      </details>

      <section aria-labelledby="consent-title" className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-e1">
        <h2 id="consent-title" className="font-medium">ความยินยอม</h2>
        <p className="text-callout text-ink-2">
          {consent.accepted
            ? `คุณยินยอมเมื่อ ${new Date(consent.acceptedAt ?? '').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : 'ยินยอมก่อนเริ่มสัมภาษณ์ เพื่อให้แอปบันทึกคำตอบของคุณในเครื่องนี้'}
        </p>
        {consent.accepted
          ? <p className="flex items-center gap-2 text-callout text-good"><CheckCircle2 className="h-4 w-4" aria-hidden />ยินยอมแล้ว</p>
          : <button type="button" onClick={handleAcceptConsent} className="min-h-[50px] rounded-xl bg-accent px-5 font-medium text-accent-on hover:bg-accent-press">ฉันยินยอม</button>}
        {acceptSuccess && <p role="status" className="text-callout text-good">บันทึกความยินยอมแล้ว เริ่มสัมภาษณ์ได้ทันที <Link href="/interview" className="font-medium underline underline-offset-4">ไปสัมภาษณ์</Link></p>}
      </section>

      {supabaseReady && <div className="flex flex-col md:hidden"><AccountButton /></div>}

      <section aria-labelledby="wipe-title" className="flex flex-col gap-2.5 rounded-2xl bg-risk-tint p-4">
        <h2 id="wipe-title" className="font-medium text-risk">ลบข้อมูลทั้งหมดของฉัน</h2>
        <p className="text-callout text-ink">ลบไอเดีย เอกสาร และบทสนทนาบนเซิร์ฟเวอร์ กู้คืนไม่ได้ ต้องออนไลน์และได้รับคำยืนยันจากเซิร์ฟเวอร์ก่อน บัญชียังเก็บเฉพาะตัวเลขโควตาที่ใช้ไปของวันนี้ การลบนี้ไม่ลบบัญชี Google</p>
        <button type="button" onClick={() => setShowWipeModal(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-risk bg-surface px-4 font-medium text-risk hover:bg-risk-tint">
          <Trash2 className="h-4 w-4" aria-hidden />ลบข้อมูลทั้งหมด
        </button>
      </section>

      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="wipe-confirm-title" aria-describedby="wipe-confirm-text" className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-surface p-6 shadow-e3">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-risk-tint text-risk"><AlertTriangle className="h-6 w-6" aria-hidden /></span>
            <h2 id="wipe-confirm-title" className="text-center text-headline">ลบข้อมูลทั้งหมด?</h2>
            <p id="wipe-confirm-text" className="text-center text-callout text-ink-2">ข้อมูลโครงงาน การปัดการ์ด การประเมิน ความยินยอม และบทสนทนาบนเซิร์ฟเวอร์จะถูกลบ และกู้คืนไม่ได้</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" autoFocus onClick={() => setShowWipeModal(false)} className="min-h-11 rounded-xl bg-surface-2 px-4 font-medium hover:bg-separator">ยกเลิก</button>
              <button type="button" onClick={handleConfirmWipe} className="min-h-11 rounded-xl bg-risk px-4 font-medium text-white">ลบข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {wipeSuccess && <p role="status" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-callout shadow-e3"><CheckCircle2 className="h-4 w-4 text-good" aria-hidden />ลบข้อมูลทั้งหมดแล้ว</p>}
    </div>
  );
}
