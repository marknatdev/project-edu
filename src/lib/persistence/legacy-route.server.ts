import 'server-only';
import { NextResponse } from 'next/server';
import { requiresCloudPersistence } from './config';
/** Temporary fail-closed gate, NOT a DEF02–04 repair. The serial card/repair
 * successors must replace legacy caller-selected identity/in-memory quota with
 * resolvePrincipal + FoundationStore before removing the corresponding gate. */
export function legacyProductionGate(): NextResponse | null {
  return requiresCloudPersistence() ? NextResponse.json({ error: 'PERSISTENCE_INTEGRATION_PENDING',
    messageTh: 'ส่วนนี้ยังไม่พร้อมบนคลาวด์ งานที่บันทึกในเครื่องยังอยู่' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) : null;
}
