// search_listings: match the caller's criteria against the Listings sheet and
// hand back up to three homes, written to be read aloud.
const MAX_RESULTS = 3;
const req = $('Parse Vapi Request').first().json;
const a = req.args || {};

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const low = (v) => String(v ?? '').trim().toLowerCase();
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

const area = low(a.area || a.location || a.city);
const maxPrice = num(a.max_price);
const minPrice = num(a.min_price);
const minBeds = num(a.min_beds);
const type = low(a.property_type);

const rows = $input
  .all()
  .map((i) => i.json)
  .filter((r) => r && (r.address || r.id));

let matches = rows.filter((r) => {
  const status = low(r.status || 'active');
  if (status && status !== 'active' && status !== 'coming soon') return false;
  const price = num(r.price);
  if (maxPrice && price && price > maxPrice * 1.05) return false;
  if (minPrice && price && price < minPrice * 0.95) return false;
  if (minBeds && num(r.beds) !== null && num(r.beds) < minBeds) return false;
  if (type && r.type && !low(r.type).includes(type) && !type.includes(low(r.type))) return false;
  if (area) {
    const hay = [r.city, r.neighborhood, r.zip, r.address].map(low).join(' ');
    if (!area.split(/[,/]| or /).some((part) => part.trim() && hay.includes(part.trim()))) return false;
  }
  return true;
});

// Closest to the top of their budget first: that is usually what people want to see.
const gap = (r) => (num(r.price) === null ? Infinity : Math.abs(maxPrice - num(r.price)));
if (maxPrice) matches.sort((x, y) => gap(x) - gap(y));
matches = matches.slice(0, MAX_RESULTS);

let result;
if (!rows.length) {
  result = 'The listings list is unavailable right now. Take their criteria and tell them the agent will send matching homes today.';
} else if (!matches.length) {
  result =
    'No current listings match those criteria. Ask if they would flex on area, price or bedrooms, ' +
    'or offer to have the agent send new listings as they come on the market.';
} else {
  const lines = matches.map((r, i) => {
    const bits = [
      r.beds && `${r.beds} bed`,
      r.baths && `${r.baths} bath`,
      r.type && String(r.type).toLowerCase(),
    ].filter(Boolean);
    const where = [r.address, r.neighborhood || r.city].filter(Boolean).join(' in ');
    const price = num(r.price) ? `, listed at ${money(num(r.price))}` : '';
    const sqft = num(r.sqft) ? `, about ${Math.round(num(r.sqft)).toLocaleString('en-US')} square feet` : '';
    const hl = r.highlights ? `. Highlights: ${r.highlights}` : '';
    return `Option ${i + 1} (property_id ${r.id || 'n/a'}): ${bits.join(', ')} at ${where}${price}${sqft}${hl}.`;
  });
  result = `Found ${matches.length} matching listing${matches.length > 1 ? 's' : ''}. ${lines.join(' ')}`;
}

return [{ json: { response: { results: [{ toolCallId: req.toolCallId, result }] } } }];
