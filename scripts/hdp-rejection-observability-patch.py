from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:120]}')
    p.write_text(text.replace(old, new, 1))


# 1) Type-safe, bounded retained metadata.
replace_once(
    'lib/types.ts',
    "export interface HdpDiscoveryOutput {\n",
    "export interface HdpRejectionDiagnostics {\n"
    "  rejectionCode?: 'CONTENT_INTEGRITY_VALIDATION_FAILED' | 'HDP_UNSUPPORTED_CAPABILITY_CLAIM' | 'HDP_SOLUTION_RESTRAINT_FAILED' | 'HDP_RESULT_STATE_CONTRADICTION' | 'HDP_RESULT_STATE_CONTRACT_FAILED' | 'VALIDATION_REJECTED';\n"
    "  firstFailureCode?: 'CONTENT_INTEGRITY' | 'HDP_UNSUPPORTED_CAPABILITY' | 'HDP_SOLUTION_RESTRAINT' | 'HDP_RESULT_STATE_CONTRACT' | 'VALIDATION_REJECTED';\n"
    "  firstFinishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'NOT_SUPPLIED' | 'OTHER';\n"
    "  correctionEligible?: boolean;\n"
    "  correctionAttempted?: boolean;\n"
    "  correctionIneligibilityReason?: 'NONE' | 'MAX_TOKENS' | 'CONTENT_INTEGRITY';\n"
    "  correctionResult?: 'REJECTED' | 'NOT_ATTEMPTED';\n"
    "}\n\n"
    "export interface HdpDiscoveryOutput {\n",
)
replace_once(
    'lib/types.ts',
    "  rejectionReason?: string;\n}\n\nexport interface RrsReviewOutput",
    "  rejectionReason?: string;\n  rejectionDiagnostics?: HdpRejectionDiagnostics;\n}\n\nexport interface RrsReviewOutput",
)

# 2) Server mapping: consume only explicit safe/allowlisted fields already returned by PLATFORM.
replace_once(
    'lib/server/nfe-os-protected.ts',
    "  HdpDiscoveryOutput,\n  NfeAnalysisOutput,",
    "  HdpDiscoveryOutput,\n  HdpRejectionDiagnostics,\n  NfeAnalysisOutput,",
)
replace_once(
    'lib/server/nfe-os-protected.ts',
    "  provenance?: PlatformProvenance;\n}\n",
    "  provenance?: PlatformProvenance;\n  rejectionDiagnostics?: Record<string, unknown>;\n}\n",
)

anchor = "function stringsFromSections(value: unknown): string[] {"
helper = """const HDP_REJECTION_CODES = new Set<HdpRejectionDiagnostics['rejectionCode']>([
  'CONTENT_INTEGRITY_VALIDATION_FAILED',
  'HDP_UNSUPPORTED_CAPABILITY_CLAIM',
  'HDP_SOLUTION_RESTRAINT_FAILED',
  'HDP_RESULT_STATE_CONTRADICTION',
  'HDP_RESULT_STATE_CONTRACT_FAILED',
  'VALIDATION_REJECTED'
]);
const HDP_FIRST_FAILURE_CODES = new Set<HdpRejectionDiagnostics['firstFailureCode']>([
  'CONTENT_INTEGRITY',
  'HDP_UNSUPPORTED_CAPABILITY',
  'HDP_SOLUTION_RESTRAINT',
  'HDP_RESULT_STATE_CONTRACT',
  'VALIDATION_REJECTED'
]);
const HDP_FINISH_REASONS = new Set<HdpRejectionDiagnostics['firstFinishReason']>(['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'NOT_SUPPLIED', 'OTHER']);
const HDP_CORRECTION_INELIGIBILITY = new Set<HdpRejectionDiagnostics['correctionIneligibilityReason']>(['NONE', 'MAX_TOKENS', 'CONTENT_INTEGRITY']);
const HDP_CORRECTION_RESULTS = new Set<HdpRejectionDiagnostics['correctionResult']>(['REJECTED', 'NOT_ATTEMPTED']);

function allowlistedValue<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase() as T;
  return allowed.has(normalized) ? normalized : undefined;
}

export function sanitizeHdpRejectionDiagnostics(
  rejectionCode: unknown,
  raw: unknown
): HdpRejectionDiagnostics | undefined {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const safe: HdpRejectionDiagnostics = {
    rejectionCode: allowlistedValue(rejectionCode, HDP_REJECTION_CODES),
    firstFailureCode: allowlistedValue(source.firstFailureCode, HDP_FIRST_FAILURE_CODES),
    firstFinishReason: allowlistedValue(source.firstFinishReason, HDP_FINISH_REASONS),
    correctionEligible: typeof source.correctionEligible === 'boolean' ? source.correctionEligible : undefined,
    correctionAttempted: typeof source.correctionAttempted === 'boolean' ? source.correctionAttempted : undefined,
    correctionIneligibilityReason: allowlistedValue(source.correctionIneligibilityReason, HDP_CORRECTION_INELIGIBILITY),
    correctionResult: allowlistedValue(source.correctionResult, HDP_CORRECTION_RESULTS)
  };
  return Object.values(safe).some((value) => value !== undefined) ? safe : undefined;
}

"""
replace_once('lib/server/nfe-os-protected.ts', anchor, helper + anchor)
replace_once(
    'lib/server/nfe-os-protected.ts',
    "      rejectionCode: body.error?.code || 'VALIDATOR_REJECTED',\n      rejectionReason: body.error?.message || 'The HDP result was rejected by the authoritative validator.'\n",
    "      rejectionCode: body.error?.code || 'VALIDATOR_REJECTED',\n      rejectionReason: body.error?.message || 'The HDP result was rejected by the authoritative validator.',\n      rejectionDiagnostics: sanitizeHdpRejectionDiagnostics(body.error?.code, body.rejectionDiagnostics)\n",
)

# 3) Bounded presentation; no rejected reasoning or identifiers added.
replace_once(
    'app/sites/[projectId]/page.tsx',
    "  const groups = Object.entries(findingLabels) as Array<[AnalysisFinding['category'], string]>;\n",
    "  const groups = Object.entries(findingLabels) as Array<[AnalysisFinding['category'], string]>;\n"
    "  const rejectionDiagnostics = latestRun?.hdpAnalysis?.rejectionDiagnostics;\n"
    "  const rejectionCategory = (() => {\n"
    "    const code = rejectionDiagnostics?.rejectionCode || rejectionDiagnostics?.firstFailureCode;\n"
    "    if (code === 'CONTENT_INTEGRITY_VALIDATION_FAILED' || code === 'CONTENT_INTEGRITY') return 'CONTENT INTEGRITY';\n"
    "    if (code === 'HDP_UNSUPPORTED_CAPABILITY_CLAIM' || code === 'HDP_UNSUPPORTED_CAPABILITY') return 'UNSUPPORTED CAPABILITY';\n"
    "    if (code === 'HDP_SOLUTION_RESTRAINT_FAILED' || code === 'HDP_SOLUTION_RESTRAINT') return 'SOLUTION RESTRAINT';\n"
    "    if (code === 'HDP_RESULT_STATE_CONTRADICTION' || code === 'HDP_RESULT_STATE_CONTRACT_FAILED' || code === 'HDP_RESULT_STATE_CONTRACT') return 'RESULT-STATE CONTRACT';\n"
    "    return null;\n"
    "  })();\n",
)
replace_once(
    'app/sites/[projectId]/page.tsx',
    "          <div className=\"analysis-error-state\"><strong>HDP validator rejected this output</strong><p>{latestRun.hdpAnalysis.rejectionReason || 'The generated HDP reasoning did not satisfy the authoritative validation contract.'}</p><small>Request {latestRun.hdpRequestId} · Result remains rejected · RRS was not run from this rejected material.</small></div>\n",
    "          <div className=\"analysis-error-state\">\n"
    "            <strong>HDP validator rejected this output</strong>\n"
    "            <p>{rejectionCategory ? `HDP validator rejection: ${rejectionCategory}.` : 'HDP validator rejection — detailed safe category unavailable.'}</p>\n"
    "            {rejectionDiagnostics && <small>Correction attempted: {rejectionDiagnostics.correctionAttempted === true ? 'YES' : rejectionDiagnostics.correctionAttempted === false ? 'NO' : 'UNAVAILABLE'} · Correction result: {rejectionDiagnostics.correctionResult || 'UNAVAILABLE'}</small>}\n"
    "            <small>Result remains rejected · RRS was not run from this rejected material · No rejected reasoning is presented as accepted analysis.</small>\n"
    "          </div>\n",
)

# 4) Dedicated deterministic observability proof.
Path('tests/propertyscope-hdp-rejection-observability.test.mjs').write_text(r'''import assert from 'node:assert/strict';
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
  ['CONTENT_INTEGRITY_VALIDATION_FAILED', 'CONTENT_INTEGRITY'],
  ['HDP_UNSUPPORTED_CAPABILITY_CLAIM', 'HDP_UNSUPPORTED_CAPABILITY'],
  ['HDP_SOLUTION_RESTRAINT_FAILED', 'HDP_SOLUTION_RESTRAINT'],
  ['HDP_RESULT_STATE_CONTRACT_FAILED', 'HDP_RESULT_STATE_CONTRACT']
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
  const safe = sanitizeHdpRejectionDiagnostics('HDP_SOLUTION_RESTRAINT_FAILED', {
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
''')

# 5) Include dedicated test in existing verification command.
package_path = Path('package.json')
package = json.loads(package_path.read_text())
package['scripts']['correlation-check'] = (
    'node --experimental-strip-types --test '
    'tests/propertyscope-safe-correlation.test.mjs '
    'tests/propertyscope-vercel-oidc-transport.test.mjs '
    'tests/propertyscope-hdp-rejection-observability.test.mjs'
)
package_path.write_text(json.dumps(package, indent=2) + '\n')

# 6) Make durable CI path notice the new test file.
replace_once(
    '.github/workflows/propertyscope-protected-correlation.yml',
    "      - 'tests/propertyscope-safe-correlation.test.mjs'\n",
    "      - 'tests/propertyscope-safe-correlation.test.mjs'\n      - 'tests/propertyscope-hdp-rejection-observability.test.mjs'\n",
)

# Remove temporary helper + workflow from final durable tree.
Path('.github/workflows/hdp-rejection-observability-patch.yml').unlink(missing_ok=True)
Path('scripts/hdp-rejection-observability-patch.py').unlink(missing_ok=True)
