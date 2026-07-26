import { NextResponse } from 'next/server';
import type { HdpRequest, RealEstateNfePayload, RrsRequest } from '@/lib/adapters/nfe-os';
import { requirePrivateLiveResearch } from '@/lib/security/private-research';
import { RemoteNfeOsAdapter, RemoteNfeOsRejectedError, RemoteNfeOsServiceError } from '@/lib/server/remote-nfe-os-adapter';

export const maxDuration = 300;

type RequestBody =
  | { operation: 'nfe.analysis'; input: RealEstateNfePayload }
  | { operation: 'hdp.discovery'; input: HdpRequest }
  | { operation: 'rrs.review'; input: RrsRequest };

export async function POST(request: Request) {
  try {
    // Gate A: signed-in identity + protected Postgres authorization + required MFA.
    // The browser never supplies or receives the PLATFORM service credential.
    await requirePrivateLiveResearch();

    const body = await request.json() as RequestBody;
    if (!body || !['nfe.analysis', 'hdp.discovery', 'rrs.review'].includes(body.operation)) {
      return NextResponse.json({ error: 'A supported NFE-OS operation is required.' }, { status: 400 });
    }

    // Gate B lives only inside the server-only RemoteNfeOsAdapter.
    const adapter = new RemoteNfeOsAdapter();
    if (body.operation === 'nfe.analysis') {
      const result = await adapter.runNfeAnalysis(body.input);
      return NextResponse.json({ operation: body.operation, status: 'accepted', result });
    }
    if (body.operation === 'hdp.discovery') {
      const result = await adapter.runHdp(body.input);
      return NextResponse.json({ operation: body.operation, status: 'accepted', result });
    }
    const result = await adapter.runRrs(body.input);
    return NextResponse.json({ operation: body.operation, status: 'accepted', result });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('LIVE_RESEARCH_DENIED:')) {
      return NextResponse.json({ error: 'PRIVATE LIVE RESEARCH authorization is required.', authorization: 'denied' }, { status: 403 });
    }
    if (error instanceof RemoteNfeOsRejectedError) {
      return NextResponse.json({ operation: error.operation, status: 'rejected', result: null, provenance: error.provenance, error: 'The authoritative NFE-OS validator rejected this run.' }, { status: error.httpStatus });
    }
    if (error instanceof RemoteNfeOsServiceError) {
      return NextResponse.json({ operation: error.operation, status: 'failed', result: null, provenance: error.provenance, error: error.message }, { status: error.httpStatus });
    }
    return NextResponse.json({ status: 'failed', result: null, error: 'NFE-OS analysis could not be completed. Property data remains preserved.' }, { status: 502 });
  }
}
