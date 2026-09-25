/**
 * CARD 2 — THE RACE CARD.  collector/cards/race.mjs
 *
 * Named people and a scoreboard. This is the one people argue with, and on X's
 * open ranker a reply and a quote are weighted far above a like, so a card that
 * is WRONG-IN-SOMEBODY'S-OPINION outperforms a card that is merely interesting.
 * A league table with eight famous names on it is the cheapest legitimate way
 * to buy that, and it costs no honesty at all, because every figure on it is
 * somebody else's money at risk rather than our opinion.
 *
 * The line this card does not cross is the one docs/BRAND.md §3.1 draws. These
 * are market prices on one Polymarket question. They are not DOOMCON's ranking,
 * they are not a DOOMCON forecast, and none of it feeds the index. That is said
 * three times on the face of the card — in the kind label, in the standfirst,
 * and in the limitation box — because this is the card most likely to be
 * screenshotted out of context and attributed to us.
 *
 * READS: data/race.json  (rank_basis, markets.polymarket.horizon, players[])
 * POSTS: when the top leg moves by MOVE_POINTS or more in 7 days, and on a
 *        fixed weekly slot otherwise, so the table is a habit rather than an
 *        alarm.
 */

import {
  CARD_W, MARGIN, COL, GROUND_RAISED, RULE, INK, INK_DIM, INK_FAINT,
  LAB, Surface, fit, fmt1, fold, fmtInt, pctSmart, W_HERO, W_MED,
} from './_kit.mjs';
import { chassis, limitBox, eyebrow, BODY_TOP } from './_chassis.mjs';

/** A 7-day move at or above this, in probability points, makes the card news. */
export const MOVE_POINTS = 4;

export function shouldPost({ race, state } = {}) {
  if (!race) return { ok: false, why: 'no data/race.json' };
  const rb = race.rank_basis;
  if (!rb || !rb.ok) return { ok: false, why: `rank basis is not live: ${rb ? rb.error : 'missing'}` };
  const players = (race.players || []).filter((p) => p.market && p.market.state === 'live'
    && typeof p.market.probability === 'number');
  if (players.length < 3) return { ok: false, why: `only ${players.length} legs are live; a table needs 3` };
  if (!state || state.level == null) return { ok: false, why: 'no level in data/state.json for the masthead' };
  return { ok: true };
}

export function build(data, opts = {}) {
  const gate = shouldPost(data);
  if (!gate.ok) throw new Error(`race card: ${gate.why}`);
  const { race, state } = data;

  const ev = race.rank_basis.event;
  const players = (race.players || [])
    .filter((p) => p.market && p.market.state === 'live' && typeof p.market.probability === 'number')
    .sort((a, b) => b.market.probability - a.market.probability);
  const lead = players[0];
  const maxP = lead.market.probability;

  const s = new Surface();
  chassis(s, {
    level: state.level,
    kind: 'THE MARKET, NOT US',
    observedAt: race.generated_at,
    domain: opts.domain ?? null,
  });

  /* ---- the standfirst -------------------------------------------------- */
  eyebrow(s, 'Live Polymarket prices on one question', MARGIN, BODY_TOP + 20);
  const q = fold(ev.title).text;
  s.text(q, MARGIN, BODY_TOP + 64, fit(q, 30, COL), INK_DIM, { track: 0.01 });

  /* ---- the hero -------------------------------------------------------- */
  const heroTxt = pctSmart(maxP);
  s.text(heroTxt, MARGIN, BODY_TOP + 268, fit(heroTxt, 170, COL * 0.80, 140), LAB[lead.id] || INK, {
    track: 0.01, weight: W_HERO, role: 'hero',
  });

  const nm = fold(lead.name).text;
  s.text(nm, MARGIN, BODY_TOP + 348, fit(nm, 54, COL * 0.86), INK,
    { track: 0.01, weight: W_MED, role: 'thumb' });

  const who = lead.principal
    ? `${fold(lead.principal).text}, ${fold(lead.principal_role || 'principal').text}`
    : 'No principal published';
  s.text(who, MARGIN, BODY_TOP + 392, 22, lead.principal ? INK_DIM : INK_FAINT, { track: 0.01 });

  const ch = lead.market.change_7d;
  const chTxt = typeof ch === 'number' && Math.abs(ch) >= 0.0005
    ? `${ch > 0 ? 'Up' : 'Down'} ${fmt1(Math.abs(ch) * 100)} points in 7 days`
    : 'Unchanged over 7 days';
  s.text(chTxt, MARGIN, BODY_TOP + 426, 22, INK_DIM, { track: 0.01 });

  /* ---- the scoreboard --------------------------------------------------- */
  const top = BODY_TOP + 452;
  s.rect(MARGIN, top, COL, 2, RULE);

  const rowH = 44;
  const barX = MARGIN + 600;
  const barW = 210;
  players.forEach((p, i) => {
    const y = top + 12 + i * rowH;
    const hue = LAB[p.id] || INK_DIM;
    const prob = p.market.probability;

    if (i % 2 === 1) s.rect(MARGIN, y - 2, COL, rowH - 6, GROUND_RAISED, { r: 6, alpha: 0.6 });

    // Rank. A count, not a colour: the ordering survives a greyscale repost.
    s.text(String(i + 1), MARGIN + 8, y + 25, 22, INK_FAINT, { track: 0 });

    // The lab's hue as a bar, never as the only carrier.
    s.rect(MARGIN + 34, y + 6, 5, 24, hue, { r: 2.5 });

    const lname = fold(p.name).text;
    s.text(lname, MARGIN + 52, y + 25, fit(lname, 25, 230), INK, { track: 0.01 });

    const person = p.principal ? fold(p.principal).text : 'No principal published';
    s.text(person, MARGIN + 580, y + 24, fit(person, 20, 290), p.principal ? INK_DIM : INK_FAINT,
      { align: 'right', track: 0.01 });

    s.rect(barX, y + 11, barW, 14, GROUND_RAISED, { r: 7 });
    const w = Math.max(4, (prob / maxP) * barW);
    s.rect(barX, y + 11, w, 14, hue, { r: 7 });

    const pv = pctSmart(prob);
    s.text(pv, CARD_W - MARGIN, y + 25, fit(pv, 25, 120), INK, { align: 'right', track: 0.01 });
  });

  /* ---- the money ------------------------------------------------------- */
  const ly = 1016;
  s.rect(MARGIN, ly, COL, 2, RULE);
  const vol = ev.volume_usd != null ? ev.volume_usd : race.markets?.polymarket?.horizon?.volume_usd;
  const legs = race.markets?.polymarket?.horizon?.legs?.length ?? players.length;
  const money = vol != null
    ? `$${fmtInt(vol)} traded on this question \u00b7 ${players.length} of ${legs} legs priced live`
    : `${players.length} of ${legs} legs priced live`;
  s.text(money, MARGIN, ly + 32, fit(money, 22, COL), INK_DIM, { track: 0.01 });

  s.note('lead', `${lead.name} ${fmt1(maxP * 100)}%`);
  s.note('volume_usd', vol);

  limitBox(s,
    'Live prices on one Polymarket question. The market’s ranking, not DOOMCON’s. '
    + 'None of it feeds the DOOMCON index.');

  return s;
}

export default { id: 'race', build, shouldPost };
