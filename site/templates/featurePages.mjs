// Four rooms that turn the reading into something a person can act on:
//   /si-ready.html       prepare for superintelligence (a personal plan)
//   /ai-proof-job.html   keep your job, and grow with AI
//   /breakthroughs.html  the good news, tracked from the newsroom
//   /live-x.html         live X searches, AI voices to follow, Spaces
// Advice here is general and labelled as such; nothing is a prediction, and
// nothing here feeds the index.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const CSS = `<style>
.fx{max-width:980px}
.fx .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px}
.fx h1{margin:0 0 10px}
.fx .lede{color:var(--ink-dim);max-width:68ch}
.fx h2{font:700 1.3rem/1.2 var(--sans);margin:34px 0 10px;color:var(--ink)}
.fx p,.fx li{color:var(--ink-dim);line-height:1.6}
.fx b{color:var(--ink)}
.fx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin:14px 0}
.fx-card{border:1px solid var(--rule);background:var(--bg-raised,#0E131D);border-radius:4px;padding:14px 16px}
.fx-card h3{margin:0 0 6px;font:700 1.02rem/1.3 var(--sans);color:var(--ink)}
.fx-card p{margin:0;font-size:14px}
.fx-q{border:1px solid var(--rule);border-radius:4px;padding:12px 14px;margin:8px 0;background:var(--bg-raised,#0E131D)}
.fx-q legend{font:600 15px/1.4 var(--sans);color:var(--ink);padding:0 4px}
.fx-q label{display:inline-flex;align-items:center;gap:6px;margin:6px 14px 0 0;color:var(--ink-dim);font-size:14px;cursor:pointer}
.fx-btn{display:inline-block;padding:11px 16px;border:0;border-radius:4px;background:var(--accent,#4ADE80);color:#000;font:700 13px/1 var(--mono);letter-spacing:.08em;cursor:pointer;text-decoration:none}
.fx-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--rule)}
.fx-out{margin:18px 0;padding:16px;border:1px solid var(--accent,#4ADE80);border-radius:4px;background:#03130A}
.fx-out h3{margin:0 0 8px;color:var(--ink)}
.fx-meter{height:12px;background:#000;border:1px solid var(--rule);border-radius:2px;overflow:hidden;margin:8px 0}
.fx-meter i{display:block;height:100%;background:var(--accent,#4ADE80)}
.fx-list{list-style:none;padding:0;margin:0}
.fx-list li{padding:12px 0;border-bottom:1px solid var(--rule)}
.fx-list a{color:var(--ink);font-weight:600;text-decoration:none}.fx-list a:hover{text-decoration:underline}
.fx-meta{font:500 12px/1.4 var(--mono);color:var(--ink-faint,#6B7686);margin-top:4px}
.fx-pill{display:inline-block;font:600 11px/1 var(--mono);letter-spacing:.06em;padding:4px 7px;border:1px solid var(--rule);border-radius:3px;margin-right:6px;color:var(--ink-dim)}
.fx-note{font-size:13px;color:var(--ink-faint,#6B7686);margin-top:24px}
.fx-x{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--rule);border-radius:4px;color:var(--ink);text-decoration:none;font:600 13px/1 var(--mono);margin:4px 6px 4px 0}
.fx-x:hover{border-color:var(--accent,#4ADE80)}
@media print{.fx-btn,.fx-q{break-inside:avoid}}
</style>`;

const xShare = (ctx, text, path) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ctx.url(path))}&via=SIRENutf6`;
const shareBtn = (ctx, text, path) => `<a class="fx-x" href="${esc(xShare(ctx, text, path))}" target="_blank" rel="noopener">𝕏 Post this on X</a>`;

// ---------------------------------------------------------------------------
// A short quiz renderer shared by the two planning pages. Each question has
// answers worth 0-2 points toward one area; the plan lists the actions for
// the weakest areas first. Runs in the browser, saves nothing anywhere but
// the visitor's own local storage.
// ---------------------------------------------------------------------------
function quiz({ id, questions, areas, intro }) {
  const qs = questions.map(([area, q, opts], i) => `<fieldset class="fx-q"><legend>${i + 1}. ${esc(q)}</legend>${opts.map(([label, pts], j) => `<label><input type="radio" name="q${i}" value="${pts}" data-area="${area}"${j === 0 ? ' required' : ''}> ${esc(label)}</label>`).join('')}</fieldset>`).join('');
  return `<form id="${id}" class="fx-quiz">${intro || ''}${qs}
  <p><button class="fx-btn" type="submit">BUILD MY PLAN →</button> <button class="fx-btn ghost" type="reset">START OVER</button></p></form>
  <div id="${id}-out" class="fx-out" hidden></div>
  <script>
  (function(){
    var AREAS=${JSON.stringify(areas)}, f=document.getElementById(${JSON.stringify(id)}), out=document.getElementById(${JSON.stringify(id + '-out')}), K='siren:'+${JSON.stringify(id)};
    try{var saved=JSON.parse(localStorage.getItem(K)||'null');if(saved)Object.keys(saved).forEach(function(n){var el=f.querySelector('input[name="'+n+'"][value="'+saved[n]+'"]');if(el)el.checked=true;});}catch(e){}
    function plan(){
      var got={},max={},ans={};
      f.querySelectorAll('fieldset').forEach(function(fs,i){var a=fs.querySelector('input').getAttribute('data-area');max[a]=(max[a]||0)+2;var c=fs.querySelector('input:checked');if(c){got[a]=(got[a]||0)+(+c.value);ans['q'+i]=c.value;}});
      try{localStorage.setItem(K,JSON.stringify(ans));}catch(e){}
      var keys=Object.keys(AREAS), total=0, tmax=0;
      keys.forEach(function(k){total+=got[k]||0;tmax+=max[k]||0;});
      var pct=Math.round(100*total/(tmax||1));
      var ranked=keys.slice().sort(function(a,b){return ((got[a]||0)/(max[a]||1))-((got[b]||0)/(max[b]||1));});
      var h='<h3>Your readiness: '+pct+'%</h3><div class="fx-meter"><i style="width:'+pct+'%"></i></div><p>Start with your weakest areas. Each has three moves you can make this month.</p>';
      ranked.forEach(function(k,i){var s=Math.round(100*(got[k]||0)/(max[k]||1));h+='<h3 style="margin-top:16px">'+(i+1)+'. '+AREAS[k].name+' <span class="fx-pill">'+s+'%</span></h3><ul>'+AREAS[k].moves.map(function(m){return '<li>'+m+'</li>';}).join('')+'</ul>';});
      h+='<p><button class="fx-btn ghost" type="button" onclick="window.print()">PRINT MY PLAN</button></p>';
      out.innerHTML=h;out.hidden=false;out.scrollIntoView({behavior:'smooth',block:'start'});
    }
    f.addEventListener('submit',function(e){e.preventDefault();plan();});
    f.addEventListener('reset',function(){out.hidden=true;try{localStorage.removeItem(K);}catch(e){}});
  })();
  </script>`;
}

// ---------------------------------------------------------------------------
// PREPARE FOR SUPERINTELLIGENCE
// ---------------------------------------------------------------------------
const SI_AREAS = {
  work: { name: 'Work and skills', moves: [
    'Use an AI assistant for one real task every day for a month, and write down what it got wrong.',
    'List the parts of your job that need judgment, trust or hands; move your time toward them.',
    'Learn to check AI output fast: sources, numbers, code that runs. Checking is the scarce skill.'] },
  money: { name: 'Money and resilience', moves: [
    'Build an emergency fund that covers several months of costs, in a plain savings account.',
    'Cut fixed monthly costs so a pay cut or job change would not be a crisis.',
    'Talk to a licensed financial adviser before making big moves on AI hype. This page is not financial advice.'] },
  info: { name: 'Information and deepfakes', moves: [
    'Agree a family code word for urgent calls or voice notes asking for money.',
    'Check where a clip was uploaded before you share it; the Real Clips room does this for you.',
    'Follow a few sources that publish their method, and fewer that only publish takes.'] },
  security: { name: 'Privacy and security', moves: [
    'Turn on two-factor sign-in (an app or passkey, not SMS) for email, bank and phone carrier.',
    'Use a password manager; never reuse a password.',
    'Remove yourself from people-search sites, and keep paper copies of key documents.'] },
  people: { name: 'Health, people and community', moves: [
    'Keep in-person friendships that do not run through a screen; they are the hardest thing to automate.',
    'Have a household plan for outages: water, food, power and a meeting place (see the Prepper Checklist).',
    'Talk with your kids about AI: what it is good at, and that it can be wrong with confidence.'] },
  voice: { name: 'Civic voice', moves: [
    'Read one primary source on AI policy where you live, not a summary of it.',
    'Tell your elected representatives what you want from AI rules; they count letters.',
    'Support groups doing AI safety and evaluation work, with time or money, if you can.'] },
};
const SI_QS = [
  ['work', 'How often do you use AI tools (ChatGPT, Claude, Gemini, Grok) for real work?', [['Never', 0], ['Sometimes', 1], ['Most days', 2]]],
  ['work', 'Could you explain which parts of your job an AI could do today?', [['No idea', 0], ['Roughly', 1], ['Yes, in detail', 2]]],
  ['money', 'How many months could you cover costs with no income?', [['Under 1', 0], ['1-3', 1], ['More than 3', 2]]],
  ['money', 'If your income dropped 30%, could you adjust within a month?', [['No', 0], ['With pain', 1], ['Yes', 2]]],
  ['info', 'Do you check where a viral video came from before believing it?', [['Rarely', 0], ['Sometimes', 1], ['Always', 2]]],
  ['info', 'Does your family have a code word for "is this really you?" calls?', [['No', 0], ['We talked about it', 1], ['Yes', 2]]],
  ['security', 'Do your email and bank use two-factor sign-in?', [['No', 0], ['Some', 1], ['All', 2]]],
  ['security', 'Do you use a password manager?', [['No', 0], ['Partly', 1], ['Yes', 2]]],
  ['people', 'Does your household have water, food and a plan for a few days without power?', [['No', 0], ['Some of it', 1], ['Yes', 2]]],
  ['people', 'How many people could you call in a crisis who you see in person?', [['None', 0], ['One or two', 1], ['Several', 2]]],
  ['voice', 'Have you read any AI rules or proposals that affect where you live?', [['No', 0], ['Headlines', 1], ['The source', 2]]],
  ['voice', 'Have you ever told a representative what you think about AI?', [['No', 0], ['Thought about it', 1], ['Yes', 2]]],
];


// The long-form guide under the quiz: what a regular person can actually do.
const SI_GUIDE = [
  ['Understand what is (and isn\'t) coming', [
    '<b>Superintelligence</b> means AI that is better than the best humans at most thinking work. Nobody knows if or when it arrives; serious estimates run from a few years to never. Plan for a range, not a date.',
    'What is already happening is easier to plan for: AI that writes, codes, summarises, translates, draws and talks well enough to change how many jobs are done.',
    'Follow measured signals, not hype. SIREN counts activity hourly; the <a href="/doomcon/methodology.html">method</a> shows what it can and cannot tell you.']],
  ['Your work: get ahead of the change', [
    '<b>Audit your week.</b> List your tasks and mark each: routine screen work, judgment, people, or hands-on. Routine screen work is what AI absorbs first.',
    '<b>Learn the tools in your field now.</b> An hour a day for a month with the assistant your industry uses beats any course. Keep notes on where it fails.',
    '<b>Grow the durable skills:</b> judgment under uncertainty, explaining things to people, negotiating, managing, caring, physical trades, and checking AI work.',
    '<b>Keep a side option.</b> A second skill, a certification, or a small side income makes a layoff a setback instead of a crisis.',
    'Use the <a href="/doomcon/ai-proof-job.html">AI-proof your job</a> plan for step-by-step moves.']],
  ['Your money: resilience over prediction', [
    'Build an emergency fund that covers several months of essential costs, in an ordinary insured savings account.',
    'Pay down high-interest debt; it is the surest return there is.',
    'Do not bet your savings on AI hype, AI coins or "superintelligence funds". Scammers love a frightening headline.',
    'Spread risk and get advice from a licensed, fee-only financial adviser. Nothing here is financial advice.']],
  ['Your information: don\'t get fooled', [
    'Assume any voice, video or photo can be faked. Check <b>where it was posted first</b> and by whom; the <a href="/doomcon/elon.html">Real Clips</a> room does this for video.',
    'Agree a <b>family code word</b> for any urgent call or message asking for money or secrets. Voice-clone scams target parents and grandparents.',
    'Slow down on anything that makes you angry or scared in seconds; that is how manipulation works, human or AI.',
    'Keep a few sources that publish corrections and methods. Drop the ones that only publish certainty.']],
  ['Your digital security: lock the doors', [
    'Turn on two-factor sign-in with an authenticator app or passkey (not SMS) for email, bank, phone carrier and social accounts.',
    'Use a password manager and unique passwords everywhere.',
    'Freeze your credit with the three bureaus (free in the US); unfreeze only when you need to.',
    'Back up your photos and documents to two places, one offline.',
    'Remove your listings from people-search sites, and share less publicly: AI makes scraping and impersonation cheap.']],
  ['Your household: ready for outages', [
    'More automation means more systems that can fail together. Keep water, food, light, power and cash for at least three days, ideally two weeks.',
    'Know how to reach family if phones and the internet are down: a meeting place and an out-of-area contact.',
    'The <a href="/doomcon/prepper-checklist.html">Prepper Checklist</a> sizes it for your household.']],
  ['Your kids and family', [
    'Teach AI literacy early: AI can be helpful and confidently wrong at the same time.',
    'Talk about fakes, scams and why people should never share personal details or photos with strangers, human or bot.',
    'Encourage what AI cannot replace: friendships, sport, making things with their hands, and asking good questions.']],
  ['Your mind and your people', [
    'Worrying about AI is normal. Limit doom-scrolling; check in on the news on purpose, not all day.',
    'Invest in in-person community: neighbours, clubs, faith groups, volunteering. Trust between people becomes more valuable, not less.',
    'Find meaning that does not depend on being the fastest at a task: craft, care, service, learning for its own sake.']],
  ['Your voice', [
    'Read one primary source on AI rules where you live, and tell your representatives what you want. They count messages.',
    'Support independent AI safety and evaluation work if you can, with time, skills or money.',
    'Ask the companies you buy from how they use AI with your data, and choose the ones that answer.']],
];
const SI_30 = [
  ['Week 1', 'Turn on two-factor and a password manager. Agree a family code word. Use an AI assistant for one real task each day.'],
  ['Week 2', 'Audit your work week. Start or top up an emergency fund. Freeze your credit.'],
  ['Week 3', 'Build a 72-hour kit. Back up photos and documents. Pick one durable skill and book time for it.'],
  ['Week 4', 'Talk with your family about AI and fakes. Reach out to two people outside work. Review your plan and set the next 30 days.'],
];
const SI_DONT = [
  'Panic-sell, quit your job or move your life on a headline.',
  'Buy "AI-proof" courses, coins or bunkers from people selling fear.',
  'Trust a video, voice or screenshot because it looks real.',
  'Hand an AI app your passwords, ID documents or bank logins.',
  'Assume it is all hype, or that it is all over. Both are bets, and neither is a plan.',
];
function siGuide() {
  return `<h2>The full guide: how regular people can prepare</h2>
  <p>Practical steps for anyone, whatever happens with superintelligence. Open a section to read it.</p>
  ${SI_GUIDE.map(([t, items], i) => `<details class="fx-card" style="margin:8px 0"${i === 0 ? ' open' : ''}><summary style="cursor:pointer;font:700 1.05rem/1.3 var(--sans);color:var(--ink)">${t}</summary><ul style="margin:10px 0 0">${items.map((x) => `<li>${x}</li>`).join('')}</ul></details>`).join('')}
  <h2>A 30-day starter plan</h2>
  <div class="fx-grid">${SI_30.map(([w, d]) => `<div class="fx-card"><h3>${w}</h3><p>${d}</p></div>`).join('')}</div>
  <h2>What not to do</h2>
  <ul>${SI_DONT.map((d) => `<li>${d}</li>`).join('')}</ul>`;
}

export function siReady(ctx) {
  const main = `${CSS}
<section class="fx">
  <p class="eyebrow">PREPARE FOR SUPERINTELLIGENCE · A PERSONAL PLAN IN 3 MINUTES</p>
  <h1 class="bp__h1">Ready for superintelligence?</h1>
  <p class="lede">Nobody knows when, or if, AI becomes smarter than people at most things. You can still get ready for a world that keeps getting more automated, whichever way it goes. Answer twelve questions and get a plan for your weakest areas first. Nothing leaves your browser.</p>
  ${shareBtn(ctx, 'Are you ready for superintelligence? Take the 3-minute check:', '/si-ready.html')}
  <h2>The six areas</h2>
  <div class="fx-grid">${Object.values(SI_AREAS).map((a) => `<div class="fx-card"><h3>${esc(a.name)}</h3><p>${esc(a.moves[0])}</p></div>`).join('')}</div>
  <h2>Your check</h2>
  ${quiz({ id: 'siq', questions: SI_QS, areas: SI_AREAS })}
  ${siGuide().replace(/\/doomcon\//g, ctx.href('/'))}
  <h2>Keep going</h2>
  <div class="fx-grid">
    <a class="fx-card" href="${esc(ctx.href('/ai-proof-job.html'))}"><h3>AI-proof your job →</h3><p>Where AI hits your work, and how to grow with it.</p></a>
    <a class="fx-card" href="${esc(ctx.href('/prepper-checklist.html'))}"><h3>Prepper Checklist →</h3><p>The physical side: water, food, power, documents.</p></a>
    <a class="fx-card" href="${esc(ctx.href('/breakthroughs.html'))}"><h3>Breakthroughs →</h3><p>The good news, because there is a lot of it.</p></a>
  </div>
  <p class="fx-note">General information, not financial, legal, career or medical advice. ${esc(brand.NAME)} counts AI activity; it does not predict superintelligence.</p>
</section>`;
  return page({ ctx, path: '/si-ready.html', title: `Prepare for superintelligence: a 3-minute personal plan · ${brand.NAME}`,
    description: 'How to prepare for superintelligence and an AI-driven world: a free 3-minute check across work, money, deepfakes, security, community and civic voice, with a printable plan.', main });
}

// ---------------------------------------------------------------------------
// AI-PROOF YOUR JOB
// ---------------------------------------------------------------------------
const JOB_AREAS = {
  tasks: { name: 'Move toward the work AI is worst at', moves: [
    'Write down your week by task. Mark each one routine, judgment, people or hands-on.',
    'Volunteer for the judgment and people work: decisions, negotiations, client trust, mentoring.',
    'Own an outcome, not a task: "I make X happen" survives automation better than "I do step 3".'] },
  tools: { name: 'Become the person who runs the AI', moves: [
    'Pick the AI tool your field uses most and get properly good at it this month.',
    'Automate one boring task of your own and show your team how you did it.',
    'Keep a running doc of prompts and checks that work in your job; it becomes a playbook others need.'] },
  proof: { name: 'Make your value visible', moves: [
    'Track results in numbers your boss cares about: time saved, revenue, errors caught.',
    'Share what you learn about AI at work; the explainer becomes the leader.',
    'Keep your CV and portfolio current every quarter, not when you need them.'] },
  learn: { name: 'Keep learning on purpose', moves: [
    'Spend two hours a week on a skill one step away from your job, ideally one that pairs with AI.',
    'Take a short course with a project at the end, not just videos.',
    'Find a peer group or community in your field that is figuring out AI too.'] },
  net: { name: 'Build a safety net', moves: [
    'Grow a network outside your company: a coffee a month adds up.',
    'Keep a few months of costs saved so you can choose your next move, not just take one.',
    'Know your options now: adjacent roles, retraining support, and where your skills transfer.'] },
};
const JOB_QS = [
  ['tasks', 'How much of your week is repeatable screen work (forms, reports, copying data)?', [['Most of it', 0], ['About half', 1], ['Little of it', 2]]],
  ['tasks', 'How much of your work depends on trust, judgment or physical skill?', [['Little', 0], ['Some', 1], ['Most', 2]]],
  ['tools', 'Do you use AI tools in your job today?', [['No', 0], ['Occasionally', 1], ['Daily', 2]]],
  ['tools', 'Have you automated any part of your own work?', [['No', 0], ['Tried', 1], ['Yes', 2]]],
  ['proof', 'Could you show your impact last quarter in numbers?', [['No', 0], ['Roughly', 1], ['Yes', 2]]],
  ['proof', 'Do colleagues come to you for help with new tools?', [['No', 0], ['Sometimes', 1], ['Often', 2]]],
  ['learn', 'When did you last learn a new work skill on purpose?', [['Over a year ago', 0], ['This year', 1], ['This month', 2]]],
  ['learn', 'Do you know which skills next to yours are in demand?', [['No', 0], ['Vaguely', 1], ['Yes', 2]]],
  ['net', 'Could you name five people outside your company who would take your call about work?', [['No', 0], ['A couple', 1], ['Yes', 2]]],
  ['net', 'If your role disappeared next month, do you know your next three options?', [['No', 0], ['One', 1], ['Yes', 2]]],
];

export function jobProof(ctx) {
  const main = `${CSS}
<section class="fx">
  <p class="eyebrow">AI-PROOF YOUR JOB · EVOLVE WITH IT</p>
  <h1 class="bp__h1">Don't lose your job to AI. Grow with it.</h1>
  <p class="lede">AI changes tasks before it changes jobs. The people who do best are usually the ones who learn the tools first, move toward the work AI is worst at, and make their value easy to see. Ten questions, then a plan in the order that matters for you.</p>
  ${shareBtn(ctx, 'How exposed is your job to AI, and what to do about it. A 2-minute plan:', '/ai-proof-job.html')}
  <h2>Five moves that keep working</h2>
  <div class="fx-grid">${Object.values(JOB_AREAS).map((a) => `<div class="fx-card"><h3>${esc(a.name)}</h3><p>${esc(a.moves[0])}</p></div>`).join('')}</div>
  <h2>Your plan</h2>
  ${quiz({ id: 'jobq', questions: JOB_QS, areas: JOB_AREAS })}
  <h2>What has actually been counted</h2>
  <p>Forecasts of jobs lost to AI disagree wildly. The <a href="${esc(ctx.href('/jobs.html'))}">Jobs room</a> lists only what has been measured, with sources, and says what the counts do not show.</p>
  <p class="fx-note">General information, not career, legal or financial advice.</p>
</section>`;
  return page({ ctx, path: '/ai-proof-job.html', title: `AI-proof your job: a 2-minute plan to grow with AI · ${brand.NAME}`,
    description: 'Will AI take your job? A free 2-minute check of your exposure, and a personal plan: move toward judgment work, master the tools, show your value, keep learning, build a safety net.', main });
}

// ---------------------------------------------------------------------------
// BREAKTHROUGHS — the good news, from the newsroom
// ---------------------------------------------------------------------------
const STRONG = /\b(breakthroughs?|cures?|cured|discovers?|discovered|solv(es|ed|ing)|proofs?|theorem|proteins?|drugs?|vaccines?|antibiotics?|cancer|tumou?rs?|alzheimer'?s?|parkinson'?s?|dementia|fusion|new materials?|alphafold|virtual cell|restor\w+|paraly\w+|blind\w*|deaf\w*|FDA|clinical trial|diseases?|genom\w+|enzymes?|antibod\w+|wildfires?|earthquakes?|climate|carbon capture|crops?|malaria|tuberculosis|rare disease|math(ematical)? (findings|problems?|breakthroughs?))\b/i;
const NEG = /\b(lawsuit|sues?|sued|layoffs?|ban|bans|risk|hack\w*|breach|scam|fraud|deepfake|warns?|fears?|concerns?|questions?|oversight|weapons?|war|military|death|dies|killed|probe|investigat\w*|fined?|bubble|crash|disrupt|apologi[sz]e|abuse|hotel|database)\b/i;
const FIELD = [
  ['Medicine', /\b(cancer|tumou?r|drug|vaccine|antibiotic|alzheimer|parkinson|dementia|FDA|clinical|disease|patients?|medical|hospital|diagnos|malaria|tuberculosis|genom|antibod|protein|enzyme|cell)\w*/i],
  ['Math & science', /\b(math|theorem|proof|physics|chemistry|materials?|fusion|discover|solv)\w*/i],
  ['Climate & Earth', /\b(climate|carbon|wildfire|earthquake|weather|crop|energy)\w*/i],
  ['Accessibility', /\b(blind|deaf|paraly|accessib|restor)\w*/i],
];
export function pickBreakthroughs(items) {
  return (items || []).filter((i) => i.kind !== 'paper' && STRONG.test(i.title) && !NEG.test(i.title))
    .map((i) => ({ id: i.id, title: i.title, url: i.url, source: i.source, published_at: i.published_at, field: (FIELD.find(([, re]) => re.test(`${i.title} ${i.summary || ''}`)) || ['Other'])[0] }));
}
export function mergeBreakthroughs(prev, fresh, max = 300) {
  const byId = new Map((prev || []).map((b) => [b.id, b]));
  for (const b of fresh) if (!byId.has(b.id)) byId.set(b.id, b);
  return [...byId.values()].sort((a, b) => String(b.published_at).localeCompare(String(a.published_at))).slice(0, max);
}

export function breakthroughs(ctx, list) {
  const fields = ['All', ...new Set(list.map((b) => b.field))];
  const rows = list.map((b) => `<li data-field="${esc(b.field)}"><a href="${esc(b.url)}" rel="noopener" target="_blank">${esc(b.title)}</a>
    <div class="fx-meta"><span class="fx-pill">${esc(b.field.toUpperCase())}</span>${esc(String(b.source).toUpperCase())} · ${esc(String(b.published_at).slice(0, 10))}
    · <a href="${esc(`https://x.com/intent/post?text=${encodeURIComponent(`AI breakthrough: ${b.title}`)}&url=${encodeURIComponent(b.url)}&via=SIRENutf6`)}" target="_blank" rel="noopener">𝕏 Post</a></div></li>`).join('');
  const main = `${CSS}
<section class="fx">
  <p class="eyebrow">THE GOOD NEWS · TRACKED FROM ${esc(brand.NAME)}'S NEWSROOM</p>
  <h1 class="bp__h1">AI breakthroughs</h1>
  <p class="lede">Not every AI story is about risk. These are the ones about AI helping: new drugs and diagnoses, solved math problems, better forecasts, restored senses. Picked automatically from the newsroom's sources and kept as an archive; a headline is the outlet's claim, so open the story before you share it.</p>
  ${shareBtn(ctx, 'The good side of AI, tracked: new medicines, solved problems, restored senses.', '/breakthroughs.html')}
  <p>${fields.map((f, i) => `<button type="button" class="fx-btn${i ? ' ghost' : ''}" data-f="${esc(f)}" style="margin:4px 6px 4px 0">${esc(f.toUpperCase())}</button>`).join('')}</p>
  ${list.length ? `<ul class="fx-list" id="bt">${rows}</ul>` : '<p>No breakthrough stories in the current window. The newsroom refreshes every 15 minutes.</p>'}
  <h2>More of the upside</h2>
  <div class="fx-grid">
    <a class="fx-card" href="${esc(ctx.href('/bliss.html'))}"><h3>The Upside index →</h3><p>The same machinery, pointed at the good direction.</p></a>
    <a class="fx-card" href="${esc(ctx.href('/medicine.html'))}"><h3>Medicine →</h3><p>Trials and approvals of AI in medicine, counted.</p></a>
  </div>
</section>
<script>
(function(){var bs=document.querySelectorAll('[data-f]');bs.forEach(function(b){b.onclick=function(){var f=b.getAttribute('data-f');bs.forEach(function(x){x.classList.toggle('ghost',x!==b);});document.querySelectorAll('#bt li').forEach(function(li){li.hidden=f!=='All'&&li.getAttribute('data-field')!==f;});};});})();
</script>`;
  return page({ ctx, path: '/breakthroughs.html', title: `AI breakthroughs: the good news, tracked · ${brand.NAME}`,
    description: 'Positive AI breakthroughs, tracked automatically: new drugs and diagnoses, solved math problems, climate and accessibility wins. Sourced from 30+ AI news feeds, updated every 15 minutes.', main });
}

// ---------------------------------------------------------------------------
// LIVE ON X — searches that are always live, voices worth following, Spaces
// ---------------------------------------------------------------------------
const X_SEARCHES = [
  ['Superintelligence, latest', 'superintelligence'],
  ['AGI, latest', 'AGI OR "artificial general intelligence"'],
  ['AI safety, latest', '"AI safety" OR "AI alignment"'],
  ['New model launches', '("new model" OR launch OR release) (GPT OR Claude OR Gemini OR Grok OR Llama)'],
  ['AI and jobs', '(AI OR "artificial intelligence") (jobs OR layoffs OR hiring)'],
  ['Skynet talk', 'Skynet AI'],
];
const X_VOICES = [
  ['Labs', [['OpenAI', 'OpenAI'], ['Anthropic', 'AnthropicAI'], ['Google DeepMind', 'GoogleDeepMind'], ['xAI', 'xai'], ['AI at Meta', 'AIatMeta'], ['Mistral AI', 'MistralAI'], ['NVIDIA', 'nvidia']]],
  ['Leaders', [['Sam Altman', 'sama'], ['Dario Amodei', 'DarioAmodei'], ['Demis Hassabis', 'demishassabis'], ['Elon Musk', 'elonmusk'], ['Yann LeCun', 'ylecun'], ['Andrej Karpathy', 'karpathy'], ['Greg Brockman', 'gdb'], ['Mustafa Suleyman', 'mustafasuleyman'], ['Satya Nadella', 'satyanadella'], ['Sundar Pichai', 'sundarpichai']]],
];
export function liveX(ctx) {
  const search = (q, live = true) => `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query${live ? '&f=live' : ''}`;
  const main = `${CSS}
<section class="fx">
  <p class="eyebrow">LIVE ON X · AI AS IT HAPPENS</p>
  <h1 class="bp__h1">Live X feeds and Spaces on AI</h1>
  <p class="lede">Every link below opens a live X feed, newest first, so it is never out of date. For a scored, de-duplicated version of the same news, the <a href="${esc(ctx.href('/news.html'))}">Newsroom</a> reads 30+ sources every 15 minutes.</p>
  <p><a class="fx-btn" href="https://x.com/SIRENutf6" target="_blank" rel="noopener">FOLLOW @SIRENutf6 ON X →</a></p>
  <h2>Live feeds</h2>
  <div class="fx-grid">${X_SEARCHES.map(([t, q]) => `<a class="fx-card" href="${esc(search(q))}" target="_blank" rel="noopener"><h3>${esc(t)} ↗</h3><p class="fx-meta">${esc(q)}</p></a>`).join('')}</div>
  <h2>Spaces: live audio rooms on AI</h2>
  <p>X Spaces are live audio conversations. These open X's search for Spaces about AI; join any that are live now.</p>
  <p>
    <a class="fx-x" href="${esc(search('(AI OR AGI OR superintelligence) filter:spaces', false))}" target="_blank" rel="noopener">🎙 AI Spaces ↗</a>
    <a class="fx-x" href="${esc(search('(ChatGPT OR Claude OR Grok OR Gemini) filter:spaces', false))}" target="_blank" rel="noopener">🎙 Chatbot Spaces ↗</a>
    <a class="fx-x" href="${esc(search('("AI safety" OR alignment) filter:spaces', false))}" target="_blank" rel="noopener">🎙 AI safety Spaces ↗</a>
  </p>
  ${X_VOICES.map(([g, list]) => `<h2>${esc(g)} to follow</h2><p>${list.map(([n, h]) => `<a class="fx-x" href="https://x.com/${esc(h)}" target="_blank" rel="noopener">${esc(n)} <span class="fx-meta">@${esc(h)}</span></a>`).join('')}</p>`).join('')}
  <p class="fx-note">Links go to X; what you see there is X's, under X's rules and privacy policy. ${esc(brand.NAME)} does not embed X on this page, so nothing loads from X until you click.</p>
</section>`;
  return page({ ctx, path: '/live-x.html', title: `Live X feeds and Spaces on AI · ${brand.NAME}`,
    description: 'Live X (Twitter) feeds on superintelligence, AGI, AI safety and model launches, live AI Spaces, and the AI labs and leaders worth following.', main });
}
