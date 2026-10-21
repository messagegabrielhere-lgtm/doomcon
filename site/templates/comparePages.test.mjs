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
    const aliasCount = RIVALS.reduce((n, r) => n + (r.aliases || []).length, 0);
    assert.equal(pages.length, 3 + RIVALS.length + aliasCount);
    assert.ok(pages.every((p) => p.html && /<!doctype html>/i.test(p.html)));
    assert.ok(pages.some((p) => p.path === 'compare.html'));
    assert.ok(pages.some((p) => p.path === 'alternatives.html'));
    assert.ok(pages.some((p) => p.path === 'vs.html'));
    for (const rival of RIVALS) {
      assert.ok(pages.some((p) => p.path === rival.path.replace(/^\//, '')));
      for (const alias of rival.aliases || []) {
        assert.ok(pages.some((p) => p.path === alias.replace(/^\//, '')));
      }
    }
  });

  it('ships short vs aliases with canonical on the primary rival path', () => {
    const pages = renderAll(ctx);
    const entries = sitemapEntries(ctx);
    const cases = [
      ['vs/skynet.html', '/vs/skynet-countdown.html', 'SIREN vs Skynet Countdown: which should you use?'],
      ['vs/doom.html', '/vs/doombench.html', 'SIREN vs DoomBench: which should you use?'],
      ['vs/takeoff.html', '/vs/takeofftracker.html', 'SIREN vs Takeoff Tracker: which should you use?'],
    ];
    for (const [aliasPath, primary, h1] of cases) {
      const alias = pages.find((p) => p.path === aliasPath);
      assert.ok(alias, `expected ${aliasPath} alias file`);
      assert.match(alias.html, new RegExp(`rel="canonical" href="https://siren\\.watch${primary.replace(/\./g, '\\.')}"`));
      assert.match(alias.html, new RegExp(`<h1>${h1.replace(/[?]/g, '\\$&')}<\\/h1>`));
      assert.doesNotMatch(alias.html, new RegExp(`rel="canonical" href="https://siren\\.watch/${aliasPath}"`));
      assert.ok(entries.some((e) => e.loc === primary));
      assert.ok(!entries.some((e) => e.loc === `/${aliasPath}`), `${aliasPath} stays out of sitemap`);
    }
  });

  it('ships root rival typed-guess aliases with canonical on /vs/* (FINDABILITY #131)', () => {
    const pages = renderAll(ctx);
    const entries = sitemapEntries(ctx);
    const cases = [
      ['doombench.html', '/vs/doombench.html'],
      ['doom.html', '/vs/doombench.html'],
      ['skynet-countdown.html', '/vs/skynet-countdown.html'],
      ['skynet.html', '/vs/skynet-countdown.html'],
      ['pizzint.html', '/vs/pizzint.html'],
      ['takeofftracker.html', '/vs/takeofftracker.html'],
      ['takeoff.html', '/vs/takeofftracker.html'],
    ];
    for (const [aliasPath, primary] of cases) {
      const alias = pages.find((p) => p.path === aliasPath);
      assert.ok(alias, `expected root alias ${aliasPath}`);
      assert.ok(
        alias.html.includes(`rel="canonical" href="https://siren.watch${primary}"`),
        `${aliasPath} canonical → ${primary}`,
      );
      assert.ok(!entries.some((e) => e.loc === `/${aliasPath}`), `${aliasPath} stays out of sitemap`);
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
    assert.match(hub, /What questions do people actually ask\?/);
    assert.match(hub, /What is the difference between SIREN and DoomBench/);
    assert.match(hub, /Does a louder SIREN reading mean AI is more dangerous/);
    assert.match(hub, /"dateModified"\s*:\s*"2026-10-10T14:00:00Z"/);
    assert.match(hub, /article:modified_time/);    assert.match(hub, /DoomBench/);
    assert.match(hub, /Skynet Countdown/);
    assert.match(hub, /PizzINT/);
    assert.match(hub, /SIREN 4/);
    assert.match(hub, /55\.5/);
    assert.match(hub, /id="cmp-side-h">How do they compare side by side\?<\/h2>/);
    assert.match(hub, /id="cmp-pick-h">Which rival should you pick\?<\/h2>/);
    assert.match(hub, /id="cmp-comp-h">Which complementary instruments are not doom indexes\?<\/h2>/);
    assert.match(hub, /id="cmp-also-h">What else is on this site\?<\/h2>/);
    assert.match(hub, /FAQPage[\s\S]*How do they compare side by side\?/);
    assert.doesNotMatch(hub, /id="cmp-side-h">Side by side<\/h2>/);
    assert.doesNotMatch(hub, /id="cmp-comp-h">Which complementary index is not a doom index\?<\/h2>/);
    assert.match(hub, /artificialanalysis\.ai/);
    assert.match(hub, /ai-2027\.com/);
    assert.match(hub, /AI 2027/);
    assert.match(hub, /\/vs\.html/);
    assert.match(hub, /Which AI indexes does SIREN contrast/);
    assert.match(hub, /\/methodology\.html/);
    // FINDABILITY #453 — dual middot head terms beside live home.
    assert.match(hub, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    // FINDABILITY #127 — how-to head term in visible FAQ + description.
    assert.match(hub, /How do you compare AI doom indexes\?/);
    assert.match(hub, /content="Which AI doom indexes can you compare\? How do you compare AI doom indexes\?/);
    assert.doesNotMatch(hub, /href="\/">Live dial →<\/a>/);
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
    assert.match(alt, /What questions do people actually ask\?/);
    assert.match(alt, /What is a good alternative to DoomBench/);
    // FINDABILITY #126 — singular head term in visible FAQ + description.
    assert.match(alt, /What is an AI doom index alternative\?/);
    assert.match(alt, /hourly AI activity index/);
    assert.match(alt, /content="What are AI doom index alternatives\? What is an AI doom index alternative\?/);
    assert.match(alt, /id="alt-right-h">When is SIREN the right alternative\?<\/h2>/);
    assert.match(alt, /id="alt-wrong-h">When is SIREN the wrong alternative\?<\/h2>/);
    assert.match(alt, /id="alt-one-h">Where is one page per rival\?<\/h2>/);
    assert.match(alt, /id="alt-all-h">Where can you compare everything\?<\/h2>/);
    assert.doesNotMatch(alt, /id="alt-right-h">When SIREN is the right alternative<\/h2>/);
    assert.match(alt, /Artificial Analysis/);
    assert.match(alt, /artificialanalysis\.ai/);
    assert.match(alt, /AI 2027/);
    assert.match(alt, /ai-2027\.com/);
    assert.match(alt, /detailed written AGI scenario/);
    assert.match(alt, /Which AI doom indexes can you compare/);
    assert.match(alt, /\/compare\.html/);
    // FINDABILITY #453 — dual middot head terms beside live home.
    assert.match(alt, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
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
    assert.match(page, /What questions do people actually ask\?/);
    assert.match(page, /does not score takeover risk/i);
    assert.match(page, /recompute/i);
    assert.match(page, /id="vs-each-h">What is each one\?<\/h2>/);
    assert.match(page, /id="vs-next-h">Where should you go next\?<\/h2>/);
    assert.match(page, /<h3>What is DoomBench\?<\/h3>/);
    assert.match(page, /<h3>What is SIREN\?<\/h3>/);
    assert.match(page, /FAQPage[\s\S]*What is DoomBench\?/);
    assert.match(page, /FAQPage[\s\S]*What is SIREN\?/);
    assert.doesNotMatch(page, /<h3>DoomBench<\/h3>/);
    assert.doesNotMatch(page, /<h3>SIREN<\/h3>/);
    assert.doesNotMatch(page, /id="vs-each-h">What each one is<\/h2>/);
    assert.doesNotMatch(page, /id="vs-next-h">Where to go next<\/h2>/);
    // FINDABILITY #453 — dual middot head terms on vs pages (shared liveStrip).
    assert.match(page, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    assert.doesNotMatch(page, /href="\/">Current SIREN reading →<\/a>/);
    assert.doesNotMatch(page, /SIREN.*p\(doom\) of \d/i);
    const pizza = vsRival(ctx, 'pizzint');
    assert.match(pizza, /<title>SIREN vs PizzINT: which should you use\?/);
    assert.match(pizza, /<h1>SIREN vs PizzINT: which should you use\?<\/h1>/);
    assert.match(pizza, /What questions do people actually ask\?/);
    assert.match(pizza, /does not publish a DEFCON/i);
    assert.match(pizza, /Doomsday Clock/i);
    assert.doesNotMatch(pizza, /SIREN.*DEFCON \d/i);
    const takeoff = vsRival(ctx, 'takeofftracker');
    assert.match(takeoff, /<title>SIREN vs Takeoff Tracker: which should you use\?/);
    assert.match(takeoff, /<h1>SIREN vs Takeoff Tracker: which should you use\?<\/h1>/);
    assert.match(takeoff, /What questions do people actually ask\?/);
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
    assert.match(html, /What questions do people actually ask\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('returns empty for an unknown rival id', () => {
    assert.equal(vsRival(ctx, 'not-a-rival'), '');
  });

  it('compare Also-on-this-site embed link uses the export question, not noindex embed', () => {
    const hub = compareHub(ctx);
    assert.match(hub, /href="\/export\.html#embed">How do I export and embed SIREN data\? →<\/a>/);
    assert.doesNotMatch(hub, /href="\/embed\.html">Embed the live reading →<\/a>/);
    assert.doesNotMatch(hub, /doom score:\s*\d/i);
    assert.doesNotMatch(hub, /probability of doom/i);
  });

  it('vs related sibling links use page H1 questions, not bare path stems', () => {
    const pdoom = vsRival(ctx, 'pdoom');
    assert.match(pdoom, /href="\/p-doom\.html">What is p\(doom\)\? →<\/a>/);
    assert.match(pdoom, /href="\/ai-doomsday-clock\.html">Is there an AI doomsday clock\? →<\/a>/);
    assert.doesNotMatch(pdoom, /href="\/p-doom\.html">p-doom →<\/a>/);
    assert.doesNotMatch(pdoom, /href="\/ai-doomsday-clock\.html">ai-doomsday-clock →<\/a>/);
    const pizza = vsRival(ctx, 'pizzint');
    assert.match(pizza, /href="\/guide\.html">How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\? →<\/a>/);
    assert.doesNotMatch(pizza, /href="\/guide\.html">guide →<\/a>/);
    const takeoff = vsRival(ctx, 'takeofftracker');
    assert.match(takeoff, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology →<\/a>/);
    assert.doesNotMatch(takeoff, /href="\/methodology\.html">methodology →<\/a>/);
    assert.doesNotMatch(pdoom, /doom score:\s*\d/i);
    assert.doesNotMatch(pdoom, /probability of doom is \d/i);
  });
});
