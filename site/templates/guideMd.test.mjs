import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guideMd } from './infoPages.mjs';
import { methodologyMd } from './methodology.mjs';
import * as brand from '../brand.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: { level: 4, level_name: 'ROUTINE', generated_at: '2026-10-10T03:15:00.000Z' },
  methodologyMd: '# How it works\n\nThe composite is arithmetic.\n',
};

test('guide.md mirrors the HTML guide claims', () => {
  const md = guideMd(ctx);
  assert.match(md, /^# SIREN, DEFCON/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/guide\.html/);
  assert.match(md, /\*\*SIREN 4, ROUTINE\*\*/);
  assert.match(md, /\| \*\*DEFCON\*\*/);
  assert.match(md, /methodology\.md/);
  assert.ok(md.includes(brand.NAME));
});

test('methodology.md wraps the source doc', () => {
  const md = methodologyMd(ctx);
  assert.match(md, /^# SIREN methodology/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/methodology\.html/);
  assert.match(md, /# How it works/);
  assert.match(md, /Built 2026-10-10T03:15:00\.000Z/);
});
