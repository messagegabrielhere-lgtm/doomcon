import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { navJs } from './siteheader.mjs';

describe('siteheader rooms keyboard help (tip #256)', () => {
  it('search and catalog links use destination H1 questions', () => {
    const js = navJs([['/news.html', 'px:news', 'News', 'Stories', 'NEWS']], '');
    assert.match(js, /\/search\.html"[^>]*>How do you search everything on SIREN\?<\/a>/);
    assert.match(js, /\/catalog\.html"[^>]*>Where is everything on SIREN listed\?<\/a>/);
    assert.doesNotMatch(js, />full search<\/a>/);
    assert.doesNotMatch(js, />catalog<\/a>/);
    assert.match(js, /How do you search everything on SIREN\? “'\+e\(raw\)\+'/);
    assert.doesNotMatch(js, /Search everything for/);
    assert.doesNotMatch(js, /doom score/i);
    assert.doesNotMatch(js, /probability of doom/i);
  });
});
