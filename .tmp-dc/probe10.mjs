const H={'user-agent':'doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)',accept:'application/json'};
const base='https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent';
const many=['48441','48113','51107','39049','06085','36061','41065','13135','31055','04013','19155','35001'];
for (const [n,aoi] of [['two','48441,48113'],['twelve',many.join(',')]]){
  const url=`${base}?aoi=${aoi}&startdate=9/22/2026&enddate=9/22/2026&statisticsType=1`;
  const t0=Date.now();
  const r=await fetch(url,{headers:H,signal:AbortSignal.timeout(120000)});
  const t=await r.text();
  let j=null;try{j=JSON.parse(t);}catch{}
  console.log(n,r.status,`${Date.now()-t0}ms`,'rows',Array.isArray(j)?j.length:'?', t.slice(0,300));
  await new Promise(r=>setTimeout(r,1500));
}
