import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DAY_INDEX_MIN,
  dayPath,
  indexableDays,
  renderDay,
  sitemapEntries,
} from './dayPages.mjs';

function story(id, day, title = `Story ${id}`) {
  return {
    id,
    title,
    pillar: 'capability',
    source: 'hn',
    url: `https://example.test/${id}`,
    published_at: `${day}T12:00:00Z`,
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
      ...Array.from({ length: 5 }, (_, i) => story(`a${i}`, '2026-10-10')),
      story('b1', '2026-10-09'),
      story('b2', '2026-10-09'),
    ],
  },
};

describe('news day hubs', () => {
  it('pages a UTC day only after five scored stories', () => {
    const days = indexableDays(ctx).map((d) => d.day);
    assert.deepEqual(days, ['2026-10-10']);
    assert.equal(DAY_INDEX_MIN, 5);
    assert.equal(dayPath('2026-10-10'), '/news/2026-10-10.html');
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/news/2026-10-10.html'));
    assert.ok(!locs.includes('/news/2026-10-09.html'));
  });

  it('lists the day\'s stories with CollectionPage schema', () => {
    const html = renderDay(ctx, '2026-10-10');
    assert.match(html, /<title>Which AI stories did SIREN score on 2026-10-10\?/);
    assert.match(html, /<h1>Which AI stories did SIREN score on 2026-10-10\?<\/h1>/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /nd__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /nd__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /nd__k">[^<]*· Day</);
    assert.match(html, /id="window"[^>]*>Which scored stories are in the live window\?/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /Story a0/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /not a forecast and not a probability of harm/);
    assert.doesNotMatch(html, /<h2>In this window<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('links other indexable days with question-shaped sibling anchors', () => {
    const withPeer = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          ...ctx.news.items,
          ...Array.from({ length: 5 }, (_, i) => story(`c${i}`, '2026-10-09')),
        ],
      },
    };
    const html = renderDay(withPeer, '2026-10-10');
    assert.match(html, /id="other-days"[^>]*>Which other days have scored stories\?/);
    assert.match(html, /Which AI stories did SIREN score on 2026-10-09\?/);
    assert.match(html, /href="\/news\/2026-10-09\.html"/);
    assert.doesNotMatch(html, /<h2>Other days<\/h2>/);
    assert.doesNotMatch(html, /nd__nav"[^>]*>[\s\S]*?>2026-10-09 <span/);
  });

  it('links older archived stories from the same UTC day', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', '2026-10-10', 'Archived story from that morning'),
      ],
    };
    const html = renderDay(withArch, '2026-10-10');
    assert.match(html, /id="older"[^>]*>Which older scored stories are from 2026-10-10\?/);
    assert.match(html, /Archived story from that morning/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored stories from 2026-10-10<\/h2>/);
  });
});
