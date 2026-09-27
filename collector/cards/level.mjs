/**
 * CARD 3 — THE INDEX CARD.  collector/cards/level.mjs
 *
 * The daily-state card. It fires every day regardless of level, which means it
 * has to be good on a boring day, and a boring day is most days. That is the
 * whole design brief: docs/VOICE.md §6 example 3 makes the argument — an index
 * that only speaks when it is alarmed reads as a hype account, and posting the
 * calm days is where the credibility comes from.
 *
 * IT SAYS WHAT THE PAGE SAYS. The homepage now opens with one sentence — "AI
 * activity is at DOOMCON 4 — ROUTINE, on a scale where 1 is loudest." — and a
 * dial whose ends read CALM and SEVERE. This card is that page, seen first and
 * most often, so it leads with the same sentence and carries the same two
 * words, and it is laid out to match site/cardpng.mjs's portrait state card,
 * which is the one X serves. A reader who sees either one sees one design.
 *
 * Four moves make a calm reading look like an instrument working:
 *
 *   1. The sentence leads, at 44px, with the reading in the level's heat.
 *   2. The numeral is still the hero at 190px, beside the ladder that gives it
 *      its direction. A 4 is as large as a 1.
 *   3. The ladder is proportional to the scale, lit from the calm end, with the
 *      live band raised and a caret under it where the composite sits.
 *   4. The source ledger is printed on the face. "5 of 14 scored, 9 awaiting a
 *      frozen baseline, 0 dark" is the most persuasive line on the card,
 *      because nobody volunteers that number unless the other five are real.
 *
 * READS: data/state.json only.
 * POSTS: daily, at the fixed slate time, at any level, in any condition short
 *        of post_suppressed.
 */

import {
  CARD_W, MARGIN, COL, GROUND_RAISED, RULE, INK, INK_DIM,
  HEAT, STATE_HUE, Surface, fit, fmt1, fold, textWidth, W_HERO, W_MED,
} from './_kit.mjs';
import { chassis, limitBox, eyebrow, ladder, sentence, BODY_TOP } from './_chassis.mjs';

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

  /* ---- the sentence --------------------------------------------------- */
  const sent = sentence(s, state, { top: BODY_TOP + 30, from: 44, to: 26, maxLines: 3 });
  const bodyTop = sent.last + Math.round(sent.size * 0.9);

  /* ---- the hero ------------------------------------------------------- */
  // 190px. At the 200px thumbnail that is a 35px numeral, which is the point:
  // the level is readable before the card is even tapped — and the ladder
  // beside it is what makes the numeral a level rather than a number.
  const NUM = 190;
  s.text(String(level), MARGIN, bodyTop + NUM + 4, NUM, heat, { track: 0, weight: W_HERO, role: 'hero' });
  const numW = textWidth(String(level), NUM, 0);

  /* ---- the ladder ----------------------------------------------------- */
  const lx = MARGIN + numW + 26;
  const lw = COL - numW - 26;
  const raise = 44;
  const lad = ladder(s, {
    x: lx, y: bodyTop + raise + 8, w: lw, h: 42, level, score: state.score,
    raise, size: 17, wordSize: 17,
  });

  /* ---- the composite -------------------------------------------------- */
  const comp = `${fmt1(state.score)} of 100`;
  const compBase = lad.bottom + 52 + 34;
  eyebrow(s, 'Composite', lx, compBase - 52 - 18, { size: 15 });
  s.text(comp, lx, compBase, fit(comp, 52, lw), INK, { track: 0.01, weight: W_MED, role: 'thumb' });

  const d = state.delta_from_previous;
  const dtxt = d == null ? `First scored reading · band ${BANDS[level]}`
    : Math.abs(d) < 0.05 ? `Unchanged from the previous reading · band ${BANDS[level]}`
      : `${d < 0 ? 'Down' : 'Up'} ${fmt1(Math.abs(d))} from the previous reading · band ${BANDS[level]}`;
  const deltaBase = compBase + 34;
  s.text(dtxt, lx, deltaBase, fit(dtxt, 20, lw), INK_DIM, { track: 0.01 });

  /* ---- the pillars ---------------------------------------------------- */
  const pillars = state.pillars || [];
  const pillarEyebrow = Math.max(deltaBase, bodyTop + NUM + 4) + 60;
  eyebrow(s, 'The five pillars', MARGIN, pillarEyebrow);

  const rowH = 42;
  const rowTop = pillarEyebrow + 16;
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
    } else if (p.dark) {
      // No bar at all. A bar at zero for a source we could not read is
      // imputation drawn as a picture, which is the one edit docs/VOICE.md §4
      // forbids outright. DASHED, which on this site means "this is not there".
      for (let k = 0; k < 8; k += 1) {
        s.rect(barX + 12 + k * 20, y + 16, 11, 4, STATE_HUE.dark, { r: 2, alpha: 0.7 });
      }
      s.text('Dark', CARD_W - MARGIN, y + 25, 21, STATE_HUE.dark, { align: 'right', track: 0.01 });
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
  const ledger = `${scored} of ${srcs.length} sources scored · ${awaiting} awaiting a frozen baseline · ${dark} dark`;
  const ledgerRule = rowTop + pillars.length * rowH + 16;
  s.rect(MARGIN, ledgerRule, COL, 2, RULE);
  s.text(ledger, MARGIN, ledgerRule + 34, fit(ledger, 24, COL), INK_DIM, { track: 0.01 });

  /* ---- the limitation -------------------------------------------------- */
  limitBox(s,
    'Observed activity tempo against this index’s own frozen reference distribution. '
    + 'Not a probability of harm. Not a prediction.');

  return s;
}

export default { id: 'level', build, shouldPost };
