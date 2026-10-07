// YouTube Shorts via the YouTube Data API v3 resumable upload. A vertical
// video of three minutes or less is classified as a Short automatically.
import fs from 'node:fs'
import http from 'node:http'

const SCOPE = 'https://www.googleapis.com/auth/youtube.upload'

function creds() {
  const { YT_CLIENT_ID: id, YT_CLIENT_SECRET: secret, YT_REFRESH_TOKEN: refresh } = process.env
  if (!id || !secret || !refresh) throw new Error('YouTube: set YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN')
  return { id, secret, refresh }
}

async function accessToken() {
  const { id, secret, refresh } = creds()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${json.error_description || json.error}`)
  return json.access_token
}

export async function publish({ file, post, cfg }) {
  const token = await accessToken()
  const size = fs.statSync(file).size
  const title = `${post.title} #Shorts`.slice(0, 100)
  const meta = {
    snippet: {
      title,
      description: post.description,
      tags: post.hashtags.slice(0, 15),
      categoryId: cfg.publish.youtube.categoryId,
    },
    status: { privacyStatus: cfg.publish.youtube.privacy, selfDeclaredMadeForKids: false },
  }
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'video/mp4',
        'x-upload-content-length': String(size),
      },
      body: JSON.stringify(meta),
    },
  )
  if (!init.ok) throw new Error(`YouTube upload init ${init.status}: ${await init.text()}`)
  const location = init.headers.get('location')

  const up = await fetch(location, {
    method: 'PUT',
    headers: { 'content-type': 'video/mp4', 'content-length': String(size) },
    body: fs.readFileSync(file),
  })
  const json = await up.json()
  if (!up.ok) throw new Error(`YouTube upload ${up.status}: ${json.error?.message || JSON.stringify(json)}`)
  return { id: json.id, url: `https://www.youtube.com/shorts/${json.id}` }
}

// One-time OAuth flow: opens a loopback listener, prints the consent URL, and
// resolves with the refresh token once the browser redirects back.
export async function authorize({ id = process.env.YT_CLIENT_ID, secret = process.env.YT_CLIENT_SECRET } = {}) {
  if (!id || !secret) throw new Error('set YT_CLIENT_ID and YT_CLIENT_SECRET first (Desktop app OAuth client)')
  const port = 8085
  const redirect = `http://127.0.0.1:${port}`
  const url =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent' })
  console.log(`\nOpen this URL, sign in with the account that owns the channel, and approve:\n\n${url}\n`)
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const q = new URL(req.url, redirect).searchParams
      if (!q.get('code') && !q.get('error')) return res.end()
      res.end(q.get('code') ? 'Done - you can close this tab.' : `Error: ${q.get('error')}`)
      server.close()
      q.get('code') ? resolve(q.get('code')) : reject(new Error(q.get('error')))
    })
    server.listen(port, '127.0.0.1')
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  })
  const json = await res.json()
  if (!json.refresh_token) throw new Error(`no refresh token returned: ${JSON.stringify(json)}`)
  return json.refresh_token
}
