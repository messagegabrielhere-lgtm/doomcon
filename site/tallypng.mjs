// Tally for the PNG rasteriser: brand-assets.mjs (X avatar, header) and the
// share cards' chrome both draw the mascot through this one function.

/**
 * Tally the duty canary, the site's mascot (site/templates/_mascot.mjs), drawn
 * with the rasteriser's own primitives on the same 64-unit grid as the SVG.
 * Each shape is laid twice, ink first and fill inset, which is the outline.
 */
export function tally(S, { x, y, size, hat }) {
  const k = size / 64; const INK = '#0b0c0e'; const o = 1.3;
  const P = (px, py) => [x + px * k, y + py * k];
  const ell = (cx, cy, rx, ry, color, a0 = 0, a1 = Math.PI * 2) => {
    const pts = [];
    for (let i = 0; i <= 48; i += 1) { const a = a0 + ((a1 - a0) * i) / 48; pts.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); }
    S.polygon({ points: pts, color });
  };
  const both = (cx, cy, rx, ry, color, a0, a1) => { ell(cx, cy, rx + o, ry + o, INK, a0, a1); ell(cx, cy, rx, ry, color, a0, a1); };
  const poly = (pts, color) => S.polygon({ points: pts.map(([px, py]) => P(px, py)), color });
  for (const fx of [27, 37]) {
    S.line({ from: P(fx, 54), to: P(fx, 60), color: INK, width: 2.4 * k });
    S.line({ from: P(fx - 3, 60), to: P(fx + 3, 60), color: INK, width: 2.4 * k });
  }
  poly([[44.5, 42.5], [61, 36.5], [57.5, 52]], INK); poly([[46, 42], [59, 38], [56, 50]], '#f0b400');
  both(32, 41, 17, 15, '#ffd23f');
  both(19.5, 45, 4.6, 6.6, '#f0b400');
  ell(32, 46, 9, 7, '#ffe58a');
  both(32, 24, 12.5, 12.5, '#ffd23f');
  both(32, 21, 14, 14, hat, Math.PI, Math.PI * 2);
  S.rect({ x: x + (14.5 - o) * k, y: y + (19.5 - o) * k, w: (35 + 2 * o) * k, h: (4.6 + 2 * o) * k, r: 3.4 * k, color: INK });
  S.rect({ x: x + 14.5 * k, y: y + 19.5 * k, w: 35 * k, h: 4.6 * k, r: 2.3 * k, color: hat });
  ell(32, 13.4, 3.6, 3.6, INK); poly([[32, 11], [34.4, 15], [29.6, 15]], '#ffffff');
  poly([[27.6, 30], [36.4, 30], [32, 37.4]], INK); poly([[29, 31], [35, 31], [32, 36]], '#ff8b3d');
  for (const ex of [27, 37]) { ell(ex, 28, 2.1, 2.1, INK); ell(ex + 0.7, 27.3, 0.7, 0.7, '#ffffff'); }
}
