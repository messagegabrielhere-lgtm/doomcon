const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
const H={'user-agent':UA,accept:'application/json'};
const base='https://usdmdataservices.unl.edu/api';
const tries=[
 ['county-by-state','/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=48&startdate=9/15/2026&enddate=9/22/2026&statisticsType=1'],
 ['county-single','/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=48441&startdate=9/15/2026&enddate=9/22/2026&statisticsType=1'],
];
for(const [n,p] of tries){
  const t0=Date.now();
  try{
    const r=await fetch(base+p,{headers:H,signal:AbortSignal.timeout(120000)});
    const t=await r.text();
    console.log(n,r.status,`${Date.now()-t0}ms`,`${t.length}b`, t.replace(/\s+/g,' ').slice(0,700));
  }catch(e){console.log(n,'ERR',e.name,e.message.slice(0,120));}
  await new Promise(r=>setTimeout(r,1200));
}
