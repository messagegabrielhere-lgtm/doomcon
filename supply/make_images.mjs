// Draws share cards (1200x630) and Pinterest pins (1000x1500) for the prep
// pages into assets/img/, which the site build copies to /img/.
//   node supply/make_images.mjs
// Authoring only: needs Playwright, which the site build does not.
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { CATALOG } from './catalog.mjs';
import { SEO } from './seo.mjs';
import { tileSvg } from '../site/tileicons.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'img');
const FONTS = pathToFileURL(path.join(ROOT, 'assets', 'fonts', 'fonts.css')).href;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const icon = (n, size) => tileSvg(n).replace('<svg ', `<svg width="${size}" height="${size}" style="image-rendering:pixelated" `);
const total = CATALOG.reduce((n, c) => n + c[3].length, 0).toLocaleString('en-US');

const base = (w, h, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>*{box-sizing:border-box;margin:0}body{width:${w}px;height:${h}px;background:#000;color:#E6EAF0;font-family:"IBM Plex Sans",system-ui,sans-serif;overflow:hidden}
.frame{position:absolute;inset:24px;border:3px solid #4ADE80;border-radius:6px;padding:${w > 1100 ? 56 : 64}px;display:flex;flex-direction:column}
.k{font:700 ${w > 1100 ? 22 : 28}px/1.2 "IBM Plex Mono",monospace;letter-spacing:.14em;color:#4ADE80}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font:700 ${w > 1100 ? 24 : 34}px/1 "IBM Plex Mono",monospace;color:#AEB7C3;letter-spacing:.06em}
.foot b{color:#4ADE80}</style></head><body><div class="frame">${body}</div></body></html>`;

// [file, w, h, eyebrow, headline, sub, icon]
const jobs = [
  ['og-supply-depot', 1200, 630, 'THE SUPPLY DEPOT', `${total} emergency prep supplies, in one checklist`, 'Water · food · power · radios · first aid · pets · kids', 'crate'],
  ['og-prep-downloads', 1200, 630, 'FREE DOWNLOADS', 'Free prep spreadsheets and printable checklists', 'Water calculator · pantry tracker · power budget · PDFs', 'download'],
  ['og-survival-llm', 1200, 630, 'SURVIVAL LLM', 'A free AI that works with no internet', '1.5 million offline articles · cites every answer', 'chip'],
  ...CATALOG.map(([id, title, , items]) => [`og-${SEO[id].slug}`, 1200, 630, `THE SUPPLY DEPOT · ${items.length} SUPPLIES`, SEO[id].q, title, 'crate']),
  ['pin-72-hour-kit-checklist', 1000, 1500, 'FREE PRINTABLE', '72-Hour Emergency Kit Checklist', 'Water · food · light · radio · first aid · documents. Based on Ready.gov.', 'download'],
  ['pin-supply-list', 1000, 1500, 'THE COMPLETE LIST', `${total} Emergency Prep Supplies`, '25 categories, from water storage to power stations to pet kits. Searchable and free.', 'crate'],
  ['pin-water-calculator', 1000, 1500, 'FREE SPREADSHEET', 'How Much Water Do You Need?', 'Enter people, pets and days. One gallon per person per day, per Ready.gov.', 'download'],
  ['pin-pantry-tracker', 1000, 1500, 'FREE SPREADSHEET', 'Pantry Inventory & Expiry Tracker', 'Rows turn amber 90 days before food expires and red after it.', 'shelf'],
  ['pin-family-plan', 1000, 1500, 'FREE PRINTABLE', 'Family Emergency Plan', 'Contacts, meeting places, medical needs, shut-offs and pets. One copy per go-bag.', 'download'],
  ['pin-survival-llm', 1000, 1500, 'FREE OFFLINE AI', 'An AI That Works With No Internet', 'Survival LLM: 1.5 million offline articles on your own computer.', 'chip'],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [file, w, h, k, head, sub, ic] of jobs) {
  const wide = w > h;
  const body = wide
    ? `<div style="display:flex;gap:44px;align-items:flex-start"><div style="flex:1"><p class="k">${esc(k)}</p>
       <h1 style="font:700 ${head.length > 48 ? 54 : 64}px/1.05 'IBM Plex Sans',sans-serif;margin:22px 0 22px;letter-spacing:-.01em">${esc(head)}</h1>
       <p style="font-size:28px;line-height:1.35;color:#AEB7C3">${esc(sub)}</p></div>${icon(ic, 176)}</div>
       <div class="foot"><span>FREE · NO SIGN-UP</span><b>SIREN.WATCH</b></div>`
    : `<p class="k">${esc(k)}</p><div style="margin:70px 0 50px">${icon(ic, 300)}</div>
       <h1 style="font:700 104px/1.02 'IBM Plex Sans',sans-serif;letter-spacing:-.02em">${esc(head)}</h1>
       <p style="font-size:42px;line-height:1.35;color:#AEB7C3;margin-top:40px">${esc(sub)}</p>
       <div class="foot"><span>FREE · NO SIGN-UP</span><b>SIREN.WATCH</b></div>`;
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(base(w, h, body), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, `${file}.jpg`), type: 'jpeg', quality: 86 });
  await page.close();
}
await browser.close();
console.log(`${jobs.length} images written to assets/img`);
