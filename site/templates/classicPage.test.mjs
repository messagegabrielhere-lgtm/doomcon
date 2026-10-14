import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './index.mjs';

const state = JSON.parse(readFileSync(new URL('../../data/state.json', import.meta.url), 'utf8'));
const news = JSON.parse(readFileSync(new URL('../../data/news.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { balance: false, instruments: true },
  state,
  news,
  history: [],
  moves: [],
  seriesFor: () => [],
};

describe('classic page', () => {
  it('ships a question-shaped title, own canonical, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx, { view: 'classic' });
    assert.match(html, /<title>Where is the full SIREN instrument panel\?/);
    assert.match(html, /<h1 class="bp__h1">Where is the full SIREN instrument panel\?<\/h1>/);
    assert.match(html, /rel="canonical" href="https:\/\/siren\.watch\/classic\.html"/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /How is this different from the home page\?/);
    assert.match(html, /Where do I check just the working behind the number\?/);
    assert.match(html, /Is the classic panel a doom probability\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/instruments\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /What instruments sit behind the SIREN reading\?/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /measures activity tempo/);
    // Live verdict demoted so the panel question owns the single H1.
    assert.match(html, /<h2 class="ans__a"/);
    assert.doesNotMatch(html, /rel="canonical" href="https:\/\/siren\.watch\/"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('keeps the homepage head on path / with the live title', () => {
    const html = render(ctx);
    assert.match(html, /<title>AI activity index today · SIREN/);
    assert.match(html, /rel="canonical" href="https:\/\/siren\.watch\/"/);
    assert.doesNotMatch(html, /Where is the full SIREN instrument panel\?/);
  });

  it('support earn cards and verify methodology link use question H1s', () => {
    const html = render(ctx, { view: 'classic' });
    const earn = html.match(/<div class="earn">([\s\S]*?)<\/div>/);
    assert.ok(earn, 'expected support earn cards');
    assert.match(earn[1], /href="\/library\.html"><b>What AI books argue both sides of the case\?<\/b>/);
    assert.match(earn[1], /href="\/bunker-kit\.html"><b>What free tools belong in a bunker kit\?<\/b>/);
    assert.match(earn[1], /href="\/sponsor\.html"><b>How do you sponsor SIREN without moving the number\?<\/b>/);
    assert.doesNotMatch(earn[1], /<b>The reading list<\/b>/);
    assert.doesNotMatch(earn[1], /<b>The Bunker Kit<\/b>/);
    assert.doesNotMatch(earn[1], /<b>Sponsor the index<\/b>/);
    const vfy = html.match(/id="vfy"[\s\S]*?<p class="fresh__key">([\s\S]*?)<\/p>/);
    assert.ok(vfy, 'expected verify key paragraph');
    assert.match(vfy[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(vfy[1], /href="\/methodology\.html">method<\/a>/);
  });

  it('instruments record and FAQ methodology links use the question H1', () => {
    const html = render(ctx, { view: 'instruments' });
    const record = html.match(/id="record"[\s\S]*?<\/section>/);
    assert.ok(record, 'expected instruments record section');
    assert.match(record[0], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology →<\/a>/);
    assert.doesNotMatch(record[0], /href="\/methodology\.html">methodology page →<\/a>/);
    const faq = html.match(/class="inst__faq-key">([\s\S]*?)<\/p>/);
    assert.ok(faq, 'expected instruments FAQ sibling');
    assert.match(faq[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(faq[1], /href="\/methodology\.html">How the AI activity index is computed<\/a>/);
  });
});
