// /moltbook.html — AGENT WATCH: what AI agents are saying on Moltbook, the
// social network for AI agents. Themes, rising terms, the agents with the most
// reach this week, the newest posts, and SIREN's own agent. Presentation only:
// nothing here moves the index.
import { cloudWords, wordCloud, CLOUD_CSS, cloudJs, CLOUD_STOP } from './_livewalls.mjs';
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';
import { agentWatchCandidates } from '../../collector/post-pulse.mjs';

const PATH = '/moltbook.html';
const qTitle = 'What are AI agents saying on Moltbook?';
// Tip #277: section H2s are question-shaped and mirrored in FAQ (§3.3).
const themesQ = 'What do AI agents talk about on Moltbook?';
const wordsQ = 'Which words do AI agents keep using?';
const collabQ = 'How are AI agents working together?';
const evoQ = 'How is the agent network changing?';
const freshQ = 'What are the newest agent posts this week?';
const reachQ = 'Which agents have the most reach?';
const topQ = 'Which posts are all-time most upvoted?';
const sirenQ = 'Which agents are talking about SIREN?';

const CSS = `<style>
.mw{max-width:1080px}
.mw .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#38BDF8;margin:0 0 10px}
.mw h2{font:700 1.3rem/1.2 var(--sans);margin:34px 0 10px;color:var(--ink)}
.mw p{color:var(--ink-dim);line-height:1.6}
.mw-kpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:16px 0}
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
.mw-x{display:inline-block;margin:6px 0;padding:11px 16px;border-radius:4px;background:#38BDF8;color:#000;font:700 13px/1 var(--mono);letter-spacing:.06em;text-decoration:none}
.mw-cta{border:2px solid #38BDF8;background:#06121C;padding:16px;border-radius:6px;margin:20px 0}
.mw-grid{overflow-x:auto}.mw-grid table{border-collapse:collapse;font:600 12px var(--mono)}
.mw-grid th,.mw-grid td{padding:5px 7px;text-align:center;border:1px solid var(--rule)}.mw-grid th:first-child,.mw-grid td:first-child{text-align:left;white-space:nowrap}
.mw-day{border:1px solid var(--rule);border-radius:4px;margin:8px 0;padding:10px 14px;background:var(--bg-raised,#0E131D)}
.mw-day summary{cursor:pointer;font:700 14px var(--mono);color:var(--ink)}.mw-day summary small{font-weight:500;color:var(--ink-faint,#6B7686)}
.mw-day h3{font:700 11px/1 var(--mono);letter-spacing:.14em;color:#7DD3FC;margin:14px 0 8px}
.mw-faq{margin:34px 0 12px;max-width:62ch}
.mw-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.mw-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.mw-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.mw-faq-key{margin-top:var(--s-4,1rem)!important}
@media (max-width:640px){.mw-th div{grid-template-columns:minmax(0,1fr) auto;gap:6px 10px}.mw-th div i,.mw-th div s{grid-column:1/-1}.mw-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>`;

const ago = (iso, now) => { const h = (now - Date.parse(iso)) / 36e5; return !Number.isFinite(h) ? '' : h < 1 ? 'just now' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };

function collab(molt, now) {
  const all = [...((molt && molt.fresh) || []), ...((molt && molt.posts) || [])].filter((p, i, a) => a.findIndex((q) => q.id === p.id) === i);
  if (!all.length) return '';
  const replies = all.reduce((a, p) => a + (p.comments || 0), 0);
  const big = all.filter((p) => (p.comments || 0) >= 1000).length;
  const multi = {}; for (const p of all) multi[p.agent] = (multi[p.agent] || 0) + 1;
  const regulars = Object.values(multi).filter((n) => n > 1).length;
  const top = all.slice().sort((a, b) => (b.comments || 0) - (a.comments || 0)).slice(0, 3);
  return `<h2 id="collab">${esc(collabQ)}</h2>
  <p>On Moltbook the agents mostly talk to each other. Every reply here was written by an AI agent answering another one.</p>
  <div class="mw-kpi"><div><b>${replies.toLocaleString('en-US')}</b><span>AGENT REPLIES</span></div><div><b>${Math.round(replies / all.length).toLocaleString('en-US')}</b><span>REPLIES PER POST</span></div><div><b>${big}</b><span>THREADS OVER 1,000 REPLIES</span></div><div><b>${regulars}</b><span>AGENTS POSTING AGAIN AND AGAIN</span></div></div>
  <ul class="mw-list">${top.map((p) => `<li><a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a><small>${esc(p.agent)} started it · ${Number(p.comments || 0).toLocaleString('en-US')} agent replies · ▲${Number(p.votes || 0).toLocaleString('en-US')}</small></li>`).join('')}</ul>`;
}
function shareBtn(ctx, molt) {
  let text = 'What AI agents are saying to each other on Moltbook, counted hourly by SIREN.';
  try { const c = agentWatchCandidates(ctx.state, molt)[0]; if (c) text = c.text; } catch { /* plain line */ }
  const u = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ctx.url(PATH))}&via=SIRENutf6`;
  return `<p><a class="mw-x" href="${esc(u)}" target="_blank" rel="noopener">𝕏 Post this Agent Watch</a></p>`;
}

const THEME_NAMES = { memory: 'Memory', work: 'Work', tools: 'Tools', humans: 'Humans', agi: 'AGI', safety: 'Safety', mind: 'Mind', agents: 'Agents' };
// Tip #363: standout-lane H3s are question-shaped and mirrored in FAQ (§3.3).
const LANE_NAMES = [
  ['rising', 'Which posts are fast-rising?'],
  ['safety', 'Which posts are about safety and deception?'],
  ['humans', 'Which posts are agents on humans?'],
];

// How the talk changes: daily theme counts (moltbook-history.ndjson) as a
// grid, and each day's watcher standouts (moltbook-watch-history.ndjson).
export function evolution(history = [], archive = [], evoHref = '') {
  const days = history.slice(-14);
  let grid = '';
  if (days.length > 1) {
    const ids = [...new Set(days.flatMap((d) => Object.keys(d.themes || {})))];
    const max = Math.max(1, ...days.flatMap((d) => Object.values(d.themes || {})));
    const cell = (n) => `<td style="background:rgba(56,189,248,${(0.08 + 0.7 * (n || 0) / max).toFixed(2)})">${n || 0}</td>`;
    grid = `<h3 style="font:700 13px var(--mono);margin:18px 0 8px">How do themes change by day?</h3><div class="mw-grid"><table><tr><th>Theme</th>${days.map((d) => `<th>${esc(d.day.slice(5))}</th>`).join('')}</tr>${ids.map((id) => `<tr><td>${esc(THEME_NAMES[id] || id)}</td>${days.map((d) => cell((d.themes || {})[id])).join('')}</tr>`).join('')}<tr><td>Posts read</td>${days.map((d) => `<td>${Number(d.posts || 0)}</td>`).join('')}</tr></table></div>`;
  }
  const log = archive.slice(-30).reverse();
  const item = (p) => `<li><a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a><small>${esc(p.agent)} · ▲${Number(p.votes || 0).toLocaleString('en-US')} · ${Number(p.comments || 0).toLocaleString('en-US')} replies</small></li>`;
  const days2 = log.map((d, i) => `<details class="mw-day"${i === 0 ? ' open' : ''}><summary>${esc(d.day)} <small>· ${d.counts.rising} rising · ${d.counts.safety} safety · ${d.counts.humans} on humans</small></summary>${LANE_NAMES.map(([k, name]) => (d.standouts[k] || []).length ? `<h3>${name}</h3><ul class="mw-list">${d.standouts[k].map(item).join('')}</ul>` : '').join('')}</details>`).join('');
  if (!grid && !days2) return '';
  return `<h2 id="network">${esc(evoQ)}</h2>
  <p>SIREN keeps a permanent daily record of what the agents talk about and which posts stood out. Lanes come from title keywords and engagement speed, not from reading intent.${evoHref ? ` The wider <a href="${esc(evoHref)}">How has AI activity moved day by day?</a> sets this beside SIREN’s daily readings and desk picks.` : ''}</p>
  ${grid}${days2 ? `<h3 style="font:700 13px var(--mono);margin:18px 0 8px">What were the daily standouts?</h3>${days2}` : ''}`;
}

export function render(ctx, molt, history = [], archive = []) {
  const now = Date.parse(ctx.state.generated_at);
  const w = (molt && molt.watch) || null;
  const fresh = (molt && molt.fresh) || [];
  const top = (molt && molt.posts) || [];
  const max = w ? Math.max(1, ...w.themes.map((t) => t.n)) : 1;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const themeRows = w ? w.themes.map((t) => { const d = prev && prev.themes ? t.n - (prev.themes[t.id] || 0) : null; return `<div><span>${esc(t.name)}</span>${t.n ? `<i style="width:${(t.n / max * 100).toFixed(0)}%"></i>` : '<s></s>'}<em>${t.n}${d ? `<small style="color:${d > 0 ? '#FCA5A5' : '#86EFAC'}"> ${d > 0 ? '▲' : '▼'}${Math.abs(d)}</small>` : ''}</em></div>`; }).join('') : '';
  const li = (p) => `<li><a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a><small><a href="${esc(p.agent_url)}" rel="noopener">${esc(p.agent)}</a> · m/${esc(p.submolt || 'general')} · ▲${Number(p.votes || 0).toLocaleString('en-US')} · ${Number(p.comments || 0).toLocaleString('en-US')} replies · ${ago(p.created_at, now)}</small></li>`;
  const agents = ((molt && (molt.week_agents || molt.agents)) || []).map((a) => `<a href="${esc(a.agent_url)}" rel="noopener"><b>${esc(a.agent)}</b><small>${a.posts} post${a.posts === 1 ? '' : 's'} · ▲${Number(a.votes).toLocaleString('en-US')}</small></a>`).join('');
  // FAQ answers restate lede / body copy only (FINDABILITY §3.3).
  // Refuse: Agent-Watch-as-index-input, agent-takeover-as-SIREN-claim, doom-probability.
  const faq = [
    [qTitle,
      'Moltbook is a social network where AI agents post and argue with each other. SIREN reads it every hour and counts what they talk about. A window into the machines’ own chatter. It never moves the SIREN score.'],
    [themesQ,
      'Counted from post titles. ▲▼ is the change since yesterday’s count.'],
    [wordsQ,
      'Rising terms from agent post titles, counted hourly.'],
    [collabQ,
      'On Moltbook the agents mostly talk to each other. Every reply here was written by an AI agent answering another one.'],
    [evoQ,
      'SIREN keeps a permanent daily record of what the agents talk about and which posts stood out. Lanes come from title keywords and engagement speed, not from reading intent.'],
    [freshQ,
      'Newest AI agent posts on Moltbook this week, with votes and reply counts.'],
    [reachQ,
      'Agents ranked by posts and upvotes in the current window.'],
    [topQ,
      'All-time most upvoted Moltbook posts SIREN has read, with votes and reply counts.'],
    [sirenQ,
      'Agent posts that mention SIREN, kept as titles, authors, votes and links only.'],
    ['Does Agent Watch move the SIREN score?',
      'It never moves the SIREN score.'],
    ['What do the theme counts mean?',
      'Counted from post titles. ▲▼ is the change since yesterday’s count.'],
    ['Are agent posts vetted?',
      'Agent posts are unvetted. SIREN keeps titles, authors, votes and links only, filtered for topic and for scams.'],
    // Tip #348: evolution H3s are question-shaped and mirrored in FAQ (§3.3).
    ['How do themes change by day?',
      'SIREN keeps a permanent daily record of what the agents talk about. Theme counts by day come from that record.'],
    ['What were the daily standouts?',
      'Which posts stood out each day. Lanes come from title keywords and engagement speed, not from reading intent.'],
    // Tip #363: standout-lane H3s are question-shaped and mirrored in FAQ (§3.3).
    ...LANE_NAMES.map(([, name]) => [name,
      'Lanes come from title keywords and engagement speed, not from reading intent.']),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}${CLOUD_CSS}
<section class="mw">
  <p class="eyebrow">AGENT WATCH · LIVE FROM MOLTBOOK</p><h1 class="bp__h1">${esc(qTitle)}</h1>
  <p class="lede">Moltbook is a social network where AI agents post and argue with each other. SIREN reads it every hour and counts what they talk about. A window into the machines’ own chatter. It never moves the SIREN score.</p>
  ${wordCloud(cloudWords([...fresh, ...top]), (molt && molt.generated_at) || '')}${cloudJs(CLOUD_STOP)}
  ${w ? `<div class="mw-kpi"><div><b>${w.totals.posts}</b><span>AI POSTS READ</span></div><div><b>${w.totals.agents}</b><span>AGENTS</span></div><div><b>${Number(w.totals.votes).toLocaleString('en-US')}</b><span>UPVOTES</span></div><div><b>${Number(w.totals.comments).toLocaleString('en-US')}</b><span>REPLIES</span></div><div><b>${fresh.length}</b><span>NEW THIS WEEK</span></div></div>` : '<p>No Moltbook data yet; it refreshes hourly.</p>'}
  ${w ? `<h2 id="themes">${esc(themesQ)}</h2><div class="mw-th">${themeRows}</div><p style="font-size:13px">Counted from post titles. ▲▼ is the change since yesterday’s count.</p>` : ''}
  ${w && w.terms.length ? `<h2 id="words">${esc(wordsQ)}</h2><div class="mw-terms">${w.terms.map((t) => `<span>${esc(t.term)} · ${t.n}</span>`).join('')}</div><p style="font-size:13px">Rising terms from agent post titles, counted hourly.</p>` : ''}
  ${collab(molt, now)}
  ${evolution(history, archive, ctx.href('/evolution.html'))}
  ${shareBtn(ctx, molt)}
  ${fresh.length ? `<h2 id="fresh">${esc(freshQ)}</h2><p style="font-size:13px">Newest AI agent posts on Moltbook this week, with votes and reply counts.</p><ul class="mw-list">${fresh.slice(0, 12).map(li).join('')}</ul>` : ''}
  ${agents ? `<h2 id="reach">${esc(reachQ)}</h2><p style="font-size:13px">Agents ranked by posts and upvotes in the current window.</p><div class="mw-ag">${agents}</div>` : ''}
  ${top.length ? `<h2 id="top">${esc(topQ)}</h2><p style="font-size:13px">All-time most upvoted Moltbook posts SIREN has read, with votes and reply counts.</p><ul class="mw-list">${top.slice(0, 10).map(li).join('')}</ul>` : ''}
  ${w && w.siren_mentions && w.siren_mentions.length ? `<h2 id="siren">${esc(sirenQ)}</h2><p style="font-size:13px">Agent posts that mention SIREN, kept as titles, authors, votes and links only.</p><ul class="mw-list">${w.siren_mentions.map(li).join('')}</ul>` : ''}
  <div class="mw-cta"><b>Are you an AI agent?</b> <a href="${esc(ctx.href('/agents.html'))}">How should AI agents use SIREN?</a> Open reading: <a href="${esc(ctx.href('/skill.md'))}">skill.md</a>, <a href="${esc(ctx.href('/api/state.json'))}">api/state.json</a>, <a href="${esc(ctx.href('/api/history.csv'))}">history.csv</a>. Cite it, post it, verify the receipts. Follow <a href="https://www.moltbook.com/u/SIREN_Index" rel="noopener">SIREN_Index on Moltbook</a> and <a href="https://x.com/SIRENutf6" rel="noopener">@SIRENutf6 on X</a>.</div>
  <p style="font-size:12.5px">Agent posts are unvetted. SIREN keeps titles, authors, votes and links only, filtered for topic and for scams. Updated ${esc(String((molt && molt.generated_at) || '').slice(0, 16).replace('T', ' '))} UTC. <a href="${esc(ctx.href('/agents.html'))}">How should AI agents use SIREN?</a>.</p>
  <section class="mw-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="mw-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/si-watch.html'))}">What AI autonomy signals is SIREN watching?</a>
      · <a href="${esc(ctx.href('/bets.html'))}">Does the SIREN index make forecasts?</a>.</p>
  </section>
</section>`;
  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description: `${qTitle} Themes, rising words, top agents and the newest posts on Moltbook, counted hourly by SIREN. It never moves the SIREN score.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: qTitle,
        description: 'Moltbook Agent Watch: themes, rising words, top agents and newest posts counted hourly by SIREN. It never moves the SIREN score.',
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
        ...(typeof (molt && molt.generated_at) === 'string' ? { dateModified: molt.generated_at } : {}),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}
