// /flock.html — THE REGISTER. Where the automated plate readers are, as far as
// anyone has bothered to write them down.
//
// Reads data/flock.json, written by collector/flock.mjs out of OpenStreetMap
// via Overpass. Server-rendered, deterministic, no client JavaScript: identical
// inputs produce byte-identical HTML. Nothing in this file reads a clock.
//
// ---------------------------------------------------------------------------
// WHY THIS PAGE IS ORDERED THE WAY IT IS
// ---------------------------------------------------------------------------
// This is the most dangerous dataset on the site, and the danger is not the
// subject — it is the shape. A national dot map of 115,608 surveillance
// cameras looks like a census and is a volunteer survey. Every blank square
// inch of it is an assertion the data cannot make.
//
// So the argument runs: what was counted, then WHAT THE BLANK MEANS, then the
// map. The coverage paragraph is printed SECOND, above the picture, in the same
// position and doing the same job as the correlation warning on /watts and the
// limitation paragraph on /map — before a reader has had a chance to form the
// wrong idea, rather than in a footnote under a map they have already
// screenshotted.
//
// And the blank is treated in the picture itself. Land with no mapped camera in
// it is not left plain: it is HATCHED, and the legend's first row names the
// hatch "nobody has mapped here". That is the whole of the argument in one
// texture. A map that draws only where the cameras are is a map that quietly
// asserts the rest is clear, and that is the one claim this dataset cannot
// support. collector/flock.mjs publishes copy.legend_requirement demanding a
// carrier that is not colour; the hatch is that carrier, and it is the default
// state of the map rather than a special case bolted onto the edge.
//
// ---------------------------------------------------------------------------
// WHY A DENSITY GRID AND NOT PINS OR A CHOROPLETH
// ---------------------------------------------------------------------------
// 115,608 markers is not a map, it is an ink blot, and at 375px it is a grey
// rectangle. Three encodings were available:
//
//   individual pins   — refused. 115,608 nodes of SVG, illegible at any width.
//   county choropleth — refused, and this is the one that hurts. It is the
//                       right encoding for THIS dataset, because "zero mapped"
//                       would get its own polygon. But the county polygons live
//                       in the collector's TIGER cache, not in ctx, and a page
//                       template on this site reads ctx and nothing else. The
//                       county numbers are all here, in the table.
//   density grid      — TAKEN. flock.json publishes 5,029 occupied cells on a
//                       0.25° lattice with a count each, which is about 28 km
//                       of latitude per cell. Each occupied cell is drawn as
//                       its own projected quadrilateral, shaded by count, on
//                       top of the hatch. Six classes, each with its printed
//                       range. 4,973 of the 5,029 cells fall inside the
//                       contiguous frame; the rest are counted and named.
//
// The cell is a quadrilateral and not a rectangle because Albers rotates: at
// the Maine and California edges a 0.25° box is visibly sheared, and drawing it
// square would put cameras in the wrong place to save four numbers.
//
// ---------------------------------------------------------------------------
// THE ONE FIGURE NOBODY ELSE PUBLISHES
// ---------------------------------------------------------------------------
// `direction`. 113,214 of these cameras carry a parsed compass bearing — the
// way the lens points. The EFF's Atlas of Surveillance does not render it and
// neither does DeFlock. It is the difference between "there is a camera here"
// and "there is a camera here reading the northbound carriageway", and it is
// sitting in the tags unread. The rose is on this page, with the two things
// that make it honest printed beside it: the 2,394 cameras with no usable
// bearing are shown as untagged rather than folded into north, and the 5,741
// bare direction=0 tags — which mean "due north" and "nobody established a
// bearing" with equal probability — are named as the reason the north bin is
// fatter than its neighbours.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
// Imported, never edited. This page borrows the projection, the outline table
// and the frame that /map is drawn in, so the two maps are the same map with
// different things on them — same Albers, same viewBox, same fitted extent.
import { MAP_FRAME } from './_usmap.mjs';
import { iconSprite, icon as sheetIcon } from './_icons.mjs';

const PATH = '/flock.html';

const SPRITE = ['sec-map', 'sec-method', 'sec-signal', 'sec-substrate', 'sec-api', 'state-live'];

/**
 * THE ROUTE GATE, restated rather than owned.
 *
 * build.mjs decides this route with its own `hasFlockData`, not with this
 * function, and it is right to: the nav is drawn by layout.mjs and a gate the
 * nav cannot see is a gate the nav can disagree with. So this predicate is
 * deliberately the SAME SHAPE as build.mjs's — totals, counties, states,
 * coverage, copy.attribution_required — and not one condition narrower. Were it
 * narrower, build would write a page this module then refused to fill.
 * THE TWO MUST MOVE TOGETHER.
 *
 * Everything this page draws beyond those five blocks — the cell grid, the
 * direction rose, the field-coverage bars, the operator ranking, the harvest
 * report — is guarded at its own call site and disappears quietly if the
 * collector stops publishing it. A section that cannot be filled is omitted. It
 * is never filled with a zero.
 */
export function hasFlock(ctx) {
  const f = ctx && ctx.flock;
  return Boolean(
    f
    && f.totals && Number.isFinite(Number(f.totals.mapped_worldwide))
    && Array.isArray(f.counties) && f.counties.length
    && Array.isArray(f.states) && f.states.length
    && f.coverage
    && f.copy && f.copy.attribution_required,
  );
}

// ---------------------------------------------------------------------------
// Formatting. `N` is written out longhand rather than via toLocaleString so the
// build cannot depend on which ICU the container was compiled with: this page
// has to be byte-identical from any machine.
// ---------------------------------------------------------------------------

function N(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const neg = n < 0;
  const body = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `−${body}` : body;
}

/** A share already expressed 0..1, as a percentage. Never rounded up to 100. */
function pct(share, dp = 1) {
  const n = Number(share);
  if (!Number.isFinite(n)) return '—';
  const v = n * 100;
  if (v > 99.95 && v < 100) return '99.9%';
  return `${v.toFixed(dp)}%`;
}

function ratio(a, b, dp = 1) {
  const x = Number(a); const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return '—';
  return pct(x / y, dp);
}

/** One decimal place, positive zero. Keeps the SVG path table free of "-0". */
const r1 = (v) => {
  const x = Math.round(Number(v) * 10) / 10;
  return Object.is(x, -0) ? 0 : x;
};

function icon(name) { return sheetIcon(name); }

/**
 * The optional blocks, each behind one predicate, so a collector that stops
 * publishing one of them costs a missing SECTION and never a broken page or an
 * invented zero. `direction` is the one worth being strict about: a rose
 * assembled from a partial `counts` array would be a picture of a distribution
 * nobody measured.
 */
function fieldCoverage(f) {
  return (f && f.field_coverage && typeof f.field_coverage === 'object') ? f.field_coverage : {};
}

function hasDirection(f) {
  const d = f && f.direction;
  return Boolean(
    d && Array.isArray(d.counts) && Array.isArray(d.labels)
    && d.counts.length === d.labels.length && d.counts.length > 0
    && d.counts.every((c) => Number.isFinite(Number(c))),
  );
}

// ---------------------------------------------------------------------------
// THE DENSITY CLASSES.
//
// Six, and the breaks are printed in the legend as ranges rather than as
// quantile labels, because "the fourth quintile" is not a fact a reader can
// check and "15 to 49 cameras in this cell" is. The breaks are fixed constants
// and not computed from the data: a scale that moves every week is a scale that
// makes two screenshots of this page incomparable, which is the whole reason
// the site refuses relative timestamps.
// ---------------------------------------------------------------------------

const CLASSES = Object.freeze([
  { id: 'c1', lo: 1, hi: 1, label: '1' },
  { id: 'c2', lo: 2, hi: 4, label: '2–4' },
  { id: 'c3', lo: 5, hi: 14, label: '5–14' },
  { id: 'c4', lo: 15, hi: 49, label: '15–49' },
  { id: 'c5', lo: 50, hi: 149, label: '50–149' },
  { id: 'c6', lo: 150, hi: Infinity, label: '150 or more' },
]);

function classOf(n) {
  for (let i = 0; i < CLASSES.length; i += 1) {
    if (n >= CLASSES[i].lo && n <= CLASSES[i].hi) return i;
  }
  return CLASSES.length - 1;
}

// ---------------------------------------------------------------------------
// The model. One pass over the file, shared by the map, the legend, the tables
// and the prose, so the picture and the sentence under it cannot disagree.
// Pure: no clock, no randomness, no I/O.
// ---------------------------------------------------------------------------

function model(f) {
  const F = MAP_FRAME;
  const cellDeg = Number(f.grid && f.grid.cell_deg) > 0 ? Number(f.grid.cell_deg) : 0.25;
  const inFrame = (p) => p[0] >= 0 && p[0] <= F.width && p[1] >= 0 && p[1] <= F.height;

  const byClass = CLASSES.map(() => []);
  const cellsByClass = CLASSES.map(() => 0);
  const camsByClass = CLASSES.map(() => 0);
  let drawnCells = 0; let drawnCameras = 0;
  let offCells = 0; let offCameras = 0;

  const rows = Array.isArray(f.grid_rows) ? f.grid_rows : [];
  for (const row of rows) {
    const latIdx = Number(row[0]); const lonIdx = Number(row[1]); const n = Number(row[2]);
    if (!Number.isFinite(latIdx) || !Number.isFinite(lonIdx) || !Number.isFinite(n) || n <= 0) continue;
    const lat = latIdx * cellDeg; const lon = lonIdx * cellDeg;
    const corners = [
      [lon, lat], [lon + cellDeg, lat], [lon + cellDeg, lat + cellDeg], [lon, lat + cellDeg],
    ].map(([x, y]) => F.project(x, y));
    const k = classOf(n);
    cellsByClass[k] += 1;
    camsByClass[k] += n;
    if (!corners.some(inFrame)) { offCells += 1; offCameras += n; continue; }
    drawnCells += 1; drawnCameras += n;
    byClass[k].push(quad(corners));
  }

  // States the fitted outline does not draw at all. Named rather than silently
  // dropped: a reader in Honolulu should not have to work out from the picture
  // that their 66 cameras were left off it.
  const drawnAb = new Set(F.shapes.map((s) => s.ab));
  const notOnOutline = f.states
    .filter((s) => Number(s.cameras_mapped) > 0 && !drawnAb.has(s.state))
    .map((s) => ({ ab: s.state, name: s.name, n: Number(s.cameras_mapped) }));
  const notOnOutlineTotal = notOnOutline.reduce((a, s) => a + s.n, 0);

  const states = f.states.slice().sort((a, b) => (
    Number(b.cameras_mapped) - Number(a.cameras_mapped) || String(a.state).localeCompare(String(b.state))
  ));

  const counties = Array.isArray(f.counties)
    ? f.counties
      .filter((r) => Number(r[3]) > 0)
      .slice()
      .sort((a, b) => Number(b[3]) - Number(a[3]) || String(a[0]).localeCompare(String(b[0])))
    : [];

  return {
    cellDeg,
    byClass,
    cellsByClass,
    camsByClass,
    drawnCells,
    drawnCameras,
    offCells,
    offCameras,
    notOnOutline,
    notOnOutlineTotal,
    states,
    counties,
    totalCells: rows.length,
    hasGrid: rows.length > 0,
  };
}

/**
 * A grid cell as a projected quadrilateral.
 *
 * Every corner is rounded to one decimal FIRST and the deltas are taken from
 * the rounded values, not rounded afterwards. That is what stops hairline seams
 * between neighbours: two cells sharing an edge compute the same longitude, get
 * the same projection and round to the same number, so the edges are identical
 * strings rather than two values 0.04 apart. 0.25 is a power of two, so
 * `(i+1)*0.25` and `i*0.25 + 0.25` are the same float and there is no drift
 * across the lattice either.
 */
function quad(pts) {
  const a = pts.map((p) => [r1(p[0]), r1(p[1])]);
  return `M${a[0][0]} ${a[0][1]}`
    + `l${r1(a[1][0] - a[0][0])} ${r1(a[1][1] - a[0][1])}`
    + `l${r1(a[2][0] - a[1][0])} ${r1(a[2][1] - a[1][1])}`
    + `l${r1(a[3][0] - a[2][0])} ${r1(a[3][1] - a[2][1])}Z`;
}

/**
 * A 45-degree hatch tile. Three strokes, because the corner diagonals have to
 * be drawn as well as the main one or the tiles do not join and the texture
 * reads as rows of dashes instead of continuous lines.
 */
function hatchPattern(id, pitch, width) {
  const k = r1(pitch / 5);
  return `<pattern id="${id}" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse">`
    + `<path class="flk__hl" style="stroke-width:${width}"`
    + ` d="M${-k} ${k}L${k} ${-k}M0 ${pitch}L${pitch} 0`
    + `M${r1(pitch - k)} ${r1(pitch + k)}L${r1(pitch + k)} ${r1(pitch - k)}"/></pattern>`;
}

/** The outline, built once and referenced three times by <use>. */
function landGroup() {
  return MAP_FRAME.shapes.map(({ ab, polys }) => {
    const d = polys.map((poly) => poly.map((p, i) => (
      `${i === 0 ? 'M' : 'L'}${r1(p[0])} ${r1(p[1])}`
    )).join('') + 'Z').join('');
    return `<path d="${d}"><title>${esc(ab)}</title></path>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// THE MAP.
//
// Layer order, and each layer is load-bearing:
//   1. the land, filled flat          — the country
//   2. the SAME land, filled with the hatch — "nobody has mapped here"
//   3. the occupied cells, opaque     — what is mapped
//   4. the SAME land again, stroke only — the borders, back on top of the cells
//
// Layers 1, 2 and 4 are three <use> references to one <g>, so the outline is in
// the document once rather than three times.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// THE LIVE LAYER. Progressive: the picture above is complete before this runs.
//
// What it adds, in the order a reader meets it: pan and zoom (drag, wheel,
// pinch, buttons, keys); a readout of whichever 0.25-degree cell is under the
// pointer, with its count and its state, driven by running the build's Albers
// projection in reverse rather than by 5,029 hit-target elements; a zoom link
// from every drawn state in the table; "Near me"; and, past 12x, a button that
// fetches the packed points file and draws the individual cameras, past 40x
// with a tick for the way each lens points. The points are never inlined and
// never fetched unasked.
//
// No backticks and no ${ in here: it is a template literal's body.
// ---------------------------------------------------------------------------
const FLK_JS = `(function(){
if(window.flockMap&&window.flockMap.rescan){window.flockMap.rescan();return;}
var D=document,MAXK=300,SHOWK=12,TICKK=40;
var REDUCE=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
var RAD=Math.PI/180,P1=29.5*RAD,P2=45.5*RAD,P0=23*RAD,L0=-96*RAD;
var AN=(Math.sin(P1)+Math.sin(P2))/2,AC=Math.cos(P1)*Math.cos(P1)+2*AN*Math.sin(P1),AR0=Math.sqrt(AC-2*AN*Math.sin(P0))/AN;
var API={maps:[]};
API.get=function(id){for(var i=0;i<API.maps.length;i++){if(API.maps[i].id===id)return API.maps[i];}return null;};
window.flockMap=API;
function nf(n){return n.toLocaleString('en-US');}
function r1(v){return (Math.round(v*10)/10).toString();}

function boot(fig){
 var svg=fig.querySelector('.flk__svg'),vp=fig.querySelector('.flk__vp'),dataEl=fig.querySelector('.flk__data');
 if(!svg||!vp||!dataEl)return null;
 var data;try{data=JSON.parse(dataEl.textContent);}catch(err){return null;}
 var fit=data.fit,CELL=data.cell||0.25;
 if(!fit||!(fit.scale>0))return null;
 var stage=fig.querySelector('.flk__stage')||fig;
 var vb=(svg.getAttribute('viewBox')||'0 0 1000 638').split(' ');
 var W=parseFloat(vb[2])||1000,H=parseFloat(vb[3])||638;
 var hud=fig.querySelector('.flk__hud'),hudA=fig.querySelector('[data-flk-cell]'),hudB=fig.querySelector('[data-flk-state]'),
  hudC=fig.querySelector('[data-flk-cams-n]'),zEl=fig.querySelector('[data-flk-zoom]');
 var ctls=fig.querySelector('.flk__ctl'),keys=fig.querySelector('.flk__keys');
 var pick=vp.querySelector('.flk__pick'),camsEl=vp.querySelector('.flk__cams'),camBtn=fig.querySelector('[data-flk-cams]'),
  meBtn=fig.querySelector('[data-flk-me]'),edge=vp.querySelector('.flk__edge');
 var pats=svg.querySelectorAll('pattern'),lands=svg.querySelectorAll('#flk-land path');
 var url=fig.getAttribute('data-flk-points')||'';
 var k=1,tx=0,ty=0,raf=0,invq=1,animT=0,settleT=0,i;
 var grid={};
 for(i=0;i<data.rows.length;i++){var r=data.rows[i];grid[r[0]+','+r[1]]=r[2];}
 var stInfo=data.states||{};

 /* ---- the projection the build used, forward and back ---- */
 function proj(lon,lat){
  var rho=Math.sqrt(AC-2*AN*Math.sin(lat*RAD))/AN,th=AN*(lon*RAD-L0);
  var ax=rho*Math.sin(th),ay=AR0-rho*Math.cos(th);
  return[fit.pad+(ax-fit.minX)*fit.scale,fit.height-fit.pad-(ay-fit.minY)*fit.scale];
 }
 function unproj(x,y){
  var ax=(x-fit.pad)/fit.scale+fit.minX,ay=(fit.height-fit.pad-y)/fit.scale+fit.minY;
  var dy=AR0-ay,rho=Math.sqrt(ax*ax+dy*dy),th=Math.atan2(ax,dy);
  var s=(AC-rho*rho*AN*AN)/(2*AN);if(s>1)s=1;if(s<-1)s=-1;
  return[(L0+th/AN)/RAD,Math.asin(s)/RAD];
 }
 var pt=svg.createSVGPoint?svg.createSVGPoint():null;
 function stateAt(x,y){
  if(!pt)return null;
  pt.x=x;pt.y=y;
  for(var j=0;j<lands.length;j++){
   try{if(lands[j].isPointInFill(pt)){var t=lands[j].querySelector('title');return t?t.textContent:null;}}
   catch(err){return null;}
  }
  return null;
 }
 function landBox(ab){
  for(var j=0;j<lands.length;j++){
   var t=lands[j].querySelector('title');
   if(!t||t.textContent!==ab)continue;
   var d=(lands[j].getAttribute('d')||'').replace(/[MLZ]/g,' ').split(' '),x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,n=0,m;
   for(m=0;m<d.length;m++){if(d[m]==='')continue;var v=+d[m];if(!isFinite(v))continue;
    if(n%2===0){if(v<x0)x0=v;if(v>x1)x1=v;}else{if(v<y0)y0=v;if(v>y1)y1=v;}n++;}
   return n>3?{x:x0,y:y0,w:x1-x0,h:y1-y0}:null;
  }
  return null;
 }

 /* ---- geometry ---- */
 function upp(){var r=svg.getBoundingClientRect();return r.width>0?W/r.width:1;}
 function toV(cx,cy){var r=svg.getBoundingClientRect();if(!r.width)return null;var s=W/r.width;return{x:(cx-r.left)*s,y:(cy-r.top)*s};}
 function clamp(){
  if(!(k>=1))k=1;if(k>MAXK)k=MAXK;
  var ax=W-W*k,ay=H-H*k;
  if(tx>0)tx=0;if(tx<ax)tx=ax;if(ty>0)ty=0;if(ty<ay)ty=ay;
 }
 function paint(){
  vp.setAttribute('transform','translate('+tx.toFixed(2)+' '+ty.toFixed(2)+') scale('+k.toFixed(4)+')');
  /* Half-octave steps, like the datacentre map: the borders, the hatch pitch
     and the pick outline stay a screen pixel wide without restyling per frame. */
  var q=Math.pow(2,Math.round(Math.log(k)/Math.LN2*2)/2);
  if(q!==invq){
   invq=q;var inv=(1/q).toFixed(4);
   if(edge)edge.style.strokeWidth=inv;
   if(pick)pick.style.strokeWidth=(1.4/q).toFixed(4);
   for(var j=0;j<pats.length;j++)pats[j].setAttribute('patternTransform','scale('+inv+')');
  }
  if(zEl)zEl.textContent=k.toFixed(1)+'×';
  scaleBar();
  fig.setAttribute('data-flk-z',k>=TICKK?'tick':k>=SHOWK?'cams':'out');
  if(camBtn)camBtn.hidden=!(k>=SHOWK&&url);
  if(settleT)clearTimeout(settleT);
  settleT=setTimeout(settled,120);
 }
 function settled(){settleT=0;drawCams();if(centred&&!np)readAt(W/2,H/2,false);}
 /* The projection is on a unit sphere, so one raw Albers unit is one Earth
    radius and fit.scale is viewBox units per radius. Equal-area conic, so the
    bar is true on the standard parallels and within about two per cent
    elsewhere in the frame. */
 var sbEl=fig.querySelector('[data-flk-scale]'),sbBar=sbEl?sbEl.querySelector('i'):null,sbK=fig.querySelector('[data-flk-scale-k]'),UPK=fit.scale/6371;
 function scaleBar(){
  if(!sbBar||!sbK)return;
  var r=svg.getBoundingClientRect();if(!r.width)return;
  var pxPerKm=UPK*k*(r.width/W),km=Math.min(140,r.width*0.25)/pxPerKm;
  var p=Math.pow(10,Math.floor(Math.log(km)/Math.LN10)),best=p,steps=[1,2,5],j;
  for(j=0;j<steps.length;j++){if(steps[j]*p<=km)best=steps[j]*p;}
  if(best<1)best=1;
  sbBar.style.width=Math.round(best*pxPerKm)+'px';
  sbK.textContent=nf(best)+' km';
 }
 function apply(){clamp();if(raf)return;raf=requestAnimationFrame(function(){raf=0;paint();});}
 function anim(){
  if(REDUCE)return;
  fig.classList.add('flk--anim');
  if(animT)clearTimeout(animT);
  animT=setTimeout(function(){fig.classList.remove('flk--anim');animT=0;},260);
 }
 function zoomAt(vx,vy,f){
  var nk=k*f;if(nk<1)nk=1;if(nk>MAXK)nk=MAXK;if(nk===k)return;
  tx=vx-(vx-tx)*(nk/k);ty=vy-(vy-ty)*(nk/k);k=nk;apply();
 }
 function zoomMid(f){anim();zoomAt(W/2,H/2,f);}
 function reset(){anim();k=1;tx=0;ty=0;centred=0;unpick();apply();}
 function goTo(lat,lon,zoom){
  var p=proj(lon,lat);
  anim();k=Math.min(MAXK,Math.max(1,zoom||60));tx=W/2-p[0]*k;ty=H/2-p[1]*k;apply();
 }
 function focusState(ab){
  var b=landBox(ab);if(!b||!(b.w>0))return false;
  var pad=10,nk=Math.min(W/(b.w+pad*2),H/(b.h+pad*2));
  if(!(nk>1))nk=1;if(nk>MAXK)nk=MAXK;
  anim();k=nk;tx=W/2-(b.x+b.w/2)*k;ty=H/2-(b.y+b.h/2)*k;centred=0;unpick();apply();
  return true;
 }

 /* ---- the readout: which cell, how many, which state ---- */
 var sticky=0,curKey='',centred=0;
 function cellQuad(li,lo){
  var a=proj(lo*CELL,li*CELL),b=proj(lo*CELL+CELL,li*CELL),c=proj(lo*CELL+CELL,li*CELL+CELL),d=proj(lo*CELL,li*CELL+CELL);
  return 'M'+r1(a[0])+' '+r1(a[1])+'L'+r1(b[0])+' '+r1(b[1])+'L'+r1(c[0])+' '+r1(c[1])+'L'+r1(d[0])+' '+r1(d[1])+'Z';
 }
 function readAt(vx,vy,stick){
  var x=(vx-tx)/k,y=(vy-ty)/k;
  var ll=unproj(x,y),lon=ll[0],lat=ll[1];
  var li=Math.floor(lat/CELL),lo=Math.floor(lon/CELL),key=li+','+lo;
  if(stick&&sticky&&key===curKey){unpick();return;}
  var n=grid[key]||0,ab=stateAt(x,y),st=ab&&stInfo[ab]?stInfo[ab]:null;
  curKey=key;sticky=stick?1:0;
  if(pick){pick.setAttribute('d',cellQuad(li,lo));pick.setAttribute('data-on','1');}
  if(hudA){
   hudA.innerHTML=n?('<b>'+nf(n)+'</b> camera'+(n===1?'':'s')+' mapped in this '+CELL+'° cell')
    :(ab?'<b>None mapped</b> in this cell — nobody has mapped here':'Outside the outline');
  }
  if(hudB)hudB.textContent=st?(st[1]+': '+nf(st[0])+' mapped'):(ab||'');
  fig.setAttribute('data-flk-pick',sticky?'stuck':'hover');
  fig.dispatchEvent(new CustomEvent('flockmap:cell',{bubbles:true,
   detail:{lat:li*CELL,lon:lo*CELL,cell:CELL,count:n,state:ab,sticky:!!sticky}}));
 }
 function unpick(){
  sticky=0;curKey='';
  if(pick){pick.setAttribute('d','');pick.removeAttribute('data-on');}
  if(hudA)hudA.textContent='Hover or tap a cell';
  if(hudB)hudB.textContent='';
  fig.removeAttribute('data-flk-pick');
 }

 /* ---- the cameras: fetched once, on request, never inlined ---- */
 var cams=null,camsOn=0,busy=0,inView=0,mb=fig.getAttribute('data-flk-mb')||'';
 function camLabel(){
  if(!camBtn)return;
  if(busy){camBtn.textContent='Loading…';return;}
  camBtn.textContent=camsOn?'Hide the cameras':(cams?'Show the cameras':'Show the cameras · '+mb+' MB');
 }
 function loadCams(done){
  if(cams||busy||!url)return;
  busy=1;camBtn.disabled=true;camLabel();
  fetch(url,{credentials:'omit'}).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.json();}).then(function(p){
   var n=p.count|0,q=p.quantisation||100000,X=new Float32Array(n),Y=new Float32Array(n),j;
   for(j=0;j<n;j++){var xy=proj(p.lon_q[j]/q,p.lat_q[j]/q);X[j]=xy[0];Y[j]=xy[1];}
   cams={n:n,x:X,y:Y,dir:p.dir,lon:p.lon_q,q:q};
   busy=0;camBtn.disabled=false;camLabel();
   if(done)done();
  }).catch(function(){busy=0;camBtn.disabled=false;camBtn.textContent='Could not load the cameras';});
 }
 function toggleCams(){
  if(camsOn){camsOn=0;drawCams();camLabel();return;}
  if(!cams){loadCams(function(){camsOn=1;drawCams();camLabel();});return;}
  camsOn=1;drawCams();camLabel();
 }
 function drawCams(){
  if(!camsEl)return;
  if(!camsOn||!cams||k<SHOWK){
   camsEl.innerHTML='';inView=0;fig.removeAttribute('data-flk-cams');
   if(hudC)hudC.textContent=(camsOn&&cams&&k<SHOWK)?('zoom past '+SHOWK+'× for the cameras'):'';
   return;
  }
  var u=upp()/k,r=2.4*u,tl=9*u,rr=r.toFixed(3),d2=(2*r).toFixed(3);
  var x0=-tx/k,x1=(W-tx)/k,y0=-ty/k,y1=(H-ty)/k,mx=(x1-x0)*0.5,my=(y1-y0)*0.5;
  var X=cams.x,Y=cams.y,dir=cams.dir,lon=cams.lon,q=cams.q,ticks=k>=TICKK;
  var dots=[],hollow=[],lines=[],vis=0,j;
  for(j=0;j<cams.n;j++){
   var x=X[j],y=Y[j];
   if(x<x0-mx||x>x1+mx||y<y0-my||y>y1+my)continue;
   if(x>=x0&&x<=x1&&y>=y0&&y<=y1)vis++;
   var d=dir[j],xs=x.toFixed(2),ys=y.toFixed(2);
   var arc='M'+(x-r).toFixed(2)+' '+ys+'a'+rr+' '+rr+' 0 1 0 '+d2+' 0a'+rr+' '+rr+' 0 1 0 -'+d2+' 0';
   if(d<0){hollow.push(arc);continue;}
   dots.push(arc);
   if(ticks){
    /* North on screen is the local meridian, which Albers rotates by n(λ−λ0);
       the bearing is measured clockwise from it. */
    var th=AN*(lon[j]/q*RAD-L0),nx=-Math.sin(th),ny=-Math.cos(th),ex=-ny,ey=nx;
    var sn=Math.sin(d*RAD),cs=Math.cos(d*RAD),vx=nx*cs+ex*sn,vy=ny*cs+ey*sn;
    lines.push('M'+xs+' '+ys+'l'+(vx*tl).toFixed(2)+' '+(vy*tl).toFixed(2));
   }
  }
  camsEl.innerHTML='<path class="flk__cam" d="'+dots.join('')+'"/>'
   +'<path class="flk__cam flk__cam--nodir" style="stroke-width:'+(0.9*u).toFixed(3)+'" d="'+hollow.join('')+'"/>'
   +(ticks?'<path class="flk__cam--tick" style="stroke-width:'+(1.1*u).toFixed(3)+'" d="'+lines.join('')+'"/>':'');
  inView=vis;
  if(hudC)hudC.textContent=nf(vis)+' camera'+(vis===1?'':'s')+' in view'+(ticks?'':' — past '+TICKK+'× each shows its bearing');
  fig.setAttribute('data-flk-cams','on');
 }

 /* ---- pointers: one path for mouse, pen and finger ---- */
 var ptrs={},np=0,drag=null,pinch=null,moved=0;
 function pk(){var a=[];for(var id in ptrs)a.push(ptrs[id]);return a;}
 function startPinch(){
  var a=pk();if(a.length<2){pinch=null;return;}
  var v1=toV(a[0].x,a[0].y),v2=toV(a[1].x,a[1].y);
  if(!v1||!v2){pinch=null;return;}
  var dx=v2.x-v1.x,dy=v2.y-v1.y,d=Math.sqrt(dx*dx+dy*dy);
  pinch={d:d<1?1:d,mx:(v1.x+v2.x)/2,my:(v1.y+v2.y)/2,k:k,tx:tx,ty:ty};
 }
 function doPinch(){
  var a=pk();if(a.length<2||!pinch)return;
  var v1=toV(a[0].x,a[0].y),v2=toV(a[1].x,a[1].y);
  if(!v1||!v2)return;
  var dx=v2.x-v1.x,dy=v2.y-v1.y,d=Math.sqrt(dx*dx+dy*dy);
  var nk=pinch.k*(d/pinch.d);if(nk<1)nk=1;if(nk>MAXK)nk=MAXK;
  var mx=(v1.x+v2.x)/2,my=(v1.y+v2.y)/2;
  tx=mx-(pinch.mx-pinch.tx)*(nk/pinch.k);
  ty=my-(pinch.my-pinch.ty)*(nk/pinch.k);
  k=nk;apply();
 }
 function inChrome(t){return !!(t&&t.closest&&t.closest('.flk__ctl'));}
 stage.addEventListener('pointerdown',function(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(inChrome(e.target))return;
  ptrs[e.pointerId]={x:e.clientX,y:e.clientY};np++;
  try{stage.setPointerCapture(e.pointerId);}catch(err){}
  moved=0;centred=0;fig.classList.remove('flk--anim');
  if(np===1){var v=toV(e.clientX,e.clientY);drag=v?{vx:v.x,vy:v.y,tx:tx,ty:ty}:null;pinch=null;}
  else if(np===2){drag=null;startPinch();}
  fig.classList.add('flk--grab');
 });
 stage.addEventListener('pointermove',function(e){
  var p=ptrs[e.pointerId];
  if(!p){
   if(e.pointerType!=='touch'&&!sticky&&!inChrome(e.target)){var v=toV(e.clientX,e.clientY);if(v)readAt(v.x,v.y,false);}
   return;
  }
  moved+=Math.abs(e.clientX-p.x)+Math.abs(e.clientY-p.y);
  p.x=e.clientX;p.y=e.clientY;
  if(pinch)doPinch();
  else if(drag){var w=toV(e.clientX,e.clientY);if(w){tx=drag.tx+(w.x-drag.vx);ty=drag.ty+(w.y-drag.vy);apply();}}
 });
 function up(e){
  if(!ptrs[e.pointerId])return;
  delete ptrs[e.pointerId];np--;if(np<0)np=0;
  try{stage.releasePointerCapture(e.pointerId);}catch(err){}
  if(np<2)pinch=null;
  if(np===0){
   fig.classList.remove('flk--grab');
   if(moved<6){var v=toV(e.clientX,e.clientY);if(v)readAt(v.x,v.y,true);}
   drag=null;
  }else{var a=pk();if(a.length){var v2=toV(a[0].x,a[0].y);if(v2)drag={vx:v2.x,vy:v2.y,tx:tx,ty:ty};}}
 }
 stage.addEventListener('pointerup',up);
 stage.addEventListener('pointercancel',up);
 stage.addEventListener('pointerleave',function(e){if(np===0&&!sticky&&e.pointerType!=='touch')unpick();});
 stage.addEventListener('wheel',function(e){
  var v=toV(e.clientX,e.clientY);if(!v)return;
  e.preventDefault();
  var dy=e.deltaY;if(e.deltaMode===1)dy*=16;else if(e.deltaMode===2)dy*=400;
  zoomAt(v.x,v.y,Math.exp(-dy*0.0016));
 },{passive:false});

 /* ---- controls ---- */
 function on(sel,fn){var b=fig.querySelector(sel);if(b)b.addEventListener('click',fn);}
 on('[data-flk-zin]',function(){zoomMid(1.6);});
 on('[data-flk-zout]',function(){zoomMid(1/1.6);});
 on('[data-flk-reset]',reset);
 if(camBtn)camBtn.addEventListener('click',toggleCams);
 if(meBtn&&navigator.geolocation){
  meBtn.hidden=false;
  meBtn.addEventListener('click',function(){
   meBtn.disabled=true;meBtn.textContent='Locating…';
   navigator.geolocation.getCurrentPosition(function(pos){
    var la=pos.coords.latitude,lo=pos.coords.longitude,p=proj(lo,la);
    meBtn.disabled=false;meBtn.textContent='Near me';
    if(p[0]<0||p[0]>W||p[1]<0||p[1]>H){meBtn.textContent='Outside this map';return;}
    goTo(la,lo,90);centred=1;
    if(!camsOn&&url)toggleCams();
   },function(){meBtn.disabled=false;meBtn.textContent='Location refused';},{maximumAge:600000,timeout:15000});
  });
 }

 /* ---- keyboard ---- */
 stage.addEventListener('keydown',function(e){
  if(inChrome(e.target))return;
  var s=(e.shiftKey?140:44)/k,key=e.key,pan=0;
  if(key==='Escape'){unpick();e.preventDefault();return;}
  if(key==='+'||key==='='){zoomMid(1.6);pan=1;}
  else if(key==='-'||key==='_'){zoomMid(1/1.6);pan=1;}
  else if(key==='0'){reset();e.preventDefault();return;}
  else if(key==='c'||key==='C'){if(camBtn&&!camBtn.hidden)toggleCams();e.preventDefault();return;}
  else if(key==='ArrowLeft'){tx+=s;pan=1;}
  else if(key==='ArrowRight'){tx-=s;pan=1;}
  else if(key==='ArrowUp'){ty+=s;pan=1;}
  else if(key==='ArrowDown'){ty-=s;pan=1;}
  else if(key==='Enter'||key===' '||key==='Spacebar'){readAt(W/2,H/2,true);e.preventDefault();return;}
  if(pan){centred=1;apply();e.preventDefault();}
 });

 /* ---- go live ---- */
 fig.classList.add('flk--live');
 if(ctls)ctls.hidden=false;
 if(hud)hud.hidden=false;
 if(keys)keys.hidden=false;
 stage.setAttribute('tabindex','0');
 stage.setAttribute('role','application');
 stage.setAttribute('aria-label','Interactive map. Arrow keys pan, plus and minus zoom, zero resets, Enter reads the cell at the centre, C toggles the individual cameras. The tables below this map carry every number.');
 unpick();camLabel();scaleBar();
 var ctl={
  id:fig.id||'',el:fig,stage:stage,
  zoomIn:function(){zoomMid(1.6);},zoomOut:function(){zoomMid(1/1.6);},reset:reset,
  zoom:function(){return k;},goTo:goTo,focusState:focusState,
  cellAt:function(lat,lon){return grid[Math.floor(lat/CELL)+','+Math.floor(lon/CELL)]||0;},
  readAt:function(lat,lon,stick){var p=proj(lon,lat);readAt(p[0]*k+tx,p[1]*k+ty,!!stick);},
  showCameras:function(){if(!camsOn)toggleCams();},hideCameras:function(){if(camsOn)toggleCams();},
  camerasLoaded:function(){return !!cams;},camerasOn:function(){return !!camsOn;},inView:function(){return inView;}
 };
 fig.flockmap=ctl;
 return ctl;
}

function bootAll(){
 var figs=D.querySelectorAll('[data-flk]'),i;
 for(i=0;i<figs.length;i++){
  if(figs[i].getAttribute('data-flk-live'))continue;
  figs[i].setAttribute('data-flk-live','1');
  var c=boot(figs[i]);if(c)API.maps.push(c);
 }
}
API.rescan=bootAll;
/* The state table's names: with the map live they zoom it; without, the href
   still jumps to the map. */
D.addEventListener('click',function(e){
 var a=e.target&&e.target.closest?e.target.closest('[data-flk-go]'):null;
 if(!a||!API.maps.length)return;
 var m=API.maps[0];
 if(!m.focusState(a.getAttribute('data-flk-go')))return;
 e.preventDefault();
 try{m.el.scrollIntoView({block:'start',behavior:REDUCE?'auto':'smooth'});}catch(err){m.el.scrollIntoView();}
 try{m.stage.focus({preventScroll:true});}catch(err2){}
});
bootAll();
})();`;

function pointsOf(ctx) {
  const p = ctx && ctx.flockPoints;
  if (!p || !p.href || !Number.isFinite(Number(p.bytes))) return null;
  const gz = Number.isFinite(Number(p.gzBytes)) ? Number(p.gzBytes) : Number(p.bytes);
  return { href: p.href, bytes: Number(p.bytes), gzBytes: gz, mb: (gz / 1e6).toFixed(1) };
}

/**
 * Everything the client script needs and nothing it does not: the fit (so it
 * can run the same Albers forward and back), the occupied cells with their
 * counts, and a name and a total per state. About 65 KB. The 115,608
 * individual cameras are NOT here - see the points file, fetched on request.
 */
function clientData(f, m) {
  const fit = MAP_FRAME.fit;
  const rows = (Array.isArray(f.grid_rows) ? f.grid_rows : [])
    .map((r) => [Number(r[0]), Number(r[1]), Number(r[2])])
    .filter((r) => r.every(Number.isFinite) && r[2] > 0);
  const states = {};
  for (const st of f.states) states[st.state] = [Number(st.cameras_mapped) || 0, String(st.name || st.state)];
  return JSON.stringify({ cell: m.cellDeg, fit, rows, states });
}

function mapFigure(f, m, ctx) {
  const t = f.totals;
  const q = String(f.copy.headline_qualifier || '');
  const points = pointsOf(ctx);
  const title = `Flock ALPR cameras ${q}, binned to ${m.cellDeg}-degree cells across the contiguous United States`;
  const desc =
    `An equal-area map of the contiguous United States. `
    + `${N(m.drawnCameras)} cameras are drawn, in ${N(m.drawnCells)} occupied cells of `
    + `${m.cellDeg} degrees, each cell shaded in one of six classes by how many cameras are mapped `
    + `inside it, from a single camera to ${N(f.grid && f.grid.max_cell_count)} in the densest cell. `
    + `Land carrying no mapped camera is drawn with a diagonal hatch, which means nobody has mapped `
    + `there and NOT that there are no cameras there — this data cannot tell those two apart. `
    + `${N(m.offCameras)} further mapped cameras fall outside this frame and are not drawn. `
    + `Every figure in this picture is repeated as a number in the tables below it.`;

  const cells = CLASSES.map((c, i) => (
    m.byClass[i].length
      ? `<path class="flk__c flk__c--${c.id}" d="${m.byClass[i].join('')}"/>`
      : ''
  )).join('');

  // THE PICTURE IS COMPLETE BEFORE ANY SCRIPT RUNS. Everything that moves sits
  // inside one group, flk__vp, and zoom and pan are a transform on that group
  // and nothing else; with the transform absent, which is how it ships, the
  // rendering is what it was before this layer existed. The controls, the
  // readout and the key are rendered hidden because with no script they would
  // be promises the page cannot keep; the script unhides exactly what it wires.
  //
  // The individual cameras are not in this document. They are ${points.mb} MB
  // over the wire, and the map offers to fetch them - a button, once the reader
  // is zoomed in far enough for them to mean anything - rather than deciding
  // for the reader that a megabyte is nothing.
  const camsBtn = points
    ? `<button class="flk__cb flk__cb--t" type="button" data-flk-cams hidden>Show the cameras · ${esc(points.mb)} MB</button>`
    : '';
  const keysCams = points
    ? ` Past 12× a button offers the <b>individual cameras</b> — ${N(f.points_file && f.points_file.count)} of them,
      about ${esc(points.mb)} MB, fetched only when you ask — and past 40× each one shows the way its lens points;
      a hollow dot is a camera with no usable direction tag. <b>Near me</b> asks your browser for your location
      once, keeps it on your device, and zooms there.`
    : '';

  return `<figure class="flk__fig" id="flock-map" data-flk${points ? ` data-flk-points="${esc(ctx.href(points.href))}" data-flk-mb="${esc(points.mb)}"` : ''}>
  <p class="flk__inmap"><b>The hatch is the finding.</b> Hatched land is land where nobody has mapped
    a camera. It is not land with no cameras. ${esc(f.coverage.what_zero_means || '')}</p>
  <div class="flk__stage">
  <svg class="flk__svg" viewBox="0 0 ${MAP_FRAME.width} ${MAP_FRAME.height}" role="img"
       aria-labelledby="flk-mt flk-md" preserveAspectRatio="xMidYMid meet">
    <title id="flk-mt">${esc(title)}</title>
    <desc id="flk-md">${esc(desc)}</desc>
    <defs>
      <g id="flk-land">${landGroup()}</g>
${hatchPattern('flk-hatch', 7, 1.1)}
      ${hatchPattern('flk-hatch-lg', 16, 2.4)}
    </defs>
    <g class="flk__vp">
    <use href="#flk-land" class="flk__base"/>
    <use href="#flk-land" class="flk__hatch"/>
    <g class="flk__cells">${cells}</g>
    <use href="#flk-land" class="flk__edge"/>
    <g class="flk__cams" aria-hidden="true"></g>
    <path class="flk__pick" d="" aria-hidden="true"/>
    </g>
  </svg>
  <div class="flk__ctl" role="group" aria-label="Map controls" hidden>
    <button class="flk__cb" type="button" data-flk-zin aria-label="Zoom in">+</button>
    <button class="flk__cb" type="button" data-flk-zout aria-label="Zoom out">−</button>
    <button class="flk__cb flk__cb--t" type="button" data-flk-reset aria-label="Reset the map to the whole country">Reset</button>
    <button class="flk__cb flk__cb--t" type="button" data-flk-me hidden>Near me</button>
    ${camsBtn}
  </div>
  <p class="flk__hud" hidden><span class="flk__hud__c" data-flk-cell>Hover or tap a cell</span>
    <span class="flk__hud__s" data-flk-state></span>
    <span class="flk__hud__n" data-flk-cams-n></span>
    <span class="flk__hud__sb" data-flk-scale><i aria-hidden="true"></i><span data-flk-scale-k>1,000 km</span></span>
    <span class="flk__hud__z num" data-flk-zoom>1.0×</span></p>
  </div>
  <p class="flk__keys" hidden>Drag or swipe to pan, wheel or pinch to zoom, hover or tap a cell for its
    count.${keysCams} <b>Keyboard:</b> tab to the map, then arrows pan, <kbd>+</kbd> and <kbd>−</kbd> zoom,
    <kbd>0</kbd> resets, <kbd>Enter</kbd> reads the cell at the centre, <kbd>C</kbd> toggles the cameras.
    Click a state in the table below to zoom to it. The tables carry every number whether or not any of
    this works.</p>
  <figcaption class="flk__cap">${N(m.drawnCameras)} cameras in ${N(m.drawnCells)} cells of
    ${m.cellDeg}°, ${esc(q)}. Cell colour is the count inside that cell; the ranges are in the key
    below. The outline is the contiguous states, so a cell can sit off the coast or over the border
    where a camera is mapped outside them. Data
    <a href="${esc(f.copy.attribution_url)}" rel="license noopener">${esc(f.copy.attribution_required)}</a>,
    ODbL v1.0.</figcaption>
  <script type="application/json" class="flk__data">${clientData(f, m).replace(/<\//g, '<\\/')}</script>
  <script>${FLK_JS}</script>
</figure>`;
}

function mapKey(f, m) {
  const swatch = (id) => `<span class="flk__sw flk__sw--${id}" aria-hidden="true"></span>`;
  const rows = CLASSES.map((c, i) => `
      <li><span class="flk__sw-wrap">${swatch(c.id)}</span>
        <span class="flk__kl">${esc(c.label)}</span>
        <b class="flk__kn">${N(m.cellsByClass[i])}</b>
        <span class="flk__kx">cells · ${N(m.camsByClass[i])} cameras</span></li>`).join('');

  const missing = m.notOnOutline.length
    ? `<p class="flk__kp"><b>Off this frame.</b> ${N(m.offCameras)} mapped cameras in ${N(m.offCells)}
         cells fall outside the drawn extent and are not in the picture — including
         ${m.notOnOutline.map((s) => `${esc(s.name)} (${N(s.n)})`).join(', ')}, which this outline does
         not draw at all. They are in the state table below and in every total on this page.</p>`
    : '';

  return `<div class="flk__key">
    <div class="flk__kgrp">
      <p class="flk__kh">What the blank means</p>
      <ul class="flk__kl2">
        <li><span class="flk__sw-wrap"><span class="flk__sw flk__sw--hatch" aria-hidden="true"></span></span>
          <span class="flk__kl">Hatched</span>
          <span class="flk__kx flk__kx--wide">No camera mapped in this cell. <b>Nobody has mapped
            here.</b> Not evidence that there is nothing here — the hatch is drawn as a texture and
            not as a pale colour precisely so it cannot be read as "empty".</span></li>
      </ul>
      <p class="flk__kp">${esc(f.copy.empty_state || '')} ${esc(f.coverage.why_it_is_uneven || '')}</p>
      ${missing}
    </div>
    <div class="flk__kgrp">
      <p class="flk__kh">Cameras mapped per ${m.cellDeg}° cell</p>
      <ul class="flk__kl2 flk__kl2--ramp">${rows}</ul>
      <p class="flk__kp">Fixed class breaks, not quantiles, so two screenshots of this page taken
        weeks apart are comparable. Densest single cell:
        <b>${N(f.grid && f.grid.max_cell_count)}</b> cameras.</p>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// THE ROSE. Sixteen wedges, area-proportional — radius scales with the square
// root of the count, because a reader compares wedges by the ink in them and a
// radius-linear rose exaggerates the largest bin by its own factor again.
//
// The untagged cameras are NOT in the rose. They are printed beside it as their
// own row, which is the whole point: a rose that quietly binned 2,394 unknowns
// as north would be inventing the one number this page exists to be careful
// about.
// ---------------------------------------------------------------------------

const ROSE = Object.freeze({ size: 340, cx: 170, cy: 178, rMax: 132 });

/** Smallest "nice" ring step such that `rings` of it cover `v`. Deterministic. */
function ringStep(v, rings) {
  const target = v / rings;
  if (!(target > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    const s = m * mag;
    if (s * rings >= v) return s;
  }
  return 10 * mag;
}

function rosePolar(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return [
    r1(ROSE.cx + r * Math.sin(rad)),
    r1(ROSE.cy - r * Math.cos(rad)),
  ];
}

function roseFigure(f) {
  const d = f.direction;
  const counts = d.counts.map(Number);
  const labels = d.labels;
  const parsed = counts.reduce((a, b) => a + b, 0);
  const maxBin = Math.max(...counts);
  const step = ringStep(maxBin, 3);
  const top = step * 3;
  const rOf = (c) => ROSE.rMax * Math.sqrt(Math.max(0, c) / top);

  const wedges = counts.map((c, i) => {
    const centre = i * Number(d.bin_width_deg || 22.5);
    const half = Number(d.bin_width_deg || 22.5) / 2;
    const r = r1(rOf(c));
    if (r <= 0) return '';
    const a = rosePolar(centre - half, r);
    const b = rosePolar(centre + half, r);
    return `<path class="flk__wedge" d="M${ROSE.cx} ${ROSE.cy}L${a[0]} ${a[1]}`
      + `A${r} ${r} 0 0 1 ${b[0]} ${b[1]}Z"><title>${esc(labels[i])} — ${N(c)} cameras</title></path>`;
  }).join('');

  // The rings and their labels are drawn in TWO passes with the wedges in
  // between: circles under the ink, numbers over it. Drawn together and under,
  // the 5,000 and 10,000 labels disappear behind the north wedge, which is the
  // tallest one and therefore always in the way. The labels carry a halo in
  // the panel's own colour so they stay readable over whatever they land on.
  const ringLines = [1, 2, 3].map((k) => {
    const r = r1(ROSE.rMax * Math.sqrt(k / 3));
    return `<circle class="flk__ring" cx="${ROSE.cx}" cy="${ROSE.cy}" r="${r}"/>`;
  }).join('');
  const ringLabels = [1, 2, 3].map((k) => {
    const r = r1(ROSE.rMax * Math.sqrt(k / 3));
    return `<text class="flk__ringt" x="${ROSE.cx + 4}" y="${r1(ROSE.cy - r + 11)}">${N(step * k)}</text>`;
  }).join('');

  const cardinals = [['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([ch, deg]) => {
    const p = rosePolar(deg, ROSE.rMax + 17);
    return `<text class="flk__card" x="${p[0]}" y="${r1(p[1] + 5)}">${ch}</text>`;
  }).join('');

  const desc =
    `A sixteen-point compass rose of the direction ${N(parsed)} Flock ALPR cameras are tagged as `
    + `facing. Each wedge's area is proportional to its count; the rings are ${N(step)}, `
    + `${N(step * 2)} and ${N(top)} cameras. The largest bin is ${esc(labels[counts.indexOf(maxBin)])} `
    + `at ${N(maxBin)} and the smallest is ${esc(labels[counts.indexOf(Math.min(...counts))])} at `
    + `${N(Math.min(...counts))}. Cameras with no usable bearing are not in this rose at all. `
    + `Every bin is listed as a number in the table beside this figure.`;

  return `<figure class="flk__rose">
  <svg class="flk__rosesvg" viewBox="0 0 ${ROSE.size} ${ROSE.size}" role="img"
       aria-labelledby="flk-rt flk-rd">
    <title id="flk-rt">Which way ${N(parsed)} Flock ALPR cameras are tagged as facing</title>
    <desc id="flk-rd">${esc(desc)}</desc>
    <g class="flk__rings">${ringLines}</g>
    <g class="flk__wedges">${wedges}</g>
    <g class="flk__ringts">${ringLabels}</g>
    <g class="flk__cards">${cardinals}</g>
  </svg>
</figure>`;
}

/** The rose's numbers, as numbers. The rose is the illustration; this is the data. */
function roseTable(f) {
  const d = f.direction;
  const counts = d.counts.map(Number);
  const parsed = counts.reduce((a, b) => a + b, 0);
  const maxBin = Math.max(...counts);
  const rows = counts.map((c, i) => `
      <tr${c === maxBin ? ' class="is-top"' : ''}>
        <th scope="row">${esc(d.labels[i])}${i === 0 ? ' <span class="flk__flag" title="see the note on direction=0">*</span>' : ''}</th>
        <td>${N(c)}</td>
        <td>${ratio(c, parsed)}</td>
        <td class="flk__barcell"><span class="flk__bar" style="--w:${pct(c / maxBin, 2)}"></span></td>
      </tr>`).join('');
  return `<p class="flk__tcap" id="flk-cap-rose">Every bin as a number, ${esc(String(f.copy.headline_qualifier || ''))}.
        Shares are of the ${N(parsed)} cameras with a parsed bearing, not of all mapped cameras.</p>
  <div class="flk__tw">
    <table class="flk__t" aria-describedby="flk-cap-rose">
      <thead><tr><th scope="col">Facing</th><th scope="col">Cameras</th>
        <th scope="col">Share</th><th scope="col"><span class="flk__vh">Bar</span></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// The tables.
// ---------------------------------------------------------------------------

function stateTable(f, m) {
  // Only states the outline draws get a zoom link: focusing the map on Hawaii
  // would zoom to nothing, and a link that does nothing is worse than no link.
  const drawn = new Set(MAP_FRAME.shapes.map((sh) => sh.ab));
  const rows = m.states.map((s) => {
    const zero = Number(s.cameras_mapped) === 0;
    return `
      <tr${zero ? ' class="is-zero"' : ''}>
        <th scope="row">${drawn.has(s.state)
          ? `<a class="flk__go" href="#flock-map" data-flk-go="${esc(s.state)}" title="Zoom the map to ${esc(s.name)}">${esc(s.name)}</a>`
          : esc(s.name)} <span class="flk__ab">${esc(s.state)}</span></th>
        <td>${zero ? '<span class="flk__none">none mapped</span>' : N(s.cameras_mapped)}</td>
        <td>${N(s.counties_with_mapped_cameras)} / ${N(s.counties_total)}</td>
        <td class="flk__gap">${N(s.counties_with_none_mapped)}</td>
        <td>${Number(s.cameras_mapped) > 0 ? ratio(s.direction_present, s.cameras_mapped) : '—'}</td>
      </tr>`;
  }).join('');
  return `<p class="flk__tcap" id="flk-cap-states">All ${N(m.states.length)} states and territories in the roster, ranked by
        cameras mapped, ${esc(String(f.copy.headline_qualifier || ''))}. The zero rows are printed, not
        omitted: a state with none mapped is a state nobody has mapped. The fourth column is the one
        to read sceptically — it is the count of counties in that state where the answer is unknown.</p>
  <div class="flk__tw">
    <table class="flk__t flk__t--states" aria-describedby="flk-cap-states">
      <thead><tr>
        <th scope="col">State or territory</th>
        <th scope="col">Cameras mapped</th>
        <th scope="col">Counties with any</th>
        <th scope="col">Counties with none mapped</th>
        <th scope="col">Bearing tagged</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

const COUNTY_ROWS = 25;

function countyTable(f, m) {
  if (!m.counties.length) return '';
  const rows = m.counties.slice(0, COUNTY_ROWS).map((r, i) => `
      <tr><td class="flk__rank">${i + 1}</td>
        <th scope="row">${esc(r[1])}</th>
        <td>${r[2] ? esc(r[2]) : '<span class="flk__none">not stated</span>'}</td>
        <td>${N(r[3])}</td>
        <td class="flk__fips">${esc(r[0])}</td></tr>`).join('');
  return `<p class="flk__tcap" id="flk-cap-counties">The ${N(COUNTY_ROWS)} counties with the most cameras mapped in them,
        of ${N(f.coverage.counties_in_roster)} in the roster, ${esc(String(f.copy.headline_qualifier || ''))}.
        ${N(f.coverage.counties_with_none_mapped)} counties have none mapped and are not a tail of this
        ranking — they are outside it, because nobody has looked.</p>
  <div class="flk__tw">
    <table class="flk__t" aria-describedby="flk-cap-counties">
      <thead><tr><th scope="col">#</th><th scope="col">County</th><th scope="col">State</th>
        <th scope="col">Cameras mapped</th><th scope="col">FIPS</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Field completeness. What the tags actually carry, and what they do not.
// ---------------------------------------------------------------------------

const FIELDS = Object.freeze([
  ['direction_tagged', 'direction', 'Which way the lens points. The field this page is built on.'],
  ['camera_type', 'camera:type', 'Fixed, dome, panning. Almost always fixed.'],
  ['surveillance_visibility', 'surveillance', 'Whether the camera watches a public or private space.'],
  ['surveillance_zone', 'surveillance:zone', 'What it is pointed at. Almost always traffic.'],
  ['camera_mount', 'camera:mount', 'Pole, street lamp, traffic signal, wall.'],
  ['operating_agency', 'operator / operator:type', 'Who runs it. Recorded for one camera in eight.'],
]);

function completeness(f) {
  const total = Number(f.totals.mapped_worldwide);
  const rows = FIELDS.map(([key, tag, why]) => {
    const c = fieldCoverage(f)[key];
    if (!c) return '';
    return `
      <li class="flk__fc">
        <div class="flk__fc__top">
          <code class="flk__tag">${esc(tag)}</code>
          <b class="flk__fc__n">${pct(c.share_present)}</b>
        </div>
        <div class="flk__fc__bar"><span style="--w:${pct(c.share_present, 2)}"></span></div>
        <p class="flk__fc__l"><b>${N(c.present)}</b> of ${N(total)} carry it; ${N(c.missing)} do not.
          ${esc(why)}</p>
      </li>`;
  }).filter(Boolean).join('');
  // Empty, not an empty list: the caller uses the empty string to decide
  // whether the whole section exists, and a heading over nothing is a bug.
  if (!rows) return '';
  return `<ul class="flk__fcs">${rows}</ul>`;
}

// ---------------------------------------------------------------------------
// Who operates them — and the caveat that makes the ranking readable.
// ---------------------------------------------------------------------------

const AGENCY_ROWS = 12;

function agencies(f) {
  const list = (f.field_values && f.field_values.operating_agency) || [];
  if (!list.length) return '';
  const named = list.filter((r) => r.value !== '(all other values)').slice(0, AGENCY_ROWS);
  const folded = list.find((r) => r.value === '(all other values)');
  const cov = fieldCoverage(f).operating_agency;
  if (!cov || !Number.isFinite(Number(cov.present)) || Number(cov.present) <= 0) return '';
  const rows = named.map((r, i) => `
      <tr><td class="flk__rank">${i + 1}</td><th scope="row">${esc(r.value)}</th>
        <td>${N(r.n)}</td><td>${ratio(r.n, cov.present)}</td></tr>`).join('');
  const tail = folded
    ? `<tr class="is-fold"><td class="flk__rank">—</td>
        <th scope="row">${esc(folded.value)}</th><td>${N(folded.n)}</td>
        <td>${ratio(folded.n, cov.present)}</td></tr>`
    : '';
  return `<p class="flk__tcap" id="flk-cap-operators">The ${N(named.length)} operators named most often, of the
        ${N(cov.present)} cameras that name one at all — ${pct(cov.share_present)} of those mapped.
        Shares below are of that ${N(cov.present)}, never of the whole.</p>
  <div class="flk__tw">
    <table class="flk__t" aria-describedby="flk-cap-operators">
      <thead><tr><th scope="col">#</th><th scope="col">Operator as tagged</th>
        <th scope="col">Cameras</th><th scope="col">Share of those naming one</th></tr></thead>
      <tbody>${rows}${tail}</tbody>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Page furniture.
// ---------------------------------------------------------------------------

function counters(f, m) {
  const t = f.totals;
  const cov = f.coverage;
  const fc = fieldCoverage(f);
  const items = [
    {
      n: N(t.mapped_worldwide), l: 'cameras mapped',
      s: `${esc(String(f.copy.headline_qualifier || ''))}. Not a count of cameras that exist.`,
      wide: true,
    },
    {
      // Printed as one numeral and not as "2,287/3,235": at 375px the slashed
      // form is 11 mono glyphs at the --t-xl step and overflows its half-width
      // cell, and a clipped denominator is worse than no denominator. The
      // denominator moves into the subtitle, where it has room to be read.
      n: N(cov.counties_with_mapped_cameras), l: 'counties with any',
      s: `of ${N(cov.counties_in_roster)}. The other ${N(cov.counties_with_none_mapped)} have none `
        + 'mapped, which means nobody has mapped them.',
    },
    fc.direction_tagged ? {
      n: pct(fc.direction_tagged.share_present), l: 'carry a bearing',
      s: `${N(fc.direction_tagged.present)} cameras state which way they look.`,
    } : null,
    fc.operating_agency ? {
      n: pct(fc.operating_agency.share_present), l: 'name an operator',
      s: `For the other ${N(fc.operating_agency.missing)}, OSM does not say who runs the camera.`,
    } : null,
    m.hasGrid ? {
      n: N(m.totalCells), l: `occupied ${m.cellDeg}° cells`,
      s: `The densest holds ${N(f.grid && f.grid.max_cell_count)}.`,
    } : null,
  ].filter(Boolean);
  return `<ul class="flk__c">${items.map((i) => `
    <li class="flk__c__i${i.wide ? ' flk__c__i--wide' : ''}">
      <b class="flk__c__n">${i.n}</b>
      <span class="flk__c__l">${esc(i.l)}</span>
      <span class="flk__c__s">${i.s}</span>
    </li>`).join('')}</ul>`;
}

function theCaveat(f) {
  const cov = f.coverage;
  return `<section class="flk__warn" aria-labelledby="flk-warn-h">
  <h2 class="flk__warn__h" id="flk-warn-h">${icon('sec-signal')} Read this before you read the map</h2>
  <p class="flk__warn__p flk__warn__p--lead">${esc(cov.what_zero_means || '')}</p>
  <p class="flk__warn__p">${esc(cov.why_it_is_uneven || '')}</p>
  <p class="flk__warn__p">${esc(cov.not_reconciled_with_vendor_figures || '')}</p>
  <p class="flk__warn__p flk__warn__p--last">So the only claim any figure on this page makes is the
    one in its own caption: this many cameras are <b>written down in OpenStreetMap</b>
    ${esc(String(f.copy.headline_qualifier || '').replace(/^as mapped in OpenStreetMap /, ''))}.
    Comparing two regions on this page is partly comparing two regions' mapping effort, and nothing
    here separates the two.</p>
</section>`;
}

const JUMPS = [
  ['#the-map', 'The map'],
  ['#jurisdictions', 'Jurisdictions'],
  ['#direction', 'Which way they look'],
  ['#fields', 'What the tags carry'],
  ['#operators', 'Operators'],
  ['#limits', 'What this is not'],
  ['#method', 'Method'],
];

/**
 * The jump nav is built from the sections that were ACTUALLY rendered, not
 * from the constant above. An in-page anchor to a section this build omitted
 * is a link that silently does nothing, which is the same failure as a nav
 * tile pointing at a 404 — just quieter.
 */
function jumpNav(present) {
  const rows = JUMPS.filter(([h]) => present.has(h.slice(1)));
  if (rows.length < 2) return '';
  return `<nav class="flk__j" aria-label="Sections of this page"><ul>${
    rows.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join('')
  }</ul></nav>`;
}

function limits(f) {
  const rows = (Array.isArray(f.honesty) ? f.honesty : [])
    .map((s) => `<li>${esc(s)}</li>`).join('');
  return `<ul class="flk__lim">${rows}</ul>`;
}

function methodSection(ctx, f, m) {
  const c = f.collection || {};
  const s = f.source || {};
  const g = f.geography || {};
  const checks = Array.isArray(c.seed_cross_checks) ? c.seed_cross_checks : [];
  // build.mjs hands the template a POINTER to the packed per-camera arrays —
  // where they land and how big they are — rather than the arrays themselves,
  // so the page can offer them honestly without inlining 2.6 MiB of
  // coordinates. Null means the file was absent, and the row is then omitted
  // rather than linking a 404.
  const points = pointsOf(ctx);
  const checkRows = checks.map((k) => `
      <tr><th scope="row">${esc(k.seed)}</th><td>${N(k.counted)}</td><td>${N(k.collected)}</td>
        <td>${k.shortfall ? '<b class="flk__bad">shortfall</b>' : 'no shortfall'}</td></tr>`).join('');

  return `<section class="flk__sec" id="method" aria-labelledby="flk-method-h">
  <h2 class="flk__sec__h" id="flk-method-h">${icon('sec-method')} Where this came from</h2>

  <p class="flk__sec__l"><b>${esc(s.label || 'OpenStreetMap via Overpass')}.</b> Every camera here is
    an OpenStreetMap object tagged ${(s.base_filter || []).map((x) => `<code class="flk__tag">${esc(x)}</code>`).join(' and ')},
    carrying at least one of ${(s.flock_tags_unioned || []).map((x) => `<code class="flk__tag">${esc(x)}</code>`).join(', ')}.
    The three are unioned rather than taken one at a time, because they overlap:
    ${N(f.totals.carrying_more_than_one_flock_tag)} objects carry more than one of them and would
    otherwise be counted twice. OpenStreetMap's own snapshot clock for this extract reads
    <b>${esc(s.osm_timestamp || '—')}</b>; this page was generated <b>${utc(f.generated_at)}</b>.</p>

  <p class="flk__sec__l">${esc(s.recompute || '')}</p>

  <h3 class="flk__sec__h3">The harvest</h3>
  <p class="flk__sec__l">A single United States query is about 42 MB and times out, so the planet was
    tiled: <b>${N((c.seed_boxes || []).length)} seed boxes</b> covering it exactly once with no gap and
    no overlap, the contiguous states pre-cut into a grid. <b>${N(c.data_queries)} data queries</b> and
    <b>${N(c.count_queries)} count queries</b> were issued to
    ${(c.endpoints_used || []).length === 1 ? 'one endpoint' : `${N((c.endpoints_used || []).length)} endpoints`};
    ${N(c.tiles_split)} tiles needed splitting, ${N(c.max_depth_used)} levels of recursion were used and
    ${N(c.duplicates_across_tile_edges)} duplicates were absorbed at tile edges.</p>
  <p class="flk__sec__l">${esc(c.integrity || '')}</p>
  <p class="flk__tcap" id="flk-cap-seeds">The integrity check, one row per seed box: what the server counted
        before the fetch against what the fetch actually yielded.</p>
  <div class="flk__tw">
    <table class="flk__t" aria-describedby="flk-cap-seeds">
      <thead><tr><th scope="col">Seed box</th><th scope="col">Counted</th>
        <th scope="col">Collected</th><th scope="col">Verdict</th></tr></thead>
      <tbody>${checkRows}</tbody>
    </table>
  </div>
  <p class="flk__sec__n">The conus row collects two more than it counted. That is not an error and it
    is not rounded away: OpenStreetMap was edited between the count query and the fetch, and the two
    cameras added in that window are real.</p>

  <h3 class="flk__sec__h3">Geography</h3>
  <p class="flk__sec__l">Counties and states come from <b>${esc(g.label || 'Census TIGERweb')}</b>,
    ${N(g.counties)} county polygons simplified to about ${g.simplify_deg ? `${Number(g.simplify_deg)}°` : '—'}
    — roughly 550 m. ${N(f.totals.near_a_county_boundary)} cameras sit close enough to a county line
    that the assignment could belong to the neighbour, and ${N(f.totals.outside_any_us_county)} fall
    outside any US county and are kept rather than dropped.</p>

  <h3 class="flk__sec__h3">Licence</h3>
  <p class="flk__sec__l"><b>${esc(f.copy.attribution_required)}</b> —
    <a href="${esc(f.copy.attribution_url)}" rel="license noopener">${esc(f.copy.attribution_url)}</a>.
    ${esc((s.licence && s.licence.data) || 'Open Database License (ODbL) v1.0')}.
    ${esc(f.copy.attribution_note || '')}</p>

  <h3 class="flk__sec__h3">Take the data</h3>
  <p class="flk__sec__l">Both files are published beside this page, byte-identical to what the
    collector wrote — the build copies them verbatim rather than re-serialising, so the checksum of
    the file in the repository is the checksum of the file served here.</p>
  <ul class="flk__dl">
    <li><a href="${esc(ctx.href('/api/flock.json'))}"><code class="flk__tag">/api/flock.json</code></a>
      <span>Every number on this page: the totals, the coverage block, all
        ${N(f.coverage.counties_in_roster)} counties including the
        ${N(f.coverage.counties_with_none_mapped)} with none mapped, and the
        ${N(m.totalCells)}-cell grid this map is drawn from.</span></li>
    ${points ? `<li><a href="${esc(ctx.href(points.href))}"><code class="flk__tag">${esc(points.href)}</code></a>
      <span>${N(f.points_file && f.points_file.count)} individual cameras as four packed integer
        arrays — latitude, longitude, bearing and state. ${N(Math.round(points.bytes / 1024))}&nbsp;KiB.
        A bearing of &minus;1 means <b>no usable direction tag</b>, not north. The page never inlines
        it. The map offers to fetch it once you are zoomed past 12× — a button, not an ambush, because
        ${esc(points.mb)}&nbsp;MB over the wire is the reader's decision — and past 40× draws each
        camera with its bearing.</span></li>` : ''}
  </ul>

  <h3 class="flk__sec__h3">Recompute it</h3>
  <p class="flk__sec__l">Substitute a bounding box for the four zeroes and POST it to
    <code class="flk__tag">${esc(s.endpoint || '')}</code> as a form-encoded
    <code class="flk__tag">data=</code> field. A raw POST body answers HTTP 406.</p>
  <pre class="flk__pre"><code>${esc(s.query_template || '')}</code></pre>

  <p class="flk__sec__stamp">Source state <b>${esc(s.state || '—')}</b> ·
    refreshed every ${N(s.refresh_days)} days · no API key ·
    page generated ${utc(f.generated_at)} · built by
    <a href="${esc(brand.REPO_URL)}" rel="noopener">collector/flock.mjs</a>.</p>
</section>`;
}

// ---------------------------------------------------------------------------

/**
 * The three optional sections, each returning the empty string when the
 * collector has not published what it needs. Omission is the honest failure:
 * a rose with no counts would be a picture of nothing and a completeness bar
 * with no denominator would be a zero standing in for an unknown.
 */
function directionSection(f) {
  if (!hasDirection(f)) return '';
  const d = f.direction;
  const fc = fieldCoverage(f);
  const t = f.totals;
  const parsed = d.counts.reduce((a, b) => a + Number(b), 0);
  const untagged = Number(t.mapped_worldwide) - parsed;
  const noTag = fc.direction_tagged ? fc.direction_tagged.missing : null;
  const unparsed = Number.isFinite(Number(fc.direction_unparseable)) ? fc.direction_unparseable : null;
  const split = (noTag !== null && unparsed !== null)
    ? ` (${N(noTag)} carry no direction tag at all and ${N(unparsed)} carry one this collector could
       not parse)`
    : '';
  const fov = d.field_of_view;
  const widths = (fov && Array.isArray(fov.widths_deg)) ? fov.widths_deg : [];

  return `<section class="flk__sec" id="direction" aria-labelledby="flk-dir-h">
  <h2 class="flk__sec__h" id="flk-dir-h">${icon('sec-signal')} Which way they look
    <span class="flk__count num">${N(parsed)}</span></h2>
  <p class="flk__sec__l">${esc(d.note || '')} ${esc(d.units ? `Units: ${d.units}.` : '')}</p>
  <div class="flk__split">
    ${roseFigure(f)}
    ${roseTable(f)}
  </div>
  ${d.exactly_zero ? `<p class="flk__sec__n"><b>* The north bin is inflated and nothing here hides
    it.</b> ${esc(d.exactly_zero.caution || '')} ${N(d.exactly_zero.cameras)} cameras —
    ${pct(d.exactly_zero.share_of_parsed)} of those with a parsed bearing — are in that state.</p>` : ''}
  <p class="flk__sec__n"><b>The untagged are not in the rose.</b> ${N(untagged)} cameras have no
    usable bearing${split}. They are absent from every wedge above rather than binned as north, which
    is why the rose totals ${N(parsed)} and not ${N(t.mapped_worldwide)}.</p>

  ${Array.isArray(d.tag_forms) && d.tag_forms.length ? `
  <h3 class="flk__sec__h3">How the bearing was written</h3>
  <p class="flk__sec__l">OpenStreetMap accepts ${N(d.tag_forms.length)} forms in this field and they
    are not equally solid. One of them is <b>derived rather than tagged</b>, and a page that folded
    them all together would be publishing a computation as an observation.</p>
  <ul class="flk__forms">${d.tag_forms.map((r) => `
    <li><b class="flk__forms__n">${N(r.n)}</b>
      <code class="flk__tag">${esc(r.value)}</code>
      <span>${esc((d.tag_form_legend && d.tag_form_legend[r.value]) || '')}</span></li>`).join('')}</ul>` : ''}
  ${fov ? `<p class="flk__sec__n">${N(fov.cameras_with_an_arc)} cameras state a field of view as well
    as a bearing${widths.length ? ` — most commonly ${esc(widths[0].value)}° wide, on
    ${N(widths[0].n)} of them` : ''}. ${esc(fov.note || '')}</p>` : ''}
</section>`;
}

function fieldsSection(f) {
  const body = completeness(f);
  if (!body) return '';
  return `<section class="flk__sec" id="fields" aria-labelledby="flk-fields-h">
  <h2 class="flk__sec__h" id="flk-fields-h">${icon('sec-api')} How complete the data is<span class="sec__eb">What the tags carry</span></h2>
  <p class="flk__sec__l">A tag is only present if a volunteer typed it. This is the completeness of
    each field across the ${N(f.totals.mapped_worldwide)} mapped objects — the honest denominator for
    every figure on this page, and the reason the operator ranking below is a fact about attribution
    rather than about deployment.</p>
  ${body}
</section>`;
}

function operatorsSection(f) {
  const cov = fieldCoverage(f).operating_agency;
  const table = agencies(f);
  if (!cov || !table) return '';
  return `<section class="flk__sec" id="operators" aria-labelledby="flk-ops-h">
  <h2 class="flk__sec__h" id="flk-ops-h">${icon('sec-substrate')} Who is recorded as operating them
    <span class="flk__count num">${pct(cov.share_present)}</span></h2>
  <p class="flk__sec__l flk__sec__l--warn"><b>Do not read this as a deployment ranking.</b> Only
    ${N(cov.present)} of ${N(f.totals.mapped_worldwide)} cameras record an operator at all. A chain
    store's cameras are easy for a passing mapper to attribute; a municipality's usually are not.
    This table measures who is <em>easy to attribute</em>, which is a different thing from who
    deploys the most.</p>
  ${table}
</section>`;
}

export function render(ctx) {
  if (!hasFlock(ctx)) return emptyPage(ctx);
  const f = ctx.flock;
  const m = model(f);
  const t = f.totals;
  const cov = f.coverage;
  const dirOn = hasDirection(f);
  const q = String(f.copy.headline_qualifier || '');

  const parsedDir = dirOn ? f.direction.counts.reduce((a, b) => a + Number(b), 0) : null;

  // Built first, so the jump nav can be built from what exists rather than
  // from a constant that hopes it does.
  const secDirection = directionSection(f);
  const secFields = fieldsSection(f);
  const secOperators = operatorsSection(f);
  const present = new Set(['the-map', 'jurisdictions', 'limits', 'method']);
  if (secDirection) present.add('direction');
  if (secFields) present.add('fields');
  if (secOperators) present.add('operators');

  const headline = `${N(t.mapped_worldwide)} Flock ALPR cameras ${q}`;

  const description =
    `Flock Safety automated licence-plate-reader cameras ${q}: ${N(t.mapped_worldwide)} objects, `
    + `binned to ${N(m.totalCells)} cells of ${m.cellDeg}° and ranked by state and county. `
    + `${N(cov.counties_with_none_mapped)} of ${N(cov.counties_in_roster)} counties have none mapped, `
    + `which means nobody has mapped them rather than that there are none. `
    + (dirOn ? `${N(parsedDir)} cameras state which way they face and the bearings are plotted. ` : '')
    + `Open Database Licence data, © OpenStreetMap contributors. `
    + `Compiled ${utc(f.generated_at)}.`;

  const main = `<style>${flockCss()}</style>
${iconSprite({ only: SPRITE })}
<div class="flk">

<section class="flk__hero">
  <p class="flk__eyebrow">Plate readers · a ${esc(brand.NAME)} register · does not feed the main number</p>
  <h1 class="flk__h1">Number-plate cameras, mapped</h1>
  <p class="flk__sub">Flock Safety automated licence-plate-reader cameras, as OpenStreetMap has them</p>
  <p class="flk__lede">An ALPR is a camera pointed at a road that reads every number plate that passes
    it. Flock Safety builds them and sells them to police departments, sheriffs' offices, homeowners'
    associations and retailers. This page is a register of the ones somebody has written down in
    OpenStreetMap — a public, openly-licensed map that anyone can read and anyone can edit — and it is
    a register of nothing else.</p>
  <p class="flk__plain">${N(t.mapped_worldwide)} cameras, ${esc(q)}. That is the number of map
    objects, not the number of cameras. ${esc(cov.what_zero_means || '')}</p>
  ${counters(f, m)}
</section>

${theCaveat(f)}

${jumpNav(present)}

<section class="flk__sec" id="the-map" aria-labelledby="flk-map-h">
  <h2 class="flk__sec__h" id="flk-map-h">${icon('sec-map')} The map
    <span class="flk__count num">${N(m.drawnCameras)}</span></h2>
  <p class="flk__sec__l">Every camera is binned into a cell ${m.cellDeg}° on a side — about 28 km of
    latitude — and each occupied cell is drawn as its own projected quadrilateral, shaded by how many
    are in it. <b>Land with no mapped camera is hatched, not left blank</b>, because a blank would be
    an assertion this data cannot make. The picture needs no JavaScript and every figure in it is a
    number in the tables below. With it, the map pans and zooms, reads out any cell you point at,
    and — once you are in close — offers the individual cameras, each with the way its lens points.</p>
  ${mapFigure(f, m, ctx)}
  ${mapKey(f, m)}
</section>

<section class="flk__sec" id="jurisdictions" aria-labelledby="flk-jur-h">
  <h2 class="flk__sec__h" id="flk-jur-h">${icon('sec-substrate')} Jurisdictions
    <span class="flk__count num">${N(cov.states_with_mapped_cameras)}/${N(cov.states_and_territories_in_roster)}</span></h2>
  <p class="flk__sec__l">Ranked by cameras mapped. Read the <b>counties with none mapped</b> column
    beside every row: ${esc(m.states[0] && m.states[0].name || '')} tops the ranking with
    ${N(m.states[0] && m.states[0].cameras_mapped)} and still has
    ${N(m.states[0] && m.states[0].counties_with_none_mapped)} counties nobody has mapped. A state that
    looks saturated and a state that looks empty may differ only in how many people were looking.</p>
  ${stateTable(f, m)}

  <h3 class="flk__sec__h3">The counties with the most in them</h3>
  ${countyTable(f, m)}
</section>

${secDirection}

${secFields}

${secOperators}

<section class="flk__sec" id="limits" aria-labelledby="flk-lim-h">
  <h2 class="flk__sec__h" id="flk-lim-h">${icon('sec-signal')} What this is not</h2>
  <p class="flk__sec__l">Published by the collector, printed here unedited.</p>
  ${limits(f)}
  <p class="flk__sec__n">This is a snapshot and not a time series. Nothing here says when a camera was
    installed or whether it is switched on — only that an OpenStreetMap object exists. A camera taken
    down keeps its tag until somebody visits and removes it.</p>
</section>

${methodSection(ctx, f, m)}

</div>`;

  return page({
    ctx,
    path: PATH,
    title: `Number-plate cameras, mapped — ${headline} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${headline}`,
    description,
    ogImage: ctx.cardFor ? ctx.cardFor('flock') : null,
    ogImageAlt: `${brand.NAME} density map of Flock ALPR cameras ${q}`,
    jsonld: [dataset(ctx, f, m)],
    main,
  });
}

/** ctx.flock absent. Builds, says so plainly, and carries noindex. */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `Number-plate cameras · ${brand.NAME}`,
    description: 'The Flock ALPR register is not in this build.',
    main: `<div class="flk"><section class="flk__hero">
  <p class="flk__eyebrow">Plate readers · a ${esc(brand.NAME)} register</p>
  <h1 class="flk__h1">Number-plate cameras, mapped</h1>
  <p class="flk__lede">This build carries no <code>data/flock.json</code>, so there is nothing to
    draw. The page exists and says so rather than inventing a map. Run
    <code>collector/flock.mjs</code> and rebuild.</p>
</section></div>`,
  });
}

function dataset(ctx, f, m) {
  const s = f.source || {};
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} — Flock Safety ALPR cameras as mapped in OpenStreetMap`,
    description:
      'Automated licence-plate-reader cameras attributed to Flock Safety in OpenStreetMap, counted '
      + 'by county, state and quarter-degree cell, with the compass bearing each camera is tagged as '
      + 'facing. A count of map objects, not a count of cameras that exist: coverage is volunteer-'
      + 'driven and uneven, and a county with none mapped is a county nobody has mapped.',
    url: ctx.url(PATH),
    license: (s.licence && s.licence.url) || 'https://www.openstreetmap.org/copyright',
    creditText: (s.licence && s.licence.attribution) || '© OpenStreetMap contributors',
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    dateModified: f.generated_at,
    temporalCoverage: s.osm_timestamp || f.generated_at,
    isAccessibleForFree: true,
    keywords: ['ALPR', 'automatic licence plate recognition', 'surveillance', 'OpenStreetMap',
      'Flock Safety', 'computer vision'],
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'cameras mapped worldwide', value: Number(f.totals.mapped_worldwide) },
      { '@type': 'PropertyValue', name: 'cameras mapped inside a US county', value: Number(f.totals.in_a_us_county) },
      { '@type': 'PropertyValue', name: 'counties with at least one mapped camera', value: Number(f.coverage.counties_with_mapped_cameras) },
      { '@type': 'PropertyValue', name: 'counties with none mapped', value: Number(f.coverage.counties_with_none_mapped) },
      ...(fieldCoverage(f).direction_parsed
        ? [{ '@type': 'PropertyValue', name: 'cameras carrying a parsed compass bearing', value: Number(fieldCoverage(f).direction_parsed.present) }] : []),
      ...(fieldCoverage(f).operating_agency
        ? [{ '@type': 'PropertyValue', name: 'cameras naming an operator', value: Number(fieldCoverage(f).operating_agency.present) }] : []),
      ...(m.hasGrid
        ? [{ '@type': 'PropertyValue', name: 'occupied grid cells', value: Number(m.totalCells) }] : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// CSS. Scoped to this page, shared tokens only, mobile first: every rule below
// starts at one column and widens.
//
// The density ramp is declared as two explicit sets rather than as one set with
// opacity, because the light scheme needs darker ink on paper and the dark
// scheme needs lighter ink on ink, and an opacity ramp gives you one of those
// two at the cost of the other. Both sets were picked for monotonic lightness
// so the order survives greyscale — the ramp is ordinal and an ordinal scale
// that scrambles when printed is not a scale.
// ---------------------------------------------------------------------------

// MEASURED, not chosen by eye. Relative luminance on paper:
//
//   dark   .095 .191 .317 .380 .514 .779   (on --flk-land .008)
//   light  .472 .302 .189 .104 .067 .026   (on --flk-land .800)
//
// Strictly monotonic in BOTH, which the site's own heat ramp is not and which
// matters more here: this is an ORDINAL scale, and an ordinal scale that
// scrambles its order when printed in greyscale or seen by a reader with
// deuteranopia is not a scale, it is decoration. The hue runs cool to warm in
// both schemes and the direction of the lightness reverses with the ground —
// on ink, more is brighter; on paper, more is darker — so "denser" reads the
// same way round in each.
//
// Every class also clears the land it sits on: the faintest, ONE camera, is
// 2.53:1 against the dark land and 1.70:1 against the light, which is above
// the hatch's own 1.77 / 1.62 in each. A single-camera cell has to be visibly
// a cell and not a patch of texture, because that is the distinction the whole
// page turns on.
const RAMP_DARK = {
  c1: '#47596b', c2: '#5b7d97', c3: '#65a0c0', c4: '#6fb39c', c5: '#eeb453', c6: '#ffe1a6',
};
const RAMP_LIGHT = {
  c1: '#aeb8c2', c2: '#8298ac', c3: '#5c7c96', c4: '#356073', c5: '#6b3f0b', c6: '#5a1207',
};

function rampVars(ramp, indent = '  ') {
  return Object.entries(ramp).map(([k, v]) => `${indent}--flk-${k}: ${v};`).join('\n');
}

function rampRules() {
  return Object.keys(RAMP_DARK).map((k) => (
    `.flk__c--${k}{fill:var(--flk-${k})}\n.flk__sw--${k}{background:var(--flk-${k})}`
  )).join('\n');
}

function flockCss() {
  return `
.flk {
${rampVars(RAMP_DARK)}
  --flk-land: var(--bg-raised);
  --flk-line: var(--rule);
  --flk-hatch: #39414b;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) .flk {
${rampVars(RAMP_LIGHT, '    ')}
    --flk-land: #ecece6;
    --flk-line: #c9c5bb;
    --flk-hatch: #bfbbb0;
  }
}
:root[data-theme="light"] .flk {
${rampVars(RAMP_LIGHT)}
  --flk-land: #ecece6;
  --flk-line: #c9c5bb;
  --flk-hatch: #bfbbb0;
}
:root[data-theme="dark"] .flk {
${rampVars(RAMP_DARK)}
  --flk-land: var(--bg-raised);
  --flk-line: var(--rule);
  --flk-hatch: #39414b;
}

.flk .dcico{flex:none}
.flk__sec__h .dcico,.flk__warn__h .dcico{--ico:1.05em;color:var(--accent)}
.flk__vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}

/* ---- hero ---------------------------------------------------------------- */
.flk__hero{margin:0 0 var(--sec)}
.flk__eyebrow{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.flk__h1{font:600 clamp(1.6rem,7vw,2.4rem)/1.08 var(--sans);letter-spacing:-.02em;margin:0 0 var(--s-3)}
.flk__sub{font:500 var(--t-sm)/1.5 var(--mono);color:var(--ink-dim);margin:0 0 var(--s-3);letter-spacing:.01em}
.flk__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:62ch}
.flk__plain{font:400 var(--t-base)/1.55 var(--sans);margin:0 0 var(--s-5);max-width:60ch;
  padding:var(--s-3) var(--s-4);background:var(--wash-alt);border-left:3px solid var(--accent);
  border-radius:var(--radius)}

.flk__c{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:1px;
  background:var(--rule-soft);border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden}
.flk__c__i{background:var(--bg);padding:var(--s-3);display:flex;flex-direction:column;gap:2px;min-width:0}
.flk__c__i--wide{grid-column:1 / -1}
/* overflow-wrap, not a smaller step: the numeral is the point of the tile and
   shrinking it to fit the longest string on the page shrinks the other four
   too. Measured at 375px, the widest of these is 7 mono glyphs and fits. */
.flk__c__n{font:600 var(--t-xl)/1.05 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);
  overflow-wrap:anywhere}
.flk__c__l{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim)}
.flk__c__s{font:400 var(--t-2xs)/1.45 var(--sans);color:var(--ink-faint)}

/* ---- the caveat, above the map ------------------------------------------- */
.flk__warn{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-4);
  margin:0 0 var(--sec);background:var(--bg-raised)}
.flk__warn__h{font:600 var(--t-base)/1.3 var(--sans);margin:0 0 var(--s-3);
  display:flex;align-items:center;gap:8px}
.flk__warn__p{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);max-width:66ch}
.flk__warn__p--lead{font-size:var(--t-base);color:var(--ink)}
.flk__warn__p--last{margin-bottom:0}
.flk__warn__p b{color:var(--ink)}

.flk__j{margin:0 0 var(--sec);border-top:1px solid var(--rule-soft);
  border-bottom:1px solid var(--rule-soft);padding:var(--s-2) 0}
.flk__j ul{list-style:none;margin:0;padding:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin}
.flk__j a{display:inline-flex;align-items:center;flex:0 0 auto;padding:6px 10px;
  border:1px solid var(--rule);border-radius:7px;text-decoration:none;color:var(--ink-dim);
  font:500 var(--t-2xs)/1 var(--mono);letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.flk__j a:hover{color:var(--ink);border-color:var(--accent)}

/* ---- sections ------------------------------------------------------------ */
.flk__sec{margin:0 0 var(--sec-lg);scroll-margin-top:calc(var(--rail-h) + 12px)}
.flk__sec__h{font:600 var(--t-xl)/1.15 var(--sans);letter-spacing:-.01em;margin:0 0 var(--s-3);
  display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.flk__sec__h3{font:600 var(--t-base)/1.3 var(--sans);margin:var(--s-6) 0 var(--s-2)}
.flk__sec__l{font:400 var(--t-sm)/1.65 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:68ch}
.flk__sec__l b{color:var(--ink)}
.flk__sec__l--warn{border-left:3px solid var(--accent);padding-left:var(--s-3)}
.flk__sec__n{font:400 var(--t-xs)/1.7 var(--sans);color:var(--ink-faint);margin:var(--s-4) 0 0;max-width:68ch}
.flk__sec__n b{color:var(--ink-dim)}
.flk__sec__stamp{font:400 var(--t-xs)/1.8 var(--mono);color:var(--ink-faint);margin:var(--s-5) 0 0;
  padding-top:var(--s-3);border-top:1px solid var(--rule-soft);overflow-wrap:anywhere}
.flk__count{font:600 var(--t-xs)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--accent-2);
  border:1px solid var(--rule);border-radius:3px;padding:3px 7px;letter-spacing:.02em}
.flk__bad{color:var(--dark-src)}

/* ---- the map ------------------------------------------------------------- */
.flk__fig{margin:0;padding:0}
.flk__inmap{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);
  padding:var(--s-3);border:1px dashed var(--rule);border-radius:var(--radius);
  background:var(--bg-raised);max-width:none}
.flk__inmap b{color:var(--ink)}
.flk__svg{display:block;width:100%;height:auto;background:var(--bg-sunken);
  border:1px solid var(--rule-soft);border-radius:var(--radius)}
.flk__base{fill:var(--flk-land);stroke:none}
/* TWO HATCHES, ONE MEANING. The pattern is declared in viewBox units, so its
   pitch shrinks with the picture: the fine tile is 7 units, which is 4.9 CSS
   pixels at 700px wide and 2.6 at 375 — below the width at which a 1-unit line
   survives rasterisation at all. Measured on a phone the fine hatch rendered
   as a flat grey wash, which is the exact reading this page exists to prevent.
   So the narrow view gets a coarser tile carrying the identical meaning, and
   the swap is a fill reference rather than a second layer. */
.flk__hatch{fill:url(#flk-hatch);stroke:none}
@media (max-width: 760px){ .flk__hatch{fill:url(#flk-hatch-lg)} }
.flk__hl{stroke:var(--flk-hatch);fill:none}
.flk__edge{fill:none;stroke:var(--flk-line);stroke-width:1;stroke-linejoin:round}
.flk__cells path{stroke:none;shape-rendering:crispEdges}
${rampRules()}
.flk__cap{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);margin:var(--s-3) 0 0;max-width:74ch}
.flk__cap a{color:var(--accent-2)}

/* ---- the map, live ------------------------------------------------------
   Nothing below paints until the script adds flk--live, so the no-script
   render is untouched. Stroke widths that must stay one screen pixel wide
   under zoom are set inline by the script, quantised to half-octaves. */
.flk__fig{scroll-margin-top:calc(var(--rail-h,28px) + 12px)}
.flk__stage{position:relative}
.flk--live .flk__stage{touch-action:none;outline:none;border-radius:var(--radius)}
.flk--live .flk__stage:focus-visible{box-shadow:0 0 0 2px var(--accent)}
.flk--live .flk__svg{cursor:grab}
.flk--live.flk--grab .flk__svg{cursor:grabbing}
.flk--anim .flk__vp{transition:transform .24s cubic-bezier(.22,.61,.36,1)}
.flk__ctl{position:absolute;top:8px;right:8px;display:flex;flex-wrap:wrap;justify-content:flex-end;
  gap:4px;max-width:calc(100% - 16px)}
.flk__cb{min-width:34px;height:34px;padding:0 10px;font:600 16px/1 var(--mono);background:var(--bg-raised);
  color:var(--ink);border:1px solid var(--rule);border-radius:var(--radius);cursor:pointer}
.flk__cb:hover{border-color:var(--accent);color:var(--accent)}
.flk__cb[disabled]{opacity:.6;cursor:default}
.flk__cb--t{font:600 12px/1 var(--mono);letter-spacing:.04em}
.flk__hud{position:absolute;left:8px;bottom:8px;margin:0;padding:6px 10px;display:flex;flex-wrap:wrap;
  gap:2px 10px;align-items:baseline;font:400 var(--t-xs)/1.45 var(--sans);color:var(--ink-dim);
  background:var(--bg-raised);border:1px solid var(--rule);border-radius:var(--radius);
  max-width:calc(100% - 16px);pointer-events:none}
.flk__hud b{color:var(--ink);font-variant-numeric:tabular-nums}
.flk__hud__z{font-family:var(--mono);color:var(--ink-faint)}
.flk__hud__sb{display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);color:var(--ink-faint)}
.flk__hud__sb i{display:block;height:6px;width:80px;border:1px solid var(--ink-dim);border-top:0;box-sizing:border-box}
.flk__hud__n:empty,.flk__hud__s:empty{display:none}
.flk__pick{fill:none;stroke:var(--accent);stroke-width:1.4;pointer-events:none}
.flk__pick:not([data-on]){display:none}
.flk__cam{fill:var(--accent);stroke:none}
.flk__cam--nodir{fill:none;stroke:var(--accent)}
.flk__cam--tick{fill:none;stroke:var(--accent);stroke-linecap:round}
.flk__keys{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);margin:var(--s-2) 0 0;max-width:74ch}
.flk__keys kbd{font-family:var(--mono);border:1px solid var(--rule);border-radius:3px;padding:0 4px}
@media (prefers-reduced-motion:reduce){.flk--anim .flk__vp{transition:none}}
/* THE [hidden] GUARD, AND IT IS NOT A DETAIL.
   The controls, the readout and the key ship with the hidden attribute because
   with no script they would be promises the page cannot keep - the script
   unhides exactly what it has wired. But display:flex above out-specifies the
   UA sheet's [hidden]{display:none}, so with JavaScript off a reader got three
   dead buttons and a readout asserting 1.0x over a map that cannot zoom. The
   same defect was found and fixed on the datacentre map; this is its twin. */
.flk__ctl[hidden],.flk__hud[hidden],.flk__keys[hidden],.flk__cb[hidden]{display:none}

/* ON A PHONE THE CHROME GETS OUT OF THE MAP. Measured 2026-10-03 at 375px:
   the stage is 343px wide and the floating controls and readout covered a
   third of the drawing. Below 560px the stage becomes a column and they dock
   under it; markup order is unchanged, so nothing moves for a screen reader. */
@media (max-width:560px){
  .flk__hud{font-size:var(--t-2xs)}
  .flk__cb{min-width:30px;height:30px}
  .flk__stage{display:flex;flex-direction:column;gap:6px}
  .flk__ctl,.flk__hud{position:static;max-width:100%;align-self:stretch;justify-content:flex-start}
  .flk__ctl{order:1}
  .flk__hud{order:2;left:auto;bottom:auto}
}

.flk__key{display:grid;grid-template-columns:1fr;gap:var(--s-3);margin:var(--s-4) 0 0}
.flk__kgrp{border:1px solid var(--rule-soft);border-radius:var(--radius);padding:var(--s-3)}
.flk__kh{font:600 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.flk__kl2{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.flk__kl2 li{display:flex;align-items:baseline;gap:8px;font:400 var(--t-xs)/1.5 var(--mono);flex-wrap:wrap}
.flk__sw-wrap{flex:none;align-self:center;display:inline-flex}
.flk__sw{width:22px;height:14px;border-radius:2px;display:block;outline:1px solid var(--rule-soft)}
/* The hatch swatch is drawn the same way the map's hatch is — same angle, same
   pitch, same ink — so the legend is a sample of the map and not a picture of
   one. A legend that draws a different texture from the layer it labels is
   worse than no legend. */
.flk__sw--hatch{background-color:var(--flk-land);
  background-image:repeating-linear-gradient(-45deg,var(--flk-hatch) 0 1.2px,transparent 1.2px 4.9px)}
.flk__kl{min-width:5.5em}
.flk__kn{color:var(--ink);font-variant-numeric:tabular-nums;margin-left:auto}
.flk__kx{color:var(--ink-faint);font-variant-numeric:tabular-nums}
.flk__kx--wide{margin-left:0;flex:1 1 14rem;font-family:var(--sans);line-height:1.55}
.flk__kx--wide b{color:var(--ink);font-weight:600}
.flk__kl2--ramp .flk__kx{flex:0 0 auto}
.flk__kp{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);margin:var(--s-3) 0 0;max-width:68ch}
.flk__kp b{color:var(--ink-dim)}

/* ---- the rose ------------------------------------------------------------ */
.flk__split{display:grid;grid-template-columns:1fr;gap:var(--s-4);align-items:start}
.flk__rose{margin:0;padding:0}
.flk__rosesvg{display:block;width:100%;max-width:26rem;height:auto;margin:0 auto;
  background:var(--bg-sunken);border:1px solid var(--rule-soft);border-radius:var(--radius)}
.flk__wedge{fill:var(--accent-2);fill-opacity:.82;stroke:var(--bg-sunken);stroke-width:1}
.flk__ring{fill:none;stroke:var(--rule);stroke-width:1;stroke-dasharray:3 4}
/* paint-order puts the halo UNDER the glyph rather than over it, so the
   number stays the shape it was. Without it the stroke eats the counters of
   the digits at 11px. */
.flk__ringt{font:600 11px var(--mono);fill:var(--ink-dim);stroke:var(--bg-sunken);stroke-width:3;
  paint-order:stroke fill;stroke-linejoin:round}
.flk__card{font:600 15px var(--mono);fill:var(--ink-dim);text-anchor:middle;letter-spacing:.06em}

/* ---- tables -------------------------------------------------------------- */
/* position:relative so the visually-hidden column labels inside resolve
   against this scroller instead of the page. span.flk__vh is absolute at
   left:381px; with a static wrapper it resolved against the initial
   containing block and took /flock to 382px wide on a 375px phone. The
   overflow-x here never clipped it, because this box was not in its
   containing-block chain. Same defect, same fix, as the status rail. */
.flk__tw{position:relative;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:var(--s-3) 0 0;
  border:1px solid var(--rule-soft);border-radius:var(--radius)}
.flk__t{border-collapse:collapse;width:100%;min-width:30rem;
  font:400 var(--t-xs)/1.45 var(--mono);font-variant-numeric:tabular-nums}
/* THE TABLE CAPTION IS A PARAGRAPH ABOVE THE TABLE, NOT A caption ELEMENT
   INSIDE IT, and that is a mobile fix rather than a style choice. (No angle
   brackets in this comment on purpose: it ships inside a style element, where
   the parser reads raw text to the first closing tag and a stray one would end
   the stylesheet early.) A caption is laid out as part of the table box, so a
   caption with a readable 74ch measure widens
   the table to 74ch — and the table lives in an overflow-x:auto wrapper, so at
   375px the whole explanation ends up 550px off the right edge where nobody
   will scroll to find it. Measured before this change: the state table's box
   was 922px wide inside a 343px wrapper, and every word of its caption past
   "All 56 states and" was unreachable without a sideways drag.

   The association survives: each table carries aria-describedby pointing at
   its paragraph, so a screen reader still announces the description with the
   table. */
.flk__tcap{margin:var(--s-3) 0 var(--s-2);
  font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);max-width:74ch}
.flk__t th,.flk__t td{padding:var(--s-2) var(--s-3);text-align:left;vertical-align:top;
  border-bottom:1px solid var(--rule-soft);white-space:nowrap}
.flk__t thead th{font:600 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);background:var(--bg-sunken)}
.flk__t tbody tr:last-child td{border-bottom:0}
.flk__t tbody th{font-weight:600;color:var(--ink)}
.flk__t--states tbody th{min-width:11rem}
.flk__ab{color:var(--ink-faint);font-weight:400}
.flk__rank{color:var(--ink-faint);width:2.5rem}
.flk__fips{color:var(--ink-faint)}
.flk__gap{color:var(--ink)}
/* ZERO IS A ROW, NOT A GAP. A state with nothing mapped gets a dotted left edge
   and the words "none mapped" rather than the numeral 0, because 0 is a
   measurement and this is the absence of one. Border plus words, so the
   distinction survives greyscale and a screen reader alike. */
.flk__t tbody tr.is-zero{background:var(--wash-alt)}
.flk__t tbody tr.is-zero th{border-left:3px dotted var(--ink-faint);color:var(--ink-dim)}
.flk__none{color:var(--ink-faint);font-style:italic;white-space:nowrap}
.flk__t tbody tr.is-top td,.flk__t tbody tr.is-top th{color:var(--ink)}
.flk__t tbody tr.is-fold th{color:var(--ink-faint);font-weight:400;font-style:italic}
.flk__flag{color:var(--accent);font-weight:700}
.flk__barcell{width:8rem;min-width:8rem}
.flk__bar{display:block;height:9px;width:var(--w);min-width:2px;border-radius:2px;
  background:var(--accent-2);margin-top:3px}

/* ---- field completeness -------------------------------------------------- */
.flk__fcs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:var(--s-3)}
.flk__fc{border:1px solid var(--rule-soft);border-radius:var(--radius);padding:var(--s-3)}
.flk__fc__top{display:flex;align-items:baseline;gap:var(--s-3);justify-content:space-between}
.flk__fc__n{font:600 var(--t-lg)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.flk__fc__bar{height:8px;border-radius:2px;background:var(--wash);margin:var(--s-2) 0;overflow:hidden}
.flk__fc__bar span{display:block;height:100%;width:var(--w);background:var(--accent-2)}
.flk__fc__l{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);margin:0;max-width:60ch}
.flk__fc__l b{color:var(--ink);font-variant-numeric:tabular-nums}
.flk__tag{font:400 .95em/1.4 var(--mono);background:var(--wash);border:1px solid var(--rule-soft);
  border-radius:3px;padding:1px 5px;color:var(--ink-dim);overflow-wrap:anywhere}

.flk__forms{list-style:none;margin:var(--s-3) 0 0;padding:0;display:grid;gap:8px}
.flk__forms li{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;
  font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint)}
.flk__forms__n{font:600 var(--t-sm)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);
  min-width:4.5em;text-align:right}

.flk__lim{list-style:none;margin:0;padding:0;display:grid;gap:9px;counter-reset:lim}
.flk__lim li{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);max-width:70ch;
  padding-left:var(--s-5);position:relative;counter-increment:lim}
.flk__lim li::before{content:counter(lim);position:absolute;left:0;top:1px;
  font:600 var(--t-2xs)/1.6 var(--mono);color:var(--accent)}

.flk__dl{list-style:none;margin:var(--s-3) 0 0;padding:0;display:grid;gap:10px}
.flk__dl li{font:400 var(--t-xs)/1.65 var(--sans);color:var(--ink-faint);max-width:68ch}
.flk__dl a{display:inline-block;margin-right:6px;text-decoration:none}
.flk__dl a:hover .flk__tag{border-color:var(--accent);color:var(--ink)}
.flk__dl b{color:var(--ink-dim)}

.flk__pre{margin:var(--s-3) 0 0;padding:var(--s-3);background:var(--bg-sunken);
  border:1px solid var(--rule-soft);border-radius:var(--radius-lg);overflow-x:auto}
.flk__pre code{font:400 var(--t-xs)/1.6 var(--mono);color:var(--ink-dim);white-space:pre}

@media (min-width: 620px){
  .flk__c{grid-template-columns:repeat(2,1fr)}
  .flk__key{grid-template-columns:1fr 1fr}
  .flk__fcs{grid-template-columns:1fr 1fr}
}
@media (min-width: 900px){
  .flk__c{grid-template-columns:repeat(4,1fr)}
  .flk__c__i--wide{grid-column:span 4}
  .flk__split{grid-template-columns:minmax(0,26rem) minmax(0,1fr)}
  .flk__fcs{grid-template-columns:repeat(3,1fr)}
}

/* Motion. Every transition below decorates a state change that has already
   happened; reduce turns the easing off and the change still happens,
   instantly. docs/MOTION.md §3. */
@media (prefers-reduced-motion: no-preference){
  .flk__j a,.flk__wedge{transition:color 120ms ease,border-color 120ms ease,fill-opacity 120ms ease}
  .flk__wedge:hover{fill-opacity:1}
}
@media (prefers-reduced-motion: reduce){
  .flk__j a,.flk__wedge{transition:none}
}
`;
}
