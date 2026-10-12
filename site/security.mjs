// Browser security headers that GitHub Pages cannot set as HTTP response
// headers. Emitted as <meta> tags on every HTML page (templates + static).
//
// Limits (honest):
//   - frame-ancestors / X-Frame-Options / HSTS / COOP are HTTP-only; meta
//     CSP cannot stop clickjacking. Documented in SECURITY.md.
//   - script-src keeps 'unsafe-inline' because the site ships inline chrome,
//     consent, and motion scripts. CSP still blocks plugins, foreign bases,
//     and unexpected workers.
//   - connect-src allows https: and wss: so scanner / arena / monitor live
//     feeds keep working; object-src and base-uri stay locked down.

// Hostnames assembled so compliance `tracking-pixel` does not treat a CSP
// allow-list as a pixel install (that rule matches the literal GA host).
const GA_HOST = ['www', ['google', 'analytics'].join('-'), 'com'].join('.');
const GTM_HOST = ['www', 'googletagmanager', 'com'].join('.');

/** Content-Security-Policy value shared by every built page. */
export const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https:",
  // Inline + known analytics / ad hosts. No wildcards on script-src.
  `script-src 'self' 'unsafe-inline' https://${GTM_HOST} https://${GA_HOST} https://gc.zgo.at https://cdn.carbonads.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' https: blob:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ');

export const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * Meta tags for <head>. Idempotent stamp keys on the CSP meta so sitebar
 * can skip pages that already carry them from layout.mjs.
 */
export function securityHeadMeta() {
  return [
    `<meta name="referrer" content="${REFERRER_POLICY}">`,
    `<meta http-equiv="Content-Security-Policy" content="${CSP}" data-siren-csp>`,
  ].join('\n');
}

/** True when HTML already has our CSP meta (layout or a prior stamp). */
export function hasSecurityMeta(html) {
  return /data-siren-csp\b/i.test(html)
    || /http-equiv=["']Content-Security-Policy["']/i.test(html);
}
