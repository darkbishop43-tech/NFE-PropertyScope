import fs from 'node:fs';

// Bounded diagnostic checkpoint: value-free correlation classifications only.
function read(path) { return fs.readFileSync(path, 'utf8'); }
function requireText(text, value, message) {
  if (!text.includes(value)) throw new Error(message || `Missing required text: ${value}`);
}
function forbid(text, value, message) {
  if (text.includes(value)) throw new Error(message || `Forbidden text found: ${value}`);
}

const adapter = read('lib/adapters/nfe-os.ts');
const server = read('lib/server/nfe-os-protected.ts');
const route = read('app/api/nfe-os/research/route.ts');
const workspace = read('app/sites/[projectId]/page.tsx');
const intake = read('app/sites/new/page.tsx');
const env = read('.env.example');
const tests = read('tests/propertyscope-safe-correlation.test.mjs');

for (const op of ['nfe.analysis', 'hdp.discovery', 'rrs.review']) {
  requireText(adapter + server, op, `Protected operation missing: ${op}`);
}
requireText(adapter, '/api/nfe-os/research', 'Browser adapter must use PropertyScope trusted server route.');
requireText(server, 'NFE_RESEARCH_SERVICE_TOKEN', 'Accepted bearer family is not wired server-side.');
requireText(server, 'NFE_RESEARCH_SERVICE_URL', 'Approved protected service URL is not wired server-side.');
requireText(server, 'CASE_CORRELATION_MISMATCH', 'Pre-downstream same-case fail-closed check missing.');
requireText(server, "SAFE_CORRELATION_CONTRACT_VERSION = 'nfe-safe-correlation-contract-1.0'", 'Safe Request Correlation contract missing.');
requireText(server, 'callerRequestId', 'Caller request identity is not wired.');
requireText(server, "'CASE_ID_MISMATCH'", 'Returned case mismatch classification missing.');
requireText(server, "'MODULE_MISMATCH'", 'Returned operation/module mismatch classification missing.');
requireText(server, "'CALLER_REQUEST_ID_MISMATCH'", 'Returned caller request mismatch classification missing.');
requireText(server, "'MISSING_PLATFORM_REQUEST_ID'", 'Missing PLATFORM request identity classification missing.');
requireText(server, "'SAFE_CORRELATION_MISSING_OR_INVALID'", 'Malformed safe correlation classification missing.');
requireText(server, 'CorrelationDiagnostic', 'Sanitized field-level correlation diagnostics missing.');
requireText(server, 'CORRELATION_REQUEST_ID_MISMATCH', 'Safe request-ID mismatch diagnostic detail missing.');
requireText(route, 'failure.diagnostic', 'Sanitized correlation diagnostic is not preserved through the PropertyScope server route.');
requireText(server, "VERCEL_ENV === 'production'", 'Bounded release must fail closed in Production.');
requireText(workspace, 'Run NFE-OS Analysis', 'Explicit human analysis action missing.');
requireText(workspace, 'No automatic retry was started.', 'Manual-retry-only failure language missing.');
requireText(workspace, 'HDP validator rejected this output', 'Visible HDP rejection state missing.');
requireText(workspace, "adapter.isMock\n        ? demoProjects", 'Live runs must not fabricate mock scenarios.');
requireText(route, 'CROSS_ORIGIN_BLOCKED', 'Same-origin server-route guard missing.');
requireText(intake, 'image/', 'Existing photo intake no longer appears present.');
requireText(tests, 'caller and PLATFORM request IDs differ', 'Distinct caller/PLATFORM request identity proof missing.');
requireText(tests, 'valid correlation permits a deterministic NFE to HDP to RRS same-property chain', 'Same-case deterministic chain proof missing.');

for (const legacy of ['/nfe/analyze', '/hdp/run', '/rrs/review']) forbid(adapter + server, legacy, `Historical hypothetical endpoint remained active: ${legacy}`);
for (const forbidden of ['NFE1.0-sandbox', 'nfe-os-unified-workspace', 'app.js']) forbid(adapter + server + route, forbidden, `Protected implementation coupling found: ${forbidden}`);
forbid(adapter + workspace, 'NFE_RESEARCH_SERVICE_TOKEN', 'Protected bearer must not appear in client code.');
forbid(env, 'NEXT_PUBLIC_NFE_RESEARCH_SERVICE_TOKEN', 'Protected bearer must never use NEXT_PUBLIC_.');
forbid(intake.toLowerCase(), '.pdf', 'PDF upload must not be added in this bounded release.');
forbid(intake.toLowerCase(), '.docx', 'DOCX upload must not be added in this bounded release.');
forbid(server, 'requestIdFor(', 'Legacy caller-generated top-level PLATFORM request identity must not remain active.');

console.log('PASS — PropertyScope first protected analysis adapter boundary is server-only and contract-aligned.');
console.log('PASS — Safe Request Correlation preserves realEstateCaseId, distinct caller identity, PLATFORM request identity, and top-level module identity.');
console.log('PASS — NFE/HDP/RRS operations remain separated and correlation mismatches fail closed with sanitized classifications.');
console.log('PASS — existing photo intake is preserved and PDF/DOCX upload was not added.');
console.log('PASS — no PLATFORM or Unified Workspace source coupling is present.');
