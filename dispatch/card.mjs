// Dispatch alert share card — one PNG per alert, tailored to the system and
// the reading. Built on site/cardpng.mjs so X gets a real image (it does not
// render SVG). Deterministic: same alert → same bytes. No Math.random.
//
// The card is the thing that travels. Every number on it comes from the alert
// object; a missing figure is an omitted line, never a placeholder.

import {
  surface, FORMATS, CARD_GROUND, HEAT, INK, INK_DIM, INK_FAINT, mix,
  fitText, measureText, art, utcStamp, assertCanSet,
} from '../site/cardpng.mjs';
import * as brand from '../site/brand.mjs';
import { sanitizeAlertText } from './emergency.mjs';

/** Severity → SIREN heat step. Extreme reads as loudest (1). */
export const SEVERITY_HEAT = Object.freeze({
  Extreme: 1,
  Severe: 2,
  Moderate: 3,
  Minor: 4,
  Unknown: 4,
});

/** Per-system art, kind label, and accent copy for the card face. */
export const SYSTEM_LOOK = Object.freeze({
  nws: {
    art: 'room-radar',
    kind: 'NWS ALERT',
    blurb: 'National Weather Service CAP',
  },
  usgs: {
    art: 'room-globe',
    kind: 'USGS QUAKE',
    blurb: 'USGS earthquake catalog',
  },
  gdacs: {
    art: 'room-globe',
    kind: 'GDACS',
    blurb: 'Global Disaster Alert system',
  },
  nhc: {
    art: 'room-satellite',
    kind: 'NHC STORM',
    blurb: 'National Hurricane Center',
  },
  eonet: {
    art: 'room-sun',
    kind: 'NASA EONET',
    blurb: 'Earth Observatory events',
  },
});

const RULE = mix('#000000', '#8fa6c8', 0.18);
const PANEL = mix('#000000', '#8fa6c8', 0.07);

function lookFor(system) {
  return SYSTEM_LOOK[system] || {
    art: 'room-siren',
    kind: 'DISPATCH',
    blurb: 'Public delayed feed',
  };
}

function heatFor(severity) {
  return HEAT[SEVERITY_HEAT[severity] || 4] || HEAT[4];
}

function fmtCoord(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)} ${ns}, ${Math.abs(lon).toFixed(2)} ${ew}`;
}

function fmtWhen(t) {
  if (!Number.isFinite(t)) return null;
  return utcStamp(new Date(t).toISOString());
}

/**
 * Facts printed under the headline — only what the alert actually carries.
 * @returns {string[]}
 */
export function cardFacts(alert) {
  const facts = [];
  if (alert.system === 'usgs' && Number.isFinite(alert.mag)) {
    facts.push(`Magnitude ${Number(alert.mag).toFixed(1)}`);
  }
  if (alert.system === 'nhc' && Number.isFinite(alert.wind_kt)) {
    facts.push(`${Math.round(alert.wind_kt)} kt sustained`);
  }
  if (alert.severity) facts.push(String(alert.severity));
  if (alert.urgency) facts.push(String(alert.urgency));
  if (alert.area) facts.push(String(alert.area));
  const coord = fmtCoord(alert.lat, alert.lon);
  if (coord) facts.push(coord);
  return facts;
}

/**
 * Render one alert as a 1200×675 PNG for an X post.
 * @param {object} alert
 * @param {{ generatedAt?: string }} [opts]
 * @returns {Buffer}
 */
export function renderAlertCard(alert, { generatedAt } = {}) {
  if (!alert || typeof alert !== 'object') throw new Error('dispatch card: alert required');
  const look = lookFor(alert.system);
  const heat = heatFor(alert.severity);
  const stampIso = generatedAt
    || (Number.isFinite(alert.t) ? new Date(alert.t).toISOString() : new Date().toISOString());
  const stamp = fmtWhen(Date.parse(stampIso)) || utcStamp(new Date().toISOString());

  // Same sanitizer as the X text — "Warning" / "expected" are future-tense
  // bans in posts.mjs, and the card should not disagree with the caption.
  const headline = sanitizeAlertText(alert.headline || alert.event || 'Alert');
  const event = sanitizeAlertText(alert.event || 'Alert');
  assertCanSet(headline, 'dispatch headline');
  assertCanSet(event, 'dispatch event');

  const fmt = FORMATS.landscape;
  const S = surface(fmt.w, fmt.h, { background: CARD_GROUND });
  const margin = 64;
  const stripe = 10;

  // Heat wash + stripe — same language as the index cards, different reading.
  S.gradient({
    x: 0, y: stripe, w: S.width, h: 160, from: [0, stripe], to: [0, stripe + 160],
    stops: [{ at: 0, color: mix(CARD_GROUND, heat, 0.14) }, { at: 1, color: CARD_GROUND }],
  });
  S.rect({ x: 0, y: 0, w: S.width, h: stripe, color: heat });

  const small = 16;
  const top = stripe + 36;

  // Masthead: DISPATCH · system kind
  S.text('DISPATCH', {
    x: margin, y: top, size: 18, color: heat, weight: 0.11, track: 0.22,
  });
  S.text(look.kind, {
    x: margin + measureText('DISPATCH', { size: 18, track: 0.22 }) + 28,
    y: top, size: 18, color: INK_FAINT, weight: 0.10, track: 0.18,
  });
  S.text(stamp, {
    x: S.width - margin, y: top, size: 15, color: INK_FAINT, weight: 0.10,
    track: 0.04, align: 'right',
  });

  // Art panel (system-specific room illustration)
  const img = art(look.art) || art('room-siren') || art('siren');
  const box = 260;
  const artX = margin;
  const artY = top + 36;
  S.rect({
    x: artX - 8, y: artY - 8, w: box + 16, h: box + 16, r: 18, color: PANEL,
  });
  if (img) {
    S.image(img, { x: artX, y: artY, w: box, h: box });
  } else {
    S.disc({ cx: artX + box / 2, cy: artY + box / 2, r: 48, color: heat });
  }

  const tx = artX + box + 48;
  const col = S.width - margin - tx;

  // Severity as the hero word
  const sev = String(alert.severity || 'Alert').toUpperCase();
  assertCanSet(sev, 'dispatch severity');
  S.text(sev, {
    x: tx, y: artY + 42, size: 52, color: heat, weight: 0.11, track: 0.04,
  });

  // Event line (short instrument name)
  const ev = fitText(event, { from: 28, to: 18, maxWidth: col, maxLines: 2, track: 0.02 });
  let y = artY + 42 + 28 + ev.size;
  for (const line of ev.lines) {
    S.text(line, { x: tx, y, size: ev.size, color: INK_DIM, weight: 0.095 });
    y += ev.size * 1.35;
  }

  // Headline — the human-readable lead
  y += 10;
  const hl = fitText(headline, { from: 34, to: 20, maxWidth: col, maxLines: 3, track: 0.01 });
  for (const line of hl.lines) {
    S.text(line, { x: tx, y, size: hl.size, color: '#FFFFFF', weight: 0.105, track: 0.01 });
    y += hl.size * 1.32;
  }

  // Fact chips
  y += 18;
  const facts = cardFacts(alert).slice(0, 4);
  for (const fact of facts) {
    const label = String(fact).slice(0, 48);
    if (!label) continue;
    try { assertCanSet(label, 'dispatch fact'); } catch { continue; }
    const tw = measureText(label, { size: 16, track: 0.04 });
    const padX = 14;
    const chipH = 32;
    if (tx + tw + padX * 2 > S.width - margin) break;
    S.rect({
      x: tx, y: y - 22, w: tw + padX * 2, h: chipH, r: 8, color: PANEL,
    });
    S.rect({ x: tx, y: y - 22, w: 4, h: chipH, color: heat });
    S.text(label, {
      x: tx + padX, y, size: 16, color: INK, weight: 0.10, track: 0.04,
    });
    y += chipH + 10;
  }

  // Footer caveat — on the face, because the image travels alone.
  // Domain is long (Pages URL); fit it on its own row so it never overprints
  // the disclaimer the way a right-aligned sibling would.
  const fy = S.height - margin - 4;
  S.line({ from: [margin, fy - 52], to: [S.width - margin, fy - 52], color: RULE, width: 1.5 });
  S.text('Public delayed feed. Not an emergency service.', {
    x: margin, y: fy - 28, size: small, color: INK_DIM, weight: 0.10, track: 0.04,
  });
  S.text(look.blurb, {
    x: S.width - margin, y: fy - 28, size: small - 2, color: INK_FAINT, weight: 0.10,
    track: 0.06, align: 'right',
  });
  const domain = `${(brand.DOMAIN || 'siren.watch').toLowerCase()}/dispatch`;
  let domSize = small - 1;
  while (domSize > 11 && measureText(domain, { size: domSize, track: 0.04 }) > S.width - margin * 2) {
    domSize -= 1;
  }
  S.text(domain, {
    x: margin, y: fy - 4, size: domSize, color: INK_FAINT, weight: 0.10, track: 0.04,
  });

  return S.png();
}
