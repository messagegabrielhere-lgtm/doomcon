// docs/METHODOLOGY.md, rendered. The page exists because none of the
// competitors have one that contains a formula: pizzint's "how it works" is
// four bullets of nouns, and DoomBench has to explain in its FAQ that its 67.8
// is not a probability. Ours is arithmetic anyone can rerun.

import { esc } from './_html.mjs';
import { renderMarkdown, stripMarkup } from './_markdown.mjs';
import { page } from './layout.mjs';
import { answerBlock, ANSWER_BLOCK_CSS, breadcrumbs, speakable } from './_seo.mjs';
import * as brand from '../brand.mjs';

/** Head-term title + H1 (FINDABILITY tip #202). Must match visible <h1>. */
export function methodologyTitle() {
  return `How the ${brand.NAME} AI activity index is computed · methodology`;
}

export function render(ctx) {
  const { html, sections } = renderMarkdown(ctx.methodologyMd);

  const description = firstParagraph(html) ||
    `How ${brand.NAME} turns public data into a 0-100 score and a level, in full.`;
  const ans = answerBlock({
    q: `How is the ${brand.NAME} index computed?`,
    a: `Every hour a collector reads public sources across five pillars, scores each against a frozen reference, and combines them into a 0–100 composite and a level from 5 (quietest) to 1 (loudest). Every formula and constant is on this page; every reading ships a receipt you can recompute.`,
  });
  const main = `<style>${ANSWER_BLOCK_CSS}</style>
${ans}
<article class="prose">${html}</article>`;
  // Head-term title: people search “how is the AI activity index computed”.
  // H1 comes from docs/METHODOLOGY.md and must match this string (tip #202).
  const title = methodologyTitle();

  return page({
    ctx,
    path: '/methodology.html',
    title,
    ogTitle: `${brand.NAME}: ${title}`,
    description,
    ogType: 'article',
    ogImage: ctx.cardFor(ctx.state.receipt_id),
    jsonld: buildJsonLd(ctx, sections, title, description),
    head: `<link rel="alternate" type="text/markdown" href="${esc(ctx.href('/methodology.md'))}" title="Methodology (markdown)">`,
    main,
  });
}

/** Plain markdown mirror of docs/METHODOLOGY.md for agents (FINDABILITY.md §3.2 #9). */
export function methodologyMd(ctx) {
  // Strip the source doc’s leading H1 so the mirror has one question-shaped H1
  // matching the HTML title (tip #202) — not a bare “SIREN methodology”.
  const body = String(ctx.methodologyMd || '').trim().replace(/^#\s+[^\n]+\n+/, '');
  const stamp = ctx.state && ctx.state.generated_at ? ctx.state.generated_at : null;
  const qTitle = methodologyTitle();
  return `# ${qTitle}

> HTML: ${ctx.url('/methodology.html')}
> Canonical formulas for the hourly AI activity index. Recompute every number from the receipt.

${stamp ? `Built ${stamp}.\n` : ''}
${body}
`;
}

function firstParagraph(html) {
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  return m ? stripMarkup(m[1], 200) : '';
}

/**
 * FAQPage built ONLY from headings that are literally questions in the rendered
 * document, with the visible text beneath them as the answer. Structured data
 * that does not match what the page shows is a manual action, so we never
 * invent a Q&A pair that a reader cannot find on the page.
 */
function buildJsonLd(ctx, sections, title, description) {
  const path = '/methodology.html';
  const qTitle = title || methodologyTitle();
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: qTitle,
      description: description || undefined,
      url: ctx.url(path),
      dateModified: ctx.state.generated_at,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      author: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
      speakable: speakable(['h1', '.ans__a', 'article.prose > p']),
    },
    breadcrumbs(ctx, [
      { name: 'Home', path: '/' },
      { name: qTitle, path },
    ]),
  ];

  // FAQPage only from headings that are literally questions on the page
  // (FINDABILITY schema rule — no invented Q&A).
  const faqs = sections
    .filter((s) => s.text.trim().endsWith('?') && s.body.trim().length > 40)
    .map((s) => ({
      '@type': 'Question',
      name: s.text,
      acceptedAnswer: { '@type': 'Answer', text: stripMarkup(s.body, 900) },
    }));

  if (faqs.length) {
    blocks.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs });
  }
  return blocks;
}
