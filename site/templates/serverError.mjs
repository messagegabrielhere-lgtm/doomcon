// /500.html — the page for a server-side failure.
//
// GitHub Pages itself rarely serves this (a broken Pages deploy shows GitHub's
// own error UI), but we still ship it for three reasons:
//   1. Custom domains / CDN / future hosts that map 5xx to /500.html.
//   2. A bookmarkable, on-brand "the desk is dark" page operators can link from
//      status posts when collect.yml or the publish step is on fire.
//   3. Parity with 404.html — a missing error page looks broken; this one does not.
//
// Same voice as the 404: refuse to impute a missing reading; report the failure
// as a dark source. Absolute links via ctx.href so a deep URL still navigates home.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { seal } from './_seal.mjs';
import { mascot } from './_mascot.mjs';

export function render(ctx) {
  const st = ctx.state || {};
  const reading = Number.isFinite(st.level)
    ? `Last known reading before this failure: ${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}.`
    : 'No last-known reading is available on this page.';
  const main = `<style>
.nf { margin: var(--s-6) 0; max-width: 60ch; }
.nf__code { font: 400 clamp(64px, 16vw, 132px)/1 var(--poster); letter-spacing: .01em; color: var(--ink); margin: 0; }
.nf__top { display: flex; align-items: center; gap: var(--s-5); flex-wrap: wrap; }
.nf__h { font: 650 clamp(24px, 4vw, 36px)/1.15 var(--sans); letter-spacing: -0.02em; margin: var(--s-3) 0; }
.nf__rows { list-style: none; margin: var(--s-4) 0; padding: 0; border-top: 1px solid var(--rule);
  font: 400 var(--t-sm)/1.5 var(--mono); }
.nf__rows li { display: flex; justify-content: space-between; gap: var(--s-4); padding: 8px 0;
  border-bottom: 1px solid var(--rule); color: var(--ink-dim); }
.nf__rows b { color: var(--ink); font-weight: 600; text-align: right; }
.nf__go { display: inline-block; margin-top: var(--s-2); padding: 9px var(--s-4); border: 1px solid var(--rule);
  border-radius: var(--radius); background: var(--bg-raised); color: var(--ink); text-decoration: none;
  font: 600 var(--t-sm)/1.2 var(--sans); }
.nf__go:hover { border-color: var(--accent-2); color: var(--accent-2); }
</style>
<section class="nf">
  <p class="eyebrow">Desk status · dark</p>
  <div class="nf__top"><p class="nf__code num">500</p>${seal(ctx, { size: 150, id: 'seal-5xx' })}${mascot({ size: 96, level: 5 })}</div>
  <h1 class="nf__h">The desk did not answer.</h1>
  <p class="lede"><b>Something on our side failed.</b> Not you. Not your phone.</p>
  <p class="lede">This site never invents a reading when a source is dark, and it will not invent
    a page when the server is. ${reading} Try the index in a minute; if it is still down,
    the <a href="${esc(brand.REPO_URL)}/actions">Actions log</a> is where the operator looks first.</p>
  <ul class="nf__rows">
    <li><span>Fault</span><b>ours</b></li>
    <li><span>Stack trace shown to you</span><b>none — on purpose</b></li>
    <li><span>What to do</span><b>reload, or come back shortly</b></li>
    <li><span>How to tell us</span><b><a href="${esc(ctx.href('/feedback.html'))}">feedback form</a></b></li>
  </ul>
  <p><a class="nf__go" href="${esc(ctx.href('/'))}">Back to the index →</a></p>
</section>`;
  return page({
    ctx,
    path: '/500.html',
    title: `500 — desk dark · ${brand.NAME}`,
    description: 'A server-side failure on this site. No stack trace; try the index again shortly.',
    noindex: true,
    main,
  });
}
