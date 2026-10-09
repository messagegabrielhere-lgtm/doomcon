// Fixture tests for the fast newsroom sources: Bluesky, GDELT, Google News,
// Hacker News (fresh). No network: every parser is fed a recorded-shape body.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

import bluesky, { mapPost, postUrl } from '../news-sources/bluesky-ai.mjs';
import gdelt, { parseArtlist, parseSeenDate } from '../news-sources/gdelt-ai.mjs';
import gnews, { parseGoogleNews, stripPublisher } from '../news-sources/gnews-ai.mjs';
import hnFresh, { parseHits } from '../news-sources/hn-fresh-ai.mjs';
import { registrableDomain, xOutlet, bskyOutlet } from '../news-sources/_outlets.mjs';

const FIX = new URL('./fixtures/news/', import.meta.url);
const json = (n) => JSON.parse(readFileSync(new URL(n, FIX), 'utf8'));
const text = (n) => readFileSync(new URL(n, FIX), 'utf8');
const NOW = Date.parse('2026-10-09T20:30:00Z');

describe('outlets', () => {
  it('reduces hosts to the publisher', () => {
    assert.equal(registrableDomain('news.bbc.co.uk'), 'bbc.co.uk');
    assert.equal(registrableDomain('https://www.bbc.com/news/x'), 'bbc.co.uk');
    assert.equal(registrableDomain('status.openai.com'), 'openai.com');
    assert.equal(registrableDomain('blog.google'), 'blog.google');
    assert.equal(registrableDomain('not a host'), null);
  });
  it('maps official accounts to their newsroom and keeps strangers unvetted', () => {
    assert.deepEqual(xOutlet('@Reuters'), { outlet: 'reuters.com', vetted: true });
    assert.deepEqual(xOutlet('sama'), { outlet: 'x:sama', vetted: true });
    assert.deepEqual(xOutlet('randomacct'), { outlet: 'x:randomacct', vetted: false });
    assert.deepEqual(bskyOutlet('reuters.com'), { outlet: 'reuters.com', vetted: true });
    assert.equal(bskyOutlet('who.bsky.social').vetted, false);
  });
});

describe('bluesky-ai', () => {
  it('declares the adapter contract and its own cadence', () => {
    assert.equal(bluesky.id, 'bluesky-ai');
    assert.equal(bluesky.minIntervalMs, 120_000);
    assert.ok(bluesky.maxItems > 0);
  });

  it('builds the post URL from the at:// uri', () => {
    assert.equal(postUrl('at://did:plc:x/app.bsky.feed.post/3kabc', 'reuters.com'), 'https://bsky.app/profile/reuters.com/post/3kabc');
    assert.equal(postUrl('https://nope', 'x'), null);
  });

  it('keeps allowlisted and high-engagement AI posts, drops the rest', () => {
    const posts = json('bluesky-search.json').posts;
    const out = posts.map((p) => mapPost(p, { nowMs: NOW })).filter(Boolean);
    assert.equal(out.length, 2);
    const [reuters, viral] = out;
    assert.equal(reuters.title, 'OpenAI to release new reasoning model to all ChatGPT users', 'link-card title preferred');
    assert.equal(reuters.url, 'https://bsky.app/profile/reuters.com/post/3m2abcxyz1');
    assert.equal(reuters.meta.outlet_domain, 'reuters.com');
    assert.equal(reuters.meta.unvetted, false);
    assert.equal(reuters.meta.external_url, 'https://www.reuters.com/technology/openai-new-model-2026-10-09/');
    assert.equal(reuters.published_at, '2026-10-09T20:05:00.000Z');
    assert.equal(viral.meta.unvetted, true, 'viral but not on the list: shown, never corroboration');
    assert.equal(viral.weight_override, 0.3);
  });

  it('falls back to author feeds when search is refused, and goes dark when both fail', async () => {
    const feedBody = { feed: [{ post: json('bluesky-search.json').posts[0] }, { post: json('bluesky-search.json').posts[0], reason: { $type: 'repost' } }] };
    const realNow = Date.now;
    Date.now = () => NOW;
    try {
      const refused = Object.assign(new Error('HTTP 403'), { status: 403 });
      const fetchJson = async (url) => {
        if (url.includes('searchPosts')) throw refused;
        if (url.includes('actor=reuters.com')) return feedBody;
        throw Object.assign(new Error('HTTP 400'), { status: 400 });
      };
      const out = await bluesky.collect(null, fetchJson);
      assert.equal(out.length, 1);
      assert.equal(out[0].meta.mode, 'author-feeds');
      await assert.rejects(bluesky.collect(null, async () => { throw refused; }), /no author feed answered/);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('gdelt-ai', () => {
  it('parses seendate', () => {
    assert.equal(parseSeenDate('20261009T201500Z'), '2026-10-09T20:15:00.000Z');
    assert.equal(parseSeenDate('yesterday'), null);
  });

  it('keeps English headlines that name a lab, once per headline', () => {
    const out = parseArtlist(json('gdelt-artlist.json'), { nowMs: NOW });
    assert.deepEqual(out.map((d) => d.title), [
      'OpenAI unveils new reasoning model for ChatGPT users',
      'Anthropic agrees deal with UK government on Claude',
    ]);
    assert.equal(out[0].meta.outlet_domain, 'example-times.com');
    assert.equal(out[1].meta.outlet_domain, 'bbc.co.uk');
    assert.equal(out[0].meta.time_basis, 'gdelt_seendate');
  });

  it('reads an empty half hour as quiet and a changed shape as broken', () => {
    assert.deepEqual(parseArtlist({}), []);
    assert.throws(() => parseArtlist({ articles: 'nope' }), /not an array/);
    assert.throws(() => parseArtlist(null), /not a JSON object/);
  });

  it('turns a plain-text throttle answer into a dark source with the text quoted', async () => {
    await assert.rejects(gdelt.collect(async () => 'Please limit requests to one every 5 seconds'), /non-JSON answer — Please limit/);
  });

  it('retries a 429 once after the stated interval, then goes dark', async () => {
    const throttled = Object.assign(new Error('HTTP 429'), { status: 429 });
    let calls = 0;
    const waits = [];
    const wait = async (ms) => { waits.push(ms); };
    const out = await gdelt.collect(async () => { calls += 1; if (calls === 1) throw throttled; return '{}'; }, null, { wait });
    assert.deepEqual(out, []);
    assert.equal(calls, 2);
    assert.deepEqual(waits, [6000]);
    await assert.rejects(gdelt.collect(async () => { throw throttled; }, null, { wait }), /HTTP 429/);
  });
});

describe('gnews-ai', () => {
  it('strips the publisher suffix only when it is the publisher', () => {
    assert.equal(stripPublisher('A - B - Reuters', 'Reuters'), 'A - B');
    assert.equal(stripPublisher('A - B', 'Reuters'), 'A - B');
  });

  it('keeps AI headlines, names the newsroom, drops junk and undated rows', () => {
    const out = parseGoogleNews(text('gnews.xml'), { nowMs: NOW });
    assert.equal(out.length, 2);
    assert.equal(out[0].title, 'OpenAI to release new reasoning model to all ChatGPT users');
    assert.equal(out[0].meta.outlet_domain, 'reuters.com');
    assert.equal(out[0].meta.publisher, 'Reuters');
    assert.equal(out[1].title, 'Anthropic & Google DeepMind sign safety pact');
    assert.equal(out[1].meta.outlet_domain, 'theverge.com');
  });

  it('is dark only when every search fails', async () => {
    const xml = text('gnews.xml');
    let n = 0;
    const one = async () => { n += 1; if (n === 1) throw new Error('HTTP 503'); return { data: xml, headers: { 'content-type': 'application/xml' } }; };
    const realNow = Date.now;
    Date.now = () => NOW;
    try {
      const out = await gnews.collect(one);
      assert.equal(out.length, 2, 'two surviving searches, de-duplicated by headline');
    } finally {
      Date.now = realNow;
    }
    await assert.rejects(gnews.collect(async () => { throw new Error('HTTP 503'); }), /no search answered/);
  });
});

describe('hn-fresh-ai', () => {
  it('keeps new submissions that name a lab or model, pointing at the article', () => {
    const out = parseHits(json('hn-fresh.json'));
    assert.deepEqual(out.map((d) => d.title), ['OpenAI releases new reasoning model', 'Claude Code gets background agents']);
    assert.equal(out[0].url, 'https://openai.com/index/new-reasoning-model/');
    assert.equal(out[0].meta.outlet_domain, 'openai.com');
    assert.equal(out[1].url, 'https://news.ycombinator.com/item?id=45000004');
    assert.equal(hnFresh.kind, 'forum');
  });
  it('treats a body without hits as broken', () => {
    assert.throws(() => parseHits({ message: 'error' }), /no hits array/);
  });
});
