import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeXml,
  parseTraffic,
  parseTrendsRss,
  matchHeadTerms,
  summariseGeo,
  collect,
  AI_QUERY_RE,
  HEAD_TERMS,
} from '../search-trends.mjs';

const SAMPLE = `<?xml version="1.0"?>
<rss><channel>
<title>Daily Search Trends</title>
<item>
  <title>chatgpt-5 release</title>
  <ht:approx_traffic>20,000+</ht:approx_traffic>
  <pubDate>Wed, 14 Oct 2026 09:20:00 -0700</pubDate>
  <ht:news_item>
    <ht:news_item_title>OpenAI&apos;s ChatGPT update</ht:news_item_title>
    <ht:news_item_url>https://example.com/a</ht:news_item_url>
    <ht:news_item_source>Example</ht:news_item_source>
  </ht:news_item>
</item>
<item>
  <title>weather nyc</title>
  <ht:approx_traffic>1000+</ht:approx_traffic>
  <pubDate>Wed, 14 Oct 2026 09:20:00 -0700</pubDate>
</item>
<item>
  <title>AI prediction markets today</title>
  <ht:approx_traffic>500+</ht:approx_traffic>
  <pubDate>Wed, 14 Oct 2026 09:20:00 -0700</pubDate>
</item>
</channel></rss>`;

test('decodeXml unescapes RSS entities', () => {
  assert.equal(decodeXml("OpenAI&apos;s ChatGPT"), "OpenAI's ChatGPT");
  assert.equal(decodeXml('A &amp; B'), 'A & B');
});

test('parseTraffic reads Google approx_traffic strings', () => {
  assert.equal(parseTraffic('20000+'), 20000);
  assert.equal(parseTraffic('20,000+'), 20000);
  assert.equal(parseTraffic('500+'), 500);
  assert.equal(parseTraffic(''), null);
});

test('parseTrendsRss extracts titles, traffic and AI flags', () => {
  const items = parseTrendsRss(SAMPLE);
  assert.equal(items.length, 3);
  assert.equal(items[0].title, 'chatgpt-5 release');
  assert.equal(items[0].traffic, 20000);
  assert.equal(items[0].ai_related, true);
  assert.equal(items[0].news[0].title, "OpenAI's ChatGPT update");
  assert.equal(items[1].ai_related, false);
  assert.equal(items[2].ai_related, true);
});

test('AI_QUERY_RE and HEAD_TERMS catch findability spikes', () => {
  assert.equal(AI_QUERY_RE.test('gemini 4 argon'), true);
  assert.equal(AI_QUERY_RE.test('liverpool vs como'), false);
  const hit = matchHeadTerms({ title: 'AI prediction markets today', news: [] });
  assert.ok(hit.includes('ai-prediction-markets'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'siren'));
  // FINDABILITY #137 — bare "mu" Trends title + Micron news routes to lab.
  const micron = matchHeadTerms({
    title: 'mu',
    news: [{ title: 'Micron Stock Falls Again as Memory-Chip Slump Persists' }],
  });
  assert.ok(micron.includes('micron'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'micron' && t.path === '/lab/micron.html'));
  // FINDABILITY #151 — DRAM / HBM / memory stock tape → same gated Micron lab.
  assert.ok(matchHeadTerms({ title: 'dram stock', news: [] }).includes('micron'));
  assert.ok(matchHeadTerms({ title: 'hbm stock', news: [] }).includes('micron'));
  assert.ok(matchHeadTerms({ title: 'memory stock', news: [] }).includes('micron'));
  assert.ok(matchHeadTerms({ title: 'micron stock', news: [] }).includes('micron'));
  // FINDABILITY #152 — IREN / Iris Energy Trends → gated Watts substrate page.
  assert.ok(matchHeadTerms({ title: 'iren stock', news: [] }).includes('iren'));
  assert.ok(matchHeadTerms({ title: 'Iris Energy', news: [] }).includes('iren'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'iren' && t.path === '/watts.html'));
  // FINDABILITY #155 — CoreWeave stock Trends → gated CoreWeave lab.
  assert.ok(matchHeadTerms({ title: 'coreweave stock', news: [] }).includes('coreweave'));
  assert.ok(matchHeadTerms({ title: 'CoreWeave', news: [] }).includes('coreweave'));
  // FINDABILITY #160 — debt / bond / borrowing phrases also hit the lab.
  assert.ok(matchHeadTerms({ title: 'coreweave debt', news: [] }).includes('coreweave'));
  assert.ok(matchHeadTerms({ title: 'CoreWeave bond yields near 15%', news: [] }).includes('coreweave'));
  // FINDABILITY #288 — bare CRWV ticker Trends → gated CoreWeave lab.
  assert.ok(matchHeadTerms({ title: 'CRWV stock', news: [] }).includes('coreweave'));
  assert.ok(matchHeadTerms({ title: 'CRWV', news: [] }).includes('coreweave'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'coreweave' && t.path === '/lab/coreweave.html' && /CRWV/.test(t.label)));
  // FINDABILITY #161 — nvidia / NVDA stock Trends → gated lab.
  assert.ok(matchHeadTerms({ title: 'nvidia stock', news: [] }).includes('nvidia'));
  assert.ok(matchHeadTerms({ title: 'NVDA stock', news: [] }).includes('nvidia'));
  assert.ok(matchHeadTerms({ title: 'NVDA', news: [] }).includes('nvidia'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'nvidia' && t.path === '/lab/nvidia.html'));
  // FINDABILITY #162 — OpenAI lawsuit / FTC / ChatGPT suits → gated OpenAI lab.
  assert.ok(matchHeadTerms({ title: 'openai lawsuit', news: [] }).includes('openai-lawsuit'));
  assert.ok(matchHeadTerms({ title: 'FTC probes OpenAI', news: [] }).includes('openai-lawsuit'));
  assert.ok(matchHeadTerms({ title: 'states sue OpenAI over ChatGPT', news: [] }).includes('openai-lawsuit'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'openai-lawsuit' && t.path === '/lab/openai.html'));
  // FINDABILITY #362 — Anthropic AI safety bill → gated Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Anthropic proposes AI safety bill with strict intervention thresholds', news: [] }).includes('anthropic-ai-safety-bill'));
  assert.ok(matchHeadTerms({ title: 'Anthropic said to pitch AI safety bill to US Congress', news: [] }).includes('anthropic-ai-safety-bill'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-ai-safety-bill' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'anthropic-ai-safety-bill').re.test('SpaceX to testify at NYC Council meeting on AI safety'), false);
  // FINDABILITY #368 — Anthropic Canadian / Nova Scotia data-centre Trends.
  assert.ok(matchHeadTerms({ title: 'Anthropic signs onto $10-billion Nova Scotia data centre project', news: [] }).includes('anthropic-canada-datacenter'));
  assert.ok(matchHeadTerms({ title: 'Anthropic signs lease for first Canadian data center', news: [] }).includes('anthropic-canada-datacenter'));
  assert.ok(matchHeadTerms({ title: "EverWind’s major data centre project in N.S. will power Anthropic’s Claude AI", news: [] }).includes('anthropic-canada-datacenter'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-canada-datacenter' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'anthropic-canada-datacenter').re.test('Nova Scotia lobster festival tourism boom'), false);
  // FINDABILITY #392 — Anthropic / METR evaluator-access Trends → Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Anthropic gives METR inside access to audit its AI models and safety practices', news: [] }).includes('anthropic-metr'));
  assert.ok(matchHeadTerms({ title: 'Anthropic grants non-profit METR employee-like access to monitor AI risks', news: [] }).includes('anthropic-metr'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-metr' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'anthropic-metr').re.test('METR publishes a generic blog about metrics'), false);
  // FINDABILITY #397 — Anthropic / Claude ECDSA curve-seed Trends → Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Anthropic Says Claude Traced NIST ECDSA Curve Seeds to a 1990S RNG', news: [] }).includes('anthropic-ecdsa'));
  assert.ok(matchHeadTerms({ title: 'Claude found the seeds for ECDSA beside a NIST curve reconstruction', news: [] }).includes('anthropic-ecdsa'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-ecdsa' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'anthropic-ecdsa').re.test('ECDSA is used in Bitcoin wallets'), false);
  // FINDABILITY #402 — Claude Opus 5.5 product Trends → Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Claude Opus 5.5 beats a human baseline and AI researchers move up their self improvement clock', news: [] }).includes('claude-opus-5-5'));
  assert.ok(matchHeadTerms({ title: 'Tips for Multiagent Work with Claude Opus 5.5', news: [] }).includes('claude-opus-5-5'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'claude-opus-5-5').re.test('The musical opus was published in 1855'), false);
  // FINDABILITY #420 — Claude Mythos 5 / quantum-circuit → Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Claude Mythos 5 designed quantum circuits that improve on the best published ones', news: [] }).includes('claude-mythos-5'));
  assert.ok(matchHeadTerms({ title: "Anthropic's Claude Improves Quantum Optimization Designs", news: [] }).includes('claude-mythos-5'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'claude-mythos-5' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'claude-mythos-5').re.test('Greek mythos in literature class'), false);
  // FINDABILITY #408 — Blackstone / Anthropic chip-financing Trends → Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Anthropic offers Blackstone double-digit yield in latest chip financing', news: [] }).includes('anthropic-blackstone'));
  assert.ok(matchHeadTerms({ title: 'FT: Anthropic offers Blackstone yields above 10% for GPU debt package', news: [] }).includes('anthropic-blackstone'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-blackstone' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'anthropic-blackstone').re.test('Blackstone buys Manhattan office tower'), false);
  // FINDABILITY #412 — Replit / Anthropic model-switch Trends → Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'Replit Dumps Anthropic for OpenAI, Citing Cost Pressures', news: [] }).includes('anthropic-replit'));
  assert.ok(matchHeadTerms({ title: 'Replit is no longer working with Anthropic, CEO says', news: [] }).includes('anthropic-replit'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-replit' && t.path === '/lab/anthropic.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'anthropic-replit').re.test('Replit ships a new IDE theme pack'), false);
  assert.ok(matchHeadTerms({ title: "Waymo’s robotaxis are headed to Canada", news: [] }).includes('waymo-canada'));
  assert.ok(matchHeadTerms({ title: 'Hello Toronto – Waymo Is En Route', news: [] }).includes('waymo-canada'));
  assert.ok(matchHeadTerms({ title: 'Waymo plans to launch its robotaxis in Toronto in 2028', news: [] }).includes('waymo-canada'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'waymo-canada' && t.path === '/lab/waymo.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'waymo-canada').re.test('Democrats Are Failing the Waymo Test'), false);
  // FINDABILITY #374 — SoftBank / Allied Universal → SoftBank lab.
  assert.ok(matchHeadTerms({ title: 'SoftBank weighs $18 billion acquisition of Allied Universal, source says', news: [] }).includes('softbank-allied'));
  assert.ok(matchHeadTerms({ title: 'SoftBank Is Said to Weigh Buying Top US Security Firm Allied', news: [] }).includes('softbank-allied'));
  assert.ok(matchHeadTerms({ title: 'Allied Universal sale talks draw SoftBank interest', news: [] }).includes('softbank-allied'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'softbank-allied' && t.path === '/lab/softbank.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'softbank-allied').re.test('SoftBank seeks $100B from Gulf investors to expand AI bet'), false);
  // FINDABILITY #376 — SpaceX / Starshield → SpaceX lab.
  assert.ok(matchHeadTerms({ title: 'Musk Comments Sow Confusion Over Ukraine Starshield Disruption', news: [] }).includes('spacex-starshield'));
  assert.ok(matchHeadTerms({ title: "Sources: Elon Musk approached Trump with the idea of slowing down Starshield in Ukraine", news: [] }).includes('spacex-starshield'));
  assert.ok(matchHeadTerms({ title: "Two US officials say the order to limit Ukraine's access to SpaceX's Starshield came from inside the White House", news: [] }).includes('spacex-starshield'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'spacex-starshield' && t.path === '/lab/spacex.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'spacex-starshield').re.test("SpaceX's 800 MHz spectrum grab threatens Big 3 mobile carriers more"), false);
  // FINDABILITY #163 — Anthropic IPO / FTC → gated Anthropic lab.
  assert.ok(matchHeadTerms({ title: 'anthropic ipo', news: [] }).includes('anthropic-ipo'));
  assert.ok(matchHeadTerms({ title: 'FTC probes Anthropic', news: [] }).includes('anthropic-ipo'));
  assert.ok(matchHeadTerms({ title: 'Anthropic subpoena ahead of IPO', news: [] }).includes('anthropic-ipo'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'anthropic-ipo' && t.path === '/lab/anthropic.html'));
  // FINDABILITY #164 — ASML / EUV AI chip-tool Trends → gated ASML lab.
  assert.ok(matchHeadTerms({ title: 'asml stock', news: [] }).includes('asml'));
  assert.ok(matchHeadTerms({ title: 'ASML', news: [] }).includes('asml'));
  assert.ok(matchHeadTerms({ title: 'ASML EUV tools for AI chips', news: [] }).includes('asml'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'asml' && t.path === '/lab/asml.html'));
  // FINDABILITY #165 — TSMC / AI foundry Trends → gated TSMC lab.
  assert.ok(matchHeadTerms({ title: 'tsmc stock', news: [] }).includes('tsmc'));
  assert.ok(matchHeadTerms({ title: 'TSMC', news: [] }).includes('tsmc'));
  assert.ok(matchHeadTerms({ title: 'Taiwan Semiconductor AI foundry', news: [] }).includes('tsmc'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'tsmc' && t.path === '/lab/tsmc.html'));
  // FINDABILITY #167 — Amazon Bee / wearable AI Trends → gated Amazon lab.
  assert.ok(matchHeadTerms({ title: 'Amazon Bee Frontier wearable', news: [] }).includes('amazon-bee'));
  assert.ok(matchHeadTerms({ title: 'Bee Eclipse Amazon AI', news: [] }).includes('amazon-bee'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'amazon-bee' && t.path === '/lab/amazon.html'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'meta-muse' && t.path === '/lab/meta.html'));
  assert.ok(HEAD_TERMS.find((t) => t.id === 'meta-muse').re.test('Meta Muse Spark Open'));
  assert.ok(HEAD_TERMS.find((t) => t.id === 'meta-muse').re.test('Muse Wonder frontier model'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'meta-muse').re.test('visit the museum'), false);
  // FINDABILITY #193 — Meta + Apple Mac AI titles without Muse still route to Meta lab.
  assert.ok(HEAD_TERMS.some((t) => t.id === 'meta-apple-mac' && t.path === '/lab/meta.html'));
  assert.ok(matchHeadTerms({ title: 'Apple and Meta Collaborate to Run a Massive AI Model Locally on Mac', news: [] }).includes('meta-apple-mac'));
  assert.ok(matchHeadTerms({ title: 'Meta and Apple team up to make Muse AI models run better on Macs', news: [] }).includes('meta-apple-mac'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'meta-apple-mac').re.test('Apple Intelligence China launch'), false);
  // FINDABILITY #170 — Apple Intelligence / on-device Apple AI → gated Apple lab.
  assert.ok(matchHeadTerms({ title: 'Apple Intelligence China launch', news: [] }).includes('apple-intelligence'));
  assert.ok(matchHeadTerms({ title: 'Apple on-device AI features expand', news: [] }).includes('apple-intelligence'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'apple-intelligence' && t.path === '/lab/apple.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'apple-intelligence').re.test('pineapple intelligence test'), false);
  // FINDABILITY #171 — Microsoft Copilot / Azure AI → gated Microsoft lab.
  assert.ok(matchHeadTerms({ title: 'Microsoft Copilot enterprise rollout', news: [] }).includes('microsoft-copilot'));
  assert.ok(matchHeadTerms({ title: 'GitHub Copilot agent mode', news: [] }).includes('microsoft-copilot'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'microsoft-copilot' && t.path === '/lab/microsoft.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'microsoft-copilot').re.test('helicopter pilot training'), false);
  // FINDABILITY #414 — Surface Laptop Ultra → same gated Microsoft lab.
  assert.ok(matchHeadTerms({ title: 'Surface Laptop Ultra review: a different kind of MacBook Pro', news: [] }).includes('microsoft-surface-ultra'));
  assert.ok(matchHeadTerms({ title: 'Running local AI models on Microsoft’s Surface Laptop Ultra', news: [] }).includes('microsoft-surface-ultra'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'microsoft-surface-ultra' && t.path === '/lab/microsoft.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'microsoft-surface-ultra').re.test('Surface Pro tablet keyboard'), false);
  // FINDABILITY #173 — Grok / xAI Trends → gated xAI lab.
  assert.ok(matchHeadTerms({ title: 'Grok Voice update from xAI', news: [] }).includes('xai-grok'));
  assert.ok(matchHeadTerms({ title: 'xAI ships new API tier', news: [] }).includes('xai-grok'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'xai-grok' && t.path === '/lab/xai.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'xai-grok').re.test('frog croak sounds'), false);
  // FINDABILITY #174/#187 — Gemini / Gemma / Argon Trends → gated DeepMind lab.
  assert.ok(matchHeadTerms({ title: 'Gemini 4 Argon reaches enterprises', news: [] }).includes('gemini'));
  assert.ok(matchHeadTerms({ title: 'Google Gemma 4 Open Models', news: [] }).includes('gemini'));
  assert.ok(matchHeadTerms({ title: 'Argon AI model worldwide launch', news: [] }).includes('gemini'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'gemini' && t.path === '/lab/google-deepmind.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'gemini').label, 'Gemini / Gemma / Argon');
  assert.equal(HEAD_TERMS.find((t) => t.id === 'gemini').re.test('gemstone jewelry sale'), false);
  // FINDABILITY #175 — Samsung / HBM / AI memory Trends → gated Samsung lab.
  assert.ok(matchHeadTerms({ title: 'Samsung stock slides on AI memory fears', news: [] }).includes('samsung'));
  assert.ok(matchHeadTerms({ title: 'Samsung HBM demand stays strong', news: [] }).includes('samsung'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'samsung' && t.path === '/lab/samsung.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'samsung').re.test('SK Hynix alone'), false);
  assert.equal(HEAD_TERMS.find((t) => t.id === 'samsung').re.test('sandwich shop menu'), false);
  // FINDABILITY #195 — Samsung AI glasses / XR titles → same gated lab.
  assert.ok(HEAD_TERMS.some((t) => t.id === 'samsung-glasses' && t.path === '/lab/samsung.html'));
  assert.ok(matchHeadTerms({ title: "Samsung's AI glasses make a bold bet against Meta", news: [] }).includes('samsung-glasses'));
  assert.ok(matchHeadTerms({ title: 'Galaxy glasses XR preview from Samsung', news: [] }).includes('samsung-glasses'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'samsung-glasses').re.test('reading glasses sale'), false);
  // FINDABILITY #183 — Palantir / AIP / government AI Trends → gated lab.
  assert.ok(matchHeadTerms({ title: 'Palantir and Sadiq Khan drop legal battle', news: [] }).includes('palantir'));
  assert.ok(matchHeadTerms({ title: 'EU messages run through Palantir software', news: [] }).includes('palantir'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'palantir' && t.path === '/lab/palantir.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'palantir').label, 'Palantir / AIP');
  assert.equal(HEAD_TERMS.find((t) => t.id === 'palantir').re.test('palatial gardens tour'), false);
  // FINDABILITY #406 — Ondas / Ondas-Palantir defense-AI JV → Palantir lab.
  assert.ok(matchHeadTerms({ title: 'RTX, AeroVironment And Ondas-Palantir Push Deeper Into Drone Defense And AI This Week', news: [] }).includes('ondas-palantir'));
  assert.ok(matchHeadTerms({ title: 'Stocktwits Defense Watch: RTX Continues Deal Momentum, Ondas-Palantir Launch AI Firm As AeroVironment Strike Four International Deals', news: [] }).includes('ondas-palantir'));
  assert.ok(matchHeadTerms({ title: 'Ondas Holdings expands defense AI autonomy stack', news: [] }).includes('ondas-palantir'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'ondas-palantir' && t.path === '/lab/palantir.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'ondas-palantir').re.test('AeroVironment Strike Four International Deals'), false);
  // FINDABILITY #184 — AMD / MI300 / Instinct Trends → gated lab.
  assert.ok(matchHeadTerms({ title: 'AMD Helion for Agentic AI and Enterprise', news: [] }).includes('amd'));
  assert.ok(matchHeadTerms({ title: 'AMD MI300X AI GPU demand', news: [] }).includes('amd'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'amd' && t.path === '/lab/amd.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'amd').label, 'AMD / MI300');
  assert.equal(HEAD_TERMS.find((t) => t.id === 'amd').re.test('demand for GPUs rises'), false);
  // FINDABILITY #185 — Tesla / FSD / Autopilot Trends → gated Tesla lab.
  assert.ok(HEAD_TERMS.some((t) => t.id === 'tesla' && t.path === '/lab/tesla.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'tesla').label, 'Tesla / FSD');
  assert.ok(HEAD_TERMS.find((t) => t.id === 'tesla').re.test('Tesla Autopilot FSD crash probe'));
  assert.ok(HEAD_TERMS.find((t) => t.id === 'tesla').re.test('FSD supervised robotaxi'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'tesla').re.test('airport autopilot training alone'), false);
  // FINDABILITY #378 — Tesla Flying Roadster → same gated Tesla lab.
  assert.ok(matchHeadTerms({ title: "Trump, Pichai and Even Altman Praise Tesla's Flying Roadster EV", news: [] }).includes('tesla-flying-roadster'));
  assert.ok(matchHeadTerms({ title: 'Five Big Questions About Tesla Flying Roadster thrusters', news: [] }).includes('tesla-flying-roadster'));
  assert.ok(matchHeadTerms({ title: 'Roadster flies with SpaceX thruster demo', news: [] }).includes('tesla-flying-roadster'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'tesla-flying-roadster' && t.path === '/lab/tesla.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'tesla-flying-roadster').re.test('Roadster deposit waitlist alone'), false);
  // FINDABILITY #208 — Roadster / flying-car related queries still route to Tesla lab.
  assert.ok(HEAD_TERMS.find((t) => t.id === 'tesla').re.test('Tesla Roadster flying car demo'));
  assert.ok(HEAD_TERMS.find((t) => t.id === 'tesla').re.test('Roadster arrives after Tesla deposits'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'tesla').re.test('roadster bicycle club alone'), false);
  // FINDABILITY #157 — neocloud / neoclouds Trends → gated tag hub.
  assert.ok(matchHeadTerms({ title: 'neocloud', news: [] }).includes('neocloud'));
  assert.ok(matchHeadTerms({
    title: 'iren stock',
    news: [{ title: 'AI Cloud Stocks Sink as Gartner Warns Most Neoclouds Won\'t Survive' }],
  }).includes('neocloud'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'neocloud' && t.path === '/tags/neoclouds.html'));
  // FINDABILITY #176 — Character.ai bankruptcy → gated chatbots tag.
  assert.ok(matchHeadTerms({ title: 'Character.ai Maker Files for Chapter 11 Bankruptcy', news: [] }).includes('character-ai'));
  assert.ok(matchHeadTerms({ title: 'Character AI bankruptcy documents', news: [] }).includes('character-ai'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'character-ai' && t.path === '/tags/chatbots.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'character-ai').re.test('characterizing high bandwidth flash'), false);
  // FINDABILITY #410 — CERT-In → gated agents tag.
  assert.ok(matchHeadTerms({ title: 'CERT-In warns AI agents accessed Indian firms’ live systems', news: [] }).includes('cert-in'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'cert-in' && t.path === '/tags/agents.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'cert-in').re.test('certain AI labs raise more capital'), false);
  // FINDABILITY #177 — Qwen / Alibaba open-weight Trends → gated Qwen lab.
  assert.ok(matchHeadTerms({ title: 'Muse Spark Open is Meta answer to Qwen', news: [] }).includes('qwen'));
  assert.ok(matchHeadTerms({ title: 'Alibaba Qwen open-weight release', news: [] }).includes('qwen'));
  assert.ok(matchHeadTerms({ title: 'Tongyi model update', news: [] }).includes('qwen'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'qwen' && t.path === '/lab/qwen.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'qwen').re.test('request for quotation'), false);
  // FINDABILITY #178 — Oracle / AI datacenter Trends → gated datacenters tag.
  assert.ok(matchHeadTerms({ title: 'Oracle Data Center Pipeline Fight', news: [] }).includes('oracle-datacenters'));
  assert.ok(matchHeadTerms({ title: 'Will an Oracle Downgrade Be the Next Shoe to Drop?', news: [] }).includes('oracle-datacenters'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'oracle-datacenters' && t.path === '/tags/datacenters.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'oracle-datacenters').re.test('oracular pronouncements'), false);
  // FINDABILITY #179 — DeepSeek outage Trends → gated DeepSeek lab.
  assert.ok(matchHeadTerms({ title: 'DeepSeek offers user refunds after suffering another major outage', news: [] }).includes('deepseek'));
  assert.ok(matchHeadTerms({ title: 'DeepSeek-R model update', news: [] }).includes('deepseek'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'deepseek' && t.path === '/lab/deepseek.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'deepseek').re.test('deep seeking treasure'), false);
  // FINDABILITY #418 — DeepSeek V4.1 Flash → same gated DeepSeek lab.
  assert.ok(matchHeadTerms({ title: 'DeepSeek-v4.1-Flash-1017 is here', news: [] }).includes('deepseek-v41-flash'));
  assert.ok(matchHeadTerms({ title: 'DeepSeek v4.1 flash on OpenCode pretty good', news: [] }).includes('deepseek-v41-flash'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'deepseek-v41-flash' && t.path === '/lab/deepseek.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'deepseek-v41-flash').re.test('DeepSeek outage refunds users'), false);
  // FINDABILITY #180 — Mistral / Timestral / CERN Flare → gated Mistral lab.
  assert.ok(matchHeadTerms({ title: 'Mistral Timestral', news: [] }).includes('mistral'));
  assert.ok(matchHeadTerms({ title: 'Introducing Timestral', news: [] }).includes('mistral'));
  assert.ok(matchHeadTerms({ title: 'CERN and Mistral partner to build Flare, a new AI model for physics', news: [] }).includes('mistral'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'mistral' && t.path === '/lab/mistral.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'mistral').re.test('Major Outage on Cloudflare'), false);
  // FINDABILITY #181 — OpenAI / ChatGPT outage / status → gated OpenAI lab.
  assert.ok(matchHeadTerms({ title: 'OpenAI status: Widespread feature degradation', news: [] }).includes('openai-outage'));
  assert.ok(matchHeadTerms({ title: 'ChatGPT outage hits API users', news: [] }).includes('openai-outage'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'openai-outage' && t.path === '/lab/openai.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'openai-outage').re.test('OpenAI ships a new model'), false);
  // FINDABILITY #191 — ChatGPT computer use / Chrome tab controls → gated OpenAI lab.
  assert.ok(matchHeadTerms({ title: 'OpenAI Brings Computer Use to Chrome With ChatGPT Tab Controls', news: [] }).includes('openai-chrome'));
  assert.ok(matchHeadTerms({ title: 'ChatGPT can peek at your Chrome tabs now', news: [] }).includes('openai-chrome'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'openai-chrome' && t.path === '/lab/openai.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'openai-chrome').re.test('OpenAI ships a new model'), false);
  // FINDABILITY #182 — Hugging Face hack / incident → gated Hugging Face tag.
  assert.ok(matchHeadTerms({ title: 'Reproducing the Hugging Face Incident, Part I', news: [] }).includes('huggingface'));
  assert.ok(matchHeadTerms({ title: 'Hugging Face hack under CA anti-hacking law', news: [] }).includes('huggingface'));
  assert.ok(HEAD_TERMS.some((t) => t.id === 'huggingface' && t.path === '/tags/huggingface.html'));
  assert.equal(HEAD_TERMS.find((t) => t.id === 'huggingface').re.test('hugging a tree'), false);
});

test('summariseGeo counts AI items and head-term hits', () => {
  const s = summariseGeo('US', parseTrendsRss(SAMPLE));
  assert.equal(s.total, 3);
  assert.equal(s.ai_related, 2);
  assert.equal(s.head_term_hits['ai-prediction-markets'].hit, true);
  assert.equal(s.head_term_hits.chatgpt.hit, true);
  assert.equal(s.head_term_hits.siren.hit, false);
});

test('collect merges geos and never invents trends on fetch failure', async () => {
  const xmlByUrl = {
    'https://trends.google.com/trending/rss?geo=US': SAMPLE,
    'https://trends.google.com/trending/rss?geo=GB': SAMPLE.replace('chatgpt-5 release', 'claude sonnet release'),
  };
  const snap = await collect({
    fetchTextFn: async (url) => {
      if (!xmlByUrl[url]) throw new Error(`unexpected ${url}`);
      return xmlByUrl[url];
    },
  });
  assert.equal(snap.ok, true);
  assert.equal(snap.geos.length, 2);
  assert.ok(snap.ai_related_total >= 2);
  assert.ok(snap.head_terms.some((t) => t.id === 'ai-prediction-markets' && t.trending));
  assert.ok(snap.note.includes('not scored'));
});

test('collect stays dark when every geo fails', async () => {
  const snap = await collect({
    fetchTextFn: async () => { throw new Error('HTTP 429'); },
  });
  assert.equal(snap.ok, false);
  assert.equal(snap.ai_related_total, 0);
  assert.ok(snap.geos.every((g) => g.ok === false));
});
