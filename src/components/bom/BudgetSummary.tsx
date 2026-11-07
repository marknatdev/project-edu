'use client';

import Link from 'next/link';
import { calculateBudget, type BomItem } from '@/lib/bom/budget';

export const baht = (value: number) => value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function BudgetSummary({ items, budgetBaht }: { items: BomItem[]; budgetBaht: number | null }) {
  const summary = calculateBudget(items, budgetBaht);
  const remaining = summary.remainingBaht;
  const statusText = remaining === null ? 'ยังไม่ได้ตั้งงบใน Interview' : remaining < 0 ? `เกินงบ ${baht(-remaining)} ฿` : remaining === 0 ? 'พอดีกับงบที่ตั้งไว้' : `เหลืองบ ${baht(remaining)} ฿`;
  const percent = budgetBaht === null ? 0 : budgetBaht === 0 ? (summary.totalBaht > 0 ? 100 : 0) : Math.min(100, summary.totalBaht / budgetBaht * 100);
  return (
    <section aria-label="สรุปงบประมาณ" aria-live="polite" className="sticky top-[72px] z-10 rounded-2xl bg-ink p-4 text-white shadow-e2 space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0"><p className="text-caption text-ink-3">รวมค่าใช้จ่ายประเมิน</p><p className="text-xl font-semibold break-words">{baht(summary.totalBaht)} ฿</p></div>
        <div className="min-w-0 text-right"><p className="text-caption text-ink-3">งบจาก Constraints</p><p className="text-base font-bold break-words">{budgetBaht === null ? 'ยังไม่ระบุ' : `${baht(budgetBaht)} ฿`}</p></div>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden" aria-hidden="true"><div className={`h-full ${summary.status === 'over' ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${percent}%` }} /></div>
      <p className={`text-callout font-semibold ${summary.status === 'over' ? 'text-rose-200' : 'text-emerald-200'}`}>{statusText}</p>
      <p className="text-caption text-ink-3">{summary.savedBaht < 0 ? `ใช้ของทดแทนแพงขึ้น ${baht(-summary.savedBaht)} ฿` : `ประหยัดจากราคาซื้อใหม่ ${baht(summary.savedBaht)} ฿`}</p>
      {budgetBaht === null && <Link href="/interview" className="inline-flex min-h-10 items-center text-caption underline">ตั้งข้อจำกัดงบประมาณ</Link>}
    </section>
  );
}
