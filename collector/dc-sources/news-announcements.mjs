// The harder and more interesting half: datacentres that do not exist yet.
//
// data/news.json is a 200-item scored newsroom over a rolling window of a day
// or two. Announcements arrive in it and then fall out of it. So this adapter
// does two things: it applies a conservative published rule to the current
// window, and it MERGES what it finds into a durable ledger, because otherwise
// every announcement this project ever saw would be forgotten within 48 hours.
//
// THE RULE, WRITTEN DOWN SO IT CAN BE ARGUED WITH. An item becomes an announced
// site only when all four hold:
//
//   1. DATACENTRE. Title or summary matches /data ?cent(er|re)s?/i.
//   2. A BUILD, NOT A COMMENT. It contains a construction or commitment verb —
//      announced, unveiled, broke ground, building, constructing, investing,
//      plans, proposed, expanding, opening. A story about datacentre POLICY,
//      FINANCE or LITIGATION is not a site.
//   3. A UNITED STATES PLACE. An unambiguous state name, or a ", XX" postal
//      abbreviation. No state, no pin.
//   4. NOT EXCLUDED. Orbit, and the words that mark a story as being about
//      regulation, bonds, lawsuits or leases rather than a build.
//
// MEASURED YIELD, 2026-09-24. Of 200 scored items, five mention datacentres at
// all and one survives the rule. THAT IS THE HONEST NUMBER and it is why the
// ledger exists — the rule is a filter on a firehose that is mostly not about
// construction, and the dataset grows a pin at a time.
//
// WHAT A NEWS PIN IS AND IS NOT. It is one or more published stories saying a
// company said it is building something. It is not a permit, not a survey, not
// a confirmed address. Location is resolved to the state, and the pin says
// `location_precision: "state"` so nothing on the page can imply otherwise.

import { readFileSync, existsSync } from 'node:fs';
import { stableId, STATE_NAMES } from './_util.mjs';

const NEWS_PATH = 'data/news.json';

const DATACENTRE = /data\s?cent(?:er|re)s?\b/i;

const BUILD_VERB =
  /\b(announc\w*|unveil\w*|broke ground|break(?:s|ing)? ground|groundbreaking|building|builds?|constructing|constructs?|construction of|investing|invests?|investment in|plans? (?:to build|a|an|for)|proposed|proposes?|expand\w*|opening|opens?|to open|breaks? ground|sited?|siting)\b/i;

// Stories that mention a datacentre and a state and are still not a build.
const NOT_A_BUILD =
  /\b(orbital|in orbit|satellite|space|lawsuit|sued|sues|bill|legislation|regulat\w*|moratorium|referendum|ballot|bond|bonds|refinanc\w*|junk|securitis\w*|securitiz\w*|ipo|earnings|lease[sd]?|acquire[sd]?|acquisition|merger)\b/i;

/** Every state named in the text, by full name or by ", XX" postal code. */
function statesIn(text) {
  const found = new Set();
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    // Full name, word-bounded. "Washington" also names a city and a person;
    // it is accepted because the alternative is dropping a real state, and the
    // precision of the pin is published as "state" either way.
    if (new RegExp(`\\b${name.replace(/ /g, '\\s')}\\b`).test(text)) found.add(abbr);
    // Postal abbreviation only after a comma — "IN", "OR", "OK", "ME", "HI"
    // and "DE" are all ordinary English words and would otherwise match
    // constantly. ", IN" after a place name is how a dateline is written.
    else if (new RegExp(`,\\s${abbr}\\b`).test(text)) found.add(abbr);
  }
  return [...found].sort();
}

export default {
  id: 'news-announcements',
  label: 'Announcements extracted from the DOOMCON newsroom',
  endpoint: NEWS_PATH,
  keyless: true,
  refresh_days: 0,
  gives: 'announced sites, state-level, traceable to a scored news item id',

  /**
   * `previous` is the sites[] array from the last data/datacenters.json, so the
   * ledger survives items falling out of the newsroom window.
   */
  collect(_net, { previous = [], nowIso }) {
    if (!existsSync(NEWS_PATH)) {
      throw new Error(`news-announcements: ${NEWS_PATH} does not exist; run collector/news.mjs first`);
    }
    const news = JSON.parse(readFileSync(NEWS_PATH, 'utf8'));
    const items = Array.isArray(news?.items) ? news.items : [];

    const examined = items.length;
    let mentioned = 0;
    const kept = new Map();

    for (const it of items) {
      const text = `${it.title ?? ''} ${it.summary ?? ''}`;
      if (!DATACENTRE.test(text)) continue;
      mentioned++;
      if (!BUILD_VERB.test(text)) continue;
      if (NOT_A_BUILD.test(text)) continue;

      const states = statesIn(text);
      if (states.length !== 1) continue; // two states named is an ambiguous pin

      const state = states[0];
      const corr = it.meta?.corroboration ?? {};
      const sources = Array.isArray(corr.sources) && corr.sources.length ? corr.sources : [it.source];

      const id = stableId('dc', 'news', it.id);
      kept.set(id, {
        id,
        name: it.title ?? null,
        operator: Array.isArray(it.entities) && it.entities.length ? it.entities[0] : null,
        status: 'announced',
        lat: null,
        lon: null,
        state,
        location_precision: 'state',
        evidence: [
          {
            kind: 'news',
            news_id: it.id,
            source: it.source,
            title: it.title ?? null,
            url: it.url ?? null,
            published_at: it.published_at ?? null,
            corroboration: sources.length,
            corroborating_sources: [...sources].sort(),
            score: Number.isFinite(it.score) ? it.score : null,
          },
        ],
        // Two independent outlets carrying the same announcement is the only
        // thing in this half of the dataset that resembles verification.
        confidence: sources.length >= 2 ? 'medium' : 'low',
        first_seen_at: nowIso,
      });
    }

    // MERGE. Anything this project previously extracted from the newsroom stays,
    // with its original first_seen_at, even once the story has aged out.
    let carried = 0;
    for (const prev of previous) {
      if (prev?.status !== 'announced') continue;
      if (!prev.evidence?.some((e) => e.kind === 'news')) continue;
      if (kept.has(prev.id)) {
        kept.get(prev.id).first_seen_at = prev.first_seen_at ?? nowIso;
      } else {
        kept.set(prev.id, { ...prev, carried_from_ledger: true });
        carried++;
      }
    }

    const sites = [...kept.values()];
    return {
      sites,
      meta: {
        origin: 'local',
        error: null,
        news_generated_at: news?.generated_at ?? null,
        items_examined: examined,
        items_mentioning_datacentres: mentioned,
        items_passing_the_rule: sites.length - carried,
        carried_from_ledger: carried,
        rule: [
          'mentions a data center or data centre',
          'contains a construction or commitment verb',
          'names exactly one US state',
          'is not orbital, legal, financial or regulatory',
        ],
        note:
          'the newsroom is a rolling 200-item window, so this yields very few pins per run ' +
          'and accumulates into a ledger instead; every pin carries the news item id it came from',
      },
    };
  },
};
