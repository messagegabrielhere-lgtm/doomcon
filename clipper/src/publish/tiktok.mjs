// TikTok via the Content Posting API (direct post, FILE_UPLOAD source).
//
// TikTok access tokens last 24 hours and every refresh returns a new refresh
// token, so the newest one is kept in state.tokens and preferred over .env.
// Until TikTok audits your app, direct posts must use privacy SELF_ONLY.
import fs from 'node:fs'

const API = 'https://open.tiktokapis.com/v2'
const MB = 1024 * 1024

async function accessToken(state) {
  const key = process.env.TIKTOK_CLIENT_KEY
  const secret = process.env.TIKTOK_CLIENT_SECRET
  const refresh = state.tokens.tiktokRefresh || process.env.TIKTOK_REFRESH_TOKEN
  if (!key || !secret || !refresh) throw new Error('TikTok: set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_REFRESH_TOKEN')
  const cached = state.tokens.tiktokAccess
  if (cached && cached.expires > Date.now() + 5 * 60_000) return cached.token
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secret, grant_type: 'refresh_token', refresh_token: refresh }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`TikTok token refresh failed: ${json.error_description || json.error || res.status}`)
  state.tokens.tiktokRefresh = json.refresh_token
  state.tokens.tiktokAccess = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

async function api(token, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.error?.code && json.error.code !== 'ok') throw new Error(`TikTok ${endpoint}: ${json.error.code} ${json.error.message}`)
  return json.data
}

// TikTok wants chunks of 5-64 MB; the final chunk absorbs the remainder (up
// to 128 MB). Files under 64 MB go up as a single chunk.
export function chunkPlan(size) {
  if (size <= 64 * MB) return { chunkSize: size, count: 1 }
  const chunkSize = 10 * MB
  return { chunkSize, count: Math.floor(size / chunkSize) }
}

export async function publish({ file, post, cfg, state }) {
  const token = await accessToken(state)
  const creator = await api(token, '/post/publish/creator_info/query/', {})
  const privacy = cfg.publish.tiktok.privacy
  if (creator.privacy_level_options && !creator.privacy_level_options.includes(privacy)) {
    throw new Error(`TikTok: privacy ${privacy} not allowed for this account (allowed: ${creator.privacy_level_options.join(', ')})`)
  }
  const size = fs.statSync(file).size
  const { chunkSize, count } = chunkPlan(size)
  const init = await api(token, '/post/publish/video/init/', {
    post_info: {
      title: post.description.slice(0, 2200),
      privacy_level: privacy,
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
    },
    source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunkSize, total_chunk_count: count },
  })

  const fd = fs.openSync(file, 'r')
  try {
    for (let i = 0; i < count; i++) {
      const start = i * chunkSize
      const end = i === count - 1 ? size : start + chunkSize
      const buf = Buffer.alloc(end - start)
      fs.readSync(fd, buf, 0, buf.length, start)
      const res = await fetch(init.upload_url, {
        method: 'PUT',
        headers: {
          'content-type': 'video/mp4',
          'content-length': String(buf.length),
          'content-range': `bytes ${start}-${end - 1}/${size}`,
        },
        body: buf,
      })
      if (!res.ok) throw new Error(`TikTok chunk ${i + 1}/${count} upload ${res.status}: ${await res.text()}`)
    }
  } finally {
    fs.closeSync(fd)
  }

  for (let i = 0; i < 60; i++) {
    const s = await api(token, '/post/publish/status/fetch/', { publish_id: init.publish_id })
    if (s.status === 'PUBLISH_COMPLETE') {
      const id = s.publicaly_available_post_id?.[0] || s.publicly_available_post_id?.[0]
      return { id: id || init.publish_id, publishId: init.publish_id, privacy }
    }
    if (s.status === 'FAILED') throw new Error(`TikTok publish failed: ${s.fail_reason}`)
    await new Promise((r) => setTimeout(r, 5000))
  }
  // Still processing after five minutes; TikTok finishes it on its own.
  return { id: init.publish_id, publishId: init.publish_id, privacy, pending: true }
}
