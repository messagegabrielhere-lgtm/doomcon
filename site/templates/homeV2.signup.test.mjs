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

describe('dial and held level', () => {
  const held = () => base({ state: { generated_at: '2026-10-22T11:00:00Z', score: 56.5, level: 4, level_name: 'ROUTINE', rule_fired: 'deadband', pillars: [] } });
  it('draws the progress arc the short way round, in the score band colour', () => {
    const html = render(held(), { head: '<head></head>' });
    const arc = html.match(/<path d="M[^"]*A86 86 0 (\d) 1 [^"]*" stroke="([^"]+)" stroke-width="6"/);
    assert.ok(arc, 'progress arc present');
    assert.equal(arc[1], '0');
    assert.equal(arc[2], '#FACC15');
  });
  it('colours the page by the score band, in plain words, with no rule talk', () => {
    const html = render(held(), { head: '<head></head>' });
    assert.match(html, /<div class="v2" data-level="4" style="--lv:#FACC15;/);
    assert.match(html, /SCORE IN THE ELEVATED RANGE/);
    assert.match(html, /class="v2-scale__st score"[\s\S]*?56\.5[\s\S]*?SCORE/);
    const top = html.slice(0, html.indexOf('id="v2-more"'));
    assert.doesNotMatch(top, /dead band|deadband|level is held|does not flicker|LEVEL HELD/i);
  });
  it('shows nothing extra when score and level agree', () => {
    const html = render(base(), { head: '<head></head>' });
    assert.doesNotMatch(html, /SCORE IN THE .* RANGE/);
  });
});

describe('home UX: less on the first screen', () => {
  const html = render(base(), { head: '<head></head>' });
  it('keeps the signup to a heading and two buttons; how-to is folded', () => {
    const box = html.slice(html.indexOf('id="nl"'), html.indexOf('id="nl"') + 4000);
    assert.match(box, /<details class="mz-how">\s*<summary>How email signup works<\/summary>[\s\S]*feed-daily\.xml[\s\S]*Feed Me[\s\S]*<\/details>/);
    assert.ok(box.indexOf('EMAIL ME THE DAILY BRIEF') < box.indexOf('<details class="mz-how">'));
  });
  it('shows three reading actions and folds the rest', () => {
    assert.match(html, /<div class="v2-dbtns">[\s\S]*VERIFY THIS READING[\s\S]*Copy this reading[\s\S]*POST TODAY'S READING[\s\S]*<details class="v2-dmore"><summary>More ways to use this reading<\/summary>[\s\S]*CITE \/ EMBED/);
  });
  it('labels the footer links once each', () => {
    const foot = html.slice(html.indexOf('<p class="v2-foot">'));
    assert.equal((foot.match(/Where is the full SIREN instrument panel\?/g) || []).length, 1);
  });
  it('puts the reading before the brand block at every width', () => {
    assert.match(html, /\.v2-main>\.v2-hot\{order:-4[^}]*\}\.v2-main>\.hero\{order:-3/);
  });
});

describe('home weight', () => {
  it('draws long history with at most ~240 points per line', () => {
    const t0 = Date.parse('2026-09-20T00:00:00Z');
    const history = Array.from({ length: 900 }, (_, i) => ({ t: new Date(t0 + i * 3600e3).toISOString(), score: 50 + (i % 7), level: 4, pillars: { capability: 40 + (i % 5) } }));
    const html = render(base({ history }), { head: '<head></head>' });
    const svg = html.match(/<svg class="v2-hchart"[\s\S]*?<\/svg>/g).pop();
    const longest = Math.max(...[...svg.matchAll(/<path d="([^"]*)"/g)].map((m) => (m[1].match(/[ML]/g) || []).length));
    assert.ok(longest <= 245, `longest path has ${longest} points`);
  });
  it('emits the FAQ schema once when the head already carries it', () => {
    const html = render(base(), { head: '<head><script type="application/ld+json">{"@type":"FAQPage"}</script></head>' });
    assert.equal((html.match(/"FAQPage"/g) || []).length, 1);
  });
});
