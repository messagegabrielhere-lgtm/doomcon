// The dashboard.
//
// Everything above the fold on a 375px phone is server-rendered: the level
// digit, the score, its direction, the plain-language read, the oven rail and
// the first panel of the switcher. All of it is text or inline SVG in the first
// byte of the response. pizzint client-renders, so its prerendered HTML says
// "LOADING TACTICAL DATA..." - a crawler sees nothing and a screenshot taken
// before hydration is blank (TEARDOWN 3.3). Screenshots are the growth loop,
// so nothing on this page waits for JavaScript. There is no JavaScript.
//
// -------------------------------------------------------------------------
// THIS ROUND: the page was 235KB and ~8,700px tall on a phone, because it had
// grown a section per release and nothing had ever been removed. docs/VISITORS
// .md §5 measured the damage and its cut list is executed here, item by item.
//
//   §5.1  The reel and the feed's top eight were the SAME EIGHT STORIES, in
//         the same order, with the same scores - about two mobile screens of
//         verbatim duplication. The rail now carries the eight NEWEST items;
//         the feed carries the highest-scoring fourteen. Two orderings that
//         genuinely disagree, which is a second fact rather than a second coat
//         of paint. Both live in _switcher.mjs's SIGNAL panel.
//   §5.2  The frozen-reference distribution curve explained NORMALISATION to
//         the reader least equipped to read it, in the hero, above 6,000px of
//         one scalar drawn three ways. Gone from here; one line links the
//         readers who want it to where they already are.
//   §5.3  The fourteen-row source-freshness table collapses to the sentence we
//         already compute, with the rows one press away behind <details>.
//   §5.4  The X wire stops outranking our own scored corpus and becomes a
//         switcher panel.
//   §5.5  "Elsewhere on the desk" - three link cards at the very bottom of an
//         8,742px page - is deleted. The switcher reaches those destinations
//         from the fold, and the footer is already a full site index.
//   §5.6  THE LEVEL WAS STATED SEVEN TIMES above 6,000px: the digit, the name,
//         the epithet, the pips, the gauge arc, the band caption and the oven
//         rail. The gauge, the pips, the epithet and the band caption are gone.
//         Three statements remain and one of them is a five-stop scale that
//         shows the other four levels too.
//
// Density is facts per pixel, not ink per pixel. Roughly twenty of our
// fifty-seven desktop text atoms were the composite score wearing different
// hats; of pizzint's eighty-six, almost none repeat. The way to raise density
// of KINDS is to delete, which is what most of this diff is.
//
// -------------------------------------------------------------------------
// Visual hierarchy, top to bottom, and why:
//
//   1. THE FOLD   the level, the score, the direction since the last
//                 observation, and one plain sentence. A first-time visitor
//                 decides in about four seconds on a phone; sixteen of a
//                 hundred arrive from a screenshot with a budget under eight.
//                 Nothing above the numeral but its own timestamp.
//   2. THE OVEN   five named stages, the live one lit, the previous position
//                 marked so the rail reads as a needle that moves both ways
//                 rather than as a countdown.
//   3. THE DESK   the in-place switcher. One slot, five datasets, no page
//                 load, every panel already in this HTML.
//   4. THE RECORD then source health, the pillars, the archive, the machine
//                 surfaces.

import { esc, num, signed, utc } from './_html.mjs';
import { freshnessStrip, pillarCard, moveRow, sourceStatus } from './_parts.mjs';
import { indexHistoryChart, pillarRanked } from './_charts.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import * as news from './news.mjs';
import * as oven from './_oven.mjs';
import * as switcher from './_switcher.mjs';
import * as developing from './_developing.mjs';
import * as leaderwire from './_leaderwire.mjs';

// Matches build.mjs's own sparkline window. Only a cap: the fallback reader
// below never needs more points than a 300-unit sparkline can resolve.
const SPARK_POINTS = 48;

export function render(ctx) {
  const { state } = ctx;
  const scoreTxt = num(state.score, 1);

  const pillars = brand.PILLARS.map((p) => {
    const live = state.pillars.find((x) => x.id === p.id);
    if (!live) throw new Error(`index.mjs: state.json is missing pillar "${p.id}"`);
    return pillarCard(live, seriesFor(ctx, p.id), sourcesForPillar(state, p.id));
  }).join('');

  const moves = ctx.moves.slice(0, 12)
    .map((m) => moveRow(m, ctx.href(`/moves/${m.id}.html`)))
    .join('');

  const embedSrc = ctx.url('/embed.html');
  const snippet = `<iframe src="${embedSrc}" width="320" height="152" ` +
    `style="border:0;max-width:100%" loading="lazy" title="${brand.NAME} — AI activity tempo"></iframe>`;

  const obs = ctx.history.length;

  // -----------------------------------------------------------------------
  // THE FOLD
  //
  // Four facts and nothing else. The old fold reached the numeral after seven
  // rows of apparatus and then restated the level six more ways before the
  // first story. What is gone: the epithet, the five pips, the 0-100 gauge,
  // the frozen-reference distribution strip and its caption, the
  // "level held since / receipt" stamp - which the oven rail directly below
  // now states with the interval spelled out - and the three-line disclaimer,
  // whose content the plain sentence one column to the left already carries
  // ("it is not a claim about how it ends") and which the footer prints in
  // full on every page. Saying the same refusal twice in one screen is the
  // §5.6 problem in prose rather than in numerals.
  //
  // The market leader deliberately does NOT sit here, although we compute it
  // every build. It is one press away on THE RACE tab, and a fold that carries
  // a fifth fact is a fold that carries none.
  // -----------------------------------------------------------------------
  const main = `
${news.styleTag()}
${developing.render(ctx)}
<section class="hero">
  <p class="eyebrow">Observed <time datetime="${esc(state.generated_at)}">${esc(utc(state.generated_at))}</time></p>
  <div class="hero__grid">

    <!-- align-self overrides .hero__grid's align-items:end. With the dial and
         the distribution strip cut, the two columns are close to the same
         height and centring keeps the digit opposite the number it labels.
         An inline property rather than a new class, because site/styles.mjs
         belongs to the integrator. -->
    <div class="level" style="align-self:center">
      <!-- data-dc-* are the motion layer's hooks (site/templates/_motion.mjs
           looks for [data-dc-level] and [data-dc-score] first, falling back to
           the class names). Naming them explicitly means restyling this hero
           cannot silently break the count-up in a file owned by someone else. -->
      <div class="level__digit num" data-dc-level aria-hidden="true">${esc(state.level)}</div>
      <div class="level__meta">
        <h1 class="level__name">${esc(brand.NAME)} ${esc(state.level)} · ${esc(state.level_name)}</h1>
        <p class="level__plain">${esc(plainRead(ctx))}</p>
      </div>
    </div>

    <div class="score">
      <p class="eyebrow">Composite score</p>
      <div class="score__row">
        <span class="score__val num" data-dc-score>${esc(scoreTxt)}</span>
        <span class="score__of">/ 100</span>
        ${direction(ctx)}
      </div>
    </div>

  </div>
</section>

${oven.render(ctx)}

${switcher.render(ctx)}

<section class="sec" id="record" aria-labelledby="record-h">
  <h2 class="sec__h" id="record-h">The record</h2>
  <p class="lede">${esc(recordLede(obs))}</p>
  ${indexHistoryChart(ctx.history, { id: 'home', now: state.score })}
  <p class="fresh__key">${esc(recordKey(obs))}
     <a href="${esc(ctx.href('/history.html'))}">Full history and every observation →</a></p>
  <p class="fresh__key">Where today sits inside the frozen reference distribution, and why that curve
     is never updated live, is drawn and explained on the
     <a href="${esc(ctx.href('/methodology.html'))}">methodology page →</a></p>
</section>

<section class="fresh" aria-labelledby="fresh-h">
  <h2 class="sec__h" id="fresh-h">Source health</h2>
  <p class="lede">${esc(healthSentence(state))}</p>
  <details class="fresh__more">
    <summary>All ${esc(state.sources.length)} sources, one row each</summary>
    <div class="fresh__morein">${freshnessStrip(state.sources, state.generated_at)}</div>
  </details>
</section>

<section class="sec" aria-labelledby="pillars-h">
  <h2 class="sec__h" id="pillars-h">The five pillars</h2>
  <p class="lede">Which part of the field is loudest today. Each bar is linear in score from 0 to 100,
     so the ordering is the comparison; the cards underneath carry each pillar's own history.</p>
  ${pillarRanked(state.pillars, { id: 'home' })}
  <hr class="rule">
  <div class="pillars">${pillars}</div>
</section>

<section class="sec" aria-labelledby="moves-h">
  <h2 class="sec__h" id="moves-h">Recent moves</h2>
  ${moves
    ? `<ul class="moves">${moves}</ul>
       <p class="fresh__key"><a href="${esc(ctx.href('/moves/'))}">Full archive →</a></p>`
    : `<p class="fresh__key">No scored observations recorded yet. Moves appear here the first time the index is computed twice.</p>`}
</section>

<section class="sec" id="embed" aria-labelledby="embed-h">
  <h2 class="sec__h" id="embed-h">Put the index on your site</h2>
  <p class="lede">One iframe. No script, no tracking, no key. It renders light or dark to match
     the page it sits in, and the number inside it is server-rendered too.</p>
  <div class="snippet">${esc(snippet)}</div>
  <p class="fresh__key">Add <code>?theme=light</code>, <code>?theme=dark</code> or <code>?compact=1</code> to pin the look.
     <a href="${esc(ctx.href('/embed.html'))}">Preview the widget →</a></p>
</section>

<section class="sec" id="api" aria-labelledby="api-h">
  <h2 class="sec__h" id="api-h">Public JSON API</h2>
  <ul class="apilist">
    <li><code>${esc(ctx.url('/api/state.json'))}</code> <span>current level, score, pillars and per-source health</span></li>
    <li><code>${esc(ctx.url('/api/history.json'))}</code> <span>every scored observation</span></li>
    <li><code>${esc(ctx.url('/api/health.json'))}</code> <span>per-source success, honestly reported</span></li>
    <li><code>${esc(ctx.url('/api/receipts/'))}&lt;id&gt;.json</code> <span>the hash-chained receipt behind one observation</span></li>
  </ul>
  <p class="fresh__key">Static files. No key, no rate limit, ${esc(brand.LICENSE)}. Attribution: ${esc(brand.DOMAIN)}.</p>
</section>

<style>
/* Three rules, all of them consequences of the cuts above, all namespaced to
   elements this template owns. site/styles.mjs belongs to the integrator. */

/* The plain-language read is now the largest piece of prose in the hero, and
   it is the one sentence thirteen of a hundred visitors came for. It was set
   at caption size under five pips that no longer exist. */
.hero .level__plain { font-size: var(--t-md); line-height: 1.45; color: var(--ink); max-width: 46ch; }

/* The collapsed source table. */
.fresh__more { margin-top: var(--s-2); }
.fresh__morein { padding-top: var(--s-3); }
</style>
`;

  return page({
    ctx,
    motion: true,
    path: '/',
    title: `${brand.NAME} ${state.level} — ${state.level_name} · AI activity tempo index`,
    ogTitle: `${brand.NAME} ${state.level} · ${state.level_name} — ${scoreTxt}/100`,
    description:
      `${brand.NAME} is at level ${state.level} (${state.level_name}), score ${scoreTxt} of 100, ` +
      `as of ${utc(state.generated_at)}. A recomputable index of AI activity tempo across five pillars.`,
    ogImage: ctx.cardFor(state.receipt_id),
    ogImageAlt: `${brand.NAME} ${state.level}, ${state.level_name}, score ${scoreTxt} of 100`,
    showDegraded: true,
    jsonld: [webApplication(ctx), dataset(ctx)],
    main,
  });
}

// ---------------------------------------------------------------------------
// The record section
// ---------------------------------------------------------------------------

/**
 * Cold start told as a design decision, not apologised for.
 *
 * A three-point history is the honest state of a new index and the chart has to
 * look deliberate at three points, not broken. The thing that makes it look
 * deliberate is the fixed 0-100 domain: the line is short because the record is
 * short, not because the axis gave up. Say that in words under the heading, so
 * the sentence carries the finding even if the SVG never paints.
 */
function recordLede(n) {
  if (n === 0) {
    return 'Nothing has been scored yet. The five bands below are the full range a score is measured '
      + 'against; the line starts at the first scored run and never gets rewritten.';
  }
  if (n === 1) {
    return 'One scored observation. A single point is a reading, not a trend, so no trend is drawn — '
      + 'but the whole 0–100 range is, which is what places that one reading.';
  }
  if (n < 12) {
    return `${n} scored observations so far. The y axis is fixed at 0–100 and never auto-scaled to the `
      + 'data, so a short record reads as short and a quiet day reads as quiet — a chart that zooms to '
      + 'fit turns a 0.4-point wiggle into a crisis.';
  }
  return `${n} scored observations. The y axis is fixed at 0–100 and never auto-scaled to the data, so `
    + 'the question this chart answers stays "where in the range", not "what shape is the noise".';
}

// The caption under the chart already prints the observation count, so this
// line says the thing the caption cannot: every point on it is auditable.
function recordKey(n) {
  if (n === 0) return 'The line starts at the first scored run.';
  return 'Every point on this line is written to a hash-chained receipt carrying its full inputs.';
}

// ---------------------------------------------------------------------------
// Source health
// ---------------------------------------------------------------------------

/**
 * Fourteen rows of which nine read "no baseline · no read" is a database dump.
 * The honesty is in the counts, and we already compute them for the strip's own
 * legend - docs/VISITORS.md §5.3. So the sentence is the section and the rows
 * are one press away, which loses nothing and returns about 300px of phone.
 *
 * The three states stay distinct and are never merged. A source awaiting a
 * baseline answered its request perfectly well; calling it dark would report an
 * outage that is not happening, and that is the same category error as pizzint
 * printing a confident DOUGHCON 5 over a scraper managing two runs a day, just
 * pointed the other way.
 */
function healthSentence(state) {
  const rows = Array.isArray(state.sources) ? state.sources : [];
  if (!rows.length) return 'state.json reports no source health at all, so nothing on this page can be attributed to a named feed.';

  let live = 0; let stale = 0; let uncal = 0; let dark = 0;
  for (const s of rows) {
    const { status } = sourceStatus(s, state.generated_at);
    if (status === 'uncal') uncal += 1;
    else if (status === 'dark') dark += 1;
    else if (status === 'stale') stale += 1;
    else live += 1;
  }

  const bits = [`${live} live`];
  if (stale) bits.push(`${stale} stale`);
  if (uncal) bits.push(`${uncal} awaiting a baseline`);
  if (dark) bits.push(`${dark} dark`);

  const tail = dark
    ? 'A dark source failed to answer and is excluded from the composite, never imputed as a zero.'
    : uncal
      ? 'A source awaiting a baseline answered fine; there is simply no frozen reference to score it against yet, so it is published and not counted.'
      : 'Every source answered inside its window.';

  return `${bits.join(', ')}, of ${rows.length} sources. ${tail}`;
}

// ---------------------------------------------------------------------------
// Series plumbing
// ---------------------------------------------------------------------------

/**
 * Pillar history for one sparkline.
 *
 * ctx.seriesFor() is build.mjs's reader and it understands only a row whose
 * `pillars` is an ARRAY. collector/engine.mjs writes data/history.ndjson with
 * `pillars` as an OBJECT keyed by pillar id, so against the live log
 * ctx.seriesFor() returns [] for every pillar and every card prints "no history
 * yet" beside three scored observations we are holding in memory. A chart
 * claiming we have no data when we do is the same lie as a chart claiming we
 * have data when we do not, so the log is read here too, tolerantly, and the
 * builder's reader is still preferred whenever it produced anything.
 */
function seriesFor(ctx, id) {
  const fromCtx = typeof ctx.seriesFor === 'function' ? ctx.seriesFor(id) : null;
  if (Array.isArray(fromCtx) && fromCtx.length) return fromCtx;
  return seriesFromHistory(ctx.history, id);
}

function seriesFromHistory(history, id) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const row of history.slice(-SPARK_POINTS)) {
    const p = row && row.pillars;
    if (!p) continue;
    let v = null;
    if (Array.isArray(p)) {
      const entry = p.find((x) => x && x.id === id);
      // A dark reading is a gap, not a zero. Dropping the point leaves a line
      // that connects across the outage, which is the honest shape: we are not
      // claiming to know what happened while the source was down.
      v = entry && entry.dark !== true ? entry.score : null;
    } else {
      v = p[id];
    }
    // typeof, never Number(). Number(null) is 0, so a coercing check turns a
    // pillar that reported nothing into a pillar that measured nothing.
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

function sourcesForPillar(state, id) {
  if (!Array.isArray(state.sources)) return [];
  return state.sources.filter((s) => s && s.pillar === id);
}

/**
 * The plain-language read, for the largest group of people who arrive here.
 *
 * Pew (June 2025): 50% of US adults are more concerned than excited about AI,
 * against 10% more excited. YouGov (2026, n=18,238): 50% very or somewhat
 * concerned about AI ending humanity, up from 43% in June 2025. The modal
 * visitor is not an ML engineer — it is an ordinary anxious person who clicked
 * a frightening headline, and the 100-visitor study found that neither this
 * site nor pizzint says anything to them at all.
 *
 * This is the sentence that does. It states where today sits in our own record
 * and what the number is NOT, in words that need no key. It makes no
 * prediction, offers no reassurance we cannot support, and uses no future
 * tense.
 */
function plainRead(ctx) {
  const st = ctx.state;
  const s = Number.isFinite(st.score) ? st.score : null;
  if (s === null) return 'No score today — not enough sources reported to compute one.';

  const where = s >= 85 ? 'higher than almost anything in our record'
    : s >= 70 ? 'above the usual range of our record'
    : s >= 55 ? 'a little above the middle of our record'
    : s >= 35 ? 'inside the middle band of our own record'
    : 'below the usual range of our record';

  return `Today reads ${s >= 70 ? 'busy' : s >= 55 ? 'slightly busy' : 'ordinary'}. ` +
    `${s.toFixed(1)} of 100 sits ${where}. ` +
    `This counts how much is happening in AI right now — it is not a claim about how it ends.`;
}

/**
 * The direction of the last move, on the fold.
 *
 * docs/VISITORS.md §0 found this printing "— no prior observation to compare"
 * while "Recent moves", two screens down in the same build, printed
 * "Score 40.8 → 40.7 · −0.1". The delta was never missing; the CHOSEN
 * COMPARISON was, and the fold reported that as an absence of information to
 * the 45 of 100 visitors whose first question is whether the number moved.
 *
 * So there are now three sources, tried in order, and each one is LABELLED AS
 * WHAT IT IS rather than dressed up as the one above it:
 *
 *   1. ctx.vsYesterday, basis "day"       a genuine ~24h comparison
 *   2. ctx.vsYesterday, basis "previous"  the preceding observation, by clock
 *   3. state.delta_from_previous          the engine's own last-move delta,
 *                                         which exists from the second run and
 *                                         survives a history log too short for
 *                                         build.mjs to difference
 *
 * Only when all three are absent - a genuine genesis observation - does it say
 * so, and then it says the true thing: this is the first reading. Printing
 * "+0.0" against nothing would be exactly the imputation this project is a
 * reaction to.
 */
function direction(ctx) {
  const st = ctx.state;
  const d = ctx.vsYesterday;

  if (d && Number.isFinite(d.delta)) {
    const against = d.basis === 'previous' ? `since ${d.label}` : `vs ${d.label}`;
    return chip(d.delta, against, d.basis || 'day');
  }

  // The engine writes this on every scored run after the first. It is the same
  // number the move rows print, so the fold and the archive can no longer
  // disagree about whether anything happened.
  if (Number.isFinite(st.delta_from_previous)) {
    return chip(st.delta_from_previous, 'since the last observation', 'engine');
  }

  return `<span class="score__dir"><b>—</b> first scored observation; nothing yet to compare it against</span>`;
}

function chip(delta, against, basis) {
  const glyph = delta > 0 ? '▲' : delta < 0 ? '▼' : '◆';
  const word = delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged';
  return `<span class="score__dir" data-basis="${esc(basis)}">
      <span aria-hidden="true">${glyph}</span>
      <b>${esc(signed(delta, 1))}</b> ${esc(word)} ${esc(against)}
    </span>`;
}

function webApplication(ctx) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: brand.NAME,
    url: ctx.url('/'),
    applicationCategory: 'ReferenceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'No JavaScript required',
    description: brand.DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };
}

function dataset(ctx) {
  const { state } = ctx;
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} AI activity tempo index`,
    description:
      'An hourly 0-100 index of observable AI activity tempo, aggregated from public sources ' +
      'across five pillars: capability, compute and capital, attention, governance and markets. ' +
      'Each observation ships a hash-chained receipt carrying its full inputs.',
    url: ctx.url('/'),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    temporalCoverage: ctx.temporalCoverage,
    dateModified: state.generated_at,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'composite score', value: state.score, minValue: 0, maxValue: 100 },
      { '@type': 'PropertyValue', name: 'level', value: state.level, minValue: 1, maxValue: 5 },
    ],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/state.json') },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/history.json') },
    ],
  };
}
