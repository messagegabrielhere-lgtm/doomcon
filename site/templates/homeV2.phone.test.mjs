import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, phoneMovers } from './homeV2.mjs';
import { evidencePage } from './extrasPages.mjs';
import { findFutureViolation } from '../../collector/posts.mjs';

const T = '2026-10-21T14:00:00Z';
const pillars = [
  { id: 'capability', name: 'Capability', score: 62 },
  { id: 'compute', name: 'Compute & Capital', score: 71 },
  { id: 'attention', name: 'Attention', score: 55 },
  { id: 'governance', name: 'Governance', score: 40 },
  { id: 'markets', name: 'Markets', score: null, dark: true },
];
const base = (o = {}) => ({
  url: (p) => `https://siren.watch${p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: T, score: 61.2, level: 3, level_name: 'ELEVATED', receipt_id: 'r1', pillars },
  history: [50, 52, 55, 58, 61.2].map((score, i) => ({ t: `2026-10-21T1${i}:00:00Z`, score, pillars: {} })),
  news: { items: [{ id: 'n1', title: 'Top scored story', url: 'https://ex.com/1', source: 'wires', published_at: '2026-10-21T13:00:00Z', score: 80 }], generated_at: T, sources: [] },
  ...o,
});
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');

describe('home: phone fold', () => {
  const html = render(base(), { head: '<head></head>' });

  it('puts spark, movers and the evidence control inside the hero, before the signup and the board', () => {
    const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    assert.match(hero, /class="v2-phone"/);
    assert.match(hero, /class="v2-phone__spark"[^>]*aria-label="Composite score over the last 5 readings, now 61\.2 of 100"/);
    assert.match(hero, /href="#v2-more" data-v2-more-open>See the evidence/);
    assert.match(hero, /href="\/evidence\.html"/);
    assert.ok(html.indexOf('id="breaking"') < html.indexOf('class="hero"'));
    assert.ok(html.indexOf('class="v2-phone"') < html.indexOf('id="nl"'));
    assert.ok(html.indexOf('id="nl"') < html.indexOf('id="v2-more"'));
  });

  it('orders breaking, reading, signup first on phones and accents with the level colour', () => {
    const css = html.match(/\.v2-main>\.v2-hot\{order:-4[\s\S]*?\.v2-main>\.v2-signup\{order:-2/);
    assert.ok(css, 'phone order rules present');
    assert.match(html, /\.v2-phone__spark path\{fill:none;stroke:var\(--lv\)/);
    assert.doesNotMatch(html.match(/class="v2-phone"[\s\S]*?<\/div>/)[0], /#[0-9A-F]{6}/i);
  });

  it('keeps the scale rail and race line out of the hero so phones can drop them below the signup', () => {
    const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/)[0];
    assert.doesNotMatch(hero, /class="v2-scale"/);
    assert.match(html, /<div class="v2-ctx">\s*<ol class="v2-scale"/);
  });

  it('ships the browser-only watchlist and feeds pillar scores to the since-visit strip', () => {
    assert.match(html, /id="watch" data-sec="Watch"/);
    assert.match(html, /data-watch-pillar="compute"/);
    assert.match(html, /"pillars":\{"capability":62,"compute":71,"attention":55,"governance":40,"markets":null\}/);
  });

  it('opens the evidence board for in-board hashes', () => {
    assert.match(html, /<details class="v2-more" id="v2-more" open>/);
    assert.match(html, /d\.contains\(t\)/);
  });

  it('fold copy carries no future tense', () => {
    const fold = text(html.match(/<section class="hero">[\s\S]*?<\/section>/)[0] + html.match(/<section class="v2-watch"[\s\S]*?<\/section>/)[0]);
    assert.equal(findFutureViolation(fold), null);
  });
});

describe('phoneMovers', () => {
  it('leads with this hour’s movers and tops up with the loudest live pillars', () => {
    const wm = { pillar_deltas: [{ id: 'attention', name: 'Attention', kind: 'move', delta: 2.1 }] };
    const m = phoneMovers(wm, { pillars });
    assert.deepEqual(m.map((p) => p.id), ['attention', 'compute', 'capability']);
  });
  it('never lists a dark pillar as a top-up', () => {
    const m = phoneMovers(null, { pillars });
    assert.ok(!m.some((p) => p.id === 'markets'));
    assert.equal(m.length, 3);
  });
});

describe('/evidence.html', () => {
  const ctx = base({ race: { players: [{ rank: 1, name: 'Lab A', market: { probability: 0.42 } }] }, leaders: { totals: { leaders: 15, on_record: 4 } } });
  const html = evidencePage(ctx);
  it('asks the question, links the receipt rooms and shows live counts', () => {
    assert.match(html, /<h1>What backs the SIREN number\?<\/h1>/);
    for (const p of ['/news.html', '/race.html', '/leaders.html', '/verify.html', '/methodology.html', '/alerts.html']) assert.ok(html.includes(`href="${p}"`), p);
    assert.match(html, /Lab A 42\.0%/);
    assert.match(html, /4 of 15 on record/);
  });
  it('never calls the index a forecast and uses no future tense', () => {
    const main = text(html.match(/<section class="xt">[\s\S]*?<\/section>/)[0]);
    assert.doesNotMatch(main, /forecast/i);
    assert.equal(findFutureViolation(main), null);
  });
});
