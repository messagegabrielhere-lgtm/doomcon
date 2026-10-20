import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { page } from './layout.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: {
    generated_at: '2026-10-14T15:00:00Z',
    score: 56.2,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    sources: [{ id: 'arxiv', ok: true }],
    pillars: [],
  },
  news: { items: [{ id: '1' }], generated_at: '2026-10-14T15:00:00Z', total: 1, sources: [{ ok: true }] },
  history: [{ score: 50 }],
  moves: [{ id: 'm1' }],
};

function shell(path) {
  return page({
    ctx,
    path,
    title: `Test · SIREN`,
    description: 'Layout sections question labels.',
    body: '<p>Body</p>',
  });
}

describe('layout agent use links (FINDABILITY #489)', () => {
  it('head points at skill.md and the plain-text reading', () => {
    const html = shell('/');
    const end = html.toLowerCase().indexOf('</head>');
    const head = html.slice(0, end);
    assert.match(head, /rel="alternate"[^>]*href="\/skill\.md"/);
    assert.match(head, /rel="alternate"[^>]*href="\/api\/now\.txt"/);
    assert.match(head, /rel="alternate"[^>]*href="\/\.well-known\/agent-skills\/index\.json"/);
    assert.match(head, /rel="alternate"[^>]*href="\/\.well-known\/mcp\/server-card\.json"/);
  });
});

describe('layout SECTIONS question labels', () => {
  it('footer Pages and next/prev use page H1 questions', () => {
    const html = shell('/news.html');
    const pages = html.match(/id="foot-pages"[\s\S]*?<\/ul>/);
    assert.ok(pages, 'expected footer Pages list');
    assert.match(
      pages[0],
      /href="\/">AI activity index today · AI activity level today · SIREN<\/a>/,
    );
    assert.doesNotMatch(pages[0], /href="\/">AI activity index today · SIREN<\/a>/);
    // #123: arena / elon stay off footer nav
    assert.doesNotMatch(pages[0], /href="\/arena\.html"/);
    assert.doesNotMatch(pages[0], /href="\/elon\.html"/);
    assert.match(pages[0], /href="\/news\.html"[^>]*>Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(pages[0], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(pages[0], /href="\/history\.html">What is the history of AI risk\?<\/a>/);
    assert.match(pages[0], /href="\/moves\/">Where are the SIREN index moves\?<\/a>/);
    assert.doesNotMatch(pages[0], /href="\/">Index<\/a>/);
    assert.doesNotMatch(pages[0], /href="\/news\.html"[^>]*>Newsroom<\/a>/);
    assert.doesNotMatch(pages[0], /href="\/arena\.html">Stock picks<\/a>/);
    assert.doesNotMatch(pages[0], /href="\/methodology\.html">Methodology<\/a>/);
    assert.doesNotMatch(pages[0], /href="\/moves\/">Archive<\/a>/);
    const nxt = html.match(/aria-label="More rooms"[\s\S]*?<\/nav>/);
    assert.ok(nxt, 'expected next/prev nav');
    assert.doesNotMatch(nxt[0], /href="\/arena\.html"|href="\/elon\.html"/);
    assert.doesNotMatch(nxt[0], /<b>Stock picks<\/b>|<b>Real Clips<\/b>|<b>Newsroom<\/b>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('pixel room banner keeps short chrome while footer keeps the question', () => {
    const html = shell('/news.html');
    const banner = html.match(/class="v2pt"[\s\S]*?<\/div>\s*<\/div>/);
    assert.ok(banner, 'expected pixel room banner');
    assert.match(banner[0], /class="v2-sr">News<\/span>/);
    assert.doesNotMatch(banner[0], /Which AI stories has SIREN scored/);
    const pages = html.match(/id="foot-pages"[\s\S]*?<\/ul>/);
    assert.ok(pages, 'expected footer Pages list');
    assert.match(pages[0], /Which AI stories has SIREN scored in this window\?/);
  });

  it('Data foot note points at instruments with the page H1 question (tip #256)', () => {
    const html = shell('/news.html');
    assert.match(
      html,
      /foot__note[\s\S]*href="\/instruments\.html#api">What instruments sit behind the SIREN reading\?<\/a>/,
    );
    assert.doesNotMatch(html, /href="\/instruments\.html#api">Public JSON API<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});

