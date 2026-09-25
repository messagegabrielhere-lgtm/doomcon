// The DEVELOPING strip: one event, carried right now by three or more
// independent newsrooms, that the severity table calls an incident.
//
// WHAT IT IS NOT, because this is the whole design problem.
//
// DOOMCON's level is observed activity tempo measured against a FROZEN
// reference distribution (docs/CONTRACT.md, "Index maths"). A breaking story is
// not a level change. It is one event, inside one 200-item window, counted by a
// layer that does not feed the index at all — data/news.json and data/state.json
// are separate files produced by separate collectors.
//
// A red bar at the top of the page saying "DEVELOPING" next to a level numeral
// is, to every reader who does not already know the architecture, a claim that
// the level moved. docs/VOICE.md §1 records what that costs: the WHO's Phase 6
// measured geographic spread and was read as severity, and by the 2013 revision
// the numbered phases were gone. DoomBench pays the same tax today with an FAQ
// explaining that its 67.8 is not a probability — an FAQ that exists because
// the denial was not on the surface where the number was.
//
// So the denial is on the surface where the number is. It is not a footnote, it
// is not a tooltip, it is a full sentence in the strip's own header, and it is
// printed whether or not anyone reads it. Everything else here is subordinate
// to that sentence.
//
// The strip is also, deliberately, NOT a second headline scalar. It carries no
// number on a 0–100 scale, no level, no band, no arrow. It carries a headline,
// its siblings, a source count and the words that fired — all of which are
// facts about publishing, not about the index.
//
// Built to the same two rules as news.mjs and _whatchanged.mjs:
//   1. Every value is in the static HTML. No fetch, no hydration, no script,
//      so a pre-hydration screenshot shows the real strip (docs/TEARDOWN.md 3.3).
//   2. Never colour alone. The state is carried by the word DEVELOPING, a glyph
//      and the source count; the accent rail is decoration on top of all three.
//
// Exports render(ctx) and returns '' whenever there is no qualifying story —
// which is most builds, and is the correct output. An empty strip that says
// "nothing developing" would be a claim we do not need to make; the newsroom
// below it already shows what there is.

import { esc, utc, utcClock } from './_html.mjs';

// The three gates. All three must hold, and they are published on the strip.
export const DEVELOPING = Object.freeze({
  // Measured against the newest item in the story, not the oldest: a story
  // whose last report landed two days ago is not developing, whatever its first
  // report's timestamp says.
  MAX_AGE_HOURS: 48,
  MIN_SOURCES: 3,
  MIN_SEVERITY: 0.6,
});

// Four siblings plus the lead is five headlines, which is about two thirds of a
// 375px viewport height. Beyond that the strip stops being a strip and starts
// competing with the hero it sits above.
const MAX_SIBLINGS = 4;
// Enough terms to show the evidence, few enough to stay on one line at 375px.
const MAX_TERMS = 5;

const TIER_NAME = { a: 'A', b: 'B', c: 'C' };

/**
 * The story this build would headline, or null.
 *
 * Selection is deterministic and stated: of the stories clearing all three
 * gates, the one with the most distinct sources, then the highest severity,
 * then the most recent last report, then the id. Never "the newest", because
 * the newest qualifying story is not necessarily the most corroborated one and
 * corroboration is the thing this layer exists to measure.
 */
export function pickStory(ctx) {
  const news = ctx && ctx.news;
  if (!news || !Array.isArray(news.stories) || !Array.isArray(news.items)) return null;

  const asOfMs = Date.parse(news.generated_at);
  if (!Number.isFinite(asOfMs)) return null;

  const byId = new Map(news.items.map((i) => [i.id, i]));

  const eligible = news.stories
    .map((s) => {
      const members = (s.members || []).map((id) => byId.get(id)).filter(Boolean);
      const lastMs = Date.parse(s.last_published_at);
      return { story: s, members, lastMs };
    })
    .filter(({ story, members, lastMs }) =>
      members.length >= 2 &&
      Number.isFinite(lastMs) &&
      (asOfMs - lastMs) <= DEVELOPING.MAX_AGE_HOURS * 3_600_000 &&
      Number(story.source_count) >= DEVELOPING.MIN_SOURCES &&
      Number(story.severity) >= DEVELOPING.MIN_SEVERITY)
    .sort((a, b) =>
      b.story.source_count - a.story.source_count ||
      b.story.severity - a.story.severity ||
      b.lastMs - a.lastMs ||
      a.story.id.localeCompare(b.story.id));

  return eligible.length ? eligible[0] : null;
}

/** Is there a developing story in this build's data? */
export function hasDeveloping(ctx) {
  return pickStory(ctx) !== null;
}

/**
 * The strip.
 *
 * @param {object} ctx build context; needs ctx.news (parsed data/news.json)
 *                     and ctx.href.
 * @returns {string} HTML fragment, or '' when nothing qualifies.
 */
export function render(ctx) {
  const picked = pickStory(ctx);
  if (!picked) return '';

  const { story, members } = picked;
  const byId = new Map(members.map((m) => [m.id, m]));

  // THE LEAD IS THE COLLECTOR'S CHOICE, not a second ranking invented here.
  // collector/news-stories.mjs already picks a lead — the highest-scoring member
  // once severity counts — and credits it with the coverage points. A template
  // that headlined a different item would put the strip and the score out of
  // step with no way for a reader to tell which one was wrong.
  const lead = byId.get(story.lead) || members[0];
  const siblings = members
    .filter((m) => m.id !== lead.id)
    .sort((a, b) => Date.parse(a.published_at) - Date.parse(b.published_at) || a.id.localeCompare(b.id))
    .slice(0, MAX_SIBLINGS);
  const hidden = members.length - 1 - siblings.length;

  const terms = (story.severity_terms || []).slice(0, MAX_TERMS);
  const moreTerms = (story.severity_terms || []).length - terms.length;

  const sources = (story.sources || []).join(', ');

  return `${styleTag()}
<section class="dv" aria-labelledby="dv-h">
  <div class="dv__head">
    <h2 class="dv__h" id="dv-h"><span class="dv__glyph" aria-hidden="true">◎</span> Developing</h2>
    <p class="dv__count">${esc(String(story.source_count))} independent source${story.source_count === 1 ? '' : 's'} &middot; first at <time datetime="${esc(story.first_published_at)}">${esc(utcClock(story.first_published_at))} UTC</time>, latest <time datetime="${esc(story.last_published_at)}">${esc(utcClock(story.last_published_at))} UTC</time></p>
  </div>

  <p class="dv__not"><b>This does not move the ${esc(levelWord(ctx))} level.</b> The index counts
  activity tempo against a frozen reference; one event, however many outlets
  carry it, is not a change in tempo, and nothing here is a claim about risk.</p>

  ${headline(ctx, lead, 'lead')}

  ${siblings.length ? `<ul class="dv__sibs">
${siblings.map((s) => `    <li class="dv__sib">${headlineBody(ctx, s)}</li>`).join('\n')}
  </ul>` : ''}
  ${hidden > 0 ? `<p class="dv__hidden">${esc(String(hidden))} further report${hidden === 1 ? '' : 's'} in this group, in the feed below.</p>` : ''}

  <details class="dv__forensics">
    <summary class="dv__sum">How this was grouped and scored</summary>
    <p class="dv__terms">
      <b>Terms that fired</b>
      ${terms.map((t) => `<span class="dv__term" data-tier="${esc(t.tier)}">${esc(t.term)}<span class="dv__termk"> ${esc(TIER_NAME[t.tier] || t.tier)}&middot;${esc(t.field)}</span></span>`).join('\n    ')}
      ${moreTerms > 0 ? `<span class="dv__term dv__term--rest">+${esc(String(moreTerms))} more</span>` : ''}
    </p>
    <p class="dv__rule">Grouped on ${esc(linkedWords(story))} &middot; severity ${esc(String(story.severity))} of 1 &middot; ${esc(sources)}</p>
  </details>
</section>`;
}

/** The lead headline, reproduced exactly as its publication printed it. */
function headline(ctx, item, kind) {
  return `<p class="dv__lead" data-kind="${esc(kind)}">${headlineBody(ctx, item)}</p>`;
}

/**
 * A headline and its source.
 *
 * THE TITLE IS NEVER REWRITTEN, SHORTENED OR PARAPHRASED. It is reproduced
 * character for character as the publication printed it, escaped and nothing
 * else — no ellipsis, no sentence case, no "AI agent breaches government" tidy-
 * up. A headline altered by us and attributed to them is a fabricated quotation,
 * and this project's entire claim is that a stranger can check every string on
 * the page against its source.
 */
function headlineBody(ctx, item) {
  const href = ctx.href(`/item/${itemSlug(item)}.html`);
  return `<a class="dv__t" href="${esc(href)}">${esc(item.title)}</a>` +
    `<span class="dv__meta">${esc(item.source)} &middot; <time datetime="${esc(item.published_at)}">${esc(utc(item.published_at))}</time></span>`;
}

// Mirrors itemPage.slugFor(). Duplicated rather than imported because
// site/templates/itemPage.mjs belongs to the page that owns those URLs, and a
// strip should not be able to break item-page routing by being loaded.
function itemSlug(item) {
  const base = String(item.title || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
  return `${base || 'item'}-${item.id}`;
}

/**
 * The words that linked the group, as a sentence.
 *
 * Printed, not summarised. A reader who disagrees with a cluster needs the
 * exact evidence that produced it, and "these items share the words australian,
 * government and openai" is an argument they can win.
 */
function linkedWords(story) {
  const words = [...new Set((story.links || []).flatMap((l) => l.words || []))].sort();
  if (!words.length) return 'rules recorded in data/news.json';
  const rules = [...new Set((story.links || []).map((l) => l.rule))].sort();
  return `${words.join(', ')} (${rules.join(', ')})`;
}

/** The level's own name, so the disclaimer names the thing it is denying. */
function levelWord(ctx) {
  const name = ctx && ctx.state && ctx.state.level_name;
  return typeof name === 'string' && name ? `DOOMCON ${ctx.state.level}` : 'DOOMCON';
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
//
// Namespaced under .dv*, shipped inside the fragment, so the module can be
// added to or removed from a page without touching the global sheet.
//
// NO RED. --dark-src exists and is the colour this strip would reach for, and
// reaching for it would undo the sentence in the header: a red bar above a
// level numeral is read as an alarm about the level no matter what the text
// says. The rail uses --accent, the same colour the rest of the site uses for
// "this is the thing you were looking for", and the tier chips are typographic.
const dvCss = `
.dv {
  margin: var(--s-4) 0 var(--s-5);
  padding: var(--s-3) 0 var(--s-3) var(--s-3);
  border-left: 3px solid var(--accent);
  background: var(--bg-raised);
}
.dv__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.dv__h {
  font-family: var(--mono); font-size: var(--t-xs); font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); margin: 0;
  display: inline-flex; align-items: center; gap: 6px;
}
.dv__glyph { color: var(--accent); }
.dv__count { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); margin: 0; }
.dv__count time { color: var(--ink-dim); }

/* The denial. Same type size as the headlines it qualifies, never smaller —
   a disclaimer set in 9px is a disclaimer designed not to be read — and the
   clause that does the work is the one in bold. */
.dv__not {
  margin: 7px 0 0; padding-right: var(--s-3);
  font-size: var(--t-sm); line-height: 1.5; color: var(--ink-dim);
  border-bottom: 1px dashed var(--rule-soft); padding-bottom: 8px;
}
.dv__not b { color: var(--ink); }

.dv__lead { margin: 8px 0 0; padding-right: var(--s-3); }
.dv__t { display: block; color: var(--ink); text-decoration: none; line-height: 1.3; }
.dv__lead .dv__t { font-size: var(--t-md); font-weight: 600; }
.dv__t:hover { text-decoration: underline; text-decoration-color: var(--accent); }
.dv__meta {
  display: block; margin-top: 2px;
  font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint);
}

.dv__sibs { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
.dv__sib {
  padding-left: 9px; padding-right: var(--s-3);
  border-left: 1px solid var(--rule);
}
.dv__sib .dv__t { font-size: var(--t-sm); color: var(--ink-dim); }
.dv__hidden { margin: 7px 0 0; font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); }

.dv__terms {
  margin: 10px 0 0; padding: 9px var(--s-3) 0 0;
  border-top: 1px dashed var(--rule-soft);
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px;
}
.dv__terms b {
  font-family: var(--mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint);
  margin-right: 3px;
}
.dv__term {
  font-family: var(--mono); font-size: 11px; color: var(--ink-dim);
  border: 1px solid var(--rule); border-radius: 2px; padding: 2px 5px;
}
/* The tier is a letter, not a hue. Greyscale, print and a screen reader all get
   the same three states. */
.dv__term[data-tier="a"] { border-left-width: 3px; border-left-color: var(--ink); color: var(--ink); }
.dv__term[data-tier="b"] { border-left-width: 2px; border-left-color: var(--ink-dim); }
.dv__term[data-tier="c"] { border-left-width: 1px; }
.dv__termk { color: var(--ink-faint); }
.dv__term--rest { border-style: dashed; color: var(--ink-faint); }

.dv__forensics { margin-top: 10px; }
.dv__sum {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink-faint); cursor: pointer; padding: 4px 0; list-style: none;
}
.dv__sum::-webkit-details-marker { display: none; }
.dv__sum::before { content: '▸ '; display: inline-block; transition: transform 120ms ease; }
.dv__forensics[open] .dv__sum::before { transform: rotate(90deg); }
.dv__sum:hover { color: var(--accent); }
.dv__rule {
  margin: 8px 0 0; padding-right: var(--s-3);
  font-family: var(--mono); font-size: var(--t-xs); line-height: 1.6; color: var(--ink-faint);
}

/* 375px, and this block is about ONE measurement.
   THIS STRIP SITS ABOVE THE HERO, so every pixel it takes is a pixel of the
   level numeral that leaves the fold. docs/VISITORS.md §2.A is unambiguous
   about the cost: the screenshot clicker is the largest cluster (16 of 100),
   has the shortest budget on the site (4–8 seconds), and "leaves if anything
   above the number is chrome".
   Measured at 375x812 with the live Australian story — four headlines, one of
   them a 180-character Techmeme line — the first draft came to 770px, which is
   95% of the viewport and buried the numeral completely. The rules below take
   it to 657px by tightening rhythm and dropping the lead headline to the body
   size, WITHOUT hiding a single headline, source, term or timestamp:
   nothing here is a display:none, because a strip that hides its evidence on
   a phone is a strip that cannot be audited by most of its readers. */
@media (max-width: 420px) {
  .dv { padding: var(--s-2) 0 var(--s-2) var(--s-2); }
  .dv__head { flex-direction: column; gap: 2px; }
  .dv__count { font-size: 10px; }
  .dv__lead .dv__t { font-size: var(--t-sm); font-weight: 700; }
  .dv__meta { font-size: 10px; }
  .dv__sib .dv__t { font-size: var(--t-xs); }
  .dv__rule { line-height: 1.5; }
}

/* One transition, on the rail only, and it names a real event: this strip was
   not on the page at the previous build. The headline itself is painted on
   frame one, because a screenshot taken at 200ms has to show it. */
@media (prefers-reduced-motion: no-preference) {
  .dv { animation: dcDvIn 500ms ease-out backwards; }
  @keyframes dcDvIn {
    from { border-left-color: var(--rule); background: transparent; }
    to   { border-left-color: var(--accent); background: var(--bg-raised); }
  }
}
`;

/** All CSS this module needs. Safe to inline more than once. */
export function developingCss() {
  return dvCss;
}

export function styleTag() {
  return `<style>${developingCss()}</style>`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  nothing. ctx.news is already the parsed data/news.json, and
//               this module reads ctx.news.stories, which collector/news.mjs
//               now writes into that same file. No new read, no new context key.
//
//   index.mjs:  import * as developing from './_developing.mjs';
//               ...and drop `${developing.render(ctx)}` into main, ABOVE the
//               hero. That placement is the brief and it is also the only
//               placement that works: the strip's entire job is to be read
//               before the level numeral, so that the sentence "this does not
//               move the level" arrives BEFORE the reader has seen a level to
//               attach it to. Placed below the hero it becomes a caption on a
//               number the reader has already interpreted.
//
// render(ctx) returns '' when ctx.news is absent, when the file predates the
// story pass, or when no story clears the three gates — which is most builds.
// Wiring the call before collector/news-stories.mjs has ever run is safe and
// changes nothing.
//
// MEASURED HEIGHT, because the integrator is the one who owns the fold.
// At 375x812 with the live four-report Australian story the strip is 657px —
// 81% of the viewport. That is the honest cost of showing four headlines and
// their evidence, and it means that on the builds where this strip exists the
// level numeral starts below the fold. docs/VISITORS.md §2.A says what that
// costs with the largest cluster on the site (16 of 100, a 4–8 second budget,
// "leaves if anything above the number is chrome"). Two ways out, both the
// integrator's call and neither taken here, because both trade against the
// brief: place the strip immediately BELOW the badge and above the gauge — the
// disclaimer still lands before the reader has finished with the number, and
// the numeral keeps the fold — or cut MAX_SIBLINGS to 2. What must not happen
// is buying the height back by hiding the disclaimer, the sources or the terms.
//
// If index.mjs is also wired to _whatchanged.mjs, the order down the page is:
//   developing (what is happening now, and what it is not)
//   hero       (the level)
//   freshness
//   whatChanged (what moved since the last observation)
//   news
// ---------------------------------------------------------------------------
