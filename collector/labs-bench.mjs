// SIREN LABS — week of 2026-10-12 instruments.
// Five open-data counts for /bench.html. None of them moves the index.
//
//   recursion   agent-merged PRs / all merged PRs on the core AI stacks
//   horizon     METR 50%-success task length (minutes → hours) + doubling
//   jump        Epoch training-FLOP trend; releases > 2σ above the fit
//   compute     largest disclosed training run + months per doubling
//   silence     days since each frontier lab’s principals last spoke
//
//   node collector/labs-bench.mjs [--offline]
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fetchText, fetchJson } from './fetch.mjs';
import { AGENTS, AGENT_BRANCHES, searchCount, parseCsv } from './si-signals.mjs';
const OUT = 'data/labs-bench.json';
const HIST = 'data/labs-bench-history.ndjson';
const say = (m) => { if (process.env.GITHUB_ACTIONS) console.log(`::notice title=labs-bench::${m}`); else console.log(m); };

/** Core AI stacks named on the Labs card. JAX lives at jax-ml/jax (google/jax is not searchable). */
export const CORE_REPOS = [
  'pytorch/pytorch',
  'huggingface/transformers',
  'vllm-project/vllm',
  'jax-ml/jax',
  'ggml-org/llama.cpp',
];

const FRONTIER_ORGS = [
  ['openai', 'OpenAI'],
  ['anthropic', 'Anthropic'],
  ['google-deepmind', 'Google DeepMind'],
  ['xai', 'xAI'],
  ['meta', 'Meta'],
  ['deepseek', 'DeepSeek'],
  ['mistral', 'Mistral'],
  ['qwen', 'Qwen'],
];

const METR_YAML = 'https://metr.org/assets/benchmark_results_1_1.yaml';
const EPOCH_CSV = [
  'https://epoch.ai/data/notable_ai_models.csv',
  'https://epochai.org/data/notable_ai_models.csv',
];

// --- shared math -----------------------------------------------------------

/** Ordinary least squares for y = a + b x. */
export function ols(points) {
  const n = points.length;
  if (n < 3) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const b = (n * sxy - sx * sy) / den;
  const a = (sy - b * sx) / n;
  const resid = points.map(([x, y]) => y - (a + b * x));
  const mean = resid.reduce((s, r) => s + r, 0) / n;
  const variance = resid.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, n - 2);
  const sigma = Math.sqrt(variance);
  return { a, b, n, sigma, resid };
}

/** Months for training FLOP to double given log10(FLOP) slope per year. */
export function doublingMonthsFromLog10Slope(slopePerYear) {
  if (!Number.isFinite(slopePerYear) || slopePerYear <= 0) return null;
  // log10(FLOP) grows by log10(2) ≈ 0.3010 per doubling.
  return +((0.30102999566 / slopePerYear) * 12).toFixed(1);
}

export function fmtFlop(f) {
  if (!Number.isFinite(f) || f <= 0) return null;
  const e = Math.floor(Math.log10(f));
  return { flop: f, scientific: `${(f / 10 ** e).toFixed(2)}×10^${e}`, exponent: e };
}

// --- Recursion Meter -------------------------------------------------------

/**
 * One search per agent signal. App-account authors and default branch prefixes
 * are separate queries (GitHub caps OR operators). Counts are summed, so a PR
 * that matches both is counted twice — treat the share as an upper bound.
 */
export function agentSearchQueries(repo, since) {
  const base = `is:pr is:merged repo:${repo} merged:>=${since}`;
  return [
    ...AGENTS.map(([app, name]) => ({ key: `app:${app}`, name, q: `${base} author:app/${app}` })),
    ...AGENT_BRANCHES.map(([prefix, name]) => ({ key: `head:${prefix}`, name, q: `${base} head:${prefix}` })),
  ];
}

/**
 * Share of merged PRs in the window that look agent-authored.
 * Pure over searchCount results so tests do not hit the network.
 */
export function summariseRecursion(repoRows, { since, window_days }) {
  const repos = repoRows.map((r) => {
    const merged = Number.isFinite(r.merged) ? r.merged : null;
    const agent = Number.isFinite(r.agent_merged) ? r.agent_merged : null;
    const share = merged > 0 && agent != null ? +(agent / merged).toFixed(4) : null;
    return {
      repo: r.repo,
      merged,
      agent_merged: agent,
      share,
      by_agent: r.by_agent || [],
      ...(r.merged_complete === false || r.agent_complete === false ? { approximate: true } : {}),
      ...(r.error ? { error: r.error } : {}),
    };
  });
  const ok = repos.filter((r) => Number.isFinite(r.merged) && Number.isFinite(r.agent_merged));
  const total_merged = ok.reduce((s, r) => s + r.merged, 0);
  const total_agent = ok.reduce((s, r) => s + r.agent_merged, 0);
  return {
    ok: ok.length > 0,
    window_days,
    since,
    repos,
    total_merged: ok.length ? total_merged : null,
    total_agent: ok.length ? total_agent : null,
    share: total_merged > 0 ? +(total_agent / total_merged).toFixed(4) : null,
    note: 'Agent PRs = merged pulls from a coding agent’s GitHub app account or from a branch named with an agent’s default prefix (codex/, claude/, …), same roster as Takeover Watch. Counts are summed across separate searches, so the share is an upper-bound proxy.',
  };
}

async function collectRecursion(now, { fetcher = fetchJson } = {}) {
  const window_days = 7;
  const since = new Date(now - window_days * 864e5).toISOString().slice(0, 10);
  const st = process.env.SI_SEARCH_TOKEN || '';
  const headers = { accept: 'application/vnd.github+json', ...(st ? { authorization: `Bearer ${st}` } : {}) };
  const gap = st ? 1500 : 6500;
  const rows = [];
  for (const repo of CORE_REPOS) {
    try {
      const all = await searchCount(`is:pr is:merged repo:${repo} merged:>=${since}`, { headers, fetcher, log: say, pause: 0, tries: 2 });
      await new Promise((r) => setTimeout(r, gap));
      const by_agent = [];
      let agentTotal = 0;
      let agentComplete = true;
      for (const aq of agentSearchQueries(repo, since)) {
        try {
          const r = await searchCount(aq.q, { headers, fetcher, log: say, pause: 0, tries: 1 });
          const n = Number.isFinite(r.count) ? r.count : 0;
          if (n > 0) by_agent.push({ key: aq.key, name: aq.name, prs: n });
          agentTotal += n;
          if (!r.complete) agentComplete = false;
        } catch (e) {
          by_agent.push({ key: aq.key, name: aq.name, prs: null, error: String(e.message).slice(0, 80) });
          agentComplete = false;
        }
        await new Promise((r) => setTimeout(r, gap));
      }
      rows.push({
        repo,
        merged: all.count,
        agent_merged: agentTotal,
        by_agent,
        merged_complete: all.complete,
        agent_complete: agentComplete,
      });
    } catch (e) {
      rows.push({ repo, merged: null, agent_merged: null, error: String(e.message).slice(0, 120) });
    }
  }
  return summariseRecursion(rows, { since, window_days });
}

// --- Task-Horizon Clock (METR) ---------------------------------------------

/**
 * Tiny YAML reader for METR’s benchmark_results_*.yaml: nested maps, numbers,
 * plain strings, and lists of strings. Not a general YAML parser.
 */
export function parseMetrYaml(text) {
  const lines = String(text || '').split(/\n/);
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  let pendingKey = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const cur = stack[stack.length - 1].obj;
    if (line.startsWith('- ')) {
      const v = line.slice(2).trim();
      if (!Array.isArray(cur[pendingKey])) cur[pendingKey] = [];
      cur[pendingKey].push(v === 'null' ? null : v);
      continue;
    }
    const m = line.match(/^([^:#]+):(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let rest = m[2].trim();
    if (rest.startsWith('#')) rest = '';
    else if (rest.includes(' #')) rest = rest.replace(/\s+#.*$/, '').trim();
    pendingKey = key;
    if (rest === '' || rest === '|' || rest === '>') {
      const child = {};
      cur[key] = child;
      stack.push({ indent, obj: child });
    } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(rest)) {
      cur[key] = Number(rest);
    } else if (rest === 'true' || rest === 'false') {
      cur[key] = rest === 'true';
    } else if (rest === 'null' || rest === '~') {
      cur[key] = null;
    } else {
      cur[key] = rest.replace(/^["']|["']$/g, '');
    }
  }
  return root;
}

/** Turn a METR results map into the published series (p50 in minutes). */
export function summariseHorizon(doc) {
  const results = doc && doc.results;
  if (!results || typeof results !== 'object') return { ok: false, error: 'no METR results' };
  const models = [];
  for (const [id, row] of Object.entries(results)) {
    const p50 = row && row.metrics && row.metrics.p50_horizon_length && row.metrics.p50_horizon_length.estimate;
    const date = row && row.release_date;
    if (!Number.isFinite(p50) || !date) continue;
    models.push({
      id,
      name: id.replace(/_inspect$/, '').replace(/_/g, ' '),
      release_date: String(date).slice(0, 10),
      p50_minutes: +p50.toFixed(3),
      p50_hours: +(p50 / 60).toFixed(4),
      is_sota: Boolean(row.metrics && row.metrics.is_sota),
      ci_low: row.metrics.p50_horizon_length.ci_low ?? null,
      ci_high: row.metrics.p50_horizon_length.ci_high ?? null,
    });
  }
  models.sort((a, b) => Date.parse(a.release_date) - Date.parse(b.release_date) || a.p50_minutes - b.p50_minutes);
  if (!models.length) return { ok: false, error: 'empty METR series' };
  const frontier = [...models].sort((a, b) => b.p50_minutes - a.p50_minutes)[0];
  const dbl = (doc.doubling_time_in_days && (doc.doubling_time_in_days.from_2023_on || doc.doubling_time_in_days.all_time_stitched || doc.doubling_time_in_days.all_time)) || null;
  const doubling_days = dbl && Number.isFinite(dbl.point_estimate) ? +dbl.point_estimate.toFixed(1) : null;
  return {
    ok: true,
    benchmark: doc.benchmark_name || null,
    doubling_days,
    doubling_months: doubling_days != null ? +(doubling_days / 30.4375).toFixed(1) : null,
    frontier,
    models,
    unit: 'METR p50_horizon_length is the human task length in minutes where the model has a 50% chance of success.',
  };
}

async function collectHorizon() {
  try {
    const text = await fetchText(METR_YAML, { timeoutMs: 30000, retries: 1 });
    const doc = parseMetrYaml(text);
    return { ...summariseHorizon(doc), source: METR_YAML };
  } catch (e) {
    return { ok: false, error: String(e.message).slice(0, 160), source: METR_YAML };
  }
}

// --- Capability Jump Alarm + Compute Clock (Epoch) -------------------------

export function epochRows(rows) {
  return rows.map((r) => {
    const date = (r['Publication date'] || r['Publication Date'] || '').slice(0, 10);
    const flop = Number(r['Training compute (FLOP)'] || r['Training compute (FLOP) '] || NaN);
    return {
      model: r.Model || r.System || null,
      org: r.Organization || null,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      flop: Number.isFinite(flop) && flop > 0 ? flop : null,
      link: r.Link || null,
      frontier: String(r['Frontier model'] || '').toLowerCase() === 'true',
    };
  }).filter((r) => r.model && r.date);
}

/**
 * Fit log10(FLOP) against fractional year; flag residuals > 2σ.
 * Restricted to the modern deep-learning era so 1950s–1990s outliers do not
 * dominate a trend meant for frontier releases.
 */
export function summariseJumps(models, { sigma_threshold = 2, since = '2018-01-01' } = {}) {
  const sinceMs = Date.parse(since + 'T00:00:00Z');
  const pts = models.filter((m) => m.flop != null && Date.parse(m.date + 'T00:00:00Z') >= sinceMs).map((m) => {
    const t = Date.parse(m.date + 'T00:00:00Z');
    const year = 1970 + t / (365.25 * 864e5);
    return { ...m, year, log10: Math.log10(m.flop) };
  });
  const fit = ols(pts.map((p) => [p.year, p.log10]));
  if (!fit || !(fit.sigma > 0)) {
    return { ok: false, error: 'not enough Epoch compute points for a trend', n: pts.length };
  }
  const flagged = [];
  pts.forEach((p, i) => {
    const z = fit.resid[i] / fit.sigma;
    if (z > sigma_threshold) {
      flagged.push({
        model: p.model,
        org: p.org,
        date: p.date,
        flop: p.flop,
        residual_sigma: +z.toFixed(2),
        url: p.link,
      });
    }
  });
  flagged.sort((a, b) => b.residual_sigma - a.residual_sigma);
  return {
    ok: true,
    method: `log10(training FLOP) vs publication date since ${since}; flag residual > ${sigma_threshold}σ`,
    sigma: +fit.sigma.toFixed(4),
    sigma_threshold,
    since,
    trend: {
      slope_log10_per_year: +fit.b.toFixed(4),
      intercept: +fit.a.toFixed(4),
      n: fit.n,
      doubling_months: doublingMonthsFromLog10Slope(fit.b),
    },
    flagged: flagged.slice(0, 25),
    flagged_count: flagged.length,
    source_note: 'Epoch AI notable-models dataset (CC BY). Only models with a disclosed training-compute figure from 2018 onward enter the fit.',
  };
}

/** Largest disclosed run + envelope series for the compute clock. */
export function summariseCompute(models) {
  const withFlop = models.filter((m) => m.flop != null).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!withFlop.length) return { ok: false, error: 'no Epoch compute figures' };
  let peak = null;
  const envelope = [];
  for (const m of withFlop) {
    if (!peak || m.flop > peak.flop) {
      peak = m;
      envelope.push({ date: m.date, model: m.model, org: m.org, flop: m.flop });
    }
  }
  const fit = ols(envelope.map((e) => {
    const year = 1970 + Date.parse(e.date + 'T00:00:00Z') / (365.25 * 864e5);
    return [year, Math.log10(e.flop)];
  }));
  const largest = peak ? { model: peak.model, org: peak.org, date: peak.date, ...fmtFlop(peak.flop), url: peak.link } : null;
  return {
    ok: true,
    largest,
    doubling_months: fit ? doublingMonthsFromLog10Slope(fit.b) : null,
    envelope: envelope.slice(-40).map((e) => ({ date: e.date, model: e.model, org: e.org, flop: e.flop })),
    n_with_compute: withFlop.length,
    source_note: 'Epoch AI notable-models dataset (CC BY). Envelope = running maximum of disclosed training FLOP.',
  };
}

async function collectEpoch() {
  for (const url of EPOCH_CSV) {
    try {
      const rows = epochRows(parseCsv(await fetchText(url, { timeoutMs: 30000, retries: 1 })));
      if (rows.length < 50) continue;
      return {
        jump: { ...summariseJumps(rows), source: url },
        compute: { ...summariseCompute(rows), source: url },
        models_total: rows.length,
      };
    } catch { /* next host */ }
  }
  return {
    jump: { ok: false, error: 'Epoch AI dataset unreachable' },
    compute: { ok: false, error: 'Epoch AI dataset unreachable' },
  };
}

// --- Lab Silence Index -----------------------------------------------------

/**
 * Days of silence per frontier lab from the Leaders tracker, plus newsroom
 * name-checks in the current window. History (when present) supplies each
 * lab’s median gap so a silence can be scored against its own rhythm.
 */
export function summariseSilence(leadersDoc, newsDoc, history = []) {
  const leaders = (leadersDoc && leadersDoc.leaders) || [];
  const items = (newsDoc && newsDoc.items) || [];
  const newsWindowStart = newsDoc && newsDoc.generated_at
    ? Date.parse(newsDoc.generated_at) - ((newsDoc.window_days || 7) * 864e5)
    : Date.now() - 7 * 864e5;

  const labs = FRONTIER_ORGS.map(([id, name]) => {
    const principals = leaders.filter((l) => l.org_id === id).map((l) => ({
      id: l.id,
      name: l.name,
      days_silent: Number.isFinite(l.days_silent) ? l.days_silent : null,
      state: l.state,
      reason: l.reason,
      last_statement_at: l.last_statement_at || (l.latest && l.latest.published_at) || null,
    }));
    const spoken = principals.filter((p) => Number.isFinite(p.days_silent));
    const days_silent = spoken.length
      ? Math.min(...spoken.map((p) => p.days_silent))
      : null;
    const needle = name.toLowerCase();
    const news_7d = items.filter((it) => {
      const t = `${it.title || ''} ${(it.entities || []).join(' ')}`.toLowerCase();
      const at = Date.parse(it.published_at || it.published || '') || 0;
      return at >= newsWindowStart && t.includes(needle);
    }).length;
    // Median past gap for this lab from history lines {day, silence:{labId:days}}.
    const gaps = history.map((h) => h && h.silence && h.silence[id]).filter(Number.isFinite);
    gaps.sort((a, b) => a - b);
    const median_gap = gaps.length >= 4 ? gaps[Math.floor(gaps.length / 2)] : null;
    let flag = 'baseline';
    if (days_silent == null && principals.every((p) => p.reason === 'no_sources' || p.reason === 'sources_unreachable')) flag = 'unread';
    else if (days_silent == null) flag = 'quiet';
    else if (median_gap != null && days_silent > median_gap * 1.5 && days_silent >= 3) flag = 'unusual';
    else if (median_gap == null && days_silent >= 7) flag = 'long';
    else flag = 'normal';
    return {
      id, name, days_silent, news_7d, flag,
      median_gap_days: median_gap,
      principals,
    };
  });
  return {
    ok: labs.some((l) => l.principals.length > 0),
    labs,
    note: 'Silence is measured from the Leaders tracker (days since a sourced public statement). “Unusual” needs a few weeks of history of each lab’s own gap; until then a gap of 7+ days is marked long, not unusual. Scored after the fact against what shipped next once releases land in the newsroom.',
  };
}

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function loadHistory() {
  if (!existsSync(HIST)) return [];
  return readFileSync(HIST, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

async function main(argv = process.argv.slice(2)) {
  const offline = argv.includes('--offline');
  const now = Date.now();
  const prev = loadJson(OUT);
  if (offline) {
    if (prev) { say('offline: keeping previous labs-bench.json'); return; }
    throw new Error('labs-bench --offline needs an existing data/labs-bench.json');
  }

  const history = loadHistory();
  const [recursion, horizon, epoch] = await Promise.all([
    collectRecursion(now).catch((e) => ({ ok: false, error: String(e.message).slice(0, 160) })),
    collectHorizon(),
    collectEpoch(),
  ]);
  const silence = summariseSilence(loadJson('data/leaders.json'), loadJson('data/news.json'), history);

  const out = {
    schema: 1,
    generated_at: new Date(now).toISOString(),
    affects_index: false,
    week: { start: '2026-10-12', theme: 'Is AI building AI yet?' },
    recursion,
    horizon,
    jump: epoch.jump,
    compute: epoch.compute,
    silence,
  };

  // Keep the last good reading of any instrument that went dark this run.
  if (prev) {
    for (const k of ['recursion', 'horizon', 'jump', 'compute', 'silence']) {
      if (out[k] && !out[k].ok && prev[k] && prev[k].ok) {
        out[k] = { ...prev[k], ok: false, stale_since: out.generated_at, last_good: prev.generated_at };
      }
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

  const day = out.generated_at.slice(0, 10);
  const last = history.length ? history[history.length - 1] : null;
  if (!last || last.day !== day) {
    appendFileSync(HIST, JSON.stringify({
      day,
      recursion_share: recursion.share ?? null,
      recursion_agent: recursion.total_agent ?? null,
      recursion_merged: recursion.total_merged ?? null,
      horizon_p50_hours: horizon.frontier ? horizon.frontier.p50_hours : null,
      compute_flop: computeFlop(out.compute),
      jump_flagged: (out.jump && out.jump.flagged_count) || 0,
      silence: Object.fromEntries((silence.labs || []).map((l) => [l.id, l.days_silent])),
    }) + '\n');
  }

  const hFront = horizon.ok && horizon.frontier ? `${horizon.frontier.p50_hours}h` : 'dark';
  const cBig = out.compute && out.compute.ok && out.compute.largest ? out.compute.largest.scientific : 'dark';
  say(`labs-bench: recursion ${recursion.ok ? `${((recursion.share || 0) * 100).toFixed(1)}%` : 'dark'} · horizon ${hFront} · jumps ${out.jump && out.jump.ok ? out.jump.flagged_count : 'dark'} · compute ${cBig}`);
}

function computeFlop(c) {
  return c && c.largest && Number.isFinite(c.largest.flop) ? c.largest.flop : null;
}

if (process.argv[1] && process.argv[1].endsWith('labs-bench.mjs')) {
  main().catch((e) => { console.log(`labs-bench failed: ${e.message}`); process.exitCode = 0; });
}
