// /404.html — the page for a URL that is not on this site.
//
// GitHub Pages serves a 404.html at the root of the published branch for every
// missing path under it. Until 2026-10-03 there was none, so a mistyped or
// retired URL - and /world and /balance were both 404 for a week - landed on
// GitHub's own page: no masthead, no way back, nothing saying whose site it was.
//
// THE JOKE IS THE FRAMING, AND IT IS THE BRAND'S OWN. The index refuses to
// impute a missing value; this page refuses to impute a missing page. Every
// sentence on it is true: nothing was detected at this address, no source
// reports it, and a dark page is reported as dark. docs/VOICE.md: a joke in
// the framing plus a straight number is a brand. The straight number is 404.
//
// Every link is absolute through ctx.href, because this document is served at
// whatever path was asked for and a relative link would resolve against that.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { seal } from './_seal.mjs';
import { mascot } from './_mascot.mjs';

export function render(ctx) {
  const st = ctx.state || {};
  const reading = Number.isFinite(st.level)
    ? `The index itself is fine: ${esc(brand.NAME)} ${esc(st.level)}, ${esc(st.level_name)}.`
    : 'The index itself has no reading today either, which the homepage explains.';
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
  <p class="eyebrow">Page status · dark</p>
  <div class="nf__top"><p class="nf__code num">404</p>${seal(ctx, { size: 150, id: 'seal-nf' })}${mascot({ size: 96, level: 5 })}</div>
  <h1 class="nf__h">Nothing detected at this address.</h1>
  <p class="lede">This site never imputes a missing value, and it will not impute a missing page.
    There is no reading here, so none is printed. ${reading}</p>
  <ul class="nf__rows">
    <li><span>Sources reporting this page exists</span><b>0</b></li>
    <li><span>Level</span><b>none — not scored</b></li>
    <li><span>Probability it comes back by itself</span><b>not a prediction site</b></li>
    <li><span>Receipt</span><b>this one: 404</b></li>
  </ul>
  <p><a class="nf__go" href="${esc(ctx.href('/'))}">Back to the index →</a></p>
</section>`;
  return page({
    ctx,
    path: '/404.html',
    title: `404 — nothing detected · ${brand.NAME}`,
    description: 'There is no page at this address. The index does not impute missing values, or missing pages.',
    noindex: true,
    main,
  });
}
