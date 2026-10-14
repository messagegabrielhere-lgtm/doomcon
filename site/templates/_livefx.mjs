// LIVE FX: the homepage's moving graphics, after a study of pizzint.watch
// (2026-10-09): a decrypt reveal on the headline reading, panels that rise in
// as they scroll into view, sparklines that draw themselves, a sticky live
// strip with a mini level meter once the reading scrolls away, an hourly
// news-tempo bar chart with a pulsing LIVE hour, and ping rings on live dots.
//
// The house motion rule still holds (docs/MOTION.md, site/templates/_motion.mjs):
// everything is readable in the static HTML before a line of this runs, no
// animation invents or freshens a value, and prefers-reduced-motion turns all
// of it off. If IntersectionObserver is missing or slow, a timer reveals every
// panel anyway, so nothing can stay hidden.

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Stories per hour over the 24 hours before `nowMs`, oldest first.
 * Each bucket: { h: hours ago (23..0), n, label }.
 */
export function hourlyTempo(items, nowMs) {
  const end = Math.floor(nowMs / 3600e3) * 3600e3 + 3600e3; // end of the current hour
  const b = Array.from({ length: 24 }, (_, i) => ({ start: end - (24 - i) * 3600e3, n: 0 }));
  for (const it of items || []) {
    const t = Date.parse(it.published_at);
    if (!Number.isFinite(t) || t >= end || t < end - 24 * 3600e3) continue;
    b[Math.floor((t - (end - 24 * 3600e3)) / 3600e3)].n++;
  }
  return b.map((x, i) => ({ h: 23 - i, n: x.n, label: new Date(x.start).toISOString().slice(11, 13) + ':00 UTC' }));
}

/** Server-rendered tempo card. The bars are real counts; JS only animates them in. */
export function tempoCard(items, nowMs, href = (p) => p) {
  const t = hourlyTempo(items, nowMs);
  const max = Math.max(1, ...t.map((x) => x.n));
  const total = t.reduce((a, x) => a + x.n, 0);
  const peak = t.reduce((a, x) => (x.n > a.n ? x : a), t[0]);
  const bars = t.map((x, i) => {
    const live = i === t.length - 1;
    return `<span class="lf-bar${live ? ' lf-live' : ''}" style="--h:${(x.n / max * 100).toFixed(1)}%;--i:${i}" title="${esc(x.label)}: ${x.n} ${x.n === 1 ? 'story' : 'stories'}${live ? ' (this hour, still filling)' : ''}"><i></i></span>`;
  }).join('');
  return `<a class="v2-card lf-tempo" href="${esc(href('/news.html'))}" data-sec="News tempo" aria-label="AI news tempo: ${total} stories in the last 24 hours, busiest hour ${esc(peak.label)} with ${peak.n}">
  <div class="lf-th"><b>AI NEWS TEMPO</b><span>LAST 24 H · ${total} STORIES · PEAK ${esc(peak.label.slice(0, 5))} UTC</span></div>
  <div class="lf-bars" aria-hidden="true">${bars}</div>
  <div class="lf-ax" aria-hidden="true"><span>−24h</span><span>−12h</span><span class="lf-now"><i></i>LIVE</span></div>
</a>`;
}

export const LIVEFX_CSS = `<style data-livefx>
/* Tempo chart */
.lf-tempo{display:block;text-decoration:none;color:inherit;margin:12px 0 0;padding:14px 16px}
.lf-th{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;font:700 12px/1.2 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.1em;color:#AEB7C3}
.lf-th b{color:#fff}
.lf-bars{display:flex;align-items:flex-end;gap:3px;height:76px;margin-top:10px}
.lf-bar{flex:1;height:100%;display:flex;align-items:flex-end}
.lf-bar i{display:block;width:100%;height:max(3px,var(--h));background:linear-gradient(#5B6CFF,#3B4BDB);border-radius:2px 2px 0 0;transform-origin:bottom}
.lf-bar.lf-live i{background:linear-gradient(#4ADE80,#16A34A)}
.lf-ax{display:flex;justify-content:space-between;margin-top:6px;font:600 10.5px/1 'IBM Plex Mono',ui-monospace,monospace;color:#6B7686;letter-spacing:.08em}
.lf-now{color:#4ADE80;display:inline-flex;align-items:center;gap:5px}
.lf-now i{width:7px;height:7px;border-radius:50%;background:#4ADE80;position:relative}
/* Sticky live strip */
.lf-strip{position:fixed;left:0;right:0;top:0;z-index:55;display:flex;align-items:center;gap:10px;padding:6px 12px;background:rgba(6,9,15,.94);border-bottom:1px solid #232C3B;backdrop-filter:blur(6px);font:600 12px/1.2 'IBM Plex Mono',ui-monospace,monospace;color:#E6EAF0;transform:translateY(-110%);transition:transform .28s ease}
.lf-strip.on{transform:none}
.lf-strip .tag{flex:none;display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #7F1D1D;background:#1C0B0D;color:#FCA5A5;letter-spacing:.12em}
.lf-strip .tag i{width:7px;height:7px;border-radius:50%;background:#F87171;position:relative}
.lf-strip .run{flex:1;min-width:0;overflow:hidden;white-space:nowrap;mask-image:linear-gradient(90deg,transparent,#000 4%,#000 92%,transparent)}
.lf-strip .run span{display:inline-block;padding-left:100%;animation:lfRun 28s linear infinite}
.lf-strip .run a{color:#E6EAF0;text-decoration:none}
.lf-strip .meter{flex:none;display:flex;gap:2px;align-items:center}
.lf-strip .meter s{display:block;width:9px;height:12px;background:#1F2937;text-decoration:none}
.lf-strip .meter s.on{background:var(--lv,#4ADE80);box-shadow:0 0 8px var(--lv,#4ADE80)}
.lf-strip .lv{flex:none;color:var(--lv,#4ADE80)}
.lf-strip button{flex:none;all:unset;cursor:pointer;color:#AEB7C3;padding:2px 6px}
@media (max-width:640px){.lf-strip .meter{display:none}}
/* Panel rise-in, only once JS has armed it */
html.lf-armed .v2-card:not(.lf-in),html.lf-armed .v2-rgroup:not(.lf-in){opacity:0;transform:translateY(12px)}
html.lf-armed .v2-card,html.lf-armed .v2-rgroup{transition:opacity .5s ease,transform .5s ease}
html.lf-armed .lf-tempo:not(.lf-in) .lf-bar i{transform:scaleY(0)}
html.lf-armed .lf-tempo .lf-bar i{transition:transform .6s cubic-bezier(.2,.8,.2,1) calc(var(--i) * 18ms)}
/* Sparkline draw */
html.lf-armed .lf-draw{stroke-dasharray:var(--len);stroke-dashoffset:var(--len)}
html.lf-armed .lf-in .lf-draw,html.lf-armed .lf-draw.lf-done{stroke-dashoffset:0;transition:stroke-dashoffset 1.4s ease}
/* Decrypt overlay on the headline reading */
.lf-dec{position:absolute;inset:0;pointer-events:none;overflow:hidden;font:700 14px/1.05 'IBM Plex Mono',ui-monospace,monospace;color:var(--lv,#4ADE80);letter-spacing:.12em;word-break:break-all;padding:6px 10px;background:rgba(0,0,0,.82);text-shadow:0 0 8px currentColor;animation:lfDec 1.1s steps(18) forwards}
@keyframes lfDec{0%,55%{opacity:1;clip-path:inset(0 0 0 0)}100%{opacity:0;clip-path:inset(0 0 0 100%)}}
/* Ping rings on live dots */
.lf-tempo .lf-now i::after,.lf-strip .tag i::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid currentColor;animation:lfPing 1.8s cubic-bezier(0,0,.2,1) infinite}
.lf-tempo .lf-now i::after{color:#4ADE80}.lf-strip .tag i::after{color:#F87171}
.lf-bar.lf-live i{animation:lfLive 1.6s ease-in-out infinite}
@keyframes lfPing{75%,100%{transform:scale(2.4);opacity:0}}
@keyframes lfLive{50%{filter:brightness(1.45)}}
@keyframes lfRun{to{transform:translateX(-100%)}}
@media (prefers-reduced-motion:reduce){.lf-strip,.lf-strip .run span,.lf-bar.lf-live i,.lf-tempo .lf-now i::after,.lf-strip .tag i::after{animation:none;transition:none}.lf-strip .run span{padding-left:0}.lf-dec{display:none}}
</style>`;

export const LIVEFX_JS = `(function(){
"use strict";
if (!document.querySelector || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
var root = document.documentElement;
root.classList.add("lf-armed");
var targets = [].slice.call(document.querySelectorAll(".v2 .v2-card, .v2 .v2-rgroup"));
// Sparklines: measure each path once so it can draw itself on view.
[].forEach.call(document.querySelectorAll(".v2 .v2-spark path, .v2 .v2-hchart path"), function(p){
  try { var L = Math.ceil(p.getTotalLength()); if (L > 0) { p.style.setProperty("--len", L); p.classList.add("lf-draw"); } } catch (e) {}
});
function reveal(el){ el.classList.add("lf-in"); [].forEach.call(el.querySelectorAll(".lf-draw"), function(p){ p.classList.add("lf-done"); }); }
if ("IntersectionObserver" in window) {
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
  targets.forEach(function(t, i){ t.style.transitionDelay = Math.min(i % 4, 3) * 60 + "ms"; io.observe(t); });
  // Anything still not revealed after a few seconds (a long page, a slow
  // device, a print) is shown regardless.
  setTimeout(function(){ targets.forEach(reveal); [].forEach.call(document.querySelectorAll(".lf-draw"), function(p){ p.classList.add("lf-done"); }); }, 6000);
} else { targets.forEach(reveal); }
// Decrypt the headline reading once per visit.
var sig = document.getElementById("signal");
try {
  if (sig && !sessionStorage.getItem("lf:dec")) {
    sessionStorage.setItem("lf:dec", "1");
    var d = document.createElement("div"); d.className = "lf-dec"; d.setAttribute("aria-hidden", "true");
    var G = "0123456789ABCDEF#%&@$/<>?!", s = "";
    for (var i = 0; i < 900; i++) s += G.charAt(Math.floor(Math.random() * G.length));
    d.textContent = s;
    if (getComputedStyle(sig).position === "static") sig.style.position = "relative";
    sig.appendChild(d);
    var n = 0, iv = setInterval(function(){ var a = d.textContent.split(""); for (var k = 0; k < 120; k++) a[Math.floor(Math.random() * a.length)] = G.charAt(Math.floor(Math.random() * G.length)); d.textContent = a.join(""); if (++n > 16) clearInterval(iv); }, 60);
    setTimeout(function(){ if (d.parentNode) d.parentNode.removeChild(d); }, 1300);
  }
} catch (e) {}
// Sticky live strip once the reading has scrolled away.
if (!sig) return;
var lv = +(sig.getAttribute("data-level") || 0) || (function(){ var c = document.querySelector(".sh__lv"); var m = c && /SIREN\\s*(\\d)/i.exec(c.textContent); return m ? +m[1] : 0; })();
var scoreM = (function(){ var c = document.querySelector(".sh__lv"); var m = c && /([\\d]+\\.\\d)\\s*$/.exec(c.textContent.trim()); return m ? m[1] : ""; })();
var col = getComputedStyle(sig).getPropertyValue("--lv") || "#4ADE80";
var heads = [].slice.call(document.querySelectorAll("#breaking a[href], .v2-ticker .run a, .v2-ticker .run span")).map(function(a){ return a.textContent.trim(); }).filter(function(t){ return t.length > 12; });
var bk = document.querySelector("#breaking a[href]");
var strip = document.createElement("div"); strip.className = "lf-strip"; strip.setAttribute("role", "region"); strip.setAttribute("aria-label", "Live strip");
strip.style.setProperty("--lv", col.trim());
var meter = ""; for (var m = 5; m >= 1; m--) meter += '<s class="' + (m >= lv && lv ? "on" : "") + '"></s>';
var first = heads.length ? heads.slice(0, 6).join("   ◆   ") : "Live AI news, alerts and the hourly SIREN score";
strip.innerHTML = '<span class="tag"><i></i>LIVE</span><div class="run"><span>' + (bk ? '<a href="' + bk.getAttribute("href") + '" target="_blank" rel="noopener"></a>' : "<b></b>") + '</span></div><span class="meter" aria-hidden="true">' + meter + '</span><span class="lv">SIREN ' + (lv || "?") + (scoreM ? " · " + scoreM : "") + '</span><button type="button" aria-label="Hide the live strip">✕</button>';
(strip.querySelector(".run a") || strip.querySelector(".run b")).textContent = first;
document.body.appendChild(strip);
var closed = false;
strip.querySelector("button").addEventListener("click", function(){ closed = true; strip.classList.remove("on"); });
function onScroll(){ if (closed) return; var r = sig.getBoundingClientRect(); strip.classList.toggle("on", r.bottom < 0); }
addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();`;
