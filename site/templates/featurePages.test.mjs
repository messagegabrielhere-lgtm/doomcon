import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { breakthroughs, jobProof, liveX, pickBreakthroughs, siReady } from './featurePages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { bliss: true, medicine: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const sample = [
  {
    id: 'bt-1',
    title: 'AI drug discovers new antibiotic for rare disease',
    url: 'https://example.com/drug',
    source: 'nature',
    published_at: '2026-10-01T12:00:00Z',
    field: 'Medicine',
  },
  {
    id: 'bt-2',
    title: 'Math theorem solved with AI proof assistant',
    url: 'https://example.com/math',
    source: 'arxiv',
    published_at: '2026-09-28T12:00:00Z',
    field: 'Math & science',
  },
];

describe('breakthroughs page', () => {
  it('picks helping headlines and refuses lawsuit false friends', () => {
    const picked = pickBreakthroughs([
      { id: 'a', title: 'AI drug discovers new antibiotic for rare disease', kind: 'news' },
      { id: 'b', title: 'AI company sued over deepfake scam', kind: 'news' },
      { id: 'c', title: 'Paper on protein folding', kind: 'paper' },
    ]);
    assert.equal(picked.length, 1);
    assert.equal(picked[0].id, 'a');
  });

  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = breakthroughs(ctx, sample);
    assert.match(html, /<title>What AI breakthroughs has SIREN tracked\?/);
    assert.match(html, /<h1 class="bp__h1">What AI breakthroughs has SIREN tracked\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is every headline here a verified breakthrough\?/);
    assert.match(html, /What kinds of upside stories appear on this page\?/);
    assert.match(html, /Where else does SIREN track the upside of AI\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/bliss\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /verified cure/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty list keeps the question title', () => {
    const html = breakthroughs(ctx, []);
    assert.match(html, /What AI breakthroughs has SIREN tracked\?/);
    assert.match(html, /No breakthrough stories in the current window/);
  });
});

describe('si-ready page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = siReady(ctx);
    assert.match(html, /<title>Ready for superintelligence\?/);
    assert.match(html, /<h1 class="bp__h1">Ready for superintelligence\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does this page predict when superintelligence arrives\?/);
    assert.match(html, /What does the 3-minute check cover\?/);
    assert.match(html, /Does anything from the quiz leave my browser\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/ai-proof-job\.html/);
    assert.match(html, /How do I AI-proof my job\?/);
    assert.match(html, /\/breakthroughs\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /superintelligence arrives in \d/i);
    assert.doesNotMatch(html, /this is financial advice/i);
    assert.doesNotMatch(html, /noindex/);
  });
});

describe('ai-proof-job page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = jobProof(ctx);
    assert.match(html, /<title>How do I AI-proof my job\?/);
    assert.match(html, /<h1 class="bp__h1">How do I AI-proof my job\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does this plan guarantee I keep my job\?/);
    assert.match(html, /What are the five moves on this page\?/);
    assert.match(html, /Where does SIREN count measured job effects\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/si-ready\.html/);
    assert.match(html, /\/jobs\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /guarantees? you keep your job/i);
    assert.doesNotMatch(html, /this is (career|financial) advice/i);
    assert.doesNotMatch(html, /noindex/);
  });
});

describe('live-x page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = liveX(ctx);
    assert.match(html, /<title>Where are live X feeds and Spaces on AI\?/);
    assert.match(html, /<h1 class="bp__h1">Where are live X feeds and Spaces on AI\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does this page embed X\?/);
    assert.match(html, /What Spaces links are on this page\?/);
    assert.match(html, /Where is a scored version of the same AI news\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /does not embed X on this page/);
    assert.match(html, /\/live\.html/);
    assert.match(html, /\/news\.html/);
    assert.match(html, /What AI is on TV and radio right now\?/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /"name"\s*:\s*"Live on X"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
