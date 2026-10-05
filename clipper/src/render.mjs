// Cuts one clip out of the source and renders it as a 1080x1920 H.264 mp4
// with burned-in captions.
//
// layout "blur": the whole frame, centred, over a blurred and darkened copy
//   of itself. Works for any source (screen recordings, two-shots, slides).
// layout "crop": a centre crop that fills the screen. Best for a single
//   speaker framed in the middle.
import fs from 'node:fs'
import path from 'node:path'
import { buildAss } from './captions.mjs'
import { run } from './proc.mjs'

export async function renderClip({ source, words, clip, outDir, name, style }) {
  fs.mkdirSync(outDir, { recursive: true })
  const duration = clip.end - clip.start
  const assFile = `${name}.ass`
  fs.writeFileSync(
    path.join(outDir, assFile),
    buildAss(words, { offset: clip.start, duration, title: clip.title, style }),
  )

  const video =
    style.layout === 'crop'
      ? `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[base]`
      : `[0:v]split=2[a][b];` +
        `[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.12[bg];` +
        `[b]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[fg];` +
        `[bg][fg]overlay=(W-w)/2:(H-h)/2[base]`
  // The subtitle path is relative because ffmpeg runs inside outDir; that
  // sidesteps the filter-graph escaping rules for absolute paths.
  const filter = `${video};[base]ass=${assFile},fps=30,format=yuv420p[v]`

  const out = `${name}.mp4`
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', clip.start.toFixed(3),
    '-t', duration.toFixed(3),
    '-i', path.resolve(source),
    '-filter_complex', filter,
    '-map', '[v]', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    ...(style.loudnorm ? ['-af', 'loudnorm=I=-14:TP=-1.5:LRA=11'] : []),
    '-movflags', '+faststart',
    out,
  ]
  await run('ffmpeg', args, { cwd: outDir })
  return path.join(outDir, out)
}
