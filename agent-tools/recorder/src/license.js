'use strict';
// License keys: "SIREN1.<payload>.<signature>" (both base64url).
// payload = { lid, product, plan, iat, exp, via }  — exp is a ms timestamp.
// Signed with the seller's Ed25519 private key (only the license server has it);
// verified offline here with the public key in public-key.js.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { PUBLIC_KEY_SPKI_B64 } = require('./public-key');

const PREFIX = 'SIREN1';
const PRODUCT = 'flight-recorder';
const LICENSE_FILE = process.env.SIREN_LICENSE_FILE || path.join(os.homedir(), '.siren', 'license.key');

const b64u = {
  enc: buf => Buffer.from(buf).toString('base64url'),
  dec: str => Buffer.from(str, 'base64url'),
};

function publicKey(spkiB64 = PUBLIC_KEY_SPKI_B64) {
  return crypto.createPublicKey({ key: Buffer.from(spkiB64, 'base64'), format: 'der', type: 'spki' });
}

function sign(payload, privateKey) {
  const body = b64u.enc(JSON.stringify(payload));
  const sig = crypto.sign(null, Buffer.from(`${PREFIX}.${body}`), privateKey);
  return `${PREFIX}.${body}.${b64u.enc(sig)}`;
}

// Returns { valid, reason?, payload? }
function verify(key, { pub = publicKey(), product = PRODUCT, now = Date.now() } = {}) {
  if (typeof key !== 'string') return { valid: false, reason: 'no license key' };
  const parts = key.trim().split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { valid: false, reason: 'not a SIREN license key' };
  let ok = false;
  try { ok = crypto.verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), pub, b64u.dec(parts[2])); } catch { ok = false; }
  if (!ok) return { valid: false, reason: 'signature check failed (key was edited or not issued by SIREN)' };
  let payload;
  try { payload = JSON.parse(b64u.dec(parts[1]).toString('utf8')); } catch { return { valid: false, reason: 'unreadable key' }; }
  const products = Array.isArray(payload.product) ? payload.product : [payload.product];
  if (!products.includes(product) && !products.includes('all')) return { valid: false, reason: `key is for ${products.join(', ')}, not ${product}`, payload };
  if (typeof payload.exp !== 'number' || payload.exp < now) return { valid: false, reason: `key expired ${new Date(payload.exp).toISOString().slice(0, 10)} — renew to keep recording`, payload };
  return { valid: true, payload };
}

function saveKey(key) {
  fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(LICENSE_FILE, key.trim() + '\n', { mode: 0o600 });
  return LICENSE_FILE;
}

function loadKey() {
  if (process.env.SIREN_LICENSE) return process.env.SIREN_LICENSE;
  return fs.existsSync(LICENSE_FILE) ? fs.readFileSync(LICENSE_FILE, 'utf8').trim() : null;
}

module.exports = { sign, verify, saveKey, loadKey, publicKey, PREFIX, PRODUCT, LICENSE_FILE };
