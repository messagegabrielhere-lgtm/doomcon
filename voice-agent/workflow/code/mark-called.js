// After asking Vapi to dial: record the outcome against the lead's row.
const built = $('Build Vapi Call').all();

return $input.all().map((item, i) => {
  const paired = Array.isArray(item.pairedItem) ? item.pairedItem[0] : item.pairedItem;
  const idx = paired && typeof paired.item === 'number' ? paired.item : i;
  const lead = (built[idx] && built[idx].json.lead) || {};
  const res = item.json || {};
  const failed = res.error || !res.id;
  // n8n reports node errors as a string or as { message, description }.
  const err = typeof res.error === 'string' ? res.error : res.error && (res.error.message || res.error.description);
  const why = failed ? String(err || res.message || 'no call id returned').slice(0, 200) : '';
  return {
    json: {
      phone: lead.phone,
      status: failed ? `call failed: ${why}` : 'called',
      vapi_call_id: res.id || '',
      last_call_at: DateTime.now().toISO(),
    },
  };
});
