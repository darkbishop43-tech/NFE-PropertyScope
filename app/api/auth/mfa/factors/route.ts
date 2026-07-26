import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPrivateResearchState } from '@/lib/security/private-research';

export async function GET() {
  const state = await getPrivateResearchState();
  if (!state.authenticated) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Authentication unavailable.' }, { status: 503 });
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return NextResponse.json({ error: 'Unable to read MFA factors.' }, { status: 502 });
  const factors = [...(data?.totp ?? []), ...(data?.phone ?? [])].map((factor) => ({ id: factor.id, type: factor.factor_type, status: factor.status, friendlyName: factor.friendly_name ?? 'Authenticator' }));
  return NextResponse.json({ factors, state });
}
