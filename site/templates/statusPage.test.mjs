import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './statusPage.mjs';

const status = JSON.parse(readFileSync(new URL('../../data/ai-status.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { status: true, threats: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('status page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx, status);
    assert.match(html, /<title>Is ChatGPT down\? Is Claude down\?/);
    assert.match(html, /<h1 class="bp__h1">Is ChatGPT down\? Is Claude down\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does UNKNOWN mean the service is up\?/);
    assert.match(html, /Is ChatGPT down right now\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/threats\.html/);
    assert.match(html, /href="\/dispatch\.html">What public feeds does SIREN Dispatch show\?<\/a>/);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(html, /href="\/threats\.html">What could take the machines offline tonight\?<\/a>/);
    assert.doesNotMatch(html, /href="\/dispatch\.html">Live alerts<\/a>/);
    assert.doesNotMatch(html, /href="\/news\.html">AI news<\/a>/);
    assert.doesNotMatch(html, /href="\/threats\.html">Threat board<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /UNKNOWN means (the service is )?up/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('keeps the question title when services are empty', () => {
    const html = render(ctx, { services: [], generated_at: '2026-10-13T15:00:00Z' });
    assert.match(html, /Is ChatGPT down\? Is Claude down\?/);
    assert.match(html, /FAQPage/);
    assert.doesNotMatch(html, /noindex/);
  });
});
