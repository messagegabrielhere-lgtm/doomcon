// Speed-to-lead: turn whatever a lead form posts into one clean lead row,
// and decide whether we may call right now (quiet hours) or must queue it.
const CFG = {
  tz: '__TIMEZONE__',
  callFrom: Number('__CALL_WINDOW_START__'),
  callUntil: Number('__CALL_WINDOW_END__'),
  country: '__DEFAULT_COUNTRY_CODE__',
};

function e164(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  const digits = s.replace(/\D/g, '');
  if (!digits) return '';
  if (s.startsWith('+')) return '+' + digits;
  if (CFG.country === '1' && digits.length === 10) return '+1' + digits;
  if (CFG.country === '1' && digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + CFG.country + digits.replace(/^0+/, '');
}

const pick = (o, keys) => {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const now = DateTime.now().setZone(CFG.tz);
const out = [];

for (const item of $input.all()) {
  const b = item.json.body && typeof item.json.body === 'object' ? item.json.body : item.json;
  const first = pick(b, ['first_name', 'firstName', 'fname']);
  const last = pick(b, ['last_name', 'lastName', 'lname']);
  const name = pick(b, ['name', 'full_name', 'fullName']) || [first, last].filter(Boolean).join(' ');
  const phone = e164(pick(b, ['phone', 'phone_number', 'phoneNumber', 'mobile', 'tel']));

  if (!phone) {
    out.push({ json: { ok: false, reason: 'no usable phone number', received: b } });
    continue;
  }

  const consent = pick(b, ['consent', 'tcpa_consent', 'sms_consent']).toLowerCase();
  const consentGiven = consent === '' ? true : ['true', 'yes', '1', 'on', 'y'].includes(consent);
  const inWindow = now.hour >= CFG.callFrom && now.hour < CFG.callUntil;

  const lead = {
    phone,
    name,
    email: pick(b, ['email', 'email_address', 'emailAddress']).toLowerCase(),
    source: pick(b, ['source', 'lead_source', 'utm_source']) || 'web form',
    interest: pick(b, ['interest', 'property', 'property_address', 'listing', 'message', 'comments']),
    status: !consentGiven ? 'no consent - do not call' : inWindow ? 'calling' : 'queued',
    created_at: now.toISO(),
  };

  out.push({
    json: {
      ok: true,
      callNow: consentGiven && inWindow,
      lead,
      firstName: (first || name.split(' ')[0] || '').trim(),
    },
  });
}

return out;
