import { NextResponse } from 'next/server';
import { boundedText, BodyLimitError } from '@/lib/http/bounded-body';
import { resolvePrincipal, GUEST_COOKIE } from '@/lib/auth/principal.server';
import { sameOrigin } from '@/lib/auth/paths';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { PersistenceError } from '@/lib/persistence/contracts';
import { requiresCloudPersistence } from '@/lib/persistence/config';
import { FRESH_LIMITS, FreshCardsRequestSchema, type FreshCardsResponse } from '@/lib/discovery/fresh-contract';
import { generateFreshCards } from '@/lib/discovery/fresh-cards.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fresh personalized starter cards (Discovery). Identity comes only from the
 * verified account session or the signed Guest capability; quota, idempotency
 * and accepted snapshots live in the durable FoundationStore. Learner text is
 * never logged. No template/fallback cards are ever returned as fresh output.
 */
const headers = { 'Cache-Control': 'no-store' };
const STATUS: Record<FreshCardsResponse['status'], number> = {
  ok: 200, pending: 202, unavailable: 503, quota_exhausted: 429, failed_intent: 409, conflict: 409, rate_limited: 429,
};
const json = (status: number, body: object) => NextResponse.json(body, { status, headers });
const RATE_TH = 'ขอสร้างการ์ดถี่เกินไป กรุณารอประมาณหนึ่งนาทีแล้วลองใหม่ คำตอบและการ์ดเดิมของคุณยังอยู่';

function persistenceFailure(req: Request, e: unknown): NextResponse {
  if (e instanceof PersistenceError && e.code === 'GUEST_VERIFICATION_REQUIRED') {
    // An unverifiable capability grants nothing; clear it so the next request
    // mints a new owner explicitly. Old server data stays inaccessible.
    const response = json(401, { error: 'GUEST_VERIFICATION_REQUIRED', messageTh: 'สิทธิ์เข้าถึงข้อมูลเดิมใช้ไม่ได้แล้ว กรุณาโหลดหน้าใหม่เพื่อเริ่มสิทธิ์ใหม่ คำตอบในเครื่องยังอยู่' });
    response.cookies.set(GUEST_COOKIE, '', { path: '/', httpOnly: true, sameSite: 'strict', secure: requiresCloudPersistence() || new URL(req.url).protocol === 'https:', maxAge: 0 });
    return response;
  }
  if (e instanceof PersistenceError && e.status !== 503) {
    return json(e.status, { error: e.code, messageTh: 'สิทธิ์เข้าถึงข้อมูลเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ คำตอบในเครื่องยังอยู่' });
  }
  return json(503, { error: 'PERSISTENCE_UNAVAILABLE', messageTh: 'ระบบบันทึกโควตาและการ์ดยังไม่พร้อม จึงยังไม่สร้างการ์ดใหม่และไม่ได้ใช้โควตา กรุณาลองใหม่ภายหลัง' });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: 'CROSS_SITE', messageTh: 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น' });
  let body: unknown;
  try {
    const raw = await boundedText(req, FRESH_LIMITS.bodyBytes);
    body = JSON.parse(raw);
  } catch (e) { return json(e instanceof BodyLimitError ? 413 : 400, { error: e instanceof BodyLimitError ? 'TOO_LARGE' : 'INVALID_JSON' }); }
  const parsed = FreshCardsRequestSchema.safeParse(body);
  // Field paths only, never echo learner-submitted values.
  if (!parsed.success) return json(400, { error: 'INVALID_INPUT', fields: [...new Set(parsed.error.issues.map(i => i.path.join('.')))].slice(0, 10) });
  try {
    const who = await resolvePrincipal(req);
    const store = await foundationForOwner(who.owner);
    if (!await store.allowRequest('cards')) return who.apply(json(429, { status: 'rate_limited', messageTh: RATE_TH } satisfies FreshCardsResponse));
    const result = await generateFreshCards(store, parsed.data);
    return who.apply(json(STATUS[result.status], result));
  } catch (e) { return persistenceFailure(req, e); }
}

/** Current daily allowance only; never generates or charges. */
export async function GET(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: 'CROSS_SITE' });
  try {
    const who = await resolvePrincipal(req);
    const store = await foundationForOwner(who.owner);
    return who.apply(json(200, { quota: await store.cardQuota() }));
  } catch (e) { return persistenceFailure(req, e); }
}
