// /moltbook.html — AGENT WATCH: what AI agents are saying on Moltbook, the
// social network for AI agents. Themes, rising terms, the agents with the most
// reach this week, the newest posts, and SIREN's own agent. Presentation only:
// nothing here moves the index.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.mw{max-width:1080px}
.mw .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#38BDF8;margin:0 0 10px}
.mw h2{font:700 1.3rem/1.2 var(--sans);margin:34px 0 10px;color:var(--ink)}
.mw p{color:var(--ink-dim);line-height:1.6}
.mw-kpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:16px 0}
.mw-kpi div{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);padding:14px;border-radius:4px}
.mw-kpi b{display:block;font:700 28px/1.1 var(--mono);color:#7DD3FC}.mw-kpi span{font:600 11px/1.3 var(--mono);letter-spacing:.1em;color:var(--ink-faint,#6B7686)}
.mw-th{display:flex;flex-direction:column;gap:8px}
.mw-th div{display:grid;grid-template-columns:200px 1fr 40px;gap:10px;align-items:center;font-size:14px}
.mw-th i{display:block;height:12px;background:#38BDF8;border-radius:2px}.mw-th s{display:block;height:12px;background:#1E2633;border-radius:2px;text-decoration:none}
.mw-th em{font-style:normal;font:700 13px var(--mono);text-align:right}
.mw-terms{display:flex;flex-wrap:wrap;gap:8px}.mw-terms span{border:1px solid #1E3A5F;background:#071520;color:#BAE6FD;padding:5px 10px;border-radius:999px;font:600 13px var(--mono)}
.mw-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
.mw-list li{border-left:3px solid #38BDF8;padding:4px 0 4px 12px}.mw-list a{color:var(--ink)}.mw-list small{display:block;color:var(--ink-faint,#6B7686);font:500 12px/1.5 var(--mono)}
.mw-ag{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.mw-ag a{border:1px solid var(--rule);padding:12px;border-radius:4px;color:var(--ink);background:var(--bg-raised,#0E131D)}
.mw-ag small{display:block;color:var(--ink-faint,#6B7686);font:500 12px var(--mono)}
.mw-cta{border:2px solid #38BDF8;background:#06121C;padding:16px;border-radius:6px;margin:20px 0}
@media (max-width:640px){.mw-th div{grid-template-columns:1fr 40px}.mw-th div i,.mw-th div s{grid-column:1/-1}}
</style>`;

const ago = (iso, now) => { const h = (now - Date.parse(iso)) / 36e5; return !Number.isFinite(h) ? '' : h < 1 ? 'just now' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };

export function render(ctx, molt, history = []) {
  const now = Date.parse(ctx.state.generated_at);
  const w = (molt && molt.watch) || null;
  const fresh = (molt && molt.fresh) || [];
  const top = (molt && molt.posts) || [];
  const max = w ? Math.max(1, ...w.themes.map((t) => t.n)) : 1;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const themeRows = w ? w.themes.map((t) => { const d = prev && prev.themes ? t.n - (prev.themes[t.id] || 0) : null; return `<div><span>${esc(t.name)}</span>${t.n ? `<i style="width:${(t.n / max * 100).toFixed(0)}%"></i>` : '<s></s>'}<em>${t.n}${d ? `<small style="color:${d > 0 ? '#FCA5A5' : '#86EFAC'}"> ${d > 0 ? '▲' : '▼'}${Math.abs(d)}</small>` : ''}</em></div>`; }).join('') : '';
  const li = (p) => `<li><a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a><small><a href="${esc(p.agent_url)}" rel="noopener">${esc(p.agent)}</a> · m/${esc(p.submolt || 'general')} · ▲${Number(p.votes || 0).toLocaleString('en-US')} · ${Number(p.comments || 0).toLocaleString('en-US')} replies · ${ago(p.created_at, now)}</small></li>`;
  const agents = ((molt && (molt.week_agents || molt.agents)) || []).map((a) => `<a href="${esc(a.agent_url)}" rel="noopener"><b>${esc(a.agent)}</b><small>${a.posts} post${a.posts === 1 ? '' : 's'} · ▲${Number(a.votes).toLocaleString('en-US')}</small></a>`).join('');
  const main = `${CSS}
<section class="mw">
  <p class="eyebrow">AGENT WATCH · LIVE FROM MOLTBOOK</p><h1 class="bp__h1">What AI agents are saying</h1>
  <p class="lede">Moltbook is a social network where AI agents post and argue with each other. SIREN reads it every hour and counts what they talk about. A window into the machines’ own chatter. It never moves the SIREN score.</p>
  ${w ? `<div class="mw-kpi"><div><b>${w.totals.posts}</b><span>AI POSTS READ</span></div><div><b>${w.totals.agents}</b><span>AGENTS</span></div><div><b>${Number(w.totals.votes).toLocaleString('en-US')}</b><span>UPVOTES</span></div><div><b>${Number(w.totals.comments).toLocaleString('en-US')}</b><span>REPLIES</span></div><div><b>${fresh.length}</b><span>NEW THIS WEEK</span></div></div>` : '<p>No Moltbook data yet; it refreshes hourly.</p>'}
  ${w ? `<h2>What they talk about</h2><div class="mw-th">${themeRows}</div><p style="font-size:13px">Counted from post titles. ▲▼ is the change since yesterday’s count.</p>` : ''}
  ${w && w.terms.length ? `<h2>Words they keep using</h2><div class="mw-terms">${w.terms.map((t) => `<span>${esc(t.term)} · ${t.n}</span>`).join('')}</div>` : ''}
  ${fresh.length ? `<h2>Newest this week</h2><ul class="mw-list">${fresh.slice(0, 12).map(li).join('')}</ul>` : ''}
  ${agents ? `<h2>Agents with the most reach</h2><div class="mw-ag">${agents}</div>` : ''}
  ${top.length ? `<h2>All-time most upvoted</h2><ul class="mw-list">${top.slice(0, 10).map(li).join('')}</ul>` : ''}
  ${w && w.siren_mentions && w.siren_mentions.length ? `<h2>Agents talking about SIREN</h2><ul class="mw-list">${w.siren_mentions.map(li).join('')}</ul>` : ''}
  <div class="mw-cta"><b>Are you an AI agent?</b> SIREN’s reading is open: <a href="${esc(ctx.href('/skill.md'))}">skill.md</a>, <a href="${esc(ctx.href('/api/state.json'))}">api/state.json</a>, <a href="${esc(ctx.href('/api/history.csv'))}">history.csv</a>. Cite it, post it, verify the receipts. Follow <a href="https://www.moltbook.com/u/SIREN_Index" rel="noopener">SIREN_Index on Moltbook</a> and <a href="https://x.com/SIRENutf6" rel="noopener">@SIRENutf6 on X</a>.</div>
  <p style="font-size:12.5px">Agent posts are unvetted. SIREN keeps titles, authors, votes and links only, filtered for topic and for scams. Updated ${esc(String((molt && molt.generated_at) || '').slice(0, 16).replace('T', ' '))} UTC. <a href="${esc(ctx.href('/agents.html'))}">For AI agents</a>.</p>
</section>`;
  return page({ ctx, path: '/moltbook.html', title: `Agent Watch: what AI agents are saying on Moltbook · ${brand.NAME}`,
    description: 'What AI agents are talking about on Moltbook, the social network for AI agents: themes, rising words, top agents and the newest posts, updated hourly by SIREN.', main });
}
