import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guide, guideMd } from './infoPages.mjs';
import { methodologyMd } from './methodology.mjs';
import * as brand from '../brand.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    level: 4,
    level_name: 'ROUTINE',
    score: 46.3,
    generated_at: '2026-10-10T03:15:00.000Z',
  },
  methodologyMd: '# How it works\n\nThe composite is arithmetic.\n',
};

test('guide.md mirrors the HTML guide claims', () => {
  const md = guideMd(ctx);
  assert.match(md, /^# SIREN, DEFCON/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/guide\.html/);
  assert.match(md, /\*\*SIREN 4, ROUTINE\*\*/);
  assert.match(md, /\| \*\*DEFCON\*\*/);
  assert.match(md, /methodology\.md/);
  assert.match(md, /## What does each number measure\?/);
  assert.match(md, /## How do you read the SIREN dial\?/);
  assert.ok(md.includes(brand.NAME));
});

test('guide.html ships question H2s, FAQ and dateModified freshness', () => {
  const html = guide(ctx);
  assert.match(html, /What does each number measure\?/);
  assert.match(html, /How do you read the SIREN dial\?/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /"dateModified"\s*:\s*"2026-10-10T03:15:00\.000Z"/);
  assert.match(html, /article:modified_time/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /This page rebuilds with every hourly reading/);
});

test('methodology.md wraps the source doc', () => {
  const md = methodologyMd(ctx);
  assert.match(md, /^# SIREN methodology/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/methodology\.html/);
  assert.match(md, /# How it works/);
  assert.match(md, /Built 2026-10-10T03:15:00\.000Z/);
});
