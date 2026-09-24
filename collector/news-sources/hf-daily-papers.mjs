// Hugging Face Daily Papers — the field's own curated shortlist.
//
// Why this is worth more than raw arXiv volume: /api/daily_papers is a
// human-curated selection with a community upvote attached, so it carries a
// crowd signal that a raw submission feed cannot. It is also the source most
// likely to overlap with arxiv-newest, and that is the point — the same paper
// arriving through two independent doors is corroboration, and corroboration is
// the term a single-source competitor structurally cannot compute
// (docs/TEARDOWN.md §4: skynetcountdown.com reads one TechCrunch RSS feed and
// says so).
//
// Verified 2026-09-23: 200, application/json, array of
// { paper: { id, title, summary, upvotes, publishedAt, submittedOnDailyAt } }.

import { draft } from './_feed.mjs';

const ENDPOINT = 'https://huggingface.co/api/daily_papers';
const LIMIT = 40;

// The upvote count that earns the full engagement term. Set from the observed
// ceiling of the daily list rather than picked by feel; documented in
// docs/NEWS.md so the number can be argued with.
const UPVOTES_FULL_SCALE = 150;

export default {
  id: 'hf-daily-papers',
  kind: 'paper',
  label: 'Hugging Face Daily Papers',
  weight: 0.8,

  async collect(_fetchText, fetchJson) {
    const url = `${ENDPOINT}?limit=${LIMIT}`;
    const body = await fetchJson(url);

    if (!Array.isArray(body)) {
      throw new Error(
        `hf-daily-papers: expected a JSON array, got ${body === null ? 'null' : typeof body} — API shape changed`,
      );
    }

    const items = [];
    for (const row of body) {
      const paper = row?.paper;
      const id = paper?.id;
      const title = typeof paper?.title === 'string' ? paper.title.replace(/\s+/g, ' ').trim() : '';
      if (!id || !title) continue;

      // Date precedence is a judgement and is stated rather than buried: the
      // NEWS event is the day the paper was surfaced on the daily list, not the
      // day it hit arXiv, because that is when the field looked at it.
      const published =
        paper.submittedOnDailyAt ?? row.publishedAt ?? paper.publishedAt ?? null;
      const publishedMs = published ? Date.parse(published) : NaN;
      if (!Number.isFinite(publishedMs)) continue;

      const upvotes = Number(paper.upvotes);

      items.push(draft({
        source: 'hf-daily-papers',
        kind: 'paper',
        title,
        summary: typeof paper.summary === 'string' ? paper.summary.replace(/\s+/g, ' ').trim().slice(0, 320) : '',
        url: `https://huggingface.co/papers/${id}`,
        published_at: new Date(publishedMs).toISOString(),
        defaultPillar: 'capability',
        // Same key arxiv-newest emits. HF paper ids ARE arXiv ids, so one paper
        // surfaced by both sources collapses to a single item with two votes
        // instead of appearing twice in the reel.
        dedupKey: `arxiv:${id}`,
        engagement: Number.isFinite(upvotes)
          ? { metric: 'hf_upvotes', value: upvotes, full_scale: UPVOTES_FULL_SCALE }
          : null,
        meta: {
          arxiv_id: id,
          upvotes: Number.isFinite(upvotes) ? upvotes : null,
          comments: Number.isFinite(Number(row.numComments)) ? Number(row.numComments) : null,
          github_repo: paper.githubRepo ?? null,
          arxiv_published_at: paper.publishedAt ?? null,
        },
      }));
    }

    if (items.length === 0) {
      throw new Error(`hf-daily-papers: API returned ${body.length} rows but none had a usable id/title/date`);
    }
    return items;
  },
};
