// docs/METHODOLOGY.md, rendered. The page exists because none of the
// competitors have one that contains a formula: pizzint's "how it works" is
// four bullets of nouns, and DoomBench has to explain in its FAQ that its 67.8
// is not a probability. Ours is arithmetic anyone can rerun.

import { esc } from './_html.mjs';
import { renderMarkdown, stripMarkup } from './_markdown.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

export function render(ctx) {
  const { html, sections } = renderMarkdown(ctx.methodologyMd);

  const main = `<article class="prose">${html}</article>`;

  const description = firstParagraph(html) ||
    `How ${brand.NAME} turns public data into a 0-100 score and a level, in full.`;

  return page({
    ctx,
    path: '/methodology.html',
    title: `Methodology — how the ${brand.NAME} index is computed`,
    description,
    ogType: 'article',
    ogImage: ctx.cardFor(ctx.state.receipt_id),
    jsonld: buildJsonLd(ctx, sections),
    main,
  });
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
function buildJsonLd(ctx, sections) {
  const blocks = [{
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${brand.NAME} methodology`,
    url: ctx.url('/methodology.html'),
    dateModified: ctx.state.generated_at,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    author: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
  }];

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
