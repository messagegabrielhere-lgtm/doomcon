import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KIND_INDEX_MIN,
  indexableKinds,
  kindPath,
  renderKind,
  renderIndex,
  renderKinds,
  sitemapEntries,
} from './kindPages.mjs';

function story(id, kind, title = `${kind} ${id}`) {
  return {
    id,
    title,
    kind,
    entities: [],
    pillar: 'capability',
    source: 'hn',
    url: `https://example.test/${id}`,
    published_at: '2026-10-10T01:00:00Z',
    score: 40,
  };
}

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE', pillars: [] },
  news: {
    generated_at: '2026-10-10T02:00:00Z',
    items: [
      ...Array.from({ length: 5 }, (_, i) => story(`p${i}`, 'paper')),
      story('f1', 'forum'),
      story('r1', 'press'),
    ],
  },
};

describe('kind pages', () => {
  it('pages a kind only after the substance gate', () => {
    const ids = indexableKinds(ctx).map((k) => k.id);
    assert.deepEqual(ids, ['paper']);
    assert.equal(KIND_INDEX_MIN, 5);
    assert.equal(kindPath('paper'), '/kind/paper.html');
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/kind/'));
    assert.ok(locs.includes('/kinds.html'));
    assert.ok(locs.includes('/kind/paper.html'));
    assert.ok(!locs.includes('/kind/forum.html'));
  });

  it('ships /kinds.html over the same gated kind set', () => {
    const html = renderKinds(ctx);
    assert.match(html, /AI story kinds this index covers/);
    assert.match(html, /\/kind\/paper\.html/);
    assert.match(html, /does not publish a kind/);
    assert.match(html, /\/tags\.html/);
    assert.match(renderIndex(ctx), /\/kinds\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderKind(ctx, 'paper');
    assert.match(html, /<title>Papers: AI stories this index scored/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /paper p0/);
    assert.match(html, /not a judgement about quality or harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score/i);
    assert.match(renderIndex(ctx), /AI story kinds/);
  });

  it('links older archived stories of the same kind', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'paper', 'Archived paper from last week'),
      ],
    };
    const html = renderKind(withArch, 'paper');
    assert.match(html, /Older scored papers/);
    assert.match(html, /Archived paper from last week/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('lets the durable archive keep a kind hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('f-old1', 'forum', 'Archived forum one'),
        story('f-old2', 'forum', 'Archived forum two'),
        story('f-old3', 'forum', 'Archived forum three'),
        story('f-old4', 'forum', 'Archived forum four'),
      ],
    };
    const ids = indexableKinds(withArch).map((k) => k.id);
    assert.ok(ids.includes('forum'));
    assert.ok(ids.includes('paper'));
    const html = renderKind(withArch, 'forum');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored forums/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/kind/forum.html'));
    assert.match(renderIndex(withArch), /live window or the durable archive/);
  });
});
