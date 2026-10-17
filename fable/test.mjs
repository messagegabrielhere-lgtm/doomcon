// node --test fable/test.mjs — offline; fake books and a stub brain.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalize, SCHEMA, turnPrompt, SYSTEM } from './brain.mjs';
import { fallbackThink, wantFallback } from './fallback.mjs';
import { newFableWallet, loadState, saveTick } from './journal.mjs';
import { tick } from './agent.mjs';
import { RULES, START_CASH, UNIVERSE, isLive, LIVE_PHRASE } from './config.mjs';
import { preview, execute, equity } from '../arena/broker.mjs';
import { gate } from '../arena/rules.mjs';
import { rsi } from '../arena/market.mjs';

const NOW = Date.UTC(2026, 9, 17, 15);
const deepBook = (p, at = NOW) => ({
  sym: 'X', at, open: true, venue: 'test book',
  bids: [[p * 0.9995, 1e6]], asks: [[p * 1.0005, 1e6]],
});
const row = (sym, last, extra = {}) => ({
  sym, last, type: sym.includes('-') ? 'crypto' : 'stock', open: true,
  vol24hUsd: 5e8, rsi14h: 50, atr14hPct: 1.2, vsSma20hPct: 2, vsSma50hPct: 1,
  chg1h: 0.5, chg24h: 2, chg7d: 4, ...extra,
});

function fakeClient(px = (s) => (s.includes('-') ? 100 : 200), at = NOW) {
  return {
    async candles(sym, g) {
      const n = g === 60 ? 10 : 200;
      const step = g * 1000;
      const p = px(sym);
      return Array.from({ length: n }, (_, i) => {
        const c = p * (1 + i * 0.001);
        return { t: at - (n - i) * step, o: c, h: c * 1.001, l: c * 0.999, c, v: 100 };
      });
    },
    async stats(sym) {
      const p = px(sym);
      return {
        open: p * 0.98, high: p * 1.06, low: p * 0.99, last: p,
        volume: 1e8 / p, open_: true,
      };
    },
    async book(sym) {
      return { ...deepBook(px(sym), Date.now()), sym, open: true };
    },
  };
}

test('schema requires bias and actions', () => {
  assert.deepEqual(SCHEMA.required, ['thoughts', 'bias', 'actions']);
  assert.ok(SYSTEM.includes('Not investment advice'));
  assert.ok(SYSTEM.includes('Claude Fable'));
});

test('normalize drops junk and caps actions', () => {
  const out = normalize({
    thoughts: 'tape is calm',
    bias: 'risk-on',
    actions: [
      { side: 'BUY', sym: 'btc-usd', usd: 200, fraction: null, stop: 90, tp: null, reason: 'trend' },
      null,
      { side: 'sell', sym: 'ETH-USD', usd: null, fraction: 0.5, stop: null, tp: null, reason: 'trim' },
      { side: 'buy', sym: 'X', usd: 1, fraction: null, stop: 1, tp: null, reason: 'extra1' },
      { side: 'buy', sym: 'Y', usd: 1, fraction: null, stop: 1, tp: null, reason: 'extra2' },
      { side: 'buy', sym: 'Z', usd: 1, fraction: null, stop: 1, tp: null, reason: 'extra3' },
    ],
  });
  assert.equal(out.bias, 'risk-on');
  assert.equal(out.actions[0].sym, 'BTC-USD');
  assert.equal(out.actions[0].side, 'buy');
  assert.ok(out.actions.length <= 4);
});

test('turn prompt lists wallet and market columns', () => {
  const w = newFableWallet(NOW);
  const rows = [row('BTC-USD', 100)];
  const text = turnPrompt({
    w, eq: START_CASH, rows, prices: { 'BTC-USD': 100 }, recent: [], now: NOW,
  });
  assert.match(text, /BTC-USD/);
  assert.match(text, /sym,type,open,last/);
  assert.match(text, /Wallet: cash/);
});

test('fallback buys a clean uptrend and wants fallback without a key', () => {
  assert.equal(wantFallback({}), true);
  assert.equal(wantFallback({ ANTHROPIC_API_KEY: 'x', FABLE_FALLBACK: '1' }), true);
  assert.equal(wantFallback({ ANTHROPIC_API_KEY: 'x' }), false);

  const w = newFableWallet(NOW);
  const rows = [
    row('BTC-USD', 100, { vsSma20hPct: 3, vsSma50hPct: 2, chg24h: 4, rsi14h: 55 }),
    row('ETH-USD', 50, { vsSma20hPct: -1, vsSma50hPct: -2, chg24h: -3 }),
  ];
  const res = fallbackThink({ w, eq: START_CASH, rows, now: NOW });
  assert.equal(res.servedBy, 'fallback');
  assert.ok(res.actions.some((a) => a.side === 'buy' && a.sym === 'BTC-USD'));
  assert.ok(res.actions.every((a) => a.side !== 'buy' || a.stop != null));
});

test('paper buy through shared gate with fable rules', () => {
  const w = newFableWallet(NOW);
  const rows = [row('BTC-USD', 100)];
  const p = {
    side: 'buy', sym: 'BTC-USD', usd: 1500, stop: 88, tp: null,
    reason: 'clean uptrend on the hourly tape',
  };
  const t = preview(w, p, deepBook(100), NOW);
  const g = gate(w, t, {
    prices: { 'BTC-USD': 100 }, rows, now: NOW, rules: RULES, universe: UNIVERSE,
  });
  assert.deepEqual(g.checks.filter((c) => !c.ok), []);
  execute(w, t);
  assert.ok(w.positions['BTC-USD']);
  assert.ok(equity(w, { 'BTC-USD': 100 }) < START_CASH);
});

test('live mode is refused', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fable-'));
  await assert.rejects(
    () => tick({
      dir,
      env: { FABLE_LIVE: LIVE_PHRASE },
      client: fakeClient(),
      now: NOW,
      log: () => {},
      think: async () => ({ thoughts: 'x', bias: 'neutral', actions: [], servedBy: 't' }),
    }),
    /paper-only/,
  );
  assert.equal(isLive({ FABLE_LIVE: LIVE_PHRASE }), true);
  assert.equal(isLive({}), false);
});

test('tick with stub brain persists state and can fill', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fable-'));
  let n = 0;
  const think = async () => {
    n++;
    return {
      thoughts: 'stub turn',
      bias: 'risk-on',
      actions: [{
        side: 'buy', sym: 'BTC-USD', usd: 1200, fraction: null,
        stop: 88, tp: null, reason: 'stub clean uptrend entry for the test',
      }],
      servedBy: 'stub',
      usage: null,
      model: 'stub',
    };
  };

  const { state, ledger } = await tick({
    dir,
    client: fakeClient(),
    now: NOW,
    log: () => {},
    think,
    env: { FABLE_FALLBACK: '0', ANTHROPIC_API_KEY: 'test' },
  });
  assert.equal(n, 1);
  assert.equal(state.wallet.status, 'awake');
  assert.ok(ledger.some((e) => e.outcome === 'filled' && e.sym === 'BTC-USD'), JSON.stringify(ledger));
  const disk = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8'));
  assert.match(disk.disclaimer, /Not investment advice/);
  assert.ok(disk.wallet.positions['BTC-USD']);
});

test('journal round-trip', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'fable-'));
  const state = await loadState(dir, NOW);
  assert.equal(state.wallet.cash, START_CASH);
  state.wallet.note = 'hello';
  await saveTick({ dir, state, ledger: [], market: null, env: {}, now: NOW });
  const again = await loadState(dir, NOW + 1);
  assert.equal(again.wallet.note, 'hello');
});

test('rsi helper still sane via market import', () => {
  const up = Array.from({ length: 40 }, (_, i) => 100 + i);
  assert.equal(rsi(up), 100);
});
