import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
  env: Record<string, string | undefined> = process.env
): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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
  env: Record<string, string | undefined> = process.env
): boolean {
  return getSupabaseConfig(env) !== null;
}

/**
 * Returns a configured SupabaseClient or null when env variables are not present.
 */
export function getSupabaseClient(
  env: Record<string, string | undefined> = process.env
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
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
      },
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
  env: Record<string, string | undefined> = process.env
): Promise<SignInWithGoogleResult> {
  const client = getSupabaseClient(env);
  if (!client) {
    return {
      success: false,
      client: null,
      error:
        'ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase บนสภาพแวดล้อมนี้ จึงยังไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้ ท่านสามารถใช้งานต่อในโหมด Guest ได้ตามปกติโดยไม่ต้องเข้าสู่ระบบและข้อมูลจะถูกบันทึกไว้ในเครื่องของคุณ',
    };
  }

  try {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      return {
        success: false,
        client,
        error: error.message,
      };
    }

    return {
      success: true,
      client,
    };
  } catch (err) {
    return {
      success: false,
      client,
      error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google OAuth',
    };
  }
}
