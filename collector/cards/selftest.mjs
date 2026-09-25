/**
 * collector/cards/selftest.mjs — the checks that are not about how a card looks.
 *
 *   docker run --rm -v "$PWD":/app -w /app node:20-alpine \
 *     node collector/cards/selftest.mjs
 *
 * Four of them:
 *   1. DETERMINISM. CONTRACT.md §4 forbids Math.random and unseeded time in
 *      output. Two builds of the same design from the same bytes must be
 *      byte-identical PNGs.
 *   2. NO Math.random IN THE SOURCE, checked by reading the files, because a
 *      determinism test only catches the calls that happened to differ.
 *   3. THE VOICE BANS. Every string a card sets is run through the same
 *      findFutureViolation() and findUrlViolation() that gate post copy. A card
 *      is post copy that happens to be a picture, and the bans do not stop
 *      applying because the letters are drawn rather than typed.
 *   4. THE STENCIL. Every string a card sets must be settable, and the lines
 *      that carry somebody else's words must not be losing characters.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { render, auditCard, fold, canSet } from './_kit.mjs';
import { DESIGNS } from './index.mjs';
import { findFutureViolation, findUrlViolation } from '../posts.mjs';

const ROOT = process.cwd();
const load = (n) => {
  const p = join(ROOT, 'data', n);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
};
const data = {
  state: load('state.json'),
  news: load('news.json'),
  race: load('race.json'),
  datacenters: load('datacenters.json'),
  infra: load('infra.json'),
};

/**
 * THE ONE CARVE-OUT, STATED IN ONE PLACE.
 *
 * "AI EARLY WARNING SYSTEM" is the instrument's name. docs/BRAND.md §1.6 sets
 * it on the default OG image and every page's masthead carries it. The banned
 * list cannot tell a noun in a proper name from a verb about the future, which
 * is the same problem docs/VOICE.md §5 technique 6 records for "not a forecast"
 * — and the answer there was to change the word. Here the word is the product's
 * name, so the carve-out is declared, narrow, and exact-match only.
 */
const NAME_CARVE_OUT = 'AI EARLY WARNING SYSTEM';

const sha = (b) => createHash('sha256').update(b).digest('hex');
let failures = 0;
const fail = (m) => { failures += 1; console.log(`FAIL  ${m}`); };
const pass = (m) => console.log(`ok    ${m}`);

/* 2. No Math.random in any card source. -------------------------------- */
// Calls only. Every one of these files TALKS about Math.random in a comment,
// which is the point of the comment, so the pattern is the call and not the name.
let clean = true;
for (const f of ['_kit.mjs', '_chassis.mjs', '_tilemap.mjs', 'drought.mjs', 'race.mjs',
  'map.mjs', 'level.mjs', 'developing.mjs', 'index.mjs']) {
  const src = readFileSync(join(ROOT, 'collector/cards', f), 'utf8');
  for (const [re, what] of [[/Math\s*\.\s*random\s*\(/, 'Math.random()'],
    [/Date\s*\.\s*now\s*\(/, 'Date.now()'],
    [/new\s+Date\s*\(\s*\)/, 'new Date()']]) {
    if (re.test(src)) { fail(`${f} calls ${what}`); clean = false; }
  }
}
if (clean) pass('no Math.random() and no unseeded clock call in any card source');

/* Build every renderable design once, for the text and stencil checks. --- */
const built = [];
for (const d of DESIGNS) {
  const gate = d.shouldPost(data);
  if (!gate.ok) { console.log(`skip  ${d.id}: ${gate.why}`); continue; }
  const s = d.build(data);
  auditCard(s);
  built.push({ id: d.id, surface: s });
}
if (!built.length) fail('no design is renderable from today’s data');

for (const { id, surface } of built) {
  /* 3. The voice bans. ---------------------------------------------------- */
  for (const op of surface.ops.filter((o) => o.op === 'text')) {
    const t = op.text;
    if (t === NAME_CARVE_OUT) continue;
    const fv = findFutureViolation(t);
    if (fv) fail(`${id}: future tense "${fv}" in "${t}"`);
    const uv = findUrlViolation(t);
    // role:'domain' IS the burned-in domain, which is the whole point of it.
    if (uv && op.role !== 'domain') fail(`${id}: url-shaped "${uv}" in "${t}"`);
    /* 4. The stencil. ------------------------------------------------------ */
    if (!canSet(t)) fail(`${id}: the stencil cannot set "${t}"`);
    const f = fold(t);
    if (f.lost) fail(`${id}: "${t}" loses ${f.lost} characters to the stencil`);
  }

  /* 1. Determinism. ------------------------------------------------------- */
  const a = sha(render(surface));
  const again = DESIGNS.find((d) => d.id === id).build(data);
  const b = sha(render(again));
  if (a !== b) fail(`${id}: two builds differ (${a.slice(0, 12)} vs ${b.slice(0, 12)})`);
  else pass(`${id}: deterministic, sha256 ${a.slice(0, 16)}…`);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall checks pass');
process.exit(failures ? 1 : 0);
