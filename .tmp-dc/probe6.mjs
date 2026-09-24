const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
const BASE='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer';
for (const off of ['0.005','0.02']) {
  const qs=new URLSearchParams({where:'1=1',outFields:'GEOID,NAME,STATE',returnGeometry:'true',geometryPrecision:'4',maxAllowableOffset:off,outSR:'4326',f:'geojson',resultRecordCount:'400',resultOffset:'0'});
  const t0=Date.now();
  const r=await fetch(`${BASE}/13/query?${qs}`,{headers:{'user-agent':UA},signal:AbortSignal.timeout(180000)});
  const t=await r.text(); let j=null; try{j=JSON.parse(t);}catch{}
  console.log('offset',off,r.status,`${Date.now()-t0}ms`,`${(t.length/1e6).toFixed(3)}MB`,'features',j?.features?.length);
  if(j?.features?.[0]) console.log('  ringpts',JSON.stringify(j.features[0].geometry.coordinates).length, j.features[0].properties.NAME);
}
