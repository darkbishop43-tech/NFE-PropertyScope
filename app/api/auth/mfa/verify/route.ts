import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPrivateResearchState } from '@/lib/security/private-research';

export async function POST(request: Request) {
  const state = await getPrivateResearchState();
  if (!state.authenticated) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { factorId, code } = await request.json().catch(() => ({}));
  if (typeof factorId !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: 'A factor and 6-digit authenticator code are required.' }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Authentication unavailable.' }, { status: 503 });
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  if (error) return NextResponse.json({ error: 'Authenticator verification failed.' }, { status: 401 });
  const updated = await getPrivateResearchState();
  const nextPath = updated.verifiedFactors < updated.minVerifiedFactors ? '/security/mfa/enroll' : updated.currentAal === 'aal2' ? '/dashboard' : '/security/mfa/challenge';
  return NextResponse.json({ ok: true, nextPath, state: updated });
}
