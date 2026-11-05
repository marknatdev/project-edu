'use client';

import { useEffect, useState } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Installation is optional: registration failure must not block Guest Mode.
      });
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return <aside className="print-controls flex flex-wrap justify-center items-center gap-2 bg-indigo-50 border-b border-indigo-100 p-2 text-xs">
    <span>เพิ่ม Project Edu ไว้บนหน้าจอหลัก (ยังต้องใช้อินเทอร์เน็ต)</span>
    <button className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white font-semibold" onClick={async () => {
      try { await prompt.prompt(); await prompt.userChoice; }
      catch { /* Browser menu remains available if the prompt is unavailable. */ }
      finally { setPrompt(null); }
    }}>ติดตั้งแอป</button>
    <button aria-label="ปิดคำแนะนำติดตั้งแอป" className="min-h-[44px] min-w-[44px] px-3" onClick={() => setPrompt(null)}>ปิด</button>
  </aside>;
}
