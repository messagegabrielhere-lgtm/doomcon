// /infra.html — THE INFRASTRUCTURE INDEX.
//
// The sub-index pointed at the physical substrate: power, water, and the paper
// trail of the build-out. Reads data/infra.json, written by collector/infra.mjs,
// and renders it whole. Server-rendered, deterministic, no client JavaScript:
// identical inputs produce byte-identical HTML.
//
// THE DESIGN ARGUMENT, because it is not obvious from the markup.
//
// pizzint.watch's best idea is not the pizza. It is the SWITCHER: seven small
// named theories, each its own scalar, each absurd on its face and each measured
// the same careful way. Their gay-bar report is the one everyone screenshots.
// Ours is better in one specific respect and worse in none: their theory is
// unfalsifiable (a quiet bar could mean anything), and ours is a physical
// constraint. You cannot train a model without electricity. But the honest
// version of that claim is much weaker than the exciting version, so the
// correlation warning is the THIRD thing on the page, above every chart, in
// running prose, before the reader has had a chance to form the wrong idea.
//
// The hero is a five-stop rail rather than a gauge. A gauge has one needle and
// no memory; a rail shows all five states at once with their band edges printed,
// marks where the previous observation sat, and therefore reads as a scale a
// reader could have computed. It also descends as readily as it climbs, which a
// countdown does not, and that asymmetry is the difference between an instrument
// and a doom clock.
//
// Three source states are kept visually distinct everywhere they appear — live,
// awaiting baseline, dark — with a glyph AND a word AND a different border
// treatment, never colour alone.

import { esc, utc, utcDay, num } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/infra.html';

/** build.mjs gate: no data/infra.json, no route, no nav entry, no 404. */
export function hasInfra(ctx) {
  const i = ctx && ctx.infra;
  return Boolean(i && Array.isArray(i.sources) && i.sources.length && Array.isArray(i.pillars));
}

// ---------------------------------------------------------------------------
// The corridors. This table is a DISPLAY concern and lives here, not in the
// collector: it is the join between the grid feeds, the river gauges and the
// drought states, and the join is an editorial claim about which datacentre
// cluster sits where.
//
// Every corridor with no grid cell says WHY in its own words. A blank cell with
// no explanation reads as an oversight; a blank cell with a reason reads as a
// boundary of the instrument, which is what it is. Five of nine corridors have
// no free real-time demand feed, and that is the single most important fact
// about this page's coverage.
// ---------------------------------------------------------------------------

const CORRIDORS = Object.freeze([
  { id: 'texas', name: 'Texas', place: 'Dallas · Austin · San Antonio',
    grid: ['ercot-baseload', 'ercot-tightness'], gridLabel: 'ERCOT',
    gauges: ['08057000', '08158000'], states: ['TX'] },
  { id: 'nova', name: 'Northern Virginia', place: 'Loudoun County · Data Center Alley',
    grid: null, gridLabel: 'PJM',
    gridWhy: 'PJM publishes real-time demand only through Data Miner 2, which requires a registered subscription key. Keys are free; secrets in this repo are not permitted.',
    gauges: ['01644000', '01646500'], states: ['VA'] },
  { id: 'ohio', name: 'Central Ohio', place: 'New Albany · Columbus',
    grid: null, gridLabel: 'PJM',
    gridWhy: 'Same PJM key wall as Northern Virginia.',
    gauges: ['03227500'], states: ['OH'] },
  { id: 'iowa', name: 'Iowa & Nebraska', place: 'Council Bluffs · Omaha',
    grid: null, gridLabel: 'MISO / SPP',
    gridWhy: 'MISO’s public data broker answered {"error": "no data"} on every message type tested on 2026-09-23. SPP has no equivalent keyless endpoint.',
    gauges: ['06610000'], states: ['IA', 'NE'] },
  { id: 'georgia', name: 'Georgia', place: 'Atlanta metro',
    grid: null, gridLabel: 'Southern Co.',
    gridWhy: 'The Southeast is not an organised market. There is no independent system operator here and therefore no public real-time demand feed.',
    gauges: ['02335000'], states: ['GA'] },
  { id: 'arizona', name: 'Arizona', place: 'Phoenix metro',
    grid: null, gridLabel: 'APS / SRP',
    gridWhy: 'Vertically integrated utilities, no organised market, no public demand feed.',
    gauges: ['09380000'], states: ['AZ'] },
  { id: 'oregon', name: 'Oregon', place: 'The Dalles · Hillsboro',
    grid: null, gridLabel: 'BPA',
    gridWhy: 'Bonneville publishes balancing-authority totals on a different cadence and format; not yet read by this collector.',
    gauges: ['14105700'], states: ['OR'] },
  { id: 'newyork', name: 'New York', place: 'NYISO control region · reference',
    grid: ['nyiso-baseload'], gridLabel: 'NYISO',
    gauges: [], states: ['NY'], control: true },
  { id: 'california', name: 'California', place: 'Santa Clara · CAISO control region · reference',
    grid: ['caiso-baseload'], gridLabel: 'CAISO',
    gauges: [], states: ['CA'], control: true },
]);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const STATES = Object.freeze({
  live: { glyph: '●', word: 'LIVE', cls: 'is-live' },
  'awaiting-baseline': { glyph: '◐', word: 'AWAITING BASELINE', cls: 'is-wait' },
  dark: { glyph: '✕', word: 'DARK', cls: 'is-dark' },
});

function stateOf(key) {
  return STATES[key] ?? STATES.dark;
}

/** state as glyph + word, always together. Colour is the third signal, never the first. */
function stateTag(key, extra = '') {
  const s = stateOf(key);
  return `<span class="ist ${s.cls}"><span class="ist__g" aria-hidden="true">${s.glyph}</span>${esc(s.word)}${
    extra ? `<span class="ist__x">${esc(extra)}</span>` : ''
  }</span>`;
}

function fmtNum(v, dp = 2) {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 10000) return Math.round(v).toLocaleString('en-US');
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  return v.toFixed(dp);
}

function sourceById(infra, id) {
  return infra.sources.find((s) => s.id === id) ?? null;
}

function pillarById(infra, id) {
  return infra.pillars.find((p) => p.id === id) ?? null;
}

/** A 0–100 score as a percentage across the rail. */
function railX(score) {
  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// 1. THE RAIL — the hero
// ---------------------------------------------------------------------------

/**
 * Five labelled stops with their band edges, the live stop lit, the exact score
 * marked with a caret, and the previous observation marked with a hollow pip.
 *
 * Drawn in a 1000x210 viewBox and scaled to the container, so the same markup is
 * legible at 375px and at 1240px without a media query. Everything in it is a
 * <text> node, so it is selectable, searchable and readable by a screen reader
 * in the order a person would read it.
 *
 * No animation. Not because motion is forbidden here but because there is
 * nothing to animate: this is a position on a scale, and a position that slides
 * on load implies a movement that may not have happened.
 */
function rail(infra) {
  const levels = Array.isArray(infra.levels) && infra.levels.length === 5
    ? infra.levels
    : [];
  if (levels.length !== 5) return '';

  // Geometry note. The score label and the level numerals used to share a row
  // above the rail, and at a composite of 51.5 the label sat exactly on top of
  // the "3" over LOADED and deleted it. The numerals now live INSIDE their own
  // segment, top-left, where nothing can ever reach them.
  const W = 1000, H = 172;
  const PAD = 6;
  const railY = 70, railH = 52;
  const inner = W - PAD * 2;

  const score = Number.isFinite(infra.score) ? infra.score : null;
  const liveLevel = Number.isInteger(infra.level) ? infra.level : null;

  // The previous scored observation, for the "where it was" pip.
  const hist = Array.isArray(infra.history) ? infra.history : [];
  const prior = hist.length >= 2 ? hist[hist.length - 2] : null;
  const priorScore = prior && Number.isFinite(prior.score) ? prior.score : null;

  // Stops run SLACK (left, calm) to MAXIMAL (right). levels[] is ordered 5..1.
  const stops = levels.map((l, i) => {
    const x = PAD + (inner * i) / 5;
    const w = inner / 5;
    const lit = liveLevel === l.level;
    return { ...l, x, w, lit };
  });

  const segs = stops.map((s) => `
    <g>
      <rect x="${num(s.x, 1)}" y="${railY}" width="${num(s.w - 4, 1)}" height="${railH}" rx="3"
            class="irail__seg${s.lit ? ' is-lit' : ''}"></rect>
      ${s.lit ? `<rect x="${num(s.x, 1)}" y="${railY}" width="${num(s.w - 4, 1)}" height="${railH}" rx="3"
            class="irail__litline"></rect>` : ''}
      <text x="${num(s.x + 10, 1)}" y="${railY + 19}" class="irail__no${s.lit ? ' is-lit' : ''}"
            text-anchor="start">${s.level}</text>
      <text x="${num(s.x + (s.w - 4) / 2, 1)}" y="${railY + 39}" class="irail__name${s.lit ? ' is-lit' : ''}"
            text-anchor="middle">${esc(s.name)}</text>
      <text x="${num(s.x + (s.w - 4) / 2, 1)}" y="${railY + railH + 24}" class="irail__band"
            text-anchor="middle">${s.min}–${s.max}</text>
    </g>`).join('');

  const caretX = score === null ? null : PAD + (inner * railX(score)) / 100;
  const priorX = priorScore === null ? null : PAD + (inner * railX(priorScore)) / 100;

  const caret = caretX === null ? '' : `
    <g>
      <path d="M ${num(caretX, 1)} ${railY - 5} l -12 -14 l 24 0 Z" class="irail__caret"></path>
      <text x="${num(Math.min(Math.max(caretX, 62), W - 62), 1)}" y="${railY - 26}"
            class="irail__score" text-anchor="middle">${esc(num(score, 1))}</text>
    </g>`;

  // The previous position, as a hollow ring ON the rail. The number itself is in
  // the caption rather than in a second SVG label: the picture answers "which way
  // is it going", the text answers "by how much", and neither has to shout.
  //
  // This is also the reason the hero is a rail and not a countdown. The ring can
  // sit to the RIGHT of the caret as readily as to the left, and the page looks
  // exactly as considered either way.
  const priorMark = priorX === null || priorScore === score ? '' : `
    <circle cx="${num(priorX, 1)}" cy="${railY + railH / 2}" r="9" class="irail__prior"></circle>`;

  const sameMark = '';

  return `
<figure class="irail">
  <svg viewBox="0 0 ${W} ${H}" class="irail__svg" role="img"
       aria-label="${esc(railLabel(infra, priorScore))}">
    ${segs}
    ${caret}
    ${priorMark}
    ${sameMark}
  </svg>
  <figcaption class="irail__cap">${railCaption(infra, priorScore)}</figcaption>
</figure>`;
}

function railLabel(infra, priorScore) {
  if (!Number.isFinite(infra.score)) {
    return 'No composite was computed on this build: every pillar is dark.';
  }
  const was = Number.isFinite(priorScore) ? `, previously ${num(priorScore, 1)}` : '';
  return `SUBSTRATE ${infra.level}, ${infra.level_name}. Composite ${num(infra.score, 1)} of 100${was}. ` +
         `Five stops from SLACK at 0 to MAXIMAL at 100.`;
}

function railCaption(infra, priorScore) {
  if (!Number.isFinite(infra.score)) {
    return `No composite this build. ${esc(String(infra.rule_fired ?? ''))}`;
  }
  const bits = [
    `<b>SUBSTRATE ${esc(String(infra.level))} · ${esc(infra.level_name)}</b>`,
    `${esc(num(infra.score, 1))} of 100`,
  ];
  if (Number.isFinite(priorScore)) {
    const d = infra.score - priorScore;
    bits.push(d === 0
      ? 'unchanged from the previous reading'
      : `${d > 0 ? '+' : '−'}${esc(num(Math.abs(d), 1))} since the previous reading`);
  }
  bits.push(`${esc(String(infra.counts.live))} of ${esc(String(infra.counts.total))} sources scored`);
  return bits.join(' · ');
}

// ---------------------------------------------------------------------------
// 2. THE WARNING — third thing on the page, above every chart
// ---------------------------------------------------------------------------

function warning() {
  return `
<section class="iwarn" aria-labelledby="iwarn-h">
  <h2 class="iwarn__h" id="iwarn-h">Read this before the charts</h2>
  <p class="iwarn__p"><b>Nothing on this page measures datacentre power or datacentre water.</b>
     No public feed separates datacentre load from any other industrial load, and no arithmetic
     downstream can recover a split the input never contained. What is measured here is the
     <i>condition of the substrate</i> those datacentres are being built into: how much load never
     switches off, how much slack the grid has over it, how much water is in the rivers beside the
     clusters, and how much corporate and federal paperwork is moving.</p>
  <p class="iwarn__p">A rising overnight floor in Texas is consistent with a new training cluster.
     It is equally consistent with a new smelter, a cold snap, an electrified rail yard, or a
     methodology change at the grid operator. A falling river is mostly rainfall. <b>Correlation
     here is a hypothesis this page states and has not proved</b>, and the honest version of that
     claim is much weaker than the exciting version.</p>
  <p class="iwarn__p iwarn__p--last">This index does not feed the main ${esc(brand.NAME)} number and
     never has. Its sources are not in the frozen reference distribution, so it is a separate
     instrument on a separate question. A page can be interesting without being load-bearing.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// 3. Pillars
// ---------------------------------------------------------------------------

function pillarCards(infra) {
  const cards = infra.pillars.map((p) => {
    const scored = Number.isFinite(p.score);
    const counts = [
      `${p.sources_live} live`,
      p.sources_awaiting ? `${p.sources_awaiting} awaiting baseline` : null,
      p.sources_dark ? `${p.sources_dark} dark` : null,
    ].filter(Boolean).join(' · ');
    return `
  <div class="ipil ${esc(stateOf(p.state).cls)}">
    <p class="ipil__k">${esc(p.name)}</p>
    <p class="ipil__v">${scored ? esc(num(p.score, 1)) : '—'}<span class="ipil__of">${
      scored ? ' of 100' : ''}</span></p>
    ${scored ? '' : `<p class="ipil__st">${stateTag(p.state)}</p>`}
    <div class="ipil__bar" role="img" aria-label="${esc(
      scored ? `${p.name} at ${num(p.score, 1)} of 100` : `${p.name}: ${stateOf(p.state).word}`)}">
      ${scored ? `<span class="ipil__fill" style="width:${num(railX(p.score), 1)}%"></span>` : ''}
    </div>
    <p class="ipil__b">${esc(p.blurb)}</p>
    <p class="ipil__n">${esc(counts)} · ${p.sources_total} sources</p>
  </div>`;
  }).join('');

  return `<section class="ipils" aria-label="The three pillars">${cards}</section>`;
}

// ---------------------------------------------------------------------------
// 4. THE CORRIDOR BOARD — the regional breakdown
// ---------------------------------------------------------------------------

function corridorBoard(infra) {
  const water = sourceById(infra, 'usgs-water-deficit');
  const drought = sourceById(infra, 'usdm-drought');
  const gauges = new Map((water?.meta?.gauges ?? []).map((g) => [g.site, g]));
  const states = new Map((drought?.meta?.states ?? []).map((s) => [s.abbr, s]));

  const rows = CORRIDORS.map((c) => {
    // Grid cell
    let gridCell;
    if (c.grid) {
      const parts = c.grid.map((id) => sourceById(infra, id)).filter(Boolean);
      const floor = parts.find((s) => s.id.endsWith('baseload'));
      const tight = parts.find((s) => s.id.endsWith('tightness'));
      const bits = [];
      if (floor) {
        bits.push(floor.state === 'dark'
          ? `<span class="ic__dim">floor unavailable</span>`
          : `<b>${esc(fmtNum(floor.value, 0))}</b> MW overnight floor`);
      }
      if (tight && tight.state !== 'dark') {
        bits.push(`${esc(fmtNum(tight.value, 1))}% of committed capacity in use`);
      }
      gridCell = `<div class="ic__has">${bits.join('<br>')}
        <p class="ic__st">${stateTag(floor ? floor.state : 'dark')} · ${esc(c.gridLabel)}</p></div>`;
    } else {
      gridCell = `<div class="ic__none">
        <p class="ic__nonet"><span aria-hidden="true">✕</span> NO FREE FEED · ${esc(c.gridLabel)}</p>
        <p class="ic__why">${esc(c.gridWhy)}</p></div>`;
    }

    // River cell
    const gs = c.gauges.map((site) => gauges.get(site)).filter(Boolean);
    const riverCell = gs.length
      ? gs.map((g) => `<div class="ic__g">
          <span class="ic__gn">${esc(g.name)}</span>
          <span class="ic__gv">${esc(fmtNum(g.percent_of_normal, 0))}% of normal</span>
          ${deviationBar(g.percent_of_normal)}
        </div>`).join('')
      : `<div class="ic__none"><p class="ic__nonet"><span aria-hidden="true">–</span> NO GAUGE</p>
         <p class="ic__why">This corridor is in the index as a grid reference region, not a water one.</p></div>`;

    // Drought cell
    const ss = c.states.map((a) => states.get(a)).filter(Boolean);
    const droughtCell = ss.length
      ? ss.map((s) => `<div class="ic__d">
          <span class="ic__gn">${esc(s.abbr)}</span>
          <span class="ic__gv">${esc(fmtNum(s.d2, 1))}% in D2+</span>
          ${droughtBar(s)}
        </div>`).join('')
      : `<div class="ic__none"><p class="ic__nonet"><span aria-hidden="true">–</span> NOT TRACKED</p></div>`;

    return `
  <article class="ic" id="corridor-${esc(c.id)}">
    <header class="ic__h">
      <h3 class="ic__name">${esc(c.name)}${c.control ? ' <span class="ic__ctl">reference</span>' : ''}</h3>
      <p class="ic__place">${esc(c.place)}</p>
    </header>
    <div class="ic__cell"><p class="ic__ck">Grid</p>${gridCell}</div>
    <div class="ic__cell"><p class="ic__ck">River</p>${riverCell}</div>
    <div class="ic__cell"><p class="ic__ck">Drought</p>${droughtCell}</div>
  </article>`;
  }).join('');

  const withGrid = CORRIDORS.filter((c) => c.grid).length;

  return `
<section class="isec" aria-labelledby="icorr-h">
  <h2 class="isec__h" id="icorr-h">The corridors</h2>
  <p class="isec__l">Nine places where the American build-out actually is, and what each of the three
     pillars can and cannot see there. <b>${esc(String(withGrid))} of ${esc(String(CORRIDORS.length))}
     have a free real-time demand feed.</b> The other ${esc(String(CORRIDORS.length - withGrid))} say
     why not, in their own cell, rather than leaving a blank that reads as an oversight.</p>
  <div class="icorr">${rows}</div>
</section>`;
}

/**
 * Percent-of-normal as a bar centred on 100. Left of centre is below normal.
 * The axis is compressed above 200% because a creek at 3,892% of its September
 * median — a real reading on 2026-09-22 — would otherwise be the whole chart.
 * The compression is stated in the caption; a silently clipped axis is a lie.
 */
function deviationBar(pctOfNormal) {
  if (!Number.isFinite(pctOfNormal)) return '';
  const clamped = Math.min(pctOfNormal, 200);
  const x = (clamped / 200) * 100; // 100% of normal lands at the midpoint
  const dry = pctOfNormal < 100;
  return `<span class="idev" role="img" aria-label="${esc(fmtNum(pctOfNormal, 0))} percent of the long-run normal flow">
    <span class="idev__mid" aria-hidden="true"></span>
    <span class="idev__pip${dry ? ' is-dry' : ' is-wet'}" style="left:${
      num(Math.max(1, Math.min(pctOfNormal > 200 ? 92 : 99, x)), 1)}%"></span>
    ${pctOfNormal > 200 ? '<span class="idev__over" aria-hidden="true">▸</span>' : ''}
  </span>`;
}

/** D2 as the bar; D3 and D4 as notches on it. Severity is never colour alone. */
function droughtBar(s) {
  const d2 = Number.isFinite(s.d2) ? s.d2 : 0;
  const d3 = Number.isFinite(s.d3) ? s.d3 : 0;
  const d4 = Number.isFinite(s.d4) ? s.d4 : 0;
  return `<span class="idro" role="img" aria-label="${esc(s.abbr)}: ${esc(fmtNum(d2, 1))} percent in severe drought or worse, ${esc(fmtNum(d3, 1))} percent extreme, ${esc(fmtNum(d4, 1))} percent exceptional">
    <span class="idro__d2" style="width:${num(Math.min(100, d2), 1)}%"></span>
    ${d3 > 0 ? `<span class="idro__n" style="left:${num(Math.min(99, d3), 1)}%" aria-hidden="true"></span>` : ''}
    ${d4 > 0 ? `<span class="idro__n idro__n--x" style="left:${num(Math.min(99, d4), 1)}%" aria-hidden="true"></span>` : ''}
  </span>`;
}

// ---------------------------------------------------------------------------
// 5. Grid panel
// ---------------------------------------------------------------------------

function gridPanel(infra) {
  const isos = ['ercot-baseload', 'nyiso-baseload', 'caiso-baseload']
    .map((id) => sourceById(infra, id)).filter(Boolean);

  const cards = isos.map((s) => {
    if (s.state === 'dark') {
      return `<div class="ig ${esc(stateOf(s.state).cls)}">
        <p class="ig__k">${esc(s.label)}</p>
        <p class="ig__st">${stateTag('dark')}</p>
        <p class="ig__why">${esc(s.error ?? 'no reason recorded')}</p></div>`;
    }
    const m = s.meta ?? {};
    const floor = s.value;
    const high = Number.isFinite(m.window_high_mw) ? m.window_high_mw : null;
    // The bar shows the floor as a share of the overnight HIGH, which is the one
    // comparison a reader can make without a baseline: how flat was the night.
    const flat = high && high > 0 ? (floor / high) * 100 : null;
    return `
  <div class="ig ${esc(stateOf(s.state).cls)}">
    <p class="ig__k">${esc(s.region ?? s.label)}</p>
    <p class="ig__v">${esc(fmtNum(floor, 0))}<span class="ig__u">MW</span></p>
    <p class="ig__sub">overnight floor · ${esc(String(m.window_local ?? ''))}${
      m.local_day ? ` · ${esc(String(m.local_day))}` : ''}</p>
    ${flat === null ? '' : `
    <div class="ig__bar" role="img" aria-label="Floor ${esc(fmtNum(floor, 0))} megawatts against an overnight high of ${esc(fmtNum(high, 0))}, ${esc(num(flat, 0))} percent">
      <span class="ig__fill" style="width:${num(Math.max(2, Math.min(100, flat)), 1)}%"></span>
    </div>
    <p class="ig__n">${esc(num(flat, 0))}% of the night’s high (${esc(fmtNum(high, 0))} MW) ·
       range ${esc(fmtNum(m.window_range_mw, 0))} MW</p>`}
    <p class="ig__st">${stateTag(s.state, s.state === 'awaiting-baseline'
      ? `${s.baseline_n} of ${infra.thresholds.min_baseline_n}` : '')}</p>
    <p class="ig__n">${esc(String(m.intervals_used ?? '?'))} of ${esc(String(m.intervals_expected ?? '?'))}
       five-minute intervals used</p>
  </div>`;
  }).join('');

  const t = sourceById(infra, 'ercot-tightness');
  const prc = t?.meta?.prc ?? null;
  const headroom = !t || t.state === 'dark' ? `
    <div class="ihd is-dark"><p class="ihd__k">ERCOT headroom</p>
      <p class="ig__st">${stateTag('dark')}</p>
      <p class="ig__why">${esc(t?.error ?? 'source not present in this build')}</p></div>` : `
    <div class="ihd ${esc(stateOf(t.state).cls)}">
      <p class="ihd__k">ERCOT headroom, right now</p>
      <p class="ihd__v">${esc(fmtNum(t.value, 1))}<span class="ig__u">% of committed capacity in use</span></p>
      <div class="ihd__bar" role="img" aria-label="${esc(fmtNum(t.value, 1))} percent of ERCOT's committed capacity in use">
        <span class="ihd__fill" style="width:${num(railX(t.value), 1)}%"></span>
        <span class="ihd__tick" style="left:90%" aria-hidden="true"></span>
      </div>
      <p class="ig__n">${esc(fmtNum(t.meta?.demand_mw, 0))} MW of ${esc(fmtNum(t.meta?.committed_capacity_mw, 0))} MW committed ·
         ${esc(fmtNum(t.meta?.headroom_mw, 0))} MW spare · tick at 90%</p>
      ${prc && !prc.error ? `
      <p class="ihd__prc"><b>Physical responsive capability</b> ${esc(fmtNum(prc.current_mw, 0))} MW now,
         low of ${esc(fmtNum(prc.day_low_mw, 0))} MW today across ${esc(String(prc.samples))} samples.
         ERCOT’s own reading of its own grid: <q>${esc(String(prc.ercot_note ?? ''))}</q>
         (${esc(String(prc.ercot_title ?? 'no title'))}, emergency level ${esc(String(prc.eea_level))}).</p>`
        : `<p class="ihd__prc ic__dim">Physical responsive capability was not read on this build${
            prc?.error ? `: ${esc(String(prc.error))}` : ''}. The headroom figure above does not depend on it.</p>`}
      <p class="ig__st">${stateTag(t.state, t.state === 'awaiting-baseline'
        ? `${t.baseline_n} of ${infra.thresholds.min_baseline_n}` : '')}</p>
    </div>`;

  return `
<section class="isec" aria-labelledby="igrid-h">
  <h2 class="isec__h" id="igrid-h">The grid</h2>
  <p class="isec__l">Every grid has a daily minimum — the hour when air conditioning, offices and
     traffic have all gone home. What is still drawing power at four in the morning is the load that
     never stops, and a datacentre is one of very few large loads that runs flat out at that hour.
     <b>The overnight floor is the cleanest public proxy for always-on industrial demand that exists
     without a utility contract.</b> It is also moved by smelters, cold snaps and pumping, which is
     why New York and California are here as reference regions rather than as subjects.</p>
  <div class="igs">${cards}</div>
  ${headroom}
</section>`;
}

// ---------------------------------------------------------------------------
// 6. Water panel
// ---------------------------------------------------------------------------

function waterPanel(infra) {
  const w = sourceById(infra, 'usgs-water-deficit');
  const d = sourceById(infra, 'usdm-drought');

  const gaugeRows = !w || w.state === 'dark' ? `
    <p class="ig__st">${stateTag('dark')}</p>
    <p class="ig__why">${esc(w?.error ?? 'source not present in this build')}</p>`
    : (w.meta?.gauges ?? []).map((g) => `
    <tr>
      <th scope="row"><span class="iw__n">${esc(g.name)}</span>
        <span class="iw__c">${esc(g.cluster)} · ${esc(g.state)}</span></th>
      <td class="num">${esc(fmtNum(g.flow_cfs, 0))}</td>
      <td class="num">${esc(fmtNum(g.normal_cfs, 0))}</td>
      <td class="num"><b>${esc(fmtNum(g.percent_of_normal, 0))}%</b></td>
      <td class="iw__bar">${deviationBar(g.percent_of_normal)}</td>
      <td class="iw__rec">${esc(String(g.record_years ?? '—'))}</td>
    </tr>`).join('');

  const stateRows = !d || d.state === 'dark' ? `
    <p class="ig__st">${stateTag('dark')}</p>
    <p class="ig__why">${esc(d?.error ?? 'source not present in this build')}</p>`
    : (d.meta?.states ?? []).map((s) => `
    <tr>
      <th scope="row"><span class="iw__n">${esc(s.name)}</span>
        <span class="iw__c">${esc(s.cluster)}</span></th>
      <td class="num"><b>${esc(fmtNum(s.d2, 1))}%</b></td>
      <td class="iw__bar">${droughtBar(s)}</td>
      <td class="num iw__rec">${esc(fmtNum(s.d3, 1))} / ${esc(fmtNum(s.d4, 1))}</td>
    </tr>`).join('');

  const wMeta = w?.meta ?? {};

  return `
<section class="isec" aria-labelledby="iwater-h">
  <h2 class="isec__h" id="iwater-h">The water</h2>
  <p class="isec__l">Cooling a datacentre consumes water, and the argument about how much is one of
     the loudest live public fights about this industry. <b>Nobody publishes the consumption.</b>
     What is published, free and keyless, is the state of the water the clusters have to draw on:
     the flow in the river beside them, measured against the median for that same calendar date over
     that gauge’s whole record — 127 years at Austin, 116 at Leesburg. The denominator is the
     Geological Survey’s, not ours.</p>

  <div class="iw">
    <h3 class="iw__h">Nine gauges, ${esc(String(wMeta.reading_day ?? 'no reading'))}</h3>
    ${w && w.state !== 'dark' ? `
    <p class="iw__lede">Median across the nine: <b>${esc(fmtNum(w.value, 1))}% ${
      w.value >= 0 ? 'below' : 'above'} normal</b>.
      The mean is ${esc(fmtNum(wMeta.mean_deficit_pct, 1))}% and is deliberately not the scalar —
      one creek in flood moves a mean of ratios by hundreds of points and moves a median by nothing.
      Driest: ${esc(String(wMeta.driest ?? '—'))}. Wettest: ${esc(String(wMeta.wettest ?? '—'))}.
      ${esc(String(wMeta.lag_note ?? ''))}.</p>
    <div class="iw__scroll"><table class="iw__t">
      <caption class="iw__cap">Bars are centred on 100% of normal and compressed above 200%; a
        gauge past that carries a ▸ rather than a longer bar.</caption>
      <thead><tr><th scope="col">Gauge</th><th scope="col" class="num">Flow</th>
        <th scope="col" class="num">Normal</th><th scope="col" class="num">Of normal</th>
        <th scope="col">Dry ← → Wet</th><th scope="col">Record</th></tr></thead>
      <tbody>${gaugeRows}</tbody>
    </table></div>` : gaugeRows}
  </div>

  <div class="iw">
    <h3 class="iw__h">Ten states, US Drought Monitor${
      d && d.state !== 'dark' ? ` · map of ${esc(String(d.meta?.map_date ?? ''))}` : ''}</h3>
    ${d && d.state !== 'dark' ? `
    <p class="iw__lede">Share of each state’s area in <b>D2 — severe drought</b> or worse.
      D0 is on somewhere almost always and carries no information; D2 is roughly where water
      utilities start issuing restrictions, which is where a river stops being scenery and starts
      being a permit condition. The Drought Monitor is a weekly expert assessment produced by NDMC,
      USDA and NOAA. It is a judgement, not an instrument reading, and it is averaged here without
      area or population weighting.</p>
    <div class="iw__scroll"><table class="iw__t">
      <thead><tr><th scope="col">State</th><th scope="col" class="num">D2+</th>
        <th scope="col">Share of area</th><th scope="col" class="num">D3 / D4</th></tr></thead>
      <tbody>${stateRows}</tbody>
    </table></div>` : stateRows}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// 7. Build-out panel
// ---------------------------------------------------------------------------

function buildoutPanel(infra) {
  const ids = ['sec-datacenter', 'sec-power-contracts', 'fedreg-datacenter'];
  const cards = ids.map((id) => sourceById(infra, id)).filter(Boolean).map((s) => {
    if (s.state === 'dark') {
      return `<div class="ib is-dark"><p class="ib__k">${esc(s.label)}</p>
        <p class="ig__st">${stateTag('dark')}</p><p class="ig__why">${esc(s.error ?? '')}</p></div>`;
    }
    const m = s.meta ?? {};
    return `
  <div class="ib ${esc(stateOf(s.state).cls)}">
    <p class="ib__k">${esc(String(m.phrase ?? m.term ?? s.label))}</p>
    <p class="ib__v">${esc(fmtNum(s.value, 0))}</p>
    <p class="ib__u">${esc(String(s.unit_label ?? s.unit ?? ''))}</p>
    <p class="ig__n">${esc(String(m.startdt ?? m.window_start ?? '?'))} to
       ${esc(String(m.enddt ?? m.window_end ?? '?'))}</p>
    ${s.state === 'live' ? `<p class="ig__n">${esc(num(100 * s.percentile, 0))}th percentile of
       ${esc(String(s.baseline_n))} points (${esc(String(s.baseline_span ?? ''))})</p>` : ''}
    <p class="ig__st">${stateTag(s.state, s.state === 'awaiting-baseline'
      ? `${s.baseline_n} of ${infra.thresholds.min_baseline_n}` : '')}</p>
    <p class="ib__note">${esc(String(m.source_note ?? ''))}</p>
  </div>`;
  }).join('');

  return `
<section class="isec" aria-labelledby="ibuild-h">
  <h2 class="isec__h" id="ibuild-h">The build-out</h2>
  <p class="isec__l">Power and water are what a training cluster consumes. This is what it costs,
     and it is the one part of the story American public companies are legally obliged to write
     down. A company can decline to say how large its next model is. It cannot decline to tell its
     shareholders it has committed to buildings full of racks, or to sign a decade of electricity
     without the contract appearing in a filing.</p>
  <div class="ibs">${cards}</div>
</section>`;
}

// ---------------------------------------------------------------------------
// 8. Every source
// ---------------------------------------------------------------------------

function sourceTable(infra) {
  const rows = infra.sources.map((s) => `
    <tr class="${esc(stateOf(s.state).cls)}">
      <th scope="row"><span class="iw__n">${esc(s.label)}</span>
        <span class="iw__c"><code>${esc(s.id)}</code> · ${esc(String(s.region ?? ''))}</span></th>
      <td>${stateTag(s.state)}</td>
      <td class="num">${s.value === null ? '—' : esc(fmtNum(s.value, 2))}</td>
      <td class="iw__rec">${esc(String(s.unit_label ?? s.unit ?? ''))}</td>
      <td class="num">${s.score === null ? '—' : esc(num(s.score, 1))}</td>
      <td class="num">${s.percentile === null ? '—' : `${esc(num(100 * s.percentile, 1))}`}</td>
      <td class="num">${esc(String(s.baseline_n))}</td>
      <td class="iw__rec">${esc(String(s.baseline_origin ?? '—'))}${
        s.baseline_span ? `<br><span class="ic__dim">${esc(String(s.baseline_span))}</span>` : ''}</td>
    </tr>
    ${s.error ? `<tr class="is-dark"><td colspan="8" class="iw__err">${esc(s.error)}</td></tr>` : ''}
    ${s.state === 'awaiting-baseline' ? `<tr><td colspan="8" class="iw__err ic__dim">${
      esc(String(s.baseline_note ?? ''))}. The reading above is real and is printed; it is simply not
      yet scored, and it is excluded from every average on this page.</td></tr>` : ''}`).join('');

  return `
<section class="isec" aria-labelledby="isrc-h">
  <h2 class="isec__h" id="isrc-h">Every source, every state</h2>
  <p class="isec__l">Three states, kept apart everywhere they appear.
     <b>${stateTag('live')}</b> the feed answered and there is enough baseline to score it.
     <b>${stateTag('awaiting-baseline')}</b> the feed answered, the number is real and printed, and
     there is not yet enough history to say where it sits — it is in no average on this page.
     <b>${stateTag('dark')}</b> the fetch failed; the reason is printed under the row and nothing is
     imputed in its place. Merging the second into the third would claim an outage that is not
     happening, which is the most common quiet lie in this whole category.</p>
  <div class="iw__scroll"><table class="iw__t iw__t--src">
    <thead><tr><th scope="col">Source</th><th scope="col">State</th><th scope="col" class="num">Value</th>
      <th scope="col">Unit</th><th scope="col" class="num">Score</th><th scope="col" class="num">Pctile</th>
      <th scope="col" class="num">n</th><th scope="col">Baseline</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>`;
}

// ---------------------------------------------------------------------------
// 9. What this cannot tell you
// ---------------------------------------------------------------------------

function cannotTell(infra) {
  const items = [
    ['It cannot separate a datacentre from a smelter.',
     'No public grid feed breaks demand out by customer class in real time. An overnight floor is ' +
     'the sum of everything that never switches off. If the Texas floor climbs 900 MW, this page ' +
     'can tell you it climbed and cannot tell you what climbed.'],
    ['It cannot measure water consumption.',
     'Datacentre water draw is not published by anyone, anywhere, at any cadence. Streamflow is ' +
     'rain, snowmelt, reservoir operations and irrigation, and a cooling tower is a rounding error ' +
     'against all four. This measures the constraint, never the consumption.'],
    ['Five of the nine corridors have no grid feed at all.',
     'Northern Virginia is the largest datacentre cluster on earth and it sits inside PJM, whose ' +
     'real-time demand is behind a registered key. Ohio is the same. Iowa’s MISO broker returns ' +
     'no data. Georgia, Arizona and Oregon are not organised markets and have no independent ' +
     'operator publishing demand. The corridor board says so in each cell.'],
    ['The build-out counters count documents, not dollars.',
     'A filing that mentions "data centers" once and a filing announcing forty billion dollars of ' +
     'capital expenditure are one hit each. The Federal Register counter is noisier still: it also ' +
     'matches the National Climatic Data Center and every federal building with the words in ' +
     'its name.'],
    ['Filing counts carry the filing calendar inside them.',
     'Annual-report season lifts every full-text phrase count in February and March regardless of ' +
     'what anyone is building. That seasonality is real, it enters the baseline once the baseline ' +
     'is long enough to contain a February, and until then the buildout pillar should be read with ' +
     'that in mind.'],
    ['The Federal Register baseline is autocorrelated.',
     'Its baseline is a 180-day rolling count taken at weekly steps, so consecutive points share ' +
     '173 of their 180 days. The effective sample size is far below the point count, and its ' +
     'percentile is correspondingly less informative than the same number from the Drought Monitor.'],
    ['The Drought Monitor is a judgement, not a measurement.',
     'It is produced weekly by human analysts at NDMC, USDA and NOAA folding together many inputs. ' +
     'It is the best summary of slow water state that exists and it is not the same kind of object ' +
     'as a stream gauge. Both are on this page on purpose; when they disagree, that disagreement ' +
     'is the reading.'],
    ['CAISO is dark for six hours a day, by design.',
     'Its public outlook file carries the current Pacific day only and there is no dated archive. ' +
     'Between midnight and 06:00 Pacific no complete overnight window exists, so the source reports ' +
     'DARK rather than publishing the minimum of a two-hour window as though it were a six-hour one.'],
    ['Its own scale is a statement about its own record.',
     `SUBSTRATE ${esc(String(infra.level ?? '—'))} does not mean the grid is in trouble. It means the ` +
     'composite of these readings sits in that band of the distribution this index has observed. ' +
     'A young index has a short record, and a short record makes every reading look more ordinary ' +
     'than it may be.'],
  ];

  return `
<section class="isec icant" aria-labelledby="icant-h">
  <h2 class="isec__h" id="icant-h">What this cannot tell you</h2>
  <p class="isec__l">The difference between an instrument and a conspiracy chart is that the
     instrument publishes this list.</p>
  <dl class="icant__l">${items.map(([k, v]) => `
    <div class="icant__i"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
</section>`;
}

// ---------------------------------------------------------------------------
// 10. Arithmetic
// ---------------------------------------------------------------------------

function howComputed(ctx, infra) {
  const t = infra.thresholds ?? {};
  return `
<section class="isec" aria-labelledby="ihow-h">
  <h2 class="isec__h" id="ihow-h">How the number is made</h2>
  <ol class="ihow">
    <li><b>Each source returns one scalar</b> where higher always means more activity. A source that
        naturally points the other way is negated inside its own adapter, so nothing downstream has
        to remember which is which.</li>
    <li><b>Normalise.</b> Empirical percentile against that source’s baseline, then inverse
        normal CDF, then <code>S = 50 + 12.5z</code>, clamped to 0–100. This is the same code the
        main ${esc(brand.NAME)} index uses, imported rather than reimplemented.</li>
    <li><b>The baseline is the feed’s own history where the feed has one</b> — five years of
        weekly Drought Monitor maps, three years of daily USGS values, five years of Federal
        Register publication dates. Where a feed publishes only today, this collector accumulates
        one reading per day until it has ${esc(String(t.min_baseline_n ?? 30))} of them, and the
        source reads <i>awaiting baseline</i> in the meantime.</li>
    <li><b>Pillar score</b> is the mean of its live sources. A pillar with no live source has no
        score; it is never zero and never carried forward.</li>
    <li><b>Composite</b> is <code>${esc(String(t.composite ?? ''))}</code> over live pillars. The
        max term is why one pillar at the top of its record moves the number even when the others
        are ordinary.</li>
    <li><b>Level</b> from the composite on fixed bands, with a ${esc(String(t.deadband ?? 3))}-point
        Schmitt deadband, a ${esc(String(t.min_hours_between_changes ?? 6))}-hour minimum between
        changes, one step per change, a ${esc(String(t.quorum ?? 2))}-of-3 pillar quorum, and a
        freeze on any change while a pillar is genuinely dark.</li>
  </ol>
  <p class="isec__l">Two of the main index’s six anti-flap layers are deliberately absent here
     and are named rather than skipped: the dual-window dwell needs a dense observation history this
     index does not have — half its sources move once a day and one moves once a week — and the
     four-hour post-change lock is subsumed by the longer minimum interval.</p>
  <p class="isec__l">Every number on this page is in
     <a href="${esc(ctx.href('/api/infra.json'))}">the JSON</a>, including each source’s
     baseline span, its percentile, and the raw reading behind it. The last build fired the rule
     <code>${esc(String(infra.rule_fired ?? 'none'))}</code>.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// The hero strip — the useful facts, above the fold
// ---------------------------------------------------------------------------

function heroFacts(infra) {
  const c = infra.counts ?? {};
  const items = [
    ['Compiled', `<time datetime="${esc(infra.generated_at)}">${esc(utc(infra.generated_at))}</time>`],
    ['Scored', `${esc(String(c.live ?? 0))} of ${esc(String(c.total ?? 0))} sources`],
    ['Awaiting baseline', `${esc(String(c.awaiting_baseline ?? 0))}`],
    ['Dark', `${esc(String(c.dark ?? 0))}`],
    ['Level held since', infra.level_since
      ? `<time datetime="${esc(infra.level_since)}">${esc(utcDay(infra.level_since))}</time>`
      : '—'],
    ['Feeds the main index', 'No'],
  ];
  return `<dl class="ihero__facts">${items.map(([k, v]) =>
    `<div class="ihero__f"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

/**
 * The one plain sentence, before the gauge, for the reader who arrived worried.
 * Computed from the state, never hard-coded, and it never says anything the
 * arithmetic does not support.
 */
function plainSentence(infra) {
  if (!Number.isFinite(infra.score)) {
    const lk = infra.last_known;
    return lk
      ? `Nothing was computed on this build — every pillar is dark. The last reading that produced a
         number was ${esc(num(lk.score, 1))} of 100 at ${esc(utc(lk.generated_at))}. That is the last
         reading, not the current one.`
      : `Nothing was computed on this build. Every pillar is dark and no earlier reading is on file.`;
  }
  const band = (infra.levels ?? []).find((l) => l.level === infra.level);
  return `Today reads ${infra.level >= 4 ? 'ordinary' : infra.level === 3 ? 'above the middle' : 'near the top'}.
    ${esc(num(infra.score, 1))} of 100 sits in the ${esc(String(band?.min ?? ''))}–${esc(String(band?.max ?? ''))}
    band of this index’s own record. ${esc(String(band?.gloss ?? ''))}
    This is a count of how loaded the substrate is, not a claim about what anyone is building on it.`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasInfra(ctx)) return emptyPage(ctx);
  const infra = ctx.infra;

  const headline = Number.isFinite(infra.score)
    ? `SUBSTRATE ${infra.level} ${infra.level_name} at ${num(infra.score, 1)}`
    : 'No reading on this build';

  const description =
    `Power, water and the paper trail underneath the models. ` +
    `${infra.counts.live} of ${infra.counts.total} keyless public feeds scored — grid overnight ` +
    `floors in three control regions, streamflow at nine gauges beside named datacentre clusters, ` +
    `drought across ten states, and SEC and Federal Register build-out counts. ${headline}. ` +
    `It does not measure datacentre power draw, and the page says why. ` +
    `Compiled ${utc(infra.generated_at)}.`;

  const main = `<style>${infraCss()}</style>
<section class="ihero">
  <p class="ihero__eyebrow">A ${esc(brand.NAME)} sub-index · does not feed the main number</p>
  <h1 class="ihero__h1">The infrastructure index</h1>
  <p class="ihero__lede">Intelligence is electricity with extra steps. You cannot train a frontier
     model without power, water and concrete, and unlike model weights, all three leave a public
     paper trail. Every input below is free, keyless and published by somebody with no interest in
     this question at all.</p>
  <p class="ihero__plain">${plainSentence(infra)}</p>
  ${rail(infra)}
  ${heroFacts(infra)}
</section>

${warning()}

${pillarCards(infra)}

${corridorBoard(infra)}

${gridPanel(infra)}

${waterPanel(infra)}

${buildoutPanel(infra)}

${sourceTable(infra)}

${cannotTell(infra)}

${howComputed(ctx, infra)}
`;

  return page({
    ctx,
    path: PATH,
    title: `The infrastructure index — ${headline} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: the infrastructure index — ${headline}`,
    description,
    ogImage: ctx.cardFor ? ctx.cardFor('infra') : null,
    ogImageAlt: `${brand.NAME} infrastructure index: ${headline}`,
    jsonld: [dataset(ctx, infra)],
    main,
  });
}

/** ctx.infra absent. Builds, says so plainly, and carries noindex. */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `The infrastructure index · ${brand.NAME}`,
    description: `${brand.NAME}'s infrastructure index has not published a run yet.`,
    main: `<style>${infraCss()}</style>
<section class="ihero">
  <h1 class="ihero__h1">The infrastructure index</h1>
  <p class="ihero__lede">No run has been published in this build. This is not an empty result — it is
     the absence of a result, and the two are different states.</p>
  <p class="isec__l">Run <code>collector/infra.mjs</code> and rebuild.</p>
</section>`,
  });
}

function dataset(ctx, infra) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} infrastructure index`,
    description:
      'Grid overnight demand floors, streamflow against long-run normals at nine gauges beside ' +
      'datacentre clusters, US Drought Monitor severity across ten states, and SEC and Federal ' +
      'Register build-out counts. Keyless public sources only.',
    url: ctx.url(PATH),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    dateModified: infra.generated_at,
    distribution: [{
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: ctx.url('/api/infra.json'),
    }],
    variableMeasured: infra.sources.map((s) => ({
      '@type': 'PropertyValue',
      name: s.label,
      unitText: s.unit_label ?? s.unit ?? undefined,
      value: s.value ?? undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// CSS. Scoped to this page, injected in main, uses the shared tokens only.
// Mobile first: every layout rule below starts at one column and widens.
// ---------------------------------------------------------------------------

function infraCss() {
  return `
.ihero{margin:0 0 var(--sec)}
.ihero__eyebrow{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.ihero__h1{font:600 clamp(1.6rem,7vw,2.4rem)/1.08 var(--sans);letter-spacing:-.02em;margin:0 0 var(--s-3)}
.ihero__lede{font:400 var(--t-md)/1.5 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:62ch}
.ihero__plain{font:400 var(--t-base)/1.55 var(--sans);margin:0 0 var(--s-5);max-width:58ch;
  padding:var(--s-3) var(--s-4);background:var(--wash-alt);border-left:3px solid var(--accent);border-radius:var(--radius)}

.irail{margin:0 0 var(--s-4)}
.irail__svg{display:block;width:100%;height:auto}
.irail__seg{fill:var(--wash-alt);stroke:var(--rule);stroke-width:1.5}
.irail__seg.is-lit{fill:var(--fill);stroke:var(--accent);stroke-width:2.5}
.irail__litline{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-dasharray:5 4}
.irail__name{font:600 26px var(--mono);letter-spacing:.04em;fill:var(--ink-faint)}
.irail__name.is-lit{fill:var(--ink)}
.irail__band{font:400 20px var(--mono);fill:var(--ink-faint)}
.irail__no{font:500 19px var(--mono);fill:var(--ink-faint)}
.irail__no.is-lit{fill:var(--accent)}
.irail__caret{fill:var(--accent)}
.irail__score{font:700 40px var(--mono);fill:var(--ink);font-variant-numeric:tabular-nums}
.irail__prior{fill:none;stroke:var(--ink-dim);stroke-width:3.5}
.irail__priorlab{font:400 20px var(--mono);fill:var(--ink-dim)}
.irail__cap{font:400 var(--t-sm)/1.5 var(--mono);color:var(--ink-dim);margin:var(--s-2) 0 0;
  font-variant-numeric:tabular-nums}
.irail__cap b{color:var(--ink)}

.ihero__facts{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--rule-soft);
  border:1px solid var(--rule-soft);margin:var(--s-4) 0 0;border-radius:var(--radius);overflow:hidden}
.ihero__f{background:var(--bg);padding:var(--s-2) var(--s-3)}
.ihero__f dt{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.ihero__f dd{margin:2px 0 0;font:500 var(--t-sm)/1.35 var(--mono);font-variant-numeric:tabular-nums}

.iwarn{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-4);
  margin:0 0 var(--sec);background:var(--bg-raised)}
.iwarn__h{font:600 var(--t-md)/1.3 var(--sans);margin:0 0 var(--s-3)}
.iwarn__p{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);max-width:66ch}
.iwarn__p--last{margin-bottom:0}
.iwarn__p b{color:var(--ink)}

.ipils{display:grid;grid-template-columns:1fr;gap:var(--s-3);margin:0 0 var(--sec)}
.ipil{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-3) var(--s-4)}
.ipil.is-wait{border-style:dashed}
.ipil.is-dark{border-style:dotted;opacity:.82}
.ipil__k{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-1)}
.ipil__v{font:600 var(--t-xl)/1 var(--mono);font-variant-numeric:tabular-nums;margin:0}
.ipil__of{font:400 var(--t-xs) var(--mono);color:var(--ink-faint)}
.ipil__st{margin:var(--s-2) 0 0}
.ipil__bar{height:5px;background:var(--wash-alt);border-radius:2px;margin:var(--s-2) 0;overflow:hidden}
.ipil__fill{display:block;height:100%;background:var(--accent)}
.ipil__b{font:400 var(--t-sm)/1.5 var(--sans);color:var(--ink-dim);margin:0}
.ipil__n{font:400 var(--t-2xs)/1.4 var(--mono);color:var(--ink-faint);margin:var(--s-2) 0 0}

.isec{margin:0 0 var(--sec-lg)}
.isec__h{font:600 var(--t-xl)/1.15 var(--sans);letter-spacing:-.015em;margin:0 0 var(--s-3);
  padding-top:var(--s-3);border-top:1px solid var(--rule)}
.isec__l{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:66ch}
.isec__l b{color:var(--ink)}

.ist{display:inline-flex;align-items:baseline;gap:5px;font:500 var(--t-2xs)/1.3 var(--mono);
  letter-spacing:.07em;white-space:nowrap}
.ist__g{font-size:.9em}
.ist__x{color:var(--ink-faint);letter-spacing:0}
.ist.is-live{color:var(--ok)}
.ist.is-wait{color:var(--stale)}
.ist.is-dark{color:var(--dark-src)}

.icorr{display:grid;grid-template-columns:1fr;gap:var(--s-3)}
.ic{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-3) var(--s-4);
  display:grid;grid-template-columns:1fr;gap:var(--s-3)}
.ic__h{margin:0}
.ic__name{font:600 var(--t-md)/1.2 var(--sans);margin:0}
.ic__ctl{font:500 var(--t-2xs) var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);border:1px solid var(--rule);border-radius:2px;padding:1px 5px;vertical-align:middle}
.ic__place{font:400 var(--t-xs)/1.4 var(--mono);color:var(--ink-faint);margin:3px 0 0}
.ic__cell{border-top:1px solid var(--rule-soft);padding-top:var(--s-2)}
.ic__ck{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-1)}
.ic__has{font:400 var(--t-sm)/1.55 var(--mono);font-variant-numeric:tabular-nums}
.ic__st{margin:var(--s-1) 0 0}
.ic__none{padding:2px 0}
.ic__nonet{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.07em;color:var(--ink-faint);margin:0}
.ic__why{font:400 var(--t-2xs)/1.5 var(--sans);color:var(--ink-faint);margin:3px 0 0;max-width:52ch}
.ic__dim{color:var(--ink-faint)}
.ic__g,.ic__d{display:grid;grid-template-columns:1fr auto;gap:2px var(--s-2);align-items:baseline;
  margin:0 0 var(--s-2)}
.ic__g:last-child,.ic__d:last-child{margin-bottom:0}
.ic__gn{font:400 var(--t-xs)/1.4 var(--sans);color:var(--ink-dim)}
.ic__gv{font:500 var(--t-xs)/1.4 var(--mono);font-variant-numeric:tabular-nums;text-align:right}

.idev{position:relative;display:block;grid-column:1/-1;height:9px;background:var(--wash-alt);
  border-radius:2px;margin-top:3px}
.idev__mid{position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:var(--ink-faint)}
.idev__pip{position:absolute;top:-2px;width:3px;height:13px;border-radius:1px;transform:translateX(-1.5px)}
.idev__pip.is-dry{background:var(--stale)}
.idev__pip.is-wet{background:var(--ink-dim)}
.idev__over{position:absolute;right:2px;top:-5px;font:700 13px/1 var(--mono);color:var(--ink);
  background:var(--bg);padding:0 1px}

.idro{position:relative;display:block;grid-column:1/-1;height:9px;background:var(--wash-alt);
  border-radius:2px;margin-top:3px;overflow:hidden}
.idro__d2{position:absolute;left:0;top:0;bottom:0;background:var(--stale)}
.idro__n{position:absolute;top:0;bottom:0;width:2px;background:var(--bg)}
.idro__n--x{width:2px;box-shadow:2px 0 0 var(--bg)}

.igs{display:grid;grid-template-columns:1fr;gap:var(--s-3);margin:0 0 var(--s-4)}
.ig,.ihd,.ib{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-3) var(--s-4)}
.ig.is-wait,.ihd.is-wait,.ib.is-wait{border-style:dashed}
.ig.is-dark,.ihd.is-dark,.ib.is-dark{border-style:dotted}
.ig__k,.ihd__k,.ib__k{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-1)}
.ig__v,.ihd__v,.ib__v{font:600 var(--t-xl)/1 var(--mono);font-variant-numeric:tabular-nums;margin:0}
.ig__u{font:400 var(--t-xs) var(--mono);color:var(--ink-faint);margin-left:6px;letter-spacing:0}
.ig__sub,.ib__u{font:400 var(--t-xs)/1.4 var(--mono);color:var(--ink-dim);margin:var(--s-1) 0 0}
.ig__bar,.ihd__bar{position:relative;height:8px;background:var(--wash-alt);border-radius:2px;
  margin:var(--s-2) 0;overflow:hidden}
.ig__fill,.ihd__fill{display:block;height:100%;background:var(--accent)}
.ihd__tick{position:absolute;top:0;bottom:0;width:2px;background:var(--ink)}
.ig__n{font:400 var(--t-2xs)/1.5 var(--mono);color:var(--ink-faint);margin:var(--s-1) 0 0;
  font-variant-numeric:tabular-nums}
.ig__st{margin:var(--s-2) 0 0}
.ig__why{font:400 var(--t-2xs)/1.5 var(--mono);color:var(--dark-src);margin:var(--s-1) 0 0;word-break:break-word}
.ihd__prc{font:400 var(--t-sm)/1.55 var(--sans);color:var(--ink-dim);margin:var(--s-3) 0 0;max-width:62ch}
.ihd__prc q{font-style:italic}
.ib__note{font:400 var(--t-2xs)/1.5 var(--sans);color:var(--ink-faint);margin:var(--s-2) 0 0}
.ibs{display:grid;grid-template-columns:1fr;gap:var(--s-3)}

.iw{margin:0 0 var(--s-5)}
.iw__h{font:600 var(--t-md)/1.25 var(--sans);margin:0 0 var(--s-2)}
.iw__lede{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);max-width:66ch}
.iw__lede b{color:var(--ink)}
.iw__scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.iw__t{width:100%;border-collapse:collapse;font:400 var(--t-xs)/1.4 var(--mono);
  font-variant-numeric:tabular-nums;min-width:540px}
.iw__t--src{min-width:680px}
.iw__cap{caption-side:bottom;text-align:left;font:400 var(--t-2xs)/1.5 var(--sans);
  color:var(--ink-faint);padding-top:var(--s-2)}
.iw__t th,.iw__t td{text-align:left;padding:var(--s-2) var(--s-2);border-bottom:1px solid var(--rule-soft);
  vertical-align:top}
.iw__t thead th{font:500 var(--t-2xs) var(--mono);letter-spacing:.07em;text-transform:uppercase;
  color:var(--ink-faint);border-bottom:1px solid var(--rule)}
.iw__t .num{text-align:right}
.iw__n{display:block;font:400 var(--t-xs)/1.35 var(--sans);color:var(--ink)}
.iw__c{display:block;font:400 var(--t-2xs)/1.4 var(--mono);color:var(--ink-faint);margin-top:2px}
.iw__rec{color:var(--ink-faint);font-size:var(--t-2xs)}
.iw__bar{min-width:120px}
.iw__err{font:400 var(--t-2xs)/1.5 var(--mono);color:var(--dark-src);word-break:break-word;
  border-bottom:1px solid var(--rule-soft)}
.iw__err.ic__dim{color:var(--ink-faint)}
.iw__t tr.is-dark th .iw__n{text-decoration:line-through;text-decoration-thickness:1px}

.icant__l{margin:0;display:grid;grid-template-columns:1fr;gap:var(--s-3)}
.icant__i{border-left:2px solid var(--rule);padding-left:var(--s-3)}
.icant__i dt{font:600 var(--t-sm)/1.4 var(--sans);margin:0 0 3px}
.icant__i dd{margin:0;font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);max-width:64ch}

.ihow{margin:0 0 var(--s-4);padding-left:1.3em;font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim)}
.ihow li{margin:0 0 var(--s-2);max-width:64ch}
.ihow b{color:var(--ink)}
.ihow code,.isec__l code{font:400 .92em var(--mono);background:var(--wash-alt);padding:1px 4px;border-radius:2px}

@media (min-width:560px){
  .ipils{grid-template-columns:repeat(3,1fr)}
  .igs{grid-template-columns:repeat(3,1fr)}
  .ibs{grid-template-columns:repeat(3,1fr)}
  .ihero__facts{grid-template-columns:repeat(3,1fr)}
}
@media (min-width:860px){
  .icorr{grid-template-columns:repeat(2,1fr)}
  .ic{grid-template-columns:1fr;align-content:start}
  .ihero__facts{grid-template-columns:repeat(6,1fr)}
  .icant__l{grid-template-columns:repeat(2,1fr)}
}
@media (min-width:1100px){
  .ic{grid-template-columns:minmax(0,1.1fr) repeat(3,minmax(0,1fr));gap:var(--s-4);align-items:start}
  .ic__h{grid-column:1}
  .ic__cell{border-top:none;border-left:1px solid var(--rule-soft);padding:0 0 0 var(--s-3)}
  .icorr{grid-template-columns:1fr}
}

/* Nothing on this page animates. The declaration is here so that a future
   addition inherits the rule rather than having to remember it. */
@media (prefers-reduced-motion:reduce){
  .irail__svg *{animation:none!important;transition:none!important}
}`;
}
