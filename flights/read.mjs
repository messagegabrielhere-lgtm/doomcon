// Reading a BTS monthly archive: one zip holding one large CSV.
// Node built-ins only (CONTRACT.md §1.1), so the zip is read by hand.

import { inflateRawSync } from 'node:zlib';

const EOCD = 0x06054b50; // end of central directory
const CDIR = 0x02014b50; // central directory entry
const LOCAL = 0x04034b50; // local file header

/** The first .csv entry of a zip Buffer, uncompressed. Throws if there is none. */
export function firstCsv(zip) {
  let end = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === EOCD) { end = i; break; }
  }
  if (end < 0) throw new Error('not a zip archive');
  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== CDIR) throw new Error('corrupt zip directory');
    const method = zip.readUInt16LE(p + 10);
    const packed = zip.readUInt32LE(p + 20);
    const size = zip.readUInt32LE(p + 24);
    const nameLen = zip.readUInt16LE(p + 28);
    const skip = nameLen + zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString('latin1', p + 46, p + 46 + nameLen);
    p += 46 + skip;
    if (!/\.csv$/i.test(name)) continue;
    if (zip.readUInt32LE(local) !== LOCAL) throw new Error(`corrupt zip entry: ${name}`);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + packed);
    if (method !== 0 && method !== 8) throw new Error(`unsupported zip method ${method}: ${name}`);
    const csv = method === 8 ? inflateRawSync(data) : data;
    if (csv.length !== size) throw new Error(`zip entry ${name}: ${csv.length} bytes, directory says ${size}`);
    return csv;
  }
  throw new Error('zip archive holds no .csv');
}

/** Call fn(line) for every non-empty line of a CSV Buffer. */
export function eachLine(buf, fn) {
  let from = 0;
  while (from < buf.length) {
    let to = buf.indexOf(10, from);
    if (to < 0) to = buf.length;
    const stop = to > from && buf[to - 1] === 13 ? to - 1 : to;
    if (stop > from) fn(buf.toString('latin1', from, stop));
    from = to + 1;
  }
}
