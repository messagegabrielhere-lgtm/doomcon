// Decide when Dispatch is in an "emergency" state, and draft the X post text.
//
// An emergency is a rare, high-severity signal — Extreme NWS, GDACS Red,
// NHC hurricane, or a large recent quake — not every Severe flood watch.
// The site banner and the X poster both use evaluateEmergency().

import { preflightX } from '../collector/post-x.mjs';

/** Hours a quake stays "live" for emergency purposes. */
export const QUAKE_WINDOW_H = 6;
/** Max characters for a dispatch X post (preflight also enforces X's 280). */
export const POST_CHAR_LIMIT = 270;

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
    .replace(/\bshortly\b/gi, 'soon after')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{ alerts?: object[], generated?: string }} snap
 * @param {{ now?: number }} [opts]
 */
export function evaluateEmergency(snap, { now = Date.now() } = {}) {
  const alerts = snap?.alerts || [];
  const triggers = [];

  for (const a of alerts) {
    if (!a) continue;
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

/**
 * Build a postable X text for one alert. Spells the site URL (no raw links —
 * post-x preflight rejects URLs). Throws if preflight fails.
 */
export function formatAlertPost(alert, { siteSpell = 'messagegabrielhere dash lgtm dot github dot io slash doomcon slash dispatch' } = {}) {
  const when = alert.t
    ? new Date(alert.t).toISOString().slice(11, 16) + ' UTC'
    : new Date().toISOString().slice(11, 16) + ' UTC';
  const area = alert.area ? ` · ${sanitizeAlertText(alert.area)}` : '';
  const head = sanitizeAlertText(alert.headline || alert.event || 'Alert');
  const sev = sanitizeAlertText(alert.severity || 'Unknown');
  const sys = ({
    nws: 'NWS', usgs: 'USGS', gdacs: 'GDACS', nhc: 'NHC', eonet: 'NASA EONET',
  })[alert.system] || (alert.system || 'Dispatch').toUpperCase();

  let text = `DISPATCH ${sev.toUpperCase()}. ${sys}: ${head}${area}. Seen ${when}. Public delayed feed. Not an emergency service. ${siteSpell}.`;
  if (text.length > POST_CHAR_LIMIT) {
    const keep = POST_CHAR_LIMIT - (`DISPATCH ${sev.toUpperCase()}. ${sys}: …${area}. Seen ${when}. Public delayed feed. Not an emergency service. ${siteSpell}.`.length);
    const clipped = head.slice(0, Math.max(40, keep));
    text = `DISPATCH ${sev.toUpperCase()}. ${sys}: ${clipped}…${area}. Seen ${when}. Public delayed feed. Not an emergency service. ${siteSpell}.`;
  }
  return preflightX(text);
}

/** Which triggers are new vs a previous emergency snapshot / posted ledger. */
export function freshTriggers(emergency, postedIds = []) {
  const seen = new Set(postedIds);
  return (emergency.trigger_ids || []).filter((id) => id && !seen.has(id));
}
