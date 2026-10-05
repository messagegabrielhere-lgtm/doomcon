// Builds an ASS subtitle file for a 1080x1920 clip: short lines of a few words,
// with the word being spoken highlighted (the "karaoke" caption style used on
// most short-form clips), plus an optional hook title for the first seconds.

const W = 1080
const H = 1920

// ASS colours are &HAABBGGRR.
export function assColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`bad colour ${hex}`)
  const [r, g, b] = [0, 2, 4].map((i) => m[1].slice(i, i + 2))
  return `&H00${b}${g}${r}`.toUpperCase()
}

export function assTime(t) {
  const cs = Math.max(0, Math.round(t * 100))
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/[{}]/g, '').replace(/\n/g, ' ')

// Groups words into display lines: at most `perLine` words or `maxChars`
// characters (so a line never wraps), and a pause longer than half a second or
// the end of a sentence always starts a new line.
export function chunk(words, perLine, maxChars = 20) {
  const lines = []
  let cur = []
  for (const w of words) {
    const prev = cur[cur.length - 1]
    const len = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length
    if (cur.length && (cur.length >= perLine || len > maxChars || w.s - prev.e > 0.5 || /[.?!]$/.test(prev.w))) {
      lines.push(cur)
      cur = []
    }
    cur.push(w)
  }
  if (cur.length) lines.push(cur)
  return lines
}

// `words` carry absolute times; `offset` is the clip's start in the source.
export function buildAss(words, { offset, duration, title, style }) {
  const font = style.font
  const size = style.fontSize
  const hi = assColor(style.highlightColor)
  const marginV = Math.round(H * (1 - style.captionY))
  const fix = (s) => (style.uppercase ? s.toUpperCase() : s)

  const rel = words
    .map((w) => ({ w: fix(esc(w.w)), s: w.s - offset, e: w.e - offset }))
    .filter((w) => w.e > 0 && w.s < duration)
    .map((w) => ({ ...w, s: Math.max(0, w.s), e: Math.min(duration, w.e) }))

  const events = []
  // Bold sans capitals average ~0.7 em wide; 940 px is the frame minus margins
  // and the highlighted word's 8% growth.
  const maxChars = Math.floor(940 / (size * (style.uppercase ? 0.72 : 0.6)))
  const lines = chunk(rel, style.wordsPerLine, maxChars)
  lines.forEach((line, li) => {
    const next = lines[li + 1]
    // Hold a line on screen through short gaps so captions do not flicker.
    const lineEnd = next && next[0].s - line[line.length - 1].e < 0.6 ? next[0].s : line[line.length - 1].e + 0.2
    line.forEach((word, wi) => {
      const s = word.s
      const e = wi + 1 < line.length ? line[wi + 1].s : lineEnd
      if (e <= s) return
      const text = line
        .map((x, xi) => (xi === wi ? `{\\c${hi}\\fscx108\\fscy108}${x.w}{\\r}` : x.w))
        .join(' ')
      events.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Caption,,0,0,0,,${text}`)
    })
  })

  if (title && style.hookTitle) {
    const t = esc(title)
    events.unshift(`Dialogue: 1,${assTime(0)},${assTime(Math.min(3, duration))},Hook,,0,0,0,,{\\fad(150,250)}${t}`)
  }

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${font},${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,60,60,${marginV},1
Style: Hook,${font},${Math.round(size * 0.8)},&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,18,0,8,80,80,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`
}
