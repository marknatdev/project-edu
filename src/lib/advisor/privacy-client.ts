import { notifyCoachingInvalidation } from './coaching-invalidation';
import { deleteServerCoaching } from './coach-client';
import { wipeAllLearnerData, type StorageAdapter } from '@/lib/storage/store';

/** Do not erase the cookie/local handles before the server confirms deletion. */
export async function wipeLearnerDataWithCoaching(storage?: StorageAdapter): Promise<void> {
  await deleteServerCoaching();
  notifyCoachingInvalidation('wipe');
  wipeAllLearnerData(storage);
}
