import { NextRequest, NextResponse } from 'next/server';
import {
  SAFE_CORRELATION_CONTRACT_VERSION,
  generateCallerRequestId
} from '@/lib/server/nfe-os-protected';
import {
  createVercelTrustedSourceFetch,
  requireVercelOidcToken,
  TrustedSourceAuthError
} from '@/lib/server/vercel-trusted-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYNTHETIC_CASE_ID = 'synthetic-zero-provider-case-20260810';
const SYNTHETIC_INVALID_NFE_BEARER = 'synthetic-invalid-nfe-bearer-zero-provider';

type JsonRecord = Record<string, unknown>;

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function comparison(value: unknown, expected: string) {
  const actual = stringValue(value);
  if (!actual) return 'ABSENT';
  return actual === expected ? 'MATCH' : 'MISMATCH';
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ probe: 'DISABLED_OUTSIDE_PREVIEW' }, { status: 404 });
  }

  const serviceUrl = String(process.env.NFE_RESEARCH_SERVICE_URL || '').trim();
  if (!/^https:\/\//i.test(serviceUrl)) {
    return NextResponse.json({ probe: 'CONFIGURATION_UNAVAILABLE' }, { status: 503 });
  }

  let oidcToken: string;
  try {
    oidcToken = requireVercelOidcToken(request.headers);
  } catch (error) {
    return NextResponse.json({
      probeCount: 0,
      classification: error instanceof TrustedSourceAuthError ? error.code : 'TRUSTED_SOURCE_AUTH_UNAVAILABLE',
      downstreamRequest: 'NOT_SENT'
    }, { status: 503 });
  }

  const callerRequestId = generateCallerRequestId();
  const trustedFetch = createVercelTrustedSourceFetch(oidcToken);

  let response: Response;
  try {
    response = await trustedFetch(serviceUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${SYNTHETIC_INVALID_NFE_BEARER}`
      },
      body: JSON.stringify({
        operation: 'nfe.analysis',
        caseId: SYNTHETIC_CASE_ID,
        correlation: {
          contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
          callerRequestId
        },
        input: {
          source: 'Synthetic zero-provider transport probe. No property content.'
        },
        options: { runwayMode: 'standard' }
      }),
      cache: 'no-store'
    });
  } catch {
    return NextResponse.json({
      probeCount: 1,
      http: 'NO_RESPONSE',
      responseType: 'OTHER',
      providerExecution: 'ZERO',
      classification: 'TRANSPORT_FAILURE'
    }, { status: 200 });
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');
  const data = isJson ? await response.json().catch(() => null) as JsonRecord | null : null;

  if (!data) {
    return NextResponse.json({
      probeCount: 1,
      http: response.status,
      responseType: isJson ? 'OTHER' : 'HTML_OR_OTHER',
      providerExecution: response.status === 401 ? 'ZERO' : 'NOT_PROVEN',
      classification: 'DEPLOYMENT_ROUTING_INTERCEPTION'
    }, { status: 200 });
  }

  const correlation = data.correlation && typeof data.correlation === 'object' && !Array.isArray(data.correlation)
    ? data.correlation as JsonRecord
    : null;
  const topRequestId = stringValue(data.requestId);
  const correlationRequestId = correlation ? stringValue(correlation.requestId) : null;
  const correlationComplete = Boolean(
    correlation
    && correlation.contractVersion === SAFE_CORRELATION_CONTRACT_VERSION
    && comparison(correlation.callerRequestId, callerRequestId) === 'MATCH'
    && topRequestId
    && correlationRequestId === topRequestId
    && comparison(correlation.caseId, SYNTHETIC_CASE_ID) === 'MATCH'
    && correlation.safeResponseGenerated === true
  );

  return NextResponse.json({
    probeCount: 1,
    http: response.status,
    safeError: data.error && typeof data.error === 'object' && !Array.isArray(data.error)
      ? stringValue((data.error as JsonRecord).code) || 'ABSENT'
      : 'ABSENT',
    requestId: topRequestId ? 'PRESENT' : 'ABSENT',
    caseId: stringValue(data.caseId) ? 'PRESENT' : 'ABSENT',
    module: comparison(data.module, 'nfe.analysis'),
    correlation: correlationComplete ? 'COMPLETE' : 'ABSENT',
    contractVersion: correlation
      ? correlation.contractVersion === SAFE_CORRELATION_CONTRACT_VERSION ? 'PASS' : 'FAIL'
      : 'ABSENT',
    callerRequestId: correlation ? comparison(correlation.callerRequestId, callerRequestId) : 'ABSENT',
    correlationRequestId: correlationRequestId
      ? topRequestId && correlationRequestId === topRequestId ? 'MATCH' : 'MISMATCH'
      : 'ABSENT',
    correlationCaseId: correlation ? comparison(correlation.caseId, SYNTHETIC_CASE_ID) : 'ABSENT',
    safeResponseGenerated: correlation
      ? correlation.safeResponseGenerated === true ? 'PASS' : 'FAIL'
      : 'ABSENT',
    failureStage: correlation ? stringValue(correlation.failureStage) || 'ABSENT' : 'ABSENT',
    retryable: correlation && typeof correlation.retryable === 'boolean' ? correlation.retryable : 'ABSENT',
    providerExecution: response.status === 401 ? 'ZERO' : 'NOT_PROVEN',
    responseType: 'EXPECTED_JSON',
    classification: response.status === 401 && correlationComplete
      ? 'TRUSTED_SOURCE_TRANSPORT_PASS'
      : response.status === 401
        ? 'VERCEL_TRUSTED_SOURCE_FEDERATION_DEFECT'
        : 'PLATFORM_RUNTIME_REGRESSION'
  }, {
    status: 200,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  });
}
