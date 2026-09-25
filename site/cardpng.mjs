// site/cardpng.mjs — THE PNG CARD PIPELINE
//
// WHY THIS FILE EXISTS
//
// collector/card.mjs emits SVG. X does not render SVG in a post, and
// docs/BRAND.md §1.5 already records what that costs: site/build.mjs:314 warns
// in this repo's own words that "X and most crawlers will not render an SVG
// og:image", and docs/COMPETITIVE.md §1.4 calls the resulting blank share card
// our largest single acquisition hole. Every post so far has gone out as text
// only. The cards exist and have never been seen.
//
// So this module renders PNG. Zero npm dependencies (CONTRACT.md §1), Node 20
// built-ins only, node:zlib and nothing else — the same bet site/brandmarks.mjs
// already won for the favicon and the default OG image, generalised from "six
// short lines on one image" into a drawing API good enough for a card that is
// mostly words.
//
// WHAT IT IS NOT. It is not a browser and it is not a typesetter. It has one
// font (§3), it has no hyphenation, no bidi, no shaping, no kerning pairs. The
// limits are written down in docs/CARDS.md rather than discovered on somebody
// else's timeline.
//
// THE THREE RULES IT ENFORCES IN CODE, because a card is a claim that outlives
// the run that made it:
//
//   1. A glyph it cannot set THROWS. It never drops a character and ships a
//      headline with a hole in it. See `assertCanSet`.
//   2. A line that does not fit THROWS after the size ladder is exhausted.
//      Same discipline as collector/card.mjs's fitSize()/auditCard() pair and
//      brandmarks.ogImagePng().
//   3. Every number on a card is passed in from data/*.json. There is no
//      placeholder, no default figure, and no code path that prints a
//      plausible one. A missing measurement is an omitted line.
//
// DETERMINISM. No Math.random, no unseeded clock. The same inputs produce
// byte-identical bytes, as CONTRACT.md §4 requires — verified in docs/CARDS.md
// §7 by rendering every card twice in two separate Node processes.

import { deflateSync } from 'node:zlib';
import {
  GROUND, GROUND_RAISED, INK, INK_DIM, INK_FAINT, HEAT, ACCENT,
  markShapes, LOGO_GRID,
} from './brandmarks.mjs';
import * as brand from './brand.mjs';

export {
  GROUND, GROUND_RAISED, INK, INK_DIM, INK_FAINT, HEAT, ACCENT,
};

/** Pillar hues, docs/BRAND.md §4.2, dark scheme. Keyed by CONTRACT.md pillar id. */
export const PILLAR_HUE = Object.freeze({
  capability: '#6ea8fe',
  compute: '#c792ea',
  attention: '#ffb020',
  governance: '#5fd08a',
  markets: '#ff8f6b',
});

/** The two shapes X serves. Landscape is the in-feed card; portrait occupies
 *  more vertical space on a phone, which is the whole lever this file exists
 *  to pull. */
export const FORMATS = Object.freeze({
  landscape: Object.freeze({ id: 'landscape', w: 1200, h: 675 }),
  portrait: Object.freeze({ id: 'portrait', w: 1080, h: 1350 }),
});

const RAD = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

// ---------------------------------------------------------------------------
// 1. THE RASTER CORE
//
// Analytic coverage, exactly as site/brandmarks.mjs §4 argues it: every
// primitive has a cheap exact signed distance, so a pixel's coverage is
// clamp(0.5 − d, 0, 1) with d in device pixels. That is the same antialiasing
// a real rasteriser produces, with no sample budget at all, and it is why
// stroked text at a 26px cap height comes out clean rather than chewed.
//
// What is new here, over brandmarks: a filled-polygon SDF (so the module can
// draw solid shapes, not only strokes), an axial gradient, and per-primitive
// clipping to a rounded rect (so a panel can hold a bar that would otherwise
// run past its corner).
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  if (!Number.isFinite(n) || (v.length !== 6)) throw new Error(`cardpng: bad colour ${JSON.stringify(hex)}`);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix two hexes in sRGB. Good enough for a tint against a near-black ground;
 *  this is never used to carry a reading, only to sit behind one. */
export function mix(a, b, t) {
  const A = hexToRgb(a); const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function segDist2(px, py, ax, ay, bx, by) {
  const vx = bx - ax; const vy = by - ay;
  const wx = px - ax; const wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : clamp((wx * vx + wy * vy) / len2, 0, 1);
  const dx = wx - vx * t; const dy = wy - vy * t;
  return dx * dx + dy * dy;
}

/** Signed distance to a closed polygon; negative inside. The standard
 *  even-odd-free formulation — a crossing test folded into the same loop that
 *  measures the distance, so a filled shape costs one pass, not two. */
function polyDist(px, py, pts) {
  let d = Infinity;
  let s = 1;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const ax = pts[i][0]; const ay = pts[i][1];
    const bx = pts[j][0]; const by = pts[j][1];
    const dd = segDist2(px, py, ax, ay, bx, by);
    if (dd < d) d = dd;
    const c1 = py >= ay;
    const c2 = py < by;
    const c3 = (bx - ax) * (py - ay) > (by - ay) * (px - ax);
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

function rrectDist(px, py, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  const hw = w / 2; const hh = h / 2;
  const qx = Math.abs(px - (x + hw)) - hw + rr;
  const qy = Math.abs(py - (y + hh)) - hh + rr;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rr;
}

function gradColor(stops, t) {
  const u = clamp(t, 0, 1);
  for (let i = 1; i < stops.length; i += 1) {
    if (u <= stops[i].at || i === stops.length - 1) {
      const a = stops[i - 1]; const b = stops[i];
      const span = b.at - a.at;
      const k = span <= 0 ? 0 : clamp((u - a.at) / span, 0, 1);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k,
      ];
    }
  }
  return stops[0].rgb;
}

/** Paint one primitive into an RGB float buffer. `bounds` keeps the inner loop
 *  over the affected box only, which is what lets a 1200×675 card with four
 *  hundred glyph subpaths finish in well under a second. */
function paint(buf, W, H, p) {
  const alpha = p.alpha ?? 1;
  if (alpha <= 0) return;
  const rgb = p.kind === 'grad' ? null : hexToRgb(p.color);
  const pts = p.pts || [];
  const pad = (p.w ?? 0) / 2 + 1.5;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;

  if (p.kind === 'disc' || p.kind === 'ring') {
    x0 = p.cx - p.r - pad; x1 = p.cx + p.r + pad;
    y0 = p.cy - p.r - pad; y1 = p.cy + p.r + pad;
  } else if (p.kind === 'rrect' || p.kind === 'grad') {
    x0 = p.x - 1.5; y0 = p.y - 1.5; x1 = p.x + p.rw + 1.5; y1 = p.y + p.rh + 1.5;
  } else {
    for (let i = 0; i < pts.length; i += 1) {
      const px = pts[i][0]; const py = pts[i][1];
      if (px - pad < x0) x0 = px - pad;
      if (px + pad > x1) x1 = px + pad;
      if (py - pad < y0) y0 = py - pad;
      if (py + pad > y1) y1 = py + pad;
    }
  }
  const clip = p.clip;
  if (clip) {
    x0 = Math.max(x0, clip.x - 1.5); y0 = Math.max(y0, clip.y - 1.5);
    x1 = Math.min(x1, clip.x + clip.w + 1.5); y1 = Math.min(y1, clip.y + clip.h + 1.5);
  }
  const ix0 = Math.max(0, Math.floor(x0));
  const iy0 = Math.max(0, Math.floor(y0));
  const ix1 = Math.min(W - 1, Math.ceil(x1));
  const iy1 = Math.min(H - 1, Math.ceil(y1));

  for (let y = iy0; y <= iy1; y += 1) {
    const py = y + 0.5;
    for (let x = ix0; x <= ix1; x += 1) {
      const px = x + 0.5;
      let d;
      if (p.kind === 'disc') {
        d = Math.hypot(px - p.cx, py - p.cy) - p.r;
      } else if (p.kind === 'ring') {
        d = Math.abs(Math.hypot(px - p.cx, py - p.cy) - p.r) - p.w / 2;
      } else if (p.kind === 'rrect' || p.kind === 'grad') {
        d = rrectDist(px, py, p.x, p.y, p.rw, p.rh, p.r || 0);
      } else if (p.kind === 'fill') {
        d = polyDist(px, py, pts);
      } else {
        // Polyline of round-capped capsules.
        let best = Infinity;
        if (pts.length === 1) {
          best = Math.hypot(px - pts[0][0], py - pts[0][1]);
        } else {
          for (let i = 1; i < pts.length; i += 1) {
            const dd = segDist2(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
            if (dd < best) best = dd;
          }
          best = Math.sqrt(best);
        }
        d = best - p.w / 2;
      }
      let cov = clamp(0.5 - d, 0, 1);
      if (cov <= 0) continue;
      if (clip) {
        cov *= clamp(0.5 - rrectDist(px, py, clip.x, clip.y, clip.w, clip.h, clip.r || 0), 0, 1);
        if (cov <= 0) continue;
      }
      const c = p.kind === 'grad'
        ? gradColor(p.stops, ((px - p.ax) * p.dx + (py - p.ay) * p.dy) / p.len2)
        : rgb;
      const a = cov * alpha;
      const i = (y * W + x) * 3;
      const inv = 1 - a;
      buf[i] = buf[i] * inv + c[0] * a;
      buf[i + 1] = buf[i + 1] * inv + c[1] * a;
      buf[i + 2] = buf[i + 2] * inv + c[2] * a;
    }
  }
}

// --- PNG encoding. Truecolour RGB, no alpha: a card is opaque by definition,
// and dropping the alpha channel takes a quarter off the raw stream before
// deflate ever sees it.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i += 1) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/**
 * RGB8 PNG with a per-row filter chosen by the standard minimum-sum-of-
 * absolute-differences heuristic. The heuristic is worth its twenty lines
 * here and was not in brandmarks: a 64px icon is all flat ground, but a
 * 1200×675 card is mostly smooth panel fills and gradients, where filter 2
 * (Up) collapses a row to near-zero and takes the file from ~300 KB to well
 * under X's limit.
 *
 * Deterministic: zlib's deflate is a pure function of input and level.
 */
function encodePng(W, H, rgb) {
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  const cand = [Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride),
    Buffer.alloc(stride), Buffer.alloc(stride)];
  for (let y = 0; y < H; y += 1) {
    for (let i = 0; i < stride; i += 1) {
      cur[i] = clamp(Math.round(rgb[y * stride + i]), 0, 255);
    }
    let bestF = 0; let bestSum = Infinity;
    for (let f = 0; f < 5; f += 1) {
      const out = cand[f];
      let sum = 0;
      for (let i = 0; i < stride; i += 1) {
        const a = i >= 3 ? cur[i - 3] : 0;
        const b = prev[i];
        const c = i >= 3 ? prev[i - 3] : 0;
        let v;
        if (f === 0) v = cur[i];
        else if (f === 1) v = cur[i] - a;
        else if (f === 2) v = cur[i] - b;
        else if (f === 3) v = cur[i] - ((a + b) >> 1);
        else {
          const pp = a + b - c;
          const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c);
          v = cur[i] - (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c));
        }
        v &= 255;
        out[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) { bestSum = sum; bestF = f; }
    }
    raw[y * (stride + 1)] = bestF;
    cand[bestF].copy(raw, y * (stride + 1) + 1);
    cur.copy(prev);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 2. THE PATH ENGINE
//
// A five-command mini-language — M L Q C A — parsed once per glyph and cached.
// Curves are flattened to polylines, which costs the rasteriser nothing:
// a polyline of round-capped capsules is already its cheapest primitive, so a
// curved letterform renders at the same price as a chamfered one. That is the
// single fact that let this module have real letterforms instead of the
// stencil in brandmarks.mjs §5.
//
// A subpath may open with `A`, which starts the pen at the arc's own first
// point. A subpath that is only `M x,y` is a DOT — it renders as one round
// cap, which is how every full stop, colon and umlaut in the font is drawn.
// ---------------------------------------------------------------------------

/** Flattening budget. A 90° arc gets 14 segments: at a 120px cap height the
 *  worst chord error is under a tenth of a device pixel, which is below what
 *  analytic coverage can express. Fixed rather than size-dependent so the
 *  flattened outline can be cached once and the bytes stay deterministic. */
const ARC_SEGS_PER_QUARTER = 14;
const BEZIER_SEGS = 18;

function quadAt(p0, c, p1, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
}

function cubicAt(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const a = u * u * u; const b = 3 * u * u * t; const c = 3 * u * t * t; const d = t * t * t;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0],
    a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]];
}

/**
 * Parse a path into flattened subpaths, each an array of [x, y] in glyph units.
 *
 * @param {string} d
 * @returns {Array<Array<[number, number]>>}
 */
export function parsePath(d) {
  const toks = String(d).match(/[MLQCA]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const subs = [];
  let cur = null;
  let pen = [0, 0];
  let i = 0;
  const num = () => {
    const v = Number(toks[i]); i += 1;
    if (!Number.isFinite(v)) throw new Error(`cardpng: bad path number in ${JSON.stringify(d)}`);
    return v;
  };
  while (i < toks.length) {
    const op = toks[i]; i += 1;
    if (op === 'M') {
      pen = [num(), num()];
      cur = [pen];
      subs.push(cur);
    } else if (op === 'L') {
      if (!cur) throw new Error('cardpng: L before M');
      pen = [num(), num()];
      cur.push(pen);
    } else if (op === 'Q') {
      if (!cur) throw new Error('cardpng: Q before M');
      const c = [num(), num()];
      const p1 = [num(), num()];
      for (let s = 1; s <= BEZIER_SEGS; s += 1) cur.push(quadAt(pen, c, p1, s / BEZIER_SEGS));
      pen = p1;
    } else if (op === 'C') {
      if (!cur) throw new Error('cardpng: C before M');
      const c1 = [num(), num()];
      const c2 = [num(), num()];
      const p1 = [num(), num()];
      for (let s = 1; s <= BEZIER_SEGS; s += 1) cur.push(cubicAt(pen, c1, c2, p1, s / BEZIER_SEGS));
      pen = p1;
    } else if (op === 'A') {
      const cx = num(); const cy = num(); const rx = num(); const ry = num();
      const a0 = num(); const a1 = num();
      const steps = Math.max(3, Math.ceil((Math.abs(a1 - a0) / 90) * ARC_SEGS_PER_QUARTER));
      const start = [cx + rx * Math.cos(a0 * RAD), cy + ry * Math.sin(a0 * RAD)];
      if (!cur) { cur = [start]; subs.push(cur); } else { cur.push(start); }
      for (let s = 1; s <= steps; s += 1) {
        const a = a0 + ((a1 - a0) * s) / steps;
        cur.push([cx + rx * Math.cos(a * RAD), cy + ry * Math.sin(a * RAD)]);
      }
      pen = cur[cur.length - 1];
    } else {
      throw new Error(`cardpng: unknown path command ${JSON.stringify(op)} in ${JSON.stringify(d)}`);
    }
  }
  return subs;
}

// ---------------------------------------------------------------------------
// 3. THE FONT — "DOOMCON Signal"
//
// THE DECISION, STATED ONCE AND ARGUED IN docs/CARDS.md §3.
//
// A card is mostly words, and there is no font library here. The two honest
// options were (a) embed a compact vector font of my own design, or (b) ship
// approximate text and hope. Option (b) is not an option, so: a MONOLINE
// CENTRELINE FONT — every glyph is a set of centrelines stroked at a single
// weight, exactly as a technical lettering set, a Hershey font, or the
// engraved panel of any instrument ever built is drawn.
//
// WHY CENTRELINES RATHER THAN FILLED OUTLINES. An outline font is roughly
// twice the geometry to draw by hand per glyph and needs a fill rule with
// counters; a centreline font needs neither and renders through the capsule
// SDF the rasteriser already has. The cost is real and is stated in
// docs/CARDS.md §3.3: WEIGHT IS A SETTING, NOT A DESIGN. There is no true bold
// and no stem modulation, so emphasis comes from size and hue, and pushing the
// weight past about 0.11 of the cap height closes the counters of e, a, s, 6
// and 8. That is a limit of this font, it is documented, and `drawText`
// refuses a weight above 0.135.
//
// IT IS A DISPLAY AND INSTRUMENT FACE, not a text face. It is designed at
// 22px cap height and up. The card layouts in §6 put nothing below 22px that
// carries a fact, which is a layout rule and not a rendering one.
//
// METRICS, in glyph units. Everything scales from CAP.
//
//      y = -4.4   uppercase accents
//      y =  0     CAP LINE  (uppercase, digits, and b d f h k l ascenders)
//      y =  4     X-HEIGHT LINE   (x-height is 10/14 = 0.714 of cap — high,
//                                  because that is what carries small sizes)
//      y = 14     BASELINE
//      y = 18     DESCENDER
//
// Advances are proportional, EXCEPT the ten digits, which are tabular at 13
// units each. A score that ticks from 42.6 to 42.7 must not reflow the line
// under it; docs/VOICE.md §2 habit 2 puts a number next to a noun on nearly
// every surface this module draws, so the digits are the one place where the
// typographic answer and the honesty answer are the same answer.
// ---------------------------------------------------------------------------

export const FONT_METRICS = Object.freeze({
  cap: 14, xHeight: 10, baseline: 14, descender: 18, digitAdvance: 13,
});

/** char -> [advance in units, path]. */
const GLYPHS = {
  ' ': [6, ''],
  A: [13, 'M0,14 L5,0 L10,14 M1.9,9.6 L8.1,9.6'],
  B: [13, 'M0,0 L0,14 M0,0 L5.4,0 Q9.4,0 9.4,3.3 Q9.4,6.6 5.4,6.6 L0,6.6 M0,6.6 L5.9,6.6 Q10,6.6 10,10.3 Q10,14 5.9,14 L0,14'],
  C: [13, 'A5,7,5,7,-50,-310'],
  D: [13.4, 'M0,14 L0,0 L5,0 A5,7,5,7,-90,90 L0,14'],
  E: [12.4, 'M9.4,0 L0,0 L0,14 L9.4,14 M0,7 L7.4,7'],
  F: [12, 'M9,0 L0,0 L0,14 M0,7 L7.2,7'],
  G: [13.8, 'A5,7,5,7,-50,-360 L5.6,7'],
  H: [13.4, 'M0,0 L0,14 M10,0 L10,14 M0,7 L10,7'],
  I: [4.4, 'M0,0 L0,14'],
  J: [12, 'M8.6,0 L8.6,9.8 A4.6,9.8,4,4,0,180'],
  K: [13, 'M0,0 L0,14 M9.6,0 L0.4,7.5 M3.3,5.2 L10,14'],
  L: [11.6, 'M0,0 L0,14 L8.8,14'],
  M: [15.6, 'M0,14 L0,0 L6,8.8 L12,0 L12,14'],
  N: [13.4, 'M0,14 L0,0 L10,14 L10,0'],
  O: [14, 'A5,7,5,7,0,360'],
  P: [12.8, 'M0,14 L0,0 L5.4,0 A5.4,4,4,4,-90,90 L0,8'],
  Q: [14, 'A5,7,5,7,0,360 M6.3,10.2 L10.6,15.2'],
  R: [13, 'M0,14 L0,0 L5.4,0 A5.4,4,4,4,-90,90 L0,8 M5.2,8 L10,14'],
  S: [13, 'M9.7,3.2 C9.7,0.9 7.5,0 5,0 C2.5,0 0.3,1 0.3,3.3 C0.3,5.7 2.4,6.5 5.1,6.9 C7.9,7.3 9.9,8.2 9.9,10.6 C9.9,13 7.7,14 5,14 C2.3,14 0.3,13.1 0.1,11.1'],
  T: [13, 'M0,0 L10,0 M5,0 L5,14'],
  U: [13.4, 'M0,0 L0,9 A5,9,5,5,180,0 L10,0'],
  V: [13, 'M0,0 L5,14 L10,0'],
  W: [17.4, 'M0,0 L3.2,14 L7,3.4 L10.8,14 L14,0'],
  X: [13, 'M0,0 L10,14 M10,0 L0,14'],
  Y: [13, 'M0,0 L5,7.2 L10,0 M5,7.2 L5,14'],
  Z: [12.8, 'M0,0 L9.8,0 L0,14 L9.8,14'],
  a: [12.4, 'A4.4,7,4.4,3,200,360 M8.8,7 L8.8,14 M8.8,11.2 A4.4,11.2,4.4,2.8,0,360'],
  b: [12.8, 'M0,0 L0,14 M10,9 A5,9,5,5,0,360'],
  c: [12, 'A5,9,5,5,-50,-310'],
  d: [12.8, 'M10,0 L10,14 M10,9 A5,9,5,5,0,360'],
  e: [12.4, 'A5,9,5,5,0,-310 M0,9 L10,9'],
  f: [9, 'M8,2.2 Q8,0 5.4,0 Q3.2,0 3.2,2.8 L3.2,14 M0.4,6 L7.4,6'],
  g: [12.8, 'A5,9,5,5,0,360 M10,5 L10,16.2 Q10,18.6 6.6,18.6 Q4,18.6 2.6,17.6'],
  h: [12.8, 'M0,0 L0,14 M0,9 A5,9,5,5,180,360 L10,14'],
  i: [4.4, 'M0,4 L0,14 M0,0.9'],
  j: [6.2, 'M2.6,4 L2.6,16.2 Q2.6,18.6 0,18.2 M2.6,0.9'],
  k: [12, 'M0,0 L0,14 M8.8,4 L0.4,10.2 M3.2,8.2 L9.4,14'],
  l: [5.8, 'M0,0 L0,12 Q0,14 2.6,14'],
  m: [19.6, 'M0,4 L0,14 M0,9 A4,9,4,5,180,360 L8,14 M8,9 A12,9,4,5,180,360 L16,14'],
  n: [12.8, 'M0,4 L0,14 M0,9 A5,9,5,5,180,360 L10,14'],
  o: [12.8, 'A5,9,5,5,0,360'],
  p: [12.8, 'M0,4 L0,18 M10,9 A5,9,5,5,0,360'],
  q: [12.8, 'M10,4 L10,18 M10,9 A5,9,5,5,0,360'],
  r: [8.8, 'M0,4 L0,14 M0,9 A4.6,9,4.6,5,180,292'],
  s: [11.4, 'M8.54,6.29 C8.54,4.64 6.6,4 4.4,4 C2.2,4 0.26,4.71 0.26,6.36 C0.26,8.07 2.11,8.64 4.49,8.93 C6.95,9.21 8.71,9.86 8.71,11.57 C8.71,13.29 6.78,14 4.4,14 C2.02,14 0.26,13.36 0.09,11.93'],
  t: [9, 'M3.2,0.4 L3.2,11.6 Q3.2,14 6.2,14 Q7.4,14 8.2,13.6 M0.4,5 L7.2,5'],
  u: [12.8, 'M0,4 L0,9 A5,9,5,5,180,0 L10,4 M10,9 L10,14'],
  v: [12, 'M0,4 L4.8,14 L9.6,4'],
  w: [16.8, 'M0,4 L3.1,14 L6.7,6.2 L10.3,14 L13.4,4'],
  x: [11.6, 'M0,4 L9.2,14 M9.2,4 L0,14'],
  y: [12, 'M0,4 L5,13.6 M9.8,4 L3.6,18'],
  z: [11.4, 'M0,4 L9,4 L0,14 L9,14'],
  0: [13, 'A5,7,5,7,0,360 M2.3,11.4 L7.7,2.6'],
  1: [13, 'M1,2.6 L5,0 L5,14 M1.6,14 L8.4,14'],
  2: [13, 'M0.4,3.6 C0.4,1.3 2.4,0 5,0 C7.6,0 9.8,1.3 9.8,3.9 C9.8,6.6 7.2,8.6 0.2,14 L10,14'],
  3: [13, 'M0.5,2.8 C0.9,1 2.7,0 5,0 C7.5,0 9.5,1.1 9.5,3.3 C9.5,5.5 7.6,6.6 5,6.6 C7.9,6.6 10,7.8 10,10.3 C10,12.9 7.8,14 5,14 C2.5,14 0.5,13 0.2,11.1'],
  4: [13, 'M7.6,14 L7.6,0 L0.2,10.2 L10,10.2'],
  5: [13, 'M9.2,0 L1.5,0 L0.7,6.4 C1.9,5.3 3.5,4.8 5.3,4.8 C8.1,4.8 10,6.7 10,9.4 C10,12.2 8,14 5,14 C2.6,14 0.7,13 0.2,11.3'],
  6: [13, 'M8.9,1.2 C8.1,0.4 6.7,0 5.3,0 C2.1,0 0,2.9 0,8.4 C0,12 1.9,14 5,14 C7.9,14 10,12.1 10,9.4 C10,6.8 8,4.9 5.2,4.9 C2.6,4.9 0.4,6.5 0.1,8.6'],
  7: [13, 'M0.2,0 L10,0 L3.6,14'],
  8: [13, 'A5,3.3,4.4,3.3,0,360 M10,10.3 A5,10.3,5,3.7,0,360'],
  9: [13, 'M1.1,12.8 C1.9,13.6 3.3,14 4.7,14 C7.9,14 10,11.1 10,5.6 C10,2 8.1,0 5,0 C2.1,0 0,1.9 0,4.6 C0,7.2 2,9.1 4.8,9.1 C7.4,9.1 9.6,7.5 9.9,5.4'],
  '.': [5, 'M1,13.4'],
  ',': [5, 'M1.6,12.8 L1.6,13.5 Q1.6,15.2 0.2,16.4'],
  ':': [5, 'M1,6.2 M1,13.4'],
  ';': [5, 'M1.6,6.2 M1.6,12.8 L1.6,13.5 Q1.6,15.2 0.2,16.4'],
  '!': [5, 'M1,0 L1,9.6 M1,13.4'],
  '?': [11, 'M0.6,3.4 C0.6,1.2 2.6,0 4.8,0 C7.2,0 9,1.3 9,3.6 C9,6.6 4.8,6.8 4.8,9.8 M4.8,13.4'],
  "'": [5, 'M1,0 L1,4.2'],
  '"': [8.4, 'M1,0 L1,4.2 M4.4,0 L4.4,4.2'],
  '‘': [5.4, 'M2,4 C0.6,3.4 0.4,1.6 1.6,0.4'],
  '’': [5.4, 'M0.6,0.4 C2,1 2.2,2.8 1,4'],
  '“': [9, 'M2,4 C0.6,3.4 0.4,1.6 1.6,0.4 M5.6,4 C4.2,3.4 4,1.6 5.2,0.4'],
  '”': [9, 'M0.6,0.4 C2,1 2.2,2.8 1,4 M4.2,0.4 C5.6,1 5.8,2.8 4.6,4'],
  '(': [7, 'M4,-1 C1.2,2.6 1.2,11.4 4,15'],
  ')': [7, 'M0.4,-1 C3.2,2.6 3.2,11.4 0.4,15'],
  '[': [7, 'M4,-1 L1,-1 L1,15 L4,15'],
  ']': [7, 'M0.4,-1 L3.4,-1 L3.4,15 L0.4,15'],
  '-': [8.4, 'M0.4,8.4 L6.4,8.4'],
  '–': [11.4, 'M0.4,8.4 L9.4,8.4'],
  '—': [15.4, 'M0.4,8.4 L13.4,8.4'],
  '−': [12, 'M1.4,8.4 L10.6,8.4'],
  '/': [9, 'M0,14.6 L6.8,-0.6'],
  '\\': [9, 'M0,-0.6 L6.8,14.6'],
  '|': [6, 'M1,-0.6 L1,14.6'],
  '_': [12, 'M0,15.6 L10,15.6'],
  '+': [12, 'M0.8,7.6 L9.8,7.6 M5.3,3.1 L5.3,12.1'],
  '=': [12, 'M0.8,5.4 L9.8,5.4 M0.8,9.8 L9.8,9.8'],
  '<': [11, 'M8,2.6 L1,7.6 L8,12.6'],
  '>': [11, 'M1,2.6 L8,7.6 L1,12.6'],
  '×': [11, 'M1,4.4 L8,11.4 M8,4.4 L1,11.4'],
  '%': [16.6, 'A2.6,2.8,2.4,2.4,0,360 M13.6,11.2 A11.2,11.2,2.4,2.4,0,360 M12.8,0.4 L0.8,13.6'],
  '$': [13, 'M9.7,3.2 C9.7,0.9 7.5,0 5,0 C2.5,0 0.3,1 0.3,3.3 C0.3,5.7 2.4,6.5 5.1,6.9 C7.9,7.3 9.9,8.2 9.9,10.6 C9.9,13 7.7,14 5,14 C2.3,14 0.3,13.1 0.1,11.1 M5,-1.8 L5,15.8'],
  '&': [15, 'M10.4,14 L3.5,3.6 C2.4,1.9 3.5,0 5.6,0 C7.5,0 8.5,1.5 7.6,3 C6.7,4.5 0.2,7.1 0.2,10.6 C0.2,12.9 2,14 4.3,14 C6.8,14 8.6,12.4 9.6,10.3'],
  '#': [13.4, 'M3,0.6 L1.4,13.4 M8.4,0.6 L6.8,13.4 M0.2,4.8 L9.4,4.8 M0,9.4 L9.2,9.4'],
  '@': [18.4, 'A7,7,7,7,-40,-330 M9.6,7.6 A7,7.6,2.6,2.6,0,360 M9.6,7.6 L9.6,10.2 Q9.6,11.6 11.6,11.6 Q14,11.6 14,7 L14,5.2'],
  '*': [10, 'M4,1 L4,8 M1,2.8 L7,6.2 M7,2.8 L1,6.2'],
  '~': [13, 'M0.6,9.6 C1.7,7.2 3.4,7.2 4.8,8.4 C6.2,9.6 7.9,9.6 9,7.2'],
  '^': [11, 'M0.6,4.8 L4.5,0 L8.4,4.8'],
  '{': [8, 'M5,-1 C3.1,-1 3.4,2.5 3.4,5 C3.4,6.4 2.4,7 1,7 C2.4,7 3.4,7.6 3.4,9 C3.4,11.5 3.1,15 5,15'],
  '}': [8, 'M0.6,-1 C2.5,-1 2.2,2.5 2.2,5 C2.2,6.4 3.2,7 4.6,7 C3.2,7 2.2,7.6 2.2,9 C2.2,11.5 2.5,15 0.6,15'],
  '°': [8, 'A2.8,2.8,2.4,2.4,0,360'],
  '·': [7, 'M1.6,8.4'],
  '•': [9, 'M2.8,8.6 A2.8,8.6,1.1,1.1,0,360'],
  '…': [15.6, 'M1,13.4 M6,13.4 M11,13.4'],
  '→': [16.4, 'M0.4,8.4 L13,8.4 M8.8,4.6 L13,8.4 L8.8,12.2'],
  '↑': [12, 'M5,14 L5,1.4 M1.2,5.6 L5,1.4 L8.8,5.6'],
  '↓': [12, 'M5,1.4 L5,14 M1.2,9.8 L5,14 L8.8,9.8'],
};

/**
 * Combining marks, by Unicode code point. The font carries no precomposed
 * accented letters; it decomposes with NFD and stacks a mark over the base.
 * Five short paths therefore cover the whole of Latin-1 and most of Latin
 * Extended-A, which is the difference between "Björn Ommer" setting and this
 * module throwing on a real byline.
 *
 * Positions are canonical (mark occupies y 0..3); the setter shifts it to
 * y+0.2 over a lowercase base and y−4.4 over an uppercase one, and centres it
 * on the base's inked width.
 */
const MARKS = {
  '̀': 'M0,0 L3,2.6',
  '́': 'M3,0 L0,2.6',
  '̂': 'M0,2.6 L1.8,0 L3.6,2.6',
  '̃': 'M0,2.1 C0.8,0.3 2,0.3 2.8,1.3 C3.6,2.3 4.8,2.3 5.6,0.5',
  '̄': 'M0,1.6 L4,1.6',
  '̆': 'M0,0.4 C0,2.4 3.6,2.4 3.6,0.4',
  '̇': 'M0.6,1.4',
  '̈': 'M0.5,1.4 M4.1,1.4',
  '̊': 'A1.7,1.5,1.4,1.4,0,360',
  '̋': 'M2,0 L0,2.6 M4.4,0 L2.4,2.6',
  '̌': 'M0,0 L1.8,2.6 L3.6,0',
};
/** Cedilla hangs off the baseline rather than stacking above, so it is its own
 *  case rather than a mark with a negative offset. */
const CEDILLA = 'M0,14 C0,16.4 -1.6,16.2 -2.4,15.4';

const pathCache = new Map();
function flatten(d) {
  if (!d) return [];
  let v = pathCache.get(d);
  if (!v) { v = parsePath(d); pathCache.set(d, v); }
  return v;
}

/** Inked horizontal extent of a glyph, in units. Used to centre a mark. */
const inkCache = new Map();
function inkSpan(ch) {
  let v = inkCache.get(ch);
  if (v) return v;
  const g = GLYPHS[ch];
  let lo = Infinity; let hi = -Infinity;
  for (const sub of flatten(g ? g[1] : '')) {
    for (const [x] of sub) { if (x < lo) lo = x; if (x > hi) hi = x; }
  }
  if (lo === Infinity) { lo = 0; hi = g ? g[0] : 0; }
  v = [lo, hi];
  inkCache.set(ch, v);
  return v;
}

/**
 * Resolve one character to { adv, subpaths }, composing an accent if needed.
 * Returns null when the font cannot set it — the callers turn that into a
 * throw, never into a silently dropped glyph.
 */
function resolve(ch) {
  const direct = GLYPHS[ch];
  if (direct) return { adv: direct[0], subs: flatten(direct[1]) };
  const nfd = ch.normalize('NFD');
  if (nfd.length < 2) return null;
  const base = GLYPHS[nfd[0]];
  if (!base) return null;
  const subs = flatten(base[1]).slice();
  const [lo, hi] = inkSpan(nfd[0]);
  const upper = nfd[0] === nfd[0].toUpperCase() && nfd[0] !== nfd[0].toLowerCase();
  for (let i = 1; i < nfd.length; i += 1) {
    const cp = nfd[i];
    if (cp === '̧') {
      for (const sub of flatten(CEDILLA)) {
        subs.push(sub.map(([x, y]) => [x + (lo + hi) / 2, y]));
      }
      continue;
    }
    const mark = MARKS[cp];
    if (!mark) return null;
    const mSubs = flatten(mark);
    let mlo = Infinity; let mhi = -Infinity;
    for (const s of mSubs) for (const [x] of s) { if (x < mlo) mlo = x; if (x > mhi) mhi = x; }
    const dx = (lo + hi) / 2 - (mlo + mhi) / 2;
    const dy = upper ? -4.4 : 0.2;
    for (const s of mSubs) subs.push(s.map(([x, y]) => [x + dx, y + dy]));
  }
  return { adv: base[0], subs };
}

/** Every character the font can set, as a sorted string. Precomposed Latin is
 *  not listed — it is composed on demand, so the honest statement of coverage
 *  is "these glyphs, plus any NFD decomposition of them with these marks". */
export function charset() {
  return Object.keys(GLYPHS).sort().join('');
}

/** The characters of `text` this font cannot set, deduplicated and in order. */
export function missingGlyphs(text) {
  const out = [];
  for (const ch of String(text)) {
    if (ch === '\n') continue;
    if (!resolve(ch) && !out.includes(ch)) out.push(ch);
  }
  return out;
}

export function canSet(text) {
  return missingGlyphs(text).length === 0;
}

/**
 * RULE 1 IN CODE. A missing glyph throws here, loudly, naming the character
 * and its code point, at the moment the card is built — not silently at the
 * moment it is looked at.
 */
export function assertCanSet(text, where = 'text') {
  const miss = missingGlyphs(text);
  if (miss.length) {
    const named = miss.map((c) => `${JSON.stringify(c)} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
    throw new Error(`cardpng: the font has no glyph for ${named.join(', ')} — needed by ${where}: ${JSON.stringify(String(text).slice(0, 120))}`);
  }
}

// ---------------------------------------------------------------------------
// 4. SETTING TEXT
//
// `size` is ALWAYS the cap height in device pixels, never an em. A font's em
// is a container and cap height is what a reader actually sees, so every
// number in §6's layouts is a measurement of something visible.
// ---------------------------------------------------------------------------

/** Recommended leading, as a multiple of cap height. 1.42 of cap ≈ 1.0 of a
 *  normal font's em, which is tight-but-normal for a display line. */
export const LEADING = 1.42;

const MAX_WEIGHT = 0.135;

/** Width of a single line, in pixels. `track` is extra letter-spacing as a
 *  fraction of cap height; the default 0.02 is the font's own fit. */
export function measureText(text, { size, track = 0.02 } = {}) {
  if (!Number.isFinite(size)) throw new Error('cardpng: measureText needs a size');
  const k = size / FONT_METRICS.cap;
  const t = size * track;
  let w = 0;
  let n = 0;
  for (const ch of String(text)) {
    const g = resolve(ch);
    if (!g) {
      assertCanSet(ch, 'measureText');
    }
    w += g.adv * k + t;
    n += 1;
  }
  return n === 0 ? 0 : Math.max(0, w - t);
}

/**
 * Greedy wrap on spaces. A single word wider than the column is hard-broken
 * rather than allowed to overhang — there is no hyphenation dictionary here
 * and inventing break points in a real headline would be worse than a hard
 * break. The layouts in §6 size down before this ever fires; see
 * docs/CARDS.md §3.4.
 */
export function wrapText(text, { size, track = 0.02, maxWidth }) {
  if (!Number.isFinite(maxWidth)) throw new Error('cardpng: wrapText needs a maxWidth');
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter((w) => w.length > 0);
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (measureText(trial, { size, track }) <= maxWidth) { line = trial; continue; }
      if (line) { out.push(line); line = ''; }
      if (measureText(word, { size, track }) <= maxWidth) { line = word; continue; }
      let chunk = '';
      for (const ch of word) {
        if (measureText(chunk + ch, { size, track }) > maxWidth && chunk) {
          out.push(chunk); chunk = ch;
        } else { chunk += ch; }
      }
      line = chunk;
    }
    if (line) out.push(line);
    if (words.length === 0) out.push('');
  }
  return out;
}

/**
 * RULE 2 IN CODE. Step the cap height down a whole pixel at a time until the
 * text wraps into `maxLines` within `maxWidth`, and THROW if it never does.
 * Whole pixels rather than a continuous scale, so two builds of the same
 * string land on the same size and the bytes match (CONTRACT.md §4).
 */
export function fitText(text, {
  from, to = 16, track = 0.02, maxWidth, maxLines = 1,
}) {
  assertCanSet(text, 'fitText');
  for (let size = Math.round(from); size >= to; size -= 1) {
    const lines = wrapText(text, { size, track, maxWidth });
    if (lines.length <= maxLines && lines.every((l) => measureText(l, { size, track }) <= maxWidth)) {
      return { size, lines };
    }
  }
  throw new Error(`cardpng: ${JSON.stringify(String(text).slice(0, 80))} does not fit ${Math.round(maxWidth)}px in ${maxLines} line(s) even at ${to}px`);
}

/**
 * Fit a paragraph into a BOX rather than into a line count: step the cap
 * height down until the wrapped block is no taller than `maxHeight`. A card's
 * text box has a bottom edge — the thing under it — so the honest constraint
 * is a height, and trading a point of size for a fourth line is exactly the
 * decision a person would make by hand.
 *
 * @returns {{ size: number, lines: string[], height: number }}
 */
export function fitBlock(text, {
  from, to = 18, track = 0.01, maxWidth, maxHeight, leading = 1.36,
}) {
  assertCanSet(text, 'fitBlock');
  for (let size = Math.round(from); size >= to; size -= 1) {
    const lines = wrapText(text, { size, track, maxWidth });
    const height = (lines.length - 1) * size * leading + size;
    if (height <= maxHeight && lines.every((l) => measureText(l, { size, track }) <= maxWidth)) {
      return { size, lines, height };
    }
  }
  throw new Error(`cardpng: ${JSON.stringify(String(text).slice(0, 80))} does not fit a ${Math.round(maxWidth)}\u00d7${Math.round(maxHeight)}px box even at ${to}px`);
}

// ---------------------------------------------------------------------------
// 5. THE DRAWING SURFACE
//
// Everything a card needs and nothing it does not. Y is down, the origin is
// the top-left, and every coordinate is a device pixel.
// ---------------------------------------------------------------------------

function rrectOutline(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 8; i += 1) {
      const a = (a0 + (i / 8) * 90) * RAD;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  if (rr <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  corner(x + w - rr, y + rr, -90);
  corner(x + w - rr, y + h - rr, 0);
  corner(x + rr, y + h - rr, 90);
  corner(x + rr, y + rr, 180);
  pts.push(pts[0]);
  return pts;
}

/**
 * @param {number} w
 * @param {number} h
 * @param {object} [o]
 * @param {string} [o.background] a hex; the card's ground. Opaque by default
 *   because the PNG has no alpha channel.
 */
export function surface(w, h, { background = GROUND } = {}) {
  const W = Math.round(w);
  const H = Math.round(h);
  const buf = new Float32Array(W * H * 3);
  const bg = hexToRgb(background);
  for (let i = 0; i < W * H; i += 1) {
    buf[i * 3] = bg[0]; buf[i * 3 + 1] = bg[1]; buf[i * 3 + 2] = bg[2];
  }
  const push = (p) => { paint(buf, W, H, p); };

  const api = {
    width: W,
    height: H,

    /** Filled rectangle, optionally with corner radii. */
    rect({ x, y, w: rw, h: rh, r = 0, color, alpha = 1, clip }) {
      push({ kind: 'rrect', x, y, rw, rh, r, color, alpha, clip });
      return api;
    },

    /** Stroked rectangle. The stroke straddles the edge, as SVG's does. */
    strokeRect({ x, y, w: rw, h: rh, r = 0, color, width = 1, alpha = 1, clip }) {
      push({ kind: 'poly', pts: rrectOutline(x, y, rw, rh, r), w: width, color, alpha, clip });
      return api;
    },

    /**
     * Axial gradient, clipped to a (rounded) rectangle. Multi-stop, sRGB,
     * `stops` as [{ at: 0..1, color }]. Cheap because the coverage test is the
     * rounded-rect SDF the module already has and the colour is one dot
     * product per pixel — see docs/CARDS.md §2.3 on why this earned its keep
     * and a radial one did not.
     */
    gradient({
      x, y, w: rw, h: rh, r = 0, from = [x, y], to = [x, y + rh], stops, alpha = 1, clip,
    }) {
      if (!Array.isArray(stops) || stops.length < 2) throw new Error('cardpng: a gradient needs at least two stops');
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) throw new Error('cardpng: a gradient needs a non-zero axis');
      push({
        kind: 'grad', x, y, rw, rh, r, alpha, clip,
        ax: from[0], ay: from[1], dx, dy, len2,
        stops: stops.map((s) => ({ at: clamp(s.at, 0, 1), rgb: hexToRgb(s.color) })),
      });
      return api;
    },

    /** Round-capped line. */
    line({ from, to, color, width = 2, alpha = 1, clip }) {
      push({ kind: 'poly', pts: [from, to], w: width, color, alpha, clip });
      return api;
    },

    /** Round-capped, round-joined polyline. */
    polyline({ points, color, width = 2, alpha = 1, clip }) {
      push({ kind: 'poly', pts: points, w: width, color, alpha, clip });
      return api;
    },

    /** Filled polygon. Any simple polygon; the SDF handles concavity. */
    polygon({ points, color, alpha = 1, clip }) {
      push({ kind: 'fill', pts: points, color, alpha, clip });
      return api;
    },

    /** Filled circle. */
    disc({ cx, cy, r, color, alpha = 1, clip }) {
      push({ kind: 'disc', cx, cy, r, color, alpha, clip });
      return api;
    },

    /** Stroked circle. `r` is the centreline radius. */
    circle({ cx, cy, r, color, width = 2, alpha = 1, clip }) {
      push({ kind: 'ring', cx, cy, r, w: width, color, alpha, clip });
      return api;
    },

    /** Stroked arc. Angles in degrees, y down, 0 = east, increasing clockwise. */
    arc({ cx, cy, r, from, to, color, width = 2, alpha = 1, clip }) {
      const steps = Math.max(3, Math.ceil((Math.abs(to - from) / 90) * ARC_SEGS_PER_QUARTER));
      const pts = [];
      for (let i = 0; i <= steps; i += 1) {
        const a = (from + ((to - from) * i) / steps) * RAD;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      push({ kind: 'poly', pts, w: width, color, alpha, clip });
      return api;
    },

    /**
     * Set one line of text. Returns its width, so a caller can put something
     * after it without measuring twice.
     *
     * @param {string} text
     * @param {object} o
     * @param {number} o.x     left edge, or the centre / right edge under
     *                         `align`
     * @param {number} o.y     the BASELINE
     * @param {number} o.size  cap height in pixels
     * @param {number} [o.weight] stroke width as a fraction of cap height.
     *   0.085 is the text weight, 0.105 a medium, 0.12 as heavy as the
     *   counters of e/a/s/8 tolerate. Above 0.135 it throws.
     */
    text(text, {
      x, y, size, color, weight = 0.085, track = 0.02, alpha = 1, align = 'left', clip,
    }) {
      const str = String(text);
      assertCanSet(str, 'surface.text');
      if (weight > MAX_WEIGHT) {
        throw new Error(`cardpng: weight ${weight} closes this font's counters; the ceiling is ${MAX_WEIGHT} (docs/CARDS.md §3.3)`);
      }
      const k = size / FONT_METRICS.cap;
      const sw = size * weight;
      const total = measureText(str, { size, track });
      let cx = align === 'right' ? x - total : (align === 'center' ? x - total / 2 : x);
      for (const ch of str) {
        const g = resolve(ch);
        for (const sub of g.subs) {
          push({
            kind: 'poly',
            pts: sub.map(([gx, gy]) => [cx + gx * k, y + (gy - FONT_METRICS.baseline) * k]),
            w: sw, color, alpha, clip,
          });
        }
        cx += g.adv * k + size * track;
      }
      return total;
    },

    /** Several lines, top-down from the first baseline. */
    textBlock(lines, o) {
      const step = (o.leading ?? LEADING) * o.size;
      lines.forEach((l, i) => { api.text(l, { ...o, y: o.y + i * step }); });
      return step * (lines.length - 1);
    },

    /**
     * The DOOMCON detector mark, at `size` px square, from site/brandmarks.mjs
     * — the same geometry as the favicon and the OG image, so a card cannot
     * show a different instrument from the tab it was opened in. `ground` is
     * what the LED's collar is painted in and must be whatever is actually
     * behind the mark.
     */
    mark(level, { x, y, size, ground = GROUND }) {
      const g = LOGO_GRID;
      const k = size / g.size;
      const T = (v) => v * k;
      for (const s of markShapes(level)) {
        const color = s.color === 'ground' ? ground : s.color;
        if (s.kind === 'disc') {
          push({ kind: 'disc', cx: x + T(s.cx), cy: y + T(s.cy), r: s.r * k, color, alpha: s.alpha });
        } else if (s.kind === 'ring') {
          push({ kind: 'ring', cx: x + T(s.cx), cy: y + T(s.cy), r: s.r * k, w: s.w * k, color, alpha: s.alpha });
        } else if (s.kind === 'arc') {
          const pts = [];
          for (let i = 0; i <= 16; i += 1) {
            const a = s.a0 + ((s.a1 - s.a0) * i) / 16;
            pts.push([x + T(s.cx + Math.cos(a * RAD) * s.r), y + T(s.cy + Math.sin(a * RAD) * s.r)]);
          }
          push({ kind: 'poly', pts, w: s.w * k, color, alpha: s.alpha });
        }
      }
      return api;
    },

    /** @returns {Buffer} */
    png() { return encodePng(W, H, buf); },
  };
  return api;
}

// ---------------------------------------------------------------------------
// 6. THE CARDS
//
// Three designs, each in both shapes. Every figure on every one of them is
// read out of data/*.json by the caller and passed in; there is no default
// number anywhere below, and a missing measurement is an omitted line rather
// than a plausible one. `req()` is that rule with teeth.
//
// THE LAYOUT RULE THAT MAKES A CARD WORK IN A FEED. A card is first seen as a
// thumbnail about 200px wide — a sixth of the landscape card. At that scale
// only three things survive: the heat stripe, the level numeral, and the
// lockup. So every design puts the reading in an element at least 200px tall
// and lets the prose be prose. docs/CARDS.md §5 records what each design
// actually looks like at 200px, because a card that is mud at thumbnail size
// has failed at the only job it has.
// ---------------------------------------------------------------------------


const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function req(v, what) {
  if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) {
    throw new Error(`cardpng: ${what} is required and was ${JSON.stringify(v)} — a card never prints a figure it was not given`);
  }
  return v;
}

/**
 * The stamp. docs/VOICE.md §2 habit 3 — exact clock, always UTC, never
 * relative — applies hardest on a card, because a card is cached by every
 * platform that touches it and is looked at long after it was made. A figure
 * with no clock on it claims to be current forever.
 */
export function utcStamp(iso) {
  const d = new Date(req(iso, 'a timestamp'));
  if (Number.isNaN(d.getTime())) throw new Error(`cardpng: ${JSON.stringify(iso)} is not a timestamp`);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC · ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** One decimal, always shown, so 43 and 43.0 never look like different kinds
 *  of measurement. */
export const dec1 = (v) => (Math.round(req(v, 'a number') * 10) / 10).toFixed(1);

export function levelMeta(level) {
  const m = brand.LEVELS.find((l) => l.level === Number(level));
  if (!m) throw new Error(`cardpng: level ${JSON.stringify(level)} is not 1-5`);
  return m;
}

const PANEL = mix(GROUND, '#8fa6c8', 0.07);
const RULE = mix(GROUND, '#8fa6c8', 0.18);
const TRACK = mix(GROUND, '#8fa6c8', 0.13);

/** The common furniture: the level stripe, the masthead, the footer rule.
 *  Every design calls it, which is why the three read as one set. */
function chrome(S, { level, stamp, margin, stripe = 10, footer = true }) {
  const heat = HEAT[level];
  // A wash of the level's hue under the stripe. It is the one decorative
  // element on these cards and it is the level's colour, so even the
  // decoration is downstream of the reading. Cheap: one dot product a pixel,
  // over a 160px band — see docs/CARDS.md §2.3.
  S.gradient({
    x: 0, y: stripe, w: S.width, h: 160, from: [0, stripe], to: [0, stripe + 160],
    stops: [{ at: 0, color: mix(GROUND, heat, 0.13) }, { at: 1, color: GROUND }],
  });
  S.rect({ x: 0, y: 0, w: S.width, h: stripe, color: heat });
  const small = Math.max(15, Math.round(S.width / 60));
  S.mark(level, { x: margin, y: stripe + margin * 0.55, size: small * 2.7 });
  S.text(brand.PUBLICATION.toUpperCase(), {
    x: margin + small * 3.5, y: stripe + margin * 0.55 + small * 1.9,
    size: small, color: INK_FAINT, weight: 0.10, track: 0.22,
  });
  if (footer) {
    const fy = S.height - margin - small * 2.4;
    S.line({ from: [margin, fy], to: [S.width - margin, fy], color: RULE, width: 1.5 });
    const dom = brand.DOMAIN.toUpperCase();
    const domW = measureText(dom, { size: small, track: 0.20 });
    const room = S.width - margin * 2 - domW - 36;
    if (measureText(stamp, { size: small, track: 0.14 }) > room) {
      throw new Error(`cardpng: the footer stamp ${JSON.stringify(stamp)} does not fit beside ${dom} in ${Math.round(room)}px`);
    }
    S.text(stamp, {
      x: margin, y: fy + small * 1.9, size: small, color: INK_FAINT, weight: 0.10, track: 0.14,
    });
    S.text(dom, {
      x: S.width - margin, y: fy + small * 1.9, size: small, color: ACCENT,
      weight: 0.115, track: 0.20, align: 'right',
    });
  }
  return { heat, small };
}

/** One pillar row: name, bar, figure — or, where there is no figure, the name
 *  of the state instead of a bar. The three source states are never merged
 *  (docs/VOICE.md §4); a dark pillar gets no bar at all, because a bar at zero
 *  is imputation drawn as a picture. */
function pillarRow(S, p, {
  x, y, nameW, barW, valueW, h, size,
}) {
  const hue = PILLAR_HUE[p.id] || INK_DIM;
  const base = y + size * 0.36;
  S.text((p.name || p.id).toUpperCase(), {
    x, y: base, size, color: hue, weight: 0.105, track: 0.10,
  });
  const barX = x + nameW;
  if (p.dark) {
    // No bar. A bar at zero for a source we could not read is imputation drawn
    // as a picture, which is the one edit docs/VOICE.md §4 forbids outright.
    S.text('DARK', { x: barX, y: base, size, color: '#ff6b6b', weight: 0.11, track: 0.16 });
    for (let i = 0; i < 7; i += 1) {
      const seg = barW / 7;
      S.rect({ x: barX + barW * 0.42 + i * seg * 0.58, y: y - h / 2, w: seg * 0.34, h, r: h / 2, color: '#ff6b6b', alpha: 0.3 });
    }
    return;
  }
  if (p.uncalibrated || !Number.isFinite(p.score)) {
    // "Awaiting baseline" is not "dark": the source answered, there is simply
    // no frozen history to score it against. Dotted, never dashed — the two
    // patterns carry different meanings and docs/BRAND.md §2.2 keeps them apart.
    S.text('AWAITING BASELINE', { x: barX, y: base, size, color: '#56b0e0', weight: 0.105, track: 0.10 });
    return;
  }
  S.rect({ x: barX, y: y - h / 2, w: barW, h, r: h / 2, color: TRACK });
  S.rect({
    x: barX, y: y - h / 2, w: Math.max(h, (clamp(p.score, 0, 100) / 100) * barW), h, r: h / 2, color: hue,
  });
  S.text(dec1(p.score), {
    x: barX + barW + valueW, y: base, size, color: INK, weight: 0.105, align: 'right',
  });
}

/**
 * CARD 1 — THE STATE CARD. The daily post's image: the level, the composite,
 * the five pillars, the clock.
 *
 * WHAT SURVIVES AT 200px: the stripe and the level numeral, which is 230px
 * tall on the landscape card — 38px in the thumbnail, bigger than the whole
 * headline of a text post.
 */
export function stateCard(state, { format = 'landscape', generatedAt } = {}) {
  const fmt = FORMATS[format];
  if (!fmt) throw new Error(`cardpng: unknown format ${JSON.stringify(format)}`);
  const portrait = fmt.id === 'portrait';
  const level = req(state && state.level, 'state.level');
  const meta = levelMeta(level);
  const score = req(state && state.score, 'state.score');
  const pillars = Array.isArray(state && state.pillars) ? state.pillars : [];
  if (pillars.length !== 5) throw new Error(`cardpng: the state card sets five pillars and got ${pillars.length}`);
  // The tally rides on the stamp line. Liveness is a feature (docs/VOICE.md
  // §2): the count of dark and uncalibrated sources goes on the card, in the
  // same breath as the clock, rather than behind it.
  const sources = Array.isArray(state && state.sources) ? state.sources : [];
  const live = sources.filter((x) => x.ok).length;
  const dark = sources.filter((x) => !x.ok && !x.uncalibrated).length;
  const uncal = sources.filter((x) => x.uncalibrated).length;
  const tally = [];
  if (sources.length) {
    tally.push(`${live} of ${sources.length} sources live`);
    if (uncal) tally.push(`${uncal} awaiting baseline`);
    if (dark) tally.push(`${dark} dark`);
  }
  const stamp = utcStamp(generatedAt || (state && state.generated_at));

  const S = surface(fmt.w, fmt.h, { background: GROUND });
  const margin = portrait ? 72 : 64;
  const { heat, small } = chrome(S, { level, stamp, margin });

  // Every baseline below was measured against the one under it. The landscape
  // card is 675px tall and its footer rule sits at 563, so the columns are
  // laid out from that ceiling upward rather than from the top down — which is
  // the only way the last pillar bar and the tally both clear it.
  const L = portrait
    ? { numCap: 264, numBase: 496, wordBase: 202, nameCap: 54, nameBase: 576, epiBase: 624,
      colX: margin, colW: fmt.w - margin * 2, scoreCap: 100, scoreBase: 812, bandBase: 864,
      pillarTop: 930, pillarStep: 48, size: 26, barH: 14, nameW: 400, valueW: 110 }
    : { numCap: 208, numBase: 412, wordBase: 178, nameCap: 44, nameBase: 474, epiBase: 512,
      colX: 520, colW: fmt.w - 520 - margin, scoreCap: 86, scoreBase: 240, bandBase: 288,
      pillarTop: 344, pillarStep: 36, size: 19, barH: 11, nameW: 300, valueW: 64 };

  // "Compute & Capital" is the longest pillar name and CONTRACT.md forbids
  // abbreviating it, so the row's type size is measured against the widest
  // name rather than guessed at. Whole pixels down, as everywhere else.
  while (L.size > 13 && brand.PILLARS.some(
    (pm) => measureText(pm.name.toUpperCase(), { size: L.size, track: 0.10 }) > L.nameW - 16,
  )) L.size -= 1;

  // The lockup and the numeral. The numeral is the card: it is the one element
  // that is still a reading at a sixth of full size.
  S.text(brand.NAME, {
    x: margin, y: L.wordBase, size: portrait ? 52 : 40, color: INK_DIM, weight: 0.11, track: 0.26,
  });
  S.text(String(level), {
    x: margin - (portrait ? 8 : 6), y: L.numBase, size: L.numCap, color: heat, weight: 0.105,
  });
  // UNPRECEDENTED is 13 characters and ROUTINE is 7, so the level name is
  // fitted to the left column rather than set at a fixed size — at DOOMCON 1
  // the fixed size ran 80px into the composite column, which is the sort of
  // defect nobody sees until the loudest day of the year.
  const nameFit = fitText(meta.name, {
    from: L.nameCap, to: 24, track: 0.14, maxLines: 1,
    maxWidth: portrait ? L.colW : L.colX - margin - 28,
  });
  S.text(meta.name, {
    x: margin, y: L.nameBase, size: nameFit.size, color: heat, weight: 0.115, track: 0.14,
  });
  S.text(meta.epithet, {
    x: margin, y: L.epiBase, size: portrait ? 28 : 22, color: INK_FAINT, weight: 0.09, track: 0.06,
  });

  // The composite, its denominator and its band — docs/VOICE.md §4's "always
  // write the figure, its denominator and its timestamp", as a layout.
  S.text('COMPOSITE', {
    x: L.colX, y: L.scoreBase - L.scoreCap - 22, size: small, color: INK_FAINT, weight: 0.10, track: 0.22,
  });
  const sw = S.text(dec1(score), {
    x: L.colX, y: L.scoreBase, size: L.scoreCap, color: INK, weight: 0.105,
  });
  S.text('of 100', {
    x: L.colX + sw + 18, y: L.scoreBase, size: Math.round(L.scoreCap * 0.30), color: INK_DIM, weight: 0.09,
  });
  S.text(`${meta.name} BAND ${meta.band[0]}–${meta.band[1]}`, {
    x: L.colX, y: L.bandBase, size: small + 3, color: INK_FAINT, weight: 0.10, track: 0.16,
  });

  // The move since the previous observation. Direction is a SHAPE before it is
  // a hue — up, down, unchanged as three silhouettes (docs/BRAND.md §2.2) —
  // and the sentence is in the past, because that is the only tense this
  // index has (docs/VOICE.md §3.1).
  const delta = state.delta_from_previous;
  if (Number.isFinite(delta)) {
    const words = delta === 0 ? 'unchanged since the previous observation'
      : `${dec1(Math.abs(delta))} ${delta > 0 ? 'higher' : 'lower'} than the previous observation`;
    const tw = measureText(words, { size: small, track: 0.05 });
    const gx = L.colX + L.colW - tw - 30;
    const dy = L.bandBase + (portrait ? 38 : 32);
    const gy = dy - small * 0.34;
    const r = small * 0.52;
    if (delta === 0) {
      S.rect({ x: gx - r, y: gy - r * 0.26, w: r * 2, h: r * 0.52, r: r * 0.26, color: INK_DIM });
    } else {
      S.polygon({
        points: delta > 0
          ? [[gx, gy - r], [gx + r, gy + r * 0.72], [gx - r, gy + r * 0.72]]
          : [[gx, gy + r], [gx + r, gy - r * 0.72], [gx - r, gy - r * 0.72]],
        color: INK_DIM,
      });
    }
    S.text(words, {
      x: L.colX + L.colW, y: dy, size: small, color: INK_FAINT,
      weight: 0.10, track: 0.05, align: 'right',
    });
  }

  for (let i = 0; i < pillars.length; i += 1) {
    pillarRow(S, pillars[i], {
      x: L.colX, y: L.pillarTop + i * L.pillarStep,
      nameW: L.nameW, barW: L.colW - L.nameW - L.valueW, valueW: L.valueW,
      h: L.barH, size: L.size,
    });
  }

  const noteY = S.height - margin - small * 2.4 - (portrait ? 34 : 18);
  S.text(brand.DISCLAIMER_SHORT, {
    x: margin, y: noteY, size: small, color: INK_DIM, weight: 0.10, track: 0.05,
  });
  if (tally.length) {
    // Under the pillar block, because that is what it is about: which of the
    // sources behind those five bars answered this run.
    S.text(tally.join(' · '), {
      x: fmt.w - margin, y: L.pillarTop + (pillars.length - 1) * L.pillarStep + (portrait ? 40 : 30),
      size: small - 2, color: INK_FAINT, weight: 0.10, track: 0.05, align: 'right',
    });
  }
  return S.png();
}

/**
 * CARD 2 — THE HEADLINE CARD. One scored item from data/news.json: what was
 * carried, by how many independent sources, and when the first of them
 * published it.
 *
 * THE HEADLINE IS THE CARD and it is real text off a real feed, so it is
 * FITTED, not trusted: the cap height steps down a pixel at a time until it
 * wraps into the box, and throws if it never does.
 */
export function headlineCard(item, { level, format = 'landscape', generatedAt } = {}) {
  const fmt = FORMATS[format];
  if (!fmt) throw new Error(`cardpng: unknown format ${JSON.stringify(format)}`);
  const portrait = fmt.id === 'portrait';
  const L = req(level, 'level');
  const meta = levelMeta(L);
  const title = String(req(item && item.title, 'item.title')).replace(/\s+/g, ' ').trim();
  const stamp = utcStamp(generatedAt || (item && item.published_at));

  const S = surface(fmt.w, fmt.h, { background: GROUND });
  const margin = portrait ? 72 : 64;
  const { heat, small } = chrome(S, { level: L, stamp, margin });
  const col = fmt.w - margin * 2;

  // THE BADGE, top right. It is the card's thumbnail-scale anchor: 140px tall
  // on the landscape card, so the numeral inside it is still 8px in a 200px
  // thumbnail — the same size as the whole of a text post's first line.
  const bw = portrait ? 410 : 352;
  const bh = portrait ? 176 : 140;
  const bx = fmt.w - margin - bw;
  const by = portrait ? 176 : 124;
  S.rect({ x: bx, y: by, w: bw, h: bh, r: 18, color: PANEL });
  S.rect({ x: bx, y: by, w: 8, h: bh, r: 4, color: heat });
  S.text(String(L), { x: bx + 30, y: by + bh - (portrait ? 34 : 26), size: bh * 0.58, color: heat, weight: 0.105 });
  S.text('DOOMCON', {
    x: bx + bw - 28, y: by + (portrait ? 58 : 50), size: small - 3, color: INK_DIM,
    weight: 0.11, track: 0.24, align: 'right',
  });
  S.text(meta.name, {
    x: bx + bw - 28, y: by + bh - (portrait ? 38 : 30), size: portrait ? 30 : 24,
    color: heat, weight: 0.115, track: 0.10, align: 'right',
  });

  // The kind and the pillar, as words. A chip carries its hue and its word
  // both; docs/BRAND.md §5 forbids the hue carrying a fact by itself.
  const chipY = portrait ? 258 : 196;
  const kind = String(item.kind || 'item').toUpperCase();
  const kw = S.text(kind, { x: margin + 18, y: chipY, size: small + 2, color: heat, weight: 0.11, track: 0.20 });
  S.strokeRect({
    x: margin, y: chipY - small * 1.95, w: kw + 36, h: small * 2.8, r: small * 1.4,
    color: heat, width: 1.6, alpha: 0.6,
  });
  const pillarId = item.pillar;
  if (pillarId) {
    const pm = brand.PILLARS.find((x) => x.id === pillarId);
    S.text((pm ? pm.name : pillarId).toUpperCase(), {
      x: margin + kw + 62, y: chipY, size: small + 2, color: PILLAR_HUE[pillarId] || INK_DIM,
      weight: 0.11, track: 0.20,
    });
  }

  // THE HEADLINE. Real text off a real feed, so it is fitted to a box with a
  // bottom edge rather than trusted to be short. The longest title in the live
  // file — 199 characters — lands at a 29px cap over four lines on the
  // landscape card and a 50px cap over nine on the portrait one.
  const boxTop = portrait ? 400 : 292;
  const boxH = portrait ? 600 : 180;
  const fit = fitBlock(title, {
    from: portrait ? 76 : 62, to: 24, maxWidth: col, maxHeight: boxH, track: 0.01,
  });
  S.textBlock(fit.lines, {
    x: margin, y: boxTop + fit.size, size: fit.size, color: INK, weight: 0.088, track: 0.01, leading: 1.36,
  });

  // The corroboration line: docs/VOICE.md §2 habit 4, "name the source in the
  // sentence". Every clause is omitted rather than guessed at, and the whole
  // line is fitted, because a source list is as long as it is.
  const corr = (item.meta && item.meta.corroboration) || {};
  const bits = [];
  if (Number.isFinite(corr.count)) bits.push(`${corr.count} independent ${corr.count === 1 ? 'source' : 'sources'}`);
  if (Array.isArray(corr.sources) && corr.sources.length) bits.push(corr.sources.join(', '));
  if (corr.first_seen_published_at) bits.push(`first at ${utcStamp(corr.first_seen_published_at)}`);
  if (bits.length) {
    const line = fitText(bits.join(' \u00b7 '), {
      from: small + 6, to: 13, maxWidth: col, maxLines: 1, track: 0.03,
    });
    S.text(line.lines[0], {
      x: margin, y: boxTop + boxH + (portrait ? 80 : 40), size: line.size,
      color: INK_DIM, weight: 0.095, track: 0.03,
    });
  }

  S.text(brand.DISCLAIMER_SHORT, {
    x: margin, y: S.height - margin - small * 2.4 - (portrait ? 34 : 18),
    size: small, color: INK_FAINT, weight: 0.10, track: 0.05,
  });
  return S.png();
}

/**
 * CARD 3 — THE RACE CARD. The live Polymarket book on data/race.json's
 * question, one row per lab.
 *
 * A market probability is somebody else's number and it is labelled as such —
 * the venue and the question are printed, because a bare percentage next to a
 * lab's name would read as ours.
 */
export function raceCard(race, { level, format = 'landscape', generatedAt, limit = 5 } = {}) {
  const fmt = FORMATS[format];
  if (!fmt) throw new Error(`cardpng: unknown format ${JSON.stringify(format)}`);
  const portrait = fmt.id === 'portrait';
  const L = req(level, 'level');
  const stamp = utcStamp(generatedAt || (race && race.generated_at));
  const horizon = race && race.markets && race.markets.polymarket && race.markets.polymarket.horizon;
  const question = String(req(horizon && horizon.title, 'race.markets.polymarket.horizon.title'));
  const legs = (Array.isArray(horizon.legs) ? horizon.legs : [])
    .filter((l) => Number.isFinite(l.probability))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, portrait ? limit + 3 : limit);
  if (!legs.length) throw new Error('cardpng: the race card needs at least one priced leg');
  const volume = legs.reduce((a, l) => a + (Number.isFinite(l.volume_usd) ? l.volume_usd : 0), 0);

  const S = surface(fmt.w, fmt.h, { background: GROUND });
  const margin = portrait ? 72 : 64;
  const { heat, small } = chrome(S, { level: L, stamp, margin });
  const col = fmt.w - margin * 2;

  S.text('POLYMARKET, LIVE', {
    x: margin, y: portrait ? 230 : 152, size: small + 2, color: ACCENT, weight: 0.11, track: 0.22,
  });
  const qTop = portrait ? 272 : 176;
  const q = fitBlock(question, {
    from: portrait ? 64 : 48, to: 22, maxWidth: col, maxHeight: portrait ? 164 : 100,
    track: 0.01, leading: 1.3,
  });
  S.textBlock(q.lines, {
    x: margin, y: qTop + q.size, size: q.size, color: INK, weight: 0.095, track: 0.01, leading: 1.3,
  });

  const rowTop = portrait ? 520 : 318;
  const step = portrait ? 86 : 44;
  const nameW = portrait ? 340 : 250;
  const pctW = portrait ? 160 : 130;
  const barX = margin + nameW;
  const barW = col - nameW - pctW;
  for (let i = 0; i < legs.length; i += 1) {
    const leg = legs[i];
    const y = rowTop + i * step;
    const lead = i === 0;
    const size = lead ? (portrait ? 42 : 29) : (portrait ? 32 : 22);
    S.text(String(leg.title), {
      x: margin, y: y + size * 0.36, size, color: lead ? INK : INK_DIM, weight: lead ? 0.115 : 0.10,
    });
    const h = lead ? (portrait ? 26 : 18) : (portrait ? 18 : 12);
    S.rect({ x: barX, y: y - h / 2, w: barW, h, r: h / 2, color: TRACK });
    S.rect({
      x: barX, y: y - h / 2, w: Math.max(h, barW * clamp(leg.probability, 0, 1)), h, r: h / 2,
      color: lead ? heat : INK_DIM, alpha: lead ? 1 : 0.75,
    });
    S.text(`${dec1(leg.probability * 100)}%`, {
      x: fmt.w - margin, y: y + size * 0.36, size, color: lead ? heat : INK_DIM,
      weight: lead ? 0.115 : 0.10, align: 'right',
    });
  }

  // The venue owns these numbers and the card says so. A bare percentage
  // beside a lab's name would read as ours; docs/VOICE.md §1 keeps the two
  // apart, and the volume is the denominator that makes the price mean
  // anything at all.
  const vol = volume >= 1e6 ? `$${(volume / 1e6).toFixed(2)}M` : `$${Math.round(volume / 1000)}K`;
  const note = fitText(
    `${vol} of volume across ${legs.length} priced legs · odds are Polymarket’s, not ours`,
    { from: small, to: 13, maxWidth: col, maxLines: 1, track: 0.05 },
  );
  S.text(note.lines[0], {
    x: margin, y: S.height - margin - small * 2.4 - (portrait ? 34 : 18),
    size: note.size, color: INK_FAINT, weight: 0.10, track: 0.05,
  });
  return S.png();
}

/** The registry a caller iterates. Adding a design is adding one entry here
 *  and one function above; docs/CARDS.md §6 is the checklist. */
export const CARDS = Object.freeze({
  state: stateCard,
  headline: headlineCard,
  race: raceCard,
});

/**
 * Render one card by name.
 *
 * @param {'state'|'headline'|'race'} name
 * @param {object} data     the design's own input, straight off data/*.json
 * @param {object} [opts]   { format, level, generatedAt }
 * @returns {Buffer} PNG
 */
export function renderCard(name, data, opts = {}) {
  const fn = CARDS[name];
  if (!fn) throw new Error(`cardpng: no card design called ${JSON.stringify(name)} — have ${Object.keys(CARDS).join(', ')}`);
  return fn(data, opts);
}

// ---------------------------------------------------------------------------
// 7. THE WHOLE SET, AND THE COMMAND LINE
// ---------------------------------------------------------------------------

/**
 * Every card for one observation, as `{ path, body, type }` — the same shape
 * site/brandmarks.mjs's brandmarkAssets() returns, so the integrator's write
 * loop needs no second branch.
 *
 * `news` and `race` are optional: a card whose data has not been collected is
 * OMITTED from the list, never emitted with a placeholder in it.
 *
 * @param {object} bundle  { state, item, race }
 * @param {object} [opts]  { formats }
 */
export function cardAssets({ state, item, race }, { formats = ['landscape', 'portrait'] } = {}) {
  const out = [];
  const level = state && state.level;
  for (const format of formats) {
    const suffix = format === 'portrait' ? '-portrait' : '';
    if (state) {
      out.push({ path: `cards/state${suffix}.png`, body: stateCard(state, { format }), type: 'image/png' });
    }
    if (item) {
      out.push({ path: `cards/headline${suffix}.png`, body: headlineCard(item, { level, format }), type: 'image/png' });
    }
    if (race) {
      out.push({ path: `cards/race${suffix}.png`, body: raceCard(race, { level, format }), type: 'image/png' });
    }
  }
  return out;
}

// `node site/cardpng.mjs <outDir>` renders the live set and says what it wrote.
// It exists because the only way to know whether a card works is to open it,
// and docs/CARDS.md §7 asks you to do exactly that before shipping a design.
const { pathToFileURL } = await import('node:url');
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const { writeFileSync, mkdirSync, readFileSync } = await import('node:fs');
  const dir = process.argv[2] || 'public';
  const read = (f) => {
    try { return JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8')); } catch { return null; }
  };
  const news = read('news');
  const bundle = {
    state: read('state'),
    item: news && Array.isArray(news.items) ? news.items[0] : null,
    race: read('race'),
  };
  mkdirSync(`${dir}/cards`, { recursive: true });
  for (const a of cardAssets(bundle)) {
    writeFileSync(`${dir}/${a.path}`, a.body);
    process.stdout.write(`${dir}/${a.path}  ${(a.body.length / 1024).toFixed(0)} KB\n`);
  }
}
