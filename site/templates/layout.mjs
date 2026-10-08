// The document shell every page is poured into. One <style> block, no external
// stylesheet, no framework. If a page needs JavaScript to show its number, it is
// wrong.
//
// v4 changed what this file is FOR. It used to be a wrapper: masthead, one
// counter strip, a footer with five links. It is now the publication's chrome —
// the thing that makes six pages read as one desk rather than one page with
// siblings. Three additions carry that:
//
//   1. THE RAIL. A single dense status line of facts about DIFFERENT things:
//      the signed delta since the previous observation, when the next one is
//      due, when this one landed, the source counters, the posture. Measured
//      against pizzint, our problem was never glyph count - it was that ~20 of
//      our 57 desktop atoms were the SAME composite score wearing a different
//      hat. Every cell here is a fact the hero does not already state.
//
//   2. TWO ATOMS THAT MOVE, AND ARE NEVER WRONG. `OBSERVED 00:04:49Z` grows a
//      ticking `· 7m 12s ago`, and `NEXT DUE 00:15Z` becomes a live countdown
//      that degrades to DUE and then to OVERDUE. On a quiet night pizzint
//      changed exactly two above-fold strings in seventy seconds - a clock and
//      a countdown - and that is the whole of their perceived liveness. We had
//      zero. Both of ours carry information theirs do not, and both are exact
//      UTC facts in the static HTML before any script runs.
//
//   3. THE RETURN LINE. `SINCE YOU LOOKED` diffs this build against what the
//      browser stored on the last visit. Nobody in this category has a return
//      state at all - grepping all 26 of pizzint's JS chunks finds three
//      localStorage keys, none of them about change. We have stable receipt
//      ids and a signed delta, which is everything the mechanic needs.
//
// The motion layer (o.motion) is unchanged: opt-in, off for every caller that
// does not ask, and everything it animates is already in the HTML it decorates.

import { seal } from './_seal.mjs';
import { mascot } from './_mascot.mjs';
import { esc, num, utc, utcClock, jsonScript } from './_html.mjs';
import { degradedBanner, deltaChip } from './_parts.mjs';
import { motionBlock } from './_motion.mjs';
import { css, FONT_HREF } from '../styles.mjs';
import { pixelText, icon, roomArt } from './_pixel.mjs';
import * as brand from '../brand.mjs';
import { MONETIZE, on as mzOn } from '../monetize.mjs';
import * as marks from '../brandmarks.mjs';

/**
 * The publication. Order is the nav order and the footer order, so a reader who
 * learns one has learned both.
 *
 * `needs` gates a route on data that may be absent: build.mjs only writes
 * race.html when data/race.json parsed and news.html when data/news.json did.
 * A nav that links a 404 is worse than a nav with five items, and "be careful"
 * is not a mechanism - the gate is. hasSection() below holds every predicate.
 *
 * `count(ctx)` is what turns the nav from a list of words into an instrument.
 *
 * Every destination that HOLDS a number publishes it in the nav, so a reader
 * learns what is behind a link before spending a tap on it. Each returns
 * `{ v, k }` — the figure, and the word a screen reader hears in its place —
 * or null, and null prints nothing at all rather than a dash. Methodology has
 * no scalar and is deliberately left bare: a nav that invented a number for the
 * page that explains the numbers would be a joke at its own expense.
 */
const SECTIONS = [
  { href: '/', label: 'Index', short: 'Index',
    blurb: 'The composite, the five pillars, the live signal feed.',
    count: (ctx) => (ctx.state && Number.isFinite(ctx.state.score)
      ? { v: num(ctx.state.score, 1), k: 'composite score' } : null) },
  // A side project on its own data track (scanner-data, investors-data,
  // arena-data), so no count here: its numbers load in the page itself.
  { href: '/arena.html', label: 'Stock picks', short: 'Picks',
    blurb: 'Today\'s rule-based stock picks with their track record, big investors\' disclosed trades, and the AI trading battle.' },
  // A side project on its own data track (elon-data), like Stock picks above: no
  // count here, the clip index loads in the page itself.
  { href: '/elon.html', label: 'Real Clips', short: 'Clips',
    blurb: 'Real clips of Elon Musk and of superintelligence talks, only from the channels that filmed them. Paste a link to check a clip.' },
  { href: '/race.html', label: 'The Race', short: 'Race', needs: 'race',
    blurb: 'Frontier labs ranked on live prediction-market odds.',
    count: raceCount },
  { href: '/news.html', label: 'Newsroom', short: 'News', needs: 'news',
    blurb: 'Every story, scored on how many independent sources carried it.',
    count: (ctx) => (ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length
      ? { v: String(ctx.news.items.length), k: 'scored items' } : null) },
  { href: '/watts.html', label: 'Power', short: 'Power', needs: 'watts',
    blurb: 'The substrate index: grid load, drought and buildout under the models.',
    count: (ctx) => (ctx.infra && Number.isFinite(ctx.infra.score)
      ? { v: num(ctx.infra.score, 1), k: 'substrate score' } : null) },
  { href: '/map.html', label: 'Map', short: 'Map', needs: 'map',
    blurb: 'Where the compute physically sits, against the water it needs.',
    count: (ctx) => (ctx.datacenters && ctx.datacenters.counts
      ? { v: String(ctx.datacenters.counts.sites ?? ctx.datacenters.sites.length), k: 'datacentres mapped' } : null) },
  // Immediately after /map, because it is /map with the border taken away:
  // the same OpenStreetMap source, the same three status marks, the whole
  // planet — and joined to nothing, where /map joins every pin to its water
  // and its grid. The two US figures differ and both pages say why.
  //
  // THE COUNT IS QUALIFIED IN THE NAV, as the Cameras tile's is and for the
  // same reason. 5,274 (on 2026-09-27) heard bare is heard as "the
  // datacentres in the world", which is the one phrase copy.never_say exists
  // to forbid: it is the number of map objects volunteers have tagged. So
  // `k` carries copy.headline_qualifier from the payload rather than a date
  // typed here. No total in the payload, no figure on the tile — the dot,
  // not the length of some other array standing in for a number that was
  // not published.
  { href: '/world.html', label: 'World', short: 'World', needs: 'world',
    blurb: 'Every datacentre mapped in OpenStreetMap, anywhere on Earth. Then orbit: what flies, against what is filed.',
    count: (ctx) => {
      const w = ctx.world;
      if (!w || !w.totals || !Number.isFinite(w.totals.sites)) return null;
      const q = w.copy && w.copy.headline_qualifier ? w.copy.headline_qualifier : 'as mapped in OpenStreetMap';
      return { v: grouped(w.totals.sites), k: `datacentres ${q}` };
    } },
  // Beside the two datacentre maps on purpose: all three are maps of physical
  // AI infrastructure, and a reader who has learned one legend has learned
  // half of the next.
  //
  // THE COUNT IS QUALIFIED IN THE NAV ITSELF. `k` is what a screen reader
  // hears in place of the figure, and it carries copy.headline_qualifier — "as
  // mapped in OpenStreetMap on <date>" — because 115,608 read as a national
  // total is the single wrong reading this page exists to prevent, and a bare
  // number in a navigation bar is read as a total by default. The qualifier
  // comes from the payload rather than from a string typed here, so it cannot
  // drift from the date the data was actually collected.
  { href: '/flock.html', label: 'Cameras', short: 'Cameras', needs: 'flock',
    blurb: 'Automated licence-plate readers, as volunteers have mapped them into OpenStreetMap.',
    count: (ctx) => {
      const f = ctx.flock;
      if (!f || !f.totals || !Number.isFinite(f.totals.mapped_worldwide)) return null;
      const q = f.copy && f.copy.headline_qualifier ? f.copy.headline_qualifier : 'as mapped in OpenStreetMap';
      return { v: grouped(f.totals.mapped_worldwide), k: `Flock ALPR cameras ${q}` };
    } },
  // "Exploits", not "KEV", not "Disclosure-to-catalogue lag". The tile that
  // used to say ALPR now says Cameras because a stranger could not tell what
  // ALPR was, and the acronym here is worse: nobody outside the field knows
  // the Known Exploited Vulnerabilities catalogue by its initials.
  //
  // THE COUNT IS QUALIFIED, and the qualifier is the whole job. 1,726 is the
  // ENTIRE catalogue since it opened in 2021 — not a rate, not a year, not a
  // backlog of live incidents — and a bare four-figure number on a tile
  // labelled Exploits is read as "1,726 things are on fire". `k` is what a
  // screen reader hears in place of the figure and what a pointer shows, and
  // it says which catalogue, since when, and as of when. Every part of it
  // comes from the payload, so it cannot drift from the data.
  { href: '/exploits.html', label: 'Exploits', short: 'Exploits', needs: 'exploits',
    blurb: 'Days from a vulnerability record going public to the US government cataloguing it as exploited. Flat for four years.',
    count: (ctx) => {
      const e = ctx.exploits;
      const all = e && e.populations ? e.populations.all : null;
      if (!all || !Number.isFinite(all.n)) return null;
      const q = e.copy && e.copy.retrieved_qualifier ? e.copy.retrieved_qualifier : 'as catalogued at the retrieval date';
      const since = all.first_listed ? ` since it opened on ${all.first_listed}` : '';
      return { v: grouped(all.n), k: `entries in the whole CISA catalogue of exploited vulnerabilities${since}, ${q}` };
    } },
  { href: '/leaders.html', label: 'Leaders', short: 'Leaders', needs: 'leaders',
    blurb: 'What the people running AI said this week, as their publishers printed it.',
    count: (ctx) => {
      const rows = ctx.leaders && Array.isArray(ctx.leaders.leaders) ? ctx.leaders.leaders : null;
      if (!rows) return null;
      const on = rows.filter((r) => Array.isArray(r.lines) && r.lines.length).length;
      return { v: `${on}/${rows.length}`, k: 'leaders on the record this week' };
    } },
  { href: '/digest.html', label: 'Digest', short: 'Digest', needs: 'digest',
    blurb: 'The day in one page, assembled from the scored corpus.' },
  // BALANCE TAKES UPSIDE'S TILE. The operator asked for the other viewpoint —
  // AI solving problems, beside the doom case — and /balance is where that
  // lives: benefit and harm counted side by side and never summed, with BLISS
  // printed on it as context and a link through to /bliss. So the bar carries
  // one tile for the whole question rather than one for its sunny half.
  //
  // THE COUNT IS THE PAIR THE BEAM TILTS ON, and nothing else: newsroom
  // stories in this window that matched the benefit list only, then the harm
  // list only, in the drawing's order (benefit left, harm right). Never their
  // difference and never their ratio as a number (docs/BALANCE.md §4); the
  // colon separates two counts and computes nothing. `k` says what they are
  // and which window, from the file's own stamp. A dark newsroom has no count
  // on either pan, so the tile prints the dot, never 0 : 0.
  { href: '/jobs.html', label: 'Jobs', short: 'Jobs', needs: 'balance',
    blurb: 'AI and jobs: what has been measured, and what the counts do not show.' },
  { href: '/medicine.html', label: 'Medicine', short: 'Medicine', needs: 'balance',
    blurb: 'AI in medicine: trials, authorisations and databases on the record.' },
  { href: '/balance.html', label: 'Balance', short: 'Balance', needs: 'balance',
    blurb: 'Harm and benefit, counted side by side and never summed.',
    count: balanceCount },
  // /bliss stays in SECTIONS, so it keeps its row in the footer's Pages list
  // and /balance's link to it has a home in the index of the site. On the bar
  // it YIELDS to the Balance tile, and comes back whenever there is no
  // /balance to yield to: a build without data/balance.json must not leave
  // BLISS reachable from the footer alone.
  { href: '/bliss.html', label: 'Upside', short: 'Upside', needs: 'bliss', yieldsTo: 'balance',
    blurb: 'The same machinery, pointed the other way.',
    count: (ctx) => (ctx.bliss && Number.isFinite(ctx.bliss.score)
      ? { v: num(ctx.bliss.score, 1), k: 'bliss score' } : null) },
  { href: '/methodology.html', label: 'Methodology', short: 'Method',
    blurb: 'Every formula and constant. Recompute the number yourself.' },
  { href: '/instruments.html', label: 'Instruments', short: 'Instruments',
    blurb: 'Score history, source health, the five pillars, moves, embed and API.' },
  { href: '/bets.html', label: 'Tally’s Bets', short: 'Bets',
    blurb: 'Daily forecasts about the index, with probabilities, scored in public.' },
  { href: '/ai-doomsday-clock.html', label: 'The Clock', short: 'Clock',
    blurb: 'The reading as a clock face, and what the other clocks are.' },
  { href: '/desk.html', label: 'Tally’s Desk', short: 'Desk', needs: 'news',
    blurb: 'The unserious counts: robots, godfathers, question marks.' },
  { href: '/game.html', label: 'Game', short: 'Game',
    blurb: 'Tally Counts: thirty seconds of counting signals and ignoring predictions.' },
  { href: '/library.html', label: 'Reading list', short: 'Books',
    blurb: 'Books from every side of the AI argument. Paid links.' },
  { href: '/bunker-kit.html', label: 'Bunker Kit', short: 'Bunker',
    blurb: 'Fifty free tools and one crate of gear.' },
  { href: '/history.html', label: 'History', short: 'History',
    blurb: 'Sixty years of the same argument, dated and attributed.',
    count: (ctx) => (Array.isArray(ctx.history) && ctx.history.length
      ? { v: String(ctx.history.length), k: 'scored observations' } : null) },
  { href: '/moves/', label: 'Archive', short: 'Archive',
    blurb: 'Every scored observation, each with a hash-chained receipt.',
    count: (ctx) => (Array.isArray(ctx.moves) && ctx.moves.length
      ? { v: String(ctx.moves.length), k: 'archived moves' } : null) },
];

/**
 * Thousands separators, done by hand.
 *
 * toLocaleString() would be one call and is banned here: its output depends on
 * the host's ICU build and default locale, so the same inputs would produce
 * different bytes on a contributor's laptop and in CI. This build promises
 * byte-identical output from identical inputs, and 115608 is unreadable at
 * 11.5px in a nav tile, so the grouping is computed rather than looked up.
 */
function grouped(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The leader's odds, or the roster size — never a stale price.
 *
 * The three market states are kept apart here exactly as they are everywhere
 * else: a leg whose market is not `live` has no probability we are entitled to
 * print. A percentage in a navigation bar is read as current by definition, so
 * a dark one would be the single most misleading number on the site.
 */
function raceCount(ctx) {
  const players = ctx.race && Array.isArray(ctx.race.players) ? ctx.race.players : [];
  if (!players.length) return null;
  const top = players.find((p) => p && p.rank === 1) || players[0];
  const m = top && top.market;
  if (m && m.state === 'live' && Number.isFinite(m.probability)) {
    return { v: `${num(m.probability * 100, 1)}%`, k: `${top.name} on the ranking market` };
  }
  return { v: String(players.length), k: 'labs tracked' };
}

/**
 * The two counts the balance's pans carry, or null.
 *
 * Read from balance.json's newsroom beam, the block the drawing reads, so the
 * tile and the pans cannot print different pairs. Both must be whole counts
 * from a live window: a dark newsroom writes null on both sides, and null
 * prints the tile's dot rather than a pair of zeros it never measured. A
 * measured 0 on one side is a count, and prints as 0.
 */
function balanceCount(ctx) {
  const nr = ctx.balance && ctx.balance.newsroom;
  const beam = nr && nr.beam;
  const whole = (v) => Number.isInteger(v) && v >= 0;
  if (!nr || nr.state !== 'live' || !beam || beam.state !== 'live'
    || !whole(beam.benefit) || !whole(beam.harm)) return null;
  const at = typeof nr.generated_at === 'string' && Number.isFinite(Date.parse(nr.generated_at))
    ? `as of ${utc(nr.generated_at)}` : 'in the current window';
  // THE WORDS GO IN THE VISIBLE VALUE. A bare "0 : 11" on thirteen pages told a
  // sighted reader nothing about which side was which, or which direction was
  // good; only the aria-label and the title carried "benefit language : harm
  // language", and neither is read by someone looking at the tile. Letters are
  // the cheapest possible legend and they fit.
  return {
    v: `${grouped(beam.benefit)}b · ${grouped(beam.harm)}h`,
    k: `newsroom stories matching one list only, benefit language : harm language, ${at}`,
  };
}

/** Machine-readable surfaces. Separated in the footer because the audience is. */
const DATA_LINKS = [
  { href: '/api/state.json', label: 'JSON API', blurb: 'Level, score, pillars, per-source health.' },
  { href: '/api/history.json', label: 'History JSON', blurb: 'Every scored observation as one file.' },
  { href: '/api/health.json', label: 'Health', blurb: 'Per-source success, honestly reported.' },
  { href: '/embed.html', label: 'Embed', blurb: 'One iframe. No script, no key, no tracking.' },
  { href: '/feed.xml', label: 'RSS', blurb: 'An entry per index move.' },
  { href: '/feed-level.xml', label: 'Level alerts', blurb: 'RSS that fires only when the level changes.' },
];

// The published collection cadence, from .github/workflows/collect.yml: a */15
// cron. The rail derives "next due" from it rather than from a guess, and says
// OVERDUE rather than counting down forever when a run is late - GitHub's
// scheduler is routinely 5-20 minutes behind under load, and a countdown that
// never admits that is the pizzint failure in a smaller costume.
const CADENCE_MIN = 15;

/** The newest observation strictly older than the one being rendered, or null. */
function prevObservation(ctx) {
  const rows = Array.isArray(ctx.history) ? ctx.history : [];
  const now = Date.parse(ctx.state && ctx.state.generated_at);
  if (!Number.isFinite(now)) return null;
  let best = null;
  let bestT = -Infinity;
  for (const r of rows) {
    const t = Date.parse(r && r.generated_at);
    if (!Number.isFinite(t) || t >= now) continue;
    if (!Number.isFinite(r.score)) continue;
    if (t > bestT) { best = r; bestT = t; }
  }
  return best;
}

/**
 * The next scheduled collection, as an ISO string.
 *
 * Derived from generated_at alone - never from the build clock - because
 * CONTRACT.md §4 forbids unseeded time in output and two builds from identical
 * inputs must emit identical bytes. Rounds UP to the next wall-clock quarter
 * hour, which is what an every-15-minutes cron actually fires on. (The literal
 * cron expression is not written in this block comment, because its second
 * character pair would close the comment - a trap worth a line of prose.)
 */
function nextDueIso(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const step = CADENCE_MIN * 60000;
  return new Date(Math.floor(t / step) * step + step).toISOString();
}

/**
 * The status rail. Counters only, every one read from real state.
 *
 * The temptation is to print STATUS: OPERATIONAL unconditionally because it
 * reads well. pizzint's own health endpoint does exactly that while reporting
 * two successful scrapes in twenty-four hours. The posture here is computed
 * from the same fields the dashboard shows, so it can say DEGRADED about us.
 *
 * On the dashboard the level/score cell is omitted: the hero is six inches
 * below it at 9.5rem and a second copy is the "same number in another hat"
 * problem this rail exists to fix. On every other page it is the anchor that
 * makes the site read as one instrument, so it is there and it is a link home.
 */
/**
 * THE RAIL IS THE PULSE, NOT THE DASHBOARD. Measured 2026-09-26: ten cells,
 * 1,409px wide, seven of them operator telemetry - Scored 5, Feeds 16/16,
 * Items 200, Receipts 45 - shown above the fold on every page to strangers
 * who have not yet seen the number. And one cell was actively harmful:
 * "Next due: overdue 07:10" is the collector's cron deadline admitting it is
 * late, and a newcomer reads "overdue" as the site being broken.
 *
 * What stays is what a human reads as a pulse and a trust signal: the wall
 * clock, the reading on subpages, whether the number moved, when it was
 * observed and how long ago, how many sources answered, whether any are dark,
 * and the posture. The five telemetry cells moved to the footer - see
 * telemetryRow() - where provenance already lives and where a reader who
 * wants the plumbing goes looking for it. Nothing was deleted; it was
 * re-homed. At 375px the rail was a 1,409px scroller; it is now under half.
 */
function rail(ctx, path) {
  const st = ctx && ctx.state;
  if (!st || !Array.isArray(st.sources)) return '';

  const total = st.sources.length;
  // "reporting" is ok OR uncalibrated: both answered the request. Only `ok`
  // means we also have a frozen baseline to score it against. Printing
  // "5/14 SOURCES" conflated those and read as though nine were broken, which
  // is the precise confusion this codebase exists to avoid.
  const reporting = st.sources.filter((x) => x.ok || x.uncalibrated).length;
  const dark = st.sources.filter((x) => !x.ok && !x.uncalibrated).length;
  const posture = dark > 0 ? 'DEGRADED' : 'OPERATIONAL';

  const prev = prevObservation(ctx);
  const cells = [];

  const cell = (k, v, extra = '') =>
    `<span class="rail__c"${extra}><span class="rail__k">${k}</span>${v}</span>`;

  // THE WALL CLOCK. Absorbed from the operations strip this pass, which is the
  // only atom that strip carried that this one did not already hold. Rendered
  // with the observation's own second so the first paint is a true UTC time
  // (CONTRACT.md 4: no unseeded clock in output); the chrome script then moves
  // it every second. It is the only element on the site that changes when
  // nothing has happened, and it is honest because it is stating the time
  // rather than pretending the data moved.
  cells.push(cell(
    'UTC',
    `<b class="rail__v rail__clk num" data-dc-clock>${esc(utcClock(st.generated_at))}Z</b>`,
    ' title="Wall-clock UTC. The observation stamp is the next cell along."',
  ));

  if (path !== '/') {
    cells.push(
      `<a class="rail__c rail__c--home" href="${esc(ctx.href('/'))}">` +
      `<span class="rail__k">Now</span>` +
      `<b class="rail__v">${esc(brand.NAME)} ${esc(st.level)}</b>` +
      `<span class="rail__v num">${esc(num(st.score, 1))}<small>/100</small></span></a>`,
    );
  }

  // The single most valuable cell on the page, and the one we were not
  // printing: whether the number moved. It is stated as an exact signed delta
  // against an exact prior stamp, never as "no prior observation" while the
  // score visibly walks.
  if (prev) {
    cells.push(cell(
      'Delta',
      `${deltaChip(st.score - prev.score)}<span class="rail__s">since ${esc(utcClock(prev.generated_at))}Z</span>`,
      ` title="Change in the composite since the previous scored observation at ${esc(utc(prev.generated_at))}."`,
    ));
  }

  // Atom one. Exact UTC in the HTML; the chrome script appends a ticking age.
  cells.push(cell(
    'Observed',
    `<time class="rail__v num" datetime="${esc(st.generated_at)}" data-dc-obs>${esc(utcClock(st.generated_at))}Z</time>` +
    `<span class="rail__age num" data-dc-age hidden></span>`,
    ` title="${esc(utc(st.generated_at))}"`,
  ));

  cells.push(cell('Sources', `<b class="rail__v num">${reporting}/${total}</b><span class="rail__s">reporting</span>`));
  if (dark) cells.push(cell('Dark', `<b class="rail__v num">${dark}</b>`, ' data-bad="1"'));

  cells.push(
    `<span class="rail__c rail__c--posture" data-posture="${posture.toLowerCase()}">` +
    `<span class="rail__k">Status</span><b class="rail__v">${posture}</b></span>`,
  );

  return `<div class="rail"><div class="wrap rail__in">${cells.join('')}</div></div>`;
}

/**
 * The return line, server-rendered and hidden.
 *
 * The markup and its data are here; the two dozen lines that diff them against
 * localStorage are in CHROME_JS below. Nothing is fetched, so this works on
 * every page including the ones with no motion layer, and it renders nothing at
 * all on a first visit, nothing when storage throws, and nothing when the build
 * the reader last saw is the build they are looking at.
 */
function visitSlot(ctx) {
  const st = ctx.state;
  const obs = Array.isArray(ctx.history) ? ctx.history.length : 0;
  return `<aside class="rvisit" id="dc-visit" role="status" hidden` +
    ` data-at="${esc(st.generated_at)}" data-score="${esc(num(st.score, 1))}"` +
    ` data-level="${esc(st.level)}" data-name="${esc(st.level_name)}" data-obs="${obs}">` +
    `<div class="wrap rvisit__in">` +
    `<b class="rvisit__k">Since you looked</b>` +
    `<span class="rvisit__t num"></span>` +
    `<span class="rvisit__d"></span>` +
    `<span class="rvisit__x"></span>` +
    `<button class="rvisit__b" type="button" data-dc-dismiss>Dismiss</button>` +
    `</div></aside>`;
}

// ---------------------------------------------------------------------------
// The chrome script
// ---------------------------------------------------------------------------
//
// ~3.3KB uncompressed, no dependencies, and everything it touches is already correct in
// the HTML before it runs - it only ever ADDS. Three jobs:
//
//   1. tick the age beside OBSERVED
//   2. turn NEXT DUE into a countdown, then DUE, then OVERDUE
//   3. draw the SINCE YOU LOOKED line from localStorage
//
// Guarded on window.__dcChrome so a second copy is a no-op, and it stands down
// entirely if something else has claimed the return line by setting
// window.__dcSince first. layout.mjs emits the motion layer's bodyEnd BEFORE
// this block, so _motion.mjs can take job 3 over whenever it wants it.
//
// No template literals and no regex literals inside the payload: a `${` would
// be interpolated by the template literal carrying it, and a backslash would be
// eaten by it (the same trap documented at length in _motion.mjs).
const CHROME_JS = `(function(){
if(window.__dcChrome)return;window.__dcChrome=1;
var d=document,M=6e4;
function pad(n){return n<10?'0'+n:''+n;}
/* Ticking form: always carries seconds, so the atom moves every second at any
   age. mm:ss under an hour, h:mm:ss under two days, then days. */
function span(ms){var s=Math.max(0,Math.round(ms/1000));
 if(s<3600)return pad(Math.floor(s/60))+':'+pad(s%60);
 var h=Math.floor(s/3600);
 if(h<48)return h+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60);
 return Math.round(h/24)+'d';}
/* Coarse form, for the one place a seconds-precise figure would read as a
   clock time rather than as an elapsed span ("18:42:03 ago"). */
function coarse(ms){var s=Math.max(0,Math.round(ms/1000));
 if(s<90)return s+'s';var m=Math.round(s/60);
 if(m<90)return m+'m';var h=Math.floor(s/3600);
 if(h<48)return h+'h '+pad(Math.round((s%3600)/60))+'m';
 return Math.round(h/24)+'d';}
/* MOTION.md: reduce disables the motion, not the information. A figure that
   rewrites itself every second is continuously moving content, so under reduce
   both atoms fall back to the coarse form and a 30s tick - still correct, still
   live, and no longer a thing flickering in the corner of the eye. */
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
var fmt=reduce?coarse:span,every=reduce?3e4:1000;
var obs=d.querySelector('[data-dc-obs]'),age=d.querySelector('[data-dc-age]'),
    nx=d.querySelector('[data-dc-next]'),clk=d.querySelector('[data-dc-clock]');
var tObs=obs?Date.parse(obs.getAttribute('datetime')):NaN,
    tNx=nx?Date.parse(nx.getAttribute('datetime')):NaN;
function tick(){
 var now=Date.now();
 /* The wall clock. Absorbed from the deleted operations strip. Under reduce it
    ticks every 30s with the same string, which is still a correct UTC time to
    the second at the moment it is written - it simply stops being a thing
    flickering in the corner of the eye. */
 if(clk){var u=new Date(now);
  clk.textContent=pad(u.getUTCHours())+':'+pad(u.getUTCMinutes())+':'+pad(u.getUTCSeconds())+'Z';}
 if(age&&tObs===tObs){age.hidden=false;age.textContent='+'+fmt(now-tObs);}
 if(nx&&tNx===tNx){
  var dt=tNx-now;
  if(dt>0){nx.textContent='in '+fmt(dt);nx.removeAttribute('data-late');}
  else if(dt>-6*M){nx.textContent='due now';nx.setAttribute('data-late','1');}
  else{nx.textContent='overdue '+fmt(-dt);nx.setAttribute('data-late','2');}
 }
}
tick();setInterval(tick,every);
try{var cv=d.getElementById('dc-visit'),cs=cv?cv.dataset:{};
 console.log('%cSIREN','font:700 28px Impact,sans-serif;letter-spacing:.08em;color:#ffb020');
 console.log('This is not a test. It is not an emergency either. It is a count.');
 console.log(+cs.level>0&&parseFloat(cs.score)===parseFloat(cs.score)
  ?'Reading on file: SIREN '+cs.level+', '+cs.name+', '+cs.score+' of 100, observed '+cs.at+'.'
  :'No reading on file. None is imputed.');
 console.log('Nothing in this panel is classified. Recompute it: api/state.json, api/history.json, api/receipts/');
}catch(e){}
[].forEach.call(d.querySelectorAll('.sharebtn'),function(b){
 if(!(navigator.share||(navigator.clipboard&&navigator.clipboard.writeText)))return;
 b.hidden=false;
 b.addEventListener('click',function(){var t=b.dataset.t,u=location.origin+location.pathname;
  if(navigator.share){navigator.share({text:t,url:u}).catch(function(){});return;}
  navigator.clipboard.writeText(t+' '+u).then(function(){b.textContent='Copied';});});
});

if(window.__dcSince)return;window.__dcSince=1;
try{
 var el=d.getElementById('dc-visit');if(!el)return;
 var K='doomcon.visit.v1',ds=el.dataset;
 var cur={at:ds.at,score:parseFloat(ds.score),level:+ds.level,name:ds.name,obs:+ds.obs};
 var raw=null;try{raw=localStorage.getItem(K);}catch(e){return;}
 var save=function(){try{cur.t=Date.now();localStorage.setItem(K,JSON.stringify(cur));}catch(e){}};
 var prev=null;try{prev=raw?JSON.parse(raw):null;}catch(e){prev=null;}
 save();
 if(!prev||!prev.at||prev.at===cur.at)return;
 var t=el.querySelector('.rvisit__t'),dd=el.querySelector('.rvisit__d'),x=el.querySelector('.rvisit__x');
 if(prev.t)t.textContent=coarse(Date.now()-prev.t)+' ago';
 var delta=cur.score-prev.score,s=delta>0?'up':delta<0?'down':'flat',
     g=delta>0?'\\u25b2':delta<0?'\\u25bc':'\\u25c6';
 dd.setAttribute('data-dir',s);
 dd.textContent=g+' '+prev.score.toFixed(1)+' \\u2192 '+cur.score.toFixed(1);
 var bits=[];
 if(cur.level!==prev.level)bits.push('level '+prev.level+' \\u2192 '+cur.level+' \\u00b7 '+cur.name);
 var n=cur.obs-prev.obs;
 if(n>0)bits.push(n+' new observation'+(n===1?'':'s'));
 x.textContent=bits.join(' \\u00b7 ');
 el.hidden=false;
 var b=el.querySelector('[data-dc-dismiss]');
 if(b)b.addEventListener('click',function(){el.hidden=true;});
}catch(e){}
})();`;

/**
 * @param {object} o
 * @param {object} o.ctx      build context (href/url helpers, state)
 * @param {string} o.title    full <title>; already includes the brand
 * @param {string} o.description
 * @param {string} o.path     root-relative path of THIS page, for canonical + nav
 * @param {string} o.main     the page body HTML
 * @param {string} [o.ogImage] root-relative card path; omitted if the card is absent
 * @param {boolean} [o.noindex]
 * @param {Array<object>} [o.jsonld]
 * @param {boolean} [o.showDegraded] dashboard shows the banner; deep pages do not
 * @param {string} [o.head]    extra HTML injected at the end of <head>
 * @param {string} [o.bodyEnd] extra HTML injected just before </body>
 * @param {true|object} [o.motion] enable the motion layer. `true` takes the
 *        defaults; an object is passed through to _motion.motionBlock as
 *        { stateUrl, newsUrl (null disables news polling), pollMs }.
 */
/* THE OPERATIONS STRIP IS GONE, and what it was for is in rail() above.

   Measured on the built homepage at 375px, 2026-09-24: .ops printed
   "14/14 REPORTING · 5 SCORED · 15 FEEDS · 200 ITEMS · STATUS: OPERATIONAL"
   twenty-eight pixels above a rail printing SOURCES 14/14 reporting, SCORED 5,
   FEEDS 15/16, ITEMS 200, STATUS OPERATIONAL. Five atoms, stated twice, in two
   strips, 53px of an 812px fold - the exact "same fact wearing a different
   hat" failure the rail was built to fix, committed by the file that built it.
   .ops carried exactly one atom the rail did not: the ticking wall clock. That
   atom is now a rail cell and the strip is deleted. Nothing else in the repo
   emitted .ops or .ops__*; grepped across every template before cutting. */

// ---------------------------------------------------------------------------
// The feature bar.
//
// pizzint's features are findable because they sit in a seven-item ICON ROW
// near the top — Pizza Cards, HormuzHub, Gay Bar Report, Strip Club Index, Map
// View, Commute Index — each a tile you can see rather than a word in a list.
// Ours were a thin run of text in the masthead, which reads as boilerplate, so
// /watts, /digest and /bliss shipped and nobody could find them.
//
// Same links, same SECTIONS table, same live counts. The difference is that a
// tile with a mark and a number on it reads as a PLACE, and a word in a row
// reads as chrome.
//
// The palette is measured from pizzint (2026-09-24): ground #060c16, a
// near-black navy rather than grey, and a saturated hue per destination out of
// their own spectrum — #ffef2a #eab308 #ff7a00 #ff0033 #00e676 #00a3ff #4b59ff
// #c400ff. Eleven hues doing eleven jobs is why their page reads as an arcade
// HUD and ours read as a terminal printout. Colour is never the only carrier:
// every tile also has a distinct mark and its name in text.
// ---------------------------------------------------------------------------
const FEATURE_ART = {
  '/': { hue: '#ffef2a', mark: '<path d="M2 12.5 6.5 6l3.5 4L14 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  '/race.html': { hue: '#00e676', mark: '<path d="M3 13V7m5 6V3m5 10V9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  '/news.html': { hue: '#00a3ff', mark: '<path d="M2.5 4h11v8.5H2.5z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 6.5h5M4.5 9h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' },
  '/watts.html': { hue: '#ff7a00', mark: '<path d="M9 2 4 9h3l-1 5 5-7H8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
  '/map.html': { hue: '#c400ff', mark: '<path d="M8 14s4.5-4.2 4.5-7.4A4.5 4.5 0 0 0 3.5 6.6C3.5 9.8 8 14 8 14z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6.5" r="1.6" fill="currentColor"/>' },
  // Rose, #ff73c8. Measured against the thirteen tiles in this table — in
  // OKLab, not on the HSL wheel the notes below use, because this is the tile
  // where the two disagree. Every figure here was computed off the hex values
  // in this table, not estimated.
  //
  // THE HSL WHEEL OVERSTATES THE GREENS. On it the widest empty arc is 55 to
  // 143 degrees, the Index's #ffef2a to Upside's #5fd08a: 87 degrees, wider
  // than the 235-286 arc the /exploits note measures as widest. Perceptually
  // it is not there. HSL spreads yellow-greens that the eye does not; in
  // OKLCH the same two tiles are 47 degrees apart, and a lime dropped into
  // the "gap" (#8fd11c) lands 0.085 from The Race's #00e676 in OKLab
  // distance, about as close as Upside and The Race already are (0.078).
  //
  // HUE. The widest perceptual gap on the bar is magenta to red: /map's
  // #c400ff at 314 degrees OKLCH to Leaders' #ff0033 at 24, 69 degrees with
  // nothing in it. #ff73c8 sits at 345, 31 degrees from /map and 38 from
  // Leaders. (In HSL, for comparison with the notes below: 324, against
  // /map's 286 and Leaders' 348.) /flock's #00e5ff is at 209 in OKLCH, 186 in
  // HSL: the far side of the wheel either way.
  //
  // DISTANCE, which hue alone undersells, because this tile is also lighter
  // and softer than either neighbour: OKLCH lightness 0.75 and chroma 0.19,
  // against /map's 0.62 and 0.31 and Leaders' 0.63 and 0.26. Its nearest tile
  // in OKLab is 0.197 away (Leaders, with Archive's grey a hair behind);
  // /map is 0.216 and /flock 0.329. Every OTHER tile here has a neighbour
  // within 0.153 — the closest pair, the Index and Digest yellows, are 0.060
  // apart — so this is the most isolated colour on the bar.
  //
  // REGISTER: not red. Leaders owns the alarm end, and the /exploits note's
  // argument holds here too: this page counts map objects, and a count of map
  // objects printed in the alarm colour is a claim made in CSS. Leaders is
  // nonetheless this tile's nearest neighbour, which is why lightness rather
  // than hue does most of the separating on that side.
  //
  // CONTRAST: 8.10:1 on the dark sunken ground (#08090a), AA with room.
  // 2.14:1 on the light one (#f1efe9), which fails, as every tile here fails
  // one ground or the other for the arithmetic reason given under /exploits;
  // it sits among the nine light-ground figures from 1.04 to 2.38. The label
  // beside the figure is --ink-dim, which clears AA in both schemes.
  //
  // MARK: a globe — the outline, one meridian, the equator — on the same
  // 16-unit grid and 1.5 stroke as its neighbours. The only other large
  // circle in the table is History's clock, which has hands and no meridian,
  // so the meridian ellipse is what carries the difference.
  '/world.html': { hue: '#ff73c8', mark: '<circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="8" cy="8" rx="2.5" ry="5.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.2 8h11.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' },
  // Aqua: the one clear gap in the eleven hues above — #00a3ff is azure and
  // #00e676 is green, and nothing sits between them. Far enough from /map's
  // #c400ff that the two map pages never read as the same tile, which is the
  // pair most at risk of being confused.
  '/flock.html': { hue: '#00e5ff', mark: '<path d="M3.2 14.4V4.6h3.2M1.8 14.4h2.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.4 2.7h5.4v3.8H6.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.8 3.5 14 2.5v4.2l-2.2-1z" fill="currentColor"/>' },
  // Violet, chosen against three constraints rather than for taste. Every
  // figure below was computed off this table, not estimated.
  //
  // HUE: the unused arc. The twelve hues above sit at 29 34 50 55 143 151 186
  // 202 235 286 348 degrees, plus Archive's grey. The widest gap with nothing
  // in it runs from methodology's indigo #4b59ff (235) to the map's magenta
  // #c400ff (286), and #8b5cf6 (258) is near its middle. That is the largest
  // minimum separation still on the wheel, and it is NOT large — 23 degrees
  // one way, 28 the other — so the mark and the word carry more of the load
  // here than on the earlier tiles. Which is the rule at the top of this
  // block, stated the other way round: colour is never the only carrier.
  //
  // REGISTER: this page's finding is a NULL RESULT — something was measured
  // and it had not moved. Putting that in the red end of the spectrum, beside
  // Leaders' #ff0033, would be an alarm claim made in CSS about a measurement
  // that found nothing. Same argument styles.mjs makes for --accent-2 on
  // /watts: "nothing is happening" printed in the alarm colour is a lie.
  //
  // CONTRAST: --fb-hue paints the mark and the figure in BOTH schemes from one
  // token, and NO single colour can clear AA on the dark sunken ground
  // (#08090a) and the light one (#f1efe9) at once — a colour needs relative
  // luminance >= 0.187 for the first and <= 0.153 for the second, so the two
  // requirements are arithmetically incompatible and every tile in this table
  // fails one of them. #8b5cf6 measures 4.71:1 dark — AA, and the site is
  // dark-first — and 3.68:1 light, which is third of the thirteen tiles behind
  // #4b59ff (4.38) and #c400ff (3.81). The eight brightest here are between
  // 1.04 and 2.38 on light. Among violets in the unused arc it is the best
  // light figure that still clears AA on dark: #9575ff buys 5.95 dark for 2.91
  // light, #a78bfa 7.32 for 2.37. The label beside the figure is --ink-dim,
  // which clears AA in both schemes, so the tile is never read by colour alone.
  //
  // MARK: an interval — two posts with a measured span between them. What this
  // page publishes is a GAP BETWEEN TWO DATES, and no other mark in the table
  // is a span. History's clock is deliberately not reused: a clock says
  // "time", where this has to say "the distance between two events".
  '/exploits.html': { hue: '#8b5cf6', mark: '<path d="M3 3.2v9.6M13 3.2v9.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5.4 8h5.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4.5 8 6.5 6.3v3.4zM11.5 8 9.5 9.7V6.3z" fill="currentColor"/>' },
  '/leaders.html': { hue: '#ff0033', mark: '<path d="M8 2.5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 13.5c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  '/digest.html': { hue: '#ffd600', mark: '<path d="M3.5 2.5h9v11l-4.5-2.5L3.5 13.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
  // Brass, #878700: the metal a pair of scales is made of, and the most
  // isolated colour left on the bar that the register allows. Measured the
  // way the /world note measures, in OKLab off the hex values in this table,
  // against the fourteen tiles on the bar once Upside yields its place.
  //
  // THE ANGLES, and why the angle is not what separates it. OKLCH hue 109.8
  // (HSL 60). The nearest tiles by angle are the Index's #ffef2a at 104.3
  // and Digest's #ffd600 at 94.9 — 5.5 and 14.9 degrees away, which on the
  // wheel alone is a clash — then The Race's #00e676 at 151.8, 42 degrees
  // on. (In HSL: 60 against 55, 50 and 151.) What carries the difference is
  // lightness: 0.60 against the Index's 0.94 and Digest's 0.885, the gap
  // between a gold and a dark brass.
  //
  // DISTANCE. Its nearest tile in OKLab is Archive's grey at 0.188, then
  // Watts 0.205, History 0.242, The Race 0.253, Digest 0.289 and the Index
  // 0.338. Only /world (0.197) sits further from its nearest neighbour; the
  // Index and Digest yellows are 0.060 apart. (The /world note's "every
  // other tile within 0.153" was measured with Upside on the bar. With it
  // yielding, The Race's nearest becomes /flock at 0.186, and /flock's is
  // Newsroom at 0.184.)
  //
  // REGISTER. An unconstrained search of the sRGB cube, keeping only colours
  // that clear 4.5:1 on the dark ground, ranked a dark green first (#008d00,
  // 0.255 from its nearest tile). Refused: green is the live state (--ok),
  // BLISS's own colour and the tile this one replaces (#5fd08a, 0.200 away),
  // and a balance painted in the benefit colour is a verdict in CSS. With
  // greens and reds excluded — red is Leaders and the dark-source state —
  // lightness kept to 0.60-0.90, and nothing allowed within 0.12 of either
  // side hue in _balance.mjs or the amber live reading, this is the search's
  // answer. Benefit's #9fa6ff
  // is 0.299 away and harm's #e39f7c 0.198, because this tile stands for
  // both pans; the amber is 0.230.
  //
  // CONTRAST: 5.22:1 on the dark sunken ground (#08090a), AA. 3.32:1 on the
  // light one (#f1efe9), which fails for the arithmetic reason the /exploits
  // note gives and is fifth of the fourteen, behind #4b59ff, #c400ff,
  // #8b5cf6 and #ff0033. The label beside the figure is --ink-dim.
  //
  // MARK: a two-pan balance on the 16-unit grid — a post with a foot, a
  // beam, two pans on strings — and DRAWN LEVEL, always. A mark that tilted
  // with the data would print a verdict in the nav at fifteen pixels with
  // no rule under it, and one fixed at a tilt would print a permanent one.
  // No other mark in the table puts a horizontal beam across a vertical post.
  '/balance.html': { hue: '#878700', mark: '<path d="M8 2.4v10.8M4.8 13.4h6.4M2.8 4.6h10.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2.8 4.6 1.5 9.3M2.8 4.6 4.1 9.3M13.2 4.6 11.9 9.3M13.2 4.6 14.5 9.3" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M1.3 9.3h3a1.5 1.5 0 0 1-3 0zM11.7 9.3h3a1.5 1.5 0 0 1-3 0z" fill="currentColor"/>' },
  '/bliss.html': { hue: '#5fd08a', mark: '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  '/methodology.html': { hue: '#4b59ff', mark: '<path d="M6 2v4.5L2.8 12a1.6 1.6 0 0 0 1.4 2.4h7.6A1.6 1.6 0 0 0 13.2 12L10 6.5V2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
  '/history.html': { hue: '#ffb655', mark: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  '/moves/': { hue: '#9aa4b2', mark: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
};

// A PICTURE AT THE TOP OF FOUR PAGES. Generated illustrations, credited as
// such in the caption. Decorative: the alt text is empty because the page's
// own h1 directly below says what the page is.
const PAGE_BANNERS = {
  '/jobs.html': 'page-jobs.jpg',
  '/medicine.html': 'page-medicine.jpg',
  '/race.html': 'page-race.jpg',
  '/news.html': 'page-news.jpg',
  '/map.html': 'page-map.jpg',
  '/world.html': 'page-world.jpg',
  '/flock.html': 'page-flock.jpg',
  '/exploits.html': 'page-exploits.jpg', '/balance.html': 'page-balance.jpg',
};

function pageBanner(ctx, path) {
  // The PizzINT-style room header: the room's generated icon and its name in
  // the pixel face. Decorative (aria-hidden): every page still carries its own
  // real <h1> below, so nothing is said twice to a screen reader.
  const art = roomArt(path);
  const sec = SECTIONS.find((x) => x.href === path) || PAL_EXTRA.find((x) => x.href === path);
  if (!art || !sec || path === '/') return '';
  const label = String(sec.label).replace(/[‘’]/g, "'").replace(/[()?]/g, ' ').replace(/\s+/g, ' ').trim();
  return `<div class="v2pt" aria-hidden="true"><img src="${esc(ctx.href(`/img/art-${art}.webp`))}" width="96" height="96" alt=""><div class="v2pt__t">${pixelText(label, 5, '#FFFFFF', 'v2pt__h')}${sec.blurb ? `<p>${esc(sec.blurb)}</p>` : ''}</div></div>\n`;
}

function v2StatusBar(ctx) {
  const st = ctx.state || {};
  const src = Array.isArray(st.sources) ? st.sources : [];
  const ok = src.filter((x) => x.ok).length;
  const t = String(st.generated_at || '');
  return `<div class="v2m-top"><div class="wrap v2m-top__in">
  <span class="v2m-chip">${icon('clock', 2)}<span class="num">${esc(t.slice(0, 10))} ${esc(t.slice(11, 16))}Z</span></span>
  <span class="v2m-tag v2m-tag--lv">SIREN ${esc(String(st.level ?? '–'))} · <b>${esc(String(st.level_name || ''))}</b> · ${esc(Number.isFinite(st.score) ? st.score.toFixed(1) : '–')}</span>
  <span class="v2m-chip">${icon('eye', 2)}${ok}/${src.length} SOURCES REPORTING</span>
  <span class="v2m-right">STATUS: <b class="${st.degraded ? 'v2m-amber' : 'v2m-green'}">${st.degraded ? 'DEGRADED' : 'OPERATIONAL'}</b></span>
</div></div>`;
}

/* WHAT A SEARCH RESULT CAN SHOW. A result page cuts a title near 65 characters
   and a description near 160, mid-word, wherever that falls. Eleven pages ran
   past both, so the number that made the title worth reading was the part that
   got cut. The full strings still go to og:title and og:description, which
   social cards do not truncate the same way. */
function serpTitle(title) {
  const t = String(title || '');
  if (t.length <= 65 || !t.includes(' — ')) return t;
  const brandAt = t.lastIndexOf(' · ');
  const suffix = brandAt > 0 ? t.slice(brandAt) : '';
  return t.slice(0, t.indexOf(' — ')) + suffix;
}
function serpDescription(description) {
  const d = String(description || '');
  if (d.length <= 160) return d;
  const head = d.slice(0, 160);
  const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('? '));
  if (stop >= 80) return head.slice(0, stop + 1);
  return head.slice(0, head.lastIndexOf(' ')).replace(/[,;:—-]+$/, '') + '…';
}


/* ---------------------------------------------------------------------------
   THE NAV KIT. Three ways to get anywhere, none of which the page needs in
   order to be read:
     - a jump palette (press / or Ctrl/Cmd-K, or the Jump button) listing every
       room with its live number, filtered as you type;
     - on a phone, a fixed bar of the four busiest rooms plus the palette, so
       the way out of any page is under the thumb rather than at the top;
     - at the foot of every inner page, the previous and next room and the way
       back to the war room, so no page is a dead end.
   The palette is a native <dialog>; with scripts off it never opens and the
   masthead tiles and footer are the navigation, exactly as before.
--------------------------------------------------------------------------- */
const PAL_EXTRA = [
  { href: '/about.html', label: 'About', blurb: 'Who runs this and how it is paid for.' },
  { href: '/guide.html', label: 'Guide to the levels', blurb: 'What each of the five levels means.' },
  { href: '/p-doom.html', label: 'What is p(doom)?', blurb: 'The number nobody can check, explained.' },
  { href: '/ai-doomsday-clock.html', label: 'AI doomsday clock', blurb: 'What exists, and the one you can verify.' },
  { href: '/moves/', label: 'Every reading', blurb: 'The full record, each with its receipt.' },
  { href: '/sponsor.html', label: 'Sponsor', blurb: 'One named sponsor at a time.' },
  { href: '/privacy.html', label: 'Privacy', blurb: 'No cookies; cookieless visit counts only.' },
  { href: '/terms.html', label: 'Terms & disclaimers', blurb: 'Information, not advice. No warranty.' },
];
const TAB_ROOMS = [['/', 'War room'], ['/news.html', 'News'], ['/race.html', 'Race'], ['/world.html', 'World']];
function navKit(ctx, tiles, path) {
  const have = new Set(tiles.map((t) => t.href));
  const rows = [...tiles.map((t) => {
    const c = typeof t.count === 'function' ? t.count(ctx) : null;
    return { href: t.href, label: t.href === '/' ? 'War room' : t.label, blurb: t.blurb || '', v: c ? c.v : '' };
  }), ...PAL_EXTRA.filter((e) => !have.has(e.href)).map((e) => ({ ...e, v: '' }))];
  const palette = `<dialog class="pal" id="pal" aria-label="Jump to a page"><div class="pal__box">
  <input class="pal__q" type="search" placeholder="Jump to… type a page name" aria-label="Filter pages" autocomplete="off" spellcheck="false">
  <ul class="pal__l">${rows.map((r) => `<li><a class="pal__i" href="${esc(ctx.href(r.href))}" data-k="${esc(`${r.label} ${r.blurb}`.toLowerCase())}"${r.href === path ? ' aria-current="page"' : ''}><span class="pal__n">${esc(r.label)}</span><span class="pal__b">${esc(r.blurb)}</span>${r.v ? `<b class="pal__v num">${esc(r.v)}</b>` : ''}</a></li>`).join('')}</ul>
  <p class="pal__k">↑ ↓ to move · Enter to open · Esc to close</p></div></dialog>`;
  const tabs = TAB_ROOMS.filter(([h]) => have.has(h)).map(([h, label]) => {
    const art = FEATURE_ART[h] || { mark: '' };
    return `<a class="tab__t" href="${esc(ctx.href(h))}"${h === path ? ' aria-current="page"' : ''}><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${art.mark}</svg><span>${esc(label)}</span></a>`;
  }).join('');
  const tabbar = `<nav class="tab" aria-label="Quick navigation">${tabs}<a class="tab__t" href="#foot-rooms" data-pal><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>All pages</span></a></nav>`;
  let next = '';
  const at = tiles.findIndex((t) => t.href === path);
  if (path !== '/' && at > 0) {
    const rooms = tiles.filter((t) => t.href !== '/');
    const i = rooms.findIndex((t) => t.href === path);
    const prev = rooms[(i - 1 + rooms.length) % rooms.length]; const nxt = rooms[(i + 1) % rooms.length];
    next = `<nav class="wrap nxt" aria-label="More rooms"><a class="nxt__a" href="${esc(ctx.href(prev.href))}"><span>← Previous</span><b>${esc(prev.label)}</b></a><a class="nxt__a nxt__a--home" href="${esc(ctx.href('/'))}#war-room"><span>Back to</span><b>The war room</b></a><a class="nxt__a nxt__a--n" href="${esc(ctx.href(nxt.href))}"><span>Next →</span><b>${esc(nxt.label)}</b></a></nav>`;
  }
  return { button: '<button class="pal__open" type="button" data-pal hidden aria-haspopup="dialog">Jump <kbd>/</kbd></button>', palette, tabbar, next };
}
const NAV_KIT_CSS = `<style>
.pal__open { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid var(--rule); border-radius: 7px; background: transparent; color: var(--ink-dim); font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }
.pal__open[hidden] { display: none; }
.pal__open:hover, .pal__open:focus-visible { color: var(--ink); border-color: var(--accent); }
.pal__open kbd { padding: 2px 6px; border: 1px solid var(--rule); border-radius: 4px; font: inherit; color: var(--ink); }
@media (max-width: 699px) { .pal__open { display: none; } }
.pal { width: min(640px, calc(100vw - 24px)); max-height: min(76vh, 640px); margin: 9vh auto auto; padding: 0; border: 1px solid var(--rule); border-radius: 14px; background: var(--bg-raised); color: var(--ink); box-shadow: 0 30px 90px rgba(0,0,0,.6); overflow: hidden; }
.pal::backdrop { background: rgba(4,5,9,.72); backdrop-filter: blur(3px); }
.pal__box { display: flex; flex-direction: column; max-height: min(76vh, 640px); }
.pal__q { width: 100%; padding: 16px 18px; border: 0; border-bottom: 1px solid var(--rule); background: transparent; color: var(--ink); font: 500 17px/1.3 var(--sans); outline: none; }
.pal__l { list-style: none; margin: 0; padding: 6px; overflow-y: auto; flex: 1 1 auto; }
.pal__l li:has(> [hidden]) { display: none; }
.pal__i { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1px 12px; padding: 9px 12px; border-radius: 8px; text-decoration: none; color: var(--ink); }
.pal__i[hidden] { display: none; }
.pal__i[data-on="1"], .pal__i:hover { background: color-mix(in srgb, var(--accent) 14%, transparent); }
.pal__i[aria-current="page"] .pal__n::after { content: " · you are here"; color: var(--ink-faint); font-weight: 400; }
.pal__n { font: 650 var(--t-base)/1.3 var(--sans); }
.pal__b { grid-column: 1; font: 400 var(--t-xs)/1.35 var(--sans); color: var(--ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pal__v { grid-column: 2; grid-row: 1 / span 2; align-self: center; font: 700 var(--t-sm)/1 var(--mono); color: var(--accent-2); }
.pal__k { margin: 0; padding: 9px 16px; border-top: 1px solid var(--rule); font: 500 var(--t-2xs)/1.3 var(--mono); letter-spacing: .08em; color: var(--ink-faint); }
.tab { display: none; }
@media (max-width: 699px) {
  .tab { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); border-top: 1px solid var(--rule); background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(10px); }
  .tab__t { display: grid; justify-items: center; gap: 3px; padding: 5px 2px; border-radius: 8px; text-decoration: none; color: var(--ink-dim); font: 700 10px/1.1 var(--mono); letter-spacing: .06em; text-transform: uppercase; }
  .tab__t svg { width: 19px; height: 19px; }
  .tab__t[aria-current="page"] { color: var(--accent); }
  body { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
  .pal__k { display: none; }
}
@media print { .tab, .pal, .nxt { display: none !important; } }
.nxt { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-block: var(--s-6) var(--s-5); }
.nxt__a { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-raised); text-decoration: none; min-width: 0; }
.nxt__a:hover, .nxt__a:focus-visible { border-color: var(--accent); }
.nxt__a span { font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
.nxt__a b { font: 650 var(--t-base)/1.25 var(--sans); color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nxt__a--home { text-align: center; } .nxt__a--n { text-align: right; }
@media (max-width: 560px) { .nxt { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .nxt__a--home { grid-column: 1 / -1; grid-row: 1; } }
</style>`;
const NAV_KIT_JS = `(function(){var d=document,p=d.getElementById('pal');if(!p||!p.showModal)return;
var q=p.querySelector('input'),items=[].slice.call(p.querySelectorAll('.pal__i')),sel=0;
function vis(){return items.filter(function(i){return !i.hidden;});}
function mark(){var v=vis();items.forEach(function(i){i.removeAttribute('data-on');});if(v.length){sel=Math.max(0,Math.min(sel,v.length-1));v[sel].setAttribute('data-on','1');v[sel].scrollIntoView({block:'nearest'});}}
function filt(){var t=q.value.toLowerCase().trim();items.forEach(function(i){i.hidden=!!t&&i.getAttribute('data-k').indexOf(t)<0;});sel=0;mark();}
function open(){q.value='';filt();p.showModal();q.focus();}
[].forEach.call(d.querySelectorAll('[data-pal]'),function(b){b.hidden=false;b.addEventListener('click',function(e){e.preventDefault();open();});});
d.addEventListener('keydown',function(e){var t=e.target,tag=t&&t.tagName;var typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable);
if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey)){e.preventDefault();if(p.open)p.close();else open();}});
q.addEventListener('input',filt);
q.addEventListener('keydown',function(e){var v=vis(),n=Math.max(1,v.length);if(e.key==='ArrowDown'){e.preventDefault();sel=(sel+1)%n;mark();}else if(e.key==='ArrowUp'){e.preventDefault();sel=(sel-1+n)%n;mark();}else if(e.key==='Enter'){e.preventDefault();if(v[sel])location.href=v[sel].href;}});
p.addEventListener('click',function(e){if(e.target===p)p.close();});
})();`;

const FB_PRIMARY = 6;
const FB_NARROW = 6;

function featureBar(ctx, sections, path, { inline = false } = {}) {
  const tileList = sections.map((item) => {
    const art = FEATURE_ART[item.href] || { hue: 'var(--accent)', mark: '' };
    const c = typeof item.count === 'function' ? item.count(ctx) : null;
    const current = item.href === path ? ' aria-current="page"' : '';
    // `k` WAS BEING COMPUTED AND THROWN AWAY. SECTIONS documents it as "the
    // word a screen reader hears in place of the figure" and nothing rendered
    // it, so every tile announced a bare number: "ALPR, 115,608". For most
    // tiles that is merely unhelpful. For this one it is the wrong reading —
    // 115,608 heard without "as mapped in OpenStreetMap on <date>" is heard as
    // a national total, which is the single claim the data cannot support. So
    // the unit is attached where it was always meant to go: aria-label for
    // assistive technology, title for a pointer. Neither changes the visible
    // tile, and a tile with no count is unchanged.
    const unit = c && c.k ? `${c.v} ${c.k}` : '';
    const named = unit ? ` aria-label="${esc(`${item.label}: ${unit}`)}" title="${esc(unit)}"` : '';
    return `<a class="fb__t" href="${esc(ctx.href(item.href))}"${current}${named} style="--fb-hue:${esc(art.hue)}">
      ${roomArt(item.href) ? `<img class="fb__img" src="${esc(ctx.href(`/img/art-${roomArt(item.href)}.webp`))}" width="30" height="30" alt="" loading="lazy">` : `<svg class="fb__m" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${art.mark}</svg>`}
      <span class="fb__l">${esc(item.label)}</span>
      ${c ? `<b class="fb__n num">${esc(c.v)}</b>` : '<span class="fb__n fb__n--none" aria-hidden="true">·</span>'}
    </a>`;
  });
  const tiles = tileList.join('');
  // ONE ROW ON A WIDE SCREEN. Fourteen tiles wrapped into two rows and put
  // ~40px more chrome above the reading than the competitor's whole header.
  // From 1080px the first FB_PRIMARY tiles stay in the row and the rest move
  // into a native <details> menu, so nothing needs a script and nothing is
  // behind a sideways gesture. Below 1080px the menu is display:none and every
  // tile is in the strip exactly as before.
  const extraFrom = Math.min(FB_PRIMARY, tileList.length);
  const extras = tileList.slice(extraFrom);
  const curInExtras = sections.slice(extraFrom).some((item) => item.href === path);
  // Tiles past FB_NARROW also leave the row between 1080 and 1499px, where
  // eight tiles and More do not fit on one line; the menu carries a copy of
  // them that only shows at those widths.
  const narrowFrom = Math.min(FB_NARROW, extraFrom);
  const narrow = tileList.slice(narrowFrom, extraFrom).map((t) => t.replace('class="fb__t"', 'class="fb__t fb__t--ym"'));
  const cls = (i) => (i >= extraFrom ? 'fb__t fb__t--x' : i >= narrowFrom ? 'fb__t fb__t--y' : 'fb__t');
  const inlineTiles = tileList.map((t, i) => t.replace('class="fb__t"', `class="${cls(i)}"`)).join('')
    + (extras.length
      ? `<details class="fb__more${curInExtras ? ' fb__more--cur' : ''}"><summary class="fb__t fb__sum">More <b class="fb__n num fb__c--w">${extras.length}</b><b class="fb__n num fb__c--n">${extras.length + narrow.length}</b></summary><div class="fb__menu">${narrow.join('')}${extras.join('')}</div></details>`
      : '');
  // Inline form: the masthead already supplies the .wrap and the gutter, so a
  // second one here would indent the tiles inside their own band. The tile
  // markup is identical either way -- only the container changes.
  if (inline) return `<nav class="fb fb--inline" aria-label="Sections">${inlineTiles}</nav>`;
  return `<nav class="fb" aria-label="Sections"><div class="wrap fb__in">${tiles}</div></nav>`;
}

const FEATURE_BAR_CSS = `<style>
.fb { border-bottom: 1px solid var(--rule); background: var(--bg-sunken); }
.fb__in { display: flex; gap: 6px; padding: 7px var(--gutter); overflow-x: auto; scrollbar-width: thin; }
.fb__t {
  display: flex; align-items: center; gap: 6px; flex: 0 0 auto;
  padding: 6px 10px; border: 1px solid var(--rule); border-radius: 7px;
  background: color-mix(in srgb, var(--fb-hue) 7%, transparent);
  text-decoration: none; color: var(--ink-dim);
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: .07em; text-transform: uppercase;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}
.fb__m { width: 15px; height: 15px; color: var(--fb-hue); flex: none; }
.fb__n { color: var(--fb-hue); font-variant-numeric: tabular-nums; font-size: var(--t-xs); }
.fb__n--none { opacity: .45; }
.fb__t:hover { color: var(--ink); border-color: var(--fb-hue);
  background: color-mix(in srgb, var(--fb-hue) 16%, transparent); }
.fb__t[aria-current="page"] {
  color: var(--ink); border-color: var(--fb-hue);
  background: color-mix(in srgb, var(--fb-hue) 20%, transparent);
  box-shadow: inset 0 -2px 0 0 var(--fb-hue);
}
/* THE INLINE FORM -- the tiles live in the masthead's row, not in a band of
   their own. Two bands cost two borders, two lots of vertical padding and, on
   a wide screen, a whole extra 58px stripe before any content.

   flex-wrap on .masthead__in does the responsive work with no breakpoint: the
   tiles sit beside the lockup when they fit and drop to their own line when
   they do not, so nothing is ever hidden behind a horizontal gesture. All
   eleven destinations stay TILES at every width -- a mark and a live number --
   because the text-link treatment is what made /watts, /digest and /bliss
   undiscoverable in the first place. */
.fb--inline {
  display: flex; gap: 6px; flex: 1 1 100%; min-width: 0;
  justify-content: flex-start;
}
/* WRAP, DO NOT SCROLL, ONCE THERE IS ROOM TO WRAP INTO.
   Measured 2026-09-25 at 1440x900: the tiles need 1400px and the column is
   1240, so the strip was scrolling 160px and "Archive" sat past the right
   edge -- one to two destinations hidden behind a gesture with no affordance,
   at the commonest desktop width. That is the same findability failure the
   tiles were built to fix, arriving from the other direction. A second row
   costs ~38px and hides nothing. */
@media (min-width: 700px) { .fb--inline { flex-wrap: wrap; } }
/* Under 700px eleven tiles would wrap into three rows and eat the fold, so the
   strip scrolls -- the one width where a swipe is the expected idiom, and
   where the labels are already dropped so a tile is a mark and a number. */
@media (max-width: 699px) {
  .fb--inline { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px;
    /* The strip is ALWAYS scrollable at this width -- eleven tiles need ~790px
       of a 375px screen -- so the right edge is faded to say so. Without it the
       last tile ends flush and the strip reads as complete, which is how five
       destinations go missing on a phone. The fade is unconditional here
       precisely because the overflow is. */
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 26px), transparent);
    mask-image: linear-gradient(90deg, #000 calc(100% - 26px), transparent);
  }
}
.fb__more { display: none; position: relative; flex: 0 0 auto; }
.fb__sum { cursor: pointer; list-style: none; --fb-hue: var(--accent); }
.fb__sum::-webkit-details-marker { display: none; }
.fb__more--cur > .fb__sum { color: var(--ink); border-color: var(--fb-hue); }
.fb__menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 40; display: grid; gap: 6px; min-width: 220px;
  padding: 8px; border: 1px solid var(--rule); border-radius: 9px; background: var(--bg-sunken);
  box-shadow: 0 12px 30px rgba(0,0,0,.45); }
.fb__menu .fb__t { justify-content: flex-start; }
.fb__menu .fb__n { margin-left: auto; }
@media (min-width: 700px) {
  /* Wraps rather than runs off the edge: eight tiles and their live numbers
     need ~1,350px, and a 1280px laptop was scrolling sideways by 200. More
     is pinned right so its menu always opens inside the page. */
  .fb--inline > .fb__t--x { display: none; }
  .fb__more { display: block; margin-left: auto; }
  .fb--inline .fb__t { padding: 6px 8px; letter-spacing: .04em; }
  .fb__c--w, .fb__menu .fb__t--ym { display: none; }
}
@media (min-width: 1080px) and (max-width: 1499px) { .fb--inline > .fb__t--y { display: none; } .fb__menu .fb__t--ym { display: flex; } }
@media (min-width: 1500px) {
  .fb__c--w { display: inline; } .fb__c--n { display: none; }
}
/* The tagline must not eat the row the tiles need. */
.masthead__in > .masthead__tag { flex: 0 1 auto; }
/* THE LABEL STAYS ON A PHONE. This hid .fb__l below 620px so twelve tiles
   would fit, which turned the entire navigation into twelve icon-and-number
   pairs with no words — the operator's exact words were "it's an icon and a
   number for the flock map, it doesn't say what it is so I wouldn't know to
   click it". They were right, and it was true of all twelve, not just that
   one. An unlabelled glyph beside a number is a puzzle, not a destination.
   The strip already scrolls horizontally at this width and already carries a
   fade on its right edge to say so, so the cost of keeping the words is that
   fewer tiles are visible at once — which is the correct trade: four tiles a
   reader can read beats twelve they cannot. */
@media (max-width: 620px) { .fb__t { padding: 7px 9px; } }
@media (prefers-reduced-motion: reduce) { .fb__t { transition: none; } }
</style>`;


/**
 * A JUMP INDEX FOR A PAGE YOU CANNOT SEE THE END OF.
 *
 * Measured 2026-09-26: the homepage is 8.5 screens with fifteen id'd <h2>
 * headings, and exactly ONE link on the whole page pointed at any of them. A
 * reader had no way to see what was on the page, let alone reach it. Every
 * heading already carries an id, so the anchors were free and simply unused.
 *
 * WHY THIS IS NOT STICKY, against the research. The sweep found that Our
 * World in Data, Wikipedia and MDN all pin an in-page index and let the global
 * nav scroll. We already let the global nav scroll, and the sticky section
 * headings shipped earlier give the continuous "where am I" that pinning
 * mostly buys. What was still missing is the OVERVIEW — what is on this page —
 * and an overview is read once, on arrival. Pinning it would spend 30px of
 * every screen forever to keep answering a question asked once. So it sits at
 * the top of the content, where a reader arrives, and scrolls away like any
 * other content.
 *
 * DEPTH-AWARE ON PURPOSE. A flat regex for <h2 id> would pull in the five
 * panels nested inside the switcher and turn a seven-item index into a
 * fifteen-item directory. This tracks <section> depth and takes only the
 * headings of top-level sections, which is the same set the section rules in
 * styles.mjs target.
 */
/**
 * THE TABLE OF CONTENTS GOES AFTER THE FIRST SECTION, NOT BEFORE IT.
 *
 * Measured 2026-10-03 at 1440x1100 against pizzint.watch, the competitor this
 * site is built to beat on distribution: they spend 43px of the first screen on
 * chrome before their headline number; we spent 335px, and 94 of those were
 * this nav - a list of nine links to places the reader has no reason to want
 * yet, printed above the one sentence that says what the site measures.
 *
 * A contents list is navigation for a page you have decided to read. It earns
 * its space after the first section has made the case, so it now follows the
 * hero on the homepage and the intro on every other page. The markup, the
 * links and the order are unchanged; only the position moves.
 *
 * Splice point: the close of the first TOP-LEVEL section. Nested sections are
 * tracked by depth so a section inside the hero cannot end it early. With no
 * section in the page the nav goes back to the top, which is where a page with
 * no sections wants it.
 */
function withJumpIndex(mainHtml) {
  const nav = jumpIndex(mainHtml);
  if (!nav) return mainHtml;
  const token = /<section\b|<\/section>/g;
  let depth = 0;
  let m;
  while ((m = token.exec(mainHtml)) !== null) {
    if (m[0] === '</section>') {
      depth -= 1;
      if (depth === 0) {
        const at = m.index + m[0].length;
        return `${mainHtml.slice(0, at)}\n${nav}\n${mainHtml.slice(at)}`;
      }
    } else depth += 1;
  }
  return `${nav}\n${mainHtml}`;
}

function jumpIndex(mainHtml) {
  const items = [];
  let depth = 0;
  const token = /<section\b|<\/section>|<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = token.exec(mainHtml)) !== null) {
    const tag = m[0];
    if (tag === '</section>') { depth -= 1; continue; }
    if (tag.startsWith('<section')) { depth += 1; continue; }
    // A heading counts when its own section is the outermost one open.
    if (depth === 1 && m[1]) {
      // The house-name tag after a plain heading (.sec__eb) is decoration; the
      // jump index wants "Where the index sits", not "Where the index sits The oven".
      const text = m[2].replace(/<span class="sec__eb">[\s\S]*?<\/span>/g, '')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) items.push({ id: m[1], text });
    }
  }
  if (items.length < 3) return '';
  return `<nav class="jump" aria-label="On this page">
  <span class="jump__k">On this page</span>
  <ul class="jump__l">${items.map((i) => `<li><a href="#${esc(i.id)}">${esc(i.text)}</a></li>`).join('')}</ul>
</nav>`;
}

export function page(o) {
  const { ctx } = o;
  const canonical = ctx.url(o.path);
  const jsonld = (o.jsonld || []).map((block) => jsonScript(block)).join('\n');

  // Absent -> the empty string, and every interpolation site below is written
  // so that the empty string changes nothing. A page() caller that does not ask
  // for motion gets the same output it got before this existed, which is the
  // only way to be sure the nine existing callers still work.
  const motion = o.motion
    ? motionBlock(ctx, o.motion === true ? {} : o.motion, o.path)
    : { head: '', beforeMain: '', bodyEnd: '' };

  const lead = (s) => (s ? `\n${s}` : '');
  const headExtra = lead(motion.head) + lead(o.head);
  const bodyEndExtra = lead(motion.bodyEnd) + lead(o.bodyEnd);

  // og:image only when the card actually exists on disk. A tag pointing at a
  // 404 is worse than no tag: X renders a broken card instead of falling back
  // to the summary form, and the share is the whole growth loop.
  // Fall back to the live state card rather than to nothing. Every page with
  // no card of its own — /methodology, /history, the 200 item pages — was
  // emitting NO og:image at all, which docs/COMPETITIVE.md measured as the
  // largest single acquisition hole on the site: a shared link rendered as a
  // bare blue rectangle. The state card is a reading rather than a logo, so
  // the fallback is worth clicking.
  // X caches a link card by URL. The fallback state card is rewritten every
  // reading under one path, so it is versioned by the receipt it was drawn from.
  const ogBase = o.ogImage || 'cards/state.png';
  const ogPath = ogBase + (ctx.state && ctx.state.receipt_id && !ogBase.includes('?')
    ? `?v=${encodeURIComponent(ctx.state.receipt_id)}` : '');
  const ogImage = ogPath
    ? `<meta property="og:image" content="${esc(ctx.url(ogPath))}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="675">
    <meta property="og:image:alt" content="${esc(o.ogImageAlt || `${brand.NAME} share card`)}">
    <meta name="twitter:image" content="${esc(ctx.url(ogPath))}">
    <meta name="twitter:card" content="summary_large_image">`
    : '';

  // twitter:site is emitted only when brand.X_HANDLE is a handle we control.
  // pizzint ships a handle they do not own on every page; the fix is to have no
  // fallback value at all rather than to remember to check.
  const twitterSite = brand.X_HANDLE
    ? `<meta name="twitter:site" content="${esc(brand.X_HANDLE)}">`
    : '';

  // The nav carries the number each destination holds. Two labels are emitted
  // per link, not one: the full name and the short one, and CSS swaps them at
  // phone width - so a nine-item nav with a figure on each is one wrapped row
  // on a 375px screen rather than three. The figure is inside the link on
  // purpose; it is the reason to tap, not a decoration beside it.
  const sections = SECTIONS.filter((s) => !s.needs || hasSection(ctx, s.needs));
  // The masthead text nav was REMOVED here. The feature bar above renders the
  // same SECTIONS array with a mark and a live count on each tile, so it was a
  // strict superset of this list, and shipping both stacked two navigations on
  // top of each other: 122px of masthead on a 375px phone, and no answer to
  // "which one do I use?". Measured 2026-09-25, chrome above the first content
  // was 244px of an 812px fold. `sections` stays — the feature bar and the
  // footer both still read it.
  //
  // With one difference between the two: an entry that `yieldsTo` another
  // route gives up its TILE while that route exists, and keeps its footer
  // row. Today that is Upside yielding to Balance.
  const tiles = sections.filter((s) => !s.yieldsTo || !hasSection(ctx, s.yieldsTo));
  const kit = navKit(ctx, tiles, o.path);

  // Data pages get the wide measure; prose pages keep the 66ch reading column.
  // A methodology page at 1240px is a worse methodology page; a dashboard at
  // 940px on a 1440px screen is 500px of margin doing nothing.
  const wide = o.path === '/' || o.path === '/race.html' || o.path === '/news.html';

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(serpTitle(o.title))}</title>
<meta name="description" content="${esc(serpDescription(o.description))}">
<link rel="canonical" href="${esc(canonical)}">
${o.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#faf9f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0c0e" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${esc(o.ogType || 'website')}">
<meta property="og:site_name" content="${esc(brand.PUBLICATION)}">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
${twitterSite}
${ogImage}
<link rel="alternate" type="application/rss+xml" title="${esc(brand.NAME)} index moves" href="${esc(ctx.href('/feed.xml'))}">
<link rel="alternate" type="application/rss+xml" title="${esc(brand.NAME)} level changes only" href="${esc(ctx.href('/feed-level.xml'))}">
<link rel="stylesheet" href="${esc(ctx.href(FONT_HREF))}">
${marks.headLinks({ href: ctx.href })}
${ctx.cssHref
  ? `<link rel="stylesheet" href="${esc(ctx.cssHref)}">`
  : `<style>${marks.LOCKUP_CSS}</style><style>${css()}</style>`}${headExtra}
${jsonld}
</head>
<body${wide ? ' data-wide="1"' : ''}>
<a class="skip" href="#main">Skip to the index</a>
${brand.X_URL || mzOn.tips() ? `<p class="give">${esc(brand.NAME)} is free${mzOn.ads() ? '' : ' and carries no ads'}. <a href="${esc(mzOn.tips() ? MONETIZE.tips.url : brand.X_URL)}" rel="noopener">Keep it running: ${mzOn.tips() ? esc(MONETIZE.tips.label.toLowerCase()) : 'donate with X Money'} →</a></p>` : ''}
<header class="masthead v2m"><div class="wrap masthead__in">
  <a class="v2m-brand" href="${esc(ctx.href('/'))}"${o.path === '/' ? ' aria-current="page"' : ''}><img src="${esc(ctx.href('/img/art-siren.webp'))}" width="52" height="52" alt="">${pixelText('AI SIREN INDEX', 4, '#FFFFFF', 'v2m-word')}</a>
  ${kit.button}
  ${featureBar(ctx, tiles, o.path, { inline: true })}
</div></header>${FEATURE_BAR_CSS}${NAV_KIT_CSS}
${rail(ctx, o.path)}
${visitSlot(ctx)}
${o.showDegraded ? degradedBanner(ctx.state) : ''}${motion.beforeMain}
<main class="wrap" id="main" data-level="${esc(ctx.state && Number.isFinite(ctx.state.level) ? String(ctx.state.level) : '')}">
${pageBanner(ctx, o.path)}${withJumpIndex(o.main)}
</main>
${kit.next}
${footer(ctx, sections, o.path)}${kit.palette}${kit.tabbar}${bodyEndExtra}
<script>${CHROME_JS}</script>
<script>${NAV_KIT_JS}</script>
</body>
</html>
`;
}

/**
 * The route gate. One predicate per `needs` key, and each one is the SAME
 * predicate build.mjs uses to decide whether to write the file — deliberately
 * restated here rather than imported, because importing wattsPage into layout
 * would close an import cycle (every page module imports `page` from this
 * file). If build.mjs's gate moves, this one moves with it; that pairing is in
 * the integration note.
 *
 * `digest` and `bliss` read false today, because build.mjs sets neither
 * ctx.digest nor ctx.bliss. That is the correct failure: the entries sit in
 * SECTIONS ready, and the day the integrator wires those two templates up the
 * nav grows two links and the footer grows two rows with no edit here. A nav
 * that links a 404 is worse than a nav with seven items.
 */
function hasSection(ctx, key) {
  if (key === 'race') return Boolean(ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length);
  if (key === 'news') return Boolean(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length);
  if (key === 'watts') {
    return Boolean(ctx.infra && Array.isArray(ctx.infra.sources) && ctx.infra.sources.length
      && Array.isArray(ctx.infra.pillars));
  }
  if (key === 'digest') return Boolean(ctx.digest && typeof ctx.digest === 'object');
  if (key === 'bliss') return Boolean(ctx.bliss && Array.isArray(ctx.bliss.sources) && ctx.bliss.sources.length);
  if (key === 'leaders') {
    return Boolean(ctx.leaders && Array.isArray(ctx.leaders.leaders) && ctx.leaders.leaders.length);
  }
  if (key === 'map') {
    return Boolean(ctx.datacenters && Array.isArray(ctx.datacenters.sites)
      && ctx.datacenters.sites.length && ctx.datacenters.resources_index);
  }
  // /world is gated on TWO facts, exactly like /flock below and for the same
  // reason: two modules decide it.
  //
  // The data half is build.mjs's hasWorldData() restated verbatim — same
  // fields, same order — and it is also the predicate worldPage.mjs exports
  // to choose between the page and its empty state. Three copies; they move
  // together, and build.mjs warns when its copy and the template's disagree.
  // copy.attribution_required is the ODbL line; worldOutline.countries is the
  // land the pins are drawn on. The orbital register is not in the gate: it
  // is one section of the page and the page renders without it.
  //
  // The second half is ctx.routes.world, which build.mjs sets and this module
  // cannot compute: whether site/templates/worldPage.mjs loaded at all.
  // Absent ctx.routes — a harness rendering layout on its own — the data
  // predicate stands by itself.
  if (key === 'world') {
    if (ctx.routes && ctx.routes.world === false) return false;
    const w = ctx.world;
    const o = ctx.worldOutline;
    return Boolean(w
      && Array.isArray(w.sites) && w.sites.length
      && w.totals
      && w.copy && w.copy.attribution_required
      && o
      && Array.isArray(o.countries) && o.countries.length);
  }
  // /balance is gated on TWO facts, exactly like /world and for the same
  // reason: two modules decide it.
  //
  // The data half is build.mjs's hasBalanceData() restated verbatim — same
  // fields, same order — and it is also the predicate balancePage.mjs exports
  // as hasBalancePage() (it is _balance.mjs's hasBalance()). Three copies;
  // they move together, and build.mjs warns when its copy and the template's
  // disagree. The file's blocks are not required one by one because each has
  // a dark state the page prints; the two registers are required because
  // without them the page is a word count.
  //
  // The second half is ctx.routes.balance: whether balancePage.mjs loaded.
  // Absent ctx.routes — a harness rendering layout on its own — the data
  // predicate stands by itself. This key also decides whether the Upside tile
  // yields its place on the bar (SECTIONS, `yieldsTo`).
  if (key === 'balance') {
    if (ctx.routes && ctx.routes.balance === false) return false;
    return Boolean(ctx.balance && ctx.ledger
      && Array.isArray(ctx.ledger.benefit) && Array.isArray(ctx.ledger.harm));
  }
  // /flock is gated on TWO facts, because it is decided by two modules.
  //
  // The data half is build.mjs's hasFlockData() restated verbatim — same
  // fields, same order — and the two must move together. `coverage` and `copy`
  // are required, not optional: copy carries the "as mapped in OpenStreetMap
  // on <date>" qualifier this nav prints, the sentence that separates a county
  // nobody has mapped from a county with no cameras, and the
  // "© OpenStreetMap contributors" attribution the ODbL requires. A page
  // without them would publish a crowdsourced sample as a census.
  //
  // The second half is ctx.routes.flock, which build.mjs sets and this module
  // cannot compute: whether site/templates/flockPage.mjs loaded at all. Data
  // with no template is no page, and a tile drawn from the data alone would
  // link a 404 until the template lands. Absent ctx.routes — a harness
  // rendering layout on its own — the data predicate stands by itself.
  if (key === 'flock') {
    if (ctx.routes && ctx.routes.flock === false) return false;
    const f = ctx.flock;
    return Boolean(f
      && f.totals && Number.isFinite(f.totals.mapped_worldwide)
      && Array.isArray(f.counties) && f.counties.length
      && Array.isArray(f.states) && f.states.length
      && f.coverage
      && f.copy && f.copy.attribution_required);
  }
  // /exploits is gated on TWO facts, exactly like /flock and for the same
  // reason: two modules decide it.
  //
  // The data half is build.mjs's hasExploitsData() restated verbatim — same
  // fields, same order — and the two must move together. Every clause is
  // load-bearing because the page publishes a NULL RESULT, and a null result
  // without its caveats is just a headline. naive_by_half_year is required
  // rather than optional: it is the ARTEFACT series, the one that shows the
  // median collapsing from 1,616 days to 8 because a new catalogue was
  // clearing a backlog of decades-old vulnerabilities, and a page that shipped
  // only the flattering series would have had the check on its own finding
  // removed. copy.what_this_is_not carries the distinction the page turns on —
  // no acceleration is visible IN THIS MEASUREMENT, which is not the same
  // sentence as "AI is not accelerating attacks".
  //
  // The second half is ctx.routes.exploits, which build.mjs sets and this
  // module cannot compute: whether site/templates/exploitsPage.mjs loaded at
  // all. Absent ctx.routes — a harness rendering layout on its own — the data
  // predicate stands by itself.
  if (key === 'exploits') {
    if (ctx.routes && ctx.routes.exploits === false) return false;
    const e = ctx.exploits;
    const s = e && e.series;
    return Boolean(e
      && s && s.fresh_by_year && Array.isArray(s.fresh_by_year.rows) && s.fresh_by_year.rows.length
      && s.naive_by_half_year && Array.isArray(s.naive_by_half_year.rows) && s.naive_by_half_year.rows.length
      && e.populations && e.populations.all && Number.isFinite(e.populations.all.n)
      && e.sources && e.sources.cisa_kev && e.sources.nvd
      && e.copy && e.copy.headline && e.copy.what_this_is_not
      && Array.isArray(e.honesty) && e.honesty.length);
  }
  return true;
}

/**
 * The footer as a site index, not a link list.
 *
 * pizzint spends 26.5% of its homepage height selling its other pages and we
 * spent 3.6%. Half of that gap closes in the footer for free: every route on
 * the site, in the same order as the nav, each with the one sentence that says
 * why you would open it. The reader who got this far is the reader most likely
 * to open a second page, and we were handing them five bare words.
 */

/**
 * The five cells the rail used to carry, re-homed. The expressions are the
 * rail's own, verbatim, so the numbers cannot disagree with what the rail
 * printed yesterday; the titles travel with them because "routinely late" is
 * the honest gloss on a cron and belongs beside the stamp, not lost.
 */
function telemetryRow(ctx) {
  const st = ctx && ctx.state;
  if (!st || !Array.isArray(st.sources)) return '';
  const scored = st.sources.filter((x) => x.ok).length;
  const news = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items.length : null;
  const feedRows = ctx.news && Array.isArray(ctx.news.sources) ? ctx.news.sources : null;
  const feeds = feedRows ? feedRows.filter((x) => x.ok).length : null;
  const receipts = Array.isArray(ctx.receipts) ? ctx.receipts.length : null;
  const due = nextDueIso(st.generated_at);
  const cell = (k, v, title = '') =>
    `<span class="tele__c"${title ? ` title="${esc(title)}"` : ''}><span class="tele__k">${k}</span><b class="tele__v num">${v}</b></span>`;
  const cells = [];
  if (due) cells.push(cell('Next collection', `<time datetime="${esc(due)}" data-dc-next>${esc(utcClock(due))}Z</time>`,
    `Collection runs on a published */${CADENCE_MIN} cron. Scheduled runs are queued and are routinely late.`));
  cells.push(cell('Sources scored', String(scored), 'Sources with a frozen baseline to score against.'));
  if (feeds !== null) cells.push(cell('News feeds', `${feeds}/${feedRows.length}`, 'Newsroom feeds answering, of those asked.'));
  if (news !== null) cells.push(cell('Items scored', String(news)));
  if (receipts !== null) cells.push(cell('Receipts', String(receipts), 'Hash-chained receipts, one per scored observation.'));
  return `<p class="foot__tele" aria-label="Collector telemetry">${cells.join('')}</p>`;
}

function footer(ctx, sections, path) {
  // MEASURED 2026-09-27 at 1024px: the footer was 1,179px tall, 902 of them
  // the index, because thirteen pages and nine data files each carried a
  // sentence. The nav bar at the top of every page already sells each page
  // with its label and its live count, and the homepage's "Public JSON API"
  // section describes every file; a footer that repeats both is a second
  // screen of scrolling past the end of the page. Pages and Data are bare
  // labels now - Pages in two columns - and Data carries one pointer to the
  // section that explains it. Provenance keeps its one line. Target: under
  // 500px at desktop width.
  const col = (id, heading, items, blurbKey = null, note = '') => `
    <div class="foot__col">
      <h2 class="foot__h" id="${esc(id)}">${esc(heading)}</h2>
      ${note}
      <ul class="foot__list${items.length > 8 ? ' foot__list--2' : ''}">
        ${items.map((it) => {
          const external = /^https?:/.test(it.href);
          const href = external ? it.href : ctx.href(it.href);
          const here = !external && it.href === path ? ' aria-current="page"' : '';
          return `<li><a href="${esc(href)}"${here}${external ? ' rel="noopener"' : ''}>${esc(it.label)}</a>` +
            (it[blurbKey] ? `<span>${esc(it[blurbKey])}</span>` : '') + `</li>`;
        }).join('')}
      </ul>
    </div>`;

  // Provenance, plus the one place the site asks for anything. Gated on
  // brand.X_URL for the same reason twitter:site is: with no handle there is
  // no account, and a dead "support us" link is worse than none.
  const source = [
    { href: '/about.html', label: 'About', blurb: 'What this is, who runs it, how it is paid for, and how to get in touch.' },
    { href: '/p-doom.html', label: 'What is p(doom)?', blurb: 'The probability-of-doom number, explained.' },
    { href: '/ai-doomsday-clock.html', label: 'AI doomsday clock?', blurb: 'What exists, and one you can verify.' },
    { href: '/guide.html', label: 'Guide', blurb: 'SIREN, DEFCON, the Doomsday Clock and p(doom): what each one measures.' },
    { href: '/sponsor.html', label: 'Sponsor', blurb: 'One labelled sponsor at a time, with no say over the number.' },
    { href: '/brand.html', label: 'Brand', blurb: 'Name, colours, type, voice and Tally to download.' },
    { href: '/press.html', label: 'Press kit', blurb: 'Facts, a paragraph to lift, images and a contact.' },
    { href: '/privacy.html', label: 'Privacy', blurb: 'No cookies. Every trace a visit can leave.' },
    { href: '/terms.html', label: 'Terms & disclaimers', blurb: 'Information and commentary, not advice. No warranty, no liability.' },
    { href: brand.REPO_URL, label: 'Source code', blurb: `Every line that produced these numbers. ${brand.LICENSE}.` },
  ];
  if (brand.X_URL) {
    source.push({
      href: brand.X_URL,
      label: 'Donate with X Money',
      blurb: `${brand.X_HANDLE} — the Money ($) button on the profile, and where the daily reading is posted.`,
    });
  }

  // The two ALPR endpoints appear only when the route does. Every other row in
  // DATA_LINKS is unconditional because every other endpoint is; these two are
  // written only when data/flock.json parsed, and a footer link to a 404 is
  // the same failure as a nav link to one.
  const flockOn = hasSection(ctx, 'flock');
  const zeros = flockOn && ctx.flock.coverage && Number.isFinite(ctx.flock.coverage.counties_with_none_mapped)
    ? ctx.flock.coverage.counties_with_none_mapped : null;
  //
  // /api/exploits.json joins the same way and for the same reason. Its blurb
  // prints the n from the payload rather than a number typed here, because the
  // catalogue grows and a footer that claimed a stale count would be the first
  // wrong figure a reader met.
  const exploitsOn = hasSection(ctx, 'exploits');
  const exploitsN = exploitsOn && ctx.exploits.populations && ctx.exploits.populations.all
    && Number.isFinite(ctx.exploits.populations.all.n)
    ? ctx.exploits.populations.all.n : null;
  //
  // /world's two endpoints join on the same terms, with one difference worth
  // stating: build.mjs writes them on the ROUTE, not merely on the text, and
  // the route is exactly what hasSection('world') reads — so a link here
  // cannot outlive its file. The register's row also needs the register
  // itself, because the route does not require one and build.mjs publishes
  // /api/orbital.json only from a copy that parsed.
  const worldOn = hasSection(ctx, 'world');
  const worldQ = worldOn && ctx.world.copy && ctx.world.copy.headline_qualifier
    ? ctx.world.copy.headline_qualifier : 'as mapped in OpenStreetMap';
  //
  // /balance's two files join on /world's terms: build.mjs writes both on the
  // route, and the route is what hasSection('balance') reads. The register
  // row counts come from the ledger itself rather than a number typed here.
  const balanceOn = hasSection(ctx, 'balance');
  const dataLinks = [
    ...DATA_LINKS,
    ...(worldOn ? [
      { href: '/api/world.json', label: 'World JSON',
        blurb: `Every mapped datacentre site with its country and status, and the per-country counts, ${worldQ}. OpenStreetMap data, ODbL.` },
      ...(ctx.orbital ? [
        { href: '/api/orbital.json', label: 'Orbital JSON',
          blurb: 'Every orbital computing programme: what is in space, what is filed, and the sources for both.' },
      ] : []),
    ] : []),
    ...(flockOn ? [
      { href: '/api/flock.json', label: 'ALPR JSON',
        blurb: zeros === null
          ? 'Mapped ALPR cameras by state and by county, every county included.'
          : `Mapped ALPR cameras by state and by county — including the ${grouped(zeros)} counties nobody has mapped.` },
      { href: '/api/flock-points.json', label: 'ALPR points',
        blurb: 'Packed latitude, longitude and bearing, one entry per mapped camera. OpenStreetMap data, ODbL.' },
    ] : []),
    ...(exploitsOn ? [
      { href: '/api/exploits.json', label: 'Exploits JSON',
        blurb: exploitsN === null
          ? 'Every catalogued exploited vulnerability joined to its NVD publication date, with the lag in days.'
          : `All ${grouped(exploitsN)} catalogued entries joined to their NVD publication date, with the lag in days and every series on the page.` },
    ] : []),
    ...(balanceOn ? [
      { href: '/api/balance.json', label: 'Balance JSON',
        blurb: 'The newsroom counts on both word lists, every matched headline, the six counters and both lists in full. Nothing summed.' },
      { href: '/api/ledger.json', label: 'Registers JSON',
        blurb: `The two hand-checked registers: ${grouped(ctx.ledger.benefit.length)} benefit and ${grouped(ctx.ledger.harm.length)} harm rows, each dated and sourced.` },
    ] : []),
  ];

  // THE LICENCE LINE. ODbL requires the attribution and the link wherever the
  // data is shown, and "the page template will remember" is not a mechanism.
  // The page carries its own attribution; this is the footer's copy of it, on
  // the one route that shows the data, so the licence condition is met by the
  // chrome even if a future edit to the page body drops it. The second
  // sentence is the coverage caveat, printed from the payload rather than
  // paraphrased here: a reader who scrolls to the bottom of a map of cameras
  // should not be able to leave believing the blank counties are clear.
  //
  // /world shows OpenStreetMap data too, so it carries the same line, printed
  // from ctx.world.copy on the same terms: the attribution, the link, and the
  // sentence that separates a country nobody has mapped from a country with
  // no datacentres.
  const odbl = flockOn && path === '/flock.html'
    ? `<p class="foot__fine">Camera locations on this page are ${esc(ctx.flock.copy.attribution_required)}, licensed under the
      <a href="${esc(ctx.flock.copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="noopener">Open Database License</a>.
      ${esc(ctx.flock.coverage && ctx.flock.coverage.what_zero_means ? ctx.flock.coverage.what_zero_means : '')}</p>`
    : worldOn && path === '/world.html'
      ? `<p class="foot__fine">Datacentre locations on this page are ${esc(ctx.world.copy.attribution_required)}, licensed under the
      <a href="${esc(ctx.world.copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="noopener">Open Database License</a>.
      ${esc(ctx.world.copy.what_zero_means || '')}</p>`
      : '';

  // THE SOURCE LINE ON /exploits. Nothing legally compels this one: CISA KEV
  // and NVD are works of the US Government in the public domain, so unlike the
  // ODbL line above there is no licence condition to meet. The payload
  // compels it. copy.attribution_note says public domain is not a reason to
  // omit the citation, because the page's whole claim on a reader is that
  // every figure can be recomputed, and a figure without its source and its
  // retrieval date cannot be. The chrome carries it so the guarantee survives
  // an edit to the page body, and both the label and the date are printed from
  // the payload so neither can drift from the data that was actually pulled.
  const exSrc = exploitsOn && ctx.exploits.sources ? ctx.exploits.sources : null;
  const exploitSource = exSrc && exSrc.cisa_kev && exSrc.nvd && path === '/exploits.html'
    ? `<p class="foot__fine">${esc(ctx.exploits.copy && ctx.exploits.copy.attribution
        ? ctx.exploits.copy.attribution
        : 'CISA Known Exploited Vulnerabilities catalogue and the National Vulnerability Database (NIST).')}
      Retrieved ${esc(ctx.exploits.retrieved_date || exSrc.cisa_kev.retrieved_date || '')}:
      <a href="${esc(exSrc.cisa_kev.url)}" rel="noopener">${esc(exSrc.cisa_kev.label)}</a>,
      <a href="${esc(exSrc.nvd.url)}" rel="noopener">${esc(exSrc.nvd.label)}</a>.</p>`
    : '';

  return `<footer class="foot" id="foot-rooms">
  <p class="foot__bcast">${mascot({ size: 40, level: ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : null })}<span>This is not a test. It is not an emergency either. It is a count.</span></p>
  <div class="wrap">
    <div class="foot__top">
      <div class="foot__brand">
        <div class="foot__seal">${seal(ctx, { size: 160, id: 'seal-foot' })}</div>
        <span class="foot__mark">${esc(brand.PUBLICATION)}</span>
        <p class="foot__creed">${esc(brand.TAGLINE)}</p>
        <p class="foot__dis">${esc(brand.DISCLAIMER)}</p>
      </div>
      <div class="foot__cols">
        ${col('foot-pages', 'Pages', sections)}
        ${col('foot-data', 'Data', dataLinks, null,
    `<p class="foot__note">What each file holds is described under <a href="${esc(ctx.href('/instruments.html'))}#api">Public JSON API</a>.</p>`)}
        ${col('foot-src', 'Provenance', source, 'blurb')}
      </div>
    </div>
    ${telemetryRow(ctx)}
    <p class="foot__memo"><span>Formerly <b>${esc(brand.FORMERLY)}</b></span>${ctx.state && ctx.state.receipt_id ? `<span>Ref <b>DC/${esc(ctx.state.receipt_id)}</b></span>` : ''}<span>Typed by <b>a cron job</b></span><span>Checked by <b>SHA-256</b></span><span>Copies to <b>anyone</b></span><span>Destroy after reading <b>no need, it is hash-chained</b></span></p>
    ${odbl}${exploitSource}<p class="foot__fine">Collection runs on a published <code>*/${CADENCE_MIN}</code> cron; scheduled runs are queued and
      are routinely late, which is why the rail above says <b>overdue</b> rather than counting down into fiction.
      Every value on this site is computed from public data by published code, and each observation is written to a
      hash-chained receipt carrying its full inputs — so anyone can recompute the number and get the same answer.
      Data and code: ${esc(brand.LICENSE)}.</p>
    <p class="foot__fine"><b>Not advice.</b> Information, commentary and satire only — not financial, investment, legal, security or safety advice.
      Data is automated and may be wrong or late; provided as is, with no warranty. Not affiliated with any company, lab, person or agency named here.
      Use of this site means you accept the <a href="${esc(ctx.href('/terms.html'))}">terms &amp; disclaimers</a>. <a href="${esc(ctx.href('/privacy.html'))}">Privacy</a>.</p>
  </div>
</footer>`;
}
