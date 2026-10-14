import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  organization, breadcrumbs, speakable, webPage, faqPage, evergreenJsonLd,
  answerBlock, ANSWER_BLOCK_CSS,
} from './_seo.mjs';
import { locsFromSitemap, defaultUrlList, INDEXNOW_KEY } from '../../collector/indexnow.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  state: { generated_at: '2026-10-14T01:00:00.000Z', level: 4, score: 46.3 },
};

describe('SEO helpers', () => {
  it('emits an Organization with sameAs profiles', () => {
    const org = organization(ctx);
    assert.equal(org['@type'], 'Organization');
    assert.equal(org.url, 'https://siren.watch/');
    assert.equal(org['@id'], 'https://siren.watch/#org');
    assert.ok(!String(org['@id']).includes('//#'), 'no double-slash before fragment');
    assert.ok(Array.isArray(org.sameAs));
    assert.ok(org.sameAs.some((u) => /x\.com|twitter\.com/i.test(u) || u.includes('github.com')));
    assert.ok(org.alternateName.includes('SIREN'));
  });

  it('builds breadcrumbs with Home first and current last', () => {
    const bc = breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: 'A story', path: '/item/a.html' },
    ]);
    assert.equal(bc['@type'], 'BreadcrumbList');
    assert.equal(bc.itemListElement.length, 3);
    assert.equal(bc.itemListElement[0].item, 'https://siren.watch/');
    assert.equal(bc.itemListElement[2].name, 'A story');
    assert.equal(bc.itemListElement[2].position, 3);
  });

  it('wraps speakable selectors', () => {
    const s = speakable(['h1.it__h', 'blockquote.lede']);
    assert.equal(s['@type'], 'SpeakableSpecification');
    assert.deepEqual(s.cssSelector, ['h1.it__h', 'blockquote.lede']);
  });
});

describe('IndexNow', () => {
  it('keeps a stable public key', () => {
    assert.match(INDEXNOW_KEY, /^[a-z0-9]{8,}$/);
  });

  it('parses locs from a news sitemap', () => {
    const xml = `<?xml version="1.0"?>
<urlset><url><loc>https://siren.watch/item/a.html</loc></url>
<url><loc>https://siren.watch/item/b.html</loc></url></urlset>`;
    assert.deepEqual(locsFromSitemap(xml), [
      'https://siren.watch/item/a.html',
      'https://siren.watch/item/b.html',
    ]);
  });

  it('always includes the homepage and news sitemap in the default list', () => {
    const urls = defaultUrlList({ outDir: '/tmp/siren-no-public-dir' });
    assert.ok(urls.includes('https://siren.watch/'));
    assert.ok(urls.includes('https://siren.watch/ai-doomsday-clock.html'));
    assert.ok(urls.includes('https://siren.watch/news-sitemap.xml'));
    assert.ok(urls.includes('https://siren.watch/agents.md'));
    assert.ok(urls.includes('https://siren.watch/compare.html'));
  });

  it('Organization knowsAbout head terms Google and assistants ask', () => {
    const org = organization(ctx);
    assert.ok(org.knowsAbout.includes('AI activity index'));
    assert.ok(org.knowsAbout.includes('AI doomsday clock'));
    assert.ok(org.alternateName.includes('AI Siren Index'));
  });

  it('webPage carries dateModified when the reading stamp is known', () => {
    const wp = webPage(ctx, {
      path: '/guide.html',
      name: 'Guide',
      description: 'What each number measures',
      dateModified: ctx.state.generated_at,
      speakable: ['h1', '.lede'],
    });
    assert.equal(wp['@type'], 'WebPage');
    assert.equal(wp.dateModified, '2026-10-14T01:00:00.000Z');
    assert.equal(wp.url, 'https://siren.watch/guide.html');
    assert.equal(wp.speakable['@type'], 'SpeakableSpecification');
  });

  it('faqPage mirrors visible Q&A pairs without inventing schema', () => {
    const f = faqPage([['What is p(doom)?', 'An opinion expressed as a percentage.']]);
    assert.equal(f['@type'], 'FAQPage');
    assert.equal(f.mainEntity[0].name, 'What is p(doom)?');
    assert.equal(f.mainEntity[0].acceptedAnswer.text, 'An opinion expressed as a percentage.');
  });

  it('evergreenJsonLd stacks WebPage freshness, breadcrumbs and FAQ', () => {
    const blocks = evergreenJsonLd(ctx, {
      path: '/p-doom.html',
      name: 'What is p(doom)?',
      description: 'Opinion as a percentage.',
      crumbs: [{ name: 'p(doom)', path: '/p-doom.html' }],
      faq: [['What is p(doom)?', 'An opinion expressed as a percentage.']],
    });
    assert.equal(blocks.length, 3);
    assert.equal(blocks[0].dateModified, '2026-10-14T01:00:00.000Z');
    assert.equal(blocks[1]['@type'], 'BreadcrumbList');
    assert.equal(blocks[2]['@type'], 'FAQPage');
    assert.ok(blocks[0].speakable.cssSelector.includes('.ans__a'));
  });

  it('answerBlock emits a short extractable fragment with escaped text', () => {
    const html = answerBlock({
      q: 'What is SIREN?',
      a: 'An hourly AI activity index <not html>.',
    });
    assert.match(html, /class="ans"/);
    assert.match(html, /class="ans__q"/);
    assert.match(html, /class="ans__a"/);
    assert.match(html, /What is SIREN\?/);
    assert.match(html, /&lt;not html&gt;/);
    assert.ok(!html.includes('<not html>'));
    assert.match(ANSWER_BLOCK_CSS, /\.ans__/);
  });

  it('answerBlock returns empty when there is no answer text', () => {
    assert.equal(answerBlock({ a: '' }), '');
    assert.equal(answerBlock({ a: '   ' }), '');
  });
});
