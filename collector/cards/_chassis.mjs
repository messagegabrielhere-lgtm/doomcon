/**
 * collector/cards/_chassis.mjs — the frame every card shares.
 *
 * Five cards, one chassis. A reader who has seen one should recognise the next
 * one in a scroll before they have read a word of it, which is the only reason
 * a set of cards is worth more than five separate pictures.
 *
 * The chassis owns the four things the brief makes non-negotiable and that no
 * individual design is allowed to forget:
 *
 *   1. the detector mark and the wordmark, top left
 *   2. the card's kind, top right, so the reader knows which instrument spoke
 *   3. the limitation, in a dashed box, ON THE FACE — the card travels without
 *      the page, and a card whose caveat lives on the page has no caveat
 *   4. the domain and an exact UTC clock, burned in, bottom
 *
 * THE TYPOGRAPHIC RULE, stated once. Capitals, tracked, for labels — an
 * instrument's silkscreen. Sentence case for anything that is a sentence,
 * because site/cardpng.mjs carries a real mixed-case face and setting a
 * headline in capitals throws away the word shapes a reader uses to skim.
 * A name is set the way its owner sets it: Anthropic, not ANTHROPIC.
 */

import * as brand from '../../site/brand.mjs';
import {
  CARD_W, CARD_H, MARGIN, COL, GROUND_RAISED, RULE, INK, INK_DIM, INK_FAINT,
  HEAT, TRACK_LABEL, W_MED, fit, utcStamp, fold, wrapFit, GROUND, measureText,
} from './_kit.mjs';

/* --------------------------------------------------------------- the domain */

/**
 * What gets burned into the card.
 *
 * docs/BRAND.md §1.6 flags this as an open item and it is the same one here:
 * `brand.DOMAIN` is doomcon.watch, which docs/COMPETITIVE.md §1.4 measured as
 * NOT RESOLVING. An image is the surface most likely to be looked at long after
 * it was made, by somebody with no other way back to us. Burning an address
 * that answers nothing is the one failure a share card cannot survive, so the
 * default here is the address that actually serves the site today, derived from
 * `brand.CANONICAL_URL` rather than typed.
 *
 * It is a parameter. The day doomcon.watch resolves this becomes
 * `cardDomain({ domain: brand.DOMAIN })` at the call site, or the default below
 * changes, and every card follows. One line, exactly as CONTRACT.md §Brand asks.
 */
export function cardDomain({ domain = null } = {}) {
  if (domain) return domain.toLowerCase();
  const u = new URL(brand.CANONICAL_URL);
  return `${u.host}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
}

/* ---------------------------------------------------------------- the rails */

export const RAIL_BOTTOM = 152;          // the hairline under the masthead
export const BODY_TOP = 192;
export const FOOT_RULE = CARD_H - 140;   // 1210, the hairline over the footer
export const LIMIT_BOTTOM = FOOT_RULE - 34;

/**
 * Masthead and footer. Called first by every card, so the body can measure
 * itself against BODY_TOP and FOOT_RULE and nothing has to agree by accident.
 *
 * @param {object} o
 * @param {number} o.level      DOOMCON level, for the mark's lamp and grille
 * @param {string} o.kind       the card's own name, top right
 * @param {string} o.observedAt ISO. Printed exactly, in UTC. Never relative.
 */
export function chassis(s, { level, kind, observedAt, domain = null }) {
  // --- masthead -----------------------------------------------------------
  s.mark(level, MARGIN, 48, 64, { ground: GROUND });
  s.text('DOOMCON', MARGIN + 84, 100, 36, INK, { track: 0.08, weight: W_MED });

  const k = fold(kind).text.toUpperCase();
  s.text(k, CARD_W - MARGIN, 84, fit(k, 22, 400, 15, TRACK_LABEL), INK_DIM,
    { align: 'right', track: TRACK_LABEL });
  s.text('AI EARLY WARNING SYSTEM', CARD_W - MARGIN, 112, 14, INK_FAINT,
    { align: 'right', track: TRACK_LABEL });

  s.rect(MARGIN, RAIL_BOTTOM, COL, 2, RULE);

  // --- footer -------------------------------------------------------------
  s.rect(MARGIN, FOOT_RULE, COL, 2, RULE);

  // The domain gets a line of its own. It is the only route back to the
  // arithmetic once the post text is cropped, so it is not allowed to share a
  // line with anything that might grow into it.
  const dom = cardDomain({ domain });
  s.text(dom, MARGIN, FOOT_RULE + 54, fit(dom, 30, COL * 0.88), INK,
    { track: 0.02, weight: W_MED, role: 'domain' });

  // The clock is exact, always UTC, never relative. docs/VOICE.md §2 habit 3
  // applies hardest on an image, because an image is cached by every platform
  // that touches it and is looked at long after it was made.
  const stamp = `Observed ${utcStamp(observedAt)}`;
  const stampSize = fit(stamp, 19, COL * 0.52);
  s.text(stamp, CARD_W - MARGIN, FOOT_RULE + 96, stampSize, INK_DIM,
    { align: 'right', track: 0.02, role: 'stamp' });

  // The creed takes whatever the clock leaves, and shrinks rather than
  // colliding with it. The clock is load-bearing; the creed is not.
  const left = COL - measureText(stamp, { size: stampSize, track: 0.02 }) - 40;
  s.text('Nobody knows the odds. We keep count.', MARGIN, FOOT_RULE + 96,
    fit('Nobody knows the odds. We keep count.', 19, left, 12), INK_FAINT, { track: 0.02 });

  return s;
}

/* ------------------------------------------------------------ the limitation */

/**
 * The dashed box that says what this card does not measure.
 *
 * DASHED, not solid, and that is not decoration: docs/BRAND.md §2.2 spends
 * dashed on exactly one meaning site-wide — *this is not there* — and this box
 * is a statement about what is not in the data. Merging the two dash patterns
 * is the one edit docs/VOICE.md §4 forbids outright, so the box uses the
 * DASHED pattern and nothing else on a card is allowed to.
 *
 * Returns the y of its top, so a card can lay its body out against it.
 */
export function limitBox(s, text, { bottom = LIMIT_BOTTOM, width = COL, x = MARGIN } = {}) {
  const pad = 24;
  // TWO LINES IS THE TARGET. The box sits directly under the body and a third
  // line eats the card's last 40px, which is how a limitation quietly starts
  // overprinting the figure above it. Shrink to fit two; take a third only
  // when even 16px will not do it.
  const inner = width - pad * 2 - 40;
  const folded = fold(text).text;
  let size; let lines;
  try { ({ size, lines } = wrapFit(folded, 23, inner, 2, 16)); } catch {
    ({ size, lines } = wrapFit(folded, 20, inner, 3, 14));
  }
  const lead = Math.round(size * 1.52);
  const h = pad * 2 + lead * lines.length;
  const top = bottom - h;

  s.rect(x, top, width, h, GROUND_RAISED, { r: 8 });
  s.frame(x + 1, top + 1, width - 2, h - 2, INK_FAINT, { r: 8, width: 2, alpha: 0.5, dash: [9, 6.4] });

  // A bar in the "dark source" hue, because this box is always a statement
  // about an absence. Never the only carrier: the words say it too.
  s.rect(x, top + 9, 5, h - 18, '#ff6b6b', { r: 2.5, alpha: 0.85 });

  lines.forEach((ln, i) => {
    s.text(ln, x + pad + 18, top + pad + lead * (i + 1) - Math.round(size * 0.40), size, INK_DIM,
      { track: 0.01, role: i === 0 ? 'limit' : null });
  });
  return top;
}

/* ------------------------------------------------------------------ fittings */

/** A small tracked capital label. Used everywhere; kept here so it is one thing. */
export function eyebrow(s, text, x, y, { color = INK_FAINT, size = 17, align = 'left', max = COL } = {}) {
  const t = fold(text).text.toUpperCase();
  s.text(t, x, y, fit(t, size, max, 12, TRACK_LABEL + 0.04), color,
    { align, track: TRACK_LABEL + 0.04 });
}

/** The five-stop level rail. The live stop is lit; the rest are drawn at 55%
 *  weight and 30% alpha, exactly as the favicon's grille is, so the reading is
 *  a COUNT and a WEIGHT before it is ever a hue. docs/BRAND.md §1.2. */
export function levelRail(s, level, { x, y, w, h = 26, previous = null }) {
  const gap = 11;
  const each = (w - gap * 4) / 5;
  const order = [5, 4, 3, 2, 1];
  order.forEach((lv, i) => {
    const lx = x + i * (each + gap);
    const on = lv >= level;                       // litSlots: calm end up to live
    s.rect(lx, y, each, h, on ? HEAT[lv] : INK_DIM, { r: 4, alpha: on ? 1 : 0.30 });
    if (!on) s.rect(lx, y + h * 0.225, each, h * 0.55, GROUND, { r: 3, alpha: 0.55 });
    s.text(String(lv), lx + each / 2, y + h + 30, 22, lv === level ? INK : INK_FAINT,
      { align: 'center', track: 0 });
    if (lv === level) {
      // The live stop, marked by shape as well as by heat: a bar under it.
      s.rect(lx, y + h + 40, each, 5, HEAT[lv], { r: 2.5 });
    }
    if (previous != null && lv === previous && previous !== level) {
      s.ring(lx + each / 2, y + h + 58, 6, INK_FAINT, { width: 2.6 });
    }
  });
}
