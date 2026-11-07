'use client';

import type { SafetyFlag } from '@/types/domain';
import { buildSafetyChecklist } from '@/lib/safety/checklist';

export function SafetyChecklist({ flags, completed, onChange }: {
  flags: SafetyFlag[];
  completed: string[];
  onChange: (ids: string[]) => void;
}) {
  const items = buildSafetyChecklist(flags);
  if (!items.length) return null;
  const count = items.filter((item) => completed.includes(item.id)).length;
  return (
    <section aria-labelledby="safety-checklist-heading" className="rounded-3xl border border-caution/30 bg-caution-tint p-4 sm:p-6 space-y-4 break-words">
      <div className="space-y-2">
        <p className="text-caption font-bold text-caution">SAFETY & IRB • ไม่ปิดกั้นการร่าง</p>
        <h2 id="safety-checklist-heading" className="text-headline font-bold text-ink">เช็กลิสต์ความปลอดภัย ISEF / YSC</h2>
        <p className="text-callout text-caution">รายการเตรียมคุยกับครู ไม่ใช่การรับรองหรืออนุมัติ การติ๊กหมายถึงคุณทบทวนรายการแล้วเท่านั้น ยังต้องยืนยันเอกสารและข้อกำหนดปีที่สมัครกับครูและผู้จัดก่อนทำจริง</p>
        <p className="text-caption text-caution">อ้างอิง RESEARCH.md §8.2 และ §10 • ไม่อนุมานหมายเลขแบบฟอร์มหรือระดับ BSL จากคำที่ตรวจพบ • ไม่เก็บชื่อ ลายเซ็น หรือเอกสารอาสาสมัคร</p>
        <p className="text-callout font-semibold text-caution" aria-live="polite">ทบทวนแล้ว {count}/{items.length} รายการ</p>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-caution/30 bg-surface p-3">
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" checked={completed.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...completed.filter((id) => id !== item.id), item.id] : completed.filter((id) => id !== item.id))} />
              <span className="min-w-0 space-y-1">
                <span className="block text-callout font-semibold text-ink">{item.titleTh}</span>
                <span className="block text-caption leading-relaxed text-ink-2">{item.detailTh}</span>
                <span className="block text-caption text-ink-3">ที่มา: {item.source}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
