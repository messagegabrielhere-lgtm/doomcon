import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KIND_INDEX_MIN,
  indexableKinds,
  kindPath,
  renderKind,
  renderIndex,
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
    assert.ok(locs.includes('/kind/paper.html'));
    assert.ok(!locs.includes('/kind/forum.html'));
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
});
