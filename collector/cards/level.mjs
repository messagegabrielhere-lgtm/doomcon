/**
 * CARD 3 — THE INDEX CARD.  collector/cards/level.mjs
 *
 * The daily-state card. It fires every day regardless of level, which means it
 * has to be good on a boring day, and a boring day is most days. That is the
 * whole design brief: docs/VOICE.md §6 example 3 makes the argument — an index
 * that only speaks when it is alarmed reads as a hype account, and posting the
 * calm days is where the credibility comes from.
 *
 * So the card is built to make a calm reading look like an instrument working
 * rather than like nothing happening. Three moves do that:
 *
 *   1. The numeral is the hero at 360px whatever it says. A 4 is as large as a 1.
 *   2. The rail shows all five stops with the live one lit BY COUNT AND WEIGHT,
 *      so the eye gets "two of five lit, at the calm end" before it gets a hue.
 *   3. The source ledger is printed on the face. "5 of 14 scored, 9 awaiting a
 *      frozen baseline, 0 dark" is the most persuasive line on the card,
 *      because nobody volunteers that number unless the other five are real.
 *
 * READS: data/state.json only.
 * POSTS: daily, at the fixed slate time, at any level, in any condition short
 *        of post_suppressed.
 */

import {
  CARD_W, MARGIN, COL, GROUND_RAISED, RULE, INK, INK_DIM, INK_FAINT,
  HEAT, STATE_HUE, Surface, fit, fmt1, fold, W_HERO, W_MED,
} from './_kit.mjs';
import { chassis, limitBox, eyebrow, levelRail, BODY_TOP } from './_chassis.mjs';

const LEVEL_NAMES = { 5: 'DORMANT', 4: 'ROUTINE', 3: 'ELEVATED', 2: 'ACCELERATED', 1: 'UNPRECEDENTED' };
const BANDS = { 5: '0-34', 4: '35-54', 3: '55-69', 2: '70-84', 1: '85-100' };

/** The gate. Every design takes the same bag and answers the same question, so
 *  a scheduler never has to know which file reads which JSON. */
export function shouldPost({ state } = {}) {
  if (!state || state.level == null) return { ok: false, why: 'no level in data/state.json' };
  if (state.post_suppressed) return { ok: false, why: 'post_suppressed: two or more pillars are dark' };
  if (state.score == null) return { ok: false, why: 'no composite: every pillar is dark or uncalibrated' };
  return { ok: true };
}

export function build(data, opts = {}) {
  const { state } = data;
  const gate = shouldPost(data);
  if (!gate.ok) throw new Error(`level card: ${gate.why}`);

  const s = new Surface();
  const level = state.level;
  const heat = HEAT[level];

  chassis(s, {
    level,
    kind: 'DAILY STATE',
    observedAt: state.generated_at,
    domain: opts.domain ?? null,
  });

  /* ---- the hero ------------------------------------------------------- */
  eyebrow(s, 'Current level', MARGIN, BODY_TOP + 24);

  // 260px. At the 200px thumbnail that is a 48px numeral, which is the point:
  // the level is readable before the card is even tapped.
  s.text(String(level), MARGIN, BODY_TOP + 280, 220, heat, { track: 0, weight: W_HERO, role: 'hero' });

  const gx = MARGIN + 270;
  const gw = COL - 270;
  const name = LEVEL_NAMES[level];
  s.text(name, gx, BODY_TOP + 120, fit(name, 74, gw), INK, { track: 0.02, weight: W_MED, role: 'thumb' });
  s.text('of five. Five is the calmest.', gx, BODY_TOP + 172, 21, INK_FAINT, { track: 0.01 });

  s.rect(gx, BODY_TOP + 196, gw, 2, RULE);

  const comp = `${fmt1(state.score)} of 100`;
  s.text(comp, gx, BODY_TOP + 258, fit(comp, 62, gw), INK, { track: 0.01, weight: W_MED, role: 'thumb' });
  eyebrow(s, 'Composite', gx, BODY_TOP + 304);

  const d = state.delta_from_previous;
  const dtxt = d == null ? `First scored reading \u00b7 band ${BANDS[level]}`
    : Math.abs(d) < 0.05 ? `Unchanged from the previous reading \u00b7 band ${BANDS[level]}`
      : `${d < 0 ? 'Down' : 'Up'} ${fmt1(Math.abs(d))} from the previous reading \u00b7 band ${BANDS[level]}`;
  s.text(dtxt, gx, BODY_TOP + 336, fit(dtxt, 21, gw), INK_DIM, { track: 0.01 });

  /* ---- the rail ------------------------------------------------------- */
  eyebrow(s, 'The five stops, lit from the calm end', MARGIN, 576);
  levelRail(s, level, { x: MARGIN, y: 592, w: COL, h: 28, previous: state.previous_level });

  /* ---- the pillars ---------------------------------------------------- */
  const pillars = state.pillars || [];
  eyebrow(s, 'The five pillars', MARGIN, 706);

  const rowH = 46;
  const rowTop = 722;
  const barX = MARGIN + 320;
  const barW = COL - 320 - 190;
  pillars.forEach((p, i) => {
    const y = rowTop + i * rowH;
    const nm = fold(p.name || p.id).text;
    const live = p.score != null && !p.uncalibrated && !p.dark;
    s.text(nm, MARGIN, y + 24, fit(nm, 25, 300), live ? INK : INK_DIM, { track: 0.01 });

    s.rect(barX, y + 10, barW, 16, GROUND_RAISED, { r: 8 });

    if (live) {
      const w = Math.max(6, (Math.min(100, Math.max(0, p.score)) / 100) * barW);
      s.rect(barX, y + 10, w, 16, heat, { r: 8, alpha: 0.92 });
      // A notch at the value, so the bar's end is a POSITION and not only a length.
      s.rect(barX + w - 2, y + 4, 4, 28, INK, { r: 2 });
      s.text(fmt1(p.score), CARD_W - MARGIN, y + 25, 26, INK, { align: 'right', track: 0.01 });
    } else {
      // Never merged with dark. docs/VOICE.md §4: "awaiting baseline" means the
      // source answered fine and there is no frozen history to score it against.
      // DOTTED, which on this site means exactly "this is there and we cannot
      // score it yet" — a different mark from the DASHED "this is not there".
      for (let k = 0; k < 12; k += 1) {
        s.disc(barX + 12 + k * 13, y + 18, 2.6, STATE_HUE.awaiting, { alpha: 0.85 });
      }
      const wait = 'Awaiting a frozen baseline';
      s.text(wait, CARD_W - MARGIN, y + 25, fit(wait, 21, barW + 190 - 180), STATE_HUE.awaiting,
        { align: 'right', track: 0.01 });
    }
  });

  /* ---- the source ledger ---------------------------------------------- */
  // The most persuasive line on the card. Nobody volunteers this number unless
  // the scored sources are real. docs/VOICE.md §6 example 3.
  const srcs = state.sources || [];
  const scored = srcs.filter((x) => x.ok).length;
  const awaiting = srcs.filter((x) => !x.ok && x.uncalibrated).length;
  const dark = srcs.filter((x) => !x.ok && !x.uncalibrated).length;
  const ledger = `${scored} of ${srcs.length} sources scored \u00b7 ${awaiting} awaiting a frozen baseline \u00b7 ${dark} dark`;
  s.rect(MARGIN, 972, COL, 2, RULE);
  s.text(ledger, MARGIN, 1006, fit(ledger, 24, COL), INK_DIM, { track: 0.01 });

  /* ---- the limitation -------------------------------------------------- */
  limitBox(s,
    'Observed activity tempo against this index’s own frozen reference distribution. '
    + 'Not a probability of harm. Not a prediction.');

  return s;
}

export default { id: 'level', build, shouldPost };
