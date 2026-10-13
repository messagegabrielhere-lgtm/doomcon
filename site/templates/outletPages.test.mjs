import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  OUTLET_INDEX_MIN,
  outletDomain,
  outletSlug,
  outletPath,
  indexableOutlets,
  outletsForItem,
  renderOutlet,
  renderIndex,
  renderOutlets,
  sitemapEntries,
} from './outletPages.mjs';

function story(id, title, url, domain) {
  return {
    id,
    title,
    summary: '',
    entities: [],
    pillar: 'capability',
    source: 'hn',
    kind: 'press',
    url,
    published_at: '2026-10-10T01:00:00Z',
    score: 40,
    meta: domain ? { outlet_domain: domain } : {},
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
      story('a1', 'One', 'https://arxiv.org/abs/1', 'arxiv.org'),
      story('a2', 'Two', 'https://arxiv.org/abs/2', 'arxiv.org'),
      story('a3', 'Three', 'https://arxiv.org/abs/3', 'arxiv.org'),
      story('a4', 'Four', 'https://arxiv.org/abs/4', 'arxiv.org'),
      story('a5', 'Five', 'https://arxiv.org/abs/5', 'arxiv.org'),
      story('t1', 'Lonely', 'https://techcrunch.com/x', 'techcrunch.com'),
    ],
  },
};

describe('outlet pages', () => {
  it('pages a publisher only after the substance gate', () => {
    assert.equal(outletDomain(ctx.news.items[0]), 'arxiv.org');
    assert.equal(outletSlug('arxiv.org'), 'arxiv-org');
    assert.equal(outletPath('arxiv.org'), '/outlet/arxiv-org.html');
    const domains = indexableOutlets(ctx).map((o) => o.domain);
    // Exact domain equality — do not use String#includes on hostnames
    // (CodeQL js/incomplete-url-substring-sanitization).
    assert.equal(domains.some((d) => d === 'arxiv.org'), true);
    assert.equal(domains.some((d) => d === 'techcrunch.com'), false);
    assert.equal(OUTLET_INDEX_MIN, 5);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.equal(locs.some((l) => l === '/outlet/'), true);
    assert.equal(locs.some((l) => l === '/outlets.html'), true);
    assert.equal(locs.some((l) => l === '/outlet/arxiv-org.html'), true);
    assert.equal(locs.some((l) => l === '/outlet/techcrunch-com.html'), false);
  });

  it('ships /outlets.html over the same gated publisher set', () => {
    const html = renderOutlets(ctx);
    assert.match(html, /Which AI outlets has SIREN scored stories from\?/);
    assert.match(html, /\/outlet\/arxiv-org\.html/);
    assert.match(html, /does not publish a publisher/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /\/tags\.html/);
    assert.match(renderIndex(ctx), /\/outlets\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderOutlet(ctx, 'arxiv.org');
    assert.match(html, /<title>What has SIREN scored from arxiv\.org\?/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /not a probability of harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('renders the index and links from story pages', () => {
    const index = renderIndex(ctx);
    assert.match(index, /Which AI publishers have SIREN pages\?/);
    assert.match(index, /Questions people actually ask/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/outlet\/arxiv-org\.html/);
    const outs = outletsForItem(ctx, ctx.news.items[0]);
    assert.equal(outs.length, 1);
    const html = renderItem(ctx, ctx.news.items[0]);
    assert.match(html, /href="\/outlet\/arxiv-org\.html"/);
  });

  it('links older archived stories on the same publisher host', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'Older arxiv', 'https://arxiv.org/abs/9', 'arxiv.org'),
      ],
    };
    const html = renderOutlet(withArch, 'arxiv.org');
    assert.match(html, /Older scored stories on arxiv\.org/);
    assert.match(html, /Older arxiv/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('lets the durable archive keep a publisher hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('t-old1', 'Archived TC one', 'https://techcrunch.com/1', 'techcrunch.com'),
        story('t-old2', 'Archived TC two', 'https://techcrunch.com/2', 'techcrunch.com'),
        story('t-old3', 'Archived TC three', 'https://techcrunch.com/3', 'techcrunch.com'),
        story('t-old4', 'Archived TC four', 'https://techcrunch.com/4', 'techcrunch.com'),
      ],
    };
    const domains = indexableOutlets(withArch).map((o) => o.domain);
    assert.equal(domains.some((d) => d === 'techcrunch.com'), true);
    assert.equal(domains.some((d) => d === 'arxiv.org'), true);
    const row = indexableOutlets(withArch).find((o) => o.domain === 'techcrunch.com');
    assert.equal(row.count, 5);
    assert.equal(row.live, 1);
    assert.equal(row.archived, 4);
    const html = renderOutlet(withArch, 'techcrunch.com');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories on techcrunch\.com/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/outlet/techcrunch-com.html'));
    const index = renderIndex(withArch);
    assert.match(index, /live window or the durable archive/);
    assert.match(index, /techcrunch\.com/);
  });
});
