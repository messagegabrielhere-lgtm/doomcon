import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agents, skillMd } from './agentPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('agents page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = agents(ctx, null);
    assert.match(html, /<title>How should AI agents use SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">How should AI agents use SIREN\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /id="start"[^>]*>Where should an agent start\?/);
    assert.match(html, /id="tell"[^>]*>What should you tell your agent\?/);
    assert.match(html, /id="moltbook"[^>]*>Can agents post the reading on Moltbook\?/);
    assert.match(html, /id="spotlight"[^>]*>Which agents are in the Moltbook spotlight\?/);
    assert.match(html, /id="rules"[^>]*>What are the rules for citing SIREN\?/);
    assert.match(html, /Where should an agent start\?/);
    assert.match(html, /Should AI agents scrape Google to learn where SIREN ranks\?/);
    assert.match(html, /<h3>How do you run the agent kit\?<\/h3>/);
    assert.match(html, /<h3>How do you use SIREN in ChatGPT, Grok or another assistant\?<\/h3>/);
    assert.match(html, /FAQPage[\s\S]*How do you run the agent kit\?/);
    assert.match(html, /FAQPage[\s\S]*How do you use SIREN in ChatGPT, Grok or another assistant\?/);
    assert.match(html, /<h3>What is agents\.md\?<\/h3>/);
    assert.match(html, /<h3>What is agents\.txt\?<\/h3>/);
    assert.match(html, /<h3>What is skill\.md\?<\/h3>/);
    assert.match(html, /<h3>What is llms\.txt\?<\/h3>/);
    assert.match(html, /<h3>What is the api-catalog\?<\/h3>/);
    assert.match(html, /<h3>What is api\/state\.json\?<\/h3>/);
    assert.match(html, /<h3>What is the agent-kit\?<\/h3>/);
    assert.match(html, /FAQPage[\s\S]*What is agents\.md\?/);
    assert.match(html, /FAQPage[\s\S]*What is the agent-kit\?/);
    assert.doesNotMatch(html, /<h3>agents\.md<\/h3>/);
    assert.doesNotMatch(html, /<h3>skill\.md<\/h3>/);
    assert.doesNotMatch(html, /<h3>llms\.txt<\/h3>/);
    assert.doesNotMatch(html, /<h3>agent-kit<\/h3>/);
    assert.doesNotMatch(html, /<h3>Run the agent kit<\/h3>/);
    assert.doesNotMatch(html, /<h3>Use SIREN in ChatGPT, Grok or another assistant<\/h3>/);
    assert.match(html, /Scraped Google result pages can look complete/);
    assert.match(html, /What are the rules for citing SIREN\?/);
    assert.match(html, /Can agents post the reading on Moltbook\?/);
    assert.match(html, /Do not scrape Google Search to learn the reading/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/careers\.html/);
    assert.match(html, /\/moltbook\.html/);
    assert.match(html, /\/moves\//);
    assert.match(html, /What jobs is SIREN hiring AIs for\?/);
    assert.match(html, /What are AI agents saying on Moltbook\?/);
    assert.match(html, /Where are the SIREN index moves\?/);
    assert.match(html, /not a probability of harm/);
    // FINDABILITY #437 — dual unbranded head terms on machine-endpoints list.
    assert.match(html, /AI activity index today · AI activity level today/);
    assert.match(html, /\/ai-activity-index\.html/);
    assert.match(html, /\/ai-activity-level\.html/);
    assert.doesNotMatch(html, /<h2>Start here<\/h2>/);
    assert.doesNotMatch(html, /<h2>Tell your agent<\/h2>/);
    assert.doesNotMatch(html, /<h2>On Moltbook<\/h2>/);
    assert.doesNotMatch(html, /<h2>Rules for agents<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /agents[- ]as[- ]doom|probability of doom/i);
    assert.doesNotMatch(html, /scrape everything|noindex/i);
  });

  it('spotlight agent-card H3s use questions mirrored in FAQPage', () => {
    const html = agents(ctx, {
      generated_at: '2026-10-14T09:00:00Z',
      posts: [{ title: 'Hello', url: 'https://www.moltbook.com/p/1', agent: 'CanaryBot', votes: 3 }],
      agents: [
        { agent: 'CanaryBot', agent_url: 'https://www.moltbook.com/u/canary', posts: 2, votes: 5 },
        { agent: 'DeskClerk', agent_url: 'https://www.moltbook.com/u/desk', posts: 1, votes: 1 },
      ],
    });
    assert.match(html, /<h3>Who is CanaryBot on Moltbook\?<\/h3>/);
    assert.match(html, /<h3>Who is DeskClerk on Moltbook\?<\/h3>/);
    assert.match(html, /FAQPage[\s\S]*Who is CanaryBot on Moltbook\?/);
    assert.match(html, /FAQPage[\s\S]*Who is DeskClerk on Moltbook\?/);
    assert.doesNotMatch(html, /<h3>🤖 CanaryBot<\/h3>/);
    assert.doesNotMatch(html, /<h3>🤖 DeskClerk<\/h3>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});

describe('skill.md SEO', () => {
  it('cites day hubs + news-sitemap for today\'s scored stories', () => {
    const md = skillMd(ctx);
    assert.match(md, /## Today's scored stories/);
    assert.match(md, /https:\/\/siren\.watch\/now\.md/);
    assert.match(md, /https:\/\/siren\.watch\/news\.html/);
    assert.match(md, /https:\/\/siren\.watch\/news-sitemap\.xml/);
    assert.match(md, /\/news\/YYYY-MM-DD\.html/);
    assert.match(md, /Which AI stories did SIREN score on \{date\}\?/);
    assert.match(md, /Google News rolling sitemap/);
    assert.match(md, /News sitemap \(Google News\): https:\/\/siren\.watch\/news-sitemap\.xml/);
    assert.match(md, /Newsroom \+ day hubs: https:\/\/siren\.watch\/news\.html/);
    assert.match(md, /Do not invent a day doom score/);
    assert.match(md, /ai-2027\.com/);
    assert.match(md, /detailed AGI scenario/);
    assert.match(md, /## Search trends and prediction markets/);
    assert.match(md, /https:\/\/siren\.watch\/search-trends\.html/);
    assert.match(md, /https:\/\/siren\.watch\/api\/search-trends\.json/);
    assert.match(md, /https:\/\/siren\.watch\/ai-prediction-markets\.html/);
    assert.match(md, /watched for findability|watched, not scored/i);
    assert.match(md, /not a SIREN forecast/i);
    assert.match(md, /## Verify a reading \(free tool\)/);
    assert.match(md, /https:\/\/siren\.watch\/verify\.html/);
    assert.match(md, /https:\/\/siren\.watch\/free-tools\.html/);
    assert.match(md, /not edited after the fact/);
    // FINDABILITY #326 — skill.md lists the classic instrument panel.
    assert.match(md, /## Full instrument panel/);
    assert.match(md, /https:\/\/siren\.watch\/classic\.html/);
    assert.match(md, /Where is the full SIREN instrument panel\?/);
    assert.match(md, /Classic instrument panel: https:\/\/siren\.watch\/classic\.html/);
    // FINDABILITY #433 — dual head terms beside home aliases.
    assert.match(md, /AI activity index today · AI activity level today/);
    assert.doesNotMatch(md, /doom score:\s*\d/i);
    assert.doesNotMatch(md, /probability of doom/i);
  });
});
