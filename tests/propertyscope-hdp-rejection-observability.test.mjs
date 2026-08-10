import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const {
  SAFE_CORRELATION_CONTRACT_VERSION,
  executeProtectedResearch,
  sanitizeHdpRejectionDiagnostics
} = await import('../lib/server/nfe-os-protected.ts');

process.env.NFE_RESEARCH_SERVICE_URL = 'https://synthetic.platform.invalid/api/research';
process.env.NFE_RESEARCH_SERVICE_TOKEN = 'synthetic-test-token-never-sent';
process.env.PROPERTYSCOPE_PRIVATE_LIVE_RESEARCH = 'true';
process.env.VERCEL_ENV = 'preview';

function payload(caseId = 'property-hdp-observability-1234567890') {
  return {
    domain: 'real-estate',
    realEstateCaseId: caseId,
    caseTitle: 'Synthetic observability property',
    question: 'Synthetic observability only.',
    sourceMaterial: 'Synthetic non-property content for deterministic rejection observability.',
    evidence: [],
    metadata: { submittedAt: '2026-08-10T17:40:00.000Z', runCorrelationId: 'synthetic-observability-run-1234567890' }
  };
}

function nfe(caseId = 'property-hdp-observability-1234567890') {
  return {
    requestId: 'RS-existing-nfe-observability-1234567890',
    caseId,
    findings: [],
    answer: 'Synthetic accepted NFE output.',
    confidence: 'UNKNOWN',
    generatedAt: '2026-08-10T17:40:01.000Z',
    provenance: 'NFE_OS_ANALYSIS',
    executionStatus: 'accepted',
    validationStatus: 'passed'
  };
}

function correlatedEnvelope(platformBody, body, status = 422) {
  const requestId = 'RS-hdp-rejection-observability-1234567890';
  return new Response(JSON.stringify({
    requestId,
    caseId: platformBody.caseId,
    module: platformBody.operation,
    ...body,
    correlation: {
      contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
      callerRequestId: platformBody.correlation.callerRequestId,
      requestId,
      caseId: platformBody.caseId,
      furthestExecutionReceipt: 'PROVIDER_INVOCATION_STARTED',
      safeResponseGenerated: true,
      failureStage: status === 422 ? 'VALIDATOR_REJECTION' : 'NONE',
      retryable: false
    },
    provenance: {
      requestId,
      caseId: platformBody.caseId,
      module: 'HDP Discovery',
      executedAt: '2026-08-10T17:40:02.000Z',
      service: 'NFE-OS Protected Research Service'
    }
  }), { status, headers: { 'content-type': 'application/json' } });
}

function hdpRequest() {
  return { operation: 'hdp.discovery', payload: payload(), nfeAnalysis: nfe() };
}

const categoryCases = [
  ['CONTENT_INTEGRITY', 'CONTENT_INTEGRITY'],
  ['HDP_UNSUPPORTED_CAPABILITY', 'HDP_UNSUPPORTED_CAPABILITY'],
  ['HDP_SOLUTION_RESTRAINT', 'HDP_SOLUTION_RESTRAINT'],
  ['HDP_RESULT_STATE_CONTRACT', 'HDP_RESULT_STATE_CONTRACT']
];

for (const [finalCode, firstCode] of categoryCases) {
  test(`retains distinct safe HDP rejection category ${finalCode}`, async () => {
    let calls = 0;
    const result = await executeProtectedResearch(hdpRequest(), async (_url, init) => {
      calls += 1;
      const platformBody = JSON.parse(init.body);
      return correlatedEnvelope(platformBody, {
        executionStatus: 'rejected', validationStatus: 'rejected', outcome: 'validator_rejected', result: null,
        error: { category: 'validator_rejected', code: finalCode, message: 'Safe validator rejection.' },
        rejectionDiagnostics: {
          firstValidationStatus: 'REJECTED', firstFailureCode: firstCode, firstFinishReason: 'STOP',
          correctionEligible: true, correctionAttempted: true, correctionIneligibilityReason: 'NONE', correctionResult: 'REJECTED',
          rawModelOutput: 'MUST NOT RETAIN', prompt: 'MUST NOT RETAIN', validatorInternals: { secret: true }
        }
      });
    });
    assert.equal(calls, 1);
    assert.equal(result.status, 422);
    assert.equal(result.body.rejected, true);
    assert.equal(result.body.validationStatus, 'rejected');
    assert.equal(result.body.discoveries.length, 0);
    assert.equal(result.body.rejectionCode, finalCode);
    assert.equal(result.body.rejectionDiagnostics.rejectionCode, finalCode);
    assert.equal(result.body.rejectionDiagnostics.firstFailureCode, firstCode);
    assert.equal(result.body.rejectionDiagnostics.correctionAttempted, true);
    assert.equal(result.body.rejectionDiagnostics.correctionResult, 'REJECTED');
    assert.equal('rawModelOutput' in result.body.rejectionDiagnostics, false);
    assert.equal('prompt' in result.body.rejectionDiagnostics, false);
    assert.equal('validatorInternals' in result.body.rejectionDiagnostics, false);
    assert.equal(JSON.stringify(result.body).includes('MUST NOT RETAIN'), false);
  });
}

test('only allowlisted safe rejection fields are retained', () => {
  const safe = sanitizeHdpRejectionDiagnostics('HDP_SOLUTION_RESTRAINT', {
    firstFailureCode: 'HDP_SOLUTION_RESTRAINT', firstFinishReason: 'STOP', correctionEligible: false,
    correctionAttempted: false, correctionIneligibilityReason: 'CONTENT_INTEGRITY', correctionResult: 'NOT_ATTEMPTED',
    arbitraryProviderPayload: 'secret', prompt: 'private', requestId: 'do-not-retain'
  });
  assert.deepEqual(Object.keys(safe).sort(), [
    'correctionAttempted', 'correctionEligible', 'correctionIneligibilityReason', 'correctionResult',
    'firstFailureCode', 'firstFinishReason', 'rejectionCode'
  ]);
});

test('unknown or missing category remains truthfully unavailable', () => {
  assert.equal(sanitizeHdpRejectionDiagnostics('UNKNOWN_PRIVATE_CODE', { firstFailureCode: 'UNKNOWN_PRIVATE_CODE' }), undefined);
  const workspace = fs.readFileSync('app/sites/[projectId]/page.tsx', 'utf8');
  assert.match(workspace, /detailed safe category unavailable/);
});

test('valid no-material-hidden-discovery result is accepted and not converted into validator rejection', async () => {
  const result = await executeProtectedResearch(hdpRequest(), async (_url, init) => {
    const platformBody = JSON.parse(init.body);
    return correlatedEnvelope(platformBody, {
      executionStatus: 'accepted', validationStatus: 'passed', outcome: 'accepted',
      result: {
        resultState: 'no_material_hidden_discovery_found', discoveryClassification: null, mechanismOrigin: null,
        sections: { 'FINAL CONCLUSION': 'No additional material hidden discovery is justified.' },
        conclusion: 'No additional material hidden discovery is justified.'
      }
    }, 200);
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.resultState, 'no_material_hidden_discovery_found');
  assert.notEqual(result.body.rejected, true);
  assert.equal(result.body.rejectionDiagnostics, undefined);
});

test('workflow preserves rejected state, blocks RRS and does not auto retry', () => {
  const workspace = fs.readFileSync('app/sites/[projectId]/page.tsx', 'utf8');
  const rejection = workspace.indexOf("hdpAnalysis.rejected || hdpAnalysis.validationStatus === 'rejected'");
  const rrs = workspace.indexOf('await adapter.runRrs({ payload, nfeAnalysis, hdpAnalysis })');
  assert.ok(rejection >= 0 && rrs > rejection);
  assert.match(workspace, /return;\n\s*}\n\n\s*const rrsReview/);
  assert.match(workspace, /No automatic retry was started\./);
  assert.doesNotMatch(workspace, /rawModelOutput|validatorInternals|buildHdpContractCorrectionPrompt/);
});


test('unsafe arbitrary PLATFORM rejection code is not retained as PropertyScope rejection metadata', async () => {
  const result = await executeProtectedResearch(hdpRequest(), async (_url, init) => {
    const platformBody = JSON.parse(init.body);
    return correlatedEnvelope(platformBody, {
      executionStatus: 'rejected', validationStatus: 'rejected', outcome: 'validator_rejected', result: null,
      error: { category: 'validator_rejected', code: 'ARBITRARY_PRIVATE_CODE', message: 'Arbitrary detail must not persist.' },
      rejectionDiagnostics: { firstFailureCode: 'ARBITRARY_PRIVATE_CODE', rawProviderPayload: 'SECRET' }
    });
  });
  assert.equal(result.body.rejectionCode, undefined);
  assert.equal(result.body.rejectionDiagnostics, undefined);
  assert.equal(result.body.rejectionReason, 'The HDP result was rejected by the authoritative validator.');
  assert.equal(JSON.stringify(result.body).includes('ARBITRARY_PRIVATE_CODE'), false);
  assert.equal(JSON.stringify(result.body).includes('SECRET'), false);
});
