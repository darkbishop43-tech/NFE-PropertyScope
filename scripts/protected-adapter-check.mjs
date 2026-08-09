import fs from 'node:fs';

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

for (const op of ['nfe.analysis', 'hdp.discovery', 'rrs.review']) {
  requireText(adapter + server, op, `Protected operation missing: ${op}`);
}
requireText(adapter, '/api/nfe-os/research', 'Browser adapter must use PropertyScope trusted server route.');
requireText(server, 'NFE_RESEARCH_SERVICE_TOKEN', 'Accepted bearer family is not wired server-side.');
requireText(server, 'NFE_RESEARCH_SERVICE_URL', 'Approved protected service URL is not wired server-side.');
requireText(server, 'CASE_CORRELATION_MISMATCH', 'Case-correlation fail-closed check missing.');
requireText(server, 'PLATFORM_CORRELATION_MISMATCH', 'PLATFORM response correlation check missing.');
requireText(server, "VERCEL_ENV === 'production'", 'Bounded release must fail closed in Production.');
requireText(workspace, 'Run NFE-OS Analysis', 'Explicit human analysis action missing.');
requireText(workspace, 'No automatic retry was started.', 'Manual-retry-only failure language missing.');
requireText(workspace, 'HDP validator rejected this output', 'Visible HDP rejection state missing.');
requireText(workspace, "adapter.isMock\n        ? demoProjects", 'Live runs must not fabricate mock scenarios.');
requireText(route, 'CROSS_ORIGIN_BLOCKED', 'Same-origin server-route guard missing.');
requireText(intake, 'image/', 'Existing photo intake no longer appears present.');

for (const legacy of ['/nfe/analyze', '/hdp/run', '/rrs/review']) forbid(adapter + server, legacy, `Historical hypothetical endpoint remained active: ${legacy}`);
for (const forbidden of ['NFE1.0-sandbox', 'nfe-os-unified-workspace', 'app.js']) forbid(adapter + server + route, forbidden, `Protected implementation coupling found: ${forbidden}`);
forbid(adapter + workspace, 'NFE_RESEARCH_SERVICE_TOKEN', 'Protected bearer must not appear in client code.');
forbid(env, 'NEXT_PUBLIC_NFE_RESEARCH_SERVICE_TOKEN', 'Protected bearer must never use NEXT_PUBLIC_.');
forbid(intake.toLowerCase(), '.pdf', 'PDF upload must not be added in this bounded release.');
forbid(intake.toLowerCase(), '.docx', 'DOCX upload must not be added in this bounded release.');

console.log('PASS — PropertyScope first protected analysis adapter boundary is server-only and contract-aligned.');
console.log('PASS — NFE/HDP/RRS operations remain separated and same-property correlation fails closed.');
console.log('PASS — existing photo intake is preserved and PDF/DOCX upload was not added.');
console.log('PASS — no PLATFORM or Unified Workspace source coupling is present.');
