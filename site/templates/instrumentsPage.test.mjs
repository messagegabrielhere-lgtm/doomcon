import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './index.mjs';

const state = JSON.parse(readFileSync(new URL('../../data/state.json', import.meta.url), 'utf8'));
const news = JSON.parse(readFileSync(new URL('../../data/news.json', import.meta.url), 'utf8'));
const balance = JSON.parse(readFileSync(new URL('../../data/balance.json', import.meta.url), 'utf8'));
const ledger = JSON.parse(readFileSync(new URL('../../data/ledger.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { balance: true, instruments: true },
  state,
  news,
  balance,
  ledger,
  history: [],
  moves: [],
  seriesFor: () => [],
};

describe('instruments page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx, { view: 'instruments' });
    assert.match(html, /<title>What instruments sit behind the SIREN reading\?/);
    assert.match(html, /<h1 class="bp__h1">What instruments sit behind the SIREN reading\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /What does source health on this page report\?/);
    assert.match(html, /Where is the frozen reference distribution explained\?/);
    assert.match(html, /How do I put the index on my site\?/);
    assert.match(html, /id="api-h">What public JSON files does SIREN expose\?<\/h2>/);
    assert.match(html, /id="bal-h">How does SIREN count AI harm and benefit side by side\?/);
    assert.match(html, /id="oven-h">Where does the index sit\?/);
    assert.match(html, /id="record-h">Where does the score sit over time\?/);
    assert.match(html, /id="fresh-h">What does source health on this page report\?<\/h2>/);
    assert.match(html, /id="pillars-h">What are the five pillars on this page\?<\/h2>/);
    assert.match(html, /id="moves-h">Where are the recent SIREN index moves\?<\/h2>/);
    assert.match(html, /id="embed-h">How do I put the index on my site\?<\/h2>/);
    assert.match(html, /What public JSON files does SIREN expose\?/);
    assert.match(html, /FAQPage[\s\S]*What public JSON files does SIREN expose\?/);
    assert.match(html, /FAQPage[\s\S]*Where does the score sit over time\?/);
    assert.match(html, /FAQPage[\s\S]*What are the five pillars on this page\?/);
    assert.match(html, /FAQPage[\s\S]*How does SIREN count AI harm and benefit side by side\?/);
    assert.match(html, /FAQPage[\s\S]*Where does the index sit\?/);
    assert.doesNotMatch(html, /id="api-h">Public JSON API<\/h2>/);
    assert.doesNotMatch(html, /id="bal-h">Harm and benefit, side by side/);
    assert.doesNotMatch(html, /id="oven-h">Where the index sits/);
    assert.doesNotMatch(html, /id="fresh-h">Source health<\/h2>/);
    assert.doesNotMatch(html, /id="pillars-h">The five pillars<\/h2>/);
    assert.doesNotMatch(html, /id="moves-h">Recent moves<\/h2>/);
    assert.doesNotMatch(html, /id="embed-h">Put the index on your site<\/h2>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/methodology\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /the instruments predict/i);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/);
  });
});
