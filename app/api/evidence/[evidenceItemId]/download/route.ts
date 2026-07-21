import { NextRequest, NextResponse } from 'next/server';
import { getBetaTester } from '@/lib/server/beta-access';
import { createSignedObjectUrl, privateStorageIsConfigured, supabaseRest } from '@/lib/server/supabase-rest';

export async function GET(request: NextRequest, context: { params: Promise<{ evidenceItemId: string }> }) {
  if (!privateStorageIsConfigured()) return NextResponse.json({ error: 'Secure private storage is not configured.' }, { status: 503 });
  const tester = getBetaTester(request);
  if (!tester) return NextResponse.json({ error: 'Controlled beta access is required.' }, { status: 401 });
  const { evidenceItemId } = await context.params;

  const assets = await supabaseRest<Array<{ project_id: string; storage_object_reference: string }>>(
    `/rest/v1/property_assets?id=eq.${encodeURIComponent(evidenceItemId)}&select=project_id,storage_object_reference&limit=1`
  );
  const asset = assets[0];
  if (!asset) return NextResponse.json({ error: 'Evidence item not found.' }, { status: 404 });

  const projects = await supabaseRest<Array<{ owner_id: string }>>(
    `/rest/v1/site_projects?id=eq.${encodeURIComponent(asset.project_id)}&select=owner_id&limit=1`
  );
  if (!projects[0] || projects[0].owner_id !== tester.id) {
    return NextResponse.json({ error: 'This tester cannot access the requested evidence.' }, { status: 403 });
  }

  const signedUrl = await createSignedObjectUrl(asset.storage_object_reference, 300);
  return NextResponse.json({ signedUrl, expiresIn: 300 }, { headers: { 'cache-control': 'no-store' } });
}
