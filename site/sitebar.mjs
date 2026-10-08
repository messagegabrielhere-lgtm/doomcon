// The refresh bar and the financial disclosure, on every page.
//
// A last pass over the built HTML: whatever wrote a page (a template, a
// standalone page in site/static, a module on its own track), it gets the same
// small "Updated <date> · Refresh" control and the same disclosure, so neither
// depends on every template remembering to include them.
//
// The date is when the page's data was generated. A page that loads live data
// in the browser (the arena, the scanner) updates it by dispatching
//   window.dispatchEvent(new CustomEvent('site:data', { detail: { at } }))
// and can take over the button by defining window.siteRefresh = async () => {}.
// Otherwise Refresh reloads the page past any cached copy.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CANONICAL_URL } from './brand.mjs';
import { on as mzOn, sponsorLine, adSlot, AD_PAGES, MZ_CSS, MONETIZE } from './monetize.mjs';
const BASE = new URL(CANONICAL_URL).pathname.replace(/\/$/, '');

const MARK = 'data-sitebar';
// Pages meant to be embedded in other sites keep their own chrome.
const SKIP = new Set(['embed.html']);

export const DISCLOSURE = 'Not financial advice. We are not financial advisors, brokers, or a registered investment adviser, and nothing on this site is investment, financial, legal, tax or trading advice, or a recommendation to buy, sell or hold any stock, crypto asset or other instrument. Stock picks, signals, scores and AI trades shown here are automated, simulated or hypothetical, for information and entertainment only. Past and simulated performance does not predict future results, and trading can lose money, including more than you expect. Do your own research and talk to a licensed financial professional before you invest.';

export function sitebar(asOf, { level = 4, rel = '', newsAt = null } = {}) {
  const at = Number.isFinite(Date.parse(asOf)) ? Date.parse(asOf) : Date.now();
  const news = Number.isFinite(Date.parse(newsAt)) ? Date.parse(newsAt) : 0;
  return `
<div id="sitebar" ${MARK} data-at="${at}" data-news="${news}" role="region" aria-label="Page freshness">
<style>
#sitebar{position:fixed;right:12px;bottom:12px;z-index:9999;display:flex;align-items:center;gap:8px;padding:5px 6px 5px 12px;border-radius:999px;background:rgba(255,255,255,.94);color:#1b2230;border:1px solid rgba(0,0,0,.14);box-shadow:0 4px 18px rgba(0,0,0,.14);font:500 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;backdrop-filter:blur(6px)}
#sitebar button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:#1b2230;color:#fff;font:600 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif}
#sitebar button.due{background:#b45309;color:#fff}
#sitebar button:focus-visible{outline:2px solid #e2a03b;outline-offset:2px}
#sitebar button[aria-busy=true] svg{animation:sitebar-spin .8s linear infinite}
#sitebar time{white-space:nowrap}
#sitebar .fb{all:unset;cursor:pointer;color:inherit;opacity:.8;text-decoration:underline;text-underline-offset:2px;white-space:nowrap;font:600 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif}#sitebar .fb:hover{opacity:1}#sitebar .fb:focus-visible{outline:2px solid #e2a03b;outline-offset:2px}
#sitebar .ago{opacity:.65}
#sitebar button.rad{background:transparent;color:inherit;border:1px solid currentColor;padding:4px 9px;opacity:.85}#sitebar button.rad[aria-pressed=true]{background:#818CF8;border-color:#818CF8;color:#000;opacity:1}
#siren-intro{position:fixed;left:12px;bottom:12px;z-index:9998;width:300px;border-radius:8px;overflow:hidden;background:#000;border:1px solid #232C3B;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#siren-intro video{display:block;width:100%;height:auto}
#siren-intro .bar{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;font:600 11px/1 system-ui,sans-serif;color:#AEB7C3;letter-spacing:.06em}
#siren-intro button{all:unset;cursor:pointer;padding:4px 8px;border-radius:4px;color:#E6EAF0}#siren-intro button:hover{background:#1b2230}
@media (max-width:560px){#siren-intro{width:200px;left:auto;right:10px;bottom:auto;top:10px}}
@keyframes sitebar-spin{to{transform:rotate(360deg)}}
@media (prefers-color-scheme:dark){#sitebar{background:rgba(20,24,32,.94);color:#e6e9ef;border-color:rgba(255,255,255,.16)}#sitebar button{background:#e6e9ef;color:#141820}}
@media (max-width:560px){#sitebar{left:50%;right:auto;transform:translateX(-50%);bottom:10px}#sitebar .ago{display:none}}
@media (max-width:440px){#sitebar{gap:6px;padding:4px 4px 4px 10px;max-width:calc(100vw - 16px)}#sitebar>span:first-of-type{display:none}#sitebar button{padding:5px 8px}}
@media print{#sitebar{display:none}}
.site-disclosure{max-width:72ch;margin:28px auto 72px;padding:12px 16px;font:400 12px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;opacity:.8;border-top:1px solid rgba(127,127,127,.3)}
.site-disclosure b{font-weight:600}
</style>
<span>Updated <time id="sitebar-at"></time> <span class="ago" id="sitebar-ago"></span></span>
<a class="fb" id="sitebar-fb" href="${CANONICAL_URL}/feedback.html" title="Report a problem or send feedback">Feedback</a>
<a class="fb" id="sitebar-x" href="https://x.com/intent/post?via=SIRENutf6" target="_blank" rel="noopener" title="Post this page on X">𝕏 Post</a>
<button type="button" class="rad" data-siren-radio data-level="${level}" aria-pressed="false" title="Turn SIREN Radio on">♪ OFF</button>
<button type="button" id="sitebar-btn" aria-label="Refresh this page's data"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg><span id="sitebar-lbl">Refresh</span></button>
<script>
(function(){
  var bar = document.getElementById("sitebar"), at = +bar.dataset.at;
  var tEl = document.getElementById("sitebar-at"), agoEl = document.getElementById("sitebar-ago"), btn = document.getElementById("sitebar-btn");
  function ago(ms){ var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "(just now)" : m < 60 ? "(" + m + " min ago)" : m < 2880 ? "(" + Math.round(m / 60) + " h ago)" : "(" + Math.round(m / 1440) + " days ago)"; }
  function paint(){
    var d = new Date(at);
    tEl.dateTime = d.toISOString();
    tEl.textContent = d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    tEl.title = d.toString();
    agoEl.textContent = ago(at);
  }
  var fb = document.getElementById("sitebar-fb"); if (fb) fb.href += "?page=" + encodeURIComponent(location.href.split("#")[0]);
  // Post this page on X: its own title and canonical address.
  var xl = document.getElementById("sitebar-x");
  if (xl) {
    var can = document.querySelector('link[rel=canonical]'), u = (can && can.href) || location.href.split("#")[0];
    var t = (document.querySelector('meta[property="og:title"]') || {}).content || document.title;
    xl.href = "https://x.com/intent/post?text=" + encodeURIComponent(t) + "&url=" + encodeURIComponent(u) + "&via=SIRENutf6";
  }
  // THE INTRO. Once per visit, on the first page opened (never on the clips
  // page, which plays its own videos): the 42-second explainer, silent, in a
  // corner, with sound one tap away. Skipped for reduced-motion visitors.
  (function intro(){
    try {
      if (/elon\.html$/.test(location.pathname) || sessionStorage.getItem("siren:intro")) return;
      sessionStorage.setItem("siren:intro", "1");
    } catch (e) { return; }
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var m = "${BASE}/media/siren-explainer";
    var box = document.createElement("div"); box.id = "siren-intro"; box.setAttribute("role", "complementary"); box.setAttribute("aria-label", "Intro video");
    box.innerHTML = '<video muted autoplay playsinline preload="metadata" poster="' + m + '-poster.jpg"><source src="' + m + '.webm" type="video/webm"><source src="' + m + '.mp4" type="video/mp4"></video>'
      + '<div class="bar"><span>WHAT IS SIREN?</span><span><button type="button" data-a="snd" aria-label="Turn sound on">🔊 Sound</button><button type="button" data-a="x" aria-label="Close intro">✕</button></span></div>';
    document.body.appendChild(box);
    var v = box.querySelector("video");
    var close = function(){ try { v.pause(); } catch (e) {} box.remove(); };
    box.addEventListener("click", function(e){
      var a = e.target.getAttribute && e.target.getAttribute("data-a");
      if (a === "x") close();
      else if (a === "snd") { v.muted = !v.muted; e.target.textContent = v.muted ? "🔊 Sound" : "🔇 Mute"; if (v.paused) v.play(); }
    });
    v.addEventListener("ended", function(){ setTimeout(close, 1500); });
    var p = v.play(); if (p && p.catch) p.catch(close);
  })();
  window.addEventListener("site:data", function(e){ var t = +(e.detail && e.detail.at); if (t > 0) { at = t; paint(); } });
  btn.addEventListener("click", function(){
    if (typeof window.siteRefresh === "function") {
      btn.setAttribute("aria-busy", "true");
      Promise.resolve().then(window.siteRefresh).catch(function(){}).then(function(){ btn.removeAttribute("aria-busy"); });
    } else {
      var u = new URL(location.href); u.searchParams.set("r", Date.now().toString(36)); location.replace(u.toString());
    }
  });
  // Sit above any bar the page pins to the bottom (a mobile tab bar, a cookie note).
  function lift(){
    var off = 12, seen = [];
    [0.5, 0.1, 0.9].forEach(function(f){
      document.elementsFromPoint(innerWidth * f, innerHeight - 3).forEach(function(el){
        for (var n = el; n && n !== document.body; n = n.parentElement) {
          if (n === bar || seen.indexOf(n) >= 0) break;
          var ps = getComputedStyle(n).position;
          if (ps === "fixed" || ps === "sticky") { seen.push(n); var r = n.getBoundingClientRect(); if (r.bottom >= innerHeight - 4 && r.height < innerHeight / 2) off = Math.max(off, innerHeight - r.top + 8); break; }
        }
      });
    });
    bar.style.bottom = off + "px";
  }
  // A page left open should hear about a newer newsroom or a newer reading
  // within a minute. Same-origin JSON only. The button label changes; the
  // page does not reload until the reader asks, because a reload mid-paragraph
  // is worse than a minute of staleness.
  var newsAt = +bar.dataset.news || 0;
  var api = "${BASE}";
  function flag(label){
    var lbl = document.getElementById("sitebar-lbl");
    if (!lbl || btn.classList.contains("due")) return;
    lbl.textContent = label;
    btn.classList.add("due");
    btn.setAttribute("aria-label", label + ". Refresh this page.");
  }
  function watch(){
    if (document.hidden || !window.fetch || btn.classList.contains("due")) return;
    fetch(api + "/api/fresh.json?m=" + Math.floor(Date.now() / 60000), { cache: "no-store" }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if (!j) return;
      var ns = j.news && Date.parse(j.news);
      var st = j.state && Date.parse(j.state);
      if (newsAt > 0 && ns && ns > newsAt + 1500) flag("New stories");
      else if (st && st > at + 1500) flag("New reading");
    }).catch(function(){});
  }
  setInterval(watch, 60000);
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) watch(); });
  paint(); setInterval(paint, 60000);
  lift(); addEventListener("resize", lift); addEventListener("load", lift); setTimeout(lift, 1500);
})();
</script>
</div>`;
}

export const disclosureHtml = () => `\n<aside class="site-disclosure" ${MARK} role="note"><b>Disclosure:</b> ${DISCLOSURE}</aside>`;

// Add the bar and, unless the page carries its own, the disclosure.
export function stamp(html, asOf, rel = '') {
  if (html.includes(MARK) || !/<\/body>/i.test(html)) return html;
  const own = html.includes('class="legal-note"');
  // Monetisation, all off until site/monetize.mjs has an ID: one async ad on
  // long reading pages, and the sponsor's line on every page.
  const ad = AD_PAGES.has(rel) ? adSlot() : '';
  const sp = mzOn.sponsor() ? `\n<p class="site-sponsor" ${MARK} style="max-width:72ch;margin:0 auto;padding:0 16px;text-align:center">${sponsorLine(`${CANONICAL_URL}/sponsor.html`, { house: false })}</p>` : '';
  const css = ad || sp ? MZ_CSS : '';
  const gc = MONETIZE.analytics && MONETIZE.analytics.goatcounter;
  const analytics = gc ? `\n<script data-goatcounter="https://${gc}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>` : '';
  const radio = `\n<script src="${BASE}/media/radio.js" defer></script>\n<script src="${BASE}/media/guide.js" defer></script>`;
  return html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${css}${ad}${sp}${own ? '' : disclosureHtml()}${sitebar(asOf, stampOpts)}${radio}${analytics}\n</body>`);
}
let stampOpts = {};

export async function stampAll(outDir, asOf, opts = {}) {
  stampOpts = opts;
  let n = 0;
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.html') && !SKIP.has(path.relative(outDir, p))) {
        const html = await readFile(p, 'utf8');
        const out = stamp(html, asOf, path.relative(outDir, p).split(path.sep).join('/'));
        if (out !== html) { await writeFile(p, out); n++; }
      }
    }
  }
  await walk(outDir);
  return n;
}
