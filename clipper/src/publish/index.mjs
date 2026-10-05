// The posting queue. Each rendered clip becomes one queue item per platform.
// Items are spaced `spacingMinutes` apart per platform and capped at
// `maxPerDayPerPlatform` in any 24 hours, so a channel that uploads three
// videos at once does not dump nine clips on each account in a minute.
import fs from 'node:fs'
import { log } from '../proc.mjs'
import * as youtube from './youtube.mjs'
import * as tiktok from './tiktok.mjs'
import * as instagram from './instagram.mjs'

const PUBLISHERS = { youtube, tiktok, instagram }
const DAY = 24 * 3600_000
const MAX_ATTEMPTS = 3

export function describe(clip, video, cfg) {
  const tags = clip.hashtags.map((h) => `#${h}`).join(' ')
  const credit = cfg.publish.creditSource ? `\n\nFull video: ${video.title} ${video.url}` : ''
  return { title: clip.title, hashtags: clip.hashtags, description: `${clip.caption}\n\n${tags}${credit}`.trim() }
}

export function enqueue(state, cfg, { clipId, videoId, file, post }, now = Date.now()) {
  const spacing = cfg.publish.spacingMinutes * 60_000
  for (const platform of cfg.publish.platforms) {
    if (!PUBLISHERS[platform]) throw new Error(`unknown platform ${platform}`)
    const last = state.queue
      .filter((q) => q.platform === platform && q.status !== 'failed')
      .reduce((m, q) => Math.max(m, q.notBefore), now - spacing)
    state.queue.push({
      id: `${clipId}:${platform}`,
      clipId,
      videoId,
      platform,
      file,
      post,
      status: cfg.publish.requireApproval ? 'awaiting_approval' : 'queued',
      notBefore: Math.max(now, last + spacing),
      attempts: 0,
    })
  }
}

// Once every platform has had its turn with a clip, the mp4 is not needed.
function removeIfDone(state, file) {
  const pending = state.queue.some((q) => q.file === file && !['posted', 'failed'].includes(q.status))
  if (!pending) fs.rmSync(file, { force: true })
}

// Keeps the queue from growing forever: finished items older than 30 days go.
export function prune(state, now = Date.now()) {
  state.queue = state.queue.filter(
    (q) => !['posted', 'failed'].includes(q.status) || now - (q.postedAt || q.notBefore) < 30 * DAY,
  )
}

export async function publishDue(state, cfg, save, now = Date.now()) {
  prune(state, now)
  for (const item of state.queue) {
    if (item.status !== 'queued' || item.notBefore > now) continue
    const recent = state.queue.filter(
      (q) => q.platform === item.platform && q.status === 'posted' && now - q.postedAt < DAY,
    ).length
    if (recent >= cfg.publish.maxPerDayPerPlatform) continue
    if (!fs.existsSync(item.file)) {
      item.status = 'failed'
      item.error = `file missing: ${item.file}`
      continue
    }

    item.attempts++
    try {
      if (cfg.publish.dryRun) {
        item.result = { dryRun: true }
        log(`  [dry run] would post ${item.clipId} to ${item.platform}: "${item.post.title}"`)
      } else {
        log(`  posting ${item.clipId} to ${item.platform}…`)
        item.result = await PUBLISHERS[item.platform].publish({ file: item.file, post: item.post, cfg, state })
        log(`  posted ${item.clipId} to ${item.platform}: ${item.result.url || item.result.id}`)
      }
      item.status = 'posted'
      item.postedAt = Date.now()
      delete item.error
      if (!cfg.publish.dryRun) removeIfDone(state, item.file)
    } catch (e) {
      item.error = e.message
      if (item.attempts >= MAX_ATTEMPTS) item.status = 'failed'
      else item.notBefore = Date.now() + item.attempts * 30 * 60_000
      log(`  ${item.platform} failed for ${item.clipId} (attempt ${item.attempts}): ${e.message}`)
    }
    save()
  }
}
