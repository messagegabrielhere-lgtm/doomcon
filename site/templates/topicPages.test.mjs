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
    assert.equal(TOPICS.jobs.h1.includes('Is AI taking jobs?'), true);
    assert.equal(TOPICS.medicine.h1.includes('Is AI curing anything?'), true);

    const jobs = render(ctx, 'jobs');
    assert.match(jobs, /<title>Is AI taking jobs\? What has actually been measured/);
    assert.match(jobs, /SpeakableSpecification/);
    assert.match(jobs, /BreadcrumbList/);
    assert.match(jobs, /"@type"\s*:\s*"FAQPage"/);
    assert.match(jobs, /Questions people actually ask/);
    assert.match(jobs, /Does SIREN publish a jobs forecast/);
    assert.doesNotMatch(jobs, /probability of doom is \d/i);

    const med = render(ctx, 'medicine');
    assert.match(med, /<title>Is AI curing anything\? Trial results/);
    assert.match(med, /SpeakableSpecification/);
    assert.match(med, /BreadcrumbList/);
    assert.match(med, /"@type"\s*:\s*"FAQPage"/);
    assert.match(med, /Questions people actually ask/);
    assert.match(med, /Does an FDA authorisation mean a measured patient benefit/);
    assert.doesNotMatch(med, /SIREN.*p\(doom\) of \d/i);
  });
});
