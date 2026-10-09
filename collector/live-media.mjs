// collector/live-media.mjs — AI on TV and radio, for /live.html.
//
// Three shelves, three costs:
//
//   live   LIVE NOW. One YouTube Data API v3 search.list call (eventType=live)
//          for broadcasts about AI. search.list costs 100 units of the
//          project's 10,000-unit daily quota, which elon/collect.mjs already
//          draws on (six trend searches every 4 h, about 3,600 units a day,
//          plus a few dozen units of videos.list). So this runs in the FULL
//          lane only and at most once every 55 minutes, gated on the stamp in
//          data/live-media.json: 24 calls x 100 = 2,400 units a day at most,
//          which leaves the two collectors together near 6,000. A day ledger
//          (live.quota) also caps it at MAX_UNITS_PER_DAY however often the
//          lane is dispatched by hand. No key, no call: the shelf says so.
//   tv     AI ON TV. Free: YouTube's public per-channel Atom feeds for the big
//          news and business channels, filtered to AI headlines from the last
//          72 hours. Cheap enough for the 15-minute news lane.
//   radio  AI TALK RADIO. Free: public podcast RSS feeds with audio
//          enclosures. Shows publish a few times a week, so the full lane
//          (hourly) is plenty.
//
// Presentation only: nothing here is scored or feeds the index. Every source
// fails dark on its own; a shelf whose every source failed keeps the previous
// run's items rather than going blank. Exit 0 always, writing whatever it has.
//
// Usage:  node collector/live-media.mjs            (full: live + tv + radio)
//         node collector/live-media.mjs --lane news (tv only)
// Writes data/live-media.json and prints ::notice lines with per-source counts.

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchJson, fetchAll } from './fetch.mjs';
import { decodeEntities, toPlainText } from './news-sources/_feed.mjs';
import { publicError } from './safe-error.mjs';

const OUT = new URL('../data/live-media.json', import.meta.url);

// Unquoted on purpose: the quoted-phrase form ('"artificial intelligence" |
// "AI news" | …') came back with zero live results on 2026-10-09 22:32 UTC.
// If the primary query still finds nothing, one broader fallback search runs
// in the same pass (another 100 units, still inside MAX_UNITS_PER_DAY).
export const LIVE_QUERY = 'artificial intelligence|AI news|OpenAI|Anthropic|Nvidia AI';
export const LIVE_FALLBACK_QUERY = 'AI news live';
export const LIVE_EVERY_MS = 55 * 60 * 1000;
export const MAX_UNITS_PER_DAY = 2500;
const SEARCH_COST = 100;
export const TV_HOURS = 72;
export const TV_MAX = 24;
export const RADIO_MAX = 30;
export const RADIO_PER_SHOW = 3;

// ── What counts as "about AI" ───────────────────────────────────────────────
// Headline vocabulary, not a classifier. Names that are also ordinary words
// (Claude, Gemini) only count next to an AI word or a company, so a horoscope
// or an actor does not sneak in.
const AI_CORE = /\b(AI|A\.I\.|AGI|ASI|artificial intelligence|superintelligen\w*|machine learning|deep ?learning|neural net\w*|LLMs?|large language models?|generative|gen ?AI|chat ?bots?|deep ?fakes?|data ?cent(?:er|re)s?|robots?|robotics|humanoids?|automation|OpenAI|ChatGPT|GPT-?\d[\w.]*|Anthropic|DeepMind|Nvidia|xAI|Grok|Copilot|Perplexity|Mistral|Llama)\b/i;
const AI_PEOPLE = /\b(Altman|Amodei|Hassabis|Jensen Huang|Sutskever|Hinton|LeCun|Karpathy)\b/i;
const AI_AMBIGUOUS = /\b(Claude|Gemini)\b/i;
const AI_CONTEXT = /\b(Anthropic|Google|model|chatbot|AI)\b/i;

export function isAiTitle(text) {
  const t = String(text || '');
  if (AI_CORE.test(t) || AI_PEOPLE.test(t)) return true;
  return AI_AMBIGUOUS.test(t) && AI_CONTEXT.test(t.replace(AI_AMBIGUOUS, ''));
}

// ── Junk: what a live search for "AI" mostly returns ────────────────────────
// Round-the-clock generated music, "AI art" loops, and crypto giveaway scams
// wearing a CEO's face. MUSIC_JUNK applies to everyone (a news channel's lofi
// side-stream is still not AI talk); SCAM_JUNK only to channels not on the
// allowlist, because Bloomberg covering bitcoin is not a scam.
const MUSIC_JUNK = /\b(lo-?fi|chill ?hop|beats to|music|songs?|playlist|radio 24|asmr|sleep|study with me|relax\w*|ambient|meditation|ai (?:art|girls?|covers?|generated|animation|cartoons?|anime|vtuber)|vtuber|karaoke|gaming|gameplay|minecraft|fortnite)\b/i;
const SCAM_JUNK = /\b(giveaway|airdrop|presale|double your|free (?:btc|eth|crypto|money)|claim (?:now|your)|crypto|bitcoin|btc|eth|xrp|doge(?:coin)?|solana|memecoin|casino|betting|signals?|forex|trading bot|24\s*\/\s*7|non-?stop|elon musk live|tesla live)\b/i;

// Reputable news and tech channels. Matched on the channel id (from the
// verified lists below) or on the exact channel title, normalised.
export const ALLOW_NAMES = [
  'Bloomberg Television', 'Bloomberg Technology', 'Bloomberg Originals', 'Bloomberg Podcasts', 'Bloomberg',
  'CNBC', 'CNBC Television', 'CNBC International TV', 'CNBC International', 'Yahoo Finance', 'Reuters',
  'Sky News', 'ABC News', 'NBC News', 'CBS News', 'DW News', 'Al Jazeera English', 'BBC News', 'CNN',
  'PBS NewsHour', 'Associated Press', 'Fox Business', 'Fox News', 'LiveNOW from FOX', 'Wall Street Journal',
  'The Wall Street Journal', 'Financial Times', 'New York Times', 'The New York Times', '60 Minutes', 'C-SPAN',
  'Forbes', 'Fortune Magazine', 'TechCrunch', 'WIRED', 'The Verge', 'TBPN', 'a16z', 'Y Combinator',
  'Lex Fridman', 'Dwarkesh Patel', 'All-In Podcast', 'No Priors', '20VC', 'Big Think', 'TED',
  'Machine Learning Street Talk', 'OpenAI', 'Anthropic', 'Google DeepMind', 'NVIDIA', 'Microsoft', 'Google',
  'AI at Meta', 'Stanford GSB', 'Stanford', 'MIT', 'Computerphile', 'Two Minute Papers', 'AI Explained',
];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const ALLOW_NORM = new Set(ALLOW_NAMES.map(norm));

// ── AI ON TV: news and business channels with public upload feeds ───────────
// verified: the id came back from YouTube's own channels.list forHandle lookup
// in elon/collect.mjs (data branch elon-data, clips.json, 2026-10-09).
// verified: false — from memory, not yet confirmed; a wrong id is a 404 that
// shows up in this collector's ::notice line and the source goes dark alone.
export const TV_CHANNELS = [
  { id: 'UCrp_UI8XtuYfpiqluWLD7Lw', name: 'CNBC Television', verified: true },
  { id: 'UCvJJ_dzjViJCoLf5uKUTwoA', name: 'CNBC', verified: true },
  // UCdK2BueKxC9VxXh7e1Ne4oQ (what the @handle lookup returned) serves an
  // empty feed (run 37999713211); this is Bloomberg's main TV channel id.
  { id: 'UCIALMKvObZNtJ6AmdCLP7Lg', name: 'Bloomberg Television', verified: false },
  { id: 'UCEAZeUIeJs0IjQiqTCdVSIg', name: 'Yahoo Finance', verified: false },
  { id: 'UCupvZG-5ko_eiXAupbDfxWw', name: 'CNN', verified: true },
  { id: 'UC16niRr50-MSBwiO3YDb3RA', name: 'BBC News', verified: true },
  { id: 'UCoMdktPbSTixAyNGwb-UYkQ', name: 'Sky News', verified: true },
  { id: 'UCCXoCcu9Rp7NPbTzIvogpZg', name: 'Fox Business', verified: false },
  { id: 'UC8p1vwvWtl6T73JiExfWs1g', name: 'CBS News', verified: true },
  { id: 'UCeY0bbntWzzVIaj2z3QigXg', name: 'NBC News', verified: false },
  { id: 'UCBi2mrWuNuyYy4gbM6fU18Q', name: 'ABC News', verified: false },
  { id: 'UC6ZFN9Tx6xh-skXCuRHCDpQ', name: 'PBS NewsHour', verified: true },
  { id: 'UCsN32BtMd0IoByjJRNF12cw', name: '60 Minutes', verified: true },
  { id: 'UChqUTb7kYRX8-EiaN3XFrSQ', name: 'Reuters', verified: true },
  { id: 'UC52X5wxOL_s5yw0dQk7NtgA', name: 'Associated Press', verified: true },
  { id: 'UCNye-wNBqNL5ZzHSJj3l8Bg', name: 'Al Jazeera English', verified: false },
  { id: 'UCknLrEdhRCp1aegoMqRaCZg', name: 'DW News', verified: false },
  { id: 'UCK7tptUDHh-RYDsdxO1-5QQ', name: 'Wall Street Journal', verified: true },
  { id: 'UCoUxsWakJucWg46KW5RsvPw', name: 'Financial Times', verified: false },
  { id: 'UCqnbDFdCpuN8CMEg0VuEBqA', name: 'New York Times', verified: true },
  { id: 'UCvQECJukTDE2i6aCoMnS-Vg', name: 'Big Think', verified: true },
  { id: 'UCAuUUnT6oDeKwE6v1NGQxug', name: 'TED', verified: true },
];
const ALLOW_IDS = new Set([
  ...TV_CHANNELS.map((c) => c.id),
  'UCSHZKyawb77ixDdsGog4iWA', // Lex Fridman
  'UCXl4i9dYBrFOabk0xGmbkRA', // Dwarkesh Patel
  'UCESLZhusAkFfsNsApnjF_Cg', // All-In Podcast
  'UC9cn0TuPq4dnbTY-CBsm8XA', // a16z
  'UCcefcZRL2oaA_uBNeo5UOWg', // Y Combinator
  'UCSI7h9hydQ40K5MJHnCrQvw', // No Priors
  'UCf0PBRjhf0rF8fWBIxTuoWA', // 20VC
  'UCMLtBahI5DMrt0NPvDSoIRQ', // Machine Learning Street Talk
  'UCXZCJLdBC09xxGZ6gcdrc6A', // OpenAI
  'UCrDwWp7EBBv4NwvScIpBDOA', // Anthropic
  'UCP7jMXSY2xbc3KCAE0MHQ-A', // Google DeepMind
  'UCHuiy8bXnmK5nisYHUd1J5g', // NVIDIA
  'UCFtEEv80fQVKkD4h1PF-Xqw', // Microsoft
  'UCK8sQmJBp8GCxrOtXWBpyEA', // Google
  'UC5qxlwEKM7-5YZudb24l0bg', // AI at Meta
]);

export function isAllowlisted(channelTitle, channelId) {
  return ALLOW_IDS.has(String(channelId || '')) || ALLOW_NORM.has(norm(channelTitle));
}

// Round-the-clock news streams. No API call: each links to the channel's
// /live URL, which YouTube points at whatever that channel is streaming now.
export const NEWS_247 = [
  { id: 'UCIALMKvObZNtJ6AmdCLP7Lg', name: 'Bloomberg Television', blurb: 'Markets and business, with the AI trade most days.' },
  { id: 'UCoMdktPbSTixAyNGwb-UYkQ', name: 'Sky News', blurb: 'UK and world news, live around the clock.' },
  { id: 'UCBi2mrWuNuyYy4gbM6fU18Q', name: 'ABC News Live', blurb: 'US news, streaming 24/7.' },
  { id: 'UCknLrEdhRCp1aegoMqRaCZg', name: 'DW News', blurb: 'Germany’s international broadcaster, in English.' },
  { id: 'UCNye-wNBqNL5ZzHSJj3l8Bg', name: 'Al Jazeera English', blurb: 'World news from Doha, live.' },
  { id: 'UC8p1vwvWtl6T73JiExfWs1g', name: 'CBS News 24/7', blurb: 'US news, streaming around the clock.' },
].map((c) => ({ ...c, url: `https://www.youtube.com/channel/${c.id}/live` }));

// ── AI TALK RADIO: podcast feeds ────────────────────────────────────────────
// `urls` are tried in order; the first that parses with audio AND whose own
// <title> matches `title` wins, so a feed id that points at some other show
// fails dark instead of filling AI radio with politics (that happened: the
// megaphone id first tried for Last Week in AI was a UK politics show). ai:
// true keeps only episodes whose title is about AI (general-interest shows).
// verified: true — fetched and title-checked from a GitHub runner 2026-10-09.
export const PODCASTS = [
  { id: 'ai-daily-brief', show: 'The AI Daily Brief', title: /ai (daily brief|breakdown)/i, urls: ['https://anchor.fm/s/f7cac464/podcast/rss'], verified: true },
  { id: 'hard-fork', show: 'Hard Fork', title: /hard fork/i, urls: ['https://feeds.simplecast.com/l2i9YnTd'], ai: true, verified: true },
  { id: 'last-week-in-ai', show: 'Last Week in AI', title: /last week in ai/i, urls: ['https://lastweekin.ai/feed', 'https://api.substack.com/feed/podcast/1047011.rss'], verified: false },
  { id: 'latent-space', show: 'Latent Space', title: /latent space/i, urls: ['https://api.substack.com/feed/podcast/1084089.rss', 'https://www.latent.space/feed'], verified: true },
  { id: 'cognitive-revolution', show: 'The Cognitive Revolution', title: /cognitive revolution/i, urls: ['https://feeds.megaphone.fm/RINTP3108857801'], verified: true },
  { id: 'dwarkesh', show: 'Dwarkesh Podcast', title: /dwarkesh/i, urls: ['https://api.substack.com/feed/podcast/69345.rss', 'https://www.dwarkesh.com/feed'], verified: true },
  { id: 'lex-fridman', show: 'Lex Fridman Podcast', title: /lex fridman/i, urls: ['https://lexfridman.com/feed/podcast/'], ai: true, verified: true },
  { id: 'practical-ai', show: 'Practical AI', title: /practical ai/i, urls: ['https://changelog.com/practicalai/feed'], verified: true },
  { id: 'eye-on-ai', show: 'Eye on AI', title: /eye on a\.?i/i, urls: ['https://aneyeonai.libsyn.com/rss'], verified: true },
  { id: 'twiml', show: 'The TWIML AI Podcast', title: /twiml|this week in machine learning/i, urls: ['https://feeds.megaphone.fm/MLN2155636147'], verified: true },
];

// ── Parsers ─────────────────────────────────────────────────────────────────
const VID = /^[\w-]{11}$/;
const thumbOf = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const watchOf = (id) => `https://www.youtube.com/watch?v=${id}`;
const iso = (s) => { const ms = Date.parse(String(s || '').trim()); return Number.isFinite(ms) ? new Date(ms).toISOString() : null; };
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** search.list JSON -> live items, in the order YouTube ranked them. */
export function parseLiveSearch(json) {
  const out = [];
  const seen = new Set();
  for (const it of (json && Array.isArray(json.items) ? json.items : [])) {
    const id = it && it.id && it.id.videoId;
    const sn = (it && it.snippet) || {};
    if (!VID.test(id || '') || seen.has(id)) continue;
    if (sn.liveBroadcastContent && sn.liveBroadcastContent !== 'live') continue;
    seen.add(id);
    const title = clip(decodeEntities(String(sn.title || '')).replace(/\s+/g, ' ').trim(), 200);
    if (!title) continue;
    const channel = decodeEntities(String(sn.channelTitle || '')).trim().slice(0, 80);
    const channel_id = String(sn.channelId || '');
    out.push({
      id, title, channel, channel_id,
      description: clip(decodeEntities(String(sn.description || '')).replace(/\s+/g, ' ').trim(), 300),
      started_at: iso(sn.publishedAt),
      thumb: thumbOf(id), url: watchOf(id),
      allow: isAllowlisted(channel, channel_id),
    });
  }
  return out;
}

/** Keep real AI talk, allowlisted channels first, YouTube's order within each. */
export function pickLive(items, max = 15) {
  const keep = (items || []).filter((v) => {
    const words = `${v.title} ${v.channel}`;
    if (MUSIC_JUNK.test(words)) return false;
    if (v.allow) return isAiTitle(`${v.title} ${v.description || ''}`);
    if (SCAM_JUNK.test(`${words} ${v.description || ''}`)) return false;
    return isAiTitle(v.title) || isAiTitle(v.channel) && /\bnews\b/i.test(v.title);
  });
  return [...keep.filter((v) => v.allow), ...keep.filter((v) => !v.allow)].slice(0, max).map(({ description, ...v }) => v);
}

/** A channel's videos.xml (Atom) -> uploads. */
export function parseYouTubeFeed(xml, channel = {}) {
  const out = [];
  const body = String(xml || '');
  const feedName = toPlainText((body.match(/<feed\b[\s\S]*?<title>([\s\S]*?)<\/title>/i) || [])[1] || '', 80);
  for (const m of body.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) {
    const b = m[1];
    const id = ((b.match(/<yt:videoId>\s*([\w-]{11})\s*<\/yt:videoId>/i) || [])[1]) || '';
    if (!VID.test(id)) continue;
    const title = toPlainText((b.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '', 200);
    if (!title) continue;
    const published_at = iso((b.match(/<published>([\s\S]*?)<\/published>/i) || [])[1]);
    const views = Number((b.match(/<media:statistics\b[^>]*\bviews="(\d+)"/i) || [])[1]);
    const author = toPlainText((b.match(/<author>\s*<name>([\s\S]*?)<\/name>/i) || [])[1] || '', 80);
    out.push({
      id, title, published_at,
      channel: channel.name || author || feedName,
      channel_id: channel.id || ((b.match(/<yt:channelId>\s*(UC[\w-]{22})\s*<\/yt:channelId>/i) || [])[1]) || '',
      thumb: thumbOf(id), url: watchOf(id),
      ...(Number.isFinite(views) ? { views } : {}),
      shorts: /#shorts\b/i.test(title),
    });
  }
  return out;
}

/** AI uploads from the last `hours`, newest first, de-duplicated, capped. */
export function pickSegments(videos, { now = Date.now(), hours = TV_HOURS, max = TV_MAX } = {}) {
  const since = now - hours * 3600e3;
  const seen = new Set();
  return (videos || [])
    .filter((v) => v && v.published_at && Date.parse(v.published_at) >= since && Date.parse(v.published_at) <= now + 3600e3)
    .filter((v) => isAiTitle(v.title))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
    .slice(0, max)
    .map(({ shorts, ...v }) => v);
}

/** "1:02:03", "62:03", "3723" -> seconds. */
export function parseDuration(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s) || null;
  const parts = s.split(':').map((x) => Number(x));
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((a, n) => a * 60 + n, 0) || null;
}

const attr = (tag, name) => decodeEntities(((tag || '').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i')) || [])[1] || '').trim();
const httpsUrl = (u) => {
  const s = String(u || '').trim().replace(/^http:\/\//i, 'https://');
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
};

/** A podcast RSS feed -> episodes with audio, newest first. */
export function parsePodcastFeed(xml, show = {}) {
  const body = String(xml || '');
  const head = body.split(/<item\b/i)[0] || '';
  const showImage = httpsUrl(attr((head.match(/<itunes:image\b[^>]*>/i) || [])[0], 'href'))
    || httpsUrl(toPlainText((head.match(/<image\b[^>]*>[\s\S]*?<url>([\s\S]*?)<\/url>/i) || [])[1] || '', 500));
  const feedTitle = toPlainText((head.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '', 80);
  if (show.title && !show.title.test(feedTitle)) return [];
  const showName = show.show || feedTitle;
  const out = [];
  for (const m of body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    const enc = (b.match(/<enclosure\b[^>]*>/i) || [])[0] || '';
    const type = attr(enc, 'type');
    const audio = httpsUrl(attr(enc, 'url'));
    if (!audio || (type && !/^audio\//i.test(type)) || (!type && !/\.(mp3|m4a|aac|ogg|opus)(\?|$)/i.test(audio))) continue;
    const title = toPlainText((b.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '', 200);
    if (!title) continue;
    const published_at = iso(toPlainText((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '', 80));
    const link = httpsUrl(toPlainText((b.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '', 500));
    const image = httpsUrl(attr((b.match(/<itunes:image\b[^>]*>/i) || [])[0], 'href')) || showImage;
    out.push({
      title, show: showName, show_id: show.id || '', published_at,
      duration: parseDuration(toPlainText((b.match(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/i) || [])[1] || '', 20)),
      audio, link: link || '', image: image || '',
    });
  }
  return out.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Latest episodes across shows: a few per show, newest first. */
export function pickEpisodes(lists, { max = RADIO_MAX, perShow = RADIO_PER_SHOW, now = Date.now() } = {}) {
  const all = [];
  for (const { show, episodes } of lists || []) {
    const eps = (episodes || []).filter((e) => e.published_at && Date.parse(e.published_at) <= now + 3600e3 && (!show.ai || isAiTitle(e.title)));
    all.push(...eps.slice(0, perShow));
  }
  const seen = new Set();
  return all.sort((a, b) => b.published_at.localeCompare(a.published_at))
    .filter((e) => (seen.has(e.audio) ? false : (seen.add(e.audio), true)))
    .slice(0, max);
}

// ── Runner ──────────────────────────────────────────────────────────────────
// Errors are published in api/live-media.json: no key, no query strings.
const safe = (err) => publicError(String((err && err.message) || err || '').replace(/key=[^&\s]+/gi, 'key=[redacted]'))
  .replace(/https?:\/\/([^/\s?]+)[^\s|]*/g, '$1').slice(0, 160);
const notice = (msg) => console.log(`::notice title=live-media::${msg.replace(/[\r\n]+/g, ' ')}`);

export function fingerprint(doc) {
  const ids = [...((doc.live && doc.live.items) || []).map((v) => v.id), '|', ...((doc.tv && doc.tv.items) || []).map((v) => v.id), '|', ...((doc.radio && doc.radio.items) || []).map((e) => e.audio)];
  let h = 2166136261;
  for (const ch of ids.join(',')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}

async function refreshLive(prev, key, now) {
  const p = prev || {};
  const day = new Date(now).toISOString().slice(0, 10);
  const quota = p.quota && p.quota.day === day ? { ...p.quota } : { day, units: 0 };
  const keepPrev = (status, extra = {}) => ({ ...p, items: p.items || [], status, quota, ...extra });
  if (!key) return keepPrev('no-key', { items: [], note: 'YOUTUBE_API_KEY not set; LIVE NOW is off' });
  const age = now - Date.parse(p.fetched_at || 0);
  if (Number.isFinite(age) && age < LIVE_EVERY_MS) return keepPrev(p.status || 'ok', { skipped: `searched ${Math.round(age / 60000)} min ago` });
  if (quota.units + SEARCH_COST > MAX_UNITS_PER_DAY) return keepPrev(p.status || 'ok', { skipped: `daily cap of ${MAX_UNITS_PER_DAY} units reached` });
  const search = async (q) => {
    quota.units += SEARCH_COST;
    const json = await fetchJson('https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video'
      + `&q=${encodeURIComponent(q)}&maxResults=15&relevanceLanguage=en&safeSearch=strict&key=${encodeURIComponent(key)}`, { timeoutMs: 15000, retries: 0 });
    return { raw: parseLiveSearch(json), total: Number(json && json.pageInfo && json.pageInfo.totalResults) || 0 };
  };
  try {
    let query = LIVE_QUERY;
    let { raw, total } = await search(query);
    if (!raw.length && quota.units + SEARCH_COST <= MAX_UNITS_PER_DAY) {
      query = LIVE_FALLBACK_QUERY;
      ({ raw, total } = await search(query));
    }
    const items = pickLive(raw);
    return { fetched_at: new Date(now).toISOString(), status: 'ok', query, seen: raw.length, total_results: total, items, quota };
  } catch (err) {
    // A failed search still spent its units. Keep last hour's list only while
    // it is fresh; a stream list two hours old is mostly finished streams.
    const fresh = Number.isFinite(age) && age < 2 * 3600e3;
    return { ...p, fetched_at: new Date(now).toISOString(), status: 'error', error: safe(err), items: fresh ? p.items || [] : [], quota };
  }
}

async function refreshTv(prev, now) {
  const res = await fetchAll(TV_CHANNELS.map((c) => ({ key: c.id, url: `https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`, parse: 'text', timeoutMs: 12000, retries: 1 })), { concurrency: 8 });
  const sources = []; const videos = [];
  res.forEach((r, i) => {
    const c = TV_CHANNELS[i];
    if (!r.ok) { sources.push({ id: c.id, name: c.name, ok: false, error: safe(r.error) }); return; }
    const vids = parseYouTubeFeed(r.value, c);
    if (!vids.length) { sources.push({ id: c.id, name: c.name, ok: false, error: 'feed had no entries' }); return; }
    const ai = pickSegments(vids, { now, max: 99 });
    sources.push({ id: c.id, name: c.name, ok: true, entries: vids.length, ai: ai.length });
    videos.push(...vids);
  });
  const ok = sources.filter((s) => s.ok).length;
  if (!ok && prev && Array.isArray(prev.items)) return { ...prev, sources, status: 'dark', items: pickSegments(prev.items, { now }) };
  return { fetched_at: new Date(now).toISOString(), status: ok ? 'ok' : 'dark', sources, items: pickSegments(videos, { now }) };
}

async function refreshRadio(prev, now) {
  const sources = []; const lists = [];
  await Promise.all(PODCASTS.map(async (show) => {
    const errs = [];
    for (const url of show.urls) {
      const [r] = await fetchAll([{ url, parse: 'text', timeoutMs: 15000, retries: 1, headers: { accept: 'application/rss+xml, application/xml, text/xml, */*' } }]);
      if (!r.ok) { errs.push(safe(r.error)); continue; }
      const episodes = parsePodcastFeed(r.value, show);
      if (!episodes.length) {
        const t = toPlainText(((r.value || '').split(/<item\b/i)[0].match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '', 60);
        errs.push(show.title && t && !show.title.test(t) ? `${new URL(url).hostname}: feed is "${t}", not this show` : `${new URL(url).hostname}: no audio episodes`);
        continue;
      }
      lists.push({ show, episodes });
      sources.push({ id: show.id, show: show.show, ok: true, url, episodes: episodes.length, latest: episodes[0].published_at });
      return;
    }
    sources.push({ id: show.id, show: show.show, ok: false, error: errs.join(' | ').slice(0, 300) });
  }));
  sources.sort((a, b) => PODCASTS.findIndex((p) => p.id === a.id) - PODCASTS.findIndex((p) => p.id === b.id));
  if (!lists.length && prev && Array.isArray(prev.items)) return { ...prev, sources, status: 'dark' };
  return { fetched_at: new Date(now).toISOString(), status: lists.length ? 'ok' : 'dark', sources, items: pickEpisodes(lists, { now }) };
}

export async function run({ lane = 'full', key = process.env.YOUTUBE_API_KEY || '', now = Date.now(), out = OUT } = {}) {
  let prev = {};
  try { prev = JSON.parse(await readFile(out, 'utf8')); } catch { prev = {}; }
  const doc = { schema: 1, generated_at: new Date(now).toISOString(), live: prev.live || { status: 'never', items: [] }, tv: prev.tv || { status: 'never', items: [] }, radio: prev.radio || { status: 'never', items: [] }, news_247: NEWS_247 };
  if (lane === 'full') doc.live = await refreshLive(prev.live, String(key).trim(), now);
  doc.tv = await refreshTv(prev.tv, now);
  if (lane === 'full' || !prev.radio) doc.radio = await refreshRadio(prev.radio, now);
  doc.fingerprint = fingerprint(doc);
  await writeFile(out, `${JSON.stringify(doc, null, 2)}\n`);

  const l = doc.live;
  notice(`lane=${lane} live=${l.items.length} (${l.status}${l.skipped ? `, ${l.skipped}` : ''}${l.error ? `: ${l.error}` : ''}; seen ${l.seen ?? '-'}; quota today ${l.quota ? l.quota.units : 0} units) tv=${doc.tv.items.length} radio=${doc.radio.items.length} fp=${doc.fingerprint}`);
  notice(`tv sources: ${doc.tv.sources.map((s) => `${s.name}=${s.ok ? `${s.entries}/${s.ai}ai` : `DARK(${s.error})`}`).join('; ')}`);
  if (doc.radio.sources) notice(`radio sources: ${doc.radio.sources.map((s) => `${s.show}=${s.ok ? s.episodes : `DARK(${s.error})`}`).join('; ')}`);
  return doc;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--lane');
  const lane = i > 0 ? process.argv[i + 1] : 'full';
  run({ lane }).catch((err) => { console.log(`::warning title=live-media::${safe(err)}`); process.exitCode = 0; });
}
