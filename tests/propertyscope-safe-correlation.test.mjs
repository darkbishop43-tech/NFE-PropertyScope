import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const {
  ProtectedResearchError,
  SAFE_CORRELATION_CONTRACT_VERSION,
  buildPlatformBody,
  executeProtectedResearch,
  generateCallerRequestId,
  isValidCallerRequestId,
  validatePlatformCorrelation
} = await import('../lib/server/nfe-os-protected.ts');

process.env.NFE_RESEARCH_SERVICE_URL = 'https://synthetic.platform.invalid/api/research';
process.env.NFE_RESEARCH_SERVICE_TOKEN = 'synthetic-test-token-never-sent';
process.env.PROPERTYSCOPE_PRIVATE_LIVE_RESEARCH = 'true';
process.env.VERCEL_ENV = 'preview';

function payload(caseId = 'property-case-1234567890') {
  return {
    domain: 'real-estate',
    realEstateCaseId: caseId,
    caseTitle: 'Synthetic property',
    question: 'What should be verified first?',
    sourceMaterial: 'Synthetic property source material for deterministic correlation proof.',
    evidence: [],
    metadata: {
      submittedAt: '2026-08-09T10:00:00.000Z',
      runCorrelationId: 'run-12345678901234567890'
    }
  };
}

function nfeOutput(caseId = 'property-case-1234567890') {
  return {
    requestId: 'RS-nfe-existing-1234567890',
    caseId,
    findings: [],
    answer: 'Verify the highest-impact property constraint first.',
    confidence: 'UNKNOWN',
    generatedAt: '2026-08-09T10:00:01.000Z',
    provenance: 'NFE_OS_ANALYSIS',
    executionStatus: 'accepted',
    validationStatus: 'passed'
  };
}

function hdpOutput(caseId = 'property-case-1234567890') {
  return {
    requestId: 'RS-hdp-existing-1234567890',
    caseId,
    discoveries: ['A controlling constraint may eliminate multiple scenarios.'],
    confidence: 'UNKNOWN',
    generatedAt: '2026-08-09T10:00:02.000Z',
    provenance: 'NFE_OS_ANALYSIS',
    executionStatus: 'accepted',
    validationStatus: 'passed',
    resultState: 'possible_weak_signal',
    conclusion: 'Verify the controlling constraint.'
  };
}

function protectedRequest(operation, caseId = 'property-case-1234567890') {
  const request = { operation, payload: payload(caseId) };
  if (operation === 'hdp.discovery' || operation === 'rrs.review') request.nfeAnalysis = nfeOutput(caseId);
  if (operation === 'rrs.review') request.hdpAnalysis = hdpOutput(caseId);
  return request;
}

function resultFor(operation) {
  if (operation === 'nfe.analysis') return { answer: 'Protected synthetic NFE answer.' };
  if (operation === 'hdp.discovery') {
    return {
      resultState: 'possible_weak_signal',
      discoveryClassification: 'synthetic',
      mechanismOrigin: 'synthetic',
      sections: { 'FINAL CONCLUSION': 'Protected synthetic HDP conclusion.' },
      conclusion: 'Protected synthetic HDP conclusion.'
    };
  }
  return {
    disposition: 'Qualified Pass',
    strongestSupportedFeature: 'Same-case evidence continuity.',
    mostMaterialWeakness: 'Authoritative property evidence remains limited.',
    assessment: 'Synthetic deterministic review.',
    crossSystemAssessment: 'NFE/HDP/RRS remained separated.',
    hdpAssessment: 'HDP remained bounded.',
    systemDisagreement: 'None material in the synthetic fixture.',
    minimumUsefulRevision: 'Verify authoritative evidence.',
    smallestNextTest: 'Check the controlling property constraint.',
    humanDecision: 'Pending'
  };
}

function humanModule(operation) {
  return operation === 'nfe.analysis' ? 'NFE Analysis' : operation === 'hdp.discovery' ? 'HDP Discovery' : 'RRS Review';
}

function acceptedEnvelope(platformBody, sequence = 1, overrides = {}) {
  const requestId = overrides.requestId ?? `RS-platform-${sequence}-12345678901234567890`;
  const caseId = overrides.caseId ?? platformBody.caseId;
  const module = overrides.module ?? platformBody.operation;
  const correlation = overrides.correlation ?? {
    contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
    callerRequestId: platformBody.correlation.callerRequestId,
    requestId,
    caseId,
    furthestExecutionReceipt: 'PROVIDER_INVOCATION_STARTED',
    safeResponseGenerated: true,
    failureStage: 'NONE',
    retryable: false
  };
  return {
    requestId,
    caseId,
    module,
    executionStatus: 'accepted',
    validationStatus: 'passed',
    outcome: 'accepted',
    result: resultFor(platformBody.operation),
    correlation,
    provenance: {
      requestId,
      caseId,
      module: humanModule(platformBody.operation),
      executedAt: '2026-08-09T10:00:03.000Z',
      service: 'NFE-OS Protected Research Service',
      serviceVersion: 'synthetic',
      platformVersion: 'synthetic',
      build: 'synthetic',
      componentVersion: 'synthetic',
      promptVersion: 'synthetic'
    }
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function expectCorrelationCode(fn, code) {
  assert.throws(fn, (error) => error instanceof ProtectedResearchError && error.code === code);
}

test('request adopts Safe Request Correlation and does not use caller identity as top-level PLATFORM requestId', () => {
  const callerRequestId = generateCallerRequestId();
  assert.equal(isValidCallerRequestId(callerRequestId), true);
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), callerRequestId);
  assert.equal(body.caseId, 'property-case-1234567890');
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'requestId'), false);
  assert.deepEqual(body.correlation, {
    contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
    callerRequestId
  });
});

test('matching active case plus matching safe correlation passes while caller and PLATFORM request IDs differ', () => {
  const callerRequestId = generateCallerRequestId();
  const platformBody = buildPlatformBody(protectedRequest('nfe.analysis'), callerRequestId);
  const envelope = acceptedEnvelope(platformBody, 1);
  assert.notEqual(callerRequestId, envelope.requestId);
  const correlation = validatePlatformCorrelation(envelope, platformBody.caseId, 'nfe.analysis', callerRequestId);
  assert.equal(correlation.caseId, platformBody.caseId);
  assert.equal(correlation.callerRequestId, callerRequestId);
  assert.equal(correlation.requestId, envelope.requestId);
});

test('mismatched top-level caseId fails closed', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const envelope = acceptedEnvelope(body, 2, { caseId: 'different-property-case' });
  expectCorrelationCode(() => validatePlatformCorrelation(envelope, body.caseId, 'nfe.analysis', caller), 'CASE_ID_MISMATCH');
});

test('mismatched safe correlation.caseId fails closed', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const envelope = acceptedEnvelope(body, 3);
  envelope.correlation.caseId = 'different-property-case';
  expectCorrelationCode(() => validatePlatformCorrelation(envelope, body.caseId, 'nfe.analysis', caller), 'CASE_ID_MISMATCH');
});

test('mismatched callerRequestId fails closed', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const envelope = acceptedEnvelope(body, 4);
  envelope.correlation.callerRequestId = generateCallerRequestId();
  expectCorrelationCode(() => validatePlatformCorrelation(envelope, body.caseId, 'nfe.analysis', caller), 'CALLER_REQUEST_ID_MISMATCH');
});

test('missing PLATFORM requestId fails closed', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const envelope = acceptedEnvelope(body, 5);
  delete envelope.requestId;
  expectCorrelationCode(() => validatePlatformCorrelation(envelope, body.caseId, 'nfe.analysis', caller), 'MISSING_PLATFORM_REQUEST_ID');
});

test('wrong top-level module fails closed', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const envelope = acceptedEnvelope(body, 6, { module: 'hdp.discovery' });
  expectCorrelationCode(() => validatePlatformCorrelation(envelope, body.caseId, 'nfe.analysis', caller), 'MODULE_MISMATCH');
});

test('human-readable provenance.module does not replace top-level operation identity', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const envelope = acceptedEnvelope(body, 7);
  assert.equal(envelope.provenance.module, 'NFE Analysis');
  assert.equal(envelope.module, 'nfe.analysis');
  assert.doesNotThrow(() => validatePlatformCorrelation(envelope, body.caseId, 'nfe.analysis', caller));
});

test('missing or invalid safe correlation fails closed with sanitized classification', () => {
  const caller = generateCallerRequestId();
  const body = buildPlatformBody(protectedRequest('nfe.analysis'), caller);
  const missing = acceptedEnvelope(body, 8);
  delete missing.correlation;
  expectCorrelationCode(() => validatePlatformCorrelation(missing, body.caseId, 'nfe.analysis', caller), 'SAFE_CORRELATION_MISSING_OR_INVALID');

  const mismatchedPlatformIdentity = acceptedEnvelope(body, 9);
  mismatchedPlatformIdentity.correlation.requestId = 'RS-different-platform-identity-1234567890';
  expectCorrelationCode(() => validatePlatformCorrelation(mismatchedPlatformIdentity, body.caseId, 'nfe.analysis', caller), 'SAFE_CORRELATION_MISSING_OR_INVALID');
});

test('one explicit NFE attempt produces one protected request and no automatic retry after correlation rejection', async () => {
  let calls = 0;
  const request = protectedRequest('nfe.analysis');
  await assert.rejects(
    executeProtectedResearch(request, async (_url, init) => {
      calls += 1;
      const platformBody = JSON.parse(init.body);
      const envelope = acceptedEnvelope(platformBody, 10);
      envelope.correlation.callerRequestId = generateCallerRequestId();
      return response(envelope);
    }),
    (error) => error instanceof ProtectedResearchError && error.code === 'CALLER_REQUEST_ID_MISMATCH'
  );
  assert.equal(calls, 1);
});

test('failed NFE material prevents HDP before any protected request is sent', async () => {
  let calls = 0;
  const request = protectedRequest('hdp.discovery');
  request.nfeAnalysis = { ...request.nfeAnalysis, answer: '', findings: [] };
  await assert.rejects(
    executeProtectedResearch(request, async () => {
      calls += 1;
      throw new Error('fetch should not run');
    }),
    (error) => error instanceof ProtectedResearchError && error.code === 'NFE_REQUIRED'
  );
  assert.equal(calls, 0);
});

test('rejected HDP prevents RRS before any protected request is sent', async () => {
  let calls = 0;
  const request = protectedRequest('rrs.review');
  request.hdpAnalysis = { ...request.hdpAnalysis, rejected: true, validationStatus: 'rejected' };
  await assert.rejects(
    executeProtectedResearch(request, async () => {
      calls += 1;
      throw new Error('fetch should not run');
    }),
    (error) => error instanceof ProtectedResearchError && error.code === 'HDP_REJECTED'
  );
  assert.equal(calls, 0);
});

test('correlation rejection leaves the PropertyScope request payload unchanged', async () => {
  const request = protectedRequest('nfe.analysis');
  const before = structuredClone(request);
  await assert.rejects(
    executeProtectedResearch(request, async (_url, init) => {
      const platformBody = JSON.parse(init.body);
      const envelope = acceptedEnvelope(platformBody, 11, { caseId: 'wrong-case' });
      return response(envelope);
    }),
    (error) => error instanceof ProtectedResearchError && error.code === 'CASE_ID_MISMATCH'
  );
  assert.deepEqual(request, before);
});

test('valid correlation permits a deterministic NFE to HDP to RRS same-property chain', async () => {
  const seen = [];
  let sequence = 20;
  const fetchImpl = async (_url, init) => {
    const platformBody = JSON.parse(init.body);
    seen.push(platformBody);
    sequence += 1;
    return response(acceptedEnvelope(platformBody, sequence));
  };

  const caseId = 'property-case-chain-1234567890';
  const nfe = await executeProtectedResearch(protectedRequest('nfe.analysis', caseId), fetchImpl);
  const hdpRequest = protectedRequest('hdp.discovery', caseId);
  hdpRequest.nfeAnalysis = nfe.body;
  const hdp = await executeProtectedResearch(hdpRequest, fetchImpl);
  const rrsRequest = protectedRequest('rrs.review', caseId);
  rrsRequest.nfeAnalysis = nfe.body;
  rrsRequest.hdpAnalysis = hdp.body;
  const rrs = await executeProtectedResearch(rrsRequest, fetchImpl);

  assert.equal(seen.length, 3);
  assert.deepEqual(seen.map((item) => item.operation), ['nfe.analysis', 'hdp.discovery', 'rrs.review']);
  assert.deepEqual(seen.map((item) => item.caseId), [caseId, caseId, caseId]);
  assert.equal(new Set(seen.map((item) => item.correlation.callerRequestId)).size, 3);
  assert.equal(nfe.body.caseId, caseId);
  assert.equal(hdp.body.caseId, caseId);
  assert.equal(rrs.body.caseId, caseId);
  assert.notEqual(nfe.body.serviceCorrelation.callerRequestId, nfe.body.requestId);
  assert.notEqual(hdp.body.serviceCorrelation.callerRequestId, hdp.body.requestId);
  assert.notEqual(rrs.body.serviceCorrelation.callerRequestId, rrs.body.requestId);
});

test('property workflow source preserves project on failure, keeps manual retry, and blocks inappropriate downstream execution', () => {
  const workspace = fs.readFileSync('app/sites/[projectId]/page.tsx', 'utf8');
  const nfeIndex = workspace.indexOf('await adapter.runNfeAnalysis(payload)');
  const hdpIndex = workspace.indexOf('await adapter.runHdp({ payload, nfeAnalysis })');
  const rejectionIndex = workspace.indexOf("hdpAnalysis.rejected || hdpAnalysis.validationStatus === 'rejected'");
  const rrsIndex = workspace.indexOf('await adapter.runRrs({ payload, nfeAnalysis, hdpAnalysis })');
  assert.ok(nfeIndex >= 0 && hdpIndex > nfeIndex && rejectionIndex > hdpIndex && rrsIndex > rejectionIndex);
  assert.match(workspace, /nfeOsRuns: \[failedRun, \.\.\.\(current\.nfeOsRuns \?\? \[\]\)\]/);
  assert.match(workspace, /No automatic retry was started\./);
  assert.doesNotMatch(workspace, /setTimeout\([^)]*runAnalysis|while\s*\([^)]*\)\s*\{[^}]*runAnalysis/s);
});
