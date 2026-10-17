#!/usr/bin/env node
// FINDABILITY #210 — merge tip news:keywords probe needles into a rebuilt
// news-sitemap.xml so orphan/overlay Publish on tip < #208 cannot wipe
// Roadster / Starshield / Bluesky / … overlays that seo-daily probes.
//
// FINDABILITY #300 — after tip merge (or when tip is missing), also heal
// NEWS_KEYWORD_PROBE_LABS from each entry's news:title so a newsroom rebuild
// on tip < newest probe (e.g. Vercel #298) cannot leave title↔keywords lag
// even if tip stash raced or the 12-cap dropped the surface.
//
// Usage:
//   node collector/tools/merge-news-keyword-tip.mjs <tip.xml> <new.xml>
// Updates <new.xml> in place. Tip missing → title-heal only (#300).
//   node collector/tools/merge-news-keyword-tip.mjs --selftest

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NEWS_KEYWORD_PROBE_LABS } from './seo-daily.mjs';
import { labNeedleRe } from './lab-needle.mjs';

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

/** FINDABILITY #310/#388/#431/#487 — hyphen↔space + letter↔digit + Flash gap + ECDSA seed flex via shared labNeedleRe. */
function labRe(lab) {
  return labNeedleRe(lab);
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

/**
 * FINDABILITY #300 — prepend NEWS_KEYWORD_PROBE_LABS that appear in
 * news:title but are missing from news:keywords (same 12-cap + Base hygiene).
 * Self-heals tip-stash races and pre-probe rebuilds without doorway URLs.
 *
 * @param {string} xml
 * @param {readonly string[]} [labs]
 * @returns {{ xml: string, healed: number, locs: number }}
 */
export function healNewsKeywordProbesFromTitle(xml, labs = NEWS_KEYWORD_PROBE_LABS) {
  let healed = 0;
  let locs = 0;
  const out = String(xml || '').replace(/<url\b[\s\S]*?<\/url>/gi, (chunk) => {
    const titleM = chunk.match(/<news:title>\s*([\s\S]*?)\s*<\/news:title>/i);
    if (!titleM) return chunk;
    const title = decodeXmlText(titleM[1]);
    const kwM = chunk.match(/<news:keywords>\s*([\s\S]*?)\s*<\/news:keywords>/i);
    const current = decodeXmlText(kwM ? kwM[1] : '');
    const missing = [];
    for (const lab of labs) {
      const re = labRe(lab);
      if (!re.test(title)) continue;
      if (re.test(current)) continue;
      missing.push(lab);
    }
    if (!missing.length) return chunk;
    const bits = dropBareBaseBesideMai([...missing, ...splitKeywords(current)]);
    const next = [...new Set(bits)].slice(0, NEWS_KEYWORD_CAP).join(', ');
    if (next === current) return chunk;
    healed += missing.length;
    locs += 1;
    const tag = `<news:keywords>${escXml(next)}</news:keywords>`;
    if (kwM) return chunk.replace(kwM[0], tag);
    if (/<\/news:news>/i.test(chunk)) {
      return chunk.replace(/<\/news:news>/i, `      ${tag}\n    </news:news>`);
    }
    return chunk;
  });
  return { xml: out, healed, locs };
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
  // FINDABILITY #250 — ModelSphere product needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('ModelSphere')) {
    throw new Error('probe labs must include ModelSphere');
  }
  // FINDABILITY #256 — Krea / Krea 3 image-model needles stay in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Krea') || !NEWS_KEYWORD_PROBE_LABS.includes('Krea 3')) {
    throw new Error('probe labs must include Krea / Krea 3');
  }
  // FINDABILITY #258 — Flux 3 image-model needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Flux 3')) {
    throw new Error('probe labs must include Flux 3');
  }
  // FINDABILITY #260 — Together AI hosting needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Together AI')) {
    throw new Error('probe labs must include Together AI');
  }
  // FINDABILITY #267 — Terafab fab needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Terafab')) {
    throw new Error('probe labs must include Terafab');
  }
  // FINDABILITY #269 — Cohere lab needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Cohere')) {
    throw new Error('probe labs must include Cohere');
  }
  // FINDABILITY #271 — Accenture company needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Accenture')) {
    throw new Error('probe labs must include Accenture');
  }
  // FINDABILITY #273 — G7 forum needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('G7')) {
    throw new Error('probe labs must include G7');
  }
  // FINDABILITY #275 — Bee Frontier / Bee Eclipse stay in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Bee Frontier')) {
    throw new Error('probe labs must include Bee Frontier');
  }
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Bee Eclipse')) {
    throw new Error('probe labs must include Bee Eclipse');
  }
  // FINDABILITY #277 — Surface Laptop Ultra stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Surface Laptop Ultra')) {
    throw new Error('probe labs must include Surface Laptop Ultra');
  }
  // FINDABILITY #279 — RTX Spark stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('RTX Spark')) {
    throw new Error('probe labs must include RTX Spark');
  }
  // FINDABILITY #282 — Qwen 4 Max stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen 4 Max')) {
    throw new Error('probe labs must include Qwen 4 Max');
  }
  // FINDABILITY #286 — Beam stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Beam')) {
    throw new Error('probe labs must include Beam');
  }
  // FINDABILITY #302 — Elorian stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Elorian')) {
    throw new Error('probe labs must include Elorian');
  }
  // FINDABILITY #304 — Dell stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Dell')) {
    throw new Error('probe labs must include Dell');
  }
  // FINDABILITY #306 — NYC Council stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('NYC Council')) {
    throw new Error('probe labs must include NYC Council');
  }
  // FINDABILITY #340 — Replit company needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Replit')) {
    throw new Error('probe labs must include Replit');
  }
  // FINDABILITY #342 — Siri product needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Siri')) {
    throw new Error('probe labs must include Siri');
  }
  // FINDABILITY #344 — Claude Mythos 5 / Mythos 5 stay in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Claude Mythos 5')
    || !NEWS_KEYWORD_PROBE_LABS.includes('Mythos 5')) {
    throw new Error('probe labs must include Claude Mythos 5 + Mythos 5');
  }
  // FINDABILITY #346 — Qwen3.8-Max stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen3.8-Max')) {
    throw new Error('probe labs must include Qwen3.8-Max');
  }
  // FINDABILITY #348 — Xing 4.0 29B-A4B stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Xing 4.0 29B-A4B')) {
    throw new Error('probe labs must include Xing 4.0 29B-A4B');
  }
  // FINDABILITY #350 — PS5s plural companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('PS5s')) {
    throw new Error('probe labs must include PS5s');
  }
  // FINDABILITY #352 — Anthropic IPO event needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Anthropic IPO')) {
    throw new Error('probe labs must include Anthropic IPO');
  }
  // FINDABILITY #354 — Flying Roadster product-class companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Flying Roadster')) {
    throw new Error('probe labs must include Flying Roadster');
  }
  // FINDABILITY #356 — Bee AI product-class companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Bee AI')) {
    throw new Error('probe labs must include Bee AI');
  }
  // FINDABILITY #358 — AI safety bill event needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('AI safety bill')) {
    throw new Error('probe labs must include AI safety bill');
  }
  // FINDABILITY #360 — Amazon Web Services full-name companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Amazon Web Services')) {
    throw new Error('probe labs must include Amazon Web Services');
  }
  // FINDABILITY #364 — M5 Max Apple Silicon SKU companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('M5 Max')) {
    throw new Error('probe labs must include M5 Max');
  }
  // FINDABILITY #370 — NIST standards-body needle stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('NIST')) {
    throw new Error('probe labs must include NIST');
  }
  // FINDABILITY #380 — Allied Universal companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Allied Universal')) {
    throw new Error('probe labs must include Allied Universal');
  }
  // FINDABILITY #382 — Blackstone financing companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Blackstone')) {
    throw new Error('probe labs must include Blackstone');
  }
  // FINDABILITY #384 — Dory 1.0 SKU companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Dory 1.0')) {
    throw new Error('probe labs must include Dory 1.0');
  }
  // FINDABILITY #386 — Nemotron 3.5 version companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Nemotron 3.5')) {
    throw new Error('probe labs must include Nemotron 3.5');
  }
  // FINDABILITY #390 — Chrome browser-assistant companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Chrome')) {
    throw new Error('probe labs must include Chrome');
  }
  // FINDABILITY #394 — MOSS-Image companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('MOSS-Image')) {
    throw new Error('probe labs must include MOSS-Image');
  }
  // FINDABILITY #397 — ECDSA companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('ECDSA')) {
    throw new Error('probe labs must include ECDSA');
  }
  // FINDABILITY #487 — NSA cryptography seed/mystery title heal → ECDSA.
  {
    const ecdsaDirty = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/ecdsa-seed.html</loc>
    <news:news>
      <news:title>Anthropic Says Claude Cracked a 25-Year NSA Cryptography Seed Mystery in 30 Minutes</news:title>
      <news:keywords>Anthropic, Claude, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords>
    </news:news>
  </url>
</urlset>`;
    const ecdsaHealed = healNewsKeywordProbesFromTitle(ecdsaDirty);
    if (ecdsaHealed.healed < 1 || ecdsaHealed.locs !== 1) {
      throw new Error(`ECDSA seed-mystery heal expected 1 loc, got ${JSON.stringify(ecdsaHealed)}`);
    }
    if (!/<news:keywords>[^<]*ECDSA/.test(ecdsaHealed.xml)) {
      throw new Error('title heal must prepend ECDSA for NSA cryptography seed mystery title');
    }
  }
  // FINDABILITY #489 — Razor Lake-AX companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Razor Lake-AX')) {
    throw new Error('probe labs must include Razor Lake-AX');
  }
  {
    const razorDirty = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/razor-lake.html</loc>
    <news:news>
      <news:title>Intel confirms Razor Lake-AX which could deliver nearly four times Panther Lake’s AI performance</news:title>
      <news:keywords>Intel, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords>
    </news:news>
  </url>
</urlset>`;
    const razorHealed = healNewsKeywordProbesFromTitle(razorDirty);
    if (razorHealed.healed < 1 || razorHealed.locs !== 1) {
      throw new Error(`Razor Lake-AX heal expected 1 loc, got ${JSON.stringify(razorHealed)}`);
    }
    if (!/<news:keywords>[^<]*Razor Lake-AX/.test(razorHealed.xml)) {
      throw new Error('title heal must prepend Razor Lake-AX for Intel AI-PC SKU title');
    }
  }
  // FINDABILITY #404 — Ondas companion stays in tip merge probes.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Ondas')) {
    throw new Error('probe labs must include Ondas');
  }
  // FINDABILITY #310 — GPT-6 Astra space-form title heal.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('GPT-6 Astra')
    || !NEWS_KEYWORD_PROBE_LABS.includes('GPT-6.1 Astra')) {
    throw new Error('probe labs must include GPT-6 Astra + GPT-6.1 Astra');
  }
  const astraDirty = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/astra-space.html</loc>
    <news:news>
      <news:title>It took an octillion calculations to train GPT 6 Astra</news:title>
      <news:keywords>GPT, AI, artificial intelligence, SIREN, attention, forum</news:keywords>
    </news:news>
  </url>
</urlset>`;
  const astraHealed = healNewsKeywordProbesFromTitle(astraDirty);
  if (astraHealed.healed < 1 || astraHealed.locs !== 1) {
    throw new Error(`GPT 6 Astra space heal expected 1 loc, got ${JSON.stringify(astraHealed)}`);
  }
  if (!/<news:keywords>[^<]*GPT-6 Astra/.test(astraHealed.xml)) {
    throw new Error('title heal must prepend GPT-6 Astra for space-form title');
  }
  // FINDABILITY #388 — Qwen 3.8 spaced-form title heal via letter↔digit flex.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen3.8')) {
    throw new Error('probe labs must include Qwen3.8');
  }
  const qwen38Dirty = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/qwen38-space.html</loc>
    <news:news>
      <news:title>Dory 1.0 4B vs Qwen 3.8: a 4B against a three-tier line</news:title>
      <news:keywords>Dory 1.0, Nemotron, Qwen, NVIDIA, AI, artificial intelligence, SIREN, attention, press</news:keywords>
    </news:news>
  </url>
</urlset>`;
  const qwen38Healed = healNewsKeywordProbesFromTitle(qwen38Dirty);
  if (qwen38Healed.healed < 1 || qwen38Healed.locs !== 1) {
    throw new Error(`Qwen 3.8 spaced heal expected 1 loc, got ${JSON.stringify(qwen38Healed)}`);
  }
  if (!/<news:keywords>[^<]*Qwen3\.8/.test(qwen38Healed.xml)) {
    throw new Error('title heal must prepend Qwen3.8 for spaced-form title');
  }
  // FINDABILITY #431 — non-contiguous DeepSeek … V4.1 Flash title heal.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('DeepSeek V4.1 Flash')) {
    throw new Error('probe labs must include DeepSeek V4.1 Flash');
  }
  const flashGapDirty = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/flash-gap.html</loc>
    <news:news>
      <news:title>DeepSeek Launches V4.1-Flash-1017, Beats Claude Opus 5 On Some Benchmarks</news:title>
      <news:keywords>DeepSeek, DeepSeek-R, Google, AI, artificial intelligence, SIREN, China AI, attention, press</news:keywords>
    </news:news>
  </url>
</urlset>`;
  const flashGapHealed = healNewsKeywordProbesFromTitle(flashGapDirty);
  if (flashGapHealed.healed < 1 || flashGapHealed.locs !== 1) {
    throw new Error(`Flash non-contig heal expected 1 loc, got ${JSON.stringify(flashGapHealed)}`);
  }
  if (!/<news:keywords>[^<]*DeepSeek V4\.1 Flash/.test(flashGapHealed.xml)) {
    throw new Error('title heal must prepend DeepSeek V4.1 Flash for non-contig title');
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

  // FINDABILITY #300 — title heal restores Vercel without a tip stash.
  const vercelDirty = `<?xml version="1.0"?>
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://siren.watch/item/vercel-a.html</loc>
    <news:news>
      <news:title>Vercel data shows Jev posts fastest early AI model adoption</news:title>
      <news:keywords>Jev, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://siren.watch/item/vercel-b.html</loc>
    <news:news>
      <news:title>Jev is Vercel\u2019s fastest-adopted AI model ever</news:title>
      <news:keywords>Jev, OpenRouter, AI, artificial intelligence, SIREN, attention, press</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://siren.watch/item/mac-studios-only.html</loc>
    <news:news>
      <news:title>Meta Muse Spark Open brings 816B-parameter AI to Mac Studios</news:title>
      <news:keywords>Mac Studios, Muse Spark, Meta, Muse, AI, SIREN</news:keywords>
    </news:news>
  </url>
</urlset>`;
  const healed = healNewsKeywordProbesFromTitle(vercelDirty);
  // Two Vercel locs + Mac Studios row may also heal Muse Spark Open (probe).
  if (healed.healed < 2 || healed.locs < 2) {
    throw new Error(`title heal expected ≥2 on ≥2 locs, got healed=${healed.healed} locs=${healed.locs}`);
  }
  const va = healed.xml.match(
    /<loc>\s*https:\/\/siren\.watch\/item\/vercel-a\.html\s*<\/loc>[\s\S]*?<\/url>/i,
  );
  if (!va || !/<news:keywords>[^<]*Vercel/.test(va[0])) {
    throw new Error('title heal must prepend Vercel on vercel-a');
  }
  const vb = healed.xml.match(
    /<loc>\s*https:\/\/siren\.watch\/item\/vercel-b\.html\s*<\/loc>[\s\S]*?<\/url>/i,
  );
  if (!vb || !/<news:keywords>[^<]*Vercel/.test(vb[0])) {
    throw new Error('title heal must match curly-apostrophe Vercel’s');
  }
  // Plural Mac Studios must not false-heal singular Mac Studio.
  const ms = healed.xml.match(
    /<loc>\s*https:\/\/siren\.watch\/item\/mac-studios-only\.html\s*<\/loc>[\s\S]*?<\/url>/i,
  );
  const msKw = ms?.[0]?.match(/<news:keywords>([^<]+)/)?.[1] || '';
  if (!ms || /(^|,\s*)Mac Studio(,|$)/.test(msKw)) {
    throw new Error(`title heal must not add singular Mac Studio on plural titles: ${msKw}`);
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
  let tipOk = true;
  try {
    tipXml = readFileSync(tipPath, 'utf8');
  } catch {
    tipOk = false;
    console.log('merge-news-keyword-tip: tip missing; title-heal only (#300)');
  }
  let newXml = '';
  try {
    newXml = readFileSync(newPath, 'utf8');
  } catch (err) {
    console.error(`merge-news-keyword-tip: cannot read ${newPath}: ${err.message || err}`);
    process.exit(1);
  }
  let xml = newXml;
  let merged = 0;
  let mergeLocs = 0;
  if (tipOk) {
    const tipMerge = mergeNewsKeywordTip(tipXml, xml);
    xml = tipMerge.xml;
    merged = tipMerge.merged;
    mergeLocs = tipMerge.locs;
  }
  const titleHeal = healNewsKeywordProbesFromTitle(xml);
  xml = titleHeal.xml;
  if (merged > 0 || titleHeal.healed > 0) {
    writeFileSync(newPath, xml);
  }
  if (merged > 0) {
    console.log(`merged ${merged} tip news:keywords probe needle(s) across ${mergeLocs} loc(s) (#210)`);
  } else if (tipOk) {
    console.log('merge-news-keyword-tip: nothing to merge from tip');
  }
  if (titleHeal.healed > 0) {
    console.log(
      `healed ${titleHeal.healed} title news:keywords probe needle(s) across ${titleHeal.locs} loc(s) (#300)`,
    );
  } else {
    console.log('merge-news-keyword-tip: nothing to heal from titles (#300)');
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
