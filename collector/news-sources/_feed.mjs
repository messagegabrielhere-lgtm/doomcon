// Shared RSS/Atom reader and the NewsItem draft builder.
//
// No XML parser, because CONTRACT.md §1.1 forbids dependencies and none of
// these feeds needs a document walked — we want four fields out of a repeated
// block. The same reasoning is already recorded in collector/sources/arxiv.mjs.
//
// This file is a helper, not an adapter: collector/news.mjs skips `_`-prefixed
// files during discovery.

import { isAiRelevant } from './_entities.mjs';

// Long enough to carry a real abstract's first thought, short enough that a
// 200-item feed file stays small enough to ship to a phone over a cellular
// connection from an X link.
const SUMMARY_MAX = 320;

/**
 * A 200 does not mean a feed exists.
 *
 * Several documentation sites answer /rss.xml with HTTP 200 and the SPA shell,
 * so a status check alone would admit an HTML page as a news source and it
 * would simply parse to zero items — a dead source wearing a plausible number,
 * which is the exact failure this project exists to avoid.
 *
 * Content-type is checked but is NOT sufficient on its own, and is not allowed
 * to be fatal by itself: mistral.ai/rss.xml serves perfectly valid RSS as
 * `text/plain; charset=UTF-8` (measured 2026-09-23). So the body sniff is the
 * authority and content-type only rules out the obvious HTML case.
 */
export function assertXmlFeed(body, url, contentType = '') {
  const head = String(body ?? '').slice(0, 400).replace(/^﻿/, '').trimStart();

  if (/^text\/html\b/i.test(contentType)) {
    throw new Error(
      `${url}: served content-type "${contentType}" — this is an HTML page, not a feed ` +
        `(first 120 chars: ${head.slice(0, 120).replace(/\s+/g, ' ')})`,
    );
  }
  if (!/^<(\?xml|rss\b|feed\b)/i.test(head)) {
    throw new Error(
      `${url}: body does not start with <?xml / <rss / <feed — got ` +
        `"${head.slice(0, 120).replace(/\s+/g, ' ')}" (content-type "${contentType || 'unknown'}")`,
    );
  }
  return true;
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

const NAMED_ENTITIES = {
  lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', amp: '&',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  mdash: '—', ndash: '–', hellip: '…', middot: '·',
};

/** Decode XML/HTML entities. `&amp;` is resolved LAST so `&amp;lt;` stays `&lt;`. */
export function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&(lt|gt|quot|apos|nbsp|ldquo|rdquo|lsquo|rsquo|mdash|ndash|hellip|middot);/gi,
      (_, name) => NAMED_ENTITIES[name.toLowerCase()])
    .replace(/&amp;/gi, '&');
}

function safeCodePoint(n) {
  // A malformed numeric entity must not throw out of a feed parse and take a
  // whole source dark over one bad character in one item's description.
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return '';
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

/** Feed prose is HTML. Flatten it to one line of text. */
export function toPlainText(html, max = SUMMARY_MAX) {
  if (!html) return '';
  const text = decodeEntities(
    stripCdata(String(html))
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function firstTag(block, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}\\s*>`, 'i');
    const m = block.match(re);
    if (m && m[1].trim()) return m[1];
  }
  return null;
}

/**
 * Pull the item's own URL out of a block. Handles both shapes:
 *   RSS   <link>https://…</link>
 *   Atom  <link rel="alternate" type="text/html" href="…"/>
 * Atom feeds carry several <link> elements; `rel="alternate"` (or a rel-less
 * link) is the human page, and `rel="related"` on arXiv is the PDF — picking
 * the first href would silently canonicalise every paper to its PDF and break
 * de-duplication against every other source that links the abstract page.
 */
function extractLink(block) {
  const rssText = block.match(/<link(?:\s[^>]*)?>\s*([^<\s][^<]*?)\s*<\/link\s*>/i);
  if (rssText && /^https?:\/\//i.test(decodeEntities(rssText[1]).trim())) {
    return decodeEntities(rssText[1]).trim();
  }

  const candidates = [];
  for (const m of block.matchAll(/<link\b([^>]*?)\/?>/gi)) {
    const attrs = m[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? 'alternate';
    const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    candidates.push({ href: decodeEntities(href).trim(), rel, type });
  }
  if (candidates.length === 0) return null;

  const alternate = candidates.find((c) => c.rel === 'alternate' && c.type.includes('html'))
    ?? candidates.find((c) => c.rel === 'alternate')
    ?? candidates[0];
  return alternate.href;
}

/**
 * Categories on an entry. Handles both shapes:
 *   RSS   <category><![CDATA[Startup]]></category>
 *   Atom  <category term="Startup" />
 * Used to tell a lab's actual news apart from its customer case studies — see
 * openai.mjs, which is where the measurement behind that distinction lives.
 */
function extractCategories(block) {
  const out = new Set();
  for (const m of block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category\s*>/gi)) {
    const v = toPlainText(m[1], 60);
    if (v) out.add(v);
  }
  for (const m of block.matchAll(/<category\b([^>]*?)\/?>/gi)) {
    const term = m[1].match(/\bterm\s*=\s*["']([^"']+)["']/i)?.[1];
    if (term) out.add(decodeEntities(term).trim());
  }
  return [...out].sort();
}

function parseDate(raw) {
  if (!raw) return null;
  const ms = Date.parse(decodeEntities(String(raw).trim()));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * Split a feed into entries and lift the four fields we need out of each.
 * Returns { title, url, summary, published_at, raw } and never throws on a
 * single malformed entry — a bad item is skipped, a bad FEED is the caller's
 * problem via assertXmlFeed().
 */
export function parseFeed(xml, { limit = 40 } = {}) {
  const entries = [];
  const blockRe = /<(entry|item)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi;

  for (const match of xml.matchAll(blockRe)) {
    if (entries.length >= limit) break;
    const block = match[2];

    const title = toPlainText(firstTag(block, ['title']), 200);
    const url = extractLink(block);
    if (!title || !url) continue;

    const published_at =
      parseDate(firstTag(block, ['published'])) ??
      parseDate(firstTag(block, ['pubDate'])) ??
      parseDate(firstTag(block, ['dc:date'])) ??
      parseDate(firstTag(block, ['updated'])) ??
      null;

    const summary = toPlainText(
      firstTag(block, ['summary', 'description', 'content:encoded', 'content']),
    );

    entries.push({ title, url, summary, published_at, categories: extractCategories(block) });
  }

  return entries;
}

/**
 * Fetch and parse one RSS/Atom feed. `withMeta` is used so the content-type is
 * available to assertXmlFeed — that check is the whole reason this helper
 * exists rather than each adapter calling fetchText directly.
 */
export async function readFeed(fetchText, url, opts = {}) {
  const { data, headers } = await fetchText(url, { ...opts, withMeta: true });
  assertXmlFeed(data, url, headers?.['content-type'] ?? '');
  const entries = parseFeed(data, opts);
  if (entries.length === 0) {
    throw new Error(`${url}: parsed as XML but yielded zero usable entries — feed shape changed`);
  }
  return entries;
}

/**
 * Build a NewsItem draft. Adapters produce drafts; collector/news.mjs computes
 * `id`, `pillar` and `score` centrally so the formula lives in exactly one
 * auditable place (docs/NEWS.md, "Scoring").
 *
 * `engagement` is the optional platform signal: { metric, value, full_scale }.
 * A source with no engagement signal omits it and simply forfeits that term —
 * it is never faked, and never defaulted to a middling value.
 */
export function draft({ source, kind, title, summary = '', url, published_at, defaultPillar, dedupKey = null, engagement = null, weightOverride = null, meta = {} }) {
  return {
    source,
    kind,
    title,
    summary,
    url,
    published_at,
    default_pillar: defaultPillar,
    dedup_key: dedupKey,
    engagement,
    // Per-item weight, when a source publishes materially different grades of
    // item under one feed. Null means "use the adapter's weight".
    weight_override: weightOverride,
    meta,
  };
}

/** Drop entries without a parseable date: an undated item cannot be scored for recency. */
export function requireDated(entries, sourceId) {
  const dated = entries.filter((e) => e.published_at);
  if (dated.length === 0) {
    throw new Error(`${sourceId}: no entry carried a parseable date — refusing to score undated items`);
  }
  return dated;
}

export { isAiRelevant, SUMMARY_MAX };

/**
 * Factory for the plain RSS/Atom adapters. Most publishers differ only in URL,
 * weight and whether their feed is already AI-scoped, so the variation lives in
 * config and the parsing lives in one place. An adapter with genuinely
 * different mechanics (arXiv, Hugging Face, Hacker News, GitHub) does not use
 * this and writes its own collect().
 *
 * `aiFilter: true` re-filters locally against the published AI token list and
 * reports how many items were rejected, so a broad feed's basket is auditable
 * rather than trusted. Feeds that are already AI-only set it false and say why.
 */
export function feedAdapter({
  id, kind, label, weight, url, defaultPillar, aiFilter = false, limit = 30,
  titlePrefix = '', timeoutMs, extraMeta = {}, categoryWeights = null,
}) {
  return {
    id,
    kind,
    label,
    weight,
    async collect(fetchText) {
      const entries = requireDated(await readFeed(fetchText, url, { limit, ...(timeoutMs ? { timeoutMs } : {}) }), id);

      let rejected = 0;
      const items = [];
      for (const e of entries) {
        if (aiFilter && !isAiRelevant(`${e.title} ${e.summary}`)) {
          rejected += 1;
          continue;
        }
        // A category multiplier scales this item's source weight. `_none` is
        // the key for an uncategorised entry, which is a real and meaningful
        // class for some publishers rather than an accident.
        let weightOverride = null;
        let categoryFactor = null;
        if (categoryWeights) {
          const key = e.categories.find((c) => c in categoryWeights)
            ?? (e.categories.length === 0 ? '_none' : null);
          categoryFactor = (key !== null ? categoryWeights[key] : undefined) ?? categoryWeights._default ?? 1;
          weightOverride = weight * categoryFactor;
        }

        items.push(draft({
          source: id,
          kind,
          title: titlePrefix ? `${titlePrefix}${e.title}` : e.title,
          summary: e.summary,
          url: e.url,
          published_at: e.published_at,
          defaultPillar,
          weightOverride,
          meta: {
            feed: url,
            ...extraMeta,
            ...(e.categories.length ? { categories: e.categories } : {}),
            ...(categoryFactor !== null ? { category_weight_factor: categoryFactor } : {}),
            ...(aiFilter ? { locally_ai_filtered: true } : {}),
          },
        }));
      }

      if (aiFilter) {
        for (const item of items) item.meta.rejected_off_topic = rejected;
      }
      return items;
    },
  };
}
