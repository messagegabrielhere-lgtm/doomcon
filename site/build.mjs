#!/usr/bin/env node
// Static site generator. data/ in, public/ out, nothing in between.
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node site/build.mjs
//
// Paths are overridable (--data/--docs/--out) so the build can be exercised
// against a fixture without writing anything into the real data directory,
// which belongs to the collector.

import { readFile, writeFile, mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as brand from './brand.mjs';
import * as marks from './brandmarks.mjs';
import { stableJson, num, secondsBetween } from './templates/_html.mjs';
import * as indexPage from './templates/index.mjs';
import * as methodologyPage from './templates/methodology.mjs';
import * as historyPage from './templates/history.mjs';
import * as movePage from './templates/move.mjs';
import * as movesIndexPage from './templates/movesIndex.mjs';
import * as embedPage from './templates/embed.mjs';
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
import { render as sitemap, robots } from './templates/sitemap.mjs';

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
  const out = { data: 'data', docs: 'docs', out: 'public', quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--data' || a === '--docs' || a === '--out') { out[a.slice(2)] = argv[i + 1]; i += 1; }
    else if (a === '--quiet') out.quiet = true;
    else throw new Error(`build: unknown argument "${a}". Usage: node site/build.mjs [--data DIR] [--docs DIR] [--out DIR] [--quiet]`);
  }
  for (const k of ['data', 'docs', 'out']) {
    if (!out[k]) throw new Error(`build: --${k} needs a directory path`);
    out[k] = path.resolve(ROOT, out[k]);
  }
  return out;
}

const warnings = [];
function warn(message) { warnings.push(message); }

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
  if (s.score < lo - 3.001 || s.score > hi + 3.001) {
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

  // Start from an empty directory so a deleted move page actually disappears
  // instead of lingering in the deployed site forever.
  if (existsSync(args.out)) await rm(args.out, { recursive: true, force: true });
  await mkdir(args.out, { recursive: true });
  const cardCount = await copyCards(args.data, args.out);

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

  let xwire = null;
  const xFile = path.join(args.data, 'x-surface.json');
  if (existsSync(xFile)) {
    try {
      xwire = JSON.parse(await readFile(xFile, 'utf8'));
    } catch (err) {
      warn(`data/x-surface.json is present but unreadable (${err.message}); building without the X wire.`);
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

  const ctx = {
    state,
    news,
    race,
    infra,
    digest,
    bliss,
    datacenters,
    leaders,
    x: xwire,
    history,
    receipts,
    moves,
    methodologyMd,
    href: (p) => `${brand.BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`,
    url: (p) => `${brand.ORIGIN}${brand.BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`,
    seriesFor: seriesBuilder(history),
    vsYesterday: vsYesterday(state, history),
    cardFor: cardResolver(args.data, args.out),
    temporalCoverage: stamps.length ? `${stamps[0]}/${stamps[stamps.length - 1]}` : state.generated_at,
  };

  const written = [];
  written.push(await write(args.out, 'index.html', indexPage.render(ctx)));
  written.push(await write(args.out, 'methodology.html', methodologyPage.render(ctx)));
  written.push(await write(args.out, 'history.html', historyPage.render(ctx)));
  written.push(await write(args.out, 'embed.html', embedPage.render(ctx)));
  written.push(await write(args.out, 'moves/index.html', movesIndexPage.render(ctx)));
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
  for (const m of moves) {
    written.push(await write(args.out, `moves/${m.id}.html`, movePage.render(ctx, m)));
  }

  await writeDirectoryAliases(
    args.out,
    ['race', 'news', 'methodology', 'history', 'digest', 'bliss', 'watts', 'map', 'leaders'],
    write,
    written,
  );

  written.push(await write(args.out, 'sitemap.xml', sitemap(ctx)));
  written.push(await write(args.out, 'robots.txt', robots(ctx)));
  written.push(await write(args.out, 'feed.xml', feed.render(ctx)));
  // THE BRAND MARKS. A smoke-detector mark whose five grille slots stand for
  // the five DOOMCON levels, and whose FAVICON LIGHTS THE SLOTS UP TO THE
  // CURRENT LEVEL in heat colours — so the browser tab itself carries the
  // reading. Nobody else in this category does that.
  written.push(await write(args.out, 'favicon.svg', marks.faviconSvg(state.level)));
  written.push(await write(args.out, 'og-default.svg', marks.ogImageSvg({ state })));
  written.push(await write(args.out, 'manifest.webmanifest', marks.manifestJson(state.level)));
  for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    written.push(await writeBinary(args.out, name, marks.iconPng(state.level, { size })));
  }
  written.push(await writeBinary(args.out, 'og-default.png', marks.ogImagePng({ state })));

  // GitHub Pages runs Jekyll unless told not to, which silently drops any path
  // beginning with an underscore and adds a build step we do not want.
  written.push(await write(args.out, '.nojekyll', ''));

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
  if (race) written.push(await write(args.out, 'api/race.json', stableJson(race)));
  if (xwire) written.push(await write(args.out, 'api/x-surface.json', stableJson(xwire)));
  if (infra) written.push(await write(args.out, 'api/infra.json', stableJson(infra)));
  if (digest) written.push(await write(args.out, 'api/digest.json', stableJson(digest)));
  if (bliss) written.push(await write(args.out, 'api/bliss.json', stableJson(bliss)));
  if (datacenters) written.push(await write(args.out, 'api/datacenters.json', stableJson(datacenters)));
  if (leaders) written.push(await write(args.out, 'api/leaders.json', stableJson(leaders)));
  written.push(await write(args.out, 'api/index.json', stableJson({
    name: brand.NAME,
    description: brand.DESCRIPTION,
    license: brand.LICENSE,
    generated_at: state.generated_at,
    endpoints: {
      state: ctx.url('/api/state.json'),
      history: ctx.url('/api/history.json'),
      health: ctx.url('/api/health.json'),
      receipt: `${ctx.url('/api/receipts/')}{id}.json`,
      embed: ctx.url('/embed.html'),
      feed: ctx.url('/feed.xml'),
    },
  })));
  for (const r of receipts) {
    written.push(await write(args.out, `api/receipts/${r.id}.json`, stableJson(r)));
  }

  await selfCheck(args.out, state);

  log(`${brand.NAME} build complete.`);
  log(`  out          ${args.out}`);
  log(`  level        ${brand.NAME} ${state.level} (${state.level_name}), score ${num(state.score, 1)}`);
  log(`  degraded     ${state.degraded === true}`);
  log(`  observations ${history.length}   receipts ${receipts.length}   cards ${cardCount}`);
  log(`  indexable    ${moves.filter((m) => m.indexable).length} of ${moves.length} move pages`);
  log(`  files        ${written.length}`);
  for (const w of warnings) log(`  WARNING      ${w}`);
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
 */
async function selfCheck(outDir, state) {
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
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exitCode = 1;
});
