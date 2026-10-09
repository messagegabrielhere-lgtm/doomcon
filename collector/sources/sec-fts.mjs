// SEC EDGAR full-text search: how often US public companies say "artificial
// intelligence" in their filings. Corporate AI mention velocity — a disclosure
// signal, not a price signal, which is why it sits in the compute/capital
// pillar rather than markets: filings track where money is being committed.
//
// Endpoint is keyless and undocumented-but-stable. Verified 2026-09-22:
// a trailing-30-day window returns hits.total.value = 3585, relation "eq".

import { secUserAgents } from '../infra-sources/_sec.mjs';

const ENDPOINT = 'https://efts.sec.gov/LATEST/search-index';

// The phrase is quoted so EDGAR matches it as a phrase, not as two loose terms.
// Unquoted, "artificial" OR "intelligence" drags in every intelligence-agency
// contractor and the count stops meaning anything.
const QUERY = '"artificial intelligence"';

const WINDOW_DAYS = 30;

// EDGAR wants plain YYYY-MM-DD. Slicing the ISO string keeps this in UTC; using
// toLocaleDateString would silently shift the window by a day for anyone west
// of Greenwich and make the series non-reproducible across machines.
function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// POLITE RETRY (2026-10-08).
//
// From GitHub's runners efts.sec.gov answers 403 / 429 / 503 intermittently:
// the same declared-contact request that fails at :07 often passes a few
// seconds later. One attempt per hour was turning a transient WAF mood into a
// dark compute pillar and a frozen level. So: up to ROUNDS rounds, each round
// trying the declared UAs in their fixed order, with a pause of 8s then 20s
// between rounds (or the server's Retry-After, when it states one and it fits).
//
// What this is NOT: it is not a way around SEC's fair-access policy. Every
// request still declares a real contact, never a browser; three rounds of at
// most two requests is six requests an hour, far under SEC's 10 req/s ceiling;
// and the whole walk is bounded by BUDGET_MS so it can never outlive
// collect.mjs's 90s adapter watchdog. A 4xx other than 403/429 is a statement
// about our request, so it is not retried at all.
//
// fetch.mjs's own retry is switched off (retries: 0) for these calls so the
// two retry loops do not multiply into a burst.
// ---------------------------------------------------------------------------
export const RETRY_WAITS_MS = [8_000, 20_000];
export const ROUNDS = RETRY_WAITS_MS.length + 1;
export const BUDGET_MS = 65_000;
const PER_REQUEST_TIMEOUT_MS = 15_000;
const MIN_USEFUL_TIMEOUT_MS = 3_000;
const MAX_RETRY_AFTER_MS = 30_000;

const REAL_CLOCK = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/** HTTP status from a FetchError, or parsed out of its message as a fallback. */
export function statusOf(err) {
  if (err && Number.isInteger(err.status)) return err.status;
  const m = /\bHTTP (\d{3})\b/.exec(String(err?.message ?? ''));
  return m ? Number(m[1]) : null;
}

/** Worth asking again later: SEC's WAF (403), throttle (429), 5xx, transport. */
export function isTransient(err) {
  const st = statusOf(err);
  if (st === 403 || st === 429) return true;
  if (st !== null && st >= 500 && st <= 599) return true;
  return err?.kind === 'timeout' || err?.kind === 'network';
}

/**
 * Retry-After in ms, if the error carries one. fetch.mjs's FetchError does not
 * currently expose response headers, so this looks in the places a future
 * version would put it and otherwise returns null (and the fixed wait applies).
 */
export function retryAfterMs(err, nowMs = Date.now()) {
  const raw = err?.retryAfter ?? err?.headers?.['retry-after'] ?? err?.headers?.get?.('retry-after');
  if (raw === undefined || raw === null || raw === '') return null;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) return Math.round(secs * 1000);
  const at = Date.parse(String(raw));
  return Number.isFinite(at) ? Math.max(0, at - nowMs) : null;
}

export async function politeFetch(fetchJson, url, uas, clock = REAL_CLOCK) {
  const started = clock.now();
  const deadline = started + BUDGET_MS;
  const log = [];
  let lastErr = null;

  for (let round = 0; round < ROUNDS; round++) {
    let retryHint = null;
    for (const ua of uas) {
      const left = deadline - clock.now();
      if (left < MIN_USEFUL_TIMEOUT_MS) break;
      try {
        const body = await fetchJson(url, {
          headers: { 'user-agent': ua },
          retries: 0,
          timeoutMs: Math.min(PER_REQUEST_TIMEOUT_MS, left),
        });
        log.push({ round: round + 1, ua_index: uas.indexOf(ua), status: 200 });
        return { body, attempts: log };
      } catch (err) {
        lastErr = err;
        const st = statusOf(err);
        log.push({ round: round + 1, ua_index: uas.indexOf(ua), status: st, kind: err?.kind ?? null });
        if (!isTransient(err)) throw err;
        const hint = retryAfterMs(err, clock.now());
        if (hint !== null) retryHint = Math.max(retryHint ?? 0, hint);
        // 403 is the WAF judging this UA: the next declared UA may pass.
        // 429/5xx/transport are about the server or the pipe, and asking
        // again at once with a different UA is exactly the burst to avoid.
        if (st !== 403) break;
      }
    }
    if (round === ROUNDS - 1) break;
    const base = RETRY_WAITS_MS[round];
    const wait = retryHint !== null ? Math.max(base, Math.min(retryHint, MAX_RETRY_AFTER_MS)) : base;
    // Only wait if a request can still usefully follow the wait.
    if (clock.now() + wait + MIN_USEFUL_TIMEOUT_MS > deadline) break;
    await clock.sleep(wait);
  }

  const summary = log.map((a) => `${a.status ?? a.kind ?? '?'}`).join(',');
  const err = new Error(
    `sec-fts: no answer after ${log.length} polite attempt(s) in ${Math.round((clock.now() - started) / 1000)}s ` +
    `[${summary}] — last: ${lastErr?.message ?? 'no request could be made within the time budget'}`
  );
  err.status = statusOf(lastErr);
  err.attempts = log;
  throw err;
}

export default {
  id: 'sec-fts',
  pillar: 'compute',
  label: 'SEC filings mentioning AI (30d)',

  // `clock` is a test seam ({ now, sleep }); collect.mjs passes only fetchJson.
  async collect(fetchJson, clock = REAL_CLOCK) {
    const endMs = Date.now();
    const startMs = endMs - WINDOW_DAYS * 86400_000;
    const startdt = isoDate(startMs);
    const enddt = isoDate(endMs);

    const qs = new URLSearchParams({
      q: QUERY,
      dateRange: 'custom',
      startdt,
      enddt,
    });

    // Contact + UA shapes live in infra-sources/_sec.mjs so live collect,
    // backfill, and the datacentre readers refuse the same WAF tokens
    // (URLs, "github", blank Actions secrets). politeFetch below still owns
    // the multi-round backoff for flaky 403/429/503 from the runners.
    const UAS = secUserAgents();
    const { body, attempts } = await politeFetch(fetchJson, `${ENDPOINT}?${qs}`, UAS, clock);

    const total = body?.hits?.total;
    if (!total || typeof total.value !== 'number') {
      throw new Error(
        `sec-fts: no hits.total.value in response (got keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
      );
    }

    // THE TRAP. EDGAR's counter saturates at 10000 and flips relation from
    // "eq" to "gte". A saturated count looks like a perfectly good number and
    // would pin this series flat at 10000 forever once AI chatter grows past
    // the ceiling — a confident reading over a censored pipe, which is exactly
    // the failure this project exists to not repeat. Go dark instead, loudly.
    if (total.relation !== 'eq') {
      throw new Error(
        `sec-fts: hit count saturated at ${total.value} (relation="${total.relation}"); ` +
        `the ${WINDOW_DAYS}d window must be narrowed before this source is trustworthy again`
      );
    }

    if (!Number.isFinite(total.value)) {
      throw new Error(`sec-fts: non-finite hit count ${total.value}`);
    }

    return {
      value: total.value,
      unit: 'filings/30d',
      observed_at: new Date(endMs).toISOString(),
      meta: {
        query: QUERY,
        window_days: WINDOW_DAYS,
        startdt,
        enddt,
        relation: total.relation,
        // How many requests this reading cost, and which declared UA answered.
        // Published so a run that needed the backoff is visible in the receipt.
        attempts,
        source_note: 'efts.sec.gov full-text search; total hit count, not a page of rows',
      },
    };
  },
};
