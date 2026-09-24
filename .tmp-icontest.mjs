import * as I from './site/templates/_icons.mjs';
const s = I.iconSprite();
console.log('names:', I.ICON_NAMES.length);
console.log('sprite bytes:', s.length);
const syms = [...s.matchAll(/<symbol id="([^"]+)"/g)].map(m=>m[1]);
console.log('symbols:', syms.length);
// every symbol must be well formed: balanced tags, closed paths
const bad = [];
for (const n of I.ICON_NAMES) {
  const one = I.icon(n, { inline: true });
  if (!/^<svg /.test(one) || !/<\/svg>$/.test(one)) bad.push(['shape', n]);
  const d = one.match(/ d="([^"]+)"/g) || [];
  for (const dd of d) {
    const nums = dd.match(/-?\d+(\.\d+)?/g) || [];
    for (const v of nums) if (Math.abs(Number(v)) > 20.5) bad.push(['out-of-box', n, v]);
  }
}
console.log('geometry problems:', bad.length, JSON.stringify(bad.slice(0,8)));
console.log(I.icon('sec-map'));
console.log(I.pillarIcon('markets', { className: 'ptag__i' }));
console.log(I.stateIcon('uncal'));
console.log(I.dcIcon('under_construction'));
console.log(I.dirIcon(0), I.dirIcon(-0.1));
console.log(I.sectionIcon('/watts.html'), I.sectionIcon('bliss'));
console.log('determinism:', I.iconSprite() === s);
console.log('subset:', I.iconSprite({ only: ['sec-map','dc-operating'] }).length);
try { I.icon('nope'); } catch (e) { console.log('throws ok:', e.message); }
