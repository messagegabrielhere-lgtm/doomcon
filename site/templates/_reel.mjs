// The reel, plus every piece of news-item derivation the feed and the archive
// both need. The leading underscore marks this as a non-page module (it does
// not export render()), matching _html.mjs and _parts.mjs.
//
// Two rules govern everything below.
//
// 1. NOTHING HERE RUNS IN A BROWSER. The reel is a CSS scroll-snap rail with
//    zero JavaScript, so "degrades when JS is off" is not a fallback path we
//    have to remember to test - there is no enhanced path to fall back from.
//    Touch, trackpad and keyboard all drive a scroll container natively.
//
// 2. NOTHING HERE ANIMATES TEXT. Every motion in this file moves a rule, a
//    background or a decorative pip. A headline that fades in from opacity 0
//    is a blank headline in a screenshot taken during the first 300ms, and
//    screenshots are the entire growth loop (TEARDOWN 3.3). Motion is for the
//    chrome; the words are painted on frame one.

import { esc, num, utc, utcDay, utcClock, duration, secondsBetween, slug } from './_html.mjs';
import * as brand from '../brand.mjs';

// Short codes so a pillar survives a 375px meta line that already carries a
// timestamp, an age and a source. Fixed, like the pillar ids themselves.
const PILLAR_CODE = {
  capability: 'CAP',
  compute: 'CMP',
  attention: 'ATN',
  governance: 'GOV',
  markets: 'MKT',
};

// A sigil per pillar. Colour is never the only signal on this site, and a tag
// that is only three letters in a different colour is still colour-plus-nothing
// at a glance. The shape is what you recognise in a greyscale screenshot.
// 13x13 viewBox, stroked with currentColor, no fills - they stay legible at
// 11px and inherit the pillar colour without a second declaration.
const SIGIL = {
  // rising staircase - capability going up and to the right
  capability: '<path d="M1.5 10.5h3v-3h3v-3h3v-3"/>',
  // a chip with pins
  compute: '<rect x="4" y="4" width="5" height="5"/><path d="M1.5 5.5h2.5M1.5 7.5h2.5M9 5.5h2.5M9 7.5h2.5M5.5 1.5V4M7.5 1.5V4M5.5 9v2.5M7.5 9v2.5"/>',
  // broadcast arcs
  attention: '<circle cx="6.5" cy="6.5" r="1.1"/><path d="M3.9 3.9a3.7 3.7 0 0 0 0 5.2M9.1 3.9a3.7 3.7 0 0 1 0 5.2M1.9 1.9a6.5 6.5 0 0 0 0 9.2M11.1 1.9a6.5 6.5 0 0 1 0 9.2"/>',
  // scales - the balance, not a gavel: this pillar counts rulemaking, not verdicts
  governance: '<path d="M6.5 2.2v8.6M2.5 10.8h8M2.5 3.4h8"/><path d="M4.2 3.4 2.6 6.6h3.2zM8.8 3.4 7.2 6.6h3.2z"/>',
  // two candlesticks
  markets: '<path d="M3.6 1.6v9.8M9.4 1.6v9.8"/><rect x="2.2" y="3.6" width="2.8" height="4"/><rect x="8" y="5.4" width="2.8" height="4"/>',
};

/**
 * The five sigils as one <symbol> sprite, emitted once per page.
 *
 * Inlining the path data into every tag cost 52 KB on a 200-row archive - a
 * quarter of the page, to draw the same five shapes 214 times. <use> with a
 * same-document fragment needs no script and no second request, so it is still
 * one file that renders correctly in a prerender and in a screenshot.
 * currentColor inside a <symbol> resolves against the referencing element, so
 * each tag still picks up its own pillar hue.
 */
export function pillarSprite() {
  const symbols = Object.entries(SIGIL).map(([id, d]) =>
    `<symbol id="dc-sig-${id}" viewBox="0 0 13 13">` +
    `<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${d}</g>` +
    `</symbol>`
  ).join('');
  return `<svg class="dcsprite" aria-hidden="true" focusable="false" width="0" height="0">${symbols}</svg>`;
}

/** Inline sigil for a pillar id. Decorative: the code beside it carries the name. */
export function pillarSigil(id) {
  if (!SIGIL[id]) throw new Error(`_reel: no sigil for pillar "${id}"`);
  return `<svg viewBox="0 0 13 13" aria-hidden="true" focusable="false"><use href="#dc-sig-${id}"/></svg>`;
}

/**
 * The pillar tag. data-pillar carries the colour token AND is the hook the
 * pure-CSS archive filter matches on, so the two can never drift apart.
 * The visible short code plus the sigil mean the tag reads without colour;
 * the full pillar name rides along for screen readers.
 */
export function pillarTag(id, { long = false } = {}) {
  const meta = brand.pillarMeta(id);
  const code = PILLAR_CODE[id];
  const text = long ? meta.name : code;
  return `<span class="ptag" data-pillar="${esc(id)}">${pillarSigil(id)}` +
    `<span aria-hidden="true">${esc(text)}</span>` +
    `<span class="vh">${esc(meta.name)} pillar</span></span>`;
}

export function pillarCode(id) {
  const code = PILLAR_CODE[id];
  if (!code) throw new Error(`_reel: no short code for pillar "${id}"`);
  return code;
}

// ---------------------------------------------------------------------------
// Reading data/news.json
// ---------------------------------------------------------------------------

// Only http(s) becomes an href. An item URL arrives from a feed we do not
// control; javascript: and data: are one bad upstream field away from being a
// stored XSS on a page whose whole selling point is that you can trust it.
function safeHref(url) {
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return /^https?:\/\//i.test(t) ? t : null;
}

function firstFinite(...vals) {
  for (const v of vals) if (Number.isFinite(v)) return v;
  return null;
}

/**
 * Corroboration: how many INDEPENDENT sources carried this item. The preferred
 * shape is item.meta.corroboration = { count, sources[] }; the fallbacks exist
 * because docs/NEWS.md did not exist when this was written and the collector
 * agent may have picked a different field name. Absent everything, an item is
 * carried by exactly the one source that is already named on the row - which is
 * 1, not "unknown". That is a count we can stand behind.
 */
export function corroborationOf(item) {
  const m = (item && item.meta) || {};
  const c = m.corroboration;

  let sources = [];
  if (Array.isArray(c && c.sources)) sources = c.sources;
  else if (Array.isArray(m.corroborating_sources)) sources = m.corroborating_sources;
  else if (Array.isArray(m.sources)) sources = m.sources;

  const count = firstFinite(
    c && c.count,
    Number.isFinite(c) ? c : null,
    m.corroboration_count,
    m.source_count,
    sources.length || null,
    item && item.corroboration,
  );

  const n = Math.max(1, Math.round(count ?? 1));
  return {
    count: n,
    sources: sources.filter((s) => typeof s === 'string'),
  };
}

// The scorer's own terms, in English.
const COMPONENT_LABEL = {
  source_weight: 'source weight',
  recency: 'recency',
  corroboration: 'corroboration',
  entities: 'named entities',
  engagement: 'engagement',
};
const COMPONENTS_SHOWN = 4;

/**
 * Why this item ranked where it did, in one line.
 *
 * Order of preference, and every one of them is arithmetic or a string the
 * collector wrote - never a sentence this template invented:
 *   1. meta.why / meta.reason      verbatim
 *   2. meta.drivers[]              joined
 *   3. meta.score_components       printed as the sum that produced the score
 *   4. rank + corroboration + pillar
 * The reel card has a slot labelled "why it scored highly". Filling that slot
 * with narrative we made up would be the exact failure this project exists in
 * reaction to, so every fallback states arithmetic and stops there.
 */
export function whyLine(item, total) {
  const m = (item && item.meta) || {};
  if (typeof m.why === 'string' && m.why.trim()) return m.why.trim();
  if (typeof m.reason === 'string' && m.reason.trim()) return m.reason.trim();
  if (Array.isArray(m.drivers) && m.drivers.length) {
    return m.drivers.filter((d) => typeof d === 'string' && d.trim()).join(' · ');
  }

  // collector/news.mjs emits meta.score_components in points. Those points ARE
  // the answer to "why did this score highly", so the card prints the addition
  // rather than a sentence about it.
  const comps = m.score_components;
  if (comps && typeof comps === 'object' && !Array.isArray(comps)) {
    const parts = Object.entries(comps)
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${COMPONENT_LABEL[k] || k.replace(/_/g, ' ')} ${num(v, 1)}`);
    if (parts.length) {
      const shown = parts.slice(0, COMPONENTS_SHOWN);
      const tail = parts.length > shown.length ? ' \u2026' : '';
      const head = Number.isFinite(item.score) ? `Score ${num(item.score, 1)} = ` : 'Scored on ';
      return `${head}${shown.join(' + ')}${tail}`;
    }
  }

  const bits = [];
  bits.push(Number.isFinite(total) && total > 0
    ? `Ranked ${item.rank} of ${total} in the window`
    : `Ranked ${item.rank} in the window`);
  if (item.corroboration.count > 1) {
    bits.push(`carried by ${item.corroboration.count} independent sources`);
  }
  bits.push(`${brand.pillarMeta(item.pillar).name} pillar`);
  return `${bits.join(' · ')}.`;
}

/** Age measured against the compile stamp, never against the reader's clock. */
function ageAt(iso, asOfIso) {
  let s = secondsBetween(asOfIso, iso);
  // Clock skew between a publisher's stamp and ours is not an error, and it is
  // certainly not a negative duration. Floor it.
  if (!Number.isFinite(s) || s < 0) s = 0;
  return { seconds: s, label: duration(s) };
}

/**
 * Liveness of the feed itself, in three named states. A pip that always says
 * LIVE is the pizzint "status: healthy" at a 12% scrape rate (TEARDOWN 3.1),
 * pointed at the news column instead of the index. The word is always printed
 * beside the pip so the state survives greyscale and screen readers.
 */
function livenessOf(newsIso, referenceIso) {
  const age = ageAt(newsIso, referenceIso);
  if (age.seconds <= 2 * 3600) return { status: 'live', word: 'LIVE', glyph: '●', age };
  if (age.seconds <= 12 * 3600) return { status: 'stale', word: 'STALE', glyph: '◐', age };
  return { status: 'cold', word: 'COLD', glyph: '○', age };
}

const FRESH_LIMIT_S = 90 * 60;   // an item this new gets the NEW tag
const ENTER_ROWS = 8;            // how many rows get the accent-rail wipe

/**
 * data/news.json -> the model every template on this site renders from.
 *
 * Returns null when there is no news data at all, which is a real state: the
 * collector has not shipped it yet and the section simply does not exist this
 * build. It is NOT rendered as an empty feed, because an empty feed claims we
 * looked and found nothing. Structural corruption throws, loudly, naming the
 * field - the same posture build.mjs takes with state.json.
 */
export function readNews(ctx) {
  const raw = ctx && ctx.news;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`_reel.readNews(): ctx.news must be the parsed data/news.json object, got ${typeof raw}`);
  }
  if (!Array.isArray(raw.items)) {
    throw new Error('_reel.readNews(): news.json is missing an "items" array (docs/NEWS.md shape)');
  }

  const generated_at = raw.generated_at;
  if (!Number.isFinite(Date.parse(generated_at))) {
    throw new Error(`_reel.readNews(): news.json .generated_at is not an ISO-8601 timestamp: ${JSON.stringify(generated_at)}`);
  }

  const items = raw.items.map((it, i) => normalizeItem(it, i, generated_at));

  // Highest score first. Ties break on recency, then on id, so two builds from
  // identical inputs emit byte-identical HTML (CONTRACT hard constraint 4).
  items.sort((a, b) => {
    const sa = a.score ?? -Infinity;
    const sb = b.score ?? -Infinity;
    if (sb !== sa) return sb - sa;
    const ta = Date.parse(a.published_at);
    const tb = Date.parse(b.published_at);
    if (tb !== ta) return tb - ta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const scores = items.map((it) => it.score).filter((s) => Number.isFinite(s));
  const maxScore = scores.length ? Math.max(...scores) : null;
  // Some collectors emit 0-1, some emit 0-100. Displaying "0.8" beside "82"
  // across two builds would be a silent inconsistency, so the scale is inferred
  // once, here, from the whole set - never per item - and the raw value is kept
  // on the element's title so nothing is hidden.
  const scaleUp = maxScore !== null && maxScore <= 1;

  items.forEach((it, i) => {
    it.rank = i + 1;
    it.rankLabel = String(i + 1).padStart(2, '0');
    it.enter = i < ENTER_ROWS;
    if (Number.isFinite(it.score) && maxScore) {
      it.scorePct = Math.max(4, Math.min(100, (it.score / maxScore) * 100));
      it.scoreLabel = num(scaleUp ? it.score * 100 : it.score, 0);
    } else {
      it.scorePct = null;
      it.scoreLabel = null;
    }
    it.why = whyLine(it, items.length);
  });

  const byPillar = {};
  for (const p of brand.PILLARS) byPillar[p.id] = 0;
  for (const it of items) byPillar[it.pillar] += 1;

  const reference = (ctx.state && ctx.state.generated_at) || generated_at;

  return {
    generated_at,
    reference,
    liveness: livenessOf(generated_at, reference),
    items,
    byPillar,
    total: items.length,
    sources: normalizeSources(raw.sources),
    // The collector states its window in days; an earlier draft stated hours.
    // Accept either and print whichever unit it was given in, unconverted.
    window_label: Number.isFinite(raw.window_days) ? `${raw.window_days}d`
      : Number.isFinite(raw.window_hours) ? `${raw.window_hours}h`
        : null,
  };
}

function normalizeItem(it, i, asOfIso) {
  const bad = (msg) => { throw new Error(`_reel.readNews(): news.json items[${i}] ${msg}`); };
  if (!it || typeof it !== 'object') bad('is not an object');
  for (const k of ['id', 'title', 'published_at', 'pillar', 'source']) {
    if (it[k] === undefined || it[k] === null || it[k] === '') bad(`is missing required field "${k}"`);
  }
  if (!Number.isFinite(Date.parse(it.published_at))) {
    bad(`.published_at is not an ISO-8601 timestamp: ${JSON.stringify(it.published_at)}`);
  }
  brand.pillarMeta(it.pillar); // throws with the list of valid ids

  const age = ageAt(it.published_at, asOfIso);
  return {
    id: String(it.id),
    anchor: `i-${slug(String(it.id)) || String(i)}`,
    source: String(it.source),
    kind: typeof it.kind === 'string' && it.kind ? it.kind : null,
    title: String(it.title),
    summary: typeof it.summary === 'string' ? it.summary.trim() : '',
    href: safeHref(it.url),
    published_at: it.published_at,
    pillar: it.pillar,
    score: Number.isFinite(it.score) ? it.score : null,
    entities: Array.isArray(it.entities) ? it.entities.filter((e) => typeof e === 'string') : [],
    meta: it.meta && typeof it.meta === 'object' ? it.meta : {},
    corroboration: corroborationOf(it),
    age,
    fresh: age.seconds <= FRESH_LIMIT_S,
    // MM-DD HH:MMZ everywhere. A bare clock is ambiguous the moment an item is
    // more than a day old, and this column is meant to be scannable, not cute.
    stamp: `${utcDay(it.published_at).slice(5)} ${utcClock(it.published_at)}Z`,
    stampFull: utc(it.published_at),
    rank: 0,
    rankLabel: '00',
    scorePct: null,
    scoreLabel: null,
    why: '',
    enter: false,
  };
}

/**
 * Per-source health for the news collector, in three states that are NOT the
 * same thing: answered with items, answered with nothing in the window, and
 * did not answer. Collapsing "quiet" into "dark" would report an outage that
 * is not happening; collapsing it the other way would hide one that is.
 */
function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];
  return sources.map((s) => {
    if (!s || typeof s.id !== 'string') {
      throw new Error(`_reel.readNews(): news.json .sources entry is malformed: ${JSON.stringify(s)}`);
    }
    const count = Number.isFinite(s.count) ? s.count : 0;
    const ok = s.ok === true;
    return {
      id: s.id,
      ok,
      count,
      label: typeof s.label === 'string' && s.label ? s.label : null,
      kind: typeof s.kind === 'string' && s.kind ? s.kind : null,
      error: typeof s.error === 'string' ? s.error : null,
      status: !ok ? 'dark' : count > 0 ? 'ok' : 'quiet',
    };
  });
}

/** Reused by news.mjs and newsPage.mjs; .chip styling comes from site/styles.mjs. */
const SRC_GLYPH = { ok: '●', quiet: '◐', dark: '○' };
const SRC_WORD = { ok: 'live', quiet: 'no items in window', dark: 'dark' };

export function newsSourceStrip(sources) {
  if (!sources.length) {
    return '<p class="nkey">news.json reports no per-source health. Nothing below can be attributed to a named feed.</p>';
  }
  const chips = sources.map((s) => {
    const detail = s.status === 'ok'
      ? `${s.count}`
      : s.status === 'quiet'
        ? 'none'
        : (s.error ? s.error.slice(0, 28) : 'no answer');
    // The id is what fits in the chip; the human label and the failure reason
    // ride along in the tooltip rather than being dropped.
    const tip = [s.label || s.id, s.kind, s.error ? `error: ${s.error}` : null]
      .filter(Boolean).join(' · ');
    return `<li class="chip" data-status="${esc(s.status)}" title="${esc(tip)}">` +
      `<span class="chip__dot" aria-hidden="true">${SRC_GLYPH[s.status]}</span>` +
      `<b>${esc(s.id)}</b><span class="chip__age">${esc(detail)}</span>` +
      `<span class="vh">${esc(SRC_WORD[s.status])}</span></li>`;
  }).join('');

  const dark = sources.filter((s) => s.status === 'dark').length;
  const quiet = sources.filter((s) => s.status === 'quiet').length;
  const bits = [];
  if (dark) bits.push(`${dark} dark`);
  if (quiet) bits.push(`${quiet} answered with nothing in the window`);
  const key = bits.length
    ? `${bits.join(', ')}, of ${sources.length} news sources. A dark source is excluded, never imputed. ` +
      `A source that answered with nothing in the window is not the same thing and is not counted as an outage.`
    : `All ${sources.length} news sources answered. The number on each chip is items carried, not requests made.`;

  return `<ul class="fresh__strip">${chips}</ul><p class="nkey">${esc(key)}</p>`;
}

// ---------------------------------------------------------------------------
// The reel
// ---------------------------------------------------------------------------

/**
 * A horizontally swipeable rail of the day's highest-scoring items.
 *
 * <ol> because the order is the point - these are ranked, and a screen reader
 * announcing "list item 3 of 8" is carrying real information. The viewport is
 * tabbable (role=region + tabindex=0) because a scroll container that only
 * responds to a mouse wheel is unreachable from a keyboard; with it, arrow keys
 * scroll the rail the moment it takes focus.
 *
 * @param {Array} items   normalized items, already ranked
 * @param {object} o
 * @param {string} o.id        unique id prefix on the page
 * @param {number} [o.limit]
 * @param {string} [o.heading]
 * @param {string} [o.href]    "see all" target
 */
export function reel(items, o = {}) {
  const id = o.id || 'reel';
  const limit = Number.isFinite(o.limit) ? o.limit : 8;
  const picked = items.slice(0, limit);
  if (!picked.length) return '';

  const heading = o.heading || 'Highest-scoring items';
  const cards = picked.map((it, i) => card(it, i)).join('');
  const fresh = picked.filter((it) => it.fresh).length;

  // `items` is what this rail was handed, which is not always the corpus: the
  // switcher hands it eight pre-sliced cards, so "All 8 items →" was pointing
  // at a 200-item archive and naming the wrong number. `total` is the size of
  // the collection the link actually leads to; without one the rail is the
  // whole set and its own length is the truth.
  const all = Number.isFinite(o.total) ? o.total : items.length;
  const more = o.href
    ? `<a class="reel__more" href="${esc(o.href)}">All ${all} items &rarr;</a>`
    : '';

  // The count is the affordance, server-side. "swipe" alone tells a reader with
  // a mouse nothing and tells a reader with a keyboard less; "1 of 8" tells
  // everyone there are seven more and it is true before any script runs. The
  // script replaces the leading numeral with the live position and adds two
  // buttons beside it — see reelJs. Neither is the only way to move the rail:
  // touch-drag, trackpad, the scrollbar and the arrow keys all still work.
  const hint = `<span class="reel__pos" data-dc-pos><b class="reel__posn" data-dc-posn>1</b>` +
    `<span class="reel__post"> of ${picked.length}</span></span>` +
    (fresh
      ? `<span class="reel__fc"><b data-dc-fcn>${fresh}</b> ` +
        `<span data-dc-fcl>under 90m old at the compile stamp</span></span>`
      : '');

  return `<section class="sec reel" aria-labelledby="${esc(id)}-h" data-dc-reel>
  <div class="reel__head">
    <h2 class="sec__h" id="${esc(id)}-h">${esc(heading)}</h2>
    <p class="reel__hint">${hint}${more}</p>
  </div>
  <div class="reel__viewport" tabindex="0" role="region"
       aria-label="${esc(heading)}, ${picked.length} cards, scrolls horizontally">
    <ol class="reel__rail">${cards}</ol>
  </div>
</section>${reelJs}`;
}

function card(it, i) {
  const title = it.href
    ? `<a class="rcard__a" href="${esc(it.href)}" rel="noopener nofollow">${esc(it.title)}</a>`
    : esc(it.title);

  const corr = it.corroboration.count > 1
    ? `<span class="corr" title="${esc(it.corroboration.sources.join(', ') || `${it.corroboration.count} independent sources`)}">` +
      `<span aria-hidden="true">&times;${it.corroboration.count}</span>` +
      `<span class="vh">carried by ${it.corroboration.count} independent sources</span></span>`
    : '';

  const score = it.scoreLabel !== null
    ? `<span class="rcard__score num" title="raw score ${esc(String(it.score))}">${esc(it.scoreLabel)}</span>`
    : '<span class="rcard__score num rcard__score--none" title="this item carries no score">&mdash;</span>';

  // NEW is a claim with a clock in it, so it says which clock. `it.fresh` is
  // measured against the COMPILE STAMP, and the page is cached for up to the
  // cron interval, so a badge left to itself would still say NEW on an item
  // that had aged out while the reader looked at it — the exact failure
  // _html.utc()'s comment forbids. Two defences: the title names the reference,
  // and reelJs removes the badge the moment the reader's own clock puts the
  // item past the window. Nothing is invented; something true is retired.
  const isNew = it.fresh
    ? `<span class="rcard__new" title="published within 90 minutes of the compile stamp">` +
      `<span aria-hidden="true">NEW</span><span class="vh">new: published within 90 minutes of the compile stamp</span></span>`
    : '';

  return `<li class="reel__item" data-pillar="${esc(it.pillar)}" style="--i:${i}"${it.fresh ? ' data-fresh="1"' : ''}>
    <article class="rcard">
      <span class="rcard__n num" aria-hidden="true">${esc(it.rankLabel)}</span>
      <div class="rcard__top">${pillarTag(it.pillar, { long: true })}${isNew}${score}</div>
      <h3 class="rcard__h">${title}</h3>
      <p class="rcard__why">${esc(it.why)}</p>
      <p class="rcard__foot">
        <time datetime="${esc(it.published_at)}" title="${esc(it.stampFull)}" data-dc-t="${esc(it.published_at)}">${esc(it.stamp)}</time>
        <span class="rcard__src">${esc(it.source)}</span>
        ${it.kind ? `<span class="rcard__kind">${esc(it.kind)}</span>` : ''}
        ${corr}
      </p>
    </article>
  </li>`;
}

// ---------------------------------------------------------------------------
// The only script in this file, and the only script the reel has ever had.
//
// WHAT IT IS NOT. It does not render a card, a title, a score, a stamp or a
// rail. Delete it and the rail is exactly what it was before this round: a CSS
// scroll-snap container that drags under a finger, scrolls under a trackpad,
// takes focus and answers the arrow keys, with every card already painted. A
// screenshot taken before this runs is complete. That is the property
// _xwire.mjs names as the one we beat pizzint on and it is not negotiable.
//
// WHAT IT ADDS, and why each one needs a clock rather than a build:
//
//   1. A LIVE AGE beside each absolute stamp. The hook is `data-dc-relage`
//      and NOT `data-dc-age`: site/templates/layout.mjs already owns that name
//      for the masthead's observation clock and reads it with a document-wide
//      `querySelector`, which returns the first match. Eight reel cards
//      claiming the same attribute inside <main> is one reordering away from
//      the masthead clock writing its age into a news card. _html.utc() carries a standing
//      rule against relative times — "a relative string is a statement that
//      becomes false while the reader is looking at it" — and it is right
//      about STATIC ones. A ticking one is the resolution of that rule, not an
//      exception to it: it cannot go stale, and it is ADDED beside the
//      absolute stamp rather than replacing it, so the no-script rendering
//      still carries only absolute UTC and loses no fact.
//
//   2. RETIRING AN EXPIRED `NEW`. Same rule, pointed at the badge: `fresh` is
//      measured at the compile stamp and the page is cached for a cron
//      interval, so the badge has a shelf life. Nothing is invented here —
//      only withdrawn once the reader's own clock has passed it.
//
//   3. TWO BUTTONS AND A POSITION. Real <button>s, so they are in the tab
//      order and answer Enter and Space for free; 32px square, which clears
//      the 24px touch minimum; aria-disabled rather than disabled at the ends
//      so pressing the last one does not throw the focus ring off the page.
//      They are an ADDITION to four native ways of moving the rail, never the
//      only one, and `01 of 08` is already in the HTML before they exist.
//
// Every write is inside a try/catch-free but null-guarded path, the whole
// thing is wrapped in one idempotence flag, and nothing here ever runs at
// build time — so `docker run … site/build.mjs` twice still emits the same
// bytes. Math.random and Date.now appear below because this is browser code.
// ---------------------------------------------------------------------------

const reelJs = `<script>(function(){
if(window.__dcreel)return;window.__dcreel=1;
var D=document,MM=window.matchMedia,RM=MM?MM('(prefers-reduced-motion: reduce)'):null,FRESH=5400000;
function rel(ms){var s=Math.max(0,Math.round(ms/1000));
if(s<90)return s+'s ago';var m=Math.round(s/60);if(m<90)return m+'m ago';
var h=Math.round(m/60);if(h<48)return h+'h ago';return Math.round(h/24)+'d ago';}
function ages(){var now=Date.now(),n=D.querySelectorAll('[data-dc-t]'),i,el,t,tag,txt,card,b;
for(i=0;i<n.length;i++){el=n[i];t=Date.parse(el.getAttribute('data-dc-t'));if(!isFinite(t))continue;
tag=el.nextElementSibling;
if(!tag||!tag.hasAttribute('data-dc-relage')){tag=D.createElement('span');tag.className='rcard__age';
tag.setAttribute('data-dc-relage','');el.parentNode.insertBefore(tag,el.nextSibling);}
txt=rel(now-t);if(tag.textContent!==txt)tag.textContent=txt;
card=el.closest?el.closest('[data-fresh]'):null;
if(card&&now-t>FRESH){card.removeAttribute('data-fresh');
b=card.querySelector('.rcard__new');if(b&&b.parentNode)b.parentNode.removeChild(b);}}
var reels=D.querySelectorAll('[data-dc-reel]'),j,sec,fcn,fcl,live;
for(j=0;j<reels.length;j++){sec=reels[j];fcn=sec.querySelector('[data-dc-fcn]');
if(!fcn)continue;fcl=sec.querySelector('[data-dc-fcl]');
live=sec.querySelectorAll('.reel__item[data-fresh]').length;
fcn.textContent=String(live);if(fcl)fcl.textContent='under 90m old now';
if(fcn.parentNode)fcn.parentNode.hidden=live===0;}}
function step(vp){var it=vp.querySelector('.reel__item');
if(!it)return Math.max(160,Math.round(vp.clientWidth*0.8));
var r=it.getBoundingClientRect(),nx=it.nextElementSibling;
if(nx){var d=Math.round(nx.getBoundingClientRect().left-r.left);if(d>8)return d;}
return Math.round(r.width)+10;}
function mkbtn(dir,label,glyph){var b=D.createElement('button');b.type='button';
b.className='reel__nb';b.setAttribute('data-dc-dir',String(dir));b.setAttribute('aria-label',label);
b.innerHTML='<span aria-hidden="true">'+glyph+'</span>';return b;}
function wire(sec){if(sec.getAttribute('data-dc-wired'))return;
var vp=sec.querySelector('.reel__viewport'),pos=sec.querySelector('[data-dc-pos]'),
posn=sec.querySelector('[data-dc-posn]');if(!vp||!pos||!posn)return;
sec.setAttribute('data-dc-wired','1');
var total=vp.querySelectorAll('.reel__item').length,
prev=mkbtn(-1,'Scroll the rail back',String.fromCharCode(9664)),
next=mkbtn(1,'Scroll the rail forward',String.fromCharCode(9654));
pos.parentNode.insertBefore(prev,pos);
if(pos.nextSibling)pos.parentNode.insertBefore(next,pos.nextSibling);else pos.parentNode.appendChild(next);
pos.parentNode.setAttribute('data-dc-nav','1');
function off(b,v){b.setAttribute('aria-disabled',v?'true':'false');}
function sync(){var st=step(vp),max=vp.scrollWidth-vp.clientWidth,
i=Math.min(total,Math.max(1,Math.round(vp.scrollLeft/st)+1));
if(posn.textContent!==String(i))posn.textContent=String(i);
off(prev,vp.scrollLeft<=2);off(next,vp.scrollLeft>=max-2);}
function go(dir){if(dir<0&&vp.scrollLeft<=2)return;
var st=step(vp),sm=!(RM&&RM.matches);
if(vp.scrollBy)vp.scrollBy({left:dir*st,behavior:sm?'smooth':'auto'});else vp.scrollLeft+=dir*st;}
function press(b,dir){return function(){if(b.getAttribute('aria-disabled')==='true')return;go(dir);};}
prev.addEventListener('click',press(prev,-1));
next.addEventListener('click',press(next,1));
var q=0;vp.addEventListener('scroll',function(){if(q)return;q=1;
requestAnimationFrame(function(){q=0;sync();});},{passive:true});
window.addEventListener('resize',sync,{passive:true});
sync();}
function boot(){var r=D.querySelectorAll('[data-dc-reel]'),i;for(i=0;i<r.length;i++)wire(r[i]);ages();}
boot();
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);
setInterval(ages,30000);
D.addEventListener('visibilitychange',function(){if(!D.hidden)ages();});
})();</script>`;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

// Five pillar hues, one per pillar, declared as --p on the [data-pillar] hook
// so a tag, a card rail and a feed row all pick up the same value without any
// of them naming a colour. Never the only signal: every element that uses --p
// also carries a sigil, a short code or a word.
//
// Two full sets, because the light theme is first-class here (styles.mjs) and
// #6ea8fe on #faf9f6 is a 2.1:1 contrast failure. The selector shape is copied
// exactly from styles.mjs: OS preference, guarded against an explicit opposite
// data-theme, then both explicit themes.
const HUES_DARK = {
  capability: '#6ea8fe',
  compute: '#c792ea',
  attention: '#ffb020',
  governance: '#5fd08a',
  markets: '#ff8f6b',
};
const HUES_LIGHT = {
  capability: '#1d4ed8',
  compute: '#6b21a8',
  attention: '#9a5a00',
  governance: '#17714a',
  markets: '#b3441e',
};

function hueBlock(prefix, hues) {
  return Object.entries(hues)
    .map(([id, c]) => `${prefix} [data-pillar="${id}"] { --p: ${c}; }`)
    .join('\n');
}

export const pillarCss = `
${hueBlock('', HUES_DARK)}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
${hueBlock('   ', HUES_LIGHT)}
  }
}
${hueBlock(':root[data-theme="light"]', HUES_LIGHT)}
${hueBlock(':root[data-theme="dark"]', HUES_DARK)}

.ptag {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--mono); font-size: var(--t-2xs); font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--p, var(--accent));
  border: 1px solid var(--rule);
  border-color: color-mix(in srgb, var(--p, var(--accent)) 45%, var(--rule));
  background: color-mix(in srgb, var(--p, var(--accent)) 10%, transparent);
  border-radius: 2px; padding: 2px 5px 2px 4px;
  white-space: nowrap; line-height: 1.4;
}
.ptag svg { width: 11px; height: 11px; flex: 0 0 auto; }
/* The sprite must not take part in layout. width/height 0 on the element is not
   enough on its own in every engine, so it is taken out of flow as well. */
.dcsprite { position: absolute; width: 0; height: 0; overflow: hidden; }

/* Corroboration is the one number on a row that a competitor cannot fake by
   scraping harder, so it gets a box of its own rather than a parenthesis. */
.corr {
  font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700; letter-spacing: 0.06em;
  color: var(--ink); border: 1px solid var(--rule); border-radius: 2px;
  padding: 1px 4px; background: var(--bg-sunken); white-space: nowrap;
}

.chip[data-status="quiet"] .chip__dot { color: var(--ink-faint); }
.chip[data-status="quiet"] { border-style: dashed; }
`;

export const reelCss = `
.reel { margin: 34px 0 0; }
.reel__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.reel__head .sec__h { margin-bottom: 8px; }
.reel__hint {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 8px; display: flex; gap: 10px; align-items: center;
  flex-wrap: wrap;
}
.reel__more { color: var(--ink-dim); text-decoration: none; border-bottom: 1px solid var(--rule); }
.reel__more:hover { color: var(--ink); border-bottom-color: var(--accent); }

/* THE POSITION READOUT, server-rendered as "1 of 8" and upgraded in place to
   the live position once reelJs wires the rail. Both forms are true; the
   static one is the affordance ("there are eight of these") and the live one
   is the instrument. Tabular figures so the numeral does not shuffle the row
   sideways as it counts. */
.reel__pos {
  display: inline-flex; align-items: baseline; gap: 3px;
  font-variant-numeric: tabular-nums;
}
.reel__posn { color: var(--accent); font-weight: 700; min-width: 1.2ch; text-align: right; }
.reel__post { color: var(--ink-faint); }

/* The freshness count. Absent entirely at zero — a zero is not an event, the
   same rule the switcher's tab figures follow. The label names its own clock:
   the server writes "at the compile stamp", reelJs rewrites it to "now". */
.reel__fc { color: var(--ink-dim); }
.reel__fc b { color: var(--accent); font-weight: 700; font-variant-numeric: tabular-nums; }
.reel__fc[hidden] { display: none; }

/* The two rail buttons. Injected by reelJs and styled here so they arrive
   painted rather than flashing unstyled. 32px square clears the 24px touch
   minimum with room; aria-disabled rather than disabled keeps the focus ring
   on the control after the last press instead of dropping it to the body. */
.reel__nb {
  flex: 0 0 auto; width: 32px; height: 32px; padding: 0; margin: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--t-2xs); line-height: 1; cursor: pointer;
  color: var(--ink-dim); background: var(--bg-raised);
  border: 1px solid var(--rule); border-radius: var(--radius);
  -webkit-appearance: none; appearance: none;
}
.reel__nb:hover { color: var(--ink); border-color: var(--accent); }
.reel__nb:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.reel__nb[aria-disabled="true"] { color: var(--ink-faint); border-style: dashed; cursor: default; }
.reel__nb[aria-disabled="true"]:hover { color: var(--ink-faint); border-color: var(--rule); }
[data-dc-nav] { gap: 6px; }

/* Bleeds to the gutter so the rail runs off the edge of a phone screen - the
   affordance that says "there is more this way" without a script measuring
   anything. body has overflow-x:hidden, so this cannot introduce a page scroll. */
.reel__viewport {
  overflow-x: auto; overflow-y: hidden;
  margin: 0 calc(var(--gutter) * -1);
  padding: 3px var(--gutter) 12px;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  /* Snapped cards land against the gutter, not against the bleed edge, so the
     rail lines up with the column of text above it. */
  scroll-padding-inline: var(--gutter);
  scrollbar-width: thin;
  scrollbar-color: var(--rule) transparent;
}
/* The default macOS/Chrome bar is a heavy grey slab across the bottom of a
   card rail. This is the same affordance at the weight of a rule. */
.reel__viewport::-webkit-scrollbar { height: 6px; }
.reel__viewport::-webkit-scrollbar-track { background: transparent; }
.reel__viewport::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 3px; }
.reel__viewport:hover::-webkit-scrollbar-thumb { background: var(--ink-faint); }
.reel__viewport:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: var(--radius); }
.reel__rail { display: flex; gap: 10px; list-style: none; margin: 0; padding: 0; }
.reel__item { flex: 0 0 clamp(248px, 78vw, 318px); display: flex; scroll-snap-align: start; }
@media (min-width: 720px) { .reel__item { flex-basis: 300px; } }

.rcard {
  position: relative; width: 100%; min-height: 196px;
  display: flex; flex-direction: column; gap: 8px;
  background: var(--bg-raised); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 13px 14px 11px; overflow: hidden;
}
/* COMMIT TO THE HUE. Before this round a pillar was a 2px rule at the top of
   the card and nothing else, so eight cards read as eight grey boxes and the
   five colours the sheet defines were doing almost no work. The wash is the
   pillar's own hue at 6% over the card's ground, and it FADES OUT BY 55% of
   the card height — deliberately, because the foot below that line is
   --ink-faint at 10.5px and is the one run of text on the card with no
   contrast headroom to give away. Everything the wash touches is --ink or
   --ink-dim. Turn the wash off and no fact is lost: the sigil, the pillar name
   and the short code all still say which pillar this is. */
.rcard {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--p, var(--accent)) 6%, var(--bg-raised)) 0%,
      var(--bg-raised) 55%);
}
.rcard::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
  background: var(--p, var(--accent)); transform-origin: left;
}
.rcard:hover { border-color: color-mix(in srgb, var(--p, var(--accent)) 50%, var(--rule)); }

/* A FRESH CARD IS LOUD. pizzint's one genuinely good reward is that a new item
   arrives with a full-panel flash rather than a 220ms fade, and ENGAGEMENT.md
   §1.3 calls that the slot machine. This is the honest, static version of it:
   the card's rule goes to the live amber, the border picks the amber up, and
   the badge is filled rather than outlined. No animation is involved, so it is
   in the screenshot, and reelJs takes it all away again the moment the item is
   more than 90 minutes old by the reader's own clock. */
.reel__item[data-fresh] .rcard {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--rule));
  box-shadow: var(--shadow-1);
}
.reel__item[data-fresh] .rcard::before { background: var(--accent); height: 4px; }
.rcard__new {
  flex: 0 0 auto; font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700;
  letter-spacing: 0.16em; line-height: 1.5; padding: 1px 5px; border-radius: 2px;
  color: var(--accent-ink); background: var(--accent);
}
/* The live age reelJs adds beside the absolute stamp. It is never in the
   served HTML, so a reader with no script sees exactly the UTC clock this site
   has always printed and never a relative string that has gone stale. */
.rcard__age { color: var(--ink-dim); font-variant-numeric: tabular-nums; }

/* The rank as a watermark numeral. It is the graphic element on the card and
   it is also the ordering, which is the thing pizzint's feed never tells you. */
.rcard__n {
  position: absolute; right: 6px; bottom: -8px; pointer-events: none;
  font-family: var(--mono); font-weight: 700; font-size: 62px; line-height: 1;
  letter-spacing: -0.06em; color: var(--p, var(--accent)); opacity: 0.11;
}
/* Pillar tag and NEW badge sit together on the left and the score is pushed to
   the right edge by its own margin rather than by space-between, which would
   have centred the badge in the gap the moment a third child appeared. */
.rcard__top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rcard__score { font-family: var(--mono); font-size: 17px; font-weight: 700; letter-spacing: -0.02em; color: var(--ink); margin-left: auto; }
.rcard__score--none { color: var(--ink-faint); font-weight: 400; }
.rcard__h { font-size: var(--t-base); line-height: 1.32; margin: 0; letter-spacing: -0.012em; overflow-wrap: anywhere; }
/* No text-decoration:none here any more. This was one of the six hover-only
   links: the card headline rendered in body ink with no underline, so on a
   phone it was indistinguishable from prose. It inherits the underline now. */
.rcard__a:hover { text-decoration: underline; text-decoration-color: var(--p, var(--accent)); }
.rcard__why { font-size: var(--t-xs); color: var(--ink-dim); margin: 0; flex: 1 1 auto; }
.rcard__foot {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0;
  padding-top: 8px; border-top: 1px solid var(--rule-soft); position: relative;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.04em; color: var(--ink-faint);
}
.rcard__src { color: var(--ink-dim); text-transform: uppercase; letter-spacing: 0.1em; }
.rcard__kind { color: var(--ink-faint); border: 1px solid var(--rule-soft); border-radius: 2px; padding: 0 4px; }

/* Motion, all of it optional, none of it on text. The card's accent rail wipes
   in; the words are already painted. Reduced motion gets a plain scroll row
   with no snap, which is a legitimate way to read a rail, not a degraded one. */
@media (prefers-reduced-motion: no-preference) {
  .reel__viewport { scroll-snap-type: x mandatory; scroll-behavior: smooth; }
  .rcard::before { animation: doomconWipe 460ms ease-out backwards; animation-delay: calc(var(--i, 0) * 55ms); }
  @keyframes doomconWipe { from { transform: scaleX(0); } to { transform: scaleX(1); } }
}
`;
