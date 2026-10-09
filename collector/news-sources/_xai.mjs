// xAI X-search helpers: the response parser and the call budget.
//
// Both are pure so they can be tested against fixtures without a key or a
// network. The adapter that uses them is x-search.mjs.
//
// THE RULE THIS FILE ENFORCES: a model never writes a headline here. The xAI
// API runs a search over X and returns (a) the URLs of the posts its search
// tool actually retrieved — `citations` and `url_citation` annotations — and
// (b) model text. We ask the model to list posts as JSON, then keep ONLY rows
// whose x.com status URL is also among the tool's own citations, whose handle
// matches the handle in that URL, and whose time we compute ourselves from the
// status id (X ids are timestamped snowflakes). Anything else is discarded.
// The post text is the one field that has to come through the model; it is
// labelled as such on every item.
//
// Helper, not an adapter: collector/news.mjs skips `_`-prefixed files.

const X_STATUS = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{6,25})/i;
const TWITTER_EPOCH_MS = 1288834974657n;

/** X status id -> creation time in ms. Null for an id that predates snowflakes. */
export function snowflakeMs(id) {
  try {
    const n = BigInt(String(id));
    const ms = Number((n >> 22n) + TWITTER_EPOCH_MS);
    // Snowflakes started in late 2010; a small legacy id decodes to the epoch
    // itself and is not one.
    return ms > Number(TWITTER_EPOCH_MS) + 86_400_000 ? ms : null;
  } catch {
    return null;
  }
}

/** https://twitter.com/OpenAI/status/123?s=20 -> { handle, id, url } */
export function parseStatusUrl(raw) {
  const m = X_STATUS.exec(String(raw ?? '').trim());
  if (!m) return null;
  return { handle: m[1], id: m[2], url: `https://x.com/${m[1]}/status/${m[2]}` };
}

function collectUrls(v, out) {
  if (!v) return;
  if (typeof v === 'string') { out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) collectUrls(x, out); return; }
  if (typeof v === 'object' && typeof v.url === 'string') out.push(v.url);
}

/**
 * Pull the model text, the tool's citations and a rough count of sources used
 * out of either API shape:
 *   Responses API          { output: [{ type: 'message', content: [{ type: 'output_text', text, annotations }] }], citations?, usage? }
 *   Chat Completions (old) { choices: [{ message: { content } }], citations?, usage? }
 * Throws on a body that is neither — that is a shape change, and a dark source.
 */
export function readXaiBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('xai: response is not a JSON object');
  }
  if (body.error) {
    const msg = typeof body.error === 'string' ? body.error : (body.error.message ?? JSON.stringify(body.error));
    throw new Error(`xai: API error — ${String(msg).slice(0, 200)}`);
  }

  const texts = [];
  const cites = [];
  collectUrls(body.citations, cites);

  if (Array.isArray(body.output)) {
    for (const o of body.output) {
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o.content)) {
        for (const c of o.content) {
          if (!c || typeof c !== 'object') continue;
          if ((c.type === 'output_text' || c.type === 'text') && typeof c.text === 'string') texts.push(c.text);
          if (Array.isArray(c.annotations)) {
            for (const a of c.annotations) if (a && typeof a.url === 'string') cites.push(a.url);
          }
        }
      }
    }
    if (texts.length === 0 && typeof body.output_text === 'string') texts.push(body.output_text);
  } else if (Array.isArray(body.choices)) {
    const msg = body.choices[0]?.message;
    if (msg && typeof msg.content === 'string') texts.push(msg.content);
    collectUrls(msg?.citations, cites);
  } else if (typeof body.output_text !== 'string') {
    throw new Error('xai: response has neither output[] nor choices[] — shape changed');
  } else {
    texts.push(body.output_text);
  }

  const u = body.usage && typeof body.usage === 'object' ? body.usage : {};
  const toolCalls = u.server_side_tool_usage_details && typeof u.server_side_tool_usage_details === 'object'
    ? Object.values(u.server_side_tool_usage_details).reduce((s, v) => s + (Number(v) || 0), 0)
    : null;
  const sourcesUsed = Number.isFinite(Number(u.num_sources_used)) && u.num_sources_used !== undefined
    ? Number(u.num_sources_used)
    : (toolCalls ?? cites.length);

  return { text: texts.join('\n'), citations: cites, sourcesUsed };
}

/** The first JSON array in a block of model text, or null. Tolerates ```json fences. */
export function extractJsonArray(text) {
  const s = String(text ?? '');
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(s.slice(start, end + 1));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Body -> verified posts: [{ handle, id, url, text, posted_at }].
 * Only rows whose status URL appears among the tool's own citations survive.
 */
export function parseXSearch(body, { nowMs = Date.now(), maxAgeHours = 6, max = 8 } = {}) {
  const { text, citations, sourcesUsed } = readXaiBody(body);
  const cited = new Map();
  for (const c of citations) {
    const p = parseStatusUrl(c);
    if (p) cited.set(p.id, p);
  }
  const rows = extractJsonArray(text) ?? [];
  const posts = [];
  const seen = new Set();
  let rejected = 0;
  for (const r of rows) {
    if (!r || typeof r !== 'object') { rejected += 1; continue; }
    const p = parseStatusUrl(r.url);
    // Not a status URL, or one the search tool never returned: discarded. This
    // is the line that stops a model-invented post from becoming a headline.
    if (!p || !cited.has(p.id)) { rejected += 1; continue; }
    // The cited URL and the listed URL must name the same account.
    if (cited.get(p.id).handle.toLowerCase() !== p.handle.toLowerCase()) { rejected += 1; continue; }
    const claimed = String(r.handle ?? '').replace(/^@/, '');
    if (claimed && claimed.toLowerCase() !== p.handle.toLowerCase()) { rejected += 1; continue; }
    const postText = typeof r.text === 'string' ? r.text.replace(/\s+/g, ' ').trim() : '';
    if (postText.length < 12) { rejected += 1; continue; }
    const ms = snowflakeMs(p.id);
    if (ms === null || ms > nowMs + 10 * 60_000 || ms < nowMs - maxAgeHours * 3_600_000) { rejected += 1; continue; }
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    // The handle's capitalisation from the cited URL, not from the model.
    const handle = cited.get(p.id).handle;
    posts.push({ handle, id: p.id, url: `https://x.com/${handle}/status/${p.id}`, text: postText.slice(0, 280), posted_at: new Date(ms).toISOString() });
    if (posts.length >= max) break;
  }
  return { posts, rejected, citations: cited.size, sourcesUsed };
}

// ---------------------------------------------------------------------------
// The budget. One ledger, data/xai-usage.json, shared by every lane that runs
// the newsroom. It records each CALL before the call is made, so a crash or a
// timeout mid-request still counts against the day.
// ---------------------------------------------------------------------------

export const BUDGET_DEFAULTS = Object.freeze({ minutes: 20, dailyCap: 60, maxResults: 8 });

export function budgetConfig(env = process.env) {
  const int = (v, d, lo, hi) => {
    const n = Number.parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };
  return {
    minutes: int(env.XAI_X_SEARCH_MINUTES, BUDGET_DEFAULTS.minutes, 5, 1440),
    dailyCap: int(env.XAI_X_SEARCH_DAILY_CAP, BUDGET_DEFAULTS.dailyCap, 0, 1000),
    maxResults: int(env.XAI_X_SEARCH_MAX_RESULTS, BUDGET_DEFAULTS.maxResults, 1, 25),
  };
}

const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/** A ledger rolled forward to today (UTC). Never mutates its input. */
export function rollLedger(prev, nowMs) {
  const today = dayOf(nowMs);
  const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {};
  const days = Array.isArray(base.days) ? base.days.filter((d) => d && typeof d.day === 'string') : [];
  let calls = Number.isFinite(base.calls) ? base.calls : 0;
  let sources = Number.isFinite(base.sources_used) ? base.sources_used : 0;
  if (base.day && base.day !== today) {
    days.push({ day: base.day, calls, sources_used: sources });
    calls = 0;
    sources = 0;
  }
  return {
    schema: 1,
    day: today,
    calls,
    sources_used: sources,
    last_call_at: typeof base.last_call_at === 'string' ? base.last_call_at : null,
    last_status: typeof base.last_status === 'string' ? base.last_status : null,
    model: typeof base.model === 'string' ? base.model : null,
    model_day: typeof base.model_day === 'string' ? base.model_day : null,
    days: days.slice(-14),
  };
}

/** May we call now? { ok, reason }. reason is 'cadence' | 'cap' when not. */
export function budgetDecision(ledger, nowMs, { minutes, dailyCap }) {
  const l = rollLedger(ledger, nowMs);
  if (l.calls >= dailyCap) return { ok: false, reason: 'cap', ledger: l };
  const last = Date.parse(l.last_call_at ?? '');
  // 10% slack for the same reason as news.mjs's DUE_SLACK: a minute loop that
  // lands at 19m55s must not wait a whole extra minute.
  if (Number.isFinite(last) && last <= nowMs && nowMs - last < minutes * 60_000 * 0.9) {
    return { ok: false, reason: 'cadence', ledger: l };
  }
  return { ok: true, reason: null, ledger: l };
}

/** Count one call, stamped before the request is sent. */
export function recordCall(ledger, nowMs) {
  const l = rollLedger(ledger, nowMs);
  return { ...l, calls: l.calls + 1, last_call_at: new Date(nowMs).toISOString(), last_status: 'pending' };
}

/** Add the sources one call used, and its outcome. */
export function recordResult(ledger, nowMs, { sourcesUsed = 0, status = 'ok' } = {}) {
  const l = rollLedger(ledger, nowMs);
  return { ...l, sources_used: l.sources_used + (Number.isFinite(sourcesUsed) ? sourcesUsed : 0), last_status: status };
}

/** Pick a model id from GET /v1/models. Prefers fast, cheap grok-4 variants. */
export function pickModel(list) {
  const ids = (Array.isArray(list?.data) ? list.data : Array.isArray(list?.models) ? list.models : [])
    .map((m) => (typeof m === 'string' ? m : m?.id))
    .filter((s) => typeof s === 'string');
  const prefs = [
    /^grok-4-1-fast-non-reasoning$/, /^grok-4-fast-non-reasoning$/, /^grok-4-1-fast/, /^grok-4-fast/,
    /^grok-[5-9].*fast/, /^grok-4/, /^grok-[5-9]/,
  ];
  for (const re of prefs) {
    const hit = ids.filter((id) => re.test(id)).sort()[0];
    if (hit) return hit;
  }
  return null;
}
