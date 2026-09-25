/**
 * CARD 1 — THE DROUGHT CARD.  collector/cards/drought.mjs
 *
 * The strongest fact this project holds, and the only one on this list that
 * nobody else publishes at all: the join between where the datacentres actually
 * are and what the US Drought Monitor said about those counties this week.
 * OpenStreetMap publishes the buildings. The Drought Monitor publishes the
 * counties. Nobody puts them in the same table, and a map is the most shareable
 * object on the internet.
 *
 * THE LIE THIS CARD IS ONE EDIT AWAY FROM. "Datacentres are draining drought
 * counties" is what a reader wants this picture to say, it is what a hostile
 * quote-tweet will accuse us of saying, and it is not in the data. Nothing this
 * project reads measures a site's water draw — no public feed publishes it, for
 * any site, at any cadence. So the limitation is not a footnote and it is not
 * on the page: it is a dashed box on the face of the image, because the image
 * travels and the page does not. docs/BRAND.md's rule, restated: a card may be
 * vivid, and it may never make a claim the engine cannot support.
 *
 * THE DENOMINATOR IS THE JOINED SITES, NOT ALL OF THEM. The county join covers
 * the counties the collector asked about, which is not every county in the
 * country. Printing "72% of US datacentres" when the reading covers a subset is
 * the exact move this site exists to be better than, so the card prints the
 * coverage on its face as well: N of M joined, M of ALL mapped.
 *
 * READS: data/datacenters.json
 *          .sites[].resources.drought.{granularity,county_fips}
 *          .resources_index.drought_by_county[fips].headline.{category,area_pct}
 *          .resources_index.usdm_map_date
 *          .counts.{sites,with_county_drought}
 *          .sources[] where id === 'usdm-county'
 *
 * POSTS: weekly, on the morning after the Drought Monitor's Thursday release,
 *        and only when the join is live. See shouldPost().
 *
 * AS OF THE RUN THAT PRODUCED data/datacenters.json AT 2026-09-25T12:27Z THIS
 * CARD DECLINES. The usdm-county source is `degraded` — the UNL endpoint threw
 * a network error — `drought_by_county` is `{}` and `counts.with_county_drought`
 * is 0. There is no version of this card that can be drawn from that, and there
 * is deliberately no fallback: a drought card with imputed drought on it is the
 * one failure that would cost more than the card is worth.
 */

import {
  MARGIN, COL, RULE, INK, INK_DIM, INK_FAINT,
  DRY_RAMP, Surface, fit, fmtInt, fold, pct, W_HERO, W_MED,
} from './_kit.mjs';
import { chassis, limitBox, eyebrow, BODY_TOP } from './_chassis.mjs';
import { tileMap, tileLegend } from './_tilemap.mjs';

const CATS = ['D0', 'D1', 'D2', 'D3', 'D4'];
const CAT_WORDS = ['dry', 'moderate', 'severe', 'extreme', 'exceptional'];

/** Minimum share of mapped sites that must carry a county reading before a
 *  percentage of them is worth printing at all. Below this the card is a
 *  statement about the collector's county list, not about the country. */
export const MIN_COVERAGE = 0.60;

/** Fold the file down to the numbers the card sets. Pure; no drawing. */
export function measure(datacenters) {
  const idx = datacenters?.resources_index?.drought_by_county;
  const sites = datacenters?.sites || [];
  const total = datacenters?.counts?.sites ?? sites.length;
  if (!idx || Object.keys(idx).length === 0) return null;

  let joined = 0;
  let inDrought = 0;
  let severe = 0;                       // D2 or worse
  const byState = new Map();            // code -> { joined, inDrought, worst }
  let mapDate = datacenters?.resources_index?.usdm_map_date || null;

  for (const s of sites) {
    const dr = s.resources?.drought;
    if (!dr || dr.granularity !== 'county') continue;
    const fips = dr.county_fips ?? s.county_fips;
    const rec = idx[fips];
    if (!rec || !rec.headline) continue;
    joined += 1;
    if (rec.map_date && !mapDate) mapDate = rec.map_date;
    const cat = rec.headline.category;
    const ci = CATS.indexOf(cat);
    const st = s.state;
    if (!byState.has(st)) byState.set(st, { joined: 0, inDrought: 0, worst: -1 });
    const b = byState.get(st);
    b.joined += 1;
    if (ci >= 0) {
      inDrought += 1;
      b.inDrought += 1;
      if (ci > b.worst) b.worst = ci;
      if (ci >= 2) severe += 1;
    }
  }

  if (joined === 0) return null;
  return {
    total, joined, inDrought, severe, byState, mapDate,
    coverage: joined / total,
    share: inDrought / joined,
  };
}

export function shouldPost({ datacenters } = {}) {
  if (!datacenters) return { ok: false, why: 'no data/datacenters.json' };
  const src = (datacenters.sources || []).find((x) => x.id === 'usdm-county');
  if (!src) return { ok: false, why: 'no usdm-county source in data/datacenters.json' };
  if (src.state !== 'live') {
    return {
      ok: false,
      why: `usdm-county is ${src.state}, so the county join is not there`
        + `${src.error ? ` (${String(src.error).slice(0, 80)}…)` : ''}`
        + ` — with_county_drought=${datacenters.counts?.with_county_drought ?? 0}`,
    };
  }
  const m = measure(datacenters);
  if (!m) return { ok: false, why: 'drought_by_county is empty; no site carries a county reading' };
  if (m.coverage < MIN_COVERAGE) {
    return {
      ok: false,
      why: `county coverage is ${pct(m.coverage * 100)} of ${fmtInt(m.total)} mapped sites, `
        + `below the ${pct(MIN_COVERAGE * 100)} floor — a share of that is a fact about the county list`,
    };
  }
  return { ok: true };
}

export function build(data, opts = {}) {
  const gate = shouldPost(data);
  if (!gate.ok) throw new Error(`drought card: ${gate.why}`);
  const { datacenters, state } = data;
  const m = measure(datacenters);

  const s = new Surface();
  chassis(s, {
    level: state?.level ?? 4,
    kind: 'THE GROUND THEY SIT ON',
    observedAt: datacenters.generated_at,
    domain: opts.domain ?? null,
  });

  /* ---- the hero -------------------------------------------------------- */
  eyebrow(s, 'US datacentres in a county under a drought category', MARGIN, BODY_TOP + 20);

  const heroTxt = pct(m.share * 100, 0);
  s.text(heroTxt, MARGIN, BODY_TOP + 184, fit(heroTxt, 150, COL * 0.46, 140), DRY_RAMP[2], {
    track: 0.01, weight: W_HERO, role: 'hero',
  });

  // The second figure, and the one a critic reaches for first: how much of that
  // share is actually severe. It gets the right half of the hero row at a size
  // that survives the thumbnail, because "some drought" and "D2 or worse" are
  // different claims and only the second one is interesting.
  const gx = MARGIN + 470;
  const gw = COL - 470;
  s.text(fmtInt(m.severe), gx, BODY_TOP + 116, fit(fmtInt(m.severe), 74, gw), DRY_RAMP[3],
    { track: 0.01, weight: W_MED, role: 'thumb' });
  s.text('in D2 severe or worse', gx, BODY_TOP + 154, fit('in D2 severe or worse', 22, gw), INK_DIM,
    { track: 0.01 });

  const big = `${fmtInt(m.inDrought)} of ${fmtInt(m.joined)} mapped sites with a county reading`;
  s.text(big, MARGIN, BODY_TOP + 248, fit(big, 30, COL), INK, { track: 0.01 });

  const cov = `County reading on ${fmtInt(m.joined)} of ${fmtInt(m.total)} mapped sites`
    + `${m.mapDate ? ` \u00b7 Monitor map dated ${fold(m.mapDate).text}` : ''}`;
  s.text(cov, MARGIN, BODY_TOP + 284, fit(cov, 20, COL), INK_FAINT, { track: 0.01 });

  /* ---- the map --------------------------------------------------------- */
  const mapY = BODY_TOP + 314;
  s.rect(MARGIN, mapY - 18, COL, 2, RULE);
  const { height } = tileMap(s, {
    x: MARGIN,
    y: mapY,
    w: COL,
    maxH: 430,
    ramp: DRY_RAMP,
    cell: (code) => {
      const b = m.byState.get(code);
      if (!b || b.joined === 0) return null;          // nobody mapped, or no county reading
      // Clear of D0 entirely is a READING, not a gap, and it gets its own
      // colour rather than the dotted "we have nothing" frame.
      if (b.worst < 0) return { bucket: 0, value: '0', hue: '#2a3a4c' };
      return { bucket: b.worst, value: String(b.inDrought) };
    },
  });

  const legY = mapY + height + 26;
  tileLegend(s, {
    x: MARGIN,
    y: legY,
    w: COL,
    ramp: DRY_RAMP,
    labels: CATS.map((c, i) => `${c} ${CAT_WORDS[i]}`),
    title: 'Worst category in that state\u2019s datacentre counties \u00b7 figure is sites in drought',
  });
  const note = 'One square is one state, not one area. A dotted square is a state with no reading.';
  s.text(note, MARGIN, legY + 76, fit(note, 20, COL), INK_FAINT, { track: 0.01 });

  s.note('share', `${fmtInt(m.inDrought)}/${fmtInt(m.joined)} = ${pct(m.share * 100)}`);
  s.note('severe_d2_plus', m.severe);
  s.note('map_date', m.mapDate);

  limitBox(s,
    'Nothing here measures a datacentre’s water draw; no feed publishes it. '
    + 'Drought is the share of a county’s area, judged weekly.');

  return s;
}

export default { id: 'drought', build, shouldPost, measure, MIN_COVERAGE };
