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
    ['What is the AI activity level today?',
      `${today} The AI Siren Index measures how loud AI activity is across five pillars (${pillars}), not how dangerous it is. Open the homepage for the live dial, or /api/state.json for the machine-readable figure.`],
    ['What is SIREN, and what does the name stand for?',
      `${brand.NAME} is an hourly index of how much is happening in AI. SI is superintelligence and REN is Real-time Early Notice: a siren for the road to superintelligence. It counts public activity across five pillars (${pillars}), turns it into one score from 0 to 100, and reports a level from 5 (quietest) to 1 (loudest). It was called ${brand.FORMERLY} until October 2026; the method and the record are unchanged.`],
    ['Does SIREN say superintelligence is here, or coming?',
      `No. It does not detect superintelligence and it does not forecast it. It measures how loud AI activity is right now: releases, compute, headlines, rule-making and market prices. A loud reading means a lot is happening, and nothing more.`],
    ['Is there an AI doomsday clock I can verify?',
      `Most AI doomsday clocks are expert judgement. ${brand.NAME} is different: an hourly activity count from public data, with a receipt for every reading. The Bulletin's Doomsday Clock is not AI-specific. See /ai-doomsday-clock.html and /p-doom.html for the comparison.`],
    ['Is SIREN like DEFCON or the Doomsday Clock?',
      `It borrows DEFCON's grammar, a scale that counts down from 5 to 1. The difference is what sits behind the number. DEFCON is set by military command and the Doomsday Clock by a board's judgement; ${brand.NAME} is arithmetic over public data, and every reading is published with the inputs needed to recompute it. Sites that put DEFCON or Doomsday Clock in an AI title for traffic are brand hijack — see /vs/pizzint.html and /guide.html.`],
    ['Is SIREN an alternative to DoomBench, Skynet Countdown or PizzINT?',
      `Only if you want a recomputable activity count instead of a judgement-scored doom, timeline number, or DEFCON-shaped novelty page. DoomBench scores takeover evidence; Skynet Countdown estimates AGI dates and control-loss odds; PizzINT borrows DEFCON/Doomsday framing; ${brand.NAME} counts how loud AI activity is this hour. See /compare.html, /vs.html, /alternatives.html and /vs/pizzint.html for the side-by-side.`],
    ['Where are the AI leader and topic pages?',
      `${brand.NAME} publishes /people/ and /people.html for leaders with enough press coverage on the live wire or in the durable archive — headlines only, never invented quotations — /lab/ and /companies.html for labs that clear the story or race gate (no company doom score), /model/ and /models.html for model families (no model doom score), /pillar/ and /pillars.html for the five activity pillars (tempo readings and story counts only), /country/ and /countries.html for mapped datacentre countries (OpenStreetMap site counts only, not a national AI ranking), /source/ and /sources.html for feed adapters and /outlet/ and /outlets.html for publisher hosts that clear the story gate, and /tags/ hubs for topics such as agents, GPUs, chips, coding, evals, video, voice, reasoning models, AI IPOs, RAG, MCP, fine-tuning, quantization, distillation, agent memory, hallucination, prompt injection, mixture of experts, world models, AI copyright, diffusion models, embeddings, guardrails, context windows, AI search, multi-agent systems, deepfakes, small language models, AI for science, speculative decoding, KV cache, EU AI Act, autonomous vehicles, AI music, synthetic data, inference cost, preference data, reasoning traces, Claude Code, OpenRouter, Hugging Face, Blackwell, Ollama, MLX, computer use, vision-language models, foundation models, video generation, image generation, model merging, open-source AI, tool use, post-training, pre-training, zero-shot, in-context learning, tokenization, continual learning, sparsity, knowledge graphs, research agents, system prompts, AI infrastructure, robot learning, frontier models, small models, open models, generative AI, reasoning models, voice AI, conversational AI, audio generation, AI chips, AI regulation, Artificial Analysis, humanoid robots, transformers, self-attention, OpenAI Codex, reward models, reinforcement learning, vision-language-action, flow matching, text-to-image, imitation learning, locomotion, self-supervised learning, latent space, autoencoders, diffusion transformers, scaling laws, browser agents, watermarking, acquisitions, labor and healthcare when a needle clears five scored stories in the live window or archive. The /guides.html hub (with /guides.md) lists evergreen explainers. Older scored stories stay on /item/archive.html after they leave the live newsroom. Thin days and quiet roster rows stay off those indexes.`],
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
    ['/vs/pizzint.html', `${n} vs PizzINT: which should you use?`],
    ['/ai-doomsday-clock.html', 'Is there an AI doomsday clock?'],
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
  <h2 class="sec__h" id="faq-h">Questions people ask</h2>
  <div class="faq__l">
${qa.map(([q, a]) => `    <details class="faq__i"><summary class="faq__q">${esc(q)}</summary><p class="faq__a">${linkifyAnswer(ctx, a)}</p></details>`).join('\n')}
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/guide.html'))}">How does SIREN compare to DEFCON, the Doomsday Clock and p(doom)?</a>
     · <a href="${esc(ctx.href('/guides.html'))}">What are the AI explainers?</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a>
     · <a href="${esc(ctx.href('/vs.html'))}">Which AI indexes does SIREN contrast?</a>
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
