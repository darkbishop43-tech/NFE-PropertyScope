import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const packagePath = path.join(cwd, 'package.json');
const boundaryPath = path.join(cwd, 'PROJECT_BOUNDARY.md');

if (!fs.existsSync(packagePath) || !fs.existsSync(boundaryPath)) {
  console.error('Boundary check failed: missing standalone project markers.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.name !== 'nfe-site-intelligence') {
  console.error(`Boundary check failed: unexpected package name ${pkg.name}`);
  process.exit(1);
}

if (path.basename(cwd) !== 'nfe-site-intelligence-builder2') {
  console.error(`Boundary check failed: unexpected repo folder ${path.basename(cwd)}`);
  process.exit(1);
}

console.log('Boundary check passed: standalone NFE Site Intelligence Builder #2 repository.');
