// End of call: turn Vapi's report (summary + structured data extracted by the
// analysis plan) into a lead row, and decide whether the agent gets pinged now.
const CFG = { tz: '__TIMEZONE__', hotScore: Number('__HOT_LEAD_SCORE__') };

const { report: r = {}, callerPhone = '' } = $input.first().json;
const analysis = r.analysis || {};
const sd = analysis.structuredData || {};
const artifact = r.artifact || {};
const call = r.call || {};

const yesNo = (v) => (v === true ? 'yes' : v === false ? 'no' : '');
const listish = (v) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));
const score = Number(sd.lead_score) || 0;

const row = {
  phone: callerPhone,
  name: sd.name || (call.customer && call.customer.name) || '',
  email: String(sd.email || '').toLowerCase(),
  status: sd.do_not_call ? 'do not call' : sd.showing_booked ? 'showing booked' : score >= CFG.hotScore ? 'hot' : 'nurture',
  intent: sd.intent || '',
  timeline: sd.timeline || '',
  areas: listish(sd.areas),
  budget_max: sd.budget_max || '',
  bedrooms: sd.bedrooms || '',
  pre_approved: yesNo(sd.pre_approved),
  has_agent: yesNo(sd.has_agent),
  lead_score: score || '',
  showing_time: sd.showing_time || '',
  property_interest: sd.property_interest || '',
  next_step: sd.next_step || '',
  summary: analysis.summary || '',
  recording_url: artifact.recordingUrl || r.recordingUrl || '',
  last_call_at: DateTime.fromISO(r.endedAt || '', { zone: CFG.tz }).isValid
    ? DateTime.fromISO(r.endedAt).setZone(CFG.tz).toISO()
    : DateTime.now().setZone(CFG.tz).toISO(),
  last_call_direction: call.type === 'outboundPhoneCall' ? 'outbound' : call.type === 'inboundPhoneCall' ? 'inbound' : call.type || '',
  ended_reason: r.endedReason || '',
};

// Seller leads are rare and valuable; a booked showing needs a human to confirm.
const hot = !sd.do_not_call && (Boolean(sd.showing_booked) || score >= CFG.hotScore || ['sell', 'both'].includes(sd.intent));

const who = row.name || row.phone || 'Unknown caller';
const subject = `${sd.showing_booked ? 'Showing booked' : 'Hot lead'}: ${who}${row.intent ? ` (${row.intent})` : ''}`;
const text = [
  `${who} just spoke with your voice assistant.\n`,
  `Phone: ${row.phone || 'unknown'}`,
  row.email && `Email: ${row.email}`,
  row.intent && `Intent: ${row.intent}`,
  row.timeline && `Timeline: ${row.timeline}`,
  row.areas && `Areas: ${row.areas}`,
  row.budget_max && `Budget up to: ${row.budget_max}`,
  row.bedrooms && `Bedrooms: ${row.bedrooms}`,
  row.pre_approved && `Pre-approved: ${row.pre_approved}`,
  row.has_agent && `Already has an agent: ${row.has_agent}`,
  row.showing_time && `Showing: ${row.showing_time}${row.property_interest ? ` at ${row.property_interest}` : ''}`,
  `Lead score: ${score || 'n/a'}/10`,
  row.next_step && `Next step: ${row.next_step}`,
  `\nSummary:\n${row.summary || '(none)'}`,
  row.recording_url && `\nRecording: ${row.recording_url}`,
]
  .filter(Boolean)
  .join('\n');

return [{ json: { row, hot: hot && Boolean(row.phone), subject, text, transcript: artifact.transcript || r.transcript || '' } }];
