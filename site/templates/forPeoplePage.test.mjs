// Smoke test for /for-people.html: the four tools render, and the page stays
// free of banned forecast claims about the index.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './forPeoplePage.mjs';

function ctx(extra = {}) {
  return {
    href: (p) => p,
    url: (p) => `https://siren.watch${p}`,
    state: { level: 4, level_name: 'ROUTINE', score: 51.1, generated_at: '2026-10-12T18:00:00.000Z' },
    routes: { balance: true },
    bliss: { score: 40 },
    ...extra,
  };
}

test('for-people page ships the four tools and people-first framing', () => {
  const html = render(ctx());
  assert.match(html, /for-people\.html/);
  assert.match(html, /People-first gate/);
  assert.match(html, /Oversight planner/);
  assert.match(html, /Agent charter/);
  assert.match(html, /Where AI helps people today/);
  assert.match(html, /id="gate"/);
  assert.match(html, /id="oversight"/);
  assert.match(html, /id="charter"/);
  assert.match(html, /id="domains"/);
  assert.match(html, /localStorage/);
  assert.match(html, /does not forecast superintelligence/);
  assert.match(html, /None of them change the index/);
});

test('medicine domain falls back when balance route is off', () => {
  const html = render(ctx({ routes: { balance: false }, bliss: null }));
  assert.match(html, /breakthroughs\.html/);
  assert.doesNotMatch(html, /href="\/medicine\.html"/);
  assert.doesNotMatch(html, /href="\/balance\.html"/);
  assert.doesNotMatch(html, /href="\/bliss\.html"/);
});
