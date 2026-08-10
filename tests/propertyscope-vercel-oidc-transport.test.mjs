import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const {
  SAFE_CORRELATION_CONTRACT_VERSION,
  executeProtectedResearch
} = await import('../lib/server/nfe-os-protected.ts');
const {
  TrustedSourceAuthError,
  VERCEL_OIDC_REQUEST_HEADER,
  VERCEL_TRUSTED_SOURCE_HEADER,
  createVercelTrustedSourceFetch,
  requireVercelOidcToken
} = await import('../lib/server/vercel-trusted-source.ts');

process.env.NFE_RESEARCH_SERVICE_URL = 'https://synthetic.platform.invalid/api/research';
process.env.NFE_RESEARCH_SERVICE_TOKEN = 'synthetic-nfe-bearer-never-sent';
process.env.PROPERTYSCOPE_PRIVATE_LIVE_RESEARCH = 'true';
process.env.VERCEL_ENV = 'preview';

function protectedRequest(caseId = 'synthetic-property-case-oidc-1234567890') {
  return {
    operation: 'nfe.analysis',
    payload: {
      domain: 'real-estate',
      realEstateCaseId: caseId,
      caseTitle: 'Synthetic OIDC transport case',
      question: 'Synthetic transport proof only.',
      sourceMaterial: 'Synthetic non-property content for deterministic transport proof.',
      evidence: [],
      metadata: {
        submittedAt: '2026-08-10T04:55:00.000Z',
        runCorrelationId: 'synthetic-run-correlation-oidc-1234567890'
      }
    }
  };
}

function acceptedEnvelope(platformBody) {
  const requestId = 'RS-platform-oidc-proof-12345678901234567890';
  return {
    requestId,
    caseId: platformBody.caseId,
    module: platformBody.operation,
    executionStatus: 'accepted',
    validationStatus: 'passed',
    outcome: 'accepted',
    result: { answer: 'Synthetic accepted transport result.' },
    correlation: {
      contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
      callerRequestId: platformBody.correlation.callerRequestId,
      requestId,
      caseId: platformBody.caseId,
      furthestExecutionReceipt: 'PROVIDER_INVOCATION_STARTED',
      safeResponseGenerated: true,
      failureStage: 'NONE',
      retryable: false
    },
    provenance: {
      requestId,
      caseId: platformBody.caseId,
      module: 'NFE Analysis',
      executedAt: '2026-08-10T04:55:01.000Z',
      service: 'NFE-OS Protected Research Service',
      serviceVersion: 'synthetic'
    }
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('request-scoped Vercel OIDC token is read only from the trusted server request header', () => {
  const headers = new Headers({ [VERCEL_OIDC_REQUEST_HEADER]: 'synthetic-request-scoped-oidc-token' });
  assert.equal(requireVercelOidcToken(headers), 'synthetic-request-scoped-oidc-token');
});

test('missing Vercel OIDC fails closed before any downstream fetch can be constructed', () => {
  let downstreamCalls = 0;
  assert.throws(
    () => {
      const token = requireVercelOidcToken(new Headers());
      createVercelTrustedSourceFetch(token, async () => {
        downstreamCalls += 1;
        throw new Error('downstream fetch must not execute');
      });
    },
    (error) => error instanceof TrustedSourceAuthError && error.code === 'TRUSTED_SOURCE_AUTH_UNAVAILABLE'
  );
  assert.equal(downstreamCalls, 0);
});

test('trusted-source transport adds Vercel OIDC and preserves the existing NFE bearer in one downstream fetch', async () => {
  const oidcToken = 'synthetic-request-scoped-oidc-token';
  let downstreamCalls = 0;
  let seenBody;

  const underlyingFetch = async (_url, init) => {
    downstreamCalls += 1;
    const headers = new Headers(init.headers);
    assert.equal(headers.get(VERCEL_TRUSTED_SOURCE_HEADER), oidcToken);
    assert.equal(headers.get('authorization'), 'Bearer synthetic-nfe-bearer-never-sent');
    assert.equal(headers.get('content-type'), 'application/json');
    seenBody = JSON.parse(init.body);
    return response(acceptedEnvelope(seenBody));
  };

  const trustedFetch = createVercelTrustedSourceFetch(oidcToken, underlyingFetch);
  const result = await executeProtectedResearch(protectedRequest(), trustedFetch);

  assert.equal(downstreamCalls, 1);
  assert.equal(seenBody.operation, 'nfe.analysis');
  assert.equal(seenBody.caseId, 'synthetic-property-case-oidc-1234567890');
  assert.equal(seenBody.correlation.contractVersion, SAFE_CORRELATION_CONTRACT_VERSION);
  assert.equal(typeof seenBody.correlation.callerRequestId, 'string');
  assert.equal(Object.prototype.hasOwnProperty.call(seenBody, 'requestId'), false);
  assert.notEqual(result.body.serviceCorrelation.callerRequestId, result.body.requestId);
});

test('server route obtains OIDC before executing protected research and maps OIDC absence to a safe fail-closed class', () => {
  const route = fs.readFileSync('app/api/nfe-os/research/route.ts', 'utf8');
  const readIndex = route.indexOf('requireVercelOidcToken(request.headers)');
  const fetchIndex = route.indexOf('executeProtectedResearch(body, trustedFetch)');
  assert.ok(readIndex >= 0 && fetchIndex > readIndex);
  assert.match(route, /TRUSTED_SOURCE_AUTH_UNAVAILABLE|error\.code/);
  assert.match(route, /Property data has been preserved\./);
});

test('trusted-source transport remains server-only and exposes neither credential to browser application code', () => {
  const helper = fs.readFileSync('lib/server/vercel-trusted-source.ts', 'utf8');
  const route = fs.readFileSync('app/api/nfe-os/research/route.ts', 'utf8');
  const adapter = fs.readFileSync('lib/adapters/nfe-os.ts', 'utf8');
  const workspace = fs.readFileSync('app/sites/[projectId]/page.tsx', 'utf8');
  const intake = fs.readFileSync('app/sites/new/page.tsx', 'utf8');
  const browserSurface = adapter + workspace + intake;

  assert.match(helper + route, /x-vercel-trusted-oidc-idp-token/);
  assert.doesNotMatch(browserSurface, /x-vercel-trusted-oidc-idp-token|x-vercel-oidc-token|NFE_RESEARCH_SERVICE_TOKEN/);
  assert.doesNotMatch(helper + route, /VERCEL_AUTOMATION_BYPASS_SECRET|x-vercel-protection-bypass/);
  assert.doesNotMatch(helper + route, /console\.(log|info|warn|error)/);
});

test('current photo intake remains unchanged and PDF DOCX remain outside this release', () => {
  const intake = fs.readFileSync('app/sites/new/page.tsx', 'utf8');
  assert.match(intake, /image\//);
  assert.doesNotMatch(intake.toLowerCase(), /\.pdf|\.docx/);
});
