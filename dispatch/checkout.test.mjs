// The dispatch-data workflow sparse-checkouts a file list. collector/fetch.mjs
// imports collector/safe-url.mjs; when that file was left off the list the
// snapshot job died in a few seconds with ERR_MODULE_NOT_FOUND (from
// 2026-10-21). This test walks the same import graph the job loads.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(root, '.github/workflows/dispatch-data.yml');
const ENTRIES = ['dispatch/collect.mjs', 'dispatch/post-alerts.mjs'];

function sparsePatterns(text) {
  const lines = text.split('\n');
  const idx = lines.findIndex((line) => /^\s*sparse-checkout:\s*\|/.test(line));
  assert.ok(idx >= 0, 'dispatch-data.yml has a sparse-checkout block');
  const indent = lines[idx].match(/^(\s*)/)[1].length;
  const out = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const match = line.match(/^(\s*)(\S.*?)\s*$/);
    if (!match || match[1].length <= indent) break;
    out.push(match[2]);
  }
  return out;
}

function covered(rel, patterns) {
  return patterns.some((pattern) => rel === pattern || rel.startsWith(`${pattern}/`));
}

function specifiers(source) {
  const specs = [];
  const re = /(?:from\s+|import\s*\(\s*|import\s+|new\s+URL\(\s*)['"](\.\.?\/[^'"]+)['"]/g;
  let match;
  while ((match = re.exec(source))) specs.push(match[1]);
  return specs;
}

function resolveSpec(fromRel, spec) {
  const abs = path.resolve(root, path.dirname(fromRel), spec);
  if (spec.endsWith('/')) return { rel: path.relative(root, abs), kind: 'dir' };
  if (abs.endsWith('.mjs') || abs.endsWith('.js') || abs.endsWith('.json')) {
    return { rel: path.relative(root, abs), kind: 'file' };
  }
  return { rel: path.relative(root, `${abs}.mjs`), kind: 'file' };
}

function localImports() {
  const seen = new Set();
  const queue = [...ENTRIES];
  const required = [];
  while (queue.length) {
    const rel = queue.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    required.push({ rel, kind: 'file' });
    const source = readFileSync(path.join(root, rel), 'utf8');
    for (const spec of specifiers(source)) {
      const resolved = resolveSpec(rel, spec);
      required.push(resolved);
      if (resolved.kind === 'file' && resolved.rel.endsWith('.mjs')) queue.push(resolved.rel);
    }
  }
  return required;
}

test('dispatch-data sparse-checkout includes every module the job imports', () => {
  const patterns = sparsePatterns(readFileSync(workflowPath, 'utf8'));
  const missing = new Set();
  for (const item of localImports()) {
    const rel = item.rel.split(path.sep).join('/');
    if (!covered(rel, patterns)) missing.add(rel);
  }
  const missingList = [...missing];
  assert.deepEqual(missingList, [], `add these paths to dispatch-data.yml sparse-checkout:\n${missingList.join('\n')}`);
});

test('importing dispatch entries resolves inside the sparse-checkout tree', async () => {
  const patterns = sparsePatterns(readFileSync(workflowPath, 'utf8'));
  const dir = mkdtempSync(path.join(tmpdir(), 'dispatch-sparse-'));
  try {
    for (const pattern of patterns) {
      const src = path.join(root, pattern);
      const dest = path.join(dir, pattern);
      mkdirSync(path.dirname(dest), { recursive: true });
      cpSync(src, dest, { recursive: true });
    }
    for (const entry of ENTRIES) {
      await import(pathToFileURL(path.join(dir, entry)).href);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
