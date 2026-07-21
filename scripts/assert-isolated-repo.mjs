import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const packagePath = path.join(cwd, 'package.json');
const boundaryPath = path.join(cwd, 'PROJECT_BOUNDARY.md');
const protectedRemote = 'darkbishop43-tech/nfe1.0-sandbox';

if (!fs.existsSync(packagePath) || !fs.existsSync(boundaryPath)) {
  console.error('Boundary check failed: missing standalone project markers.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.name !== 'propertyscope') {
  console.error(`Boundary check failed: unexpected package name ${pkg.name}`);
  process.exit(1);
}

const allowedFolders = new Set(['nfe-site-intelligence-builder2', 'PropertyScope', 'NFE-PropertyScope']);
if (!allowedFolders.has(path.basename(cwd))) {
  console.error(`Boundary check failed: unexpected repo folder ${path.basename(cwd)}`);
  process.exit(1);
}

try {
  const remotes = execFileSync('git', ['remote', '-v'], { cwd, encoding: 'utf8' }).toLowerCase();
  if (remotes.includes(protectedRemote)) {
    console.error('Boundary check failed: Builder #2 Git remote points at the protected NFE-OS repository.');
    process.exit(1);
  }
} catch {
  // A fresh repository may have no remote. That is safe for this boundary check.
}

const forbiddenReferences = [
  'nfe_platform_prototype',
  'darkbishop43-tech/NFE1.0-sandbox'
];
const sourceRoots = ['app', 'components', 'lib'];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of sourceRoots.flatMap((root) => walk(path.join(cwd, root)))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const forbidden of forbiddenReferences) {
    if (text.includes(forbidden)) {
      console.error(`Boundary check failed: protected Platform reference found in source file ${path.relative(cwd, file)}.`);
      process.exit(1);
    }
  }
}

console.log('Boundary check passed: standalone NFE PropertyScope Builder #2 repository with no protected NFE-OS remote or source coupling.');
