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
    assert.match(html, /Which AI story kinds has SIREN scored\?/);
    assert.match(html, /What has SIREN scored as Papers\?/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI story kinds have SIREN pages\?/);
    assert.match(html, /kd__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(html, /kd__k"><a href="\/compare\.html">Compare<\/a>/);
    assert.doesNotMatch(html, /kd__k"><a href="\/kind\/">Kinds<\/a>/);
    assert.match(html, /\/kind\/paper\.html/);
    assert.match(html, /does not publish a kind/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /\/tags\.html/);
    const index = renderIndex(ctx);
    assert.match(index, /Which AI story kinds have SIREN pages\?/);
    assert.match(index, /What has SIREN scored as Papers\?/);
    assert.match(index, /Which AI stories has SIREN scored in this window\?/);
    assert.match(index, /kd__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(index, /kd__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.match(index, /What questions do people actually ask\?/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/kinds\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderKind(ctx, 'paper');
    assert.match(html, /<title>What has SIREN scored as Papers\?/);
    assert.match(html, /<h1>What has SIREN scored as Papers\?<\/h1>/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /Which AI story kinds have SIREN pages\?/);
    assert.match(html, /Which AI story kinds has SIREN scored\?/);
    assert.match(html, /kd__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /kd__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /kd__k"><a href="\/kind\/">Kinds<\/a>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /id="window"[^>]*>Which scored papers are in this window\?/);
    assert.match(html, /paper p0/);
    assert.match(html, /not a judgement about quality or harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /<h2>Papers in this window<\/h2>/);
    assert.doesNotMatch(html, /<h2>Other kinds<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.match(renderIndex(ctx), /Which AI story kinds have SIREN pages\?/);
  });

  it('links older archived stories of the same kind', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'paper', 'Archived paper from last week'),
      ],
    };
    const html = renderKind(withArch, 'paper');
    assert.match(html, /id="older"[^>]*>Which older scored papers are kept\?/);
    assert.match(html, /Archived paper from last week/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored papers<\/h2>/);
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
    assert.match(html, /id="older"[^>]*>Which older scored forums are kept\?/);
    assert.doesNotMatch(html, /<h2>Older scored forums<\/h2>/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/kind/forum.html'));
    assert.match(renderIndex(withArch), /live window or the durable archive/);
  });
});
