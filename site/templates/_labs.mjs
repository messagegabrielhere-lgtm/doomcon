// The lab monitor grid — one box per frontier lab.
//
// This is the most direct thing we take from pizzint.watch. Their centrepiece
// is a grid of per-venue cards: DOMINO'S PIZZA / NO DATA / 1.4 mi / POPULAR
// TIMES ANALYSIS / a bar strip / LIVE. It works because a grid of named things
// being watched reads as surveillance, where a single aggregate number reads as
// a statistic. You scan it, you find the one that is lit, and you feel you have
// spotted something.
//
// Ours watches labs instead of pizzerias, and reads from data/race.json — which
// already carries market probability, shipping velocity, mindshare and loudness
// per player, so this costs one template and no new collector.
//
// The honesty rule that pizzint breaks and we do not: their cards print NO DATA
// under a confident DOUGHCON 5. Every cell here states its own state, and a
// lab with a dead signal says so in that cell rather than borrowing confidence
// from the ones beside it.

import { esc } from './_html.mjs';
import { avatarFor, avatarSprite, principalLine } from './_avatars.mjs';

/** Per-lab accent. Chosen for contrast against the dark ground AND legibility
 *  in light mode; never the only carrier of meaning — every box is also
 *  labelled in text, because a screenshot gets colour-shifted and a reader may
 *  not separate hues at all. */
const ACCENT = {
  openai: '#10a37f',
  anthropic: '#d97757',
  'google-deepmind': '#4285f4',
  xai: '#9aa4b2',
  meta: '#0866ff',
  deepseek: '#4d6bfe',
  mistral: '#fa520f',
  qwen: '#615ced',
};

/** A compact mark per lab. Inline SVG, no icon font, no network request.
 *  Geometric rather than logo-like on purpose: these are our glyphs for a lab,
 *  not their trademarks, and shipping a wall of real logos on a page that
 *  ranks them invites a complaint we do not need. */
const GLYPH = {
  openai: '<circle cx="8" cy="8" r="5.4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.7" fill="currentColor"/>',
  anthropic: '<path d="M3 13.2 8 2.8l5 10.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  'google-deepmind': '<path d="M8 2.6 13.4 8 8 13.4 2.6 8Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  xai: '<path d="M3.4 3.4 12.6 12.6M12.6 3.4 3.4 12.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  meta: '<path d="M2.6 10.4c1.6-5 3.4-5 5.4-1.4s3.8 3.6 5.4-1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  deepseek: '<path d="M2.8 8h4l1.6-3.4L10 11.4 11.6 8h1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>',
  mistral: '<path d="M3 13V5.2h3.3V13M9.7 13V3h3.3v10" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  qwen: '<circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.4 10.4 13 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};

const FALLBACK_GLYPH =
  '<rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6"/>';

function glyph(id) {
  return `<svg class="lab__g" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${
    GLYPH[id] || FALLBACK_GLYPH}</svg>`;
}

function pct(v, dp = 1) {
  return Number.isFinite(v) ? `${(v * 100).toFixed(dp)}%` : null;
}

function signedPts(v) {
  if (!Number.isFinite(v)) return null;
  const p = v * 100;
  if (Math.abs(p) < 0.05) return '0.0';
  return `${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}`;
}

/**
 * The activity posture for a lab, from signals we actually hold.
 *
 * Deliberately NOT a ranking and NOT a risk read. It answers one question — is
 * this lab visibly doing things right now — and it says UNREAD when the inputs
 * are not there rather than defaulting to QUIET, because "we cannot see" and
 * "nothing is happening" are different claims and only one of them is ours to
 * make.
 */
function posture(p) {
  const ship = p.shipping || {};
  const gh = ship.github || {};
  const releases = Number.isFinite(gh.releases_30d) ? gh.releases_30d : null;
  const mind = p.mindshare || {};
  const share = Number.isFinite(mind.recent_share) ? mind.recent_share : null;

  if (releases === null && share === null) {
    return { key: 'unread', word: 'UNREAD', note: 'no shipping or mindshare signal' };
  }
  const hot = (releases !== null && releases >= 20) || (share !== null && share >= 0.08);
  const warm = (releases !== null && releases >= 5) || (share !== null && share >= 0.03);
  if (hot) return { key: 'surge', word: 'SURGE', note: 'shipping and named heavily' };
  if (warm) return { key: 'active', word: 'ACTIVE', note: 'shipping steadily' };
  return { key: 'quiet', word: 'QUIET', note: 'little visible output' };
}

/** One metric cell. `state` carries its own truth so a dead signal cannot
 *  borrow confidence from the cells beside it. */
function cell(label, value, sub, state) {
  const dead = value === null || value === undefined;
  return `<div class="lab__m" data-state="${esc(state || (dead ? 'dark' : 'live'))}">
    <span class="lab__ml">${esc(label)}</span>
    <span class="lab__mv num">${dead ? '—' : esc(value)}</span>
    ${sub ? `<span class="lab__ms">${esc(sub)}</span>` : ''}
  </div>`;
}

function box(p, href) {
  const id = p.id || '';
  const accent = ACCENT[id] || 'var(--accent)';
  const st = posture(p);

  const mk = p.market || {};
  const prob = mk.state === 'live' ? pct(mk.probability) : null;
  const d7 = mk.change_7d_state === 'live' ? signedPts(mk.change_7d) : null;

  const gh = (p.shipping || {}).github || {};
  const rel = gh.state === 'live' && Number.isFinite(gh.releases_30d)
    ? `${gh.is_floor ? '≥' : ''}${gh.releases_30d}` : null;

  const mind = p.mindshare || {};
  const share = mind.state === 'live' ? pct(mind.recent_share, 1) : null;
  const mdelta = mind.delta_state === 'live' ? signedPts(mind.delta) : null;

  // The principal row replaces the old fourth metric cell, which printed
  // "Principal — no public feed" for seven of the eight boxes: eight rows of the
  // same three words, and the measured probe result behind each of them thrown
  // away. principalLine() reads that result out of the same player object, so
  // the row now carries a fact per lab instead of a repeated absence, and
  // avatarFor() puts an abstract monogram beside it with the name in text.
  //
  // Three cells, not four. docs/VISITORS.md §5 measures the failure this module
  // was part of — the level and its restatements above 6,000px of scroll — and
  // its rule is that density is facts per pixel, so a cell whose value is the
  // same string in every box is the one to delete rather than to restyle.
  const prin = principalLine(p);

  return `<li class="lab" data-posture="${esc(st.key)}" style="--lab-accent:${esc(accent)}">
  <a class="lab__in" href="${esc(href)}">
    <div class="lab__hd">
      <span class="lab__ico">${glyph(id)}</span>
      <span class="lab__n">
        <b class="lab__name">${esc(p.name || id)}</b>
      </span>
      <span class="lab__rank num" aria-label="Rank ${esc(p.rank)}">${esc(p.rank)}</span>
    </div>

    <p class="lab__st"><span class="lab__dot" aria-hidden="true"></span>${esc(st.word)}
      <span class="lab__stn">${esc(st.note)}</span></p>

    <div class="lab__prin" data-feed="${esc(prin.state)}">${avatarFor(p, {
      size: 'sm', measured: true, role: false,
    })}</div>

    <div class="lab__grid">
      ${cell('Best-model odds', prob, d7 !== null ? `${d7} pts / 7d` : 'no 7d reference', mk.state)}
      ${cell('Releases 30d', rel, gh.state === 'live' ? `${gh.repos_answered || 0} repos` : 'unread', gh.state)}
      ${cell('Mindshare', share, mdelta !== null ? `${mdelta} pts` : 'window only', mind.state)}
    </div>
  </a>
</li>`;
}

export function hasLabs(ctx) {
  return Boolean(ctx && ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length);
}

/**
 * The grid. Returns '' when there is no race data — an empty grid of named labs
 * would imply we are watching them and seeing nothing, which is a claim.
 */
export function render(ctx) {
  if (!hasLabs(ctx)) return '';
  const players = ctx.race.players;
  const href = ctx.href('/race.html');
  const stamp = ctx.race.generated_at;

  // The principals we can draw, over the labs that published one. Printed
  // rather than implied: a grid where one box carries a dotted frame wants the
  // count beside it, or the frame reads as a rendering fault.
  const named = players.filter((p) => p.principal).length;
  // live AND dormant. A dormant feed is one that answered and had published
  // nothing lately — Altman's blog, last post 2026-04-10 — so it is a feed we
  // can read, and counting only `live` here would have printed "0 of 7 publish
  // a feed we can read" over a row that names the date of his last post. That
  // is the live/dormant/dark merge docs/NEWS.md refuses, committed in a
  // denominator instead of in a table.
  const feeds = players.filter((p) => {
    const s = principalLine(p).state;
    return s === 'live' || s === 'dormant';
  }).length;

  return `${styleTag()}${avatarSprite()}
<section class="sec labs" aria-labelledby="labs-h">
  <div class="labs__hd">
    <h2 class="sec__h" id="labs-h">The watch floor</h2>
    <p class="labs__k">${esc(players.length)} labs monitored · read
      <time datetime="${esc(stamp)}">${esc(String(stamp).slice(11, 16))}Z</time>
      · <a href="${esc(href)}">full ranking →</a></p>
  </div>
  <ul class="labs__grid">${players.map((p) => box(p, href)).join('')}</ul>
  <p class="fresh__key">Posture describes visible output, not capability and not risk.
     A lab with no public feed reads UNREAD, never QUIET — we do not report an
     absence of evidence as evidence of absence.
     ${esc(named)} of ${esc(players.length)} labs publish a principal, and ${esc(feeds)} of those
     ${esc(named)} ${feeds === 1 ? 'has a personal feed that answers' : 'have a personal feed that answers'};
     the line under each name is what that feed actually did rather than a job title.
     The marks are abstract monograms, not
     likenesses: every one of these people has a computed rank and a posture word beside them
     on this page, and a drawn face next to a computed label reads as a claim about the person.
     The name in text is the identification; the shape is not.</p>
</section>`;
}

/** Scoped CSS, shipped with the module the way newsPage and racePage do, so
 *  site/styles.mjs stays owned by one author. */
export function styleTag() {
  return `<style>
.labs__hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 var(--s-3);justify-content:space-between}
.labs__k{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:0}
/* minmax(0,1fr), never plain 1fr. A 1fr track floors at the item's min-content
   width, and the principal row inside each box carries a measured sentence
   ("no post since 2026-04-10", "Posts on X.") whose min-content width then sets
   the track — which pushed the whole grid past a 375px viewport. The row itself
   is capped too; this is the caller-side half of that guard, written into the
   integration note at the bottom of _avatars.mjs. */
.labs__grid{list-style:none;margin:var(--s-3) 0 var(--s-2);padding:0;display:grid;gap:9px;
  grid-template-columns:minmax(0,1fr)}
@media(min-width:560px){.labs__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:1040px){.labs__grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.lab{position:relative}
.lab__in{display:flex;flex-direction:column;gap:7px;height:100%;padding:11px 12px;
  background:var(--bg-raised);border:1px solid var(--rule);border-left:3px solid var(--lab-accent);
  border-radius:var(--radius);text-decoration:none;color:inherit;
  transition:border-color 120ms ease,background 120ms ease}
.lab__in:hover{border-color:var(--lab-accent);background:var(--bg-sunken)}
.lab__hd{display:flex;align-items:center;gap:7px}
.lab__ico{color:var(--lab-accent);display:flex}
.lab__g{width:16px;height:16px;display:block}
.lab__n{display:flex;flex-direction:column;min-width:0;flex:1}
.lab__name{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lab__rank{font-family:var(--mono);font-size:11px;color:var(--ink-faint);font-variant-numeric:tabular-nums}
/* The principal row. min-width:0 is load-bearing: without it the avatar row's
   measured second line refuses to ellipsis and widens the box. */
.lab__prin{display:flex;min-width:0;padding:1px 0 2px;border-bottom:1px dashed var(--rule-soft)}
.lab__prin .avtrow{min-width:0;max-width:100%}
/* A feed we can read is the only one of the four states that is a live
   measurement, so it is the only one that gets full ink. The other three are
   stated in words by principalLine() and dimmed here; the dotted underline on
   an unread row is the same grammar the freshness chips use for a baseline that
   does not exist yet. */
.lab__prin[data-feed="live"] .avtrow__r{color:var(--ink-dim)}
.lab__prin[data-feed="dark"] .avtrow__r{color:var(--dark-src,var(--ink-faint))}
.lab__prin[data-feed="unread"]{border-bottom-style:dotted}
.lab__st{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:0;
  font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.lab__dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.lab__stn{color:var(--ink-faint);letter-spacing:.06em;text-transform:none;font-size:10px}
/* Posture is stated in the WORD; colour only reinforces it. A greyscale
   screenshot of this grid still reads correctly. */
.lab[data-posture="surge"] .lab__st{color:var(--accent)}
.lab[data-posture="active"] .lab__st{color:var(--ok,#5dd39e)}
.lab[data-posture="quiet"] .lab__st{color:var(--ink-dim)}
.lab[data-posture="unread"] .lab__st{color:var(--ink-faint)}
.lab[data-posture="unread"] .lab__in{border-left-style:dashed}
/* Three cells since the Principal cell moved up into .lab__prin. Two columns at
   375px with the third on its own row, three across as soon as there is room —
   and minmax(0,1fr) for the same reason the outer grid uses it. */
.lab__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 9px;margin-top:auto}
@media(min-width:400px){.lab__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.lab__m{display:flex;flex-direction:column;gap:0}
.lab__ml{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
.lab__mv{font-family:var(--mono);font-size:var(--t-sm);font-variant-numeric:tabular-nums;color:var(--ink)}
.lab__ms{font-size:9.5px;color:var(--ink-faint)}
.lab__m[data-state="dark"] .lab__mv,.lab__m[data-state="no_feed"] .lab__mv,
.lab__m[data-state="unread"] .lab__mv{color:var(--ink-faint)}
</style>`;
}
