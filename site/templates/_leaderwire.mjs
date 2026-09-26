// The leader wire — a homepage module. One row per person on the roster.
//
// ---------------------------------------------------------------------------
// THE RULE THIS MODULE ENFORCES AT THE LAST POSSIBLE MOMENT
// ---------------------------------------------------------------------------
//
// The only words attributed to a named living person anywhere in this file are
// `line.headline`, printed whole and linked to the publication that ran it.
// Nothing is clipped, nothing is summarised, nothing is rewritten. There is no
// truncation helper in this module ON PURPOSE — news.mjs has clip() for
// summaries, and a clipped headline beside a person's name is a sentence they
// did not say. A long headline wraps. Wrapping is free; a half-sentence in
// quotation marks is not.
//
// collector/leaders.mjs makes the same promise on the data side and asserts it
// there. This file is the second lock on the same door: if a future edit adds
// a summary line or an ellipsis to a row, it has to remove this comment first.
//
// ---------------------------------------------------------------------------
// WHY EVERY ROW IS ALWAYS HERE, INCLUDING THE EMPTY ONES
// ---------------------------------------------------------------------------
//
// A leader with no match prints "Nothing on the record this week" and stays in
// the list. An absence rendered as a missing row is indistinguishable from a
// bug — the reader cannot tell "Hassabis said nothing we caught" from "the
// matcher broke" from "we never followed Hassabis". This is the same rule
// docs/NEWS.md applies to source states (dormant is not dark) and
// docs/VOICE.md applies to the index (dark is not awaiting baseline), and it
// is the reason the roster is a fixed list of fifteen rather than a feed.
//
// The state is carried by a WORD in every case, never by colour and never by
// position: ON THE RECORD / NO LINE, printed in the row, with the count beside
// it. Colour and the dotted mark are confirmation, exactly as the heat ramp is
// confirmation of a level name.
//
// It exports a fragment rather than a page, because index.mjs owns the
// dashboard. See the integration note at the bottom of this file — it follows
// news.mjs's shape deliberately, so the integrator wires the two identically.

import { esc, utc, utcClock } from './_html.mjs';

// The roster is fifteen and every one of them is rendered. There is no limit
// constant here and there should never be one: a "top N leaders" module would
// print the loudest people and silently drop the quiet ones, which inverts the
// whole point of the section.
const DEFAULT_HEADING = 'The leader wire';

/**
 * Normalise what build.mjs put on ctx into the shape the markup wants.
 *
 * Returns null when there is no data at all — which is a different state from
 * "data present, nobody on the record", and the two render differently.
 */
export function readWire(ctx) {
  const raw = ctx && ctx.leaders;
  if (!raw || !Array.isArray(raw.leaders) || !raw.leaders.length) return null;
  return raw;
}

/** build.mjs / index.mjs guard. */
export function hasWire(ctx) {
  return Boolean(readWire(ctx));
}

/**
 * The homepage leader wire.
 *
 * @param {object} ctx  build context; needs ctx.leaders (parsed
 *                      data/leaders.json) and ctx.href.
 * @returns {string} HTML fragment, or '' when there is no leaders.json.
 */
export function render(ctx, { heading = DEFAULT_HEADING, href = '/leaders.html' } = {}) {
  const wire = readWire(ctx);

  // No leaders.json: the feature is not wired this build and the section does
  // not exist. Rendering fifteen empty rows here would claim we looked at the
  // corpus and found nobody, which is a different and false statement.
  if (!wire) return '';

  const t = wire.totals;
  const pageHref = ctx && typeof ctx.href === 'function' ? ctx.href(href) : href;

  // A CALLER PASSING heading: null MEANS "no heading", NOT the string "null".
  // _switcher.mjs:1191 does exactly that, because inside a switcher panel the
  // tab already names the section and a second title is noise. A JS default
  // only fires on `undefined`, so null flowed straight through to esc(null)
  // and the homepage shipped a visible <h2> reading "null" — which was also
  // this section's aria-labelledby target, so a screen reader announced the
  // whole region as "null" too. Suppress the element and label the region
  // directly instead of leaving aria-labelledby pointing at nothing.
  const showHeading = heading !== null && heading !== undefined && String(heading).trim() !== '';
  const headingText = showHeading ? String(heading) : DEFAULT_HEADING;
  const label = showHeading
    ? ' aria-labelledby="lw-h"'
    : ` aria-label="${esc(DEFAULT_HEADING)}"`;

  return `${styleTag()}
<section class="sec lw"${label}>
  <div class="lw__hd">
    ${showHeading ? `<h2 class="sec__h" id="lw-h">${esc(headingText)}</h2>` : ''}
    <p class="lw__k">${esc(t.on_record)} of ${esc(t.leaders)} on the record ·
      ${esc(t.lines)} line${t.lines === 1 ? '' : 's'} ·
      <time datetime="${esc(wire.generated_at)}" title="${esc(utc(wire.generated_at))}">${esc(utcClock(wire.generated_at))}Z</time></p>
  </div>
  <p class="lede lw__lede">What the people running AI said on the record in the last
     ${esc(wire.window_days)} days, in the words their publications printed. Every line below is a
     headline, reproduced exactly and linked to the outlet that ran it. <b>Nothing on this page is
     a quotation we wrote</b> — there is no summary, no paraphrase and no reconstruction anywhere
     in the wire, which is why every line can be checked by clicking it.</p>
  ${legend(wire)}
  <ol class="lw__l">${wire.leaders.map((l) => row(l, { compact: true, anchor: pageHref })).join('')}</ol>
  <p class="lw__more"><a href="${esc(pageHref)}">Every line, every leader, and the watch-floor
     cross-check &rarr;</a></p>
</section>`;
}

/**
 * One leader. The same markup on the homepage and on /leaders.html; `compact`
 * prints the latest line only, the full form prints all of them.
 *
 * The order inside a row is fixed and it is the scanning order the section was
 * built for: mark, name, org, then the headline, with the count on the right.
 * A reader checking this page twice a week is looking for one name, so the
 * name is never below the fold of its own row and never moves.
 */
export function row(leader, { compact = false, anchor = null } = {}) {
  const onRecord = leader.state === 'on_record';
  const lines = compact
    ? (leader.latest ? [leader.latest] : [])
    : leader.lines;

  // The row carries its own id in the full form, so /leaders.html#lw-altman is
  // a permalink to one person. docs/VISITORS.md 2 F asks for exactly this — "a
  // per-pillar permalink they can send" — and a policy staffer forwarding one
  // name is the same request with a different noun.
  const rest = compact && leader.count > 1
    ? `<p class="lw__rest">${anchor
        ? `<a href="${esc(anchor)}#lw-${esc(leader.id)}">${esc(leader.count - 1)} more line${leader.count - 1 === 1 ? '' : 's'} this week &rarr;</a>`
        : `${esc(leader.count - 1)} more line${leader.count - 1 === 1 ? '' : 's'} this week`}</p>`
    : '';

  const body = onRecord
    ? `<ol class="lw__ll">${lines.map(lineItem).join('')}</ol>${rest}`
    // The empty state is a sentence, not a dash. A dash in a cell is what a
    // missing value looks like; this is a measured absence and it says so.
    : `<p class="lw__none">Nothing on the record this week.</p>`;

  return `<li class="lw__r"${compact ? '' : ` id="lw-${esc(leader.id)}"`} data-state="${esc(leader.state)}" data-org="${esc(leader.org_id)}">
  <span class="lwm" data-state="${esc(leader.state)}" aria-hidden="true">${esc(leader.initials)}</span>
  <div class="lw__who">
    <b class="lw__n">${esc(leader.name)}</b>
    <span class="lw__o">${esc(leader.role)} · ${esc(leader.org)}</span>
  </div>
  <p class="lw__c">
    <b class="lw__cn num">${esc(leader.count)}</b>
    <span class="lw__cs">${onRecord ? 'on the record' : 'no line'}</span>
    <span class="vh">${esc(leader.count)} line${leader.count === 1 ? '' : 's'} in this window</span>
  </p>
  <div class="lw__body">${body}${floorNote(leader)}</div>
</li>`;
}

/**
 * One published line: stamp, cue, source, then the headline verbatim.
 *
 * The cue is printed rather than hidden because it is the reason the line is
 * on the wire at all, and because the four cue classes are NOT the same
 * evidence. A `document` cue means a letter or a memo named the person — it
 * may be by them or about them, and only the headline can tell you, which is
 * exactly why the headline is printed in full underneath it.
 */
export function lineItem(l) {
  const corr = l.corroboration > 1
    ? `<span class="lw__x" title="${esc(l.also_sources.join(', '))}">` +
      `<span aria-hidden="true">&times;${esc(l.corroboration)}</span>` +
      `<span class="vh">carried by ${esc(l.corroboration)} independent sources</span></span>`
    : '';

  return `<li class="lw__li">
  <p class="lw__meta">
    <time class="lw__t num" datetime="${esc(l.published_at)}" title="${esc(utc(l.published_at))}">${esc(stamp(l.published_at))}</time>
    <span class="lw__cue" data-class="${esc(l.cue_class)}">${esc(l.cue)}<span class="vh"> — ${esc(l.cue_class)} cue</span></span>
    <span class="lw__src">${esc(l.source)}</span>
    ${corr}
  </p>
  <p class="lw__q"><a class="lw__a" href="${esc(l.url)}" rel="noopener nofollow">${esc(l.headline)}</a></p>
</li>`;
}

/**
 * The watch-floor reconciliation, where there is one to print.
 *
 * docs/RACE.md's loudness column is empty for seven of eight principals —
 * darioamodei.com serves no feed, the rest post where we may not fetch — and
 * racePage.mjs prints that as the finding it is. Where this wire has lines for
 * one of those people, the two readings look like a contradiction and are not:
 * the floor measures feeds, the wire measures the press. So the row says which
 * is which and names the outlet the line actually came from, which is the
 * brief's §3 requirement and also the only version of this that survives
 * somebody opening both pages at once.
 *
 * Only `wire_fills_gap` prints here. The other three verdicts are true but
 * unremarkable, and a note on every one of fifteen rows is a note nobody
 * reads; /leaders.html prints all four in its cross-check section.
 */
function floorNote(leader) {
  const wf = leader.watch_floor;
  if (!wf || wf.verdict !== 'wire_fills_gap') return '';
  const state = String(wf.state || '').replace(/_/g, ' ');
  const from = leader.sources.join(', ');
  return `<p class="lw__wf" title="${esc(wf.reason || wf.note)}">
    <span class="lw__wfk">WATCH FLOOR</span>
    <span>${esc(state)}${wf.feed ? ` · ${esc(wf.feed)}` : ''} — the line came from ${esc(from)} instead.</span>
  </p>`;
}

/** UTC day and clock. Never relative: these pages are static and cached. */
function stamp(iso) {
  return `${String(iso).slice(5, 10)} ${utcClock(iso)}Z`;
}

/**
 * The key. Four sentences, and each one exists because a reader would
 * otherwise have to guess at something that is not guessable from the rows.
 */
export function legend(wire) {
  const ext = wire.cues && wire.cues.extended ? wire.cues.extended.length : 0;
  return `<p class="lw__key">A line is a headline that <b>names one of these fifteen people</b> and
     <b>carries a speech cue</b> — said, told, interview, keynote, letter, or words in quotation
     marks. The cue is printed on every line, and its class matters: a <b>document</b> cue means a
     letter or a memo named the person, which may be by them or about them.
     <b>NO LINE</b> means no headline in this ${esc(wire.corpus.items)}-item corpus named that
     person beside a cue. It is not a claim that the person said nothing${ext ? `, and the matching
     vocabulary — including the ${esc(ext)} near-synonyms added beyond the published list — is in
     the data file` : ''}.</p>`;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

// Scoped under .lw* and .lwm, inlined in the fragment the way news.mjs inlines
// its own: the feature can be added to or removed from a page without touching
// site/styles.mjs, which another module owns. Every value is an existing design
// token. NO NEW COLOURS — not even an org hue. Fifteen people over eight lab
// hues would have had to repeat one, and a repeated hue beside a name reads as
// a claim that two people are the same thing.
const wireCss = `
.lw { margin: var(--sec) 0 0; }
.lw__hd { display: flex; align-items: baseline; justify-content: space-between; gap: 0 var(--s-3); flex-wrap: wrap; }
.lw__k {
  margin: 0; font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-faint);
}
.lw__lede { margin: var(--s-2) 0 var(--s-3); }
.lw__lede b { font-weight: 600; color: var(--ink); }
.lw__key {
  font-family: var(--mono); font-size: var(--t-xs); line-height: 1.65; color: var(--ink-faint);
  margin: 0 0 var(--row);
}
.lw__key b { color: var(--ink-dim); font-weight: 500; }

.lw__l { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }

/* 375px first: mark | name+org | count, then the lines span the full width
   underneath. The headline never shares a row with the name — at 375px a
   two-column headline is four words per line and nine lines tall. */
.lw__r {
  display: grid; grid-template-columns: 26px minmax(0, 1fr) auto;
  gap: 2px var(--s-2); align-items: baseline;
  padding: var(--s-3) 2px var(--s-3) 0; border-bottom: 1px solid var(--rule);
}
.lw__r:hover { background: var(--bg-raised); }

/* The mark. A two-letter monogram in neutral ink — not a face, not a
   caricature, not a fetched avatar. site/templates/_avatars.mjs argues that
   case at length for the eight principals it draws; this roster is fifteen and
   that module owns its own shapes, so the wire uses the plainest possible form
   and leans on the name printed immediately beside it. You are never asked to
   recognise a shape. */
.lwm {
  grid-column: 1; grid-row: 1 / span 2; align-self: start;
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: var(--radius);
  border: 1px solid var(--rule); background: var(--bg-raised);
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.04em;
  color: var(--ink-dim);
}
/* Dotted, and one step fainter, for a person with nothing on the wire. The
   WORD "no line" in the row is what carries the state; this is confirmation. */
.lwm[data-state="no_line"] { border-style: dashed; color: var(--ink-faint); background: none; }

.lw__who { grid-column: 2; grid-row: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--s-2); }
.lw__n { font-size: var(--t-sm); font-weight: 600; color: var(--ink); }
.lw__o { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); letter-spacing: 0.04em; }

.lw__c { grid-column: 3; grid-row: 1; margin: 0; display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
.lw__cn { font-family: var(--mono); font-size: var(--t-sm); font-weight: 700; color: var(--ink); }
.lw__cs { font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.lw__r[data-state="no_line"] .lw__cn { color: var(--ink-faint); font-weight: 400; }

.lw__body { grid-column: 2 / -1; grid-row: 2; min-width: 0; }
.lw__ll { list-style: none; margin: 0; padding: 0; }
.lw__li + .lw__li { margin-top: var(--s-2); padding-top: var(--s-2); border-top: 1px dotted var(--rule-soft); }

.lw__meta { margin: 3px 0 2px; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
.lw__t { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim); white-space: nowrap; }
.lw__cue {
  font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim);
  border: 1px solid var(--rule); border-radius: 2px; padding: 0 4px; white-space: nowrap;
}
/* The four cue classes differ in WEIGHT and BORDER, not in hue: a quote is the
   strongest evidence and a document the most ambiguous, and that ordering has
   to survive a greyscale repost. */
.lw__cue[data-class="quote"] { border-color: var(--ink-faint); color: var(--ink); }
.lw__cue[data-class="document"] { border-style: dashed; }
.lw__src {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; max-width: 18ch; white-space: nowrap;
}
.lw__x { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim); }

/* The headline. Full text, always. overflow-wrap is the only concession: a
   250-character Techmeme headline has to wrap somewhere, and it wraps rather
   than being cut. */
.lw__q { margin: 0; font-size: var(--t-sm); line-height: 1.45; color: var(--ink); overflow-wrap: anywhere; }
.lw__a { text-decoration: none; color: inherit; border-bottom: 1px solid var(--rule); }
.lw__a:hover { border-bottom-color: var(--accent); color: var(--accent); }
.lw__rest { margin: var(--s-2) 0 0; font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); }
.lw__rest a { color: var(--ink-dim); text-decoration: none; border-bottom: 1px solid var(--rule); }
.lw__rest a:hover { color: var(--accent); border-bottom-color: var(--accent); }
/* An anchored row has to clear the sticky rail, or #lw-altman lands under it. */
.lw__r[id] { scroll-margin-top: calc(var(--rail-h) + var(--s-5)); }
.lw__none { margin: 3px 0 0; font-size: var(--t-sm); color: var(--ink-faint); }

.lw__wf {
  margin: var(--s-2) 0 0; display: flex; flex-wrap: wrap; gap: 0 6px; align-items: baseline;
  font-family: var(--mono); font-size: var(--t-2xs); line-height: 1.6; color: var(--ink-faint);
}
.lw__wfk { letter-spacing: 0.12em; color: var(--ink-dim); border-left: 2px solid var(--rule); padding-left: 6px; }

.lw__more { margin: var(--row) 0 0; font-family: var(--mono); font-size: var(--t-xs); }
.lw__more a { color: var(--ink-dim); text-decoration: none; border-bottom: 1px solid var(--rule); }
.lw__more a:hover { color: var(--ink); border-bottom-color: var(--accent); }

/* Wider: the name column gets its own track so fifteen rows read as a table
   rather than as fifteen stacked cards, and the headline moves up beside it. */
@media (min-width: 720px) {
  .lw__r { grid-template-columns: 26px 16ch minmax(0, 1fr) auto; column-gap: var(--s-3); }
  .lw__who { grid-column: 2; grid-row: 1 / span 2; flex-direction: column; gap: 1px; align-self: start; }
  .lw__body { grid-column: 3; grid-row: 1 / span 2; }
  .lw__c { grid-column: 4; grid-row: 1; }
  .lw__meta { margin-top: 0; }
}

/* Motion is one rule and it moves the mark, never the text. A row that fades
   in from opacity 0 is a blank row in a screenshot taken in the first 300ms,
   and screenshots are the growth loop (MOTION.md rule 0). */
@media (prefers-reduced-motion: no-preference) {
  .lwm { transition: border-color 140ms ease-out, color 140ms ease-out; }
  .lw__r:hover .lwm { border-color: var(--accent); color: var(--ink); }
}
`;

/** All CSS the wire needs. Safe to inline more than once. */
export function wireStyles() {
  return wireCss;
}

/** Everything the markup needs before its first tag. */
export function styleTag() {
  return `<style>${wireCss}</style>`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  read data/leaders.json (tolerate ENOENT -> ctx.leaders = null)
//               and put the parsed object on ctx as ctx.leaders.
//   index.mjs:  import * as leaderwire from './_leaderwire.mjs';
//               ...and drop `${leaderwire.render(ctx)}` into main. It belongs
//               directly after the news feed: the feed answers "what moved",
//               this answers "who said something about it", and that is the
//               order a reader asks them in.
//
// render(ctx) returns '' when ctx.leaders is absent, so wiring the call before
// the collector ships leaders.json is safe and changes nothing.
// ---------------------------------------------------------------------------
