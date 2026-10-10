// THE POWER RACE: "Electricity production is the best metric for the true
// strength of any large-scale economy" (Elon Musk, Oct 2026). Who makes the
// most electricity, who makes the most per person, and the US-China race,
// from Our World in Data's open energy dataset (Ember + Energy Institute
// figures, CC BY). Annual data, so it refreshes at most once a day.
//
//   node collector/power.mjs [--offline] [--force]
import { readFileSync, writeFileSync } from 'node:fs';
import { fetchText } from './fetch.mjs';

const OUT = 'data/power.json';
const SRC = 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv';
const say = (m) => { if (process.env.GITHUB_ACTIONS) console.log(`::notice title=power::${m}`); else console.log(m); };

/** Minimal CSV (OWID's file has no quoted commas in the columns we read, but handle quotes anyway). */
export function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  const split = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
  const head = split(lines[0] || '');
  return lines.slice(1).map((l) => { const v = split(l); const o = {}; head.forEach((h, i) => { o[h] = v[i]; }); return o; });
}

const num = (v) => (v === '' || v == null ? null : Number.isFinite(+v) ? +v : null);

/** Rows -> the published summary. Countries only (ISO-3 codes; OWID aggregates have none). */
export function summarise(rows) {
  const by = new Map();
  for (const r of rows) {
    const g = num(r.electricity_generation);
    if (g == null) continue;
    const key = r.country;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push({ year: +r.year, twh: g, pc: num(r.per_capita_electricity), low: num(r.low_carbon_share_elec), solar: num(r.solar_electricity), nuclear: num(r.nuclear_electricity), iso: r.iso_code || '', pop: num(r.population) });
  }
  const world = (by.get('World') || []).sort((a, b) => a.year - b.year);
  const year = world.length ? world[world.length - 1].year : null;
  const countries = [];
  for (const [name, list] of by) {
    const iso = (list.find((x) => x.iso) || {}).iso || '';
    if (!/^[A-Z]{3}$/.test(iso)) continue; // aggregates (World, Asia, EU...) have no ISO-3
    list.sort((a, b) => a.year - b.year);
    const last = list[list.length - 1];
    if (!last || last.year < (year || 0) - 1) continue;
    const five = list.find((x) => x.year === last.year - 5);
    countries.push({
      name, iso, year: last.year, twh: +last.twh.toFixed(1),
      per_capita_kwh: last.pc == null ? null : Math.round(last.pc),
      growth_5y_pct: five && five.twh ? +(((last.twh / five.twh) - 1) * 100).toFixed(1) : null,
      low_carbon_pct: last.low == null ? null : +last.low.toFixed(1),
      pop_m: last.pop == null ? null : +(last.pop / 1e6).toFixed(1),
    });
  }
  countries.sort((a, b) => b.twh - a.twh);
  const series = (name, from = 2000) => (by.get(name) || []).filter((x) => x.year >= from).sort((a, b) => a.year - b.year).map((x) => [x.year, +x.twh.toFixed(1)]);
  const worldLast = world[world.length - 1] || null;
  return {
    year,
    world_twh: worldLast ? +worldLast.twh.toFixed(1) : null,
    top: countries.slice(0, 25),
    per_capita: countries.filter((c) => c.per_capita_kwh != null && (c.pop_m || 0) >= 5).sort((a, b) => b.per_capita_kwh - a.per_capita_kwh).slice(0, 15),
    fastest: countries.filter((c) => c.growth_5y_pct != null && c.twh >= 50).sort((a, b) => b.growth_5y_pct - a.growth_5y_pct).slice(0, 10),
    race: { china: series('China'), us: series('United States'), india: series('India'), eu: series('European Union (27)') },
    count: countries.length,
  };
}

async function main(argv) {
  const offline = argv.includes('--offline'), force = argv.includes('--force');
  let prev = null;
  try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }
  if (offline || (!force && prev && Date.now() - Date.parse(prev.fetched_at) < 24 * 3600 * 1000)) { say(`fresh enough (${prev ? prev.fetched_at : 'none'})`); return; }
  try {
    const rows = parseCsv(await fetchText(SRC, { timeoutMs: 60000, retries: 1 }));
    const s = summarise(rows);
    if (!s.year || s.top.length < 20) throw new Error(`thin data: year ${s.year}, ${s.top.length} countries`);
    const doc = { schema: 1, fetched_at: new Date().toISOString(), source: 'Our World in Data energy dataset (Ember, Energy Institute), CC BY 4.0', source_url: 'https://github.com/owid/energy-data', ...s };
    writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
    say(`${s.year}: world ${s.world_twh} TWh · #1 ${s.top[0].name} ${s.top[0].twh} · #2 ${s.top[1].name} ${s.top[1].twh} · ${s.count} countries`);
  } catch (e) { console.log(`::warning title=power::${String(e.message).slice(0, 200)}; keeping the previous file`); }
}

if (process.argv[1] && process.argv[1].endsWith('power.mjs')) main(process.argv.slice(2));
