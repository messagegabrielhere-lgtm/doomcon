import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PEOPLE_INDEX_MIN,
  indexablePeople,
  peoplePath,
  personIndexable,
  renderPerson,
  sitemapEntries,
} from './peoplePages.mjs';

function leader(id, name, { headlines = 3, week = 10, lines = 0 } = {}) {
  return {
    id,
    name,
    role: 'CEO',
    org: 'Example Labs',
    org_id: 'openai',
    state: lines ? 'on_record' : 'no_line',
    count: lines,
    lines: Array.from({ length: lines }, (_, i) => ({
      item_id: `${id}-line-${i}`,
      headline: `${name} spoke about AI ${i}`,
      source: 'gnews-ai',
      url: `https://example.test/${id}-${i}`,
      published_at: '2026-10-10T12:00:00Z',
    })),
    coverage: {
      count_7d: week,
      count_24h: 1,
      headlines: Array.from({ length: headlines }, (_, i) => ({
        title: `${name} in the news ${i}`,
        outlet: 'Example',
        url: `https://example.test/cov/${id}-${i}`,
        published_at: '2026-10-09T12:00:00Z',
      })),
    },
  };
}

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE', pillars: [] },
  leaders: {
    generated_at: '2026-10-10T02:00:00Z',
    window_days: 7,
    leaders: [
      leader('altman', 'Sam Altman', { headlines: 4, week: 20, lines: 1 }),
      leader('quiet', 'Quiet Person', { headlines: 1, week: 1, lines: 0 }),
    ],
  },
};

describe('people pages', () => {
  it('pages a person only after enough coverage', () => {
    const ids = indexablePeople(ctx).map((p) => p.id);
    assert.deepEqual(ids, ['altman']);
    assert.equal(PEOPLE_INDEX_MIN, 3);
    assert.equal(peoplePath('altman'), '/people/altman.html');
    assert.equal(personIndexable(ctx.leaders.leaders[0]), true);
    assert.equal(personIndexable(ctx.leaders.leaders[1]), false);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/people/'));
    assert.ok(locs.includes('/people/altman.html'));
    assert.ok(!locs.includes('/people/quiet.html'));
  });

  it('lists headlines and refuses to invent quotations', () => {
    const html = renderPerson(ctx, 'altman');
    assert.match(html, /<title>Sam Altman: AI press coverage this week/);
    assert.match(html, /ProfilePage/);
    assert.match(html, /Sam Altman in the news 0/);
    assert.match(html, /never writes a quotation/i);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score/i);
  });
});
