type Env = Record<string, string | undefined>;
export function requiresCloudPersistence(env: Env = process.env): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL === '1' || Boolean(env.AWS_LAMBDA_FUNCTION_NAME);
}
/** No network, secret values, or DB creation at import/build time. */
export function selectPersistenceBackend(env: Env = process.env): 'supabase' | 'sqlite' {
  const backend = env.PERSISTENCE_BACKEND || (requiresCloudPersistence(env) ? 'supabase' : 'sqlite');
  if (backend === 'sqlite' && !requiresCloudPersistence(env)) return 'sqlite';
  if (backend === 'supabase' && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase';
  throw new Error('PERSISTENCE_UNAVAILABLE');
}
