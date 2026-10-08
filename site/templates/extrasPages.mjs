// The extras pages, rendered with the shared site layout:
//   /alerts.html          pick triggers -> feed URLs, RSS-to-email/webhook recipes, in-tab notifications
//   /export.html          downloads (CSV/JSON/TXT), embed snippets, fetch snippet, licence line
//   /bias.html            known biases and blind spots of the inputs
//   /reference-plan.html  how the frozen baseline gets updated (and the shadow score, when live)
//   /changelog.html       "What moved": the last 48 hourly entries
// Data comes from extrasData.mjs; feeds and CSVs are written by site/extras.mjs.

import { esc, num, utc, utcClock, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import {
  DELTA_THRESHOLD, PILLAR_THRESHOLD, PILLAR_IDS, pillarName,
  hourlyEntries, readingPath, alternativeSignals,
} from './extrasData.mjs';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const CSS = `<style>
.xt{max-width:980px;min-width:0}
.xt *{box-sizing:border-box}
.xt [hidden]{display:none !important}
.xt .eyebrow{font:600 12px/1.2 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px;text-transform:uppercase}
.xt h1{font:700 clamp(1.6rem,5vw,2.3rem)/1.15 var(--sans);margin:0 0 12px;color:var(--ink)}
.xt h2{font:700 1.25rem/1.25 var(--sans);margin:34px 0 10px;color:var(--ink)}
.xt h3{font:700 1rem/1.3 var(--sans);margin:0 0 6px;color:var(--ink)}
.xt p,.xt li,.xt td,.xt th{color:var(--ink-dim);line-height:1.6;overflow-wrap:anywhere}
.xt b,.xt strong{color:var(--ink)}
.xt a{color:var(--ink)}
.xt ul,.xt ol{padding-left:1.2em}
.xt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px;margin:14px 0}
.xt-card{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:4px;padding:14px 16px;min-width:0}
.xt-card p{margin:4px 0 0;font-size:14px}
.xt-btn{display:inline-block;padding:10px 14px;border-radius:4px;background:var(--accent,#4ADE80);color:#000 !important;font:700 12px/1.1 var(--mono);letter-spacing:.06em;text-decoration:none;margin:4px 6px 4px 0;border:0;cursor:pointer}
.xt-btn.ghost{background:transparent;color:var(--ink) !important;border:1px solid var(--rule)}
.xt-btn.sm{padding:6px 9px;font-size:11px}
.xt pre,.xt code.blk{display:block;background:#000;border:1px solid var(--rule);border-radius:4px;padding:12px 14px;font:500 12.5px/1.5 var(--mono);color:#E6EAF0;white-space:pre-wrap;word-break:break-all;margin:8px 0;max-width:100%;overflow-x:auto}
.xt code{font-family:var(--mono);font-size:.92em;overflow-wrap:anywhere}
.xt-note{font-size:13px;color:var(--ink-faint,#6B7686)}
.xt-tbl{width:100%;overflow-x:auto;margin:10px 0;-webkit-overflow-scrolling:touch}
.xt-tbl table{border-collapse:collapse;width:100%;min-width:0;font-size:14px}
.xt-tbl th,.xt-tbl td{border-bottom:1px solid var(--rule);padding:7px 8px;text-align:left;vertical-align:top}
.xt-tbl th{font:600 11px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint,#6B7686)}
.xt-tbl td.n{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.xt-up{color:#F87171}.xt-dn{color:#60A5FA}.xt-flat{color:var(--ink-faint,#6B7686)}
.xt-pill{display:inline-block;font:600 11px/1 var(--mono);padding:4px 7px;border:1px solid var(--rule);border-radius:3px;color:var(--ink-dim);margin:2px 4px 2px 0;white-space:nowrap}
.xt-pill.hot{border-color:#F87171;color:#F87171}
.xt-pill.dark{border-color:#A3A3A3;color:#A3A3A3}
.xt-pill.live{border-color:#4ADE80;color:#4ADE80}
.xt-checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:8px;margin:10px 0}
.xt-checks label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--rule);border-radius:4px;padding:10px 12px;cursor:pointer;color:var(--ink-dim);font-size:14px;line-height:1.4}
.xt-checks input{margin-top:3px;flex:none;accent-color:var(--accent,#4ADE80)}
.xt-feeds{list-style:none;padding:0;margin:10px 0}
.xt-feeds li{border:1px solid var(--rule);border-radius:4px;padding:10px 12px;margin:0 0 8px;background:var(--bg-raised,#0E131D)}
.xt-feeds li[hidden]{display:none}
.xt-feeds .u{display:block;font:500 12.5px/1.45 var(--mono);color:var(--ink);word-break:break-all;margin:4px 0 6px}
.xt-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.xt-row input[type=number]{width:5.5em;padding:6px 8px;background:#000;color:var(--ink);border:1px solid var(--rule);border-radius:4px;font:500 14px var(--mono)}
.xt-status{font:500 13px/1.5 var(--mono);color:var(--ink-dim);margin-top:8px;min-height:1.5em}
.xt-log{list-style:none;padding:0;margin:14px 0}
.xt-log>li{border-left:3px solid var(--rule);padding:6px 0 12px 14px;margin:0 0 6px}
.xt-log>li.lv{border-left-color:#F87171}
.xt-log>li.big{border-left-color:#FBBF24}
.xt-log .hd{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;font:600 13px/1.4 var(--mono);color:var(--ink)}
.xt-log .hd a{color:var(--ink)}
.xt-log .hd .t{color:var(--ink-faint,#6B7686);font-weight:500}
.xt-log .news{list-style:none;padding:0;margin:6px 0 0}
.xt-log .news li{font-size:14px;margin:3px 0;line-height:1.45}
.xt-log .news .src{font:500 11px var(--mono);color:var(--ink-faint,#6B7686)}
.xt-back{margin-top:36px;font-size:14px}
</style>`;

function shell(ctx, { path, title, description, main, head, bodyEnd, jsonld }) {
  const back = `<p class="xt-back"><a href="${esc(ctx.href('/'))}">← Back to the ${esc(brand.NAME)} index</a> · <a href="${esc(ctx.href('/methodology.html'))}">Methodology</a> · <a href="${esc(ctx.href('/feedback.html'))}">Feedback</a></p>`;
  return page({
    ctx, path, title: `${title} · ${brand.NAME}`, description,
    main: `${CSS}\n<section class="xt">\n${main}\n${back}\n</section>`,
    head, bodyEnd, jsonld,
  });
}

const arrow = (d) => (d > 0 ? '▲' : d < 0 ? '▼' : '±');
const cls = (d, big) => (Math.abs(d) < 0.05 ? 'xt-flat' : d > 0 ? 'xt-up' : 'xt-dn') + (big ? '' : '');
const dTxt = (d) => `${arrow(d)}${Math.abs(d).toFixed(1)}`;
const levelName = (L) => { try { return brand.levelMeta(L).name; } catch { return ''; } };

// ---------------------------------------------------------------------------
// FEED CATALOGUE (shared with the alerts page and site/extras.mjs)
// ---------------------------------------------------------------------------
export function feedCatalogue() {
  return [
    { key: 'level', path: '/feed-level.xml', title: 'Level changes', blurb: 'Only when the SIREN level itself changes (for example 4 → 3). The quietest feed: weeks can pass without an item.', checked: true },
    { key: 'delta', path: '/feed-delta.xml', title: `Big score moves (±${DELTA_THRESHOLD} or more)`, blurb: `Any reading where the composite score moved ${DELTA_THRESHOLD} points or more since the previous reading.`, checked: true },
    { key: 'pillar', path: '/feed-pillar.xml', title: `Any pillar spike (±${PILLAR_THRESHOLD} or more)`, blurb: `Any pillar moving ${PILLAR_THRESHOLD}+ points between readings, or a pillar going dark or coming back live.`, checked: false },
    ...PILLAR_IDS.map((id) => ({
      key: `pillar-${id}`, path: `/feed-pillar-${id}.xml`, title: `${pillarName(id)} only`,
      blurb: `${pillarName(id)} moving ${PILLAR_THRESHOLD}+ points, going dark or coming back live.`, checked: false,
    })),
    { key: 'all', path: '/feed.xml', title: 'Every substantive move', blurb: 'The main feed: each reading that moved the score by half a point or more. Busy.', checked: false },
  ];
}

// ---------------------------------------------------------------------------
// /alerts.html
// ---------------------------------------------------------------------------
export function alertsPage(ctx) {
  const feeds = feedCatalogue();
  const checks = feeds.map((f) => `<label><input type="checkbox" data-feed="${esc(f.key)}"${f.checked ? ' checked' : ''}><span><b>${esc(f.title)}</b><br>${esc(f.blurb)}</span></label>`).join('');
  const list = feeds.map((f) => {
    const u = ctx.url(f.path);
    return `<li data-feed="${esc(f.key)}"${f.checked ? '' : ' data-off="1"'}><b>${esc(f.title)}</b><code class="u">${esc(u)}</code><span class="xt-row">
<button type="button" class="xt-btn sm" data-copy="${esc(u)}">COPY URL</button>
<a class="xt-btn sm ghost" href="${esc(`https://feedly.com/i/subscription/feed/${encodeURIComponent(u)}`)}" target="_blank" rel="noopener">FEEDLY</a>
<a class="xt-btn sm ghost" href="${esc(`https://www.inoreader.com/?add_feed=${encodeURIComponent(u)}`)}" target="_blank" rel="noopener">INOREADER</a>
<a class="xt-btn sm ghost" href="${esc(ctx.href(f.path))}">RAW XML</a></span></li>`;
  }).join('\n');

  const pillarChecks = PILLAR_IDS.map((id) => `<label><input type="checkbox" data-np="${esc(id)}" checked><span>${esc(pillarName(id))}</span></label>`).join('');
  const xUrl = brand.X_URL || 'https://x.com/SIRENutf6';
  const handle = brand.X_HANDLE || '@SIRENutf6';

  const main = `<p class="eyebrow">Alerts</p>
<h1>Get told when ${esc(brand.NAME)} moves</h1>
<p class="lede">Pick what counts as news to you: a level change, a big swing in the score, or one pillar spiking. Every trigger below is a plain RSS feed rebuilt with each hourly reading, so it works in any feed reader and can be piped to email, Slack, Discord or a webhook with free tools. Nothing to sign up for here.</p>

<h2 id="pick">1 · Pick your triggers</h2>
<div class="xt-checks" id="xt-picks">${checks}</div>

<h2 id="feeds">2 · Your feed URLs</h2>
<p>Copy a URL into your feed reader, or open it straight in Feedly or Inoreader.</p>
<ul class="xt-feeds" id="xt-feeds">
${list}
</ul>
<p class="xt-row"><button type="button" class="xt-btn ghost" id="xt-opml">DOWNLOAD SELECTED AS OPML</button><span class="xt-note">OPML imports several feeds at once into most readers.</span></p>

<h2 id="email">3 · Turn a feed into email</h2>
<div class="xt-grid">
  <div class="xt-card"><h3>Blogtrottr (free)</h3><p>Open <a href="https://blogtrottr.com/" target="_blank" rel="noopener">blogtrottr.com</a>, paste a feed URL from step 2, enter your address on their site and choose "real-time". You get one email per new item.</p></div>
  <div class="xt-card"><h3>FeedRabbit (free tier)</h3><p>At <a href="https://feedrabbit.com/" target="_blank" rel="noopener">feedrabbit.com</a>, add the feed URL and pick instant or a daily digest.</p></div>
</div>
<p class="xt-note">Both are independent third-party services with their own terms and privacy policies. Your address goes to them, not to ${esc(brand.NAME)}; this site never asks for it.</p>

<h2 id="webhook">4 · Or send it to a webhook, Slack or Discord</h2>
<div class="xt-grid">
  <div class="xt-card"><h3>IFTTT</h3><p>Create an applet: <b>If</b> "RSS Feed → New feed item" (paste the URL), <b>Then</b> "Webhooks → Make a web request", or Discord, Slack, SMS, phone notification.</p></div>
  <div class="xt-card"><h3>Zapier</h3><p>Trigger "RSS by Zapier → New Item in Feed", action "Webhooks by Zapier → POST" (or Slack / Discord / Teams). Item title, link and description are available as fields.</p></div>
  <div class="xt-card"><h3>Make</h3><p>Scenario: "RSS → Watch RSS feed items" → "HTTP → Make a request" to your endpoint. Set the schedule to every 15–60 minutes.</p></div>
  <div class="xt-card"><h3>Slack directly</h3><p>Add Slack's RSS app to a channel and run <code>/feed subscribe &lt;feed URL&gt;</code>.</p></div>
</div>
<p class="xt-note">Feeds rebuild once per reading (about hourly), so polling more often than every 15 minutes gains nothing. Each item's &lt;guid&gt; is fixed per reading time, so reruns never double-post.</p>

<h2 id="x">5 · Follow on X</h2>
<p>${esc(brand.NAME)} posts level changes and notable readings on X as <a href="${esc(xUrl)}" target="_blank" rel="noopener">${esc(handle)}</a>. Follow, then tap the bell on the profile and choose "All posts" to get a push notification on your phone.</p>
<p><a class="xt-btn" href="${esc(xUrl)}" target="_blank" rel="noopener">FOLLOW ${esc(handle)} ON X →</a></p>

<h2 id="tab">6 · Notify me while this tab is open</h2>
<p>No feed reader at all? Leave this page open in a tab. Your browser checks the <a href="${esc(ctx.href('/api/state.json'))}">current reading</a> every 10 minutes and shows a desktop notification when one of your thresholds trips. Your settings stay in this browser's local storage and are never sent anywhere. It stops when you close the tab.</p>
<div class="xt-card">
  <div class="xt-row"><label class="xt-row"><input type="checkbox" id="xn-level" checked> Level changes</label></div>
  <div class="xt-row" style="margin-top:8px"><label class="xt-row"><input type="checkbox" id="xn-delta-on" checked> Score moves of at least <input type="number" id="xn-delta" min="0.5" max="50" step="0.5" value="${DELTA_THRESHOLD}"> points</label></div>
  <div class="xt-row" style="margin-top:8px"><label class="xt-row"><input type="checkbox" id="xn-pillar-on" checked> Pillar moves of at least <input type="number" id="xn-pillar" min="1" max="100" step="1" value="${PILLAR_THRESHOLD}"> points in:</label></div>
  <div class="xt-checks">${pillarChecks}</div>
  <p class="xt-row"><button type="button" class="xt-btn" id="xn-start">NOTIFY ME WHILE THIS TAB IS OPEN</button><button type="button" class="xt-btn ghost" id="xn-stop" hidden>STOP</button></p>
  <p class="xt-status" id="xn-status" role="status" aria-live="polite"></p>
</div>
<p class="xt-note">${esc(brand.DISCLAIMER)}</p>`;

  const js = `<script>(function(){
var BASE=${JSON.stringify(ctx.href('/'))}.replace(/\\/$/,'');
var STATE=${JSON.stringify(ctx.href('/api/state.json'))};
var FEEDS=${JSON.stringify(feeds.map((f) => ({ key: f.key, title: f.title, url: ctx.url(f.path) })))};
function ls(k,v){try{if(v===undefined){var s=localStorage.getItem(k);return s?JSON.parse(s):null}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
var picks=document.querySelectorAll('#xt-picks input[data-feed]');
function syncFeeds(){var on={};picks.forEach(function(c){on[c.dataset.feed]=c.checked});
 document.querySelectorAll('#xt-feeds li[data-feed]').forEach(function(li){li.hidden=!on[li.dataset.feed];li.removeAttribute('data-off')});
 ls('siren-alert-picks',on)}
var saved=ls('siren-alert-picks');if(saved)picks.forEach(function(c){if(c.dataset.feed in saved)c.checked=!!saved[c.dataset.feed]});
picks.forEach(function(c){c.addEventListener('change',syncFeeds)});syncFeeds();
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-copy]');if(!b)return;
 var t=b.getAttribute('data-copy');var done=function(){var o=b.textContent;b.textContent='COPIED';setTimeout(function(){b.textContent=o},1400)};
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){prompt('Copy this URL',t)})}else{prompt('Copy this URL',t)}});
var opml=document.getElementById('xt-opml');if(opml)opml.addEventListener('click',function(){
 var on={};picks.forEach(function(c){on[c.dataset.feed]=c.checked});
 var x=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
 var body=FEEDS.filter(function(f){return on[f.key]}).map(function(f){return '<outline type="rss" text="SIREN: '+x(f.title)+'" title="SIREN: '+x(f.title)+'" xmlUrl="'+x(f.url)+'"/>'}).join('\\n    ');
 var doc='<?xml version="1.0" encoding="UTF-8"?>\\n<opml version="2.0"><head><title>SIREN alerts</title></head><body>\\n  <outline text="SIREN">\\n    '+body+'\\n  </outline>\\n</body></opml>\\n';
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([doc],{type:'text/x-opml'}));a.download='siren-alerts.opml';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)});
// ---- in-tab notifications
var $=function(id){return document.getElementById(id)};var st=$('xn-status');var timer=null;
function cfg(){var p=[];document.querySelectorAll('[data-np]').forEach(function(c){if(c.checked)p.push(c.dataset.np)});
 return{level:$('xn-level').checked,deltaOn:$('xn-delta-on').checked,delta:parseFloat($('xn-delta').value)||${DELTA_THRESHOLD},pillarOn:$('xn-pillar-on').checked,pillar:parseFloat($('xn-pillar').value)||${PILLAR_THRESHOLD},pillars:p}}
function applyCfg(c){if(!c)return;$('xn-level').checked=!!c.level;$('xn-delta-on').checked=!!c.deltaOn;if(c.delta)$('xn-delta').value=c.delta;$('xn-pillar-on').checked=!!c.pillarOn;if(c.pillar)$('xn-pillar').value=c.pillar;
 if(Array.isArray(c.pillars))document.querySelectorAll('[data-np]').forEach(function(x){x.checked=c.pillars.indexOf(x.dataset.np)>=0})}
applyCfg(ls('siren-alert-cfg'));
function snap(s){var p={};(s.pillars||[]).forEach(function(x){p[x.id]={name:x.name,score:(typeof x.score==='number')?x.score:null}});return{at:s.generated_at,score:s.score,level:s.level,name:s.level_name,pillars:p}}
function say(t){if(st)st.textContent=t}
function note(title,body){try{var n=new Notification(title,{body:body,tag:'siren-'+title});n.onclick=function(){window.focus();location.href=BASE+'/'}}catch(e){say(title+': '+body)}}
function check(){fetch(STATE+'?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(s){
 var now=snap(s);var prev=ls('siren-alert-last');var c=cfg();var hits=[];
 if(prev&&prev.at!==now.at){
  if(c.level&&prev.level!==now.level)hits.push(['SIREN '+prev.level+' → SIREN '+now.level,'Level changed to '+now.level+' '+(now.name||'')+' at score '+now.score.toFixed(1)+'.']);
  var d=now.score-prev.score;if(c.deltaOn&&Math.abs(d)>=c.delta)hits.push(['SIREN score '+(d>0?'▲':'▼')+Math.abs(d).toFixed(1),'Now '+now.score.toFixed(1)+' (was '+prev.score.toFixed(1)+').']);
  if(c.pillarOn)c.pillars.forEach(function(id){var a=prev.pillars[id],b=now.pillars[id];if(!a||!b)return;
   if(a.score!==null&&b.score!==null&&Math.abs(b.score-a.score)>=c.pillar)hits.push([b.name+' '+(b.score>a.score?'▲':'▼')+Math.abs(b.score-a.score).toFixed(1),b.name+' now '+b.score.toFixed(1)+'.']);
   else if(a.score!==null&&b.score===null)hits.push([b.name+' went dark','No usable reading for this pillar.']);
   else if(a.score===null&&b.score!==null)hits.push([b.name+' back live','Now '+b.score.toFixed(1)+'.'])})}
 hits.forEach(function(h){note(h[0],h[1])});ls('siren-alert-last',now);
 say('Watching. Last check '+new Date().toUTCString().slice(17,22)+' UTC: SIREN '+now.level+' · '+now.score.toFixed(1)+(hits.length?' · '+hits.length+' alert(s) sent':' · nothing tripped')+'. Next check in 10 minutes.')
 }).catch(function(){say('Could not reach the reading just now; trying again in 10 minutes.')})}
function start(){ls('siren-alert-cfg',cfg());if(timer)clearInterval(timer);check();timer=setInterval(check,600000);$('xn-start').hidden=true;$('xn-stop').hidden=false}
$('xn-start').addEventListener('click',function(){
 if(!('Notification' in window)){say('This browser does not support desktop notifications. Use a feed above instead.');return}
 if(Notification.permission==='granted'){start();return}
 if(Notification.permission==='denied'){say('Notifications are blocked for this site in your browser settings.');return}
 Notification.requestPermission().then(function(p){if(p==='granted')start();else say('Notifications were not allowed, so nothing will pop up.')})});
$('xn-stop').addEventListener('click',function(){if(timer)clearInterval(timer);timer=null;$('xn-start').hidden=false;$('xn-stop').hidden=true;say('Stopped.')});
document.querySelectorAll('#xn-level,#xn-delta-on,#xn-delta,#xn-pillar-on,#xn-pillar,[data-np]').forEach(function(el){el.addEventListener('change',function(){ls('siren-alert-cfg',cfg())})});
})();</script>`;

  return shell(ctx, {
    path: '/alerts.html',
    title: 'Alerts: RSS, email, webhook and X',
    description: `Get an alert when ${brand.NAME} changes level, the score swings ${DELTA_THRESHOLD}+ points or a pillar spikes. RSS feeds you can pipe to email, Slack, Discord or a webhook.`,
    main, bodyEnd: js,
  });
}

// ---------------------------------------------------------------------------
// /export.html
// ---------------------------------------------------------------------------
export function exportPage(ctx) {
  const s = ctx.state;
  const embedSnippet = `<iframe src="${ctx.url('/embed.html')}" width="320" height="152" style="border:0;max-width:100%" loading="lazy" title="${brand.NAME}: AI activity tempo"></iframe>`;
  const badgeHtml = `<a href="${ctx.url('/')}"><img src="${ctx.url('/badge.svg')}" alt="${brand.NAME} current level" height="20"></a>`;
  const badgeMd = `[![${brand.NAME} current level](${ctx.url('/badge.svg')})](${ctx.url('/')})`;
  const cardHtml = `<a href="${ctx.url('/')}"><img src="${ctx.url('/cards/state.png')}" alt="${brand.NAME} current reading" width="600" style="max-width:100%;height:auto"></a>`;
  const jsSnippet = `fetch('${ctx.url('/api/state.json')}')
  .then((r) => r.json())
  .then((s) => {
    // s.score 0-100, s.level 5 (quietest) .. 1 (loudest), s.level_name
    // s.pillars[] {id, name, score, dark}, s.generated_at (UTC)
    document.querySelector('#siren').textContent =
      \`${brand.NAME} \${s.level} · \${s.level_name} · \${s.score.toFixed(1)}\`;
  });`;
  const sheets = `=IMPORTDATA("${ctx.url('/api/history.csv')}")`;
  const attribution = `Data: ${brand.NAME} (${ctx.url('/')}), ${brand.LICENSE}. Activity tempo, not probability of harm.`;

  const dl = [
    ['api/history.csv', 'Every reading as CSV', `t, score, level, degraded, rule_fired and one column per pillar. ${Array.isArray(ctx.history) ? ctx.history.length : 0} rows today; opens in Excel, Sheets, pandas.`],
    ['api/history.json', 'Every reading as JSON', 'The same observations plus every per-source score.'],
    ['api/pillars.csv', 'Current pillars as CSV', 'The five pillars right now: score, percentile, sources ok, dark and uncalibrated flags.'],
    ['api/state.json', 'Current reading as JSON', 'Everything on the homepage, including each source\'s raw value and its receipt hash.'],
    ['api/latest.txt', 'Current reading as one line of text', 'For shell prompts, status bars and chat bots: curl it and print it.'],
    ['api/index.json', 'API index', 'Every endpoint, including per-reading receipts at api/receipts/{id}.json.'],
  ].map(([p, t, d]) => `<div class="xt-card"><h3><a href="${esc(ctx.href(`/${p}`))}" download>${esc(t)}</a></h3><p><code>/${esc(p)}</code></p><p>${esc(d)}</p></div>`).join('');

  const snippet = (id, label, code) => `<h3 style="margin-top:18px">${esc(label)}</h3><pre id="${id}">${esc(code)}</pre><button type="button" class="xt-btn sm ghost" data-copy-from="${id}">COPY</button>`;

  const main = `<p class="eyebrow">Export and embed</p>
<h1>Take the data with you</h1>
<p class="lede">Every number ${esc(brand.NAME)} publishes is downloadable, embeddable and free to reuse under ${esc(brand.LICENSE)} with a credit line. Files rebuild with each hourly reading${s && s.generated_at ? `; this page was built from the reading at ${esc(utc(s.generated_at))}` : ''}.</p>

<h2 id="download">Download</h2>
<div class="xt-grid">${dl}</div>
${snippet('xs-sheets', 'Live in Google Sheets', sheets)}

<h2 id="embed">Embed the current reading</h2>
<p>The widget is a 320×152 box that redraws with every reading and matches light or dark pages. It renders the number server-side, so it still shows with scripts blocked.</p>
<iframe src="${esc(ctx.href('/embed.html'))}" width="320" height="152" style="border:0;max-width:100%" loading="lazy" title="${esc(brand.NAME)} widget preview"></iframe>
${snippet('xs-iframe', 'Widget (iframe)', embedSnippet)}
<h3 style="margin-top:18px">Badge, for READMEs and newsletters that strip iframes</h3>
<p><img src="${esc(ctx.href('/badge.svg'))}" alt="${esc(brand.NAME)} badge preview" height="20"></p>
${snippet('xs-badge-html', 'Badge (HTML)', badgeHtml)}
${snippet('xs-badge-md', 'Badge (Markdown)', badgeMd)}
${snippet('xs-card', 'Share card image (1200×675 PNG)', cardHtml)}

<h2 id="api">Use it from code</h2>
${snippet('xs-js', 'JavaScript', jsSnippet)}
${snippet('xs-curl', 'Shell', `curl -s ${ctx.url('/api/latest.txt')}`)}
<p><b>CORS:</b> the site is served by GitHub Pages, which sends <code>Access-Control-Allow-Origin: *</code>, so these files can be fetched from any web page without a proxy. No key, no rate limit beyond GitHub's own. Please cache: data changes about once an hour.</p>

<h2 id="licence">Licence and credit</h2>
<p>Text and data are ${esc(brand.LICENSE)}. Reuse anything, commercially too, with this line (or an equivalent) next to it:</p>
${snippet('xs-attr', 'Attribution line', attribution)}
<p class="xt-note">${esc(brand.DISCLAIMER)} Want an alert instead of a file? See <a href="${esc(ctx.href('/alerts.html'))}">alerts</a>.</p>`;

  const js = `<script>(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-copy-from]');if(!b)return;
var el=document.getElementById(b.getAttribute('data-copy-from'));if(!el)return;var t=el.textContent;
var done=function(){var o=b.textContent;b.textContent='COPIED';setTimeout(function(){b.textContent=o},1400)};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){prompt('Copy',t)})}else{prompt('Copy',t)}})})();</script>`;

  return shell(ctx, {
    path: '/export.html',
    title: 'Export and embed: CSV, JSON, widget, badge',
    description: `Download every ${brand.NAME} reading as CSV or JSON, embed the live widget or badge, or fetch the current reading from code. Free under ${brand.LICENSE}.`,
    main, bodyEnd: js,
  });
}

// ---------------------------------------------------------------------------
// /bias.html
// ---------------------------------------------------------------------------
export function biasPage(ctx) {
  const inputs = [
    ['arXiv', 'Capability', 'Preprints are overwhelmingly in English, and the habit of posting to arXiv first is strongest in US and European labs. Work that appears first in Chinese-language venues or company blogs is undercounted.'],
    ['GitHub releases, Hugging Face, OpenRouter', 'Capability (uncalibrated)', 'Western-hosted platforms. Chinese labs often ship first on ModelScope or domestic mirrors, so a busy week in Beijing can look quiet here.'],
    ['SEC full-text search, US equities, Vast.ai prices', 'Compute & Capital', 'US filings and US-listed companies, priced in dollars. Capital spent by state-backed or unlisted companies outside the US barely registers.'],
    ['Hacker News', 'Attention', 'An English-language forum with a mostly US and European tech audience. Its idea of "big news" is a Silicon Valley one.'],
    ['English Wikipedia pageviews', 'Attention', 'Only the English edition. Interest that shows up as Japanese, German or Spanish readers is invisible.'],
    ['US Federal Register, GOV.UK', 'Governance', 'Two English-speaking jurisdictions. EU implementing acts, Chinese administrative rules and other national regulators do not move the pillar.'],
    ['Polymarket, Kalshi, Manifold', 'Markets (uncalibrated)', 'English-language questions written mostly by and for US traders. What they choose to list is itself a filter.'],
  ].map(([n, p, d]) => `<tr><td><b>${esc(n)}</b></td><td>${esc(p)}</td><td>${esc(d)}</td></tr>`).join('');

  const candidates = [
    ['Other-language Wikipedia pageviews', 'Attention', 'Same Wikimedia pageviews API the English series already uses, pointed at the German, French, Spanish, Japanese, Chinese and other editions. The cheapest fix on this list: same method, same receipts.'],
    ['EUR-Lex', 'Governance', 'The EU\'s official journal and legal database. Counting AI-related acts, implementing decisions and consultations would add the jurisdiction with the most active AI rulebook.'],
    ['China: MIIT and CAC notices', 'Governance', 'Public notices from the Ministry of Industry and Information Technology and the Cyberspace Administration of China, including published batches of registered generative AI services.'],
    ['Japan: METI', 'Governance', 'The Ministry of Economy, Trade and Industry\'s AI guidelines, study groups and policy publications.'],
    ['India: MeitY', 'Governance', 'The Ministry of Electronics and Information Technology\'s advisories, IndiaAI programme notices and consultations.'],
  ].map(([n, p, d]) => `<div class="xt-card"><h3>${esc(n)}</h3><p><span class="xt-pill">${esc(p)}</span></p><p>${esc(d)}</p></div>`).join('');

  const main = `<p class="eyebrow">Known biases and blind spots</p>
<h1>What ${esc(brand.NAME)} cannot see</h1>
<p class="lede">An index is only as wide as its inputs. Ours are public, free and recomputable, and that choice comes with a tilt: almost everything ${esc(brand.NAME)} counts is published in English, and most of it in the United States. This page says where that bends the reading, and what we are looking at to straighten it.</p>

<h2 id="inputs">Where each input leans</h2>
<div class="xt-tbl"><table><thead><tr><th>Input</th><th>Pillar</th><th>Lean</th></tr></thead><tbody>${inputs}</tbody></table></div>
<p>Most news sources behind the <a href="${esc(ctx.href('/news.html'))}">newsroom</a> are English-language as well. The newsroom does not feed the score, but it shapes which stories sit next to it.</p>

<h2 id="skew">What that skews</h2>
<ul>
<li><b>Timing.</b> A launch, rule or funding round outside the English-speaking web reaches our inputs late, when English coverage catches up, or never. The score can lag real events by days.</li>
<li><b>Size.</b> Activity is measured against each source's own history, so a source that systematically misses one region also has a quieter baseline. The bias is consistent rather than random, which keeps hour-to-hour moves meaningful but means the level reads "how busy is the English-speaking AI world".</li>
<li><b>Governance.</b> With two jurisdictions, the governance pillar reads the US and UK regulatory calendar, not the world's.</li>
<li><b>Attention.</b> A story that is huge in Seoul or São Paulo and ignored on Hacker News does not exist as far as this pillar knows.</li>
</ul>

<h2 id="candidates">Sources under consideration</h2>
<p>Each candidate has to meet the same bar as today's inputs: public, free to read without a private agreement, machine-readable, with enough history to build a reference year, and licensed so the counts can be republished with receipts. Anyone has to be able to recompute the number.</p>
<div class="xt-grid">${candidates}</div>
<p>A new source never goes straight into the score. It is collected and published as an <b>uncalibrated</b> signal first, then run as a shadow score beside the official one, and promoted only under the published rule on <a href="${esc(ctx.href('/reference-plan.html'))}">how the baseline gets updated</a>.</p>

<h2 id="propose">Propose a source</h2>
<p>Know a public, non-English or non-Western dataset that counts AI activity? Send it through the <a href="${esc(ctx.href('/feedback.html'))}">feedback page</a> with a link to its API or download, how far back it goes, and its licence. The more of those three you can answer, the faster it can be tested.</p>`;

  return shell(ctx, {
    path: '/bias.html',
    title: 'Known biases and blind spots',
    description: `${brand.NAME}'s inputs are mostly English-language and US-based. Where that skews the reading, and the non-English public sources under consideration to fix it.`,
    main,
  });
}

// ---------------------------------------------------------------------------
// /reference-plan.html
// ---------------------------------------------------------------------------
export function referencePlanPage(ctx, ref = null) {
  const s = ctx.state || {};
  const sh = s.shadow && typeof s.shadow === 'object' ? s.shadow : null;
  const fmt = (v) => (isNum(v) ? num(v, 1) : '—');

  let shadowHtml;
  if (sh) {
    const offP = new Map((Array.isArray(s.pillars) ? s.pillars : []).map((p) => [p.id, p]));
    const shP = new Map();
    if (Array.isArray(sh.pillars)) for (const p of sh.pillars) shP.set(p.id, isNum(p.score) ? p.score : null);
    else if (sh.pillars && typeof sh.pillars === 'object') {
      for (const [k, v] of Object.entries(sh.pillars)) shP.set(k, isNum(v) ? v : (v && isNum(v.score) ? v.score : null));
    }
    const shDark = new Set(Array.isArray(sh.dark_pillars) ? sh.dark_pillars : []);
    const rows = PILLAR_IDS.map((id) => {
      const o = offP.get(id);
      const a = o && isNum(o.score) ? o.score : null;
      const b = shP.has(id) ? shP.get(id) : null;
      const d = isNum(a) && isNum(b) ? b - a : null;
      return `<tr><td>${esc(pillarName(id))}</td><td class="n">${o && o.dark ? 'dark' : fmt(a)}</td><td class="n">${shDark.has(id) ? 'dark' : fmt(b)}</td><td class="n ${d === null ? 'xt-flat' : cls(d)}">${d === null ? '—' : esc(dTxt(d))}</td></tr>`;
    }).join('');
    const scoreD = isNum(sh.score) && isNum(s.score) ? sh.score - s.score : null;
    const addenda = Array.isArray(sh.addenda_sources) ? sh.addenda_sources : [];
    shadowHtml = `<h2 id="now">Official vs candidate, this reading</h2>
<p>A candidate score is live. It uses the frozen v1 reference plus ${addenda.length ? `the addenda for <b>${addenda.map((x) => esc(typeof x === 'string' ? x : (x && x.id) || '')).join(', ')}</b>` : 'pending addenda'}. Only the official column sets the level.</p>
<div class="xt-tbl"><table><thead><tr><th></th><th>Official (v1)</th><th>Candidate</th><th>Diff</th></tr></thead><tbody>
<tr><td><b>Composite</b></td><td class="n"><b>${fmt(s.score)}</b></td><td class="n"><b>${fmt(sh.score)}</b></td><td class="n ${scoreD === null ? 'xt-flat' : cls(scoreD)}">${scoreD === null ? '—' : esc(dTxt(scoreD))}</td></tr>
<tr><td><b>Level</b></td><td class="n">${esc(s.level ?? '—')} ${esc(s.level_name || '')}</td><td class="n">${isNum(sh.level_estimate) ? `${esc(sh.level_estimate)} ${esc(levelName(sh.level_estimate))}` : esc(sh.level_estimate ?? '—')}</td><td class="n">${isNum(sh.level_estimate) && sh.level_estimate !== s.level ? 'differs' : 'same'}</td></tr>
${rows}</tbody></table></div>
<p class="xt-note">Both columns come from the same hourly run and the same raw values; they differ only in which reference grids are allowed to score a source.</p>`;
  } else {
    shadowHtml = `<h2 id="now">Official vs candidate, this reading</h2>
<p>No addenda are live yet, so there is no candidate score to compare: the official score is the only score. ${Array.isArray(s.uncalibrated_sources) && s.uncalibrated_sources.length ? `${s.uncalibrated_sources.length} sources (${s.uncalibrated_sources.map(esc).join(', ')}) are collected and published every hour but not scored; they are the first in line for an addendum.` : ''}</p>`;
  }

  const refFacts = ref ? `<div class="xt-tbl"><table><tbody>
<tr><th>Version</th><td>v1 (frozen)</td></tr>
${ref.built_at ? `<tr><th>Built</th><td class="n">${esc(utc(ref.built_at))}</td></tr>` : ''}
${ref.window ? `<tr><th>Window</th><td class="n">${esc(ref.window)}</td></tr>` : ''}
${ref.window_days ? `<tr><th>Window length</th><td class="n">${esc(ref.window_days)} days</td></tr>` : ''}
${ref.sources ? `<tr><th>Sources with grids</th><td>${ref.sources.map(esc).join(', ')}</td></tr>` : ''}
${ref.hash ? `<tr><th>File hash</th><td><code>${esc(ref.hash)}</code></td></tr>` : ''}
</tbody></table></div>` : '';

  const main = `<p class="eyebrow">Reference plan</p>
<h1>How the baseline gets updated</h1>
<p class="lede">Every ${esc(brand.NAME)} score is a percentile against a frozen reference: a year of history per source, cut into fixed grids and never regenerated. Freezing it is what lets anyone re-run the arithmetic on an old receipt and get the same number. But sources get added and the world shifts, so the reference has to change sometimes. This is the rule for how, written down before it is needed.</p>

<h2 id="v1">Reference v1, frozen</h2>
${refFacts}
<p>The file is <a href="${esc(brand.REPO_URL)}/blob/main/data/reference.json" target="_blank" rel="noopener">data/reference.json</a>. Rebuilding it in place would silently rebase every score ever published, so it is never rebuilt. Changes arrive as separate addenda.</p>

<h2 id="addenda">Addenda run as a shadow score</h2>
<ol>
<li><b>Collect.</b> A new source is collected and published hourly as <i>uncalibrated</i>: its raw value is visible, it has no weight.</li>
<li><b>Calibrate.</b> Its own reference year is backfilled into an addendum file with its own hash. v1 is not touched.</li>
<li><b>Shadow.</b> Every hour the engine computes two scores from the same raw values: the <b>official</b> score (v1 only) and a <b>candidate</b> score (v1 plus addenda). Both are published side by side; only the official one sets the level, posts to X or fires the feeds.</li>
</ol>

<h2 id="promotion">Promotion rule</h2>
<p>An addendum is promoted only when all three hold:</p>
<ul>
<li>at least <b>14 days</b> of shadow running;</li>
<li>at least <b>95% uptime</b> for the new source over that period;</li>
<li>a <b>published diff</b>: official vs candidate for every reading in the shadow period, with the level changes the candidate would have caused.</li>
</ul>

<h2 id="cutover">Cutover</h2>
<p>Promotion creates <b>reference v2</b>: v1 plus the addenda, as a new file with a new hash. Receipts carry the reference version and hash they were computed against, so every receipt issued under v1 still verifies against v1, which stays in the repository forever. The cutover reading is marked on the history chart and in the <a href="${esc(ctx.href('/changelog.html'))}">changelog</a>.</p>

<h2 id="shift">A permanent baseline shift</h2>
<p>If the world moves so far that a source sits pinned near the top of its v1 grid for weeks, the window itself has to move. That is handled as a new reference window, not an edit: the new window runs <b>30 days side by side</b> with the old one, both published, before it takes over. The old window, its hash and its receipts remain.</p>

${shadowHtml}

<p class="xt-note">Why the care: an index that quietly rebases can make any trend it likes. Ours can only change in public, with the old arithmetic still checkable. See also <a href="${esc(ctx.href('/bias.html'))}">known biases</a> and the <a href="${esc(ctx.href('/methodology.html'))}">methodology</a>.</p>`;

  return shell(ctx, {
    path: '/reference-plan.html',
    title: 'How the baseline gets updated',
    description: `${brand.NAME}'s reference is frozen. New sources run as a shadow score for 14+ days before promotion to a new reference version, and old receipts still verify.`,
    main,
  });
}

// ---------------------------------------------------------------------------
// /changelog.html
// ---------------------------------------------------------------------------
export function changelogPage(ctx) {
  const entries = hourlyEntries(ctx, 48);
  const srcName = (id) => id;

  const li = entries.map((e) => {
    const big = Math.abs(e.score_delta) >= DELTA_THRESHOLD;
    const pills = e.pillars.map((p) => {
      if (p.kind === 'dark') return `<span class="xt-pill dark">${esc(p.name)} went dark</span>`;
      if (p.kind === 'live') return `<span class="xt-pill live">${esc(p.name)} back live ${esc(num(p.to, 1))}</span>`;
      if (Math.abs(p.delta) < 0.05) return '';
      const hot = Math.abs(p.delta) >= PILLAR_THRESHOLD;
      return `<span class="xt-pill${hot ? ' hot' : ''}">${esc(p.name)} <span class="${cls(p.delta)}">${esc(dTxt(p.delta))}</span></span>`;
    }).join('');
    const srcs = e.sources.map((x) => `<span class="xt-pill ${x.kind}">source ${esc(srcName(x.id))} ${x.kind === 'dark' ? 'went dark' : 'back live'}</span>`).join('');
    const news = e.top_items.length
      ? `<ul class="news">${e.top_items.map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener nofollow">${esc(it.title)}</a> <span class="src">${esc(it.source || '')}</span></li>`).join('')}</ul>`
      : '';
    const lvl = e.level_change
      ? `<span class="xt-pill hot">LEVEL ${esc(e.level_change.from)} → ${esc(e.level_change.to)} ${esc(levelName(e.level_change.to))}</span>`
      : '';
    const gap = e.gap_hours > 1.75 ? ` <span class="t">(vs ${Math.round(e.gap_hours)} h earlier: no reading in between)</span>` : '';
    const anchor = `h-${e.hour.slice(0, 13)}`;
    return `<li id="${esc(anchor)}" class="${e.level_change ? 'lv' : big ? 'big' : ''}">
<div class="hd"><a href="${esc(ctx.href(readingPath(ctx, e.at)))}">${esc(utcDay(e.at))} ${esc(utcClock(e.at))} UTC</a><span>${esc(brand.NAME)} ${esc(e.level)} · ${esc(num(e.score, 1))} <span class="${cls(e.score_delta)}">${esc(dTxt(e.score_delta))}</span></span>${e.degraded ? '<span class="t">degraded</span>' : ''}${gap}</div>
${lvl || pills || srcs ? `<div>${lvl}${pills}${srcs}</div>` : '<div class="xt-note">No pillar moved by 0.1 or more.</div>'}
${news}
</li>`;
  }).join('\n');

  const main = `<p class="eyebrow">Changelog</p>
<h1>What moved</h1>
<p class="lede">The last ${entries.length} hours with a reading, newest first: how far the score and each pillar moved since the hour before, any level change, any source going dark or coming back, and the three highest-scored news items published in between. Red marks a level change, amber a move of ${DELTA_THRESHOLD}+ points. ▲ is louder, ▼ quieter.</p>
<p><a class="xt-btn ghost" href="${esc(ctx.href('/alerts.html'))}">GET THESE AS ALERTS →</a><a class="xt-btn ghost" href="${esc(ctx.href('/history.html'))}">FULL HISTORY →</a></p>
${entries.length ? `<ol class="xt-log">\n${li}\n</ol>` : '<p>Not enough readings yet: the changelog starts with the second hour on record.</p>'}
<p class="xt-note">News items are context, not cause: the newsroom does not feed the score. ${esc(brand.DISCLAIMER)}</p>`;

  return shell(ctx, {
    path: '/changelog.html',
    title: 'What moved: the hourly changelog',
    description: `Hour by hour, what moved the ${brand.NAME} AI activity index: score and pillar changes, level changes, sources going dark, and the top news of each hour.`,
    main,
  });
}

// Re-exported for the homepage module, which may want the descriptions inline.
export { alternativeSignals };
