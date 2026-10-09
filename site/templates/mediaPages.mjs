// SIREN's media rooms:
//   /radio.html    six stations of generated music, all made in the browser
//   /videos.html   every SIREN explainer video, with VideoObject data for search
// plus VIDEOS (the catalogue), INTRO_FOR (which video introduces which page)
// and videoBlock() so a feature page can carry its own video.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

export const VIDEOS = [
  { id: 'road-to-si', file: 'siren-road-to-si', title: 'The road to superintelligence: 1950 to 2056 in 101 seconds', secs: 101, station: 'SIREN FM',
    blurb: 'From Turing’s question to ChatGPT and AI Nobel prizes, then one plausible path to 2056. The future part is speculation, not a prediction.', page: '/history.html' },
  { id: 'explainer', file: 'siren-explainer', title: 'What is SIREN? A 42-second tour', secs: 42, station: 'SIREN FM',
    blurb: 'The hourly reading, the five levels, and the rooms worth opening.', page: '/' },
  { id: 'tally', file: 'siren-tally', title: 'Meet Tally, SIREN’s duty canary', secs: 22, station: 'CANARY CHIPTUNE',
    blurb: 'Five moods for five levels, and why a canary watches AI.', page: '/tally.html' },
  { id: 'skynet', file: 'siren-skynet', title: 'Skynet status report: how loud is AI right now?', secs: 26, station: 'JUDGMENT DAY',
    blurb: 'The five pillars behind the number: compute, markets, models, attention, policy.', page: '/methodology.html' },
  { id: 'si-ready', file: 'siren-si-ready', title: 'How regular people can prepare for superintelligence', secs: 26, station: 'BUNKER AMBIENT',
    blurb: 'Four calm steps: learn the tools, build a cushion, verify, stay human.', page: '/si-ready.html' },
  { id: 'ai-proof-job', file: 'siren-ai-proof-job', title: 'AI-proof your job in five moves', secs: 26, station: 'DATA RAIN LO-FI',
    blurb: 'Map your tasks, automate yourself first, own the judgement.', page: '/ai-proof-job.html' },
  { id: 'supply-drop', file: 'siren-supply-drop', title: 'Supply drop: the SIREN bunker kit', secs: 22, station: 'CANARY CHIPTUNE',
    blurb: 'Six crates of gear, 50 free tools and a prepper checklist.', page: '/bunker-kit.html' },
];

// Which video plays in the corner the first time a visitor lands on a page.
export const INTRO_FOR = {
  'tally.html': 'siren-tally', 'staff.html': 'siren-tally', 'bets.html': 'siren-tally', 'desk.html': 'siren-tally',
  'si-ready.html': 'siren-si-ready', 'breakthroughs.html': 'siren-si-ready', 'bliss.html': 'siren-si-ready',
  'ai-proof-job.html': 'siren-ai-proof-job', 'jobs.html': 'siren-ai-proof-job', 'careers.html': 'siren-ai-proof-job',
  'bunker-kit.html': 'siren-supply-drop', 'prepper-checklist.html': 'siren-supply-drop', 'bug-out-land.html': 'siren-supply-drop',
  'history.html': 'siren-road-to-si', 'methodology.html': 'siren-skynet', 'classic.html': 'siren-skynet', 'ai-doomsday-clock.html': 'siren-skynet',
  'race.html': 'siren-skynet', 'monitor.html': 'siren-skynet', 'dispatch.html': 'siren-skynet', 'news.html': 'siren-skynet', 'changelog.html': 'siren-skynet',
};

const STATIONS = [
  ['siren', 'SIREN FM', 'Dark synth whose tempo and tension follow the live level.', '#4ADE80'],
  ['synthwave', 'SKYNET SYNTHWAVE', 'Neon drive music for the machine age. Four on the floor.', '#EC4899'],
  ['ambient', 'BUNKER AMBIENT', 'Slow drones and distant bells for the long wait underground.', '#4FB3FF'],
  ['chip', 'CANARY CHIPTUNE', '8-bit bleeps straight from Tally’s perch.', '#FFD23F'],
  ['industrial', 'JUDGMENT DAY', 'Industrial march. Metal on metal. Clanging alarms.', '#F87171'],
  ['lofi', 'DATA RAIN LO-FI', 'Swung beats and soft chords to watch the index to.', '#A5B4FC'],
];

const CSS = `<style>
.md{max-width:1040px}
.md .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px}
.md h2{font:700 1.3rem/1.2 var(--sans);margin:34px 0 10px;color:var(--ink)}
.md p{color:var(--ink-dim);line-height:1.6}
.md-st{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin:16px 0}
.md-st button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:18px;border:2px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;min-height:130px}
.md-st button:hover,.md-st button:focus-visible{border-color:var(--c)}
.md-st button[aria-pressed=true]{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 30%,transparent)}
.md-st b{font:700 15px/1.2 var(--mono);letter-spacing:.08em;color:var(--c)}
.md-st span{color:var(--ink-dim);font-size:14px;line-height:1.45}
.md-st i{font:600 11px/1 var(--mono);letter-spacing:.12em;color:var(--ink-faint,#6B7686);font-style:normal;margin-top:auto}
.md-st button[aria-pressed=true] i::before{content:"● ON AIR · ";color:var(--c)}
.md-eq{display:flex;gap:3px;align-items:flex-end;height:28px}.md-eq s{display:block;width:5px;background:var(--accent,#4ADE80);height:20%;text-decoration:none}
.md-eq.on s{animation:mdq 0.9s ease-in-out infinite}.md-eq s:nth-child(2n){animation-delay:.2s}.md-eq s:nth-child(3n){animation-delay:.45s}
@keyframes mdq{50%{height:100%}}
@media (prefers-reduced-motion:reduce){.md-eq.on s{animation:none;height:60%}}
.md-now{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--rule);border-radius:6px;background:#000}
.md-btn{display:inline-block;padding:11px 16px;border-radius:4px;background:var(--accent,#4ADE80);color:#000;font:700 13px/1 var(--mono);letter-spacing:.08em;text-decoration:none;border:0;cursor:pointer}
.md-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--rule)}
.md-vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin:16px 0}
.md-vid{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;overflow:hidden;display:flex;flex-direction:column}
.md-vid video{display:block;width:100%;height:auto;background:#000;aspect-ratio:16/9}
.md-vid div{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.md-vid h3{margin:0;font:700 1rem/1.3 var(--sans);color:var(--ink)}
.md-vid p{margin:0;font-size:14px}
.md-vid small{font:600 11px/1.3 var(--mono);letter-spacing:.1em;color:var(--ink-faint,#6B7686)}
.md-vid a{color:var(--accent,#4ADE80)}
.md-voice{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:16px;border:1px solid var(--rule);border-radius:6px;background:var(--bg-raised,#0E131D)}
.md-voice blockquote{margin:0;flex:1 1 280px;color:var(--ink);font-size:15px;line-height:1.5}
</style>`;

const xShare = (ctx, text, path) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ctx.url(path))}&via=SIRENutf6`;
const media = (ctx, f) => esc(ctx.href(`/media/${f}`));

/** One video card; used on /videos.html and on each feature page. */
export function videoBlock(ctx, id, { heading = true } = {}) {
  const v = VIDEOS.find((x) => x.id === id);
  if (!v) return '';
  return `<figure class="md-vid" style="margin:18px 0;max-width:760px;border:1px solid var(--rule,#232C3B);border-radius:6px;overflow:hidden;background:#0E131D">
  <video style="display:block;width:100%;height:auto;aspect-ratio:16/9;background:#000" controls preload="none" playsinline width="1280" height="720" poster="${media(ctx, `${v.file}-poster.jpg`)}"><source src="${media(ctx, `${v.file}.webm`)}" type="video/webm"><source src="${media(ctx, `${v.file}.mp4`)}" type="video/mp4"></video>
  <div style="padding:10px 14px">${heading ? `<h3 style="margin:0 0 4px;font-size:1rem">${esc(v.title)}</h3>` : ''}<p style="margin:0 0 4px">${esc(v.blurb)}</p><small style="font:600 11px/1.3 var(--mono,monospace);letter-spacing:.1em;opacity:.7">${v.secs} SEC · SOUNDTRACK: ${esc(v.station)} · <a href="${esc(ctx.href('/videos.html'))}">ALL VIDEOS</a></small></div>
</figure>${videoLd(ctx, v)}`;
}

function videoLd(ctx, v) {
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoObject', name: v.title, description: v.blurb,
    thumbnailUrl: [ctx.url(`/media/${v.file}-poster.jpg`)], uploadDate: '2026-10-07', duration: `PT${v.secs}S`,
    contentUrl: ctx.url(`/media/${v.file}.mp4`), embedUrl: ctx.url(v.page) }).replace(/</g, '\\u003c')}</script>`;
}

export function videos(ctx) {
  const cards = VIDEOS.map((v) => `<article class="md-vid">
  <video controls preload="none" playsinline width="1280" height="720" poster="${media(ctx, `${v.file}-poster.jpg`)}"><source src="${media(ctx, `${v.file}.webm`)}" type="video/webm"><source src="${media(ctx, `${v.file}.mp4`)}" type="video/mp4"></video>
  <div><h3>${esc(v.title)}</h3><p>${esc(v.blurb)}</p><small>${v.secs} SEC · 📻 ${esc(v.station)}</small>
  <p><a href="${esc(ctx.href(v.page))}">Open the page →</a> · <a href="${esc(xShare(ctx, v.title, '/videos.html'))}" target="_blank" rel="noopener">𝕏 Post</a> · <a href="${media(ctx, `${v.file}.mp4`)}" download>Download MP4</a></p></div>
</article>`).join('');
  const main = `${CSS}
<section class="md">
  <p class="eyebrow">SIREN TV</p><h1 class="bp__h1">Videos</h1>
  <p class="lede">Short explainers about AI, the index and how to get ready, each scored by a different SIREN Radio station. Free to share with a link back. Captions are on screen, so they work on mute.</p>
  <div class="md-vids">${cards}</div>
  <p>Want the music on its own? <a href="${esc(ctx.href('/radio.html'))}">Tune in to SIREN Radio</a>. Clips of the AI bosses themselves live in <a href="${esc(ctx.href('/elon.html'))}">Real Clips</a>.</p>
</section>
${VIDEOS.map((v) => videoLd(ctx, v)).join('')}`;
  return page({ ctx, path: '/videos.html', title: `Videos: AI explained in 30 seconds · ${brand.NAME}`,
    description: 'Short SIREN explainer videos: how loud AI is right now, Tally the duty canary, preparing for superintelligence, AI-proofing your job and the bunker kit.', main });
}

export function radio(ctx, voice) {
  const L = ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : 4;
  const st = STATIONS.map(([id, name, tag, c], i) => `<button type="button" data-siren-station="${id}" aria-pressed="false" style="--c:${c}"><b>${String(i + 1).padStart(2, '0')} · ${esc(name)}</b><span>${esc(tag)}</span><i>TAP TO TUNE IN</i></button>`).join('');
  const voiceBox = `<h2>Tally’s voice update</h2>
  <div class="md-voice" id="tally-voice">
    <button type="button" class="md-btn" data-voice>🔊 HEAR TALLY</button>
    <blockquote data-voice-text>${esc(voice && voice.text ? voice.text : `SIREN ${L}. ${ctx.state ? `The score is ${Number(ctx.state.score).toFixed(1)} out of 100.` : ''} I'm keeping watch.`)}</blockquote>
  </div>
  <p style="font-size:13px">${voice && voice.audio ? `Recorded ${esc(String(voice.generated_at || '').slice(0, 16).replace('T', ' '))} UTC.` : 'Read aloud by your browser’s own voice until Tally’s recorded voice is switched on.'}</p>
  <script>(function(){var b=document.querySelector('[data-voice]');if(!b)return;var src=${JSON.stringify(voice && voice.audio ? ctx.href(`/media/${voice.audio}`) : '')};var a=null;
  b.addEventListener('click',function(){if(src){if(!a){a=new Audio(src)}if(a.paused){a.play();b.textContent='⏸ PAUSE'}else{a.pause();b.textContent='🔊 HEAR TALLY'}a.onended=function(){b.textContent='🔊 HEAR TALLY'};return}
  if(!('speechSynthesis' in window)){b.textContent='NO VOICE IN THIS BROWSER';return}if(speechSynthesis.speaking){speechSynthesis.cancel();b.textContent='🔊 HEAR TALLY';return}
  var u=new SpeechSynthesisUtterance(document.querySelector('[data-voice-text]').textContent);u.rate=1.05;u.pitch=1.5;u.onend=function(){b.textContent='🔊 HEAR TALLY'};speechSynthesis.speak(u);b.textContent='⏹ STOP'})})();</script>`;
  const main = `${CSS}
<section class="md">
  <p class="eyebrow">ON AIR 24/7</p><h1 class="bp__h1">SIREN Radio</h1>
  <p class="lede">Six stations of original music, composed live in your browser while you read. No audio files, no ads, no licence fees. Every page plays its own tune on whichever station you pick, and the music follows you from page to page until you switch it off.</p>
  <div class="md-now"><span class="md-eq" id="md-eq" aria-hidden="true"><s></s><s></s><s></s><s></s><s></s><s></s></span><span>NOW PLAYING: <b data-siren-now>SIREN FM</b></span>
    <button type="button" class="md-btn" data-siren-radio data-level="${L}" aria-pressed="false">♪ OFF</button>
    <button type="button" class="md-btn ghost" data-siren-station="">📻 NEXT STATION</button></div>
  <div class="md-st">${st}</div>
  <p>The 📻 button in the bar at the bottom of every page flips to the next station. On a phone, check the ring/silent switch if you hear nothing.</p>
  ${voiceBox}
  <h2>Hear it in the videos</h2>
  <p>Every <a href="${esc(ctx.href('/videos.html'))}">SIREN video</a> is scored by one of these stations.</p>
  <p><a class="md-btn ghost" href="${esc(xShare(ctx, 'SIREN Radio: six stations of music generated live in your browser while you watch AI.', '/radio.html'))}" target="_blank" rel="noopener">𝕏 POST SIREN RADIO</a></p>
</section>
<script>setInterval(function(){var e=document.getElementById('md-eq');if(e&&window.SirenRadio)e.classList.toggle('on',!!SirenRadio.playing)},500)</script>`;
  return page({ ctx, path: '/radio.html', title: `SIREN Radio: six stations of generated music · ${brand.NAME}`,
    description: 'SIREN Radio plays six stations of original music generated live in your browser: dark synth, synthwave, bunker ambient, chiptune, industrial and lo-fi.', main });
}
