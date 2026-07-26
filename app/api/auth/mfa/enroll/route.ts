import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPrivateResearchState } from '@/lib/security/private-research';

export async function POST(request: Request) {
  const state = await getPrivateResearchState();
  if (!state.authenticated) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { friendlyName } = await request.json().catch(() => ({}));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Authentication unavailable.' }, { status: 503 });
  const label = typeof friendlyName === 'string' && friendlyName.trim() ? friendlyName.trim().slice(0, 64) : 'PropertyScope authenticator';
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: label });
  if (error || !data?.totp) return NextResponse.json({ error: error?.message ?? 'Unable to begin MFA enrollment.' }, { status: 400 });
  return NextResponse.json({ factorId: data.id, friendlyName: data.friendly_name ?? label, qrCode: data.totp.qr_code, secret: data.totp.secret, requiredFactors: state.minVerifiedFactors, currentVerifiedFactors: state.verifiedFactors });
}
