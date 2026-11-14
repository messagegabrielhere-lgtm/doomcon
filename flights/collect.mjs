#!/usr/bin/env node
// Flight Report Card snapshot: the newest 12 published months of BTS
// "Reporting Carrier On-Time Performance" -> index.json + origin/<IATA>.json.
//
//   node flights/collect.mjs <outDir>
//
// BTS publishes one zip per month, about two months behind. The job walks back
// from last month, skips months not yet published, then needs 12 in a row. A
// gap after the first month found fails the run, so nothing partial is published.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchBytes } from '../collector/fetch.mjs';
import { firstCsv, eachLine } from './read.mjs';
import * as core from './core.mjs';

const WANT = 12;
const MAX_SKIPS = 6;
const SOURCE = 'https://transtats.bts.gov/PREZIP/';
const zipUrl = (y, m) => `${SOURCE}On_Time_Reporting_Carrier_On_Time_Performance_1987_present_${y}_${m}.zip`;

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node flights/collect.mjs <outDir>');
  process.exit(2);
}

const now = new Date();
let y = now.getUTCFullYear();
let m = now.getUTCMonth() + 1;
const tally = core.newTally();
const months = [];
let rows = 0;
let skips = 0;

while (months.length < WANT) {
  ({ y, m } = core.prevMonth(y, m));
  let csv;
  try {
    csv = firstCsv(await fetchBytes(zipUrl(y, m), { timeoutMs: 300_000, retries: 1 }));
  } catch (err) {
    if (months.length || ++skips > MAX_SKIPS) throw err;
    console.log(`${y}-${m}: not published (${err.message.slice(0, 80)})`);
    continue;
  }
  let ix = null;
  eachLine(csv, (line) => {
    if (!ix) { ix = core.columnIndex(line); return; }
    core.addRow(tally, core.splitCsvLine(line), ix);
    rows++;
  });
  months.push(`${y}-${String(m).padStart(2, '0')}`);
  console.log(`${months.at(-1)}: ${rows} rows so far`);
}

const files = core.buildFiles(tally, {
  generated_at: now.toISOString(),
  source: SOURCE,
  months: months.reverse(),
  rows_read: rows,
});
await mkdir(path.join(outDir, 'origin'), { recursive: true });
for (const [name, text] of Object.entries(files)) await writeFile(path.join(outDir, name), text);
console.log(`wrote ${Object.keys(files).length} files, ${months[0]} to ${months.at(-1)}`);
