#!/usr/bin/env node
// Backup and restore the index "database" (the committed data/ tree).
//
// This project has no Postgres. The durable state is git: data/state.json,
// data/history.ndjson, data/receipts/, data/reference.json, and friends.
// GitHub already keeps every commit; this tool adds an explicit, tested
// snapshot you can take before a risky change and restore from on purpose.
//
//   node collector/tools/backup.mjs backup [--out DIR]
//   node collector/tools/backup.mjs restore <snapshot-dir> [--dry-run]
//   node collector/tools/backup.mjs selftest     # backup → mutate → restore → verify
//
// selftest MUST pass before you trust a launch-day rollback. It never touches
// the real data/ tree: it copies into a temp workspace.

import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'data');

// Files and dirs that define the live index. Raw pulls and caches are regenerable.
const KEEP = [
  'state.json',
  'history.ndjson',
  'reference.json',
  'receipts',
  'posts.json',
  'news.json',
  'race.json',
  'leaders.json',
  'bliss.json',
  'balance.json',
  'ledger.json',
  'infra.json',
  'datacenters.json',
  'world.json',
  'flock.json',
  'exploits.json',
  'digest.json',
];

async function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) {
      for (const rel of await listFiles(full)) out.push(path.join(name, rel));
    } else {
      out.push(name);
    }
  }
  return out.sort();
}

/** Content digest excludes BACKUP.json so writing the manifest does not change it. */
async function contentDigest(dir) {
  const files = (await listFiles(dir)).filter((f) => f !== 'BACKUP.json');
  const h = createHash('sha256');
  for (const rel of files) {
    h.update(rel);
    h.update('\0');
    h.update(await readFile(path.join(dir, rel)));
    h.update('\0');
  }
  return { files, digest: h.digest('hex') };
}

async function copyKeep(srcRoot, destRoot) {
  await mkdir(destRoot, { recursive: true });
  const copied = [];
  for (const name of KEEP) {
    const src = path.join(srcRoot, name);
    if (!existsSync(src)) continue;
    await cp(src, path.join(destRoot, name), { recursive: true, force: true });
    copied.push(name);
  }
  return copied;
}

export async function backup(outDir, { source = DATA } = {}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = outDir || path.join(ROOT, '.backups', `data-${stamp}`);
  await mkdir(path.dirname(dest), { recursive: true });
  if (existsSync(dest)) throw new Error(`backup destination already exists: ${dest}`);
  const copied = await copyKeep(source, dest);
  const { files, digest } = await contentDigest(dest);
  await writeFile(path.join(dest, 'BACKUP.json'), `${JSON.stringify({
    schema: 1,
    created_at: new Date().toISOString(),
    source: 'data/',
    copied,
    file_count: files.length,
    sha256: digest,
  }, null, 2)}\n`);
  return { dest, files: files.length, digest, copied };
}

export async function restore(snapshotDir, { dryRun = false, target = DATA } = {}) {
  if (!existsSync(snapshotDir)) throw new Error(`snapshot not found: ${snapshotDir}`);
  const metaPath = path.join(snapshotDir, 'BACKUP.json');
  if (!existsSync(metaPath)) throw new Error(`not a SIREN backup (missing BACKUP.json): ${snapshotDir}`);
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const { files, digest } = await contentDigest(snapshotDir);
  if (meta.sha256 && meta.sha256 !== digest) {
    throw new Error(`snapshot digest mismatch: recorded ${meta.sha256}, got ${digest}`);
  }
  if (dryRun) return { ok: true, dryRun: true, files: files.length, digest, target };
  await mkdir(target, { recursive: true });
  for (const name of meta.copied || KEEP) {
    const src = path.join(snapshotDir, name);
    if (!existsSync(src)) continue;
    const dest = path.join(target, name);
    await rm(dest, { recursive: true, force: true });
    await cp(src, dest, { recursive: true, force: true });
  }
  return { ok: true, files: files.length, digest, target };
}

export async function selftest() {
  const work = await mkdtemp(path.join(tmpdir(), 'siren-backup-'));
  try {
    const data = path.join(work, 'data');
    await mkdir(path.join(data, 'receipts'), { recursive: true });
    await writeFile(path.join(data, 'state.json'), `${JSON.stringify({ level: 4, score: 55.5, generated_at: '2026-10-09T00:00:00Z' })}\n`);
    await writeFile(path.join(data, 'history.ndjson'), '{"score":55.5}\n');
    await writeFile(path.join(data, 'receipts', 'r1.json'), '{"id":"r1"}\n');

    const { dest, digest } = await backup(path.join(work, 'snap'), { source: data });

    await writeFile(path.join(data, 'state.json'), '{"level":1,"score":99}\n');
    await rm(path.join(data, 'receipts', 'r1.json'));

    const dry = await restore(dest, { dryRun: true, target: data });
    if (!dry.ok) throw new Error('dry-run restore failed');

    const result = await restore(dest, { target: data });
    const state = JSON.parse(await readFile(path.join(data, 'state.json'), 'utf8'));
    if (state.level !== 4 || state.score !== 55.5) {
      throw new Error(`restore did not bring state.json back (got ${JSON.stringify(state)})`);
    }
    if (!existsSync(path.join(data, 'receipts', 'r1.json'))) {
      throw new Error('restore did not bring receipts/r1.json back');
    }
    const again = await contentDigest(dest);
    if (again.digest !== digest) throw new Error('snapshot mutated during restore');
    return { ok: true, restored: result.files, digest };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (cmd === 'backup') {
    let dest = null;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--out') dest = args[++i];
      else if (!args[i].startsWith('-')) dest = args[i];
    }
    const r = await backup(dest);
    console.log(`backup ok: ${r.dest} (${r.files} files, sha256 ${r.digest.slice(0, 12)}…)`);
    return;
  }
  if (cmd === 'restore') {
    const snap = args[1];
    if (!snap) throw new Error('usage: backup.mjs restore <snapshot-dir> [--dry-run]');
    const r = await restore(snap, { dryRun: args.includes('--dry-run') });
    console.log(`restore ${r.dryRun ? 'dry-run ok' : 'ok'}: ${r.files} files → ${r.target}`);
    return;
  }
  if (cmd === 'selftest') {
    const r = await selftest();
    console.log(`backup selftest ok: restored ${r.restored} files, digest ${r.digest.slice(0, 12)}…`);
    return;
  }
  console.error('usage: node collector/tools/backup.mjs backup [--out DIR]\n       node collector/tools/backup.mjs restore <snapshot-dir> [--dry-run]\n       node collector/tools/backup.mjs selftest');
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
