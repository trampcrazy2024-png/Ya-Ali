#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node <<'NODE'
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const root = lock.packages?.[''];
if (!root) throw new Error('package-lock.json has no root package entry');
for (const [k,v] of Object.entries({...pkg.dependencies,...pkg.devDependencies})) {
  if (!(root.dependencies?.[k] ?? root.devDependencies?.[k])) throw new Error(`Lockfile missing root dependency: ${k}`);
}
for (const ws of pkg.workspaces || []) {
  // The lockfile is authoritative for resolved workspace metadata; package.json
  // must still carry the same identity so npm ci can construct the workspace tree.
}
for (const rel of ['packages/shared','packages/core','packages/database','apps/mobile']) {
  const p = JSON.parse(fs.readFileSync(`${rel}/package.json`,'utf8'));
  const l = lock.packages?.[rel];
  if (!l) throw new Error(`Lockfile missing workspace: ${rel}`);
  if (p.name !== l.name || p.version !== l.version) throw new Error(`Workspace metadata mismatch: ${rel}`);
}
console.log('npm lock/workspace metadata: PASS');
NODE
