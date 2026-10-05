import fs from 'node:fs'
import path from 'node:path'
import { run, ytdlpBase } from './proc.mjs'

// Video metadata without downloading anything: used to skip Shorts, live
// streams and premieres before paying for a full download.
export async function probe(url) {
  return JSON.parse(await run('yt-dlp', [...ytdlpBase(), '-J', '--no-playlist', '--skip-download', url]))
}

// Downloads up to 1080p as mp4, plus captions in json3 (manual if present,
// auto-generated otherwise) into `dir`.
export async function download(url, dir, lang) {
  fs.mkdirSync(dir, { recursive: true })
  await run('yt-dlp', [
    ...ytdlpBase(),
    '--no-playlist',
    '-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/bv*[height<=1080]+ba/b',
    '--merge-output-format', 'mp4',
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs', `${lang},${lang}-orig,${lang}-.*`,
    '--sub-format', 'json3',
    '--write-info-json',
    '-o', path.join(dir, 'source.%(ext)s'),
    url,
  ])
  const file = path.join(dir, 'source.mp4')
  if (!fs.existsSync(file)) throw new Error(`yt-dlp finished but ${file} is missing`)
  return file
}
