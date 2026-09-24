// The homepage "what changed" module: the smallest honest answer to the only
// question a returning reader has, which is *what is different since I last
// looked*.
//
// It is deliberately a strip, not a section. The dashboard already owns the
// hero, the pillars and the feed; this sits between them and earns its ~40
// vertical pixels on a phone by carrying deltas that exist nowhere else on the
// page. Everything longer lives on /digest.html and is one link away.
//
// Built to the same two rules as news.mjs:
//
//   1. Every value is in the static HTML. No fetch, no hydration, no script.
//      A screenshot taken at first paint shows the deltas (TEARDOWN 3.3).
//   2. Never colour alone. A delta carries a sign, an arrow glyph and a word;
//      a source transition carries the word "dark" or "live", never a red dot.
//
// Exports render(ctx) and returns '' when ctx.digest is absent, so the call can
// be wired into index.mjs before collector/digest.mjs has ever run. Same
// contract as news.render(ctx) — see the integration note at the bottom.

import { esc, utc, signed } from './_html.mjs';
import { pillarTag, pillarSprite, pillarCss } from './_reel.mjs';

// How many moved pillars get a chip before the rest collapse into a count.
// Five chips plus a composite chip wrap to three rows at 375px; four is the
// most that fits in two.
const CHIPS = 4;

/**
 * The homepage what-changed strip.
 *
 * @param {object} ctx build context; needs ctx.digest (parsed data/digest.json)
 *                     and ctx.href.
 * @returns {string} HTML fragment, or '' when there is no digest.
 */
export function render(ctx) {
  const d = ctx && ctx.digest;
  // No digest.json: the feature is not wired this build and the strip does not
  // exist. Rendering "nothing changed" here would claim we looked, which is a
  // different and false statement.
  if (!d || typeof d !== 'object') return '';

  const idx = d.what_changed && d.what_changed.index;
  const diff = idx && idx.since_previous;
  const href = ctx.href('/digest.html');

  const body = diff && diff.state === 'live'
    ? liveBody(d, diff)
    : baselineBody(d, diff);

  return `${styleTag()}
<section class="wc" aria-labelledby="wc-h">
  <div class="wc__head">
    <h2 class="wc__h" id="wc-h">What changed</h2>
    <p class="wc__ref">${refLine(d, diff)}</p>
  </div>
  ${body}
  <p class="wc__more"><a href="${esc(href)}">The full brief, the streaks and the per-lab rollups &rarr;</a></p>
</section>`;
}

/**
 * The reference line. A delta with an unstated baseline is not a measurement,
 * so the exact stamp the comparison was made against is printed above the
 * numbers rather than implied by the word "changed".
 */
function refLine(d, diff) {
  if (diff && diff.state === 'live') {
    return `Against the observation of <time datetime="${esc(diff.reference_at)}">${esc(utc(diff.reference_at))}</time>, ` +
           `${esc(diff.reference_age_hours)}h earlier.`;
  }
  return `Compiled <time datetime="${esc(d.as_of)}">${esc(utc(d.as_of))}</time>.`;
}

function liveBody(d, diff) {
  const moved = diff.pillars
    .filter((p) => p.state === 'live' && p.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const held = diff.pillars.filter((p) => p.state === 'live' && p.delta === 0);
  const unscored = diff.pillars.filter((p) => p.state !== 'live');

  const chips = moved.slice(0, CHIPS).map(pillarChip).join('');
  const rest = moved.length > CHIPS
    ? `<li class="wc__chip wc__chip--rest">and ${esc(moved.length - CHIPS)} more</li>`
    : '';

  return `<ul class="wc__chips">
    ${compositeChip(diff)}
    ${chips}${rest}
  </ul>
  <p class="wc__note">${esc(tail(diff, moved, held, unscored))}</p>
  ${sourceLine(d)}
  ${leadLine(d)}`;
}

/**
 * No prior observation to diff against. The strip still renders, and says which
 * of the two reasons it is — a log with one row, or a gap outside the window —
 * because "awaiting baseline" and "nothing moved" are different states and
 * merging them is the exact failure docs/VOICE.md bans.
 */
function baselineBody(d, diff) {
  const why = diff && diff.reason ? diff.reason : 'no previous observation is available to compare against';
  return `<p class="wc__await"><b class="wc__awaitw">AWAITING BASELINE</b>
     <span>No delta is published: ${esc(why)}. This is the absence of a comparison, not a comparison that came out flat.</span></p>
  ${sourceLine(d)}
  ${leadLine(d)}`;
}

/** The composite chip. Always present when the diff is live, including at zero. */
function compositeChip(diff) {
  const delta = diff.score_delta;
  const dir = direction(delta);
  return `<li class="wc__chip wc__chip--score" data-dir="${esc(dir.key)}">
    <span class="wc__chipk">Composite</span>
    <span class="wc__chipv num">${esc(diff.score_to)}<span class="wc__of">/100</span></span>
    <span class="wc__chipd num">${esc(dir.glyph)}&nbsp;${esc(fmt(delta, 2))}<span class="vh"> ${esc(dir.word)}</span></span>
  </li>`;
}

function pillarChip(p) {
  const dir = direction(p.delta);
  return `<li class="wc__chip" data-pillar="${esc(p.id)}" data-dir="${esc(dir.key)}">
    <span class="wc__chipk">${pillarTag(p.id)}<span class="wc__chipn">${esc(p.name)}</span></span>
    <span class="wc__chipv num">${esc(p.to)}</span>
    <span class="wc__chipd num">${esc(dir.glyph)}&nbsp;${esc(fmt(p.delta, 2))}<span class="vh"> ${esc(dir.word)}</span></span>
  </li>`;
}

/**
 * The sentence under the chips. It exists to say out loud what the chips cannot
 * show: how many pillars held exactly, and how many carry no score at all.
 * A pillar with no score is not a pillar at zero.
 */
function tail(diff, moved, held, unscored) {
  const bits = [];
  bits.push(moved.length
    ? `${moved.length} of ${diff.pillars.length} pillars moved`
    : `No pillar moved`);
  if (held.length) bits.push(`${held.length} held to the decimal`);
  if (unscored.length) {
    bits.push(`${unscored.length} carries no score and is neither at zero nor unchanged (${unscored.map((p) => p.name).join(', ')})`);
  }
  const level = diff.level_changed === true
    ? ` The level moved from ${diff.level_from} to ${diff.level_to}.`
    : ` The level held at ${diff.level_to}.`;
  return `${bits.join(', ')}.${level}`;
}

/**
 * Source state transitions. This is the line pizzint's dashboard cannot print:
 * their status endpoint reports "healthy" at a 12% scrape success rate
 * (TEARDOWN 3.1), so a feed dying is invisible. Here it is a headline.
 */
function sourceLine(d) {
  const s = d.what_changed && d.what_changed.sources;
  if (!s) return '';
  if (s.state !== 'live') {
    return `<p class="wc__src" data-kind="await"><b>SOURCES</b>
      <span>State transitions are awaiting a baseline: ${esc(s.reason || 'no previous digest to diff against')}.</span></p>`;
  }
  if (!s.transitions.length) {
    return `<p class="wc__src" data-kind="none"><b>SOURCES</b>
      <span>No feed or index source changed state since the last digest.</span></p>`;
  }
  const shown = s.transitions.slice(0, 3).map((t) =>
    `${t.id} ${t.from}&nbsp;&rarr;&nbsp;${t.to}`).join(' &middot; ');
  const more = s.transitions.length > 3 ? ` &middot; and ${s.transitions.length - 3} more` : '';
  return `<p class="wc__src" data-kind="${s.went_dark ? 'dark' : 'back'}"><b>SOURCES</b>
    <span>${shown}${more}</span></p>`;
}

/**
 * One line from the brief, so the strip answers "what happened" as well as
 * "what moved". The top item only — the rest is on /digest.html, and a
 * homepage module that reprints six headlines is a second news feed.
 */
function leadLine(d) {
  const item = d.brief && Array.isArray(d.brief.items) ? d.brief.items[0] : null;
  if (!item) {
    const n = d.brief ? d.brief.candidates : 0;
    return `<p class="wc__lead" data-kind="empty"><b>BRIEF</b>
      <span>No item among the ${esc(n)} in the last ${esc(d.brief ? d.brief.window_hours : 24)} hours met a selection rule.
      The brief is short rather than padded.</span></p>`;
  }
  const title = item.url
    ? `<a href="${esc(item.url)}" rel="noopener nofollow">${esc(item.title)}</a>`
    : esc(item.title);
  // why_components[0] is the strongest measured reason this item was selected —
  // corroboration where it exists, then engagement, then velocity. One clause
  // fits the strip; the rest are on the digest page.
  const why = Array.isArray(item.why_components) && item.why_components.length
    ? item.why_components[0] : '';
  return `<p class="wc__lead" data-kind="item"><b>BRIEF</b>
    <span><span class="wc__leadt">${title}</span>
    <span class="wc__leadw">${esc(why)}</span></span></p>`;
}

// A sign, a glyph and a word. Never the colour on its own: the chips carry a
// hue, and a hue is decoration on top of a signed number that already says it.
function direction(delta) {
  if (!Number.isFinite(delta) || delta === 0) return { key: 'flat', glyph: '=', word: 'unchanged' };
  return delta > 0 ? { key: 'up', glyph: '▲', word: 'up' } : { key: 'down', glyph: '▼', word: 'down' };
}

function fmt(delta, decimals) {
  if (!Number.isFinite(delta)) return '—';
  return delta === 0 ? (0).toFixed(decimals) : signed(delta, decimals).replace(/^[+−]/, '');
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
//
// Namespaced under .wc*, shipped inside the fragment like news.mjs does, so the
// module can be added to or removed from a page without touching the global
// sheet. No new colours: --ok and --dark-src already exist for up and down, and
// they are decoration over a glyph and a sign that carry the same information.
const wcCss = `
.wc { margin: var(--s-5) 0 0; padding: var(--s-4) 0 var(--s-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.wc__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.wc__h {
  font-family: var(--mono); font-size: var(--t-xs); font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); margin: 0;
}
.wc__ref { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); margin: 0; }
.wc__ref time { color: var(--ink-dim); }

.wc__chips { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.wc__chip {
  display: flex; align-items: baseline; gap: 6px;
  border: 1px solid var(--rule); border-left-width: 2px; border-left-color: var(--p, var(--rule));
  border-radius: 2px; padding: 4px 7px; background: var(--bg-raised);
}
.wc__chip--score { border-left-color: var(--accent); }
.wc__chip--rest { color: var(--ink-faint); font-family: var(--mono); font-size: var(--t-xs); border-left-color: var(--rule); }
.wc__chipk { display: inline-flex; align-items: center; gap: 4px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); }
.wc__chipn { max-width: 10ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wc__chipv { font-family: var(--mono); font-size: 14px; font-weight: 700; color: var(--ink); }
.wc__of { font-size: 10px; font-weight: 400; color: var(--ink-faint); }
.wc__chipd { font-family: var(--mono); font-size: 11px; white-space: nowrap; color: var(--ink-dim); }
.wc__chip[data-dir="up"]   .wc__chipd { color: var(--dark-src); }
.wc__chip[data-dir="down"] .wc__chipd { color: var(--ok); }
.wc__chip[data-dir="flat"] .wc__chipd { color: var(--ink-faint); }

.wc__note { font-family: var(--mono); font-size: var(--t-xs); line-height: 1.6; color: var(--ink-faint); margin: 9px 0 0; }
.wc__await { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; margin: 10px 0 0; font-size: var(--t-sm); color: var(--ink-dim); }
.wc__awaitw { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--stale); white-space: nowrap; }

.wc__src, .wc__lead {
  display: grid; grid-template-columns: 5.5ch minmax(0, 1fr); gap: 8px;
  margin: 8px 0 0; padding-top: 8px; border-top: 1px dashed var(--rule-soft);
  font-size: var(--t-sm); line-height: 1.5; color: var(--ink-dim);
}
.wc__src b, .wc__lead b {
  font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--ink-faint); padding-top: 3px;
}
.wc__src[data-kind="dark"] b { color: var(--dark-src); }
.wc__src[data-kind="back"] b { color: var(--ok); }
.wc__src[data-kind="await"] b { color: var(--stale); }
.wc__src span:last-child { font-family: var(--mono); font-size: var(--t-xs); }
.wc__leadt { display: block; color: var(--ink); }
.wc__leadt a { text-decoration: none; }
.wc__leadt a:hover { text-decoration: underline; text-decoration-color: var(--accent); }
.wc__leadw { display: block; font-family: var(--mono); font-size: 11px; color: var(--ink-faint); margin-top: 2px; }

.wc__more { margin: 10px 0 0; font-family: var(--mono); font-size: var(--t-xs); }
.wc__more a { color: var(--ink-dim); text-decoration: none; border-bottom: 1px solid var(--rule); }
.wc__more a:hover { color: var(--ink); border-bottom-color: var(--accent); }

/* 375px: the pillar name inside a chip is the first thing to go. The sigil and
   the short code still name the pillar without it, and four chips then fit on
   two rows instead of four. */
@media (max-width: 420px) {
  .wc__chipn { display: none; }
  .wc__src, .wc__lead { grid-template-columns: 1fr; gap: 2px; }
  .wc__src b, .wc__lead b { padding-top: 0; }
}

/* The only motion in the module, and it names a real event: the chips are the
   deltas that just happened, so they arrive in the order they are ranked. It
   animates the border and the background — never the number, which has to be
   painted on frame one for a screenshot taken at 200ms. */
@media (prefers-reduced-motion: no-preference) {
  .wc__chip { animation: dcWcIn 420ms ease-out backwards; }
  .wc__chips .wc__chip:nth-child(2) { animation-delay: 60ms; }
  .wc__chips .wc__chip:nth-child(3) { animation-delay: 120ms; }
  .wc__chips .wc__chip:nth-child(4) { animation-delay: 180ms; }
  .wc__chips .wc__chip:nth-child(n+5) { animation-delay: 240ms; }
  @keyframes dcWcIn {
    from { border-left-color: var(--rule); background: transparent; }
    to   { border-left-color: var(--p, var(--accent)); background: var(--bg-raised); }
  }
}
`;

/** All CSS this module needs. Safe to inline more than once. */
export function whatChangedCss() {
  return [pillarCss, wcCss].join('\n');
}

/**
 * Stylesheet plus the pillar sigil sprite. Emitted once per page by whichever
 * module renders first; emitting it twice is harmless, because duplicate
 * symbol ids resolve to the first.
 */
export function styleTag() {
  return `<style>${whatChangedCss()}</style>${pillarSprite()}`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  read data/digest.json (tolerate ENOENT -> ctx.digest = null)
//               and put the parsed object on ctx as ctx.digest. Exactly the
//               three lines that already load data/news.json.
//   index.mjs:  import * as whatChanged from './_whatchanged.mjs';
//               ...and drop `${whatChanged.render(ctx)}` into main, directly
//               after the freshness strip and BEFORE news.render(ctx). It
//               answers "what is different" and the feed answers "what is
//               there"; on a phone the first question comes first.
//
// render(ctx) returns '' when ctx.digest is absent, so wiring the call before
// collector/digest.mjs has ever run is safe and changes nothing.
// ---------------------------------------------------------------------------
