import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  getSupabaseClient,
  signInWithGoogle,
  resetSupabaseClientForTesting,
} from '@/lib/supabase/client';

describe('Supabase Client (src/lib/supabase/client.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetSupabaseClientForTesting();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    resetSupabaseClientForTesting();
  });

  describe('Seam: Configuration & graceful fallback when unconfigured', () => {
    it('prefers the publishable key while retaining the anon-key compatibility alias', () => {
      expect(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://ppctndzkerwiokjfaklw.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'old-key' }))
        .toEqual({ url: 'https://ppctndzkerwiokjfaklw.supabase.co', anonKey: 'sb_publishable_test' });
    });
    it('detects missing configuration when env vars are absent', () => {
      expect(isSupabaseConfigured()).toBe(false);
      expect(getSupabaseConfig()).toBeNull();
      expect(getSupabaseClient()).toBeNull();
    });

    it('returns informative Thai explanation on signInWithGoogle() when unconfigured', async () => {
      const result = await signInWithGoogle();
      expect(result.success).toBe(false);
      expect(result.client).toBeNull();
      expect(result.error).toContain('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
      expect(result.error).toContain('งานในเครื่องยังอยู่');
    });

    it('detects valid configuration when env vars are present', () => {
      const mockEnv = {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example-project.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key-12345',
      };

      expect(isSupabaseConfigured(mockEnv)).toBe(true);
      const config = getSupabaseConfig(mockEnv);
      expect(config).toEqual({
        url: 'https://example-project.supabase.co',
        anonKey: 'mock-anon-key-12345',
      });
      const client = getSupabaseClient(mockEnv);
      expect(client).not.toBeNull();
    });
  });
});
