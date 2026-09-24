import * as I from './site/templates/_icons.mjs';
import fs from 'node:fs';
const groups = {
  'Pillars': I.ICON_NAMES.filter(n=>n.startsWith('pillar-')),
  'Source states': I.ICON_NAMES.filter(n=>n.startsWith('state-')),
  'Datacentre status': I.ICON_NAMES.filter(n=>n.startsWith('dc-')),
  'Direction': I.ICON_NAMES.filter(n=>n.startsWith('dir-')),
  'Section marks': I.ICON_NAMES.filter(n=>n.startsWith('sec-')),
};
const cell = (n) => `<div class="c"><span class="g">${I.icon(n)}</span><code>${n}</code>
 <span class="sizes">${I.icon(n,{size:11})}${I.icon(n,{size:15})}${I.icon(n,{size:24})}${I.icon(n,{size:40})}</span></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>sprite</title>
<style>
:root{--bg:#0b0c0e;--ink:#e8eaee;--dim:#6a717b;--accent:#ffb020}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,system-ui;padding:20px}
body.light{--bg:#faf9f6;--ink:#14161a;--dim:#666d75;--accent:#9a5a00}
h2{font:600 12px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:26px 0 10px;border-bottom:1px solid var(--dim);padding-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.c{border:1px solid #33363c;border-radius:4px;padding:10px;display:grid;gap:7px;justify-items:center}
.g{color:var(--accent)}
.g .dcico{--ico:34px}
.dcico{width:var(--ico,1.15em);height:var(--ico,1.15em);display:inline-block;vertical-align:-0.16em}
code{font:11px ui-monospace,monospace;color:var(--dim)}
.sizes{display:flex;align-items:flex-end;gap:9px;color:var(--ink)}
.row{display:flex;gap:16px;align-items:baseline;margin:14px 0;font:11px ui-monospace,monospace;color:var(--dim)}
.row b{color:var(--ink);font-weight:500;display:inline-flex;align-items:center;gap:5px}
</style>
<button onclick="document.body.classList.toggle('light')" style="position:fixed;right:14px;top:14px;z-index:9">scheme</button>
${I.iconSprite()}
${Object.entries(groups).map(([k,v])=>`<h2>${k}</h2><div class="grid">${v.map(cell).join('')}</div>`).join('')}
<h2>In text, at the sizes the site actually uses</h2>
<div class="row"><b>${I.pillarIcon('compute')} CMP</b><b>${I.stateIcon('ok')} live</b><b>${I.stateIcon('dark')} dark</b><b>${I.stateIcon('uncal')} no baseline</b><b>${I.dirIcon(1)} +0.4</b><b>${I.dirIcon(0)} ±0.0</b></div>
<div class="row" style="font-size:13px"><b>${I.sectionIcon('signal')} Signal 200</b><b>${I.sectionIcon('race')} The race 8</b><b>${I.sectionIcon('substrate')} Substrate 9</b><b>${I.sectionIcon('map')} Map 1877</b><b>${I.sectionIcon('bliss')} Bliss 61.2</b></div>
<div class="row" style="font-size:16px"><b>${I.dcIcon('operating')} operating 1769</b><b>${I.dcIcon('under_construction')} building 95</b><b>${I.dcIcon('announced')} announced 13</b></div>
`;
fs.writeFileSync('public/_iconsheet.html', html);
console.log('wrote', html.length);
