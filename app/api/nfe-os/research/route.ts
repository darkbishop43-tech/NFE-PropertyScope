import { NextRequest, NextResponse } from 'next/server';
import {
  executeProtectedResearch,
  ProtectedResearchError,
  type PropertyScopeProtectedRequest,
  type ProtectedResearchOperation
} from '@/lib/server/nfe-os-protected';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPERATIONS: ProtectedResearchOperation[] = ['nfe.analysis', 'hdp.discovery', 'rrs.review'];

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: { code: 'CROSS_ORIGIN_BLOCKED', message: 'Cross-origin protected analysis requests are not allowed.', retryable: false } }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: { code: 'INVALID_ORIGIN', message: 'Protected analysis request origin is invalid.', retryable: false } }, { status: 403 });
    }
  }
  let body: PropertyScopeProtectedRequest;
  try {
    body = await request.json() as PropertyScopeProtectedRequest;
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'A valid PropertyScope analysis request is required.', retryable: false } }, { status: 400 });
  }

  if (!OPERATIONS.includes(body.operation) || !body.payload?.realEstateCaseId) {
    return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'A supported operation and PropertyScope case ID are required.', retryable: false } }, { status: 400 });
  }

  try {
    const result = await executeProtectedResearch(body);
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
    });
  } catch (error) {
    const failure = error instanceof ProtectedResearchError
      ? error
      : new ProtectedResearchError('Protected analysis failed. Property data has been preserved.', 500, 'PROPERTYSCOPE_ANALYSIS_FAILURE');

    return NextResponse.json({
      caseId: body.payload.realEstateCaseId,
      executionStatus: 'failed',
      validationStatus: 'not_completed',
      outcome: 'service_failure',
      result: null,
      error: {
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
        ...(failure.diagnostic ? { diagnostic: failure.diagnostic } : {})
      }
    }, {
      status: failure.status,
      headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
    });
  }
}
