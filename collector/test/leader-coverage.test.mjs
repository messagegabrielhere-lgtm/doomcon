// node --test collector/test/leader-coverage.test.mjs
//
// Offline: Google News, Wikipedia and every feed are fixture strings and the
// fetcher is injected, so this never touches the network.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGoogleNews, googleNewsUrl, mergeCoverage, coverageStats, trendOf, coverageView,
  refreshCoverage, refreshProfiles, profileFrom, firstSentences, profileView, storyKey,
  COVERAGE_MIN_INTERVAL_MS,
} from '../leader-coverage.mjs';
import { assertXmlFeed, looksLikeFeed } from '../news-sources/_feed.mjs';
import { buildLeaders, cachedLeaderFeeds, leadersFingerprint, ROSTER } from '../leaders.mjs';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');
const H = 3_600_000;
const D = 24 * H;
const iso = (ms) => new Date(ms).toISOString();

const gnItem = ({ title, outlet, url, at, outletUrl = 'https://www.example.com' }) => `<item>
  <title>${title} - ${outlet}</title>
  <link>${url}</link>
  <guid isPermaLink="false">x</guid>
  <pubDate>${new Date(at).toUTCString()}</pubDate>
  <description>&lt;a href="${url}"&gt;${title}&lt;/a&gt;</description>
  <source url="${outletUrl}">${outlet}</source>
</item>`;
const gnFeed = (items) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><generator>NFE/5.0</generator><title>"Sam Altman" when:7d - Google News</title>
${items.join('\n')}
</channel></rss>`;

// ---------------------------------------------------------------------------
// Google News parser
// ---------------------------------------------------------------------------

test('googleNewsUrl quotes the phrase and appends the disambiguator unquoted', () => {
  const u = new URL(googleNewsUrl({ phrase: 'Arthur Mensch', extra: 'Mistral' }));
  assert.equal(u.hostname, 'news.google.com');
  assert.equal(u.searchParams.get('q'), '"Arthur Mensch" Mistral when:7d');
  assert.equal(u.searchParams.get('ceid'), 'US:en');
  assert.equal(new URL(googleNewsUrl({ phrase: 'Sam Altman' })).searchParams.get('q'), '"Sam Altman" when:7d');
});

test('parseGoogleNews reads title, outlet, link and date, and strips only the exact outlet suffix', () => {
  const xml = gnFeed([
    gnItem({ title: 'Sam Altman says compute is the bottleneck', outlet: 'Reuters', url: 'https://news.google.com/rss/articles/A1', at: NOW - 2 * H, outletUrl: 'https://www.reuters.com' }),
    // A headline that legitimately contains " - " before the suffix keeps it.
    gnItem({ title: 'OpenAI - the year ahead', outlet: 'The Verge', url: 'https://news.google.com/rss/articles/A2', at: NOW - 5 * H }),
    // Entities and CDATA decode.
    `<item><title><![CDATA[Altman &amp; Nadella talk “AGI” - Bloomberg]]></title><link>https://news.google.com/rss/articles/A3</link><pubDate>${new Date(NOW - 7 * H).toUTCString()}</pubDate><source url="https://www.bloomberg.com">Bloomberg</source></item>`,
  ]);
  const items = parseGoogleNews(xml);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], {
    title: 'Sam Altman says compute is the bottleneck',
    outlet: 'Reuters',
    outlet_url: 'https://www.reuters.com',
    url: 'https://news.google.com/rss/articles/A1',
    published_at: iso(NOW - 2 * H),
  });
  assert.equal(items[1].title, 'OpenAI - the year ahead');
  assert.equal(items[2].title, 'Altman & Nadella talk “AGI”');
  assert.equal(items[2].outlet, 'Bloomberg');
});

test('parseGoogleNews dedupes by url and by (title, outlet), and drops undated or linkless items', () => {
  const a = { title: 'Sam Altman on the record', outlet: 'Reuters', url: 'https://news.google.com/rss/articles/B1', at: NOW - H };
  const xml = gnFeed([
    gnItem(a),
    gnItem({ ...a, url: 'https://news.google.com/rss/articles/B2' }), // same story, new url
    gnItem({ ...a, title: 'Different story', outlet: 'AP' }), // same url
    gnItem({ ...a, title: 'Same title other outlet', outlet: 'AP', url: 'https://news.google.com/rss/articles/B3' }),
    '<item><title>No date - X</title><link>https://news.google.com/rss/articles/B4</link><source>X</source></item>',
    `<item><title>No link - X</title><pubDate>${new Date(NOW).toUTCString()}</pubDate></item>`,
  ]);
  const items = parseGoogleNews(xml);
  assert.deepEqual(items.map((i) => i.url), ['https://news.google.com/rss/articles/B1', 'https://news.google.com/rss/articles/B3']);
});

test('a title without a matching source suffix is printed whole', () => {
  const xml = gnFeed([`<item><title>Karpathy releases a course - Part 2</title><link>https://n.example/1</link><pubDate>${new Date(NOW).toUTCString()}</pubDate><source url="https://x.example">Example</source></item>`]);
  assert.equal(parseGoogleNews(xml)[0].title, 'Karpathy releases a course - Part 2');
});

// ---------------------------------------------------------------------------
// Feed sniffing (the blog.samaltman.com text/html bug)
// ---------------------------------------------------------------------------

test('assertXmlFeed accepts an Atom body served as text/html', () => {
  const atom = '<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Sam Altman</title></feed>';
  assert.equal(assertXmlFeed(atom, 'https://blog.samaltman.com/posts.atom', 'text/html; charset=utf-8'), true);
  assert.equal(looksLikeFeed(atom), true);
});

test('assertXmlFeed accepts RSS and RDF bodies behind a stylesheet PI, comment and BOM', () => {
  const rss = '﻿<?xml version="1.0"?>\n<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>\n<!-- generated -->\n<rss version="2.0"><channel/></rss>';
  assert.equal(assertXmlFeed(rss, 'u', 'text/html'), true);
  const rdf = '<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>';
  assert.equal(assertXmlFeed(rdf, 'u', 'text/html'), true);
});

test('assertXmlFeed still rejects real HTML, including XHTML that opens with <?xml', () => {
  assert.throws(() => assertXmlFeed('<!doctype html><html><head></head></html>', 'u', 'text/html'), /HTML page/);
  const xhtml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "x">\n<html xmlns="http://www.w3.org/1999/xhtml"></html>';
  assert.equal(looksLikeFeed(xhtml), false);
  assert.throws(() => assertXmlFeed(xhtml, 'u', 'text/html'), /HTML page/);
  // An HTML body with a non-HTML header is still not a feed.
  assert.throws(() => assertXmlFeed('<html><body>hi</body></html>', 'u', 'text/plain'), /does not start with/);
  // And the old text/plain-but-valid case keeps working.
  assert.equal(assertXmlFeed('<?xml version="1.0"?><rss></rss>', 'u', 'text/plain; charset=UTF-8'), true);
});

test('the leader feed fetcher now reads a text/html Atom feed as OK', async () => {
  const src = [{ id: 'samaltman-blog', label: 'blog', kind: 'personal', format: 'atom', url: 'https://blog.samaltman.com/posts.atom', leaders: ['altman'] }];
  const body = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Abundant intelligence</title><link rel="alternate" href="https://blog.samaltman.com/a"/><published>2026-10-01T00:00:00Z</published></entry></feed>`;
  const fetcher = async () => ({ data: body, headers: { 'content-type': 'text/html; charset=utf-8' } });
  const { feeds, fetched } = await cachedLeaderFeeds(src, null, { fetcher, now: () => new Date(NOW) });
  assert.equal(fetched, true);
  assert.equal(feeds['samaltman-blog'].ok, true);
  assert.equal(feeds['samaltman-blog'].entries.length, 1);
});

test('direct feeds are asked at most once per interval; force overrides', async () => {
  const src = [{ id: 's', label: 's', kind: 'personal', format: 'rss', url: 'https://x.example/feed', leaders: ['bengio'] }];
  let calls = 0;
  const fetcher = async () => { calls += 1; return { data: `<?xml version="1.0"?><rss><channel><item><title>Post</title><link>https://x.example/p</link><pubDate>${new Date(NOW - D).toUTCString()}</pubDate></item></channel></rss>`, headers: {} }; };
  const first = await cachedLeaderFeeds(src, null, { fetcher, now: () => new Date(NOW) });
  const second = await cachedLeaderFeeds(src, first.cache, { fetcher, now: () => new Date(NOW + 5 * 60_000) });
  assert.equal(calls, 1);
  assert.equal(second.fetched, false);
  assert.equal(second.feeds.s.ok, true);
  await cachedLeaderFeeds(src, first.cache, { fetcher, now: () => new Date(NOW + COVERAGE_MIN_INTERVAL_MS + 1) });
  assert.equal(calls, 2);
  await cachedLeaderFeeds(src, first.cache, { fetcher, now: () => new Date(NOW + 60_000), force: true });
  assert.equal(calls, 3);
});

// ---------------------------------------------------------------------------
// History and trend math
// ---------------------------------------------------------------------------

const story = (n, at, outlet = 'Reuters') => ({ title: `Story ${n}`, outlet, url: `https://n.example/${n}`, published_at: iso(at) });

test('mergeCoverage accumulates distinct stories across polls and keeps the newest 8 headlines', () => {
  const poll1 = [story(1, NOW - 2 * H), story(2, NOW - 30 * H), story(3, NOW - 3 * D)];
  const m1 = mergeCoverage(null, poll1, NOW);
  assert.equal(m1.seen.length, 3);
  assert.equal(m1.tracking_since, iso(NOW - 7 * D));
  // A later poll repeats story 1 and adds ten more.
  const later = NOW + H;
  const poll2 = [story(1, NOW - 2 * H), ...Array.from({ length: 10 }, (_, i) => story(100 + i, later - i * 60_000))];
  const m2 = mergeCoverage(m1, poll2, later);
  assert.equal(m2.seen.length, 13, 'story 1 counted once');
  assert.equal(m2.headlines.length, 8);
  assert.equal(m2.headlines[0].title, 'Story 100');
  assert.equal(m2.tracking_since, m1.tracking_since, 'tracking start never moves later');
});

test('mergeCoverage forgets stories older than the retention window and ignores future dates', () => {
  const m = mergeCoverage({ seen: [['old', Math.floor((NOW - 20 * D) / 60_000)], ['ok', Math.floor((NOW - 3 * D) / 60_000)]], headlines: [] },
    [story(9, NOW + 3 * D)], NOW);
  assert.deepEqual(m.seen.map((p) => p[0]), ['ok']);
});

test('coverageStats counts 24h / 7d, builds a 14-day series and nulls days before tracking began', () => {
  const m = mergeCoverage(null, [
    story(1, NOW - 1 * H), story(2, NOW - 10 * H), story(3, NOW - 30 * H), story(4, NOW - 6 * D),
  ], NOW);
  const s = coverageStats(m, NOW);
  assert.equal(s.count_24h, 2);
  assert.equal(s.count_7d, 4);
  assert.equal(s.count_prev_7d, null, 'no previous week observed yet');
  assert.equal(s.trend.baseline_complete, false);
  assert.equal(s.trend.dir, null);
  assert.equal(s.daily.length, 14);
  assert.equal(s.daily[13].day, '2026-10-09');
  assert.equal(s.daily[0].day, '2026-09-26');
  // Tracking began 7 days ago (when:7d) so the first six days are unobserved;
  // the seventh was observed in part and counts.
  assert.equal(s.daily[0].n, null);
  assert.equal(s.daily[5].n, null);
  assert.equal(s.daily[6].n, 0);
  assert.equal(s.daily.filter((d) => d.n !== null).reduce((a, d) => a + d.n, 0), 4);
});

test('a full previous week turns the trend on, with a flat band', () => {
  const minute = (ms) => Math.floor(ms / 60_000);
  const mem = {
    tracking_since: iso(NOW - 15 * D),
    seen: [
      ...Array.from({ length: 30 }, (_, i) => [`c${i}`, minute(NOW - (i % 6) * D - H)]),
      ...Array.from({ length: 10 }, (_, i) => [`p${i}`, minute(NOW - 8 * D - i * H)]),
    ],
  };
  const s = coverageStats(mem, NOW);
  assert.equal(s.count_7d, 30);
  assert.equal(s.count_prev_7d, 10);
  assert.deepEqual(s.trend, { dir: 'up', delta: 20, pct: 200, baseline_complete: true });
  assert.ok(s.daily.every((d) => d.n !== null));
});

test('trendOf: up, down, flat band and divide-by-zero', () => {
  assert.equal(trendOf(10, 10).dir, 'flat');
  assert.equal(trendOf(11, 10).dir, 'flat', '±2 floor');
  assert.equal(trendOf(110, 100).dir, 'flat', '±10%');
  assert.equal(trendOf(112, 100).dir, 'up');
  assert.equal(trendOf(5, 20).dir, 'down');
  assert.deepEqual(trendOf(4, 0), { dir: 'up', delta: 4, pct: null, baseline_complete: true });
  assert.equal(trendOf(null, 3).dir, null);
});

// ---------------------------------------------------------------------------
// Refresh: politeness and failing dark
// ---------------------------------------------------------------------------

const specs = [{ id: 'altman', phrase: 'Sam Altman' }, { id: 'hinton', phrase: 'Geoffrey Hinton' }];

test('refreshCoverage polls each person at most once per 15 minutes and fails dark per person', async () => {
  const urls = [];
  const fetcher = async (url) => {
    urls.push(url);
    if (url.includes('Hinton')) throw new Error('HTTP 503 from news.google.com');
    return { data: gnFeed([gnItem({ title: 'Sam Altman says hi', outlet: 'AP', url: 'https://n.example/1', at: NOW - H })]), headers: { 'content-type': 'application/xml' } };
  };
  const r1 = await refreshCoverage(specs, null, { fetcher, now: () => new Date(NOW) });
  assert.deepEqual(r1.polled, ['altman', 'hinton']);
  assert.equal(r1.cache.leaders.altman.error, null);
  assert.equal(r1.cache.leaders.hinton.error, 'HTTP 503 from news.google.com');
  assert.equal(r1.cache.leaders.hinton.fetched_at, null);

  const v = coverageView(specs[0], r1.cache.leaders.altman, NOW);
  assert.equal(v.state, 'ok');
  assert.equal(v.count_24h, 1);
  assert.equal(v.headlines[0].title, 'Sam Altman says hi');
  const dark = coverageView(specs[1], r1.cache.leaders.hinton, NOW);
  assert.equal(dark.state, 'dark');
  assert.equal(dark.count_7d, null, 'a dark row is null, never zero');
  assert.match(dark.error, /503/);

  // Five minutes later nobody is due.
  const r2 = await refreshCoverage(specs, r1.cache, { fetcher, now: () => new Date(NOW + 5 * 60_000) });
  assert.deepEqual(r2.polled, []);
  assert.equal(urls.length, 2);
  // Past the interval, both are asked again; a failure keeps the last good data, marked stale.
  const failAll = async () => { throw new Error('network error'); };
  const r3 = await refreshCoverage(specs, r1.cache, { fetcher: failAll, now: () => new Date(NOW + 16 * 60_000) });
  assert.deepEqual(r3.polled, ['altman', 'hinton']);
  const stale = coverageView(specs[0], r3.cache.leaders.altman, NOW + 16 * 60_000);
  assert.equal(stale.state, 'stale');
  assert.equal(stale.count_24h, 1);
  assert.equal(stale.headlines.length, 1);
});

test('a changed query starts a fresh memory', async () => {
  const fetcher = async () => ({ data: gnFeed([]), headers: {} });
  const r1 = await refreshCoverage([{ id: 'x', phrase: 'A' }], null, { fetcher, now: () => new Date(NOW) });
  r1.cache.leaders.x.seen = [['k', Math.floor((NOW - H) / 60_000)]];
  const r2 = await refreshCoverage([{ id: 'x', phrase: 'A', extra: 'AI' }], r1.cache, { fetcher, now: () => new Date(NOW + 60_000) });
  assert.deepEqual(r2.polled, ['x'], 'not gated by the old query\'s attempt');
  assert.deepEqual(r2.cache.leaders.x.seen, []);
});

test('storyKey ignores quote style and case but not the outlet', () => {
  assert.equal(storyKey({ title: 'Altman’s “plan”', outlet: 'AP' }), storyKey({ title: "altman's \"plan\"", outlet: 'ap' }));
  assert.notEqual(storyKey({ title: 'x', outlet: 'AP' }), storyKey({ title: 'x', outlet: 'Reuters' }));
});

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

test('firstSentences keeps whole sentences and does not split on initials', () => {
  assert.equal(firstSentences('Samuel H. Altman is an American entrepreneur. He is the CEO of OpenAI. He was born in 1985.'),
    'Samuel H. Altman is an American entrepreneur. He is the CEO of OpenAI.');
  assert.equal(firstSentences('One sentence only'), 'One sentence only');
  assert.equal(firstSentences('Ilya Sutskever is a computer scientist. He co-founded OpenAI. He left in 2024.'),
    'Ilya Sutskever is a computer scientist. He co-founded OpenAI.');
  assert.equal(firstSentences('He studied at the U.S. Naval Academy. He then left. Third.'),
    'He studied at the U.S. Naval Academy. He then left.');
  assert.equal(firstSentences(''), '');
});

test('profileFrom validates the REST summary and rejects disambiguation pages', () => {
  const p = profileFrom({
    type: 'standard', title: 'Demis Hassabis', description: 'British AI researcher (born 1976)',
    extract: 'Sir Demis Hassabis is a British computer scientist. He is the CEO of Google DeepMind. More text.',
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Demis_Hassabis' } },
  }, 'Demis Hassabis');
  assert.equal(p.description, 'British AI researcher (born 1976)');
  assert.equal(p.extract, 'Sir Demis Hassabis is a British computer scientist. He is the CEO of Google DeepMind.');
  assert.equal(p.url, 'https://en.wikipedia.org/wiki/Demis_Hassabis');
  assert.throws(() => profileFrom({ type: 'disambiguation', extract: 'x' }, 'X'), /disambiguation/);
});

test('refreshProfiles refreshes at most daily and keeps the last good profile through a failure', async () => {
  let calls = 0;
  const ok = async () => { calls += 1; return { type: 'standard', title: 'Geoffrey Hinton', description: 'd', extract: 'Geoffrey Hinton is a scientist.', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Geoffrey_Hinton' } } }; };
  const s = [{ id: 'hinton', title: 'Geoffrey Hinton' }];
  const c1 = await refreshProfiles(s, null, { fetcher: ok, now: () => new Date(NOW) });
  await refreshProfiles(s, c1, { fetcher: ok, now: () => new Date(NOW + 23 * H) });
  assert.equal(calls, 1);
  const fail = async () => { throw new Error('HTTP 404'); };
  const c3 = await refreshProfiles(s, c1, { fetcher: fail, now: () => new Date(NOW + 25 * H) });
  const v = profileView(s[0], c3.leaders.hinton);
  assert.equal(v.state, 'stale');
  assert.equal(v.extract, 'Geoffrey Hinton is a scientist.');
  assert.equal(profileView(s[0], null).state, 'not_checked');
});

// ---------------------------------------------------------------------------
// Coverage never becomes a statement
// ---------------------------------------------------------------------------

test('coverage is attached per leader but never puts anyone on the record', () => {
  const news = { generated_at: iso(NOW), max_items: 400, items: [] };
  const mem = mergeCoverage(null, [story(1, NOW - H)], NOW);
  const coverage = { altman: coverageView({ phrase: 'Sam Altman' }, { ...mem, fetched_at: iso(NOW), attempted_at: iso(NOW), error: null }, NOW) };
  const out = buildLeaders(news, null, { coverage, coverageMeta: { generated_at: iso(NOW), ran: true, polled: ['altman'] } });
  const a = out.leaders.find((l) => l.id === 'altman');
  assert.equal(a.state, 'no_line');
  assert.equal(a.count, 0);
  assert.equal(a.coverage.count_24h, 1);
  assert.equal(out.coverage.is_statement, false);
  assert.equal(out.coverage.total_24h, 1);
  assert.equal(out.totals.on_record, 0);
  assert.equal(out.leaders.find((l) => l.id === 'hinton').coverage, null);
  assert.ok(ROSTER.every((l) => l.news_query && l.news_query.phrase && l.wikipedia));
  // The fingerprint moves with what a reader sees, not with the clock.
  const f1 = leadersFingerprint(out);
  const out2 = buildLeaders({ ...news, generated_at: iso(NOW + 60_000) }, null, { coverage });
  assert.equal(leadersFingerprint(out2), f1);
});

test('adoptCoverage unions what both lanes saw and keeps the later attempt, so the gate holds across lanes', async () => {
  const { adoptCoverage, adoptProfiles } = await import('../leader-coverage.mjs');
  const m = (ms) => Math.floor(ms / 60_000);
  const local = { schema: 1, updated_at: iso(NOW), leaders: {
    altman: { phrase: 'Sam Altman', extra: '', attempted_at: iso(NOW - 20 * 60_000), fetched_at: iso(NOW - 20 * 60_000), error: null,
      tracking_since: iso(NOW - 7 * D), seen: [['a', m(NOW - H)], ['b', m(NOW - 2 * H)]], headlines: [story(1, NOW - H)] },
  } };
  const remote = { schema: 1, updated_at: iso(NOW + 60_000), leaders: {
    altman: { phrase: 'Sam Altman', extra: '', attempted_at: iso(NOW - 5 * 60_000), fetched_at: iso(NOW - 5 * 60_000), error: null,
      tracking_since: iso(NOW - 9 * D), seen: [['b', m(NOW - 2 * H)], ['c', m(NOW - 3 * H)]], headlines: [story(2, NOW - 30 * 60_000)] },
    hinton: { phrase: 'Geoffrey Hinton', extra: '', attempted_at: iso(NOW), fetched_at: null, error: 'x', seen: [], headlines: [] },
  } };
  const merged = adoptCoverage(local, remote);
  const a = merged.leaders.altman;
  assert.deepEqual(a.seen.map((p) => p[0]).sort(), ['a', 'b', 'c']);
  assert.equal(a.attempted_at, iso(NOW - 5 * 60_000));
  assert.equal(a.tracking_since, iso(NOW - 9 * D));
  assert.deepEqual(a.headlines.map((h) => h.title), ['Story 2', 'Story 1']);
  assert.ok(merged.leaders.hinton);
  // The merged attempt five minutes ago means nobody is polled now.
  let calls = 0;
  const r = await refreshCoverage([{ id: 'altman', phrase: 'Sam Altman' }], merged, { fetcher: async () => { calls += 1; return { data: '', headers: {} }; }, now: () => new Date(NOW) });
  assert.equal(calls, 0);
  assert.deepEqual(r.skipped, ['altman']);
  assert.equal(adoptCoverage(local, null), local);
  assert.equal(adoptProfiles(null, remote), remote);
});
