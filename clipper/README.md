# clipper

Watches YouTube channels. When one posts a new video, clipper downloads it, finds
the strongest self-contained moments, cuts them into 1080×1920 clips with
word-by-word captions, and posts them to YouTube Shorts, TikTok and Instagram
Reels on a schedule.

```
new upload ─► download + captions ─► Claude picks moments ─► ffmpeg: 9:16 + captions ─► queue ─► Shorts / TikTok / Reels
 (RSS poll)      (yt-dlp, json3)       (score, title, copy)    (blur fill or crop)        (spacing, daily cap)
```

## Only clip what you have the rights to

Every channel in the config needs `"rights": "own"` or `"rights": "licensed"`.
Reposting someone else's videos without permission is copyright infringement.
YouTube, TikTok and Instagram also treat it as "unoriginal" or "reused" content:
those posts are excluded from monetisation and the accounts get struck. The
legitimate versions of this are clipping your own long-form content, or joining a
creator's clipping campaign (they give permission and pay per view). The
"1M views ≈ $2,000" figure in the post that inspired this is a clipping-campaign
rate, not what the platforms' creator funds pay.

## Setup

Needs Node 20+, `ffmpeg` and `yt-dlp` on your PATH.

```bash
cd clipper
npm install
cp config.example.json config.json   # add your channel(s)
cp .env.example .env                 # add keys; see below
node src/cli.mjs tick                # one pass; dry run by default
```

`publish.dryRun` is `true` until you change it. In a dry run the clips are
rendered to `data/clips/<videoId>/` and the queue is worked through, but nothing
is uploaded. Look at the clips before you go live.

### Keys

| What | Env vars | How to get it |
|---|---|---|
| Moment picker | `ANTHROPIC_API_KEY` | console.anthropic.com. Without it clipper falls back to a basic heuristic picker. |
| YouTube Shorts | `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` | In Google Cloud console, enable YouTube Data API v3 and create an OAuth client of type *Desktop app*. Put the id and secret in `.env`, then run `node src/cli.mjs auth youtube` to get the refresh token. Unverified Google projects can only upload as private until the project passes Google's audit. |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN` | An app on developers.tiktok.com with *Content Posting API* and the `video.publish` scope. Until TikTok audits the app, posts must be `SELF_ONLY` (the default in `publish.tiktok.privacy`). |
| Instagram Reels | `IG_USER_ID`, `IG_ACCESS_TOKEN` | A professional (business or creator) Instagram account and a long-lived token with `instagram_content_publish`. |

Remove a platform from `publish.platforms` if you do not want it.

## Run it

```bash
node src/cli.mjs watch           # poll every pollMinutes, forever
node src/cli.mjs status          # channels, clips and the posting queue
node src/cli.mjs process https://www.youtube.com/watch?v=VIDEO_ID --rights own
node src/cli.mjs process ./my-video.mp4 --rights own   # local file; reads my-video.en.json3 or uses Whisper
node src/cli.mjs approve all     # when publish.requireApproval is on
```

To keep `watch` alive on a server, run it under systemd, pm2 or Docker
(`restart: always`). Or run `tick` from cron every 15 minutes; all state lives in
`data/state.json`, so separate runs pick up where the last one stopped.

On its first look at a channel, clipper marks the existing uploads as seen and
only clips what is posted after that. Set `backfill` to also clip the newest N
existing videos.

## Running on GitHub Actions

`.github/workflows/clipper.yml` runs one `tick` every 15 minutes with
`config.live.json` (YouTube Shorts only, live). State and queued clips are
carried between runs in the Actions cache. Until it is configured, each run logs
a notice and exits.

1. **Google Cloud:** create a project, enable *YouTube Data API v3*, set up the
   OAuth consent screen (add yourself as a test user), and create an OAuth
   client of type *Desktop app*.
2. **Refresh token, on your own computer:**
   ```bash
   cd clipper && npm install
   YT_CLIENT_ID=... YT_CLIENT_SECRET=... node src/cli.mjs auth youtube
   ```
   Sign in with the Google account that owns the channel you post to.
3. **Repo settings → Secrets and variables → Actions:**
   - variable `CLIPPER_CHANNEL_URL`: the channel to watch, e.g. `https://www.youtube.com/@yourhandle`
   - variable `CLIPPER_CHANNEL_RIGHTS`: `own` if it is your channel, `licensed` if
     you have written permission to repost it. The workflow will not run without it.
   - secrets `ANTHROPIC_API_KEY`, `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`
4. **Actions → clipper → Run workflow** for the first run. The run summary shows
   the channel, any clips and the queue.

The first run only baselines the channel; the next upload after that is the
first one clipped. If runs fail with "Sign in to confirm you're not a bot",
export a `cookies.txt` from a browser logged in to YouTube and save its contents
as the secret `YTDLP_COOKIES`. While the Google project is unverified, YouTube
keeps API uploads private; submit the project for an audit to post publicly.

Changing `CLIPPER_CHANNEL_URL` to another channel does not carry the rights over;
set `CLIPPER_CHANNEL_RIGHTS` for the new channel too.

## Config

| Key | Default | Meaning |
|---|---|---|
| `clipsPerVideo` | 3 | Clips cut from each upload |
| `minClipSeconds` / `maxClipSeconds` | 20 / 59 | Clip length limits |
| `minScore` | 60 | Moments the picker scores below this are dropped, so a dull video yields fewer clips |
| `minSourceSeconds` | 180 | Uploads shorter than this (Shorts) are skipped |
| `model` / `effort` | `claude-opus-5-5` / `medium` | Model that picks moments |
| `render.layout` | `blur` | `blur` keeps the whole frame over a blurred fill; `crop` centre-crops to full screen (best for one centred speaker) |
| `render.font`, `fontSize`, `uppercase`, `highlightColor`, `wordsPerLine`, `captionY` | | Caption look. `captionY` is the caption baseline as a fraction of the height |
| `render.hookTitle` | true | Shows the clip title as a banner for the first 3 seconds |
| `publish.spacingMinutes` | 90 | Minimum gap between posts on one platform |
| `publish.maxPerDayPerPlatform` | 6 | Cap per platform in any 24 hours |
| `publish.requireApproval` | false | Hold clips until `approve` |
| `publish.creditSource` | true | Append the full video's title and link to the post text |

## How it works

- **Detecting uploads.** Each channel URL is resolved to its channel id once with
  yt-dlp, then polled through YouTube's public RSS feed (no API key, no quota).
- **Transcript.** yt-dlp fetches YouTube's own captions in json3, which carry a
  timestamp per word for auto-captions. If a video has none, the OpenAI Whisper
  CLI is used when it is installed (`pip install openai-whisper`).
- **Picking moments.** Claude reads the timestamped transcript and returns
  candidate clips with a score, an on-screen hook title, post copy and hashtags,
  as structured JSON. clipper snaps the times onto word boundaries, enforces the
  length limits, drops overlaps and low scores, and keeps the best.
- **Rendering.** One ffmpeg pass per clip: cut, 9:16 layout, burned-in ASS
  captions (three words at a time, the spoken word highlighted), loudness
  normalised to −14 LUFS, H.264/AAC with faststart.
- **Posting.** Clips go into a queue, one item per platform, spaced out and
  capped per day. Failed uploads are retried up to three times with back-off.
  YouTube uses the Data API resumable upload, TikTok the Content Posting API
  (chunked FILE_UPLOAD), Instagram the Graph API resumable Reels upload.

## Tests

```bash
npm test
```

Unit tests cover the feed parser, caption parsing, moment normalisation, the
caption file, TikTok chunking and the queue. The end-to-end test renders clips
from a synthetic video and checks they are 1080×1920 with audio and the right
length. Neither needs network access or API keys.
