// Direct, official statement sources for the leader wire (collector/leaders.mjs).
//
// The press wire (data/news.json) only reaches back as far as its item cap —
// on a busy week that is about a day and a half — so a leader who published an
// essay on Monday can read "no line" by Wednesday. These feeds close that gap
// from the other side: they are the person's OWN publishing, or their
// organisation's official channel, read directly.
//
// RULES FOR ADDING A ROW, and they are the same rules the rest of the repo
// applies to a source:
//
//   1. Public, free, keyless. RSS, Atom or a YouTube channel's public
//      videos.xml. Nothing behind a login, nothing that needs an API key,
//      nothing scraped out of an HTML page.
//   2. No X / Twitter. Scraping it carries an explicit permanent-suspension
//      penalty under the developer terms (collector/race.mjs, LOUDNESS).
//   3. OFFICIAL ONLY. The person's own blog or channel, or their organisation's
//      own newsroom / blog / channel. Never a fan channel, never a reupload
//      channel, never a podcast host's channel — those are someone else
//      choosing what to publish about the person.
//   4. `verified` says what we actually know. A URL is `verified` only when a
//      fetch of it returned a parseable feed, and the note says when and how.
//      Everything else is `verified: false` and is still safe to list, because
//      the collector treats every feed as fallible: one that 404s, times out or
//      returns HTML is reported on the leader's row as unreachable and never
//      breaks the run.
//
// TWO KINDS OF FEED
//
//   personal  Every entry is the person's own publishing — their blog, their
//             channel. Every dated entry counts as a statement by them.
//   org       The organisation's feed. An entry counts for a leader ONLY when
//             its author field is that leader, or its title names that leader
//             (the same whole-word alias table as the press wire) AND either
//             carries a speech cue or is a video upload on the official channel
//             (an official upload naming a person is footage of that person).
//
// Either way the headline published is the entry's own title, exactly as the
// feed printed it — the same headline-only rule as the rest of the wire.
//
// DATES: <published>, <pubDate> or <dc:date> only. Never <updated>: Posthaven
// rewrites <updated> to roughly now on every entry (measured 2026-09-23, see
// collector/race.mjs), and a feed that would report a year-quiet blog as
// posting daily is worse than no feed.

const YT = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

// YouTube channel ids below were resolved from the official @handle by
// elon/collect.mjs and cached in clips.json on the elon-data branch (read
// 2026-10-07). `verified` on a YouTube row means that run fetched the feed OK;
// YouTube's feed endpoint intermittently answers 404/500 even for real
// channels, which is exactly the per-feed failure the collector tolerates.
export const LEADER_SOURCES = Object.freeze([
  // ---- personal ----------------------------------------------------------
  {
    id: 'samaltman-blog', label: 'blog.samaltman.com', kind: 'personal', format: 'atom',
    url: 'https://blog.samaltman.com/posts.atom',
    leaders: ['altman'],
    verified: true, note: 'Posthaven Atom; probed by collector/race.mjs 2026-09-23. Served as text/html — accepted since 2026-10-09 because _feed.mjs sniffs the body root (<feed>) before the header.',
  },
  {
    id: 'bengio-blog', label: 'yoshuabengio.org', kind: 'personal', format: 'rss',
    url: 'https://yoshuabengio.org/feed/',
    leaders: ['bengio'],
    verified: true, note: 'WordPress RSS 2.0; fetched 2026-10-07, newest entry 2026-09-23.',
  },
  {
    id: 'karpathy-bearblog', label: 'karpathy.bearblog.dev', kind: 'personal', format: 'rss',
    url: 'https://karpathy.bearblog.dev/feed/',
    leaders: ['karpathy'],
    verified: false, note: 'UNVERIFIED: answered 403 to a non-browser fetch on 2026-10-07; may block bots.',
  },
  {
    id: 'karpathy-github', label: 'karpathy.github.io', kind: 'personal', format: 'atom',
    url: 'https://karpathy.github.io/feed.xml',
    leaders: ['karpathy'],
    verified: false, note: 'UNVERIFIED: Jekyll default feed path; the sandbox could not reach it.',
  },
  {
    id: 'karpathy-youtube', label: 'YouTube · Andrej Karpathy', kind: 'personal', format: 'youtube',
    url: YT('UCXUPKJO5MZQN11PqgIvyuvQ'),
    leaders: ['karpathy'],
    verified: false, note: 'UNVERIFIED channel id for @AndrejKarpathy; the sandbox could not reach YouTube.',
  },
  {
    id: 'brockman-blog', label: 'blog.gregbrockman.com', kind: 'personal', format: 'atom',
    url: 'https://blog.gregbrockman.com/posts.atom',
    leaders: ['brockman'],
    verified: false, note: 'UNVERIFIED: assumed Posthaven (/posts.atom); the sandbox could not reach it.',
  },

  // ---- org: blogs and newsrooms -------------------------------------------
  {
    id: 'openai-news', label: 'openai.com/news', kind: 'org', format: 'rss',
    url: 'https://openai.com/news/rss.xml',
    leaders: ['altman', 'brockman'],
    verified: true, note: 'Read hourly by collector/news-sources/openai.mjs.',
  },
  {
    id: 'deepmind-blog', label: 'deepmind.google/blog', kind: 'org', format: 'rss',
    url: 'https://deepmind.google/blog/rss.xml',
    leaders: ['hassabis', 'kavukcuoglu'],
    verified: true, note: 'Read hourly by collector/news-sources/deepmind.mjs.',
  },
  {
    id: 'google-ai-blog', label: 'blog.google', kind: 'org', format: 'rss',
    url: 'https://blog.google/technology/ai/rss/',
    leaders: ['pichai', 'hassabis', 'kavukcuoglu'],
    verified: true, note: 'Read hourly by collector/news-sources/google-ai-blog.mjs.',
  },
  {
    id: 'google-company-news', label: 'blog.google · company news', kind: 'org', format: 'rss',
    url: 'https://blog.google/inside-google/company-announcements/rss/',
    leaders: ['pichai'],
    verified: false, note: 'UNVERIFIED: blog.google per-section /rss/ path; the sandbox could not reach it.',
  },
  {
    id: 'microsoft-blog', label: 'blogs.microsoft.com', kind: 'org', format: 'rss',
    url: 'https://blogs.microsoft.com/feed/',
    leaders: ['nadella', 'suleyman'],
    verified: false, note: 'UNVERIFIED: Official Microsoft Blog, WordPress default feed path; carries dc:creator.',
  },
  {
    id: 'microsoft-source', label: 'news.microsoft.com', kind: 'org', format: 'rss',
    url: 'https://news.microsoft.com/feed/',
    leaders: ['nadella', 'suleyman'],
    verified: false, note: 'UNVERIFIED: Microsoft Source newsroom, WordPress default feed path; the sandbox (allow-listed network) could not reach it 2026-10-09.',
  },
  {
    id: 'google-keyword', label: 'blog.google · all', kind: 'org', format: 'rss',
    url: 'https://blog.google/rss/',
    leaders: ['pichai', 'hassabis', 'kavukcuoglu'],
    verified: false, note: 'UNVERIFIED: The Keyword site-wide feed (the per-section /rss/ paths above are its children); the sandbox could not reach it 2026-10-09.',
  },
  {
    id: 'nvidia-blog', label: 'blogs.nvidia.com', kind: 'org', format: 'rss',
    url: 'https://blogs.nvidia.com/feed/',
    leaders: ['huang'],
    verified: true, note: 'Read hourly by collector/news-sources/nvidia-blog.mjs.',
  },
  {
    id: 'meta-newsroom', label: 'about.fb.com/news', kind: 'org', format: 'rss',
    url: 'https://about.fb.com/news/feed/',
    // Yann LeCun left Meta at the end of 2025; Meta's channels are no longer his.
    leaders: ['zuckerberg'],
    verified: false, note: 'UNVERIFIED: Meta Newsroom, WordPress default feed path.',
  },
  {
    id: 'mistral-news', label: 'mistral.ai/news', kind: 'org', format: 'rss',
    url: 'https://mistral.ai/rss.xml',
    leaders: ['mensch'],
    verified: true, note: 'Serves RSS as text/plain (measured 2026-09-23, collector/news-sources/_feed.mjs).',
  },
  {
    id: 'thinkingmachines-blog', label: 'thinkingmachines.ai/blog', kind: 'org', format: 'rss',
    url: 'https://thinkingmachines.ai/blog/index.xml',
    leaders: ['murati'],
    verified: false, note: 'UNVERIFIED: Connectionism blog; Hugo default feed path.',
  },

  // ---- org: official YouTube channels -------------------------------------
  {
    id: 'yt-openai', label: 'YouTube · OpenAI', kind: 'org', format: 'youtube',
    url: YT('UCXZCJLdBC09xxGZ6gcdrc6A'), leaders: ['altman', 'brockman'],
    verified: false, note: 'Channel id resolved from @OpenAI; last elon-data run got HTTP 500.',
  },
  {
    id: 'yt-anthropic', label: 'YouTube · Anthropic', kind: 'org', format: 'youtube',
    url: YT('UCrDwWp7EBBv4NwvScIpBDOA'), leaders: ['amodei'],
    verified: true, note: 'Channel id resolved from @anthropic-ai; feed OK on the elon-data run.',
  },
  {
    id: 'yt-deepmind', label: 'YouTube · Google DeepMind', kind: 'org', format: 'youtube',
    url: YT('UCP7jMXSY2xbc3KCAE0MHQ-A'), leaders: ['hassabis', 'kavukcuoglu'],
    verified: true, note: 'Channel id resolved from @googledeepmind; feed OK on the elon-data run.',
  },
  {
    id: 'yt-google', label: 'YouTube · Google', kind: 'org', format: 'youtube',
    url: YT('UCK8sQmJBp8GCxrOtXWBpyEA'), leaders: ['pichai'],
    verified: false, note: 'Channel id resolved from @Google; last elon-data run got HTTP 500.',
  },
  {
    id: 'yt-microsoft', label: 'YouTube · Microsoft', kind: 'org', format: 'youtube',
    url: YT('UCFtEEv80fQVKkD4h1PF-Xqw'), leaders: ['nadella', 'suleyman'],
    verified: false, note: 'Channel id resolved from @Microsoft; last elon-data run got HTTP 500.',
  },
  {
    id: 'yt-nvidia', label: 'YouTube · NVIDIA', kind: 'org', format: 'youtube',
    url: YT('UCHuiy8bXnmK5nisYHUd1J5g'), leaders: ['huang'],
    verified: true, note: 'Channel id resolved from @NVIDIA; feed OK on the elon-data run.',
  },
  {
    id: 'yt-meta-ai', label: 'YouTube · AI at Meta', kind: 'org', format: 'youtube',
    url: YT('UC5qxlwEKM7-5YZudb24l0bg'), leaders: ['zuckerberg'],
    verified: false, note: 'Channel id resolved from @AIatMeta; last elon-data run got HTTP 500.',
  },
  {
    id: 'yt-xai', label: 'YouTube · xAI', kind: 'org', format: 'youtube',
    url: YT('UCo2ri0cvAs8Lxbp18UHZsgg'), leaders: ['musk'],
    verified: false, note: 'Channel id resolved from @xai; last elon-data run got HTTP 404.',
  },
  {
    id: 'yt-tesla', label: 'YouTube · Tesla', kind: 'org', format: 'youtube',
    url: YT('UC5WjFrtBdufl6CZojX3D8dQ'), leaders: ['musk'],
    verified: true, note: 'Channel id resolved from @tesla; feed OK on the elon-data run.',
  },
]);

// Leaders deliberately left with NO direct source, and why. Published on the
// row so "no sources" reads as a finding, not an oversight.
export const NO_SOURCE_REASON = Object.freeze({
  hinton: 'Publishes no blog or feed of his own; speaks through interviews and lectures hosted by others.',
  sutskever: 'ssi.inc is a single static page with no feed, and SSI publishes nothing else.',
  liang: 'DeepSeek publishes release notes without a feed, and Liang Wenfeng keeps no public channel.',
  lecun: 'No official feed is known: AMI Labs, his company since leaving Meta, publishes none we have verified, and his own posts go to social platforms this site does not scrape.',
});
