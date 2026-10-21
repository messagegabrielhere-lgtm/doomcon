import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './homeV2.mjs';
import { renderDaily } from './feed.mjs';

const T = '2026-10-21T14:00:00Z';
const base = (o = {}) => ({
  url: (p) => `https://siren.watch${p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: T, score: 61.2, level: 3, level_name: 'ELEVATED', receipt_id: 'r1', pillars: [] },
  news: { items: [{ id: 'n1', title: 'Top scored story', url: 'https://ex.com/1', source: 'wires', published_at: '2026-10-21T13:00:00Z', score: 80 }], generated_at: T, sources: [] },
  ...o,
});

describe('home: level colour, breaking, signup', () => {
  it('themes the whole page with the level colour (yellow at SIREN 3)', () => {
    const html = render(base(), { head: '<head></head>' });
    assert.match(html, /<div class="v2" data-level="3" style="--lv:#FACC15;/);
  });

  it('says TOP STORY, not BREAKING, when no cluster is live', () => {
    const html = render(base(), { head: '<head></head>' });
    assert.match(html, /class="v2-hot" id="breaking"[\s\S]*?TOP STORY[\s\S]*?Top scored story/);
    assert.doesNotMatch(html, /⚡ BREAKING/);
  });

  it('leads with a live breaking cluster, highlighted', () => {
    const breaking = { generated_at: T, clusters: [{ id: 'c1', live: true, title: 'Big lab news', url: 'https://ex.com/b', outlets: ['a.com', 'b.com', 'c.com'], corroboration: 3, first_seen_at: '2026-10-21T13:30:00Z' }] };
    const html = render(base({ breaking }), { head: '<head></head>' });
    assert.match(html, /class="v2-hot is-breaking"[\s\S]*?⚡ BREAKING[\s\S]*?Big lab news/);
    // It sits above the brand block, not inside the collapsed evidence.
    assert.ok(html.indexOf('v2-hot is-breaking') < html.indexOf('class="v2-brand"'));
  });

  it('offers the email signup near the top and again at the bottom', () => {
    const html = render(base(), { head: '<head></head>' });
    assert.match(html, /href="#nl">✉ GET THE DAILY BRIEF/);
    assert.match(html, /id="nl"[\s\S]*DAILY BRIEF[\s\S]*id="nl2"/);
    // Blogtrottr cannot be pre-filled by URL: the button copies the feed and opens it.
    assert.match(html, /href="https:\/\/blogtrottr\.com\/"[^>]*data-copyfeed="https:\/\/siren\.watch\/feed-daily\.xml"/);
    assert.match(html, /data-copyfeed="https:\/\/siren\.watch\/feed-level\.xml"/);
    assert.match(html, /value="https:\/\/siren\.watch\/feed-daily\.xml"/);
    assert.doesNotMatch(html, /blogtrottr\.com\/\?url=/);
    assert.equal((html.match(/__mzCopyFeed=1/g) || []).length, 2); // one per box, guarded to bind once
    assert.ok(html.indexOf('id="nl"') < html.indexOf('id="v2-more"'));
  });
});

describe('daily brief feed', () => {
  it('lists completed days only, with the closing reading', () => {
    const ctx = base({ history: [{ t: '2026-10-20T23:07:00Z', score: 55.5, level: 4 }] });
    const xml = renderDaily(ctx, {
      days: [{ day: '2026-10-21' }, { day: '2026-10-20' }],
      itemsForDay: () => [{ title: 'Story A', score: 70 }],
    });
    assert.doesNotMatch(xml, /daily brief · 2026-10-21/);
    assert.match(xml, /daily brief · 2026-10-20/);
    assert.match(xml, /SIREN 4, 55\.5 of 100/);
    assert.match(xml, /https:\/\/siren\.watch\/news\/2026-10-20\.html/);
  });
});
