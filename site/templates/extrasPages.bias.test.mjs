import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { biasPage } from './extrasPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [{ t: 1 }, { t: 2 }],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('bias page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = biasPage(ctx);
    assert.match(html, /<title>What can SIREN not see\?/);
    assert.match(html, /<h1>What can SIREN not see\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /id="inputs">Where does each input lean\?<\/h2>/);
    assert.match(html, /id="skew">What does that skew\?<\/h2>/);
    assert.match(html, /id="candidates">Which sources are under consideration\?<\/h2>/);
    assert.match(html, /id="propose">How do I propose a source\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*Where does each input lean\?/);
    assert.match(html, /What does that skew\?/);
    assert.match(html, /How do new sources get into the score\?/);
    assert.match(html, /Is the biased reading a doom probability\?/);
    assert.match(html, /Would other-language Wikipedia pageviews help\?/);
    assert.match(html, /Would EUR-Lex widen governance\?/);
    assert.match(html, /Would China MIIT and CAC notices help\?/);
    assert.match(html, /Would Japan METI publications help\?/);
    assert.match(html, /Would India MeitY notices help\?/);
    assert.match(html, /FAQPage[\s\S]*Would other-language Wikipedia pageviews help\?/);
    assert.doesNotMatch(html, />Other-language Wikipedia pageviews</);
    assert.doesNotMatch(html, />EUR-Lex</);
    assert.doesNotMatch(html, />China: MIIT and CAC notices</);
    assert.doesNotMatch(html, />Japan: METI</);
    assert.doesNotMatch(html, />India: MeitY</);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /almost everything SIREN counts is published in English/);
    assert.match(html, /uncalibrated/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /\/feedback\.html/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /How do I report a problem or send an idea to SIREN\?/);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /href="\/news\.html">newsroom<\/a>/);
    assert.doesNotMatch(html, /id="inputs">Where each input leans<\/h2>/);
    assert.doesNotMatch(html, /id="candidates">Under consideration<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
