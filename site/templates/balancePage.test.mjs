import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasBalancePage, render } from './balancePage.mjs';

const balance = JSON.parse(readFileSync(new URL('../../data/balance.json', import.meta.url), 'utf8'));
const ledger = JSON.parse(readFileSync(new URL('../../data/ledger.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { balance: true, bliss: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  balance,
  ledger,
};

describe('balance page', () => {
  it('gates on balance + ledger payload', () => {
    assert.equal(hasBalancePage(ctx), true);
    assert.equal(hasBalancePage({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How does SIREN count AI harm and benefit side by side\?/);
    assert.match(html, /<h1 class="bp__h1">How does SIREN count AI harm and benefit side by side\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does the balance feed the main SIREN number\?/);
    assert.match(html, /Is there a net score of harm versus benefit\?/);
    assert.match(html, /What do the newsroom word-list counts measure\?/);
    assert.match(html, /<h3 class="bp__h3">What does the beam never tilt on\?<\/h3>/);
    assert.match(html, /<h3 class="bp__h3">What do the honesty lines say about the counts\?<\/h3>/);
    assert.match(html, /<h3 class="bp__h3">What is the rule on both sides\?<\/h3>/);
    assert.match(html, /<h3 class="bp__h3">What is on the harm list\?/);
    assert.match(html, /<h3 class="bp__h3">What is on the benefit list\?/);
    assert.match(html, /<h3 class="bp__h3">Which hedge words and negators apply\?<\/h3>/);
    assert.match(html, /<h3 class="bp__h3">What are the registers\?<\/h3>/);
    assert.match(html, /FAQPage[\s\S]*What is the rule on both sides\?/);
    assert.match(html, /FAQPage[\s\S]*What does the beam never tilt on\?/);
    assert.doesNotMatch(html, /<h3 class="bp__h3">The rule, the same on both sides<\/h3>/);
    assert.doesNotMatch(html, /<h3 class="bp__h3">About the counts<\/h3>/);
    assert.doesNotMatch(html, /<h3 class="bp__h3">Hedge words and negators<\/h3>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/bliss\.html/);
    assert.match(html, /href="\/bliss\.html">What is BLISS, the SIREN upside index\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/bliss\.html">The upside index, in full →<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /net score of good versus evil/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How does SIREN count AI harm and benefit side by side\?/);
    assert.match(html, /noindex/);
  });

  it('side-column H3s use questions mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /Which headlines matched Harm language\?/);
    assert.match(html, /Which headlines matched Benefit language\?/);
    assert.match(html, /What is in the Harm register\?/);
    assert.match(html, /What is in the Benefit register\?/);
    assert.match(html, /Which counters are on the Harm side\?/);
    assert.match(html, /Which counters are on the Benefit side\?/);
    assert.match(html, /FAQPage[\s\S]*Which headlines matched Harm language\?/);
    assert.match(html, /FAQPage[\s\S]*What is in the Benefit register\?/);
    assert.doesNotMatch(html, /<h3 class="bp__colh">Harm language/);
    assert.doesNotMatch(html, /<h3 class="bp__colh">Benefit register/);
    assert.doesNotMatch(html, /<h3 class="bp__colh">Harm side/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /net score of good versus evil/i);
  });

  it('section H2s use questions mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /id="bp-ix-h"[^>]*>[\s\S]*How do SIREN and BLISS sit beside the beam\?/);
    assert.match(html, /id="bp-lim-h"[^>]*>[\s\S]*What can this page not say\?/);
    assert.match(html, /id="bp-method-h"[^>]*>[\s\S]*Where did this come from\?/);
    assert.match(html, /id="bp-data-h"[^>]*>[\s\S]*Where can I take the data\?/);
    assert.match(html, /FAQPage[\s\S]*How do SIREN and BLISS sit beside the beam\?/);
    assert.match(html, /FAQPage[\s\S]*Where can I take the data\?/);
    assert.doesNotMatch(html, /id="bp-ix-h"[^>]*>[\s\S]*SIREN and BLISS, as context<\/h2>/);
    assert.doesNotMatch(html, /id="bp-lim-h"[^>]*>[\s\S]*What this cannot say<\/h2>/);
    assert.doesNotMatch(html, /id="bp-data-h"[^>]*>[\s\S]*Take the data<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('beam / matches / registers / counters H2s use questions mirrored in FAQPage', () => {
    const html = render(ctx);
    const apo = String.raw`(?:['\u2019]|&#39;|&apos;)`;
    assert.match(html, new RegExp(`id="bp-beam-h"[^>]*>[\\s\\S]*What did the newsroom${apo}s headlines carry\\?`));
    assert.match(html, /id="bp-match-h"[^>]*>[\s\S]*Which headlines matched a word list\?/);
    assert.match(html, /id="bp-reg-h"[^>]*>[\s\S]*What documented results sit on both sides\?/);
    assert.match(html, /id="bp-ctr-h"[^>]*>[\s\S]*Which counters come from public registries\?/);
    assert.match(html, new RegExp(`FAQPage[\\s\\S]*What did the newsroom${apo}s headlines carry\\?`));
    assert.match(html, /FAQPage[\s\S]*Which counters come from public registries\?/);
    assert.doesNotMatch(html, new RegExp(`id="bp-beam-h"[^>]*>[\\s\\S]*What the newsroom${apo}s headlines carried</h2>`));
    assert.doesNotMatch(html, /id="bp-match-h"[^>]*>[\s\S]*Every headline that matched a list<\/h2>/);
    assert.doesNotMatch(html, /id="bp-reg-h"[^>]*>[\s\S]*Documented results, both sides<\/h2>/);
    assert.doesNotMatch(html, /id="bp-ctr-h"[^>]*>[\s\S]*\d+ counters from public registries<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
