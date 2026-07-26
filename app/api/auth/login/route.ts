import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (typeof email !== 'string' || !email.includes('@') || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'A valid email and password are required.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Private research authentication is not configured.' }, { status: 503 });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: 'Unable to sign in with those credentials.' }, { status: 401 });

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = [...(factors?.totp ?? []), ...(factors?.phone ?? [])].filter((factor) => factor.status === 'verified');
  const nextPath = verified.length === 0 ? '/security/mfa/enroll' : aalData?.currentLevel === 'aal2' ? '/dashboard' : '/security/mfa/challenge';
  return NextResponse.json({ ok: true, nextPath });
}
