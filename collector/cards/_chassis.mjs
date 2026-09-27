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
  TRACK_LABEL, W_MED, fit, utcStamp, fold, wrapFit, GROUND, measureText,
  ladderShapes, fitRuns, levelSentence, levelSentenceText,
} from './_kit.mjs';

/* --------------------------------------------------------------- the domain */

/**
 * What gets burned into the card.
 *
 * `brand.DOMAIN` is the address we print, and since 2026-09-26 it is the
 * address that actually serves the site — the GitHub Pages project URL —
 * because doomcon.watch, the domain we intend to own, does not resolve
 * (docs/COMPETITIVE.md §1.4: no A record, HTTP 000). An image is the surface
 * most likely to be looked at long after it was made, by somebody with no
 * other way back to us, so an address that answers nothing is the one failure
 * a share card cannot survive.
 *
 * Read from brand.DOMAIN first, so the day doomcon.watch is registered the
 * two-line change in site/brand.mjs reaches every card with no edit here. The
 * derivation from CANONICAL_URL stays as the fallback for a brand module with
 * an empty DOMAIN, and selftest.mjs checks the printed string against
 * brand.DOMAIN on every design.
 */
export function cardDomain({ domain = null } = {}) {
  if (domain) return domain.toLowerCase();
  if (typeof brand.DOMAIN === 'string' && brand.DOMAIN.trim()) return brand.DOMAIN.trim().toLowerCase();
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
  // The sentinel wire at 76px: on a phone X shows this 1080px card at about
  // 500px, so the mark is ~35px there and DOOMCON 4's apex still stands 10px
  // above the wire. At the 64px it was, the spike was a smudge at that size.
  const MARK = 76;
  s.mark(level, MARGIN, 40, MARK, { ground: GROUND });
  s.text('DOOMCON', MARGIN + MARK + 20, 100, 36, INK, { track: 0.08, weight: W_MED });

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

/* -------------------------------------------------------------- the reading */

/**
 * THE SENTENCE. The homepage's <h1>, word for word, in the level's heat where
 * the reading is and in ink where it is not: "AI activity is at DOOMCON 4 —
 * ROUTINE, on a scale where 1 is loudest." The geometry comes from
 * site/cardpng.mjs's fitRuns(), so this card and the PNG state card wrap the
 * same words at the same places. Records the plain sentence as a note, for
 * selftest.mjs.
 *
 * @param {number} o.top  the cap top of the first line
 * @returns {{ size:number, last:number }} the cap height and the last baseline
 */
export function sentence(s, state, {
  x = MARGIN, top, from = 44, to = 26, maxWidth = COL, maxLines = 3, leading = 1.42, weight = 0.092,
} = {}) {
  const fit = fitRuns(levelSentence(state), { from, to, track: 0.01, maxWidth, maxLines });
  const step = Math.round(fit.size * leading);
  const y = top + fit.size;
  fit.lines.forEach((line, i) => {
    for (const r of line.runs) {
      s.text(r.text, x + r.x, y + i * step, fit.size, r.color, { track: 0.01, weight });
    }
  });
  s.note('sentence', levelSentenceText(state));
  return { size: fit.size, last: y + (fit.lines.length - 1) * step };
}

/**
 * THE LADDER. The page's dial, unrolled: five bands at widths proportional to
 * the score range each covers, lit from the calm end up to the live one, the
 * live one raised in its heat with its numeral in dark ink, a caret under it
 * where the composite sits, and CALM / SEVERE at the two ends so nobody reads
 * "4" as four-fifths of the way to bad. Shared with site/cardpng.mjs's cards
 * through ladderShapes(); this only replays the ops onto the audited Surface.
 *
 * It replaces the equal-width five-stop rail, which lit the right stops but
 * never said which end was which — the exact misread the page fixed.
 */
export function ladder(s, opts) {
  const got = ladderShapes(opts);
  for (const p of got.ops) {
    if (p.kind === 'rect') s.rect(p.x, p.y, p.w, p.h, p.color, { r: p.r, alpha: p.alpha });
    else if (p.kind === 'disc') s.disc(p.cx, p.cy, p.r, p.color, { alpha: p.alpha });
    else if (p.kind === 'text') {
      s.text(p.text, p.x, p.y, p.size, p.color, { align: p.align, track: p.track, weight: p.weight });
    } else throw new Error(`cards: ladder op ${JSON.stringify(p.kind)} has no drawer`);
  }
  return got;
}
