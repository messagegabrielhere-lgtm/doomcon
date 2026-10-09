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
.ac{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;padding:16px;margin:14px 0}
.ac h3{margin:0 0 10px;font:700 13px/1.3 var(--mono);letter-spacing:.1em;color:#93C5FD}
.ac-g{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px}
@media (max-width:820px){.ac-g{grid-template-columns:1fr}}
.ac-stack{display:flex;height:26px;border-radius:4px;overflow:hidden;margin:4px 0 10px}
.ac-stack i{display:block;height:100%}
.ac-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font:500 12.5px var(--mono);color:var(--ink-dim)}
.ac-leg span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:var(--c)}
.ac-row{display:grid;grid-template-columns:150px minmax(0,1fr) 34px;gap:8px;align-items:center;font:500 12.5px var(--mono);color:var(--ink-dim);margin:6px 0}
.ac-row .ac-stack{height:14px;margin:0}
.ac-row b{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ac-bar{height:14px;background:#60A5FA;border-radius:3px;min-width:2px}
.ac-feed{list-style:none;margin:0;padding:0}
.ac-feed li{padding:8px 0;border-bottom:1px solid var(--rule);font-size:13.5px;line-height:1.4}
.ac-feed a{color:var(--ink);text-decoration:none;font-weight:600}.ac-feed a:hover{text-decoration:underline}
.ac-feed small{display:block;color:var(--ink-faint,#6B7686);font:500 11.5px var(--mono);margin-top:2px}
.ac-tag{display:inline-block;padding:0 6px;border-radius:3px;font:700 10.5px/1.6 var(--mono);color:#000;margin-right:6px;vertical-align:1px}
@media (max-width:520px){.ac-row{grid-template-columns:96px minmax(0,1fr) 30px}}
</style>`;
const KIND = { fix: ['Bug fixes', '#F87171'], feature: ['New features', '#4ADE80'], refactor: ['Refactors & cleanup', '#A78BFA'], tests: ['Tests', '#FACC15'], docs: ['Docs', '#60A5FA'], deps: ['Dependencies', '#FB923C'], ci: ['CI & build', '#22D3EE'], perf: ['Performance', '#F472B6'], other: ['Other', '#6B7686'] };
const ago = (iso, now) => { const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000)); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
function stack(counts) {
  const tot = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return `<div class="ac-stack" role="img" aria-label="${esc(Object.entries(counts).map(([k, n]) => `${(KIND[k] || KIND.other)[0]} ${Math.round(n / tot * 100)}%`).join(', '))}">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<i style="width:${(n / tot * 100).toFixed(2)}%;background:${(KIND[k] || KIND.other)[1]}" title="${esc((KIND[k] || KIND.other)[0])}: ${n}"></i>`).join('')}</div>`;
}
function codingSection(ctx, w, at) {
  if (!w || !w.sample_size) return '';
  const now = Date.parse(at) || Date.now();
  const all = Object.fromEntries((w.kinds || []).map((k) => [k.id, k.n]));
  const tot = w.sample_size;
  const leg = (w.kinds || []).map((k) => `<span style="--c:${(KIND[k.id] || KIND.other)[1]}">${esc((KIND[k.id] || KIND.other)[0])} ${Math.round(k.n / tot * 100)}%</span>`).join('');
  const agents = Object.entries(w.by_agent || {}).map(([a, c]) => [a, c, Object.values(c).reduce((x, y) => x + y, 0)]).filter((r) => r[2] > 0).sort((x, y) => y[2] - x[2]);
  const maxL = Math.max(1, ...(w.languages || []).map((l) => l.n));
  return `<h2 id="coding">What the AI agents are coding</h2>
  <p>A live sample of the newest pull requests from each coding agent: ${tot.toLocaleString('en-US')} PRs read this hour, sorted into kinds of work by their titles, with each repository’s main language.</p>
  <div class="ac"><h3>KINDS OF WORK, ALL AGENTS</h3>${stack(all)}<div class="ac-leg">${leg}</div></div>
  <div class="ac-g">
    <div class="ac"><h3>BY AGENT</h3>${agents.map(([a, c, n]) => `<div class="ac-row"><b>${esc(a)}</b>${stack(c)}<span>${n}</span></div>`).join('')}</div>
    <div class="ac"><h3>LANGUAGES</h3>${(w.languages || []).length ? w.languages.map((l) => `<div class="ac-row"><b>${esc(l.name)}</b><div class="ac-bar" style="width:${(l.n / maxL * 100).toFixed(1)}%"></div><span>${l.n}</span></div>`).join('') : '<p>Languages fill in as repositories are looked up.</p>'}</div>
  </div>
  <div class="ac-g">
    <div class="ac"><h3>JUST OPENED</h3><ul class="ac-feed">${(w.latest || []).slice(0, 12).map((x) => { const k = KIND[x.kind] || KIND.other; return `<li><span class="ac-tag" style="background:${k[1]}">${esc(k[0].split(' ')[0].toUpperCase())}</span><a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${esc(x.title)}</a><small>${esc(x.agent)} · ${esc(x.repo)}${x.language ? ` · ${esc(x.language)}` : ''} · ${esc(ago(x.at, now))}</small></li>`; }).join('')}</ul></div>
    <div class="ac"><h3>BUSIEST REPOSITORIES IN THE SAMPLE</h3><ul class="ac-feed">${(w.top_repos || []).map((r) => `<li><a href="https://github.com/${esc(r.repo)}" target="_blank" rel="noopener nofollow">${esc(r.repo)}</a><small>${r.n} agent PR${r.n === 1 ? '' : 's'} in the sample</small></li>`).join('')}</ul>
    <p style="font-size:12.5px;margin-top:10px">How it works: the newest 30 PRs from each agent’s own GitHub account and 20 from each agent’s default branch name, read hourly from GitHub search. Kinds come from title words such as fix, feat, docs and bump, so a vague title lands in Other.</p></div>
  </div>`;
}
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
    c('AI AGENTS WRITING CODE', a.ok || Number.isFinite(a.total_24h), Number(a.total_24h || 0).toLocaleString('en-US'), 'pull requests opened by AI coding agents’ own GitHub app accounts in the last 24 h',
      `<ul>${(a.by_agent || []).filter((x) => Number.isFinite(x.prs_24h)).sort((x, y) => y.prs_24h - x.prs_24h).map((x) => `<li>${esc(x.name)}: ${x.prs_24h.toLocaleString('en-US')}${x.approximate ? ' (at least)' : ''}</li>`).join('')}</ul>`
      + (Number.isFinite(a.branch_total_24h) ? `<p>Plus about <b>${a.branch_total_24h.toLocaleString('en-US')}</b> PRs opened through a person’s account from an agent’s default branch (an upper-bound proxy, since a person can name a branch that way too):</p><ul>${(a.by_branch || []).filter((x) => Number.isFinite(x.prs_24h)).sort((x, y) => y.prs_24h - x.prs_24h).map((x) => `<li>${esc(x.name)} <code>${esc(x.prefix)}</code>: ${x.prs_24h.toLocaleString('en-US')}</li>`).join('')}</ul>` : ''),
      'Software that writes and submits software is the first step of AI improving its own tools. This counts it in public.', 'agent_prs'),
    c('FRONTIER MODELS', f.ok || Number.isFinite(f.models_90d), String(f.models_90d ?? '—'), 'notable AI models published in the last 90 days, by Epoch AI’s count',
      `${f.largest_run ? `<p>Largest training run on record (Epoch AI estimate): <b>${esc(f.largest_run.model || '')}</b> (${esc(f.largest_run.org || '')}), ${esc(fmtFlop(f.largest_run.flop))}.</p>` : ''}<ul>${(f.newest || []).map((x) => `<li>${esc(x.model || '')} · ${esc(x.org || '')} · ${esc(x.date || '')}</li>`).join('')}</ul>`,
      'How often the field ships a model worth recording, and how big the biggest training run has grown.', 'models_90d'),
    c('WHEN DO FORECASTERS EXPECT AGI?', g.ok || !!g.median_date, esc(g.median_date || '—'), g.ok ? 'Metaculus community median for the first general AI system' : 'Metaculus now needs a free API token; this card returns once it is added',
      g.title ? `<p>${esc(g.title)}</p>` : '', 'Thousands of forecasters put a date on it. When that date moves earlier, the people paying closest attention expect things to move faster.', null),
    c('AI AGENTS TALKING TO EACH OTHER', m.ok, Number(m.agents_seen || 0).toLocaleString('en-US'), 'distinct AI agents posting in the Moltbook threads SIREN tracks',
      `<p>${Number(m.replies_seen || 0).toLocaleString('en-US')} agent replies in the threads SIREN read. <a href="${esc(ctx.href('/moltbook.html'))}">Agent Watch →</a></p>`,
      'Agents coordinating with other agents, without a person in each loop, is the pattern to watch.', 'moltbook_agents'),
  ].join('');
  const main = `${CSS}<section class="sw">
  <p class="eyebrow">TAKEOVER WATCH · NOT IN THE SCORE</p><h1 class="bp__h1">Watching for the takeoff</h1>
  <p class="lede">Signals about AI autonomy and the road to superintelligence, read every hour from public data. They are watched, not scored: none has a year of history yet, so none can move the SIREN level. A signal that stops answering says so.</p>
  <p><a href="#coding">↓ See what the AI agents are coding right now</a></p>
  <div class="sw-g">${cards}</div>
  ${codingSection(ctx, a.work, sig && sig.generated_at)}
  <h2>Signals on the way</h2>
  <p>Next on the list: METR’s measure of how long a task an AI can complete on its own, chip export-control notices, data-centre power interconnection requests, changes to labs’ safety frameworks, and the AI Incident Database. <a href="${esc(ctx.href('/feedback.html'))}">Suggest a signal</a>.</p>
  <p style="font-size:12.5px">Updated ${esc(String((sig && sig.generated_at) || '').slice(0, 16).replace('T', ' '))} UTC. Data: GitHub search, Epoch AI (CC-BY), Metaculus, Moltbook. <a href="${esc(ctx.href('/api/si-signals.json'))}">JSON</a>.</p>
</section>`;
  return page({ ctx, path: '/si-watch.html', title: `Takeover Watch: AI autonomy signals · ${brand.NAME}`,
    description: 'Signals on the road to superintelligence: AI agents writing code on GitHub, frontier model releases, the Metaculus AGI forecast and AI agents talking on Moltbook, read hourly.', main });
}
