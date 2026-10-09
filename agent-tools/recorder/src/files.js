'use strict';
// Watches the agent's workspace. Before the recorder starts it snapshots every file into a
// content-addressed store; every later create/modify/delete is logged with the before and
// after content hashes, so any change can be rolled back.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_IGNORE = ['.git', 'node_modules', '.siren', '.DS_Store', '__pycache__', '.venv'];
const MAX_BYTES = 5 * 1024 * 1024; // larger files are logged by hash only, not stored

class BlobStore {
  constructor(dir) { this.dir = dir; fs.mkdirSync(dir, { recursive: true }); }
  put(buf) {
    const h = crypto.createHash('sha256').update(buf).digest('hex');
    const p = path.join(this.dir, h.slice(0, 2), h);
    if (!fs.existsSync(p)) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); }
    return h;
  }
  get(h) { return fs.readFileSync(path.join(this.dir, h.slice(0, 2), h)); }
  has(h) { return fs.existsSync(path.join(this.dir, h.slice(0, 2), h)); }
}

function walk(root, ignore, out = []) {
  for (const name of fs.readdirSync(root)) {
    if (ignore.includes(name)) continue;
    const p = path.join(root, name);
    let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, ignore, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

class FileWatcher {
  constructor({ root, log, store, ignore = DEFAULT_IGNORE }) {
    this.root = path.resolve(root);
    this.log = log;
    this.store = store;
    this.ignore = ignore;
    this.state = new Map(); // relPath -> hash
    this.timers = new Map();
  }

  rel(p) { return path.relative(this.root, p).split(path.sep).join('/'); }

  hashFile(abs) {
    const st = fs.statSync(abs);
    if (st.size > MAX_BYTES) {
      return { hash: 'big:' + st.size + ':' + st.mtimeMs, stored: false, size: st.size };
    }
    const buf = fs.readFileSync(abs);
    return { hash: this.store.put(buf), stored: true, size: buf.length };
  }

  baseline() {
    const files = walk(this.root, this.ignore);
    for (const abs of files) {
      try { this.state.set(this.rel(abs), this.hashFile(abs).hash); } catch { /* vanished */ }
    }
    this.log.append('baseline', { root: this.root, files: files.length });
    return files.length;
  }

  // Compare one path against the last known state and log any difference.
  check(rel) {
    if (rel.split('/').some(seg => this.ignore.includes(seg))) return null;
    const abs = path.join(this.root, rel);
    const before = this.state.get(rel) || null;
    let after = null, size = 0;
    try {
      if (fs.statSync(abs).isFile()) { const r = this.hashFile(abs); after = r.hash; size = r.size; }
    } catch { after = null; }
    if (before === after) return null;
    const action = before === null ? 'created' : after === null ? 'deleted' : 'modified';
    if (after === null) this.state.delete(rel); else this.state.set(rel, after);
    return this.log.append('file', { action, path: rel, before, after, size });
  }

  start() {
    this.baseline();
    this.watcher = fs.watch(this.root, { recursive: true }, (_ev, name) => {
      if (!name) return;
      const rel = String(name).split(path.sep).join('/');
      clearTimeout(this.timers.get(rel));
      // debounce editors that write in several steps
      this.timers.set(rel, setTimeout(() => { this.timers.delete(rel); this.check(rel); }, 150));
    });
    return this;
  }

  stop() { if (this.watcher) this.watcher.close(); for (const t of this.timers.values()) clearTimeout(t); }
}

// Restore `rel` to the content it had before log entry `seq` (or before its most recent change).
function rollback({ root, entries, store, rel, seq }) {
  const changes = entries.filter(e => e.type === 'file' && e.data.path === rel);
  if (!changes.length) throw new Error(`No recorded changes for ${rel}`);
  const target = seq ? changes.find(e => e.seq === Number(seq)) : changes[changes.length - 1];
  if (!target) throw new Error(`Entry #${seq} is not a change to ${rel}`);
  const abs = path.join(path.resolve(root), rel);
  const before = target.data.before;
  if (before === null) {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    return { restored: 'removed (file did not exist before)', entry: target.seq };
  }
  if (before.startsWith('big:') || !store.has(before)) throw new Error('Earlier version was too large to keep, so it cannot be restored');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, store.get(before));
  return { restored: `content from before entry #${target.seq}`, entry: target.seq };
}

module.exports = { FileWatcher, BlobStore, rollback, walk, DEFAULT_IGNORE };
