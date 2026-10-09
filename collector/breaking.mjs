// SIREN breaking detection, and the speed ledger behind "How fast is SIREN?".
//
// Called by collector/news.mjs after it has written data/news.json. Writes:
//
//   data/breaking.json   the latest 30 BREAKING clusters, the rule that fired,
//                        SIREN's own first-seen time for each, and the per-
//                        source detection-latency table
//   data/sightings.json  the memory the latency table is computed from: a
//                        hash of every (source, url) SIREN has seen in the last
//                        eight days, and the last 24h of latency samples
//
// THE RULE. A cluster is one event: the items news.mjs merged by URL/title,
// joined by the event stories collector/news-stories.mjs links (the same
// audited word rules, not a second clustering). A cluster is BREAKING when,
// among sightings published in the last six hours,
//
//   (a) two INDEPENDENT outlets carried it within 20 minutes of each other, or
//   (b) a TIER-ONE outlet (a lab's own channel, or a Reuters/AP/Bloomberg/BBC/
//       NYT/Verge/TechCrunch-class newsroom) carried it, plus one more
//       independent outlet at any point in the window.
//
// "Independent" means a different publisher, not a different feed: outlets
// are registrable domains (the OpenAI blog and the OpenAI status page are one
// outlet; two subreddits are one outlet, reddit.com), or the handle of a
// social account that is not a newsroom's own. Unvetted social accounts never
// count — see news-sources/_outlets.mjs.
//
// THE SPEED NUMBER, and exactly what it is: for each item SIREN sees for the
// first time, (SIREN's first-seen time) − (the timestamp the outlet itself put
// on the item). It is NOT a comparison with any other service. It includes the
// outlet's own feed lag and SIREN's polling cadence. Items more than 24 hours
// old when first seen are backfill, not news, and are left out; so is every
// item from a source's first fetch, and from the first run of the ledger.
//
// No network. A pure function of its inputs plus the two files it owns.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { registrableDomain, isTier1, TIER1_OUTLETS } from './news-sources/_outlets.mjs';

export const BREAKING_RULES = Object.freeze({
  VERSION: '1.0.0',
  WINDOW_HOURS: 6,
  PAIR_MINUTES: 20,
  KEEP: 30,
  HOME_FRESH_HOURS: 2,
  SPEED_WINDOW_HOURS: 24,
  MAX_SAMPLE_HOURS: 24,
  SEEN_TTL_DAYS: 8,
});

const DATA = new URL('../data/', import.meta.url);
const BREAKING_URL = new URL('breaking.json', DATA);
const SIGHTINGS_URL = new URL('sightings.json', DATA);

// ---------------------------------------------------------------------------
// Outlets
// ---------------------------------------------------------------------------

const AGGREGATOR_HOSTS = new Set(['news.google.com']);

// RELAYS: places that pass along what others published. They are listed on a
// cluster (they are often first to surface it) but never count as an
// independent outlet: a TechCrunch story on Techmeme is still one report.
export const RELAYS = Object.freeze(new Set(['techmeme.com', 'reddit.com', 'ycombinator.com']));

/** Who published one sighting. Null when it cannot be said. */
export function outletOf({ source, url, outlet } = {}) {
  if (typeof outlet === 'string' && outlet) {
    if (/^(x|bsky):/.test(outlet)) return outlet.toLowerCase();
    return registrableDomain(outlet) ?? outlet.toLowerCase();
  }
  if (typeof source === 'string' && source.startsWith('reddit-')) return 'reddit.com';
  let host = null;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
  // A redirect through an aggregator names nobody; it is not an outlet.
  if (AGGREGATOR_HOSTS.has(host)) return null;
  return registrableDomain(host);
}

/** Every sighting behind one news item: its primary plus its merged members. */
export function sightingsOf(item) {
  const meta = item?.meta ?? {};
  const corr = meta.corroboration ?? {};
  const firstSeenMs = Date.parse(meta.first_seen_at ?? '');
  const own = {
    source: item.source,
    url: item.url,
    title: item.title,
    published_at: corr.primary_published_at ?? item.published_at,
    outlet: outletOf({ source: item.source, url: item.url, outlet: meta.outlet_domain }),
    unvetted: Boolean(meta.unvetted),
  };
  const also = (Array.isArray(corr.also) ? corr.also : []).map((m) => ({
    source: m.source,
    url: m.url,
    title: m.title,
    published_at: m.published_at,
    outlet: outletOf({ source: m.source, url: m.url, outlet: m.outlet }),
    unvetted: Boolean(m.unvetted),
  }));
  return [own, ...also].map((s) => {
    let t = Date.parse(s.published_at ?? '');
    // An outlet timestamp later than the moment we first saw the group is a
    // clock lie; the sighting cannot postdate our own record of it.
    if (Number.isFinite(firstSeenMs) && Number.isFinite(t) && t > firstSeenMs) t = firstSeenMs;
    return { ...s, t };
  }).filter((s) => Number.isFinite(s.t));
}

// ---------------------------------------------------------------------------
// Clustering — reuse, do not reinvent
// ---------------------------------------------------------------------------

/** Items -> arrays of items, one per event. Joined by story id; otherwise alone. */
export function clusterItems(items) {
  const byKey = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || !it.id) continue;
    const key = it.meta?.story?.id ? `story:${it.meta.story.id}` : `item:${it.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  }
  return [...byKey.values()];
}

/**
 * Does this cluster meet the rule at `nowMs`? Pure.
 * Returns null when it does not, else the evidence.
 */
export function evaluateCluster(clusterItemsList, nowMs, rules = BREAKING_RULES) {
  const since = nowMs - rules.WINDOW_HOURS * 3_600_000;
  const all = clusterItemsList
    .flatMap(sightingsOf)
    .filter((s) => s.outlet && s.t >= since && s.t <= nowMs + 10 * 60_000);
  // Only vetted publishers count toward the rule.
  const sightings = all.filter((s) => !s.unvetted && !RELAYS.has(s.outlet));

  const earliestByOutlet = new Map();
  for (const s of sightings) {
    const prev = earliestByOutlet.get(s.outlet);
    if (!prev || s.t < prev.t) earliestByOutlet.set(s.outlet, s);
  }
  const outlets = [...earliestByOutlet.keys()].sort();
  if (outlets.length < 2) return null;

  const pairMs = rules.PAIR_MINUTES * 60_000;
  let pair = null;
  const sorted = sightings.slice().sort((a, b) => a.t - b.t || String(a.outlet).localeCompare(String(b.outlet)));
  for (let i = 0; i < sorted.length && !pair; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].t - sorted[i].t > pairMs) break;
      if (sorted[j].outlet !== sorted[i].outlet) { pair = [sorted[i], sorted[j]]; break; }
    }
  }
  const tier1 = outlets.filter(isTier1);
  const rule = [pair ? `two outlets within ${rules.PAIR_MINUTES} min` : null, tier1.length ? 'tier-one outlet plus one more' : null].filter(Boolean);
  if (!rule.length) return null;
  const shown = all.slice().sort((a, b) => a.t - b.t || String(a.outlet).localeCompare(String(b.outlet)));
  return { sightings: shown, outlets, tier1, rule, pair };
}

function hash(s, n = 12) {
  return createHash('sha256').update(s).digest('hex').slice(0, n);
}

function iso(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Build the published record for one cluster that met the rule. */
export function clusterRecord(list, ev, nowIso) {
  const firstSeenMs = Math.min(...list.map((i) => Date.parse(i.meta?.first_seen_at ?? '')).filter(Number.isFinite));
  const earliestMs = Math.min(...ev.sightings.map((s) => s.t));
  const anchor = list.slice().sort((a, b) =>
    (Date.parse(a.meta?.first_seen_at ?? '') || 0) - (Date.parse(b.meta?.first_seen_at ?? '') || 0) || a.id.localeCompare(b.id))[0];
  // Headline: a tier-one outlet's own item when there is one, else the
  // highest-scoring item. Never a model-written line: every candidate is an
  // item a feed published.
  const tierItem = list
    .filter((i) => isTier1(outletOf({ source: i.source, url: i.url, outlet: i.meta?.outlet_domain })) && !i.meta?.unvetted)
    .sort((a, b) => (b.score || 0) - (a.score || 0) || a.id.localeCompare(b.id))[0];
  const lead = tierItem ?? list.slice().sort((a, b) => (b.score || 0) - (a.score || 0) || a.id.localeCompare(b.id))[0];
  const seenMs = Number.isFinite(firstSeenMs) ? firstSeenMs : Date.parse(nowIso);
  const rawLatency = Math.round((seenMs - earliestMs) / 1000);
  return {
    id: `b${hash(anchor.id)}`,
    title: lead.title,
    url: lead.url,
    source: lead.source,
    outlet: outletOf({ source: lead.source, url: lead.url, outlet: lead.meta?.outlet_domain }),
    outlets: ev.outlets,
    tier1_outlets: ev.tier1,
    corroboration: ev.outlets.length,
    sources: [...new Set(ev.sightings.map((s) => s.source))].sort(),
    rule: ev.rule,
    earliest_published_at: iso(earliestMs),
    first_seen_at: iso(seenMs),
    // SIREN's first sighting minus the outlet's own earliest timestamp.
    latency_s: Math.max(0, rawLatency),
    ...(rawLatency < 0 ? { clock_skew: true } : {}),
    breaking_at: nowIso,
    item_ids: list.map((i) => i.id).sort(),
    sightings: ev.sightings.slice(0, 12).map((s) => ({
      source: s.source, outlet: s.outlet, title: s.title, url: s.url, published_at: iso(s.t), tier1: isTier1(s.outlet),
    })),
  };
}

/**
 * The cluster list for this run, merged with the previous file.
 * A cluster keeps its first `breaking_at` and id across runs (matched on any
 * shared item id); a cluster that no longer meets the rule stays listed as
 * history with live=false. Pure.
 */
export function detectBreaking(items, prevClusters, { generatedAt, rules = BREAKING_RULES } = {}) {
  const nowMs = Date.parse(generatedAt);
  const prev = Array.isArray(prevClusters) ? prevClusters.filter((c) => c && Array.isArray(c.item_ids)) : [];
  const out = [];
  const matched = new Set();
  for (const list of clusterItems(items)) {
    const ev = evaluateCluster(list, nowMs, rules);
    if (!ev) continue;
    const rec = clusterRecord(list, ev, generatedAt);
    const ids = new Set(rec.item_ids);
    const old = prev.find((c) => !matched.has(c.id) && c.item_ids.some((id) => ids.has(id)));
    if (old) {
      matched.add(old.id);
      rec.id = old.id;
      rec.breaking_at = old.breaking_at ?? rec.breaking_at;
      // SIREN's first sighting can only move earlier, never later.
      if (old.first_seen_at && Date.parse(old.first_seen_at) < Date.parse(rec.first_seen_at)) {
        rec.first_seen_at = old.first_seen_at;
        rec.latency_s = Math.max(0, Math.round((Date.parse(rec.first_seen_at) - Date.parse(rec.earliest_published_at)) / 1000));
      }
    }
    out.push({ ...rec, live: true });
  }
  for (const c of prev) {
    if (matched.has(c.id) || out.some((o) => o.id === c.id)) continue;
    out.push({ ...c, live: false });
  }
  out.sort((a, b) => Date.parse(b.breaking_at) - Date.parse(a.breaking_at) || a.id.localeCompare(b.id));
  return out.slice(0, rules.KEEP);
}

// ---------------------------------------------------------------------------
// The speed ledger
// ---------------------------------------------------------------------------

export function median(nums) {
  const a = nums.filter(Number.isFinite).slice().sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

/**
 * Fold this run's fresh records into the sightings ledger. Pure.
 * @returns {{ ledger, added }}
 */
export function updateSightings(prevLedger, freshRecords, { generatedAt, previousSources = [], rules = BREAKING_RULES } = {}) {
  const nowMs = Date.parse(generatedAt);
  const nowMin = Math.floor(nowMs / 60_000);
  const baseline = !prevLedger || typeof prevLedger !== 'object' || !prevLedger.seen || typeof prevLedger.seen !== 'object';
  const seen = baseline ? {} : { ...prevLedger.seen };
  const ttlMin = rules.SEEN_TTL_DAYS * 1440;
  for (const [k, v] of Object.entries(seen)) {
    const m = parseInt(v, 36);
    if (!Number.isFinite(m) || nowMin - m > ttlMin) delete seen[k];
  }
  const sinceSec = Math.floor(nowMs / 1000) - rules.SPEED_WINDOW_HOURS * 3600;
  const samples = (baseline || !Array.isArray(prevLedger.samples) ? [] : prevLedger.samples)
    .filter((s) => Array.isArray(s) && s.length === 3 && Number.isFinite(s[1]) && s[1] >= sinceSec);

  // A source counts only when it was ASKED before this run and was not dark
  // then: otherwise everything it returns is backlog, not news arriving.
  const prevById = new Map(previousSources.map((s) => [s.id, s]));
  let added = 0;
  for (const r of freshRecords) {
    if (!r || typeof r.url !== 'string' || !Number.isFinite(r.published_ms)) continue;
    const k = hash(`${r.source}|${r.url}`, 10);
    if (seen[k] !== undefined) continue;
    seen[k] = nowMin.toString(36);
    if (baseline) continue;
    const p = prevById.get(r.source);
    if (!p || !p.fetched_at || p.ok === false) continue;
    const lat = Math.round((nowMs - r.published_ms) / 1000);
    if (lat > rules.MAX_SAMPLE_HOURS * 3600) continue;
    samples.push([r.source, Math.floor(nowMs / 1000), Math.max(0, lat)]);
    added += 1;
  }
  samples.sort((a, b) => a[1] - b[1] || String(a[0]).localeCompare(String(b[0])) || a[2] - b[2]);
  return {
    ledger: {
      schema: 1,
      started_at: baseline ? generatedAt : (prevLedger.started_at ?? generatedAt),
      updated_at: generatedAt,
      seen,
      samples,
    },
    added,
  };
}

/** Per-source and overall medians over the ledger's samples. Pure. */
export function speedTable(ledger, sources = [], rules = BREAKING_RULES) {
  const labels = new Map(sources.map((s) => [s.id, s.label]));
  const bySource = new Map();
  for (const [src, , lat] of ledger.samples ?? []) {
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src).push(lat);
  }
  const rows = [...bySource.entries()].map(([source, lats]) => ({
    source,
    label: labels.get(source) ?? source,
    median_s: median(lats),
    n: lats.length,
  })).sort((a, b) => a.median_s - b.median_s || a.source.localeCompare(b.source));
  const all = (ledger.samples ?? []).map((s) => s[2]);
  return {
    window_hours: rules.SPEED_WINDOW_HOURS,
    definition:
      "Median time from the timestamp an outlet put on an item to the moment SIREN first saw it, per source, over the last 24 hours. " +
      "It includes the outlet's own feed delay and SIREN's polling interval. It is not a comparison with any other service. " +
      "Items more than 24 hours old when first seen, and everything from a source's first fetch, are left out. " +
      "GDELT items are timed from GDELT's own crawl, not the outlet's; X items from the post id.",
    ledger_started_at: ledger.started_at ?? null,
    overall: { median_s: median(all), n: all.length },
    by_source: rows,
  };
}

// ---------------------------------------------------------------------------
// The pass news.mjs calls
// ---------------------------------------------------------------------------

async function readJsonOr(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return fallback; }
}

export async function breakingPass({
  items, freshRecords, sources, previousSources, generatedAt, dataDir = DATA,
  loopRunning = process.env.NEWS_LOOP_RUNNING === '1',
}) {
  const breakingUrl = new URL('breaking.json', dataDir);
  const sightingsUrl = new URL('sightings.json', dataDir);
  const prevBreaking = await readJsonOr(breakingUrl, null);
  const prevSightings = await readJsonOr(sightingsUrl, null);

  const clusters = detectBreaking(items, prevBreaking?.clusters, { generatedAt });
  // A lane that runs while the minute loop is looping works from main's
  // hour-old ledger and would count the loop's sightings as new arrivals; it
  // reads the ledger but does not write it.
  const frozen = loopRunning && prevSightings && typeof prevSightings === 'object';
  const { ledger } = frozen
    ? { ledger: prevSightings }
    : updateSightings(prevSightings, freshRecords, { generatedAt, previousSources });
  const speed = speedTable(ledger, sources);

  const nowMs = Date.parse(generatedAt);
  const out = {
    schema: 1,
    generated_at: generatedAt,
    rules: {
      version: BREAKING_RULES.VERSION,
      window_hours: BREAKING_RULES.WINDOW_HOURS,
      pair_minutes: BREAKING_RULES.PAIR_MINUTES,
      keep: BREAKING_RULES.KEEP,
      text:
        `BREAKING when, inside ${BREAKING_RULES.WINDOW_HOURS}h, two independent outlets carry one event within ` +
        `${BREAKING_RULES.PAIR_MINUTES} minutes of each other, or one tier-one outlet (a lab's own channel, or a ` +
        'wire / paper-of-record / major tech desk) plus one more independent outlet. Outlets are publishers, not feeds; ' +
        'unvetted social accounts never count, and relays (Techmeme, Hacker News, Reddit) are listed but not counted.',
      tier1_outlets: [...TIER1_OUTLETS].sort(),
      relays_not_counted: [...RELAYS].sort(),
    },
    live: clusters.filter((c) => c.live).length,
    // The freshest live cluster under two hours old, for the homepage slot.
    fresh: clusters.find((c) => c.live && nowMs - Date.parse(c.first_seen_at) < BREAKING_RULES.HOME_FRESH_HOURS * 3_600_000)?.id ?? null,
    clusters,
    speed,
  };

  await mkdir(dataDir, { recursive: true });
  await writeFile(breakingUrl, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  if (!frozen) await writeFile(sightingsUrl, `${JSON.stringify(ledger)}\n`, 'utf8');
  return out;
}

export { BREAKING_URL, SIGHTINGS_URL };
