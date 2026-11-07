import { createBrowserClient } from '@supabase/ssr';
import { appFetch } from '@/lib/auth/workspace-client';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Statically analyzable references: Next replaces these in browser bundles. */
export function publicSupabaseEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SignInWithGoogleResult {
  success: boolean;
  client: SupabaseClient | null;
  error?: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey: string | null = null;

/**
 * Resets memoized Supabase client for unit testing.
 */
export function resetSupabaseClientForTesting(): void {
  cachedClient = null;
  cachedConfigKey = null;
}

/**
 * Resolves Supabase configuration from environment variables or explicit override.
 */
export function getSupabaseConfig(
  env: Record<string, string | undefined> = publicSupabaseEnv()
): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

/**
 * Checks whether Supabase environment variables are configured.
 */
export function isSupabaseConfigured(
  env: Record<string, string | undefined> = publicSupabaseEnv()
): boolean {
  return getSupabaseConfig(env) !== null;
}

/**
 * Returns a configured SupabaseClient or null when env variables are not present.
 */
export function getSupabaseClient(
  env: Record<string, string | undefined> = publicSupabaseEnv()
): SupabaseClient | null {
  const config = getSupabaseConfig(env);
  if (!config) {
    return null;
  }

  const configKey = `${config.url}:${config.anonKey}`;
  if (cachedClient && cachedConfigKey === configKey) {
    return cachedClient;
  }

  try {
    cachedClient = createBrowserClient(config.url, config.anonKey, {
      isSingleton: false,
      auth: { autoRefreshToken: false, detectSessionInUrl: false },
    });
    cachedConfigKey = configKey;
    return cachedClient;
  } catch (err) {
    console.warn('[SupabaseClient] Initialization failed:', err);
    return null;
  }
}

/**
 * Triggers Google OAuth sign-in if configured.
 * When unconfigured, returns an informative Thai message and allows Guest Mode to continue.
 */
export async function signInWithGoogle(
  env: Record<string, string | undefined> = publicSupabaseEnv(), next?: string
): Promise<SignInWithGoogleResult> {
  const config = getSupabaseConfig(env);
  if (!config || typeof window === 'undefined') return { success: false, client: null,
    error: 'ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase จึงยังเข้าสู่ระบบไม่ได้ คุณใช้งานต่อในโหมด Guest ได้ งานในเครื่องยังอยู่' };
  try {
    const response = await appFetch('/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next: next ?? window.location.pathname + window.location.search }) });
    const body = await response.json();
    if (!response.ok || typeof body.url !== 'string') throw Error('AUTH_UNAVAILABLE');
    const url = new URL(body.url);
    if (url.origin !== new URL(config.url).origin || url.pathname !== '/auth/v1/authorize') throw Error('AUTH_UNAVAILABLE');
    window.location.assign(url.href);
    return { success: true, client: null };
  } catch { return { success: false, client: null, error: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่หรือใช้งานต่อในโหมด Guest งานในเครื่องยังอยู่' }; }
}
export async function signOut(): Promise<boolean> {
  try { return (await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })).ok; }
  catch { return false; }
}
