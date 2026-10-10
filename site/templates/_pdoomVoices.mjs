// THE VOICES: named, dated, sourced p(doom) estimates on one ladder, plus a
// "set your own" dial that places the reader among them. Opinion, clearly
// labelled; SIREN's own reading is measurement and sits beside it, never in it.
//
// Each row: [name, low %, high %, group, role, citation (publication, date)].
// low === high is a point estimate. Figures as publicly stated and compiled
// in Wikipedia's P(doom) article (March 2026 snapshot); each citation names
// the original outlet so a reader can check it. Jokes (negative numbers) and
// "greater than zero" non-answers are left out of the ladder.
import { esc } from './_html.mjs';

export const VOICES_AS_OF = '2026-03';
export const VOICES = [
  ['Marc Andreessen', 0, 0, 'other', 'Co-founder, Andreessen Horowitz', 'The New Yorker, Mar 2024'],
  ['Grady Booch', 0, 0, 'research', 'Software engineer', 'Fast Company, Jul 2023'],
  ['Yann LeCun', 0.01, 0.01, 'lab', 'Chief AI Scientist, Meta (at the time)', 'TechRadar, Apr 2024'],
  ['Benjamin Mann', 0, 10, 'lab', 'Co-founder, Anthropic', 'Lenny’s Podcast, Jul 2025'],
  ['Casey Newton', 5, 5, 'other', 'Technology journalist', 'Fast Company, Jul 2023'],
  ['Nate Silver', 5, 10, 'other', 'Statistician, Silver Bulletin', 'Silver Bulletin, Jan 2025'],
  ['Lex Fridman', 10, 10, 'other', 'Podcast host', 'Lex Fridman transcript, Jun 2025'],
  ['Toby Ord', 10, 10, 'research', 'Philosopher, author of The Precipice', 'ABC News, Oct 2023'],
  ['Vitalik Buterin', 12, 12, 'other', 'Co-founder, Ethereum', 'Doom Debates, Aug 2025'],
  ['Lina Khan', 15, 15, 'other', 'Former FTC chair', 'New York Times, Dec 2023'],
  ['Geoffrey Hinton', 10, 20, 'research', 'Nobel laureate, “godfather of AI”', 'METR Q&A, Jun 2024'],
  ['Dario Amodei', 10, 25, 'lab', 'CEO, Anthropic', 'Axios, Sep 2025'],
  ['Elon Musk', 10, 30, 'lab', 'CEO, xAI, Tesla, SpaceX', 'Business Insider, 2024'],
  ['Shane Legg', 5, 50, 'lab', 'Co-founder, Google DeepMind', 'LessWrong Q&A, 2011'],
  ['Emmett Shear', 5, 50, 'lab', 'Former interim CEO, OpenAI', 'New York Times, Dec 2023'],
  ['Jan Leike', 10, 90, 'lab', 'Alignment lead, Anthropic', 'Fast Company, Jul 2023'],
  ['Yoshua Bengio', 50, 50, 'research', 'Turing Award winner, Mila', 'ABC News, Jul 2023'],
  ['Paul Christiano', 50, 50, 'research', 'Former head of research, US AI Safety Institute', 'The Independent, May 2023'],
  ['Holden Karnofsky', 50, 50, 'other', 'Co-founder, Open Philanthropy', 'The Spectator, Mar 2024'],
  ['Emad Mostaque', 50, 50, 'lab', 'Co-founder, Stability AI', 'Post on X, Dec 2024'],
  ['Zvi Mowshowitz', 70, 70, 'other', 'AI writer', 'The Cognitive Revolution, Sep 2025'],
  ['Daniel Kokotajlo', 70, 80, 'research', 'AI Futures Project, ex-OpenAI', 'Interview, Apr 2025'],
  ['Dan Hendrycks', 80, 80, 'research', 'Director, Center for AI Safety (“over 80%”)', 'Fast Company, Jul 2023'],
  ['Andrew Critch', 85, 85, 'research', 'AI safety researcher', 'Doom Debates, Nov 2024'],
  ['Connor Leahy', 90, 90, 'lab', 'CEO, Conjecture (“90%+”)', 'Interview, Nov 2024'],
  ['Max Tegmark', 90, 90, 'research', 'MIT physicist, Future of Life Institute (“over 90%”)', 'Post on X, Apr 2025'],
  ['Eliezer Yudkowsky', 95, 95, 'research', 'Founder, MIRI (“over 95%”)', 'Fast Company, Jul 2023'],
  ['Roman Yampolskiy', 99.9, 99.9, 'research', 'Computer scientist (99.9% or higher)', 'Business Insider, 2024'],
];
// Grace et al., "Thousands of AI Authors on the Future of AI" (2024): 2,778
// researchers; median ~5% for an outcome as bad as human extinction.
export const POLLS = [
  ['AI researchers', '5% median, 9% mean', '2,778 authors of top AI papers asked about an outcome as bad as human extinction', 'AI Impacts / Grace et al., 2024', 'https://arxiv.org/abs/2401.02843'],
  ['Harvard event attendees', '50% → 70% median', '89 people, before and after a talk on “If Anyone Builds It, Everyone Dies”; self-described experts didn’t move up', 'Kestin & Soares, arXiv, Mar 2026', 'https://arxiv.org/abs/2603.27785'],
];
export const READING = [
  ['The Conversation', 'Does AI pose an existential risk? We asked 5 experts', 'Jul 2026', 'https://theconversation.com/does-ai-pose-an-existential-risk-we-asked-5-experts-266345'],
  ['NPR, 1A', 'The peril and opportunity of artificial superintelligence', 'Jun 2026', 'https://www.npr.org/2026/06/25/nx-s1-5871218/ai-the-peril-and-opportunity-of-artificial-superintelligence'],
  ['CNN', 'Decoding AI existential risk', 'Jun 2026', 'https://www.cnn.com/2026/06/02/us/video/cnn-sitroom-blitzer-brown-decoding-ai-existential-risk-technology-artificial-intelligence'],
  ['AI and Ethics', 'Power-seeking superintelligence: possible, but improbable in the short term', '2025', 'https://link.springer.com/article/10.1007/s43681-025-00941-z'],
  ['Yudkowsky & Soares', 'If Anyone Builds It, Everyone Dies', '2025', 'https://en.wikipedia.org/wiki/If_Anyone_Builds_It,_Everyone_Dies'],
  ['BBC', 'Stephen Hawking warns AI could end mankind', 'Dec 2014', 'https://www.bbc.com/news/technology-30290540'],
];
export const SURVEY = { median: 5, n: 2778, label: 'Median of 2,778 AI researchers surveyed (Grace et al., 2024)' };

const GROUPS = { lab: ['AI lab leaders & founders', '#F87171'], research: ['Researchers', '#FACC15'], other: ['Investors, writers, officials', '#60A5FA'] };
const mid = (v) => (v[1] + v[2]) / 2;

export const VOICES_CSS = `<style>
.vx{margin:18px 0;border:1px solid var(--rule);border-radius:8px;background:var(--bg-raised,#0E131D);padding:16px}
.vx h2{margin:0 0 4px}.vx .sub{color:var(--ink-dim);font-size:14px;margin:0 0 12px}
.vx-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.vx-chips button{appearance:none;border:1px solid var(--rule);background:transparent;color:var(--ink);font:600 12.5px var(--mono);padding:6px 10px;cursor:pointer;border-radius:3px}
.vx-chips button[aria-pressed=true]{border-color:var(--c,#FACC15);color:var(--c,#FACC15)}
.vx-chips button i{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--c);margin-right:6px}
.vx-lad{position:relative;font:13px/1.2 var(--sans)}
.vx-axis{display:grid;grid-template-columns:minmax(110px,30%) 1fr;font:600 11px var(--mono);color:var(--ink-faint,#6B7686)}
.vx-axis div:last-child{display:flex;justify-content:space-between}
.vx-r{display:grid;grid-template-columns:minmax(110px,30%) 1fr;align-items:center;min-height:24px;border-top:1px solid rgba(255,255,255,.04)}
.vx-r[hidden]{display:none}
.vx-r .n{color:#E6EAF0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px}
.vx-r .n small{display:block;color:var(--ink-faint,#6B7686);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vx-tr{position:relative;height:18px;background:linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px) 0 0/10% 100%}
.vx-b{position:absolute;top:5px;height:8px;border-radius:4px;background:var(--c);opacity:.85;min-width:8px;transform:translateX(-4px)}
.vx-v{position:absolute;top:1px;font:700 11px var(--mono);color:var(--c);white-space:nowrap}
.vx-ov{position:absolute;top:0;bottom:0;right:0;left:max(110px,30%);pointer-events:none}
@media (max-width:620px){.vx-ov{left:96px}}
.vx-you,.vx-sv{position:absolute;top:0;bottom:0;width:0;border-left:2px solid #fff;pointer-events:none;z-index:2}
.vx-sv{border-left:2px dashed #94A3B8}
.vx-you span,.vx-sv span{position:absolute;top:-16px;left:4px;font:700 10.5px var(--mono);white-space:nowrap;color:#fff;background:#05070B;padding:0 3px}
.vx-sv span{color:#94A3B8;top:auto;bottom:-14px}
.vx-me{display:grid;grid-template-columns:minmax(0,180px) 1fr;gap:16px;align-items:center;margin-top:18px;border-top:1px solid var(--rule);padding-top:16px}
@media (max-width:620px){.vx-me{grid-template-columns:1fr}.vx-r,.vx-axis{grid-template-columns:96px 1fr}}
.vx-me input[type=range]{width:100%;accent-color:#F87171}
.vx-me .big{font:800 40px/1 var(--mono);color:#fff}
.vx-me p{margin:6px 0;color:var(--ink-dim)}
.vx-me svg{width:100%;max-width:180px;height:auto;display:block;margin:auto}
.vx-hand{transition:transform .25s ease;transform-origin:60px 60px}
@media (prefers-reduced-motion:reduce){.vx-hand{transition:none}}
.vx-q{border-left:3px solid #F87171;margin:0 0 14px;padding:4px 0 4px 12px;font:italic 16px/1.5 var(--serif,Georgia,serif);color:#E6EAF0}.vx-q cite{display:block;font:600 12px var(--mono);font-style:normal;color:var(--ink-faint,#6B7686);margin-top:4px}
.vx-pre{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.vx-pre button,.vx-sh a,.vx-sh button{appearance:none;border:1px solid var(--rule);background:transparent;color:var(--ink);font:600 12px var(--mono);padding:6px 9px;cursor:pointer;border-radius:3px;text-decoration:none}
.vx-sh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.vx-news{margin-top:16px;border-top:1px solid var(--rule);padding-top:12px}.vx-news h3{margin:0 0 6px;font:700 13px var(--mono);letter-spacing:.1em;color:#FDE68A}
.vx-news ul{margin:0;padding-left:18px;font-size:14px;line-height:1.5}.vx-news li small{color:var(--ink-faint,#6B7686);font:600 11px var(--mono);margin-left:6px}
.vx-src{font-size:12.5px;color:var(--ink-dim)}.vx-src li{margin:2px 0}
</style>`;

const DOOM_RE = /p\(doom\)|doom|extinct|existential|catastroph|superintelligen|x-risk|ai safety|wargam|day after/i;
const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 60000)); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
export function doomNews(items, n = 6) {
  return (items || []).filter((x) => x && x.url && DOOM_RE.test(`${x.title} ${x.summary || ''}`)).slice(0, n);
}

export function voicesSection(ctx, sirenLevel) {
  const rows = VOICES.slice().sort((a, b) => mid(a) - mid(b) || a[0].localeCompare(b[0]));
  const ladder = rows.map((v) => {
    const [name, lo, hi, g, role, cite] = v, c = GROUPS[g][1];
    const val = lo === hi ? `${lo}%` : `${lo}–${hi}%`;
    const labelLeft = hi > 70;
    return `<div class="vx-r" data-g="${g}" data-lo="${lo}" data-hi="${hi}" title="${esc(`${name}: ${val} · ${role} · ${cite}`)}"><div class="n">${esc(name)}<small>${esc(role)}</small></div><div class="vx-tr" style="--c:${c}"><i class="vx-b" style="left:${lo}%;width:calc(${hi - lo}% + 8px)"></i><span class="vx-v" style="${labelLeft ? `right:calc(${100 - lo}% + 8px)` : `left:calc(${hi}% + 10px)`}">${esc(val)}</span></div></div>`;
  }).join('');
  const chips = `<button type="button" data-g="all" aria-pressed="true">All ${VOICES.length}</button>` + Object.entries(GROUPS).map(([k, [l, c]]) => `<button type="button" data-g="${k}" aria-pressed="false" style="--c:${c}"><i></i>${esc(l)}</button>`).join('');
  const share = esc(ctx.url ? ctx.url('/p-doom.html') : 'https://siren.watch/p-doom.html');
  const medianAll = (() => { const m = rows.map(mid).sort((a, b) => a - b); return m[Math.floor(m.length / 2)]; })();
  const start = 15;
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i * 30) * Math.PI / 180; return `<line x1="${(60 + 46 * Math.sin(a)).toFixed(1)}" y1="${(60 - 46 * Math.cos(a)).toFixed(1)}" x2="${(60 + 52 * Math.sin(a)).toFixed(1)}" y2="${(60 - 52 * Math.cos(a)).toFixed(1)}" stroke="#475569" stroke-width="${i ? 1.5 : 3}"/>`; }).join('');
  return `${VOICES_CSS}<section class="vx" id="voices" aria-labelledby="vx-h">
  <blockquote class="vx-q">“At some stage therefore we should have to expect the machines to take control.”<cite>ALAN TURING, 1951 · “INTELLIGENT MACHINERY, A HERETICAL THEORY”</cite></blockquote>
  <h2 id="vx-h">The voices: ${VOICES.length} named estimates, one ladder</h2>
  <p class="sub">Each bar is one person’s publicly stated p(doom), with where they said it. A range means they gave a range. The dashed line is the survey median (${SURVEY.median}% of ${SURVEY.n.toLocaleString('en-US')} researchers); the middle voice here says ${medianAll}%. Figures as compiled ${esc(VOICES_AS_OF)}; people revise them.</p>
  <div class="vx-chips" role="group" aria-label="Filter voices">${chips}</div>
  <div class="vx-lad" id="vx-lad">
    <div class="vx-axis"><div></div><div><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div></div>
    <div style="position:relative">${ladder}
      <div class="vx-ov"><div class="vx-sv" style="left:${SURVEY.median}%"><span>SURVEY ${SURVEY.median}%</span></div><div class="vx-you" id="vx-you" style="left:${start}%"><span>YOU ${start}%</span></div></div>
    </div>
  </div>
  <div class="vx-me">
    <svg viewBox="0 0 120 120" role="img" aria-label="Your p(doom) as a clock: 100% is midnight"><circle cx="60" cy="60" r="56" fill="#05070B" stroke="#33465F" stroke-width="2"/>${ticks}<text x="60" y="24" text-anchor="middle" fill="#F87171" font-family="IBM Plex Mono,monospace" font-size="9" font-weight="700">12</text><line class="vx-hand" id="vx-hand" x1="60" y1="60" x2="60" y2="14" stroke="#F87171" stroke-width="3" stroke-linecap="round" style="transform:rotate(${(start * 3.6).toFixed(1)}deg)"/><line class="vx-hand" id="vx-hr" x1="60" y1="60" x2="60" y2="30" stroke="#E6EAF0" stroke-width="3" stroke-linecap="round" style="transform:rotate(${(-30 + start * 0.3).toFixed(1)}deg)"/><circle cx="60" cy="60" r="4" fill="#F87171"/></svg>
    <div>
      <label for="vx-in" style="font:700 12px var(--mono);letter-spacing:.12em;color:#FCA5A5">SET YOUR OWN p(doom)</label>
      <div class="big"><output id="vx-out" for="vx-in">${start}%</output></div>
      <input id="vx-in" type="range" min="0" max="100" step="0.5" value="${start}" aria-describedby="vx-say">
      <div class="vx-pre" aria-label="Jump to"><button type="button" data-p="${SURVEY.median}">Survey median ${SURVEY.median}%</button><button type="button" data-p="15">Hinton’s 10–20%</button><button type="button" data-p="${medianAll}">Middle voice ${medianAll}%</button><button type="button" data-p="0.01">LeCun</button><button type="button" data-p="95">Yudkowsky</button></div>
      <p id="vx-say">Drag to place yourself among the voices.</p>
      <p style="font-size:12.5px">On this dial 100% is midnight, so <b id="vx-min">${(60 * (1 - start / 100)).toFixed(0)}</b> minutes to go. That clock is your opinion. SIREN’s own reading, level ${esc(sirenLevel ?? '?')} right now, isn’t an opinion: it counts what’s happening in AI every hour, with receipts.</p>
      <div class="vx-sh"><button type="button" id="vx-x" data-xpost="page" data-x-title="My p(doom) is ${start}%. Where do you sit among Hinton, Amodei, LeCun and Yudkowsky?" data-x-src="SIREN" data-x-url="${share}#voices" style="appearance:none;border:1px solid #F87171;background:#1A0A0A;color:#FCA5A5;padding:10px 14px;font:700 13px var(--mono);cursor:pointer">𝕏 Post my p(doom)</button><a id="vx-li" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent((ctx.url ? ctx.url('/p-doom.html') : 'https://siren.watch/p-doom.html'))}" target="_blank" rel="noopener">in Share on LinkedIn</a><button type="button" id="vx-cp">Copy link</button></div>
    </div>
  </div>
  <div class="vx-news"><h3>IN THE NEWS: AI CATASTROPHE, SAFETY, p(doom)</h3><ul id="vx-news">${doomNews(ctx.news && ctx.news.items).map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><small>${esc(x.source || '')} · ${esc(ago(x.published_at))}</small></li>`).join('') || '<li>No catastrophe-risk headlines in the last few days. <a href="news.html">All AI news →</a></li>'}</ul>
    <p style="font-size:12.5px;margin:6px 0 0">Refreshes live from SIREN’s newsroom. <a href="news.html">All AI news →</a> · <a href="live.html">Watch: AI on TV &amp; radio, live →</a> · <a href="day-after.html">Game out the day after →</a></p></div>
  <div class="vx-news"><h3>POLLS &amp; SURVEYS</h3><ul>${POLLS.map((p) => `<li><b>${esc(p[0])}: ${esc(p[1])}</b>. ${esc(p[2])}. <a href="${esc(p[4])}" target="_blank" rel="noopener">${esc(p[3])}</a></li>`).join('')}</ul></div>
  <div class="vx-news"><h3>FURTHER READING, EVERY SIDE</h3><ul>${READING.map((r) => `<li><a href="${esc(r[3])}" target="_blank" rel="noopener">${esc(r[1])}</a><small>${esc(r[0])} · ${esc(r[2])}</small></li>`).join('')}<li><a href="library.html">SIREN’s library: books from every side →</a></li></ul></div>
  <details style="margin-top:12px"><summary class="vx-src" style="cursor:pointer">Where each figure comes from</summary><ul class="vx-src">${rows.map((v) => `<li><b>${esc(v[0])}</b>: ${v[1] === v[2] ? `${v[1]}%` : `${v[1]}–${v[2]}%`} · ${esc(v[5])}</li>`).join('')}<li><b>Survey</b>: ${esc(SURVEY.label)}.</li><li>Compiled from Wikipedia’s <a href="https://en.wikipedia.org/wiki/P(doom)" target="_blank" rel="noopener">P(doom)</a> article, which cites each original. Hinton has also said his own gut figure is over 50%; we plot the 10–20% he gives “all things considered”.</li></ul></details>
<script>(function(){var s=document.getElementById('vx-in');if(!s)return;var o=document.getElementById('vx-out'),y=document.getElementById('vx-you'),h=document.getElementById('vx-hand'),hr=document.getElementById('vx-hr'),m=document.getElementById('vx-min'),say=document.getElementById('vx-say'),x=document.getElementById('vx-x');
var rows=[].slice.call(document.querySelectorAll('#vx-lad .vx-r'));
function upd(){var p=+s.value;o.textContent=p+'%';y.style.left=p+'%';y.firstChild.textContent='YOU '+p+'%';h.style.transform='rotate('+(p*3.6).toFixed(1)+'deg)';hr.style.transform='rotate('+(-30+p*0.3).toFixed(1)+'deg)';m.textContent=(60*(1-p/100)).toFixed(0);
var below=0,near=null,nd=1e9;rows.forEach(function(r){var lo=+r.dataset.lo,hi=+r.dataset.hi,md=(lo+hi)/2;if(md<p)below++;var d=Math.abs(p-md)+(hi-lo)/4;if(d<nd){nd=d;near=r;}});
var nm=near?near.querySelector('.n').firstChild.textContent:'';
say.textContent='More worried than '+below+' of '+rows.length+' voices. Closest to '+nm+'.';
x.setAttribute('data-x-title','My p(doom) is '+p+'%: more worried than '+below+' of '+rows.length+' AI voices, closest to '+nm+'. Where do you sit?');}
s.addEventListener('input',upd);upd();
[].forEach.call(document.querySelectorAll('.vx-pre button'),function(b){b.addEventListener('click',function(){s.value=b.dataset.p;upd();});});
var cp=document.getElementById('vx-cp');if(cp)cp.addEventListener('click',function(){var u=location.href.split('#')[0]+'#voices';(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){cp.textContent='Copied ✓';},function(){cp.textContent=u;});});
var RE=/p\(doom\)|doom|extinct|existential|catastroph|superintelligen|x-risk|ai safety|wargam|day after/i,ul=document.getElementById('vx-news');
function ago(t){var m=Math.max(0,Math.round((Date.now()-Date.parse(t))/6e4));return m<60?m+' min ago':m<2880?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago';}
function esc(t){return String(t||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function news(){fetch('api/news.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){var it=(d.items||[]).filter(function(x){return x&&x.url&&/^https?:/.test(x.url)&&RE.test(x.title+' '+(x.summary||''));}).slice(0,6);if(it.length&&ul)ul.innerHTML=it.map(function(x){return '<li><a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a><small>'+esc(x.source)+' · '+ago(x.published_at)+'</small></li>';}).join('');}).catch(function(){});}
news();setInterval(news,120000);
[].forEach.call(document.querySelectorAll('.vx-chips button'),function(b){b.addEventListener('click',function(){var g=b.dataset.g;[].forEach.call(document.querySelectorAll('.vx-chips button'),function(c){c.setAttribute('aria-pressed',c===b?'true':'false');});rows.forEach(function(r){r.hidden=!(g==='all'||r.dataset.g===g);});});});})();</script>
</section>`;
}

/** FAQ entries for search: "What is X's p(doom)?" for the most-searched names. */
export function voicesFaq() {
  const pick = ['Geoffrey Hinton', 'Dario Amodei', 'Elon Musk', 'Yann LeCun', 'Eliezer Yudkowsky', 'Yoshua Bengio', 'Roman Yampolskiy', 'Max Tegmark', 'Lina Khan', 'Vitalik Buterin'];
  const out = VOICES.filter((v) => pick.includes(v[0])).map((v) => ({ '@type': 'Question', name: `What is ${v[0]}’s p(doom)?`,
    acceptedAnswer: { '@type': 'Answer', text: `${v[0]} (${v[4]}) has put it at ${v[1] === v[2] ? `${v[1]}%` : `${v[1]}–${v[2]}%`} (${v[5]}). People revise these figures; SIREN plots it beside ${VOICES.length - 1} other named estimates.` } }));
  out.push({ '@type': 'Question', name: 'What do AI researchers think the chance of AI doom is?', acceptedAnswer: { '@type': 'Answer', text: 'In the largest survey, 2,778 AI researchers gave a median of 5% (mean 9%) for an outcome as bad as human extinction (Grace et al., 2024). Named public figures range from under 0.01% (Yann LeCun) to over 95% (Eliezer Yudkowsky).' } });
  return out;
}
