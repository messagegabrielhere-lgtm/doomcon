// book_showing: validate the requested time and build the calendar event.
// Anything wrong goes straight back to the assistant as a sentence it can act on.
const CFG = {
  tz: '__TIMEZONE__',
  openHour: Number('__SHOWING_START_HOUR__'),
  closeHour: Number('__SHOWING_END_HOUR__'),
  slotMinutes: Number('__SHOWING_MINUTES__'),
};

const req = $('Parse Vapi Request').first().json;
const a = req.args || {};
const fail = (result) => [{ json: { ok: false, response: { results: [{ toolCallId: req.toolCallId, result }] } } }];

const start = DateTime.fromISO(String(a.start_time || ''), { zone: CFG.tz }).setZone(CFG.tz);
if (!start.isValid) {
  return fail('No valid start_time was given. Call check_availability first and use one of the start_time values it returns.');
}
const end = start.plus({ minutes: CFG.slotMinutes });
const now = DateTime.now().setZone(CFG.tz);
if (start < now) return fail('That time has already passed. Offer a later time.');
const closeAt = start.set({ hour: CFG.closeHour, minute: 0, second: 0, millisecond: 0 });
if (start.hour < CFG.openHour || end > closeAt) {
  return fail(`Showings run between ${CFG.openHour}:00 and ${CFG.closeHour}:00. Offer a time in that window.`);
}

const name = String(a.name || '').trim() || 'Caller';
const phone = String(a.phone || req.callerPhone || '').trim();
const email = String(a.email || '').trim();
const property = String(a.property_address || a.property_id || '').trim();
if (!property) return fail('Which property is the showing for? Ask, then call book_showing again with property_address.');

return [
  {
    json: {
      ok: true,
      toolCallId: req.toolCallId,
      start: start.toISO(),
      end: end.toISO(),
      summary: `Showing: ${property} with ${name}`,
      location: property,
      description: [
        `Booked by the voice assistant.`,
        `Buyer: ${name}`,
        phone && `Phone: ${phone}`,
        email && `Email: ${email}`,
        a.property_id && `Listing id: ${a.property_id}`,
        a.notes && `Notes: ${a.notes}`,
        req.callId && `Vapi call: ${req.callId}`,
      ]
        .filter(Boolean)
        .join('\n'),
      spokenTime: start.toFormat("cccc, LLLL d 'at' h:mm a"),
      property,
    },
  },
];
