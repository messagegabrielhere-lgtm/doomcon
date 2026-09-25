// Shared HTTP helper. CONTRACT.md §1.5: every network call in this repo goes
// through this file. Nothing else may call global fetch() — that is the only way
// timeout, retry policy, User-Agent and error capture stay uniform across a dozen
// adapters written by different hands.
//
// ERROR CONTRACT — read this before writing an adapter:
//   fetchText / fetchJson  ->  resolve with the body, or THROW a FetchError.
//   fetchAll               ->  never throws; resolves to one settled envelope per
//                              input, with the FetchError carried in `.error`.
// "Never throws raw" means a raw TypeError/DOMException from the platform never
// escapes this module: every failure is normalised into FetchError, which carries
// the HTTP status (`.status`), the failure class (`.kind`) and the attempt count.
// Adapters are allowed to throw (CONTRACT.md "Returns { value … } or throws") —
// collect.mjs turns a thrown adapter into `ok:false` and the source goes dark.
// That is the whole point: a dark source is a first-class state, never a zero.

import { setTimeout as sleep } from 'node:timers/promises';

// Identifies the project and links the repo so an operator we are rate-limiting
// can find out who we are and mail us instead of silently banning the IP.
export const USER_AGENT =
  'doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon; AI activity index collector)';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2; // 3 attempts total
const BACKOFF_BASE_MS = 400; // 400ms, then 800ms

// Error bodies get quoted back to the operator. Long enough to show an API's
// error JSON, short enough that a 200KB HTML error page does not land in a receipt.
const ERROR_BODY_EXCERPT = 300;

/** Structured failure. Everything an operator needs to diagnose without a re-run. */
export class FetchError extends Error {
  constructor(message, { url, status = null, kind, attempts = 1, body = null, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'FetchError';
    this.kind = kind; // 'http' | 'network' | 'timeout' | 'parse'
    this.status = status; // HTTP status, or null when we never got a response
    this.url = url;
    this.attempts = attempts;
    this.body = body; // excerpt only
  }

  // Receipts are JSON and must survive a round trip; Error is not JSON-serialisable
  // by default, so an un-handled receipt write would otherwise silently emit {}.
  toJSON() {
    return {
      error: this.message,
      kind: this.kind,
      status: this.status,
      url: this.url,
      attempts: this.attempts,
    };
  }
}

/**
 * Retry only what a retry can actually fix.
 *
 * 5xx and transport failures are the server's or the network's bad day — a second
 * attempt is free information. 4xx is a statement about OUR request; retrying it
 * changes nothing and burns quota.
 *
 * 429 is deliberately in the do-not-retry bucket even though it is the tempting
 * exception. Retrying a rate-limit is how a client turns a soft throttle into a
 * hard ban, and arXiv proved the point during development: the endpoint answered
 * "Rate exceeded" for minutes after a handful of probes. A throttled source is
 * reported dark for that run, which is exactly the honest outcome. Backing off
 * across runs is the collector's job (its cadence), not this function's.
 */
function isRetryable(kind, status) {
  if (kind === 'network' || kind === 'timeout') return true;
  return kind === 'http' && status >= 500 && status <= 599;
}

/** One attempt. Normalises every platform failure mode into FetchError. */
// ---------------------------------------------------------------------------
// Per-host politeness gate.
//
// Four different adapters query export.arxiv.org — collector/sources/arxiv.mjs,
// news-sources/arxiv-newest.mjs, bliss-sources/arxiv-science-ai.mjs and
// backfill.mjs — and the pipeline fires them within the same forty seconds on
// every run. arXiv asks for roughly three seconds between requests and answers
// a burst with "Rate exceeded" for minutes afterwards.
//
// So the 429s were not arXiv being unfriendly. WE WERE RATE-LIMITING
// OURSELVES, and then reporting the capability pillar dark because of it.
//
// This serialises every request to a gated host behind a minimum interval,
// process-wide. A collector that would have burst now queues, which costs a few
// seconds per run and buys back a source the index depends on.
// ---------------------------------------------------------------------------
const HOST_MIN_INTERVAL_MS = {
  'export.arxiv.org': 3500,
  'overpass-api.de': 5000,
  'api.crossref.org': 1000,
};

/** host -> promise chain tail, so callers queue rather than race. */
const hostQueues = new Map();

function hostGate(url) {
  let host;
  try { host = new URL(url).hostname; } catch { return Promise.resolve(); }
  const minMs = HOST_MIN_INTERVAL_MS[host];
  if (!minMs) return Promise.resolve();

  const prev = hostQueues.get(host) ?? Promise.resolve(0);
  const next = prev.then(async (lastAt) => {
    const wait = Math.max(0, (lastAt || 0) + minMs - Date.now());
    if (wait > 0) await sleep(wait);
    return Date.now();
  });
  hostQueues.set(host, next);
  return next;
}

async function attemptOnce(url, { method, headers, timeoutMs }) {
  // Wait our turn on hosts that ask us to. Costs seconds; saves a source.
  await hostGate(url);
  let res;
  try {
    res = await fetch(url, {
      method,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, ...headers },
      // AbortSignal.timeout covers the whole request, including a server that
      // accepts the connection and then dribbles bytes forever.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    // Node raises TimeoutError for AbortSignal.timeout and AbortError for an
    // external abort; both mean "we never got an answer", which is retryable.
    const timedOut = cause?.name === 'TimeoutError' || cause?.name === 'AbortError';
    throw new FetchError(
      timedOut
        ? `timeout after ${timeoutMs}ms: ${url}`
        : `network error: ${cause?.message ?? String(cause)}: ${url}`,
      { url, kind: timedOut ? 'timeout' : 'network', cause },
    );
  }

  let body;
  try {
    body = await res.text();
  } catch (cause) {
    // Headers arrived, the body did not — a reset mid-stream. Transport class.
    throw new FetchError(`network error reading body: ${cause?.message ?? String(cause)}: ${url}`, {
      url,
      status: res.status,
      kind: 'network',
      cause,
    });
  }

  if (!res.ok) {
    throw new FetchError(
      `HTTP ${res.status} ${res.statusText || ''}`.trim() +
        ` from ${url}${body ? ` — ${excerpt(body)}` : ''}`,
      { url, status: res.status, kind: 'http', body: excerpt(body) },
    );
  }

  return { status: res.status, headers: Object.fromEntries(res.headers), body, url: res.url };
}

function excerpt(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > ERROR_BODY_EXCERPT ? `${flat.slice(0, ERROR_BODY_EXCERPT)}…` : flat;
}

async function withRetry(url, opts) {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  let last;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await attemptOnce(url, opts);
    } catch (err) {
      last = err;
      last.attempts = attempt;
      if (attempt > retries || !isRetryable(err.kind, err.status)) break;
      // Deterministic exponential backoff, no jitter. Jitter would be the textbook
      // answer, but CONTRACT.md §1.4 bans Math.random() in this pipeline and a
      // single-client collector has no thundering herd to de-correlate.
      await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
    }
  }
  throw last;
}

function normaliseOpts(opts = {}) {
  return {
    method: opts.method ?? 'GET',
    headers: opts.headers ?? {},
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retries: opts.retries,
  };
}

/**
 * GET a URL and resolve with its body as text. Throws FetchError.
 * Used for the XML/Atom sources (arXiv, GitHub releases) — this repo parses those
 * with regex rather than take an XML-parser dependency (CONTRACT.md §1.1).
 */
export async function fetchText(url, opts = {}) {
  const res = await withRetry(url, normaliseOpts(opts));
  return opts.withMeta ? { data: res.body, status: res.status, headers: res.headers, url: res.url } : res.body;
}

/**
 * GET a URL and resolve with its parsed JSON body. Throws FetchError.
 *
 * `opts.withMeta` returns { data, status, headers, url } instead of bare data.
 * Needed by any source whose pagination lives in a response header — HuggingFace
 * hands out its next-page cursor in `Link`, and there is no way to construct one.
 */
export async function fetchJson(url, opts = {}) {
  const res = await withRetry(url, {
    ...normaliseOpts(opts),
    headers: { accept: 'application/json', ...(opts.headers ?? {}) },
  });

  let data;
  try {
    data = JSON.parse(res.body);
  } catch (cause) {
    // A 200 carrying HTML is the classic captive-portal / error-page / WAF answer.
    // Loud and specific beats a null that becomes a zero three modules downstream.
    throw new FetchError(`invalid JSON from ${url} (HTTP ${res.status}) — ${excerpt(res.body)}`, {
      url,
      status: res.status,
      kind: 'parse',
      body: excerpt(res.body),
      cause,
    });
  }

  return opts.withMeta ? { data, status: res.status, headers: res.headers, url: res.url } : data;
}

/**
 * Fetch many URLs with bounded concurrency. Never rejects — resolves to one
 * envelope per input, in input order:
 *
 *   { key, url, ok: true,  status, value }
 *   { key, url, ok: false, status, error }   // error is a FetchError
 *
 * Callers decide what a partial failure means. For a basket metric (a sum over a
 * fixed set of repos) a missing member is a silent zero, so github-releases treats
 * any failure as fatal. Other callers may legitimately tolerate gaps — that
 * judgement belongs to the adapter, not here.
 *
 * Items are `string` or `{ url, key?, parse?: 'json' | 'text', ...fetchOpts }`.
 * Concurrency is capped low on purpose: these are other people's free APIs, and
 * politeness is cheaper than an IP ban.
 */
export async function fetchAll(list, { concurrency = 4 } = {}) {
  const items = list.map((item, i) => {
    const spec = typeof item === 'string' ? { url: item } : item;
    if (!spec?.url) throw new TypeError(`fetchAll: item ${i} has no url`);
    return { key: spec.key ?? spec.url, ...spec };
  });

  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      const { key, url, parse = 'json', ...opts } = items[i];
      try {
        const value = parse === 'text' ? await fetchText(url, opts) : await fetchJson(url, opts);
        results[i] = { key, url, ok: true, status: 200, value };
      } catch (error) {
        results[i] = { key, url, ok: false, status: error.status ?? null, error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
