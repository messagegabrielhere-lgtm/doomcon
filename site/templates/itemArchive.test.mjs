import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARCHIVE_PAGE_SIZE,
  archivePageCount,
  archivePagePath,
  archiveSitemapEntries,
  render,
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
    assert.match(index, /Which AI stories has SIREN scored in this window\?/);
    assert.match(index, /it__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(index, /it__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(index, /it__k">[^<]*· Live window</);
    assert.match(index, /Live one/);
    assert.doesNotMatch(index, /Archived 0/);
    assert.match(index, /\/item\/archive\.html/);
    assert.match(index, /What questions do people actually ask\?/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.doesNotMatch(index, /doom score:\s*\d/i);
    const page1 = renderArchivePage(ctx, 1);
    assert.match(page1, /Which older AI stories has SIREN kept in the archive\?/);
    assert.match(page1, /Which AI stories has SIREN scored in this window\?/);
    assert.match(page1, /Which scored AI stories are in the SIREN live window\?/);
    assert.match(page1, /it__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(page1, /href="\/item\/">Which scored AI stories are in the SIREN live window\?<\/a>/);
    assert.doesNotMatch(page1, /it__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(page1, /href="\/item\/">Live window<\/a>/);
    assert.match(page1, /Archived 0/);
    assert.match(page1, /ItemList/);
    assert.match(page1, /What questions do people actually ask\?/);
    assert.match(page1, /"@type"\s*:\s*"FAQPage"/);
    assert.match(page1, /speakable/);
    assert.match(page1, /not a probability of harm/);
    assert.doesNotMatch(page1, /noindex/);
    assert.doesNotMatch(page1, /doom score:\s*\d/i);
    const locs = archiveSitemapEntries(ctx).map((e) => e.loc);
    assert.deepEqual(locs, ['/item/archive.html', '/item/archive-2.html', '/item/archive-3.html']);
  });

  it('item pages use question-shaped newsroom and pillar sibling crumbs', () => {
    const html = render(ctx, ctx.news.items[0]);
    assert.match(html, /<h1 class="it__h">Live one<\/h1>/);
    assert.match(html, /class="it__next"/);
    assert.match(html, /href="\/charts\.html">What AI charts does SIREN publish\?<\/a>/);
    assert.match(html, /href="\/">AI activity index today<\/a>/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /What has SIREN scored under Capability\?/);
    assert.match(html, /it__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(html, /href="\/pillar\/capability\.html">What has SIREN scored under Capability\?<\/a>/);
    assert.doesNotMatch(html, /it__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /href="\/pillar\/capability\.html">Capability<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('item pages use question-shaped section H2s and FAQPage', () => {
    const html = render(ctx, ctx.news.items[0], [ctx.news.items[1]]);
    assert.match(html, /id="it-score"[^>]*>What is the score on this story\?/);
    assert.match(html, /id="it-corr"[^>]*>How many sources carried this story\?/);
    assert.match(html, /id="it-rel"[^>]*>Which related stories are in this window\?/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /Live two/);
    assert.doesNotMatch(html, /<h2 id="it-score">The score<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="it-rel">Related in this window<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
