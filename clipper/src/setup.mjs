// `clipper setup`: everything the GitHub workflow needs, in one command run on
// your own computer. It asks for the channel and keys, runs the YouTube sign-in,
// checks the keys work, stores them as repo variables and secrets with the
// GitHub CLI, and starts the first run. Values go to `gh` on stdin, never on a
// command line, and nothing is written to disk.
import Anthropic from '@anthropic-ai/sdk'
import { spawn } from 'node:child_process'
import { Writable } from 'node:stream'
import readline from 'node:readline/promises'
import { authorize } from './publish/youtube.mjs'

function gh(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => reject(e.code === 'ENOENT' ? new Error('install the GitHub CLI first: https://cli.github.com') : e))
    child.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`gh ${args[0]} ${args[1] || ''}: ${err.trim()}`))))
    if (input !== undefined) child.stdin.end(input)
  })
}

// Prompts read from a line queue rather than rl.question(), so answers that
// arrive before their prompt (pasted or piped input) are not dropped. Secrets
// are typed into a muted output stream, so nothing is echoed (like sudo).
export function prompter() {
  let muted = false
  const output = new Writable({
    write(chunk, encoding, done) {
      if (!muted) process.stdout.write(chunk, encoding)
      done()
    },
  })
  const rl = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) })
  const lines = []
  const waiting = []
  rl.on('line', (l) => (waiting.length ? waiting.shift().resolve(l) : lines.push(l)))
  rl.on('close', () => waiting.splice(0).forEach((w) => w.reject(new Error('input ended before setup finished'))))
  const next = () => (lines.length ? Promise.resolve(lines.shift()) : new Promise((resolve, reject) => waiting.push({ resolve, reject })))

  async function ask(question, { secret = false, fallback } = {}) {
    const prompt = `${question}${fallback ? ' [Enter keeps the value already set]' : ''}${secret ? ' (hidden)' : ''}: `
    process.stdout.write(prompt)
    muted = secret
    try {
      return (await next()).trim() || fallback
    } finally {
      muted = false
      if (secret || !process.stdin.isTTY) process.stdout.write('\n')
    }
  }
  return { ask, close: () => rl.close() }
}

async function repoName() {
  const i = process.argv.indexOf('--repo')
  if (i >= 0) return process.argv[i + 1]
  return gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])
}

export async function setupGithub() {
  await gh(['auth', 'status']).catch(() => {
    throw new Error('sign in to the GitHub CLI first: gh auth login')
  })
  const repo = await repoName()
  console.log(`Setting up the clipper workflow in ${repo}.\n`)
  console.log('You need a Google OAuth client first (about 5 minutes, once):')
  console.log('  1. https://console.cloud.google.com -> create a project')
  console.log('  2. APIs & Services -> Library -> "YouTube Data API v3" -> Enable')
  console.log('  3. OAuth consent screen -> External -> add your Google account as a test user')
  console.log('  4. Credentials -> Create credentials -> OAuth client ID -> Desktop app\n')

  const { ask, close } = prompter()
  let values
  try {
    const url = await ask('YouTube channel URL to clip (e.g. https://www.youtube.com/@you)')
    if (!/^https:\/\/(www\.)?youtube\.com\/(@[\w.-]+|channel\/UC[\w-]{22}|c\/[\w.-]+)\/?$/.test(url || '')) {
      throw new Error(`that does not look like a YouTube channel URL: ${url}`)
    }
    const rights = await ask('Is it your channel ("own") or one you have written permission to repost ("licensed")?')
    if (!['own', 'licensed'].includes(rights)) throw new Error('answer "own" or "licensed"; clipper will not clip other channels')
    const anthropic = await ask('Anthropic API key (console.anthropic.com)', { secret: true, fallback: process.env.ANTHROPIC_API_KEY })
    const id = await ask('Google OAuth client ID', { fallback: process.env.YT_CLIENT_ID })
    const secret = await ask('Google OAuth client secret', { secret: true, fallback: process.env.YT_CLIENT_SECRET })
    if (!anthropic || !id || !secret) throw new Error('all three keys are needed')
    values = { url, rights, anthropic, id, secret }
  } finally {
    close()
  }

  process.stdout.write('Checking the Anthropic key… ')
  await new Anthropic({ apiKey: values.anthropic }).models.retrieve('claude-opus-5-5')
  console.log('ok')

  const refresh = await authorize({ id: values.id, secret: values.secret })
  process.stdout.write('Checking the YouTube token… ')
  const check = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: values.id, client_secret: values.secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  })
  if (!check.ok) throw new Error(`YouTube token does not work: ${await check.text()}`)
  console.log('ok')

  console.log(`Saving to ${repo}…`)
  await gh(['variable', 'set', 'CLIPPER_CHANNEL_URL', '--repo', repo, '--body', values.url])
  await gh(['variable', 'set', 'CLIPPER_CHANNEL_RIGHTS', '--repo', repo, '--body', values.rights])
  for (const [name, value] of [
    ['ANTHROPIC_API_KEY', values.anthropic],
    ['YT_CLIENT_ID', values.id],
    ['YT_CLIENT_SECRET', values.secret],
    ['YT_REFRESH_TOKEN', refresh],
  ]) {
    await gh(['secret', 'set', name, '--repo', repo], value)
    console.log(`  secret ${name} set`)
  }

  await gh(['workflow', 'run', 'clipper.yml', '--repo', repo])
  console.log(`\nDone. The first run has started: https://github.com/${repo}/actions/workflows/clipper.yml`)
  console.log('It only records the videos already on the channel; your next upload is the first one clipped.')
}
