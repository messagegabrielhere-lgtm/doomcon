import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import * as core from './core.mjs';
import { firstCsv, eachLine } from './read.mjs';

const HEADER = 'Year,FlightDate,IATA_CODE_Reporting_Airline,Flight_Number_Reporting_Airline,Origin,OriginCityName,Dest,CRSDepTime,ArrDelayMinutes,ArrDel15,Cancelled,Diverted,';
const row = (date, num, dep, mins, del15, cancelled = '0.00', diverted = '0.00') =>
  `2025,${date},"DL","${num}","ATL","Atlanta, GA","DEN","${dep}",${mins},${del15},${cancelled},${diverted},`;

// A one-entry zip, built by hand so the reader is checked against the format
// and not against another copy of itself.
function zipOf(name, body, method) {
  const data = method === 8 ? deflateRawSync(body) : body;
  const fname = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(body.length, 22);
  local.writeUInt16LE(fname.length, 26);
  const cdir = Buffer.alloc(46);
  cdir.writeUInt32LE(0x02014b50, 0);
  cdir.writeUInt16LE(method, 10);
  cdir.writeUInt32LE(data.length, 20);
  cdir.writeUInt32LE(body.length, 24);
  cdir.writeUInt16LE(fname.length, 28);
  cdir.writeUInt32LE(0, 42);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + fname.length, 12);
  end.writeUInt32LE(30 + fname.length + data.length, 16);
  return Buffer.concat([local, fname, data, cdir, fname, end]);
}

test('splitCsvLine keeps commas inside quotes and trailing empties', () => {
  assert.deepEqual(core.splitCsvLine('1,"Atlanta, GA","say ""hi""",,'), ['1', 'Atlanta, GA', 'say "hi"', '', '']);
});

test('columnIndex names the column BTS dropped', () => {
  assert.throws(() => core.columnIndex('FlightDate,Origin,Dest'), /ArrDel15/);
  assert.equal(core.columnIndex(HEADER).Origin, 4);
});

test('a flight is counted on time, late, cancelled or diverted, once', () => {
  const ix = core.columnIndex(HEADER);
  const tally = core.newTally();
  const lines = [
    row('2025-01-01', 482, '0815', '0.00', '0.00'),
    row('2025-01-02', 482, '0815', '40.00', '1.00'),
    row('2025-01-03', 482, '0820', '', '', '1.00'),
    row('2025-01-04', 482, '0820', '', '', '0.00', '1.00'),
    row('2025-01-05', 482, '0820', '5.00', '0.00'),
  ];
  for (const line of lines) core.addRow(tally, core.splitCsvLine(line), ix);
  assert.deepEqual(tally.ATL.DEN['DL 482'], {
    n: 5, ontime: 2, cancelled: 1, diverted: 1, late: 1, lateMin: 40, dep: '0820', last: '2025-01-05',
  });
});

test('grade: cancelled flights count against it, small samples get no letter', () => {
  assert.deepEqual(core.grade(100, 90), { pct: 90, letter: 'A' });
  assert.equal(core.grade(100, 89).letter, 'B');
  assert.equal(core.grade(100, 59).letter, 'F');
  assert.equal(core.grade(core.MIN_FLIGHTS - 1, core.MIN_FLIGHTS - 1).letter, null);
  assert.deepEqual(core.grade(0, 0), { pct: null, letter: null });
});

test('buildFiles drops one-off flights and lists routes in the index', () => {
  const ix = core.columnIndex(HEADER);
  const tally = core.newTally();
  for (let d = 1; d <= core.KEEP_MIN; d++) core.addRow(tally, core.splitCsvLine(row(`2025-01-0${d}`, 482, '0815', '0.00', '0.00')), ix);
  core.addRow(tally, core.splitCsvLine(row('2025-01-01', 9999, '2300', '0.00', '0.00')), ix);
  const files = core.buildFiles(tally, { generated_at: '2026-01-01T00:00:00.000Z', months: ['2025-01'] });
  const index = JSON.parse(files['index.json']);
  assert.deepEqual(index.routes, { ATL: ['DEN'] });
  assert.equal(index.flights, 1);
  assert.deepEqual(JSON.parse(files['origin/ATL.json']).routes.DEN, [['DL', '482', '0815', 5, 5, 0, 0, 0, 0]]);
});

test('prevMonth steps back across a year', () => {
  assert.deepEqual(core.prevMonth(2026, 1), { y: 2025, m: 12 });
  assert.deepEqual(core.prevMonth(2026, 3), { y: 2026, m: 2 });
});

test('firstCsv reads a deflated and a stored entry; eachLine drops CR and blanks', () => {
  const body = Buffer.from(`${HEADER}\r\n${row('2025-01-01', 482, '0815', '0.00', '0.00')}\r\n\r\n`);
  for (const method of [8, 0]) {
    const lines = [];
    eachLine(firstCsv(zipOf('On_Time_2025_1.csv', body, method)), (l) => lines.push(l));
    assert.equal(lines.length, 2);
    assert.equal(lines[0], HEADER);
  }
  assert.throws(() => firstCsv(Buffer.from('<html>not found</html>'.padEnd(64))), /not a zip/);
  assert.throws(() => firstCsv(zipOf('readme.html', body, 8)), /no \.csv/);
});
