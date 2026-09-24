import { writeFile } from 'node:fs/promises';
import { css } from './site/styles.mjs';
import { indexHistoryChart, gauge, distributionStrip, pillarRanked, sparkline } from './site/templates/_charts.mjs';

const reelCard = (kick, chip, title, body, num, foot) => `
<li><a class="reel__card" href="#">
  <span class="reel__kicker"><span class="chip chip--sm ${chip}">${kick}</span>
    <span class="pillar-tag" data-pillar="markets">Markets</span></span>
  <h3 class="reel__title">${title}</h3>
  <p class="reel__body">${body}</p>
  <span class="reel__foot"><span class="reel__num">${num}</span><span>${foot}</span></span>
</a></li>`;

const feedRow = (t, chip, src, title, extra, cls = '') => `
<li class="feed__row ${cls}">
  <time class="feed__time" datetime="2026-09-23T21:04:00Z">${t}</time>
  <span class="feed__meta">
    <span class="chip chip--sm ${chip}">${src}</span>
    <span class="pillar-tag" data-pillar="attention">Attention</span>
    ${extra}
  </span>
  <a class="feed__title" href="#">${title}</a>
</li>`;

const demo = `
<h2 class="sec__h">News reel</h2>
<p class="reel__hint">Swipe →</p>
<div class="reel"><ul class="reel__rail">
${reelCard('KALSHI', 'chip--kalshi', 'AI model released before July 2027', 'Volume up sharply over 24h.', '62%', '+4.1 24h')}
${reelCard('POLYMARKET', 'chip--polymarket', 'Which lab has the best model end of year', 'Repricing across 14 legs.', '31%', '−2.2 24h')}
${reelCard('ARXIV', 'chip--paper', 'cs.AI submissions, trailing 7 days', 'Above the frozen reference median.', '1,523', '91st pctl')}
</ul></div>

<h2 class="sec__h">Live feed</h2>
<div class="feed__head"><span class="feed__live">Live</span><span class="chip chip--sm chip--quiet">13 sources</span></div>
<ul class="feed">
${feedRow('21:04', 'chip--x', '@doomcon', 'DOOMCON holds at 4 · ROUTINE. Composite 40.8 of 100.', '<span class="feed__move" data-dir="up">+0.4</span>', 'feed__row--new')}
${feedRow('20:41', 'chip--kalshi', 'Kalshi', 'AGI-before-2030 contract trades 2.1 points wider on the day.', '<span class="feed__odds">18<small>¢ YES</small></span>')}
${feedRow('20:12', 'chip--gov', 'Federal Register', 'Two new AI-related rule documents published.', '<span class="feed__move" data-dir="flat">0.0</span>')}
${feedRow('19:58', 'chip--news', 'HN', 'Front-page AI stories: 14 of the top 60.', '<span class="feed__move" data-dir="down">−1.2</span>')}
</ul>
<p class="feed__more"><a href="#">Full feed →</a></p>
`;

const page = `
<h2 class="sec__h">Hero chart</h2>
${indexHistoryChart([
  {t:'2026-09-21T00:00:00Z',score:40.9,level:4},{t:'2026-09-21T06:00:00Z',score:47.2,level:4},
  {t:'2026-09-21T12:00:00Z',score:55.6,level:3},{t:'2026-09-21T18:00:00Z',score:62.1,level:3},
  {t:'2026-09-22T00:00:00Z',score:58.4,level:3},{t:'2026-09-22T06:00:00Z',score:52.0,level:4},
  {t:'2026-09-22T12:00:00Z',score:47.6,level:4}])}
<h2 class="sec__h">Gauge</h2>${gauge(47.6)}
<h2 class="sec__h">Pillar ranking</h2>${pillarRanked([
  {id:'capability',score:71.2},{id:'compute',score:50.3},{id:'attention',score:41.2},
  {id:'governance',score:53.2},{id:'markets',score:null,uncalibrated:true}])}
<h2 class="sec__h">Distribution</h2>${distributionStrip(0.76)}
${demo}`;

await writeFile('_focus.html', `<!doctype html><html lang="en" data-theme="${process.argv[2] || 'dark'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>hooks</title>
<style>${css()}</style></head><body><main class="wrap">${page}</main></body></html>`);
console.log('wrote _focus.html');
