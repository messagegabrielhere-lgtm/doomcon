// Word-level transcript: [{ w, s, e }] with times in seconds.
//
// The default source is YouTube's own captions in json3 form, which yt-dlp
// downloads alongside the video. Auto-generated captions carry a start offset
// per word; uploaded captions only carry one per line, so words in a line are
// spread evenly across it. If a video has no captions at all, a local Whisper
// (`pip install openai-whisper`) is used when it is installed.
import fs from 'node:fs'
import path from 'node:path'
import { run } from './proc.mjs'

const NOISE = /^\[[^\]]*\]$|^\([^)]*\)$|^♪+$/

function finish(words) {
  words.sort((a, b) => a.s - b.s)
  for (let i = 0; i < words.length; i++) {
    const next = words[i + 1]
    if (next && words[i].e > next.s) words[i].e = next.s
    // A word that "lasts" four seconds is a pause, not speech.
    words[i].e = Math.min(words[i].e, words[i].s + 1.5)
    if (words[i].e <= words[i].s) words[i].e = words[i].s + 0.05
  }
  return words
}

export function parseJson3(json) {
  const words = []
  for (const ev of json.events || []) {
    if (!ev.segs) continue
    const evStart = ev.tStartMs || 0
    const evEnd = evStart + (ev.dDurationMs || 0)
    const segs = ev.segs.filter((s) => s.utf8 && s.utf8.trim())
    segs.forEach((seg, i) => {
      const s0 = evStart + (seg.tOffsetMs || 0)
      const s1 = i + 1 < segs.length ? evStart + (segs[i + 1].tOffsetMs || 0) : Math.max(evEnd, s0 + 300)
      const tokens = seg.utf8.replace(/\s+/g, ' ').trim().split(' ').filter((t) => !NOISE.test(t))
      const step = (s1 - s0) / Math.max(tokens.length, 1)
      tokens.forEach((t, j) => {
        words.push({ w: t, s: (s0 + j * step) / 1000, e: (s0 + (j + 1) * step) / 1000 })
      })
    })
  }
  return finish(words)
}

export function parseWhisper(json) {
  const words = []
  for (const seg of json.segments || []) {
    for (const w of seg.words || []) {
      const t = w.word.trim()
      if (t && !NOISE.test(t)) words.push({ w: t, s: w.start, e: w.end })
    }
  }
  return finish(words)
}

// Picks the best caption file yt-dlp wrote: an exact language match beats the
// "-orig" auto track, which beats any other variant of the language.
export function findCaptionFile(dir, lang) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json3'))
  const rank = (f) => {
    const code = f.split('.').slice(-2, -1)[0]
    if (code === lang) return 0
    if (code === `${lang}-orig`) return 1
    if (code.startsWith(`${lang}-`)) return 2
    return 9
  }
  return files.sort((a, b) => rank(a) - rank(b)).filter((f) => rank(f) < 9)[0] || null
}

export async function transcribe(dir, sourceFile, lang) {
  const caption = findCaptionFile(dir, lang)
  if (caption) {
    const words = parseJson3(JSON.parse(fs.readFileSync(path.join(dir, caption), 'utf8')))
    if (words.length > 20) return { words, source: `youtube:${caption}` }
  }
  try {
    await run('whisper', [
      sourceFile,
      '--model', process.env.WHISPER_MODEL || 'small',
      '--language', lang,
      '--word_timestamps', 'True',
      '--output_format', 'json',
      '--output_dir', dir,
    ])
  } catch (e) {
    throw new Error(`no ${lang} captions on this video and Whisper is unavailable (${e.message})`)
  }
  const out = path.join(dir, `${path.parse(sourceFile).name}.json`)
  return { words: parseWhisper(JSON.parse(fs.readFileSync(out, 'utf8'))), source: 'whisper' }
}

// Plain-text transcript with a timestamp at each phrase, which is the form the
// clip picker reads. Phrases break on a pause or every ~14 words.
export function timestamped(words) {
  const lines = []
  let cur = []
  const flush = () => {
    if (!cur.length) return
    lines.push(`[${cur[0].s.toFixed(1)}] ${cur.map((w) => w.w).join(' ')}`)
    cur = []
  }
  words.forEach((w, i) => {
    const prev = words[i - 1]
    if (cur.length && (cur.length >= 14 || (prev && w.s - prev.e > 0.7))) flush()
    cur.push(w)
  })
  flush()
  return lines.join('\n')
}
