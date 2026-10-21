#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { ChainLog } = require('./chainlog');
const { FileWatcher, BlobStore, rollback } = require('./files');
const { createProxy } = require('./proxy');
const { digest } = require('./digest');
const license = require('./license');

const STORE_URL = process.env.SIREN_STORE_URL || 'https://siren.watch/agent-tools/';
const API_URL = process.env.SIREN_API_URL || 'https://api.siren.watch';
const HOME = process.env.SIREN_HOME || path.join(os.homedir(), '.siren');

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { out['--'] = argv.slice(i + 1); break; }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v !== undefined ? v : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else out._.push(a);
  }
  return out;
}

// Each workspace gets its own record, stored OUTSIDE the workspace so the agent can't tidy it away.
function paths(root) {
  const abs = path.resolve(root || '.');
  const id = crypto.createHash('sha256').update(abs).digest('hex').slice(0, 12);
  const dir = path.join(HOME, 'recorder', id);
  return { root: abs, dir, log: path.join(dir, 'events.jsonl'), blobs: path.join(dir, 'blobs'), hosts: path.join(dir, 'hosts.json') };
}

function signingKey() {
  const p = path.join(HOME, 'recorder-signing.pem');
  if (!fs.existsSync(p)) {
    fs.mkdirSync(HOME, { recursive: true, mode: 0o700 });
    const { privateKey } = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(p, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  }
  const priv = crypto.createPrivateKey(fs.readFileSync(p));
  return { priv, pub: crypto.createPublicKey(priv) };
}

function requireLicense() {
  const result = license.verify(license.loadKey());
  if (!result.valid) {
    console.error(`\n🔒 SIREN Flight Recorder needs an active license: ${result.reason}.`);
    console.error(`   Get one (card or USDC) at ${STORE_URL}`);
    console.error('   Then run:  siren-fr activate <your-key>\n');
    process.exit(2);
  }
  return result.payload;
}

async function main() {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  const p = paths(a.root);

  switch (cmd) {
    case 'activate': {
      const key = a._[1];
      const r = license.verify(key);
      if (!r.valid) { console.error(`That key didn't work: ${r.reason}`); process.exit(2); }
      const where = license.saveKey(key);
      console.log(`✅ Activated (${r.payload.plan}, valid until ${new Date(r.payload.exp).toISOString().slice(0, 10)}). Saved to ${where}`);
      return;
    }
    case 'renew': {
      const key = license.loadKey();
      if (!key) { console.error('No key installed yet. Run: siren-fr activate <key>'); process.exit(2); }
      const res = await fetch(`${API_URL}/renew`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.key) { console.error(`Renewal failed: ${body.error || res.status}. Manage your plan at ${STORE_URL}`); process.exit(2); }
      const r = license.verify(body.key);
      if (!r.valid) { console.error(`Server returned an unusable key: ${r.reason}`); process.exit(2); }
      license.saveKey(body.key);
      console.log(`✅ Renewed until ${new Date(r.payload.exp).toISOString().slice(0, 10)}.`);
      return;
    }
    case 'status': {
      const r = license.verify(license.loadKey());
      console.log(r.valid ? `License: active (${r.payload.plan}) until ${new Date(r.payload.exp).toISOString().slice(0, 10)}` : `License: inactive — ${r.reason}`);
      console.log(`Record for ${p.root}: ${fs.existsSync(p.log) ? ChainLog.readAll(p.log).length + ' entries' : 'none yet'}`);
      return;
    }
    case 'start': {
      const lic = requireLicense();
      const { priv } = signingKey();
      const log = new ChainLog(p.log, { signingKey: priv });
      const store = new BlobStore(p.blobs);
      const known = new Set(fs.existsSync(p.hosts) ? JSON.parse(fs.readFileSync(p.hosts, 'utf8')) : []);
      const port = Number(a.port || 8742);
      log.append('session', { event: 'start', root: p.root, port, lid: lic.lid, version: require('../package.json').version });
      const watcher = new FileWatcher({ root: p.root, log, store }).start();
      const proxy = createProxy({ log, knownHosts: known });
      proxy.on('error', err => {
        console.error(err.code === 'EADDRINUSE' ? `Port ${port} is busy — is the recorder already running? Use --port to pick another.` : err.message);
        log.append('session', { event: 'error', error: err.code || err.message });
        watcher.stop(); process.exit(1);
      });
      proxy.listen(port, '127.0.0.1', () => {
        console.log(`🛩  Recording ${p.root}`);
        console.log(`   Point your agent's network at the recorder:  export HTTPS_PROXY=http://127.0.0.1:${port} HTTP_PROXY=http://127.0.0.1:${port}`);
        console.log(`   Daily summary:  siren-fr digest --root "${p.root}"`);
      });
      const shutdown = () => {
        fs.writeFileSync(p.hosts, JSON.stringify([...known]));
        log.append('session', { event: 'stop' });
        watcher.stop(); proxy.close(); process.exit(0);
      };
      process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
      // Re-check the license once a day so an expired key stops recording.
      setInterval(() => { if (!license.verify(license.loadKey()).valid) { console.error('License expired; stopping.'); shutdown(); } }, 6 * 3600 * 1000).unref();
      return;
    }
    case 'exec': {
      requireLicense();
      const cmdv = a['--'];
      if (!cmdv || !cmdv.length) { console.error('Usage: siren-fr exec -- <command> [args...]'); process.exit(1); }
      const log = new ChainLog(p.log, { signingKey: signingKey().priv });
      const started = Date.now();
      let tail = '';
      const child = spawn(cmdv[0], cmdv.slice(1), { stdio: ['inherit', 'inherit', 'pipe'] });
      child.stderr.on('data', c => { process.stderr.write(c); tail = (tail + c.toString()).slice(-2000); });
      child.on('close', code => {
        log.append('exec', { command: cmdv.join(' ').slice(0, 500), exitCode: code, ms: Date.now() - started, stderrTail: code ? tail : '' });
        process.exit(code ?? 1);
      });
      child.on('error', err => { log.append('exec', { command: cmdv.join(' '), exitCode: 127, error: err.message }); process.exit(127); });
      return;
    }
    case 'verify': {
      requireLicense();
      const r = ChainLog.verify(p.log, { publicKey: signingKey().pub });
      if (r.ok) console.log(`✅ ${r.count} entries, chain intact, all signatures valid.`);
      else { console.log(`🚨 Record was altered (${r.problems.length} problem(s)):`); r.problems.slice(0, 20).forEach(x => console.log(`   line ${x.line}: ${x.reason}`)); process.exitCode = 1; }
      return;
    }
    case 'digest': {
      requireLicense();
      const entries = ChainLog.readAll(p.log);
      const v = ChainLog.verify(p.log, { publicKey: signingKey().pub });
      const hours = Number(a.hours || 24);
      const text = digest(entries, { sinceMs: hours * 3600000, verifyResult: v });
      if (a.out) { fs.writeFileSync(a.out, text + '\n'); console.log(`Digest written to ${a.out}`); } else console.log(text);
      return;
    }
    case 'log': {
      requireLicense();
      const n = Number(a.last || 30);
      for (const e of ChainLog.readAll(p.log).slice(-n)) {
        const d = e.data || {};
        const what = e.type === 'file' ? `${d.action} ${d.path}` : e.type === 'net' ? `${d.scheme} ${d.host} ↑${d.bytesOut || 0}B${d.firstContact ? ' (first contact)' : ''}${d.error ? ' ERROR ' + d.error : ''}` : e.type === 'exec' ? `exit ${d.exitCode}: ${d.command}` : JSON.stringify(d);
        console.log(`#${e.seq} ${e.ts.slice(0, 19)} ${e.type.padEnd(8)} ${what}`);
      }
      return;
    }
    case 'rollback': {
      requireLicense();
      const rel = a._[1];
      if (!rel) { console.error('Usage: siren-fr rollback <path> [--entry <#>]'); process.exit(1); }
      const entries = ChainLog.readAll(p.log);
      const r = rollback({ root: p.root, entries, store: new BlobStore(p.blobs), rel, seq: a.entry });
      new ChainLog(p.log, { signingKey: signingKey().priv }).append('rollback', { path: rel, toBeforeEntry: r.entry, by: 'human' });
      console.log(`↩️  ${rel}: ${r.restored}`);
      return;
    }
    default:
      console.log(`SIREN Flight Recorder — an independent, tamper-evident record of what your AI agent did.

  siren-fr activate <key>        install your license key
  siren-fr start [--root DIR]    record file changes + outbound network for DIR (default: here)
  siren-fr exec -- <cmd>         run a command and record its exit code even if the agent doesn't
  siren-fr digest [--hours 24]   plain-English summary for the human
  siren-fr log [--last 30]       raw recent entries
  siren-fr verify                prove the record hasn't been edited
  siren-fr rollback <path>       undo the last recorded change to a file
  siren-fr status | renew

Get a license: ${STORE_URL}`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
