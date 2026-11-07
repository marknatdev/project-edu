'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

export type DocsView = 'proposal' | 'plan' | 'export' | 'tcas' | 'pitch' | 'advisor' | 'bom' | 'calendar' | 'judge';

const PRIMARY: { id: DocsView; label: string }[] = [
  { id: 'proposal', label: 'ข้อเสนอ' }, { id: 'plan', label: 'แผนงาน' }, { id: 'export', label: 'ส่งออก' },
];
const TOOLS: { id: DocsView; label: string; path: string }[] = [
  { id: 'bom', label: 'งบและอุปกรณ์', path: '/bom' },
  { id: 'calendar', label: 'ปฏิทินงานแข่ง', path: '/calendar' },
  { id: 'judge', label: 'ซ้อมตอบกรรมการ', path: '/judge' },
  { id: 'tcas', label: 'พอร์ต TCAS', path: '/proposal' },
  { id: 'pitch', label: 'บทคัดย่อและพิตช์', path: '/proposal' },
  { id: 'advisor', label: 'ส่งให้ครูตรวจ', path: '/proposal' },
];

/** Figma "08 เอกสาร" header: three primary views as a segmented control, the rest behind "เครื่องมือ" (Hick's law). */
export function DocsNav({ current, projectId }: { current: DocsView; projectId?: string }) {
  const href = (path: string, tab?: DocsView) => {
    const q = new URLSearchParams();
    if (projectId) q.set('projectId', projectId);
    if (tab && path === '/proposal' && tab !== 'proposal') q.set('tab', tab);
    const s = q.toString();
    return path + (s ? `?${s}` : '');
  };
  const tool = TOOLS.find(t => t.id === current);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-large-title">{tool ? tool.label : 'เอกสาร'}</h1>
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-2 font-medium text-accent-text hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
            เครื่องมือ<MoreHorizontal className="h-5 w-5" aria-hidden />
          </summary>
          <nav aria-label="เครื่องมือโครงงาน" className="absolute right-0 z-20 mt-2 flex w-60 flex-col rounded-2xl bg-surface p-2 shadow-e2">
            {TOOLS.map(t => (
              <Link key={t.id} href={href(t.path, t.id)} aria-current={t.id === current ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 hover:bg-surface-2 ${t.id === current ? 'font-medium text-accent-text' : ''}`}>{t.label}</Link>
            ))}
          </nav>
        </details>
      </div>
      <nav aria-label="ประเภทเอกสาร" className="grid grid-cols-3 gap-0.5 rounded-xl bg-surface-2 p-[3px]">
        {PRIMARY.map(p => {
          const on = p.id === current;
          return <Link key={p.id} href={href('/proposal', p.id)} scroll={false} aria-current={on ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center rounded-[9px] text-caption ${on ? 'bg-surface text-ink shadow-e1' : 'text-ink-2 hover:text-ink'}`}>{p.label}</Link>;
        })}
      </nav>
    </div>
  );
}
