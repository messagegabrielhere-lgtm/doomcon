// /news.html - every item in the collection window, on one server-rendered,
// indexable page.
//
// This is our answer to the single most important finding in the teardown:
// pizzint's sitemap holds 1,018 URLs and 997 of them are auto-generated
// /intel/<slug> briefs. The viral index gets the spike; the long tail is the
// durable traffic. We do not auto-generate 997 thin pages of restated
// headlines - that is a content-farm posture and it ages badly - but we do
// need one substantial, crawlable page that carries every item we scored, with
// real structured data on it, rather than a dashboard that is one URL.
//
// Constraints that shaped this file:
//   - no client-side framework, and in fact no JavaScript at all. The filter
//     is a set of radio inputs and a sibling selector. It works with JS off,
//     it works in a prerender, and the default state shows EVERY row - so a
//     crawler is never looking at a filtered subset.
//   - every row is in the HTML. Same rule as the dashboard, same reason.
//
// ---------------------------------------------------------------------------
// WHAT CHANGED, AND WHY THERE ARE NOW TWO LARGE SVGs ON THIS PAGE
// ---------------------------------------------------------------------------
//
// Measured before this pass: /news carried 200 scored items and 227 SVG
// elements, and not one of them was larger than 64x64. Every sigil, every
// meter, every status pip - all of it micro-type. The densest dataset on the
// site was rendered as an undifferentiated list, and the operator's complaint
// ("I don't see the new graphics") was a correct reading of the page.
//
// Two graphics were added, each drawn from a fact that is already in
// data/news.json and neither of them decorative:
//
//   1. scoreHistogram()   the distribution of scores across the window,
//                         stacked by pillar, with the severity tiers that
//                         fired marked underneath the axis. 720x320 at
//                         desktop. This is the shape of the corpus: it shows
//                         at a glance that the bulk of the window is one dense
//                         pile of same-scoring papers with a thin, loud tail,
//                         which is the single most useful thing to know before
//                         reading 200 rows.
//   2. sourceYield()      per source, items CARRIED in the window against
//                         items that survived the max_items cap onto this
//                         page. Two different numbers that were previously
//                         conflated into one chip. 640 wide at desktop, 16
//                         rows tall, and the three source states (live, quiet,
//                         dark) are drawn as three different things.
//
// NEITHER IS A SECOND CHARTING LAYER. Both draw with _charts.mjs's classes
// (.ch, .ch__svg, .ch__cap, .ch-note, .ch-ax, .ch-axline, .ch-r-track,
// .ch-r-bar, .ch-r-cap, .ch-r-none, .ch-r-nonet, .ch-r-name, .ch-r-val), its
// two-geometry responsive pattern (.ch__svg--sm / .ch__svg--lg toggled at
// 640px by the global sheet), its content-hashed element ids and its
// title/desc/caption discipline. The handful of primitives repeated in the
// CHART PRIMITIVES block below are repeated only because they are
// module-private in _charts.mjs and that file is not this task's to edit; the
// glyph table IS imported from it so the two can never drift.
//
// Everything obeys the same five rules _charts.mjs states in its header, and
// the fifth one did the real work here: MISSING IS A STATE, NOT A ZERO. An
// item with no score is counted and named, never bucketed at the bottom. A
// source that did not answer is drawn dashed and labelled DARK, never as a bar
// of length nothing.

import { esc, num, utc, utcDay } from './_html.mjs';
import { readNews, reel, pillarSigil, pillarSprite, newsSourceStrip } from './_reel.mjs';
import { newsCss, liveHead, legend, feedRow } from './news.mjs';
import { PILLAR_GLYPH } from './_charts.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/news.html';
const REEL_CARDS = 10;

// Structured data is capped, and numberOfItems still declares the true total.
// _html.mjs pretty-prints JSON-LD at two-space indent, which is right for a
// file a human is invited to audit and expensive across hundreds of nested
// objects: at 200 items the graph was 143 KB, larger than the markup it
// described. 100 is the whole first screen of the ranking and then some.
const JSONLD_MAX = 100;

/** build.mjs guard: is there anything to build this page from? */
export function hasNews(ctx) {
  return Boolean(ctx && ctx.news);
}

export function render(ctx) {
  const news = readNews(ctx);
  if (!news) return emptyPage(ctx);

  const { items, total } = news;
  const days = items.length ? uniqueDays(items) : 0;

  // Derived once, handed to every section, so the histogram, the key, the tier
  // strip, the filter chips and the rows can never disagree about a count.
  const corpus = readCorpus(news);

  const main = `<style>${newsCss()}${archiveCss(pillarsPresent(news))}</style>${pillarSprite()}
<section class="narch__intro">
  <h1 class="narch__h1">AI signal feed</h1>
  <p class="lede">Every item ${esc(brand.NAME)} scored in the current collection window &mdash;
     ${esc(total)} item${total === 1 ? '' : 's'} across ${esc(days)} day${days === 1 ? '' : 's'},
     ranked by score and tagged to the pillar each one feeds. These are the inputs behind the
     Attention pillar, published rather than summarised. Nothing here is rewritten: every headline
     links to the source that carried it.</p>
  ${liveHead(news, 'Collection window', 'arch-live')}
  ${legend(news)}
</section>

${reel(items, { id: 'areel', limit: REEL_CARDS, heading: 'Highest-scoring items' })}

${corpusSection(news, corpus)}

<section class="sec narch" aria-labelledby="arch-h">
  <h2 class="sec__h" id="arch-h">All items</h2>
  ${listKey(corpus)}
  <h3 class="vh">Filter the list</h3>
  ${filterInputs(news, corpus)}
  ${filterBar(news, corpus)}
  <ol class="nfeed narch__list">${items.map(archiveRow).join('')}</ol>
</section>

<section class="sec" aria-labelledby="arch-src-h">
  <h2 class="sec__h" id="arch-src-h">Where these came from</h2>
  ${sourceYield(news, corpus)}
  ${newsSourceStrip(news.sources)}
  <p class="nkey">Scores rank items against each other inside this window; they are not a
     probability of anything and they do not move the index on their own. The composite score and
     the level are computed from the five pillars, not from this list.
     <a href="${esc(ctx.href('/methodology.html'))}">Read the methodology &rarr;</a></p>
</section>`;

  return page({
    ctx,
    motion: true,
    path: PATH,
    title: `AI signal feed — ${total} scored items · ${brand.NAME}`,
    ogTitle: `${brand.NAME} signal feed — ${total} scored items`,
    description:
      `Every AI news item ${brand.NAME} scored in the current window: ${total} items across ` +
      `${days} days, ranked, pillar-tagged and linked to the source that carried each one. ` +
      `Compiled ${utc(news.generated_at)}.`,
    ogImage: ctx.cardFor && ctx.state ? ctx.cardFor(ctx.state.receipt_id) : null,
    ogImageAlt: `${brand.NAME} share card`,
    jsonld: [collectionPage(ctx, news), itemList(ctx, news)],
    main,
  });
}

/**
 * ctx.news absent. The page still builds, says so plainly and carries
 * noindex - an empty archive that Google has cached is worse than no archive.
 * build.mjs can also just skip writing this file; hasNews(ctx) is the guard.
 */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `AI signal feed · ${brand.NAME}`,
    description: `${brand.NAME} news collection has not published a window yet.`,
    main: `<style>${newsCss()}${archiveCss()}</style>${pillarSprite()}
<section class="narch__intro">
  <h1 class="narch__h1">AI signal feed</h1>
  <p class="lede">No collection window has been published in this build. This page is not
     an empty result &mdash; it is the absence of a result, and the two are different states.
     When <code>data/news.json</code> is present it is rendered here in full.</p>
</section>`,
  });
}

function uniqueDays(items) {
  const set = new Set(items.map((it) => utcDay(it.published_at)));
  return set.size;
}

// ---------------------------------------------------------------------------
// READING THE CORPUS
//
// One pass over the normalized items, producing every aggregate the page
// draws. Nothing here invents a value: each field is a count, a min, a max or
// a verbatim string out of data/news.json. Where a fact is absent it lands in
// a NAMED bucket (unscored, dark, no-band) rather than defaulting to zero.
// ---------------------------------------------------------------------------

// Band order is fixed by the collector: A is the loudest term tier. Ordering
// them here rather than sorting strings keeps "highest band present" cheap and
// keeps two builds identical.
const BAND_RANK = { A: 3, B: 2, C: 1 };
const BAND_WORD = {
  A: 'tier A, the loudest incident terms',
  B: 'tier B, strong incident terms',
  C: 'tier C, weak incident terms',
};
const TERMS_SHOWN = 4;

function readCorpus(news) {
  const items = news.items;

  const scored = [];
  const unscored = [];
  for (const it of items) {
    if (Number.isFinite(it.score)) scored.push(it);
    else unscored.push(it);
  }

  // Per pillar: how many, and the actual score range. A range is two real
  // observations; a mean would be a number we made up about a set whose shape
  // the histogram right beside it already shows.
  const pillars = brand.PILLARS.map((p) => {
    const mine = items.filter((it) => it.pillar === p.id);
    const s = mine.map((it) => it.score).filter((v) => Number.isFinite(v));
    return {
      id: p.id,
      name: p.name,
      glyph: PILLAR_GLYPH[p.id] || '▪',
      count: mine.length,
      scored: s.length,
      lo: s.length ? Math.min(...s) : null,
      hi: s.length ? Math.max(...s) : null,
    };
  }).filter((p) => p.count > 0);

  // Items the severity machinery fired on, with the terms that fired it.
  const banded = items
    .map((it) => ({ item: it, sig: signalsOf(it) }))
    .filter((r) => r.sig.band !== null)
    .sort((a, b) => {
      const ra = BAND_RANK[a.sig.band] || 0;
      const rb = BAND_RANK[b.sig.band] || 0;
      if (rb !== ra) return rb - ra;
      const sa = Number.isFinite(a.item.score) ? a.item.score : -Infinity;
      const sb = Number.isFinite(b.item.score) ? b.item.score : -Infinity;
      if (sb !== sa) return sb - sa;
      return a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0;
    });

  const bandCount = { A: 0, B: 0, C: 0 };
  for (const r of banded) bandCount[r.sig.band] += 1;

  // Corroborated = more than one independent source stands behind it, either
  // on the same item or on the same story cluster. Two different facts, both
  // real, counted separately and then unioned for the filter.
  let carried = 0;
  let clustered = 0;
  let corroborated = 0;
  for (const it of items) {
    const sig = signalsOf(it);
    if (sig.carried) carried += 1;
    if (sig.story) clustered += 1;
    if (sig.carried || sig.story) corroborated += 1;
  }

  // Per source: how many of ITS items are on this page.
  //
  // ONE NUMBER, DELIBERATELY. The obvious second number is news.json's
  // sources[].count, and an earlier draft of this chart drew the two as a
  // bullet chart - count as the outer bar, on-page as the solid inner one -
  // with a caption calling the gap "the 200-item cap". That was wrong, and it
  // is worth the paragraph so nobody rebuilds it.
  //
  // collector/news.mjs sets sources[].count to the items THIS RUN'S FETCH
  // returned inside the rolling window. items[] is the deduplicated window,
  // which in this build is 122 retained items from earlier runs plus the fresh
  // ones - and three sources were not even fetched this run (skipped_this_run)
  // so their row is carried forward verbatim. The two numbers are therefore
  // not nested in either direction: measured here, techmeme reports 10 and has
  // 42 rows on the page, while openai reports 20 and has 1. Drawing one inside
  // the other asserted a containment that does not exist, and the caption
  // asserted a cause for a gap that is sometimes negative.
  //
  // So the chart draws the number the reader can verify by scrolling, and the
  // per-source strip underneath keeps reporting the fetch count, labelled as
  // its own thing.
  const onPage = new Map();
  for (const it of items) onPage.set(it.source, (onPage.get(it.source) || 0) + 1);

  // TWO INDEPENDENT FACTS PER SOURCE, and an empty-state test is what forced
  // them apart. `health` is about the last COLLECTION RUN - did the feed
  // answer. `onPage` is about THIS PAGE - how many rows it accounts for. They
  // are not the same question and one does not imply the other: a feed that
  // went dark an hour ago still has every row it contributed earlier in the
  // window sitting in the list below. A first draft folded them into one
  // enum, and a dark source with 42 rows on the page rendered as an em dash
  // with no bar - the chart under-reporting by 42 to describe a fetch.
  const sources = news.sources.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    health: s.status === 'dark' ? 'dark' : s.status === 'quiet' ? 'quiet' : 'ok',
    error: s.error,
    onPage: onPage.get(s.id) || 0,
  }));
  // Ranked by the thing the chart measures. Health only breaks a tie, and the
  // id breaks the rest, so two builds from one input can never swap two rows.
  const HEALTH_RANK = { ok: 0, quiet: 1, dark: 2 };
  sources.sort((a, b) => {
    if (b.onPage !== a.onPage) return b.onPage - a.onPage;
    const ra = HEALTH_RANK[a.health] ?? 3;
    const rb = HEALTH_RANK[b.health] ?? 3;
    if (ra !== rb) return ra - rb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // A source that appears in items[] but not in sources[] would make the chart
  // quietly omit rows. Count it rather than hide it.
  const named = new Set(sources.map((s) => s.id));
  const unlisted = [...onPage.keys()].filter((id) => !named.has(id)).sort();

  return {
    total: items.length,
    scored,
    unscored,
    pillars,
    banded,
    bandCount,
    carried,
    clustered,
    corroborated,
    sources,
    unlisted,
  };
}

/**
 * Every per-row signal this page draws, read straight off item.meta.
 *
 * Absent is absent: a missing incident block is `band: null`, never band C,
 * and a missing story is `story: null`, never a cluster of one. Called from
 * both readCorpus() and archiveRow(); it is a pure function of the item, so
 * calling it twice cannot produce two different answers.
 */
function signalsOf(it) {
  const m = it.meta || {};

  const inc = m.incident && typeof m.incident === 'object' && !Array.isArray(m.incident)
    ? m.incident : null;
  const rawBand = inc && typeof inc.band === 'string' ? inc.band.trim().toUpperCase() : '';
  const band = Object.prototype.hasOwnProperty.call(BAND_RANK, rawBand) ? rawBand : null;
  const severity = inc && Number.isFinite(inc.severity) ? inc.severity : null;
  const strong = Boolean(inc && inc.strong_signal === true);
  const terms = band ? topTerms(inc.terms) : [];

  const carried = it.corroboration.count > 1
    ? { count: it.corroboration.count, sources: it.corroboration.sources }
    : null;

  const st = m.story && typeof m.story === 'object' && !Array.isArray(m.story) ? m.story : null;
  const story = st && Number.isFinite(st.source_count) && st.source_count > 1
    ? {
      count: st.source_count,
      sources: Array.isArray(st.sources) ? st.sources.filter((s) => typeof s === 'string') : [],
      members: Array.isArray(st.members) ? st.members.length : null,
    }
    : null;

  return { band, severity, strong, terms, carried, story };
}

/**
 * The distinct terms that fired the severity machinery, loudest first.
 *
 * The collector emits one entry per (term, field) hit, so "breach" in the
 * title and "breach" in the summary arrive twice. Deduplicated on the matched
 * string keeping the heaviest weight, then sorted weight-descending with the
 * string as the tiebreak, so the order is stable across builds.
 */
function topTerms(terms) {
  if (!Array.isArray(terms)) return [];
  const best = new Map();
  for (const t of terms) {
    if (!t || typeof t !== 'object') continue;
    const word = typeof t.matched === 'string' && t.matched.trim()
      ? t.matched.trim()
      : typeof t.term === 'string' ? t.term.trim() : '';
    if (!word) continue;
    const w = Number.isFinite(t.weight) ? t.weight : 0;
    const prev = best.get(word);
    if (prev === undefined || w > prev) best.set(word, w);
  }
  return [...best.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, TERMS_SHOWN)
    .map(([word]) => word);
}

// ---------------------------------------------------------------------------
// CHART PRIMITIVES
//
// Repeated from _charts.mjs because they are module-private there and that
// file belongs to another task this pass. Identical behaviour on purpose: the
// id hash is the same FNV-1a over the chart's own content (so no counter, no
// randomness, no dependence on call order), the <svg> is capped at its own
// viewBox width by --w (so type is never upscaled past the size it was drawn
// at), and every chart ships <title>, <desc> and a visible <figcaption>.
// ---------------------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const n2 = (v) => Number(v).toFixed(2);

function hashId(prefix, payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${prefix}${h.toString(36)}`;
}

function openSvg(cls, w, h, tid, did) {
  return `<svg class="ch__svg ${cls}" viewBox="0 0 ${w} ${h}" ` +
    `preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${tid} ${did}" ` +
    `style="--w:${w}px">` +
    `<title id="${tid}">__T__</title><desc id="${did}">__D__</desc>`;
}

function seal(svg, title, desc) {
  return svg.replace('__T__', esc(title)).replace('__D__', esc(desc));
}

function figure(cls, svgs, caption) {
  const cap = caption === false || caption == null || caption === ''
    ? ''
    : `<figcaption class="ch__cap">${esc(caption)}</figcaption>`;
  return `<figure class="ch ${cls}">${svgs}${cap}</figure>`;
}

function textAt(cls, x, y, anchor, size, content) {
  const a = anchor ? ` text-anchor="${anchor}"` : '';
  return `<text class="${cls}" x="${n2(x)}" y="${n2(y)}"${a} font-size="${size}">${esc(content)}</text>`;
}

// A count axis gets integer gridlines. 2.5 is a fine step for a score and an
// absurd one for "items", so this ladder has no fractional rungs.
const COUNT_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/** Smallest round ceiling at or above `max` that needs no more than `maxTicks` gridlines. */
function niceCeiling(max, maxTicks = 4) {
  if (!Number.isFinite(max) || max <= 0) return { top: 1, step: 1 };
  for (const step of COUNT_STEPS) {
    if (Math.ceil(max / step) <= maxTicks) {
      return { top: Math.ceil(max / step) * step, step };
    }
  }
  const step = COUNT_STEPS[COUNT_STEPS.length - 1];
  return { top: Math.ceil(max / step) * step, step };
}

// Bucket widths a reader can do arithmetic in their head with. The first rung
// that keeps the bucket count at or below TARGET_BUCKETS wins.
const BUCKET_LADDER = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
const TARGET_BUCKETS = 22;

/**
 * Bucket boundaries for a set of scores, chosen from the ladder above rather
 * than from the data, so the axis lands on round numbers and two windows of
 * similar spread are drawn at the same resolution.
 */
function bucketPlan(scores) {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  for (const w of BUCKET_LADDER) {
    const lo = Math.floor(min / w) * w;
    let n = Math.max(1, Math.ceil((max - lo) / w));
    // The top boundary is exclusive, so a value sitting exactly on it needs one
    // more bucket rather than a clamp that files it under the wrong label.
    if (lo + n * w <= max) n += 1;
    if (n <= TARGET_BUCKETS) return { lo, w, n, hi: lo + n * w };
  }
  const w = BUCKET_LADDER[BUCKET_LADDER.length - 1];
  const lo = Math.floor(min / w) * w;
  const n = Math.max(1, Math.ceil((max - lo) / w) + 1);
  return { lo, w, n, hi: lo + n * w };
}

/** Axis numbers: integers stay integers, everything else gets one decimal. */
function axisNum(v) {
  return Number.isInteger(v) ? String(v) : num(v, 1);
}

// ---------------------------------------------------------------------------
// GRAPHIC 1 - scoreHistogram
//
// The distribution of scores in the window, stacked by pillar, with the
// severity tiers that fired marked under the axis.
//
// Why this and not volume-over-time, which was the other candidate: the window
// in hand spans two days and 72 of its 200 items arrive inside a single hour
// (the arXiv drop). A time series of that is one spike and a flat line, and it
// says nothing about the thing this page is actually sorted by. The score
// distribution is the page's own ordering drawn as a picture, and it shows the
// reader the structure of what they are about to scroll: a dense block of
// near-identical paper scores, then a thin tail where the press items and the
// incidents live.
//
// Two geometries, not one stretched geometry - the global sheet swaps them at
// 640px. A 720-unit viewBox on a 375px phone downscales past 0.5 and turns
// 10px axis type into 5px.
// ---------------------------------------------------------------------------

const HIST_SM = {
  w: 356, ph: 198, l: 26, r: 8, t: 24, bAx: 26, bSev: 28,
  fs: 8.5, fsv: 7.5, gap: 1.6, labelEvery: 4, allValues: false, tips: false,
};
const HIST_LG = {
  w: 720, ph: 234, l: 40, r: 14, t: 30, bAx: 30, bSev: 32,
  fs: 10, fsv: 9, gap: 3, labelEvery: 2, allValues: true, tips: true,
};

function scoreHistogram(corpus) {
  const scored = corpus.scored;

  // Nothing measured. Not a flat histogram at zero - a sentence.
  if (!scored.length) {
    const why = corpus.total === 0
      ? 'There are no items in this collection window.'
      : `None of the ${corpus.total} items in this window carries a score, so there is no ` +
        'distribution to draw. The items are still listed below.';
    const id = hashId('nh', `empty|${corpus.total}`);
    const word = corpus.total === 0 ? 'No items in this window' : 'No item carries a score';
    const sm = seal(emptyPlot(HIST_SM, `${id}ts`, `${id}ds`, 'ch__svg--sm', word),
      'Score distribution: nothing to draw', why);
    const lg = seal(emptyPlot(HIST_LG, `${id}tl`, `${id}dl`, 'ch__svg--lg', word),
      'Score distribution: nothing to draw', why);
    return figure('ch--nhist', sm + lg, why);
  }

  const plan = bucketPlan(scored.map((it) => it.score));

  // buckets[k] = { total, byPillar, sev }. brand.PILLARS order is the stacking
  // order everywhere on this page, so the key below reads bottom to top and
  // the two can never disagree.
  const buckets = [];
  for (let k = 0; k < plan.n; k += 1) buckets.push({ total: 0, byPillar: new Map(), sev: new Map() });

  for (const it of scored) {
    const k = clamp(Math.floor((it.score - plan.lo) / plan.w), 0, plan.n - 1);
    buckets[k].total += 1;
    buckets[k].byPillar.set(it.pillar, (buckets[k].byPillar.get(it.pillar) || 0) + 1);
  }
  for (const r of corpus.banded) {
    if (!Number.isFinite(r.item.score)) continue;
    const k = clamp(Math.floor((r.item.score - plan.lo) / plan.w), 0, plan.n - 1);
    buckets[k].sev.set(r.sig.band, (buckets[k].sev.get(r.sig.band) || 0) + 1);
  }

  const peakCount = Math.max(...buckets.map((b) => b.total));
  const peakIndex = buckets.findIndex((b) => b.total === peakCount);
  const axis = niceCeiling(peakCount, 4);
  const hasSev = corpus.banded.length > 0;

  const peakLo = plan.lo + peakIndex * plan.w;
  const peakHi = peakLo + plan.w;
  const realLo = Math.min(...scored.map((it) => it.score));
  const realHi = Math.max(...scored.map((it) => it.score));

  const title = `Score distribution of ${scored.length} scored items in this window`;

  const pillarWords = corpus.pillars.map((p) => `${p.name} ${p.count}`).join(', ');
  const sevWords = hasSev
    ? `Severity terms fired on ${corpus.banded.length} items: ` +
      ['A', 'B', 'C'].filter((b) => corpus.bandCount[b] > 0)
        .map((b) => `${corpus.bandCount[b]} at tier ${b}`).join(', ') +
      '. Each is marked with its tier letter under the axis, at the score it sits on. '
    : 'No item in this window fired a severity term. ';
  const unscoredWords = corpus.unscored.length
    ? `${corpus.unscored.length} further item${corpus.unscored.length === 1 ? '' : 's'} carr` +
      `${corpus.unscored.length === 1 ? 'ies' : 'y'} no score at all and ` +
      `${corpus.unscored.length === 1 ? 'is' : 'are'} not in this histogram; ` +
      'they are listed below and marked unscored. '
    : '';

  const desc =
    `Scores run from ${num(realLo, 1)} to ${num(realHi, 1)}, bucketed ${num(plan.w, 2)} points wide ` +
    `from ${axisNum(plan.lo)} to ${axisNum(plan.hi)}. The tallest bucket is ${axisNum(peakLo)} to ` +
    `${axisNum(peakHi)} with ${peakCount} items. Each bar is stacked by pillar in a fixed order, ` +
    `bottom to top: ${brand.PILLARS.map((p) => p.name).join(', ')}. Pillar totals across the ` +
    `whole window: ${pillarWords}. ${sevWords}${unscoredWords}` +
    'Bar height is a count of items, never a score.';

  const sevCap = hasSev
    ? ` ${corpus.banded.length} carr${corpus.banded.length === 1 ? 'ies' : 'y'} an incident term, marked A, B or C beneath the axis.`
    : ' No incident term fired in this window.';
  const caption =
    `${scored.length} scored items, bucketed ${num(plan.w, 2)} points wide. The tallest bucket is ` +
    `${axisNum(peakLo)}–${axisNum(peakHi)} with ${peakCount}.` + sevCap +
    (corpus.unscored.length
      ? ` ${corpus.unscored.length} unscored item${corpus.unscored.length === 1 ? '' : 's'} excluded.`
      : '');

  const key = `${plan.lo}:${plan.w}:${plan.n}|${axis.top}|` +
    buckets.map((b) => brand.PILLARS.map((p) => b.byPillar.get(p.id) || 0).join('.') +
      '/' + ['A', 'B', 'C'].map((x) => b.sev.get(x) || 0).join('.')).join(',');
  const id = hashId('nh', key);

  const sm = seal(histPlot(buckets, plan, axis, peakIndex, hasSev, HIST_SM, `${id}ts`, `${id}ds`, 'ch__svg--sm'), title, desc);
  const lg = seal(histPlot(buckets, plan, axis, peakIndex, hasSev, HIST_LG, `${id}tl`, `${id}dl`, 'ch__svg--lg'), title, desc);
  return figure('ch--nhist', sm + lg, caption);
}

function emptyPlot(g, tid, did, variantCls, word) {
  const h = g.t + g.ph + g.bAx;
  let out = openSvg(`ch__svg--nhist ${variantCls}`, g.w, h, tid, did);
  out += `<line class="ch-axline" x1="${n2(g.l)}" y1="${n2(g.t + g.ph)}" x2="${n2(g.w - g.r)}" y2="${n2(g.t + g.ph)}"/>`;
  out += textAt('ch-note', g.w / 2, g.t + g.ph / 2, 'middle', g.fs + 1.5, word);
  return `${out}</svg>`;
}

function histPlot(buckets, plan, axis, peakIndex, hasSev, g, tid, did, variantCls) {
  const h = g.t + g.ph + g.bAx + (hasSev ? g.bSev : 0);
  const pw = g.w - g.l - g.r;
  const base = g.t + g.ph;
  const pitch = pw / plan.n;
  const barW = Math.max(1.2, pitch - g.gap);
  const yFor = (count) => base - (count / axis.top) * g.ph;

  let out = openSvg(`ch__svg--nhist ${variantCls}`, g.w, h, tid, did);

  // Axis captions in words, because a bar chart whose HEIGHT is a count and
  // whose POSITION is a score is exactly the chart people misread.
  out += textAt('ch-ax', g.l, g.t - 10, 'start', g.fs, 'ITEMS');
  out += textAt('ch-ax', g.w - g.r, g.t - 10, 'end', g.fs, `${axis.top} MAX`);

  // Gridlines with their counts, drawn before the bars so a bar always sits on
  // top of its own grid.
  for (let v = 0; v <= axis.top; v += axis.step) {
    const y = yFor(v);
    out += `<line class="ch-axline" x1="${n2(g.l)}" y1="${n2(y)}" x2="${n2(g.w - g.r)}" y2="${n2(y)}"/>`;
    out += textAt('ch-ax', g.l - 5, y + 3, 'end', g.fs, String(v));
  }

  // Bars, stacked bottom to top in brand.PILLARS order. The order is fixed and
  // printed in the key, so the stack is readable without resolving a hue.
  buckets.forEach((cell, k) => {
    if (cell.total === 0) return;
    const x = g.l + k * pitch + (pitch - barW) / 2;
    let y = base;
    for (const p of brand.PILLARS) {
      const c = cell.byPillar.get(p.id) || 0;
      if (c === 0) continue;
      const segH = (c / axis.top) * g.ph;
      y -= segH;
      // The hover tooltip is on the desktop geometry only. A phone cannot
      // hover, and 50 unreachable <title> elements is 3.4 KB of a page that is
      // already the heaviest on the site. The <desc> carries the same facts
      // for a screen reader on both.
      const tip = g.tips
        ? `<title>${esc(`${p.name}: ${c} of ${cell.total} scored ${axisNum(plan.lo + k * plan.w)} to ${axisNum(plan.lo + (k + 1) * plan.w)}`)}</title>`
        : '';
      out += `<rect class="nhg__seg" data-pillar="${esc(p.id)}" x="${n2(x)}" y="${n2(y)}" ` +
        `width="${n2(barW)}" height="${n2(segH)}">${tip}</rect>`;
    }
    // The count, printed. On the phone geometry only the peak gets one: 19
    // two-digit numbers at 7px across 322 units is a grey smear, and the
    // caption already names the peak in words.
    if (g.allValues || k === peakIndex) {
      out += textAt('nhg__val', x + barW / 2, yFor(cell.total) - 4, 'middle', g.fsv, String(cell.total));
    }
  });

  // Baseline, redrawn over the bars so the bars sit ON the axis.
  out += `<line class="ch-axline nhg__base" x1="${n2(g.l)}" y1="${n2(base)}" x2="${n2(g.w - g.r)}" y2="${n2(base)}"/>`;

  // Score axis: ticks and labels on bucket BOUNDARIES, not bucket centres, so
  // the number under a gap is the edge the two buckets share.
  const marks = [];
  for (let k = 0; k <= plan.n; k += g.labelEvery) marks.push(k);
  if (marks[marks.length - 1] !== plan.n) marks.push(plan.n);
  for (const k of marks) {
    const x = g.l + k * pitch;
    out += `<line class="ch-axline" x1="${n2(x)}" y1="${n2(base)}" x2="${n2(x)}" y2="${n2(base + 4)}"/>`;
    // The two end labels hang INWARD from their tick rather than centring on
    // it. Centred, "67.5" at the last boundary ran two units past the viewBox
    // on the phone geometry and rendered as "67.f" - a clipped axis number
    // reads as a broken chart, and it is the cheapest thing on here to get
    // wrong.
    const anchor = k === 0 ? 'start' : k === plan.n ? 'end' : 'middle';
    out += textAt('ch-ax', x, base + 14, anchor, g.fs, axisNum(plan.lo + k * plan.w));
  }
  out += textAt('ch-ax nhg__axname', g.w - g.r, base + g.bAx - 2, 'end', g.fs, 'SCORE');

  // The severity lane. One marker per bucket that contains a banded item,
  // carrying the highest tier present and a count when more than one landed in
  // the same bucket. The LETTER is the signal; the fill only agrees with it.
  if (hasSev) {
    const lane = base + g.bAx;
    out += `<line class="nhg__sevrule" x1="${n2(g.l)}" y1="${n2(lane)}" x2="${n2(g.w - g.r)}" y2="${n2(lane)}"/>`;
    buckets.forEach((cell, k) => {
      if (cell.sev.size === 0) return;
      let band = null;
      for (const b of ['A', 'B', 'C']) if (cell.sev.has(b)) { band = b; break; }
      let n = 0;
      for (const v of cell.sev.values()) n += v;
      const cx = g.l + k * pitch + pitch / 2;
      const ty = lane + 5;
      out += `<path class="nhg__sev" data-band="${band}" d="M${n2(cx - 4)},${n2(ty + 6)} L${n2(cx + 4)},${n2(ty + 6)} L${n2(cx)},${n2(ty)} Z"/>`;
      out += textAt('nhg__sevt', cx, lane + g.bSev - 4, 'middle', g.fs, n > 1 ? `${band}×${n}` : band);
    });
  }

  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// GRAPHIC 2 - sourceYield
//
// How many rows on THIS PAGE each source is responsible for, ranked.
//
// Drawn with _charts.mjs's ranked-bar vocabulary (.ch-r-track, .ch-r-bar,
// .ch-r-cap, .ch-r-none, .ch-r-nonet, .ch-r-name, .ch-r-val, .ch-r-glyph) so
// it is visibly the same instrument as the pillar ranking on the homepage.
//
// THE BAR IS ONE MEASUREMENT AND THE ROW CARRIES A SECOND ONE. Bar length is
// rows on this page, which is always a real count. Feed health - did the
// source answer in the last collection run - is a separate fact, carried by
// the status glyph on every row and by a dashed outline over the whole track
// when the source is dark. The two are deliberately not merged, because a
// source can be dark right now and still account for a quarter of the list.
//
// When a source has no rows here the track says WHICH nothing it is, in words,
// because three different situations all print 0 and they are not the same:
//   answered, ranked nothing in     the feed is fine, nothing of its made the cut
//   answered with nothing at all    the publisher is quiet, which is a finding
//   did not answer                  we have no reading of the feed this run
// ---------------------------------------------------------------------------

const YIELD_SM = { w: 352, rowH: 26, top: 32, bottom: 20, nameW: 104, valW: 34, fs: 9.5, fsv: 10.5, barH: 11, wide: false, tips: false };
const YIELD_LG = { w: 640, rowH: 28, top: 36, bottom: 24, nameW: 152, valW: 44, fs: 11, fsv: 12, barH: 13, wide: true, tips: true };

function sourceYield(news, corpus) {
  const rows = corpus.sources;
  if (!rows.length) {
    return '<p class="nkey">news.json reports no per-source health, so there is no yield to draw.</p>';
  }

  const axis = niceCeiling(Math.max(...rows.map((r) => r.onPage)), 4);

  const withRows = rows.filter((r) => r.onPage > 0);
  const silent = rows.filter((r) => r.onPage === 0);
  const dark = rows.filter((r) => r.health === 'dark');
  const quiet = rows.filter((r) => r.health === 'quiet');
  const darkWithRows = dark.filter((r) => r.onPage > 0);
  const totalOnPage = rows.reduce((a, r) => a + r.onPage, 0);

  const title = `How the ${totalOnPage} items on this page divide between ${rows.length} sources`;
  const desc =
    `Ranked by how many of this page's ${totalOnPage} rows each source accounts for. ` +
    (withRows.length
      ? `${withRows.map((r) => `${r.id} ${r.onPage}`).join(', ')}. `
      : 'No source has a row on this page. ') +
    (silent.length
      ? `With no rows here: ${silent.map((r) => `${r.id} (${
        r.health === 'dark' ? 'did not answer'
          : r.health === 'quiet' ? 'answered with nothing in the window'
            : 'answered, ranked nothing in'})`).join(', ')}. `
      : '') +
    (dark.length
      ? `${dark.length} source${dark.length === 1 ? ' is' : 's are'} dark and drawn with a dashed ` +
        `track: ${dark.map((r) => r.id).join(', ')}. ` +
        (darkWithRows.length
          ? 'A dark source can still account for rows already collected earlier in the window, ' +
            'and those rows are counted here. '
          : '')
      : '') +
    'Bar length is rows on this page. It is not the per-source fetch count on the strip below, ' +
    'which measures the last collection run.';

  const lead = withRows[0] || null;
  const capBits = [];
  capBits.push(lead
    ? `${lead.id} accounts for ${lead.onPage} of ${totalOnPage} rows`
    : 'no source has a row on this page');
  capBits.push(`${withRows.length} of ${rows.length} sources are represented`);
  if (quiet.length) capBits.push(`${quiet.length} answered with nothing in the window`);
  if (dark.length) {
    capBits.push(`${dark.length} dark, drawn dashed` +
      (darkWithRows.length ? ` (${darkWithRows.length} of them still account for rows collected earlier)` : ''));
  }
  if (corpus.unlisted.length) {
    capBits.push(`${corpus.unlisted.length} source${corpus.unlisted.length === 1 ? '' : 's'} on the list report no health row (${corpus.unlisted.join(', ')})`);
  }
  const caption = `${capBits.join(' · ')}. Bar length is rows on this page — not the ` +
    'per-source fetch count on the strip underneath, which measures the last collection run.';

  const key = `${axis.top}|${rows.map((r) => `${r.id}:${r.health}:${r.onPage}`).join(',')}`;
  const id = hashId('ny', key);

  const sm = seal(yieldPlot(rows, axis, YIELD_SM, `${id}ts`, `${id}ds`, 'ch__svg--sm'), title, desc);
  const lg = seal(yieldPlot(rows, axis, YIELD_LG, `${id}tl`, `${id}dl`, 'ch__svg--lg'), title, desc);
  return figure('ch--nyield', sm + lg, caption);
}

// Same three glyphs the freshness strip and the source chips use, so a reader
// who has learnt them once has learnt them everywhere on the site.
const YIELD_DOT = { ok: '●', quiet: '◐', dark: '○' };
const YIELD_WORD = { ok: 'answered', quiet: 'answered with nothing in the window', dark: 'did not answer' };

/** Why a source has no rows here - which is three different facts, not one. */
function silentWord(r, wide) {
  if (r.health === 'dark') {
    return wide
      ? `DARK · ${r.error ? r.error.slice(0, 30) : 'did not answer'}`
      : 'DARK';
  }
  if (r.health === 'quiet') {
    return wide ? 'NONE IN WINDOW · answered, carried nothing' : 'NONE IN WINDOW';
  }
  return wide ? 'NONE ON THIS PAGE · answered, ranked nothing in' : 'NONE HERE';
}

function yieldPlot(rows, axis, g, tid, did, variantCls) {
  const h = g.top + rows.length * g.rowH + g.bottom;
  const trackX = g.nameW;
  const trackW = g.w - g.nameW - g.valW;
  const wFor = (v) => (clamp(v, 0, axis.top) / axis.top) * trackW;

  let out = openSvg(`ch__svg--nyield ${variantCls}`, g.w, h, tid, did);

  // Scale ticks along the top, so the bars are read against a stated axis
  // rather than only against each other.
  out += textAt('ch-ax', 0, g.top - 20, 'start', g.fs, 'SOURCE');
  for (let v = 0; v <= axis.top; v += axis.step) {
    const x = trackX + wFor(v);
    out += textAt('ch-ax', x, g.top - 20, v === 0 ? 'start' : v === axis.top ? 'end' : 'middle', g.fs, String(v));
    out += `<line class="ch-axline" x1="${n2(x)}" y1="${n2(g.top - 15)}" x2="${n2(x)}" y2="${n2(g.top + rows.length * g.rowH)}"/>`;
  }
  out += textAt('ch-ax', g.w, g.top - 20, 'end', g.fs, g.wide ? 'ROWS ON THIS PAGE' : 'ROWS');

  rows.forEach((r, i) => {
    const mid = g.top + i * g.rowH + g.rowH / 2;
    const barY = mid - g.barH / 2;

    out += textAt('ch-r-glyph', 1, mid + 3.5, 'start', g.fs, YIELD_DOT[r.health] || '○');
    out += textAt('ch-r-name nyg__name', g.wide ? 13 : 11, mid + 3.5, 'start', g.fs, r.id);
    out += `<rect class="ch-r-track" x="${n2(trackX)}" y="${n2(barY)}" width="${n2(trackW)}" height="${g.barH}"/>`;

    if (r.onPage > 0) {
      const w = Math.max(1.5, wFor(r.onPage));
      const tip = g.tips
        ? `<title>${esc(`${r.id}: ${r.onPage} rows on this page · feed ${YIELD_WORD[r.health]} in the last collection run`)}</title>`
        : '';
      out += `<rect class="ch-r-bar" x="${n2(trackX)}" y="${n2(barY)}" width="${n2(w)}" height="${g.barH}">${tip}</rect>`;
      // A tick at the bar's end gives the value a hard edge to read against at
      // low contrast, and survives a greyscale screenshot where the fill does
      // not.
      out += `<line class="ch-r-cap" x1="${n2(trackX + w)}" y1="${n2(barY - 2)}" x2="${n2(trackX + w)}" y2="${n2(barY + g.barH + 2)}"/>`;
    } else {
      out += textAt('ch-r-nonet', trackX + 5, mid + 3, 'start', g.fs - 1, silentWord(r, g.wide));
    }

    // Dark is a property of the FEED, so the dashed outline goes over the whole
    // track whether or not there is a bar underneath it. With a bar, it reads
    // as "these rows are here, the feed is not answering now" - which is the
    // true state and the one a single merged enum got wrong.
    if (r.health === 'dark') {
      out += `<rect class="ch-r-none" x="${n2(trackX)}" y="${n2(barY)}" width="${n2(trackW)}" height="${g.barH}"/>`;
    }

    // Always the real count, including for a dark source: how many of its rows
    // are on this page is something we measured by looking at the page, not
    // something the feed had to tell us.
    out += textAt(r.onPage > 0 ? 'ch-r-val' : 'ch-r-val ch-r-val--none',
      g.w - 1, mid + 3.5, 'end', g.fsv, String(r.onPage));
  });

  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// THE CORPUS SECTION
// ---------------------------------------------------------------------------

function corpusSection(news, corpus) {
  if (!corpus.total) {
    return `<section class="sec ncorp" aria-labelledby="corp-h">
  <h2 class="sec__h" id="corp-h">The shape of this window</h2>
  <p class="nkey">No items in the collection window, so there is no distribution to draw.
     This is a measured zero and not an outage &mdash; the per-source strip below says which
     feeds answered and which did not.</p>
</section>`;
  }

  return `<section class="sec ncorp" aria-labelledby="corp-h">
  <h2 class="sec__h" id="corp-h">The shape of this window</h2>
  <p class="nkey">Bar height is a <b>count of items</b>; position along the axis is the
     <b>score</b> those items were given. Each bar is stacked by pillar, bottom to top, in the
     order printed in the key below it.</p>
  ${scoreHistogram(corpus)}
  ${pillarKey(corpus)}
  ${distribution(news)}
  ${tierStrip(corpus)}
</section>`;
}

/**
 * The key for the stack. Every pillar gets its sigil, its full name, its count,
 * its share and the real span of scores it occupies - so the stack can be read
 * without resolving a single hue, which is the whole requirement.
 */
function pillarKey(corpus) {
  if (!corpus.pillars.length) return '';
  const items = corpus.pillars.map((p, i) => {
    const span = p.lo === null
      ? 'no scored item'
      : p.lo === p.hi ? `all at ${num(p.lo, 1)}` : `${num(p.lo, 1)}–${num(p.hi, 1)}`;
    const pct = Math.round((p.count / corpus.total) * 100);
    return `<li class="nlg__i" data-pillar="${esc(p.id)}">
      <span class="nlg__ord num" aria-hidden="true">${i + 1}</span>
      ${pillarSigil(p.id)}
      <b class="nlg__n">${esc(p.name)}</b>
      <span class="nlg__c num">${esc(p.count)}</span>
      <span class="nlg__pct num">${esc(pct)}%</span>
      <span class="nlg__sp num">${esc(span)}</span>
    </li>`;
  }).join('');

  return `<ul class="nlg">
    <li class="nlg__h">Stacked bottom to top &middot; count &middot; share of window &middot; score span</li>
    ${items}
  </ul>`;
}

/**
 * Pillar mix as a single stacked bar. Server-rendered spans, no chart library,
 * no canvas - it is in the HTML and it is in the screenshot. The bar is
 * labelled as an image with the actual counts, and the key directly above it
 * carries every number, so no reader ever has to decode a colour to use it.
 */
function distribution(news) {
  const present = pillarsPresent(news);
  if (!present.length || !news.total) return '';

  const label = present.map((p) => `${p.name} ${news.byPillar[p.id]}`).join(', ');

  const segs = present.map((p) => {
    const pct = (news.byPillar[p.id] / news.total) * 100;
    return `<span data-pillar="${esc(p.id)}" style="--w:${pct.toFixed(3)}%" ` +
      `title="${esc(`${p.name}: ${news.byPillar[p.id]} of ${news.total}`)}"></span>`;
  }).join('');

  return `<div class="ndist" role="img" aria-label="${esc(`Items by pillar: ${label}. ${news.total} in total.`)}">${segs}</div>`;
}

/**
 * The items the severity machinery fired on, as jump links.
 *
 * This answers the "legible from across the room" requirement twice: once here,
 * as a block near the top of the page that names every banded item and links to
 * its row, and once in the list itself where those rows carry a banner. The
 * terms printed are the strings the collector matched - never a paraphrase and
 * never a severity sentence we wrote.
 */
function tierStrip(corpus) {
  if (!corpus.banded.length) {
    return `<p class="nkey ntier__none">No item in this window fired an incident term.
       That is a measured absence, not a gap in collection.</p>`;
  }

  const counts = ['A', 'B', 'C']
    .filter((b) => corpus.bandCount[b] > 0)
    .map((b) => `${corpus.bandCount[b]} at tier ${b}`)
    .join(', ');

  const rows = corpus.banded.map((r) => {
    const it = r.item;
    const terms = r.sig.terms.length
      ? `<span class="ntier__t">${esc(r.sig.terms.join(' · '))}</span>`
      : '';
    const sev = r.sig.severity !== null
      ? `<span class="ntier__s num" title="incident severity as scored">sev ${esc(num(r.sig.severity, 2))}</span>`
      : '';
    const score = Number.isFinite(it.score)
      ? `<span class="ntier__sc num">${esc(num(it.score, 1))}</span>`
      : '<span class="ntier__sc num ntier__sc--none" title="this item carries no score">&mdash;</span>';
    return `<li class="ntier__i" data-band="${esc(r.sig.band)}">
      <a class="ntier__a" href="#${esc(it.anchor)}">
        <span class="ntier__b" aria-hidden="true">${esc(r.sig.band)}</span>
        <span class="vh">${esc(BAND_WORD[r.sig.band])}. </span>
        ${score}
        <span class="ntier__h">${esc(clip(it.title, 96))}</span>
      </a>
      ${terms}${sev}
    </li>`;
  }).join('');

  return `<section class="ntier" aria-labelledby="ntier-h">
  <h3 class="ntier__h3" id="ntier-h">Incident terms fired on ${esc(corpus.banded.length)} of
     ${esc(corpus.total)} items</h3>
  <p class="nkey">${esc(counts)}. Tier is the weight of the term that matched, not a judgement
     about the event &mdash; the matched words are printed beside each one. Every entry jumps to
     its row in the list.</p>
  <ol class="ntier__l">${rows}</ol>
</section>`;
}

// ---------------------------------------------------------------------------
// The pure-CSS filter
// ---------------------------------------------------------------------------
//
// Radio inputs, visually hidden with the site's own .vh (which uses clip, so
// they stay focusable and stay in the tab order), followed by a bar of <label>
// chips and then the list. The selector is
//
//   #nf-<id>:checked ~ .narch__list > .nrow:not([data-pillar="<id>"]) { display: none }
//
// which needs the inputs to be earlier siblings of the list - hence the flat
// structure inside <section> rather than a <fieldset>. No :has(), so this works
// everywhere, and no script, so it works in a prerender.
//
// "All" is checked by default on purpose: a crawler, a screenshot and a reader
// with CSS disabled all see every row.
//
// Two non-pillar filters were added this pass and they are the two questions a
// reader of a 200-row list actually has: which of these is corroborated, and
// which of these fired the severity machinery. Both are attribute filters on
// the same radio group, so they cost two more selectors and no script.

function pillarsPresent(news) {
  return brand.PILLARS.filter((p) => news.byPillar[p.id] > 0);
}

function filterInputs(news, corpus) {
  const ids = ['all', ...pillarsPresent(news).map((p) => p.id)];
  if (corpus.corroborated > 0) ids.push('corr');
  if (corpus.banded.length > 0) ids.push('tier');
  return ids.map((id) =>
    `<input class="vh nfin" type="radio" name="nf" id="nf-${esc(id)}"${id === 'all' ? ' checked' : ''}>`
  ).join('\n  ');
}

function filterBar(news, corpus) {
  const all = `<label class="nfchip" for="nf-all">` +
    `<span>All</span><b class="num">${esc(news.total)}</b></label>`;

  const chips = pillarsPresent(news).map((p) =>
    `<label class="nfchip" for="nf-${esc(p.id)}" data-pillar="${esc(p.id)}">` +
    `${pillarSigil(p.id)}<span>${esc(p.name)}</span><b class="num">${esc(news.byPillar[p.id])}</b></label>`
  ).join('');

  const extra = [];
  if (corpus.corroborated > 0) {
    extra.push(`<label class="nfchip nfchip--corr" for="nf-corr">${stackGlyph()}` +
      `<span>Multi-source</span><b class="num">${esc(corpus.corroborated)}</b></label>`);
  }
  if (corpus.banded.length > 0) {
    extra.push(`<label class="nfchip nfchip--tier" for="nf-tier">` +
      `<span class="nfchip__ab" aria-hidden="true">A/B/C</span>` +
      `<span>Incident term</span><b class="num">${esc(corpus.banded.length)}</b></label>`);
  }

  return `<div class="nfbar">${all}${chips}${extra.join('')}</div>`;
}

function listKey(corpus) {
  const bits = [`${corpus.total} row${corpus.total === 1 ? '' : 's'}`];
  if (corpus.carried) bits.push(`${corpus.carried} carried by more than one source`);
  if (corpus.clustered) bits.push(`${corpus.clustered} part of a story several sources ran`);
  if (corpus.banded.length) bits.push(`${corpus.banded.length} fired an incident term`);
  if (corpus.unscored.length) bits.push(`${corpus.unscored.length} carry no score`);
  return `<p class="nkey">${esc(bits.join(' · '))}. Flagged rows carry a banner above the
     headline; everything else is a plain row.</p>`;
}

/**
 * N stacked rules. The shape for "more than one source stands behind this",
 * used on the filter chip and on every corroborated row, so the fact has a
 * silhouette and not only a digit. Decorative: the number and the word are
 * always printed beside it.
 */
function stackGlyph(n = 3) {
  const bars = [];
  for (let i = 0; i < clamp(n, 1, 4); i += 1) {
    bars.push(`<rect x="0" y="${i * 3.5}" width="${10 - i * 2}" height="2" rx="0.5"/>`);
  }
  return `<svg class="nstk" viewBox="0 0 10 12" aria-hidden="true" focusable="false">${bars.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// THE LIST
// ---------------------------------------------------------------------------

/**
 * One row.
 *
 * feedRow() in news.mjs stays the single definition of what a row IS - the
 * homepage feed and this list must not drift apart. What happens here is
 * strictly additive: two attributes on the <li> for the filter and the weight
 * rules, and, on the minority of rows that carry a signal, a banner spliced in
 * ahead of the row's own grid so the grid itself is untouched.
 *
 * Both splice points are asserted rather than assumed. A silent no-op here
 * would mean the flags vanish while the build still passes, which is precisely
 * how this repo has ended up with modules that render nothing.
 */
function archiveRow(it) {
  const sig = signalsOf(it);
  const attrs = [` id="${esc(it.anchor)}"`];
  if (sig.band) attrs.push(` data-tier="${esc(sig.band)}"`);
  if (sig.carried || sig.story) {
    const n = Math.max(sig.carried ? sig.carried.count : 0, sig.story ? sig.story.count : 0);
    attrs.push(` data-corr="${esc(n)}"`);
  }

  let html = spliceOnce(feedRow(it), '<li class="nrow"', `<li class="nrow"${attrs.join('')}`);
  const banner = rowBanner(sig);
  if (banner) html = spliceOnce(html, '<div class="nrow__in">', `${banner}<div class="nrow__in">`);
  return html;
}

function spliceOnce(haystack, needle, replacement) {
  const at = haystack.indexOf(needle);
  if (at === -1) {
    throw new Error(
      `newsPage.archiveRow(): news.mjs feedRow() no longer emits ${JSON.stringify(needle)}. ` +
      'The row banner and the tier/corroboration filters attach to that string; fix this rather ' +
      'than letting them silently stop rendering.'
    );
  }
  if (haystack.indexOf(needle, at + needle.length) !== -1) {
    throw new Error(
      `newsPage.archiveRow(): ${JSON.stringify(needle)} appears more than once in one feedRow(), ` +
      'so the splice point is ambiguous.'
    );
  }
  return haystack.slice(0, at) + replacement + haystack.slice(at + needle.length);
}

/**
 * The banner above a flagged row.
 *
 * Only emitted for rows that have something to say, which is what keeps a
 * 200-row list dense: an ordinary row is byte-for-byte what it was before this
 * pass. Everything in it is a word or a number; the colour on the tier badge
 * only repeats what the letter already said.
 */
function rowBanner(sig) {
  const parts = [];

  if (sig.band) {
    const terms = sig.terms.length
      ? `<span class="nflag__t">${esc(sig.terms.join(' · '))}</span>`
      : '<span class="nflag__t nflag__t--none">term not recorded</span>';
    const sev = sig.severity !== null
      ? `<span class="nflag__s num">sev ${esc(num(sig.severity, 2))}</span>`
      : '';
    const strong = sig.strong ? '<span class="nflag__strong">STRONG</span>' : '';
    parts.push(`<span class="nflag__tier" data-band="${esc(sig.band)}">` +
      `<span aria-hidden="true">TIER ${esc(sig.band)}</span>` +
      `<span class="vh">${esc(BAND_WORD[sig.band])}</span></span>${terms}${sev}${strong}`);
  }

  if (sig.carried) {
    const who = sig.carried.sources.length
      ? `<span class="nflag__who">${esc(sig.carried.sources.join(', '))}</span>`
      : '';
    parts.push(`<span class="nflag__corr">${stackGlyph(sig.carried.count)}` +
      `<b>${esc(sig.carried.count)} sources carried this item</b></span>${who}`);
  }

  if (sig.story) {
    const who = sig.story.sources.length
      ? `<span class="nflag__who">${esc(sig.story.sources.join(', '))}</span>`
      : '';
    const also = Number.isFinite(sig.story.members) && sig.story.members > 1
      ? `<span class="nflag__also">${esc(sig.story.members)} items in the cluster</span>`
      : '';
    parts.push(`<span class="nflag__corr nflag__corr--story">${stackGlyph(sig.story.count)}` +
      `<b>${esc(sig.story.count)} sources ran this story</b></span>${who}${also}`);
  }

  if (!parts.length) return '';
  return `<p class="nflag">${parts.join('')}</p>`;
}

// Truncation on a word boundary, marked with a real ellipsis, so nobody can
// read a clipped headline as the whole of what the source said. Same rule as
// news.mjs clip(); repeated rather than exported because that file is another
// task's this pass.
function clip(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function collectionPage(ctx, news) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.NAME} AI signal feed`,
    url: ctx.url(PATH),
    description:
      `Every AI news item ${brand.NAME} scored in the current collection window, ranked by ` +
      'score, tagged to one of five pillars and linked to the source that carried it.',
    inLanguage: 'en',
    isAccessibleForFree: true,
    dateModified: news.generated_at,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
  };
}

/**
 * One ItemList for the page, each element a NewsArticle for the item.
 *
 * `url` points at the ORIGINAL source, never at us: we did not write these and
 * claiming authorship of a headline we merely counted would be the same species
 * of dishonesty as printing a confident number over a dead pipe. `publisher` is
 * the feed that carried it; `mainEntityOfPage` is our anchor, which is the
 * honest description of our role - we are the page that lists it.
 */
function itemList(ctx, news) {
  const base = ctx.url(PATH);
  const items = news.items.slice(0, JSONLD_MAX);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${brand.NAME} AI signal feed`,
    url: base,
    numberOfItems: news.total,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.map((it) => ({
      '@type': 'ListItem',
      position: it.rank,
      url: `${base}#${it.anchor}`,
      item: newsArticle(ctx, it, base),
    })),
  };
}

/**
 * Deliberately lean. An earlier version repeated every summary, language and
 * accessibility flag inside the graph and the two JSON-LD blocks came to 261 KB
 * on a 200-item page - larger than the page they described, for facts a crawler
 * can already read in the markup. What is left is what only the graph can say:
 * what this is, when it was published, who carried it and which pillar it feeds.
 */
function newsArticle(ctx, it, base) {
  const out = {
    '@type': 'NewsArticle',
    '@id': `${base}#${it.anchor}`,
    headline: it.title,
    datePublished: it.published_at,
    url: it.href || `${base}#${it.anchor}`,
    publisher: { '@type': 'Organization', name: it.source },
    about: { '@type': 'Thing', name: brand.pillarMeta(it.pillar).name },
  };
  if (it.entities.length) out.keywords = it.entities.join(', ');
  return out;
}

// ---------------------------------------------------------------------------
// CSS
//
// Shipped inside the page rather than in site/styles.mjs, matching what
// news.mjs already does: the news feature stays self-contained and can be added
// to or removed from a page without touching the global sheet. Every value
// below is an existing token, and no hex appears anywhere in this file - both
// colour schemes are handled because both schemes redefine the tokens.
//
// The chart classes are deliberately NOT redefined here: .ch, .ch__svg,
// .ch__cap, .ch-ax, .ch-axline, .ch-note and the whole .ch-r-* family come from
// styles.mjs and theme themselves.
// ---------------------------------------------------------------------------

function filterRules(present) {
  return present.map((p) => `
#nf-${p.id}:checked ~ .narch__list > .nrow:not([data-pillar="${p.id}"]) { display: none; }
#nf-${p.id}:checked ~ .nfbar .nfchip[for="nf-${p.id}"] { background: var(--bg-raised); border-color: var(--p, var(--accent)); color: var(--ink); }
#nf-${p.id}:checked ~ .nfbar .nfchip[for="nf-${p.id}"]::after { transform: scaleX(1); }
#nf-${p.id}:focus-visible ~ .nfbar .nfchip[for="nf-${p.id}"] { outline: 2px solid var(--accent); outline-offset: 2px; }`
  ).join('');
}

function archiveCss(present = brand.PILLARS) {
  return `
.narch__intro { padding: 26px 0 0; }
.narch__h1 { font-size: clamp(1.7rem, 7vw, 2.3rem); letter-spacing: -0.025em; margin: 0 0 12px; }
.narch__intro .lede { margin-bottom: 16px; }
.narch__intro .nhead { margin-top: 18px; }

/* ---- the corpus block -------------------------------------------------- */

.ncorp .ch { margin-top: 14px; }
.ncorp .ch__svg { margin-inline: auto; }

/* Bar segments. The hue is --p, inherited from the data-pillar attribute the
   global sheet keys on, so this file names no colour. The hairline stroke in
   the page background keeps two stacked segments from reading as one block in
   a greyscale screenshot - the same reason .ndist has one. */
.nhg__seg { fill: var(--p, var(--ink-dim)); stroke: var(--bg); stroke-width: 0.75; }
.nhg__val { fill: var(--ink); font-weight: 700; stroke: var(--bg); stroke-width: 3; paint-order: stroke fill; }
.nhg__base { stroke: var(--ink-faint); }
.nhg__axname { letter-spacing: 0.12em; }
.nhg__sevrule { stroke: var(--rule); stroke-width: 1; }
/* The tier marker. The LETTER underneath is the signal; these fills only agree
   with it, which is why C is deliberately just ink. */
.nhg__sev { fill: var(--ink-faint); }
.nhg__sev[data-band="A"] { fill: var(--dark-src); }
.nhg__sev[data-band="B"] { fill: var(--stale); }
.nhg__sevt { fill: var(--ink-dim); font-weight: 700; letter-spacing: 0.04em; }

/* Source yield. One bar per source, in _charts.mjs's own .ch-r-bar, so this
   chart needs exactly one rule of its own: the source id is a machine name and
   belongs in the mono face, not in .ch-r-name's sans. */
.nyg__name { font-family: var(--mono); font-weight: 500; letter-spacing: 0.02em; }

/* ---- the pillar key ---------------------------------------------------- */

.nlg { list-style: none; margin: 14px 0 0; padding: 0; border-top: 1px solid var(--rule); }
.nlg__h {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint); padding: 7px 2px 5px;
}
.nlg__i {
  display: grid; grid-template-columns: 1.8ch 14px minmax(0, 1fr) 4ch 4ch auto;
  align-items: center; gap: 8px; padding: 6px 2px; border-top: 1px solid var(--rule-soft);
}
.nlg__i svg { width: 13px; height: 13px; color: var(--p, var(--accent)); }
.nlg__ord { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); }
.nlg__n { font-size: var(--t-xs); font-weight: 600; color: var(--ink); overflow-wrap: anywhere; }
.nlg__c { font-family: var(--mono); font-size: var(--t-xs); font-weight: 700; color: var(--ink); text-align: right; }
.nlg__pct { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim); text-align: right; }
.nlg__sp { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); white-space: nowrap; }
@media (max-width: 460px) {
  .nlg__i { grid-template-columns: 1.8ch 14px minmax(0, 1fr) 4ch 4ch; row-gap: 2px; }
  .nlg__sp { grid-column: 3 / -1; }
}

.ndist {
  display: flex; height: 16px; width: 100%; overflow: hidden; margin-top: 12px;
  border: 1px solid var(--rule); border-radius: 2px; background: var(--bg-sunken);
}
.ndist span { display: block; width: var(--w, 0%); background: var(--p, var(--accent)); }
/* A hairline between segments so two adjacent hues never read as one block in
   a greyscale screenshot. The key above carries the sigils and counts, so the
   bar never has to be decoded on its own. */
.ndist span + span { border-left: 1px solid var(--bg); }

/* ---- the tier strip ---------------------------------------------------- */

.ntier {
  margin: 22px 0 0; padding: 12px 12px 4px; background: var(--bg-raised);
  border: 1px solid var(--rule); border-radius: var(--radius);
}
.ntier__h3 { font-size: var(--t-xs); font-weight: 600; letter-spacing: -0.01em; margin: 0 0 6px; }
.ntier__none { margin-top: 14px; }
.ntier__l { list-style: none; margin: 8px 0 0; padding: 0; }
.ntier__i {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px;
  padding: 6px 0; border-top: 1px solid var(--rule-soft);
}
.ntier__a { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex: 1 1 260px; text-decoration: none; color: inherit; }
.ntier__a:hover .ntier__h { text-decoration: underline; }
/* The band letter, boxed. A is the one that has to read from across the room,
   so it is the only one that inverts. */
.ntier__b {
  font-family: var(--mono); font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.08em;
  min-width: 18px; text-align: center; border-radius: 2px; padding: 1px 4px;
  border: 1px solid var(--ink-faint); color: var(--ink-dim); flex: 0 0 auto;
}
.ntier__i[data-band="A"] .ntier__b { background: var(--dark-src); border-color: var(--dark-src); color: var(--bg); }
.ntier__i[data-band="B"] .ntier__b { border-color: var(--stale); color: var(--stale); }
.ntier__sc { font-family: var(--mono); font-size: var(--t-xs); font-weight: 700; color: var(--ink); flex: 0 0 auto; }
.ntier__sc--none { color: var(--ink-faint); font-weight: 400; }
.ntier__h { font-size: var(--t-xs); line-height: 1.35; color: var(--ink); overflow-wrap: anywhere; }
.ntier__t, .ntier__s {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.04em; color: var(--ink-faint);
  border: 1px solid var(--rule); border-radius: 2px; padding: 1px 5px; white-space: nowrap;
}
.ntier__t { color: var(--ink-dim); white-space: normal; }

/* ---- filter chips ------------------------------------------------------ */

.nfbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
.nfchip {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.06em;
  border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 5px 9px; background: transparent; color: var(--ink-dim);
  cursor: pointer; user-select: none; white-space: nowrap;
  /* 44px of thumb is the whole point on a phone; the chip is 30px tall, so the
     rest comes from the row gap plus this. */
  min-height: 30px;
}
.nfchip:hover { color: var(--ink); border-color: var(--ink-faint); }
.nfchip svg { width: 12px; height: 12px; color: var(--p, var(--accent)); flex: 0 0 auto; }
.nfchip b { font-weight: 700; color: var(--ink-faint); font-size: var(--t-2xs); }
.nfchip__ab { font-weight: 700; color: var(--dark-src); letter-spacing: 0.02em; }
.nfchip--corr .nstk { color: var(--ink-dim); }
/* The selected chip is marked by an underline bar as well as by colour, so the
   filter state survives greyscale and colour blindness. */
.nfchip::after {
  content: ''; position: absolute; left: -1px; right: -1px; bottom: -1px; height: 2px;
  background: var(--p, var(--accent)); transform: scaleX(0); transform-origin: left;
}
#nf-all:checked ~ .nfbar .nfchip[for="nf-all"] { background: var(--bg-raised); border-color: var(--accent); color: var(--ink); }
#nf-all:checked ~ .nfbar .nfchip[for="nf-all"]::after { transform: scaleX(1); }
#nf-all:focus-visible ~ .nfbar .nfchip[for="nf-all"] { outline: 2px solid var(--accent); outline-offset: 2px; }
${filterRules(present)}

/* The two non-pillar filters. Same mechanism, different attribute. */
#nf-corr:checked ~ .narch__list > .nrow:not([data-corr]) { display: none; }
#nf-corr:checked ~ .nfbar .nfchip[for="nf-corr"] { background: var(--bg-raised); border-color: var(--accent); color: var(--ink); }
#nf-corr:checked ~ .nfbar .nfchip[for="nf-corr"]::after { transform: scaleX(1); }
#nf-corr:focus-visible ~ .nfbar .nfchip[for="nf-corr"] { outline: 2px solid var(--accent); outline-offset: 2px; }
#nf-tier:checked ~ .narch__list > .nrow:not([data-tier]) { display: none; }
#nf-tier:checked ~ .nfbar .nfchip[for="nf-tier"] { background: var(--bg-raised); border-color: var(--dark-src); color: var(--ink); }
#nf-tier:checked ~ .nfbar .nfchip[for="nf-tier"]::after { background: var(--dark-src); transform: scaleX(1); }
#nf-tier:focus-visible ~ .nfbar .nfchip[for="nf-tier"] { outline: 2px solid var(--accent); outline-offset: 2px; }

@media (prefers-reduced-motion: no-preference) {
  .nfchip::after { transition: transform 140ms ease-out; }
}

/* ---- flagged rows ------------------------------------------------------ */

.nstk { width: 10px; height: 12px; flex: 0 0 auto; fill: currentColor; }

/* The banner sits above the row's own grid, so the grid is untouched and an
   ordinary row is exactly as dense as it was before this existed. */
.nflag {
  display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
  margin: 0; padding: 7px 4px 1px 11px;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.04em;
  color: var(--ink-faint); line-height: 1.5;
}
.nflag__tier {
  font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.12em;
  border-radius: 2px; padding: 2px 6px;
  border: 1px solid var(--ink-faint); color: var(--ink-dim);
}
.nflag__tier[data-band="A"] { background: var(--dark-src); border-color: var(--dark-src); color: var(--bg); }
.nflag__tier[data-band="B"] { border-color: var(--stale); color: var(--stale); }
.nflag__t { color: var(--ink-dim); border: 1px solid var(--rule); border-radius: 2px; padding: 1px 5px; }
.nflag__t--none { font-style: italic; color: var(--ink-faint); }
.nflag__s, .nflag__also { color: var(--ink-faint); }
.nflag__strong {
  font-weight: 700; letter-spacing: 0.12em; color: var(--dark-src);
  border: 1px solid var(--dark-src); border-radius: 2px; padding: 1px 4px;
}
.nflag__corr {
  display: inline-flex; align-items: center; gap: 5px;
  color: var(--ink); border: 1px solid var(--rule); border-radius: 2px;
  padding: 2px 6px; background: var(--bg-sunken);
}
.nflag__corr b { font-size: var(--t-2xs); font-weight: 700; letter-spacing: 0.06em; }
.nflag__corr--story { background: transparent; }
.nflag__who { color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; max-width: 42ch; white-space: nowrap; }

/* Weight, applied to the whole row. The pillar rail keeps its hue and simply
   gets thicker - recolouring it by tier would have thrown away the pillar
   signal to say something the banner already says in words. */
.nrow[data-corr] { background: var(--wash-alt); }
.nrow[data-corr]::before { width: 3px; opacity: 0.9; }
.nrow[data-tier] { background: var(--wash); }
.nrow[data-tier]::before { width: 3px; opacity: 1; }
.nrow[data-tier="A"] { background: var(--wash-live); }
.nrow[data-tier="A"]::before { width: 5px; opacity: 1; }
.nrow[data-tier="A"] .nrow__h { font-size: var(--t-base); font-weight: 600; }
.nrow[data-tier]:hover, .nrow[data-corr]:hover { background: var(--bg-raised); }

@media (max-width: 400px) {
  .nflag { padding-left: 9px; gap: 4px; }
  .nflag__who { max-width: 24ch; }
}

/* The archive is long. Rows past the fold do not get the enter animation -
   staggering 400 of them would still be running a minute after the page
   settled. news.mjs only sets data-enter on the top rows, so this is belt and
   braces for a future change to that constant. */
.narch__list .nrow[data-enter="1"]:nth-child(n+16) { animation: none; }
.narch__list .nrow[data-enter="1"]:nth-child(n+16)::before { animation: none; }
`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs owns these calls)
//
//   import * as newsPage from './templates/newsPage.mjs';
//   written.push(await write(args.out, 'news.html', newsPage.render(ctx)));
//
// render(ctx) is safe to call unconditionally: with ctx.news null it emits a
// noindex "no window published" page. To omit the file entirely instead, guard
// with newsPage.hasNews(ctx).
//
// Also needs, and none of these is mine to edit:
//   layout.mjs NAV       add { href: '/news.html', label: 'News' }
//   sitemap.mjs          add /news.html, changefreq hourly, priority 0.8
//   news.mjs feedRow()   archiveRow() splices onto two literal strings in its
//                        output, `<li class="nrow"` and `<div class="nrow__in">`,
//                        and throws by name if either stops being emitted. If
//                        that file is refactored, the fix is one line here.
//   _charts.mjs          the two graphics on this page draw with its classes
//                        and repeat five of its module-private primitives
//                        (hashId, openSvg, seal, figure, textAt). If those are
//                        ever exported, delete the copies in the CHART
//                        PRIMITIVES block and import them instead.
// ---------------------------------------------------------------------------
