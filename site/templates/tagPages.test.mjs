import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  TAG_INDEX_MIN,
  TOPIC_DEFS,
  indexableTags,
  tagPath,
  tagsForItem,
  renderTag,
  renderIndex,
  sitemapEntries,
} from './tagPages.mjs';

function story(id, title, summary = '') {
  return {
    id,
    title,
    summary,
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
      story('a1', 'New AI agents ship computer use'),
      story('a2', 'Agentic workflow tools expand'),
      story('a3', 'Enterprise AI agents go live'),
      story('a4', 'Tool-use demos impress labs'),
      story('a5', 'Autonomous agents in production'),
      story('g1', 'One GPU headline alone'),
    ],
  },
};

describe('tag pages', () => {
  it('pages a topic only after the substance gate', () => {
    const ids = indexableTags(ctx).map((t) => t.id);
    assert.ok(ids.includes('agents'));
    assert.ok(!ids.includes('gpus'));
    assert.equal(TAG_INDEX_MIN, 5);
    assert.equal(tagPath('agents'), '/tags/agents.html');
    assert.ok(TOPIC_DEFS.length >= 5);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/tags/'));
    assert.ok(locs.includes('/tags/agents.html'));
    assert.ok(!locs.includes('/tags/gpus.html'));
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderTag(ctx, 'agents');
    assert.match(html, /<title>AI agents: AI stories this index scored/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /New AI agents ship computer use/);
    assert.match(html, /not a probability of harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score/i);
  });

  it('renders the tag index and links from story pages', () => {
    const index = renderIndex(ctx);
    assert.match(index, /AI news tags/);
    assert.match(index, /\/tags\/agents\.html/);
    const tags = tagsForItem(ctx, ctx.news.items[0]);
    assert.ok(tags.some((t) => t.id === 'agents'));
    const html = renderItem(ctx, ctx.news.items[0]);
    assert.match(html, /href="\/tags\/agents\.html"/);
  });

  it('links older archived stories that match the tag needle', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'Archived AI agents story from last week'),
      ],
    };
    const html = renderTag(withArch, 'agents');
    assert.match(html, /Older scored stories tagged AI agents/);
    assert.match(html, /Archived AI agents story/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('lets the durable archive keep a tag hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          story('w1', 'OpenAI enables opt-in text watermarking'),
          story('w2', 'Lab ships watermark detector API'),
        ],
      },
      itemArchive: [
        story('w-old1', 'Archived watermark research paper'),
        story('w-old2', 'Archived watermark policy brief'),
        story('w-old3', 'Archived watermarking rollout note'),
      ],
    };
    const ids = indexableTags(withArch).map((t) => t.id);
    assert.ok(ids.includes('watermarking'));
    const html = renderTag(withArch, 'watermarking');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories tagged AI watermarking/);
  });

  it('indexes coding and acquisitions when the live gate clears', () => {
    const rich = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          story('c1', 'AI coding agents beat SWE-bench baseline'),
          story('c2', 'New coding agent ships for enterprise'),
          story('c3', 'Copilot AI coding tools expand'),
          story('c4', 'Devin coding agent update'),
          story('c5', 'Vibe coding workflow lands in IDEs'),
          story('m1', 'Lab announces acquisition of rival startup'),
          story('m2', 'Big tech acqui-hire of research team'),
          story('m3', 'Startup acquires smaller model shop'),
          story('m4', 'Chip firm bought by hyperscaler'),
          story('m5', 'Merger with AI infrastructure vendor'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('coding'));
    assert.ok(ids.includes('acquisitions'));
    assert.match(renderTag(rich, 'coding'), /AI coding: AI stories this index scored/);
    assert.match(renderTag(rich, 'acquisitions'), /AI acquisitions: AI stories this index scored/);
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'coding'));
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'acquisitions'));
  });
});
