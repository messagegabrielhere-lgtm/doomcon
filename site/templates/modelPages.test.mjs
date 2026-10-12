import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  MODEL_INDEX_MIN,
  indexableModels,
  modelPath,
  renderModel,
  renderIndex,
  renderModels,
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
    assert.ok(locs.includes('/models.html'));
    assert.ok(locs.includes('/model/claude.html'));
    assert.ok(!locs.includes('/model/grok.html'));
  });

  it('ships /models.html over the same gated model set', () => {
    const html = renderModels(ctx);
    assert.match(html, /AI models this index covers/);
    assert.match(html, /\/model\/claude\.html/);
    assert.match(html, /does not publish a model/);
    assert.match(html, /\/companies\.html/);
    assert.match(renderIndex(ctx), /\/models\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
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

  it('links older archived stories naming the model', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'Archived Claude model card', ['Claude']),
      ],
    };
    const html = renderModel(withArch, 'Claude');
    assert.match(html, /Older scored stories naming Claude/);
    assert.match(html, /Archived Claude model card/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('links an indexable model from the story page and leaves a thin name as text', () => {
    const claude = renderItem(ctx, ctx.news.items[0]);
    assert.match(claude, /href="\/model\/claude\.html"/);
    const grok = renderItem(ctx, ctx.news.items[3]);
    assert.doesNotMatch(grok, /\/model\/grok\.html/);
    assert.match(grok, /Names in this headline: Grok/);
  });

  it('lets the durable archive keep a model hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('g-old1', 'Archived Grok launch', ['Grok']),
        story('g-old2', 'Archived Grok update', ['Grok']),
      ],
    };
    const names = indexableModels(withArch).map((m) => m.name);
    assert.ok(names.includes('Grok'));
    assert.ok(names.includes('Claude'));
    const html = renderModel(withArch, 'Grok');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories naming Grok/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/model/grok.html'));
  });

  it('indexes DeepSeek-R from title/summary forms when archive only carries the lab entity', () => {
    const withArch = {
      ...ctx,
      news: { generated_at: ctx.state.generated_at, items: [] },
      itemArchive: [
        story('d1', 'DeepSeek accelerates push into embodied AI', ['DeepSeek']),
        story('d2', 'DeepSeek-R1 beats prior open baseline', ['DeepSeek']),
        story('d3', 'Labs react to DeepSeek V3 release', ['DeepSeek']),
      ],
    };
    const names = indexableModels(withArch).map((m) => m.name);
    assert.ok(names.includes('DeepSeek-R'));
    const html = renderModel(withArch, 'DeepSeek-R');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /DeepSeek accelerates/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/model/deepseek-r.html'));
  });

  it('indexes Mixtral from Mistral Large style surface forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('m1', 'Mistral Large ships a new checkpoint', []),
          story('m2', 'Mixtral MoE serving guide', []),
          story('m3', 'Codestral update for coding agents', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Mixtral'));
    assert.match(renderModel(rich, 'Mixtral'), /Mistral Large ships/);
  });

  it('indexes Muse Wonder from title/summary forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('mw1', 'Meta launches Muse Wonder AI models', []),
          story('mw2', 'Muse Wonder Full outperforms rivals on a public leaderboard', []),
          story('mw3', 'Developers try Muse Wonder for agent workflows', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Muse Wonder'));
    const html = renderModel(rich, 'Muse Wonder');
    assert.match(html, /Muse Wonder: AI stories this index scored|Muse Wonder/);
    assert.doesNotMatch(html, /doom score/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/muse-wonder.html'));
  });
});