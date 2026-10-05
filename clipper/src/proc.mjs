import { spawn } from 'node:child_process'

// Runs a command without a shell (arguments are never interpolated) and
// resolves with stdout. On a non-zero exit the error carries the stderr tail.
export function run(cmd, args, { cwd, quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => {
      err += d
      if (!quiet) process.stderr.write(d)
    })
    child.on('error', (e) =>
      reject(e.code === 'ENOENT' ? new Error(`${cmd} is not installed or not on PATH`) : e),
    )
    child.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(`${cmd} exited ${code}: ${err.trim().split('\n').slice(-6).join('\n')}`))
    })
  })
}

export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

// Arguments every yt-dlp call gets. YouTube often asks datacenter IPs (CI
// runners, VPSes) to sign in; a cookies.txt exported from a logged-in browser
// gets past that.
export function ytdlpBase() {
  const cookies = process.env.YTDLP_COOKIES_FILE
  return cookies ? ['--cookies', cookies] : []
}
