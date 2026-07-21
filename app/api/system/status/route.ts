import { NextResponse } from 'next/server';
import { controlledBetaIsConfigured } from '@/lib/server/beta-access';
import { privateStorageIsConfigured } from '@/lib/server/supabase-rest';
import { getConfiguredNfeConnectionState, ACTIVE_NFE_ADAPTER_VERSION } from '@/lib/adapters/nfe-os';
import { PROPERTY_SCOPE_BUILD_ID, PROPERTY_SCOPE_VERSION } from '@/lib/version';
import type { PublicSystemStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const storageConfigured = privateStorageIsConfigured();
  const betaConfigured = controlledBetaIsConfigured();
  const connection = getConfiguredNfeConnectionState();
  const status: PublicSystemStatus = {
    version: PROPERTY_SCOPE_VERSION,
    buildId: PROPERTY_SCOPE_BUILD_ID,
    storageMode: storageConfigured && betaConfigured ? 'SUPABASE_PRIVATE' : 'LOCAL_PREVIEW_ONLY',
    secureUploadsEnabled: storageConfigured && betaConfigured,
    controlledBetaGate: betaConfigured,
    nfe: connection,
    hdp: connection,
    rrs: connection,
    adapterVersion: ACTIVE_NFE_ADAPTER_VERSION
  };
  return NextResponse.json(status, { headers: { 'cache-control': 'no-store' } });
}
