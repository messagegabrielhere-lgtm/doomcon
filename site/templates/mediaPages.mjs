// SIREN's media rooms:
//   /radio.html    six stations of generated music, all made in the browser
//   /videos.html   every SIREN explainer video, with VideoObject data for search
// plus VIDEOS (the catalogue), INTRO_FOR (which video introduces which page)
// and videoBlock() so a feature page can carry its own video.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

// Tip #367: video-card H3s / VideoObject names are question-shaped (mirrored in FAQ §3.3).
export const VIDEOS = [
  { id: 'road-to-si', file: 'siren-road-to-si', title: 'What is the road to superintelligence from 1950 to 2056?', secs: 101, station: 'SIREN FM',
    blurb: 'From Turing’s question to ChatGPT and AI Nobel prizes, then one plausible path to 2056. The future part is speculation, not a prediction.', page: '/history.html', pageLabel: 'What is the history of AI risk?' },
  { id: 'explainer', file: 'siren-explainer', title: 'What is SIREN in 42 seconds?', secs: 42, station: 'SIREN FM',
    blurb: 'The hourly reading, the five levels, and the rooms worth opening.', page: '/', pageLabel: 'AI activity index today · AI activity level today · SIREN' },
  { id: 'tally', file: 'siren-tally', title: 'Who is Tally, SIREN’s duty canary?', secs: 22, station: 'CANARY CHIPTUNE',
    blurb: 'Five moods for five levels, and why a canary watches AI.', page: '/tally.html', pageLabel: 'Who is Tally, the SIREN duty canary?' },
  { id: 'skynet', file: 'siren-skynet', title: 'How loud is AI right now?', secs: 26, station: 'JUDGMENT DAY',
    blurb: 'The five pillars behind the number: compute, markets, models, attention, policy.', page: '/methodology.html', pageLabel: 'How the SIREN AI activity index is computed · methodology' },
  { id: 'si-ready', file: 'siren-si-ready', title: 'How can regular people prepare for superintelligence?', secs: 26, station: 'BUNKER AMBIENT',
    blurb: 'Four calm steps: learn the tools, build a cushion, verify, stay human.', page: '/si-ready.html', pageLabel: 'Ready for superintelligence?' },
  { id: 'ai-proof-job', file: 'siren-ai-proof-job', title: 'How do you AI-proof your job in five moves?', secs: 26, station: 'DATA RAIN LO-FI',
    blurb: 'Map your tasks, automate yourself first, own the judgement.', page: '/ai-proof-job.html', pageLabel: 'How do I AI-proof my job?' },
  { id: 'supply-drop', file: 'siren-supply-drop', title: 'What is in the SIREN bunker kit supply drop?', secs: 22, station: 'CANARY CHIPTUNE',
    blurb: 'Six crates of gear, 50 free tools and a prepper checklist.', page: '/bunker-kit.html', pageLabel: 'What free tools belong in a bunker kit?' },
];

// Which video plays in the corner the first time a visitor lands on a page.
export const INTRO_FOR = {
  'tally.html': 'siren-tally', 'staff.html': 'siren-tally', 'bets.html': 'siren-tally', 'desk.html': 'siren-tally',
  'si-ready.html': 'siren-si-ready', 'breakthroughs.html': 'siren-si-ready', 'bliss.html': 'siren-si-ready', 'for-people.html': 'siren-si-ready',
  'ai-proof-job.html': 'siren-ai-proof-job', 'jobs.html': 'siren-ai-proof-job', 'careers.html': 'siren-ai-proof-job',
  'bunker-kit.html': 'siren-supply-drop', 'prepper-checklist.html': 'siren-supply-drop', 'bug-out-land.html': 'siren-supply-drop',
  'history.html': 'siren-road-to-si', 'methodology.html': 'siren-skynet', 'classic.html': 'siren-skynet', 'ai-doomsday-clock.html': 'siren-skynet',
  'race.html': 'siren-skynet', 'monitor.html': 'siren-skynet', 'dispatch.html': 'siren-skynet', 'news.html': 'siren-skynet', 'changelog.html': 'siren-skynet',
};

// Tip #370: station-card H3s are question-shaped and mirrored in FAQ (§3.3).
const STATIONS = [
  ['siren', 'SIREN FM', 'What does SIREN FM play?', 'Dark synth whose tempo and tension follow the live level.', '#4ADE80'],
  ['synthwave', 'SKYNET SYNTHWAVE', 'What does Skynet Synthwave play?', 'Neon drive music for the machine age. Four on the floor.', '#EC4899'],
  ['ambient', 'BUNKER AMBIENT', 'What does Bunker Ambient play?', 'Slow drones and distant bells for the long wait underground.', '#4FB3FF'],
  ['chip', 'CANARY CHIPTUNE', 'What does Canary Chiptune play?', '8-bit bleeps straight from Tally’s perch.', '#FFD23F'],
  ['industrial', 'JUDGMENT DAY', 'What does Judgment Day play?', 'Industrial march. Metal on metal. Clanging alarms.', '#F87171'],
  ['lofi', 'DATA RAIN LO-FI', 'What does Data Rain Lo-Fi play?', 'Swung beats and soft chords to watch the index to.', '#A5B4FC'],
];

const CSS = `<style>
.md{max-width:1040px}
.md .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px}
.md h2{font:700 1.3rem/1.2 var(--sans);margin:34px 0 10px;color:var(--ink)}
.md p{color:var(--ink-dim);line-height:1.6}
.md-st{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin:16px 0}
.md-st button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:18px;border:2px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;min-height:130px}
.md-st button:hover,.md-st button:focus-visible{border-color:var(--c)}
.md-st button:focus-visible{outline:2px solid #E2A03B;outline-offset:2px}
.md-st button[aria-pressed=true]{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 30%,transparent)}
.md-st b,.md-st h3{font:700 15px/1.2 var(--mono);letter-spacing:.08em;color:var(--c);margin:0}
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
.md-faq{margin:34px 0 12px;max-width:62ch}
.md-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.md-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.md-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.md-faq-key{margin-top:var(--s-4,1rem)!important}
</style>`;

const xShare = (ctx, text, path) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ctx.url(path))}&via=SIRENutf6`;
const media = (ctx, f) => esc(ctx.href(`/media/${f}`));

const VIDEOS_PATH = '/videos.html';
const videosQTitle = 'What free AI explainer videos does SIREN publish?';

/** One video card; used on /videos.html and on each feature page. */
export function videoBlock(ctx, id, { heading = true } = {}) {
  const v = VIDEOS.find((x) => x.id === id);
  if (!v) return '';
  return `<figure class="md-vid" style="margin:18px 0;max-width:760px;border:1px solid var(--rule,#232C3B);border-radius:6px;overflow:hidden;background:#0E131D">
  <video style="display:block;width:100%;height:auto;aspect-ratio:16/9;background:#000" controls preload="none" playsinline width="1280" height="720" poster="${media(ctx, `${v.file}-poster.jpg`)}"><source src="${media(ctx, `${v.file}.webm`)}" type="video/webm"><source src="${media(ctx, `${v.file}.mp4`)}" type="video/mp4"></video>
  <div style="padding:10px 14px">${heading ? `<h3 style="margin:0 0 4px;font-size:1rem">${esc(v.title)}</h3>` : ''}<p style="margin:0 0 4px">${esc(v.blurb)}</p><small style="font:600 11px/1.3 var(--mono,monospace);letter-spacing:.1em;opacity:.7">${v.secs} SEC · SOUNDTRACK: ${esc(v.station)} · <a href="${esc(ctx.href('/videos.html'))}">${esc(videosQTitle)}</a></small></div>
</figure>${videoLd(ctx, v)}`;
}

function videoLd(ctx, v) {
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoObject', name: v.title, description: v.blurb,
    thumbnailUrl: [ctx.url(`/media/${v.file}-poster.jpg`)], uploadDate: '2026-10-07', duration: `PT${v.secs}S`,
    contentUrl: ctx.url(`/media/${v.file}.mp4`), embedUrl: ctx.url(v.page) }).replace(/</g, '\\u003c')}</script>`;
}

export function videos(ctx) {
  const cards = VIDEOS.map((v) => `<article class="md-vid" id="v-${esc(v.id)}">
  <video controls preload="none" playsinline width="1280" height="720" poster="${media(ctx, `${v.file}-poster.jpg`)}"><source src="${media(ctx, `${v.file}.webm`)}" type="video/webm"><source src="${media(ctx, `${v.file}.mp4`)}" type="video/mp4"></video>
  <div><h3>${esc(v.title)}</h3><p>${esc(v.blurb)}</p><small>${v.secs} SEC · 📻 ${esc(v.station)}</small>
  <p><a href="${esc(ctx.href(v.page))}">${esc(v.pageLabel)} →</a> · <a href="${esc(xShare(ctx, v.title, VIDEOS_PATH))}" target="_blank" rel="noopener">𝕏 Post</a> · <a href="${media(ctx, `${v.file}.mp4`)}" download>Download MP4</a></p></div>
</article>`).join('');
  // FAQ answers restate lede / body copy only.
  // Refuse: videos-as-forecast, doom-probability, SI-date-as-SIREN-claim.
  const faq = [
    [videosQTitle,
      'Short explainers about AI, the index and how to get ready, each scored by a different SIREN Radio station. Free to share with a link back. Captions are on screen, so they work on mute.'],
    ['Do the videos work on mute?',
      'Captions are on screen, so they work on mute.'],
    ['Can I share them?',
      'Free to share with a link back.'],
    ['Where is the soundtrack music?',
      'Want the music on its own — What free music does SIREN Radio play? Clips of the AI bosses themselves: Where can you find real clips of AI leaders?'],
    // Tip #367: video-card H3s are question-shaped and mirrored in FAQ (§3.3).
    ...VIDEOS.map((v) => [v.title, v.blurb]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<section class="md">
  <p class="eyebrow">SIREN TV</p><h1 class="bp__h1">${esc(videosQTitle)}</h1>
  <p class="lede">Short explainers about AI, the index and how to get ready, each scored by a different SIREN Radio station. Free to share with a link back. Captions are on screen, so they work on mute.</p>
  <div class="md-vids">${cards}</div>
  <p>Want the music on its own — <a href="${esc(ctx.href('/radio.html'))}">What free music does SIREN Radio play?</a> Clips of the AI bosses themselves: <a href="${esc(ctx.href('/elon.html'))}">Where can you find real clips of AI leaders?</a></p>
  <section class="md-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="md-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/radio.html'))}">What free music does SIREN Radio play?</a>
      · <a href="${esc(ctx.href('/elon.html'))}">Where can you find real clips of AI leaders?</a>
      · <a href="${esc(ctx.href('/live.html'))}">What AI is on TV and radio right now?</a>.</p>
  </section>
</section>
${VIDEOS.map((v) => videoLd(ctx, v)).join('')}`;
  return page({
    ctx,
    path: VIDEOS_PATH,
    title: `${videosQTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${videosQTitle}`,
    description: `${videosQTitle} Short explainers: how loud AI is right now, Tally the duty canary, preparing for superintelligence, AI-proofing your job and the bunker kit.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: videosQTitle,
        description: 'Short SIREN explainer videos about AI, the index and how to get ready, each scored by a SIREN Radio station. Free to share with a link back.',
        url: ctx.url(VIDEOS_PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: videosQTitle, path: VIDEOS_PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}

const RADIO_PATH = '/radio.html';
const radioQTitle = 'What free music does SIREN Radio play?';

export function radio(ctx, voice) {
  const L = ctx.state && Number.isFinite(ctx.state.level) ? ctx.state.level : 4;
  // Tip #322: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const voiceQ = 'What is Tally’s voice update?';
  const hearQ = 'Where can I hear these stations in videos?';
  const voiceNote = voice && voice.audio
    ? `Recorded ${String(voice.generated_at || '').slice(0, 16).replace('T', ' ')} UTC.`
    : 'Read aloud by your browser’s own voice until Tally’s recorded voice is switched on.';
  const st = STATIONS.map(([id, name, q, tag, c], i) => `<button type="button" data-siren-station="${id}" aria-pressed="false" style="--c:${c}" aria-label="${esc(name)}"><h3>${String(i + 1).padStart(2, '0')} · ${esc(q)}</h3><span>${esc(tag)}</span><i>TAP TO TUNE IN</i></button>`).join('');
  const voiceBox = `<h2>${esc(voiceQ)}</h2>
  <div class="md-voice" id="tally-voice">
    <button type="button" class="md-btn" data-voice>🔊 HEAR TALLY</button>
    <blockquote data-voice-text>${esc(voice && voice.text ? voice.text : `SIREN ${L}. ${ctx.state ? `The score is ${Number(ctx.state.score).toFixed(1)} out of 100.` : ''} I'm keeping watch.`)}</blockquote>
  </div>
  <p style="font-size:13px">${esc(voiceNote)}</p>
  <script>(function(){var b=document.querySelector('[data-voice]');if(!b)return;var src=${JSON.stringify(voice && voice.audio ? ctx.href(`/media/${voice.audio}`) : '')};var a=null;
  b.addEventListener('click',function(){if(src){if(!a){a=new Audio(src)}if(a.paused){a.play();b.textContent='⏸ PAUSE'}else{a.pause();b.textContent='🔊 HEAR TALLY'}a.onended=function(){b.textContent='🔊 HEAR TALLY'};return}
  if(!('speechSynthesis' in window)){b.textContent='NO VOICE IN THIS BROWSER';return}if(speechSynthesis.speaking){speechSynthesis.cancel();b.textContent='🔊 HEAR TALLY';return}
  var u=new SpeechSynthesisUtterance(document.querySelector('[data-voice-text]').textContent);u.rate=1.05;u.pitch=1.5;u.onend=function(){b.textContent='🔊 HEAR TALLY'};speechSynthesis.speak(u);b.textContent='⏹ STOP'})})();</script>`;
  // FAQ answers restate lede / body copy only.
  // Refuse: Radio-as-index-input, doom-probability, forecast claims.
  const faq = [
    [radioQTitle,
      'Six stations of original music, composed live in your browser while you read. No audio files, no ads, no licence fees. Every page plays its own tune on whichever station you pick, and the music follows you from page to page until you switch it off.'],
    ['Are there audio files, ads or licence fees?',
      'No audio files, no ads, no licence fees.'],
    ['How do I change stations?',
      'The 📻 button in the bar at the bottom of every page flips to the next station. On a phone, check the ring/silent switch if you hear nothing.'],
    [voiceQ, voiceNote],
    [hearQ,
      'Every SIREN video is scored by one of these stations. See What free AI explainer videos does SIREN publish?'],
    // Tip #370: station-card H3s are question-shaped and mirrored in FAQ (§3.3).
    ...STATIONS.map(([, , q, tag]) => [q, tag]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}
<section class="md">
  <p class="eyebrow">ON AIR 24/7</p><h1 class="bp__h1">${esc(radioQTitle)}</h1>
  <p class="lede">Six stations of original music, composed live in your browser while you read. No audio files, no ads, no licence fees. Every page plays its own tune on whichever station you pick, and the music follows you from page to page until you switch it off.</p>
  <div class="md-now"><span class="md-eq" id="md-eq" aria-hidden="true"><s></s><s></s><s></s><s></s><s></s><s></s></span><span>NOW PLAYING: <b data-siren-now>SIREN FM</b></span>
    <button type="button" class="md-btn" data-siren-radio data-level="${L}" aria-pressed="false">♪ OFF</button>
    <button type="button" class="md-btn ghost" data-siren-station="">📻 NEXT STATION</button></div>
  <div class="md-st">${st}</div>
  <p>The 📻 button in the bar at the bottom of every page flips to the next station. On a phone, check the ring/silent switch if you hear nothing.</p>
  ${voiceBox}
  <h2>${esc(hearQ)}</h2>
  <p>Every SIREN video is scored by one of these stations. See <a href="${esc(ctx.href('/videos.html'))}">What free AI explainer videos does SIREN publish?</a></p>
  <p><a class="md-btn ghost" href="${esc(xShare(ctx, 'SIREN Radio: six stations of music generated live in your browser while you watch AI.', RADIO_PATH))}" target="_blank" rel="noopener">𝕏 POST SIREN RADIO</a></p>
  <section class="md-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="md-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/videos.html'))}">What free AI explainer videos does SIREN publish?</a>
      · <a href="${esc(ctx.href('/games.html'))}">What free AI games can you play on SIREN?</a>
      · <a href="${esc(ctx.href('/live.html'))}">What AI is on TV and radio right now?</a>
      · <a href="${esc(ctx.href('/elon.html'))}">Where can you find real clips of AI leaders?</a>.</p>
  </section>
</section>
<script>setInterval(function(){var e=document.getElementById('md-eq');if(e&&window.SirenRadio)e.classList.toggle('on',!!SirenRadio.playing)},500)</script>`;
  return page({
    ctx,
    path: RADIO_PATH,
    title: `${radioQTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${radioQTitle}`,
    description: `${radioQTitle} Six stations of original music generated live in your browser: dark synth, synthwave, bunker ambient, chiptune, industrial and lo-fi. No ads.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: radioQTitle,
        description: 'Six stations of original music composed live in your browser. No audio files, no ads, no licence fees.',
        url: ctx.url(RADIO_PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: radioQTitle, path: RADIO_PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}
