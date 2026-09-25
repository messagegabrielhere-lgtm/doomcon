#!/usr/bin/env node
// DOOMCON collector — runs every source adapter and writes one raw snapshot.
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/collect.mjs
//
// The single rule this file exists to enforce: a source that failed appears in
// the output as a failure. It is never omitted, never zeroed, never carried
// forward from the last run. Downstream code decides what a dark source means
// for the index; this file's only job is to make darkness impossible to miss.

import { readdir, mkdir, writeFile } from 'node:fs/promises';

const SCHEMA_VERSION = 1;

// Fixed ids, fixed order (CONTRACT "The five pillars"). Used both to validate
// adapters and to order the readings array, so two runs over the same set of
// adapters always produce byte-identical key ordering.
const PILLAR_ORDER = Object.freeze(['capability', 'compute', 'attention', 'governance', 'markets']);

// A watchdog on top of whatever timeout fetch.mjs applies. fetch.mjs guards a
// single request; this guards an adapter, which may make several, and also
// covers the case where an adapter awaits something that is not a request at
// all. Without it one wedged socket holds a scheduled run open until the CI
// job's own limit kills it — and a killed job writes no snapshot at all, which
// loses the other live sources too.
const ADAPTER_TIMEOUT_MS = 90_000; // arXiv's windowed range scan has needed up to 75s; see sources/arxiv.mjs

const SOURCES_DIR = new URL('./sources/', import.meta.url);
const RAW_DIR = new URL('../data/raw/', import.meta.url);
const FETCH_MODULE = new URL('./fetch.mjs', import.meta.url);

const VALID_SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resolves the shared HTTP helper. CONTRACT pins the file path but not the
 * export name, and fetch.mjs is written by a different agent in parallel, so we
 * accept the three shapes that path can reasonably take and fail with the
 * actual export list when it is none of them. There is deliberately no
 * fallback to global fetch(): a silent bypass of the shared helper would lose
 * the timeout, retry and User-Agent that several of these APIs require.
 */
async function loadFetchJson() {
  let mod;
  try {
    mod = await import(FETCH_MODULE.href);
  } catch (err) {
    throw new Error(
      `collect: could not load collector/fetch.mjs — ${err.message}. ` +
      'Every network call in this repo goes through it; there is no fallback by design.'
    );
  }

  const candidate =
    mod.fetchJson ??
    (mod.default && mod.default.fetchJson) ??
    (typeof mod.default === 'function' ? mod.default : undefined);

  if (typeof candidate !== 'function') {
    const exported = Object.keys(mod).join(', ') || '(nothing)';
    throw new Error(
      `collect: collector/fetch.mjs exports [${exported}] but no callable fetchJson. ` +
      'Expected a named export `fetchJson`, or a default export that is one.'
    );
  }
  return candidate;
}

/**
 * Discovery is a directory read, not a list in this file. Adding a source is
 * dropping a .mjs into collector/sources/ — which is the whole point, because
 * the list of sources is the thing that changes most often and a hard-coded
 * array is the thing most often forgotten.
 *
 * Files beginning with `_` are skipped so adapters can share local helpers.
 */
async function discoverAdapters() {
  let entries;
  try {
    entries = await readdir(SOURCES_DIR);
  } catch (err) {
    throw new Error(`collect: cannot read collector/sources/ — ${err.message}`);
  }

  const files = entries
    .filter((name) => name.endsWith('.mjs') && !name.startsWith('_') && !name.startsWith('.'))
    .sort();

  if (files.length === 0) {
    throw new Error('collect: no adapters found in collector/sources/ — nothing to collect');
  }

  const adapters = [];
  const seen = new Map();

  for (const file of files) {
    const href = new URL(file, SOURCES_DIR).href;

    // A file that will not import, or that does not satisfy the adapter shape,
    // is fatal for the whole run rather than reported as one dark source. The
    // reason is specific: to report a source dark we must know its pillar, and
    // a pillar with no live sources is itself dark (CONTRACT step 3). An
    // adapter we cannot read has no knowable pillar, so recording it as dark
    // would attribute the outage to the wrong pillar — or to none. Refusing to
    // run is the only honest option, and a broken adapter is a code error that
    // CI catches, not a data outage.
    let mod;
    try {
      mod = await import(href);
    } catch (err) {
      throw new Error(`collect: adapter ${file} failed to import — ${err.message}`);
    }

    const adapter = mod.default;
    if (!adapter || typeof adapter !== 'object') {
      throw new Error(`collect: adapter ${file} has no default-exported object`);
    }
    if (typeof adapter.id !== 'string' || !VALID_SOURCE_ID.test(adapter.id)) {
      throw new Error(`collect: adapter ${file} has invalid id ${JSON.stringify(adapter.id)} (want kebab-case)`);
    }
    if (!PILLAR_ORDER.includes(adapter.pillar)) {
      throw new Error(
        `collect: adapter ${file} has unknown pillar ${JSON.stringify(adapter.pillar)} ` +
        `(want one of ${PILLAR_ORDER.join(', ')})`
      );
    }
    if (typeof adapter.label !== 'string' || adapter.label.length === 0) {
      throw new Error(`collect: adapter ${file} has no label`);
    }
    if (typeof adapter.collect !== 'function') {
      throw new Error(`collect: adapter ${file} has no collect() function`);
    }
    if (seen.has(adapter.id)) {
      // Two adapters sharing an id would silently collapse into one series and
      // corrupt every percentile computed from it.
      throw new Error(`collect: duplicate source id "${adapter.id}" in ${file} and ${seen.get(adapter.id)}`);
    }

    seen.set(adapter.id, file);
    adapters.push(adapter);
  }

  // Sort by pillar order, then id. Deterministic output ordering (CONTRACT
  // hard constraint 4) so a diff between two snapshots shows value changes only.
  adapters.sort((a, b) => {
    const byPillar = PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar);
    return byPillar !== 0 ? byPillar : a.id.localeCompare(b.id);
  });

  return adapters;
}

/**
 * Describes a rejected value for an operator. Deliberately not JSON.stringify:
 * it renders NaN as `null`, which sends whoever reads the log hunting for a
 * null the adapter never produced. Type plus raw text distinguishes NaN from
 * null from undefined from the string "42".
 */
function describeValue(v) {
  if (typeof v === 'string') return `string ${JSON.stringify(v)}`;
  return `${typeof v} ${String(v)}`;
}

function errorMessage(err) {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

/** Rejects if the adapter has not settled inside ADAPTER_TIMEOUT_MS. */
function withTimeout(promise, ms, sourceId) {
  let timer;
  const watchdog = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    // Do not let the watchdog alone keep the event loop alive.
    if (typeof timer.unref === 'function') timer.unref();
  });

  // When the watchdog wins, the adapter's own promise is still in flight and
  // will eventually settle with nobody listening. An unobserved rejection
  // would crash Node under --unhandled-rejections=throw (the Node 20 default),
  // taking down a run that had already written off this one source.
  promise.catch(() => {});

  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timer));
}

/**
 * Runs one adapter and returns a reading in the CONTRACT `data/raw` shape.
 * Never throws: every failure path produces an ok:false reading, because a
 * thrown error here would remove the source from the output entirely — the one
 * outcome this collector is built to prevent.
 */
async function runAdapter(adapter, fetchJson, generatedAt) {
  const startedAt = Date.now();

  const fail = (message) => ({
    source: adapter.id,
    pillar: adapter.pillar,
    ok: false,
    error: message,
    value: null,
    ms: Date.now() - startedAt,
  });

  let result;
  try {
    result = await withTimeout(adapter.collect(fetchJson), ADAPTER_TIMEOUT_MS, adapter.id);
  } catch (err) {
    return fail(errorMessage(err));
  }

  // An adapter that returns nonsense is treated exactly like one that threw.
  // Letting a non-finite value through would put NaN into the percentile maths,
  // where it propagates silently through means and comes out the other end as
  // a plausible-looking score.
  if (!result || typeof result !== 'object') {
    return fail('adapter returned no result object');
  }
  // typeof, NOT Number(): the coercion Number(null) === 0 is the exact silent
  // zero this project exists to prevent. An adapter that lost its value and
  // returned null would have been recorded live, at zero, and read downstream
  // as "the world went quiet" rather than "this source broke". Same trap for
  // '', false and []. CONTRACT is explicit that value MUST be a finite Number,
  // so a numeric string is an adapter that forgot to parse — Kalshi's
  // *_dollars fields are strings — and that should go dark, loudly, not slide
  // through on coercion.
  if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
    return fail(`adapter returned a non-finite value (${describeValue(result.value)})`);
  }
  const value = result.value;

  return {
    source: adapter.id,
    pillar: adapter.pillar,
    ok: true,
    value,
    unit: typeof result.unit === 'string' ? result.unit : null,
    // Adapters covering a lagged window report the end of that window; the rest
    // fall back to the run's single frozen clock rather than calling Date.now()
    // again, so all same-run readings share one timestamp.
    observed_at: typeof result.observed_at === 'string' ? result.observed_at : generatedAt,
    meta: result.meta && typeof result.meta === 'object' ? result.meta : {},
    ms: Date.now() - startedAt,
  };
}

function formatValue(reading) {
  if (!reading.ok) return '—';
  const v = reading.value;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/**
 * The per-source table. This is read by a human scrolling a GitHub Actions log
 * who needs to know in one glance what is alive — so LIVE/DARK is a word, not a
 * boolean, and the error text is on the same line as the source that produced it.
 */
function printSummary(readings, outputPath) {
  const widths = {
    source: Math.max(6, ...readings.map((r) => r.source.length)),
    pillar: Math.max(6, ...readings.map((r) => r.pillar.length)),
    value: Math.max(5, ...readings.map((r) => formatValue(r).length)),
  };

  const header =
    'source'.padEnd(widths.source) + '  ' +
    'pillar'.padEnd(widths.pillar) + '  ' +
    'state ' +
    'value'.padStart(widths.value) + '  ' +
    '    ms';

  console.log('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of readings) {
    let line =
      r.source.padEnd(widths.source) + '  ' +
      r.pillar.padEnd(widths.pillar) + '  ' +
      (r.ok ? 'LIVE  ' : 'DARK  ') +
      formatValue(r).padStart(widths.value) + '  ' +
      String(r.ms).padStart(6);
    if (r.ok && r.unit) line += `  ${r.unit}`;
    if (!r.ok) line += `  ${r.error}`;
    console.log(line);
  }

  const live = readings.filter((r) => r.ok).length;
  const darkPillars = [...new Set(readings.filter((r) => !r.ok).map((r) => r.pillar))]
    .filter((pillar) => !readings.some((r) => r.pillar === pillar && r.ok));

  console.log('');
  console.log(`${live}/${readings.length} sources live`);
  if (darkPillars.length > 0) {
    // Named explicitly because the anti-flap rules freeze level changes while
    // any pillar is dark — this line is the operator's warning that the index
    // is about to stop moving for a reason that is not the world going quiet.
    console.log(`dark pillars (no live source): ${darkPillars.join(', ')}`);
  }
  console.log(`wrote ${outputPath}`);
}

async function main() {
  // One clock for the whole run. Every timestamp in the snapshot derives from
  // it, so the file is reproducible from its own inputs.
  const generatedAt = new Date().toISOString();

  const [fetchJson, adapters] = await Promise.all([loadFetchJson(), discoverAdapters()]);

  // Promise.allSettled, not Promise.all: a rejected adapter must not cancel the
  // others. runAdapter already converts failures into readings, so nothing here
  // should reject — the allSettled is the second line of defence, and a
  // rejection that reaches it is itself recorded rather than thrown away.
  const settled = await Promise.allSettled(
    adapters.map((adapter) => runAdapter(adapter, fetchJson, generatedAt))
  );

  const readings = settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') return outcome.value;
    return {
      source: adapters[i].id,
      pillar: adapters[i].pillar,
      ok: false,
      error: `collector bug: runAdapter rejected — ${errorMessage(outcome.reason)}`,
      value: null,
      ms: 0,
    };
  });

  // `ms` is timing telemetry for the log, not part of the CONTRACT raw shape.
  const snapshot = {
    schema: SCHEMA_VERSION,
    generated_at: generatedAt,
    readings: readings.map(({ ms, ...reading }) => reading),
  };

  await mkdir(RAW_DIR, { recursive: true });

  // Colons are legal in an ISO timestamp and illegal in a Windows filename, and
  // they also have to be escaped in half the shell one-liners anyone will use on
  // this directory. Replacing them keeps the name lexicographically sortable and
  // still round-trippable; `generated_at` inside the file stays authoritative.
  const fileName = `${generatedAt.replace(/:/g, '-')}.json`;
  const outputUrl = new URL(fileName, RAW_DIR);
  await writeFile(outputUrl, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  printSummary(readings, `data/raw/${fileName}`);

  // Some sources dark is a normal Tuesday and must not fail the workflow — the
  // snapshot is still useful and the engine knows how to degrade. Every source
  // dark means we learned nothing, and that should go red.
  if (!readings.some((r) => r.ok)) {
    console.error('\ncollect: every source failed — exiting 1');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  // Reaching here means the run could not be set up at all (no fetch helper, no
  // adapters, a malformed adapter, an unwritable data directory). No snapshot is
  // written, because a snapshot we cannot vouch for is worse than none.
  console.error(`collect: fatal — ${errorMessage(err)}`);
  process.exitCode = 1;
});
