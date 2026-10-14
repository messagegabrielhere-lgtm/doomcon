import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, TOPICS } from './topicPages.mjs';

const ledger = {
  as_of_date: '2026-10-10',
  status_words: { benefit: {}, harm: {} },
  benefit: [
    {
      id: 'fda-ai-devices',
      side: 'benefit',
      status: 'authorised',
      domain: 'medical devices',
      title: 'FDA-authorised AI devices',
      what_is_measured: 'Count of AI/ML-enabled devices on the FDA list.',
      what_is_claimed: 'Authorisation, not patient outcomes.',
      caveat: 'An authorisation is not a measured patient benefit.',
      as_of: '2026-10-01',
      numbers: [{ value: '1000', unit: 'devices', date: '2026-10-01', source_url: 'https://example.test/fda' }],
      sources: ['https://example.test/fda'],
    },
  ],
  harm: [
    {
      id: 'challenger-ai-cited-cuts',
      side: 'harm',
      status: 'announced',
      domain: 'jobs',
      title: 'Challenger AI-cited cuts',
      what_is_measured: 'Announced job cuts that mention AI.',
      what_is_claimed: 'Employers citing AI in layoff notices.',
      caveat: 'Announcements are not verified job losses to AI.',
      as_of: '2026-10-01',
      numbers: [{ value: '100', unit: 'cuts', date: '2026-10-01', source_url: 'https://example.test/jobs' }],
      sources: ['https://example.test/jobs'],
    },
  ],
};

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: { level: 4, level_name: 'ROUTINE', score: 55.5, generated_at: '2026-10-10T00:00:00Z', receipt_id: 'r1' },
  cardFor: () => null,
  ledger,
  news: { generated_at: '2026-10-10T00:00:00Z', items: [] },
};

describe('jobs / medicine topic pages', () => {
  it('ships question-shaped titles, speakable, breadcrumbs, and visible FAQ', () => {
    assert.equal(TOPICS.jobs.h1, 'Is AI taking jobs? What has actually been measured');
    assert.equal(TOPICS.medicine.h1, 'Is AI curing anything? Trial results, approvals and what they show');

    const jobs = render(ctx, 'jobs');
    assert.match(jobs, /<title>Is AI taking jobs\? What has actually been measured/);
    assert.match(jobs, /<h1 class="bp__h1">Is AI taking jobs\? What has actually been measured<\/h1>/);
    assert.match(jobs, /"name"\s*:\s*"Is AI taking jobs\? What has actually been measured"/);
    assert.doesNotMatch(jobs, /<h1[^>]*>Is AI taking jobs\? What has been measured<\/h1>/);
    assert.match(jobs, /SpeakableSpecification/);
    assert.match(jobs, /BreadcrumbList/);
    assert.match(jobs, /"@type"\s*:\s*"FAQPage"/);
    assert.match(jobs, /Questions people actually ask/);
    assert.match(jobs, /Does SIREN publish a jobs forecast/);
    assert.match(jobs, /href="\/balance\.html#reg-challenger-ai-cited-cuts">How does SIREN count AI harm and benefit side by side\? →<\/a>/);
    assert.doesNotMatch(jobs, /href="\/balance\.html#reg-challenger-ai-cited-cuts">In the register →<\/a>/);
    assert.match(jobs, /href="\/balance\.html">How does SIREN count AI harm and benefit side by side\? →<\/a>/);
    assert.doesNotMatch(jobs, /href="\/balance\.html">Every register entry, both sides →<\/a>/);
    assert.match(jobs, /href="\/library\.html">What AI books argue both sides of the case\? →<\/a>/);
    assert.doesNotMatch(jobs, /href="\/library\.html">Books on the argument \(paid links\) →<\/a>/);
    assert.doesNotMatch(jobs, /probability of doom is \d/i);
    assert.match(jobs, /<h2[^>]*>Which headlines mention this in the newsroom now\?<\/h2>/);
    assert.doesNotMatch(jobs, /<h2[^>]*>In the newsroom now<\/h2>/);
    assert.match(jobs, /"name"\s*:\s*"Which headlines mention this in the newsroom now\?"/);
    assert.match(jobs, /class="tp__k">What is measured\?<\/h3>/);
    assert.match(jobs, /class="tp__k">What gets claimed\?<\/h3>/);
    assert.match(jobs, /class="tp__k">What is the caveat\?<\/h3>/);
    assert.doesNotMatch(jobs, /class="tp__k">What is measured<\/h3>/);
    assert.doesNotMatch(jobs, /class="tp__k">What gets claimed<\/h3>/);
    assert.doesNotMatch(jobs, /class="tp__k">The caveat<\/h3>/);
    assert.match(jobs, /"name"\s*:\s*"What is measured\?"/);
    assert.match(jobs, /"name"\s*:\s*"What gets claimed\?"/);
    assert.match(jobs, /"name"\s*:\s*"What is the caveat\?"/);

    const med = render(ctx, 'medicine');
    assert.match(med, /<title>Is AI curing anything\? Trial results, approvals and what they show/);
    assert.match(med, /<h1 class="bp__h1">Is AI curing anything\? Trial results, approvals and what they show<\/h1>/);
    assert.match(med, /"name"\s*:\s*"Is AI curing anything\? Trial results, approvals and what they show"/);
    assert.doesNotMatch(med, /<h1[^>]*>Is AI curing anything\? Results on the record<\/h1>/);
    assert.match(med, /SpeakableSpecification/);
    assert.match(med, /BreadcrumbList/);
    assert.match(med, /"@type"\s*:\s*"FAQPage"/);
    assert.match(med, /Questions people actually ask/);
    assert.match(med, /Does an FDA authorisation mean a measured patient benefit/);
    assert.doesNotMatch(med, /SIREN.*p\(doom\) of \d/i);
  });

  it('register-entry H2s use questions mirrored in FAQPage', () => {
    const jobs = render(ctx, 'jobs');
    assert.match(jobs, /id="challenger-ai-cited-cuts"[\s\S]*?<h2 class="tp__h">How many AI-cited US job cuts has Challenger counted\?<\/h2>/);
    assert.match(jobs, /FAQPage[\s\S]*How many AI-cited US job cuts has Challenger counted\?/);
    assert.doesNotMatch(jobs, /<h2 class="tp__h">Challenger AI-cited cuts<\/h2>/);
    assert.doesNotMatch(jobs, /probability of doom is \d/i);

    const med = render(ctx, 'medicine');
    assert.match(med, /id="fda-ai-devices"[\s\S]*?<h2 class="tp__h">How many AI medical devices has the FDA authorised\?<\/h2>/);
    assert.match(med, /FAQPage[\s\S]*How many AI medical devices has the FDA authorised\?/);
    assert.doesNotMatch(med, /<h2 class="tp__h">FDA-authorised AI devices<\/h2>/);
    assert.doesNotMatch(med, /SIREN.*p\(doom\) of \d/i);
  });
});
