// One JSON file holds everything the watcher remembers: which uploads it has
// seen, what it cut from them, and the posting queue. Writes go through a temp
// file and a rename so a crash mid-write never leaves half a file behind.
import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './config.mjs'

const FILE = path.join(DATA, 'state.json')

export function emptyState() {
  return { channels: {}, videos: {}, queue: [], tokens: {} }
}

export function loadState() {
  if (!fs.existsSync(FILE)) return emptyState()
  return { ...emptyState(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }
}

export function saveState(state) {
  fs.mkdirSync(DATA, { recursive: true })
  const tmp = `${FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
  fs.renameSync(tmp, FILE)
}
