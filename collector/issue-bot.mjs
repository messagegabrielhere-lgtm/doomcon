// THE ISSUE DESK. Visitors report problems from the site (feedback.html opens a
// prefilled GitHub issue labelled from-site plus bug / data / feedback). This
// answers them without waiting for a human:
//
//   node collector/issue-bot.mjs triage <number>   on a new issue: thank, check,
//        comment with what it found; for a data report, ask for a fresh run
//   node collector/issue-bot.mjs settle            after each published full
//        pass: close data reports filed before the newest reading, with proof
//
// Uses the workflow's GITHUB_TOKEN through the REST API. Never edits code; a
// bug it cannot settle stays open, labelled needs-human.
import { readFileSync } from 'node:fs';

const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;
const SITE = process.env.SITE_URL || 'https://messagegabrielhere-lgtm.github.io/doomcon';
const api = async (path, opts = {}) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...opts, headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
};
const comment = (n, body) => api(`/issues/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
const label = (n, labels) => api(`/issues/${n}/labels`, { method: 'POST', body: JSON.stringify({ labels }) });
const state = () => JSON.parse(readFileSync('data/state.json', 'utf8'));
const mins = (iso) => Math.round((Date.now() - Date.parse(iso)) / 60000);

function healthLine(s) {
  const down = (s.sources || []).filter((x) => !x.ok && !x.uncalibrated).map((x) => x.id);
  const dark = (s.pillars || []).filter((p) => p.dark).map((p) => p.name);
  return `Newest reading: **SIREN ${s.level}, ${Number(s.score).toFixed(1)}/100**, published ${mins(s.generated_at)} min ago (${s.generated_at}). ` +
    (dark.length ? `Dark pillars: ${dark.join(', ')}. ` : 'All pillars live. ') +
    (down.length ? `Sources not answering: ${down.join(', ')}.` : 'No source is down.');
}

async function checkPage(url) {
  if (!url || !url.startsWith(SITE)) return null;
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    const issues = [];
    if (!r.ok) issues.push(`the page answers HTTP ${r.status}`);
    if (r.ok && !/data-sitebar/.test(html)) issues.push('the page is missing its footer bar, so it may be an old copy');
    if (r.ok && html.length < 2000) issues.push('the page is almost empty');
    return { status: r.status, issues };
  } catch (e) { return { status: 0, issues: [`the page did not load: ${e.message}`] }; }
}

async function triage(n) {
  const is = await api(`/issues/${n}`);
  const labels = is.labels.map((l) => l.name);
  if (!labels.includes('from-site') && !/^\[(Bug|Data|Feedback)\]/.test(is.title)) return console.log('not a site report; leaving it');
  const pageUrl = ((is.body || '').match(/https?:\/\/\S+/) || [null])[0];
  const s = state();
  const parts = ['Thanks for the report. SIREN’s issue desk checked it automatically:', '', `- ${healthLine(s)}`];
  if (labels.includes('data') || /\[Data\]/.test(is.title)) {
    try {
      await api('/actions/workflows/collect.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { mode: 'full' } }) });
      parts.push('- A fresh full data run has been started. Readings land hourly (usually 15–30 min past the hour) and the newsroom refreshes every 15 min.');
      parts.push('- This issue closes itself as soon as a newer reading is published. If the problem is still there after that, reply and it reopens for a human.');
    } catch (e) { parts.push(`- Could not start a fresh run (${e.message.slice(0, 80)}); a person will look.`); await label(n, ['needs-human']); }
  } else {
    const chk = await checkPage(pageUrl);
    if (chk) parts.push(chk.issues.length ? `- Page check on ${pageUrl}: ${chk.issues.join('; ')}.` : `- Page check on ${pageUrl}: loads fine (HTTP ${chk.status}).`);
    parts.push('- A person reviews every bug and idea. Fixes land in the repo and go live with the next hourly build.');
    await label(n, ['needs-human']);
  }
  await comment(n, parts.join('\n'));
  console.log(`triaged #${n}`);
}

async function settle() {
  const s = state(), at = Date.parse(s.generated_at);
  const open = await api('/issues?state=open&labels=data&per_page=50');
  for (const is of open) {
    if (is.pull_request || Date.parse(is.created_at) >= at) continue;
    await comment(is.number, `A newer reading is live: ${healthLine(s)}\n\nClosing this report. If the data still looks wrong at ${SITE}/ , reply here and a person will reopen it.`);
    await api(`/issues/${is.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
    console.log(`closed #${is.number}`);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (!REPO || !TOKEN) { console.log('issue-bot: no GITHUB_REPOSITORY/GITHUB_TOKEN; nothing to do'); process.exit(0); }
(cmd === 'triage' ? triage(Number(arg)) : cmd === 'settle' ? settle() : Promise.reject(new Error('usage: triage <n> | settle')))
  .catch((e) => { console.error('issue-bot:', e.message); process.exitCode = 1; });
