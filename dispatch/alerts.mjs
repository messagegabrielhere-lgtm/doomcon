// Extra alert-system collectors for dispatch (beyond NWS).
import { fetchJson, fetchText } from '../collector/fetch.mjs';
import { clean, geomCentroid, round3, stateFromText, STATE_CENTROIDS } from './geo.mjs';

const NWS_URL = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';
const NWS_EVENT_KEEP = /\b(Tornado|Hurricane|Typhoon|Tropical Storm|Tsunami|Flash Flood|Flood Warning|Severe Thunderstorm|Blizzard|Ice Storm|Extreme Wind|Storm Surge|Red Flag|Extreme Heat|Heat (Warning|Advisory)|Cold Warning|Wind Chill|Winter Storm|Fire Weather|Avalanche)\b/i;

function keepNws(p) {
  if (!p) return false;
  if (p.severity === 'Extreme' || p.severity === 'Severe') return true;
  return NWS_EVENT_KEEP.test(p.event || '') || NWS_EVENT_KEEP.test(p.headline || '');
}

export async function collectNws(sources) {
  const body = await fetchText(NWS_URL, {
    headers: { Accept: 'application/geo+json' }, timeoutMs: 40000, retries: 1,
  });
  let j; try { j = JSON.parse(body); } catch { throw new Error('NWS alerts: bad JSON'); }
  const alerts = [];
  for (const f of j.features || []) {
    const p = f.properties || {};
    if (!keepNws(p)) continue;
    let c = geomCentroid(f.geometry), approx = false;
    if (!c) {
      // Zone alerts ship without a polygon: pin them at the state, marked approximate.
      const st = stateFromText((p.areaDesc || '').split(';')[0], p.headline);
      if (st) { c = { lon: STATE_CENTROIDS[st][0], lat: STATE_CENTROIDS[st][1] }; approx = true; }
    }
    // t = when the alert was issued (onset can sit days ahead for river floods).
    const t = Date.parse(p.effective || p.sent || p.onset) || Date.now();
    const onset = Date.parse(p.onset) || null;
    const ends = Date.parse(p.ends || p.expires) || null;
    if (ends && ends < Date.now() && ends > t) continue; // already over
    alerts.push({
      id: p.id || f.id,
      system: 'nws',
      event: clean(p.event) || 'Alert',
      severity: clean(p.severity) || 'Unknown',
      urgency: clean(p.urgency),
      headline: clean(p.headline),
      area: clean((p.areaDesc || '').split(';')[0]),
      lon: c?.lon ?? null, lat: c?.lat ?? null, t, ...(onset && onset > t ? { onset } : {}), ...(approx ? { approx: true } : {}),
      ends,
      url: p['@id'] || f.id || null,
    });
  }
  alerts.sort((a, b) => b.t - a.t);
  const out = alerts.slice(0, 250);
  sources.nws = { ok: true, n: out.length, of: (j.features || []).length };
  return out;
}

export async function collectUsgs(sources) {
  const j = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', {
    timeoutMs: 30000, retries: 1,
  });
  const alerts = [];
  for (const f of j.features || []) {
    const p = f.properties || {};
    const [lon0, lat0] = f.geometry?.coordinates || [];
    const lon = round3(+lon0), lat = round3(+lat0);
    const mag = +p.mag;
    if (!Number.isFinite(mag) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const severity = mag >= 7 ? 'Extreme' : mag >= 6 ? 'Severe' : mag >= 5 ? 'Moderate' : 'Minor';
    alerts.push({
      id: `usgs:${f.id || p.code}`,
      system: 'usgs',
      event: `M${mag.toFixed(1)} earthquake`,
      severity,
      urgency: mag >= 6 ? 'Immediate' : 'Expected',
      headline: clean(p.title) || `M${mag.toFixed(1)} — ${p.place || 'quake'}`,
      area: clean(p.place),
      lon, lat, t: p.time || Date.now(),
      ends: null,
      url: p.url || null,
      mag,
    });
  }
  alerts.sort((a, b) => b.t - a.t);
  sources.usgs = { ok: true, n: alerts.length };
  return alerts;
}

const GDACS_TYPES = ['EQ', 'TC', 'FL', 'VO', 'WF', 'DR'];

export async function collectGdacs(sources) {
  const feats = [];
  let okN = 0, last;
  for (const t of GDACS_TYPES) {
    const u = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=${t}`;
    try {
      const j = await fetchJson(u, { timeoutMs: 30000, retries: 1 });
      feats.push(...(j.features || []));
      okN++;
    } catch (e) { last = e; }
  }
  if (!okN) throw last || new Error('GDACS failed');
  const alerts = [];
  for (const f of feats) {
    const p = f.properties || {};
    if (!p.alertlevel || p.alertlevel === 'Green') continue;
    if (f.geometry?.type !== 'Point') continue;
    const lon = round3(+f.geometry.coordinates[0]);
    const lat = round3(+f.geometry.coordinates[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const severity = p.alertlevel === 'Red' ? 'Extreme' : p.alertlevel === 'Orange' ? 'Severe' : 'Moderate';
    alerts.push({
      id: `gdacs:${p.eventtype}${p.eventid}`,
      system: 'gdacs',
      event: `GDACS ${p.eventtype}`,
      severity,
      urgency: p.alertlevel === 'Red' ? 'Immediate' : 'Expected',
      headline: clean(p.name || p.description) || `GDACS ${p.alertlevel} ${p.eventtype}`,
      area: clean(p.country),
      lon, lat,
      t: Date.parse(p.fromdate) || Date.now(),
      ends: Date.parse(p.todate) || null,
      url: p.url?.report || p.url?.details || null,
    });
  }
  const seen = new Set();
  const out = [];
  for (const a of alerts.sort((x, y) => y.t - x.t)) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  sources.gdacs = { ok: true, n: out.length };
  return out.slice(0, 200);
}

export async function collectEonet(sources) {
  const j = await fetchJson('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=14', {
    timeoutMs: 40000, retries: 1,
  });
  const alerts = [];
  for (const ev of j.events || []) {
    const g = ev.geometry?.[ev.geometry.length - 1];
    if (!g) continue;
    // EONET geometry rows are { type, coordinates, date } — same shape geomCentroid expects.
    const c = geomCentroid({ type: g.type, coordinates: g.coordinates });
    if (!c) continue;
    const cat = ev.categories?.[0]?.id || 'event';
    const severity = /wildfire|severeStorms|volcanoes/i.test(cat) ? 'Severe' : 'Moderate';
    alerts.push({
      id: `eonet:${ev.id}`,
      system: 'eonet',
      event: clean(ev.categories?.[0]?.title) || cat,
      severity,
      urgency: 'Expected',
      headline: clean(ev.title),
      area: null,
      lon: c.lon, lat: c.lat,
      t: Date.parse(g.date) || Date.now(),
      ends: null,
      url: ev.sources?.[0]?.url || ev.link || null,
    });
  }
  alerts.sort((a, b) => b.t - a.t);
  sources.eonet = { ok: true, n: alerts.length };
  return alerts.slice(0, 120);
}

export async function collectNhc(sources) {
  const j = await fetchJson('https://www.nhc.noaa.gov/CurrentStorms.json', {
    timeoutMs: 30000, retries: 1,
  });
  const storms = j.activeStorms || [];
  const alerts = [];
  for (const s of storms) {
    const lat = round3(+s.latitudeNumeric);
    let lon = +s.longitudeNumeric;
    if (!Number.isFinite(lon) && typeof s.longitude === 'string') {
      const m = /([\d.]+)([EW])/i.exec(s.longitude);
      if (m) lon = m[2].toUpperCase() === 'W' ? -(+m[1]) : +m[1];
    }
    lon = round3(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const wind = +s.intensity;
    const cls = clean(s.classification) || 'Storm';
    const severity = /HU|MH/i.test(cls) || wind >= 96 ? 'Extreme'
      : /TS|STS/i.test(cls) || wind >= 64 ? 'Severe' : 'Moderate';
    alerts.push({
      id: `nhc:${s.id}`,
      system: 'nhc',
      event: `${cls} ${clean(s.name) || s.id}`,
      severity,
      urgency: 'Immediate',
      headline: clean(`${s.name || s.id}: ${cls}, ${wind || '?'} kt`),
      area: clean(s.binNumber),
      lon, lat,
      t: Date.parse(s.lastUpdate) || Date.now(),
      ends: null,
      url: s.publicAdvisory?.url || s.forecastAdvisory?.url || 'https://www.nhc.noaa.gov/',
      wind_kt: Number.isFinite(wind) ? wind : null,
    });
  }
  sources.nhc = { ok: true, n: alerts.length };
  return alerts;
}

/** Run every alert system; a dark source is recorded, never invented. */
export async function collectAllAlerts(sources, log = () => {}) {
  const runners = [
    ['nws', collectNws],
    ['usgs', collectUsgs],
    ['gdacs', collectGdacs],
    ['eonet', collectEonet],
    ['nhc', collectNhc],
  ];
  const parts = await Promise.all(runners.map(async ([id, fn]) => {
    try {
      const rows = await fn(sources);
      log(`${id} ${rows.length} alerts`);
      return rows;
    } catch (e) {
      sources[id] = { ok: false, error: String(e.message).slice(0, 160) };
      log(`${id} FAILED ${sources[id].error}`);
      return [];
    }
  }));
  const now = Date.now();
  // Drop anything whose own end time has passed.
  const alerts = parts.flat().filter((a) => !(Number.isFinite(a.ends) && a.ends < now && (a.t || 0) < a.ends));
  alerts.sort((a, b) => b.t - a.t);
  return alerts.slice(0, 400);
}
