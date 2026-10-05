// Morning run: dial the leads that came in overnight (status "queued").
// Rows come straight from the Leads sheet.
const MAX_PER_RUN = 25;

return $input
  .all()
  .map((i) => i.json)
  .filter((r) => r && r.phone && String(r.status || '').trim().toLowerCase() === 'queued')
  .slice(0, MAX_PER_RUN)
  .map((r) => ({
    json: {
      lead: {
        // Sheets can turn "+15551234567" into the number 15551234567.
        phone: '+' + String(r.phone).replace(/\D/g, ''),
        name: r.name || '',
        email: r.email || '',
        source: r.source || '',
        interest: r.interest || '',
      },
      firstName: String(r.name || '').split(' ')[0],
    },
  }));
