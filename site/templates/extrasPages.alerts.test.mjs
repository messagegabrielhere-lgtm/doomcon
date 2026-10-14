import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alertsPage } from './extrasPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('alerts page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = alertsPage(ctx);
    assert.match(html, /<title>How do I get alerts when SIREN moves\?/);
    assert.match(html, /<h1>How do I get alerts when SIREN moves\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /id="pick">1 · Which triggers should you pick\?<\/h2>/);
    assert.match(html, /id="feeds">2 · What are your feed URLs\?<\/h2>/);
    assert.match(html, /id="email">3 · How do I turn a feed into email\?<\/h2>/);
    assert.match(html, /id="webhook">4 · How do I send it to a webhook, Slack or Discord\?<\/h2>/);
    assert.match(html, /id="x">5 · How do I follow on X\?<\/h2>/);
    assert.match(html, /id="tab">6 · How do I get notified while this tab is open\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*Which triggers should you pick\?/);
    assert.match(html, /Does SIREN ask for my email\?/);
    assert.match(html, /Can I get notified without a feed reader\?/);
    assert.match(html, /Do alerts move the SIREN score\?/);
    assert.match(html, /<h3>How do I email alerts with Blogtrottr\?<\/h3>/);
    assert.match(html, /<h3>How do I email alerts with FeedRabbit\?<\/h3>/);
    assert.match(html, /<h3>How do I pipe a feed through IFTTT\?<\/h3>/);
    assert.match(html, /<h3>How do I pipe a feed through Zapier\?<\/h3>/);
    assert.match(html, /<h3>How do I pipe a feed through Make\?<\/h3>/);
    assert.match(html, /<h3>How do I subscribe in Slack directly\?<\/h3>/);
    assert.match(html, /FAQPage[\s\S]*How do I email alerts with Blogtrottr\?/);
    assert.match(html, /FAQPage[\s\S]*How do I subscribe in Slack directly\?/);
    assert.doesNotMatch(html, /<h3>Blogtrottr \(free\)<\/h3>/);
    assert.doesNotMatch(html, /<h3>IFTTT<\/h3>/);
    assert.doesNotMatch(html, /<h3>Slack directly<\/h3>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /never asks for it/);
    assert.match(html, /never move the SIREN score/);
    assert.match(html, /\/export\.html/);
    assert.match(html, /\/feedback\.html/);
    assert.match(html, /How do I export and embed SIREN data\?/);
    assert.match(html, /How do I report a problem or send an idea to SIREN\?/);
    const back = html.match(/<p class="xt-back">([\s\S]*?)<\/p>/);
    assert.ok(back, 'expected extras back links');
    assert.match(back[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(back[1], /href="\/methodology\.html">Methodology<\/a>/);
    assert.doesNotMatch(html, /id="pick">1 · Pick your triggers<\/h2>/);
    assert.doesNotMatch(html, /id="feeds">2 · Your feed URLs<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
