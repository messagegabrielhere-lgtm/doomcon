// /bliss.html — BLISS, the upside index.
//
// docs/SUB-INDICES.md §5. This is the single biggest differentiator the site has:
// every competitor in the category (DoomBench, the IMD AI Safety Clock,
// skynetcountdown, takeofftracker, pdoom.ai) measures how bad. Nobody measures the
// other direction. "AI is scary" is a crowded take; "here are both numbers,
// computed identically, and today they disagree" is an instrument rather than a
// take — and it is what makes the calm days interesting, which is the one thing
// that keeps an index account credible over time (docs/TEARDOWN.md §2.4).
//
// THE PAGE IS THE COMPARISON. Not a second dashboard that happens to sit at
// another URL. Every layout decision below follows from that:
//
//   * The two indices are drawn on ONE shared 0-100 axis, stacked, at the same
//     scale, so the divergence is the literal horizontal gap between two carets.
//     Two separate dials side by side would have been prettier and would have
//     made the only fact that matters — the distance — something the reader has
//     to compute. On a 375px phone stacked tracks also just work, where two dials
//     are 160px of cramped nothing.
//   * The arithmetic is PRINTED, not asserted: "62.4 − 40.7 = +21.7" appears as
//     text, from the collector's own `comparison.working` field, computed in
//     collector/bliss.mjs where the inputs are. A template that did its own
//     subtraction would be a second implementation of the claim.
//   * When the two cannot be compared, the page says which one is missing and
//     why. It never prints a divergence against an absent number.
//
// THE THREE STATES, which this page exists to keep separate:
//
//   live               scored against a frozen reference
//   dark               the fetch failed. Excluded, never imputed, never zeroed.
//   awaiting baseline  the source answered fine; there is no frozen history to
//                      score it against yet
//
// On day one BLISS is entirely in the third state and this page is MOSTLY ABOUT
// SAYING SO. That is not a degraded page — the source table underneath carries
// ten real measured numbers, which is more than any competitor publishes at all.
// Rendering that as "DARK", or worse as a zero, would be the exact category error
// this project was built in reaction to: pizzint printing a confident DOUGHCON 5
// over a scraper managing two successful runs a day, pointed the other way.
//
// MOTION. docs/MOTION.md §4 gives the test: "can I name the real event this
// motion represents?" On a page whose subject is the standing relationship
// between two slow indices, the answer is no — there is no arriving item, no
// count-up that carries a delta a reader cannot already see. So this page ships
// no JavaScript at all, which also means its numbers survive a pre-hydration
// screenshot and a crawler (docs/TEARDOWN.md §3.3). The only transition is the
// hover affordance on a source row, and it is disabled under prefers-reduced-motion.

import { esc, num, signed, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import { sparkline } from './_charts.mjs';
import * as brand from '../brand.mjs';

const PATH = '/bliss.html';

// Shapes, not colours. Every pillar carries a glyph so the five are
// distinguishable in greyscale and to a reader who cannot separate hues.
// Deliberately not imported from _charts.PILLAR_GLYPH: that map is keyed by
// DOOMCON's five pillar ids and has no entry for any of these.
const PILLAR_GLYPH = {
  science: '◈',
  medicine: '✚',
  access: '⇄',
  adoption: '▮',
  openness: '◉',
};

/** build.mjs guard: is there anything to build this page from? */
export function hasBliss(ctx) {
  return Boolean(ctx && ctx.bliss && Array.isArray(ctx.bliss.sources) && ctx.bliss.sources.length > 0);
}

// ---------------------------------------------------------------------------
// Formatting. Every one is pure, and every one has an explicit branch for
// "we do not have this number" rather than a fallback that invents one.
// ---------------------------------------------------------------------------

/** A score, or an em dash. Never 0, never "N/A", never an empty cell. */
function score1(v) {
  return Number.isFinite(v) ? num(v, 1) : '—';
}

/**
 * A source's raw measured value, at a sensible precision for its magnitude.
 * Large counts get thousands separators because 278916768 is unreadable and
 * "278,916,768" is the number a reader can check against the API themselves.
 */
function measured(v) {
  if (!Number.isFinite(v)) return '—';
  if (Number.isInteger(v)) return v.toLocaleString('en-US');
  if (Math.abs(v) < 1) return v.toFixed(4);
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The three states as one word each. These words are load-bearing; do not shorten. */
const STATE_WORD = { live: 'live', dark: 'dark', uncal: 'awaiting baseline' };
const STATE_GLYPH = { live: '●', dark: '○', uncal: '◇' };

function sourceState(s) {
  if (s.uncalibrated) return 'uncal';
  return s.ok ? 'live' : 'dark';
}

function pillarState(p) {
  if (p.dark) return 'dark';
  if (p.uncalibrated) return 'uncal';
  return 'live';
}

// ---------------------------------------------------------------------------
// The pairing — the centrepiece
// ---------------------------------------------------------------------------

/**
 * One index on the shared 0-100 axis.
 *
 * The track is linear in score and the boundary ticks sit at the real band
 * floors (0, 35, 55, 70, 85, 100), which is the only way a caret at 62.4 lands
 * where a reader expects it. The band cells are sized by the DISTANCE BETWEEN
 * floors rather than by band index — sizing them equally would put a 70 mark a
 * fifth of the way along and quietly misplace every caret on the page.
 *
 * A null score renders the track with no caret and a stated reason. It does not
 * render a caret at 0: zero is a score somebody could have earned, and "no
 * reading" is not that.
 */
function axisRow({ label, sub, score, levelName, levelNumber, reason, accent }) {
  const edges = [0, 35, 55, 70, 85, 100];
  const cells = edges.slice(0, -1).map((lo, i) => {
    const width = edges[i + 1] - lo;
    return `<i style="width:${width}%"></i>`;
  }).join('');

  const has = Number.isFinite(score);
  const at = has ? Math.max(0, Math.min(100, score)) : null;

  // The value label is centred on the caret, EXCEPT near the ends of the track
  // where centring would hang it off the edge. 0 and 100 are both scores a source
  // could genuinely earn, so this is a real case and not a theoretical one; the
  // alignment is resolved here, server-side, rather than left to a clamp that CSS
  // cannot express. `edge` also flips the label's text-anchor in CSS.
  const edge = !has ? null : at < 9 ? 'start' : at > 91 ? 'end' : null;
  const caret = has
    ? `<span class="bax__caret" style="left:${at.toFixed(2)}%">
         <span class="bax__val num"${edge ? ` data-edge="${edge}"` : ''}>${esc(num(score, 1))}</span>
       </span>`
    : '';

  const aria = has
    ? `${label}: ${num(score, 1)} of 100, level ${levelNumber}, ${levelName}.`
    : `${label}: no score. ${reason}`;

  return `<div class="bax" data-has="${has ? 1 : 0}" data-accent="${esc(accent)}">
    <div class="bax__head">
      <span class="bax__label">${esc(label)}</span>
      <span class="bax__sub">${esc(sub)}</span>
    </div>
    <div class="bax__track" role="img" aria-label="${esc(aria)}">
      ${cells}
      ${has ? `<span class="bax__fill" style="width:${at.toFixed(2)}%"></span>` : ''}
      ${caret}
    </div>
    <div class="bax__foot">
      ${has
        ? `<span class="bax__level">${esc(label)} ${esc(String(levelNumber))} · ${esc(levelName)}</span>`
        : `<span class="bax__none">NO SCORE · ${esc(reason)}</span>`}
    </div>
  </div>`;
}

/**
 * The divergence statement.
 *
 * Three distinct outcomes, and the third is the one that matters most on day one:
 *
 *   computable + apart    print the subtraction and name which side is ahead
 *   computable + aligned  say they agree, and say what the band is
 *   not computable        name the index that has no score and why. NEVER a zero,
 *                         never "0.0 apart", never a hedge that reads like a
 *                         result. An index with no score has not said "nothing is
 *                         happening"; it has said nothing at all.
 */
function divergence(bliss, doomState) {
  const c = bliss.comparison;

  if (!c || !c.computable) {
    const missing = [];
    if (!Number.isFinite(c?.bliss?.score)) {
      missing.push(bliss.posture === 'awaiting-baseline'
        ? 'BLISS has no frozen reference distribution yet, so its sources are collected and published but not scored'
        : 'BLISS has no score this run');
    }
    if (!Number.isFinite(c?.doomcon?.score)) missing.push('DOOMCON published no score in this build');

    return `<div class="bdiv" data-state="none">
      <p class="bdiv__h">The two indices cannot be compared in this build.</p>
      <p class="bdiv__p">${esc(missing.join('. '))}. Both scores are percentile positions
        against each index's own frozen reference, so the subtraction is only meaningful when
        both exist. There is no number here rather than a zero, because a zero is a reading
        somebody could have earned and this is the absence of one.</p>
    </div>`;
  }

  const aligned = c.reading === 'aligned';
  const ahead = c.reading === 'bliss-ahead' ? 'BLISS' : 'DOOMCON';
  const headline = aligned
    ? `The two indices agree today.`
    : `${ahead} is ahead by ${num(Math.abs(c.divergence), 1)} points.`;

  const body = aligned
    ? `Both sit inside the ${esc(String(c.divergence_band))}-point band that the level machine treats as
       the same reading, so the gap between them is not a signal. Upside tempo and takeover-adjacent
       tempo are running at the same position in their own records.`
    : c.reading === 'bliss-ahead'
      ? `Measured upside activity is further above its own historical norm than takeover-adjacent
         activity is above its. That is a statement about two reference distributions, not a prediction
         and not a verdict about which one matters.`
      : `Takeover-adjacent activity is further above its own historical norm than measured upside
         activity is above its. The same caveat applies in reverse: this compares each index to its
         own record, and nothing here ranks the importance of the two.`;

  return `<div class="bdiv" data-state="${esc(c.reading)}">
    <p class="bdiv__h">${esc(headline)}</p>
    <p class="bdiv__sum num" aria-label="BLISS ${esc(score1(c.bliss.score))} minus DOOMCON ${esc(score1(c.doomcon.score))} equals ${esc(signed(c.divergence, 1))}">
      ${esc(c.working)}</p>
    <p class="bdiv__p">${body}</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Pillars
// ---------------------------------------------------------------------------

function pillarCard(p, series) {
  const state = pillarState(p);
  const glyph = PILLAR_GLYPH[p.id] || '▪';

  const body = state === 'live'
    ? `${sparkline(series, { id: `bliss-${p.id}`, label: `${p.name} score history` })}
       <p class="bp__foot">${esc(footLine(p))}</p>`
    : state === 'uncal'
      ? `<p class="bp__none">AWAITING BASELINE · ${esc(String(p.sources_total))} source${p.sources_total === 1 ? '' : 's'} collecting, not yet scored</p>`
      : `<p class="bp__none">DARK · 0 of ${esc(String(p.sources_total))} sources answered</p>`;

  return `<article class="bp" data-state="${state}">
    <div class="bp__top">
      <h3 class="bp__name"><span aria-hidden="true">${glyph}</span> ${esc(p.name)}</h3>
      <span class="bp__score num">${esc(score1(p.score))}</span>
    </div>
    <p class="bp__blurb">${esc(p.blurb || '')}</p>
    ${body}
  </article>`;
}

function footLine(p) {
  const bits = [`${p.sources_ok}/${p.sources_total} SCORED`];
  if (Number.isFinite(p.percentile)) bits.push(`${(p.percentile * 100).toFixed(0)}TH PCTL`);
  return bits.join(' · ');
}

// ---------------------------------------------------------------------------
// The source table — where a cold-start page earns its keep
// ---------------------------------------------------------------------------

/**
 * Every source, its measured value, its unit and its state.
 *
 * This table is the reason the page is worth publishing before a single score
 * exists. Ten live measurements with their units and their sources named is more
 * than any competitor in the category publishes at all, and it is the thing a
 * sceptical reader checks first. A dark row keeps its error text: naming the
 * failure is the difference between an instrument and a claim.
 */
function sourceTable(bliss) {
  const rows = bliss.sources.map((s) => {
    const state = sourceState(s);
    const detail = state === 'dark'
      ? `<span class="bsrc__err">${esc(shorten(s.error, 150))}</span>`
      : state === 'uncal'
        ? `<span class="bsrc__note">collected, published, not yet scored</span>`
        : `<span class="bsrc__note">scored ${esc(score1(s.score))} of 100</span>`;

    return `<tr data-state="${state}">
      <th scope="row" class="bsrc__id">
        <span class="bsrc__dot" aria-hidden="true">${STATE_GLYPH[state]}</span>
        <b>${esc(s.id)}</b>
        <span class="bsrc__label">${esc(s.label || '')}</span>
      </th>
      <td class="bsrc__pillar">${esc(s.pillar)}</td>
      <td class="bsrc__val num">${esc(measured(s.value))}</td>
      <td class="bsrc__unit">${esc(s.unit || '—')}</td>
      <td class="bsrc__state">
        ${esc(STATE_WORD[state])}
        ${detail}
      </td>
    </tr>`;
  }).join('\n');

  return `<table class="bsrc">
    <caption class="vh">Every BLISS source, its measured value and its state</caption>
    <thead><tr>
      <th scope="col">Source</th><th scope="col">Pillar</th>
      <th scope="col">Value</th><th scope="col">Unit</th><th scope="col">State</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function shorten(text, n) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasBliss(ctx)) return emptyPage(ctx);

  const bliss = ctx.bliss;
  const doom = ctx.state || null;
  const c = bliss.comparison || {};

  const reporting = bliss.sources_reporting ?? bliss.sources.filter((s) => s.ok || s.uncalibrated).length;
  const total = bliss.sources_total ?? bliss.sources.length;
  const scored = bliss.sources.filter((s) => s.ok).length;
  const awaiting = bliss.sources.filter((s) => s.uncalibrated).length;
  const dark = bliss.sources.filter((s) => !s.ok && !s.uncalibrated).length;

  const hasScore = Number.isFinite(bliss.score);

  // The reason a missing score is missing, in the reader's words rather than the
  // engine's. `posture` is computed in collector/bliss.mjs precisely so this
  // template cannot get the distinction wrong.
  const noScoreReason = bliss.posture === 'awaiting-baseline'
    ? 'awaiting a frozen baseline'
    : 'every pillar is dark';

  // Per-pillar history, when the builder supplies it. Absent -> sparklines render
  // their own "no history yet" state, which is the honest reading on a cold start
  // and is NOT the same as a flat line at zero.
  const seriesFor = typeof ctx.blissSeriesFor === 'function'
    ? ctx.blissSeriesFor
    : () => [];

  const title = hasScore
    ? `BLISS ${bliss.level} ${bliss.level_name} — the upside index · ${brand.NAME}`
    : `BLISS — the upside index, awaiting baseline · ${brand.NAME}`;

  const description = hasScore
    ? `BLISS ${bliss.level}, ${bliss.level_name}. Upside tempo at ${num(bliss.score, 1)} of 100 ` +
      `against DOOMCON's ${score1(doom?.score)}, computed from the same five-pillar percentile ` +
      `machinery over ${total} sources in science, medicine, access, adoption and openness. ` +
      `Compiled ${utc(bliss.generated_at)}.`
    : `The upside index: ${reporting} of ${total} sources reporting across science, medicine, ` +
      `access, adoption and openness, ${awaiting} of them awaiting a frozen baseline before they ` +
      `can be scored. Every measured value is published. Compiled ${utc(bliss.generated_at)}.`;

  const main = `<style>${blissCss()}</style>
<section class="bintro">
  <h1 class="bintro__h1">BLISS</h1>
  <p class="bintro__tag">The other ending.</p>
  <p class="lede">Every AI index measures how bad. This one measures the other direction, with the
     same machinery: five pillars, the same percentile normalisation against a frozen reference,
     the same smoothing, the same anti-flap rules. ${esc(brand.NAME)} counts takeover-adjacent
     tempo. BLISS counts science, medicine, access, adoption and openness. Neither is a prediction.</p>
  <p class="bclaim"><b>The pairing is the instrument.</b> Two numbers computed by identical code
     over different inputs can be subtracted. Two numbers produced by human or model judgement
     cannot. That is the whole argument for publishing both.</p>
</section>

<section class="bpair" aria-labelledby="pair-h">
  <h2 id="pair-h" class="bh2">Both numbers, one axis</h2>
  <div class="bpair__axes">
    ${axisRow({
      label: 'BLISS',
      sub: 'upside tempo',
      score: bliss.score,
      levelName: bliss.level_name,
      levelNumber: bliss.level,
      reason: noScoreReason,
      accent: 'bliss',
    })}
    ${axisRow({
      label: brand.NAME,
      sub: 'takeover-adjacent tempo',
      score: Number.isFinite(doom?.score) ? doom.score : null,
      levelName: doom?.level_name,
      levelNumber: doom?.level,
      reason: 'no score published in this build',
      accent: 'doom',
    })}
  </div>
  ${divergence(bliss, doom)}
  <p class="bnote">Both axes are the same 0&ndash;100 scale with the same band floors at 35, 55, 70
     and 85. A score is a percentile position against that index's own frozen reference
     distribution &mdash; never a probability, and never a comparison between the two fields.</p>
</section>

${hasScore ? '' : awaitingPanel(bliss, reporting, total, awaiting, dark)}

<section class="bpillars" aria-labelledby="pillars-h">
  <h2 id="pillars-h" class="bh2">The five pillars</h2>
  <div class="bp__grid">
    ${bliss.pillars.map((p) => pillarCard(p, seriesFor(p.id))).join('\n')}
  </div>
</section>

<section class="bsources" aria-labelledby="sources-h">
  <h2 id="sources-h" class="bh2">Every source, and what it read</h2>
  <p class="bnote">${esc(reporting)} of ${esc(total)} sources answered this run &mdash;
     ${esc(scored)} scored, ${esc(awaiting)} awaiting a baseline, ${esc(dark)} dark.
     Dark sources are excluded from every number on this page, never imputed and never counted
     as zero. Sources awaiting a baseline are collected and published in full; they simply have
     no frozen history to be scored against yet.</p>
  ${sourceTable(bliss)}
</section>

${howComputed(ctx, bliss)}
`;

  return page({
    ctx,
    path: PATH,
    title,
    ogTitle: hasScore
      ? `BLISS ${bliss.level} ${bliss.level_name} · ${brand.NAME}`
      : `BLISS — the upside index · ${brand.NAME}`,
    description,
    ogImage: ctx.cardFor ? ctx.cardFor('bliss') : null,
    ogImageAlt: hasScore
      ? `BLISS ${bliss.level} ${bliss.level_name}, ${num(bliss.score, 1)} of 100`
      : `BLISS, the upside index, awaiting baseline`,
    jsonld: [dataset(ctx, bliss)],
    main,
  });
}

/**
 * The cold-start panel. Shown only while BLISS has no score.
 *
 * This is the most important block on the page in v1, and its job is to make a
 * reader believe an absence rather than suspect a failure. It states the reason,
 * the count of sources that ARE reporting, and what has to happen next — and it
 * never uses the word dark about a source that answered.
 */
function awaitingPanel(bliss, reporting, total, awaiting, dark) {
  if (bliss.posture !== 'awaiting-baseline') {
    return `<section class="bwait" data-kind="dark">
      <h2 class="bh2">BLISS has no score in this build</h2>
      <p class="bnote">Every pillar is dark: ${esc(String(dark))} of ${esc(String(total))} sources
         failed to answer. The index is not reporting a low number &mdash; it is reporting no number.
         Per-source errors are in the table below.</p>
    </section>`;
  }

  return `<section class="bwait" data-kind="baseline">
    <h2 class="bh2">BLISS is awaiting its baseline</h2>
    <p class="bnote"><b>${esc(String(reporting))} of ${esc(String(total))} sources are reporting</b>
       and ${esc(String(awaiting))} of them have no frozen reference distribution to be scored
       against yet${dark ? `, while ${esc(String(dark))} did not answer this run` : ''}.
       A score is a percentile against a frozen record of how this source normally behaves; until
       that record exists there is no percentile to compute, so there is no number here.</p>
    <p class="bnote">This is the same state DOOMCON's markets pillar sits in, and it is deliberately
       <b>not</b> the same thing as dark. Dark means a pipe is dead. Awaiting baseline means the
       measurement is arriving and the ruler has not been built yet. Every value the sources
       returned is published below, unrounded and with its unit, so the record being accumulated
       is visible while it accumulates.</p>
    <p class="bnote">Nothing on this page is imputed, back-filled or estimated in the meantime.
       The alternative &mdash; printing a plausible number over an empty reference &mdash; is the
       failure this project was built in reaction to.</p>
  </section>`;
}

/**
 * ctx.bliss absent. The page still builds, says plainly that this is the absence
 * of a result rather than an empty result, and carries noindex — an empty index
 * page that Google has cached is worse than no page.
 */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `BLISS — the upside index · ${brand.NAME}`,
    description: `${brand.NAME}'s upside index has not published a run yet.`,
    main: `<style>${blissCss()}</style>
<section class="bintro">
  <h1 class="bintro__h1">BLISS</h1>
  <p class="bintro__tag">The other ending.</p>
  <p class="lede">No BLISS run has been published in this build. This is not an empty result
     &mdash; it is the absence of a result, and the two are different states. When
     <code>data/bliss.json</code> is present it is rendered here in full.</p>
  <p class="bnote">Run <code>collector/bliss.mjs</code> and rebuild.</p>
</section>`,
  });
}

/**
 * The formula, in the open. Same standard docs/SUB-INDICES.md sets for every
 * sub-index: publish the arithmetic or do not publish the number.
 */
function howComputed(ctx, bliss) {
  const k = bliss.constants || {};
  const w = k.composite_weights || { mean: 0.7, max: 0.3 };

  return `<section class="bhow" aria-labelledby="how-h">
  <h2 id="how-h" class="bh2">How this is computed</h2>
  <ol class="bhow__list">
    <li><b>Normalise.</b> Each source value becomes an empirical percentile against a
        <b>frozen</b> reference distribution, then a pseudo-z through the inverse normal CDF,
        then <code>S = ${esc(String(k.score_centre ?? 50))} + ${esc(String(k.score_z_scale ?? 12.5))}·z</code>,
        clamped to 0&ndash;100.</li>
    <li><b>Smooth.</b> EPA NowCast over the trailing ${esc(String(k.nowcast_window ?? 12))} observations,
        weight floor ${esc(String(k.nowcast_min_weight ?? 0.5))}.</li>
    <li><b>Pillar.</b> The mean of its live sources' smoothed scores. A pillar with no live
        source is dark; a pillar whose sources have no baseline yet is awaiting one. These are
        different states and are never merged.</li>
    <li><b>Composite.</b> <code>${esc(String(w.mean))}·mean(pillars) + ${esc(String(w.max))}·max(pillars)</code>,
        over live pillars only.</li>
    <li><b>Level.</b> BLISS ${esc(String(5))}&ndash;${esc(String(1))} from the composite, through the
        six-layer anti-flap state machine: Schmitt deadband of ${esc(String(k.deadband ?? 3))} points,
        dual-window dwell, a minimum interval between changes, a post-change lock, one step per
        change, and a ${esc(String(k.quorum ?? 2))}-of-5 pillar quorum. A level change is frozen
        while any pillar is dark.</li>
  </ol>
  <p class="bnote">Every function in that list is imported from <code>collector/engine.mjs</code>
     &mdash; the same code that computes ${esc(brand.NAME)}, not a second implementation of it.
     Two implementations that could disagree would destroy the only claim that makes the pairing
     worth anything, which is that the two numbers are commensurable.</p>
  <p class="bnote">Engine ${esc(String(bliss.engine_version || '—'))} ·
     BLISS ${esc(String(bliss.bliss_version || '—'))} ·
     reference ${bliss.reference && bliss.reference.present
       ? `frozen ${esc(utcDay(bliss.reference.built_at))}`
       : 'not yet built'} ·
     compiled <time datetime="${esc(bliss.generated_at)}">${esc(utc(bliss.generated_at))}</time>.</p>
  <p class="bhow__links">
    <a href="${esc(ctx.href('/methodology.html'))}">Full methodology</a>
    <a href="${esc(ctx.href('/'))}">${esc(brand.NAME)} index</a>
  </p>
</section>`;
}

/** Schema.org Dataset. Modest and accurate: it describes what is actually here. */
function dataset(ctx, bliss) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `BLISS — ${brand.NAME}'s upside index`,
    description:
      'Five-pillar upside index for AI: science, medicine, access, adoption and openness, ' +
      'normalised as percentiles against a frozen reference distribution and published beside ' +
      'the DOOMCON activity index on the same 0-100 scale.',
    url: ctx.url(PATH),
    license: brand.LICENSE,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: brand.NAME },
    dateModified: bliss.generated_at,
    variableMeasured: (bliss.pillars || []).map((p) => ({
      '@type': 'PropertyValue',
      name: `BLISS ${p.name}`,
      value: Number.isFinite(p.score) ? p.score : undefined,
      description: p.blurb || undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// CSS
//
// Mobile-first: the default rules ARE the 375px layout and the wider forms are
// restored at 720px, rather than the other way round. Every colour is a token
// from site/styles.mjs, so the page inverts correctly in light mode without a
// second palette, and nothing here carries meaning by colour alone — every state
// is also a glyph, a word and a border treatment.
// ---------------------------------------------------------------------------

function blissCss() {
  return `
.bintro { padding: 26px 0 0; }
.bintro__h1 { font-size: clamp(1.8rem, 8vw, 2.6rem); letter-spacing: -0.03em; margin: 0 0 2px; }
.bintro__tag { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-faint); margin: 0 0 14px; }
.bclaim { border-left: 3px solid var(--accent); background: var(--bg-raised);
  padding: 12px 14px; margin: 0 0 var(--s-5); font-size: var(--t-sm);
  color: var(--ink-dim); border-radius: 0 var(--radius) var(--radius) 0; }
.bclaim b { color: var(--ink); display: block; margin-bottom: 4px; }

.bh2 { font-size: var(--t-xl); letter-spacing: -0.02em; margin: var(--sec) 0 12px; }
.bnote { font-size: var(--t-sm); color: var(--ink-dim); margin: 0 0 10px; max-width: var(--measure); }
.bnote b { color: var(--ink); }

/* ---- the shared axis ---- */
.bpair__axes { display: grid; gap: 18px; margin: 0 0 18px; }
/* 22px of clearance under the head row, because the caret's value label is
   absolutely positioned above the track and would otherwise sit on top of the
   "UPSIDE TEMPO" eyebrow at any score past about 55. */
.bax__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  margin-bottom: 22px; }
.bax__label { font-family: var(--mono); font-size: var(--t-sm); font-weight: 700;
  letter-spacing: 0.06em; }
.bax__sub { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint);
  letter-spacing: 0.06em; text-transform: uppercase; }

.bax__track { position: relative; display: flex; height: 16px; border: 1px solid var(--rule);
  border-radius: var(--radius); overflow: visible; background: var(--bg-sunken); }
.bax__track i { display: block; height: 100%; border-right: 1px solid var(--rule); }
.bax__track i:last-child { border-right: 0; }
.bax__fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--fill);
  pointer-events: none; }
/* The caret is a SHAPE at a position. Colour only confirms it. */
.bax__caret { position: absolute; top: -3px; bottom: -3px; width: 3px; background: var(--accent);
  transform: translateX(-1.5px); }
.bax[data-accent="doom"] .bax__caret { background: var(--ink); }
.bax[data-accent="doom"] .bax__fill { background: var(--wash); }
.bax__val { position: absolute; left: 50%; top: -19px; transform: translateX(-50%);
  font-size: var(--t-xs); font-weight: 700; white-space: nowrap; }
/* Near the ends of the track, anchor the label inside the edge instead of
   centring it off the page. See the edge computation in axisRow(). */
.bax__val[data-edge="start"] { left: 0; transform: none; }
.bax__val[data-edge="end"] { left: auto; right: 0; transform: none; }
.bax__foot { margin-top: 9px; font-family: var(--mono); font-size: var(--t-xs);
  letter-spacing: 0.06em; }
.bax__level { color: var(--ink); }
/* No score: the track is dashed and the words say why. Never an empty bar that
   reads as a zero. */
.bax[data-has="0"] .bax__track { border-style: dashed; }
.bax__none { color: var(--ink-faint); text-transform: uppercase; }

/* ---- divergence ---- */
.bdiv { border: 1px solid var(--rule); border-radius: var(--radius); background: var(--bg-raised);
  padding: 14px; margin: 0 0 14px; }
.bdiv[data-state="none"] { border-style: dashed; }
.bdiv__h { margin: 0 0 8px; font-size: var(--t-md); font-weight: 600; }
.bdiv__sum { margin: 0 0 10px; font-size: var(--t-lg); font-weight: 700; letter-spacing: 0.02em; }
.bdiv__p { margin: 0; font-size: var(--t-sm); color: var(--ink-dim); max-width: var(--measure); }

/* ---- awaiting-baseline panel ---- */
.bwait { border: 1px dashed var(--rule); border-left: 3px solid var(--ink-faint);
  border-radius: 0 var(--radius) var(--radius) 0; background: var(--bg-raised);
  padding: 14px; margin: var(--sec) 0 0; }
.bwait .bh2 { margin-top: 0; font-size: var(--t-md); }
.bwait[data-kind="dark"] { border-left-color: var(--dark-src); }

/* ---- pillars ---- */
.bp__grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.bp { border: 1px solid var(--rule); border-radius: var(--radius); padding: 12px;
  background: var(--bg-raised); }
.bp[data-state="uncal"] { border-style: dashed; }
.bp[data-state="dark"] { border-style: dashed; border-color: var(--dark-src); }
.bp__top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.bp__name { font-size: var(--t-md); margin: 0; font-weight: 600; }
.bp__score { font-size: var(--t-lg); font-weight: 700; }
.bp__blurb { font-size: var(--t-xs); color: var(--ink-dim); margin: 4px 0 8px; }
.bp__foot, .bp__none { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.06em;
  color: var(--ink-faint); margin: 6px 0 0; }

/* ---- source table ---- */
.bsrc { width: 100%; border-collapse: collapse; font-size: var(--t-sm); }
.bsrc thead { display: none; }
.bsrc tr { display: block; border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 10px; margin-bottom: 8px; background: var(--bg-raised); }
.bsrc tr[data-state="uncal"] { border-style: dashed; }
.bsrc tr[data-state="dark"] { border-style: dashed; border-color: var(--dark-src); }
.bsrc td, .bsrc th { display: block; text-align: left; padding: 0; font-weight: 400; }
.bsrc__id b { font-family: var(--mono); font-size: var(--t-sm); font-weight: 700; }
.bsrc__label { display: block; color: var(--ink-dim); font-size: var(--t-xs); margin: 2px 0 6px 0; }
.bsrc__dot { margin-right: 6px; }
.bsrc__pillar { font-family: var(--mono); font-size: var(--t-xs); text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--ink-faint); }
.bsrc__val { font-size: var(--t-md); font-weight: 700; margin-top: 4px; }
.bsrc__unit { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); }
.bsrc__state { font-family: var(--mono); font-size: var(--t-xs); text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--ink-faint); margin-top: 6px; }
.bsrc__note, .bsrc__err { display: block; text-transform: none; letter-spacing: 0;
  font-family: var(--sans); font-size: var(--t-xs); color: var(--ink-dim); margin-top: 3px; }
.bsrc__err { color: var(--dark-src); }

/* ---- how ---- */
.bhow__list { margin: 0 0 12px; padding-left: 20px; font-size: var(--t-sm); color: var(--ink-dim);
  max-width: var(--measure); }
.bhow__list li { margin-bottom: 7px; }
.bhow__list b { color: var(--ink); }
.bhow__links { display: flex; flex-wrap: wrap; gap: 14px; font-size: var(--t-sm); margin: 12px 0 0; }

@media (min-width: 720px) {
  .bp__grid { grid-template-columns: repeat(2, 1fr); }
  .bsrc thead { display: table-header-group; }
  .bsrc thead th { font-family: var(--mono); font-size: var(--t-xs); text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--ink-faint); padding: 0 10px 6px 0; font-weight: 400; }
  .bsrc tr { display: table-row; border: 0; border-bottom: 1px solid var(--rule-soft);
    border-radius: 0; padding: 0; margin: 0; background: none; }
  .bsrc tr[data-state="uncal"], .bsrc tr[data-state="dark"] { border-style: solid; }
  .bsrc td, .bsrc th { display: table-cell; padding: 9px 10px 9px 0; vertical-align: top; }
  .bsrc__val { font-size: var(--t-sm); text-align: right; }
  .bsrc__label { margin-bottom: 0; }
  .bsrc tbody tr { transition: background 120ms ease; }
  .bsrc tbody tr:hover { background: var(--wash-alt); }
}
@media (min-width: 900px) {
  .bp__grid { grid-template-columns: repeat(3, 1fr); }
}
/* docs/MOTION.md §3: reduced motion disables every transition on the page. The
   only one here is the row hover affordance, and losing it costs nothing. */
@media (prefers-reduced-motion: reduce) {
  .bsrc tbody tr { transition: none; }
}
`;
}
