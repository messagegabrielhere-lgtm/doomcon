// collector/forward-coverage.mjs
//
// How far an uncalibrated source is toward a frozen baseline, counted from our
// own published snapshots. This is the only history docs/REFERENCE-VERSIONING.md
// allows for sources that cannot be rebuilt backwards.
//
// A day counts when the last successful reading that UTC day carries the same
// definition and unit as the latest successful reading inside the window. A
// definition change drops the older days. A failed reading does not count and
// does not erase a good one earlier the same day. Nothing here is a percentile
// and nothing here enters the score.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const BASELINE_DAYS_REQUIRED = 300;
export const BASELINE_WINDOW_DAYS = 365;

const MS_DAY = 86_400_000;

export function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dayMs(iso) {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

function windowStart(asOfDay, windowDays) {
  return isoDay(dayMs(asOfDay) - (windowDays - 1) * MS_DAY);
}

/**
 * @param {Array<{ generated_at?: string, readings?: Array }>} snapshots
 * @param {{ required?: number, windowDays?: number, asOfDay?: string }} [opts]
 * @returns {Map<string, { days: number, required: number, since: string, until: string }>}
 */
export function baselineProgress(snapshots, opts = {}) {
  const required = opts.required ?? BASELINE_DAYS_REQUIRED;
  const windowDays = opts.windowDays ?? BASELINE_WINDOW_DAYS;
  const perDay = new Map();
  let newestDay = null;

  for (const snap of snapshots) {
    const readings = Array.isArray(snap?.readings) ? snap.readings : [];
    for (const r of readings) {
      if (!r || typeof r.source !== 'string' || r.source.length === 0) continue;
      const stamp = typeof r.observed_at === 'string'
        ? r.observed_at
        : (typeof snap?.generated_at === 'string' ? snap.generated_at : null);
      if (!stamp || stamp.length < 10) continue;
      const day = stamp.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      if (newestDay === null || day > newestDay) newestDay = day;
      const key = `${r.source}\0${day}`;
      const ok = r.ok === true && Number.isFinite(r.value);
      const prev = perDay.get(key);
      // The last successful reading of the day is the one we published. A later
      // failure does not unpublish it, and an earlier failure does not block it.
      if (prev) {
        if (prev.ok && !ok) continue;
        if (prev.ok === ok && prev.t > stamp) continue;
        if (!prev.ok && !ok && prev.t > stamp) continue;
      }
      perDay.set(key, {
        source: r.source,
        day,
        t: stamp,
        def: typeof r.meta?.definition === 'string' && r.meta.definition.length > 0 ? r.meta.definition : null,
        unit: typeof r.unit === 'string' ? r.unit : null,
        ok,
      });
    }
  }

  const asOfDay = opts.asOfDay ?? newestDay;
  const start = asOfDay ? windowStart(asOfDay, windowDays) : null;
  const inWindow = (day) => start !== null && day >= start && day <= asOfDay;

  const current = new Map();
  for (const rec of perDay.values()) {
    if (!rec.ok || !rec.def || !inWindow(rec.day)) continue;
    const prev = current.get(rec.source);
    if (!prev || rec.t > prev.t) current.set(rec.source, rec);
  }

  const sets = new Map();
  for (const rec of perDay.values()) {
    const cur = current.get(rec.source);
    if (!cur || !rec.ok || !inWindow(rec.day)) continue;
    if (rec.def !== cur.def || rec.unit !== cur.unit) continue;
    let set = sets.get(rec.source);
    if (!set) {
      set = new Set();
      sets.set(rec.source, set);
    }
    set.add(rec.day);
  }

  const out = new Map();
  for (const [id, set] of sets) {
    const days = [...set].sort();
    out.set(id, { days: days.length, required, since: days[0], until: days[days.length - 1] });
  }
  return out;
}

/** Read every snapshot in a directory. A file that does not parse is skipped. */
export function baselineProgressFromDir(dir, opts = {}) {
  if (!dir || !existsSync(dir)) return new Map();
  const snaps = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    try {
      snaps.push(JSON.parse(readFileSync(join(dir, name), 'utf8')));
    } catch (e) {
      console.warn(`baseline: skip ${name} (${e.message})`);
    }
  }
  return baselineProgress(snaps, opts);
}

/**
 * Presentation fields on state only. Call this after the receipt body is sealed.
 * A calibrated source is left alone. A source with no countable day is left alone.
 */
export function attachBaselineProgress(state, progress) {
  if (!state || !Array.isArray(state.sources) || !progress) return state;
  for (const s of state.sources) {
    if (!s || s.uncalibrated !== true) continue;
    const row = progress.get(s.id);
    if (!row || !Number.isInteger(row.days) || row.days < 1) continue;
    s.baseline_days = row.days;
    s.baseline_required = row.required;
    s.baseline_since = row.since;
  }
  if (Array.isArray(state.pillars)) {
    for (const pillar of state.pillars) {
      if (!pillar || pillar.uncalibrated !== true) continue;
      const waiting = state.sources.filter((s) => s && s.pillar === pillar.id && s.uncalibrated === true);
      if (waiting.length === 0) continue;
      if (!waiting.every((s) => Number.isInteger(s.baseline_days))) continue;
      const slowest = waiting.reduce((a, b) => (a.baseline_days <= b.baseline_days ? a : b));
      pillar.baseline_days = slowest.baseline_days;
      pillar.baseline_required = slowest.baseline_required;
      pillar.baseline_since = slowest.baseline_since;
    }
  }
  return state;
}

/** Prose for a page: "15 of 300 days". Null when the count is absent. */
export function baselinePhrase(days, required) {
  if (!Number.isInteger(days) || !Number.isInteger(required) || required < 1 || days < 1) return null;
  return `${days} of ${required} days`;
}

/** Tight label for a gauge: "15/300". */
export function baselineCompact(days, required) {
  if (!Number.isInteger(days) || !Number.isInteger(required) || required < 1 || days < 1) return null;
  return `${days}/${required}`;
}
