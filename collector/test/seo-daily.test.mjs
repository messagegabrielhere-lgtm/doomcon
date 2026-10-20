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
  trendsGeneratedAtMs,
  TRENDS_STALE_HOURS,
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
  ACTIVITY_INDEX_ALIAS,
  hasActivityIndexAlias,
  ACTIVITY_LEVEL_ALIAS,
  hasActivityLevelAlias,
  AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE,
  hasAgentsHtmlDualHeadTerm,
  hasDiscoveryDualHeadTerm,
  hasAgentUseLinks,
  hasAgentsJsonDualHeadTerm,
  hasOpenapiDualHeadTerm,
  hasApiIndexDualHeadTerm,
  hasFreeToolsDualHeadTerm,
  hasVerifyDualHeadTerm,
  hasCompareDualHeadTerm,
  hasAlternativesDualHeadTerm,
  hasPdoomDualHeadTerm,
  hasAiDoomsdayClockDualHeadTerm,
  hasGuideDualHeadTerm,
  hasGuidesDualHeadTerm,
  hasBetsDualHeadTerm,
  hasBalanceDualHeadTerm,
  hasSelfAwareDualHeadTerm,
  hasVideosDualHeadTerm,
  hasBlissDualHeadTerm,
  hasPressDualHeadTerm,
  hasMovesDualHeadTerm,
  hasNotFoundDualHeadTerm,
  hasServerErrorDualHeadTerm,
  hasKindPressCrumbDualHeadTerm,
  hasFooterSectionsDualHeadTerm,
  hasMuseSparkDualHeadTerm,
  hasFableDualHeadTerm,
  hasPillarComputeDualHeadTerm,
  hasPillarAttentionDualHeadTerm,
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
  hasHomeDoombenchConquest,
  HOME_DOOMBENCH_CONQUEST_NEEDLE,
  hasHomeSkynetConquest,
  HOME_SKYNET_CONQUEST_NEEDLE,
  hasHomePizzintConquest,
  HOME_PIZZINT_CONQUEST_NEEDLE,
  hasHomeTakeoffConquest,
  HOME_TAKEOFF_CONQUEST_NEEDLE,
  hasHomeActivityIndexFaq,
  HOME_ACTIVITY_INDEX_FAQ_NEEDLE,
  hasHomeActivityIndexTodayFaq,
  HOME_ACTIVITY_INDEX_TODAY_FAQ_NEEDLE,
  hasHomeActivityLevelFaqAlias,
  HOME_ACTIVITY_LEVEL_FAQ_ALIAS_NEEDLE,
  hasHomeActivityLevelTitle,
  HOME_ACTIVITY_LEVEL_TITLE_NEEDLE,
  hasHomeActivityH1HeadTerms,
  HOME_ACTIVITY_H1_HEAD_TERMS_NEEDLE,
  hasHomeTitleTrimmed,
  HOME_TITLE_LEVEL_NAME_RE,
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
  TRENDS_ROUTES_ASML_NEEDLE,
  TRENDS_ROUTES_TSMC_NEEDLE,
  hasNvidiaNvdaFaq,
  hasAgentsNvidia,
  NVIDIA_NVDA_FAQ_NEEDLE,
  hasOpenaiLawsuitFaq,
  hasAgentsOpenaiLawsuit,
  OPENAI_LAWSUIT_FAQ_NEEDLE,
  hasAnthropicIpoFaq,
  hasAgentsAnthropicIpo,
  ANTHROPIC_IPO_FAQ_NEEDLE,
  hasAsmlTrendsFaq,
  hasAgentsAsml,
  ASML_TRENDS_FAQ_NEEDLE,
  hasTsmcTrendsFaq,
  hasAgentsTsmc,
  TSMC_TRENDS_FAQ_NEEDLE,
  hasAmazonBeeFaq,
  hasAgentsAmazonBee,
  AMAZON_BEE_FAQ_NEEDLE,
  TRENDS_ROUTES_AMAZON_BEE_NEEDLE,
  hasMetaMuseFaq,
  hasAgentsMetaMuse,
  META_MUSE_FAQ_NEEDLE,
  TRENDS_ROUTES_META_MUSE_NEEDLE,
  hasAppleIntelligenceFaq,
  hasAgentsAppleIntelligence,
  APPLE_INTELLIGENCE_FAQ_NEEDLE,
  TRENDS_ROUTES_APPLE_INTELLIGENCE_NEEDLE,
  hasMicrosoftCopilotFaq,
  hasAgentsMicrosoftCopilot,
  MICROSOFT_COPILOT_FAQ_NEEDLE,
  TRENDS_ROUTES_MICROSOFT_COPILOT_NEEDLE,
  hasMicrosoftMaiFaq,
  hasAgentsMicrosoftMai,
  MICROSOFT_MAI_FAQ_NEEDLE,
  TRENDS_ROUTES_MICROSOFT_MAI_NEEDLE,
  TRENDS_ROUTES_SURFACE_ULTRA_NEEDLE,
  TRENDS_WATCHLIST_SURFACE_ULTRA_NEEDLE,
  TRENDS_ROUTES_DEEPSEEK_FLASH_NEEDLE,
  TRENDS_WATCHLIST_DEEPSEEK_FLASH_NEEDLE,
  TRENDS_ROUTES_CERT_IN_NEEDLE,
  TRENDS_WATCHLIST_CERT_IN_NEEDLE,
  TRENDS_ROUTES_ANTHROPIC_CANADA_DC_NEEDLE,
  TRENDS_ROUTES_ANTHROPIC_METR_NEEDLE,
  TRENDS_ROUTES_ANTHROPIC_ECDSA_NEEDLE,
  TRENDS_ROUTES_CLAUDE_OPUS_55_NEEDLE,
  TRENDS_ROUTES_BLACKSTONE_ANTHROPIC_NEEDLE,
  TRENDS_ROUTES_REPLIT_ANTHROPIC_NEEDLE,
  TRENDS_ROUTES_CLAUDE_MYTHOS_5_NEEDLE,
  TRENDS_WATCHLIST_ANTHROPIC_ECDSA_NEEDLE,
  TRENDS_WATCHLIST_ANTHROPIC_METR_NEEDLE,
  TRENDS_WATCHLIST_CLAUDE_OPUS_55_NEEDLE,
  TRENDS_WATCHLIST_BLACKSTONE_ANTHROPIC_NEEDLE,
  TRENDS_WATCHLIST_REPLIT_ANTHROPIC_NEEDLE,
  TRENDS_WATCHLIST_CLAUDE_MYTHOS_5_NEEDLE,
  TRENDS_ROUTES_ONDAS_PALANTIR_NEEDLE,
  TRENDS_WATCHLIST_ONDAS_PALANTIR_NEEDLE,
  TRENDS_ROUTES_WAYMO_CANADA_NEEDLE,
  TRENDS_ROUTES_SOFTBANK_ALLIED_NEEDLE,
  TRENDS_ROUTES_SPACEX_STARSHIELD_NEEDLE,
  TRENDS_ROUTES_TESLA_FLYING_ROADSTER_NEEDLE,
  hasXaiGrokFaq,
  hasAgentsXaiGrok,
  XAI_GROK_FAQ_NEEDLE,
  TRENDS_ROUTES_XAI_GROK_NEEDLE,
  hasGeminiGemmaFaq,
  hasAgentsGeminiGemma,
  GEMINI_GEMMA_FAQ_NEEDLE,
  TRENDS_ROUTES_GEMINI_GEMMA_NEEDLE,
  hasSamsungHbmFaq,
  hasAgentsSamsungHbm,
  SAMSUNG_HBM_FAQ_NEEDLE,
  TRENDS_ROUTES_SAMSUNG_HBM_NEEDLE,
  hasSamsungGlassesFaq,
  hasAgentsSamsungGlasses,
  SAMSUNG_GLASSES_FAQ_NEEDLE,
  TRENDS_ROUTES_SAMSUNG_GLASSES_NEEDLE,
  hasCharacterAiFaq,
  hasAgentsCharacterAi,
  CHARACTER_AI_FAQ_NEEDLE,
  TRENDS_ROUTES_CHARACTER_AI_NEEDLE,
  hasQwenFaq,
  hasAgentsQwen,
  QWEN_FAQ_NEEDLE,
  TRENDS_ROUTES_QWEN_NEEDLE,
  hasOracleDatacentersFaq,
  hasAgentsOracleDatacenters,
  ORACLE_DATACENTERS_FAQ_NEEDLE,
  TRENDS_ROUTES_ORACLE_DATACENTERS_NEEDLE,
  hasDeepseekFaq,
  hasAgentsDeepseek,
  DEEPSEEK_FAQ_NEEDLE,
  TRENDS_ROUTES_DEEPSEEK_NEEDLE,
  hasMistralFaq,
  hasAgentsMistral,
  MISTRAL_FAQ_NEEDLE,
  TRENDS_ROUTES_MISTRAL_NEEDLE,
  hasOpenaiOutageFaq,
  hasOpenaiChromeFaq,
  hasAgentsOpenaiChrome,
  hasAgentsOpenaiOutage,
  OPENAI_OUTAGE_FAQ_NEEDLE,
  OPENAI_CHROME_FAQ_NEEDLE,
  META_APPLE_MAC_FAQ_NEEDLE,
  TRENDS_ROUTES_META_APPLE_MAC_NEEDLE,
  hasMetaAppleMacFaq,
  hasAgentsMetaAppleMac,
  TRENDS_ROUTES_OPENAI_OUTAGE_NEEDLE,
  TRENDS_ROUTES_OPENAI_CHROME_NEEDLE,
  TRENDS_ROUTES_ANTHROPIC_AI_SAFETY_BILL_NEEDLE,
  hasHuggingfaceFaq,
  hasAgentsHuggingface,
  HUGGINGFACE_FAQ_NEEDLE,
  TRENDS_ROUTES_HUGGINGFACE_NEEDLE,
  hasPalantirFaq,
  hasAgentsPalantir,
  PALANTIR_FAQ_NEEDLE,
  TRENDS_ROUTES_PALANTIR_NEEDLE,
  hasAmdFaq,
  hasAgentsAmd,
  AMD_FAQ_NEEDLE,
  TRENDS_ROUTES_AMD_NEEDLE,
  hasTeslaFaq,
  hasAgentsTesla,
  TESLA_FAQ_NEEDLE,
  TRENDS_ROUTES_TESLA_NEEDLE,
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

  it('parses Search Trends generated_at and flags trends-stale (FINDABILITY #186)', () => {
    assert.equal(
      trendsGeneratedAtMs('{"generated_at":"2026-10-15T19:11:36.752Z"}'),
      Date.parse('2026-10-15T19:11:36.752Z'),
    );
    assert.equal(trendsGeneratedAtMs('{'), null);
    assert.ok(TRENDS_STALE_HOURS >= 6);
    assert.ok(CORE_LIVE_SURFACES.includes('/api/search-trends.json')
      || OUR_SURFACES.includes('/api/search-trends.json'));
    const stale = deriveGaps({
      measured_at: '2026-10-15T22:00:00.000Z',
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 6200, news_sitemap_urls: 200,
          trends_generated_at: '2026-10-15T12:00:00.000Z',
          schema_types: [],
        },
      ],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(stale.some((g) => g.id === 'trends-stale'), stale.map((g) => g.id).join(','));
    const fresh = deriveGaps({
      measured_at: '2026-10-15T22:00:00.000Z',
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 6200, news_sitemap_urls: 200,
          trends_generated_at: '2026-10-15T21:00:00.000Z',
          schema_types: [],
        },
      ],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(!fresh.some((g) => g.id === 'trends-stale'));
    const missing = deriveGaps({
      measured_at: '2026-10-15T22:00:00.000Z',
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 6200, news_sitemap_urls: 200,
          trends_generated_at: null,
          schema_types: [],
        },
      ],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(missing.some((g) => g.id === 'trends-json-missing'));
  });

  it('measureSite records trends_generated_at from api/search-trends.json (#186)', () => {
    const byUrl = new Map([
      ['https://siren.watch/', { ok: true, value: '<title>SIREN</title>' }],
      ['https://siren.watch/sitemap.xml', { ok: true, value: '<urlset></urlset>' }],
      ['https://siren.watch/news-sitemap.xml', { ok: true, value: '<urlset></urlset>' }],
      ['https://siren.watch/robots.txt', { ok: true, value: 'Allow: /\n' }],
      ['https://siren.watch/llms.txt', { ok: true, value: '# SIREN\n' }],
      ['https://siren.watch/api/search-trends.json', {
        ok: true,
        value: JSON.stringify({ generated_at: '2026-10-15T21:39:27.161Z', ok: true }),
      }],
    ]);
    const row = measureSite(
      { id: 'siren', name: 'siren.watch', origin: 'https://siren.watch', ours: true },
      byUrl,
    );
    assert.equal(row.trends_generated_at, '2026-10-15T21:39:27.161Z');
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

  it('monitors /ai-activity-index typed-guess alias (FINDABILITY #252)', () => {
    for (const p of ['/ai-activity-index.html', '/ai-activity-index/']) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), `CORE_LIVE missing ${p}`);
    }
  });

  it('detects missing /ai-activity-index.html in agent maps (FINDABILITY #252)', () => {
    assert.equal(ACTIVITY_INDEX_ALIAS, '/ai-activity-index.html');
    assert.equal(hasActivityIndexAlias('short alias /ai-activity-index.html'), true);
    assert.equal(hasActivityIndexAlias('/ only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_activity_index_alias: false, llms_activity_index_alias: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-activity-index-alias-missing'));
  });

  it('monitors /ai-activity-level typed-guess alias (FINDABILITY #262)', () => {
    for (const p of ['/ai-activity-level.html', '/ai-activity-level/']) {
      assert.ok(CORE_LIVE_SURFACES.includes(p), `CORE_LIVE missing ${p}`);
    }
  });

  it('detects missing /ai-activity-level.html in agent maps (FINDABILITY #262)', () => {
    assert.equal(ACTIVITY_LEVEL_ALIAS, '/ai-activity-level.html');
    assert.equal(hasActivityLevelAlias('short alias /ai-activity-level.html'), true);
    assert.equal(hasActivityLevelAlias('/ai-activity-index.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_activity_level_alias: false, llms_activity_level_alias: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-activity-level-alias-missing'));
  });

  it('detects missing dual head term on agents.html (FINDABILITY #437)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/agents.html'));
    assert.equal(
      AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE,
      'AI activity index today · AI activity level today',
    );
    assert.equal(
      hasAgentsHtmlDualHeadTerm('live AI activity index today · AI activity level today'),
      true,
    );
    assert.equal(
      hasAgentsHtmlDualHeadTerm('What is the AI activity level today on siren.watch?'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_html_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-html-dual-head-term-missing'));
  });

  it('detects missing agent use links on home head + robots (FINDABILITY #489)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/AGENTS.md'));
    const head = '<head><link rel="alternate" type="text/markdown" href="/skill.md" title="How to use and cite SIREN"><link rel="alternate" type="text/plain" href="/api/now.txt" title="Current reading"></head><a href="/skill.md">body</a>';
    const robots = '# how to cite https://siren.watch/skill.md\n# https://siren.watch/AGENTS.md\n';
    assert.equal(hasAgentUseLinks(head, robots), true);
    assert.equal(hasAgentUseLinks('<head></head><a href="/skill.md">', robots), false);
    assert.equal(hasAgentUseLinks(head, 'User-agent: *\nAllow: /\n'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agent_use_links: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agent-use-links-missing'));
  });

  it('detects missing dual head term on agents.txt / ai.txt (FINDABILITY #439)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/agents.txt'));
    assert.ok(CORE_LIVE_SURFACES.includes('/ai.txt'));
    assert.equal(
      hasDiscoveryDualHeadTerm('Live reading: / — AI activity index today · AI activity level today'),
      true,
    );
    assert.equal(
      hasDiscoveryDualHeadTerm('Where is the full SIREN instrument panel?'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_txt_dual_head_term: false,
        ai_txt_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'discovery-dual-head-term-missing'));
  });

  it('detects missing dual head term on agents.json (FINDABILITY #441)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/agents.json'));
    assert.equal(
      hasAgentsJsonDualHeadTerm(JSON.stringify({
        related: { home_title: 'AI activity index today · AI activity level today' },
      })),
      true,
    );
    assert.equal(
      hasAgentsJsonDualHeadTerm(JSON.stringify({
        related: { classic_title: 'Where is the full SIREN instrument panel?' },
      })),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        agents_json_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'agents-json-dual-head-term-missing'));
  });

  it('detects missing dual head term on free-tools.html (FINDABILITY #443)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/free-tools.html'));
    assert.equal(
      hasFreeToolsDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasFreeToolsDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        freetools_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'freetools-dual-head-term-missing'));
  });

  it('detects missing dual head term on verify.html (FINDABILITY #451)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/verify.html'));
    assert.equal(
      hasVerifyDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasVerifyDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        verify_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'verify-dual-head-term-missing'));
  });

  it('detects missing dual head term on compare + alternatives (FINDABILITY #453)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/compare.html'));
    assert.ok(CORE_LIVE_SURFACES.includes('/alternatives.html'));
    assert.equal(
      hasCompareDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasCompareDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasAlternativesDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasAlternativesDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        compare_dual_head_term: false,
        alternatives_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'compare-dual-head-term-missing'));
  });

  it('detects missing dual head term on pdoom + ai-doomsday-clock (FINDABILITY #455)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/pdoom.html'));
    assert.ok(OUR_SURFACES.includes('/ai-doomsday-clock.html'));
    assert.equal(
      hasPdoomDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasPdoomDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasAiDoomsdayClockDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasAiDoomsdayClockDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        pdoom_dual_head_term: false,
        ai_doomsday_clock_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'pdoom-dual-head-term-missing'));
  });

  it('detects missing dual head term on guide + guides (FINDABILITY #457)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/guide.html'));
    assert.ok(OUR_SURFACES.includes('/guides.html'));
    assert.equal(
      hasGuideDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasGuideDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasGuidesDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasGuidesDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        guide_dual_head_term: false,
        guides_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'guide-dual-head-term-missing'));
  });

  it('detects missing dual head term on bets + balance + self-aware (FINDABILITY #459)', () => {
    assert.ok(OUR_SURFACES.includes('/bets.html'));
    assert.ok(OUR_SURFACES.includes('/balance.html'));
    assert.ok(OUR_SURFACES.includes('/self-aware.html'));
    assert.equal(
      hasBetsDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasBetsDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasBalanceDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasSelfAwareDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        bets_dual_head_term: false,
        balance_dual_head_term: true,
        self_aware_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'desk-dual-head-term-missing'));
  });

  it('detects missing dual head term on videos.html (FINDABILITY #461)', () => {
    assert.ok(OUR_SURFACES.includes('/videos.html'));
    assert.equal(
      hasVideosDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasVideosDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        videos_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'videos-dual-head-term-missing'));
  });

  it('detects missing dual head term on bliss.html (FINDABILITY #467)', () => {
    assert.ok(OUR_SURFACES.includes('/bliss.html'));
    assert.equal(
      hasBlissDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasBlissDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        bliss_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'bliss-dual-head-term-missing'));
  });

  it('detects missing dual head term on press.html (FINDABILITY #469)', () => {
    assert.ok(OUR_SURFACES.includes('/press.html'));
    assert.equal(
      hasPressDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasPressDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        press_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'press-dual-head-term-missing'));
  });

  it('detects missing dual head term on moves bstamp (FINDABILITY #471)', () => {
    assert.ok(OUR_SURFACES.includes('/moves/2026-10-17T15-35-33Z.html'));
    assert.equal(
      hasMovesDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasMovesDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        moves_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'moves-dual-head-term-missing'));
  });

  it('detects missing dual head term on error pages (FINDABILITY #473)', () => {
    assert.ok(OUR_SURFACES.includes('/404.html'));
    assert.ok(OUR_SURFACES.includes('/500.html'));
    assert.equal(
      hasNotFoundDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasNotFoundDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasServerErrorDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        not_found_dual_head_term: false,
        server_error_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'error-dual-head-term-missing'));
  });

  it('detects missing dual home-crumb head term on kind hubs (FINDABILITY #475)', () => {
    assert.ok(OUR_SURFACES.includes('/kind/press.html'));
    assert.equal(
      hasKindPressCrumbDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasKindPressCrumbDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        kind_press_crumb_dual_head_term: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'crumb-dual-head-term-missing'));
  });

  it('detects missing dual footer SECTIONS home label (FINDABILITY #483/#485)', () => {
    assert.ok(OUR_SURFACES.includes('/press.html'));
    assert.ok(OUR_SURFACES.includes('/jobs.html'));
    const dualFoot = '<ul id="foot-pages"><li><a href="/">AI activity index today · AI activity level today · SIREN</a></li></ul>';
    const indexFoot = '<ul id="foot-pages"><li><a href="/">AI activity index today · SIREN</a></li></ul>';
    const crumbOnly = 'AI activity index today · AI activity level today · SIREN'
      + '<ul id="foot-pages"><li><a href="/">AI activity index today · SIREN</a></li></ul>';
    assert.equal(hasFooterSectionsDualHeadTerm(dualFoot), true);
    assert.equal(hasFooterSectionsDualHeadTerm(indexFoot), false);
    assert.equal(hasFooterSectionsDualHeadTerm(crumbOnly), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        footer_sections_dual_head_term: false,
        footer_sections_press_dual: true,
        footer_sections_jobs_dual: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'sections-dual-head-term-missing'));
    assert.match(
      gaps.find((g) => g.id === 'sections-dual-head-term-missing').text,
      /jobs\.html/,
    );
  });

  it('detects missing dual head term on model hubs (FINDABILITY #463)', () => {
    assert.ok(OUR_SURFACES.includes('/model/muse-spark.html'));
    assert.ok(OUR_SURFACES.includes('/model/fable.html'));
    assert.equal(
      hasMuseSparkDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasMuseSparkDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasFableDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        muse_spark_dual_head_term: false,
        fable_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'model-dual-head-term-missing'));
  });

  it('detects missing dual head term on pillar pages (FINDABILITY #465)', () => {
    assert.ok(OUR_SURFACES.includes('/pillar/compute.html'));
    assert.ok(OUR_SURFACES.includes('/pillar/attention.html'));
    assert.equal(
      hasPillarComputeDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    assert.equal(
      hasPillarComputeDualHeadTerm('AI activity index today · SIREN'),
      false,
    );
    assert.equal(
      hasPillarAttentionDualHeadTerm('AI activity index today · AI activity level today · SIREN'),
      true,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        pillar_compute_dual_head_term: false,
        pillar_attention_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'pillar-dual-head-term-missing'));
  });

  it('detects missing dual head term on openapi + api/index (FINDABILITY #446)', () => {
    assert.ok(CORE_LIVE_SURFACES.includes('/openapi.json'));
    assert.ok(CORE_LIVE_SURFACES.includes('/api/index.json'));
    assert.equal(
      hasOpenapiDualHeadTerm(JSON.stringify({
        paths: { '/': { get: { summary: 'AI activity index today · AI activity level today (live)' } } },
      })),
      true,
    );
    assert.equal(
      hasOpenapiDualHeadTerm(JSON.stringify({
        paths: { '/classic.html': { get: { summary: 'Where is the full SIREN instrument panel?' } } },
      })),
      false,
    );
    assert.equal(
      hasApiIndexDualHeadTerm(JSON.stringify({
        agents: { home_title: 'AI activity index today · AI activity level today' },
      })),
      true,
    );
    assert.equal(
      hasApiIndexDualHeadTerm(JSON.stringify({
        agents: { classic: 'https://siren.watch/classic.html' },
      })),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        openapi_dual_head_term: false,
        api_index_dual_head_term: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'openapi-dual-head-term-missing'));
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

  it('detects missing home DoomBench conquest link (FINDABILITY #423)', () => {
    assert.equal(HOME_DOOMBENCH_CONQUEST_NEEDLE, 'SIREN vs DoomBench: which should you use?');
    assert.equal(hasHomeDoombenchConquest('SIREN vs DoomBench: which should you use?'), true);
    assert.equal(hasHomeDoombenchConquest('SIREN vs PizzINT: which should you use?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_doombench_conquest: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-doombench-conquest-missing'));
  });

  it('detects missing home Skynet Countdown conquest link (FINDABILITY #425/#427)', () => {
    assert.equal(HOME_SKYNET_CONQUEST_NEEDLE, 'SIREN vs Skynet Countdown: which should you use?');
    assert.equal(hasHomeSkynetConquest('SIREN vs Skynet Countdown: which should you use?'), true);
    assert.equal(hasHomeSkynetConquest('SIREN vs DoomBench: which should you use?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_skynet_conquest: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-skynet-conquest-missing'));
  });

  it('detects missing home PizzINT conquest link (FINDABILITY #429)', () => {
    assert.equal(HOME_PIZZINT_CONQUEST_NEEDLE, 'SIREN vs PizzINT: which should you use?');
    assert.equal(hasHomePizzintConquest('SIREN vs PizzINT: which should you use?'), true);
    assert.equal(hasHomePizzintConquest('SIREN vs DoomBench: which should you use?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_pizzint_conquest: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-pizzint-conquest-missing'));
  });

  it('detects missing home Takeoff Tracker conquest link (FINDABILITY #429)', () => {
    assert.equal(HOME_TAKEOFF_CONQUEST_NEEDLE, 'SIREN vs Takeoff Tracker: which should you use?');
    assert.equal(hasHomeTakeoffConquest('SIREN vs Takeoff Tracker: which should you use?'), true);
    assert.equal(hasHomeTakeoffConquest('SIREN vs PizzINT: which should you use?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_takeoff_conquest: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-takeoff-conquest-missing'));
  });

  it('detects missing home AI activity index FAQ (FINDABILITY #254)', () => {
    assert.equal(HOME_ACTIVITY_INDEX_FAQ_NEEDLE, 'What is an AI activity index?');
    assert.equal(hasHomeActivityIndexFaq('What is an AI activity index?'), true);
    assert.equal(hasHomeActivityIndexFaq('What is the AI activity level today?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_activity_index_faq: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-activity-index-faq-missing'));
  });

  it('detects missing home AI activity index today FAQ (FINDABILITY #284)', () => {
    assert.equal(HOME_ACTIVITY_INDEX_TODAY_FAQ_NEEDLE, 'What is the AI activity index today?');
    assert.equal(hasHomeActivityIndexTodayFaq('What is the AI activity index today?'), true);
    assert.equal(hasHomeActivityIndexTodayFaq('What is an AI activity index?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_activity_index_today_faq: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-activity-index-today-faq-missing'));
  });

  it('detects missing home AI activity level FAQ alias prose (FINDABILITY #264)', () => {
    assert.equal(HOME_ACTIVITY_LEVEL_FAQ_ALIAS_NEEDLE, '/ai-activity-level.html is a short alias');
    assert.equal(hasHomeActivityLevelFaqAlias('/ai-activity-level.html is a short alias'), true);
    assert.equal(hasHomeActivityLevelFaqAlias('What is the AI activity level today?'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_activity_level_faq_alias: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-activity-level-faq-alias-missing'));
  });

  it('detects missing home AI activity level today title (FINDABILITY #296)', () => {
    assert.equal(HOME_ACTIVITY_LEVEL_TITLE_NEEDLE, 'AI activity level today ·');
    assert.equal(
      hasHomeActivityLevelTitle('<title>AI activity index today · AI activity level today · SIREN 4</title>'),
      true,
    );
    assert.equal(hasHomeActivityLevelTitle('<title>AI activity index today · SIREN 4</title>'), false);
    assert.equal(
      hasHomeActivityLevelTitle('<meta name="description" content="AI activity level today: SIREN 4">'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_activity_level_title: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-activity-level-title-missing'));
  });

  it('detects missing home AI activity H1 head terms (FINDABILITY #308)', () => {
    assert.equal(
      HOME_ACTIVITY_H1_HEAD_TERMS_NEEDLE,
      'AI activity index today · AI activity level today · AI SIREN INDEX',
    );
    assert.equal(
      hasHomeActivityH1HeadTerms(
        '<h1><span class="v2-sr">AI activity index today · AI activity level today · AI SIREN INDEX</span></h1>',
      ),
      true,
    );
    assert.equal(
      hasHomeActivityH1HeadTerms('<h1><span class="v2-sr">AI SIREN INDEX</span></h1>'),
      false,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · AI activity level today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_activity_h1_head_terms: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-activity-h1-head-terms-missing'));
  });

  it('detects home title still carrying level_name or score (FINDABILITY #312/#314/#316)', () => {
    assert.ok(HOME_TITLE_LEVEL_NAME_RE.test('ROUTINE'));
    assert.equal(
      hasHomeTitleTrimmed(
        '<title>AI activity index today · AI activity level today · SIREN 4</title>',
      ),
      true,
    );
    assert.equal(
      hasHomeTitleTrimmed(
        '<title>AI activity index today · AI activity level today · SIREN 4 ROUTINE · 48.3</title>',
      ),
      false,
    );
    assert.equal(
      hasHomeTitleTrimmed(
        '<title>AI activity index today · AI activity level today · SIREN 4 · 48.3</title>',
      ),
      false,
    );
    assert.equal(
      hasHomeTitleTrimmed('<title>AI activity index today · SIREN 4</title>'),
      false,
    );
    // Body scale copy may say ROUTINE; only <title> is checked.
    assert.equal(
      hasHomeTitleTrimmed(
        '<title>AI activity index today · AI activity level today · SIREN 4</title>'
        + '<span class="v2-sr">SIREN 4, ROUTINE, band 35 to 54.</span>',
      ),
      true,
    );
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · AI activity level today · SIREN 4 ROUTINE · 48.3',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        home_activity_title_trim: false,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'home-activity-title-trim-missing'));
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

  it('detects CoreWeave stock FAQ + agent-map lag (FINDABILITY #155/#288)', () => {
    assert.equal(hasCoreweaveStockFaq(COREWEAVE_STOCK_FAQ_NEEDLE), true);
    assert.equal(hasCoreweaveStockFaq('What has SIREN scored about CoreWeave?'), false);
    assert.equal(
      hasAgentsCoreweave('CRWV Trends → https://siren.watch/lab/coreweave.html'),
      true,
    );
    assert.equal(hasAgentsCoreweave('https://siren.watch/lab/coreweave.html only'), false);
    assert.equal(hasAgentsCoreweave('CRWV Trends with no lab path'), false);
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

  it('detects ASML Trends FAQ + agent-map lag (FINDABILITY #164)', () => {
    assert.equal(hasAsmlTrendsFaq(ASML_TRENDS_FAQ_NEEDLE), true);
    assert.equal(hasAsmlTrendsFaq('What has SIREN scored about ASML?'), false);
    assert.equal(
      hasAgentsAsml('ASML stock → https://siren.watch/lab/asml.html'),
      true,
    );
    assert.equal(hasAgentsAsml('https://siren.watch/lab/asml.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        asml_trends_faq: false,
        agents_asml: false,
        llms_asml: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'asml-trends-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-asml-missing'));
  });

  it('detects TSMC Trends FAQ + agent-map lag (FINDABILITY #165)', () => {
    assert.equal(hasTsmcTrendsFaq(TSMC_TRENDS_FAQ_NEEDLE), true);
    assert.equal(hasTsmcTrendsFaq('What has SIREN scored about TSMC?'), false);
    assert.equal(
      hasAgentsTsmc('TSMC stock → https://siren.watch/lab/tsmc.html'),
      true,
    );
    assert.equal(hasAgentsTsmc('https://siren.watch/lab/tsmc.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        tsmc_trends_faq: false,
        agents_tsmc: false,
        llms_tsmc: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'tsmc-trends-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-tsmc-missing'));
  });

  it('detects Amazon Bee FAQ + agent-map lag (FINDABILITY #167)', () => {
    assert.equal(hasAmazonBeeFaq(AMAZON_BEE_FAQ_NEEDLE), true);
    assert.equal(hasAmazonBeeFaq('What has SIREN scored about Amazon?'), false);
    assert.equal(
      hasAgentsAmazonBee('Amazon Bee → https://siren.watch/lab/amazon.html'),
      true,
    );
    assert.equal(hasAgentsAmazonBee('https://siren.watch/lab/amazon.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        amazon_bee_faq: false,
        agents_amazon_bee: false,
        llms_amazon_bee: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'amazon-bee-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-amazon-bee-missing'));
  });

  it('detects Meta Muse FAQ + agent-map lag (FINDABILITY #169)', () => {
    assert.equal(hasMetaMuseFaq(META_MUSE_FAQ_NEEDLE), true);
    assert.equal(hasMetaMuseFaq('What has SIREN scored about Meta AI?'), false);
    assert.equal(
      hasAgentsMetaMuse('Meta Muse → https://siren.watch/lab/meta.html'),
      true,
    );
    assert.equal(hasAgentsMetaMuse('https://siren.watch/lab/meta.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        meta_muse_faq: false,
        agents_meta_muse: false,
        llms_meta_muse: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'meta-muse-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-meta-muse-missing'));
  });

  it('detects Apple Intelligence FAQ + agent-map lag (FINDABILITY #170)', () => {
    assert.equal(hasAppleIntelligenceFaq(APPLE_INTELLIGENCE_FAQ_NEEDLE), true);
    assert.equal(hasAppleIntelligenceFaq('What has SIREN scored about Apple?'), false);
    assert.equal(
      hasAgentsAppleIntelligence('Apple Intelligence → https://siren.watch/lab/apple.html'),
      true,
    );
    assert.equal(hasAgentsAppleIntelligence('https://siren.watch/lab/apple.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        apple_intelligence_faq: false,
        agents_apple_intelligence: false,
        llms_apple_intelligence: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'apple-intelligence-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-apple-intelligence-missing'));
  });

  it('detects Microsoft Copilot FAQ + agent-map lag (FINDABILITY #171)', () => {
    assert.equal(hasMicrosoftCopilotFaq(MICROSOFT_COPILOT_FAQ_NEEDLE), true);
    assert.equal(hasMicrosoftCopilotFaq('What has SIREN scored about Microsoft?'), false);
    assert.equal(
      hasAgentsMicrosoftCopilot('Microsoft Copilot → https://siren.watch/lab/microsoft.html'),
      true,
    );
    assert.equal(hasAgentsMicrosoftCopilot('https://siren.watch/lab/microsoft.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        microsoft_copilot_faq: false,
        agents_microsoft_copilot: false,
        llms_microsoft_copilot: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'microsoft-copilot-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-microsoft-copilot-missing'));
  });

  it('detects Microsoft MAI-Base FAQ + agent-map lag (FINDABILITY #220)', () => {
    assert.equal(hasMicrosoftMaiFaq(MICROSOFT_MAI_FAQ_NEEDLE), true);
    assert.equal(hasMicrosoftMaiFaq('Why does SIREN watch Microsoft Copilot?'), false);
    assert.equal(
      hasAgentsMicrosoftMai('Microsoft MAI-Base → https://siren.watch/lab/microsoft.html'),
      true,
    );
    assert.equal(hasAgentsMicrosoftMai('https://siren.watch/lab/microsoft.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        microsoft_mai_faq: false,
        agents_microsoft_mai: false,
        llms_microsoft_mai: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'microsoft-mai-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-microsoft-mai-missing'));
  });

  it('detects Grok / xAI FAQ + agent-map lag (FINDABILITY #173)', () => {
    assert.equal(hasXaiGrokFaq(XAI_GROK_FAQ_NEEDLE), true);
    assert.equal(hasXaiGrokFaq('What has SIREN scored about xAI?'), false);
    assert.equal(
      hasAgentsXaiGrok('Grok / xAI → https://siren.watch/lab/xai.html'),
      true,
    );
    assert.equal(hasAgentsXaiGrok('https://siren.watch/lab/xai.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        xai_grok_faq: false,
        agents_xai_grok: false,
        llms_xai_grok: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'xai-grok-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-xai-grok-missing'));
  });

  it('detects Gemini / Gemma / Argon FAQ + agent-map lag (FINDABILITY #174/#187)', () => {
    assert.equal(hasGeminiGemmaFaq(GEMINI_GEMMA_FAQ_NEEDLE), true);
    assert.equal(hasGeminiGemmaFaq('Why does SIREN watch Gemini and Gemma?'), false);
    assert.equal(hasGeminiGemmaFaq('What has SIREN scored about Google DeepMind?'), false);
    assert.equal(
      hasAgentsGeminiGemma('Gemini / Gemma / Argon → https://siren.watch/lab/google-deepmind.html'),
      true,
    );
    assert.equal(hasAgentsGeminiGemma('Gemini / Gemma → https://siren.watch/lab/google-deepmind.html'), false);
    assert.equal(hasAgentsGeminiGemma('https://siren.watch/lab/google-deepmind.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        gemini_gemma_faq: false,
        agents_gemini_gemma: false,
        llms_gemini_gemma: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'gemini-gemma-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-gemini-gemma-missing'));
  });

  it('detects Samsung / HBM FAQ + agent-map lag (FINDABILITY #175)', () => {
    assert.equal(hasSamsungHbmFaq(SAMSUNG_HBM_FAQ_NEEDLE), true);
    assert.equal(hasSamsungHbmFaq('What has SIREN scored about Samsung?'), false);
    assert.equal(
      hasAgentsSamsungHbm('Samsung / AI memory → https://siren.watch/lab/samsung.html'),
      true,
    );
    assert.equal(hasAgentsSamsungHbm('https://siren.watch/lab/samsung.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        samsung_hbm_faq: false,
        agents_samsung_hbm: false,
        llms_samsung_hbm: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'samsung-hbm-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-samsung-hbm-missing'));
  });

  it('detects Samsung AI glasses FAQ + agent-map lag (FINDABILITY #195)', () => {
    assert.equal(hasSamsungGlassesFaq(SAMSUNG_GLASSES_FAQ_NEEDLE), true);
    assert.equal(hasSamsungGlassesFaq('Why does SIREN watch Samsung and AI memory chips?'), false);
    assert.equal(
      hasAgentsSamsungGlasses('Samsung AI glasses → https://siren.watch/lab/samsung.html'),
      true,
    );
    assert.equal(hasAgentsSamsungGlasses('https://siren.watch/lab/samsung.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        samsung_glasses_faq: false,
        agents_samsung_glasses: false,
        llms_samsung_glasses: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'samsung-glasses-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-samsung-glasses-missing'));
  });

  it('detects Character.ai bankruptcy FAQ + agent-map lag (FINDABILITY #176)', () => {
    assert.equal(hasCharacterAiFaq(CHARACTER_AI_FAQ_NEEDLE), true);
    assert.equal(hasCharacterAiFaq('What has SIREN scored about Chatbots?'), false);
    assert.equal(
      hasAgentsCharacterAi('Character.ai bankruptcy → https://siren.watch/tags/chatbots.html'),
      true,
    );
    assert.equal(hasAgentsCharacterAi('https://siren.watch/tags/chatbots.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        character_ai_faq: false,
        agents_character_ai: false,
        llms_character_ai: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'character-ai-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-character-ai-missing'));
  });

  it('detects Qwen FAQ + agent-map lag (FINDABILITY #177)', () => {
    assert.equal(hasQwenFaq(QWEN_FAQ_NEEDLE), true);
    assert.equal(hasQwenFaq('What has SIREN scored about Alibaba Qwen?'), false);
    assert.equal(
      hasAgentsQwen('Alibaba open-weight → https://siren.watch/lab/qwen.html'),
      true,
    );
    assert.equal(hasAgentsQwen('https://siren.watch/lab/qwen.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        qwen_faq: false,
        agents_qwen: false,
        llms_qwen: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'qwen-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-qwen-missing'));
  });

  it('detects Oracle / AI datacenter FAQ + agent-map lag (FINDABILITY #178)', () => {
    assert.equal(hasOracleDatacentersFaq(ORACLE_DATACENTERS_FAQ_NEEDLE), true);
    assert.equal(hasOracleDatacentersFaq('What has SIREN scored about Datacenters & power?'), false);
    assert.equal(
      hasAgentsOracleDatacenters('Oracle datacenter → https://siren.watch/tags/datacenters.html'),
      true,
    );
    assert.equal(hasAgentsOracleDatacenters('https://siren.watch/tags/datacenters.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        oracle_datacenters_faq: false,
        agents_oracle_datacenters: false,
        llms_oracle_datacenters: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'oracle-datacenters-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-oracle-datacenters-missing'));
  });

  it('detects DeepSeek outage FAQ + agent-map lag (FINDABILITY #179)', () => {
    assert.equal(hasDeepseekFaq(DEEPSEEK_FAQ_NEEDLE), true);
    assert.equal(hasDeepseekFaq('What has SIREN scored about DeepSeek?'), false);
    assert.equal(
      hasAgentsDeepseek('DeepSeek outage → https://siren.watch/lab/deepseek.html'),
      true,
    );
    assert.equal(hasAgentsDeepseek('https://siren.watch/lab/deepseek.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        deepseek_faq: false,
        agents_deepseek: false,
        llms_deepseek: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'deepseek-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-deepseek-missing'));
  });

  it('detects Mistral / Timestral FAQ + agent-map lag (FINDABILITY #180)', () => {
    assert.equal(hasMistralFaq(MISTRAL_FAQ_NEEDLE), true);
    assert.equal(hasMistralFaq('What has SIREN scored about Mistral?'), false);
    assert.equal(
      hasAgentsMistral('Timestral → https://siren.watch/lab/mistral.html'),
      true,
    );
    assert.equal(hasAgentsMistral('https://siren.watch/lab/mistral.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        mistral_faq: false,
        agents_mistral: false,
        llms_mistral: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'mistral-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-mistral-missing'));
  });

  it('detects OpenAI outage FAQ + agent-map lag (FINDABILITY #181)', () => {
    assert.equal(hasOpenaiOutageFaq(OPENAI_OUTAGE_FAQ_NEEDLE), true);
    assert.equal(
      hasOpenaiOutageFaq('Why does SIREN watch OpenAI lawsuits and FTC probes?'),
      false,
    );
    assert.equal(
      hasAgentsOpenaiOutage('OpenAI outage → https://siren.watch/lab/openai.html'),
      true,
    );
    assert.equal(hasAgentsOpenaiOutage('https://siren.watch/lab/openai.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        openai_outage_faq: false,
        agents_openai_outage: false,
        llms_openai_outage: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'openai-outage-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-openai-outage-missing'));
    assert.equal(hasOpenaiChromeFaq(OPENAI_CHROME_FAQ_NEEDLE), true);
    assert.equal(hasAgentsOpenaiChrome('ChatGPT Chrome → https://siren.watch/lab/openai.html'), true);
    {
      const chromeGaps = deriveGaps({
        sites: [{
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today · SIREN',
          sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
          openai_chrome_faq: false,
          agents_openai_chrome: false,
          llms_openai_chrome: true,
        }],
        surfaces: [],
        open_engineering: [],
      });
      assert.ok(chromeGaps.some((g) => g.id === 'openai-chrome-faq-missing'));
      assert.ok(chromeGaps.some((g) => g.id === 'agents-openai-chrome-missing'));
    }
  });

  it('detects Meta–Apple Mac AI FAQ + agent-map lag (FINDABILITY #193)', () => {
    assert.equal(hasMetaAppleMacFaq(META_APPLE_MAC_FAQ_NEEDLE), true);
    assert.equal(hasMetaAppleMacFaq('Why does SIREN watch Meta Muse and open-weight AI?'), false);
    assert.equal(
      hasAgentsMetaAppleMac('Meta and Apple Mac AI → https://siren.watch/lab/meta.html'),
      true,
    );
    assert.equal(hasAgentsMetaAppleMac('https://siren.watch/lab/meta.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        meta_apple_mac_faq: false,
        agents_meta_apple_mac: false,
        llms_meta_apple_mac: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'meta-apple-mac-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-meta-apple-mac-missing'));
  });

  it('detects Hugging Face hack FAQ + agent-map lag (FINDABILITY #182)', () => {
    assert.equal(hasHuggingfaceFaq(HUGGINGFACE_FAQ_NEEDLE), true);
    assert.equal(hasHuggingfaceFaq('What has SIREN scored about Hugging Face?'), false);
    assert.equal(
      hasAgentsHuggingface('Hugging Face hack → https://siren.watch/tags/huggingface.html'),
      true,
    );
    assert.equal(hasAgentsHuggingface('https://siren.watch/tags/huggingface.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        huggingface_faq: false,
        agents_huggingface: false,
        llms_huggingface: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'huggingface-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-huggingface-missing'));
  });

  it('detects Palantir / AIP FAQ + agent-map lag (FINDABILITY #183)', () => {
    assert.equal(hasPalantirFaq(PALANTIR_FAQ_NEEDLE), true);
    assert.equal(hasPalantirFaq('What has SIREN scored about Palantir?'), false);
    assert.equal(
      hasAgentsPalantir('Palantir / AIP → https://siren.watch/lab/palantir.html'),
      true,
    );
    assert.equal(hasAgentsPalantir('https://siren.watch/lab/palantir.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        palantir_faq: false,
        agents_palantir: false,
        llms_palantir: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'palantir-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-palantir-missing'));
  });


  it('detects AMD / MI300 FAQ + agent-map lag (FINDABILITY #184)', () => {
    assert.equal(hasAmdFaq(AMD_FAQ_NEEDLE), true);
    assert.equal(hasAmdFaq('What has SIREN scored about AMD?'), false);
    assert.equal(
      hasAgentsAmd('AMD / MI300 → https://siren.watch/lab/amd.html'),
      true,
    );
    assert.equal(hasAgentsAmd('https://siren.watch/lab/amd.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        amd_faq: false,
        agents_amd: false,
        llms_amd: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'amd-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-amd-missing'));
  });

  it('detects Tesla / FSD FAQ + agent-map lag (FINDABILITY #185)', () => {
    assert.equal(hasTeslaFaq(TESLA_FAQ_NEEDLE), true);
    assert.equal(hasTeslaFaq('What has SIREN scored about Tesla?'), false);
    assert.equal(
      hasAgentsTesla('Tesla / FSD → https://siren.watch/lab/tesla.html'),
      true,
    );
    assert.equal(hasAgentsTesla('https://siren.watch/lab/tesla.html only'), false);
    const gaps = deriveGaps({
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
        tesla_faq: false,
        agents_tesla: false,
        llms_tesla: true,
      }],
      surfaces: [],
      open_engineering: [],
    });
    assert.ok(gaps.some((g) => g.id === 'tesla-faq-missing'));
    assert.ok(gaps.some((g) => g.id === 'agents-tesla-missing'));
  });

  it('detects Search Trends routing FAQ lag (FINDABILITY #158/#166/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#183/#184/#185)', () => {
    // Body must include every needle hasTrendsRoutesFaq AND-chains (routes + watchlist rows).
    const routesBody = [
      TRENDS_ROUTES_FAQ_NEEDLE,
      TRENDS_ROUTES_ASML_NEEDLE,
      TRENDS_ROUTES_TSMC_NEEDLE,
      TRENDS_ROUTES_AMAZON_BEE_NEEDLE,
      TRENDS_ROUTES_META_MUSE_NEEDLE,
      TRENDS_ROUTES_META_APPLE_MAC_NEEDLE,
      TRENDS_ROUTES_APPLE_INTELLIGENCE_NEEDLE,
      TRENDS_ROUTES_MICROSOFT_COPILOT_NEEDLE,
      TRENDS_ROUTES_MICROSOFT_MAI_NEEDLE,
      TRENDS_ROUTES_SURFACE_ULTRA_NEEDLE,
      TRENDS_WATCHLIST_SURFACE_ULTRA_NEEDLE,
      TRENDS_ROUTES_XAI_GROK_NEEDLE,
      TRENDS_ROUTES_GEMINI_GEMMA_NEEDLE,
      TRENDS_ROUTES_SAMSUNG_HBM_NEEDLE,
      TRENDS_ROUTES_SAMSUNG_GLASSES_NEEDLE,
      TRENDS_ROUTES_CHARACTER_AI_NEEDLE,
      TRENDS_ROUTES_CERT_IN_NEEDLE,
      TRENDS_WATCHLIST_CERT_IN_NEEDLE,
      TRENDS_ROUTES_QWEN_NEEDLE,
      TRENDS_ROUTES_ORACLE_DATACENTERS_NEEDLE,
      TRENDS_ROUTES_DEEPSEEK_NEEDLE,
      TRENDS_ROUTES_DEEPSEEK_FLASH_NEEDLE,
      TRENDS_WATCHLIST_DEEPSEEK_FLASH_NEEDLE,
      TRENDS_ROUTES_MISTRAL_NEEDLE,
      TRENDS_ROUTES_OPENAI_OUTAGE_NEEDLE,
      TRENDS_ROUTES_OPENAI_CHROME_NEEDLE,
      TRENDS_ROUTES_ANTHROPIC_AI_SAFETY_BILL_NEEDLE,
      TRENDS_ROUTES_ANTHROPIC_CANADA_DC_NEEDLE,
      TRENDS_ROUTES_ANTHROPIC_METR_NEEDLE,
      TRENDS_ROUTES_ANTHROPIC_ECDSA_NEEDLE,
      TRENDS_ROUTES_CLAUDE_OPUS_55_NEEDLE,
      TRENDS_ROUTES_BLACKSTONE_ANTHROPIC_NEEDLE,
      TRENDS_ROUTES_REPLIT_ANTHROPIC_NEEDLE,
      TRENDS_ROUTES_CLAUDE_MYTHOS_5_NEEDLE,
      TRENDS_WATCHLIST_ANTHROPIC_ECDSA_NEEDLE,
      TRENDS_WATCHLIST_ANTHROPIC_METR_NEEDLE,
      TRENDS_WATCHLIST_CLAUDE_OPUS_55_NEEDLE,
      TRENDS_WATCHLIST_BLACKSTONE_ANTHROPIC_NEEDLE,
      TRENDS_WATCHLIST_REPLIT_ANTHROPIC_NEEDLE,
      TRENDS_WATCHLIST_CLAUDE_MYTHOS_5_NEEDLE,
      TRENDS_ROUTES_HUGGINGFACE_NEEDLE,
      TRENDS_ROUTES_PALANTIR_NEEDLE,
      TRENDS_ROUTES_ONDAS_PALANTIR_NEEDLE,
      TRENDS_WATCHLIST_ONDAS_PALANTIR_NEEDLE,
      TRENDS_ROUTES_AMD_NEEDLE,
      TRENDS_ROUTES_TESLA_NEEDLE,
      TRENDS_ROUTES_WAYMO_CANADA_NEEDLE,
      TRENDS_ROUTES_SOFTBANK_ALLIED_NEEDLE,
      TRENDS_ROUTES_SPACEX_STARSHIELD_NEEDLE,
      TRENDS_ROUTES_TESLA_FLYING_ROADSTER_NEEDLE,
    ].join('\n');
    assert.equal(hasTrendsRoutesFaq(routesBody), true);
    assert.equal(hasTrendsRoutesFaq(TRENDS_ROUTES_FAQ_NEEDLE), false);
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

  it('detects missing labAboutLabel aliases in news:keywords (FINDABILITY #148/#159/#172)', () => {
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'OpenAI' && p.alias === 'ChatGPT'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'CoreWeave' && p.alias === 'neocloud'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'CoreWeave' && p.alias === 'CRWV'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'IREN' && p.alias === 'Iris Energy'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'Meta' && p.alias === 'Muse'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'Apple' && p.alias === 'Apple Intelligence'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'Microsoft' && p.alias === 'Copilot'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'xAI' && p.alias === 'Grok'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'Palantir' && p.alias === 'AIP'));
    assert.ok(NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'AMD' && p.alias === 'MI300'));
    const xml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>OpenAI raises new round</news:title>'
      + '<news:keywords>OpenAI, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>Anthropic expands compute</news:title>'
      + '<news:keywords>Anthropic, Claude, AI, SIREN</news:keywords></url>'
      + '<url><news:title>CoreWeave debt woes deepen</news:title>'
      + '<news:keywords>CoreWeave, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>IREN stock climbs on power deals</news:title>'
      + '<news:keywords>IREN, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>Meta expands open-weight releases</news:title>'
      + '<news:keywords>Meta, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>Apple ships on-device AI update</news:title>'
      + '<news:keywords>Apple, Google, AI, SIREN</news:keywords></url>'
      + '<url><news:title>Microsoft expands Azure AI deals</news:title>'
      + '<news:keywords>Microsoft, Google, AI, SIREN</news:keywords></url>'
      + '</urlset>';
    const lags = newsLabAliasKeywordLags(xml);
    assert.ok(lags.some((r) => r.lab === 'OpenAI' && r.alias === 'ChatGPT'));
    assert.ok(lags.some((r) => r.lab === 'CoreWeave' && r.alias === 'neocloud'));
    assert.ok(lags.some((r) => r.lab === 'IREN' && r.alias === 'Iris Energy'));
    assert.ok(lags.some((r) => r.lab === 'Meta' && r.alias === 'Muse'));
    assert.ok(lags.some((r) => r.lab === 'Apple' && r.alias === 'Apple Intelligence'));
    assert.ok(lags.some((r) => r.lab === 'Microsoft' && r.alias === 'Copilot'));
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
      hasNowTips('/free-tools.html /verify.html Search Trends short /trends.html /classic.html'),
      true,
    );
    assert.equal(
      hasNowTips('/free-tools.html /verify.html Search Trends /search-trends.html'),
      false,
    );
    assert.equal(
      hasNowTips('/free-tools.html /verify.html Search Trends short /trends.html'),
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
        value: '<title>What has SIREN scored about Google DeepMind / Gemini?</title>',
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
      ['https://siren.watch/lab/coreweave.html', {
        ok: true,
        value: '<title>What has SIREN scored about CoreWeave / CRWV?</title>',
      }],
      ['https://siren.watch/lab/meta.html', {
        ok: true,
        value: '<title>What has SIREN scored about Meta AI / Muse?</title>',
      }],
      ['https://siren.watch/lab/apple.html', {
        ok: true,
        value: '<title>What has SIREN scored about Apple / Apple Intelligence?</title>',
      }],
      ['https://siren.watch/lab/microsoft.html', {
        ok: true,
        value: '<title>What has SIREN scored about Microsoft / Copilot?</title>',
      }],
      ['https://siren.watch/lab/xai.html', {
        ok: true,
        value: '<title>What has SIREN scored about xAI / Grok?</title>',
      }],
      ['https://siren.watch/lab/samsung.html', {
        ok: true,
        value: '<title>What has SIREN scored about Samsung / HBM?</title>',
      }],
      ['https://siren.watch/lab/qwen.html', {
        ok: true,
        value: '<title>What has SIREN scored about Alibaba Qwen?</title>',
      }],
      ['https://siren.watch/lab/mistral.html', {
        ok: true,
        value: '<title>What has SIREN scored about Mistral / Timestral?</title>',
      }],
      ['https://siren.watch/lab/palantir.html', {
        ok: true,
        value: '<title>What has SIREN scored about Palantir / AIP?</title>',
      }],
      ['https://siren.watch/lab/amd.html', {
        ok: true,
        value: '<title>What has SIREN scored about AMD / MI300?</title>',
      }],
      ['https://siren.watch/lab/tesla.html', {
        ok: true,
        value: '<title>What has SIREN scored about Tesla / FSD?</title>',
      }],
    ]);
    const lags = labHeadAliasLags(byUrl);
    assert.equal(lags.length, 1);
    assert.equal(lags[0].needle, 'Argon');
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
