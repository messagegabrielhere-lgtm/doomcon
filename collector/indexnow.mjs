#!/usr/bin/env node
// Ping IndexNow after a publish so Bing/Yandex/Seznam learn about fresh URLs
// without waiting on their crawl schedule. Google does not use IndexNow; the
// ordinary sitemap + news-sitemap remain the Google path (FINDABILITY.md).
//
//   node collector/indexnow.mjs                  # key pages + news sitemap
//   node collector/indexnow.mjs --url https://…  # one or more URLs
//
// Key file is published at /{KEY}.txt by site/build.mjs. Failures are
// non-fatal: a search-engine outage must not red the collect job.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const INDEXNOW_KEY = 'd00mc0n7a11yc0un75a1d0e5n07pr3d1c7';
export const INDEXNOW_HOST = 'siren.watch';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINTS = Object.freeze([
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
]);

const ALWAYS = Object.freeze([
  '/',
  '/news.html',
  '/methodology.html',
  '/guide.html',
  '/p-doom.html',
  '/ai-doomsday-clock.html',
  '/jobs.html',
  '/race.html',
  '/sitemap.xml',
  '/news-sitemap.xml',
  '/llms.txt',
]);

function keyLocation() {
  return `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
}

function abs(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `https://${INDEXNOW_HOST}${p}`;
}

/** Pull <loc> values out of a news-sitemap (or ordinary sitemap) file. */
export function locsFromSitemap(xml, cap = 80) {
  const out = [];
  for (const m of String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    out.push(m[1].trim());
    if (out.length >= cap) break;
  }
  return out;
}

export function defaultUrlList({ outDir = join(ROOT, 'public') } = {}) {
  const urls = ALWAYS.map(abs);
  const newsPath = join(outDir, 'news-sitemap.xml');
  if (existsSync(newsPath)) {
    try {
      urls.push(...locsFromSitemap(readFileSync(newsPath, 'utf8'), 80));
    } catch { /* publish without a news sitemap is fine */ }
  }
  return [...new Set(urls)];
}

export async function submitIndexNow(urlList, {
  fetchImpl = fetch,
  endpoints = ENDPOINTS,
  key = INDEXNOW_KEY,
  host = INDEXNOW_HOST,
} = {}) {
  const list = [...new Set(urlList.map(abs))].slice(0, 10_000);
  if (!list.length) return { ok: true, submitted: 0, results: [] };

  const body = JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: list,
  });

  const results = [];
  for (const endpoint of endpoints) {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body,
        signal: AbortSignal.timeout(20_000),
      });
      results.push({ endpoint, status: res.status, ok: res.status >= 200 && res.status < 300 || res.status === 202 });
    } catch (err) {
      results.push({ endpoint, status: 0, ok: false, error: err.message });
    }
  }
  return { ok: results.some((r) => r.ok), submitted: list.length, results, keyLocation: keyLocation() };
}

async function main(argv) {
  const urls = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) { urls.push(argv[++i]); continue; }
  }
  const list = urls.length ? urls : defaultUrlList();
  console.log(`indexnow: submitting ${list.length} URLs (key ${keyLocation()})`);
  const out = await submitIndexNow(list);
  for (const r of out.results) {
    console.log(`  ${r.endpoint} → ${r.status}${r.error ? ` (${r.error})` : ''}`);
  }
  if (!out.ok) {
    console.warn('indexnow: no endpoint accepted the payload; search engines will catch up via sitemap');
    process.exitCode = 0; // never fail the publish lane
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).catch((err) => {
    console.warn(`indexnow: ${err.message}`);
    process.exitCode = 0;
  });
}
