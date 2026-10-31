// The Supply Depot catalog: every category and item, in page order.
// Edit catalog-a..d.mjs, then run `node supply/build.mjs`.
import { PART_A } from './catalog-a.mjs';
import { PART_B } from './catalog-b.mjs';
import { PART_C } from './catalog-c.mjs';
import { PART_D } from './catalog-d.mjs';

export const TAG = 'buyusa0d-20';
export const CATALOG = [...PART_A, ...PART_B, ...PART_C, ...PART_D];

export const amazonSearch = (q) =>
  `https://www.amazon.com/s?k=${encodeURIComponent(q).replace(/%20/g, '+')}&tag=${TAG}`;
