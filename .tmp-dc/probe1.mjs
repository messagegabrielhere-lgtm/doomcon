const Q = `[out:json][timeout:180];
area["ISO3166-1"="US"]["admin_level"="2"]->.us;
(
  nwr["telecom"="data_center"](area.us);
);
out tags center qt;`;
const t0=Date.now();
const res = await fetch('https://overpass-api.de/api/interpreter', {
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon; datacentre map)'},
  body: new URLSearchParams({data:Q}),
  signal: AbortSignal.timeout(240000),
});
console.log('status', res.status, 'ms', Date.now()-t0);
const txt = await res.text();
console.log('bytes', txt.length);
try {
  const j = JSON.parse(txt);
  console.log('elements', j.elements.length);
  const withName = j.elements.filter(e=>e.tags?.name).length;
  const withOp = j.elements.filter(e=>e.tags?.operator).length;
  console.log('named', withName, 'operator', withOp);
  const tagKeys = {};
  for (const e of j.elements) for (const k of Object.keys(e.tags||{})) tagKeys[k]=(tagKeys[k]||0)+1;
  console.log(Object.entries(tagKeys).sort((a,b)=>b[1]-a[1]).slice(0,45));
  console.log(JSON.stringify(j.elements.slice(0,3),null,1));
} catch(e){ console.log('parse fail', txt.slice(0,600)); }
