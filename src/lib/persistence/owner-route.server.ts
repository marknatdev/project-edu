import 'server-only';
import { boundedText, BodyLimitError } from '@/lib/http/bounded-body';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { GUEST_COOKIE } from '@/lib/auth/principal.server';
import { sameOrigin } from '@/lib/auth/paths';
import { PersistenceError } from './contracts';
import { requiresCloudPersistence } from './config';

/** Shared plumbing for owner-bound AI/quota routes (evaluate, pivot, proposal).
 * Identity comes ONLY from resolvePrincipal; bodies never choose an owner. */
export const NO_STORE = { 'Cache-Control': 'no-store' };
export const json = (status: number, body: object) => NextResponse.json(body, { status, headers: NO_STORE });
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function readBody(req: Request, maxBytes = 65536): Promise<{ body: unknown } | { response: NextResponse }> {
  if (!sameOrigin(req)) return { response: json(403, { error: 'CROSS_SITE', messageTh: 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น' }) };
  try {
    const raw = await boundedText(req, maxBytes);
    return { body: JSON.parse(raw) };
  } catch (e) { return { response: json(e instanceof BodyLimitError ? 413 : 400, { error: e instanceof BodyLimitError ? 'TOO_LARGE' : 'INVALID_JSON' }) }; }
}

/** Field paths only; never echo learner-submitted values or provider errors. */
export function invalidInput(issues: { path: PropertyKey[] }[]) {
  return json(400, { error: 'INVALID_INPUT', fields: [...new Set(issues.map(i => i.path.map(String).join('.')))].slice(0, 10) });
}

export function ownerFailure(req: Request, e: unknown, unavailableTh: string): NextResponse {
  if (e instanceof PersistenceError && e.code === 'GUEST_VERIFICATION_REQUIRED') {
    // A tampered/rotated capability grants nothing; clear it so the next request
    // mints a fresh owner explicitly. Old server data stays inaccessible.
    const response = json(401, { error: 'GUEST_VERIFICATION_REQUIRED', messageTh: 'สิทธิ์เข้าถึงข้อมูลเดิมใช้ไม่ได้แล้ว กรุณาโหลดหน้าใหม่ งานในเครื่องยังอยู่' });
    response.cookies.set(GUEST_COOKIE, '', { path: '/', httpOnly: true, sameSite: 'strict', secure: requiresCloudPersistence() || new URL(req.url).protocol === 'https:', maxAge: 0 });
    return response;
  }
  if (e instanceof PersistenceError && e.status !== 503) {
    return json(e.status, { error: e.code, messageTh: 'ข้อมูลบนเซิร์ฟเวอร์เปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ งานในเครื่องยังอยู่' });
  }
  return json(503, { error: 'PERSISTENCE_UNAVAILABLE', messageTh: unavailableTh });
}
