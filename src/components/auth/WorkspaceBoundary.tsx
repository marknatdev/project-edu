'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { setWorkspaceScope, getWorkspaceScope, reloadWorkspace } from '@/lib/auth/workspace-client';
import { getWipeGeneration } from '@/lib/storage/store';

const CHANGE = 'edtech:workspace-change';
const button = 'min-h-[44px] rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-900 disabled:opacity-50';
type Session = { authenticated: boolean; scope: string; workspace: 'guest' | 'account'; decisionRequired: boolean };
/** Do not mount ANY local-state reader/writer until verified identity and local
 * provenance agree. Legacy local work always stays Guest; never copy on login. */
export function WorkspaceBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mountedScope = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const mountedGeneration = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let reading = false;
    // Scope changed elsewhere: flush unsaved editor drafts into the OLD scope (still
    // current in this tab) before reloading, unless a wipe since mount made them stale.
    const leave = () => {
      if (getWipeGeneration() === mountedGeneration.current
        && !window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true }))) {
        setError('พื้นที่งานเปลี่ยนแล้ว กรุณาบันทึกหรือยกเลิกการแก้ไข แล้วโหลดหน้าใหม่'); return;
      }
      setSession(null); reloadWorkspace();
    };
    const verify = async () => {
      if (reading) return;
      reading = true;
      try {
        const r = await fetch('/auth/session', { credentials: 'same-origin', cache: 'no-store' });
        const data = await r.json();
        if (!r.ok || typeof data.authenticated !== 'boolean' || typeof data.scope !== 'string') throw Error('AUTH_UNAVAILABLE');
        if (!active) return;
        if (mountedScope.current !== null && getWorkspaceScope() !== data.scope) { leave(); return; }
        if (mountedScope.current === null) mountedGeneration.current = getWipeGeneration();
        mountedScope.current = data.scope;
        setWorkspaceScope(data.scope); setSession(data); setError('');
      } catch {
        if (active) {
          if (mountedScope.current !== null && sessionRef.current !== null) {
            // Transient check failure while already verified: preserve mounted children and unsaved drafts
            setError('ตรวจสอบบัญชีไม่ได้ชั่วคราว งานที่แก้ไขยังบันทึกในอุปกรณ์นี้ได้ตามปกติ ส่วนการเชื่อมกับบัญชีจะหยุดไว้จนกว่าการเชื่อมต่อจะกลับมา');
          } else {
            setSession(null);
            setError('ตรวจสอบบัญชีไม่ได้ จึงยังไม่เปิดหรือบันทึกงานเพื่อป้องกันการย้ายงานผิดบัญชี กรุณาเชื่อมต่อแล้วโหลดใหม่');
          }
        }
      }
      finally { reading = false; }
    };
    void verify();
    const foreground = () => { if (document.visibilityState === 'visible') void verify(); };
    const changed = (e: StorageEvent) => { if (e.key === CHANGE) leave(); };
    window.addEventListener('focus', foreground); document.addEventListener('visibilitychange', foreground); window.addEventListener('storage', changed);
    return () => { active = false; window.removeEventListener('focus', foreground); document.removeEventListener('visibilitychange', foreground); window.removeEventListener('storage', changed); };
  }, [pathname]);
  async function choose(decision: 'guest' | 'account') {
    if (!window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true }))) { setError('บันทึกหรือยกเลิกการแก้ไขก่อนเปลี่ยนพื้นที่งาน'); return; }
    setBusy(true);
    try {
      const r = await fetch('/auth/workspace', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
      if (!r.ok) throw Error('WORKSPACE_UNAVAILABLE');
      // Read back the exact cookie-backed selection before allowing any writer.
      const verified = await fetch('/auth/session', { cache: 'no-store', credentials: 'same-origin' });
      const data = await verified.json();
      if (!verified.ok || data.workspace !== decision || data.decisionRequired) throw Error('WORKSPACE_UNAVAILABLE');
      try { localStorage.setItem(CHANGE, crypto.randomUUID()); } catch { /* Server scope header still fences stale tabs. */ }
      setSession(null); reloadWorkspace();
    } catch { setError('ยังเปลี่ยนพื้นที่งานไม่ได้ งานเดิมยังอยู่ กรุณาลองใหม่'); setBusy(false); }
  }
  if (error && !session) return <p role="alert">{error}</p>;
  if (!session) return <p role="status">กำลังตรวจสอบพื้นที่งาน…</p>;
  if (session.decisionRequired) return <section aria-label="เลือกพื้นที่งานหลังเข้าสู่ระบบ" className="relative z-40 mx-auto my-6 max-w-3xl space-y-4 rounded-2xl border border-indigo-200 bg-white p-5">
    <h1 className="font-bold">เข้าสู่ระบบแล้ว — เลือกพื้นที่งานก่อนทำต่อ</h1>
    <p>งาน Guest เดิมเก็บแยกในเครื่อง จะไม่คัดลอกคำตอบ การ์ด ไอเดีย หรือบทสนทนาเข้าบัญชีอัตโนมัติ และไม่เขียนทับงานบัญชี</p>
    <button className={button} disabled={busy} onClick={() => void choose('guest')}>ทำงาน Guest เดิมต่อ (ไม่ย้ายเข้าบัญชี)</button>
    <button className={button} disabled={busy} onClick={() => void choose('account')}>ใช้พื้นที่บัญชีแยก — ไม่ย้ายงาน Guest</button>
    {error && <p role="alert">{error}</p>}
  </section>;
  return <>
    {error && !session.authenticated && <aside role="alert" className="relative z-40 mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</aside>}
    {session.authenticated && <aside className="relative z-40 mb-4 space-y-2 border border-indigo-200 bg-indigo-50 p-3 text-sm" aria-label="พื้นที่งานปัจจุบัน">
      <p>{session.workspace === 'guest' ? 'กำลังทำงาน Guest เดิม — ไม่ย้ายเข้าบัญชี' : 'พื้นที่บัญชีแยก — ไม่อ่านหรือย้ายงาน Guest เดิม'}</p>
      <button className={button} disabled={busy} onClick={() => void choose(session.workspace === 'guest' ? 'account' : 'guest')}>{session.workspace === 'guest' ? 'สลับไปพื้นที่บัญชีแยก' : 'กลับไปทำงาน Guest เดิม'}</button>
      {error && <p role="alert">{error}</p>}
    </aside>}
    {children}
  </>;
}
