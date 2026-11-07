'use client';

import { useEffect, useState } from 'react';
import { COACH_INVALIDATION_EVENT, COACH_INVALIDATION_KEY, type CoachingInvalidation } from '@/lib/advisor/coaching-invalidation';
import { WIPE_GENERATION_KEY } from './store';

/** True once learner data is wiped in this or another tab. Writers must ALSO pass
 * a captured generation: events can be missed, the store fence cannot. */
export function useWipeInvalidation(): [wiped: boolean, markWiped: () => void] {
  const [wiped, setWiped] = useState(false);
  useEffect(() => {
    const wipe = () => setWiped(true);
    const custom = (event: Event) => { if ((event as CustomEvent<CoachingInvalidation>).detail?.action === 'wipe') wipe(); };
    const storage = (event: StorageEvent) => {
      if (event.key === COACH_INVALIDATION_KEY && event.newValue) {
        try { if (JSON.parse(event.newValue)?.action === 'wipe') wipe(); } catch { /* Not an authority token. */ }
      }
      if (event.key === WIPE_GENERATION_KEY || event.key === null) wipe();
    };
    window.addEventListener(COACH_INVALIDATION_EVENT, custom);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(COACH_INVALIDATION_EVENT, custom);
      window.removeEventListener('storage', storage);
    };
  }, []);
  return [wiped, () => setWiped(true)];
}
