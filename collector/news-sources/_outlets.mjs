// Outlet identity — who actually published a thing, as opposed to which feed
// we happened to read it through.
//
// The breaking-news rule (collector/breaking.mjs) counts INDEPENDENT outlets.
// That is not the same as counting source ids: two Reddit subs are one
// platform, the OpenAI status page and the OpenAI blog are one company, and a
// Google News result for a Reuters story IS Reuters. So every item resolves to
// an outlet key here — a registrable domain for anything that points at an
// article, or `x:<handle>` / `bsky:<handle>` for a social post by an account we
// cannot map to a newsroom.
//
// Social accounts we have NOT vetted are flagged `unvetted`. They can appear in
// the newsroom (with a low weight) but they never count toward corroboration
// in the breaking rule: an anonymous account repeating a rumour is not a
// second source.
//
// Helper, not an adapter: collector/news.mjs skips `_`-prefixed files.

// Second-level labels under which the registrable domain is THREE labels
// (bbc.co.uk, abc.net.au). A short list rather than the public-suffix list,
// because the repo takes no dependencies and these are the cases that occur.
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu', 'ne', 'or']);

// One publisher under several domains. Keyed by registrable domain.
export const OUTLET_ALIASES = Object.freeze({
  'bbc.com': 'bbc.co.uk',
  'bbci.co.uk': 'bbc.co.uk',
  'nyti.ms': 'nytimes.com',
  'reutersagency.com': 'reuters.com',
  'fb.com': 'meta.com',
  'facebook.com': 'meta.com',
  'deepmind.com': 'deepmind.google',
  'googleblog.com': 'blog.google',
  'chatgpt.com': 'openai.com',
  'claude.ai': 'anthropic.com',
  'claude.com': 'anthropic.com',
  'theguardian.co.uk': 'theguardian.com',
  'washpost.com': 'washingtonpost.com',
});

/** news.bbc.co.uk -> bbc.co.uk, status.openai.com -> openai.com. Null on junk. */
export function registrableDomain(hostOrUrl) {
  let host = String(hostOrUrl ?? '').trim().toLowerCase();
  if (!host) return null;
  if (/^[a-z]+:\/\//.test(host)) {
    try { host = new URL(host).hostname; } catch { return null; }
  }
  host = host.replace(/^www\./, '').replace(/\.$/, '');
  if (!/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host)) return null;
  const parts = host.split('.');
  let reg = host;
  if (parts.length > 2) {
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    reg = tld.length === 2 && SECOND_LEVEL.has(sld) ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
  }
  return OUTLET_ALIASES[reg] ?? reg;
}

// Official X accounts whose posts ARE the outlet's own publication. Lower-case
// handle -> registrable domain. A post by @Reuters and a reuters.com article
// are one outlet, not two.
export const X_HANDLE_OUTLETS = Object.freeze({
  openai: 'openai.com',
  openaidevs: 'openai.com',
  chatgptapp: 'openai.com',
  anthropicai: 'anthropic.com',
  claudeai: 'anthropic.com',
  googledeepmind: 'deepmind.google',
  googleai: 'blog.google',
  google: 'blog.google',
  aiatmeta: 'meta.com',
  mistralai: 'mistral.ai',
  xai: 'x.ai',
  nvidia: 'nvidia.com',
  microsoft: 'microsoft.com',
  huggingface: 'huggingface.co',
  reuters: 'reuters.com',
  reuterstech: 'reuters.com',
  ap: 'apnews.com',
  bloomberg: 'bloomberg.com',
  business: 'bloomberg.com',
  technology: 'bloomberg.com',
  bbcbreaking: 'bbc.co.uk',
  bbctech: 'bbc.co.uk',
  nytimes: 'nytimes.com',
  wsj: 'wsj.com',
  ft: 'ft.com',
  washingtonpost: 'washingtonpost.com',
  verge: 'theverge.com',
  techcrunch: 'techcrunch.com',
  wired: 'wired.com',
  arstechnica: 'arstechnica.com',
  cnbc: 'cnbc.com',
  axios: 'axios.com',
  theinformation: 'theinformation.com',
  techmeme: 'techmeme.com',
  guardian: 'theguardian.com',
  technologyreview: 'technologyreview.com',
});

// Named people at the labs and well-known AI reporters on X. Their posts are
// vetted (they count as a source) but each is its own outlet, `x:<handle>`.
export const X_VETTED_PEOPLE = Object.freeze(new Set([
  'sama', 'gdb', 'darioamodei', 'demishassabis', 'sundarpichai', 'satyanadella',
  'elonmusk', 'ylecun', 'karpathy', 'mustafasuleyman', 'alexandr_wang',
  'kevinroose', 'caseynewton', 'karaswisher', 'emollick', 'simonw',
]));

// Bluesky. Domain handles are verified by DNS on Bluesky's side, which is why
// most of this list is newsrooms: a handle like `reuters.com` can only be held
// by whoever controls reuters.com. Handle -> outlet domain.
export const BSKY_OUTLETS = Object.freeze({
  'reuters.com': 'reuters.com',
  'apnews.com': 'apnews.com',
  'nytimes.com': 'nytimes.com',
  'washingtonpost.com': 'washingtonpost.com',
  'bloomberg.com': 'bloomberg.com',
  'theverge.com': 'theverge.com',
  'techcrunch.com': 'techcrunch.com',
  'wired.com': 'wired.com',
  'arstechnica.com': 'arstechnica.com',
  'technologyreview.com': 'technologyreview.com',
  '404media.co': '404media.co',
  'theatlantic.com': 'theatlantic.com',
  'npr.org': 'npr.org',
  'axios.com': 'axios.com',
  'theguardian.com': 'theguardian.com',
  'engadget.com': 'engadget.com',
  'semafor.com': 'semafor.com',
  'politico.com': 'politico.com',
  'platformer.news': 'platformer.news',
  'techmeme.com': 'techmeme.com',
  'simonwillison.net': 'simonwillison.net',
});

// Individual reporters and researchers on Bluesky whose posts count as a
// source. Each is its own outlet, `bsky:<handle>`.
export const BSKY_VETTED_PEOPLE = Object.freeze(new Set([
  'caseynewton.bsky.social',
  'emollick.bsky.social',
  'garymarcus.bsky.social',
]));

// TIER ONE. A lab's own channel (blog, status page, official account) or a
// newsroom of wire / paper-of-record / major-tech-desk class. One of these plus
// one more independent outlet is enough to call something BREAKING.
export const TIER1_OUTLETS = Object.freeze(new Set([
  // the labs themselves
  'openai.com', 'anthropic.com', 'deepmind.google', 'blog.google', 'meta.com',
  'mistral.ai', 'x.ai', 'nvidia.com', 'microsoft.com',
  // wires and papers of record
  'reuters.com', 'apnews.com', 'bloomberg.com', 'bbc.co.uk', 'bbc.com',
  'nytimes.com', 'wsj.com', 'ft.com', 'washingtonpost.com', 'theguardian.com',
  'cnbc.com', 'axios.com', 'theinformation.com',
  // the tech desks
  'theverge.com', 'techcrunch.com', 'wired.com', 'arstechnica.com',
]));

/** Outlet key for an X handle, plus whether it is vetted. */
export function xOutlet(handle) {
  const h = String(handle ?? '').replace(/^@/, '').toLowerCase();
  if (!h) return { outlet: null, vetted: false };
  if (X_HANDLE_OUTLETS[h]) return { outlet: X_HANDLE_OUTLETS[h], vetted: true };
  return { outlet: `x:${h}`, vetted: X_VETTED_PEOPLE.has(h) };
}

/** Outlet key for a Bluesky handle, plus whether it is vetted. */
export function bskyOutlet(handle) {
  const h = String(handle ?? '').replace(/^@/, '').toLowerCase();
  if (!h) return { outlet: null, vetted: false };
  if (BSKY_OUTLETS[h]) return { outlet: BSKY_OUTLETS[h], vetted: true };
  return { outlet: `bsky:${h}`, vetted: BSKY_VETTED_PEOPLE.has(h) };
}

export function isTier1(outlet) {
  return TIER1_OUTLETS.has(String(outlet ?? ''));
}
