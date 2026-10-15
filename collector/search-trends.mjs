// Google Search Trends watch — daily trending searches, filtered for AI.
//
// Watched, not scored. Google Trends has no official keyless interest-over-time
// API that stays stable; the public Trending Now RSS does answer without a
// key. Wikipedia pageviews (attention pillar) remain the longer-horizon proxy
// for search curiosity. This collector exists so SIREN can see when AI head
// terms spike in Google's daily firehose and act on findability before the
// spike cools — without inventing a Trends score that would rebase the index.
//
// Writes data/search-trends.json and appends one line a day to
// data/search-trends-history.ndjson.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fetchText } from './fetch.mjs';

const OUT = 'data/search-trends.json';
const HIST = 'data/search-trends-history.ndjson';

/** Geos to poll. US is the densest English firehose; GB catches UK wording. */
export const GEOS = Object.freeze([
  { id: 'US', label: 'United States', url: 'https://trends.google.com/trending/rss?geo=US' },
  { id: 'GB', label: 'United Kingdom', url: 'https://trends.google.com/trending/rss?geo=GB' },
]);

/**
 * Frozen head terms we watch for findability. Adding or removing a term does
 * not rebase the SIREN index (this file is unscored), but it does change which
 * spikes the page highlights — keep the list short and honest.
 */
export const HEAD_TERMS = Object.freeze([
  { id: 'ai-prediction-markets', label: 'AI prediction markets', re: /\bai\s+prediction\s+markets?\b/i, path: '/ai-prediction-markets.html' },
  { id: 'ai-doom', label: 'AI doom', re: /\bai\s+doom\b|\bdoom\s*(?:bench|index|score)\b/i, path: '/guide.html' },
  { id: 'ai-doomsday-clock', label: 'AI doomsday clock', re: /\bai\s+doomsday\s+clock\b|\bdoomsday\s+clock\b.*\bai\b|\bai\b.*\bdoomsday\s+clock\b/i, path: '/ai-doomsday-clock.html' },
  { id: 'p-doom', label: 'p(doom)', re: /\bp\(?doom\)?\b|\bprobability of doom\b/i, path: '/p-doom.html' },
  { id: 'best-ai-model', label: 'best AI model', re: /\bbest\s+ai\s+model\b|\bwhich\s+(?:company|lab).{0,20}best\s+ai\b/i, path: '/race.html' },
  { id: 'agi', label: 'AGI', re: /\bagi\b|\bartificial\s+general\s+intelligence\b/i, path: '/si-watch.html' },
  { id: 'polymarket-ai', label: 'Polymarket AI', re: /\bpolymarket\b.*\bai\b|\bai\b.*\bpolymarket\b/i, path: '/race.html' },
  { id: 'chatgpt', label: 'ChatGPT', re: /\bchatgpt\b|\bgpt[\s-]?\d/i, path: '/lab/openai.html' },
  // FINDABILITY #162 — “openai lawsuit” / FTC / state-suit Trends → gated lab
  // (story counts of scored coverage only; not legal advice).
  { id: 'openai-lawsuit', label: 'OpenAI lawsuit / FTC', re: /\bopenai\b.{0,40}\b(?:lawsuit|lawsuits|sued|sues|suing|ftc|probe|probes)\b|\b(?:lawsuit|lawsuits|ftc|probe|probes)\b.{0,40}\bopenai\b|\bstates?\s+sue(?:s|d)?\s+openai\b|\bchatgpt\b.{0,40}\b(?:lawsuit|lawsuits|sued|sues)\b/i, path: '/lab/openai.html' },
  { id: 'claude', label: 'Claude', re: /\bclaude\b|\banthropic\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #163 — “anthropic ipo” / FTC probe Trends → gated Claude lab
  // (story counts only; not IPO advice or legal advice).
  { id: 'anthropic-ipo', label: 'Anthropic IPO / FTC', re: /\banthropic\b.{0,40}\b(?:ipo|ftc|lawsuit|lawsuits|probe|probes|subpoena)\b|\b(?:ipo|ftc|lawsuit|lawsuits|probe|probes|subpoena)\b.{0,40}\banthropic\b|\bclaude\b.{0,40}\b(?:ipo|ftc|lawsuit|lawsuits)\b/i, path: '/lab/anthropic.html' },
  { id: 'gemini', label: 'Gemini', re: /\bgemini\b|\bgoogle\s+deepmind\b/i, path: '/lab/google-deepmind.html' },
  // FINDABILITY #137 — "mu" Trends spikes arrive with Micron / AI memory-chip
  // headlines; route to the existing gated /lab/micron.html (not a doorway).
  // FINDABILITY #151 — "dram stock" / "hbm stock" / "memory stock" / "micron
  // stock" co-move on the same AI memory-chip tape; still one gated lab URL.
  { id: 'micron', label: 'Micron / MU', re: /\bmicron(?:\s+stock)?\b|\bmu\s+stock\b|\b(?:dram|hbm|memory)\s+stock\b|\bmemory[\s-]?chip\b.*\b(?:micron|mu)\b/i, path: '/lab/micron.html' },
  // FINDABILITY #152 — "iren stock" Trends spikes arrive with neocloud /
  // CoreWeave / AI-cloud power headlines; route to gated /watts.html (substrate
  // instrument), not a company doorway or stock tip.
  { id: 'iren', label: 'IREN / AI cloud power', re: /\biren(?:\s+stock)?\b|\biris\s+energy\b/i, path: '/watts.html' },
  // FINDABILITY #155/#160 — "coreweave stock" / debt / bond Trends → gated lab
  // (story counts only; co-moves with neocloud / AI-cloud debt tape).
  { id: 'coreweave', label: 'CoreWeave', re: /\bcoreweave(?:\s+(?:stock|debt|bond|bonds|borrowing))?\b/i, path: '/lab/coreweave.html' },
  // FINDABILITY #161 — "nvidia stock" / NVDA / AI funding-cost Trends → gated lab
  // (story counts only; co-moves with CoreWeave / neocloud debt tape).
  { id: 'nvidia', label: 'Nvidia / NVDA', re: /\bnvidia(?:\s+stock)?\b|\bnvda(?:\s+stock)?\b/i, path: '/lab/nvidia.html' },
  // FINDABILITY #164 — “asml” / ASML stock / EUV AI-chip-tool Trends → gated lab
  // (story counts only; not a stock tip).
  { id: 'asml', label: 'ASML', re: /\basml(?:\s+stock)?\b|\beuv\b.{0,40}\basml\b|\basml\b.{0,40}\b(?:euv|chipmaking|chip-making)\b/i, path: '/lab/asml.html' },
  // FINDABILITY #157 — "neocloud" / neoclouds Trends (Gartner survival tape)
  // → gated /tags/neoclouds.html (story counts only, not a vendor ranking).
  { id: 'neocloud', label: 'Neoclouds', re: /\bneoclouds?\b/i, path: '/tags/neoclouds.html' },
  { id: 'siren', label: 'SIREN / siren.watch', re: /\bsiren\.watch\b|\bsiren\s+(?:index|watch|ai)\b|\bdoomcon\b/i, path: '/' },
]);

/** Broad AI filter for the daily firehose (title + news headlines). */
export const AI_QUERY_RE = /\b(?:ai|a\.i\.|artificial\s+intelligence|chatgpt|gpt[\s-]?\d|openai|anthropic|claude|gemini|deepmind|deepseek|llm|large\s+language\s+model|machine\s+learning|generative\s+ai|agi|superintelligence|neural\s+net|midjourney|stable\s+diffusion|copilot|cursor\s+ai|xai|grok)\b/i;

const ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
});

export function decodeXml(s) {
  return String(s || '').replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, name) => {
    if (Object.hasOwn(ENTITIES, name.toLowerCase())) return ENTITIES[name.toLowerCase()];
    if (name.startsWith('#x') || name.startsWith('#X')) {
      const n = parseInt(name.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    if (name.startsWith('#')) {
      const n = parseInt(name.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return m;
  });
}

/** Parse `20000+` / `500+` into a sortable number; null when absent. */
export function parseTraffic(raw) {
  const m = /^([\d,]+)\+?$/.exec(String(raw || '').trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Minimal RSS item parser for Google's trending feed. Avoids pulling an XML
 * library (Node built-ins only). Returns [] on empty / unparseable input.
 */
export function parseTrendsRss(xml) {
  const body = String(xml || '');
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(body))) {
    const block = m[1];
    const title = decodeXml((/<title>([^<]*)<\/title>/i.exec(block) || [])[1] || '').trim();
    if (!title || title === 'Daily Search Trends') continue;
    const trafficRaw = ((/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/i.exec(block) || [])[1] || '').trim();
    const pub = ((/<pubDate>([^<]*)<\/pubDate>/i.exec(block) || [])[1] || '').trim();
    const news = [];
    const newsRe = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/gi;
    let nm;
    while ((nm = newsRe.exec(block))) {
      const nb = nm[1];
      const nt = decodeXml((/<ht:news_item_title>([^<]*)<\/ht:news_item_title>/i.exec(nb) || [])[1] || '').trim();
      const nu = decodeXml((/<ht:news_item_url>([^<]*)<\/ht:news_item_url>/i.exec(nb) || [])[1] || '').trim();
      const ns = decodeXml((/<ht:news_item_source>([^<]*)<\/ht:news_item_source>/i.exec(nb) || [])[1] || '').trim();
      if (nt || nu) news.push({ title: nt || null, url: nu || null, source: ns || null });
    }
    const hay = [title, ...news.map((n) => n.title)].filter(Boolean).join(' · ');
    items.push({
      title,
      traffic_raw: trafficRaw || null,
      traffic: parseTraffic(trafficRaw),
      published_at: pub ? new Date(pub).toISOString() : null,
      ai_related: AI_QUERY_RE.test(hay),
      news: news.slice(0, 3),
    });
  }
  return items;
}

/** Which HEAD_TERMS match this trend title (and its news headlines). */
export function matchHeadTerms(item) {
  const hay = [item.title, ...(item.news || []).map((n) => n.title)].filter(Boolean).join(' · ');
  return HEAD_TERMS.filter((t) => t.re.test(hay)).map((t) => t.id);
}

export function summariseGeo(geoId, items) {
  const ai = items.filter((it) => it.ai_related);
  const hits = {};
  for (const it of items) {
    for (const id of matchHeadTerms(it)) {
      hits[id] = hits[id] || [];
      hits[id].push(it.title);
    }
  }
  return {
    geo: geoId,
    total: items.length,
    ai_related: ai.length,
    items: items.map((it) => ({
      ...it,
      head_terms: matchHeadTerms(it),
    })),
    head_term_hits: Object.fromEntries(
      HEAD_TERMS.map((t) => [t.id, hits[t.id] ? { hit: true, titles: hits[t.id] } : { hit: false, titles: [] }]),
    ),
  };
}

async function fetchGeo(geo, fetchTextFn) {
  try {
    const xml = await fetchTextFn(geo.url);
    const items = parseTrendsRss(xml);
    if (items.length === 0) {
      return { ok: false, geo: geo.id, label: geo.label, error: 'empty or unparseable RSS', ...summariseGeo(geo.id, []) };
    }
    return { ok: true, geo: geo.id, label: geo.label, error: null, ...summariseGeo(geo.id, items) };
  } catch (e) {
    return {
      ok: false,
      geo: geo.id,
      label: geo.label,
      error: e && e.message ? e.message : String(e),
      ...summariseGeo(geo.id, []),
    };
  }
}

function dayKey(iso) {
  return String(iso || '').slice(0, 10);
}

function appendHistory(snapshot) {
  const day = dayKey(snapshot.generated_at);
  const line = JSON.stringify({
    generated_at: snapshot.generated_at,
    ai_related: snapshot.ai_related_total,
    head_hits: snapshot.head_terms.filter((t) => t.trending).map((t) => t.id),
    geos_ok: snapshot.geos.filter((g) => g.ok).map((g) => g.geo),
  });
  if (existsSync(HIST)) {
    const lines = readFileSync(HIST, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length) {
      try {
        const last = JSON.parse(lines[lines.length - 1]);
        if (dayKey(last.generated_at) === day) {
          // Replace today's line so hourly runs do not balloon the file.
          lines[lines.length - 1] = line;
          writeFileSync(HIST, `${lines.join('\n')}\n`);
          return;
        }
      } catch { /* fall through and append */ }
    }
  }
  appendFileSync(HIST, `${line}\n`);
}

export async function collect({ fetchTextFn = fetchText } = {}) {
  const geos = [];
  for (const g of GEOS) {
    geos.push(await fetchGeo(g, fetchTextFn));
  }

  const mergedAi = [];
  const seen = new Set();
  for (const g of geos) {
    for (const it of g.items || []) {
      if (!it.ai_related) continue;
      const key = it.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      mergedAi.push({ ...it, geo: g.geo });
    }
  }
  mergedAi.sort((a, b) => (b.traffic || 0) - (a.traffic || 0));

  const head_terms = HEAD_TERMS.map((t) => {
    const titles = [];
    for (const g of geos) {
      const hit = g.head_term_hits && g.head_term_hits[t.id];
      if (hit && hit.hit) titles.push(...hit.titles.map((title) => ({ geo: g.geo, title })));
    }
    return {
      id: t.id,
      label: t.label,
      path: t.path,
      trending: titles.length > 0,
      titles,
    };
  });

  const anyOk = geos.some((g) => g.ok);
  return {
    schema: 1,
    generated_at: new Date().toISOString(),
    ok: anyOk,
    source: 'Google Trends Trending Now RSS',
    source_url: 'https://trends.google.com/trending/rss',
    note: 'Watched, not scored. Daily trending searches only — not interest-over-time. Wikipedia pageviews remain the attention-pillar proxy for longer search curiosity.',
    geos,
    ai_related_total: mergedAi.length,
    ai_trends: mergedAi.slice(0, 40),
    head_terms,
  };
}

async function main() {
  const snap = await collect();
  writeFileSync(OUT, `${JSON.stringify(snap, null, 2)}\n`);
  try { appendHistory(snap); } catch (e) { console.log(`search-trends history append failed: ${e.message}`); }
  const aiN = snap.ai_related_total;
  const hits = snap.head_terms.filter((t) => t.trending).map((t) => t.id);
  console.log(`search-trends: ${snap.geos.filter((g) => g.ok).length}/${snap.geos.length} geos ok · ${aiN} AI-related · head hits [${hits.join(', ') || 'none'}]`);
}

if (process.argv[1] && process.argv[1].endsWith('search-trends.mjs')) {
  main().catch((e) => { console.log(`search-trends failed: ${e.message}`); process.exitCode = 1; });
}
