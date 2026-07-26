import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PrivateResearchState = {
  authenticated: boolean;
  userId?: string;
  email?: string;
  role?: 'researcher' | 'admin' | 'owner';
  status?: 'pending' | 'active' | 'inactive' | 'revoked';
  liveResearchEnabled: boolean;
  verifiedFactors: number;
  minVerifiedFactors: number;
  currentAal: 'aal1' | 'aal2' | null;
  databaseGatePassed: boolean;
  liveResearchAuthorized: boolean;
  reason: string;
};

type Snapshot = {
  user_id: string;
  role: PrivateResearchState['role'];
  status: PrivateResearchState['status'];
  live_research_enabled: boolean;
  mfa_required: boolean;
  min_verified_factors: number;
  expires_at: string | null;
  database_gate_passed: boolean;
};

function aal(value: unknown): 'aal1' | 'aal2' | null {
  return value === 'aal1' || value === 'aal2' ? value : null;
}

export async function getPrivateResearchState(): Promise<PrivateResearchState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { authenticated: false, liveResearchEnabled: false, verifiedFactors: 0, minVerifiedFactors: 1, currentAal: null, databaseGatePassed: false, liveResearchAuthorized: false, reason: 'unauthenticated' };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { authenticated: false, liveResearchEnabled: false, verifiedFactors: 0, minVerifiedFactors: 1, currentAal: null, databaseGatePassed: false, liveResearchAuthorized: false, reason: 'unauthenticated' };

  const { data: rows, error: authError } = await supabase.rpc('private_research_authorization_snapshot');
  const snapshot = Array.isArray(rows) ? rows[0] as Snapshot | undefined : undefined;
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verifiedFactors = [...(factors?.totp ?? []), ...(factors?.phone ?? [])].filter((factor) => factor.status === 'verified').length;
  const currentAal = aal(aalData?.currentLevel);

  if (authError || !snapshot) {
    return { authenticated: true, userId: userData.user.id, email: userData.user.email ?? '', liveResearchEnabled: false, verifiedFactors, minVerifiedFactors: 1, currentAal, databaseGatePassed: false, liveResearchAuthorized: false, reason: 'authorization_missing' };
  }

  const minimum = Math.max(1, Number(snapshot.min_verified_factors) || 1);
  const factorGate = !snapshot.mfa_required || verifiedFactors >= minimum;
  const authorized = Boolean(snapshot.database_gate_passed && factorGate);
  let reason = 'authorized';
  if (snapshot.status !== 'active') reason = 'authorization_not_active';
  else if (!snapshot.live_research_enabled) reason = 'live_research_disabled';
  else if (snapshot.mfa_required && verifiedFactors < minimum) reason = 'mfa_enrollment_required';
  else if (snapshot.mfa_required && currentAal !== 'aal2') reason = 'mfa_challenge_required';
  else if (!authorized) reason = 'denied';

  return {
    authenticated: true,
    userId: userData.user.id,
    email: userData.user.email ?? '',
    role: snapshot.role,
    status: snapshot.status,
    liveResearchEnabled: snapshot.live_research_enabled,
    verifiedFactors,
    minVerifiedFactors: minimum,
    currentAal,
    databaseGatePassed: snapshot.database_gate_passed,
    liveResearchAuthorized: authorized,
    reason,
  };
}

export async function requirePrivateLiveResearch() {
  const state = await getPrivateResearchState();
  if (!state.authenticated) throw new Error('UNAUTHENTICATED');
  if (!state.liveResearchAuthorized) throw new Error(`LIVE_RESEARCH_DENIED:${state.reason}`);
  return state;
}
