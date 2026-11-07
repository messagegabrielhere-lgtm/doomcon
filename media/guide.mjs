// "Talk to Tally": agentic site guide. Plans tools against public SIREN JSON,
// synthesises an answer, and speaks it when the visitor flips Speak. Nothing
// typed here leaves the browser — fetches are same-origin public API files only.
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

  // Icons stay inline SVG so the chat does not depend on emoji fonts or colour glyphs.
  const ICO = {
    speak: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    clear: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"/></svg>',
  };

  const CHIPS = [
    'What is the level now?',
    'Any breaking news?',
    'Are the labs down?',
    'What are the agent PRs?',
    'Will AI take my job?',
    'Hear your last update',
  ];

  const css = [
    '#sg-scrim{position:fixed;inset:0;z-index:9997;background:rgba(4,8,14,.55);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .18s ease}',
    '#sg-scrim.on{opacity:1;pointer-events:auto}',
    '#sg-btn .av{display:inline-block;width:30px;height:30px;margin:-8px 8px -8px -8px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover no-repeat;box-shadow:0 0 0 2px var(--tl,#4ADE80);vertical-align:middle;position:relative}',
    '#sg-btn .av::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 2px var(--tl,#4ADE80);animation:sgPing 2.4s ease-out infinite}',
    '@keyframes sgPing{0%{opacity:.7;transform:scale(1)}80%,100%{opacity:0;transform:scale(1.6)}}',
    '#sg-tip{position:fixed;right:14px;bottom:112px;z-index:9997;max-width:248px;background:#0E131D;color:#E6EAF0;border:1px solid var(--tl,#4ADE80);border-radius:10px;padding:9px 12px;font:500 13px/1.4 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);cursor:pointer}',
    '#sg-tip::after{content:"";position:absolute;right:26px;bottom:-7px;width:12px;height:12px;background:#0E131D;border-right:1px solid var(--tl,#4ADE80);border-bottom:1px solid var(--tl,#4ADE80);transform:rotate(45deg)}',
    '#sg{position:fixed;right:12px;bottom:112px;z-index:9998;width:min(420px,calc(100vw - 24px));height:min(640px,calc(100vh - 132px));display:flex;flex-direction:column;background:#0B1018;color:#E6EAF0;border:1px solid #2A3344;border-radius:14px;box-shadow:0 22px 60px rgba(0,0,0,.62);font:400 14px/1.45 "IBM Plex Sans",system-ui,sans-serif;overflow:hidden;transform-origin:bottom right}',
    '#sg[hidden]{display:none}',
    '#sg header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 12px;border-bottom:1px solid #1F2937;background:linear-gradient(180deg,#101826 0%,#0B1018 100%)}',
    '#sg header .who{display:flex;align-items:center;gap:9px;min-width:0}',
    '#sg header .who i{flex:none;width:30px;height:30px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover;box-shadow:0 0 0 2px var(--tl,#4ADE80)}',
    '#sg.speaking header .who i{box-shadow:0 0 0 2px var(--tl,#4ADE80),0 0 0 6px color-mix(in srgb,var(--tl,#4ADE80) 28%,transparent)}',
    '#sg header .who .meta{display:flex;flex-direction:column;gap:3px;min-width:0}',
    '#sg header .who .name{font:700 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;color:var(--tl,#4ADE80);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#sg header .who .sub{font:500 11px/1 "IBM Plex Sans",system-ui,sans-serif;color:#8B95A5;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#sg header .lvl{display:inline-flex;align-items:center;gap:4px;margin-left:2px;padding:2px 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--tl,#4ADE80) 55%,#2A3344);color:var(--tl,#4ADE80);font:700 10px/1 "IBM Plex Mono",monospace;letter-spacing:.06em}',
    '#sg .tools{display:flex;gap:4px;align-items:center;flex:none}',
    '#sg .tools button{all:unset;box-sizing:border-box;cursor:pointer;color:#AEB7C3;min-width:32px;min-height:32px;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 8px;border-radius:8px;border:1px solid transparent}',
    '#sg .tools button:hover{color:#E6EAF0;background:#151C28}',
    '#sg .tools button:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '#sg .tools button[aria-pressed=true]{color:#04110A;background:var(--tl,#4ADE80);border-color:transparent}',
    '#sg .tools .spk-lab{font:700 10px/1 "IBM Plex Mono",monospace;letter-spacing:.06em}',
    '#sg .log{flex:1;overflow:auto;padding:14px 12px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;overscroll-behavior:contain}',
    '#sg .row{display:flex;gap:8px;align-items:flex-end;max-width:100%}',
    '#sg .row.u{align-self:flex-end;flex-direction:row-reverse}',
    '#sg .row.b{align-self:flex-start}',
    '#sg .row .face{flex:none;width:22px;height:22px;border-radius:50%;background:#000 url(' + base + '/img/art-canary.webp) center/cover;box-shadow:0 0 0 1.5px var(--tl,#4ADE80);margin-bottom:2px}',
    '#sg .m{max-width:min(340px,86%);padding:9px 12px;border-radius:14px;word-wrap:break-word}',
    '#sg .u .m{background:#1A2436;border:1px solid #2A364A;border-bottom-right-radius:4px}',
    '#sg .b .m{background:#07140D;border:1px solid #14532D;border-bottom-left-radius:4px}',
    '#sg .b .m a{color:var(--tl,#4ADE80);text-decoration:none}',
    '#sg .b .m a:hover{text-decoration:underline}',
    '#sg .links{display:flex;flex-direction:column;gap:5px;margin-top:8px}',
    '#sg .links a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border-radius:8px;background:#0A1A12;border:1px solid #1B3A29;color:var(--tl,#4ADE80);font:500 12.5px/1.3 "IBM Plex Sans",system-ui,sans-serif;text-decoration:none}',
    '#sg .links a:hover{border-color:var(--tl,#4ADE80);background:#0D2218}',
    '#sg .trail{margin-top:7px;font:500 11px/1.35 "IBM Plex Mono",monospace;color:#6B7686;letter-spacing:.02em}',
    '#sg .dim{color:#6B7686;font-size:12px}',
    '#sg .think{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;background:#101826;border:1px solid #1F2937;font:500 12px/1.3 "IBM Plex Mono",monospace;color:#9AA5B5;letter-spacing:.03em}',
    '#sg .think[data-busy]::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--tl,#4ADE80);animation:sgPulse 1s ease-in-out infinite}',
    '@keyframes sgPulse{0%,100%{opacity:.35}50%{opacity:1}}',
    '#sg ul{margin:6px 0 0;padding-left:18px}#sg li{margin:3px 0}',
    '#sg .composer{border-top:1px solid #1F2937;background:#0B1018;padding:8px 10px 10px;display:flex;flex-direction:column;gap:8px}',
    '#sg .chips{display:flex;gap:6px;overflow-x:auto;padding:1px 2px 2px;scrollbar-width:none;-ms-overflow-style:none}',
    '#sg .chips::-webkit-scrollbar{display:none}',
    '#sg .chips button{all:unset;cursor:pointer;flex:none;border:1px solid #2A3344;border-radius:999px;padding:6px 11px;font:500 12px/1.2 "IBM Plex Sans",system-ui,sans-serif;color:#AEB7C3;background:#101826;white-space:nowrap}',
    '#sg .chips button:hover{border-color:var(--tl,#4ADE80);color:#E6EAF0}',
    '#sg .chips button:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '#sg .chips button:disabled,#sg form button:disabled,#sg form input:disabled{opacity:.45;cursor:not-allowed}',
    '#sg form{display:flex;gap:6px;align-items:stretch}',
    '#sg input{flex:1;min-width:0;padding:11px 12px;background:#05070B;color:#fff;border:1px solid #2A3344;border-radius:10px;font:inherit}',
    '#sg input:focus{outline:none;border-color:var(--tl,#4ADE80);box-shadow:0 0 0 3px color-mix(in srgb,var(--tl,#4ADE80) 22%,transparent)}',
    '#sg form .mic,#sg form .go{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;min-width:44px}',
    '#sg form .mic{color:#E6EAF0;border:1px solid #2A3344;background:#101826}',
    '#sg form .mic.on{background:#F87171;color:#04110A;border-color:#F87171}',
    '#sg form .go{background:var(--tl,#4ADE80);color:#04110A;font:700 12px/1 "IBM Plex Mono",monospace;letter-spacing:.08em;padding:0 14px}',
    '#sg form .go:focus-visible,#sg form .mic:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '#sg .foot{font:500 11px/1.3 "IBM Plex Sans",system-ui,sans-serif;color:#5B6573;padding:0 2px}',
    '#sg-btn{all:unset;position:fixed;right:12px;bottom:64px;z-index:9997;cursor:pointer;background:var(--tl,#4ADE80);color:#04110A;font:700 13px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;padding:11px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45)}',
    '#sg-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){#sg-btn .av::after,#sg .think[data-busy]::before{animation:none}#sg-scrim{transition:none}#sg .log{scroll-behavior:auto}}',
    '@media (max-width:560px){',
    '#sg-tip{right:8px;bottom:calc(var(--sb-off,10px) + 54px)}',
    '#sg-btn .av{margin:0;width:44px;height:44px}',
    '#sg-btn{right:8px;bottom:var(--sb-off,10px);width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center}',
    '#sg-btn .t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '#sg{left:0;right:0;bottom:0;width:100vw;height:min(88vh,calc(100dvh - env(safe-area-inset-bottom,0px) - 8px));max-height:none;border-radius:16px 16px 0 0;border-left:0;border-right:0;border-bottom:0;padding-bottom:env(safe-area-inset-bottom,0px)}',
    '#sg .tools .spk-lab{display:none}',
    '#sg .m{max-width:88%}',
    '}',
    '@media print{#sg,#sg-btn,#sg-tip,#sg-scrim{display:none!important}}',
  ].join('');

  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  const scrim = document.createElement('div');
  scrim.id = 'sg-scrim';
  scrim.hidden = true;
  scrim.setAttribute('aria-hidden', 'true');

  const btn = document.createElement('button');
  btn.id = 'sg-btn';
  btn.type = 'button';
  btn.innerHTML = '<span class="av" aria-hidden="true"></span><span class="t">TALK TO TALLY</span>';
  btn.setAttribute('aria-label', "Talk to Tally, SIREN's duty canary and site guide");
  btn.setAttribute('aria-controls', 'sg');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-haspopup', 'dialog');

  const box = document.createElement('div');
  box.id = 'sg';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'sg-title');
  box.innerHTML = [
    '<header>',
    '<span class="who"><i aria-hidden="true"></i><span class="meta">',
    '<span class="name" id="sg-title">TALLY · DUTY CANARY</span>',
    '<span class="sub">Checks live dials · nothing you type leaves this browser</span>',
    '</span></span>',
    '<span class="tools">',
    `<button type="button" class="spk" aria-pressed="false" aria-label="Read answers aloud" title="Speak answers">${ICO.speak}<span class="spk-lab">SPEAK</span></button>`,
    `<button type="button" class="clr" aria-label="Clear chat" title="Clear chat">${ICO.clear}</button>`,
    `<button type="button" class="x" aria-label="Close">${ICO.close}</button>`,
    '</span></header>',
    '<div class="log" aria-live="polite"></div>',
    '<div class="composer">',
    `<div class="chips" role="group" aria-label="Suggested questions">${CHIPS.map((c) => `<button type="button">${esc(c)}</button>`).join('')}</div>`,
    '<form><input type="text" placeholder="Ask about the level, news, labs…" aria-label="Your question for Tally" autocomplete="off" enterkeyhint="send">',
    `<button type="button" class="mic" aria-label="Speak your question" title="Speak">${ICO.mic}</button>`,
    '<button type="submit" class="go" disabled>ASK</button></form>',
    '<p class="foot">Same-origin public JSON only. Mic audio goes to your browser vendor, not SIREN.</p>',
    '</div>',
  ].join('');

  document.body.appendChild(scrim);
  document.body.appendChild(btn);
  document.body.appendChild(box);

  const log = box.querySelector('.log');
  const input = box.querySelector('input');
  const form = box.querySelector('form');
  const go = box.querySelector('.go');
  const spk = box.querySelector('.spk');
  const mic = box.querySelector('.mic');
  const clr = box.querySelector('.clr');
  const chipsEl = box.querySelector('.chips');
  const subEl = box.querySelector('.sub');

  let speakOn = false;
  try { speakOn = localStorage.getItem('tally:speak') === '1'; } catch (_) {}
  let voice = null;
  let recAudio = null;
  let busy = false;
  let lastFocus = null;

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

  function setLevelChrome(state) {
    if (!state || !Number.isFinite(state.level)) return;
    const c = LEVEL_COLOR[state.level];
    if (c) document.documentElement.style.setProperty('--tl', c);
    const mood = MOOD[state.level] || 'watching';
    const sc = typeof state.score === 'number' ? state.score.toFixed(1) : null;
    subEl.innerHTML = `SIREN ${esc(state.level)}${sc ? ` · ${esc(sc)}/100` : ''} · ${esc(mood)} <span class="lvl">${esc(state.level_name || 'LEVEL ' + state.level)}</span>`;
  }

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

  function nearBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  }

  function scrollLog(force) {
    if (force || nearBottom()) log.scrollTop = log.scrollHeight;
  }

  function setBusy(on) {
    busy = on;
    input.disabled = on;
    go.disabled = on || !String(input.value || '').trim();
    chipsEl.querySelectorAll('button').forEach((c) => { c.disabled = on; });
    if (!SR) { /* mic already hidden */ }
    else mic.disabled = on;
  }

  function say(html, who, meta) {
    const row = document.createElement('div');
    row.className = 'row ' + (who || 'b');
    if ((who || 'b') === 'b') {
      const face = document.createElement('span');
      face.className = 'face';
      face.setAttribute('aria-hidden', 'true');
      row.appendChild(face);
    }
    const d = document.createElement('div');
    d.className = 'm';
    d.innerHTML = html;
    if (meta) {
      const trail = document.createElement('div');
      trail.className = 'trail';
      trail.textContent = meta;
      d.appendChild(trail);
    }
    row.appendChild(d);
    log.appendChild(row);
    scrollLog(true);
    if ((who || 'b') === 'b') {
      const play = d.querySelector('[data-tally-audio]');
      if (play) {
        play.addEventListener('click', (e) => {
          e.preventDefault();
          speakOn = true;
          spk.setAttribute('aria-pressed', 'true');
          try { localStorage.setItem('tally:speak', '1'); } catch (_) {}
          voiceOut(speakable(d.textContent), { audioUrl: play.getAttribute('data-tally-audio'), force: true });
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
    d.setAttribute('role', 'status');
    log.appendChild(d);
    scrollLog(true);
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
          setLevelChrome(data);
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
    setBusy(true);
    const status = think(tools.map(toolLabel).join(' · ') || 'checking the dials…');
    try {
      if (!memory.guide) {
        try { memory.guide = await fetchJson('/api/guide.json'); } catch (_) {}
      }
      const results = await runTools(tools, status);
      // Do not inject search_guide into every turn — synthesize already falls
      // back to memory.guide when no dial block matched.
      const out = synthesize(text, results, { base, memory });
      status.remove();
      const trail = (out.toolsUsed || []).map(toolLabel).filter(Boolean).slice(0, 3).join(' · ');
      say(out.html, 'b', trail ? 'checked · ' + trail : '');
      voiceOut(out.speak, out.audio ? { audioUrl: out.audio } : {});
    } catch (_) {
      status.remove();
      say('The dials did not answer just now. Try again in a moment.');
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  function ask(text) {
    const t = String(text || '').trim();
    if (!t || busy) return;
    say(esc(t), 'u');
    answer(t);
  }

  function focusables() {
    return [...box.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null || el === input);
  }

  function open(v) {
    if (v === !box.hidden) return;
    if (v) {
      lastFocus = document.activeElement;
      box.hidden = false;
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('on'));
      btn.setAttribute('aria-expanded', 'true');
      if (!log.children.length) {
        const status = think('reading the dials…');
        fetchJson('/api/state.json')
          .then((state) => {
            memory.state = state;
            setLevelChrome(state);
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
    } else {
      stopSpeech();
      box.hidden = true;
      scrim.classList.remove('on');
      setTimeout(() => { if (box.hidden) scrim.hidden = true; }, 200);
      btn.setAttribute('aria-expanded', 'false');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
      else btn.focus();
    }
  }

  function clearChat() {
    if (busy) return;
    stopSpeech();
    log.replaceChildren();
    memory.lastTools = null;
    const status = think('reading the dials…');
    const stateP = memory.state
      ? Promise.resolve(memory.state)
      : fetchJson('/api/state.json').then((s) => { memory.state = s; return s; });
    stateP
      .then((state) => {
        setLevelChrome(state);
        status.remove();
        const g = greet(state, base);
        say(g.html);
      })
      .catch(() => {
        status.remove();
        say(greet(null, base).html);
      });
    input.focus();
  }

  btn.addEventListener('click', () => open(box.hidden));
  scrim.addEventListener('click', () => open(false));
  box.querySelector('header .x').addEventListener('click', () => open(false));
  clr.addEventListener('click', clearChat);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = input.value;
    input.value = '';
    go.disabled = true;
    ask(t);
  });
  input.addEventListener('input', () => {
    go.disabled = busy || !String(input.value || '').trim();
  });
  chipsEl.querySelectorAll('button').forEach((c) => {
    c.addEventListener('click', () => ask(c.textContent));
  });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      open(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
      if (busy) return;
      if (rec) { try { rec.stop(); } catch (_) {} return; }
      rec = new SR();
      rec.lang = document.documentElement.lang || 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      mic.classList.add('on');
      mic.setAttribute('aria-pressed', 'true');
      input.placeholder = 'Listening…';
      rec.onresult = (ev) => {
        let t = '';
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        input.value = t;
        go.disabled = busy || !t.trim();
        if (ev.results[ev.results.length - 1].isFinal) {
          const q = input.value;
          input.value = '';
          go.disabled = true;
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
        mic.setAttribute('aria-pressed', 'false');
        input.placeholder = 'Ask about the level, news, labs…';
        rec = null;
      };
      try { rec.start(); } catch (_) {
        rec = null;
        mic.classList.remove('on');
        mic.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Deep link: /tally.html#talk (and the hero CTA) opens the panel.
  if (location.hash === '#talk') {
    requestAnimationFrame(() => open(true));
  }
  window.addEventListener('hashchange', () => {
    if (location.hash === '#talk') open(true);
  });

  // Colour follows the level; hello once per visit.
  fetchJson('/api/state.json').then((j) => {
    memory.state = j;
    setLevelChrome(j);
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
