'use client';

import Link from 'next/link';

export function ProjectToolLinks({ projectId }: { projectId?: string }) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return (
    <nav aria-label="เครื่องมือโครงงาน" className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-caption font-semibold">
      <Link className="min-h-11 rounded-xl border border-accent/30 bg-surface p-2 text-center text-accent-text flex items-center justify-center" href={`/proposal${query}`}>ข้อเสนอ & แผน</Link>
      <Link className="min-h-11 rounded-xl border border-accent/30 bg-surface p-2 text-center text-accent-text flex items-center justify-center" href={`/bom${query}`}>งบ & อุปกรณ์</Link>
      <Link className="min-h-11 rounded-xl border border-accent/30 bg-surface p-2 text-center text-accent-text flex items-center justify-center" href={`/calendar${query}`}>ปฏิทินแข่ง</Link>
      <Link className="min-h-11 rounded-xl border border-accent/30 bg-accent-tint p-2 text-center text-accent-text flex items-center justify-center" href={`/judge${query}`}>ซ้อมกรรมการ</Link>
    </nav>
  );
}
