/**
 * collector/cards/_tilemap.mjs — the United States as 51 squares.
 *
 * WHY A TILE GRID AND NOT A MAP. Three reasons, in order of how much they
 * mattered.
 *
 * 1. CONTRACT.md §1 forbids npm dependencies, and a projected outline map means
 *    shipping a TIGER or Natural Earth geometry file and a projection. The tile
 *    grid is a 51-row table of [column, row] integers — about 400 bytes — and it
 *    is the whole map.
 * 2. It survives the 200px thumbnail. A real outline map loses Rhode Island,
 *    Delaware and DC at any size a phone shows in a feed, and those are three of
 *    the cells that carry the most datacentres per square mile in the country.
 *    Equal-area squares give every state the same vote, which is the right
 *    reading for "how many sites" and an honest one for "what condition is the
 *    ground in".
 * 3. It is nobody's decoration. A reader who has seen one tile grid recognises
 *    the next one, and the same 51 squares serve the drought card and the map
 *    card, so the two are visibly the same instrument pointed at two joins.
 *
 * THE COST, STATED. A square is not a state. Texas and Rhode Island are the same
 * size here, which is exactly the distortion that makes it readable and exactly
 * the thing a critic will say first. Every card that draws this grid prints
 * "one square is one state, not one area" on its face. It is in the legend, not
 * in a footnote.
 */

import { INK, INK_DIM, INK_FAINT, GROUND, fold, textWidth } from './_kit.mjs';

/** Relative luminance, sRGB, for choosing an ink that can be read on a tile. */
function luminance(hex) {
  const h = String(hex).replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const lin = [0, 1, 2].map((i) => {
    const c = parseInt(v.slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** [column, row] on an 11x8 grid. The published US tile-grid convention. */
export const TILES = Object.freeze({
  AK: [0, 0], ME: [10, 0],
  VT: [8, 1], NH: [9, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], WI: [6, 2],
  MI: [7, 2], NY: [8, 2], RI: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3],
  PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4],
  VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [8, 7],
});

export const GRID_COLS = 11;
export const GRID_ROWS = 8;

/**
 * Draw the grid.
 *
 * @param {Surface} s
 * @param {object} o
 * @param {number} o.x, o.y, o.w        the box to fit the grid into
 * @param {(code:string)=>null|{bucket:number,value:string,hue:string}} o.cell
 *        Called once per state. Return null for "we have nothing here", which
 *        is drawn as a DOTTED empty frame and is a different statement from a
 *        zero — docs/BRAND.md §2.2 and §3.3 hold that line everywhere else on
 *        this site and it holds here.
 * @returns {{height:number, tile:number}}
 */
export function tileMap(s, { x, y, w, maxH = Infinity, cell, ramp, showValues = true }) {
  // The grid is 11 wide and 8 tall, so on a 4:5 card it is HEIGHT that binds,
  // not width. Size the tile against both and centre what is left over; a grid
  // sized on width alone runs off the bottom of the card, which is exactly the
  // kind of defect that is invisible in the source and obvious in the render.
  const gap = 7;
  const byW = Math.floor((w - gap * (GRID_COLS - 1)) / GRID_COLS);
  const byH = Math.floor((maxH - gap * (GRID_ROWS - 1)) / GRID_ROWS);
  const tile = Math.max(24, Math.min(byW, byH));
  const gridW = GRID_COLS * tile + (GRID_COLS - 1) * gap;
  const height = GRID_ROWS * tile + (GRID_ROWS - 1) * gap;
  const x0 = x + Math.round((w - gridW) / 2);

  for (const [code, [c, r]] of Object.entries(TILES)) {
    const tx = x0 + c * (tile + gap);
    const ty = y + r * (tile + gap);
    const got = cell(code);

    if (!got) {
      // Nothing here. Dotted, unlettered-in-tone: the frame belongs to nobody.
      s.frame(tx + 1, ty + 1, tile - 2, tile - 2, INK_FAINT,
        { r: 6, width: 2, alpha: 0.42, dash: [1.2, 4.6] });
      s.text(code, tx + tile / 2, ty + tile * 0.56, Math.round(tile * 0.26), INK_FAINT,
        { align: 'center', track: 0.01, alpha: 0.5 });
      continue;
    }

    const hue = got.hue || ramp[Math.max(0, Math.min(ramp.length - 1, got.bucket))];
    s.rect(tx, ty, tile, tile, hue, { r: 6, alpha: 0.92 });

    // CARRIER TWO: a count of notches down the left edge, one per bucket step.
    // Desaturate the card and the ramp is still readable as 1..5 marks.
    for (let i = 0; i <= got.bucket; i += 1) {
      s.rect(tx + 4, ty + 5 + i * Math.max(5, tile * 0.11), 3, Math.max(3, tile * 0.065),
        luminance(hue) > 0.55 ? GROUND : INK, { r: 1.5, alpha: 0.85 });
    }

    // CARRIER THREE: the words. The postal code and the figure itself.
    // Which ink is chosen by the tile's own luminance rather than by its
    // bucket, so a ramp can be reordered without silently going unreadable.
    const fg = luminance(hue) > 0.55 ? '#0a0f18' : INK;
    s.text(code, tx + tile / 2, ty + (showValues ? tile * 0.46 : tile * 0.62),
      Math.round(tile * 0.28), fg, { align: 'center', track: 0.01, weight: 0.12 });
    if (showValues && got.value != null) {
      const v = fold(String(got.value)).text;
      let vs = Math.round(tile * 0.22);
      while (vs > 8 && textWidth(v, vs, 0.01) > tile - 8) vs -= 1;
      s.text(v, tx + tile / 2, ty + tile * 0.82, vs, fg, { align: 'center', track: 0.01, alpha: 0.86 });
    }
  }

  return { height, tile, gridW, x: x0 };
}

/**
 * The legend. Colour is never the reading, so the legend prints the notch count
 * beside every swatch as well as the band it means, and the band name in words.
 */
export function tileLegend(s, { x, y, w, ramp, labels, title, titleSize = 18 }) {
  let ts = titleSize;
  const t = fold(title).text;
  while (ts > 12 && textWidth(t, ts, 0.14) > w) ts -= 1;
  s.text(t, x, y, ts, INK_FAINT, { track: 0.14 });

  // Equal columns. The label is fitted to what is left after the swatch, so a
  // long band name shrinks rather than running into its neighbour.
  const n = ramp.length;
  const colW = w / n;
  const sw = 24;
  // ONE size for all five labels. Fitting each column separately makes the
  // legend read as five different labels rather than one scale, which is the
  // opposite of what a legend is for.
  let ls = 19;
  const folded = labels.map((lab) => fold(lab).text);
  while (ls > 11 && folded.some((lt) => textWidth(lt, ls, 0.01) > colW - sw - 14)) ls -= 1;

  folded.forEach((lt, i) => {
    const lx = x + i * colW;
    s.rect(lx, y + 16, sw, sw, ramp[i], { r: 4 });
    for (let k = 0; k <= i; k += 1) {
      s.rect(lx + 4, y + 20 + k * 4.2, 2.4, 2.6,
        luminance(ramp[i]) > 0.55 ? GROUND : INK, { r: 1, alpha: 0.85 });
    }
    s.text(lt, lx + sw + 9, y + 34, ls, INK_DIM, { track: 0.01 });
  });
  return y + 56;
}
