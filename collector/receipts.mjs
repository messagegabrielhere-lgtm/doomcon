// collector/receipts.mjs
//
// Hash-chained, append-only receipts.
//
// The product claim is "you can recompute our number". A receipt is the artifact
// that makes the claim checkable: it carries the full inputs, the constants in
// force at the time, and a hash that links it to every receipt before it. If we
// ever quietly rewrite history, the chain breaks and anyone running verifyChain()
// can see exactly where.
//
// Hashing is over CANONICAL JSON, not over the file bytes. Pretty-printing,
// key order and trailing newlines must not change a hash, or the chain would
// break every time someone reformatted a file.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const RECEIPTS_SCHEMA = 1;

// Genesis has no predecessor. A literal zero hash is used rather than null so
// that every receipt in the chain has the same shape and the verifier never
// needs a special case for "the first one".
export const GENESIS_PREV_HASH = 'sha256:' + '0'.repeat(64);

/**
 * Canonical JSON: object keys sorted ascending by code unit, arrays left in
 * order (their order is data), no whitespace.
 *
 * We refuse undefined / NaN / Infinity instead of letting JSON.stringify turn
 * them into null or drop them. A hash computed over a value that silently
 * became null is a hash nobody can reproduce, which is worse than a crash.
 */
export function canonicalJson(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`canonicalJson: refusing non-finite number (${value}); fix the caller, do not coerce`);
    }
    // Object.is catches -0, whose JSON form is "0" but whose bit pattern differs.
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'undefined') {
    throw new Error('canonicalJson: refusing undefined; use null for "known absent"');
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (t === 'object') {
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const k of keys) {
      if (value[k] === undefined) continue; // an absent key, not a null value
      parts.push(JSON.stringify(k) + ':' + canonicalJson(value[k]));
    }
    return '{' + parts.join(',') + '}';
  }
  throw new Error(`canonicalJson: unsupported type ${t}`);
}

/** sha256 of canonical JSON of `obj` with any `hash` field removed. */
export function hashReceipt(obj) {
  const { hash: _ignored, ...rest } = obj;
  return 'sha256:' + createHash('sha256').update(canonicalJson(rest), 'utf8').digest('hex');
}

/** Receipt ids are sortable by filename, so the chain order is the filename order. */
export function receiptIdFor(isoTimestamp) {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) throw new Error(`receiptIdFor: bad timestamp ${isoTimestamp}`);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}

function receiptFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
}

/** Every receipt on disk, in chain order. */
export function readChain(dir) {
  return receiptFiles(dir).map((f) => {
    const p = join(dir, f);
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch (e) {
      throw new Error(`readChain: ${p} is not valid JSON: ${e.message}`);
    }
  });
}

export function latestReceipt(dir) {
  const files = receiptFiles(dir);
  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(dir, files[files.length - 1]), 'utf8'));
}

/**
 * Seal and append one receipt. `body` must already contain id, prev_hash and
 * everything else; this only computes the hash and writes the file.
 *
 * Refuses to overwrite. Append-only is the whole point, and a same-second rerun
 * silently clobbering a receipt would be an undetectable history edit.
 */
export function writeReceipt(dir, body) {
  if (!body || typeof body !== 'object') throw new Error('writeReceipt: body must be an object');
  if (!body.id) throw new Error('writeReceipt: body.id is required');
  if (!body.prev_hash) throw new Error('writeReceipt: body.prev_hash is required (use GENESIS_PREV_HASH for the first)');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${body.id}.json`);
  if (existsSync(path)) {
    throw new Error(`writeReceipt: ${path} already exists; receipts are append-only and are never rewritten`);
  }
  const receipt = { ...body, hash: hashReceipt(body) };
  // Written pretty so a human reading it on GitHub can audit it. The hash is
  // over canonical JSON, so this formatting does not affect verification.
  writeFileSync(path, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  return receipt;
}

/**
 * Walk the chain and re-derive every hash.
 *
 * This function is the proof behind the "verify it yourself" line on the site.
 * It must stay dependency-free and runnable by a stranger with nothing but a
 * clone of the repo and a Node runtime.
 *
 * Returns { ok, count, errors: [{ index, id, problem, expected, actual }] }.
 * It reports every problem rather than throwing on the first, because when a
 * chain does break you want the whole picture, not the earliest symptom.
 */
export function verifyChain(dir) {
  const chain = readChain(dir);
  const errors = [];
  let prev = GENESIS_PREV_HASH;

  for (let i = 0; i < chain.length; i++) {
    const r = chain[i];
    const id = r.id ?? `<index ${i}>`;

    if (r.prev_hash !== prev) {
      errors.push({
        index: i, id, problem: 'prev_hash does not match the previous receipt hash',
        expected: prev, actual: r.prev_hash ?? null,
      });
    }

    let recomputed = null;
    try {
      recomputed = hashReceipt(r);
    } catch (e) {
      errors.push({ index: i, id, problem: `cannot hash receipt: ${e.message}`, expected: null, actual: null });
    }
    if (recomputed !== null && recomputed !== r.hash) {
      errors.push({
        index: i, id, problem: 'recomputed hash does not match the stored hash (contents were altered)',
        expected: recomputed, actual: r.hash ?? null,
      });
    }

    // Chain forward on the STORED hash. If it was tampered with we have already
    // flagged it; following the stored value keeps a single edit from cascading
    // into a false error on every later receipt.
    prev = r.hash ?? recomputed;
  }

  return { ok: errors.length === 0, count: chain.length, errors };
}

// Run directly to verify: node collector/receipts.mjs [receiptsDir]
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? 'data/receipts';
  const result = verifyChain(dir);
  if (result.count === 0) {
    console.log(`No receipts found in ${dir}. Nothing to verify.`);
  } else if (result.ok) {
    console.log(`OK: ${result.count} receipt(s) in ${dir} form an unbroken sha256 chain.`);
  } else {
    console.error(`BROKEN: ${result.errors.length} problem(s) across ${result.count} receipt(s) in ${dir}:`);
    for (const e of result.errors) {
      console.error(`  [${e.index}] ${e.id}: ${e.problem}`);
      if (e.expected) console.error(`      expected ${e.expected}`);
      if (e.actual) console.error(`      actual   ${e.actual}`);
    }
    process.exitCode = 1;
  }
}
