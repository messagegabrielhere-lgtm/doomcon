#!/usr/bin/env node
// DOOMCON X surface — real X posts on the page, for $0, without a read key.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/x-surface.mjs
//
// PIPELINE POSITION: writes data/x-surface.json, so it must run BEFORE
// site/build.mjs (build.mjs clears public/ and renders from data/). It is the
// only file in the repo that touches data/x-surface.json.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE LOOKS THE WAY IT DOES
// ---------------------------------------------------------------------------
// X killed its free tier. Reading the API costs $0.005 per post returned, and
// browser-scraping x.com carries an explicit permanent-suspension penalty, so
// it is not on the table at any price. The full reasoning, the measured
// prices and the rejected alternatives are in docs/X-STRATEGY.md.
//
// What IS free, keyless and documented is X's oEmbed endpoint. X's own docs
// (docs.x.com/x-for-websites/oembed-api, read 2026-09-23) state, verbatim:
//
//     Requires authentication?  No
//     Rate limited              No
//     "The Tweet fallback markup is meant to be cached on your servers for up
//      to the suggested cache lifetime specified by the cache_age property."
//
// It resolves ONE known post URL into that post's real author, real text and
// real permalink. It does not search, and it does not list. So the whole
// problem reduces to DISCOVERY: where do x.com post URLs surface publicly,
// for free, in a way we are already allowed to read?
//
// Two answers, both measured on 2026-09-23:
//
//   1. Hacker News (Algolia). 84 distinct stories in the trailing 30 days
//      whose submitted URL *is* an x.com status permalink — including
//      @claudeai, @ArtificialAnlys, @alexandr_wang, @rasbt, @StepFun_ai.
//      Bonus: HN hands us points and a comment count, which is a real,
//      auditable popularity signal that costs nothing.
//
//   2. Techmeme's front page. 256 distinct x.com status permalinks in one
//      fetch, editorially chosen, including @openai, @anthropicai, @googleai
//      and @artificialanlys. techmeme.com/robots.txt allows `/` for `*`.
//
// So: harvest post URLs that third parties chose to cite, resolve each one
// through oEmbed, and render it with "as cited by <source>" attribution. We
// are not republishing a timeline. We are showing the posts the tech press
// and Hacker News already pointed at, with the citation attached.
//
// ---------------------------------------------------------------------------
// FOUR RULES THIS FILE ENFORCES
// ---------------------------------------------------------------------------
// 1. NEVER SCORED. Nothing here reaches the index. x-surface.json is
//    presentation-only and carries `affects_index: false` so that is checkable
//    rather than promised. An X reel that could move the headline number would
//    be exactly the unfalsifiable input METHODOLOGY.md exists to refuse.
// 2. NEVER INVENTED. A discovery source that fails is reported dark, by name.
//    A post that 404s is recorded in `unavailable` with its reason, not
//    silently dropped. An empty reel says WHY it is empty.
// 3. SERVER-RENDERABLE. oEmbed's blockquote is static HTML — the author, the
//    full post text, the date and the permalink are all in the markup. We ask
//    for omit_script=1, so the site ships ZERO X JavaScript and the reel is
//    present in a screenshot taken before any hydration. That is the precise
//    failure TEARDOWN.md §3.3 records on pizzint.watch.
// 4. POLITE. A hard per-run budget on oEmbed calls, low concurrency, and the
//    previous output reused as a cache exactly as X's docs instruct.
// ---------------------------------------------------------------------------

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchJson, fetchText, fetchAll } from './fetch.mjs';

const SCHEMA_VERSION = 1;
const OUT_URL = new URL('../data/x-surface.json', import.meta.url);

// How far back a cited post may have been POSTED and still appear in the reel.
// xAI's open-source For You ranker hard-drops posts at 48h (AgeFilter, verified
// in xai-org/x-algorithm on 2026-09-23). We run slightly wider than X itself
// because our collector is a 15-minute cron rather than a live feed, and a
// story cited by Techmeme on a Friday evening should survive the weekend.
const WINDOW_HOURS = 72;

// How long a known-dead post id is remembered so we stop re-resolving it.
// Deleted is usually permanent; a week is long enough to not thrash, short
// enough that a temporarily-protected account recovers on its own.
const TOMBSTONE_HOURS = 168;

// oEmbed calls per run. The endpoint documents itself as not rate limited, and
// 60 sequential calls in a burst measured 60/60 HTTP 200 on 2026-09-23 with no
// rate headers exposed. We budget anyway: "not rate limited" is a statement
// about today's policy, not a promise, and a 15-minute cron multiplied by an
// unbounded loop is how a free endpoint stops being free for everyone.
const RESOLVE_BUDGET = 16;
const RESOLVE_CONCURRENCY = 2;

// X's Developer Policy (docs.x.com/developer-guidelines, read 2026-09-23) is
// explicit and it is a DEADLINE, not a courtesy:
//
//   "You must delete X Content from your systems when requested …
//    Content is suspended/removed on X — 24 hours"
//
// A pure cache would happily serve a deleted post for the full 72-hour window.
// So a cached entry is re-checked against oEmbed after this many hours; if it
// now 404s it is dropped and tombstoned. Six hours leaves a 4x margin inside
// the 24-hour obligation even if several consecutive runs are skipped, and it
// costs nothing — oEmbed is free.
const REVALIDATE_HOURS = 6;

// The backstop. If an entry could not be re-checked (every run since went dark,
// or the budget stayed saturated) it stops being published at this age rather
// than ride past the 24-hour deletion deadline on an unverified cache. Dropping
// a post we can no longer vouch for is the same rule as a dark source.
const STALE_DROP_HOURS = 20;

// Ceiling on what we publish. The reel is a sidebar on a phone, not an archive.
const MAX_ITEMS = 14;

// How many candidates are eligible to be resolved at all. Discovery routinely
// finds far more than we can show — 162 on 2026-09-23, because a busy Techmeme
// front page carries a dozen cited posts per AI story. Resolving all of them
// would mean ~150 oEmbed calls for content that can never reach a 14-slot reel.
// Because the pre-resolution score is the same arithmetic that ranks the final
// reel, everything outside this pool is already known to be unpublishable. The
// margin over MAX_ITEMS covers posts that turn out to be deleted.
const CANDIDATE_POOL = MAX_ITEMS + 6;

const HTTP_TIMEOUT_MS = 12_000;

// ---------------------------------------------------------------------------
// Post identity
// ---------------------------------------------------------------------------

// Matches both hosts, both /status/ and the legacy /statuses/, and tolerates
// the /photo/1 and /video/1 suffixes HN submitters routinely paste. The
// numeric id is the only real identity — the handle in the path is decorative
// and X serves the post under any handle you put there.
const POST_URL_RE =
  /https?:\/\/(?:www\.)?(?:x|twitter|mobile\.twitter|fxtwitter|vxtwitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{8,25})/g;

// X snowflake ids encode their own creation time, so we get an exact post
// timestamp with no second request and no trust in a scraped date string.
// Epoch is 2010-11-04T01:42:54.657Z; ids issued before that are sequential and
// must NOT be decoded (jack/status/20 would decode to 2010 instead of 2006).
const SNOWFLAKE_EPOCH_MS = 1288834974657n;
const FIRST_SNOWFLAKE_ID = 29700859247n;

export function postedAtFromId(id, nowMs) {
  let n;
  try {
    n = BigInt(id);
  } catch {
    return null;
  }
  if (n < FIRST_SNOWFLAKE_ID) return null; // pre-snowflake, not decodable
  const ms = Number((n >> 22n) + SNOWFLAKE_EPOCH_MS);
  if (!Number.isFinite(ms)) return null;
  // A future timestamp means the id is not a snowflake at all (or someone is
  // feeding us junk). Six hours of slack covers clock skew and nothing else.
  if (ms > nowMs + 6 * 3600_000) return null;
  return new Date(ms).toISOString();
}

/** Extracts every {id, handle} post reference in a blob of text or HTML. */
export function extractPostRefs(text) {
  const out = new Map();
  if (typeof text !== 'string') return out;
  POST_URL_RE.lastIndex = 0;
  let m;
  while ((m = POST_URL_RE.exec(text)) !== null) {
    const [, handle, id] = m;
    if (!out.has(id)) out.set(id, { id, handle });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Topic filter
// ---------------------------------------------------------------------------

// Accounts whose posts are on-topic by construction: frontier labs, their
// official product accounts, and the two independent evaluation shops the AI
// press actually cites. Lowercased; the handle in a URL is case-insensitive.
// Being on this list is NOT an endorsement and does NOT bypass the citation
// requirement — a post still has to have been cited by HN or Techmeme to be
// here at all. The list only decides that we do not additionally demand an AI
// keyword in the citing headline.
const OFFICIAL_HANDLES = new Set([
  'openai', 'openaidevs', 'chatgptapp', 'sama',
  'anthropicai', 'claudeai', 'claudedevs',
  'googledeepmind', 'googleai', 'gemini', 'googleresearch',
  'xai', 'grok',
  'meta', 'aiatmeta', 'metaai',
  'mistralai', 'cohere', 'ai21labs', 'stabilityai',
  'huggingface', 'nvidiaai', 'nvidia', 'msftresearch', 'microsoftai',
  'deepseek_ai', 'alibaba_qwen', 'moonshotai', 'stepfun_ai', 'zai_org',
  'artificialanlys', 'lmarena_ai', 'epochairesearch', 'metr_evals',
  'ai_safety_inst', 'nistcyber',
]);

// Word-boundary tokens, deliberately narrow. METHODOLOGY.md already records
// what happens with fuzzy topic matching: a Polymarket search for "artificial
// general intelligence" returned 19 live markets about a politician's speech.
// Bare "AI" is matched case-SENSITIVELY as a standalone token so it does not
// swallow "Thailand", "said", "Dubai" or "ai" inside a handle.
const AI_TOKEN_RE = new RegExp(
  [
    '\\bAI\\b',
    '\\bAGI\\b',
    '\\bLLMs?\\b',
    '\\bGPUs?\\b',
    '\\b(?:artificial intelligence|machine learning|deep learning|neural network)\\b',
    '\\b(?:large language model|foundation model|frontier model|language model)\\b',
    '\\b(?:transformer|inference|fine-?tun\\w*|benchmark|eval(?:uation|s)?)\\b',
    '\\b(?:openai|anthropic|deepmind|mistral|hugging ?face|nvidia|cohere)\\b',
    '\\b(?:chatgpt|claude|gemini|grok|llama|qwen|deepseek|copilot|sora|midjourney)\\b',
    '\\b(?:superintelligen\\w*|alignment|interpretability|model weights)\\b',
  ].join('|'),
  'i',
);

// "AI" alone must survive case-sensitively; the rest may match either case.
const AI_BARE_RE = /\b(?:AI|AGI|LLM|LLMs|GPU|GPUs)\b/;

export function isOnTopic({ handle, context }) {
  if (handle && OFFICIAL_HANDLES.has(handle.toLowerCase())) {
    return { on_topic: true, matched_by: 'official_account' };
  }
  const text = typeof context === 'string' ? context : '';
  if (AI_BARE_RE.test(text)) return { on_topic: true, matched_by: 'keyword' };
  // Strip the bare-acronym alternatives before the case-insensitive pass so
  // "Thailand" can never match via \bAI\b with the /i flag.
  const ci = text.replace(AI_BARE_RE, ' ');
  if (AI_TOKEN_RE.test(ci.replace(/\bAI\b/gi, ' ').replace(/\bAGI\b/gi, ' '))) {
    return { on_topic: true, matched_by: 'keyword' };
  }
  return { on_topic: false, matched_by: null };
}

// ---------------------------------------------------------------------------
// Discovery source: Hacker News
// ---------------------------------------------------------------------------

const HN_ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date';
const HN_PAGE_SIZE = 200;

// THE SAME TRAP sources/hn.mjs documents, and it is worth repeating because it
// fails silently: a literal `>` in numericFilters does not produce a 4xx, it
// produces a NON-JSON error body, and the failure then surfaces as a JSON parse
// error with no hint of the real cause. URLSearchParams encodes it as %3E,
// which makes the trap unreachable by construction. Never concatenate here.
function hnUrl(sinceUnixSeconds) {
  const params = new URLSearchParams({
    // Algolia tokenises URLs on punctuation, so "status" restricted to the url
    // attribute is what actually retrieves x.com/<user>/status/<id> rows. The
    // real filter is the regex applied to hit.url below; this query only has to
    // be a superset. Measured 2026-09-23: 678 hits in 30d, 84 of them genuine
    // x-status permalinks.
    query: 'status',
    restrictSearchableAttributes: 'url',
    tags: 'story',
    numericFilters: `created_at_i>${sinceUnixSeconds}`,
    hitsPerPage: String(HN_PAGE_SIZE),
    page: '0',
  });
  return `${HN_ENDPOINT}?${params.toString()}`;
}

async function discoverHackerNews(nowMs) {
  const sinceSec = Math.floor((nowMs - WINDOW_HOURS * 3600_000) / 1000);
  const body = await fetchJson(hnUrl(sinceSec), { timeoutMs: HTTP_TIMEOUT_MS });

  if (!body || !Array.isArray(body.hits)) {
    throw new Error('hn: Algolia response carried no hits array — shape changed, or an error body came back as JSON');
  }

  const out = [];
  for (const hit of body.hits) {
    const refs = extractPostRefs(hit.url ?? '');
    if (refs.size !== 1) continue; // a story's url is one post, or it is not a post
    const [ref] = refs.values();
    const title = typeof hit.title === 'string' ? hit.title : '';
    const topic = isOnTopic({ handle: ref.handle, context: title });
    if (!topic.on_topic) continue;

    const points = Number.isFinite(hit.points) ? hit.points : 0;
    const comments = Number.isFinite(hit.num_comments) ? hit.num_comments : 0;

    out.push({
      id: ref.id,
      handle: ref.handle,
      citation: {
        source: 'hn',
        label: 'Hacker News',
        context: title,
        url: hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : 'https://news.ycombinator.com/',
        points,
        comments,
        cited_at: typeof hit.created_at === 'string' ? hit.created_at : null,
      },
      matched_by: topic.matched_by,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Discovery source: Techmeme
// ---------------------------------------------------------------------------

const TECHMEME_URL = 'https://www.techmeme.com/';

// Techmeme syndicates every one of its own headlines to @Techmeme, so its front
// page carries ~43 self-links. Those are Techmeme quoting Techmeme; they are not
// a third party citing a post, which is the entire premise here.
const TECHMEME_SELF_HANDLES = new Set(['techmeme', 'techmemefh', 'techmeme_feed']);

// Techmeme's front page is a sequence of story clusters, and the structure has
// been stable for years. Measured against the live page on 2026-09-23:
//
//   <DIV CLASS="clus">
//     <A NAME="a260923p34"></A>                         <- cluster permalink id
//     <CITE>Robert Hart / <A ...>The Verge</A>:</CITE>  <- byline
//     <STRONG CLASS="L2"><A CLASS="ourh" HREF="...">Anthropic says Claude
//       autonomously discovered a new enzyme system…</A></STRONG>
//     <SPAN CLASS="drhed">X:</SPAN> <span class="bls">
//       <A HREF="https://x.com/darioamodei/status/…">@darioamodei</A>,
//       <A HREF="https://x.com/anthropicai/status/…">@anthropicai</A>, …
//
// Parsing per-cluster rather than per-link is what makes the attribution worth
// printing. A flat regex over the whole page finds the same URLs but can only
// say "Techmeme linked this"; the cluster tells us WHICH STORY it was cited
// under, which is the sentence a reader actually wants. It also tightens the
// topic filter enormously, because we test the headline instead of 600
// characters of neighbouring markup — the flat version matched 149 candidates
// on 2026-09-23, most of them bleed from the adjacent story.
//
// Tags are uppercase in the served markup; every pattern here is /i so a
// lowercase rewrite on Techmeme's side does not silently zero this source.
const TM_CLUSTER_SPLIT = /<div\s+class="clus"/i;
const TM_ANCHOR_RE = /<a\s+name="(a\d{6}p\d+)"/i;
const TM_HEADLINE_RE = /<strong\s+class="L2"\s*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i;
const TM_HEADLINE_FALLBACK_RE = /<a\s+class="ourh"[^>]*>([\s\S]*?)<\/a>/i;
const TM_BYLINE_RE = /<cite>([\s\S]*?)<\/cite>/i;

function stripTags(html) {
  return unescapeEntities(
    String(html)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim();
}

/** "a260923p34" -> the stable per-story permalink Techmeme itself uses. */
export function techmemePermalink(anchor) {
  const m = /^a(\d{6})(p\d+)$/.exec(anchor ?? '');
  return m ? `https://www.techmeme.com/${m[1]}/${m[2]}#${anchor}` : TECHMEME_URL;
}

/** Split of the parse so the self-test can exercise it without the network. */
export function parseTechmeme(html, nowMs) {
  const clusters = html.split(TM_CLUSTER_SPLIT);
  if (clusters.length < 5) {
    // The front page carries dozens of clusters. A handful means the markup
    // changed and this adapter is now measuring nothing — go dark loudly rather
    // than report a quiet day.
    throw new Error(
      `techmeme: found ${clusters.length - 1} story clusters, expected many more — front-page markup has changed`,
    );
  }

  const seen = new Map();
  const citedAt = new Date(nowMs).toISOString();

  for (const cluster of clusters.slice(1)) {
    const headline = stripTags(
      (TM_HEADLINE_RE.exec(cluster) ?? TM_HEADLINE_FALLBACK_RE.exec(cluster) ?? [, ''])[1],
    );
    if (!headline) continue;

    const topic = isOnTopic({ handle: null, context: headline });
    if (!topic.on_topic) continue;

    // stripTags turns "<A>The Verge</A>:" into "The Verge :", so the separator
    // has to be eaten on BOTH sides or the byline carries a trailing space.
    const byline = stripTags((TM_BYLINE_RE.exec(cluster) ?? [, ''])[1]).replace(/\s*:\s*$/, '').trim();
    const permalink = techmemePermalink((TM_ANCHOR_RE.exec(cluster) ?? [, null])[1]);

    for (const ref of extractPostRefs(cluster).values()) {
      if (TECHMEME_SELF_HANDLES.has(ref.handle.toLowerCase())) continue;
      if (seen.has(ref.id)) continue;
      seen.set(ref.id, {
        id: ref.id,
        handle: ref.handle,
        citation: {
          source: 'techmeme',
          label: 'Techmeme',
          // The story this post was cited under. A provenance breadcrumb, not a
          // reproduction of Techmeme's editorial page.
          context: headline.slice(0, 180),
          byline: byline ? byline.slice(0, 120) : null,
          url: permalink,
          points: null,
          comments: null,
          cited_at: citedAt,
        },
        // The cluster headline carried the AI signal; the author may be anyone.
        matched_by: OFFICIAL_HANDLES.has(ref.handle.toLowerCase())
          ? 'official_account'
          : 'techmeme_headline',
      });
    }
  }
  return [...seen.values()];
}

async function discoverTechmeme(nowMs) {
  const res = await fetchText(TECHMEME_URL, { timeoutMs: HTTP_TIMEOUT_MS, withMeta: true });
  const ct = String(res.headers?.['content-type'] ?? '');
  // A 200 does not mean we got a page. Validate the content type AND the body,
  // or a CDN error page becomes "zero citations today" and reads as calm.
  if (!/text\/html/i.test(ct)) {
    throw new Error(`techmeme: expected text/html, got content-type "${ct || '(none)'}"`);
  }
  const html = res.data;
  if (typeof html !== 'string' || !/<html/i.test(html.slice(0, 4000))) {
    throw new Error('techmeme: body did not start with an HTML document');
  }
  return parseTechmeme(html, nowMs);
}

const DISCOVERY = [
  { id: 'hn', label: 'Hacker News', run: discoverHackerNews },
  { id: 'techmeme', label: 'Techmeme', run: discoverTechmeme },
];

// ---------------------------------------------------------------------------
// oEmbed
// ---------------------------------------------------------------------------

const OEMBED_ENDPOINT = 'https://publish.x.com/oembed';

function oembedUrl(id, handle) {
  const params = new URLSearchParams({
    url: `https://x.com/${handle}/status/${id}`,
    omit_script: '1',   // no platform.x.com/widgets.js — the page ships zero X JS
    dnt: 'true',        // do-not-track, even though nothing here loads a tracker
    hide_thread: 'true',
    maxwidth: '550',
    align: 'none',
    lang: 'en',
  });
  return `${OEMBED_ENDPOINT}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Sanitising X's markup
// ---------------------------------------------------------------------------
//
// X returns a blockquote whose text is already entity-escaped. We render it on
// our own origin, so we treat it as untrusted third-party HTML regardless and
// rebuild it from a whitelist: known tags, known attributes, https-only hrefs.
//
// X's Display Requirements say the post text "may not be altered or modified".
// This does not alter text — it drops markup X did not put there and pins the
// attributes on the markup X did. Text nodes pass through byte-for-byte, so
// `&mdash;` stays `&mdash;` and is never double-escaped.

const ALLOWED_TAGS = new Set(['blockquote', 'p', 'a', 'br', 'span', 'em', 'strong', 'b', 'i']);
const ALLOWED_ATTRS = {
  blockquote: new Set(['class', 'lang', 'dir', 'data-dnt', 'data-width']),
  p: new Set(['lang', 'dir']),
  a: new Set(['href']),
  span: new Set(['lang', 'dir']),
};

function safeHref(value) {
  const v = String(value).trim();
  if (!/^https:\/\//i.test(v)) return null;
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase();
    const ok =
      host === 'x.com' || host.endsWith('.x.com') ||
      host === 'twitter.com' || host.endsWith('.twitter.com') ||
      host === 't.co' ||
      host === 'pic.twitter.com' || host === 'pic.x.com';
    return ok ? v : null;
  } catch {
    return null;
  }
}

function parseAttrs(raw) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

function escAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Whitelist-rebuild of X's oEmbed html. Returns '' if nothing survives. */
export function sanitizeEmbedHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return '';
  // Comments and any script/style payload go first, wholesale.
  let src = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const open = [];
  let out = '';
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
  let cursor = 0;
  let m;

  while ((m = tagRe.exec(src)) !== null) {
    out += src.slice(cursor, m.index); // text node, byte-for-byte
    cursor = m.index + m[0].length;

    const tag = m[1].toLowerCase();
    const closing = m[0].startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) continue; // drop the tag, keep its text

    if (closing) {
      // Only emit a close for a tag we actually opened, so we cannot leak an
      // unbalanced </blockquote> into the page around it.
      const at = open.lastIndexOf(tag);
      if (at === -1) continue;
      open.splice(at, 1);
      out += `</${tag}>`;
      continue;
    }

    if (tag === 'br') {
      out += '<br>';
      continue;
    }

    const attrs = parseAttrs(m[2] ?? '');
    const allowed = ALLOWED_ATTRS[tag] ?? new Set();
    let rendered = '';
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) continue;       // belt and braces
      if (!allowed.has(k)) continue;
      if (k === 'href') {
        const href = safeHref(v);
        if (!href) return '';                  // a link we cannot vouch for voids the embed
        rendered += ` href="${escAttr(href)}"`;
        continue;
      }
      if (k === 'class' && tag === 'blockquote') {
        rendered += ' class="twitter-tweet"';  // pinned, not echoed
        continue;
      }
      rendered += ` ${k}="${escAttr(v)}"`;
    }
    if (tag === 'a') rendered += ' rel="nofollow noopener noreferrer" target="_blank"';
    // Pinned unconditionally, not echoed. X always sends class="twitter-tweet",
    // but the site needs one stable CSS hook it can rely on even if X stops.
    if (tag === 'blockquote' && !/ class="/.test(rendered)) rendered = ' class="twitter-tweet"' + rendered;

    open.push(tag);
    out += `<${tag}${rendered}>`;
  }
  out += src.slice(cursor);

  // Close anything X left open (its markup ends with a newline, not a close).
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`;
  return out.trim();
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', rsquo: '’',
  lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·',
};

function unescapeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : whole;
  });
}

/** The post's text, as plain text. The author/date trailer X appends is cut. */
export function extractPostText(html) {
  if (typeof html !== 'string') return '';
  const p = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const inner = p ? p[1] : html;
  return unescapeEntities(
    inner
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractLangDir(html) {
  const p = typeof html === 'string' ? html.match(/<p\b([^>]*)>/i) : null;
  const attrs = p ? parseAttrs(p[1]) : {};
  return {
    lang: typeof attrs.lang === 'string' && attrs.lang ? attrs.lang : null,
    dir: attrs.dir === 'rtl' ? 'rtl' : 'ltr',
  };
}

function handleFromAuthorUrl(url) {
  const m = typeof url === 'string' ? url.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/) : null;
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------
//
// Deterministic, and every term is printed on the item so a reader can redo the
// arithmetic. All time is measured from the single `nowMs` captured once at the
// top of the run — CONTRACT.md §1.4 bans unseeded time in output, and one clock
// read for the whole run is what makes a rerun reproducible.
//
// The author-diversity decay is lifted straight from xAI's open-source For You
// ranker (AuthorDiversityDecay 0.5, AuthorDiversityFloor 0.25, verified in
// xai-org/x-algorithm/home-mixer/params/param.rs on 2026-09-23): the Nth post
// by an author already in the slate is worth 0.5^(N-1) of its score, floored at
// 0.25. One loud account cannot take over the reel.
const AUTHOR_DECAY = 0.5;
const AUTHOR_FLOOR = 0.25;

/**
 * The base score, computed ONLY from things known before a post is resolved:
 * who cited it, how hard, whether the author is a lab account, and how old it
 * is. That is deliberate — it lets the oEmbed budget be spent on the highest-
 * scoring unresolved candidates rather than merely the newest ones, using the
 * exact arithmetic that will later rank them. An official lab post cited by
 * Techmeme must not sit in a queue behind twelve fresher drive-by submissions.
 */
export function baseScore(item, nowMs) {
  const postedMs = item.posted_at ? Date.parse(item.posted_at) : NaN;
  const ageHours = Number.isFinite(postedMs) ? Math.max(0, (nowMs - postedMs) / 3600_000) : WINDOW_HOURS;

  // Editorial citation outranks a drive-by submission; a post carried by BOTH
  // is the strongest signal available to us and is additive by design.
  let citation = 0;
  let hnPoints = 0;
  for (const c of item.cited_by ?? []) {
    if (c.source === 'techmeme') citation += 3;
    if (c.source === 'hn') {
      citation += 2;
      hnPoints = Math.max(hnPoints, c.points ?? 0);
    }
  }
  // log10 so a 400-point story beats a 4-point one without erasing it.
  const engagement = Math.log10(1 + hnPoints) * 1.5;
  const official = (item.official ?? OFFICIAL_HANDLES.has(String(item.author_handle ?? item.handle ?? '').toLowerCase()))
    ? 2 : 0;
  const recency = 3 * Math.max(0, 1 - ageHours / WINDOW_HOURS);

  return {
    base: round2(citation + engagement + official + recency),
    parts: { citation: round2(citation), engagement: round2(engagement), official, recency: round2(recency) },
    ageHours,
  };
}

export function rankItems(items, nowMs) {
  const scored = items.map((item) => ({ item, ...baseScore(item, nowMs) }));

  scored.sort((a, b) => b.base - a.base || (a.item.id < b.item.id ? -1 : 1));

  const perAuthor = new Map();
  const out = [];
  for (const s of scored) {
    const key = (s.item.author_handle ?? '').toLowerCase();
    const seen = perAuthor.get(key) ?? 0;
    perAuthor.set(key, seen + 1);
    const factor = Math.max(AUTHOR_FLOOR, AUTHOR_DECAY ** seen);
    out.push({ ...s, final: round2(s.base * factor), factor: round2(factor), nth: seen + 1 });
  }

  out.sort((a, b) => b.final - a.final || (a.item.id < b.item.id ? -1 : 1));

  return out.slice(0, MAX_ITEMS).map((s, i) => ({
    ...s.item,
    rank: i + 1,
    rank_score: s.final,
    rank_explain: {
      ...s.parts,
      base: s.base,
      author_nth: s.nth,
      author_diversity_factor: s.factor,
      age_hours: round2(s.ageHours),
    },
  }));
}

function round2(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * Three states, and they must stay distinct — this is the pizzint failure in
 * one function. TEARDOWN.md §3.1: their status endpoint reports "healthy" at a
 * 12% scrape success rate while the homepage prints a confident DOUGHCON 5.
 *
 *   live     — every discovery source answered. An empty reel here genuinely
 *              means no cited AI post fell inside the window.
 *   degraded — we have posts, but a source is dark, so the reel is thinner than
 *              it should be and the page has to say which source is missing.
 *   dark     — nothing answered. This is NOT "a quiet day", and a page that
 *              renders it as an empty panel is lying by omission.
 */
export function deriveStatus(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return 'dark';
  if (!sources.some((s) => s.ok)) return 'dark';
  if (!sources.every((s) => s.ok)) return 'degraded';
  return 'live';
}

/** Prerendered so the site can print provenance without reimplementing logic. */
function attributionLine(citedBy) {
  const parts = citedBy.map((c) => {
    if (c.source === 'hn') {
      const pts = Number.isFinite(c.points) && c.points > 0
        ? ` (${c.points} point${c.points === 1 ? '' : 's'})`
        : '';
      return `Hacker News${pts}`;
    }
    return c.label ?? c.source;
  });
  return `Cited by ${parts.join(' and ')}`;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

async function loadPrevious() {
  try {
    const raw = await readFile(OUT_URL, 'utf8');
    const prev = JSON.parse(raw);
    return {
      // `items` is the published reel and `cache` is everything else we already
      // paid a request for. Both are cache input. Reading only `items` would
      // silently re-resolve every candidate that ranked 15th or lower on the
      // previous run, every fifteen minutes, forever — measured at 6 wasted
      // oEmbed calls per run before this was split out.
      items: [
        ...(Array.isArray(prev.items) ? prev.items : []),
        ...(Array.isArray(prev.cache) ? prev.cache : []),
      ],
      unavailable: Array.isArray(prev.unavailable) ? prev.unavailable : [],
    };
  } catch {
    // Missing or unreadable is the normal first-run state, and a corrupt cache
    // must degrade to "resolve everything again", never to a crash.
    return { items: [], unavailable: [] };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const nowMs = Date.now();
  const generatedAt = new Date(nowMs).toISOString();
  const cutoffMs = nowMs - WINDOW_HOURS * 3600_000;

  const prev = await loadPrevious();

  // --- discovery ----------------------------------------------------------
  const settled = await Promise.allSettled(DISCOVERY.map((d) => d.run(nowMs)));
  const sources = [];
  const candidates = new Map();

  settled.forEach((outcome, i) => {
    const d = DISCOVERY[i];
    if (outcome.status !== 'fulfilled') {
      sources.push({
        id: d.id, label: d.label, ok: false, candidates: 0,
        error: String(outcome.reason?.message ?? outcome.reason ?? 'unknown error'),
      });
      return;
    }
    for (const c of outcome.value) {
      const existing = candidates.get(c.id);
      if (existing) {
        if (!existing.cited_by.some((x) => x.source === c.citation.source)) existing.cited_by.push(c.citation);
      } else {
        candidates.set(c.id, { id: c.id, handle: c.handle, cited_by: [c.citation], matched_by: c.matched_by });
      }
    }
    sources.push({ id: d.id, label: d.label, ok: true, candidates: outcome.value.length, error: null });
  });

  const anySourceOk = sources.some((s) => s.ok);

  // --- drop posts already known dead, and posts outside the window --------
  const tombstones = new Map(
    prev.unavailable
      .filter((t) => t?.id && Date.parse(t.checked_at ?? '') > nowMs - TOMBSTONE_HOURS * 3600_000)
      .map((t) => [t.id, t]),
  );

  for (const [id, cand] of candidates) {
    if (tombstones.has(id)) { candidates.delete(id); continue; }
    const postedAt = postedAtFromId(id, nowMs);
    // An id we cannot date is an id we cannot window. Refuse it rather than
    // guess: a 2019 post sitting at the top of a "live" reel is exactly the
    // confident-number-over-a-dead-pipe failure this project exists to avoid.
    if (!postedAt || Date.parse(postedAt) < cutoffMs) { candidates.delete(id); continue; }
    cand.posted_at = postedAt;
  }

  // --- reuse the cache; resolve only what is new --------------------------
  const cached = new Map(
    prev.items
      .filter((it) => it?.id && it.posted_at && Date.parse(it.posted_at) >= cutoffMs && it.html_safe)
      .map((it) => [it.id, it]),
  );

  // Rank every candidate BEFORE spending a single request, best first, ties
  // broken on the id so a rerun over the same inputs picks the same set.
  const pool = [...candidates.values()]
    .map((c) => ({ cand: c, score: baseScore(c, nowMs).base }))
    .sort((a, b) => b.score - a.score || (a.cand.id < b.cand.id ? -1 : 1))
    .slice(0, CANDIDATE_POOL)
    .map((x) => x.cand);
  const notConsidered = candidates.size - pool.length;

  const resolved = [];
  let reused = 0;
  let dropped = 0;
  const fresh = [];   // never resolved
  const stale = [];   // cached, but past REVALIDATE_HOURS

  for (const cand of pool) {
    const hit = cached.get(cand.id);
    if (!hit) { fresh.push(cand); continue; }

    const ageH = (nowMs - Date.parse(hit.resolved_at ?? 0)) / 3600_000;
    if (!Number.isFinite(ageH) || ageH >= REVALIDATE_HOURS) {
      stale.push(cand);
      // Past the backstop it is not published at all until re-checked.
      if (Number.isFinite(ageH) && ageH >= STALE_DROP_HOURS) { dropped++; continue; }
    }
    // Citations are re-derived every run: a post picked up by a second source
    // since we cached it should say so.
    resolved.push({ ...hit, cited_by: cand.cited_by, matched_by: cand.matched_by });
    reused++;
  }

  // Revalidation goes FIRST. Taking down content X has removed is an obligation
  // with a clock on it; adding another post to the reel is a nice-to-have.
  const toResolve = [...stale, ...fresh];
  const batch = toResolve.slice(0, RESOLVE_BUDGET);
  const deferred = toResolve.length - batch.length;
  const revalidating = batch.filter((c) => cached.has(c.id)).length;

  const unavailable = [...tombstones.values()];
  let resolvedThisRun = 0;

  if (batch.length > 0) {
    const results = await fetchAll(
      batch.map((c) => ({ key: c.id, url: oembedUrl(c.id, c.handle), timeoutMs: HTTP_TIMEOUT_MS })),
      { concurrency: RESOLVE_CONCURRENCY },
    );

    for (const r of results) {
      const cand = batch.find((c) => c.id === r.key);
      if (!r.ok) {
        // A deleted, protected or suspended post answers 404 with text/html, so
        // fetchJson raises an http FetchError before it ever tries to parse.
        // Recorded by name and reason — never silently dropped.
        unavailable.push({
          id: cand.id,
          url: `https://x.com/${cand.handle}/status/${cand.id}`,
          reason: r.error?.status ? `HTTP ${r.error.status}` : String(r.error?.kind ?? 'error'),
          detail: String(r.error?.message ?? '').slice(0, 200),
          checked_at: generatedAt,
        });
        continue;
      }

      const body = r.value;
      const htmlSafe = sanitizeEmbedHtml(body?.html);
      // A payload that is not an embedded post — or markup that did not survive
      // the whitelist — is a failure, not a blank card.
      if (!body || typeof body.html !== 'string' || !/blockquote/i.test(htmlSafe) || !body.author_url) {
        unavailable.push({
          id: cand.id,
          url: `https://x.com/${cand.handle}/status/${cand.id}`,
          reason: 'unexpected oembed payload',
          detail: `keys: ${Object.keys(body ?? {}).join(',') || 'none'}`,
          checked_at: generatedAt,
        });
        continue;
      }

      const text = extractPostText(body.html);
      const { lang, dir } = extractLangDir(body.html);
      const handle = handleFromAuthorUrl(body.author_url) ?? cand.handle;

      resolved.push({
        id: cand.id,
        url: typeof body.url === 'string' ? body.url : `https://x.com/${handle}/status/${cand.id}`,
        author_name: typeof body.author_name === 'string' ? body.author_name : handle,
        author_handle: handle,
        author_url: body.author_url,
        official: OFFICIAL_HANDLES.has(handle.toLowerCase()),
        posted_at: cand.posted_at,
        posted_at_source: 'snowflake_id',
        text,
        text_truncated_by_x: text.endsWith('…') || /…\s*$/.test(text),
        lang,
        dir,
        html: body.html,        // verbatim, for audit
        html_safe: htmlSafe,    // what the site renders
        cache_age: typeof body.cache_age === 'string' ? body.cache_age : null,
        provider_name: typeof body.provider_name === 'string' ? body.provider_name : 'X',
        resolved_at: generatedAt,
        cited_by: cand.cited_by,
        matched_by: cand.matched_by,
      });
      resolvedThisRun++;
    }
  }

  // A revalidated post now appears twice: the cached copy pushed above and the
  // fresh one. Keep the LAST occurrence, which is the copy we just verified.
  {
    const byId = new Map();
    for (const it of resolved) byId.set(it.id, it);
    resolved.length = 0;
    resolved.push(...byId.values());
  }

  // Anything that failed revalidation is now tombstoned, so it must not be
  // published from the stale cached copy sitting in `resolved`.
  const gone = new Set(unavailable.map((t) => t.id));
  for (let i = resolved.length - 1; i >= 0; i--) {
    if (gone.has(resolved[i].id)) { resolved.splice(i, 1); dropped++; }
  }

  // --- rank and emit ------------------------------------------------------
  const ranked = rankItems(resolved, nowMs).map((it) => ({
    ...it,
    attribution_line: attributionLine(it.cited_by),
  }));

  // Everything resolved this cycle that did not make the reel. Not for display —
  // this is this script's own cache, so tomorrow's ranking does not re-buy it.
  const published = new Set(ranked.map((it) => it.id));
  let carried = resolved.filter((it) => !published.has(it.id));

  // If EVERY discovery source is dark we have no candidates, so `resolved` is
  // empty and the two lines above would throw away a cache we already paid for.
  // A ten-second network blip would then cost 20 oEmbed calls on recovery. The
  // reel still publishes nothing — a dark run has nothing to vouch for — but
  // the fetch cache survives, because it is a receipt for work already done,
  // not a claim about what is happening right now.
  if (!anySourceOk) {
    carried = [...cached.values()].filter((it) => Date.parse(it.posted_at) >= cutoffMs);
  }

  // The verbatim `html` is the audit trail for "we did not alter X's markup",
  // so it rides on what we actually display and nothing else. Cache entries are
  // not displayed, so there is nothing to audit — and this file is rewritten by
  // a 15-minute cron and committed every time, so a field carried for no reason
  // is git churn forever. Measured on a full pool: 60,944 -> 56,877 bytes.
  carried = carried.map(({ html, ...rest }) => rest);

  // Three distinct states, and they must stay distinct.
  //   live     — at least one discovery source answered and we have posts.
  //   degraded — we have posts, but at least one discovery source is dark, so
  //              the reel is thinner than it should be and the page must say so.
  //   dark     — no discovery source answered. NOT "no AI posts today".
  const status = deriveStatus(sources);
  const darkSources = sources.filter((s) => !s.ok).map((s) => s.id);

  const out = {
    schema: SCHEMA_VERSION,
    generated_at: generatedAt,
    status,
    // Load-bearing and machine-checkable: nothing in this file reaches the index.
    affects_index: false,
    method: 'oembed-of-publicly-cited-posts',
    cost_usd_per_run: 0,
    window_hours: WINDOW_HOURS,
    dark_sources: darkSources,
    sources,
    counts: {
      candidates: candidates.size,
      candidate_pool: pool.length,
      outranked_not_fetched: notConsidered,
      resolved_total: resolved.length,
      resolved_this_run: resolvedThisRun,
      revalidated: revalidating,
      reused_from_cache: reused,
      dropped_unverifiable: dropped,
      deferred_to_next_run: deferred,
      unavailable: unavailable.length,
      published: ranked.length,
      held_in_cache: carried.length,
    },
    items: ranked,
    // Resolved, in-window, but outranked. Collector cache only — the site must
    // render `items` and ignore this.
    cache: carried,
    unavailable: unavailable.slice(0, 50),
    attribution:
      'Posts are resolved through X’s public, keyless oEmbed endpoint (publish.x.com/oembed) ' +
      'from permalinks that Hacker News submitters or Techmeme editors chose to cite. ' +
      'DOOMCON holds no X API key, reads no timeline, and pays X nothing. ' +
      'Each post is shown with the source that cited it.',
    notes: [
      'Presentation only. No value here is scored, and nothing here can move the index.',
      'Rendered server-side from X’s own fallback markup with omit_script=1, so the reel is ' +
        'present in a screenshot taken before any JavaScript runs and the page loads no X script.',
      'Markup is rebuilt from a tag/attribute whitelist before rendering. Post text is not altered.',
      'Post timestamps are decoded from the X snowflake id, not scraped from a date string.',
      'An empty reel with status "live" means no cited AI post fell inside the window. ' +
        'status "dark" means the discovery sources failed, which is a different thing.',
      'Cached posts are re-checked against oEmbed every 6 hours and dropped if they 404, ' +
        'so content deleted on X leaves this file well inside X\u2019s 24-hour deletion deadline.',
      'X\u2019s Developer Policy prohibits displaying X Content in an iframe. Render html_safe inline.',
    ],
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(OUT_URL, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  // --- log ----------------------------------------------------------------
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`x-surface: ${status.toUpperCase()}  ${generatedAt}`);
  for (const s of sources) {
    console.log(`  ${s.ok ? 'ok  ' : 'DARK'} ${pad(s.id, 10)} ${s.ok ? `${s.candidates} candidate(s)` : s.error}`);
  }
  console.log(
    `  candidates=${candidates.size} pool=${pool.length} (outranked ${notConsidered}) ` +
    `resolved_now=${resolvedThisRun} (revalidate ${revalidating}) reused=${reused} ` +
    `deferred=${deferred} dropped=${dropped} unavailable=${unavailable.length} ` +
    `published=${ranked.length}`,
  );
  for (const it of ranked.slice(0, 5)) {
    console.log(`  #${it.rank} ${pad('@' + it.author_handle, 20)} ${it.rank_score}  ${it.text.replace(/\s+/g, ' ').slice(0, 64)}`);
  }
  console.log('  -> data/x-surface.json');

  // Dark is a reportable state, not a crash: the file is still written, and the
  // site renders the dark banner from it. Exit non-zero so CI shows the colour.
  if (status === 'dark') process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Self-test — `node collector/x-surface.mjs --selftest`, no network.
// ---------------------------------------------------------------------------

function selftest() {
  const failures = [];
  const eq = (name, got, want) => {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g !== w) failures.push(`${name}\n    got  ${g}\n    want ${w}`);
    else console.log(`  ok  ${name}`);
  };
  const ok = (name, cond, detail = '') => {
    if (!cond) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
    else console.log(`  ok  ${name}`);
  };

  // Real payload captured from publish.x.com/oembed on 2026-09-23.
  const REAL_HTML =
    '<blockquote class="twitter-tweet" data-width="550" data-dnt="true"><p lang="en" dir="ltr">' +
    'We heard you loud and clear. ChatGPT Voice can now:<br><br>- Use plugins like your email, ' +
    'calendar, and Slack.<br><br>- Be powered by GPT-6 Astra, Sol, and Luna. <a href="https://t.co/zRjjCMxpuW">' +
    'pic.twitter.com/zRjjCMxpuW</a></p>&mdash; OpenAI (@OpenAI) <a href="https://x.com/OpenAI/status/' +
    '2102808325742322002?ref_src=twsrc%5Etfw">September 23, 2026</a></blockquote>\n\n';

  const nowMs = Date.parse('2026-09-23T21:00:00.000Z');

  console.log('snowflake');
  const t = postedAtFromId('2102808325742322002', nowMs);
  ok('decodes a real id to 2026-09-23', typeof t === 'string' && t.startsWith('2026-09-23'), `got ${t}`);
  eq('refuses a pre-snowflake id (jack/status/20)', postedAtFromId('20', nowMs), null);
  eq('refuses a future id', postedAtFromId('9999999999999999999', nowMs), null);
  eq('refuses junk', postedAtFromId('not-a-number', nowMs), null);

  console.log('url extraction');
  eq('x.com', [...extractPostRefs('see https://x.com/OpenAI/status/2102808325742322002 now').values()],
    [{ id: '2102808325742322002', handle: 'OpenAI' }]);
  eq('twitter.com + /photo/1 suffix',
    [...extractPostRefs('https://twitter.com/TheAhmadOsman/status/2102535871727857915/photo/1').values()],
    [{ id: '2102535871727857915', handle: 'TheAhmadOsman' }]);
  eq('ignores a profile url', [...extractPostRefs('https://x.com/OpenAI').values()], []);
  eq('dedupes', [...extractPostRefs('https://x.com/a/status/2102808325742322002 https://x.com/b/status/2102808325742322002').values()].length, 1);

  console.log('topic filter');
  eq('official account needs no keyword', isOnTopic({ handle: 'AnthropicAI', context: 'a headline' }),
    { on_topic: true, matched_by: 'official_account' });
  eq('bare AI token matches', isOnTopic({ handle: 'someone', context: 'New AI model ships' }),
    { on_topic: true, matched_by: 'keyword' });
  eq('Thailand does not match via /i', isOnTopic({ handle: 'someone', context: 'Thailand said Dubai' }),
    { on_topic: false, matched_by: null });
  eq('lab name matches', isOnTopic({ handle: 'someone', context: 'Anthropic ships something' }),
    { on_topic: true, matched_by: 'keyword' });

  console.log('sanitiser');
  const safe = sanitizeEmbedHtml(REAL_HTML);
  ok('keeps the blockquote', /^<blockquote class="twitter-tweet"/.test(safe), safe.slice(0, 80));
  ok('keeps the post text', safe.includes('We heard you loud and clear'));
  ok('keeps <br>', safe.includes('<br>'));
  ok('does not double-escape &mdash;', safe.includes('&mdash;') && !safe.includes('&amp;mdash;'));
  ok('adds rel/target to links', /rel="nofollow noopener noreferrer" target="_blank"/.test(safe));
  ok('no script survives', !/script/i.test(sanitizeEmbedHtml('<blockquote><script>alert(1)</script>hi</blockquote>')));
  ok('drops an onerror attribute',
    !/onerror/i.test(sanitizeEmbedHtml('<blockquote><p onerror="x()">hi</p></blockquote>')));
  ok('drops an img tag but keeps text',
    sanitizeEmbedHtml('<blockquote><p>a<img src=x onerror=alert(1)>b</p></blockquote>') ===
      '<blockquote class="twitter-tweet"><p>ab</p></blockquote>',
    sanitizeEmbedHtml('<blockquote><p>a<img src=x onerror=alert(1)>b</p></blockquote>'));
  eq('voids the embed on a javascript: href',
    sanitizeEmbedHtml('<blockquote><p><a href="javascript:alert(1)">x</a></p></blockquote>'), '');
  eq('voids the embed on an off-domain href',
    sanitizeEmbedHtml('<blockquote><p><a href="https://evil.example/x">x</a></p></blockquote>'), '');
  eq('balances a stray close tag',
    sanitizeEmbedHtml('</blockquote><blockquote><p>hi</p></blockquote>'),
    '<blockquote class="twitter-tweet"><p>hi</p></blockquote>');

  console.log('text extraction');
  const text = extractPostText(REAL_HTML);
  ok('starts with the post text', text.startsWith('We heard you loud and clear.'), text.slice(0, 60));
  ok('drops the author trailer', !text.includes('OpenAI (@OpenAI)'));
  ok('br becomes a newline', text.includes('\n'));
  eq('lang/dir', extractLangDir(REAL_HTML), { lang: 'en', dir: 'ltr' });
  eq('entity decode', extractPostText('<p lang="en" dir="ltr">a &amp; b &mdash; c</p>'), 'a & b — c');

  console.log('status derivation');
  eq('all sources ok -> live', deriveStatus([{ ok: true }, { ok: true }]), 'live');
  eq('one source dark -> degraded', deriveStatus([{ ok: true }, { ok: false }]), 'degraded');
  eq('all sources dark -> dark', deriveStatus([{ ok: false }, { ok: false }]), 'dark');
  eq('no sources at all -> dark', deriveStatus([]), 'dark');

  console.log('techmeme parser');
  // Trimmed from the live front page on 2026-09-23, structure preserved.
  const cluster = (anchor, headline, links, cite = 'Robert Hart / <A HREF="x">The Verge</A>:') =>
    `<DIV CLASS="clus">\n<A NAME="${anchor}"></A>\n<CITE>${cite}</CITE>\n` +
    `<DIV CLASS="ii"><STRONG CLASS="L2"><A CLASS="ourh" HREF="https://example.com/s">${headline}</A></STRONG>` +
    `&nbsp; &mdash;&nbsp; dek text.</DIV>\n<SPAN CLASS="drhed">X:</SPAN>&nbsp;<span class="bls">${links}</span>\n`;
  const TM_FIXTURE =
    '<html><body>' +
    cluster('a260923p34', 'Anthropic says Claude autonomously discovered a new enzyme system',
      '<A HREF="https://x.com/anthropicai/status/2102824959827742916">@anthropicai</A>, ' +
      '<A HREF="https://twitter.com/Techmeme/status/2102830780632502473">@Techmeme</A>, ' +
      '<A HREF="https://x.com/suchenzang/status/2102850037487116538">@suchenzang</A>') +
    cluster('a260923p20', 'A city council votes on a new parking garage in Dubai',
      '<A HREF="https://x.com/someone/status/2102850037487116539">@someone</A>') +
    cluster('a260923p21', 'Nvidia posts GPU revenue',
      '<A HREF="https://x.com/nvidia/status/2102850037487116540">@nvidia</A>') +
    cluster('a260923p22', 'Unrelated retail earnings roundup', '') +
    cluster('a260923p23', 'Another unrelated story', '') +
    '</body></html>';

  const tm = parseTechmeme(TM_FIXTURE, nowMs);
  eq('only AI clusters yield candidates', tm.map((c) => c.handle).sort(),
    ['anthropicai', 'nvidia', 'suchenzang']);
  ok('the parking-garage cluster is excluded even though it says Dubai',
    !tm.some((c) => c.handle === 'someone'), JSON.stringify(tm.map((c) => c.handle)));
  ok('Techmeme self-links are excluded', !tm.some((c) => c.handle.toLowerCase() === 'techmeme'));
  eq('citation context is the story headline',
    tm.find((c) => c.handle === 'anthropicai').citation.context,
    'Anthropic says Claude autonomously discovered a new enzyme system');
  eq('citation url is the Techmeme story permalink',
    tm.find((c) => c.handle === 'anthropicai').citation.url,
    'https://www.techmeme.com/260923/p34#a260923p34');
  eq('byline is carried', tm.find((c) => c.handle === 'anthropicai').citation.byline,
    'Robert Hart / The Verge');
  eq('a lab handle is tagged as an official account',
    tm.find((c) => c.handle === 'anthropicai').matched_by, 'official_account');
  eq('a civilian handle is tagged as headline-matched',
    tm.find((c) => c.handle === 'suchenzang').matched_by, 'techmeme_headline');
  eq('permalink falls back when the anchor is missing', techmemePermalink(null),
    'https://www.techmeme.com/');
  ok('a page with too few clusters throws rather than reporting a quiet day',
    (() => { try { parseTechmeme('<html><div class="clus">x</div></html>', nowMs); return false; }
             catch (e) { return /markup has changed/.test(e.message); } })());

  console.log('ranking');
  const mk = (id, handle, hours, cites, official = false) => ({
    id, author_handle: handle, official,
    posted_at: new Date(nowMs - hours * 3600_000).toISOString(),
    cited_by: cites,
  });
  const TM = [{ source: 'techmeme', label: 'Techmeme' }];
  const HN = (p) => [{ source: 'hn', label: 'Hacker News', points: p }];
  const ranked = rankItems([
    mk('1001', 'loud', 1, TM),
    mk('1002', 'loud', 1, TM),
    mk('1003', 'loud', 1, TM),
    mk('1004', 'quiet', 2, HN(400)),
  ], nowMs);
  eq('all four ranked', ranked.length, 4);
  ok('a second post by one author is halved',
    ranked.find((r) => r.id === '1002' || r.id === '1003').rank_explain.author_diversity_factor === 0.5);
  ok('one author cannot hold the top three slots',
    new Set(ranked.slice(0, 3).map((r) => r.author_handle)).size > 1,
    ranked.map((r) => `${r.author_handle}:${r.rank_score}`).join(' '));
  ok('a 400-point HN citation outranks a bare Techmeme citation',
    ranked[0].id === '1004',
    ranked.map((r) => `${r.id}/${r.author_handle}:${r.rank_score}`).join(' '));
  ok('each repeat by one author scores below the last',
    (() => {
      const loud = ranked.filter((r) => r.author_handle === 'loud').map((r) => r.rank_score);
      return loud.length === 3 && loud[0] > loud[1] && loud[1] > loud[2];
    })());
  ok('decay floors at 0.25',
    rankItems(Array.from({ length: 6 }, (_, i) => mk(`20${i}`, 'loud', 1, TM)), nowMs)
      .every((r) => r.rank_explain.author_diversity_factor >= 0.25));
  ok('older ranks below newer, all else equal',
    (() => {
      const r = rankItems([mk('3001', 'a', 1, TM), mk('3002', 'b', 60, TM)], nowMs);
      return r[0].id === '3001';
    })());

  console.log('');
  if (failures.length) {
    console.error(`x-surface selftest: ${failures.length} FAILURE(S)\n`);
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exitCode = 1;
  } else {
    console.log('x-surface selftest: all checks passed');
  }
}

// Only act when run as a script. The pure helpers above (sanitizeEmbedHtml,
// postedAtFromId, parseTechmeme, rankItems…) are exported so the site build and
// any future test can import them; without this guard an `import` of this file
// would silently fire a discovery run and up to 16 oEmbed calls as a side
// effect of asking for a regex.
const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (!isEntryPoint) {
  // imported for its helpers — do nothing
} else if (process.argv.includes('--selftest')) {
  selftest();
} else {
  main().catch((err) => {
    // Reaching here means the run could not be set up at all. No file is
    // written, so the site keeps rendering the previous surface with its own
    // (older) generated_at, which is honest.
    console.error(`x-surface: fatal — ${err?.message ?? err}`);
    process.exitCode = 1;
  });
}
