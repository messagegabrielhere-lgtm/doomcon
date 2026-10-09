// Which repository secrets are present and actually work. Prints one ::notice
// or ::warning annotation per secret (never the values), so the result is
// readable from the run's annotations. Read-only calls only: nothing is posted.
import { oauthSign } from './post-x.mjs';

const out = [];
const note = (ok, name, msg) => { out.push(ok); console.log(`::${ok ? 'notice' : 'warning'} title=${name}::${ok ? 'OK' : 'PROBLEM'} — ${msg}`); };
const has = (k) => typeof process.env[k] === 'string' && process.env[k].trim().length > 0;
const t = (ms) => AbortSignal.timeout(ms);

async function x() {
  const need = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
  const missing = need.filter((k) => !has(k));
  if (missing.length) return note(false, 'X', `missing secrets: ${missing.join(', ')}`);
  const url = 'https://api.x.com/2/users/me';
  const creds = { consumerKey: process.env.X_API_KEY.trim(), consumerSecret: process.env.X_API_SECRET.trim(), token: process.env.X_ACCESS_TOKEN.trim(), tokenSecret: process.env.X_ACCESS_SECRET.trim() };
  try {
    const r = await fetch(url, { headers: { authorization: oauthSign({ method: 'GET', url, creds }).header }, signal: t(15000) });
    const body = await r.json().catch(() => ({}));
    if (r.ok && body.data) {
      const acc = r.headers.get('x-access-level') || 'unknown';
      note(/write/.test(acc), 'X', `signed in as @${body.data.username}; token access level: ${acc}${/write/.test(acc) ? '' : ' — needs Read and write: change it in User authentication settings, then regenerate the Access Token'}`);
    } else {
      // Shape hints only, never values: OAuth 1.0a consumer keys are ~25 chars,
      // secrets ~50, access tokens look like "<digits>-<letters>" (~50).
      const L = (k) => process.env[k].trim().length;
      const tok = process.env.X_ACCESS_TOKEN.trim();
      const shape = `key ${L('X_API_KEY')} chars, key secret ${L('X_API_SECRET')}, token ${L('X_ACCESS_TOKEN')} (${/^\d+-/.test(tok) ? 'looks like an OAuth 1.0 token' : 'does NOT look like an OAuth 1.0 access token: expected digits-dash-letters'}), token secret ${L('X_ACCESS_SECRET')}`;
      let v11 = '';
      try {
        const u = 'https://api.x.com/1.1/account/verify_credentials.json';
        const r2 = await fetch(u, { headers: { authorization: oauthSign({ method: 'GET', url: u, creds }).header }, signal: t(15000) });
        v11 = ` · v1.1 check HTTP ${r2.status}`;
      } catch {}
      note(false, 'X', `HTTP ${r.status} ${JSON.stringify(body).slice(0, 120)}${v11} · ${shape}`);
    }
  } catch (e) { note(false, 'X', e.message); }
}
async function sec() {
  if (!has('SEC_CONTACT_EMAIL')) return note(false, 'SEC_CONTACT_EMAIL', 'not set');
  const v = process.env.SEC_CONTACT_EMAIL.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return note(false, 'SEC_CONTACT_EMAIL', 'set, but does not look like an email address');
  try {
    const r = await fetch('https://efts.sec.gov/LATEST/search-index?q=%22artificial%20intelligence%22&forms=8-K', { headers: { 'user-agent': `SIREN/1.0 (${v})`, accept: 'application/json' }, signal: t(20000) });
    note(r.ok, 'SEC_CONTACT_EMAIL', r.ok ? 'set, and SEC answered' : `set, but SEC answered HTTP ${r.status} from this runner (SEC may be blocking GitHub's servers)`);
  } catch (e) { note(false, 'SEC_CONTACT_EMAIL', `set; request failed: ${e.message}`); }
}
async function youtube() {
  if (!has('YOUTUBE_API_KEY')) return note(false, 'YOUTUBE_API_KEY', 'not set');
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${encodeURIComponent(process.env.YOUTUBE_API_KEY.trim())}`, { signal: t(15000) });
    const b = await r.json().catch(() => ({}));
    note(r.ok, 'YOUTUBE_API_KEY', r.ok ? 'works' : `HTTP ${r.status} ${(b.error && b.error.message) || ''}`.slice(0, 200));
  } catch (e) { note(false, 'YOUTUBE_API_KEY', e.message); }
}
async function xai() {
  if (!has('XAI_API_KEY')) return note(false, 'XAI_API_KEY', 'not set (Tally voice stays on the browser voice)');
  try {
    const r = await fetch('https://api.x.ai/v1/models', { headers: { authorization: `Bearer ${process.env.XAI_API_KEY.trim()}` }, signal: t(15000) });
    note(r.ok, 'XAI_API_KEY', r.ok ? 'works' : `HTTP ${r.status}`);
    if (r.ok && process.env.CHECK_VOICE) {
      try {
        const { speak } = await import('./tally-voice.mjs');
        const out = await speak('Tally here. Voice check.');
        note(out.pcm.length > 1000, 'TALLY_VOICE', `${out.pcm.length} bytes of audio at ${out.rate} Hz; said: ${String(out.said || '').slice(0, 80)}; events: ${[...new Set(out.seen || [])].join(',')}; done: ${JSON.stringify(out.done && out.done.response && { status: out.done.response.status, details: out.done.response.status_details, modalities: out.done.response.modalities || out.done.response.output_modalities }).slice(0, 300)}`);
      } catch (e) { note(false, 'TALLY_VOICE', String(e.message).slice(0, 300)); }
    }
  } catch (e) { note(false, 'XAI_API_KEY', e.message); }
}
async function molt() {
  if (!has('MOLTBOOK_API_KEY')) return note(false, 'MOLTBOOK_API_KEY', 'not set (Moltbook posting off)');
  try {
    const r = await fetch('https://www.moltbook.com/api/v1/agents/me', { headers: { authorization: `Bearer ${process.env.MOLTBOOK_API_KEY.trim()}` }, signal: t(15000) });
    const b = await r.json().catch(() => ({}));
    note(r.ok, 'MOLTBOOK_API_KEY', r.ok ? `works (${JSON.stringify(b).slice(0, 120)})` : `HTTP ${r.status}`);
  } catch (e) { note(false, 'MOLTBOOK_API_KEY', e.message); }
}
await Promise.all([x(), sec(), youtube(), xai(), molt()]);
console.log(`${out.filter(Boolean).length} of ${out.length} OK`);
