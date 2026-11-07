'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { setWorkspaceScope, getWorkspaceScope, reloadWorkspace } from '@/lib/auth/workspace-client';
import { getWipeGeneration } from '@/lib/storage/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const CHANGE = 'edtech:workspace-change';
type Session = { authenticated: boolean; scope: string; workspace: 'guest' | 'account'; decisionRequired: boolean };
/** Do not mount ANY local-state reader/writer until verified identity and local
 * provenance agree. Legacy local work always stays Guest; never copy on login. */
export function WorkspaceBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
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
        if (r.status === 401 && isSupabaseConfigured()) { // Signed out or expired: sign in again (ADR 0003), keeping drafts if an editor vetoes.
          if (active && window.dispatchEvent(new Event('edtech:before-account-navigation', { cancelable: true }))) window.location.assign('/auth?next=' + encodeURIComponent(window.location.pathname + window.location.search));
          else if (active) setError('เซสชันหมดอายุ กรุณาบันทึกหรือยกเลิกการแก้ไข แล้วเข้าสู่ระบบใหม่');
          return;
        }
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
  if (error && !session) return <p role="alert">{error}</p>;
  if (!session) return <p role="status">กำลังตรวจสอบพื้นที่งาน…</p>;
  return <>
    {error && <aside role="alert" className="relative z-40 mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</aside>}
    {children}
  </>;
}
