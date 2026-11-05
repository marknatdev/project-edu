'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProjects, getActiveProjectId, getInterview, setActiveProjectId, loadState } from '@/lib/storage/store';
import type { Project } from '@/types/domain';
import { ProjectToolLinks } from './ProjectToolLinks';

interface ToolContext {
  project: Project | null;
  budgetBaht: number | null;
  lockSelection: (locked: boolean) => void;
}

/** Read existing Projects only. Missing URL IDs must not edit a different Project. */
export function ProjectToolWorkspace({ children }: { children: (context: ToolContext) => ReactNode }) {
  const params = useSearchParams();
  const requestedId = params.get('projectId');
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [budget, setBudget] = useState<number | null>(null);
  const [locked, lockSelection] = useState(false);
  const [error, setError] = useState('');
  const [recoveryWarning, setRecoveryWarning] = useState(false);

  useEffect(() => {
    const all = getProjects();
    setProjects(all);
    setSelectedId(requestedId ?? getActiveProjectId() ?? all[0]?.id ?? '');
    const budget = getInterview()?.constraints.budgetBaht;
    setBudget(typeof budget === 'number' && Number.isFinite(budget) ? budget : null);
    setRecoveryWarning(loadState().bomRecovered ?? false);
    lockSelection(false);
    setReady(true);
  }, [requestedId]);

  const project = projects.find((p) => p.id === selectedId) ?? null;
  return (
    <div className="space-y-5">
      <ProjectToolLinks projectId={project?.id} />
      {!ready ? <p role="status">กำลังโหลดโครงงาน…</p> : <>
        {projects.length > 0 && <label className="block text-sm font-semibold text-slate-700">
          โครงงาน (Project)
          <select aria-label="เลือกโครงงาน" className="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-indigo-200 bg-white p-3 text-sm" value={project?.id ?? ''} disabled={locked} onChange={(event) => {
            try {
              if (!setActiveProjectId(event.target.value)) throw new Error('missing');
              setProjects(getProjects());
              setSelectedId(event.target.value);
              setError('');
            } catch { setError('สลับโครงงานไม่สำเร็จ โปรดลองอีกครั้ง'); }
          }}>
            {!project && <option value="">ไม่พบโครงงานที่ระบุ</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {locked && <span className="mt-1 block text-xs font-normal text-slate-500">บันทึกหรือยกเลิกรายการก่อนสลับโครงงาน</span>}
        </label>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {recoveryWarning && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">พบ BOM บางส่วนอ่านไม่ได้ จึงไม่นำส่วนนั้นมารวมยอด โครงงานและเอกสารอื่นยังอยู่ กรุณาตรวจรายการใหม่ ข้อมูลต้นฉบับยังอยู่และจะเก็บสำเนาในอุปกรณ์นี้ก่อนบันทึกครั้งถัดไป</p>}
        {!project && <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-5 text-sm space-y-3">
          <p>{requestedId ? 'ไม่พบโครงงานที่ระบุในเบราว์เซอร์นี้' : 'ยังไม่มีโครงงาน เริ่มจากข้อเสนอโครงงานเพื่อเก็บ BOM และแผนงานแยกกัน'}</p>
          <Link href="/proposal" className="min-h-11 inline-flex items-center rounded-xl bg-indigo-600 px-4 text-white">ไปพื้นที่โครงงาน</Link>
        </div>}
        {children({ project, budgetBaht: budget, lockSelection })}
      </>}
    </div>
  );
}
