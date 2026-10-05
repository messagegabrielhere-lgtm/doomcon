// Everything Vapi sends to the server URL lands here. Flatten it into one item
// the Switch can route on: a tool call (search / availability / booking) or the
// end-of-call report.
const CFG = { tz: '__TIMEZONE__' };

const body = $input.first().json.body || {};
const msg = body.message || {};
const call = msg.call || {};
const callerPhone = (call.customer && call.customer.number) || '';

if (msg.type === 'tool-calls') {
  const list = msg.toolCallList || (msg.toolWithToolCallList || []).map((t) => t.toolCall) || [];
  const tc = list[0] || {};
  const fn = tc.function || {};
  let args = fn.arguments || {};
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (e) {
      args = {};
    }
  }

  const out = {
    route: fn.name || 'unknown',
    toolCallId: tc.id || '',
    args,
    callerPhone,
    callId: call.id || '',
    extraToolCalls: Math.max(0, list.length - 1),
  };

  // The calendar lookup needs a day window in the agent's timezone.
  if (out.route === 'check_availability') {
    const day = DateTime.fromISO(String(args.date || ''), { zone: CFG.tz });
    out.dateValid = day.isValid;
    if (day.isValid) {
      out.timeMin = day.startOf('day').toISO();
      out.timeMax = day.endOf('day').toISO();
    }
  }

  return [{ json: out }];
}

if (msg.type === 'end-of-call-report') {
  return [{ json: { route: 'end-of-call-report', report: msg, callerPhone } }];
}

return [{ json: { route: 'ignore', type: msg.type || '' } }];
