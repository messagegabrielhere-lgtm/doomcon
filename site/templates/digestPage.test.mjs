import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasDigest, render } from './digestPage.mjs';

const digest = JSON.parse(readFileSync(new URL('../../data/digest.json', import.meta.url), 'utf8'));
const state = JSON.parse(readFileSync(new URL('../../data/state.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state,
  digest,
  news: { items: state.news?.items || [], generated_at: state.generated_at },
};

describe('digest page', () => {
  it('gates on digest object', () => {
    assert.equal(hasDigest(ctx), true);
    assert.equal(hasDigest({}), false);
  });

  it('ships a question-shaped title, speakable Report, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What is the SIREN daily brief\?/);
    assert.match(html, /<h1 class="dg__h1">What is the SIREN daily brief\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Was any of this written by a model\?/);
    assert.match(html, /How are items selected for the brief\?/);
    assert.match(html, /Where are the selection rules published\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Report"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/news\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What is the SIREN daily brief\?/);
    assert.match(html, /noindex/);
  });
});
