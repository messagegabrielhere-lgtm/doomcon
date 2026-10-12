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
    assert.equal(locs.some((l) => l === '/outlet/arxiv-org.html'), true);
    assert.equal(locs.some((l) => l === '/outlet/techcrunch-com.html'), false);
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderOutlet(ctx, 'arxiv.org');
    assert.match(html, /<title>arxiv\.org: AI stories this index scored/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /not a probability of harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score/i);
  });

  it('renders the index and links from story pages', () => {
    const index = renderIndex(ctx);
    assert.match(index, /AI publishers/);
    assert.match(index, /\/outlet\/arxiv-org\.html/);
    const outs = outletsForItem(ctx, ctx.news.items[0]);
    assert.equal(outs.length, 1);
    const html = renderItem(ctx, ctx.news.items[0]);
    assert.match(html, /href="\/outlet\/arxiv-org\.html"/);
  });
});
