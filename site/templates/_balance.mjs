// THE BALANCE — a homepage module, and the drawing /balance.html reuses.
//
// ---------------------------------------------------------------------------
// WHAT THE OPERATOR ASKED FOR, AND WHAT THIS DRAWS INSTEAD
// ---------------------------------------------------------------------------
//
// The brief was "an alternative viewpoint where AI solves world problems and
// creates utopia", and "the balance of evil and good". docs/BALANCE.md §1 takes
// that seriously by refusing the two words that would make it dishonest. The
// page does not measure a utopia, and a pair of pans is the standard image of a
// final judgement, which site/brand.mjs NOT_CLAIMS[2] rules out. So the two
// sides are named by what they are — benefit and harm — and the operator's
// words survive only as the house names of the two registers ("the utopia
// case", "the doom case"), which describe an argument and never an outcome
// (docs/WORDING.md rule 3).
//
// ---------------------------------------------------------------------------
// WHAT THE BEAM IS ALLOWED TO TILT ON — ONE THING
// ---------------------------------------------------------------------------
//
// A drawn scale is read as a weighing whatever its caption says (Ziemkiewicz
// and Kosara, docs/BALANCE.md §3 point 4), so what it weighs is fixed here, in
// code, not in the caption. It tilts on exactly one pair of like-for-like
// counts: distinct stories in ONE newsroom window that matched the harm list
// only, against those that matched the benefit list only, made by one rule in
// one pass (collector/balance.mjs). Stories on both lists sit at the fulcrum;
// stories on neither are printed under the stand every time, so two pans
// never pose as the whole newsroom.
//
// It never tilts on the counters, the registers, DOOMCON against BLISS, item
// scores or anything a model judged. The registers under the drawing are
// picked by strength of evidence and printed as words; they move nothing.
//
// THE RULE is the collector's, read from balance.json's beam_rule.constants
// rather than typed here, and restated in tilt() so a synthetic input can be
// drawn through the same path the real one takes. The harness checks the
// recomputed angle against the collector's own beam.angle_deg on every run.
// A rule missing from the file draws the beam level and says why: a default
// typed into a template would be a second instrument nobody published.
//
// The angle is a drawing instruction, not a figure (docs/BALANCE.md §4). It
// rides in a data attribute for the harness and is never printed as text:
// printing it would be printing a function of the ratio this page refuses to
// print.
//
// ---------------------------------------------------------------------------
// INK, AND THE TWO SIDE HUES
// ---------------------------------------------------------------------------
//
// The beam, the stand and both pans are one ink, and the heavier pan never
// changes colour: a scale that reddened on the side it tipped towards would
// be a verdict in CSS. The two side hues exist to tie a pan to its list and
// its register column across the page, and they are the FOURTH carrier of the
// side, behind position (benefit always left, harm always right), the words
// ("benefit language", "harm language") and the column headings. Desaturate
// the page and no fact is lost. Values and measured contrast are in balanceCss().
//
// ---------------------------------------------------------------------------
// DETERMINISM
// ---------------------------------------------------------------------------
//
// Pure. No clock, no Math.random, no locale formatting, no iteration over
// object keys in a render path. SVG ids are an FNV-1a hash of the drawing's
// own content plus the caller's id. Two builds from the same files produce
// byte-identical markup. No script: the drawing is complete in the served
// HTML, and the tilt is baked in and never animated (docs/MOTION.md Rule 0).
//
// Exports render(ctx, opts) and styleTag(), following _claims.mjs, so the
// integrator can place it blind. See the integration note at the bottom.

import { esc, utc } from './_html.mjs';

const PAGE_HREF = '/balance.html';
const MINUS = '−';

/** build.mjs / index.mjs guard. The same predicate balancePage.mjs exports. */
export function hasBalance(ctx) {
  return Boolean(ctx && ctx.balance && ctx.ledger
    && Array.isArray(ctx.ledger.benefit) && Array.isArray(ctx.ledger.harm));
}

// Left, then right. Fixed everywhere on both surfaces: the drawing, the two
// newsroom lists, the registers and the counters, so position alone says which
// side a thing is on.
export const SIDES = Object.freeze(['benefit', 'harm']);

/** The word each pan carries. A count of words, so the word says so. */
export const SIDE_WORD = Object.freeze({ benefit: 'benefit language', harm: 'harm language' });

/**
 * Strongest EVIDENCE first, per side, for the short lines under the drawing.
 * The order is the ledger's own glosses read top to bottom: an output a
 * stranger can check outranks a deployment by the operator's report, which
 * outranks a trial, which outranks a study; an official finding outranks a
 * dataset count, which outranks an allegation. It ranks rows within a side and
 * never across the two (ledger honesty: "No status on one side ranks a row
 * against any row on the other"). `claimed` is absent on purpose: the ledger
 * says a claimed row is "never counted as a benefit", so it is never picked.
 * A row whose status is not listed here is not picked rather than guessed at.
 */
export const STRENGTH = Object.freeze({
  benefit: Object.freeze(['delivered', 'in-use', 'in-trial', 'demonstrated']),
  harm: Object.freeze(['documented', 'measured', 'alleged']),
});
const CONFIDENCE = Object.freeze(['verified', 'probable']);

// ---------------------------------------------------------------------------
// Formatting. Longhand, so a thousands separator never depends on the ICU the
// container was built with.
// ---------------------------------------------------------------------------

function group(intText) {
  return intText.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A whole count, or null when the value is not one. Callers print the words. */
function N(v) {
  if (!Number.isFinite(v)) return null;
  const body = group(String(Math.round(Math.abs(v))));
  return v < 0 ? `${MINUS}${body}` : body;
}

const isCount = (v) => Number.isInteger(v) && v >= 0;

/** Two decimals, -0 closed, for SVG coordinates. */
function n2(v) {
  const s = (Math.round(v * 100) / 100).toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

function hrefOf(ctx, path) {
  return ctx && typeof ctx.href === 'function' ? ctx.href(path) : path;
}

/** FNV-1a, 32-bit, hex. Ids from content, never from a counter or a clock. */
function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/**
 * The beam rule's constants, read from balance.json. Null when the file does
 * not publish all three as finite numbers — the caller draws the beam level
 * and says the rule is missing, never a default.
 */
export function ruleOf(balance) {
  const k = balance && balance.beam_rule && balance.beam_rule.constants;
  if (!k) return null;
  const maxDeg = Number(k.max_deg);
  const deadband = Number(k.deadband);
  const minTagged = Number(k.min_tagged);
  if (![maxDeg, deadband, minTagged].every(Number.isFinite) || maxDeg <= 0 || deadband < 0 || minTagged < 0) return null;
  return { maxDeg, deadband, minTagged };
}

/**
 * H harm-only stories, B benefit-only stories -> the drawn tilt.
 *
 * collector/balance.mjs beamFor(), restated clause for clause and in the same
 * order: too few tagged first, then the deadband, then the proportional tilt
 * clamped to the maximum, rounded to two places. The level reasons are the
 * collector's own sentences, so the caption and balance.json cannot word the
 * same state two ways.
 */
export function tilt(H, B, rule) {
  const flat = (reason) => ({ level: true, levelReason: reason, sinks: null, angle: 0 });
  if (!rule) return flat('the beam rule is not in this build’s balance.json');
  if (!isCount(H) || !isCount(B)) return flat('there is no newsroom count to tilt on');
  if (H + B < rule.minTagged) return flat(`fewer than ${rule.minTagged} stories matched one list only`);
  if (Math.abs(H - B) <= rule.deadband) return flat(`the two counts are within ${rule.deadband} of each other`);
  const a = Math.min(rule.maxDeg, (rule.maxDeg * Math.abs(H - B)) / (H + B));
  return { level: false, levelReason: null, sinks: H > B ? 'harm' : 'benefit', angle: Math.round(a * 100) / 100 };
}

/**
 * The drawing's whole input. `counts` null means the newsroom is dark: the
 * beam is level, dashed, and carries no number. Exported so a harness can draw
 * a synthetic pair through the exact path the real data takes.
 */
export function beamModel(counts, rule) {
  if (!counts) {
    return {
      state: 'dark', harm: null, benefit: null, both: null, neither: null, scanned: null,
      rule, level: true, levelReason: 'the newsroom window is dark this build', sinks: null, angle: 0,
    };
  }
  const t = tilt(counts.harm, counts.benefit, rule);
  return {
    state: 'live',
    harm: isCount(counts.harm) ? counts.harm : null,
    benefit: isCount(counts.benefit) ? counts.benefit : null,
    both: isCount(counts.both) ? counts.both : null,
    neither: isCount(counts.neither) ? counts.neither : null,
    scanned: isCount(counts.scanned) ? counts.scanned : null,
    rule,
    ...t,
  };
}

/** Rows of one register, strongest evidence first, at most n. Ties keep register order. */
export function strongest(rows, side, n) {
  const order = STRENGTH[side] || [];
  return (Array.isArray(rows) ? rows : [])
    .map((r, i) => ({ r, i, s: order.indexOf(r && r.status), c: CONFIDENCE.indexOf(r && r.confidence) }))
    .filter((x) => x.r && x.s >= 0 && x.c >= 0 && typeof x.r.title === 'string' && typeof x.r.id === 'string')
    .sort((a, b) => a.s - b.s || a.c - b.c || a.i - b.i)
    .slice(0, n)
    .map((x) => x.r);
}

/**
 * Everything both surfaces print, read from ctx.balance and ctx.ledger and
 * nothing else. Null when hasBalance() is false.
 */
export function model(ctx, { picks = 3 } = {}) {
  if (!hasBalance(ctx)) return null;
  const b = ctx.balance;
  const L = ctx.ledger;
  const nr = b.newsroom && typeof b.newsroom === 'object' ? b.newsroom : null;
  const beam = nr && nr.beam && typeof nr.beam === 'object' ? nr.beam : null;
  const rule = ruleOf(b);
  const live = Boolean(nr && nr.state === 'live' && beam && beam.state === 'live'
    && isCount(beam.harm) && isCount(beam.benefit));
  const m = beamModel(live
    ? { harm: beam.harm, benefit: beam.benefit, both: beam.both, neither: beam.neither, scanned: beam.scanned }
    : null, rule);
  const br = b.beam_rule && typeof b.beam_rule === 'object' ? b.beam_rule : {};
  return {
    ...m,
    error: live ? null : String((nr && nr.error) || (nr ? 'the newsroom block carries no beam' : 'balance.json carries no newsroom block')),
    // The collector's own angle, kept only so the harness can hold the
    // restatement above to it. Never printed.
    publishedAngle: beam && Number.isFinite(beam.angle_deg) ? beam.angle_deg : null,
    sentence: live && typeof nr.sentence === 'string' && nr.sentence ? nr.sentence : null,
    generatedAt: nr && typeof nr.generated_at === 'string' ? nr.generated_at : null,
    unit: beam && typeof beam.unit === 'string' ? beam.unit : 'distinct stories',
    ruleText: {
      angle: typeof br.angle === 'string' ? br.angle : null,
      level: typeof br.level_when === 'string' ? br.level_when : null,
    },
    picks: {
      benefit: strongest(L.benefit, 'benefit', picks),
      harm: strongest(L.harm, 'harm', picks),
    },
    ledger: {
      asOf: typeof L.as_of_date === 'string' ? L.as_of_date : null,
      rows: { benefit: L.benefit.length, harm: L.harm.length },
    },
    counters: b.counters && Number.isFinite(b.counters.live)
      ? { live: b.counters.live, dark: Number.isFinite(b.counters.dark) ? b.counters.dark : null }
      : null,
  };
}

// ---------------------------------------------------------------------------
// The drawing
// ---------------------------------------------------------------------------

// Two geometries, never one stretched (site/templates/_charts.mjs rule 3).
// `module` is sized so a 375px phone shows it at ~0.9x and its smallest label
// stays at ~12px, the site's floor; `page` is the large one for /balance and
// is swapped for `module` below 700px by the page's own CSS. Every vertical
// figure below is checked against the maximum tilt: at the file's 8 degrees
// the low pan drops L·sin(8°) — 17.4 units here, 28.5 on the page — and its
// word still clears the stand's foot and the neither line. The module is 200
// units tall because the homepage gives the whole section about 320px at
// 1280 wide; the numeral is 28 so two digits clear the pan's strings.
const GEOM = Object.freeze({
  module: Object.freeze({
    W: 380, H: 200, cx: 190, py: 44, L: 125, S: 60, rim: 42, bowl: 20,
    num: 28, num3: 22, lab: 14, small: 13.5, foot: 170, labGap: 17,
  }),
  page: Object.freeze({
    W: 620, H: 310, cx: 310, py: 64, L: 205, S: 92, rim: 66, bowl: 30,
    num: 46, num3: 36, lab: 17, small: 16, foot: 262, labGap: 25,
  }),
});

/** Plain-English rule, from the constants the file published. */
export function ruleSentence(rule) {
  if (!rule) return 'The rule that tilts the beam is not in this build’s data, so the beam is drawn level.';
  return `The beam tilts on one thing: stories that matched one list and not the other, in this window. `
    + `Tilt = ${rule.maxDeg}° × |H ${MINUS} B| ÷ (H + B), heavier pan down, never past ${rule.maxDeg}°; `
    + `level when the two are within ${rule.deadband} of each other or fewer than ${rule.minTagged} matched.`;
}

function describe(m) {
  if (m.state !== 'live') {
    return 'The newsroom window is dark this build. The beam is drawn level and no count is printed on either pan.';
  }
  const h = N(m.harm);
  const b = N(m.benefit);
  const lead = `${h} ${m.harm === 1 ? 'story' : 'stories'} matched the harm list only and ${b} the benefit list only.`;
  const pose = m.level
    ? `The beam is drawn level: ${m.levelReason}.`
    : `The ${m.sinks} pan hangs lower${m.rule && m.angle >= m.rule.maxDeg ? ', at the rule’s full tilt' : ''}.`;
  const both = m.both === null ? 'The count on both lists is not in the file.' : `${N(m.both)} matched both lists and sit at the fulcrum.`;
  const nei = m.neither === null ? 'The count on neither list is not in the file.' : `${N(m.neither)} matched neither list.`;
  return `${lead} ${pose} ${both} ${nei}`;
}

/**
 * The balance, as a static SVG.
 *
 * @param {object} m      model(ctx), or beamModel(counts, rule) for a synthetic pair.
 * @param {object} [opts]
 * @param {'module'|'page'} [opts.size]  which geometry.
 * @param {string} [opts.id]             prefix for the title/desc ids, so two
 *                                       drawings on one page never collide.
 * @param {string} [opts.className]      extra classes on the <svg>.
 */
export function scaleSvg(m, { size = 'module', id = 'bal', className = '' } = {}) {
  const g = GEOM[size] || GEOM.module;
  const dark = m.state !== 'live';
  // Positive: the right (harm) end down. Negative: the left (benefit) end down.
  const signed = m.level || dark ? 0 : m.sinks === 'harm' ? m.angle : -m.angle;
  const phi = (signed * Math.PI) / 180;
  const dx = g.L * Math.cos(phi);
  const dy = g.L * Math.sin(phi);
  const ends = {
    benefit: { x: g.cx - dx, y: g.py - dy },
    harm: { x: g.cx + dx, y: g.py + dy },
  };

  const desc = describe(m);
  const uid = `${id}-${fnv(`${size}|${signed}|${desc}`)}`;

  const pan = (side) => {
    const e = ends[side];
    const rimY = e.y + g.S;
    const count = m[side];
    const txt = dark ? 'dark' : count === null ? 'no count' : N(count);
    const big = !dark && count !== null;
    const fs = big ? (txt.length > 2 ? g.num3 : g.num) : g.small;
    return `<g class="bal__pan" data-side="${side}">`
      + `<path class="bal__str" d="M${n2(e.x)} ${n2(e.y)}L${n2(e.x - g.rim + 3)} ${n2(rimY)}M${n2(e.x)} ${n2(e.y)}L${n2(e.x + g.rim - 3)} ${n2(rimY)}"/>`
      + `<path class="bal__bowl" d="M${n2(e.x - g.rim)} ${n2(rimY)}Q${n2(e.x)} ${n2(rimY + 2 * g.bowl)} ${n2(e.x + g.rim)} ${n2(rimY)}Z"/>`
      + `<text class="${big ? 'bal__n' : 'bal__nx'}" x="${n2(e.x)}" y="${n2(rimY - 8)}" font-size="${fs}">${esc(txt)}</text>`
      + `<text class="bal__w" x="${n2(e.x)}" y="${n2(rimY + g.bowl + g.labGap)}" font-size="${g.lab}">${esc(SIDE_WORD[side])}</text>`
      + '</g>';
  };

  const bothTxt = dark ? 'no count on both lists'
    : m.both === null ? 'both lists: not in the file' : `${N(m.both)} on both lists`;
  const neiTxt = dark ? 'newsroom dark · nothing counted'
    : (m.neither === null ? 'neither list: not in the file' : `${N(m.neither)} on neither list`)
      + (m.scanned === null ? '' : ` · ${N(m.scanned)} stories scanned`);
  const foot = g.foot;

  return `<svg class="bal__svg bal__svg--${size}${className ? ` ${esc(className)}` : ''}" viewBox="0 0 ${g.W} ${g.H}" width="${g.W}" height="${g.H}"`
    + ` role="img" aria-labelledby="${uid}-t ${uid}-d" data-state="${dark ? 'dark' : 'live'}"`
    + ` data-sinks="${m.sinks || 'none'}" data-angle="${n2(signed)}" focusable="false">`
    + `<title id="${uid}-t">Newsroom stories in benefit language and in harm language, drawn as a balance</title>`
    + `<desc id="${uid}-d">${esc(desc)}</desc>`
    + `<text class="bal__both" x="${g.cx}" y="${n2(g.py - 26)}" font-size="${g.small}">${esc(bothTxt)}</text>`
    + `<path class="bal__post" d="M${g.cx} ${g.py}V${foot}"/>`
    + `<path class="bal__fulc" d="M${g.cx} ${g.py + 3}L${g.cx - 10} ${g.py + 21}H${g.cx + 10}Z"/>`
    + `<path class="bal__base" d="M${g.cx - 40} ${foot + 9}L${g.cx - 26} ${foot}H${g.cx + 26}L${g.cx + 40} ${foot + 9}Z"/>`
    + `<g class="bal__beam" transform="rotate(${n2(signed)} ${g.cx} ${g.py})">`
    + `<path d="M${g.cx - g.L} ${g.py}H${g.cx + g.L}"/></g>`
    + `<circle class="bal__piv" cx="${g.cx}" cy="${g.py}" r="4.5"/>`
    + SIDES.map(pan).join('')
    + `<text class="bal__nei" x="${g.cx}" y="${g.H - 8}" font-size="${g.small}">${esc(neiTxt)}</text>`
    + '</svg>';
}

/** The same rule in the fewest words, for the homepage, which has three lines for it. */
export function ruleShort(rule) {
  if (!rule) return 'The rule that tilts the beam is not in this build’s data, so it is drawn level.';
  return `Tilts only on stories in one list and not the other: ${rule.maxDeg}° × |H ${MINUS} B| ÷ (H + B), `
    + `heavier pan down, at most ${rule.maxDeg}°. Level within ${rule.deadband}, or under ${rule.minTagged} matched.`;
}

/**
 * The caption under the drawing: what it tilts on, and why it is level if it
 * is. `short` is the homepage form; the page prints the rule in full and the
 * reminder that the difference is never printed.
 */
export function captionHtml(m, { short = false } = {}) {
  const why = m.state !== 'live'
    ? ` Dark: ${esc(m.error || 'the newsroom window did not come back')}.`
    : m.level ? ` Level this window: ${esc(m.levelReason)}.` : '';
  if (short) return `${esc(ruleShort(m.rule))}${why}`;
  return `${esc(ruleSentence(m.rule))}${why} The difference is drawn, never printed as a number.`;
}

// ---------------------------------------------------------------------------
// The homepage module
// ---------------------------------------------------------------------------

function pickList(ctx, rows) {
  if (!rows.length) return '<li class="bal__none">No row on this side carries a status this list ranks.</li>';
  return rows.map((r) => `<li><a href="${esc(hrefOf(ctx, PAGE_HREF))}#reg-${esc(r.id)}">${esc(r.title)}</a>`
    + ` <span class="bal__st">${esc(r.status)}</span></li>`).join('');
}

/**
 * The module.
 *
 * @param {object} ctx  build context; reads ctx.balance, ctx.ledger, ctx.href.
 * @param {object} [opts]
 * @param {string} [opts.heading]  the plain <h2> (docs/WORDING.md).
 * @param {number} [opts.picks]    register lines per side, 1 to 3. Two by
 *                                 default: measured at 1280 wide, three a side
 *                                 put the section at 392px against its ~320px
 *                                 budget, and two brought it inside it.
 * @returns {string} HTML fragment, or '' when there is nothing to draw from.
 */
export function render(ctx, { heading = 'Harm and benefit, side by side', picks = 2 } = {}) {
  const m = model(ctx, { picks: Math.max(1, Math.min(3, Number(picks) || 2)) });
  if (!m) return '';
  const sentence = m.sentence
    ? esc(m.sentence)
    : `The newsroom window is dark this build${m.error ? ` (${esc(m.error)})` : ''}, so no story is counted on either side.`;
  const rows = m.ledger.asOf ? ` as of ${esc(m.ledger.asOf)}` : '';
  const counters = m.counters ? `, ${N(m.counters.live)} live ${m.counters.live === 1 ? 'counter' : 'counters'}` : '';

  return `${styleTag()}
<section class="sec bal bal-t" id="balance" aria-labelledby="bal-h">
  <h2 class="sec__h" id="bal-h">${esc(heading)}<span class="sec__eb">Both at once</span></h2>
  <div class="bal__grid">
    <figure class="bal__fig">
      ${scaleSvg(m, { size: 'module', id: 'bal' })}
      <figcaption class="bal__cap">${captionHtml(m, { short: true })}</figcaption>
    </figure>
    <div class="bal__txt">
      <p class="bal__s">${sentence}</p>
      <div class="bal__cols">
        <div class="bal__col" data-side="benefit">
          <p class="bal__k">Benefit register<span class="bal__eb">The utopia case</span></p>
          <ul class="bal__l">${pickList(ctx, m.picks.benefit)}</ul>
        </div>
        <div class="bal__col" data-side="harm">
          <p class="bal__k">Harm register<span class="bal__eb">The doom case</span></p>
          <ul class="bal__l">${pickList(ctx, m.picks.harm)}</ul>
        </div>
      </div>
      <p class="bal__note">Strongest evidence first on each side. A status word describes the evidence, not the importance.</p>
      <p class="bal__more"><a class="bal__go" href="${esc(hrefOf(ctx, PAGE_HREF))}">See the whole balance →</a>
        <span>${N(m.ledger.rows.benefit)} benefit and ${N(m.ledger.rows.harm)} harm rows checked by hand${rows}${counters}. None of it is summed.</span></p>
    </div>
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
//
// Namespaced .bal*, shipped inside the fragment, so the module can be added
// or removed without touching site/styles.mjs. Every size is a step from that
// sheet's scale; every colour is a token from it except the two side hues,
// which are defined here and nowhere else.
const balCss = `
/* THE TWO SIDE HUES. Contrast measured with the WCAG formula against the
   three grounds of each scheme (bg : raised : sunken):
     dark   benefit #9fa6ff  8.73 : 8.16 : 8.89
            harm    #e39f7c  8.87 : 8.28 : 9.03
     light  benefit #4f4cc6  6.27 : 6.60 : 5.74
            harm    #96502c  5.73 : 6.03 : 5.25
   Every figure clears AA for body text. The two are matched in lightness
   (luminance ratio 1.02 dark, 1.09 light) so neither side reads as the louder
   one, and they sit on the blue to orange axis, the one red-green colour
   blindness keeps: OKLab distance 0.20 dark and 0.26 light, and 0.19 or more
   under simulated deuteranopia and protanopia (Machado 2009). Red and green
   are refused outright: they are the dark and live source states. The harm
   hue sits 0.106 from the amber accent in dark and 0.043 in light, which is
   close, so it is never spent on a number and never on the live reading. The
   washes are literal rgba so a highlight never depends on a colour function
   for its legibility. */
.bal-t {
  --bal-ben: #9fa6ff; --bal-harm: #e39f7c;
  --bal-ben-wash: rgba(159,166,255,0.17); --bal-harm-wash: rgba(227,159,124,0.17);
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) .bal-t {
    --bal-ben: #4f4cc6; --bal-harm: #96502c;
    --bal-ben-wash: rgba(79,76,198,0.10); --bal-harm-wash: rgba(150,80,44,0.11);
  }
}
:root[data-theme="light"] .bal-t {
  --bal-ben: #4f4cc6; --bal-harm: #96502c;
  --bal-ben-wash: rgba(79,76,198,0.10); --bal-harm-wash: rgba(150,80,44,0.11);
}
:root[data-theme="dark"] .bal-t {
  --bal-ben: #9fa6ff; --bal-harm: #e39f7c;
  --bal-ben-wash: rgba(159,166,255,0.17); --bal-harm-wash: rgba(227,159,124,0.17);
}
.bal-t [data-side="benefit"] { --bal-side: var(--bal-ben); --bal-wash: var(--bal-ben-wash); }
.bal-t [data-side="harm"] { --bal-side: var(--bal-harm); --bal-wash: var(--bal-harm-wash); }

/* ---- the drawing ------------------------------------------------------- */
/* Never upscaled: the width attribute is the natural size and max-width
   lets it shrink on a phone. One ink for the beam, the stand and both pans;
   only the two side words carry a hue. */
.bal__svg { display: block; max-width: 100%; height: auto; overflow: visible; }
.bal__svg text { text-anchor: middle; font-family: var(--sans); }
.bal__beam path { stroke: var(--ink); stroke-width: 4; stroke-linecap: round; fill: none; }
.bal__piv { fill: var(--bg); stroke: var(--ink); stroke-width: 2.5; }
.bal__post { stroke: var(--ink-dim); stroke-width: 3; fill: none; }
.bal__fulc, .bal__base { fill: var(--ink-dim); stroke: none; }
.bal__str { stroke: var(--ink-faint); stroke-width: 1.25; fill: none; }
.bal__bowl { fill: var(--wash); stroke: var(--ink-dim); stroke-width: 2; stroke-linejoin: round; }
.bal__svg .bal__n { font-family: var(--mono); font-weight: 700; fill: var(--ink); font-variant-numeric: tabular-nums; }
.bal__svg .bal__nx { font-family: var(--mono); font-weight: 600; fill: var(--ink-faint); letter-spacing: .06em; text-transform: uppercase; }
.bal__w { font-weight: 600; fill: var(--bal-side, var(--ink-dim)); }
.bal__both, .bal__nei { fill: var(--ink-dim); }
/* Dark: dashed, the grammar every dark source on the site already uses. */
.bal__svg[data-state="dark"] .bal__beam path,
.bal__svg[data-state="dark"] .bal__bowl,
.bal__svg[data-state="dark"] .bal__post { stroke-dasharray: 6 5; }

/* ---- the module -------------------------------------------------------- */
.bal__grid { display: grid; gap: var(--s-4); grid-template-columns: minmax(0, 1fr); align-items: start; }
.bal__fig { margin: 0; display: flex; flex-direction: column; gap: var(--s-2); min-width: 0; }
.bal__cap { font: 400 var(--t-2xs)/1.5 var(--sans); color: var(--ink-faint); max-width: 380px; }
.bal__txt { min-width: 0; display: flex; flex-direction: column; gap: var(--s-2); }
.bal__s { margin: 0; font: 400 var(--t-base)/1.5 var(--sans); color: var(--ink); max-width: 70ch; }
.bal__cols { display: grid; gap: var(--s-3); grid-template-columns: minmax(0, 1fr); }
.bal__col { border-top: 3px solid var(--bal-side); padding-top: var(--s-2); min-width: 0; }
.bal__k { margin: 0 0 var(--s-2); font: 600 var(--t-xs)/1.3 var(--mono); letter-spacing: .1em;
  text-transform: uppercase; color: var(--ink); }
.bal__eb { display: inline-block; margin-left: .7em; font: 500 var(--t-2xs)/1.2 var(--mono);
  letter-spacing: .12em; color: var(--bal-side); white-space: nowrap; }
.bal__l { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.bal__l li { font: 400 var(--t-sm)/1.4 var(--sans); color: var(--ink-dim); }
.bal__l a { color: var(--ink); text-decoration-color: var(--rule); }
.bal__l a:hover { text-decoration-color: var(--accent-2); }
.bal__st { font: 500 var(--t-2xs)/1 var(--mono); letter-spacing: .06em; color: var(--ink-faint);
  border: 1px solid var(--rule); border-radius: 3px; padding: 1px 5px; white-space: nowrap; }
.bal__none { color: var(--ink-faint); }
.bal__note { margin: 0; font: 400 var(--t-2xs)/1.5 var(--sans); color: var(--ink-faint); }
.bal__more { margin: 0; font: 400 var(--t-xs)/1.5 var(--sans); color: var(--ink-faint);
  display: flex; flex-wrap: wrap; gap: 4px var(--s-3); align-items: baseline; }
.bal__go { font: 600 var(--t-sm)/1.3 var(--sans); color: var(--ink); white-space: nowrap;
  text-decoration-color: var(--accent-2); text-underline-offset: 3px; }
.bal__go:hover { color: var(--accent-2); }

@media (min-width: 620px) {
  .bal__cols { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--s-4); }
}
/* Side by side from 900px, the drawing at its natural 380px. This is where
   the module holds to its height budget: about 300px at 1280 wide. */
@media (min-width: 900px) {
  .bal__grid { grid-template-columns: 380px minmax(0, 1fr); gap: var(--s-5); }
}
`;

/** All CSS the drawing and the module need. Safe to inline more than once. */
export function balanceCss() {
  return balCss;
}

/** Everything the markup needs before its first tag. */
export function styleTag() {
  return `<style>${balCss}</style>`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  read data/balance.json and data/ledger.json into ctx.balance
//               and ctx.ledger (parsed), and publish both verbatim at
//               /api/balance.json and /api/ledger.json, as /world does for
//               its files. Gate public/balance.html on
//               balancePage.hasBalancePage(ctx), which is hasBalance() above.
//
//   index.mjs:  import * as balance from './_balance.mjs';
//               ...and drop `${balance.render(ctx)}` into main below the claim
//               cards. It returns '' when either file is absent, so wiring the
//               call before the collector has run changes nothing.
//
// MEASURED HEIGHT, in Chrome with the webfonts loaded, 2026-09-28 data: 315px
// at 1280 wide in both schemes (drawing 200px plus a two-line caption on the
// left, the sentence, two register lines a side and the link on the right).
// Three lines a side measured 392px, which is why two is the default. At
// 375 it stacks to 863px, so it belongs below the fold, never in it.
// ---------------------------------------------------------------------------
