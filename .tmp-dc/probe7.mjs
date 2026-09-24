const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon; datacentre map)';
const BB='15.0,-180.0,72.0,-64.0'; // whole US envelope incl AK+HI (crosses nothing; AK west of -180 excluded)
const variants=[
 ['telecom','data_center'],['building','data_center'],['landuse','data_center'],
 ['construction','data_center'],['proposed:building','data_center'],
 ['telecom','data_centre'],['building','data_centre'],
 ['construction:telecom','data_center'],['proposed:telecom','data_center'],
 ['man_made','data_center'],['amenity','data_center'],
];
for (const [k,v] of variants){
  const Q=`[out:json][timeout:120];nwr["${k}"="${v}"](${BB});out count;`;
  const t0=Date.now();
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':UA},body:new URLSearchParams({data:Q}),signal:AbortSignal.timeout(150000)});
    const t=await r.text(); let n='?';
    try{ n=JSON.stringify(JSON.parse(t).elements?.[0]?.tags); }catch{ n=t.replace(/\s+/g,' ').slice(0,120); }
    console.log(`${k}=${v}`.padEnd(34), r.status, `${Date.now()-t0}ms`, n);
  }catch(e){console.log(`${k}=${v}`, 'ERR', e.name, e.message.slice(0,100));}
  await new Promise(r=>setTimeout(r,1500));
}
