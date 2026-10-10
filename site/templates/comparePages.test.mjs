import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RIVALS,
  alternatives,
  compareHub,
  renderAll,
  sitemapEntries,
  vsRival,
} from './comparePages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-10T14:00:00Z',
    score: 55.5,
    level: 4,
    level_name: 'ROUTINE',
  },
};

describe('compare / alternatives conquest pages', () => {
  it('ships one hub, one alternatives page, and one vs page per rival', () => {
    const pages = renderAll(ctx);
    assert.equal(pages.length, 2 + RIVALS.length);
    assert.ok(pages.every((p) => p.html && /<!doctype html>/i.test(p.html)));
    assert.ok(pages.some((p) => p.path === 'compare.html'));
    assert.ok(pages.some((p) => p.path === 'alternatives.html'));
    for (const rival of RIVALS) {
      assert.ok(pages.some((p) => p.path === rival.path.replace(/^\//, '')));
    }
  });

  it('puts head-term titles and FAQ schema on the hubs', () => {
    const hub = compareHub(ctx);
    assert.match(hub, /AI doom indexes compared/);
    assert.match(hub, /"@type"\s*:\s*"FAQPage"/);
    assert.match(hub, /DoomBench/);
    assert.match(hub, /Skynet Countdown/);
    assert.match(hub, /SIREN 4/);
    assert.match(hub, /55\.5/);

    const alt = alternatives(ctx);
    assert.match(alt, /AI doom index alternatives/);
    assert.match(alt, /DoomBench alternative/i);
    assert.match(alt, /"@type"\s*:\s*"FAQPage"/);
  });

  it('keeps vs pages honest: no borrowed doom probability claim for SIREN', () => {
    const page = vsRival(ctx, 'doombench');
    assert.match(page, /SIREN vs DoomBench/);
    assert.match(page, /does not score takeover risk/i);
    assert.match(page, /recompute/i);
    assert.doesNotMatch(page, /SIREN.*p\(doom\) of \d/i);
  });

  it('sitemaps every conquest URL', () => {
    const entries = sitemapEntries(ctx);
    assert.equal(entries.length, 2 + RIVALS.length);
    assert.ok(entries.every((e) => e.loc && e.lastmod && e.priority));
    assert.ok(entries.some((e) => e.loc === '/compare.html'));
    assert.ok(entries.some((e) => e.loc === '/vs/doombench.html'));
  });

  it('returns empty for an unknown rival id', () => {
    assert.equal(vsRival(ctx, 'not-a-rival'), '');
  });
});
