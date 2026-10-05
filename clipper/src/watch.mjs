// Detects new uploads. A channel URL is resolved to its channel id once (via
// yt-dlp, so @handles, /c/ and /channel/ URLs all work); after that each poll
// reads the channel's public RSS feed, which is cheap and needs no API key.
import { run } from './proc.mjs'

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

export function parseFeed(xml) {
  const entries = []
  for (const [, body] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
    if (!id) continue
    entries.push({
      id,
      title: decode(body.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
      published: body.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
      url: `https://www.youtube.com/watch?v=${id}`,
    })
  }
  const channelTitle = decode(xml.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? '')
  return { channelTitle, entries }
}

export async function resolveChannel(url) {
  const m = url.match(/\/channel\/(UC[\w-]{22})/)
  if (m) return { channelId: m[1], title: null }
  const base = url.replace(/\/(videos|shorts|streams|featured)\/?$/, '')
  const json = JSON.parse(
    await run('yt-dlp', ['--flat-playlist', '-J', '--playlist-items', '1', `${base}/videos`]),
  )
  const channelId = json.channel_id || (json.id?.startsWith('UC') ? json.id : null)
  if (!channelId) throw new Error(`could not resolve a channel id for ${url}`)
  return { channelId, title: json.channel || json.uploader || json.title || null }
}

export async function listRecent(channelId) {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { 'user-agent': 'clipper/0.1 (+https://github.com/messagegabrielhere-lgtm/doomcon)' },
    signal: AbortSignal.timeout(20_000),
  })
  if (res.ok) return parseFeed(await res.text())

  // The feed occasionally 404s or 5xxs for hours; fall back to a flat listing.
  const json = JSON.parse(
    await run('yt-dlp', [
      '--flat-playlist',
      '-J',
      '--playlist-items',
      '1:15',
      `https://www.youtube.com/channel/${channelId}/videos`,
    ]),
  )
  return {
    channelTitle: json.channel || json.title || '',
    entries: (json.entries || []).map((e) => ({
      id: e.id,
      title: e.title,
      published: null,
      url: `https://www.youtube.com/watch?v=${e.id}`,
    })),
  }
}
