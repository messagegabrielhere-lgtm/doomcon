// Hugging Face trending models — weights actually landing, not talk about them.
//
// The scalar every other AI index misses: a model appearing on the Hub is the
// most concrete "something shipped" event available anywhere, and it is public,
// timestamped and countable.
//
// Verified 2026-09-23: /api/models?sort=trendingScore&direction=-1 returns 200,
// application/json, rows of { id, author, likes, downloads, trendingScore,
// createdAt, lastModified, pipeline_tag, tags }.

import { draft } from './_feed.mjs';

const ENDPOINT = 'https://huggingface.co/api/models';
const LIMIT = 50;
const LIKES_FULL_SCALE = 1500;

export default {
  id: 'hf-trending-models',
  kind: 'model',
  label: 'Hugging Face trending models',
  weight: 0.6,

  async collect(_fetchText, fetchJson) {
    const qs = new URLSearchParams({
      sort: 'trendingScore',
      direction: '-1',
      limit: String(LIMIT),
      full: 'false',
    });
    const url = `${ENDPOINT}?${qs}`;
    const body = await fetchJson(url);

    if (!Array.isArray(body)) {
      throw new Error(`hf-trending-models: expected a JSON array, got ${typeof body} — API shape changed`);
    }

    const items = [];
    for (const m of body) {
      const id = typeof m?.id === 'string' ? m.id : null;
      if (!id) continue;

      // published_at is createdAt, NOT lastModified, and this matters.
      // lastModified would resurface a two-year-old checkpoint as breaking news
      // the moment someone fixed a typo in its README. Using createdAt means a
      // trending-but-old model simply falls outside the rolling window and drops
      // out on its own — no special case, no imputed date.
      const createdMs = Date.parse(m.createdAt ?? '');
      if (!Number.isFinite(createdMs)) continue;

      const likes = Number(m.likes);
      const trending = Number(m.trendingScore);
      const pipeline = typeof m.pipeline_tag === 'string' ? m.pipeline_tag : null;

      items.push(draft({
        source: 'hf-trending-models',
        kind: 'model',
        title: `${id} — trending on Hugging Face`,
        summary: [
          pipeline ? `${pipeline.replace(/-/g, ' ')} model` : 'model',
          `by ${m.author ?? id.split('/')[0]}`,
          Number.isFinite(likes) ? `${likes} likes` : null,
          Number.isFinite(Number(m.downloads)) ? `${Number(m.downloads)} downloads` : null,
        ].filter(Boolean).join(', ') + '.',
        url: `https://huggingface.co/${id}`,
        published_at: new Date(createdMs).toISOString(),
        defaultPillar: 'capability',
        engagement: Number.isFinite(likes)
          ? { metric: 'hf_likes', value: likes, full_scale: LIKES_FULL_SCALE }
          : null,
        meta: {
          model_id: id,
          author: m.author ?? null,
          likes: Number.isFinite(likes) ? likes : null,
          downloads: Number.isFinite(Number(m.downloads)) ? Number(m.downloads) : null,
          trending_score: Number.isFinite(trending) ? trending : null,
          pipeline_tag: pipeline,
          last_modified: m.lastModified ?? null,
        },
      }));
    }

    if (items.length === 0) {
      throw new Error(`hf-trending-models: ${body.length} rows returned, none with a usable id and createdAt`);
    }
    return items;
  },
};
