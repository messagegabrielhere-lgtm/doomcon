// The seal — DOOMCON's badge, in the manner of a 1950s civil-defense roundel.
//
// THE OPERATOR ASKED FOR IT: "cooler graphics and logos ... 1950s doomsday
// style". The sentinel wire stays the mark - it is the favicon, it is level-lit
// and every share card draws it - and this is the dress uniform around it: a
// double ring, the name set round the rim, a triangle, and the wire across the
// middle in the colour of the level it is reading.
//
// IT IMITATES A GENRE, NOT AN AGENCY. No trefoil, because this site measures
// no radiation; no "CD", no eagle, no government name. The rim says who
// publishes it and the lower arc carries the same disclaimer as the tagline,
// so the one piece of the page dressed as officialdom also says, in its own
// lettering, that it is not a prediction.
//
// Level-lit like the mark: the wire is brandmarks.wirePoints(level), so the
// spike in the seal is the spike in the tab. Pure function of the level; no
// clock, no randomness. With no level it draws the flat wire and says so.

import { esc } from './_html.mjs';
import * as brand from '../brand.mjs';
import { wirePoints, LOGO_GRID } from '../brandmarks.mjs';

let serial = 0;

/**
 * @param {object} ctx
 * @param {object} [o]
 * @param {number} [o.size=220] rendered CSS pixels
 * @param {string} [o.id]       unique id prefix when a page carries two seals
 */
export function seal(ctx, { size = 220, id = null } = {}) {
  const st = (ctx && ctx.state) || {};
  const level = Number.isFinite(st.level) ? st.level : null;
  const uid = id || `seal${(serial += 1)}`;
  const name = level === null ? null : (brand.LEVELS.find((l) => l.level === level) || {}).name;

  // The wire, mapped from the 64-unit logo grid into the seal's centre band.
  const g = LOGO_GRID.size;
  const k = 96 / g;
  const pts = wirePoints(level === null ? 5 : level)
    .map(([x, y]) => `${(52 + x * k).toFixed(1)} ${(58 + y * k).toFixed(1)}`).join(' ');

  const ticks = [];
  for (let i = 0; i < 60; i += 1) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = i % 5 === 0 ? 61 : 64;
    ticks.push(`M${(100 + Math.cos(a) * r0).toFixed(1)} ${(100 + Math.sin(a) * r0).toFixed(1)}L${(100 + Math.cos(a) * 67).toFixed(1)} ${(100 + Math.sin(a) * 67).toFixed(1)}`);
  }

  const title = level === null
    ? `${brand.NAME} seal. No reading today.`
    : `${brand.NAME} seal. Condition ${level}, ${name}.`;

  return `<svg class="seal" viewBox="0 0 200 200" width="${size}" height="${size}" role="img"
     aria-labelledby="${esc(uid)}-t" style="--seal:${level === null ? 'var(--ink-dim)' : `var(--heat-${level})`}">
  <title id="${esc(uid)}-t">${esc(title)}</title>
  <defs>
    <path id="${esc(uid)}-top" d="M 22 100 A 78 78 0 0 1 178 100"/>
    <path id="${esc(uid)}-bot" d="M 14 100 A 86 86 0 0 0 186 100"/>
  </defs>
  <circle class="seal__ring" cx="100" cy="100" r="97"/>
  <circle class="seal__ring seal__ring--thin" cx="100" cy="100" r="70"/>
  <path class="seal__ticks" d="${ticks.join('')}"/>
  <text class="seal__rim"><textPath href="#${esc(uid)}-top" startOffset="50%" text-anchor="middle" textLength="220" lengthAdjust="spacingAndGlyphs">${esc(brand.NAME)} · ${esc(brand.PUBLICATION.toUpperCase())}</textPath></text>
  <text class="seal__rim seal__rim--low"><textPath href="#${esc(uid)}-bot" startOffset="50%" text-anchor="middle" textLength="232" lengthAdjust="spacingAndGlyphs">DETECTED EARLY · NOT A PREDICTION</textPath></text>
  <path class="seal__star" d="M13 100l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" transform="translate(0 -6)"/>
  <path class="seal__star" d="M187 100l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" transform="translate(0 -6)"/>
  <path class="seal__tri" d="M100 44 L148 128 L52 128 Z"/>
  <polyline class="seal__wire" points="${pts}"/>
  <text class="seal__cond" x="100" y="150" text-anchor="middle">${level === null ? 'NO READING' : `CONDITION ${esc(level)}`}</text>
</svg>`;
}

/** Shipped once per page that draws a seal. Tokens come from site/styles.mjs. */
export function sealCss() {
  return `
.seal { display: block; max-width: 100%; height: auto; color: var(--ink); }
.seal__ring { fill: none; stroke: currentColor; stroke-width: 3; }
.seal__ring--thin { stroke-width: 1.2; }
.seal__ticks { stroke: currentColor; stroke-width: 1; opacity: .55; fill: none; }
.seal__rim { font: 400 11px/1 var(--stencil); letter-spacing: .05em; fill: currentColor; }
.seal__rim--low { font-size: 9.5px; letter-spacing: .2em; fill: var(--ink-dim); }
.seal__star { fill: var(--seal); }
.seal__tri { fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linejoin: round; opacity: .85; }
.seal__wire { fill: none; stroke: var(--seal); stroke-width: 9; stroke-linejoin: miter; stroke-linecap: butt; }
.seal__cond { font: 400 10.5px/1 var(--stencil); letter-spacing: .18em; fill: currentColor; }
`;
}
