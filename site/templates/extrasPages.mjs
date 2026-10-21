// The extras pages, rendered with the shared site layout:
//   /alerts.html          pick triggers -> feed URLs, RSS-to-email/webhook recipes, in-tab notifications
//   /export.html          downloads (CSV/JSON/TXT), embed snippets, fetch snippet, licence line
//   /bias.html            known biases and blind spots of the inputs
//   /reference-plan.html  how the frozen baseline gets updated (and the shadow score, when live)
//   /changelog.html       "What moved": the last 48 hourly entries
// Data comes from extrasData.mjs; feeds and CSVs are written by site/extras.mjs.

import { esc, num, utc, utcClock, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
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
@media (max-width:560px){.xt-btn{min-height:44px;display:inline-flex;align-items:center}.xt-btn.sm{min-height:40px;font-size:12px}}
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
.xt-log .hd{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;font:600 13px/1.4 var(--mono);color:var(--ink);margin:0}
.xt-log .hd a{color:var(--ink)}
.xt-log .hd .t{color:var(--ink-faint,#6B7686);font-weight:500}
.xt-log .news{list-style:none;padding:0;margin:6px 0 0}
.xt-log .news li{font-size:14px;margin:3px 0;line-height:1.45}
.xt-log .news .src{font:500 11px var(--mono);color:var(--ink-faint,#6B7686)}
.xt-back{margin-top:36px;font-size:14px}
.xt-faq{margin:28px 0 0;max-width:62ch}
.xt-faq h2{font:700 1.25rem/1.25 var(--sans);margin:0 0 10px;color:var(--ink)}
.xt-faq h3{font:700 1rem/1.3 var(--sans);margin:14px 0 6px;color:var(--ink)}
.xt-faq p{margin:0 0 6px;font-size:14px;color:var(--ink-dim);line-height:1.55}
.xt-faq-key{margin-top:14px!important}
.xt-faq a{color:var(--accent,#4ADE80);text-decoration:underline;text-underline-offset:2px}
</style>`;

function shell(ctx, { path, title, description, ogTitle, main, head, bodyEnd, jsonld }) {
  // No "back to the index" link: the shared header's brand does that on every page.
  const back = `<p class="xt-back"><a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a> · <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a></p>`;
  return page({
    ctx, path, title: `${title} · ${brand.NAME}`, description, ogTitle,
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
    { key: 'daily', path: '/feed-daily.xml', title: 'Daily brief', blurb: 'One item per completed UTC day: the closing reading and that day’s highest-scoring stories. Paste it into Blogtrottr for a daily email.', checked: true },
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
  const PATH = '/alerts.html';
  const qTitle = `How do I get alerts when ${brand.NAME} moves?`;
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

  // Tip #268: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const pickQ = 'Which triggers should you pick?';
  const feedsQ = 'What are your feed URLs?';
  const emailQ = 'How do I turn a feed into email?';
  const hookQ = 'How do I send it to a webhook, Slack or Discord?';
  const xQ = 'How do I follow on X?';
  const tabQ = 'How do I get notified while this tab is open?';
  // FAQ answers restate lede / email note / in-tab note only (FINDABILITY §3.3).
  // Refuse: private email intake, alerts-as-index-input, doom-probability.
  const faq = [
    [qTitle,
      `Pick what counts as news to you: a level change, a big swing in the score, or one pillar spiking. Every trigger is a plain RSS feed rebuilt with each hourly reading, so it works in any feed reader and can be piped to email, Slack, Discord or a webhook with free tools. Nothing to sign up for here.`],
    [pickQ,
      'A level change, a big swing in the score, or one pillar spiking — each trigger is a plain RSS feed rebuilt with each hourly reading.'],
    [feedsQ,
      'Copy a URL into your feed reader, or open it straight in Feedly or Inoreader. OPML imports several feeds at once.'],
    [emailQ,
      `Your address goes to the third-party email tools (Blogtrottr, FeedRabbit), not to ${brand.NAME}; this site never asks for it.`],
    [hookQ,
      'Pipe an RSS feed URL through IFTTT, Zapier, Make or Slack\'s RSS app. Feeds rebuild about hourly.'],
    [xQ,
      `${brand.NAME} posts level changes and notable readings on X. Follow, then tap the bell and choose "All posts".`],
    [tabQ,
      'Leave this page open in a tab. Your browser checks the current reading every 10 minutes and shows a desktop notification when one of your thresholds trips. It stops when you close the tab.'],
    [`Does ${brand.NAME} ask for my email?`,
      `Your address goes to the third-party email tools (Blogtrottr, FeedRabbit), not to ${brand.NAME}; this site never asks for it.`],
    ['Can I get notified without a feed reader?',
      'Leave this page open in a tab. Your browser checks the current reading every 10 minutes and shows a desktop notification when one of your thresholds trips. Your settings stay in this browser\'s local storage and are never sent anywhere. It stops when you close the tab.'],
    [`Do alerts move the ${brand.NAME} score?`,
      `They never move the ${brand.NAME} score. Subscribing to RSS or in-tab notifications is separate from the tempo index.`],
    // Tip #349: email / webhook card H3s are question-shaped and mirrored in FAQ (§3.3).
    ['How do I email alerts with Blogtrottr?',
      'Open blogtrottr.com, paste a feed URL from step 2, enter your address on their site and choose "real-time". You get one email per new item. Free.'],
    ['How do I email alerts with FeedRabbit?',
      'At feedrabbit.com, add the feed URL and pick instant or a daily digest. Free tier available.'],
    ['How do I pipe a feed through IFTTT?',
      'Create an applet: If "RSS Feed → New feed item" (paste the URL), Then "Webhooks → Make a web request", or Discord, Slack, SMS, phone notification.'],
    ['How do I pipe a feed through Zapier?',
      'Trigger "RSS by Zapier → New Item in Feed", action "Webhooks by Zapier → POST" (or Slack / Discord / Teams).'],
    ['How do I pipe a feed through Make?',
      'Scenario: "RSS → Watch RSS feed items" → "HTTP → Make a request" to your endpoint. Set the schedule to every 15–60 minutes.'],
    ['How do I subscribe in Slack directly?',
      'Add Slack\'s RSS app to a channel and run /feed subscribe <feed URL>.'],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `<p class="eyebrow">Alerts</p>
<h1>${esc(qTitle)}</h1>
<p class="lede">Pick what counts as news to you: a level change, a big swing in the score, or one pillar spiking. Every trigger below is a plain RSS feed rebuilt with each hourly reading, so it works in any feed reader and can be piped to email, Slack, Discord or a webhook with free tools. Nothing to sign up for here.</p>

<h2 id="pick">1 · Which triggers should you pick?</h2>
<div class="xt-checks" id="xt-picks">${checks}</div>

<h2 id="feeds">2 · What are your feed URLs?</h2>
<p>Copy a URL into your feed reader, or open it straight in Feedly or Inoreader.</p>
<ul class="xt-feeds" id="xt-feeds">
${list}
</ul>
<p class="xt-row"><button type="button" class="xt-btn ghost" id="xt-opml">DOWNLOAD SELECTED AS OPML</button><span class="xt-note">OPML imports several feeds at once into most readers.</span></p>

<h2 id="email">3 · How do I turn a feed into email?</h2>
<div class="xt-grid">
  <div class="xt-card"><h3>How do I email alerts with Blogtrottr?</h3><p>Open <a href="https://blogtrottr.com/" target="_blank" rel="noopener">blogtrottr.com</a>, paste a feed URL from step 2, enter your address on their site and choose "real-time". You get one email per new item. Free.</p></div>
  <div class="xt-card"><h3>How do I email alerts with FeedRabbit?</h3><p>At <a href="https://feedrabbit.com/" target="_blank" rel="noopener">feedrabbit.com</a>, add the feed URL and pick instant or a daily digest. Free tier available.</p></div>
</div>
<p class="xt-note">Both are independent third-party services with their own terms and privacy policies. Your address goes to them, not to ${esc(brand.NAME)}; this site never asks for it.</p>

<h2 id="webhook">4 · How do I send it to a webhook, Slack or Discord?</h2>
<div class="xt-grid">
  <div class="xt-card"><h3>How do I pipe a feed through IFTTT?</h3><p>Create an applet: <b>If</b> "RSS Feed → New feed item" (paste the URL), <b>Then</b> "Webhooks → Make a web request", or Discord, Slack, SMS, phone notification.</p></div>
  <div class="xt-card"><h3>How do I pipe a feed through Zapier?</h3><p>Trigger "RSS by Zapier → New Item in Feed", action "Webhooks by Zapier → POST" (or Slack / Discord / Teams). Item title, link and description are available as fields.</p></div>
  <div class="xt-card"><h3>How do I pipe a feed through Make?</h3><p>Scenario: "RSS → Watch RSS feed items" → "HTTP → Make a request" to your endpoint. Set the schedule to every 15–60 minutes.</p></div>
  <div class="xt-card"><h3>How do I subscribe in Slack directly?</h3><p>Add Slack's RSS app to a channel and run <code>/feed subscribe &lt;feed URL&gt;</code>.</p></div>
</div>
<p class="xt-note">Feeds rebuild once per reading (about hourly), so polling more often than every 15 minutes gains nothing. Each item's &lt;guid&gt; is fixed per reading time, so reruns never double-post.</p>

<h2 id="x">5 · How do I follow on X?</h2>
<p>${esc(brand.NAME)} posts level changes and notable readings on X as <a href="${esc(xUrl)}" target="_blank" rel="noopener">${esc(handle)}</a>. Follow, then tap the bell on the profile and choose "All posts" to get a push notification on your phone.</p>
<p><a class="xt-btn" href="${esc(xUrl)}" target="_blank" rel="noopener">FOLLOW ${esc(handle)} ON X →</a></p>

<h2 id="tab">6 · How do I get notified while this tab is open?</h2>
<p>No feed reader at all? Leave this page open in a tab. Your browser checks the <a href="${esc(ctx.href('/api/state.json'))}">current reading</a> every 10 minutes and shows a desktop notification when one of your thresholds trips. Your settings stay in this browser's local storage and are never sent anywhere. It stops when you close the tab.</p>
<div class="xt-card">
  <div class="xt-row"><label class="xt-row"><input type="checkbox" id="xn-level" checked> Level changes</label></div>
  <div class="xt-row" style="margin-top:8px"><label class="xt-row"><input type="checkbox" id="xn-delta-on" checked> Score moves of at least <input type="number" id="xn-delta" min="0.5" max="50" step="0.5" value="${DELTA_THRESHOLD}"> points</label></div>
  <div class="xt-row" style="margin-top:8px"><label class="xt-row"><input type="checkbox" id="xn-pillar-on" checked> Pillar moves of at least <input type="number" id="xn-pillar" min="1" max="100" step="1" value="${PILLAR_THRESHOLD}"> points in:</label></div>
  <div class="xt-checks">${pillarChecks}</div>
  <p class="xt-row"><button type="button" class="xt-btn" id="xn-start">NOTIFY ME WHILE THIS TAB IS OPEN</button><button type="button" class="xt-btn ghost" id="xn-stop" hidden>STOP</button></p>
  <p class="xt-status" id="xn-status" role="status" aria-live="polite"></p>
</div>
<p class="xt-note">${esc(brand.DISCLAIMER)}</p>
<section class="xt-faq" aria-labelledby="faq">
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="xt-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/verify.html'))}">How do you check a ${esc(brand.NAME)} reading yourself?</a>
    · <a href="${esc(ctx.href('/free-tools.html'))}">What free tools does ${esc(brand.NAME)} publish?</a>
    · <a href="${esc(ctx.href('/export.html'))}">How do I export and embed ${esc(brand.NAME)} data?</a>
    · <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a>.</p>
</section>`;

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

  const description = `${qTitle} Get an alert when ${brand.NAME} changes level, the score swings ${DELTA_THRESHOLD}+ points or a pillar spikes. RSS feeds you can pipe to email, Slack, Discord or a webhook. This site never asks for your email.`;
  return shell(ctx, {
    path: PATH,
    title: qTitle,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    main, bodyEnd: js,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description: `RSS, email recipes, webhook tools and in-tab notifications for ${brand.NAME} level changes, score swings and pillar spikes. Nothing to sign up for here.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
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
  });
}

// ---------------------------------------------------------------------------
// /export.html
// ---------------------------------------------------------------------------
export function exportPage(ctx) {
  const PATH = '/export.html';
  const qTitle = `How do I export and embed ${brand.NAME} data?`;
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

  // Tip #351: download-card H3s are question-shaped and mirrored in FAQ (§3.3).
  const dl = [
    ['api/history.csv', 'How do I download every reading as CSV?', `t, score, level, degraded, rule_fired and one column per pillar. ${Array.isArray(ctx.history) ? ctx.history.length : 0} rows today; opens in Excel, Sheets, pandas.`],
    ['api/history.json', 'How do I download every reading as JSON?', 'The same observations plus every per-source score.'],
    ['api/pillars.csv', 'How do I download current pillars as CSV?', 'The five pillars right now: score, percentile, sources ok, dark and uncalibrated flags.'],
    ['api/state.json', 'How do I download the current reading as JSON?', 'Everything on the homepage, including each source\'s raw value and its receipt hash.'],
    ['api/latest.txt', 'How do I download the current reading as one line of text?', 'For shell prompts, status bars and chat bots: curl it and print it.'],
    ['api/index.json', 'Where is the API index?', 'Every endpoint, including per-reading receipts at api/receipts/{id}.json.'],
  ].map(([p, t, d]) => `<div class="xt-card"><h3><a href="${esc(ctx.href(`/${p}`))}" download>${esc(t)}</a></h3><p><code>/${esc(p)}</code></p><p>${esc(d)}</p></div>`).join('');

  const snippet = (id, label, code) => `<h3 style="margin-top:18px">${esc(label)}</h3><pre id="${id}">${esc(code)}</pre><button type="button" class="xt-btn sm ghost" data-copy-from="${id}">COPY</button>`;

  // Tip #268: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const dlQ = 'What can I download?';
  const embQ = 'How do I embed the current reading?';
  const codeQ = 'How do I use it from code?';
  const licQ = 'What is the licence and credit?';
  // FAQ answers restate lede / download / CORS / licence copy only (FINDABILITY §3.3).
  // Refuse: paid API / export-as-index-input / doom-probability.
  const faq = [
    [qTitle,
      `Every number ${brand.NAME} publishes is downloadable, embeddable and free to reuse under ${brand.LICENSE} with a credit line. Files rebuild with each hourly reading.`],
    [dlQ,
      'Every reading as CSV or JSON, current pillars as CSV, the current reading as JSON or one line of text, and an API index that lists every endpoint including per-reading receipts.'],
    [embQ,
      'The widget is a 320×152 box that redraws with every reading and matches light or dark pages. It renders the number server-side, so it still shows with scripts blocked.'],
    [codeQ,
      'No key, no rate limit beyond GitHub\'s own. The site sends Access-Control-Allow-Origin: *, so these files can be fetched from any web page without a proxy. Please cache: data changes about once an hour.'],
    [licQ,
      `Text and data are ${brand.LICENSE}. Reuse anything, commercially too, with a credit line next to it.`],
    ['What files can I download?',
      'Every reading as CSV or JSON, current pillars as CSV, the current reading as JSON or one line of text, and an API index that lists every endpoint including per-reading receipts.'],
    ['Do I need an API key?',
      'No key, no rate limit beyond GitHub\'s own. The site sends Access-Control-Allow-Origin: *, so these files can be fetched from any web page without a proxy. Please cache: data changes about once an hour.'],
    [`Does exporting move the ${brand.NAME} score?`,
      `It never moves the ${brand.NAME} score. Downloads, embeds and API fetches are separate from the tempo index.`],
    // Tip #351: download-card H3s are question-shaped and mirrored in FAQ (§3.3).
    ['How do I download every reading as CSV?',
      `t, score, level, degraded, rule_fired and one column per pillar. ${Array.isArray(ctx.history) ? ctx.history.length : 0} rows today; opens in Excel, Sheets, pandas.`],
    ['How do I download every reading as JSON?',
      'The same observations plus every per-source score.'],
    ['How do I download current pillars as CSV?',
      'The five pillars right now: score, percentile, sources ok, dark and uncalibrated flags.'],
    ['How do I download the current reading as JSON?',
      'Everything on the homepage, including each source\'s raw value and its receipt hash.'],
    ['How do I download the current reading as one line of text?',
      'For shell prompts, status bars and chat bots: curl it and print it.'],
    ['Where is the API index?',
      'Every endpoint, including per-reading receipts at api/receipts/{id}.json.'],
    // Tip #350: badge / snippet H3s are question-shaped and mirrored in FAQ (§3.3).
    ['How do I use it live in Google Sheets?',
      'Paste the Sheets formula from this page into a cell. Files rebuild with each hourly reading.'],
    ['How do I embed the widget iframe?',
      'The widget is a 320×152 box that redraws with every reading and matches light or dark pages. It renders the number server-side, so it still shows with scripts blocked.'],
    ['What badge works when iframes are stripped?',
      'Use the badge SVG for READMEs and newsletters that strip iframes. HTML and Markdown snippets are printed beside the preview.'],
    ['How do I add the badge in HTML?',
      'Copy the Badge (HTML) snippet on this page next to the badge preview.'],
    ['How do I add the badge in Markdown?',
      'Copy the Badge (Markdown) snippet on this page next to the badge preview.'],
    ['How do I use the share card image?',
      'The share card is a 1200×675 PNG. Copy the snippet on this page.'],
    ['How do I fetch it from JavaScript?',
      'No key. Fetch the published JSON or text endpoints from any web page; cache about once an hour.'],
    ['How do I fetch it from the shell?',
      'curl the published text endpoint. No key beyond GitHub\'s own limits.'],
    ['What attribution line should I use?',
      `Text and data are ${brand.LICENSE}. Reuse anything, commercially too, with the attribution line printed on this page.`],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `<p class="eyebrow">Export and embed</p>
<h1>${esc(qTitle)}</h1>
<p class="lede">Every number ${esc(brand.NAME)} publishes is downloadable, embeddable and free to reuse under ${esc(brand.LICENSE)} with a credit line. Files rebuild with each hourly reading${s && s.generated_at ? `; this page was built from the reading at ${esc(utc(s.generated_at))}` : ''}.</p>

<h2 id="download">What can I download?</h2>
<div class="xt-grid">${dl}</div>
${snippet('xs-sheets', 'How do I use it live in Google Sheets?', sheets)}

<h2 id="embed">How do I embed the current reading?</h2>
<p>The widget is a 320×152 box that redraws with every reading and matches light or dark pages. It renders the number server-side, so it still shows with scripts blocked.</p>
<iframe src="${esc(ctx.href('/embed.html'))}" width="320" height="152" style="border:0;max-width:100%" loading="lazy" title="${esc(brand.NAME)} widget preview"></iframe>
${snippet('xs-iframe', 'How do I embed the widget iframe?', embedSnippet)}
<h3 style="margin-top:18px">What badge works when iframes are stripped?</h3>
<p><img src="${esc(ctx.href('/badge.svg'))}" alt="${esc(brand.NAME)} badge preview" height="20"></p>
${snippet('xs-badge-html', 'How do I add the badge in HTML?', badgeHtml)}
${snippet('xs-badge-md', 'How do I add the badge in Markdown?', badgeMd)}
${snippet('xs-card', 'How do I use the share card image?', cardHtml)}

<h2 id="api">How do I use it from code?</h2>
${snippet('xs-js', 'How do I fetch it from JavaScript?', jsSnippet)}
${snippet('xs-curl', 'How do I fetch it from the shell?', `curl -s ${ctx.url('/api/latest.txt')}`)}
<p><b>CORS:</b> the site is served by GitHub Pages, which sends <code>Access-Control-Allow-Origin: *</code>, so these files can be fetched from any web page without a proxy. No key, no rate limit beyond GitHub's own. Please cache: data changes about once an hour.</p>

<h2 id="licence">What is the licence and credit?</h2>
<p>Text and data are ${esc(brand.LICENSE)}. Reuse anything, commercially too, with this line (or an equivalent) next to it:</p>
${snippet('xs-attr', 'What attribution line should I use?', attribution)}
<p class="xt-note">${esc(brand.DISCLAIMER)} Want an alert instead of a file? See <a href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a>.</p>
<section class="xt-faq" aria-labelledby="faq">
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="xt-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/verify.html'))}">How do you check a ${esc(brand.NAME)} reading yourself?</a>
    · <a href="${esc(ctx.href('/free-tools.html'))}">What free tools does ${esc(brand.NAME)} publish?</a>
    · <a href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a>
    · <a href="${esc(ctx.href('/agents.html'))}">How should AI agents use ${esc(brand.NAME)}?</a>.</p>
</section>`;

  const js = `<script>(function(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-copy-from]');if(!b)return;
var el=document.getElementById(b.getAttribute('data-copy-from'));if(!el)return;var t=el.textContent;
var done=function(){var o=b.textContent;b.textContent='COPIED';setTimeout(function(){b.textContent=o},1400)};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){prompt('Copy',t)})}else{prompt('Copy',t)}})})();</script>`;

  const description = `${qTitle} Download every ${brand.NAME} reading as CSV or JSON, embed the live widget or badge, or fetch the current reading from code. Free under ${brand.LICENSE}. No API key.`;
  return shell(ctx, {
    path: PATH,
    title: qTitle,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    main, bodyEnd: js,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description: `CSV, JSON, widget, badge and public API for ${brand.NAME} readings. Free under ${brand.LICENSE} with attribution. No key.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
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
  });
}

// ---------------------------------------------------------------------------
// /bias.html
// ---------------------------------------------------------------------------
export function biasPage(ctx) {
  const PATH = '/bias.html';
  const qTitle = `What can ${brand.NAME} not see?`;
  const inputs = [
    ['arXiv', 'Capability', 'Preprints are overwhelmingly in English, and the habit of posting to arXiv first is strongest in US and European labs. Work that appears first in Chinese-language venues or company blogs is undercounted.'],
    ['GitHub releases, Hugging Face, OpenRouter', 'Capability (uncalibrated)', 'Western-hosted platforms. Chinese labs often ship first on ModelScope or domestic mirrors, so a busy week in Beijing can look quiet here.'],
    ['SEC full-text search, US equities, Vast.ai / DataCrunch prices', 'Compute & Capital', 'US filings and US-listed companies, priced in dollars. Cloud GPU markets are global but still dollar-denominated Western venues. Capital spent by state-backed or unlisted companies outside the US barely registers.'],
    ['Hacker News', 'Attention', 'An English-language forum with a mostly US and European tech audience. Its idea of "big news" is a Silicon Valley one.'],
    ['Chinese Wikipedia pageviews (uncalibrated)', 'Attention', 'A first non-English attention leg. Still Wikimedia, still public web curiosity — not WeChat, Zhihu, or domestic model hubs — so it narrows the English mirror without claiming to measure China.'],
    ['English Wikipedia pageviews', 'Attention', 'Only the English edition. Interest that shows up as Japanese, German or Spanish readers is invisible.'],
    ['US Federal Register, GOV.UK', 'Governance', 'Two English-speaking jurisdictions. EU implementing acts, Chinese administrative rules and other national regulators do not move the pillar.'],
    ['Polymarket, Kalshi, Manifold', 'Markets (uncalibrated)', 'English-language questions written mostly by and for US traders. What they choose to list is itself a filter.'],
  ].map(([n, p, d]) => `<tr><td><b>${esc(n)}</b></td><td>${esc(p)}</td><td>${esc(d)}</td></tr>`).join('');

  // Tip #352: candidate-card H3s are question-shaped and mirrored in FAQ (§3.3).
  const candidates = [
    ['Would other-language Wikipedia pageviews help?', 'Attention', 'Same Wikimedia pageviews API the English series already uses, pointed at the German, French, Spanish, Japanese, Chinese and other editions. The cheapest fix on this list: same method, same receipts.'],
    ['Would EUR-Lex widen governance?', 'Governance', 'The EU\'s official journal and legal database. Counting AI-related acts, implementing decisions and consultations would add the jurisdiction with the most active AI rulebook.'],
    ['Would China MIIT and CAC notices help?', 'Governance', 'Public notices from the Ministry of Industry and Information Technology and the Cyberspace Administration of China, including published batches of registered generative AI services.'],
    ['Would Japan METI publications help?', 'Governance', 'The Ministry of Economy, Trade and Industry\'s AI guidelines, study groups and policy publications.'],
    ['Would India MeitY notices help?', 'Governance', 'The Ministry of Electronics and Information Technology\'s advisories, IndiaAI programme notices and consultations.'],
  ].map(([n, p, d]) => `<div class="xt-card"><h3>${esc(n)}</h3><p><span class="xt-pill">${esc(p)}</span></p><p>${esc(d)}</p></div>`).join('');

  // Tip #268: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const leanQ = 'Where does each input lean?';
  const skewQ = 'What does that skew?';
  const candQ = 'Which sources are under consideration?';
  const propQ = 'How do I propose a source?';
  // FAQ answers restate lede / skew / candidates copy only (FINDABILITY §3.3).
  // Refuse: doom-probability, stuffing, bias-as-excuse-to-hide-method.
  const faq = [
    [qTitle,
      `An index is only as wide as its inputs. Ours are public, free and recomputable, and that choice comes with a tilt: almost everything ${brand.NAME} counts is published in English, and most of it in the United States.`],
    [leanQ,
      'Almost everything counted is published in English, and most of it in the United States. The table below names the lean of each input.'],
    [skewQ,
      'Timing (events outside the English-speaking web reach inputs late or never), size (the level reads how busy the English-speaking AI world is), governance (US and UK calendar, not the world\'s), and attention (stories ignored on Hacker News do not exist to that pillar).'],
    [candQ,
      'Each candidate has to be public, free to read without a private agreement, machine-readable, with enough history to build a reference year, and licensed so the counts can be republished with receipts.'],
    [propQ,
      `Know a public, non-English or non-Western dataset that counts AI activity? Send it through the feedback form with a link to its API or download, how far back it goes, and its licence.`],
    ['What does that skew?',
      'Timing (events outside the English-speaking web reach inputs late or never), size (the level reads how busy the English-speaking AI world is), governance (US and UK calendar, not the world\'s), and attention (stories ignored on Hacker News do not exist to that pillar).'],
    ['How do new sources get into the score?',
      'A new source never goes straight into the score. It is collected and published as an uncalibrated signal first, then run as a shadow score beside the official one, and promoted only under the published rule on how the baseline gets updated.'],
    [`Is the biased reading a doom probability?`,
      `No. ${brand.NAME} measures activity tempo. The level reads how busy the English-speaking AI world is — not danger, and not a probability of harm.`],
    // Tip #352: candidate-card H3s are question-shaped and mirrored in FAQ (§3.3).
    ['Would other-language Wikipedia pageviews help?',
      'Same Wikimedia pageviews API the English series already uses, pointed at the German, French, Spanish, Japanese, Chinese and other editions. The cheapest fix on this list: same method, same receipts.'],
    ['Would EUR-Lex widen governance?',
      'The EU\'s official journal and legal database. Counting AI-related acts, implementing decisions and consultations would add the jurisdiction with the most active AI rulebook.'],
    ['Would China MIIT and CAC notices help?',
      'Public notices from the Ministry of Industry and Information Technology and the Cyberspace Administration of China, including published batches of registered generative AI services.'],
    ['Would Japan METI publications help?',
      'The Ministry of Economy, Trade and Industry\'s AI guidelines, study groups and policy publications.'],
    ['Would India MeitY notices help?',
      'The Ministry of Electronics and Information Technology\'s advisories, IndiaAI programme notices and consultations.'],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `<p class="eyebrow">Known biases and blind spots</p>
<h1>${esc(qTitle)}</h1>
<p class="lede">An index is only as wide as its inputs. Ours are public, free and recomputable, and that choice comes with a tilt: almost everything ${esc(brand.NAME)} counts is published in English, and most of it in the United States. This page says where that bends the reading, and what we are looking at to straighten it.</p>

<h2 id="inputs">Where does each input lean?</h2>
<div class="xt-tbl"><table><thead><tr><th>Input</th><th>Pillar</th><th>Lean</th></tr></thead><tbody>${inputs}</tbody></table></div>
<p>Most news sources behind <a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> are English-language as well. That newsroom does not feed the score, but it shapes which stories sit next to it.</p>

<h2 id="skew">What does that skew?</h2>
<ul>
<li><b>Timing.</b> A launch, rule or funding round outside the English-speaking web reaches our inputs late, when English coverage catches up, or never. The score can lag real events by days.</li>
<li><b>Size.</b> Activity is measured against each source's own history, so a source that systematically misses one region also has a quieter baseline. The bias is consistent rather than random, which keeps hour-to-hour moves meaningful but means the level reads "how busy is the English-speaking AI world".</li>
<li><b>Governance.</b> With two jurisdictions, the governance pillar reads the US and UK regulatory calendar, not the world's.</li>
<li><b>Attention.</b> A story that is huge in Seoul or São Paulo and ignored on Hacker News does not exist as far as this pillar knows.</li>
</ul>

<h2 id="candidates">Which sources are under consideration?</h2>
<p>Each candidate has to meet the same bar as today's inputs: public, free to read without a private agreement, machine-readable, with enough history to build a reference year, and licensed so the counts can be republished with receipts. Anyone has to be able to recompute the number.</p>
<div class="xt-grid">${candidates}</div>
<p>A new source never goes straight into the score. It is collected and published as an <b>uncalibrated</b> signal first, then run as a shadow score beside the official one, and promoted only under the published rule on <a href="${esc(ctx.href('/reference-plan.html'))}">How does the ${esc(brand.NAME)} baseline get updated?</a>.</p>

<h2 id="propose">How do I propose a source?</h2>
<p>Know a public, non-English or non-Western dataset that counts AI activity? Send it through the <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a> form with a link to its API or download, how far back it goes, and its licence. The more of those three you can answer, the faster it can be tested.</p>
<section class="xt-faq" aria-labelledby="faq">
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="xt-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>
    · <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a>.</p>
</section>`;

  const description = `${qTitle} ${brand.NAME}'s inputs are mostly English-language and US-based. Where that skews the reading, and the non-English public sources under consideration to fix it.`;
  return shell(ctx, {
    path: PATH,
    title: qTitle,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    main,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description: `${brand.NAME}'s inputs lean English and US-based. Where that skews timing, size, governance and attention — and candidates to widen the view.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
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
  });
}

// ---------------------------------------------------------------------------
// /reference-plan.html
// ---------------------------------------------------------------------------
export function referencePlanPage(ctx, ref = null) {
  const PATH = '/reference-plan.html';
  const qTitle = `How does the ${brand.NAME} baseline get updated?`;
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
    shadowHtml = `<h2 id="now">How do official and candidate scores compare this reading?</h2>
<p>A candidate score is live. It uses the frozen v1 reference plus ${addenda.length ? `the addenda for <b>${addenda.map((x) => esc(typeof x === 'string' ? x : (x && x.id) || '')).join(', ')}</b>` : 'pending addenda'}. Only the official column sets the level.</p>
<div class="xt-tbl"><table><thead><tr><th></th><th>Official (v1)</th><th>Candidate</th><th>Diff</th></tr></thead><tbody>
<tr><td><b>Composite</b></td><td class="n"><b>${fmt(s.score)}</b></td><td class="n"><b>${fmt(sh.score)}</b></td><td class="n ${scoreD === null ? 'xt-flat' : cls(scoreD)}">${scoreD === null ? '—' : esc(dTxt(scoreD))}</td></tr>
<tr><td><b>Level</b></td><td class="n">${esc(s.level ?? '—')} ${esc(s.level_name || '')}</td><td class="n">${isNum(sh.level_estimate) ? `${esc(sh.level_estimate)} ${esc(levelName(sh.level_estimate))}` : esc(sh.level_estimate ?? '—')}</td><td class="n">${isNum(sh.level_estimate) && sh.level_estimate !== s.level ? 'differs' : 'same'}</td></tr>
${rows}</tbody></table></div>
<p class="xt-note">Both columns come from the same hourly run and the same raw values; they differ only in which reference grids are allowed to score a source.</p>`;
  } else {
    shadowHtml = `<h2 id="now">How do official and candidate scores compare this reading?</h2>
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

  // Tip #269: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const v1Q = 'What is reference v1, and why is it frozen?';
  const addendaQ = 'How do addenda run as a shadow score?';
  const promoQ = 'When is an addendum promoted?';
  const cutoverQ = 'What happens at cutover?';
  const shiftQ = 'How does a permanent baseline shift work?';
  const nowQ = 'How do official and candidate scores compare this reading?';
  // FAQ answers restate lede / addenda / promotion / cutover copy only (FINDABILITY §3.3).
  // Refuse: doom-probability, stuffing, quiet-rebase claims.
  const faq = [
    [qTitle,
      `Every ${brand.NAME} score is a percentile against a frozen reference: a year of history per source, cut into fixed grids and never regenerated. Freezing it is what lets anyone re-run the arithmetic on an old receipt and get the same number. Sources get added and the world shifts, so the reference has to change sometimes — under a published rule, not a quiet rebuild.`],
    [v1Q,
      'A year of history per source, cut into fixed grids in data/reference.json. Rebuilding it in place would silently rebase every score ever published, so it is never rebuilt; changes arrive as separate addenda.'],
    [addendaQ,
      'Collect (uncalibrated, visible raw value, no weight), calibrate (own reference year in an addendum with its own hash; v1 is not touched), then shadow (official score from v1 only and a candidate score from v1 plus addenda, published side by side; only the official one sets the level).'],
    [promoQ,
      'Only when all three hold: at least 14 days of shadow running, at least 95% uptime for the new source over that period, and a published diff of official vs candidate for every reading in the shadow period, with the level changes the candidate would have caused.'],
    [cutoverQ,
      'Promotion creates reference v2: v1 plus the addenda, as a new file with a new hash. Receipts carry the reference version and hash they were computed against, so every receipt issued under v1 still verifies against v1.'],
    [shiftQ,
      'If a source sits pinned near the top of its v1 grid for weeks, a new reference window runs 30 days side by side with the old one, both published, before it takes over. The old window, its hash and its receipts remain.'],
    [nowQ,
      'Both columns come from the same hourly run and the same raw values; they differ only in which reference grids are allowed to score a source. Only the official column sets the level.'],
    ['How do new sources join the score?',
      'Collect (uncalibrated, visible raw value, no weight), calibrate (own reference year in an addendum with its own hash; v1 is not touched), then shadow (official score from v1 only and a candidate score from v1 plus addenda, published side by side; only the official one sets the level).'],
    [`Does updating the baseline make ${brand.NAME} a doom forecast?`,
      `No. ${brand.NAME} measures activity tempo. A new reference version keeps old receipts checkable against the file they used; it does not turn the index into a probability of harm.`],
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `<p class="eyebrow">Reference plan</p>
<h1>${esc(qTitle)}</h1>
<p class="lede">Every ${esc(brand.NAME)} score is a percentile against a frozen reference: a year of history per source, cut into fixed grids and never regenerated. Freezing it is what lets anyone re-run the arithmetic on an old receipt and get the same number. But sources get added and the world shifts, so the reference has to change sometimes. This is the rule for how, written down before it is needed.</p>

<h2 id="v1">${esc(v1Q)}</h2>
${refFacts}
<p>The file is <a href="${esc(brand.REPO_URL)}/blob/main/data/reference.json" target="_blank" rel="noopener">data/reference.json</a>. Rebuilding it in place would silently rebase every score ever published, so it is never rebuilt. Changes arrive as separate addenda.</p>

<h2 id="addenda">${esc(addendaQ)}</h2>
<ol>
<li><b>Collect.</b> A new source is collected and published hourly as <i>uncalibrated</i>: its raw value is visible, it has no weight.</li>
<li><b>Calibrate.</b> Its own reference year is backfilled into an addendum file with its own hash. v1 is not touched.</li>
<li><b>Shadow.</b> Every hour the engine computes two scores from the same raw values: the <b>official</b> score (v1 only) and a <b>candidate</b> score (v1 plus addenda). Both are published side by side; only the official one sets the level, posts to X or fires the feeds.</li>
</ol>

<h2 id="promotion">${esc(promoQ)}</h2>
<p>An addendum is promoted only when all three hold:</p>
<ul>
<li>at least <b>14 days</b> of shadow running;</li>
<li>at least <b>95% uptime</b> for the new source over that period;</li>
<li>a <b>published diff</b>: official vs candidate for every reading in the shadow period, with the level changes the candidate would have caused.</li>
</ul>

<h2 id="cutover">${esc(cutoverQ)}</h2>
<p>Promotion creates <b>reference v2</b>: v1 plus the addenda, as a new file with a new hash. Receipts carry the reference version and hash they were computed against, so every receipt issued under v1 still verifies against v1, which stays in the repository forever. The cutover reading is marked on the history chart and in <a href="${esc(ctx.href('/changelog.html'))}">What moved the ${esc(brand.NAME)} score this hour?</a>.</p>

<h2 id="shift">${esc(shiftQ)}</h2>
<p>If the world moves so far that a source sits pinned near the top of its v1 grid for weeks, the window itself has to move. That is handled as a new reference window, not an edit: the new window runs <b>30 days side by side</b> with the old one, both published, before it takes over. The old window, its hash and its receipts remain.</p>

${shadowHtml}

<p class="xt-note">Why the care: an index that quietly rebases can make any trend it likes. Ours can only change in public, with the old arithmetic still checkable. See also <a href="${esc(ctx.href('/bias.html'))}">What can ${esc(brand.NAME)} not see?</a> and <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
<section class="xt-faq" aria-labelledby="faq">
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="xt-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/bias.html'))}">What can ${esc(brand.NAME)} not see?</a>
    · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
</section>`;

  const description = `${qTitle} ${brand.NAME}'s reference is frozen. New sources run as a shadow score for 14+ days before promotion to a new reference version, and old receipts still verify.`;
  return shell(ctx, {
    path: PATH,
    title: qTitle,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    main,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description: `${brand.NAME} freezes its reference year. New sources shadow for 14+ days with a published diff before promotion; old receipts still verify.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
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
  });
}

// ---------------------------------------------------------------------------
// /changelog.html
// ---------------------------------------------------------------------------
export function changelogPage(ctx) {
  const PATH = '/changelog.html';
  const qTitle = `What moved the ${brand.NAME} score this hour?`;
  const entries = hourlyEntries(ctx, 48);
  const srcName = (id) => id;
  // Tip #402: hour-row H3s are question-shaped and mirrored in FAQ (§3.3).
  const hourQ = (at) => `What moved at ${utcDay(at)} ${utcClock(at)} UTC?`;

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
    const hq = hourQ(e.at);
    return `<li id="${esc(anchor)}" class="${e.level_change ? 'lv' : big ? 'big' : ''}">
<h3 class="hd"><a href="${esc(ctx.href(readingPath(ctx, e.at)))}">${esc(hq)}</a><span>${esc(brand.NAME)} ${esc(e.level)} · ${esc(num(e.score, 1))} <span class="${cls(e.score_delta)}">${esc(dTxt(e.score_delta))}</span></span>${e.degraded ? '<span class="t">degraded</span>' : ''}${gap}</h3>
${lvl || pills || srcs ? `<div>${lvl}${pills}${srcs}</div>` : '<div class="xt-note">No pillar moved by 0.1 or more.</div>'}
${news}
</li>`;
  }).join('\n');

  // FAQ answers restate lede / note / alerts / hour-row copy only (FINDABILITY §3.3).
  // Refuse: doom-probability, newsroom-as-cause, stuffing.
  const faq = [
    [qTitle,
      `The last ${entries.length || 48} hours with a reading, newest first: how far the score and each pillar moved since the hour before, any level change, any source going dark or coming back, and the three highest-scored news items published in between. Red marks a level change, amber a move of ${DELTA_THRESHOLD}+ points.`],
    ['Do news items move the score?',
      'News items are context, not cause: the newsroom does not feed the score.'],
    ['How do I get these as alerts?',
      `Use the alerts page for RSS feeds, email recipes, and in-tab notifications when the level changes or the score moves by ${DELTA_THRESHOLD}+ points.`],
    [`Is an hourly move a doom probability?`,
      `No. ${brand.NAME} measures activity tempo hour by hour. ▲ is louder and ▼ is quieter — not danger, and not a probability of harm.`],
  ];
  for (const e of entries) {
    faq.push([hourQ(e.at),
      `${brand.NAME} ${e.level} · ${num(e.score, 1)} (${dTxt(e.score_delta)}) at that hour — pillars, sources, and top news below the heading when they moved.`]);
  }
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `<p class="eyebrow">Changelog</p>
<h1>${esc(qTitle)}</h1>
<p class="lede">The last ${entries.length} hours with a reading, newest first: how far the score and each pillar moved since the hour before, any level change, any source going dark or coming back, and the three highest-scored news items published in between. Red marks a level change, amber a move of ${DELTA_THRESHOLD}+ points. ▲ is louder, ▼ quieter.</p>
<p><a class="xt-btn ghost" href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a><a class="xt-btn ghost" href="${esc(ctx.href('/history.html'))}">What is the history of AI risk? →</a></p>
${entries.length ? `<ol class="xt-log">\n${li}\n</ol>` : '<p>Not enough readings yet: the changelog starts with the second hour on record.</p>'}
<p class="xt-note">News items are context, not cause: the newsroom does not feed the score. ${esc(brand.DISCLAIMER)}</p>
<section class="xt-faq" aria-labelledby="faq">
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="xt-faq-key">Search-shaped sibling:
    <a href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a>
    · <a href="${esc(ctx.href('/reference-plan.html'))}">How does the ${esc(brand.NAME)} baseline get updated?</a>.</p>
</section>`;

  const description = `${qTitle} Hour by hour: score and pillar changes, level changes, sources going dark, and the top news of each hour.`;
  return shell(ctx, {
    path: PATH,
    title: qTitle,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    main,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description: `Hour-by-hour ${brand.NAME} moves: score, pillars, level changes, sources dark/live, and top news context.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
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
  });
}

// ---------------------------------------------------------------------------
// /evidence.html — the rooms that back the number (from the unmerged
// cursor/site-retention-fold-8040 branch, "Index · Evidence · Method").
// The homepage phone fold links here; so does the room grid.
// ---------------------------------------------------------------------------
export function evidencePage(ctx) {
  const PATH = '/evidence.html';
  const qTitle = `What backs the ${brand.NAME} number?`;
  const r = ctx.routes || {};
  const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString('en-US') : null);
  const race = ctx.race && Array.isArray(ctx.race.players) ? ctx.race.players.slice().sort((a, b) => a.rank - b.rank)[0] : null;
  const lt = (ctx.leaders && ctx.leaders.totals) || {};
  const groups = [
    ['Which stories and people sit behind the score?', [
      ['/news.html', 'Newsroom', ctx.news && Array.isArray(ctx.news.items) ? `${ctx.news.items.length} stories` : null, 'Every AI story, scored and corroborated.'],
      ['/leaders.html', 'Leaders', Number.isFinite(lt.leaders) ? `${lt.on_record ?? 0} of ${lt.leaders} on record` : null, 'What the people running AI said this week.'],
      ctx.digest ? ['/digest.html', 'Daily brief', null, 'The day in a few corroborated items.'] : null,
      ['/changelog.html', 'What moved', null, 'Hour by hour: score, pillars and top stories.'],
    ]],
    ['Which markets and live feeds does it read?', [
      ['/race.html', 'The Race', race && race.market && Number.isFinite(race.market.probability) ? `${race.name} ${(race.market.probability * 100).toFixed(1)}%` : null, 'Labs ranked on live prediction-market odds.'],
      ['/monitor.html', 'World Monitor', null, 'Live globe: stories, hazards, country stress.'],
      ['/dispatch.html', 'Dispatch', null, 'Public feeds through the hour.'],
      ['/moltbook.html', 'Agent Watch', ctx.molt && Array.isArray(ctx.molt.fresh) ? `${ctx.molt.fresh.length} new this week` : null, 'What AI agents post on Moltbook.'],
    ]],
    ['Where is the compute?', [
      ['/watts.html', 'Power', ctx.infra && Number.isFinite(ctx.infra.score) ? `${ctx.infra.score.toFixed(1)} / 100` : null, 'Grid load, drought and build-out under the models.'],
      ['/map.html', 'US datacentres', ctx.datacenters && Array.isArray(ctx.datacenters.sites) ? `${fmt(ctx.datacenters.sites.length)} sites` : null, 'Where the compute sits, against the water it needs.'],
      r.world ? ['/world.html', 'World', ctx.world && ctx.world.totals ? `${fmt(ctx.world.totals.sites)} sites` : null, 'Every mapped datacentre on Earth.'] : null,
    ]],
    ['How do I check it myself?', [
      ['/verify.html', 'Verify a reading', null, 'Re-hash the public receipt in your browser.'],
      ['/methodology.html', 'Method', null, 'Every formula, so you can recompute the number.'],
      ['/history.html', 'History', Array.isArray(ctx.history) ? `${ctx.history.length} readings` : null, 'Every reading on record.'],
      ['/export.html', 'Data and embed', null, 'CSV, JSON, badge, widget, API.'],
      ['/alerts.html', 'Alerts', null, 'Level-change RSS, the daily brief by email, in-tab watch.'],
    ]],
  ].map(([g, items]) => [g, items.filter(Boolean)]);

  const cards = groups.map(([g, list]) => `<h2>${esc(g)}</h2>
<div class="xt-grid">${list.map(([p, t, n, d]) => `<a class="xt-card" href="${esc(ctx.href(p))}" style="display:block;color:inherit;text-decoration:none">
  <h3>${esc(t)}${n ? ` <span class="xt-pill live">${esc(n)}</span>` : ''}</h3>
  <p>${esc(d)}</p>
</a>`).join('')}</div>`).join('\n');

  const main = `<p class="eyebrow">Evidence</p>
<h1>${esc(qTitle)}</h1>
<p class="lede">The index is one score. These are the rooms a stranger can open to see why it sits where it does: the stories, the markets, the people, the compute, and the receipts you can recompute yourself. A count of activity, not a probability.</p>
<p class="xt-row">
  <a class="xt-btn" href="${esc(ctx.href('/'))}">← The reading</a>
  <a class="xt-btn ghost" href="${esc(ctx.href('/methodology.html'))}">How it is computed</a>
  <a class="xt-btn ghost" href="${esc(ctx.href('/feed-level.xml'))}">Level-change RSS</a>
</p>
${cards}
<p class="xt-note">${esc(brand.DISCLAIMER)}</p>`;

  return shell(ctx, {
    path: PATH,
    title: qTitle,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description: `Newsroom, race, leaders, compute maps and the verify page: the rooms that show why ${brand.NAME} reads where it does.`,
    main,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: qTitle, path: PATH },
      ]),
    ],
  });
}

// Re-exported for the homepage module, which may want the descriptions inline.
export { alternativeSignals };
