import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agents } from './agentPages.mjs';

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
    assert.match(html, /Questions people actually ask/);
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
    assert.doesNotMatch(html, /<h2>Start here<\/h2>/);
    assert.doesNotMatch(html, /<h2>Tell your agent<\/h2>/);
    assert.doesNotMatch(html, /<h2>On Moltbook<\/h2>/);
    assert.doesNotMatch(html, /<h2>Rules for agents<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /agents[- ]as[- ]doom|probability of doom/i);
    assert.doesNotMatch(html, /scrape everything|noindex/i);
  });
});
