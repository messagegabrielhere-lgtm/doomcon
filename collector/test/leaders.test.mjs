// node --test collector/test/leaders.test.mjs
//
// Offline: every feed is a fixture string and the fetcher is injected, so this
// never touches the network.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLeaders, parseLeaderFeed, fetchLeaderFeeds, sourcesFor, namedLeaders, speechCue,
  ROSTER, SILENCE_REASONS,
} from '../leaders.mjs';
import { LEADER_SOURCES } from '../leader-sources.mjs';

const CLOCK = '2026-10-07T12:00:00.000Z';
const DAY = 86_400_000;
const ago = (days) => new Date(Date.parse(CLOCK) - days * DAY).toISOString();

function news(items = []) {
  return { generated_at: CLOCK, max_items: 400, items };
}
function item(id, title, days = 1, source = 'techmeme') {
  return { id, title, url: `https://example.com/${id}`, source, published_at: ago(days), score: 50 };
}
const row = (out, id) => out.leaders.find((l) => l.id === id);

const atom = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>t</title><updated>${CLOCK}</updated>
${entries.join('\n')}
</feed>`;
const atomEntry = ({ title, url, published, updated, author }) => `<entry>
  <title>${title}</title><link rel="alternate" href="${url}"/>
  ${published ? `<published>${published}</published>` : ''}
  ${updated ? `<updated>${updated}</updated>` : ''}
  ${author ? `<author><name>${author}</name></author>` : ''}
</entry>`;
const rss = (items) => `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>t</title>
${items.map(({ title, url, date, creator }) => `<item><title><![CDATA[${title}]]></title><link>${url}</link>
<pubDate>${new Date(date).toUTCString()}</pubDate>${creator ? `<dc:creator><![CDATA[${creator}]]></dc:creator>` : ''}</item>`).join('\n')}
</channel></rss>`;

test('legacy call shape still works and keeps every field consumers read', () => {
  const out = buildLeaders(news([item('a', 'Sam Altman says the next model is close')]));
  assert.equal(out.totals.leaders, ROSTER.length);
  assert.equal(out.totals.on_record, 1);
  const a = row(out, 'altman');
  assert.equal(a.state, 'on_record');
  assert.equal(a.count, 1);
  assert.ok(a.watch_floor && a.watch_floor.verdict);
  assert.equal(a.group, 'on_record');
  assert.equal(a.reason, null);
  assert.equal(a.last_statement_at, ago(1));
  assert.equal(a.days_silent, 1);
  // Every non-recording row carries a reason from the published enum.
  for (const l of out.leaders.filter((x) => x.state === 'no_line')) {
    assert.ok(SILENCE_REASONS.includes(l.reason), `${l.id}: ${l.reason}`);
    assert.equal(l.state, 'no_line');
  }
  // Feeds not run: people with sources read unreachable, people without read no_sources.
  assert.equal(row(out, 'hinton').reason, 'no_sources');
  assert.equal(row(out, 'bengio').reason, 'sources_unreachable');
  assert.equal(row(out, 'bengio').group, 'unreachable');
  assert.equal(out.direct.ran, false);
});

test('headline is reproduced byte for byte', () => {
  const t = 'Jensen Huang talks about AI and climate change like a "supervillain"';
  const out = buildLeaders(news([item('j', t)]));
  assert.equal(row(out, 'huang').lines[0].headline, t);
});

test('parseLeaderFeed never uses <updated> as the publication date', () => {
  const xml = atom([
    atomEntry({ title: 'Old essay', url: 'https://x.test/1', published: '2025-06-10T00:00:00Z', updated: CLOCK }),
    atomEntry({ title: 'Undated', url: 'https://x.test/2', updated: CLOCK }),
  ]);
  const e = parseLeaderFeed(xml);
  assert.equal(e.length, 1);
  assert.equal(e[0].published_at, '2025-06-10T00:00:00.000Z');
});

test('parseLeaderFeed reads authors from Atom and WordPress', () => {
  const a = parseLeaderFeed(atom([atomEntry({ title: 'V', url: 'https://y.test/v', published: ago(1), author: 'Google DeepMind' })]));
  assert.equal(a[0].author, 'Google DeepMind');
  const r = parseLeaderFeed(rss([{ title: 'Post', url: 'https://m.test/p', date: ago(2), creator: 'Satya Nadella' }]));
  assert.equal(r[0].author, 'Satya Nadella');
});

test('a personal feed puts the person on the record, verbatim, as an official line', () => {
  const feeds = {
    'bengio-blog': { ok: true, entries: parseLeaderFeed(rss([
      { title: 'Why are AI agents lying, cheating & coordinating?', url: 'https://yoshuabengio.org/a', date: ago(3) },
      { title: 'Introducing LawZero', url: 'https://yoshuabengio.org/b', date: ago(400) },
    ])), error: null },
  };
  const out = buildLeaders(news(), null, { feeds });
  const b = row(out, 'bengio');
  assert.equal(b.state, 'on_record');
  assert.equal(b.count, 1);
  assert.equal(b.direct_count, 1);
  assert.equal(b.lines[0].headline, 'Why are AI agents lying, cheating & coordinating?');
  assert.equal(b.lines[0].cue_class, 'official');
  assert.equal(b.lines[0].via, 'feed');
  // Press-only reconciliation is unaffected by a feed line.
  assert.equal(b.watch_floor.verdict, 'not_tracked');
  assert.equal(out.totals.direct_lines, 1);
});

test('quiet: sources answered, nothing in the window, last statement is published', () => {
  const feeds = {
    'samaltman-blog': { ok: true, entries: parseLeaderFeed(atom([
      atomEntry({ title: 'The Gentle Singularity', url: 'https://blog.samaltman.com/g', published: ago(12), updated: CLOCK }),
    ])), error: null },
    'openai-news': { ok: false, entries: [], error: 'HTTP 500' },
  };
  const out = buildLeaders(news(), null, { feeds });
  const a = row(out, 'altman');
  assert.equal(a.state, 'no_line');
  assert.equal(a.reason, 'quiet');
  assert.equal(a.group, 'quiet');
  assert.equal(a.days_silent, 12);
  assert.equal(a.last_statement_at, ago(12));
  assert.equal(a.last_statement.source, 'blog.samaltman.com');
  assert.equal(a.sources_checked, sourcesFor('altman').length + 1);
  assert.equal(a.sources_ok, 2); // the press wire + the blog
  const blog = a.direct_sources.find((f) => f.id === 'samaltman-blog');
  assert.equal(blog.ok, true);
  assert.equal(blog.attributed, 1);
});

test('org feeds: only entries that name the leader count, by byline, video, or title + cue', () => {
  const feeds = {
    'microsoft-blog': { ok: true, entries: parseLeaderFeed(rss([
      { title: 'Our next chapter', url: 'https://blogs.microsoft.com/1', date: ago(2), creator: 'Satya Nadella' },
      { title: 'Azure pricing update', url: 'https://blogs.microsoft.com/2', date: ago(1), creator: 'Someone Else' },
      { title: 'Mustafa Suleyman joins panel', url: 'https://blogs.microsoft.com/3', date: ago(1) },
    ])), error: null },
    'yt-microsoft': { ok: true, entries: parseLeaderFeed(atom([
      atomEntry({ title: 'Mustafa Suleyman on the future of Copilot', url: 'https://youtube.com/watch?v=1', published: ago(4), author: 'Microsoft' }),
    ])), error: null },
  };
  const out = buildLeaders(news(), null, { feeds });
  const n = row(out, 'nadella');
  assert.equal(n.count, 1);
  assert.equal(n.lines[0].cue, 'byline');
  const s = row(out, 'suleyman');
  // "joins panel" has no speech cue -> excluded; the official video counts.
  assert.equal(s.count, 1);
  assert.equal(s.lines[0].cue, 'official video');
});

test('memory: a remembered last statement survives a run where every source is down', () => {
  const prior = { leaders: [{ id: 'karpathy', last_statement: {
    headline: 'Animals vs Ghosts', url: 'https://karpathy.bearblog.dev/ag', source: 'karpathy.bearblog.dev',
    published_at: ago(20), via: 'feed',
  } }] };
  const feeds = Object.fromEntries(sourcesFor('karpathy').map((s) => [s.id, { ok: false, entries: [], error: 'timeout' }]));
  const out = buildLeaders(news(), null, { feeds, prior });
  const k = row(out, 'karpathy');
  assert.equal(k.reason, 'sources_unreachable');
  assert.equal(k.group, 'unreachable');
  assert.equal(k.last_statement_at, ago(20));
  assert.equal(k.last_statement.remembered, true);
  assert.equal(k.days_silent, 20);
  assert.equal(k.sources_ok, 1);
});

test('memory ignores a prior stamp in the future and keeps the newer of the two', () => {
  const prior = { leaders: [{ id: 'altman', last_statement: {
    headline: 'x', url: 'https://x.test', source: 's', published_at: '2030-01-01T00:00:00Z' } }] };
  const out = buildLeaders(news([item('a', 'Sam Altman says hi', 2)]), null, { prior });
  assert.equal(row(out, 'altman').last_statement_at, ago(2));
});

test('fetchLeaderFeeds never throws: network errors and HTML bodies become values', async () => {
  const sources = [
    { id: 'ok', url: 'https://ok.test/feed', leaders: ['altman'], kind: 'personal', format: 'atom' },
    { id: 'boom', url: 'https://boom.test/feed', leaders: ['altman'], kind: 'personal', format: 'atom' },
    { id: 'html', url: 'https://html.test/feed', leaders: ['altman'], kind: 'personal', format: 'atom' },
  ];
  const fetcher = async (url) => {
    if (url.includes('boom')) throw new Error('ECONNRESET');
    if (url.includes('html')) return { data: '<!doctype html><html><body>hi</body></html>', headers: { 'content-type': 'text/html' } };
    return { data: atom([atomEntry({ title: 'Post', url: 'https://ok.test/1', published: ago(1) })]), headers: { 'content-type': 'application/atom+xml' } };
  };
  const res = await fetchLeaderFeeds(sources, { fetcher, now: () => new Date(CLOCK) });
  assert.equal(res.ok.ok, true);
  assert.equal(res.ok.entries.length, 1);
  assert.equal(res.boom.ok, false);
  assert.match(res.boom.error, /ECONNRESET/);
  assert.equal(res.html.ok, false);
});

test('pure: identical inputs give identical bytes', () => {
  const feeds = { 'bengio-blog': { ok: true, entries: [{ title: 'A', url: 'https://b.test/a', published_at: ago(3), author: null }], error: null } };
  const a = JSON.stringify(buildLeaders(news([item('a', 'Altman says x')]), null, { feeds }));
  const b = JSON.stringify(buildLeaders(news([item('a', 'Altman says x')]), null, { feeds }));
  assert.equal(a, b);
});

test('source table is sane: unique ids, https, roster ids, no X/Twitter', () => {
  const ids = new Set();
  const roster = new Set(ROSTER.map((l) => l.id));
  for (const s of LEADER_SOURCES) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
    ids.add(s.id);
    assert.match(s.url, /^https:\/\//);
    assert.doesNotMatch(s.url, /(twitter|x)\.com\//);
    for (const id of s.leaders) assert.ok(roster.has(id));
    assert.equal(typeof s.verified, 'boolean');
  }
});

test('matcher primitives unchanged', () => {
  assert.deepEqual(namedLeaders('Daniela Amodei says hello').map((n) => n.id), []);
  assert.equal(speechCue('nothing here'), null);
});
