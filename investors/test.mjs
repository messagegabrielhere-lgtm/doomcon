// Offline tests for the investors collector: every parser on fixed inputs.
//   node --test investors/test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { highlights, inDollars, parseInfoTable, aggregate, compare, latestTwo, parseArk, arkTrades, parseHouseIndex, parsePtr, pdfLines } from './collect.mjs';

const Z = '\u0000\u0000\u0000';
// The text layer of a real two-page House PTR (Filing ID 20033725), trimmed.
// Section labels come out garbled ("F S: New") in some extractors; both forms must work.
const PTR = `P T R
F I T
P${Z} T${Z} R${Z}
Clerk of the House of Representatives • Legislative Resource Center • B81 Cannon Building • Washington, DC 20515
F${Z} I${Z}
Name: Hon. Nancy Pelosi
Status: Member
State/District: CA11
T${Z}
ID Owner Asset Transaction
Type
Date Notification
Date
Amount Cap.
Gains >
$200?
SP AllianceBernstein Holding L.P. Units
(AB) [AB]
P 01/16/2026 01/16/2026 $1,000,001 -
$5,000,000
F${Z} S${Z}: New
D${Z}: Purchased 25,000 shares.
SP Alphabet Inc. - Class A Common
Stock (GOOGL) [ST]
P 01/16/2026 01/16/2026 $500,001 -
$1,000,000
F${Z} S${Z}: New
D${Z}: Exercised 50 call options purchased 1/14/25 (5,000 shares) at a strike price of $150 with an expiration date of
1/16/26.
SP Amazon.com, Inc. - Common Stock
(AMZN) [ST]
S (partial) 12/24/2025 12/24/2025 $1,000,001 -
$5,000,000
Filing Status: New
Description: Sold 20,000 shares.
SP Tempus AI, Inc. - Class A Common P 01/16/2026 01/16/2026 $50,001 -

ID Owner Asset Transaction
Type
Date Notification
Date
Amount Cap.
Gains >
$200?
Stock (TEM) [ST] $100,000
F${Z} S${Z}: New
D${Z}: Exercised 50 call options purchased 1/14/25 (5,000 shares) at a strike price of $20 with an expiration date of
1/16/26.
SP Versant Media Group, Inc. - Class A
Common Stock (VSNT) [ST]
E 01/02/2026 01/02/2026 $15.00
F${Z} S${Z}: New
SP Walt Disney Company (DIS) [ST] S 12/30/2025 12/30/2025 $1,000,001 -
$5,000,000
F${Z} S${Z}: New
D${Z}: Sold 10,000 shares.
T
Apple Inc. - Common Stock (AAPL)
[ST]
P 02/02/2026 02/03/2026 $1,001 - $15,000
* For the complete list of asset type abbreviations, please visit https://fd.house.gov/reference/asset-type-codes.aspx.
Digitally Signed: Hon. Nancy Pelosi , 01/23/2026`;

test('PTR: every row, page breaks, wrapped amounts, exchanges, no owner code', () => {
  const { rows, unparsed } = parsePtr(PTR.split('\n'));
  assert.equal(unparsed, 0);
  assert.deepEqual(rows.map((r) => [r.owner, r.ticker, r.assetType, r.type, r.date, r.amount]), [
    ['SP', 'AB', 'AB', 'buy', '2026-01-16', '$1,000,001 - $5,000,000'],
    ['SP', 'GOOGL', 'ST', 'buy', '2026-01-16', '$500,001 - $1,000,000'],
    ['SP', 'AMZN', 'ST', 'sell (partial)', '2025-12-24', '$1,000,001 - $5,000,000'],
    ['SP', 'TEM', 'ST', 'buy', '2026-01-16', '$50,001 - $100,000'],
    ['SP', 'VSNT', 'ST', 'exchange', '2026-01-02', '$15.00'],
    ['SP', 'DIS', 'ST', 'sell', '2025-12-30', '$1,000,001 - $5,000,000'],
    ['', 'AAPL', 'ST', 'buy', '2026-02-02', '$1,001 - $15,000'],
  ]);
  assert.equal(rows[3].asset, 'Tempus AI, Inc. - Class A Common Stock (TEM)');
  assert.equal(rows[6].asset, 'Apple Inc. - Common Stock (AAPL)');
});

// pdf.js's order: the type, dates and amount on a row's first line, the rest of
// the asset name and the high end of the amount on the lines after.
test('PTR: pdf.js line order, bonds, rows without an owner code', () => {
  const L = (x) => x.split('\n');
  const { rows, unparsed } = parsePtr(L(`P${Z} T${Z} R${Z}
ID Owner Asset Transaction Date Notification Amount Cap.
Type Date Gains >
$200?
DC Apple Inc. - Common Stock (AAPL) S (partial) 09/08/2026 09/15/2026 $1,001 - $15,000
[ST]
F${Z} S${Z}: New
S${Z} O${Z}: Kelby Austin Hern Trust
JT ARBUCKLE MEM HOSP AUTH P 09/08/2026 09/15/2026 $15,001 -
OKLA SALES TAX 03.00000% $50,000
01/01/2027 REV BDS SER. 2018 [GS]
F${Z} S${Z}: New
Microsoft Corporation - Common S (partial) 09/28/2026 09/28/2026 $1,001 - $15,000
Stock (MSFT) [ST]
F${Z} S${Z}: New

ID Owner Asset Transaction Date Notification Amount Cap.
Type Date Gains >
$200?
JT Boston Scientific Corporation S 09/09/2026 09/15/2026 $50,001 -
Common Stock (BSX) [ST] $100,000
F${Z} S${Z}: New`));
  assert.equal(unparsed, 0);
  assert.deepEqual(rows.map((r) => [r.owner, r.ticker, r.assetType, r.type, r.amount]), [
    ['DC', 'AAPL', 'ST', 'sell (partial)', '$1,001 - $15,000'],
    ['JT', '', 'GS', 'buy', '$15,001 - $50,000'],
    ['', 'MSFT', 'ST', 'sell (partial)', '$1,001 - $15,000'],
    ['JT', 'BSX', 'ST', 'sell', '$50,001 - $100,000'],
  ]);
  assert.equal(rows[1].asset, 'ARBUCKLE MEM HOSP AUTH OKLA SALES TAX 03.00000% 01/01/2027 REV BDS SER. 2018');
  assert.equal(rows[2].asset, 'Microsoft Corporation - Common Stock (MSFT)');
});

test('PTR: a row the parser cannot read is counted, not dropped silently', () => {
  const { rows, unparsed } = parsePtr(['SP Something odd', 'P 01/16/2026 01/16/2026 $1,001 - $15,000']);
  assert.equal(rows.length, 0); assert.equal(unparsed, 1);
});

test('House index: filings with names, types and dates', () => {
  const xml = `<FinancialDisclosure><Member><Prefix>Hon.</Prefix><Last>Pelosi</Last><First>Nancy</First><Suffix /><FilingType>P</FilingType><StateDst>CA11</StateDst><Year>2026</Year><FilingDate>10/2/2026</FilingDate><DocID>20035553</DocID></Member>
  <Member><Prefix /><Last>Doe</Last><First>Jane</First><Suffix /><FilingType>A</FilingType><StateDst>TX01</StateDst><Year>2026</Year><FilingDate>5/15/2026</FilingDate><DocID>10000001</DocID></Member></FinancialDisclosure>`;
  const x = parseHouseIndex(xml);
  assert.deepEqual(x[0], { docId: '20035553', type: 'P', name: 'Nancy Pelosi', prefix: 'Hon.', state: 'CA11', year: '2026', filed: '2026-10-02' });
  assert.equal(x[1].type, 'A');
});

// A tiny real PDF with two text lines, to prove the pdf.js path end to end.
function tinyPdf(lines) {
  const content = lines.map((t, i) => `BT /F1 10 Tf 40 ${740 - i * 14} Td (${t.replace(/[()\\]/g, (c) => '\\' + c)}) Tj ET`).join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}

test('PDF: text lines come out in reading order and parse', async (t) => {
  try { await import('pdfjs-dist/legacy/build/pdf.mjs'); } catch { t.skip('pdfjs-dist not installed'); return; }
  const lines = await pdfLines(tinyPdf(['SP NVIDIA Corporation - Common Stock (NVDA) [ST]', 'P 05/29/2026 05/29/2026 $1,000,001 - $5,000,000']));
  assert.equal(lines[0], 'SP NVIDIA Corporation - Common Stock (NVDA) [ST]');
  const { rows } = parsePtr(lines);
  assert.equal(rows[0].ticker, 'NVDA'); assert.equal(rows[0].amount, '$1,000,001 - $5,000,000');
});

test('13F: info table rows with or without a namespace prefix, aggregated and compared', () => {
  const row = (p, name, cusip, value, sh, pc = '') => `<${p}infoTable><${p}nameOfIssuer>${name}</${p}nameOfIssuer><${p}titleOfClass>COM</${p}titleOfClass><${p}cusip>${cusip}</${p}cusip><${p}value>${value}</${p}value><${p}shrsOrPrnAmt><${p}sshPrnamt>${sh}</${p}sshPrnamt><${p}sshPrnamtType>SH</${p}sshPrnamtType></${p}shrsOrPrnAmt>${pc ? `<${p}putCall>${pc}</${p}putCall>` : ''}</${p}infoTable>`;
  const cur = parseInfoTable(`<informationTable>${row('ns1:', 'APPLE INC', '037833100', 1000, 10)}${row('ns1:', 'APPLE INC', '037833100', 500, 5)}${row('ns1:', 'NEWCO &amp; SONS', '111111111', 300, 3)}${row('ns1:', 'APPLE INC', '037833100', 50, 1, 'Put')}</informationTable>`);
  assert.equal(cur.length, 4); assert.equal(cur[2].name, 'NEWCO & SONS');
  const prev = parseInfoTable(`<informationTable xmlns="x">${row('', 'APPLE INC', '037833100', 1200, 20)}${row('', 'OLDCO', '222222222', 400, 4)}</informationTable>`);
  const A = aggregate(cur), B = aggregate(prev);
  assert.deepEqual(A.map((x) => [x.ticker, x.shares, x.putCall]), [['AAPL', 15, ''], ['', 3, ''], ['AAPL', 1, 'Put']]);
  const ch = compare(A, B);
  const kinds = Object.fromEntries(ch.map((c) => [`${c.name}${c.putCall}`, c.kind]));
  assert.deepEqual(kinds, { 'APPLE INC': 'trim', 'NEWCO & SONS': 'new', OLDCO: 'exit', 'APPLE INCPut': 'new' });
  // A trim is sized at this quarter's price: 5 shares sold at $100.
  assert.equal(ch.find((c) => c.kind === 'trim').dValue, -500);
});

test('13F: the two latest original filings for different quarters', () => {
  const sub = { filings: { recent: {
    form: ['13F-HR/A', '13F-HR', '4', '13F-HR', '13F-HR'],
    accessionNumber: ['a', 'b', 'c', 'd', 'e'],
    filingDate: ['2026-09-01', '2026-08-14', '2026-08-01', '2026-05-15', '2026-02-14'],
    reportDate: ['2026-06-30', '2026-06-30', '', '2026-03-31', '2025-12-31'],
  } } };
  assert.deepEqual(latestTwo(sub).map((x) => x.acc), ['b', 'd']);
});

test('ARK: a creation scales every line; only real trades come out', () => {
  const csv = (date, rows) => `date,fund,company,ticker,cusip,shares,market value ($),weight (%)\r\n${rows.map(([t, sh, px]) => `${date},ARKK,${t} INC,${t},${t.padEnd(9, '0')},"${sh.toLocaleString('en-US')}","$${(sh * px).toLocaleString('en-US')}",1.00%`).join('\r\n')}\r\n${date},ARKK,CASH,,X9USDGSFT,"1,000","$1,000.00",0.01%\r\n"Disclaimer, with a comma"`;
  const a = parseArk(csv('10/06/2026', [['AAA', 100000, 50], ['BBB', 200000, 20], ['CCC', 300000, 10], ['OLD', 50000, 30]]));
  // The fund grew 10% (every line x1.1); on top of that ARK bought 20,000 BBB and sold OLD and added NEW.
  const b = parseArk(csv('10/07/2026', [['AAA', 110000, 50], ['BBB', 240000, 20], ['CCC', 330000, 10], ['NEW', 40000, 25]]));
  assert.equal(a.date, '2026-10-06'); assert.ok(!a.rows.CASH && Object.keys(a.rows).length === 4);
  const t = arkTrades('ARKK', a, b);
  assert.deepEqual(t.map((x) => [x.ticker, x.kind, x.dShares]), [['OLD', 'exit', -50000], ['NEW', 'new', 40000], ['BBB', 'buy', 20000]]);
  assert.deepEqual(arkTrades('ARKK', b, b), [], 'same day: nothing');
});

test('13F: a filer reporting thousands is scaled to dollars, one in dollars is left alone', () => {
  const k = [{ value: 864923, shares: 3186306, unit: 'SH' }, { value: 281613, shares: 589680, unit: 'SH' }, { value: 232375, shares: 3102880, unit: 'SH' }];
  assert.deepEqual(inDollars(k).map((r) => r.value), [864923000, 281613000, 232375000]);
  const d = [{ value: 65950296923, shares: 227917808, unit: 'SH' }];
  assert.equal(inDollars(d)[0].value, 65950296923);
});

test('highlights: biggest stock trades, one per member and ticker, no exchanges', () => {
  const t = (member, ticker, type, amount, assetType = 'ST') => ({ member, ticker, type, amount, assetType, asset: ticker, date: '2026-09-01', filed: '2026-09-10' });
  const h = highlights({ generated: 'x', funds: [{ id: 'a', person: 'A', fund: 'F', changes: [{ kind: 'new', ticker: 'Z', dValue: 5.4 }] }, { id: 'b', error: 'HTTP 403' }],
    congress: { trades: [t('M', 'AAA', 'buy', '$1,001 - $15,000'), t('M', 'BBB', 'buy', '$500,001 - $1,000,000'), t('M', 'BBB', 'sell', '$250,001 - $500,000'), t('N', 'CCC', 'exchange', '$1,000,001 - $5,000,000'), t('N', '', 'buy', '$5,000,001 - $25,000,000', 'GS')],
      featured: [{ id: 'pelosi', trades: [t('Nancy Pelosi', 'NVDA', 'buy', '$1,000,001 - $5,000,000', 'OP')] }] } });
  assert.deepEqual(h.congress.map((x) => x.ticker), ['BBB', 'AAA']);
  assert.equal(h.pelosi[0].options, true);
  assert.deepEqual(h.funds.map((f) => [f.id, f.kind, f.dValue]), [['a', 'new', 5]]);
});
