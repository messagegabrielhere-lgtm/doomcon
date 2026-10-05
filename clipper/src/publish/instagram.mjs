// Instagram Reels via the Instagram Graph API, using the resumable upload
// endpoint so the clip does not need to be hosted at a public URL first.
import fs from 'node:fs'

function creds() {
  const { IG_USER_ID: user, IG_ACCESS_TOKEN: token } = process.env
  if (!user || !token) throw new Error('Instagram: set IG_USER_ID and IG_ACCESS_TOKEN')
  return { user, token }
}

async function graph(url, init) {
  const res = await fetch(url, init)
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(`Instagram ${res.status}: ${json.error?.message || JSON.stringify(json)}`)
  return json
}

export async function publish({ file, post, cfg }) {
  const { user, token } = creds()
  const v = cfg.publish.instagram.graphVersion
  const base = `https://graph.facebook.com/${v}`

  const container = await graph(`${base}/${user}/media`, {
    method: 'POST',
    body: new URLSearchParams({
      media_type: 'REELS',
      upload_type: 'resumable',
      caption: post.description.slice(0, 2200),
      share_to_feed: String(cfg.publish.instagram.shareToFeed),
      access_token: token,
    }),
  })

  const size = fs.statSync(file).size
  await graph(`https://rupload.facebook.com/ig-api-upload/${v}/${container.id}`, {
    method: 'POST',
    headers: { authorization: `OAuth ${token}`, offset: '0', file_size: String(size) },
    body: fs.readFileSync(file),
  })

  for (let i = 0; ; i++) {
    const s = await graph(`${base}/${container.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`)
    if (s.status_code === 'FINISHED') break
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram processing ${s.status_code}: ${s.status}`)
    if (i >= 60) throw new Error('Instagram processing timed out after 5 minutes')
    await new Promise((r) => setTimeout(r, 5000))
  }

  const published = await graph(`${base}/${user}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: container.id, access_token: token }),
  })
  const info = await graph(`${base}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`).catch(() => ({}))
  return { id: published.id, url: info.permalink }
}
