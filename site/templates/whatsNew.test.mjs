// From cursor/fix-readers-archive-links-5c27, adapted: main fixed the dead
// /#readers link by keeping it off the What's New reel and by always rendering
// #readers on the homepage (an honest empty state). Pin both halves.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WHATS_NEW, navJs } from '../siteheader.mjs';
import { render } from './homeV2.mjs';

const base = {
  url: (p) => `https://siren.watch${p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-21T14:00:00Z', score: 50, level: 4, level_name: 'ROUTINE', pillars: [] },
  news: { items: [], generated_at: '2026-10-21T14:00:00Z', sources: [] },
};

describe("What's New", () => {
  it('never points at a homepage hash', () => {
    for (const [href] of WHATS_NEW) assert.ok(!href.startsWith('/#'), href);
    // A code comment may name the case; only a link to it would be a bug.
    assert.ok(!/['"]\/#readers['"]/.test(navJs([], '')));
  });

  it('the homepage keeps a #readers section even with no visitor data', () => {
    const html = render(base, { head: '<head></head>' });
    assert.match(html, /id="readers"/);
  });
});
