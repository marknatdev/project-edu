import { STORAGE_PREFIX } from '@/lib/storage/store';
export const COACH_INVALIDATION_KEY = `${STORAGE_PREFIX}coaching-invalidation`;
export const COACH_INVALIDATION_EVENT = 'edu-coaching-invalidation';
export type CoachingInvalidation = { action: 'wipe' | 'reset'; topicKey?: string; nonce: string };

export function notifyCoachingInvalidation(action: 'wipe' | 'reset', topicKey?: string): void {
  if (typeof window === 'undefined') return;
  const detail: CoachingInvalidation = { action, topicKey, nonce: crypto.randomUUID() };
  // Same-window listeners run synchronously before local deletion. Storage
  // events notify other tabs, even when the marker is subsequently wiped.
  window.dispatchEvent(new CustomEvent(COACH_INVALIDATION_EVENT, { detail }));
  try { window.localStorage.setItem(COACH_INVALIDATION_KEY, JSON.stringify(detail)); }
  catch { /* Same-window invalidation still works when storage is denied. */ }
}
