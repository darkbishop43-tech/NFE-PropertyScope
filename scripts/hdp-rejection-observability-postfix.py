from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Postfix anchor not found in {path}: {old[:120]}')
    p.write_text(text.replace(old, new, 1))


# PLATFORM PR #17 exposes validation.failureCategory as error.code, not the deeper validator errorCode.
replace_once(
    'lib/types.ts',
    "  rejectionCode?: 'CONTENT_INTEGRITY_VALIDATION_FAILED' | 'HDP_UNSUPPORTED_CAPABILITY_CLAIM' | 'HDP_SOLUTION_RESTRAINT_FAILED' | 'HDP_RESULT_STATE_CONTRADICTION' | 'HDP_RESULT_STATE_CONTRACT_FAILED' | 'VALIDATION_REJECTED';",
    "  rejectionCode?: 'CONTENT_INTEGRITY' | 'HDP_UNSUPPORTED_CAPABILITY' | 'HDP_SOLUTION_RESTRAINT' | 'HDP_RESULT_STATE_CONTRACT' | 'VALIDATION_REJECTED';",
)

server = Path('lib/server/nfe-os-protected.ts')
text = server.read_text()
text = text.replace(
    "const HDP_REJECTION_CODES = new Set<HdpRejectionDiagnostics['rejectionCode']>([\n  'CONTENT_INTEGRITY_VALIDATION_FAILED',\n  'HDP_UNSUPPORTED_CAPABILITY_CLAIM',\n  'HDP_SOLUTION_RESTRAINT_FAILED',\n  'HDP_RESULT_STATE_CONTRADICTION',\n  'HDP_RESULT_STATE_CONTRACT_FAILED',\n  'VALIDATION_REJECTED'\n]);\nconst HDP_FIRST_FAILURE_CODES = new Set<HdpRejectionDiagnostics['firstFailureCode']>([",
    "type HdpRejectionCode = NonNullable<HdpRejectionDiagnostics['rejectionCode']>;\n"
    "type HdpFirstFailureCode = NonNullable<HdpRejectionDiagnostics['firstFailureCode']>;\n"
    "type HdpFinishReason = NonNullable<HdpRejectionDiagnostics['firstFinishReason']>;\n"
    "type HdpCorrectionIneligibilityReason = NonNullable<HdpRejectionDiagnostics['correctionIneligibilityReason']>;\n"
    "type HdpCorrectionResult = NonNullable<HdpRejectionDiagnostics['correctionResult']>;\n\n"
    "const HDP_REJECTION_CODES = new Set<HdpRejectionCode>([\n"
    "  'CONTENT_INTEGRITY',\n"
    "  'HDP_UNSUPPORTED_CAPABILITY',\n"
    "  'HDP_SOLUTION_RESTRAINT',\n"
    "  'HDP_RESULT_STATE_CONTRACT',\n"
    "  'VALIDATION_REJECTED'\n"
    "]);\n"
    "const HDP_FIRST_FAILURE_CODES = new Set<HdpFirstFailureCode>([",
)
text = text.replace(
    "const HDP_FINISH_REASONS = new Set<HdpRejectionDiagnostics['firstFinishReason']>",
    "const HDP_FINISH_REASONS = new Set<HdpFinishReason>",
)
text = text.replace(
    "const HDP_CORRECTION_INELIGIBILITY = new Set<HdpRejectionDiagnostics['correctionIneligibilityReason']>",
    "const HDP_CORRECTION_INELIGIBILITY = new Set<HdpCorrectionIneligibilityReason>",
)
text = text.replace(
    "const HDP_CORRECTION_RESULTS = new Set<HdpRejectionDiagnostics['correctionResult']>",
    "const HDP_CORRECTION_RESULTS = new Set<HdpCorrectionResult>",
)
old_map = "      rejectionCode: body.error?.code || 'VALIDATOR_REJECTED',\n      rejectionReason: body.error?.message || 'The HDP result was rejected by the authoritative validator.',\n      rejectionDiagnostics: sanitizeHdpRejectionDiagnostics(body.error?.code, body.rejectionDiagnostics)"
new_map = "      rejectionCode: sanitizeHdpRejectionDiagnostics(body.error?.code, body.rejectionDiagnostics)?.rejectionCode,\n      rejectionReason: 'The HDP result was rejected by the authoritative validator.',\n      rejectionDiagnostics: sanitizeHdpRejectionDiagnostics(body.error?.code, body.rejectionDiagnostics)"
if old_map not in text:
    raise SystemExit('Postfix mapHdp anchor not found')
text = text.replace(old_map, new_map, 1)
server.write_text(text)

# Presentation maps only the actual safe categories exposed by PR #17.
page = Path('app/sites/[projectId]/page.tsx')
text = page.read_text()
text = text.replace("    if (code === 'CONTENT_INTEGRITY_VALIDATION_FAILED' || code === 'CONTENT_INTEGRITY') return 'CONTENT INTEGRITY';", "    if (code === 'CONTENT_INTEGRITY') return 'CONTENT INTEGRITY';")
text = text.replace("    if (code === 'HDP_UNSUPPORTED_CAPABILITY_CLAIM' || code === 'HDP_UNSUPPORTED_CAPABILITY') return 'UNSUPPORTED CAPABILITY';", "    if (code === 'HDP_UNSUPPORTED_CAPABILITY') return 'UNSUPPORTED CAPABILITY';")
text = text.replace("    if (code === 'HDP_SOLUTION_RESTRAINT_FAILED' || code === 'HDP_SOLUTION_RESTRAINT') return 'SOLUTION RESTRAINT';", "    if (code === 'HDP_SOLUTION_RESTRAINT') return 'SOLUTION RESTRAINT';")
text = text.replace("    if (code === 'HDP_RESULT_STATE_CONTRADICTION' || code === 'HDP_RESULT_STATE_CONTRACT_FAILED' || code === 'HDP_RESULT_STATE_CONTRACT') return 'RESULT-STATE CONTRACT';", "    if (code === 'HDP_RESULT_STATE_CONTRACT') return 'RESULT-STATE CONTRACT';")
page.write_text(text)

# Deterministic fixtures match the exact safe codes that cross the accepted PLATFORM response boundary.
test_path = Path('tests/propertyscope-hdp-rejection-observability.test.mjs')
text = test_path.read_text()
text = text.replace("['CONTENT_INTEGRITY_VALIDATION_FAILED', 'CONTENT_INTEGRITY']", "['CONTENT_INTEGRITY', 'CONTENT_INTEGRITY']")
text = text.replace("['HDP_UNSUPPORTED_CAPABILITY_CLAIM', 'HDP_UNSUPPORTED_CAPABILITY']", "['HDP_UNSUPPORTED_CAPABILITY', 'HDP_UNSUPPORTED_CAPABILITY']")
text = text.replace("['HDP_SOLUTION_RESTRAINT_FAILED', 'HDP_SOLUTION_RESTRAINT']", "['HDP_SOLUTION_RESTRAINT', 'HDP_SOLUTION_RESTRAINT']")
text = text.replace("['HDP_RESULT_STATE_CONTRACT_FAILED', 'HDP_RESULT_STATE_CONTRACT']", "['HDP_RESULT_STATE_CONTRACT', 'HDP_RESULT_STATE_CONTRACT']")
text = text.replace("sanitizeHdpRejectionDiagnostics('HDP_SOLUTION_RESTRAINT_FAILED'", "sanitizeHdpRejectionDiagnostics('HDP_SOLUTION_RESTRAINT'")
text = text.replace("    assert.equal(result.body.rejectionDiagnostics.rejectionCode, finalCode);", "    assert.equal(result.body.rejectionCode, finalCode);\n    assert.equal(result.body.rejectionDiagnostics.rejectionCode, finalCode);")
text += r'''

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
'''
test_path.write_text(text)

# Remove this one-time correction helper from the durable tree before commit.
Path('scripts/hdp-rejection-observability-postfix.py').unlink(missing_ok=True)
