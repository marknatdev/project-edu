'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/types/domain';
import { readPresentationNotes, savePresentationNotes } from '@/lib/presentation/notes-store';
import type { PresentationNotes } from '@/lib/presentation/notes';
import { ExportPanel } from '@/components/export/ExportPanel';
import { PresentationDocument } from '@/components/export/PresentationDocument';
import { AdvisorReviewPanel } from '@/components/advisor-review/AdvisorReviewPanel';
import { PresentationNotesEditor } from './PresentationNotesEditor';

export function ProjectDeliverables({ project, view }: { project: Project; view: 'proposal' | 'plan' | 'tcas' | 'pitch' | 'advisor' }) {
  const [notes, setNotes] = useState<PresentationNotes | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try { setNotes(readPresentationNotes(project.id)); setReady(true); }
    catch { setError('อ่านข้อความประกอบพอร์ตไม่ได้ จึงไม่ส่งออกฉบับที่ขาดข้อมูล กรุณาตรวจพื้นที่จัดเก็บในเบราว์เซอร์ ข้อมูลเดิมไม่ถูกเขียนทับ'); }
  }, [project.id]);
  if (error) return <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{error}</p>;
  if (!ready) return <p role="status">กำลังโหลดเอกสาร…</p>;
  return <div className="space-y-5 min-w-0">
    {(view === 'tcas' || view === 'pitch') && <>
      <PresentationNotesEditor key={project.id} notes={notes} onSave={draft => { savePresentationNotes(project.id, draft); setNotes(draft); }} />
      <div className="proposal-document"><PresentationDocument input={{ ...project, ...(notes ? { presentationNotes: notes } : {}) }} view={view} /></div>
    </>}
    {view === 'advisor' && <AdvisorReviewPanel project={project} />}
    <ExportPanel key={`${project.id}:${project.updatedAt}:${JSON.stringify(notes)}`} project={project} presentationNotes={notes ?? undefined} />
  </div>;
}
