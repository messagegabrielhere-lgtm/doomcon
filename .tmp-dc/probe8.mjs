const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
const SEC_UA='doomcon.watch collector (gabegtornberg@protonmail.com)';
// 1. Federal Register with full fields
const qs=new URLSearchParams({'conditions[term]':'"data center"','conditions[publication_date][gte]':'2026-03-01',per_page:'40',order:'newest'});
for(const f of ['document_number','title','abstract','publication_date','agencies','type','html_url','action']) qs.append('fields[]',f);
const r=await fetch(`https://www.federalregister.gov/api/v1/documents.json?${qs}`,{headers:{'user-agent':UA}});
const j=await r.json();
console.log('FEDREG count',j.count);
for(const d of j.results.slice(0,20)) console.log(' •',d.publication_date, d.type, '|', (d.title||'').slice(0,130));
console.log('--- sample abstract ---'); console.log(JSON.stringify(j.results[0],null,1).slice(0,1200));

// 2. SEC hit shape
const s=new URLSearchParams({q:'"data center"',dateRange:'custom',startdt:'2026-09-01',enddt:'2026-09-24'});
const sr=await fetch(`https://efts.sec.gov/LATEST/search-index?${s}`,{headers:{'user-agent':SEC_UA,accept:'application/json'}});
const sj=await sr.json();
console.log('SEC status',sr.status,'total',sj?.hits?.total);
console.log(JSON.stringify(sj?.hits?.hits?.slice(0,2),null,1).slice(0,1800));
