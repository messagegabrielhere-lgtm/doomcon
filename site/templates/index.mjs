// The dashboard.
//
// Everything above the fold on a 375px phone is server-rendered: the level
// digit, the score, its position on the 0-100 arc, and where today sits inside
// the frozen reference record. All of it is text or inline SVG in the first
// byte of the response. pizzint client-renders, so its prerendered HTML says
// "LOADING TACTICAL DATA..." - a crawler sees nothing and a screenshot taken
// before hydration is blank (TEARDOWN 3.3). Screenshots are the growth loop,
// so nothing on this page waits for JavaScript. There is no JavaScript.
//
// Visual hierarchy, top to bottom, and why:
//
//   1. HERO      the level digit and the score, dominant, plus gauge() for
//                "where in the range" and distributionStrip() for "where in
//                the record". The second of those is the only graphic on the
//                site that draws our actual differentiator: every competitor
//                scores by human or model judgement (TEARDOWN 4), and this one
//                places today against published frozen history instead.
//   2. THE RECORD  the full-width history chart. The single most important
//                graphic here: one number is a claim, a line is a record.
//   3. FRESHNESS then the newsroom, then the pillars, then the archive.

import { esc, num, signed, utc } from './_html.mjs';
import { levelBars, freshnessStrip, pillarCard, moveRow } from './_parts.mjs';
import { indexHistoryChart, pillarRanked, gauge, distributionStrip } from './_charts.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import * as news from './news.mjs';

// Matches build.mjs's own sparkline window. Only a cap: the fallback reader
// below never needs more points than a 300-unit sparkline can resolve.
const SPARK_POINTS = 48;

/**
 * Where to go next. Every card carries a real, current number pulled from the
 * same state the dashboard renders, because "The AI race" is a label and
 * "Anthropic leads at 73.5%" is a reason to click.
 */
function elsewhere(ctx) {
  const cards = [];

  const race = ctx.race;
  if (race && Array.isArray(race.players) && race.players.length) {
    const top = race.players[0];
    // The probability is nested under .market, and only meaningful when that
    // market is live — a dark leg must not be printed as a confident number.
    const mk = top.market || {};
    const pct = mk.state === 'live' && Number.isFinite(mk.probability)
      ? `${(mk.probability * 100).toFixed(1)}%` : null;
    cards.push({
      href: ctx.href('/race.html'),
      kicker: 'The AI race',
      line: pct ? `${top.name} leads at ${pct}` : `${race.players.length} labs ranked`,
      sub: 'Frontier labs ranked on live prediction-market odds.',
    });
  }

  const news = ctx.news;
  if (news && Array.isArray(news.items) && news.items.length) {
    cards.push({
      href: ctx.href('/news.html'),
      kicker: 'The newsroom',
      line: `${news.items.length} items in the window`,
      sub: 'Every story, scored on how many independent sources carried it.',
    });
  }

  cards.push({
    href: ctx.href('/methodology.html'),
    kicker: 'The arithmetic',
    line: 'Recompute this number yourself',
    sub: 'Every formula, every constant, and the three ways this index could mislead you.',
  });

  cards.push({
    href: ctx.href('/history.html'),
    kicker: 'The lore',
    line: 'Sixty years of the same argument',
    sub: 'Good 1965 to the EU AI Act, dated and attributed.',
  });

  if (Array.isArray(ctx.moves) && ctx.moves.length) {
    cards.push({
      href: ctx.href('/moves/'),
      kicker: 'The receipts',
      line: `${ctx.moves.length} timestamped observation${ctx.moves.length === 1 ? '' : 's'}`,
      sub: 'Hash-chained. Take any one and re-derive it.',
    });
  }

  return `
<section class="sec xsell" aria-labelledby="xsell-h">
  <h2 class="sec__h" id="xsell-h">Elsewhere on the desk</h2>
  <ul class="xsell__grid">
    ${cards.map((c) => `<li class="xsell__i"><a class="xsell__a" href="${esc(c.href)}">
      <span class="xsell__k">${esc(c.kicker)}</span>
      <span class="xsell__l">${esc(c.line)}</span>
      <span class="xsell__s">${esc(c.sub)}</span>
    </a></li>`).join('')}
  </ul>
</section>`;
}

export function render(ctx) {
  const { state } = ctx;
  const meta = brand.levelMeta(state.level);
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

  const main = `
${news.styleTag()}
<section class="hero">
  <p class="eyebrow">Observed <time datetime="${esc(state.generated_at)}">${esc(utc(state.generated_at))}</time></p>
  <div class="hero__grid">

    <!-- align-self overrides .hero__grid's align-items:end for this one item.
         The score column is now ~300px taller than the level column, because it
         carries the dial and the distribution strip. Bottom-aligning a 152px
         digit against that left 200px of empty page above it at desktop width,
         and it read as a broken grid rather than as space. Centred, the digit
         sits opposite the instruments it labels. An inline property rather than
         a new class, because site/styles.mjs belongs to the integrator. -->
    <div class="level" style="align-self:center">
      <!-- data-dc-* are the motion layer's hooks (site/templates/_motion.mjs
           looks for [data-dc-level] and [data-dc-score] first, falling back to
           the class names). Naming them explicitly means restyling this hero
           cannot silently break the count-up in a file owned by someone else. -->
      <div class="level__digit num" data-dc-level aria-hidden="true">${esc(state.level)}</div>
      <div class="level__meta">
        <h1 class="level__name">${esc(brand.NAME)} ${esc(state.level)} · ${esc(state.level_name)}</h1>
        ${meta.epithet ? `<p class="level__ep">${esc(meta.epithet)}</p>` : ''}
        ${levelBars(state.level)}
        <p class="level__gloss">${esc(meta.gloss)}</p>
      </div>
    </div>

    <div class="score">
      <p class="eyebrow">Composite score</p>
      <div class="score__row">
        <span class="score__val num" data-dc-score>${esc(scoreTxt)}</span>
        <span class="score__of">/ 100</span>
        ${direction(ctx)}
      </div>

      <div class="hero__chart">${heroGauge(state)}</div>
      <div class="hero__chart">${heroDistribution(state)}</div>
      <p class="fresh__key">The curve is the frozen reference distribution — built once from
         historical backfill, never updated live.
         <a href="${esc(ctx.href('/methodology.html'))}">How the score is computed →</a></p>
    </div>

  </div>

  <p class="stamp">
    Level held since <b>${esc(utc(state.level_since))}</b>.
    ${state.previous_level && state.previous_level !== state.level
      ? `Previous level <b>${esc(brand.NAME)} ${esc(state.previous_level)}</b>.`
      : ''}
    Receipt <b>${esc(state.receipt_id)}</b>.
  </p>
  <p class="disclaimer">${esc(brand.DISCLAIMER)}</p>
</section>

<section class="sec" id="record" aria-labelledby="record-h">
  <h2 class="sec__h" id="record-h">The record</h2>
  <p class="lede">${esc(recordLede(obs))}</p>
  ${indexHistoryChart(ctx.history, { id: 'home', now: state.score })}
  <p class="fresh__key">${esc(recordKey(obs))}
     <a href="${esc(ctx.href('/history.html'))}">Full history and every observation →</a></p>
</section>

<section class="fresh" aria-labelledby="fresh-h">
  <h2 class="sec__h" id="fresh-h">Source freshness</h2>
  ${freshnessStrip(state.sources, state.generated_at)}
</section>

${news.render(ctx)}

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

${elsewhere(ctx)}

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
// Hero graphics
// ---------------------------------------------------------------------------

/**
 * The score as a position in a bounded range.
 *
 * showValue is FALSE on purpose. The dial can print the score in its own
 * middle, and next to a .score__val already set at 13.5vw that is the same
 * number three times in one column (the strip below prints it a fourth). The
 * digit stays where it is dominant and the dial answers the question the digit
 * cannot: 40.7 of what, and which band is that.
 */
function heroGauge(state) {
  return gauge(state.score, { id: 'hero', showValue: false });
}

/**
 * Where today sits in the frozen reference distribution.
 *
 * NO PERCENTILE IS PASSED, and that is a deliberate refusal rather than an
 * omission. state.json publishes a percentile per PILLAR and per SOURCE - each
 * one a genuine empirical percentile against data/reference.json - but never
 * for the composite, because the composite is 0.7*mean + 0.3*max over pillar
 * scores and is not itself a draw from that distribution. Running the composite
 * back through the normal to print "31st percentile" would be a manufactured
 * number wearing the costume of a measured one, which is the single thing this
 * project exists not to do.
 *
 * So the strip is handed the SCORE. The placement is still exact - score space
 * IS 50 + 12.5z against the frozen reference, which is the curve being drawn -
 * and the label reads as the score rather than asserting a percentile we have
 * not computed. If the engine ever publishes state.percentile for the
 * composite, it arrives here automatically.
 */
function heroDistribution(state) {
  const pct = Number.isFinite(state.percentile) ? state.percentile : null;
  return distributionStrip(pct, {
    id: 'hero',
    score: state.score,
    subject: 'Today',
    // Six words. The whole competitive claim, and the reason this graphic is
    // in the hero at all: DoomBench, the AI Safety Clock and every countdown
    // in the category score by judgement. This one does not.
    caption: 'Measured against frozen history, not judgement.',
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
 *
 * The one-line fix belongs in build.mjs's seriesBuilder; this fallback is
 * harmless once it lands. See integration_notes.
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

function direction(ctx) {
  const d = ctx.vsYesterday;
  // No prior observation is a real state, not a zero. Saying "+0.0" when we
  // have nothing to compare against is exactly the imputation this whole
  // project is a reaction to.
  if (!d) {
    return `<span class="score__dir"><b>—</b> no prior observation to compare</span>`;
  }
  const glyph = d.delta > 0 ? '▲' : d.delta < 0 ? '▼' : '◆';
  const word = d.delta > 0 ? 'up' : d.delta < 0 ? 'down' : 'unchanged';
  return `<span class="score__dir">
      <span aria-hidden="true">${glyph}</span>
      <b>${esc(signed(d.delta, 1))}</b> ${esc(word)} vs ${esc(d.label)}
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
