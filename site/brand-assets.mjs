// The off-site brand artefacts: the X profile picture and the X header.
//
//   node site/brand-assets.mjs            # writes assets/brand/x-profile.png, x-header.png
//
// WHY THIS EXISTS. The two files in assets/brand/ were drawn by hand in the
// first week and never regenerated. By 2026-10-03 both carried the retired
// dial logo instead of the sentinel mark the operator chose, and the header
// printed "DETECTED EARLY NEVER PREDICTED / WE JUST COUNT" - the tagline
// brand.mjs replaced because "predicted" fails the site's own post pre-flight.
// The account's most-seen surface was the one place the brand was wrong.
//
// So they are generated now, from the same primitives the share cards and the
// favicon use: the mark is brandmarks.iconPng()/surface.mark(), the words are
// brand.TAGLINE and brand.PUBLICATION read at run time, the colours are the
// heat ramp. Change the tagline in brand.mjs and re-run this; nothing here is
// typed twice. Deterministic: no clock, no randomness, same bytes every run.
//
// THESE ARE STATIC, SO THEY CLAIM NO READING. The site's mark is level-lit,
// which a profile picture cannot be. Both artefacts set the mark at level 3,
// whose heat colour is the brand accent itself (#ffb020), and neither prints a
// level, a score or a date. The header draws the five-band scale with every
// band lit equally and its two ends named, which is the one thing a stranger
// needs before any reading makes sense: 5 is quiet, 1 is loud.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as brand from './brand.mjs';
import * as marks from './brandmarks.mjs';
import { surface, measureText } from './cardpng.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'brand');
const STATIC_LEVEL = 3;

/** 400x400. X crops it to a circle, so the mark sits inside a 16% inset. */
export function profilePng() {
  return marks.iconPng(STATIC_LEVEL, { size: 400, rounded: false, padding: 0.16, frame: false });
}

/**
 * 1500x500. X overlays the avatar on the bottom-left and crops the top and
 * bottom edges on phones, so everything that matters sits between y=110 and
 * y=390 and to the right of x=120.
 */
export function headerPng() {
  const W = 1500; const H = 500;
  const S = surface(W, H, { background: marks.GROUND });

  // Every line is FITTED, not sized by eye: the first render of this header set
  // the tagline at 24px and it ran 215px into the scale beside it. fit() steps
  // the cap height down a pixel at a time until the measured line clears its
  // column, and throws if it would have to go under a legible floor.
  const fit = (text, { from, max, track, floor = 15 }) => {
    for (let size = from; size >= floor; size -= 1) {
      if (measureText(text, { size, track }) <= max) return size;
    }
    throw new Error(`brand-assets: "${text}" does not fit ${max}px above ${floor}px`);
  };

  // The scale's column, fixed first so the lockup knows where it must stop.
  const lw = 500; const lx = W - 110 - lw; const ly = 176; const lh = 62; const gap = 6;

  // The lockup: mark, wordmark, publication, tagline.
  const mx = 120; const my = 132; const ms = 150;
  S.mark(STATIC_LEVEL, { x: mx, y: my, size: ms });
  const tx = mx + ms + 34;
  const col = lx - 56 - tx;
  const nameSize = fit(brand.NAME, { from: 70, max: col, track: 0.12, floor: 40 });
  S.text(brand.NAME, { x: tx, y: my + 72, size: nameSize, color: marks.INK, weight: 0.11, track: 0.12 });
  const pub = brand.PUBLICATION.toUpperCase();
  S.text(pub, { x: tx + 3, y: my + 114, size: fit(pub, { from: 23, max: col, track: 0.16 }), color: marks.INK_DIM, weight: 0.10, track: 0.16 });
  S.text(brand.TAGLINE, { x: tx + 3, y: my + 160, size: fit(brand.TAGLINE, { from: 24, max: col, track: 0.03 }), color: marks.ACCENT, weight: 0.10, track: 0.03 });

  // The scale, with no band singled out.
  const bands = [...brand.LEVELS].sort((x, y) => y.level - x.level);
  const units = bands.reduce((n, b) => n + (b.band[1] - b.band[0] + 1), 0);
  const unit = (lw - gap * (bands.length - 1)) / units;
  let cx = lx;
  for (const b of bands) {
    const bw = (b.band[1] - b.band[0] + 1) * unit;
    S.rect({ x: cx, y: ly, w: bw, h: lh, r: 8, color: marks.HEAT[b.level], alpha: 0.9 });
    const n = String(b.level);
    S.text(n, { x: cx + bw / 2 - measureText(n, { size: 30, track: 0 }) / 2, y: ly + lh / 2 + 11, size: 30, color: marks.GROUND, weight: 0.12, track: 0 });
    cx += bw + gap;
  }
  S.text('CALM', { x: lx, y: ly - 18, size: 19, color: marks.INK_DIM, weight: 0.10, track: 0.16 });
  S.text('SEVERE', { x: lx + lw, y: ly - 18, size: 19, color: marks.INK_DIM, weight: 0.10, track: 0.16, align: 'right' });
  const l1 = 'How much is happening in AI.';
  const l2 = 'Counted hourly. Not how bad it is.';
  S.text(l1, { x: lx, y: ly + lh + 42, size: fit(l1, { from: 21, max: lw, track: 0.02 }), color: marks.INK, weight: 0.095, track: 0.02 });
  S.text(l2, { x: lx, y: ly + lh + 74, size: fit(l2, { from: 21, max: lw, track: 0.02 }), color: marks.INK_DIM, weight: 0.095, track: 0.02 });

  return S.png();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const files = [['x-profile.png', profilePng()], ['x-header.png', headerPng()]];
  for (const [name, bytes] of files) {
    await writeFile(path.join(OUT, name), bytes);
    console.log(`wrote assets/brand/${name}  ${bytes.length} bytes`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(`brand-assets: ${err.stack ?? err}`); process.exitCode = 1; });
}
