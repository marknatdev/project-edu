'use client';

import Link from 'next/link';

export function ProjectToolLinks({ projectId }: { projectId?: string }) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return (
    <nav aria-label="เครื่องมือโครงงาน" className="grid grid-cols-3 gap-2 text-xs font-semibold">
      <Link className="min-h-11 rounded-xl border border-indigo-100 bg-white p-2 text-center text-indigo-700 flex items-center justify-center" href={`/proposal${query}`}>ข้อเสนอ & แผน</Link>
      <Link className="min-h-11 rounded-xl border border-indigo-100 bg-white p-2 text-center text-indigo-700 flex items-center justify-center" href={`/bom${query}`}>งบ & อุปกรณ์</Link>
      <Link className="min-h-11 rounded-xl border border-indigo-100 bg-white p-2 text-center text-indigo-700 flex items-center justify-center" href={`/calendar${query}`}>ปฏิทินแข่ง</Link>
    </nav>
  );
}
