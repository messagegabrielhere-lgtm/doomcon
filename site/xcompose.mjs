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
    "{s}: {t}",
    "Fresh off the AI wire: {t}",
    "Logged at {time}: {t}",
    "{t}\n\n({s})",
    "Big if true: {t}",
    "Read this one twice: {t}"
  ],
  alert: [
    "{t}",
    "Happening now: {t}",
    "Live alert: {t}",
    "Heads up: {t}",
    "{t} ({s})"
  ],
  reading: [
    "AI is {mood} today: SIREN {L}, {S} out of 100.",
    "How loud is AI right now? SIREN {L}, {S}/100. {Mood}.",
    "AI loudness check at {time}: {S}/100, SIREN {L}.",
    "SIREN {L}, {S}/100. Counted hourly from public data, not vibes.",
    "Skynet meter, honest edition: {S}/100, level {L}."
  ],
  page: [
    "{t}",
    "{t}\n\nAnswered with live public data:",
    "Worth 30 seconds: {t}",
    "{t} 👇"
  ]
};
// What the story is about picks the question, an optional hashtag and a few
// extra hooks, so a chip story asks about the grid and a jobs story asks
// about jobs. First match wins; order puts the most specific topics first.
var TOPICS = [
  { id: "midterms", re: /midterm|coded (pro|against|neutral) on ai|senate race|governor race|on the ballot/i,
    hooks: ["Where does this candidate stand on AI? {t}", "AI is on the ballot: {t}"],
    ask: ["Does their AI stance change your vote?", "Right call on the tag?", "Where should candidates stand on AI?"], tag: "#Midterms2026" },
  { id: "safety", re: /safety|misalign|rogue|escap|jailbreak|alignment|deceiv|\blied\b|sabotag|self-replicat|monitoring system|containment/i,
    hooks: ["The kind of AI story that keeps safety people up at night: {t}", "Read this before you hand an agent the keys: {t}"],
    ask: ["How worried should we be?", "Who should be checking these systems?", "Would you let this run unsupervised?"], tag: "#AISafety" },
  { id: "jobs", re: /\bjobs?\b|layoff|laid off|worker|hiring|employ|labou?r|unemploy|workforce/i,
    hooks: ["AI and your job, today's chapter: {t}"],
    ask: ["Is your job exposed to this?", "Net jobs: up or down?", "Who should get retrained first?"], tag: "#FutureOfWork" },
  { id: "power", re: /nvidia|\bchips?\b|gpu|data ?cent|power|grid|electric|tsmc|energy|nuclear|water/i,
    hooks: ["Follow the compute: {t}", "The AI build-out, in one headline: {t}"],
    ask: ["Who pays the power bill?", "Would you want this data centre in your county?", "How much grid can AI eat?"], tag: "#DataCenters" },
  { id: "policy", re: /\bbill\b|\blaw\b|regulat|senate|congress|ftc|ai act|\bban\b|court|lawsuit|\bsue|probe|white house/i,
    hooks: ["The rules for AI are being written right now: {t}"],
    ask: ["Does this go far enough?", "Who should write the rules for AI?", "Too much regulation or not enough?"], tag: "#AIPolicy" },
  { id: "money", re: /\bipo\b|valuation|raises?|funding|billion|\$\d|stock|shares|merger|acquir|revenue|debt/i,
    hooks: ["Follow the money: {t}", "The AI money machine, today: {t}"],
    ask: ["Bubble or bargain?", "Who is left holding the bag?", "Is this priced in?"], tag: "" },
  { id: "race", re: /openai|anthropic|deepmind|google|gemini|claude|chatgpt|\bgpt|xai|grok|\bmeta\b|llama|mistral|deepseek|qwen|china/i,
    hooks: ["The AI race just moved: {t}", "Another move in the AI race: {t}"],
    ask: ["Who is actually ahead right now?", "Does this change who wins the AI race?", "Which lab are you betting on?"], tag: "#AI" }
];
function topicOf(title){ for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].re.test(title || "")) return TOPICS[i]; return null; }
var CONTEXT = {
  news: ["SIREN {L} · {S}/100 as this landed ({time}).", "SIREN reads {S}/100 right now.", "", ""],
  alert: ["Source: {s} · {time}.", "Public feed, not a warning system. Follow local officials.", "Logged {time}.", ""],
  reading: ["Updated every hour, receipts included.", "Every number has a public receipt.", ""],
  page: ["SIREN {L} · {S}/100 right now.", "", ""]
};
var ASK = {
  news: ["Overhyped or a big deal?", "What's your read?", "Good news or bad news for the rest of us?", "Saw this one early?"],
  alert: ["Anyone near this? Stay safe.", "Check on your people.", "Anyone seeing it where you are?", ""],
  reading: ["Does that match your feed today?", "Louder or quieter than you'd guess?", "What would push it to SIREN 1?", "Where would you set it?"],
  page: ["What's your take?", "Where do you land on this?", "Would you have guessed?", "Surprised?"]
};
var EMOJI = { news: ["", "", "🤖 ", "⚡ ", "📡 "], alert: ["🚨 ", "⚠️ ", ""], reading: ["📊 ", "🔔 ", ""], page: ["", "", "👀 "] };
var TAGS = ["", "", "#AI"];
var ALERT_TAGS = ["", "", "", "#BreakingNews"];
function mood(S){ var n = parseFloat(S); if (!isFinite(n)) return "normal"; return n < 35 ? "quiet" : n < 55 ? "ticking along" : n < 70 ? "busy" : n < 85 ? "running hot" : "red-hot"; }
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
  var ok = function(t){ return hasLv || !/\{[LS]\}|\{[Mm]ood\}/.test(t); };
  var topic = kind === "alert" ? null : topicOf(o.title);
  var pool = HOOKS[kind].concat(topic && kind !== "reading" ? topic.hooks : []).filter(ok);
  // A reading share that already carries the site's own line (it names the
  // loudest story on the wire) keeps that line: it is the specific one.
  if (kind === "reading" && o.title && /SIREN \d/.test(o.title)) pool = ["{t}"];
  if (!pool.length) pool = kind === "reading" ? ["How loud is AI right now? The SIREN index counts it every hour."] : ["{t}"];
  var srcName = prettySrc(o.src);
  var m = mood(lvl.S);
  var v = { s: srcName || "the wire", time: time, L: lvl.L, S: lvl.S, mood: m, Mood: m.charAt(0).toUpperCase() + m.slice(1) };
  var asks = topic ? topic.ask.concat(topic.ask, ASK[kind]) : ASK[kind]; // topic questions weighted 2:1
  var tags = topic ? [topic.tag, topic.tag, ""] : (kind === "alert" ? ALERT_TAGS : TAGS);
  var best = "";
  // X counts a link as 23 characters; 250 of text plus the link always fits.
  for (var tries = 0; tries < 60; tries++) {
    var tpl = pick(pool);
    if (pool.length > 1 && tpl === LAST[kind] && tries < 40) continue;
    var ctx = pick(CONTEXT[kind].filter(ok).concat([""]));
    if (!srcName && /\{s\}/.test(ctx)) ctx = "";
    if (/\{s\}/.test(tpl) && !srcName && tries < 40) continue;
    var ask = pick(asks);
    var emo = pick(EMOJI[kind]);
    var tag = pick(tags);
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
window.sirenX = { compose: compose, intent: intent, hooks: HOOKS, topics: TOPICS, asks: ASK };
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
