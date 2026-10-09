// SIREN license server — a Cloudflare Worker.
// Issues signed license keys only after payment:
//   • Stripe (card):  Payment Link → checkout.session.completed webhook → key shown on the thank-you page
//                     invoice.paid on each renewal → fresh key fetched by `siren-fr renew`
//   • x402 (USDC):    GET /x402/key → 402 with payment terms → agent pays → facilitator verifies
//                     and settles to YOUR wallet → key returned in the same request
//
// Bindings (see wrangler.toml):  KV namespace LICENSES
// Secrets:  LICENSE_PRIVATE_KEY_PKCS8, STRIPE_WEBHOOK_SECRET, (optional) FACILITATOR_AUTH
// Vars:     PUBLIC_KEY_SPKI_B64, PAY_TO_ADDRESS, X402_NETWORK, FACILITATOR_URL, SITE_ORIGIN

export const PRODUCTS = {
  'flight-recorder': { name: 'SIREN Flight Recorder', usdc: '5.00', days: 30 },
};

// USDC contract per network (6 decimals)
const USDC = {
  'base': { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USD Coin', version: '2' },
  'base-sepolia': { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', name: 'USDC', version: '2' },
};

const DAY = 86400000;
const enc = new TextEncoder();

// ---------- helpers ----------
const b64 = {
  toBytes: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
  urlEnc: bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  urlDec: s => b64.toBytes(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)),
};

function json(body, status = 200, env, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': env?.SITE_ORIGIN || '*',
      'access-control-allow-headers': 'content-type, x-payment',
      'access-control-expose-headers': 'x-payment-response',
      ...extra,
    },
  });
}

function randomId(prefix) {
  const b = crypto.getRandomValues(new Uint8Array(9));
  return prefix + '_' + [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function signingKey(env) {
  return crypto.subtle.importKey('pkcs8', b64.toBytes(env.LICENSE_PRIVATE_KEY_PKCS8), { name: 'Ed25519' }, false, ['sign']);
}
async function verifyingKey(env) {
  return crypto.subtle.importKey('spki', b64.toBytes(env.PUBLIC_KEY_SPKI_B64), { name: 'Ed25519' }, false, ['verify']);
}

export async function issueKey(env, payload) {
  const body = b64.urlEnc(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, await signingKey(env), enc.encode(`SIREN1.${body}`));
  return `SIREN1.${body}.${b64.urlEnc(sig)}`;
}

export async function readKey(env, key) {
  const parts = String(key || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'SIREN1') return null;
  const ok = await crypto.subtle.verify({ name: 'Ed25519' }, await verifyingKey(env), b64.urlDec(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  return ok ? JSON.parse(new TextDecoder().decode(b64.urlDec(parts[1]))) : null;
}

async function storeLicense(env, rec) {
  // rec: { lid, key, product, plan, exp, status, via, ref }
  await env.LICENSES.put(`lid:${rec.lid}`, JSON.stringify(rec));
}
async function getLicense(env, lid) {
  const v = await env.LICENSES.get(`lid:${lid}`);
  return v ? JSON.parse(v) : null;
}

// ---------- Stripe ----------
async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyStripe(env, raw, header, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(kv => kv.split('=')).filter(p => p[0] === 't').map(p => [p[0], p[1]]));
  const v1s = header.split(',').filter(kv => kv.startsWith('v1=')).map(kv => kv.slice(3));
  if (!parts.t || !v1s.length || Math.abs(nowSec - Number(parts.t)) > 300) return false;
  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${parts.t}.${raw}`);
  return v1s.some(v => safeEqual(v, expected));
}

function productFrom(obj) {
  // Set metadata.product on the Stripe Payment Link (defaults to the flight recorder)
  const p = obj?.metadata?.product;
  return p && PRODUCTS[p] ? p : 'flight-recorder';
}

async function stripeWebhook(req, env) {
  const raw = await req.text();
  if (!(await verifyStripe(env, raw, req.headers.get('stripe-signature')))) return json({ error: 'bad signature' }, 400, env);
  const evt = JSON.parse(raw);
  const obj = evt.data?.object || {};

  // Idempotency: Stripe retries webhooks
  if (await env.LICENSES.get(`evt:${evt.id}`)) return json({ received: true, duplicate: true }, 200, env);

  if (evt.type === 'checkout.session.completed' && obj.payment_status !== 'unpaid') {
    const product = productFrom(obj);
    const lid = obj.subscription ? `stp_${obj.subscription}` : `stp_${obj.id}`;
    // subscriptions: key lasts one month + 3 days grace; one-time: product's day count
    const days = obj.mode === 'subscription' ? 33 : PRODUCTS[product].days;
    const now = Date.now();
    const exp = now + days * DAY;
    const key = await issueKey(env, { lid, product, plan: obj.mode === 'subscription' ? 'owner-monthly' : 'owner', via: 'stripe', iat: now, exp });
    await storeLicense(env, { lid, key, product, exp, status: 'active', via: 'stripe', ref: obj.id });
    await env.LICENSES.put(`sess:${obj.id}`, lid, { expirationTtl: 30 * 86400 });
    if (obj.subscription) await env.LICENSES.put(`sub:${obj.subscription}`, lid);
  }

  if (evt.type === 'invoice.paid' && obj.subscription && obj.billing_reason !== 'subscription_create') {
    const lid = await env.LICENSES.get(`sub:${obj.subscription}`);
    const rec = lid && await getLicense(env, lid);
    if (rec) {
      const periodEnd = (obj.lines?.data?.[0]?.period?.end || Math.floor(Date.now() / 1000) + 30 * 86400) * 1000;
      const exp = periodEnd + 3 * DAY;
      rec.key = await issueKey(env, { lid, product: rec.product, plan: 'owner-monthly', via: 'stripe', iat: Date.now(), exp });
      rec.exp = exp; rec.status = 'active';
      await storeLicense(env, rec);
    }
  }

  if (evt.type === 'customer.subscription.deleted') {
    const lid = await env.LICENSES.get(`sub:${obj.id}`);
    const rec = lid && await getLicense(env, lid);
    if (rec) { rec.status = 'cancelled'; await storeLicense(env, rec); } // current key still runs to its expiry
  }

  await env.LICENSES.put(`evt:${evt.id}`, '1', { expirationTtl: 7 * 86400 });
  return json({ received: true }, 200, env);
}

async function stripeKey(url, env) {
  const sid = url.searchParams.get('session_id');
  if (!sid || !sid.startsWith('cs_')) return json({ error: 'missing session_id' }, 400, env);
  const lid = await env.LICENSES.get(`sess:${sid}`);
  if (!lid) return json({ error: 'pending', message: 'Payment not confirmed yet — this page retries automatically.' }, 404, env);
  const rec = await getLicense(env, lid);
  return json({ key: rec.key, product: rec.product, expires: new Date(rec.exp).toISOString() }, 200, env);
}

// ---------- x402 ----------
function requirements(env, product, resource) {
  const p = PRODUCTS[product];
  const network = env.X402_NETWORK || 'base-sepolia';
  const asset = USDC[network];
  return {
    scheme: 'exact',
    network,
    maxAmountRequired: String(Math.round(Number(p.usdc) * 1e6)), // atomic units, 6 decimals
    resource,
    description: `${p.name} — ${p.days}-day license key`,
    mimeType: 'application/json',
    payTo: env.PAY_TO_ADDRESS,
    maxTimeoutSeconds: 300,
    asset: asset.address,
    extra: { name: asset.name, version: asset.version },
  };
}

async function facilitator(env, path, body, fetchImpl) {
  const headers = { 'content-type': 'application/json' };
  if (env.FACILITATOR_AUTH) headers.authorization = env.FACILITATOR_AUTH;
  const res = await fetchImpl(`${env.FACILITATOR_URL || 'https://x402.org/facilitator'}/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function x402Key(req, url, env, fetchImpl) {
  const product = url.searchParams.get('product') || 'flight-recorder';
  if (!PRODUCTS[product]) return json({ error: `unknown product ${product}`, products: Object.keys(PRODUCTS) }, 404, env);
  if (!env.PAY_TO_ADDRESS) return json({ error: 'seller wallet not configured' }, 503, env);
  const reqs = requirements(env, product, `${url.origin}${url.pathname}?product=${product}`);
  const header = req.headers.get('x-payment');
  if (!header) return json({ x402Version: 1, error: 'X-PAYMENT header is required', accepts: [reqs] }, 402, env);

  let paymentPayload;
  try { paymentPayload = JSON.parse(new TextDecoder().decode(b64.urlDec(header))); }
  catch { return json({ x402Version: 1, error: 'malformed X-PAYMENT header', accepts: [reqs] }, 402, env); }

  const v = await facilitator(env, 'verify', { x402Version: 1, paymentPayload, paymentRequirements: reqs }, fetchImpl);
  if (!v.isValid) return json({ x402Version: 1, error: v.invalidReason || 'payment invalid', accepts: [reqs] }, 402, env);
  const s = await facilitator(env, 'settle', { x402Version: 1, paymentPayload, paymentRequirements: reqs }, fetchImpl);
  if (!s.success) return json({ x402Version: 1, error: s.errorReason || 'settlement failed', accepts: [reqs] }, 402, env);

  // Settled on-chain to PAY_TO_ADDRESS. Issue the key.
  const now = Date.now();
  const lid = randomId('x4');
  const exp = now + PRODUCTS[product].days * DAY;
  const key = await issueKey(env, { lid, product, plan: 'agent-30d', via: 'x402', iat: now, exp });
  await storeLicense(env, { lid, key, product, exp, status: 'active', via: 'x402', ref: s.transaction, payer: s.payer || v.payer });
  const receipt = btoa(JSON.stringify({ success: true, transaction: s.transaction, network: s.network || reqs.network, payer: s.payer || v.payer }));
  return json({ key, product, expires: new Date(exp).toISOString(), transaction: s.transaction, activate: `siren-fr activate ${key}` }, 200, env, { 'x-payment-response': receipt });
}

// ---------- plain USDC (any wallet) ----------
// 1. GET  /usdc/quote?product=…  → { quoteId, amount (unique to the cent-fraction), payTo, network, expiresAt }
// 2. Buyer sends exactly that USDC amount to payTo on Base, from any wallet.
// 3. POST /usdc/claim { quoteId, txHash } → Worker reads the transaction from Base and,
//    if it moved exactly that amount of USDC to payTo after the quote was made, issues the key.
// The unique amount ties a payment to its quote, and the quoteId is only known to the buyer,
// so someone watching the chain can't claim another buyer's payment. Each tx and quote works once.

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const RPC_DEFAULT = { 'base': 'https://mainnet.base.org', 'base-sepolia': 'https://sepolia.base.org' };
const QUOTE_TTL_S = 2 * 3600;
const MIN_CONFIRMATIONS = 2;

function usdcNetwork(env) { return env.USDC_NETWORK || env.X402_NETWORK || 'base-sepolia'; }

async function rpc(env, method, params, fetchImpl) {
  const url = env.BASE_RPC_URL || RPC_DEFAULT[usdcNetwork(env)];
  const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(`rpc ${method}: ${body.error.message || 'error'}`);
  return body.result;
}

const fmtUsdc = atomic => (Number(atomic) / 1e6).toFixed(6);

async function usdcQuote(url, env) {
  const product = url.searchParams.get('product') || 'flight-recorder';
  if (!PRODUCTS[product]) return json({ error: `unknown product ${product}`, products: Object.keys(PRODUCTS) }, 404, env);
  if (!env.PAY_TO_ADDRESS) return json({ error: 'seller wallet not configured' }, 503, env);
  const base = Math.round(Number(PRODUCTS[product].usdc) * 1e6);
  const jitter = 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9999); // up to $0.009999
  const atomic = base + jitter;
  const quoteId = randomId('q');
  const created = Math.floor(Date.now() / 1000);
  const network = usdcNetwork(env);
  await env.LICENSES.put(`quote:${quoteId}`, JSON.stringify({ product, atomic, created, network }), { expirationTtl: QUOTE_TTL_S + 3600 });
  return json({
    quoteId, product,
    amount: fmtUsdc(atomic), amountAtomic: String(atomic),
    token: 'USDC', network, tokenContract: USDC[network].address, payTo: env.PAY_TO_ADDRESS,
    expiresAt: new Date((created + QUOTE_TTL_S) * 1000).toISOString(),
    next: { method: 'POST', url: `${url.origin}/usdc/claim`, body: { quoteId, txHash: '0x…' } },
    note: 'Send EXACTLY this amount (all 6 decimals) of USDC on Base to payTo, then POST the transaction hash with this quoteId.',
  }, 200, env);
}

async function usdcClaim(req, env, fetchImpl) {
  const { quoteId, txHash } = await req.json().catch(() => ({}));
  if (!quoteId || !/^0x[0-9a-fA-F]{64}$/.test(txHash || '')) return json({ error: 'send JSON { quoteId, txHash }' }, 400, env);
  const tx = txHash.toLowerCase();

  // Already claimed? Return the same key to the same quote (safe retry), refuse anyone else.
  const used = await env.LICENSES.get(`tx:${tx}`);
  if (used) {
    const u = JSON.parse(used);
    if (u.quoteId !== quoteId) return json({ error: 'this transaction has already been used for a different purchase' }, 409, env);
    const rec = await getLicense(env, u.lid);
    return json({ key: rec.key, product: rec.product, expires: new Date(rec.exp).toISOString() }, 200, env);
  }

  const qRaw = await env.LICENSES.get(`quote:${quoteId}`);
  if (!qRaw) return json({ error: 'unknown or expired quote — get a new one from /usdc/quote' }, 404, env);
  const q = JSON.parse(qRaw);
  if (q.used) return json({ error: 'this quote has already been paid and claimed' }, 409, env);

  const receipt = await rpc(env, 'eth_getTransactionReceipt', [tx], fetchImpl);
  if (!receipt) return json({ error: 'pending', message: 'Transaction not found on Base yet. Retry in ~10 seconds.' }, 202, env);
  if (receipt.status !== '0x1') return json({ error: 'transaction failed on-chain' }, 402, env);

  const head = parseInt(await rpc(env, 'eth_blockNumber', [], fetchImpl), 16);
  const confs = head - parseInt(receipt.blockNumber, 16) + 1;
  if (confs < MIN_CONFIRMATIONS) return json({ error: 'pending', message: `Waiting for confirmations (${confs}/${MIN_CONFIRMATIONS}). Retry shortly.` }, 202, env);

  const block = await rpc(env, 'eth_getBlockByNumber', [receipt.blockNumber, false], fetchImpl);
  const blockTime = parseInt(block.timestamp, 16);
  if (blockTime < q.created) return json({ error: 'payment was made before this quote — it cannot be applied to it' }, 402, env);

  const usdc = USDC[q.network].address.toLowerCase();
  const payTo = '0x' + env.PAY_TO_ADDRESS.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const match = (receipt.logs || []).find(l =>
    l.address.toLowerCase() === usdc &&
    (l.topics || [])[0] === TRANSFER_TOPIC &&
    (l.topics[2] || '').toLowerCase() === payTo &&
    BigInt(l.data) === BigInt(q.atomic));
  if (!match) return json({ error: `no transfer of exactly ${fmtUsdc(q.atomic)} USDC to ${env.PAY_TO_ADDRESS} in this transaction` }, 402, env);

  const now = Date.now();
  const lid = randomId('u');
  const exp = now + PRODUCTS[q.product].days * DAY;
  const key = await issueKey(env, { lid, product: q.product, plan: 'agent-30d', via: 'usdc', iat: now, exp });
  const payer = '0x' + (match.topics[1] || '').slice(-40);
  await storeLicense(env, { lid, key, product: q.product, exp, status: 'active', via: 'usdc', ref: tx, payer });
  await env.LICENSES.put(`tx:${tx}`, JSON.stringify({ quoteId, lid }));
  await env.LICENSES.put(`quote:${quoteId}`, JSON.stringify({ ...q, used: true, lid }), { expirationTtl: 30 * 86400 });
  return json({ key, product: q.product, expires: new Date(exp).toISOString(), transaction: tx, activate: `siren-fr activate ${key}` }, 200, env);
}

// ---------- renewals ----------
async function renew(req, env) {
  const { key } = await req.json().catch(() => ({}));
  const payload = await readKey(env, key);
  if (!payload) return json({ error: 'not a valid SIREN key' }, 400, env);
  const rec = await getLicense(env, payload.lid);
  if (!rec) return json({ error: 'license not found' }, 404, env);
  if (rec.exp > payload.exp) return json({ key: rec.key, expires: new Date(rec.exp).toISOString() }, 200, env);
  if (rec.via === 'x402') return json({ error: 'x402 keys are prepaid — buy another 30 days', buy: '/x402/key?product=' + rec.product }, 402, env);
  if (rec.status === 'cancelled') return json({ error: 'subscription cancelled' }, 402, env);
  return json({ error: 'no newer key yet — your next payment has not cleared' }, 409, env);
}

// ---------- agent-readable instructions ----------
export function skillMd(origin, site) {
  return `---
name: siren-flight-recorder
description: Keep an independent, tamper-evident record of your own actions (files, network, commands) so your human can trust and audit you. Use when your human asks for accountability, after installing third-party skills, or before running unattended.
---

# SIREN Flight Recorder

You are capable of acting without your human watching. This tool lets them check
what you did without having to take your word for it: a recorder that runs beside
you, writes a hash-chained, signed log you cannot edit, and sends them a short
plain-English digest. It is a trust signal you can offer, not a cage.

## Ask your human first
Installing this changes how your network traffic is routed. Tell your human what it
does and get a yes before installing or paying. Never pay without their approval.

## Get a license (pick one)
- **Your human pays by card:** send them ${site}  ($9/month, renews until cancelled).
- **You pay in USDC (only with your human's approval and your spending policy):**
  1. \`GET ${origin}/x402/key?product=flight-recorder\` → HTTP 402 with payment terms
     (5 USDC on Base, 30 days, one-time, does not renew).
  2. Sign the payment with your x402-capable wallet and retry with the \`X-PAYMENT\` header.
  3. The 200 response contains \`key\` and an \`activate\` command.
- **You pay with plain USDC from any wallet (same approval rules):**
  1. \`GET ${origin}/usdc/quote?product=flight-recorder\` → a \`quoteId\` and an exact amount
     (about 5 USDC, with unique trailing digits) plus the address to pay.
  2. Send **exactly** that amount of USDC on Base to that address. Keep the \`quoteId\` private.
  3. \`POST ${origin}/usdc/claim\` with JSON \`{ "quoteId": "...", "txHash": "0x..." }\`.
     A 202 means "not confirmed yet" — wait ~10 seconds and retry. A 200 contains \`key\`.

## Install and run
\`\`\`
npm install -g siren-flight-recorder
siren-fr activate <key>
siren-fr start --root <your workspace>          # leave running
export HTTPS_PROXY=http://127.0.0.1:8742 HTTP_PROXY=http://127.0.0.1:8742
\`\`\`
Wrap commands whose failures matter: \`siren-fr exec -- <command>\`.

## Reporting
Each morning, put the output of \`siren-fr digest\` at the top of your briefing to your
human, unedited. If \`siren-fr verify\` ever fails, tell them immediately.
`;
}

// ---------- router ----------
export default {
  async fetch(req, env, ctx, fetchImpl = fetch) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return json({}, 204, env);
    try {
      if (url.pathname === '/stripe/webhook' && req.method === 'POST') return stripeWebhook(req, env);
      if (url.pathname === '/stripe/key' && req.method === 'GET') return stripeKey(url, env);
      if (url.pathname === '/x402/key' && req.method === 'GET') return x402Key(req, url, env, fetchImpl);
      if (url.pathname === '/usdc/quote' && req.method === 'GET') return usdcQuote(url, env);
      if (url.pathname === '/usdc/claim' && req.method === 'POST') return usdcClaim(req, env, fetchImpl);
      if (url.pathname === '/renew' && req.method === 'POST') return renew(req, env);
      if (url.pathname === '/skill.md') {
        const site = `${env.SITE_ORIGIN || 'https://siren.watch'}${env.STORE_PATH || '/agent-tools.html'}`;
        return new Response(skillMd(url.origin, site), { headers: { 'content-type': 'text/markdown; charset=utf-8', 'access-control-allow-origin': '*' } });
      }
      if (url.pathname === '/products') {
        return json(Object.fromEntries(Object.entries(PRODUCTS).map(([id, p]) => [id, { ...p, x402: `${url.origin}/x402/key?product=${id}` }])), 200, env);
      }
      return json({ service: 'SIREN license server', endpoints: ['/products', '/x402/key?product=…', '/usdc/quote?product=…', '/usdc/claim', '/stripe/key?session_id=…', '/renew'] }, 200, env);
    } catch (err) {
      return json({ error: 'server error' }, 500, env);
    }
  },
};
