// City CAD adapters for dispatch/collect.mjs.
// Privacy: never return street addresses. Coordinates are rounded by the caller.

function clean(s) {
  if (s == null) return null;
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t || null;
}

// Two decimals (about 1 km): enough to map a call to its neighbourhood, never
// to a doorstep. These are people's medical and police emergencies.
function round3(n) { return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN; }

const SENSITIVE_TYPE = /\b(REDACTED|SEXUAL|RAPE|CHILD\s*-\s*ABANDONED|CHILD\s*ABUSE|SUICID|OVERDOSE|MENTAL)\b/i;

const AUSTIN_SECTOR = {
  Adam: [-97.743, 30.333], Baker: [-97.720, 30.270], Charlie: [-97.690, 30.300],
  David: [-97.760, 30.250], Edward: [-97.800, 30.220], Frank: [-97.700, 30.200],
  George: [-97.850, 30.280], Henry: [-97.670, 30.350], Ida: [-97.780, 30.360],
};
const LA_AREA = {
  Central: [-118.246, 34.052], 'Rampart': [-118.280, 34.065], 'Southwest': [-118.300, 34.015],
  Hollenbeck: [-118.210, 34.045], Harbor: [-118.280, 33.750], Hollywood: [-118.330, 34.100],
  Wilshire: [-118.340, 34.062], 'West LA': [-118.445, 34.050], 'Van Nuys': [-118.450, 34.186],
  'West Valley': [-118.540, 34.200], Northeast: [-118.230, 34.100], '77th Street': [-118.290, 33.975],
  Newton: [-118.250, 34.015], Pacific: [-118.440, 33.980], 'N Hollywood': [-118.380, 34.170],
  Foothill: [-118.400, 34.260], Devonshire: [-118.530, 34.260], Southeast: [-118.260, 33.940],
  Mission: [-118.450, 34.230], Olympic: [-118.300, 34.050], Topanga: [-118.600, 34.190],
};
const KC_DIV = {
  CPD: [-94.578, 39.100], EPD: [-94.520, 39.100], MPD: [-94.560, 39.050],
  SPD: [-94.580, 38.980], NPD: [-94.570, 39.180],
};
const DALLAS_DIV = {
  Central: [-96.797, 32.780], 'North Central': [-96.780, 32.900],
  Northeast: [-96.700, 32.860], Northwest: [-96.900, 32.900],
  'South Central': [-96.800, 32.720], Southeast: [-96.700, 32.720],
  Southwest: [-96.900, 32.700],
};

/** A call pin inside the lower 48 / Alaska / Hawaii, not a null-island placeholder. */
export function plausibleUS(lon, lat) {
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= -60 && lat >= 17 && lat <= 72;
}

function pushCall(calls, blather, row) {
  if (!row || !row.type || !Number.isFinite(row.t)) return;
  if (SENSITIVE_TYPE.test(row.type)) return;
  // Some portals ship 0,0 or -1,-1 for "no location": drop those pins.
  if (!plausibleUS(row.lon, row.lat)) return;
  calls.push(row);
  blather.push({ t: row.t, city: row.city, agency: row.agency, text: row.type });
}

/** @type {Array<{id:string,label:string,city:string,agency:string,url:string,map:Function}>} */
export const CITIES = [
  {
    id: 'seattle',
    label: 'Seattle Fire/EMS',
    city: 'Seattle',
    agency: 'Fire/EMS',
    url: 'https://data.seattle.gov/resource/kzjm-xkqj.json?$limit=200&$order=datetime%20DESC',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.datetime);
        const lon = round3(+r.longitude), lat = round3(+r.latitude);
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        pushCall(calls, blather, {
          id: `sea:${r.incident_number || `${t}:${lon},${lat}`}`,
          city: 'Seattle', agency: 'Fire/EMS', type: clean(r.type), t, lon, lat,
          district: null, priority: null,
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'seattle-spd',
    label: 'Seattle Police',
    city: 'Seattle',
    agency: 'Police',
    url: 'https://data.seattle.gov/resource/33kz-ixgy.json?$limit=200&$order=cad_event_original_time_queued%20DESC'
      + '&$select=cad_event_number,initial_call_type,final_call_type,priority,cad_event_original_time_queued,dispatch_latitude,dispatch_longitude,dispatch_precinct,dispatch_neighborhood',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.cad_event_original_time_queued);
        const lon = round3(+r.dispatch_longitude), lat = round3(+r.dispatch_latitude);
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        pushCall(calls, blather, {
          id: `spd:${r.cad_event_number || `${t}:${lon},${lat}`}`,
          city: 'Seattle', agency: 'Police',
          type: clean(r.final_call_type || r.initial_call_type), t, lon, lat,
          district: clean(r.dispatch_precinct || r.dispatch_neighborhood),
          priority: clean(r.priority),
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'sf',
    label: 'San Francisco CAD',
    city: 'San Francisco',
    agency: 'Police',
    url: 'https://data.sf.gov/resource/gnap-fj3t.json?$limit=200&$order=received_datetime%20DESC'
      + '&$where=intersection_point%20IS%20NOT%20NULL%20AND%20sensitive_call=false'
      + '&$select=cad_number,call_type_final_desc,agency,priority_final,received_datetime,intersection_point,police_district,sensitive_call',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        if (r.sensitive_call === true || r.sensitive_call === 'true') continue;
        const t = Date.parse(r.received_datetime);
        const coords = r.intersection_point?.coordinates;
        const lon = round3(+coords?.[0]), lat = round3(+coords?.[1]);
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        pushCall(calls, blather, {
          id: `sf:${r.cad_number || `${t}:${lon},${lat}`}`,
          city: 'San Francisco', agency: clean(r.agency) || 'Police',
          type: clean(r.call_type_final_desc), t, lon, lat,
          district: clean(r.police_district), priority: clean(r.priority_final),
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'montgomery',
    label: 'Montgomery County MD',
    city: 'Montgomery Co.',
    agency: 'Police',
    url: 'https://data.montgomerycountymd.gov/resource/98cc-bc7d.json?$limit=200&$order=start_time%20DESC',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.start_time);
        const lon = round3(+(r.longitude ?? r.geolocation?.coordinates?.[0]));
        const lat = round3(+(r.latitude ?? r.geolocation?.coordinates?.[1]));
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        pushCall(calls, blather, {
          id: `moco:${r.incident_id || `${t}:${lon},${lat}`}`,
          city: 'Montgomery Co.', agency: 'Police',
          type: clean(r.initial_type || r.close_type), t, lon, lat,
          district: clean(r.police_district_number), priority: clean(r.priority),
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'dallas',
    label: 'Dallas Police',
    city: 'Dallas',
    agency: 'Police',
    url: 'https://www.dallasopendata.com/resource/9fxf-t2tr.json?$limit=200',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const day = (r.date || '').slice(0, 10);
        const t = Date.parse(`${day}T${r.time || '12:00:00'}`);
        const type = clean(r.nature_of_call);
        if (!type || !Number.isFinite(t)) continue;
        const div = clean(r.division) || 'Central';
        const c = DALLAS_DIV[div] || DALLAS_DIV.Central;
        pushCall(calls, blather, {
          id: `dal:${r.incident_number || `${t}:${type}:${div}`}`,
          city: 'Dallas', agency: 'Police', type, t,
          lon: c[0], lat: c[1], district: div, priority: clean(r.priority), approx: true,
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'nyc',
    label: 'NYPD CAD',
    city: 'New York',
    agency: 'Police',
    url: 'https://data.cityofnewyork.us/resource/n2zq-pubd.json?$limit=200&$order=create_date%20DESC'
      + '&$where=latitude%20IS%20NOT%20NULL',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const day = (r.incident_date || r.create_date || '').slice(0, 10);
        const t = Date.parse(`${day}T${r.incident_time || '12:00:00'}`);
        const lon = round3(+r.longitude), lat = round3(+r.latitude);
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        pushCall(calls, blather, {
          id: `nyc:${r.cad_evnt_id || `${t}:${lon},${lat}`}`,
          city: 'New York', agency: 'Police',
          type: clean(r.typ_desc), t, lon, lat,
          district: clean(r.boro_nm), priority: null,
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'austin',
    label: 'Austin Police',
    city: 'Austin',
    agency: 'Police',
    url: 'https://data.austintexas.gov/resource/22de-7rzg.json?$limit=200&$order=response_datetime%20DESC',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.response_datetime);
        const sector = clean(r.sector) || 'David';
        const c = AUSTIN_SECTOR[sector] || AUSTIN_SECTOR.David;
        const type = clean(r.final_problem_description || r.initial_problem_description);
        if (!type || !Number.isFinite(t)) continue;
        pushCall(calls, blather, {
          id: `aus:${r.incident_number || `${t}:${type}:${sector}`}`,
          city: 'Austin', agency: 'Police', type, t,
          lon: c[0], lat: c[1], district: sector,
          priority: clean(r.priority_level), approx: true,
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'la',
    label: 'LAPD Calls',
    city: 'Los Angeles',
    agency: 'Police',
    url: 'https://data.lacity.org/resource/xjgu-z4ju.json?$limit=200&$order=dispatch_date%20DESC',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const day = (r.dispatch_date || '').slice(0, 10);
        const t = Date.parse(`${day}T${r.dispatch_time || '12:00:00'}`);
        const area = clean(r.area_occ) || 'Central';
        const c = LA_AREA[area] || LA_AREA.Central;
        const type = clean(r.call_type_text);
        if (!type || !Number.isFinite(t)) continue;
        pushCall(calls, blather, {
          id: `la:${r.incident_number || `${t}:${type}:${area}`}`,
          city: 'Los Angeles', agency: 'Police', type, t,
          lon: c[0], lat: c[1], district: area, priority: null, approx: true,
        });
      }
      return { calls, blather };
    },
  },
  {
    id: 'kcmo',
    label: 'Kansas City 911',
    city: 'Kansas City',
    agency: 'Police',
    // location is an address — never copied into the published row
    url: 'https://data.kcmo.org/resource/4cef-rqti.json?$limit=200&$order=incident_date%20DESC'
      + '&$select=incident_number,incident_date,type_description,subtype,priority,division,beat',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.incident_date);
        const div = clean(r.division) || 'CPD';
        const c = KC_DIV[div] || KC_DIV.CPD;
        const type = clean([r.type_description, r.subtype].filter(Boolean).join(' · '));
        if (!type || !Number.isFinite(t)) continue;
        pushCall(calls, blather, {
          id: `kc:${r.incident_number || `${t}:${type}:${div}`}`,
          city: 'Kansas City', agency: 'Police', type, t,
          lon: c[0], lat: c[1], district: div, priority: clean(r.priority), approx: true,
        });
      }
      return { calls, blather };
    },
  },
];
