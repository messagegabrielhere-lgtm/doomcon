const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
const BASE='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer';
for (const layer of [11,13]) {
  const qs=new URLSearchParams({where:'1=1',outFields:'GEOID,NAME,STATE,BASENAME',returnGeometry:'true',geometryPrecision:'4',outSR:'4326',f:'geojson',resultRecordCount:'400',resultOffset:'0'});
  const t0=Date.now();
  const r=await fetch(`${BASE}/${layer}/query?${qs}`,{headers:{'user-agent':UA},signal:AbortSignal.timeout(180000)});
  const t=await r.text();
  let j=null; try{j=JSON.parse(t);}catch{}
  console.log('layer',layer,r.status,`${Date.now()-t0}ms`,`${(t.length/1e6).toFixed(2)}MB`,'features',j?.features?.length, 'exceeded', j?.properties?.exceededTransferLimit ?? j?.exceededTransferLimit);
  if(j?.features?.[0]) console.log('  props',JSON.stringify(j.features[0].properties),'ringpts',JSON.stringify(j.features[0].geometry.coordinates).length);
  if(!j) console.log('  ',t.slice(0,300));
}
