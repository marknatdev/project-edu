import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectPersistenceBackend } from '@/lib/persistence/config';

afterEach(() => vi.unstubAllEnvs());
describe('foundation backend selection (public configuration seam)', () => {
  it('never uses a local database on production/serverless, including explicit sqlite overrides', () => {
    expect(() => selectPersistenceBackend({ NODE_ENV: 'production' })).toThrow('PERSISTENCE_UNAVAILABLE');
    expect(() => selectPersistenceBackend({ VERCEL: '1', PERSISTENCE_BACKEND: 'sqlite' })).toThrow('PERSISTENCE_UNAVAILABLE');
  });
});
