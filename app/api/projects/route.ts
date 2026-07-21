import { NextRequest, NextResponse } from 'next/server';
import { getBetaTester } from '@/lib/server/beta-access';
import { privateStorageIsConfigured, supabaseRest } from '@/lib/server/supabase-rest';
import type { SiteProject } from '@/lib/types';

export async function POST(request: NextRequest) {
  if (!privateStorageIsConfigured()) return NextResponse.json({ error: 'Secure private storage is not configured.' }, { status: 503 });
  const tester = getBetaTester(request);
  if (!tester) return NextResponse.json({ error: 'Controlled beta access is required for permanent file storage.' }, { status: 401 });

  const project = await request.json().catch(() => null) as SiteProject | null;
  if (!project?.id || !project.name || !project.primaryQuestion) {
    return NextResponse.json({ error: 'Invalid property investigation payload.' }, { status: 400 });
  }

  await supabaseRest('/rest/v1/site_projects?on_conflict=id', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      id: project.id,
      owner_id: tester.id,
      name: project.name,
      address: project.address || '',
      location_description: project.locationDescription || null,
      parcel_id: project.parcelId || null,
      listing_url: project.listingUrl || null,
      primary_question: project.primaryQuestion,
      intended_use: project.intendedUse || null,
      apparent_current_use: project.apparentCurrentUse || null,
      status: project.status,
      current_stage: project.stage,
      created_at: project.createdAt,
      updated_at: project.updatedAt
    })
  });

  return NextResponse.json({ ok: true, propertyCaseId: project.id });
}
