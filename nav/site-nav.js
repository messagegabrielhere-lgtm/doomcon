/* SIREN shared navigation: built by site/siteheader.mjs. */
window.sirenSearch=window.sirenSearch||(function sirenSearchCore() {
  var STOP = { the: 1, a: 1, an: 1, of: 1, and: 1, or: 1, to: 1, in: 1, on: 1, for: 1, is: 1, it: 1, at: 1, by: 1, with: 1 };
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function toks(q) {
    var t = norm(q).split(' ').filter(Boolean);
    var keep = t.filter(function (w) { return !STOP[w]; });
    return keep.length ? keep : t;
  }
  // Edit distance of at most one (insert, delete, substitute or swap two
  // neighbours): enough to forgive "datacenter"/"datacentre"-style slips.
  function near(a, b) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0;
    while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++;
    if (i === la && i === lb) return true;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  // 4 whole word, 3 word prefix, 1.5 inside a word, 1 one slip away, 0 none.
  function tokScore(tok, words, flat) {
    var best = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === tok) return 4;
      if (w.indexOf(tok) === 0) best = Math.max(best, 3);
      else if (best < 1 && tok.length >= 4 && near(tok, w)) best = 1;
    }
    if (best < 1.5 && tok.length >= 3 && flat.indexOf(tok) >= 0) best = 1.5;
    return best;
  }
  function prep(index) {
    var labels = (index && index.types) || {};
    return ((index && index.items) || []).map(function (it, n) {
      var t = norm(it[1]), k = norm((it[4] || '') + ' ' + (labels[it[0]] || it[0])), d = norm(it[3]);
      return { it: it, n: n, t: t, tw: t.split(' '), k: k, kw: k.split(' '), d: d, dw: d.split(' ') };
    });
  }
  // rows: prep(index). Returns [{ it, score }] best first; every token must hit.
  function search(rows, q, opt) {
    var tk = toks(q), out = [];
    if (!tk.length) return out;
    var only = opt && opt.type, phrase = norm(q);
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (only && row.it[0] !== only) continue;
      var total = 0, ok = true;
      for (var j = 0; j < tk.length; j++) {
        var s = Math.max(tokScore(tk[j], row.tw, row.t) * 3, tokScore(tk[j], row.kw, row.k) * 2, tokScore(tk[j], row.dw, row.d));
        if (!s) { ok = false; break; }
        total += s;
      }
      if (!ok) continue;
      if (phrase && row.t.indexOf(phrase) === 0) total += 8;
      else if (phrase.length > 3 && row.t.indexOf(phrase) >= 0) total += 4;
      out.push({ it: row.it, score: total - row.n * 1e-6 });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Escaped text with each query word marked where a word starts with it.
  function hl(text, q) {
    text = String(text == null ? '' : text);
    var tk = toks(q).filter(function (t) { return t.length > 1; }).sort(function (a, b) { return b.length - a.length; });
    if (!tk.length) return esc(text);
    var re = new RegExp('(' + tk.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(text))) {
      var prev = m.index ? text.charAt(m.index - 1) : ' ';
      if (/[a-z0-9]/i.test(prev)) { if (re.lastIndex === m.index) re.lastIndex++; continue; }
      out += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  return { norm: norm, toks: toks, near: near, prep: prep, search: search, hl: hl, esc: esc };
})();
(function(){
var D={"base":"","rooms":[["/race.html","radar","The Race","Labs ranked on live prediction-market odds.","LIVE INTEL"],["/news.html","news","Newsroom","Every AI story, scored and corroborated.","LIVE INTEL"],["/model/","px:db","Models","Stories grouped by the model family the headline names.","LIVE INTEL"],["/leaders.html","mic","Leaders","What the people running AI said this week.","LIVE INTEL"],["/digest.html","clipboard","Digest","The day in a few corroborated items.","LIVE INTEL"],["/monitor.html","satellite","World Monitor","Live globe: stories from 27 outlets, hazards, a country stress index, 72-hour replay.","LIVE INTEL"],["/dispatch.html","px:beacon","Dispatch","911 CAD, multi-system alerts, blather — emergency mark + X.","LIVE INTEL"],["/waffle.html","px:waffle","Waffle House Index","Hurricanes, Waffle Houses and the AI data centres in the path.","LIVE INTEL"],["/elon.html","musk","Real Clips","Verified clips of Elon, Altman, Amodei and the AI bosses.","LIVE INTEL"],["/live-x.html","px:antenna","Live on X","Live X feeds and Spaces on AI, newest first.","LIVE INTEL"],["/si-watch.html","px:crosshair2","Takeover Watch","What AI agents are coding, live, plus frontier models and the AGI forecast.","LIVE INTEL"],["/moltbook.html","px:agent2","Agent Watch","What AI agents are saying on Moltbook, live.","LIVE INTEL"],["/videos.html","px:tv","SIREN TV","Short explainers: Tally, Skynet status, SI prep, your job.","LIVE INTEL"],["/radio.html","px:radio","SIREN Radio","Six stations of music generated live in your browser.","LIVE INTEL"],["/live.html","px:livetv","AI on TV & Radio","AI live streams, news segments and AI talk radio, auto-updated.","LIVE INTEL"],["/changelog.html","px:updown","What Moved","Every hour’s changes: score, pillars and top stories.","LIVE INTEL"],["/watts.html","power","Power","Grid load, drought and build-out under the models.","THE MACHINES"],["/map.html","server","Map","Where the compute sits, against the water it needs.","THE MACHINES"],["/world.html","globe","World","Every mapped datacentre on Earth, then orbit.","THE MACHINES"],["/country/","globe","By country","Mapped datacentres, one page per country with at least three sites.","THE MACHINES"],["/flock.html","camera","Cameras","Licence-plate readers volunteers have mapped.","THE MACHINES"],["/exploits.html","bug","Exploits","Days from disclosure to exploited in the wild.","THE MACHINES"],["/jobs.html","case","Jobs","Is AI taking jobs? What has been counted.","PEOPLE"],["/medicine.html","pill","Medicine","Is AI curing anything? Trials and approvals.","PEOPLE"],["/balance.html","scales","Balance","Harm and benefit, counted side by side.","PEOPLE"],["/bliss.html","sun","Upside","The direction we would be glad to see move.","PEOPLE"],["/nothing.html","px:shrug","Nothing Ever Happens","Dated AI claims that missed — the skeptic’s counter.","PEOPLE"],["/breakthroughs.html","px:bulb","Breakthroughs","AI curing, solving and restoring: the good news, tracked.","PEOPLE"],["/ai-proof-job.html","px:rocket","AI-Proof Your Job","A 2-minute plan to keep your job and grow with AI.","PEOPLE"],["/arena.html#battle","stocks","AI Battle","AI models trade stocks and crypto against live prices.","PLAY & PREP"],["/arena.html","px:candles","Stock Picks","Daily rule-based stock picks, scored in public.","PLAY & PREP"],["/scanner.html","px:crosshair","Scanner","Screen stocks, ETFs and crypto in plain English.","PLAY & PREP"],["/bets.html","dice","Tally’s Bets","Daily forecasts about the index, scored in public.","PLAY & PREP"],["/day-after.html","px:megaphone","The Day After","Game out the public revolt after an AI catastrophe.","PLAY & PREP"],["/contain.html","px:core","Containment","Arcade: stop rogue AI processes breaching the firewall.","PLAY & PREP"],["/game.html","joystick","Game","Thirty seconds: count signals, ignore predictions.","PLAY & PREP"],["/desk.html","px:notebook","Tally’s Desk","The unserious counts: robots and godfathers.","PLAY & PREP"],["/bunker-kit.html","bunker","Bunker Kit","50 free tools and six crates of emergency gear.","PLAY & PREP"],["/si-ready.html","px:backpack","Ready for SI?","Prepare for superintelligence: a 3-minute personal plan.","PLAY & PREP"],["/prepper-checklist.html","px:doc","Prepper Checklist","A 72-hour kit and two weeks at home, sized for you.","PLAY & PREP"],["/bug-out-land.html","px:cabin","Bug-Out Land","Where to buy remote land to ride out Skynet.","PLAY & PREP"],["/library.html","books","Reading List","Books from every side of the AI argument.","PLAY & PREP"],["/search.html","px:search","Search","Search every room, story, video, leader and dataset.","THE RECORD"],["/catalog.html","px:catalog","Catalog","Everything on the site, in one browsable directory.","THE RECORD"],["/ai-doomsday-clock.html","clock","The Clock","The reading as a clock face you can verify.","THE RECORD"],["/history.html","archive","History","Sixty years of the argument, and every reading.","THE RECORD"],["/methodology.html","magnifier","Methodology","Every formula. Recompute the number yourself.","THE RECORD"],["/classic.html","siren","Full Panel","The full instrument panel, receipts and API.","THE RECORD"],["/staff.html","px:team","The Staff","The automated crew that runs SIREN, at work together.","THE RECORD"],["/tally.html","canary","Tally","Meet the duty canary. Five moods, one for each level.","THE RECORD"],["/careers.html","px:badge","Careers","Now hiring: AIs welcome to apply.","THE RECORD"],["/agents.html","px:agent","For AI Agents","Open data, skill.md and Moltbook: AIs welcome.","THE RECORD"],["/feedback.html","px:chat","Feedback","Report a problem or send an idea. We read every one.","THE RECORD"],["/alerts.html","px:bell","Alerts","Level changes, big moves, pillar spikes: RSS, email, X.","THE RECORD"],["/export.html","px:code","Data & Embed","CSV, JSON and a live widget for your site.","THE RECORD"],["/bias.html","px:scalebias","Known Biases","Where SIREN’s sources skew, said plainly.","THE RECORD"],["/reference-plan.html","px:ruler","Baseline Plan","How the frozen reference gets updated, versioned.","THE RECORD"]],"primary":[["/","Index"],["/race.html","Race"],["/news.html","News"],["/leaders.html","Leaders"],["/monitor.html","Monitor"],["/dispatch.html","Dispatch"],["/moltbook.html","Agent Watch"],["/videos.html","Videos"],["/radio.html","Radio"]],"news":[["/charts.html","px:trendchart","This week in charts","Live AI odds, the SIREN trend and the power race, each with an X post."],["/power.html","px:pylon","The power race","Who makes the most electricity: China vs the US, per person, fastest growing."],["/threats.html","px:threatshield","Threat board","Exploited software, botnets, solar storms and disasters, live."],["/self-aware.html","px:redeye","The night it wakes up","The Skynet scenario, played out on a map of real US data centres."],["/status.html","px:statuspulse","Is ChatGPT down?","Live status of ChatGPT, Claude, Copilot, Cursor and more, every minute."],["/p-doom.html#voices","px:pclock","The p(doom) voices","28 named estimates, Hinton to Yudkowsky, and a dial to set yours."],["/waffle.html","px:hurricane","Waffle House Index","Is the Waffle House open? Storms, waffles and AI data centres."],["/live.html","px:onair","AI on TV & radio","Live AI streams, news-channel segments and AI talk radio."],["/si-watch.html#coding","px:agentcode","What AI agents are coding","Live: agent pull requests by kind of work, language and repo."],["/day-after.html","px:flame","The Day After","Game out the public revolt after an AI catastrophe."],["/dispatch.html","px:seismo","Live alerts","Big quakes and extreme weather within about a minute."],["/leaders.html","px:headline","Leaders in the news","Every AI boss’s coverage, refreshed every 15 minutes."]]};
if(window.__shNav)return;window.__shNav=1;
function img(n){return n.indexOf('px:')===0?D.base+'/img/px-'+n.slice(3)+'.svg':D.base+'/img/art-'+n+'.webp'}
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var here=location.pathname.replace(/index\.html$/,'');
function cur(h){var p=(D.base+h).split('#')[0].replace(/index\.html$/,'');return p===here}
var dlg=null,q,items=[],stat=[],sel=0;
function build(){
  dlg=document.createElement('dialog');dlg.className='sh-rooms';dlg.id='sh-rooms';dlg.setAttribute('aria-label','Every room');
  var h='<div class="sh-rooms__box"><div class="sh-rooms__top"><input class="sh-rooms__q" type="search" placeholder="Find a room, or search everything…" aria-label="Find a room or search the site" autocomplete="off" spellcheck="false"><button type="button" class="sh-rooms__x" aria-label="Close">✕</button></div><ul class="sh-rooms__l">';
  var secs=[].slice.call(document.querySelectorAll('[data-sec][id]'));
  if(secs.length){h+='<li class="sh-rooms__g">ON THIS PAGE</li>';secs.forEach(function(s){var l=s.getAttribute('data-sec');h+='<li><a class="sh-rooms__i" href="#'+e(s.id)+'" data-k="'+e((l+' on this page section').toLowerCase())+'"><span><b>'+e(l)+'</b><small>On this page</small></span></a></li>'})}
  // Home first, then the rooms you used last, then every group once.
  var homeK='index home war room level score dashboard';
  h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+'/')+'" data-k="'+homeK+'"'+(cur('/')?' aria-current="page"':'')+'><img src="'+e(img('siren'))+'" width="34" height="34" alt="" loading="lazy"><span><b>Index</b><small>The level, the score and the war room</small></span></a></li>';
  var byP={},uniq=[],seenP={};D.rooms.forEach(function(r){var k=r[0].split('#')[0];if(!byP[r[0]])byP[r[0]]=r;if(seenP[r[0]])return;seenP[r[0]]=1;uniq.push(r)});
  var rec=recent().filter(function(p){return byP[p]&&!cur(p)}).slice(0,5);
  if(rec.length){h+='<li class="sh-rooms__g sh-rooms__g--rec">RECENT</li>';rec.forEach(function(p){var r=byP[p];h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]).toLowerCase())+'"><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'})}
  if(D.news&&D.news.length){h+='<li class="sh-rooms__g sh-rooms__g--new">NEW ON SIREN</li>';D.news.forEach(function(r){h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' new').toLowerCase())+'"><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'})}
  var g='',groups=[];
  uniq.forEach(function(r){if(r[4]!==g){g=r[4];groups.push(g);h+='<li class="sh-rooms__g" id="shg-'+groups.length+'">'+e(g)+'</li>'}h+='<li><a class="sh-rooms__i" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' '+r[4]).toLowerCase())+'"'+(cur(r[0])?' aria-current="page"':'')+'><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'});
  // Group chips: jump straight to a section of the list.
  h=h.replace('<ul class="sh-rooms__l">','<nav class="sh-rooms__chips" aria-label="Jump to a group">'+groups.map(function(x,i){return '<button type="button" data-shg="'+(i+1)+'">'+e(x.charAt(0)+x.slice(1).toLowerCase())+'</button>'}).join('')+'</nav><ul class="sh-rooms__l">');
  h+='</ul><p class="sh-rooms__k">↑ ↓ move · Enter open · Esc close · / anywhere · [ ] prev/next room · <a href="'+e(D.base)+'/search.html" style="color:#A5B4FC">full search</a> · <a href="'+e(D.base)+'/catalog.html" style="color:#A5B4FC">catalog</a></p></div>';
  dlg.innerHTML=h;document.body.appendChild(dlg);
  q=dlg.querySelector('.sh-rooms__q');stat=items=[].slice.call(dlg.querySelectorAll('.sh-rooms__i'));
  q.addEventListener('input',filt);
  q.addEventListener('keydown',function(ev){var v=vis(),n=Math.max(1,v.length);if(ev.key==='ArrowDown'){ev.preventDefault();sel=(sel+1)%n;mark()}else if(ev.key==='ArrowUp'){ev.preventDefault();sel=(sel-1+n)%n;mark()}else if(ev.key==='Enter'&&v[sel]){ev.preventDefault();dlg.close();if(v[sel].target==='_blank')window.open(v[sel].href,'_blank','noopener');else location.href=v[sel].href}});
  dlg.querySelector('.sh-rooms__x').addEventListener('click',function(){dlg.close()});
  dlg.querySelector('.sh-rooms__chips').addEventListener('click',function(ev){var b=ev.target.closest('[data-shg]');if(!b)return;if(q.value){q.value='';filt()}var hd=dlg.querySelector('#shg-'+b.getAttribute('data-shg'));if(hd){var ul=dlg.querySelector('.sh-rooms__l');ul.scrollTop=hd.offsetTop-ul.offsetTop-4;var nx=hd.nextElementSibling&&hd.nextElementSibling.querySelector('.sh-rooms__i');sel=Math.max(0,vis().indexOf(nx));mark()}});
  dlg.addEventListener('click',function(ev){if(ev.target===dlg||(ev.target.closest&&ev.target.closest('a[href^="#"]')))dlg.close()});
}
function vis(){return items.filter(function(a){return a.parentNode.style.display!=='none'})}
// SEARCH EVERYTHING. Past the rooms, the same index /search.html uses
// (api/search-index.json, loaded on the first keystroke) adds stories,
// leaders, videos and data, and the last row always hands the query over.
var SX=null,SXrows=null,SXwait=false,roomSet={};D.rooms.forEach(function(r){roomSet[r[0]]=1});D.primary.forEach(function(p){roomSet[p[0]]=1});
function sxLoad(){if(SX||SXwait)return;SXwait=true;fetch(D.base+'/api/search-index.json').then(function(r){return r.json()}).then(function(d){SX=d;SXrows=window.sirenSearch.prep(d);if(dlg&&dlg.open&&q.value.trim())filt()}).catch(function(){})}
function sxImg(it){var n=it[5]||((SX&&SX.icons&&SX.icons[it[0]])||'px:doc');return img(n)}
function dyn(k){
  [].slice.call(dlg.querySelectorAll('.sh-dyn')).forEach(function(n){n.parentNode.removeChild(n)});
  var raw=q.value.trim(),ul=dlg.querySelector('.sh-rooms__l'),add=[];if(!raw)return add;
  if(raw.length>=2)sxLoad();
  var h='';
  if(SXrows&&raw.length>=2){var hits=window.sirenSearch.search(SXrows,raw).filter(function(x){return !roomSet[x.it[2]]}).slice(0,6);
    if(hits.length){h+='<li class="sh-rooms__g sh-dyn">ACROSS THE SITE</li>';hits.forEach(function(x){var it=x.it,ext=/^https?:/.test(it[2]);h+='<li class="sh-dyn"><a class="sh-rooms__i" href="'+e(ext?it[2]:D.base+it[2])+'"'+(ext?' target="_blank" rel="noopener"':'')+'><img src="'+e(sxImg(it))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+window.sirenSearch.hl(it[1],raw)+'</b><small>'+e(((SX.types&&SX.types[it[0]])||it[0])+(it[3]?' · '+it[3]:''))+'</small></span></a></li>'})}}
  h+='<li class="sh-dyn"><a class="sh-rooms__i sh-rooms__i--x" href="'+e(D.base+'/search.html?q='+encodeURIComponent(raw))+'"><span><b>Search everything for “'+e(raw)+'” →</b><small>Rooms, stories, leaders, videos, data and feeds</small></span></a></li>';
  ul.insertAdjacentHTML('beforeend',h);
  return [].slice.call(ul.querySelectorAll('.sh-dyn .sh-rooms__i'));
}
function mark(){var v=vis();items.forEach(function(a){a.classList.remove('on')});if(v.length){sel=Math.max(0,Math.min(sel,v.length-1));v[sel].classList.add('on');v[sel].scrollIntoView({block:'nearest'})}}
function filt(){var k=q.value.trim().toLowerCase();var heads=[].slice.call(dlg.querySelectorAll('.sh-rooms__g'));stat.forEach(function(a){a.parentNode.style.display=!k||(a.getAttribute('data-k').indexOf(k)>=0&&!(a.classList.contains('sh-rooms__i--p')&&a.getAttribute('href')!==D.base+'/'))?'':'none'});heads.forEach(function(hd){hd.style.display=k?'none':''});items=stat.concat(dyn(k));sel=0;mark()}
function open(prefill,group){if(!dlg)build();if(!dlg.showModal){location.href=D.base+'/#rooms';return}q.value=prefill||'';filt();if(!dlg.open)dlg.showModal();q.focus();if(prefill)q.select();
  if(group){[].forEach.call(dlg.querySelectorAll('.sh-rooms__g'),function(hd){if(hd.textContent===group){var ul=dlg.querySelector('.sh-rooms__l');ul.scrollTop=hd.offsetTop-ul.offsetTop-4}})}}
// RECENT rooms, kept in this browser only.
var RK='siren:recent';
function recent(){try{return JSON.parse(localStorage.getItem(RK)||'[]')}catch(x){return[]}}
(function remember(){var p=null;D.rooms.forEach(function(r){if(!p&&cur(r[0])&&r[0].indexOf('#')<0)p=r[0]});if(!p)return;try{var l=recent().filter(function(x){return x!==p});l.unshift(p);localStorage.setItem(RK,JSON.stringify(l.slice(0,8)))}catch(x){}})();
// [ and ] step to the previous / next room in this page's group.
window.addEventListener('keydown',function(ev){var t=ev.target,tag=t&&t.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)||ev.metaKey||ev.ctrlKey||ev.altKey||(dlg&&dlg.open))return;if(ev.key!=='['&&ev.key!==']')return;var a=document.querySelector(ev.key==='['?'[data-sh-prev]':'[data-sh-next]');if(a){ev.preventDefault();location.href=a.href}});
window.sirenRooms=open;
// Every "all rooms" control on the site opens this one list: ours, the inner
// pages' "All pages" tab and the homepage's Jump/ALL buttons.
document.addEventListener('click',function(ev){var t=ev.target&&ev.target.closest?ev.target.closest('[data-sh-rooms],[data-pal],[data-v2-jump],[data-sh-rooms-group],[data-sh-top]'):null;if(!t)return;
  if(t.hasAttribute('data-sh-top')){ev.preventDefault();toTop();return}
  ev.preventDefault();ev.stopImmediatePropagation();open('',t.getAttribute('data-sh-rooms-group')||'')},true);
window.addEventListener('keydown',function(ev){var t=ev.target,tag=t&&t.tagName;var typing=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable);
  var own=document.querySelector('[data-site-search]');if(ev.key==='/'&&!typing&&!ev.metaKey&&!ev.ctrlKey&&!ev.altKey&&own&&!(dlg&&dlg.open)){ev.preventDefault();ev.stopImmediatePropagation();own.focus();own.select();return}
  if((ev.key==='/'&&!typing&&!ev.metaKey&&!ev.ctrlKey&&!ev.altKey)||((ev.metaKey||ev.ctrlKey)&&String(ev.key).toLowerCase()==='k')){if(dlg&&dlg.open&&ev.key!=='/'){dlg.close()}else{open()}ev.preventDefault();ev.stopImmediatePropagation()}},true);
// BACK TO TOP: one button, bottom-left, after a screen and a half, clear of
// the freshness bar on phones and the intro chip.
function toTop(){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;window.scrollTo({top:0,behavior:rm?'auto':'smooth'});var b=document.querySelector('.sh__brand');if(b)try{b.focus({preventScroll:true})}catch(x){}}
var top=document.createElement('button');top.type='button';top.className='sh-top';top.setAttribute('aria-label','Back to top');top.textContent='↑';top.addEventListener('click',toTop);
function place(){var off=12;['sitebar','siren-intro'].forEach(function(id){var el=document.getElementById(id);if(!el)return;var r=el.getBoundingClientRect();if(r.width&&r.left<80&&r.bottom>innerHeight-140)off=Math.max(off,innerHeight-r.top+8)});[].forEach.call(document.querySelectorAll('nav.tab,nav.v2-tab'),function(el){var r=el.getBoundingClientRect();if(r.height&&getComputedStyle(el).display!=='none'&&r.bottom>=innerHeight-4)off=Math.max(off,innerHeight-r.top+8)});top.style.bottom=off+'px'}
// Phones: floating chrome slides away while reading down, back on scroll up.
var lastY=scrollY,root=document.documentElement;
function dir(){var y=scrollY,dy=y-lastY;if(Math.abs(dy)<8)return;var dn=dy>0&&y>240&&(innerHeight+y)<document.documentElement.scrollHeight-80;root.classList.toggle('sh-dn',dn);lastY=y}
function onScroll(){dir();var on=scrollY>innerHeight*1.5;if(on!==top.classList.contains('on')){top.classList.toggle('on',on);if(on)place()}}
function init(){document.body.appendChild(top);addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',place);onScroll()}
if(document.body)init();else document.addEventListener('DOMContentLoaded',init);
})();
