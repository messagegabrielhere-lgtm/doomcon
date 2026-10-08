// "Ask SIREN": a chat-style guide on every page. It answers from the site's
// own index (/api/guide.json: every room plus common questions) and the live
// reading (/api/state.json), and takes you to the right room. No AI model and
// no third party yet: nothing typed here leaves the browser.
(function () {
  'use strict';
  if (window.SirenGuide) return; window.SirenGuide = true;
  var base = (document.currentScript && document.currentScript.src.replace(/\/media\/guide\.js.*$/, '')) || '';
  var idx = null, state = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var css = '#sg-btn{all:unset;position:fixed;right:12px;bottom:64px;z-index:9997;cursor:pointer;background:#4ADE80;color:#000;font:700 13px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;padding:11px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45)}'
    + '#sg-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}'
    + '#sg{position:fixed;right:12px;bottom:112px;z-index:9998;width:min(380px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 140px));display:flex;flex-direction:column;background:#0E131D;color:#E6EAF0;border:1px solid #232C3B;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.6);font:400 14px/1.45 "IBM Plex Sans",system-ui,sans-serif;overflow:hidden}'
    + '#sg[hidden]{display:none}#sg header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #232C3B;font:700 12px/1 "IBM Plex Mono",monospace;letter-spacing:.12em;color:#4ADE80}'
    + '#sg header button{all:unset;cursor:pointer;color:#AEB7C3;font-size:16px;padding:2px 6px}'
    + '#sg .log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}'
    + '#sg .m{max-width:88%;padding:8px 11px;border-radius:10px}#sg .u{align-self:flex-end;background:#1E293B}#sg .b{align-self:flex-start;background:#03130A;border:1px solid #14532D}'
    + '#sg .b a{color:#4ADE80}#sg .links{display:flex;flex-direction:column;gap:4px;margin-top:6px}'
    + '#sg .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px}#sg .chips button{all:unset;cursor:pointer;border:1px solid #232C3B;border-radius:999px;padding:5px 10px;font-size:12px;color:#AEB7C3}#sg .chips button:hover{border-color:#4ADE80;color:#E6EAF0}'
    + '#sg form{display:flex;gap:6px;padding:10px;border-top:1px solid #232C3B}#sg input{flex:1;min-width:0;padding:9px 10px;background:#000;color:#fff;border:1px solid #232C3B;border-radius:6px;font:inherit}#sg form button{all:unset;cursor:pointer;background:#4ADE80;color:#000;font:700 12px/1 "IBM Plex Mono",monospace;padding:0 12px;border-radius:6px}'
    + '@media (max-width:560px){#sg-btn{bottom:58px}#sg{bottom:104px}}@media print{#sg,#sg-btn{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var btn = document.createElement('button'); btn.id = 'sg-btn'; btn.type = 'button'; btn.textContent = '💬 ASK SIREN'; btn.setAttribute('aria-controls', 'sg'); btn.setAttribute('aria-expanded', 'false');
  var box = document.createElement('div'); box.id = 'sg'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Ask SIREN');
  box.innerHTML = '<header><span>ASK SIREN · SITE GUIDE</span><button type="button" aria-label="Close">✕</button></header><div class="log" aria-live="polite"></div>'
    + '<div class="chips"><button>What is the level now?</button><button>How does it work?</button><button>Will AI take my job?</button><button>Prepare for superintelligence</button><button>Show me the good news</button><button>Real clips</button></div>'
    + '<form><input type="text" placeholder="Ask about the site or the index…" aria-label="Your question" autocomplete="off"><button type="submit">ASK</button></form>';
  document.body.appendChild(btn); document.body.appendChild(box);
  var log = box.querySelector('.log'), input = box.querySelector('input');
  function say(html, who) { var d = document.createElement('div'); d.className = 'm ' + (who || 'b'); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; }
  function load() {
    if (idx) return Promise.resolve();
    return Promise.all([
      fetch(base + '/api/guide.json').then(function (r) { return r.json(); }).then(function (j) { idx = j; }),
      fetch(base + '/api/state.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { state = j; }).catch(function () {}),
    ]);
  }
  var STOP = /^(the|a|an|is|are|of|to|in|on|for|and|or|what|how|do|does|i|me|my|can|you|it|this|site|siren|show|about|with|will|be)$/;
  function words(s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (w) { return w && !STOP.test(w); }); }
  function score(q, text) { var t = ' ' + String(text).toLowerCase() + ' '; var n = 0; q.forEach(function (w) { if (t.indexOf(' ' + w) >= 0) n += w.length > 3 ? 2 : 1; }); return n; }
  function answer(text) {
    var q = words(text);
    if (/\b(level|score|now|current|reading|loud)\b/i.test(text) && state) {
      var L = state.level, nm = state.level_name, sc = typeof state.score === 'number' ? state.score.toFixed(1) : '?';
      say('Right now AI activity is at <b>SIREN ' + esc(L) + ': ' + esc(nm) + '</b>, score ' + esc(sc) + '/100, on a scale where 1 is loudest. Updated ' + esc(String(state.generated_at).slice(11, 16)) + ' UTC.<div class="links"><a href="' + base + '/">See the war room →</a><a href="' + base + '/methodology.html">How it is computed →</a></div>');
      return;
    }
    var faq = idx.faq.map(function (f) { return { f: f, s: score(q, f.q) }; }).sort(function (a, b) { return b.s - a.s; });
    var rooms = idx.rooms.map(function (r) { return { r: r, s: score(q, r.t + ' ' + r.d + ' ' + r.g) }; }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
    var html = '';
    if (faq[0] && faq[0].s > 0) html += esc(faq[0].f.a) + '<div class="links"><a href="' + esc(faq[0].f.u) + '">Take me there →</a>';
    else if (rooms.length) html += 'These rooms look like what you want:<div class="links">';
    else { say('I could not match that. Try one of the suggestions, open <a href="' + base + '/#rooms">every room</a>, or <a href="' + base + '/feedback.html">ask us on GitHub</a>.'); return; }
    rooms.forEach(function (x) { html += '<a href="' + esc(x.r.u) + '">' + esc(x.r.t) + ': ' + esc(x.r.d) + '</a>'; });
    say(html + '</div>');
  }
  function ask(text) { if (!text.trim()) return; say(esc(text), 'u'); load().then(function () { answer(text); }).catch(function () { say('The guide could not load just now. Try again in a moment.'); }); }
  function open(v) { box.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) { load(); if (!log.children.length) say('Hi, I\'m the SIREN site guide. Ask me about the index, or tell me what you\'re looking for and I\'ll take you to the right room.'); input.focus(); } }
  btn.addEventListener('click', function () { open(box.hidden); });
  box.querySelector('header button').addEventListener('click', function () { open(false); });
  box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var t = input.value; input.value = ''; ask(t); });
  box.querySelectorAll('.chips button').forEach(function (c) { c.addEventListener('click', function () { ask(c.textContent); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) open(false); });
})();
