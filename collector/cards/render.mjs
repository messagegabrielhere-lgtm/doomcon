/**
 * collector/cards/render.mjs — render every card design from the live data.
 *
 * Usage, on a machine with no Node installed (CONTRACT.md §1):
 *   docker run --rm -v "$PWD":/app -w /app node:20-alpine \
 *     node collector/cards/render.mjs [outDir]
 *
 * For each design it writes:
 *   <id>.png          1080x1350, the thing that goes in the post
 *   <id>.thumb.png    the same op list at 200px wide, which is the audit
 *
 * A design that cannot render from today's data does NOT fall back and does
 * NOT guess. It prints the reason and the run continues. That is the whole
 * posture: docs/VOICE.md §2 would rather print DARK on four of fourteen
 * sources and be believed about the other ten.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { render, auditCard, THUMB_W, CARD_W } from './_kit.mjs';
import { DESIGNS } from './index.mjs';

const ROOT = process.cwd();
const OUT = process.argv[2] || join(ROOT, '.tmp-cards');

function load(name) {
  const p = join(ROOT, 'data', name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

const data = {
  state: load('state.json'),
  news: load('news.json'),
  race: load('race.json'),
  datacenters: load('datacenters.json'),
  infra: load('infra.json'),
  leaders: load('leaders.json'),
};

mkdirSync(OUT, { recursive: true });

let made = 0;
let declined = 0;
for (const design of DESIGNS) {
  const gate = design.shouldPost(data);
  if (!gate.ok) {
    declined += 1;
    console.log(`DECLINED  ${design.id.padEnd(11)}  ${gate.why}`);
    continue;
  }
  let surface; let png; let thumb;
  try {
    surface = design.build(data);
    auditCard(surface);
    png = render(surface);
    thumb = render(surface, { scale: THUMB_W / CARD_W });
  } catch (err) {
    declined += 1;
    console.log(`FAILED    ${design.id.padEnd(11)}  ${err.message}`);
    continue;
  }
  writeFileSync(join(OUT, `${design.id}.png`), png);
  writeFileSync(join(OUT, `${design.id}.thumb.png`), thumb);
  made += 1;
  console.log(`RENDERED  ${design.id.padEnd(11)}  ${surface.ops.length} ops  ${(png.length / 1024).toFixed(0)} KB`);
  for (const n of surface.notes) console.log(`            ${n.key}: ${n.value}`);
}
console.log(`\n${made} rendered, ${declined} declined, into ${OUT}`);
