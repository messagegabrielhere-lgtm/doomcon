import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasVisitors,
  visitorsModel,
  visitorsHomePanel,
  visitorsAwaitingPanel,
} from './_visitorsMap.mjs';

const outline = {
  countries: [
    {
      iso2: 'US',
      name: 'United States',
      rings: [[[-100, 40], [-90, 40], [-90, 30], [-100, 30], [-100, 40]]],
    },
    {
      iso2: 'GB',
      name: 'United Kingdom',
      rings: [[[-5, 55], [0, 55], [0, 50], [-5, 50], [-5, 55]]],
    },
    {
      iso2: 'AQ',
      name: 'Antarctica',
      rings: [[[0, -80], [10, -80], [10, -70], [0, -70], [0, -80]]],
    },
  ],
};

const visitors = {
  schema: 1,
  generated_at: '2026-10-14T02:00:00.000Z',
  as_of_date: '2026-10-14',
  window: { start: '2026-10-07T02:00:00Z', end: '2026-10-14T02:00:00Z', days: 7 },
  totals: { pageviews: 100, visitors_located: 50, countries: 2, unknown: 0 },
  countries: [
    { iso2: 'US', name: 'United States', count: 40, share: 0.8 },
    { iso2: 'GB', name: 'United Kingdom', count: 10, share: 0.2 },
  ],
};

test('hasVisitors requires at least one located country', () => {
  assert.equal(hasVisitors(null), false);
  assert.equal(hasVisitors({ countries: [] }), false);
  assert.equal(hasVisitors(visitors), true);
});

test('visitorsModel paints countries with counts and drops Antarctica by frame', () => {
  const model = visitorsModel(visitors, outline);
  assert.ok(model);
  assert.equal(model.ranked.length, 2);
  const us = model.lands.find((l) => l.iso2 === 'US');
  const aq = model.lands.find((l) => l.iso2 === 'AQ');
  assert.ok(us);
  assert.ok(us.count === 40 && us.t > 0);
  assert.equal(aq, undefined);
});

test('visitorsHomePanel is server HTML with the top list and no script', () => {
  const model = visitorsModel(visitors, outline);
  const html = visitorsHomePanel(model, {
    href: (p) => p,
    titleHtml: '<span>WHERE THE READERS ARE</span>',
  });
  assert.match(html, /id="readers"/);
  assert.match(html, /United States/);
  assert.match(html, /United Kingdom/);
  assert.match(html, /\/api\/visitors\.json/);
  assert.match(html, /<svg /);
  assert.doesNotMatch(html, /<script/);
});

test('visitorsHomePanel keeps /#readers alive when there is no snapshot', () => {
  const html = visitorsHomePanel(null, {
    titleHtml: '<span>WHERE THE READERS ARE</span>',
  });
  assert.match(html, /id="readers"/);
  assert.match(html, /No country counts on this build/);
  assert.doesNotMatch(html, /GOATCOUNTER_API_KEY/);
  assert.doesNotMatch(html, /<svg /);
  assert.equal(visitorsAwaitingPanel({ titleHtml: 'x' }).includes('id="readers"'), true);
});
