// Bluesky — AI posts from vetted newsrooms and reporters, via the public AppView.
//
// Keyless. Two doors, tried in order:
//
//   1. app.bsky.feed.searchPosts on public.api.bsky.app, one request per
//      query, sort=latest. Kept: posts by an account on the allowlist in
//      _outlets.mjs (newsrooms hold DNS-verified domain handles there, so
//      `reuters.com` can only be Reuters), OR posts that drew real engagement
//      (likes + reposts >= HIGH_ENGAGEMENT). The second class is flagged
//      `unvetted`: it can appear in the newsroom, never as corroboration.
//   2. If search refuses us (Bluesky has answered unauthenticated search with
//      403 from some networks), app.bsky.feed.getAuthorFeed for the newsroom
//      allowlist instead. Same filter, same output.
//
// Both doors failing is a dark source, never an empty one.
//
// The item URL is the post itself (bsky.app/profile/<handle>/post/<rkey>). The
// headline is the linked article's own title when the post carries one (a
// newsroom's post is usually a teaser plus a link card), else the post text.

import { draft, isAiRelevant } from './_feed.mjs';
import { bskyOutlet, BSKY_OUTLETS, BSKY_VETTED_PEOPLE } from './_outlets.mjs';

const APPVIEW = 'https://public.api.bsky.app/xrpc';
export const QUERIES = Object.freeze(['OpenAI', 'Anthropic', 'AGI', 'GPT', 'Gemini', 'AI model release']);
const SEARCH_LIMIT = 50;
const SINCE_HOURS = 6;
const HIGH_ENGAGEMENT = 300;
const LIKES_FULL_SCALE = 3000;
const PER_RUN_MAX = 25;
// Author-feed fallback: the newsrooms only, and only this many, so a refused
// search does not turn into twenty requests a minute.
const FALLBACK_AUTHORS = Object.keys(BSKY_OUTLETS).slice(0, 12);

/** at://did:plc:x/app.bsky.feed.post/3kabc -> https://bsky.app/profile/<handle>/post/3kabc */
export function postUrl(uri, handle) {
  const m = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([A-Za-z0-9]+)$/.exec(String(uri ?? ''));
  if (!m) return null;
  const who = handle || m[1];
  return `https://bsky.app/profile/${who}/post/${m[2]}`;
}

/**
 * One AppView post view -> a draft, or null when it does not qualify.
 * Pure; exported for the fixture tests.
 */
export function mapPost(p, { nowMs = Date.now(), via = 'search' } = {}) {
  if (!p || typeof p !== 'object') return null;
  const handle = String(p.author?.handle ?? '').toLowerCase();
  const text = typeof p.record?.text === 'string' ? p.record.text.replace(/\s+/g, ' ').trim() : '';
  const url = postUrl(p.uri, handle);
  if (!handle || !url) return null;

  const createdMs = Date.parse(p.record?.createdAt ?? p.indexedAt ?? '');
  if (!Number.isFinite(createdMs)) return null;
  // A future date is a client clock lie; an old one is not news.
  if (createdMs > nowMs + 10 * 60_000 || createdMs < nowMs - SINCE_HOURS * 3_600_000) return null;

  const ext = p.embed?.external ?? p.record?.embed?.external ?? null;
  const extTitle = ext && typeof ext.title === 'string' ? ext.title.replace(/\s+/g, ' ').trim() : '';
  const extUrl = ext && typeof ext.uri === 'string' && /^https?:\/\//i.test(ext.uri) ? ext.uri : null;

  const likes = Number(p.likeCount) || 0;
  const reposts = Number(p.repostCount) || 0;
  const { outlet, vetted } = bskyOutlet(handle);
  const listed = Boolean(BSKY_OUTLETS[handle]) || BSKY_VETTED_PEOPLE.has(handle);
  if (!listed && likes + reposts < HIGH_ENGAGEMENT) return null;

  const headline = (extTitle.length >= 20 ? extTitle : text).slice(0, 200);
  if (headline.length < 12) return null;
  if (!isAiRelevant(`${headline} ${text}`)) return null;

  return draft({
    source: 'bluesky-ai',
    kind: 'forum',
    title: headline,
    summary: `Posted on Bluesky by @${handle}${text && headline !== text.slice(0, 200) ? `: ${text.slice(0, 220)}` : '.'}`,
    url,
    published_at: new Date(createdMs).toISOString(),
    defaultPillar: 'attention',
    // A vetted newsroom's post is a newsroom publishing; an unvetted viral
    // post is chatter, weighted as such.
    weightOverride: vetted ? 0.6 : 0.3,
    engagement: { metric: 'bsky_likes', value: likes, full_scale: LIKES_FULL_SCALE },
    meta: {
      bsky_handle: handle,
      outlet_domain: outlet,
      vetted,
      unvetted: !vetted,
      likes,
      reposts,
      external_url: extUrl,
      via,
    },
  });
}

function collectFrom(posts, nowMs, via, seen, out) {
  for (const p of posts) {
    if (!p || seen.has(p.uri)) continue;
    seen.add(p.uri);
    const d = mapPost(p, { nowMs, via });
    if (d) out.push(d);
  }
}

export default {
  id: 'bluesky-ai',
  kind: 'forum',
  label: 'Bluesky — AI posts from vetted newsrooms and reporters',
  weight: 0.5,
  // Six searches a pass. Every two minutes is well inside the AppView's
  // published per-IP limits and still a conversation's length behind.
  minIntervalMs: 120_000,
  maxItems: 50,

  async collect(_fetchText, fetchJson) {
    const nowMs = Date.now();
    const since = new Date(nowMs - SINCE_HOURS * 3_600_000).toISOString();
    const seen = new Set();
    const out = [];
    let answered = 0;
    let lastErr = null;

    // In parallel: six sequential searches at 8s each would outlast the fast
    // lane's 25-second adapter watchdog on a slow minute.
    const searches = await Promise.allSettled(QUERIES.map(async (q) => {
      const params = new URLSearchParams({ q, sort: 'latest', limit: String(SEARCH_LIMIT), since });
      const body = await fetchJson(`${APPVIEW}/app.bsky.feed.searchPosts?${params}`, { retries: 0, timeoutMs: 8000 });
      if (!body || !Array.isArray(body.posts)) throw new Error('searchPosts answered without a posts array');
      return body.posts;
    }));
    for (const s of searches) {
      if (s.status === 'fulfilled') {
        answered += 1;
        collectFrom(s.value, nowMs, 'search', seen, out);
      } else {
        lastErr = s.reason;
      }
    }

    let via = 'search';
    if (answered === 0) {
      via = 'author-feeds';
      const feeds = await Promise.allSettled(FALLBACK_AUTHORS.map(async (actor) => {
        const params = new URLSearchParams({ actor, limit: '15', filter: 'posts_no_replies' });
        const body = await fetchJson(`${APPVIEW}/app.bsky.feed.getAuthorFeed?${params}`, { retries: 0, timeoutMs: 8000 });
        if (!body || !Array.isArray(body.feed)) throw new Error('getAuthorFeed answered without a feed array');
        return body.feed;
      }));
      let answeredFeeds = 0;
      for (const f of feeds) {
        // One missing handle does not darken the source.
        if (f.status !== 'fulfilled') continue;
        answeredFeeds += 1;
        // Reposts are someone else's post; only the account's own.
        collectFrom(f.value.filter((e) => e && !e.reason).map((e) => e.post), nowMs, 'author-feed', seen, out);
      }
      const feedCount = answeredFeeds;
      if (feedCount === 0) {
        throw new Error(`bluesky-ai: search refused (${lastErr?.message ?? 'no answer'}) and no author feed answered`);
      }
    }

    out.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.url.localeCompare(b.url));
    const kept = out.slice(0, PER_RUN_MAX);
    for (const d of kept) d.meta.mode = via;
    return kept;
  },
};
