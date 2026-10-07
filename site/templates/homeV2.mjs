// The homepage, PizzINT-style: one glowing level banner, an icon dock, the
// bosses on watch, the labs as monitored "locations", and two small charts.
// Everything is server-rendered: the level, the score and every count are text
// or inline SVG in the HTML, so the build's self-check and every screenshot see
// them without a script. The only script is the ticking UTC clock.
//
// The full instrument panel this replaced still builds, at /classic.html.
import { esc, num } from './_html.mjs';

// ---------- pixel helpers (crisp vector blocks, merged per row) ----------
function blocks(rows, pal, k, extra = '') {
  let w = 0; for (const r of rows) if (r.length > w) w = r.length;
  let out = '';
  rows.forEach((r, y) => {
    let x = 0;
    while (x < r.length) {
      const ch = r[x]; const c = pal[ch];
      if (!c) { x++; continue; }
      let x2 = x; while (x2 < r.length && r[x2] === ch) x2++;
      out += `<rect x="${x}" y="${y}" width="${x2 - x}" height="1" fill="${c}"/>`;
      x = x2;
    }
  });
  return `<svg class="v2-px"${extra} width="${w * k}" height="${rows.length * k}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}

const G = {
  A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.#### #.... #.... #.... #.... #.... .####', D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
  G: '.#### #.... #.... #.### #...# #...# .####', H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###', J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.', P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.', V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '.#. ##. .#. .#. .#. .#. ###',
  2: '.###. #...# ....# ...#. ..#.. .#... #####', 3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.', 9: '.###. #...# #...# .#### ....# ....# .###.',
  '.': '. . . . . . #', "'": '# # . . . . .', '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '-': '... ... ... ### ... ... ...', ' ': '.. .. .. .. .. .. ..',
};
// Headline type drawn as blocks. The words are also in the markup as text, so
// the page reads the same to a screen reader, a search engine and the build.
function pixelText(text, k, color, cls = '') {
  const rows = ['', '', '', '', '', '', ''];
  [...String(text).toUpperCase()].forEach((ch, i) => {
    const g = (G[ch] || G[' ']).split(' ');
    for (let r = 0; r < 7; r++) rows[r] += (i ? '.' : '') + g[r];
  });
  return `<span class="v2-ptext ${cls}"><span class="v2-sr">${esc(text)}</span>${blocks(rows, { '#': color }, k)}</span>`;
}

const ICON = {
  clock: [{ a: '#4ADE80', b: '#FFFFFF' }, ['...aaaaaa...', '..a......a..', '.a...b....a.', 'a....b.....a', 'a....b.....a', 'a....bbb...a', 'a..........a', 'a..........a', '.a........a.', '..a......a..', '...aaaaaa...']],
  eye: [{ a: '#4ADE80', b: '#86EFAC', c: '#FFFFFF' }, ['....aaaa....', '..aa....aa..', '.a...bb...a.', 'a...bccb...a', 'a...bccb...a', '.a...bb...a.', '..aa....aa..', '....aaaa....']],
  bolt: [{ a: '#F87171' }, ['......aa....', '.....aa.....', '....aa......', '...aa.......', '..aaaaaa....', '.....aa.....', '....aa......', '...aa.......', '..aa........', '..a.........']],
  shield: [{ a: '#4ADE80', b: '#064E1E', c: '#BBF7D0', '@': '#000000' }, ['@@@@@@@@@@@@', '@aaaaaaaaaa@', '@abbbbbbbba@', '@abbbbbbcba@', '@abbbbbccba@', '@abcbbccbba@', '@abccccbbba@', '.@abbcbbba@.', '.@abbbbbba@.', '..@abbbba@..', '...@aaaa@...', '....@@@@....']],
  speaker: [{ a: '#E5E7EB', b: '#9CA3AF', c: '#F87171' }, ['.....a...c..', '....aa....c.', '.bbaaa..c..c', '.bbaaa...c.c', '.bbaaa...c.c', '.bbaaa..c..c', '....aa....c.', '.....a...c..']],
  robot: [{ a: '#9CA3AF', b: '#0B0F17', c: '#FFFFFF', '@': '#000000' }, ['.....cc.....', '.....aa.....', '..aaaaaaaa..', '.aaaaaaaaaa.', '.aabbaabbaa.', '.aabbaabbaa.', 'caaaaaaaaaac', '.aaaaaaaaaa.', '.aaccccccaa.', '.aaaaaaaaaa.', '..aaaaaaaa..']],
};
const icon = (name, k, tint) => {
  const [pal, rows] = ICON[name];
  return blocks(rows, tint ? { ...pal, a: tint } : pal, k);
};

// ---------- copy ----------
const LEVEL = {
  5: { color: '#4FB3FF', ground: '#03101C', line: 'QUIET. TOO QUIET.' },
  4: { color: '#4ADE80', ground: '#03130A', line: 'THE MACHINES ARE WORKING LATE' },
  3: { color: '#FACC15', ground: '#151103', line: 'SOMETHING IS BEING TRAINED' },
  2: { color: '#FB923C', ground: '#170B03', line: 'CLEAR YOUR CALENDAR' },
  1: { color: '#F87171', ground: '#1A0505', line: 'NOBODY HAS SEEN THIS BEFORE' },
};
const FACE_BY_LEADER = { altman: 'altman', amodei: 'amodei', hassabis: 'hassabis', musk: 'musk', zuckerberg: 'zuck', huang: 'huang' };
const FACE_BY_LAB = { anthropic: 'amodei', 'google-deepmind': 'hassabis', openai: 'altman', meta: 'zuck', xai: 'musk' };
const BOSSES = ['altman', 'amodei', 'hassabis', 'musk', 'zuckerberg', 'huang'];

function hhmm(iso) { return String(iso || '').slice(11, 16) + 'Z'; }
function pct(p, d = 1) { return Number.isFinite(p) ? `${(p * 100).toFixed(d)}%` : '—'; }

export function render(ctx, { head }) {
  const { state } = ctx;
  const href = ctx.href;
  const img = (n) => href(`/img/art-${n}.webp`);
  const L = LEVEL[state.level] || LEVEL[4];
  const score = num(state.score, 1);
  const vs = ctx.vsYesterday;
  const delta = vs && Number.isFinite(vs.delta) ? vs.delta : state.delta_from_previous;
  const deltaTxt = Number.isFinite(delta) ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} ${vs && vs.basis === 'previous' ? 'SINCE LAST' : 'VS 24H AGO'}` : '';
  const sources = state.sources || [];
  const ok = sources.filter((s) => s.ok).length;

  // Breaking: the highest-scoring story of the last six hours, else the newest.
  const items = (ctx.news && ctx.news.items) || [];
  const now = Date.parse(state.generated_at);
  const fresh = items.filter((i) => now - Date.parse(i.published_at) < 6 * 3600e3);
  const top = (fresh.length ? fresh : items).slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];

  const routes = ctx.routes || {};
  const dock = [
    ['siren', 'INDEX', '/', true],
    ['radar', 'THE RACE', '/race.html'],
    ['news', 'NEWSROOM', '/news.html'],
    ['server', 'MACHINES', '/map.html'],
    routes.flock ? ['camera', 'CAMERAS', '/flock.html'] : null,
    routes.exploits ? ['bug', 'EXPLOITS', '/exploits.html'] : null,
    ['case', 'JOBS', '/jobs.html'],
  ].filter(Boolean);

  const leaders = ((ctx.leaders && ctx.leaders.leaders) || []).filter((l) => BOSSES.includes(l.id))
    .sort((a, b) => BOSSES.indexOf(a.id) - BOSSES.indexOf(b.id));
  const totals = (ctx.leaders && ctx.leaders.totals) || {};
  const bossStatus = (l) => {
    if (l.state === 'on_record') return { t: `ON RECORD ×${l.count}`, cls: 'hot' };
    if (l.watch_floor && l.watch_floor.state === 'dormant' && l.watch_floor.feed) return { t: 'GONE QUIET', cls: '' };
    return { t: 'NO LINE 7D', cls: '' };
  };

  const players = ((ctx.race && ctx.race.players) || []).slice().sort((a, b) => a.rank - b.rank).slice(0, 6);
  const maxRel = Math.max(1, ...players.map((p) => (p.shipping && p.shipping.github && p.shipping.github.releases_30d) || 0));
  const maxMs = Math.max(0.01, ...players.map((p) => (p.mindshare && p.mindshare.share) || 0));
  const lab = (p) => {
    const m = p.market || {};
    const ch = Number.isFinite(m.change_7d) ? m.change_7d : null;
    const rel = (p.shipping && p.shipping.github && p.shipping.github.releases_30d);
    const ms = p.mindshare && p.mindshare.share;
    const big = ch !== null && Math.abs(ch) >= 0.05;
    const pill = big
      ? { t: `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch * 100).toFixed(0)} PT ${ch > 0 ? 'SPIKE' : 'DROP'}`, cls: 'red' }
      : (rel >= 20 ? { t: '▲ SHIPPING', cls: 'amber' } : { t: '↘ QUIET', cls: 'blue' });
    const face = FACE_BY_LAB[p.id];
    const pic = face ? `<img class="v2-face sq" src="${img(face)}" width="64" height="64" alt="">` : icon('robot', 5);
    const bar = (label, val, w, color) => `<div class="v2-bar"><span>${label}</span><span class="t"><i style="width:${Math.max(0, Math.min(100, w)).toFixed(1)}%;background:${color}"></i></span><b>${val}</b></div>`;
    return `<article class="v2-lab${big ? ' hot' : ''}">
  <div class="hd">
    <div class="row">${pic}<div class="nm"><h3>${esc(p.name.toUpperCase())}</h3><span>${esc(p.principal || 'No single principal')}</span></div><span class="odds">${pct(m.probability)}</span></div>
    <div class="row sb"><span class="v2-pill ${pill.cls}">${pill.t}</span><span class="mv${big ? ' red' : ''}">${ch === null ? 'NO 7D REFERENCE' : `${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch * 100).toFixed(1)} PTS / 7D`}</span></div>
  </div>
  <div class="sig"><span class="cap">SIGNAL ANALYSIS</span>
    ${bar('ODDS', pct(m.probability), (m.probability || 0) * 100, '#3B5BFF')}
    ${bar('RELEASES 30D', Number.isFinite(rel) ? String(rel) : '—', ((rel || 0) / maxRel) * 100, '#3B5BFF')}
    ${bar('MINDSHARE', pct(ms), ((ms || 0) / maxMs) * 100, '#A855F7')}
  </div>
</article>`;
  };

  const hist = (ctx.history || []).slice(-12);
  const scores = hist.map((h) => h.score).filter(Number.isFinite);
  const lo = Math.max(0, Math.floor(Math.min(...scores, state.score) - 3));
  const hi = Math.min(100, Math.ceil(Math.max(...scores, state.score) + 2));
  const cols = hist.map((h, i) => {
    const hpc = ((h.score - lo) / Math.max(1, hi - lo)) * 100;
    const last = i === hist.length - 1;
    return `<i title="${num(h.score, 1)} at ${hhmm(h.t)}" style="height:${Math.max(4, hpc).toFixed(1)}%${last ? ';background:#BE185D;border-top-color:#EF4444' : ''}"></i>`;
  }).join('');

  const pillars = (state.pillars || []).map((p) => {
    const live = Number.isFinite(p.score) && !p.dark;
    const loud = live && p.score >= 65;
    return `<div class="v2-bar wide"><span class="pn">${esc(p.name.toUpperCase())}</span><span class="t"><i style="width:${live ? p.score.toFixed(1) : 0}%;background:${loud ? '#F87171' : '#3B5BFF'}"></i></span><b class="${live ? '' : 'mute'}">${live ? num(p.score, 1) : (p.dark ? 'DARK' : 'CALIB')}</b></div>`;
  }).join('');

  const body = `
<div class="v2">
<div class="v2-top"><div class="v2-wrap">
  <span class="v2-chip">${icon('clock', 2)}<span id="v2-clock" class="tnum">${esc(String(state.generated_at).slice(0, 10))} ${esc(hhmm(state.generated_at))}</span></span>
  <span class="tag red">LAST READING <b>${esc(hhmm(state.generated_at))}</b></span>
  <span class="v2-chip">${icon('eye', 2)}${ok}/${sources.length} SOURCES REPORTING</span>
  <span class="right">
    <a class="tag blue" href="${href('/history.html')}">HISTORY</a>
    <a class="tag violet" href="${href('/race.html')}">MARKETS</a>
    <span>STATUS: <b class="${state.degraded ? 'amber' : 'green'}">${state.degraded ? 'DEGRADED' : 'OPERATIONAL'}</b></span>
  </span>
</div></div>

<main class="v2-wrap v2-main" id="main">
  <div class="v2-brand">
    <img class="v2-art bob" src="${img('siren')}" width="112" height="112" alt="">
    <h1>${pixelText('AI SIREN INDEX', 8, '#FFFFFF', 'fit')}</h1>
  </div>
  <div class="v2-sub"><span>Superintelligence, watched hourly</span><span class="sep">|</span><a class="v2-btn sm" href="https://x.com/SIRENutf6">FOLLOW @SIRENutf6</a></div>

  <section class="hero">
    <div class="v2-banner" style="--lv:${L.color};--lvg:${L.ground}">
      ${icon('shield', 5, L.color)}
      <div class="col">
        ${pixelText(`SIREN ${state.level}`, 8, L.color, 'fit')}
        <span class="lbl">${esc(state.level_name)} · ${esc(L.line)}</span>
      </div>
      <div class="v2-score">
        ${pixelText(score, 6, '#FFFFFF')}
        <span class="lbl">OF 100${deltaTxt ? ` · ${deltaTxt}` : ''}</span>
      </div>
    </div>
  </section>

  ${top ? `<div class="v2-breaking"><span class="badge"><span class="blink">${icon('bolt', 2)}</span>BREAKING</span><a href="${esc(top.url)}" rel="noopener">${esc(top.title)}</a><span class="src">${esc(hhmm(top.published_at))} · ${esc(String(top.source).toUpperCase())}</span></div>` : ''}

  <nav class="v2-dock" aria-label="Rooms">
    ${dock.map(([n, label, p, on]) => `<a class="tile${on ? ' on' : ''}" href="${href(p)}"${on ? ' aria-current="page"' : ''}><img src="${img(n)}" width="56" height="56" alt="">${label}</a>`).join('')}
    <a class="tile" href="${href('/classic.html')}">${icon('speaker', 4)}FULL PANEL</a>
  </nav>

  <div class="v2-sec"><h2>${pixelText('THE BOSSES ON WATCH', 4, '#FFFFFF', 'fit')}</h2><span>ON THE RECORD THIS WEEK · ${totals.on_record ?? 0} OF ${totals.leaders ?? 15}</span></div>
  <div class="v2-bosses">
    ${leaders.map((l) => { const s = bossStatus(l); return `<a class="boss" href="${href('/leaders.html')}"><img class="v2-face" src="${img(FACE_BY_LEADER[l.id])}" width="96" height="96" alt=""><span class="nm">${esc(l.name.toUpperCase())}</span><span class="co">${esc(String(l.org).toUpperCase())}</span><span class="st ${s.cls}">${s.t}</span></a>`; }).join('')}
  </div>

  <div class="v2-sec"><h2>${pixelText(`${players.length} LABS MONITORED`, 4, '#FFFFFF', 'fit')}</h2><span>ODDS OF BEST MODEL IN 2026 · POLYMARKET</span></div>
  <div class="v2-labs">${players.map(lab).join('')}</div>

  <div class="v2-two">
    <div class="v2-card">
      <div class="row sb"><h3>${icon('shield', 3, '#4ADE80')}${pixelText('READINGS', 3, '#FFFFFF')}</h3><span class="live">LIVE</span></div>
      <div class="v2-cols" role="img" aria-label="Last ${hist.length} composite readings, ${scores.map((s) => num(s, 1)).join(', ')}">${cols}</div>
      <div class="row sb small"><span>${esc(hhmm(hist[0] && hist[0].t))}</span><span>AXIS ${lo}–${hi}</span><b>NOW · ${score}</b></div>
    </div>
    <div class="v2-card">
      <h3>${icon('speaker', 3)}${pixelText("WHAT'S LOUD", 3, '#FFFFFF')}</h3>
      <div class="stack">${pillars}</div>
    </div>
  </div>

  <div class="v2-cta">
    <img class="v2-art bob" src="${img('canary')}" width="88" height="88" alt="">
    <div class="col">${pixelText('TALLY IS STILL SINGING', 4, '#FFFFFF', 'fit')}<span>Our duty canary posts on X the hour the level moves. Nothing in between.</span></div>
    <a class="v2-btn" href="https://x.com/intent/follow?screen_name=SIRENutf6">FOLLOW @SIRENutf6 →</a>
  </div>

  <p class="v2-foot">SIREN counts how loud AI is, every hour, from public data. A count, not a forecast. Portraits and icons are generated illustrations, not photographs.
  <a href="${href('/methodology.html')}">How it works</a> · <a href="${href('/classic.html#vfy')}">Verify a reading</a> · <a href="${href('/classic.html')}">Full instrument panel</a> · <a href="${href('/about.html')}">About</a></p>
</main>
</div>
<script>(function(){var el=document.getElementById('v2-clock');if(!el)return;function p(n){return(n<10?'0':'')+n}function t(){var d=new Date();el.textContent=d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate())+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds())+'Z'}t();setInterval(t,1000)})();</script>`;

  return `<!doctype html>
<html lang="en">
${head.replace('</head>', `<style>${CSS}</style>\n</head>`)}
<body class="v2-body">${body}
</body>
</html>`;
}

const CSS = `
body.v2-body{margin:0;background:#000;color:#F3F4F6}
.v2{font-family:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;font-weight:500;font-size:16px;line-height:1.5;background:#000;color:#F3F4F6;min-height:100vh}
.v2 *{box-sizing:border-box}
.v2 a{color:#A5B4FC;text-decoration:none}.v2 a:hover{color:#E0E7FF}
.v2 a:focus-visible{outline:2px solid #4ADE80;outline-offset:2px}
.v2 h1,.v2 h2,.v2 h3{margin:0;font:inherit}
.v2-px{display:block;flex:none}
.v2-ptext{display:block;line-height:0;max-width:100%}
.v2-ptext.fit svg{max-width:100%;height:auto}
.v2-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.v2-wrap{max-width:1200px;margin:0 auto;padding-inline:20px}
.v2 .tnum,.v2-bar b,.v2-lab .odds{font-variant-numeric:tabular-nums}
.v2 .green{color:#4ADE80}.v2 .amber{color:#FACC15}
.v2-top{border-bottom:1px solid #232C3B;background:#0A0E16}
.v2-top .v2-wrap{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;padding-block:10px;font-size:13px;color:#D7DCE3}
.v2 .v2-chip{display:inline-flex;align-items:center;gap:8px}
.v2 .tag{padding:5px 10px;border:1px solid;font-weight:700}
.v2 .tag.red{border-color:#7F1D1D;background:#1A0707;color:#FCA5A5}.v2 .tag.red b{color:#fff}
.v2 .tag.blue{border-color:#3B4FD9;background:#111A44;color:#C7D2FE}
.v2 .tag.violet{border-color:#7E3AF2;background:#2A1240;color:#E9D5FF}
.v2-top .right{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.v2-main{padding-block:40px 72px;display:flex;flex-direction:column;gap:22px}
.v2-brand{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.v2-brand h1{flex:1 1 300px;min-width:0}
.v2-art{display:block;flex:none;max-width:none;object-fit:contain}
.v2-sub{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-left:134px;color:#D7DCE3;font-size:17px;letter-spacing:.12em;margin-top:-6px}
.v2-sub .sep{color:#4B5563}
.v2-btn{display:inline-flex;align-items:center;gap:8px;background:#4F46E5;color:#fff!important;font-weight:700;letter-spacing:.05em;min-height:48px;padding:0 22px}
.v2-btn.sm{min-height:0;padding:7px 12px;font-size:13px}
.v2-btn:hover{background:#6366F1}
.v2 .hero{margin:0;padding:0;border:0;background:none}
.v2-banner{border:2px solid var(--lv);background:var(--lvg);padding:26px 28px;display:flex;align-items:center;gap:22px;flex-wrap:wrap;animation:v2glow 3s ease-in-out infinite}
.v2-banner .col{display:flex;flex-direction:column;gap:12px;flex:1 1 320px;min-width:0}
.v2-banner .lbl{font-size:15px;font-weight:700;letter-spacing:.1em;color:var(--lv)}
.v2-banner .v2-score{margin-left:auto;border:0;padding:0;background:none;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
@keyframes v2glow{0%,100%{box-shadow:0 0 24px color-mix(in srgb,var(--lv) 15%,transparent)}50%{box-shadow:0 0 44px color-mix(in srgb,var(--lv) 35%,transparent)}}
.v2-breaking{border:1px solid #232C3B;background:#0A0E16;padding:10px 14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.v2-breaking .badge{display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border:1px solid #991B1B;background:#2A0B0B;color:#FECACA;font-weight:700;font-size:13px;letter-spacing:.08em}
.v2-breaking a{color:#fff;flex:1 1 300px;min-width:0}.v2-breaking a:hover{text-decoration:underline}
.v2-breaking .src{margin-left:auto;font-size:13px;color:#AEB7C3}
.v2 .blink{animation:v2blink 1.1s steps(2,start) infinite;display:inline-flex}
@keyframes v2blink{50%{opacity:.15}}
.v2-dock{border:1px solid #232C3B;background:#0A0E16;padding:12px;display:flex;flex-wrap:wrap;gap:10px}
.v2-dock .tile{width:112px;height:112px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:2px solid #2A3446;background:#111827;color:#D7DCE3;font-size:11px;font-weight:700;letter-spacing:.05em;text-align:center}
.v2-dock .tile img{display:block}
.v2-dock .tile:hover{border-color:#6366F1;color:#fff}
.v2-dock .tile.on{border-color:#6366F1;background:#1E1B4B;color:#fff}
.v2-sec{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px;margin-top:14px}
.v2-sec h2{flex:1 1 300px;min-width:0}
.v2-sec>span{font-size:13px;color:#AEB7C3}
.v2-face{display:block;flex:none;max-width:none;background:#000;border:2px solid #2A3446;border-radius:50%}
.v2-face.sq{border-radius:6px}
.v2-bosses{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.v2-bosses .boss{border:2px solid #232C3B;background:#0E131D;padding:16px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;color:#fff}
.v2-bosses .boss:hover{border-color:#6366F1;color:#fff}
.v2-bosses .nm{font-size:13px;font-weight:700}
.v2-bosses .co{font-size:12px;color:#AEB7C3}
.v2-bosses .st{font-size:11px;font-weight:700;padding:4px 8px;border:1px solid #3B4A63;color:#D7DCE3;letter-spacing:.06em}
.v2-bosses .st.hot{border-color:#DC2626;background:#2A0B0B;color:#FECACA}
.v2-labs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:16px}
.v2-lab{border:2px solid #232C3B;background:#0E131D;display:flex;flex-direction:column}
.v2-lab.hot{border-color:#DC2626;box-shadow:0 0 24px rgba(220,38,38,.2)}
.v2-lab .hd{padding:18px 20px 16px;display:flex;flex-direction:column;gap:14px}
.v2 .row{display:flex;align-items:center;gap:14px}.v2 .row.sb{justify-content:space-between}
.v2-lab .nm{min-width:0}
.v2-lab h3{font-size:18px;font-weight:700;letter-spacing:.03em;color:#fff}
.v2-lab .nm span{font-size:12px;color:#AEB7C3}
.v2-lab .odds{margin-left:auto;font-size:22px;font-weight:700;color:#fff}
.v2-lab .mv{font-size:13px;font-weight:700;color:#AEB7C3}.v2-lab .mv.red{color:#F87171}
.v2-pill{padding:7px 12px;border:1px solid;font-size:13px;font-weight:700;letter-spacing:.05em}
.v2-pill.red{border-color:#DC2626;background:#3A0D0D;color:#FECACA}
.v2-pill.amber{border-color:#B45309;background:#241505;color:#FDE68A}
.v2-pill.blue{border-color:#3B5BFF;background:#0E1540;color:#C7D2FE}
.v2-lab .sig{border-top:1px solid #232C3B;padding:16px 20px 20px;display:flex;flex-direction:column;gap:12px}
.v2 .cap{font-size:12px;font-weight:700;letter-spacing:.14em;color:#AEB7C3}
.v2-bar{display:grid;grid-template-columns:120px minmax(0,1fr) 64px;gap:10px;align-items:center;font-size:13px;color:#D7DCE3}
.v2-bar.wide{grid-template-columns:170px minmax(0,1fr) 64px}
.v2-bar .pn{font-weight:700}
.v2-bar .t{height:14px;background:#1A2232}.v2-bar .t i{display:block;height:14px}
.v2-bar b{text-align:right;color:#fff}.v2-bar b.mute{color:#AEB7C3}
.v2-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:16px}
.v2-card{border:2px solid #232C3B;background:#0E131D;padding:20px;display:flex;flex-direction:column;gap:14px}
.v2-card h3{display:flex;align-items:center;gap:10px}
.v2-card .stack{display:flex;flex-direction:column;gap:14px}
.v2-card .small{font-size:13px;color:#AEB7C3}.v2-card .small b{color:#fff}
.v2 .live{padding:3px 8px;background:#DC2626;color:#fff;font-size:12px;font-weight:700}
.v2-cols{display:flex;align-items:flex-end;gap:6px;height:150px;border-bottom:1px solid #2A3344}
.v2-cols i{flex:1 1 0;background:#3B5BFF;border-top:4px solid #3B5BFF}
.v2-cta{border:2px solid #4338CA;background:#0E1033;padding:24px 28px;display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.v2-cta .col{display:flex;flex-direction:column;gap:10px;flex:1 1 300px;min-width:0;color:#C7D2FE}
.v2-foot{margin:0;font-size:13px;color:#AEB7C3}
.v2 .bob{animation:v2bob 1.4s steps(2,start) infinite}
@keyframes v2bob{50%{transform:translateY(-4px)}}
@media (max-width:720px){
  .v2-sub{padding-left:0;font-size:14px}
  .v2-banner .v2-score{margin-left:0;align-items:flex-start}
  .v2-brand .v2-art{width:72px;height:72px}
  .v2-dock .tile{width:calc(33.33% - 7px);height:100px}
  .v2-bar.wide{grid-template-columns:120px minmax(0,1fr) 56px}
}
@media (prefers-reduced-motion:reduce){.v2 *{animation:none!important}}
`;
