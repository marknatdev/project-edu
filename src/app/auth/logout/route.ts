import { NextResponse } from 'next/server';
import { requestSupabase } from '@/lib/supabase/server';
import { sameOrigin } from '@/lib/auth/paths';
import { admitAuth } from '@/lib/auth/admission.server';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  if (!sameOrigin(req, true)) return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  try {
    const who=await admitAuth(req);
    const context = requestSupabase(req);
    const { error } = await context.client.auth.signOut({ scope: 'local' });
    if (error) throw Error('AUTH_UNAVAILABLE');
    // Deliberately do not erase local drafts, guest capability or app records.
    const response=context.apply(NextResponse.json({ signedOut: true }));
    return who?who.apply(response):response;
  } catch { return NextResponse.json({ error: 'AUTH_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
