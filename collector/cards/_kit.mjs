/**
 * collector/cards/_kit.mjs — the layout kit the five card designs are built on.
 *
 * WHY THIS EXISTS. collector/card.mjs emits SVG, and X does not render SVG in a
 * post, so every card this project has ever made has been invisible. The fix is
 * a raster path with no npm dependency in it.
 *
 * THE RASTERISER IS NOT OURS. site/cardpng.mjs owns pixels, glyphs and the PNG
 * container. This file owns LAYOUT: the grid, the roles, the audit, and the
 * op list a design fills in. A design never calls cardpng directly — it fills a
 * Surface, and render() replays that Surface onto a cardpng surface. That seam
 * is the reason the five designs survive cardpng changing its mind about
 * anything below the drawing API.
 *
 * WHAT THE SEAM BUYS, CONCRETELY. Every op is recorded before anything is
 * drawn, so auditCard() can test the finished layout — every line against the
 * gutter, the hero against its floor, every pair of lines against each other —
 * and the same op list can be replayed at 200px to check what a phone actually
 * shows. A drawing call that went straight to a canvas could not be asked any
 * of those questions.
 *
 * Zero dependencies. Node 20 built-ins only. No Math.random anywhere.
 */

import {
  surface as cpSurface,
  measureText,
  wrapText,
  canSet as cpCanSet,
  missingGlyphs,
  GROUND, GROUND_RAISED, INK, INK_DIM, INK_FAINT, HEAT, ACCENT,
  FONT_METRICS,
} from '../../site/cardpng.mjs';

export {
  GROUND, GROUND_RAISED, INK, INK_DIM, INK_FAINT, HEAT, ACCENT, measureText,
};

/* ------------------------------------------------------------------ palette */
/* The ground, the inks and the heat ramp come from site/cardpng.mjs above, so a
 * card cannot invent its own green. What is added here is the three ramps no
 * card-level module had yet, all copied from docs/BRAND.md rather than picked. */

/** Hairline rule. Visible on the ground, invisible next to text. */
export const RULE = '#1c2434';

/** docs/BRAND.md §4.3 — one hue per lab. */
export const LAB = Object.freeze({
  openai: '#10a37f',
  anthropic: '#d97757',
  'google-deepmind': '#5b9cff',
  xai: '#aab3bf',
  meta: '#3b82f6',
  deepseek: '#7a8cff',
  mistral: '#fa720f',
  qwen: '#8b86ff',
});

/** docs/BRAND.md §4.2 — the four source states. Never merged. */
export const STATE_HUE = Object.freeze({
  live: '#5fd08a', stale: '#ffb020', dark: '#ff6b6b', awaiting: '#56b0e0',
});

/** The five-step drought ramp, dry end hot. Category D0..D4 -> 0..4. */
export const DRY_RAMP = Object.freeze([
  '#f2cf7a', '#ffb020', '#ff8b3d', '#ff5f56', '#c2352c',
]);

/* ------------------------------------------------------------------- canvas */

/** site/cardpng.mjs FORMATS.portrait. 1080x1350 is 4:5 — the tallest aspect X
 *  shows in-feed without cropping a single image, which is the whole point of
 *  this round: vertical space is the lever. Taking cardpng's own format rather
 *  than a private one means a card and a cardpng card are the same object. */
export const CARD_W = 1080;
export const CARD_H = 1350;

/** Side gutter. Nothing but the ground is allowed outside it. */
export const MARGIN = 64;
export const COL = CARD_W - MARGIN * 2;   // 952

/** The thumbnail the audit renders against: roughly what X shows on a phone
 *  before the image is tapped. */
export const THUMB_W = 200;

/** Floors. fit() steps a line down until it fits and throws below these,
 *  exactly as collector/card.mjs's fitSize()/auditCard() pair does. */
export const MIN_FONT = 15;
export const MIN_HERO_FONT = 140;

/** Tracking, as a fraction of cap height. cardpng's own fit is 0.02; the two
 *  values above it are for the small capitalised labels, where a real typeface
 *  set in caps at 18px needs the air. */
export const TRACK = 0.02;
export const TRACK_LABEL = 0.10;

/** Stroke weights, as a fraction of cap height. cardpng throws above 0.135. */
export const W_TEXT = 0.085;
export const W_MED = 0.105;
export const W_HERO = 0.12;

/** How far below the baseline this font's descenders reach, as a fraction of
 *  cap height. From site/cardpng.mjs FONT_METRICS: (18 - 14) / 14. The type
 *  collision check in auditCard() is only as good as this number. */
export const DESCENDER = (FONT_METRICS.descender - FONT_METRICS.baseline) / FONT_METRICS.cap;

/** The characters that actually reach below the baseline in cardpng's face.
 *  Charging every line the full descender makes a row of digits claim 28% more
 *  height than it occupies, and the type-collision check then refuses layouts
 *  that are correct. A hero numeral is the case that matters: "73.5%" has no
 *  descender in it at all. */
const DESCENDS_FULL = /[gjpqy$Q(){}[\]@_]/;
const DESCENDS_PART = /[,;]/;

/**
 * How far below the baseline a specific string actually reaches, in pixels.
 *
 * Charging every line the full descender makes a row of digits claim 28% more
 * height than it occupies, and the type-collision check then refuses layouts
 * that are correct. The hero is the case that matters: "73.5%" reaches nothing
 * below the baseline and "1,877" reaches only a comma's tail.
 */
export function descentOf(text, size) {
  const t = String(text);
  if (DESCENDS_FULL.test(t)) return size * DESCENDER;
  if (DESCENDS_PART.test(t)) return size * 0.10;
  return size * 0.06;
}

/* ------------------------------------------------------------------ setting */

/**
 * Fold arbitrary text into cardpng's charset.
 *
 * It is deliberately narrow. cardpng's font carries mixed case and the real
 * punctuation a headline actually uses — curly quotes, both dashes, the ellipsis
 * — so almost nothing needs folding, and what does is mapped rather than
 * dropped. Anything still unsettable is replaced by a middot AND COUNTED, and
 * fold() reports the count so a caller can refuse the line. A headline is
 * somebody else's words; quietly deleting a character from it is a small lie on
 * a card whose entire job is being checkable.
 */
export function fold(input) {
  const map = {
    '„': '“', '‚': '‘', '‑': '-', '\u00a0': ' ', '\u2009': ' ', '\u202f': ' ',
    '\u200a': ' ', '\u2007': ' ', '\t': ' ', '′': '\'', '″': '"', '‟': '”',
  };
  let out = '';
  let lost = 0;
  for (const ch of String(input)) {
    const m = Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
    for (const c of m) {
      if (cpCanSet(c)) out += c;
      else { out += '·'; lost += 1; }
    }
  }
  return { text: out.replace(/\s+/g, ' ').trim(), lost };
}

export function canSet(text) { return cpCanSet(String(text)); }
export { missingGlyphs };

/** Width a line sets to, without setting it. */
export function textWidth(text, size, track = TRACK) {
  return measureText(String(text), { size, track });
}

/**
 * The largest size at or below `size` at which `text` fits `maxW`, stepping
 * down one whole pixel at a time — whole pixels so two builds of one string
 * land on the same size and the bytes match (CONTRACT.md §4). Throws below
 * `floor` rather than shipping a line that runs off the edge of somebody
 * else's timeline.
 */
export function fit(text, size, maxW, floor = MIN_FONT, track = TRACK) {
  let sz = Math.round(size);
  while (sz > floor && measureText(text, { size: sz, track }) > maxW) sz -= 1;
  if (measureText(text, { size: sz, track }) > maxW) {
    throw new Error(
      `cards: ${JSON.stringify(String(text).slice(0, 60))} does not fit ${Math.round(maxW)}px `
      + `at the ${floor}px floor (needs ${Math.round(measureText(text, { size: floor, track }))}px)`,
    );
  }
  return sz;
}

/** Wrap, shrinking the cap height until the block fits `maxLines`. */
export function wrapFit(text, size, maxW, maxLines, floor = MIN_FONT, track = TRACK) {
  for (let sz = Math.round(size); sz >= floor; sz -= 1) {
    const lines = wrapText(text, { size: sz, track, maxWidth: maxW });
    if (lines.length <= maxLines) return { size: sz, lines };
  }
  throw new Error(`cards: cannot wrap ${JSON.stringify(String(text).slice(0, 60))} into ${maxLines} lines at ${floor}px`);
}

export { wrapText };
/* ------------------------------------------------------------------ surface */

/**
 * A Surface collects abstract ops. It draws nothing. This is the seam between
 * a card design and a renderer, and the reason the five designs survive
 * site/cardpng.mjs arriving with an API of its own.
 */
export class Surface {
  constructor(w = CARD_W, h = CARD_H, ground = GROUND) {
    this.w = w; this.h = h; this.ground = ground;
    this.ops = [];
    this.notes = [];      // audit breadcrumbs: what this card claims it carries
  }

  push(op) { this.ops.push(op); return this; }

  /** Axis-aligned filled rectangle. r > 0 rounds the corners. */
  rect(x, y, w, h, fill, { r = 0, alpha = 1 } = {}) {
    return this.push({ op: 'rect', x, y, w, h, r, fill, alpha });
  }

  /** Stroked rectangle. `dash` is [on, off] in px, or null for solid. */
  frame(x, y, w, h, stroke, { r = 0, width = 2, alpha = 1, dash = null } = {}) {
    return this.push({ op: 'frame', x, y, w, h, r, stroke, width, alpha, dash });
  }

  disc(cx, cy, r, fill, { alpha = 1 } = {}) {
    return this.push({ op: 'disc', cx, cy, r, fill, alpha });
  }

  ring(cx, cy, r, stroke, { width = 2, alpha = 1 } = {}) {
    return this.push({ op: 'ring', cx, cy, r, stroke, width, alpha });
  }

  /** Round-capped polyline. */
  line(pts, stroke, { width = 2, alpha = 1 } = {}) {
    return this.push({ op: 'poly', pts, stroke, width, alpha });
  }

  /**
   * Set one line of text. `y` is the BASELINE, not the top.
   *
   * Alignment is resolved HERE, at record time, rather than at draw time, so
   * that auditCard() can measure the finished box. That is the whole reason
   * this wrapper exists rather than a direct call to cardpng's text().
   *
   * @param {'left'|'center'|'right'} align
   */
  text(text, x, y, size, fill, {
    align = 'left', alpha = 1, track = TRACK, weight = W_TEXT, role = null,
  } = {}) {
    const s = String(text);
    const bad = missingGlyphs(s);
    if (bad.length) {
      throw new Error(`cards: cardpng cannot set ${JSON.stringify(bad.join(''))} in ${JSON.stringify(s)} — fold() it first`);
    }
    const w = measureText(s, { size, track });
    // A round cap overhangs the glyph's nominal box by half the stroke. Ignore
    // it and every right-aligned line loses a sliver off the edge of the card —
    // which is invisible in the source and obvious in the render.
    const cap = (size * weight) / 2;
    const x0 = align === 'right' ? x - w - cap : align === 'center' ? x - w / 2 : x;
    return this.push({
      op: 'text', text: s, x: x0, y, size, fill, alpha, track, weight, width: w, cap, role,
    });
  }

  /** The DOOMCON detector mark, delegated to site/cardpng.mjs, which takes it
   *  from site/brandmarks.mjs — so a card cannot show a different instrument
   *  from the tab it was opened in. docs/BRAND.md §1. */
  mark(level, x, y, size, { ground = this.ground } = {}) {
    return this.push({ op: 'mark', level, x, y, size, ground });
  }

  /** Record what this card asserts it carries, for auditCard(). */
  note(key, value) { this.notes.push({ key, value }); return this; }
}

/* ------------------------------------------------- op -> primitive expansion */

/** Walk a polyline, emitting on/off runs. The limitation box is the only
 *  dashed thing on any card, and docs/BRAND.md §2.2 spends DASHED on exactly
 *  one meaning site-wide: *this is not there*. */
function dashPath(pts, on, off) {
  const segs = [];
  let cur = [];
  let carry = 0;
  let pen = true;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    let t = 0;
    while (t < len) {
      const want = (pen ? on : off) - carry;
      const step = Math.min(want, len - t);
      const p0 = [ax + ((bx - ax) * t) / len, ay + ((by - ay) * t) / len];
      const p1 = [ax + ((bx - ax) * (t + step)) / len, ay + ((by - ay) * (t + step)) / len];
      if (pen) { if (!cur.length) cur.push(p0); cur.push(p1); }
      t += step;
      carry += step;
      if (carry >= (pen ? on : off) - 1e-9) {
        if (pen && cur.length) { segs.push(cur); cur = []; }
        pen = !pen; carry = 0;
      }
    }
  }
  if (cur.length) segs.push(cur);
  return segs;
}

/** The rounded-rect outline, as a polyline, for the dashed frame. */
function rrectRing(x, y, w, h, r0) {
  const r = Math.min(r0 || 0, w / 2, h / 2);
  if (r <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  const arc = (cx, cy, a0, a1) => {
    const out = [];
    for (let i = 0; i <= 6; i += 1) {
      const a = ((a0 + ((a1 - a0) * i) / 6) * Math.PI) / 180;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  };
  const ring = [
    [x + r, y], [x + w - r, y], ...arc(x + w - r, y + r, -90, 0),
    [x + w, y + h - r], ...arc(x + w - r, y + h - r, 0, 90),
    [x + r, y + h], ...arc(x + r, y + h - r, 90, 180),
    [x, y + r], ...arc(x + r, y + r, 180, 270),
  ];
  ring.push(ring[0]);
  return ring;
}

/* --------------------------------------------------------------- the render */

/**
 * Replay a Surface onto site/cardpng.mjs and return the PNG.
 *
 * `scale` redraws the whole op list at a fraction of its nominal size, which is
 * how the 200px thumbnail audit is done: the same ops, rasterised small, so
 * what is inspected is what a phone shows rather than a downsampled guess. Cap
 * heights scale with everything else, which is exactly the question being
 * asked — is this still legible when it is a sixth of the size.
 *
 * @param {Surface} s
 * @param {{scale?:number}} [o]
 * @returns {Buffer} PNG
 */
export function render(s, { scale = 1 } = {}) {
  const k = scale;
  const sf = cpSurface(s.w * k, s.h * k, { background: s.ground });
  for (const o of s.ops) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (o.op === 'rect') {
      sf.rect({ x: o.x * k, y: o.y * k, w: o.w * k, h: o.h * k, r: (o.r || 0) * k, color: o.fill, alpha: a });
    } else if (o.op === 'disc') {
      sf.disc({ cx: o.cx * k, cy: o.cy * k, r: o.r * k, color: o.fill, alpha: a });
    } else if (o.op === 'ring') {
      sf.circle({ cx: o.cx * k, cy: o.cy * k, r: o.r * k, color: o.stroke, width: o.width * k, alpha: a });
    } else if (o.op === 'poly') {
      sf.polyline({ points: o.pts.map(([x, y]) => [x * k, y * k]), color: o.stroke, width: o.width * k, alpha: a });
    } else if (o.op === 'frame') {
      const ring = rrectRing(o.x * k, o.y * k, o.w * k, o.h * k, (o.r || 0) * k);
      if (o.dash) {
        for (const seg of dashPath(ring, o.dash[0] * k, o.dash[1] * k)) {
          sf.polyline({ points: seg, color: o.stroke, width: o.width * k, alpha: a });
        }
      } else {
        sf.polyline({ points: ring, color: o.stroke, width: o.width * k, alpha: a });
      }
    } else if (o.op === 'mark') {
      sf.mark(o.level, { x: o.x * k, y: o.y * k, size: o.size * k, ground: o.ground });
    } else if (o.op === 'text') {
      // x is already the resolved LEFT edge; alignment happened at record time
      // so that auditCard() could measure the finished box.
      sf.text(o.text, {
        x: o.x * k, y: o.y * k, size: o.size * k, color: o.fill,
        weight: o.weight, track: o.track, alpha: a, align: 'left',
      });
    } else {
      throw new Error(`cards: unknown op ${o.op}`);
    }
  }
  return sf.png();
}

/* ----------------------------------------------------------------- the audit */

/**
 * The rules from the brief, checked rather than asserted.
 *
 * A card that fails any of these is a defect nobody sees until it is on
 * somebody else's timeline, which is exactly the failure collector/card.mjs's
 * auditCard() exists to prevent. This throws.
 */
export function auditCard(surface) {
  const errs = [];
  const texts = surface.ops.filter((o) => o.op === 'text');

  // 1. Nothing outside the gutter.
  for (const t of texts) {
    // The gutter is measured against the glyph box. A round cap overhangs it by
    // half a stroke, which is optically correct — the stroke is centred on the
    // path — and is allowed, up to half the gutter, on both sides. What is not
    // allowed is ink leaving the card, which the second pair of checks catches.
    const cap = t.cap || 0;
    if (t.x < MARGIN - 1) errs.push(`text "${t.text}" starts at x=${Math.round(t.x)}, inside the ${MARGIN}px gutter`);
    if (t.x + t.width + cap > surface.w - MARGIN + 1) {
      errs.push(`text "${t.text}" ends at x=${Math.round(t.x + t.width + cap)}, past ${surface.w - MARGIN}`);
    }
    if (cap > MARGIN / 2) errs.push(`text "${t.text}" has a ${Math.round(cap)}px cap overhang, over half the ${MARGIN}px gutter`);
    if (t.x - cap < 0 || t.x + t.width + cap > surface.w) errs.push(`text "${t.text}" leaves the card horizontally`);
    if (t.y + descentOf(t.text, t.size) > surface.h - 2 || t.y - t.size < -2) errs.push(`text "${t.text}" is off the card vertically`);
  }

  // 2. The hero exists and is enormous. "The number is the hero" is the brief's
  //    single hardest requirement and it is the one most easily lost in an edit.
  const hero = texts.find((t) => t.role === 'hero');
  if (!hero) errs.push('no op carries role:"hero" — the number must be the hero');
  else if (hero.size < MIN_HERO_FONT) errs.push(`hero is ${hero.size}px, below the ${MIN_HERO_FONT}px floor`);

  // 3. The domain is burned in, because the card travels without the post text.
  if (!texts.some((t) => t.role === 'domain')) errs.push('no op carries role:"domain"');

  // 4. An exact UTC stamp, because a figure with no clock claims to be current
  //    for ever. docs/VOICE.md §2 habit 3.
  const stamp = texts.find((t) => t.role === 'stamp');
  if (!stamp) errs.push('no op carries role:"stamp"');
  else if (!/\d\d:\d\d UTC/.test(stamp.text)) errs.push(`stamp "${stamp.text}" is not an exact UTC clock`);

  // 5. The limitation is on the face of the card.
  if (!texts.some((t) => t.role === 'limit')) errs.push('no op carries role:"limit"');

  // 6. Thumbnail legibility. Everything that must survive 200px is marked
  //    role:"hero" or "thumb"; at THUMB_W/CARD_W it has to stay above 9px cap
  //    height, which is where this stencil stops being countable.
  const k = THUMB_W / surface.w;
  for (const t of texts) {
    if ((t.role === 'hero' || t.role === 'thumb') && t.size * k < 9) {
      errs.push(`"${t.text}" is ${(t.size * k).toFixed(1)}px at ${THUMB_W}px wide — below the 9px thumbnail floor`);
    }
  }

  // 7. NO TWO LINES OF TYPE MAY TOUCH.
  //    This is the check that earns the audit its keep. Every collision found
  //    while building these five — a hero's cap clipping the eyebrow above it,
  //    a limitation box landing on the source ledger — was invisible in the
  //    source and obvious the moment it was rendered. The box is the glyph box
  //    plus the round-cap overhang plus the alphabet's 1.3-unit descender.
  const boxes = texts.map((t) => {
    const c = t.cap || 0;
    return {
      t,
      x0: t.x - c, x1: t.x + t.width + c,
      y0: t.y - t.size - c,
      y1: t.y + descentOf(t.text, t.size) + c,
    };
  });
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]; const b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 2 && oy > 2) {
        errs.push(`"${a.t.text.slice(0, 28)}" and "${b.t.text.slice(0, 28)}" overlap by `
          + `${Math.round(ox)}x${Math.round(oy)}px`);
      }
    }
  }

  if (errs.length) throw new Error(`cards: audit failed\n  - ${errs.join('\n  - ')}`);
  return true;
}

/* ------------------------------------------------------------ small helpers */

export function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "12:26 UTC 25 SEP 2026". Exact, always UTC, never relative. */
export function utcStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`cards: unparseable timestamp ${JSON.stringify(iso)}`);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Percent to one place, with the sign only where a sign is the information. */
/** A probability as a percentage, at the precision the figure actually has.
 *  Printing Mistral's 0.0015 as "0.2%" is a rounding that reads as a
 *  measurement; below one point the second place is the information. */
export function pctSmart(p) {
  const v = p * 100;
  if (v < 1) return `${(Math.round(v * 100) / 100).toFixed(2)}%`;
  return `${(Math.round(v * 10) / 10).toFixed(1)}%`;
}

export function pct(x, places = 1) {
  return `${(Math.round(x * 10 ** places) / 10 ** places).toFixed(places)}%`;
}
