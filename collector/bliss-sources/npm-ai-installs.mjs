// ADOPTION pillar — people building things.
//
// Every other source in this index counts what LABS produce. This counts what
// everybody else does with it: an npm install is a developer, somewhere, starting
// or redeploying something. It is the application layer rather than the research
// layer, which is exactly what makes it the adoption signal — a model nobody wires
// into anything is a capability, not an adoption.
//
// WHY NPM AND NOT PYPI. The first version of this adapter read pypistats.org for
// an eight-package Python basket. It was replaced after measurement, for two
// reasons worth recording rather than quietly fixing:
//   1. pypistats answers a burst with HTTP 429, carrying no Retry-After and no
//      rate-limit headers - just a link to its etiquette page. collector/fetch.mjs
//      deliberately never retries a 429 (retrying a soft throttle is how a client
//      earns a hard ban), so every 429 is a dark run.
//   2. The basket needed one request per package. Eight requests per run at hourly
//      cadence is ~192 requests a day against a volunteer-run service, for one
//      scalar. npm's registry API answers an entire unscoped basket in ONE request.
// Fewer requests against an API built to serve them is the responsible engineering
// choice, and it also happens to be the more reliable source. See docs/BLISS.md.
//
// A BASKET METRIC, AND THEREFORE ALL-OR-NOTHING. The value is a sum over a fixed
// set, so a member that fails to answer is not a smaller number - it is a
// DIFFERENT number, silently. Dropping `openai` alone would take ~28M off the
// weekly total and look exactly like the world losing interest. Any failure takes
// the whole source dark, which is the same call collector/sources/github-releases.mjs
// makes for the same reason.
//
// Measured 2026-09-24, downloads for the week 2026-09-15 to 2026-09-21:
// openai 27.78M, @anthropic-ai/sdk 27.72M, ai 17.88M, @google/generative-ai 2.84M,
// langchain 2.03M, tiktoken 1.11M, ollama 0.51M, @huggingface/inference 0.32M.

const ENDPOINT = 'https://api.npmjs.org/downloads/point/last-week';

// last-week, not last-day. Daily downloads have a hard weekday cycle - CI fleets
// do not run at the weekend - and a 24h window would make this source oscillate on
// the calendar rather than on adoption, with the NowCast smoother downstream
// faithfully reproducing the artefact.
//
// The basket is FIXED. Adding a package mid-series makes the number jump for a
// reason that has nothing to do with adoption, and every percentile computed
// against the frozen reference after that point measures the edit rather than the
// world. Changing this list creates a NEW source; it does not update this one.
//
// Split in two because of an API limitation, not a taxonomy: npm answers
// "scoped packages are not currently supported in bulk lookups" with HTTP 400,
// so the scoped names have to be fetched one at a time.
const BULK = ['openai', 'ai', 'langchain', 'tiktoken', 'ollama'];
const SCOPED = ['@anthropic-ai/sdk', '@google/generative-ai', '@huggingface/inference'];

/** Pulls a finite download count out of one npm response envelope, or throws. */
function readDownloads(entry, name, url) {
  const n = entry?.downloads;
  if (!Number.isFinite(n)) {
    throw new Error(
      `npm-ai-installs: package "${name}" returned no finite .downloads ` +
        `(got ${JSON.stringify(n)}) from ${url} — the basket is a fixed set and a missing ` +
        `member silently changes what the sum measures, so the whole source goes dark`,
    );
  }
  if (n === 0) {
    throw new Error(
      `npm-ai-installs: package "${name}" reported 0 downloads for the week — implausible for ` +
        `a basket member, treating it as a stats-pipeline failure rather than folding a zero into the sum`,
    );
  }
  return n;
}

export default {
  id: 'npm-ai-installs',
  pillar: 'adoption',
  label: 'npm installs of the AI application stack',

  async collect(fetchJson) {
    const observedAt = new Date();

    const perPackage = {};
    let total = 0;
    let windowStart = null;
    let windowEnd = null;

    // One request for the five unscoped packages.
    const bulkUrl = `${ENDPOINT}/${BULK.join(',')}`;
    const bulk = await fetchJson(bulkUrl);
    if (!bulk || typeof bulk !== 'object') {
      throw new Error(`npm-ai-installs: expected an object from ${bulkUrl}, got ${typeof bulk} — API shape changed`);
    }
    for (const name of BULK) {
      // A bulk response keys by package name and uses null for "no data". Reading
      // it positionally, or with a fallback, would let a null become a zero.
      const n = readDownloads(bulk[name], name, bulkUrl);
      perPackage[name] = n;
      total += n;
      if (bulk[name].start) windowStart = bulk[name].start;
      if (bulk[name].end) windowEnd = bulk[name].end;
    }

    // Scoped names, one request each — npm rejects them in a bulk lookup.
    for (const name of SCOPED) {
      const url = `${ENDPOINT}/${name}`;
      const body = await fetchJson(url);
      const n = readDownloads(body, name, url);
      perPackage[name] = n;
      total += n;
      if (body.start) windowStart = body.start;
      if (body.end) windowEnd = body.end;
    }

    return {
      value: total,
      unit: 'installs/7d',
      observed_at: observedAt.toISOString(),
      meta: {
        basket: [...BULK, ...SCOPED],
        basket_size: BULK.length + SCOPED.length,
        per_package: perPackage,
        // npm reports the exact week it counted. Carried through because the
        // registry's week lags the clock by a day or two and a reader comparing
        // this against their own query needs to know which seven days these are.
        window_start: windowStart,
        window_end: windowEnd,
        requests: 1 + SCOPED.length,
      },
    };
  },
};
