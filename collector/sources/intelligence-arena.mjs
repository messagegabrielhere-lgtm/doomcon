// Attention pillar — aggregate model-mention volume from IntelligenceArena.
//
// IntelligenceArena (https://www.intelligencearena.ai/) publishes hourly-ish
// multi-signal rankings of frontier LLMs. Their public `/api/arena/latest`
// endpoint returns per-model factor breakdowns under CC BY 4.0 for aggregated
// rankings. We do not ingest their leaderboard as a ranking product — we sum
// one derived field across the catalogue so the scalar measures how loudly
// frontier models are being talked about in their 19-signal corpus
// (Bluesky, Reddit, HN, Mastodon, Lemmy, developer forums, …), not who is #1.
//
// Why this is not a silent double-count of our HN / OpenRouter / Hugging Face
// adapters: those adapters count Algolia story points, catalogue listings, and
// Hub uploads. This sum is IntelligenceArena's own `f5_mention_count` field —
// a different statistic, mostly from social surfaces SIREN does not yet read.
// Overlap with HN exists inside their corpus; the number is still not our HN
// points series.
//
// Uncalibrated on admission (no frozen reference entry). Forward-built
// calibration is the path in REFERENCE-VERSIONING.md; do not edit v1.

const ENDPOINT = 'https://www.intelligencearena.ai/api/arena/latest';

// Their scoring cadence is marketed as hourly but observed closer to daily,
// with multi-day gaps. Seven days is long enough that a laggy pipeline stays
// LIVE, and short enough that a dead feed cannot masquerade as a quiet day.
const MAX_SNAPSHOT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// A truncated catalogue would under-report the loudest day. Refuse rather than
// publish a floor. Live size observed 2026-10-12: 175 models.
const MIN_MODELS = 50;

/**
 * Parse IntelligenceArena's `date` / `computed_at` stamps.
 * Observed forms: `2026-10-08 01:17:21`, `2026-04-22`, ISO with offset.
 * @returns {number|null} epoch ms, or null when unparseable
 */
export function parseArenaDate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // `YYYY-MM-DD HH:MM:SS` (space, no zone) — IntelligenceArena's live form; UTC.
  // Do not apply this path to ISO `T…` stamps: that would drop fractional seconds
  // and zones. Those go through Date.parse below.
  const space = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/.exec(s);
  if (space) {
    const t = Date.parse(`${space[1]}T${space[2]}Z`);
    return Number.isFinite(t) ? t : null;
  }
  const dayOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (dayOnly) {
    const t = Date.parse(`${dayOnly[1]}T00:00:00Z`);
    return Number.isFinite(t) ? t : null;
  }
  // Postgres-ish `+00` / `-00` without minutes — Date.parse rejects those.
  const normalised = s.replace(/([+-])00$/, '$100:00');
  const t = Date.parse(normalised);
  return Number.isFinite(t) ? t : null;
}

/**
 * Pure aggregate. Higher = more model-mention activity in their corpus.
 * Throws on shape / staleness / truncation — collect.mjs turns that into dark.
 *
 * @param {unknown} rows
 * @param {{ nowMs?: number, maxAgeMs?: number, minModels?: number }} [opts]
 */
export function aggregateMentionVolume(rows, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? MAX_SNAPSHOT_AGE_MS;
  const minModels = opts.minModels ?? MIN_MODELS;

  if (!Array.isArray(rows)) {
    throw new Error(
      `intelligence-arena: expected an array from ${ENDPOINT}, got ${typeof rows} — API shape changed`,
    );
  }
  if (rows.length === 0) {
    throw new Error(
      `intelligence-arena: catalogue came back empty from ${ENDPOINT} — treating as a dead source, not as zero activity`,
    );
  }
  if (rows.length < minModels) {
    throw new Error(
      `intelligence-arena: only ${rows.length} models returned (need ≥ ${minModels}); ` +
        'refusing to report a truncated mention total',
    );
  }

  let mentions = 0;
  let newestMs = null;
  let oldestMs = null;
  let missingMentions = 0;
  let unparseableDates = 0;
  let bull = 0;
  let bear = 0;
  let neutral = 0;

  for (const row of rows) {
    const rawMentions = row?.f5_mention_count;
    if (rawMentions == null) {
      missingMentions += 1;
      continue;
    }
    const n = Number(rawMentions);
    if (!Number.isFinite(n)) {
      throw new Error(
        `intelligence-arena: model "${row?.model_slug ?? row?.display_name ?? '<no id>'}" ` +
          `has non-finite f5_mention_count (${JSON.stringify(rawMentions)}) — refusing to guess`,
      );
    }
    if (n < 0) {
      throw new Error(
        `intelligence-arena: model "${row?.model_slug ?? '<no id>'}" has negative f5_mention_count (${n})`,
      );
    }
    mentions += n;

    const stamp = parseArenaDate(row?.date ?? row?.computed_at);
    if (stamp == null) {
      unparseableDates += 1;
    } else {
      if (newestMs === null || stamp > newestMs) newestMs = stamp;
      if (oldestMs === null || stamp < oldestMs) oldestMs = stamp;
    }

    const regime = row?.arena_regime;
    if (regime === 'bull') bull += 1;
    else if (regime === 'bear') bear += 1;
    else if (regime === 'neutral') neutral += 1;
  }

  // Null mention fields are a shape change on a field we sum. A handful of
  // missing rows would silently shrink the total on exactly the loud days.
  if (missingMentions > 0) {
    throw new Error(
      `intelligence-arena: ${missingMentions} of ${rows.length} models had no f5_mention_count — API shape changed`,
    );
  }
  if (!Number.isFinite(mentions)) {
    throw new Error('intelligence-arena: mention sum was not finite');
  }
  if (newestMs === null) {
    throw new Error(
      `intelligence-arena: no parseable date/computed_at on any of ${rows.length} models — cannot judge freshness`,
    );
  }

  const ageMs = nowMs - newestMs;
  if (ageMs > maxAgeMs) {
    throw new Error(
      `intelligence-arena: newest model snapshot is ${new Date(newestMs).toISOString()} ` +
        `(${Math.round(ageMs / 3_600_000)}h old); max allowed age is ${maxAgeMs / 3_600_000}h — ` +
        'refusing a stale feed as a live reading',
    );
  }
  if (ageMs < -3_600_000) {
    // More than an hour in the future vs our clock — clock skew or bad stamps.
    throw new Error(
      `intelligence-arena: newest snapshot ${new Date(newestMs).toISOString()} is ahead of collector clock ` +
        `${new Date(nowMs).toISOString()} — refusing`,
    );
  }

  return {
    value: mentions,
    unit: 'mentions',
    observed_at: new Date(nowMs).toISOString(),
    meta: {
      endpoint: ENDPOINT,
      models: rows.length,
      snapshot_newest: new Date(newestMs).toISOString(),
      snapshot_oldest: oldestMs == null ? null : new Date(oldestMs).toISOString(),
      snapshot_age_hours: Math.round(ageMs / 3_600_000),
      max_age_hours: maxAgeMs / 3_600_000,
      unparseable_dates: unparseableDates,
      regimes: { bull, bear, neutral },
      license: 'CC BY 4.0 (methodology & aggregated rankings)',
      note:
        'Sum of IntelligenceArena f5_mention_count across their model catalogue. ' +
        'Attention amplitude from their multi-signal corpus, not a leaderboard position.',
    },
  };
}

export default {
  id: 'intelligence-arena',
  pillar: 'attention',
  label: 'IntelligenceArena model mentions',

  async collect(fetchJson) {
    const body = await fetchJson(ENDPOINT);
    return aggregateMentionVolume(body);
  },
};
