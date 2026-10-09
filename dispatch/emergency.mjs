// Decide when Dispatch is in an "emergency" state, and draft the X post text.
//
// An emergency is a rare, high-severity signal — Extreme NWS, GDACS Red,
// NHC hurricane, or a large recent quake — not every Severe flood watch.
// The site banner and the X poster both use evaluateEmergency().
//
// Post text is per-system and multi-phrasing: a quake does not sound like a
// tornado watch, and the same feed does not reuse one skeleton every time.
// Choice is a pure function of alert id + UTC day (no Math.random).

import { preflightX } from '../collector/post-x.mjs';

/** Hours a quake stays "live" for emergency purposes. */
export const QUAKE_WINDOW_H = 6;
/** Max characters for a dispatch X post (preflight also enforces X's 280). */
export const POST_CHAR_LIMIT = 270;

export const DEFAULT_SITE_SPELL =
  'siren dot watch slash dispatch';

/** Same cycle as collector/posts.mjs — preferred phrasing half the days. */
export const PHRASING_CYCLE = Object.freeze([0, 1, 0, 2]);

/**
 * Deterministic phrasing picker. Re-running a snapshot reproduces the same
 * post; two different alert ids on the same day do not lockstep.
 */
export function phrasingIndex(kind, isoOrMs, count) {
  if (!Number.isFinite(count) || count <= 1) return 0;
  const t = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (!Number.isFinite(t)) return 0;
  const day = Math.floor(t / 86400000);
  let h = 0;
  for (const ch of String(kind)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  const cycle = PHRASING_CYCLE.filter((i) => i < count);
  if (cycle.length === 0) return 0;
  return cycle[(((day + h) % cycle.length) + cycle.length) % cycle.length];
}

/**
 * NWS event names often contain "Warning" / "expected", which posts.mjs bans
 * as future tense. Rewrite those tokens so the post reports the feed as-is
 * without claiming what happens next.
 */
export function sanitizeAlertText(s) {
  return String(s || '')
    .replace(/\bwarnings?\b/gi, 'alert')
    .replace(/\bwarn(ed|ing)?\b/gi, 'flag')
    .replace(/\bexpected\b/gi, 'listed')
    .replace(/\bexpects?\b/gi, 'lists')
    .replace(/\bexpecting\b/gi, 'listing')
    .replace(/\bforecast(ed|ing|s)?\b/gi, 'outlook')
    .replace(/\bpredict(ed|ing|s)?\b/gi, 'modeled')
    .replace(/\bimpending\b/gi, 'active')
    .replace(/\blooming\b/gi, 'active')
    .replace(/\bupcoming\b/gi, 'listed')
    .replace(/\bshortly\b/gi, 'right after')
    .replace(/\blikely\b/gi, 'on the board')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Does this point sit on or near US soil or US coastal waters? Rough boxes
 * (CONUS plus the Gulf and near Atlantic, Alaska, Hawaii, Puerto Rico / USVI,
 * Guam). A storm off Mexico or a quake in Tonga is not a US emergency.
 */
export const US_BOXES = Object.freeze([
  [-126, 24, -65, 50],    // CONUS, Gulf, near Atlantic
  [-180, 50, -129, 72],   // Alaska and the Aleutians
  [-162, 17.5, -153, 23.5], // Hawaii
  [-68.5, 17, -64, 19.5],   // Puerto Rico, USVI
  [144, 12.5, 146.5, 16],   // Guam, Northern Marianas
]);
export function nearUS(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  return US_BOXES.some(([w, s, e, n]) => lon >= w && lon <= e && lat >= s && lat <= n);
}

/** True when an alert has run out (its own end time is in the past). */
export function isExpired(a, now = Date.now()) {
  return Number.isFinite(a?.ends) && a.ends > 0 && a.ends < now && (a.t || 0) < a.ends;
}

/**
 * @param {{ alerts?: object[], generated?: string }} snap
 * @param {{ now?: number }} [opts]
 */
export function evaluateEmergency(snap, { now = Date.now() } = {}) {
  const alerts = snap?.alerts || [];
  const triggers = [];

  for (const a of alerts) {
    if (!a || isExpired(a, now)) continue;
    const ageH = (now - (a.t || 0)) / 3600e3;

    if (a.system === 'nws' && a.severity === 'Extreme') {
      triggers.push({ id: a.id, kind: 'nws-extreme', weight: 3, alert: a });
    } else if (a.system === 'nws' && a.severity === 'Severe'
      && /\b(Tornado|Hurricane|Tsunami|Flash Flood|Blizzard)\b/i.test(a.event || '')) {
      triggers.push({ id: a.id, kind: 'nws-severe-land', weight: 2, alert: a });
    } else if (a.system === 'gdacs' && a.severity === 'Extreme') {
      triggers.push({ id: a.id, kind: 'gdacs-red', weight: 3, alert: a });
    } else if (a.system === 'nhc' && (a.severity === 'Extreme' || a.severity === 'Severe')) {
      triggers.push({ id: a.id, kind: 'nhc-storm', weight: 3, alert: a });
    } else if (a.system === 'usgs' && Number.isFinite(a.mag) && a.mag >= 7 && ageH <= 24) {
      triggers.push({ id: a.id, kind: 'usgs-m7', weight: 4, alert: a });
    } else if (a.system === 'usgs' && Number.isFinite(a.mag) && a.mag >= 6 && ageH <= QUAKE_WINDOW_H) {
      triggers.push({ id: a.id, kind: 'usgs-m6', weight: 3, alert: a });
    }
  }

  // NWS is US-only by construction. Global systems (NHC east Pacific, GDACS,
  // USGS) count at full weight only near the US; elsewhere they drop to a
  // Dispatch-page WATCH and are not posted to X. A world M7+ quake keeps full weight.
  for (const t of triggers) {
    const a = t.alert;
    t.us = a.system === 'nws' || nearUS(a.lon, a.lat);
    t.post = t.us || t.weight >= 4;
    // A great quake (M7+) is world news wherever it strikes: it keeps full
    // weight and leads the board. Everything else far from the US is a WATCH.
    if (!t.us && t.weight < 4) t.weight = 2;
  }
  // Prefer highest weight, then newest.
  triggers.sort((a, b) => (b.weight - a.weight) || ((b.alert.t || 0) - (a.alert.t || 0)));
  const top = triggers[0] || null;
  const active = triggers.length > 0;
  const level = !active ? 0
    : triggers.some((t) => t.weight >= 4) ? 1
      : triggers.some((t) => t.weight >= 3) ? 2
        : 3;

  return {
    active,
    level, // 1 = highest, 3 = elevated, 0 = quiet
    label: !active ? 'CLEAR'
      : level === 1 ? 'EMERGENCY'
        : level === 2 ? 'ALERT'
          : 'WATCH',
    count: triggers.length,
    primary: top ? summarise(top.alert) : null,
    trigger_ids: triggers.slice(0, 20).map((t) => t.id),
    post_ids: triggers.filter((t) => t.post).slice(0, 20).map((t) => t.id),
    us_count: triggers.filter((t) => t.us).length,
    as_of: new Date(now).toISOString(),
  };
}

function summarise(a) {
  return {
    id: a.id,
    system: a.system,
    event: a.event,
    severity: a.severity,
    headline: a.headline,
    area: a.area,
    lon: a.lon, lat: a.lat, t: a.t,
  };
}

function clock(alert) {
  return alert.t
    ? new Date(alert.t).toISOString().slice(11, 16) + ' UTC'
    : new Date().toISOString().slice(11, 16) + ' UTC';
}

function areaBit(alert) {
  const a = sanitizeAlertText(alert.area || '');
  return a ? a : '';
}

function headBit(alert) {
  return sanitizeAlertText(alert.headline || alert.event || 'Alert');
}

function eventBit(alert) {
  return sanitizeAlertText(alert.event || 'Alert');
}

function sevBit(alert) {
  return sanitizeAlertText(alert.severity || 'Unknown');
}

function magBit(alert) {
  return Number.isFinite(alert.mag) ? `M${Number(alert.mag).toFixed(1)}` : null;
}

function windBit(alert) {
  return Number.isFinite(alert.wind_kt) ? `${Math.round(alert.wind_kt)} kt` : null;
}

function nwsAngle(alert) {
  const e = `${alert.event || ''} ${alert.headline || ''}`;
  if (/\bTornado\b/i.test(e)) return 'tornado';
  if (/\b(Hurricane|Typhoon|Tropical)\b/i.test(e)) return 'tropical';
  if (/\bTsunami\b/i.test(e)) return 'tsunami';
  if (/\b(Flash Flood|Flood)\b/i.test(e)) return 'flood';
  if (/\bBlizzard|Winter|Ice\b/i.test(e)) return 'winter';
  if (/\b(Heat|Red Flag|Fire)\b/i.test(e)) return 'heat';
  return 'weather';
}

/**
 * Three body phrasings per system. Bodies do NOT include the site spell —
 * assemblePost() appends the shared disclaimer + address so every variant
 * stays honest and preflight-clean.
 */
function bodiesFor(alert) {
  const when = clock(alert);
  const area = areaBit(alert);
  const head = headBit(alert);
  const event = eventBit(alert);
  const sev = sevBit(alert);
  const place = area ? ` · ${area}` : '';
  const placeIn = area ? ` in ${area}` : '';
  const mag = magBit(alert);
  const wind = windBit(alert);

  switch (alert.system) {
    case 'usgs': {
      const m = mag || event;
      return [
        `${m} on the USGS catalog at ${when}${placeIn}. Logged on the Dispatch board.`,
        `USGS, ${when}: ${m}${place}. Magnitude from the public quake feed, not a local intensity map.`,
        `Dispatch quake desk. ${m}${place || ''} as of ${when}. USGS delayed catalog.`,
      ];
    }
    case 'nhc': {
      const windLine = wind ? `, ${wind}` : '';
      return [
        `NHC lists ${event}${windLine} as of ${when}${place}. Tropical cyclone desk, Dispatch.`,
        `Storm board, ${when}: ${head}${place}. Wind and class from the National Hurricane Center feed.`,
        `Dispatch · NHC. ${event}${windLine}${placeIn}, clock ${when}. Public advisory traffic only.`,
      ];
    }
    case 'gdacs': {
      return [
        `GDACS Red, ${when}: ${head}${place}. Global disaster desk on Dispatch.`,
        `Dispatch world board. ${event} — ${head}${place}, ${when}. GDACS alert level Red.`,
        `${sev.toUpperCase()} on GDACS at ${when}${placeIn}. ${head}. Delayed public feed.`,
      ];
    }
    case 'eonet': {
      return [
        `NASA EONET open event at ${when}: ${head}${place}. Earth-observation desk, Dispatch.`,
        `Dispatch · EONET. ${event} — ${head}${place}, ${when}. Satellite-era event list, not a siren.`,
        `Natural-event board, ${when}. ${head}${place}. Source: NASA EONET open events.`,
      ];
    }
    case 'nws': {
      const angle = nwsAngle(alert);
      const angleLine = {
        tornado: [
          `NWS ${sev} tornado alert${placeIn} as of ${when}. ${head}.`,
          `Tornado desk, ${when}: NWS ${sev}${place}. ${event}.`,
          `Dispatch weather. NWS ${sev} tornado product${placeIn}, ${when}.`,
        ],
        tropical: [
          `NWS ${sev} tropical product${placeIn} at ${when}. ${head}.`,
          `Tropical desk, ${when}: ${event}${place}. NWS ${sev}.`,
          `Dispatch · NWS. ${head}${place}, ${when}.`,
        ],
        tsunami: [
          `NWS ${sev} tsunami product${placeIn} at ${when}. ${head}.`,
          `Tsunami desk, ${when}: ${event}${place}. NWS feed.`,
          `Dispatch coastal board. ${head}${place}, ${when}.`,
        ],
        flood: [
          `NWS ${sev} flood product${placeIn} at ${when}. ${head}.`,
          `Flood desk, ${when}: ${event}${place}. NWS ${sev}.`,
          `Dispatch hydrology. ${head}${place}, ${when}.`,
        ],
        winter: [
          `NWS ${sev} winter product${placeIn} at ${when}. ${head}.`,
          `Winter desk, ${when}: ${event}${place}. NWS ${sev}.`,
          `Dispatch cold board. ${head}${place}, ${when}.`,
        ],
        heat: [
          `NWS ${sev} heat or fire-weather product${placeIn} at ${when}. ${head}.`,
          `Heat desk, ${when}: ${event}${place}. NWS ${sev}.`,
          `Dispatch fire-weather board. ${head}${place}, ${when}.`,
        ],
        weather: [
          `NWS ${sev}${placeIn} at ${when}. ${head}.`,
          `Weather desk, ${when}: ${event}${place}. NWS ${sev}.`,
          `Dispatch · NWS ${sev}. ${head}${place}, ${when}.`,
        ],
      };
      return angleLine[angle];
    }
    default:
      return [
        `DISPATCH ${sev.toUpperCase()}. ${event}: ${head}${place}. Seen ${when}.`,
        `Dispatch board, ${when}: ${head}${place}. ${sev}.`,
        `${sev.toUpperCase()} on Dispatch at ${when}. ${head}${place}.`,
      ];
  }
}

function assemblePost(body, siteSpell) {
  const tail = ` Public delayed feed. Not an emergency service. ${siteSpell}.`;
  let text = `${body.trim()}${tail}`;
  if (text.length <= POST_CHAR_LIMIT) return text;

  // Shrink the body; keep disclaimer + address intact.
  const budget = POST_CHAR_LIMIT - tail.length - 1;
  if (budget < 48) {
    // Degenerate: ship a minimal honest stub.
    text = `Dispatch board update at ${new Date().toISOString().slice(11, 16)} UTC.${tail}`;
    return text.slice(0, POST_CHAR_LIMIT);
  }
  const clipped = body.trim().slice(0, Math.max(40, budget - 1)).trim();
  return `${clipped}…${tail}`;
}

/**
 * Build a postable X text for one alert. Spells the site URL (no raw links —
 * post-x preflight rejects URLs). Throws if preflight fails.
 *
 * Each system has three phrasings; the pick is deterministic from alert id and
 * the alert's UTC day so a quake never reuses a tornado skeleton.
 */
export function formatAlertPost(alert, {
  siteSpell = DEFAULT_SITE_SPELL,
  phrasing,
} = {}) {
  const options = bodiesFor(alert);
  const idx = Number.isFinite(phrasing)
    ? Math.max(0, Math.min(options.length - 1, phrasing))
    : phrasingIndex(alert.id || alert.system || 'dispatch', alert.t || Date.now(), options.length);
  const body = options[idx] || options[0];
  const text = assemblePost(body, siteSpell);
  return preflightX(text);
}

/** Which triggers are new vs a previous emergency snapshot / posted ledger. */
export function freshTriggers(emergency, postedIds = []) {
  const seen = new Set(postedIds);
  return (emergency.post_ids || emergency.trigger_ids || []).filter((id) => id && !seen.has(id));
}
