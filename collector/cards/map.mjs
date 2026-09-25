/**
 * CARD 5 — THE MAP CARD (my choice).  collector/cards/map.mjs
 *
 * THE ARGUMENT, since the brief asks for one.
 *
 * 1. It is the only card on this list that is a PICTURE rather than a figure
 *    with furniture round it. Four of the five designs are typography; a thumb
 *    stops for a shape it has not seen before, and the shape of American
 *    compute is a shape almost nobody has actually looked at. One state holds
 *    more mapped datacentres than the bottom thirty combined, and that reads at
 *    200 pixels with the numbers illegible.
 * 2. It is the renderable proof of card 1. The drought card is the strongest
 *    fact this project holds and it is DARK today — the Drought Monitor
 *    endpoint threw. This card is the same 51 squares, the same legend, the
 *    same limitation box, built from a join that is live. The day usdm-county
 *    answers again, card 1 lights up in a chassis the audience has already been
 *    trained on.
 * 3. It carries the project's best sentence in the only place it counts. The
 *    honest version of this map — "a datacentre missing from this map means
 *    nobody mapped it, not that it does not exist" — is a statement no rival
 *    instrument in this category prints anywhere, and it is the thing that
 *    makes the rest of the site believable. On a card it costs three lines.
 * 4. It is the only design here with a zero marginal cost per post. The count
 *    moves every run, the top of the table almost never does, so it is a card
 *    that can be reposted monthly against a slowly moving number without ever
 *    being stale or ever being news, which is exactly what a habit needs.
 *
 * READS: data/datacenters.json  .counts.{sites,by_state,by_status}, .sources[]
 * POSTS: monthly, and whenever a state's count crosses a bucket boundary.
 */

import {
  MARGIN, COL, RULE, INK, INK_DIM, INK_FAINT,
  Surface, fit, fmtInt, fold, pct, W_HERO, W_MED,
} from './_kit.mjs';
import { chassis, limitBox, eyebrow, BODY_TOP } from './_chassis.mjs';
import { tileMap, tileLegend } from './_tilemap.mjs';

/** A neutral ink ramp. Deliberately NOT a brand hue: on this site amber, green,
 *  blue and red all already mean something, and "how many buildings" is not one
 *  of those things. Grey to white reads as density and collides with nothing. */
export const DENSITY = Object.freeze(['#33414f', '#4e6478', '#7d93a8', '#b3c2d0', '#e8eaee']);
const EDGES = [10, 30, 75, 150];
const BAND_WORDS = ['1-9', '10-29', '30-74', '75-149', '150+'];

function bucket(n) {
  let b = 0;
  for (const e of EDGES) if (n >= e) b += 1;
  return b;
}

export function shouldPost({ datacenters } = {}) {
  if (!datacenters) return { ok: false, why: 'no data/datacenters.json' };
  const osm = (datacenters.sources || []).find((x) => x.id === 'osm-overpass');
  if (!osm || osm.state !== 'live') return { ok: false, why: `osm-overpass is ${osm ? osm.state : 'missing'}` };
  const n = datacenters.counts?.sites ?? 0;
  if (n < 100) return { ok: false, why: `only ${n} sites; the map is not worth drawing` };
  return { ok: true };
}

export function build(data, opts = {}) {
  const gate = shouldPost(data);
  if (!gate.ok) throw new Error(`map card: ${gate.why}`);
  const { datacenters, state } = data;

  const counts = datacenters.counts;
  const byState = counts.by_state || {};
  const total = counts.sites;
  const status = counts.by_status || {};

  const ranked = Object.entries(byState)
    .map(([code, v]) => ({ code, n: v.total }))
    .sort((a, b) => b.n - a.n);
  const top = ranked[0];

  const s = new Surface();
  chassis(s, {
    level: state?.level ?? 4,
    kind: 'WHERE THE COMPUTE IS',
    observedAt: datacenters.generated_at,
    domain: opts.domain ?? null,
  });

  /* ---- the hero -------------------------------------------------------- */
  eyebrow(s, 'Datacentres OpenStreetMap has mapped in the United States', MARGIN, BODY_TOP + 20);

  const heroTxt = fmtInt(total);
  s.text(heroTxt, MARGIN, BODY_TOP + 186, fit(heroTxt, 150, COL * 0.80, 140), INK, {
    track: 0.01, weight: W_HERO, role: 'hero',
  });

  const gx = MARGIN + 700;
  const gw = COL - 700;
  s.text(fmtInt(top.n), gx, BODY_TOP + 110, fit(fmtInt(top.n), 64, gw), INK,
    { track: 0.01, weight: W_MED, role: 'thumb' });
  const topLine = `in ${top.code} alone`;
  s.text(topLine, gx, BODY_TOP + 148, fit(topLine, 21, gw), INK_DIM, { track: 0.01 });
  const share = `${pct((top.n / total) * 100, 0)} of all`;
  s.text(share, gx, BODY_TOP + 180, fit(share, 21, gw), INK_FAINT, { track: 0.01 });

  const three = ranked.slice(0, 5).map((r) => `${r.code} ${fmtInt(r.n)}`).join('  \u00b7  ');
  s.text(three, MARGIN, BODY_TOP + 256, fit(three, 26, COL), INK_DIM, { track: 0.01 });

  const st = `${fmtInt(status.operating || 0)} operating \u00b7 ${fmtInt(status.under_construction || 0)} under construction \u00b7 ${fmtInt(status.announced || 0)} announced`;
  s.text(st, MARGIN, BODY_TOP + 292, fit(st, 21, COL), INK_FAINT, { track: 0.01 });

  /* ---- the map --------------------------------------------------------- */
  const mapY = BODY_TOP + 316;
  s.rect(MARGIN, mapY - 18, COL, 2, RULE);
  const { height } = tileMap(s, {
    x: MARGIN,
    y: mapY,
    w: COL,
    maxH: 420,
    ramp: DENSITY,
    cell: (code) => {
      const v = byState[code];
      // A state with no pins is a state nobody has mapped. It is NOT a state
      // with no datacentres, and it is not drawn as a zero.
      if (!v || !v.total) return null;
      return { bucket: bucket(v.total), value: fmtInt(v.total) };
    },
  });

  const legY = mapY + height + 26;
  tileLegend(s, {
    x: MARGIN, y: legY, w: COL, ramp: DENSITY, labels: BAND_WORDS,
    title: 'Mapped sites in that state',
  });
  const note = 'One square is one state, not one area. A dotted square is a state nobody mapped.';
  s.text(note, MARGIN, legY + 76, fit(note, 20, COL), INK_FAINT, { track: 0.01 });

  s.note('total', total);
  s.note('top', `${top.code} ${top.n}`);
  s.note('states_with_pins', ranked.filter((r) => r.n > 0).length);

  limitBox(s,
    'OpenStreetMap coverage is volunteer-maintained and uneven. A datacentre missing '
    + 'from this map means nobody mapped it, not that it does not exist.');

  return s;
}

export default { id: 'map', build, shouldPost, DENSITY };
