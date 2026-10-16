#!/usr/bin/env node
// FINDABILITY #210 — merge tip news:keywords probe needles into a rebuilt
// news-sitemap.xml so orphan/overlay Publish on tip < #208 cannot wipe
// Roadster / Starshield / Bluesky / … overlays that seo-daily probes.
//
// Usage:
//   node collector/tools/merge-news-keyword-tip.mjs <tip.xml> <new.xml>
// Updates <new.xml> in place. No-op (exit 0) when tip is missing or empty.
//   node collector/tools/merge-news-keyword-tip.mjs --selftest

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NEWS_KEYWORD_PROBE_LABS } from './seo-daily.mjs';

/** Google News practical keyword cap (matches site/templates/newsSitemap.mjs). */
export const NEWS_KEYWORD_CAP = 12;

function decodeXmlText(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labRe(lab) {
  return new RegExp(
    `(?:^|[^A-Za-z0-9])${String(lab).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9]|$)`,
    'i',
  );
}

function splitKeywords(kw) {
  return String(kw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Probe labs present in a news:keywords string.
 * @param {string} keywords
 * @param {readonly string[]} [labs]
 * @returns {string[]}
 */
export function probeLabsInKeywords(keywords, labs = NEWS_KEYWORD_PROBE_LABS) {
  const out = [];
  for (const lab of labs) {
    if (labRe(lab).test(keywords)) out.push(lab);
  }
  return out;
}

/**
 * Map <loc> → tip probe lab names found in that entry's news:keywords.
 * @param {string} tipXml
 * @param {readonly string[]} [labs]
 * @returns {Map<string, string[]>}
 */
export function tipProbeKeywordsByLoc(tipXml, labs = NEWS_KEYWORD_PROBE_LABS) {
  const map = new Map();
  for (const block of String(tipXml || '').matchAll(/<url\b[\s\S]*?<\/url>/gi)) {
    const chunk = block[0];
    const locM = chunk.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i);
    if (!locM) continue;
    const loc = decodeXmlText(locM[1]).trim();
    if (!loc) continue;
    const kwM = chunk.match(/<news:keywords>\s*([\s\S]*?)\s*<\/news:keywords>/i);
    const probes = probeLabsInKeywords(decodeXmlText(kwM ? kwM[1] : ''), labs);
    if (probes.length) map.set(loc, probes);
  }
  return map;
}

/**
 * FINDABILITY #218 — when MAI-Base* is in the keyword set, drop bare Coinbase
 * `Base` that pre-#216 rebuilds still emit inside MAI-Base-* titles.
 * @param {string[]} bits
 * @returns {string[]}
 */
export function dropBareBaseBesideMai(bits) {
  const out = [...bits];
  if (!out.some((b) => /^MAI-Base\b/i.test(String(b)))) return out;
  return out.filter((b) => String(b) !== 'Base');
}

/**
 * Merge tip probe-lab keywords into rebuilt news-sitemap XML for matching <loc>.
 * Missing tip probes are prepended so they survive the 12-cap.
 * FINDABILITY #218 — also strip bare `Base` beside restored MAI-Base* needles.
 *
 * @param {string} tipXml
 * @param {string} newXml
 * @param {readonly string[]} [labs]
 * @returns {{ xml: string, merged: number, locs: number }}
 */
export function mergeNewsKeywordTip(tipXml, newXml, labs = NEWS_KEYWORD_PROBE_LABS) {
  const tipMap = tipProbeKeywordsByLoc(tipXml, labs);
  if (!tipMap.size) return { xml: String(newXml || ''), merged: 0, locs: 0 };

  let merged = 0;
  let locs = 0;
  const xml = String(newXml || '').replace(/<url\b[\s\S]*?<\/url>/gi, (chunk) => {
    const locM = chunk.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i);
    if (!locM) return chunk;
    const loc = decodeXmlText(locM[1]).trim();
    const tipProbes = tipMap.get(loc);
    if (!tipProbes || !tipProbes.length) return chunk;

    const kwM = chunk.match(/<news:keywords>\s*([\s\S]*?)\s*<\/news:keywords>/i);
    const current = decodeXmlText(kwM ? kwM[1] : '');
    const missing = tipProbes.filter((lab) => !labRe(lab).test(current));
    const bits = dropBareBaseBesideMai([...missing, ...splitKeywords(current)]);
    const next = [...new Set(bits)].slice(0, NEWS_KEYWORD_CAP).join(', ');
    if (next === current) return chunk;

    merged += missing.length;
    locs += 1;
    const tag = `<news:keywords>${escXml(next)}</news:keywords>`;
    if (kwM) return chunk.replace(kwM[0], tag);
    // Rare: tip had keywords but rebuild omitted the element — insert before </news:news>.
    if (/<\/news:news>/i.test(chunk)) {
      return chunk.replace(/<\/news:news>/i, `      ${tag}\n    </news:news>`);
    }
    return chunk;
  });

  return { xml, merged, locs };
}

export function selftest() {
  const tip = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/roadster-a.html</loc>
    <news:news>
      <news:title>Tesla Roadster flying cars tape</news:title>
      <news:keywords>Tesla, Roadster, FSD, AI, SIREN</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://siren.watch/item/starshield-b.html</loc>
    <news:news>
      <news:title>SpaceX Starshield Ukraine access</news:title>
      <news:keywords>SpaceX, Starshield, AI, SIREN</news:keywords>
    </news:news>
  </url>
</urlset>`;

  const rebuilt = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/roadster-a.html</loc>
    <news:news>
      <news:title>Tesla Roadster flying cars tape</news:title>
      <news:keywords>Tesla, FSD, AI, artificial intelligence, SIREN</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://siren.watch/item/starshield-b.html</loc>
    <news:news>
      <news:title>SpaceX Starshield Ukraine access</news:title>
      <news:keywords>SpaceX, AI, artificial intelligence, SIREN</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://siren.watch/item/other.html</loc>
    <news:news>
      <news:title>Unrelated</news:title>
      <news:keywords>Google, AI, SIREN</news:keywords>
    </news:news>
  </url>
</urlset>`;

  const once = mergeNewsKeywordTip(tip, rebuilt);
  if (once.merged < 2 || once.locs !== 2) {
    throw new Error(`expected ≥2 merges on 2 locs, got merged=${once.merged} locs=${once.locs}`);
  }
  if (!/Roadster/.test(once.xml) || !/Starshield/.test(once.xml)) {
    throw new Error('merged XML missing Roadster/Starshield');
  }
  // Roadster must appear in the roadster loc keywords, not only as a title.
  const roadsterChunk = once.xml.match(
    /<loc>\s*https:\/\/siren\.watch\/item\/roadster-a\.html\s*<\/loc>[\s\S]*?<\/url>/i,
  );
  if (!roadsterChunk || !/<news:keywords>[^<]*Roadster/.test(roadsterChunk[0])) {
    throw new Error('Roadster not restored into roadster-a keywords');
  }
  const otherChunk = once.xml.match(
    /<loc>\s*https:\/\/siren\.watch\/item\/other\.html\s*<\/loc>[\s\S]*?<\/url>/i,
  );
  if (!otherChunk || /Roadster|Starshield/.test(otherChunk[0])) {
    throw new Error('unrelated loc must not gain tip probes');
  }

  const twice = mergeNewsKeywordTip(tip, once.xml);
  if (twice.merged !== 0) {
    throw new Error(`idempotent merge expected 0, got ${twice.merged}`);
  }
  if (twice.xml !== once.xml) {
    throw new Error('idempotent merge changed XML');
  }

  const empty = mergeNewsKeywordTip('', rebuilt);
  if (empty.merged !== 0 || empty.xml !== rebuilt) {
    throw new Error('empty tip must be a no-op');
  }

  if (!NEWS_KEYWORD_PROBE_LABS.includes('Roadster')
    || !NEWS_KEYWORD_PROBE_LABS.includes('Starshield')) {
    throw new Error('probe labs must include Roadster + Starshield');
  }

  // FINDABILITY #218 — restore MAI-Base* and drop bare Base from pre-#216 rebuilds.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('MAI-Base')
    || !NEWS_KEYWORD_PROBE_LABS.includes('MAI-Base-2')) {
    throw new Error('probe labs must include MAI-Base + MAI-Base-2');
  }
  // FINDABILITY #222 — Muse Spark product-class needles stay in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Muse Spark')
    || !NEWS_KEYWORD_PROBE_LABS.includes('Muse Spark Open')) {
    throw new Error('probe labs must include Muse Spark + Muse Spark Open');
  }
  // FINDABILITY #224 — Tencent Cloud product-class needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Tencent Cloud')) {
    throw new Error('probe labs must include Tencent Cloud');
  }
  // FINDABILITY #226 — CERT-In agency needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('CERT-In')) {
    throw new Error('probe labs must include CERT-In');
  }
  // FINDABILITY #228 — DeepSeek V4.1 Flash product-class needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('DeepSeek V4.1 Flash')) {
    throw new Error('probe labs must include DeepSeek V4.1 Flash');
  }
  // FINDABILITY #231 — Nemotron 3.5 Super VL product-class needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Nemotron 3.5 Super VL')) {
    throw new Error('probe labs must include Nemotron 3.5 Super VL');
  }
  // FINDABILITY #234 — Nemotron 3.5 Bolt companion needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Bolt')) {
    throw new Error('probe labs must include Bolt');
  }
  // FINDABILITY #236 — DeepSeek V4 Pro product-class needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('DeepSeek V4 Pro')) {
    throw new Error('probe labs must include DeepSeek V4 Pro');
  }
  // FINDABILITY #238 — Qwen3.8 product-class needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen3.8')) {
    throw new Error('probe labs must include Qwen3.8');
  }
  // FINDABILITY #241 — Airship company needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Airship')) {
    throw new Error('probe labs must include Airship');
  }
  if (dropBareBaseBesideMai(['MAI-Base', 'Base', 'Copilot']).includes('Base')) {
    throw new Error('dropBareBaseBesideMai must remove bare Base beside MAI-Base');
  }
  if (!dropBareBaseBesideMai(['Coinbase', 'Base', 'AI']).includes('Base')) {
    throw new Error('dropBareBaseBesideMai must keep Base without MAI-Base');
  }
  const maiTip = `<?xml version="1.0"?><urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url><loc>https://siren.watch/item/mai.html</loc>
    <news:news><news:title>Microsoft unveils MAI-Base-2</news:title>
      <news:keywords>MAI-Base, MAI-Base-2, Microsoft, Copilot, AI, SIREN</news:keywords>
    </news:news></url></urlset>`;
  const maiRebuilt = `<?xml version="1.0"?><urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url><loc>https://siren.watch/item/mai.html</loc>
    <news:news><news:title>Microsoft unveils MAI-Base-2</news:title>
      <news:keywords>DeepSeek, Microsoft, Base, Copilot, AI, SIREN</news:keywords>
    </news:news></url></urlset>`;
  const maiOnce = mergeNewsKeywordTip(maiTip, maiRebuilt);
  if (maiOnce.locs !== 1 || !/MAI-Base/.test(maiOnce.xml)) {
    throw new Error(`MAI-Base merge failed: ${JSON.stringify(maiOnce)}`);
  }
  const maiKw = maiOnce.xml.match(/<news:keywords>([^<]+)/)?.[1] || '';
  if (/(^|,\s*)Base(,|$)/.test(maiKw) || !/MAI-Base-2/.test(maiKw)) {
    throw new Error(`MAI merge must drop bare Base and keep MAI-Base-2: ${maiKw}`);
  }
  // Tip already clean + rebuild still has Base beside MAI-Base → still strip Base.
  const maiDirty = maiRebuilt.replace(
    'DeepSeek, Microsoft, Base, Copilot',
    'MAI-Base, MAI-Base-2, Microsoft, Base, Copilot',
  );
  const maiClean = mergeNewsKeywordTip(maiTip, maiDirty);
  if (maiClean.locs !== 1) {
    throw new Error(`expected Base strip when probes already present, locs=${maiClean.locs}`);
  }
  const maiCleanKw = maiClean.xml.match(/<news:keywords>([^<]+)/)?.[1] || '';
  if (/(^|,\s*)Base(,|$)/.test(maiCleanKw)) {
    throw new Error(`Base strip failed: ${maiCleanKw}`);
  }

  console.log('merge-news-keyword-tip selftest: ok');
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--selftest')) {
    selftest();
    return;
  }
  const tipPath = argv[0];
  const newPath = argv[1];
  if (!tipPath || !newPath) {
    console.error('usage: merge-news-keyword-tip.mjs <tip.xml> <new.xml>');
    process.exit(2);
  }
  let tipXml = '';
  try {
    tipXml = readFileSync(tipPath, 'utf8');
  } catch {
    console.log('merge-news-keyword-tip: tip missing; skip');
    return;
  }
  let newXml = '';
  try {
    newXml = readFileSync(newPath, 'utf8');
  } catch (err) {
    console.error(`merge-news-keyword-tip: cannot read ${newPath}: ${err.message || err}`);
    process.exit(1);
  }
  const { xml, merged, locs } = mergeNewsKeywordTip(tipXml, newXml);
  if (merged > 0) {
    writeFileSync(newPath, xml);
    console.log(`merged ${merged} tip news:keywords probe needle(s) across ${locs} loc(s) (#210)`);
  } else {
    console.log('merge-news-keyword-tip: nothing to merge');
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(`merge-news-keyword-tip: ${err.message || err}`);
    process.exit(1);
  }
}
