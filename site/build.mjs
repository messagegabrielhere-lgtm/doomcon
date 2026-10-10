#!/usr/bin/env node
// Static site generator. data/ in, public/ out, nothing in between.
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node site/build.mjs
//
// Paths are overridable (--data/--docs/--out) so the build can be exercised
// against a fixture without writing anything into the real data directory,
// which belongs to the collector.

import { stampAll, stampFiles } from './sitebar.mjs';
import { flattenRooms } from './siteheader.mjs';
import { readFile, writeFile, mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as brand from './brand.mjs';
import * as marks from './brandmarks.mjs';
import { cardAssets, roomCard } from './cardpng.mjs';
import { MONETIZE } from './monetize.mjs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { css as siteCss } from './styles.mjs';
import { stableJson, num, secondsBetween, esc as escHtml } from './templates/_html.mjs';
import * as indexPage from './templates/index.mjs';
import * as homeV2 from './templates/homeV2.mjs';
import { pixelText, roomArt } from './templates/_pixel.mjs';
import * as methodologyPage from './templates/methodology.mjs';
import * as historyPage from './templates/history.mjs';
import * as movePage from './templates/move.mjs';
import * as movesIndexPage from './templates/movesIndex.mjs';
import * as embedPage from './templates/embed.mjs';
import * as notFoundPage from './templates/notFound.mjs';
import * as serverErrorPage from './templates/serverError.mjs';
import * as deskPage from './templates/deskPage.mjs';
import * as infoPages from './templates/infoPages.mjs';
import * as featurePages from './templates/featurePages.mjs';
import * as agentPages from './templates/agentPages.mjs';
import * as mediaPages from './templates/mediaPages.mjs';
import * as moltbookPage from './templates/moltbookPage.mjs';
import * as livePage from './templates/livePage.mjs';
import * as siWatchPage from './templates/siWatchPage.mjs';
import * as wafflePage from './templates/wafflePage.mjs';
import * as statusPage from './templates/statusPage.mjs';
import * as selfAwarePage from './templates/selfAwarePage.mjs';
import * as threatsPage from './templates/threatsPage.mjs';
import { SERVICES as AI_SERVICES } from '../collector/ai-status.mjs';
import * as catalogPages from './templates/catalogPages.mjs';
import { items as faqItems } from './templates/_faq.mjs';
import { TILE_ICONS, tileSvg } from './tileicons.mjs';
import { writeExtras, EXTRAS_PAGES } from './extras.mjs';
import * as topicPages from './templates/topicPages.mjs';
import * as shopPages from './templates/shopPages.mjs';
import * as betsPage from './templates/betsPage.mjs';
import { faqCss } from './templates/_faq.mjs';
import { verifyCss } from './templates/_verify.mjs';
import { sealCss } from './templates/_seal.mjs';
import { mascotCss, mascotFile } from './templates/_mascot.mjs';

function badgeSvg(state) {
  const has = Number.isFinite(state.level);
  const right = has ? `${state.level} · ${String(state.level_name).toUpperCase()}` : 'NO READING';
  const fill = has ? marks.HEAT[state.level] : '#7a828c';
  const rw = 22 + right.length * 7; const lw = 76; const w = lw + rw;
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${x(brand.NAME)} ${x(right)}">
<title>${x(brand.NAME)} ${x(right)}: AI activity tempo, not a prediction</title>
<rect width="${lw}" height="20" fill="#0c1320"/><rect x="${lw}" width="${rw}" height="20" fill="${fill}"/>
<g font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" font-weight="700"><text x="8" y="14" fill="#e8eaee">${x(brand.NAME)}</text>
<text x="${lw + 10}" y="14" fill="#060c16">${x(right)}</text></g></svg>
`;
}

/**
 * A static page that renders its list from an inline script is empty to a
 * crawler that does not run scripts. So the build runs the page's OWN data
 * (the CRATES and TOOLS literals, nothing else) and writes the rows into
 * <main id="manifest"> as plain HTML; the page's script then redraws the
 * same markup and takes over. One source of truth, the file itself.
 */
// A static page can share code with a Node script:
//   <script data-inline="monitor/core.mjs" data-ns="Core"></script>
// becomes a classic script defining `const Core = { ...that module's exports }`.
// The module is wrapped in a function so its private names cannot clash with
// the page's own. It must have no imports.
async function inlineModules(html) {
  const re = /<script data-inline="([\w./-]+\.mjs)" data-ns="([A-Za-z_$][\w$]*)"><\/script>/g;
  let out = html;
  for (const [tag, rel, ns] of html.matchAll(re)) {
    const src = await readFile(path.join(ROOT, rel), 'utf8');
    if (/^\s*import\s/m.test(src)) throw new Error(`${rel}: an inlined module cannot import`);
    const names = [...src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    const body = src.replace(/^export\s+(?=(const|let|function|async|class)\b)/gm, '');
    const js = `const ${ns} = (() => {\n${body}\nreturn { ${names.join(', ')} };\n})();`;
    out = out.replace(tag, () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
  }
  return out;
}


function selfHostFonts(html) {
  return html
    .replace(/<link[^>]+rel=["']preconnect["'][^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*/gi, '')
    .replace(/<link[^>]+href=["']https?:\/\/fonts\.googleapis\.com\/[^"']*["'][^>]*>/gi, '<link rel="stylesheet" href="fonts/fonts.css">')
    .replace(/@import\s+url\(\s*["']?https?:\/\/fonts\.googleapis\.com\/[^)]*\)\s*;?/gi, '');
}

// The Bunker Kit's paid-upgrades crate, from site/monetize.mjs. An entry with
// an affiliate link uses it (rendered rel="sponsored" and stamped Paid link);
// one without stays a plain link to the service.
function injectAffiliates(html) {
  if (!html.includes('/*MZ_AFF*/[]')) return html;
  const rows = MONETIZE.affiliates.map((a) => ['upgrades', a.name, a.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), a.does, a.doom, a.aff ? 'Paid link' : 'Paid service', null, a.aff || null]);
  return html.replace('/*MZ_AFF*/[]', JSON.stringify(rows).replace(/</g, '\\u003c'));
}

function prerenderStatic(html, name, ctx) {
  const x = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const loc = ctx.url(`/${name}`);
  const originBase = `${brand.ORIGIN}${brand.BASE_PATH}`;
  // Hand-written pages predate siren.watch. One canonical, on this host.
  // This function emits the tags it strips, so a leftover github.io canonical
  // cannot outrank the apex.
  let src = String(html).split('https://messagegabrielhere-lgtm.github.io/doomcon').join(originBase);
  src = src.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
  src = src.replace(/<meta\s+property="og:(?:url|image|title|description|type|site_name)"[^>]*>\s*/gi, '');
  src = src.replace(/<meta\s+name="twitter:card"[^>]*>\s*/gi, '');
  const title = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || brand.NAME;
  const desc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  let head = `<link rel="canonical" href="${x(loc)}">
<link rel="icon" href="${x(ctx.href('/favicon.svg'))}" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${x(brand.NAME)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${x(loc)}">
<meta property="og:image" content="${x(ctx.url('/cards/state.png'))}">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="text/markdown" href="${x(ctx.href('/now.md'))}" title="Current reading (markdown)">
<link rel="alternate" type="text/plain" href="${x(ctx.href('/llms.txt'))}" title="llms.txt">
<link rel="describedby" href="${x(ctx.href('/openapi.json'))}" type="application/json">`;
  let out = src;
  const data = src.match(/<script>\n(const CRATES = [\s\S]*?)\nconst packed = /);
  if (data && out.includes('<main id="manifest"></main>')) {
    const { CRATES, TOOLS } = new Function(`${data[1]}\nreturn { CRATES, TOOLS };`)();
    const link = (t) => t[7] || `https://${t[2]}`;
    const body = CRATES.map((c) => {
      const rows = TOOLS.filter((t) => t[0] === c.id);
      if (!rows.length) return '';
      return `<section class="crate"><h2>${x(c.name)}</h2><p class="why">${x(c.why)}</p><div class="rows">`
        + rows.map((t) => `<div class="row">
          <input type="checkbox" class="pack" data-d="${x(t[7] || t[2])}" aria-label="Pack ${x(t[1])}">
          <p class="name"><a href="${x(link(t))}" target="_blank" rel="${t[7] ? 'sponsored ' : ''}noopener">${x(t[1])}</a><small>${x(t[2])}</small></p>
          <p class="doom">${x(t[4])}</p>
          <p class="does">${x(t[3])}${t[5] ? `<br><span class="stamp">${x(t[5])}</span>` : ''}${t[6] ? `<br><span class="stamp unk">${x(t[6])}</span>` : ''}</p>
        </div>`).join('') + '</div></section>';
    }).join('');
    out = out.replace('<main id="manifest"></main>', `<main id="manifest">${body}</main>`);
    const ld = {
      '@context': 'https://schema.org', '@type': 'ItemList', name: title, url: loc,
      numberOfItems: TOOLS.length,
      itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t[1], description: t[3], url: link(t) })),
    };
    head += `\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  }
  // The header (logo, level, primary nav, All rooms) is no longer built here:
  // sitebar.mjs stamps the one shared header (site/siteheader.mjs) onto every
  // page, hand-built or templated, after the build.
  out = out.replace(/<html([^>]*)>/, (m, a) => (/data-theme=/.test(a) ? m : `<html${a} data-theme="dark">`));
  const brandVars = `<style>html:root,html:root[data-theme="dark"]{--bg:#000;--panel:#0E131D;--sunk:#0A0E16;--line:#232C3B;--ink:#F3F4F6;--mute:#AEB7C3;--accent:#4ADE80;--accent-ink:#03130A;--cmp:#818CF8;--zone:rgba(74,222,128,.12);color-scheme:dark}</style>`;
  out = out.replace(/<body([^>]*)>/, (m) => `${m}\n${brandVars}`);
  // Hand-built pages have no shared footer, so they get the same legal line
  // the templated footer carries, pointing at the full terms page.
  const legal = `<p class="v2legal" style="max-width:72ch;margin:24px auto;padding:0 16px 24px;font:400 12px/1.5 system-ui,sans-serif;color:#AEB7C3"><b>Not advice.</b> Information, commentary and satire only — not financial, investment, legal, security or safety advice. Data is automated and may be wrong or late; provided as is, with no warranty. Not affiliated with any company, lab, person or agency named here. Use of this site means you accept the <a href="${x(ctx.href('/terms.html'))}" style="color:#D7DCE3">terms &amp; disclaimers</a>. <a href="${x(ctx.href('/privacy.html'))}" style="color:#D7DCE3">Privacy</a>.</p>`;
  out = out.replace(/<\/body>/, `${legal}\n</body>`);
  head += `\n<link rel="stylesheet" href="${x(ctx.href('/fonts/fonts.css'))}">`;
  return out.replace('</head>', `${head}\n</head>`);
}

import * as feed from './templates/feed.mjs';
import * as newsFeed from './templates/news.mjs';
import * as newsPage from './templates/newsPage.mjs';
import * as racePage from './templates/racePage.mjs';
import * as wattsPage from './templates/wattsPage.mjs';
import * as digestPage from './templates/digestPage.mjs';
import * as blissPage from './templates/blissPage.mjs';
import * as itemPage from './templates/itemPage.mjs';
import * as mapPage from './templates/mapPage.mjs';
import * as leadersPage from './templates/leadersPage.mjs';
import * as newsSitemap from './templates/newsSitemap.mjs';
import * as openapi from './templates/openapi.mjs';
import * as agentText from './templates/agentText.mjs';
import * as facetPages from './templates/facetPages.mjs';
import * as modelPages from './templates/modelPages.mjs';
import * as countryPages from './templates/countryPages.mjs';
import * as comparePages from './templates/comparePages.mjs';
import { page as layoutPage } from './templates/layout.mjs';
import { render as sitemap, robots } from './templates/sitemap.mjs';
import { INDEXNOW_KEY } from '../collector/indexnow.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A move earns a place in sitemap.xml and the RSS feed at half a point or a
// level change. Below that the page still exists forever - permanence is the
// product - but carries noindex,follow so a few thousand near-identical rows
// never become a thin-content problem. See the header of move.mjs.
const SUBSTANTIVE_DELTA = 0.5;

// How far back to look for the "vs yesterday" comparison, and the window that
// counts as "about a day". Outside it we say so rather than compare against
// whatever happens to be nearest.
const DAY_MIN_AGE_S = 20 * 3600;
const DAY_MAX_AGE_S = 40 * 3600;

const SPARK_POINTS = 48;

function parseArgs(argv) {
  const out = { data: 'data', docs: 'docs', out: 'public', quiet: false, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--data' || a === '--docs' || a === '--out') { out[a.slice(2)] = argv[i + 1]; i += 1; }
    else if (a === '--only') {
      out.only = argv[i + 1];
      i += 1;
      if (out.only !== 'news') {
        throw new Error(`build: --only supports "news" (got ${JSON.stringify(out.only)}). Usage: node site/build.mjs [--only news] [--data DIR] [--docs DIR] [--out DIR] [--quiet]`);
      }
    }
    else if (a === '--quiet') out.quiet = true;
    else throw new Error(`build: unknown argument "${a}". Usage: node site/build.mjs [--only news] [--data DIR] [--docs DIR] [--out DIR] [--quiet]`);
  }
  for (const k of ['data', 'docs', 'out']) {
    if (!out[k]) throw new Error(`build: --${k} needs a directory path`);
    out[k] = path.resolve(ROOT, out[k]);
  }
  return out;
}

const warnings = [];
function warn(message) { warnings.push(message); }

// ---------------------------------------------------------------------------
// /flock — the one page module that is NOT a static import.
//
// site/templates/flockPage.mjs is written on its own track. A static `import`
// of a file that has not landed yet is a hard crash for the whole build, which
// would mean this wiring could only be committed AFTER the template — and
// "commit the wiring later" is exactly how this repo ended up with six modules
// built and never imported. So the wiring lands first and picks the template up
// the moment it exists.
//
// The two failure cases are kept apart on purpose:
//   absent              -> silent. There is nothing to warn about: /flock has
//                          no route yet and, because ctx.routes.flock below
//                          carries this fact to layout.mjs, no nav tile
//                          either. The site is simply one section smaller.
//   present but broken  -> a loud WARNING, and every other page still builds.
//                          A template that throws on import must not take
//                          index.html down with it.
// ---------------------------------------------------------------------------
const FLOCK_PAGE_FILE = path.join(ROOT, 'site', 'templates', 'flockPage.mjs');
let flockPage = null;
if (existsSync(FLOCK_PAGE_FILE)) {
  try {
    flockPage = await import('./templates/flockPage.mjs');
  } catch (err) {
    warn(`site/templates/flockPage.mjs is present but failed to load (${err.message}); building without /flock.`);
  }
}

/**
 * THE /flock GATE. This file decides whether public/flock.html exists, so the
 * predicate lives here — and layout.mjs restates it verbatim in hasSection()
 * for the same reason wattsPage's is restated there: importing a page module
 * into layout would close an import cycle. THE TWO MUST MOVE TOGETHER. If they
 * disagree the nav grows a tile that links a 404, which is this repo's other
 * standing failure mode.
 *
 * Note what is required. `coverage` and `copy` are load-bearing, not
 * decoration: copy carries the headline qualifier ("as mapped in OpenStreetMap
 * on <date>"), the empty-state sentence that separates "nobody mapped this"
 * from "there is nothing here", and the "© OpenStreetMap contributors"
 * attribution the ODbL requires. A page rendered without them would be
 * publishing a crowdsourced sample as though it were a census, and would
 * breach the data licence on the way. No copy block, no page.
 */
function hasFlockData(ctx) {
  const f = ctx && ctx.flock;
  return Boolean(
    f
    && f.totals && Number.isFinite(f.totals.mapped_worldwide)
    && Array.isArray(f.counties) && f.counties.length
    && Array.isArray(f.states) && f.states.length
    && f.coverage
    && f.copy && f.copy.attribution_required,
  );
}

/** Where the packed per-camera arrays are published. */
const FLOCK_POINTS_HREF = '/api/flock-points.json';

// ---------------------------------------------------------------------------
// /exploits — the SECOND page module that is not a static import, for exactly
// the reason given for /flock above. site/templates/exploitsPage.mjs is being
// written on its own track; a static `import` of a file that has not landed is
// a hard crash for the whole build, so the wiring lands first and picks the
// template up the moment it exists. Same two failure cases, kept apart:
//
//   absent              -> silent. ctx.routes.exploits below carries the fact
//                          to layout.mjs, so there is no route and no tile.
//   present but broken  -> a loud WARNING, and every other page still builds.
// ---------------------------------------------------------------------------
const EXPLOITS_PAGE_FILE = path.join(ROOT, 'site', 'templates', 'exploitsPage.mjs');
let exploitsPage = null;
if (existsSync(EXPLOITS_PAGE_FILE)) {
  try {
    exploitsPage = await import('./templates/exploitsPage.mjs');
  } catch (err) {
    warn(`site/templates/exploitsPage.mjs is present but failed to load (${err.message}); building without /exploits.`);
  }
}

/**
 * THE /exploits GATE. Same contract as hasFlockData() above — this file
 * decides whether public/exploits.html exists, layout.mjs restates the
 * predicate verbatim in hasSection('exploits'), and THE TWO MUST MOVE
 * TOGETHER. Disagree and the nav grows a tile pointing at a 404, which this
 * repo has shipped before.
 *
 * Every clause is load-bearing, because of WHAT THIS PAGE IS. It publishes a
 * NULL RESULT: a candidate correlate of AI capability that was measured and
 * did not move. A null result is worth something only with its caveats
 * attached, so the caveats are part of the gate rather than part of the page's
 * good intentions.
 *
 *   series.fresh_by_year       the headline series. No series, no page.
 *   series.naive_by_half_year  the ARTEFACT series, required rather than
 *                              optional. Grouped naively the median collapses
 *                              from 1,616 days to 8; the page exists to show
 *                              that this is a new catalogue clearing a backlog
 *                              of decades-old vulnerabilities and not
 *                              attackers getting faster. A build that rendered
 *                              only the flattering series would be publishing
 *                              the finding with the check on it removed.
 *   populations.all.n          the denominator the nav prints, and the number
 *                              every figure on the page has to sit beside.
 *   sources.cisa_kev / .nvd    the two feeds, their URLs and the retrieval
 *                              date. Every figure has to be recomputable.
 *   copy.headline
 *   copy.what_this_is_not      the load-bearing distinction, carried verbatim:
 *                              this does NOT show that AI is not accelerating
 *                              attacks, it shows that no acceleration is
 *                              visible IN THIS MEASUREMENT. Those are
 *                              different sentences and the page must have the
 *                              second one available to print.
 *   honesty                    the limits, led by the biggest: dateAdded is
 *                              when CISA WROTE IT DOWN, not when exploitation
 *                              began.
 *
 * Any one of them absent and there is no page. That is the right failure — a
 * null result stripped of its caveats is just a headline.
 */
function hasExploitsData(ctx) {
  const e = ctx && ctx.exploits;
  const s = e && e.series;
  return Boolean(
    e
    && s && s.fresh_by_year && Array.isArray(s.fresh_by_year.rows) && s.fresh_by_year.rows.length
    && s.naive_by_half_year && Array.isArray(s.naive_by_half_year.rows) && s.naive_by_half_year.rows.length
    && e.populations && e.populations.all && Number.isFinite(e.populations.all.n)
    && e.sources && e.sources.cisa_kev && e.sources.nvd
    && e.copy && e.copy.headline && e.copy.what_this_is_not
    && Array.isArray(e.honesty) && e.honesty.length,
  );
}

// ---------------------------------------------------------------------------
// /world — the THIRD page module that is not a static import, for exactly the
// reason given for /flock above. site/templates/worldPage.mjs and its helper
// _worldmap.mjs are written on their own track; a static `import` of a file
// that has not landed is a hard crash for the whole build, so the wiring
// lands first and picks the template up the moment it exists. Same two
// failure cases, kept apart:
//
//   absent              -> silent. ctx.routes.world below carries the fact to
//                          layout.mjs, so there is no route and no tile.
//   present but broken  -> a loud WARNING, and every other page still builds.
//                          _worldmap.mjs is imported BY the template, so a
//                          broken helper lands here too, not as a crash.
// ---------------------------------------------------------------------------
const WORLD_PAGE_FILE = path.join(ROOT, 'site', 'templates', 'worldPage.mjs');
let worldPage = null;
if (existsSync(WORLD_PAGE_FILE)) {
  try {
    worldPage = await import('./templates/worldPage.mjs');
  } catch (err) {
    warn(`site/templates/worldPage.mjs is present but failed to load (${err.message}); building without /world.`);
  }
}

/**
 * THE /world GATE. Same contract as hasFlockData() above — this file decides
 * whether public/world.html exists, layout.mjs restates the predicate
 * verbatim in hasSection('world'), and THE TWO MUST MOVE TOGETHER. Disagree
 * and the nav grows a tile pointing at a 404. There is a third copy this
 * time: worldPage.mjs exports its own hasWorldData(), which it uses to choose
 * between the page and its empty state. main() compares that one against this
 * one on every build and warns when they disagree, because a drift between
 * the gate and the template would otherwise ship a noindex "nothing to draw"
 * page behind a live tile.
 *
 * Every clause is load-bearing, and for the same reason as /flock's:
 *
 *   sites                       the pins. No sites, nothing to count.
 *   totals                      the counters the hero and the nav print.
 *   copy.attribution_required   "© OpenStreetMap contributors". Attribution
 *                               is a term of the ODbL, not a courtesy; a page
 *                               without it publishes OSM data in breach of
 *                               the licence.
 *   worldOutline.countries      the land. Pins over nothing are a scatter
 *                               plot, not a map, and the outline is also what
 *                               lets the page name the countries drawn blank.
 *
 * data/orbital.json is deliberately NOT in the gate. The register is a
 * section of the page, which renders without it; a missing register must not
 * take the datacentre map down with it.
 */
function hasWorldData(ctx) {
  return Boolean(
    ctx && ctx.world
    && Array.isArray(ctx.world.sites) && ctx.world.sites.length
    && ctx.world.totals
    && ctx.world.copy && ctx.world.copy.attribution_required
    && ctx.worldOutline
    && Array.isArray(ctx.worldOutline.countries) && ctx.worldOutline.countries.length,
  );
}

// ---------------------------------------------------------------------------
// /balance — the FOURTH page module that is not a static import, for exactly
// the reason given for /flock above. site/templates/balancePage.mjs is written
// on its own track; a static `import` of a file that has not landed is a hard
// crash for the whole build, so the wiring lands first and picks the template
// up the moment it exists. Same two failure cases, kept apart:
//
//   absent              -> silent. ctx.routes.balance below carries the fact
//                          to layout.mjs, so there is no route and no Balance
//                          tile, and the Upside tile keeps its place on the bar.
//   present but broken  -> a loud WARNING, and every other page still builds.
//
// One thing differs from the other three: a homepage module links here.
// site/templates/_balance.mjs is loaded by index.mjs on the same terms —
// absent is silent, broken is a WARNING (index.mjs keeps the error in
// balanceLoadError and main() prints it) — and it can load when this page did
// not. index.mjs therefore reads ctx.routes.balance as well as hasBalance():
// a "See the whole balance" link to a page this build never wrote is the
// nav's 404 problem moved into the body.
// ---------------------------------------------------------------------------
const BALANCE_PAGE_FILE = path.join(ROOT, 'site', 'templates', 'balancePage.mjs');
let balancePage = null;
if (existsSync(BALANCE_PAGE_FILE)) {
  try {
    balancePage = await import('./templates/balancePage.mjs');
  } catch (err) {
    warn(`site/templates/balancePage.mjs is present but failed to load (${err.message}); building without /balance.`);
  }
}

/**
 * THE /balance GATE. Same contract as hasWorldData() above — this file
 * decides whether public/balance.html exists, layout.mjs restates the
 * predicate verbatim in hasSection('balance'), and THE TWO MUST MOVE
 * TOGETHER. The third copy is the template's: balancePage.mjs exports
 * hasBalancePage(), which is _balance.mjs's hasBalance(), and picks the page
 * or its empty state with it. main() compares that one against this one on
 * every build and warns when they disagree.
 *
 * What is required, and why it is so little:
 *
 *   balance               the collector's file, whole. Its blocks are NOT
 *                         required one by one, because each has a dark state
 *                         the page prints: a dark newsroom draws the beam
 *                         level and dashed with no count on either pan, and a
 *                         dark counter prints its error in place of a value.
 *                         Gating on them would turn a printed "dark" into a
 *                         missing page, the less honest of the two.
 *   ledger.benefit/.harm  the two registers, as arrays. Without them there is
 *                         no page: the newsroom counts alone are a count of
 *                         words, and the registers are the part of the utopia
 *                         case that carries receipts.
 */
function hasBalanceData(ctx) {
  return Boolean(
    ctx && ctx.balance && ctx.ledger
    && Array.isArray(ctx.ledger.benefit) && Array.isArray(ctx.ledger.harm),
  );
}

async function readJson(file, what) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    throw new Error(`build: cannot read ${what} at ${file} (${err.code || err.message})`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`build: ${what} at ${file} is not valid JSON: ${err.message}`);
  }
}

/**
 * Validate state.json against CONTRACT.md before a single byte is rendered.
 * Every failure here names the field, because "Cannot read property of
 * undefined" three templates deep is how an afternoon disappears.
 */
function validateState(s, file) {
  const bad = (msg) => { throw new Error(`build: ${file} ${msg}`); };

  if (!s || typeof s !== 'object') bad('is not an object');
  for (const k of ['generated_at', 'score', 'level', 'level_name', 'level_since', 'pillars', 'sources']) {
    if (s[k] === undefined) bad(`is missing required field "${k}"`);
  }
  if (!Number.isFinite(s.score)) bad(`.score must be a finite number, got ${JSON.stringify(s.score)}`);
  if (s.score < 0 || s.score > 100) bad(`.score is ${s.score}, outside 0-100`);
  if (!Number.isInteger(s.level) || s.level < 1 || s.level > 5) bad(`.level must be an integer 1-5, got ${JSON.stringify(s.level)}`);
  if (!Number.isFinite(Date.parse(s.generated_at))) bad(`.generated_at is not an ISO-8601 timestamp: ${JSON.stringify(s.generated_at)}`);

  const meta = brand.levelMeta(s.level);
  if (s.level_name !== meta.name) {
    bad(`.level_name is "${s.level_name}" but level ${s.level} is "${meta.name}" in brand.mjs. One of the two is wrong and the site will not ship a contradiction.`);
  }
  // The Schmitt deadband is +/-3 points around every boundary, so a score may
  // legitimately sit just outside its level's nominal band while the level is
  // held. Wider than that means the engine and the band table disagree.
  const [lo, hi] = meta.band;
  // A level the engine is deliberately HOLDING (deadband, dwell, quorum, a dark
  // pillar, the post-change lock, …) can sit further out; the homepage says so.
  // `deadband` must be here: escalate from ROUTINE needs score > BOUNDARY[4]+3
  // (=58), so scores in (54, 58] are held with rule_fired=deadband and sit more
  // than hi+3 (=57) outside the printed band — that is the gate working, not a
  // contradiction.
  const HOLDS = new Set([
    'deadband',
    'frozen_dark_pillar',
    'dwell',
    'quorum',
    'min_interval',
    'locked',
    'insufficient_history',
  ]);
  if (!HOLDS.has(s.rule_fired) && (s.score < lo - 3.001 || s.score > hi + 3.001)) {
    bad(`.score ${s.score} is more than the 3-point deadband outside the ${meta.name} band ${lo}-${hi}`);
  }

  if (!Array.isArray(s.pillars)) bad('.pillars is not an array');
  for (const p of brand.PILLARS) {
    const found = s.pillars.find((x) => x && x.id === p.id);
    if (!found) bad(`.pillars is missing "${p.id}"`);
    if (!found.dark && !found.uncalibrated && !Number.isFinite(found.score)) {
      bad(`.pillars["${p.id}"] is neither dark nor uncalibrated but has no finite score`);
    }
  }
  if (!Array.isArray(s.sources)) bad('.sources is not an array');
  if (s.sources.length === 0) warn('state.json reports zero sources; the freshness strip will be empty.');

  const darkCount = s.pillars.filter((p) => p.dark).length;
  if (darkCount > 0 && s.degraded !== true) {
    bad(`has ${darkCount} dark pillar(s) but degraded=${JSON.stringify(s.degraded)}. A dark pillar is a degraded index by definition.`);
  }
  return s;
}

async function loadHistory(file) {
  if (!existsSync(file)) {
    warn(`no history at ${file}: sparklines will render "no history yet" and the 24h comparison will be omitted. This is expected on a first run.`);
    return [];
  }
  const text = await readFile(file, 'utf8');
  const rows = [];
  text.split('\n').forEach((line, n) => {
    if (!line.trim()) return;
    let row;
    try {
      row = JSON.parse(line);
    } catch (err) {
      // A corrupt line is a corrupt append-only log. Do not skip it quietly -
      // silently dropping observations is how a chart starts lying.
      throw new Error(`build: ${file}:${n + 1} is not valid JSON: ${err.message}`);
    }
    // engine.mjs writes the history timestamp as "t" to keep the append-only log
    // narrow - it is appended on every run and the field name is pure overhead
    // there. Everything downstream speaks generated_at, so normalise once, here,
    // at the only place the log is read. Accept both so an older log still loads.
    const at = row.generated_at ?? row.t;
    if (!Number.isFinite(row.score) || !Number.isFinite(Date.parse(at))) {
      throw new Error(`build: ${file}:${n + 1} needs a finite "score" and an ISO "t"/"generated_at"; got ${line.slice(0, 120)}`);
    }
    rows.push({ ...row, generated_at: at });
  });
  rows.sort((a, b) => Date.parse(a.generated_at) - Date.parse(b.generated_at));
  return rows;
}

async function loadReceipts(dir) {
  if (!existsSync(dir)) {
    warn(`no receipts directory at ${dir}: no move pages, no feed items, no archive. Expected before the collector has run.`);
    return [];
  }
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  const receipts = [];
  for (const name of names) {
    const r = await readJson(path.join(dir, name), `receipt ${name}`);
    for (const k of ['id', 'generated_at', 'score', 'level']) {
      if (r[k] === undefined) throw new Error(`build: receipt ${name} is missing "${k}"`);
    }
    if (!Number.isFinite(r.score)) throw new Error(`build: receipt ${name} has non-finite score ${JSON.stringify(r.score)}`);
    receipts.push(r);
  }
  receipts.sort((a, b) => Date.parse(a.generated_at) - Date.parse(b.generated_at));
  return receipts;
}

/**
 * Receipts are the record; moves are the rendered view of it. Ordered newest
 * first because every surface that lists them wants newest first.
 */
function deriveMoves(receipts) {
  const asc = receipts.map((r, i) => {
    const prev = i > 0 ? receipts[i - 1] : null;
    const delta = Number.isFinite(r.delta_from_previous)
      ? r.delta_from_previous
      : (prev ? r.score - prev.score : 0);
    const previous_score = prev ? prev.score : r.score - delta;
    const previous_level = prev ? prev.level : r.level;
    const level_changed = typeof r.level_changed === 'boolean'
      ? r.level_changed
      : Boolean(prev && prev.level !== r.level);

    const pillars = Array.isArray(r.pillars) ? r.pillars : [];
    const live = pillars.filter((p) => !p.dark && Number.isFinite(p.score));
    const leadPillar = live.length
      ? live.reduce((best, p) => (p.score > best.score ? p : best))
      : null;

    return {
      id: r.id,
      receipt: r,
      generated_at: r.generated_at,
      score: r.score,
      level: r.level,
      level_name: brand.levelMeta(r.level).name,
      previous_score,
      previous_level,
      delta,
      level_changed,
      genesis: !prev,
      leadPillar,
      darkPillars: pillars.filter((p) => p.dark).map((p) => p.id),
      indexable: level_changed || Math.abs(delta) >= SUBSTANTIVE_DELTA || !prev,
      newer: null,
      older: prev ? prev.id : null,
    };
  });

  asc.forEach((m, i) => { m.newer = i < asc.length - 1 ? asc[i + 1].id : null; });
  return asc.reverse();
}

function vsYesterday(state, history) {
  let best = null;
  for (const row of history) {
    const age = secondsBetween(state.generated_at, row.generated_at);
    if (age < DAY_MIN_AGE_S || age > DAY_MAX_AGE_S) continue;
    if (!best || Math.abs(age - 86400) < Math.abs(best.age - 86400)) best = { age, row };
  }
  if (best) {
    return {
      delta: state.score - best.row.score,
      label: `${Math.round(best.age / 3600)}h ago`,
      reference_at: best.row.generated_at,
      basis: 'day',
    };
  }

  // No ~24h reference yet. That is honest for "vs yesterday" but it was
  // silencing the fold entirely: the hero printed "no prior observation to
  // compare" while the score visibly moved 40.7 -> 40.5 between builds, which
  // is the one above-fold fact answering "should I care today". Fall back to
  // the immediately preceding observation and LABEL IT AS WHAT IT IS - a clock
  // time, never dressed up as a day-over-day move.
  const prior = history.length >= 2 ? history[history.length - 2] : null;
  if (!prior || !Number.isFinite(prior.score)) return null;
  const age = secondsBetween(state.generated_at, prior.generated_at);
  if (!Number.isFinite(age) || age <= 0) return null;
  return {
    delta: state.score - prior.score,
    label: `${String(prior.generated_at).slice(11, 16)} UTC`,
    reference_at: prior.generated_at,
    basis: 'previous',
  };
}

/**
 * Directory aliases for every top-level page.
 *
 * Found by the 100-visitor study: /doomcon/race/ returned 404 while
 * /doomcon/race.html served fine. Internal links were right, but every
 * hand-typed guess, every verbal share and the task brief's own path landed on
 * a 404 — and a 404 from a shared link is a visitor lost at the door.
 *
 * GitHub Pages has no rewrite rules, so the fix is a real file at each
 * directory index. It is a copy, not a redirect, so the canonical tag in the
 * page keeps search engines pointed at one URL.
 */
async function writeModelAndCountryPages(ctx, outDir, write, written) {
  for (const model of modelPages.indexableModels(ctx)) {
    written.push(await write(outDir, `model/${model.slug}.html`, modelPages.renderModel(ctx, model.name)));
  }
  written.push(await write(outDir, 'model/index.html', modelPages.renderIndex(ctx)));
  if (ctx.routes && ctx.routes.world && ctx.world) {
    for (const country of countryPages.indexableCountries(ctx)) {
      written.push(await write(outDir, `country/${String(country.iso2).toLowerCase()}.html`, countryPages.renderCountry(ctx, country.iso2)));
    }
    written.push(await write(outDir, 'country/index.html', countryPages.renderIndex(ctx)));
  }
}

function modelAndCountryAliases(ctx) {
  const names = modelPages.indexableModels(ctx).map((model) => `model/${model.slug}`);
  if (ctx.routes && ctx.routes.world && ctx.world) {
    names.push(...countryPages.indexableCountries(ctx).map((country) => `country/${String(country.iso2).toLowerCase()}`));
  }
  return names;
}

async function writeDirectoryAliases(outDir, names, write, written) {
  for (const name of names) {
    const src = path.join(outDir, `${name}.html`);
    if (!existsSync(src)) continue;
    written.push(await write(outDir, `${name}/index.html`, await readFile(src, 'utf8')));
  }
}

function seriesBuilder(history) {
  return (pillarId) => history
    .slice(-SPARK_POINTS)
    .map((row) => {
      // Two shapes exist. state.json carries pillars as an ARRAY of objects;
      // engine.mjs writes history.ndjson with pillars as an OBJECT keyed by
      // pillar id, because the append-only log pays for every repeated key.
      // Reading only the array shape silently returned [] for every pillar
      // against the live log, so each card printed "no history yet" beside
      // observations we were holding in memory. Accept both.
      if (!row.pillars) return null;
      if (Array.isArray(row.pillars)) {
        const p = row.pillars.find((x) => x && x.id === pillarId);
        // A dark reading is a gap, not a zero. Dropping the point leaves a line
        // that connects across the outage, which is the honest shape: we are not
        // claiming to know what happened while the source was down.
        return p && !p.dark && Number.isFinite(p.score) ? p.score : null;
      }
      const v = row.pillars[pillarId];
      // typeof, not truthiness: a legitimate 0 must survive, and a null (dark)
      // must stay a gap rather than collapsing to the bottom of the axis.
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    })
    .filter((v) => v !== null);
}

/** Resolve the share card for an id, or null. Never invent a path. */
function cardResolver(dataDir, outDir) {
  return (id) => {
    if (!id) return null;
    for (const rel of [`cards/${id}.png`, 'cards/current.png']) {
      if (existsSync(path.join(outDir, rel)) || existsSync(path.join(dataDir, rel))) return `/${rel}`;
    }
    for (const rel of [`cards/${id}.svg`, 'cards/current.svg']) {
      if (existsSync(path.join(outDir, rel)) || existsSync(path.join(dataDir, rel))) {
        warn(`share card for ${id} is SVG (${rel}); X and most crawlers will not render an SVG og:image. collector/card.mjs needs to emit PNG.`);
        return `/${rel}`;
      }
    }
    return null;
  };
}

async function write(outDir, rel, body) {
  const file = path.join(outDir, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return file;
}

/** Same, for the PNGs brandmarks.mjs rasterises itself (no encoder dependency). */
async function writeBinary(outDir, rel, bytes) {
  const file = path.join(outDir, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(bytes));
  return file;
}

// The favicon carries the level, so a pinned tab is the index. Generated, not
// stored, so it can never disagree with the number on the page.
function faviconSvg(state) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#0b0c0e"/>
  <text x="32" y="47" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="46"
        font-weight="700" text-anchor="middle" fill="#ffb020">${state.level}</text>
</svg>
`;
}

async function copyCards(dataDir, outDir) {
  const src = path.join(dataDir, 'cards');
  if (!existsSync(src)) return 0;
  const names = await readdir(src);
  let n = 0;
  for (const name of names) {
    if (!/\.(png|svg|jpg|jpeg|webp)$/i.test(name)) continue;
    await mkdir(path.join(outDir, 'cards'), { recursive: true });
    await copyFile(path.join(src, name), path.join(outDir, 'cards', name));
    n += 1;
  }
  return n;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = args.quiet ? () => {} : (...a) => console.log(...a);

  const stateFile = path.join(args.data, 'state.json');
  const state = validateState(await readJson(stateFile, 'state.json'), stateFile);

  const methodologyFile = path.join(args.docs, 'METHODOLOGY.md');
  if (!existsSync(methodologyFile)) {
    // Hard failure on purpose. The whole pitch is "you can check our
    // arithmetic"; shipping a methodology page that says nothing is the exact
    // failure we are built in reaction to. Write the file or skip the build.
    throw new Error(
      `build: ${methodologyFile} does not exist. methodology.html is not optional - ` +
      `it is the page that distinguishes this index from a vibe. Write it, or pass ` +
      `--docs at a directory that has it.`
    );
  }
  const methodologyMd = await readFile(methodologyFile, 'utf8');

  const history = await loadHistory(path.join(args.data, 'history.ndjson'));
  const receipts = await loadReceipts(path.join(args.data, 'receipts'));
  const moves = deriveMoves(receipts);

  // --only news keeps the existing public/ tree and rewrites the newsroom
  // surfaces the minute loop actually needs. A full wipe would throw away
  // ~1,200 static files and cost ~9s just to republish api/news.json.
  // Fall through to a full build when there is nothing to patch.
  let newsOnly = args.only === 'news';
  if (newsOnly && !existsSync(path.join(args.out, 'index.html'))) {
    log('build --only news: no prior public/index.html; running a full build instead');
    newsOnly = false;
  }
  let cardCount = 0;
  if (!newsOnly) {
    // Start from an empty directory so a deleted move page actually disappears
    // instead of lingering in the deployed site forever.
    if (existsSync(args.out)) await rm(args.out, { recursive: true, force: true });
    await mkdir(args.out, { recursive: true });
    cardCount = await copyCards(args.data, args.out);
  }

  const stamps = [...history.map((h) => h.generated_at), ...receipts.map((r) => r.generated_at)]
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  // news.json is optional. The news layer and the index pipeline are separate
  // failure domains by design: a dead feed must not block the index building,
  // and a dark source must not empty the newsroom. Absent -> ctx.news is null
  // and every news template renders nothing.
  let news = null;
  const newsFile = path.join(args.data, 'news.json');
  if (existsSync(newsFile)) {
    try {
      news = JSON.parse(await readFile(newsFile, 'utf8'));
    } catch (err) {
      warn(`data/news.json is present but unreadable (${err.message}); building without the newsroom.`);
    }
  } else {
    warn('data/news.json is absent; building without the newsroom. Run collector/news.mjs first.');
  }

  // Same separate-failure-domain rule as news: /race going dark must not stop
  // the index building, and a dark index must not empty the leaderboard.
  let race = null;
  const raceFile = path.join(args.data, 'race.json');
  if (existsSync(raceFile)) {
    try {
      race = JSON.parse(await readFile(raceFile, 'utf8'));
    } catch (err) {
      warn(`data/race.json is present but unreadable (${err.message}); building without /race.`);
    }
  } else {
    warn('data/race.json is absent; building without /race. Run collector/race.mjs first.');
  }

  // Hand-picked stories for the homepage "Desk picks" strip. Optional and its
  // own failure domain: a bad file drops the strip, never the build.
  let deskPicks = null;
  const deskFile = path.join(args.data, 'desk-picks.json');
  if (existsSync(deskFile)) {
    try {
      deskPicks = JSON.parse(await readFile(deskFile, 'utf8'));
    } catch (err) {
      warn(`data/desk-picks.json is present but unreadable (${err.message}); building without desk picks.`);
    }
  }

  // Breaking clusters and the detection-latency table (collector/breaking.mjs).
  // Optional, its own failure domain: absent or unreadable drops the strip.
  let breaking = null;
  const breakingFile = path.join(args.data, 'breaking.json');
  if (existsSync(breakingFile)) {
    try {
      breaking = JSON.parse(await readFile(breakingFile, 'utf8'));
      if (!breaking || !Array.isArray(breaking.clusters)) breaking = null;
    } catch (err) {
      warn(`data/breaking.json is present but unreadable (${err.message}); building without the breaking strip.`);
    }
  }

  let xwire = null;
  const xFile = path.join(args.data, 'x-surface.json');
  if (existsSync(xFile)) {
    try {
      xwire = JSON.parse(await readFile(xFile, 'utf8'));
    } catch (err) {
      warn(`data/x-surface.json is present but unreadable (${err.message}); building without the X wire.`);
    }
  }

  let bsky = null;
  const bskyFile = path.join(args.data, 'bsky-surface.json');
  if (existsSync(bskyFile)) {
    try {
      bsky = JSON.parse(await readFile(bskyFile, 'utf8'));
    } catch (err) {
      warn(`data/bsky-surface.json is present but unreadable (${err.message}); building without the Bluesky surface.`);
    }
  }

  // Same separate-failure-domain rule as news and race: a dark substrate index
  // must not stop the main index building, and vice versa.
  let infra = null;
  const infraFile = path.join(args.data, 'infra.json');
  if (existsSync(infraFile)) {
    try {
      infra = JSON.parse(await readFile(infraFile, 'utf8'));
    } catch (err) {
      warn(`data/infra.json is present but unreadable (${err.message}); building without /watts.`);
    }
  }

  let datacenters = null;
  const dcFile = path.join(args.data, 'datacenters.json');
  if (existsSync(dcFile)) {
    try { datacenters = JSON.parse(await readFile(dcFile, 'utf8')); }
    catch (err) { warn(`data/datacenters.json unreadable (${err.message}); building without /map.`); }
  }

  let leaders = null;
  const leadersFile = path.join(args.data, 'leaders.json');
  if (existsSync(leadersFile)) {
    try { leaders = JSON.parse(await readFile(leadersFile, 'utf8')); }
    catch (err) { warn(`data/leaders.json unreadable (${err.message}); building without /leaders.`); }
  }

  let digest = null;
  const digestFile = path.join(args.data, 'digest.json');
  if (existsSync(digestFile)) {
    try { digest = JSON.parse(await readFile(digestFile, 'utf8')); }
    catch (err) { warn(`data/digest.json unreadable (${err.message}); building without /digest.`); }
  }

  let bliss = null;
  const blissFile = path.join(args.data, 'bliss.json');
  if (existsSync(blissFile)) {
    try { bliss = JSON.parse(await readFile(blissFile, 'utf8')); }
    catch (err) { warn(`data/bliss.json unreadable (${err.message}); building without /bliss.`); }
  }

  // BOTH FLOCK FILES ARE PUBLISHED VERBATIM, and the text is kept for that
  // reason. collector/flock.mjs already emits canonical, key-sorted,
  // deterministic JSON with one row per line — ["01001","Autauga County",
  // "AL",25] — and stableJson would re-indent every inner array into six
  // lines, taking the aggregate from 305 KB to 543 KB without changing a
  // single value. Republishing the bytes instead means the endpoint is the
  // committed artefact: the same sha256 answers for data/flock.json and for
  // /api/flock.json, which is a stronger recomputability claim than a
  // reformatted copy. The parse below exists only to build ctx.
  let flock = null;
  let flockText = null;
  const flockFile = path.join(args.data, 'flock.json');
  if (existsSync(flockFile)) {
    try {
      flockText = await readFile(flockFile, 'utf8');
      flock = JSON.parse(flockText);
    } catch (err) {
      flock = null;
      flockText = null;
      warn(`data/flock.json unreadable (${err.message}); building without /flock.`);
    }
  }

  // THE PACKED POINT FILE IS READ AS TEXT AND REPUBLISHED BYTE FOR BYTE.
  // collector/flock.mjs already emits canonical, key-sorted, deterministic
  // JSON. Putting it through stableJson would re-indent it at two spaces and
  // put each of ~462,000 integers in the four parallel arrays on its own line,
  // taking the file from 2.6 MiB to roughly 5 MiB for no gain whatsoever.
  // Never JSON.parse this — the only thing done with it is a copy.
  let flockPointsText = null;
  const flockPointsFile = path.join(args.data, 'flock-points.json');
  if (existsSync(flockPointsFile)) {
    try { flockPointsText = await readFile(flockPointsFile, 'utf8'); }
    catch (err) { warn(`data/flock-points.json unreadable (${err.message}); /flock will have no per-camera layer.`); }
  }

  // PUBLISHED VERBATIM, for the same reasons as the two flock files and one
  // more that is specific to this payload. stableJson() sorts object keys
  // alphabetically, and data/exploits.json's key order is documented and
  // deliberate: `dataset`, `measurement`, `sources`, `join` and `populations`
  // come BEFORE the series, so anyone reading the raw file meets the
  // definition and the caveats before the numbers. Alphabetising that puts
  // `copy` and `backfill_evidence` first and the honesty block near the end,
  // which is the wrong reading order for a null result. It would also re-indent
  // each of the 1,726 seven-element entry rows onto seven lines, taking a
  // 164 KiB file past a megabyte without changing one value. So the endpoint is
  // the committed artefact: the same sha256 answers for data/exploits.json and
  // for /api/exploits.json. The parse below exists only to build ctx.
  let exploits = null;
  let exploitsText = null;
  const exploitsFile = path.join(args.data, 'exploits.json');
  if (existsSync(exploitsFile)) {
    try {
      exploitsText = await readFile(exploitsFile, 'utf8');
      exploits = JSON.parse(exploitsText);
    } catch (err) {
      exploits = null;
      exploitsText = null;
      warn(`data/exploits.json unreadable (${err.message}); building without /exploits.`);
    }
  }

  // THE WORLD FILES. Two of the three are published verbatim, for the flock
  // reasons above and with measured sizes of their own. collector/world.mjs
  // writes data/world.json canonical and key-sorted with ONE SITE PER LINE:
  // 2,228,040 bytes in 6,623 lines. Through stableJson every site object is
  // re-indented onto seventeen lines of its own — 2,888,040 bytes in 91,103
  // lines — without changing one value. (Re-measured 2026-10-03 against that
  // day's harvest; these four move with every collector run.) data/orbital.json happens to be byte-identical
  // through stableJson today (22,812 bytes either way), and is copied verbatim
  // anyway, so that "the checksum in the repo is the checksum served" is true
  // by construction rather than by coincidence. /world's "Take the data"
  // section makes exactly that claim. The parses exist only to build ctx.
  //
  // Absent -> silent, like flock.json: the route simply does not exist.
  // Unreadable -> a warning, and every other page still builds.
  let world = null;
  let worldText = null;
  const worldFile = path.join(args.data, 'world.json');
  if (existsSync(worldFile)) {
    try {
      worldText = await readFile(worldFile, 'utf8');
      world = JSON.parse(worldText);
    } catch (err) {
      world = null;
      worldText = null;
      warn(`data/world.json unreadable (${err.message}); building without /world.`);
    }
  }

  // The outline is build input, never an endpoint. It is Natural Earth
  // 1:110m, simplified and quantised by collector/tools/world-outline.mjs, and
  // it only ever DRAWS the land: every site's country was attributed by
  // collector/world.mjs against the finer 1:50m file, because 1:110m has no
  // Singapore polygon. Parsed, not kept as text, because nothing republishes it.
  let worldOutline = null;
  const worldOutlineFile = path.join(args.data, 'world-outline.json');
  if (existsSync(worldOutlineFile)) {
    try { worldOutline = JSON.parse(await readFile(worldOutlineFile, 'utf8')); }
    catch (err) { warn(`data/world-outline.json unreadable (${err.message}); building without /world.`); }
  }

  // The orbital register. Hand-compiled, sourced row by row, and not part of
  // the /world gate: a broken register loses its section and its endpoint,
  // never the map above it.
  let orbital = null;
  let orbitalText = null;
  const orbitalFile = path.join(args.data, 'orbital.json');
  if (existsSync(orbitalFile)) {
    try {
      orbitalText = await readFile(orbitalFile, 'utf8');
      orbital = JSON.parse(orbitalText);
    } catch (err) {
      orbital = null;
      orbitalText = null;
      warn(`data/orbital.json unreadable (${err.message}); /world will build without the orbital register.`);
    }
  }

  // THE BALANCE FILES. Both published verbatim, on the orbital register's
  // terms. collector/balance.mjs refuses data/ledger.json unless it is already
  // canonical — keys sorted at every level, two-space indent, one trailing
  // newline — so that "the checksum in the repository is the checksum served"
  // (docs/BALANCE.md §7), and /balance's "Take the data" section makes that
  // claim. Both files happen to be byte-identical through stableJson today
  // (80,169 and 94,913 bytes on 2026-09-28); copying the bytes makes the claim
  // true by construction rather than by coincidence. The parses exist only to
  // build ctx.
  //
  // Absent -> silent, like world.json: no route, and the Upside tile keeps its
  // place on the bar. Unreadable -> a warning, and every other page builds.
  let balance = null;
  let balanceText = null;
  const balanceFile = path.join(args.data, 'balance.json');
  if (existsSync(balanceFile)) {
    try {
      balanceText = await readFile(balanceFile, 'utf8');
      balance = JSON.parse(balanceText);
    } catch (err) {
      balance = null;
      balanceText = null;
      warn(`data/balance.json unreadable (${err.message}); building without /balance.`);
    }
  }

  // The two hand-verified registers. Required by the gate: no registers, no
  // page, and the homepage module goes with it.
  // Tally's bets (collector/bets.mjs). Optional: without the file there is no page.
  let bets = null;
  try { bets = JSON.parse(await readFile(path.join(args.data, 'bets.json'), 'utf8')); } catch { bets = null; }
  let ledger = null;
  let ledgerText = null;
  const ledgerFile = path.join(args.data, 'ledger.json');
  if (existsSync(ledgerFile)) {
    try {
      ledgerText = await readFile(ledgerFile, 'utf8');
      ledger = JSON.parse(ledgerText);
    } catch (err) {
      ledger = null;
      ledgerText = null;
      warn(`data/ledger.json unreadable (${err.message}); building without /balance.`);
    }
  }

  // OPERATOR-SUPPLIED LOGOS, listed once. The copy loop further down reuses
  // this exact list, so the manifest the templates read and the files that
  // actually land in public/logos/ cannot disagree. Absent -> empty -> every
  // slot falls back to the generated mark.
  const logoDir = path.join(ROOT, 'assets', 'logos');
  const logos = existsSync(logoDir)
    ? (await readdir(logoDir)).filter(
        (n) => !n.startsWith('.') && n.toLowerCase() !== 'readme.md')
    : [];

  // ONE STYLESHEET, CACHED, INSTEAD OF 158KB INLINED INTO EVERY PAGE.
  // Measured 2026-09-26: the homepage carried 157,689 bytes of inline CSS and
  // so did all 334 other pages -- identical bytes, re-downloaded on every
  // navigation, with no cache to show for it. Inlining buys one round trip on
  // a cold first paint and gives it back on the second page and every page
  // after. This site wants multi-page sessions, so the trade was the wrong way
  // round.
  //
  // The filename carries a hash of the contents, so the URL changes when the
  // CSS changes and never otherwise. That makes it safe to cache hard without
  // setting a single header, which matters because GitHub Pages does not let
  // us set any.
  const sheet = `${marks.LOCKUP_CSS}\n${siteCss()}\n${sealCss()}\n${mascotCss()}\n${faqCss()}\n${topicPages.topicCss()}\n${verifyCss()}`;
  const cssName = `s-${createHash('sha256').update(sheet).digest('hex').slice(0, 12)}.css`;
  const cssHref = `${brand.BASE_PATH}/${cssName}`;

  const ctx = {
    state,
    logos,
    news,
    breaking,
    deskPicks,
    race,
    infra,
    digest,
    bliss,
    datacenters,
    flock,
    // The per-camera layer as a POINTER, never as data. 115,608 coordinate
    // triples are 2.6 MiB; a template that put them in ctx as an array would
    // be one careless interpolation away from inlining them into the HTML, so
    // what ctx carries is the published URL and the size, and null when the
    // file was absent — so a template can say the layer is missing rather than
    // request a 404. Today's flockPage renders the whole page server-side from
    // the aggregate and does not need this; it is the contract for the day a
    // per-camera layer is drawn, and the reason the endpoint has a fixed path.
    // gzBytes is what the reader actually pays to fetch it - Pages serves the
    // file compressed - so the button on /flock can say "0.9 MB" and be
    // telling the truth. gzip is deterministic for a given input.
    flockPoints: flockPointsText === null
      ? null
      : {
        href: FLOCK_POINTS_HREF,
        bytes: Buffer.byteLength(flockPointsText, 'utf8'),
        gzBytes: gzipSync(Buffer.from(flockPointsText, 'utf8'), { level: 6 }).length,
      },
    leaders,
    exploits,
    // /world. The parsed payloads only. What /api/world.json and
    // /api/orbital.json serve is the verbatim text read above, never a
    // re-serialisation of these objects.
    world,
    worldOutline,
    orbital,
    // /balance and the homepage module. The parsed payloads only; what
    // /api/balance.json and /api/ledger.json serve is the verbatim text.
    balance,
    ledger,
    bets,
    x: xwire,
    history,
    receipts,
    moves,
    methodologyMd,
    href: (p) => `${brand.BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`,
    cssHref,
    url: (p) => `${brand.ORIGIN}${brand.BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`,
    seriesFor: seriesBuilder(history),
    vsYesterday: vsYesterday(state, history),
    cardFor: cardResolver(args.data, args.out),
    temporalCoverage: stamps.length ? `${stamps[0]}/${stamps[stamps.length - 1]}` : state.generated_at,
  };

  // ---------------------------------------------------------------------------
  // WHICH ROUTES THIS BUILD ACTUALLY WROTE.
  //
  // THE TRAP THIS CLOSES: a route is decided in two modules — this one writes
  // the file, layout.mjs decides whether to draw the tile — and the site has
  // already shipped tiles for pages that were never written. For /flock the
  // two gates are not even made of the same facts: whether data/flock.json is
  // complete is visible to both, but whether site/templates/flockPage.mjs
  // loaded is visible only here. A tile drawn from the data alone would point
  // at a 404 for as long as the template is missing.
  //
  // So build.mjs states the answer and layout.mjs reads it. hasSection('flock')
  // still restates the DATA half of the predicate — the repo's convention,
  // because importing a page module into layout closes an import cycle — and
  // then defers to this flag for the half it cannot see. Both must hold.
  ctx.routes = {
    flock: Boolean(flockPage) && hasFlockData(ctx),
    exploits: Boolean(exploitsPage) && hasExploitsData(ctx),
    world: Boolean(worldPage) && hasWorldData(ctx),
    balance: Boolean(balancePage) && hasBalanceData(ctx),
  };

  // The third copy of the /world predicate lives in the template, where it
  // picks the page or the empty state. If it and the gate above ever disagree,
  // either a live tile leads to a noindex "nothing to draw" page, or data the
  // page could have drawn gets no route at all. Neither is a crash, so neither
  // would be noticed; say it out loud instead.
  if (worldPage && typeof worldPage.hasWorldData === 'function'
    && worldPage.hasWorldData(ctx) !== hasWorldData(ctx)) {
    warn(`hasWorldData() in site/build.mjs and in site/templates/worldPage.mjs disagree about this data; all three copies, with hasSection('world') in layout.mjs, must move together.`);
  }
  // The homepage half of /balance, which index.mjs loads for itself.
  if (indexPage.balanceLoadError) {
    warn(`site/templates/_balance.mjs is present but failed to load (${indexPage.balanceLoadError}); the homepage builds without the balance module.`);
  }
  // The same check for /balance, and the same two silent failures if it drifts.
  if (balancePage && typeof balancePage.hasBalancePage === 'function'
    && balancePage.hasBalancePage(ctx) !== hasBalanceData(ctx)) {
    warn(`hasBalanceData() in site/build.mjs and hasBalancePage() in site/templates/balancePage.mjs disagree about this data; all three copies, with hasSection('balance') in layout.mjs, must move together.`);
  }

  const written = [];
  // The homepage is the PizzINT-style front page (templates/homeV2.mjs). It
  // borrows the classic page's <head> so the title, card, canonical and
  // structured data stay exactly as they were. The classic page still builds,
  // in full, at /classic.html, and the new front page links to it.
  const classicHtml = indexPage.render(ctx);
  const classicHead = (classicHtml.match(/<head>[\s\S]*?<\/head>/) || ['<head><meta charset="utf-8"></head>'])[0];
  // The AI prediction markets that moved most this hour, for the homepage's
  // markets strip: read from the newest raw collector file (polymarket meta).
  try {
    const rawDir = path.join(args.data, 'raw');
    const newest = (await readdir(rawDir)).filter((f) => f.endsWith('.json')).sort().pop();
    const raw = newest ? JSON.parse(await readFile(path.join(rawDir, newest), 'utf8')) : null;
    const list = raw ? (Array.isArray(raw) ? raw : raw.readings || raw.sources || []) : [];
    const pm = Array.isArray(list) ? list.find((x) => x && x.source === 'polymarket') : null;
    ctx.pmTop = pm && pm.meta && Array.isArray(pm.meta.top_contributors) ? pm.meta.top_contributors : [];
  } catch { ctx.pmTop = []; }
  try { ctx.molt = JSON.parse(await readFile(path.join(args.data, 'moltbook.json'), 'utf8')); } catch { ctx.molt = null; }
  try { ctx.liveMedia = JSON.parse(await readFile(path.join(args.data, 'live-media.json'), 'utf8')); } catch { ctx.liveMedia = null; }
  written.push(await write(args.out, 'index.html', homeV2.render(ctx, { head: classicHead })));
  written.push(await write(args.out, 'classic.html', classicHtml));

  // NEWS-ONLY FAST PATH. Used by the minute newsroom loop. Rewrites the pages
  // and JSON the open-tab poller and newsroom HTML need, leaves move pages,
  // methodology, fonts, PNGs and standalone apps untouched, and stamps only
  // the HTML it wrote. Item briefs are rewritten only when the item, its
  // pillar neighbour set, or the index as-of stamp changed — so a one-story
  // tick does not rewrite ~400 mostly-identical files. Measured ~1–2s vs ~9s
  // for a full wipe rebuild; incremental item skips cut I/O further on hot ticks.
  if (newsOnly) {
    written.push(await write(args.out, 'instruments.html', indexPage.render(ctx, { view: 'instruments' })));
    if (newsPage.hasNews(ctx)) {
      written.push(await write(args.out, 'news.html', newsPage.render(ctx)));
    }
    let itemRewritten = 0;
    let itemSkipped = 0;
    if (itemPage.hasItems(ctx)) {
      const items = ctx.news.items;
      const byPillar = new Map();
      for (const it of items) {
        if (!byPillar.has(it.pillar)) byPillar.set(it.pillar, []);
        byPillar.get(it.pillar).push(it);
      }
      // Compare against the previous newsroom on disk (read before we overwrite
      // api/news.json below) so unchanged briefs keep their bytes and mtimes —
      // that lets the overlay rsync skip them on publish.
      let prevItems = [];
      try {
        prevItems = JSON.parse(await readFile(path.join(args.out, 'api/news.json'), 'utf8')).items || [];
      } catch { /* first news-only pass, or corrupt prior */ }
      let prevAsOf = null;
      try {
        prevAsOf = JSON.parse(await readFile(path.join(args.out, 'api/state.json'), 'utf8')).generated_at;
      } catch { /* absent */ }
      const asOfChanged = prevAsOf !== state.generated_at;
      const prevById = new Map(prevItems.map((it) => [it.id, it]));
      const pillarKey = (list, pillar) => list
        .filter((it) => it.pillar === pillar)
        .map((it) => it.id)
        .sort()
        .join('\0');
      const prevPillarKeys = new Map();
      for (const p of new Set(prevItems.map((it) => it.pillar))) {
        prevPillarKeys.set(p, pillarKey(prevItems, p));
      }
      const cohort = (list, name) => list
        .filter((it) => Array.isArray(it.entities) && it.entities.includes(name))
        .map((it) => it.id)
        .sort()
        .join(',');
      const prevCohort = new Map();
      const nextCohort = new Map();
      for (const name of modelPages.modelNames()) {
        prevCohort.set(name, cohort(prevItems, name));
        nextCohort.set(name, cohort(items, name));
      }
      const keep = new Set(['index.html']);
      for (const it of items) {
        const slug = itemPage.slugFor(it);
        keep.add(`${slug}.html`);
        const rel = `item/${slug}.html`;
        const abs = path.join(args.out, rel);
        const prev = prevById.get(it.id);
        const pillarChanged = prevPillarKeys.get(it.pillar) !== pillarKey(items, it.pillar);
        const named = (Array.isArray(it.entities) ? it.entities : []).filter((name) => modelPages.isModelName(name));
        const entityChanged = named.some((name) => prevCohort.get(name) !== nextCohort.get(name));
        const itemChanged = !prev || stableJson(it) !== stableJson(prev);
        if (!asOfChanged && !pillarChanged && !entityChanged && !itemChanged && existsSync(abs)) {
          itemSkipped += 1;
          continue;
        }
        const related = (byPillar.get(it.pillar) || [])
          .filter((r) => r.id !== it.id)
          .slice(0, 5);
        written.push(await write(args.out, rel, itemPage.render(ctx, it, related)));
        itemRewritten += 1;
      }
      const itemDir = path.join(args.out, 'item');
      if (existsSync(itemDir)) {
        for (const name of await readdir(itemDir)) {
          if (!name.endsWith('.html') || keep.has(name)) continue;
          await rm(path.join(itemDir, name), { force: true });
        }
      }
      written.push(await write(args.out, 'item/index.html', itemPage.renderIndex(ctx)));
    }
    for (const p of brand.PILLARS) {
      written.push(await write(args.out, `pillar/${p.id}.html`, facetPages.renderPillar(ctx, p.id)));
    }
    for (const player of facetPages.labsFromRace(ctx)) {
      written.push(await write(args.out, `lab/${player.id}.html`, facetPages.renderLab(ctx, player)));
    }
    for (const s of facetPages.indexableSources(ctx)) {
      written.push(await write(args.out, `source/${s.id}.html`, facetPages.renderSource(ctx, s.id)));
    }
    written.push(await write(args.out, 'source/index.html', facetPages.renderSourceIndex(ctx)));
    await writeModelAndCountryPages(ctx, args.out, write, written);
    // Keep the crawl surfaces in step with the newsroom window (item + facet
    // URLs change every fast pass; a stale sitemap is how Google News goes quiet).
    written.push(await write(args.out, 'sitemap.xml', sitemap(ctx)));
    written.push(await write(args.out, 'news-sitemap.xml', newsSitemap.render(ctx)));
    // The leader wire rides the same fast path since matcher 1.2.0: its press
    // coverage and direct feeds refresh every 15 minutes (collector/leaders.mjs
    // gates its own polling), so the page is rebuilt here rather than waiting
    // for the hourly full pass. Same render, same api copy as the full build.
    if (leadersPage.hasLeaders(ctx)) {
      written.push(await write(args.out, 'leaders.html', leadersPage.render(ctx)));
      if (leaders) written.push(await write(args.out, 'api/leaders.json', stableJson(leaders)));
    }
    await writeDirectoryAliases(args.out, [
      'news', 'leaders',
      ...facetPages.indexableSources(ctx).map((s) => `source/${s.id}`),
      ...modelAndCountryAliases(ctx),
    ], write, written);
    written.push(await write(args.out, 'feed.xml', feed.render(ctx)));
    if (news) written.push(await write(args.out, 'api/news.json', stableJson(news)));
    if (breaking) written.push(await write(args.out, 'api/breaking.json', stableJson(breaking)));
    // Keep state.json's poll surface current so the motion layer's dual fetch
    // does not mix a fresh newsroom with a stale compile stamp.
    written.push(await write(args.out, 'api/state.json', stableJson({
      ...state,
      _about: `${brand.NAME}: ${brand.DESCRIPTION}`,
      _disclaimer: brand.DISCLAIMER,
      _license: brand.LICENSE,
      _docs: ctx.url('/methodology.html'),
    })));
    // Same two-timestamp file the full build ships — open tabs and the
    // sitebar watch this instead of re-downloading news.json every poll.
    written.push(await write(args.out, 'api/fresh.json', stableJson({
      schema: 1,
      state: state.generated_at,
      news: news && typeof news.generated_at === 'string' ? news.generated_at : null,
    })));
    await writeAgentText(ctx, args.data, args.out, write, written);
    await writeSearchAndCatalog(ctx, args.out, write, written, { pages: false });
    const htmlWritten = written.filter((f) => f.endsWith('.html'));
    const stamped = await stampFiles(htmlWritten, args.out, state.generated_at, {
      level: state.level,
      levelName: state.level_name,
      score: state.score,
      rooms: flattenRooms(homeV2.roomGroups(ctx)),
      newsAt: news && news.generated_at,
    });
    const score = num(state.score, 1);
    const idx = await readFile(path.join(args.out, 'index.html'), 'utf8');
    if (!idx.includes(score)) {
      throw new Error(`build --only news: self-check failed - score "${score}" missing from index.html`);
    }
    if (news && !existsSync(path.join(args.out, 'api/news.json'))) {
      throw new Error('build --only news: self-check failed - api/news.json was not written');
    }
    if (!existsSync(path.join(args.out, 'api/fresh.json'))) {
      throw new Error('build --only news: self-check failed - api/fresh.json was not written');
    }
    if (!existsSync(path.join(args.out, 'api/now.txt'))) {
      throw new Error('build --only news: self-check failed - api/now.txt was not written');
    }
    log(`${brand.NAME} news-only build complete.`);
    log(`  out          ${args.out}`);
    log(`  level        ${brand.NAME} ${state.level} (${state.level_name}), score ${score}`);
    log(`  files        ${written.length}`);
    log(`  items        ${itemRewritten} rewritten, ${itemSkipped} unchanged`);
    log(`  sitebar      ${stamped} pages`);
    for (const w of warnings) log(`  WARNING      ${w}`);
    return;
  }

  written.push(await write(args.out, 'instruments.html', indexPage.render(ctx, { view: 'instruments' })));
  written.push(await write(args.out, 'methodology.html', methodologyPage.render(ctx)));
  written.push(await write(args.out, 'methodology.md', methodologyPage.methodologyMd(ctx)));
  written.push(await write(args.out, 'history.html', historyPage.render(ctx)));
  written.push(await write(args.out, 'embed.html', embedPage.render(ctx)));
  // GitHub Pages serves this for every missing path under the site. Without it
  // a dead URL lands on GitHub's own page, with no masthead and no way back.
  written.push(await write(args.out, '404.html', notFoundPage.render(ctx)));
  // Custom hosts / CDNs map 5xx here. GitHub Pages itself rarely serves it, but
  // shipping an on-brand 500 means a status post never has to link a blank page.
  written.push(await write(args.out, '500.html', serverErrorPage.render(ctx)));
  // Hand-written standalone pages in site/static/*.html. They carry their own
  // styles; the build only adds the head tags a crawler needs and, for a page
  // that draws a manifest from its own script, the same rows as static HTML.
  const staticDir = path.join(ROOT, 'site', 'static');
  if (existsSync(staticDir)) {
    for (const name of (await readdir(staticDir)).filter((n) => n.endsWith('.html')).sort()) {
      let src = await readFile(path.join(staticDir, name), 'utf8');
      // KEEP PUBLISHING. A hand-built page that loads Google Fonts trips the
      // compliance gate (visitor IPs to Google) and freezes the WHOLE site,
      // which happened twice on 2026-10-07. Rewrite such links to the
      // self-hosted sheet, on disk as well, so the gate (which scans the
      // source tree too) passes and the build publishes. A family missing
      // from assets/fonts falls back to the page's own font stack.
      const selfHosted = selfHostFonts(src);
      if (selfHosted !== src) {
        warn(`site/static/${name} loaded fonts from Google; rewritten to /fonts/fonts.css. Self-host any family it needs that is missing from assets/fonts.`);
        src = selfHosted;
        await writeFile(path.join(staticDir, name), src);
      }
      const raw = await inlineModules(src);
      written.push(await write(args.out, name, prerenderStatic(injectAffiliates(raw), name, ctx)));
    }
  }
  written.push(await write(args.out, 'moves/index.html', movesIndexPage.render(ctx)));
  for (const key of ['jobs', 'medicine']) {
    if (topicPages.hasTopic(ctx, key)) written.push(await write(args.out, `${key}.html`, topicPages.render(ctx, key)));
  }
  written.push(await write(args.out, 'about.html', infoPages.about(ctx)));
  written.push(await write(args.out, 'privacy.html', infoPages.privacy(ctx)));
  written.push(await write(args.out, 'terms.html', infoPages.terms(ctx)));
  written.push(await write(args.out, 'feedback.html', infoPages.feedback(ctx)));
  // Feature pages carry their own explainer video, just under the heading.
  const withVideo = (html, id) => html.replace(/(<\/h1>[\s\S]*?<\/p>)/, `$1${mediaPages.videoBlock(ctx, id)}`);
  written.push(await write(args.out, 'si-ready.html', withVideo(featurePages.siReady(ctx), 'si-ready')));
  written.push(await write(args.out, 'ai-proof-job.html', withVideo(featurePages.jobProof(ctx), 'ai-proof-job')));
  // SIREN Radio and SIREN TV. Tally's recorded voice update, when the hourly
  // lane has made one (collector/tally-voice.mjs, needs XAI_API_KEY), plays on
  // the radio page; otherwise the browser reads the same words aloud.
  {
    let voice = null;
    try { voice = JSON.parse(await readFile(path.join(args.data, 'tally-voice.json'), 'utf8')); } catch { voice = null; }
    if (voice && voice.audio && existsSync(path.join(args.data, voice.audio))) {
      written.push(await write(args.out, `media/${voice.audio}`, await readFile(path.join(args.data, voice.audio))));
    } else if (voice) voice.audio = null;
    ctx.tallyVoice = voice;
    written.push(await write(args.out, 'radio.html', mediaPages.radio(ctx, voice)));
  }
  written.push(await write(args.out, 'videos.html', mediaPages.videos(ctx)));
  // LIVE: AI on TV & radio (collector/live-media.mjs). The API file is the
  // verbatim text the collector wrote; a missing or unreadable file still
  // builds the room, with its honest empty states.
  {
    let liveText = null, liveMedia = null;
    try { liveText = await readFile(path.join(args.data, 'live-media.json'), 'utf8'); liveMedia = JSON.parse(liveText); } catch { liveText = null; liveMedia = null; }
    ctx.liveMedia = liveMedia;
    written.push(await write(args.out, 'live.html', livePage.render(ctx, liveMedia)));
    if (liveText !== null && liveMedia) written.push(await write(args.out, 'api/live-media.json', liveText));
  }
  {
    // The Waffle House Index (collector/waffle.mjs): storms, Waffle Houses in
    // the path, Google open/closed when enabled, AI data centres alongside.
    let wfText = null, wf = null, usRings = null;
    try { wfText = await readFile(path.join(args.data, 'waffle.json'), 'utf8'); wf = JSON.parse(wfText); } catch { wfText = null; wf = null; }
    try { const wo = JSON.parse(await readFile(path.join(args.data, 'world-outline.json'), 'utf8')); usRings = ((wo.countries || []).find((c) => c.iso2 === 'US') || {}).rings || null; } catch { usRings = null; }
    written.push(await write(args.out, 'waffle.html', wafflePage.render(ctx, wf, usRings)));
    if (wfText !== null && wf) written.push(await write(args.out, 'api/waffle.json', wfText));
  }
  {
    // Is ChatGPT down? (collector/ai-status.mjs, every 15 min; the page polls live.)
    let asText = null, as = null;
    try { asText = await readFile(path.join(args.data, 'ai-status.json'), 'utf8'); as = JSON.parse(asText); } catch { asText = null; as = null; }
    if (!as || !Array.isArray(as.services) || !as.services.length) as = { generated_at: null, services: AI_SERVICES.map(([id, name, product, pg, api, browser]) => ({ id, name, product, page: pg, api, browser, indicator: 'unknown', description: 'Checking…', degraded: [], incidents: [] })) };
    written.push(await write(args.out, 'status.html', statusPage.render(ctx, as)));
    if (asText !== null) written.push(await write(args.out, 'api/ai-status.json', asText));
  }
  {
    // The night it wakes up (fiction on real data-centre positions).
    let saDcs = [], saRings = null;
    try { saDcs = JSON.parse(await readFile(path.join(args.data, 'datacenters.json'), 'utf8')).sites || []; } catch { saDcs = []; }
    try { const wo = JSON.parse(await readFile(path.join(args.data, 'world-outline.json'), 'utf8')); saRings = ((wo.countries || []).find((c) => c.iso2 === 'US') || {}).rings || null; } catch { saRings = null; }
    written.push(await write(args.out, 'self-aware.html', selfAwarePage.render(ctx, saDcs, saRings)));
  }
  {
    // Threat board (collector/threats.mjs; source list from OSIRIS, MIT).
    let thText = null, th = null;
    try { thText = await readFile(path.join(args.data, 'threats.json'), 'utf8'); th = JSON.parse(thText); } catch { thText = null; th = null; }
    written.push(await write(args.out, 'threats.html', threatsPage.render(ctx, th)));
    if (thText !== null) written.push(await write(args.out, 'api/threats.json', thText));
  }
  written.push(await write(args.out, 'live-x.html', featurePages.liveX(ctx)));
  written.push(await write(args.out, 'tally.html', withVideo(agentPages.tally(ctx), 'tally')));
  written.push(await write(args.out, 'staff.html', agentPages.staff(ctx)));
  written.push(await write(args.out, 'careers.html', agentPages.careers(ctx)));
  {
    let molt = null;
    try { molt = JSON.parse(await readFile(path.join(args.data, 'moltbook.json'), 'utf8')); } catch { molt = null; }
    written.push(await write(args.out, 'agents.html', agentPages.agents(ctx, molt)));
    let mh = []; try { mh = (await readFile(path.join(args.data, 'moltbook-history.ndjson'), 'utf8')).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { mh = []; }
    written.push(await write(args.out, 'moltbook.html', moltbookPage.render(ctx, molt, mh)));
    let sig = null, sh = [];
    try { sig = JSON.parse(await readFile(path.join(args.data, 'si-signals.json'), 'utf8')); } catch { sig = null; }
    try { sh = (await readFile(path.join(args.data, 'si-signals-history.ndjson'), 'utf8')).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { sh = []; }
    written.push(await write(args.out, 'si-watch.html', siWatchPage.render(ctx, sig, sh)));
    if (sig) written.push(await write(args.out, 'api/si-signals.json', JSON.stringify(sig, null, 2) + '\n'));
  }
  written.push(await write(args.out, 'bug-out-land.html', agentPages.land(ctx)));
  written.push(await write(args.out, 'skill.md', agentPages.skillMd(ctx)));
  written.push(await write(args.out, 'api/guide.json', JSON.stringify(agentPages.guideIndex(ctx, homeV2.roomGroups(ctx)))));
  // BREAKTHROUGHS. Picked from the newsroom window and merged into an archive
  // in data/ (the hourly full lane commits data/, so the archive outlives the
  // 400-item window). A failed read starts a fresh archive rather than failing.
  {
    const btFile = path.join(args.data, 'breakthroughs.json');
    let prev = [];
    try { prev = JSON.parse(await readFile(btFile, 'utf8')).items || []; } catch { prev = []; }
    const items = featurePages.mergeBreakthroughs(prev, featurePages.pickBreakthroughs(news && news.items));
    try { await writeFile(btFile, `${JSON.stringify({ schema: 1, generated_at: state.generated_at, items }, null, 2)}\n`); } catch (err) { warn(`breakthroughs archive not written: ${err.message}`); }
    written.push(await write(args.out, 'breakthroughs.html', featurePages.breakthroughs(ctx, items)));
  }
  written.push(await write(args.out, 'press.html', infoPages.press(ctx)));
  if (betsPage.hasBets(ctx)) {
    written.push(await write(args.out, 'bets.html', betsPage.render(ctx)));
    written.push(await write(args.out, 'api/bets.json', JSON.stringify(ctx.bets, null, 2) + '\n'));
  }
  written.push(await write(args.out, 'brand.html', infoPages.brandPage(ctx)));
  written.push(await write(args.out, 'p-doom.html', infoPages.pdoom(ctx)));
  written.push(await write(args.out, 'ai-doomsday-clock.html', infoPages.aiClock(ctx)));
  // IndexNow: the key file a search engine fetches to confirm that URL
  // submissions for this site come from this site. The key is public by design.
  written.push(await write(args.out, `${INDEXNOW_KEY}.txt`, INDEXNOW_KEY));
  for (const lv of [1, 2, 3, 4, 5]) {
    written.push(await write(args.out, `brand/tally-${lv}.svg`, mascotFile(lv, marks.HEAT[lv])));
  }
  written.push(await write(args.out, 'library.html', shopPages.library(ctx)));
  written.push(await write(args.out, 'sponsor.html', shopPages.sponsor(ctx)));
  written.push(await write(args.out, 'guide.html', infoPages.guide(ctx)));
  written.push(await write(args.out, 'guide.md', infoPages.guideMd(ctx)));
  // Competitor conquest landings: intercept DoomBench / Skynet / p(doom)
  // alternative queries without borrowing their doom-probability claims.
  for (const entry of comparePages.renderAll(ctx)) {
    written.push(await write(args.out, entry.path, entry.html));
  }
  if (deskPage.hasDesk(ctx)) written.push(await write(args.out, 'desk.html', deskPage.render(ctx)));
  if (newsPage.hasNews(ctx)) {
    written.push(await write(args.out, 'news.html', newsPage.render(ctx)));
  }
  if (racePage.hasRace(ctx)) {
    written.push(await write(args.out, 'race.html', racePage.render(ctx)));
  }
  if (wattsPage.hasWatts ? wattsPage.hasWatts(ctx) : wattsPage.hasInfra(ctx)) {
    written.push(await write(args.out, 'watts.html', wattsPage.render(ctx)));
  }
  if (digestPage.hasDigest(ctx)) {
    written.push(await write(args.out, 'digest.html', digestPage.render(ctx)));
  }
  if (blissPage.hasBliss(ctx)) {
    written.push(await write(args.out, 'bliss.html', blissPage.render(ctx)));
  }
  // hasDatacenters takes the whole ctx, not the data file — it also requires
  // resources_index, because a map of pins with no resource join is just dots.
  if (mapPage.hasDatacenters(ctx)) {
    written.push(await write(args.out, 'map.html', mapPage.render(ctx)));
  }
  if (leadersPage.hasLeaders(ctx)) {
    written.push(await write(args.out, 'leaders.html', leadersPage.render(ctx)));
  }
  // /flock. The ALPR camera map, from OpenStreetMap via Overpass.
  //
  // ctx.routes.flock — set immediately after ctx is built, above — is the ONE
  // place this route is decided. It is deliberately not `flockPage.hasFlock`
  // the way /map defers to mapPage's own predicate, because the nav is drawn
  // by a different module and a gate the nav cannot see is a gate the nav can
  // disagree with. If the template wants a narrower condition it can render
  // its own empty state; that costs a dull page, whereas the other way costs
  // a 404 in the navigation.
  if (ctx.routes.flock) {
    written.push(await write(args.out, 'flock.html', flockPage.render(ctx)));
  }
  // /exploits. Days from a CVE record being published to CISA cataloguing it
  // as exploited — the measurement that came back NEGATIVE and is published
  // for that reason. Gated on ctx.routes.exploits, set immediately after ctx
  // is built and the one place this route is decided, for the same reason
  // /flock is: the nav is drawn by a different module and a gate the nav
  // cannot see is a gate the nav can disagree with.
  if (ctx.routes.exploits) {
    written.push(await write(args.out, 'exploits.html', exploitsPage.render(ctx)));
  }
  // /world. Every datacentre mapped in OpenStreetMap anywhere on Earth, by
  // country, and the orbital register under it. Gated on ctx.routes.world,
  // set immediately after ctx is built and the one place this route is
  // decided, for the reason /flock gives above: the nav is drawn by another
  // module, and a gate the nav cannot see is a gate the nav can disagree with.
  if (ctx.routes.world) {
    written.push(await write(args.out, 'world.html', worldPage.render(ctx)));
  }
  // /balance. Harm and benefit, counted side by side and never summed: the
  // newsroom's two word lists, six live counters, and the two registers.
  // Gated on ctx.routes.balance, set immediately after ctx is built and the
  // one place this route is decided — the nav tile, the footer's two data
  // links, the sitemap entry and the homepage module's link all read it.
  if (ctx.routes.balance) {
    written.push(await write(args.out, 'balance.html', balancePage.render(ctx)));
  }

  // THE LONG TAIL. One permanent page per scored item, which is how pizzint
  // gets 997 of its 1,018 sitemap URLs. Each of ours carries the score
  // decomposition and the corroboration set, so these are unique computed
  // pages rather than the thin doorway pages this pattern usually produces.
  if (itemPage.hasItems(ctx)) {
    const items = ctx.news.items;
    const byPillar = new Map();
    for (const it of items) {
      if (!byPillar.has(it.pillar)) byPillar.set(it.pillar, []);
      byPillar.get(it.pillar).push(it);
    }
    for (const it of items) {
      const related = (byPillar.get(it.pillar) || [])
        .filter((r) => r.id !== it.id)
        .slice(0, 5);
      written.push(await write(args.out, `item/${itemPage.slugFor(it)}.html`, itemPage.render(ctx, it, related)));
    }
    written.push(await write(args.out, 'item/index.html', itemPage.renderIndex(ctx)));
  }
  // Faceted landings (COMPETITIVE-SEO.md): DoomBench/Skynet win on entity URL
  // count; these turn our CSS filters into crawlable pillar and lab pages.
  for (const p of brand.PILLARS) {
    written.push(await write(args.out, `pillar/${p.id}.html`, facetPages.renderPillar(ctx, p.id)));
  }
  for (const player of facetPages.labsFromRace(ctx)) {
    written.push(await write(args.out, `lab/${player.id}.html`, facetPages.renderLab(ctx, player)));
  }
  for (const s of facetPages.indexableSources(ctx)) {
    written.push(await write(args.out, `source/${s.id}.html`, facetPages.renderSource(ctx, s.id)));
  }
  written.push(await write(args.out, 'source/index.html', facetPages.renderSourceIndex(ctx)));
  await writeModelAndCountryPages(ctx, args.out, write, written);
  for (const m of moves) {
    written.push(await write(args.out, `moves/${m.id}.html`, movePage.render(ctx, m)));
  }

  // Pretty directories for hand-typed / verbally shared paths. VISITORS.md §0
  // found /race/ 404 while race.html worked; the same trap hits every .html
  // room when someone says "slash jobs" or bookmarks without the extension.
  await writeDirectoryAliases(
    args.out,
    [
      'race', 'news', 'methodology', 'history', 'digest', 'bliss', 'balance',
      'watts', 'map', 'world', 'leaders', 'flock', 'exploits', 'jobs', 'medicine',
      'about', 'classic', 'embed', 'guide', 'library', 'press', 'brand', 'desk',
      'bets', 'privacy', 'terms', 'feedback', 'sponsor', 'instruments',
      'p-doom', 'ai-doomsday-clock', 'arena', 'scanner', 'monitor', 'elon',
      'game', 'bunker-kit', 'alerts', 'export', 'moltbook', 'staff', 'careers',
      'agents', 'tally', 'changelog', 'live', 'compare', 'alternatives',
      ...comparePages.RIVALS.map((r) => r.path.replace(/^\//, '').replace(/\.html$/, '')),
      ...brand.PILLARS.map((p) => `pillar/${p.id}`),
      ...facetPages.labsFromRace(ctx).map((p) => `lab/${p.id}`),
      ...facetPages.indexableSources(ctx).map((s) => `source/${s.id}`),
      ...modelAndCountryAliases(ctx),
    ],
    write,
    written,
  );

  written.push(await write(args.out, 'sitemap.xml', sitemap(ctx)));
  // Google News channel. Empty file is still valid XML so crawlers never 404.
  written.push(await write(args.out, 'news-sitemap.xml', newsSitemap.render(ctx)));
  written.push(await write(args.out, 'robots.txt', robots(ctx)));
  written.push(await write(args.out, 'openapi.json', openapi.render(ctx)));
  written.push(await write(args.out, 'feed.xml', feed.render(ctx)));
  // The quiet one: an entry only when the level itself changes.
  written.push(await write(args.out, 'feed-level.xml', feed.render(ctx, { levelOnly: true })));
  // Alerts feeds, CSV exports, and the alerts / export / bias / reference-plan /
  // changelog pages (site/extras.mjs).
  written.push(...await writeExtras(ctx, write, args.out, { dataDir: args.data }));
  // THE BRAND MARKS. A smoke-detector mark whose five grille slots stand for
  // the five SIREN levels, and whose FAVICON LIGHTS THE SLOTS UP TO THE
  // CURRENT LEVEL in heat colours — so the browser tab itself carries the
  // reading. Nobody else in this category does that.
  written.push(await write(args.out, 'favicon.svg', marks.faviconSvg(state.level)));
  written.push(await write(args.out, 'og-default.svg', marks.ogImageSvg({ state })));
  // A README badge. GitHub, Substack and most markdown strip iframes, so the
  // embed cannot go where a developer would put it; an <img> can.
  written.push(await write(args.out, 'badge.svg', badgeSvg(state)));
  written.push(await write(args.out, 'llms.txt', agentText.llmsTxt(ctx)));
  // The same file where some crawlers look first. .nojekyll (below) keeps
  // GitHub Pages from dropping the dot-folder.
  written.push(await write(args.out, '.well-known/llms.txt', agentText.llmsTxt(ctx)));
  await writeAgentText(ctx, args.data, args.out, write, written);
  written.push(await write(args.out, 'manifest.webmanifest', marks.manifestJson(state.level)));
  // Pictures. assets/img holds the site's few bitmap images (generated
  // illustrations, credited as such where they are shown); copied through.
  const imgDir = path.join(ROOT, 'assets', 'img');
  if (existsSync(imgDir)) {
    for (const name of (await readdir(imgDir)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort()) {
      written.push(await write(args.out, `img/${name}`, await readFile(path.join(imgDir, name))));
    }
  }
  // Pixel icons for rooms without an illustration of their own (site/tileicons.mjs).
  for (const name of Object.keys(TILE_ICONS)) written.push(await write(args.out, `img/px-${name}.svg`, tileSvg(name)));
  // Media: the explainer video and its poster, and the radio script.
  const mediaDir = path.join(ROOT, 'assets', 'media');
  if (existsSync(mediaDir)) {
    for (const name of (await readdir(mediaDir)).filter((f) => /\.(mp4|webm|jpg|png|webp|vtt|js)$/i.test(f)).sort()) {
      written.push(await write(args.out, `media/${name}`, await readFile(path.join(mediaDir, name))));
    }
  }
  // Self-hosted fonts (see styles.mjs FONT_HREF): copied through as-is.
  const fontDir = path.join(ROOT, 'assets', 'fonts');
  if (existsSync(fontDir)) {
    for (const name of (await readdir(fontDir)).filter((f) => /\.(woff2|css|txt)$/i.test(f)).sort()) {
      written.push(await write(args.out, `fonts/${name}`, await readFile(path.join(fontDir, name))));
    }
  }
  for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    written.push(await writeBinary(args.out, name, marks.iconPng(state.level, { size })));
  }
  written.push(await writeBinary(args.out, 'og-default.png', marks.ogImagePng({ state })));

  // THE SHARE CARDS, as real PNGs. site/cardpng.mjs draws them with a font it
  // defines itself — no image dependency — because X does not render SVG in a
  // post, which is why every card this project built before today went unseen.
  // A card whose data was not collected is omitted, never emitted blank.
  for (const asset of cardAssets({ state, item: (news?.items ?? [])[0] ?? null, race }, {})) {
    written.push(await writeBinary(args.out, asset.path, asset.body));
  }

  // OPERATOR-SUPPLIED LOGOS. Anything in assets/logos/ is copied to
  // public/logos/ and picked up by name — see that directory's README for the
  // slots. Absent files change nothing: every slot falls back to the mark
  // brandmarks.mjs generates. This exists so dropping a file in the repo is
  // the whole integration, rather than a code change each time.
  for (const name of logos) {
    const body = await readFile(path.join(logoDir, name));
    written.push(await writeBinary(args.out, `logos/${name}`, body));
  }

  // GitHub Pages runs Jekyll unless told not to, which silently drops any path
  // beginning with an underscore and adds a build step we do not want.
  written.push(await write(args.out, cssName, sheet));
  written.push(await write(args.out, '.nojekyll', ''));
  // CUSTOM DOMAIN. When brand.CANONICAL_URL moves off github.io (see the two
  // lines in brand.mjs), GitHub Pages needs a CNAME file at the site root.
  {
    const host = new URL(brand.CANONICAL_URL).host;
    if (!host.endsWith('github.io')) written.push(await write(args.out, 'CNAME', `${host}\n`));
  }

  written.push(await write(args.out, 'api/state.json', stableJson({
    ...state,
    _about: `${brand.NAME}: ${brand.DESCRIPTION}`,
    _disclaimer: brand.DISCLAIMER,
    _license: brand.LICENSE,
    _docs: ctx.url('/methodology.html'),
  })));
  written.push(await write(args.out, 'api/history.json', stableJson({
    schema: 1,
    generated_at: state.generated_at,
    count: history.length,
    observations: history,
  })));
  written.push(await write(args.out, 'api/health.json', stableJson(health(state))));
  // Polled by the motion layer's live refresh. Absent when the collector has
  // not run: the client detects the 404, disables news polling and keeps
  // polling state, rather than pretending the newsroom is empty.
  if (news) written.push(await write(args.out, 'api/news.json', stableJson(news)));
  if (breaking) written.push(await write(args.out, 'api/breaking.json', stableJson(breaking)));
  // The open-tab poll. news.json is ~900KB; this is the two timestamps a
  // reader needs to know whether that download is worth making.
  written.push(await write(args.out, 'api/fresh.json', stableJson({
    schema: 1,
    state: state.generated_at,
    news: news && typeof news.generated_at === 'string' ? news.generated_at : null,
  })));
  if (race) written.push(await write(args.out, 'api/race.json', stableJson(race)));
  if (xwire) written.push(await write(args.out, 'api/x-surface.json', stableJson(xwire)));
  if (bsky) written.push(await write(args.out, 'api/bsky-surface.json', stableJson(bsky)));
  if (infra) written.push(await write(args.out, 'api/infra.json', stableJson(infra)));
  if (digest) written.push(await write(args.out, 'api/digest.json', stableJson(digest)));
  if (bliss) written.push(await write(args.out, 'api/bliss.json', stableJson(bliss)));
  if (datacenters) written.push(await write(args.out, 'api/datacenters.json', stableJson(datacenters)));
  if (leaders) written.push(await write(args.out, 'api/leaders.json', stableJson(leaders)));
  // Both verbatim. See the read above; neither goes through stableJson.
  if (flockText !== null) written.push(await write(args.out, 'api/flock.json', flockText));
  if (flockPointsText !== null) {
    written.push(await write(args.out, 'api/flock-points.json', flockPointsText));
  }
  // Verbatim too, and note the condition: the TEXT, not the route. The
  // aggregate is the recompute path for every figure on /exploits, and it is
  // worth publishing whenever it parsed even if the template has not landed
  // yet and the page itself is not being written.
  if (exploitsText !== null) written.push(await write(args.out, 'api/exploits.json', exploitsText));
  // Both verbatim, and note the condition: the ROUTE, not the text. These two
  // files are advertised in exactly one place outside /world itself — the
  // footer's Data column, gated on hasSection('world'), which reads the same
  // flag — so writing them on the route keeps the files and the links that
  // point at them in lockstep. The register additionally needs its own text:
  // the route does not require it, and a register that failed to parse has no
  // bytes to publish.
  if (ctx.routes.world) {
    written.push(await write(args.out, 'api/world.json', worldText));
    if (orbitalText !== null) written.push(await write(args.out, 'api/orbital.json', orbitalText));
  }
  // Both verbatim, and on the ROUTE, for /world's reason: the footer's Data
  // column links them under hasSection('balance'), which reads the same flag,
  // so a link cannot outlive its file. The route requires both parses, and a
  // parse is only ever made from text that was read, so neither text is null
  // here.
  if (ctx.routes.balance) {
    written.push(await write(args.out, 'api/balance.json', balanceText));
    written.push(await write(args.out, 'api/ledger.json', ledgerText));
  }
  written.push(await write(args.out, 'api/index.json', stableJson({
    name: brand.NAME,
    description: brand.DESCRIPTION,
    license: brand.LICENSE,
    generated_at: state.generated_at,
    openapi: ctx.url('/openapi.json'),
    endpoints: {
      state: ctx.url('/api/state.json'),
      history: ctx.url('/api/history.json'),
      health: ctx.url('/api/health.json'),
      receipt: `${ctx.url('/api/receipts/')}{id}.json`,
      receipts: ctx.url('/api/receipts/'),
      news: ctx.news ? ctx.url('/api/news.json') : undefined,
      embed: ctx.url('/embed.html'),
      feed: ctx.url('/feed.xml'),
      openapi: ctx.url('/openapi.json'),
      now_txt: ctx.url('/api/now.txt'),
      now_md: ctx.url('/now.md'),
      llms_txt: ctx.url('/llms.txt'),
    },
  })));
  for (const r of receipts) {
    written.push(await write(args.out, `api/receipts/${r.id}.json`, stableJson(r)));
  }
  // Receipt index — /api/receipts/ 404'd, so the hash chain had nowhere for a
  // stranger to start. Newest first; HTML for humans, JSON for machines.
  // GitHub Pages serves index.html for the directory URL.
  {
    const sorted = [...receipts].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    const indexJson = {
      schema: 1,
      generated_at: state.generated_at,
      count: sorted.length,
      receipts: sorted.map((r) => ({
        id: r.id,
        generated_at: r.generated_at,
        score: r.score,
        level: r.level,
        level_name: r.level_name,
        hash: r.hash,
        prev_hash: r.prev_hash,
        url: ctx.url(`/api/receipts/${r.id}.json`),
      })),
    };
    written.push(await write(args.out, 'api/receipts/index.json', stableJson(indexJson)));
    const rows = sorted.slice(0, 200).map((r) => `<li>
      <a href="${escHtml(ctx.href(`/api/receipts/${r.id}.json`))}"><code>${escHtml(r.id)}</code></a>
      <span class="num">${escHtml(Number.isFinite(r.score) ? num(r.score, 1) : '—')}</span>
      <span>${escHtml(brand.NAME)} ${escHtml(String(r.level ?? ''))} ${escHtml(r.level_name || '')}</span>
    </li>`).join('');
    written.push(await write(args.out, 'api/receipts/index.html', layoutPage({
      ctx,
      path: '/api/receipts/',
      title: `Receipt index — every scored observation · ${brand.NAME}`,
      description: `${sorted.length} hash-chained receipts behind the ${brand.NAME} index. Each one is independently recomputable.`,
      body: `<article class="prose">
  <h1>Receipt index</h1>
  <p>${sorted.length.toLocaleString('en-US')} hash-chained observations. Newest first. Machine-readable: <a href="${escHtml(ctx.href('/api/receipts/index.json'))}">index.json</a>. Spec: <a href="${escHtml(ctx.href('/openapi.json'))}">openapi.json</a>.</p>
  <ol class="receipt-index">${rows}</ol>
  ${sorted.length > 200 ? `<p class="muted">Showing the newest 200. The full list is in <a href="${escHtml(ctx.href('/api/receipts/index.json'))}">index.json</a>.</p>` : ''}
</article>
<style>.receipt-index{list-style:none;padding:0;margin:1.5rem 0;display:flex;flex-direction:column;gap:.5rem}.receipt-index li{display:flex;flex-wrap:wrap;gap:.75rem 1.25rem;align-items:baseline;padding:.55rem 0;border-bottom:1px solid var(--rule,#232C3B)}.receipt-index .num{font-variant-numeric:tabular-nums;font-weight:700}</style>`,
    })));
  }

  await writeSearchAndCatalog(ctx, args.out, write, written);

  // ROOM CARDS. Each room gets its own share image (its art, name, pitch and
  // live figure) and its page's og:image is pointed at it — but only where the
  // page still carries the generic state card; a page with a card of its own
  // (the race) keeps it. A card that fails to draw leaves the page on the
  // state card, never on nothing.
  {
    const ver = state.receipt_id ? `?v=${encodeURIComponent(state.receipt_id)}` : '';
    let n = 0;
    for (const [, items] of homeV2.roomGroups(ctx)) {
      for (const [href, artName, label, live, blurb] of items) {
        const file = href.replace(/^\//, '').replace(/\/$/, '');
        const slug = file.replace(/\.html$/, '').replace(/\//g, '-');
        const page = path.join(args.out, file.endsWith('.html') ? file : path.join(file, 'index.html'));
        if (!existsSync(page)) continue;
        let png;
        try { png = roomCard({ title: label, art: artName, blurb, live }, { level: state.level, generatedAt: state.generated_at }); } catch (err) { warn(`room card for ${href}: ${err.message}`); continue; }
        written.push(await writeBinary(args.out, `cards/room-${slug}.png`, png));
        const html = await readFile(page, 'utf8');
        const re = /(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*\/cards\/state\.png[^"]*(")/g;
        if (!re.test(html)) continue;
        await writeFile(page, html.replace(re, `$1${ctx.url(`/cards/room-${slug}.png`)}${ver}$2`));
        n += 1;
      }
    }
    console.log(`[build] room share cards: ${n} pages repointed`);
  }

  await selfCheck(args.out, state, ctx);
  // Last: the refresh bar and disclosure on every page, dated by the data.
  const stamped = await stampAll(args.out, state.generated_at, {
    level: state.level,
    levelName: state.level_name,
    score: state.score,
    rooms: flattenRooms(homeV2.roomGroups(ctx)),
    intro: mediaPages.INTRO_FOR,
    newsAt: news && news.generated_at,
  });

  log(`${brand.NAME} build complete.`);
  log(`  out          ${args.out}`);
  log(`  level        ${brand.NAME} ${state.level} (${state.level_name}), score ${num(state.score, 1)}`);
  log(`  degraded     ${state.degraded === true}`);
  log(`  observations ${history.length}   receipts ${receipts.length}   cards ${cardCount}`);
  log(`  indexable    ${moves.filter((m) => m.indexable).length} of ${moves.length} move pages`);
  log(`  files        ${written.length}`);
  log(`  sitebar      ${stamped} pages`);
  for (const w of warnings) log(`  WARNING      ${w}`);
}

// THE TEXT SURFACES FOR ASSISTANTS (site/templates/agentText.mjs). Written by
// the full build AND the news-only lane, so /api/now.txt, /now.md and
// /llms-full.txt never lag the homepage. Takeover Watch is read from data/
// here because the news-only lane never loads it into ctx.
async function writeAgentText(ctx, dataDir, outDir, write, written) {
  let siSignals = null;
  try { siSignals = JSON.parse(await readFile(path.join(dataDir, 'si-signals.json'), 'utf8')); } catch { siSignals = null; }
  const src = { state: ctx.state, history: ctx.history, news: ctx.news, leaders: ctx.leaders, siSignals, url: ctx.url };
  written.push(await write(outDir, 'api/now.txt', agentText.nowTxt(src)));
  written.push(await write(outDir, 'now.md', agentText.nowMd(src)));
  written.push(await write(outDir, 'llms-full.txt', agentText.llmsFullTxt(ctx, src)));
}

// SEARCH AND CATALOG (site/templates/catalogPages.mjs). Reads what is on disk
// rather than what this run wrote, so the news-only pass (which writes a
// subset) still indexes the whole site. pages=false refreshes only the index.
async function writeSearchAndCatalog(ctx, outDir, write, written, { pages = true } = {}) {
  const files = [];
  const walk = async (rel) => {
    let names = [];
    try { names = await readdir(path.join(outDir, rel), { withFileTypes: true }); } catch { return; }
    for (const d of names) if (d.isFile()) files.push(rel ? `${rel}/${d.name}` : d.name);
  };
  await walk(''); await walk('api');
  for (const f of ['moves/index.html', 'item/index.html', 'api/receipts/index.json', 'api/receipts/index.html']) {
    if (existsSync(path.join(outDir, f))) files.push(f);
  }
  if (pages) files.push('search.html', 'catalog.html');
  const meta = {};
  for (const f of files.filter((x) => /^[^/]+\.html$/.test(x))) {
    try { meta[f] = catalogPages.pageMeta(await readFile(path.join(outDir, f), 'utf8')); } catch { /* written below */ }
  }
  const entries = catalogPages.catalogEntries({ groups: homeV2.roomGroups(ctx), files, pages: meta, videos: mediaPages.VIDEOS });
  let kit = [];
  try { kit = catalogPages.bunkerTools(await readFile(path.join(ROOT, 'site', 'static', 'bunker-kit.html'), 'utf8')); } catch { kit = []; }
  const arts = new Set();
  try { for (const f of await readdir(path.join(ROOT, 'assets', 'img'))) { const m = f.match(/^art-(.+)\.webp$/); if (m) arts.add(m[1]); } } catch { /* no art */ }
  const index = catalogPages.searchIndex(entries, {
    at: (ctx.news && ctx.news.generated_at) || ctx.state.generated_at,
    news: ctx.news, leaders: ctx.leaders, faq: faqItems(ctx), kit, arts, itemPages: itemPage.hasItems(ctx),
  });
  written.push(await write(outDir, 'api/search-index.json', `${JSON.stringify(index)}\n`));
  if (!pages) return index;
  const counts = {};
  for (const it of index.items) counts[it[0]] = (counts[it[0]] || 0) + 1;
  const popular = ['/race.html', '/news.html', '/moltbook.html', '/monitor.html', '/arena.html#battle', '/export.html']
    .map((u) => entries.find((e) => e.url === u)).filter(Boolean);
  written.push(await write(outDir, 'search.html', catalogPages.search(ctx, { counts, popular })));
  written.push(await write(outDir, 'catalog.html', catalogPages.catalog(ctx, entries)));
  await writeDirectoryAliases(outDir, ['search', 'catalog'], write, written);
  return index;
}

function health(state) {
  const sources = Array.isArray(state.sources) ? state.sources : [];
  const ok = sources.filter((s) => s.ok).length;
  return {
    schema: 1,
    generated_at: state.generated_at,
    degraded: state.degraded === true,
    // pizzint's status endpoint reports "healthy" at a 12% scrape success rate.
    // There is no status word here at all: the ratio is the status.
    sources_ok: ok,
    sources_total: sources.length,
    sources_ok_ratio: sources.length ? Number((ok / sources.length).toFixed(4)) : 0,
    dark_pillars: state.dark_pillars ?? [],
    pillars: (state.pillars ?? []).map((p) => ({
      id: p.id, dark: p.dark === true, sources_ok: p.sources_ok, sources_total: p.sources_total,
    })),
    sources: sources.map((s) => ({ id: s.id, ok: s.ok === true, last_ok: s.last_ok ?? null })),
  };
}

/**
 * The claim this build makes is "the number is in the HTML". Assert it rather
 * than believe it: a refactor that moves the score behind a script would
 * otherwise ship silently and every screenshot of the site would be blank.
 * `ctx` is optional; without it only the index and the widget are checked.
 */
async function selfCheck(outDir, state, ctx = null) {
  const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
  const score = num(state.score, 1);
  const needles = [score, `${brand.NAME} ${state.level}`, state.level_name];
  for (const needle of needles) {
    if (!html.includes(needle)) {
      throw new Error(`build: self-check failed - "${needle}" is not present as text in index.html. The page is not server-rendering the index.`);
    }
  }
  // Scoped to the hero rather than the whole document: the page legitimately
  // contains the string loading="lazy" inside the copy-paste embed snippet, and
  // a check that cries wolf on its own example markup gets deleted by the next
  // person rather than fixed.
  const hero = html.match(/<section class="hero">[\s\S]*?<\/section>/);
  if (!hero) throw new Error('build: self-check failed - no hero section in index.html.');
  if (!hero[0].includes(score)) {
    throw new Error(`build: self-check failed - the score "${score}" is not inside the hero section.`);
  }
  if (/loading|please wait|tactical data|coming soon/i.test(hero[0])) {
    throw new Error('build: self-check failed - index.html hero contains a placeholder instead of the index.');
  }
  const embed = await readFile(path.join(outDir, 'embed.html'), 'utf8');
  if (!embed.includes(score)) {
    throw new Error(`build: self-check failed - the widget does not contain the score "${score}" as text.`);
  }
  if (/all sources live/i.test(embed)) {
    throw new Error('build: self-check failed - embed still claims "all sources live".');
  }
  for (const file of ['news-sitemap.xml', 'openapi.json', 'api/receipts/index.json', 'api/receipts/index.html', 'api/fresh.json']) {
    if (!existsSync(path.join(outDir, file))) {
      throw new Error(`build: self-check failed - missing ${file}`);
    }
  }
  if (!html.includes('v2-plain') || !html.includes('v2-scale') || !html.includes('REUSE THIS READING')) {
    throw new Error('build: self-check failed - homepage fold is missing plain read, scale rail, or reuse block.');
  }

  // /world makes two claims this build can check, so it does. The count is in
  // the HTML, not behind the map script: the same promise as the index, and
  // the one pizzint breaks. And the ODbL attribution is on the page — a
  // licence term, not a courtesy. The page body prints it and so does the
  // footer on this route; this fails the build only if neither still does.
  // The count is checked only when the payload has one: a missing total
  // prints as a dash on the page, and demanding a number here would be
  // asking the page to impute it.
  if (ctx && ctx.routes && ctx.routes.world) {
    const worldHtml = await readFile(path.join(outDir, 'world.html'), 'utf8');
    const sites = ctx.world.totals.sites;
    const needles = [ctx.world.copy.attribution_required];
    if (Number.isFinite(sites)) needles.push(String(sites).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    for (const needle of needles) {
      if (!worldHtml.includes(needle)) {
        throw new Error(`build: self-check failed - "${needle}" is not present as text in world.html.`);
      }
    }
  }

  // /balance makes the index's promise too: the drawing is in the HTML. The
  // scale is an inline SVG with its tilt baked in and no script
  // (docs/MOTION.md Rule 0), on the page and in the homepage module, and a
  // refactor that moved either behind a script would ship a blank where the
  // two counts go. That fails the build. The counts themselves are not
  // searched for: "0" and "11" are in every page, and a needle that always
  // matches checks nothing.
  //
  // The second check is the one the page exists to keep: the pan drawn low
  // is the pan the collector published. The template restates the beam rule
  // from balance.json's constants rather than reading the collector's angle,
  // so the two can drift, and a drift is a weighing nobody published. That
  // is a WARNING rather than a failure, because a wrong tilt on one page must
  // not stop the index publishing, and the warning names both answers.
  if (ctx && ctx.routes && ctx.routes.balance) {
    const balHtml = await readFile(path.join(outDir, 'balance.html'), 'utf8');
    const drawn = balHtml.match(/<svg class="bal__svg[^"]*"[^>]*\bdata-sinks="([a-z]+)" data-angle="(-?[0-9.]+)"/);
    if (!drawn) {
      throw new Error('build: self-check failed - balance.html does not carry the balance drawing as inline SVG.');
    }
    const instHtml = await readFile(path.join(outDir, 'instruments.html'), 'utf8');
    if (!instHtml.includes('<svg class="bal__svg')) {
      throw new Error('build: self-check failed - instruments.html does not carry the balance module\'s drawing, though the /balance route is on.');
    }
    const beam = ctx.balance.newsroom && ctx.balance.newsroom.beam;
    if (beam && beam.state === 'live' && Number.isFinite(beam.angle_deg)) {
      const want = beam.level ? 'none' : String(beam.sinks);
      if (drawn[1] !== want || Math.abs(Math.abs(Number(drawn[2])) - beam.angle_deg) > 0.005) {
        warn(`balance.html draws the ${drawn[1]} pan low at ${drawn[2]} degrees, but data/balance.json publishes ${want} at ${beam.angle_deg}. site/templates/_balance.mjs tilt() and collector/balance.mjs beamFor() have drifted.`);
      }
    }
  }
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exitCode = 1;
});
