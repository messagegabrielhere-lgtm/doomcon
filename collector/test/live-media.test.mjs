import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, readFileSync as rf } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  parseLiveSearch, pickLive, isAiTitle, isAllowlisted, parseYouTubeFeed, pickSegments,
  parsePodcastFeed, pickEpisodes, parseDuration, run, TV_CHANNELS, NEWS_247,
} from '../live-media.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/live-media/${f}`, import.meta.url), 'utf8');
const NOW = Date.parse('2026-10-09T18:00:00Z');

test('YouTube live search: parses, decodes, de-duplicates, drops non-live and non-video results', () => {
  const items = parseLiveSearch(JSON.parse(fx('yt-search.json')));
  assert.deepEqual(items.map((v) => v.id), ['aaaaaaaaaa1', 'aaaaaaaaaa2', 'aaaaaaaaaa3', 'aaaaaaaaaa4', 'aaaaaaaaaa5', 'aaaaaaaaaa6']);
  const v3 = items.find((v) => v.id === 'aaaaaaaaaa3');
  assert.equal(v3.title, "OpenAI DevDay keynote watch party 'live'");
  assert.equal(v3.url, 'https://www.youtube.com/watch?v=aaaaaaaaaa3');
  assert.equal(v3.thumb, 'https://i.ytimg.com/vi/aaaaaaaaaa3/mqdefault.jpg');
  assert.equal(v3.allow, false);
  assert.equal(items.find((v) => v.id === 'aaaaaaaaaa4').allow, true, 'allowlisted by channel id');
  assert.equal(items.find((v) => v.id === 'aaaaaaaaaa5').allow, true, 'allowlisted by channel name');
  assert.deepEqual(parseLiveSearch(null), []);
  assert.deepEqual(parseLiveSearch({ error: { code: 403 } }), []);
});

test('YouTube live junk filter: no lofi, no giveaway scams, no gaming; allowlisted first', () => {
  const picked = pickLive(parseLiveSearch(JSON.parse(fx('yt-search.json'))));
  assert.deepEqual(picked.map((v) => v.id), ['aaaaaaaaaa4', 'aaaaaaaaaa5', 'aaaaaaaaaa3']);
  assert.ok(picked.every((v) => !('description' in v)), 'description is used for filtering, not stored');
  assert.equal(pickLive([]).length, 0);
});

test('isAiTitle: AI vocabulary, people, and ambiguous names only in context', () => {
  for (const t of ['The AI trade', 'Artificial intelligence and jobs', 'OpenAI ships GPT-6', 'Altman on compute', 'Deepfake laws', 'New data center in Texas', 'Anthropic’s Claude gets memory'])
    assert.ok(isAiTitle(t), t);
  for (const t of ['Fed holds rates', 'Gemini horoscope for October', 'Claude Monet retrospective opens', 'Said the chair', 'Maine election results'])
    assert.ok(!isAiTitle(t), t);
  assert.ok(isAiTitle("Google's Gemini model beats rivals"));
});

test('isAllowlisted: by id or by normalised channel title', () => {
  assert.ok(isAllowlisted('anything', 'UCrp_UI8XtuYfpiqluWLD7Lw'));
  assert.ok(isAllowlisted('Al Jazeera English', ''));
  assert.ok(isAllowlisted('y combinator', ''));
  assert.ok(!isAllowlisted('AI News 24/7 Live', 'UCfake'));
});

test('YouTube channel RSS: parses Atom entries, skips bad ids, keeps views', () => {
  const vids = parseYouTubeFeed(fx('yt-feed.xml'), { id: 'UCrp_UI8XtuYfpiqluWLD7Lw', name: 'CNBC Television' });
  assert.equal(vids.length, 6);
  assert.deepEqual(vids[0], {
    id: 'bbbbbbbbbb1', title: 'Nvidia CEO Jensen Huang on the AI buildout & data centers', published_at: '2026-10-09T15:00:00.000Z',
    channel: 'CNBC Television', channel_id: 'UCrp_UI8XtuYfpiqluWLD7Lw', thumb: 'https://i.ytimg.com/vi/bbbbbbbbbb1/mqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=bbbbbbbbbb1', views: 12345, shorts: false,
  });
  // channel name falls back to the feed's own author
  assert.equal(parseYouTubeFeed(fx('yt-feed.xml'))[0].channel, 'CNBC Television');
  assert.deepEqual(parseYouTubeFeed('<html>not a feed</html>'), []);
});

test('YouTube channel RSS AI filter: last 72 h, AI headlines only, newest first, capped', () => {
  const vids = parseYouTubeFeed(fx('yt-feed.xml'), { id: 'UCx', name: 'X' });
  const seg = pickSegments(vids, { now: NOW });
  assert.deepEqual(seg.map((v) => v.id), ['bbbbbbbbbb1', 'bbbbbbbbbb6', 'bbbbbbbbbb3']);
  assert.ok(seg.every((v) => !('shorts' in v)));
  assert.equal(pickSegments(vids, { now: NOW, max: 1 }).length, 1);
  assert.equal(pickSegments([...vids, ...vids], { now: NOW }).length, 3, 'de-duplicated');
});

test('podcast RSS: audio enclosures only, https, durations, images, newest first', () => {
  const eps = parsePodcastFeed(fx('podcast.xml'), { id: 'ex', show: 'Example AI Show' });
  assert.deepEqual(eps.map((e) => e.title), ['Agents, evals & the road to AGI', 'Gardening with my grandmother', 'Older: what Claude and Anthropic shipped']);
  assert.deepEqual(eps[0], {
    title: 'Agents, evals & the road to AGI', show: 'Example AI Show', show_id: 'ex', published_at: '2026-10-09T10:00:00.000Z',
    duration: 3723, audio: 'https://cdn.example.com/ep3.mp3?x=1&y=2', link: 'https://example.com/ep/3', image: 'https://example.com/ep3.jpg',
  });
  assert.equal(eps[1].audio, 'https://cdn.example.com/ep2.m4a', 'http enclosure upgraded to https');
  assert.equal(eps[1].image, 'https://example.com/show.jpg', 'falls back to the show artwork');
  assert.equal(eps[1].duration, 2723);
  assert.equal(eps[2].duration, 2730);
  assert.equal(parsePodcastFeed(fx('podcast.xml')).at(0).show, 'Example AI Show', 'show name from the feed');
  assert.deepEqual(parsePodcastFeed(''), []);
});

test('parseDuration handles the shapes feeds use', () => {
  assert.equal(parseDuration('1:02:03'), 3723);
  assert.equal(parseDuration('62:03'), 3723);
  assert.equal(parseDuration('3723'), 3723);
  assert.equal(parseDuration(''), null);
  assert.equal(parseDuration('about an hour'), null);
});

test('pickEpisodes: AI filter for general shows, per-show cap, newest first', () => {
  const eps = parsePodcastFeed(fx('podcast.xml'), { id: 'ex', show: 'Example AI Show' });
  const general = { id: 'gen', show: 'General', ai: true };
  const ai = { id: 'ai', show: 'AI' };
  assert.deepEqual(pickEpisodes([{ show: general, episodes: eps }], { now: NOW }).map((e) => e.title), ['Agents, evals & the road to AGI', 'Older: what Claude and Anthropic shipped']);
  assert.equal(pickEpisodes([{ show: ai, episodes: eps }], { now: NOW, perShow: 2 }).length, 2);
  assert.equal(pickEpisodes([{ show: ai, episodes: eps }, { show: ai, episodes: eps }], { now: NOW }).length, 3, 'same audio once');
});

test('channel lists are well-formed and unique', () => {
  const ids = TV_CHANNELS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of [...TV_CHANNELS, ...NEWS_247]) assert.match(c.id, /^UC[\w-]{22}$/, c.name);
  for (const c of NEWS_247) assert.equal(c.url, `https://www.youtube.com/channel/${c.id}/live`);
});

test('run() offline: every source dark, still writes a file, keeps the previous shelves, never calls search without a key', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'live-media-'));
  const out = pathToFileURL(path.join(dir, 'live-media.json'));
  const prevTv = { fetched_at: '2026-10-09T17:00:00Z', status: 'ok', items: [{ id: 'bbbbbbbbbb1', title: 'AI segment', published_at: '2026-10-09T15:00:00Z' }] };
  writeFileSync(out, JSON.stringify({ schema: 1, tv: prevTv, radio: { status: 'ok', items: [{ audio: 'https://x/a.mp3', title: 't', published_at: '2026-10-09T10:00:00Z' }] } }));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  const log = console.log; console.log = () => {};
  try {
    const doc = await run({ lane: 'full', key: '', now: NOW, out });
    assert.equal(doc.live.status, 'no-key');
    assert.equal(doc.live.items.length, 0);
    assert.equal(doc.tv.status, 'dark');
    assert.equal(doc.tv.items.length, 1, 'previous TV items kept while every feed is dark');
    assert.equal(doc.radio.items.length, 1, 'previous radio kept');
    const saved = JSON.parse(rf(out, 'utf8'));
    assert.equal(saved.fingerprint, doc.fingerprint);
    assert.ok(Array.isArray(saved.news_247) && saved.news_247.length >= 5);
  } finally { globalThis.fetch = realFetch; console.log = log; }
});

test('run() with a key: one search an hour, quota counted, key never published', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'live-media-'));
  const out = pathToFileURL(path.join(dir, 'live-media.json'));
  const realFetch = globalThis.fetch;
  let searches = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/youtube/v3/search')) { searches++; return new Response(JSON.stringify({ error: { message: 'quotaExceeded' } }), { status: 403 }); }
    throw new TypeError('fetch failed');
  };
  const log = console.log; console.log = () => {};
  try {
    const key = 'AIzaSyTESTTESTTESTTESTTESTTESTTEST123';
    const a = await run({ lane: 'full', key, now: NOW, out });
    assert.equal(searches, 1);
    assert.equal(a.live.status, 'error');
    assert.equal(a.live.quota.units, 100);
    assert.ok(!rf(out, 'utf8').includes(key), 'API key not in the published file');
    const b = await run({ lane: 'full', key, now: NOW + 10 * 60e3, out });
    assert.equal(searches, 1, 'second run inside the hour does not search');
    assert.match(b.live.skipped, /min ago/);
    await run({ lane: 'news', key, now: NOW + 70 * 60e3, out });
    assert.equal(searches, 1, 'news lane never searches');
    await run({ lane: 'full', key, now: NOW + 70 * 60e3, out });
    assert.equal(searches, 2);
  } finally { globalThis.fetch = realFetch; console.log = log; }
});

test('podcast RSS title guard: a feed that is some other show yields nothing', () => {
  assert.equal(parsePodcastFeed(fx('podcast.xml'), { id: 'x', show: 'Last Week in AI', title: /last week in ai/i }).length, 0);
  assert.equal(parsePodcastFeed(fx('podcast.xml'), { id: 'x', show: 'Example', title: /example ai show/i }).length, 3);
});

test('run(): an empty primary live search falls back once, inside the day cap', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'live-media-'));
  const out = pathToFileURL(path.join(dir, 'live-media.json'));
  const realFetch = globalThis.fetch;
  const queries = [];
  const hit = JSON.parse(fx('yt-search.json'));
  globalThis.fetch = async (url) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith('/youtube/v3/search')) {
      queries.push(u.searchParams.get('q'));
      return new Response(JSON.stringify(queries.length === 1 ? { pageInfo: { totalResults: 0 }, items: [] } : hit), { status: 200 });
    }
    throw new TypeError('fetch failed');
  };
  const log = console.log; console.log = () => {};
  try {
    const doc = await run({ lane: 'full', key: 'k', now: NOW, out });
    assert.equal(queries.length, 2);
    assert.equal(doc.live.query, queries[1]);
    assert.equal(doc.live.quota.units, 200);
    assert.deepEqual(doc.live.items.map((v) => v.id), ['aaaaaaaaaa4', 'aaaaaaaaaa5', 'aaaaaaaaaa3']);
  } finally { globalThis.fetch = realFetch; console.log = log; }
});
