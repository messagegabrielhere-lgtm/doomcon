#!/usr/bin/env node
// FINDABILITY #322 — keep /classic.html in sitemap.xml across newsroom /
// orphan Publish that rebuilds from a mid-flight checkout older than #318
// (or otherwise drops the loc). Tip overlay alone is wiped within one refresh.
//
// Usage:
//   node collector/tools/ensure-classic-sitemap.mjs <sitemap.xml>
// Updates in place when the classic loc is missing. Idempotent when present.
//   node collector/tools/ensure-classic-sitemap.mjs --selftest

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CLASSIC_SITEMAP_LOC = 'https://siren.watch/classic.html';

/**
 * @param {string} xml
 * @returns {boolean}
 */
export function hasClassicSitemapLoc(xml) {
  return /<loc>\s*https:\/\/siren\.watch\/classic\.html\s*<\/loc>/i.test(String(xml || ''));
}

/**
 * Inject a classic.html url entry when missing.
 * Prefers lastmod from the home `/` entry so the panel tracks the index hour.
 *
 * @param {string} xml
 * @param {{ now?: string }} [opts]
 * @returns {{ xml: string, injected: boolean }}
 */
export function ensureClassicSitemapLoc(xml, opts = {}) {
  const src = String(xml || '');
  if (hasClassicSitemapLoc(src)) return { xml: src, injected: false };
  const homeLast = src.match(
    /<loc>\s*https:\/\/siren\.watch\/\s*<\/loc>\s*<lastmod>([^<]+)/i,
  );
  const lastmod = (homeLast && homeLast[1].trim())
    || opts.now
    || new Date().toISOString();
  const block = `  <url>
    <loc>${CLASSIC_SITEMAP_LOC}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  const inst = src.match(
    /(<loc>\s*https:\/\/siren\.watch\/instruments\.html\s*<\/loc>[\s\S]*?<\/url>\n)/i,
  );
  let out;
  if (inst) {
    out = src.replace(inst[1], `${inst[1]}${block}`);
  } else if (/<urlset\b[^>]*>/i.test(src)) {
    out = src.replace(/(<urlset\b[^>]*>\n?)/i, `$1${block}`);
  } else {
    out = src + (src.endsWith('\n') ? '' : '\n') + block;
  }
  return { xml: out, injected: true };
}

function main(argv) {
  if (argv[0] === '--selftest') {
    const bare = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://siren.watch/</loc>
    <lastmod>2026-10-16T17:51:10.137Z</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://siren.watch/instruments.html</loc>
    <lastmod>2026-10-16T17:51:10.137Z</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;
    if (hasClassicSitemapLoc(bare)) throw new Error('bare fixture must lack classic');
    const once = ensureClassicSitemapLoc(bare);
    if (!once.injected) throw new Error('expected inject');
    if (!hasClassicSitemapLoc(once.xml)) throw new Error('inject failed');
    if (!once.xml.includes('2026-10-16T17:51:10.137Z')) {
      throw new Error('expected home lastmod on classic entry');
    }
    const twice = ensureClassicSitemapLoc(once.xml);
    if (twice.injected) throw new Error('second pass must be idempotent');
    if (twice.xml !== once.xml) throw new Error('idempotent rewrite drifted');
    console.log('ensure-classic-sitemap: selftest ok');
    return;
  }
  const file = argv[0];
  if (!file) {
    console.error('usage: node collector/tools/ensure-classic-sitemap.mjs <sitemap.xml>');
    process.exit(2);
  }
  const before = readFileSync(file, 'utf8');
  const { xml, injected } = ensureClassicSitemapLoc(before);
  if (injected) {
    writeFileSync(file, xml);
    console.log('injected classic.html into sitemap (#322)');
  } else {
    console.log('classic sitemap loc already present');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
