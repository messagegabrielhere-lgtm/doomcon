// X — recent AI posts, found through xAI's official API (Grok with X search).
//
// Reading X goes through the official xAI API only. No X HTML is fetched, and
// the X OAuth keys the posting scripts use are never touched here.
//
// WHAT COMES OUT: one item per X post that the search tool itself cited. The
// URL is the post, the headline is the post's text, the attribution is the
// handle, and the time is computed from the post id. See _xai.mjs for the
// rule that discards anything the model wrote that the tool did not return.
//
// COST CONTROL, because this is the one paid source in the newsroom:
//   - off unless XAI_API_KEY is set, and off when XAI_X_SEARCH_OFF=1 (the
//     15-minute lane sets that while the minute loop is running);
//   - at most one call every XAI_X_SEARCH_MINUTES (default 20), across every
//     lane, via data/xai-usage.json, which is stamped BEFORE the request;
//   - at most XAI_X_SEARCH_DAILY_CAP calls per UTC day (default 60);
//   - XAI_X_SEARCH_MAX_RESULTS posts asked for (default 8).
// When any gate says no, the source is HELD — its previous items stay in the
// window and its row says why — rather than dark.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { draft } from './_feed.mjs';
import { xOutlet } from './_outlets.mjs';
import {
  parseXSearch, budgetConfig, budgetDecision, recordCall, recordResult, rollLedger, pickModel,
} from './_xai.mjs';

export const USAGE_URL = new URL('../../data/xai-usage.json', import.meta.url);
const API = 'https://api.x.ai/v1';
const CALL_TIMEOUT_MS = 50_000;

async function readLedger(url = USAGE_URL) {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return null; }
}
async function writeLedger(ledger, url = USAGE_URL) {
  await mkdir(new URL('./', url), { recursive: true });
  await writeFile(url, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
}

function held(reason) {
  const out = [];
  out.held = reason;
  return out;
}

export function prompt(maxResults, nowMs) {
  const since = new Date(nowMs - 90 * 60_000).toISOString();
  return [
    {
      role: 'system',
      content:
        'You are a search tool for a news wire. Use X search to find real posts. ' +
        'Never invent, paraphrase or summarise a post. Output only JSON.',
    },
    {
      role: 'user',
      content:
        `Search X for posts made after ${since} about significant artificial-intelligence news: ` +
        'model releases, outages, announcements by AI labs (OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral, ' +
        'DeepSeek, Qwen), AI policy and regulation, major AI funding or acquisitions, AI safety incidents. ' +
        'Prefer posts by the labs themselves, their executives, and established news organisations and reporters. ' +
        `Return a JSON array of at most ${maxResults} objects, newest first, each exactly ` +
        '{"url": "https://x.com/<handle>/status/<id>", "handle": "<handle>", "text": "<the post text, verbatim>"}. ' +
        'Only include posts you actually retrieved with the search tool. If there are none, return [].',
    },
  ];
}

/** The X search call. Responses API first; the legacy live-search shape only if that endpoint is missing. */
async function callXai(fetchJson, { key, model, maxResults, nowMs }) {
  const headers = { authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const fromDate = new Date(nowMs - 86_400_000).toISOString().slice(0, 10);
  try {
    return await fetchJson(`${API}/responses`, {
      method: 'POST',
      headers,
      retries: 0,
      timeoutMs: CALL_TIMEOUT_MS,
      body: JSON.stringify({
        model,
        input: prompt(maxResults, nowMs),
        tools: [{ type: 'x_search', from_date: fromDate }],
        max_output_tokens: 1500,
        store: false,
      }),
    });
  } catch (err) {
    if (err?.status !== 404 && err?.status !== 405) throw err;
  }
  return fetchJson(`${API}/chat/completions`, {
    method: 'POST',
    headers,
    retries: 0,
    timeoutMs: CALL_TIMEOUT_MS,
    body: JSON.stringify({
      model,
      messages: prompt(maxResults, nowMs),
      search_parameters: {
        mode: 'on',
        sources: [{ type: 'x' }],
        max_search_results: maxResults,
        from_date: fromDate,
        return_citations: true,
      },
      max_tokens: 1500,
    }),
  });
}

/** posts from parseXSearch -> drafts. Pure; exported for tests. */
export function postsToDrafts(posts) {
  return posts.map((p) => {
    const { outlet, vetted } = xOutlet(p.handle);
    const official = outlet && !outlet.startsWith('x:');
    return draft({
      source: 'x-search',
      kind: 'forum',
      title: p.text.slice(0, 200),
      summary: `Posted on X by @${p.handle}. Found with xAI's X search; text as returned by the search tool.`,
      url: p.url,
      published_at: p.posted_at,
      defaultPillar: 'attention',
      weightOverride: official ? 0.65 : vetted ? 0.5 : 0.3,
      meta: {
        x_handle: p.handle,
        x_status_id: p.id,
        outlet_domain: outlet,
        vetted,
        unvetted: !vetted,
        text_via: 'xai_x_search',
        time_basis: 'x_snowflake',
      },
    });
  });
}

export default {
  id: 'x-search',
  kind: 'forum',
  label: 'X — AI posts via xAI search',
  weight: 0.5,
  minIntervalMs: budgetConfig().minutes * 60_000,
  maxItems: 40,
  // The search is agentic and can take tens of seconds; the fast lane's
  // default 25s watchdog would cut off a call that was already paid for.
  timeoutMs: CALL_TIMEOUT_MS + 5_000,

  async collect(_fetchText, fetchJson, { env = process.env, usageUrl = USAGE_URL, now = Date.now } = {}) {
    const key = String(env.XAI_API_KEY ?? '').trim();
    if (!key) return held('no XAI_API_KEY');
    if (env.XAI_X_SEARCH_OFF === '1') return held('off in this lane (XAI_X_SEARCH_OFF=1)');

    const cfg = budgetConfig(env);
    const nowMs = now();
    const ledger0 = await readLedger(usageUrl);
    const decision = budgetDecision(ledger0, nowMs, cfg);
    if (!decision.ok) {
      // Persist the day roll-over even when holding, so the file reads true.
      await writeLedger(decision.ledger, usageUrl);
      return held(decision.reason === 'cap'
        ? `daily cap reached (${decision.ledger.calls}/${cfg.dailyCap} calls today)`
        : `not due (one call per ${cfg.minutes} min)`);
    }

    // Model: the listing endpoint is free; resolved once a day and cached.
    let ledger = decision.ledger;
    let model = env.XAI_X_SEARCH_MODEL || (ledger.model_day === ledger.day ? ledger.model : null);
    if (!model) {
      try {
        model = pickModel(await fetchJson(`${API}/models`, {
          headers: { authorization: `Bearer ${key}` }, retries: 0, timeoutMs: 10_000,
        }));
      } catch { /* fall through to the default */ }
      model = model || 'grok-4-fast';
      ledger = { ...ledger, model, model_day: ledger.day };
    }

    ledger = recordCall(ledger, nowMs);
    await writeLedger(ledger, usageUrl);

    let body;
    try {
      body = await callXai(fetchJson, { key, model, maxResults: cfg.maxResults, nowMs });
    } catch (err) {
      // A model that no longer exists: forget the cached choice so tomorrow's
      // (or the next) call re-picks from the listing.
      const msg = String(err?.message ?? err);
      const forget = /model/i.test(msg) && (err?.status === 400 || err?.status === 404);
      await writeLedger({ ...recordResult(await readLedger(usageUrl) ?? ledger, now(), { status: `error ${err?.status ?? ''}`.trim() }), ...(forget ? { model: null, model_day: null } : {}) }, usageUrl);
      throw new Error(`x-search: ${msg.split(key).join('[key]').slice(0, 240)}`);
    }

    let parsed;
    try {
      parsed = parseXSearch(body, { nowMs, max: cfg.maxResults });
    } catch (err) {
      await writeLedger(recordResult(rollLedger(await readLedger(usageUrl) ?? ledger, now()), now(), { status: 'malformed' }), usageUrl);
      throw err;
    }
    await writeLedger(recordResult(await readLedger(usageUrl) ?? ledger, now(), { sourcesUsed: parsed.sourcesUsed, status: 'ok' }), usageUrl);

    const drafts = postsToDrafts(parsed.posts);
    for (const d of drafts) {
      d.meta.citations_returned = parsed.citations;
      d.meta.rows_rejected = parsed.rejected;
      d.meta.model = model;
    }
    return drafts;
  },
};
