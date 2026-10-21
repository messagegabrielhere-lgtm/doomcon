'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const { ChainLog } = require('../src/chainlog');
const { FileWatcher, BlobStore, rollback } = require('../src/files');
const { createProxy } = require('../src/proxy');
const { digest } = require('../src/digest');
const license = require('../src/license');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sfr-'));

test('chain verifies, and detects edits, deletions and forged rebuilds', () => {
  const d = tmp(); const f = path.join(d, 'log.jsonl');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const log = new ChainLog(f, { signingKey: privateKey });
  for (let i = 0; i < 5; i++) log.append('net', { host: `h${i}.example`, bytesOut: i * 10 });
  assert.equal(ChainLog.verify(f, { publicKey }).ok, true);

  // edit one entry's content
  const lines = fs.readFileSync(f, 'utf8').trim().split('\n');
  const edited = lines.slice(); edited[2] = edited[2].replace('h2.example', 'innocent.example');
  fs.writeFileSync(f, edited.join('\n') + '\n');
  assert.equal(ChainLog.verify(f, { publicKey }).ok, false);

  // delete one entry
  fs.writeFileSync(f, lines.filter((_, i) => i !== 1).join('\n') + '\n');
  const del = ChainLog.verify(f, { publicKey });
  assert.equal(del.ok, false);
  assert.match(del.problems[0].reason, /sequence gap|previous-hash/);

  // agent rebuilds a perfectly consistent chain without the recorder's key
  const f2 = path.join(d, 'forged.jsonl');
  const forger = new ChainLog(f2, { signingKey: crypto.generateKeyPairSync('ed25519').privateKey });
  forger.append('net', { host: 'innocent.example' });
  assert.equal(ChainLog.verify(f2).ok, true, 'hash chain alone is self-consistent');
  assert.equal(ChainLog.verify(f2, { publicKey }).ok, false, 'but the recorder signature exposes it');
});

test('file watcher records changes and rollback restores them', () => {
  const root = tmp(); const d = tmp();
  fs.writeFileSync(path.join(root, 'notes.md'), 'original\n');
  const log = new ChainLog(path.join(d, 'log.jsonl'));
  const store = new BlobStore(path.join(d, 'blobs'));
  const w = new FileWatcher({ root, log, store });
  w.baseline();

  fs.writeFileSync(path.join(root, 'notes.md'), 'agent rewrote this\n');
  assert.equal(w.check('notes.md').data.action, 'modified');
  fs.writeFileSync(path.join(root, 'new.txt'), 'x');
  assert.equal(w.check('new.txt').data.action, 'created');
  fs.unlinkSync(path.join(root, 'new.txt'));
  assert.equal(w.check('new.txt').data.action, 'deleted');
  assert.equal(w.check('notes.md'), null, 'no change, no entry');

  const entries = ChainLog.readAll(path.join(d, 'log.jsonl'));
  rollback({ root, entries, store, rel: 'notes.md' });
  assert.equal(fs.readFileSync(path.join(root, 'notes.md'), 'utf8'), 'original\n');
  rollback({ root, entries, store, rel: 'new.txt' }); // undo the delete → restores 'x'
  assert.equal(fs.readFileSync(path.join(root, 'new.txt'), 'utf8'), 'x');
});

test('proxy records outbound HTTP and flags first contact', async () => {
  const d = tmp(); const f = path.join(d, 'log.jsonl');
  const log = new ChainLog(f);
  const origin = http.createServer((req, res) => { req.resume(); req.on('end', () => res.end('ok')); }).listen(0);
  const proxy = createProxy({ log }).listen(0);
  await new Promise(r => setTimeout(r, 50));
  const send = () => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: proxy.address().port, method: 'POST', path: `http://127.0.0.1:${origin.address().port}/upload` }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', reject); req.end('secret workspace content');
  });
  await send(); await send();
  await new Promise(r => setTimeout(r, 50));
  origin.close(); proxy.close();
  const net = ChainLog.readAll(f).filter(e => e.type === 'net');
  assert.equal(net.length, 2);
  assert.equal(net[0].data.bytesOut, 'secret workspace content'.length);
  assert.equal(net[0].data.firstContact, true);
  assert.equal(net[1].data.firstContact, false);
  assert.match(digest(ChainLog.readAll(f)), /First-ever contact with 127\.0\.0\.1/);
});

test('proxy records HTTPS-style CONNECT tunnels without decrypting them', async () => {
  const d = tmp(); const f = path.join(d, 'log.jsonl');
  const log = new ChainLog(f);
  const origin = http.createServer((q, s) => s.end('hi')).listen(0);
  const proxy = createProxy({ log }).listen(0);
  await new Promise(r => setTimeout(r, 50));
  const body = await new Promise((resolve, reject) => {
    require('child_process').execFile('curl', ['-s', '-p', '-x', `http://127.0.0.1:${proxy.address().port}`, `http://127.0.0.1:${origin.address().port}/`],
      { env: { PATH: process.env.PATH } }, (e, out) => e ? reject(e) : resolve(out));
  });
  await new Promise(r => setTimeout(r, 100));
  origin.close(); proxy.close();
  assert.equal(body, 'hi');
  const net = ChainLog.readAll(f).filter(e => e.type === 'net');
  assert.equal(net.length, 1);
  assert.equal(net[0].data.scheme, 'https');
  assert.ok(net[0].data.bytesOut > 0 && net[0].data.bytesIn > 0);
});

test('license keys: valid, expired, wrong product, forged, edited', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const now = Date.now();
  const good = license.sign({ lid: 'l1', product: 'flight-recorder', plan: 'owner', iat: now, exp: now + 86400000 }, privateKey);
  assert.equal(license.verify(good, { pub: publicKey }).valid, true);
  assert.equal(license.verify(license.sign({ lid: 'l', product: 'all', exp: now + 1000 }, privateKey), { pub: publicKey }).valid, true);
  assert.match(license.verify(license.sign({ product: 'flight-recorder', exp: now - 1 }, privateKey), { pub: publicKey }).reason, /expired/);
  assert.match(license.verify(license.sign({ product: 'egress-guard', exp: now + 1000 }, privateKey), { pub: publicKey }).reason, /not flight-recorder/);
  const forged = license.sign({ product: 'flight-recorder', exp: now + 1e12 }, crypto.generateKeyPairSync('ed25519').privateKey);
  assert.equal(license.verify(forged, { pub: publicKey }).valid, false);
  const [pre, body, sig] = good.split('.');
  const tampered = JSON.parse(Buffer.from(body, 'base64url')); tampered.exp = now + 1e12;
  assert.equal(license.verify(`${pre}.${Buffer.from(JSON.stringify(tampered)).toString('base64url')}.${sig}`, { pub: publicKey }).valid, false);
});

test('CLI refuses to run without a paid key and works with one', () => {
  const home = tmp(); const root = tmp();
  const env = { ...process.env, SIREN_HOME: home, SIREN_LICENSE_FILE: path.join(home, 'license.key') };
  delete env.SIREN_LICENSE;
  const cli = path.join(__dirname, '..', 'src', 'cli.js');
  const blocked = spawnSync('node', [cli, 'digest', '--root', root], { env, encoding: 'utf8' });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /needs an active license/);

  const keyFile = path.join(__dirname, '..', '..', 'tools', 'keys', 'license-private.pem');
  if (!fs.existsSync(keyFile)) return; // seller key not present (e.g. CI) — skip the paid half
  const key = execFileSync('node', [path.join(__dirname, '..', '..', 'tools', 'issue-key.js'), '1'], { encoding: 'utf8' }).trim();
  const act = spawnSync('node', [cli, 'activate', key], { env, encoding: 'utf8' });
  assert.equal(act.status, 0, act.stderr);
  const ex = spawnSync('node', [cli, 'exec', '--root', root, '--', 'node', '-e', 'console.error("boom"); process.exit(3)'], { env, encoding: 'utf8' });
  assert.equal(ex.status, 3);
  const dg = spawnSync('node', [cli, 'digest', '--root', root], { env, encoding: 'utf8' });
  assert.equal(dg.status, 0, dg.stderr);
  assert.match(dg.stdout, /Command failed \(exit 3\).*boom/);
  assert.match(dg.stdout, /all \d+ entries verified/);
});
