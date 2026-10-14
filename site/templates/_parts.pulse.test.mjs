import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { newPulse } from './_parts.mjs';

describe('arrivals pulse', () => {
  it('more-link uses the newsroom question H1', () => {
    const counts = {
      windows: [
        { seconds: 3600, label: '1h', count: 3, sources: 2, complete: true, covered_seconds: 3600 },
        { seconds: 86400, label: '24h', count: 12, sources: 4, complete: true, covered_seconds: 86400 },
      ],
      per_source: [{ id: 'hn-ai', counts: [2, 8], total: 8 }],
      sources_total: 10,
      depth_seconds: 86400,
      runs: 24,
      missing: 0,
      total: 12,
    };
    const html = newPulse(counts, { href: '/news.html' });
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /Every item, scored/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
