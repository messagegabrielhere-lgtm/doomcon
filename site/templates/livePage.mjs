// /live.html — LIVE: AI on TV & radio.
//
// Built from data/live-media.json (collector/live-media.mjs):
//   LIVE NOW       YouTube live broadcasts about AI, searched at most hourly
//   24/7 NEWS      round-the-clock news channels, each a plain /live link
//   AI ON TV       AI segments from the big news channels' last 72 hours
//   AI TALK RADIO  the newest AI podcast episodes, played back to back
//
// Fast and private by default: video cards show a thumbnail and load YouTube's
// privacy-enhanced player only when clicked; audio loads only on Play.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { NEWS_247 } from '../../collector/live-media.mjs';

const CSS = `<style>
.lv{max-width:1100px;overflow-wrap:anywhere}
.lv .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:#F87171;margin:0 0 10px}
.lv .eyebrow b{display:inline-block;width:8px;height:8px;border-radius:50%;background:#F87171;margin-right:6px;vertical-align:1px;animation:lvp 1.4s ease-in-out infinite}
@keyframes lvp{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.lv .eyebrow b{animation:none}}
.lv .lede{color:var(--ink-dim);max-width:70ch}
.lv h2{font:700 1.3rem/1.2 var(--sans);margin:36px 0 4px;color:var(--ink);scroll-margin-top:80px}
.lv p{color:var(--ink-dim);line-height:1.6}
.lv-upd{font:600 11px/1.4 var(--mono);letter-spacing:.1em;color:var(--ink-faint,#6B7686);margin:0 0 12px}
.lv-jump{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.lv-jump a{display:inline-block;padding:8px 12px;border:1px solid var(--rule);border-radius:999px;color:var(--ink);text-decoration:none;font:600 12px/1 var(--mono);letter-spacing:.06em}
.lv-jump a:hover,.lv-jump a:focus-visible{border-color:var(--accent,#4ADE80)}
.lv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px;margin:10px 0}
.lv-card{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:6px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
.lv-media{position:relative;aspect-ratio:16/9;background:#000}
.lv-media iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.lv-thumb{all:unset;box-sizing:border-box;cursor:pointer;position:absolute;inset:0;display:block}
.lv-thumb img{display:block;width:100%;height:100%;object-fit:cover}
.lv-thumb:focus-visible{outline:3px solid #E2A03B;outline-offset:-3px}
.lv-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58px;height:40px;border-radius:10px;background:rgba(0,0,0,.72);color:#fff;font:700 18px/40px var(--sans);text-align:center}
.lv-thumb:hover .lv-play,.lv-thumb:focus-visible .lv-play{background:#DC2626}
.lv-badge{position:absolute;left:8px;top:8px;padding:3px 7px;border-radius:3px;background:#DC2626;color:#fff;font:700 11px/1.2 var(--mono);letter-spacing:.1em}
.lv-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
.lv-body h3{margin:0;font:700 .98rem/1.3 var(--sans);color:var(--ink)}
.lv-meta{font:600 11px/1.4 var(--mono);letter-spacing:.06em;color:var(--ink-faint,#6B7686)}
.lv-meta .ok{color:var(--accent,#4ADE80)}
.lv-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:auto;padding-top:4px}
.lv-acts a{color:var(--accent,#4ADE80);font-size:13px}
.lv-xp{all:unset;cursor:pointer;padding:5px 9px;border:1px solid var(--rule);border-radius:4px;color:var(--ink);font:700 12px/1 var(--mono)}
.lv-xp:hover,.lv-xp:focus-visible{border-color:var(--ink)}
.lv-empty{border:1px dashed var(--rule);border-radius:6px;padding:18px 16px;color:var(--ink-dim);margin:10px 0}
.lv-empty b{color:var(--ink)}
.lv-247{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:10px;margin:10px 0}
.lv-247 a{display:block;padding:12px 14px;border:1px solid var(--rule);border-radius:6px;background:var(--bg-raised,#0E131D);text-decoration:none;color:var(--ink)}
.lv-247 a:hover,.lv-247 a:focus-visible{border-color:#F87171}
.lv-247 b{display:block;font:700 14px/1.3 var(--sans)}
.lv-247 b::before{content:"● ";color:#F87171}
.lv-247 span{display:block;font-size:13px;color:var(--ink-dim);margin-top:4px}
.lv-radio{border:1px solid var(--rule);border-radius:6px;background:#000;padding:14px;margin:10px 0}
.lv-now{display:flex;gap:12px;align-items:center;min-width:0}
.lv-now img{width:64px;height:64px;border-radius:4px;object-fit:cover;flex:none;background:#111}
.lv-now div{min-width:0}
.lv-now small{display:block;font:600 11px/1.4 var(--mono);letter-spacing:.1em;color:#F87171}
.lv-now strong{display:block;color:var(--ink);font:700 15px/1.3 var(--sans)}
.lv-now em{display:block;color:var(--ink-dim);font-style:normal;font-size:13px}
.lv-radio audio{display:block;width:100%;margin:12px 0 10px}
.lv-ctl{display:flex;flex-wrap:wrap;gap:8px}
.lv-btn{display:inline-block;padding:11px 16px;border-radius:4px;background:var(--accent,#4ADE80);color:#000;font:700 13px/1 var(--mono);letter-spacing:.08em;text-decoration:none;border:0;cursor:pointer}
.lv-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--rule)}
.lv-btn:focus-visible,.lv-ep button:focus-visible{outline:2px solid #E2A03B;outline-offset:2px}
.lv-q{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.lv-ep{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid var(--rule);border-radius:6px;background:var(--bg-raised,#0E131D);min-width:0}
.lv-ep[aria-current=true]{border-color:var(--accent,#4ADE80);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#4ADE80) 30%,transparent)}
.lv-ep>button{all:unset;cursor:pointer;flex:none;width:40px;height:40px;border-radius:50%;background:var(--accent,#4ADE80);color:#000;text-align:center;font:700 15px/40px var(--sans)}
.lv-ep img{width:40px;height:40px;border-radius:4px;object-fit:cover;flex:none;background:#111}
.lv-ep div{flex:1;min-width:0}
.lv-ep h3{margin:0 0 3px;font:700 .95rem/1.3 var(--sans);color:var(--ink)}
.lv-note{font-size:13px}
@media (max-width:560px){.lv-ep img{display:none}.lv-now img{width:48px;height:48px}}
</style>`;

const hhmm = (s) => { const d = new Date(s); return Number.isFinite(d.getTime()) ? `${d.toISOString().slice(11, 16)} UTC` : ''; };
const when = (s) => {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${d.toISOString().slice(11, 16)} UTC`;
};
const mins = (secs) => {
  if (!Number.isFinite(secs) || secs <= 0) return '';
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
const ext = (href, text, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" target="_blank" rel="noopener">${text}</a>`;
const xBtn = (title, src, url) => `<button type="button" class="lv-xp" data-xpost="news" data-x-title="${esc(title)}" data-x-src="${esc(src)}" data-x-url="${esc(url)}" aria-label="Post this to X">𝕏 Post</button>`;
const ytOk = (id) => /^[\w-]{11}$/.test(String(id || ''));

function videoCard(v, { live = false } = {}) {
  if (!ytOk(v.id)) return '';
  const meta = live
    ? `${esc(v.channel)}${v.allow ? ' <span class="ok">✓ NEWS/TECH</span>' : ''}${v.started_at ? ` · LIVE SINCE ${esc(hhmm(v.started_at))}` : ''}`
    : `${esc(v.channel)} · ${esc(when(v.published_at))}${Number.isFinite(v.views) ? ` · ${esc(v.views.toLocaleString('en-US'))} views` : ''}`;
  return `<article class="lv-card">
  <div class="lv-media"><button type="button" class="lv-thumb" data-yt="${esc(v.id)}" data-yt-title="${esc(v.title)}" aria-label="Play: ${esc(v.title)}"><img loading="lazy" decoding="async" width="320" height="180" alt="" src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg"><span class="lv-play" aria-hidden="true">▶</span>${live ? '<span class="lv-badge">● LIVE</span>' : ''}</button></div>
  <div class="lv-body"><h3>${esc(v.title)}</h3><p class="lv-meta">${meta}</p>
  <div class="lv-acts">${xBtn(v.title, v.channel || 'YouTube', `https://www.youtube.com/watch?v=${v.id}`)}${ext(`https://www.youtube.com/watch?v=${v.id}`, 'Watch on YouTube ↗')}</div></div>
</article>`;
}

function liveSection(ctx, live) {
  const items = (live && live.items) || [];
  const upd = live && live.fetched_at ? `UPDATED ${esc(hhmm(live.fetched_at))} · SEARCHED HOURLY` : 'NOT SEARCHED YET';
  let body;
  if (items.length) body = `<div class="lv-grid">${items.map((v) => videoCard(v, { live: true })).join('')}</div>
  <p class="lv-note">Streams are found by a YouTube search for AI news, at most once an hour, so one may have ended since. Channels marked ✓ are established news or tech outlets and are listed first; the rest passed a filter for AI topics and against music loops and crypto scams.</p>`;
  else if (live && live.status === 'no-key') body = `<div class="lv-empty"><b>No AI live streams right now.</b> The live search is switched off on this build, so this shelf stays empty. The 24/7 news channels below are always on.</div>`;
  else if (live && live.status === 'error') body = `<div class="lv-empty"><b>No AI live streams right now.</b> The last live search did not answer (${esc(live.error || 'error')}); it tries again within the hour. Meanwhile the 24/7 news channels below are always on.</div>`;
  else body = `<div class="lv-empty"><b>No AI live streams right now.</b> Nothing live about AI passed the filter at the last check. The 24/7 news channels below are always on.</div>`;
  return `<h2 id="live-now">Live now</h2><p class="lv-upd">${upd}</p>${body}`;
}

function newsSection(list) {
  const rows = (list && list.length ? list : NEWS_247).filter((c) => /^UC[\w-]{22}$/.test(c.id));
  return `<h2 id="news-247">24/7 news channels</h2><p class="lv-upd">ALWAYS ON · OPENS ON YOUTUBE</p>
  <div class="lv-247">${rows.map((c) => `<a href="https://www.youtube.com/channel/${esc(c.id)}/live" target="_blank" rel="noopener"><b>${esc(c.name)} ↗</b><span>${esc(c.blurb || '')}</span></a>`).join('')}</div>
  <p class="lv-note">Each link opens whatever that channel is streaming live right now. General news, not only AI.</p>`;
}

function tvSection(tv) {
  const items = (tv && tv.items) || [];
  const srcs = (tv && tv.sources) || [];
  const ok = srcs.filter((s) => s.ok).length;
  const upd = tv && tv.fetched_at ? `UPDATED ${esc(hhmm(tv.fetched_at))} · ${ok} OF ${srcs.length} CHANNELS ANSWERED · LAST 72 HOURS` : 'NOT CHECKED YET';
  const body = items.length
    ? `<div class="lv-grid">${items.map((v) => videoCard(v)).join('')}</div>`
    : `<div class="lv-empty"><b>No AI segments to show yet.</b> ${!(tv && tv.fetched_at) ? 'The channel feeds have not been checked yet; they are read every 15 minutes.' : srcs.length && !ok ? 'None of the channel feeds answered at the last check; it retries every 15 minutes.' : 'None of the news channels we follow posted an AI story in the last 72 hours.'}</div>`;
  const names = srcs.filter((s) => s.ok).map((s) => s.name);
  return `<h2 id="on-tv">AI on TV</h2><p class="lv-upd">${upd}</p>${body}
  ${names.length ? `<p class="lv-note">From the YouTube channels of ${esc(names.join(', '))}. Headlines are matched on AI terms; newest first.</p>` : ''}`;
}

function radioSection(radio) {
  const items = ((radio && radio.items) || []).filter((e) => /^https:\/\//.test(e.audio || ''));
  const srcs = (radio && radio.sources) || [];
  const upd = radio && radio.fetched_at ? `UPDATED ${esc(hhmm(radio.fetched_at))} · ${srcs.filter((s) => s.ok).length} OF ${srcs.length} SHOWS ANSWERED` : 'NOT CHECKED YET';
  if (!items.length) {
    return `<h2 id="radio">AI talk radio</h2><p class="lv-upd">${upd}</p><div class="lv-empty"><b>No episodes to play right now.</b> ${radio && radio.fetched_at ? 'The podcast feeds did not answer at the last check; the list refreshes every hour.' : 'The podcast feeds have not been read yet; the list refreshes every hour.'}</div>`;
  }
  const queue = items.map((e) => ({ t: e.title, s: e.show, a: e.audio, i: e.image || '', l: e.link || '', d: e.published_at || '' }));
  const list = items.map((e, i) => `<li class="lv-ep" data-i="${i}" aria-current="false">
    <button type="button" data-play="${i}" aria-label="Play: ${esc(e.title)}">▶</button>${e.image ? `<img loading="lazy" decoding="async" width="40" height="40" alt="" src="${esc(e.image)}">` : ''}
    <div><h3>${esc(e.title)}</h3><p class="lv-meta">${esc(e.show)} · ${esc(when(e.published_at))}${e.duration ? ` · ${esc(mins(e.duration))}` : ''}</p>
    <div class="lv-acts">${xBtn(e.title, e.show, e.link || e.audio)}${e.link ? ext(e.link, 'Episode page ↗') : ''}</div></div></li>`).join('');
  return `<h2 id="radio">AI talk radio</h2><p class="lv-upd">${upd}</p>
  <div class="lv-radio" id="lv-radio">
    <div class="lv-now"><img id="lv-art" alt="" width="64" height="64" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><div><small id="lv-state">READY · ${items.length} EPISODES QUEUED</small><strong id="lv-title">${esc(items[0].title)}</strong><em id="lv-show">${esc(items[0].show)}</em></div></div>
    <audio id="lv-audio" controls preload="none"></audio>
    <div class="lv-ctl"><button type="button" class="lv-btn" id="lv-go">▶ PLAY AI TALK RADIO</button><button type="button" class="lv-btn ghost" id="lv-next">⏭ NEXT</button></div>
  </div>
  <ol class="lv-q" id="lv-q">${list}</ol>
  <p class="lv-note">Plays the newest episodes from AI podcasts back to back, newest first, and moves on by itself when one ends. Audio streams straight from each show’s own host when you press play. We looked for a live 24/7 AI talk-radio station and found none reliable enough to list, so this is the next best thing.</p>
  <script type="application/json" id="lv-queue">${JSON.stringify(queue).replace(/</g, '\\u003c')}</script>`;
}

const SCRIPT = `<script>(function(){
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-yt]');if(!b)return;var id=b.getAttribute('data-yt');if(!/^[\\w-]{11}$/.test(id))return;
var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';f.title=b.getAttribute('data-yt-title')||'YouTube video';
f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');f.setAttribute('allowfullscreen','');f.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
if(window.SirenRadio&&SirenRadio.playing)SirenRadio.stop();var au=document.getElementById('lv-audio');if(au&&!au.paused)au.pause();b.replaceWith(f)});
var qEl=document.getElementById('lv-queue'),a=document.getElementById('lv-audio');if(!qEl||!a)return;var Q=[];try{Q=JSON.parse(qEl.textContent)}catch(_){}if(!Q.length)return;
var i=-1,auto=false,fails=0,$=function(x){return document.getElementById(x)};
function mark(){[].forEach.call(document.querySelectorAll('.lv-ep'),function(li){li.setAttribute('aria-current',String(+li.getAttribute('data-i')===i))})}
function load(n,play){i=(n+Q.length)%Q.length;var q=Q[i];a.src=q.a;$('lv-title').textContent=q.t;$('lv-show').textContent=q.s;if(q.i)$('lv-art').src=q.i;mark();
$('lv-state').textContent=(auto?'ON AIR · ':'')+'EPISODE '+(i+1)+' OF '+Q.length;if(play){if(window.SirenRadio&&SirenRadio.playing)SirenRadio.stop();var p=a.play();if(p&&p.catch)p.catch(function(){$('lv-state').textContent='TAP PLAY TO START'})}}
$('lv-go').addEventListener('click',function(){if(i>=0&&!a.paused){a.pause();return}auto=true;if(i<0)load(0,true);else{var p=a.play();if(p&&p.catch)p.catch(function(){})}});
$('lv-next').addEventListener('click',function(){load(i+1,true)});
document.getElementById('lv-q').addEventListener('click',function(e){var b=e.target.closest('[data-play]');if(!b)return;var n=+b.getAttribute('data-play');if(n===i&&!a.paused){a.pause();return}auto=true;load(n,true)});
a.addEventListener('play',function(){fails=0;$('lv-go').textContent='⏸ PAUSE';$('lv-state').textContent='ON AIR · EPISODE '+(i+1)+' OF '+Q.length});
a.addEventListener('pause',function(){$('lv-go').textContent='▶ PLAY AI TALK RADIO'});
a.addEventListener('ended',function(){if(auto&&i<Q.length-1)load(i+1,true)});
a.addEventListener('error',function(){if(!a.getAttribute('src'))return;$('lv-state').textContent='COULD NOT LOAD THIS EPISODE · SKIPPING';if(auto&&++fails<4&&i<Q.length-1)setTimeout(function(){load(i+1,true)},1200)});
window.LiveRadio={get index(){return i},get queue(){return Q},next:function(){load(i+1,true)},audio:a};
})();</script>`;

export function render(ctx, data) {
  const d = data || {};
  const counts = [(d.live && d.live.items || []).length, (d.tv && d.tv.items || []).length, (d.radio && d.radio.items || []).length];
  const main = `${CSS}
<section class="lv">
  <p class="eyebrow"><b aria-hidden="true"></b>LIVE · AI ON TV &amp; RADIO</p>
  <h1 class="bp__h1">AI on TV &amp; radio</h1>
  <p class="lede">Live broadcasts about artificial intelligence, the latest AI segments from the big news channels, and AI talk radio you can leave playing. Everything opens on demand: nothing plays and no player loads until you press play.</p>
  <ul class="lv-jump"><li><a href="#live-now">● Live now (${counts[0]})</a></li><li><a href="#news-247">24/7 news</a></li><li><a href="#on-tv">AI on TV (${counts[1]})</a></li><li><a href="#radio">Talk radio (${counts[2]})</a></li></ul>
  ${liveSection(ctx, d.live)}
  ${newsSection(d.news_247)}
  ${tvSection(d.tv)}
  ${radioSection(d.radio)}
  <h2>About this room</h2>
  <p class="lv-note">Video thumbnails come from YouTube (i.ytimg.com), so Google sees your IP address when the page loads; the player is YouTube’s privacy-enhanced one (youtube-nocookie.com) and loads only when you click. Podcast artwork and audio come from each show’s host. ${esc(brand.NAME)} picks nothing by hand and endorses nothing here: it is a filtered list of what is on. Machine-readable: <a href="${esc(ctx.href('/api/live-media.json'))}">api/live-media.json</a>. More live AI: <a href="${esc(ctx.href('/live-x.html'))}">Live on X</a>, <a href="${esc(ctx.href('/elon.html'))}">Real Clips</a>, <a href="${esc(ctx.href('/news.html'))}">the Newsroom</a>.</p>
</section>
${SCRIPT}`;
  return page({ ctx, path: '/live.html', title: `LIVE: AI on TV & radio · ${brand.NAME}`,
    description: 'Live YouTube broadcasts about AI, the latest AI segments from CNBC, Bloomberg, BBC, CBS and other news channels, 24/7 news streams, and AI talk radio from the top AI podcasts, played back to back.', main });
}
