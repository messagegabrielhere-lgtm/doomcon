// One upload in, N captioned vertical clips out and queued for posting.
import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './config.mjs'
import { download, probe } from './download.mjs'
import { pick } from './pick.mjs'
import { log, run } from './proc.mjs'
import { describe, enqueue, publishDue } from './publish/index.mjs'
import { renderClip } from './render.mjs'
import { transcribe } from './transcript.mjs'
import { listRecent, resolveChannel } from './watch.mjs'

const MAX_VIDEO_ATTEMPTS = 3

async function localDuration(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return parseFloat(out)
}

// `video` is { id, url, title, channelTitle } for a YouTube upload, or
// { id, file, title } for a local file (captions read from the same folder).
export async function processVideo(state, cfg, video, save) {
  const rec = (state.videos[video.id] ||= { title: video.title, url: video.url, attempts: 0 })
  rec.attempts++
  rec.lastAttempt = Date.now()
  rec.status = 'processing'
  save()
  const work = path.join(DATA, 'work', video.id)
  try {
    let source = video.file
    let duration
    let dir
    if (source) {
      duration = await localDuration(source)
      dir = path.dirname(source)
    } else {
      const info = await probe(video.url)
      if (info.is_live || ['is_upcoming', 'is_live', 'post_live'].includes(info.live_status)) {
        rec.status = 'skipped'
        rec.reason = `live status ${info.live_status}`
        return rec
      }
      if (info.duration && info.duration < cfg.minSourceSeconds) {
        rec.status = 'skipped'
        rec.reason = `only ${info.duration}s long (already a Short?)`
        return rec
      }
      video.title = rec.title = info.title || video.title
      video.channelTitle ||= info.channel
      log(`  downloading "${video.title}"`)
      source = await download(video.url, work, cfg.captionLanguage)
      duration = info.duration || (await localDuration(source))
      dir = work
    }

    const { words, source: from } = await transcribe(dir, source, cfg.captionLanguage)
    log(`  transcript: ${words.length} words from ${from}`)

    const clips = await pick({ words, video, cfg, duration })
    log(`  picked ${clips.length} clip(s)${clips.length ? ': ' + clips.map((c) => `${c.score}`).join(', ') : ''}`)

    // A retry after a failed render must not queue the earlier clips twice.
    state.queue = state.queue.filter((q) => q.videoId !== video.id || q.status === 'posted')
    rec.clips = []
    const outDir = path.join(DATA, 'clips', video.id)
    for (const [n, clip] of clips.entries()) {
      const clipId = `${video.id}-${n + 1}`
      const file = await renderClip({ source, words, clip, outDir, name: clipId, style: cfg.render })
      log(`  rendered ${path.relative(process.cwd(), file)} (${(clip.end - clip.start).toFixed(1)}s, score ${clip.score}) "${clip.title}"`)
      rec.clips.push({ id: clipId, file, ...clip })
      enqueue(state, cfg, { clipId, videoId: video.id, file, post: describe(clip, video, cfg) })
    }
    rec.status = 'done'
    delete rec.error
    if (!video.file && !cfg.keepSource) fs.rmSync(source, { force: true })
    return rec
  } catch (e) {
    rec.error = e.message
    rec.status = rec.attempts >= MAX_VIDEO_ATTEMPTS ? 'failed' : 'retry'
    log(`  failed (${rec.attempts}/${MAX_VIDEO_ATTEMPTS}): ${e.message}`)
    return rec
  } finally {
    save()
  }
}

// One pass: check every channel for new uploads, process them oldest first,
// retry earlier failures, then post whatever the queue says is due.
export async function tick(state, cfg, save) {
  for (const ch of cfg.channels) {
    const c = (state.channels[ch.url] ||= { seen: [] })
    try {
      if (!c.channelId) Object.assign(c, await resolveChannel(ch.url))
      const { channelTitle, entries } = await listRecent(c.channelId)
      c.title = channelTitle || c.title
      c.lastChecked = new Date().toISOString()

      let fresh = entries.filter((e) => !c.seen.includes(e.id))
      if (!c.baselined) {
        // First look at a channel: only the newest `backfill` uploads are
        // clipped; the back catalogue is marked seen.
        const keep = new Set(entries.slice(0, cfg.backfill).map((e) => e.id))
        c.seen.push(...entries.filter((e) => !keep.has(e.id)).map((e) => e.id))
        fresh = fresh.filter((e) => keep.has(e.id))
        c.baselined = true
      }
      log(`${c.title || ch.url}: ${entries.length} in feed, ${fresh.length} new`)
      for (const e of fresh.reverse()) {
        c.seen.push(e.id)
        log(`new upload: ${e.title}`)
        await processVideo(state, cfg, { ...e, channelTitle: c.title }, save)
      }
      c.seen = c.seen.slice(-500)
    } catch (e) {
      log(`${ch.url}: ${e.message}`)
    }
    save()
  }

  for (const [id, v] of Object.entries(state.videos)) {
    if (v.status === 'retry' && v.url && Date.now() - v.lastAttempt > 30 * 60_000) {
      log(`retrying ${v.title}`)
      await processVideo(state, cfg, { id, url: v.url, title: v.title }, save)
    }
  }

  await publishDue(state, cfg, save)
}
