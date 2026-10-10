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
.vx-src{font-size:12.5px;color:var(--ink-dim)}.vx-src li{margin:2px 0}
</style>`;

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
      <p id="vx-say">Drag to place yourself among the voices.</p>
      <p style="font-size:12.5px">On this dial 100% is midnight, so <b id="vx-min">${(60 * (1 - start / 100)).toFixed(0)}</b> minutes to go. That clock is your opinion. SIREN’s own reading, level ${esc(sirenLevel ?? '?')} right now, isn’t an opinion: it counts what’s happening in AI every hour, with receipts.</p>
      <button type="button" id="vx-x" data-xpost="page" data-x-title="My p(doom) is ${start}%. Where do you sit among Hinton, Amodei, LeCun and Yudkowsky?" data-x-src="SIREN" data-x-url="${share}#voices" style="appearance:none;border:1px solid #F87171;background:#1A0A0A;color:#FCA5A5;padding:10px 14px;font:700 13px var(--mono);cursor:pointer">𝕏 Post my p(doom)</button>
    </div>
  </div>
  <details style="margin-top:12px"><summary class="vx-src" style="cursor:pointer">Where each figure comes from</summary><ul class="vx-src">${rows.map((v) => `<li><b>${esc(v[0])}</b>: ${v[1] === v[2] ? `${v[1]}%` : `${v[1]}–${v[2]}%`} · ${esc(v[5])}</li>`).join('')}<li><b>Survey</b>: ${esc(SURVEY.label)}.</li><li>Compiled from Wikipedia’s <a href="https://en.wikipedia.org/wiki/P(doom)" target="_blank" rel="noopener">P(doom)</a> article, which cites each original. Hinton has also said his own gut figure is over 50%; we plot the 10–20% he gives “all things considered”.</li></ul></details>
<script>(function(){var s=document.getElementById('vx-in');if(!s)return;var o=document.getElementById('vx-out'),y=document.getElementById('vx-you'),h=document.getElementById('vx-hand'),hr=document.getElementById('vx-hr'),m=document.getElementById('vx-min'),say=document.getElementById('vx-say'),x=document.getElementById('vx-x');
var rows=[].slice.call(document.querySelectorAll('#vx-lad .vx-r'));
function upd(){var p=+s.value;o.textContent=p+'%';y.style.left=p+'%';y.firstChild.textContent='YOU '+p+'%';h.style.transform='rotate('+(p*3.6).toFixed(1)+'deg)';hr.style.transform='rotate('+(-30+p*0.3).toFixed(1)+'deg)';m.textContent=(60*(1-p/100)).toFixed(0);
var below=0,near=null,nd=1e9;rows.forEach(function(r){var lo=+r.dataset.lo,hi=+r.dataset.hi,md=(lo+hi)/2;if(md<p)below++;var d=Math.abs(p-md)+(hi-lo)/4;if(d<nd){nd=d;near=r;}});
var nm=near?near.querySelector('.n').firstChild.textContent:'';
say.textContent='More worried than '+below+' of '+rows.length+' voices. Closest to '+nm+'.';
x.setAttribute('data-x-title','My p(doom) is '+p+'%: more worried than '+below+' of '+rows.length+' AI voices, closest to '+nm+'. Where do you sit?');}
s.addEventListener('input',upd);upd();
[].forEach.call(document.querySelectorAll('.vx-chips button'),function(b){b.addEventListener('click',function(){var g=b.dataset.g;[].forEach.call(document.querySelectorAll('.vx-chips button'),function(c){c.setAttribute('aria-pressed',c===b?'true':'false');});rows.forEach(function(r){r.hidden=!(g==='all'||r.dataset.g===g);});});});})();</script>
</section>`;
}
