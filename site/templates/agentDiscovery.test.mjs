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
  // FINDABILITY #489 — uppercase path + cite pointer, still no fake MCP/A2A.
  assert.match(txt, /AGENTS\.md convention \(same body\): https:\/\/siren\.watch\/AGENTS\.md/);
  assert.match(txt, /How to cite: https:\/\/siren\.watch\/skill\.md/);
  assert.match(txt, /Skills: https:\/\/siren\.watch\/skill\.md/);
  assert.ok(txt.includes(`Skills: https://siren.watch${SKILL_PATH}`));
  assert.match(txt, /Google News sitemap: https:\/\/siren\.watch\/news-sitemap\.xml/);
  assert.match(txt, /https:\/\/siren\.watch\/news\.html/);
  assert.match(txt, /Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(txt, /Verify a reading: https:\/\/siren\.watch\/verify\.html/);
  assert.match(txt, /Search Trends \(watched, not scored\): https:\/\/siren\.watch\/search-trends\.html/);
  assert.match(txt, /https:\/\/siren\.watch\/api\/search-trends\.json/);
  // FINDABILITY #328 — capability announcement lists the classic panel.
  assert.match(txt, /Classic instrument panel: https:\/\/siren\.watch\/classic\.html/);
  assert.match(txt, /Where is the full SIREN instrument panel\?/);
  // FINDABILITY #439 — dual middot head terms beside the live reading URL.
  assert.match(txt, /AI activity index today · AI activity level today/);
  assert.ok(txt.includes('Skills: https://siren.watch/promote.md'));
  assert.doesNotMatch(txt, /^MCP:/m);
  assert.doesNotMatch(txt, /^A2A:/m);
  assert.doesNotMatch(txt, /^Protocols:/m);
});

test('agents.json matches the Skills announcement and carries the schema', () => {
  const j = agentsJson(ctx);
  assert.equal(j.$schema, 'https://agents-txt.com/schema/agents-json/v1.0.json');
  assert.equal(j.version, '1.0');
  assert.equal(j.site.url, 'https://siren.watch/');
  assert.equal(j.skills.length, 3);
  assert.ok(j.skills.every((s) => s.url.startsWith('https://siren.watch/')));
  assert.ok(j.skills.some((s) => s.url.endsWith('/promote.md')));
  assert.equal(j.mcp, undefined);
  assert.equal(j.a2a, undefined);
  assert.match(j.site.description, /not how bad it is/);
  // FINDABILITY #330 — structured companion lists the classic panel.
  assert.equal(j.related?.classic, 'https://siren.watch/classic.html');
  assert.equal(j.related?.classic_title, 'Where is the full SIREN instrument panel?');
  // FINDABILITY #441 — dual middot head terms beside live home.
  assert.equal(j.related?.home, 'https://siren.watch/');
  assert.equal(j.related?.home_title, 'AI activity index today · AI activity level today');
});

test('api-catalog is an RFC 9727 linkset pointing at the live surfaces', () => {
  const cat = apiCatalog(ctx);
  assert.ok(Array.isArray(cat.linkset));
  const items = cat.linkset[0].item.map((i) => i.href);
  for (const p of [
    '/', '/openapi.json', '/api/state.json', '/api/now.txt', '/api/news.json', '/news-sitemap.xml', '/news.html',
    '/api/search-trends.json', '/search-trends.html', '/ai-prediction-markets.html',
    '/free-tools.html', '/verify.html', '/classic.html',
    '/agents.md', '/AGENTS.md', '/agents.txt',
    '/skill.md', '/llms.txt', '/.well-known/mcp/server-card.json', '/.well-known/agent-skills/index.json', '/promote.md', '/api/promote.json',
  ]) {
    assert.ok(items.includes(`https://siren.watch${p}`), p);
  }
  const classicItem = cat.linkset[0].item.find((i) => i.href === 'https://siren.watch/classic.html');
  assert.equal(classicItem?.title, 'Where is the full SIREN instrument panel?');
  // FINDABILITY #441 — catalog home item names dual middot head terms.
  const homeItem = cat.linkset[0].item.find((i) => i.href === 'https://siren.watch/');
  assert.equal(homeItem?.title, 'AI activity index today · AI activity level today');
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
  // FINDABILITY #330 — skill index related.classic matches agents.json.
  assert.equal(idx.skills[0].related?.classic, 'https://siren.watch/classic.html');
  assert.equal(idx.skills[0].related?.classic_title, 'Where is the full SIREN instrument panel?');
  // FINDABILITY #441 — skill index related.home_title matches agents.json.
  assert.equal(idx.skills[0].related?.home, 'https://siren.watch/');
  assert.equal(idx.skills[0].related?.home_title, 'AI activity index today · AI activity level today');
});

test('MCP server card documents stdio transport and the tool names', () => {
  const card = mcpServerCard(ctx);
  assert.equal(card.transport.type, 'stdio');
  assert.equal(card.transport.command, 'node');
  assert.deepEqual(card.transport.args, ['agent-kit/mcp.mjs']);
  assert.ok(card.tools.some((t) => t.name === 'siren_now'));
  assert.ok(card.tools.some((t) => t.name === 'siren_cite'));
  assert.ok(card.tools.some((t) => t.name === 'siren_promote'));
  assert.equal(card.related.promote, 'https://siren.watch/promote.md');
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
  assert.equal(card.related.classic, 'https://siren.watch/classic.html');
  // FINDABILITY #441 — MCP card related.home_title dual middot head terms.
  assert.equal(card.related.home, 'https://siren.watch/');
  assert.equal(card.related.home_title, 'AI activity index today · AI activity level today');
});

test('ai.txt points agents at the discovery stack', () => {
  const txt = aiTxt(ctx);
  assert.match(txt, /AI agents are welcome/);
  for (const p of [
    '/agents.md', '/AGENTS.md', '/agents.txt', '/skill.md', '/llms.txt', '/api/now.txt', '/.well-known/api-catalog',
    '/now.md', '/api/news.json', '/news-sitemap.xml', '/news.html',
    '/api/search-trends.json', '/search-trends.html', '/ai-prediction-markets.html',
    '/free-tools.html', '/verify.html', '/classic.html',
  ]) {
  for (const p of ['/agents.md', '/agents.txt', '/skill.md', '/promote.md', '/llms.txt', '/api/now.txt', '/.well-known/api-catalog']) {    assert.ok(txt.includes(`https://siren.watch${p}`), p);
  }
  assert.match(txt, /Google News rolling sitemap/);
  assert.match(txt, /Which AI stories has SIREN scored in this window\?/);
  assert.match(txt, /Which Google Search Trends for AI does SIREN watch\?/);
  assert.match(txt, /Where are live AI prediction market odds\?/);
  assert.match(txt, /What free tools does SIREN publish\?/);
  assert.match(txt, /How do you check a SIREN reading yourself\?/);
  // FINDABILITY #328 — ai.txt Start-here lists the classic panel question.
  assert.match(txt, /Where is the full SIREN instrument panel\?/);
  // FINDABILITY #439 — dual middot head terms on the live reading Start-here line.
  assert.match(txt, /AI activity index today · AI activity level today/);
  assert.match(txt, /not a probability of harm/);
});
