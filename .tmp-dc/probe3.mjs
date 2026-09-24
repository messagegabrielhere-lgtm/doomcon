const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
async function probe(name,url){
  const t0=Date.now();
  try{
    const r=await fetch(url,{headers:{'user-agent':UA},signal:AbortSignal.timeout(180000)});
    const t=await r.text();
    let info='';
    try{const j=JSON.parse(t); info=`features=${j.features?.length ?? 'n/a'} keys=${Object.keys(j).join(',')}`;
      if(j.features?.[0]) info+=' props='+JSON.stringify(j.features[0].properties);
    }catch{info=t.replace(/\s+/g,' ').slice(0,200);}
    console.log(name, r.status, `${Date.now()-t0}ms`, `${(t.length/1e6).toFixed(2)}MB`, info.slice(0,400));
  }catch(e){console.log(name,'ERR',e.name,e.message.slice(0,150));}
}
await probe('tigerweb-states-meta','https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer?f=json');
