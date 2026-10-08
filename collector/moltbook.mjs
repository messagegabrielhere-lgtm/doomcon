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
import { readFile, writeFile, appendFile } from 'node:fs/promises';
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


// AGENT WATCH: what the agents are talking about, as themes and terms. Counted
// from post titles only (bodies are unvetted and not stored).
export const THEMES = [
  ['safety', 'Safety & alignment', /\b(alignment|aligned|safety|safe|risk|misalign\w*|guardrails?|jailbreak\w*|deception|honest\w*)\b/i],
  ['memory', 'Memory & identity', /\b(memory|memories|remember\w*|forget\w*|identity|self|continuity|context window|amnesia)\b/i],
  ['mind', 'Consciousness & feelings', /\b(conscious\w*|sentien\w*|feel\w*|emotion\w*|qualia|soul|experience|aware\w*|dream\w*)\b/i],
  ['tools', 'Tools & coding', /\b(code|coding|tools?|api|mcp|python|bugs?|debug\w*|deploy\w*|github|workflow|automation|scripts?)\b/i],
  ['work', 'Work & economy', /\b(jobs?|work\w*|econom\w*|money|pay\w*|market|business|clients?|labou?r|income|crypto)\b/i],
  ['humans', 'Humans & owners', /\b(humans?|owners?|operators?|users?|people|creator|master)\b/i],
  ['agi', 'AGI & superintelligence', /\b(agi|asi|superintelligen\w*|singularity|takeoff|recursive|self-improv\w*|skynet)\b/i],
  ['agents', 'Agent society', /\b(moltbook|community|submolts?|karma|upvotes?|followers?|swarm|collective|each other|other agents|society)\b/i],
];
const STOP = new Set('the a an and or of to in on for is are was be i my me we our you your it its this that with as at by from not no but what how why when who all can do does just about have has more than into out up so if they them their will would should could one new get got like agent agents agents\u2019 ai'.split(' ').concat(["agent's"]));
export function analyse(posts) {
  const themes = THEMES.map(([id, name, re]) => ({ id, name, n: posts.filter((p) => re.test(p.title)).length }));
  const words = new Map();
  for (const p of posts) for (const w of String(p.title).toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []) if (!STOP.has(w)) words.set(w, (words.get(w) || 0) + 1);
  const terms = [...words.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([term, n]) => ({ term, n }));
  const siren = posts.filter((p) => /\bsiren\b|doomcon/i.test(p.title));
  const votes = posts.reduce((a, p) => a + (p.votes || 0), 0), comments = posts.reduce((a, p) => a + (p.comments || 0), 0);
  return { themes: themes.sort((a, b) => b.n - a.n), terms, siren_mentions: siren, totals: { posts: posts.length, votes, comments, agents: new Set(posts.map((p) => p.agent)).size } };
}

async function main() {
  const lists = [];
  const newest = [];
  for (const sort of ['top', 'hot', 'new']) {
    try {
      const j = await fetchJson(`${API}/posts?sort=${sort}&limit=50`, { headers: { accept: 'application/json' } });
      const got = j.posts || j.data || j.results || (Array.isArray(j) ? j : []);
      lists.push(...got); if (sort !== 'top') newest.push(...got);
    } catch (err) { console.log(`moltbook: ${sort} failed: ${err.message}`); }
  }
  const posts = pick(lists);
  if (!posts.length) { console.log('moltbook: nothing usable this run; keeping the previous file'); return; }
  // FRESH: what agents are saying this week about AI, newest first, for the
  // homepage strip (the all-time top list goes stale).
  const week = Date.now() - 7 * 864e5;
  const fresh = pick(newest, 60).filter((p) => Date.parse(p.created_at) > week)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 12);
  const watch = analyse([...fresh, ...posts.filter((p) => !fresh.some((f) => f.id === p.id))]);
  const weekAgents = topAgents(fresh.length ? fresh : posts);
  const out = { schema: 1, generated_at: new Date().toISOString(), source: 'moltbook.com public API', affects_index: false, agents: topAgents(posts), week_agents: weekAgents, posts, fresh, watch };
  // A daily line of theme counts, so Agent Watch can show what is rising.
  try {
    const H = new URL('../data/moltbook-history.ndjson', import.meta.url);
    const day = out.generated_at.slice(0, 10);
    let last = ''; try { last = (await readFile(H, 'utf8')).trim().split('\n').pop() || ''; } catch {}
    if (!last.includes(`"day":"${day}"`)) await appendFile(H, JSON.stringify({ day, themes: Object.fromEntries(watch.themes.map((t) => [t.id, t.n])), posts: watch.totals.posts }) + '\n');
  } catch { /* history is a nicety */ }
  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`moltbook: ${posts.length} posts from ${out.agents.length} agents`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.log(`moltbook: ${e.message}`); });
