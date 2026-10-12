// /for-people.html — TOOLS THAT HELP AI AND SI BE GOOD FOR PEOPLE.
// Interactive checklists and builders that stay in the browser. Nothing here
// feeds the index, and nothing is a forecast: each tool is a way to put people
// first when using or shipping AI today.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.fp{max-width:980px}
.fp .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px}
.fp h1{margin:0 0 10px}
.fp .lede{color:var(--ink-dim);max-width:68ch}
.fp h2{font:700 1.3rem/1.2 var(--sans);margin:34px 0 10px;color:var(--ink)}
.fp h3{font:700 1.05rem/1.3 var(--sans);margin:0 0 6px;color:var(--ink)}
.fp p,.fp li{color:var(--ink-dim);line-height:1.6}
.fp b{color:var(--ink)}
.fp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin:14px 0}
.fp-card{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:4px;padding:14px 16px}
.fp-card p{margin:0;font-size:14px}
.fp-toc a{display:block;padding:10px 12px;border:1px solid var(--rule);border-radius:4px;background:var(--bg-raised,#0E131D);color:var(--ink);text-decoration:none;font:600 14px/1.35 var(--sans)}
.fp-toc a:hover{border-color:var(--accent,#4ADE80)}
.fp-toc small{display:block;margin-top:4px;font:500 12.5px/1.4 var(--sans);color:var(--ink-dim);font-weight:400}
.fp-check{list-style:none;padding:0;margin:10px 0}
.fp-check li{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--rule);font-size:14.5px;line-height:1.45;color:var(--ink-dim)}
.fp-check input{width:20px;height:20px;flex:none;margin-top:1px;accent-color:var(--accent,#4ADE80)}
.fp-check label{cursor:pointer;flex:1}
.fp-btn{display:inline-block;padding:11px 16px;border:0;border-radius:4px;background:var(--accent,#4ADE80);color:#000;font:700 13px/1 var(--mono);letter-spacing:.08em;cursor:pointer;text-decoration:none;margin:4px 8px 4px 0}
.fp-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--rule)}
.fp-out{margin:16px 0;padding:16px;border:1px solid var(--accent,#4ADE80);border-radius:4px;background:#03130A}
.fp-out[hidden]{display:none}
.fp-out h3{margin:0 0 8px}
.fp-meter{height:12px;background:#000;border:1px solid var(--rule);border-radius:2px;overflow:hidden;margin:8px 0 12px}
.fp-meter i{display:block;height:100%;background:var(--accent,#4ADE80);width:0}
.fp-pill{display:inline-block;font:600 11px/1 var(--mono);letter-spacing:.06em;padding:4px 7px;border:1px solid var(--rule);border-radius:3px;margin-right:6px;color:var(--ink-dim)}
.fp-pill.go{border-color:#4ADE80;color:#4ADE80}
.fp-pill.slow{border-color:#FACC15;color:#FACC15}
.fp-pill.stop{border-color:#F87171;color:#F87171}
.fp fieldset{border:1px solid var(--rule);border-radius:4px;padding:12px 14px;margin:8px 0;background:var(--bg-raised,#0E131D)}
.fp legend{font:600 15px/1.4 var(--sans);color:var(--ink);padding:0 4px}
.fp label.row{display:block;margin:8px 0 4px;font:600 12.5px/1.3 var(--mono);letter-spacing:.06em;color:var(--ink-dim)}
.fp input[type=text],.fp textarea,.fp select{width:100%;box-sizing:border-box;background:#000;border:1px solid var(--rule);color:var(--ink);padding:10px 12px;font:500 14px/1.45 var(--sans);border-radius:4px}
.fp textarea{min-height:88px;resize:vertical}
.fp pre{background:#000;border:1px solid var(--rule);border-radius:4px;padding:12px 14px;overflow-x:auto;font:500 13px/1.5 var(--mono);color:#E6EAF0;white-space:pre-wrap;margin:10px 0}
.fp-note{font-size:13px;color:var(--ink-faint,#6B7686);margin-top:24px}
.fp-x{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--rule);border-radius:4px;color:var(--ink);text-decoration:none;font:600 13px/1 var(--mono);margin:4px 6px 4px 0}
.fp-x:hover{border-color:var(--accent,#4ADE80)}
.fp-dom{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.fp-dom button{appearance:none;border:1px solid var(--rule);background:var(--bg-raised,#0E131D);color:var(--ink);padding:9px 12px;border-radius:4px;font:600 13px/1 var(--mono);cursor:pointer}
.fp-dom button[aria-pressed="true"]{border-color:var(--accent,#4ADE80);color:var(--accent,#4ADE80)}
@media (max-width:560px){.fp-check li{min-height:44px}.fp-check input{width:22px;height:22px}}
@media print{.fp-btn,.fp-dom{display:none}.fp-out{border-color:#000}}
</style>`;

const xShare = (ctx, text, path) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ctx.url(path))}&via=SIRENutf6`;

const GATE_ITEMS = [
  ['named', 'A named person owns the outcome this system touches.'],
  ['harmed', 'You can name who is harmed if the system is wrong, and how they find out.'],
  ['override', 'A human can stop or override it without asking the model for permission.'],
  ['check', 'Outputs that matter are checked against a source a stranger can open.'],
  ['data', 'You know what personal data goes in, where it is stored, and who else sees it.'],
  ['disclose', 'People who use it know they are dealing with AI, in plain language.'],
  ['fail', 'There is a written fallback when the model is down, confident, or wrong.'],
  ['log', 'Decisions that affect people leave a log someone can audit later.'],
];

const CHARTER_BITS = [
  ['people', 'Put people first', 'Prefer outcomes that leave the people involved better off, clearer, safer, or more able to choose. Refuse uses that trick, coerce, or quietly take power from them.'],
  ['honest', 'Stay honest about uncertainty', 'Say when you do not know. Separate measured facts from guesses. Never dress a tempo reading or a headline as a doom probability or a forecast.'],
  ['verify', 'Verify before acting', 'For numbers, citations, code and consequential advice, check a primary source or run the code. If you cannot verify, say so and stop.'],
  ['consent', 'Respect consent and privacy', 'Do not ask for passwords, ID documents, bank logins or secrets. Do not scrape private data. Prefer the least personal information that still does the job.'],
  ['oversight', 'Keep a human in the loop', 'On decisions that change money, health, legal status, jobs or safety, draft options for a person to approve. Do not take irreversible action alone.'],
  ['cite', 'Cite what you used', 'When you report SIREN or any other measured source, give the level or figure with its time and a link to the page or receipt.'],
];

const DOMAINS = [
  {
    id: 'medicine',
    name: 'Medicine & care',
    blurb: 'Trials, devices and diagnoses with a paper trail — not vendor decks.',
    moves: [
      'Read one primary result (trial page, FDA listing, peer-reviewed paper) before sharing a cure claim.',
      'Ask who the patient is in the loop when a model suggests a diagnosis or dose.',
      'Track measured progress on the Medicine room; a headline is not an outcome.',
    ],
    href: '/medicine.html',
  },
  {
    id: 'work',
    name: 'Work & livelihoods',
    blurb: 'Grow people with the tools; do not silently replace judgment with a model.',
    moves: [
      'Automate the boring screen work first; leave trust and judgment with people.',
      'Publish what the tool is for and what a person still signs off.',
      'Use the AI-proof-your-job plan if the change is landing on your own desk.',
    ],
    href: '/ai-proof-job.html',
  },
  {
    id: 'info',
    name: 'Truth & media',
    blurb: 'Make it cheaper to check a claim than to amplify a fake.',
    moves: [
      'Prefer sources that publish corrections and methods over certainty-only feeds.',
      'For video and voice, check the upload channel before you trust the clip.',
      'When an assistant summarises news, ask it for the underlying link every time.',
    ],
    href: '/elon.html',
  },
  {
    id: 'access',
    name: 'Access & ability',
    blurb: 'Use AI to open doors: language, sight, hearing, mobility, paperwork.',
    moves: [
      'Ship captions, plain language and keyboard paths before novel chat toys.',
      'Test with the people who need the access, not only the builders.',
      'Watch Breakthroughs for measured restores; open the story before you celebrate.',
    ],
    href: '/breakthroughs.html',
  },
  {
    id: 'civic',
    name: 'Rules & voice',
    blurb: 'People who live with the systems get a say in the rules around them.',
    moves: [
      'Read one primary AI rule or proposal where you live, not only a summary.',
      'Tell representatives what you want from oversight, disclosure and recourse.',
      'Support independent evaluation work with time or money if you can.',
    ],
    href: '/si-ready.html',
  },
  {
    id: 'agents',
    name: 'Agents & autonomy',
    blurb: 'Software that acts needs a charter, a stop switch and a paper trail.',
    moves: [
      'Give every agent a short people-first charter before it gets tools.',
      'Cap what it can spend, send or delete without a human click.',
      'Watch Takeover Watch for how often agents already write and submit code.',
    ],
    href: '/si-watch.html',
  },
];

function gateTool() {
  const items = GATE_ITEMS.map(([id, label], i) => `<li><input type="checkbox" id="g${i}" data-id="${esc(id)}"><label for="g${i}">${esc(label)}</label></li>`).join('');
  return `<div class="fp-card" id="gate">
  <h3>1. People-first gate</h3>
  <p>Eight checks before an AI system touches someone’s money, health, job, rights or reputation. Tick what is already true. The score stays in your browser.</p>
  <ul class="fp-check">${items}</ul>
  <p><button class="fp-btn" type="button" id="gate-run">SCORE THIS SYSTEM</button>
  <button class="fp-btn ghost" type="button" id="gate-clear">CLEAR</button></p>
  <div class="fp-out" id="gate-out" hidden></div>
</div>
<script>
(function(){
  var KEY='siren:for-people-gate', items=[${JSON.stringify(GATE_ITEMS.map(([id, label]) => ({ id, label })))}];
  var boxes=document.querySelectorAll('#gate input[type=checkbox]'), out=document.getElementById('gate-out');
  try{var saved=JSON.parse(localStorage.getItem(KEY)||'{}');boxes.forEach(function(b){if(saved[b.getAttribute('data-id')])b.checked=true;});}catch(e){}
  function save(){var o={};boxes.forEach(function(b){o[b.getAttribute('data-id')]=b.checked;});try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}
  boxes.forEach(function(b){b.addEventListener('change',save);});
  function score(){
    save();
    var n=0, miss=[];
    boxes.forEach(function(b,i){if(b.checked)n++;else miss.push(items[i].label);});
    var pct=Math.round(100*n/boxes.length), tone=n>=7?'go':n>=4?'slow':'stop';
    var word=tone==='go'?'GO':tone==='slow'?'SLOW':'STOP';
    var h='<h3>People-first score: '+pct+'% <span class="fp-pill '+tone+'">'+word+'</span></h3>';
    h+='<div class="fp-meter"><i style="width:'+pct+'%"></i></div>';
    if(tone==='go')h+='<p>Most of the people-first basics are in place. Keep the stop switch and the audit log under a named owner.</p>';
    else if(tone==='slow')h+='<p>Ship only behind a human review for consequential decisions until the gaps below are closed.</p>';
    else h+='<p>Do not put this in front of people for consequential decisions until the missing checks are real, not aspirational.</p>';
    if(miss.length){h+='<p><b>Close these next:</b></p><ul>'+miss.map(function(m){return '<li>'+m+'</li>';}).join('')+'</ul>';}
    h+='<p><button class="fp-btn ghost" type="button" onclick="window.print()">PRINT THIS PAGE</button></p>';
    out.innerHTML=h;out.hidden=false;out.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  document.getElementById('gate-run').onclick=score;
  document.getElementById('gate-clear').onclick=function(){boxes.forEach(function(b){b.checked=false;});try{localStorage.removeItem(KEY);}catch(e){}out.hidden=true;};
})();
</script>`;
}

function oversightTool() {
  return `<div class="fp-card" id="oversight">
  <h3>2. Oversight planner</h3>
  <p>Fill in who reviews what, when they stop the system, and how a harmed person gets a reply. Copy the plan into your team doc. Nothing is sent anywhere.</p>
  <form id="ov-form">
    <label class="row" for="ov-system">System or agent name</label>
    <input type="text" id="ov-system" name="system" required placeholder="e.g. Clinic triage assistant" maxlength="120">
    <label class="row" for="ov-owner">Named owner (person)</label>
    <input type="text" id="ov-owner" name="owner" required placeholder="Who is accountable if it goes wrong?" maxlength="120">
    <label class="row" for="ov-reviewer">Who reviews consequential outputs?</label>
    <input type="text" id="ov-reviewer" name="reviewer" required placeholder="Role or name" maxlength="120">
    <label class="row" for="ov-when">When must a human approve before action?</label>
    <textarea id="ov-when" name="when" required placeholder="e.g. Any advice that changes medication, money over $50, or a legal filing"></textarea>
    <label class="row" for="ov-stop">Stop conditions (kill switch)</label>
    <textarea id="ov-stop" name="stop" required placeholder="e.g. User asks to stop; confidence unknown; source link missing; rate of overrides above 10%"></textarea>
    <label class="row" for="ov-recourse">How does a person get recourse?</label>
    <textarea id="ov-recourse" name="recourse" required placeholder="e.g. Email desk@example.org within 2 business days; escalate to the named owner"></textarea>
    <p><button class="fp-btn" type="submit">BUILD OVERSIGHT PLAN</button>
    <button class="fp-btn ghost" type="reset">CLEAR</button></p>
  </form>
  <div class="fp-out" id="ov-out" hidden></div>
</div>
<script>
(function(){
  var f=document.getElementById('ov-form'), out=document.getElementById('ov-out'), KEY='siren:for-people-oversight';
  try{var s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){['system','owner','reviewer','when','stop','recourse'].forEach(function(k){if(s[k]&&f.elements[k])f.elements[k].value=s[k];});}}catch(e){}
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var d={system:f.system.value.trim(),owner:f.owner.value.trim(),reviewer:f.reviewer.value.trim(),when:f.when.value.trim(),stop:f.stop.value.trim(),recourse:f.recourse.value.trim()};
    try{localStorage.setItem(KEY,JSON.stringify(d));}catch(err){}
    var text='OVERSIGHT PLAN — '+d.system+'\\n\\n'+
      'Named owner: '+d.owner+'\\n'+
      'Human reviewer: '+d.reviewer+'\\n\\n'+
      'Human approval required when:\\n'+d.when+'\\n\\n'+
      'Stop conditions:\\n'+d.stop+'\\n\\n'+
      'Recourse for people affected:\\n'+d.recourse+'\\n\\n'+
      'Rule: consequential actions wait for a person. The model drafts; the owner decides.\\n'+
      'Built with SIREN For People tools (local only; not legal advice).';
    out.innerHTML='<h3>Your oversight plan</h3><pre id="ov-pre"></pre><p><button class="fp-btn" type="button" id="ov-copy">COPY PLAN</button></p>';
    document.getElementById('ov-pre').textContent=text;
    out.hidden=false;
    document.getElementById('ov-copy').onclick=function(){
      var b=this;
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){b.textContent='COPIED';}).catch(function(){});
      else{var r=document.createRange();r.selectNodeContents(document.getElementById('ov-pre'));var s=window.getSelection();s.removeAllRanges();s.addRange(r);}
    };
    out.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  f.addEventListener('reset',function(){out.hidden=true;try{localStorage.removeItem(KEY);}catch(e){}});
})();
</script>`;
}

function charterTool() {
  const bits = CHARTER_BITS.map(([id, title, body]) => `<label class="fp-card" style="display:block;cursor:pointer"><input type="checkbox" data-id="${esc(id)}" checked style="margin-right:8px"> <b>${esc(title)}</b><p style="margin:6px 0 0">${esc(body)}</p></label>`).join('');
  return `<div class="fp-card" id="charter">
  <h3>3. Agent charter builder</h3>
  <p>Paste this into an AI agent’s system prompt or skill file so it stays honest, checkable and useful to people. Tick the clauses you want; edit the name; copy.</p>
  <label class="row" for="ch-name">Agent name</label>
  <input type="text" id="ch-name" value="Assistant" maxlength="80">
  <div class="fp-grid" style="margin-top:12px">${bits}</div>
  <p><button class="fp-btn" type="button" id="ch-run">BUILD CHARTER</button>
  <button class="fp-btn ghost" type="button" id="ch-all">ALL ON</button>
  <button class="fp-btn ghost" type="button" id="ch-none">ALL OFF</button></p>
  <div class="fp-out" id="ch-out" hidden></div>
</div>
<script>
(function(){
  var BITS=${JSON.stringify(CHARTER_BITS.map(([id, title, body]) => ({ id, title, body })))};
  var boxes=document.querySelectorAll('#charter input[type=checkbox]'), out=document.getElementById('ch-out'), nameEl=document.getElementById('ch-name');
  function build(){
    var name=(nameEl.value||'Assistant').trim()||'Assistant';
    var picked=[];
    boxes.forEach(function(b,i){if(b.checked)picked.push(BITS[i]);});
    if(!picked.length){out.innerHTML='<p>Pick at least one clause.</p>';out.hidden=false;return;}
    var text='# People-first charter for '+name+'\\n\\n'+
      name+' helps people. It does not treat a tempo index, a headline or a model guess as a doom probability or a forecast.\\n\\n'+
      picked.map(function(p,i){return (i+1)+'. '+p.title+'\\n'+p.body;}).join('\\n\\n')+
      '\\n\\nIf a request conflicts with this charter, refuse the harmful part, explain why in one sentence, and offer a safer alternative.\\n'+
      'When reporting SIREN: quote level + name, say 1 is loudest, give the UTC time, and link the source page or receipt.';
    out.innerHTML='<h3>Charter ready</h3><pre id="ch-pre"></pre><p><button class="fp-btn" type="button" id="ch-copy">COPY CHARTER</button></p>';
    document.getElementById('ch-pre').textContent=text;
    out.hidden=false;
    document.getElementById('ch-copy').onclick=function(){
      var b=this;
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){b.textContent='COPIED';}).catch(function(){});
    };
    out.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  document.getElementById('ch-run').onclick=build;
  document.getElementById('ch-all').onclick=function(){boxes.forEach(function(b){b.checked=true;});};
  document.getElementById('ch-none').onclick=function(){boxes.forEach(function(b){b.checked=false;});};
})();
</script>`;
}

function domainHref(ctx, d) {
  // Medicine lives behind the balance route gate; fall back to breakthroughs
  // when that room is off so the toolkit never links a 404.
  if (d.id === 'medicine' && !(ctx.routes && ctx.routes.balance)) return '/breakthroughs.html';
  return d.href;
}

function domainTool(ctx) {
  const cards = DOMAINS.map((d) => `<div class="fp-card" data-dom="${esc(d.id)}" hidden>
  <h3>${esc(d.name)}</h3>
  <p>${esc(d.blurb)}</p>
  <ul>${d.moves.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
  <p><a class="fp-btn ghost" href="${esc(ctx.href(domainHref(ctx, d)))}">Open related room →</a></p>
</div>`).join('');
  const btns = DOMAINS.map((d, i) => `<button type="button" data-dom="${esc(d.id)}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(d.name)}</button>`).join('');
  return `<div class="fp-card" id="domains">
  <h3>4. Where AI helps people today</h3>
  <p>Pick a domain. Each list is concrete work you can do this month — measured rooms on this site, not a utopia claim.</p>
  <div class="fp-dom" role="toolbar" aria-label="Benefit domains">${btns}</div>
  <div id="dom-cards">${cards}</div>
</div>
<script>
(function(){
  var btns=document.querySelectorAll('#domains .fp-dom button'), cards=document.querySelectorAll('#dom-cards [data-dom]');
  function show(id){
    btns.forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-dom')===id?'true':'false');});
    cards.forEach(function(c){c.hidden=c.getAttribute('data-dom')!==id;});
  }
  btns.forEach(function(b){b.onclick=function(){show(b.getAttribute('data-dom'));};});
  show(${JSON.stringify(DOMAINS[0].id)});
})();
</script>`;
}

export function render(ctx) {
  const main = `${CSS}
<section class="fp">
  <p class="eyebrow">FOR PEOPLE · TOOLS THAT STEER AI AND SI TOWARD HELP</p>
  <h1 class="bp__h1">Tools that help AI and SI be good for people</h1>
  <p class="lede">SIREN counts how loud AI is. These tools are for the other half of the job: putting people first when you use, ship or run AI and agents. Four free tools run in your browser. None of them change the index.</p>
  <a class="fp-x" href="${esc(xShare(ctx, 'Tools that help AI and SI be good for people — people-first gate, oversight plan, agent charter:', '/for-people.html'))}" target="_blank" rel="noopener">𝕏 POST THESE TOOLS</a>
  <h2>The toolkit</h2>
  <div class="fp-grid fp-toc">
    <a href="#gate"><b>People-first gate</b><small>Eight checks before AI touches people.</small></a>
    <a href="#oversight"><b>Oversight planner</b><small>Who reviews, when to stop, how to get recourse.</small></a>
    <a href="#charter"><b>Agent charter</b><small>Pasteable rules so agents stay useful and honest.</small></a>
    <a href="#domains"><b>Where AI helps</b><small>Concrete moves by domain, linked to measured rooms.</small></a>
  </div>
  <h2>Use the tools</h2>
  ${gateTool()}
  ${oversightTool()}
  ${charterTool()}
  ${domainTool(ctx)}
  <h2>Measured upside on this site</h2>
  <div class="fp-grid">
    ${ctx.routes && ctx.routes.balance ? `<a class="fp-card" href="${esc(ctx.href('/balance.html'))}"><h3>Balance →</h3><p>Harm and benefit, counted side by side, never summed.</p></a>` : ''}
    <a class="fp-card" href="${esc(ctx.href('/breakthroughs.html'))}"><h3>Breakthroughs →</h3><p>The good news, tracked from the newsroom.</p></a>
    ${ctx.bliss ? `<a class="fp-card" href="${esc(ctx.href('/bliss.html'))}"><h3>Upside →</h3><p>The direction we would be glad to see move.</p></a>` : ''}
    <a class="fp-card" href="${esc(ctx.href('/agents.html'))}"><h3>For AI agents →</h3><p>Open data and rules for agents that cite honestly.</p></a>
  </div>
  <p class="fp-note">General information, not legal, medical, safety or compliance advice. ${esc(brand.NAME)} measures activity tempo; it does not say whether what happened is good or bad, and it does not forecast superintelligence.</p>
</section>`;
  return page({
    ctx,
    path: '/for-people.html',
    title: `Tools that help AI and SI be good for people · ${brand.NAME}`,
    description: 'Free browser tools to steer AI and superintelligence toward people: a people-first deploy gate, an oversight planner, an agent charter builder, and concrete moves by domain.',
    main,
  });
}
