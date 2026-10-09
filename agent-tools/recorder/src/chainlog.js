'use strict';
// Append-only, hash-chained event log.
// Every line is JSON: { seq, ts, type, data, prev, hash }.
// hash = sha256(prev + canonical(seq, ts, type, data)).
// Editing, deleting or reordering any past line breaks the chain, and `verify` reports where.
// Optionally each entry is also signed with a local Ed25519 key kept OUTSIDE the agent's
// workspace, so an agent that rewrites the whole file cannot forge a valid chain either.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GENESIS = '0'.repeat(64);

function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

function entryHash(prev, e) {
  return crypto.createHash('sha256')
    .update(prev)
    .update(canonical({ seq: e.seq, ts: e.ts, type: e.type, data: e.data }))
    .digest('hex');
}

class ChainLog {
  constructor(file, { signingKey } = {}) {
    this.file = file;
    this.signingKey = signingKey || null; // crypto.KeyObject (Ed25519 private)
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tail = ChainLog.readAll(file);
    const last = tail[tail.length - 1];
    this.seq = last ? last.seq : 0;
    this.prev = last ? last.hash : GENESIS;
  }

  append(type, data) {
    const e = { seq: this.seq + 1, ts: new Date().toISOString(), type, data };
    e.prev = this.prev;
    e.hash = entryHash(this.prev, e);
    if (this.signingKey) {
      e.sig = crypto.sign(null, Buffer.from(e.hash, 'hex'), this.signingKey).toString('base64');
    }
    fs.appendFileSync(this.file, JSON.stringify(e) + '\n');
    this.seq = e.seq;
    this.prev = e.hash;
    return e;
  }

  static readAll(file) {
    if (!fs.existsSync(file)) return [];
    const out = [];
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch { out.push({ __corrupt: line }); }
    }
    return out;
  }

  // Returns { ok, count, problems: [{ line, reason }] }
  static verify(file, { publicKey } = {}) {
    const entries = ChainLog.readAll(file);
    const problems = [];
    let prev = GENESIS;
    let expectSeq = 1;
    entries.forEach((e, i) => {
      const line = i + 1;
      if (e.__corrupt) { problems.push({ line, reason: 'unparseable line' }); return; }
      if (e.seq !== expectSeq) problems.push({ line, reason: `sequence gap: expected ${expectSeq}, found ${e.seq} (entries deleted or reordered)` });
      if (e.prev !== prev) problems.push({ line, reason: 'previous-hash mismatch (an earlier entry was altered or removed)' });
      if (entryHash(e.prev, e) !== e.hash) problems.push({ line, reason: 'content does not match its hash (entry was edited)' });
      if (publicKey) {
        if (!e.sig) problems.push({ line, reason: 'missing signature' });
        else if (!crypto.verify(null, Buffer.from(e.hash, 'hex'), publicKey, Buffer.from(e.sig, 'base64'))) {
          problems.push({ line, reason: 'bad signature (chain was rebuilt without the recorder key)' });
        }
      }
      prev = e.hash;
      expectSeq = (e.seq || expectSeq) + 1;
    });
    return { ok: problems.length === 0, count: entries.length, problems };
  }
}

module.exports = { ChainLog, canonical, GENESIS };
