'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/types/domain';
import { readPresentationNotes, savePresentationNotes } from '@/lib/presentation/notes-store';
import type { PresentationNotes } from '@/lib/presentation/notes';
import { COACH_INVALIDATION_EVENT, COACH_INVALIDATION_KEY, type CoachingInvalidation } from '@/lib/advisor/coaching-invalidation';
import { getDefaultStorage, getWipeGeneration, WIPE_GENERATION_KEY } from '@/lib/storage/store';
import { ExportPanel } from '@/components/export/ExportPanel';
import { PresentationDocument } from '@/components/export/PresentationDocument';
import { AdvisorReviewPanel } from '@/components/advisor-review/AdvisorReviewPanel';
import { PresentationNotesEditor } from './PresentationNotesEditor';

export function ProjectDeliverables({ project, view }: { project: Project; view: 'proposal' | 'plan' | 'tcas' | 'pitch' | 'advisor' }) {
  const [notes, setNotes] = useState<PresentationNotes | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState<{
    projectId: string; storage: ReturnType<typeof getDefaultStorage>; generation: string;
  } | null>(null);
  const [wiped, setWiped] = useState(false);
  useEffect(() => {
    setWiped(false);
    setReady(false);
    setError('');
    try {
      const storage = getDefaultStorage();
      const generation = getWipeGeneration(storage);
      setNotes(readPresentationNotes(project.id, storage));
      setContext({ projectId: project.id, storage, generation });
      setReady(true);
    }
    catch { setError('อ่านข้อความประกอบพอร์ตไม่ได้ จึงไม่ส่งออกฉบับที่ขาดข้อมูล กรุณาตรวจพื้นที่จัดเก็บในเบราว์เซอร์ ข้อมูลเดิมไม่ถูกเขียนทับ'); }
  }, [project.id]);

  useEffect(() => {
    const handleWipe = () => { setNotes(null); setWiped(true); };
    const custom = (event: Event) => {
      const detail = (event as CustomEvent<CoachingInvalidation>)?.detail;
      if (detail?.action === 'wipe') handleWipe();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === COACH_INVALIDATION_KEY && event.newValue) {
        try { if (JSON.parse(event.newValue)?.action === 'wipe') handleWipe(); } catch { /* ignore */ }
      }
      if (event.key === WIPE_GENERATION_KEY || event.key === null) handleWipe();
    };
    window.addEventListener(COACH_INVALIDATION_EVENT, custom);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(COACH_INVALIDATION_EVENT, custom);
      window.removeEventListener('storage', storage);
    };
  }, []);

  if (wiped) return <p role="status">ลบข้อมูลแล้ว กรุณาเปิดโครงงานใหม่ก่อนแก้ไขหรือส่งออก</p>;
  if (error) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{error}</p>;
  if (!ready || !context || context.projectId !== project.id) return <p role="status">กำลังโหลดเอกสาร…</p>;
  return <div className="space-y-5 min-w-0">
    {(view === 'tcas' || view === 'pitch') && <>
      <PresentationNotesEditor key={project.id} notes={notes} onSave={draft => {
        const ok = savePresentationNotes(project.id, draft, context.storage, context.generation);
        if (ok) setNotes(draft);
        else { setNotes(null); setWiped(true); }
        return ok;
      }} />
      <div className="proposal-document"><PresentationDocument input={{ ...project, ...(notes ? { presentationNotes: notes } : {}) }} view={view} /></div>
    </>}
    {view === 'advisor' && <AdvisorReviewPanel project={project} />}
    <ExportPanel key={`${project.id}:${project.updatedAt}:${JSON.stringify(notes)}`} project={project} presentationNotes={notes ?? undefined} />
  </div>;
}
