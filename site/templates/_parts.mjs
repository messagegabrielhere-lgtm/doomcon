// Shared render fragments. Every one of these is a pure function of its
// arguments - no clock reads, no randomness - so two builds from the same
// data/ produce byte-identical HTML (CONTRACT.md hard constraint 4).

import { esc, num, signed, utc, utcClock, duration, secondsBetween } from './_html.mjs';
import { sparkline, PILLAR_GLYPH } from './_charts.mjs';
import * as brand from '../brand.mjs';

/**
 * Five cells, filled count = 6 - level, so DOOMCON 1 is five filled and
 * DOOMCON 5 is one. The level has to survive greyscale: shape carries the
 * signal and the accent only confirms it. aria-hidden because the adjacent
 * text already says "DOOMCON 3 - ELEVATED"; a screen reader does not need the
 * decoration read out twice.
 */
export function levelBars(level, cls = 'bars') {
  const filled = 6 - level;
  const cells = [1, 2, 3, 4, 5]
    .map((i) => `<span data-on="${i <= filled ? 1 : 0}"></span>`)
    .join('');
  return `<div class="${esc(cls)}" aria-hidden="true">${cells}</div>`;
}

/**
 * The 0-100 scale with the live band marked and a caret at the actual score.
 *
 * Cells are sized by the DISTANCE BETWEEN band floors (0,35,55,70,85,100), not
 * by band width, which is the only way the track is linear in score - and a
 * track that is not linear in score puts the tick labels in the wrong place,
 * so a 61.9 appears to sit on the 70 mark. Cost me a screenshot to notice.
 *
 * NOT USED BY THE DASHBOARD ANY MORE. index.mjs now draws the same fact with
 * _charts.gauge(), which says everything this strip says plus the band name,
 * the band range and a tick at every boundary. Shipping both was two
 * instruments answering one question in the same 375px column. Kept exported
 * because it is the compact form, and a page with no room for a 192px dial
 * (a move page, the widget) should reach for this rather than reinvent it.
 */
export function scaleTrack(level, score) {
  const edges = brand.LEVELS.map((l) => l.band[0]).concat(100);

  const cells = brand.LEVELS.map((l, i) => {
    const width = edges[i + 1] - edges[i];
    return `<i style="width:${width}%" data-live="${l.level === level ? 1 : 0}"></i>`;
  }).join('');

  const marks = edges.map((e, i) => {
    const edge = i === 0 ? ' data-edge="first"' : i === edges.length - 1 ? ' data-edge="last"' : '';
    return `<span style="left:${e}%"${edge}>${e}</span>`;
  }).join('');

  const at = Math.max(0, Math.min(100, score));
  const meta = brand.levelMeta(level);

  return `<div class="scale">
      <div class="scale__track" role="img"
           aria-label="Score ${num(score, 1)} of 100, in the ${esc(meta.name)} band (${meta.band[0]} to ${meta.band[1]}).">
        ${cells}
        <span class="scale__you" style="left:${at.toFixed(2)}%"></span>
      </div>
      <div class="scale__marks" aria-hidden="true">${marks}</div>
    </div>`;
}

// Freshness thresholds, in seconds, measured against the build stamp. Two hours
// is generous for an hourly collector and deliberately so: we would rather flag
// stale late than cry wolf on a single skipped run.
const FRESH_LIMIT = 2 * 3600;
const STALE_LIMIT = 6 * 3600;

export function sourceStatus(source, asOfIso) {
  if (!source || typeof source.id !== 'string') {
    throw new Error(`sourceStatus(): malformed source entry ${JSON.stringify(source)}`);
  }
  // Uncalibrated outranks dark: the source answered, we just have no frozen
  // history to score it against. Reporting it as dark would claim an outage
  // that is not happening - the same category error as pizzint printing a
  // confident number over a dead scraper, pointed the other way.
  if (source.uncalibrated) return { status: 'uncal', age: null };
  if (!source.ok) return { status: 'dark', age: null };

  // Prefer age computed at build time from last_ok: age_seconds was measured
  // when the collector ran, and the site may be rebuilt much later.
  let age = null;
  if (typeof source.last_ok === 'string') age = secondsBetween(asOfIso, source.last_ok);
  else if (Number.isFinite(source.age_seconds)) age = source.age_seconds;
  else throw new Error(`sourceStatus(): source ${source.id} is ok but carries neither last_ok nor age_seconds`);

  if (age < 0) age = 0; // clock skew between collector and builder, not an error
  if (age <= FRESH_LIMIT) return { status: 'ok', age };
  if (age <= STALE_LIMIT) return { status: 'stale', age };
  return { status: 'stale', age };
}

const DOT = { ok: '●', stale: '◐', dark: '○', uncal: '◇' };
const WORD = { ok: 'live', stale: 'stale', dark: 'dark', uncal: 'no baseline' };

export function freshnessStrip(sources, asOfIso) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return `<p class="fresh__key">No source health reported in state.json.</p>`;
  }
  const chips = sources.map((s) => {
    const { status, age } = sourceStatus(s, asOfIso);
    // The status WORD is printed only for the exceptions. Thirteen chips all
    // saying "live" is noise that pushes the age out of a phone-width chip,
    // and the summary line below already states the healthy case. Anything not
    // healthy gets three independent signals: glyph shape, the word, and a
    // dashed border - never colour alone.
    const detail = status === 'ok'
      ? duration(age)
      : `${WORD[status]} · ${age === null ? 'no read' : duration(age)}`;
    return `<li class="chip" data-status="${status}">` +
      `<span class="chip__dot" aria-hidden="true">${DOT[status]}</span>` +
      `<b>${esc(s.id)}</b>` +
      `<span class="chip__age">${esc(detail)}</span>` +
      `<span class="vh">${esc(WORD[status])}</span></li>`;
  }).join('');

  const uncal = sources.filter((s) => s.uncalibrated).length;
  const dark = sources.filter((s) => !s.ok && !s.uncalibrated).length;
  const stale = sources.filter((s) => s.ok && sourceStatus(s, asOfIso).status === 'stale').length;
  const live = sources.length - dark - uncal;

  // The counts first, as a legend a reader can match to the chips above, then
  // one sentence of policy - rather than three sentences of policy the reader
  // has to parse to recover the counts. The three states are still named
  // separately and are still never merged; they are just shorter.
  const legend = [
    `<span class="fresh__lg" data-status="ok"><i aria-hidden="true">${DOT.ok}</i>${live} live</span>`,
    stale ? `<span class="fresh__lg" data-status="stale"><i aria-hidden="true">${DOT.stale}</i>${stale} stale</span>` : '',
    uncal ? `<span class="fresh__lg" data-status="uncal"><i aria-hidden="true">${DOT.uncal}</i>${uncal} awaiting baseline</span>` : '',
    dark ? `<span class="fresh__lg" data-status="dark"><i aria-hidden="true">${DOT.dark}</i>${dark} dark</span>` : '',
  ].filter(Boolean).join('');

  // Name only the states that are actually present. Printing the dark sentence
  // while zero sources are dark tells the reader something failed when nothing
  // did - the mirror image of the error this whole file guards against.
  const notes = [];
  if (dark) notes.push('Dark sources failed to answer and are excluded, never imputed.');
  if (uncal) notes.push('Sources awaiting a baseline answered fine and are published, but there is no frozen reference to score them against yet.');
  if (!notes.length) notes.push('Ages are measured against the build stamp, never as a relative time that goes stale inside the page.');
  const policy = notes.join(' ');

  return `<ul class="fresh__strip">${chips}</ul>` +
    `<p class="fresh__key"><span class="fresh__legend">${legend}</span>${esc(policy)}</p>`;
}

/**
 * Count a pillar's sources by state, from the rows state.json publishes.
 *
 * The pillar record itself only carries sources_ok / sources_total, and on the
 * live data "1/4" is true but misleading: three of capability's four sources
 * are collecting fine and simply have no frozen reference entry yet. Printing
 * "1/4 SOURCES" invites the reader to conclude three are down. So the card
 * counts the three states separately off the source rows when it is given
 * them, and falls back to the pillar's own two numbers when it is not.
 */
function countSources(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let live = 0; let uncal = 0; let dark = 0;
  for (const s of rows) {
    if (s && s.uncalibrated) uncal += 1;
    else if (s && s.ok) live += 1;
    else dark += 1;
  }
  return { live, uncal, dark, total: rows.length };
}

/**
 * One pillar, with its own sparkline.
 *
 * Three states, kept distinct at every level of the card - the score, the body
 * and the data attribute:
 *
 *   live          a number and a sparkline
 *   uncalibrated  AWAITING BASELINE. Sources answered; there is no frozen
 *                 reference to score them against yet.
 *   dark          DARK. Nothing answered.
 *
 * Collapsing the middle one into DARK would claim an outage that is not
 * happening, which is the same category error as pizzint printing a confident
 * DOUGHCON 5 over a scraper managing two successful runs a day - just pointed
 * the other way.
 *
 * @param {object} pillar   a row from state.pillars
 * @param {Array<number>} series  oldest-first pillar scores; may be empty
 * @param {Array<object>} [sourceRows]  state.sources filtered to this pillar
 */
export function pillarCard(pillar, series, sourceRows) {
  const meta = brand.pillarMeta(pillar.id);
  const dark = pillar.dark === true;
  const uncal = pillar.uncalibrated === true;
  const noScore = dark || uncal;
  const scoreTxt = noScore ? '—' : num(pillar.score, 1);
  const glyph = PILLAR_GLYPH[pillar.id] || '▪';
  const counts = countSources(sourceRows);

  const body = noScore
    ? (uncal
        ? `<p class="pillar__dark">AWAITING BASELINE · ${esc(counts ? counts.total : (pillar.sources_total ?? '?'))} sources collecting, not yet scored</p>`
        : `<p class="pillar__dark">DARK · 0 of ${esc(counts ? counts.total : (pillar.sources_total ?? '?'))} sources answered</p>`)
    : `${sparkline(series, { id: pillar.id, label: `${meta.name} score history` })}
       <p class="pillar__foot">${esc(footLine(pillar, counts))}</p>`;

  // data-pillar is the site-wide hue hook (_reel.pillarCss sets --p on it), and
  // adding it here gives each card its pillar's colour on the left edge without
  // this module naming a colour or any caller changing. The paint falls back to
  // the neutral rule when --p is undefined, so a page that does not ship
  // pillarCss still renders a correct, slightly quieter card.
  return `<article class="pillar" data-pillar="${esc(pillar.id)}" data-dark="${noScore ? 1 : 0}" data-uncalibrated="${uncal ? 1 : 0}">
      <div class="pillar__top">
        <h3 class="pillar__name"><span aria-hidden="true">${glyph}</span> ${esc(meta.name)}</h3>
        <span class="pillar__nums">
          <span class="pillar__score num">${esc(scoreTxt)}</span>
          ${noScore ? '' : pillarDelta(pillar, series)}
        </span>
      </div>
      <p class="pillar__blurb">${esc(meta.blurb)}</p>
      ${body}
    </article>`;
}

/**
 * The pillar's change since the previous observation, from the series the card
 * is already being handed. No new data, no new fetch, one more real fact per
 * card - five of them on the dashboard.
 *
 * THE GUARD IS THE WHOLE POINT. `series` arrives from either ctx.seriesFor() or
 * index.mjs's history fallback, and those two do not agree about whether the
 * observation being rendered is the last point in the window. Differencing the
 * last two points of a series that does not END at the number on the card
 * produces a delta between two arbitrary observations, printed next to a score
 * it does not describe - a fabricated figure wearing the costume of a measured
 * one, which is the single thing this project exists not to do. So the delta is
 * emitted ONLY when the series demonstrably terminates at this pillar's score,
 * and is silently omitted otherwise. Absence is the honest output here.
 */
function pillarDelta(pillar, series) {
  if (!Array.isArray(series) || series.length < 2) return '';
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!Number.isFinite(last) || !Number.isFinite(prev) || !Number.isFinite(pillar.score)) return '';
  if (Math.abs(last - pillar.score) > 0.05) return '';
  return deltaChip(last - prev, 'delta delta--sm');
}

/**
 * Direction as shape, then number, then word.
 *
 * Never colour alone: the glyph survives greyscale and a colour-blind reader,
 * the visually-hidden word survives a screen reader, and the signed numeral is
 * the fact. The 0.049 threshold is half the printed precision, so nothing is
 * ever labelled "up" while displaying ±0.0.
 */
export function deltaChip(delta, cls = 'delta') {
  const dir = delta > 0.049 ? 'up' : delta < -0.049 ? 'down' : 'flat';
  const glyph = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '◆';
  const word = dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'unchanged';
  return `<span class="${esc(cls)}" data-dir="${dir}">` +
    `<span class="delta__g" aria-hidden="true">${glyph}</span>` +
    `<b class="delta__n num">${esc(signed(delta, 1))}</b>` +
    `<span class="vh">${word}</span></span>`;
}

function footLine(pillar, counts) {
  const bits = [];
  if (counts) {
    bits.push(`${counts.live}/${counts.total} SCORED`);
    if (counts.uncal) bits.push(`${counts.uncal} AWAITING BASELINE`);
    if (counts.dark) bits.push(`${counts.dark} DARK`);
  } else {
    bits.push(`${pillar.sources_ok}/${pillar.sources_total} SOURCES`);
  }
  // The percentile is the differentiator in miniature: not a judgement, a
  // position in the frozen reference record. It is printed wherever it exists.
  if (Number.isFinite(pillar.percentile)) {
    bits.push(`${(pillar.percentile * 100).toFixed(0)}TH PCTL`);
  }
  return bits.join(' · ');
}

export function moveRow(move, href) {
  const what = move.level_changed
    ? `${brand.NAME} ${move.previous_level} → ${brand.NAME} ${move.level} · ${brand.levelMeta(move.level).name}`
    : `Score ${num(move.previous_score, 1)} → ${num(move.score, 1)}`;
  const tag = move.level_changed ? '<span class="move__tag">level change</span>' : '';
  // The loudest live pillar at that observation, from the receipt. One more
  // real fact per row, and the one that says WHY the number moved rather than
  // only that it did.
  const lead = move.leadPillar && move.leadPillar.id
    ? `<span class="move__lead">${esc(brand.pillarMeta(move.leadPillar.id).name)} led at ${esc(num(move.leadPillar.score, 1))}</span>`
    : '';
  return `<li class="move" data-changed="${move.level_changed ? 1 : 0}"><a class="move__a" href="${esc(href)}">
      <time class="move__time" datetime="${esc(move.generated_at)}">${esc(utc(move.generated_at))}</time>
      <span class="move__what">${esc(what)}${tag}${lead}</span>
      <span class="move__delta num" data-dir="${move.delta > 0.049 ? 'up' : move.delta < -0.049 ? 'down' : 'flat'}">${esc(signed(move.delta, 1))}</span>
    </a></li>`;
}

/**
 * The degraded banner, as ONE LINE.
 *
 * It used to spend 42 words and ~170px of an 812px phone fold - 21% of the
 * screen a first-time reader has - on a caveat, and then the hero underneath
 * declined to say whether the number had moved. That is being careful in the
 * wrong place. Downdetector states a three-tier honesty ladder in one sentence
 * per state, so the length is the thing that was wrong here, not the policy:
 * every clause of the original paragraph is still on the page, one tap away,
 * and the <details> is open-able with no JavaScript.
 *
 * The summary line carries the denominator, the named dark inputs and the
 * consequence, which is everything a reader needs to decide whether to keep
 * reading. Nothing is softened and nothing is imputed.
 */
export function degradedBanner(state) {
  if (!state.degraded) return '';
  const dark = Array.isArray(state.dark_pillars) ? state.dark_pillars : [];
  const sources = Array.isArray(state.sources) ? state.sources : [];
  const darkSrc = sources.filter((s) => s && !s.ok && !s.uncalibrated).map((s) => s.id);
  const reporting = sources.filter((s) => s && (s.ok || s.uncalibrated)).length;

  const bits = [];
  if (sources.length) bits.push(`${reporting}/${sources.length} reporting`);
  if (darkSrc.length) {
    const named = darkSrc.slice(0, 3).join(', ');
    bits.push(`${darkSrc.length} dark: ${named}${darkSrc.length > 3 ? `, +${darkSrc.length - 3}` : ''}`);
  }
  if (dark.length) {
    bits.push(`${dark.map((id) => brand.pillarMeta(id).name).join(', ')} dark`);
  }
  bits.push('level frozen');

  return `<div class="degraded"><div class="wrap degraded__in">
      <span class="degraded__mark">DEGRADED</span>
      <p class="degraded__txt">${esc(bits.join(' · '))}</p>
      <details class="degraded__d">
        <summary>why</summary>
        <p>The score is computed from live pillars only. Dark pillars are excluded, never imputed and
        never counted as zero, and the level is frozen until they report. A dark source is one whose
        fetch failed; a source awaiting a baseline answered normally and simply has no frozen
        reference to be scored against yet. Those are different states and this site never merges
        them.</p>
      </details>
    </div></div>`;
}

// ---------------------------------------------------------------------------
// NEW-ITEM COUNTS
//
// "Show new posts counts" was an explicit line in the v5 brief, and it is the
// cheapest real thing on the list: data/news.json already carries
// `meta.first_seen_at` on every one of its 200 items (docs/NEWS.md, the `meta`
// contract), so the counts below are a read, not a collection.
//
// THE FIELD MEANS WHAT IT SAYS, AND NOT MORE. `first_seen_at` is the instant
// THIS collector first held the item. It is not the publication time — that is
// `published_at`, and the two differ by hours on a slow feed — and it is not a
// claim that the item is new to the world. Every string this module writes says
// "first seen" rather than "published" for that reason.
//
// THE TRAP, AND THE HONESTY RULE THAT COMES OUT OF IT. On the live file the
// oldest first_seen_at is about five and a half hours old, because that is how
// long the news collector has been running — so a naive "200 new in 24h" is
// true and useless: it is measuring the age of the record, not the tempo of the
// feeds. Every window therefore publishes `complete`, and `complete: false`
// means the record is shallower than the window asked for. The count is still
// printed, because a real number with its limitation stated is the house style
// (VOICE.md §4) — it is printed next to the depth of the record, never alone.
//
// This module computes and renders the STATIC counts and the badge markup. Any
// live-updating behaviour belongs to the motion layer, which already polls
// api/news.json; the numbers here are in the first byte of the HTML, so a
// screenshot taken before a single line of script runs carries them
// (MOTION.md rule 0).
// ---------------------------------------------------------------------------

/** The two windows the dashboard asks for. Overridable, in seconds. */
export const NEW_WINDOWS = Object.freeze([3600, 86400]);

function windowLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`newCounts(): window must be positive seconds, got ${JSON.stringify(seconds)}`);
  }
  // Hours up to two days, so the window the brief actually asked for reads
  // "24h" and not "1d". Nobody says "1d new items".
  if (seconds < 172800 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  return `${Math.round(seconds / 60)}m`;
}

/**
 * Count items by how recently this collector first saw them.
 *
 * Pure: the reference instant is `news.generated_at`, never a clock read, so
 * two builds from the same data/ produce the same counts and the same bytes
 * (CONTRACT.md hard constraint 4).
 *
 * @param {object|null} news  the parsed data/news.json, or null
 * @param {object} [opts]
 * @param {number[]} [opts.windows=NEW_WINDOWS]  window sizes in seconds
 * @param {string|null} [opts.asOf]  override the reference instant (ISO)
 * @returns {object|null} null when there is no news, or when no item carries
 *          first_seen_at — which is a real state on an older news.json and is
 *          reported as "we cannot count this", never as zero.
 */
export function newCounts(news, { windows = NEW_WINDOWS, asOf = null } = {}) {
  if (!news || typeof news !== 'object' || !Array.isArray(news.items) || news.items.length === 0) return null;

  const at = asOf || news.generated_at;
  const now = Date.parse(at);
  if (!Number.isFinite(now)) {
    throw new Error(`newCounts(): news.generated_at is not an ISO timestamp: ${JSON.stringify(at)}`);
  }
  const wins = windows.map((s) => {
    windowLabel(s);
    return s;
  });

  const labels = new Map();
  if (Array.isArray(news.sources)) {
    for (const s of news.sources) if (s && s.id) labels.set(s.id, s.label || s.id);
  }

  const seen = [];
  let missing = 0;
  const stamps = new Set();
  for (const item of news.items) {
    const raw = item && item.meta ? item.meta.first_seen_at : null;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) { missing += 1; continue; }
    stamps.add(raw);
    seen.push({ t, source: typeof item.source === 'string' ? item.source : 'unknown' });
  }
  if (seen.length === 0) return null;

  let oldest = Infinity;
  for (const s of seen) if (s.t < oldest) oldest = s.t;
  // Clamp at zero rather than trusting the subtraction: the collector and the
  // builder are different processes and a few seconds of skew is normal.
  const depth = Math.max(0, (now - oldest) / 1000);

  const perSource = new Map();
  for (const s of seen) {
    let row = perSource.get(s.source);
    if (!row) { row = { id: s.source, label: labels.get(s.source) || s.source, total: 0, counts: wins.map(() => 0) }; perSource.set(s.source, row); }
    row.total += 1;
    const age = (now - s.t) / 1000;
    wins.forEach((w, i) => { if (age <= w) row.counts[i] += 1; });
  }

  const windowRows = wins.map((seconds, i) => {
    const count = seen.filter((s) => (now - s.t) / 1000 <= seconds).length;
    return {
      seconds,
      label: windowLabel(seconds),
      count,
      // Sources that put at least one item into this window. The denominator is
      // every source the file reports, dark ones included, because "12 of 16
      // feeds contributed" is the interesting number and "12 of 12" is not.
      sources: [...perSource.values()].filter((r) => r.counts[i] > 0).length,
      covered_seconds: Math.min(seconds, depth),
      complete: depth >= seconds,
    };
  });

  return {
    as_of: at,
    oldest_seen_at: new Date(oldest).toISOString(),
    depth_seconds: depth,
    // One stamp per collector run, so this is how many times the feeds have
    // been read since the record began. It is the denominator behind the
    // depth, and it is the difference between "quiet feeds" and "one run".
    runs: stamps.size,
    total: seen.length,
    missing,
    sources_total: Array.isArray(news.sources) ? news.sources.length : null,
    windows: windowRows,
    per_source: [...perSource.values()].sort((a, b) => b.counts[0] - a.counts[0] || b.total - a.total || a.id.localeCompare(b.id)),
  };
}

/** Pick one window row out of a counts object by its size in seconds. */
export function newWindow(counts, seconds = 3600) {
  if (!counts || !Array.isArray(counts.windows)) return null;
  return counts.windows.find((w) => w.seconds === seconds) || null;
}

/**
 * The "N new" badge for a section heading.
 *
 * Drops straight into `.sec__h`, which is a flex row terminated by a hairline —
 * the badge lands between the words and the rule, which is where a count
 * belongs. It is also usable inline anywhere else.
 *
 * Four states, all distinguishable without colour, because a section heading is
 * the thing that gets cropped into a screenshot:
 *
 *   count > 0             solid badge, the numeral is the loudest thing in it
 *   count = 0             outlined, dimmed, and it still prints the 0. An index
 *                         that only speaks when something arrived is an index
 *                         nobody believes when it does (TEARDOWN §2.4).
 *   partial window        dashed border, and the word is the DEPTH OF THE
 *                         RECORD rather than the window that was asked for, so
 *                         the badge cannot claim a day it has not watched.
 *   no count available    render nothing — callers use newBadgeFor().
 *
 * @param {number} count
 * @param {object} [opts]
 * @param {number} [opts.seconds=3600]  the window this count covers
 * @param {boolean} [opts.complete=true] false when the record is shallower
 * @param {number|null} [opts.coveredSeconds] the depth, when incomplete
 * @param {string|null} [opts.since] ISO stamp to print instead of a window
 * @param {string} [opts.noun='new']
 */
export function newBadge(count, {
  seconds = 3600, complete = true, coveredSeconds = null, since = null, noun = 'new',
} = {}) {
  if (!Number.isFinite(count) || count < 0) {
    throw new Error(`newBadge(): expected a non-negative count, got ${JSON.stringify(count)}`);
  }
  const n = Math.round(count);
  const partial = complete === false;

  let word;
  let spoken;
  if (since) {
    const clock = `${utcClock(since)}Z`;
    word = `${esc(noun)} since <time datetime="${esc(since)}">${esc(clock)}</time>`;
    spoken = `${n} first seen since ${clock}`;
  } else if (partial) {
    const depth = Number.isFinite(coveredSeconds) ? duration(coveredSeconds) : 'the whole record';
    word = `${esc(noun)} · ${esc(depth)} on record`;
    spoken = `${n} first seen in the ${depth} this record covers, which is less than the ${windowLabel(seconds)} asked for`;
  } else {
    word = `${esc(noun)} · ${esc(windowLabel(seconds))}`;
    spoken = `${n} first seen in the last ${windowLabel(seconds)}`;
  }

  return `<span class="newbadge" data-zero="${n === 0 ? 1 : 0}" data-partial="${partial ? 1 : 0}">` +
    `<b class="newbadge__n num" aria-hidden="true">${esc(String(n))}</b>` +
    `<span class="newbadge__w" aria-hidden="true">${word}</span>` +
    `<span class="vh">${esc(spoken)}</span></span>`;
}

/**
 * The badge for one window of a counts object, or '' when there is nothing to
 * count. This is the call a section heading wants: it is safe to drop into a
 * template that may be building without data/news.json.
 */
export function newBadgeFor(counts, seconds = 3600, opts = {}) {
  const w = newWindow(counts, seconds);
  if (!w) return '';
  return newBadge(w.count, {
    seconds: w.seconds, complete: w.complete, coveredSeconds: w.covered_seconds, ...opts,
  });
}

/** The badge for one source inside one window — the per-source half of the ask. */
export function newBadgeForSource(counts, sourceId, seconds = 3600, opts = {}) {
  if (!counts || !Array.isArray(counts.per_source)) return '';
  const i = counts.windows.findIndex((w) => w.seconds === seconds);
  if (i < 0) return '';
  const row = counts.per_source.find((r) => r.id === sourceId);
  const w = counts.windows[i];
  return newBadge(row ? row.counts[i] : 0, {
    seconds, complete: w.complete, coveredSeconds: w.covered_seconds, ...opts,
  });
}

/**
 * The sentence that keeps the counts honest, in one line.
 *
 * Says what "first seen" means and, when the record is shallower than the
 * longest window, says so with both numbers. This is the clause VOICE.md §4
 * asks for: the limitation arrives in the same breath as the figure, and it
 * costs one sentence.
 */
export function newCoverageNote(counts) {
  if (!counts) return '';
  const bits = ['First seen is when this desk first held the item, not when it was published.'];
  const incomplete = counts.windows.filter((w) => !w.complete);
  if (incomplete.length) {
    const longest = incomplete[incomplete.length - 1];
    bits.push(
      `The record is ${duration(counts.depth_seconds)} deep over ${counts.runs} ` +
      `collector run${counts.runs === 1 ? '' : 's'}, so the ${longest.label} count is the whole record rather than a full ${longest.label}.`
    );
  }
  if (counts.missing) {
    bits.push(`${counts.missing} of ${counts.total + counts.missing} items carry no first-seen stamp and are left out of every count, never counted as old.`);
  }
  return bits.join(' ');
}

/**
 * The arrivals strip — the counts as a block, for the top of a page.
 *
 * The brief asked to "show new posts counts" and pointed at pizzint's
 * "8 LOCATIONS MONITORED / 40 REPORTS / 19 ALERTS" header, which is the whole
 * device: a row of counters makes a page read as a desk that is watching
 * something rather than a page that displays a number. Every cell here is a
 * count we hold, with its denominator, and the busiest-feed cell names the
 * source — which is the one thing their counters never do.
 *
 * Returns '' when there is nothing to count, so it is safe to call
 * unconditionally from a template that may build without data/news.json.
 *
 * @param {object|null} counts   output of newCounts()
 * @param {object} [opts]
 * @param {string|null} [opts.href]  a link for the whole strip's "all of it"
 */
export function newPulse(counts, { href = null } = {}) {
  if (!counts) return '';
  const hour = newWindow(counts, 3600) || counts.windows[0];
  const day = newWindow(counts, 86400);
  const top = counts.per_source[0];

  const cells = [];
  if (day) {
    cells.push({
      k: day.complete ? `Last ${day.label}` : `Whole record (${duration(counts.depth_seconds)})`,
      v: `<b class="num">${esc(String(day.count))}</b>`,
      s: `${day.sources} feed${day.sources === 1 ? '' : 's'} contributed`,
    });
  }
  if (Number.isFinite(counts.sources_total)) {
    cells.push({
      k: 'Feeds reporting',
      v: `<b class="num">${esc(String(hour.sources))}</b><span class="npulse__of">/ ${esc(String(counts.sources_total))}</span>`,
      s: `in the last ${hour.label}`,
    });
  }
  if (top) {
    cells.push({
      k: 'Busiest feed',
      // The id, not the label: the freshness strip prints ids, the news page
      // prints ids, and "arXiv cs.AI / cs.LG / cs.CL (newest)" is four lines of
      // a 375px cell. One vocabulary for one thing across the site.
      v: `<span class="npulse__src">${esc(top.id)}</span>`,
      s: `${top.counts[0]} of ${top.total} in window`,
    });
  }
  cells.push({
    k: 'Record depth',
    v: `<b class="num">${esc(duration(counts.depth_seconds))}</b>`,
    s: `${counts.runs} collector run${counts.runs === 1 ? '' : 's'}`,
  });

  const note = newCoverageNote(counts);
  const more = href ? ` <a href="${esc(href)}">Every item, scored &rarr;</a>` : '';

  return `<div class="npulse" data-partial="${hour.complete ? 0 : 1}" data-zero="${hour.count === 0 ? 1 : 0}">
  <div class="npulse__lead">
    <span class="npulse__n num">${esc(String(hour.count))}</span>
    <span class="npulse__u">new item${hour.count === 1 ? '' : 's'}<br>first seen in the last ${esc(hour.label)}</span>
  </div>
  <ul class="npulse__cells">${cells.map((c) => `<li class="npulse__c">
      <span class="npulse__ck">${esc(c.k)}</span>
      <span class="npulse__cv">${c.v}</span>
      <span class="npulse__cs">${esc(c.s)}</span>
    </li>`).join('')}</ul>
  <p class="npulse__note">${esc(note)}${more}</p>
</div>`;
}

/**
 * Per-source arrival counts as a ranked list, for /news.
 *
 * The bar is width-only and every row states its two numbers in text, so the
 * list is complete with no CSS at all — the bars are the scan, the numerals are
 * the reading.
 */
export function newSourceList(counts, { limit = 0 } = {}) {
  if (!counts || !counts.per_source.length) return '';
  const rows = limit > 0 ? counts.per_source.slice(0, limit) : counts.per_source;
  const max = Math.max(...counts.per_source.map((r) => r.counts[0]), 1);
  const hour = counts.windows[0];

  const items = rows.map((r) => {
    const w = Math.round((r.counts[0] / max) * 100);
    return `<li class="nsrc" data-zero="${r.counts[0] === 0 ? 1 : 0}">
      <span class="nsrc__n">${esc(r.id)}<span class="vh"> — ${esc(r.label)}</span></span>
      <span class="nsrc__bar" aria-hidden="true"><i style="width:${w}%"></i></span>
      <span class="nsrc__v num">${esc(String(r.counts[0]))}<span class="nsrc__of">of ${esc(String(r.total))}</span></span>
    </li>`;
  }).join('');

  return `<ul class="nsrcs" aria-label="Items first seen in the last ${esc(hour.label)}, by feed">${items}</ul>`;
}
