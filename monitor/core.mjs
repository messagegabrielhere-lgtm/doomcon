// World Monitor core: categories, country matching, story clustering and the
// stress formula. ONE copy, used twice:
//
//   monitor/collect.mjs imports it on the server, to build the snapshot and the
//   7-day stress history.
//   site/static/monitor.html gets it pasted in by site/build.mjs (the
//   <script data-inline="monitor/core.mjs"> tag), so the page scores the
//   live feeds with exactly the same rules the history was scored with.
//
// So: no imports, no Node or browser APIs, plain functions over plain data.

export const CORE_VERSION = 2;

/* News categories. `q` is the GDELT query; `re` classifies headlines from RSS
 * feeds, which arrive without a category. `w` is the stress weight. */
export const CATS = [
  { id: 'conflict', label: 'Military', color: '#e0453a', w: 3,
    q: '(military OR troops OR airstrike OR missile OR shelling OR "armed forces" OR warship OR "drone strike")',
    re: /\b(military|troops?|soldiers?|army|air ?strikes?|missiles?|shelling|warships?|navy|naval|offensive|front ?line|artillery|invasion|invade[sd]?|drone (strike|attack)s?|airstrikes?|strikes? (on|against)|bombard\w*|fighter jets?|shelled|war|warfare|fighting|clash(es|ed)?|frontline|ceasefire breach)\b/i },
  { id: 'security', label: 'Security', color: '#c2185b', w: 3,
    q: '(terrorist OR bombing OR gunmen OR hostage OR assassination OR insurgents)',
    re: /\b(terror\w*|bomb(ing|ings|er|ers)?|gunm[ae]n|hostages?|assassinat\w*|insurgen\w*|militants?|jihadists?|mass shooting|suicide attack|kidnapp\w*)\b/i },
  { id: 'nuclear', label: 'Nuclear', color: '#ab47bc', w: 2.5,
    q: '(nuclear OR uranium OR IAEA OR "enrichment" OR warhead)',
    re: /\b(nuclear|uranium|IAEA|enrichment|warheads?|ICBM)\b/i },
  { id: 'unrest', label: 'Unrest', color: '#f57c00', w: 2,
    q: '(protest OR protesters OR riot OR coup OR curfew OR "state of emergency")',
    re: /\b(protests?|protesters?|riots?|rioting|coup|curfew|state of emergency|demonstrators?|uprising|unrest|crackdown|martial law|general strike|workers'? strike|strike action|walkouts?)\b/i },
  { id: 'disaster', label: 'Disasters', color: '#ff7043', w: 2,
    q: '(earthquake OR flood OR wildfire OR hurricane OR typhoon OR cyclone OR landslide OR tsunami OR eruption)',
    re: /\b(earthquakes?|quakes?|floods?|flooding|wildfires?|bushfires?|hurricanes?|typhoons?|cyclones?|landslides?|mudslides?|tsunamis?|eruptions?|volcan\w*|tornado(es)?|storm surge|avalanche)\b/i },
  { id: 'cyber', label: 'Cyber', color: '#42a5f5', w: 1,
    q: '(cyberattack OR ransomware OR "data breach" OR hackers OR malware OR "zero-day")',
    re: /\b(cyber\w*|ransomware|data breach|breach(ed)?|hack(s|ers?|ed|ing)?|malware|zero-day|CVE-\d+|phishing|botnet|spyware|exploit(ed)?|vulnerabilit\w*)\b/i },
  { id: 'health', label: 'Health', color: '#26a69a', w: 1.5,
    q: '(outbreak OR epidemic OR pandemic OR cholera OR "bird flu" OR ebola OR mpox OR measles)',
    re: /\b(outbreaks?|epidemic|pandemic|cholera|bird flu|H5N1|ebola|mpox|measles|dengue|marburg|polio|virus|infections?)\b/i },
  { id: 'shipping', label: 'Shipping', color: '#00acc1', w: 1,
    q: '("container ship" OR tanker OR "shipping lane" OR "Red Sea" OR "Strait of Hormuz" OR "Suez Canal" OR "supply chain")',
    re: /\b(container ships?|tankers?|shipping|freighters?|bulk carriers?|vessels?|Red Sea|Hormuz|Suez|Panama Canal|supply chains?|maritime|seafarers?)\b/i },
  { id: 'energy', label: 'Energy', color: '#d4a017', w: 1,
    q: '(OPEC OR "oil prices" OR "natural gas" OR pipeline OR refinery OR blackout OR "power outage")',
    re: /\b(OPEC\+?|oil prices?|crude|natural gas|LNG|pipelines?|refiner(y|ies)|blackouts?|power outages?|power grid|electricity)\b/i },
  { id: 'economy', label: 'Economy', color: '#2e9e6b', w: 1,
    q: '(inflation OR recession OR "central bank" OR tariff OR "interest rates" OR "debt default")',
    re: /\b(inflation|recession|central bank|tariffs?|interest rates?|default(s|ed)?|GDP|unemployment|stock markets?|bond yields?|currency|devaluation|trade war|economy|economic)\b/i },
  { id: 'migration', label: 'Humanitarian', color: '#8d6e63', w: 1.5,
    q: '(refugees OR migrants OR famine OR "humanitarian aid" OR displaced)',
    re: /\b(refugees?|migrants?|asylum|famine|starvation|humanitarian|displaced|aid convoy|food insecurity)\b/i },
  { id: 'diplomacy', label: 'Diplomacy', color: '#5c6bc0', w: 0.5,
    q: '(sanctions OR summit OR ceasefire OR treaty OR "foreign minister" OR embassy)',
    re: /\b(sanctions?|summit|ceasefire|truce|treaty|foreign ministers?|embass(y|ies)|diplomat\w*|peace talks|negotiat\w*|envoy|bilateral)\b/i },
  { id: 'climate', label: 'Climate', color: '#7cb342', w: 0.5,
    q: '(heatwave OR drought OR "climate change" OR "extreme heat" OR emissions)',
    re: /\b(heat ?waves?|droughts?|climate|emissions|extreme heat|glaciers?|record temperatures?)\b/i },
  { id: 'space', label: 'Space', color: '#90a4ae', w: 0.3,
    q: '(satellite OR "rocket launch" OR spacecraft OR "space station")',
    re: /\b(satellites?|rockets?|spacecraft|space station|orbit(al)?|NASA|SpaceX|lunar|moon landing)\b/i },
  { id: 'ai', label: 'AI', color: '#f0b44c', w: 0.3, siren: true,
    re: /\b(artificial intelligence|AI|OpenAI|Anthropic|chatbots?|LLMs?|GPT-\d|Gemini|deepfakes?)\b/ },
  { id: 'world', label: 'World', color: '#78909c', w: 0.4, re: null },
];
export const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));

/** First category whose pattern matches, in CATS order; `fallback` otherwise. */
export function categorize(text, fallback = 'world') {
  for (const c of CATS) if (c.re && c.re.test(text)) return c.id;
  return fallback;
}

/* Country names. Outline names plus aliases, demonyms, capitals and leaders.
 * Georgia, Jordan and Chad mean other things too often to match on the bare
 * name, so only forms that cannot mean anything else count for them. */
export const ALIAS = {
  US: ['United States', 'U.S.', 'US', 'USA', 'America', 'American', 'Americans', 'Washington', 'Pentagon', 'White House'],
  GB: ['Britain', 'British', 'UK', 'U.K.', 'England', 'Scotland', 'Wales', 'London', 'Downing Street'],
  RU: ['Russia', 'Russian', 'Russians', 'Moscow', 'Kremlin', 'Putin'],
  UA: ['Ukraine', 'Ukrainian', 'Ukrainians', 'Kyiv', 'Kiev', 'Kharkiv', 'Odesa', 'Zelensky', 'Zelenskyy'],
  CN: ['China', 'Chinese', 'Beijing', 'Xi Jinping', 'Shanghai', 'Shenzhen', 'PLA'],
  TW: ['Taiwan', 'Taiwanese', 'Taipei'],
  JP: ['Japan', 'Japanese', 'Tokyo'], KR: ['South Korea', 'South Korean', 'Seoul'], KP: ['North Korea', 'North Korean', 'Pyongyang', 'Kim Jong Un'],
  IN: ['India', 'Indian', 'New Delhi', 'Delhi', 'Mumbai', 'Modi'], PK: ['Pakistan', 'Pakistani', 'Islamabad', 'Karachi', 'Lahore'],
  IR: ['Iran', 'Iranian', 'Tehran', 'IRGC'], IQ: ['Iraq', 'Iraqi', 'Baghdad'], SY: ['Syria', 'Syrian', 'Damascus', 'Aleppo'],
  IL: ['Israel', 'Israeli', 'Israelis', 'Tel Aviv', 'Jerusalem', 'Netanyahu', 'IDF'], PS: ['Gaza', 'Palestinian', 'Palestinians', 'West Bank', 'Hamas', 'Palestine'],
  LB: ['Lebanon', 'Lebanese', 'Beirut', 'Hezbollah'], JO: ['Jordanian', 'Amman'], YE: ['Yemen', 'Yemeni', 'Houthi', 'Houthis', 'Sanaa'],
  SA: ['Saudi', 'Saudi Arabia', 'Riyadh'], AE: ['UAE', 'Emirati', 'Dubai', 'Abu Dhabi', 'United Arab Emirates'], QA: ['Qatar', 'Qatari', 'Doha'],
  TR: ['Turkey', 'Türkiye', 'Turkish', 'Ankara', 'Istanbul', 'Erdogan'], EG: ['Egypt', 'Egyptian', 'Cairo'],
  DE: ['Germany', 'German', 'Berlin'], FR: ['France', 'French', 'Paris', 'Macron'], IT: ['Italy', 'Italian', 'Rome'], ES: ['Spain', 'Spanish', 'Madrid'],
  PL: ['Poland', 'Polish', 'Warsaw'], NL: ['Netherlands', 'Dutch', 'Amsterdam'], BE: ['Belgium', 'Belgian', 'Brussels'], CH: ['Switzerland', 'Swiss', 'Geneva', 'Zurich'],
  SE: ['Sweden', 'Swedish', 'Stockholm'], NO: ['Norway', 'Norwegian', 'Oslo'], FI: ['Finland', 'Finnish', 'Helsinki'], DK: ['Denmark', 'Danish', 'Copenhagen', 'Greenland'],
  GR: ['Greece', 'Greek', 'Athens'], PT: ['Portugal', 'Portuguese', 'Lisbon'], AT: ['Austria', 'Austrian', 'Vienna'], HU: ['Hungary', 'Hungarian', 'Budapest', 'Orban'],
  RO: ['Romania', 'Romanian', 'Bucharest'], RS: ['Serbia', 'Serbian', 'Belgrade'], BY: ['Belarus', 'Belarusian', 'Minsk', 'Lukashenko'], MD: ['Moldova', 'Moldovan', 'Chisinau'],
  GE: ['Tbilisi', 'Georgian Dream'], AM: ['Armenia', 'Armenian', 'Yerevan'], AZ: ['Azerbaijan', 'Azerbaijani', 'Baku'],
  IE: ['Ireland', 'Irish', 'Dublin'], CA: ['Canada', 'Canadian', 'Ottawa', 'Toronto'], MX: ['Mexico', 'Mexican', 'Mexico City'],
  BR: ['Brazil', 'Brazilian', 'Brasilia', 'Sao Paulo', 'Lula'], AR: ['Argentina', 'Argentine', 'Buenos Aires', 'Milei'], CL: ['Chile', 'Chilean', 'Santiago'],
  CO: ['Colombia', 'Colombian', 'Bogota'], VE: ['Venezuela', 'Venezuelan', 'Caracas', 'Maduro'], PE: ['Peru', 'Peruvian', 'Lima'], EC: ['Ecuador', 'Ecuadorian', 'Quito'],
  CU: ['Cuba', 'Cuban', 'Havana'], HT: ['Haiti', 'Haitian', 'Port-au-Prince'], PA: ['Panama', 'Panamanian', 'Panama Canal'],
  NG: ['Nigeria', 'Nigerian', 'Abuja', 'Lagos'], ZA: ['South Africa', 'South African', 'Johannesburg', 'Pretoria', 'Cape Town'], KE: ['Kenya', 'Kenyan', 'Nairobi'],
  ET: ['Ethiopia', 'Ethiopian', 'Addis Ababa'], SD: ['Sudan', 'Sudanese', 'Khartoum', 'RSF', 'Darfur'], SS: ['South Sudan', 'Juba'], SO: ['Somalia', 'Somali', 'Mogadishu', 'al-Shabaab'],
  LY: ['Libya', 'Libyan', 'Tripoli'], ML: ['Mali', 'Malian', 'Bamako'], NE: ['Niger', 'Nigerien', 'Niamey'], BF: ['Burkina Faso', 'Ouagadougou'], TD: ['Chadian', "N'Djamena"],
  CD: ['Congo', 'DRC', 'DR Congo', 'Kinshasa', 'Goma', 'M23'], MA: ['Morocco', 'Moroccan', 'Rabat'], DZ: ['Algeria', 'Algerian', 'Algiers'], TN: ['Tunisia', 'Tunisian', 'Tunis'],
  AF: ['Afghanistan', 'Afghan', 'Kabul', 'Taliban'], BD: ['Bangladesh', 'Bangladeshi', 'Dhaka'], MM: ['Myanmar', 'Burma', 'Burmese', 'Yangon', 'Naypyitaw'],
  TH: ['Thailand', 'Thai', 'Bangkok'], VN: ['Vietnam', 'Vietnamese', 'Hanoi'], PH: ['Philippines', 'Philippine', 'Filipino', 'Manila'], ID: ['Indonesia', 'Indonesian', 'Jakarta'],
  MY: ['Malaysia', 'Malaysian', 'Kuala Lumpur'], AU: ['Australia', 'Australian', 'Canberra', 'Sydney', 'Melbourne'], NZ: ['New Zealand', 'Wellington', 'Auckland'],
  KZ: ['Kazakhstan', 'Astana'], LK: ['Sri Lanka', 'Colombo'], NP: ['Nepal', 'Kathmandu'],
  SG: ['Singapore', 'Singaporean'], HK: ['Hong Kong'], BH: ['Bahrain', 'Bahraini'], MT: ['Malta', 'Maltese'],
};
export const POINT_COUNTRIES = [
  { iso2: 'SG', name: 'Singapore', lat: 1.35, lon: 103.82 },
  { iso2: 'HK', name: 'Hong Kong', lat: 22.32, lon: 114.17 },
  { iso2: 'BH', name: 'Bahrain', lat: 26.07, lon: 50.55 },
  { iso2: 'MT', name: 'Malta', lat: 35.94, lon: 14.38 },
];
export const SKIP_NAME = new Set(['GE', 'JO', 'TD']);
export const NAME_FIX = { US: 'United States', TZ: 'Tanzania', RS: 'Serbia', CD: 'DR Congo', CG: 'Congo-Brazzaville', SZ: 'Eswatini', BS: 'Bahamas', TL: 'Timor-Leste' };
/* Hand-placed label points where the largest polygon's centroid is a poor spot. */
const LABEL_FIX = { US: [-98.5, 39.5], FR: [2.4, 46.6], NO: [9, 61.5], RU: [60, 58], CA: [-100, 57], IL: [34.9, 31.4], CL: [-71, -33], AQ: [0, -80] };

/* US-listed country ETFs: one fund stands in for each national market. */
export const ETF = {
  SPY: 'US', EWJ: 'JP', EWG: 'DE', EWU: 'GB', EWQ: 'FR', EWI: 'IT', EWP: 'ES', EWL: 'CH', EWN: 'NL', EWD: 'SE', EPOL: 'PL', GREK: 'GR',
  EWC: 'CA', EWW: 'MX', EWZ: 'BR', ECH: 'CL', ARGT: 'AR', FXI: 'CN', EWH: 'HK', EWT: 'TW', EWY: 'KR', INDA: 'IN', EWA: 'AU', EWS: 'SG',
  EIDO: 'ID', EWM: 'MY', THD: 'TH', EPHE: 'PH', VNM: 'VN', TUR: 'TR', EIS: 'IL', KSA: 'SA', UAE: 'AE', QAT: 'QA', EZA: 'ZA',
};

/* ---------------------------------------------------------------- geometry */

const D2R = Math.PI / 180;
export function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; }
export function ringCentroid(r) {
  let x = 0, y = 0, a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f; a += f;
  }
  return a ? [x / (3 * a), y / (3 * a)] : r[0];
}
export function inRing(lon, lat, r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
export function gcDist(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)))) * 6371;
}

/** data/world-outline.json -> country records with bbox, label point and size. */
export function prepCountries(outline) {
  const out = [];
  for (const c of outline.countries) {
    if (!c.iso2) continue;
    let big = c.rings[0], ba = 0;
    const bbox = [180, 90, -180, -90];
    for (const r of c.rings) {
      const a = Math.abs(ringArea(r));
      if (a > ba) { ba = a; big = r; }
      for (const [x, y] of r) { if (x < bbox[0]) bbox[0] = x; if (y < bbox[1]) bbox[1] = y; if (x > bbox[2]) bbox[2] = x; if (y > bbox[3]) bbox[3] = y; }
    }
    let [lon, lat] = ringCentroid(big);
    if (LABEL_FIX[c.iso2]) [lon, lat] = LABEL_FIX[c.iso2];
    out.push({ iso2: c.iso2, name: NAME_FIX[c.iso2] || c.name, raw: c.name, rings: c.rings, bbox, lon, lat, span: Math.sqrt(ba) });
  }
  for (const p of POINT_COUNTRIES) {
    if (!out.some((k) => k.iso2 === p.iso2)) out.push({ ...p, raw: p.name, rings: null, bbox: [p.lon - 0.5, p.lat - 0.5, p.lon + 0.5, p.lat + 0.5], span: 0.5 });
  }
  return out;
}
export function countryAt(countries, lon, lat) {
  for (const c of countries) {
    if (!c.rings) continue;
    const b = c.bbox;
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    let ins = false;
    for (const r of c.rings) if (inRing(lon, lat, r)) ins = !ins;
    if (ins) return c;
  }
  return null;
}
/** Inside a polygon, else the nearest label point within reach (offshore quakes, storms at sea). */
export function countryNear(countries, lon, lat) {
  const c = countryAt(countries, lon, lat);
  if (c) return c;
  let best = null, bd = 600;
  for (const k of countries) {
    const b = k.bbox;
    if (lat < b[1] - 6 || lat > b[3] + 6) continue;
    const d = gcDist(lat, lon, k.lat, k.lon);
    if (d < Math.min(600, 250 + (k.span || 0) * 40) && d < bd) { bd = d; best = k; }
  }
  return best;
}

/* ------------------------------------------------------- country matching */

/** Returns countriesIn(title) -> up to four ISO2 codes, longest name first, each match masked. */
export function makeMatcher(countries) {
  const terms = [];
  for (const c of countries) {
    const names = new Set(ALIAS[c.iso2] || []);
    if (!SKIP_NAME.has(c.iso2)) { names.add(c.name); if (c.raw) names.add(c.raw); }
    for (const n of names) if (n) terms.push([n, c.iso2]);
  }
  terms.sort((a, b) => b[0].length - a[0].length);
  // Short all-caps forms (US, UK, UAE, DRC) match case-exactly; the rest case-insensitively at word boundaries.
  const ms = terms.map(([n, iso]) => {
    const e = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = n.length <= 4 && n === n.toUpperCase();
    return { iso, re: new RegExp(`(^|[^\\p{L}\\p{N}])${e}(?=$|[^\\p{L}\\p{N}])`, exact ? 'u' : 'iu') };
  });
  return function countriesIn(title) {
    let t = ` ${title} `;
    const out = [];
    for (const m of ms) {
      const hit = m.re.exec(t);
      if (!hit) continue;
      if (!out.includes(m.iso)) out.push(m.iso);
      // mask, so "South Sudan" does not also count as "Sudan"
      t = t.slice(0, hit.index) + ' '.repeat(hit[0].length) + t.slice(hit.index + hit[0].length);
    }
    return out.slice(0, 4);
  };
}

/* ------------------------------------------------------- story clustering */

const STOP = new Set(('the a an and or of to in on for with at by from as is are was were be been after over amid into new says say said will its it his her their this that than more up out not no but has have had who what why how us u.s. news live update updates report reports '
  + 'about against after before could would should may might can just now first last over under year years day days week weeks time two three one people').split(' '));
export function tokens(title) {
  return [...new Set(String(title).toLowerCase().replace(/['’]s\b/g, '').replace(/[^\p{L}\p{N}\- ]/gu, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, '')))];
}
const domainOf = (it) => (it.src || '').replace(/^www\./, '');

/**
 * Group items that report the same event. Two headlines join when they share
 * at least 45% of their significant words (Jaccard), or four words and 35%,
 * within 36 hours of each other. Items are {id,title,url,src,cat,t,iso}.
 * Returns stories, newest first: {id, title, url, src, cat, t, first, iso, items, sources}.
 */
export function clusterStories(items) {
  const sorted = [...items].sort((a, b) => b.t - a.t);
  const stories = [];
  const index = new Map(); // token -> story indices
  for (const it of sorted) {
    // countries count as words, so "Russia" and "Russian" agree
    const tk = it._tk || (it._tk = [...tokens(it.title), ...(it.iso || []).map((i) => '#' + i)]);
    const cand = new Map();
    for (const w of tk) for (const si of index.get(w) || []) cand.set(si, (cand.get(si) || 0) + 1);
    let best = -1, bs = 0;
    for (const [si, shared] of cand) {
      const s = stories[si];
      if (Math.abs(s.t - it.t) > 36 * 3600e3 && Math.abs(s.first - it.t) > 36 * 3600e3) continue;
      const j = shared / (tk.length + s.tk.size - shared);
      if ((j >= 0.45 || (shared >= 4 && j >= 0.35)) && j > bs) { bs = j; best = si; }
    }
    if (best < 0) {
      const s = { id: it.id, title: it.title, url: it.url, src: it.src, cat: it.cat, t: it.t, first: it.t, iso: [...(it.iso || [])], items: [it], tk: new Set(tk) };
      stories.push(s);
      for (const w of tk) { const l = index.get(w) || []; l.push(stories.length - 1); index.set(w, l); }
    } else {
      const s = stories[best];
      s.items.push(it);
      s.first = Math.min(s.first, it.t);
      for (const i of it.iso || []) if (!s.iso.includes(i)) s.iso.push(i);
      // a specific category beats "world", and higher-weight categories win ties
      if (s.cat === 'world' || (it.cat !== 'world' && (CAT[it.cat]?.w || 0) > (CAT[s.cat]?.w || 0))) s.cat = it.cat;
    }
  }
  for (const s of stories) { s.sources = new Set(s.items.map(domainOf)).size; s.iso = s.iso.slice(0, 4); delete s.tk; }
  return stories;
}

/* ---------------------------------------------------------- stress index */

export const EONET_WEIGHT = { volcanoes: 30, severeStorms: 40, floods: 25, wildfires: 6, landslides: 15, tempExtremes: 10, drought: 8 };
export const STRESS_WINDOW_MS = 24 * 3600e3;

/**
 * Per-country inputs from stories and hazards. A story counts once however many
 * outlets carry it, plus a quarter for each extra outlet, up to double.
 */
export function countryInputs({ stories = [], quakes = [], gdacs = [], eonet = [], now = Date.now() }) {
  const w = new Map(), hz = new Map(), why = new Map();
  for (const s of stories) {
    if (now - s.t > STRESS_WINDOW_MS || !s.iso.length) continue;
    const cw = (CAT[s.cat]?.w ?? 0.4) * Math.min(2, 1 + 0.25 * ((s.sources || 1) - 1));
    for (const iso of s.iso) w.set(iso, (w.get(iso) || 0) + cw / Math.sqrt(s.iso.length));
  }
  const addH = (iso, v, label) => { if (!iso) return; hz.set(iso, (hz.get(iso) || 0) + v); const l = why.get(iso) || []; l.push(label); why.set(iso, l); };
  for (const q of quakes) addH(q.iso, 10 ** (1.5 * (q.mag - 4.5)) * (q.tsunami ? 2 : 1), `M${q.mag.toFixed(1)} ${q.place}`);
  for (const g of gdacs) addH(g.iso, g.level === 'Red' ? 400 : g.level === 'Orange' ? 120 : 8, `GDACS ${g.level} ${g.type}: ${g.title || ''}`.trim());
  for (const e of eonet) addH(e.iso, EONET_WEIGHT[e.cat] ?? 5, e.title);
  return { w, hz, why };
}
export const newsPart = (w) => Math.max(0, Math.min(100, 25 * Math.log2(1 + (w || 0))));
export const hazardPart = (h) => Math.max(0, Math.min(100, 22 * Math.log10(1 + (h || 0))));
/** Market part from a country ETF: 5-day drawdown plus volatility above its own year. */
export const marketPart = (s) => s ? Math.max(0, Math.min(100, 8 * Math.max(0, -s.d5 * 100) + 14 * Math.max(0, s.volZ))) : null;
/** Composite. Market is optional and the weights re-normalise without it. */
export function stressScore(N, H, M) {
  return M == null ? (0.55 * N + 0.3 * H) / 0.85 : 0.55 * N + 0.3 * H + 0.15 * M;
}
