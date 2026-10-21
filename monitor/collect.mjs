// World Monitor snapshot (site/static/monitor.html reads it).
//
// Why a server side at all, when the page can call most of these APIs itself:
//   - GDELT asks for one request every five seconds. Fourteen categories per
//     visitor per visit cannot honour that; one runner every 15 minutes can.
//   - RSS feeds (BBC, Al Jazeera, DW, …) send no CORS headers, so a browser
//     cannot read them at all.
//   - Some APIs (GDACS, ADS-B) may refuse cross-origin reads. The snapshot is
//     the fallback the page uses when its live call fails.
//   - A stress index that "updates as things happen" needs a memory. Every run
//     appends each country's inputs to a 7-day hourly history.
//
// Same publishing pattern as scanner/collect-stocks.mjs: the workflow writes
// the files to the monitor-data branch and the page reads them from
// raw.githubusercontent.com. Nothing here writes to main.
//
// Usage: node monitor/collect.mjs <outdir> [--prev <url-or-dir>] [--skip-gdelt]

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchText, fetchJson } from '../collector/fetch.mjs';
import { readFeed } from '../collector/news-sources/_feed.mjs';
import {
  CATS, GDELT_QUERY, categorize, prepCountries, countryNear, countryAt, makeMatcher, clusterStories,
  countryInputs, newsPart, hazardPart, CORE_VERSION,
  adsbModality, adsbCells, adsbModeTotals, assessAircraftHealth, isAdsbRateLimit,
} from './core.mjs';

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith('--')) || 'monitor-out';
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const PREV = opt('--prev') ?? 'https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon/monitor-data';

const KEEP_MS = 72 * 3600e3;         // news window carried between runs
const HISTORY_DAYS = 7;
const MAX_ITEMS = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

/* World and specialist feeds. `cat` is the fallback when no category pattern
 * matches a headline (a ransomware story on a security site is cyber even if
 * the title only names the victim). */
export const FEEDS = [
  ['bbc', 'bbc.co.uk', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
  ['aljazeera', 'aljazeera.com', 'https://www.aljazeera.com/xml/rss/all.xml'],
  ['guardian', 'theguardian.com', 'https://www.theguardian.com/world/rss'],
  ['npr', 'npr.org', 'https://feeds.npr.org/1004/rss.xml'],
  ['dw', 'dw.com', 'https://rss.dw.com/rdf/rss-en-world'],
  ['france24', 'france24.com', 'https://www.france24.com/en/rss'],
  ['nyt', 'nytimes.com', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'],
  ['wapo', 'washingtonpost.com', 'https://feeds.washingtonpost.com/rss/world'],
  ['euronews', 'euronews.com', 'https://www.euronews.com/rss?level=theme&name=news'],
  ['rfi', 'rfi.fr', 'https://www.rfi.fr/en/rss'],
  ['abc-au', 'abc.net.au', 'https://www.abc.net.au/news/feed/2942460/rss.xml'],
  ['sky', 'news.sky.com', 'https://feeds.skynews.com/feeds/rss/world.xml'],
  ['un', 'news.un.org', 'https://news.un.org/feed/subscribe/en/news/all/rss.xml'],
  ['cnbc', 'cnbc.com', 'https://www.cnbc.com/id/100727362/device/rss/rss.html', 'economy'],
  ['middleeasteye', 'middleeasteye.net', 'https://www.middleeasteye.net/rss'],
  ['japantimes', 'japantimes.co.jp', 'https://www.japantimes.co.jp/feed/'],
  ['scmp', 'scmp.com', 'https://www.scmp.com/rss/91/feed'],
  ['africanews', 'africanews.com', 'https://www.africanews.com/feed/rss'],
  ['defensenews', 'defensenews.com', 'https://www.defensenews.com/arc/outboundfeeds/rss/', 'conflict'],
  ['twz', 'twz.com', 'https://www.twz.com/feed', 'conflict'],
  ['bleeping', 'bleepingcomputer.com', 'https://www.bleepingcomputer.com/feed/', 'cyber'],
  ['therecord', 'therecord.media', 'https://therecord.media/feed', 'cyber'],
  ['krebs', 'krebsonsecurity.com', 'https://krebsonsecurity.com/feed/', 'cyber'],
  ['gcaptain', 'gcaptain.com', 'https://gcaptain.com/feed/', 'shipping'],
  ['splash247', 'splash247.com', 'https://splash247.com/feed/', 'shipping'],
  ['oilprice', 'oilprice.com', 'https://oilprice.com/rss/main', 'energy'],
  ['who', 'who.int', 'https://www.who.int/rss-feeds/news-english.xml', 'health'],
  // Science Daily (tweet rabbit-hole list): science press wire + AI lane.
  ['sciencedaily', 'sciencedaily.com', 'https://www.sciencedaily.com/rss/top/science.xml'],
  ['sciencedaily-ai', 'sciencedaily.com', 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', 'ai'],
];

const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';
const SRC = {
  usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
  eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30',
  // the MAP list now needs one event type per call (measured 2026-10-07: "Eventtype is required.")
  gdacs: ['EQ', 'TC', 'FL', 'VO', 'WF', 'DR'].map((t) => `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=${t}`),
  // adsb.lol only (ODbL). airplanes.live / OpenSky are non-commercial-use only.
  mil: ['https://api.adsb.lol/v2/mil'],
  emerg: ['7700', '7600', '7500'].map((s) => `https://api.adsb.lol/v2/sqk/${s}`),
  kev: 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json',
};

/* Major hubs / corridors for civilian ADS-B density. Each point is queried at
 * 250 nm (adsb.lol's max). Overlaps are deduped by hex before the hex is
 * dropped — the published layer is regional counts only. */
const ADSB_HUBS = Object.freeze([
  [40.64, -73.78], [33.94, -118.41], [41.98, -87.91], [32.90, -97.04],
  [25.80, -80.29], [37.62, -122.38], [47.45, -122.31], [33.64, -84.43],
  [51.47, -0.46], [49.01, 2.55], [50.04, 8.57], [52.31, 4.77],
  [41.80, 12.25], [40.47, -3.57], [55.61, 12.65], [59.65, 17.92],
  [25.25, 55.36], [41.28, 28.75], [30.12, 31.41], [55.97, 37.41],
  [28.56, 77.10], [19.09, 72.87], [13.20, 77.71], [35.55, 139.78],
  [37.46, 126.44], [31.14, 121.81], [22.31, 113.91], [1.36, 103.99],
  [3.14, 101.69], [13.69, 100.75], [-33.95, 151.18], [-37.67, 144.84],
  [-23.43, -46.47], [-34.82, -58.54], [19.44, -99.07], [4.70, -74.15],
  [-26.13, 28.25], [-1.32, 36.93], [6.58, 3.32], [24.91, 67.16],
]);
const ADSB_HUB_NM = 250;

async function readPrev(name) {
  try {
    if (/^https?:/.test(PREV)) return await fetchJson(`${PREV}/${name}`, { retries: 1 });
    return JSON.parse(await readFile(path.join(PREV, name), 'utf8'));
  } catch (e) { log(`previous ${name}: none (${e.message.slice(0, 80)})`); return null; }
}

/* ------------------------------------------------------------- collectors */

/* GDELT answered HTTP 429 to every one of 14 per-category calls from a GitHub
 * runner, even six seconds apart (first run, 2026-10-07): shared runner IPs
 * spend its budget, and a single combined call got 429 too (second run). The
 * call stays, retried once, in case the block lifts; when it fails the page
 * makes the same single call from the visitor's browser instead. */
async function gdelt(sources) {
  const out = [];
  const url = `${GDELT}?query=${encodeURIComponent(`${GDELT_QUERY} sourcelang:english`)}&mode=artlist&maxrecords=250&format=json&timespan=24h&sort=datedesc`;
  let err = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const body = await fetchText(url, { retries: 0, timeoutMs: 40000 });
      let j; try { j = JSON.parse(body); } catch { throw new Error(body.slice(0, 100)); }
      for (const a of j.articles || []) {
        const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(a.seendate || '');
        if (!a.title || !a.url || !m) continue;
        out.push({ id: a.url, title: a.title.trim(), url: a.url, src: a.domain, cat: categorize(a.title), t: Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]), via: 'gdelt' });
      }
      err = null; break;
    } catch (e) { err = e; if (!attempt) await sleep(20000); }
  }
  sources.gdelt = { ok: !err, n: out.length, cats: err ? 0 : 1, errors: err ? [String(err.message).slice(0, 140)] : [] };
  log(`gdelt ${err ? 'FAILED ' + err.message.slice(0, 80) : out.length + ' articles'}`);
  return out;
}

async function rss(sources) {
  const out = [];
  const per = {};
  let next = 0;
  const worker = async () => {
    while (next < FEEDS.length) {
      const [id, domain, url, fallback] = FEEDS[next++];
      try {
        const entries = await readFeed(fetchText, url, { limit: 60, retries: 1, timeoutMs: 20000 });
        let n = 0;
        for (const e of entries) {
          const t = e.published_at ? Date.parse(e.published_at) : NaN;
          if (!Number.isFinite(t) || Date.now() - t > KEEP_MS || t > Date.now() + 3600e3) continue;
          out.push({ id: e.url, title: e.title, url: e.url, src: domain, cat: categorize(e.title, fallback || 'world'), t, via: id });
          n++;
        }
        per[id] = { ok: true, n };
      } catch (e) { per[id] = { ok: false, error: String(e.message).slice(0, 120) }; }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  const okN = Object.values(per).filter((p) => p.ok).length;
  sources.rss = { ok: okN > 0, n: out.length, feeds: okN, of: FEEDS.length, per };
  log(`rss ${okN}/${FEEDS.length} feeds, ${out.length} items`);
  return out;
}

/** Strip identifying fields; keep only lat/lon + modality for cell aggregation. */
function adsbPoint(a) {
  if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) return null;
  return { lon: a.lon, lat: a.lat, mod: adsbModality(a.type, a) };
}

async function hazards(sources, countries) {
  const res = { quakes: [], eonet: [], gdacs: [], mil: [], adsb: [], emerg: [], kev: [] };
  const tryIt = async (id, fn) => {
    try { await fn(); sources[id] = { ok: true, n: res[id === 'usgs' ? 'quakes' : id].length }; }
    catch (e) { sources[id] = { ok: false, error: String(e.message).slice(0, 160) }; }
    log(`${id} ${sources[id].ok ? sources[id].n : 'FAILED ' + sources[id].error}`);
  };
  await Promise.all([
    tryIt('usgs', async () => {
      const j = await fetchJson(SRC.usgs);
      res.quakes = j.features.map((f) => ({ id: f.id, mag: f.properties.mag, place: f.properties.place, t: f.properties.time, url: f.properties.url, tsunami: f.properties.tsunami, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2] }))
        .filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.mag));
    }),
    tryIt('eonet', async () => {
      const j = await fetchJson(SRC.eonet, { timeoutMs: 40000 });
      for (const ev of j.events || []) {
        const g = ev.geometry?.[ev.geometry.length - 1];
        if (!g) continue;
        let lon, lat;
        if (g.type === 'Point') [lon, lat] = g.coordinates;
        else if (g.type === 'Polygon') { const r = g.coordinates[0]; lon = r.reduce((s, p) => s + p[0], 0) / r.length; lat = r.reduce((s, p) => s + p[1], 0) / r.length; }
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const track = (ev.geometry || []).filter((x) => x.type === 'Point').map((x) => x.coordinates).slice(-40);
        res.eonet.push({ id: ev.id, title: ev.title, cat: ev.categories?.[0]?.id || 'manmade', lon, lat, t: Date.parse(g.date) || Date.now(), url: ev.sources?.[0]?.url || ev.link, mag: g.magnitudeValue, unit: g.magnitudeUnit, track: track.length > 1 ? track : null });
      }
    }),
    tryIt('gdacs', async () => {
      const feats = [];
      let okN = 0, last;
      for (const u of SRC.gdacs) { try { feats.push(...((await fetchJson(u, { timeoutMs: 30000, retries: 1 })).features || [])); okN++; } catch (e) { last = e; } }
      if (!okN) throw last;
      res.gdacs = feats.filter((f) => f.geometry?.type === 'Point' && f.properties?.alertlevel).map((f) => ({
        id: `${f.properties.eventtype}${f.properties.eventid}`, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
        level: f.properties.alertlevel, type: f.properties.eventtype, title: f.properties.name || f.properties.description || '',
        country: f.properties.country, t: Date.parse(f.properties.fromdate) || Date.now(), url: f.properties.url?.report || f.properties.url?.details || null,
      })).filter((g, i, all) => (g.level !== 'Green' || Date.now() - g.t < 3 * 86400e3) && all.findIndex((x) => x.id === g.id) === i);
    }),
    tryIt('mil', async () => {
      let j, err;
      for (const u of SRC.mil) { try { j = await fetchJson(u, { timeoutMs: 25000 }); break; } catch (e) { err = e; } }
      if (!j) throw err;
      // Positions + modality only. No callsign, registration, hex, altitude or heading.
      res.mil = (j.ac || j.aircraft || []).map(adsbPoint).filter(Boolean);
    }),
    tryIt('adsb', async () => {
      // Civilian / mixed traffic density around major hubs. Hex is used only to
      // dedupe overlapping 250 nm circles, then discarded before publish.
      // The four workers share api.adsb.lol's gate in collector/fetch.mjs
      // (10 req/min). They queue; they must not burst.
      const seen = new Set();
      const pts = [];
      let next = 0;
      let okN = 0;
      let last;
      const worker = async () => {
        while (next < ADSB_HUBS.length) {
          const i = next++;
          const [lat, lon] = ADSB_HUBS[i];
          const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${ADSB_HUB_NM}`;
          try {
            const j = await fetchJson(url, { timeoutMs: 25000, retries: 1 });
            okN++;
            for (const a of j.ac || j.aircraft || []) {
              const hex = String(a.hex || '').toLowerCase();
              if (hex) {
                if (seen.has(hex)) continue;
                seen.add(hex);
              }
              const p = adsbPoint(a);
              if (p) pts.push(p);
            }
          } catch (e) { last = e; }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      if (!okN) throw last || new Error('no hub answered');
      sources.adsb_hubs = { ok: okN, of: ADSB_HUBS.length, unique: pts.length };
      res.adsb = pts;
    }),
    tryIt('emerg', async () => {
      const pts = [];
      let okN = 0;
      let last;
      // Ask squawk codes one at a time. A 429/420 on the first means the shared
      // adsb.lol budget is spent — stop instead of burning two more 429s that
      // leave emerg with no stale_from and trip the watchdog.
      for (let i = 0; i < SRC.emerg.length; i++) {
        const code = ['7700', '7600', '7500'][i];
        try {
          const j = await fetchJson(SRC.emerg[i], { timeoutMs: 20000, retries: 1 });
          okN++;
          for (const a of j.ac || j.aircraft || []) {
            const p = adsbPoint(a);
            if (p) pts.push({ ...p, by: { [code]: 1 } });
          }
        } catch (e) {
          last = e;
          if (isAdsbRateLimit(e && e.message)) break;
        }
      }
      if (!okN) throw last || new Error('no squawk feed answered');
      res.emerg = pts;
    }),
    tryIt('kev', async () => {
      const j = await fetchJson(SRC.kev, { timeoutMs: 40000 });
      res.kev = (j.vulnerabilities || []).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 60)
        .map((k) => ({ cveID: k.cveID, vendorProject: k.vendorProject, product: k.product, vulnerabilityName: k.vulnerabilityName, dateAdded: k.dateAdded, dueDate: k.dueDate, knownRansomwareCampaignUse: k.knownRansomwareCampaignUse }));
      sources.kev_total = j.count || j.vulnerabilities?.length;
    }),
  ]);
  for (const q of res.quakes) q.iso = countryNear(countries, q.lon, q.lat)?.iso2 || null;
  for (const e of res.eonet) e.iso = countryNear(countries, e.lon, e.lat)?.iso2 || null;
  for (const g of res.gdacs) g.iso = countryNear(countries, g.lon, g.lat)?.iso2 || null;
  for (const a of res.mil) a.iso = countryAt(countries, a.lon, a.lat)?.iso2 || null;
  for (const a of res.adsb) a.iso = countryAt(countries, a.lon, a.lat)?.iso2 || null;
  for (const a of res.emerg) a.iso = countryAt(countries, a.lon, a.lat)?.iso2 || null;
  // Publish aircraft ONLY as counts per 5° cell: no identifiers, modality mix kept.
  res.mil = adsbCells(res.mil);
  res.adsb = adsbCells(res.adsb);
  res.emerg = adsbCells(res.emerg);
  sources.mil_modes = adsbModeTotals(res.mil);
  sources.adsb_modes = adsbModeTotals(res.adsb);
  return res;
}

/* --------------------------------------------------------------- history */

/** One point per hour; a run inside the same hour replaces that hour's point. */
export function appendHistory(prev, now, inputs) {
  // a new CORE_VERSION scores differently, so its history starts clean rather than mixing scales
  const h = prev && prev.schema === 1 && prev.core === CORE_VERSION ? prev : { schema: 1, core: CORE_VERSION, t: [], c: {} };
  const hour = Math.floor(now / 3600e3);
  const cut = hour - HISTORY_DAYS * 24;
  let idx = h.t.length - 1;
  if (idx < 0 || h.t[idx] !== hour) { h.t.push(hour); idx = h.t.length - 1; for (const k of Object.keys(h.c)) h.c[k].push(null); }
  const isos = new Set([...inputs.w.keys(), ...inputs.hz.keys()]);
  for (const iso of isos) {
    if (!h.c[iso]) h.c[iso] = new Array(h.t.length).fill(null);
    h.c[iso][idx] = [Math.round(newsPart(inputs.w.get(iso))), Math.round(hazardPart(inputs.hz.get(iso)))];
  }
  for (const k of Object.keys(h.c)) if (!isos.has(k)) h.c[k][idx] = null;
  // trim the week
  let drop = 0; while (drop < h.t.length && h.t[drop] < cut) drop++;
  if (drop) { h.t = h.t.slice(drop); for (const k of Object.keys(h.c)) h.c[k] = h.c[k].slice(drop); }
  for (const k of Object.keys(h.c)) if (h.c[k].every((v) => v == null)) delete h.c[k];
  return h;
}

/**
 * Keep the previous reading when this run's fetch failed.
 * An empty array still counts when that previous fetch succeeded: emergency
 * squawks are usually zero aircraft, and treating "no rows" as "no archive"
 * turned a 429 into an error-severity outage instead of a stale warning.
 */
export function carryForward(sources, hz, prevSnap) {
  const cellKeys = new Set(['mil', 'adsb', 'emerg']);
  for (const k of ['quakes', 'eonet', 'gdacs', 'mil', 'adsb', 'emerg', 'kev']) {
    const sid = k === 'quakes' ? 'usgs' : k;
    if (sources[sid]?.ok) continue;
    const prevRows = prevSnap?.[k];
    const hasRows = Array.isArray(prevRows) && prevRows.length > 0;
    const prevSrc = prevSnap?.sources?.[sid];
    const prevOk = prevSrc?.ok === true || Boolean(prevSrc?.stale_from);
    if (!hasRows && !prevOk) continue;
    if (Array.isArray(prevRows)) {
      hz[k] = cellKeys.has(k) ? prevRows.filter((c) => Number.isFinite(c.n)) : prevRows;
    }
    sources[sid] = { ...(sources[sid] || {}), stale_from: prevSnap.generated };
  }
}

/* ------------------------------------------------------------------ main */

export async function main() {
  const t0 = Date.now();
  const outline = JSON.parse(await readFile(new URL('../data/world-outline.json', import.meta.url), 'utf8'));
  const countries = prepCountries(outline);
  const countriesIn = makeMatcher(countries);
  const sources = {};

  const [prevSnap, prevHist] = await Promise.all([readPrev('monitor.json'), readPrev('monitor-history.json')]);
  const [gd, feeds, hz] = await Promise.all([flag('--skip-gdelt') ? [] : gdelt(sources), rss(sources), hazards(sources, countries)]);

  // Carry items forward so the window is 72 h even though GDELT answers for 24 h.
  const byUrl = new Map();
  // SIREN's own AI newsroom, read from the checkout: the page used to download
  // the whole 900 KB news.json for the ~120 headlines it shows.
  const siren = [];
  try {
    const nj = JSON.parse(await readFile(new URL('../data/news.json', import.meta.url), 'utf8'));
    for (const it of (nj.items || []).slice(0, 160)) {
      const t = Date.parse(it.published_at);
      if (!it.url || !it.title || !Number.isFinite(t) || Date.now() - t > KEEP_MS) continue;
      siren.push({ id: it.url, title: it.title, url: it.url, src: it.source, cat: 'ai', t, via: 'siren' });
    }
    sources.siren = { ok: true, n: siren.length };
  } catch (e) { sources.siren = { ok: false, error: String(e.message).slice(0, 120) }; }
  log(`siren ${sources.siren.ok ? siren.length : 'FAILED ' + sources.siren.error}`);
  const fresh = [...gd, ...feeds, ...siren];
  for (const it of [...(prevSnap?.items || []), ...fresh]) {
    if (!it.url || !it.title || Date.now() - it.t > KEEP_MS) continue;
    const old = byUrl.get(it.url);
    if (!old || (old.cat === 'world' && it.cat !== 'world')) byUrl.set(it.url, { ...it, iso: countriesIn(it.title) });
  }
  const items = [...byUrl.values()].sort((a, b) => b.t - a.t).slice(0, MAX_ITEMS);

  // A source that failed this run keeps its previous data, marked stale, rather than vanishing.
  carryForward(sources, hz, prevSnap);
  const stories = clusterStories(items);
  const inputs = countryInputs({ stories, quakes: hz.quakes, gdacs: hz.gdacs, eonet: hz.eonet, now: Date.now() });
  const history = appendHistory(prevHist, Date.now(), inputs);

  const snap = {
    schema: 1, core: CORE_VERSION, generated: new Date().toISOString(), took_ms: Date.now() - t0, sources,
    counts: { items: items.length, stories: stories.length, countries_scored: inputs.w.size },
    items: items.map(({ id, title, url, src, cat, t, iso }) => ({ id, title, url, src, cat, t, iso })),
    ...hz,
  };
  // Aircraft feed health rides with the snapshot so the page, CI and the
  // watchdog all read the same verdict — no second guess of the numbers.
  snap.aircraft_health = assessAircraftHealth(snap);
  if (!items.length && !hz.quakes.length) throw new Error('every source failed; refusing to publish an empty snapshot');
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'monitor.json'), JSON.stringify(snap));
  await writeFile(path.join(OUT, 'monitor-history.json'), JSON.stringify(history));
  const ah = snap.aircraft_health;
  log(`wrote ${items.length} items (${stories.length} stories), history ${history.t.length} h × ${Object.keys(history.c).length} countries, aircraft ${ah.ok ? 'ok' : 'ISSUES'} (mil ${ah.mil} adsb ${ah.adsb} emerg ${ah.emerg}), in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const i of ah.issues) log(`  aircraft [${i.severity}] ${i.id}: ${i.msg}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
