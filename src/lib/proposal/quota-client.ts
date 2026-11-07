import { DAILY_LIMITS, getQuotaExceededMessage } from '@/lib/ai/quota';
import { appFetch } from '@/lib/auth/workspace-client';

export interface ProposalQuotaStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  messageTh?: string;
  /** Server could not be reached/verified: NOT a fresh allowance. */
  unavailable?: boolean;
  /** Server owner/workspace changed or was erased (401/403/409/410): never create from erased sources. */
  ownerChanged?: boolean;
}

/**
 * DEF-04: the proposal allowance (2/day) lives on the server, bound to the
 * verified account or signed Guest capability. The browser keeps no counter and
 * sends no identity. Viewing and manual editing never call this.
 */
const UNAVAILABLE_TH = 'ยังตรวจโควตาสร้างข้อเสนอใหม่บนเซิร์ฟเวอร์ไม่ได้ งานที่บันทึกในเครื่องยังอยู่และแก้ไขเองได้ กรุณาเชื่อมต่อแล้วลองใหม่';
const OWNER_CHANGED_TH = 'สิทธิ์หรือพื้นที่งานบนเซิร์ฟเวอร์เปลี่ยนแล้ว จึงยังไม่สร้างโครงงานใหม่ กรุณาโหลดหน้าใหม่';

async function call(body: object): Promise<ProposalQuotaStatus> {
  try {
    const response = await appFetch('/api/ai/proposal', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as Partial<ProposalQuotaStatus>;
    if ((response.ok || response.status === 429) && typeof data.allowed === 'boolean' && typeof data.remaining === 'number') {
      return { allowed: data.allowed, remaining: data.remaining, limit: DAILY_LIMITS.proposal, resetAt: String(data.resetAt ?? ''),
        messageTh: data.allowed ? undefined : data.messageTh ?? getQuotaExceededMessage('proposal') };
    }
    if ([401, 403, 409, 410].includes(response.status)) {
      return { allowed: false, unavailable: true, ownerChanged: true, remaining: 0, limit: DAILY_LIMITS.proposal, resetAt: '', messageTh: OWNER_CHANGED_TH };
    }
  } catch { /* offline: fall through */ }
  return { allowed: false, unavailable: true, remaining: 0, limit: DAILY_LIMITS.proposal, resetAt: '', messageTh: UNAVAILABLE_TH };
}

export function checkProposalQuota(): Promise<ProposalQuotaStatus> {
  return call({ action: 'check' });
}

/** One user action = one requestId; a retry of the same action reuses it. */
export function consumeProposalQuota(requestId: string = crypto.randomUUID()): Promise<ProposalQuotaStatus> {
  return call({ action: 'consume', requestId });
}
