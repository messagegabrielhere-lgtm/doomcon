// X COMPOSER. Every "Post to X" on the site goes through one function that
// writes a fresh post each click: a different hook, context line, closing
// question, emoji and (sometimes) one hashtag, shaped for X's ranking. The last 30 posts a visitor
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
// Written for how X ranks posts: the hook goes first (the line people see
// before "show more"), short lines with breaks, one hashtag at most (often
// none), and an open question last, because replies are the strongest signal
// the ranking uses. Hook x context x question x emoji x tag gives hundreds of
// combinations per kind, and the last 30 drafts are skipped.
var HOOKS = {
  news: [
    "{t}",
    "{t} ({s})",
    "Just in: {t}",
    "New from {s}: {t}",
    "This one matters: {t}",
    "The AI story everyone's about to be talking about: {t}",
    "Quietly huge: {t}",
    "{s} has it: {t}",
    "Today in AI: {t}"
  ],
  alert: [
    "{t}",
    "Happening now: {t}",
    "Live alert: {t}",
    "Heads up: {t}",
    "{t} ({s})"
  ],
  reading: [
    "The AI SIREN reads {L} right now: {S} out of 100.",
    "How loud is AI today? SIREN {L}, {S}/100.",
    "AI loudness check: level {L}, score {S}/100.",
    "SIREN is at {L} ({S}/100). Counted from public data, not vibes.",
    "Skynet meter, honest edition: SIREN {L}, {S}/100."
  ],
  page: [
    "{t}",
    "This is worth 30 seconds: {t}",
    "Found this and can't stop looking at it: {t}",
    "{t} 👇",
    "Okay, this is good: {t}"
  ]
};
var CONTEXT = {
  news: ["SIREN {L} · {S}/100 at {time}.", "Logged {time}.", "Source: {s}.", "", ""],
  alert: ["Source: {s} · {time}.", "Public feed, not a warning system. Follow local officials.", "Logged {time}.", ""],
  reading: ["Updated every hour, receipts included.", "Measured {time}.", ""],
  page: ["SIREN {L} · {S}/100 right now.", "", ""]
};
var ASK = {
  news: ["Overhyped or a big deal?", "Who wins from this?", "Good news or bad news for the rest of us?", "What's your read?", "Would you trust it?", "Does this change your timeline?", "Are we ready for this?", ""],
  alert: ["Anyone near this? Stay safe.", "Check on your people.", "Anyone seeing it where you are?", ""],
  reading: ["Does that feel right to you?", "Louder or quieter than you'd guess?", "What would push it to 1?", "Where would you set it?"],
  page: ["What's your take?", "Thoughts?", "Where do you land on this?", "Would you have guessed?", ""]
};
var EMOJI = { news: ["", "", "🤖 ", "🧠 ", "⚡ ", "📡 "], alert: ["🚨 ", "⚠️ ", ""], reading: ["📊 ", "🔔 ", ""], page: ["", "", "👀 ", "🤖 "] };
var TAGS = ["", "", "", "#AI", "#AI", "#AGI", "#AISafety"];
var ALERT_TAGS = ["", "", "", "#BreakingNews"];
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
  var pick = function(a){ return a[Math.floor(rnd() * a.length)]; };
  var d = new Date(o.now || Date.now());
  var time = ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2) + " UTC";
  var used = o.used || recent();
  var hasLv = !!(lvl.L && lvl.S);
  var ok = function(t){ return hasLv || !/\{[LS]\}/.test(t); };
  var pool = HOOKS[kind].filter(ok);
  if (!pool.length) pool = kind === "reading" ? ["How loud is AI right now? The SIREN index counts it every hour."] : ["{t}"];
  var srcName = prettySrc(o.src);
  var v = { s: srcName || "the wire", time: time, L: lvl.L, S: lvl.S };
  var best = "";
  // X counts a link as 23 characters; 250 of text plus the link always fits.
  for (var tries = 0; tries < 60; tries++) {
    var tpl = pick(pool);
    if (pool.length > 1 && tpl === LAST[kind] && tries < 40) continue;
    var ctx = pick(CONTEXT[kind].filter(ok).concat([""]));
    if (!srcName && /\{s\}/.test(ctx)) ctx = "";
    var ask = pick(ASK[kind]);
    var emo = pick(EMOJI[kind]);
    var tag = pick(kind === "alert" ? ALERT_TAGS : TAGS);
    var tail = [fill(ctx, v), ask].filter(Boolean);
    var tailTxt = tail.length ? "\n\n" + tail.join("\n\n") : "";
    if (tag) tailTxt += (tail.length ? " " : "\n\n") + tag;
    var room = 250 - emo.length - fill(tpl, Object.assign({ t: "" }, v)).length - tailTxt.length;
    var t = clip(o.title || "", Math.max(40, room));
    var head = emo + fill(tpl, Object.assign({ t: t }, v)).replace(/\s+([.,])/g, "$1").replace(/\.\./g, ".");
    var txt = head + tailTxt;
    if (txt.length > 250) txt = clip(head, 250 - tailTxt.length) + tailTxt;
    if (txt.length > 250) txt = clip(head, 250);
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
