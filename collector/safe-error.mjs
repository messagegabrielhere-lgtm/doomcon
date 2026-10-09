// Public-facing error sanitiser.
//
// Anything that writes an error into data/, arena-data, a receipt, a workflow
// annotation, or a page a visitor can open MUST go through publicError().
// Stacks, absolute paths, and secret-shaped substrings never leave the runner.
//
// Operators still see the full Error on stderr / Actions logs (which are
// private to the repo). Visitors and the public JSON API see a short, safe line.

const SECRETISH = [
  /\bsk-ant-[A-Za-z0-9_-]{8,}/g,
  /\bsk-(?:proj-)?[A-Za-z0-9]{16,}/g,
  /\bxai-[A-Za-z0-9]{16,}/g,
  /\bghp_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\bBearer\s+[A-Za-z0-9._\-+=\/]{8,}/gi,
  /\b(api[_-]?key|access[_-]?token|client[_-]?secret|refresh[_-]?token)\s*[:=]\s*\S+/gi,
];

const ABS_PATH = /(?:\/(?:home|Users|var|tmp|opt|workspace|runner)\/[^\s:)"']+|file:\/\/\/[^\s:)"']+)/g;
const STACK_LINE = /^\s+at\s+.+$/gm;

/**
 * Turn any thrown value into a short string safe for public JSON / HTML.
 * Never returns a stack. Caps length. Redacts secret-shaped text and paths.
 */
export function publicError(err, { max = 240, fallback = 'internal error' } = {}) {
  let msg = '';
  if (err == null) msg = fallback;
  else if (typeof err === 'string') msg = err;
  else if (typeof err.message === 'string' && err.message.trim()) msg = err.message;
  else msg = String(err);

  msg = msg.replace(STACK_LINE, '');
  msg = msg.split('\n')[0] || fallback;
  for (const re of SECRETISH) msg = msg.replace(re, '[redacted]');
  msg = msg.replace(ABS_PATH, '[path]');
  msg = msg.replace(/\s+/g, ' ').trim();
  if (!msg) msg = fallback;
  if (msg.length > max) msg = `${msg.slice(0, max - 1)}…`;
  return msg;
}

/** Shape for JSON that might be committed or served. Never includes .stack. */
export function publicErrorObject(err, extra = {}) {
  const out = { error: publicError(err), ...extra };
  if (err && typeof err === 'object') {
    if (typeof err.kind === 'string') out.kind = err.kind;
    if (Number.isFinite(err.status)) out.status = err.status;
  }
  return out;
}
