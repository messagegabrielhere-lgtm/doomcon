// Prints the Supply Depot catalog and the prepper checklist as JSON, for
// supply/make_files.py. The checklist is read from its own page, so both
// stay single sources.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { CATALOG } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = await readFile(path.join(ROOT, 'site', 'static', 'prepper-checklist.html'), 'utf8');
const start = page.indexOf('const SECTIONS = ');
const end = page.indexOf('\n];', start) + 3;
const checklist = vm.runInNewContext(page.slice(start + 'const SECTIONS = '.length, end));
process.stdout.write(JSON.stringify({ catalog: CATALOG, checklist }));
