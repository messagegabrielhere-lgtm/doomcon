// THE CLAIM CARDS — a homepage module. Four to six sentences, one per
// instrument, each with its number set inside it.
//
// ---------------------------------------------------------------------------
// WHY SENTENCES AND NOT TILES
// ---------------------------------------------------------------------------
//
// Measured on the live homepage at 1440x900, 2026-09-26: 161 text atoms above
// the fold at a median of 13px, and no single statement a newcomer could read.
// The sites a stranger understands on sight lead with a NUMBER INSIDE A
// SENTENCE THAT CARRIES ITS UNIT — "It is now 85 seconds to midnight" — and
// set that number two to three times larger than anything near it.
//
// This module applies that rule to the rest of the site's surface area. Each
// card is ONE sentence, generated from ctx and never hand-written, with the
// number the sentence is about set as the largest thing on the card and the
// rest of the sentence flowing around it. The whole card is a link to the page
// that substantiates the sentence, and the sentence is the link's accessible
// name — nothing else inside the anchor is exposed to a screen reader.
//
// ---------------------------------------------------------------------------
// THE THREE STATES, KEPT APART (docs/VOICE.md §4)
// ---------------------------------------------------------------------------
//
//   absent   the ctx field is null: the data file was not on disk, or the page
//            module did not load (ctx.routes.<x> === false). There is nothing
//            to substantiate and nothing to link, so the card is OMITTED. A
//            missing feature is a smaller page, not a claim about the feature.
//   dark     the file is present and says its source did not answer, or the
//            value the sentence needs is not in it. The card PRINTS THE ABSENCE
//            in words — "source dark" — with no number, and still links to the
//            page, which prints the same state at length. Never a zero, never
//            the previous build's figure.
//   live     the number, its unit, its denominator and its date, in one
//            sentence.
//
// A measured zero is a live value and prints as one (0 of 15 leaders on the
// record is a finding; the wire prints it too). An unknown never prints as 0.
//
// ---------------------------------------------------------------------------
// WHAT THIS MODULE REFUSES TO DO
// ---------------------------------------------------------------------------
//
// It never imputes: every figure is read from a file, or counted over rows of
// one, in this build. It never reads the clock or the host locale, so the
// same ctx produces the same bytes on any machine. Ties in every sort are
// broken on a string id.
//
// It never uses --accent: sodium amber is spent on the live reading of the
// index and nothing else (site/styles.mjs, the colour contract at the top).
// These are readings from OTHER instruments and they are set in ink.
//
// It never forecasts. Every sentence is past or present tense and names its
// source and its date; docs/VOICE.md §3 is obeyed although it is not enforced
// on templates.
//
// Exports render(ctx) and styleTag(), following _developing.mjs and
// _leaderwire.mjs, so the integrator can import and place it blind. See the
// integration note at the bottom.

import { esc } from './_html.mjs';

// The order the cards print in. Stable and stated, never sorted by value:
// a row that reshuffled itself every build would read as a ranking, and
// these six numbers are not on one scale.
export const CLAIM_ORDER = Object.freeze([
  'race', 'flock', 'datacenters', 'exploits', 'news', 'leaders',
]);

// Where each card goes, and the word the nav uses for that page
// (site/templates/layout.mjs TILES), so the tail of a card and the tile it
// leads to say the same thing.
const DEST = Object.freeze({
  race:        { href: '/race.html',     to: 'The Race' },
  flock:       { href: '/flock.html',    to: 'Cameras' },
  datacenters: { href: '/map.html',      to: 'Map' },
  exploits:    { href: '/exploits.html', to: 'Exploits' },
  news:        { href: '/news.html',     to: 'Newsroom' },
  leaders:     { href: '/leaders.html',  to: 'Leaders' },
});

const MINUS = '−';

// ---------------------------------------------------------------------------
// Number formatting. Hand-rolled, because a locale-aware formatter depends on
// the ICU build of whichever Node renders the page, and a thousands separator
// that changes with the host is a byte that wobbles for no reason.
// ---------------------------------------------------------------------------

function group(intText) {
  return intText.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A whole count: 115,608. Non-finite input is the caller's bug. */
function N(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`_claims N(): expected a finite number, got ${JSON.stringify(v)}`);
  const body = group(String(Math.round(Math.abs(n))));
  return n < 0 ? `${MINUS}${body}` : body;
}

/**
 * Fixed decimals with the -0.00 trap closed. (-0.004).toFixed(2) is "-0.00"
 * for any input in (-0.005, 0): a sign on a zero, and a byte that flips
 * between builds whose values are equal to the precision printed.
 */
function fixed(v, places) {
  const s = Number(v).toFixed(places);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

/** A probability as a percentage to one place: 0.74 -> "74.0%". */
function pct1(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) throw new Error(`_claims pct1(): expected a finite probability, got ${JSON.stringify(p)}`);
  return `${fixed(n * 100, 1)}%`;
}

/**
 * A day count printed EXACTLY as the collector computed it — the convention
 * exploitsPage.mjs D() sets. An even cohort's median is a half-day no CVE had,
 * which is what a median is, so 8.5 prints as 8.5 and never as 8 or 9.
 */
function D(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`_claims D(): expected a finite day count, got ${JSON.stringify(v)}`);
  const r = Math.round(n * 10) / 10;
  const a = Math.abs(r);
  const whole = Math.floor(a);
  const frac = Math.round((a - whole) * 10);
  const body = frac === 0 ? group(String(whole)) : `${group(String(whole))}.${frac}`;
  return r < 0 ? `${MINUS}${body}` : body;
}

/** Locale-free string order for tie-breaks. */
function cmp(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function hrefOf(ctx, path) {
  return ctx && typeof ctx.href === 'function' ? ctx.href(path) : path;
}

// ---------------------------------------------------------------------------
// The card shapes. A live card is a sentence in three parts — pre, num, post —
// so the markup can set the middle part large without the text ever being
// split on a regex. A dark card is one plain sentence and no number.
// ---------------------------------------------------------------------------

function live(id, ctx, pre, num, post, ratio = null) {
  return { id, state: 'live', href: hrefOf(ctx, DEST[id].href), to: DEST[id].to, pre, num, post, ratio: ratio && proportion(ratio) };
}

/**
 * A PART OF A WHOLE, OR NOTHING.
 *
 * Four of the six cards state a real proportion and three of them bury it in
 * the sentence: 1,341 of 1,880 datacentres in drought, 2 of 15 leaders on the
 * record, items carried by a second source. Those get a bar. The camera count
 * has no denominator — 115,608 cameras out of how many cameras is a question
 * this data cannot answer — and a median lag in days is not a part of anything,
 * so those two get NO bar rather than an invented one. That absence is the
 * point: a bar here always means a real ratio.
 *
 * The bar is never the only carrier. It prints its own figures underneath, so
 * the fact survives a stylesheet that never loads, a screen reader, and a
 * screenshot taken by somebody who cannot see colour.
 *
 * Throws rather than clamping. A part larger than its whole is a collector
 * bug, and a bar quietly pinned at 100% would hide it.
 */
function proportion({ part, whole, of }) {
  const a = Number(part);
  const b = Number(whole);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0 || a < 0 || a > b) {
    throw new Error(`_claims proportion(): need 0 <= part <= whole and whole > 0, got ${JSON.stringify({ part, whole })}`);
  }
  // Fixed precision, so the width is the same string on every build.
  return { pct: fixed((a / b) * 100, 1), part: a, whole: b, of: String(of) };
}

function dark(id, ctx, text) {
  return { id, state: 'dark', href: hrefOf(ctx, DEST[id].href), to: DEST[id].to, text };
}

// ---------------------------------------------------------------------------
// One builder per instrument. Each returns null (absent → omitted), a dark
// card, or a live card. Field names are the ones in data/*.json today; the
// guards are the same predicates the pages themselves use to decide whether
// they exist, restated here because importing a page module into a fold
// fragment would pull the whole page, its layout and its charts along.
// ---------------------------------------------------------------------------

/**
 * THE RACE. "Anthropic leads at 74.0%, Polymarket's live probability …"
 *
 * The number is the market's, not ours, and the sentence names the venue for
 * that reason: race.json's rank_basis.statement is explicit that this is the
 * market's ranking and feeds nothing. Dark when rank_basis.ok is false, when
 * no player carries rank 1, or when the leader's market leg is not live.
 */
function raceClaim(ctx) {
  const r = ctx && ctx.race;
  if (!r || !Array.isArray(r.players) || !r.players.length) return null;

  const rb = r.rank_basis;
  const lead = r.players
    .filter((p) => p && p.rank === 1)
    .sort((a, b) => cmp(a.id, b.id))[0] || null;
  const m = lead && lead.market;
  const p = m && m.state === 'live' ? Number(m.probability) : NaN;

  if (!(rb && rb.ok === true) || !lead || !Number.isFinite(p)) {
    return dark('race', ctx, 'The ranking market is dark this build, so there is no leader to print.');
  }

  const venue = rb.venue === 'polymarket' ? 'Polymarket' : String(rb.venue || 'the market');
  const end = (m.horizon_event && m.horizon_event.end_date) || (rb.event && rb.event.end_date) || '';
  const year = /^\d{4}/.test(String(end)) ? String(end).slice(0, 4) : null;
  const when = year ? ` at the end of ${year}` : '';

  return live('race', ctx,
    `${lead.name} leads at `,
    pct1(p),
    `, ${venue}’s live probability that it holds the best AI model${when}.`,
    { part: p, whole: 1, of: `${lead.name}’s share of the market’s probability` });
}

/**
 * THE CAMERAS. "115,608 Flock ALPR cameras as mapped in OpenStreetMap on …"
 *
 * The qualifier is the file's own (copy.headline_qualifier) and it is part of
 * the sentence, not a footnote: flock.json's never_say list bans "a national
 * total" and this is a count of what volunteers have mapped. Omitted when
 * ctx.routes.flock is false — build.mjs decided there is no /flock page this
 * build, and a card that links a 404 substantiates nothing.
 */
function flockClaim(ctx) {
  const f = ctx && ctx.flock;
  if (!f) return null;
  if (ctx.routes && ctx.routes.flock === false) return null;

  const total = f.totals ? Number(f.totals.mapped_worldwide) : NaN;
  const q = f.copy && f.copy.headline_qualifier ? String(f.copy.headline_qualifier) : null;
  if (!Number.isFinite(total) || !q) {
    return dark('flock', ctx, 'The OpenStreetMap camera count did not come back this run.');
  }

  return live('flock', ctx, '', N(total), ` Flock ALPR cameras ${q}.`);
}

/**
 * THE DATACENTRES. "1,877 US datacentres mapped, 1,350 of them in a county
 * in drought on the Drought Monitor map of 2026-09-22."
 *
 * "In drought" is _usmap.mjs's rule, re-derived rather than re-guessed: a
 * site whose county row carries a Drought Monitor headline category D0–D4.
 * The drought clause exists only while resources_index.usdm_state is live;
 * dark, and the sentence says the drought under the pins is unknown, because
 * with no map every county resolves to "no data" and "0 in drought" would be
 * a lie in the shape of a measurement (mapPage.mjs droughtFigure()).
 */
function datacentersClaim(ctx) {
  const d = ctx && ctx.datacenters;
  if (!d) return null;

  const sites = Array.isArray(d.sites) ? d.sites : null;
  const ri = d.resources_index;
  if (!sites || !sites.length || !ri) {
    return dark('datacenters', ctx, 'No datacentre roster came back this run.');
  }

  const n = sites.length;
  if (ri.usdm_state !== 'live') {
    return live('datacenters', ctx, '', N(n),
      ' US datacentres mapped; the drought under them is unknown this run because the US Drought Monitor is dark.');
  }

  const byCounty = ri.drought_by_county || {};
  let inDrought = 0;
  for (const s of sites) {
    const fips = (s && s.county_fips)
      || (s && s.resources && s.resources.drought && s.resources.drought.county_fips);
    const row = fips ? byCounty[fips] : null;
    const c = row && row.headline && row.headline.category;
    if (c && /^D[0-4]$/.test(String(c))) inDrought += 1;
  }
  const week = ri.usdm_map_date ? ` on the Drought Monitor map of ${ri.usdm_map_date}` : '';

  return live('datacenters', ctx, '', N(n),
    ` US datacentres mapped, ${N(inDrought)} of them in a county in drought${week}.`,
    { part: inDrought, whole: n, of: 'mapped datacentres sit in a county in drought' });
}

/**
 * THE EXPLOIT LAG. "A median of 8.5 days passed between a CVE's disclosure
 * and CISA cataloguing it as exploited in 2026, over 204 listings."
 *
 * The newest cohort of the FRESH series, never the naive one — exploits.json
 * carries the naive series to show that it is an artefact, and a fold card
 * is no place to print an artefact. n travels with the median because the
 * file's copy.n_requirement says it must. The phrase "time from disclosure to
 * exploitation" is on the file's never_say list and is not used: this is the
 * gap to CATALOGUING, which is a lag on a lag.
 */
function exploitsClaim(ctx) {
  const e = ctx && ctx.exploits;
  if (!e) return null;
  if (ctx.routes && ctx.routes.exploits === false) return null;

  const src = e.sources || {};
  const kevLive = Boolean(src.cisa_kev && src.cisa_kev.state === 'live');
  const nvdLive = Boolean(src.nvd && src.nvd.state === 'live');
  const rows = e.series && e.series.fresh_by_year && Array.isArray(e.series.fresh_by_year.rows)
    ? e.series.fresh_by_year.rows : [];
  const cohorts = rows
    .filter((r) => r && Number.isFinite(Number(r.median_days)) && Number.isFinite(Number(r.n)))
    .sort((a, b) => cmp(a.period, b.period));
  const latest = cohorts.length ? cohorts[cohorts.length - 1] : null;

  if (!kevLive || !nvdLive || !latest) {
    return dark('exploits', ctx, 'The CISA or NVD feed is dark this run, so there is no lag to print.');
  }

  return live('exploits', ctx,
    'A median of ',
    `${D(latest.median_days)} days`,
    ` passed between a CVE’s disclosure and CISA cataloguing it as exploited in ${latest.period}, over ${N(latest.n)} listings.`);
}

/**
 * THE NEWSROOM. "200 items scored across 14 live feeds, 6 of them carried by
 * two or more."
 *
 * Three counts over the file, no smoothing: items, sources in state live, and
 * items whose meta.corroboration.count is 2 or more. The corroboration clause
 * is dropped, not zeroed, when no item carries a count at all (an older
 * schema) — unknown is not none.
 */
function newsClaim(ctx) {
  const nw = ctx && ctx.news;
  if (!nw) return null;

  const items = Array.isArray(nw.items) ? nw.items : [];
  if (!items.length) return dark('news', ctx, 'No items were scored this run.');

  const sources = Array.isArray(nw.sources) ? nw.sources : [];
  const liveFeeds = sources.filter((s) => s && s.state === 'live').length;
  const counts = items
    .map((i) => i && i.meta && i.meta.corroboration ? Number(i.meta.corroboration.count) : NaN)
    .filter(Number.isFinite);
  const multi = counts.filter((c) => c >= 2).length;

  const feeds = sources.length ? ` across ${N(liveFeeds)} live feed${liveFeeds === 1 ? '' : 's'}` : '';
  const carried = counts.length
    ? `, ${multi ? N(multi) : 'none'} of them carried by two or more`
    : '';

  return live('news', ctx, '', N(items.length), ` items scored${feeds}${carried}.`,
    counts.length ? { part: multi, whole: counts.length, of: 'scored items were carried by two or more sources' } : null);
}

/**
 * THE ON-RECORD COUNT. "2 of 15 AI leaders on the record in the last 7 days,
 * in 3 headlines reproduced exactly as printed."
 *
 * The number is the fraction — "2 of 15" — because 2 alone is not a reading
 * and 15 is the roster, fixed by design (_leaderwire.mjs). The closing clause
 * is the wire's promise restated: nothing attributed to a named person on
 * this site is a quotation we wrote.
 */
function leadersClaim(ctx) {
  const L = ctx && ctx.leaders;
  if (!L) return null;

  const roster = Array.isArray(L.leaders) ? L.leaders : [];
  const t = L.totals;
  const on = t ? Number(t.on_record) : NaN;
  const total = t ? Number(t.leaders) : NaN;
  if (!roster.length || !Number.isFinite(on) || !Number.isFinite(total)) {
    return dark('leaders', ctx, 'The AI leaders feed did not come back this run.');
  }

  const days = Number(L.window_days);
  const lines = t ? Number(t.lines) : NaN;
  const window = Number.isFinite(days) ? ` in the last ${N(days)} day${days === 1 ? '' : 's'}` : '';
  const tail = Number.isFinite(lines) && lines > 0
    ? `, in ${N(lines)} headline${lines === 1 ? '' : 's'} reproduced exactly as printed.`
    : '.';

  return live('leaders', ctx, '', `${N(on)} of ${N(total)}`, ` AI leaders on the record${window}${tail}`,
    { part: on, whole: total, of: 'on the roster said something on the record' });
}

const BUILDERS = Object.freeze({
  race: raceClaim,
  flock: flockClaim,
  datacenters: datacentersClaim,
  exploits: exploitsClaim,
  news: newsClaim,
  leaders: leadersClaim,
});

// ---------------------------------------------------------------------------
// The model, and the page
// ---------------------------------------------------------------------------

/**
 * Every card this build can make, in CLAIM_ORDER. Exported so a harness or
 * the integrator can inspect the sentences without parsing markup.
 *
 * @param {object} ctx     build context (site/build.mjs).
 * @param {object} [opts]
 * @param {string[]} [opts.only]  ids to keep, in CLAIM_ORDER. Unknown ids are
 *                                ignored rather than thrown: a fold that lists
 *                                a card the build cannot make should simply
 *                                not show it.
 */
export function claims(ctx, { only = null } = {}) {
  const keep = Array.isArray(only) ? new Set(only) : null;
  const out = [];
  for (const id of CLAIM_ORDER) {
    if (keep && !keep.has(id)) continue;
    const card = BUILDERS[id](ctx);
    if (card) out.push(card);
  }
  return out;
}

/** build.mjs / index.mjs guard. */
export function hasClaims(ctx) {
  return claims(ctx).length > 0;
}

/** The plain sentence of a card, for a harness, a test or a <meta> line. */
export function sentenceOf(card) {
  return card.state === 'live' ? `${card.pre}${card.num}${card.post}` : card.text;
}

/**
 * The claim cards.
 *
 * @param {object} ctx  build context; reads ctx.race, ctx.flock,
 *                      ctx.datacenters, ctx.exploits, ctx.news, ctx.leaders,
 *                      ctx.routes and ctx.href. Any of the six may be absent.
 * @param {object} [opts]
 * @param {string|null} [opts.heading]  a visible <h2>; null (the default) for
 *                      none, with the region labelled directly instead. The
 *                      default is none because these sit in the fold, where
 *                      the research finding is that the number should have
 *                      nothing near it that reads as a legend.
 * @param {string[]} [opts.only]  see claims().
 * @returns {string} HTML fragment, or '' when no card can be made.
 */
export function render(ctx, { heading = null, only = null } = {}) {
  const cards = claims(ctx, { only });
  if (!cards.length) return '';

  const showHeading = heading !== null && heading !== undefined && String(heading).trim() !== '';
  const label = showHeading
    ? ' aria-labelledby="clm-h"'
    : ' aria-label="What the instruments read"';

  return `${styleTag()}
<section class="clm"${label} data-cards="${cards.length}">
  ${showHeading ? `<h2 class="sec__h" id="clm-h">${esc(String(heading))}</h2>` : ''}
  <ul class="clm__l">
${cards.map(card).join('\n')}
  </ul>
</section>`;
}

/**
 * One card. The anchor IS the card; its accessible name is computed from
 * content, and the only content that is not hidden from assistive technology
 * is the sentence — so the name is the sentence, exactly as the brief asks.
 * The tail naming the destination page is aria-hidden: it is a visual
 * affordance, and a screen reader already announces the element as a link.
 *
 * The number is an inline-block on purpose. CSS text decoration does not
 * propagate into inline-block descendants, so the sentence keeps the
 * document's default link underline (site/styles.mjs: links are underlined
 * unless they carry their own box) while the 28–40px numeral is not struck
 * through by a 1px hairline three pixels under its baseline. Nothing here
 * switches the underline off.
 */
function card(c) {
  const body = c.state === 'live' ? liveBody(c) : `<b class="clm__k">Source dark</b> ${esc(c.text)}`;
  return `    <li class="clm__i" data-claim="${esc(c.id)}" data-state="${esc(c.state)}">
      <a class="clm__a" href="${esc(c.href)}">
        <span class="clm__s">${body}</span>
        ${c.ratio ? bar(c.ratio) : ''}
        <span class="clm__to" aria-hidden="true">${esc(c.to)} →</span>
      </a>
    </li>`;
}

/**
 * The proportion, drawn and then stated. The track is the whole, the fill is
 * the part, and the line underneath carries both figures and the percentage —
 * so the bar adds a shape to a fact that is already in words and never becomes
 * the only place the fact lives.
 */
function bar(r) {
  const counts = r.whole === 1
    ? `${r.pct}% ${r.of}`
    : `${N(r.part)} of ${N(r.whole)} ${r.of} — ${r.pct}%`;
  return `<span class="clm__pr">
          <span class="clm__prb" aria-hidden="true"><i style="width:${r.pct}%"></i></span>
          <span class="clm__prl">${esc(counts)}</span>
        </span>`;
}

/**
 * The live sentence with its numeral set large.
 *
 * Whatever follows the numeral without a space — a comma, a full stop — is
 * glued to it in a no-wrap span. Measured in Chrome at the 908px measure:
 * "Anthropic leads at 74.0%" filled a line and the browser opened the next
 * one with ", Polymarket's", because an atomic inline offers a break after
 * itself that a plain word does not. A line beginning with a comma is a
 * typesetting error, so the numeral and its punctuation are one unbreakable
 * unit and the break falls after the punctuation instead.
 */
function liveBody(c) {
  const m = String(c.post).match(/^(\S*)([\s\S]*)$/);
  const glued = m ? m[1] : '';
  const rest = m ? m[2] : String(c.post);
  return `${esc(c.pre)}<span class="clm__g"><b class="clm__n">${esc(c.num)}</b>${esc(glued)}</span>${esc(rest)}`;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
//
// Namespaced under .clm*, shipped inside the fragment, so the module can be
// added to or removed from a page without touching site/styles.mjs, which the
// integrator owns. Every colour is a token from that sheet and every size is
// a step from its scale, except the one display size below, which is bound to
// one element and explained there.
const clmCss = `
/* THE PROPORTION BAR. A track at the card's full width, a fill at the ratio,
   and the figures under it. --accent-2 is the interactive hue in the house
   sheet and reads on both themes; the fill is never the only carrier, because
   the line under it prints the part, the whole and the percentage as text. */
.clm__pr { display: block; margin: var(--s-2) 0 0; }
.clm__prb {
  display: block; height: 5px; border-radius: 3px;
  background: var(--bg-sunken); border: 1px solid var(--rule-soft, var(--rule));
  overflow: hidden;
}
.clm__prb i { display: block; height: 100%; background: var(--accent-2); }
.clm__prl {
  display: block; margin-top: 5px;
  font: 400 var(--t-2xs)/1.35 var(--mono); color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}
.clm { margin: var(--s-5) 0 0; }
.clm .sec__h { margin-bottom: var(--s-3); }

/* Equal-width cards that wrap. auto-fill keeps the column count fixed across
   the row, so a fourth card under three is the same width as the three, not
   a full-width bar. 268px is the narrowest width at which the longest live
   sentence (the exploits card, ~130 characters) holds to five lines at the
   secondary size; 343px of content at 375px yields one column, 568px at 600
   yields two, the 908px homepage measure yields three. */
.clm__l {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: var(--s-2);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 268px), 1fr));
}
/* SIX CARDS, THREE ACROSS. auto-fill at 268px yields four columns on a
   1,208px column and leaves the second row two cards and two thirds empty -
   measured, and visibly lopsided. Six is two rows of three. Below 1080px the
   auto-fill rule above still governs and the cards wrap as they did. */
@media (min-width: 1080px) { .clm__l { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

.clm__i { min-width: 0; }
/* EACH CARD IN ITS DESTINATION'S COLOUR - the same hue as the nav tile it
   links to, on the top edge and in the proportion bar. The sentence and its
   numeral stay ink, so the colour is a signpost and never the message. */
.clm__i[data-claim="race"] { --ch: #00e676; }
.clm__i[data-claim="flock"] { --ch: #00e5ff; }
.clm__i[data-claim="datacenters"] { --ch: #c400ff; }
.clm__i[data-claim="exploits"] { --ch: #8b5cf6; }
.clm__i[data-claim="news"] { --ch: #00a3ff; }
.clm__i[data-claim="leaders"] { --ch: #ff0033; }
.clm__i .clm__a { border-top: 2px solid var(--ch, var(--rule)); }
.clm__i .clm__prb i { background: var(--ch, var(--accent-2)); }
.clm__i .clm__a:hover { box-shadow: 0 0 0 1px var(--ch, var(--accent-2)), 0 6px 22px color-mix(in srgb, var(--ch, transparent) 22%, transparent); }
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) .clm__i .clm__prb i { filter: brightness(.74) saturate(1.3); }
}
:root[data-theme="light"] .clm__i .clm__prb i { filter: brightness(.74) saturate(1.3); }

/* The card is the link. Border, raised ground and a shadow: the same boxed
   affordance as the cross-sell deck (.xsell__a), which is what the sheet's
   own comment on links calls "unmistakably pressable". The sentence keeps its
   underline on top of that — see card() — so a phone, which has no hover,
   still gets two static signals. The underline is drawn in --rule rather than
   the document's --ink-faint because it runs under three or four lines of
   prose inside a box that is already a link; hover lifts it to --ink-faint. */
.clm__a {
  position: relative;
  display: flex; flex-direction: column; justify-content: space-between; gap: var(--s-3);
  height: 100%; box-sizing: border-box;
  padding: var(--s-4) var(--s-4) var(--s-3);
  background: var(--bg-raised);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  color: inherit;
  text-decoration-color: var(--rule);
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}
.clm__a:hover { border-color: var(--accent-2); box-shadow: var(--shadow-2); text-decoration-color: var(--ink-faint); }
.clm__a:hover .clm__to { color: var(--accent-2); }
/* The document ring squares its corners to 2px; this box is 12px. */
.clm__a:focus-visible { border-radius: var(--radius-lg); }

/* THE SENTENCE. Secondary prose size in --ink-dim — the number, not the
   prose, is what the eye lands on, and the sheet's argument is that
   de-emphasis comes from size and weight, never from ink too pale to read. */
.clm__s {
  display: block; margin: 0;
  font-family: var(--sans); font-size: var(--t-sm); line-height: 1.45;
  color: var(--ink-dim); text-wrap: pretty; overflow-wrap: anywhere;
}

/* THE NUMBER. The one display size in this module, bound to this element and
   to nothing else (site/styles.mjs: "a clamp is not a step"). 28px at 375px,
   where the h1 above it is 30px and must stay the largest thing on the page;
   40px from ~1330px up. Against the 14.5px sentence that is 1.9x to 2.8x —
   the research band is 2.5x–3.5x and the floor here is set by the h1, not by
   taste. Same face and weight as .hero__headline so the cards read as the
   headline's children rather than as a second family of telemetry.

   inline-block is load-bearing, not cosmetic: it is what keeps the document
   link underline off the numeral without switching the underline off. */
/* The numeral plus whatever punctuation follows it, unbreakable — liveBody(). */
.clm__g { white-space: nowrap; }
.clm__n {
  display: inline-block; vertical-align: baseline;
  font-family: var(--sans); font-weight: 650;
  font-size: clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem);
  line-height: 1; letter-spacing: -0.02em;
  color: var(--ink);
  font-variant-numeric: lining-nums;
  margin: 0 0.06em 0 0;
}

/* THE DARK WORD. A source that did not answer is carried by the words
   "Source dark" in the sentence, by a dashed border on the card and by the
   absence of a numeral. The colour is confirmation of all three, and it is
   --dark-src, the same token every source-state chip on the site uses. */
.clm__k {
  font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--dark-src);
}
.clm__i[data-state="dark"] .clm__a { border-style: dashed; background: none; box-shadow: none; }
.clm__i[data-state="dark"] .clm__s { color: var(--ink-dim); }

/* The tail: where the card goes, in the word the nav uses for that page. */
.clm__to {
  font-family: var(--mono); font-size: var(--t-2xs); font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-faint);
  transition: color 120ms ease;
}

@media (prefers-reduced-motion: no-preference) {
  .clm__a:hover { transform: translateY(-1px); }
}
`;

/** All CSS the cards need. Safe to inline more than once. */
export function claimsCss() {
  return clmCss;
}

/** Everything the markup needs before its first tag. */
export function styleTag() {
  return `<style>${clmCss}</style>`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  nothing. Every field this module reads — ctx.race, ctx.flock,
//               ctx.datacenters, ctx.exploits, ctx.news, ctx.leaders,
//               ctx.routes, ctx.href — is already on ctx.
//
//   index.mjs:  import * as claims from './_claims.mjs';
//               ...and drop `${claims.render(ctx)}` into main, directly under
//               the hero and above the oven rail. The hero says what the
//               index reads; this row says, in six sentences, what the other
//               instruments read, and it is the newcomer's map of the site.
//               Pass { heading: 'The readings' } for a visible <h2>, or
//               { only: ['race', 'flock', 'datacenters', 'exploits'] } to
//               hold the row to one screen-row of four.
//
// render(ctx) returns '' when none of the six ctx fields is present, and each
// card is independent: a build with only news.json on disk renders one card.
// Wiring the call before any collector has run is safe and changes nothing.
//
// MEASURED HEIGHT, because the integrator owns the fold. Six live cards from
// the 2026-09-26 data: one column at 375px, ~118px per card, so the row is
// about 730px tall on a phone and belongs BELOW the hero, never above it. At
// the 908px homepage measure it is three columns and two rows, about 250px.
// { only: [...four ids] } at 1140px+ is one row.
// ---------------------------------------------------------------------------
