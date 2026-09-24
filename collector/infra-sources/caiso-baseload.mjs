// CAISO overnight floor — the lowest California's load went between midnight and
// 06:00 Pacific, in megawatts. Third reading of the same statistic; the argument
// for the statistic is in ercot-baseload.mjs.
//
// California is the second control. Its datacentre stock is old — Santa Clara,
// not a 2024 greenfield campus — and its grid has the most solar in North
// America, which means its load shape is unlike anywhere else. Three grids with
// three different stories are enough to notice when one of them stops matching
// the other two. Two would not be.
//
// THE KNOWN SIX-HOUR HOLE, published rather than papered over. CAISO's public
// outlook CSV carries the CURRENT Pacific day only; there is no dated archive
// path on this host (both /outlook/<YYYYMMDD>/demand.csv forms return 404,
// checked 2026-09-23). So between 00:00 and roughly 06:00 Pacific — 07:00 to
// 13:00 UTC — no complete overnight window exists anywhere in the feed and this
// source reports DARK. The alternative is publishing the minimum of a two-hour
// window as though it were the minimum of a six-hour one, which would print a
// higher floor every morning and call it a trend. Six honest dark hours a day.
//
// Verified 2026-09-23: 7,345 bytes, five-minute rows, forecast columns populated
// for the rest of the day and `Current demand` blank beyond the present minute.

import { parseCsv, wallMinutes, zonedDay, finite, round } from './_util.mjs';

const ENDPOINT = 'https://www.caiso.com/outlook/current/demand.csv';

const WINDOW_START_MIN = 0;
const WINDOW_END_MIN = 6 * 60;
const EXPECTED_INTERVALS = 72;
const MIN_INTERVALS = 68;

export default {
  id: 'caiso-baseload',
  pillar: 'grid',
  label: 'CAISO overnight floor',
  region: 'CAISO · California',
  unitLabel: 'MW',
  cadence: 'daily, settles at 06:00 Pacific',
  direction: 'higher = more load that never switches off',

  async collect(net) {
    const csv = await net.text(ENDPOINT);
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error('caiso-baseload: CSV had no rows');

    const header = rows[0].map((h) => h.trim());
    const iTime = header.indexOf('Time');
    const iDemand = header.indexOf('Current demand');
    if (iTime < 0 || iDemand < 0) {
      throw new Error(`caiso-baseload: unexpected columns [${header.join(', ')}]`);
    }

    const window = [];
    let blanks = 0;

    for (let r = 1; r < rows.length; r++) {
      const time = (rows[r][iTime] ?? '').trim();
      if (!time) continue;
      const min = wallMinutes(time);
      if (min < WINDOW_START_MIN || min >= WINDOW_END_MIN) continue;

      const raw = (rows[r][iDemand] ?? '').trim();
      // Blank means the interval has not happened yet. Number('') is 0 and a
      // zero would become the overnight floor of the state of California.
      if (raw === '') { blanks++; continue; }
      const mw = Number(raw);
      if (!Number.isFinite(mw) || mw <= 0) continue;
      window.push({ time, mw });
    }

    if (window.length < MIN_INTERVALS) {
      // The expected, documented, six-hours-a-day failure. The message says
      // which of the two causes it is so an operator reading a log at 09:00 UTC
      // does not go looking for a broken parser.
      throw new Error(
        `caiso-baseload: overnight window incomplete — ${window.length} of ${EXPECTED_INTERVALS} ` +
        `intervals present (need ${MIN_INTERVALS}), ${blanks} still blank. ` +
        `CAISO publishes the current Pacific day only, so this is the normal state between ` +
        `00:00 and 06:00 Pacific and an outage at any other hour.`
      );
    }

    window.sort((a, b) => a.mw - b.mw);
    const floor = window[0];
    const high = window[window.length - 1].mw;

    // The CSV carries times but no date. The Pacific calendar day is derived
    // from the run clock, which is correct for a file defined as "today in
    // Pacific" and is recorded in meta so the derivation is visible rather than
    // implied.
    const localDay = zonedDay(new Date(), 'America/Los_Angeles');
    const ms = Date.parse(`${localDay}T${floor.time}:00`);

    return {
      value: finite(round(floor.mw, 1), 'caiso-baseload floor'),
      unit: 'MW',
      // Pacific is UTC-7 in daylight time and UTC-8 in standard time. Rather
      // than hard-code either, the local wall time is reported as-is in meta and
      // observed_at carries the run's own instant only when the offset cannot be
      // established from the feed — which it cannot, because the feed has no date.
      observed_at: new Date().toISOString(),
      meta: {
        // The Pacific calendar day this window belongs to. collector/infra.mjs
        // keys the accumulated baseline on this rather than on the run clock,
        // because one overnight window is readable under two UTC dates.
        baseline_day: localDay,
        local_day_derived: localDay,
        floor_at_local: `${floor.time} PT`,
        floor_local_naive_iso: Number.isFinite(ms) ? `${localDay}T${floor.time}:00` : null,
        window_local: '00:00–06:00 PT',
        intervals_used: window.length,
        intervals_expected: EXPECTED_INTERVALS,
        blank_intervals: blanks,
        window_high_mw: round(high, 1),
        window_range_mw: round(high - floor.mw, 1),
        direction: 'higher = more always-on load',
        source_note:
          'CAISO publishes the current Pacific day only and carries no offset in the file; ' +
          'the calendar day is derived from the run clock and observed_at is the run instant',
      },
    };
  },
};
