import { NextResponse } from 'next/server';
import { boundedText, BodyLimitError } from '@/lib/http/bounded-body';
import { resolvePrincipal, GUEST_COOKIE, SIGN_IN_AGAIN_TH } from '@/lib/auth/principal.server';
import { sameOrigin } from '@/lib/auth/paths';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { PersistenceError } from '@/lib/persistence/contracts';
import { requiresCloudPersistence } from '@/lib/persistence/config';
import { CoachRequestSchema } from '@/lib/advisor/coach-dto';
import { coachingOperation, CoachingError, wipeCoaching } from '@/lib/advisor/coaching-store.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers });
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น');
  let body: unknown;
  try {
    const raw = await boundedText(req, 65536);
    body = JSON.parse(raw);
  } catch (e) { return error(e instanceof BodyLimitError ? 413 : 400, e instanceof BodyLimitError ? 'ข้อมูลยาวเกินไป' : 'Invalid JSON body'); }
  const parsed = CoachRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, 'Invalid input or disallowed fields detected');
  try {
    const who = await resolvePrincipal(req);
    const store = await foundationForOwner(who.owner);
    if (!await store.allowRequest('coach')) return who.apply(error(429,'คำขอถี่เกินไป กรุณารอสักครู่ ข้อความในเครื่องยังอยู่'));
    const conversation = await coachingOperation(store, parsed.data);
    const response = NextResponse.json({ turn: conversation.turn, conversation }, { headers });
    return who.apply(response);
  } catch (e) {
    if (e instanceof CoachingError) return error(e.status, e.message);
    if (e instanceof PersistenceError && e.code === 'GUEST_VERIFICATION_REQUIRED') {
      // An unverifiable capability (tampered, or issued under a rotated secret)
      // grants nothing; clear it so the next request mints a fresh owner instead
      // of a permanent 401. Its old server data stays inaccessible.
      const response = error(401, 'สิทธิ์เข้าถึงบทสนทนาเดิมใช้ไม่ได้แล้ว กดเชื่อมต่อเพื่อเริ่มสิทธิ์ใหม่ ฉบับร่างในเครื่องยังอยู่');
      response.cookies.set(GUEST_COOKIE, '', { path: '/', httpOnly: true, sameSite: 'strict', secure: requiresCloudPersistence() || new URL(req.url).protocol === 'https:', maxAge: 0 });
      return response;
    }
    if (e instanceof PersistenceError && e.status !== 503) return error(e.status, e.status === 401 ? SIGN_IN_AGAIN_TH : e.status === 409 ? 'บทสนทนาเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด ข้อความของคุณยังอยู่' : 'สิทธิ์เข้าถึงบทสนทนาเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่');
    return error(503, 'บันทึกบทสนทนาไม่ได้ในขณะนี้ กรุณาลองใหม่ ข้อความในเครื่องยังอยู่');
  }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return error(403, 'ไม่อนุญาตคำขอจากเว็บไซต์อื่น');
  try {
    const who = await resolvePrincipal(req, { ignoreWorkspace: true, allowUndecided: true });
    try { await wipeCoaching(await foundationForOwner(who.owner)); }
    catch (e) { if (!(e instanceof PersistenceError && e.status === 410)) throw e; }
    // A signed-in browser may also hold pre-login Guest work; erase both only
    // on this explicit wipe, never by implicit login/import or logout.
    if (who.kind === 'account' && req.headers.get('cookie')?.includes(GUEST_COOKIE + '=')) {
      const guest = await resolvePrincipal(req, { guestOnly: true });
      try { await wipeCoaching(await foundationForOwner(guest.owner)); }
      catch (e) { if (!(e instanceof PersistenceError && e.status === 410)) throw e; }
    }
    const response = NextResponse.json({ deleted: true }, { headers });
    response.cookies.set(GUEST_COOKIE, '', { path: '/', httpOnly: true, sameSite: 'strict', secure: new URL(req.url).protocol === 'https:', maxAge: 0 });
    return who.kind === 'account' ? who.apply(response) : response;
  } catch { return error(503, 'ยังลบบทสนทนาบนเซิร์ฟเวอร์ไม่ได้ กรุณาเชื่อมต่อแล้วลองใหม่'); }
}
