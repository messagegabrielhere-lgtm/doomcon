import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  PEOPLE_INDEX_MIN,
  indexablePeople,
  peopleForItem,
  peoplePath,
  personIndexable,
  personStoryCount,
  renderIndex,
  renderPeople,
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
    assert.equal(personIndexable(ctx.leaders.leaders[0], ctx), true);
    assert.equal(personIndexable(ctx.leaders.leaders[1], ctx), false);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/people/'));
    assert.ok(locs.includes('/people.html'));
    assert.ok(locs.includes('/people/altman.html'));
    assert.ok(!locs.includes('/people/quiet.html'));
  });

  it('ships /people.html over the same gated people set', () => {
    const html = renderPeople(ctx);
    assert.match(html, /Which AI people has SIREN scored press about\?/);
    assert.match(html, /\/people\/altman\.html/);
    assert.match(html, /does not publish a person/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /\/companies\.html/);
    assert.match(html, /\/models\.html/);
    const index = renderIndex(ctx);
    assert.match(index, /Which AI leaders have press coverage pages on SIREN\?/);
    assert.match(index, /Questions people actually ask/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/people\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists headlines and refuses to invent quotations', () => {
    const html = renderPerson(ctx, 'altman');
    assert.match(html, /<title>Sam Altman: AI press coverage this week/);
    assert.match(html, /ProfilePage/);
    assert.match(html, /Sam Altman in the news 0/);
    assert.match(html, /never writes a quotation/i);
    assert.match(html, /\/people\.html/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score/i);
  });

  it('links older archived stories that name the person', () => {
    const withArch = {
      ...ctx,
      itemArchive: [{
        id: 'old-sa',
        title: 'Sam Altman discussed compute last month',
        summary: 'Coverage only.',
        pillar: 'attention',
        source: 'hn',
        url: 'https://example.test/old-sa',
        published_at: '2026-10-01T01:00:00Z',
        score: 50,
      }],
    };
    const html = renderPerson(withArch, 'altman');
    assert.match(html, /Older scored stories naming Sam Altman/);
    assert.match(html, /Sam Altman discussed compute last month/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('lets the durable archive keep a person hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        {
          id: 'q-old1',
          title: 'Quiet Person discussed research last month',
          summary: 'Coverage only.',
          pillar: 'attention',
          source: 'hn',
          url: 'https://example.test/q-old1',
          published_at: '2026-09-20T01:00:00Z',
          score: 40,
        },
        {
          id: 'q-old2',
          title: 'Quiet Person named in a follow-up',
          summary: 'Still coverage.',
          pillar: 'attention',
          source: 'hn',
          url: 'https://example.test/q-old2',
          published_at: '2026-09-21T01:00:00Z',
          score: 41,
        },
      ],
    };
    assert.ok(personStoryCount(withArch, withArch.leaders.leaders[1]) >= PEOPLE_INDEX_MIN);
    const ids = indexablePeople(withArch).map((p) => p.id);
    assert.ok(ids.includes('quiet'));
    assert.ok(ids.includes('altman'));
    const html = renderPerson(withArch, 'quiet');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories naming Quiet Person/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/people/quiet.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/people.html'));
  });

  it('links indexable people from story pages on a full-name match only', () => {
    ctx.leaders.leaders.push(leader('karp', 'Alex Karp', { headlines: 3, week: 8 }));
    const item = {
      id: 's1',
      title: 'Sam Altman met reporters about compute',
      // Surname overlap trap: "Karpathy" must not light up the Alex Karp page.
      summary: 'Andrej Karpathy was not in the room.',
      entities: [],
      pillar: 'attention',
      source: 'hn',
      url: 'https://example.test/s1',
      published_at: '2026-10-10T01:00:00Z',
      score: 40,
    };
    const names = peopleForItem(ctx, item).map((p) => p.id).sort();
    assert.deepEqual(names, ['altman']);
    const html = renderItem({ ...ctx, news: { generated_at: ctx.state.generated_at, items: [item] } }, item);
    assert.match(html, /href="\/people\/altman\.html"/);
    assert.doesNotMatch(html, /\/people\/karp\.html/);
  });
});
