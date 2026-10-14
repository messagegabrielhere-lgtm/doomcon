import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  agentsTxt,
  agentsJson,
  apiCatalog,
  agentSkillsIndex,
  mcpServerCard,
  aiTxt,
  SKILL_ID,
  SKILL_PATH,
} from './agentDiscovery.mjs';

const url = (p) => `https://siren.watch${p}`;
const ctx = { url };

test('agents.txt announces Skills only (no fake HTTP MCP or A2A)', () => {
  const txt = agentsTxt(ctx);
  assert.match(txt, /^# agents\.txt/);
  assert.match(txt, /Standard: https:\/\/agents-txt\.com/);
  assert.match(txt, /JSON: https:\/\/siren\.watch\/agents\.json/);
  assert.match(txt, /Skills: https:\/\/siren\.watch\/skill\.md/);
  assert.ok(txt.includes(`Skills: https://siren.watch${SKILL_PATH}`));
  assert.match(txt, /Google News sitemap: https:\/\/siren\.watch\/news-sitemap\.xml/);
  assert.match(txt, /https:\/\/siren\.watch\/news\.html/);
  assert.doesNotMatch(txt, /^MCP:/m);
  assert.doesNotMatch(txt, /^A2A:/m);
  assert.doesNotMatch(txt, /^Protocols:/m);
});

test('agents.json matches the Skills announcement and carries the schema', () => {
  const j = agentsJson(ctx);
  assert.equal(j.$schema, 'https://agents-txt.com/schema/agents-json/v1.0.json');
  assert.equal(j.version, '1.0');
  assert.equal(j.site.url, 'https://siren.watch/');
  assert.equal(j.skills.length, 2);
  assert.ok(j.skills.every((s) => s.url.startsWith('https://siren.watch/')));
  assert.equal(j.mcp, undefined);
  assert.equal(j.a2a, undefined);
  assert.match(j.site.description, /not how bad it is/);
});

test('api-catalog is an RFC 9727 linkset pointing at the live surfaces', () => {
  const cat = apiCatalog(ctx);
  assert.ok(Array.isArray(cat.linkset));
  const items = cat.linkset[0].item.map((i) => i.href);
  for (const p of [
    '/openapi.json', '/api/state.json', '/api/now.txt', '/api/news.json', '/news-sitemap.xml', '/news.html',
    '/api/search-trends.json', '/search-trends.html', '/ai-prediction-markets.html',
    '/free-tools.html', '/verify.html',
    '/agents.md', '/agents.txt',
    '/skill.md', '/llms.txt', '/.well-known/mcp/server-card.json', '/.well-known/agent-skills/index.json',
  ]) {
    assert.ok(items.includes(`https://siren.watch${p}`), p);
  }
  assert.equal(cat.linkset[0].anchor, 'https://siren.watch/.well-known/api-catalog');
});

test('skills index digests the skill body and uses the packaged path', () => {
  const body = '---\nname: siren-ai-index\n---\n# test\n';
  const idx = agentSkillsIndex(ctx, body);
  assert.equal(idx.skills.length, 1);
  assert.equal(idx.skills[0].name, SKILL_ID);
  assert.equal(idx.skills[0].url, `https://siren.watch${SKILL_PATH}`);
  const expect = `sha256:${createHash('sha256').update(body, 'utf8').digest('hex')}`;
  assert.equal(idx.skills[0].digest, expect);
});

test('MCP server card documents stdio transport and the tool names', () => {
  const card = mcpServerCard(ctx);
  assert.equal(card.transport.type, 'stdio');
  assert.equal(card.transport.command, 'node');
  assert.deepEqual(card.transport.args, ['agent-kit/mcp.mjs']);
  assert.ok(card.tools.some((t) => t.name === 'siren_now'));
  assert.ok(card.tools.some((t) => t.name === 'siren_cite'));
  assert.doesNotMatch(JSON.stringify(card), /streamable-http/);
  assert.match(card.description, /not a probability of harm/);
  assert.equal(card.related.news_sitemap, 'https://siren.watch/news-sitemap.xml');
  assert.equal(card.related.newsroom, 'https://siren.watch/news.html');
  assert.equal(card.related.news, 'https://siren.watch/api/news.json');
  assert.equal(card.related.search_trends, 'https://siren.watch/api/search-trends.json');
  assert.equal(card.related.search_trends_html, 'https://siren.watch/search-trends.html');
  assert.equal(card.related.ai_prediction_markets, 'https://siren.watch/ai-prediction-markets.html');
  assert.equal(card.related.free_tools, 'https://siren.watch/free-tools.html');
  assert.equal(card.related.verify, 'https://siren.watch/verify.html');
});

test('ai.txt points agents at the discovery stack', () => {
  const txt = aiTxt(ctx);
  assert.match(txt, /AI agents are welcome/);
  for (const p of [
    '/agents.md', '/agents.txt', '/skill.md', '/llms.txt', '/api/now.txt', '/.well-known/api-catalog',
    '/now.md', '/api/news.json', '/news-sitemap.xml', '/news.html',
    '/api/search-trends.json', '/search-trends.html', '/ai-prediction-markets.html',
    '/free-tools.html', '/verify.html',
  ]) {
    assert.ok(txt.includes(`https://siren.watch${p}`), p);
  }
  assert.match(txt, /Google News rolling sitemap/);
  assert.match(txt, /Which AI stories has SIREN scored in this window\?/);
  assert.match(txt, /Which Google Search Trends for AI does SIREN watch\?/);
  assert.match(txt, /Where are live AI prediction market odds\?/);
  assert.match(txt, /What free tools does SIREN publish\?/);
  assert.match(txt, /How do you check a SIREN reading yourself\?/);
  assert.match(txt, /not a probability of harm/);
});
