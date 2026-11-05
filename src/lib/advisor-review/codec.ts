import { z } from 'zod';
import { createExportSnapshot, type ExportInput, type ExportSnapshot } from '@/lib/export/snapshot';
import { encodeSharePayload, decodeSharePayload, MAX_SHARE_TOKEN_LENGTH } from '@/lib/export/share-link';

export const AdvisorRequestRefSchema = z.object({
  requestId: z.string().uuid(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const AdvisorDecisionSchema = AdvisorRequestRefSchema.extend({
  version: z.literal(1), decision: z.enum(['approved', 'revision']),
  comment: z.string().max(1500), decidedAt: z.string().datetime(),
}).strict().refine(value => value.decision !== 'revision' || !!value.comment.trim(), { message: 'กรุณาระบุความเห็นที่ขอให้แก้ไข' });
export type AdvisorRequestRef = z.infer<typeof AdvisorRequestRefSchema>;
export type AdvisorDecision = z.infer<typeof AdvisorDecisionSchema>;
export type AdvisorRequest = AdvisorRequestRef & { snapshot: ExportSnapshot };

/** A checksum binds a document version; it is NOT a signature or proof of identity. */
export async function fingerprintDocument(input: ExportInput): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(createExportSnapshot(input)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createAdvisorRequest(input: ExportInput): Promise<AdvisorRequest> {
  const snapshot = createExportSnapshot(input);
  return { requestId: crypto.randomUUID(), fingerprint: await fingerprintDocument(snapshot), snapshot };
}

export async function encodeAdvisorRequest(request: AdvisorRequest): Promise<string> {
  const ref = AdvisorRequestRefSchema.parse({ requestId: request.requestId, fingerprint: request.fingerprint });
  if (await fingerprintDocument(request.snapshot) !== ref.fingerprint) throw new Error('ฉบับเอกสารไม่ตรงกัน');
  return `${ref.requestId}.${ref.fingerprint}.${await encodeSharePayload(request.snapshot)}`;
}

export async function decodeAdvisorRequest(token: string): Promise<AdvisorRequest> {
  if (token.length > MAX_SHARE_TOKEN_LENGTH + 102) throw new Error('ลิงก์ใหญ่เกิน');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('ลิงก์ตรวจเอกสารไม่ถูกต้อง');
  const ref = AdvisorRequestRefSchema.parse({ requestId: parts[0], fingerprint: parts[1] });
  const snapshot = await decodeSharePayload(parts[2]);
  if (await fingerprintDocument(snapshot) !== ref.fingerprint) throw new Error('ฉบับเอกสารไม่ตรงกัน');
  return { ...ref, snapshot };
}

export function encodeAdvisorDecision(input: AdvisorDecision): string {
  const bytes = new TextEncoder().encode(JSON.stringify(AdvisorDecisionSchema.parse(input)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Accept pasted code or return link. Never fetch or navigate a pasted URL. */
export function decodeAdvisorDecision(input: string): AdvisorDecision {
  let token = input.trim();
  if (token.length > 12000) throw new Error('รหัสส่งกลับใหญ่เกิน');
  if (/^https?:\/\//.test(token)) {
    const url = new URL(token);
    if (url.pathname !== '/proposal' || !url.hash.startsWith('#advisor=')) throw new Error('ลิงก์ส่งกลับไม่ถูกต้อง');
    token = url.hash.slice('#advisor='.length);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(token) || token.length > 10000) throw new Error('รหัสส่งกลับไม่ถูกต้อง');
  const bytes = Uint8Array.from(atob(token.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  return AdvisorDecisionSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}
