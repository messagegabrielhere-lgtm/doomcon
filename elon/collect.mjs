// Clip index for the Real Clips page (site/static/elon.html): Elon Musk and
// superintelligence (TOPICS below).
//
// The page only lists videos uploaded by the channels in elon/sources.json:
// Elon Musk's own companies, the AI labs, and the hosts and newsrooms that
// filmed their own footage. A clip found here is real because of WHERE it was
// uploaded, not because of what it looks like, which is the one test a
// deepfake can't pass.
//
// Each run:
//   1. loads the previous clips.json (the archive grows; a video seen once stays)
//   2. resolves each @handle to a channel id (cached in clips.json after the first run)
//   3. reads each channel's RSS feed (its latest 15 uploads; no key needed)
//   4. searches each channel once for older Elon videos: through the Data API
//      when YOUTUBE_API_KEY is set (about 200 quota units per channel, once),
//      otherwise by reading the channel's own search results page
//   5. keeps the uploads that match a topic, merges, writes <outdir>/clips.json
//
// Browsers can't read YouTube feeds (no CORS), so this runs in a GitHub Action
// and the page reads the result from the elon-data branch, like the scanner.
//
// Usage: node elon/collect.mjs <outdir> [previous clips.json URL or path]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PREV_DEFAULT = 'https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon/elon-data/clips.json';
const MAX_CLIPS = 6000;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

// Names him: "Elon", "Musk", "Musk's". Not "muskrat", not "Elongated".
const NAME_RE = /\b(elon|musk)(?:'s|’s)?\b/i;
// Events his companies hold where he is the presenter, so an official upload
// titled "Tesla Shareholder Meeting" counts even without his name in it.
const EVENT_RE = /\b(shareholder meeting|annual meeting|earnings call|ai day|battery day|autonomy day|we,? robot|starship update|neuralink update|show and tell|summer update|grok \d)\b/i;
// Superintelligence, superintelligent, super-intelligence, "Safe Superintelligence".
// Not bare "ASI": too many other things share those three letters.
const SI_RE = /\bsuper[\s-]?intelligen(?:ce|t)\b/i;

const decode = (s) => String(s ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]).trim() : '';
};
const attr = (xml, name, a) => {
  const m = xml.match(new RegExp(`<${name}\\s[^>]*\\b${a}="([^"]*)"`));
  return m ? decode(m[1]) : '';
};

/** YouTube channel Atom feed -> [{ id, title, published, description, views }] */
export function parseFeed(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: tag(e, 'yt:videoId'),
    title: tag(e, 'title'),
    published: tag(e, 'published'),
    description: tag(e, 'media:description'),
    views: Number(attr(e, 'media:statistics', 'views')) || null,
  })).filter((v) => /^[\w-]{11}$/.test(v.id));
}

/**
 * 'name' when the video names him, 'event' for an official event he presents,
 * else null. Only his companies' descriptions count: an interview or news
 * description that mentions him in passing (a timestamp, a related-video
 * link) is not a clip of him, so there the title has to name him.
 */
export function matchElon(video, tier) {
  if (NAME_RE.test(video.title)) return 'name';
  if (tier === 'official' && NAME_RE.test(video.description)) return 'name';
  if (tier === 'official' && EVENT_RE.test(video.title)) return 'event';
  return null;
}

/**
 * Superintelligence: the title must say it, except on an AI lab's or his
 * companies' own channel, where the description saying it is enough.
 */
export function matchSI(video, tier) {
  if (SI_RE.test(video.title)) return true;
  return (tier === 'official' || tier === 'lab') && SI_RE.test(video.description);
}

/** The topics this index covers. `query` is what each channel is searched for once. */
export const TOPICS = {
  elon: { query: 'Elon Musk', match: (v, tier) => !!matchElon(v, tier) },
  si: { query: 'superintelligence', match: matchSI },
};

/** Video -> the topics it belongs to, in TOPICS order. */
export function topicsFor(video, tier) {
  return Object.keys(TOPICS).filter((t) => TOPICS[t].match(video, tier));
}

/** Channel page HTML -> channel id, or null. */
export function channelIdFromPage(html) {
  const m = String(html).match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)
    || String(html).match(/"externalId":"(UC[\w-]{22})"/)
    || String(html).match(/"channelId":"(UC[\w-]{22})"/);
  return m ? m[1] : null;
}

const UNIT_MS = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 };

/** "Streamed 3 years ago" -> an approximate ISO date, or '' if unreadable. */
export function relativeToIso(text, now = Date.now()) {
  const m = String(text || '').match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  return m ? new Date(now - Number(m[1]) * UNIT_MS[m[2].toLowerCase()]).toISOString() : '';
}

const runsText = (t) => (t ? t.simpleText ?? (t.runs || []).map((r) => r.text).join('') : '');

/**
 * A channel's own search results page (youtube.com/channel/<id>/search?query=)
 * -> { parsed, videos }. `parsed` is false when the page carried no
 * ytInitialData at all (a consent wall, a layout change), so the caller can
 * tell "searched and found nothing" from "could not read the page".
 * Dates on this page are relative ("3 years ago"), so they are approximate
 * and marked; a later RSS sighting of the same video replaces them.
 */
export function parseChannelSearch(html, now = Date.now()) {
  const m = String(html).match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)
    || String(html).match(/window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/);
  if (!m) return { parsed: false, videos: [] };
  let data;
  try { data = JSON.parse(m[1]); } catch { return { parsed: false, videos: [] }; }
  const videos = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    const v = o.videoRenderer;
    if (v && /^[\w-]{11}$/.test(v.videoId || '')) {
      videos.push({
        id: v.videoId,
        title: runsText(v.title),
        // publishedTimeText when the page has it; otherwise the age is still in
        // the accessibility label ("… by Tesla 10 years ago 4 minutes …").
        published: relativeToIso(runsText(v.publishedTimeText), now) || relativeToIso(JSON.stringify(v), now),
        approxDate: true,
        description: (v.detailedMetadataSnippets || []).map((d) => runsText(d.snippetText)).join(' ') || runsText(v.descriptionSnippet),
        views: Number(runsText(v.viewCountText).replace(/[^\d]/g, '')) || null,
      });
    }
    for (const k in o) if (k !== 'videoRenderer') walk(o[k]);
  };
  walk(data);
  return { parsed: true, videos };
}

/** Watch page HTML -> exact ISO upload date, or ''. */
export function uploadDateFromWatchPage(html) {
  const m = String(html).match(/<meta itemprop="(?:uploadDate|datePublished)" content="([^"]+)"/)
    || String(html).match(/"(?:publishDate|uploadDate)":"([^"]+)"/);
  if (!m) return '';
  const d = new Date(m[1]);
  return isNaN(d) ? '' : d.toISOString();
}

// Clips from a channel's search page arrive without a usable date. Each run
// reads the watch pages of up to this many of them and stores the exact
// upload date, so the backlog clears over a few hourly runs.
const DATE_BUDGET = 250;

// Returns { dated, tried, outcomes } so the published file says why dating
// failed: the Action's logs are not always readable, clips.json is.
async function dateClips(clips) {
  const todo = clips.filter((c) => c.approxDate || !c.published).slice(0, DATE_BUDGET);
  const tried = todo.length;
  const outcomes = {};
  const note = (k) => { outcomes[k] = (outcomes[k] || 0) + 1; };
  let dated = 0;
  let sample = '';
  const work = async () => {
    for (let c; (c = todo.shift());) {
      try {
        const html = await get(`https://www.youtube.com/watch?v=${c.id}`);
        const iso = uploadDateFromWatchPage(html);
        if (iso) { c.published = iso; delete c.approxDate; dated++; note('ok'); }
        else {
          note(/confirm you.re not a bot/i.test(html) ? 'bot-check' : /consent\.youtube|before you continue/i.test(html) ? 'consent' : 'no-date-in-page');
          sample ||= (html.match(/<title>([^<]*)<\/title>/) || [])[1] || html.slice(0, 120);
        }
      } catch (err) { note(err.status ? `HTTP ${err.status}` : err.name || 'error'); }
      await new Promise((r) => setTimeout(r, 400));
    }
  };
  await Promise.all(Array.from({ length: 2 }, work));
  return { dated, tried, outcomes, ...(sample ? { sample: sample.slice(0, 160) } : {}) };
}

/** Previous clips + fresh clips -> one list, newest first, deduped by video id. */
export function merge(prevClips, fresh, now = new Date().toISOString()) {
  const byId = new Map((prevClips || []).map((c) => [c.id, c]));
  for (const c of fresh) {
    const old = byId.get(c.id);
    byId.set(c.id, old
      ? { ...old, ...c, firstSeen: old.firstSeen, views: c.views ?? old.views, description: c.description || old.description,
          // An exact date (RSS, API) always wins over an approximate one (search page).
          ...(c.approxDate && !old.approxDate ? { published: old.published, approxDate: undefined } : {}),
          ...(!c.approxDate ? { approxDate: undefined } : {}) }
      : { ...c, firstSeen: now });
  }
  return [...byId.values()]
    .sort((a, b) => String(b.published).localeCompare(String(a.published)))
    .slice(0, MAX_CLIPS);
}

async function get(url, { json = false } = {}) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  return json ? res.json() : res.text();
}

async function loadPrevious(src) {
  try {
    const text = /^https?:/.test(src) ? await get(src) : existsSync(src) ? await readFile(src, 'utf8') : null;
    if (text == null) return null;
    return JSON.parse(text);
  } catch (err) {
    // No archive yet is fine. Any other failure must stop the run: publishing
    // without the archive would wipe every clip collected so far.
    if (err.status === 404) return null;
    throw new Error(`could not load the previous clips.json (${err.message}); refusing to publish over it`);
  }
}

async function resolveHandle(handle, key) {
  if (key) {
    const u = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`;
    const j = await get(u, { json: true });
    if (j.items?.[0]?.id) return j.items[0].id;
  }
  return channelIdFromPage(await get(`https://www.youtube.com/${handle}`));
}

// One page of 50 per topic per channel: 100 quota units each, so with two
// topics and ~30 channels a full backfill stays well inside the free 10,000.
async function searchChannel(channelId, key, query) {
  const out = [];
  let pageToken = '';
  for (let page = 0; page < 1; page++) {
    const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&order=relevance`
      + `&q=${encodeURIComponent(query)}&channelId=${channelId}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const j = await get(u, { json: true });
    for (const it of j.items || []) {
      out.push({
        id: it.id?.videoId,
        title: decode(it.snippet?.title),
        published: it.snippet?.publishedAt || '',
        description: decode(it.snippet?.description),
        views: null,
      });
    }
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return out.filter((v) => /^[\w-]{11}$/.test(v.id || ''));
}

async function main() {
  const outDir = process.argv[2] || 'elon-out';
  const prevSrc = process.argv[3] || process.env.ELON_PREV || PREV_DEFAULT;
  const key = process.env.YOUTUBE_API_KEY || '';
  const { sources } = JSON.parse(await readFile(path.join(HERE, 'sources.json'), 'utf8'));
  const prev = await loadPrevious(prevSrc);
  const prevSources = new Map((prev?.sources || []).map((s) => [s.handle.toLowerCase(), s]));
  const now = new Date().toISOString();

  const fresh = [];
  const report = [];
  for (const src of sources) {
    const old = prevSources.get(src.handle.toLowerCase());
    // searched[topic] = 'api' | 'page': how that topic's one-time search was done.
    // Files written before topics existed carry backfilled/scraped for Elon only.
    // (A page search from that era found no dates, so it is not carried over: it runs again.)
    const searched = old?.searched || { ...(old?.backfilled ? { elon: 'api' } : {}) };
    const row = { handle: src.handle, name: src.name, tier: src.tier, channelId: old?.channelId || null, searched, ok: false, found: 0 };
    try {
      row.channelId ||= await resolveHandle(src.handle, key);
      if (!row.channelId) throw new Error('handle did not resolve to a channel');
      let videos = parseFeed(await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${row.channelId}`));
      for (const [topic, { query }] of Object.entries(TOPICS)) {
        try {
          if (key && row.searched[topic] !== 'api') {
            videos = videos.concat(await searchChannel(row.channelId, key, query));
            row.searched[topic] = 'api';
          } else if (!key && !row.searched[topic]) {
            // No key: read the channel's own search page once instead.
            const r = parseChannelSearch(await get(`https://www.youtube.com/channel/${row.channelId}/search?query=${encodeURIComponent(query)}`));
            if (!r.parsed) throw new Error('search page had no ytInitialData');
            videos = videos.concat(r.videos);
            row.searched[topic] = 'page';
          }
        } catch (err) { row.backfillError = `${topic}: ${err.message}`; }
      }
      const seen = new Set();
      for (const v of videos) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        const topics = topicsFor(v, src.tier);
        if (!topics.length) continue;
        const match = matchElon(v, src.tier);
        fresh.push({
          id: v.id, title: v.title, published: v.published,
          description: v.description.slice(0, 400), views: v.views, ...(v.approxDate ? { approxDate: true } : {}),
          handle: src.handle, channel: src.name, channelId: row.channelId, tier: src.tier, topics, ...(match ? { match } : {}),
        });
        row.found++;
      }
      row.ok = true;
    } catch (err) {
      row.error = err.message;
    }
    report.push(row);
    console.log(`${row.ok ? 'ok  ' : 'FAIL'} ${src.handle.padEnd(22)} ${row.ok ? `${row.found} clip(s)` : row.error}`);
  }

  // Sources that dropped out of sources.json take their clips with them, and
  // archived clips are re-checked so a tightened rule applies to the past too.
  const tierOf = new Map(sources.map((s) => [s.handle.toLowerCase(), s.tier]));
  const kept = (prev?.clips || []).flatMap((c) => {
    const tier = tierOf.get(c.handle.toLowerCase());
    const topics = tier ? topicsFor(c, tier) : [];
    if (!topics.length) return [];
    const match = matchElon(c, tier);
    const { match: _m, ...rest } = c;
    return [{ ...rest, tier, topics, ...(match ? { match } : {}) }];
  });
  let clips = merge(kept, fresh, now);
  const dating = await dateClips(clips);
  const { dated } = dating;
  if (dated) clips = merge(clips, [], now);   // re-sort now that they have dates

  if (!report.some((r) => r.ok)) {
    console.error('Every source failed; not publishing.');
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'clips.json'), JSON.stringify({ generated: now, dating, sources: report, clips }) + '\n');
  const undated = clips.filter((c) => c.approxDate || !c.published).length;
  console.log(`${clips.length} clips in the index (${fresh.length} seen this run, ${dated} dated, ${undated} still undated).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
