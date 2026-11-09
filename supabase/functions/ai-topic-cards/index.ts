// Supabase Edge Function (Deno). Secrets: OMNIROUTE_BASE_URL, OMNIROUTE_API_KEY, OMNIROUTE_MODEL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler, FoundationError } from './handler.ts';

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
};

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Postgres raises named errors (e.g. QUOTA_EXCEEDED, LEDGER_CHANGED) as the message.
const rpc = async (name: string, args: Record<string, unknown>) => {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new FoundationError(error.message);
  return data;
};

Deno.serve(
  createHandler({
    getUser: async (token) => {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, isAnonymous: data.user.is_anonymous === true };
    },
    bindOwner: async (owner) => (await rpc('edu_bind_owner', { p_owner: owner })) as number,
    foundation: (owner, epoch, op, input) => rpc('edu_foundation', { p_owner: owner, p_epoch: epoch, p_op: op, p_input: input }),
    fetchImpl: fetch,
    randomUUID: () => crypto.randomUUID(),
    now: () => new Date(),
    env: {
      baseUrl: env('OMNIROUTE_BASE_URL'),
      apiKey: env('OMNIROUTE_API_KEY'),
      model: env('OMNIROUTE_MODEL'),
    },
  }),
);
