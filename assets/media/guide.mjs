// "Talk to Tally": agentic site guide. Plans tools against public SIREN JSON,
// synthesises an answer, and speaks it when the visitor flips 🔊. Nothing typed
// here leaves the browser — fetches are same-origin public API files only.
import {
  MOOD, LEVEL_COLOR, TOOLS, planTools, toolLabel, synthesize, greet, speakable, pickVoice,
} from './tally-agent.mjs';

if (window.SirenGuide) {
  // already mounted
} else {
  window.SirenGuide = true;
  boot();
}

function boot() {
  const script = document.querySelector('script[src*="/media/guide."]');
  const base = (script && script.src.replace(/\/media\/guide\.(mjs|js).*$/, '')) || '';
  const cache = Object.create(null);
  const memory = { lastTools: null, guide: null, state: null };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const css = [
    '#sg-btn .av{display:inline-block;width:30px;height:30px;margin:-8px 8px -8px -8px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover no-repeat;box-shadow:0 0 0 2px var(--tl,#4ADE80);vertical-align:middle;position:relative}',
    '#sg-btn .av::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 2px var(--tl,#4ADE80);animation:sgPing 2.4s ease-out infinite}',
    '@keyframes sgPing{0%{opacity:.7;transform:scale(1)}80%,100%{opacity:0;transform:scale(1.6)}}@media (prefers-reduced-motion:reduce){#sg-btn .av::after{animation:none}}',
    '#sg-tip{position:fixed;right:14px;bottom:112px;z-index:9997;max-width:240px;background:#0E131D;color:#E6EAF0;border:1px solid var(--tl,#4ADE80);border-radius:10px;padding:9px 12px;font:500 13px/1.4 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);cursor:pointer}',
    '#sg-tip::after{content:"";position:absolute;right:26px;bottom:-7px;width:12px;height:12px;background:#0E131D;border-right:1px solid var(--tl,#4ADE80);border-bottom:1px solid var(--tl,#4ADE80);transform:rotate(45deg)}',
    '#sg header .who{display:flex;align-items:center;gap:8px}#sg header .who i{width:26px;height:26px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover;box-shadow:0 0 0 2px var(--tl,#4ADE80)}',
    '#sg .tools{display:flex;gap:6px;align-items:center}#sg .tools button{all:unset;cursor:pointer;color:#AEB7C3;font-size:15px;padding:2px 6px;border-radius:4px}#sg .tools button[aria-pressed=true]{color:#000;background:var(--tl,#4ADE80)}',
    '#sg form .mic{background:transparent;color:#E6EAF0;border:1px solid #232C3B}#sg form .mic.on{background:#F87171;color:#000;border-color:#F87171}',
    '#sg-btn{all:unset;position:fixed;right:12px;bottom:64px;z-index:9997;cursor:pointer;background:var(--tl,#4ADE80);color:#000;font:700 13px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;padding:11px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45)}',
    '#sg-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '#sg{position:fixed;right:12px;bottom:112px;z-index:9998;width:min(400px,calc(100vw - 24px));max-height:min(600px,calc(100vh - 140px));display:flex;flex-direction:column;background:#0E131D;color:#E6EAF0;border:1px solid #232C3B;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.6);font:400 14px/1.45 "IBM Plex Sans",system-ui,sans-serif;overflow:hidden}',
    '#sg[hidden]{display:none}#sg header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #232C3B;font:700 12px/1 "IBM Plex Mono",monospace;letter-spacing:.12em;color:var(--tl,#4ADE80)}',
    '#sg header button{all:unset;cursor:pointer;color:#AEB7C3;font-size:16px;padding:2px 6px}',
    '#sg .log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px}',
    '#sg .m{max-width:92%;padding:8px 11px;border-radius:10px}#sg .u{align-self:flex-end;background:#1E293B}#sg .b{align-self:flex-start;background:#03130A;border:1px solid #14532D}',
    '#sg .b a{color:var(--tl,#4ADE80)}#sg .links{display:flex;flex-direction:column;gap:4px;margin-top:6px}',
    '#sg .dim{color:#6B7686;font-size:12px}#sg .think{align-self:flex-start;font:500 12px/1.4 "IBM Plex Mono",monospace;color:#6B7686;letter-spacing:.04em}',
    '#sg .think[data-busy]::before{content:"";display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:50%;background:var(--tl,#4ADE80);animation:sgPulse 1s ease-in-out infinite}',
    '@keyframes sgPulse{0%,100%{opacity:.35}50%{opacity:1}}@media (prefers-reduced-motion:reduce){#sg .think[data-busy]::before{animation:none}}',
    '#sg ul{margin:6px 0 0;padding-left:18px}#sg li{margin:2px 0}',
    '#sg .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px}#sg .chips button{all:unset;cursor:pointer;border:1px solid #232C3B;border-radius:999px;padding:5px 10px;font-size:12px;color:#AEB7C3}#sg .chips button:hover{border-color:var(--tl,#4ADE80);color:#E6EAF0}',
    '#sg form{display:flex;gap:6px;padding:10px;border-top:1px solid #232C3B}#sg input{flex:1;min-width:0;padding:9px 10px;background:#000;color:#fff;border:1px solid #232C3B;border-radius:6px;font:inherit}#sg form button{all:unset;cursor:pointer;background:var(--tl,#4ADE80);color:#000;font:700 12px/1 "IBM Plex Mono",monospace;padding:0 12px;border-radius:6px}',
    '#sg.speaking header .spk{background:var(--tl,#4ADE80);color:#000}',
    '@media (max-width:560px){#sg-tip{right:8px;bottom:calc(var(--sb-off,10px) + 54px)}#sg-btn .av{margin:0;width:44px;height:44px}#sg-btn{right:8px;bottom:var(--sb-off,10px);width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:20px;letter-spacing:0}#sg-btn .t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}#sg{right:8px;width:calc(100vw - 16px);bottom:calc(var(--sb-off,10px) + 54px);max-height:calc(100vh - var(--sb-off,10px) - 70px)}}@media print{#sg,#sg-btn,#sg-tip{display:none}}',
  ].join('');

  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  const btn = document.createElement('button');
  btn.id = 'sg-btn';
  btn.type = 'button';
  btn.innerHTML = '<span class="av" aria-hidden="true"></span><span class="t">TALK TO TALLY</span>';
  btn.setAttribute('aria-label', "Talk to Tally, SIREN's duty canary and site guide");
  btn.setAttribute('aria-controls', 'sg');
  btn.setAttribute('aria-expanded', 'false');

  const box = document.createElement('div');
  box.id = 'sg';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Talk to Tally');
  box.innerHTML = [
    '<header><span class="who"><i aria-hidden="true"></i>TALLY · AGENTIC CANARY</span>',
    '<span class="tools">',
    '<button type="button" class="spk" aria-pressed="false" aria-label="Tally reads her answers aloud" title="Speak answers">🔊</button>',
    '<button type="button" class="x" aria-label="Close">✕</button>',
    '</span></header>',
    '<div class="log" aria-live="polite"></div>',
    '<div class="chips">',
    '<button>What is the level now?</button>',
    '<button>Any breaking news?</button>',
    '<button>Are the labs down?</button>',
    '<button>What are the agent PRs?</button>',
    '<button>Will AI take my job?</button>',
    '<button>Hear your last update</button>',
    '</div>',
    '<form><input type="text" placeholder="Ask Tally — she checks the live dials…" aria-label="Your question for Tally" autocomplete="off">',
    '<button type="button" class="mic" aria-label="Speak your question" title="Speak">🎙</button>',
    '<button type="submit">ASK</button></form>',
  ].join('');

  document.body.appendChild(btn);
  document.body.appendChild(box);

  const log = box.querySelector('.log');
  const input = box.querySelector('input');
  const spk = box.querySelector('.spk');
  const mic = box.querySelector('.mic');

  let speakOn = false;
  try { speakOn = localStorage.getItem('tally:speak') === '1'; } catch (_) {}
  let voice = null;
  let recAudio = null;

  function refreshVoices() {
    if (!window.speechSynthesis) return;
    voice = pickVoice(speechSynthesis.getVoices());
  }
  if (window.speechSynthesis) {
    refreshVoices();
    speechSynthesis.addEventListener('voiceschanged', refreshVoices);
  } else {
    spk.hidden = true;
  }
  spk.setAttribute('aria-pressed', String(speakOn));

  function stopSpeech() {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (_) {}
    if (recAudio) { try { recAudio.pause(); } catch (_) {} recAudio = null; }
    box.classList.remove('speaking');
  }

  function voiceOut(text, opts = {}) {
    if (!speakOn && !opts.force) return;
    if (opts.audioUrl) {
      stopSpeech();
      try {
        recAudio = new Audio(opts.audioUrl);
        box.classList.add('speaking');
        recAudio.onended = () => { box.classList.remove('speaking'); recAudio = null; };
        recAudio.onerror = () => { box.classList.remove('speaking'); recAudio = null; voiceOut(text, { force: true }); };
        recAudio.play().catch(() => { voiceOut(text, { force: true }); });
      } catch (_) { voiceOut(text, { force: true }); }
      return;
    }
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(speakable(text));
      u.rate = 1.04;
      u.pitch = 1.28;
      if (voice) u.voice = voice;
      box.classList.add('speaking');
      u.onend = u.onerror = () => box.classList.remove('speaking');
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  function say(html, who) {
    const d = document.createElement('div');
    d.className = 'm ' + (who || 'b');
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    if ((who || 'b') === 'b') {
      const play = d.querySelector('[data-tally-audio]');
      if (play) {
        play.addEventListener('click', (e) => {
          e.preventDefault();
          speakOn = true;
          spk.setAttribute('aria-pressed', 'true');
          try { localStorage.setItem('tally:speak', '1'); } catch (_) {}
          voiceOut(play.closest('.m').textContent, { audioUrl: play.getAttribute('data-tally-audio'), force: true });
        });
      }
    }
    return d;
  }

  function think(msg) {
    const d = document.createElement('div');
    d.className = 'think';
    d.dataset.busy = '1';
    d.textContent = msg;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  async function fetchJson(path) {
    if (cache[path] && Date.now() - cache[path].at < 60_000) return cache[path].data;
    const r = await fetch(base + path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(path + ' ' + r.status);
    const data = await r.json();
    cache[path] = { at: Date.now(), data };
    return data;
  }

  async function runTools(ids, statusEl) {
    const results = {};
    const uniquePaths = new Map();
    for (const id of ids) {
      const tool = TOOLS[id];
      if (!tool) continue;
      if (!uniquePaths.has(tool.path)) uniquePaths.set(tool.path, []);
      uniquePaths.get(tool.path).push(id);
    }
    let i = 0;
    const entries = [...uniquePaths.entries()];
    await Promise.all(entries.map(async ([path, toolIds]) => {
      if (statusEl) statusEl.textContent = toolLabel(toolIds[0]) + '…';
      try {
        const data = await fetchJson(path);
        for (const id of toolIds) results[id] = { ok: true, data };
        if (toolIds.includes('search_guide')) memory.guide = data;
        if (toolIds.includes('get_reading') || toolIds.includes('get_pillars')) {
          memory.state = data;
          const c = LEVEL_COLOR[data.level];
          if (c) document.documentElement.style.setProperty('--tl', c);
        }
      } catch (err) {
        for (const id of toolIds) results[id] = { ok: false, error: String(err && err.message || err) };
      }
      i += 1;
      if (statusEl && i < entries.length) statusEl.textContent = toolLabel(toolIds[0]) + '…';
    }));
    return results;
  }

  async function answer(text) {
    const tools = planTools(text, memory);
    memory.lastTools = tools;
    const status = think(tools.map(toolLabel).join(' · ') || 'checking the dials…');
    try {
      // Always keep guide.json warm for navigation fallbacks.
      if (!memory.guide) {
        try { memory.guide = await fetchJson('/api/guide.json'); } catch (_) {}
      }
      const results = await runTools(tools, status);
      if (!results.search_guide && memory.guide) results.search_guide = { ok: true, data: memory.guide };
      const out = synthesize(text, results, { base, memory });
      status.remove();
      say(out.html);
      voiceOut(out.speak, out.audio ? { audioUrl: out.audio } : {});
    } catch (err) {
      status.remove();
      say('The dials did not answer just now. Try again in a moment.');
    }
  }

  function ask(text) {
    const t = String(text || '').trim();
    if (!t) return;
    say(esc(t), 'u');
    answer(t);
  }

  function open(v) {
    box.hidden = !v;
    btn.setAttribute('aria-expanded', String(v));
    if (!v) { stopSpeech(); return; }
    if (!log.children.length) {
      const status = think('reading the dials…');
      fetchJson('/api/state.json')
        .then((state) => {
          memory.state = state;
          const c = LEVEL_COLOR[state.level];
          if (c) document.documentElement.style.setProperty('--tl', c);
          status.remove();
          const g = greet(state, base);
          say(g.html);
          voiceOut(g.speak);
        })
        .catch(() => {
          status.remove();
          const g = greet(null, base);
          say(g.html);
          voiceOut(g.speak);
        });
      fetchJson('/api/guide.json').then((g) => { memory.guide = g; }).catch(() => {});
    }
    input.focus();
  }

  btn.addEventListener('click', () => open(box.hidden));
  box.querySelector('header .x').addEventListener('click', () => open(false));
  box.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = input.value;
    input.value = '';
    ask(t);
  });
  box.querySelectorAll('.chips button').forEach((c) => {
    c.addEventListener('click', () => ask(c.textContent));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !box.hidden) open(false);
  });

  spk.addEventListener('click', () => {
    speakOn = !speakOn;
    spk.setAttribute('aria-pressed', String(speakOn));
    try { localStorage.setItem('tally:speak', speakOn ? '1' : '0'); } catch (_) {}
    if (!speakOn) stopSpeech();
    else voiceOut('Okay. I read my answers out loud.', { force: true });
  });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  if (!SR) mic.hidden = true;
  else {
    mic.addEventListener('click', () => {
      if (rec) { try { rec.stop(); } catch (_) {} return; }
      rec = new SR();
      rec.lang = document.documentElement.lang || 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      mic.classList.add('on');
      input.placeholder = 'Listening…';
      rec.onresult = (ev) => {
        let t = '';
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        input.value = t;
        if (ev.results[ev.results.length - 1].isFinal) {
          const q = input.value;
          input.value = '';
          if (!speakOn && window.speechSynthesis) {
            speakOn = true;
            spk.setAttribute('aria-pressed', 'true');
            try { localStorage.setItem('tally:speak', '1'); } catch (_) {}
          }
          ask(q);
        }
      };
      rec.onend = rec.onerror = () => {
        mic.classList.remove('on');
        input.placeholder = 'Ask Tally — she checks the live dials…';
        rec = null;
      };
      try { rec.start(); } catch (_) { rec = null; mic.classList.remove('on'); }
    });
  }

  // Colour follows the level; hello once per visit.
  fetchJson('/api/state.json').then((j) => {
    memory.state = j;
    const c = LEVEL_COLOR[j.level];
    if (c) document.documentElement.style.setProperty('--tl', c);
    let seen = false;
    try {
      seen = sessionStorage.getItem('tally:hi') === '1';
      sessionStorage.setItem('tally:hi', '1');
    } catch (_) {}
    if (seen || !box.hidden) return;
    setTimeout(() => {
      if (!box.hidden) return;
      const tip = document.createElement('div');
      tip.id = 'sg-tip';
      tip.setAttribute('role', 'status');
      tip.innerHTML = `Tweet! SIREN ${esc(j.level)} right now, and I'm ${esc(MOOD[j.level] || 'watching')}. <b>Talk to me</b> →`;
      tip.addEventListener('click', () => { tip.remove(); open(true); });
      document.body.appendChild(tip);
      setTimeout(() => { if (tip.parentNode) tip.remove(); }, 7000);
    }, 9000);
  }).catch(() => {});
}
