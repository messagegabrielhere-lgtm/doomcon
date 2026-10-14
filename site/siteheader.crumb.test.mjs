import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { relatedHtml, navJs } from './siteheader.mjs';
import { homeCrumbName } from './templates/_seo.mjs';

describe('siteheader home crumb (tip #258)', () => {
  it('relatedHtml crumb uses the home title, not bare Home', () => {
    const rooms = [
      ['/games.html', 'px:arcade', 'What free AI games can you play on SIREN?', 'Browser games', 'PLAY & PREP'],
      ['/contain.html', 'px:core', 'Can you stop an AI breakout?', 'Game', 'PLAY & PREP'],
    ];
    const html = relatedHtml(rooms, 'games.html', '');
    assert.match(html, /href="\/">AI activity index today · SIREN<\/a>/);
    assert.equal(homeCrumbName(), 'AI activity index today · SIREN');
    assert.doesNotMatch(html, /href="\/">Home<\/a>/);
    assert.doesNotMatch(html, /doom score/i);
  });

  it('rooms dialog Index row uses the home title', () => {
    const js = navJs([['/news.html', 'px:news', 'News', 'Stories', 'NEWS']], '');
    assert.match(js, /<b>AI activity index today · SIREN<\/b>/);
    assert.doesNotMatch(js, /<b>Index<\/b>/);
  });
});
