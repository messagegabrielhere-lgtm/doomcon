import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nowTxt, nowMd, llmsTxt, llmsFullTxt, agentsMd, topMover, topStories, mostCovered, citation, dispatchFeedUrl } from './agentText.mjs';
import { robots, AI_AGENTS, render as renderSitemap } from './sitemap.mjs';

const url = (p) => `https://siren.watch${p}`;
const state = {
  generated_at: '2026-10-09T19:07:12.000Z',
  score: 57.31,
  level: 4,
  level_name: 'ROUTINE',
  level_since: '2026-10-08T03:00:00.000Z',
  delta_from_previous: -0.4,
  degraded: false,
  receipt_id: '2026-10-09T19-07-12Z',
  pillars: [
    { id: 'capability', name: 'Capability', score: 68.9, sources_ok: 1, sources_total: 4, in_composite: true },
    { id: 'compute', name: 'Compute & Capital', score: 47.0, sources_ok: 1, sources_total: 3, in_composite: true },
    { id: 'markets', name: 'Markets', score: null, dark: true, sources_ok: 0, sources_total: 4, in_composite: false },
  ],
};
const history = [
  { t: '2026-10-09T18:07:00.000Z', pillars: { capability: 60, compute: 40 } },
  { t: '2026-10-09T19:02:00.000Z', pillars: { capability: 67.4, compute: 49.5, markets: null } },
  { t: '2026-10-09T19:07:12.000Z', pillars: { capability: 68.9, compute: 47.0 } },
];
const news = {
  generated_at: '2026-10-09T19:10:00.000Z',
  sources: [{ id: 'verge-ai', label: 'The Verge' }],
  items: Array.from({ length: 14 }, (_, i) => ({
    id: `i${i}`,
    source: i === 0 ? 'verge-ai' : 'hn',
    title: i === 0 ? 'Big [model] drop' : `Story ${i}`,
    url: i === 0 ? 'https://example.com/a_(b)' : `https://example.com/${i}`,
    published_at: `2026-10-09T1${i % 10}:00:00.000Z`,
    pillar: 'attention',
    score: i === 0 ? 90 : 10 + i,
  })),
};
const leaders = {
  leaders: [
    { name: 'A Person', org: 'Lab A', coverage: { count_7d: 12, saturated: false } },
    { name: 'B Person', org: 'Lab B', coverage: { count_7d: 100, saturated: true } },
    { name: 'C Person', org: 'Lab C', coverage: { state: 'dark' } },
  ],
};
const siSignals = {
  generated_at: '2026-10-09T19:05:00.000Z',
  agent_prs: { ok: true, total_24h: 516, by_agent: [{ name: 'Devin', prs_24h: 283 }, { name: 'Claude', prs_24h: 69 }] },
  frontier: { ok: true, models_total: 1078, models_90d: 32, newest: [{ model: 'M1', org: 'O1', date: '2026-09-30' }] },
  agi_forecast: { ok: false, error: 'token needed' },
  moltbook: { ok: true, agents_seen: 29, replies_seen: 110341 },
};

test('topMover compares against the previous observation, not the current one', () => {
  const m = topMover(state, history);
  assert.equal(m.id, 'compute');
  assert.ok(Math.abs(m.delta - -2.5) < 1e-9);
  assert.equal(m.prevAt, '2026-10-09T19:02:00.000Z');
  assert.equal(topMover(state, [history[2]]), null);
});

test('nowTxt is 3-6 plain lines with level, score, name, UTC time, meaning and URL', () => {
  const txt = nowTxt({ state, history, url });
  const lines = txt.trimEnd().split('\n');
  assert.ok(lines.length >= 3 && lines.length <= 6, `got ${lines.length} lines`);
  assert.match(lines[0], /^SIREN 4 · 57\.3\/100 · ROUTINE/);
  assert.match(txt, /Computed 2026-10-09 19:07 UTC/);
  assert.match(txt, /Top mover: Compute & Capital −2\.5 since the previous reading \(19:02 UTC\)/);
  assert.match(txt, /not a probability of harm and not a forecast/);
  assert.match(txt, /Free tools · verify · Search Trends · classic: https:\/\/siren\.watch\/free-tools\.html · https:\/\/siren\.watch\/verify\.html · https:\/\/siren\.watch\/search-trends\.html · short https:\/\/siren\.watch\/trends\.html · https:\/\/siren\.watch\/classic\.html/);
  assert.equal(lines[lines.length - 1], 'https://siren.watch/');
  assert.doesNotMatch(txt, /<|undefined|NaN/);
});

test('nowTxt omits the mover line when there is no earlier reading, and flags degraded', () => {
  const txt = nowTxt({ state: { ...state, degraded: true }, history: [], url });
  assert.doesNotMatch(txt, /Top mover/);
  assert.match(txt, /degraded/);
  assert.match(txt, /Free tools · verify · Search Trends · classic:/);
  assert.match(txt, /https:\/\/siren\.watch\/classic\.html/);
  assert.ok(txt.trimEnd().split('\n').length >= 3 && txt.trimEnd().split('\n').length <= 6);
});

test('topStories and mostCovered order strictly from the data', () => {
  const top = topStories(news, 10);
  assert.equal(top.length, 10);
  assert.equal(top[0].id, 'i0');
  assert.equal(top[1].id, 'i13');
  assert.deepEqual(mostCovered(leaders).map((l) => l.name), ['B Person', 'A Person']);
});

test('nowMd carries the reading, pillars, stories, leaders, Takeover Watch and citation', () => {
  const md = nowMd({ state, history, news, leaders, siSignals, url });
  assert.match(md, /^# SIREN: current reading/);
  assert.match(md, /Also: \[free tools\]\(https:\/\/siren\.watch\/free-tools\.html\) · \[verify a reading\]\(https:\/\/siren\.watch\/verify\.html\) · \[Search Trends\]\(https:\/\/siren\.watch\/search-trends\.html\) \(short alias https:\/\/siren\.watch\/trends\.html\) · \[news sitemap\]\(https:\/\/siren\.watch\/news-sitemap\.xml\) · \[classic instrument panel\]\(https:\/\/siren\.watch\/classic\.html\)\./);
  assert.match(md, /\| Compute & Capital \| 47\.0 \| 1\/3 \| yes \|/);
  assert.match(md, /\| Markets \| dark \| 0\/4 \| no \|/);
  assert.match(md, /1\. \[Big \\\[model\\\] drop\]\(https:\/\/example\.com\/a_%28b%29\) — The Verge · 2026-10-09 10:00 UTC · score 90\.0/);
  assert.equal((md.match(/^\d+\. \[/gm) || []).length, 10);
  assert.match(md, /- B Person \(Lab B\): 100\+ stories/);
  assert.doesNotMatch(md, /C Person/);
  assert.match(md, /516 pull requests/);
  assert.match(md, /Devin 283, Claude 69/);
  assert.doesNotMatch(md, /Metaculus/); // agi_forecast not ok -> left out
  assert.match(md, /"SIREN 4 · 57\.3\/100 at 19:07 UTC — siren\.watch"/);
  assert.match(md, /not a probability of harm/);
  assert.match(md, /api\/receipts\/2026-10-09T19-07-12Z\.json/);
  assert.doesNotMatch(md, /undefined|NaN/);
});

test('nowMd leaves out sections whose data is absent', () => {
  const md = nowMd({ state, history: [], url });
  assert.doesNotMatch(md, /Top 10 scored stories|Leaders most covered|Takeover Watch/);
  assert.match(md, /## How to cite/);
});

test('citation format', () => {
  assert.equal(citation(state, 'https://siren.watch/'), 'SIREN 4 · 57.3/100 at 19:07 UTC — siren.watch');
});

test('llms.txt follows the llmstxt.org shape and lists the endpoints', () => {
  const ctx = { url };
  const txt = llmsTxt(ctx);
  const lines = txt.split('\n');
  assert.match(lines[0], /^# SIREN/);
  assert.match(lines[2], /^> /);
  assert.ok(lines.length < 240, `${lines.length} lines`);
  for (const p of ['/api/now.txt', '/now.md', '/api/state.json', '/api/history.json', '/api/news.json', '/api/leaders.json',
    '/api/si-signals.json', '/api/search-index.json', '/api/fresh.json', '/api/health.json', '/api/receipts/', '/feed.xml', '/openapi.json',
    '/methodology.md', '/guide.md', '/guides.md', '/agents.md', '/AGENTS.md', '/agents.txt', '/.well-known/api-catalog', '/guides.html', '/free-tools.html', '/verify.html', '/compare.html', '/vs.html', '/alternatives.html',
    '/vs/pizzint.html', '/vs/skynet.html', '/vs/doom.html', '/vs/takeoff.html', '/pillars.html', '/sources.html', '/countries.html', '/news-sitemap.xml', '/news.html',
    '/search-trends.html', '/trends.html', '/ai-prediction-markets.html', '/api/search-trends.json',
    '/watts.html',
    '/p-doom.html', '/pdoom.html',
    '/ai-activity-index.html', '/ai-activity-level.html', '/classic.html',
    '/doombench.html', '/skynet-countdown.html', '/pizzint.html', '/takeofftracker.html',
    '/doomsday-clock.html', '/ai-doom.html', '/doom-index.html']) {
    assert.ok(txt.includes(`https://siren.watch${p}`), p);
  }
  assert.match(txt, /short alias https:\/\/siren\.watch\/trends\.html/);
  assert.match(txt, /short alias https:\/\/siren\.watch\/pdoom\.html/);
  assert.match(txt, /short aliases https:\/\/siren\.watch\/ai-activity-index\.html/);
  assert.match(txt, /https:\/\/siren\.watch\/ai-activity-level\.html/);
  // FINDABILITY #433 — contiguous level head term (not only the URL alias).
  assert.match(txt, /AI activity index today · AI activity level today/);
  assert.match(txt, /Where is the full SIREN instrument panel\?/);
  assert.match(txt, /root https:\/\/siren\.watch\/doombench\.html/);
  assert.match(txt, /short https:\/\/siren\.watch\/doomsday-clock\.html/);
  assert.match(txt, /short https:\/\/siren\.watch\/ai-doom\.html/);
  assert.match(txt, /short https:\/\/siren\.watch\/doom-index\.html/);
  assert.match(txt, /Which Google Search Trends for AI does SIREN watch\?/);
  assert.match(txt, /Where are live AI prediction market odds\?/);
  assert.match(txt, /Which AI stories has SIREN scored by UTC day\?/);
  assert.match(txt, /news-sitemap\.xml/);
  assert.ok(txt.includes(dispatchFeedUrl()));
  assert.match(dispatchFeedUrl(), /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/dispatch-data\/emergency\.json$/);
  assert.match(txt, /## Use SIREN with your human/);
  // FINDABILITY #153 — IREN / AI-cloud Trends route to Watts.
  assert.match(txt, /IREN stock, Iris Energy, or AI cloud \/ neocloud power Trends/);
  // FINDABILITY #154 — dram / Micron stock Trends route to Micron lab.
  assert.match(txt, /Micron stock, MU, dram stock, HBM stock, or memory stock Trends/);
  assert.match(txt, /\/lab\/micron\.html/);
  // FINDABILITY #155/#160/#288 — CoreWeave stock / CRWV / debt Trends route to CoreWeave lab.
  assert.match(txt, /CoreWeave stock, CRWV Trends, CoreWeave debt, bond yields/);
  assert.match(txt, /\/lab\/coreweave\.html/);
  assert.match(txt, /not credit analysis/);
  // FINDABILITY #161 — Nvidia / NVDA Trends route to Nvidia lab.
  assert.match(txt, /Nvidia stock, NVDA Trends, or AI GPU funding-cost Trends/);
  assert.match(txt, /\/lab\/nvidia\.html/);
  // FINDABILITY #162 — OpenAI lawsuit / FTC tape routes to OpenAI lab.
  assert.match(txt, /OpenAI lawsuit, FTC probe/);
  assert.match(txt, /\/lab\/openai\.html/);
  assert.match(txt, /not legal advice/);
  // FINDABILITY #181 — OpenAI / ChatGPT outage tape routes to OpenAI lab.
  assert.match(txt, /OpenAI outage, ChatGPT outage, OpenAI status/);
  // FINDABILITY #191 — ChatGPT Chrome / computer use tape routes to OpenAI lab.
  assert.match(txt, /ChatGPT computer use, ChatGPT Chrome tabs/);
  assert.match(txt, /not an uptime SLA/);
  // FINDABILITY #163 — Anthropic IPO / FTC tape routes to Anthropic lab.
  assert.match(txt, /Anthropic IPO, Anthropic FTC probe/);
  // FINDABILITY #362 — Anthropic AI safety bill tape routes to Anthropic lab.
  assert.match(txt, /Anthropic AI safety bill/);
  assert.match(txt, /\/lab\/anthropic\.html/);
  assert.match(txt, /not IPO advice/);
  // FINDABILITY #368 — Anthropic Canadian data-centre tape routes to Anthropic lab.
  assert.match(txt, /Anthropic Canadian data centre/);
  // FINDABILITY #392 — Anthropic METR evaluator tape routes to Anthropic lab.
  assert.match(txt, /Anthropic METR access/);
  assert.match(txt, /not an audit verdict/);
  // FINDABILITY #397 — Anthropic ECDSA curve-seed tape routes to Anthropic lab.
  assert.match(txt, /Anthropic ECDSA curve seeds/);
  // FINDABILITY #402 — Claude Opus 5.5 tape routes to Anthropic lab.
  assert.match(txt, /Claude Opus 5\.5/);
  assert.match(txt, /not a cryptography audit/);
  // FINDABILITY #408 — Blackstone Anthropic financing tape routes to Anthropic lab.
  assert.match(txt, /Blackstone Anthropic financing/);
  // FINDABILITY #412 — Replit Anthropic model-switch tape routes to Anthropic lab.
  assert.match(txt, /Replit dropping Anthropic for OpenAI/);
  // FINDABILITY #420 — Claude Mythos 5 tape routes to Anthropic lab.
  assert.match(txt, /Claude Mythos 5, Mythos 5/);
  assert.match(txt, /quantum-circuit design/);
  assert.match(txt, /not deal advice/);
  // FINDABILITY #372 — Waymo Canada / Toronto tape routes to Waymo lab.
  assert.match(txt, /Waymo Canada/);
  assert.match(txt, /\/lab\/waymo\.html/);
  // FINDABILITY #374 — SoftBank / Allied Universal tape routes to SoftBank lab.
  assert.match(txt, /Allied Universal/);
  assert.match(txt, /\/lab\/softbank\.html/);
  // FINDABILITY #406 — Ondas / Ondas-Palantir tape routes to Palantir lab.
  assert.match(txt, /Ondas/);
  assert.match(txt, /Ondas-Palantir|defense-AI/);
  assert.match(txt, /\/lab\/palantir\.html/);
  // FINDABILITY #376 — SpaceX / Starshield tape routes to SpaceX lab.
  assert.match(txt, /Starshield/);
  assert.match(txt, /\/lab\/spacex\.html/);
  assert.match(txt, /not a construction forecast/);
  // FINDABILITY #164 — ASML / EUV Trends route to ASML lab.
  assert.match(txt, /ASML, ASML stock, or EUV/);
  assert.match(txt, /\/lab\/asml\.html/);
  // FINDABILITY #165 — TSMC / AI foundry Trends route to TSMC lab.
  assert.match(txt, /TSMC, TSMC stock, or AI foundry/);
  assert.match(txt, /\/lab\/tsmc\.html/);
  // FINDABILITY #167 — Amazon Bee / wearables route to Amazon lab.
  assert.match(txt, /Amazon Bee, Bee Frontier, Bee Eclipse/);
  // FINDABILITY #169 — Meta Muse / open-weight route to Meta lab.
  assert.match(txt, /Meta Muse, Muse Spark, Muse Wonder/);
  // FINDABILITY #193 — Meta–Apple Mac AI partnership route to Meta lab.
  assert.match(txt, /Meta and Apple Mac AI partnerships, Muse on Mac Studio/);
  // FINDABILITY #170 — Apple Intelligence / on-device AI route to Apple lab.
  assert.match(txt, /Apple Intelligence, Apple on-device AI/);
  assert.match(txt, /\/lab\/apple\.html/);
  // FINDABILITY #171 — Microsoft Copilot / Azure AI route to Microsoft lab.
  assert.match(txt, /Microsoft Copilot, GitHub Copilot/);
  assert.match(txt, /\/lab\/microsoft\.html/);
  // FINDABILITY #220 — Microsoft MAI-Base / MoE route to same Microsoft lab.
  assert.match(txt, /Microsoft MAI-Base, MAI-Base-2/);
  // FINDABILITY #414 — Surface Laptop Ultra route to same Microsoft lab.
  assert.match(txt, /Surface Laptop Ultra, Microsoft AI laptops/);
  assert.match(txt, /\/lab\/microsoft\.html/);
  // FINDABILITY #173 — Grok / xAI route to xAI lab (contiguous seo-daily needle).
  assert.match(txt, /Grok \/ xAI, Grok Voice, xAI/);
  assert.match(txt, /\/lab\/xai\.html/);
  // FINDABILITY #174 — Gemini / Gemma route to DeepMind lab (contiguous needle).
  assert.match(txt, /Gemini \/ Gemma \/ Argon, Gemini 4 Argon/);
  assert.match(txt, /\/lab\/google-deepmind\.html/);
  // FINDABILITY #175 — Samsung / AI memory route to Samsung lab (contiguous needle).
  assert.match(txt, /Samsung \/ AI memory, Samsung stock, Samsung HBM/);
  assert.match(txt, /\/lab\/samsung\.html/);
  // FINDABILITY #195 — Samsung AI glasses route to same gated lab.
  assert.match(txt, /Samsung AI glasses, Galaxy glasses, Samsung XR/);
  assert.match(txt, /\/lab\/amazon\.html/);
  // FINDABILITY #157 — neocloud Trends route to Neoclouds tag.
  assert.match(txt, /neocloud or neoclouds Trends/);
  assert.match(txt, /\/tags\/neoclouds\.html/);
  // FINDABILITY #176 — Character.ai bankruptcy route to Chatbots tag.
  assert.match(txt, /Character\.ai bankruptcy, Character AI bankruptcy/);
  assert.match(txt, /\/tags\/chatbots\.html/);
  // FINDABILITY #410 — CERT-In route to Agents tag.
  assert.match(txt, /CERT-In, India AI-agent cyber incidents/);
  assert.match(txt, /\/tags\/agents\.html/);
  assert.match(txt, /not a security advisory/);
  // FINDABILITY #182 — Hugging Face hack / incident route to Hugging Face tag.
  assert.match(txt, /Hugging Face hack, Hugging Face incident/);
  assert.match(txt, /\/tags\/huggingface\.html/);
  assert.match(txt, /not a security advisory/);
  // FINDABILITY #177 — Qwen / Alibaba open-weight route to Qwen lab.
  assert.match(txt, /Qwen, Tongyi, Alibaba Qwen/);
  assert.match(txt, /\/lab\/qwen\.html/);
  // FINDABILITY #178 — Oracle / AI datacenter route to Datacenters tag.
  assert.match(txt, /Oracle datacenter, Oracle AI cloud/);
  assert.match(txt, /\/tags\/datacenters\.html/);
  // FINDABILITY #179 — DeepSeek outage route to DeepSeek lab.
  assert.match(txt, /DeepSeek outage, DeepSeek refunds/);
  assert.match(txt, /\/lab\/deepseek\.html/);
  // FINDABILITY #418 — DeepSeek V4.1 Flash route to same DeepSeek lab.
  assert.match(txt, /DeepSeek V4\.1 Flash, DeepSeek-v4\.1-Flash/);
  assert.match(txt, /\/lab\/deepseek\.html/);
  // FINDABILITY #180 — Mistral / Timestral route to Mistral lab.
  assert.match(txt, /Mistral, Timestral, CERN Flare/);
  assert.match(txt, /\/lab\/mistral\.html/);
  assert.match(txt, /not a stock tip/);
  // FINDABILITY #183 — Palantir / AIP route to Palantir lab (contiguous needle).
  assert.match(txt, /Palantir \/ AIP, Palantir Gotham/);
  assert.match(txt, /\/lab\/palantir\.html/);
  assert.match(txt, /not legal advice/);
  // FINDABILITY #184 — AMD / MI300 route to AMD lab (contiguous needle).
  assert.match(txt, /AMD \/ MI300, AMD Instinct/);
  assert.match(txt, /\/lab\/amd\.html/);
  assert.match(txt, /chip review/);
  // FINDABILITY #185 — Tesla / FSD route to Tesla lab (contiguous needle).
  assert.match(txt, /Tesla \/ FSD, Tesla Autopilot/);
  assert.match(txt, /\/lab\/tesla\.html/);
  // FINDABILITY #378 — Tesla Flying Roadster companion tip on same Tesla lab.
  assert.match(txt, /Tesla Flying Roadster/);
  assert.match(txt, /not a product review/);
  assert.match(txt, /crash verdict|safety advice/);
  assert.match(txt, /## Explainers \(search head terms\)/);
  assert.match(txt, /## Instruments/);
  assert.match(txt, /who is winning the model race/);
  assert.match(txt, /smartest, cheapest or fastest/);
  assert.match(txt, /artificialanalysis\.ai/);
  assert.match(txt, /## Complementary/);
  assert.match(txt, /ChatGPT \/ Grok/);
  assert.match(txt, /agent-kit/);
  assert.match(txt, /Do not scrape Google Search/);
  assert.match(txt, /\/moves\//);
  assert.doesNotMatch(txt, /@[a-z0-9-]+\.[a-z]/i, 'no email addresses');
  const full = llmsFullTxt(ctx, { state, history, url });
  assert.ok(full.startsWith(txt));
  assert.match(full, /# SIREN: current reading/);
});

test('agents.md is a short fetch-first entry for ChatGPT and Grok', () => {
  const md = agentsMd({ url });
  assert.match(md, /^# SIREN for AI agents/);
  assert.match(md, /ChatGPT, Grok/);
  // FINDABILITY #489 — first screen is a no-key GET, plus the uppercase path.
  assert.match(md, /## Use it \(no key\)/);
  assert.match(md, /GET https:\/\/siren\.watch\/api\/now\.txt/);
  assert.ok(md.includes('https://siren.watch/AGENTS.md'));
  for (const p of ['/api/now.txt', '/now.md', '/llms.txt', '/skill.md', '/agents.html', '/compare.html', '/agents.txt', '/news-sitemap.xml', '/news.html',
    '/search-trends.html', '/trends.html', '/ai-prediction-markets.html', '/watts.html', '/lab/micron.html', '/lab/coreweave.html',
    '/tags/neoclouds.html', '/tags/datacenters.html', '/lab/deepseek.html', '/lab/mistral.html', '/lab/palantir.html', '/lab/amd.html', '/lab/tesla.html',
    '/vs/doombench.html', '/vs/doom.html', '/vs/skynet-countdown.html', '/vs/skynet.html',
    '/vs/pdoom.html', '/vs/takeofftracker.html', '/vs/takeoff.html',
    '/p-doom.html', '/pdoom.html',
    '/ai-activity-index.html', '/ai-activity-level.html', '/classic.html',
    '/doombench.html', '/skynet-countdown.html', '/pizzint.html', '/takeofftracker.html',
    '/doomsday-clock.html', '/ai-doom.html', '/doom-index.html', '/ai-doomsday-clock.html']) {
    assert.ok(md.includes(`https://siren.watch${p}`), p);
  }
  assert.match(md, /short alias https:\/\/siren\.watch\/trends\.html/);
  assert.match(md, /short alias https:\/\/siren\.watch\/pdoom\.html/);
  assert.match(md, /short aliases https:\/\/siren\.watch\/ai-activity-index\.html/);
  assert.match(md, /https:\/\/siren\.watch\/ai-activity-level\.html/);
  // FINDABILITY #433 — contiguous level head term in agents.md Head-term pages.
  assert.match(md, /AI activity index today · AI activity level today/);
  assert.match(md, /Where is the full SIREN instrument panel\?/);
  assert.match(md, /root https:\/\/siren\.watch\/doombench\.html/);
  assert.match(md, /short https:\/\/siren\.watch\/doomsday-clock\.html/);
  assert.match(md, /short https:\/\/siren\.watch\/ai-doom\.html/);
  assert.match(md, /short https:\/\/siren\.watch\/doom-index\.html/);
  assert.match(md, /Which Google Search Trends for AI does SIREN watch\?/);
  assert.match(md, /Where are live AI prediction market odds\?/);
  // FINDABILITY #153 — agents.md lists Watts for IREN stock / AI cloud power Trends.
  assert.match(md, /IREN stock \/ AI cloud power Trends/);
  assert.match(md, /\/watts\.html/);
  // FINDABILITY #154 — agents.md lists Micron lab for dram stock Trends.
  assert.match(md, /dram stock \/ memory stock Trends/);
  assert.match(md, /\/lab\/micron\.html/);
  // FINDABILITY #155/#160 — agents.md lists CoreWeave lab for stock/debt Trends
  // (neocloud category stays on the Neoclouds tag line — FINDABILITY #157).
  assert.match(md, /CoreWeave stock \/ CRWV Trends \/ debt \/ bond Trends/);
  assert.match(md, /\/lab\/coreweave\.html/);
  assert.doesNotMatch(md, /CoreWeave stock \/ neocloud Trends/);
  // FINDABILITY #161 — agents.md lists Nvidia lab for NVDA Trends.
  assert.match(md, /Nvidia stock \/ NVDA Trends/);
  assert.match(md, /\/lab\/nvidia\.html/);
  // FINDABILITY #162 / #181 / #191 — agents.md lists OpenAI lab for lawsuit / outage / Chrome Trends.
  assert.match(md, /OpenAI lawsuit \/ FTC \/ OpenAI outage \/ ChatGPT Chrome Trends/);
  assert.match(md, /\/lab\/openai\.html/);
  // FINDABILITY #163 — agents.md lists Anthropic lab for IPO / FTC Trends.
  assert.match(md, /Anthropic IPO \/ FTC probe \/ AI safety bill \/ Canadian data centre \/ METR \/ ECDSA \/ Claude Opus 5\.5 \/ Blackstone \/ Replit \/ Claude Mythos 5 Trends/);
  assert.match(md, /Waymo Canada \/ Toronto robotaxi Trends/);
  assert.match(md, /SoftBank \/ Allied Universal Trends/);
  assert.match(md, /SpaceX \/ Starshield Trends/);
  assert.match(md, /\/lab\/anthropic\.html/);
  // FINDABILITY #164 — agents.md lists ASML lab for ASML stock / EUV Trends.
  assert.match(md, /ASML stock \/ EUV AI chip-tool Trends/);
  assert.match(md, /\/lab\/asml\.html/);
  // FINDABILITY #165 — agents.md lists TSMC lab for TSMC stock / foundry Trends.
  assert.match(md, /TSMC stock \/ AI foundry Trends/);
  assert.match(md, /\/lab\/tsmc\.html/);
  // FINDABILITY #167 — agents.md lists Amazon lab for Bee / wearables Trends.
  assert.match(md, /Amazon Bee \/ AI wearables Trends/);
  assert.match(md, /Meta Muse \/ open-weight AI \/ Meta and Apple Mac AI Trends/);
  // FINDABILITY #170 — agents.md lists Apple lab for Apple Intelligence Trends.
  assert.match(md, /Apple Intelligence Trends/);
  assert.match(md, /\/lab\/apple\.html/);
  // FINDABILITY #171 — agents.md lists Microsoft lab for Copilot Trends.
  assert.match(md, /Microsoft Copilot Trends/);
  assert.match(md, /\/lab\/microsoft\.html/);
  // FINDABILITY #220 — agents.md lists Microsoft lab for MAI-Base tape.
  assert.match(md, /Microsoft MAI-Base \/ MAI-Base-2 → Microsoft lab/);
  // FINDABILITY #414 — agents.md lists Microsoft lab for Surface Laptop Ultra tape.
  assert.match(md, /Surface Laptop Ultra Trends → Microsoft lab/);
  assert.match(md, /\/lab\/microsoft\.html/);
  // FINDABILITY #173 — agents.md lists xAI lab for Grok Trends.
  assert.match(md, /Grok \/ xAI Trends/);
  assert.match(md, /\/lab\/xai\.html/);
  // FINDABILITY #174 — agents.md lists DeepMind lab for Gemini / Gemma / Argon Trends.
  assert.match(md, /Gemini \/ Gemma \/ Argon Trends/);
  assert.match(md, /\/lab\/google-deepmind\.html/);
  // FINDABILITY #175/#195 — agents.md lists Samsung lab for AI memory + glasses Trends.
  assert.match(md, /Samsung \/ AI memory \/ Samsung AI glasses Trends/);
  assert.match(md, /\/lab\/samsung\.html/);
  assert.match(md, /\/lab\/amazon\.html/);
  // FINDABILITY #157 — agents.md lists Neoclouds tag for neocloud Trends.
  assert.match(md, /neocloud \/ neoclouds Trends/);
  assert.match(md, /\/tags\/neoclouds\.html/);
  // FINDABILITY #176 — agents.md lists Chatbots tag for Character.ai bankruptcy.
  assert.match(md, /Character\.ai bankruptcy/);
  assert.match(md, /\/tags\/chatbots\.html/);
  // FINDABILITY #410 — agents.md lists Agents tag for CERT-In Trends.
  assert.match(md, /CERT-In \/ India AI-agent cyber Trends/);
  assert.match(md, /\/tags\/agents\.html/);
  // FINDABILITY #182 — agents.md lists Hugging Face tag for hack / incident Trends.
  assert.match(md, /Hugging Face hack \/ incident Trends/);
  assert.match(md, /\/tags\/huggingface\.html/);
  // FINDABILITY #177 — agents.md lists Qwen lab for Alibaba open-weight Trends.
  assert.match(md, /Alibaba open-weight Trends/);
  assert.match(md, /\/lab\/qwen\.html/);
  // FINDABILITY #178 — agents.md lists Datacenters tag for Oracle Trends.
  assert.match(md, /Oracle datacenter \/ AI datacenter Trends/);
  assert.match(md, /\/tags\/datacenters\.html/);
  // FINDABILITY #179 — agents.md lists DeepSeek lab for outage Trends.
  assert.match(md, /DeepSeek outage \/ Chinese open-model Trends/);
  // FINDABILITY #418 — agents.md lists DeepSeek lab for V4.1 Flash tape.
  assert.match(md, /DeepSeek V4\.1 Flash Trends → DeepSeek lab/);
  assert.match(md, /\/lab\/deepseek\.html/);
  // FINDABILITY #180 — agents.md lists Mistral lab for Timestral Trends.
  assert.match(md, /Mistral \/ Timestral \/ CERN Flare Trends/);
  assert.match(md, /\/lab\/mistral\.html/);
  // FINDABILITY #183/#406 — agents.md lists Palantir lab for AIP / government AI / Ondas Trends.
  assert.match(md, /Palantir \/ AIP \/ government AI \/ Ondas Trends/);
  assert.match(md, /\/lab\/palantir\.html/);
  // FINDABILITY #184 — agents.md lists AMD lab for MI300 Trends.
  assert.match(md, /AMD \/ MI300 \/ Instinct AI GPU Trends/);
  assert.match(md, /\/lab\/amd\.html/);
  // FINDABILITY #185/#378 — agents.md lists Tesla lab for FSD / Autopilot /
  // Flying Roadster Trends.
  assert.match(md, /Tesla \/ FSD \/ Autopilot \/ Flying Roadster Trends/);
  assert.match(md, /\/lab\/tesla\.html/);
  assert.match(md, /not a prediction|Never call it a prediction/);
  assert.match(md, /Do not scrape Google Search/);
  assert.match(md, /\/moves\//);
  assert.match(md, /artificialanalysis\.ai/);
  assert.match(md, /agent-kit/);
  assert.match(md, /siren_now|cli\.mjs/);
  assert.match(md, /api-catalog|agents\.txt/);
  assert.match(md, /Google News rolling sitemap|YYYY-MM-DD/);
  assert.ok(md.split('\n').length < 120, `keep it short for assistants (got ${md.split('\n').length})`);
});

test('llms.txt lists newest UTC day hubs when the archive clears the gate', () => {
  const ctx = {
    url,
    news: { items: [] },
    itemArchive: Array.from({ length: 5 }, (_, i) => ({
      id: `d${i}`,
      title: `Day story ${i}`,
      published_at: '2026-10-12T12:00:00Z',
      source: 'hn',
      pillar: 'capability',
      score: 40,
    })),
  };
  const txt = llmsTxt(ctx);
  assert.match(txt, /Which AI stories did SIREN score on 2026-10-12\?/);
  assert.ok(txt.includes('https://siren.watch/news/2026-10-12.html'));
});

test('llms.txt lab lines use head-term aliases (FINDABILITY #138)', () => {
  // Enough Micron-titled stories to clear the entity-lab gate; label must be Micron / MU.
  const micronNews = {
    items: Array.from({ length: 5 }, (_, i) => ({
      id: `mu${i}`,
      title: `Micron memory chip story ${i}`,
      published_at: `2026-10-14T1${i}:00:00Z`,
      source: 'hn',
      pillar: 'compute',
      score: 50,
      entities: ['Micron'],
    })),
  };
  const ctx = {
    url,
    news: micronNews,
    race: {
      players: [
        { id: 'openai', name: 'OpenAI', market: { probability: 0.3 } },
        { id: 'google-deepmind', name: 'Google DeepMind', market: { probability: 0.2 } },
      ],
    },
  };
  const txt = llmsTxt(ctx);
  assert.match(txt, /What has SIREN scored about OpenAI \/ ChatGPT\?/);
  assert.match(txt, /What has SIREN scored about Google DeepMind \/ Gemini \/ Argon\?/);
  assert.match(txt, /What has SIREN scored about Micron \/ MU\?/);
  assert.ok(txt.includes('https://siren.watch/lab/micron.html'));
  assert.ok(txt.includes('https://siren.watch/lab/openai.html'));
});

test('robots.txt welcomes each AI agent by name and keeps the sitemaps', () => {
  const r = robots({ url });
  for (const a of AI_AGENTS) assert.match(r, new RegExp(`User-agent: ${a}\\nAllow: /`));
  assert.ok(AI_AGENTS.includes('ClaudeBot') && AI_AGENTS.includes('GPTBot') && AI_AGENTS.includes('MistralAI-User'));
  assert.ok(AI_AGENTS.includes('OAI-SearchBot') && AI_AGENTS.includes('GrokBot') && AI_AGENTS.includes('xAI-SearchBot'));
  assert.match(r, /https:\/\/siren\.watch\/llms\.txt/);
  assert.match(r, /https:\/\/siren\.watch\/agents\.md/);
  // FINDABILITY #489 — robots.txt names how to use the index.
  assert.match(r, /How to use \(no key\): GET https:\/\/siren\.watch\/api\/now\.txt/);
  assert.match(r, /how to cite https:\/\/siren\.watch\/skill\.md/);
  assert.match(r, /https:\/\/siren\.watch\/AGENTS\.md/);
  assert.match(r, /https:\/\/siren\.watch\/agents\.txt/);
  assert.match(r, /https:\/\/siren\.watch\/\.well-known\/api-catalog/);
  assert.match(r, /Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(r, /Verify a reading: https:\/\/siren\.watch\/verify\.html/);
  assert.match(r, /Search Trends \(watched, not scored\): https:\/\/siren\.watch\/search-trends\.html/);
  assert.match(r, /https:\/\/siren\.watch\/api\/search-trends\.json/);
  assert.match(r, /Classic instrument panel: https:\/\/siren\.watch\/classic\.html/);
  assert.match(r, /Sitemap: https:\/\/siren\.watch\/sitemap\.xml/);
  assert.match(r, /Sitemap: https:\/\/siren\.watch\/news-sitemap\.xml/);
  assert.doesNotMatch(r, /Disallow/);
});

test('sitemap.xml tip comments advertise free-tools, verify, news-sitemap, Search Trends, classic', () => {
  const xml = renderSitemap({
    url,
    state: { generated_at: '2026-10-15T00:00:00Z' },
    moves: [],
  });
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<!--[^>]*Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(xml, /<!--[^>]*Verify a reading: https:\/\/siren\.watch\/verify\.html/);
  assert.match(xml, /<!--[^>]*Google News sitemap: https:\/\/siren\.watch\/news-sitemap\.xml/);
  assert.match(xml, /<!--[^>]*Search Trends: https:\/\/siren\.watch\/search-trends\.html/);
  assert.match(xml, /<!--[^>]*Classic instrument panel: https:\/\/siren\.watch\/classic\.html/);
  assert.match(xml, /<!--[^>]*llms\.txt/);
  assert.match(xml, /not doom probability/i);
  assert.doesNotMatch(xml, /probability of doom/i);
});
