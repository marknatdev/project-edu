'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { FreshDiscovery } from '@/components/discovery/FreshDiscovery';

/**
 * Discovery Track: personalized interest chat → AI-generated starter cards
 * (POST /api/discovery/cards). The 90-card seed catalog is no longer the
 * default deck; its data and tests are preserved (src/data, tests/unit).
 */
export default function DiscoveryPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-callout text-ink-3">กำลังโหลดการค้นหาเรื่องที่อยากทำ…</div>}>
        <FreshDiscovery />
      </Suspense>
    </AppShell>
  );
}
