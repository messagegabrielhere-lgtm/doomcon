// Runs the n8n Code nodes against realistic Vapi / form / Sheets / Calendar
// payloads, with the same globals n8n gives them ($input, $, DateTime).
//   cd voice-agent && npm install && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime, Settings } from 'luxon';
import { buildWorkflow, buildAssistant, readEnvFile, DEFAULTS } from '../configure.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const SETTINGS = {
  ...DEFAULTS,
  AGENT_NAME: "Sam O'Rivera",
  BROKERAGE: 'Harbor Realty',
  AGENT_PHONE: '+15555550123',
  AGENT_EMAIL: 'sam@example.com',
  GOOGLE_CALENDAR_ID: 'sam@example.com',
  SERVICE_AREA: 'Austin',
  TIMEZONE: 'America/Chicago',
  N8N_BASE_URL: 'https://n8n.example.com',
  VAPI_WEBHOOK_SECRET: 'secret',
  GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/abc/edit',
  VAPI_ASSISTANT_ID: 'asst_123',
  VAPI_PHONE_NUMBER_ID: 'pn_456',
};
const TZ = SETTINGS.TIMEZONE;

const workflow = buildWorkflow(SETTINGS);
const byName = Object.fromEntries(workflow.nodes.map((n) => [n.name, n]));

// Freeze "now": Monday 6 Oct 2026, 11:00 in Austin.
const NOW = DateTime.fromISO('2026-10-06T11:00:00', { zone: TZ });
Settings.now = () => NOW.toMillis();

function run(nodeName, items, others = {}) {
  const code = byName[nodeName].parameters.jsCode;
  const wrap = (arr) => arr.map((j) => ('json' in Object(j) && Object.keys(j).length <= 2 ? j : { json: j }));
  const input = wrap(items);
  const $input = { all: () => input, first: () => input[0] };
  const $ = (name) => {
    if (!(name in others)) throw new Error(`test did not provide $('${name}')`);
    const arr = wrap(others[name]);
    return { all: () => arr, first: () => arr[0] };
  };
  return new Function('$input', '$', 'DateTime', `return (() => {\n${code}\n})();`)($input, $, DateTime);
}

const results = (out) => out[0].json.response.results[0];

function csv(path) {
  const [head, ...rows] = readFileSync(path, 'utf8').trim().split('\n');
  const split = (line) => line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0, -1).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, ''));
  const cols = split(head);
  return rows.map((r) => Object.fromEntries(split(r).map((v, i) => [cols[i], v])));
}

// --- structure ---------------------------------------------------------------

test('every connection points at a real node and names are unique', () => {
  assert.equal(new Set(workflow.nodes.map((n) => n.name)).size, workflow.nodes.length);
  for (const [from, { main }] of Object.entries(workflow.connections)) {
    assert.ok(byName[from], `connection from missing node ${from}`);
    for (const out of main) for (const c of out) assert.ok(byName[c.node], `${from} -> missing ${c.node}`);
  }
});

test('all placeholders are filled and Code nodes compile', () => {
  const text = JSON.stringify(workflow);
  assert.doesNotMatch(text, /__[A-Z][A-Z0-9_]*__/);
  assert.doesNotMatch(text, /"@file:/);
  for (const n of workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.code')) {
    assert.doesNotThrow(() => new Function('$input', '$', 'DateTime', n.parameters.jsCode), n.name);
  }
  // The apostrophe in the agent's name survived JS string escaping.
  assert.match(byName['Build Vapi Call'].parameters.jsCode, /Sam O\\'Rivera/);
});

test('a failing Google / Vapi step never stops the call or the alert', () => {
  for (const n of workflow.nodes.filter((n) => /googleSheets|googleCalendar|httpRequest|gmail/.test(n.type))) {
    assert.equal(n.onError, 'continueRegularOutput', n.name);
  }
});

test('the Route switch covers every tool the assistant can call', () => {
  const assistant = buildAssistant(SETTINGS);
  const route = byName.Route.parameters.output;
  for (const t of assistant.model.tools.filter((t) => t.type === 'function')) {
    assert.match(route, new RegExp(`\\b${t.function.name}\\b`), t.function.name);
    assert.equal(t.server.url, 'https://n8n.example.com/webhook/vapi');
  }
  assert.doesNotMatch(JSON.stringify(assistant), /__[A-Z][A-Z0-9_]*__|@file:/);
  assert.match(assistant.model.messages[0].content, /Sam O'Rivera/);
});

test('.env parsing: comments, blanks, quotes, apostrophes', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'va-')), '.env');
  writeFileSync(f, ["# header", "AGENT_NAME=Sam O'Rivera   # the agent", 'VAPI_ASSISTANT_ID=        # filled later', 'BROKERAGE="Harbor # Realty"', 'TIMEZONE=America/Chicago'].join('\n'));
  assert.deepEqual(readEnvFile(f), { AGENT_NAME: "Sam O'Rivera", VAPI_ASSISTANT_ID: '', BROKERAGE: 'Harbor # Realty', TIMEZONE: 'America/Chicago' });
});

// --- speed to lead -------------------------------------------------------------

test('normalize lead: formats the phone, keeps the details, calls during hours', () => {
  const [out] = run('Normalize Lead', [
    { body: { first_name: 'Ana', last_name: 'Diaz', phone: '(512) 555-0199', email: 'Ana@Mail.com ', property: '1407 Maple Bend Dr' } },
  ]);
  assert.equal(out.json.callNow, true);
  assert.equal(out.json.firstName, 'Ana');
  assert.deepEqual(
    { ...out.json.lead, created_at: undefined },
    { phone: '+15125550199', name: 'Ana Diaz', email: 'ana@mail.com', source: 'web form', interest: '1407 Maple Bend Dr', status: 'calling', created_at: undefined }
  );
});

test('normalize lead: queues outside calling hours, refuses without consent or phone', () => {
  Settings.now = () => NOW.set({ hour: 22 }).toMillis();
  try {
    const [late] = run('Normalize Lead', [{ body: { name: 'Bo', phone: '+44 7700 900123' } }]);
    assert.equal(late.json.callNow, false);
    assert.equal(late.json.lead.status, 'queued');
    assert.equal(late.json.lead.phone, '+447700900123');
  } finally {
    Settings.now = () => NOW.toMillis();
  }
  const [noConsent, noPhone] = run('Normalize Lead', [{ body: { name: 'C', phone: '5125550100', consent: 'no' } }, { body: { name: 'D' } }]);
  assert.equal(noConsent.json.callNow, false);
  assert.equal(noConsent.json.lead.status, 'no consent - do not call');
  assert.equal(noPhone.json.ok, false);
});

test('build vapi call + mark called', () => {
  const lead = { phone: '+15125550199', name: 'Ana Diaz', source: 'Zillow', interest: 'L-101' };
  const [built] = run('Build Vapi Call', [{ lead, firstName: 'Ana' }]);
  const c = built.json.vapiCall;
  assert.equal(c.assistantId, 'asst_123');
  assert.equal(c.phoneNumberId, 'pn_456');
  assert.deepEqual(c.customer, { number: '+15125550199', name: 'Ana Diaz' });
  assert.equal(c.assistantOverrides.variableValues.leadSource, 'Zillow');
  assert.match(c.assistantOverrides.firstMessage, /^Hi Ana, it's Jordan, Sam O'Rivera's AI assistant\./);

  const marked = run('Mark Called', [{ json: { id: 'call_1' }, pairedItem: { item: 0 } }, { json: { error: { message: 'Bad number' } }, pairedItem: { item: 0 } }, { json: { error: 'Credentials not found' }, pairedItem: { item: 0 } }], {
    'Build Vapi Call': [built.json],
  });
  assert.equal(marked[0].json.status, 'called');
  assert.equal(marked[0].json.vapi_call_id, 'call_1');
  assert.equal(marked[1].json.status, 'call failed: Bad number');
  assert.equal(marked[1].json.phone, '+15125550199');
  assert.equal(marked[2].json.status, 'call failed: Credentials not found');
});

test('pick queued leads from the sheet', () => {
  const out = run('Pick Queued Leads', [
    { phone: 15125550111, name: 'Eve Park', status: 'queued' },
    { phone: '+15125550112', name: 'Al', status: 'called' },
    {},
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].json.lead.phone, '+15125550111');
  assert.equal(out[0].json.firstName, 'Eve');
});

// --- Vapi server -----------------------------------------------------------------

const toolCall = (name, args, asString = false) => ({
  body: {
    message: {
      type: 'tool-calls',
      call: { id: 'call_9', customer: { number: '+15125550199' } },
      toolCallList: [{ id: 'tc_1', type: 'function', function: { name, arguments: asString ? JSON.stringify(args) : args } }],
    },
  },
});

test('parse: tool call with string arguments, day window in the agent timezone', () => {
  const [out] = run('Parse Vapi Request', [toolCall('check_availability', { date: '2026-10-07' }, true)]);
  assert.equal(out.json.route, 'check_availability');
  assert.equal(out.json.toolCallId, 'tc_1');
  assert.equal(out.json.callerPhone, '+15125550199');
  assert.equal(out.json.timeMin, '2026-10-07T00:00:00.000-05:00');
  assert.equal(out.json.timeMax, '2026-10-07T23:59:59.999-05:00');
  const [eoc] = run('Parse Vapi Request', [{ body: { message: { type: 'end-of-call-report', call: { customer: { number: '+1' } } } } }]);
  assert.equal(eoc.json.route, 'end-of-call-report');
  const [other] = run('Parse Vapi Request', [{ body: { message: { type: 'status-update' } } }]);
  assert.equal(other.json.route, 'ignore');
});

const listings = csv(join(HERE, '..', 'sheets', 'Listings.csv'));
const parsed = (name, args) => run('Parse Vapi Request', [toolCall(name, args)])[0].json;

test('search listings: filters by area, budget, beds and status', () => {
  const r = results(run('Match Listings', listings, { 'Parse Vapi Request': [parsed('search_listings', { area: 'Austin', max_price: 650000, min_beds: 2 })] }));
  assert.equal(r.toolCallId, 'tc_1');
  assert.match(r.result, /^Found 2 matching listings/);
  assert.match(r.result, /Zilker.*\$615,000/); // closest to budget first
  assert.match(r.result, /Mueller/);
  assert.doesNotMatch(r.result, /Hyde Park|Dripping Springs/); // over budget / pending

  const none = results(run('Match Listings', listings, { 'Parse Vapi Request': [parsed('search_listings', { area: 'Houston' })] }));
  assert.match(none.result, /^No current listings match/);
  const down = results(run('Match Listings', [{ error: { message: 'x' } }], { 'Parse Vapi Request': [parsed('search_listings', {})] }));
  assert.match(down.result, /unavailable/);
});

test('availability: skips busy times, buffers, and the next two hours', () => {
  const req = parsed('check_availability', { date: '2026-10-06' }); // today, now 11:00
  const events = [
    { status: 'confirmed', start: { dateTime: '2026-10-06T14:00:00-05:00' }, end: { dateTime: '2026-10-06T15:00:00-05:00' } },
    { status: 'confirmed', transparency: 'transparent', start: { dateTime: '2026-10-06T16:00:00-05:00' }, end: { dateTime: '2026-10-06T17:00:00-05:00' } },
  ];
  const r = results(run('Find Free Slots', events, { 'Parse Vapi Request': [req] })).result;
  const times = [...r.matchAll(/start_time ([^)]+)\)/g)].map((m) => DateTime.fromISO(m[1]).setZone(TZ).toFormat('HH:mm'));
  assert.ok(times.length > 0);
  for (const t of times) {
    assert.ok(t >= '13:00', `${t} is inside the 2h lead time`);
    assert.ok(!(t > '13:15' && t < '15:15'), `${t} clashes with the 14:00 meeting (+15 min buffer)`);
    assert.ok(t <= '17:30');
  }

  const allDay = results(run('Find Free Slots', [{ start: { date: '2026-10-08' }, end: { date: '2026-10-09' } }], { 'Parse Vapi Request': [parsed('check_availability', { date: '2026-10-08' })] }));
  assert.match(allDay.result, /^No showing times are open on Thursday, October 8/);
  const broken = results(run('Find Free Slots', [{ error: { message: '401' } }], { 'Parse Vapi Request': [parsed('check_availability', { date: '2026-10-08' })] }));
  assert.match(broken.result, /calendar is unavailable/);
  const bad = results(run('Find Free Slots', [{}], { 'Parse Vapi Request': [parsed('check_availability', { date: 'next tuesday' })] }));
  assert.match(bad.result, /could not be read/);
  const past = results(run('Find Free Slots', [{}], { 'Parse Vapi Request': [parsed('check_availability', { date: '2026-10-01' })] }));
  assert.match(past.result, /in the past/);
});

test('booking: valid slot becomes a calendar event; bad ones explain why', () => {
  const ok = (args) => run('Prepare Booking', [{}], { 'Parse Vapi Request': [parsed('book_showing', args)] })[0].json;
  const b = ok({ start_time: '2026-10-07T14:30:00-05:00', property_address: '1407 Maple Bend Dr', name: 'Ana Diaz', email: 'ana@mail.com' });
  assert.equal(b.ok, true);
  assert.equal(b.end, '2026-10-07T15:00:00.000-05:00');
  assert.equal(b.summary, 'Showing: 1407 Maple Bend Dr with Ana Diaz');
  assert.match(b.description, /Phone: \+15125550199/);
  assert.equal(b.spokenTime, 'Wednesday, October 7 at 2:30 PM');

  // A time without an offset is read in the agent's timezone.
  assert.equal(ok({ start_time: '2026-10-07T10:00', property_address: 'x', name: 'A' }).start, '2026-10-07T10:00:00.000-05:00');

  const why = (args) => ok(args).response.results[0].result;
  assert.match(why({ start_time: '2026-10-07T17:45:00-05:00', property_address: 'x', name: 'A' }), /between 10:00 and 18:00/);
  assert.match(why({ start_time: '2026-10-05T12:00:00-05:00', property_address: 'x', name: 'A' }), /already passed/);
  assert.match(why({ start_time: 'tomorrow', property_address: 'x', name: 'A' }), /No valid start_time/);
  assert.match(why({ start_time: '2026-10-07T14:30:00-05:00', name: 'A' }), /Which property/);

  const done = results(run('Booking Reply', [{ id: 'evt_1' }], { 'Prepare Booking': [b] }));
  assert.match(done.result, /^Booked\. .*Wednesday, October 7 at 2:30 PM/);
  const failed = results(run('Booking Reply', [{ error: { message: 'x' } }], { 'Prepare Booking': [b] }));
  assert.match(failed.result, /did not accept/);
});

test('fallback reply answers unknown tools and ignores other messages', () => {
  const unknown = run('Fallback Reply', [{ route: 'get_weather', toolCallId: 'tc_2' }])[0].json.response.results[0];
  assert.equal(unknown.toolCallId, 'tc_2');
  assert.deepEqual(run('Fallback Reply', [{ route: 'ignore' }])[0].json.response, {});
});

test('end-of-call report: lead row, hot flag, agent email', () => {
  const report = (structuredData, extra = {}) => ({
    route: 'end-of-call-report',
    callerPhone: '+15125550199',
    report: {
      type: 'end-of-call-report',
      endedReason: 'customer-ended-call',
      endedAt: '2026-10-06T16:10:00.000Z',
      call: { type: 'inboundPhoneCall' },
      analysis: { summary: 'Wants a 3 bed in Mueller.', structuredData },
      artifact: { recordingUrl: 'https://rec/1.wav', transcript: 'AI: Hi' },
      ...extra,
    },
  });

  const hot = run('Call Report', [
    report({ name: 'Ana Diaz', email: 'ANA@mail.com', intent: 'buy', areas: ['Mueller', 'Zilker'], budget_max: 500000, pre_approved: true, has_agent: false, lead_score: 8, showing_booked: true, showing_time: 'Wed 2:30 PM', property_interest: '1407 Maple Bend Dr' }),
  ])[0].json;
  assert.equal(hot.hot, true);
  assert.equal(hot.row.status, 'showing booked');
  assert.equal(hot.row.areas, 'Mueller, Zilker');
  assert.equal(hot.row.pre_approved, 'yes');
  assert.equal(hot.row.has_agent, 'no');
  assert.equal(hot.row.email, 'ana@mail.com');
  assert.equal(hot.row.last_call_direction, 'inbound');
  assert.equal(hot.row.last_call_at, '2026-10-06T11:10:00.000-05:00');
  assert.equal(hot.subject, 'Showing booked: Ana Diaz (buy)');
  assert.match(hot.text, /Showing: Wed 2:30 PM at 1407 Maple Bend Dr/);
  assert.match(hot.text, /Recording: https:\/\/rec\/1\.wav/);
  assert.doesNotMatch(hot.text, /\n\n\n/);

  const seller = run('Call Report', [report({ intent: 'sell', lead_score: 5 })])[0].json;
  assert.equal(seller.hot, true);
  const cold = run('Call Report', [report({ intent: 'buy', lead_score: 3 })])[0].json;
  assert.equal(cold.hot, false);
  assert.equal(cold.row.status, 'nurture');
  const dnc = run('Call Report', [report({ intent: 'sell', lead_score: 9, do_not_call: true })])[0].json;
  assert.equal(dnc.hot, false);
  assert.equal(dnc.row.status, 'do not call');

  const rows = run('Report Row', [{ row: { phone: '' } }, { row: hot.row }]);
  assert.equal(rows.length, 1);
});
