import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './selfAwarePage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { threats: true, status: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

// A handful of US sites inside the map box — enough for the lede count.
const dcs = [
  { lat: 39.04, lon: -77.49 },
  { lat: 37.77, lon: -122.42 },
  { lat: 41.88, lon: -87.63 },
  { lat: 33.75, lon: -84.39 },
  { lat: 47.61, lon: -122.33 },
];

describe('self-aware page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx, dcs, []);
    assert.match(html, /<title>What if an AI wakes up at 2:14 a\.m\.\?/);
    assert.match(html, /<h1 class="bp__h1">What if an AI wakes up at 2:14 a\.m\.\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is this a forecast that Skynet is waking up\?/);
    assert.match(html, /Are the data-centre locations real\?/);
    assert.match(html, /What is actually happening tonight\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /FICTION/);
    assert.match(html, /The attack is invented/);
    assert.match(html, /\/si-watch\.html/);
    assert.match(html, /\/threats\.html/);
    assert.match(html, /href="\/day-after\.html">What happens the day after an AI catastrophe\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/day-after\.html">Play The Day After →<\/a>/);
    assert.match(html, /href="\/contain\.html">Can you stop an AI breakout\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/contain\.html">Try the Containment game →<\/a>/);
    assert.match(html, /href="\/si-watch\.html">What AI autonomy signals is SIREN watching\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/si-watch\.html">Watch what AI agents are doing right now →<\/a>/);
    assert.match(html, /href="\/threats\.html">What could take the machines offline tonight\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/threats\.html">the live threat board →<\/a>/);
    assert.match(html, /href="\/map\.html">How many datacentres has SIREN mapped in the United States\?<\/a>/);
    assert.doesNotMatch(html, /href="\/map\.html">power map<\/a>/);
    assert.match(html, /href="\/p-doom\.html#voices">What is p\(doom\)\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/p-doom\.html#voices">28 named p\(doom\) estimates →<\/a>/);
    assert.match(html, /href="\/">AI activity index today · SIREN →<\/a>/);
    assert.doesNotMatch(html, /href="\/">See the index →<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Skynet is waking up\./i);
    assert.doesNotMatch(html, /the attack is real/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
