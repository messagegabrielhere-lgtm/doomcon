// check_availability: find open showing slots on the requested day from the
// agent's Google Calendar events, and offer a few spread across the day.
const CFG = {
  tz: '__TIMEZONE__',
  openHour: Number('__SHOWING_START_HOUR__'),
  closeHour: Number('__SHOWING_END_HOUR__'),
  slotMinutes: Number('__SHOWING_MINUTES__'),
  bufferMinutes: 15,
  minLeadHours: 2,
  maxOffers: 4,
};

const req = $('Parse Vapi Request').first().json;
const reply = (result) => [{ json: { response: { results: [{ toolCallId: req.toolCallId, result }] } } }];

if (!req.dateValid) {
  return reply('That date could not be read. Ask the caller which day works, then call check_availability with date as YYYY-MM-DD.');
}

const day = DateTime.fromISO(req.timeMin, { zone: CFG.tz });
const now = DateTime.now().setZone(CFG.tz);
if (day.endOf('day') < now) return reply('That day is in the past. Ask for a day from today onward.');

// A failed calendar read must not look like an empty (fully free) day.
if ($input.all().some((i) => i.json && i.json.error)) {
  return reply('The calendar is unavailable right now. Take the day and time they prefer and tell them the agent will call to confirm.');
}

// Busy blocks from the calendar. An all-day event blocks the whole day,
// unless it is marked "free" (transparent), e.g. a birthday reminder.
const busy = [];
for (const { json: ev } of $input.all()) {
  if (!ev || !ev.start || ev.status === 'cancelled' || ev.transparency === 'transparent') continue;
  if (ev.start.date && !ev.start.dateTime) {
    busy.push([day.startOf('day'), day.endOf('day')]);
    continue;
  }
  const s = DateTime.fromISO(ev.start.dateTime).setZone(CFG.tz);
  const e = DateTime.fromISO(ev.end && ev.end.dateTime ? ev.end.dateTime : ev.start.dateTime).setZone(CFG.tz);
  busy.push([s.minus({ minutes: CFG.bufferMinutes }), e.plus({ minutes: CFG.bufferMinutes })]);
}

const earliest = now.plus({ hours: CFG.minLeadHours });
const free = [];
let t = day.set({ hour: CFG.openHour, minute: 0, second: 0, millisecond: 0 });
const close = day.set({ hour: CFG.closeHour, minute: 0, second: 0, millisecond: 0 });
while (t.plus({ minutes: CFG.slotMinutes }) <= close) {
  const end = t.plus({ minutes: CFG.slotMinutes });
  const clash = busy.some(([bs, be]) => t < be && end > bs);
  if (!clash && t >= earliest) free.push(t);
  t = t.plus({ minutes: 30 });
}

if (!free.length) {
  return reply(`No showing times are open on ${day.toFormat('cccc, LLLL d')}. Offer to check another day.`);
}

// Spread the offers across the day instead of listing back-to-back half hours.
const step = Math.max(1, Math.floor(free.length / CFG.maxOffers));
const offers = free.filter((_, i) => i % step === 0).slice(0, CFG.maxOffers);
const spoken = offers.map((s) => `${s.toFormat('h:mm a')} (start_time ${s.toISO({ suppressMilliseconds: true })})`);

return reply(
  `Open showing times on ${day.toFormat('cccc, LLLL d')}: ${spoken.join('; ')}. ` +
    'Offer two or three of these; when they pick one, call book_showing with that start_time.'
);
