// SCIENCE pillar — AI methods landing in the sciences that are not computer science.
//
// The distinction this source exists to draw: cs.AI/cs.LG/cs.CL (which DOOMCON's
// capability pillar already counts) is the field talking about itself. A paper in
// q-bio.BM or cond-mat.mtrl-sci whose abstract reaches for a neural network is the
// field being USED — somebody solving a protein or a catalyst problem with the
// tooling. That is the upside claim in its most literal form, and it is the number
// that separates "more AI happened" from "more was done with AI".
//
// Measured 2026-09-24: 76 papers over 7 days across the eight categories below,
// against 399 submissions in those categories overall. So roughly one paper in
// five in these corners of arXiv now cites an AI method in its abstract — which
// is the quantity this source tracks, not the absolute volume of science.

import { fetchText as defaultFetchText } from '../fetch.mjs';

const WINDOW_DAYS = 7;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

const ENDPOINT = 'https://export.arxiv.org/api/query';

// Eight categories, chosen because each is a domain where an AI-assisted result is
// a real-world result rather than a benchmark: structural biology and quantitative
// biology, materials, chemical and medical physics, numerical analysis, and
// astronomy instrumentation. Deliberately NO cs.* — that is DOOMCON's side of the
// house and counting it here would make BLISS a second copy of the capability
// pillar wearing a nicer name.
const CATEGORIES = [
  'q-bio.BM',           // biomolecules — structural biology
  'q-bio.QM',           // quantitative methods
  'q-bio.GN',           // genomics
  'cond-mat.mtrl-sci',  // materials science
  'physics.chem-ph',    // chemical physics
  'physics.med-ph',     // medical physics
  'math.NA',            // numerical analysis
  'astro-ph.IM',        // astrophysics instrumentation and methods
];

// Abstract-level phrase match. The phrases are the ones a domain scientist writes
// when the method is the AI, not when the AI is the subject. "language model" is
// included because it is how a chemistry paper describes using one; "AI" alone is
// deliberately absent, since it matches "AI" inside unrelated acronyms and would
// quietly inflate the count.
const AI_PHRASES = [
  'machine learning',
  'deep learning',
  'neural network',
  'foundation model',
  'language model',
];

/** arXiv's submittedDate filter takes UTC YYYYMMDDHHMM. */
function stamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
  );
}

export default {
  id: 'arxiv-science-ai',
  pillar: 'science',
  label: 'arXiv AI-method papers outside cs.*',

  // fetchText rather than the contract's fetchJson parameter because this is Atom
  // XML. Still the shared helper from collector/fetch.mjs, so timeout, retry policy
  // and User-Agent all hold (CONTRACT.md §1.5).
  async collect(fetchJson, { fetchText = defaultFetchText } = {}) {
    const observedAt = new Date();
    const from = stamp(new Date(observedAt.getTime() - WINDOW_MS));
    const to = stamp(observedAt);

    // Built by hand rather than with URLSearchParams: arXiv's query language wants
    // literal '+' for spaces and literal brackets around the date range, and
    // percent-encoding those is a coin flip on their parser. Quoted phrases DO need
    // %22 — that part is encoded, the structure is not.
    const cats = CATEGORIES.map((c) => `cat:${c}`).join('+OR+');
    const phrases = AI_PHRASES.map((p) => `abs:%22${p.replace(/ /g, '+')}%22`).join('+OR+');
    const query = `(${cats})+AND+(${phrases})+AND+submittedDate:[${from}+TO+${to}]`;
    const url = `${ENDPOINT}?search_query=${query}&start=0&max_results=1`;

    // Both deviations from the fetch.mjs defaults are measured and are copied from
    // collector/sources/arxiv.mjs, where they were established: a windowed
    // submittedDate query is a range scan on arXiv's side and runs past the 15s
    // default, and a retry buys nothing because arXiv is slow here rather than
    // flaky — it throttles, and a second attempt turns a soft throttle into a
    // longer one. One long attempt, zero retries, dark if it does not answer.
    const xml = await fetchText(url, { timeoutMs: 40_000, retries: 0 });

    // arXiv answers a malformed query with HTTP 200 and an error entry, so a
    // non-error status proves nothing. Check the payload.
    if (/<title>\s*Error\s*<\/title>/i.test(xml)) {
      const reason = xml.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1]?.trim() ?? 'no summary';
      throw new Error(`arxiv-science-ai: API returned an error entry for ${url} — ${reason}`);
    }

    const match = xml.match(/<opensearch:totalResults[^>]*>\s*(\d+)\s*<\/opensearch:totalResults>/i);
    if (!match) {
      throw new Error(
        `arxiv-science-ai: no <opensearch:totalResults> in response from ${url} — feed shape ` +
          `changed (first 200 chars: ${xml.slice(0, 200).replace(/\s+/g, ' ')})`,
      );
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value)) {
      throw new Error(`arxiv-science-ai: totalResults "${match[1]}" is not a finite number`);
    }

    // Zero is legitimate for a narrow window but not for seven days across eight
    // busy categories — the measured baseline is ~76. A zero here means the phrase
    // filter or the date filter stopped matching, which is a dead source wearing a
    // plausible number. That is the exact failure this project exists to avoid, so
    // it goes dark loudly instead.
    if (value === 0) {
      throw new Error(
        `arxiv-science-ai: 0 matching papers over ${WINDOW_DAYS}d across ${CATEGORIES.length} ` +
          `categories — implausible, treating the query as broken rather than reporting a zero (${url})`,
      );
    }

    return {
      value,
      unit: `papers/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        window_from: from,
        window_to: to,
        categories: CATEGORIES,
        phrases: AI_PHRASES,
      },
    };
  },
};
