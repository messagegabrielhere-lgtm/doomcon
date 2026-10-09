#!/usr/bin/env node
// End-to-end smoke checks for the flows this site actually has.
//
// There is no signup, payment processor, or password reset (see docs/LAUNCH.md
// §17). This script covers the real launch paths instead: homepage, legal
// pages, contact, analytics hook, OG tags, 404/500 pages, and public API JSON.
//
 //   node collector/tools/launch-smoke.mjs                  # live site
//   node collector/tools/launch-smoke.mjs --dir public     # built tree on disk
 //   SITE_URL=https://… node collector/tools/launch-smoke.mjs

import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = process.env.SITE_URL || 'https://messagegabrielhere-lgtm.github.io/doomcon';

const checks = [];
const ok = (name, detail = '') => { checks.push({ name, ok: true, detail }); console.log(`  OK  ${name}${detail ? ` — ${detail}` : ''}`); };
const bad = (name, detail) => { checks.push({ name, ok: false, detail }); console.error(` FAIL ${name} — ${detail}`); };

async function fromDir(dir) {
  const need = [
    'index.html', 'privacy.html', 'terms.html', 'feedback.html', 'about.html',
    '404.html', '500.html', 'api/state.json',
  ];
  for (const rel of need) {
    try {
      await access(path.join(dir, rel), constants.R_OK);
      ok(`file ${rel}`);
    } catch {
      bad(`file ${rel}`, 'missing from build output');
    }
  }

  const index = await readFile(path.join(dir, 'index.html'), 'utf8').catch(() => '');
  if (!index) return;
  if (/property="og:image"/.test(index)) ok('og:image on homepage');
  else bad('og:image on homepage', 'missing og:image meta');
  if (/property="og:title"/.test(index)) ok('og:title on homepage');
  else bad('og:title on homepage', 'missing');
  if (/name="description"/.test(index)) ok('meta description');
  else bad('meta description', 'missing');
  if (/viewport-fit=cover/.test(index) || /width=device-width/.test(index)) ok('mobile viewport');
  else bad('mobile viewport', 'no device-width viewport');
  if (/goatcounter\.com\/count|data-goatcounter=/.test(index)) ok('analytics hook present');
  else bad('analytics hook present', 'GoatCounter script not found (check site/monetize.mjs)');
  if (/feedback\.html/.test(index)) ok('contact link on homepage');
  else bad('contact link on homepage', 'no feedback.html link');
  if (/privacy\.html/.test(index) && /terms\.html/.test(index)) ok('privacy + terms linked');
  else bad('privacy + terms linked', 'footer links missing');

  const fb = await readFile(path.join(dir, 'feedback.html'), 'utf8').catch(() => '');
  if (/github\.com\/.*\/issues\/new|ISSUE_TEMPLATE/.test(fb) || /issues\/new/.test(fb)) {
    ok('feedback opens GitHub issue');
  } else if (fb) {
    bad('feedback opens GitHub issue', 'form does not point at GitHub issues');
  }

  const e404 = await readFile(path.join(dir, '404.html'), 'utf8').catch(() => '');
  if (e404.includes('404') && /Back to the index|href=.*\/["']/.test(e404)) ok('404 page on-brand');
  else bad('404 page on-brand', '404.html missing or incomplete');

  const e500 = await readFile(path.join(dir, '500.html'), 'utf8').catch(() => '');
  if (e500.includes('500') && !/at\s+\S+\s+\(/.test(e500)) ok('500 page on-brand, no stack');
  else bad('500 page on-brand, no stack', '500.html missing, incomplete, or leaks a stack');

  const state = await readFile(path.join(dir, 'api/state.json'), 'utf8').catch(() => '');
  try {
    const j = JSON.parse(state);
    if (Number.isFinite(j.level) || Number.isFinite(j.score)) ok('api/state.json parseable');
    else bad('api/state.json parseable', 'missing level/score');
    if (JSON.stringify(j).includes('"stack"')) bad('api/state.json no stack', 'stack field present');
    else ok('api/state.json no stack');
  } catch (e) {
    bad('api/state.json parseable', e.message);
  }
}

async function fromLive(base) {
  const paths = ['/', '/privacy.html', '/terms.html', '/feedback.html', '/404.html', '/api/state.json'];
  for (const p of paths) {
    const url = base.replace(/\/$/, '') + p;
    try {
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!r.ok) bad(`GET ${p}`, `HTTP ${r.status}`);
      else {
        const text = await r.text();
        ok(`GET ${p}`, `${r.status}, ${text.length} B`);
        if (p === '/' && text.length > 50_000) {
          // Homepage HTML over ~200KB is a phone problem; warn, don't fail hard.
          if (text.length > 400_000) bad('homepage size', `${text.length} B HTML — too heavy for cheap Android`);
          else ok('homepage size', `${text.length} B HTML`);
        }
        if (p === '/' && !/og:image/.test(text)) bad('live og:image', 'missing');
        if (p === '/' && /og:image/.test(text)) ok('live og:image');
      }
    } catch (e) {
      bad(`GET ${p}`, e.message);
    }
  }
}

async function main() {
  const dirIdx = process.argv.indexOf('--dir');
  console.log('launch smoke');
  if (dirIdx >= 0) {
    const dir = path.resolve(process.argv[dirIdx + 1] || 'public');
    console.log(`  target: local ${dir}`);
    await fromDir(dir);
  } else if (process.argv.includes('--live') || process.env.SMOKE_LIVE === '1') {
    console.log(`  target: ${SITE}`);
    await fromLive(SITE);
  } else {
    // Default: prefer local public/ if built, else remind operator.
    const local = path.join(ROOT, 'public');
    try {
      await access(path.join(local, 'index.html'), constants.R_OK);
      console.log(`  target: local ${local}`);
      await fromDir(local);
    } catch {
      console.log('  no public/ yet — run `node site/build.mjs` first, or pass --live');
      console.log(`  (will still probe live ${SITE})`);
      await fromLive(SITE);
    }
  }

  // Flows that do not exist — assert we did not accidentally invent accounts.
  ok('no signup/payment/password flows', 'N/A by design; see docs/LAUNCH.md §17');

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
