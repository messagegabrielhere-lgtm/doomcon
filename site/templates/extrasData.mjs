// Pure computations behind the extras pages and feeds (alerts, export,
// changelog, bias, reference plan). No HTML here, no I/O: everything takes
// ctx.history / ctx.state / ctx.news and returns plain objects, so the
// homepage can call whatMoved() and alternativeSignals() without pulling in
// any page template.

import * as brand from '../brand.mjs';

export const DELTA_THRESHOLD = 3;   // composite points between consecutive readings
export const PILLAR_THRESHOLD = 8;  // pillar points between consecutive readings

export const PILLAR_IDS = brand.PILLARS.map((p) => p.id);
export const pillarName = (id) => (brand.PILLARS.find((p) => p.id === id) || { name: id }).name;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const at = (row) => row.generated_at ?? row.t;
const r1 = (v) => Math.round(v * 10) / 10;

/** history rows sorted oldest first, with generated_at filled in. */
export function readings(ctx) {
  const rows = Array.isArray(ctx.history) ? ctx.history : [];
  return rows
    .filter((r) => r && isNum(r.score) && Number.isFinite(Date.parse(at(r))))
    .map((r) => ({ ...r, generated_at: at(r) }))
    .sort((a, b) => Date.parse(a.generated_at) - Date.parse(b.generated_at));
}

/** Receipt id for a reading time: 2026-10-08T02:22:49.191Z -> 2026-10-08T02-22-49Z. */
export function receiptId(iso) {
  return new Date(Date.parse(iso)).toISOString().slice(0, 19).replace(/:/g, '-') + 'Z';
}

/** The page a reading links to: its move page when the build wrote one, else home. */
export function readingPath(ctx, iso) {
  const id = receiptId(iso);
  if (Array.isArray(ctx.moves) && ctx.moves.length) {
    return ctx.moves.some((m) => m.id === id) ? `/moves/${id}.html` : '/';
  }
  if (Array.isArray(ctx.receipts) && ctx.receipts.some((r) => r.id === id)) return `/moves/${id}.html`;
  return '/';
}

/**
 * Pillar transitions between two readings. A pillar whose key is absent from
 * either row was not tracked then and produces nothing; null means dark (or
 * uncalibrated, which stays null on both sides and so never fires).
 */
export function pillarChanges(prev, cur) {
  const out = [];
  for (const id of PILLAR_IDS) {
    const pp = prev.pillars || {};
    const cp = cur.pillars || {};
    if (!(id in pp) || !(id in cp)) continue;
    const a = pp[id];
    const b = cp[id];
    if (isNum(a) && isNum(b)) out.push({ id, name: pillarName(id), kind: 'move', from: a, to: b, delta: b - a });
    else if (isNum(a) && !isNum(b)) out.push({ id, name: pillarName(id), kind: 'dark', from: a, to: null, delta: null });
    else if (!isNum(a) && isNum(b)) out.push({ id, name: pillarName(id), kind: 'live', from: null, to: b, delta: null });
  }
  return out;
}

/** Same for individual sources (history rows carry a per-source score map). */
export function sourceChanges(prev, cur) {
  const out = [];
  const ps = prev.sources || {};
  const cs = cur.sources || {};
  for (const id of Object.keys(cs)) {
    if (!(id in ps)) continue;
    const a = ps[id];
    const b = cs[id];
    if (isNum(a) && !isNum(b)) out.push({ id, kind: 'dark' });
    else if (!isNum(a) && isNum(b)) out.push({ id, kind: 'live' });
  }
  return out;
}

/** Every consecutive pair, newest first, with what changed. */
export function transitions(ctx) {
  const rows = readings(ctx);
  const out = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    const prev = rows[i - 1];
    const cur = rows[i];
    out.push({
      prev, cur,
      at: cur.generated_at,
      score_delta: cur.score - prev.score,
      level_change: prev.level !== cur.level && Number.isFinite(prev.level) && Number.isFinite(cur.level)
        ? { from: prev.level, to: cur.level } : null,
      pillars: pillarChanges(prev, cur),
      sources: sourceChanges(prev, cur),
    });
  }
  return out;
}

/**
 * One entry per UTC hour that has a reading: the hour's last reading against
 * the previous such hour's last reading. Newest first.
 */
export function hourlyEntries(ctx, limit = 48) {
  const rows = readings(ctx);
  const byHour = new Map();
  for (const r of rows) byHour.set(r.generated_at.slice(0, 13), r); // last one wins
  const hours = [...byHour.entries()]; // insertion order == chronological
  const out = [];
  for (let i = hours.length - 1; i >= 1 && out.length < limit; i--) {
    const [hour, cur] = hours[i];
    const prev = hours[i - 1][1];
    out.push({
      hour: `${hour}:00:00Z`,
      at: cur.generated_at,
      prev_at: prev.generated_at,
      gap_hours: (Date.parse(cur.generated_at) - Date.parse(prev.generated_at)) / 3600000,
      score: cur.score,
      prev_score: prev.score,
      score_delta: cur.score - prev.score,
      level: cur.level,
      level_change: prev.level !== cur.level ? { from: prev.level, to: cur.level } : null,
      degraded: cur.degraded === true,
      rule_fired: cur.rule_fired ?? null,
      pillars: pillarChanges(prev, cur),
      sources: sourceChanges(prev, cur),
      top_items: topItems(ctx, prev.generated_at, cur.generated_at),
    });
  }
  return out;
}

/** Up to n top-scored news items published in (fromIso, toIso]. */
export function topItems(ctx, fromIso, toIso, n = 3) {
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
  const lo = Date.parse(fromIso);
  const hi = Date.parse(toIso);
  return items
    .filter((it) => {
      const t = Date.parse(it.published_at);
      return Number.isFinite(t) && t > lo && t <= hi && it.title && it.url;
    })
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, n)
    .map((it) => ({ title: it.title, url: it.url, source: it.source ?? null, published_at: it.published_at, score: isNum(it.score) ? it.score : null }));
}

/**
 * The latest hour, small enough for a homepage module.
 *   hours_ago     hours between the two readings compared (usually 1)
 *   score_delta   composite change, 1 dp
 *   pillar_deltas pillars that moved, largest first (delta null = went dark/live, see kind)
 *   level_change  {from,to} or null
 *   top_items     up to 3 news items published between the two readings
 * Returns null with fewer than two readings.
 */
export function whatMoved(ctx) {
  const [e] = hourlyEntries(ctx, 1);
  if (!e) return null;
  return {
    at: e.at,
    prev_at: e.prev_at,
    hours_ago: Math.max(1, Math.round(e.gap_hours)),
    score: r1(e.score),
    score_delta: r1(e.score_delta),
    pillar_deltas: e.pillars
      .filter((p) => p.kind !== 'move' || Math.abs(p.delta) >= 0.05)
      .map((p) => ({ id: p.id, name: p.name, kind: p.kind, delta: p.delta === null ? null : r1(p.delta) }))
      .sort((a, b) => Math.abs(b.delta ?? 100) - Math.abs(a.delta ?? 100)),
    level_change: e.level_change,
    sources_changed: e.sources,
    top_items: e.top_items,
  };
}

// Plain-English lines for the sources that are collected and published but
// not scored (no entry in the frozen reference yet). Keyed by source id.
export const SIGNAL_DESCRIPTIONS = {
  'github-releases': 'Tagged releases in the last 30 days across a fixed basket of the repositories the field runs on (frameworks, inference engines, vendor SDKs). A shipping-tempo count.',
  huggingface: 'New models uploaded to the Hugging Face Hub in the last 24 hours. Mostly fine-tunes and re-uploads, so it measures how busy the open-model crowd is, not how good the models are.',
  openrouter: 'Models newly listed on OpenRouter, a marketplace that resells access to many AI providers, over the last 30 days. A proxy for how fast new models reach paying developers.',
  stockanalysis: 'The average absolute daily price move across a basket of AI-exposed listed companies. How jumpy the market is about AI, not whether it is up or down.',
  vastai: 'The median rental price per GPU-hour for one fixed GPU model on the Vast.ai spot marketplace, in US dollars. A street price for compute: it rises when the market tightens.',
  govuk: 'UK government publications mentioning AI on GOV.UK in the last 30 days: guidance, consultations, policy papers. The first non-US governance input.',
  kalshi: 'Volume-weighted average daily price move on AI markets at Kalshi, a US-regulated prediction exchange. Opinion with money attached, measured as churn rather than direction.',
  manifold: 'Play-money (mana) staked on AI questions at Manifold Markets over 24 hours. Cheap to trade, so it carries the long tail of AI questions no real-money venue lists.',
  polymarket: 'Volume-weighted average daily price move on AI markets at Polymarket. Real-money opinion, again measured as churn rather than direction.',
};

const SIGNAL_LABELS = {
  'github-releases': 'GitHub releases',
  huggingface: 'Hugging Face uploads',
  openrouter: 'OpenRouter new models',
  stockanalysis: 'AI stock volatility',
  vastai: 'GPU rental price',
  govuk: 'GOV.UK AI publications',
  kalshi: 'Kalshi AI markets',
  manifold: 'Manifold AI volume',
  polymarket: 'Polymarket AI markets',
};

/**
 * The uncalibrated sources: collected every hour, published, not in the score.
 * [{id, label, pillar, value, unit, observed_at, description}]
 */
export function alternativeSignals(state) {
  const src = state && Array.isArray(state.sources) ? state.sources : [];
  return src
    .filter((s) => s && s.uncalibrated)
    .map((s) => ({
      id: s.id,
      label: s.label || SIGNAL_LABELS[s.id] || s.id,
      pillar: s.pillar ?? null,
      value: isNum(s.value) ? s.value : null,
      unit: s.unit ?? null,
      observed_at: s.observed_at ?? null,
      description: SIGNAL_DESCRIPTIONS[s.id] || 'Collected and published hourly; not yet calibrated against the frozen reference, so not in the score.',
    }));
}
