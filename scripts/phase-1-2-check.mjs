import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const read = (file) => fs.readFileSync(path.join(cwd, file), 'utf8');
const required = [
  ['app/sites/new/page.tsx', 'A photo, an address, or a simple field note is enough to begin.'],
  ['app/sites/new/page.tsx', 'INTAKE UI COMPLETE — SECURE STORAGE REQUIRED BEFORE PUBLIC FILE UPLOAD'],
  ['app/dashboard/page.tsx', 'Start an Investigation →'],
  ['components/app-shell.tsx', 'NFE PropertyScope'],
  ['lib/evidence-config.ts', "'application/pdf'"],
  ['lib/evidence-config.ts', "'application/vnd.openxmlformats-officedocument.wordprocessingml.document'"],
  ['lib/evidence-config.ts', "'text/csv'"],
  ['app/sites/[projectId]/page.tsx', 'Review NFE Analysis Request'],
  ['app/sites/[projectId]/page.tsx', 'HDP Discovery'],
  ['app/sites/[projectId]/page.tsx', 'RRS Review']
];

for (const [file, text] of required) {
  if (!read(file).includes(text)) {
    console.error(`Phase 1.2 check failed: ${file} is missing ${text}`);
    process.exit(1);
  }
}

const clientRoots = ['app', 'components', 'lib/client'];
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of clientRoots.flatMap((root) => walk(path.join(cwd, root)))) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE') || content.includes('darkbishop43-tech/NFE1.0-sandbox')) {
    console.error(`Phase 1.2 check failed: prohibited client reference in ${path.relative(cwd, file)}`);
    process.exit(1);
  }
}

const storage = read('lib/storage.ts');
if (!storage.includes('const { dataUrl: _dataUrl, ...metadataOnly } = asset;')) {
  console.error('Phase 1.2 check failed: user file contents are not stripped before localStorage persistence.');
  process.exit(1);
}

console.log('Phase 1.2 static safety check passed: brand, intake language, evidence types, staged analysis, and client-secret boundaries are present.');
