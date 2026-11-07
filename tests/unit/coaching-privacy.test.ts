import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from '@/lib/storage/store';
import { wipeLearnerDataWithCoaching } from '@/lib/advisor/privacy-client';
afterEach(() => vi.unstubAllGlobals());
describe('DEF-01 explicit wipe client seam', () => {
  it('waits for server deletion confirmation before removing local work and never claims offline deletion', async () => {
    const storage = createMemoryStorage();
    storage.setItem('edtech:coaching:x', 'draft'); storage.setItem('external', 'keep');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(wipeLearnerDataWithCoaching(storage)).rejects.toThrow();
    expect(storage.getItem('edtech:coaching:x')).toBe('draft');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: true }))));
    await wipeLearnerDataWithCoaching(storage);
    expect(storage.getItem('edtech:coaching:x')).toBeNull();
    expect(storage.getItem('external')).toBe('keep');
  });
});
