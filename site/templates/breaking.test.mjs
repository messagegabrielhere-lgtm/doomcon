import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { breakingStrip, speedBox, freshCluster, breakingMeta } from './_breaking.mjs';

const cluster = (over = {}) => ({
  id: 'b1', live: true, title: 'Lab ships <model> & more', url: 'https://theverge.com/x', source: 'verge-ai', outlet: 'theverge.com',
  outlets: ['theverge.com', 'reuters.com'], corroboration: 2, rule: ['tier-one outlet plus one more'],
  first_seen_at: '2026-10-09T20:14:00.000Z', ...over,
});
const ctx = (clusters, speed) => ({ breaking: { generated_at: '2026-10-09T21:00:00.000Z', clusters, speed } });

describe('breaking strip', () => {
  it('renders the strip with the share button and escapes the headline', () => {
    const html = breakingStrip(ctx([cluster()]));
    assert.match(html, /⚡ BREAKING/);
    assert.match(html, /first seen 20:14 UTC · 2 sources/);
    assert.match(html, /<button type="button" class="brk__xp" data-xpost="news" data-x-title="Lab ships &lt;model&gt; &amp; more" data-x-src="theverge.com" data-x-url="https:\/\/theverge.com\/x"/);
    assert.ok(!html.includes('<model>'));
  });

  it('renders nothing without a live cluster or a file', () => {
    assert.equal(breakingStrip(ctx([cluster({ live: false })])), '');
    assert.equal(breakingStrip({}), '');
  });

  it('offers the homepage only a cluster under two hours old', () => {
    assert.equal(freshCluster(ctx([cluster()])).id, 'b1');
    assert.equal(freshCluster(ctx([cluster({ first_seen_at: '2026-10-09T18:00:00.000Z' })])), null);
    assert.equal(breakingMeta(cluster({ corroboration: 1 })), 'first seen 20:14 UTC · 1 source');
  });
});

describe('speed box', () => {
  it('shows the overall median and the per-source table, labelled honestly', () => {
    const html = speedBox(ctx([], { window_hours: 24, overall: { median_s: 250, n: 12 }, by_source: [{ source: 'gnews-ai', median_s: 120, n: 5 }] }));
    assert.match(html, /How fast is SIREN\?/);
    assert.match(html, /<b>4m<\/b> median, over 12 items in the last 24h/);
    assert.match(html, /outlet's own timestamp to SIREN first seeing/);
    assert.match(html, /<th scope="row">gnews-ai<\/th><td>2m<\/td><td>5<\/td>/);
  });
  it('renders nothing before the first sample', () => {
    assert.equal(speedBox(ctx([], { overall: { median_s: null, n: 0 } })), '');
  });
});
