import { projectRecordKey } from '@/lib/storage/project-records';
import { z } from 'zod';
import { createExportSnapshot } from '@/lib/export/snapshot';
import { getProject, type StorageAdapter } from '@/lib/storage/store';
import type { Project } from '@/types/domain';
import { readPresentationNotes } from '@/lib/presentation/notes-store';
import { AdvisorRequestRefSchema, AdvisorDecisionSchema, createAdvisorRequest, encodeAdvisorRequest,
  decodeAdvisorDecision, fingerprintDocument } from './codec';

const ReviewRecordSchema = z.object({ request: AdvisorRequestRefSchema, decision: AdvisorDecisionSchema.optional() }).strict();
export type AdvisorReviewRecord = z.infer<typeof ReviewRecordSchema>;
const key = (projectId: string) => projectRecordKey('advisor', projectId);

export function advisorDocument(project: Project, storage: StorageAdapter = localStorage) {
  const notes = readPresentationNotes(project.id, storage);
  return { title: project.proposal.title.trim() || project.title, proposal: project.proposal, plan: project.plan, includeTemplates: true, ...(notes ? { presentationNotes: notes } : {}) };
}

export function readAdvisorReview(projectId: string, storage: StorageAdapter = localStorage): AdvisorReviewRecord | null {
  const raw = storage.getItem(key(projectId));
  return raw ? ReviewRecordSchema.parse(JSON.parse(raw)) : null;
}

/** Each new request replaces the previous request; old return codes no longer apply. */
export async function beginAdvisorReview(projectId: string, storage: StorageAdapter = localStorage): Promise<string> {
  readAdvisorReview(projectId, storage); // Fail closed rather than overwrite malformed saved data.
  const project = getProject(projectId, storage);
  if (!project) throw new Error('ไม่พบโครงงาน');
  const source = createExportSnapshot(advisorDocument(project, storage));
  const request = await createAdvisorRequest(source);
  const token = await encodeAdvisorRequest(request);
  const current = getProject(projectId, storage);
  if (!current || JSON.stringify(createExportSnapshot(advisorDocument(current, storage))) !== JSON.stringify(source)) throw new Error('เอกสารเปลี่ยนระหว่างสร้างลิงก์ กรุณาลองใหม่');
  storage.setItem(key(projectId), JSON.stringify({ request: { requestId: request.requestId, fingerprint: request.fingerprint } }));
  return token;
}

export async function advisorReviewMatches(project: Project, record: AdvisorReviewRecord, storage: StorageAdapter = localStorage): Promise<boolean> {
  return await fingerprintDocument(advisorDocument(project, storage)) === record.request.fingerprint;
}

export async function importAdvisorDecision(projectId: string, code: string, storage: StorageAdapter = localStorage): Promise<AdvisorReviewRecord> {
  const decision = decodeAdvisorDecision(code);
  const record = readAdvisorReview(projectId, storage);
  const project = getProject(projectId, storage);
  if (!project || !record || record.request.requestId !== decision.requestId || record.request.fingerprint !== decision.fingerprint) {
    throw new Error('รหัสไม่ตรงกับคำขอตรวจล่าสุดของโครงงานนี้');
  }
  const source = createExportSnapshot(advisorDocument(project, storage));
  if (await fingerprintDocument(source) !== record.request.fingerprint) throw new Error('เอกสารเปลี่ยนหลังส่งตรวจ กรุณาสร้างลิงก์ใหม่ให้ครูตรวจอีกครั้ง');
  // Re-read after the async checksum; no awaits between this guard and the write.
  const current = getProject(projectId, storage);
  const latest = readAdvisorReview(projectId, storage);
  if (!current || latest?.request.requestId !== record.request.requestId || JSON.stringify(createExportSnapshot(advisorDocument(current, storage))) !== JSON.stringify(source)) {
    throw new Error('เอกสารหรือคำขอตรวจเปลี่ยนระหว่างนำเข้า กรุณาลองใหม่');
  }
  const updated = ReviewRecordSchema.parse({ ...record, decision });
  storage.setItem(key(projectId), JSON.stringify(updated));
  return updated;
}
