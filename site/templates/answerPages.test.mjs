import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, SLUGS, render, sitemapEntries } from './answerPages.mjs';
import { BANNED_FUTURE_WORDS, BANNED_FUTURE_EXTENDED, BANNED_FUTURE_PHRASES } from '../../collector/posts.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p}`,
  href: (p) => p,
  state: { score: 53.4, level: 4, level_name: 'ROUTINE', generated_at: '2026-11-14T15:00:00Z',
    pillars: [{ id: 'compute', name: 'Compute & Capital', score: 58.5 }, { id: 'capability', name: 'Capability', score: 40.4 }] },
  news: { items: [{ id: 'x', title: 'Pentagon pizza orders spike', published_at: '2026-11-14T10:00:00Z' }] },
};

test('every answer page renders with its question as H1 and title, indexable', () => {
  for (const slug of SLUGS) {
    const html = render(ctx, slug);
    const h1 = PAGES[slug].h1.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    assert.ok(html.includes('<h1>'), slug);
    assert.match(html, /FAQPage/);
    assert.match(html, /BreadcrumbList/);
    assert.doesNotMatch(html, /noindex/);
    assert.ok(html.includes('53.4'), `${slug} shows the live reading`);
    assert.ok(h1.length > 10);
  }
});

test('answer copy obeys the future-tense ban (VOICE.md §3)', () => {
  const words = [...BANNED_FUTURE_WORDS, ...BANNED_FUTURE_EXTENDED];
  for (const [slug, t] of Object.entries(PAGES)) {
    const text = [t.h1, t.description, ...t.sections.flat(), ...t.faq.flat()].join(' ').replace(/<[^>]+>/g, ' ');
    for (const w of words) assert.doesNotMatch(text, new RegExp(`\\b${w}\\b`, 'i'), `${slug}: ${w}`);
    for (const p of BANNED_FUTURE_PHRASES) assert.doesNotMatch(text, new RegExp(`\\b${p.replace(/ /g, '\\s+')}\\b`, 'i'), `${slug}: ${p}`);
  }
});

test('sitemap lists all four pages', () => {
  assert.deepEqual(sitemapEntries(ctx).map((e) => e.loc), SLUGS.map((s) => `/${s}.html`));
});
