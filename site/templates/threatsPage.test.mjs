import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './threatsPage.mjs';

const threats = JSON.parse(readFileSync(new URL('../../data/threats.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { threats: true, status: true, exploits: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('threats page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx, threats);
    assert.match(html, /<title>What could take the machines offline tonight\?/);
    assert.match(html, /<h1 class="bp__h1">What could take the machines offline tonight\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /id="kev">Which software was newly exploited \(CISA KEV, last 30 days\)\?<\/h2>/);
    assert.match(html, /id="botnets">Which botnet families are online\?<\/h2>/);
    assert.match(html, /id="space">What space weather alerts are active\?<\/h2>/);
    assert.match(html, /id="planet">Which natural events is NASA tracking\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*Which software was newly exploited/);
    assert.match(html, /Does a dark feed mean everything is clear\?/);
    assert.match(html, /What does SOFTWARE UNDER ATTACK count\?/);
    assert.match(html, /Is this a forecast that AI goes offline tonight\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/status\.html/);
    assert.match(html, /\/exploits\.html/);
    const related = html.match(/>Related:([\s\S]*?)<\/p>/);
    assert.ok(related, 'expected Related paragraph');
    assert.match(related[1], /href="\/status\.html">Is ChatGPT down\? Is Claude down\?<\/a>/);
    assert.match(related[1], /href="\/dispatch\.html">What public feeds does SIREN Dispatch show\?<\/a>/);
    assert.match(related[1], /href="\/waffle\.html">Is the Waffle House open\?<\/a>/);
    assert.match(related[1], /href="\/self-aware\.html">What if an AI wakes up at 2:14 a\.m\.\?<\/a>/);
    assert.doesNotMatch(related[1], /href="\/dispatch\.html">Live quakes/);
    assert.doesNotMatch(related[1], /href="\/waffle\.html">Waffle House Index<\/a>/);
    assert.doesNotMatch(related[1], /href="\/self-aware\.html">The night it wakes up/);
    assert.doesNotMatch(html, /id="kev">NEWLY EXPLOITED SOFTWARE/);
    assert.doesNotMatch(html, /id="botnets">BOTNET FAMILIES/);
    // Never-say: refuse offline-tonight forecast / dark-feed-as-clear.
    assert.doesNotMatch(html, /machines will go offline tonight/i);
    assert.doesNotMatch(html, /dark feed means (all )?clear/i);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('keeps the question title when feeds are empty', () => {
    const html = render(ctx, { generated_at: '2026-10-13T15:00:00Z' });
    assert.match(html, /What could take the machines offline tonight\?/);
    assert.match(html, /FAQPage/);
    assert.match(html, /CISA feed unreachable this pass/);
    assert.doesNotMatch(html, /noindex/);
  });
});
