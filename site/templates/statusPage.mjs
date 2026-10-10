// /status.html — IS IT DOWN? Live status of the AI services people use, read
// from each provider's own status page. Snapshot from collector/ai-status.mjs
// (every 15 minutes) for first paint and no-JS readers; the browser then polls
// the providers that allow it every 60 seconds. Never says "up" for a provider
// it could not reach.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const COL = { none: '#4ADE80', minor: '#FACC15', major: '#FB923C', critical: '#F87171', maintenance: '#60A5FA', unknown: '#64748B' };
const WORD = { none: 'UP', minor: 'DEGRADED', major: 'PARTIAL OUTAGE', critical: 'MAJOR OUTAGE', maintenance: 'MAINTENANCE', unknown: 'UNKNOWN' };
const ANSWER = { none: 'No — its status page reports all systems operational.', minor: 'Partly: its status page reports degraded performance.', major: 'Partly: its status page reports a partial outage.', critical: 'Yes: its status page reports a major outage.', maintenance: 'It is under scheduled maintenance.', unknown: 'SIREN could not reach its status page on the last check.' };

const CSS = `<style>
.st{max-width:1100px}.st .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#4ADE80;margin:0 0 10px}
.st-sum{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.st-sum span{border:1px solid var(--rule);padding:8px 12px;font:700 13px var(--mono);border-radius:4px}
.st-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin:14px 0}
.st-c{border:1px solid var(--rule);border-left:6px solid var(--c);border-radius:8px;background:var(--bg-raised,#0E131D);padding:14px;scroll-margin-top:90px}
.st-c h2{margin:0;font:700 17px var(--sans);color:#E6EAF0;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.st-c h2 small{font:600 11px var(--mono);color:var(--ink-faint,#6B7686)}
.st-w{display:inline-flex;align-items:center;gap:7px;margin:8px 0 4px;font:800 14px var(--mono);letter-spacing:.06em;color:var(--c)}
.st-w i{width:10px;height:10px;border-radius:50%;background:var(--c);box-shadow:0 0 10px var(--c)}
.st-c[data-i=none] .st-w i{animation:stPulse 2.4s ease-in-out infinite}
@keyframes stPulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.st-c .st-w i{animation:none}}
.st-c p{margin:4px 0;color:var(--ink-dim);font-size:13.5px;line-height:1.5}
.st-c ul{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--ink-dim)}
.st-c a{color:inherit}
.st-faq{margin-top:22px}.st-faq h3{font:700 15px var(--sans);margin:14px 0 2px;color:#E6EAF0}.st-faq p{margin:0;color:var(--ink-dim)}
</style>`;

function card(s) {
  const i = s.indicator || 'unknown';
  const inc = (s.incidents || []).map((x) => `<li>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">` : ''}${esc(x.name)}${x.url ? '</a>' : ''} · ${esc(x.status)}</li>`).join('');
  const deg = (s.degraded || []).map((c) => `<li>${esc(c.name)}: ${esc(String(c.status).replace(/_/g, ' '))}</li>`).join('');
  return `<article class="st-c" id="${esc(s.id)}" data-id="${esc(s.id)}" data-i="${esc(i)}" data-api="${s.browser ? esc(s.api) : ''}" style="--c:${COL[i] || COL.unknown}">
  <h2>${esc(s.product)}<small>${esc(s.name)}</small></h2>
  <div class="st-w"><i></i><span class="st-word">${WORD[i] || WORD.unknown}</span></div>
  <p class="st-desc">${esc(s.description || '')}</p>
  <ul class="st-inc">${inc}${deg}</ul>
  <p style="font-size:12px"><a href="${esc(s.page)}" target="_blank" rel="noopener">Official status page →</a></p>
</article>`;
}

export function render(ctx, data) {
  const svc = (data && data.services) || [];
  const counts = svc.reduce((m, s) => { const k = s.indicator === 'none' ? 'up' : s.indicator === 'unknown' ? 'unknown' : 'issues'; m[k] = (m[k] || 0) + 1; return m; }, {});
  const faq = svc.filter((s) => ['openai', 'claude', 'github', 'cursor', 'perplexity', 'groq'].includes(s.id)).map((s) => ({
    q: `Is ${s.product} down right now?`, a: `${ANSWER[s.indicator] || ANSWER.unknown} SIREN reads ${s.name}’s official status page and re-checks it every minute in your browser.` }));
  const main = `${CSS}<section class="st">
  <p class="eyebrow">LIVE · AI SERVICE STATUS</p>
  <h1 class="bp__h1">Is ChatGPT down? Is Claude down?</h1>
  <p class="lede">The AI services people rely on, read straight from each company’s own status page. This page re-checks them every minute while it’s open, so you don’t have to open ${svc.length} tabs.</p>
  <div class="st-sum" id="st-sum"><span style="color:#4ADE80">${counts.up || 0} UP</span><span style="color:#FACC15">${counts.issues || 0} WITH ISSUES</span>${counts.unknown ? `<span style="color:#94A3B8">${counts.unknown} UNREACHABLE</span>` : ''}<span id="st-at" style="color:var(--ink-dim)">CHECKED ${esc(String((data && data.generated_at) || '').slice(11, 16))} UTC</span></div>
  <div class="st-g">${svc.map(card).join('')}</div>
  <div class="st-faq">${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</div>
  <p style="font-size:12.5px;margin-top:18px">How it works: each card reads the provider’s public status feed. A provider that doesn’t answer shows as UNKNOWN, never as up. Status pages are run by the companies themselves and sometimes lag what users see. <a href="api/ai-status.json">JSON</a> · <a href="dispatch.html">Live alerts</a> · <a href="news.html">AI news</a></p>
</section>
<script>(function(){var C=${JSON.stringify(COL)},W=${JSON.stringify(WORD)};
function esc(t){return String(t||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function upd(el,j){if(!j||!j.status)return;var i=j.status.indicator||'none';el.setAttribute('data-i',i);el.style.setProperty('--c',C[i]||C.unknown);el.querySelector('.st-word').textContent=W[i]||i;el.querySelector('.st-desc').textContent=j.status.description||'';
var inc=(j.incidents||[]).filter(function(x){return x.status!=='resolved'&&x.status!=='postmortem';}).slice(0,5).map(function(x){return '<li>'+(x.shortlink?'<a href="'+esc(x.shortlink)+'" target="_blank" rel="noopener">':'')+esc(x.name)+(x.shortlink?'</a>':'')+' · '+esc(x.status)+'</li>';});
var deg=(j.components||[]).filter(function(c){return !c.group&&c.status&&c.status!=='operational';}).slice(0,12).map(function(c){return '<li>'+esc(c.name)+': '+esc(String(c.status).replace(/_/g,' '))+'</li>';});
el.querySelector('.st-inc').innerHTML=inc.concat(deg).join('');}
function sum(){var up=0,is=0,un=0;[].forEach.call(document.querySelectorAll('.st-c'),function(e){var i=e.getAttribute('data-i');if(i==='none')up++;else if(i==='unknown')un++;else is++;});document.getElementById('st-sum').innerHTML='<span style="color:#4ADE80">'+up+' UP</span><span style="color:#FACC15">'+is+' WITH ISSUES</span>'+(un?'<span style="color:#94A3B8">'+un+' UNREACHABLE</span>':'')+'<span style="color:var(--ink-dim)">LIVE · CHECKED '+new Date().toISOString().slice(11,19)+' UTC</span>';}
function poll(){var cards=[].slice.call(document.querySelectorAll('.st-c[data-api]')).filter(function(e){return e.getAttribute('data-api');});
Promise.all(cards.map(function(el){return fetch(el.getAttribute('data-api'),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){upd(el,j);}).catch(function(){});})).then(sum);}
poll();setInterval(poll,60000);})();</script>`;
  return page({ ctx, path: '/status.html',
    title: `Is ChatGPT down? Is Claude down? Live AI status for ${svc.length} services · ${brand.NAME}`,
    description: `Live status of ChatGPT, Claude, GitHub Copilot, Cursor, Perplexity, Groq and more, read from each provider’s own status page and re-checked every minute.`,
    jsonld: faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : undefined,
    main });
}
