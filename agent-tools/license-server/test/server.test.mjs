import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import worker, { issueKey } from '../src/index.js';

const require = createRequire(import.meta.url);
const license = require('../../recorder/src/license.js');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const kv = () => { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } }; };
const makeEnv = () => ({
  LICENSES: kv(),
  LICENSE_PRIVATE_KEY_PKCS8: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
  PUBLIC_KEY_SPKI_B64: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  PAY_TO_ADDRESS: '0x1111111111111111111111111111111111111111',
  X402_NETWORK: 'base-sepolia',
  FACILITATOR_URL: 'https://facilitator.test',
});
const call = (env, path, init = {}, fetchImpl) => worker.fetch(new Request('https://api.siren.watch' + path, init), env, {}, fetchImpl);
const verifyInRecorder = key => license.verify(key, { pub: publicKey });

function stripeSigned(env, event, t = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${t}.${raw}`).digest('hex');
  return { method: 'POST', body: raw, headers: { 'stripe-signature': `t=${t},v1=${sig}` } };
}

test('keys signed in the Worker verify in the recorder (cross-runtime)', async () => {
  const env = makeEnv();
  const key = await issueKey(env, { lid: 'x', product: 'flight-recorder', plan: 'owner', iat: Date.now(), exp: Date.now() + 1e6 });
  assert.equal(verifyInRecorder(key).valid, true);
});

test('Stripe: unsigned or forged webhooks are rejected and issue nothing', async () => {
  const env = makeEnv();
  const evt = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1', mode: 'subscription', subscription: 'sub_1', payment_status: 'paid' } } };
  assert.equal((await call(env, '/stripe/webhook', { method: 'POST', body: JSON.stringify(evt) })).status, 400);
  const forged = stripeSigned({ STRIPE_WEBHOOK_SECRET: 'wrong' }, evt);
  assert.equal((await call(env, '/stripe/webhook', forged)).status, 400);
  const stale = stripeSigned(env, evt, Math.floor(Date.now() / 1000) - 3600);
  assert.equal((await call(env, '/stripe/webhook', stale)).status, 400);
  assert.equal((await call(env, '/stripe/key?session_id=cs_1')).status, 404);
});

test('Stripe: paid checkout → key on thank-you page → renewal → cancellation', async () => {
  const env = makeEnv();
  const checkout = { id: 'evt_2', type: 'checkout.session.completed', data: { object: { id: 'cs_2', mode: 'subscription', subscription: 'sub_2', payment_status: 'paid' } } };
  assert.equal((await call(env, '/stripe/webhook', stripeSigned(env, checkout))).status, 200);
  const r = await (await call(env, '/stripe/key?session_id=cs_2')).json();
  const first = verifyInRecorder(r.key);
  assert.equal(first.valid, true);
  assert.equal(first.payload.lid, 'stp_sub_2');

  // nothing newer yet
  assert.equal((await call(env, '/renew', { method: 'POST', body: JSON.stringify({ key: r.key }) })).status, 409);

  const periodEnd = Math.floor(Date.now() / 1000) + 60 * 86400;
  const renewal = { id: 'evt_3', type: 'invoice.paid', data: { object: { subscription: 'sub_2', billing_reason: 'subscription_cycle', lines: { data: [{ period: { end: periodEnd } }] } } } };
  await call(env, '/stripe/webhook', stripeSigned(env, renewal));
  const rn = await (await call(env, '/renew', { method: 'POST', body: JSON.stringify({ key: r.key }) })).json();
  const second = verifyInRecorder(rn.key);
  assert.equal(second.valid, true);
  assert.ok(second.payload.exp > first.payload.exp);

  // duplicate delivery is ignored
  assert.equal((await (await call(env, '/stripe/webhook', stripeSigned(env, renewal))).json()).duplicate, true);

  await call(env, '/stripe/webhook', stripeSigned(env, { id: 'evt_4', type: 'customer.subscription.deleted', data: { object: { id: 'sub_2' } } }));
  assert.equal((await call(env, '/renew', { method: 'POST', body: JSON.stringify({ key: rn.key }) })).status, 402);
});

test('x402: no payment → 402 with terms paying YOUR wallet; invalid payment → no key', async () => {
  const env = makeEnv();
  const res = await call(env, '/x402/key?product=flight-recorder');
  assert.equal(res.status, 402);
  const body = await res.json();
  assert.equal(body.x402Version, 1);
  assert.equal(body.accepts[0].payTo, env.PAY_TO_ADDRESS);
  assert.equal(body.accepts[0].maxAmountRequired, '5000000');
  assert.equal(body.accepts[0].network, 'base-sepolia');

  const reject = async () => new Response(JSON.stringify({ isValid: false, invalidReason: 'insufficient_funds' }));
  const header = Buffer.from(JSON.stringify({ x402Version: 1, scheme: 'exact', network: 'base-sepolia', payload: {} })).toString('base64');
  const bad = await call(env, '/x402/key?product=flight-recorder', { headers: { 'x-payment': header } }, reject);
  assert.equal(bad.status, 402);
  assert.equal((await bad.json()).error, 'insufficient_funds');
});

test('x402: verified + settled payment returns a working 30-day key', async () => {
  const env = makeEnv();
  const seen = [];
  const facilitatorOk = async (url, init) => {
    const body = JSON.parse(init.body); seen.push([url, body.paymentRequirements.payTo]);
    return new Response(JSON.stringify(url.endsWith('/verify')
      ? { isValid: true, payer: '0xabc' }
      : { success: true, transaction: '0xtxhash', network: 'base-sepolia', payer: '0xabc' }));
  };
  const header = Buffer.from(JSON.stringify({ x402Version: 1, scheme: 'exact', network: 'base-sepolia', payload: { signature: '0x..' } })).toString('base64');
  const res = await call(env, '/x402/key?product=flight-recorder', { headers: { 'x-payment': header } }, facilitatorOk);
  assert.equal(res.status, 200);
  const body = await res.json();
  const v = verifyInRecorder(body.key);
  assert.equal(v.valid, true);
  assert.equal(v.payload.via, 'x402');
  assert.ok(Math.abs(v.payload.exp - Date.now() - 30 * 86400000) < 60000);
  assert.deepEqual(seen.map(s => s[0]), ['https://facilitator.test/verify', 'https://facilitator.test/settle']);
  assert.ok(seen.every(s => s[1] === env.PAY_TO_ADDRESS));
  assert.ok(res.headers.get('x-payment-response'));
});

test('skill.md tells agents to get human approval and points at the store', async () => {
  const env = { ...makeEnv(), SITE_ORIGIN: 'https://example.github.io', STORE_PATH: '/doomcon/agent-tools.html' };
  const res = await call(env, '/skill.md');
  const text = await res.text();
  assert.match(res.headers.get('content-type'), /markdown/);
  assert.match(text, /^---\nname: siren-flight-recorder/);
  assert.match(text, /Never pay without their approval/);
  assert.match(text, /https:\/\/example\.github\.io\/doomcon\/agent-tools\.html/);
  assert.match(text, /https:\/\/api\.siren\.watch\/x402\/key\?product=flight-recorder/);
});
