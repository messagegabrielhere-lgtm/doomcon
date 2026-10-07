// Escaping and formatting primitives. Not a page template - the leading
// underscore marks the modules in this directory that do not export render().

// Every interpolated value goes through this. The apostrophe is escaped too
// because the same helper is used inside single-quoted attributes in the embed
// snippet, and remembering which quoting style a call site used is exactly the
// kind of thing that ships an XSS.
export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON embedded in <script> needs '<' neutralised or a string containing
// "</script>" ends the block early and the rest of the page becomes markup.
export function jsonScript(obj, type = 'application/ld+json') {
  const body = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  return `<script type="${esc(type)}">${body}</script>`;
}

// Canonical JSON for anything we write to api/ - stable key order so a rebuild
// with identical inputs produces a byte-identical file and git stays quiet.
export function stableJson(value) {
  return JSON.stringify(sortKeys(value), null, 2) + '\n';
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeys(value[k]);
    return out;
  }
  return value;
}

export function num(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    throw new Error(`num(): expected a finite number, got ${JSON.stringify(value)}`);
  }
  return value.toFixed(decimals);
}

// Signed with a real minus sign U+2212 for display: the hyphen-minus is a
// different width in JetBrains Mono's tabular set and makes a column of deltas
// jitter. The plain ASCII form is kept for machine-readable attributes.
export function signed(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    throw new Error(`signed(): expected a finite number, got ${JSON.stringify(value)}`);
  }
  const body = Math.abs(value).toFixed(decimals);
  if (value > 0) return `+${body}`;
  if (value < 0) return `−${body}`;
  return `±${body}`;
}

// Receipt ids are already filesystem-safe (2026-09-23T02-00-00Z). This is for
// anything else that has to become a URL segment.
export function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseIso(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new Error(`Expected an ISO-8601 timestamp, got ${JSON.stringify(iso)}`);
  }
  return new Date(ms);
}

// Every timestamp on this site is absolute UTC. Never "3 minutes ago": these
// pages are static and cached, so a relative string is a statement that becomes
// false while the reader is looking at it. That is the specific lie we built
// the freshness strip to avoid telling.
export function utc(iso) {
  const d = parseIso(iso);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

export function utcDay(iso) {
  return parseIso(iso).toISOString().slice(0, 10);
}

export function utcClock(iso) {
  const d = parseIso(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function rfc822(iso) {
  return parseIso(iso).toUTCString();
}

// A duration, not a moment - safe to render statically because it is explicitly
// labelled "as of <build stamp>" wherever it appears.
export function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`duration(): expected non-negative seconds, got ${JSON.stringify(seconds)}`);
  }
  const s = Math.round(seconds);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function secondsBetween(laterIso, earlierIso) {
  return (parseIso(laterIso).getTime() - parseIso(earlierIso).getTime()) / 1000;
}

/* WHAT A SEARCH RESULT CAN SHOW. A result page cuts a title near 65 characters
   and a description near 160, mid-word, wherever that falls. Keep the full
   strings for og:title / og:description — social cards do not truncate the
   same way. */
export function serpTitle(title) {
  const t = String(title || '');
  if (t.length <= 65 || !t.includes(' — ')) return t;
  const brandAt = t.lastIndexOf(' · ');
  const suffix = brandAt > 0 ? t.slice(brandAt) : '';
  return t.slice(0, t.indexOf(' — ')) + suffix;
}

export function serpDescription(description) {
  const d = String(description || '');
  if (d.length <= 160) return d;
  const head = d.slice(0, 160);
  const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('? '));
  if (stop >= 80) return head.slice(0, stop + 1);
  return head.slice(0, head.lastIndexOf(' ')).replace(/[,;:—-]+$/, '') + '…';
}
