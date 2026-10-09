// X COMPOSER. Every "Post to X" on the site goes through one function that
// writes a fresh post each click: a different framing, the live SIREN score,
// the minute it was written, and a rotating tag. The last 30 posts a visitor
// drafted are remembered in this browser only, so a second click never hands
// back the same words.
//
// Markup that opts in:
//   <a href="https://x.com/intent/post?text=…&url=…">  any existing intent link
//   <button data-xpost="news|alert|reading|page" data-x-title="…"
//           data-x-src="…" data-x-url="…">          a share button
//
// The source of truth is XCOMPOSE_JS (a browser script, ES5, no backticks);
// composeX() runs the same code in node for the tests.

export const XCOMPOSE_JS = String.raw`(function(){
if (window.sirenX) return;
var HOOKS = {
  news: [
    "Just crossed the AI wire: {t} ({s}).",
    "{t}. Via {s}. SIREN logged it at {time}.",
    "The AI story of the moment: {t} ({s}).",
    "On SIREN's newsroom right now: {t}.",
    "Worth a look before your next meeting: {t} ({s}).",
    "Machines in the news, {time}: {t}.",
    "{s} reports: {t}. SIREN is at {L}, {S}/100.",
    "Counted, not hyped: {t} ({s}).",
    "Today in AI: {t}. Score check: SIREN {L}.",
    "Filed under 'the robots are busy': {t}."
  ],
  alert: [
    "Alert on the SIREN board, {time}: {t}.",
    "{t}. Public feed, not a warning system. Logged {time}.",
    "Dispatch flagged it: {t} ({s}).",
    "Live alert: {t}. Stay safe out there.",
    "Heads up: {t}. Source: {s}.",
    "SIREN Dispatch, {time}: {t}. Check your local officials for guidance."
  ],
  reading: [
    "SIREN reads {L} today, {S} out of 100. How loud is AI right now?",
    "AI loudness check, {time}: SIREN {L}, score {S}/100.",
    "The canary says SIREN {L} ({S}/100). Counted from public data, every hour.",
    "Skynet status: still a count, not a forecast. SIREN {L}, {S}/100 at {time}.",
    "Where the AI dial sits right now: level {L}, {S} of 100."
  ],
  page: [
    "{t}",
    "{t} · SIREN {L}, {S}/100",
    "Found this on SIREN: {t}",
    "{t} (via the AI SIREN Index, {time})",
    "Bookmarking this: {t}",
    "{t}. SIREN is at {L} right now."
  ]
};
var TAGS = ["", "", "#AI", "#AGI", "#AISafety", "#AInews", "#SIREN", "#ArtificialIntelligence"];
var ALERT_TAGS = ["", "", "#SIREN", "#Dispatch", "#StaySafe"];
var KEY = "siren:x-recent", LAST = {};
function recent(){ try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
function remember(t){ try { var l = recent(); l.unshift(hash(t)); localStorage.setItem(KEY, JSON.stringify(l.slice(0, 30))); } catch (e) {} }
function hash(s){ var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }
function live(){
  var lv = "", sc = "";
  var chip = typeof document !== "undefined" && document.querySelector && document.querySelector(".sh__lv");
  var txt = chip ? (chip.textContent || "") : "";
  var a = /SIREN\s*(\d)/i.exec(txt), b = /([\d]+\.\d)\s*$/.exec(txt.trim());
  if (a) lv = a[1]; if (b) sc = b[1];
  return { L: lv, S: sc };
}
function clip(s, n){ s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }
var ACR = { bbc: "BBC", ap: "AP", cnn: "CNN", nyt: "NYT", wsj: "WSJ", ft: "FT", npr: "NPR", mit: "MIT", hn: "Hacker News", nhc: "NHC", nws: "NWS", usgs: "USGS", gdacs: "GDACS", eonet: "NASA EONET", sec: "SEC", ai: "AI" };
function prettySrc(s){
  s = String(s || "").replace(/\s*\(.*\)\s*$/, "").trim();
  if (!/^[a-z0-9-]+$/i.test(s) || /[A-Z]/.test(s.slice(1))) return ACR[s.toLowerCase()] || s;
  return s.toLowerCase().split("-").map(function(w){ return ACR[w] || (w.charAt(0).toUpperCase() + w.slice(1)); }).join(" ");
}
function fill(tpl, v){ return tpl.replace(/\{(\w+)\}/g, function(_, k){ return v[k] == null ? "" : String(v[k]); }); }
// o: { kind, title, src, now (ms), rand (fn), level, score, used (array of hashes) }
function compose(o){
  o = o || {};
  var kind = HOOKS[o.kind] ? o.kind : "page";
  var lvl = o.level || live();
  var rnd = o.rand || Math.random;
  var d = new Date(o.now || Date.now());
  var time = ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2) + " UTC";
  var used = o.used || recent();
  // No live number on this page: only use wordings that do not need one.
  var pool = HOOKS[kind].filter(function(t){ return (lvl.L && lvl.S) || !/\{[LS]\}/.test(t); });
  if (!pool.length) pool = kind === "reading" ? ["How loud is AI right now? The SIREN index counts it every hour."] : HOOKS.page.slice(0, 1);
  var srcName = prettySrc(o.src), best = "";
  // A URL costs 23 of X's 280; keep the text under 250 so it always fits.
  for (var tries = 0; tries < 40; tries++) {
    var tpl = pool[Math.floor(rnd() * pool.length)];
    if (pool.length > 1 && tpl === LAST[kind] && tries < 30) continue;
    var tags = kind === "alert" ? ALERT_TAGS : TAGS;
    var tag = tags[Math.floor(rnd() * tags.length)];
    var room = 250 - fill(tpl, { t: "", s: srcName, time: time, L: lvl.L, S: lvl.S }).length - (tag ? tag.length + 1 : 0);
    var t = clip(o.title || "", Math.max(40, room));
    var txt = fill(tpl, { t: t, s: srcName || "the wire", time: time, L: lvl.L, S: lvl.S }).replace(/\s+([.,])/g, "$1").replace(/\.\./g, ".");
    if (tag && txt.indexOf(tag) < 0) txt += " " + tag;
    txt = clip(txt, 250);
    best = txt;
    if (used.indexOf(hash(txt)) < 0) { LAST[kind] = tpl; break; }
  }
  return best;
}
function intent(text, url){
  return "https://x.com/intent/post?text=" + encodeURIComponent(text) + (url ? "&url=" + encodeURIComponent(url) : "") + "&via=SIRENutf6";
}
window.sirenX = { compose: compose, intent: intent, hooks: HOOKS };
if (typeof document === "undefined" || !document.addEventListener) return;
document.addEventListener("click", function(e){
  var el = e.target && e.target.closest ? e.target.closest('[data-xpost],a[href^="https://x.com/intent/post"],a[href^="https://twitter.com/intent/tweet"]') : null;
  if (!el) return;
  var kind, title, src, url;
  if (el.hasAttribute("data-xpost")) {
    kind = el.getAttribute("data-xpost") || "page";
    title = el.getAttribute("data-x-title") || document.title;
    src = el.getAttribute("data-x-src") || "";
    url = el.getAttribute("data-x-url") || (document.querySelector('link[rel=canonical]') || {}).href || location.href.split("#")[0];
  } else {
    var u; try { u = new URL(el.href); } catch (err) { return; }
    kind = el.getAttribute("data-x-kind") || "page";
    title = u.searchParams.get("text") || document.title;
    url = u.searchParams.get("url") || "";
    src = "";
  }
  var text = compose({ kind: kind, title: title, src: src });
  remember(text);
  var href = intent(text, url);
  if (el.tagName === "A") { el.href = href; el.target = "_blank"; el.rel = "noopener"; return; }
  e.preventDefault();
  window.open(href, "_blank", "noopener");
}, true);
})();`;

/** Node-side: run the browser script in a sandbox and return its compose(). */
export function composeX(opts) {
  const sandbox = { window: {}, localStorage: { getItem: () => '[]', setItem: () => {} } };
  // eslint-disable-next-line no-new-func
  new Function('window', 'localStorage', 'document', XCOMPOSE_JS)(sandbox.window, sandbox.localStorage, undefined);
  return sandbox.window.sirenX.compose(opts);
}
