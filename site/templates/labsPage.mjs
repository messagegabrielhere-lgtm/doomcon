// /labs.html — SIREN LABS. The research bench: every week, four or five new
// experiments on how to see superintelligence coming, built from open data
// and published with their method. The plan lives in LABS below; the page
// works out which week it is at build time, and /api/labs.json carries the
// same plan for agents.
//
// Voice (docs/VOICE.md): each experiment asks a measurable question and says
// what it will count. None of them claims to know when, or whether, SI arrives.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

const PATH = '/labs.html';
const qTitle = `What is ${brand.NAME} Labs measuring this week?`;

// status: 'lab' (on the bench this week), 'queued' (planned), 'shipped' (live; href set)
export const LABS = {
  started: '2026-10-12',
  weeks: [
    { start: '2026-10-12', theme: 'Is AI building AI yet?', items: [
      { id: 'rsi', name: 'The Recursion Meter', q: 'How much of the code that builds AI is now written by AI?', build: 'Count agent-authored pull requests merged into the core AI stacks (PyTorch, Transformers, vLLM, JAX, llama.cpp) each day, as a share of all merged PRs.', data: 'GitHub public API; the agent-PR tracker behind Takeover Watch.', measure: 'A daily share with a 30-day trend line, recomputable from the PR list.', icon: 'px:agentcode', c: '#4ADE80', status: 'shipped', href: '/bench.html#rsi' },
      { id: 'horizon', name: 'The Task-Horizon Clock', q: 'How long a job can an AI agent finish on its own?', build: 'Chart the published length of tasks frontier agents complete half the time (METR’s time-horizon measure) and the doubling time it implies.', data: 'METR published results; model release dates.', measure: 'Hours of human work per task, per model, on a log scale.', icon: 'px:pclock', c: '#22D3EE', status: 'shipped', href: '/bench.html#horizon' },
      { id: 'jump', name: 'Capability Jump Alarm', q: 'When does a new model land far off the trend?', build: 'Fit the trend on public leaderboards and flag any release that beats it by more than two standard deviations.', data: 'LMArena, Epoch AI benchmarks hub, Artificial Analysis.', measure: 'A list of flagged jumps with the size of the gap, each linked to its source.', icon: 'px:trendchart', c: '#FACC15', status: 'shipped', href: '/bench.html#jump' },
      { id: 'compute', name: 'The Compute Clock', q: 'How fast is frontier training compute growing?', build: 'A live clock of the largest disclosed training run, with the doubling time from Epoch’s notable-models data.', data: 'Epoch AI notable models dataset (CC BY).', measure: 'FLOP of the largest known run and months per doubling.', icon: 'px:db', c: '#A78BFA', status: 'shipped', href: '/compute.html' },
      { id: 'quiet', name: 'The Lab Silence Index', q: 'Do labs go quiet before a big release?', build: 'Track each lab’s posting cadence (blog, GitHub, X) and mark unusual silences, then check them against what shipped next.', data: 'The newsroom feeds and the Leaders tracker already on SIREN.', measure: 'Days of silence versus each lab’s normal rhythm, scored after the fact.', icon: 'px:shrug', c: '#94A3B8', status: 'shipped', href: '/bench.html#quiet' },
    ] },
    { start: '2026-10-19', theme: 'Who is watching the watchers?', items: [
      { id: 'exodus', name: 'Safety Team Exodus Tracker', q: 'Are safety researchers leaving the frontier labs?', build: 'A dated ledger of announced departures from safety and alignment teams, with where people went.', data: 'Public announcements on X, Bluesky and the newsroom.', measure: 'Departures per lab per quarter, every entry sourced.', icon: 'px:team', c: '#F87171' },
      { id: 'cards', name: 'System Card Diff', q: 'What new dangers do labs test for with each model?', build: 'Diff each new system card against the last one from the same lab and highlight new dangerous-capability evaluations.', data: 'Published system and model cards.', measure: 'New eval categories per release, quoted line by line.', icon: 'px:doc', c: '#60A5FA' },
      { id: 'timelines', name: 'AGI Timeline Ledger', q: 'How have AI leaders’ stated AGI dates moved?', build: 'Every dated public statement of an AGI or superintelligence year from the people SIREN tracks, plotted over time.', data: 'Leaders tracker, interviews, posts, each linked.', measure: 'Stated year by speaker and date said; shifts shown as arrows.', icon: 'px:headline', c: '#FB923C' },
      { id: 'chips', name: 'Chip Export Watch', q: 'Where are the controls on AI chips tightening?', build: 'Parse Federal Register and Commerce notices for AI-chip export rules and entity-list additions.', data: 'Federal Register API (already a SIREN source).', measure: 'Rules and listings per month, by country named.', icon: 'px:threatshield', c: '#EF4444' },
    ] },
    { start: '2026-10-26', theme: 'The physical footprint', items: [
      { id: 'queue', name: 'Gigawatt Queue', q: 'How much new power are AI data centres asking the grid for?', build: 'Add up large-load interconnection requests (100 MW and up) by state and grid operator.', data: 'Grid operator queue reports; the SIREN data-centre map.', measure: 'Gigawatts requested per month, per state.', icon: 'px:pylon', c: '#FACC15' },
      { id: 'opengap', name: 'The Open-Weights Gap', q: 'How many months do open models trail the best closed ones?', build: 'For each capability level, the date a closed model first reached it versus the first open-weights model.', data: 'Public leaderboards and release dates.', measure: 'The gap in months, over time.', icon: 'px:agent2', c: '#34D399' },
      { id: 'turing', name: 'Daily Turing Test', q: 'Can visitors still tell AI writing from human writing?', build: 'A daily five-question game: pick the human. Results published in aggregate.', data: 'Public-domain human text; outputs from open models.', measure: 'The share of correct guesses each day.', icon: 'px:joystick', c: '#818CF8' },
      { id: 'govready', name: 'Government SI Readiness Map', q: 'Which governments have an AI safety body and binding rules?', build: 'A world map of AI safety institutes, AI laws in force and frontier-model reporting rules.', data: 'Official government sources, each linked.', measure: 'A checklist score per country, with every item sourced.', icon: 'globe', c: '#22D3EE' },
    ] },
    { start: '2026-11-02', theme: 'Brakes and dials', items: [
      { id: 'alignratio', name: 'Alignment-to-Capabilities Ratio', q: 'Is safety research keeping pace with capabilities research?', build: 'Weekly arXiv counts of alignment and interpretability papers against capabilities papers.', data: 'arXiv listings (already a SIREN source).', measure: 'The ratio each week, with the keyword rules published.', icon: 'px:scalebias', c: '#4ADE80' },
      { id: 'incidents', name: 'AI Incident Clock', q: 'How often are new AI incidents being recorded?', build: 'New entries in the public AI incident databases, per week, by harm type.', data: 'AI Incident Database, OECD AI incidents monitor.', measure: 'Incidents per week, each linked to its report.', icon: 'px:beacon', c: '#F87171' },
      { id: 'tripwires', name: 'Tripwire Registry', q: 'What thresholds have labs promised to stop at?', build: 'Every published frontier safety framework, its capability thresholds, and any public statement that a threshold was reached.', data: 'Lab safety frameworks and system cards.', measure: 'Thresholds per lab and the date each was last tested.', icon: 'px:crosshair2', c: '#FB923C' },
      { id: 'agi-odds', name: 'All the AGI Odds', q: 'What do the forecasting markets say, side by side?', build: 'One chart of AGI-date questions across Metaculus, Polymarket, Kalshi and Manifold, with each question’s own definition.', data: 'Public market and forecast APIs.', measure: 'Median dates and prices, each linked to its question.', icon: 'px:candles', c: '#A78BFA' },
    ] },
  ],
  // Earlier ideas that are already live on the site.
  shipped: [
    ['/bench.html', 'Is AI building AI yet? (week of Oct 12)'],
    ['/compute.html', 'How fast is frontier training compute growing?'],
    ['/si-watch.html#coding', 'What AI autonomy signals is SIREN watching?'],
    ['/self-aware.html', 'What if an AI wakes up at 2:14 a.m.?'],
    ['/charts.html', 'What AI charts does SIREN publish?'],
    ['/status.html', 'Is ChatGPT down? Is Claude down?'],
    ['/power.html', 'Who makes the most electricity (China vs US)?'],
    ['/p-doom.html#voices', 'What is p(doom)?'],
  ],
};

/** Which planned week is current for a given time (the last one once the plan runs out). */
export function currentWeek(nowMs = Date.now(), labs = LABS) {
  let idx = 0;
  labs.weeks.forEach((w, i) => { if (Date.parse(w.start + 'T00:00:00Z') <= nowMs) idx = i; });
  return idx;
}

const CSS = `<style>
.lb{max-width:1100px}.lb .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#22D3EE;margin:0 0 10px}
.lb-wk{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin:22px 0 6px}.lb-wk h2{margin:0;font:800 22px/1.2 var(--sans);color:#fff}.lb-wk span{font:700 12px var(--mono);letter-spacing:.1em;color:#22D3EE}
.lb-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin:12px 0}
.lb-c{display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid var(--rule);border-top:4px solid var(--c);border-radius:8px;background:var(--bg-raised,#0E131D)}
.lb-c header{display:flex;align-items:center;gap:10px}.lb-c header img{width:40px;height:40px;image-rendering:pixelated}
.lb-c h3{margin:0;font:800 17px/1.2 var(--sans);color:#fff}.lb-c .n{font:700 11px var(--mono);color:var(--c);letter-spacing:.1em}
.lb-c .q{margin:0;font:600 15px/1.4 var(--sans);color:#E6EAF0}
.lb-c dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:13px;line-height:1.45}.lb-c dt{font:700 10.5px/1.7 var(--mono);color:var(--ink-faint,#6B7686);letter-spacing:.08em}.lb-c dd{margin:0;color:var(--ink-dim)}
.lb-st{align-self:flex-start;font:700 10.5px var(--mono);letter-spacing:.1em;padding:3px 8px;border-radius:999px;border:1px solid var(--c);color:var(--c);text-decoration:none}
.lb-c button{margin-top:auto;align-self:flex-start;appearance:none;border:1px solid #334155;background:transparent;color:#CBD5E1;padding:7px 10px;font:700 12px var(--mono);cursor:pointer}
.lb-next{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.lb-next div{border:1px solid var(--rule);border-radius:8px;padding:12px 14px;background:var(--bg-raised,#0E131D)}
.lb-next b{display:block;font:700 12px var(--mono);color:#22D3EE;letter-spacing:.08em;margin-bottom:4px}.lb-next i{display:block;font-style:normal;color:#fff;font-weight:700;margin-bottom:6px}
.lb-next ul{margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-dim)}
.lb-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0}
.lb-rules div{border-left:3px solid #22D3EE;padding:6px 12px;font-size:14px;color:var(--ink-dim)}.lb-rules b{color:#fff;display:block}
.lb-faq{margin:34px 0 12px;max-width:62ch}
.lb-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink)}
.lb-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink)}
.lb-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.lb-faq-key{margin-top:var(--s-4,1rem)!important}
</style>`;

export function render(ctx, nowMs = Date.now()) {
  const img = (n) => esc(ctx.href(String(n).startsWith('px:') ? `/img/px-${String(n).slice(3)}.svg` : `/img/art-${n}.webp`));
  const share = esc(ctx.url ? ctx.url(PATH) : `https://siren.watch${PATH}`);
  const wi = currentWeek(nowMs);
  const wk = LABS.weeks[wi];
  const wkNo = wi + 1;
  const fmtD = (s) => new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  // Tip #365: experiment-card H3s use the measurable question (mirrored in FAQ §3.3).
  // Shipped items link to the live /bench.html instrument.
  const card = (it, n) => {
    const live = it.status === 'shipped' && it.href;
    const st = live
      ? `<a class="lb-st" href="${esc(ctx.href(it.href))}">● LIVE →</a>`
      : `<span class="lb-st">● ON THE BENCH</span>`;
    const go = live
      ? `<a href="${esc(ctx.href(it.href))}" style="margin-top:auto;align-self:flex-start;border:1px solid var(--c);color:var(--c);padding:7px 10px;font:700 12px var(--mono);text-decoration:none">Open the instrument</a>`
      : `<button type="button" data-xpost="page" data-x-title="SIREN Labs, experiment ${wkNo}.${n}: ${esc(it.q)}" data-x-src="SIREN Labs" data-x-url="${share}#${esc(it.id)}">𝕏 Post this question</button>`;
    return `<article class="lb-c" id="${esc(it.id)}" style="--c:${it.c}">
    <header><img src="${img(it.icon)}" width="40" height="40" alt=""><div><span class="n">EXPERIMENT ${wkNo}.${n} · ${esc(it.name)}</span><h3>${esc(it.q)}</h3></div></header>
    <dl><dt>BUILD</dt><dd>${esc(it.build)}</dd><dt>DATA</dt><dd>${esc(it.data)}</dd><dt>MEASURE</dt><dd>${esc(it.measure)}</dd></dl>
    ${st}
    ${go}
  </article>`;
  };
  const next = LABS.weeks.slice(wi + 1).map((w) => `<div><b>WEEK OF ${esc(fmtD(w.start).toUpperCase())}</b><i>${esc(w.theme)}</i><ul>${w.items.map((it) => `<li>${esc(it.name)}</li>`).join('')}</ul></div>`).join('');
  const past = LABS.weeks.slice(0, wi).map((w) => `<div><b>WEEK OF ${esc(fmtD(w.start).toUpperCase())}</b><i>${esc(w.theme)}</i><ul>${w.items.map((it) => `<li>${esc(it.name)}</li>`).join('')}</ul></div>`).join('');
  const shipped = LABS.shipped.map(([h, l]) => `<a href="${esc(ctx.href(h))}">${esc(l)}</a>`).join(' · ');

  // Tip #271: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const weekQ = 'What is on the bench this week?';
  const nextQ = 'What is coming up on the bench?';
  const pastQ = 'What were earlier weeks?';
  const rulesQ = 'What are the lab rules?';
  // FAQ answers restate lede / lab rules / feedback copy only (FINDABILITY §3.3).
  // Refuse: SI-arrival date, labs-as-index-input, doom-probability, stuffing.
  const faq = [
    [qTitle,
      `The research bench behind ${brand.NAME}. Every week we take four or five questions about superintelligence that nobody is measuring well, find open data that can answer them, and build the instrument in public. Each experiment says what it counts and where the numbers come from. None of them is a forecast. This week: ${wk.theme}.`],
    [weekQ,
      `This week’s theme is “${wk.theme}”. ${wk.items.length} experiments are on the bench: ${wk.items.map((i) => i.name).join(', ')}.`],
    [nextQ,
      'Later weeks stay queued with their themes and experiment names until their start date; nothing ships as a forecast.'],
    [pastQ,
      'Earlier weeks stay listed with their themes and experiment names so the bench history is checkable.'],
    [rulesQ,
      'Open data only (every number from a public source we link to), show the method (each instrument publishes its rules so anyone can recompute it), count don’t predict, and ship or say why (an experiment either becomes a live room on SIREN or gets a note on why the data wasn’t good enough).'],
    ['Does Labs say when superintelligence arrives?',
      'Count, don’t predict. We measure what is happening. We don’t say when SI arrives.'],
    [`Is ${brand.NAME} Labs a doom probability?`,
      `No. ${brand.NAME} Labs builds open-data instruments. The experiments count what is measurable; they are not a probability of harm, and they do not set the ${brand.NAME} level.`],
    // Tip #365: experiment-card H3s are question-shaped and mirrored in FAQ (§3.3).
    ...wk.items.map((it) => [it.q, `${it.name}: ${it.measure}`]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');

  const main = `${CSS}<section class="lb">
  <p class="eyebrow">SIREN LABS · WEEK ${wkNo}</p>
  <h1 class="bp__h1">${esc(qTitle)}</h1>
  <p class="lede">The research bench behind ${esc(brand.NAME)}. Every week we take four or five questions about superintelligence that nobody is measuring well, find open data that can answer them, and build the instrument in public. Each experiment says what it counts and where the numbers come from. None of them is a forecast.</p>
  <div class="lb-wk"><h2 id="week">${esc(weekQ)}</h2><span>${esc(wk.theme)} · WEEK OF ${esc(fmtD(wk.start).toUpperCase())} · ${wk.items.length} EXPERIMENTS</span></div>
  <div class="lb-g">${wk.items.map((it, i) => card(it, i + 1)).join('')}</div>
  ${next ? `<h2 id="next" style="margin-top:28px">${esc(nextQ)}</h2><div class="lb-next">${next}</div>` : ''}
  ${past ? `<h2 id="past" style="margin-top:28px">${esc(pastQ)}</h2><div class="lb-next">${past}</div>` : ''}
  <h2 id="rules" style="margin-top:28px">${esc(rulesQ)}</h2>
  <div class="lb-rules">
    <div><b>Open data only</b>Every number comes from a public source we link to.</div>
    <div><b>Show the method</b>Each instrument publishes its rules so anyone can recompute it.</div>
    <div><b>Count, don’t predict</b>We measure what is happening. We don’t say when SI arrives.</div>
    <div><b>Ship or say why</b>An experiment either becomes a live room on ${esc(brand.NAME)} or gets a note on why the data wasn’t good enough.</div>
  </div>
  <p style="margin-top:18px"><b>Already shipped from the bench:</b> ${shipped}</p>
  <p>Got a question we should measure? <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a> Agents can read the plan as <a href="${esc(ctx.href('/api/labs.json'))}">JSON</a>.</p>
  <section class="lb-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="lb-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/si-watch.html'))}">What AI autonomy signals is ${esc(brand.NAME)} watching?</a>
      · <a href="${esc(ctx.href('/feedback.html'))}">How do I report a problem or send an idea to ${esc(brand.NAME)}?</a>.</p>
  </section>
</section>`;
  const description = `${qTitle} ${brand.NAME} Labs builds new open-data instruments each week. This week: ${wk.theme}. ${wk.items.map((i) => i.name).join(', ')}.`;
  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: qTitle,
        description: `${brand.NAME} Labs: weekly open-data experiments. This week’s theme: ${wk.theme}. Count what is measurable; none is a forecast.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
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
    main,
  });
}

/** The plan as published JSON. */
export function labsJson(nowMs = Date.now()) {
  const wi = currentWeek(nowMs);
  return JSON.stringify({ schema: 1, generated_at: new Date(nowMs).toISOString(), current_week: wi + 1, ...LABS }, null, 1) + '\n';
}
