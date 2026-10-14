import assert from 'node:assert/strict';
import { test } from 'node:test';
import { about } from './infoPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: {
    level: 4,
    level_name: 'ROUTINE',
    score: 55.5,
    generated_at: '2026-10-10T03:15:00.000Z',
    receipt_id: 'r1',
  },
  cardFor: () => null,
};

test('about.html ships matching question H1, speakable, breadcrumbs, and visible FAQ', () => {
  const html = about(ctx);
  assert.match(html, /<title>What is SIREN\? An independent AI activity index/);
  assert.match(html, /<h1 class="bp__h1">What is SIREN\?<\/h1>/);
  assert.doesNotMatch(html, /What is SIREN, and who is behind it\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /Who runs SIREN\?/);
  assert.match(html, /Does SIREN publish a doom probability\?/);
  assert.match(html, /\/methodology\.html/);
  assert.match(html, /\/guide\.html/);
  assert.match(html, /How does SIREN compare to DEFCON/);
  const what = html.match(/<h2>What it is<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  assert.ok(what, 'expected What it is paragraph');
  assert.match(what[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
  assert.doesNotMatch(what[1], /href="\/methodology\.html">methodology<\/a>/);
  // Scope paid-for body only — layout footer Pages still uses short SECTIONS labels.
  const paid = html.match(/<h2>How it is paid for<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  assert.ok(paid, 'expected How it is paid for paragraph');
  assert.match(paid[1], /href="\/bunker-kit\.html">What free tools belong in a bunker kit\?<\/a>/);
  assert.match(paid[1], /href="\/library\.html">What AI books argue both sides of the case\?<\/a>/);
  assert.match(paid[1], /href="\/sponsor\.html">How do you sponsor SIREN without moving the number\?<\/a>/);
  assert.doesNotMatch(paid[1], /href="\/bunker-kit\.html">Bunker Kit<\/a>/);
  assert.doesNotMatch(paid[1], /href="\/library\.html">reading list<\/a>/);
  assert.doesNotMatch(paid[1], /href="\/sponsor\.html">one named sponsor<\/a>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  assert.doesNotMatch(html, /noindex/);
});
