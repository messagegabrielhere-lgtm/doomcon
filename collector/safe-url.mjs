// Outbound URL gate for collector/fetch.mjs.
//
// Every network call in this repo goes through fetch.mjs. This module refuses
// schemes and destinations that have no business being hit from a collector
// runner: file:, data:, localhost, RFC1918, link-local, and cloud metadata.
// Adapters hardcode public HTTPS endpoints; this is the belt for the day a
// feed or issue payload ever hands us a URL we did not write ourselves.

import { isIP } from 'node:net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  'host.docker.internal',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

/**
 * True when hostname is a literal IP that must never be fetched.
 * Covers loopback, RFC1918, link-local (incl. 169.254.169.254 metadata),
 * CGNAT, and IPv6 unique-local / link-local / loopback.
 */
export function isBlockedIp(host) {
  const ip = String(host || '').replace(/^\[|\]$/g, '');
  const v = isIP(ip);
  if (!v) return false;

  if (v === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0) return true;                         // 0.0.0.0/8
    if (a === 10) return true;                        // 10.0.0.0/8
    if (a === 127) return true;                       // 127.0.0.0/8
    if (a === 169 && b === 254) return true;          // 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;          // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true;// 100.64.0.0/10 CGNAT
    if (a >= 224) return true;                        // multicast / reserved
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:')) return true;         // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('ff')) return true;            // multicast
  // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:aabb:ccdd)
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    || lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mapped) {
    if (mapped[1].includes('.')) return isBlockedIp(mapped[1]);
    const hi = parseInt(mapped[1], 16);
    const lo = parseInt(mapped[2], 16);
    const a = (hi >> 8) & 255, b = hi & 255, c = (lo >> 8) & 255, d = lo & 255;
    return isBlockedIp(`${a}.${b}.${c}.${d}`);
  }
  return false;
}

function isBlockedHostname(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (isBlockedIp(host)) return true;
  return false;
}

/**
 * Parse and validate an outbound URL. Returns a WHATWG URL on success.
 * Throws TypeError with a short reason on refusal (never fetches).
 *
 * @param {string} raw
 * @param {{ allowHttp?: boolean }} [opts]
 */
export function assertSafeUrl(raw, opts = {}) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new TypeError('url must be a non-empty string');
  }
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new TypeError(`invalid url: ${raw}`);
  }

  const scheme = u.protocol.replace(/:$/, '').toLowerCase();
  if (scheme === 'https') {
    // ok
  } else if (scheme === 'http' && opts.allowHttp) {
    // rare escape hatch for fixtures / one-off probes
  } else if (scheme === 'http') {
    throw new TypeError(`refusing plain http url: ${u.origin}`);
  } else {
    throw new TypeError(`refusing ${scheme || 'unknown'} url scheme`);
  }

  if (u.username || u.password) {
    throw new TypeError('refusing url with embedded credentials');
  }

  if (isBlockedHostname(u.hostname)) {
    throw new TypeError(`refusing blocked host: ${u.hostname || '(empty)'}`);
  }

  // Port 0 is nonsense; Node accepts it. Cap to well-known http(s) ranges is
  // too aggressive (APIs use odd ports). Just reject empty host already done.
  return u;
}

/** Soft check used by HTML href helpers — never throws. */
export function isSafeHttpUrl(raw) {
  try {
    assertSafeUrl(raw);
    return true;
  } catch {
    return false;
  }
}
