const UA='doomcon/1.0 (+https://github.com/messagegabrielhere-lgtm/doomcon)';
const r=await fetch('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer?f=json',{headers:{'user-agent':UA}});
const j=await r.json();
console.log(j.layers.map(l=>`${l.id}:${l.name}:minScale=${l.minScale}`).join('\n'));
