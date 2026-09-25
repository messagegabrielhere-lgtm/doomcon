// Wikimedia Pageviews — public curiosity about AI, trailing 7 complete days.
// Pillar: attention.
//
// This is the closest thing to a free Google Trends with a documented, keyless,
// stable API. It measures the general public looking things up, which is a
// different population from the HN source and is why both exist.

import { fetchAll as defaultFetchAll } from '../fetch.mjs';

// FROZEN SET. Adding or removing an article silently rebases this source's
// scalar, and the engine normalises against a reference distribution that is
// built once and never updated live (CONTRACT "Index maths" step 1). A changed
// set would therefore be scored against a distribution for a different
// measurement — the percentile would be arithmetically valid and factually
// meaningless. If this list ever must change, the reference distribution has to
// be rebuilt in the same commit and the change called out in the receipt.
//
// Every title below was confirmed to return data on 2026-09-23. Titles are
// exact en.wikipedia article names; redirects are NOT followed by this API, so
// a rename upstream shows up as a hard 404 rather than as drifting numbers.
const ARTICLES = Object.freeze([
  'Artificial_intelligence',
  'Large_language_model',
  'Artificial_general_intelligence',
  'OpenAI',
  'ChatGPT',
  'Anthropic',
  'Machine_learning',
  'Google_DeepMind',
  'Generative_artificial_intelligence',
]);

const WINDOW_DAYS = 7;

// We ask for more days than we need and take the newest WINDOW_DAYS that come
// back. Wikimedia's publication lag is not contractually fixed, so a fixed
// request window sized exactly to 7 days would go dark the first time the lag
// widened by a day.
const REQUEST_DAYS = 12;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Wikimedia wants YYYYMMDD in UTC. */
function toApiDate(ms) {
  return new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
}

/** `2026092200` (the API's own hourly-zero stamp) -> a real UTC Date. */
function parseTimestamp(stamp) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(String(stamp));
  if (!m) throw new Error(`wikipedia: unparseable pageviews timestamp ${JSON.stringify(stamp)}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4])));
}

function buildUrl(article, startMs, endMs) {
  // encodeURIComponent, not URLSearchParams: the article is a PATH segment.
  // Titles with slashes or ampersands would otherwise break out of the segment.
  return 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article' +
    `/en.wikipedia/all-access/user/${encodeURIComponent(article)}` +
    `/daily/${toApiDate(startMs)}/${toApiDate(endMs)}`;
}

export default {
  id: 'wikipedia',
  pillar: 'attention',
  label: 'Wikipedia AI article pageviews (7d mean)',

  async collect(fetchJson, { fetchAll = defaultFetchAll } = {}) {
    const nowMs = Date.now();
    const startMs = nowMs - REQUEST_DAYS * MS_PER_DAY;

    // Measured 2026-09-23: requesting through the current UTC day returns
    // nothing for it — Wikimedia publishes complete UTC days only, never a
    // partial one. So no day needs to be discarded as half-counted, and the
    // newest row that comes back is always a full 24 hours.
    //
    // fetchAll rather than nine bare fetchJson calls: it bounds concurrency at
    // 4. Nine simultaneous requests from one CI egress IP is how you get a
    // keyless free API to decide you are worth rate-limiting.
    const envelopes = await fetchAll(
      ARTICLES.map((article) => ({ key: article, url: buildUrl(article, startMs, nowMs) }))
    );

    const responses = envelopes.map((envelope) => {
      if (!envelope.ok) {
        // fetchAll never throws; it hands back the FetchError. Rethrowing here
        // is what takes the whole source dark — see the frozen-set note below.
        throw new Error(`wikipedia: ${envelope.key} failed — ${envelope.error?.message ?? 'unknown error'}`);
      }
      const body = envelope.value;
      if (!body || !Array.isArray(body.items)) {
        // The API answers a missing/renamed article with a 404 JSON body
        // carrying `detail`. Surface that text — it is the only thing that
        // distinguishes "article renamed" from "Wikimedia is down".
        const detail = body && body.detail ? ` — ${body.detail}` : '';
        throw new Error(`wikipedia: no items for ${envelope.key}${detail}`);
      }
      return { article: envelope.key, items: body.items };
    });

    // A missing article must take the whole source dark rather than quietly
    // shrink the sum. Dropping one article from a frozen set changes the level
    // of the scalar by that article's whole contribution, which the engine
    // would read as a genuine fall in public attention. That is imputation by
    // omission, and it is the specific failure mode this project was built
    // against. One 404 = one dark source, visibly dark.
    const perArticle = {};
    let total = 0;

    // The invariant that matters is that every article is summed over THE SAME
    // DAYS — otherwise the total is a blend of two windows and a rise could be
    // calendar drift rather than attention. The old guard enforced that by
    // demanding every article's response carry identical timestamps, which is
    // stricter than the invariant and took the whole source dark whenever one
    // article lagged by a day. Wikimedia publishes per-article with its own
    // lag, so that happens routinely: measured 2026-09-25, ChatGPT covered
    // 09-17..09-23 while the others covered 09-18..09-24.
    //
    // Take the INTERSECTION of days present in every article instead. Same
    // invariant, honestly satisfied, and the window is reported in meta so a
    // reader can see which days the number actually covers.
    const dayMaps = responses.map(({ article, items }) => {
      const m = new Map();
      for (const it of items) m.set(String(it.timestamp), it);
      return { article, m };
    });

    let shared = [...dayMaps[0].m.keys()];
    for (const { m } of dayMaps.slice(1)) shared = shared.filter((d) => m.has(d));
    shared.sort();

    if (shared.length < WINDOW_DAYS) {
      throw new Error(
        `wikipedia: only ${shared.length} day(s) are common to all ${dayMaps.length} articles, ` +
        `need ${WINDOW_DAYS} (requested a ${REQUEST_DAYS}-day span; Wikimedia lag may have widened)`
      );
    }
    const coveredDays = shared.slice(-WINDOW_DAYS);

    for (const { article, m } of dayMaps) {
      const window = coveredDays.map((d) => m.get(d));

      let sum = 0;
      for (const item of window) {
        const views = Number(item.views);
        if (!Number.isFinite(views)) {
          throw new Error(`wikipedia: ${article} had a non-numeric views value at ${item.timestamp}`);
        }
        sum += views;
      }

      const mean = sum / WINDOW_DAYS;
      perArticle[article] = mean;
      total += mean;
    }

    if (!Number.isFinite(total)) {
      throw new Error('wikipedia: aggregate mean was not finite');
    }

    const lastDay = parseTimestamp(coveredDays[coveredDays.length - 1]);
    // observed_at is the END of the period the number actually describes, not
    // the moment we fetched it. This source is intrinsically ~24h behind and
    // saying otherwise would be a lie about freshness — the exact lie that
    // pizzint's "healthy" status endpoint tells.
    const observedAt = new Date(lastDay.getTime() + MS_PER_DAY - 1).toISOString();

    return {
      value: total,
      unit: 'pageviews/day',
      observed_at: observedAt,
      meta: {
        // ChatGPT alone is the majority of this total. That is a property of
        // public attention, not a bug, but it means the scalar tracks ChatGPT
        // closely. The per-article breakdown is archived so any future
        // aggregation (equal-weight, log-sum) is recomputable from raw history.
        per_article_mean: perArticle,
        articles: ARTICLES.length,
        window_days: WINDOW_DAYS,
        window_start: coveredDays[0],
        window_end: coveredDays[coveredDays.length - 1],
        fetched_at: new Date(nowMs).toISOString(),
      },
    };
  },
};
