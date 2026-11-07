import { CoachEnvelopeSchema, type CoachApiRequest, type CoachConversation } from './coach-dto';
import { appFetch } from '@/lib/auth/workspace-client';
import type { CoachTurnResult } from './coach-contract';
export interface CoachApiResponse {
  success: boolean;
  data?: CoachTurnResult;
  conversation?: CoachConversation;
  error?: string;
  status?: number;
}
let inTabQueue = Promise.resolve<unknown>(undefined);

export async function fetchCoachTurn(params: CoachApiRequest, signal?: AbortSignal): Promise<CoachApiResponse> {
  // Web Locks covers StrictMode/effect replay and first-use requests in other
  // tabs; the next operation sees the HttpOnly cookie set by its predecessor.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('edu-coaching-owner', { signal }, () => { signal?.throwIfAborted(); return sendCoachTurn(params); }).catch(() => ({ success: false, error: 'หน้าสนทนานี้หยุดทำงานแล้ว' }));
  }
  // In insecure contexts (e.g. plain HTTP over local network IP) or environments
  // without Web Locks, serialize requests locally in this tab so concurrent
  // React effects/submits don't race internally. Cross-tab owner cookie minting
  // is handled by SQLite CAS / cookie headers without failing closed.
  const execute = () => signal?.aborted ? Promise.resolve({ success: false, error: 'หน้าสนทนานี้หยุดทำงานแล้ว' }) : sendCoachTurn(params);
  const queued = inTabQueue.then(execute, execute);
  inTabQueue = queued;
  return queued as Promise<CoachApiResponse>;
}
async function sendCoachTurn(params: CoachApiRequest): Promise<CoachApiResponse> {
  try {
    const res = await appFetch('/api/ai/coach', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
    });
    const json: unknown = await res.json();
    if (!res.ok) return { success: false, status: res.status,
      error: typeof json === 'object' && json && 'error' in json ? String(json.error) : 'เชื่อมต่อบทสนทนาไม่ได้ กรุณาลองใหม่' };
    const parsed = CoachEnvelopeSchema.safeParse(json);
    if (!parsed.success) return { success: false, error: 'ข้อมูลบทสนทนาจากเซิร์ฟเวอร์ไม่สมบูรณ์ ข้อความของคุณยังอยู่' };
    return { success: true, data: parsed.data.turn, conversation: parsed.data.conversation };
  } catch {
    return { success: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ เก็บข้อความเป็นฉบับร่างแล้ว' };
  }
}
export async function deleteServerCoaching(): Promise<void> {
  const response = await appFetch('/api/ai/coach', { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('ยังลบบทสนทนาบนเซิร์ฟเวอร์ไม่ได้ กรุณาเชื่อมต่อแล้วลองใหม่');
  const body = await response.json();
  if (body.deleted !== true) throw new Error('เซิร์ฟเวอร์ยังไม่ยืนยันการลบบทสนทนา');
}
