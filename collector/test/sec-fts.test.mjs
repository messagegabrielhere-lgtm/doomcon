import { test } from 'node:test';
import assert from 'node:assert/strict';
import sec, { politeFetch, BUDGET_MS, retryAfterMs, isTransient } from '../sources/sec-fts.mjs';

// A fake clock: sleep advances time instantly; each request costs `reqMs`.
function fakeClock(reqMs = 500) {
  let t = 1_000_000;
  const sleeps = [];
  return { now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; }, tick: (cap = Infinity) => { t += Math.min(reqMs, cap); }, sleeps, elapsed: () => t - 1_000_000 };
}
const httpErr = (status, extra = {}) => Object.assign(new Error(`HTTP ${status} X from https://efts.sec.gov/...`), { status, kind: 'http', ...extra });
const OK = { hits: { total: { value: 3585, relation: 'eq' } } };

function scripted(clock, script) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push(opts.headers['user-agent']);
    clock.tick();
    const next = script.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { fn, calls };
}

test('never sends a browser UA; declared contact only; fetch.mjs retries disabled', async () => {
  const clock = fakeClock();
  let seen;
  const fetchJson = async (url, opts) => { seen = opts; clock.tick(); return OK; };
  const r = await sec.collect(fetchJson, clock);
  assert.equal(r.value, 3585);
  assert.match(seen.headers['user-agent'], /^SIREN\/1\.0 \(/);
  assert.doesNotMatch(seen.headers['user-agent'], /Mozilla|Chrome|Safari|https?:\/\//);
  assert.equal(seen.retries, 0);
  assert.ok(seen.timeoutMs <= 15_000);
});

test('403 on the first UA moves to the second UA without waiting', async () => {
  const clock = fakeClock();
  const { fn, calls } = scripted(clock, [httpErr(403), OK]);
  const r = await sec.collect(fn, clock);
  assert.equal(r.value, 3585);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0], calls[1]);
  assert.deepEqual(clock.sleeps, []);
  assert.equal(r.meta.attempts.length, 2);
});

test('403 on every UA: waits 8s then 20s between rounds, then succeeds', async () => {
  const clock = fakeClock();
  const { fn, calls } = scripted(clock, [httpErr(403), httpErr(403), httpErr(403), httpErr(403), OK]);
  const r = await sec.collect(fn, clock);
  assert.equal(r.value, 3585);
  assert.equal(calls.length, 5);
  assert.deepEqual(clock.sleeps, [8000, 20000]);
});

test('429 does not burst the second UA in the same round, and honours Retry-After', async () => {
  const clock = fakeClock();
  const { fn, calls } = scripted(clock, [httpErr(429, { retryAfter: '12' }), OK]);
  const r = await sec.collect(fn, clock);
  assert.equal(r.value, 3585);
  assert.equal(calls.length, 2);
  assert.equal(calls[0], calls[1], 'retried with the first UA after the wait, not the second UA immediately');
  assert.deepEqual(clock.sleeps, [12000]);
});

test('5xx retried; non-transient 4xx thrown at once', async () => {
  let clock = fakeClock();
  let s = scripted(clock, [httpErr(503), OK]);
  assert.equal((await sec.collect(s.fn, clock)).value, 3585);
  assert.deepEqual(clock.sleeps, [8000]);

  clock = fakeClock();
  s = scripted(clock, [httpErr(404)]);
  await assert.rejects(sec.collect(s.fn, clock), /HTTP 404/);
  assert.equal(s.calls.length, 1);
});

test('persistent failure: bounded attempts, bounded time, specific error', async () => {
  const clock = fakeClock(15_000); // every request runs to its timeout (fetch.mjs enforces timeoutMs)
  const fn = async (url, opts) => { clock.tick(opts.timeoutMs); throw Object.assign(new Error('timeout'), { kind: 'timeout' }); };
  await assert.rejects(sec.collect(fn, clock), (err) => {
    assert.match(err.message, /polite attempt/);
    assert.match(err.message, /timeout/);
    return true;
  });
  assert.ok(clock.elapsed() <= BUDGET_MS, `elapsed ${clock.elapsed()}ms > budget`);
  assert.ok(BUDGET_MS < 70_000);
});

test('saturated count still goes dark (unchanged behaviour)', async () => {
  const clock = fakeClock();
  const fn = async () => ({ hits: { total: { value: 10000, relation: 'gte' } } });
  await assert.rejects(sec.collect(fn, clock), /saturated/);
});

test('helpers', () => {
  assert.equal(retryAfterMs({ retryAfter: '3' }), 3000);
  assert.equal(retryAfterMs({ headers: { 'retry-after': '0' } }), 0);
  assert.equal(retryAfterMs({}), null);
  assert.equal(isTransient({ kind: 'timeout' }), true);
  assert.equal(isTransient({ message: 'HTTP 403 Forbidden' }), true);
  assert.equal(isTransient({ status: 400 }), false);
  assert.ok(politeFetch);
});

test('persistent 403: exactly three rounds of the two declared UAs, 8s and 20s apart', async () => {
  const clock = fakeClock(500);
  let n = 0;
  const fn = async (url, opts) => { n++; clock.tick(opts.timeoutMs); throw httpErr(403); };
  await assert.rejects(sec.collect(fn, clock), /6 polite attempt\(s\).*HTTP 403/s);
  assert.equal(n, 6);
  assert.deepEqual(clock.sleeps, [8000, 20000]);
});
