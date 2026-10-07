// Big investors: what well-known investors and politicians have disclosed
// buying and selling, from the public filings themselves. No keys.
//
//   - Fund managers: SEC Form 13F-HR (EDGAR). Quarterly holdings of US-listed
//     stocks, filed up to 45 days after each quarter ends. The latest filing
//     against the one before gives new positions, adds, trims and exits.
//   - Cathie Wood / ARK: ARK publishes every ETF's holdings each day. The
//     change from the last snapshot, net of the fund growing or shrinking as
//     shares are created or redeemed, estimates the day's trades.
//   - Members of Congress: House Periodic Transaction Reports (STOCK Act), from
//     the Clerk's index and the report PDFs. Filed up to 45 days after a trade,
//     amounts as ranges. Senate reports sit behind a search form and are not
//     included.
//   - Donald Trump: his OGE 278-T reports are published as scanned images, which
//     this can't read. The page says so and links the official source.
//
// Everything is a disclosure, after the fact. Nothing here is real time.
//
//   node investors/collect.mjs --dir <state dir>
// Reads and writes <dir>/state.json (cache of snapshots and parsed reports) and
// writes <dir>/investors.json (what the page reads).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// SEC asks automated clients to identify themselves. SEC_UA overrides this.
const SEC_UA = process.env.SEC_UA || 'doomcon-investors/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
const UA = 'Mozilla/5.0 (compatible; doomcon-investors/1.0; +https://github.com/messagegabrielhere-lgtm/doomcon)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const FUNDS = [
  { id: 'burry', person: 'Michael Burry', fund: 'Scion Asset Management', cik: '0001649339', note: 'The Big Short investor.' },
  { id: 'buffett', person: 'Warren Buffett', fund: 'Berkshire Hathaway', cik: '0001067983', note: 'Berkshire\'s own stock portfolio.' },
  { id: 'wood', person: 'Cathie Wood', fund: 'ARK Investment Management', cik: '0001697748', note: 'Daily ETF trades are below.' },
  { id: 'ackman', person: 'Bill Ackman', fund: 'Pershing Square', cik: '0001336528', note: 'A concentrated book of a few large positions.' },
  { id: 'druckenmiller', person: 'Stanley Druckenmiller', fund: 'Duquesne Family Office', cik: '0001536411', note: 'His family office.' },
  { id: 'tepper', person: 'David Tepper', fund: 'Appaloosa', cik: '0001656456', note: '' },
  { id: 'dalio', person: 'Ray Dalio (founder)', fund: 'Bridgewater Associates', cik: '0001350694', note: 'Dalio founded the firm and has since stepped back; the firm decides.' },
];

export const ARK_FUNDS = [
  ['ARKK', 'ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv'],
  ['ARKW', 'ARK_NEXT_GENERATION_INTERNET_ETF_ARKW_HOLDINGS.csv'],
  ['ARKG', 'ARK_GENOMIC_REVOLUTION_ETF_ARKG_HOLDINGS.csv'],
  ['ARKQ', 'ARK_AUTONOMOUS_TECH._&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv'],
  ['ARKF', 'ARK_BLOCKCHAIN_&_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv'],
  ['ARKX', 'ARK_SPACE_EXPLORATION_&_INNOVATION_ETF_ARKX_HOLDINGS.csv'],
];
const ARK_BASE = 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/';

// Members shown on their own, beyond the latest trades from everyone.
export const FEATURED_MEMBERS = [{ id: 'pelosi', name: 'Nancy Pelosi', match: /pelosi/i }];
const HOUSE = 'https://disclosures-clerk.house.gov/public_disc';
const CONGRESS_DAYS = 60;      // reports filed in the last 60 days
const MAX_NEW_PDFS = 60;       // new reports parsed per run; the rest wait for the next run

// A few CUSIPs that 13F filers hold most, so the common names show a ticker.
// ARK's daily files add many more on every run (state.cusips).
const CUSIPS = {
  '037833100': 'AAPL', '594918104': 'MSFT', '67066G104': 'NVDA', '023135106': 'AMZN', '02079K305': 'GOOGL', '02079K107': 'GOOG',
  '30303M102': 'META', '88160R101': 'TSLA', '060505104': 'BAC', '025816109': 'AXP', '191216100': 'KO', '166764100': 'CVX',
  '674599105': 'OXY', '500754106': 'KHC', '615369105': 'MCO', 'H1467J104': 'CB', '23918K108': 'DVA', '501044101': 'KR',
  '92343E102': 'VRSN', '78462F103': 'SPY', '46090E103': 'QQQ', '90353T100': 'UBER', '169656105': 'CMG', '43300A203': 'HLT',
};

// ---------------------------------------------------------------- utilities

async function get(url, { as = 'text', ua = UA, tries = 2 } = {}) {
  let err;
  for (let k = 0; k < tries; k++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': ua, Accept: '*/*' }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return as === 'json' ? await r.json() : as === 'bytes' ? new Uint8Array(await r.arrayBuffer()) : await r.text();
    } catch (e) { err = e; await sleep(800 * (k + 1)); }
  }
  throw new Error(`${url}: ${err.message}`);
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").trim();
const num = (s) => { const x = Number(String(s ?? '').replace(/[$,%\s]/g, '')); return Number.isFinite(x) ? x : 0; };
const usDate = (s) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim()); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };
const daysAgo = (iso, now = Date.now()) => (now - Date.parse(iso)) / 86400e3;

// ---------------------------------------------------------------- 13F

// The <infoTable> rows of a 13F information table, any namespace prefix.
export function parseInfoTable(xml) {
  const tag = (chunk, name) => { const m = new RegExp(`<(?:[\\w-]+:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, 'i').exec(chunk); return m ? decode(m[1]) : ''; };
  const rows = [];
  const re = /<(?:[\w-]+:)?infoTable\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?infoTable>/gi;
  for (let m; (m = re.exec(xml));) {
    const c = m[1];
    rows.push({
      name: tag(c, 'nameOfIssuer'), cls: tag(c, 'titleOfClass'), cusip: tag(c, 'cusip').toUpperCase(),
      value: num(tag(c, 'value')), shares: num(tag(c, 'sshPrnamt')), unit: tag(c, 'sshPrnamtType'), putCall: tag(c, 'putCall'),
    });
  }
  return rows;
}

// One line per security (a filer lists a stock once per manager or account).
export function aggregate(rows, cusips = {}) {
  const by = new Map();
  for (const r of rows) {
    const k = `${r.cusip}|${r.putCall || ''}`;
    const x = by.get(k) || { key: k, name: r.name, cls: r.cls, cusip: r.cusip, putCall: r.putCall || '', ticker: cusips[r.cusip] || CUSIPS[r.cusip] || '', value: 0, shares: 0 };
    x.value += r.value; x.shares += r.shares;
    by.set(k, x);
  }
  return [...by.values()].sort((a, b) => b.value - a.value);
}

// Quarter over quarter: new, exits, adds and trims, sized by the shares
// bought or sold at this quarter's price (so a price move alone isn't a trade).
export function compare(cur, prev, { minSharePct = 2 } = {}) {
  const P = new Map(prev.map((x) => [x.key, x])), C = new Map(cur.map((x) => [x.key, x]));
  const out = [];
  for (const x of cur) {
    const p = P.get(x.key), px = x.shares ? x.value / x.shares : 0;
    if (!p) { out.push({ kind: 'new', ...pick(x), dShares: x.shares, dValue: x.value }); continue; }
    const d = x.shares - p.shares, pct = p.shares ? d / p.shares * 100 : 0;
    if (Math.abs(pct) >= minSharePct) out.push({ kind: d > 0 ? 'add' : 'trim', ...pick(x), dShares: d, pct, dValue: d * px });
  }
  for (const p of prev) if (!C.has(p.key)) out.push({ kind: 'exit', ...pick(p), value: 0, shares: 0, dShares: -p.shares, dValue: -p.value });
  return out.sort((a, b) => Math.abs(b.dValue) - Math.abs(a.dValue));
}
const pick = (x) => ({ name: x.name, cls: x.cls, cusip: x.cusip, ticker: x.ticker, putCall: x.putCall, value: x.value, shares: x.shares });

// The two most recent original 13F-HR filings for different quarters.
export function latestTwo(sub) {
  const f = sub?.filings?.recent || {};
  const all = (f.form || []).map((form, i) => ({ form, acc: f.accessionNumber[i], filed: f.filingDate[i], period: f.reportDate[i] }))
    .filter((x) => x.form === '13F-HR' && x.period)
    .sort((a, b) => b.filed.localeCompare(a.filed));
  const out = [];
  for (const x of all) { if (!out.some((y) => y.period === x.period)) out.push(x); if (out.length === 2) break; }
  return out;
}

async function infoTableFor(cik, acc) {
  const dir = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc.replace(/-/g, '')}`;
  const idx = await get(`${dir}/index.json`, { as: 'json', ua: SEC_UA });
  const xmls = (idx?.directory?.item || []).filter((i) => /\.xml$/i.test(i.name) && !/primary_doc/i.test(i.name));
  const best = xmls.find((i) => /info/i.test(i.name)) || xmls.sort((a, b) => num(b.size) - num(a.size))[0];
  if (!best) throw new Error(`no information table in ${acc}`);
  await sleep(150);
  return { rows: parseInfoTable(await get(`${dir}/${best.name}`, { ua: SEC_UA })), url: `${dir}/${best.name}` };
}

export async function fund13f(f, cusips, log) {
  const sub = await get(`https://data.sec.gov/submissions/CIK${f.cik}.json`, { as: 'json', ua: SEC_UA });
  const [cur, prev] = latestTwo(sub);
  if (!cur) throw new Error('no 13F-HR filings');
  await sleep(150);
  const a = await infoTableFor(f.cik, cur.acc);
  const holdings = aggregate(a.rows, cusips);
  let changes = [];
  if (prev) { await sleep(150); changes = compare(holdings, aggregate((await infoTableFor(f.cik, prev.acc)).rows, cusips)); }
  const total = holdings.reduce((s, x) => s + x.value, 0);
  log(`13F ${f.id}: ${cur.period}, ${holdings.length} positions, ${changes.length} changes`);
  return {
    ...f, name: sub.name, period: cur.period, filed: cur.filed, prevPeriod: prev?.period || null,
    stale: daysAgo(cur.period) > 200, total, count: holdings.length,
    top: holdings.slice(0, 15).map((x) => ({ ...pick(x), pct: total ? x.value / total * 100 : 0 })),
    changes: changes.slice(0, 14),
    counts: { new: changes.filter((c) => c.kind === 'new').length, add: changes.filter((c) => c.kind === 'add').length, trim: changes.filter((c) => c.kind === 'trim').length, exit: changes.filter((c) => c.kind === 'exit').length },
    url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik}&type=13F-HR`,
    source: a.url,
  };
}

// ---------------------------------------------------------------- ARK

export function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch;
    }
    cells.push(cur); rows.push(cells);
  }
  return rows;
}

// One fund's daily file -> { date, rows: { ticker: {...} } }. Lines without a
// ticker (cash, money-market funds, private holdings, warrants) are left out.
export function parseArk(text) {
  const [head, ...rest] = parseCsv(text);
  const ix = (k) => head.findIndex((h) => h.toLowerCase().startsWith(k));
  const iDate = ix('date'), iCo = ix('company'), iTk = ix('ticker'), iCu = ix('cusip'), iSh = ix('shares'), iMv = ix('market value'), iW = ix('weight');
  let date = null; const rows = {};
  for (const r of rest) {
    const d = usDate(r[iDate] || ''); if (!d) continue;
    date = date && date > d ? date : d;
    const ticker = (r[iTk] || '').trim().split(/[\s/]/)[0];
    if (!ticker) continue;
    const x = rows[ticker] || { ticker, company: r[iCo], cusip: r[iCu], shares: 0, value: 0, weight: 0 };
    x.shares += num(r[iSh]); x.value += num(r[iMv]); x.weight += num(r[iW]);
    rows[ticker] = x;
  }
  return { date, rows };
}

// Estimated trades between two daily snapshots of one fund. Creations and
// redemptions scale every position by the same factor, so each position is
// compared with its old size times the median change across the fund.
export function arkTrades(fund, prev, cur, { minPct = 1, minUsd = 250e3 } = {}) {
  if (!prev?.date || !cur?.date || cur.date <= prev.date) return [];
  const both = Object.keys(cur.rows).filter((k) => prev.rows[k]?.shares > 0 && cur.rows[k].shares > 0);
  const ratios = both.map((k) => cur.rows[k].shares / prev.rows[k].shares).sort((a, b) => a - b);
  const m = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1;
  const out = [];
  for (const [k, x] of Object.entries(cur.rows)) {
    const p = prev.rows[k], price = x.shares ? x.value / x.shares : 0;
    if (!p) { if (x.value >= minUsd) out.push({ date: cur.date, fund, ticker: k, company: x.company, kind: 'new', dShares: x.shares, usd: x.value, weight: x.weight }); continue; }
    const want = p.shares * m, d = x.shares - want;
    if (Math.abs(d) / want * 100 >= minPct && Math.abs(d * price) >= minUsd) out.push({ date: cur.date, fund, ticker: k, company: x.company, kind: d > 0 ? 'buy' : 'sell', dShares: Math.round(d), usd: Math.round(d * price), weight: x.weight });
  }
  for (const [k, p] of Object.entries(prev.rows)) {
    if (!cur.rows[k] && p.value >= minUsd) out.push({ date: cur.date, fund, ticker: k, company: p.company, kind: 'exit', dShares: -p.shares, usd: -p.value, weight: 0 });
  }
  return out.sort((a, b) => Math.abs(b.usd) - Math.abs(a.usd));
}

// ---------------------------------------------------------------- House PTRs

// The Clerk's yearly index: one <Member> per filing.
export function parseHouseIndex(xml) {
  const out = [];
  const tag = (c, n) => { const m = new RegExp(`<${n}>([\\s\\S]*?)</${n}>`).exec(c); return m ? decode(m[1]) : ''; };
  for (const m of xml.matchAll(/<Member>([\s\S]*?)<\/Member>/g)) {
    const c = m[1];
    const name = [tag(c, 'First'), tag(c, 'Last'), tag(c, 'Suffix')].filter(Boolean).join(' ');
    out.push({ docId: tag(c, 'DocID'), type: tag(c, 'FilingType'), name, prefix: tag(c, 'Prefix'), state: tag(c, 'StateDst'), year: tag(c, 'Year'), filed: usDate(tag(c, 'FilingDate')) });
  }
  return out;
}

// Text lines of a PDF, top to bottom, from pdf.js's text layer.
export async function pdfLines(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) < 2.5);
      if (!row) rows.push(row = { y, items: [] });
      row.items.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) lines.push(r.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim());
    lines.push('');
  }
  await doc.destroy();
  return lines;
}

const TX = String.raw`(P|S \(partial\)|S|E)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\$[\d,]+(?:\.\d+)?)`;
const LABEL = /^(?:F\S*\s+S\S*|D\S*|S\S*\s+O\S*|C\S*|L\S*)\s?:/;

// The transactions in a PTR's text. Works on lines from pdf.js or any other
// text extractor that keeps the table's reading order.
export function parsePtr(lines) {
  const keep = [];
  let skip = false, skipDesc = false;
  for (const raw of lines) {
    const l = raw.replace(/\u0000/g, '').trim();
    // The repeated table header on every page.
    if (/^ID\s+Owner\s+Asset/.test(l)) { skip = true; continue; }
    if (skip) { if (/^\$200\?/.test(l)) skip = false; continue; }
    if (LABEL.test(raw.replace(/\u0000/g, '\u0001'))) { skipDesc = /^D/.test(l); continue; }
    if (skipDesc) {
      if (/^(SP|JT|DC)\s/.test(l) || /\[[A-Z0-9]{2}\]/.test(l) || /\(([A-Z][A-Z.]{0,5})\)/.test(l) || !l) skipDesc = false;
      else continue;
    }
    if (/^(\* For the complete|Filing ID|I CERTIFY|Digitally Signed|Clerk of the House|Name:|Status:|State\/District:)/.test(l)) continue;
    keep.push(l);
  }
  let text = keep.join('\n');
  // A row split by a page break: "... Common P 01/16/2026 01/16/2026 $50,001 -" then "Stock (TEM) [ST] $100,000".
  text = text.replace(new RegExp(String.raw`\s${TX}\s*-\s*\n+([^\n$]*\[[A-Z0-9]{2}\])\s*(\$[\d,]+)`, 'g'),
    (m, t, d1, d2, lo, tail, hi) => ` ${tail}\n${t} ${d1} ${d2} ${lo} - ${hi}`);
  const re = new RegExp(String.raw`(?:^|\n)(?:(SP|JT|DC)\s+)?((?:(?!\n(?:SP|JT|DC)\s)[\s\S])*?\[([A-Z0-9]{2})\])\s+${TX}(?:\s*-\s*(\$[\d,]+))?`, 'g');
  const out = [];
  for (const m of text.matchAll(re)) {
    const asset = m[2].replace(/\s+/g, ' ').replace(/\s*\[[A-Z0-9]{2}\]$/, '').trim();
    const tk = /\(([A-Z][A-Z0-9.]{0,6})\)\s*$/.exec(asset) || /\(([A-Z][A-Z0-9.]{0,6})\)/.exec(asset);
    const type = m[4] === 'P' ? 'buy' : m[4] === 'E' ? 'exchange' : m[4] === 'S' ? 'sell' : 'sell (partial)';
    out.push({ owner: m[1] || '', asset, ticker: tk ? tk[1] : '', assetType: m[3], type, date: usDate(m[5]), notified: usDate(m[6]), amount: m[8] ? `${m[7]} - ${m[8]}` : m[7] });
  }
  const seen = (text.match(new RegExp(TX, 'g')) || []).length;
  return { rows: out, unparsed: Math.max(0, seen - out.length) };
}

export async function congress(state, log, { now = Date.now() } = {}) {
  const docs = (state.docs ||= {});
  const year = new Date(now).getUTCFullYear();
  const years = new Date(now).getUTCMonth() < 2 ? [year - 1, year] : [year];
  let index = [];
  for (const y of years) index = index.concat(parseHouseIndex(await get(`${HOUSE}/financial-pdfs/${y}FD.xml`)));
  const ptrs = index.filter((x) => x.type === 'P' && x.docId && x.filed);
  const featured = (x) => FEATURED_MEMBERS.some((f) => f.match.test(x.name));
  const want = ptrs.filter((x) => daysAgo(x.filed, now) <= CONGRESS_DAYS || featured(x)).sort((a, b) => b.filed.localeCompare(a.filed));
  // Downloads that failed last time are tried again.
  for (const [id, d] of Object.entries(docs)) if (d.retry) delete docs[id];
  let fresh = 0;
  for (const x of want) {
    if (docs[x.docId] || fresh >= MAX_NEW_PDFS) continue;
    fresh++;
    const url = `${HOUSE}/ptr-pdfs/${x.year}/${x.docId}.pdf`;
    const rec = { member: x.name, prefix: x.prefix, state: x.state, filed: x.filed, url, rows: [], error: null };
    try {
      const lines = await pdfLines(await get(url, { as: 'bytes' }));
      if (!lines.some((l) => /\d{2}\/\d{2}\/\d{4}/.test(l))) rec.error = 'scanned paper filing, no text to read';
      else { const p = parsePtr(lines); rec.rows = p.rows; if (p.unparsed) rec.error = `${p.unparsed} row(s) could not be read`; else if (!p.rows.length) rec.error = 'no transactions found'; }
    } catch (e) { rec.error = String(e.message || e).slice(0, 160); rec.retry = true; }
    docs[x.docId] = rec;
    await sleep(250);
  }
  // Forget anything over 400 days old.
  for (const [id, d] of Object.entries(docs)) if (daysAgo(d.filed, now) > 400) delete docs[id];
  const pending = want.filter((x) => !docs[x.docId]).length;
  log(`congress: ${want.length} reports in range, ${fresh} parsed this run, ${pending} waiting`);

  const flat = (filter) => Object.entries(docs).filter(([, d]) => filter(d))
    .flatMap(([docId, d]) => d.rows.map((r) => ({ ...r, member: d.member, state: d.state, filed: d.filed, docId, url: d.url })))
    .sort((a, b) => (b.filed || '').localeCompare(a.filed || '') || (b.date || '').localeCompare(a.date || ''));
  const recent = (d) => daysAgo(d.filed, now) <= CONGRESS_DAYS;
  const failures = Object.entries(docs).filter(([, d]) => recent(d) && d.error)
    .map(([docId, d]) => ({ member: d.member, filed: d.filed, docId, url: d.url, error: d.error }))
    .sort((a, b) => b.filed.localeCompare(a.filed));
  return {
    days: CONGRESS_DAYS, reports: want.filter((x) => daysAgo(x.filed, now) <= CONGRESS_DAYS).length, pending,
    trades: flat(recent).slice(0, 400),
    featured: FEATURED_MEMBERS.map((f) => ({ id: f.id, name: f.name, trades: flat((d) => f.match.test(d.member)).slice(0, 80) })),
    failures: failures.slice(0, 60),
  };
}

// ---------------------------------------------------------------- run

export const TRUMP = {
  name: 'Donald Trump',
  text: 'As President, Trump files periodic transaction reports (OGE Form 278-T) with the Office of Government Ethics. They are published as scanned images rather than text, so this page can\'t read them automatically, and nothing here is guessed. The official reports are linked below.',
  links: [
    { label: 'OGE: officials\' financial disclosure reports', url: 'https://www.oge.gov/web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm' },
    { label: 'Office of Government Ethics', url: 'https://www.oge.gov/' },
  ],
};

async function main() {
  const args = process.argv.slice(2);
  const dir = args[args.indexOf('--dir') + 1] || 'investors-out';
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
  const run = (k) => !only || only.includes(k);
  await mkdir(dir, { recursive: true });
  const log = (s) => console.log(s);
  let state = {};
  try { state = JSON.parse(await readFile(path.join(dir, 'state.json'), 'utf8')); } catch {}
  let prevOut = {};
  try { prevOut = JSON.parse(await readFile(path.join(dir, 'investors.json'), 'utf8')); } catch {}
  const errors = {};
  state.cusips ||= {};

  // ARK first: its files carry tickers for CUSIPs the 13F tables need.
  let ark = prevOut.ark || null;
  if (run('ark')) {
    state.ark ||= {};
    const trades = (state.arkTrades || []).filter((t) => daysAgo(t.date) <= 45);
    const funds = [];
    for (const [fund, file] of ARK_FUNDS) {
      try {
        const cur = parseArk(await get(ARK_BASE + encodeURIComponent(file).replace(/%26/g, '&')));
        for (const x of Object.values(cur.rows)) if (x.cusip && /^[0-9A-Z]{9}$/.test(x.cusip)) state.cusips[x.cusip] = x.ticker;
        const prev = state.ark[fund];
        const t = arkTrades(fund, prev, cur);
        for (const x of t) if (!trades.some((y) => y.date === x.date && y.fund === x.fund && y.ticker === x.ticker)) trades.push(x);
        if (!prev || cur.date >= prev.date) state.ark[fund] = cur;
        const top = Object.values(cur.rows).sort((a, b) => b.value - a.value).slice(0, 10).map((x) => ({ ticker: x.ticker, company: x.company, weight: x.weight, value: x.value }));
        funds.push({ fund, date: cur.date, prevDate: prev?.date || null, stale: daysAgo(cur.date) > 5, top, trades: t.length });
        log(`ark ${fund}: ${cur.date}, ${Object.keys(cur.rows).length} holdings, ${t.length} trades vs ${prev?.date || 'none'}`);
      } catch (e) { errors[`ark:${fund}`] = String(e.message || e); log(`ark ${fund}: ${errors[`ark:${fund}`]}`); }
      await sleep(300);
    }
    trades.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.usd) - Math.abs(a.usd));
    state.arkTrades = trades;
    ark = { funds, trades: trades.slice(0, 300), note: 'Estimated from ARK\'s published daily holdings: the change in each position, net of the fund growing or shrinking.' };
  }

  let funds = prevOut.funds || [];
  if (run('13f')) {
    const out = [];
    for (const f of FUNDS) {
      try { out.push(await fund13f(f, state.cusips, log)); }
      catch (e) {
        errors[`13f:${f.id}`] = String(e.message || e); log(`13F ${f.id}: ${errors[`13f:${f.id}`]}`);
        const old = funds.find((x) => x.id === f.id); if (old) out.push(old); // keep the last good read
      }
      await sleep(300);
    }
    funds = out;
  }

  let house = prevOut.congress || null;
  if (run('congress')) {
    try { state.congress ||= {}; house = await congress(state.congress, log); }
    catch (e) { errors.congress = String(e.message || e); log(`congress: ${errors.congress}`); }
  }

  const out = { generated: new Date().toISOString(), funds, ark, congress: house, trump: TRUMP, errors };
  await writeFile(path.join(dir, 'state.json'), JSON.stringify(state));
  await writeFile(path.join(dir, 'investors.json'), JSON.stringify(out));
  log(`wrote ${path.join(dir, 'investors.json')} (${Object.keys(errors).length} errors)`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
