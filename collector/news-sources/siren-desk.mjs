// SIREN desk picks: stories picked by hand from Reddit's AI communities, read
// from data/desk-picks.json. Added 2026-10-08. Every item links the original
// publisher (Reddit is only where it was spotted) and was checked against the
// publisher's page before it went in. No network fetch: the list is the source.

import { readFile } from 'node:fs/promises';
import { draft } from './_feed.mjs';

const PICKS_URL = new URL('../../data/desk-picks.json', import.meta.url);
const PILLARS = new Set(['capability', 'compute', 'attention', 'governance', 'markets']);

export default {
  id: 'siren-desk',
  kind: 'press',
  label: 'SIREN desk picks',
  weight: 0.6,
  async collect() {
    const { items = [] } = JSON.parse(await readFile(PICKS_URL, 'utf8'));
    const out = items
      .filter((p) => p && p.title && p.url && Number.isFinite(Date.parse(p.published_at)))
      .map((p) => draft({
        source: 'siren-desk',
        kind: 'press',
        title: p.title,
        summary: p.summary ?? '',
        url: p.url,
        published_at: new Date(Date.parse(p.published_at)).toISOString(),
        defaultPillar: PILLARS.has(p.pillar) ? p.pillar : 'attention',
        meta: { publisher: p.publisher ?? null, found_on: p.found_on ?? null, hand_picked: true },
      }));
    if (out.length === 0) throw new Error('siren-desk: data/desk-picks.json has no dated items');
    return out;
  },
};
