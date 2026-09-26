// /race.html — THE RACE, the key-players leaderboard.
//
// docs/SUB-INDICES.md §1. The operator's brief: "follow key players like Musk
// etc in the AI race and rank their likelihoods." This is the most shareable
// page on the site and it is built on the assumption that it will be
// quote-tweeted by people who disagree with the ranking — which is the point,
// since replies and quotes are weighted 5.0 each in X's open-source ranker.
//
// Three consequences follow from "someone will click through to check this",
// and they shape every decision below:
//
//   1. EVERY NUMBER IS IN THE STATIC HTML. No JavaScript runs on this page at
//      all. pizzint client-renders, so their first paint is
//      "LOADING TACTICAL DATA...", their screenshots come out blank and
//      crawlers see nothing (docs/TEARDOWN.md §3.3). When the growth loop is
//      people screenshotting your table, that is self-harm.
//   2. EVERY NUMBER CARRIES ITS SOURCE. The market event is linked by name,
//      the resolution date is printed, the leg volume is printed, and
//      api/race.json carries the raw inputs.
//   3. NO NUMBER IS INVENTED. Five distinct absences are rendered as five
//      distinct things and never as zero:
//        no market   the venue lists no contract for this player
//        no ref      the venue has no week-old price to difference against
//        absent      the player does not use this channel at all
//        dark        the fetch failed
//        0           we looked, the channel answered, the answer is zero
//      Collapsing any of these into "0%" would be the same category error as
//      pizzint printing a confident DOUGHCON 5 over a scraper managing two
//      successful runs a day.
//
// MOTION. docs/MOTION.md §4 gives the test: "can I name the real event this
// motion represents?" On a ranked table the only real events are the 7-day
// deltas, and those are already drawn — as a number, as a direction glyph, and
// as a tick on each bar showing where the price sat a week ago. There is
// nothing left for an animation to mean, so this page ships none, and it ships
// no script to run one. The only transition is the hover/focus affordance on a
// row, and it is disabled under prefers-reduced-motion.

import { esc, utc, utcDay, num } from './_html.mjs';
import { page } from './layout.mjs';
import { avatarSprite, personIdFor, PEOPLE } from './_avatars.mjs';
import * as brand from '../brand.mjs';

const PATH = '/race.html';

// Cap on the JSON-LD ItemList. The roster is eight, so this never bites today;
// it exists so that growing the roster cannot silently emit a graph larger than
// the markup it describes, which is the failure newsPage.mjs hit at 200 items.
const JSONLD_MAX = 50;

/** build.mjs guard: is there anything to build this page from? */
export function hasRace(ctx) {
  return Boolean(ctx && ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length > 0);
}

// ---------------------------------------------------------------------------
// Formatting. Every one of these is a pure function and every one of them has
// an explicit branch for "we do not have this number".
// ---------------------------------------------------------------------------

function pct(p, places = 1) {
  if (!Number.isFinite(p)) throw new Error(`racePage pct(): expected a finite probability, got ${JSON.stringify(p)}`);
  return `${(p * 100).toFixed(places)}%`;
}

/** Probability points, signed, with U+2212 so a column of deltas does not jitter. */
function pts(p, places = 1) {
  if (!Number.isFinite(p)) throw new Error(`racePage pts(): expected a finite number, got ${JSON.stringify(p)}`);
  const v = p * 100;
  const body = Math.abs(v).toFixed(places);
  if (v > 0) return `+${body}`;
  if (v < 0) return `−${body}`;
  return `±${body}`;
}

/** Direction as a SHAPE. Colour confirms it; it never carries it alone. */
function arrow(delta) {
  if (delta > 0) return '▲';
  if (delta < 0) return '▼';
  // No glyph for exactly flat. The U+00B1 in the number is already the shape
  // signal, and an em dash in front of it rendered as "—±0.0", which reads
  // like a typo rather than like zero.
  return '';
}

function dirWord(delta) {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'unchanged';
}

function money(n) {
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function compact(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

// The words the page uses for a missing number. One vocabulary, defined once,
// and the legend under the table prints this same table so the reader is never
// guessing what a dash means.
const ABSENCE = {
  no_market: { mark: 'no market', title: 'This venue lists no contract for this player. That is not a low probability — nobody is offering the bet.' },
  no_reference: { mark: 'no ref', title: 'The venue has no price from a week ago to difference against. Not zero movement — no reference point.' },
  absent: { mark: 'not used', title: 'This player does not publish to this channel at all. Different from having published nothing this month.' },
  dark: { mark: 'DARK', title: 'The fetch or the parse failed on this run. The value is unknown, and it is never filled in.' },
  halves_too_thin: { mark: 'too thin', title: 'One half of the news window carried too few items for a share comparison to mean anything.' },
};

function absent(kind) {
  const a = ABSENCE[kind];
  if (!a) throw new Error(`racePage absent(): unknown absence kind ${JSON.stringify(kind)}`);
  return `<span class="rab" title="${esc(a.title)}">${esc(a.mark)}</span>`;
}

// ---------------------------------------------------------------------------
// THE PICTURE OF THE RACE
//
// Until this pass /race was a table of numbers ABOUT a horse race with no
// picture OF the race in it: the largest graphic on the page was a 22px strip
// and the next largest was a 16px glyph. Two large SVGs now carry the story.
//
// Everything below is drawn from ctx.race and nothing else. No new collector,
// no new number, no imputation. A lab with no leg on the board is drawn as
// NO MARKET, a lab with no week-old price is drawn as NO 7D REF, and a dark
// venue is drawn as DARK — never as a point at zero, never as a flat line.
//
// WHY THE SVG IS WRITTEN HERE AND NOT IN _charts.mjs. That kit's public
// surface is five index-shaped charts — indexHistoryChart, pillarRanked,
// sparkline, gauge, distributionStrip — and every one of them is wired to
// brand.PILLARS and the 0–100 index scale; pillarRanked's rows ARE the five
// pillars, by name. Its primitives (openSvg, seal, figure, textAt, hashId)
// are module-private and this pass does not own that file. So what is reused
// is the CONTRACT it publishes, character for character:
//
//   .ch / .ch__svg / .ch__cap        the classes styles.mjs already themes
//   style="--w:<viewBox width>px"    never upscaled past its design size
//   .ch__svg--sm / .ch__svg--lg      two geometries, toggled at 640px, both
//                                    in the HTML, one displayed — NOT one
//                                    geometry stretched
//   content-hashed element ids       no counter, no clock, no random
//   <title> + <desc> + <figcaption>  the finding survives the SVG not painting
//   missing is a state, not a zero
//
// COLOUR. Every hue is var(--avt-a), which site/styles.mjs already publishes
// per [data-org] in BOTH schemes from _labs.mjs's own table. Not one hex is
// typed in this file, no company's colour is invented, and everything a hue
// encodes is also ranked, named and numbered in text beside it.
//
// MARKS. The emblems are the principal marks from _avatars.mjs, reached
// through its exported sprite, so the shape beside Anthropic here is the shape
// beside Anthropic on the watch floor. They are decoration and they are never
// the identification: the lab's name is printed next to every one of them, and
// a lab whose principal nobody has published gets that module's own empty
// frame rather than a borrowed emblem.
// ---------------------------------------------------------------------------

const f2 = (v) => Number(v).toFixed(2);

/**
 * The precision the GRAPHICS print a probability at.
 *
 * The table prints two decimals below 10% because a column of numbers is read
 * by comparing digits and 0.55 against 0.15 needs both of them. A chart is read
 * by comparing POSITIONS, the digits are a confirmation, and "9.50%" printed
 * next to a dot reads as false precision on a market that quotes in cents. So:
 * one decimal at or above one per cent, two below it, which is the finest
 * distinction the live data actually contains (0.15% vs 0.55%).
 */
function pctG(p) {
  return pct(p, p >= 0.01 ? 1 : 2);
}

/** Deterministic, content-derived element ids. A counter would make the output
 *  depend on call order and a random suffix would break byte-determinism. */
function chHash(prefix, payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${prefix}${h.toString(36)}`;
}

function svgOpen(cls, w, h, tid, did) {
  return `<svg class="ch__svg ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" ` +
    `role="img" aria-labelledby="${tid} ${did}" style="--w:${w}px">` +
    `<title id="${tid}">__T__</title><desc id="${did}">__D__</desc>`;
}

// Function replacements, not string ones: money() emits "$1.41M" and a bare
// "$1" in a string replacement is a capture-group reference.
function svgSeal(svg, title, desc) {
  return svg.replace('__T__', () => esc(title)).replace('__D__', () => esc(desc));
}

function tx(cls, x, y, anchor, size, content) {
  const a = anchor ? ` text-anchor="${anchor}"` : '';
  return `<text class="${cls}" x="${f2(x)}" y="${f2(y)}"${a} font-size="${size}">${esc(content)}</text>`;
}

function ln(cls, x1, y1, x2, y2) {
  return `<line class="${cls}" x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}"/>`;
}

function circ(cls, cx, cy, r) {
  return `<circle class="${cls}" cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}"/>`;
}

function figure(cls, svgs, caption) {
  return `<figure class="ch ${cls}">${svgs}` +
    (caption ? `<figcaption class="ch__cap">${esc(caption)}</figcaption>` : '') +
    `</figure>`;
}

/**
 * The emblem for a lab.
 *
 * Resolved through _avatars.personIdFor, which takes the principal's name as
 * data/race.json writes it and falls back to the lab id. Alibaba Qwen has
 * `"principal": null` and no entry in that module, so it resolves to nothing
 * and gets `frame` — the unlettered "nobody's" shape that module keeps for
 * exactly this case. Inventing a mark for them would be the same category
 * error as inventing a probability.
 */
function markFor(p) {
  const pid = personIdFor(p.principal) || personIdFor(p.id);
  const person = pid ? PEOPLE[pid] : null;
  return { shape: person ? person.shape : 'frame', person: person ? person.name : null };
}

function emblem(shape, x, y, size) {
  return `<use class="rfc__mk" href="#dc-avt-${esc(shape)}" x="${f2(x)}" y="${f2(y)}" ` +
    `width="${f2(size)}" height="${f2(size)}"/>`;
}

/**
 * One row per player, in the leaderboard's own order, with every absence
 * carried as its own named state rather than flattened to null.
 *
 * `then` is the price a week ago: the live price minus the venue's own
 * published 7-day change. That is not a reconstruction and not a model — it is
 * the same arithmetic the tick on every table row already draws, and it is the
 * ONLY prior observation this dataset holds. There is no series in
 * data/race.json and none is manufactured here.
 */
function chartRows(race) {
  const ranked = race.players.filter((p) => p.rank !== null);
  const unranked = race.players.filter((p) => p.rank === null);
  return [...ranked, ...unranked].map((p) => {
    const m = p.market || {};
    const prob = Number.isFinite(m.probability) ? m.probability : null;
    const d7 = Number.isFinite(m.change_7d) ? m.change_7d : null;
    const then = prob !== null && d7 !== null ? Math.max(0, Math.min(1, prob - d7)) : null;
    const mk = markFor(p);
    return {
      id: p.id,
      name: p.name,
      rank: p.rank,
      prob,
      d7,
      then,
      shape: mk.shape,
      state: prob === null ? (m.state === 'dark' ? 'dark' : 'no_market') : 'live',
      d7state: d7 === null ? (m.change_7d_state === 'no_market' ? 'no_market' : 'no_reference') : 'live',
    };
  });
}

// ---------------------------------------------------------------------------
// 1. THE FIELD — a ranked lollipop of every lab on the board
//
// A lollipop rather than a bar, and the live data is the argument. Anthropic
// holds 73.5% and Mistral holds 0.15%: as bars that is one block and seven
// hairlines, and a hairline at 1px reads as "nothing", which is a different
// claim from "0.15%". A dot is the same size wherever it lands, so the tail is
// legible as POSITION while the length of the stem still carries the
// comparison. The scale stays absolute 0–100% for the reason the table's bars
// already give: rescaling to make the tail fill the frame would draw a race
// that is not happening.
//
// The hollow ring is where that leg traded seven days ago. It is the only
// thing on the page that shows a change as a POSITION, it sits on the same
// axis as the value it moved from, and it is simply absent on a row with no
// week-old reference rather than being drawn on top of the dot.
// ---------------------------------------------------------------------------

const FIELD_LG = {
  w: 720, rowH: 40, top: 42, bottom: 34, twoLine: false,
  markX: 2, markS: 26, rankX: 50, nameX: 58, trackX: 208, trackW: 400,
  fsAx: 10, fsRank: 12, fsName: 13, fsVal: 15.5, fsDel: 10.5, fsNone: 10,
  dotR: 6.6, thenR: 4.4, ticks: [0, 25, 50, 75, 100],
  legend: '● NOW    ○ 7 DAYS AGO',
};

const FIELD_SM = {
  w: 356, rowH: 46, top: 38, bottom: 30, twoLine: true,
  markX: 2, markS: 18, rankX: 36, nameX: 42, trackX: 2, trackW: 298,
  fsAx: 9, fsRank: 10, fsName: 11, fsVal: 13.5, fsDel: 9.5, fsNone: 9,
  dotR: 5.4, thenR: 3.7, ticks: [0, 50, 100],
  legend: '● NOW  ○ 7D AGO',
};

// A THIRD GEOMETRY, AND THE REASON IS A MEASUREMENT RATHER THAN AN APPETITE.
// This site's wrap is 1240px and /race runs the full width of it, so at 1440
// a 720-unit chart leaves a third of the page empty on either side. The kit's
// rule is NEVER UPSCALE, not "never draw big": upscaling blows type up past
// the size it was designed at, and the answer to a wide viewport is a chart
// DESIGNED wide, not the same one stretched. So the rows are taller, the
// emblems are 30px, the type is a size up, and the plot is 710 units long
// instead of 400. Below 1120px this drawing is not in the layout at all.
const FIELD_XL = {
  w: 1100, rowH: 48, top: 48, bottom: 38, twoLine: false,
  markX: 4, markS: 30, rankX: 62, nameX: 72, trackX: 250, trackW: 710,
  fsAx: 11, fsRank: 13, fsName: 15, fsVal: 18, fsDel: 12, fsNone: 11,
  dotR: 8, thenR: 5.2, ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  legend: '● NOW    ○ 7 DAYS AGO',
};

function fieldPlot(rows, g, tid, did, variantCls) {
  const n = Math.max(rows.length, 1);
  const h = g.top + n * g.rowH + g.bottom;
  const X = (p) => g.trackX + Math.max(0, Math.min(1, p)) * g.trackW;

  let out = svgOpen(`rfc ${variantCls}`, g.w, h, tid, did);

  out += tx('rfc__axt', 2, 13, 'start', g.fsAx, 'SHARE OF THE YEAR-END MARKET');
  out += tx('rfc__axt', g.w - 2, 13, 'end', g.fsAx, g.legend);

  const gridTop = g.top - 6;
  const gridBot = g.top + n * g.rowH + 6;
  for (const t of g.ticks) {
    const x = g.trackX + (t / 100) * g.trackW;
    out += ln(t === 0 ? 'rfc__grid rfc__grid--zero' : 'rfc__grid', x, gridTop, x, gridBot);
    const anchor = t === 0 ? 'start' : t === 100 ? 'end' : 'middle';
    out += tx('rfc__ax', x, g.top - 12, anchor, g.fsAx, `${t}%`);
    out += tx('rfc__ax', x, gridBot + 14, anchor, g.fsAx, `${t}%`);
  }

  rows.forEach((r, i) => {
    const y0 = g.top + i * g.rowH;
    const mid = y0 + g.rowH / 2;
    const nameY = g.twoLine ? y0 + 14 : mid + 4.5;
    const barY = g.twoLine ? y0 + 31 : mid;
    const valY = g.twoLine ? y0 + 14 : mid - 1;
    const delY = g.twoLine ? y0 + 36 : mid + 13;
    const valX = g.twoLine ? g.w - 2 : g.w - 2;

    out += `<g class="rfc__r" data-org="${esc(r.id)}">`;
    out += emblem(r.shape, g.markX, (g.twoLine ? y0 + 2 : mid - g.markS / 2), g.markS);
    out += tx('rfc__rank', g.rankX, nameY, 'end', g.fsRank, r.rank === null ? '—' : String(r.rank));
    out += tx('rfc__name', g.nameX, nameY, 'start', g.fsName, r.name);

    if (r.prob === null) {
      // Dashed outline, the word, no dot. Three signals that this is not a
      // measurement of zero.
      out += `<rect class="rfc__none" x="${f2(g.trackX)}" y="${f2(barY - 7)}" ` +
        `width="${f2(g.trackW)}" height="14"/>`;
      out += tx('rfc__nonet', g.trackX + 7, barY + 3.5, 'start', g.fsNone,
        r.state === 'dark' ? 'DARK · the fetch failed' : 'NO MARKET · nobody is offering this bet');
      out += tx('rfc__val rfc__val--none', valX, valY, 'end', g.fsVal, '—');
    } else {
      const xn = X(r.prob);
      out += ln('rfc__track', g.trackX, barY, g.trackX + g.trackW, barY);
      if (xn - g.trackX > 1.2) out += ln('rfc__stem', g.trackX, barY, xn, barY);
      if (r.then !== null) out += circ('rfc__then', X(r.then), barY, g.thenR);
      out += circ('rfc__dot', xn, barY, g.dotR);
      out += tx('rfc__val', valX, valY, 'end', g.fsVal, pctG(r.prob));
    }

    const dtxt = r.d7 === null
      ? (r.d7state === 'no_market' ? 'no market' : 'no 7d ref')
      : `${arrow(r.d7)}${arrow(r.d7) ? ' ' : ''}${pts(r.d7, 1)} pts`;
    out += `<text class="rfc__del" data-dir="${esc(r.d7 === null ? 'none' : dirWord(r.d7))}" ` +
      `x="${f2(valX)}" y="${f2(delY)}" text-anchor="end" font-size="${g.fsDel}">${esc(dtxt)}</text>`;
    out += `</g>`;
  });

  return `${out}</svg>`;
}

function fieldChart(race) {
  const rows = chartRows(race);
  const live = rows.filter((r) => r.prob !== null);
  const lead = live[0] || null;
  const runner = live[1] || null;

  const id = chHash('rfc', rows.map((r) => `${r.id}:${r.prob}:${r.d7}:${r.state}`).join(','));

  const title = 'Frontier labs ranked by the live year-end market probability';
  const desc = live.length === 0
    ? 'No lab has a live market probability on this run. ' +
      rows.map((r) => `${r.name} is ${r.state === 'dark' ? 'dark' : 'not listed'}`).join('; ') + '.'
    : `Each dot is the live price of that lab's leg, on an absolute 0 to 100 per cent axis; the ` +
      `hollow ring beside it is where the leg traded seven days ago. ` +
      live.map((r) => `${r.name} ${pctG(r.prob)}` +
        (r.d7 === null ? ', no seven-day reference' : `, ${dirWord(r.d7)} ${pts(r.d7, 1)} points`)).join('. ') +
      '.' +
      (rows.length > live.length
        ? ` Not on the board: ${rows.filter((r) => r.prob === null).map((r) => r.name).join(', ')}.`
        : '');

  const caption = live.length === 0
    ? 'The ranking market is dark on this run. No probability is drawn for any lab, and none is guessed.'
    : lead && runner
      ? `${lead.name} holds ${pct(lead.prob, 1)} of the year-end market — ` +
        `${num((lead.prob - runner.prob) * 100, 1)} points clear of ${runner.name} at ${pct(runner.prob, 1)}. ` +
        `The hollow ring on each row is where that leg traded seven days ago; a row with no ring has no week-old price to difference against.`
      : lead
        ? `${lead.name} holds ${pct(lead.prob, 1)} of the year-end market and is the only lab with a live leg.`
        : 'No lab has a live leg on the ranking market.';

  const sm = svgSeal(fieldPlot(rows, FIELD_SM, `${id}ts`, `${id}ds`, 'ch__svg--sm'), title, desc);
  const lg = svgSeal(fieldPlot(rows, FIELD_LG, `${id}tl`, `${id}dl`, 'ch__svg--lg'), title, desc);
  const xl = svgSeal(fieldPlot(rows, FIELD_XL, `${id}tx`, `${id}dx`, 'rfc--xl'), title, desc);
  return figure('ch--field', sm + lg + xl, caption);
}

// ---------------------------------------------------------------------------
// 2. SEVEN DAYS — where each leg moved from, and to
//
// THIS IS TWO OBSERVATIONS PER LAB, NOT A SERIES, AND THE CHART SAYS SO.
// data/race.json carries no history: one price per leg and one 7-day change.
// So each lab gets exactly two points — the live price, and the price implied
// by the venue's own published change — joined by one straight segment. That
// segment is a JOIN, not a path: nothing between the two ends was recorded and
// nothing between them is claimed. Drawing a smooth seven-day curve through
// two points would be the invented number this whole project exists to not
// print. The caption and the axis header both say it in words.
//
// TWO PANELS, ONE MAGNIFIED, BOTH LABELLED WITH THEIR OWN DOMAIN. On the live
// data the leader is 6.7x the next lab, so on a single 0–100% axis the other
// seven are a smudge on the floor. The second panel is the same data on its
// own axis, with the axis printed, which is a magnifier and not a rescaling of
// the story — panel one still shows the true shape of the board. The panel
// only appears when the ratio actually warrants it (3x), computed from the
// data, so it cannot quietly persist after the field closes up.
//
// DIRECTION IS A SHAPE. The "now" end is a triangle pointing the way the price
// moved and a square when it did not move; the "then" end is always a hollow
// circle. Hue is the lab and is never the reading.
// ---------------------------------------------------------------------------

// Axis ceilings. A fixed ladder rather than a computed "nice" number, so the
// axis label is always a round figure a reader can hold in their head and two
// builds can never disagree about rounding.
const AXIS_STEPS = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25, 30, 40, 50, 60, 75, 80, 100];

function axisCeil(v) {
  for (const s of AXIS_STEPS) if (v <= s + 1e-9) return s;
  return 100;
}

// Gridline values that are round numbers, not max/4. An axis ceiling of 75
// divided into four gives 18.75, which prints as "19%" and makes the reader
// do arithmetic to find out it is not 19. Pick the smallest step off the same
// ladder that divides the ceiling exactly and does not overrun the line budget.
function axisTicks(max, maxIntervals) {
  for (const step of AXIS_STEPS) {
    if (step > max) break;
    const k = max / step;
    if (Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) <= maxIntervals && Math.round(k) >= 2) {
      const out = [];
      for (let i = 0; i <= Math.round(k); i += 1) out.push(step * i);
      return out;
    }
  }
  return [0, max / 2, max];
}

function fmtAxis(v) {
  return Math.abs(v - Math.round(v)) < 1e-9 ? `${Math.round(v)}%` : `${v.toFixed(1)}%`;
}

/**
 * Keep labels from landing on top of each other, deterministically: sort by
 * the y they want, walk down pushing each one clear of the last, then walk
 * back up if the column overflowed the plot. Ties break on the lab id so the
 * output cannot depend on array order.
 */
function spreadLabels(items, minGap, lo, hi) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  let prev = lo - minGap;
  for (const it of sorted) {
    it.ly = Math.max(it.y, prev + minGap);
    prev = it.ly;
  }
  if (sorted.length && sorted[sorted.length - 1].ly > hi) {
    let next = hi + minGap;
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      sorted[i].ly = Math.min(sorted[i].ly, next - minGap);
      next = sorted[i].ly;
    }
  }
  return sorted;
}

function endMark(d7, x, y, r) {
  if (d7 > 0) {
    return `<path class="rmv__now" d="M${f2(x)} ${f2(y - r * 1.2)} L${f2(x + r)} ${f2(y + r * 0.8)} ` +
      `L${f2(x - r)} ${f2(y + r * 0.8)} Z"/>`;
  }
  if (d7 < 0) {
    return `<path class="rmv__now" d="M${f2(x)} ${f2(y + r * 1.2)} L${f2(x + r)} ${f2(y - r * 0.8)} ` +
      `L${f2(x - r)} ${f2(y - r * 0.8)} Z"/>`;
  }
  return `<rect class="rmv__now" x="${f2(x - r * 0.85)}" y="${f2(y - r * 0.85)}" ` +
    `width="${f2(r * 1.7)}" height="${f2(r * 1.7)}"/>`;
}

const MOVE_LG = {
  variant: 'lg', w: 720, panelH: 306, gap: 26, padT: 46, padB: 30, axW: 34, labelW: 138, footH: 30,
  fsT: 10, fsAx: 9.5, fsCol: 9.5, fsLab: 9.5, fsFoot: 9.5, dotR: 4.4, minGap: 12.5, wide: true,
};

const MOVE_SM = {
  variant: 'sm', w: 356, panelH: 246, gap: 16, padT: 44, padB: 28, axW: 30, labelW: 132, footH: 30,
  fsT: 9.5, fsAx: 9, fsCol: 9, fsLab: 9, fsFoot: 9, dotR: 3.9, minGap: 11, wide: false,
};

// The wide drawing, for the same reason FIELD_XL exists.
const MOVE_XL = {
  variant: 'xl', w: 1100, panelH: 396, gap: 34, padT: 56, padB: 34, axW: 42, labelW: 182, footH: 34,
  fsT: 11.5, fsAx: 10.5, fsCol: 10.5, fsLab: 11, fsFoot: 10.5, dotR: 5.4, minGap: 15.5, wide: true,
};

const VARIANT_CLS = { sm: 'ch__svg--sm', lg: 'ch__svg--lg', xl: 'rmv--xl' };

function movePanel(panel, g, box) {
  const { x0, y0, w: pw, h: ph } = box;
  const plotL = x0 + g.axW;
  const plotR = x0 + pw - g.labelW;
  const x1 = plotL + 10;
  const x2 = plotR - 14;
  const pt = y0 + g.padT;
  const pb = y0 + ph - g.padB;
  const Y = (v) => pb - (Math.max(0, Math.min(panel.max, v)) / panel.max) * (pb - pt);

  let out = tx('rmv__t', x0, y0 + 14, 'start', g.fsT, panel.title);

  for (const v of axisTicks(panel.max, g.wide ? 5 : 4)) {
    const y = Y(v);
    out += ln(v === 0 ? 'rmv__grid rmv__grid--zero' : 'rmv__grid', plotL, y, plotR, y);
    out += tx('rmv__ax', plotL - 5, y + 3, 'end', g.fsAx, fmtAxis(v));
  }

  out += ln('rmv__col', x1, pt - 6, x1, pb);
  out += ln('rmv__col', x2, pt - 6, x2, pb);
  out += tx('rmv__col-h', x1, pt - 13, 'middle', g.fsCol, '7 DAYS AGO');
  out += tx('rmv__col-h', x2, pt - 13, 'middle', g.fsCol, 'NOW');

  if (panel.series.length === 0) {
    out += tx('rmv__empty', (x1 + x2) / 2, (pt + pb) / 2 - 7, 'middle', g.fsT + 2.5, panel.emptyWord);
    out += tx('rmv__ax', (x1 + x2) / 2, (pt + pb) / 2 + 10, 'middle', g.fsAx, panel.emptyWhy);
    return out;
  }

  const labels = spreadLabels(
    panel.series.map((s) => ({ id: s.id, y: Y(s.prob * 100) + 3.2, s })),
    g.minGap, pt + 4, pb + 2
  );

  for (const s of panel.series) {
    const ya = Y(s.then * 100);
    const yb = Y(s.prob * 100);
    out += `<g class="rmv__s" data-org="${esc(s.id)}">`;
    out += ln('rmv__halo', x1, ya, x2, yb);
    out += ln('rmv__line', x1, ya, x2, yb);
    out += circ('rmv__then', x1, ya, g.dotR);
    out += endMark(s.d7, x2, yb, g.dotR + 0.9);
    out += `</g>`;
  }

  for (const it of labels) {
    const s = it.s;
    const yb = Y(s.prob * 100);
    out += `<g class="rmv__s" data-org="${esc(s.id)}">`;
    out += `<polyline class="rmv__lead" points="${f2(x2 + g.dotR + 3)},${f2(yb)} ` +
      `${f2(plotR - 3)},${f2(it.ly - 3.2)} ${f2(plotR + 2)},${f2(it.ly - 3.2)}"/>`;
    out += tx('rmv__lab', plotR + 5, it.ly, 'start', g.fsLab,
      `${s.name} ${pctG(s.prob)}`);
    out += `</g>`;
  }

  return out;
}

function moveChart(race) {
  const rows = chartRows(race);
  const series = rows.filter((r) => r.prob !== null && r.then !== null);
  const noRef = rows.filter((r) => r.prob !== null && r.then === null);

  const byProb = [...series].sort((a, b) => b.prob - a.prob || a.id.localeCompare(b.id));
  const pack = byProb.slice(1);
  const packMax = pack.length ? Math.max(...pack.map((s) => Math.max(s.prob, s.then) * 100)) : 0;
  const fullMax = series.length ? axisCeil(Math.max(...series.map((s) => Math.max(s.prob, s.then) * 100))) : 100;
  const wantDetail = pack.length >= 2 && packMax > 0 && (byProb[0].prob * 100) / packMax >= 3;
  const detailMax = wantDetail ? axisCeil(packMax) : null;

  // Three absences, three sentences. Merging them into one "no data" line is
  // exactly the collapse this page refuses everywhere else: a venue that lists
  // no contract, a venue with no week-old price, and a fetch that failed are
  // three different facts about three different things.
  const dark = rows.filter((r) => r.state === 'dark');
  const notListed = rows.filter((r) => r.state === 'no_market');
  const allDark = rows.length > 0 && dark.length === rows.length;

  const panels = [{
    key: 'full',
    max: fullMax,
    series,
    title: `THE WHOLE FIELD · 0–${fullMax}%`,
    emptyWord: allDark ? 'DARK' : 'NO 7-DAY REFERENCE',
    emptyWhy: allDark
      ? 'the venue did not answer on this run'
      : 'no week-old price to difference against',
  }];
  if (wantDetail) {
    panels.push({
      key: 'detail',
      max: detailMax,
      series: pack,
      title: `THE CHASING PACK · 0–${detailMax}%, MAGNIFIED`,
      emptyWord: 'NO 7-DAY REFERENCE',
      emptyWhy: 'no week-old price to difference against',
    });
  }

  const footBits = [];
  if (noRef.length) footBits.push(`NO 7D REFERENCE, NOT DRAWN: ${noRef.map((r) => r.name).join(', ')}`);
  if (notListed.length) footBits.push(`NOT LISTED ON THIS MARKET: ${notListed.map((r) => r.name).join(', ')}`);
  if (dark.length) footBits.push(`DARK, THE FETCH FAILED: ${dark.map((r) => r.name).join(', ')}`);
  const foot = footBits.join('   ·   ');

  const id = chHash('rmv', `${panels.map((p) => `${p.key}:${p.max}`).join('|')}|` +
    rows.map((r) => `${r.id}:${r.prob}:${r.then}:${r.d7state}`).join(','));

  const biggest = series.length
    ? [...series].sort((a, b) => Math.abs(b.d7) - Math.abs(a.d7) || a.id.localeCompare(b.id))[0]
    : null;

  const title = 'Where each lab’s year-end odds moved over seven days';
  const desc = series.length === 0
    ? 'No lab has both a live price and a seven-day reference on this run, so no movement is drawn.'
    : 'Two observations per lab, joined by a straight line: the price the venue published seven days ' +
      'ago and the price it publishes now. Nothing between those two points was recorded and nothing ' +
      'between them is drawn as data. ' +
      series.map((s) => `${s.name} went from ${pctG(s.then)} to ` +
        `${pctG(s.prob)}, ${dirWord(s.d7)} ${pts(s.d7, 1)} points`).join('. ') + '.' +
      (noRef.length ? ` No seven-day reference, and so not drawn: ${noRef.map((r) => r.name).join(', ')}.` : '');

  const caption = series.length === 0
    ? (allDark
        ? 'The ranking market is dark on this run: the fetch failed, no price was read for any lab, and ' +
          'nothing is carried over from the last run. An empty chart is the honest picture of that.'
        : 'No lab carries both a live price and a week-old price on this run, so nothing is drawn. This ' +
          'is the absence of a reading, not a week of no movement.')
    : `Biggest seven-day move: ${biggest.name}, ${dirWord(biggest.d7)} ${pts(biggest.d7, 1)} points, from ` +
      `${pctG(biggest.then)} to ${pctG(biggest.prob)}. ` +
      'Two observations per lab — now, and the price implied by the venue’s own 7-day change. ' +
      'data/race.json holds no series, so the line between them is a join and not a path: nothing was ' +
      'recorded in between and nothing in between is drawn.' +
      (wantDetail ? ' The right-hand panel is the same data on its own printed axis, because the leader is more than three times the next lab.' : '');

  const plot = (g) => {
    // Side by side where there is room, stacked on a phone. Same panels, same
    // numbers, same axes - only the arrangement changes.
    const cols = g.variant === 'sm' ? 1 : panels.length;
    const rowsOfPanels = Math.ceil(panels.length / cols);
    const pw = cols === 1 ? g.w : (g.w - g.gap * (cols - 1)) / cols;
    const h = rowsOfPanels * g.panelH + (rowsOfPanels - 1) * (cols === 1 ? g.gap : 0) + g.footH;
    const tid = `${id}t${g.variant}`;
    const did = `${id}d${g.variant}`;
    let out = svgOpen(`rmv ${VARIANT_CLS[g.variant]}`, g.w, h, tid, did);
    panels.forEach((p, i) => {
      const col = cols === 1 ? 0 : i;
      const row = cols === 1 ? i : 0;
      out += movePanel(p, g, {
        x0: col * (pw + g.gap),
        y0: row * (g.panelH + g.gap),
        w: pw,
        h: g.panelH,
      });
    });
    if (foot) out += tx('rmv__foot', 2, h - 10, 'start', g.fsFoot, foot);
    return `${out}</svg>`;
  };

  const sm = svgSeal(plot(MOVE_SM), title, desc);
  const lg = svgSeal(plot(MOVE_LG), title, desc);
  const xl = svgSeal(plot(MOVE_XL), title, desc);
  return figure('ch--move', sm + lg + xl, caption);
}

// ---------------------------------------------------------------------------
// The two big graphics, as one section.
// ---------------------------------------------------------------------------

function raceGraphics(race) {
  return `<section class="sec rgfx" aria-labelledby="rgfx-h">
  <h2 class="sec__h" id="rgfx-h">The field</h2>
  <p class="rnote rgfx__lede">Every lab on the board, on one absolute 0&ndash;100% axis. The dot is the
     price now; the hollow ring is where that leg traded seven days ago. Nothing is normalised to the
     leader &mdash; one lab really is most of this market.</p>
  ${fieldChart(race)}
</section>

<section class="sec rgfx" aria-labelledby="rgfx-move-h">
  <h2 class="sec__h" id="rgfx-move-h">Seven days</h2>
  <p class="rnote rgfx__lede">Two observations per lab and a line joining them. There is no price
     history in <code>race.json</code>, so there is no curve here to draw and none is invented.</p>
  ${moveChart(race)}
</section>`;
}

// ---------------------------------------------------------------------------
// The market bar
// ---------------------------------------------------------------------------

/**
 * One player's probability as a bar, with a tick where the price sat a week ago.
 *
 * The bar is on an ABSOLUTE 0-100 scale, not normalised to the leader. On the
 * live data that makes seven of eight bars hairlines next to a 73.5% leader,
 * and that is the correct picture: one lab is not marginally ahead, it is the
 * whole market. Rescaling to make the tail legible would draw a race that is
 * not happening.
 *
 * A non-zero probability gets at least 2px so "small" never renders as "none" —
 * the number printed beside it carries the actual value, always.
 *
 * The tick is the only thing on this page that shows a change as a POSITION
 * rather than as a digit, and it is real data: probability minus the venue's own
 * 7-day change is where the leg traded a week ago.
 */
function marketBar(probability, change7d) {
  const now = Math.max(0, Math.min(1, probability));
  const width = now === 0 ? 0 : Math.max(0.6, now * 100);
  const then = Number.isFinite(change7d) ? Math.max(0, Math.min(1, probability - change7d)) : null;

  const tick = then === null
    ? ''
    : `<i class="rbar__then" style="left:${(then * 100).toFixed(3)}%" aria-hidden="true"></i>`;

  const label = then === null
    ? `${pct(probability, 2)} of the market`
    : `${pct(probability, 2)} of the market, ${pct(then, 2)} a week ago`;

  return `<span class="rbar" role="img" aria-label="${esc(label)}">` +
    `<i class="rbar__fill" style="width:${width.toFixed(3)}%"></i>${tick}</span>`;
}

/**
 * The whole negRisk market as one stacked bar — the hero graphic.
 *
 * This is the shape of the instrument made visible: mutually-exclusive legs
 * whose prices sum to roughly 1. Our eight are named; everything else on the
 * board collapses into one trailing segment rather than being dropped, because
 * dropping it would make the bar sum to less than the market does and quietly
 * overstate our roster's share.
 *
 * Widths are normalised by the observed sum (1.04 on the live data, not 1.00 —
 * that spread is the bid/ask, and it is printed underneath rather than divided
 * away in silence).
 */
function partitionBar(race) {
  const poly = race.markets?.polymarket;
  if (!poly?.ok || !Array.isArray(poly.horizon?.legs) || poly.horizon.legs.length === 0) return '';

  const legs = poly.horizon.legs;
  const total = legs.reduce((s, l) => s + l.probability, 0);
  if (!(total > 0)) return '';

  const byTitle = new Map(legs.map((l) => [l.title.toLowerCase(), l]));
  const mine = [];
  const claimed = new Set();
  for (const p of race.players) {
    if (p.market.probability === null || !p.market.leg_title) continue;
    const leg = byTitle.get(p.market.leg_title.toLowerCase());
    if (!leg || claimed.has(leg.title)) continue;
    claimed.add(leg.title);
    mine.push({ name: p.name, id: p.id, probability: leg.probability });
  }
  mine.sort((a, b) => b.probability - a.probability || a.id.localeCompare(b.id));

  const others = legs.filter((l) => !claimed.has(l.title));
  const othersSum = others.reduce((s, l) => s + l.probability, 0);

  // A segment carries an in-bar figure once it is wide enough to hold one
  // without the digits spilling into its neighbour. 6% of the bar is roughly
  // 20px at 343px wide, which is the measured floor for a four-character
  // percentage at var(--t-2xs); under that the key beneath carries the number
  // and the segment carries only its width. The threshold is on the DATA, not
  // on a CSS query, because CSS cannot see how wide a flex child resolved to.
  const seg = (key, name, value, org) => {
    const share = value / total;
    const label = share >= 0.06 ? `<span class="rpart__t">${esc(pct(value, share >= 0.2 ? 1 : 0))}</span>` : '';
    return `<span class="rpart__seg" data-seg="${esc(key)}"${org ? ` data-org="${esc(org)}"` : ''} ` +
      `style="--w:${(share * 100).toFixed(3)}%" ` +
      `title="${esc(`${name}: ${pct(value, 2)}`)}">${label}</span>`;
  };

  const segs = mine.map((m) => seg(m.id, m.name, m.probability, m.id)).join('') +
    (othersSum > 0 ? seg('others', `${others.length} other contenders`, othersSum, null) : '');

  const keyItems = mine.map((m) =>
    `<li class="rpart__k" data-seg="${esc(m.id)}" data-org="${esc(m.id)}"><b>${esc(m.name)}</b><span class="num">${esc(pct(m.probability, 1))}</span></li>`
  ).join('') + (othersSum > 0
    ? `<li class="rpart__k" data-seg="others"><b>${esc(others.length)} others</b><span class="num">${esc(pct(othersSum, 1))}</span></li>`
    : '');

  const readout = [...mine.map((m) => `${m.name} ${pct(m.probability, 1)}`),
    othersSum > 0 ? `${others.length} other contenders ${pct(othersSum, 1)} combined` : null]
    .filter(Boolean).join(', ');

  return `<section class="sec rpartwrap" aria-labelledby="rpart-h">
  <h2 class="sec__h" id="rpart-h">The whole board</h2>
  <div class="rpart" role="img" aria-label="${esc(`${poly.horizon.title} — ${readout}.`)}">${segs}</div>
  <ul class="rpart__key">${keyItems}</ul>
  <p class="rnote">${esc(poly.horizon.legs_live)} legs are trading on
     <a href="${esc(poly.horizon.url)}" rel="nofollow noopener">${esc(poly.horizon.title)}</a>,
     and they are mutually exclusive: exactly one resolves YES. Their prices sum to
     <b class="num">${esc(num(poly.horizon.sum_of_live_legs, 4))}</b> rather than to 1.0000 — that
     spread is the bid/ask on ${esc(money(poly.horizon.volume_usd) ?? 'the book')} of lifetime
     volume. Segment widths above are normalised by that sum; the percentages printed are the raw
     prices.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// The leaderboard
// ---------------------------------------------------------------------------

/**
 * A real <table>, with explicit ARIA roles.
 *
 * On a phone the CSS turns every cell into a labelled flex row and the whole
 * <tr> into a card, which is the only layout that is genuinely readable at
 * 375px. `display: block` on table elements strips the implicit table semantics
 * in several browsers, so the roles are written out by hand — otherwise the
 * mobile layout would silently cost every screen-reader user the column
 * headers, which on a table of eight near-identical numeric rows is the whole
 * meaning.
 */
function leaderboard(race) {
  const ranked = race.players.filter((p) => p.rank !== null);
  const unranked = race.players.filter((p) => p.rank === null);

  const head = ['#', 'Player', 'Year-end odds', '7d change', 'Cross-check', 'Shipping, 30d', 'Mindshare']
    .map((h, i) => `<th role="columnheader" scope="col"${i === 0 ? ' class="rtb__rankh"' : ''}>${esc(h)}</th>`)
    .join('');

  const body = [...ranked, ...unranked].map((p) => playerRows(p, race)).join('');

  const unrankedNote = unranked.length
    ? `<p class="rnote"><b>${esc(unranked.length)}</b> player${unranked.length === 1 ? ' is' : 's are'} unranked:
       the ranking market lists no leg for them. They are ordered by mindshare and are
       <em>not</em> placed last at 0% &mdash; "nobody is offering this bet" is not a low probability.</p>`
    : '';

  return `<section class="sec rtbwrap" aria-labelledby="rtb-h">
  <h2 class="sec__h" id="rtb-h">The leaderboard</h2>
  <table class="rtb" role="table">
    <caption class="vh">The AI race: ${esc(race.players.length)} frontier labs ranked by live market probability, with shipping activity and news mindshare. Compiled ${esc(utc(race.generated_at))}.</caption>
    <thead role="rowgroup"><tr role="row">${head}</tr></thead>
    <tbody role="rowgroup">${body}</tbody>
  </table>
  ${unrankedNote}
</section>`;
}

function playerRows(p, race) {
  const m = p.market;
  const rank = p.rank === null ? '—' : p.rank;

  // ---- market probability -------------------------------------------------
  const probCell = m.probability === null
    ? absent(m.state === 'dark' ? 'dark' : 'no_market')
    : `<span class="rprob num">${esc(pct(m.probability, m.probability < 0.1 ? 2 : 1))}</span>` +
      marketBar(m.probability, m.change_7d) +
      (Number.isFinite(m.volume_usd)
        ? `<span class="rsub">${esc(money(m.volume_usd))} traded</span>`
        : '');

  // ---- 7-day delta --------------------------------------------------------
  const deltaCell = m.change_7d === null
    ? absent(m.change_7d_state === 'no_market' ? 'no_market' : 'no_reference')
    : `<span class="rdel num" data-dir="${esc(dirWord(m.change_7d))}">` +
      `${arrow(m.change_7d) ? `<i aria-hidden="true">${arrow(m.change_7d)}</i>` : ''}${esc(pts(m.change_7d, 2))}` +
      `<span class="vh"> points, ${esc(dirWord(m.change_7d))}, over seven days</span></span>`;

  // ---- cross-check: the spot market and the regulated venue ---------------
  const crossBits = [];
  if (m.spot && !race.markets?.polymarket?.horizon_is_spot) {
    crossBits.push(
      `<span class="rx"><b>today</b><span class="num">${esc(pct(m.spot.probability, 2))}</span></span>`
    );
  }
  crossBits.push(
    m.kalshi
      ? `<span class="rx"><b>kalshi</b><span class="num">${esc(pct(m.kalshi.probability, 0))}</span></span>`
      : `<span class="rx"><b>kalshi</b>${absent(m.kalshi_state === 'dark' ? 'dark' : 'no_market')}</span>`
  );
  const crossCell = crossBits.join('');

  // ---- shipping: three channels, side by side, never summed ---------------
  const shipCell = [
    channelChip('gh', 'GitHub releases', p.shipping.github, 'releases_30d'),
    channelChip('hf', 'Hugging Face model repos', p.shipping.huggingface, 'models_30d'),
    channelChip('or', 'OpenRouter listings', p.shipping.openrouter, 'listed_30d'),
  ].join('');

  // ---- mindshare ----------------------------------------------------------
  const ms = p.mindshare;
  const msCell = ms.share === null
    ? absent('dark')
    : `<span class="rms num">${esc(pct(ms.share, 1))}</span>` +
      (ms.is_floor ? `<abbr class="rfloor" title="${esc(ms.caveat ?? 'A floor: the published entity vocabulary is known to undercount this player.')}">floor</abbr>` : '') +
      `<span class="rsub">${esc(ms.items)} of ${esc(ms.corpus)} items</span>` +
      (ms.delta === null
        ? `<span class="rsub">${absent(ms.delta_state === 'halves_too_thin' ? 'halves_too_thin' : 'no_reference')}</span>`
        : `<span class="rdel num rdel--sm" data-dir="${esc(dirWord(ms.delta))}">` +
          `${arrow(ms.delta) ? `<i aria-hidden="true">${arrow(ms.delta)}</i>` : ''}${esc(pts(ms.delta, 1))}` +
          `<span class="vh"> points of corpus share, ${esc(dirWord(ms.delta))}</span></span>`);

  const principal = p.principal
    ? `<span class="rp__who">${esc(p.principal)}</span>`
    : `<span class="rp__who rp__who--none" title="${esc(p.principal_note ?? '')}">no single principal</span>`;

  // The inner .rv wrapper is load-bearing, not markup noise. On a phone the
  // <td> is a flex row of [label | value], and without the wrapper each chip
  // becomes its own flex child: the first one sits beside the label and the
  // rest wrap underneath it, one per line, misaligned. The wrapper makes the
  // whole value one child that wraps internally.
  const cell = (label, cls, html) =>
    `<td role="cell" class="${esc(cls)}" data-label="${esc(label)}"><span class="rv">${html}</span></td>`;

  return `<tr role="row" class="rtb__r" id="${esc(`p-${p.id}`)}">
    <td role="cell" class="rtb__rank" data-label="Rank"><span class="rrank">${esc(rank)}</span></td>
    <th role="rowheader" scope="row" class="rtb__p" data-label="Player">
      <span class="rpmk" data-org="${esc(p.id)}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><use href="#dc-avt-${esc(markFor(p).shape)}"/></svg></span>
      <span class="rp__txt"><span class="rp__name">${esc(p.name)}</span>${principal}</span>
    </th>
    ${cell('Year-end odds', 'rtb__prob', probCell)}
    ${cell('7d change', 'rtb__delta', deltaCell)}
    ${cell('Cross-check', 'rtb__cross', crossCell)}
    ${cell('Shipping, 30d', 'rtb__ship', shipCell)}
    ${cell('Mindshare', 'rtb__mind', msCell)}
  </tr>
  <tr role="row" class="rtb__why"><td role="cell" colspan="7">
    <p class="rwhy"><b class="rwhy__lab">why</b> ${esc(p.why)}</p>
    <details class="rwhy__more"><summary>every signal we have on ${esc(p.name)}</summary>
      <ul class="rwhy__list">${p.why_components.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${ms.caveat ? `<p class="rwhy__caveat">${esc(ms.caveat)}</p>` : ''}
      ${p.loudness.state !== 'live' && p.loudness.reason ? `<p class="rwhy__caveat"><b>Loudness:</b> ${esc(p.loudness.reason)}</p>` : ''}
    </details>
  </td></tr>`;
}

/**
 * One shipping channel as a chip.
 *
 * `absent` is a separate glyph from `0` on purpose and this is the single place
 * the distinction is most likely to be lost: Anthropic publishes no model
 * repositories to the Hugging Face Hub at all, and rendering that as "0" would
 * read as "shipped nothing this month" — a claim about their month rather than
 * about their distribution strategy.
 */
function channelChip(key, label, channel, field) {
  if (!channel || channel.state === 'dark') {
    return `<span class="rch" data-state="dark"><b>${esc(key)}</b>${absent('dark')}</span>`;
  }
  if (channel.state === 'absent') {
    return `<span class="rch" data-state="absent" title="${esc(`${label}: this player does not use this channel.`)}"><b>${esc(key)}</b>${absent('absent')}</span>`;
  }
  const n = channel[field];
  if (!Number.isFinite(n)) {
    return `<span class="rch" data-state="dark"><b>${esc(key)}</b>${absent('dark')}</span>`;
  }
  const floor = channel.is_floor ? '≥' : '';
  const title = channel.is_floor
    ? `${label}: at least ${n} in 30 days. The feed caps at ten entries per repository, so the true count is higher and cannot be read.`
    : `${label}: ${n} in 30 days.`;
  return `<span class="rch" data-state="${n > 0 ? 'live' : 'zero'}" title="${esc(title)}">` +
    `<b>${esc(key)}</b><span class="num">${esc(floor)}${esc(n)}</span></span>`;
}

// ---------------------------------------------------------------------------
// Provenance: the strip, the method, the legend
// ---------------------------------------------------------------------------

const STATE_GLYPH = { live: '●', dark: '○' };

function instrumentStrip(race) {
  const rows = (race.sources ?? []).map((s) => {
    const g = STATE_GLYPH[s.state] ?? '◇';
    return `<li class="rchip" data-state="${esc(s.state)}">` +
      `<span aria-hidden="true">${g}</span><b>${esc(s.id)}</b>` +
      `<span class="rchip__w">${esc(s.ok ? 'live' : 'dark')}</span>` +
      (s.ok ? '' : `<span class="rchip__e">${esc(s.error ?? 'no detail')}</span>`) +
      `</li>`;
  }).join('');

  const dark = (race.sources ?? []).filter((s) => !s.ok);
  const key = dark.length === 0
    ? `All ${(race.sources ?? []).length} instruments answered on this run.`
    : `${dark.length} of ${(race.sources ?? []).length} instruments are dark. Their columns are blank above. Nothing is filled in.`;

  return `<section class="sec" aria-labelledby="rsrc-h">
  <h2 class="sec__h" id="rsrc-h">Instrument health</h2>
  <ul class="rchips">${rows}</ul>
  <p class="rnote">${esc(key)}</p>
</section>`;
}

function howComputed(ctx, race) {
  const poly = race.markets?.polymarket;
  const kal = race.markets?.kalshi;
  const man = race.markets?.manifold;
  const w = race.news_window;

  const item = (term, body) => `<div class="rmeth__i"><dt>${term}</dt><dd>${body}</dd></div>`;

  const rankBody = poly?.ok
    ? `Every player is placed by one number and one number only: the live YES price on their leg of
       <a href="${esc(poly.horizon.url)}" rel="nofollow noopener">${esc(poly.horizon.title)}</a>,
       resolving ${esc(utcDay(poly.horizon.end_date))}. That event is a <em>negRisk</em> market &mdash;
       ${esc(poly.horizon.legs_live)} mutually-exclusive legs, exactly one of which resolves YES &mdash;
       so a leg price is a live, money-backed probability for that lab and nothing else.
       We do <b>not</b> blend the probability with shipping and mindshare into a composite score.
       A blend would need weights no one can check against an outcome, and the resulting rank would be
       ours rather than the market's. The other columns are context. They do not move the order.`
    : `<b>The ranking market is dark on this run</b>, so no ranking was produced.
       ${esc(race.rank_basis?.error ?? '')}`;

  const spotBody = poly?.ok && !poly.horizon_is_spot
    ? `<b>today</b> is the same question at the nearest resolution date
       (<a href="${esc(poly.spot.url)}" rel="nofollow noopener">${esc(poly.spot.title)}</a>,
       ${esc(utcDay(poly.spot.end_date))}) &mdash; who holds the crown right now rather than at year end.
       The two disagree sharply and they are supposed to.
       <b>kalshi</b> is a different question on a CFTC-regulated venue:
       ${kal?.ok ? `&ldquo;${esc(kal.title)}&rdquo;` : 'a top-ranked-this-year contract'},
       whose legs are independent binaries and do <em>not</em> sum to 1.
       ${kal?.ok ? `It lists ${esc(kal.legs_live)} contracts and carries no leg at all for some of this roster, which is printed as &ldquo;no market&rdquo;, never as 0%.` : ''}`
    : `A second venue and a second horizon, shown so one venue's quirk is visible as a disagreement rather than absorbed into a single confident number.`;

  const shipBody = `Three channels, published side by side and <b>never added together</b>, because
    they are biased in opposite directions and a sum would hide both.
    <b>gh</b> counts releases across a fixed basket of that lab's own repositories &mdash; which
    measures release engineering as much as shipping, since some labs auto-cut an SDK tag on every
    API change and others ship weights and never cut a tag. A <span class="num">&ge;</span> means the
    feed's ten-entry ceiling was hit and the real number is higher.
    <b>hf</b> counts model repositories the lab created on the Hugging Face Hub &mdash; a vendor-side
    publication event, and structurally zero for a lab that does not publish weights.
    <b>or</b> counts new entries in the OpenRouter catalogue. That timestamp is when
    <em>OpenRouter listed</em> the model, not when the vendor announced it, and it is never labelled
    as a release date anywhere on this page.
    All three windows are ${esc(race.ship_window_days)} days.`;

  const mindBody = w
    ? `Share of DOOMCON's own news corpus naming that lab, computed from the entity list
       <a href="${esc(ctx.href('/news.html'))}">the signal feed</a> already published &mdash; the same
       extractor, so the two surfaces can never disagree about a headline.
       The window is ${esc(w.corpus)} items spanning
       <b class="num">${esc(num(w.observed_span_hours, 1))} hours</b>${w.corpus_is_capped ? `, not the nominal ${esc(w.nominal_window_days)} days: the corpus is capped at ${esc(w.max_items)} items and on a busy week the cap binds long before the window does` : ''}.
       The trend compares the recent half (${esc(w.recent_corpus)} items) against the prior half
       (${esc(w.prior_corpus)} items); both must carry at least ${esc(w.min_half_items)} items or it
       is reported as too thin rather than computed anyway.
       <b>Shares do not sum to 100%</b> &mdash; one item naming two labs counts for both &mdash; and
       only ${esc(w.items_naming_any_entity)} of ${esc(w.corpus)} items name any lab at all, because
       most of the corpus is research preprints. This is share of <em>our</em> corpus. It is not
       share of the internet.`
    : `The news corpus was unreadable on this run, so every mindshare cell is dark.`;

  const loudBody = `The brief asked for the public posting cadence of each principal, from feeds we
    can legitimately fetch. Applied honestly that leaves almost nothing, and the empty column is the
    finding. Six of these eight people post on X, and scraping X carries an explicit
    permanent-suspension penalty under its developer terms &mdash; so that door is closed, not hard.
    Facebook and Instagram expose no free per-person feed. One legitimate feed exists and it is
    published by the principal himself; where it is absent, the reason is printed on the row rather
    than replaced with a zero.`;

  const manBody = man?.ok
    ? (man.included
        ? `Manifold's comparable market cleared the liquidity floor and is included.`
        : `${esc(man.excluded_reason)} The probe is re-run every build rather than asserted once in a
           comment, so the exclusion cannot quietly go stale.`)
    : `The Manifold probe was dark on this run.`;

  return `<section class="sec rmeth" aria-labelledby="rmeth-h">
  <h2 class="sec__h" id="rmeth-h">How this is computed</h2>
  <dl class="rmeth__l">
    ${item('The rank', rankBody)}
    ${item('Cross-check columns', spotBody)}
    ${item('Shipping', shipBody)}
    ${item('Mindshare', mindBody)}
    ${item('Loudness', loudBody)}
    ${item('Manifold', manBody)}
  </dl>
  <h3 class="rmeth__h3">What a blank cell means</h3>
  <ul class="rlegend">
    ${Object.entries(ABSENCE).map(([, a]) => `<li><span class="rab">${esc(a.mark)}</span><span>${esc(a.title)}</span></li>`).join('')}
    <li><span class="rab rab--zero num">0</span><span>We looked, the channel answered, and the answer is genuinely zero. This is the only one of the six that is a measurement.</span></li>
  </ul>
  <p class="rnote">Formula version <b class="num">${esc(race.formula_version)}</b>. The full method,
     the market selection rules and the traps are in
     <a href="${esc(brand.REPO_URL)}/blob/main/docs/RACE.md" rel="noopener">docs/RACE.md</a>, and
     every input on this page is in <a href="${esc(ctx.href('/api/race.json'))}">api/race.json</a>.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasRace(ctx)) return emptyPage(ctx);
  const race = ctx.race;

  const leader = race.players.find((p) => p.rank === 1) ?? null;
  const poly = race.markets?.polymarket;

  const headline = leader
    ? `${leader.name} leads at ${pct(leader.market.probability, 1)}`
    : 'No ranking was produced on this run';

  const description = leader
    ? `Live, money-backed odds on who holds the best AI model: ${race.players.filter((p) => p.rank).length} frontier labs ` +
      `ranked by Polymarket, cross-checked against Kalshi, with 30-day shipping activity and news mindshare for each. ` +
      `${headline}. Compiled ${utc(race.generated_at)}.`
    : `${brand.NAME}'s AI race leaderboard could not compute a ranking on this build: the ranking market is dark.`;

  // The principal-mark sprite. _avatars.avatarSprite() emits the eight outlines
  // ONCE as <symbol>s plus the per-person accent rules; every <use href="#dc-avt-*">
  // on this page resolves against it. layout.mjs does not ship it, so a page
  // that draws these marks has to. Emitting it twice on one page is harmless by
  // that module's own contract, so this does not have to co-ordinate with
  // anything else that might.
  const main = `<style>${raceCss(race)}</style>
${avatarSprite()}
<section class="rintro">
  <h1 class="rintro__h1">The AI race</h1>
  <p class="lede">Who is winning, and how sure is the money? ${esc(race.players.length)} frontier labs
     and the people running them, ranked by a live prediction market and annotated with what each one
     actually shipped. Every number links to the thing it came from.</p>
  <p class="rclaim"><b>These are market odds and observable activity. They are not a
     ${esc(brand.NAME)} prediction.</b> ${esc(race.rank_basis?.statement ?? '')}</p>
  ${liveHead(race, poly)}
</section>

${partitionBar(race)}

${raceGraphics(race)}

${leaderboard(race)}

${howComputed(ctx, race)}

${instrumentStrip(race)}
`;

  return page({
    ctx,
    path: PATH,
    title: `The AI race — ${headline} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: the AI race — ${headline}`,
    description,
    // ctx.cardFor('race') prefers data/cards/race.png when the card generator
    // has written one and falls back to the index card. It never returns a path
    // that is not on disk, because an og:image pointing at a 404 makes X render
    // a broken card instead of falling back to the summary form.
    ogImage: ctx.cardFor ? ctx.cardFor('race') : null,
    ogImageAlt: leader
      ? `${brand.NAME} AI race leaderboard: ${leader.name} at ${pct(leader.market.probability, 1)}`
      : `${brand.NAME} AI race leaderboard`,
    jsonld: [itemList(ctx, race), dataset(ctx, race)],
    main,
  });
}

/**
 * ctx.race absent. The page still builds, says plainly that this is the absence
 * of a result rather than an empty result, and carries noindex &mdash; an empty
 * leaderboard that Google has cached is worse than no leaderboard.
 */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `The AI race · ${brand.NAME}`,
    description: `${brand.NAME}'s AI race leaderboard has not published a run yet.`,
    main: `<style>${raceCss(null)}</style>
<section class="rintro">
  <h1 class="rintro__h1">The AI race</h1>
  <p class="lede">No leaderboard has been published in this build. This is not an empty
     result &mdash; it is the absence of a result, and the two are different states. When
     <code>data/race.json</code> is present it is rendered here in full.</p>
  <p class="rnote">Run <code>collector/race.mjs</code> and rebuild.</p>
</section>`,
  });
}

function liveHead(race, poly) {
  const bits = [];
  bits.push(`<div class="rlive__i"><dt>Compiled</dt><dd><time datetime="${esc(race.generated_at)}">${esc(utc(race.generated_at))}</time></dd></div>`);
  if (poly?.ok) {
    bits.push(`<div class="rlive__i"><dt>Ranking market</dt><dd><a href="${esc(poly.horizon.url)}" rel="nofollow noopener">${esc(poly.horizon.title)}</a></dd></div>`);
    bits.push(`<div class="rlive__i"><dt>Resolves</dt><dd><time datetime="${esc(poly.horizon.end_date)}">${esc(utcDay(poly.horizon.end_date))}</time></dd></div>`);
    bits.push(`<div class="rlive__i"><dt>Behind it</dt><dd class="num">${esc(money(poly.horizon.volume_usd))} across ${esc(poly.horizon.legs_live)} legs</dd></div>`);
  } else {
    bits.push(`<div class="rlive__i" data-dark="1"><dt>Ranking market</dt><dd>DARK &mdash; no ranking this run</dd></div>`);
  }
  const kal = race.markets?.kalshi;
  if (kal?.ok) {
    bits.push(`<div class="rlive__i"><dt>Cross-check</dt><dd class="num">Kalshi ${esc(kal.legs_live)} contracts, ${esc(compact(kal.volume_contracts))}</dd></div>`);
  }
  return `<dl class="rlive">${bits.join('')}</dl>`;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

/**
 * ItemList of the ranking.
 *
 * `item` is an Organization and its `url` is OUR anchor, not the lab's own
 * homepage. We did not look those up, and emitting a plausible one would be a
 * fabricated fact inside a machine-readable graph, which is the worst place to
 * put one. `subjectOf` points at the market that produced the position, so a
 * consumer can find the number's source without us claiming to be it.
 */
function itemList(ctx, race) {
  const base = ctx.url(PATH);
  const ranked = race.players.filter((p) => p.rank !== null).slice(0, JSONLD_MAX);
  const poly = race.markets?.polymarket;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${brand.NAME}: the AI race`,
    description:
      'Frontier AI labs ranked by the live prediction-market probability that they hold the best AI ' +
      'model at the end of the year. Market odds and observable activity, not a forecast.',
    url: base,
    numberOfItems: ranked.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: ranked.map((p) => ({
      '@type': 'ListItem',
      position: p.rank,
      url: `${base}#p-${p.id}`,
      item: {
        '@type': 'Organization',
        name: p.name,
        ...(p.principal ? { employee: { '@type': 'Person', name: p.principal, jobTitle: p.principal_role ?? undefined } } : {}),
        ...(poly?.ok ? { subjectOf: { '@type': 'WebPage', name: poly.horizon.title, url: poly.horizon.url } } : {}),
      },
    })),
  };
}

function dataset(ctx, race) {
  const w = race.news_window;
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} AI race leaderboard`,
    description:
      'Per-lab live prediction-market probability with a 7-day change, 30-day shipping activity ' +
      'across GitHub releases, Hugging Face model publication and OpenRouter listings, and share of ' +
      `${brand.NAME}'s own AI news corpus. Every field is null-safe: an unavailable signal is ` +
      'reported unavailable and is never imputed or set to zero.',
    url: ctx.url(PATH),
    identifier: ctx.url('/api/race.json'),
    version: race.formula_version,
    dateModified: race.generated_at,
    isAccessibleForFree: true,
    inLanguage: 'en',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    ...(w?.news_generated_at ? { temporalCoverage: `${w.oldest_item_at}/${race.generated_at}` } : {}),
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'market_probability', description: 'Live YES price on the player’s leg of the ranking negRisk market.', unitText: 'probability' },
      { '@type': 'PropertyValue', name: 'market_change_7d', description: 'Seven-day change in that leg’s price. Null when the venue has no week-old reference.', unitText: 'probability points' },
      { '@type': 'PropertyValue', name: 'shipping_github_releases_30d', description: 'Releases across a fixed basket of the lab’s own repositories in 30 days. A floor when the feed cap is hit.', unitText: 'releases' },
      { '@type': 'PropertyValue', name: 'shipping_huggingface_models_30d', description: 'Model repositories the lab created on the Hugging Face Hub in 30 days.', unitText: 'repositories' },
      { '@type': 'PropertyValue', name: 'shipping_openrouter_listed_30d', description: 'New OpenRouter catalogue entries in 30 days. Listing date, not vendor announcement date.', unitText: 'listings' },
      { '@type': 'PropertyValue', name: 'mindshare_share', description: `Share of ${brand.NAME}'s news corpus naming the lab. Shares do not sum to 1.`, unitText: 'share' },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: ctx.url('/api/race.json'),
    },
  };
}

// ---------------------------------------------------------------------------
// The share card
//
// collector/card.mjs owns card rendering and is not this agent's file, so this
// is exported as a pure SVG string rather than written to disk here. Rasterise
// it to data/cards/race.png and ctx.cardFor('race') picks it up automatically;
// until then the page falls back to the index card, which is correct but
// generic. SVG is deliberately NOT shipped as the og:image: X does not render
// an SVG card, and a broken card is worse than a summary card.
// ---------------------------------------------------------------------------

export function ogCardSvg(race) {
  if (!race || !Array.isArray(race.players)) throw new Error('ogCardSvg(): needs a parsed race.json');
  const rows = race.players.filter((p) => p.rank !== null).slice(0, 6);
  const maxP = rows.length ? Math.max(...rows.map((p) => p.market.probability)) : 1;

  const bars = rows.map((p, i) => {
    const y = 250 + i * 54;
    const w = Math.max(3, (p.market.probability / maxP) * 620);
    const delta = p.market.change_7d === null ? 'no 7d ref' : `${pts(p.market.change_7d, 1)} 7d`;
    return `<text x="60" y="${y + 4}" class="n">${i + 1}</text>` +
      `<text x="100" y="${y + 4}" class="l">${escapeXml(p.name)}</text>` +
      `<rect x="380" y="${y - 14}" width="${w.toFixed(1)}" height="18" fill="#ffb020" opacity="${i === 0 ? '1' : '0.55'}"/>` +
      `<text x="1020" y="${y + 4}" class="v" text-anchor="end">${pct(p.market.probability, 1)}</text>` +
      `<text x="1140" y="${y + 4}" class="d" text-anchor="end">${escapeXml(delta)}</text>`;
  }).join('');

  const ev = race.rank_basis?.event;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<style>
  text { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; fill: #e8eaee; }
  .t { font-size: 54px; font-weight: 700; letter-spacing: -1px; }
  .s { font-size: 21px; fill: #9aa2ad; }
  .n { font-size: 22px; fill: #6a717b; }
  .l { font-size: 26px; font-weight: 500; }
  .v { font-size: 26px; font-weight: 700; fill: #ffb020; }
  .d { font-size: 19px; fill: #9aa2ad; }
  .f { font-size: 18px; fill: #6a717b; }
</style>
<rect width="1200" height="630" fill="#0b0c0e"/>
<rect x="0" y="0" width="1200" height="6" fill="#ffb020"/>
<text x="60" y="96" class="t">THE AI RACE</text>
<text x="60" y="140" class="s">${escapeXml(ev ? ev.title : 'ranking market dark')}</text>
<text x="60" y="176" class="s">Live prediction-market odds · not a ${escapeXml(brand.NAME)} forecast</text>
${bars}
<text x="60" y="590" class="f">${escapeXml(brand.NAME)} · ${escapeXml(brand.DOMAIN)}/race · ${escapeXml(utc(race.generated_at))}</text>
</svg>
`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// CSS
//
// Mobile-first: the default rules ARE the 375px card layout and the table
// display is restored at 720px, rather than the other way round. Every colour
// is a token from styles.mjs, so the page inverts correctly in light mode
// without a second palette, and nothing here carries meaning by colour alone.
// ---------------------------------------------------------------------------

function raceCss(race) {
  // SEGMENT HUES. This block used to derive eight shades of the ONE accent by
  // stepping opacity down the rank order, on the argument that the site spends
  // amber only on live values and a leaderboard should not invent a palette.
  // The second half of that argument still holds and nothing here invents
  // anything: the hues are var(--avt-a), which site/styles.mjs already
  // publishes per [data-org] in both schemes, from _labs.mjs's own table. So
  // the colour a lab wears on this bar is the colour it wears on the watch
  // floor and on the two charts below, rather than a private ramp that meant
  // "rank" on one surface and nothing anywhere else.
  //
  // What the old ramp bought was a guarantee that adjacent segments differed.
  // That is kept by other means and none of them is a hue: a hairline in the
  // page background between segments, the in-bar percentage on any segment wide
  // enough to hold one, and the key underneath, which repeats every name and
  // every number in rank order. Desaturate the whole bar and it still reads.
  void race;

  return `
.rintro { padding: 26px 0 0; }
.rintro__h1 { font-size: clamp(1.8rem, 8vw, 2.6rem); letter-spacing: -0.03em; margin: 0 0 12px; }
.rclaim {
  border-left: 3px solid var(--accent); background: var(--bg-raised);
  padding: 12px 14px; margin: 0 0 var(--s-5); font-size: var(--t-sm);
  color: var(--ink-dim); border-radius: 0 var(--radius) var(--radius) 0;
}
.rclaim b { color: var(--ink); display: block; margin-bottom: 4px; }

.rlive { display: grid; grid-template-columns: 1fr; gap: 0; margin: 0 0 var(--s-5);
  border: 1px solid var(--rule); border-radius: var(--radius); overflow: hidden; }
.rlive__i { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3);
  padding: 8px 12px; border-bottom: 1px solid var(--rule-soft); }
.rlive__i:last-child { border-bottom: 0; }
.rlive dt { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-faint); flex: 0 0 auto; }
.rlive dd { margin: 0; font-size: var(--t-sm); text-align: right; }
.rlive__i[data-dark="1"] dd { font-family: var(--mono); color: var(--dark-src); }

/* ---- the partition bar ---- */
.rpart { display: flex; height: 44px; width: 100%; overflow: hidden;
  border: 1px solid var(--rule); border-radius: var(--radius); background: var(--bg-sunken); }
.rpart__seg { display: flex; align-items: center; justify-content: center; overflow: hidden;
  width: var(--w, 0%); background: var(--ink-faint); min-width: 1px; }
.rpart__seg[data-org] { background: var(--avt-a, var(--accent)); }
/* A hairline between segments so two adjacent hues never read as one block in a
   greyscale screenshot. */
.rpart__seg + .rpart__seg { border-left: 1px solid var(--bg); }
/* The figure inside the segment. Knocked out in the page ground, which is the
   near-black in dark mode and the near-white in light, and every org hue in
   styles.mjs is on the correct side of both. */
.rpart__t { font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700;
  letter-spacing: 0.02em; color: var(--bg); white-space: nowrap; }
.rpart__key { list-style: none; display: flex; flex-wrap: wrap; gap: 4px 12px;
  margin: 10px 0 0; padding: 0; }
.rpart__k { display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--t-xs); color: var(--ink-dim); }
.rpart__k::before { content: ''; width: 10px; height: 10px; flex: 0 0 auto;
  background: var(--ink-faint); border-radius: 2px; }
.rpart__k[data-org]::before { background: var(--avt-a, var(--accent)); }
.rpart__k b { font-weight: 500; color: var(--ink); }
.rpart__k .num { font-family: var(--mono); color: var(--ink-dim); }

/* ---- the two big graphics ----------------------------------------------
   Geometry lives in fieldPlot()/movePanel(); only paint lives here, which is
   the division styles.mjs states for every chart on the site. Every value is a
   token, so both graphics invert with the page and neither carries a hex that
   is only correct on one ground.

   THE KNOCKOUT GROUND IS --bg AND THE PANEL IS PAINTED --bg TO MATCH. Several
   marks (the "then" ring, the "now" triangle, the label halo, the line halo)
   punch the background out from under themselves so a series stays readable
   where it crosses a gridline or another series. That only works if the panel
   really is sitting on --bg, so the panel sets it rather than inheriting
   whatever section it was dropped into. */
.rgfx__lede { margin: 0 0 var(--s-4); }
.ch--field, .ch--move {
  background: var(--bg); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 12px 10px 10px;
}
.ch--field .ch__svg, .ch--move .ch__svg { margin-inline: auto; }
/* THE THIRD BREAKPOINT. styles.mjs toggles the kit's sm/lg pair at 640px and
   that rule is left alone; this adds one more step above it for the wide
   geometry, and it is a SWAP, not a stretch - the lg drawing leaves the layout
   rather than being blown up. 1120px is the width at which this page's wrap
   can hold 1100 units without downscaling to speak of. */
.rfc--xl, .rmv--xl { display: none; }
@media (min-width: 1120px) {
  .ch--field .ch__svg--lg, .ch--move .ch__svg--lg { display: none; }
  .rfc--xl, .rmv--xl { display: block; }
}
.ch--field .ch__cap, .ch--move .ch__cap { max-width: var(--measure); padding: 0 2px; }

/* the field */
.rfc__r { color: var(--avt-a, var(--accent)); }
/* fill is inheritable and crosses into the <use> shadow tree, which is how one
   colourless sprite serves eight hues and both schemes. The flat transparent
   first, so an engine without color-mix draws an outline and not a black blob. */
.rfc__mk { fill: transparent; fill: color-mix(in srgb, currentColor 22%, transparent); }
.rfc__axt, .rfc__ax { fill: var(--ink-faint); letter-spacing: 0.08em; }
.rfc__grid { stroke: var(--rule-soft); stroke-width: 1; }
.rfc__grid--zero { stroke: var(--rule); }
.rfc__rank { fill: var(--ink-faint); font-weight: 700; }
.rfc__name { fill: var(--ink); font-weight: 500; letter-spacing: 0.01em;
  stroke: var(--bg); stroke-width: 3.2; paint-order: stroke fill; }
.rfc__track { stroke: var(--rule); stroke-width: 1; }
.rfc__stem { stroke: currentColor; stroke-width: 3.4; stroke-linecap: round; }
.rfc__dot { fill: currentColor; stroke: var(--bg); stroke-width: 1.4; }
/* The week-old price. Hollow, so it reads as a reference and not as a second
   value, and simply absent on a row with no week-old price. */
.rfc__then { fill: var(--bg); stroke: currentColor; stroke-width: 1.9; }
.rfc__val { fill: var(--ink); font-weight: 700; letter-spacing: -0.02em;
  stroke: var(--bg); stroke-width: 3.2; paint-order: stroke fill; }
.rfc__val--none { fill: var(--ink-faint); font-weight: 400; }
.rfc__del { fill: var(--ink-faint); }
/* Hue confirms the direction the triangle in the same string already states. */
.rfc__del[data-dir="up"] { fill: var(--ok); }
.rfc__del[data-dir="down"] { fill: var(--dark-src); }
.rfc__none { fill: none; stroke: var(--rule); stroke-width: 1; stroke-dasharray: 3 3; }
.rfc__nonet { fill: var(--ink-faint); letter-spacing: 0.06em; }
/* Stroke widths are in USER UNITS, so the wide drawing needs its own or it
   renders proportionally thinner than the one it replaced. */
.rfc--xl .rfc__stem { stroke-width: 5.4; }
.rfc--xl .rfc__then { stroke-width: 2.3; }
.rfc--xl .rfc__dot { stroke-width: 1.8; }

/* seven days */
.rmv__t { fill: var(--ink); font-weight: 700; letter-spacing: 0.1em; }
.rmv__ax { fill: var(--ink-faint); }
.rmv__grid { stroke: var(--rule-soft); stroke-width: 1; }
.rmv__grid--zero { stroke: var(--rule); }
.rmv__col { stroke: var(--rule); stroke-width: 1; }
.rmv__col-h { fill: var(--ink-faint); letter-spacing: 0.12em; }
.rmv__s { color: var(--avt-a, var(--accent)); }
.rmv__halo { stroke: var(--bg); stroke-width: 5; stroke-linecap: round; }
.rmv__line { stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
.rmv__then { fill: var(--bg); stroke: currentColor; stroke-width: 1.9; }
.rmv__now { fill: currentColor; stroke: var(--bg); stroke-width: 1; }
.rmv__lead { fill: none; stroke: currentColor; stroke-width: 1; }
.rmv__lab { fill: var(--ink); letter-spacing: 0.01em;
  stroke: var(--bg); stroke-width: 3; paint-order: stroke fill; }
.rmv__empty { fill: var(--ink-faint); letter-spacing: 0.12em; font-weight: 700; }
.rmv__foot { fill: var(--ink-faint); letter-spacing: 0.04em; }
.rmv--xl .rmv__line { stroke-width: 2.9; }
.rmv--xl .rmv__halo { stroke-width: 6.2; }
.rmv--xl .rmv__then { stroke-width: 2.3; }

/* The lab mark in the leaderboard's player cell. Same sprite, same hue, so the
   row and the chart above it are recognisably the same lab. Decoration only —
   aria-hidden, with the name in text immediately beside it. */
.rpmk { display: inline-block; width: 22px; height: 22px; margin: 2px 8px 0 0;
  vertical-align: top; color: var(--avt-a, var(--accent)); }
.rpmk svg { display: block; width: 100%; height: 100%;
  fill: transparent; fill: color-mix(in srgb, currentColor 18%, transparent); }
.rp__txt { display: inline-block; vertical-align: top; min-width: 0; max-width: 100%; }

/* ---- the leaderboard ---- */
.rtb { width: 100%; border-collapse: collapse; display: block; }
.rtb thead { position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.rtb tbody { display: block; }
.rtb__r, .rtb__why { display: block; }

/* One card per player on a phone. The rank badge floats top-left of the card
   and the player name sits beside it; every other cell is a labelled row. */
.rtb__r {
  position: relative; border: 1px solid var(--rule); border-top-width: 1px;
  border-radius: var(--radius) var(--radius) 0 0; background: var(--bg-raised);
  padding: 12px 12px 6px 56px; margin-top: var(--s-4);
}
.rtb__rank { display: block; position: absolute; left: 12px; top: 12px; padding: 0; }
.rrank { font-family: var(--mono); font-size: 1.45rem; font-weight: 700; color: var(--accent);
  line-height: 1; display: block; }
.rtb__r .rtb__rank::before { content: none; }
.rtb__p { display: block; text-align: left; padding: 0 0 10px; font-weight: 400; }
.rtb__p::before { content: none; }
.rp__name { display: block; font-size: 1.12rem; font-weight: 600; letter-spacing: -0.01em; }
.rp__who { display: block; font-size: var(--t-xs); font-family: var(--mono);
  letter-spacing: 0.04em; color: var(--ink-dim); text-transform: uppercase; }
.rp__who--none { color: var(--ink-faint); font-style: normal; }

.rtb td { display: flex; align-items: baseline; gap: var(--s-3);
  padding: 6px 0; border-top: 1px dashed var(--rule-soft); }
.rtb td::before {
  content: attr(data-label); flex: 0 0 7.2em;
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-faint); line-height: 1.35;
}
.rv { flex: 1 1 0; min-width: 0; display: flex; flex-wrap: wrap;
  align-items: baseline; gap: 4px 10px; }
.rtb__rank::before, .rtb__p::before { display: none; }

.rprob { font-family: var(--mono); font-size: 1.35rem; font-weight: 700; color: var(--accent);
  line-height: 1.1; }
.rsub { font-size: var(--t-xs); font-family: var(--mono); color: var(--ink-faint); }

/* The bar: absolute 0-100 scale, with a tick where the price was a week ago. */
.rbar { position: relative; display: block; flex: 1 0 100%; height: 8px; margin-top: 2px;
  background: var(--bg-sunken); border: 1px solid var(--rule); border-radius: 1px; }
.rbar__fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent);
  min-width: 2px; }
.rbar__then { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px;
  background: var(--ink); opacity: 0.75; }

.rdel { font-family: var(--mono); font-size: var(--t-sm); font-weight: 500; white-space: nowrap; }
.rdel i { font-style: normal; margin-right: 3px; font-size: 0.8em; }
.rdel[data-dir="up"] { color: var(--ok); }
.rdel[data-dir="down"] { color: var(--dark-src); }
.rdel[data-dir="unchanged"] { color: var(--ink-faint); }
.rdel--sm { font-size: var(--t-xs); }

.rx { display: inline-flex; align-items: baseline; gap: 5px; }
.rx b { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-faint); font-weight: 400; }
.rx .num { font-family: var(--mono); font-size: var(--t-sm); color: var(--ink); }

.rch { display: inline-flex; align-items: baseline; gap: 4px;
  border: 1px solid var(--rule); border-radius: var(--radius); padding: 2px 6px; }
.rch b { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-faint); font-weight: 400; }
.rch .num { font-family: var(--mono); font-size: var(--t-sm); color: var(--ink); }
.rch[data-state="live"] { border-color: var(--ink-faint); }
.rch[data-state="zero"] .num { color: var(--ink-faint); }
/* Absent and dark get a dashed border as well as a word, so the state survives
   a greyscale screenshot. */
.rch[data-state="absent"], .rch[data-state="dark"] { border-style: dashed; }

.rms { font-family: var(--mono); font-size: 1.05rem; font-weight: 700; }
/* A floor is labelled, not glued to the number as a >=. "≥0.0%" is logically
   correct and reads as a typo; "0.0%  FLOOR" reads as what it is. */
.rfloor { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-faint); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 1px 4px; text-decoration: none; cursor: help; }

/* "no market" / "not used" / "DARK": a word, never a bare dash, and never a 0. */
.rab { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.04em;
  color: var(--ink-faint); border-bottom: 1px dotted var(--ink-faint); cursor: help; }
.rab--zero { color: var(--ink); border-bottom: 0; }

.rtb__why {
  border: 1px solid var(--rule); border-top: 0; border-radius: 0 0 var(--radius) var(--radius);
  background: var(--bg-sunken); padding: 10px 12px;
}
.rtb__why td { display: block; padding: 0; border: 0; }
.rtb__why td::before { content: none; }
.rwhy { margin: 0; font-size: var(--t-sm); color: var(--ink-dim); }
.rwhy__lab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--accent); margin-right: 6px; }
.rwhy__more { margin-top: 8px; }
.rwhy__more summary { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint);
  cursor: pointer; letter-spacing: 0.04em; }
.rwhy__more summary:hover, .rwhy__more summary:focus-visible { color: var(--ink); }
.rwhy__list { margin: 8px 0 0; padding-left: 18px; font-size: var(--t-sm); color: var(--ink-dim); }
.rwhy__list li { margin-bottom: 3px; }
.rwhy__caveat { margin: 8px 0 0; font-size: var(--t-xs); color: var(--ink-faint); }

/* ---- method + legend ---- */
.rmeth__l { margin: 0; }
.rmeth__i { border-top: 1px solid var(--rule-soft); padding: var(--s-3) 0; }
.rmeth__i:first-child { border-top: 0; }
.rmeth__l dt { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
.rmeth__l dd { margin: 0; font-size: var(--t-sm); color: var(--ink-dim); max-width: var(--measure); }
.rmeth__h3 { font-size: var(--t-md); margin: var(--s-5) 0 var(--s-3); }
.rlegend { list-style: none; margin: 0; padding: 0; }
.rlegend li { display: flex; gap: var(--s-3); align-items: baseline; padding: 5px 0;
  border-top: 1px dashed var(--rule-soft); font-size: var(--t-sm); color: var(--ink-dim); }
.rlegend li:first-child { border-top: 0; }
.rlegend .rab { flex: 0 0 5.5em; cursor: default; }

.rchips { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 var(--s-3); padding: 0; }
.rchip { display: inline-flex; align-items: baseline; gap: 6px; border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 4px 8px; font-family: var(--mono); font-size: var(--t-xs); }
.rchip b { font-weight: 500; color: var(--ink); }
.rchip__w { color: var(--ink-faint); }
.rchip[data-state="live"] span:first-child { color: var(--ok); }
.rchip[data-state="dark"] { border-style: dashed; }
.rchip[data-state="dark"] span:first-child, .rchip[data-state="dark"] .rchip__w { color: var(--dark-src); }
.rchip__e { flex: 1 1 100%; color: var(--ink-faint); font-size: 10.5px; }

.rnote { font-size: var(--t-sm); color: var(--ink-dim); max-width: var(--measure); margin: var(--s-3) 0 0; }
.rnote .num, .rmeth__l .num { font-family: var(--mono); }

@media (prefers-reduced-motion: no-preference) {
  .rtb__r { transition: border-color 140ms ease-out; }
}
.rtb__r:hover, .rtb__r:focus-within { border-color: var(--ink-faint); }

/* ---- 720px and up: the strip and the board get room ---- */
@media (min-width: 720px) {
  .rlive { grid-template-columns: repeat(2, 1fr); }
  .rlive__i:nth-last-child(-n+2) { border-bottom: 0; }
  .rpart { height: 58px; }
  .rpart__t { font-size: var(--t-xs); }
}

/* ---- 900px and up: a real table again ----------------------------------
   MEASURED, NOT GUESSED, AND IT USED TO BE 720. Seven columns of dense data
   have a floor: at 800px the <table> laid out at 795px inside a 753px wrap,
   which put a horizontal scrollbar under the whole page and squeezed the
   player column to 94px, so "Google DeepMind" and "Dario Amodei" both broke
   across two lines. The table did not fit and the browser was being asked to
   pretend it did.
   900px is where it does fit. Below that the card layout — which is the
   phone layout, and is the more readable of the two at any width where the
   table has to be compressed — carries on doing its job. Nothing is hidden at
   either width: the same cells, the same values, a different arrangement. */
@media (min-width: 900px) {
  .rtb { display: table; }
  .rtb thead { position: static; width: auto; height: auto; clip: auto; clip-path: none;
    display: table-header-group; }
  .rtb tbody { display: table-row-group; }
  .rtb thead th { text-align: left; font-family: var(--mono); font-size: var(--t-xs);
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint);
    font-weight: 400; padding: 0 var(--s-3) 8px 0; border-bottom: 1px solid var(--rule); }
  .rtb__rankh { width: 2.5em; }
  .rtb__r { display: table-row; border: 0; border-radius: 0; background: transparent;
    padding: 0; margin: 0; position: static; }
  .rtb__r > td, .rtb__r > th { display: table-cell; vertical-align: top;
    padding: var(--s-3) var(--s-3) var(--s-2) 0; border-top: 1px solid var(--rule-soft);
    border-bottom: 0; }
  .rtb td::before { content: none; }
  .rv { display: flex; }
  .rtb__rank { position: static; }
  .rtb__p { padding-bottom: var(--s-2); }
  .rtb__prob { min-width: 190px; }
  /* Two different questions from two different venues. Stacked rather than run
     together inline, so they read as two readings and not as one number with a
     suffix. */
  .rtb__cross .rv { flex-direction: column; align-items: flex-start; gap: 3px; }
  .rtb__cross { min-width: 132px; }
  .rtb__mind { min-width: 122px; }
  /* Three chips of roughly 5em. Below this they wrap one per line and the
     column reads as three separate facts instead of one. */
  .rtb__ship { min-width: 152px; }
  /* Enough for the longest published name and the longest published principal
     on one line each, beside the 22px mark. "Google DeepMind" / "Demis
     Hassabis" is the pair that sets it. */
  .rtb__p { min-width: 162px; }
  .rbar { flex: 1 1 100%; }
  .rtb__why { display: table-row; border: 0; background: transparent; padding: 0; }
  .rtb__why > td { display: table-cell; padding: 0 0 var(--s-4); border: 0; }
  .rwhy { padding-left: 2.5em; }
}
`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs owns these calls; this agent does not edit it)
//
//   import * as racePage from './templates/racePage.mjs';
//
//   // 1. load data/race.json into ctx, exactly as news.json is loaded today.
//   //    Absent is NOT an error: the race layer and the index are separate
//   //    failure domains by design.
//   let race = null;
//   const raceFile = path.join(args.data, 'race.json');
//   if (existsSync(raceFile)) {
//     try { race = JSON.parse(await readFile(raceFile, 'utf8')); }
//     catch (err) { warn(`data/race.json is present but unreadable (${err.message}); building without the race page.`); }
//   } else {
//     warn('data/race.json is absent; building without /race. Run collector/race.mjs first.');
//   }
//   const ctx = { ..., race };
//
//   // 2. write the page and the API file.
//   if (racePage.hasRace(ctx)) {
//     written.push(await write(args.out, 'race.html', racePage.render(ctx)));
//     written.push(await write(args.out, 'api/race.json', stableJson(race)));
//   }
//
// render(ctx) is safe to call unconditionally: with ctx.race absent it emits a
// noindex "no run published" page. hasRace(ctx) is the guard if you would
// rather not write the file at all.
//
// Also needs, and none of these are this agent's files:
//   layout.mjs NAV   add { href: '/race.html', label: 'Race' }
//   sitemap.mjs      add /race.html, changefreq hourly, priority 0.9 - this is
//                    the highest-value indexable page on the site after /
//   collector/card.mjs (optional) rasterise racePage.ogCardSvg(race) to
//                    data/cards/race.png. Until it exists ctx.cardFor('race')
//                    falls back to the index card, which is correct but generic.
// ---------------------------------------------------------------------------
