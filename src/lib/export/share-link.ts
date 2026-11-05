import { createExportSnapshot, ExportSnapshotSchema, type ExportInput, type ExportSnapshot } from './snapshot';

const MAX_DOCUMENT_BYTES = 64_000;
export const MAX_SHARE_TOKEN_LENGTH = 12_000;
const TOO_LARGE = 'เอกสารใหญ่เกินสำหรับลิงก์แชร์ กรุณาดาวน์โหลด Word หรือ PDF แทน';

export async function encodeSharePayload(input: ExportInput): Promise<string> {
  const json = JSON.stringify(createExportSnapshot(input));
  if (new TextEncoder().encode(json).byteLength > MAX_DOCUMENT_BYTES) throw new Error(TOO_LARGE);
  const compressed = await new Response(
    new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  const token = btoa(String.fromCharCode(...new Uint8Array(compressed)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (token.length > MAX_SHARE_TOKEN_LENGTH) throw new Error(TOO_LARGE);
  return token;
}

export async function decodeSharePayload(token: string): Promise<ExportSnapshot> {
  if (token.length > MAX_SHARE_TOKEN_LENGTH) throw new Error(TOO_LARGE);
  if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('ลิงก์แชร์ไม่ถูกต้อง');
  const bytes = Uint8Array.from(atob(token.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let json = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_DOCUMENT_BYTES) {
        await reader.cancel();
        throw new Error(TOO_LARGE);
      }
      json += decoder.decode(value, { stream: true });
    }
    json += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return ExportSnapshotSchema.parse(JSON.parse(json));
}
