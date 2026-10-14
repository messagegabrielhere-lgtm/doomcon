import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countLocs,
  isSitemapIndex,
  extractTitle,
  extractSchemaTypes,
  hasNoindex,
  deriveGaps,
  measureSite,
  formatMarkdown,
  OPEN_ENGINEERING,
  OUR_SURFACES,
  FACET_URL_FLOOR,
  countLocalFacetUrls,
  readLocalReadyUrls,
} from '../tools/seo-daily.mjs';

describe('seo-daily parsers', () => {
  it('monitors conquest and entity hub surfaces until deploy catches up', () => {
    assert.ok(OUR_SURFACES.includes('/vs.html'));
    assert.ok(OUR_SURFACES.includes('/vs/takeofftracker.html'));
    assert.ok(OUR_SURFACES.includes('/guides.html'));
    assert.ok(OUR_SURFACES.includes('/guides.md'));
    assert.ok(OUR_SURFACES.includes('/tags.html'));
    assert.ok(OUR_SURFACES.includes('/companies.html'));
    assert.ok(OUR_SURFACES.includes('/models.html'));
    assert.ok(OUR_SURFACES.includes('/people.html'));
    assert.ok(OUR_SURFACES.includes('/countries.html'));
    assert.ok(OUR_SURFACES.includes('/compare.html'));
    assert.ok(OUR_SURFACES.includes('/history.html'));
    assert.ok(OUR_SURFACES.includes('/lab/artificial-analysis.html'));
    assert.ok(OUR_SURFACES.includes('/about.html'));
    assert.ok(OUR_SURFACES.includes('/privacy.html'));
    assert.ok(OUR_SURFACES.includes('/press.html'));
    assert.ok(OUR_SURFACES.includes('/terms.html'));
    assert.ok(OUR_SURFACES.includes('/disclosures.html'));
    assert.ok(OUR_SURFACES.includes('/brand.html'));
    assert.ok(OUR_SURFACES.includes('/lab/salesforce.html'));
    assert.ok(OUR_SURFACES.includes('/lab/world-labs.html'));
    assert.ok(OUR_SURFACES.includes('/model/nano-banana.html'));
    assert.ok(OUR_SURFACES.includes('/model/jev.html'));
    assert.ok(OUR_SURFACES.includes('/model/dots.html'));
    assert.ok(OUR_SURFACES.includes('/model/embeddinggemma.html'));
    assert.ok(OUR_SURFACES.includes('/model/synthid.html'));
    assert.ok(OUR_SURFACES.includes('/model/clef.html'));
    assert.ok(OUR_SURFACES.includes('/lab/typesafe.html'));
    assert.ok(OUR_SURFACES.includes('/lab/mcdonald-s.html'));
    assert.ok(OUR_SURFACES.includes('/lab/walmart.html'));
    assert.ok(OUR_SURFACES.includes('/lab/netflix.html'));
    assert.ok(OUR_SURFACES.includes('/tags/on-policy.html'));
    assert.ok(OUR_SURFACES.includes('/tags/long-horizon.html'));
    assert.ok(OUR_SURFACES.includes('/tags/compositional.html'));
    assert.ok(OUR_SURFACES.includes('/tags/latent.html'));
    assert.ok(OUR_SURFACES.includes('/tags/autoregressive.html'));
    assert.ok(OUR_SURFACES.includes('/tags/simulation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reward-model.html'));
    assert.ok(OUR_SURFACES.includes('/tags/graph-neural.html'));
    assert.ok(OUR_SURFACES.includes('/tags/generalization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/uncertainty.html'));
    assert.ok(OUR_SURFACES.includes('/tags/calibration.html'));
    assert.ok(OUR_SURFACES.includes('/tags/conformal.html'));
    assert.ok(OUR_SURFACES.includes('/tags/trajectory.html'));
    assert.ok(OUR_SURFACES.includes('/tags/causal.html'));
    assert.ok(OUR_SURFACES.includes('/tags/federated.html'));
    assert.ok(OUR_SURFACES.includes('/tags/counterfactual.html'));
    assert.ok(OUR_SURFACES.includes('/tags/retrieval.html'));
    assert.ok(OUR_SURFACES.includes('/tags/3d.html'));
    assert.ok(OUR_SURFACES.includes('/tags/personalization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/pruning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/steering.html'));
    assert.ok(OUR_SURFACES.includes('/tags/prefill.html'));
    assert.ok(OUR_SURFACES.includes('/tags/financial.html'));
    assert.ok(OUR_SURFACES.includes('/tags/evaluation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/serving.html'));
    assert.ok(OUR_SURFACES.includes('/tags/bayesian.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reliability.html'));
    assert.ok(OUR_SURFACES.includes('/jobs.html'));
    assert.ok(OUR_SURFACES.includes('/medicine.html'));
  });

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
    assert.deepEqual(extractSchemaTypes(html), ['BreadcrumbList', 'FAQPage', 'WebSite']);
  });

  it('decodes title entities in one pass without chained unescaping', () => {
    assert.equal(
      extractTitle('<title>DEFCON &amp; Doomsday Clock</title>'),
      'DEFCON & Doomsday Clock',
    );
    assert.equal(
      extractTitle('<title>A &amp;lt; B &#39;quote&#39;</title>'),
      'A &lt; B \'quote\'',
    );
  });

  it('detects noindex', () => {
    assert.equal(hasNoindex('<meta name="robots" content="noindex, follow">'), true);
    assert.equal(hasNoindex('<meta name="description" content="x">'), false);
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

  it('prefers deploy-pending when the local tree already beats rivals', () => {
    const gaps = deriveGaps({
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 683, news_sitemap_urls: 100, schema_types: [],
        },
        {
          id: 'doombench', name: 'DoomBench', ours: false, ok: true,
          title: 'x', sitemap_urls: 2088, news_sitemap_urls: null, schema_types: [],
        },
      ],
      local_ready: { live: 800, archived: 5000, estimated_sitemap: 6250 },
      surfaces: [],
      open_engineering: [],
    });
    const ids = gaps.map((g) => g.id);
    assert.ok(ids.includes('deploy-pending-url-lead'));
    assert.ok(!ids.includes('trail-doombench-urls'));
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
      gaps: [{ id: 'x', severity: 'low', text: 'example' }],
    });
    assert.match(md, /SEO scoreboard/);
    assert.match(md, /\*\*siren\.watch\*\*/);
    assert.match(md, /example/);
  });

  it('counts local facet sitemap rows and keeps a floor on the ready estimate', async () => {
    assert.equal(FACET_URL_FLOOR, 450);
    const facets = await countLocalFacetUrls();
    assert.ok(Number.isFinite(facets) && facets >= 300, `facet count ${facets}`);
    // world.json + routes.world must be wired so /country/* rows are counted
    // (countryPages.sitemapEntries returns [] without them). Real count should
    // clear the floor once countries are included (~70 gated ISO pages).
    assert.ok(facets > FACET_URL_FLOOR, `facet count with countries ${facets}`);
    const ready = await readLocalReadyUrls();
    assert.ok(ready);
    assert.ok(ready.live >= 100);
    assert.ok(ready.archived >= 1000);
    assert.ok(ready.facets >= FACET_URL_FLOOR);
    assert.ok(ready.facets === facets || ready.facets === FACET_URL_FLOOR);
    assert.equal(ready.estimated_sitemap, ready.live + ready.archived + ready.facets);
  });
});
