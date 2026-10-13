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
    assert.match(html, /Does SIREN ask for my email\?/);
    assert.match(html, /Can I get notified without a feed reader\?/);
    assert.match(html, /Do alerts move the SIREN score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /never asks for it/);
    assert.match(html, /never move the SIREN score/);
    assert.match(html, /\/feedback\.html/);
    assert.match(html, /\/changelog\.html/);
    assert.match(html, /How do I report a problem or send an idea to SIREN\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
