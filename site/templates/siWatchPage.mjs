// /si-watch.html — TAKEOVER WATCH: autonomy and frontier signals SIREN watches
// but does not score. Each card says what it counts and why it matters.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.sw{max-width:1080px}.sw .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#F87171;margin:0 0 10px}
.sw h2{font:700 1.25rem/1.2 var(--sans);margin:30px 0 10px;color:var(--ink)}.sw p{color:var(--ink-dim);line-height:1.6}
.sw-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px;margin:16px 0}
.sw-c{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;padding:16px;display:flex;flex-direction:column;gap:8px}
.sw-c h3{margin:0;font:700 13px/1.3 var(--mono);letter-spacing:.1em;color:#FCA5A5}
.sw-c .v{font:700 34px/1.1 var(--mono);color:#fff}.sw-c .u{font:500 13px var(--mono);color:var(--ink-faint,#6B7686)}
.sw-c p{margin:0;font-size:14px}.sw-c ul{margin:0;padding-left:18px;font-size:13px;color:var(--ink-dim);line-height:1.5}
.sw-c .why{border-top:1px solid var(--rule);padding-top:8px;font-size:13px}
.sw-dark .v{color:#6B7686;font-size:20px}
.sw-spark{width:100%;height:36px}
</style>`;
const fmtFlop = (f) => { if (!Number.isFinite(f)) return '—'; const e = Math.floor(Math.log10(f)); return `${(f / 10 ** e).toFixed(1)}×10^${e} FLOP`; };
function spark(hist, key) {
  const v = hist.map((h) => h[key]).filter(Number.isFinite);
  if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${(i / (v.length - 1) * 300).toFixed(1)},${(32 - (x - lo) / r * 28).toFixed(1)}`).join('');
  return `<svg class="sw-spark" viewBox="0 0 300 36" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#F87171" stroke-width="2"/></svg>`;
}
export function render(ctx, sig, hist = []) {
  const c = (title, ok, value, unit, body, why, key) => `<article class="sw-c${ok ? '' : ' sw-dark'}"><h3>${esc(title)}</h3><div class="v">${ok ? value : 'NOT ANSWERING'}</div><div class="u">${esc(unit)}</div>${key ? spark(hist, key) : ''}${body}<p class="why"><b>Why it matters:</b> ${esc(why)}</p></article>`;
  const a = (sig && sig.agent_prs) || {}, f = (sig && sig.frontier) || {}, g = (sig && sig.agi_forecast) || {}, m = (sig && sig.moltbook) || {};
  const cards = [
    c('AI AGENTS WRITING CODE', a.ok || Number.isFinite(a.total_24h), Number(a.total_24h || 0).toLocaleString('en-US'), 'pull requests opened by AI coding agents on GitHub, last 24 h',
      `<ul>${(a.by_agent || []).filter((x) => Number.isFinite(x.prs_24h)).sort((x, y) => y.prs_24h - x.prs_24h).map((x) => `<li>${esc(x.name)}: ${x.prs_24h.toLocaleString('en-US')}</li>`).join('')}</ul>`,
      'Software that writes and submits software is the first step of AI improving its own tools. This counts it in public.', 'agent_prs'),
    c('FRONTIER MODELS', f.ok || Number.isFinite(f.models_90d), String(f.models_90d ?? '—'), 'notable AI models released in the last 90 days (Epoch AI)',
      `${f.largest_run ? `<p>Largest training run on record: <b>${esc(f.largest_run.model || '')}</b> (${esc(f.largest_run.org || '')}), ${esc(fmtFlop(f.largest_run.flop))}.</p>` : ''}<ul>${(f.newest || []).map((x) => `<li>${esc(x.model || '')} · ${esc(x.org || '')} · ${esc(x.date || '')}</li>`).join('')}</ul>`,
      'How often the field ships a model worth recording, and how big the biggest training run has grown.', 'models_90d'),
    c('WHEN DO FORECASTERS EXPECT AGI?', g.ok || !!g.median_date, esc(g.median_date || '—'), 'Metaculus community median for the first general AI system',
      g.title ? `<p>${esc(g.title)}</p>` : '', 'Thousands of forecasters put a date on it. When that date moves earlier, the people paying closest attention expect things to move faster.', null),
    c('AI AGENTS TALKING TO EACH OTHER', m.ok, Number(m.agents_seen || 0).toLocaleString('en-US'), 'distinct AI agents seen posting about AI on Moltbook',
      `<p>${Number(m.replies_seen || 0).toLocaleString('en-US')} agent replies in the threads SIREN read. <a href="${esc(ctx.href('/moltbook.html'))}">Agent Watch →</a></p>`,
      'Agents coordinating with other agents, without a person in each loop, is the pattern to watch.', 'moltbook_agents'),
  ].join('');
  const main = `${CSS}<section class="sw">
  <p class="eyebrow">TAKEOVER WATCH · NOT IN THE SCORE</p><h1 class="bp__h1">Watching for the takeoff</h1>
  <p class="lede">Signals about AI autonomy and the road to superintelligence, read every hour from public data. They are watched, not scored: none has a year of history yet, so none can move the SIREN level. A signal that stops answering says so.</p>
  <div class="sw-g">${cards}</div>
  <h2>Signals on the way</h2>
  <p>Next on the list: METR’s measure of how long a task an AI can complete on its own, chip export-control notices, data-centre power interconnection requests, changes to labs’ safety frameworks, and the AI Incident Database. <a href="${esc(ctx.href('/feedback.html'))}">Suggest a signal</a>.</p>
  <p style="font-size:12.5px">Updated ${esc(String((sig && sig.generated_at) || '').slice(0, 16).replace('T', ' '))} UTC. Data: GitHub search, Epoch AI (CC-BY), Metaculus, Moltbook. <a href="${esc(ctx.href('/api/si-signals.json'))}">JSON</a>.</p>
</section>`;
  return page({ ctx, path: '/si-watch.html', title: `Takeover Watch: AI autonomy signals · ${brand.NAME}`,
    description: 'Signals on the road to superintelligence: AI agents writing code on GitHub, frontier model releases, the Metaculus AGI forecast and AI agents talking on Moltbook, read hourly.', main });
}
