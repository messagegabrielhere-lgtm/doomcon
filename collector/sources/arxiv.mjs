// Capability pillar — research output.
//
// arXiv is the closest thing the field has to a heartbeat: cs.AI + cs.LG + cs.CL
// is where the work lands before it lands anywhere else, and the API hands back an
// exact population count rather than a sample, so this source has no estimation
// error at all. That is rare enough to be worth the XML.

import { setTimeout as sleep } from 'node:timers/promises';
import { fetchText as defaultFetchText } from '../fetch.mjs';

const WINDOW_DAYS = 7;

// Weekly, not daily, on purpose. arXiv announcements are batched on a weekday
// schedule with nothing on weekends; a 24h window would oscillate on the calendar
// rather than on the field, and the NowCast smoother downstream would faithfully
// reproduce that artefact.
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

// http:// 301s to https:// (verified 2026-09-23). Skip the hop.
const ENDPOINT = 'https://export.arxiv.org/api/query';

// A 429 from this query comes back in about a second. The ban after it often
// lasts longer than the old 15s retry, which is why 03:50, 04:05 and 04:25 UTC
// on 2026-10-08 all went dark and took Capability with them. Two further
// attempts, 30s then 60s later, stay inside collect.mjs's arxiv watchdog.
export const ARXIV_ATTEMPT_TIMEOUT_MS = 75_000;
export const ARXIV_RATE_LIMIT_WAITS_MS = Object.freeze([30_000, 60_000]);

export function isArxivRateLimit(err) {
  return /\b429\b|rate exceeded/i.test(String(err && err.message));
}

export async function fetchArxivWindow(fetchText, url, {
  waits = ARXIV_RATE_LIMIT_WAITS_MS,
  sleepFn = sleep,
  timeoutMs = ARXIV_ATTEMPT_TIMEOUT_MS,
} = {}) {
  const attempts = waits.length + 1;
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetchText(url, { timeoutMs, retries: 0 });
    } catch (err) {
      lastErr = err;
      const wait = waits[attempt];
      if (!isArxivRateLimit(err) || wait == null) throw err;
      await sleepFn(wait);
    }
  }
  throw lastErr;
}

/** arXiv's submittedDate filter takes UTC YYYYMMDDHHMM. */
function stamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
  );
}

export default {
  id: 'arxiv',
  pillar: 'capability',
  label: 'arXiv AI submissions',

  // fetchText is injected-with-a-default rather than taken from the contract's
  // `collect(fetchJson)` parameter because this source is Atom XML. It is still
  // the shared helper from collector/fetch.mjs, so timeout/retry/UA all hold.
  async collect(fetchJson, { fetchText = defaultFetchText } = {}) {
    const observedAt = new Date();
    const from = stamp(new Date(observedAt.getTime() - WINDOW_MS));
    const to = stamp(observedAt);

    // Built by hand, not with URLSearchParams: arXiv's query language wants literal
    // `+` for spaces and literal brackets around the date range, and percent-encoding
    // them is a coin flip on their parser. WHATWG URL leaves both alone.
    const query =
      `(cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL)+AND+submittedDate:[${from}+TO+${to}]`;
    const url = `${ENDPOINT}?search_query=${query}&start=0&max_results=1`;

    // Two deliberate deviations from the fetch.mjs defaults, both measured:
    //   timeoutMs  a windowed submittedDate query is a range scan on arXiv's side
    //              and regularly runs past the 15s default; the unwindowed form
    //              answers in well under a second.
    //   retries    ZERO inside fetch.mjs. A 429 retry there is a few hundred
    //              milliseconds, which is what turned a soft throttle into a ban.
    //              The waits below are the exception, and only for 429.
    const xml = await fetchArxivWindow(fetchText, url);

    // arXiv answers a malformed query with HTTP 200 and an error entry, so a
    // non-error status proves nothing. Check the payload.
    if (/<title>\s*Error\s*<\/title>/i.test(xml)) {
      const reason = xml.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1]?.trim() ?? 'no summary';
      throw new Error(`arxiv: API returned an error entry for ${url} — ${reason}`);
    }

    // Regex rather than an XML parser: CONTRACT.md §1.1 forbids dependencies, and
    // this is one scalar in a namespaced tag, not a document to walk.
    const match = xml.match(/<opensearch:totalResults[^>]*>\s*(\d+)\s*<\/opensearch:totalResults>/i);
    if (!match) {
      throw new Error(
        `arxiv: no <opensearch:totalResults> in response from ${url} — ` +
          `feed shape changed (first 200 chars: ${xml.slice(0, 200).replace(/\s+/g, ' ')})`,
      );
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value)) {
      throw new Error(`arxiv: totalResults "${match[1]}" is not a finite number`);
    }

    // Zero is a legitimate reading for a narrow window but never for a 7-day one
    // across the three busiest CS categories. If it happens, the date filter stopped
    // matching — which is a dead source wearing a plausible number, the exact
    // failure mode this project exists to avoid.
    if (value === 0) {
      throw new Error(
        `arxiv: 0 submissions over ${WINDOW_DAYS}d for cs.AI/cs.LG/cs.CL — ` +
          `implausible, treating the submittedDate filter as broken (${url})`,
      );
    }

    return {
      value,
      unit: `papers/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: { window_days: WINDOW_DAYS, window_from: from, window_to: to, categories: ['cs.AI', 'cs.LG', 'cs.CL'] },
    };
  },
};
