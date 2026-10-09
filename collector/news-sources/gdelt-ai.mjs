// GDELT DOC 2.0 — AI articles from thousands of outlets, refreshed every 15 min.
//
// Free and keyless. GDELT crawls a very wide set of newsrooms worldwide and
// exposes the last 30 minutes of matching articles as JSON. It is a FIREHOSE:
// most of what matches "artificial intelligence" is a local paper's column, so
// only articles whose HEADLINE names a frontier lab or model family are kept
// (extractEntities over the title). That is a filter on what the article is
// about, not on who wrote it.
//
// THE TIMESTAMP IS GDELT'S, NOT THE OUTLET'S. GDELT publishes `seendate`, the
// moment its crawler saw the article; it does not carry the outlet's own
// publish time. So a "how fast is SIREN" number for this source measures
// GDELT-saw-it to SIREN-saw-it, and meta.time_basis says so.
//
// GDELT asks for no more than one request every five seconds and answers
// abuse with plain-text errors under HTTP 200. One request per pass, every
// five minutes, and a non-JSON body is a dark source with the text quoted.

import { draft } from './_feed.mjs';
import { extractEntities } from './_entities.mjs';
import { registrableDomain } from './_outlets.mjs';

export const QUERY = '("artificial intelligence" OR OpenAI OR Anthropic OR "Google DeepMind" OR ChatGPT OR Gemini OR Claude) sourcelang:english';
const PER_RUN_MAX = 25;

export function endpoint() {
  const params = new URLSearchParams({
    query: QUERY,
    mode: 'artlist',
    maxrecords: '75',
    format: 'json',
    timespan: '30min',
    sort: 'datedesc',
  });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
}

/** "20261009T211500Z" -> ISO, or null. */
export function parseSeenDate(s) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(String(s ?? ''));
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Parse a DOC 2.0 artlist body (already JSON). Pure; exported for tests. */
export function parseArtlist(body, { nowMs = Date.now() } = {}) {
  if (!body || typeof body !== 'object') throw new Error('gdelt-ai: body is not a JSON object');
  // An empty result is `{}` — no articles key at all. That is a quiet half
  // hour, not a broken parser.
  if (!('articles' in body)) return [];
  if (!Array.isArray(body.articles)) throw new Error('gdelt-ai: articles is not an array — shape changed');

  const seen = new Set();
  const out = [];
  for (const a of body.articles) {
    if (!a || typeof a.url !== 'string' || !/^https?:\/\//i.test(a.url)) continue;
    const title = typeof a.title === 'string' ? a.title.replace(/\s+/g, ' ').trim() : '';
    if (title.length < 15) continue;
    const at = parseSeenDate(a.seendate);
    if (!at || Date.parse(at) > nowMs + 10 * 60_000) continue;
    if (a.language && !/^english$/i.test(a.language)) continue;
    if (extractEntities(title).length === 0) continue;
    // Syndicated copies share a headline; the first one is enough.
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const domain = registrableDomain(a.domain || a.url);
    out.push(draft({
      source: 'gdelt-ai',
      kind: 'press',
      title,
      summary: `${domain ?? 'An outlet'} · surfaced by GDELT${a.sourcecountry ? ` (${a.sourcecountry})` : ''}.`,
      url: a.url,
      published_at: at,
      defaultPillar: 'attention',
      meta: { outlet_domain: domain, time_basis: 'gdelt_seendate', gdelt_query: QUERY },
    }));
    if (out.length >= PER_RUN_MAX) break;
  }
  return out;
}

export default {
  id: 'gdelt-ai',
  kind: 'press',
  label: 'GDELT — AI headlines across thousands of outlets',
  weight: 0.45,
  minIntervalMs: 300_000,
  maxItems: 60,
  async collect(fetchText, _fetchJson, { wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
    // GDELT's floor is one request per five seconds PER IP, and Actions
    // runners share IPs with strangers, so a first 429 is often someone
    // else's. One retry after its stated interval; a second 429 is dark.
    let text;
    try {
      text = await fetchText(endpoint(), { retries: 0, timeoutMs: 8_000 });
    } catch (err) {
      if (err?.status !== 429) throw err;
      await wait(6_000);
      text = await fetchText(endpoint(), { retries: 0, timeoutMs: 8_000 });
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`gdelt-ai: non-JSON answer — ${String(text).replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    return parseArtlist(body);
  },
};
