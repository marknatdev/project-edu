'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, FileText, Gauge, House, Info, MessageCircle, type LucideIcon } from 'lucide-react';
import { AccountButton } from '@/components/auth/AccountAccess';

interface AppShellProps {
  children: React.ReactNode;
}

type Tab = { href: string; label: string; icon: LucideIcon; routes: string[] };
/** Five top-level destinations (Figma "Tab Bar"); the chat is the raised centre tab on mobile. */
export const TABS: Tab[] = [
  { href: '/', label: 'หน้าหลัก', icon: House, routes: ['/'] },
  { href: '/discovery', label: 'หัวข้อ', icon: Compass, routes: ['/interview', '/discovery'] },
  { href: '/idea', label: 'ที่ปรึกษา', icon: MessageCircle, routes: ['/idea'] },
  { href: '/evaluation', label: 'ประเมิน', icon: Gauge, routes: ['/evaluation', '/variables'] },
  { href: '/proposal', label: 'เอกสาร', icon: FileText, routes: ['/proposal', '/bom', '/calendar', '/judge'] },
];
export const activeTab = (pathname: string) => TABS.find(t => t.routes.includes(pathname))?.href;

function Brand() {
  return <Link href="/" className="flex min-h-11 items-center gap-2.5 font-head text-headline text-ink">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-on"><Compass className="h-5 w-5" aria-hidden /></span>
    Project Edu
  </Link>;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const current = activeTab(pathname);
  const helpActive = pathname === '/consent';

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">ข้ามไปเนื้อหาหลัก</a>

      {/* Desktop sidebar */}
      <aside className="z-30 hidden md:fixed md:inset-y-0 md:flex md:w-[248px] md:flex-col md:gap-1 md:bg-surface-2 md:px-3 md:py-6">
        <div className="px-3 pb-5"><Brand /></div>
        <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const on = current === href;
            return <Link key={href} href={href} aria-current={on ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 transition-colors ${on ? 'bg-accent-tint font-medium text-accent-text' : 'text-ink hover:bg-separator/60'}`}>
              <Icon className={`h-5 w-5 ${on ? '' : 'text-ink-2'}`} aria-hidden />{label}
            </Link>;
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <Link href="/consent" aria-current={helpActive ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 ${helpActive ? 'bg-accent-tint font-medium text-accent-text' : 'text-ink hover:bg-separator/60'}`}>
            <Info className="h-5 w-5 text-ink-2" aria-hidden />ความช่วยเหลือ
          </Link>
          <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
            <p className="text-callout text-ink-2">บัญชี Google · เก็บเพียงรหัสบัญชี</p>
            <AccountButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-[248px]">
        {/* Mobile top bar: brand + help stay in the same place on every screen (WCAG 3.2.6). */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-separator bg-bg/90 px-4 backdrop-blur-xl md:hidden">
          <Brand />
          <Link href="/consent" aria-label="ความช่วยเหลือและความเป็นส่วนตัว" className="flex h-11 w-11 items-center justify-center rounded-full text-accent-text hover:bg-surface-2">
            <Info className="h-6 w-6" aria-hidden />
          </Link>
        </header>

        <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-5 pb-36 pt-6 md:px-10 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>

      {/* Mobile tab bar with the raised chat button in the centre. */}
      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-30 border-t border-separator bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }, i) => {
            const on = current === href;
            const raised = i === 2;
            return <li key={href} className="flex">
              <Link href={href} aria-current={on ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-end gap-0.5 pb-1.5 text-caption ${on ? 'text-accent-text' : 'text-ink-2'}`}>
                {raised
                  ? <span className={`absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-on shadow-e2 ${on ? 'ring-4 ring-accent-tint' : ''}`}><Icon className="h-[26px] w-[26px]" aria-hidden /></span>
                  : <Icon className="h-6 w-6" aria-hidden />}
                {label}
              </Link>
            </li>;
          })}
        </ul>
      </nav>
    </div>
  );
}
