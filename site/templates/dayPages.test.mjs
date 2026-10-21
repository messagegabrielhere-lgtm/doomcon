import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DAY_INDEX_MIN,
  closingReading,
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

  it('puts archive-only day stories into ItemList so schema matches visible HTML', () => {
    const archiveOnly = {
      ...ctx,
      news: { generated_at: '2026-10-14T12:00:00Z', items: [] },
      itemArchive: Array.from({ length: 5 }, (_, i) => (
        story(`arch${i}`, '2026-10-01', `Archive-only day story ${i}`)
      )),
    };
    assert.ok(indexableDays(archiveOnly).some((d) => d.day === '2026-10-01'));
    const html = renderDay(archiveOnly, '2026-10-01');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Archive-only day story 0/);
    assert.match(html, /"numberOfItems"\s*:\s*5/);
    assert.match(html, /Archive-only day story 0/);
    // ItemList name fields mirror the visible older list (not an empty live window).
    assert.match(html, /"name"\s*:\s*"Archive-only day story 0"/);
    assert.match(html, /"name"\s*:\s*"Archive-only day story 4"/);
  });
  it('prints the closing reading for the UTC day from history, mirrored in FAQ', () => {
    const withHist = {
      ...ctx,
      history: [
        { t: '2026-10-09T23:00:00Z', score: 40.1, level: 4, degraded: false },
        { t: '2026-10-10T01:00:00Z', score: 55.0, level: 3, degraded: false },
        { t: '2026-10-10T22:00:00Z', score: 57.25, level: 3, degraded: false },
        { t: '2026-10-10T23:00:00Z', score: 99, level: 1, backfilled: true },
      ],
    };
    const r = closingReading(withHist, '2026-10-10');
    assert.equal(r.score, 57.25);
    assert.equal(r.level, 3);
    assert.equal(r.level_name, 'ELEVATED');
    assert.equal(r.count, 2);
    const html = renderDay(withHist, '2026-10-10');
    assert.match(html, /id="reading"[^>]*>What was the SIREN reading at the close of 2026-10-10\?/);
    assert.match(html, /SIREN 3 \(ELEVATED\), composite 57\.3 of 100 at 2026-10-10 22:00:00 UTC/);
    assert.match(html, /"name"\s*:\s*"What was the SIREN reading at the close of 2026-10-10\?"/);
    assert.match(html, /"dateModified"\s*:\s*"2026-10-10T22:00:00Z"/);
    assert.match(html, /href="\/alerts\.html">How do I get alerts when SIREN moves\?/);
    assert.match(html, /not probability of harm/);
    const para = html.match(/id="day-reading">([^<]*)</)[1];
    assert.doesNotMatch(para, /\b(will|expect|predict|imminent|soon|coming|warns|forecast|likely)\b/i);
  });

  it('falls back to the live state for today and never imputes a missing day', () => {
    const r = closingReading(ctx, '2026-10-10');
    assert.equal(r.score, 56.2);
    assert.equal(r.level_name, 'ROUTINE');
    assert.equal(closingReading(ctx, '2026-10-09'), null);
    const html = renderDay(ctx, '2026-10-09');
    assert.doesNotMatch(html, /id="reading"/);
    assert.doesNotMatch(html, /reading at the close of/);
  });
});
