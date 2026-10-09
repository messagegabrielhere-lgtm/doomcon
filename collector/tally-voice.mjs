// TALLY'S VOICE. Every few hours (and whenever the level moves) Tally reads a
// short update aloud through the owner's xAI voice agent, and the build plays
// it on /radio.html. The API key never reaches the browser: this runs in the
// workflow with XAI_API_KEY as a repository secret, and only the finished
// audio file is published.
//
//   XAI_API_KEY       required; without it this exits quietly
//   XAI_VOICE_AGENT   optional agent id (default: the SIREN Tally agent)
//
// Writes data/tally-voice.json { text, generated_at, level, audio } and
// data/tally-voice.mp3 (or .wav when ffmpeg is missing).
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const KEY = process.env.XAI_API_KEY;
const AGENT = process.env.XAI_VOICE_AGENT || 'agent_5xDoIFDct1eve0FH';
const EVERY_H = 6;

export function script(state, news) {
  const lv = state.level, name = String(state.level_name || '').toLowerCase();
  const mood = { 5: 'asleep on my perch', 4: 'whistling', 3: 'head up', 2: 'feathers ruffled', 1: 'in full squawk' }[lv] || 'watching';
  const d = state.delta_from_previous;
  const move = Number.isFinite(d) && Math.abs(d) >= 0.1 ? `${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(1)} since the last reading` : 'steady since the last reading';
  const top = news && Array.isArray(news.items) ? news.items.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0] : null;
  const dark = (state.pillars || []).filter((p) => p.dark).map((p) => p.name);
  return [
    `Tally here, SIREN's duty canary. We're at SIREN ${lv}, ${name}. I'm ${mood}.`,
    `The score is ${Number(state.score).toFixed(1)} out of 100, ${move}.`,
    dark.length ? `One gap: ${dark.join(' and ')} went quiet this hour, so I'm holding the level.` : '',
    top ? `Top story: ${String(top.title).replace(/\s+/g, ' ').slice(0, 160)}.` : '',
    `Skynet status: not self-aware. Yet. I'll squawk if that changes.`,
  ].filter(Boolean).join(' ');
}

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function speak(text) {
  const { default: WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://api.x.ai/v1/realtime?agent_id=${encodeURIComponent(AGENT)}`, { headers: { Authorization: `Bearer ${KEY}` } });
    const chunks = []; let rate = 24000, said = ''; const seen = [];
    const done = setTimeout(() => { ws.terminate(); reject(new Error('timed out after 60s')); }, 60000);
    // Send only once the agent's session is configured: a request sent on
    // 'open' raced the agent setup and came back cancelled ("unimplemented").
    let sent = false;
    const send = () => {
      if (sent) return; sent = true;
      // No tools for this job: an agent that reaches for a tool mid-sentence
      // is cancelled by the server ("unimplemented") and the audio stops.
      ws.send(JSON.stringify({ type: 'session.update', session: { tools: [], tool_choice: 'none', turn_detection: null } }));
      ws.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'message', role: 'user',
        content: [{ type: 'input_text', text: `Read this hourly update aloud exactly as written, in your Tally voice. Add nothing before or after it:\n\n${text}` }] } }));
      ws.send(JSON.stringify({ type: 'response.create', response: { instructions: `You are Tally. Read the user's update aloud word for word, then stop. Do not call tools.` } }));
    };
    let greeting = false;
    ws.on('open', () => { setTimeout(() => { if (!greeting) send(); }, 5000); });
    ws.on('message', (raw) => {
      let e; try { e = JSON.parse(raw.toString()); } catch { return; }
      if (seen.length < 40) seen.push(e.type);
      // The agent greets on its own first. Let that finish (or not start),
      // then send the script, and only keep the audio of OUR response.
      if (e.type === 'response.created' && !sent) greeting = true;
      const fmt = e.session && (e.session.output_audio_format || (e.session.audio && e.session.audio.output && e.session.audio.output.format));
      if (fmt && typeof fmt === 'object' && Number.isFinite(fmt.rate)) rate = fmt.rate;
      if ((e.type === 'response.output_audio.delta' || e.type === 'response.audio.delta') && e.delta) chunks.push(Buffer.from(e.delta, 'base64'));
      else if ((e.type === 'response.output_audio_transcript.delta' || e.type === 'response.audio_transcript.delta' || e.type === 'response.output_text.delta' || e.type === 'response.text.delta') && e.delta) said += e.delta;
      else if (e.type === 'response.done') {
        if (!sent) { chunks.length = 0; said = ''; send(); return; }   // greeting over; now ours
        clearTimeout(done); ws.close(); resolve({ pcm: Buffer.concat(chunks), rate, said, seen, done: e });
      }
      else if (e.type === 'error') { clearTimeout(done); ws.close(); reject(new Error(JSON.stringify(e.error || e).slice(0, 300))); }
    });
    ws.on('error', (err) => { clearTimeout(done); reject(err); });
  });
}

async function main() {
  if (!KEY) { console.log('tally-voice: no XAI_API_KEY, skipping'); return; }
  const state = JSON.parse(readFileSync(path.join(DATA, 'state.json'), 'utf8'));
  let news = null; try { news = JSON.parse(readFileSync(path.join(DATA, 'news.json'), 'utf8')); } catch {}
  let prev = null; try { prev = JSON.parse(readFileSync(path.join(DATA, 'tally-voice.json'), 'utf8')); } catch {}
  const fresh = prev && prev.audio && Date.now() - Date.parse(prev.generated_at) < EVERY_H * 3600e3 && prev.level === state.level;
  if (fresh && !process.argv.includes('--force')) { console.log('tally-voice: recent update still current, skipping'); return; }
  const text = script(state, news);
  const { pcm, rate, said } = await speak(text);
  if (pcm.length < rate) throw new Error(`only ${pcm.length} bytes of audio came back`);
  const wavPath = path.join(DATA, 'tally-voice.wav');
  writeFileSync(wavPath, wav(pcm, rate));
  let audio = 'tally-voice.wav';
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-ac', '1', '-b:a', '64k', path.join(DATA, 'tally-voice.mp3')]);
    unlinkSync(wavPath); audio = 'tally-voice.mp3';
  } catch { /* keep the wav */ }
  writeFileSync(path.join(DATA, 'tally-voice.json'), JSON.stringify({ text, transcript: said || null, generated_at: new Date().toISOString(), level: state.level, audio, agent: AGENT }, null, 2) + '\n');
  console.log(`tally-voice: ${(pcm.length / 2 / rate).toFixed(1)}s of audio -> ${audio}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('tally-voice failed:', e.message); console.log(`::warning title=tally-voice::${String(e.message).slice(0, 300)}`); process.exitCode = 1; });
}
