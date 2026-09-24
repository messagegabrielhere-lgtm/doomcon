const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
];
// bbox form: CONUS + AK + HI covered by three boxes, but start with one CONUS box.
const Q = `[out:json][timeout:300];
(
  nwr["telecom"="data_center"](24.0,-125.0,49.6,-66.5);
);
out tags center qt;`;
for (const ep of ENDPOINTS) {
  const t0=Date.now();
  try {
    const res = await fetch(ep, {method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon; datacentre map)'},body:new URLSearchParams({data:Q}),signal:AbortSignal.timeout(300000)});
    const txt = await res.text();
    let n = null;
    try { n = JSON.parse(txt).elements.length; } catch {}
    console.log(ep, 'status', res.status, 'ms', Date.now()-t0, 'bytes', txt.length, 'elements', n);
    if (n) { globalThis.__good = {ep, txt}; break; }
    else console.log('  head:', txt.replace(/\s+/g,' ').slice(0,300));
  } catch(e) { console.log(ep, 'ERR', e.name, e.message.slice(0,140), 'ms', Date.now()-t0); }
}
if (globalThis.__good) {
  const j = JSON.parse(globalThis.__good.txt);
  const tagKeys={};
  for (const e of j.elements) for (const k of Object.keys(e.tags||{})) tagKeys[k]=(tagKeys[k]||0)+1;
  console.log('TOP TAGS', JSON.stringify(Object.entries(tagKeys).sort((a,b)=>b[1]-a[1]).slice(0,50)));
  console.log('named', j.elements.filter(e=>e.tags?.name).length);
  console.log('operator', j.elements.filter(e=>e.tags?.operator).length);
  const fs = await import('node:fs');
  fs.writeFileSync('.tmp-dc/osm-raw.json', globalThis.__good.txt);
  console.log('SAVED');
}
