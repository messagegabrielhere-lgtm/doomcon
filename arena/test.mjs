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

test('stocks: market hours gate, no commission, spread-only round trip', async () => {
  const { yahooClient } = await import('./market.mjs');
  const { feeFor, isStock } = await import('./config.mjs');
  assert.equal(isStock('NVDA'), true); assert.equal(isStock('BTC-USD'), false);
  assert.equal(feeFor('NVDA'), 0); assert.ok(feeFor('BTC-USD') > 0);

  const nowS = Math.floor(Date.now() / 1000);
  const fakeYahoo = (open) => async (url) => {
    const one = url.includes('interval=1m');
    const n = one ? 30 : 140, step = one ? 60 : 3600;
    const ts = Array.from({ length: n }, (_, i) => nowS - (n - i) * step);
    const c = ts.map((_, i) => 180 + i * 0.1);
    const meta = { regularMarketPrice: 194, chartPreviousClose: 190, regularMarketTime: open ? nowS : nowS - 6 * 3600,
      currentTradingPeriod: { regular: open ? { start: nowS - 3600, end: nowS + 3600 } : { start: nowS - 30 * 3600, end: nowS - 6 * 3600 } } };
    return new Response(JSON.stringify({ chart: { result: [{ meta, timestamp: ts, indicators: { quote: [{ open: c, high: c, low: c, close: c, volume: c.map(() => 1e6) }] } }] } }));
  };
  for (const open of [true, false]) {
    const y = yahooClient({ fetchImpl: fakeYahoo(open), gapMs: 0 });
    const hourly = await y.candles('NVDA', 3600), stats = await y.stats('NVDA'), book = await y.book('NVDA');
    assert.ok(hourly.length >= 100);
    assert.equal(stats.last, 194); assert.equal(stats.open_, open);
    assert.ok(stats.volume * stats.last > 5e6, 'daily dollar volume clears the liquidity floor');
    const { summarize } = await import('./market.mjs');
    const row = summarize('NVDA', hourly, stats);
    assert.equal(row.type, 'stock'); assert.equal(row.open, open);
    // The bars rise 0.1 an hour; the previous session's last bar is the reference,
    // not chartPreviousClose (190), which on a 1mo chart is a month old.
    const nyDay = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const prev = hourly.slice().reverse().find((k) => nyDay(k.t) !== nyDay(hourly.at(-1).t)).c;
    assert.ok(Math.abs(row.chg24h - (194 / prev - 1) * 100) < 0.01, '24h change is since the previous session close');

    const w = wallet();
    const t = preview(w, buy({ sym: 'NVDA', stop: 185 }), book, Date.now());
    assert.equal(t.fee, 0);
    assert.ok(t.sellbackPct > 99.9, `round trip costs only the spread (${t.sellbackPct})`);
    const g = gate(w, t, ctx([row]));
    if (open) assert.deepEqual(failed(g), []);
    else assert.ok(failed(g).includes('market open') && failed(g).includes('fresh quote'));
  }
});

// The picks engine lives inline in the page; test the very block it runs.
async function picksEngine() {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../site/static/arena.html', import.meta.url), 'utf8');
  const src = html.slice(html.indexOf('/* picks:begin'), html.indexOf('/* picks:end */'));
  return new Function(`${src}; return { PK, pkPrep, pkScore, pkPicksOn, pkOutcome, pkHistory, pkStats, pkLive, pkAppendToday };`)();
}
// 140 sessions drifting up (an uptrend), then two sharp down days: an RSI(2) pullback.
function series(s, sec = 'Tech', { dip = true, base = 100 } = {}) {
  const n = 140, t = [], o = [], h = [], l = [], c = [], v = [];
  for (let i = 0; i < n; i++) {
    let px = base * (1 + i * 0.002) * (1 + 0.004 * Math.sin(i));
    if (dip && i >= n - 2) px = c[i - 1] * 0.97;
    t.push(1.7e9 + i * 86400); c.push(px); o.push(px * 0.999); h.push(px * 1.01); l.push(px * 0.99); v.push(1e6);
  }
  return { s, n: s, sec, t, o, h, l, c, v };
}

test('picks: the rule finds a pullback in an uptrend, and only that', async () => {
  const E = await picksEngine();
  const P = [series('DIP'), series('FLAT', 'Tech', { dip: false })].map(E.pkPrep);
  const last = P[0].t.at(-1);
  const picks = E.pkPicksOn(P, last);
  assert.deepEqual(picks.map((p) => p.S.s), ['DIP']);
  assert.ok(picks[0].rsi2 < E.PK.rsi2Max && picks[0].above100 > 0);
});

test('picks: no look-ahead, sector cap, every exit path', async () => {
  const E = await picksEngine();
  const raw = series('AAA');
  const cut = raw.t.length - 1;
  // Changing anything after the decision day must not change that day's pick.
  const a = E.pkPrep(raw), b = E.pkPrep({ ...raw, c: raw.c.map((x, i) => (i > cut ? x * 5 : x)) });
  assert.equal(E.pkScore(a, cut)?.score, E.pkScore(b, cut)?.score);

  // Six dips in one sector: only two get picked.
  const many = Array.from({ length: 6 }, (_, k) => E.pkPrep(series('S' + k, 'Energy', { base: 100 + k })));
  assert.equal(E.pkPicksOn(many, many[0].t.at(-1)).length, E.PK.maxPerSector);

  // Exits: build a pick on day i, then shape days i+1 and i+2.
  const mk = (o1, h1, l1, c1, o2) => {
    const S = E.pkPrep(series('X'));
    const i = S.c.length - 1;
    S.o.push(o1, ...(o2 == null ? [] : [o2])); S.h.push(h1, ...(o2 == null ? [] : [o2])); S.l.push(l1, ...(o2 == null ? [] : [o2])); S.c.push(c1, ...(o2 == null ? [] : [o2]));
    return E.pkOutcome({ S, i, atr: 2, close: 100 });
  };
  const cost = E.PK.costPct;
  let r = mk(100, 103, 99, 101, 102);           // target 102 hit
  assert.equal(r.how, 'target'); assert.ok(Math.abs(r.ret - (2 - cost)) < 1e-9);
  r = mk(100, 101, 97, 99, 100);                // stop 98 hit
  assert.equal(r.how, 'stop'); assert.ok(Math.abs(r.ret - (-2 - cost)) < 1e-9);
  r = mk(100, 103, 97, 100, 100);               // both touched: stop wins
  assert.equal(r.how, 'stop');
  r = mk(100, 101, 99, 100.5, 101.2);           // neither: sell at the next open
  assert.equal(r.how, 'open'); assert.ok(Math.abs(r.ret - (1.2 - cost)) < 1e-9);
  r = mk(100, 101, 99, 100.5);                  // trade day done, exit day not yet
  assert.equal(r.status, 'live');
  assert.equal(E.pkOutcome({ S: E.pkPrep(series('Y')), i: 139, atr: 2, close: 100 }).status, 'pending');
});

test('picks: stats compound daily averages against the benchmark', async () => {
  const E = await picksEngine();
  const hist = [
    { t: 1, bench: 1, picks: [{ out: { status: 'done', ret: 2, how: 'target' } }, { out: { status: 'done', ret: -1, how: 'stop' } }] },
    { t: 2, bench: -1, picks: [] },
    { t: 3, bench: null, picks: [{ out: { status: 'pending' } }] },
  ];
  const st = E.pkStats(hist);
  assert.equal(st.sessions, 2); assert.equal(st.trades, 2); assert.equal(st.winRate, 50);
  assert.ok(Math.abs(st.equity - 1005) < 1e-9, 'day 1 averages +0.5%, day 2 sits in cash');
  assert.ok(Math.abs(st.bench - 1000 * 1.01 * 0.99) < 1e-9);
});

test('picks: the scanner page runs the same engine as the arena page', async () => {
  const { readFile } = await import('node:fs/promises');
  const block = async (f) => { const h = await readFile(new URL(`../site/static/${f}`, import.meta.url), 'utf8'); return h.slice(h.indexOf('/* picks:begin'), h.indexOf('/* picks:end */')); };
  const [a, s] = await Promise.all([block('arena.html'), block('scanner.html')]);
  assert.ok(a.length > 1000);
  assert.equal(s, a, 'copy the picks block from arena.html into scanner.html when the rule changes');
});

test('picks: live status from today\'s session, and tomorrow\'s preview', async () => {
  const E = await picksEngine();
  const pick = { atr: 2, close: 100 };   // target and stop 2% from the entry
  const q = (o, h, l, px, open = true) => ({ px, open, day: { t: 1, o, h, l, v: 1 } });
  assert.equal(E.pkLive(pick, null).state, 'waiting');
  assert.equal(E.pkLive(pick, { px: 101, day: null }).state, 'waiting');
  let L = E.pkLive(pick, q(101, 101.5, 100.5, 101.2));
  assert.equal(L.state, 'running'); assert.ok(Math.abs(L.now - (101.2 / 101 - 1) * 100) < 1e-9); assert.ok(Math.abs(L.gap - 1) < 1e-9);
  L = E.pkLive(pick, q(100, 102.5, 99.5, 102.4));           // up through the target
  assert.equal(L.state, 'target'); assert.ok(Math.abs(L.ret - (2 - E.PK.costPct)) < 1e-9);
  assert.equal(E.pkLive(pick, q(100, 101, 97.5, 98)).state, 'stop');
  assert.equal(E.pkLive(pick, q(100, 103, 97, 100)).state, 'stop', 'both touched counts as the stop');
  assert.equal(E.pkLive(pick, q(100, 101, 99.5, 100.4, false)).state, 'closed');

  // The preview appends today's bar only where the quote's session is newer.
  const base = series('DIP'), last = base.t.at(-1);
  const quotes = { DIP: { px: 90, day: { t: last + 86400, o: 95, h: 96, l: 89, v: 1e6 } }, OLD: { px: 5, day: { t: last, o: 5, h: 5, l: 5, v: 1 } } };
  const ext = E.pkAppendToday([base, series('OLD', 'Tech', { dip: false })], quotes);
  assert.equal(ext.t, last + 86400);
  assert.equal(ext.symbols[0].c.at(-1), 90); assert.equal(ext.symbols[0].c.length, base.c.length + 1);
  assert.equal(ext.symbols[1].c.length, base.c.length, 'a quote for a session already in the data adds nothing');
  assert.equal(E.pkAppendToday([base], {}).t, null);
});
