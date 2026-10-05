// The calendar event exists: tell the assistant so it can confirm out loud.
const b = $('Prepare Booking').first().json;
const created = $input.first().json || {};
const result = created.id
  ? `Booked. The showing at ${b.property} is confirmed for ${b.spokenTime}. ` +
    'Confirm the time back to the caller and let them know the agent will meet them there.'
  : 'The calendar did not accept the booking. Apologise, keep the time they asked for, and tell them the agent will call to confirm.';
return [{ json: { response: { results: [{ toolCallId: b.toolCallId, result }] } } }];
