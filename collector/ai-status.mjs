// AI SERVICE STATUS. Is ChatGPT down? Is Claude down? Reads each provider's
// own public status page (the Atlassian Statuspage summary.json most of them
// publish) and writes data/ai-status.json for /status.html. The page also
// polls the same endpoints from the reader's browser every minute, so the
// file is the no-JavaScript and first-paint snapshot, not the live view.
//
// Each source fails dark: a provider we cannot reach is listed as "unknown",
// never as "up".
//
//   node collector/ai-status.mjs
import { writeFileSync } from 'node:fs';
import { fetchJson } from './fetch.mjs';

const OUT = 'data/ai-status.json';
const say = (m) => { if (process.env.GITHUB_ACTIONS) console.log(`::notice title=ai-status::${m}`); else console.log(m); };

// [id, name, product people search for, status page, summary.json, browser-fetchable]
export const SERVICES = [
  ['openai', 'OpenAI', 'ChatGPT', 'https://status.openai.com', 'https://status.openai.com/api/v2/summary.json', true],
  ['claude', 'Anthropic', 'Claude', 'https://status.claude.com', 'https://status.claude.com/api/v2/summary.json', true],
  ['github', 'GitHub', 'GitHub Copilot', 'https://www.githubstatus.com', 'https://www.githubstatus.com/api/v2/summary.json', true],
  ['cursor', 'Cursor', 'Cursor', 'https://status.cursor.com', 'https://status.cursor.com/api/v2/summary.json', true],
  ['perplexity', 'Perplexity', 'Perplexity', 'https://status.perplexity.com', 'https://status.perplexity.com/api/v2/summary.json', true],
  ['groq', 'Groq', 'Groq', 'https://groqstatus.com', 'https://groqstatus.com/api/v2/summary.json', true],
  ['cohere', 'Cohere', 'Cohere', 'https://status.cohere.com', 'https://status.cohere.com/api/v2/summary.json', true],
  ['elevenlabs', 'ElevenLabs', 'ElevenLabs', 'https://status.elevenlabs.io', 'https://status.elevenlabs.io/api/v2/summary.json', true],
  ['vercel', 'Vercel', 'Vercel (v0, AI SDK hosting)', 'https://www.vercel-status.com', 'https://www.vercel-status.com/api/v2/summary.json', true],
];

/** Statuspage summary.json -> compact service status. */
export function parseSummary(j) {
  if (!j || !j.status) return null;
  const comps = (j.components || []).filter((c) => !c.group && c.status && c.status !== 'operational');
  return {
    indicator: j.status.indicator || 'none', // none | minor | major | critical | maintenance
    description: j.status.description || '',
    updated_at: (j.page && j.page.updated_at) || null,
    degraded: comps.slice(0, 12).map((c) => ({ name: c.name, status: c.status })),
    components: (j.components || []).filter((c) => !c.group).length,
    incidents: (j.incidents || []).filter((i) => i.status !== 'resolved' && i.status !== 'postmortem').slice(0, 5).map((i) => ({
      name: i.name, impact: i.impact, status: i.status, started_at: i.started_at || i.created_at, updated_at: i.updated_at, url: i.shortlink || null,
      latest: ((i.incident_updates || [])[0] || {}).body ? String(i.incident_updates[0].body).slice(0, 280) : null,
    })),
    maintenance: (j.scheduled_maintenances || []).filter((m) => m.status === 'in_progress').length,
  };
}

async function main() {
  const out = [];
  await Promise.all(SERVICES.map(async ([id, name, product, page, api, browser]) => {
    let s = null, err = null;
    try { s = parseSummary(await fetchJson(api, { timeoutMs: 15000, retries: 1 })); } catch (e) { err = String(e.message).slice(0, 120); }
    out.push({ id, name, product, page, api, browser, ...(s || { indicator: 'unknown', description: 'Status page unreachable', degraded: [], incidents: [] }), error: s ? null : err });
  }));
  out.sort((a, b) => SERVICES.findIndex((x) => x[0] === a.id) - SERVICES.findIndex((x) => x[0] === b.id));
  const doc = { schema: 1, generated_at: new Date().toISOString(), services: out };
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  say(out.map((s) => `${s.id}:${s.indicator}`).join(' '));
}

if (process.argv[1] && process.argv[1].endsWith('ai-status.mjs')) main().catch((e) => console.log(`::warning title=ai-status::${String(e.message).slice(0, 200)}`));
