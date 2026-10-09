// "Talk to Tally": SIREN's duty canary as a chat-style guide on every page, with
// optional voice in and out through the browser's own speech features. It answers from the site's
// own index (/api/guide.json: every room plus common questions) and the live
// reading (/api/state.json), and takes you to the right room. No AI model and
// no third party yet: nothing typed here leaves the browser.
(function () {
  'use strict';
  if (window.SirenGuide) return; window.SirenGuide = true;
  var base = (document.currentScript && document.currentScript.src.replace(/\/media\/guide\.js.*$/, '')) || '';
  var idx = null, state = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var css = '#sg-btn .av{display:inline-block;width:30px;height:30px;margin:-8px 8px -8px -8px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover no-repeat;box-shadow:0 0 0 2px var(--tl,#4ADE80);vertical-align:middle;position:relative}'
    + '#sg-btn .av::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 2px var(--tl,#4ADE80);animation:sgPing 2.4s ease-out infinite}'
    + '@keyframes sgPing{0%{opacity:.7;transform:scale(1)}80%,100%{opacity:0;transform:scale(1.6)}}@media (prefers-reduced-motion:reduce){#sg-btn .av::after{animation:none}}'
    + '#sg-tip{position:fixed;right:14px;bottom:112px;z-index:9997;max-width:240px;background:#0E131D;color:#E6EAF0;border:1px solid var(--tl,#4ADE80);border-radius:10px;padding:9px 12px;font:500 13px/1.4 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);cursor:pointer}'
    + '#sg-tip::after{content:"";position:absolute;right:26px;bottom:-7px;width:12px;height:12px;background:#0E131D;border-right:1px solid var(--tl,#4ADE80);border-bottom:1px solid var(--tl,#4ADE80);transform:rotate(45deg)}'
    + '#sg header .who{display:flex;align-items:center;gap:8px}#sg header .who i{width:26px;height:26px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover;box-shadow:0 0 0 2px var(--tl,#4ADE80)}'
    + '#sg .tools{display:flex;gap:6px}#sg .tools button{all:unset;cursor:pointer;color:#AEB7C3;font-size:15px;padding:2px 6px;border-radius:4px}#sg .tools button[aria-pressed=true]{color:#000;background:var(--tl,#4ADE80)}'
    + '#sg form .mic{background:transparent;color:#E6EAF0;border:1px solid #232C3B}#sg form .mic.on{background:#F87171;color:#000;border-color:#F87171}'
    + '#sg-btn{all:unset;position:fixed;right:12px;bottom:64px;z-index:9997;cursor:pointer;background:var(--tl,#4ADE80);color:#000;font:700 13px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;padding:11px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45)}'
    + '#sg-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}'
    + '#sg{position:fixed;right:12px;bottom:112px;z-index:9998;width:min(380px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 140px));display:flex;flex-direction:column;background:#0E131D;color:#E6EAF0;border:1px solid #232C3B;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.6);font:400 14px/1.45 "IBM Plex Sans",system-ui,sans-serif;overflow:hidden}'
    + '#sg[hidden]{display:none}#sg header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #232C3B;font:700 12px/1 "IBM Plex Mono",monospace;letter-spacing:.12em;color:#4ADE80}'
    + '#sg header button{all:unset;cursor:pointer;color:#AEB7C3;font-size:16px;padding:2px 6px}'
    + '#sg .log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}'
    + '#sg .m{max-width:88%;padding:8px 11px;border-radius:10px}#sg .u{align-self:flex-end;background:#1E293B}#sg .b{align-self:flex-start;background:#03130A;border:1px solid #14532D}'
    + '#sg .b a{color:#4ADE80}#sg .links{display:flex;flex-direction:column;gap:4px;margin-top:6px}'
    + '#sg .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px}#sg .chips button{all:unset;cursor:pointer;border:1px solid #232C3B;border-radius:999px;padding:5px 10px;font-size:12px;color:#AEB7C3}#sg .chips button:hover{border-color:#4ADE80;color:#E6EAF0}'
    + '#sg form{display:flex;gap:6px;padding:10px;border-top:1px solid #232C3B}#sg input{flex:1;min-width:0;padding:9px 10px;background:#000;color:#fff;border:1px solid #232C3B;border-radius:6px;font:inherit}#sg form button{all:unset;cursor:pointer;background:#4ADE80;color:#000;font:700 12px/1 "IBM Plex Mono",monospace;padding:0 12px;border-radius:6px}'
    + '@media (max-width:560px){#sg-tip{right:8px;bottom:calc(var(--sb-off,10px) + 54px)}#sg-btn .av{margin:0;width:44px;height:44px}#sg-btn{right:8px;bottom:var(--sb-off,10px);width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:20px;letter-spacing:0}#sg-btn .t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}#sg{right:8px;width:calc(100vw - 16px);bottom:calc(var(--sb-off,10px) + 54px);max-height:calc(100vh - var(--sb-off,10px) - 70px)}}@media print{#sg,#sg-btn{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var btn = document.createElement('button'); btn.id = 'sg-btn'; btn.type = 'button'; btn.innerHTML = '<span class="av" aria-hidden="true"></span><span class="t">TALK TO TALLY</span>'; btn.setAttribute('aria-label', 'Talk to Tally, SIREN’s duty canary and site guide'); btn.setAttribute('aria-controls', 'sg'); btn.setAttribute('aria-expanded', 'false');
  var box = document.createElement('div'); box.id = 'sg'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Talk to Tally');
  box.innerHTML = '<header><span class="who"><i aria-hidden="true"></i>TALLY · SIREN’S DUTY CANARY</span><span class="tools"><button type="button" class="spk" aria-pressed="false" aria-label="Tally reads her answers aloud" title="Read answers aloud">🔊</button><button type="button" class="x" aria-label="Close">✕</button></span></header><div class="log" aria-live="polite"></div>'
    + '<div class="chips"><button>What is the level now?</button><button>How does it work?</button><button>Will AI take my job?</button><button>Prepare for superintelligence</button><button>Show me the good news</button><button>Real clips</button></div>'
    + '<form><input type="text" placeholder="Ask Tally anything about AI or the site…" aria-label="Your question for Tally" autocomplete="off"><button type="button" class="mic" aria-label="Speak your question" title="Speak">🎙</button><button type="submit">ASK</button></form>';
  document.body.appendChild(btn); document.body.appendChild(box);
  var log = box.querySelector('.log'), input = box.querySelector('input');
  var speak = false; try { speak = localStorage.getItem('tally:speak') === '1'; } catch (e) {}
  function voiceOut(text) {
    if (!speak || !window.speechSynthesis) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text.replace(/→/g, '').slice(0, 400)); u.rate = 1.05; u.pitch = 1.35; speechSynthesis.speak(u); } catch (e) {}
  }
  function say(html, who) { var d = document.createElement('div'); d.className = 'm ' + (who || 'b'); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; if ((who || 'b') === 'b') { var c = d.cloneNode(true); var l = c.querySelector('.links'); if (l) l.remove(); voiceOut(c.textContent); } }
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
  var MOOD = { 5: 'asleep on the perch', 4: 'whistling', 3: 'head up', 2: 'feathers ruffled', 1: 'in full squawk' };
  function greet() {
    var L = state && state.level, sc = state && typeof state.score === 'number' ? state.score.toFixed(1) : null;
    return 'Tweet! I\'m <b>Tally</b>, SIREN\'s duty canary. SIREN stands for <b>Superintelligence Real-time Early Notice</b>: I count how loud AI is, every hour' + (L ? ', and right now it\'s <b>SIREN ' + esc(L) + '</b>' + (sc ? ' (' + esc(sc) + '/100)' : '') + ', so I\'m ' + esc(MOOD[L] || 'watching') : '') + '. Ask me anything, type or tap 🎙 to talk.';
  }
  function ask(text) { if (!text.trim()) return; say(esc(text), 'u'); load().then(function () { answer(text); }).catch(function () { say('The guide could not load just now. Try again in a moment.'); }); }
  function open(v) { box.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) { load(); if (!log.children.length) load().then(function () { say(greet()); }).catch(function () { say(greet()); }); input.focus(); } }
  btn.addEventListener('click', function () { open(box.hidden); });
  box.querySelector('header .x').addEventListener('click', function () { open(false); });
  box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var t = input.value; input.value = ''; ask(t); });
  box.querySelectorAll('.chips button').forEach(function (c) { c.addEventListener('click', function () { ask(c.textContent); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) open(false); });
  var spk = box.querySelector('.spk');
  spk.setAttribute('aria-pressed', String(speak));
  if (!window.speechSynthesis) spk.hidden = true;
  spk.addEventListener('click', function () { speak = !speak; spk.setAttribute('aria-pressed', String(speak)); try { localStorage.setItem('tally:speak', speak ? '1' : '0'); } catch (e) {} if (!speak && window.speechSynthesis) speechSynthesis.cancel(); else voiceOut('Okay, I will read my answers out loud.'); });
  // Talk to her: the browser's own speech recognition, when it has one. The
  // audio goes to the browser vendor's recogniser, not to SIREN.
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = box.querySelector('.mic'), rec = null;
  if (!SR) mic.hidden = true;
  else mic.addEventListener('click', function () {
    if (rec) { try { rec.stop(); } catch (e) {} return; }
    rec = new SR(); rec.lang = document.documentElement.lang || 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
    mic.classList.add('on'); input.placeholder = 'Listening…';
    rec.onresult = function (ev) { var t = ''; for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; input.value = t; if (ev.results[ev.results.length - 1].isFinal) { var q = input.value; input.value = ''; if (!speak && window.speechSynthesis) { speak = true; spk.setAttribute('aria-pressed', 'true'); } ask(q); } };
    rec.onend = rec.onerror = function () { mic.classList.remove('on'); input.placeholder = 'Ask Tally anything about AI or the site…'; rec = null; };
    try { rec.start(); } catch (e) { rec = null; mic.classList.remove('on'); }
  });
  // Her colour follows the level, and she says hello once per visit.
  var LC = { 5: '#4FB3FF', 4: '#4ADE80', 3: '#FACC15', 2: '#FB923C', 1: '#F87171' };
  fetch(base + '/api/state.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
    state = state || j; var c = LC[j.level]; if (c) document.documentElement.style.setProperty('--tl', c);
    var seen = false; try { seen = sessionStorage.getItem('tally:hi') === '1'; sessionStorage.setItem('tally:hi', '1'); } catch (e) {}
    if (seen || !box.hidden) return;
    setTimeout(function () {
      if (!box.hidden) return;
      var tip = document.createElement('div'); tip.id = 'sg-tip'; tip.setAttribute('role', 'status');
      tip.innerHTML = 'Tweet! SIREN ' + esc(j.level) + ' right now, and I\'m ' + esc(MOOD[j.level] || 'watching') + '. <b>Talk to me</b> →';
      tip.addEventListener('click', function () { tip.remove(); open(true); });
      document.body.appendChild(tip);
      setTimeout(function () { if (tip.parentNode) tip.remove(); }, 7000);
    }, 9000);
  }).catch(function () {});
})();
