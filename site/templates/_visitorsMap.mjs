// Inline SVG choropleth of GoatCounter country counts for the homepage.
//
// Reuses the Equal Earth frame from _worldmap.mjs so the reader map and the
// datacentre world map sit on the same projection. Server-rendered, no
// client script, deterministic from data/visitors.json + world-outline.json.

import { esc } from './_html.mjs';
import { WORLD_FRAME } from './_worldmap.mjs';

const n1 = (v) => (Math.round(v * 10) / 10).toString();

function N(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Log scale 0..1 so a country with 1 visitor is still visible next to the top. */
function intensity(count, max) {
  if (!(max > 0) || !(count > 0)) return 0;
  return Math.log1p(count) / Math.log1p(max);
}

function fillFor(t) {
  // Teal ramp on the dark homepage ground. Pure function of intensity.
  const a = Math.round(18 + t * 40);
  const b = Math.round(40 + t * 90);
  const c = Math.round(55 + t * 100);
  return `rgb(${a},${b},${c})`;
}

/**
 * @param {object|null} visitors  parsed data/visitors.json
 * @param {object|null} outline   parsed data/world-outline.json
 */
export function visitorsModel(visitors, outline) {
  if (!visitors || !Array.isArray(visitors.countries) || !visitors.countries.length) {
    return null;
  }
  if (!outline || !Array.isArray(outline.countries) || !outline.countries.length) {
    return null;
  }

  const byIso = new Map();
  for (const c of visitors.countries) {
    if (!c || !c.iso2 || !Number.isFinite(c.count) || c.count <= 0) continue;
    byIso.set(String(c.iso2).toUpperCase(), {
      iso2: String(c.iso2).toUpperCase(),
      name: c.name || String(c.iso2).toUpperCase(),
      count: c.count,
      share: Number.isFinite(c.share) ? c.share : null,
    });
  }
  if (!byIso.size) return null;

  const max = Math.max(...[...byIso.values()].map((c) => c.count));
  const southEdge = WORLD_FRAME.lat[0];
  const lands = [];
  for (const c of outline.countries) {
    const rings = (Array.isArray(c.rings) ? c.rings : []).filter((r) => Array.isArray(r) && r.length >= 3);
    if (!rings.length) continue;
    if (rings.every((r) => r.every((p) => p[1] < southEdge))) continue;
    const iso2 = c.iso2 ? String(c.iso2).toUpperCase() : null;
    const hit = iso2 ? byIso.get(iso2) : null;
    lands.push({
      iso2,
      name: (hit && hit.name) || c.name,
      count: hit ? hit.count : 0,
      t: hit ? intensity(hit.count, max) : 0,
      polys: rings.map((r) => r.map((p) => WORLD_FRAME.project(p[0], p[1]))),
    });
  }

  const ranked = [...byIso.values()].sort((a, b) => b.count - a.count
    || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const drawn = new Set(lands.filter((l) => l.count > 0).map((l) => l.iso2));
  const unoutlined = ranked.filter((c) => !drawn.has(c.iso2));

  return {
    frame: WORLD_FRAME,
    lands,
    ranked,
    unoutlined,
    max,
    totals: visitors.totals || {},
    window: visitors.window || null,
    as_of_date: visitors.as_of_date || null,
    generated_at: visitors.generated_at || null,
    source: visitors.source || null,
  };
}

export function hasVisitors(visitors) {
  return Boolean(
    visitors
    && Array.isArray(visitors.countries)
    && visitors.countries.some((c) => c && c.iso2 && Number(c.count) > 0),
  );
}

/**
 * Honest empty state so /#readers is never a dead hash. No invented counts.
 * @param {{ titleHtml?: string }} [opts]
 */
export function visitorsAwaitingPanel({ titleHtml } = {}) {
  const heading = titleHtml || `<span class="v2-sr">Where the readers are</span>`;
  return `<section class="v2-vmap v2-vmap--await" id="readers" data-sec="Readers" aria-labelledby="v2-vmap-h">
  <div class="v2-sec"><h2 id="v2-vmap-h">${heading}</h2>
    <span>DAILY · COUNTRY COUNTS · NO SNAPSHOT YET</span></div>
  <div class="v2-vmap__box v2-vmap__box--await">
    <p class="v2-vmap__await">No country counts on this build. The daily GoatCounter refresh fills
      this section with an equal-area map of where SIREN readers are —
      aggregate country totals only, from a truncated IP that is not stored.
      Until that file is here, the page shows no invented numbers.</p>
  </div>
</section>`;
}

/**
 * Compact homepage figure: choropleth + top-country list.
 * Falls back to the awaiting panel when the model cannot be built, so the
 * ✦ New link to /#readers always lands on a real section.
 * @param {object|null} model
 * @param {{ href?: Function, titleHtml?: string }} [opts]
 */
export function visitorsHomePanel(model, { href, titleHtml } = {}) {
  if (!model) return visitorsAwaitingPanel({ titleHtml });
  const days = (model.window && model.window.days) || 7;
  const countries = Number(model.totals.countries) || model.ranked.length;
  const located = Number(model.totals.visitors_located)
    || model.ranked.reduce((a, c) => a + c.count, 0);
  const asOf = model.as_of_date || String(model.generated_at || '').slice(0, 10);
  const heading = titleHtml || `<span class="v2-sr">Where are SIREN readers?</span>`;

  const land = model.lands.map((l) => {
    const d = l.polys.map((poly) => poly.map((p, i) => (
      `${i === 0 ? 'M' : 'L'}${n1(p[0])} ${n1(p[1])}`
    )).join('') + 'Z').join('');
    const fill = l.count > 0 ? fillFor(l.t) : '#121821';
    const title = l.count > 0
      ? `${l.name}: ${N(l.count)} readers`
      : l.name;
    return `<path d="${d}" fill="${fill}" stroke="#0A0E16" stroke-width="0.4"><title>${esc(title)}</title></path>`;
  }).join('');

  const top = model.ranked.slice(0, 8).map((c, i) => {
    const pct = Number.isFinite(c.share) ? `${(c.share * 100).toFixed(c.share >= 0.1 ? 0 : 1)}%` : '';
    return `<li><span class="v2-vmap__r">${i + 1}</span>`
      + `<span class="v2-vmap__n">${esc(c.name)}</span>`
      + `<span class="v2-vmap__c tnum">${N(c.count)}</span>`
      + (pct ? `<span class="v2-vmap__p tnum">${esc(pct)}</span>` : '')
      + `</li>`;
  }).join('');

  const note = model.unoutlined.length
    ? ` ${N(model.unoutlined.length)} ${model.unoutlined.length === 1 ? 'country is' : 'countries are'} counted but have no outline at this scale.`
    : '';

  const api = typeof href === 'function' ? href('/api/visitors.json') : '/api/visitors.json';

  return `<section class="v2-vmap" id="readers" data-sec="Readers" aria-labelledby="v2-vmap-h">
  <div class="v2-sec"><h2 id="v2-vmap-h">${heading}</h2>
    <span>LAST ${esc(String(days))} DAYS · ${N(countries)} COUNTRIES · UPDATED DAILY</span></div>
  <div class="v2-vmap__box">
    <figure class="v2-vmap__fig">
      <svg viewBox="0 0 ${model.frame.width} ${model.frame.height}" role="img"
        aria-label="World map of SIREN readers by country over the last ${esc(String(days))} days">
        <rect width="${model.frame.width}" height="${model.frame.height}" fill="#05070B"/>
        ${land}
      </svg>
      <figcaption>Equal-area world map. Darker teal means more readers in the last ${esc(String(days))} days.
        ${N(located)} pageviews with a country · as of ${esc(asOf)}.${esc(note)}
        Country from GoatCounter (truncated IP; IP not stored). <a href="${esc(api)}">JSON</a>.</figcaption>
    </figure>
    <ol class="v2-vmap__list" aria-label="Top countries by readers">${top}</ol>
  </div>
</section>`;
}

export const VISITORS_MAP_CSS = `
.v2-vmap{margin:18px 0 8px}
.v2-vmap__box{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(200px,0.9fr);gap:16px;align-items:stretch;border:2px solid #232C3B;background:#0E131D;padding:16px}
.v2-vmap__box--await{grid-template-columns:1fr}
.v2-vmap__await{margin:0;font-size:14px;line-height:1.55;color:#AEB7C3;max-width:62ch}
.v2-vmap__await code{font:600 12px/1.4 'IBM Plex Mono',monospace;color:#D7DCE3}
.v2-vmap__fig{margin:0;min-width:0}
.v2-vmap__fig svg{display:block;width:100%;height:auto;border:1px solid #1A2232;background:#05070B}
.v2-vmap__fig figcaption{margin-top:10px;font-size:12.5px;line-height:1.45;color:#AEB7C3}
.v2-vmap__fig figcaption a{color:#5EEAD4}
.v2-vmap__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.v2-vmap__list li{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;gap:8px;align-items:baseline;font-size:13px;color:#D7DCE3}
.v2-vmap__r{font:700 11px/1 'IBM Plex Mono',monospace;letter-spacing:.08em;color:#8A94A3}
.v2-vmap__n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.v2-vmap__c{font:700 13px/1 'IBM Plex Mono',monospace;color:#fff}
.v2-vmap__p{font:600 12px/1 'IBM Plex Mono',monospace;color:#8A94A3;min-width:2.8em;text-align:right}
@media (max-width:720px){.v2-vmap__box{grid-template-columns:1fr}}
`;
