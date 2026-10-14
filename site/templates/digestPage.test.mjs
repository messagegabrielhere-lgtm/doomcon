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
    assert.match(html, /id="dg-brief-h">What is in today's brief\?/);
    assert.match(html, /id="dg-chg-h">What changed on the index\?<\/h2>/);
    assert.match(html, /id="dg-st-h">What streaks and records does the log show\?<\/h2>/);
    assert.match(html, /id="dg-lab-h">How did every frontier lab fare, last/);
    assert.match(html, /id="dg-how-h">How is this page computed\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*What is in today's brief\?/);
    assert.match(html, /FAQPage[\s\S]*What changed on the index\?/);
    assert.match(html, /FAQPage[\s\S]*How is this page computed\?/);
    assert.doesNotMatch(html, /id="dg-brief-h">The brief /);
    assert.doesNotMatch(html, /id="dg-chg-h">What changed<\/h2>/);
    assert.doesNotMatch(html, /id="dg-st-h">Streaks and records<\/h2>/);
    assert.doesNotMatch(html, /id="dg-how-h">How this page is computed<\/h2>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Report"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/news\.html/);
    const key = html.match(/<p class="dg__key">([\s\S]*?)<\/p>/);
    assert.ok(key, 'expected digest key paragraph');
    assert.match(key[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.doesNotMatch(key[1], /href="\/methodology\.html">the methodology<\/a>/);
    assert.match(html, /href="\/race\.html">Who is winning the AI race\?<\/a>/);
    assert.match(html, /Who is winning the AI race\? &rarr;|Who is winning the AI race\? →/);
    assert.doesNotMatch(html, /The full leaderboard/);
    assert.doesNotMatch(html, /href="\/race\.html">the leaderboard<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What is the SIREN daily brief\?/);
    assert.match(html, /noindex/);
  });
});
