/**
 * collector/cards/index.mjs — the five designs, and the order they are ranked in.
 *
 * The order IS the ranking argued in docs/CARD-DESIGNS.md §1: which of these
 * would actually stop a thumb. It is not the order they were built in and it is
 * not the order the brief listed them in.
 */

import drought from './drought.mjs';
import race from './race.mjs';
import map from './map.mjs';
import level from './level.mjs';
import developing from './developing.mjs';

/** Ranked, strongest first. */
export const DESIGNS = [drought, race, map, developing, level];

export { drought, race, map, level, developing };

/** Every design takes the same bag, so a scheduler never has to know which
 *  file reads which JSON. `data` is { state, news, race, datacenters, infra }. */
export function renderable(data) {
  return DESIGNS.map((d) => ({ id: d.id, ...d.shouldPost(data) }));
}

export default { DESIGNS, renderable };
