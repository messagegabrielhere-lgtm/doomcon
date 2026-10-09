// Chooses the moments worth clipping.
//
// The "claude" picker reads the timestamped transcript and returns the
// strongest self-contained moments with a title, a hook line and post copy.
// The "heuristic" picker needs no API key: it scores windows by speech pace,
// questions, exclamations and hook words. It is a fallback, not a substitute.
import Anthropic from '@anthropic-ai/sdk'
import { timestamped } from './transcript.mjs'

const SYSTEM = `You are a short-form video editor who finds the moments in long videos that perform as standalone vertical clips on TikTok, Instagram Reels and YouTube Shorts.

A good clip:
- hooks in its first two seconds: a bold claim, a surprising number, a question, conflict, or the start of a story;
- is self-contained: a viewer with no context understands it, so it never opens on "and", "so", "that's why" or a reference to something earlier;
- has a payoff: it ends just after the punchline, answer, reveal or strongest line, not mid-thought;
- carries emotion, novelty, practical value or controversy - not intros, sponsor reads, housekeeping or "like and subscribe".

Use the bracketed timestamps (seconds) to set start and end. Start on the first word of the hook and end after the last word of the payoff. Score each clip 0-100 for how likely it is to hold attention and be shared, and be honest: a dull video gets low scores. Write the title as an on-screen hook of at most 7 words, the caption as one or two lines of post copy, and 3-5 relevant hashtags without the # sign.`

const SCHEMA = {
  type: 'object',
  properties: {
    clips: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          start: { type: 'number' },
          end: { type: 'number' },
          score: { type: 'integer' },
          title: { type: 'string' },
          caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          why: { type: 'string' },
        },
        required: ['start', 'end', 'score', 'title', 'caption', 'hashtags', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['clips'],
  additionalProperties: false,
}

// Soft ceiling on a single picker call. The provider-console monthly budget is
// the hard stop (docs/LAUNCH.md §7); this keeps one runaway transcript from
// asking for a novel's worth of output tokens.
const PICKER_MAX_TOKENS = Math.min(
  8000,
  Math.max(1024, Number(process.env.CLIPPER_MAX_TOKENS) || 8000),
)

export async function pickWithClaude({ words, video, cfg }) {
  if (process.env.CLIPPER_AI_DISABLED === '1' || process.env.CLIPPER_AI_DISABLED === 'true') {
    throw new Error('clip picker paused: CLIPPER_AI_DISABLED is set')
  }
  const client = new Anthropic()
  const want = cfg.clipsPerVideo
  const response = await client.beta.messages.create({
    model: cfg.model,
    max_tokens: PICKER_MAX_TOKENS,
    // On a safety-classifier decline, the API retries on a fallback model
    // chosen for the refusal category instead of returning nothing.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: cfg.effort, format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Video title: ${video.title}\nChannel: ${video.channelTitle || 'unknown'}\n\n` +
          `Find up to ${want + 2} candidate clips, each ${cfg.minClipSeconds}-${cfg.maxClipSeconds} seconds long, ` +
          `not overlapping, best first.\n\nTranscript:\n${timestamped(words)}`,
      },
    ],
  })
  if (response.stop_reason === 'refusal') {
    throw new Error(`clip picker declined: ${response.stop_details?.explanation || 'no reason given'}`)
  }
  if (response.stop_reason === 'max_tokens') throw new Error('clip picker ran out of tokens')
  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('clip picker returned no text')
  return JSON.parse(text).clips
}

const HOOK = /^(secret|never|always|mistake|wrong|truth|nobody|everyone|crazy|insane|million|billion|money|why|how|stop|worst|best|biggest|actually|literally|shocking|honestly|problem)$/i

export function pickHeuristic({ words, cfg }) {
  if (!words.length) return []
  // Candidate starts: the first word after a pause, so clips open on a phrase.
  const starts = words.map((w, i) => i).filter((i) => i === 0 || words[i].s - words[i - 1].e > 0.45)
  const target = (cfg.minClipSeconds + cfg.maxClipSeconds) / 2
  const out = []
  for (const i of starts) {
    const t0 = words[i].s
    let j = i
    while (j + 1 < words.length && words[j + 1].e - t0 <= target) j++
    // Prefer to end on a pause.
    let k = j
    while (k > i && words[k].e - t0 > cfg.minClipSeconds && !(words[k + 1] && words[k + 1].s - words[k].e > 0.45)) k--
    if (words[k].e - t0 < cfg.minClipSeconds) k = j
    const span = words.slice(i, k + 1)
    const dur = words[k].e - t0
    if (dur < cfg.minClipSeconds) continue
    const pace = span.length / dur
    const hooks = span.filter((w) => HOOK.test(w.w.replace(/[^\w]/g, ''))).length
    const marks = span.filter((w) => /[?!]$/.test(w.w)).length
    const numbers = span.filter((w) => /\d/.test(w.w)).length
    const opener = span.slice(0, 8).some((w) => HOOK.test(w.w.replace(/[^\w]/g, ''))) ? 1 : 0
    const raw = pace * 10 + hooks * 4 + marks * 5 + numbers * 3 + opener * 12
    const firstWords = span.slice(0, 7).map((w) => w.w).join(' ')
    out.push({
      start: t0,
      end: words[k].e,
      raw,
      title: firstWords.replace(/[.,]$/, ''),
      caption: span.slice(0, 18).map((w) => w.w).join(' ') + '…',
      hashtags: [],
      why: `pace ${pace.toFixed(1)} w/s, ${hooks} hook words, ${marks} ?/!`,
    })
  }
  const max = Math.max(...out.map((c) => c.raw), 1)
  return out
    .map(({ raw, ...c }) => ({ ...c, score: Math.round((raw / max) * 100) }))
    .sort((a, b) => b.score - a.score)
}

// Snaps the picker's times onto word boundaries, enforces the length limits,
// drops overlaps and low scores, and returns the best `clipsPerVideo`.
export function normalise(candidates, words, cfg, duration = Infinity) {
  const kept = []
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  for (const c of sorted) {
    if (!(c.end > c.start) || c.score < cfg.minScore) continue
    let i = words.findIndex((w) => w.s >= c.start - 0.3)
    if (i < 0) continue
    let j = -1
    for (let k = words.length - 1; k >= i; k--) {
      if (words[k].e <= c.end + 0.3) {
        j = k
        break
      }
    }
    if (j < i) continue
    while (j + 1 < words.length && words[j].e - words[i].s < cfg.minClipSeconds) j++
    while (j > i && words[j].e - words[i].s > cfg.maxClipSeconds) j--
    const start = Math.max(0, words[i].s - 0.15)
    const end = Math.min(duration, words[j].e + 0.35)
    if (end - start < cfg.minClipSeconds * 0.9) continue
    const overlaps = kept.some((k) => Math.min(k.end, end) - Math.max(k.start, start) > 0.25 * (end - start))
    if (overlaps) continue
    kept.push({
      ...c,
      start: +start.toFixed(2),
      end: +end.toFixed(2),
      hashtags: (c.hashtags || []).map((h) => h.replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean),
    })
    if (kept.length >= cfg.clipsPerVideo) break
  }
  return kept.sort((a, b) => a.start - b.start)
}

export async function pick({ words, video, cfg, duration }) {
  let candidates
  if (cfg.picker === 'claude' && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) {
    candidates = await pickWithClaude({ words, video, cfg })
  } else {
    if (cfg.picker === 'claude') console.warn('  ANTHROPIC_API_KEY not set: using the heuristic picker')
    candidates = pickHeuristic({ words, cfg })
  }
  return normalise(candidates, words, cfg, duration)
}
