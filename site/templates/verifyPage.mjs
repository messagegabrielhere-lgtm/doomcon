// /verify.html — dedicated free-tool landing for the in-browser receipt check.
// Outrank-style SEO: one indexable tool URL with question H1 + FAQ that matches
// visible HTML (FINDABILITY.md). The checker itself lives in _verify.mjs and
// still embeds on the home board at #vfy.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { render as verifyBox, verifyCss, verifyQuestion } from './_verify.mjs';
import * as brand from '../brand.mjs';

const PATH = '/verify.html';

const CSS = `<style>
.vfyp{max-width:720px;min-width:0}
.vfyp .eyebrow{font:600 12px/1.2 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px;text-transform:uppercase}
.vfyp h1{font:700 clamp(1.6rem,5vw,2.3rem)/1.15 var(--sans);margin:0 0 12px;color:var(--ink)}
.vfyp h2{font:700 1.25rem/1.25 var(--sans);margin:34px 0 10px;color:var(--ink)}
.vfyp h3{font:700 1rem/1.3 var(--sans);margin:14px 0 6px;color:var(--ink)}
.vfyp p,.vfyp li{color:var(--ink-dim);line-height:1.6;overflow-wrap:anywhere}
.vfyp a{color:var(--accent,#4ADE80)}
.vfyp .lede{font:400 1.05rem/1.55 var(--sans);color:var(--ink-dim);margin:0 0 18px;max-width:62ch}
.vfyp .vfyp__box{margin:18px 0 28px;padding:4px 16px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--bg-sunken,#060A10)}
.vfyp .vfyp__sib{margin-top:28px;font-size:14px}
.vfyp .vfyp__faq{margin:28px 0 0;max-width:62ch}
${verifyCss()}
</style>`;

export function verifyPage(ctx) {
  const qTitle = verifyQuestion();
  const proveQ = 'What does the browser check prove?';
  const proveA = 'The published record has not been edited after the fact. Each receipt re-hashes to the hash it claims and links to the receipt before it.';
  const notQ = 'What does the browser check not prove?';
  const notA = `That the inputs were right. For that, read How the ${brand.NAME} AI activity index is computed · methodology and the source repository.`;
  const whereQ = 'Where else can you run the same check?';
  const whereA = `On the home board under the same question, and on the classic instrument panel. This page is the permanent URL for the free tool.`;
  const toolsQ = `What free tools does ${brand.NAME} publish?`;
  const toolsA = `A directory of free instruments — verify, alerts, export, embed, badge, OpenAPI, news sitemap, Search Trends and AI prediction markets — with one honest sentence each.`;

  const faq = [
    [qTitle,
      `Every reading ships with a receipt: its inputs, its score, and the hash of the receipt before it. Press the button and your own browser fetches the last 12 receipts, re-hashes each one and walks the chain. Nothing is sent anywhere.`],
    [proveQ, proveA],
    [notQ, notA],
    [whereQ, whereA],
    [toolsQ, toolsA],
    [`Does verifying a reading move the ${brand.NAME} score?`,
      `No. The check only reads public JSON already on this origin. It never writes to the index.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');

  const box = verifyBox(ctx, { omitHeading: true, labelledBy: 'vfy-page-h' });
  const description = `${qTitle} Re-hash the last 12 public receipts in your browser. Proves the published record was not edited after the fact — not that the inputs were right. Free, no account.`;
  // FINDABILITY #451 — dual middot head terms beside live home (verify was
  // index-only after free-tools dual #443).

  const main = `${CSS}
<section class="vfyp">
  <p class="eyebrow"><a href="${esc(ctx.href('/free-tools.html'))}">${esc(toolsQ)}</a> · Verify</p>
  <h1 id="vfy-page-h">${esc(qTitle)}</h1>
  <p class="lede">Every reading ships with a receipt. Press the button and your own browser fetches the last 12 receipts from this origin, re-hashes each one with WebCrypto, and walks the chain. Nothing is sent anywhere, and no account is required.</p>
  <div class="vfyp__box">${box || `<p class="lede">The live reading has no receipt id in this build, so the checker is idle. Open <a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)}</a> after the next collect.</p>`}</div>
  <h2>${esc(proveQ)}</h2>
  <p>${esc(proveA)}</p>
  <h2>${esc(notQ)}</h2>
  <p>${esc(notA)} <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>
    · <a href="${esc(brand.REPO_URL)}" rel="noopener">source</a>.</p>
  <h2>${esc(whereQ)}</h2>
  <p>${esc(whereA)}
    <a href="${esc(ctx.href('/#vfy'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)}</a>
    · <a href="${esc(ctx.href('/classic.html#vfy'))}">Where is the full ${esc(brand.NAME)} instrument panel?</a>.</p>
  <section class="vfyp__faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="vfyp__sib">Search-shaped sibling:
      <a href="${esc(ctx.href('/free-tools.html'))}">${esc(toolsQ)}</a>
      · <a href="${esc(ctx.href('/export.html'))}">How do I export and embed ${esc(brand.NAME)} data?</a>
      · <a href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a>
      · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
  </section>
</section>`;

  return page({
    ctx,
    path: PATH,
    title: `${qTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${qTitle}`,
    description,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: qTitle,
        applicationCategory: 'BrowserApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: `In-browser checker that re-hashes the last 12 public ${brand.NAME} receipts and walks the hash chain. Free, no account.`,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
        speakable: speakable(['#vfy-page-h', 'p.lede']),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: qTitle,
        description,
        url: ctx.url(PATH),
        isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
        speakable: speakable(['#vfy-page-h', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: toolsQ, path: '/free-tools.html' },
        { name: qTitle, path: PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}
