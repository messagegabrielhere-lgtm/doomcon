import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assColor, assTime, buildAss, chunk } from '../src/captions.mjs'
import { normalise, pickHeuristic } from '../src/pick.mjs'
import { enqueue, publishDue } from '../src/publish/index.mjs'
import { chunkPlan } from '../src/publish/tiktok.mjs'
import { parseJson3, timestamped } from '../src/transcript.mjs'
import { parseFeed } from '../src/watch.mjs'

const cfg = {
  clipsPerVideo: 2,
  minClipSeconds: 20,
  maxClipSeconds: 59,
  minScore: 50,
  publish: { platforms: ['youtube', 'tiktok'], spacingMinutes: 60, maxPerDayPerPlatform: 1, requireApproval: false, dryRun: true },
}

// 200 words, one every 0.4 s, with a pause every 25 words.
function words(n = 200) {
  const out = []
  let t = 0
  for (let i = 0; i < n; i++) {
    if (i && i % 25 === 0) t += 1
    out.push({ w: i % 25 === 24 ? `word${i}.` : `word${i}`, s: t, e: t + 0.35 })
    t += 0.4
  }
  return out
}

test('parseFeed reads ids, titles and the channel name', () => {
  const xml = `<feed><author><name>Tom &amp; Co</name></author>
    <entry><yt:videoId>abc123def45</yt:videoId><title>Why &quot;X&quot; fails</title><published>2026-10-01T00:00:00+00:00</published></entry>
    <entry><yt:videoId>zzz</yt:videoId><title>Two</title></entry></feed>`
  const { channelTitle, entries } = parseFeed(xml)
  assert.equal(channelTitle, 'Tom & Co')
  assert.deepEqual(entries.map((e) => e.id), ['abc123def45', 'zzz'])
  assert.equal(entries[0].title, 'Why "X" fails')
  assert.equal(entries[0].url, 'https://www.youtube.com/watch?v=abc123def45')
})

test('parseJson3 handles per-word offsets, line captions and noise', () => {
  const json = {
    events: [
      { tStartMs: 0, dDurationMs: 3000, segs: [{ utf8: 'hello' }, { utf8: ' big', tOffsetMs: 500 }, { utf8: ' world', tOffsetMs: 1000 }] },
      { tStartMs: 2000, dDurationMs: 10, aAppend: 1, segs: [{ utf8: '\n' }] },
      { tStartMs: 4000, dDurationMs: 2000, segs: [{ utf8: '[Music] two words' }] },
    ],
  }
  const w = parseJson3(json)
  assert.deepEqual(w.map((x) => x.w), ['hello', 'big', 'world', 'two', 'words'])
  assert.equal(w[1].s, 0.5)
  assert.equal(w[0].e, 0.5)
  assert.ok(w[2].e <= w[2].s + 1.5, 'long words are capped')
  assert.ok(w[3].s >= 4 && w[4].s > w[3].s)
})

test('timestamped breaks on pauses', () => {
  const t = timestamped(words(30))
  assert.match(t, /^\[0\.0\] word0/)
  assert.match(t, /\n\[1[01]\.\d\] word25/)
})

test('normalise snaps to words, enforces length, drops overlaps and low scores', () => {
  const w = words()
  const out = normalise(
    [
      { start: 3.1, end: 10, score: 90, title: 'a', caption: '', hashtags: ['#one', 'two words'] },
      { start: 5, end: 40, score: 80, title: 'overlaps a', caption: '', hashtags: [] },
      { start: 50, end: 200, score: 70, title: 'too long', caption: '', hashtags: [] },
      { start: 30, end: 55, score: 10, title: 'low', caption: '', hashtags: [] },
    ],
    w,
    cfg,
  )
  assert.equal(out.length, 2)
  assert.deepEqual(out[0].hashtags, ['one', 'twowords'])
  for (const c of out) {
    const d = c.end - c.start
    assert.ok(d >= 20 * 0.9 && d <= 59 + 0.5, `duration ${d}`)
  }
  assert.ok(w.some((x) => Math.abs(x.s - 0.15 - out[0].start) < 0.01), 'start sits just before a word')
})

test('heuristic picker returns scored candidates inside the length limits', () => {
  const c = pickHeuristic({ words: words(), cfg })
  assert.ok(c.length > 0)
  assert.equal(Math.max(...c.map((x) => x.score)), 100)
  for (const x of c) assert.ok(x.end - x.start >= 20 && x.end - x.start <= 59)
})

test('captions: colours, times, line chunks and escaping', () => {
  assert.equal(assColor('#FFE500'), '&H0000E5FF')
  assert.equal(assTime(3725.456), '1:02:05.46')
  const lines = chunk(words(10), 3)
  assert.deepEqual(lines.map((l) => l.length), [3, 3, 3, 1])
  const ass = buildAss([{ w: 'a{b}\\c', s: 10, e: 10.5 }, { w: 'next', s: 10.5, e: 11 }], {
    offset: 10,
    duration: 5,
    title: 'Hook',
    style: { font: 'X', fontSize: 80, highlightColor: '#FFFFFF', captionY: 0.7, uppercase: true, wordsPerLine: 3, hookTitle: true },
  })
  assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:00\.50,Caption,,0,0,0,,\{\\c&H00FFFFFF\\fscx108\\fscy108\}AB\\\\C\{\\r\} NEXT/)
  assert.match(ass, /Hook,,0,0,0,,\{\\fad\(150,250\)\}Hook/)
})

test('tiktok chunk plan follows the 5-64 MB rule', () => {
  const MB = 1024 * 1024
  assert.deepEqual(chunkPlan(3 * MB), { chunkSize: 3 * MB, count: 1 })
  assert.deepEqual(chunkPlan(64 * MB), { chunkSize: 64 * MB, count: 1 })
  assert.deepEqual(chunkPlan(105 * MB), { chunkSize: 10 * MB, count: 10 })
})

test('queue spaces posts per platform and respects the daily cap', async () => {
  const state = { queue: [] }
  const now = 1_000_000_000
  enqueue(state, cfg, { clipId: 'v-1', videoId: 'v', file: '/dev/null', post: { title: 't' } }, now)
  enqueue(state, cfg, { clipId: 'v-2', videoId: 'v', file: '/dev/null', post: { title: 't' } }, now)
  const yt = state.queue.filter((q) => q.platform === 'youtube')
  assert.equal(yt[0].notBefore, now)
  assert.equal(yt[1].notBefore, now + 60 * 60_000)

  await publishDue(state, cfg, () => {}, now + 2 * 3600_000)
  // Both are due, but the cap is one per platform per day.
  assert.equal(state.queue.filter((q) => q.status === 'posted').length, 2)
  assert.equal(state.queue.filter((q) => q.status === 'queued').length, 2)
})
