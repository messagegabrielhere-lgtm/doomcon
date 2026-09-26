// The desk — one slot, several datasets, no navigation.
//
// This is the single structural mechanism behind pizzint's session length, and
// docs/ENGAGEMENT.md §1.2 measured it precisely: seven 48px tiles under their
// index, each swapping a DIFFERENT dataset into the same slot with no page
// load. Not skins — HormuzHub is a vector map and a stacked area chart, the
// Commute Index is a whole second scalar with its own corridor table. We shipped
// zero of these and reached the same destinations through link cards at 84%
// scroll depth, which is the placement nobody reaches.
//
// -------------------------------------------------------------------------
// THE MARKUP, AND WHY IT CARRIES TWO NAMES FOR FOUR ELEMENTS.
//
// site/styles.mjs belongs to the integrator and also paints this control. Over
// the course of this round its published contract named those four elements two
// different ways — `.sw__in / .sw__tab / .sw__tk / .sw__panel` in one revision
// and `.sw__r / .sw__t / .sw__tl / .sw__p` in another — and the brief forbids
// renaming a class another template emits. So each of those four elements
// carries BOTH names, and whichever revision of that sheet ships, its selectors
// match. It costs about forty bytes and it removes an entire class of silent
// breakage between two files being written at the same time.
//
// For the same reason THIS MODULE IS SELF-SUFFICIENT. Its own <style> declares
// the complete control: the off-screen radios, the tab strip, the selected
// state, the single-cell panel stack and the reveal rules. It is emitted inside
// <main>, so a `.sw <thing>` rule in the head sheet — one specificity step up,
// which is how that file is written — still wins and still refines the frame.
// The control therefore works with that sheet, without it, and with either of
// its vocabularies. A switcher whose panels do not switch because two files
// disagreed is worse than no switcher.
//
//   <section class="sw" aria-labelledby="sw-h">
//     <div class="sw__hd"><h2 class="sec__h" id="sw-h">The desk</h2><p class="sw__k">…</p></div>
//     <input class="sw__in sw__r" type="radio" name="sw" id="sw-signal" checked>  … one per panel, ALL FIRST
//     <div class="sw__tabs" role="radiogroup">
//       <label class="sw__tab sw__t" id="sw-t-signal" for="sw-signal" data-state="live">
//         <i class="sw__tg" aria-hidden="true">◆</i>
//         <span class="sw__tk sw__tl">Signal</span>
//         <b class="sw__tn num">200</b>
//       </label>                                                   … same order as the radios
//     </div>
//     <div class="sw__panels">
//       <article class="sw__panel sw__p" data-panel="signal" aria-labelledby="sw-t-signal">
//         <div class="sw__head"><h3 class="sw__ph">…</h3><span class="sw__pm">…</span></div>
//         <div class="sw__body">…</div>
//         <a class="sw__more" href="…">…</a>
//       </article>                                                 … same order again
//     </div>
//   </section>
//
// THE ORDER IS PART OF THE WIRING. Our own reveal rules are keyed on the radio
// ids, so they survive reordering — but the head sheet has at times bound panel
// N to radio N by :nth-of-type, and under that binding a stray element inside
// .sw__tabs or .sw__panels shifts every dataset one tab to the left, silently,
// with no error anywhere. So the labels are the only children of the strip and
// the articles are the only children of the stack, and the test asserts it.
//
// EVERY PANEL SHARES ONE GRID CELL. That is the whole of "no layout shift when
// switching": the five panels run 617px to 1,920px tall, so with display:none
// the page grew and shrank by roughly 1,300px under the reader's thumb on every
// press. Stacked in one named area they overlap, the well is always as tall as
// the TALLEST panel, and nothing below the control moves. Hidden panels are
// `visibility:hidden`, never `display:none`: a display:none box has no height
// to stack against, visibility still takes the links out of the tab order and
// the text out of the accessibility tree, and a laid-out panel lets the card
// reel inside it measure itself instead of appearing at zero width.
//
// grid-template-columns IS NOT COSMETIC. An auto track is sized by its items'
// content, and the signal panel holds the card reel, whose content width is
// eight 300px cards: the panel resolved to 2,410px inside a 375px viewport and
// every line of text in it ran off the right edge. Measured in a browser at
// 375x812, which is the only way it could have been found. minmax(0, 1fr) on
// the track and min-width:0 on the item are the two halves of the fix.
//
// -------------------------------------------------------------------------
// Three rules this file exists to hold, from docs/MOTION.md §0 and
// docs/VISITORS.md §5:
//
//   1. EVERY PANEL IS IN THE STATIC HTML. Not fetched, not hydrated, not lazy.
//      A crawler reads all of them, a screenshot taken before any script runs
//      shows the default one complete, and the page works with JavaScript
//      disabled. pizzint's equivalent slot is client-rendered and their
//      prerendered HTML says LOADING TACTICAL DATA. That is the failure we beat
//      them on and we do not get to reintroduce it.
//
//   2. NO JAVASCRIPT AT ALL. Real radios and real labels. Native radios give us
//      arrow-key navigation, one tab stop for the whole group, correct
//      screen-reader announcement ("SIGNAL 200, radio button, 1 of 5, checked")
//      and back/forward restore for free.
//
//      Still exactly true of the CONTROL, and worth restating now that one
//      does exist further down the page: _reel.mjs ships a small script with
//      the card rail, and the rail lives inside the SIGNAL panel, so a script
//      tag is now nested inside this section. It adds a live age, two scroll
//      buttons and a position readout to a rail that already scrolls; it never
//      touches a radio, a label, a panel or this file's markup. Switching
//      datasets is CSS and stays CSS.
//
//   3. EVERY TAB CARRIES A LIVE COUNT, and every panel carries its own stamp
//      and its own source states. "SIGNAL" is a label; "SIGNAL 200" is a
//      reason to press it. A dark panel says so on itself rather than borrowing
//      the index's health — the single most common question about an in-place
//      switcher is whether the thing you just switched to is as fresh as the
//      thing you switched from, and pizzint's seven panels answer it zero times.

import { esc, num, signed, utc, utcDay, duration } from './_html.mjs';
import * as leaderwire from './_leaderwire.mjs';
import { readNews, reel, newsSourceStrip } from './_reel.mjs';
import { liveHead, legend, feedRow } from './news.mjs';
import * as labs from './_labs.mjs';
import * as xwire from './_xwire.mjs';
import * as brand from '../brand.mjs';

// ---------------------------------------------------------------------------
// ONE IDENTITY HUE PER DATASET.
//
// docs/ENGAGEMENT.md's read on why the competitor feels like an instrument and
// we feel like a report is that they commit to colour. Eight tabs in one
// greyscale strip is a menu; eight tabs each carrying its own hue is a console.
//
// THREE RULES THIS TABLE OBEYS.
//
//  1. NO PANEL MAY BE AMBER. --accent is spent on exactly one thing on this
//     site, which is the live value of the thing you are looking at, and the
//     control already uses it that way: the OPEN tab's figure goes amber and
//     its cap goes amber. If a closed tab were amber too, the one signal that
//     says "this is the one you are on" would be the one signal that does not
//     change. So every value below is a non-amber token.
//
//  2. EVERY VALUE IS AN EXISTING TOKEN, so both themes are already solved and
//     there is no second palette to keep in sync. site/styles.mjs promoted
//     --pill-<id> to :root for exactly this reason, and --heat-5…--heat-1 have
//     carried two themes since they were introduced.
//
//  3. ALL EIGHT WERE MEASURED AS TEXT, in both themes, against all three
//     grounds a tab figure can sit on (--bg desktop, --bg-raised phone,
//     --bg-sunken open). Worst of the forty-eight readings: 4.85:1
//     (--pill-markets on light --bg-sunken). Best: 10.32:1. The sheet records a
//     round that shipped 88 AA failures and this table is not allowed to be
//     the next one.
//
// Hue is never the only signal and never the state: the open tab is also
// filled onto the panel ground, also 700 weight, also capped in amber, and
// also reports `checked`. Desaturate the page and nothing is lost.
// ---------------------------------------------------------------------------
const PANEL_HUE = {
  signal: 'var(--heat-1)',
  race: 'var(--pill-markets)',
  floor: 'var(--pill-capability)',
  wire: 'var(--pill-compute)',
  substrate: 'var(--heat-5)',
  digest: 'var(--heat-2)',
  leaders: 'var(--pill-governance)',
  // The eighth. Seven distinct non-amber tokens exist and there are eight
  // panels, so this one is mixed rather than repeated — in srgb, which is the
  // space the contrast above was measured in. 9.26:1 dark, 6.04:1 light.
  bliss: 'color-mix(in srgb, var(--heat-4) 62%, var(--heat-5))',
};

// How many rows the ranked feed carries inside the panel. Every panel shares
// one grid cell, so the tallest panel sets the frame height for all of them —
// this number is a budget, not a claim about how much we hold, and the archive
// link under it names the full count.
const FEED_ROWS = 10;

// The recency rail. Eight cards, newest first — deliberately NOT the eight
// highest-scoring items, because those are rows 01-08 of the feed directly
// underneath and docs/VISITORS.md §5.1 measured that duplication at roughly two
// mobile screens. Two objects answering the same question is one object and a
// waste; two objects answering different questions is a dashboard.
const RAIL_CARDS = 8;

const RACE_ROWS = 8;
const WIRE_CARDS = 6;
const DIGEST_ROWS = 6;

// ---------------------------------------------------------------------------
// Small formatters. Local rather than imported so this module can be dropped
// into another page without dragging racePage's whole vocabulary with it.
// ---------------------------------------------------------------------------

function pct(p, places = 1) {
  return Number.isFinite(p) ? `${(p * 100).toFixed(places)}%` : null;
}

function money(n) {
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function clock(iso) {
  return Number.isFinite(Date.parse(iso)) ? `${String(iso).slice(11, 16)}Z` : null;
}

/** Arrow plus word. Never the arrow alone — colour and glyph both fail. */
function moveChip(delta, unit) {
  if (!Number.isFinite(delta)) return '';
  const glyph = delta > 0 ? '▲' : delta < 0 ? '▼' : '◆';
  const word = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return `<span class="sw__mv"><span aria-hidden="true">${glyph}</span>` +
    `<b class="num">${esc(signed(delta, 1))}</b>` +
    `<span class="sw__mvu">${esc(unit)}</span>` +
    `<span class="vh">${esc(word)}</span></span>`;
}

/**
 * THE HEADLINE ROW. Every panel opens with one.
 *
 * The brief for this round: "a panel that is a wall of text is a dead tab".
 * Before it, five of the eight panels opened with a 70ch paragraph, so pressing
 * a tab was rewarded with homework. Now pressing a tab is rewarded with three
 * or four large figures, the visual comes second and the paragraph comes third
 * — which is also the order a reader actually consumes them in.
 *
 * `value: null` IS THE POINT OF THIS HELPER. It prints the cell's own `none`
 * word — "no reading", "awaiting baseline", "no prior run" — and it is the only
 * way to render a missing figure here. There is no code path in this function
 * that can turn an unknown into a 0, which is the site's oldest rule and the
 * one an eye-catching dashboard is most likely to break.
 */
function statRow(stats) {
  const cells = stats.filter(Boolean).map((s) => {
    const known = s.value !== null && s.value !== undefined && s.value !== '';
    const body = known
      ? `<b class="sw__sv num">${esc(s.value)}</b>${s.unit ? `<span class="sw__su">${esc(s.unit)}</span>` : ''}`
      : `<b class="sw__sv sw__sv--none">${esc(s.none || 'unknown')}</b>`;
    return `<div class="sw__stat"${s.title ? ` title="${esc(s.title)}"` : ''}${
      s.pillar ? ` data-pillar="${esc(s.pillar)}"` : ''}>` +
      `<span class="sw__sk">${esc(s.k)}</span><span class="sw__sb">${body}</span></div>`;
  }).join('');
  return cells ? `<div class="sw__stats">${cells}</div>` : '';
}

/**
 * A 0→1 meter. An unknown fraction draws the empty track with a dashed edge
 * rather than a zero-width fill, because a zero-width fill and a zero reading
 * are the same picture and they are not the same fact.
 */
function meter(fraction) {
  if (!Number.isFinite(fraction)) return '<span class="sw__meter" data-none="1" aria-hidden="true"></span>';
  const w = Math.max(0, Math.min(100, fraction * 100));
  return `<span class="sw__meter" aria-hidden="true"><i style="width:${w.toFixed(2)}%"></i></span>`;
}

/**
 * A signed bar drawn out from a centre line, so "which way" is a direction on
 * the screen rather than a glyph you have to read. `scale` is the half-width
 * in data units and is stated in the caption wherever this is used, because a
 * bar with an unstated scale is a decoration.
 */
function deltaBar(delta, scale) {
  if (!Number.isFinite(delta) || !Number.isFinite(scale) || scale <= 0) {
    return '<span class="sw__db" data-none="1" aria-hidden="true"></span>';
  }
  const d = Math.max(-1, Math.min(1, delta / scale));
  const w = Math.max(Math.abs(d) * 50, d === 0 ? 0 : 0.7);
  const left = d < 0 ? 50 - w : 50;
  const dir = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  return `<span class="sw__db" data-dir="${dir}" aria-hidden="true">` +
    `<i style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%"></i></span>`;
}

/**
 * A fourteen-row table is a database dump; the sentence above it is the
 * finding. docs/VISITORS.md §5.3 asked for exactly this trade and it is the
 * honest one: nothing is deleted, the rows are one press away, and the reader
 * who only wanted to know whether the instrument is healthy has an answer in
 * one line.
 */
function sourceDetails(strip, summary) {
  return `<details class="sw__src">
    <summary>${esc(summary)}</summary>
    <div class="sw__srcin">${strip}</div>
  </details>`;
}

// ---------------------------------------------------------------------------
// WHAT MOVED — the band above the tabs, and the answer to "why come back".
//
// docs/ENGAGEMENT.md §2.1 grepped all twenty-six of the competitor's shipped
// JavaScript chunks and found no visit state of any kind: "a returning visitor
// gets the same page a first-time visitor gets". §2.2 calls that an open goal
// and says we are structurally better placed to take it than anyone, because
// we already publish a stable observation log.
//
// layout.mjs's `.rvisit` bar takes half of it — the reader's OWN last visit,
// from localStorage, which is a different fact and needs a browser. This band
// takes the other half and needs no browser at all: what the INSTRUMENT did
// between its last two observations, server-rendered, in the HTML, in the
// screenshot, and true for every reader including the first-time one.
//
// THE TWO THINGS THIS MUST NOT DO.
//
//   A pillar with no reading must never print as a zero. `data/digest.json`
//   already carries a `state` per pillar for exactly this reason and it is
//   carried through untouched; the history fallback derives the same three
//   states from a null on either side of the difference. `markets` is null on
//   the committed run, so this is the live case and not a hypothetical.
//
//   A difference needs two observations. On the first run of a new deployment
//   there is exactly one, and the band is then absent entirely rather than
//   rendering five flat bars — five flat bars is a picture of a calm hour, and
//   a calm hour is not the same fact as no hour.
// ---------------------------------------------------------------------------

function pillarName(id) {
  try {
    return brand.pillarMeta(id).name;
  } catch {
    return id;
  }
}

function movedModel(ctx) {
  const wc = ctx && ctx.digest && ctx.digest.what_changed;
  const sp = wc && wc.since_previous;

  let pillars = null;
  let levelFrom = null;
  let levelTo = null;
  let source = null;

  if (sp && Array.isArray(sp.pillars) && sp.pillars.length) {
    pillars = sp.pillars.map((p) => ({
      id: String(p.id),
      name: p.name || pillarName(p.id),
      // `state` is the collector's word and it is the one that decides whether
      // a number may be printed. Anything that is not "live" prints its state.
      state: p.state || (Number.isFinite(p.delta) ? 'live' : 'unknown'),
      delta: Number.isFinite(p.delta) ? p.delta : null,
      from: Number.isFinite(p.from) ? p.from : null,
      to: Number.isFinite(p.to) ? p.to : null,
    }));
    levelFrom = Number.isFinite(sp.level_from) ? sp.level_from : null;
    levelTo = Number.isFinite(sp.level_to) ? sp.level_to : null;
    source = 'digest';
  }

  // The fallback path, used when digest.json is absent or half-written. It
  // reads the same append-only log build.mjs already parses, so the two can
  // only ever agree.
  const hist = Array.isArray(ctx && ctx.history) ? ctx.history : [];
  const now = hist.length ? hist[hist.length - 1] : null;
  const prior = hist.length >= 2 ? hist[hist.length - 2] : null;

  if (!pillars && now && prior && now.pillars && prior.pillars) {
    const ids = Object.keys(now.pillars);
    pillars = ids.map((id) => {
      const a = prior.pillars[id];
      const b = now.pillars[id];
      const live = Number.isFinite(a) && Number.isFinite(b);
      return {
        id,
        name: pillarName(id),
        state: live ? 'live' : 'awaiting-baseline',
        delta: live ? b - a : null,
        from: Number.isFinite(a) ? a : null,
        to: Number.isFinite(b) ? b : null,
      };
    });
    levelFrom = Number.isFinite(prior.level) ? prior.level : null;
    levelTo = Number.isFinite(now.level) ? now.level : null;
    source = 'history';
  }

  if (!pillars || !pillars.length) return null;
  if (!now || !prior) return null;

  const live = pillars.filter((p) => p.state === 'live' && Number.isFinite(p.delta));
  let biggest = null;
  for (const p of live) {
    if (!biggest || Math.abs(p.delta) > Math.abs(biggest.delta)) biggest = p;
  }

  const scoreFrom = Number.isFinite(prior.score) ? prior.score : null;
  const scoreTo = Number.isFinite(now.score) ? now.score : null;

  return {
    source,
    at: now.generated_at,
    priorAt: prior.generated_at,
    pillars,
    biggest,
    levelFrom,
    levelTo,
    levelChanged: levelFrom !== null && levelTo !== null && levelFrom !== levelTo,
    scoreFrom,
    scoreTo,
    scoreDelta: scoreFrom !== null && scoreTo !== null ? scoreTo - scoreFrom : null,
    liveCount: live.length,
    total: pillars.length,
  };
}

const STATE_WORD = {
  live: null,
  'awaiting-baseline': 'no baseline',
  dark: 'dark',
  unknown: 'unknown',
};

function movedBand(m) {
  if (!m) return '';

  // The half-width of every bar in this band, in index points. Taken from the
  // largest live move so a quiet hour still draws something legible, floored so
  // a 0.004 move cannot be magnified into a wall. Printed in the caption,
  // because a bar whose scale is not stated is a decoration.
  const biggestAbs = m.pillars.reduce(
    (a, p) => (Number.isFinite(p.delta) ? Math.max(a, Math.abs(p.delta)) : a), 0);
  const scale = Math.max(0.5, Math.ceil(biggestAbs * 2) / 2);

  const chips = m.pillars.map((p) => {
    const word = STATE_WORD[p.state] || p.state;
    const val = p.state === 'live' && Number.isFinite(p.delta)
      ? `<b class="sw__mdv num" data-dir="${p.delta > 0 ? 'up' : p.delta < 0 ? 'down' : 'flat'}">${esc(signed(p.delta, 2))}</b>`
      : `<b class="sw__mdv sw__mdv--none">${esc(word)}</b>`;
    const reading = p.state === 'live' && Number.isFinite(p.from) && Number.isFinite(p.to)
      ? `${num(p.from, 2)} → ${num(p.to, 2)} of 100`
      : `${p.name}: no score on one side of this difference, so no difference is shown`;
    return `<li class="sw__md" data-pillar="${esc(p.id)}" data-state="${esc(p.state)}" title="${esc(reading)}">
      <span class="sw__mdk">${esc(p.name)}</span>
      ${deltaBar(p.state === 'live' ? p.delta : NaN, scale)}
      ${val}
    </li>`;
  }).join('');

  const span = duration(Math.max(0, (Date.parse(m.at) - Date.parse(m.priorAt)) / 1000));

  const level = m.levelTo === null
    ? ''
    : m.levelChanged
      ? `<span class="sw__mlvl" data-changed="1">DOOMCON ${esc(m.levelFrom)} &rarr; ${esc(m.levelTo)}</span>`
      : `<span class="sw__mlvl">level held at DOOMCON ${esc(m.levelTo)}</span>`;

  const score = m.scoreDelta === null
    ? ''
    : `<span class="sw__msc"><b class="num" data-dir="${m.scoreDelta > 0 ? 'up' : m.scoreDelta < 0 ? 'down' : 'flat'}">${
        esc(signed(m.scoreDelta, 2))}</b><span class="sw__msu">index, ${esc(num(m.scoreTo, 2))} of 100</span></span>`;

  const lead = m.biggest
    ? `${m.biggest.name} moved furthest, ${signed(m.biggest.delta, 2)} points.`
    : 'No pillar carried a live score on both sides of this difference, so nothing is named as the mover.';
  const quiet = m.liveCount < m.total
    ? ` ${m.total - m.liveCount} of ${m.total} pillars had no score to difference and print their state instead of a zero.`
    : '';

  return `<section class="sw__moved" aria-labelledby="sw-moved-h">
  <div class="sw__mhd">
    <h3 class="sw__mh" id="sw-moved-h">What moved</h3>
    <p class="sw__mk">last two observations &middot; ${esc(span)} apart &middot; ${esc(String(m.priorAt).slice(11, 16))}Z &rarr; ${esc(String(m.at).slice(11, 16))}Z</p>
  </div>
  <div class="sw__mtop">${score}${level}</div>
  <ul class="sw__mds">${chips}</ul>
  <p class="nkey">Bars run to &plusmn;${esc(num(scale, 2))} index points from the centre line. ${esc(lead)}${esc(quiet)}</p>
</section>`;
}

/**
 * How many items were published after the previous observation. Null, never
 * zero, when there is no previous observation to be "since" — the count and
 * the absence of a reference point are different facts and the tab renders
 * them differently.
 */
function newSince(news, priorAt) {
  if (!news || !Number.isFinite(Date.parse(priorAt))) return null;
  const cut = Date.parse(priorAt);
  return news.items.filter((it) => Date.parse(it.published_at) > cut).length;
}

// ---------------------------------------------------------------------------
// Panel: SIGNAL
// ---------------------------------------------------------------------------

/**
 * The newsroom, in two objects that do different jobs.
 *
 * LATEST is the eight newest items in the window, in publication order. THE
 * RANKED FEED is the highest-scoring ten. Before this round the rail was the
 * feed's own top eight re-clothed as cards: same items, same order, same
 * scores, about two mobile screens of verbatim duplication (docs/VISITORS.md
 * §5.1). Recency is the one ordering the score cannot produce — on the live
 * data the top item by score is over three hours older than the newest item on
 * the page, and seven of the eight cards do not appear in the feed's top eight
 * at all — so the rail now carries information the feed does not.
 *
 * The watermark numeral on each card is therefore the RECENCY position, 01 for
 * the newest, and the caption under it says so. A numeral that means rank-by-
 * score on /news.html and rank-by-time here would be worse than no numeral.
 */
function signalPanel(ctx, news, nnew) {
  const archive = ctx.href('/news.html');

  if (!news.items.length) {
    return `<p class="lede">No items in the collection window. This is a measured zero, not an outage:
       the per-source strip below says which feeds answered and which did not.</p>
    ${sourceDetails(newsSourceStrip(news.sources), newsSourceSentence(news.sources))}`;
  }

  // Newest first. Ties break on id so two builds from identical inputs emit
  // identical bytes (CONTRACT.md hard constraint 4).
  const newest = news.items.slice().sort((a, b) => {
    const ta = Date.parse(a.published_at);
    const tb = Date.parse(b.published_at);
    if (tb !== ta) return tb - ta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }).slice(0, RAIL_CARDS);

  // Shallow copies. The normalised item's rankLabel is its rank by SCORE, and
  // printing 47 as the watermark on a rail ordered by time would be a numeral
  // that means nothing where it sits. The originals are untouched, so the feed
  // below still prints true score ranks.
  const railItems = newest.map((it, i) => ({ ...it, rankLabel: String(i + 1).padStart(2, '0') }));

  const rows = news.items.slice(0, FEED_ROWS);
  const oldestOnRail = newest[newest.length - 1];
  const spread = oldestOnRail
    ? duration(Math.max(0, (Date.parse(news.generated_at) - Date.parse(oldestOnRail.published_at)) / 1000))
    : null;

  const liveFeeds = news.sources.filter((s) => s.status === 'ok').length;
  const newestAge = newest0(news);

  return `
${statRow([
  { k: 'in window', value: news.total, unit: 'items', title: `${news.total} scored items in the collection window` },
  {
    k: 'new since last obs.',
    value: Number.isFinite(nnew) ? nnew : null,
    none: 'no prior run',
    title: Number.isFinite(nnew)
      ? `${nnew} of these were published after the previous observation`
      : 'There is only one observation in the log, so there is nothing to be "since".',
  },
  { k: 'feeds carrying', value: news.sources.length ? `${liveFeeds}/${news.sources.length}` : null, none: 'unreported' },
  { k: 'newest item', value: newestAge, unit: 'old at compile', none: 'unknown' },
])}
<p class="sw__lede">Two orderings of the same ${esc(news.total)} items, kept because they disagree.
   The rail is the newest eight in publication order. The list under it is the highest-scoring
   ${esc(rows.length)}. Which stories lead one and not the other is itself the reading.</p>

${reel(railItems, { id: 'sw-latest', limit: RAIL_CARDS, heading: 'Latest eight', href: archive, total: news.total })}
<p class="nkey">Ordered by publication time, newest first — <b>not</b> by score. The numeral on each card
   is its position on this rail${spread ? `, and the eighth card is ${esc(spread)} old at the compile stamp` : ''}.</p>

<section class="sec news" aria-labelledby="news-h">
  ${liveHead(news, 'Ranked feed')}
  ${legend(news)}
  <ol class="nfeed">${rows.map(feedRow).join('')}</ol>
  ${sourceDetails(newsSourceStrip(news.sources), newsSourceSentence(news.sources))}
</section>`;
}

/** Age of the newest item at the compile stamp, or null when the set is empty. */
function newest0(news) {
  let best = null;
  for (const it of news.items) {
    const t = Date.parse(it.published_at);
    if (!Number.isFinite(t)) continue;
    if (best === null || t > best) best = t;
  }
  if (best === null) return null;
  return duration(Math.max(0, (Date.parse(news.generated_at) - best) / 1000));
}

function newsSourceSentence(sources) {
  const dark = sources.filter((s) => s.status === 'dark').length;
  const quiet = sources.filter((s) => s.status === 'quiet').length;
  const live = sources.length - dark - quiet;
  const bits = [`${live} carrying`];
  if (quiet) bits.push(`${quiet} answered with nothing`);
  if (dark) bits.push(`${dark} dark`);
  return `${bits.join(' · ')} · of ${sources.length} news feeds`;
}

// ---------------------------------------------------------------------------
// Panel: THE RACE
// ---------------------------------------------------------------------------

/**
 * A live preview, not a link card.
 *
 * docs/VISITORS.md §D: the trader cluster is nine of a hundred, we win their
 * question outright on /race, and almost none of them ever see it because the
 * page sat behind a card at the bottom of 8,742px of mobile scroll. The number
 * they want — the leader, the market that produced it, and how stale it is — is
 * computed every build. It belongs where they are.
 *
 * The bar is on an absolute 0-100 scale, never normalised to the leader. On the
 * live data that makes seven of eight bars hairlines beside a 73.5% leg, and
 * that is the correct picture: one lab is not marginally ahead, it is the whole
 * market. Rescaling would draw a race that is not happening.
 */
function racePanel(ctx, race) {
  const poly = race.markets && race.markets.polymarket;
  const ev = poly && poly.ok ? poly.horizon : null;
  const players = race.players.slice(0, RACE_ROWS);

  const head = ev
    ? `<dl class="sw__dl">
        <div><dt>Ranking market</dt><dd><a href="${esc(ev.url)}" rel="nofollow noopener">${esc(ev.title)}</a></dd></div>
        <div><dt>Resolves</dt><dd><time datetime="${esc(ev.end_date)}">${esc(utcDay(ev.end_date))}</time></dd></div>
        ${Number.isFinite(ev.volume_usd) ? `<div><dt>Behind it</dt><dd class="num">${esc(money(ev.volume_usd))} across ${esc(ev.legs_live)} live legs</dd></div>` : ''}
      </dl>`
    : `<p class="sw__dark"><b>DARK</b> — no ranking market resolved on this run. The rows below carry
        whatever each venue did return, and nothing is filled in from the last one.</p>`;

  // The legs do not sum to 1. That is not an error, and it is the single most
  // credibility-buying line on /race, so it travels with the preview.
  const spread = ev && Number.isFinite(ev.sum_of_live_legs) && ev.sum_of_live_legs !== 1
    ? `<p class="nkey">The ${esc(ev.legs_live)} live legs price to
       <b class="num">${esc(ev.sum_of_live_legs.toFixed(4))}</b> rather than to 1.0000. That spread is the
       bid/ask on ${esc(money(ev.volume_usd))} of lifetime volume — not a rounding error and not our arithmetic.</p>`
    : '';

  const rows = players.map((p) => {
    const mk = p.market || {};
    const live = mk.state === 'live' && Number.isFinite(mk.probability);
    const width = live ? (mk.probability === 0 ? 0 : Math.max(0.6, mk.probability * 100)) : 0;
    const then = live && Number.isFinite(mk.change_7d)
      ? Math.max(0, Math.min(1, mk.probability - mk.change_7d)) * 100
      : null;

    const value = live
      ? `<span class="sw__pct num">${esc(pct(mk.probability))}</span>`
      : `<span class="sw__abs" title="${esc(mk.state === 'dark'
          ? 'The fetch or the parse failed on this run. The value is unknown and is never filled in.'
          : 'This venue lists no contract for this player. That is not a low probability — nobody is offering the bet.')}">${
          esc(mk.state === 'dark' ? 'DARK' : 'no market')}</span>`;

    const move = live && mk.change_7d_state === 'live' && Number.isFinite(mk.change_7d)
      ? moveChip(mk.change_7d * 100, 'pts / 7d')
      : `<span class="sw__abs" title="The venue has no price from a week ago to difference against. Not zero movement — no reference point.">no ref</span>`;

    return `<li class="sw__rrow" data-org="${esc(p.id)}">
      <span class="sw__rrank num" aria-hidden="true">${esc(String(p.rank ?? '').padStart(2, '0'))}</span>
      <span class="sw__rname">${esc(p.name)}<span class="vh">, rank ${esc(p.rank ?? '')}</span></span>
      <span class="sw__rval">${value}${move}</span>
      <span class="sw__rbar" aria-hidden="true"><i style="width:${width.toFixed(2)}%"></i>${
        then === null ? '' : `<u style="left:${then.toFixed(2)}%"></u>`}</span>
    </li>`;
  }).join('');

  // The headline row. The leader's probability is the one figure a reader came
  // to this tab for; the "no market" count is the one figure a competitor's
  // leaderboard never prints, and on this data it is the difference between a
  // tight race and one lab holding three quarters of the book.
  const leader = players.find((p) => p.market && p.market.state === 'live' && Number.isFinite(p.market.probability));
  const liveLegs = players.filter((p) => p.market && p.market.state === 'live').length;
  const noMarket = players.filter((p) => p.market && p.market.state === 'none').length;
  let mover = null;
  for (const p of players) {
    const mk = p.market || {};
    if (mk.change_7d_state !== 'live' || !Number.isFinite(mk.change_7d)) continue;
    if (!mover || Math.abs(mk.change_7d) > Math.abs(mover.market.change_7d)) mover = p;
  }

  return `
${statRow([
  {
    k: 'leader',
    value: leader ? pct(leader.market.probability) : null,
    none: 'no live leg',
    title: leader ? `${leader.name} at ${pct(leader.market.probability, 2)} on the ranking market` : 'No leg on this market priced on this run.',
  },
  { k: 'that is', value: leader ? leader.name : null, none: 'nobody' },
  { k: 'priced legs', value: players.length ? `${liveLegs}/${players.length}` : null, none: 'unreported',
    title: noMarket ? `${noMarket} of the ${players.length} labs have no contract listed at all — that is not a low probability, it is an absent bet.` : undefined },
  {
    k: 'biggest 7d move',
    value: mover ? signed(mover.market.change_7d * 100, 1) : null,
    unit: mover ? `pts · ${mover.name}` : undefined,
    none: 'no reference',
    title: mover ? `${mover.name} moved ${signed(mover.market.change_7d * 100, 2)} points in seven days` : 'No venue carries a price from a week ago to difference against.',
  },
])}
<p class="sw__lede">Eight frontier labs ranked on one live prediction market, priced in public with
   real money behind every leg. Nothing here is our judgement: the ordering is the market's, and the
   tick on each bar is where that leg traded seven days ago.</p>
${head}
<ol class="sw__race">${rows}</ol>
${spread}`;
}

// ---------------------------------------------------------------------------
// Panel: SUBSTRATE
// ---------------------------------------------------------------------------

/**
 * The second named scalar, previewed.
 *
 * Three states stay distinct and are never merged: live, dark, awaiting
 * baseline. A pillar with no frozen reference answered its request perfectly
 * well — reporting it as dark would claim an outage that is not happening, and
 * reporting it as a number would invent one.
 */
function substratePanel(ctx, infra) {
  const lvl = Number.isFinite(infra.level) ? infra.level : null;
  const scored = Number.isFinite(infra.score);
  const c = infra.counts || {};
  const pillars = Array.isArray(infra.pillars) ? infra.pillars : [];

  const cards = pillars.map((p) => {
    const st = p.dark ? 'dark' : (p.state || (Number.isFinite(p.score) ? 'live' : 'awaiting-baseline'));
    const body = st === 'live' && Number.isFinite(p.score)
      ? `<b class="sw__pv num">${esc(num(p.score, 1))}</b><span class="sw__pu">of 100</span>`
      : `<b class="sw__pv sw__pv--none">${esc(st === 'dark' ? 'DARK' : 'AWAITING BASELINE')}</b>`;
    const counts = [
      Number.isFinite(p.sources_live) ? `${p.sources_live} live` : null,
      p.sources_awaiting ? `${p.sources_awaiting} awaiting baseline` : null,
      p.sources_dark ? `${p.sources_dark} dark` : null,
    ].filter(Boolean).join(' · ');
    return `<li class="sw__pill" data-state="${esc(st)}">
      <span class="sw__pn">${esc(p.name)}</span>
      <span class="sw__pb">${body}</span>
      <span class="sw__pd">${esc(p.blurb || '')}</span>
      <span class="sw__pc">${esc(counts)} · of ${esc(p.sources_total)}</span>
    </li>`;
  }).join('');

  const reading = scored && lvl !== null
    ? `<p class="sw__read"><b class="num">SUBSTRATE ${esc(lvl)}</b>
        <span class="sw__readn">${esc(infra.level_name || '')}</span>
        <span class="sw__reads num">${esc(num(infra.score, 1))} of 100</span></p>
       <p class="sw__lede">${esc(infra.level_gloss || '')}</p>`
    : `<p class="sw__dark"><b>NO READING</b> — not enough live pillars to compute a substrate score on
        this run. No number is shown rather than a number nobody could check.</p>`;

  const health = [
    Number.isFinite(c.live) ? `${c.live} live` : null,
    c.awaiting_baseline ? `${c.awaiting_baseline} awaiting baseline` : null,
    c.dark ? `${c.dark} dark` : null,
  ].filter(Boolean).join(' · ');
  const total = c.total ?? (Array.isArray(infra.sources) ? infra.sources.length : 0);

  return `
${statRow([
  { k: 'substrate', value: scored ? num(infra.score, 1) : null, unit: 'of 100', none: 'no reading' },
  { k: 'level', value: lvl !== null ? `${lvl} ${infra.level_name || ''}`.trim() : null, none: 'unscored' },
  { k: 'pillars scored', value: pillars.length ? `${pillars.filter((p) => Number.isFinite(p.score)).length}/${pillars.length}` : null, none: 'none' },
  { k: 'instruments live', value: total ? `${c.live ?? 0}/${total}` : null, none: 'unreported' },
])}
${reading}
<ul class="sw__pills">${cards}</ul>
${instrumentGrid(infra.sources, {
  min: (infra.thresholds && Number.isFinite(infra.thresholds.min_baseline_n)) ? infra.thresholds.min_baseline_n : null,
  id: 'substrate',
})}
<p class="sw__lede">You cannot train a model without power, and the power bill is public in a way the
   weights are not. SUBSTRATE runs on its own 5-to-1 scale over grid load, river flow, drought and
   build-out, and it does not feed the main index.</p>
<p class="nkey">${esc(health)} · of ${esc(total)} substrate sources, every one keyless.
   Two grids, not the country: the national demand feed needs an API key and this project ships no
   secrets, so the coverage limit is printed rather than quietly closed.</p>`;
}

// ---------------------------------------------------------------------------
// THE INSTRUMENT GRID — the fix for the two deadest tabs on the desk.
//
// SUBSTRATE and BLISS both arrived at this round rendering a level line, a
// paragraph and, between them, nineteen "AWAITING BASELINE" placeholders. The
// files behind them were never empty. `data/infra.json` was carrying 23,371 MW
// of CAISO overnight floor, 80.76% ERCOT tightness and 18.5% of ten states in
// drought; `data/bliss.json` was carrying 691 AI clinical trials started in
// 180 days and 275.6M open-model downloads in 30. Nineteen measured numbers
// with units, collected on every run, published in the API, and rendered on
// the site as the word AWAITING.
//
// They were withheld for a good reason and the reason does not apply. A source
// with no frozen reference cannot be SCORED — that is the rule, it is right,
// and nothing here breaks it: no score is invented, no percentile is guessed,
// and a pillar with no live children still says so. But the READING is not the
// score. 23,371 MW is a measurement, it is exact, and it is the only number on
// either tab a reader can check against their own utility's dashboard.
//
// So each instrument prints its reading, its unit, and then one of three
// things, never a fourth:
//   live                -> its percentile in its own reference distribution
//   awaiting a baseline -> how far along the baseline is, n of the required n
//   dark                -> the error, truncated, and no number at all
//
// The calibration bar is also the honest version of a retention hook. It is a
// real quantity counting up on a real schedule, and "3 of 30" is a date this
// page can be checked against. Nothing has to be invented to give a reader a
// reason to come back if the instrument is genuinely warming up.
// ---------------------------------------------------------------------------

/** Thousands-grouped, compacted above a million. Never locale-dependent. */
function group(n) {
  const neg = n < 0;
  const s = String(Math.abs(n));
  const dot = s.indexOf('.');
  const i = dot === -1 ? s : s.slice(0, dot);
  const f = dot === -1 ? '' : s.slice(dot);
  return (neg ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + f;
}

function readingOf(v) {
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2).replace('-', '−')}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace('-', '−')}M`;
  if (Number.isInteger(v)) return group(v);
  if (a >= 1e4) return group(Math.round(v));
  if (a >= 100) return group(Number(v.toFixed(1)));
  if (a >= 10) return v.toFixed(1).replace('-', '−');
  if (a >= 1) return v.toFixed(2).replace('-', '−');
  return v.toFixed(3).replace('-', '−');
}

/**
 * @param {Array} sources  infra.sources or bliss.sources
 * @param {object} o
 * @param {number|null} o.min  observations required before a source can be scored,
 *                             from the engine's own thresholds. Null when the
 *                             engine does not publish one — and then no progress
 *                             bar is drawn, because a bar with a guessed
 *                             denominator is worse than no bar.
 */
function instrumentGrid(sources, o = {}) {
  const list = Array.isArray(sources) ? sources : [];
  if (!list.length) return '';
  const min = Number.isFinite(o.min) ? o.min : null;

  const cells = list.map((s) => {
    const state = s.state || (s.ok === true ? 'live' : s.dark === true ? 'dark' : s.uncalibrated ? 'awaiting-baseline' : 'dark');
    const val = readingOf(s.value);
    const unit = s.unit_label || s.unit || '';

    let tail;
    if (state === 'live' && Number.isFinite(s.percentile)) {
      tail = `${meter(s.percentile)}<span class="sw__il">${esc(pct(s.percentile, 0))} of its own record${
        Number.isFinite(s.score) ? ` · scores ${esc(num(s.score, 1))}` : ''}</span>`;
    } else if (state === 'awaiting-baseline' && min && Number.isFinite(s.baseline_n)) {
      tail = `${meter(Math.min(1, s.baseline_n / min))}<span class="sw__il">${esc(s.baseline_n)} of ${esc(min)} observations before it can be scored</span>`;
    } else if (state === 'awaiting-baseline') {
      tail = `<span class="sw__il">no frozen reference yet, so the reading is published and not scored</span>`;
    } else if (state === 'dark') {
      tail = `<span class="sw__il sw__il--dark">${esc(s.error ? String(s.error).slice(0, 72) : 'no answer on this run')}</span>`;
    } else {
      tail = `<span class="sw__il">${esc(state)}</span>`;
    }

    return `<li class="sw__inst" data-state="${esc(state)}"${s.pillar ? ` data-pillar="${esc(s.pillar)}"` : ''}>
      <span class="sw__ik">${esc(s.label || s.id)}</span>
      <span class="sw__iv">${val === null
        ? '<b class="sw__ivn">no reading</b>'
        : `<b class="num">${esc(val)}</b><span class="sw__iu">${esc(unit)}</span>`}</span>
      ${s.region ? `<span class="sw__ir">${esc(s.region)}</span>` : ''}
      ${tail}
    </li>`;
  }).join('');

  const live = list.filter((s) => (s.state || (s.ok === true ? 'live' : '')) === 'live').length;
  return `<div class="sw__insts" data-grid="${esc(o.id || 'i')}">
    <p class="sw__ih">Every instrument, and what it actually read</p>
    <ul class="sw__ig">${cells}</ul>
    <p class="nkey">${esc(live)} of ${esc(list.length)} are scored. The rest print the reading they took and
       say why there is no score beside it — a measurement without a reference distribution is still a
       measurement, and it is never rendered as a zero.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Optional panels. ctx.digest and ctx.bliss are being wired by other agents
// this round. Both are read through a strict shape check and both are simply
// absent when the key is missing, so this file is correct before, during and
// after that landing — and it never invents a panel out of a half-written file.
// ---------------------------------------------------------------------------

function digestOf(ctx) {
  const d = ctx && ctx.digest;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const items = d.brief && Array.isArray(d.brief.items) ? d.brief.items : null;
  if (!items || !items.length) return null;
  return { d, items };
}

/**
 * THE DIGEST. A six-row list of blue links and a right-aligned decimal was, on
 * the measurement this round started from, the closest thing on the desk to a
 * wall of text — a tab whose entire payoff was more reading.
 *
 * What the file was already carrying and the panel was not drawing: a pillar
 * per item, a score per item, a corroboration count, and a LEAD TIME in
 * minutes — how long the first source sat on the story before the second one
 * caught up. That last one is the number no competitor in docs/TEARDOWN.md can
 * produce, because it requires stable per-item identity across independent
 * feeds, and it is now the graphic element of the row.
 *
 * Lead time is drawn on a shared scale across the visible rows, and the scale
 * is printed. An uncorroborated item has NO lead time — not a zero-length bar,
 * which would read as "they all broke it at once". It says so in words.
 */
function digestPanel(ctx, model) {
  const items = model.items.slice(0, DIGEST_ROWS);

  const leads = items
    .map((it) => (it.corroboration && Number.isFinite(it.corroboration.lead_minutes) && it.corroboration.count > 1
      ? it.corroboration.lead_minutes : null))
    .filter((v) => Number.isFinite(v) && v > 0);
  const leadMax = leads.length ? Math.max(...leads) : null;

  const rows = items.map((it) => {
    const cr = it.corroboration || {};
    const n = Number.isFinite(cr.count) ? cr.count : null;
    const srcs = Array.isArray(cr.sources) ? cr.sources : [];
    const title = it.title || it.id || '';
    const corroborated = n !== null && n > 1;
    const lead = corroborated && Number.isFinite(cr.lead_minutes) ? cr.lead_minutes : null;

    const badge = corroborated
      ? `<span class="corr" title="${esc(srcs.join(', ') || `${n} independent sources`)}">` +
        `<span aria-hidden="true">&times;${esc(n)}</span>` +
        `<span class="vh">carried by ${esc(n)} independent sources</span></span>`
      : `<span class="sw__abs" title="One source carried this and no other did. That is not a judgement about the story.">1 source</span>`;

    const leadCell = lead !== null && leadMax
      ? `${meter(Math.max(0.02, lead / leadMax))}<span class="sw__dlt num">${esc(lead)}m lead</span>`
      : `<span class="sw__dlt sw__dlt--none">${corroborated ? 'no lead recorded' : 'no second source'}</span>`;

    return `<li class="sw__drow" data-pillar="${esc(it.pillar || '')}">
      <span class="sw__dh">${it.url ? `<a href="${esc(it.url)}" rel="noopener nofollow">${esc(title)}</a>` : esc(title)}</span>
      <span class="sw__dm">${badge}${Number.isFinite(it.news_score)
        ? `<b class="sw__ds num" title="news score, 0-100">${esc(num(it.news_score, 1))}</b>` : ''}${
        Number.isFinite(it.age_hours) ? `<span class="num">${esc(it.age_hours.toFixed(1))}h</span>` : ''}</span>
      <span class="sw__dl2">${leadCell}</span>
    </li>`;
  }).join('');

  const brief = model.d.brief || {};
  const held = Number.isFinite(brief.held_back) ? brief.held_back : null;
  const corrN = items.filter((it) => it.corroboration && it.corroboration.count > 1).length;

  // The streak is a fact about the record rather than about today, so it is the
  // one line on this panel worth reading twice, and the collector already
  // computes it. Absent without comment when there is not one.
  const st = model.d.streaks && model.d.streaks.longest_streak;
  const streak = st && Number.isFinite(st.moves) && st.name
    ? `<p class="sw__strk"><b>${esc(st.name)}</b> has moved ${esc(st.direction || '')} for
       <b class="num">${esc(st.moves)}</b> consecutive observations${
        Number.isFinite(st.from) && Number.isFinite(st.to) ? `, ${esc(num(st.from, 2))} &rarr; ${esc(num(st.to, 2))}` : ''}${
        Number.isFinite(st.span_hours) ? ` over ${esc(num(st.span_hours, 1))}h` : ''}.</p>`
    : '';

  return `
${statRow([
  { k: 'in the brief', value: items.length, unit: Number.isFinite(brief.candidates) ? `of ${brief.candidates} candidates` : undefined },
  { k: 'corroborated', value: corrN, unit: 'by a second source' },
  { k: 'longest lead', value: leadMax !== null ? leadMax : null, unit: 'min', none: 'none corroborated',
    title: 'The longest gap between the first source carrying a story and the last one, among the items shown.' },
  { k: 'held back', value: held === null ? null : held, none: 'none', unit: held ? 'single-source' : undefined },
])}
${streak}
<ol class="sw__digest">${rows}</ol>
<p class="sw__lede">The day in the few items that clear the corroboration rule${
    Number.isFinite(brief.candidates) ? `, out of ${esc(brief.candidates)} candidates` : ''}.
   The bar on each row is the lead time: how long the first source held the story alone.${
    leadMax ? ` Full width is ${esc(leadMax)} minutes.` : ''}</p>
${held ? `<p class="nkey">${esc(held)} item${held === 1 ? '' : 's'} held back: one source carried them and no other did.
   Held back is not rejected, and it is not a judgement about the story.</p>` : ''}`;
}

function blissOf(ctx) {
  const b = ctx && ctx.bliss;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (!Number.isFinite(b.score) && b.posture !== 'awaiting-baseline') return null;
  return b;
}

/**
 * BLISS was the deadest tab on the desk, and by some distance: one paragraph,
 * one dashed box reading AWAITING BASELINE, and nothing else. Two elements.
 *
 * `data/bliss.json` on the committed run carries ten instruments, all ten
 * reporting, every one with a value and a unit: 691 AI clinical trials started
 * in 180 days, 2,006 clinical records in 30, 275.6M open-model downloads in
 * 30, 8.16 million tokens per dollar at the cheap frontier, 39.6% of tracked
 * releases under a permissive licence. None of them can be SCORED yet, because
 * `data/bliss-reference.json` has no frozen distribution to score them
 * against, and the index correctly refuses to print a composite.
 *
 * That refusal was being allowed to swallow the readings too, which it should
 * never have done. The scale is uncalibrated; the thermometers are not.
 */
function blissPanel(ctx, b) {
  const sources = Array.isArray(b.sources) ? b.sources : [];
  const pillars = Array.isArray(b.pillars) ? b.pillars : [];
  const reporting = Number.isFinite(b.sources_reporting) ? b.sources_reporting : null;
  const totalSrc = Number.isFinite(b.sources_total) ? b.sources_total : sources.length || null;
  const calibrated = sources.filter((s) => s.ok === true).length;

  const body = Number.isFinite(b.score)
    ? `<p class="sw__read"><b class="num">BLISS ${esc(b.level ?? '—')}</b>
        <span class="sw__readn">${esc(b.level_name || '')}</span>
        <span class="sw__reads num">${esc(num(b.score, 1))} of 100</span></p>`
    : `<p class="sw__dark"><b>AWAITING BASELINE</b> — ${esc(reporting ?? 0)} of
        ${esc(totalSrc ?? 0)} sources are reporting and none has a frozen reference to be scored
        against yet. There is no composite, so none is printed. The readings below are what those
        ${esc(reporting ?? 0)} instruments actually returned on this run.</p>`;

  const pillarCards = pillars.map((p) => {
    const st = p.dark ? 'dark' : Number.isFinite(p.score) ? 'live' : 'awaiting-baseline';
    const val = st === 'live'
      ? `<b class="sw__pv num">${esc(num(p.score, 1))}</b><span class="sw__pu">of 100</span>`
      : `<b class="sw__pv sw__pv--none">${esc(st === 'dark' ? 'DARK' : 'AWAITING BASELINE')}</b>`;
    return `<li class="sw__pill" data-state="${esc(st)}">
      <span class="sw__pn">${esc(p.name || p.id)}</span>
      <span class="sw__pb">${val}</span>
      <span class="sw__pd">${esc(p.blurb || '')}</span>
      <span class="sw__pc">${esc(p.sources_ok ?? 0)} scored · of ${esc(p.sources_total ?? 0)}</span>
    </li>`;
  }).join('');

  return `
${statRow([
  { k: 'bliss', value: Number.isFinite(b.score) ? num(b.score, 1) : null, unit: 'of 100', none: 'no composite' },
  { k: 'instruments reporting', value: totalSrc ? `${reporting ?? 0}/${totalSrc}` : null, none: 'unreported' },
  { k: 'calibrated', value: sources.length ? `${calibrated}/${sources.length}` : null, none: 'unreported',
    title: 'A source is calibrated once it has a frozen reference distribution in data/bliss-reference.json to be scored against.' },
  { k: 'failed this run', value: Array.isArray(b.failed_sources) ? b.failed_sources.length : null, none: 'unreported' },
])}
${body}
${pillarCards ? `<ul class="sw__pills">${pillarCards}</ul>` : ''}
${instrumentGrid(sources, { id: 'bliss', min: null })}
<p class="sw__lede">The direction this index can move that we would be glad about, measured exactly the
   way the other one is — including the part where it refuses to give you a number it cannot yet
   justify. The scale is uncalibrated. The instruments are not.</p>`;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Build the panel list from whatever ctx actually carries.
 *
 * A tab is emitted only when its data parsed. A tab that reveals an empty panel
 * is worse than no tab — it is the "LOADING TACTICAL DATA" failure wearing a
 * label — and "remember to check" is not a mechanism, so the gate is here.
 *
 * `head: false` on a panel whose body already ships its own section header with
 * its own stamp (_labs.mjs, _xwire.mjs). Printing "The watch floor · read
 * 20:39Z" above a section headed "The watch floor · 8 labs monitored · read
 * 20:39Z" is precisely the duplication this round exists to delete.
 */
export function panels(ctx) {
  const out = [];
  const moved = movedModel(ctx);

  let news = null;
  try {
    news = readNews(ctx);
  } catch {
    // readNews throws on structural corruption, which is the right posture for
    // /news.html, whose whole job is the newsroom. Here it must not take the
    // dashboard down with it: the index, the race and the substrate are
    // separate failure domains by design, and build.mjs says so in three
    // places. The failure is not silent either — the SIGNAL tab is simply not
    // there, which is a visible statement rather than an empty panel claiming
    // we looked and found nothing.
    news = null;
  }
  if (news) {
    // THE ONE TAB THAT CAN CARRY A DELTA, and the only one that gets one.
    //
    // ENGAGEMENT.md §1.3 identifies the competitor's real reward loop as the
    // pending-arrivals counter — "the credible threat of a payoff" — and their
    // version needs a live socket. Ours does not: news items carry stable
    // sha256-derived ids and the observation log carries the previous run's
    // stamp, so "published since the last observation" is arithmetic over two
    // files we already ship. It is a build-time count of real items, never a
    // number animating towards a value nobody measured.
    //
    // Null when the log holds a single observation. Not zero — "nothing new"
    // and "no previous run to be new since" are different statements and the
    // strip renders them differently.
    const nnew = newSince(news, moved && moved.priorAt);
    out.push({
      key: 'signal',
      glyph: '◆',
      label: 'Signal',
      count: news.total,
      countTitle: `${news.total} scored items in the collection window`,
      state: news.liveness && news.liveness.status === 'cold' ? 'dark' : 'live',
      delta: Number.isFinite(nnew) && nnew > 0
        ? { text: `${nnew} new`, title: `${nnew} items published since the previous observation at ${String(moved.priorAt).slice(11, 16)}Z` }
        : null,
      head: { title: 'The newsroom', stamp: `compiled ${clock(news.generated_at) || ''}` },
      more: { href: ctx.href('/news.html'), text: `All ${news.total} items, each score decomposed` },
      body: () => signalPanel(ctx, news, nnew),
    });
  }

  const race = ctx.race;
  if (race && Array.isArray(race.players) && race.players.length) {
    const dark = !(race.markets && race.markets.polymarket && race.markets.polymarket.ok);
    out.push({
      key: 'race',
      glyph: '▲',
      label: 'The race',
      count: race.players.length,
      countTitle: `${race.players.length} labs on live prediction-market odds`,
      state: dark ? 'dark' : 'live',
      head: { title: 'The race', stamp: `read ${clock(race.generated_at) || ''}` },
      more: { href: ctx.href('/race.html'), text: 'The full board, and the six things an empty cell can mean' },
      body: () => racePanel(ctx, race),
    });
    out.push({
      key: 'floor',
      glyph: '■',
      label: 'Watch floor',
      count: race.players.length,
      countTitle: `${race.players.length} labs monitored for visible output`,
      state: 'live',
      // _labs.mjs owns this object end to end, including its own <style>, its
      // own header and its own stamp, so this panel adds neither. Using it
      // verbatim is the point: one watch floor, one definition of "posture",
      // and no second copy to drift.
      head: false,
      more: { href: ctx.href('/race.html'), text: 'Every lab, every channel, every blank cell' },
      body: () => labs.render(ctx),
    });
  }

  if (xwire.hasWire(ctx)) {
    const n = ctx.x.items.length;
    out.push({
      key: 'wire',
      glyph: '✕',
      label: 'X wire',
      count: n,
      countTitle: `${n} posts resolved through X's keyless embed endpoint`,
      state: 'live',
      // _xwire.mjs likewise ships its own header and its own resolved stamp.
      head: false,
      more: null,
      body: () => xwire.render(ctx, { limit: WIRE_CARDS }),
    });
  }

  const infra = ctx.infra;
  if (infra && typeof infra === 'object' && Array.isArray(infra.pillars)) {
    const n = Array.isArray(infra.sources) ? infra.sources.length : ((infra.counts && infra.counts.total) || 0);
    const state = Number.isFinite(infra.score) ? 'live' : 'uncal';
    out.push({
      key: 'substrate',
      glyph: '◐',
      label: 'Substrate',
      count: n,
      countTitle: `${n} keyless grid, drought and build-out sources`,
      state,
      head: { title: 'The substrate', stamp: `read ${clock(infra.generated_at) || ''}` },
      more: { href: ctx.href('/watts.html'), text: 'The full substrate board, corridor by corridor' },
      body: () => substratePanel(ctx, infra),
    });
  }

  const dg = digestOf(ctx);
  if (dg) {
    out.push({
      key: 'digest',
      glyph: '●',
      label: 'Digest',
      count: dg.items.length,
      countTitle: `${dg.items.length} items that cleared the corroboration rule`,
      state: 'live',
      head: { title: 'The digest', stamp: `compiled ${clock(dg.d.as_of || dg.d.generated_at) || ''}` },
      more: { href: ctx.href('/digest.html'), text: 'The full digest, with what changed and why' },
      body: () => digestPanel(ctx, dg),
    });
  }

  // The Leader Wire. It sits in the switcher rather than as its own band
  // because it answers the same question as the other panels — what is
  // happening right now — and the fold cannot carry another section.
  if (leaderwire.hasWire && leaderwire.hasWire(ctx)) {
    const rows = (ctx.leaders && Array.isArray(ctx.leaders.leaders)) ? ctx.leaders.leaders : [];
    const onRecord = rows.filter((r) => Array.isArray(r.lines) && r.lines.length).length;
    out.push({
      key: 'leaders',
      glyph: '◈',
      label: 'Leaders',
      count: onRecord,
      countTitle: `${onRecord} of ${rows.length} leaders on the record this week`,
      state: onRecord ? 'live' : 'uncal',
      head: { title: 'The leader wire', stamp: `read ${clock(ctx.leaders.generated_at) || ''}` },
      more: { href: ctx.href('/leaders.html'), text: 'Every leader, including the silent ones' },
      body: () => leaderwire.render(ctx, { heading: null }),
    });
  }

  const bl = blissOf(ctx);
  if (bl) {
    out.push({
      key: 'bliss',
      glyph: '○',
      label: 'Bliss',
      count: Number.isFinite(bl.score) ? num(bl.score, 1) : 0,
      countTitle: Number.isFinite(bl.score) ? `BLISS score ${num(bl.score, 1)} of 100` : 'No BLISS score yet',
      state: Number.isFinite(bl.score) ? 'live' : 'uncal',
      head: { title: 'The other direction', stamp: `read ${clock(bl.generated_at) || ''}` },
      more: { href: ctx.href('/bliss.html'), text: 'The full board' },
      body: () => blissPanel(ctx, bl),
    });
  }

  // The paint in site/styles.mjs binds eight radios to eight tabs to eight
  // panels. A ninth would light nothing, so it is refused here rather than
  // shipped as a tab that silently does not work.
  return out.slice(0, 8);
}
/**
 * @param {object} ctx
 * @param {object} [o]
 * @param {string} [o.id='sw']     radio group name and id prefix
 * @param {boolean} [o.style=true] emit the scoped <style> for the interiors
 * @returns {string} '' when no panel has data
 */
export function render(ctx, o = {}) {
  const uid = o.id || 'sw';
  const list = panels(ctx);
  if (!list.length) return '';

  const radios = list.map((p, i) => `<input class="sw__in sw__r" type="radio" name="${esc(uid)}" id="${esc(uid)}-${esc(p.key)}"${
    i === 0 ? ' checked' : ''}>`).join('\n  ');

  // One rule set per PRESENT panel, keyed on that panel's own radio id rather
  // than on its position, so adding or dropping a dataset can never leave a tab
  // pointing at its neighbour's panel.
  const rules = list.map((p) => `
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"] { color: var(--ink); background: var(--bg-sunken); border-color: var(--rule); border-bottom-color: var(--bg-sunken); font-weight: 700; }
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"]::after { opacity: 1; }
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"] .sw__tn { color: var(--accent); border-color: var(--accent); }
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"] .sw__tg { color: var(--accent); }
#${uid}-${p.key}:focus-visible ~ .sw__tabs [for="${uid}-${p.key}"] { outline: 2px solid var(--accent); outline-offset: -2px; }
#${uid}-${p.key}:checked ~ .sw__panels > [data-panel="${p.key}"] { visibility: visible; opacity: 1; }
#${uid}-${p.key}:checked ~ .sw__panels { --sw-a: ${PANEL_HUE[p.key] || 'var(--accent-2)'}; }`).join('');

  // The order of these three lists IS the binding. They are built from one
  // array in one pass for exactly that reason.
  //
  // `--sw-h` is set inline rather than by a rule per key because it is data,
  // not style: the table it comes from lives at the top of this file beside
  // the panels it names, and a reader changing a dataset's hue should not have
  // to find a matching selector at the bottom of a stylesheet to do it.
  const tabs = list.map((p) => `<label class="sw__tab sw__t" id="${esc(uid)}-t-${esc(p.key)}" for="${esc(uid)}-${esc(p.key)}" data-state="${esc(p.state || 'live')}" style="--sw-h:${PANEL_HUE[p.key] || 'var(--accent-2)'}">` +
    `<i class="sw__tg" aria-hidden="true">${p.glyph}</i>` +
    `<span class="sw__tk sw__tl">${esc(p.label)}</span>` +
    `<b class="sw__tn num"${Number(p.count) === 0 ? ' data-zero="1"' : ''} title="${esc(p.countTitle)}">${esc(p.count)}</b>` +
    (p.delta ? `<span class="sw__td" title="${esc(p.delta.title)}">${esc(p.delta.text)}</span>` : '') +
    `</label>`).join('\n    ');

  const articles = list.map((p) => `<article class="sw__panel sw__p" aria-labelledby="${esc(uid)}-t-${esc(p.key)}" data-panel="${esc(p.key)}" style="--sw-h:${PANEL_HUE[p.key] || 'var(--accent-2)'}">
      ${p.head === false ? '' : `<div class="sw__head">
        <h3 class="sw__ph">${esc(p.head.title)}</h3>
        <span class="sw__pm">${esc(p.head.stamp)}</span>
      </div>`}
      <div class="sw__body">${p.body()}</div>
      ${p.more ? `<a class="sw__more" href="${esc(p.more.href)}">${esc(p.more.text)}</a>` : ''}
    </article>`).join('\n    ');

  return `${o.style === false ? '' : styleTag(rules)}
<section class="sw" id="${esc(uid)}" aria-labelledby="${esc(uid)}-h">
  <div class="sw__hd">
    <h2 class="sec__h" id="${esc(uid)}-h">The desk</h2>
    <p class="sw__k">${esc(list.length)} datasets · one slot · no page load · every one already in this HTML</p>
  </div>
  ${movedBand(movedModel(ctx))}
  ${radios}
  <div class="sw__tabs" role="radiogroup" aria-label="Choose a dataset">
    ${tabs}
  </div>
  <div class="sw__panels">
    ${articles}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Scoped CSS — the complete control, plus the panel interiors.
//
// Self-sufficient on purpose; see the note at the top of this file. Emitted
// inside <main>, so a `.sw <thing>` rule in site/styles.mjs sits one
// specificity step above every declaration here and refines the frame without
// either file renaming anything. Every value is an existing design token, so
// both themes work with no second palette to keep in sync.
//
// The open tab is never carried by colour alone: it is filled onto the panel's
// own background, its label goes to 700 weight, a 2px accent cap sits on its
// top edge, and its radio reports `checked` to assistive technology. Desaturate
// the page and the open tab is still the heavier one that has broken the line.
// ---------------------------------------------------------------------------

export function styleTag(rules = '') {
  return `<style>
.sw{margin-top:var(--sec-lg)}
.sw__hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 var(--s-3);justify-content:space-between}
.sw__k{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 var(--s-2)}

/* The radios are the state machine. Off-screen rather than display:none, which
   would take them out of the tab order and make the control unreachable from a
   keyboard — the labels are the only visible handle, so the input being
   focusable is what makes the arrow keys work. */
.sw__in{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* Folder tabs, not pills. A tab whose bottom edge opens into the panel below it
   says "this strip and that frame are one object" without a word of
   instruction. The -1px margin is what closes the seam. */
.sw__tabs{display:flex;gap:2px;margin:0;padding:0;overflow-x:auto;overscroll-behavior-x:contain;
  scrollbar-width:none;-ms-overflow-style:none;border-bottom:1px solid var(--rule)}
.sw__tabs::-webkit-scrollbar{display:none}
.sw__tab{position:relative;flex:0 0 auto;display:inline-flex;align-items:baseline;gap:6px;
  padding:7px 11px;cursor:pointer;font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-dim);background:var(--bg);border:1px solid transparent;
  border-bottom:0;border-radius:var(--radius) var(--radius) 0 0;margin-bottom:-1px;font-weight:500;
  -webkit-user-select:none;user-select:none;transition:color 120ms ease,background-color 120ms ease}
.sw__tab:hover{color:var(--ink);background:var(--bg-raised)}
.sw__tab::after{content:'';position:absolute;left:-1px;right:-1px;top:-1px;height:2px;
  background:var(--accent);border-radius:var(--radius) var(--radius) 0 0;opacity:0;transition:opacity 120ms ease}
/* THE IDENTITY HUE. See PANEL_HUE at the top of this file for the table, the
   three rules it obeys and the forty-eight contrast readings behind it. The
   glyph and the closed tab's figure carry it; the OPEN tab overrides both to
   amber in the generated rules, so the strip reads as eight coloured
   destinations with one live one, rather than eight grey ones. */
.sw__tg{font-style:normal;font-size: var(--t-xs);line-height:1;color:var(--sw-h,var(--ink-faint))}
.sw__tk{white-space:nowrap}
/* THE LIVE COUNT. Without it the strip is a menu; with it the strip is also a
   legend — five destinations and five readings in one row. Cool accent, the
   same rule the masthead nav follows: amber is the live value of the thing you
   are looking at, so only the open tab's figure goes amber. */
.sw__tn{font-weight:700;letter-spacing:.01em;font-size:var(--t-xs);font-variant-numeric:tabular-nums;
  color:var(--sw-h,var(--accent-2));border:1px solid var(--rule);
  border-color:color-mix(in srgb,var(--sw-h,var(--accent-2)) 38%,var(--rule));
  border-radius:2px;padding:0 4px;min-width:3.4ch;text-align:center;line-height:1.5}
/* THE ARRIVALS CHIP, and the only delta any tab carries. ENGAGEMENT.md §1.3
   names the pending-arrivals counter as the competitor's real reward loop and
   §8 asks for ours; this is the build-time half of it, counting items whose
   publication stamp is later than the previous observation in the log. It is
   emitted only when that count is a positive integer — no chip for zero, and
   no chip at all when there is no previous observation to be "since", because
   those are two different facts and neither of them is "0 new". */
.sw__td{font-family:var(--mono);font-size: var(--t-2xs);font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;color:var(--accent-ink);background:var(--accent);
  border-radius:2px;padding:1px 4px;line-height:1.5;white-space:nowrap}
/* Zero is not an event — the same rule the arrival badges follow. */
.sw__tn[data-zero="1"]{color:var(--ink-faint);font-weight:500}
/* A dataset whose source is dark says so on its own tab, before the reader
   spends a press on it. Dashed, faint, and the figure drops its hue: the same
   three-state grammar the freshness chips use, because it is the same
   statement. */
.sw__tab[data-state="dark"]{border-style:dashed;border-color:var(--rule);color:var(--ink-faint)}
.sw__tab[data-state="dark"] .sw__tn{color:var(--ink-faint);border-style:dashed}
.sw__tab[data-state="uncal"] .sw__tn{border-style:dotted}

/* One grid cell for every panel, so the frame is always as tall as the tallest
   and nothing below the control moves on a press. See the file header for the
   two measurements behind these four declarations. */
/* THE SPINE. --sw-a is set on this element by the generated rule for whichever
   radio is checked, so the left edge of the well is the open dataset's own
   hue and changes with the press. It is the one piece of paint in this control
   that is large enough to read from across a room, which is the whole of what
   "commit to colour" means here. It carries no meaning colour-only: the open
   tab is also filled, bolded, amber-capped and reports checked. */
.sw__panels{display:grid;grid-template-areas:'sw';grid-template-columns:minmax(0,1fr);min-width:0;
  background:var(--bg-sunken);border:1px solid var(--rule);border-top:0;
  border-left:3px solid var(--sw-a,var(--rule));
  border-radius:0 0 var(--radius) var(--radius)}
@media(prefers-reduced-motion:no-preference){.sw__panels{transition:border-left-color 140ms ease}}
.sw__panel{grid-area:sw;min-width:0;padding:var(--s-3) 13px 14px;visibility:hidden;opacity:0}
/* The server-selected form, for a rendering with no radios at all. */
.sw__panel[data-on="1"]{visibility:visible;opacity:1}
/* The cross-fade is decoration on content that is already painted; reduce turns
   it off and the panel still switches, instantly. MOTION.md §3. Restated rather
   than left to the blanket override, because a zero-duration opacity transition
   on a visibility-hidden element is the exact case engines disagree on. */
@media(prefers-reduced-motion:no-preference){.sw__panel{transition:opacity 140ms ease}}
@media(prefers-reduced-motion:reduce){.sw__panel{transition:none}}

/* The well is inset from the page, so the first thing in it must not be inset
   again from the well. A panel re-hosts whole page sections (_labs, _xwire, the
   reel, the feed); each of those sets a top margin for life at the top level of
   a page, and the <h2> each brings is a sub-heading of the panel here rather
   than a page heading, so it is stepped down to sit under .sw__ph. */
.sw__panel>:first-child{margin-top:0}
.sw__panel>:last-child{margin-bottom:0}
.sw__head{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px var(--s-3);padding-bottom:7px;
  margin-bottom:var(--row);border-bottom:1px solid var(--rule-soft)}
.sw__ph{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.06em;color:var(--ink);margin:0;font-weight:500}
/* THE STAMP, and every panel carries one. The first question anyone asks of an
   in-place switcher is whether the dataset they just switched to is as fresh as
   the one they switched from. pizzint's seven panels answer it zero times. */
.sw__pm{font-family:var(--mono);font-size:var(--t-2xs);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);margin-left:auto;font-variant-numeric:tabular-nums}
.sw__body{min-width:0}
.sw__body>:first-child,.sw__body>.sec:first-child{margin-top:0}
.sw__body>:last-child{margin-bottom:0}
.sw__body .sec{margin-top:var(--s-4)}
/* .sw__body .sec__h used --t-md, which styles.mjs marks 'RETIRED alias. Do not use.' It also fought the real .sec__h step. Removed; the shared rule governs. */
/* Every tile is also a real URL: the crawler requirement and the share
   requirement are one requirement. */
.sw__more{display:inline-flex;align-items:baseline;gap:5px;margin-top:var(--row);
  font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-dim);text-decoration:none;border-bottom:1px solid var(--rule)}
.sw__more::after{content:'\\2192';color:var(--ink-faint)}
.sw__more:hover{color:var(--ink);border-bottom-color:var(--accent)}

/* At 375px, five folder tabs measure 620px against a 343px strip, so two of
   the five datasets are off-screen until the reader thinks to swipe a strip
   that gives no sign it scrolls. A tab with a number on it is only a reason to
   press it if it is on the screen, so at phone width the strip becomes a
   two-column grid and every dataset is visible at once. The seam between the
   strip and the frame is what is traded away, and the tab is still the filled,
   bolded, accent-capped one - four signals, none of them colour alone.
   The last tab spans both columns rather than leaving a ragged row.

   The frame's 13px of padding on each side is also 26px the card reel cannot
   spend on a card, so the well tightens here too. */
@media(max-width:519px){
  .sw__tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;
    border-bottom:0;margin-bottom:6px;overflow:visible}
  .sw__tab{justify-content:flex-start;border:1px solid var(--rule);border-radius:var(--radius);
    margin-bottom:0;padding:8px 9px;gap:5px;background:var(--bg-raised)}
  /* The figures group hard right whether the tab carries two of them or three,
     so eight tiles in a two-column grid still read as one aligned column of
     counts rather than three ragged ones. */
  .sw__tn{margin-left:auto}
  .sw__tab::after{left:-1px;right:-1px;top:-1px;border-radius:var(--radius) var(--radius) 0 0}
  .sw__tab:last-child:nth-child(odd){grid-column:1 / -1}
  .sw__tk{overflow:hidden;text-overflow:ellipsis}
  .sw__panels{border-top:1px solid var(--rule);border-radius:var(--radius)}
  .sw__panel{padding:var(--s-3) 10px 12px}
}

.sw__lede{font-size:var(--t-sm);line-height:1.55;color:var(--ink-dim);margin:0 0 var(--s-3);max-width:70ch}
.sw__dark{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink-dim);border:1px dashed var(--rule);
  border-radius:var(--radius);padding:10px 12px;margin:0 0 var(--s-3)}
.sw__dark b{color:var(--dark-src)}

.sw__dl{display:grid;grid-template-columns:1fr;gap:6px 18px;margin:0 0 var(--s-3);padding:0}
@media(min-width:620px){.sw__dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
.sw__dl>div{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px;min-width:0}
.sw__dl dt{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.sw__dl dd{margin:0;font-size:var(--t-sm);color:var(--ink);min-width:0;overflow-wrap:anywhere}

/* --- the race rows ------------------------------------------------------ */
.sw__race{list-style:none;margin:0 0 var(--s-3);padding:0;border-top:1px solid var(--rule)}
.sw__rrow{display:grid;grid-template-columns:2.4ch minmax(0,1fr) auto;gap:2px 9px;align-items:baseline;
  padding:9px 0 10px;border-bottom:1px solid var(--rule)}
.sw__rrank{font-family:var(--mono);font-size: var(--t-xs);color:var(--ink-faint)}
.sw__rname{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sw__rval{display:flex;align-items:baseline;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.sw__pct{font-size: var(--t-base);font-weight:700;color:var(--ink)}
.sw__abs{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.08em;color:var(--ink-faint);
  border:1px dashed var(--rule);border-radius:2px;padding:0 4px}
.sw__rbar{grid-column:2/-1;position:relative;display:block;height:4px;background:var(--wash);border-radius:2px;margin-top:3px}
.sw__rbar i{position:absolute;left:0;top:0;bottom:0;background:var(--avt-a,var(--accent));border-radius:2px}
/* Where the leg traded seven days ago. A position, not a digit — the only thing
   on this panel that shows a change as a place. */
.sw__rbar u{position:absolute;top:-3px;bottom:-3px;width:1px;background:var(--ink-faint);text-decoration:none}
.sw__mv{display:inline-flex;align-items:baseline;gap:4px;font-family:var(--mono);font-size: var(--t-2xs);color:var(--ink-faint)}
.sw__mv b{color:var(--ink-dim);font-weight:700}
.sw__mvu{letter-spacing:.06em}

/* --- substrate ---------------------------------------------------------- */
.sw__read{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px;margin:0 0 var(--s-2)}
.sw__read>b{font-size:var(--t-lg);letter-spacing:.04em;color:var(--accent-2)}
.sw__readn{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.14em;text-transform:uppercase;color:var(--ink)}
.sw__reads{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink-faint)}
.sw__pills{list-style:none;margin:var(--s-3) 0;padding:0;display:grid;gap:9px;grid-template-columns:1fr}
@media(min-width:620px){.sw__pills{grid-template-columns:repeat(3,1fr)}}
.sw__pill{display:flex;flex-direction:column;gap:4px;padding:11px 12px;background:var(--bg-raised);
  border:1px solid var(--rule);border-left:3px solid var(--accent-2);border-radius:var(--radius)}
.sw__pill[data-state="awaiting-baseline"]{border-left-style:dotted;border-left-color:var(--accent-2)}
.sw__pill[data-state="dark"]{border-left-style:dashed;border-left-color:var(--dark-src)}
.sw__pn{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.sw__pb{display:flex;align-items:baseline;gap:5px}
.sw__pv{font-family:var(--mono);font-size:var(--t-lg);font-weight:700;color:var(--ink)}
.sw__pv--none{font-size: var(--t-2xs);font-weight:700;letter-spacing:.12em;color:var(--ink-faint)}
.sw__pu{font-family:var(--mono);font-size: var(--t-2xs);color:var(--ink-faint)}
.sw__pd{font-size: var(--t-xs);color:var(--ink-dim)}
.sw__pc{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.06em;color:var(--ink-faint);margin-top:auto;padding-top:4px}

/* --- digest (optional panel) -------------------------------------------- */
.sw__digest{list-style:none;margin:0 0 var(--s-3);padding:0;border-top:1px solid var(--rule)}
.sw__drow{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;justify-content:space-between;
  padding:9px 0;border-bottom:1px solid var(--rule)}
.sw__dh{font-size: var(--t-sm);line-height:1.35;min-width:0;overflow-wrap:anywhere}
.sw__dm{display:flex;align-items:baseline;gap:8px;font-family:var(--mono);font-size: var(--t-2xs);color:var(--ink-faint)}

/* --- the collapsed source table ---------------------------------------- */
.sw__src{margin:var(--s-3) 0 0;border-top:1px solid var(--rule-soft);padding-top:var(--s-2)}
.sw__srcin{padding-top:var(--s-2)}

/* --- the headline row every panel now opens with ------------------------ */
/* Three or four figures at 21px, before a word of prose. A panel that opens
   with a paragraph is a tab nobody presses twice. The --none form is a word at
   11px, never a numeral, so a missing reading cannot be mistaken at a glance
   for a small one. */
.sw__stats{display:grid;gap:7px;grid-template-columns:repeat(2,minmax(0,1fr));margin:0 0 var(--s-3)}
@media(min-width:620px){.sw__stats{grid-template-columns:repeat(4,minmax(0,1fr))}}
.sw__stat{display:flex;flex-direction:column;gap:2px;min-width:0;padding:8px 10px;
  background:var(--bg-raised);border:1px solid var(--rule);border-radius:var(--radius);
  border-top:2px solid color-mix(in srgb,var(--p,var(--sw-h,var(--accent-2))) 55%,var(--rule))}
.sw__sk{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw__sb{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;min-width:0}
.sw__sv{font-family:var(--mono);font-size:21px;font-weight:700;letter-spacing:-.02em;color:var(--ink);
  font-variant-numeric:tabular-nums;line-height:1.15;overflow-wrap:anywhere}
.sw__sv--none{font-size: var(--t-xs);font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
.sw__su{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.06em;color:var(--ink-faint);overflow-wrap:anywhere}

/* --- meters and signed bars -------------------------------------------- */
/* An unknown draws the dashed empty track, never a zero-width fill: a
   zero-width fill and a zero reading are the same picture and they are not the
   same fact. Same rule the freshness chips have always followed. */
.sw__meter{display:block;position:relative;height:4px;background:var(--wash);border-radius:2px;
  margin:5px 0 3px;overflow:hidden}
.sw__meter i{position:absolute;left:0;top:0;bottom:0;border-radius:2px;
  background:var(--p,var(--sw-h,var(--accent-2)))}
.sw__meter[data-none]{background:transparent;border:1px dashed var(--rule);height:4px}
.sw__db{display:block;position:relative;height:6px;background:var(--wash);border-radius:2px}
/* The centre line IS the zero. Without it the bar is a magnitude and the
   reader has to be told which way is which. */
.sw__db::before{content:'';position:absolute;left:50%;top:-1px;bottom:-1px;width:1px;background:var(--ink-faint)}
.sw__db i{position:absolute;top:0;bottom:0;border-radius:1px}
.sw__db[data-dir="up"] i{background:var(--heat-2)}
.sw__db[data-dir="down"] i{background:var(--heat-5)}
.sw__db[data-dir="flat"] i{background:var(--ink-faint)}
.sw__db[data-none]{background:transparent;border:1px dashed var(--rule)}
.sw__db[data-none]::before{display:none}

/* --- WHAT MOVED, the band above the tabs -------------------------------- */
.sw__moved{margin:0 0 var(--s-3);padding:11px 12px 10px;background:var(--bg-raised);
  border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:var(--radius)}
.sw__mhd{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px var(--s-3);justify-content:space-between}
.sw__mh{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.14em;text-transform:uppercase;
  color:var(--ink);margin:0;font-weight:700}
.sw__mk{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);margin:0;font-variant-numeric:tabular-nums}
.sw__mtop{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin:7px 0 2px}
.sw__msc{display:flex;align-items:baseline;gap:6px}
.sw__msc b{font-family:var(--mono);font-size:22px;font-weight:700;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums;color:var(--ink)}
.sw__msc b[data-dir="up"]{color:var(--heat-2)}
.sw__msc b[data-dir="down"]{color:var(--heat-5)}
.sw__msu{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.06em;color:var(--ink-faint)}
.sw__mlvl{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-dim);border:1px solid var(--rule);border-radius:2px;padding:2px 6px}
.sw__mlvl[data-changed]{color:var(--accent-ink);background:var(--accent);border-color:var(--accent)}
.sw__mds{list-style:none;margin:9px 0 7px;padding:0;display:grid;gap:7px 14px;grid-template-columns:1fr}
@media(min-width:560px){.sw__mds{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:900px){.sw__mds{grid-template-columns:repeat(5,minmax(0,1fr))}}
.sw__md{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;align-items:baseline;min-width:0}
.sw__mdk{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.1em;text-transform:uppercase;
  color:var(--p,var(--ink-dim));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw__md .sw__db{grid-column:1/-1;order:3}
.sw__mdv{font-family:var(--mono);font-size: var(--t-xs);font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink)}
.sw__mdv[data-dir="up"]{color:var(--heat-2)}
.sw__mdv[data-dir="down"]{color:var(--heat-5)}
.sw__mdv--none{font-size: var(--t-2xs);font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
.sw__md[data-state="dark"] .sw__mdk{color:var(--dark-src)}

/* --- the instrument grid ------------------------------------------------ */
.sw__insts{margin:var(--s-3) 0 0}
.sw__ih{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 7px}
.sw__ig{list-style:none;margin:0 0 var(--s-2);padding:0;display:grid;gap:8px;grid-template-columns:1fr}
@media(min-width:560px){.sw__ig{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:900px){.sw__ig{grid-template-columns:repeat(3,minmax(0,1fr))}}
.sw__inst{display:flex;flex-direction:column;gap:2px;min-width:0;padding:9px 11px 10px;
  background:var(--bg-raised);border:1px solid var(--rule);border-radius:var(--radius);
  border-left:3px solid var(--p,var(--sw-h,var(--accent-2)))}
/* Three states, three edges, and the edge is never the only tell — the words
   under each reading say which one it is in full. */
.sw__inst[data-state="awaiting-baseline"]{border-left-style:dotted}
.sw__inst[data-state="dark"]{border-left-style:dashed;border-left-color:var(--dark-src)}
.sw__ik{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.09em;text-transform:uppercase;color:var(--ink-faint);
  overflow-wrap:anywhere}
.sw__iv{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;min-width:0}
.sw__iv b{font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--ink);
  font-variant-numeric:tabular-nums;line-height:1.2}
.sw__ivn{font-family:var(--mono);font-size: var(--t-2xs);font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-faint)}
.sw__iu{font-family:var(--mono);font-size: var(--t-2xs);color:var(--ink-dim);overflow-wrap:anywhere}
.sw__ir{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.06em;color:var(--ink-faint)}
.sw__il{display:block;font-family:var(--mono);font-size: var(--t-2xs);line-height:1.45;color:var(--ink-faint);
  margin-top:auto;padding-top:3px}
.sw__il--dark{color:var(--dark-src)}

/* --- digest additions --------------------------------------------------- */
.sw__strk{font-size:var(--t-sm);line-height:1.5;color:var(--ink-dim);margin:0 0 var(--s-3);
  padding:8px 10px;background:var(--bg-raised);border:1px solid var(--rule);
  border-left:3px solid var(--sw-h,var(--accent-2));border-radius:var(--radius)}
.sw__strk b{color:var(--ink)}
.sw__ds{color:var(--ink);font-weight:700}
.sw__dl2{flex:1 1 100%;min-width:0;display:block;margin-top:2px}
.sw__dlt{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.06em;color:var(--ink-faint)}
.sw__dlt--none{border:1px dashed var(--rule);border-radius:2px;padding:0 4px;display:inline-block}
${rules}
</style>`;
}
