import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { catalog, catalogEntries, catalogTitle, search } from './catalogPages.mjs';
import { roomGroups } from './homeV2.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  routes: { world: 1, flock: 1, exploits: 1, balance: 1 },
  race: null,
  leaders: null,
  news: null,
  digest: {},
  infra: null,
  datacenters: null,
  world: null,
  flock: null,
  molt: null,
  liveMedia: null,
  history: null,
};

const entries = [
  { type: 'page', url: '/race.html', title: 'The Race', desc: 'Labs ranked.', group: 'LIVE INTEL', icon: 'radar' },
  { type: 'tool', url: '/scanner.html', title: 'Scanner', desc: 'Screen stocks.', icon: 'px:crosshair' },
  { type: 'game', url: '/contain.html', title: 'Containment', desc: 'Arcade.', icon: 'px:core' },
];

describe('catalog page SEO', () => {
  it('lists provenance pages under their question titles (tip #210)', () => {
    const list = catalogEntries({});
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/press.html']?.title, 'Where is the SIREN press kit?');
    assert.equal(byUrl['/brand.html']?.title, 'Where is the SIREN brand guide?');
    assert.equal(byUrl['/terms.html']?.title, 'What are the SIREN terms of use?');
    assert.equal(byUrl['/privacy.html']?.title, 'What does SIREN know about you?');
    assert.equal(byUrl['/disclosures.html']?.title, 'What does SIREN disclose?');
    assert.equal(byUrl['/about.html']?.title, 'What is SIREN?');
    assert.doesNotMatch(byUrl['/press.html']?.title || '', /^Press kit$/);
  });

  it('lists conquest pages under their question titles (tip #211)', () => {
    const list = catalogEntries({});
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/compare.html']?.title, 'Which AI doom indexes can you compare?');
    assert.equal(byUrl['/alternatives.html']?.title, 'What are AI doom index alternatives?');
    assert.equal(byUrl['/vs.html']?.title, 'Which AI indexes does SIREN contrast?');
    assert.equal(byUrl['/guides.html']?.title, 'What are the AI explainers?');
    assert.equal(byUrl['/guide.html']?.title, 'How does SIREN compare to DEFCON, the Doomsday Clock and p(doom)?');
    assert.equal(byUrl['/vs/doombench.html']?.title, 'SIREN vs DoomBench: which should you use?');
    assert.equal(byUrl['/vs/takeofftracker.html']?.title, 'SIREN vs Takeoff Tracker: which should you use?');
    assert.doesNotMatch(byUrl['/compare.html']?.title || '', /^AI doom indexes compared$/);
  });

  it('lists facet directories under their question titles (tip #212)', () => {
    const list = catalogEntries({});
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/tags.html']?.title, 'Which AI tags has SIREN scored stories about?');
    assert.equal(byUrl['/people.html']?.title, 'Which AI people has SIREN scored press about?');
    assert.equal(byUrl['/sources.html']?.title, 'Which AI news sources has SIREN scored via?');
    assert.equal(byUrl['/outlets.html']?.title, 'Which AI outlets has SIREN scored stories from?');
    assert.equal(byUrl['/kinds.html']?.title, 'Which AI story kinds has SIREN scored?');
    assert.equal(byUrl['/countries.html']?.title, 'Which AI datacentre countries has SIREN mapped?');
    assert.equal(byUrl['/pillars.html']?.title, 'Which AI activity pillars has SIREN scored?');
    assert.equal(byUrl['/models.html']?.title, 'Which AI models has SIREN scored stories about?');
    assert.equal(byUrl['/companies.html']?.title, 'Which AI companies has SIREN scored stories about?');
    assert.equal(byUrl['/item/archive.html']?.title, 'Which older AI stories has SIREN kept in the archive?');
    assert.equal(byUrl['/lab/']?.title, 'Which AI labs have SIREN pages?');
    assert.doesNotMatch(byUrl['/tags.html']?.title || '', /^AI tags$/);
  });

  it('prefers question titles when home groups supply short labels (tip #213)', () => {
    assert.equal(
      catalogTitle('/tags.html', 'Tags', 'Which AI tags has SIREN scored stories about? Topic hubs.'),
      'Which AI tags has SIREN scored stories about?',
    );
    assert.equal(
      catalogTitle('/race.html', 'The Race', 'Who is winning the AI race? Labs ranked on odds.'),
      'Who is winning the AI race?',
    );
    assert.equal(catalogTitle('/si-ready.html', 'Ready for SI', 'Ready for superintelligence? Plan.'), 'Ready for superintelligence?');

    const list = catalogEntries({ groups: roomGroups(ctx) });
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/tags.html']?.title, 'Which AI tags has SIREN scored stories about?');
    assert.equal(byUrl['/compare.html']?.title, 'Which AI doom indexes can you compare?');
    assert.equal(byUrl['/alternatives.html']?.title, 'What are AI doom index alternatives?');
    assert.equal(byUrl['/models.html']?.title, 'Which AI models has SIREN scored stories about?');
    assert.equal(byUrl['/race.html']?.title, 'Who is winning the AI race?');
    assert.equal(byUrl['/leaders.html']?.title, 'Which AI leaders are on the record this week?');
    assert.equal(byUrl['/watts.html']?.title, 'What does the SIREN infrastructure index read?');
    assert.equal(byUrl['/map.html']?.title, 'How many datacentres has SIREN mapped in the United States?');
    assert.equal(byUrl['/world.html']?.title, 'How many datacentres has SIREN mapped on Earth?');
    assert.equal(byUrl['/bliss.html']?.title, 'What is BLISS, the SIREN upside index?');
    assert.equal(byUrl['/ai-proof-job.html']?.title, 'How do I AI-proof my job?');
    assert.equal(byUrl['/si-ready.html']?.title, 'Ready for superintelligence?');
    assert.equal(byUrl['/bug-out-land.html']?.title, 'Where to buy remote land to ride out Skynet?');
    assert.doesNotMatch(byUrl['/tags.html']?.title || '', /^Tags$/);
    assert.doesNotMatch(byUrl['/compare.html']?.title || '', /^Compare indexes$/);
    assert.doesNotMatch(byUrl['/race.html']?.title || '', /^The Race$/);
  });

  it('lists receipts under a question title (tip #216)', () => {
    const list = catalogEntries({});
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/api/receipts/']?.title, 'Where are the SIREN reading receipts?');
    assert.doesNotMatch(byUrl['/api/receipts/']?.title || '', /^Receipts$/);
  });

  it('lists each pillar page under its question H1 (tip #215)', () => {
    const list = catalogEntries({});
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/pillar/capability.html']?.title, 'What has SIREN scored under Capability?');
    assert.equal(byUrl['/pillar/compute.html']?.title, 'What has SIREN scored under Compute & Capital?');
    assert.equal(byUrl['/pillar/attention.html']?.title, 'What has SIREN scored under Attention?');
    assert.equal(byUrl['/pillar/governance.html']?.title, 'What has SIREN scored under Governance?');
    assert.equal(byUrl['/pillar/markets.html']?.title, 'What has SIREN scored under Markets?');
    assert.doesNotMatch(byUrl['/pillar/capability.html']?.title || '', /^Capability pillar$/);
    assert.match(byUrl['/pillar/capability.html']?.desc || '', /not a pillar doom score/i);
    assert.doesNotMatch(byUrl['/pillar/capability.html']?.desc || '', /doom score:\s*\d/i);
  });

  it('lists methodology, instruments, moves and item under page H1 stems (tip #214)', () => {
    assert.equal(
      catalogTitle('/methodology.html', 'Methodology', 'How the SIREN AI activity index is computed · methodology — every formula.'),
      'How the SIREN AI activity index is computed · methodology',
    );
    assert.equal(
      catalogTitle('/instruments.html', 'Instruments', 'Score history.'),
      'What instruments sit behind the SIREN reading?',
    );

    const list = catalogEntries({ groups: roomGroups(ctx) });
    const byUrl = Object.fromEntries(list.map((e) => [e.url, e]));
    assert.equal(byUrl['/methodology.html']?.title, 'How the SIREN AI activity index is computed · methodology');
    assert.equal(byUrl['/instruments.html']?.title, 'What instruments sit behind the SIREN reading?');
    assert.equal(byUrl['/moves/']?.title, 'Where are the SIREN index moves?');
    assert.equal(byUrl['/item/']?.title, 'Which scored AI stories are in the SIREN live window?');
    assert.doesNotMatch(byUrl['/methodology.html']?.title || '', /^Methodology$/);
    assert.doesNotMatch(byUrl['/instruments.html']?.title || '', /^Instruments$/);
    assert.doesNotMatch(byUrl['/moves/']?.title || '', /^Every move$/);
    assert.doesNotMatch(byUrl['/item/']?.title || '', /^Every story$/);
  });

  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = catalog(ctx, entries);
    assert.match(html, /<title>Where is everything on SIREN listed\?/);
    assert.match(html, /<h1 class="bp__h1">Where is everything on SIREN listed\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /How do I filter the catalog\?/);
    assert.match(html, /Where do I find stories, leaders and Bunker Kit tools\?/);
    assert.match(html, /What kinds of things are listed\?/);
    assert.match(html, /What is listed under LIVE INTEL\?/);
    assert.match(html, /FAQPage[\s\S]*What is listed under LIVE INTEL\?/);
    assert.match(html, /Which rooms and pages are in the catalog\?/);
    assert.match(html, /Which tools are in the catalog\?/);
    assert.match(html, /FAQPage[\s\S]*Which rooms and pages are in the catalog\?/);
    assert.doesNotMatch(html, /<h3>LIVE INTEL<\/h3>/);
    assert.doesNotMatch(html, /<h3>PLAY &amp; PREP<\/h3>/);
    assert.doesNotMatch(html, /<h2>Rooms &amp; pages<span>/);
    assert.doesNotMatch(html, /<h2>Tools<span>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /ItemList/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/live\.html/);
    assert.match(html, /\/search\.html/);
    assert.match(html, /How do you search everything on SIREN\?/);
    assert.match(html, /one directory/);
    assert.match(html, /href="\/search\.html">How do you search everything on SIREN\?<\/a>/);
    assert.doesNotMatch(html, /href="\/search\.html">Search<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /catalog of doom/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('search result-group H2 questions ship in FAQPage and client typeH2 map', () => {
    const html = search(ctx, { counts: { page: 12, tool: 4, news: 80, leader: 9, faq: 20, kit: 6 } });
    assert.match(html, /<title>How do you search everything on SIREN\?/);
    assert.match(html, /Which rooms and pages matched\?/);
    assert.match(html, /Which news stories matched\?/);
    assert.match(html, /Which leaders matched\?/);
    assert.match(html, /Which questions matched\?/);
    assert.match(html, /Which Bunker Kit tools matched\?/);
    assert.match(html, /FAQPage[\s\S]*Which rooms and pages matched\?/);
    assert.match(html, /FAQPage[\s\S]*Which news stories matched\?/);
    assert.match(html, /D\.typeH2&&D\.typeH2\[k\]/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
