'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Lightbulb,
  ShieldCheck,
  Trash2,
  Sparkles,
  LogIn,
  AlertCircle,
  X,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { wipeAllLearnerData } from '@/lib/storage/store';
import { signInWithGoogle } from '@/lib/supabase/client';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle();
    if (!res.success && res.error) {
      setAuthMessage(res.error);
      setShowAuthModal(true);
    }
  };

  const handleConfirmWipe = () => {
    wipeAllLearnerData();
    setShowWipeModal(false);
    setWipeSuccess(true);
    setTimeout(() => {
      setWipeSuccess(false);
      window.location.href = '/';
    }, 1200);
  };

  const navItems = [
    {
      href: '/interview',
      label: 'สัมภาษณ์ / เริ่มต้น',
      icon: GraduationCap,
      active: pathname === '/interview' || pathname === '/',
    },
    {
      href: '/discovery',
      label: 'ค้นหาหัวข้อ (Discovery)',
      icon: Compass,
      active: pathname === '/discovery',
    },
    {
      href: '/idea',
      label: 'พัฒนาไอเดีย (Idea Track)',
      icon: Lightbulb,
      active: pathname === '/idea',
    },
    {
      href: '/proposal',
      label: 'ข้อเสนอ & แผนงาน (Proposal)',
      icon: FileText,
      active: pathname === '/proposal',
    },
    {
      href: '/consent',
      label: 'ความเป็นส่วนตัว (PDPA)',
      icon: ShieldCheck,
      active: pathname === '/consent',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50/70 via-pink-50/30 to-emerald-50/40 text-slate-900 font-sans antialiased">
      {/* Desktop Navigation Rail */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:bg-white/85 md:backdrop-blur-md md:border-r md:border-indigo-100 z-30 p-5 shadow-sm">
        <div className="flex items-center gap-2 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight text-slate-900 font-prompt">
              Project Edu
            </div>
            <div className="text-xs text-indigo-600 font-medium">
              ม.ต้น & ม.ปลาย
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="flex-1 space-y-1.5 pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                  item.active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-indigo-50/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Sidebar Bottom Card */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">โหมดการใช้งาน</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                Guest (Zero-PII)
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              ข้อมูลถูกจัดเก็บเฉพาะในเบราว์เซอร์นี้ ไม่มีการเก็บชื่อหรือข้อมูลติดต่อ
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowWipeModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition min-h-[40px]"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบข้อมูลทั้งหมดของฉัน</span>
          </button>
        </div>
      </aside>

      {/* Main Wrapper with Desktop Padding */}
      <div className="md:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-indigo-100/60 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="md:hidden w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800 md:hidden font-prompt">
              Project Edu
            </span>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-xs font-medium text-indigo-700">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Zero-PII Privacy Protection</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition min-h-[40px]"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-600" />
              <span>เข้าสู่ระบบ Google</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed for < md screens) */}
      <nav
        aria-label="เมนูหลักสำหรับมือถือ"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden shadow-lg"
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition min-h-[44px] ${
                  item.active
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="truncate max-w-[72px] text-center">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Google Auth / Supabase Fallback Explanation Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                <AlertCircle className="w-5 h-5 text-indigo-600" />
                <span>การเชื่อมต่อระบบบัญชี</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-prompt">
              {authMessage}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 min-h-[44px]"
              >
                รับทราบและใช้งานต่อในโหมด Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>ยืนยันการลบข้อมูลทั้งหมด</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-prompt">
              คุณต้องการลบข้อมูลโครงงาน ประวัติการปัดการ์ด การประเมิน และการตั้งค่าทั้งหมดออกจากอุปกรณ์นี้ใช่หรือไม่? ข้อมูลทั้งหมดจะถูกล้างและไม่สามารถกู้คืนได้
            </p>
            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 min-h-[44px]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 shadow-sm min-h-[44px]"
              >
                ลบข้อมูลทั้งหมดเดี๋ยวนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Success Toast */}
      {wipeSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ลบข้อมูลทั้งหมดเรียบร้อยแล้ว รีเซ็ตสู่สถานะเริ่มต้น</span>
        </div>
      )}
    </div>
  );
}
