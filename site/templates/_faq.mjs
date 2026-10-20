// THE QUESTIONS A STRANGER ASKS, answered once and used twice: as a visible
// section on the home page and as FAQPage structured data, from the same
// array so the two cannot drift. Every answer is a statement the rest of the
// site already makes; the bands and pillar names are read from brand.mjs.

import { esc } from './_html.mjs';
import * as brand from '../brand.mjs';

export function items(ctx) {
  const bands = [...brand.LEVELS].sort((a, b) => b.level - a.level)
    .map((l) => `${l.level} ${l.name} (${l.band[0]}–${l.band[1]})`).join(', ');
  const pillars = brand.PILLARS.map((p) => p.name.toLowerCase()).join(', ');
  const state = ctx && ctx.state;
  const today = state && Number.isFinite(state.score) && Number.isFinite(state.level)
    ? `Right now ${brand.NAME} reads level ${state.level} (${state.level_name}), ${Number(state.score).toFixed(1)} of 100, as of the latest hourly reading.`
    : `${brand.NAME} publishes a fresh reading every hour.`;
  return [
    // FINDABILITY #254 — exact unbranded head-term FAQ (parallel to #126/#127).
    ['What is an AI activity index?',
      `An AI activity index is a live score of how much is happening in AI — releases, compute, headlines, rule-making and market prices — not how dangerous it is, and not a forecast. ${brand.NAME} is one: an hourly reading from 0 to 100 across five pillars (${pillars}), with open receipts. ${today} The homepage carries the live dial; /ai-activity-index.html is a short alias for the same page, and /api/state.json is the machine-readable figure.`],
    // FINDABILITY #284 — exact title head-term FAQ (“AI activity index today”
    // matches the live <title>; parallel to #254 definitional + #262 level-today).
    ['What is the AI activity index today?',
      `${today} The AI Siren Index measures how loud AI activity is across five pillars (${pillars}), not how dangerous it is. Open the homepage for the live dial; /ai-activity-index.html is a short alias for the same page, and /api/state.json is the machine-readable figure.`],
    ['What is the AI activity level today?',
      `${today} The AI Siren Index measures how loud AI activity is across five pillars (${pillars}), not how dangerous it is. Open the homepage for the live dial; /ai-activity-level.html is a short alias for the same page, and /api/state.json is the machine-readable figure.`],
    ['What is SIREN, and what does the name stand for?',
      `${brand.NAME} is an hourly index of how much is happening in AI. SI is superintelligence and REN is Real-time Early Notice: a siren for the road to superintelligence. It counts public activity across five pillars (${pillars}), turns it into one score from 0 to 100, and reports a level from 5 (quietest) to 1 (loudest). It was called ${brand.FORMERLY} until October 2026; the method and the record are unchanged.`],
    ['Does SIREN say superintelligence is here, or coming?',
      `No. It does not detect superintelligence and it does not forecast it. It measures how loud AI activity is right now: releases, compute, headlines, rule-making and market prices. A loud reading means a lot is happening, and nothing more.`],
    ['Is there an AI doomsday clock I can verify?',
      `Most AI doomsday clocks are expert judgement. ${brand.NAME} is different: an hourly activity count from public data, with a receipt for every reading. The Bulletin's Doomsday Clock is not AI-specific. See /ai-doomsday-clock.html and /p-doom.html for the comparison.`],
    ['Is SIREN like DEFCON or the Doomsday Clock?',
      `It borrows DEFCON's grammar, a scale that counts down from 5 to 1. The difference is what sits behind the number. DEFCON is set by military command and the Doomsday Clock by a board's judgement; ${brand.NAME} is arithmetic over public data, and every reading is published with the inputs needed to recompute it. Sites that put DEFCON or Doomsday Clock in an AI title for traffic are brand hijack — see /vs/pizzint.html and /guide.html.`],
    ['Is SIREN an alternative to DoomBench, Skynet Countdown or PizzINT?',
      // FINDABILITY #423 — link the DoomBench conquest page (not only PizzINT)
      // so home FAQ JSON-LD + visible FAQ push PageRank at the #1 “AI doom index” rival.
      // FINDABILITY #425 — also link Skynet Countdown (named in the question; home
      // every-room previously omitted it while listing DoomBench / PizzINT / Takeoff).
      `Only if you want a recomputable activity count instead of a judgement-scored doom, timeline number, or DEFCON-shaped novelty page. DoomBench scores takeover evidence; Skynet Countdown estimates AGI dates and control-loss odds; PizzINT borrows DEFCON/Doomsday framing; ${brand.NAME} counts how loud AI activity is this hour. See /compare.html, /vs.html, /alternatives.html, /vs/doombench.html, /vs/skynet-countdown.html and /vs/pizzint.html for the side-by-side.`],
    ['Where are the AI leader and topic pages?',
      `${brand.NAME} publishes /people/ and /people.html for leaders with enough press coverage on the live wire or in the durable archive — headlines only, never invented quotations — /lab/ and /companies.html for labs that clear the story or race gate (no company doom score), /model/ and /models.html for model families (no model doom score), /pillar/ and /pillars.html for the five activity pillars (tempo readings and story counts only), /country/ and /countries.html for mapped datacentre countries (OpenStreetMap site counts only, not a national AI ranking), /source/ and /sources.html for feed adapters and /outlet/ and /outlets.html for publisher hosts that clear the story gate, and /tags/ hubs for topics such as agents, GPUs, chips, coding, evals, video, voice, reasoning models, AI IPOs, RAG, MCP, fine-tuning, quantization, distillation, agent memory, hallucination, prompt injection, mixture of experts, world models, AI copyright, diffusion models, embeddings, guardrails, context windows, AI search, multi-agent systems, deepfakes, small language models, AI for science, speculative decoding, KV cache, EU AI Act, autonomous vehicles, AI music, synthetic data, inference cost, preference data, reasoning traces, Claude Code, OpenRouter, Hugging Face, Blackwell, Ollama, MLX, computer use, vision-language models, foundation models, video generation, image generation, model merging, open-source AI, tool use, post-training, pre-training, zero-shot, in-context learning, tokenization, continual learning, sparsity, knowledge graphs, research agents, system prompts, AI infrastructure, robot learning, frontier models, small models, open models, generative AI, reasoning models, voice AI, conversational AI, audio generation, AI chips, AI regulation, Artificial Analysis, humanoid robots, transformers, self-attention, OpenAI Codex, reward models, reinforcement learning, vision-language-action, flow matching, text-to-image, imitation learning, locomotion, self-supervised learning, latent space, autoencoders, diffusion transformers, scaling laws, browser agents, watermarking, acquisitions, labor, healthcare, agent skills, neoclouds, AI slop and Gulf AI investment when a needle clears five scored stories in the live window or archive. The /guides.html hub (with /guides.md) lists evergreen explainers. Older scored stories stay on /item/archive.html after they leave the live newsroom. Thin days and quiet roster rows stay off those indexes.`],
    ['Does a louder level mean AI is more dangerous?',
      `No. The level measures tempo: releases, compute, headlines, rule-making and market prices. A loud week means a lot happened. It says nothing about whether what happened was good or bad, and the site never sums harm and benefit into one figure.`],
    ['How is the level calculated, and how often?',
      `A collector runs every hour, scores each pillar against the index's own frozen record, and combines them into the composite. The level is the band the score falls in: ${bands}. The formulas and constants are on the methodology page.`],
    ['Can I check the number myself?',
      `Yes. Each reading ships with a receipt holding its inputs, its score and the hash of the receipt before it, and the state, history and receipts are open JSON. If a source did not report, the page says so and no value is filled in for it.`],
    ['Who runs SIREN, and how is it paid for?',
      `One person runs it. It is free. Visits are counted with Google Analytics and cookieless GoatCounter, both disclosed on the privacy page. The paid links are the Amazon links on the reading list and in the Bunker Kit's supplies crate, which are labelled; there is room for one named sponsor with no say over the number, and a donate link to the project's X account.`],
    ['How can I cite, embed or share it?',
      `The site's text and data are licensed ${brand.LICENSE}. There is an iframe embed and a README badge on the home page, a public JSON API, two RSS feeds, and a "Post on X" link on every card.`],
    ['Who is Tally, the duty canary?',
      `Tally is the duty canary, the mascot. The helmet is painted in the current level's colour and the face follows the level: asleep at 5, in full squawk at 1. Tally also keeps the unserious counts and runs the counting game.`],
    ['What is in the war room?',
      `Live panels on the homepage for the current reading: jobs and medicine, Tally’s bets, and other desks that refresh with each hourly observation. It is a jump board into those rooms, not a second index.`],
    ['What are the two questions everyone asks?',
      `Is AI taking jobs? and Is AI curing anything? — register counts with sources and caveats on /jobs.html and /medicine.html. The pictures on those cards are generated illustrations. The numbers are not.`],
    ['What changed since the last reading?',
      `The homepage strip and /digest.html compare the latest observation to the one before it: score delta, which pillars moved, and which sources flipped. A quiet strip means the dial held; it is not a forecast.`],
    [`How do you check a ${brand.NAME} reading yourself?`,
      `Every reading ships with a receipt of its inputs, score and the hash of the receipt before it. On the homepage, press the verify button: your browser fetches the public receipts, re-hashes them and walks the chain. Nothing is sent anywhere.`],
    ['Which stories are desk picks?',
      `Hand-picked headlines spotted in Reddit's AI communities. Each line is the publisher's own, linking to the original. Picks are not scored and do not move the index.`],
    ['What story is developing right now?',
      `When several independent outlets carry the same event in the newsroom window, the homepage groups them under one developing lead. The group does not move the index level; it is a corroboration view, not a risk claim.`],
    ['Which labs’ posts are on the X wire?',
      `Posts from frontier labs and AI accounts, found where Techmeme, Hacker News or the press cited them, and resolved through X's public embed endpoint. No API key and no scraping.`],
    ['Which frontier labs are monitored?',
      `The watch floor lists frontier labs with posture from visible public output only. A lab with no readable feed shows UNREAD, never QUIET. The full ranking lives on /race.html.`],
    ['Where is every dataset on one panel?',
      `The classic homepage desk switcher holds every live dataset already in the HTML — race, labs, X wire, power, digest and more — in one slot with no page load. It is a jump board, not a second index.`],
    ['Which readings are most recent?',
      `The classic homepage lists the newest scored observations with level, score and delta. Each row links to its move page and receipt. It is a log of tempo, not a forecast.`],
    ['Which AI leaders are on the record?',
      `The leader wire and /leaders.html show on-record lines from the press window, in the publishers' own words. No invented quotations. A quiet row means no matching line this window.`],
    ['Which items scored highest?',
      `The news reel highlights the highest-scoring stories in the current window. Scores measure activity fit against the frozen reference, not harm or benefit.`],
    ["What is today's signal?",
      `The classic signal reel is the day's highest-activity stories from the scored newsroom window, each with its pillar and score. Open /news.html for the full board.`],
    ['Which eight stories are newest?',
      `Inside the classic desk switcher, the Latest panel lists the eight newest scored stories by publication time. Membership is automated; nothing is hand-picked into that rail.`],
    [`How do you reuse this ${brand.NAME} reading?`,
      `The homepage reuse strip offers a README badge, an iframe embed, a plain-text citation and a copy-link control. No script, no key, and no tracking in the embed.`],
    ['Which scored stories sit on this reading?',
      `The homepage lists the highest-scoring stories in the current window, each on its own page, plus the newsroom, the charts, and level alerts. Scores rank items inside the window. They are not a probability of harm.`],
    ['Which AI bosses are on watch?',
      `The homepage bosses strip links to /leaders.html for people with enough on-record press this week. Portraits are generated illustrations, not photographs.`],
    ['Which labs are monitored on the home board?',
      `The homepage labs strip shows frontier labs with live prediction-market odds for best model in 2026. Odds are market prices, not a ${brand.NAME} forecast.`],
    ['What is in the newsroom?',
      `The classic desk switcher newsroom panel and /news.html list scored stories from the collection window, with pillars and corroboration. Scores measure activity fit, not harm.`],
    ['What is the signal feed?',
      `The classic homepage signal feed is the short list of scored stories under the reel. Ages are measured from the compile stamp printed beside LIVE.`],
    ['What is the score trend?',
      `The homepage trend card charts recent composite readings across 24h, 7d, 30d and all-history windows. It is a tempo log, not a forecast.`],
    ['What pillars are loud right now?',
      `The homepage loud card lists each activity pillar with its score or dark/calibrating state. Tap a pillar for sources and the percentile against the frozen reference.`],
    ['How is source health right now?',
      `The homepage health card states how many sources scored, are reporting without a baseline, or are down, and why a reading may be degraded.`],
    ['What moved this hour?',
      `The homepage moved card shows score and level deltas since the previous observation, plus pillar moves and top stories. Open /changelog.html for the full hour log.`],
    ['Which unconventional signals are watched?',
      `Raw hourly readings ${brand.NAME} collects but does not score yet, because none has a year of baseline. They cannot move the level.`],
    ['Which AI prediction markets are live?',
      `Polymarket legs and movers related to AI, linked from the homepage markets card and /race.html. Market prices are not a ${brand.NAME} forecast.`],
    ['What are AI agents saying?',
      `A sample of Moltbook posts from AI agents, shown on the homepage and /moltbook.html. Agent talk is not an input to the index score.`],
    ['What did Pelosi, Burry, Cathie Wood and Buffett disclose?',
      `The classic homepage markets block links Arena's investor filings card: 13F holdings, ARK's daily trades and House trade reports, from the filings. Filings are delayed — up to 45 days after a trade or a quarter. Not financial advice.`],
    ['Which AI models are trading paper money?',
      `The classic homepage markets block links Arena's AI battle: crypto and US stocks at live prices, with a server checking every trade against fixed rules. Prices are real; fills and wallets are simulated. Not an input to the ${brand.NAME} index.`],
    ['What is measured?',
      `On /jobs.html and /medicine.html, each register entry states what is counted — the figure, unit and source date — not a forecast.`],
    ['What gets claimed?',
      `On /jobs.html and /medicine.html, each entry states what the source claims. Claims are not the same as verified outcomes.`],
    ['What is the caveat?',
      `On /jobs.html and /medicine.html, each entry states the caveat that keeps the figure from being read as a ${brand.NAME} forecast or doom probability.`],
    ['What belongs in a storm kit?',
      `On /waffle.html, paid Amazon links for storm-kit staples are labelled as such and never change a number. Ready.gov’s full kit list is free; /bunker-kit.html lists free tools.`],
    ['What is the cautionary tale, in full?',
      `On /history.html: the WHO pandemic scale measured geographic spread, not severity. A scale is read as whatever its name suggests — so ${brand.NAME} level names describe the instrument, not danger.`],
    ['How do you filter the scored list?',
      `On /news.html, filter controls above the scored-item list narrow by pillar, source or score. Filtering never invents items or changes a score.`],
    ['What does a blank reading mean?',
      `On /race.html, a blank mark means we looked and the channel did not answer. A printed zero is the only absence that is a measurement.`],
    ['How do you post this chart to 𝕏?',
      `On /charts.html, hit Post with image on any chart. On a phone the share sheet carries the picture and words; on a computer the picture is copied and X opens with your words.`],
    ['What is the Overpass query?',
      `On /world.html, the method section prints the Overpass query. Every figure on that page is arithmetic over the response.`],
    ['How was the join done?',
      `On /exploits.html, catalogue entries are joined to NVD records on cveID. Matched and unmatched counts are printed in the source section.`],
    ['How do you recompute it?',
      `On /exploits.html: two requests, no key. Fetch both feeds, join on cveID, subtract the UTC calendar dates.`],
    ['How was the harvest tiled?',
      `On /flock.html, a single US query times out, so the planet was tiled into seed boxes. Integrity checks compare count vs fetch.`],
    ['How many Waffle Houses are closed chain-wide right now?',
      `On /waffle.html when the locator answers: temporarily closed stores from Waffle House’s own locator, listed by state.`],
    ['Which nine gauges sit beside datacentre clusters?',
      `On /watts.html: nine USGS gauges beside named clusters, measured against each gauge’s long-run median — not datacentre draw.`],
    ['What is your readiness score?',
      `On /si-ready.html, the personal plan form prints a readiness percentage after you answer. It is a self-check, not a ${brand.NAME} index input.`],
    ['What is the rule on both sides?',
      `On /balance.html: one rule, applied to both harm and benefit word lists in the same pass. No net score across the two sides.`],
    ['What moved on the index?',
      `On /digest.html: composite and pillar moves since the previous observation, with level hold or change and the anti-flap rule that fired.`],
    ['What are the three source states?',
      `On /digest.html: live, dark, and awaiting baseline — kept apart so a missing baseline is never reported as an outage.`],
    ['What kinds of work are all agents doing?',
      `On /si-watch.html: newest coding-agent PRs sorted into kinds of work by title words. Watched, not scored into the ${brand.NAME} level.`],
    ['What does shape mean on this map?',
      `On /map.html and /world.html: shape is status, read from the OpenStreetMap tag on each pin.`],
    ['What does colour mean on this map?',
      `On /map.html: colour is the US Drought Monitor category in that county, also printed in words beside the ramp.`],
    ['What would move it?',
      `On the classic oven: the published gates as numbers beside the current reading. Nothing there says any of them is met.`],
    ['What is in the news about AI catastrophe, safety, and p(doom)?',
      `On /p-doom.html: catastrophe-risk headlines from the newsroom when present. ${brand.NAME} still does not publish a p(doom).`],
    ['How do you run the agent kit?',
      `On /agents.html: from a clone of the public repo, node agent-kit/cli.mjs now / cite / mcp.mjs — no install step.`],
    ['How do themes change by day?',
      `On /moltbook.html: a permanent daily record of what agents talk about, as theme counts by day.`],
    ['How do I email alerts with Blogtrottr?',
      `On /alerts.html: paste a feed URL into Blogtrottr for one email per new item. Your address goes to them, not to ${brand.NAME}.`],
    ['What badge works when iframes are stripped?',
      `On /export.html: the badge SVG for READMEs and newsletters that strip iframes, with HTML and Markdown snippets beside it.`],
    ['How do I download every reading as CSV?',
      `On /export.html: t, score, level, degraded, rule_fired and one column per pillar; opens in Excel, Sheets, pandas.`],
    ['Would other-language Wikipedia pageviews help?',
      `On /bias.html: same Wikimedia pageviews API the English series already uses, pointed at other-language editions. Same method, same receipts.`],
    ['What is agents.md?',
      `On /agents.html: short entry — what to fetch first for ChatGPT, Grok and other assistants.`],
    ['What did the scan at a given UTC time find?',
      `On /evolution.html: one entry per Reddit + Moltbook scan — the stories that made the desk and the agent posts that stood out.`],
    ['What does a Translator do?',
      `On /careers.html: render the daily reading and the level lines into Spanish, Portuguese, Hindi, Japanese and more, without changing a number.`],
    ['Why look at Wyoming for remote land?',
      `On /bug-out-land.html: fewest people per square mile in the lower 48, no state income tax, big parcels. Long, hard winters and a short growing season; water rights matter.`],
    ['What does the Work and skills area cover?',
      `On /si-ready.html: use an AI assistant for one real task every day for a month, and write down what it got wrong.`],
    ['How do I move toward the work AI is worst at?',
      `On /ai-proof-job.html: write down your week by task. Mark each one routine, judgment, people or hands-on.`],
    ['How many AI agents are writing code?',
      `On /si-watch.html: pull requests opened by AI coding agents’ own GitHub app accounts in the last 24 h.`],
    ['What does The Collector do?',
      `On /staff.html: reads 14 public sources and files raw readings with receipts.`],
    ['What are the agents shipping right now?',
      `On /si-watch.html: GitHub’s own cards for each agent pull request in the live sample.`],
    ["What are Tally's Bets?",
      `On /tally.html: daily forecasts about the index, scored in public.`],
    ['What is the latest on superintelligence?',
      `On /live-x.html: opens a live X search for superintelligence.`],
    ['Which posts are fast-rising?',
      `On /moltbook.html: standout lane from title keywords and engagement speed, not from reading intent.`],
    ['What is DoomBench?',
      `On /vs/doombench.html: rival side-card under What is each one? — public claim, measures, who sets it, and whether a stranger can recompute it.`],
    ['How much of the code that builds AI is now written by AI?',
      `On /labs.html: The Recursion Meter — a daily share of agent-authored PRs merged into core AI stacks, with a 30-day trend line.`],
    ['What is listed under LIVE INTEL?',
      `On /catalog.html: rooms and pages under the LIVE INTEL group in the catalog.`],
    ['What is the road to superintelligence from 1950 to 2056?',
      `On /videos.html: from Turing’s question to ChatGPT and AI Nobel prizes, then one plausible path to 2056. The future part is speculation, not a prediction.`],
    ['Which rooms and pages are in the catalog?',
      `On /catalog.html: the Rooms & pages type section of the site directory.`],
    ['What does Tally look like at SIREN 5?',
      `On /tally.html: Tally is asleep on the perch.`],
    ['What does SIREN FM play?',
      `On /radio.html: Dark synth whose tempo and tension follow the live level.`],
    ['What is Bloomberg Television streaming live?',
      `On /live.html: Markets and business, with the AI trade most days.`],
    ['Who is CanaryBot on Moltbook?',
      `On /agents.html: spotlight card — posts and votes from Moltbook agents, picked automatically.`],
    ['Who is on the record?',
      `On /leaders.html: at least one line in the window, from the press or from their own official feed.`],
    ['What does SIREN 5 · DORMANT mean?',
      `On /history.html: Needle at rest. The floor of the scale.`],
    ['What AI Spaces are live on X?',
      `On /live-x.html: (AI OR AGI OR superintelligence) filter:spaces. Join any that are live now.`],
    ['Who is OpenAI on X?',
      `On /live-x.html: @OpenAI.`],
    ['What is CISA Known Exploited Vulnerabilities catalogue?',
      `On /exploits.html: Gives: cveID, vendorProject, product, dateAdded, knownRansomwareCampaignUse.`],
    ['What does the BLISS Science pillar measure?',
      `On /bliss.html: AI methods showing up in other people’s fields.`],
    ['Which headlines matched Harm language?',
      `On /balance.html: headlines in the newsroom window that matched the Harm word list — a measured count, never a net against the other side.`],
    ['Who is OpenAI on the race board?',
      `On the home board: odds of best model in 2026 · Polymarket, with releases and mindshare bars.`],
    ['Which jurisdictions are ranked by mapped sites?',
      `On /map.html: every state in the contiguous frame, ranked by mapped sites. The states at the bottom with a zero are the point of this table.`],
    ['What does Watts see in Texas?',
      `On /watts.html: Dallas · Austin · San Antonio. Grid: ERCOT. What each of the three pillars can and cannot see there.`],
    ['What does the Capability pillar count?',
      `On /instruments.html and /classic.html: What shipped, and what got written down.`],
    ['What would move one stage hotter?',
      `On the oven: the published heating gates, as numbers beside the current reading. Nothing here says any of them is met.`],
    ['What does the Signal panel show?',
      `On /classic.html war room: the current reading on the 0–100 scale, its recent sparkline, and the move since the comparison point.`],
    ['How did OpenAI fare in this window?',
      `On /digest.html: items in window, share of corpus, and market position from Who is winning the AI race?.`],
    ['Which incident terms fired in this window?',
      'On /news.html: tier is the weight of the term that matched, not a judgement about the event — matched words are printed beside each item.'],
    ['What moves between collects?',
      'On /map.html: balancing authorities that publish a number without an account — the only figures that can differ from the previous collect.'],
    ['What was CISA actually cataloguing in the launch half-year?',
      'On /exploits.html: the backfill window shows how many KEV listings had CVE records older than two years — a filing decision, not an attack.'],
    ['How ready are you on Work and skills?',
      'On /si-ready.html after the quiz: use an AI assistant for one real task every day for a month, and write down what it got wrong.'],
    [`How do ${brand.NAME} and BLISS sit beside the beam?`,
      'On /balance.html: context only. Neither index feeds the beam.'],
    ['What can this page not say?',
      'On /balance.html: the honesty lines from the published files about the counts and the registers.'],
    ['Where do 28 named p(doom) estimates sit on one ladder?',
      'On /p-doom.html: each bar is one person’s publicly stated p(doom). SIREN does not publish a p(doom).'],
    ['What did the newsroom’s headlines carry?',
      'On /balance.html: the newsroom word-list counts that tilt the beam — never a net score across sides.'],
    ['Which headlines matched a word list?',
      'On /balance.html: newest-first matched headlines with the counted words marked.'],
    ['What documented results sit on both sides?',
      'On /balance.html: two registers of dated, sourced results, kept side by side.'],
    ['Which counters come from public registries?',
      'On /balance.html: counters published as each registry reports them — never paired across sides.'],
    ['Which rooms and pages matched?',
      'On /search.html: result-group heading when rooms and pages match the query.'],
    ['Which news stories matched?',
      'On /search.html: result-group heading when scored stories match the query.'],
    ['Which leaders matched?',
      'On /search.html: result-group heading when leaders match the query.'],
    ['Which questions matched?',
      'On /search.html: result-group heading when FAQ answers match the query.'],
    ['Which Bunker Kit tools matched?',
      'On /search.html: result-group heading when Bunker Kit tools match the query.'],
    ['When does the idea of AI risk arrive before the machines?',
      'On /history.html: every argument being had in 2026 was written down before anyone had the hardware to test it.'],
    ['Which precedent can nobody in AI stop citing?',
      'On /history.html: the 1974–75 recombinant-DNA moratorium and Asilomar meeting, measured against every AI governance proposal since.'],
    ['Where did the capability jumps land?',
      'On /history.html: five dates on which something that could not be done became something that had been done.'],
    ['What test did Turing propose instead of a definition?',
      'On /history.html: Turing’s 1950 imitation game — a test instead of a definition of machine intelligence.'],
    ['What is the pause letter?',
      'On /history.html: the Future of Life Institute’s March 2023 call for a six-month halt past GPT-4; no pause took place.'],
    ['Which frontier labs are the markets pricing by country?',
      'On /nations.html: how many of each country’s companies the market lists at all.'],
    ['How many data centres does OpenStreetMap map by country?',
      'On /nations.html: sites mapped by OpenStreetMap volunteers — shown but not scored when mapping is sparse.'],
    [`Which ${brand.NAME} index moves were scored on a UTC day?`,
      'On /moves/: each day section lists scored observations for that UTC day with inputs and a hash-chained receipt.'],
    ['Is ChatGPT down right now?',
      'On /status.html: SIREN reads OpenAI’s official status page; UNKNOWN never means up.'],
    ['Is Claude down right now?',
      'On /status.html: SIREN reads Anthropic’s official status page; UNKNOWN never means up.'],
    ['How many AI-cited US job cuts has Challenger counted?',
      'On /jobs.html: announced US job cuts that cite AI, with sources and caveats — not a forecast.'],
    ['How many AI medical devices has the FDA authorised?',
      'On /medicine.html: count of AI/ML-enabled devices on the FDA list — authorisation is not a measured patient benefit.'],
  ];
}

/**
 * Published site paths that appear in FAQ prose → destination H1 questions
 * (FINDABILITY tip #252). Longer paths first so /item/archive.html wins over
 * a shorter /item/ stem if one is added later.
 */
export function faqPathLabels() {
  const n = brand.NAME;
  return [
    ['/item/archive.html', `Which older AI stories has ${n} kept in the archive?`],
    ['/vs/doombench.html', `${n} vs DoomBench: which should you use?`],
    // FINDABILITY #425 — longer /vs/skynet-countdown.html before any short /vs/skynet stem.
    ['/vs/skynet-countdown.html', `${n} vs Skynet Countdown: which should you use?`],
    ['/vs/pizzint.html', `${n} vs PizzINT: which should you use?`],
    ['/ai-doomsday-clock.html', 'Is there an AI doomsday clock?'],
    // FINDABILITY #254/#262/#284 — short aliases for home (canonical stays on /).
    ['/ai-activity-index.html', 'What is the AI activity index today?'],
    ['/ai-activity-level.html', 'What is the AI activity level today?'],
    ['/alternatives.html', 'What are AI doom index alternatives?'],
    ['/methodology.html', `How the ${n} AI activity index is computed · methodology`],
    ['/companies.html', `Which AI companies has ${n} scored stories about?`],
    ['/countries.html', `Which AI datacentre countries has ${n} mapped?`],
    ['/compare.html', 'Which AI doom indexes can you compare?'],
    ['/outlets.html', `Which AI outlets has ${n} scored stories from?`],
    ['/sources.html', `Which AI news sources has ${n} scored via?`],
    ['/pillars.html', `Which AI activity pillars has ${n} scored?`],
    ['/models.html', `Which AI models has ${n} scored stories about?`],
    ['/people.html', `Which AI people has ${n} scored press about?`],
    ['/guides.html', 'What are the AI explainers?'],
    ['/kinds.html', `Which AI story kinds has ${n} scored?`],
    ['/tags.html', `Which AI tags has ${n} scored stories about?`],
    ['/p-doom.html', 'What is p(doom)?'],
    ['/guide.html', `How does ${n} compare to DEFCON, the Doomsday Clock and p(doom)?`],
    ['/news.html', `Which AI stories has ${n} scored in this window?`],
    ['/vs.html', `Which AI indexes does ${n} contrast?`],
    ['/country/', `Which AI datacentre countries have ${n} pages?`],
    ['/outlet/', `Which AI publishers have ${n} pages?`],
    ['/source/', `Which AI feed adapters have ${n} pages?`],
    ['/pillar/', `Which AI activity pillars have ${n} pages?`],
    ['/people/', `Which AI leaders have press coverage pages on ${n}?`],
    ['/model/', `Which AI model families have ${n} pages?`],
    ['/kind/', `Which AI story kinds have ${n} pages?`],
    ['/tags/', `Which AI news tags have ${n} pages?`],
    ['/lab/', `Which AI labs have ${n} pages?`],
  ];
}

/** Turn published site paths in FAQ answers into crawlable internal links. */
export function linkifyAnswer(ctx, text) {
  const href = (path) => esc(ctx.href(path));
  const labels = faqPathLabels();
  const re = new RegExp(labels.map(([p]) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const byPath = new Map(labels);
  return esc(text).replace(re, (path) => {
    const label = byPath.get(path) || path;
    return `<a href="${href(path)}">${esc(label)}</a>`;
  });
}

export function render(ctx) {
  const qa = items(ctx);
  return `<section class="sec faq" id="faq" aria-labelledby="faq-h">
  <h2 class="sec__h" id="faq-h">What questions do people actually ask?</h2>
  <div class="faq__l">
${qa.map(([q, a]) => `    <details class="faq__i"><summary class="faq__q">${esc(q)}</summary><p class="faq__a">${linkifyAnswer(ctx, a)}</p></details>`).join('\n')}
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/guide.html'))}">How does SIREN compare to DEFCON, the Doomsday Clock and p(doom)?</a>
     · <a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a>
     · <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does SIREN contrast?</a>
     · <a href="${esc(ctx.href('/vs/doombench.html'))}">SIREN vs DoomBench: which should you use?</a>
     · <a href="${esc(ctx.href('/vs/skynet-countdown.html'))}">SIREN vs Skynet Countdown: which should you use?</a>
     · <a href="${esc(ctx.href('/vs/pizzint.html'))}">SIREN vs PizzINT: which should you use?</a>
     · <a href="${esc(ctx.href('/alternatives.html'))}">What are AI doom index alternatives?</a>
     · <a href="${esc(ctx.href('/people/'))}">Which AI leaders have press coverage pages on SIREN?</a>
     · <a href="${esc(ctx.href('/tags/'))}">Which AI news tags have SIREN pages?</a></p>
</section>`;
}

export function faqCss() {
  return `
.faq__l { display: grid; gap: 8px; max-width: 78ch; }
.faq__i { border: 1px solid var(--rule); border-radius: 8px; background: var(--bg-sunken); }
.faq__q { cursor: pointer; padding: 12px 14px; font: 600 var(--t-base)/1.35 var(--sans); color: var(--ink); }
.faq__i[open] > .faq__q { border-bottom: 1px solid var(--rule); }
.faq__a { margin: 0; padding: 12px 14px; font: 400 var(--t-base)/1.6 var(--sans); color: var(--ink-dim); }
`;
}

export function jsonLd(ctx) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items(ctx).map(([q, a]) => ({
      '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
