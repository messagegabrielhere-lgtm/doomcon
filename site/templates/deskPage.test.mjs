import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasDesk, render } from './deskPage.mjs';

const news = JSON.parse(readFileSync(new URL('../../data/news.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { desk: true, balance: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  news,
  moves: [
    { generated_at: '2026-10-10T02:00:00Z', level: 4, level_name: 'ROUTINE', level_changed: false },
    { generated_at: '2026-10-10T01:00:00Z', level: 4, level_name: 'ROUTINE', level_changed: true },
  ],
};

describe('desk page', () => {
  it('gates on newsroom items', () => {
    assert.equal(hasDesk(ctx), true);
    assert.equal(hasDesk({}), false);
  });

  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What unserious counts does SIREN keep on Tally.s desk\?/);
    assert.match(html, /<h1 class="dk__h1 bp__h1">What unserious counts does SIREN keep on Tally.s desk\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Do Tally.s desk counts feed the main SIREN number\?/);
    assert.match(html, /Are these side indexes a signal or a forecast\?/);
    assert.match(html, /What does a headline count on this page measure\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/balance\.html/);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /href="\/news\.html">newsroom<\/a>/);
    assert.match(html, /href="\/game\.html">How do you play Tally Counts\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/game\.html">Play Tally Counts/);
    assert.match(html, /href="\/moves\/">Where are the SIREN index moves\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/moves\/">Every reading →<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /these counts feed the main index/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What unserious counts does SIREN keep on Tally.s desk\?/);
    assert.match(html, /noindex/);
  });

  it('streak card H2 uses a question mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<h2 class="dk__h">How long has Nothing Ever Changed\?<\/h2>/);
    assert.doesNotMatch(html, /<h2 class="dk__h">Nothing Ever Changes<\/h2>/);
    assert.match(html, /"name"\s*:\s*"How long has Nothing Ever Changed\?"/);
    assert.match(html, /consecutive readings at level/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
