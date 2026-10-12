#!/usr/bin/env node
// THE COMPUTE CLOCK — SIREN Labs experiment "compute".
//
// How fast is frontier training compute growing? A live clock of the largest
// disclosed training run, the record ladder, and the doubling time implied by
// Epoch AI's notable-models CSV (CC BY 4.0), plus the largest AI data centres
// from Epoch's data-centres CSV.
//
//   node collector/compute-clock.mjs [--offline] [--force]
//
// Not scored into the main index: no year of frozen baseline yet. Watched and
// published as /compute.html + api/compute-clock.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { fetchText } from './fetch.mjs';

const OUT = 'data/compute-clock.json';
const MODELS_URL = 'https://epoch.ai/data/notable_ai_models.csv';
const DC_URL = 'https://epoch.ai/data/data_centers/data_centers.csv';
const FRESH_MS = 12 * 60 * 60 * 1000;

// Fit the trend on frontier models published on or after this date. Matches the
// window Epoch uses for "training compute … since 2020" on epoch.ai.
const TREND_FROM = '2020-01-01';

// A handful of points makes an OLS slope a coin flip. Refuse rather than print
// a doubling time that looks precise.
const MIN_TREND_POINTS = 12;

const say = (m) => {
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=compute-clock::${m}`);
  else console.log(m);
};

/**
 * RFC 4180 CSV scanner. Epoch's notable-models file carries abstracts, so
 * quoted fields contain commas, doubled quotes and newlines — split('\n')
 * miscounts rows. Same approach as bliss-sources/epoch-open-weights.mjs.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];
  const [head, ...rest] = rows;
  return rest
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(head.map((h, i) => [String(h).trim(), r[i] ?? ''])));
}

function yearFrac(isoDay) {
  const t = Date.parse(isoDay.length === 10 ? `${isoDay}T00:00:00Z` : isoDay);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (t - start) / (end - start);
}

function cleanTag(s) {
  return String(s || '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
}

function fmtFlop(f) {
  if (!Number.isFinite(f) || f <= 0) return null;
  const e = Math.floor(Math.log10(f));
  return { flop: f, scientific: `${(f / 10 ** e).toFixed(2)}×10^${e}`, log10: +(Math.log10(f).toFixed(4)) };
}

/**
 * Ordinary least squares of log10(FLOP) on year-fraction.
 * Returns growth_per_year (linear multiplier) and months_per_doubling.
 */
export function fitComputeTrend(points) {
  const n = points.length;
  if (n < MIN_TREND_POINTS) {
    return { ok: false, error: `need ≥${MIN_TREND_POINTS} points, got ${n}` };
  }
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
  for (const p of points) {
    sx += p.t;
    sy += p.log10;
    sxx += p.t * p.t;
    sxy += p.t * p.log10;
  }
  const den = n * sxx - sx * sx;
  if (!(Math.abs(den) > 1e-12)) {
    return { ok: false, error: 'degenerate fit (no date spread)' };
  }
  const slope = (n * sxy - sx * sy) / den; // log10(FLOP) per year
  if (!(slope > 0)) {
    return { ok: false, error: `non-positive slope ${slope}` };
  }
  const intercept = (sy - slope * sx) / n;
  let ssRes = 0; let ssTot = 0;
  const meanY = sy / n;
  for (const p of points) {
    const pred = intercept + slope * p.t;
    ssRes += (p.log10 - pred) ** 2;
    ssTot += (p.log10 - meanY) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : null;
  const growthPerYear = 10 ** slope;
  const monthsPerDoubling = (12 * Math.log10(2)) / slope;
  return {
    ok: true,
    n,
    from: TREND_FROM,
    slope_log10_per_year: +slope.toFixed(4),
    growth_per_year: +growthPerYear.toFixed(2),
    months_per_doubling: +monthsPerDoubling.toFixed(1),
    r_squared: r2 == null ? null : +r2.toFixed(3),
  };
}

/** Models with a parseable publication date and positive training FLOP. */
export function modelRows(rows) {
  const out = [];
  for (const r of rows) {
    const date = String(r['Publication date'] || '').trim().slice(0, 10);
    const flop = Number(r['Training compute (FLOP)']);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(flop) || flop <= 0) continue;
    const frontier = /^true$/i.test(String(r['Frontier model'] || '').trim());
    out.push({
      model: String(r.Model || r.System || '').trim() || null,
      org: cleanTag(r.Organization),
      date,
      flop,
      frontier,
      domain: String(r.Domain || '').trim(),
      confidence: String(r.Confidence || '').trim() || null,
      link: String(r.Link || '').trim() || null,
    });
  }
  return out;
}

/** Chronology of models that set a new all-time training-compute record. */
export function recordLadder(models) {
  const sorted = models.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.flop - b.flop));
  const ladder = [];
  let best = 0;
  for (const m of sorted) {
    if (m.flop <= best) continue;
    best = m.flop;
    ladder.push({
      model: m.model,
      org: m.org,
      date: m.date,
      ...fmtFlop(m.flop),
      frontier: m.frontier,
      link: m.link,
    });
  }
  return ladder;
}

export function summariseModels(rows, { nowMs = Date.now() } = {}) {
  const models = modelRows(rows);
  if (models.length < 20) {
    throw new Error(`compute-clock: only ${models.length} models with FLOP (need ≥20) — CSV thin or schema changed`);
  }
  const byFlop = models.slice().sort((a, b) => b.flop - a.flop);
  const largest = byFlop[0];
  const ladder = recordLadder(models);
  const cutoff90 = nowMs - 90 * 864e5;
  const recent = models
    .filter((m) => {
      const t = Date.parse(`${m.date}T00:00:00Z`);
      return Number.isFinite(t) && t <= nowMs && t >= cutoff90;
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const trendPoints = models
    .filter((m) => m.frontier && m.date >= TREND_FROM)
    .map((m) => {
      const t = yearFrac(m.date);
      return t == null ? null : { t, log10: Math.log10(m.flop), model: m.model, date: m.date };
    })
    .filter(Boolean);
  const trend = fitComputeTrend(trendPoints);

  return {
    models_total: rows.length,
    models_with_flop: models.length,
    models_90d: recent.length,
    largest_run: {
      model: largest.model,
      org: largest.org,
      date: largest.date,
      ...fmtFlop(largest.flop),
      confidence: largest.confidence,
      link: largest.link,
      frontier: largest.frontier,
    },
    record_ladder: ladder.slice(-16),
    trend: {
      ...trend,
      sample: trend.ok
        ? trendPoints
          .slice()
          .sort((a, b) => a.t - b.t)
          .filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % Math.max(1, Math.floor(arr.length / 8)) === 0)
          .map((p) => ({ date: p.date, model: p.model, log10: +p.log10.toFixed(3) }))
        : [],
      method: `OLS of log10(training FLOP) on publication date for Epoch "Frontier model"=True rows since ${TREND_FROM}. Doubling months = 12·log10(2)/slope.`,
    },
    newest_with_flop: byFlop
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.flop - a.flop))
      .slice(0, 8)
      .map((m) => ({
        model: m.model,
        org: m.org,
        date: m.date,
        ...fmtFlop(m.flop),
        frontier: m.frontier,
        link: m.link,
      })),
  };
}

export function summariseDataCenters(rows) {
  const sites = [];
  for (const r of rows) {
    const h100 = Number(r['Current H100 equivalents']);
    const mw = Number(r['Current power (MW)']);
    const name = String(r.Name || '').trim();
    if (!name || !Number.isFinite(h100) || h100 <= 0) continue;
    sites.push({
      name,
      h100_eq: +h100.toFixed(0),
      power_mw: Number.isFinite(mw) && mw > 0 ? +mw.toFixed(1) : null,
      owner: cleanTag(r.Owner),
      country: String(r.Country || '').trim() || null,
      project: String(r.Project || '').trim() || null,
    });
  }
  if (sites.length < 10) {
    throw new Error(`compute-clock: only ${sites.length} data centres with H100-eq (need ≥10)`);
  }
  sites.sort((a, b) => b.h100_eq - a.h100_eq);
  const totalH = sites.reduce((a, s) => a + s.h100_eq, 0);
  const totalMw = sites.reduce((a, s) => a + (s.power_mw || 0), 0);
  return {
    sites_covered: sites.length,
    total_h100_eq: Math.round(totalH),
    total_power_mw: +totalMw.toFixed(1),
    largest: sites[0],
    top: sites.slice(0, 12),
  };
}

async function main(argv = process.argv.slice(2)) {
  const offline = argv.includes('--offline');
  const force = argv.includes('--force');
  let prev = null;
  try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }
  if (offline || (!force && prev && Date.now() - Date.parse(prev.fetched_at) < FRESH_MS)) {
    say(`fresh enough (${prev ? prev.fetched_at : 'none'})`);
    return;
  }
  try {
    const [modelsCsv, dcCsv] = await Promise.all([
      fetchText(MODELS_URL, { timeoutMs: 45_000, retries: 1 }),
      fetchText(DC_URL, { timeoutMs: 30_000, retries: 1 }),
    ]);
    const modelSummary = summariseModels(parseCsv(modelsCsv));
    const dcSummary = summariseDataCenters(parseCsv(dcCsv));
    const doc = {
      schema: 1,
      fetched_at: new Date().toISOString(),
      affects_index: false,
      source: 'Epoch AI notable AI models + AI data centers datasets, CC BY 4.0',
      source_urls: {
        models: MODELS_URL,
        models_page: 'https://epoch.ai/data/notable-ai-models',
        data_centers: DC_URL,
        data_centers_page: 'https://epoch.ai/data/ai-data-centers',
      },
      attribution: 'Data from Epoch AI (https://epoch.ai/), used under CC BY 4.0. SIREN recomputes the doubling-time fit; Epoch publishes related trend estimates on epoch.ai.',
      ...modelSummary,
      data_centers: dcSummary,
    };
    writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
    const t = modelSummary.trend;
    say(
      `largest ${modelSummary.largest_run.model} ${modelSummary.largest_run.scientific} FLOP · ` +
        (t.ok ? `doubling ${t.months_per_doubling} mo (${t.growth_per_year}×/yr, n=${t.n})` : `trend dark (${t.error})`) +
        ` · DCs ${dcSummary.sites_covered} sites / ${(dcSummary.total_h100_eq / 1e6).toFixed(1)}M H100e`,
    );
  } catch (e) {
    console.log(`::warning title=compute-clock::${String(e.message).slice(0, 240)}; keeping the previous file`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('compute-clock.mjs')) {
  main().catch((e) => { console.log(`compute-clock failed: ${e.message}`); process.exitCode = 1; });
}
