// TAKEOVER WATCH: signals about AI autonomy and the road to superintelligence
// that SIREN watches but does not score (no year of baseline yet). Each one
// fails dark on its own; nothing is invented.
//
//   agent_prs    pull requests opened on GitHub by AI coding agents in the
//                last 24 h (GitHub search, by the agents' app accounts)
//   frontier     Epoch AI's notable-models dataset: models released in the last
//                90 days and the largest training run on record
//   agi_forecast Metaculus community forecast for the arrival of AGI
//   moltbook     how many distinct AI agents SIREN saw posting on Moltbook
//
// Writes data/si-signals.json and appends one line a day to
// data/si-signals-history.ndjson.
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fetchJson, fetchText } from './fetch.mjs';

const OUT = 'data/si-signals.json', HIST = 'data/si-signals-history.ndjson';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

// The app accounts the big coding agents open pull requests from.
export const AGENTS = [
  ['copilot-swe-agent', 'GitHub Copilot agent'],
  ['devin-ai-integration', 'Devin'],
  ['chatgpt-codex-connector', 'OpenAI Codex'],
  ['claude', 'Claude'],
  ['cursor', 'Cursor'],
  ['google-labs-jules', 'Google Jules'],
];

async function agentPrs(now) {
  const since = new Date(now - 864e5).toISOString().slice(0, 19) + 'Z';
  const headers = { accept: 'application/vnd.github+json', ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) };
  const per = [];
  for (const [app, name] of AGENTS) {
    try {
      const q = encodeURIComponent(`is:pr author:app/${app} created:>=${since}`);
      const j = await fetchJson(`https://api.github.com/search/issues?q=${q}&per_page=1`, { headers, retries: 1 });
      if (Number.isFinite(j.total_count)) per.push({ app, name, prs_24h: j.total_count });
    } catch (e) { per.push({ app, name, prs_24h: null, error: String(e.message).slice(0, 120) }); }
  }
  const ok = per.filter((p) => Number.isFinite(p.prs_24h));
  return ok.length ? { ok: true, total_24h: ok.reduce((a, p) => a + p.prs_24h, 0), by_agent: per } : { ok: false, by_agent: per };
}

// Tiny CSV reader (quoted fields, commas inside quotes).
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...rest] = rows;
  return rest.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])));
}

async function frontier(now) {
  for (const url of ['https://epoch.ai/data/notable_ai_models.csv', 'https://epochai.org/data/notable_ai_models.csv']) {
    try {
      const rows = parseCsv(await fetchText(url, { timeoutMs: 30000, retries: 1 }));
      const pub = (r) => Date.parse(r['Publication date'] || r['Publication Date'] || '');
      const flop = (r) => Number(r['Training compute (FLOP)'] || r['Training compute (FLOP) '] || NaN);
      const recent = rows.filter((r) => now - pub(r) < 90 * 864e5 && pub(r) <= now);
      const biggest = rows.filter((r) => Number.isFinite(flop(r))).sort((a, b) => flop(b) - flop(a))[0];
      return {
        ok: true, source: url, models_total: rows.length, models_90d: recent.length,
        newest: recent.sort((a, b) => pub(b) - pub(a)).slice(0, 5).map((r) => ({ model: r.Model || r.System, org: r.Organization, date: (r['Publication date'] || '').slice(0, 10) })),
        largest_run: biggest ? { model: biggest.Model || biggest.System, org: biggest.Organization, flop: flop(biggest), date: (biggest['Publication date'] || '').slice(0, 10) } : null,
      };
    } catch (e) { /* try the next host */ }
  }
  return { ok: false, error: 'Epoch AI dataset unreachable' };
}

async function agiForecast() {
  // Metaculus question 3479: "When will the first weakly general AI system be
  // devised, tested, and publicly announced?" Community median, as a date.
  for (const url of ['https://www.metaculus.com/api/posts/3479/', 'https://www.metaculus.com/api2/questions/3479/']) {
    try {
      const mt = process.env.METACULUS_TOKEN;
      const j = await fetchJson(url, { retries: 1, headers: mt ? { authorization: `Token ${mt}` } : {} });
      const q = j.question || j;
      const agg = q.aggregations && (q.aggregations.recency_weighted || q.aggregations.unweighted);
      const latest = agg && (agg.latest || (agg.history && agg.history[agg.history.length - 1]));
      const c = latest && (latest.centers || latest.center);
      const v = Array.isArray(c) ? c[0] : c;
      const sc = q.scaling || {};
      if (Number.isFinite(v) && Number.isFinite(sc.range_min) && Number.isFinite(sc.range_max)) {
        // Metaculus date questions store a 0..1 position on a (possibly log) scale.
        const lo = sc.range_min, hi = sc.range_max, zp = sc.zero_point;
        const t = Number.isFinite(zp) && zp !== null ? zp + (lo - zp) * Math.pow((hi - zp) / (lo - zp), v) : lo + v * (hi - lo);
        return { ok: true, question: 3479, title: q.title || j.title, median_date: new Date(t * 1000).toISOString().slice(0, 10), source: url };
      }
    } catch (e) { /* next */ }
  }
  return { ok: false, error: process.env.METACULUS_TOKEN ? 'Metaculus answered without a usable forecast' : 'Metaculus needs a free API token (METACULUS_TOKEN secret)' };
}

function moltbookAgents() {
  try {
    const m = JSON.parse(readFileSync('data/moltbook.json', 'utf8'));
    const all = [...(m.fresh || []), ...(m.posts || [])];
    return { ok: true, agents_seen: new Set(all.map((p) => p.agent)).size, posts_seen: all.length, replies_seen: all.reduce((a, p) => a + (p.comments || 0), 0) };
  } catch { return { ok: false }; }
}

async function main() {
  const now = Date.now();
  const [agent_prs, frontierModels, agi] = await Promise.all([agentPrs(now), frontier(now), agiForecast()]);
  const out = { schema: 1, generated_at: new Date(now).toISOString(), affects_index: false, agent_prs, frontier: frontierModels, agi_forecast: agi, moltbook: moltbookAgents() };
  // Keep the last good value of a signal that went dark this run, marked stale.
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    for (const k of ['agent_prs', 'frontier', 'agi_forecast']) if (!out[k].ok && prev[k] && prev[k].ok) out[k] = { ...prev[k], stale_since: out.generated_at, ok: false, last_good: prev.generated_at };
  } catch { /* first run */ }
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  const day = out.generated_at.slice(0, 10);
  let last = ''; if (existsSync(HIST)) last = readFileSync(HIST, 'utf8').trim().split('\n').pop() || '';
  if (!last.includes(`"day":"${day}"`)) appendFileSync(HIST, JSON.stringify({ day, agent_prs: agent_prs.total_24h ?? null, models_90d: frontierModels.models_90d ?? null, agi_median: agi.median_date ?? null, moltbook_agents: out.moltbook.agents_seen ?? null }) + '\n');
  console.log(`si-signals: agent PRs ${agent_prs.ok ? agent_prs.total_24h : 'dark'} · frontier ${frontierModels.ok ? frontierModels.models_90d : 'dark'} · AGI ${agi.ok ? agi.median_date : 'dark'}`);
}

if (process.argv[1] && process.argv[1].endsWith('si-signals.mjs')) main().catch((e) => { console.log(`si-signals failed: ${e.message}`); });
