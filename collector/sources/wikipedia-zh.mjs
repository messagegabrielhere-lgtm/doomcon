// Chinese Wikipedia pageviews for a frozen AI article set — attention outside
// the English-language mirror that `wikipedia.mjs` reads.
//
// Same Wikimedia REST shape as the English adapter; different project
// (`zh.wikipedia`) and different titles. Kept as its OWN source id so the
// English series and its frozen reference stay untouched
// (docs/CONTRACT.md frozen-set rule; docs/IMPROVEMENTS-v1.md §12).
//
// Uncalibrated on admission: needs its own addendum before it can score.
// Titles confirmed live against the pageviews API on 2026-10-13.

import { fetchAll as defaultFetchAll } from '../fetch.mjs';

// FROZEN SET. Same discipline as wikipedia.mjs: never add/remove without an
// addendum rebuild in the same commit.
const ARTICLES = Object.freeze([
  '人工智能',
  '大型语言模型',
  '通用人工智能',
  'OpenAI',
  'ChatGPT',
  'Anthropic',
  '机器学习',
  'Google_DeepMind',
  '生成式人工智能',
]);

const WINDOW_DAYS = 7;
const REQUEST_DAYS = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toApiDate(ms) {
  return new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
}

function parseTimestamp(stamp) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(String(stamp));
  if (!m) throw new Error(`wikipedia-zh: unparseable pageviews timestamp ${JSON.stringify(stamp)}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4])));
}

function buildUrl(article, startMs, endMs) {
  return 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article' +
    `/zh.wikipedia/all-access/user/${encodeURIComponent(article)}` +
    `/daily/${toApiDate(startMs)}/${toApiDate(endMs)}`;
}

export default {
  id: 'wikipedia-zh',
  pillar: 'attention',
  label: 'Chinese Wikipedia AI pageviews (7d mean)',

  async collect(fetchJson, { fetchAll = defaultFetchAll } = {}) {
    const nowMs = Date.now();
    const startMs = nowMs - REQUEST_DAYS * MS_PER_DAY;

    const envelopes = await fetchAll(
      ARTICLES.map((article) => ({ key: article, url: buildUrl(article, startMs, nowMs) }))
    );

    const responses = envelopes.map((envelope) => {
      if (!envelope.ok) {
        throw new Error(`wikipedia-zh: ${envelope.key} failed — ${envelope.error?.message ?? 'unknown error'}`);
      }
      const body = envelope.value;
      if (!body || !Array.isArray(body.items)) {
        const detail = body && body.detail ? ` — ${body.detail}` : '';
        throw new Error(`wikipedia-zh: no items for ${envelope.key}${detail}`);
      }
      return { article: envelope.key, items: body.items };
    });

    // Intersection of complete UTC days present for EVERY article.
    const daySets = responses.map((r) => {
      const days = new Map();
      for (const it of r.items) {
        const d = parseTimestamp(it.timestamp);
        const key = d.toISOString().slice(0, 10);
        const views = Number(it.views);
        if (!Number.isFinite(views) || views < 0) {
          throw new Error(`wikipedia-zh: bad views for ${r.article} on ${key}`);
        }
        days.set(key, views);
      }
      return days;
    });

    let shared = null;
    for (const days of daySets) {
      const keys = new Set(days.keys());
      shared = shared === null ? keys : new Set([...shared].filter((k) => keys.has(k)));
    }
    const sharedDays = [...(shared || [])].sort();
    if (sharedDays.length < WINDOW_DAYS) {
      throw new Error(
        `wikipedia-zh: only ${sharedDays.length} shared complete days across the frozen set (need ${WINDOW_DAYS})`
      );
    }
    const window = sharedDays.slice(-WINDOW_DAYS);

    let sum = 0;
    for (const day of window) {
      for (const days of daySets) sum += days.get(day);
    }
    const value = sum / (WINDOW_DAYS * ARTICLES.length);
    if (!Number.isFinite(value)) {
      throw new Error(`wikipedia-zh: mean resolved to non-finite ${value}`);
    }

    return {
      value,
      unit: 'pageviews/day',
      observed_at: new Date().toISOString(),
      meta: {
        project: 'zh.wikipedia',
        articles: ARTICLES.slice(),
        window_days: WINDOW_DAYS,
        window_from: window[0],
        window_to: window[window.length - 1],
        direction: 'higher = more Chinese-language public curiosity about AI',
        source_note: 'uncalibrated; candidate for reference-addenda after 300 forward days',
      },
    };
  },
};
