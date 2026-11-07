'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signInWithGoogle, signOut } from '@/lib/supabase/client';
const button = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-surface-2 px-4 text-callout font-medium text-ink transition-colors hover:bg-separator disabled:opacity-40';
const primary = 'inline-flex min-h-[50px] items-center justify-center rounded-xl bg-accent px-5 font-medium text-accent-on transition-colors hover:bg-accent-press disabled:opacity-40';
const googleButton = 'flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-control bg-surface px-5 font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-40';

function GoogleG() {
  return <svg aria-hidden width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;
}

/** Sign-in does not import, overwrite or remove any local project/draft. `prominent` is the landing-page CTA. */
export function AccountButton({ next, prominent = false }: { next?: string; prominent?: boolean } = {}) {
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
    <button type="button" className={prominent && !authenticated ? googleButton : button} disabled={busy} onClick={() => { if (authenticated) void logout(); else dialog.current?.showModal(); }}>
      {prominent && !authenticated && <GoogleG />}
      {authenticated ? 'ออกจากระบบ Google' : 'เข้าสู่ระบบด้วย Google'}
    </button>
    {message && !dialog.current?.open && <p role="status" className="text-callout text-ink-2">{message}</p>}
    <dialog ref={dialog} aria-labelledby="google-dialog-title" className="w-[calc(100%-2rem)] max-w-md rounded-3xl bg-surface p-6 text-ink shadow-e3 backdrop:bg-ink/40">
      <h2 id="google-dialog-title" className="text-headline">เข้าสู่ระบบด้วย Google</h2>
      <p className="mt-3 text-callout text-ink-2">เมื่อคุณเข้าสู่ระบบ Google และ Supabase Auth จะประมวลผลชื่อและอีเมลเพื่อยืนยันบัญชี แอปใช้เพียงรหัสบัญชีเพื่อแยกสิทธิ์ ไม่คัดลอกชื่อหรืออีเมลลงข้อมูลโครงงานหรือส่งให้ AI ไม่ขอสิทธิ์ Drive หรือ Calendar</p>
      <p className="mt-3 text-callout text-ink-2">งาน Guest ที่เคยทำไว้ก่อนหน้าไม่ถูกย้ายเข้าบัญชี และยังไม่ซิงค์โครงงานข้ามอุปกรณ์</p>
      <Link href="/consent" className="mt-1 inline-flex min-h-11 items-center text-callout font-medium text-accent-text underline underline-offset-4">อ่านการใช้ข้อมูลและการลบข้อมูล</Link>
      {message && <p role="status" className="my-2 text-callout text-caution">{message}</p>}
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className={primary} disabled={busy} onClick={() => void login()}>{busy ? 'กำลังเชื่อมต่อ…' : 'ยินยอมและเข้าสู่ระบบ Google'}</button>
        <button type="button" className={button} onClick={() => dialog.current?.close()}>ยกเลิก</button>
      </div>
    </dialog>
  </>;
}
