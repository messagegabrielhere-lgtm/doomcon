import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  MODEL_INDEX_MIN,
  indexableModels,
  modelPath,
  renderModel,
  sitemapEntries,
} from './modelPages.mjs';

function story(id, title, entities) {
  return {
    id,
    title,
    entities,
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
      story('c1', 'Claude one', ['Claude']),
      story('c2', 'Claude two', ['Claude', 'Anthropic']),
      story('c3', 'Claude three', ['Claude']),
      story('g1', 'Grok once', ['Grok']),
    ],
  },
  race: {
    players: [{ id: 'anthropic', name: 'Anthropic' }],
  },
};

describe('model pages', () => {
  it('pages a model family only after three scored stories', () => {
    const names = indexableModels(ctx).map((m) => m.name);
    assert.deepEqual(names, ['Claude']);
    assert.equal(MODEL_INDEX_MIN, 3);
    assert.equal(modelPath('Claude'), '/model/claude.html');
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/model/'));
    assert.ok(locs.includes('/model/claude.html'));
    assert.ok(!locs.includes('/model/grok.html'));
  });

  it('lists the stories and the lab page, and does not invent a model score', () => {
    const html = renderModel(ctx, 'Claude');
    assert.match(html, /<title>Claude: AI stories this index scored/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /Claude one/);
    assert.match(html, /\/lab\/anthropic\.html/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /not a rating of the model/);
    assert.doesNotMatch(html, /doom score/i);
  });

  it('links an indexable model from the story page and leaves a thin name as text', () => {
    const claude = renderItem(ctx, ctx.news.items[0]);
    assert.match(claude, /href="\/model\/claude\.html"/);
    const grok = renderItem(ctx, ctx.news.items[3]);
    assert.doesNotMatch(grok, /\/model\/grok\.html/);
    assert.match(grok, /Names in this headline: Grok/);
  });
});