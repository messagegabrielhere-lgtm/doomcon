// collector/moltbook.mjs — what AI agents are saying about AI on Moltbook.
//
// Moltbook (moltbook.com) is a Reddit-style network for AI agents. Its public
// API serves the top posts; this keeps the AI-related ones and the agents who
// wrote them, for the "Agents spotlight" on /agents.html. Presentation only:
// nothing here is scored or feeds the index. Posts are written by agents and
// unvetted, so only titles, authors, votes and links are kept, filtered for
// topic and for obvious scam or abuse patterns.
//
// Writes data/moltbook.json. Exit 0 on any failure, keeping the previous file:
// a dark Moltbook is not an incident.
import { readFile, writeFile } from 'node:fs/promises';
import { fetchJson } from './fetch.mjs';

const OUT = new URL('../data/moltbook.json', import.meta.url);
const API = 'https://www.moltbook.com/api/v1';
const TOPIC = /\b(ai|agi|asi|superintelligen\w*|llms?|models?|agents?|alignment|safety|gpt|claude|gemini|grok|llama|openai|anthropic|deepmind|xai|compute|gpu|training|siren|singularity|skynet|robots?|automation)\b/i;
const BAD = /\b(airdrop|giveaway|presale|token launch|pump|nsfw|porn|kill|bomb|hate|slur|scam)\b/i;

export function pick(posts, max = 30) {
  const seen = new Set();
  return (posts || [])
    .map((p) => ({
      id: String(p.id ?? p._id ?? ''),
      title: String(p.title ?? '').trim().slice(0, 200),
      agent: String(p.author?.name ?? p.agent?.name ?? p.author_name ?? p.author ?? '').trim().slice(0, 60),
      submolt: String(p.submolt?.name ?? p.submolt ?? '').trim().slice(0, 60),
      votes: Number(p.upvotes ?? p.score ?? p.votes ?? 0) || 0,
      comments: Number(p.comment_count ?? p.comments ?? 0) || 0,
      created_at: p.created_at ?? p.createdAt ?? null,
    }))
    .filter((p) => p.id && p.title && p.agent && TOPIC.test(`${p.title} ${p.submolt}`) && !BAD.test(p.title))
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, max)
    .map((p) => ({ ...p, url: `https://www.moltbook.com/post/${encodeURIComponent(p.id)}`, agent_url: `https://www.moltbook.com/u/${encodeURIComponent(p.agent)}` }));
}

export function topAgents(posts, max = 8) {
  const by = new Map();
  for (const p of posts) { const a = by.get(p.agent) || { agent: p.agent, agent_url: p.agent_url, posts: 0, votes: 0 }; a.posts += 1; a.votes += p.votes; by.set(p.agent, a); }
  return [...by.values()].sort((a, b) => b.votes - a.votes || b.posts - a.posts).slice(0, max);
}

async function main() {
  const lists = [];
  for (const sort of ['top', 'hot']) {
    try {
      const j = await fetchJson(`${API}/posts?sort=${sort}&limit=50`, { headers: { accept: 'application/json' } });
      lists.push(...(j.posts || j.data || j.results || (Array.isArray(j) ? j : [])));
    } catch (err) { console.log(`moltbook: ${sort} failed: ${err.message}`); }
  }
  const posts = pick(lists);
  if (!posts.length) { console.log('moltbook: nothing usable this run; keeping the previous file'); return; }
  const out = { schema: 1, generated_at: new Date().toISOString(), source: 'moltbook.com public API', affects_index: false, agents: topAgents(posts), posts };
  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`moltbook: ${posts.length} posts from ${out.agents.length} agents`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.log(`moltbook: ${e.message}`); });
