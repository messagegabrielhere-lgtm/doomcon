import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DATA = process.env.CLIPPER_DATA || path.join(ROOT, 'data')

const DEFAULTS = {
  channels: [],
  pollMinutes: 15,
  backfill: 0,
  minSourceSeconds: 180,
  clipsPerVideo: 3,
  minClipSeconds: 20,
  maxClipSeconds: 59,
  minScore: 60,
  picker: 'claude',
  model: 'claude-opus-5-5',
  effort: 'medium',
  captionLanguage: 'en',
  render: {
    layout: 'blur',
    font: 'DejaVu Sans',
    fontSize: 84,
    uppercase: true,
    highlightColor: '#FFE500',
    wordsPerLine: 3,
    captionY: 0.68,
    hookTitle: true,
    loudnorm: true,
  },
  keepSource: false,
  publish: {
    dryRun: true,
    requireApproval: false,
    platforms: ['youtube', 'tiktok', 'instagram'],
    spacingMinutes: 90,
    maxPerDayPerPlatform: 6,
    creditSource: true,
    youtube: { privacy: 'public', categoryId: '22' },
    tiktok: { privacy: 'SELF_ONLY' },
    instagram: { graphVersion: 'v23.0', shareToFeed: true },
  },
}

const RIGHTS = new Set(['own', 'licensed'])

function merge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over ?? base
  const out = { ...base }
  for (const [k, v] of Object.entries(over)) {
    out[k] = base && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], v) : v
  }
  return out
}

export function loadEnv() {
  const file = path.join(ROOT, '.env')
  if (fs.existsSync(file) && typeof process.loadEnvFile === 'function') process.loadEnvFile(file)
}

export function loadConfig(file = process.env.CLIPPER_CONFIG || path.join(ROOT, 'config.json')) {
  loadEnv()
  let user = {}
  if (fs.existsSync(file)) user = JSON.parse(fs.readFileSync(file, 'utf8'))
  const cfg = merge(DEFAULTS, user)
  cfg.file = file

  // Lets a CI runner supply the channel without committing it to the config:
  // CLIPPER_CHANNEL_URL plus CLIPPER_CHANNEL_RIGHTS (own | licensed).
  if (process.env.CLIPPER_CHANNEL_URL) {
    const urls = process.env.CLIPPER_CHANNEL_URL.split(/[\s,]+/).filter(Boolean)
    cfg.channels = urls.map((url) => ({ url, rights: process.env.CLIPPER_CHANNEL_RIGHTS }))
  }

  for (const ch of cfg.channels) {
    if (!RIGHTS.has(ch.rights)) {
      throw new Error(
        `channel ${ch.url}: set "rights" to "own" or "licensed". ` +
          'Only clip channels you own or have written permission to repost.',
      )
    }
  }
  if (cfg.minClipSeconds >= cfg.maxClipSeconds) throw new Error('minClipSeconds must be below maxClipSeconds')
  return cfg
}
