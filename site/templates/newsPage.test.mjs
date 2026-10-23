import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, hasNews } from './newsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T02:00:00Z',
    score: 49.1,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    pillars: [],
  },
  news: {
    generated_at: '2026-10-13T02:00:00Z',
    total: 3,
    items: [
      {
        id: 'a1',
        anchor: 'a1',
        rank: 1,
        title: 'OpenAI ships a model',
        summary: '',
        source: 'hn',
        pillar: 'capability',
        url: 'https://example.test/a1',
        published_at: '2026-10-12T12:00:00Z',
        score: 50,
        meta: {
          incident: {
            band: 'B',
            severity: 0.6,
            strong_signal: false,
            terms: [{ term: 'breach', weight: 2 }],
          },
        },
      },
      {
        id: 'a2',
        anchor: 'a2',
        rank: 2,
        title: 'Anthropic updates Claude',
        summary: '',
        source: 'reuters',
        pillar: 'attention',
        url: 'https://example.test/a2',
        published_at: '2026-10-12T11:00:00Z',
        score: 40,
      },
      {
        id: 'a3',
        anchor: 'a3',
        rank: 3,
        title: 'Microsoft Maia 300 chip',
        summary: '',
        source: 'gnews-ai',
        pillar: 'compute',
        url: 'https://example.test/a3',
        published_at: '2026-10-11T10:00:00Z',
        score: 39,
      },
    ],
    sources: [],
  },
};

describe('newsroom page', () => {
  it('guards builds without news', () => {
    assert.equal(hasNews(ctx), true);
    assert.equal(hasNews({}), false);
  });

  it('ships question-shaped title, speakable, and visible FAQ matching schema', () => {
    const html = render(ctx);
    assert.match(html, /<title>Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /<h1 class="narch__h1">Which AI stories has SIREN scored in this window\?<\/h1>/);
    assert.match(html, /"name"\s*:\s*"Which AI stories has SIREN scored in this window\?"/);
    assert.doesNotMatch(html, /"name"\s*:\s*"Newsroom"/);
    assert.match(html, /Which AI companies has SIREN scored stories about\?/);
    assert.match(html, /Which AI models has SIREN scored stories about\?/);
    assert.match(html, /Which AI people has SIREN scored press about\?/);
    assert.match(html, /Which AI tags has SIREN scored stories about\?/);
    assert.match(html, /Which AI story kinds has SIREN scored\?/);
    assert.match(html, /Which AI outlets has SIREN scored stories from\?/);
    assert.match(html, /What are the AI explainers\?/);
    assert.match(html, /Which AI indexes does SIREN contrast\?/);
    assert.match(html, /href="\/guides\.html"/);
    assert.match(html, /href="\/vs\.html"/);
    assert.doesNotMatch(html, /narch__days-links"><a href="\/companies\.html">Companies<\/a>/);
    assert.doesNotMatch(html, /narch__days-links"><a href="\/tags\.html">Tags<\/a>/);
    assert.match(html, /nlg__n"><a href="\/pillar\/capability\.html">What has SIREN scored under Capability\?<\/a>/);
    assert.match(html, /nlg__n"><a href="\/pillar\/attention\.html">What has SIREN scored under Attention\?<\/a>/);
    assert.match(html, /nlg__n"><a href="\/pillar\/compute\.html">What has SIREN scored under Compute &amp; Capital\?<\/a>/);
    assert.doesNotMatch(html, /nlg__n"><a href="\/pillar\/capability\.html">Capability<\/a>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /Does SIREN publish a newsroom doom score\?/);
    assert.match(html, /id="areel-h"[^>]*>Which items scored highest in this window\?/);
    assert.match(html, /id="corp-h"[^>]*>How are the scores spread in this window\?/);
    assert.match(html, /id="arch-h"[^>]*>Which scored items are in this window\?/);
    assert.match(html, /id="arch-src-h"[^>]*>Where did these scored stories come from\?/);
    assert.match(html, /class="vh">How do you filter the scored list\?<\/h3>/);
    assert.doesNotMatch(html, /class="vh">Filter the list<\/h3>/);
    assert.match(html, /"name"\s*:\s*"How do you filter the scored list\?"/);
    assert.match(html, /id="ntier-h">Which incident terms fired in this window\?<\/h3>/);
    assert.match(html, /"name"\s*:\s*"Which incident terms fired in this window\?"/);
    assert.doesNotMatch(html, /id="ntier-h">Incident terms fired on/);
    assert.doesNotMatch(html, /id="areel-h"[^>]*>Highest-scoring items</);
    assert.doesNotMatch(html, /id="arch-h"[^>]*>All items</);
    assert.doesNotMatch(html, /id="arch-src-h"[^>]*>Where these came from</);
    assert.match(html, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology/);
    assert.doesNotMatch(html, /href="\/methodology\.html">Read the methodology/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.match(html, /OpenAI ships a model/);
  });
});

describe('newsroom list weight', () => {
  const many = {
    ...ctx,
    news: {
      ...ctx.news,
      total: 130,
      items: Array.from({ length: 130 }, (_, i) => ({
        id: `b${i}`, anchor: `b${i}`, rank: i + 1, title: `Story number ${i + 1}`, summary: 'A summary line.',
        source: i % 2 ? 'hn' : 'reuters', pillar: i % 3 ? 'attention' : 'capability',
        url: `https://example.test/b${i}`, published_at: '2026-10-12T12:00:00Z', score: 90 - i * 0.5,
      })),
    },
  };
  const html = render(many);
  const list = html.slice(html.indexOf('<ol class="nfeed narch__list">'), html.indexOf('</ol>', html.indexOf('<ol class="nfeed narch__list">')));
  it('keeps full rows for the top 60 and compact rows after', () => {
    assert.equal((list.match(/class="nrow"/g) || []).length, 60);
    assert.equal((list.match(/class="nrow nrow--c"/g) || []).length, 70);
    assert.match(list, /<li class="nrow--sep">Ranks 61–130, one line each/);
  });
  it('compact rows keep the anchor, filter hooks, the breakdown link and the source link', () => {
    const row = list.slice(list.indexOf('id="i-b128"'));
    assert.match(row, /data-pillar="attention"/);
    assert.match(row, /href="\/item\/[^"]+\.html"/);
    assert.match(row, /href="https:\/\/example\.test\/b128"/);
    assert.match(row, /Story number 129/);
  });
});

describe('newsroom first screen', () => {
  it('folds the hub directories so stories come first', () => {
    const html = render(ctx);
    assert.match(html, /<details class="narch__dirs">\s*<summary>Browse by day, topic, outlet and more<\/summary>/);
  });
});
