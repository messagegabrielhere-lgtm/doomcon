// The widget. /embed and /widget 404 on pizzint and on all five AI
// competitors, so this is the one thing in the build nobody in the category
// has. It is therefore the moat and the hedge against X platform risk, and it
// gets treated accordingly: self-contained, no external CSS, no fonts fetched,
// no tracking, no cookies, and the number rendered into the HTML so it survives
// a blocked-script iframe.

import { esc, num, utc } from './_html.mjs';
import { embedCss } from '../styles.mjs';
import * as brand from '../brand.mjs';

export function render(ctx) {
  const { state } = ctx;
  const filled = 6 - state.level;
  const bars = [1, 2, 3, 4, 5]
    .map((i) => `<span data-on="${i <= filled ? 1 : 0}"></span>`).join('');

  // System font stack only. A webfont in a 320px widget is a second network
  // round trip on somebody else's page for two lines of text, and if it fails
  // the host sees a flash of nothing where the number should be.
  const localFonts = `
:root { --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        --sans: system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.NAME)} ${esc(state.level)} · ${esc(state.level_name)}</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${esc(ctx.url('/embed.html'))}">
<style>${embedCss()}${localFonts}</style>
</head>
<body>
<a class="w" href="${esc(ctx.url('/'))}" target="_blank" rel="noopener"
   title="${esc(brand.DISCLAIMER)}">
  <div class="w__top">
    <span class="w__brand">${esc(brand.NAME)}</span>
    <div class="w__bars" aria-hidden="true">${bars}</div>
  </div>
  <div class="w__main">
    <span class="w__digit" aria-hidden="true">${esc(state.level)}</span>
    <span class="w__meta">
      <span class="w__name">${esc(state.level_name)}</span>
      <span class="w__score">${esc(num(state.score, 1))} / 100 · ${esc(state.degraded ? 'degraded' : 'all sources live')}</span>
    </span>
  </div>
  <div class="w__foot">
    <span${state.degraded ? ' class="w__degraded"' : ''}>${esc(utc(state.generated_at))}</span>
    <span>${esc(brand.DOMAIN)}</span>
  </div>
</a>
<script>
// The only script on the site, and nothing depends on it: the widget is fully
// rendered before it runs. It exists so a host page can pin the theme, because
// a light blog cannot restyle across an iframe boundary and a black box on a
// white page looks broken. try/catch because a sandboxed iframe can throw on
// location access, and a thrown error here must not be visible to the host.
try {
  var q = new URLSearchParams(location.search);
  var t = q.get('theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  if (q.get('compact') === '1') document.body.setAttribute('data-compact', '1');
} catch (e) { /* pinned theme unavailable; prefers-color-scheme still applies */ }
</script>
</body>
</html>
`;
}
