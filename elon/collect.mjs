// Clip index for the Real Elon page (site/static/elon.html).
//
// The page only lists videos uploaded by the channels in elon/sources.json:
// Elon Musk's own companies and outlets that filmed him themselves. A clip found
// here is real because of WHERE it was uploaded, not because of what it looks
// like, which is the one test a deepfake can't pass.
//
// Each run:
//   1. loads the previous clips.json (the archive grows; a video seen once stays)
//   2. resolves each @handle to a channel id (cached in clips.json after the first run)
//   3. reads each channel's RSS feed (its latest 15 uploads; no key needed)
//   4. if YOUTUBE_API_KEY is set, searches each channel once for older Elon
//      videos (100 quota units per channel, done once per channel, ever)
//   5. keeps the uploads that name him, merges, writes <outdir>/clips.json
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

/** Channel page HTML -> channel id, or null. */
export function channelIdFromPage(html) {
  const m = String(html).match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)
    || String(html).match(/"externalId":"(UC[\w-]{22})"/)
    || String(html).match(/"channelId":"(UC[\w-]{22})"/);
  return m ? m[1] : null;
}

/** Previous clips + fresh clips -> one list, newest first, deduped by video id. */
export function merge(prevClips, fresh, now = new Date().toISOString()) {
  const byId = new Map((prevClips || []).map((c) => [c.id, c]));
  for (const c of fresh) {
    const old = byId.get(c.id);
    byId.set(c.id, old
      ? { ...old, ...c, firstSeen: old.firstSeen, views: c.views ?? old.views, description: c.description || old.description }
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

async function searchChannel(channelId, key) {
  const out = [];
  let pageToken = '';
  for (let page = 0; page < 2; page++) {
    const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&order=relevance`
      + `&q=${encodeURIComponent('Elon Musk')}&channelId=${channelId}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`;
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
    const row = { handle: src.handle, name: src.name, tier: src.tier, channelId: old?.channelId || null, backfilled: !!old?.backfilled, ok: false, found: 0 };
    try {
      row.channelId ||= await resolveHandle(src.handle, key);
      if (!row.channelId) throw new Error('handle did not resolve to a channel');
      let videos = parseFeed(await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${row.channelId}`));
      if (key && !row.backfilled) {
        try {
          videos = videos.concat(await searchChannel(row.channelId, key));
          row.backfilled = true;
        } catch (err) { row.backfillError = err.message; }
      }
      const seen = new Set();
      for (const v of videos) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        const match = matchElon(v, src.tier);
        if (!match) continue;
        fresh.push({
          id: v.id, title: v.title, published: v.published,
          description: v.description.slice(0, 400), views: v.views,
          handle: src.handle, channel: src.name, channelId: row.channelId, tier: src.tier, match,
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
  const kept = (prev?.clips || []).filter((c) => {
    const tier = tierOf.get(c.handle.toLowerCase());
    return tier && matchElon(c, tier);
  });
  const clips = merge(kept, fresh, now);

  if (!report.some((r) => r.ok)) {
    console.error('Every source failed; not publishing.');
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'clips.json'), JSON.stringify({ generated: now, sources: report, clips }) + '\n');
  console.log(`${clips.length} clips in the index (${fresh.length} seen this run).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
