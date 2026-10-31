// Tally's agent brain: plan tools against public SIREN JSON, then synthesise
// an answer. Pure Node / browser-safe — no secrets, no node_modules. The on-page
// chat (assets/media/guide.mjs) imports this; tests import it too.
//
// Voice: answers stay present-tense counts (docs/VOICE.md). No doom probability.

export const MOOD = {
  5: 'asleep on the perch',
  4: 'whistling',
  3: 'head up',
  2: 'feathers ruffled',
  1: 'in full squawk',
};

export const LEVEL_COLOR = {
  5: '#4FB3FF',
  4: '#4ADE80',
  3: '#FACC15',
  2: '#FB923C',
  1: '#F87171',
};

/** Public JSON each tool reads. Paths are site-root relative. */
export const TOOLS = {
  get_reading: {
    id: 'get_reading',
    label: 'reading the dials',
    path: '/api/state.json',
    when: /\b(level|score|now|current|reading|loud|quiet|siren\s*[1-5]|how\s+(loud|quiet)|status of (the )?index|what.?s the (level|score))\b/i,
  },
  get_pillars: {
    id: 'get_pillars',
    label: 'checking the five pillars',
    path: '/api/state.json',
    when: /\b(pillar|capability|compute|attention|governance|market|dark|uncalibrat|source|degraded)\b/i,
  },
  get_news: {
    id: 'get_news',
    label: 'scanning the wire',
    path: '/api/news.json',
    when: /\b(news|headline|stor(y|ies)|wire|top story|what.?s happening|latest)\b/i,
  },
  get_breaking: {
    id: 'get_breaking',
    label: 'listening for breaking clusters',
    path: '/api/breaking.json',
    when: /\b(breaking|urgent|just in|cluster|corroborat)\b/i,
  },
  get_bets: {
    id: 'get_bets',
    label: 'opening my bets sheet',
    path: '/api/bets.json',
    when: /\b(bet|forecast|wager|odds|my bets|tally.?s bets)\b/i,
  },
  get_leaders: {
    id: 'get_leaders',
    label: 'checking who spoke',
    path: '/api/leaders.json',
    when: /\b(leader|altman|hassabis|hinton|amodei|musk|ceo|who spoke|speech|said)\b/i,
  },
  get_si_signals: {
    id: 'get_si_signals',
    label: 'watching agent PRs',
    path: '/api/si-signals.json',
    when: /\b(agent|takeover|copilot|codex|devin|jules|cursor|pr|pull request|moltbook)\b/i,
  },
  get_ai_status: {
    id: 'get_ai_status',
    label: 'pinging lab status pages',
    path: '/api/ai-status.json',
    when: /\b(down|outage|status|chatgpt|claude|gemini|grok|is\s+\w+\s+(up|down)|operational)\b/i,
  },
  get_voice: {
    id: 'get_voice',
    label: 'finding my last spoken update',
    path: '/api/tally-voice.json',
    when: /\b(voice|speak|spoken|hear|audio|read (it |the )?(aloud|out)|listen|recording|last update)\b/i,
  },
  search_guide: {
    id: 'search_guide',
    label: 'searching the room map',
    path: '/api/guide.json',
    when: null, // always available as fallback; planner adds when needed
  },
};

// Keep "siren" / "tally" scoreable so FAQ lines like "what is siren" still hit.
const STOP = /^(the|a|an|is|are|of|to|in|on|for|and|or|what|how|do|does|i|me|my|can|you|it|this|site|show|about|with|will|be|please|tell|give|hey|hi|hello)$/;

export function words(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.test(w));
}

export function scoreMatch(qWords, text) {
  const t = ` ${String(text).toLowerCase()} `;
  let n = 0;
  for (const w of qWords) {
    if (t.includes(` ${w}`) || t.includes(` ${w} `) || t.includes(`${w} `)) n += w.length > 3 ? 2 : 1;
  }
  return n;
}

/**
 * Choose which tools to run for a user turn. Always includes get_reading for
 * grounding when the question is empty of other matches, and search_guide as
 * a navigation fallback.
 */
export function planTools(text, memory = {}) {
  const q = String(text || '').trim();
  const picked = new Set();

  if (!q) {
    picked.add('get_reading');
    return [...picked];
  }

  for (const tool of Object.values(TOOLS)) {
    if (tool.when && tool.when.test(q)) picked.add(tool.id);
  }

  // Follow-ups: "and the pillars?" / "what about news?" reuse last topic.
  if (picked.size === 0 && memory.lastTools && /\b(that|those|it|them|more|and|also|what about)\b/i.test(q)) {
    for (const id of memory.lastTools) picked.add(id);
  }

  // Navigation / FAQ / "where is X" search the room map. Skip for clear dial
  // asks ("what is the level now?") so the reply is not padded with weak room hits.
  const wantsGuide = /\b(where|page|room|link|how (do|does|to)|who is|explain|job|prepare|prepper|bunker|breakthrough|video|clip|arena|api|radio|sponsor|staff|tally|canary)\b/i.test(q)
    || (/\bwhat is\b/i.test(q) && !/\b(level|score|reading|siren\s*[1-5])\b/i.test(q));
  if (wantsGuide) picked.add('search_guide');

  // Default grounding: anything about "now" or unmatched gets the reading.
  if (picked.size === 0 || /\b(now|today|currently)\b/i.test(q)) picked.add('get_reading');

  // Soft cap — keep the hop short.
  const order = ['get_reading', 'get_pillars', 'get_breaking', 'get_news', 'get_ai_status', 'get_si_signals', 'get_leaders', 'get_bets', 'get_voice', 'search_guide'];
  return order.filter((id) => picked.has(id)).slice(0, 4);
}

export function toolLabel(id) {
  return (TOOLS[id] && TOOLS[id].label) || id;
}

function utcClock(iso) {
  if (!iso) return null;
  const s = String(iso);
  const m = s.match(/T(\d{2}:\d{2})/);
  return m ? `${m[1]} UTC` : s.slice(0, 16).replace('T', ' ') + ' UTC';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function linksHtml(links) {
  if (!links || !links.length) return '';
  return `<div class="links">${links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</div>`;
}

function readingBlock(state, base) {
  if (!state || !Number.isFinite(state.level)) return null;
  const L = state.level;
  const nm = state.level_name || '?';
  const sc = typeof state.score === 'number' ? state.score.toFixed(1) : '?';
  const mood = MOOD[L] || 'watching';
  const clock = utcClock(state.generated_at) || 'unknown clock';
  const delta = state.delta_from_previous;
  const move = Number.isFinite(delta) && Math.abs(delta) >= 0.1
    ? `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} since the last reading`
    : 'steady since the last reading';
  const html = `Right now AI activity is at <b>SIREN ${esc(L)}: ${esc(nm)}</b>, score ${esc(sc)}/100, on a scale where 1 is loudest. I am ${esc(mood)}. The score is ${esc(move)}. Observed ${esc(clock)}.`;
  const speak = `Right now AI activity is at SIREN ${L}, ${nm}. Score ${sc} out of 100, where 1 is loudest. I am ${mood}. The score is ${move}. Observed ${clock}.`;
  const links = [
    { href: `${base}/`, label: 'See the war room →' },
    { href: `${base}/methodology.html`, label: 'How it is computed →' },
  ];
  return { html, speak, links };
}

function pillarsBlock(state, base) {
  if (!state || !Array.isArray(state.pillars)) return null;
  const lines = state.pillars.map((p) => {
    if (p.uncalibrated) return `<li><b>${esc(p.name)}</b>: awaiting a frozen baseline (published, not scored)</li>`;
    if (p.dark) return `<li><b>${esc(p.name)}</b>: dark this hour (${esc(p.sources_ok)}/${esc(p.sources_total)} sources)</li>`;
    const sc = typeof p.score === 'number' ? p.score.toFixed(1) : '?';
    return `<li><b>${esc(p.name)}</b>: ${esc(sc)}/100 · ${esc(p.sources_ok)}/${esc(p.sources_total)} sources</li>`;
  });
  const dark = (state.dark_pillars || []).join(', ');
  const note = dark ? ` Dark this hour: ${dark}.` : '';
  const html = `The five pillars right now:${note}<ul>${lines.join('')}</ul>`;
  const speak = `The five pillars: ${state.pillars.map((p) => {
    if (p.uncalibrated) return `${p.name} awaiting baseline`;
    if (p.dark) return `${p.name} dark`;
    return `${p.name} ${typeof p.score === 'number' ? p.score.toFixed(1) : '?'}`;
  }).join('; ')}.`;
  return { html, speak, links: [{ href: `${base}/methodology.html`, label: 'Pillar method →' }] };
}

function newsBlock(news, base, n = 3) {
  const items = (news && news.items) || [];
  if (!items.length) return null;
  const top = items.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, n);
  const html = `Top on the wire:<ul>${top.map((it) => `<li><a href="${esc(it.url || `${base}/news.html`)}" rel="noopener">${esc(it.title)}</a>${it.pillar ? ` <span class="dim">(${esc(it.pillar)})</span>` : ''}</li>`).join('')}</ul>`;
  const speak = `Top on the wire: ${top.map((it) => it.title).join('. ')}.`;
  return { html, speak, links: [{ href: `${base}/news.html`, label: 'Full newsroom →' }] };
}

function breakingBlock(breaking, base) {
  const live = ((breaking && breaking.clusters) || []).filter((c) => c.live).slice(0, 3);
  if (!live.length) {
    return {
      html: 'No live breaking clusters on the desk this hour.',
      speak: 'No live breaking clusters on the desk this hour.',
      links: [{ href: `${base}/news.html`, label: 'Newsroom →' }],
    };
  }
  const html = `Live breaking clusters:<ul>${live.map((c) => `<li><a href="${esc(c.url || `${base}/news.html`)}" rel="noopener">${esc(c.title)}</a> · ${esc((c.outlets || []).slice(0, 3).join(', '))}</li>`).join('')}</ul>`;
  const speak = `Live breaking: ${live.map((c) => c.title).join('. ')}.`;
  return { html, speak, links: [{ href: `${base}/news.html`, label: 'Newsroom →' }] };
}

function betsBlock(bets, base) {
  const open = (bets && bets.open) || [];
  if (!open.length) {
    return {
      html: 'No open bets on my sheet right now.',
      speak: 'No open bets on my sheet right now.',
      links: [{ href: `${base}/bets.html`, label: "Tally's Bets →" }],
    };
  }
  const latest = open.slice().sort((a, b) => String(b.made_at || '').localeCompare(String(a.made_at || ''))).slice(0, 2);
  const html = `My open bets (scored in public, never folded into the index):<ul>${latest.map((b) => `<li>${esc(b.statement)} · p=${esc(b.p)}</li>`).join('')}</ul>`;
  const speak = `My open bets: ${latest.map((b) => `${b.statement}, probability ${b.p}`).join('. ')}.`;
  return { html, speak, links: [{ href: `${base}/bets.html`, label: "Tally's Bets →" }] };
}

function leadersBlock(leaders, base, query) {
  const list = (leaders && leaders.leaders) || [];
  if (!list.length) return null;
  const q = words(query);
  let hit = null;
  if (q.length) {
    hit = list.find((p) => scoreMatch(q, `${p.name} ${p.org || ''} ${(p.aliases || []).join(' ')}`) >= 2) || null;
  }
  const withLine = list.filter((p) => p.state === 'has_line' || (p.lines && p.lines.length)).slice(0, 3);
  if (hit) {
    const line = hit.last_statement && hit.last_statement.headline;
    const html = line
      ? `<b>${esc(hit.name)}</b> (${esc(hit.org || '—')}): latest headline in the corpus — “${esc(line)}”.`
      : `<b>${esc(hit.name)}</b> (${esc(hit.org || '—')}): no headline in this window named them beside a speech cue.`;
    const speak = line
      ? `${hit.name}: ${line}.`
      : `${hit.name}: no speech-cue headline in this window.`;
    return { html, speak, links: [{ href: `${base}/leaders.html`, label: 'Leaders board →' }] };
  }
  if (!withLine.length) {
    return {
      html: 'No leader on the roster carries a speech-cue headline in this window.',
      speak: 'No leader on the roster carries a speech-cue headline in this window.',
      links: [{ href: `${base}/leaders.html`, label: 'Leaders board →' }],
    };
  }
  const html = `Leaders with a speech-cue headline recently:<ul>${withLine.map((p) => `<li><b>${esc(p.name)}</b>${p.last_statement ? `: “${esc(p.last_statement.headline)}”` : ''}</li>`).join('')}</ul>`;
  const speak = `Leaders with a line: ${withLine.map((p) => p.name).join(', ')}.`;
  return { html, speak, links: [{ href: `${base}/leaders.html`, label: 'Leaders board →' }] };
}

function siBlock(sig, base) {
  const prs = sig && sig.agent_prs;
  if (!prs || !prs.ok) {
    return {
      html: 'Takeover Watch has no agent-PR tally this hour.',
      speak: 'Takeover Watch has no agent-PR tally this hour.',
      links: [{ href: `${base}/si-watch.html`, label: 'Takeover Watch →' }],
    };
  }
  const top = (prs.by_agent || []).slice().sort((a, b) => (b.prs_24h || 0) - (a.prs_24h || 0)).slice(0, 4);
  const html = `Agent PRs in the last 24h: <b>${esc(prs.total_24h)}</b> total.<ul>${top.map((a) => `<li>${esc(a.name)}: ${esc(a.prs_24h)}</li>`).join('')}</ul>Watched, not scored into the index.`;
  const speak = `Agent pull requests in the last 24 hours: ${prs.total_24h} total. Top: ${top.map((a) => `${a.name} ${a.prs_24h}`).join(', ')}. Watched, not scored into the index.`;
  return { html, speak, links: [{ href: `${base}/si-watch.html`, label: 'Takeover Watch →' }] };
}

function statusBlock(status, base) {
  const services = (status && status.services) || [];
  if (!services.length) return null;
  const bad = services.filter((s) => s.indicator && s.indicator !== 'none');
  if (!bad.length) {
    return {
      html: 'Lab status pages I watch all read operational right now.',
      speak: 'Lab status pages I watch all read operational right now.',
      links: [{ href: `${base}/status.html`, label: 'AI service status →' }],
    };
  }
  const html = `Status pages with a non-green indicator:<ul>${bad.map((s) => `<li><b>${esc(s.product || s.name)}</b>: ${esc(s.description || s.indicator)}</li>`).join('')}</ul>`;
  const speak = `Non-green right now: ${bad.map((s) => `${s.product || s.name}: ${s.description || s.indicator}`).join('. ')}.`;
  return { html, speak, links: [{ href: `${base}/status.html`, label: 'AI service status →' }] };
}

function voiceBlock(voice, base) {
  if (!voice || !voice.text) {
    return {
      html: 'No recorded voice update on file yet. Flip the speaker and I read my answers in your browser.',
      speak: 'No recorded voice update on file yet. Flip the speaker and I read my answers in your browser.',
      links: [{ href: `${base}/radio.html`, label: 'SIREN Radio →' }],
    };
  }
  const clock = utcClock(voice.generated_at) || '';
  const audio = voice.audio ? `${base}/media/${voice.audio}` : null;
  const html = `My last recorded update${clock ? ` (${esc(clock)})` : ''}: <i>${esc(voice.text)}</i>${audio ? `<div class="links"><a href="${esc(audio)}" data-tally-audio="${esc(audio)}">Play recording →</a></div>` : ''}`;
  const speak = voice.transcript || voice.text;
  return { html, speak, links: [{ href: `${base}/radio.html`, label: 'SIREN Radio →' }], audio };
}

function guideBlock(idx, query, base) {
  if (!idx) return null;
  const q = words(query);
  const faq = (idx.faq || []).map((f) => ({ f, s: scoreMatch(q, f.q) })).sort((a, b) => b.s - a.s);
  const rooms = (idx.rooms || []).map((r) => ({ r, s: scoreMatch(q, `${r.t} ${r.d} ${r.g}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
  const links = [];
  let html = '';
  let speak = '';
  if (faq[0] && faq[0].s > 0) {
    html += esc(faq[0].f.a);
    speak += faq[0].f.a;
    links.push({ href: faq[0].f.u, label: 'Take me there →' });
  }
  if (rooms.length) {
    html += (html ? '<br>' : '') + 'Rooms that match:';
    speak += (speak ? ' ' : '') + `Rooms: ${rooms.map((x) => x.r.t).join(', ')}.`;
    for (const x of rooms) links.push({ href: x.r.u, label: `${x.r.t}: ${x.r.d}` });
  }
  if (!html && !links.length) return null;
  return { html, speak, links };
}

/**
 * Turn tool payloads into one Tally reply.
 * @returns {{ html: string, speak: string, links: {href,label}[], toolsUsed: string[], audio?: string|null }}
 */
export function synthesize(query, results, { base = '', memory = {} } = {}) {
  const parts = [];
  const toolsUsed = Object.keys(results || {}).filter((k) => results[k] != null && results[k].ok !== false);

  const push = (block) => { if (block) parts.push(block); };

  if (results.get_reading && results.get_reading.data) push(readingBlock(results.get_reading.data, base));
  // Pillars share state.json — only add if explicitly planned or reading skipped.
  if (results.get_pillars && results.get_pillars.data) {
    if (!results.get_reading) push(readingBlock(results.get_pillars.data, base));
    push(pillarsBlock(results.get_pillars.data, base));
  }
  if (results.get_breaking && results.get_breaking.data) push(breakingBlock(results.get_breaking.data, base));
  if (results.get_news && results.get_news.data) push(newsBlock(results.get_news.data, base));
  if (results.get_ai_status && results.get_ai_status.data) push(statusBlock(results.get_ai_status.data, base));
  if (results.get_si_signals && results.get_si_signals.data) push(siBlock(results.get_si_signals.data, base));
  if (results.get_leaders && results.get_leaders.data) push(leadersBlock(results.get_leaders.data, base, query));
  if (results.get_bets && results.get_bets.data) push(betsBlock(results.get_bets.data, base));
  if (results.get_voice && results.get_voice.data) push(voiceBlock(results.get_voice.data, base));
  if (results.search_guide && results.search_guide.data) push(guideBlock(results.search_guide.data, query, base));

  // If nothing matched, try guide search on whatever guide payload we have in memory.
  if (!parts.length && memory.guide) push(guideBlock(memory.guide, query, base));

  if (!parts.length) {
    return {
      html: `I could not match that to a dial I hold. Try a chip, open <a href="${esc(base)}/#rooms">every room</a>, or <a href="${esc(base)}/feedback.html">ask on GitHub</a>.`,
      speak: 'I could not match that to a dial I hold. Try one of the suggestions, or open every room.',
      links: [],
      toolsUsed,
      audio: null,
    };
  }

  // Dedupe links by href.
  const seen = new Set();
  const links = [];
  for (const p of parts) {
    for (const l of p.links || []) {
      if (seen.has(l.href)) continue;
      seen.add(l.href);
      links.push(l);
    }
  }

  const html = parts.map((p) => p.html).filter(Boolean).join('<br><br>') + linksHtml(links);
  const speak = parts.map((p) => p.speak).filter(Boolean).join(' ');
  const audio = parts.map((p) => p.audio).find(Boolean) || null;
  return { html, speak, links, toolsUsed, audio };
}

export function greet(state, base = '') {
  const L = state && state.level;
  const sc = state && typeof state.score === 'number' ? state.score.toFixed(1) : null;
  const mood = L ? MOOD[L] || 'watching' : 'watching';
  const html = `Tweet! I'm <b>Tally</b>, SIREN's duty canary. SIREN stands for <b>Superintelligence Real-time Early Notice</b>: I count how loud AI is, every hour`
    + (L ? `, and right now it's <b>SIREN ${esc(L)}</b>${sc ? ` (${esc(sc)}/100)` : ''}, so I'm ${esc(mood)}` : '')
    + `. Ask me anything — I check the live dials myself. Type a question, use the mic, or flip Speak and I read the answer aloud.`;
  const speak = `Tweet! I'm Tally, SIREN's duty canary. SIREN stands for Superintelligence Real-time Early Notice. I count how loud AI is, every hour`
    + (L ? `, and right now it's SIREN ${L}${sc ? `, ${sc} out of 100` : ''}, so I'm ${mood}` : '')
    + `. Ask me anything. I check the live dials myself.`;
  const links = [
    { href: `${base}/`, label: 'War room →' },
    { href: `${base}/tally.html`, label: 'About me →' },
  ];
  return { html: html + linksHtml(links), speak, links };
}

/** Strip HTML / arrows into a speakable line for speechSynthesis. */
export function speakable(text, max = 900) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/→/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Pick a browser voice that sounds a little more like a canary brief than the
 * default system bark. Prefers higher-pitched / female English voices.
 */
export function pickVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  const en = list.filter((v) => /^en([-_]|$)/i.test(v.lang || ''));
  const pool = en.length ? en : list;
  const prefer = [/samantha/i, /karen/i, /moira/i, /zira/i, /google us english/i, /female/i, /siri/i];
  for (const re of prefer) {
    const hit = pool.find((v) => re.test(v.name || ''));
    if (hit) return hit;
  }
  return pool[0] || null;
}
