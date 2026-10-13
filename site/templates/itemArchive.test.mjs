import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARCHIVE_PAGE_SIZE,
  archivePageCount,
  archivePagePath,
  archiveSitemapEntries,
  renderArchivePage,
  renderIndex,
} from './itemPage.mjs';

function story(id, title) {
  return {
    id,
    title,
    summary: 'scored',
    entities: [],
    pillar: 'capability',
    source: 'hn',
    kind: 'press',
    url: `https://example.test/${id}`,
    published_at: '2026-10-01T01:00:00Z',
    score: 40,
  };
}

const archived = Array.from({ length: 250 }, (_, i) => story(`a${i}`, `Archived ${i}`));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-12T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE', pillars: [] },
  news: {
    generated_at: '2026-10-12T02:00:00Z',
    items: [story('live1', 'Live one'), story('live2', 'Live two')],
  },
  itemArchive: archived,
  itemArchiveMeta: { updated_at: '2026-10-12T02:00:00Z', total: archived.length },
};

describe('item archive hubs', () => {
  it('paginates the durable archive and keeps the live index light', () => {
    assert.equal(ARCHIVE_PAGE_SIZE, 100);
    assert.equal(archivePageCount(ctx), 3);
    assert.equal(archivePagePath(1), '/item/archive.html');
    assert.equal(archivePagePath(2), '/item/archive-2.html');
    const index = renderIndex(ctx);
    assert.match(index, /Which scored AI stories are in the SIREN live window\?/);
    assert.match(index, /Live one/);
    assert.doesNotMatch(index, /Archived 0/);
    assert.match(index, /\/item\/archive\.html/);
    assert.match(index, /Questions people actually ask/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.doesNotMatch(index, /doom score:\s*\d/i);
    const page1 = renderArchivePage(ctx, 1);
    assert.match(page1, /Which older AI stories has SIREN kept in the archive\?/);
    assert.match(page1, /Archived 0/);
    assert.match(page1, /ItemList/);
    assert.match(page1, /Questions people actually ask/);
    assert.match(page1, /"@type"\s*:\s*"FAQPage"/);
    assert.match(page1, /speakable/);
    assert.match(page1, /not a probability of harm/);
    assert.doesNotMatch(page1, /noindex/);
    assert.doesNotMatch(page1, /doom score:\s*\d/i);
    const locs = archiveSitemapEntries(ctx).map((e) => e.loc);
    assert.deepEqual(locs, ['/item/archive.html', '/item/archive-2.html', '/item/archive-3.html']);
  });
});
