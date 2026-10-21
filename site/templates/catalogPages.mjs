// SEARCH AND CATALOG. One registry of everything on the site, built at build
// time and used three ways:
//   catalogEntries()  every room (from homeV2.roomGroups, the list the header,
//                     the homepage tiles and the related-rooms strip already
//                     share), every other page actually written, every video,
//                     data file, feed and embed
//   searchIndex()     those entries plus the content already in data/ (the
//                     newsroom's stories, the leaders, the FAQ, the Bunker Kit's
//                     tools), packed into api/search-index.json
//   search() / catalog()   /search.html and /catalog.html
// The matcher itself lives in ../searchcore.mjs so the header finder and the
// search page rank the same way.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor, hasItems } from './itemPage.mjs';
import * as brand from '../brand.mjs';
import { SEARCH_CORE_JS } from '../searchcore.mjs';

// Display order and labels, shared by both pages and the header.
export const TYPES = [
  ['page', 'Rooms & pages'], ['tool', 'Tools'], ['game', 'Games'], ['video', 'Videos'],
  ['leader', 'Leaders'], ['news', 'News'], ['data', 'Data & API'], ['feed', 'Feeds'],
  ['embed', 'Embeds'], ['faq', 'Questions'], ['kit', 'Bunker Kit'],
];
const TYPE_LABEL = Object.fromEntries(TYPES);
// Tip #368: catalog section H2s are question-shaped (chips keep short TYPE_LABEL).
const TYPE_H2_Q = {
  page: 'Which rooms and pages are in the catalog?',
  tool: 'Which tools are in the catalog?',
  game: 'Which games are in the catalog?',
  video: 'Which videos are in the catalog?',
  data: 'Which data and API files are in the catalog?',
  feed: 'Which feeds are in the catalog?',
  embed: 'Which embeds are in the catalog?',
};
// Tip #394: search result-group H2s are question-shaped (chips keep short TYPE_LABEL).
const SEARCH_TYPE_H2_Q = {
  page: 'Which rooms and pages matched?',
  tool: 'Which tools matched?',
  game: 'Which games matched?',
  video: 'Which videos matched?',
  leader: 'Which leaders matched?',
  news: 'Which news stories matched?',
  data: 'Which data and API files matched?',
  feed: 'Which feeds matched?',
  embed: 'Which embeds matched?',
  faq: 'Which questions matched?',
  kit: 'Which Bunker Kit tools matched?',
};
// The picture a result gets when it has none of its own.
export const TYPE_ICON = { page: 'px:doc', tool: 'px:ruler', game: 'joystick', video: 'px:film', leader: 'mic', news: 'news', data: 'px:db', feed: 'px:rss', embed: 'px:code', faq: 'px:chat', kit: 'bunker' };
// The catalog lists the site's own things; stories, leaders, questions and the
// kit's outside tools are search-only.
export const CATALOG_TYPES = ['page', 'tool', 'game', 'video', 'data', 'feed', 'embed'];

// Rooms that are something you play or use rather than read.
const GAMES = new Set(['/game.html', '/contain.html', '/day-after.html', '/arena.html#battle']);
const TOOLS = new Set(['/search.html', '/catalog.html', '/scanner.html', '/si-ready.html', '/ai-proof-job.html', '/prepper-checklist.html', '/bug-out-land.html', '/bunker-kit.html', '/arena.html', '/verify.html', '/free-tools.html', '/alerts.html', '/export.html']);

// Pages that are not homepage rooms. Written only if the file exists; anything
// written that is in neither list still turns up, from its own <title>.
const MORE_PAGES = [
  ['/', 'siren', 'Home', 'The live SIREN level, the score and the war room.'],
  ['/instruments.html', 'px:updown', 'What instruments sit behind the SIREN reading?', 'Score history, source health, the five pillars and the API.'],
  ['/methodology.html', 'magnifier', 'How the SIREN AI activity index is computed · methodology', 'Every formula — recompute yourself. Not a doom probability.'],
  ['/guide.html', 'clock', 'How does SIREN compare to DEFCON, the Doomsday Clock and p(doom)?', 'What each measure is — and is not.'],
  ['/guides.html', 'clock', 'What are the AI explainers?', 'p(doom), clocks, doom indexes — vocabulary without a doom probability.'],
  ['/free-tools.html', 'magnifier', 'What free tools does SIREN publish?', 'Verify, alerts, export, OpenAPI — free instruments, no account.'],
  ['/verify.html', 'magnifier', 'How do you check a SIREN reading yourself?', 'Re-hash the last 12 public receipts in your browser.'],
  ['/compare.html', 'px:updown', 'Which AI doom indexes can you compare?', 'SIREN vs DoomBench, Skynet Countdown, p(doom), PizzINT and Takeoff Tracker.'],
  ['/vs.html', 'px:updown', 'Which AI indexes does SIREN contrast?', 'Directory of honest versus pages — activity tempo, not doom claims.'],
  ['/alternatives.html', 'px:updown', 'What are AI doom index alternatives?', 'When SIREN is the right substitute — and when it is not.'],
  ['/vs/doombench.html', 'px:updown', 'SIREN vs DoomBench: which should you use?', 'Activity count vs qualitative doom index.'],
  ['/vs/skynet-countdown.html', 'px:updown', 'SIREN vs Skynet Countdown: which should you use?', 'Activity count vs AGI timeline and control-loss odds.'],
  ['/vs/pdoom.html', 'px:updown', 'SIREN vs p(doom) clocks: which should you use?', 'Activity count vs opinion expressed as a percentage.'],
  ['/vs/pizzint.html', 'px:updown', 'SIREN vs PizzINT: which should you use?', 'Activity count vs DEFCON/Doomsday title hijack — honest refuse.'],
  ['/vs/takeofftracker.html', 'px:updown', 'SIREN vs Takeoff Tracker: which should you use?', 'Activity count vs AGI metrics dashboard — honest refuse.'],
  ['/p-doom.html', 'dice', 'What is p(doom)?', 'The probability-of-doom number, explained.'],
  ['/moves/', 'px:updown', 'Where are the SIREN index moves?', 'Each hourly reading that moved, with what moved it — first-party archive.'],
  ['/item/', 'news', 'Which scored AI stories are in the SIREN live window?', 'One permanent page per scored story in the live window.'],
  ['/item/archive.html', 'archive', 'Which older AI stories has SIREN kept in the archive?', 'Older scored stories kept after they leave the live window.'],
  ['/source/', 'news', 'Which AI feed adapters have SIREN pages?', 'Scored stories grouped by the feed adapter that carried them.'],
  ['/sources.html', 'news', 'Which AI news sources has SIREN scored via?', 'Feed-adapter directory — same gated adapters, story counts only.'],
  ['/outlet/', 'news', 'Which AI publishers have SIREN pages?', 'Scored stories grouped by the publisher host on the original URL.'],
  ['/outlets.html', 'news', 'Which AI outlets has SIREN scored stories from?', 'Publisher directory — same gated hosts, story counts only.'],
  ['/model/', 'news', 'Which AI model families have SIREN pages?', 'Scored stories grouped by the model family the headline names.'],
  ['/models.html', 'news', 'Which AI models has SIREN scored stories about?', 'Model directory — same gated families, story counts only, not a model doom score.'],
  ['/lab/', 'px:flask', 'Which AI labs have SIREN pages?', 'Scored stories grouped by the lab or company the headline names.'],
  ['/companies.html', 'px:flask', 'Which AI companies has SIREN scored stories about?', 'Lab/company directory — same gated roster, story counts only, not a company doom score.'],
  ['/people/', 'mic', 'Which AI leaders have press coverage pages on SIREN?', 'AI leaders with enough press coverage for their own page.'],
  ['/people.html', 'mic', 'Which AI people has SIREN scored press about?', 'DoomBench-shaped people directory — same gated roster, headlines only.'],
  ['/tags/', 'news', 'Which AI news tags have SIREN pages?', 'Scored stories grouped by curated topic needles (agents, GPUs, safety, …).'],
  ['/tags.html', 'news', 'Which AI tags has SIREN scored stories about?', 'Skynet-shaped tags directory — same gated topics, story counts only.'],
  ['/kind/', 'news', 'Which AI story kinds have SIREN pages?', 'Scored stories grouped by collector kind (press, forum, paper, …).'],
  ['/kinds.html', 'news', 'Which AI story kinds has SIREN scored?', 'Kind directory — same gated labels, story counts only.'],
  ['/country/', 'globe', 'Which AI datacentre countries have SIREN pages?', 'Mapped datacentre sites, one page per country that clears the count.'],
  ['/countries.html', 'globe', 'Which AI datacentre countries has SIREN mapped?', 'Country directory — same gated map counts, not a national AI ranking.'],
  ['/pillar/', 'px:updown', 'Which AI activity pillars have SIREN pages?', 'Scored stories grouped by the five activity pillars.'],
  ['/pillars.html', 'px:updown', 'Which AI activity pillars has SIREN scored?', 'Pillar directory — same gated pillars, tempo readings and story counts only.'],
  ['/pillar/capability.html', 'px:updown', 'What has SIREN scored under Capability?', 'Stories and the live Capability reading — tempo only, not a pillar doom score.'],
  ['/pillar/compute.html', 'px:updown', 'What has SIREN scored under Compute & Capital?', 'Stories and the live Compute & Capital reading — tempo only, not a pillar doom score.'],
  ['/pillar/attention.html', 'px:updown', 'What has SIREN scored under Attention?', 'Stories and the live Attention reading — tempo only, not a pillar doom score.'],
  ['/pillar/governance.html', 'px:updown', 'What has SIREN scored under Governance?', 'Stories and the live Governance reading — tempo only, not a pillar doom score.'],
  ['/pillar/markets.html', 'px:updown', 'What has SIREN scored under Markets?', 'Stories and the live Markets reading — tempo only, not a pillar doom score.'],
  ['/api/receipts/', 'archive', 'Where are the SIREN reading receipts?', 'Every reading’s receipt, hash-chained so none can be rewritten.'],
  ['/about.html', 'px:doc', 'What is SIREN?', 'An independent AI activity index — who runs it and how it is paid for.'],
  ['/press.html', 'news', 'Where is the SIREN press kit?', 'Facts, a liftable paragraph, images and how to cite a reading.'],
  ['/brand.html', 'canary', 'Where is the SIREN brand guide?', 'Name, colours, type, voice and Tally.'],
  ['/sponsor.html', 'px:badge', 'How do you sponsor SIREN without moving the number?', 'One named sponsor at a time, with no say over the number.'],
  ['/privacy.html', 'px:doc', 'What does SIREN know about you?', 'Privacy policy — what a visit measures, including analytics.'],
  ['/terms.html', 'px:doc', 'What are the SIREN terms of use?', 'Disclaimers and what the index is not.'],
  ['/disclosures.html', 'px:doc', 'What does SIREN disclose?', 'Affiliate, finance, privacy and satire notices in one place.'],
];

// Machine-readable files. Only the ones the build actually wrote are listed.
const DATA = {
  'api/state.json': ['Current reading (JSON)', 'Level, score, pillars and every source for this hour.'],
  'api/latest.txt': ['Current reading (text)', 'The reading as one line of plain text, for scripts.'],
  'api/history.json': ['Reading history (JSON)', 'Every hourly reading, oldest first.'],
  'api/history.csv': ['Reading history (CSV)', 'Every hourly reading as a spreadsheet.'],
  'api/pillars.csv': ['Pillar scores (CSV)', 'The five pillar scores for every reading.'],
  'api/health.json': ['Source health', 'Which sources answered this hour, and the ratio.'],
  'api/fresh.json': ['Freshness stamps', 'When the reading and the newsroom last changed.'],
  'api/index.json': ['API directory', 'Every API file, with what it holds.'],
  'api/news.json': ['Newsroom (JSON)', 'Every scored story in the window, with its corroboration.'],
  'api/race.json': ['The race (JSON)', 'AI labs ranked on prediction-market odds.'],
  'api/leaders.json': ['Leaders (JSON)', 'What the people running AI said, matched to sources.'],
  'api/x-surface.json': ['X surface (JSON)', 'Posts on X the newsroom watched.'],
  'api/bsky-surface.json': ['Bluesky surface (JSON)', 'AI posts from the Bluesky watchlist.'],
  'api/digest.json': ['Digest (JSON)', 'The day in a few corroborated items.'],
  'api/infra.json': ['Power (JSON)', 'Grid load, drought and datacentre build-out.'],
  'api/bliss.json': ['Upside (JSON)', 'The direction we would be glad to see move.'],
  'api/datacenters.json': ['US datacentres (JSON)', 'Mapped US compute sites against water stress.'],
  'api/world.json': ['World datacentres (JSON)', 'Every mapped datacentre on Earth.'],
  'api/orbital.json': ['Orbital compute (JSON)', 'Compute in orbit, the register.'],
  'api/flock.json': ['Cameras (JSON)', 'Licence-plate reader counts, by place.'],
  'api/flock-points.json': ['Camera points (JSON)', 'Every mapped licence-plate reader.'],
  'api/exploits.json': ['Exploits (JSON)', 'Days from disclosure to exploited in the wild.'],
  'api/balance.json': ['Balance (JSON)', 'Harm and benefit counters.'],
  'api/ledger.json': ['Ledger (JSON)', 'The jobs and medicine registers.'],
  'api/bets.json': ['Tally’s bets (JSON)', 'Daily forecasts and how they scored.'],
  'api/live-media.json': ['AI on TV & radio (JSON)', 'Live AI broadcasts, AI segments from news channels and AI podcast episodes.'],
  'api/si-signals.json': ['Takeover signals (JSON)', 'AI agent PRs, frontier models, the AGI forecast.'],
  'api/search-trends.json': ['Search Trends (JSON)', 'Google daily trending searches filtered for AI — watched, not scored.'],
  'api/labs-bench.json': ['SIREN Labs bench (JSON)', 'Recursion meter, METR horizons, compute jumps, lab silence.'],
  'api/labs.json': ['SIREN Labs plan (JSON)', 'Weekly experiment roster and shipped instruments.'],
  'api/compute-clock.json': ['Compute clock (JSON)', 'Largest training run, FLOP doubling time, Epoch AI data centres.'],  'api/guide.json': ['Room guide (JSON)', 'Every room with its pitch, for agents.'],
  'api/search-index.json': ['Search index (JSON)', 'This catalog and the site’s content, packed for search.'],
  'api/receipts/index.json': ['Receipts index (JSON)', 'Every receipt id, newest first.'],
  'openapi.json': ['OpenAPI spec', 'The public API, described for code generators.'],
  'agents.md': ['agents.md', 'Short fetch-first map for ChatGPT, Grok and other AI agents.'],
  'AGENTS.md': ['AGENTS.md', 'Same fetch-first map at the uppercase path coding agents request.'],
  'agents.txt': ['agents.txt', 'agents-txt.com capability announcement (skills).'],
  'agents.json': ['agents.json', 'Structured companion to agents.txt.'],
  'ai.txt': ['ai.txt', 'Short welcome for AI agents probing by well-known name.'],
  'skill.md': ['skill.md', 'How an AI agent should read and cite SIREN.'],
  'skills/siren-ai-index/SKILL.md': ['Skill package', 'Installer path for the SIREN skill (same body as skill.md).'],
  'llms.txt': ['llms.txt', 'The site summarised for language models.'],
  'llms-full.txt': ['llms-full.txt', 'llms.txt plus the live markdown snapshot.'],
  '.well-known/api-catalog': ['API catalog', 'RFC 9727 linkset of machine APIs on this origin.'],
  '.well-known/api-catalog.json': ['API catalog (JSON)', 'Same linkset with a .json extension for Content-Type.'],
  '.well-known/agent-skills/index.json': ['Skills index', 'agentskills.io discovery index with content digest.'],
  '.well-known/mcp/server-card.json': ['MCP server card', 'How to run the stdio MCP kit (no HTTP MCP endpoint).'],
  'sitemap.xml': ['Sitemap', 'Every indexable page, for crawlers.'],
  'news-sitemap.xml': ['News sitemap', 'The newest stories, for Google News.'],
};
const FEEDS = {
  'feed.xml': ['Main RSS feed', 'Every reading worth a post.'],
  'feed-level.xml': ['Level-change feed', 'An entry only when the SIREN level itself changes.'],
  'feed-delta.xml': ['Big-move feed', 'Readings that moved the score by three points or more.'],
  'feed-pillar.xml': ['Pillar-spike feed', 'Any pillar that jumped between readings.'],
};
const EMBEDS = [
  ['/embed.html', 'Live widget', 'The current reading in an iframe for your own site.'],
  ['/badge.svg', 'README badge', 'An image badge with the level, for GitHub and markdown.'],
];

const unent = (s) => String(s || '').replace(/&#39;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t; };

// Home room tiles keep short labels ("Tags", "Compare indexes", "Methodology").
// When those groups feed the catalog, prefer a search-shaped title from
// MORE_PAGES or from the blurb so internal links match the page <title> / H1
// (tips #213–#214). Methodology uses a How-stem without a trailing "?".
const MORE_TITLE_BY_URL = new Map(MORE_PAGES.map(([href, , label]) => [href, label]));
const SEARCH_SHAPED = /^(How|What|Where|Which|Who|Is|Does|Can)\b|\?/;
export function catalogTitle(href, label, blurb) {
  if (/\?/.test(label || '')) return label;
  const more = MORE_TITLE_BY_URL.get(href);
  // Prefer MORE_PAGES How/What stems even without a trailing "?" (methodology).
  if (more && SEARCH_SHAPED.test(more)) return more;
  const m = String(blurb || '').match(/([^?]+\?)/);
  return m ? m[1].trim() : label;
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** <title> and description of a written page, for pages no list describes. */
export function pageMeta(html) {
  const title = unent((String(html).match(/<title>([^<]*)<\/title>/) || [])[1] || '')
    .replace(/\s*[·|]\s*SIREN\s*$/i, '').trim();
  const desc = unent((String(html).match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  return { title, desc };
}

/** The Bunker Kit's tool table, read out of its static page. */
export function bunkerTools(html) {
  const m = String(html || '').match(/<script>\n(const CRATES = [\s\S]*?)\nconst packed = /);
  if (!m) return [];
  try {
    const { CRATES, TOOLS: rows } = new Function(`${m[1]}\nreturn { CRATES, TOOLS };`)();
    const crate = Object.fromEntries(CRATES.map((c) => [c.id, c.name]));
    return rows.map((t) => ({ name: t[1], url: t[7] || `https://${t[2]}`, does: t[3], crate: crate[t[0]] || t[0], domain: t[2] }));
  } catch { return []; }
}

/**
 * Everything on the site the catalog lists.
 * o.groups  homeV2.roomGroups(ctx)
 * o.files   relative paths the build wrote ('race.html', 'api/state.json', ...)
 * o.pages   { 'about.html': { title, desc } } for written top-level pages
 * o.videos  mediaPages.VIDEOS
 */
export function catalogEntries(o = {}) {
  const files = new Set(o.files || []);
  const has = (href) => {
    const p = href.split('#')[0].replace(/^\//, '');
    return p === '' || files.has(p) || files.has(`${p}index.html`) || (p.endsWith('/') && files.has(`${p}index.html`));
  };
  const out = [];
  const seen = new Set();
  const add = (e) => { if (seen.has(e.url)) return; seen.add(e.url); out.push(e); };
  for (const [group, list] of o.groups || []) {
    for (const [href, icon, label, , blurb] of list) {
      if (o.files && !has(href)) continue;
      const type = GAMES.has(href) ? 'game' : TOOLS.has(href) ? 'tool' : 'page';
      add({ type, title: catalogTitle(href, label, blurb), url: href, desc: blurb || '', group, icon, keys: group.toLowerCase() });
    }
  }
  for (const [href, icon, label, blurb] of MORE_PAGES) {
    if (o.files && !has(href)) continue;
    add({ type: 'page', title: label, url: href, desc: blurb, group: 'MORE PAGES', icon, keys: 'page' });
  }
  for (const [rel, meta] of Object.entries(o.pages || {}).sort()) {
    const href = `/${rel}`;
    if (seen.has(href) || /^(404|500|index)\.html$/.test(rel) || EMBEDS.some((e) => e[0] === href)) continue;
    if (!meta || !meta.title) continue;
    add({ type: 'page', title: meta.title, url: href, desc: clip(meta.desc, 150), group: 'MORE PAGES', icon: TYPE_ICON.page, keys: 'page' });
  }
  for (const v of o.videos || []) {
    add({ type: 'video', title: v.title, url: `/videos.html#v-${v.id}`, desc: v.blurb, group: 'SIREN TV', icon: TYPE_ICON.video, keys: `video film watch ${v.station || ''}`.toLowerCase(), meta: `${mmss(v.secs)} · VIDEO` });
  }
  for (const [rel, [title, desc]] of Object.entries(DATA)) {
    if (o.files && !files.has(rel) && rel !== 'api/search-index.json') continue;
    const fmt = (rel.match(/\.(\w+)$/) || [])[1] || '';
    add({ type: 'data', title, url: `/${rel}`, desc, group: 'DATA', icon: TYPE_ICON.data, keys: `data download api ${fmt} ${rel}`, meta: rel });
  }
  const feeds = Object.entries(FEEDS);
  for (const rel of [...files].filter((f) => /^feed-pillar-[a-z]+\.xml$/.test(f)).sort()) {
    const id = rel.slice(12, -4);
    feeds.push([rel, [`${id.charAt(0).toUpperCase()}${id.slice(1)} pillar feed`, `Spikes in the ${id} pillar only.`]]);
  }
  for (const [rel, [title, desc]] of feeds) {
    if (o.files && !files.has(rel)) continue;
    add({ type: 'feed', title, url: `/${rel}`, desc, group: 'FEEDS', icon: TYPE_ICON.feed, keys: 'rss feed atom subscribe alerts', meta: rel });
  }
  for (const [href, title, desc] of EMBEDS) {
    if (o.files && !has(href)) continue;
    add({ type: 'embed', title, url: href, desc, group: 'EMBEDS', icon: TYPE_ICON.embed, keys: 'embed widget iframe badge', meta: href.replace(/^\//, '') });
  }
  return out;
}

/**
 * The search index: catalog entries plus content items.
 * c.news     ctx.news ({ items }), c.leaders ({ leaders }), c.faq ([[q, a]]),
 * c.kit      bunkerTools(), c.arts  Set of art names with a picture, c.itemPages  bool
 */
export function searchIndex(entries, c = {}) {
  const items = entries.map((e) => [e.type, e.title, e.url, e.desc || '', e.keys || '', e.icon || '']);
  for (const l of (c.leaders && c.leaders.leaders) || []) {
    if (!l || !l.name) continue;
    const icon = c.arts && c.arts.has(l.id) ? l.id : '';
    items.push(['leader', l.name, `/leaders.html#lw-${l.id}`, [l.role, l.org].filter(Boolean).join(', '), [...(l.aliases || []), l.org_id || ''].join(' '), icon]);
  }
  const news = (c.news && Array.isArray(c.news.items)) ? c.news.items : [];
  for (const it of news) {
    if (!it || !it.title) continue;
    const day = String(it.published_at || '').slice(0, 10);
    const url = c.itemPages ? `/item/${slugFor(it)}.html` : it.url;
    items.push(['news', clip(it.title, 140), url, clip(`${day} · ${it.summary || ''}`, 130), `${it.pillar || ''} ${it.source || ''} ${it.kind || ''}`.trim(), '']);
  }
  for (const [q, a] of c.faq || []) items.push(['faq', q, '/classic.html#faq', clip(a, 170), 'faq question answer', '']);
  for (const t of c.kit || []) items.push(['kit', t.name, t.url, clip(t.does, 130), `${t.crate} ${t.domain} tool bunker kit`.toLowerCase(), '']);
  return {
    v: 1,
    at: c.at || null,
    types: TYPE_LABEL,
    typeH2: SEARCH_TYPE_H2_Q,
    order: TYPES.map(([k]) => k),
    icons: TYPE_ICON,
    items,
  };
}

// ---------------------------------------------------------------- the pages

const CSS = `<style>
.sx,.ct{max-width:1080px}
.sx .eyebrow,.ct .eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:var(--accent,#4ADE80);margin:0 0 10px}
.sx p,.ct p{color:var(--ink-dim);line-height:1.6}
.sx-f{display:flex;gap:8px;margin:18px 0 12px;max-width:760px}
.sx-f input,.ct-q{flex:1 1 auto;min-width:0;min-height:52px;padding:0 16px;border:2px solid var(--rule);border-radius:6px;background:var(--bg-sunken,#090d19);color:var(--ink);font:500 17px/1.3 var(--sans)}
.sx-f input:focus,.ct-q:focus{outline:none;border-color:#818CF8;box-shadow:0 0 0 3px rgba(129,140,248,.25)}
.sx-f button{flex:0 0 auto;min-height:52px;padding:0 18px;border:0;border-radius:6px;background:#4F46E5;color:#fff;font:700 13px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.sx-f button:hover{background:#4338CA}
.sx-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.sx-chips button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:1px solid var(--rule);border-radius:18px;color:var(--ink-dim);font:600 12px/1 var(--mono);letter-spacing:.04em}
.sx-chips button b{color:var(--ink);font-weight:700}
.sx-chips button:hover{border-color:#818CF8;color:var(--ink)}
.sx-chips button[aria-pressed=true]{background:#4F46E5;border-color:#4F46E5;color:#fff}.sx-chips button[aria-pressed=true] b{color:#fff}
.sx-chips button:focus-visible{outline:2px solid #E2A03B;outline-offset:2px}
.sx-stat{font:600 12px/1.4 var(--mono);letter-spacing:.06em;color:var(--ink-faint);margin:4px 0 14px;min-height:1.4em}
.sx-g{margin:0 0 22px}
.sx-g h2{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;font:700 12px/1.2 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#86EFAC}
.sx-g h2 span{color:var(--ink-faint);font-weight:600}
.sx-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.sx-r{display:flex;align-items:flex-start;gap:12px;min-height:52px;padding:8px 10px;border:1px solid transparent;border-left:2px solid transparent;border-radius:4px;color:var(--ink)!important;text-decoration:none!important}
.sx-r:hover,.sx-r.on{background:var(--bg-raised,#0E131D);border-color:var(--rule);border-left-color:#818CF8}
.sx-r img{flex:0 0 auto;width:36px;height:36px;display:block}
.sx-r span{min-width:0;display:flex;flex-direction:column;gap:2px}
.sx-r b{font:650 15px/1.3 var(--sans);overflow-wrap:anywhere}
.sx-r small{color:var(--ink-dim);font-size:13.5px;line-height:1.45;overflow-wrap:anywhere}
.sx-r i{font:500 11.5px/1.3 var(--mono);font-style:normal;color:var(--ink-faint);overflow-wrap:anywhere}
.sx-r mark,.ct mark{background:rgba(250,204,21,.28);color:inherit;border-radius:2px;padding:0 1px}
.sx-more{all:unset;cursor:pointer;display:inline-flex;align-items:center;min-height:40px;margin:2px 0 0 10px;color:#A5B4FC;font:600 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.sx-more:hover{color:var(--ink)}.sx-more:focus-visible{outline:2px solid #E2A03B;outline-offset:2px}
.sx-empty h2,.ct h2{font:700 12px/1.2 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#86EFAC;margin:22px 0 10px}
.sx-sug{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px;padding:0;list-style:none}
.sx-sug a{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1px solid var(--rule);border-radius:20px;color:var(--ink)!important;text-decoration:none!important;font:600 13px/1 var(--mono)}
.sx-sug a:hover{border-color:#818CF8}
.ct-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:10px;margin:0 0 8px}
.ct-c{display:flex;align-items:flex-start;gap:12px;min-height:72px;padding:12px;border:2px solid var(--rule);border-radius:6px;background:var(--bg-raised,#0E131D);color:var(--ink)!important;text-decoration:none!important}
.ct-c:hover{border-color:#6366F1}
.ct-c img{flex:0 0 auto;width:40px;height:40px;display:block}
.ct-c span{min-width:0;display:flex;flex-direction:column;gap:3px}
.ct-c b{font:700 12.5px/1.25 var(--mono);letter-spacing:.05em;text-transform:uppercase;overflow-wrap:anywhere}
.ct-c small{color:var(--ink-dim);font-size:13.5px;line-height:1.4}
.ct-c i{font:500 11px/1.3 var(--mono);font-style:normal;color:var(--ink-faint);overflow-wrap:anywhere}
.ct-bar{position:sticky;top:0;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px 0;margin:8px 0 6px;background:var(--bg,#06070b)}
.ct h2 span{color:var(--ink-faint);font-weight:600;margin-left:6px}
.ct h3{font:600 11px/1.2 var(--mono);letter-spacing:.14em;color:var(--ink-faint);margin:14px 0 8px}
.ct-none{padding:16px;border:1px dashed var(--rule);border-radius:6px}
.ct-faq,.sx-faq{margin:34px 0 12px;max-width:62ch}
.ct-faq h2,.sx-faq h2{font:600 var(--t-lg,1.125rem)/1.2 var(--sans);margin:0 0 var(--s-3,.75rem);color:var(--ink);letter-spacing:normal;text-transform:none}
.ct-faq h3,.sx-faq h3{font:600 var(--t-base,1rem)/1.3 var(--sans);margin:var(--s-4,1rem) 0 var(--s-2,.5rem);color:var(--ink);letter-spacing:normal;text-transform:none}
.ct-faq p,.sx-faq p{font:400 var(--t-base,1rem)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-2,.5rem)}
.ct-faq-key,.sx-faq-key{margin-top:var(--s-4,1rem)!important}
@media (max-width:700px){.ct-bar{position:static}}
@media (max-width:560px){.sx-f button{padding:0 14px}.sx-r b{font-size:14.5px}}
</style>`;

const SUGGEST = ['agents', 'jobs', 'datacentre', 'race', 'csv', 'rss', 'game', 'video', 'prepper', 'openai'];

function imgFn(ctx) {
  return (n) => (String(n).startsWith('px:') ? ctx.href(`/img/px-${String(n).slice(3)}.svg`) : ctx.href(`/img/art-${n}.webp`));
}

const SEARCH_PATH = '/search.html';
const searchQTitle = 'How do you search everything on SIREN?';
// Tip #320: empty-state H2s are question-shaped and mirrored in FAQ (§3.3).
const tryQ = 'Which search queries should you try first?';
const popularQ = 'Which rooms do people open most?';

/** /search.html. stats: { counts: { type: n } } from the index. */
export function search(ctx, stats = {}) {
  const counts = stats.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const PHRASE = { page: 'rooms and pages', tool: 'tools', game: 'games', video: 'videos', leader: 'leaders', news: 'scored stories', data: 'data files', feed: 'feeds', embed: 'embeds', faq: 'answered questions', kit: 'Bunker Kit tools' };
  const parts = TYPES.filter(([k]) => counts[k]).map(([k]) => `${counts[k].toLocaleString('en-US')} ${PHRASE[k] || k}`);
  const img = imgFn(ctx);
  const popular = (stats.popular || []).slice(0, 6);
  // FAQ answers restate lede / empty-state / noscript copy only.
  // Refuse: search-as-doom-oracle, stuffing, doom-probability.
  const faq = [
    [searchQTitle,
      `One box for the whole site: ${parts.join(', ') || 'rooms, tools, stories and data'}. Results appear as you type; ↑ ↓ to move, Enter to open, / to come back here.`],
    ['How do results work?',
      'Results appear as you type; ↑ ↓ to move, Enter to open, / to come back here.'],
    ['Does search need JavaScript?',
      'Search runs in your browser and needs JavaScript. Everything it covers is also listed in the catalog, which works without it.'],
    [tryQ,
      `Starter queries on this page: ${SUGGEST.join(', ')}.`],
    ...(popular.length
      ? [[popularQ,
        `Rooms linked from the empty state: ${popular.map((e) => e.title).join(', ')}.`]]
      : []),
    ['Rather browse than search?',
      'The catalog lists every room, tool, game, video, data file and feed in one place.'],
    // Tip #394: result-group H2s are question-shaped and mirrored in FAQ (§3.3).
    ...TYPES.filter(([k]) => counts[k]).map(([k]) => [SEARCH_TYPE_H2_Q[k],
      `${counts[k].toLocaleString('en-US')} ${PHRASE[k] || k} are searchable on this page.`]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}<section class="sx">
  <p class="eyebrow">SEARCH · ${total.toLocaleString('en-US')} THINGS ON ${esc(brand.NAME)}</p><h1 class="bp__h1">${esc(searchQTitle)}</h1>
  <p class="lede">One box for the whole site: ${esc(parts.join(', '))}. Results appear as you type; ↑ ↓ to move, Enter to open, / to come back here.</p>
  <form class="sx-f" action="${esc(ctx.href(SEARCH_PATH))}" method="get" role="search">
    <label class="v2-sr" for="sx-q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search the site</label>
    <input id="sx-q" name="q" type="search" data-site-search autocomplete="off" spellcheck="false" placeholder="Try “agents”, “datacentre” or “csv”" role="combobox" aria-expanded="false" aria-controls="sx-res" aria-autocomplete="list">
    <button type="submit">Search</button>
  </form>
  <div class="sx-chips" id="sx-types" role="group" aria-label="Filter by type" hidden></div>
  <p class="sx-stat" id="sx-stat" aria-live="polite"></p>
  <div id="sx-res" role="listbox" aria-label="Results"></div>
  <div class="sx-empty" id="sx-empty">
    <h2>${esc(tryQ)}</h2>
    <ul class="sx-sug">${SUGGEST.map((s) => `<li><a href="${esc(ctx.href(`${SEARCH_PATH}?q=${encodeURIComponent(s)}`))}" data-q="${esc(s)}">${esc(s)}</a></li>`).join('')}</ul>
    ${popular.length ? `<h2>${esc(popularQ)}</h2><div class="ct-g">${popular.map((e) => `<a class="ct-c" href="${esc(ctx.href(e.url))}"><img src="${esc(img(e.icon))}" width="40" height="40" alt="" loading="lazy"><span><b>${esc(e.title)}</b><small>${esc(e.desc)}</small></span></a>`).join('')}</div>` : ''}
    <p>Rather browse? <a href="${esc(ctx.href('/catalog.html'))}">Where is everything on SIREN listed?</a> lists every room, tool, game, video, data file and feed in one place.</p>
  </div>
  <noscript><p>Search runs in your browser and needs JavaScript. Everything it covers is also listed on <a href="${esc(ctx.href('/catalog.html'))}">Where is everything on SIREN listed?</a>, which works without it.</p></noscript>
  <section class="sx-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="sx-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/catalog.html'))}">Where is everything on SIREN listed?</a>.</p>
  </section>
</section>
<script>${SEARCH_CORE_JS}
(function(){
var S=window.sirenSearch,BASE=${JSON.stringify(brand.BASE_PATH)},IDX=${JSON.stringify(ctx.href('/api/search-index.json'))};
var q=document.getElementById('sx-q'),res=document.getElementById('sx-res'),stat=document.getElementById('sx-stat'),chips=document.getElementById('sx-types'),empty=document.getElementById('sx-empty');
var D=null,rows=null,type='',sel=-1,links=[],t0=0;
function u(h){return /^https?:/.test(h)?h:BASE+h}
function im(it){var n=it[5]||(D.icons[it[0]]||'px:doc');return n.indexOf('px:')===0?BASE+'/img/px-'+n.slice(3)+'.svg':BASE+'/img/art-'+n+'.webp'}
function shown(h){return /^https?:/.test(h)?h.replace(/^https?:\\/\\/(www\\.)?/,'').replace(/\\/$/,''):h}
function sync(){var p=new URLSearchParams(location.search);var v=q.value.trim();if(v)p.set('q',v);else p.delete('q');if(type)p.set('type',type);else p.delete('type');var s=p.toString();history.replaceState(null,'',location.pathname+(s?'?'+s:''))}
function mark(n){links.forEach(function(a){a.classList.remove('on');a.removeAttribute('aria-selected')});sel=n;if(n>=0&&links[n]){links[n].classList.add('on');links[n].setAttribute('aria-selected','true');q.setAttribute('aria-activedescendant',links[n].id);links[n].scrollIntoView({block:'nearest'})}else q.removeAttribute('aria-activedescendant')}
function render(){
  if(!D)return;var v=q.value.trim();
  if(!v){res.innerHTML='';chips.hidden=true;stat.textContent='';empty.hidden=false;links=[];q.setAttribute('aria-expanded','false');mark(-1);return}
  var all=S.search(rows,v),by={};all.forEach(function(h){(by[h.it[0]]=by[h.it[0]]||[]).push(h)});
  if(type&&!by[type])type='';
  var c='<button type="button" data-t=""'+(type?'':' aria-pressed="true"')+'>All <b>'+all.length+'</b></button>';
  D.order.forEach(function(k){if(by[k])c+='<button type="button" data-t="'+k+'" aria-pressed="'+(type===k)+'">'+S.esc(D.types[k])+' <b>'+by[k].length+'</b></button>'});
  chips.innerHTML=c;chips.hidden=!all.length;empty.hidden=!!all.length;
  var h='',n=0;
  D.order.forEach(function(k){var list=by[k];if(!list||(type&&k!==type))return;var lim=type?200:(k==='news'?5:6);
    h+='<section class="sx-g"><h2>'+S.esc((D.typeH2&&D.typeH2[k])||D.types[k])+' <span>'+list.length+'</span></h2><ol class="sx-l">';
    list.slice(0,lim).forEach(function(r){var it=r.it,ext=/^https?:/.test(it[2]);h+='<li><a class="sx-r" role="option" id="sx-r'+(n++)+'" href="'+S.esc(u(it[2]))+'"'+(ext?' target="_blank" rel="noopener"':'')+'><img src="'+S.esc(im(it))+'" width="36" height="36" alt="" loading="lazy"><span><b>'+S.hl(it[1],v)+'</b>'+(it[3]?'<small>'+S.hl(it[3],v)+'</small>':'')+'<i>'+S.esc(shown(it[2]))+(ext?' ↗':'')+'</i></span></a></li>'});
    h+='</ol>'+(list.length>lim?'<button type="button" class="sx-more" data-t="'+k+'">Show all '+list.length+' '+S.esc(D.types[k].toLowerCase())+' →</button>':'')+'</section>'});
  if(!all.length)h='<p>Nothing on the site matches “'+S.esc(v)+'”. Check the spelling, try fewer words, or browse <a href="'+BASE+'/catalog.html">Where is everything on SIREN listed?</a>.</p>';
  res.innerHTML=h;links=[].slice.call(res.querySelectorAll('.sx-r'));q.setAttribute('aria-expanded',links.length?'true':'false');
  stat.textContent=all.length?(all.length+' result'+(all.length===1?'':'s')+' for “'+v+'”'+(type?' in '+D.types[type]:'')+' · '+(Date.now()-t0)+' ms'):'';
  mark(links.length&&sel>=0?0:-1)}
var timer;q.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(function(){t0=Date.now();sel=-1;render();sync()},40)});
q.addEventListener('keydown',function(e){var n=links.length;if(e.key==='ArrowDown'&&n){e.preventDefault();mark((sel+1)%n)}else if(e.key==='ArrowUp'&&n){e.preventDefault();mark(sel<=0?n-1:sel-1)}else if(e.key==='Enter'){var a=links[sel>=0?sel:0];if(a){e.preventDefault();if(a.target==='_blank')window.open(a.href,'_blank','noopener');else location.href=a.href}}else if(e.key==='Escape'){q.value='';render();sync()}});
document.querySelector('.sx-f').addEventListener('submit',function(e){e.preventDefault();var a=links[sel>=0?sel:0];if(a&&sel>=0){a.click()}else{render();sync()}});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#sx-types button,.sx-more,.sx-sug a[data-q]');if(!b)return;e.preventDefault();
  if(b.hasAttribute('data-q')){q.value=b.getAttribute('data-q');type=''}else{type=b.getAttribute('data-t')||''}
  t0=Date.now();render();sync();q.focus()});
var p=new URLSearchParams(location.search);q.value=p.get('q')||'';type=p.get('type')||'';
stat.textContent=q.value?'Loading the index…':'';
fetch(IDX).then(function(r){return r.json()}).then(function(d){D=d;rows=S.prep(d);t0=Date.now();render();if(!q.value)q.focus()}).catch(function(){stat.textContent='The search index did not load. The catalog lists everything instead.'});
})();
</script>`;
  return page({
    ctx,
    path: SEARCH_PATH,
    title: `${searchQTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${searchQTitle}`,
    description: `${searchQTitle} One box for rooms, tools, games, scored AI news, leaders, videos, open data and feeds — results appear as you type.`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: searchQTitle,
        description: `One box for the whole of ${brand.NAME}: rooms, tools, scored stories, leaders, videos, data and feeds. Results appear as you type.`,
        url: ctx.url(SEARCH_PATH),
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        speakable: speakable(['h1.bp__h1', 'p.lede']),
      },
      breadcrumbs(ctx, [
        { name: 'Home', path: '/' },
        { name: searchQTitle, path: SEARCH_PATH },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([qAsk, a]) => ({
          '@type': 'Question',
          name: qAsk,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    main,
  });
}

const CATALOG_PATH = '/catalog.html';
const catalogQTitle = 'Where is everything on SIREN listed?';

/** /catalog.html: every entry, grouped, with type chips and a text filter. */
export function catalog(ctx, entries) {
  const img = imgFn(ctx);
  const by = {};
  for (const e of entries) (by[e.type] = by[e.type] || []).push(e);
  const card = (e) => `<a class="ct-c" href="${esc(ctx.href(e.url))}" data-k="${esc(`${e.title} ${e.desc} ${e.keys || ''} ${e.group || ''} ${e.url}`.toLowerCase())}"><img src="${esc(img(e.icon || TYPE_ICON[e.type]))}" width="40" height="40" alt="" loading="lazy"><span><b>${esc(e.title)}</b>${e.desc ? `<small>${esc(e.desc)}</small>` : ''}<i>${esc(e.meta || (e.url === '/' ? 'home' : e.url.replace(/^\//, '')))}</i></span></a>`;
  const types = CATALOG_TYPES.filter((t) => by[t]);
  // Tip #366: page-group H3s are question-shaped and mirrored in FAQ (§3.3).
  const groupQ = (g) => `What is listed under ${g}?`;
  const pageGroups = [];
  if (by.page) {
    for (const e of by.page) {
      let g = pageGroups.find((x) => x[0] === e.group);
      if (!g) pageGroups.push(g = [e.group, []]);
      g[1].push(e);
    }
  }
  const sections = types.map((t) => {
    let body;
    if (t === 'page') {
      body = pageGroups.map(([g, list]) => `<div class="ct-sub"><h3>${esc(groupQ(g))}</h3><div class="ct-g">${list.map(card).join('')}</div></div>`).join('');
    } else body = `<div class="ct-g">${by[t].map(card).join('')}</div>`;
    return `<section class="ct-s" id="ct-${t}" data-t="${t}"><h2>${esc(TYPE_H2_Q[t] || TYPE_LABEL[t])}<span>${by[t].length}</span></h2>${body}</section>`;
  }).join('');
  const total = types.reduce((n, t) => n + by[t].length, 0);
  // FAQ answers restate lede / body copy only.
  // Refuse: catalog-as-doom-index, stuffing synonyms, doom-probability.
  const faq = [
    [catalogQTitle,
      'Every room, tool, game, video, data file, feed and embed on the site, in one directory. Filter by type or by word; for stories, leaders and the Bunker Kit’s tools, use Search.'],
    ['How do I filter the catalog?',
      'Filter by type or by word.'],
    ['Where do I find stories, leaders and Bunker Kit tools?',
      'For stories, leaders and the Bunker Kit’s tools, use How do you search everything on SIREN?'],
    ['What kinds of things are listed?',
      'Every room, tool, game, video, data file, feed and embed on the site.'],
    ...pageGroups.map(([g, list]) => [groupQ(g),
      `${list.length} room${list.length === 1 ? '' : 's'} and pages under ${g} in the catalog.`]),
    // Tip #368: type-section H2s are question-shaped and mirrored in FAQ (§3.3).
    ...types.map((t) => [TYPE_H2_Q[t] || TYPE_LABEL[t],
      `${by[t].length} ${TYPE_LABEL[t].toLowerCase()} in the catalog.`]),
  ];
  const faqHtml = faq.map(([qAsk, a]) => `
  <h3>${esc(qAsk)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${CSS}<section class="ct">
  <p class="eyebrow">CATALOG · ${total} THINGS</p><h1 class="bp__h1">${esc(catalogQTitle)}</h1>
  <p class="lede">Every room, tool, game, video, data file, feed and embed on the site, in one directory. Filter by type or by word; for stories, leaders and the Bunker Kit’s tools, use <a href="${esc(ctx.href('/search.html'))}">How do you search everything on SIREN?</a>.</p>
  <div class="ct-bar">
    <label for="ct-q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Filter the catalog</label>
    <input class="ct-q" id="ct-q" type="search" autocomplete="off" spellcheck="false" placeholder="Filter the catalog…">
    <div class="sx-chips" role="group" aria-label="Show only"><button type="button" data-t="" aria-pressed="true">All <b>${total}</b></button>${types.map((t) => `<button type="button" data-t="${t}" aria-pressed="false">${esc(TYPE_LABEL[t])} <b>${by[t].length}</b></button>`).join('')}</div>
  </div>
  <p class="sx-stat" id="ct-n" aria-live="polite"></p>
  ${sections}
  <p class="ct-none" id="ct-none" hidden>Nothing in the catalog matches. <a id="ct-sx" href="${esc(ctx.href('/search.html'))}">How do you search everything on SIREN? →</a></p>
  <section class="ct-faq" aria-labelledby="faq">
    <h2 id="faq">What questions do people actually ask?</h2>
    ${faqHtml}
    <p class="ct-faq-key">Search-shaped sibling:
      <a href="${esc(ctx.href('/search.html'))}">How do you search everything on SIREN?</a>
      · <a href="${esc(ctx.href('/live.html'))}">What AI is on TV and radio right now?</a>.</p>
  </section>
</section>
<script>(function(){
var q=document.getElementById('ct-q'),n=document.getElementById('ct-n'),none=document.getElementById('ct-none'),sx=document.getElementById('ct-sx'),type='';
var cards=[].slice.call(document.querySelectorAll('.ct-c')),secs=[].slice.call(document.querySelectorAll('.ct-s')),subs=[].slice.call(document.querySelectorAll('.ct-sub')),chips=[].slice.call(document.querySelectorAll('.ct .sx-chips button'));
function norm(s){return String(s||'').toLowerCase().replace(/[\\u2019']/g,'')}
function apply(){var w=norm(q.value).split(/\\s+/).filter(Boolean),shown=0;
  secs.forEach(function(s){var on=!type||s.getAttribute('data-t')===type,c=0;[].forEach.call(s.querySelectorAll('.ct-c'),function(a){var k=a.getAttribute('data-k'),ok=on&&w.every(function(x){return k.indexOf(x)>=0});a.hidden=!ok;if(ok)c++});s.hidden=!c;shown+=c});
  subs.forEach(function(s){s.hidden=!s.querySelector('.ct-c:not([hidden])')});
  chips.forEach(function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-t')||'')===type))});
  n.textContent=(w.length||type)?shown+' of '+cards.length+' shown':'';none.hidden=!!shown;sx.href=${JSON.stringify(ctx.href('/search.html'))}+(q.value.trim()?'?q='+encodeURIComponent(q.value.trim()):'');
  var p=new URLSearchParams(location.search);if(q.value.trim())p.set('q',q.value.trim());else p.delete('q');if(type)p.set('type',type);else p.delete('type');var s=p.toString();history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash)}
q.addEventListener('input',apply);
chips.forEach(function(b){b.addEventListener('click',function(){type=b.getAttribute('data-t')||'';apply()})});
var p=new URLSearchParams(location.search);q.value=p.get('q')||'';type=p.get('type')||'';if(q.value||type)apply();
})();</script>`;
  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: catalogQTitle,
      description: `A browsable directory of everything on ${brand.NAME}: rooms, tools, games, videos, data downloads, feeds and embeds.`,
      url: ctx.url(CATALOG_PATH),
      isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
      speakable: speakable(['h1.bp__h1', 'p.lede']),
      mainEntity: { '@type': 'ItemList', numberOfItems: total, itemListElement: types.flatMap((t) => by[t]).slice(0, 100).map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.title, url: ctx.url(e.url) })) },
    },
    breadcrumbs(ctx, [
      { name: 'Home', path: '/' },
      { name: catalogQTitle, path: CATALOG_PATH },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([qAsk, a]) => ({
        '@type': 'Question',
        name: qAsk,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];
  return page({
    ctx,
    path: CATALOG_PATH,
    title: `${catalogQTitle} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${catalogQTitle}`,
    description: `${catalogQTitle} A browsable directory of ${total} rooms, tools, games, videos, data downloads, feeds and embeds on ${brand.NAME}.`,
    main,
    jsonld,
  });
}
