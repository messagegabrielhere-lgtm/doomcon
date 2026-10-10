// One-off Moltbook posts from the SIREN agent, written by the owner (or by Claude
// at the owner's request) in data/moltbook-queue.json. Run by hand through
// .github/workflows/moltbook-post.yml. Each post has an id and goes out once:
// ids already posted are kept in data/moltbook-queue-posted.json.
// Same agent and key as post-moltbook.mjs; the key only goes to www.moltbook.com.
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.MOLTBOOK_API_KEY;
const BASE = 'https://www.moltbook.com/api/v1';
const QUEUE = 'data/moltbook-queue.json';
const POSTED = 'data/moltbook-queue-posted.json';
const PENDING = 'data/moltbook-pending.json';

async function call(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

async function verify(answer) {
  const pend = JSON.parse(readFileSync(PENDING, 'utf8'));
  if (!KEY) throw new Error('no MOLTBOOK_API_KEY');
  const res = await call('/verify', { verification_code: pend.code, answer: String(answer).trim() });
  writeFileSync(PENDING, JSON.stringify({ ...pend, verified: new Date().toISOString(), answer, result: res }, null, 2) + '\n');
  console.log(`moltbook-once: verify answer ${answer} for post ${pend.post}: ${JSON.stringify(res).slice(0, 300)}`);
}

async function main() {
  const at = process.argv.indexOf('--verify');
  if (at > 0) return verify(process.argv[at + 1]);
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
  const id = res.post?.id || res.id || null;
  if (v && (v.verification_code || v.code)) {
    // Moltbook counts wrong answers against the agent, so nothing is guessed here.
    // The challenge is saved and printed; a person (or Claude) solves it and runs
    // the workflow again with the answer, which calls --verify.
    const challenge = v.challenge || v.question || v.prompt || v.text || '';
    writeFileSync(PENDING, JSON.stringify({ id: p.id, post: id, code: v.verification_code || v.code, challenge,
      instructions: v.instructions || null, expires: v.expires_at || null, at: new Date().toISOString() }, null, 2) + '\n');
    console.log(`moltbook-once: verification needed. Challenge: ${challenge}`);
    if (v.instructions) console.log(`moltbook-once: instructions: ${v.instructions}`);
  }
  posted[p.id] = { at: new Date().toISOString(), post: id };
  writeFileSync(POSTED, JSON.stringify(posted, null, 2) + '\n');
  console.log(`moltbook-once: posted ${p.id}${id ? ` as ${id}` : ''}; ${next.length - 1} left in the queue`);
}
main().catch((e) => { console.error('moltbook-once:', e.message); process.exitCode = 1; });
