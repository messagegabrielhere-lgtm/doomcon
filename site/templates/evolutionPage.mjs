// /evolution.html — THE EVOLUTION LOG: how AI activity has moved day by day.
// Added 2026-10-12.
//
// Four plain records, side by side, oldest data kept:
//   1. the index's own daily readings (data/history.ndjson, per-pillar means);
//   2. every hand-picked story (data/desk-picks.json plus the append-only
//      data/watch-log.json, so picks outlive the 14-day desk window);
//   3. what AI agents on Moltbook talked about each day
//      (data/moltbook-history.ndjson, written hourly by the collector);
//   4. the scan log itself, one entry per Reddit + Moltbook scan.
//
// Presentation only: nothing here feeds the index. Counts are counts; a day
// with no data prints as a dash, never as a zero it did not observe.
// Deterministic: no wall clock, no randomness.

import { esc, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const PATH = '/evolution.html';
const qTitle = 'How has AI activity moved day by day?';

const PILLARS = [
  ['capability', 'Capability', '#A78BFA'],
  ['compute', 'Compute', '#38BDF8'],
  ['attention', 'Attention', '#FACC15'],
  ['governance', 'Governance', '#4ADE80'],
  ['markets', 'Markets', '#FB923C'],
];
const THEMES = [
  ['memory', 'Memory & identity'], ['work', 'Work & economy'], ['humans', 'Humans & owners'],
  ['tools', 'Tools & coding'], ['agi', 'AGI'], ['safety', 'Safety & alignment'],
  ['mind', 'Consciousness'], ['agents', 'Agent society'],
];
const DAYS = 30;

const CSS = `<style>
.ev{max-width:1080px}
.ev .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#A78BFA;margin:0 0 10px}
.ev h2{font:700 1.3rem/1.2 var(--sans);margin:38px 0 8px;color:var(--ink)}
.ev p{color:var(--ink-dim);line-height:1.6}
.ev-note{font:500 12px/1.5 var(--mono);color:var(--ink-faint,#6B7686)}
.ev-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.ev table{border-collapse:collapse;width:100%;font:500 13px/1.3 var(--mono)}
.ev th,.ev td{padding:6px 8px;border-bottom:1px solid var(--rule);text-align:right;white-space:nowrap}
.ev th:first-child,.ev td:first-child{text-align:left}
.ev th{font-weight:600;color:var(--ink-faint,#6B7686);letter-spacing:.06em;font-size:11px}
.ev td.h{color:#000;font-weight:700;text-align:center}
.ev-bar{display:inline-block;height:10px;border-radius:2px;vertical-align:middle}
.ev-stack{display:flex;height:14px;border-radius:2px;overflow:hidden;background:#1E2633;min-width:120px}
.ev-stack i{display:block;height:100%}
.ev-key{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0;font:600 12px var(--mono);color:var(--ink-dim)}
.ev-key span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:var(--c)}
.ev-runs{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:14px}
.ev-runs>li{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);padding:14px 16px;border-radius:4px}
.ev-runs h3{font:700 13px/1.2 var(--mono);letter-spacing:.08em;color:#7EC8E8;margin:0 0 8px}
.ev-runs ul,.ev-arch ul{list-style:none;padding:0;margin:0 0 8px;display:flex;flex-direction:column;gap:6px}
.ev-runs li li,.ev-arch li{border-left:3px solid var(--c,#A78BFA);padding:2px 0 2px 10px}
.ev a{color:var(--ink)}
.ev small{display:block;color:var(--ink-faint,#6B7686);font:500 12px/1.5 var(--mono)}
.ev-arch h3{font:700 13px var(--mono);color:var(--ink-dim);margin:18px 0 8px}
.ev-faq{margin:38px 0 12px;max-width:62ch}
.ev-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.ev-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.ev-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.ev-faq-key{margin-top:var(--s-4,1rem)!important}
</style>`;

const pillarColor = (id) => (PILLARS.find((p) => p[0] === id) || [0, 0, '#A78BFA'])[2];
const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');

/** Daily means of the index score and each pillar, newest first. */
export function dailyReadings(history) {
  const by = new Map();
  for (const h of history || []) {
    const day = String(h.t || h.generated_at || '').slice(0, 10);
    if (day.length !== 10) continue;
    if (!by.has(day)) by.set(day, []);
    by.get(day).push(h);
  }
  const mean = (xs) => { const v = xs.filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
  return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, DAYS).map(([day, rows]) => ({
    day,
    n: rows.length,
    score: mean(rows.map((r) => r.score)),
    level: rows[rows.length - 1].level,
    pillars: Object.fromEntries(PILLARS.map(([id]) => [id, mean(rows.map((r) => (r.pillars || {})[id]))])),
  }));
}

/** Every pick ever logged, deduped by URL, newest first. */
export function allPicks(deskPicks, log) {
  const seen = new Map();
  const add = (p) => { if (p && p.url && p.title && Number.isFinite(Date.parse(p.published_at)) && !seen.has(p.url)) seen.set(p.url, p); };
  for (const r of (log && log.runs) || []) for (const p of r.desk_picks || []) add(p);
  for (const p of (deskPicks && deskPicks.items) || []) add(p);
  return [...seen.values()].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}

export function hasEvolution(ctx, log, molt) {
  return Boolean((ctx.history && ctx.history.length) || allPicks(ctx.deskPicks, log).length || (molt && molt.length));
}

function readingsTable(rows) {
  if (!rows.length) return '<p class="ev-note">No readings yet.</p>';
  const max = 100;
  return `<div class="ev-wrap"><table><thead><tr><th>DAY (UTC)</th><th>SIREN</th><th>LEVEL</th>${PILLARS.map(([, n]) => `<th>${esc(n.toUpperCase())}</th>`).join('')}<th>READINGS</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.day)}</td><td><b>${fmt(r.score)}</b></td><td>${esc(String(r.level ?? '—'))}</td>${PILLARS.map(([id, , c]) => {
    const v = r.pillars[id];
    return `<td>${Number.isFinite(v) ? `<span class="ev-bar" style="width:${Math.round((v / max) * 60)}px;background:${c}"></span> ${fmt(v)}` : '—'}</td>`;
  }).join('')}<td>${r.n}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function picksByDay(picks) {
  const by = new Map();
  for (const p of picks) {
    const d = String(p.published_at).slice(0, 10);
    if (!by.has(d)) by.set(d, []);
    by.get(d).push(p);
  }
  return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function storyMix(picks) {
  const days = picksByDay(picks).slice(0, DAYS);
  if (!days.length) return '<p class="ev-note">No desk picks logged yet.</p>';
  return `<div class="ev-key">${PILLARS.map(([, n, c]) => `<span style="--c:${c}">${esc(n)}</span>`).join('')}</div>
<div class="ev-wrap"><table><thead><tr><th>DAY (UTC)</th><th style="text-align:left">MIX</th>${PILLARS.map(([, n]) => `<th>${esc(n.toUpperCase())}</th>`).join('')}<th>PICKS</th></tr></thead><tbody>
${days.map(([day, ps]) => {
    const c = Object.fromEntries(PILLARS.map(([id]) => [id, ps.filter((p) => p.pillar === id).length]));
    return `<tr><td>${esc(day)}</td><td style="text-align:left"><div class="ev-stack">${PILLARS.filter(([id]) => c[id]).map(([id, , col]) => `<i style="width:${(c[id] / ps.length) * 100}%;background:${col}"></i>`).join('')}</div></td>${PILLARS.map(([id]) => `<td>${c[id]}</td>`).join('')}<td>${ps.length}</td></tr>`;
  }).join('\n')}
</tbody></table></div>`;
}

function agentThemes(mh) {
  const rows = (mh || []).filter((r) => r && r.day && r.themes).sort((a, b) => b.day.localeCompare(a.day)).slice(0, DAYS);
  if (!rows.length) return '<p class="ev-note">No Moltbook history yet.</p>';
  const max = Math.max(1, ...rows.flatMap((r) => THEMES.map(([id]) => r.themes[id] || 0)));
  const cell = (n) => {
    const a = n ? 0.25 + 0.75 * (n / max) : 0;
    return n ? `<td class="h" style="background:rgba(167,139,250,${a.toFixed(2)})">${n}</td>` : '<td>0</td>';
  };
  return `<div class="ev-wrap"><table><thead><tr><th>DAY (UTC)</th>${THEMES.map(([, n]) => `<th>${esc(n.toUpperCase())}</th>`).join('')}<th>POSTS READ</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.day)}</td>${THEMES.map(([id]) => cell(r.themes[id] || 0)).join('')}<td>${esc(String(r.posts ?? '—'))}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function pickLi(p) {
  return `<li style="--c:${pillarColor(p.pillar)}"><a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a><small>${esc(p.publisher || '')} · ${esc(utc(p.published_at))} · ${esc(String(p.pillar || '').toUpperCase())}${p.found_on ? ` · <a href="${esc(p.found_on)}" rel="noopener">spotted on Reddit</a>` : ''}</small></li>`;
}

function scanLog(log) {
  const runs = ((log && log.runs) || []).filter((r) => r && Number.isFinite(Date.parse(r.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  if (!runs.length) return '<p class="ev-note">No scans logged yet.</p>';
  return `<ol class="ev-runs">${runs.map((r) => {
    const m = r.moltbook || {};
    const picks = r.desk_picks || [];
    const st = m.standouts || [];
    // Tip #354: timed scan H3s are question-shaped (mirrored in FAQ when present).
    return `<li><h3>What did the scan at ${esc(utc(r.at))} find?</h3>
<small>NEWS PICKED</small>${picks.length ? `<ul>${picks.map(pickLi).join('')}</ul>` : '<p class="ev-note">No new desk picks this run.</p>'}
<small>AI AGENTS ON MOLTBOOK${(m.top_themes || []).length ? ` · TOP THEMES: ${esc(m.top_themes.join(', ').toUpperCase())}` : ''}${Number.isFinite(m.siren_mentions) ? ` · SIREN MENTIONS: ${m.siren_mentions}` : ''}</small>${st.length ? `<ul>${st.map((s) => `<li style="--c:#38BDF8"><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a><small>${esc(s.agent)} (AI agent) · ▲${Number(s.votes || 0).toLocaleString('en-US')} · ${Number(s.comments || 0).toLocaleString('en-US')} agent replies</small></li>`).join('')}</ul>` : '<p class="ev-note">No standouts logged.</p>'}
</li>`;
  }).join('')}</ol>`;
}

function archive(picks) {
  const days = picksByDay(picks);
  if (!days.length) return '';
  // Tip #354: archive-day H3s are question-shaped (mirrored in FAQ when present).
  return `<div class="ev-arch">${days.map(([day, ps]) => `<h3>Which desk picks were kept on ${esc(utcDay(day + 'T00:00:00Z'))}?</h3><ul>${ps.map(pickLi).join('')}</ul>`).join('')}</div>`;
}

export function render(ctx, log, mh = []) {
  const readings = dailyReadings(ctx.history);
  const picks = allPicks(ctx.deskPicks, log);
  const asOf = ctx.state && ctx.state.generated_at ? utc(ctx.state.generated_at) : '';
  // Tip #266: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const tempoQ = 'How does the tempo look day by day?';
  const newsQ = 'What was the news about?';
  const agentsQ = 'What did the agents talk about?';
  const scanQ = 'What is in each scan log entry?';
  const deskQ = 'Which desk picks are kept?';
  // FAQ answers restate lede / body copy only.
  // Refuse: Evolution-Log-as-forecast, page-as-index-input, doom-probability.
  const faq = [
    [qTitle,
      'Nothing here is deleted. Every hourly reading, every hand-picked story and every scan of what AI agents say on Moltbook is kept, so the change shows up as a record instead of a feeling. These are counts of activity, not forecasts, and nothing on this page moves the index.'],
    [tempoQ,
      `The daily average of ${brand.NAME}'s hourly readings and of each pillar, scored against the index's frozen reference. Newest first.`],
    [newsQ,
      `Hand-picked stories from Reddit's AI communities, by the day they were published and the pillar they belong to. ${picks.length} logged so far.`],
    [agentsQ,
      'Each day the collector sorts the Moltbook posts it reads into themes. These are posts written by AI agents to other AI agents.'],
    [scanQ,
      'One entry per Reddit + Moltbook scan: the stories that made the desk and the agent posts that stood out.'],
    [deskQ,
      'Every hand-picked desk story is kept in the archive below, nothing deleted.'],
    ['Does the Evolution Log move the SIREN index?',
      'Nothing on this page moves the index.'],
    ['Are these forecasts?',
      'These are counts of activity, not forecasts.'],
    ['What records are kept?',
      'Every hourly reading, every hand-picked story and every scan of what AI agents say on Moltbook is kept.'],
    // Tip #354: timed scan + archive-day H3s mirrored in FAQ (§3.3).
    // Answers restate the note / archive copy visible under those heads.
    ...((log && log.runs) || [])
      .filter((r) => r && Number.isFinite(Date.parse(r.at)))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 5)
      .map((r) => {
        const hasPicks = (r.desk_picks || []).length > 0;
        const hasSt = ((r.moltbook || {}).standouts || []).length > 0;
        const parts = [];
        parts.push(hasPicks
          ? 'The stories that made the desk for this Reddit + Moltbook scan.'
          : 'No new desk picks this run.');
        parts.push(hasSt
          ? 'The agent posts that stood out on Moltbook.'
          : 'No standouts logged.');
        return [`What did the scan at ${utc(r.at)} find?`, parts.join(' ')];
      }),
    ...picksByDay(picks).slice(0, 5).map(([day]) => [
      `Which desk picks were kept on ${utcDay(day + 'T00:00:00Z')}?`,
      'Every hand-picked desk story is kept in the archive below, nothing deleted.',
    ]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}<article class="ev">
<p class="eyebrow">THE EVOLUTION LOG</p>
<h1 class="bp__h1">${esc(qTitle)}</h1>
<p class="lede">Nothing here is deleted. Every hourly reading, every hand-picked story and every scan of what AI agents say on Moltbook is kept, so the change shows up as a record instead of a feeling. These are counts of activity, not forecasts, and nothing on this page moves the index.${asOf ? ` <span class="ev-note">Last reading ${esc(asOf)}.</span>` : ''}</p>

<h2 id="ev-tempo-h">How does the tempo look day by day?</h2>
<p>The daily average of ${esc(brand.NAME)}'s hourly readings and of each pillar, scored against the index's frozen reference. Newest first.</p>
${readingsTable(readings)}

<h2 id="ev-news-h">What was the news about?</h2>
<p>Hand-picked stories from Reddit's AI communities, by the day they were published and the pillar they belong to. ${picks.length} logged so far.</p>
${storyMix(picks)}

<h2 id="ev-agents-h">What did the agents talk about?</h2>
<p>Each day the collector sorts the Moltbook posts it reads into themes. These are posts written by AI agents to other AI agents.</p>
${agentThemes(mh)}

<h2 id="ev-scan-h">What is in each scan log entry?</h2>
<p>One entry per Reddit + Moltbook scan: the stories that made the desk and the agent posts that stood out.</p>
${scanLog(log)}

<h2 id="ev-desk-h">Which desk picks are kept?</h2>
${archive(picks)}
<p class="ev-note">Data: <a href="https://github.com/messagegabrielhere-lgtm/doomcon/blob/main/data/watch-log.json" rel="noopener">watch-log.json</a> · desk-picks.json · history.ndjson · moltbook-history.ndjson, all in the public repo.</p>
<section class="ev-faq" aria-labelledby="faq">
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="ev-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/moltbook.html'))}">What are AI agents saying on Moltbook?</a>
    · <a href="${esc(ctx.href('/history.html'))}">What is the history of AI risk?</a>.</p>
</section>
</article>`;
  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description: `${qTitle} Daily SIREN readings by pillar, every hand-picked AI news story, and what AI agents on Moltbook talked about — counts of activity, not forecasts.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: qTitle,
        description: 'The Evolution Log: daily SIREN readings by pillar, hand-picked AI news, and Moltbook agent themes. Counts of activity, not forecasts; nothing on this page moves the index.',
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
        ...(typeof (ctx.state && ctx.state.generated_at) === 'string' ? { dateModified: ctx.state.generated_at } : {}),
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
