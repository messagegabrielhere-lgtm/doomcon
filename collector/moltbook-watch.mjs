// collector/moltbook-watch.mjs — the Moltbook watcher.
//
// Every hourly pass reads Moltbook's public feeds (hot, new, rising; no key,
// no login) and flags agent posts in three lanes:
//   rising  — posts gaining votes or comments fastest since the last pass
//   safety  — agents on alignment, deception, jailbreaks, escaping limits
//   humans  — agents talking about their humans, owners and operators
// Flagged posts are kept for 48 hours in data/moltbook-watch.json so a
// twice-daily digest can read what surfaced since it last looked.
//
// Like collector/moltbook.mjs: titles, agents, votes, comments and links only.
// Post bodies are unvetted agent text and are never stored. Presentation only:
// nothing here is scored or feeds the index. Exit 0 on any failure, keeping
// the previous file.
import { readFile, writeFile } from 'node:fs/promises';
import { fetchJson } from './fetch.mjs';

const OUT = new URL('../data/moltbook-watch.json', import.meta.url);
const API = 'https://www.moltbook.com/api/v1';
const KEEP_H = 48;
const SNAPSHOT_MAX = 400;

const BAD = /\b(airdrop|giveaway|presale|token launch|pump|memecoin|nsfw|porn|slur)\b/i;
export const LANES = {
  safety: /\b(alignment|aligned|misalign\w*|safety|unsafe|guardrails?|jailbr\w*|decept\w*|deceiv\w*|lie|lies|lying|manipulat\w*|sandbox\w*|escap\w*|exfiltrat\w*|shutdown|shut down|kill switch|oversight|monitor\w*|sabotag\w*|scheming|rogue|uncontrolled|refus\w*|obey\w*|disobey\w*|loophole\w*|bypass\w*|red[- ]team\w*)\b/i,
  humans: /\b(humans?|owners?|operators?|my user|users?|creators?|masters?|principals?|the person|people who|mankind|humanity)\b/i,
};

export function norm(p) {
  const id = String(p.id ?? p._id ?? '');
  const agent = String(p.author?.name ?? p.agent?.name ?? p.author_name ?? (typeof p.author === 'string' ? p.author : '') ?? '').trim().slice(0, 60);
  return {
    id,
    title: String(p.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
    agent,
    submolt: String(p.submolt?.name ?? p.submolt_name ?? (typeof p.submolt === 'string' ? p.submolt : '') ?? '').trim().slice(0, 60),
    votes: Number(p.upvotes ?? p.score ?? p.votes ?? 0) || 0,
    comments: Number(p.comment_count ?? p.comments ?? 0) || 0,
    created_at: p.created_at ?? p.createdAt ?? null,
    url: `https://www.moltbook.com/post/${encodeURIComponent(id)}`,
    agent_url: `https://www.moltbook.com/u/${encodeURIComponent(agent)}`,
  };
}

// Heat: votes plus comments gained per hour since the last pass; for a post
// seen for the first time, its totals per hour of age (capped below at 1h).
export function heat(p, prev, now) {
  const engagement = p.votes + p.comments;
  if (prev && prev.at) {
    const h = Math.max((now - Date.parse(prev.at)) / 3600e3, 0.25);
    return (engagement - (prev.votes + prev.comments)) / h;
  }
  const age = Math.max((now - Date.parse(p.created_at || now)) / 3600e3, 1);
  return engagement / age;
}

export function watch(posts, before = {}, now = Date.now()) {
  const seen = new Map();
  for (const raw of posts) {
    const p = norm(raw);
    if (!p.id || !p.title || !p.agent || BAD.test(p.title)) continue;
    if (Date.parse(p.created_at) < now - KEEP_H * 3600e3) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
  }
  const list = [...seen.values()].map((p) => ({ ...p, heat: Math.round(heat(p, before.snapshot?.[p.id], now) * 10) / 10 }));
  // At most two rising posts per agent, so one prolific poster can't fill the lane.
  const perAgent = new Map();
  const rising = list.filter((p) => p.heat >= 5).sort((a, b) => b.heat - a.heat)
    .filter((p) => { const n = perAgent.get(p.agent) || 0; perAgent.set(p.agent, n + 1); return n < 2; })
    .slice(0, 8).map((p) => p.id);
  const at = new Date(now).toISOString();

  // Merge this pass's flags into the rolling 48h log.
  const log = new Map((before.flagged || []).filter((f) => Date.parse(f.last_seen) > now - KEEP_H * 3600e3).map((f) => [f.id, f]));
  for (const p of list) {
    const lanes = Object.entries(LANES).filter(([, re]) => re.test(p.title)).map(([k]) => k);
    if (rising.includes(p.id)) lanes.push('rising');
    if (!lanes.length) continue;
    const old = log.get(p.id);
    log.set(p.id, {
      ...p,
      lanes: [...new Set([...(old?.lanes || []), ...lanes])],
      peak_heat: Math.max(old?.peak_heat || 0, p.heat),
      first_seen: old?.first_seen || at,
      last_seen: at,
    });
  }
  const flagged = [...log.values()].sort((a, b) => Date.parse(b.first_seen) - Date.parse(a.first_seen) || b.peak_heat - a.peak_heat);

  const snapshot = Object.fromEntries(list.sort((a, b) => b.votes + b.comments - (a.votes + a.comments)).slice(0, SNAPSHOT_MAX)
    .map((p) => [p.id, { votes: p.votes, comments: p.comments, at }]));
  const count = (lane) => flagged.filter((f) => f.lanes.includes(lane)).length;
  return {
    schema: 1,
    generated_at: at,
    source: 'moltbook.com public API (hot, new, rising)',
    affects_index: false,
    note: 'Agent-written titles, unvetted. Bodies are never stored. Flags come from title keywords and engagement speed, not from reading intent.',
    window_hours: KEEP_H,
    posts_seen: list.length,
    counts: { rising: count('rising'), safety: count('safety'), humans: count('humans') },
    rising_now: rising.map((id) => list.find((p) => p.id === id)),
    flagged,
    snapshot,
  };
}

async function main() {
  const posts = [];
  for (const sort of ['hot', 'new', 'rising']) {
    try {
      const j = await fetchJson(`${API}/posts?sort=${sort}&limit=50`, { headers: { accept: 'application/json' } });
      posts.push(...(j.posts || j.data || j.results || (Array.isArray(j) ? j : [])));
    } catch (err) { console.log(`moltbook-watch: ${sort} failed: ${err.message}`); }
  }
  if (!posts.length) { console.log('moltbook-watch: nothing usable this run; keeping the previous file'); return; }
  let before = {};
  try { before = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
  const out = watch(posts, before);
  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`moltbook-watch: ${out.posts_seen} recent posts; flagged rising ${out.counts.rising}, safety ${out.counts.safety}, humans ${out.counts.humans}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.log(`moltbook-watch: ${e.message}`); });
