// THREAT BOARD: the real-world things that could take the machines (and the
// rest of us) offline. Source list adapted from OSIRIS (MIT,
// github.com/simplifaisoul/osiris), all keyless public feeds:
//   CISA Known Exploited Vulnerabilities   software being attacked right now
//   abuse.ch Feodo Tracker                 live botnet command servers
//   NOAA SWPC                              geomagnetic storms (grid risk), flares
//   NASA EONET                             open natural events worldwide
// Each source fails dark (null + error), never as "all clear".
//
//   node collector/threats.mjs
import { writeFileSync } from 'node:fs';
import { fetchJson } from './fetch.mjs';

const OUT = 'data/threats.json';
const say = (m) => { if (process.env.GITHUB_ACTIONS) console.log(`::notice title=threats::${m}`); else console.log(m); };
const DAY = 86400000;

/** NOAA G-scale from planetary Kp (G1 = Kp 5 ... G5 = Kp 9). */
export function gScale(kp) {
  if (!Number.isFinite(kp)) return { level: 'UNKNOWN', label: 'No reading', color: '#64748B' };
  if (kp >= 9) return { level: 'G5', label: 'Extreme geomagnetic storm', color: '#F87171' };
  if (kp >= 8) return { level: 'G4', label: 'Severe geomagnetic storm', color: '#F87171' };
  if (kp >= 7) return { level: 'G3', label: 'Strong geomagnetic storm', color: '#FB923C' };
  if (kp >= 6) return { level: 'G2', label: 'Moderate geomagnetic storm', color: '#FACC15' };
  if (kp >= 5) return { level: 'G1', label: 'Minor geomagnetic storm', color: '#FACC15' };
  if (kp >= 4) return { level: 'ACTIVE', label: 'Unsettled to active', color: '#A3E635' };
  return { level: 'QUIET', label: 'Quiet', color: '#4ADE80' };
}

export function parseKev(j, now = Date.now()) {
  const v = (j && j.vulnerabilities) || [];
  const recent = v.filter((x) => now - Date.parse(x.dateAdded) <= 30 * DAY).sort((a, b) => String(b.dateAdded).localeCompare(String(a.dateAdded)));
  const ai = /\b(ai|llm|ml|model|nvidia|pytorch|tensorflow|ollama|langchain|jupyter|ray|gpu)\b/i;
  return {
    total: v.length, catalog_version: j && j.catalogVersion, added_7d: recent.filter((x) => now - Date.parse(x.dateAdded) <= 7 * DAY).length, added_30d: recent.length,
    ransomware_30d: recent.filter((x) => x.knownRansomwareCampaignUse === 'Known').length,
    latest: recent.slice(0, 15).map((x) => ({ cve: x.cveID, vendor: x.vendorProject, product: x.product, name: x.vulnerabilityName, added: x.dateAdded, due: x.dueDate, ransomware: x.knownRansomwareCampaignUse === 'Known', ai: ai.test(`${x.vendorProject} ${x.product} ${x.vulnerabilityName}`) })),
  };
}

export function parseFeodo(j, now = Date.now()) {
  const list = Array.isArray(j) ? j : [];
  const online = list.filter((x) => x.status === 'online');
  const by = (k, src) => Object.entries(src.reduce((m, x) => { const v = x[k] || '??'; m[v] = (m[v] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key, n]) => ({ key, n }));
  return { total: list.length, online: online.length, seen_24h: list.filter((x) => now - Date.parse(String(x.last_online || '').replace(' ', 'T') + 'Z') <= DAY).length, by_malware: by('malware', list), by_country: by('country', online.length ? online : list) };
}

export function parseEonet(j) {
  const ev = (j && j.events) || [];
  const cat = {};
  for (const e of ev) { const c = ((e.categories || [])[0] || {}).title || 'Other'; cat[c] = (cat[c] || 0) + 1; }
  return { open: ev.length, by_category: Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, n })),
    latest: ev.slice(0, 12).map((e) => { const g = (e.geometry || []).slice(-1)[0] || {}; return { title: e.title, category: ((e.categories || [])[0] || {}).title || null, date: g.date || null, url: (e.sources && e.sources[0] && e.sources[0].url) || e.link || null }; }) };
}

async function grab(fn) { try { return { data: await fn(), error: null }; } catch (e) { return { data: null, error: String(e.message).slice(0, 140) }; } }

async function main() {
  const now = Date.now();
  const [kev, feodo, kp, alerts, eonet] = await Promise.all([
    grab(async () => parseKev(await fetchJson('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { timeoutMs: 30000, retries: 1 }), now)),
    grab(async () => parseFeodo(await fetchJson('https://feodotracker.abuse.ch/downloads/ipblocklist.json', { timeoutMs: 20000, retries: 1 }), now)),
    grab(async () => { const a = await fetchJson('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', { timeoutMs: 15000, retries: 1 }); const l = a[a.length - 1] || {}; const v = parseFloat(l.kp_index ?? l.estimated_kp ?? l.Kp); const max24 = Math.max(...a.slice(-1440).map((x) => parseFloat(x.kp_index ?? x.estimated_kp)).filter(Number.isFinite)); return { kp: Number.isFinite(v) ? v : null, at: l.time_tag || null, max_24h: Number.isFinite(max24) ? max24 : null }; }),
    grab(async () => (await fetchJson('https://services.swpc.noaa.gov/json/alerts.json', { timeoutMs: 15000, retries: 1 })).slice(0, 6).map((x) => ({ at: x.issue_datetime, text: String(x.message || '').replace(/\s+/g, ' ').slice(0, 220) }))),
    grab(async () => parseEonet(await fetchJson('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200', { timeoutMs: 20000, retries: 1 }))),
  ]);
  const space = kp.data ? { ...kp.data, scale: gScale(kp.data.max_24h ?? kp.data.kp), alerts: alerts.data || [] } : null;
  const doc = { schema: 1, generated_at: new Date(now).toISOString(), kev: kev.data, feodo: feodo.data, space, eonet: eonet.data,
    errors: { kev: kev.error, feodo: feodo.error, space: kp.error, alerts: alerts.error, eonet: eonet.error },
    credit: 'Source list adapted from OSIRIS (MIT), github.com/simplifaisoul/osiris' };
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  say(`kev ${kev.data ? `${kev.data.added_7d}/7d` : 'dark: ' + kev.error} · feodo ${feodo.data ? `${feodo.data.online} online` : 'dark: ' + feodo.error} · kp ${space ? `${space.kp} (${space.scale.level})` : 'dark: ' + kp.error} · eonet ${eonet.data ? eonet.data.open : 'dark: ' + eonet.error}`);
}

if (process.argv[1] && process.argv[1].endsWith('threats.mjs')) main().catch((e) => console.log(`::warning title=threats::${String(e.message).slice(0, 200)}`));
