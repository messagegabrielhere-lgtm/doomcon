// public/post-sheet.html — the manual posting console.
//
// There is no X API in v1, so a human pastes every post. The whole value of this
// page is the difference between that taking fifteen seconds and taking five
// minutes: preview, copy, download, tick, next. It is modelled on the PIN-SHEET
// pattern that already works for this operator's Pinterest run, where the app
// crashes under automation and the only reliable path is a human with a good
// sheet in front of them.
//
// NOT LINKED, NOT INDEXED. pizzint published its whole internal roadmap by
// listing /social-admin, /screenshot-export and friends in robots.txt — a
// Disallow line is a public announcement that the path exists. This page ships
// a noindex meta tag instead, and site/build.mjs must keep it out of
// sitemap.xml and out of every nav.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildPosts, charCount, X_CHAR_LIMIT, URL_TLDS, BANNED_FUTURE_WORDS, BANNED_FUTURE_EXTENDED, BANNED_FUTURE_PHRASES } from '../collector/posts.mjs';
import { renderCards, loadBrand, resolveDelta, DEFAULT_BRAND, levelMeta, isUnavailable, utcStamp } from '../collector/card.mjs';

const KIND_LABEL = {
  daily: 'Daily state',
  escalation: 'Level escalation',
  deescalation: 'Level stand-down',
  'pillar-spike': 'Pillar spike',
  'notable-input': 'Notable input',
  weekly: 'Weekly summary',
  milestone: 'Record',
  degraded: 'Degraded honesty',
};

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Embedding JSON in a <script> is where XSS-shaped bugs live even on a private
// page: "</script>" inside a string ends the block. Neutralise "<" outright.
function jsonScript(value) {
  // U+2028 and U+2029 are legal inside a JSON string but terminate a line of
  // JavaScript, so an inline <script> breaks on them. Built with fromCharCode
  // so this source file never contains the raw characters itself -- an earlier
  // version did, and it broke the module on import.
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}

const STYLES = `
:root{--bg:#07080a;--panel:#0d1117;--panel2:#11161d;--rule:#21262d;--ink:#e6edf3;--dim:#8b949e;--faint:#6e7681;--ok:#2ea043;--warn:#d29922;--bad:#f85149;--accent:#2f81f7}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 96px}
header.top{display:flex;flex-wrap:wrap;gap:16px;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--rule);padding-bottom:16px;margin-bottom:8px}
h1{font-size:26px;letter-spacing:6px;margin:0;font-weight:800}
.sub{color:var(--dim);font-size:13px}
.banner{border:1px solid var(--warn);background:rgba(210,153,34,.10);color:var(--warn);border-radius:8px;padding:10px 14px;margin:16px 0;font-size:13px}
.banner.bad{border-color:var(--bad);background:rgba(248,81,73,.10);color:var(--bad)}
.progress{display:flex;align-items:center;gap:12px;margin:18px 0 26px;font-size:13px;color:var(--dim)}
.bar{flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden}
.bar span{display:block;height:100%;background:var(--ok);width:0;transition:width .2s}
.card{border:1px solid var(--rule);border-radius:12px;background:var(--panel);margin:0 0 20px;overflow:hidden}
.card.done{opacity:.5}
.card.done .chead{background:rgba(46,160,67,.10)}
.chead{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--rule);background:var(--panel2)}
.rank{font-weight:800;font-size:13px;color:var(--faint);min-width:26px}
.kind{font-weight:700;font-size:15px}
.pill{font-size:11px;letter-spacing:1px;font-weight:700;border-radius:999px;padding:3px 9px;background:var(--rule);color:var(--dim)}
.spacer{flex:1}
label.tick{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dim);cursor:pointer;user-select:none}
label.tick input{width:18px;height:18px;accent-color:var(--ok);cursor:pointer}
.body{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:18px;padding:16px}
@media(max-width:860px){.body{grid-template-columns:1fr}}
.preview{width:100%;display:block;border:1px solid var(--rule);border-radius:8px;background:#000}
.timing{margin-top:10px;font-size:12px;color:var(--faint);line-height:1.7}
.timing b{color:var(--dim);font-weight:600}
textarea{width:100%;min-height:172px;resize:vertical;background:#010409;color:var(--ink);border:1px solid var(--rule);border-radius:8px;padding:12px 14px;font:14px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
textarea[readonly]{cursor:default}
textarea:focus{outline:2px solid var(--accent);outline-offset:-1px}
.meter{display:flex;align-items:center;gap:10px;margin:8px 0 12px;font-size:12px;color:var(--dim)}
.meter .count{font-weight:700;font-variant-numeric:tabular-nums}
.meter .count.over{color:var(--bad)}
.meter .track{flex:1;height:4px;background:var(--panel2);border-radius:2px;overflow:hidden}
.meter .track span{display:block;height:100%;background:var(--accent)}
.meter .track span.over{background:var(--bad)}
.btns{display:flex;flex-wrap:wrap;gap:8px}
button{font:600 13px/1 inherit;padding:10px 14px;border-radius:8px;border:1px solid var(--rule);background:var(--panel2);color:var(--ink);cursor:pointer}
button:hover{border-color:var(--faint)}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
button.primary:hover{filter:brightness(1.1)}
button.ghost{background:transparent;color:var(--dim)}
.why{font-size:12px;color:var(--faint);padding:0 16px 14px;border-top:1px solid var(--rule);margin-top:0;padding-top:12px}
.violation{display:none;border:1px solid var(--bad);background:rgba(248,81,73,.1);color:var(--bad);border-radius:8px;padding:9px 12px;font-size:12px;margin:0 0 10px}
.violation.show{display:block}
.guide{border:1px solid var(--rule);background:var(--panel);border-radius:12px;padding:14px 16px;margin:16px 0}
.guide ol{margin:8px 0 0;padding-left:1.2em}
.guide li{margin:4px 0}
.guide p{margin:8px 0 0;color:var(--dim);font-size:13px}
.steps{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.steps li{font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--faint);border:1px solid var(--rule);border-radius:999px;padding:3px 8px}
.steps li.on{color:var(--ok);border-color:var(--ok)}
.pill.post{background:rgba(46,160,67,.18);color:var(--ok)}
.pill.hold{background:transparent}
.pill.level{background:rgba(210,153,34,.15);color:var(--warn)}
textarea.stash{display:none}
footer{margin-top:40px;border-top:1px solid var(--rule);padding-top:16px;color:var(--faint);font-size:12px;line-height:1.8}
.empty{border:1px dashed var(--rule);border-radius:12px;padding:40px;text-align:center;color:var(--dim)}
`;

// Client-side rule check. The tables come from collector/posts.mjs so the page
// and the generator cannot drift — an operator who unlocks the box to fix a typo
// gets the same verdict the build would have given.
const CLIENT_JS = `
const W1=[[0,4351],[8192,8205],[8208,8223],[8242,8247]];
function xLen(t){let n=0;for(const ch of t){const c=ch.codePointAt(0);n+=W1.some(([a,b])=>c>=a&&c<=b)?1:2}return n}
const URL_RE=[
  [/\\b[a-z][a-z0-9+.-]*:\\/\\//i,'a URL scheme'],
  [/(^|[^a-z0-9])www\\./i,'a "www." host'],
  [new RegExp('\\\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\\\.(?:'+TLDS.join('|')+')\\\\b','i'),'a bare domain'],
  [/\\b[a-z0-9._%+-]+@[a-z0-9.-]+\\b/i,'an email address']
];
function checkText(t){
  for(const [re,why] of URL_RE){const m=re.exec(t);if(m)return 'Contains '+why+': "'+m[0].trim()+'". No post may carry a URL.'}
  for(const w of FUTURE_WORDS){const m=new RegExp('\\\\b'+w+'\\\\b','i').exec(t);if(m)return 'Future tense: "'+m[0]+'". This index reports what was observed.'}
  const c=/\\b[a-z]+'ll\\b/i.exec(t); if(c)return 'Future tense: "'+c[0]+'".';
  for(const p of FUTURE_PHRASES){const m=new RegExp('\\\\b'+p.replace(/ /g,'\\\\s+')+'\\\\b','i').exec(t);if(m)return 'Future tense: "'+m[0]+'".'}
  if(!/\\b\\d{2}:\\d{2} UTC\\b/.test(t))return 'No exact UTC timestamp. Every post is timestamped.';
  if(xLen(t)>LIMIT)return xLen(t)+' characters, limit '+LIMIT+'.';
  return null;
}
function svgUrl(v){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(CARDS[v].svg)}

// localStorage is per-browser and can throw in private mode. Progress is a
// convenience, never the source of truth, so every access is guarded and the
// page renders correctly with storage entirely unavailable.
const KEY='doomcon.postsheet.'+SLATE_ID;
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
let ticked=load();

function refreshProgress(){
  const total=POSTS.length, done=POSTS.filter(p=>ticked[p.id]).length;
  document.getElementById('pcount').textContent=done+' of '+total+' posted';
  document.getElementById('pbar').style.width=(total?100*done/total:0)+'%';
}

function meter(card,text){
  const n=xLen(text), over=n>LIMIT;
  const c=card.querySelector('.count'); c.textContent=n+' / '+LIMIT; c.classList.toggle('over',over);
  const t=card.querySelector('.track span'); t.style.width=Math.min(100,100*n/LIMIT)+'%'; t.classList.toggle('over',over);
  const v=card.querySelector('.violation'); const problem=checkText(text);
  v.textContent=problem||''; v.classList.toggle('show',Boolean(problem));
}

async function copyText(text,btn){
  const label=btn.dataset.label||btn.textContent;
  let ok=false;
  try{ await navigator.clipboard.writeText(text); ok=true; }
  catch(e){
    // Clipboard API needs a secure context; file:// and http:// do not qualify,
    // and this sheet is often opened straight off disk.
    const ta=document.createElement('textarea'); ta.value=text;
    ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta);
    ta.select(); try{ ok=document.execCommand('copy'); }catch(e2){} ta.remove();
  }
  btn.textContent=ok?'Copied':'Copy failed - select and copy by hand';
  setTimeout(()=>{btn.textContent=label},1600);
  return ok;
}
function markStep(card,step){
  const li=card.querySelector('.steps li[data-step="'+step+'"]');
  if(li) li.classList.add('on');
}

function downloadPng(variant,filename,btn,onDone){
  const card=CARDS[variant];
  const img=new Image();
  img.onload=function(){
    const cv=document.createElement('canvas');
    cv.width=card.width; cv.height=card.height;
    const ctx=cv.getContext('2d');
    ctx.drawImage(img,0,0,card.width,card.height);
    cv.toBlob(function(blob){
      if(!blob){btn.textContent='PNG failed';return}
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download=filename; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      btn.textContent='Downloaded'; setTimeout(()=>{btn.textContent=btn.dataset.label},1600);
      if(onDone) onDone();
    },'image/png');
  };
  img.onerror=function(){ btn.textContent='PNG failed'; };
  img.src=svgUrl(variant);
}

document.querySelectorAll('.card').forEach(function(card){
  const id=card.dataset.id;
  const post=POSTS.find(p=>p.id===id);
  const ta=card.querySelector('textarea.post');
  card.querySelector('.preview').src=svgUrl(post.card_variant);
  meter(card,ta.value);
  ta.addEventListener('input',()=>meter(card,ta.value));

  const box=card.querySelector('input[type=checkbox]');
  box.checked=Boolean(ticked[id]);
  card.classList.toggle('done',box.checked);
  box.addEventListener('change',()=>{
    if(box.checked) ticked[id]=new Date().toISOString(); else delete ticked[id];
    save(ticked); card.classList.toggle('done',box.checked); refreshProgress();
  });

  card.querySelectorAll('.copy, .copy-reply, .copy-alt').forEach(function(b){ b.dataset.label=b.textContent; });
  card.querySelector('.copy').addEventListener('click',async function(){
    const ok=await copyText(ta.value,this);
    if(ok) markStep(card,'head');
  });
  card.querySelector('.copy-reply').addEventListener('click',async function(){
    const ok=await copyText(card.querySelector('textarea.reply').value,this);
    if(ok) markStep(card,'reply');
  });
  card.querySelector('.copy-alt').addEventListener('click',function(){
    copyText(card.querySelector('textarea.alt').value,this);
  });
  card.querySelectorAll('.png').forEach(function(b){
    b.dataset.label=b.textContent;
    b.addEventListener('click',()=>downloadPng(b.dataset.variant,b.dataset.filename,b,()=>markStep(card,'image')));
  });
  card.querySelector('.unlock').addEventListener('click',function(){
    const locked=ta.hasAttribute('readonly');
    if(locked){ta.removeAttribute('readonly');this.textContent='Lock';ta.focus()}
    else{ta.setAttribute('readonly','');this.textContent='Edit'}
  });
});

document.getElementById('reset').addEventListener('click',function(){
  ticked={}; save(ticked);
  document.querySelectorAll('.card').forEach(c=>{c.querySelector('input[type=checkbox]').checked=false;c.classList.remove('done')});
  refreshProgress();
});
refreshProgress();
`;

const REPLY_PATH = {
  race: '/race.html',
  'market-move': '/race.html',
  drought: '/watts.html',
  'top-news': '/news.html',
  corroboration: '/news.html',
  developing: '/news.html',
};

function replyLine(p, brand) {
  let origin = 'https://siren.watch';
  try { origin = new URL(brand.canonicalUrl).origin; } catch { /* keep the live default */ }
  const path = REPLY_PATH[p.kind] || '/';
  const url = path === '/' ? `${origin}/` : `${origin}${path}`;
  return `The reading: ${url}`;
}

function altLine(brand, state) {
  const score = Number.isFinite(state.score) ? state.score.toFixed(1) : 'no score';
  const name = state.level_name || '';
  return `${brand.name} ${state.level} ${name}, ${score} of 100, observed ${utcStamp(state.generated_at)}. The image says ${brand.domain}. Tempo, not a forecast.`;
}

function rolePill(p) {
  if (p.rank === 1) return '<span class="pill post">POST THIS</span>';
  if (p.kind === 'escalation' || p.kind === 'deescalation') return '<span class="pill level">LEVEL CHANGE</span>';
  return '<span class="pill hold">HOLD</span>';
}

function postCard(p, brand, state, stateStamp) {
  const label = KIND_LABEL[p.kind] || p.kind;
  const fileBase = `siren-${p.kind}-${stateStamp}`;
  const hold = p.rank === 1
    ? '<br><b>This is the one to post.</b> Between 13:00 and 16:00 UTC. The clock above is when the reading was taken, not when to publish.'
    : (p.kind === 'escalation' || p.kind === 'deescalation'
      ? '<br><b>Level change.</b> Only if the first post is already up, and hours later.'
      : '<br><b>Hold.</b> Do not post this the same day as the first card.');
  return `
<article class="card" data-id="${escHtml(p.id)}">
  <div class="chead">
    <span class="rank">${p.rank}</span>
    <span class="kind">${escHtml(label)}</span>
    ${rolePill(p)}
    <span class="pill">${escHtml(p.card_variant)}</span>
    <span class="spacer"></span>
    <label class="tick"><input type="checkbox"> posted, image attached</label>
  </div>
  <div class="body">
    <div>
      <img class="preview" alt="${escHtml(altLine(brand, state))}">
      <ol class="steps">
        <li data-step="head">1 Head copied</li>
        <li data-step="image">2 Image downloaded</li>
        <li data-step="reply">3 Reply copied</li>
      </ol>
      <div class="timing">
        <b>Reading taken</b> ${escHtml(p.suggested_at_human)}<br>
        <b>Off For You</b> ${escHtml(p.expires_at)}<br>
        ${escHtml(p.reach_note)}
        ${hold}
      </div>
    </div>
    <div>
      <div class="violation"></div>
      <textarea class="post" readonly spellcheck="false">${escHtml(p.text)}</textarea>
      <textarea class="reply stash" readonly>${escHtml(replyLine(p, brand))}</textarea>
      <textarea class="alt stash" readonly>${escHtml(altLine(brand, state))}</textarea>
      <div class="meter">
        <span class="count">0 / ${X_CHAR_LIMIT}</span>
        <span class="track"><span></span></span>
      </div>
      <div class="btns">
        <button class="primary copy">1. Copy head text</button>
        <button class="primary png" data-variant="landscape" data-filename="${escHtml(fileBase)}-1600x900.png">2. PNG for the feed</button>
        <button class="copy-reply">3. Copy the reply link</button>
        <button class="ghost png" data-variant="portrait" data-filename="${escHtml(fileBase)}-1080x1350.png">Portrait PNG</button>
        <button class="ghost copy-alt">Copy image alt text</button>
        <button class="ghost unlock">Edit</button>
      </div>
    </div>
  </div>
  <p class="why">${escHtml(p.rationale)} Head text stays link-free. The reply carries the page. Tick posted only after the image is on the post.</p>
</article>`;
}

/**
 * ctx.state    — data/state.json, parsed (required)
 * ctx.brand    — from loadBrand(); defaults to DEFAULT_BRAND
 * ctx.history  — parsed data/history.ndjson rows
 * ctx.notable  — notable-input items, see collector/posts.mjs
 * ctx.posts / ctx.cards — pre-built; supplied, they are used as-is
 */
export function renderPostSheet(ctx = {}) {
  const state = ctx.state;
  if (!state) throw new TypeError('renderPostSheet: ctx.state is required');
  const brand = ctx.brand || DEFAULT_BRAND;
  const history = ctx.history || [];
  const built = ctx.posts
    ? { posts: ctx.posts, suppressed: Boolean(ctx.suppressed), reason: ctx.reason || null, delta: ctx.delta ?? null }
    : buildPosts(state, { brand, history, notable: ctx.notable || [] });
  const delta = built.delta ?? resolveDelta(state, history);
  const cards = ctx.cards || renderCards(state, { brand, delta });
  const lvl = levelMeta(state.level);
  const blank = isUnavailable(state);
  const stateStamp = state.generated_at.replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z');

  const cardPayload = {
    landscape: { svg: cards.landscape.svg, width: cards.landscape.width, height: cards.landscape.height },
    portrait: { svg: cards.portrait.svg, width: cards.portrait.width, height: cards.portrait.height },
  };

  const suppressedBanner = built.suppressed
    ? `<div class="banner bad"><b>Slate suppressed.</b> ${escHtml(built.reason)}. Only the degraded-state post is offered — nothing quoting a composite score ships while inputs are missing.</div>`
    : '';

  const body = built.posts.length
    ? built.posts.map((p) => postCard(p, brand, state, stateStamp)).join('\n')
    : '<div class="empty">No posts generated for this state.</div>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- INTERNAL CONSOLE. site/build.mjs: do NOT add this path to sitemap.xml, do
     NOT link it from any page, and do NOT add a Disallow line for it in
     robots.txt — a Disallow is a public announcement that the path exists
     (see docs/TEARDOWN.md 3.4). The noindex tag below is the whole mechanism. -->
<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">
<meta name="googlebot" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Posting console — ${escHtml(brand.name)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <div>
    <h1>${escHtml(brand.name)} POSTING CONSOLE</h1>
    <div class="sub mono">${blank
      ? `${escHtml(brand.name)} ${escHtml(lvl.name)} &middot; no composite published, every pillar dark`
      : `${escHtml(brand.name)} ${state.level} ${escHtml(lvl.name)} &middot; ${escHtml(state.score.toFixed(1))} of 100`} &middot; ${escHtml(utcStamp(state.generated_at))}</div>
  </div>
  <div class="sub">Internal. Not linked, not indexed.<br>Paste by hand from the project account.</div>
</header>

<div class="guide">
  <b>How to post this so it gets seen.</b>
  <ol>
    <li>One original a day, between 13:00 and 16:00 UTC. Use the card marked POST THIS. A second original the same day is worth about six tenths of the first.</li>
    <li>Head post: copy the text, download the PNG, attach the image. The text spells “${escHtml(brand.domain.replace(/\./g, ' dot '))}” and has no link. Do not add one. A post that is only a link is the format that gets buried.</li>
    <li>Reply to that post with button 3. The reply holds the page. A reply is not a second original.</li>
    <li>Paste the alt text onto the image if the composer asks. It is the reading, the clock, and the domain.</li>
    <li>A level-change card can go up hours later, not instead of the daily. Hold everything else.</li>
    <li>Answer a reply that argues with the number within 48 hours. Do not ask for likes or reposts.</li>
  </ol>
  <p>The profile website can be the real URL. The head post cannot. Editing a post re-checks: no URL, no future tense, an exact UTC time, and the length limit. Tick “posted” only after the image is attached.</p>
</div>
${suppressedBanner}

<div class="progress">
  <span id="pcount" class="mono">0 of 0 posted</span>
  <span class="bar"><span id="pbar"></span></span>
  <button class="ghost" id="reset">Reset</button>
</div>

${body}

<footer>
  Posts are ordered best-first. A post drops out of the For You feed at 48 hours,
  and a second post inside one window competes with the first — so the slate is
  spaced, not dumped.<br>
  Optimised for copy-link shares and replies, not likes: xAI's open ranker weights
  a share-via-copy-link at 20.0, a reply or quote at 5.0, and a like at 0.5. Every
  post is self-contained and carries a number someone can argue with.<br>
  Generated ${escHtml(utcStamp(state.generated_at))} from receipt
  <code>${escHtml(state.receipt_id || 'unknown')}</code>.
</footer>
</div>
<script>
const POSTS=${jsonScript(built.posts)};
const CARDS=${jsonScript(cardPayload)};
const LIMIT=${X_CHAR_LIMIT};
const TLDS=${jsonScript(URL_TLDS)};
const FUTURE_WORDS=${jsonScript([...BANNED_FUTURE_WORDS, ...BANNED_FUTURE_EXTENDED])};
const FUTURE_PHRASES=${jsonScript(BANNED_FUTURE_PHRASES)};
const SLATE_ID=${jsonScript(stateStamp)};
${CLIENT_JS}
</script>
</body>
</html>
`;
}

// site/templates/*.mjs each export render(ctx); this file is not a template but
// matching the convention means build.mjs can treat it like one.
export const render = renderPostSheet;
export default { render, renderPostSheet };

// ---------------------------------------------------------------------------
// CLI:  node site/post-sheet.mjs [state.json] [history.ndjson] [out.html]
// ---------------------------------------------------------------------------

async function main(argv) {
  const statePath = argv[0] || 'data/state.json';
  const historyPath = argv[1] || 'data/history.ndjson';
  const outPath = argv[2] || 'public/post-sheet.html';
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  let history = [];
  try {
    const raw = await readFile(historyPath, 'utf8');
    history = raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    process.stderr.write(`[post-sheet] no ${historyPath} yet — delta and record posts are omitted, not faked.\n`);
  }
  const { brand } = await loadBrand();
  const html = renderPostSheet({ state, brand, history });
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
  process.stdout.write(`wrote ${outPath} (${html.length} bytes)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`post-sheet.mjs failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
