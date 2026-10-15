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
  TRENDS_SHORT_ALIAS,
  hasTrendsShortAlias,
  PDOOM_SHORT_ALIAS,
  hasPdoomShortAlias,
  ROOT_RIVAL_AGENT_ALIASES,
  hasRootRivalAliases,
  HEAD_TERM_AGENT_ALIASES,
  hasHeadTermAliases,
  LAB_ABOUT_AGENT_NEEDLE,
  LAB_ABOUT_AGENT_URL,
  hasLabAboutLabels,
  LAB_HUB_LABEL_PROBES,
  labHubLabelLags,
  hasHomeLabAboutLabels,
  hasRaceLabAboutLabels,
  NEWS_LAB_ALIAS_PROBES,
  newsLabAliasKeywordLags,
  hasWattsIrenFaq,
  hasAgentsIrenWatts,
  WATTS_IREN_FAQ_NEEDLE,
  hasMicronDramFaq,
  hasAgentsMicronDram,
  MICRON_DRAM_FAQ_NEEDLE,
  hasCoreweaveStockFaq,
  hasCoreweaveDebtFaq,
  hasAgentsCoreweave,
  COREWEAVE_STOCK_FAQ_NEEDLE,
  COREWEAVE_DEBT_FAQ_NEEDLE,
  hasNeocloudFaq,
  hasAgentsNeocloud,
  NEOCLOUD_FAQ_NEEDLE,
  hasTrendsRoutesFaq,
  TRENDS_ROUTES_FAQ_NEEDLE,
  hasNvidiaNvdaFaq,
  hasAgentsNvidia,
  NVIDIA_NVDA_FAQ_NEEDLE,
  hasOpenaiLawsuitFaq,
  hasAgentsOpenaiLawsuit,
  OPENAI_LAWSUIT_FAQ_NEEDLE,
  hasAnthropicIpoFaq,
  hasAgentsAnthropicIpo,
  ANTHROPIC_IPO_FAQ_NEEDLE,
  hasNowTips,
  LAB_HEAD_TITLE_PROBES,
  labHeadAliasLags,
  CONQUEST_FAQ_PROBES,
  conquestFaqLags,
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

  it('monitors Outrank dir aliases + /trends short alias (FINDABILITY #124)', () => {
    for (const p of ['/verify/', '/free-tools/', '/search-trends/', '/trends.html', '/trends/']) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), `CORE_LIVE missing ${p}`);
    }
  });

  it('monitors /pdoom typed-guess alias (FINDABILITY #129)', () => {
    for (const p of ['/pdoom.html', '/pdoom/']) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), `CORE_LIVE missing ${p}`);
    }
  });

  it('monitors root rival typed-guess aliases (FINDABILITY #131)', () => {
    for (const p of [
      '/doombench.html', '/doom.html',
      '/skynet-countdown.html', '/skynet.html',
      '/pizzint.html',
      '/takeofftracker.html', '/takeoff.html',
    ]) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), `CORE_LIVE missing ${p}`);
    }
  });

  it('monitors doomsday-clock / ai-doom / doom-index aliases (FINDABILITY #133)', () => {
    for (const p of [
      '/doomsday-clock.html', '/ai-doom.html',
      '/doom-index.html', '/ai-doom-index.html',
    ]) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), `CORE_LIVE missing ${p}`);
    }
  });

  it('detects missing /pdoom.html in agent maps (FINDABILITY #130)', () => {
    assert.equal(PDOOM_SHORT_ALIAS, '/pdoom.html');
    assert.equal(hasPdoomShortAlias('short alias /pdoom.html'), true);
    assert.equal(hasPdoomShortAlias('/p-doom.html only'), false);
    // FINDABILITY #135 — conquest primary must not false-positive the short.
    assert.equal(hasPdoomShortAlias('/vs/pdoom.html only'), false);
    assert.equal(hasPdoomShortAlias('/vs/pdoom.html\n/pdoom.html'), true);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_pdoom_alias: false, llms_pdoom_alias: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-pdoom-alias-missing'));
  });

  it('detects missing root rival aliases in agent maps (FINDABILITY #132)', () => {
    assert.deepEqual(ROOT_RIVAL_AGENT_ALIASES, [
      '/doombench.html', '/skynet-countdown.html', '/pizzint.html', '/takeofftracker.html',
    ]);
    assert.equal(hasRootRivalAliases(ROOT_RIVAL_AGENT_ALIASES.join('\n')), true);
    assert.equal(hasRootRivalAliases('/doombench.html\n/vs/doom.html'), false);
    // FINDABILITY #135 — /vs/<brand>.html alone must not clear the gap.
    assert.equal(hasRootRivalAliases([
      '/vs/doombench.html', '/vs/skynet-countdown.html',
      '/vs/pizzint.html', '/vs/takeofftracker.html',
    ].join('\n')), false);
    assert.equal(hasRootRivalAliases([
      '/vs/doombench.html', '/doombench.html',
      '/skynet-countdown.html', '/pizzint.html', '/takeofftracker.html',
    ].join('\n')), true);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_root_rivals: false, llms_root_rivals: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-root-rivals-missing'));
  });

  it('detects missing head-term short aliases in agent maps (FINDABILITY #134)', () => {
    assert.deepEqual(HEAD_TERM_AGENT_ALIASES, [
      '/doomsday-clock.html', '/ai-doom.html', '/doom-index.html',
    ]);
    assert.equal(hasHeadTermAliases(HEAD_TERM_AGENT_ALIASES.join('\n')), true);
    assert.equal(hasHeadTermAliases('/doomsday-clock.html\n/guide.html'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_head_aliases: false, llms_head_aliases: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-head-aliases-missing'));
  });

  it('detects missing labAboutLabel in llms.txt (FINDABILITY #139)', () => {
    assert.equal(LAB_ABOUT_AGENT_URL, '/lab/openai.html');
    assert.equal(LAB_ABOUT_AGENT_NEEDLE, 'OpenAI / ChatGPT');
    assert.equal(hasLabAboutLabels(`${LAB_ABOUT_AGENT_NEEDLE}\n${LAB_ABOUT_AGENT_URL}`), true);
    assert.equal(hasLabAboutLabels(`What has SIREN scored about OpenAI?\n${LAB_ABOUT_AGENT_URL}`), false);
    // agents.md has no lab URLs — not a wipe.
    assert.equal(hasLabAboutLabels('Fetch first\n/api/now.txt'), true);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        llms_lab_about_labels: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-lab-labels-missing'));
  });

  it('detects missing labAboutLabel on /lab/ + companies hubs (FINDABILITY #141)', () => {
    assert.deepEqual(LAB_HUB_LABEL_PROBES.map((p) => p.path), ['/lab/', '/companies.html']);
    const byUrl = new Map([
      ['https://siren.watch/lab/', {
        ok: true,
        value: '<a href="/lab/openai.html">What has SIREN scored about OpenAI?</a>',
      }],
      ['https://siren.watch/companies.html', {
        ok: true,
        value: '<a href="/lab/openai.html">What has SIREN scored about OpenAI / ChatGPT?</a>',
      }],
    ]);
    const lags = labHubLabelLags(byUrl);
    assert.ok(lags.some((r) => r.path === '/lab/'));
    assert.equal(lags.some((r) => r.path === '/companies.html'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        lab_hub_label_lags: lags,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'lab-hub-labels-missing'));
  });

  it('detects missing home knowsAbout labAboutLabel (FINDABILITY #143)', () => {
    assert.equal(hasHomeLabAboutLabels('OpenAI / ChatGPT'), true);
    assert.equal(hasHomeLabAboutLabels('What has SIREN scored about OpenAI'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_lab_about_labels: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-knowsabout-labels-missing'));
  });

  it('detects missing race board labAboutLabel (FINDABILITY #144)', () => {
    assert.equal(
      hasRaceLabAboutLabels('<a href="/lab/openai.html">What has SIREN scored about OpenAI / ChatGPT?</a>'),
      true,
    );
    assert.equal(
      hasRaceLabAboutLabels('<a href="/lab/openai.html">What has SIREN scored about OpenAI?</a>'),
      false,
    );
    assert.equal(hasRaceLabAboutLabels('no lab urls'), true);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        race_lab_about_labels: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'race-lab-labels-missing'));
  });

  it('detects Watts IREN FAQ + agent-map lag (FINDABILITY #152/#153)', () => {
    assert.equal(hasWattsIrenFaq(WATTS_IREN_FAQ_NEEDLE), true);
    assert.equal(hasWattsIrenFaq('What does the SIREN infrastructure index read?'), false);
    assert.equal(
      hasAgentsIrenWatts('IREN stock → https://siren.watch/watts.html'),
      true,
    );
    assert.equal(hasAgentsIrenWatts('https://siren.watch/watts.html only'), false);
    assert.equal(hasAgentsIrenWatts('IREN stock with no watts path'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        watts_iren_faq: false,
        agents_iren_watts: false,
        llms_iren_watts: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'watts-iren-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-iren-watts-missing'));
  });

  it('detects Micron DRAM FAQ + agent-map lag (FINDABILITY #151/#154)', () => {
    assert.equal(hasMicronDramFaq(MICRON_DRAM_FAQ_NEEDLE), true);
    assert.equal(hasMicronDramFaq('What has SIREN scored about Micron / MU?'), false);
    assert.equal(
      hasAgentsMicronDram('dram stock → https://siren.watch/lab/micron.html'),
      true,
    );
    assert.equal(hasAgentsMicronDram('https://siren.watch/lab/micron.html only'), false);
    assert.equal(hasAgentsMicronDram('dram stock with no micron path'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        micron_dram_faq: false,
        agents_micron_dram: false,
        llms_micron_dram: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'micron-dram-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-micron-dram-missing'));
  });

  it('detects CoreWeave stock FAQ + agent-map lag (FINDABILITY #155)', () => {
    assert.equal(hasCoreweaveStockFaq(COREWEAVE_STOCK_FAQ_NEEDLE), true);
    assert.equal(hasCoreweaveStockFaq('What has SIREN scored about CoreWeave?'), false);
    assert.equal(
      hasAgentsCoreweave('CoreWeave stock → https://siren.watch/lab/coreweave.html'),
      true,
    );
    assert.equal(hasAgentsCoreweave('https://siren.watch/lab/coreweave.html only'), false);
    assert.equal(hasAgentsCoreweave('CoreWeave stock with no lab path'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        coreweave_stock_faq: false,
        agents_coreweave: false,
        llms_coreweave: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'coreweave-stock-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-coreweave-missing'));
  });

  it('detects CoreWeave debt / bond FAQ lag (FINDABILITY #160)', () => {
    assert.equal(hasCoreweaveDebtFaq(COREWEAVE_DEBT_FAQ_NEEDLE), true);
    assert.equal(hasCoreweaveDebtFaq(COREWEAVE_STOCK_FAQ_NEEDLE), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        coreweave_debt_faq: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'coreweave-debt-faq-missing'));
  });

  it('detects Neocloud FAQ + agent-map lag (FINDABILITY #157)', () => {
    assert.equal(hasNeocloudFaq(NEOCLOUD_FAQ_NEEDLE), true);
    assert.equal(hasNeocloudFaq('What has SIREN scored about Neoclouds?'), false);
    assert.equal(
      hasAgentsNeocloud('neoclouds Trends → https://siren.watch/tags/neoclouds.html'),
      true,
    );
    assert.equal(hasAgentsNeocloud('https://siren.watch/tags/neoclouds.html only'), false);
    assert.equal(hasAgentsNeocloud('neoclouds Trends with no tag path'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        neocloud_faq: false,
        agents_neocloud: false,
        llms_neocloud: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'neocloud-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-neocloud-missing'));
  });

  it('detects Nvidia / NVDA FAQ + agent-map lag (FINDABILITY #161)', () => {
    assert.equal(hasNvidiaNvdaFaq(NVIDIA_NVDA_FAQ_NEEDLE), true);
    assert.equal(hasNvidiaNvdaFaq('What has SIREN scored about NVIDIA?'), false);
    assert.equal(
      hasAgentsNvidia('NVDA Trends → https://siren.watch/lab/nvidia.html'),
      true,
    );
    assert.equal(hasAgentsNvidia('https://siren.watch/lab/nvidia.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        nvidia_nvda_faq: false,
        agents_nvidia: false,
        llms_nvidia: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'nvidia-nvda-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-nvidia-missing'));
  });

  it('detects OpenAI lawsuit / FTC FAQ + agent-map lag (FINDABILITY #162)', () => {
    assert.equal(hasOpenaiLawsuitFaq(OPENAI_LAWSUIT_FAQ_NEEDLE), true);
    assert.equal(hasOpenaiLawsuitFaq('What has SIREN scored about OpenAI / ChatGPT?'), false);
    assert.equal(
      hasAgentsOpenaiLawsuit('OpenAI lawsuit → https://siren.watch/lab/openai.html'),
      true,
    );
    assert.equal(hasAgentsOpenaiLawsuit('https://siren.watch/lab/openai.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        openai_lawsuit_faq: false,
        agents_openai_lawsuit: false,
        llms_openai_lawsuit: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'openai-lawsuit-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-openai-lawsuit-missing'));
  });

  it('detects Anthropic IPO / FTC FAQ + agent-map lag (FINDABILITY #163)', () => {
    assert.equal(hasAnthropicIpoFaq(ANTHROPIC_IPO_FAQ_NEEDLE), true);
    assert.equal(hasAnthropicIpoFaq('What has SIREN scored about Anthropic / Claude?'), false);
    assert.equal(
      hasAgentsAnthropicIpo('Anthropic IPO → https://siren.watch/lab/anthropic.html'),
      true,
    );
    assert.equal(hasAgentsAnthropicIpo('https://siren.watch/lab/anthropic.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        anthropic_ipo_faq: false,
        agents_anthropic_ipo: false,
        llms_anthropic_ipo: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'anthropic-ipo-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-anthropic-ipo-missing'));
  });

  it('detects Search Trends routing FAQ lag (FINDABILITY #158)', () => {
    assert.equal(hasTrendsRoutesFaq(TRENDS_ROUTES_FAQ_NEEDLE), true);
    assert.equal(hasTrendsRoutesFaq('Where do live AI prediction-market odds live'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        trends_routes_faq: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'trends-routes-faq-missing'));
  });

  it('detects missing labAboutLabel aliases in news:keywords (FINDABILITY #148/#159)', () => {
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'OpenAI' && p.alias === 'ChatGPT'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'CoreWeave' && p.alias === 'neocloud'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'IREN' && p.alias === 'Iris Energy'));
    const xml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>OpenAI raises new round</news:title>'
      + '<news:keywords>OpenAI, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>Anthropic expands compute</news:title>'
      + '<news:keywords>Anthropic, Claude, AI, SIREN</news:keywords></url>'
      + '<url><news:title>CoreWeave debt woes deepen</news:title>'
      + '<news:keywords>CoreWeave, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>IREN stock climbs on power deals</news:title>'
      + '<news:keywords>IREN, Google, AI, SIREN</news:keywords></url>'
      + '</urlset>';
    const lags = newsLabAliasKeywordLags(xml);
    assert.ok(lags.some((r) => r.lab === 'OpenAI' && r.alias === 'ChatGPT'));
    assert.ok(lags.some((r) => r.lab === 'CoreWeave' && r.alias === 'neocloud'));
    assert.ok(lags.some((r) => r.lab === 'IREN' && r.alias === 'Iris Energy'));
    assert.ok(!lags.some((r) => r.lab === 'Anthropic'));
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        news_lab_alias_lags: lags,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'news-lab-alias-keywords-missing'));
  });

  it('detects missing /trends.html in agent maps + now tips (FINDABILITY #125)', () => {
    assert.equal(TRENDS_SHORT_ALIAS, '/trends.html');
    assert.equal(hasTrendsShortAlias('short alias /trends.html'), true);
    assert.equal(hasTrendsShortAlias('/search-trends.html only'), false);
    assert.equal(
      hasNowTips('/free-tools.html /verify.html Search Trends short /trends.html'),
      true,
    );
    assert.equal(
      hasNowTips('/free-tools.html /verify.html Search Trends /search-trends.html'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_trends_alias: false, llms_trends_alias: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-trends-alias-missing'));
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

  it('detects lab head-term title alias lag (FINDABILITY #123)', () => {
    for (const p of LAB_HEAD_TITLE_PROBES) {
      assert.ok(OUR_SURFACES.includes(p.path), p.path);
    }
    const byUrl = new Map([
      ['https://siren.watch/lab/google-deepmind.html', {
        ok: true,
        value: '<title>What has SIREN scored about Google DeepMind?</title>',
      }],
      ['https://siren.watch/lab/openai.html', {
        ok: true,
        value: '<title>What has SIREN scored about OpenAI / ChatGPT?</title>',
      }],
      ['https://siren.watch/lab/anthropic.html', {
        ok: true,
        value: '<title>What has SIREN scored about Anthropic / Claude?</title>',
      }],
      ['https://siren.watch/lab/micron.html', {
        ok: true,
        value: '<title>What has SIREN scored about Micron / MU?</title>',
      }],
      ['https://siren.watch/lab/nvidia.html', {
        ok: true,
        value: '<title>What has SIREN scored about NVIDIA / NVDA?</title>',
      }],
    ]);
    const lags = labHeadAliasLags(byUrl);
    assert.equal(lags.length, 1);
    assert.equal(lags[0].needle, 'Gemini');
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        lab_head_alias_lags: lags,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'lab-head-aliases-missing'));
  });

  it('detects conquest FAQ hub lag after orphan wipe (FINDABILITY #128)', () => {
    for (const p of CONQUEST_FAQ_PROBES) {
      assert.ok(CORE_LIVE_SURFACES.includes(p.path), p.path);
    }
    const byUrl = new Map([
      ['https://siren.watch/compare.html', {
        ok: true,
        value: '<h2>Which AI doom indexes can you compare?</h2>',
      }],
      ['https://siren.watch/alternatives.html', {
        ok: true,
        value: '<h2>What are AI doom index alternatives?</h2>',
      }],
    ]);
    const lags = conquestFaqLags(byUrl);
    assert.equal(lags.length, 2);
    assert.ok(lags.some((r) => r.path === '/compare.html'));
    assert.ok(lags.some((r) => r.path === '/alternatives.html'));
    const okByUrl = new Map([
      ['https://siren.watch/compare.html', {
        ok: true,
        value: '<h2>How do you compare AI doom indexes?</h2>',
      }],
      ['https://siren.watch/alternatives.html', {
        ok: true,
        value: '<h2>What is an AI doom index alternative?</h2>',
      }],
    ]);
    assert.equal(conquestFaqLags(okByUrl).length, 0);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        conquest_faq_lags: lags,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'conquest-faq-missing'));
  });
});
