#!/usr/bin/env node
// collector/calibrate.mjs
//
// Builds data/reference-addenda.json: frozen-style reference distributions for
// sources that data/reference.json (v1) never calibrated, built as a SHADOW.
//
// It never touches data/reference.json. The official score, level and every
// receipt keep being computed against v1 alone; the engine scores the same
// snapshot against v1 + these addenda in parallel (state.shadow) so the two
// can be compared in public before anything is promoted. The whole procedure
// is in docs/REFERENCE-VERSIONING.md.
//
// The bar for a source to get an addendum is the same as backfill.mjs's bar
// for v1, with one stricter number:
//
//   1. Reconstruct the EXACT statistic the live adapter emits, at the instant
//      it would have been read (end of each UTC day). Never fabricate a day.
//   2. At least MIN_COVERAGE_DAYS (300) usable days in the 365-day window —
//      v1 asked for 200; a shadow that hopes to be promoted asks for more.
//   3. If the history available today is not the history the adapter would
//      have seen then (survivorship, re-dated documents, delisted rows), the
//      source is NOT calibrated, it is listed under `unavailable` with why.
//
// Run:   node collector/calibrate.mjs [--out PATH] [--yesterday YYYY-MM-DD] [--dry-run]
// CI:    .github/workflows/calibrate.yml (workflow_dispatch only)

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalJson } from './receipts.mjs';
import { round } from './engine.mjs';
import { BASKET, MAX_STALE_DAYS, YAHOO_HOSTS, yahooChartUrl, yahooBars } from './sources/stockanalysis.mjs';

export const CALIBRATE_VERSION = '1.0.0';
export const ADDENDA_SCHEMA = 1;
export const REFERENCE_WINDOW_DAYS = 365;  // same window as v1 (backfill.mjs)
export const MIN_COVERAGE_DAYS = 300;
export const QUANTILE_KNOTS = 101;         // same grid as v1

const MS_DAY = 86_400_000;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const P = {
  reference: join(ROOT, 'data', 'reference.json'),
  addenda: join(ROOT, 'data', 'reference-addenda.json'),
};

// ---------------------------------------------------------------------------
// Statistics — byte-compatible with backfill.mjs. Those helpers are module
// private there (and backfill.mjs is not this file's to change), so they are
// restated here, line for line: type-7 quantiles, 101 knots, 6-dp rounding.
// collector/test/calibrate.test.mjs pins them against hand-computed values.
// ---------------------------------------------------------------------------
export const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
export const dayMs = (iso) => Date.parse(`${iso}T00:00:00.000Z`);

export function dayRange(fromIso, toIso) {
  const out = [];
  for (let t = dayMs(fromIso); t <= dayMs(toIso); t += MS_DAY) out.push(isoDay(t));
  return out;
}

export function quantileSorted(sorted, p) {
  const n = sorted.length;
  if (n === 0) throw new Error('quantileSorted: empty sample');
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, n - 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function quantileGrid(values, knots = QUANTILE_KNOTS) {
  const sorted = [...values].sort((a, b) => a - b);
  const grid = [];
  for (let i = 0; i < knots; i++) grid.push(round(quantileSorted(sorted, i / (knots - 1)), 6));
  return grid;
}

/** The reference-entry shape v1 uses, from a { day: value|null } series over the window. */
export function referenceEntry({ id, pillar, unit, method, params, aliases = [], series, window }) {
  const values = window.map((d) => series[d]).filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  const gaps = window.length - values.length;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    label: id, pillar, aliases,
    unit, accepted_units: [unit],
    method, params,
    n: values.length,
    coverage: { from: window[0], to: window[window.length - 1], days_in_window: window.length, days_observed: values.length, gaps },
    min: values.length ? round(sorted[0], 6) : null,
    max: values.length ? round(sorted[sorted.length - 1], 6) : null,
    median: values.length ? round(quantileSorted(sorted, 0.5), 6) : null,
    quantiles: values.length ? quantileGrid(values) : [],
  };
}

// ---------------------------------------------------------------------------
// stockanalysis: mean |daily % move| across NVDA, AMD, TSM, AVGO.
//
// Live definition (collector/sources/stockanalysis.mjs): for each ticker, the
// percent change of the LATEST trade day vs the previous close; the scalar is
// the mean of the four absolute values; a quote older than MAX_STALE_DAYS is
// refused. Read at the end of UTC day D, that is: the move on the latest trade
// date <= D, provided it is no more than MAX_STALE_DAYS old. On a Saturday the
// live adapter reads Friday's move, so the reconstruction does too — that is
// the statistic, not an imputation. A date where any of the four is missing a
// close (or its previous close) is a gap, never a three-name basket.
// ---------------------------------------------------------------------------

/** { ticker: [{date, close}] ascending } -> { session date: mean |% move| across all four, or null if incomplete }. */
export function basketMovesByTradeDate(barsByTicker, basket = BASKET) {
  for (const t of basket) {
    if (!Array.isArray(barsByTicker[t])) throw new Error(`stockanalysis addendum: no bars for ${t}`);
  }
  // The session calendar is the union of every ticker's bar dates. A move is
  // only taken against the IMMEDIATELY previous session: if one ticker is
  // missing a bar, its next bar would otherwise be a two-session move wearing
  // a one-session label, which is not what the live `cp` measures.
  const sessions = [...new Set(basket.flatMap((t) => barsByTicker[t].map((b) => b.date)))].sort();
  const prevSession = new Map(sessions.map((d, i) => [d, i > 0 ? sessions[i - 1] : null]));
  const perTicker = new Map();
  for (const t of basket) {
    const bars = barsByTicker[t];
    const moves = new Map();
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1].close, cur = bars[i].close;
      if (!(prev > 0) || !(cur > 0)) continue;
      if (bars[i - 1].date !== prevSession.get(bars[i].date)) continue;
      moves.set(bars[i].date, (cur / prev - 1) * 100);
    }
    perTicker.set(t, moves);
  }
  // Every session is a key. An incomplete one maps to null, so the calendar
  // reader below sees "this session happened and we cannot measure it" and
  // records a gap, rather than silently reaching back to an older session.
  const out = {};
  for (const d of sessions) {
    const cps = basket.map((t) => perTicker.get(t).get(d));
    out[d] = cps.some((x) => x === undefined || !Number.isFinite(x))
      ? null
      : cps.reduce((s, x) => s + Math.abs(x), 0) / cps.length;
  }
  return out;
}

/** Calendar-day series as the live adapter would have read it at the end of each day. */
export function liveEquivalentSeries(movesByTradeDate, days, maxStaleDays = MAX_STALE_DAYS) {
  const tradeDates = Object.keys(movesByTradeDate).sort();
  const series = {};
  let j = -1;
  for (const d of days) {
    while (j + 1 < tradeDates.length && tradeDates[j + 1] <= d) j++;
    if (j < 0) { series[d] = null; continue; }
    const td = tradeDates[j];
    if (movesByTradeDate[td] === null) { series[d] = null; continue; }
    // Live check: (now - td@00:00Z)/day > MAX_STALE_DAYS refuses. At the end
    // of day D that age is (D - td) + ~1 day.
    const age = (dayMs(d) + MS_DAY - 1 - dayMs(td)) / MS_DAY;
    series[d] = age > maxStaleDays ? null : round(movesByTradeDate[td], 6);
  }
  return series;
}

export function buildStockanalysisAddendum(barsByTicker, window) {
  const moves = basketMovesByTradeDate(barsByTicker);
  const series = liveEquivalentSeries(moves, window);
  const tradeDatesInWindow = Object.keys(moves).filter((d) => moves[d] !== null && d >= window[0] && d <= window[window.length - 1]).length;
  const entry = referenceEntry({
    id: 'stockanalysis', pillar: 'compute', unit: 'mean_abs_percent_change',
    method: 'mean of |daily % change| across NVDA, AMD, TSM, AVGO on the latest trade day <= D (as the live adapter reads at end of UTC day D; weekends/holidays read the last session, refused past 7 days), from Yahoo Finance v8 chart daily closes',
    params: { basket: BASKET, provider: 'yahoo-chart', range: '2y', interval: '1d', max_stale_days: MAX_STALE_DAYS,
              trade_dates_in_window: tradeDatesInWindow },
    series, window,
  });
  return entry;
}

async function fetchBars(fetchJson, ticker, range) {
  let lastErr;
  for (const host of YAHOO_HOSTS) {
    try {
      const body = await fetchJson(yahooChartUrl(host, ticker, range), { headers: { accept: 'application/json' } });
      return yahooBars(body, ticker);
    } catch (e) { lastErr = e; }
  }
  throw new Error(`${ticker}: ${lastErr?.message ?? lastErr}`);
}

// ---------------------------------------------------------------------------
// Sources considered and NOT calibrated, with reasons. Public so the omission
// is argued rather than silent, exactly as reference.json's `unavailable`.
// ---------------------------------------------------------------------------
export const NOT_BACKFILLABLE = Object.freeze([
  { id: 'govuk', reason: 'NOT the same definition historically. The live adapter counts documents whose public_timestamp falls in the trailing 30 days, as indexed NOW. Re-running that query for a past window counts documents as they are indexed today: GOV.UK re-stamps public_timestamp when a page is materially updated and drops withdrawn/unpublished pages from search, so past windows are systematically depleted and recent ones inflated. That is the same survivor bias that keeps openrouter out of v1; a distribution built from it would bias the live score upward. Revisit only by snapshotting the live count daily for 365 days (a forward-built reference).' },
  { id: 'vastai', reason: 'spot offers are a live snapshot with no history endpoint; only a forward-built reference (365 days of our own readings) is honest.' },
  { id: 'polymarket', reason: 'no historical 1-day-change series for the whole screened basket on the keyless API; basket membership itself is time-dependent.' },
  { id: 'kalshi', reason: 'per-market candlesticks exist, but the frozen series basket and its open-event screen cannot be evaluated at past instants without survivorship (resolved markets drop out).' },
  { id: 'manifold', reason: '24h volume is a current aggregate; per-bet history would have to be re-aggregated across a search result set that is itself time-dependent.' },
  { id: 'huggingface', reason: 'as in v1: no keyless historical endpoint for the live statistic.' },
  { id: 'openrouter', reason: 'as in v1: the model catalogue is a survivor set.' },
  { id: 'github-releases', reason: 'as in v1: releases.atom has no date-range parameter.' },
]);

export function addendaHash(file) {
  const { hash: _ignored, ...body } = file;
  return 'sha256:' + createHash('sha256').update(canonicalJson(body), 'utf8').digest('hex');
}

export async function build({ fetchJson, yesterday, builtAt, previous = null, v1 = null, log = console.log }) {
  const refFrom = isoDay(dayMs(yesterday) - (REFERENCE_WINDOW_DAYS - 1) * MS_DAY);
  const window = dayRange(refFrom, yesterday);
  const v1Keys = new Set();
  for (const [k, e] of Object.entries(v1?.sources ?? {})) { v1Keys.add(k); for (const a of e.aliases ?? []) v1Keys.add(a); }

  const sources = {};
  const unavailable = [];

  // ---- stockanalysis ------------------------------------------------------
  if (v1Keys.has('stockanalysis')) {
    unavailable.push({ id: 'stockanalysis', reason: 'already calibrated in v1; addenda never override v1' });
  } else {
    try {
      const barsByTicker = {};
      for (const t of BASKET) barsByTicker[t] = await fetchBars(fetchJson, t, '2y');
      const entry = buildStockanalysisAddendum(barsByTicker, window);
      if (entry.n >= MIN_COVERAGE_DAYS) {
        sources.stockanalysis = { ...entry, addendum_version: CALIBRATE_VERSION, built_at: builtAt };
        log(`[stockanalysis] addendum built: n=${entry.n} gaps=${entry.coverage.gaps} median=${entry.median}`);
      } else {
        unavailable.push({ id: 'stockanalysis', reason: `only ${entry.n} usable days in the ${REFERENCE_WINDOW_DAYS}-day window (need ${MIN_COVERAGE_DAYS})` });
        log(`[stockanalysis] EXCLUDED: n=${entry.n}`);
      }
    } catch (e) {
      unavailable.push({ id: 'stockanalysis', reason: `backfill failed: ${e.message}` });
      log(`[stockanalysis] FAILED: ${e.message}`);
    }
  }

  for (const u of NOT_BACKFILLABLE) unavailable.push(u);

  const file = {
    schema: ADDENDA_SCHEMA,
    kind: 'reference-addenda',
    shadow: true,
    addendum_version: CALIBRATE_VERSION,
    built_at: builtAt,
    builder: 'collector/calibrate.mjs',
    note: 'SHADOW ADDENDA to data/reference.json (v1). Never used for the official score, level or receipts. ' +
          'The engine scores each run against v1 + these entries as state.shadow. Promotion to a v2 reference is ' +
          'governed by docs/REFERENCE-VERSIONING.md. `hash` is sha256 over the canonical JSON of this object without `hash`.',
    base_reference: v1 ? { built_at: v1.built_at ?? null, hash: 'sha256:' + createHash('sha256').update(canonicalJson(v1), 'utf8').digest('hex') } : null,
    supersedes: previous?.hash ?? null,
    reference_window_days: REFERENCE_WINDOW_DAYS,
    reference_window: { from: refFrom, to: yesterday },
    min_coverage_days: MIN_COVERAGE_DAYS,
    quantile_knots: QUANTILE_KNOTS,
    quantile_definition: 'linear interpolation between order statistics (type 7, the numpy/R default)',
    sources,
    unavailable,
  };
  file.hash = addendaHash(file);
  return file;
}

function parseArgs(argv) {
  const o = { out: P.addenda, yesterday: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--yesterday') o.yesterday = argv[++i];
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`calibrate: unknown argument ${a}`);
  }
  return o;
}

export async function main(argv = process.argv.slice(2)) {
  const o = parseArgs(argv);
  if (o.help) {
    console.log('Usage: node collector/calibrate.mjs [--out PATH] [--yesterday YYYY-MM-DD] [--dry-run]');
    return null;
  }
  const { fetchJson } = await import('./fetch.mjs');
  const yesterday = o.yesterday ?? isoDay(Date.now() - MS_DAY);
  const v1 = existsSync(P.reference) ? JSON.parse(readFileSync(P.reference, 'utf8')) : null;
  let previous = null;
  if (existsSync(o.out)) { try { previous = JSON.parse(readFileSync(o.out, 'utf8')); } catch { previous = null; } }

  console.log(`SIREN calibrate v${CALIBRATE_VERSION} — shadow addenda, window ${REFERENCE_WINDOW_DAYS}d ending ${yesterday}`);
  const file = await build({ fetchJson, yesterday, builtAt: new Date().toISOString(), previous, v1 });

  if (Object.keys(file.sources).length === 0) {
    // An addenda file with nothing in it would make the shadow identical to
    // the official index and look like evidence. Keep whatever was there.
    console.error('calibrate: no source met the coverage bar; not writing (previous file, if any, left as is)');
    for (const u of file.unavailable) console.error(`  - ${u.id}: ${u.reason}`);
    process.exitCode = 1;
    return file;
  }
  if (o.dryRun) {
    console.log(JSON.stringify({ hash: file.hash, sources: Object.keys(file.sources), unavailable: file.unavailable.map((u) => u.id) }, null, 2));
    return file;
  }
  mkdirSync(dirname(o.out), { recursive: true });
  const tmp = `${o.out}.tmp`;
  writeFileSync(tmp, JSON.stringify(file, null, 2) + '\n', 'utf8');
  renameSync(tmp, o.out);
  console.log(`wrote ${o.out}  ${file.hash}  sources=[${Object.keys(file.sources).join(',')}]`);
  return file;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(`CALIBRATE FAILED: ${e.message}`); process.exitCode = 1; });
}
