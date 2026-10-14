// THE NATIONS RACE: the US against China (and everyone else), built from
// data SIREN already collects. The prediction markets price which COMPANY
// will have the best AI model; mapping each company to its home country
// turns that into "which country". Electricity (Our World in Data) and the
// mapped data centres (OpenStreetMap) add the physical side.
//
// Pure functions; build.mjs feeds them data/race.json, data/power.json and
// the world data-centre file.

export const COMPANY_COUNTRY = {
  google: 'US', 'google deepmind': 'US', anthropic: 'US', openai: 'US', meta: 'US', 'meta ai': 'US', xai: 'US', spacexai: 'US',
  amazon: 'US', microsoft: 'US', nvidia: 'US', thinky: 'US', 'thinking machines': 'US', apple: 'US',
  alibaba: 'CN', 'alibaba qwen': 'CN', qwen: 'CN', moonshot: 'CN', 'moonshot ai': 'CN', deepseek: 'CN', 'z.ai': 'CN', zhipu: 'CN',
  baidu: 'CN', bytedance: 'CN', meituan: 'CN', minimax: 'CN', stepfun: 'CN', tencent: 'CN', xiaomi: 'CN',
  mistral: 'FR', cohere: 'CA', 'sakana': 'JP', 'lg': 'KR', naver: 'KR',
};
export const NATION = {
  US: { name: 'United States', short: 'USA', flag: '🇺🇸', c: '#60A5FA' },
  CN: { name: 'China', short: 'China', flag: '🇨🇳', c: '#F87171' },
  FR: { name: 'France', short: 'France', flag: '🇫🇷', c: '#A78BFA' },
  CA: { name: 'Canada', short: 'Canada', flag: '🇨🇦', c: '#FB923C' },
  JP: { name: 'Japan', short: 'Japan', flag: '🇯🇵', c: '#F472B6' },
  KR: { name: 'South Korea', short: 'Korea', flag: '🇰🇷', c: '#34D399' },
  XX: { name: 'Other / unknown', short: 'Other', flag: '🌐', c: '#94A3B8' },
};
const ISO3 = { USA: 'US', CHN: 'CN', IND: 'IN', RUS: 'RU', JPN: 'JP', BRA: 'BR', CAN: 'CA', KOR: 'KR', DEU: 'DE', FRA: 'FR', GBR: 'GB' };

export const countryOf = (company) => COMPANY_COUNTRY[String(company || '').toLowerCase().trim()] || 'XX';

/** A market's legs -> share by country (normalised over the live legs). */
export function marketByCountry(legs) {
  const out = {}; let sum = 0;
  for (const l of legs || []) {
    const p = Number(l.probability); if (!Number.isFinite(p) || p <= 0) continue;
    const k = countryOf(l.title); out[k] = (out[k] || 0) + p; sum += p;
  }
  if (sum > 0) for (const k of Object.keys(out)) out[k] = out[k] / sum;
  return out;
}

/** Non-exclusive market (Kalshi): the best single chance per country. */
export function bestByCountry(legs) {
  const out = {};
  for (const l of legs || []) {
    const p = Number(l.probability); if (!Number.isFinite(p)) continue;
    const k = countryOf(l.title); out[k] = Math.max(out[k] || 0, p);
  }
  return out;
}

export function labsByCountry(legs) {
  const out = {};
  for (const l of legs || []) { const k = countryOf(l.title); (out[k] = out[k] || []).push(l.title); }
  return out;
}

/** Everything the page needs. Missing inputs just drop their rows. */
export function nationsRace({ race, power, world } = {}) {
  const pm = race && race.markets && race.markets.polymarket;
  const ka = race && race.markets && race.markets.kalshi;
  const measures = [];
  if (pm && pm.ok && pm.horizon && pm.horizon.legs) {
    // Tip #397: measure H2s are question-shaped (mirrored in FAQ §3.3).
    const horizonWhen = pm.horizon.end_date ? new Date(pm.horizon.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'the horizon';
    measures.push({ id: 'odds-2026', label: `What are the odds the best AI model is theirs by ${horizonWhen}?`, kind: 'pct', by: marketByCountry(pm.horizon.legs), src: 'Polymarket', url: pm.horizon.url, scored: true });
  }
  if (pm && pm.ok && pm.spot && pm.spot.legs) {
    const spotWhen = pm.spot.end_date ? new Date(pm.spot.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'month end';
    measures.push({ id: 'odds-spot', label: `What are the odds the best AI model is theirs by ${spotWhen}?`, kind: 'pct', by: marketByCountry(pm.spot.legs), src: 'Polymarket', url: pm.spot.url, scored: true });
  }
  if (ka && ka.ok && ka.legs) {
    measures.push({ id: 'kalshi', label: 'What is each country’s best single-lab chance of a top-ranked model this year?', kind: 'pct', by: bestByCountry(ka.legs), src: 'Kalshi', url: ka.url, scored: true });
  }
  const legs = (pm && pm.spot && pm.spot.legs) || (pm && pm.horizon && pm.horizon.legs) || [];
  const labs = labsByCountry(legs);
  if (legs.length) {
    const by = {}; for (const k of Object.keys(labs)) by[k] = labs[k].length;
    measures.push({ id: 'labs', label: 'Which frontier labs are the markets pricing by country?', kind: 'count', by, src: 'Polymarket', url: pm.spot ? pm.spot.url : pm.horizon.url, scored: true, list: labs });
  }
  if (power && power.top) {
    const by = {}; for (const c of power.top) { const k = ISO3[c.iso]; if (k) by[k] = c.twh; }
    measures.push({ id: 'power', label: `How much electricity did each country generate in ${power.year} (TWh)?`, kind: 'twh', by, src: 'Our World in Data', url: 'https://github.com/owid/energy-data', scored: true });
  }
  if (world && world.countries) {
    const by = {}; for (const c of world.countries) if (c.iso2 && c.total) by[c.iso2] = c.total;
    measures.push({ id: 'dc', label: 'How many data centres does OpenStreetMap map by country?', kind: 'count', by, src: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', scored: false, note: 'OpenStreetMap is thinly mapped in China, so this badly undercounts Chinese sites. Shown for context, not scored.' });
  }
  let us = 0, cn = 0;
  for (const m of measures) {
    if (!m.scored) continue;
    const a = m.by.US || 0, b = m.by.CN || 0;
    m.leader = a > b ? 'US' : b > a ? 'CN' : null;
    if (m.leader === 'US') us++; else if (m.leader === 'CN') cn++;
  }
  const head = measures.find((m) => m.id === 'odds-2026') || measures.find((m) => m.id === 'odds-spot') || null;
  return { measures, score: { US: us, CN: cn }, head, labs };
}
