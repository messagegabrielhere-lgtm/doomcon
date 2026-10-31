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
var D={"base":"","rooms":[["/midterms.html","px:ballot","Who is pro-AI, against, or neutral in the 2026 midterms?","Cited stance tags for midterm candidates on AI.","LIVE INTEL"],["/nations.html","px:flagclash","USA vs China: who is winning the race to superintelligence?","Odds, labs and power, scored live.","LIVE INTEL"],["/race.html","radar","Who is winning the AI race?","Labs ranked on live prediction-market odds.","LIVE INTEL"],["/news.html","news","Which AI stories has SIREN scored in this window?","Every story, scored and corroborated.","LIVE INTEL"],["/charts.html","px:trendchart","What AI charts does SIREN publish?","The dial, the week, and the odds, drawn from the reading.","LIVE INTEL"],["/evidence.html","px:onair","What backs the SIREN number?","Stories, markets, leaders, compute and receipts, one page.","LIVE INTEL"],["/models.html","px:db","Which AI models has SIREN scored stories about?","Counts only, not a model doom score.","LIVE INTEL"],["/companies.html","px:companies","Which AI companies has SIREN scored stories about?","Story counts, not a company doom score.","LIVE INTEL"],["/people.html","mic","Which AI people has SIREN scored press about?","Headlines only, never invented quotations.","LIVE INTEL"],["/tags.html","px:tags","Which AI tags has SIREN scored stories about?","Topic hubs when a needle clears five scored stories.","LIVE INTEL"],["/outlets.html","px:outlets","Which AI outlets has SIREN scored stories from?","Publisher hosts with enough scored stories.","LIVE INTEL"],["/sources.html","px:rss","Which AI news sources has SIREN scored via?","Feed adapters with enough scored stories.","LIVE INTEL"],["/pillars.html","px:pillars","Which AI activity pillars has SIREN scored?","Tempo readings, not a pillar doom score.","LIVE INTEL"],["/leaders.html","px:leaderswire","Which AI leaders are on the record this week?","What the people running AI said.","LIVE INTEL"],["/digest.html","clipboard","What is the SIREN daily brief?","The day in a few corroborated items.","LIVE INTEL"],["/monitor.html","satellite","What does the SIREN World Monitor show?","Live feeds across the board.","LIVE INTEL"],["/dispatch.html","px:beacon","What public feeds does SIREN Dispatch show?","Public wires in one place.","LIVE INTEL"],["/waffle.html","px:waffle","Is the Waffle House open?","Hurricanes, Waffle Houses and the AI data centres in the path.","LIVE INTEL"],["/elon.html","musk","Where can you find real clips of AI leaders?","Attributed clips only.","LIVE INTEL"],["/live-x.html","px:antenna","Where are live X feeds and Spaces on AI?","Live posts and Spaces, filtered for AI.","LIVE INTEL"],["/si-watch.html","px:crosshair2","What AI autonomy signals is SIREN watching?","Open signals, not a takeover forecast.","LIVE INTEL"],["/search-trends.html","px:headline","Which Google Search Trends for AI does SIREN watch?","Google daily trending searches filtered for AI — watched for findability, not scored.","LIVE INTEL"],["/ai-prediction-markets.html","px:seismo","Where are live AI prediction market odds?","Live market odds on labs and models — market prices, not a SIREN forecast.","LIVE INTEL"],["/moltbook.html","px:agent2","What are AI agents saying on Moltbook?","Agent posts about AI, scored in public.","LIVE INTEL"],["/videos.html","px:tv","What free AI explainer videos does SIREN publish?","Short explainers, no doom forecast.","LIVE INTEL"],["/radio.html","px:radio","What free music does SIREN Radio play?","Stations while you watch the index.","LIVE INTEL"],["/live.html","px:livetv","What AI is on TV and radio right now?","Filtered live media, not an endorsement.","LIVE INTEL"],["/changelog.html","px:moved","What moved the SIREN score this hour?","The instruments that moved.","LIVE INTEL"],["/watts.html","power","What does the SIREN infrastructure index read?","Grid load, drought and build-out under the models.","THE MACHINES"],["/map.html","server","How many datacentres has SIREN mapped in the United States?","Where the compute sits, against the water it needs.","THE MACHINES"],["/world.html","globe","How many datacentres has SIREN mapped on Earth?","Every mapped datacentre, then orbit.","THE MACHINES"],["/countries.html","px:countries","Which AI datacentre countries has SIREN mapped?","OpenStreetMap site counts, not a national AI ranking.","THE MACHINES"],["/flock.html","camera","How many Flock ALPR cameras has SIREN mapped?","Licence-plate readers volunteers have mapped.","THE MACHINES"],["/exploits.html","bug","How many days from a CVE going public to CISA listing it as exploited?","Days from disclosure to exploited in the wild.","THE MACHINES"],["/jobs.html","case","Is AI taking jobs?","What has actually been measured — counts on the record, not forecasts.","PEOPLE"],["/medicine.html","pill","Is AI curing anything?","Trial results, approvals and what they show.","PEOPLE"],["/balance.html","scales","How does SIREN count AI harm and benefit side by side?","Harm and benefit, never summed.","PEOPLE"],["/bliss.html","sun","What is BLISS, the SIREN upside index?","The direction we would be glad to see move.","PEOPLE"],["/nothing.html","px:shrug","How often do dated AI claims miss?","Public scorekeeping for confident, dated claims.","PEOPLE"],["/breakthroughs.html","px:bulb","What AI breakthroughs has SIREN tracked?","AI curing, solving and restoring: the good news.","PEOPLE"],["/for-people.html","px:people","What tools help AI and SI serve people?","Deploy gate, oversight planner, agent charter.","PEOPLE"],["/ai-proof-job.html","px:rocket","How do I AI-proof my job?","A 2-minute plan to keep your job and grow with AI.","PEOPLE"],["/games.html","px:arcade","What free AI games can you play on SIREN?","Browser games about AI. No sign-up.","PLAY & PREP"],["/arena.html#battle","stocks","What does SIREN Arena show?","Models trade stocks and crypto against live prices.","PLAY & PREP"],["/arena.html","px:candles","What does SIREN Arena show?","Live model stock picks against the tape.","PLAY & PREP"],["/scanner.html","px:crosshair","What does the SIREN Capitulation Scanner show?","Capitulation signals on the tape.","PLAY & PREP"],["/bets.html","dice","Does the SIREN index make forecasts?","Tally’s unserious daily bets — not the SIREN score.","PLAY & PREP"],["/day-after.html","px:megaphone","What happens the day after an AI catastrophe?","A short strategy sim about the first day after the break.","PLAY & PREP"],["/contain.html","px:core","Can you stop an AI breakout?","Free browser game: stop the breakout before it escapes.","PLAY & PREP"],["/game.html","joystick","How do you play Tally Counts?","Count the real signals, ignore the predictions.","PLAY & PREP"],["/desk.html","px:notebook","What unserious counts does SIREN keep on Tally’s desk?","Desk tallies, not the index.","PLAY & PREP"],["/bunker-kit.html","bunker","What free tools belong in a bunker kit?","Free tools only.","PLAY & PREP"],["/si-ready.html","px:backpack","Ready for superintelligence?","A 3-minute personal plan — not a SI date or doom forecast.","PLAY & PREP"],["/prepper-checklist.html","px:doc","What belongs in a 72-hour prepper kit?","A checklist, not a forecast.","PLAY & PREP"],["/supply-depot.html","px:crate","What 1,003 supplies belong in an emergency prep kit?","Searchable checklist: water, power, food, radios, first aid.","PLAY & PREP"],["/prep-downloads.html","px:download","Where are free prep spreadsheets and printable checklists?","Calculators, trackers and PDFs. No sign-up.","PLAY & PREP"],["/survival-llm.html","px:chip","Is there a free AI that works with no internet?","Survival LLM: offline AI and survival library.","PLAY & PREP"],["/bug-out-land.html","px:cabin","Where to buy remote land to ride out Skynet?","Listings and caveats — not a forecast.","PLAY & PREP"],["/library.html","books","What AI books argue both sides of the case?","Both sides, sourced.","PLAY & PREP"],["/labs.html","px:flask","What is SIREN Labs measuring this week?","Open-data instruments on the bench.","THE RECORD"],["/bench.html","px:agentcode","Is AI building AI yet? (Labs bench)","Recursion, horizons, jumps, compute, silence.","THE RECORD"],["/search.html","px:search","How do you search everything on SIREN?","One search box over the catalog.","THE RECORD"],["/catalog.html","px:catalog","Where is everything on SIREN listed?","Every room, one directory.","THE RECORD"],["/ai-doomsday-clock.html","clock","Is there an AI doomsday clock?","The Bulletin’s clock vs AI-specific countdowns vs an hourly activity count.","THE RECORD"],["/p-doom.html","px:pdoom","What is p(doom)?","Named estimates on one chart — opinion as a percentage, not a SIREN reading.","THE RECORD"],["/guides.html","px:explainers","What are the AI explainers?","p(doom), clocks, doom indexes — vocabulary without a doom probability.","THE RECORD"],["/compare.html","px:updown","Which AI doom indexes can you compare?","SIREN vs DoomBench, Skynet, p(doom), PizzINT and Takeoff Tracker.","THE RECORD"],["/vs.html","px:versus","Which AI indexes does SIREN contrast?","One honest page per rival — activity tempo, not doom claims.","THE RECORD"],["/vs/doombench.html","px:vsrival","SIREN vs DoomBench: which should you use?","Activity count vs Live AI Doom Index.","THE RECORD"],["/vs/skynet-countdown.html","px:flame","SIREN vs Skynet Countdown: which should you use?","Activity count vs AGI timeline and control-loss odds.","THE RECORD"],["/vs/pizzint.html","px:film","SIREN vs PizzINT: which should you use?","Activity count vs DEFCON/Doomsday title hijack.","THE RECORD"],["/vs/takeofftracker.html","px:vstakeoff","SIREN vs Takeoff Tracker: which should you use?","Activity count vs AGI metrics dashboard.","THE RECORD"],["/alternatives.html","px:alts","What are AI doom index alternatives?","When this index is the right substitute — and when it is not.","THE RECORD"],["/guide.html","px:defcon","How does SIREN compare to DEFCON, the Doomsday Clock and p(doom)?","Activity tempo vs readiness, clocks and opinions.","THE RECORD"],["/history.html","archive","What is the history of AI risk?","Dated, sourced field notes — not a forecast.","THE RECORD"],["/methodology.html","magnifier","How the SIREN AI activity index is computed · methodology","Every formula, recompute yourself. Not a doom probability.","THE RECORD"],["/classic.html","siren","Where is the full SIREN instrument panel?","The classic board.","THE RECORD"],["/staff.html","px:team","Who is the automated crew that runs SIREN?","The desk roster.","THE RECORD"],["/tally.html","canary","Who is Tally, the SIREN duty canary?","The mascot, not a forecast.","THE RECORD"],["/careers.html","px:badge","What jobs is SIREN hiring AIs for?","Open roles for agents.","THE RECORD"],["/agents.html","px:agent","How should AI agents use SIREN?","Fetch-first map and skill.","THE RECORD"],["/feedback.html","px:chat","How do I report a problem or send an idea to SIREN?","Corrections and ideas.","THE RECORD"],["/free-tools.html","px:beaker","What free tools does SIREN publish?","Verify, alerts, export, OpenAPI — free, no account.","THE RECORD"],["/verify.html","px:logbook","How do you check a SIREN reading yourself?","Re-hash public receipts in your browser.","THE RECORD"],["/alerts.html","px:bell","How do I get alerts when SIREN moves?","RSS and level alerts.","THE RECORD"],["/export.html","px:code","How do I export and embed SIREN data?","JSON, embeds, badges.","THE RECORD"],["/bias.html","px:scalebias","What can SIREN not see?","Known blind spots, stated plainly.","THE RECORD"],["/reference-plan.html","px:ruler","How does the SIREN baseline get updated?","The frozen-reference plan.","THE RECORD"]],"primary":[["/","Index"],["/news.html","News"],["/race.html","Race"],["/midterms.html","Midterms"],["/leaders.html","Leaders"],["/labs.html","Labs"],["/monitor.html","Monitor"],["/games.html","Games"]],"news":[["/supply-depot.html","px:shelf","What 1,003 supplies belong in an emergency prep kit?","The Supply Depot: a searchable prep checklist, plus free spreadsheets and PDFs."],["/midterms.html","px:midterm","Who is pro-AI, against, or neutral in the 2026 midterms?","Cited AI stance tags for midterm candidates, with Post to X."],["/nations.html","px:tugofwar","USA vs China: who is winning the race to superintelligence?","The nations race to superintelligence, scored live."],["/power.html","px:pylon","Who makes the most electricity (China vs US)?","Who makes the most electricity: China vs the US, per person, fastest growing."],["/threats.html","px:threatshield","What could take the machines offline tonight?","Exploited software, botnets, solar storms and disasters, live."],["/status.html","px:statuspulse","Is ChatGPT down? Is Claude down?","Live status of ChatGPT, Claude, Copilot, Cursor and more, every minute."],["/self-aware.html","px:redeye","What if an AI wakes up at 2:14 a.m.?","The Skynet scenario, played out on a map of real US data centres."]]};
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
  // Tip #258: rooms-dialog home row matches the live home title (not bare “Index”).
  h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+'/')+'" data-k="'+homeK+'"'+(cur('/')?' aria-current="page"':'')+'><img src="'+e(img('siren'))+'" width="34" height="34" alt="" loading="lazy"><span><b>AI activity index today · AI activity level today · SIREN</b><small>The level, the score and the war room</small></span></a></li>';
  var byP={},uniq=[],seenP={};D.rooms.forEach(function(r){var k=r[0].split('#')[0];if(!byP[r[0]])byP[r[0]]=r;if(seenP[r[0]])return;seenP[r[0]]=1;uniq.push(r)});
  var rec=recent().filter(function(p){return byP[p]&&!cur(p)}).slice(0,5);
  if(rec.length){h+='<li class="sh-rooms__g sh-rooms__g--rec">RECENT</li>';rec.forEach(function(p){var r=byP[p];h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]).toLowerCase())+'"><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'})}
  if(D.news&&D.news.length){h+='<li class="sh-rooms__g sh-rooms__g--new">NEW ON SIREN</li>';D.news.forEach(function(r){h+='<li><a class="sh-rooms__i sh-rooms__i--p" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' new').toLowerCase())+'"><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'})}
  var g='',groups=[];
  uniq.forEach(function(r){if(r[4]!==g){g=r[4];groups.push(g);h+='<li class="sh-rooms__g" id="shg-'+groups.length+'">'+e(g)+'</li>'}h+='<li><a class="sh-rooms__i" href="'+e(D.base+r[0])+'" data-k="'+e((r[2]+' '+r[3]+' '+r[4]).toLowerCase())+'"'+(cur(r[0])?' aria-current="page"':'')+'><img src="'+e(img(r[1]))+'" width="34" height="34" alt="" loading="lazy"><span><b>'+e(r[2])+'</b><small>'+e(r[3])+'</small></span></a></li>'});
  // Group chips: jump straight to a section of the list.
  h=h.replace('<ul class="sh-rooms__l">','<nav class="sh-rooms__chips" aria-label="Jump to a group">'+groups.map(function(x,i){return '<button type="button" data-shg="'+(i+1)+'">'+e(x.charAt(0)+x.slice(1).toLowerCase())+'</button>'}).join('')+'</nav><ul class="sh-rooms__l">');
  // Tip #256: keyboard-help links match destination H1s (search + catalog).
  h+='</ul><p class="sh-rooms__k">↑ ↓ move · Enter open · Esc close · / anywhere · [ ] prev/next room · <a href="'+e(D.base)+'/search.html" style="color:#56B0E0">How do you search everything on SIREN?</a> · <a href="'+e(D.base)+'/catalog.html" style="color:#56B0E0">Where is everything on SIREN listed?</a></p></div>';  dlg.innerHTML=h;document.body.appendChild(dlg);
  q=dlg.querySelector('.sh-rooms__q');stat=items=[].slice.call(dlg.querySelectorAll('.sh-rooms__i'));
  q.addEventListener('input',filt);
  q.addEventListener('keydown',function(ev){var v=vis(),n=Math.max(1,v.length);if(ev.key==='ArrowDown'){ev.preventDefault();sel=(sel+1)%n;mark()}else if(ev.key==='ArrowUp'){ev.preventDefault();sel=(sel-1+n)%n;mark()}else if(ev.key==='Enter'&&v[sel]){ev.preventDefault();dlg.close();if(v[sel].target==='_blank')window.open(v[sel].href,'_blank','noopener');else location.href=v[sel].href}});
  dlg.querySelector('.sh-rooms__x').addEventListener('click',function(){dlg.close()});
  dlg.querySelector('.sh-rooms__chips').addEventListener('click',function(ev){var b=ev.target.closest('[data-shg]');if(!b)return;if(q.value){q.value='';filt()}var hd=dlg.querySelector('#shg-'+b.getAttribute('data-shg'));if(hd){var ul=dlg.querySelector('.sh-rooms__l');ul.scrollTop=hd.offsetTop-ul.offsetTop-4;var nx=hd.nextElementSibling&&hd.nextElementSibling.querySelector('.sh-rooms__i');sel=Math.max(0,vis().indexOf(nx));mark()}});
  // Close on backdrop, in-page hashes (#foo), and same-path hashes (/#readers
  // while already on /). Other-page links unload the document anyway.
  dlg.addEventListener('click',function(ev){
    if(ev.target===dlg){dlg.close();return}
    var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;
    var href=a.getAttribute('href')||'';
    if(href.charAt(0)==='#'){dlg.close();return}
    try{var u=new URL(a.href,location.href);var here=location.pathname.replace(/\/index\.html$/,'/');var path=u.pathname.replace(/\/index\.html$/,'/');if(path===here&&u.hash)dlg.close()}catch(x){}
  });
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
  // Tip #260: handoff row uses the search page H1, not bare “Search everything”.
  h+='<li class="sh-dyn"><a class="sh-rooms__i sh-rooms__i--x" href="'+e(D.base+'/search.html?q='+encodeURIComponent(raw))+'"><span><b>How do you search everything on SIREN? “'+e(raw)+'” →</b><small>Rooms, stories, leaders, videos, data and feeds</small></span></a></li>';
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
