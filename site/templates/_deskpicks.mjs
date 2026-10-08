// DESK PICKS: stories picked by hand from Reddit's AI communities, read from
// data/desk-picks.json. Added 2026-10-08.
//
// This strip is deliberately separate from the newsroom. The newsroom keeps
// only its newest 400 items and orders them by an automated score; a story
// picked a few days after it ran would never make that cut, and letting hand
// picks jump the queue would break the rule that membership never depends on
// anyone's judgement. So picks live here, labelled as picks, unscored, and they
// never touch the index.
//
// Every line is the publisher's own headline, exactly as printed, linking to
// the publisher. Reddit is credited as where it was spotted, nothing more.
//
// Deterministic: no wall clock. A pick shows for 7 days counted from the build's
// own data stamp, so the same inputs always render the same strip.

import { esc, utcDay } from './_html.mjs';

const SHOW_DAYS = 7;

/** The picks to show this build: dated, inside the 7-day window, newest first. */
export function pickItems(ctx) {
  const picks = ctx.deskPicks;
  if (!picks || !Array.isArray(picks.items)) return [];

  const asOf = Date.parse(ctx.news?.generated_at ?? ctx.state?.generated_at ?? '');
  if (!Number.isFinite(asOf)) return [];
  const cutoff = asOf - SHOW_DAYS * 86_400_000;

  return picks.items
    .filter((p) => p && p.title && p.url && Number.isFinite(Date.parse(p.published_at)))
    .filter((p) => Date.parse(p.published_at) >= cutoff && Date.parse(p.published_at) <= asOf)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}

/** The front page (homeV2) version, in that page's dark pixel style. */
export function renderV2(ctx, pixelText) {
  const items = pickItems(ctx);
  if (!items.length) return '';
  return `<style>
.v2-desk{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:8px}
.v2-desk li{border:2px solid #2A3446;background:#0A0E16;padding:10px 12px}
.v2-desk li:hover{border-color:#6366F1}
.v2-desk a.hl{color:#fff!important;font-weight:700;text-decoration:none}
.v2-desk a.hl:hover{text-decoration:underline}
.v2-desk .meta{display:block;margin-top:4px;font-size:12px;letter-spacing:.04em;color:#AEB7C3}
.v2-desk .meta a{color:#A5B4FC!important}
</style>
  <div class="v2-sec" id="desk" data-sec="Desk picks"><h2>${pixelText('DESK PICKS', 4, '#FFFFFF', 'fit')}</h2><span>HAND-PICKED FROM REDDIT · NOT SCORED · DOES NOT MOVE THE INDEX</span></div>
  <ol class="v2-desk">${items.map((p) => `<li><a class="hl" href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a><span class="meta">${esc(String(p.publisher ?? '').toUpperCase())} · <time datetime="${esc(p.published_at)}">${esc(utcDay(p.published_at))}</time>${p.found_on ? ` · SPOTTED ON <a href="${esc(p.found_on)}" rel="noopener">REDDIT</a>` : ''}</span></li>`).join('')}</ol>`;
}

/** The classic page (/classic.html) version. */
export function render(ctx) {
  const items = pickItems(ctx);
  if (!items.length) return '';

  return `<style>
.dpick__list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.dpick__row{border:1px solid currentColor;border-radius:8px;padding:10px 12px;border-color:rgba(127,127,127,.35)}
.dpick__row a{font-weight:600;text-decoration:none}
.dpick__row a:hover{text-decoration:underline}
.dpick__meta{display:block;font-size:.85em;opacity:.75;margin-top:4px}
</style>
<section class="sec dpick" id="desk-picks" aria-labelledby="dpick-h">
  <h2 class="sec__h" id="dpick-h">Desk picks</h2>
  <p class="lede">Stories we picked by hand after spotting them in Reddit's AI communities. Each headline is the
    publisher's own, linking to the original. Picks are not scored and do not move the index.</p>
  <ol class="dpick__list">${items.map(row).join('')}</ol>
</section>`;
}

function row(p) {
  const found = p.found_on
    ? ` &middot; spotted on <a href="${esc(p.found_on)}" rel="noopener">Reddit</a>`
    : '';
  return `<li class="dpick__row">
    <a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a>
    <span class="dpick__meta">${esc(p.publisher ?? '')} &middot; <time datetime="${esc(p.published_at)}">${esc(utcDay(p.published_at))}</time>${found}</span>
  </li>`;
}
