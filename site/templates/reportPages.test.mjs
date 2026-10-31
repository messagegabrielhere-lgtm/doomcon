import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthsIn, summarize, findings, monthLabel } from './reportPages.mjs';

const H = [
  { t: '2026-09-30T23:00:00Z', score: 40, level: 4, pillars: { capability: 30, attention: 50 } },
  { t: '2026-10-01T00:00:00Z', score: 50, level: 4, pillars: { capability: 40, attention: 60 } },
  { t: '2026-10-15T00:00:00Z', score: 70, level: 2, pillars: { capability: 60, attention: 80 } },
  { t: '2026-10-31T00:00:00Z', score: 45, level: 4, pillars: { capability: 35, attention: 55 } },
];

test('monthsIn lists distinct months oldest first', () => {
  assert.deepEqual(monthsIn(H), ['2026-09', '2026-10']);
});

test('summarize computes mean, extremes, levels, completeness', () => {
  const s = summarize(H, '2026-10', '2026-11-01T00:00:00Z');
  assert.equal(s.n, 3);
  assert.equal(Math.round(s.mean * 10) / 10, 55);
  assert.equal(s.max.score, 70);
  assert.equal(s.min.score, 45);
  assert.equal(s.modeLevel, 4);
  assert.equal(s.complete, true);
  assert.equal(summarize(H, '2026-10', '2026-10-31T12:00:00Z').complete, false);
  assert.equal(summarize(H, '2026-12', '2027-01-01T00:00:00Z'), null);
});

test('findings are full sentences and never call the index a probability', () => {
  const f = findings(summarize(H, '2026-10', '2026-10-31T12:00:00Z'));
  assert.ok(f.length >= 4);
  for (const line of f) {
    assert.match(line, /\.$/);
    assert.doesNotMatch(line, /probab|chance|likel/i);
  }
  assert.match(f[0], /to date/);
  assert.equal(monthLabel('2026-10'), 'October 2026');
});
