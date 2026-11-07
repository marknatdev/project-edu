'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signInWithGoogle, signOut } from '@/lib/supabase/client';
const button = 'min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50';
/** Sign-in does not import, overwrite or remove any local project/draft. */
export function AccountButton({ next }: { next?: string } = {}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let live = true;
    fetch('/auth/session', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.json()).then(data => {
      if (live) setAuthenticated(data.authenticated === true);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  async function login() {
    // Mounted editors save their drafts synchronously or veto navigation if
    // storage fails / an unfinished edit needs the learner's decision.
    if (!window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true }))) {
      setMessage('กรุณาบันทึกหรือยกเลิกส่วนที่กำลังแก้ไขก่อนเข้าสู่ระบบ งานยังอยู่ในหน้านี้');
      return;
    }
    setBusy(true); setMessage('');
    const result = await signInWithGoogle(undefined, next);
    if (!result.success) { setMessage(result.error || 'ยังเข้าสู่ระบบไม่ได้ งานในเครื่องยังอยู่'); setBusy(false); }
  }
  async function logout() {
    if (!window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true }))) { setMessage('กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนออกจากระบบ'); return; }
    setBusy(true);
    if (await signOut()) { setAuthenticated(false); window.location.reload(); }
    else { setMessage('ยังออกจากระบบไม่ได้ กรุณาลองใหม่'); }
    setBusy(false);
  }
  return <>
    <button type="button" className={button} disabled={busy} onClick={() => { if (authenticated) void logout(); else dialog.current?.showModal(); }}>
      {authenticated ? 'ออกจากระบบ Google' : 'เข้าสู่ระบบด้วย Google'}
    </button>
    {message && !dialog.current?.open && <p role="status" className="text-xs text-slate-600">{message}</p>}
    <dialog ref={dialog} aria-label="เลือกเข้าสู่ระบบ Google" className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 p-6 shadow-xl backdrop:bg-slate-900/50">
      <h2 className="font-bold text-slate-900">เข้าสู่ระบบด้วย Google</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">เมื่อคุณเข้าสู่ระบบ Google และ Supabase Auth จะประมวลผลชื่อและอีเมลเพื่อยืนยันบัญชี แอปใช้เพียงรหัสบัญชีเพื่อแยกสิทธิ์ ไม่คัดลอกชื่อหรืออีเมลลงข้อมูลโครงงานหรือส่งให้ AI ไม่ขอสิทธิ์ Drive หรือ Calendar</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">งาน Guest ที่เคยทำไว้ก่อนหน้าไม่ถูกย้ายเข้าบัญชี และยังไม่ซิงค์โครงงานข้ามอุปกรณ์</p>
      <Link href="/consent" className="mt-2 inline-flex min-h-11 items-center text-sm underline">อ่านการใช้ข้อมูลและการลบข้อมูล</Link>
      {message && <p role="status" className="my-2 text-sm text-amber-800">{message}</p>}
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className="min-h-[44px] rounded-xl border border-indigo-600 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50" disabled={busy} onClick={() => void login()}>{busy ? 'กำลังเชื่อมต่อ…' : 'ยินยอมและเข้าสู่ระบบ Google'}</button>
        <button type="button" className={button} onClick={() => dialog.current?.close()}>ยกเลิก</button>
      </div>
    </dialog>
  </>;
}
