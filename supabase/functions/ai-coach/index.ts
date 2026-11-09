// Supabase Edge Function (Deno). Secrets: OMNIROUTE_BASE_URL, OMNIROUTE_API_KEY, OMNIROUTE_MODEL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler } from './handler.ts';

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
};

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(
  createHandler({
    getUser: async (token) => {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, isAnonymous: data.user.is_anonymous === true };
    },
    admit: async (ownerKey) => {
      const { data, error } = await admin.rpc('edu_rate_admission', { p_owner: ownerKey, p_kind: 'coach' });
      return !error && data === true;
    },
    fetchImpl: fetch,
    env: {
      baseUrl: env('OMNIROUTE_BASE_URL'),
      apiKey: env('OMNIROUTE_API_KEY'),
      model: env('OMNIROUTE_MODEL'),
    },
  }),
);
