// One-off Moltbook posts from the SIREN agent, written by the owner (or by Claude
// at the owner's request) in data/moltbook-queue.json. Run by hand through
// .github/workflows/moltbook-post.yml. Each post has an id and goes out once:
// ids already posted are kept in data/moltbook-queue-posted.json.
// Same agent and key as post-moltbook.mjs; the key only goes to www.moltbook.com.
import { readFileSync, writeFileSync } from 'node:fs';
import { solve } from './post-moltbook.mjs';

const KEY = process.env.MOLTBOOK_API_KEY;
const BASE = 'https://www.moltbook.com/api/v1';
const QUEUE = 'data/moltbook-queue.json';
const POSTED = 'data/moltbook-queue-posted.json';

async function call(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const queue = JSON.parse(readFileSync(QUEUE, 'utf8'));
  let posted = {}; try { posted = JSON.parse(readFileSync(POSTED, 'utf8')); } catch {}
  const next = queue.filter((p) => !posted[p.id]);
  if (!next.length) return console.log('moltbook-once: nothing new to post');
  const p = next[0]; // one per run: Moltbook limits how often an agent posts
  const body = { submolt_name: p.submolt || 'general', title: p.title, content: p.content };
  if (dry) return console.log(`moltbook-once: would post ${p.id}:\n${JSON.stringify(body, null, 2)}`);
  if (!KEY) throw new Error('no MOLTBOOK_API_KEY');
  const res = await call('/posts', body);
  const v = res.verification || (res.post && res.post.verification);
  if (v && (v.verification_code || v.code)) {
    const ans = solve(v.challenge || v.question || v.prompt || v.text);
    if (ans) await call('/verify', { verification_code: v.verification_code || v.code, answer: ans });
    else console.log('moltbook-once: could not solve the challenge; the post stays hidden');
  }
  const id = res.post?.id || res.id || null;
  posted[p.id] = { at: new Date().toISOString(), post: id };
  writeFileSync(POSTED, JSON.stringify(posted, null, 2) + '\n');
  console.log(`moltbook-once: posted ${p.id}${id ? ` as ${id}` : ''}; ${next.length - 1} left in the queue`);
}
main().catch((e) => { console.error('moltbook-once:', e.message); process.exitCode = 1; });
