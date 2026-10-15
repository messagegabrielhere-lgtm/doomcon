import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countLocs,
  isSitemapIndex,
  extractTitle,
  decodeTitleEntities,
  extractSchemaTypes,
  hasNoindex,
  newestNewsPublicationMs,
  NEWS_STALE_HOURS,
  deriveGaps,
  measureSite,
  formatMarkdown,
  OPEN_ENGINEERING,
  OUR_SURFACES,
  CORE_LIVE_SURFACES,
  VS_SHORT_ALIASES,
  hasVsShortAliases,
  FACET_URL_FLOOR,
  readLocalReadyUrls,
} from '../tools/seo-daily.mjs';

describe('seo-daily parsers', () => {
  it('counts sitemap locs and detects indexes', () => {
    assert.equal(countLocs('<urlset><url><loc>https://a/1</loc></url><url><loc>https://a/2</loc></url></urlset>'), 2);
    assert.equal(countLocs(''), 0);
    assert.equal(isSitemapIndex('<sitemapindex><sitemap><loc>https://a/s.xml</loc></sitemap></sitemapindex>'), true);
    assert.equal(isSitemapIndex('<urlset><url><loc>https://a/1</loc></url></urlset>'), false);
  });

  it('extracts title and JSON-LD types', () => {
    const html = `<title>\n  AI activity index today · SIREN\n</title>
      <script type="application/ld+json">{"@type":"WebSite"}</script>
      <script type="application/ld+json">{"@graph":[{"@type":["FAQPage","BreadcrumbList"]}]}</script>`;
    assert.equal(extractTitle(html), 'AI activity index today · SIREN');
    assert.equal(extractTitle('<title>A &amp; B &#xB7; C</title>'), 'A & B · C');
    assert.equal(decodeTitleEntities('pizzint &amp; DEFCON'), 'pizzint & DEFCON');
    assert.deepEqual(extractSchemaTypes(html), ['BreadcrumbList', 'FAQPage', 'WebSite']);
  });

  it('detects noindex', () => {
    assert.equal(hasNoindex('<meta name="robots" content="noindex, follow">'), true);
    assert.equal(hasNoindex('<meta name="description" content="x">'), false);
  });

  it('parses newest news:publication_date (FINDABILITY #97)', () => {
    const xml = `<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
      <url><news:publication_date>2026-10-14T12:00:00.000Z</news:publication_date></url>
      <url><news:publication_date>2026-10-14T18:55:00.000Z</news:publication_date></url>
      <url><news:publication_date>2026-10-14T15:00:00.000Z</news:publication_date></url>
    </urlset>`;
    assert.equal(newestNewsPublicationMs(xml), Date.parse('2026-10-14T18:55:00.000Z'));
    assert.equal(newestNewsPublicationMs('<urlset></urlset>'), null);
    assert.ok(NEWS_STALE_HOURS >= 6);
  });
});

describe('seo-daily measure + gaps', () => {
  it('measures a site from a fetch map', () => {
    const byUrl = new Map([
      ['https://siren.watch/', { ok: true, value: '<title>SIREN</title><script type="application/ld+json">{"@type":"Dataset"}</script>' }],
      ['https://siren.watch/sitemap.xml', { ok: true, value: '<urlset><url><loc>https://siren.watch/a</loc></url></urlset>' }],
      ['https://siren.watch/news-sitemap.xml', { ok: true, value: '<urlset><url><loc>https://siren.watch/item/a</loc></url></urlset>' }],
      ['https://siren.watch/robots.txt', { ok: true, value: 'User-agent: *\nAllow: /\n' }],
      ['https://siren.watch/llms.txt', { ok: true, value: '# SIREN\n' }],
    ]);
    const row = measureSite(
      { id: 'siren', name: 'siren.watch', origin: 'https://siren.watch', ours: true },
      byUrl,
    );
    assert.equal(row.ok, true);
    assert.equal(row.sitemap_urls, 1);
    assert.equal(row.news_sitemap_urls, 1);
    assert.equal(row.llms_ok, true);
    assert.deepEqual(row.schema_types, ['Dataset']);
  });

  it('flags rival URL lead, empty news sitemap, and dead surfaces', () => {
    const gaps = deriveGaps({
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 400, news_sitemap_urls: 0, schema_types: [],
        },
        {
          id: 'doombench', name: 'DoomBench', ours: false, ok: true,
          title: 'x', sitemap_urls: 2000, news_sitemap_urls: null, schema_types: [],
        },
      ],
      surfaces: [{ path: '/agents.md', ok: false, status: 500 }],
      open_engineering: OPEN_ENGINEERING.slice(0, 1),
    });
    const ids = gaps.map((g) => g.id);
    assert.ok(ids.includes('news-sitemap-empty'));
    assert.ok(ids.includes('trail-doombench-urls'));
    assert.ok(ids.includes('surface-/agents.md'));
    assert.ok(ids.includes('open-gsc-verify'));
  });

  it('flags stale news-sitemap when newest publication_date is old (FINDABILITY #97)', () => {
    const gaps = deriveGaps({
      measured_at: '2026-10-15T02:30:00.000Z',
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 6200, news_sitemap_urls: 200,
          news_newest_publication_at: '2026-10-14T18:55:00.000Z',
          schema_types: [],
        },
      ],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'news-stale'), gaps.map((g) => g.id).join(','));
    const fresh = deriveGaps({
      measured_at: '2026-10-15T02:30:00.000Z',
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 6200, news_sitemap_urls: 200,
          news_newest_publication_at: '2026-10-15T01:00:00.000Z',
          schema_types: [],
        },
      ],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(!fresh.some((g) => g.id === 'news-stale'));
  });

  it('flags deploy-pending when local Ready dwarfs live sitemap and suppresses trail gaps', () => {
    const gaps = deriveGaps({
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 693, news_sitemap_urls: 100, schema_types: [],
        },
        {
          id: 'doombench', name: 'DoomBench', ours: false, ok: true,
          title: 'x', sitemap_urls: 2090, news_sitemap_urls: null, schema_types: [],
        },
      ],
      local_ready: { live: 800, archived: 5000, facets: 230, estimated_sitemap: 6030 },
      surfaces: [
        { path: '/companies.html', ok: false, status: 404 },
        { path: '/tags/agents.html', ok: false, status: 404 },
        { path: '/llms.txt', ok: false, status: 500 },
      ],
      open_engineering: [],
    });
    const ids = gaps.map((g) => g.id);
    assert.ok(ids.includes('deploy-pending-url-lead'));
    assert.ok(!ids.includes('trail-doombench-urls'));
    assert.ok(!ids.includes('url-count-low'));
    assert.ok(ids.includes('surfaces-awaiting-deploy'), 'undeployed hubs collapse to one gap');
    assert.ok(!ids.includes('surface-/companies.html'));
    assert.ok(ids.includes('surface-/llms.txt'), 'core live surfaces stay high-severity');
    assert.ok(CORE_LIVE_SURFACES.includes('/llms.txt'));
    assert.ok(OUR_SURFACES.includes('/methodology.html'));
    assert.ok(OUR_SURFACES.includes('/news.html'));
    assert.ok(OUR_SURFACES.includes('/countries.html'));
  });

  it('reads local Ready estimate from news + archive + facets', async () => {
    assert.ok(FACET_URL_FLOOR >= 450);
    const ready = await readLocalReadyUrls();
    assert.ok(ready);
    assert.ok(ready.live > 0);
    assert.ok(ready.archived > 0);
    assert.ok(ready.facets >= FACET_URL_FLOOR);
    assert.equal(ready.estimated_sitemap, ready.live + ready.archived + ready.facets);
    assert.ok(ready.estimated_sitemap >= 2000);
  });

  it('renders markdown scoreboard', () => {
    const md = formatMarkdown({
      measured_at: '2026-10-12T12:00:00.000Z',
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'SIREN', sitemap_urls: 600, news_sitemap_urls: 40,
        schema_types: ['WebSite'], llms_ok: true,
      }],
      surfaces: [{ path: '/llms.txt', ok: true, bytes: 1200 }],
      local_ready: { live: 800, archived: 5000, facets: 230, estimated_sitemap: 6030 },
      gaps: [{ id: 'x', severity: 'low', text: 'example' }],
    });
    assert.match(md, /SEO scoreboard/);
    assert.match(md, /\*\*siren\.watch\*\*/);
    assert.match(md, /Local tree/);
    assert.match(md, /6030/);
    assert.match(md, /example/);
  });
});

describe('seo-daily surfaces', () => {
  it('monitors gated facet hubs added for URL growth', () => {
    assert.ok(OUR_SURFACES.includes('/tags/agents.html'));
    assert.ok(OUR_SURFACES.includes('/tags.html'));
    assert.ok(OUR_SURFACES.includes('/kinds.html'));
    assert.ok(OUR_SURFACES.includes('/outlets.html'));
    assert.ok(OUR_SURFACES.includes('/people.html'));
    assert.ok(OUR_SURFACES.includes('/kind/press.html'));
    assert.ok(OUR_SURFACES.includes('/companies.html'));
    assert.ok(OUR_SURFACES.includes('/models.html'));
    assert.ok(OUR_SURFACES.includes('/pillars.html'));
    assert.ok(OUR_SURFACES.includes('/sources.html'));
    assert.ok(OUR_SURFACES.includes('/lab/'));
    assert.ok(OUR_SURFACES.includes('/pillar/'));
    assert.ok(OUR_SURFACES.includes('/vs.html'));
    assert.ok(OUR_SURFACES.includes('/guides.html'));
    assert.ok(OUR_SURFACES.includes('/guides.md'));
  });

  it('monitors conquest short aliases as core live + agent-map lines (FINDABILITY #119)', () => {
    for (const p of VS_SHORT_ALIASES) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), p);
      assert.ok(OUR_SURFACES.includes(p), p);
    }
    const body = VS_SHORT_ALIASES.map((p) => `short ${p}`).join('\n');
    assert.equal(hasVsShortAliases(body), true);
    assert.equal(hasVsShortAliases('/vs/doom.html\n/vs/skynet.html\n'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_vs_aliases: false, llms_vs_aliases: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-vs-aliases-missing'));
  });
});
