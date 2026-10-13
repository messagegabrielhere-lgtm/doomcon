import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'monitor.html'), 'utf8');

describe('monitor page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>What does the SIREN World Monitor show\?/);
    assert.match(html, /<h1>What does the SIREN World Monitor show\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /What is the country stress index\?/);
    assert.match(html, /Is the World Monitor a forecast\?/);
    assert.match(html, /What sources feed the map\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /dispatch\.html/);
    assert.match(html, /threats\.html/);
    assert.match(html, /What public feeds does SIREN Dispatch show\?/);
    assert.match(html, /What could take the machines offline tonight\?/);
    assert.match(html, /It counts coverage\. It is not a forecast/);
    assert.match(html, /not danger/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom|forecasts the end/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
