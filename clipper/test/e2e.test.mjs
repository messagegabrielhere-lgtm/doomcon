// End to end on a synthetic 16:9 video with synthetic captions: transcript ->
// heuristic picker -> render -> queue -> dry-run publish. No network needed.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clipper-'))
process.env.CLIPPER_DATA = path.join(tmp, 'data')
process.env.CLIPPER_CONFIG = path.join(tmp, 'config.json')
delete process.env.ANTHROPIC_API_KEY

const { loadConfig } = await import('../src/config.mjs')
const { processVideo } = await import('../src/pipeline.mjs')
const { emptyState } = await import('../src/state.mjs')

test('a local video becomes captioned 1080x1920 clips in the queue', async () => {
  const src = path.join(tmp, 'talk.mp4')
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30:duration=90',
    '-f', 'lavfi', '-i', 'sine=frequency=330:duration=90',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', src,
  ])
  const lines = 'why nobody tells you the truth about money is the biggest mistake I ever made honestly'.split(' ')
  const events = []
  for (let t = 0, i = 0; t < 88_000; t += 400, i++) {
    events.push({ tStartMs: t, dDurationMs: 400, segs: [{ utf8: lines[i % lines.length] + (i % 16 === 15 ? '?' : '') }] })
    if (i % 20 === 19) t += 800
  }
  fs.writeFileSync(path.join(tmp, 'talk.en.json3'), JSON.stringify({ events }))
  fs.writeFileSync(process.env.CLIPPER_CONFIG, JSON.stringify({ picker: 'heuristic', clipsPerVideo: 2, minClipSeconds: 15, maxClipSeconds: 30, minScore: 0 }))

  const cfg = loadConfig()
  const state = emptyState()
  const rec = await processVideo(state, cfg, { id: 'talk', file: src, title: 'Test talk' }, () => {})

  assert.equal(rec.status, 'done', rec.error)
  assert.equal(rec.clips.length, 2)
  for (const c of rec.clips) {
    const probe = JSON.parse(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', c.file]),
    )
    const v = probe.streams.find((s) => s.codec_type === 'video')
    assert.equal(v.width, 1080)
    assert.equal(v.height, 1920)
    assert.ok(probe.streams.some((s) => s.codec_type === 'audio'))
    const d = parseFloat(probe.format.duration)
    assert.ok(Math.abs(d - (c.end - c.start)) < 0.5, `rendered ${d}s for a ${c.end - c.start}s clip`)
  }
  assert.equal(state.queue.length, 2 * 3)
  assert.ok(state.queue.every((q) => q.status === 'queued'))
})
