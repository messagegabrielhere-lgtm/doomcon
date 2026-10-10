import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { organization, breadcrumbs, speakable } from './_seo.mjs';
import { locsFromSitemap, defaultUrlList, INDEXNOW_KEY } from '../../collector/indexnow.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
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
  });
});
