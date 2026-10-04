// /balance.html — BOTH AT ONCE. Harm and benefit, side by side, never summed.
//
// Reads data/balance.json (collector/balance.mjs) and data/ledger.json (the
// two hand-verified registers), plus ctx.news for the item pages the matched
// headlines link to and ctx.bliss for BLISS's source table. Server-rendered,
// deterministic: identical inputs produce byte-identical HTML. Nothing in this
// file reads a clock, and nothing on the page needs a script.
//
// ---------------------------------------------------------------------------
// WHY THIS PAGE IS ORDERED THE WAY IT IS
// ---------------------------------------------------------------------------
// The operator asked for the other viewpoint — AI solving problems, the utopia
// case — beside the doom case, and for "the balance of evil and good".
// docs/BALANCE.md answers with three layers and one refusal, and the page
// prints them in the order a hostile reader would check them:
//
//   1. The beam, and the ONE pair of counts allowed to tilt it (newsroom
//      stories in harm language only against benefit language only), with its
//      rule printed under it and the stories on neither list printed every
//      time.
//   2. Every headline behind those counts, with the matched words marked, so
//      a reader can audit the lexicon one headline at a time. Headlines the
//      rule set aside are listed too: a rule that is only ever shown firing is
//      a rule nobody can check.
//   3. The two registers, side by side: dated, sourced rows, each carrying
//      what was measured beside what is claimed about it.
//   4. Six live counters from other people's registries, each in its own unit
//      and window, never paired across the two sides.
//   5. SIREN and BLISS as context, in their three states.
//   6. What none of this can say, the lexicons in full, and the files.
//
// The refusal: nothing is summed, netted, subtracted or divided across the two
// sides, anywhere on the page. A fraud loss in dollars and a trial in patients
// share no unit, and an exchange rate between them would be a value judgement
// presented as arithmetic. "Evil" and "good" are never the name of a side; the
// operator's own words survive only as the house names of the two registers,
// which name an argument and not an outcome (docs/WORDING.md rule 3).
//
// ---------------------------------------------------------------------------
// MISSING IS A STATE
// ---------------------------------------------------------------------------
// Every figure is read from one of the two files. A value that is absent is
// printed as words ("not in the file", "no value", "dark"), never as a zero
// and never as the last build's figure. A benefit count of 0 is a MEASURED
// zero — the list exists and was applied — and prints as 0 with a sentence
// saying so.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';
import { iconSprite, icon, stateIcon } from './_icons.mjs';
import {
  hasBalance, model, scaleSvg, captionHtml, balanceCss, SIDES, STRENGTH,
} from './_balance.mjs';

const PATH = '/balance.html';

const SPRITE = ['sec-signal', 'sec-archive', 'sec-history', 'sec-bliss', 'sec-method', 'sec-api',
  'state-live', 'state-dark', 'state-awaiting'];

const SIDE_NAME = Object.freeze({ benefit: 'Benefit', harm: 'Harm' });
const LIST_NAME = Object.freeze({ benefit: 'the benefit list', harm: 'the harm list' });
const CASE_NAME = Object.freeze({ benefit: 'The utopia case', harm: 'The doom case' });

// Max Roser, Our World in Data. The title is quoted because it is the title
// of the cited work; everything else about it on this page is paraphrase.
// Wording and dates as the framing research confirmed them on 2026-09-28.
const ROSER = Object.freeze({
  title: 'The world is awful. The world is much better. The world can be much better.',
  url: 'https://ourworldindata.org/much-better-awful-can-be-better',
  credit: 'Max Roser, Our World in Data, first published 2018, revised 2022 and 2024, CC BY',
});

/**
 * THE ROUTE GATE. The same predicate as _balance.mjs hasBalance(), so the
 * homepage module and the page it links to can never disagree about whether
 * there is a page. build.mjs should gate public/balance.html on this.
 */
export function hasBalancePage(ctx) {
  return hasBalance(ctx);
}

// ---------------------------------------------------------------------------
// Formatting. Longhand, locale-free.
// ---------------------------------------------------------------------------

function group(intText) {
  return intText.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A count, or the words given for its absence. */
function count(v, missing = 'not in the file') {
  if (!Number.isFinite(v)) return missing;
  const body = group(String(Math.round(Math.abs(v))));
  return v < 0 ? `−${body}` : body;
}

/** A measured value at a precision that suits it: counts grouped, shares to four places. */
function measured(v) {
  if (!Number.isFinite(v)) return null;
  if (Number.isInteger(v)) return count(v);
  if (Math.abs(v) < 1) return v.toFixed(4);
  const [i, f] = v.toFixed(2).split('.');
  return `${group(i)}.${f}`;
}

/** A UTC stamp, or the words. */
function stamp(iso, missing = 'an unrecorded time') {
  if (typeof iso !== 'string' || !Number.isFinite(Date.parse(iso))) return missing;
  return utc(iso);
}

const plural = (n, one, many) => (n === 1 ? one : many);

/** An array from the file, or an empty one. Never a guessed list. */
const arr = (v) => (Array.isArray(v) ? v : []);

// ---------------------------------------------------------------------------
// Marking matched words in a headline
// ---------------------------------------------------------------------------

/**
 * The headline as collector/news-stories.mjs wordSequence() sees it —
 * lower-cased, accent-folded, split on anything that is not a letter or a
 * digit — with each word's span in the ORIGINAL string, so a match can be
 * wrapped in <mark> without re-typing a character of the headline. Folding
 * is per code point; a combining mark that folds to nothing stays inside the
 * word it follows. The harness checks the word list against wordSequence()
 * for every headline in the window.
 */
export function wordSpans(text) {
  const s = String(text ?? '');
  const out = [];
  let cur = null;
  let i = 0;
  for (const ch of s) {
    const start = i;
    i += ch.length;
    const f = ch.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    if (f === '') {
      if (cur) cur.end = i;
      continue;
    }
    for (const c of f) {
      if (/[a-z0-9]/.test(c)) {
        if (!cur) cur = { w: '', start, end: i };
        cur.w += c;
        cur.end = i;
      } else if (cur) {
        out.push(cur);
        cur = null;
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Character ranges of every occurrence of `terms` in `text`, skipping an
 * occurrence with a negator within `reach` words before it — the collector's
 * rule, so a word the rule ignored is not marked as if it had counted.
 */
export function termRanges(text, terms, { negators = [], reach = 0 } = {}) {
  const spans = wordSpans(text);
  const words = spans.map((s) => s.w);
  const ranges = [];
  for (const term of terms) {
    const tw = String(term).split(' ').filter(Boolean);
    if (!tw.length) continue;
    for (let i = 0; i + tw.length <= words.length; i++) {
      let hit = true;
      for (let k = 0; k < tw.length; k++) if (words[i + k] !== tw[k]) { hit = false; break; }
      if (!hit) continue;
      let negated = false;
      for (let k = 1; k <= reach && i - k >= 0; k++) if (negators.includes(words[i - k])) { negated = true; break; }
      if (!negated) ranges.push([spans[i].start, spans[i + tw.length - 1].end]);
    }
  }
  return ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** The headline, escaped, with each range wrapped in a <mark> for its side. */
function markedTitle(text, marks) {
  const s = String(text ?? '');
  const all = [];
  for (const { side, ranges } of marks) for (const [a, b] of ranges) all.push({ a, b, side });
  all.sort((x, y) => x.a - y.a || x.b - y.b || (x.side < y.side ? -1 : x.side > y.side ? 1 : 0));
  let out = '';
  let at = 0;
  for (const r of all) {
    if (r.a < at) continue; // overlaps a mark already placed
    out += esc(s.slice(at, r.a));
    out += `<mark class="bp__m" data-side="${esc(r.side)}">${esc(s.slice(r.a, r.b))}</mark>`;
    at = r.b;
  }
  return out + esc(s.slice(at));
}

// ---------------------------------------------------------------------------
// Section: the beam
// ---------------------------------------------------------------------------

function beamSection(ctx, b, m) {
  const nr = b.newsroom || {};
  const st = nr.stories || null;
  const it = nr.items || null;
  const w = nr.window || {};
  const br = b.beam_rule || {};
  const row = (label, key, note) => `<tr>
      <th scope="row">${label}</th>
      <td class="num">${st ? esc(count(st[key])) : 'not in the file'}</td>
      <td class="num">${it ? esc(count(it[key])) : 'not in the file'}</td>
      <td class="bp__tnote">${note}</td>
    </tr>`;
  const kinds = nr.not_scanned && nr.not_scanned.by_kind && typeof nr.not_scanned.by_kind === 'object'
    ? Object.keys(nr.not_scanned.by_kind).sort().map((k) => `${esc(k)} ${count(nr.not_scanned.by_kind[k])}`).join(', ')
    : null;
  const never = arr(br.never_on).map((s) => `<li>${esc(s)}</li>`).join('');

  return `<section class="bp__sec" id="the-beam" aria-labelledby="bp-beam-h">
  <h2 class="bp__h" id="bp-beam-h">${icon('sec-signal')} What the newsroom’s headlines carried<span class="sec__eb">The beam</span></h2>
  <p class="bp__l bp__l--lead">${m.sentence ? esc(m.sentence)
    : `The newsroom window is dark this build${m.error ? `: ${esc(m.error)}` : ''}. No story is counted on either side and the beam is drawn level.`}</p>
  <figure class="bp__fig">
    ${scaleSvg(m, { size: 'page', id: 'bpl', className: 'bp__svg--wide' })}
    ${scaleSvg(m, { size: 'module', id: 'bps', className: 'bp__svg--narrow' })}
    <figcaption class="bp__cap">${captionHtml(m)}</figcaption>
  </figure>

  <p class="bp__tcap" id="bp-cap-counts">Every scanned headline lands in exactly one row. A story is a
    cluster of headlines about one event, so syndicated coverage cannot fill a pan three times; the beam
    tilts on the first two rows of the stories column and on nothing else.</p>
  <div class="bp__tw">
    <table class="bp__t" aria-describedby="bp-cap-counts">
      <thead><tr><th scope="col">Matched</th><th scope="col" class="num">Stories</th><th scope="col" class="num">Headlines</th><th scope="col">On the drawing</th></tr></thead>
      <tbody>
        ${row(`${esc(SIDE_NAME.harm)} list only`, 'harm_only', 'the right pan')}
        ${row(`${esc(SIDE_NAME.benefit)} list only`, 'benefit_only', 'the left pan')}
        ${row('Both lists', 'both', 'at the fulcrum; moves neither pan')}
        ${row('Neither list', 'neither', 'under the stand, every time')}
      </tbody>
      <tfoot>${row('Scanned', 'scanned', 'every headline of a scanned kind')}</tfoot>
    </table>
  </div>
  <p class="bp__n"><b>The window.</b> ${count(nr.items_in_window, 'An unrecorded number of')} items, published from
    ${esc(stamp(w.first_published_at))} to ${esc(stamp(w.last_published_at))}, a span of
    ${Number.isFinite(w.span_hours) ? `${esc(String(w.span_hours))} hours` : 'an unrecorded length'}. The file caps the window at
    ${count(w.max_items, 'an unrecorded number of')} items, nominally ${count(w.nominal_days, 'an unrecorded number of')} days, so its
    real span moves with how busy the news is, and any series built from these counts has to use shares, not raw counts.
    ${kinds ? `Not scanned, by kind: ${kinds}, ${count(nr.not_scanned.total)} in all, because vendor blogs never report their own harms and arXiv abstracts discuss attacks as subject matter.` : ''}
    ${it && Number.isFinite(it.hedged_headlines) ? `${count(it.hedged_headlines)} scanned ${plural(it.hedged_headlines, 'headline', 'headlines')} tripped the hedge rule.` : ''}</p>
  ${never ? `<h3 class="bp__h3">What the beam never tilts on</h3><ul class="bp__lim bp__lim--plain">${never}</ul>` : ''}
  ${br.print ? `<p class="bp__n"><b>What is printed.</b> ${esc(br.print)}.</p>` : ''}
</section>`;
}

// ---------------------------------------------------------------------------
// Section: the matches
// ---------------------------------------------------------------------------

function itemHrefs(ctx) {
  const map = new Map();
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
  for (const it of items) {
    if (it && it.id) map.set(String(it.id), ctx.href(`/item/${slugFor(it)}.html`));
  }
  return map;
}

/** Items -> stories, in the collector's order (newest first); one story, one entry. */
function storiesOf(items) {
  const order = [];
  const by = new Map();
  for (const x of items) {
    const key = x.story ? `s:${x.story}` : `i:${x.id}`;
    if (!by.has(key)) { by.set(key, []); order.push(key); }
    by.get(key).push(x);
  }
  return order.map((k) => by.get(k));
}

function hitWords(x, side) {
  const h = x.hits && x.hits[side] ? x.hits[side] : { title: [], summary: [] };
  const parts = [];
  if (arr(h.title).length) parts.push(`headline: ${arr(h.title).map((t) => `<mark class="bp__m bp__m--w" data-side="${side}">${esc(t)}</mark>`).join(' ')}`);
  if (arr(h.summary).length) parts.push(`summary: ${arr(h.summary).map((t) => `<mark class="bp__m bp__m--w" data-side="${side}">${esc(t)}</mark>`).join(' ')}`);
  return parts.join(' · ');
}

function headline(x, side, hrefs, lex) {
  const sides = side === 'aside' ? [] : [side];
  const marks = sides.map((s) => ({ side: s, ranges: termRanges(x.title, arr(x.hits && x.hits[s] && x.hits[s].title), lex) }));
  const inner = markedTitle(x.title || 'untitled item', marks);
  const own = hrefs.get(String(x.id));
  const link = own
    ? `<a class="bp__it__a" href="${esc(own)}">${inner}</a>`
    : x.url ? `<a class="bp__it__a" href="${esc(x.url)}" rel="noopener">${inner}</a>` : inner;
  const orig = own && x.url ? ` · <a href="${esc(x.url)}" rel="noopener">original</a>` : '';
  return `${link}<span class="bp__it__m">${esc(x.source || 'source not recorded')} ·
      <time datetime="${esc(x.published_at || '')}">${esc(stamp(x.published_at, 'no publication time'))}</time>${orig}</span>`;
}

function matchColumn(side, items, b, hrefs, lex) {
  const stories = storiesOf(items);
  const st = b.newsroom && b.newsroom.stories ? b.newsroom.stories : null;
  const listCount = st ? st[`${side}_list`] : null;
  const scanned = st ? st.scanned : null;
  const body = stories.length
    ? `<ol class="bp__its">${stories.map((members) => {
      const [lead, ...rest] = members;
      return `<li class="bp__it">
        <p class="bp__it__t">${headline(lead, side, hrefs, lex)}</p>
        <p class="bp__it__h">${hitWords(lead, side)}</p>
        ${rest.length ? `<ul class="bp__it__also">${rest.map((x) => `<li>${headline(x, side, hrefs, lex)}<span class="bp__it__h">${hitWords(x, side)}</span></li>`).join('')}</ul>` : ''}
      </li>`;
    }).join('')}</ol>`
    : `<p class="bp__empty">No story in this window matched ${LIST_NAME[side]}${Number.isFinite(scanned) ? `, of ${count(scanned)} scanned` : ''}.
        That is a measured zero: the list exists, it is printed in full below, and it was applied to every
        scanned headline by the same rule as the other side.</p>`;
  return `<div class="bp__col" data-side="${side}">
    <h3 class="bp__colh">${esc(SIDE_NAME[side])} language<span class="bp__eb">${Number.isFinite(listCount) ? `${count(listCount)} ${plural(listCount, 'story', 'stories')}` : 'count not in the file'}</span></h3>
    ${body}
  </div>`;
}

function matchesSection(ctx, b, m) {
  const nr = b.newsroom || {};
  if (m.state !== 'live' || !nr.matched) {
    return `<section class="bp__sec" id="the-matches" aria-labelledby="bp-match-h">
  <h2 class="bp__h" id="bp-match-h">${icon('sec-signal')} Every headline that matched a list<span class="sec__eb">The matches</span></h2>
  <p class="bp__l">The newsroom window is dark this build, so there are no matches to list. Nothing from an earlier window is shown in its place.</p>
</section>`;
  }
  const hrefs = itemHrefs(ctx);
  const lx = b.lexicon || {};
  const lex = { negators: arr(lx.negators), reach: Number.isInteger(lx.negation_reach_words) ? lx.negation_reach_words : 0 };
  const aside = arr(nr.neither).filter((x) => x && x.set_aside);
  return `<section class="bp__sec" id="the-matches" aria-labelledby="bp-match-h">
  <h2 class="bp__h" id="bp-match-h">${icon('sec-signal')} Every headline that matched a list<span class="sec__eb">The matches</span></h2>
  <p class="bp__l">Newest first. The marked words are the ones the rule counted; a word with “no”, “not” or
    “never” just before it was ignored and is not marked. Each headline links to its scored item page on this
    site where one exists, and to the original otherwise. A headline is reproduced exactly as published.</p>
  <div class="bp__cols">
    ${SIDES.map((side) => matchColumn(side, arr(nr.matched[side]), b, hrefs, lex)).join('')}
  </div>
  ${aside.length ? `<h3 class="bp__h3">Set aside by the rule, with a list word in them: ${count(aside.length)}</h3>
  <p class="bp__l">These carried a word from one of the lists and still counted on neither side. They are listed
    so the rule can be checked in the direction that does not flatter it.</p>
  <ul class="bp__aside">${aside.map((x) => `<li>
    <p class="bp__it__t">${headline(x, 'aside', hrefs, lex)}</p>
    <p class="bp__it__h"><b>${esc(x.set_aside)}</b>${['harm', 'benefit'].map((s) => {
      const h = x.hits && x.hits[s] ? [...arr(x.hits[s].title), ...arr(x.hits[s].summary)] : [];
      return h.length ? ` · ${s} words found: ${esc([...new Set(h)].sort().join(', '))}` : '';
    }).join('')}${arr(x.negated).length ? ` · negated: ${esc(arr(x.negated).map((n) => `“${n.by} ${n.term}”`).join(', '))}` : ''}</p>
  </li>`).join('')}</ul>` : ''}
</section>`;
}

// ---------------------------------------------------------------------------
// Section: the registers
// ---------------------------------------------------------------------------

function statusOrder(side, words) {
  const known = [...(STRENGTH[side] || []), ...(side === 'benefit' ? ['claimed'] : [])];
  const extra = Object.keys(words || {}).filter((k) => !known.includes(k)).sort();
  return [...known.filter((k) => words && Object.prototype.hasOwnProperty.call(words, k)), ...extra];
}

/**
 * One register row. Everything a reader checks is open: the title, the status
 * word and what it means, confidence, the as-of date, every sourced number and
 * the claim made about it. The measurement paragraph and the caveat, a median
 * of 553 and 378 characters across the 36 rows, sit in a native <details>:
 * printed open they made this section 15,454px tall at 1280 wide, measured,
 * which buries the second register under the first. <details> needs no script
 * and the text stays in the served HTML for a crawler and for find-in-page.
 */
function registerEntry(r, side, glosses) {
  const nums = arr(r.numbers).map((n) => `<li><b class="bp__v">${esc(n.value ?? 'no value')}</b>
      <span class="bp__u">${esc(n.unit || 'unit not recorded')}</span>
      <span class="bp__nd">${esc(n.date || 'undated')}${n.source_url ? ` · <a href="${esc(n.source_url)}" rel="noopener">source</a>` : ' · no source'}</span></li>`).join('');
  const srcs = arr(r.sources).map((u, i) => `<a href="${esc(u)}" rel="noopener" title="${esc(u)}">${i + 1}</a>`).join(' ');
  return `<article class="bp__row" id="reg-${esc(r.id)}" data-side="${side}">
    <h4 class="bp__row__t">${esc(r.title || 'untitled row')}</h4>
    <p class="bp__row__s"><b class="bp__stw">${esc(r.status || 'no status')}</b>
      <span>${esc((glosses && glosses[r.status]) || 'no definition published')}</span></p>
    <p class="bp__row__meta">${esc(r.domain || 'no domain')} · confidence <b>${esc(r.confidence || 'not stated')}</b> · as of ${esc(r.as_of || 'an unrecorded date')}</p>
    ${nums ? `<ul class="bp__nums">${nums}</ul>` : '<p class="bp__row__meta">No sourced number in this row.</p>'}
    <dl class="bp__mc">
      <dt>What is claimed</dt><dd>${esc(r.what_is_claimed || 'not recorded')}</dd>
    </dl>
    <details class="bp__more">
      <summary>What was measured, in full${r.caveat ? ', and the caveat' : ''}</summary>
      <dl class="bp__mc">
        <dt>What was measured</dt><dd>${esc(r.what_is_measured || 'not recorded')}</dd>
        ${r.caveat ? `<dt>Caveat</dt><dd>${esc(r.caveat)}</dd>` : ''}
      </dl>
    </details>
    <p class="bp__srcs">Sources ${srcs || 'none listed'}</p>
  </article>`;
}

function registerColumn(side, L) {
  const rows = arr(L[side]);
  const t = L.totals && L.totals[side] ? L.totals[side] : null;
  const words = L.status_words && L.status_words[side] ? L.status_words[side] : {};
  const legend = statusOrder(side, words).map((k) => `<li><b>${esc(k)}</b>
      <span class="num">${t && t.by_status ? esc(count(t.by_status[k], '—')) : '—'}</span>
      <span class="bp__lg__g">${esc(words[k])}</span></li>`).join('');
  const conf = t && t.by_confidence
    ? Object.keys(t.by_confidence).sort().map((k) => `${count(t.by_confidence[k])} ${esc(k)}`).join(', ')
    : 'confidence not totalled';
  return `<div class="bp__col" data-side="${side}">
    <h3 class="bp__colh">${esc(SIDE_NAME[side])} register<span class="bp__eb">${esc(CASE_NAME[side])}</span></h3>
    <p class="bp__colsub">${count(rows.length)} ${plural(rows.length, 'row', 'rows')} · ${t ? count(t.numbers) : 'an untotalled number of'} sourced numbers · ${conf}</p>
    <ul class="bp__lg" aria-label="${esc(SIDE_NAME[side])} status words">${legend}</ul>
    ${rows.map((r) => registerEntry(r, side, words)).join('')}
  </div>`;
}

function registersSection(L) {
  const honesty = arr(L.honesty);
  // The equal-lengths line, if the file carries one, printed right where the
  // two row counts sit side by side — the place a reader would draw the wrong
  // conclusion from them.
  const equal = honesty.find((s) => /equal/i.test(String(s))) || null;
  return `<section class="bp__sec" id="the-registers" aria-labelledby="bp-reg-h">
  <h2 class="bp__h" id="bp-reg-h">${icon('sec-archive')} Documented results, both sides<span class="sec__eb">The registers</span></h2>
  <p class="bp__l bp__l--lead">${esc(L.what_this_is || 'Two registers, kept side by side.')}</p>
  <p class="bp__l">Checked by hand against every linked source as of <b>${esc(L.as_of_date || 'an unrecorded date')}</b>,
    in the register’s own order. Each row prints what was measured beside what is claimed about it; recording a
    claim is not endorsing it. ${equal ? esc(equal) : ''}</p>
  <div class="bp__cols bp__cols--reg">
    ${SIDES.map((side) => registerColumn(side, L)).join('')}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Section: the counters
// ---------------------------------------------------------------------------

const STATE_WORD = Object.freeze({ live: 'live', dark: 'dark', 'awaiting-baseline': 'awaiting baseline' });

/** Known meta fields, printed verbatim with a label. Anything else stays in the JSON. */
function counterMeta(c) {
  const m = c.meta || {};
  const out = [];
  if (c.id === 'fda-ai-enabled-devices') {
    if (m.newest_decision) out.push(`newest decision in the file ${esc(m.newest_decision)}`);
    if (m.file_last_modified) out.push(`file last modified ${esc(m.file_last_modified)}`);
    if (Number.isFinite(m.decisions_in_window)) out.push(`${count(m.decisions_in_window)} decisions in the 30-day window, because the list lags`);
  }
  if (c.id === 'cisa-kev-added-30d') {
    if (m.this_month && Number.isFinite(m.this_month.count)) out.push(`${count(m.this_month.count)} in calendar month ${esc(m.this_month.month || '')}`);
    if (m.catalog_version) out.push(`catalogue version ${esc(m.catalog_version)}`);
  }
  if (c.id === 'aiid-incidents-entered-30d') {
    if (Number.isFinite(m.incidents_total)) out.push(`${count(m.incidents_total)} incidents in the database`);
    if (arr(m.incidents_without_entry_date).length) out.push(`incidents ${esc(arr(m.incidents_without_entry_date).join(' and '))} have no entry date and are listed, not guessed`);
    if (m.newest_entry_day) out.push(`newest entry day ${esc(m.newest_entry_day)}`);
  }
  if (c.id === 'oecd-aim-incidents-30d') {
    if (m.classifier) out.push(`classified by ${esc(m.classifier)}`);
    if (m.newest_days_incomplete) out.push(esc(m.newest_days_incomplete));
  }
  if (c.id === 'clinicaltrials-ai-starts-30d' && m.filter_advanced) out.push(`filter <code class="bp__code">${esc(m.filter_advanced)}</code>`);
  return out.length ? `<p class="bp__ctr__meta">${out.join(' · ')}</p>` : '';
}

function counterCard(c) {
  const live = c.state === 'live' && Number.isFinite(c.value);
  const word = STATE_WORD[c.state] || String(c.state || 'state not recorded');
  const iconState = c.state === 'live' ? 'live' : c.state === 'awaiting-baseline' ? 'awaiting' : 'dark';
  const win = c.window && c.window.from && c.window.to
    ? `${esc(c.window.from)} to ${esc(c.window.to)}` : 'no window: a running total';
  const flags = [
    c.context_only ? 'context only' : null,
    c.ai_specific === false ? 'not AI-specific' : null,
  ].filter(Boolean);
  return `<article class="bp__ctr" data-state="${esc(c.state || 'unknown')}">
    <p class="bp__ctr__st">${stateIcon(iconState)} ${esc(word)}${flags.length ? ` · <b>${esc(flags.join(' · '))}</b>` : ''}</p>
    <h4 class="bp__ctr__l">${esc(c.label || c.id || 'unnamed counter')}</h4>
    <p class="bp__ctr__v">${live ? `<b class="num">${esc(measured(c.value))}</b> ${esc(c.unit || '')}`
      : `<b>no value</b> ${c.error ? `<span class="bp__err">${esc(c.error)}</span>` : ''}`}</p>
    <p class="bp__ctr__w">${win}</p>
    <dl class="bp__mc bp__mc--ctr">
      <dt>Counts</dt><dd>${esc(c.counts || 'not recorded')}</dd>
      <dt>Does not count</dt><dd>${esc(c.does_not_count || 'not recorded')}</dd>
    </dl>
    ${counterMeta(c)}
    ${c.endpoint ? `<p class="bp__ctr__e"><a href="${esc(c.endpoint.replace('{from}', (c.window && c.window.from) || '').replace('{to}', (c.window && c.window.to) || ''))}" rel="noopener">endpoint</a>${c.keyless ? ' · keyless' : ''}</p>` : ''}
  </article>`;
}

function countersSection(b) {
  const cs = b.counters || null;
  if (!cs) {
    return `<section class="bp__sec" id="the-counters" aria-labelledby="bp-ctr-h">
  <h2 class="bp__h" id="bp-ctr-h">${icon('sec-history')} Counters from public registries<span class="sec__eb">The counters</span></h2>
  <p class="bp__l">No counter block in this build’s balance.json.</p>
</section>`;
  }
  const total = SIDES.reduce((n, s) => n + arr(cs[s]).length, 0);
  const w = cs.window || {};
  return `<section class="bp__sec" id="the-counters" aria-labelledby="bp-ctr-h">
  <h2 class="bp__h" id="bp-ctr-h">${icon('sec-history')} ${count(total)} counters from public registries<span class="sec__eb">The counters</span></h2>
  <p class="bp__l bp__l--lead">${count(cs.live, 'An unrecorded number')} live, ${count(cs.dark, 'an unrecorded number')} dark.
    Each is published as its publisher reports it, in its own unit and its own window, and none is set against
    any other: the page does not pair a harm counter with a benefit counter, and it adds nothing up.</p>
  <p class="bp__l">Window for the windowed ones: <b>${esc(w.from || 'unrecorded')} to ${esc(w.to || 'unrecorded')}</b>,
    ${esc(cs.window_rule || 'rule not recorded')}. A counter that failed is dark, with its error, and never a zero or an earlier run’s figure.</p>
  <div class="bp__cols">
    ${SIDES.map((side) => `<div class="bp__col" data-side="${side}">
      <h3 class="bp__colh">${esc(SIDE_NAME[side])} side<span class="bp__eb">${count(arr(cs[side]).length)} ${plural(arr(cs[side]).length, 'counter', 'counters')}</span></h3>
      ${arr(cs[side]).map(counterCard).join('') || '<p class="bp__empty">No counter on this side in this build.</p>'}
    </div>`).join('')}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Section: SIREN and BLISS
// ---------------------------------------------------------------------------

function indexCell(x, name) {
  if (!x) {
    return `<div class="bp__ix" data-state="dark"><p class="bp__ix__k">${esc(name)}</p><p class="bp__ix__v">no reading in the file</p></div>`;
  }
  const state = x.state || 'dark';
  const iconState = state === 'live' ? 'live' : state === 'awaiting-baseline' ? 'awaiting' : 'dark';
  let value;
  if (state === 'live' && Number.isFinite(x.score)) {
    value = `<b class="num">${esc(num(x.score, 1))}</b> <span>of 100</span>`;
  } else if (state === 'awaiting-baseline') {
    value = '<b>awaiting baseline</b> <span>no score</span>';
  } else {
    value = `<b>dark</b> <span>${esc(x.error || 'no score')}</span>`;
  }
  const lvl = Number.isInteger(x.level) && x.level_name ? ` ${x.level} · ${esc(x.level_name)}` : '';
  return `<div class="bp__ix" data-state="${esc(state)}">
    <p class="bp__ix__k">${stateIcon(iconState)} ${esc(x.index || name)}${lvl}</p>
    <p class="bp__ix__v">${value}</p>
    <p class="bp__ix__s">as of ${esc(stamp(x.generated_at))}</p>
  </div>`;
}

function blissTable(bliss) {
  const rows = arr(bliss && bliss.sources);
  if (!rows.length) return '<p class="bp__n">BLISS’s source table is not in this build.</p>';
  const body = rows.map((s) => {
    const st = s.ok ? 'live' : s.uncalibrated ? 'awaiting baseline' : 'dark';
    const v = measured(s.value);
    return `<tr data-state="${esc(st)}">
      <th scope="row"><b>${esc(s.label || s.id)}</b><span>${esc(s.id || '')}</span></th>
      <td>${esc(s.pillar || '—')}</td>
      <td class="num">${v === null ? 'no value' : esc(v)}</td>
      <td>${esc(s.unit || (v === null ? '—' : 'no unit'))}</td>
      <td>${esc(st)}${st === 'dark' && s.error ? `<span class="bp__err">${esc(s.error)}</span>` : ''}</td>
    </tr>`;
  }).join('');
  return `<p class="bp__tcap" id="bp-cap-bliss">BLISS’s ${count(rows.length)} sources as read on
    ${esc(stamp(bliss.generated_at))}. A value awaiting a baseline is a real measured number with no frozen
    history to score it against; a dark source did not answer, and its error is printed instead of a value.</p>
  <div class="bp__tw"><table class="bp__t bp__t--bliss" aria-describedby="bp-cap-bliss">
    <thead><tr><th scope="col">Source</th><th scope="col">Pillar</th><th scope="col" class="num">Value</th><th scope="col">Unit</th><th scope="col">State</th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function indicesSection(ctx, b) {
  const ix = b.indices || {};
  const bl = ix.bliss || null;
  let blissLine = '';
  if (bl && bl.state === 'awaiting-baseline') {
    blissLine = `<p class="bp__l"><b>BLISS has no score.</b> Its sources answered —
      ${count(bl.sources_reporting, 'an unrecorded number')} of ${count(bl.sources_total, 'an unrecorded number')} this run —
      but ${ctx.bliss && ctx.bliss.reference_present === false ? 'no frozen reference distribution exists yet' : 'there is no frozen reference to score them against'},
      so every value is published and none is scored. That is awaiting baseline, not dark, and it is never printed as a number.
      ${arr(bl.failed_sources).length ? `Dark this run: ${esc(arr(bl.failed_sources).join(', '))}.` : ''}</p>`;
  }
  return `<section class="bp__sec" id="the-indices" aria-labelledby="bp-ix-h">
  <h2 class="bp__h" id="bp-ix-h">${icon('sec-bliss')} SIREN and BLISS, as context</h2>
  <p class="bp__l bp__l--lead">${esc(ix.note || 'Context only. Neither index feeds the beam.')}</p>
  <div class="bp__ixs">
    ${indexCell(ix.doomcon || null, brand.NAME)}
    ${indexCell(bl, 'BLISS')}
  </div>
  ${blissLine}
  ${blissTable(ctx.bliss)}
  <p class="bp__n">Both are percentile positions in two separate frozen reference distributions of activity
    tempo, not measures of harm or benefit. <a href="${esc(ctx.href('/bliss.html'))}">The upside index, in full →</a>
    · <a href="${esc(ctx.href('/'))}">${esc(brand.NAME)}, in full →</a></p>
</section>`;
}

// ---------------------------------------------------------------------------
// Limits, method, data
// ---------------------------------------------------------------------------

function limitsSection(b, L) {
  const a = arr(b.honesty).map((s) => `<li>${esc(s)}</li>`).join('');
  const c = arr(L.honesty).map((s) => `<li>${esc(s)}</li>`).join('');
  const meas = b.lexicon && b.lexicon.measured ? b.lexicon.measured : null;
  return `<section class="bp__sec" id="limits" aria-labelledby="bp-lim-h">
  <h2 class="bp__h" id="bp-lim-h">${icon('sec-signal')} What this cannot say</h2>
  <p class="bp__l">Published in the two files and printed here unedited: the collector’s five lines about the
    counts, then the registers’ lines about the rows.</p>
  ${a ? `<h3 class="bp__h3">About the counts</h3><ul class="bp__lim">${a}</ul>` : ''}
  ${c ? `<h3 class="bp__h3">About the registers</h3><ul class="bp__lim">${c}</ul>` : ''}
  ${meas && meas.in_sample === true ? `<p class="bp__n"><b>Every precision figure for the word lists is in-sample.</b>
    The lists were tuned on the same headlines they were scored on, by one labeller; the first honest test is
    the next window. The benefit side’s precision rests on ${count(meas.benefit_all_history && meas.benefit_all_history.matched, 'an unrecorded number of')} matches in all history.</p>` : ''}
</section>`;
}

function chips(list) {
  return arr(list).map((t) => `<code class="bp__code">${esc(t)}</code>`).join(' ');
}

function precisionTable(meas) {
  const rows = [
    ['Harm, current file', meas.harm_current_file],
    ['Harm, all history', meas.harm_all_history],
    ['Benefit, all history', meas.benefit_all_history],
    ['Benefit, current file', meas.benefit_current_file],
  ].filter(([, r]) => r && typeof r === 'object');
  const ci = (r) => (Array.isArray(r.wilson_95_pct) && r.wilson_95_pct.length === 2
    ? `${esc(String(r.wilson_95_pct[0]))} to ${esc(String(r.wilson_95_pct[1]))}%`
    : Number.isFinite(r.wilson_95_lower_pct) ? `lower bound ${esc(String(r.wilson_95_lower_pct))}%` : '—');
  return `<div class="bp__tw"><table class="bp__t">
    <thead><tr><th scope="col">Side and sample</th><th scope="col" class="num">Matched</th><th scope="col" class="num">Precision, strict</th><th scope="col" class="num">Wilson 95%</th><th scope="col">Known reports found</th></tr></thead>
    <tbody>${rows.map(([label, r]) => `<tr>
      <th scope="row">${esc(label)}</th>
      <td class="num">${esc(count(r.matched))}</td>
      <td class="num">${Number.isFinite(r.precision_strict_pct) ? `${esc(String(r.precision_strict_pct))}%` : '—'}</td>
      <td class="num">${ci(r)}</td>
      <td>${esc(r.known_y_found || '—')}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function methodSection(b, L) {
  const lx = b.lexicon || {};
  const rule = lx.rule || {};
  const sizes = lx.sizes || {};
  const drop = lx.dropped_from_v4 || {};
  const meas = lx.measured || null;
  const lg = b.ledger || {};
  const dropped = arr(L.dropped).map((d) => `<li><b>${esc(d.item || d.id)}</b> (${esc(d.side || 'side not recorded')},
      noted in <a href="#reg-${esc(d.noted_in || '')}">${esc(d.noted_in || 'no row')}</a>). ${esc(d.reason || 'No reason recorded.')}</li>`).join('');
  const retired = arr(L.retired);
  return `<section class="bp__sec" id="method" aria-labelledby="bp-method-h">
  <h2 class="bp__h" id="bp-method-h">${icon('sec-method')} Where this came from</h2>

  <h3 class="bp__h3">The rule, the same on both sides</h3>
  <ul class="bp__lim bp__lim--plain">
    ${rule.matching ? `<li><b>Matching.</b> ${esc(rule.matching)}.</li>` : ''}
    ${lx.not_scanned_kinds ? `<li><b>Not scanned.</b> Items of kind ${chips(lx.not_scanned_kinds)}.</li>` : ''}
    ${rule.hedge ? `<li><b>Hedges.</b> ${esc(rule.hedge)}.</li>` : ''}
    ${rule.negation ? `<li><b>Negation.</b> ${esc(rule.negation)}.</li>` : ''}
    ${Number.isFinite(rule.title_min_hits) ? `<li><b>Threshold.</b> A side counts on ${count(rule.title_min_hits)} headline ${plural(rule.title_min_hits, 'hit', 'hits')}, or on ${count(rule.summary_min_distinct_hits)} distinct summary hits.</li>` : ''}
    ${rule.same_rule_both_sides === true ? '<li><b>Symmetry.</b> One rule, applied to both lists in the same pass.</li>' : ''}
  </ul>

  <h3 class="bp__h3">The harm list, ${count(sizes.harm, 'an unrecorded number of')} terms <span class="bp__ver">lexicon ${esc(lx.version || 'unversioned')}</span></h3>
  <p class="bp__chips">${chips(lx.harm_terms) || 'Not in the file.'}</p>
  <h3 class="bp__h3">The benefit list, ${count(sizes.benefit, 'an unrecorded number of')} terms</h3>
  <p class="bp__chips">${chips(lx.benefit_terms) || 'Not in the file.'}</p>
  <p class="bp__n">The two lists differ in size and reach. Both are printed in full so the difference is
    visible, and it is not corrected by any weighting. Any edit to either list makes a new instrument.</p>
  <h3 class="bp__h3">Hedge words and negators</h3>
  <p class="bp__chips"><span class="bp__chk">Hedges</span> ${chips(lx.hedge_terms) || 'not in the file'}</p>
  <p class="bp__chips"><span class="bp__chk">Negators</span> ${chips(lx.negators) || 'not in the file'}</p>
  ${arr(drop.harm).length || arr(drop.benefit).length ? `<p class="bp__n"><b>Dropped from the previous version</b> after
    producing false positives: harm ${chips(drop.harm) || 'none'}; benefit ${chips(drop.benefit) || 'none'}.</p>` : ''}

  ${meas ? `<h3 class="bp__h3">Measured precision</h3>
  <p class="bp__l">${esc(meas.labels || '')} Sample: ${esc(meas.sample || 'not recorded')}.
    ${Number.isFinite(meas.matched_both_lists) ? `${count(meas.matched_both_lists)} ${plural(meas.matched_both_lists, 'item', 'items')} in the sample matched both lists.` : ''}</p>
  ${precisionTable(meas)}` : ''}

  <h3 class="bp__h3">The registers</h3>
  <p class="bp__l">${esc(L.curation || 'No curation policy in the file.')}</p>
  ${dropped ? `<p class="bp__l"><b>Left out of individual rows, and why:</b></p><ul class="bp__lim bp__lim--plain">${dropped}</ul>` : ''}
  <p class="bp__n">${retired.length ? `${count(retired.length)} ${plural(retired.length, 'row has', 'rows have')} been retired and ${plural(retired.length, 'is', 'are')} kept in the file with the date and the reason.` : 'No row has been retired.'}
    The file was ${esc(lg.state || 'not checked')} on this run${lg.sha256 ? `, checksum <code class="bp__code">${esc(lg.sha256)}</code>` : ''}.</p>

  <p class="bp__stamp">balance.json v${esc(b.balance_version || '—')} · schema ${esc(String(b.schema ?? '—'))} ·
    stamped ${esc(stamp(b.generated_at))}, ${esc(b.generated_at_rule || 'rule not recorded')} ·
    built by <a href="${esc(brand.REPO_URL)}" rel="noopener">collector/balance.mjs</a>.
    This page does not feed the ${esc(brand.NAME)} index and has no route into it.</p>
</section>`;
}

function dataSection(ctx, b, L) {
  return `<section class="bp__sec" id="data" aria-labelledby="bp-data-h">
  <h2 class="bp__h" id="bp-data-h">${icon('sec-api')} Take the data</h2>
  <ul class="bp__dl">
    <li><a href="${esc(ctx.href('/api/balance.json'))}"><code class="bp__code">/api/balance.json</code></a>
      <span>The newsroom counts and every matched and unmatched headline, the beam rule, the six counters with
        their windows and errors, SIREN and BLISS as context, and both word lists in full.</span></li>
    <li><a href="${esc(ctx.href('/api/ledger.json'))}"><code class="bp__code">/api/ledger.json</code></a>
      <span>The two registers: ${count(arr(L.benefit).length)} benefit and ${count(arr(L.harm).length)} harm rows, each with
        its numbers, sources, status and caveat, key-sorted so the checksum in the repository is the checksum served.</span></li>
  </ul>
</section>`;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasBalancePage(ctx)) return emptyPage(ctx);
  const b = ctx.balance;
  const L = ctx.ledger;
  const m = model(ctx);
  const nr = b.newsroom || {};
  const cs = b.counters || null;

  const hb = m.state === 'live'
    ? `${count(m.harm)} harm-language and ${count(m.benefit)} benefit-language ${plural(m.benefit, 'story', 'stories')}`
    : 'newsroom dark';
  const description =
    `Harm and benefit, side by side and never summed. ${m.sentence || 'The newsroom window is dark this build.'} `
    + `Beside it: ${count(arr(L.benefit).length)} benefit and ${count(arr(L.harm).length)} harm register rows, each dated and sourced, `
    + `${cs ? `${count(cs.live, 'no')} live counters from public registries, ` : ''}and both word lists in full. No net score.`;

  const main = `<style>${balanceCss()}${pageCss()}</style>
${iconSprite({ only: SPRITE })}
<div class="bp bal-t">

<section class="bp__hero">
  <p class="bp__eyebrow">The balance · a ${esc(brand.NAME)} view · does not feed the main number</p>
  <h1 class="bp__h1">Harm and benefit, side by side</h1>
  <p class="bp__sub">Newsroom window <time datetime="${esc(nr.generated_at || '')}">${esc(stamp(nr.generated_at, 'not recorded'))}</time>
    · registers checked by hand as of ${esc(L.as_of_date || 'an unrecorded date')}
    ${cs ? `· ${count(cs.live, 'no')} of ${count(SIDES.reduce((n, s) => n + arr(cs[s]).length, 0))} counters live` : ''}</p>
  <p class="bp__lede">The utopia case, as far as it has receipts: what AI has measurably done for people,
    beside what it has measurably done to them. Three layers, each on its own terms — a count of two word lists
    in the same headlines, six counters read from public registries, and two registers of dated, sourced
    results — and one refusal. Nothing here is added up, netted or divided into a verdict, because the two
    sides share no unit.</p>
  <blockquote class="bp__q">
    <p>“${esc(ROSER.title)}”</p>
    <footer><a href="${esc(ROSER.url)}" rel="noopener">${esc(ROSER.credit)}</a></footer>
  </blockquote>
  <p class="bp__plain">Roser’s three sentences are three readings of one measure, child mortality, and none of
    them is subtracted from another; his point is that they hold at the same time. This page borrows the posture
    and not the arithmetic. Its two sides have no common measure, so they are printed apart, and the drawing below
    is allowed to weigh exactly one like-for-like pair of counts.</p>
</section>

${beamSection(ctx, b, m)}

${matchesSection(ctx, b, m)}

${registersSection(L)}

${countersSection(b)}

${indicesSection(ctx, b)}

${limitsSection(b, L)}

${methodSection(b, L)}

${dataSection(ctx, b, L)}
</div>`;

  return page({
    ctx,
    path: PATH,
    title: `Harm and benefit, side by side — ${hb} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: harm and benefit, side by side`,
    description,
    ogImage: ctx.cardFor ? ctx.cardFor('balance') : null,
    ogImageAlt: `${brand.NAME} balance: ${hb} in the newsroom window, drawn as a two-pan scale`,
    jsonld: [dataset(ctx, b, L, m)],
    main,
  });
}

/** Either file absent. Builds, says so plainly, and carries noindex. */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `Harm and benefit, side by side · ${brand.NAME}`,
    description: 'The harm-and-benefit page is not in this build.',
    main: `<style>${pageCss()}</style><div class="bp"><section class="bp__hero">
  <p class="bp__eyebrow">The balance · a ${esc(brand.NAME)} view</p>
  <h1 class="bp__h1">Harm and benefit, side by side</h1>
  <p class="bp__lede">This build carries no <code>data/balance.json</code> or no valid
    <code>data/ledger.json</code>, so there is nothing to draw. The page exists and says so rather than
    inventing a balance. Run <code>collector/balance.mjs</code> and rebuild.</p>
</section></div>`,
  });
}

function dataset(ctx, b, L, m) {
  const cs = b.counters || {};
  const vars = [
    { name: 'newsroom stories matching the harm list only', value: m.harm },
    { name: 'newsroom stories matching the benefit list only', value: m.benefit },
    { name: 'newsroom stories matching both lists', value: m.both },
    { name: 'newsroom stories matching neither list', value: m.neither },
    { name: 'newsroom stories scanned', value: m.scanned },
    { name: 'benefit register rows', value: arr(L.benefit).length },
    { name: 'harm register rows', value: arr(L.harm).length },
    ...SIDES.flatMap((s) => arr(cs[s]).filter((c) => c.state === 'live' && Number.isFinite(c.value))
      .map((c) => ({ name: c.label || c.id, value: c.value, unitText: c.unit }))),
  ].filter((v) => Number.isFinite(v.value))
    .map((v) => ({ '@type': 'PropertyValue', name: v.name, value: v.value, ...(v.unitText ? { unitText: v.unitText } : {}) }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} — harm and benefit of AI, counted side by side`,
    description:
      'Two word lists applied by one rule to the same newsroom headlines, six counters read from public '
      + 'registries, and two hand-verified registers of dated, sourced results on the benefit and harm sides of AI. '
      + 'Nothing is summed, netted or divided across the two sides.',
    url: ctx.url(PATH),
    license: brand.LICENSE,
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    ...(typeof b.generated_at === 'string' ? { dateModified: b.generated_at } : {}),
    keywords: ['artificial intelligence', 'AI harms', 'AI benefits', 'incidents', 'registers'],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/balance.json') },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/ledger.json') },
    ],
    variableMeasured: vars,
  };
}

// ---------------------------------------------------------------------------
// CSS. Scoped to .bp, shared tokens only, mobile first. The drawing and the two
// side hues are _balance.mjs's and come in through balanceCss().
// ---------------------------------------------------------------------------

function pageCss() {
  return `
.bp .dcico{flex:none}
.bp__h .dcico{--ico:1.05em;color:var(--ink-faint)}

/* ---- hero ---------------------------------------------------------------- */
.bp__hero{margin:0 0 var(--sec)}
.bp__eyebrow{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.bp__h1{font:600 clamp(1.6rem,7vw,2.4rem)/1.08 var(--sans);letter-spacing:-.02em;margin:0 0 var(--s-3)}
.bp__sub{font:500 var(--t-sm)/1.5 var(--mono);color:var(--ink-dim);margin:0 0 var(--s-3);letter-spacing:.01em}
.bp__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:66ch}
.bp__q{margin:0 0 var(--s-3);padding:var(--s-3) var(--s-4);border-left:3px solid var(--rule);
  background:var(--wash-alt);border-radius:var(--radius);max-width:62ch}
.bp__q p{margin:0 0 var(--s-2);font:500 var(--t-lg)/1.4 var(--sans);color:var(--ink)}
.bp__q footer{font:400 var(--t-xs)/1.5 var(--sans);color:var(--ink-faint)}
.bp__q footer a{color:var(--ink-dim)}
.bp__plain{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0;max-width:66ch}

/* ---- sections ------------------------------------------------------------ */
.bp__sec{margin:0 0 var(--sec-lg);scroll-margin-top:calc(var(--rail-h) + 12px)}
.bp__h{font:600 var(--t-xl)/1.15 var(--sans);letter-spacing:-.01em;margin:0 0 var(--s-3);
  display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.bp__h3{font:600 var(--t-base)/1.3 var(--sans);margin:var(--s-6) 0 var(--s-2)}
.bp__ver{font:500 var(--t-2xs)/1 var(--mono);color:var(--ink-faint);letter-spacing:.06em;margin-left:.5em}
.bp__l{font:400 var(--t-sm)/1.65 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:70ch}
.bp__l b{color:var(--ink)}
.bp__l--lead{font-size:var(--t-base);color:var(--ink)}
.bp__n{font:400 var(--t-xs)/1.7 var(--sans);color:var(--ink-faint);margin:var(--s-4) 0 0;max-width:74ch}
.bp__n b{color:var(--ink-dim)}
.bp__n a{color:var(--ink-dim)}
.bp__stamp{font:400 var(--t-xs)/1.8 var(--mono);color:var(--ink-faint);margin:var(--s-5) 0 0;
  padding-top:var(--s-3);border-top:1px solid var(--rule-soft);overflow-wrap:anywhere}

/* ---- the drawing: the large geometry from 700px, the module one below ---- */
.bp__fig{margin:0 0 var(--s-5);display:flex;flex-direction:column;gap:var(--s-2);align-items:flex-start}
.bp__svg--wide{display:none}
.bp__cap{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);max-width:70ch}
@media (min-width: 700px){
  .bp__svg--wide{display:block}
  .bp__svg--narrow{display:none}
}

/* ---- tables -------------------------------------------------------------- */
.bp__tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:var(--s-2) 0 0;
  border:1px solid var(--rule-soft);border-radius:var(--radius)}
.bp__tcap{margin:var(--s-3) 0 var(--s-2);font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);max-width:74ch}
.bp__t{border-collapse:collapse;width:100%;min-width:28rem;font:400 var(--t-xs)/1.45 var(--mono);
  font-variant-numeric:tabular-nums}
.bp__t th,.bp__t td{padding:var(--s-2) var(--s-3);text-align:left;vertical-align:top;
  border-bottom:1px solid var(--rule-soft)}
.bp__t thead th{font:600 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);background:var(--bg-sunken)}
.bp__t tbody tr:last-child td,.bp__t tbody tr:last-child th{border-bottom:0}
.bp__t tfoot th,.bp__t tfoot td{border-top:1px solid var(--rule);border-bottom:0;color:var(--ink)}
.bp__t tbody th{font-weight:600;color:var(--ink)}
.bp__t tbody th span{display:block;font-weight:400;font-size:var(--t-2xs);color:var(--ink-faint)}
.bp__t .num{text-align:right;white-space:nowrap}
.bp__tnote{font-family:var(--sans);color:var(--ink-faint)}
.bp__t--bliss td:last-child{min-width:10rem}
.bp__err{display:block;font:400 var(--t-2xs)/1.5 var(--sans);color:var(--ink-faint);overflow-wrap:anywhere;margin-top:3px}

/* ---- two columns: benefit left, harm right, stacked below 900px --------- */
.bp__cols{display:grid;gap:var(--s-5);grid-template-columns:minmax(0,1fr)}
@media (min-width: 900px){.bp__cols{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.bp__col{min-width:0;border-top:3px solid var(--bal-side);padding-top:var(--s-3)}
.bp__colh{font:600 var(--t-lg)/1.25 var(--sans);margin:0 0 var(--s-2);display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
.bp__eb{font:500 var(--t-2xs)/1.2 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--bal-side);white-space:nowrap}
.bp__colsub{font:400 var(--t-xs)/1.5 var(--mono);color:var(--ink-faint);margin:0 0 var(--s-3)}
.bp__empty{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0;padding:var(--s-3) var(--s-4);
  border:1px dashed var(--rule);border-radius:var(--radius)}

/* ---- matched headlines --------------------------------------------------- */
.bp__its{list-style:none;margin:0;padding:0;display:grid;gap:var(--s-3)}
.bp__it{padding-bottom:var(--s-3);border-bottom:1px solid var(--rule-soft)}
.bp__it:last-child{border-bottom:0}
.bp__it__t{margin:0;font:500 var(--t-base)/1.45 var(--sans);color:var(--ink)}
.bp__it__a{color:var(--ink);text-decoration-color:var(--rule)}
.bp__it__a:hover{text-decoration-color:var(--accent-2)}
.bp__it__m{display:block;font:400 var(--t-2xs)/1.5 var(--mono);color:var(--ink-faint);margin-top:3px}
.bp__it__m a{color:var(--ink-dim)}
.bp__it__h{display:block;margin:4px 0 0;font:400 var(--t-2xs)/1.6 var(--mono);color:var(--ink-faint)}
.bp__it__h b{color:var(--ink-dim);font-weight:600}
.bp__it__also{list-style:none;margin:var(--s-2) 0 0;padding:0 0 0 var(--s-3);border-left:2px solid var(--rule);
  display:grid;gap:var(--s-2);font:400 var(--t-sm)/1.45 var(--sans)}
.bp__aside{list-style:none;margin:0;padding:0;display:grid;gap:var(--s-3);max-width:80ch}
.bp__aside .bp__it__t{font-size:var(--t-sm);font-weight:400;color:var(--ink-dim)}
/* The mark: a side wash and a side underline, in ink. The UA default is a
   yellow highlighter, which on this site would be the live-reading amber. */
.bp__m{background:var(--bal-wash);color:inherit;border-radius:2px;padding:0 1px;
  text-decoration:underline;text-decoration-color:var(--bal-side);text-decoration-thickness:2px;text-underline-offset:3px}
.bp__m--w{font:500 var(--t-2xs)/1.4 var(--mono);color:var(--ink);padding:0 4px}

/* ---- registers ----------------------------------------------------------- */
.bp__lg{list-style:none;margin:0 0 var(--s-4);padding:0;display:grid;gap:4px}
.bp__lg li{font:400 var(--t-xs)/1.5 var(--sans);color:var(--ink-faint);display:grid;
  grid-template-columns:7.5rem 2.2rem minmax(0,1fr);gap:0 8px;align-items:baseline}
.bp__lg b{font:600 var(--t-2xs)/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink)}
.bp__lg .num{font:600 var(--t-xs)/1.4 var(--mono);color:var(--ink);text-align:right}
.bp__row{padding:var(--s-4) 0;border-top:1px solid var(--rule-soft);scroll-margin-top:calc(var(--rail-h) + 12px)}
.bp__row:target{background:var(--bal-wash);box-shadow:0 0 0 8px var(--bal-wash);border-radius:2px}
.bp__row__t{font:600 var(--t-base)/1.4 var(--sans);margin:0 0 var(--s-2);color:var(--ink)}
.bp__row__s{margin:0 0 4px;font:400 var(--t-xs)/1.5 var(--sans);color:var(--ink-faint)}
.bp__stw{font:600 var(--t-2xs)/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink);
  border:1px solid var(--bal-side);border-radius:3px;padding:2px 6px;margin-right:6px;white-space:nowrap}
.bp__row__meta{margin:0 0 var(--s-2);font:400 var(--t-2xs)/1.5 var(--mono);color:var(--ink-faint)}
.bp__row__meta b{color:var(--ink-dim);font-weight:600}
.bp__nums{list-style:none;margin:0 0 var(--s-3);padding:0;display:grid;gap:5px}
.bp__nums li{font:400 var(--t-xs)/1.45 var(--sans);color:var(--ink-dim)}
.bp__v{font:600 var(--t-sm)/1.3 var(--mono);color:var(--ink);font-variant-numeric:tabular-nums;margin-right:4px}
.bp__nd{display:block;font:400 var(--t-2xs)/1.4 var(--mono);color:var(--ink-faint)}
.bp__nd a{color:var(--ink-dim)}
.bp__mc{margin:0 0 var(--s-2);display:grid;gap:2px}
.bp__mc dt{font:600 var(--t-2xs)/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);margin-top:6px}
.bp__mc dd{margin:0;font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);max-width:70ch}
.bp__more{margin:0 0 var(--s-2)}
.bp__more summary{cursor:pointer;font:500 var(--t-2xs)/1.6 var(--mono);letter-spacing:.04em;color:var(--ink-dim)}
.bp__more summary:hover{color:var(--ink)}
.bp__more[open] summary{margin-bottom:2px}
.bp__srcs{margin:0;font:400 var(--t-2xs)/1.6 var(--mono);color:var(--ink-faint)}
.bp__srcs a{display:inline-block;min-width:1.6em;text-align:center;margin-right:3px;border:1px solid var(--rule);
  border-radius:3px;padding:1px 4px;text-decoration:none;color:var(--ink-dim)}
.bp__srcs a:hover{color:var(--accent-2);border-color:var(--accent-2)}

/* ---- counters ------------------------------------------------------------ */
.bp__ctr{padding:var(--s-4) 0;border-top:1px solid var(--rule-soft)}
.bp__ctr:first-of-type{border-top:0}
.bp__ctr__st{margin:0 0 4px;font:500 var(--t-2xs)/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink-dim);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.bp__ctr__st .dcico{--ico:1.1em}
.bp__ctr[data-state="live"] .bp__ctr__st .dcico{color:var(--ok)}
.bp__ctr[data-state="dark"] .bp__ctr__st .dcico{color:var(--dark-src)}
.bp__ctr__st b{color:var(--ink-faint);font-weight:500}
.bp__ctr__l{font:600 var(--t-base)/1.35 var(--sans);margin:0 0 var(--s-2);color:var(--ink)}
.bp__ctr__v{margin:0 0 2px;font:400 var(--t-sm)/1.4 var(--sans);color:var(--ink-dim)}
.bp__ctr__v .num{font:600 var(--t-xl)/1.1 var(--mono);color:var(--ink);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.bp__ctr[data-state="dark"] .bp__ctr__v b{font:600 var(--t-base)/1.2 var(--mono);color:var(--ink-dim)}
.bp__ctr__w{margin:0 0 var(--s-2);font:400 var(--t-2xs)/1.5 var(--mono);color:var(--ink-faint)}
.bp__ctr__meta{margin:var(--s-2) 0 0;font:400 var(--t-2xs)/1.6 var(--sans);color:var(--ink-faint);max-width:70ch}
.bp__ctr__e{margin:var(--s-2) 0 0;font:400 var(--t-2xs)/1.5 var(--mono);color:var(--ink-faint)}
.bp__ctr__e a{color:var(--ink-dim)}
.bp__mc--ctr dd{font-size:var(--t-xs)}

/* ---- indices ------------------------------------------------------------- */
.bp__ixs{display:grid;gap:1px;grid-template-columns:minmax(0,1fr);background:var(--rule-soft);
  border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden;margin:0 0 var(--s-4)}
@media (min-width: 620px){.bp__ixs{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.bp__ix{background:var(--bg);padding:var(--s-3) var(--s-4)}
.bp__ix__k{margin:0 0 4px;font:600 var(--t-xs)/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-dim);display:flex;align-items:center;gap:6px}
.bp__ix[data-state="live"] .dcico{color:var(--ok)}
.bp__ix[data-state="awaiting-baseline"] .dcico{color:var(--accent-2)}
.bp__ix[data-state="dark"] .dcico{color:var(--dark-src)}
.bp__ix__v{margin:0;font:400 var(--t-sm)/1.3 var(--sans);color:var(--ink-dim)}
.bp__ix__v b{font:600 var(--t-xl)/1.1 var(--mono);color:var(--ink);margin-right:4px}
.bp__ix[data-state="awaiting-baseline"] .bp__ix__v b{font-size:var(--t-lg)}
.bp__ix__s{margin:4px 0 0;font:400 var(--t-2xs)/1.4 var(--mono);color:var(--ink-faint)}

/* ---- limits, method, data ------------------------------------------------ */
.bp__lim{list-style:none;margin:0;padding:0;display:grid;gap:9px;counter-reset:lim}
.bp__lim li{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);max-width:72ch;
  padding-left:var(--s-5);position:relative;counter-increment:lim}
.bp__lim li::before{content:counter(lim);position:absolute;left:0;top:1px;
  font:600 var(--t-2xs)/1.6 var(--mono);color:var(--ink-faint)}
.bp__lim--plain li b{color:var(--ink)}
.bp__lim li a{color:var(--ink)}
.bp__chips{margin:0 0 var(--s-3);line-height:2;max-width:90ch}
/* A term is one chip: "tried to hack" broken across two lines reads as two terms. */
.bp__chips .bp__code{white-space:nowrap}
.bp__chk{font:600 var(--t-2xs)/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);margin-right:4px}
.bp__code{font:400 var(--t-2xs)/1.4 var(--mono);background:var(--wash);border:1px solid var(--rule-soft);
  border-radius:3px;padding:1px 5px;color:var(--ink-dim);overflow-wrap:anywhere;white-space:normal}
.bp__dl{list-style:none;margin:var(--s-3) 0 0;padding:0;display:grid;gap:10px}
.bp__dl li{font:400 var(--t-xs)/1.65 var(--sans);color:var(--ink-faint);max-width:72ch}
.bp__dl a{display:inline-block;margin-right:6px;text-decoration:none}
.bp__dl a:hover .bp__code{border-color:var(--accent-2);color:var(--ink)}

@media (prefers-reduced-motion: no-preference){
  .bp__srcs a,.bp__it__a{transition:color 120ms ease,border-color 120ms ease,text-decoration-color 120ms ease}
}
`;
}
