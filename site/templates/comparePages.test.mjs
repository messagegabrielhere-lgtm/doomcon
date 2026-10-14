import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RIVALS,
  alternatives,
  compareHub,
  renderAll,
  sitemapEntries,
  vsHub,
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
  it('ships compare, alternatives, vs hub, and one vs page per rival', () => {
    const pages = renderAll(ctx);
    assert.equal(pages.length, 3 + RIVALS.length);
    assert.ok(pages.every((p) => p.html && /<!doctype html>/i.test(p.html)));
    assert.ok(pages.some((p) => p.path === 'compare.html'));
    assert.ok(pages.some((p) => p.path === 'alternatives.html'));
    assert.ok(pages.some((p) => p.path === 'vs.html'));
    for (const rival of RIVALS) {
      assert.ok(pages.some((p) => p.path === rival.path.replace(/^\//, '')));
    }
  });

  it('puts matching question H1 and FAQ schema on the compare hub', () => {
    const hub = compareHub(ctx);
    assert.match(hub, /<title>Which AI doom indexes can you compare\?/);
    assert.match(hub, /<h1>Which AI doom indexes can you compare\?<\/h1>/);
    assert.match(hub, /cmp__k">Which AI doom indexes can you compare\?<\/p>/);
    assert.doesNotMatch(hub, /cmp__k">Compare<\/p>/);
    assert.match(hub, /SIREN vs DoomBench: which should you use\?/);
    assert.match(hub, /cmp__nav"[^>]*>[\s\S]*?Which AI doom indexes can you compare\?/);
    assert.doesNotMatch(hub, /cmp__nav"[^>]*>[\s\S]*?>Full comparison</);
    assert.doesNotMatch(hub, /compare honestly\?/);
    assert.match(hub, /Takeoff Tracker/);
    assert.match(hub, /"@type"\s*:\s*"FAQPage"/);
    assert.match(hub, /Questions people actually ask/);
    assert.match(hub, /What is the difference between SIREN and DoomBench/);
    assert.match(hub, /Does a louder SIREN reading mean AI is more dangerous/);
    assert.match(hub, /DoomBench/);
    assert.match(hub, /Skynet Countdown/);
    assert.match(hub, /PizzINT/);
    assert.match(hub, /SIREN 4/);
    assert.match(hub, /55\.5/);
    assert.match(hub, /Complementary \(not a doom index\)/);
    assert.match(hub, /artificialanalysis\.ai/);
    assert.match(hub, /\/vs\.html/);
    assert.match(hub, /Which AI indexes does SIREN contrast/);
    assert.match(hub, /\/methodology\.html/);
    assert.doesNotMatch(hub, /noindex/);

    const alt = alternatives(ctx);
    assert.match(alt, /<title>What are AI doom index alternatives\?/);
    assert.match(alt, /<h1>What are AI doom index alternatives\?<\/h1>/);
    assert.match(alt, /cmp__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(alt, /cmp__k">Alternatives<\/p>/);
    assert.match(alt, /SIREN vs DoomBench: which should you use\?/);
    assert.doesNotMatch(alt, /and what is each one\?/);
    assert.match(alt, /DoomBench alternative/i);
    assert.match(alt, /PizzINT/);
    assert.match(alt, /"@type"\s*:\s*"FAQPage"/);
    assert.match(alt, /Questions people actually ask/);
    assert.match(alt, /What is a good alternative to DoomBench/);
    assert.match(alt, /Artificial Analysis/);
    assert.match(alt, /artificialanalysis\.ai/);
    assert.match(alt, /Which AI doom indexes can you compare/);
    assert.match(alt, /\/compare\.html/);
    assert.doesNotMatch(alt, /noindex/);
  });


  it('keeps vs pages honest: no borrowed doom probability claim for SIREN', () => {
    const page = vsRival(ctx, 'doombench');
    assert.match(page, /<title>SIREN vs DoomBench: which should you use\?/);
    assert.match(page, /<h1>SIREN vs DoomBench: which should you use\?<\/h1>/);
    assert.match(page, /"name"\s*:\s*"SIREN vs DoomBench: which should you use\?"/);
    assert.match(page, /cmp__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.match(page, /href="\/vs\.html">Which AI indexes does SIREN contrast\?<\/a>/);
    assert.doesNotMatch(page, /cmp__k">Versus<\/p>/);
    assert.doesNotMatch(page, /"name"\s*:\s*"Compare"/);
    assert.doesNotMatch(page, /SIREN vs DoomBench — which should/);
    assert.match(page, /Questions people actually ask/);
    assert.match(page, /does not score takeover risk/i);
    assert.match(page, /recompute/i);
    assert.doesNotMatch(page, /SIREN.*p\(doom\) of \d/i);
    const pizza = vsRival(ctx, 'pizzint');
    assert.match(pizza, /<title>SIREN vs PizzINT: which should you use\?/);
    assert.match(pizza, /<h1>SIREN vs PizzINT: which should you use\?<\/h1>/);
    assert.match(pizza, /Questions people actually ask/);
    assert.match(pizza, /does not publish a DEFCON/i);
    assert.match(pizza, /Doomsday Clock/i);
    assert.doesNotMatch(pizza, /SIREN.*DEFCON \d/i);
    const takeoff = vsRival(ctx, 'takeofftracker');
    assert.match(takeoff, /<title>SIREN vs Takeoff Tracker: which should you use\?/);
    assert.match(takeoff, /<h1>SIREN vs Takeoff Tracker: which should you use\?<\/h1>/);
    assert.match(takeoff, /Questions people actually ask/);
    assert.match(takeoff, /does not publish an AGI timeline/i);
    assert.match(takeoff, /takeoff dashboard/i);
    assert.doesNotMatch(takeoff, /SIREN.*p\(doom\) of \d/i);
  });

  it('sitemaps every conquest URL', () => {
    const entries = sitemapEntries(ctx);
    assert.equal(entries.length, 3 + RIVALS.length);
    assert.ok(entries.every((e) => e.loc && e.lastmod && e.priority));
    assert.ok(entries.some((e) => e.loc === '/compare.html'));
    assert.ok(entries.some((e) => e.loc === '/vs.html'));
    assert.ok(entries.some((e) => e.loc === '/vs/doombench.html'));
  });

  it('ships /vs.html as a head-term directory with ItemList schema', () => {
    const html = vsHub(ctx);
    assert.match(html, /<title>Which AI indexes does SIREN contrast\?/);
    assert.match(html, /Which AI indexes does SIREN contrast/);
    assert.match(html, /cmp__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(html, /cmp__k">Versus<\/p>/);
    assert.match(html, /SIREN vs DoomBench: which should you use\?/);
    assert.match(html, /ItemList/);
    assert.match(html, /\/vs\/doombench\.html/);
    assert.match(html, /\/vs\/pizzint\.html/);
    assert.match(html, /\/vs\/takeofftracker\.html/);
    assert.match(html, /Takeoff Tracker/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /Questions people actually ask/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('returns empty for an unknown rival id', () => {
    assert.equal(vsRival(ctx, 'not-a-rival'), '');
  });
});
