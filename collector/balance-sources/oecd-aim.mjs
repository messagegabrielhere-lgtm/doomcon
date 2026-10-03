// HARM side — OECD AI Incidents and Hazards Monitor, events dated in the window.
//
// AN LLM'S JUDGEMENT, AND SAID SO. Per the OECD's own methodology page, events
// come from Event Registry news clusters; GPT-4o mini filters them, GPT-4o
// decides incident or hazard, and o3-mini writes the metadata and does the
// clustering. docs/BLISS.md §7.3 keeps language models out of this site's own
// measuring layer, because a judgement a stranger cannot reproduce is the thing
// that separates us from DoomBench's 67.8. This counter does not break that
// rule — nothing here asks a model anything — but it publishes a number a model
// produced, and the page has to say so beside it.
//
// WHAT IS MERGED. Incidents (harm occurred) and hazards (harm plausible), as
// media-reported events, not verified harms. Events get merged over time, so a
// past window can shrink.
//
// THE NEWEST DAYS ARE THIN. The pipeline processes events one to four days old,
// so the last few days of a window ending on the anchor day are empty or
// incomplete. The window is kept identical to the other counters' and the gap
// is stated rather than moved.
//
// SERVER-RENDERED PAGE, NOT AN API. The count is read from the "Results: About
// N incidents & hazards" line of the public page. The JSON backend behind it
// agreed exactly (602) on the one cross-check; it is not used because it takes
// a POST and fetch.mjs sends GETs. robots.txt disallows only /fr/ paths.

export const PAGE = 'https://oecd.ai/en/incidents';

// The empty filter set the page itself sends. Serialised with JSON.stringify so
// the encoded form matches the verified URL byte for byte.
const PROPERTIES_CONFIG = {
  principles: [], industries: [], harm_types: [], harm_levels: [], harmed_entities: [],
  business_functions: [], ai_tasks: [], autonomy_levels: [], languages: [],
};

export function pageUrl(from, to) {
  return (
    `${PAGE}?search_terms=${encodeURIComponent('[]')}&and_condition=false` +
    `&from_date=${from}&to_date=${to}` +
    `&properties_config=${encodeURIComponent(JSON.stringify(PROPERTIES_CONFIG))}` +
    '&order_by=date&num_results=20'
  );
}

const COUNT_LINE = /Results:\s*About\s+([\d,]+)\s+incidents\s*&(?:amp;)?\s*hazards/;

/** Page HTML -> the integer on the "Results: About N incidents & hazards" line, or throw. */
export function parseCount(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const m = COUNT_LINE.exec(text);
  if (!m) throw new Error('oecd-aim-incidents-30d: no "Results: About N incidents & hazards" line on the page');
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isInteger(n)) throw new Error(`oecd-aim-incidents-30d: unreadable count ${JSON.stringify(m[1])}`);
  return n;
}

export default {
  id: 'oecd-aim-incidents-30d',
  side: 'harm',
  label: 'OECD AI Incidents and Hazards Monitor: incidents and hazards dated in the window',
  endpoint: pageUrl('{from}', '{to}'),
  keyless: true,
  windowed: true,
  ai_specific: true,
  context_only: false,
  counts:
    'News-detected AI incidents and hazards dated inside the window, as the OECD monitor classifies them. ' +
    'The classification is made by OpenAI models in the OECD\'s pipeline, not by a person and not by this site.',
  does_not_count:
    'Verified harm: it counts media-reported events. It does not separate incidents (harm occurred) from hazards ' +
    '(harm plausible). The last three or so days of the window are incomplete.',

  async collect(net, { from, to }) {
    const url = pageUrl(from, to);
    const n = parseCount(await net.text(url, { timeoutMs: 30_000 }));
    // 602 in the verified window. Zero is a changed page or filter, not a quiet month.
    if (n === 0) {
      throw new Error(`oecd-aim-incidents-30d: 0 events between ${from} and ${to} — implausible, treating the page or filter as changed (${url})`);
    }
    return {
      value: n,
      unit: 'incidents and hazards',
      meta: {
        wording: 'About',
        classifier: 'OECD pipeline: GPT-4o mini filter, GPT-4o incident-or-hazard, o3-mini metadata and clustering',
        newest_days_incomplete: 'events are processed one to four days after they occur',
      },
    };
  },
};
