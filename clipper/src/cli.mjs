#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from './config.mjs'
import { processVideo, tick } from './pipeline.mjs'
import { log } from './proc.mjs'
import { publishDue } from './publish/index.mjs'
import { authorize } from './publish/youtube.mjs'
import { setupGithub } from './setup.mjs'
import { loadState, saveState } from './state.mjs'

const HELP = `clipper - turn new YouTube uploads into captioned Shorts, Reels and TikToks

  watch                  poll every pollMinutes, forever
  tick                   one pass: check channels, clip new uploads, post what is due
  process <url|file> --rights own|licensed
                         clip one video now (a local .mp4 reads <name>.<lang>.json3
                         captions from its folder, or uses Whisper)
  publish                post whatever in the queue is due
  status                 channels, recent videos and the posting queue
  approve <id|all>       release clips held by publish.requireApproval
  retry <id>             re-queue a failed post
  auth youtube           one-time OAuth flow that prints YT_REFRESH_TOKEN
  setup                  on your own computer: sign in to YouTube, store every key the
                         GitHub workflow needs as repo secrets, and start the first run

config.json (copy config.example.json) and .env sit next to package.json.`

const [cmd, ...args] = process.argv.slice(2)
const cfg = loadConfig()
const state = loadState()
const save = () => saveState(state)

function flag(name) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

function printStatus() {
  console.log(`mode: ${cfg.publish.dryRun ? 'DRY RUN (nothing is posted)' : 'LIVE'}  platforms: ${cfg.publish.platforms.join(', ')}\n`)
  for (const ch of cfg.channels) {
    const c = state.channels[ch.url] || {}
    console.log(`channel ${c.title || ch.url}  last checked ${c.lastChecked || 'never'}`)
  }
  console.log('\nvideos')
  for (const [id, v] of Object.entries(state.videos).slice(-15)) {
    console.log(`  ${v.status.padEnd(10)} ${id}  ${v.title || ''}${v.error ? `  (${v.error})` : ''}${v.reason ? `  (${v.reason})` : ''}`)
    for (const c of v.clips || []) console.log(`             ${c.id}  ${(c.end - c.start).toFixed(0)}s  score ${c.score}  "${c.title}"`)
  }
  console.log('\nqueue')
  for (const q of state.queue.slice(-40)) {
    const when = q.status === 'posted' ? new Date(q.postedAt).toISOString() : new Date(q.notBefore).toISOString()
    const where = q.result?.url || (q.result?.dryRun ? 'dry run' : q.error || '')
    console.log(`  ${q.status.padEnd(17)} ${when.slice(0, 16)}  ${q.id.padEnd(28)} ${where}`)
  }
}

switch (cmd) {
  case 'watch': {
    if (!cfg.channels.length) throw new Error(`no channels in ${cfg.file}`)
    log(`watching ${cfg.channels.length} channel(s) every ${cfg.pollMinutes} min${cfg.publish.dryRun ? ' (dry run)' : ''}`)
    for (;;) {
      await tick(state, cfg, save)
      await new Promise((r) => setTimeout(r, cfg.pollMinutes * 60_000))
    }
  }
  case 'tick':
    await tick(state, cfg, save)
    break
  case 'process': {
    const target = args[0]
    const rights = flag('rights')
    if (!target || !['own', 'licensed'].includes(rights)) {
      console.error('usage: process <url|file> --rights own|licensed')
      process.exit(1)
    }
    let video
    if (fs.existsSync(target)) {
      const file = path.resolve(target)
      video = { id: path.parse(file).name.replace(/[^\w-]/g, '_'), file, title: flag('title') || path.parse(file).name }
    } else {
      const id = new URL(target).searchParams.get('v') || target.split('/').pop().split('?')[0]
      video = { id, url: `https://www.youtube.com/watch?v=${id}`, title: '' }
    }
    const rec = await processVideo(state, cfg, video, save)
    if (rec.status === 'done') await publishDue(state, cfg, save)
    break
  }
  case 'publish':
    await publishDue(state, cfg, save)
    break
  case 'status':
    printStatus()
    break
  case 'approve': {
    const items = state.queue.filter((q) => q.status === 'awaiting_approval' && (args[0] === 'all' || q.id.startsWith(args[0])))
    items.forEach((q) => (q.status = 'queued'))
    save()
    console.log(`approved ${items.length} item(s)`)
    break
  }
  case 'retry': {
    const items = state.queue.filter((q) => q.status === 'failed' && q.id.startsWith(args[0]))
    items.forEach((q) => Object.assign(q, { status: 'queued', attempts: 0, notBefore: Date.now() }))
    save()
    console.log(`re-queued ${items.length} item(s)`)
    break
  }
  case 'auth':
    if (args[0] !== 'youtube') throw new Error('only "auth youtube" is interactive; see README for TikTok and Instagram tokens')
    console.log(`\nAdd this to clipper/.env:\nYT_REFRESH_TOKEN=${await authorize()}`)
    break
  case 'setup':
    await setupGithub()
    break
  default:
    console.log(HELP)
}
