import { resolvePrincipal } from '@/lib/auth/principal.server';
import { foundationForOwner } from '@/lib/persistence/factory.server';
import { invalidInput, json, ownerFailure, readBody } from '@/lib/persistence/owner-route.server';
import { PivotError, PivotRequestSchema, pivotOperation } from '@/lib/pivot/pivot-store.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNAVAILABLE_TH = 'บันทึกความคืบหน้าห้องปรับมุมมองไม่ได้ในขณะนี้ กรุณาลองใหม่ คำถามระดับ 1 และงานในเครื่องยังอยู่';

/** DEF-02/03/04: owner from verified session/signed Guest capability only;
 * progression is server state; no evaluate/proposal allowance is consumed. */
export async function POST(req: Request) {
  const read = await readBody(req);
  if ('response' in read) return read.response;
  const parsed = PivotRequestSchema.safeParse(read.body);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  try {
    const who = await resolvePrincipal(req);
    const store = await foundationForOwner(who.owner);
    try {
      const pivot = await pivotOperation(store, parsed.data, () => store.allowRequest('pivot'));
      return who.apply(json(200, { pivot }));
    } catch (e) {
      if (e instanceof PivotError) return who.apply(json(e.status, { error: e.code, messageTh: e.message, pivot: e.pivot }));
      throw e;
    }
  } catch (e) { return ownerFailure(req, e, UNAVAILABLE_TH); }
}
