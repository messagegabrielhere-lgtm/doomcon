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
    assert.match(html, /<h2>Where else can you find more of the AI upside\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>More of the upside<\/h2>/);
    assert.match(html, /What is BLISS, the SIREN upside index\? →/);
    assert.match(html, /Is AI curing anything\? →/);
    assert.doesNotMatch(html, /<h3>The Upside index →<\/h3>/);
    assert.doesNotMatch(html, /<h3>Medicine →<\/h3>/);
    assert.match(html, /Does SIREN publish a breakthroughs doom score\?/);
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
    assert.match(html, /<h2>What are the six readiness areas\?<\/h2>/);
    assert.match(html, /<h2>What is the 3-minute readiness check\?<\/h2>/);
    assert.match(html, /What is your readiness score\?/);
    assert.doesNotMatch(html, /<h3>Your readiness:/);
    assert.match(html, /<h2>What is the full guide for how regular people can prepare\?<\/h2>/);
    assert.match(html, /<h2>What is a 30-day starter plan for SI readiness\?<\/h2>/);
    assert.match(html, /<h2>What should you not do when preparing for SI\?<\/h2>/);
    assert.match(html, /<h2>Where can you keep going from here\?<\/h2>/);
    assert.match(html, /What does the Work and skills area cover\?/);
    assert.match(html, /What does the Money and resilience area cover\?/);
    assert.match(html, /What does the Civic voice area cover\?/);
    assert.match(html, /What do you do in Week 1 of the SI plan\?/);
    assert.match(html, /What do you do in Week 4 of the SI plan\?/);
    assert.match(html, /FAQPage[\s\S]*What does the Work and skills area cover\?/);
    assert.match(html, /FAQPage[\s\S]*What do you do in Week 1 of the SI plan\?/);
    assert.match(html, /How ready are you on Work and skills\?/);
    assert.match(html, /How ready are you on Civic voice\?/);
    assert.match(html, /FAQPage[\s\S]*How ready are you on Work and skills\?/);
    assert.match(html, /AREAS\[k\]\.q\|\|/);
    assert.doesNotMatch(html, /\.name\+' <span class="fx-pill">/);
    assert.doesNotMatch(html, /<h3>Work and skills<\/h3>/);
    assert.doesNotMatch(html, /<h3>Week 1<\/h3>/);
    assert.doesNotMatch(html, /<h2>The six areas<\/h2>/);
    assert.doesNotMatch(html, /<h2>Your check<\/h2>/);
    assert.doesNotMatch(html, /<h2>Keep going<\/h2>/);
    assert.doesNotMatch(html, /<h2>The full guide: how regular people can prepare<\/h2>/);
    assert.match(html, /Does SIREN publish an SI-ready doom score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/ai-proof-job\.html/);
    assert.match(html, /How do I AI-proof my job\?/);
    assert.match(html, /\/breakthroughs\.html/);
    const keep = html.match(/<h2>Where can you keep going from here\?<\/h2>\s*<div class="fx-grid">([\s\S]*?)<\/div>/);
    assert.ok(keep, 'expected keep-going cards');
    assert.match(keep[1], /How do I AI-proof my job\? →/);
    assert.match(keep[1], /What belongs in a 72-hour prepper kit\? →/);
    assert.match(keep[1], /What AI breakthroughs has SIREN tracked\? →/);
    assert.doesNotMatch(keep[1], /<h3>AI-proof your job →<\/h3>/);
    assert.doesNotMatch(keep[1], /<h3>Prepper Checklist →<\/h3>/);
    assert.doesNotMatch(keep[1], /<h3>Breakthroughs →<\/h3>/);
    const fx = html.match(/<section class="fx">([\s\S]*)<\/section>/);
    assert.ok(fx, 'expected fx section');
    assert.match(fx[1], /href="\/elon\.html">Where can you find real clips of AI leaders\?<\/a>/);
    assert.doesNotMatch(fx[1], /href="\/elon\.html">Real Clips<\/a>/);
    assert.doesNotMatch(fx[1], /href="\/prepper-checklist\.html">Prepper Checklist<\/a>/);
    assert.doesNotMatch(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Ready for SI\?"/);
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
    assert.match(html, /<h2>What five moves keep working as AI changes tasks\?<\/h2>/);
    assert.match(html, /<h2>How do I build my AI-proof job plan\?<\/h2>/);
    assert.match(html, /<h2>What job effects has SIREN actually counted\?<\/h2>/);
    assert.match(html, /How do I move toward the work AI is worst at\?/);
    assert.match(html, /How do I become the person who runs the AI\?/);
    assert.match(html, /How do I make my value visible\?/);
    assert.match(html, /How do I keep learning on purpose\?/);
    assert.match(html, /How do I build a safety net\?/);
    assert.match(html, /FAQPage[\s\S]*How do I move toward the work AI is worst at\?/);
    assert.match(html, /FAQPage[\s\S]*How do I build a safety net\?/);
    assert.match(html, /How ready are you to move toward the work AI is worst at\?/);
    assert.match(html, /How ready are you to build a safety net\?/);
    assert.match(html, /FAQPage[\s\S]*How ready are you to move toward the work AI is worst at\?/);
    assert.match(html, /AREAS\[k\]\.q\|\|/);
    assert.doesNotMatch(html, /\.name\+' <span class="fx-pill">/);
    assert.doesNotMatch(html, /<h3>Move toward the work AI is worst at<\/h3>/);
    assert.doesNotMatch(html, /<h3>Build a safety net<\/h3>/);
    assert.doesNotMatch(html, /<h2>Five moves that keep working<\/h2>/);
    assert.doesNotMatch(html, /<h2>Your plan<\/h2>/);
    assert.doesNotMatch(html, /<h2>What has actually been counted<\/h2>/);
    assert.match(html, /Does SIREN publish an AI-proof-job doom score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/si-ready\.html/);
    assert.match(html, /\/jobs\.html/);
    assert.match(html, /href="\/jobs\.html">Is AI taking jobs\?<\/a>/);
    assert.doesNotMatch(html, /href="\/jobs\.html">Jobs room<\/a>/);
    assert.doesNotMatch(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"AI-proof your job"/);
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
    assert.match(html, /<h2>Which live X feeds on AI are linked here\?<\/h2>/);
    assert.match(html, /<h2>Which AI Spaces can you join on X\?<\/h2>/);
    assert.match(html, /<h2>Which AI labs should you follow on X\?<\/h2>/);
    assert.match(html, /<h2>Which AI leaders should you follow on X\?<\/h2>/);
    assert.match(html, /What is the latest on superintelligence\?/);
    assert.match(html, /What is the latest on AGI\?/);
    assert.match(html, /What is the latest on AI safety\?/);
    assert.match(html, /Which new model launches are people posting\?/);
    assert.match(html, /What are people saying about AI and jobs\?/);
    assert.match(html, /What Skynet talk is on X right now\?/);
    assert.match(html, /FAQPage[\s\S]*What is the latest on superintelligence\?/);
    assert.match(html, /FAQPage[\s\S]*What Skynet talk is on X right now\?/);
    assert.doesNotMatch(html, /<h3>Superintelligence, latest/);
    assert.doesNotMatch(html, /<h3>AGI, latest/);
    assert.doesNotMatch(html, /<h3>AI safety, latest/);
    assert.doesNotMatch(html, /<h3>New model launches/);
    assert.doesNotMatch(html, /<h3>AI and jobs/);
    assert.doesNotMatch(html, /<h3>Skynet talk/);
    assert.doesNotMatch(html, /<h2>Live feeds<\/h2>/);
    assert.doesNotMatch(html, /<h2>Spaces: live audio rooms on AI<\/h2>/);
    assert.doesNotMatch(html, /<h2>Labs to follow<\/h2>/);
    assert.doesNotMatch(html, /<h2>Leaders to follow<\/h2>/);
    assert.match(html, /Does SIREN publish a live-X doom score\?/);
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

  it('Spaces and voice cards use question H3s mirrored in FAQPage', () => {
    const html = liveX(ctx);
    assert.match(html, /<h3>What AI Spaces are live on X\? ↗<\/h3>/);
    assert.match(html, /What chatbot Spaces are live on X\?/);
    assert.match(html, /What AI safety Spaces are live on X\?/);
    assert.match(html, /<h3>Who is OpenAI on X\? ↗<\/h3>/);
    assert.match(html, /Who is Anthropic on X\?/);
    assert.match(html, /Who is Sam Altman on X\?/);
    assert.match(html, /Who is Elon Musk on X\?/);
    assert.match(html, /FAQPage[\s\S]*What AI Spaces are live on X\?/);
    assert.match(html, /FAQPage[\s\S]*Who is OpenAI on X\?/);
    assert.match(html, /FAQPage[\s\S]*Who is Sam Altman on X\?/);
    assert.doesNotMatch(html, /🎙 AI Spaces/);
    assert.doesNotMatch(html, /🎙 Chatbot Spaces/);
    assert.doesNotMatch(html, /<a class="fx-x"[^>]*>OpenAI <span class="fx-meta">@OpenAI<\/span><\/a>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
