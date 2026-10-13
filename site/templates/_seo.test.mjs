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
    const has = (exact) => urls.some((u) => u === exact);
    assert.ok(has('https://siren.watch/'));
    assert.ok(has('https://siren.watch/ai-doomsday-clock.html'));
    assert.ok(has('https://siren.watch/news-sitemap.xml'));
    assert.ok(has('https://siren.watch/agents.md'));
    assert.ok(has('https://siren.watch/compare.html'));
    assert.ok(has('https://siren.watch/item/archive.html'));
    assert.ok(has('https://siren.watch/tags/'));
    assert.ok(has('https://siren.watch/vs/takeofftracker.html'));
    assert.ok(has('https://siren.watch/model/muse-wonder.html'));
    assert.ok(has('https://siren.watch/model/maia.html'));
    assert.ok(has('https://siren.watch/model/codex.html'));
    assert.ok(has('https://siren.watch/model/nano-banana.html'));
    assert.ok(has('https://siren.watch/lab/epoch-ai.html'));
    assert.ok(has('https://siren.watch/lab/artificial-analysis.html'));
    assert.ok(has('https://siren.watch/lab/firmus.html'));
    assert.ok(has('https://siren.watch/lab/spacex.html'));
    assert.ok(has('https://siren.watch/lab/hcltech.html'));
    assert.ok(has('https://siren.watch/tags/tsmc.html'));
    assert.ok(has('https://siren.watch/about.html'));
    assert.ok(has('https://siren.watch/privacy.html'));
    assert.ok(has('https://siren.watch/press.html'));
    assert.ok(has('https://siren.watch/medicine.html'));
    assert.ok(has('https://siren.watch/methodology.html'));
    assert.ok(has('https://siren.watch/tags/generative-ai.html'));
    assert.ok(has('https://siren.watch/tags/ipo.html'));
    assert.ok(has('https://siren.watch/leaders.html'));
    assert.ok(has('https://siren.watch/tags/reinforcement-learning.html'));
    assert.ok(has('https://siren.watch/tags/scaling-laws.html'));
    assert.ok(has('https://siren.watch/tags/ai-assistants.html'));
    assert.ok(has('https://siren.watch/tags/ai-factories.html'));
    assert.ok(has('https://siren.watch/tags/peft.html'));
    assert.ok(has('https://siren.watch/tags/gaussian-splatting.html'));
    assert.ok(has('https://siren.watch/tags/llm-agents.html'));
    assert.ok(has('https://siren.watch/tags/on-policy-distillation.html'));
    assert.ok(has('https://siren.watch/tags/neural-networks.html'));
    assert.ok(has('https://siren.watch/tags/synthid.html'));
    assert.ok(has('https://siren.watch/lab/decart.html'));
    assert.ok(has('https://siren.watch/lab/sakana-ai.html'));
    assert.ok(has('https://siren.watch/tags/protein-design.html'));
    assert.ok(has('https://siren.watch/tags/edge-ai.html'));
    assert.ok(has('https://siren.watch/tags/audio-generation.html'));
    assert.ok(has('https://siren.watch/tags/ai-regulation.html'));
    assert.ok(has('https://siren.watch/tags/openai-codex.html'));
    assert.ok(has('https://siren.watch/tags/imitation-learning.html'));
  });

  it('Organization knowsAbout head terms Google and assistants ask', () => {
    const org = organization(ctx);
    assert.ok(org.knowsAbout.includes('AI activity index'));
    assert.ok(org.knowsAbout.includes('AI activity index today'));
    assert.ok(org.knowsAbout.includes('AI doomsday clock'));
    assert.ok(org.knowsAbout.includes('verifiable AI doomsday clock'));
    assert.ok(org.knowsAbout.includes('what is p(doom)'));
    assert.ok(org.knowsAbout.includes('how the AI activity index is computed'));
    assert.ok(org.knowsAbout.includes('history of AI risk'));
    assert.ok(org.knowsAbout.includes('AI explainers'));
    assert.ok(org.knowsAbout.includes('Is AI taking jobs'));
    assert.ok(org.knowsAbout.includes('Is AI curing anything'));
    assert.ok(org.knowsAbout.includes('what is SIREN'));
    assert.ok(org.knowsAbout.includes('SIREN privacy'));
    assert.ok(org.knowsAbout.includes('SIREN press kit'));
    assert.ok(org.knowsAbout.includes('SIREN terms of use'));
    assert.ok(org.knowsAbout.includes('SIREN disclosures'));
    assert.ok(org.knowsAbout.includes('SIREN brand guide'));
    assert.ok(org.knowsAbout.includes('AI models this index scored'));
    assert.ok(org.knowsAbout.includes('AI companies this index scored'));
    assert.ok(org.knowsAbout.includes('AI tags this index scored'));
    assert.ok(org.knowsAbout.includes('AI people this index scored'));
    assert.ok(org.knowsAbout.includes('AI story kinds this index scored'));
    assert.ok(org.knowsAbout.includes('AI outlets this index scored'));
    assert.ok(org.knowsAbout.includes('AI news sources this index scored'));
    assert.ok(org.knowsAbout.includes('AI activity pillars this index scored'));
    assert.ok(org.knowsAbout.includes('AI datacentre countries this index scored'));
    assert.ok(org.knowsAbout.includes('AI labs this index scored'));
    assert.ok(org.knowsAbout.includes('AI stories this index scored'));
    assert.ok(org.knowsAbout.includes('AI leaders on the record'));
    assert.ok(org.knowsAbout.includes('AI race'));
    assert.ok(org.knowsAbout.includes('who is winning the AI race'));
    assert.ok(org.knowsAbout.includes('AI IPOs this index scored'));
    assert.ok(org.knowsAbout.includes('scored AI stories this index kept'));
    assert.ok(org.knowsAbout.includes('DoomBench alternative'));
    assert.ok(org.knowsAbout.includes('Takeoff Tracker alternative'));
    assert.ok(org.knowsAbout.includes('Pentagon Pizza Index alternative'));
    assert.ok(org.alternateName.includes('AI Siren Index'));
  });
});
