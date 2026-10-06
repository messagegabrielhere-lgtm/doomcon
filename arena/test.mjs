// node --test arena/test.mjs  -- offline; a fake exchange stands in for Coinbase.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AGENTS, UNIVERSE } from './config.mjs';
import { newWallet, preview, execute, checkExits, equity } from './broker.mjs';
import { gate } from './rules.mjs';
import { normalize, SCHEMA } from './agents.mjs';
import { rsi, walk, qtyForUsd } from './market.mjs';
import { tick } from './run.mjs';

const NOW = Date.UTC(2026, 9, 5, 12);
const deepBook = (p, at = NOW) => ({ sym: 'X', at, bids: [[p * 0.9995, 1e6]], asks: [[p * 1.0005, 1e6]] });
const row = (sym, last, extra = {}) => ({ sym, last, vol24hUsd: 5e8, rsi14h: 50, atr14hPct: 1, ...extra });
const ctx = (rows, extra = {}) => ({ prices: Object.fromEntries(rows.map((r) => [r.sym, r.last])), rows, now: NOW, ...extra });
const wallet = () => newWallet(AGENTS[0], NOW);
const buy = (o = {}) => ({ side: 'buy', sym: 'BTC-USD', usd: 200, stop: 95, tp: null, reason: 'test entry on a pullback', ...o });
const failed = (g) => g.checks.filter((c) => !c.ok).map((c) => c.rule);

test('book walking', () => {
  const asks = [[100, 1], [101, 1], [110, 10]];
  assert.deepEqual(walk(asks, 1.5), { filled: 1.5, avg: (100 + 50.5) / 1.5, full: true });
  assert.equal(walk(asks, 20).full, false);
  const q = qtyForUsd(asks, 201);
  assert.ok(Math.abs(q.qty - 2) < 1e-9 && q.full);
});

test('rsi is bounded and directional', () => {
  const up = Array.from({ length: 40 }, (_, i) => 100 + i);
  const dn = up.slice().reverse();
  assert.equal(rsi(up), 100);
  assert.ok(rsi(dn) < 1);
});

test('a clean buy passes every rule and fills', () => {
  const w = wallet(), rows = [row('BTC-USD', 100)];
  const t = preview(w, buy(), deepBook(100), NOW);
  const g = gate(w, t, ctx(rows));
  assert.deepEqual(failed(g), []);
  execute(w, t);
  assert.ok(w.positions['BTC-USD'].qty > 1.99);
  assert.equal(w.cash, +(1000 - 200 - 200 * 0.006).toFixed(2));
  assert.equal(w.day.trades, 1);
});

test('the gate rejects what the rules forbid', () => {
  const w = wallet(), rows = [row('BTC-USD', 100), row('SHIT-USD', 1, { vol24hUsd: 1e4 })];
  const c = ctx(rows, { universe: [...UNIVERSE, 'SHIT-USD'] });
  const rej = (p, book = deepBook(100)) => failed(gate(w, preview(w, p, book, NOW), c));
  assert.ok(rej(buy({ stop: null })).includes('stop loss'));
  assert.ok(rej(buy({ stop: 50 })).includes('stop loss'), 'stop too wide');
  assert.ok(rej(buy({ stop: 99.9 })).includes('stop loss'), 'stop too tight');
  assert.ok(rej(buy({ usd: 400 })).includes('position size'));
  assert.ok(rej(buy({ usd: 5 })).includes('minimum size'));
  assert.ok(rej(buy({ reason: 'yolo' })).includes('reason'));
  assert.ok(rej(buy({ sym: 'FAKE-USD' }), null).includes('universe'));
  assert.ok(rej(buy(), deepBook(100, NOW - 10 * 60e3)).includes('fresh quote'));
  assert.ok(rej(buy({ sym: 'SHIT-USD', stop: 0.95 }), deepBook(1)).includes('liquidity'));
  assert.ok(rej({ side: 'sell', sym: 'ETH-USD', fraction: 1, reason: 'not held at all, sell' }).includes('position'));
});

test('honeypot rule: no buy you could not sell back', () => {
  const w = wallet(), rows = [row('BTC-USD', 100)];
  // Plenty of asks, almost no bids: buying works, selling back does not.
  const trap = { sym: 'BTC-USD', at: NOW, asks: [[100.05, 1e6]], bids: [[99.9, 0.01], [40, 1e6]] };
  const t = preview(w, buy(), trap, NOW);
  assert.ok(t.sellbackPct < 50);
  assert.ok(failed(gate(w, t, ctx(rows))).includes('sell-back'));
});

test('limits: open positions, trades per day, daily loss halt, cooldown', () => {
  const rows = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD'].map((s) => row(s, 100));
  const w = wallet();
  for (const s of rows.slice(0, 4)) execute(w, preview(w, buy({ sym: s.sym, usd: 150 }), deepBook(100), NOW));
  assert.ok(failed(gate(w, preview(w, buy({ sym: 'ADA-USD', usd: 50 }), deepBook(100), NOW), ctx(rows))).includes('open positions'));

  const w2 = wallet(); w2.day.trades = 99;
  assert.ok(failed(gate(w2, preview(w2, buy(), deepBook(100), NOW), ctx(rows))).includes('trades today'));

  const w3 = wallet(); w3.day.equity = 1300;
  assert.ok(failed(gate(w3, preview(w3, buy(), deepBook(100), NOW), ctx(rows))).includes('daily loss halt'));

  const w4 = wallet(); w4.cooldowns['BTC-USD'] = NOW - 10 * 60e3;
  assert.ok(failed(gate(w4, preview(w4, buy(), deepBook(100), NOW), ctx(rows))).includes('cooldown'));
});

test('stops only tighten', () => {
  const w = wallet(), rows = [row('BTC-USD', 100)];
  execute(w, preview(w, buy(), deepBook(100), NOW));
  const mv = (stop) => failed(gate(w, preview(w, { side: 'stop', sym: 'BTC-USD', stop, reason: 'trail the stop up' }, deepBook(100), NOW), ctx(rows)));
  assert.ok(mv(90).includes('stop only tightens'));
  assert.ok(mv(101).includes('stop below price'));
  assert.deepEqual(mv(98), []);
});

test('guard: stop on a wick, gap fills at the open, stop beats target', () => {
  const k = (t, o, h, l, c) => ({ t, o, h, l, c, v: 1 });
  const open = () => { const w = wallet(); execute(w, preview(w, buy({ tp: 110 }), deepBook(100), NOW)); return w; };

  let w = open();
  let e = checkExits(w, 'BTC-USD', [k(NOW, 100, 100.5, 94, 99)], NOW);
  assert.equal(e.outcome, 'stopped'); assert.ok(Math.abs(e.price - 95 * 0.999) < 1e-6);
  assert.equal(w.positions['BTC-USD'], undefined); assert.ok(w.cooldowns['BTC-USD']);

  w = open();
  e = checkExits(w, 'BTC-USD', [k(NOW, 90, 91, 89, 90)], NOW);
  assert.ok(Math.abs(e.price - 90 * 0.999) < 1e-6, 'gap through the stop fills at the open');

  w = open();
  e = checkExits(w, 'BTC-USD', [k(NOW, 100, 111, 94, 100)], NOW);
  assert.equal(e.outcome, 'stopped');

  w = open();
  e = checkExits(w, 'BTC-USD', [k(NOW, 100, 112, 99, 111)], NOW);
  assert.equal(e.outcome, 'target');

  w = open();
  assert.equal(checkExits(w, 'BTC-USD', [k(NOW - 5 * 60e3, 100, 100, 50, 100)], NOW), null, 'candles before the last check are ignored');
});

test('normalize drops junk and caps actions', () => {
  const n = normalize({ thoughts: 'x', actions: [null, { side: 'BUY', sym: 'btc-usd!', usd: 10 }, 1, {}, {}, {}] });
  assert.equal(n.actions.length, 3);
  assert.equal(n.actions[0].side, 'buy'); assert.equal(n.actions[0].sym, 'BTC-USD');
  assert.deepEqual(normalize(null).actions, []);
  assert.deepEqual(SCHEMA.properties.actions.items.required.length, 7);
});

// A fake Coinbase: a gentle downtrend so the RSI bot has something to buy.
function fakeClient(px = (s) => (s.startsWith('BTC') ? 60000 : 10), at = NOW) {
  return {
    async candles(sym, g, start) {
      const n = g === 60 ? 10 : 200, step = g * 1000, p = px(sym);
      return Array.from({ length: n }, (_, i) => {
        const c = p * (1 + (n - i) * 0.002);
        return { t: at - (n - i) * step, o: c, h: c * 1.001, l: c * 0.999, c, v: 100 };
      });
    },
    async stats(sym) { const p = px(sym); return { open: p * 1.05, high: p * 1.06, low: p * 0.99, last: p, volume: 1e7 / p * 10 }; },
    async book(sym) { return deepBook(px(sym), Date.now()); },
  };
}

test('a full tick: baselines trade, keyless models sleep, state round-trips', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'arena-'));
  const logs = [];
  const { state, ledger } = await tick({ dir, client: fakeClient(), env: { ARENA_STANDINS: 'off' }, now: NOW, log: (m) => logs.push(m) });
  assert.equal(state.wallets.opus.status, 'asleep');
  assert.match(state.wallets.opus.note, /ANTHROPIC_API_KEY/);
  const hodl = ledger.filter((e) => e.agent === 'hodl');
  assert.equal(hodl.length, 3, 'hodl fills three of its four buys on turn one');
  assert.ok(hodl.every((e) => e.outcome === 'filled'), JSON.stringify(hodl.map((e) => e.failed)));
  assert.ok(ledger.some((e) => e.agent === 'rsi' && e.outcome === 'filled'), 'rsi bot bought the dip');
  for (const w of Object.values(state.wallets)) assert.ok(Math.abs(w.equity - 1000) < 20, `${w.id} equity ${w.equity}`);

  const saved = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8'));
  assert.equal(Object.keys(saved.wallets.hodl.positions).length, 3);
  const trades = JSON.parse(await readFile(path.join(dir, 'trades.json'), 'utf8'));
  assert.equal(trades.length, ledger.length);

  // Guard-only tick on a crash: every stop fires, nobody gets a turn.
  const { ledger: l2, state: s2 } = await tick({ dir, guardOnly: true, client: fakeClient((s) => (s.startsWith('BTC') ? 30000 : 5), NOW + 5 * 60e3), env: { ARENA_STANDINS: 'off' }, now: NOW + 5 * 60e3, log: () => {} });
  assert.ok(l2.length > 0 && l2.every((e) => e.outcome === 'stopped'));
  assert.equal(Object.keys(s2.wallets.hodl.positions).length, 0);
  assert.ok(s2.wallets.hodl.equity < 1000);
  const all = (await readFile(path.join(dir, 'ledger.ndjson'), 'utf8')).trim().split('\n');
  assert.equal(all.length, ledger.length + l2.length);
});

test('equity marks positions at the given prices', () => {
  const w = wallet();
  execute(w, preview(w, buy(), deepBook(100), NOW));
  assert.ok(equity(w, { 'BTC-USD': 200 }) > equity(w, { 'BTC-USD': 100 }));
});

test('stand-ins: keyless agents trade, labelled, through the same gate', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'arena-'));
  // A market with something for every style: trends, dips, a crash, a week-long winner.
  const shape = { 'BTC-USD': 0.004, 'ETH-USD': -0.004, 'SOL-USD': 0.012, 'DOGE-USD': -0.02, 'LINK-USD': 0.008 };
  const client = {
    async candles(sym, g) {
      const n = g === 60 ? 10 : 200, k = shape[sym] ?? 0, p0 = 100;
      return Array.from({ length: n }, (_, i) => { const c = p0 * (1 + k * Math.sin(i / 9) + k * i / 20); return { t: NOW - (n - i) * g * 1000, o: c, h: c * 1.002, l: c * 0.998, c, v: 1 }; });
    },
    async stats(sym) { const c = (await this.candles(sym, 3600)).at(-1).c; return { open: c * (1 - (shape[sym] ?? 0) * 3), high: c * 1.05, low: c * 0.95, last: c, volume: 3e8 / c }; },
    async book(sym) { const c = (await this.candles(sym, 3600)).at(-1).c; return deepBook(c, Date.now()); },
  };
  const { state, ledger } = await tick({ dir, client, env: {}, now: NOW, log: () => {} });
  for (const id of ['opus', 'sonnet', 'haiku', 'gpt', 'grok', 'gemini', 'deepseek']) {
    assert.notEqual(state.wallets[id].status, 'asleep', id);
    assert.equal(state.wallets[id].standin, true, id);
    assert.equal(state.wallets[id].servedBy, 'stand-in', id);
    assert.ok(state.roster.find((r) => r.id === id).standin.label, id);
  }
  const mine = ledger.filter((e) => e.model === 'stand-in');
  assert.ok(mine.length > 0, 'stand-ins proposed trades');
  assert.ok(mine.every((e) => e.reason.startsWith('Stand-in:')), 'every stand-in trade says so');
  assert.ok(mine.some((e) => e.outcome === 'filled'), 'and some passed the gate');
  // With a key, the real model plays instead (no network here, so it errors rather than standing in).
  const { state: s2 } = await tick({ dir, client, env: { OPENAI_API_KEY: 'x' }, now: NOW + 3600e3, only: ['gpt'], log: () => {} });
  assert.equal(s2.wallets.gpt.standin, false);
});
