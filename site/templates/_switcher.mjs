// The desk — one slot, several datasets, no navigation.
//
// This is the single structural mechanism behind pizzint's session length, and
// docs/ENGAGEMENT.md §1.2 measured it precisely: seven 48px tiles under their
// index, each swapping a DIFFERENT dataset into the same slot with no page
// load. Not skins — HormuzHub is a vector map and a stacked area chart, the
// Commute Index is a whole second scalar with its own corridor table. We shipped
// zero of these and reached the same destinations through link cards at 84%
// scroll depth, which is the placement nobody reaches.
//
// -------------------------------------------------------------------------
// THE MARKUP, AND WHY IT CARRIES TWO NAMES FOR FOUR ELEMENTS.
//
// site/styles.mjs belongs to the integrator and also paints this control. Over
// the course of this round its published contract named those four elements two
// different ways — `.sw__in / .sw__tab / .sw__tk / .sw__panel` in one revision
// and `.sw__r / .sw__t / .sw__tl / .sw__p` in another — and the brief forbids
// renaming a class another template emits. So each of those four elements
// carries BOTH names, and whichever revision of that sheet ships, its selectors
// match. It costs about forty bytes and it removes an entire class of silent
// breakage between two files being written at the same time.
//
// For the same reason THIS MODULE IS SELF-SUFFICIENT. Its own <style> declares
// the complete control: the off-screen radios, the tab strip, the selected
// state, the single-cell panel stack and the reveal rules. It is emitted inside
// <main>, so a `.sw <thing>` rule in the head sheet — one specificity step up,
// which is how that file is written — still wins and still refines the frame.
// The control therefore works with that sheet, without it, and with either of
// its vocabularies. A switcher whose panels do not switch because two files
// disagreed is worse than no switcher.
//
//   <section class="sw" aria-labelledby="sw-h">
//     <div class="sw__hd"><h2 class="sec__h" id="sw-h">The desk</h2><p class="sw__k">…</p></div>
//     <input class="sw__in sw__r" type="radio" name="sw" id="sw-signal" checked>  … one per panel, ALL FIRST
//     <div class="sw__tabs" role="radiogroup">
//       <label class="sw__tab sw__t" id="sw-t-signal" for="sw-signal" data-state="live">
//         <i class="sw__tg" aria-hidden="true">◆</i>
//         <span class="sw__tk sw__tl">Signal</span>
//         <b class="sw__tn num">200</b>
//       </label>                                                   … same order as the radios
//     </div>
//     <div class="sw__panels">
//       <article class="sw__panel sw__p" data-panel="signal" aria-labelledby="sw-t-signal">
//         <div class="sw__head"><h3 class="sw__ph">…</h3><span class="sw__pm">…</span></div>
//         <div class="sw__body">…</div>
//         <a class="sw__more" href="…">…</a>
//       </article>                                                 … same order again
//     </div>
//   </section>
//
// THE ORDER IS PART OF THE WIRING. Our own reveal rules are keyed on the radio
// ids, so they survive reordering — but the head sheet has at times bound panel
// N to radio N by :nth-of-type, and under that binding a stray element inside
// .sw__tabs or .sw__panels shifts every dataset one tab to the left, silently,
// with no error anywhere. So the labels are the only children of the strip and
// the articles are the only children of the stack, and the test asserts it.
//
// EVERY PANEL SHARES ONE GRID CELL. That is the whole of "no layout shift when
// switching": the five panels run 617px to 1,920px tall, so with display:none
// the page grew and shrank by roughly 1,300px under the reader's thumb on every
// press. Stacked in one named area they overlap, the well is always as tall as
// the TALLEST panel, and nothing below the control moves. Hidden panels are
// `visibility:hidden`, never `display:none`: a display:none box has no height
// to stack against, visibility still takes the links out of the tab order and
// the text out of the accessibility tree, and a laid-out panel lets the card
// reel inside it measure itself instead of appearing at zero width.
//
// grid-template-columns IS NOT COSMETIC. An auto track is sized by its items'
// content, and the signal panel holds the card reel, whose content width is
// eight 300px cards: the panel resolved to 2,410px inside a 375px viewport and
// every line of text in it ran off the right edge. Measured in a browser at
// 375x812, which is the only way it could have been found. minmax(0, 1fr) on
// the track and min-width:0 on the item are the two halves of the fix.
//
// -------------------------------------------------------------------------
// Three rules this file exists to hold, from docs/MOTION.md §0 and
// docs/VISITORS.md §5:
//
//   1. EVERY PANEL IS IN THE STATIC HTML. Not fetched, not hydrated, not lazy.
//      A crawler reads all of them, a screenshot taken before any script runs
//      shows the default one complete, and the page works with JavaScript
//      disabled. pizzint's equivalent slot is client-rendered and their
//      prerendered HTML says LOADING TACTICAL DATA. That is the failure we beat
//      them on and we do not get to reintroduce it.
//
//   2. NO JAVASCRIPT AT ALL. Real radios and real labels. Native radios give us
//      arrow-key navigation, one tab stop for the whole group, correct
//      screen-reader announcement ("SIGNAL 200, radio button, 1 of 5, checked")
//      and back/forward restore for free.
//
//   3. EVERY TAB CARRIES A LIVE COUNT, and every panel carries its own stamp
//      and its own source states. "SIGNAL" is a label; "SIGNAL 200" is a
//      reason to press it. A dark panel says so on itself rather than borrowing
//      the index's health — the single most common question about an in-place
//      switcher is whether the thing you just switched to is as fresh as the
//      thing you switched from, and pizzint's seven panels answer it zero times.

import { esc, num, signed, utc, utcDay, duration } from './_html.mjs';
import * as leaderwire from './_leaderwire.mjs';
import { readNews, reel, newsSourceStrip } from './_reel.mjs';
import { liveHead, legend, feedRow } from './news.mjs';
import * as labs from './_labs.mjs';
import * as xwire from './_xwire.mjs';

// How many rows the ranked feed carries inside the panel. Every panel shares
// one grid cell, so the tallest panel sets the frame height for all of them —
// this number is a budget, not a claim about how much we hold, and the archive
// link under it names the full count.
const FEED_ROWS = 10;

// The recency rail. Eight cards, newest first — deliberately NOT the eight
// highest-scoring items, because those are rows 01-08 of the feed directly
// underneath and docs/VISITORS.md §5.1 measured that duplication at roughly two
// mobile screens. Two objects answering the same question is one object and a
// waste; two objects answering different questions is a dashboard.
const RAIL_CARDS = 8;

const RACE_ROWS = 8;
const WIRE_CARDS = 6;
const DIGEST_ROWS = 6;

// ---------------------------------------------------------------------------
// Small formatters. Local rather than imported so this module can be dropped
// into another page without dragging racePage's whole vocabulary with it.
// ---------------------------------------------------------------------------

function pct(p, places = 1) {
  return Number.isFinite(p) ? `${(p * 100).toFixed(places)}%` : null;
}

function money(n) {
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function clock(iso) {
  return Number.isFinite(Date.parse(iso)) ? `${String(iso).slice(11, 16)}Z` : null;
}

/** Arrow plus word. Never the arrow alone — colour and glyph both fail. */
function moveChip(delta, unit) {
  if (!Number.isFinite(delta)) return '';
  const glyph = delta > 0 ? '▲' : delta < 0 ? '▼' : '◆';
  const word = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return `<span class="sw__mv"><span aria-hidden="true">${glyph}</span>` +
    `<b class="num">${esc(signed(delta, 1))}</b>` +
    `<span class="sw__mvu">${esc(unit)}</span>` +
    `<span class="vh">${esc(word)}</span></span>`;
}

/**
 * A fourteen-row table is a database dump; the sentence above it is the
 * finding. docs/VISITORS.md §5.3 asked for exactly this trade and it is the
 * honest one: nothing is deleted, the rows are one press away, and the reader
 * who only wanted to know whether the instrument is healthy has an answer in
 * one line.
 */
function sourceDetails(strip, summary) {
  return `<details class="sw__src">
    <summary>${esc(summary)}</summary>
    <div class="sw__srcin">${strip}</div>
  </details>`;
}

// ---------------------------------------------------------------------------
// Panel: SIGNAL
// ---------------------------------------------------------------------------

/**
 * The newsroom, in two objects that do different jobs.
 *
 * LATEST is the eight newest items in the window, in publication order. THE
 * RANKED FEED is the highest-scoring ten. Before this round the rail was the
 * feed's own top eight re-clothed as cards: same items, same order, same
 * scores, about two mobile screens of verbatim duplication (docs/VISITORS.md
 * §5.1). Recency is the one ordering the score cannot produce — on the live
 * data the top item by score is over three hours older than the newest item on
 * the page, and seven of the eight cards do not appear in the feed's top eight
 * at all — so the rail now carries information the feed does not.
 *
 * The watermark numeral on each card is therefore the RECENCY position, 01 for
 * the newest, and the caption under it says so. A numeral that means rank-by-
 * score on /news.html and rank-by-time here would be worse than no numeral.
 */
function signalPanel(ctx, news) {
  const archive = ctx.href('/news.html');

  if (!news.items.length) {
    return `<p class="lede">No items in the collection window. This is a measured zero, not an outage:
       the per-source strip below says which feeds answered and which did not.</p>
    ${sourceDetails(newsSourceStrip(news.sources), newsSourceSentence(news.sources))}`;
  }

  // Newest first. Ties break on id so two builds from identical inputs emit
  // identical bytes (CONTRACT.md hard constraint 4).
  const newest = news.items.slice().sort((a, b) => {
    const ta = Date.parse(a.published_at);
    const tb = Date.parse(b.published_at);
    if (tb !== ta) return tb - ta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }).slice(0, RAIL_CARDS);

  // Shallow copies. The normalised item's rankLabel is its rank by SCORE, and
  // printing 47 as the watermark on a rail ordered by time would be a numeral
  // that means nothing where it sits. The originals are untouched, so the feed
  // below still prints true score ranks.
  const railItems = newest.map((it, i) => ({ ...it, rankLabel: String(i + 1).padStart(2, '0') }));

  const rows = news.items.slice(0, FEED_ROWS);
  const oldestOnRail = newest[newest.length - 1];
  const spread = oldestOnRail
    ? duration(Math.max(0, (Date.parse(news.generated_at) - Date.parse(oldestOnRail.published_at)) / 1000))
    : null;

  return `
<p class="sw__lede">Two orderings of the same ${esc(news.total)} items, kept because they disagree.
   The rail is the newest eight in publication order. The list under it is the highest-scoring
   ${esc(rows.length)}. Which stories lead one and not the other is itself the reading.</p>

${reel(railItems, { id: 'sw-latest', limit: RAIL_CARDS, heading: 'Latest eight', href: archive })}
<p class="nkey">Ordered by publication time, newest first — <b>not</b> by score. The numeral on each card
   is its position on this rail${spread ? `, and the eighth card is ${esc(spread)} old at the compile stamp` : ''}.</p>

<section class="sec news" aria-labelledby="news-h">
  ${liveHead(news, 'Ranked feed')}
  ${legend(news)}
  <ol class="nfeed">${rows.map(feedRow).join('')}</ol>
  ${sourceDetails(newsSourceStrip(news.sources), newsSourceSentence(news.sources))}
</section>`;
}

function newsSourceSentence(sources) {
  const dark = sources.filter((s) => s.status === 'dark').length;
  const quiet = sources.filter((s) => s.status === 'quiet').length;
  const live = sources.length - dark - quiet;
  const bits = [`${live} carrying`];
  if (quiet) bits.push(`${quiet} answered with nothing`);
  if (dark) bits.push(`${dark} dark`);
  return `${bits.join(' · ')} · of ${sources.length} news feeds`;
}

// ---------------------------------------------------------------------------
// Panel: THE RACE
// ---------------------------------------------------------------------------

/**
 * A live preview, not a link card.
 *
 * docs/VISITORS.md §D: the trader cluster is nine of a hundred, we win their
 * question outright on /race, and almost none of them ever see it because the
 * page sat behind a card at the bottom of 8,742px of mobile scroll. The number
 * they want — the leader, the market that produced it, and how stale it is — is
 * computed every build. It belongs where they are.
 *
 * The bar is on an absolute 0-100 scale, never normalised to the leader. On the
 * live data that makes seven of eight bars hairlines beside a 73.5% leg, and
 * that is the correct picture: one lab is not marginally ahead, it is the whole
 * market. Rescaling would draw a race that is not happening.
 */
function racePanel(ctx, race) {
  const poly = race.markets && race.markets.polymarket;
  const ev = poly && poly.ok ? poly.horizon : null;
  const players = race.players.slice(0, RACE_ROWS);

  const head = ev
    ? `<dl class="sw__dl">
        <div><dt>Ranking market</dt><dd><a href="${esc(ev.url)}" rel="nofollow noopener">${esc(ev.title)}</a></dd></div>
        <div><dt>Resolves</dt><dd><time datetime="${esc(ev.end_date)}">${esc(utcDay(ev.end_date))}</time></dd></div>
        ${Number.isFinite(ev.volume_usd) ? `<div><dt>Behind it</dt><dd class="num">${esc(money(ev.volume_usd))} across ${esc(ev.legs_live)} live legs</dd></div>` : ''}
      </dl>`
    : `<p class="sw__dark"><b>DARK</b> — no ranking market resolved on this run. The rows below carry
        whatever each venue did return, and nothing is filled in from the last one.</p>`;

  // The legs do not sum to 1. That is not an error, and it is the single most
  // credibility-buying line on /race, so it travels with the preview.
  const spread = ev && Number.isFinite(ev.sum_of_live_legs) && ev.sum_of_live_legs !== 1
    ? `<p class="nkey">The ${esc(ev.legs_live)} live legs price to
       <b class="num">${esc(ev.sum_of_live_legs.toFixed(4))}</b> rather than to 1.0000. That spread is the
       bid/ask on ${esc(money(ev.volume_usd))} of lifetime volume — not a rounding error and not our arithmetic.</p>`
    : '';

  const rows = players.map((p) => {
    const mk = p.market || {};
    const live = mk.state === 'live' && Number.isFinite(mk.probability);
    const width = live ? (mk.probability === 0 ? 0 : Math.max(0.6, mk.probability * 100)) : 0;
    const then = live && Number.isFinite(mk.change_7d)
      ? Math.max(0, Math.min(1, mk.probability - mk.change_7d)) * 100
      : null;

    const value = live
      ? `<span class="sw__pct num">${esc(pct(mk.probability))}</span>`
      : `<span class="sw__abs" title="${esc(mk.state === 'dark'
          ? 'The fetch or the parse failed on this run. The value is unknown and is never filled in.'
          : 'This venue lists no contract for this player. That is not a low probability — nobody is offering the bet.')}">${
          esc(mk.state === 'dark' ? 'DARK' : 'no market')}</span>`;

    const move = live && mk.change_7d_state === 'live' && Number.isFinite(mk.change_7d)
      ? moveChip(mk.change_7d * 100, 'pts / 7d')
      : `<span class="sw__abs" title="The venue has no price from a week ago to difference against. Not zero movement — no reference point.">no ref</span>`;

    return `<li class="sw__rrow" data-org="${esc(p.id)}">
      <span class="sw__rrank num" aria-hidden="true">${esc(String(p.rank ?? '').padStart(2, '0'))}</span>
      <span class="sw__rname">${esc(p.name)}<span class="vh">, rank ${esc(p.rank ?? '')}</span></span>
      <span class="sw__rval">${value}${move}</span>
      <span class="sw__rbar" aria-hidden="true"><i style="width:${width.toFixed(2)}%"></i>${
        then === null ? '' : `<u style="left:${then.toFixed(2)}%"></u>`}</span>
    </li>`;
  }).join('');

  return `
<p class="sw__lede">Eight frontier labs ranked on one live prediction market, priced in public with
   real money behind every leg. Nothing here is our judgement: the ordering is the market's, and the
   tick on each bar is where that leg traded seven days ago.</p>
${head}
<ol class="sw__race">${rows}</ol>
${spread}`;
}

// ---------------------------------------------------------------------------
// Panel: SUBSTRATE
// ---------------------------------------------------------------------------

/**
 * The second named scalar, previewed.
 *
 * Three states stay distinct and are never merged: live, dark, awaiting
 * baseline. A pillar with no frozen reference answered its request perfectly
 * well — reporting it as dark would claim an outage that is not happening, and
 * reporting it as a number would invent one.
 */
function substratePanel(ctx, infra) {
  const lvl = Number.isFinite(infra.level) ? infra.level : null;
  const scored = Number.isFinite(infra.score);
  const c = infra.counts || {};
  const pillars = Array.isArray(infra.pillars) ? infra.pillars : [];

  const cards = pillars.map((p) => {
    const st = p.dark ? 'dark' : (p.state || (Number.isFinite(p.score) ? 'live' : 'awaiting-baseline'));
    const body = st === 'live' && Number.isFinite(p.score)
      ? `<b class="sw__pv num">${esc(num(p.score, 1))}</b><span class="sw__pu">of 100</span>`
      : `<b class="sw__pv sw__pv--none">${esc(st === 'dark' ? 'DARK' : 'AWAITING BASELINE')}</b>`;
    const counts = [
      Number.isFinite(p.sources_live) ? `${p.sources_live} live` : null,
      p.sources_awaiting ? `${p.sources_awaiting} awaiting baseline` : null,
      p.sources_dark ? `${p.sources_dark} dark` : null,
    ].filter(Boolean).join(' · ');
    return `<li class="sw__pill" data-state="${esc(st)}">
      <span class="sw__pn">${esc(p.name)}</span>
      <span class="sw__pb">${body}</span>
      <span class="sw__pd">${esc(p.blurb || '')}</span>
      <span class="sw__pc">${esc(counts)} · of ${esc(p.sources_total)}</span>
    </li>`;
  }).join('');

  const reading = scored && lvl !== null
    ? `<p class="sw__read"><b class="num">SUBSTRATE ${esc(lvl)}</b>
        <span class="sw__readn">${esc(infra.level_name || '')}</span>
        <span class="sw__reads num">${esc(num(infra.score, 1))} of 100</span></p>
       <p class="sw__lede">${esc(infra.level_gloss || '')}</p>`
    : `<p class="sw__dark"><b>NO READING</b> — not enough live pillars to compute a substrate score on
        this run. No number is shown rather than a number nobody could check.</p>`;

  const health = [
    Number.isFinite(c.live) ? `${c.live} live` : null,
    c.awaiting_baseline ? `${c.awaiting_baseline} awaiting baseline` : null,
    c.dark ? `${c.dark} dark` : null,
  ].filter(Boolean).join(' · ');
  const total = c.total ?? (Array.isArray(infra.sources) ? infra.sources.length : 0);

  return `
<p class="sw__lede">You cannot train a model without power, and the power bill is public in a way the
   weights are not. SUBSTRATE runs on its own 5-to-1 scale over grid load, river flow, drought and
   build-out, and it does not feed the main index.</p>
${reading}
<ul class="sw__pills">${cards}</ul>
<p class="nkey">${esc(health)} · of ${esc(total)} substrate sources, every one keyless.
   Two grids, not the country: the national demand feed needs an API key and this project ships no
   secrets, so the coverage limit is printed rather than quietly closed.</p>`;
}

// ---------------------------------------------------------------------------
// Optional panels. ctx.digest and ctx.bliss are being wired by other agents
// this round. Both are read through a strict shape check and both are simply
// absent when the key is missing, so this file is correct before, during and
// after that landing — and it never invents a panel out of a half-written file.
// ---------------------------------------------------------------------------

function digestOf(ctx) {
  const d = ctx && ctx.digest;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const items = d.brief && Array.isArray(d.brief.items) ? d.brief.items : null;
  if (!items || !items.length) return null;
  return { d, items };
}

function digestPanel(ctx, model) {
  const rows = model.items.slice(0, DIGEST_ROWS).map((it) => {
    const n = it.corroboration && Number.isFinite(it.corroboration.count) ? it.corroboration.count : null;
    const srcs = it.corroboration && Array.isArray(it.corroboration.sources) ? it.corroboration.sources : [];
    const title = it.title || it.id || '';
    return `<li class="sw__drow">
      <span class="sw__dh">${it.url ? `<a href="${esc(it.url)}" rel="noopener nofollow">${esc(title)}</a>` : esc(title)}</span>
      <span class="sw__dm">${n && n > 1
        ? `<span class="corr" title="${esc(srcs.join(', '))}"><span aria-hidden="true">&times;${esc(n)}</span>` +
          `<span class="vh">carried by ${esc(n)} independent sources</span></span>`
        : ''}${Number.isFinite(it.age_hours) ? `<span class="num">${esc(it.age_hours.toFixed(1))}h</span>` : ''}</span>
    </li>`;
  }).join('');

  const held = Number.isFinite(model.d.brief.held_back) ? model.d.brief.held_back : null;
  return `
<p class="sw__lede">The day in the few items that clear the corroboration rule${
    Number.isFinite(model.d.brief.candidates) ? `, out of ${esc(model.d.brief.candidates)} candidates` : ''}.</p>
<ol class="sw__digest">${rows}</ol>
${held ? `<p class="nkey">${esc(held)} item${held === 1 ? '' : 's'} held back: one source carried them and no other did.
   Held back is not rejected, and it is not a judgement about the story.</p>` : ''}`;
}

function blissOf(ctx) {
  const b = ctx && ctx.bliss;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (!Number.isFinite(b.score) && b.posture !== 'awaiting-baseline') return null;
  return b;
}

function blissPanel(ctx, b) {
  const body = Number.isFinite(b.score)
    ? `<p class="sw__read"><b class="num">BLISS ${esc(b.level ?? '—')}</b>
        <span class="sw__readn">${esc(b.level_name || '')}</span>
        <span class="sw__reads num">${esc(num(b.score, 1))} of 100</span></p>`
    : `<p class="sw__dark"><b>AWAITING BASELINE</b> — ${esc(b.sources_reporting ?? 0)} of
        ${esc(b.sources_total ?? 0)} sources are reporting and none has a frozen reference to be scored
        against yet. There is no number, so none is printed.</p>`;
  return `
<p class="sw__lede">The direction this index can move that we would be glad about, measured exactly the
   way the other one is.</p>
${body}`;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Build the panel list from whatever ctx actually carries.
 *
 * A tab is emitted only when its data parsed. A tab that reveals an empty panel
 * is worse than no tab — it is the "LOADING TACTICAL DATA" failure wearing a
 * label — and "remember to check" is not a mechanism, so the gate is here.
 *
 * `head: false` on a panel whose body already ships its own section header with
 * its own stamp (_labs.mjs, _xwire.mjs). Printing "The watch floor · read
 * 20:39Z" above a section headed "The watch floor · 8 labs monitored · read
 * 20:39Z" is precisely the duplication this round exists to delete.
 */
export function panels(ctx) {
  const out = [];

  let news = null;
  try {
    news = readNews(ctx);
  } catch {
    // readNews throws on structural corruption, which is the right posture for
    // /news.html, whose whole job is the newsroom. Here it must not take the
    // dashboard down with it: the index, the race and the substrate are
    // separate failure domains by design, and build.mjs says so in three
    // places. The failure is not silent either — the SIGNAL tab is simply not
    // there, which is a visible statement rather than an empty panel claiming
    // we looked and found nothing.
    news = null;
  }
  if (news) {
    out.push({
      key: 'signal',
      glyph: '◆',
      label: 'Signal',
      count: news.total,
      countTitle: `${news.total} scored items in the collection window`,
      state: news.liveness && news.liveness.status === 'cold' ? 'dark' : 'live',
      head: { title: 'The newsroom', stamp: `compiled ${clock(news.generated_at) || ''}` },
      more: { href: ctx.href('/news.html'), text: `All ${news.total} items, each score decomposed` },
      body: () => signalPanel(ctx, news),
    });
  }

  const race = ctx.race;
  if (race && Array.isArray(race.players) && race.players.length) {
    const dark = !(race.markets && race.markets.polymarket && race.markets.polymarket.ok);
    out.push({
      key: 'race',
      glyph: '▲',
      label: 'The race',
      count: race.players.length,
      countTitle: `${race.players.length} labs on live prediction-market odds`,
      state: dark ? 'dark' : 'live',
      head: { title: 'The race', stamp: `read ${clock(race.generated_at) || ''}` },
      more: { href: ctx.href('/race.html'), text: 'The full board, and the six things an empty cell can mean' },
      body: () => racePanel(ctx, race),
    });
    out.push({
      key: 'floor',
      glyph: '■',
      label: 'Watch floor',
      count: race.players.length,
      countTitle: `${race.players.length} labs monitored for visible output`,
      state: 'live',
      // _labs.mjs owns this object end to end, including its own <style>, its
      // own header and its own stamp, so this panel adds neither. Using it
      // verbatim is the point: one watch floor, one definition of "posture",
      // and no second copy to drift.
      head: false,
      more: { href: ctx.href('/race.html'), text: 'Every lab, every channel, every blank cell' },
      body: () => labs.render(ctx),
    });
  }

  if (xwire.hasWire(ctx)) {
    const n = ctx.x.items.length;
    out.push({
      key: 'wire',
      glyph: '✕',
      label: 'X wire',
      count: n,
      countTitle: `${n} posts resolved through X's keyless embed endpoint`,
      state: 'live',
      // _xwire.mjs likewise ships its own header and its own resolved stamp.
      head: false,
      more: null,
      body: () => xwire.render(ctx, { limit: WIRE_CARDS }),
    });
  }

  const infra = ctx.infra;
  if (infra && typeof infra === 'object' && Array.isArray(infra.pillars)) {
    const n = Array.isArray(infra.sources) ? infra.sources.length : ((infra.counts && infra.counts.total) || 0);
    const state = Number.isFinite(infra.score) ? 'live' : 'uncal';
    out.push({
      key: 'substrate',
      glyph: '◐',
      label: 'Substrate',
      count: n,
      countTitle: `${n} keyless grid, drought and build-out sources`,
      state,
      head: { title: 'The substrate', stamp: `read ${clock(infra.generated_at) || ''}` },
      more: { href: ctx.href('/watts.html'), text: 'The full substrate board, corridor by corridor' },
      body: () => substratePanel(ctx, infra),
    });
  }

  const dg = digestOf(ctx);
  if (dg) {
    out.push({
      key: 'digest',
      glyph: '●',
      label: 'Digest',
      count: dg.items.length,
      countTitle: `${dg.items.length} items that cleared the corroboration rule`,
      state: 'live',
      head: { title: 'The digest', stamp: `compiled ${clock(dg.d.as_of || dg.d.generated_at) || ''}` },
      more: { href: ctx.href('/digest.html'), text: 'The full digest, with what changed and why' },
      body: () => digestPanel(ctx, dg),
    });
  }

  // The Leader Wire. It sits in the switcher rather than as its own band
  // because it answers the same question as the other panels — what is
  // happening right now — and the fold cannot carry another section.
  if (leaderwire.hasWire && leaderwire.hasWire(ctx)) {
    const rows = (ctx.leaders && Array.isArray(ctx.leaders.leaders)) ? ctx.leaders.leaders : [];
    const onRecord = rows.filter((r) => Array.isArray(r.lines) && r.lines.length).length;
    out.push({
      key: 'leaders',
      glyph: '◈',
      label: 'Leaders',
      count: onRecord,
      countTitle: `${onRecord} of ${rows.length} leaders on the record this week`,
      state: onRecord ? 'live' : 'uncal',
      head: { title: 'The leader wire', stamp: `read ${clock(ctx.leaders.generated_at) || ''}` },
      more: { href: ctx.href('/leaders.html'), text: 'Every leader, including the silent ones' },
      body: () => leaderwire.render(ctx, { heading: null }),
    });
  }

  const bl = blissOf(ctx);
  if (bl) {
    out.push({
      key: 'bliss',
      glyph: '○',
      label: 'Bliss',
      count: Number.isFinite(bl.score) ? num(bl.score, 1) : 0,
      countTitle: Number.isFinite(bl.score) ? `BLISS score ${num(bl.score, 1)} of 100` : 'No BLISS score yet',
      state: Number.isFinite(bl.score) ? 'live' : 'uncal',
      head: { title: 'The other direction', stamp: `read ${clock(bl.generated_at) || ''}` },
      more: { href: ctx.href('/bliss.html'), text: 'The full board' },
      body: () => blissPanel(ctx, bl),
    });
  }

  // The paint in site/styles.mjs binds eight radios to eight tabs to eight
  // panels. A ninth would light nothing, so it is refused here rather than
  // shipped as a tab that silently does not work.
  return out.slice(0, 8);
}
/**
 * @param {object} ctx
 * @param {object} [o]
 * @param {string} [o.id='sw']     radio group name and id prefix
 * @param {boolean} [o.style=true] emit the scoped <style> for the interiors
 * @returns {string} '' when no panel has data
 */
export function render(ctx, o = {}) {
  const uid = o.id || 'sw';
  const list = panels(ctx);
  if (!list.length) return '';

  const radios = list.map((p, i) => `<input class="sw__in sw__r" type="radio" name="${esc(uid)}" id="${esc(uid)}-${esc(p.key)}"${
    i === 0 ? ' checked' : ''}>`).join('\n  ');

  // One rule set per PRESENT panel, keyed on that panel's own radio id rather
  // than on its position, so adding or dropping a dataset can never leave a tab
  // pointing at its neighbour's panel.
  const rules = list.map((p) => `
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"] { color: var(--ink); background: var(--bg-sunken); border-color: var(--rule); border-bottom-color: var(--bg-sunken); font-weight: 700; }
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"]::after { opacity: 1; }
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"] .sw__tn { color: var(--accent); border-color: var(--accent); }
#${uid}-${p.key}:checked ~ .sw__tabs [for="${uid}-${p.key}"] .sw__tg { color: var(--accent); }
#${uid}-${p.key}:focus-visible ~ .sw__tabs [for="${uid}-${p.key}"] { outline: 2px solid var(--accent); outline-offset: -2px; }
#${uid}-${p.key}:checked ~ .sw__panels > [data-panel="${p.key}"] { visibility: visible; opacity: 1; }`).join('');

  // The order of these three lists IS the binding. They are built from one
  // array in one pass for exactly that reason.
  const tabs = list.map((p) => `<label class="sw__tab sw__t" id="${esc(uid)}-t-${esc(p.key)}" for="${esc(uid)}-${esc(p.key)}" data-state="${esc(p.state || 'live')}">` +
    `<i class="sw__tg" aria-hidden="true">${p.glyph}</i>` +
    `<span class="sw__tk sw__tl">${esc(p.label)}</span>` +
    `<b class="sw__tn num"${Number(p.count) === 0 ? ' data-zero="1"' : ''} title="${esc(p.countTitle)}">${esc(p.count)}</b>` +
    `</label>`).join('\n    ');

  const articles = list.map((p) => `<article class="sw__panel sw__p" aria-labelledby="${esc(uid)}-t-${esc(p.key)}" data-panel="${esc(p.key)}">
      ${p.head === false ? '' : `<div class="sw__head">
        <h3 class="sw__ph">${esc(p.head.title)}</h3>
        <span class="sw__pm">${esc(p.head.stamp)}</span>
      </div>`}
      <div class="sw__body">${p.body()}</div>
      ${p.more ? `<a class="sw__more" href="${esc(p.more.href)}">${esc(p.more.text)}</a>` : ''}
    </article>`).join('\n    ');

  return `${o.style === false ? '' : styleTag(rules)}
<section class="sw" id="${esc(uid)}" aria-labelledby="${esc(uid)}-h">
  <div class="sw__hd">
    <h2 class="sec__h" id="${esc(uid)}-h">The desk</h2>
    <p class="sw__k">${esc(list.length)} datasets · one slot · no page load · every one already in this HTML</p>
  </div>
  ${radios}
  <div class="sw__tabs" role="radiogroup" aria-label="Choose a dataset">
    ${tabs}
  </div>
  <div class="sw__panels">
    ${articles}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Scoped CSS — the complete control, plus the panel interiors.
//
// Self-sufficient on purpose; see the note at the top of this file. Emitted
// inside <main>, so a `.sw <thing>` rule in site/styles.mjs sits one
// specificity step above every declaration here and refines the frame without
// either file renaming anything. Every value is an existing design token, so
// both themes work with no second palette to keep in sync.
//
// The open tab is never carried by colour alone: it is filled onto the panel's
// own background, its label goes to 700 weight, a 2px accent cap sits on its
// top edge, and its radio reports `checked` to assistive technology. Desaturate
// the page and the open tab is still the heavier one that has broken the line.
// ---------------------------------------------------------------------------

export function styleTag(rules = '') {
  return `<style>
.sw{margin-top:var(--sec-lg)}
.sw__hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 var(--s-3);justify-content:space-between}
.sw__k{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 var(--s-2)}

/* The radios are the state machine. Off-screen rather than display:none, which
   would take them out of the tab order and make the control unreachable from a
   keyboard — the labels are the only visible handle, so the input being
   focusable is what makes the arrow keys work. */
.sw__in{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* Folder tabs, not pills. A tab whose bottom edge opens into the panel below it
   says "this strip and that frame are one object" without a word of
   instruction. The -1px margin is what closes the seam. */
.sw__tabs{display:flex;gap:2px;margin:0;padding:0;overflow-x:auto;overscroll-behavior-x:contain;
  scrollbar-width:none;-ms-overflow-style:none;border-bottom:1px solid var(--rule)}
.sw__tabs::-webkit-scrollbar{display:none}
.sw__tab{position:relative;flex:0 0 auto;display:inline-flex;align-items:baseline;gap:6px;
  padding:7px 11px;cursor:pointer;font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-dim);background:var(--bg);border:1px solid transparent;
  border-bottom:0;border-radius:var(--radius) var(--radius) 0 0;margin-bottom:-1px;font-weight:500;
  -webkit-user-select:none;user-select:none;transition:color 120ms ease,background-color 120ms ease}
.sw__tab:hover{color:var(--ink);background:var(--bg-raised)}
.sw__tab::after{content:'';position:absolute;left:-1px;right:-1px;top:-1px;height:2px;
  background:var(--accent);border-radius:var(--radius) var(--radius) 0 0;opacity:0;transition:opacity 120ms ease}
.sw__tg{font-style:normal;font-size:9px;line-height:1;color:var(--ink-faint)}
.sw__tk{white-space:nowrap}
/* THE LIVE COUNT. Without it the strip is a menu; with it the strip is also a
   legend — five destinations and five readings in one row. Cool accent, the
   same rule the masthead nav follows: amber is the live value of the thing you
   are looking at, so only the open tab's figure goes amber. */
.sw__tn{font-weight:700;letter-spacing:.01em;font-size:var(--t-xs);font-variant-numeric:tabular-nums;
  color:var(--accent-2);border:1px solid var(--rule);border-radius:2px;padding:0 4px;
  min-width:3.4ch;text-align:center;line-height:1.5}
/* Zero is not an event — the same rule the arrival badges follow. */
.sw__tn[data-zero="1"]{color:var(--ink-faint);font-weight:500}
/* A dataset whose source is dark says so on its own tab, before the reader
   spends a press on it. Dashed, faint, and the figure drops its hue: the same
   three-state grammar the freshness chips use, because it is the same
   statement. */
.sw__tab[data-state="dark"]{border-style:dashed;border-color:var(--rule);color:var(--ink-faint)}
.sw__tab[data-state="dark"] .sw__tn{color:var(--ink-faint);border-style:dashed}
.sw__tab[data-state="uncal"] .sw__tn{border-style:dotted}

/* One grid cell for every panel, so the frame is always as tall as the tallest
   and nothing below the control moves on a press. See the file header for the
   two measurements behind these four declarations. */
.sw__panels{display:grid;grid-template-areas:'sw';grid-template-columns:minmax(0,1fr);min-width:0;
  background:var(--bg-sunken);border:1px solid var(--rule);border-top:0;
  border-radius:0 0 var(--radius) var(--radius)}
.sw__panel{grid-area:sw;min-width:0;padding:var(--s-3) 13px 14px;visibility:hidden;opacity:0}
/* The server-selected form, for a rendering with no radios at all. */
.sw__panel[data-on="1"]{visibility:visible;opacity:1}
/* The cross-fade is decoration on content that is already painted; reduce turns
   it off and the panel still switches, instantly. MOTION.md §3. Restated rather
   than left to the blanket override, because a zero-duration opacity transition
   on a visibility-hidden element is the exact case engines disagree on. */
@media(prefers-reduced-motion:no-preference){.sw__panel{transition:opacity 140ms ease}}
@media(prefers-reduced-motion:reduce){.sw__panel{transition:none}}

/* The well is inset from the page, so the first thing in it must not be inset
   again from the well. A panel re-hosts whole page sections (_labs, _xwire, the
   reel, the feed); each of those sets a top margin for life at the top level of
   a page, and the <h2> each brings is a sub-heading of the panel here rather
   than a page heading, so it is stepped down to sit under .sw__ph. */
.sw__panel>:first-child{margin-top:0}
.sw__panel>:last-child{margin-bottom:0}
.sw__head{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px var(--s-3);padding-bottom:7px;
  margin-bottom:var(--row);border-bottom:1px solid var(--rule-soft)}
.sw__ph{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.06em;color:var(--ink);margin:0;font-weight:500}
/* THE STAMP, and every panel carries one. The first question anyone asks of an
   in-place switcher is whether the dataset they just switched to is as fresh as
   the one they switched from. pizzint's seven panels answer it zero times. */
.sw__pm{font-family:var(--mono);font-size:var(--t-2xs);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);margin-left:auto;font-variant-numeric:tabular-nums}
.sw__body{min-width:0}
.sw__body>:first-child,.sw__body>.sec:first-child{margin-top:0}
.sw__body>:last-child{margin-bottom:0}
.sw__body .sec{margin-top:var(--s-4)}
.sw__body .sec__h{font-size:var(--t-md)}
/* Every tile is also a real URL: the crawler requirement and the share
   requirement are one requirement. */
.sw__more{display:inline-flex;align-items:baseline;gap:5px;margin-top:var(--row);
  font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-dim);text-decoration:none;border-bottom:1px solid var(--rule)}
.sw__more::after{content:'\\2192';color:var(--ink-faint)}
.sw__more:hover{color:var(--ink);border-bottom-color:var(--accent)}

/* At 375px, five folder tabs measure 620px against a 343px strip, so two of
   the five datasets are off-screen until the reader thinks to swipe a strip
   that gives no sign it scrolls. A tab with a number on it is only a reason to
   press it if it is on the screen, so at phone width the strip becomes a
   two-column grid and every dataset is visible at once. The seam between the
   strip and the frame is what is traded away, and the tab is still the filled,
   bolded, accent-capped one - four signals, none of them colour alone.
   The last tab spans both columns rather than leaving a ragged row.

   The frame's 13px of padding on each side is also 26px the card reel cannot
   spend on a card, so the well tightens here too. */
@media(max-width:519px){
  .sw__tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;
    border-bottom:0;margin-bottom:6px;overflow:visible}
  .sw__tab{justify-content:space-between;border:1px solid var(--rule);border-radius:var(--radius);
    margin-bottom:0;padding:8px 9px;gap:5px;background:var(--bg-raised)}
  .sw__tab::after{left:-1px;right:-1px;top:-1px;border-radius:var(--radius) var(--radius) 0 0}
  .sw__tab:last-child:nth-child(odd){grid-column:1 / -1}
  .sw__tk{overflow:hidden;text-overflow:ellipsis}
  .sw__panels{border-top:1px solid var(--rule);border-radius:var(--radius)}
  .sw__panel{padding:var(--s-3) 10px 12px}
}

.sw__lede{font-size:var(--t-sm);line-height:1.55;color:var(--ink-dim);margin:0 0 var(--s-3);max-width:70ch}
.sw__dark{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink-dim);border:1px dashed var(--rule);
  border-radius:var(--radius);padding:10px 12px;margin:0 0 var(--s-3)}
.sw__dark b{color:var(--dark-src)}

.sw__dl{display:grid;grid-template-columns:1fr;gap:6px 18px;margin:0 0 var(--s-3);padding:0}
@media(min-width:620px){.sw__dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
.sw__dl>div{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px;min-width:0}
.sw__dl dt{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.sw__dl dd{margin:0;font-size:var(--t-sm);color:var(--ink);min-width:0;overflow-wrap:anywhere}

/* --- the race rows ------------------------------------------------------ */
.sw__race{list-style:none;margin:0 0 var(--s-3);padding:0;border-top:1px solid var(--rule)}
.sw__rrow{display:grid;grid-template-columns:2.4ch minmax(0,1fr) auto;gap:2px 9px;align-items:baseline;
  padding:9px 0 10px;border-bottom:1px solid var(--rule)}
.sw__rrank{font-family:var(--mono);font-size:11px;color:var(--ink-faint)}
.sw__rname{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sw__rval{display:flex;align-items:baseline;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.sw__pct{font-size:15px;font-weight:700;color:var(--ink)}
.sw__abs{font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--ink-faint);
  border:1px dashed var(--rule);border-radius:2px;padding:0 4px}
.sw__rbar{grid-column:2/-1;position:relative;display:block;height:4px;background:var(--wash);border-radius:2px;margin-top:3px}
.sw__rbar i{position:absolute;left:0;top:0;bottom:0;background:var(--avt-a,var(--accent));border-radius:2px}
/* Where the leg traded seven days ago. A position, not a digit — the only thing
   on this panel that shows a change as a place. */
.sw__rbar u{position:absolute;top:-3px;bottom:-3px;width:1px;background:var(--ink-faint);text-decoration:none}
.sw__mv{display:inline-flex;align-items:baseline;gap:4px;font-family:var(--mono);font-size:10.5px;color:var(--ink-faint)}
.sw__mv b{color:var(--ink-dim);font-weight:700}
.sw__mvu{letter-spacing:.06em}

/* --- substrate ---------------------------------------------------------- */
.sw__read{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px;margin:0 0 var(--s-2)}
.sw__read>b{font-size:var(--t-lg);letter-spacing:.04em;color:var(--accent-2)}
.sw__readn{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.14em;text-transform:uppercase;color:var(--ink)}
.sw__reads{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink-faint)}
.sw__pills{list-style:none;margin:var(--s-3) 0;padding:0;display:grid;gap:9px;grid-template-columns:1fr}
@media(min-width:620px){.sw__pills{grid-template-columns:repeat(3,1fr)}}
.sw__pill{display:flex;flex-direction:column;gap:4px;padding:11px 12px;background:var(--bg-raised);
  border:1px solid var(--rule);border-left:3px solid var(--accent-2);border-radius:var(--radius)}
.sw__pill[data-state="awaiting-baseline"]{border-left-style:dotted;border-left-color:var(--accent-2)}
.sw__pill[data-state="dark"]{border-left-style:dashed;border-left-color:var(--dark-src)}
.sw__pn{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.sw__pb{display:flex;align-items:baseline;gap:5px}
.sw__pv{font-family:var(--mono);font-size:var(--t-lg);font-weight:700;color:var(--ink)}
.sw__pv--none{font-size:10px;font-weight:700;letter-spacing:.12em;color:var(--ink-faint)}
.sw__pu{font-family:var(--mono);font-size:10px;color:var(--ink-faint)}
.sw__pd{font-size:12px;color:var(--ink-dim)}
.sw__pc{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;color:var(--ink-faint);margin-top:auto;padding-top:4px}

/* --- digest (optional panel) -------------------------------------------- */
.sw__digest{list-style:none;margin:0 0 var(--s-3);padding:0;border-top:1px solid var(--rule)}
.sw__drow{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;justify-content:space-between;
  padding:9px 0;border-bottom:1px solid var(--rule)}
.sw__dh{font-size:14px;line-height:1.35;min-width:0;overflow-wrap:anywhere}
.sw__dm{display:flex;align-items:baseline;gap:8px;font-family:var(--mono);font-size:10px;color:var(--ink-faint)}

/* --- the collapsed source table ---------------------------------------- */
.sw__src{margin:var(--s-3) 0 0;border-top:1px solid var(--rule-soft);padding-top:var(--s-2)}
.sw__srcin{padding-top:var(--s-2)}
${rules}
</style>`;
}
