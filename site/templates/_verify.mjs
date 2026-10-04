// CHECK IT YOURSELF, IN THE PAGE. Every reading ships with a receipt whose
// hash covers its own contents and the hash of the receipt before it
// (collector/receipts.mjs). Until now, checking that meant cloning the repo.
// This puts the check one button away: the visitor's own browser fetches the
// public receipts, re-serialises each one with the SAME canonical JSON rule
// the collector uses, re-hashes it with WebCrypto, and walks the chain back.
//
// WHAT IT PROVES, said on the page in these words: the published record has
// not been edited after the fact. It does not prove the inputs were right;
// the methodology page and the source code are where that argument lives.
//
// Progressive enhancement: the section is real text and links without
// JavaScript, and the button is hidden until its script has run. The static
// HTML is deterministic; only the visitor's click fetches anything.

import { esc, utc } from './_html.mjs';
import * as brand from '../brand.mjs';

const DEPTH = 12;

// Kept in step with collector/receipts.mjs canonicalJson(): sorted keys, no
// whitespace, numbers as String(n), -0 as 0, undefined keys skipped.
const VERIFY_JS = `(function(){
var box=document.getElementById('vfy');if(!box||!window.crypto||!crypto.subtle||!window.fetch)return;
var btn=box.querySelector('[data-vfy-go]'),out=box.querySelector('[data-vfy-out]'),api=box.getAttribute('data-api'),depth=+box.getAttribute('data-depth')||12;
btn.hidden=false;
function canon(v){if(v===null)return'null';var t=typeof v;
if(t==='number'){if(!isFinite(v))throw new Error('non-finite number');return Object.is(v,-0)?'0':String(v);}
if(t==='string')return JSON.stringify(v);if(t==='boolean')return v?'true':'false';
if(Array.isArray(v))return'['+v.map(canon).join(',')+']';
var ks=Object.keys(v).sort(),p=[];for(var i=0;i<ks.length;i++){if(v[ks[i]]===undefined)continue;p.push(JSON.stringify(ks[i])+':'+canon(v[ks[i]]));}return'{'+p.join(',')+'}';}
function sha(s){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return'sha256:'+Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2);}).join('');});}
function hashOf(r){var c={};for(var k in r)if(k!=='hash')c[k]=r[k];return sha(canon(c));}
function idOf(t){return String(t).replace(/\\.\\d+Z$/,'Z').replace(/:/g,'-');}
function get(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u+' returned '+r.status);return r.json();});}
function line(cls,t){var p=document.createElement('p');p.className='vfy__l vfy__l--'+cls;p.textContent=t;out.appendChild(p);}
btn.addEventListener('click',function(){
 btn.disabled=true;out.textContent='';out.hidden=false;line('run','Fetching the public record…');
 Promise.all([get(api+'state.json'),get(api+'history.json')]).then(function(a){
  var st=a[0],obs=(a[1].observations||[]).slice(-depth).reverse();
  var ids=obs.map(function(o){return idOf(o.t||o.generated_at);});
  if(!ids.length)throw new Error('history.json lists no observations');
  return Promise.all(ids.map(function(id){return get(api+'receipts/'+id+'.json');})).then(function(rs){
   return Promise.all(rs.map(hashOf)).then(function(hs){
    out.textContent='';var bad=0;
    for(var i=0;i<rs.length;i++){
     var own=hs[i]===rs[i].hash,link=i===rs.length-1||rs[i].prev_hash===rs[i+1].hash;
     if(!own||!link)bad++;
     if(!own)line('bad','Receipt '+rs[i].id+': contents hash to '+hs[i].slice(0,18)+'…, but it claims '+String(rs[i].hash).slice(0,18)+'…');
     if(!link)line('bad','Receipt '+rs[i].id+' does not link to the receipt before it.');
    }
    var top=rs[0],match=st.receipt_hash===top.hash;
    if(bad===0){
     line('ok','✔ '+rs.length+' receipts re-hashed in your browser. Every one matches its own contents and links to the one before it.');
     line('ok','Newest: '+top.id+', DOOMCON '+top.level+' at '+top.score+' of 100, '+top.hash.slice(0,23)+'…');
     if(!match)line('note','A newer reading has been published since this page was built; reload to see it.');
    }else{
     line('bad','✖ '+bad+' of '+rs.length+' receipts failed. That should never happen. Please report it.');
    }
    btn.disabled=false;btn.textContent='Check again';
   });
  });
 }).catch(function(e){out.textContent='';line('bad','Could not finish the check: '+e.message+'. The receipts are plain files; the links below open them directly.');btn.disabled=false;});
});})();`;

export function render(ctx) {
  const st = ctx.state;
  if (!st || !st.receipt_id) return '';
  const move = ctx.url(`/moves/${st.receipt_id}.html`);
  const hash = st.receipt_hash ? String(st.receipt_hash) : null;
  const cite = `${brand.NAME} ${st.level} (${st.level_name}), composite ${Number(st.score).toFixed(1)} of 100, observed ${utc(st.generated_at)}. ${move}${hash ? ` Receipt ${hash}.` : ''}`;
  return `<section class="sec vfy" id="vfy" aria-labelledby="vfy-h" data-api="${esc(ctx.href('/api/'))}" data-depth="${DEPTH}">
  <h2 class="sec__h" id="vfy-h">Don’t trust it. Check it.</h2>
  <p class="lede">Every reading is published with a receipt: its inputs, its score, and the hash of the receipt before it.
    Press the button and your own browser fetches the last ${DEPTH} receipts, re-hashes each one and walks the chain.
    Nothing is sent anywhere, and no other doom number lets you do this.</p>
  <p><button type="button" class="vfy__go" data-vfy-go hidden>Verify the last ${DEPTH} readings in my browser</button></p>
  <div class="vfy__out" data-vfy-out hidden aria-live="polite"></div>
  <p class="fresh__key">What this proves: the published record has not been edited after the fact. What it does not prove: that the inputs
    were right. For that, read the <a href="${esc(ctx.href('/methodology.html'))}">method</a> and the
    <a href="${esc(brand.REPO_URL)}" rel="noopener">source</a>. The files:
    <a href="${esc(ctx.href(`/api/receipts/${st.receipt_id}.json`))}">this reading’s receipt</a> ·
    <a href="${esc(ctx.href('/api/history.json'))}">every reading</a>.</p>
  <details class="vfy__cite"><summary>Cite this reading</summary>
    <p class="vfy__c">${esc(cite)}</p>
    <p class="fresh__key">The link is permanent: it points at this one reading, not at whatever the level is later. ${esc(brand.LICENSE)}.</p>
  </details>
  <script>${VERIFY_JS}</script>
</section>`;
}

export function verifyCss() {
  return `
.vfy__go { padding: 12px 18px; border: 2px solid var(--lvl, var(--accent)); border-radius: 4px; background: var(--lvl, var(--accent)); color: #0b0c0e;
  cursor: pointer; font: 700 var(--t-sm)/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; }
.vfy__go:disabled { opacity: .6; cursor: progress; }
.vfy__out { margin: var(--s-3) 0; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 8px; background: var(--bg-sunken); max-width: 78ch; }
.vfy__l { margin: 0 0 6px; font: 500 var(--t-sm)/1.5 var(--mono); overflow-wrap: anywhere; color: var(--ink-dim); }
.vfy__l:last-child { margin-bottom: 0; }
.vfy__l--ok { color: var(--ok); }
.vfy__l--bad { color: var(--dark-src); }
.vfy__cite { margin-top: var(--s-3); max-width: 78ch; }
.vfy__cite summary { cursor: pointer; font: 700 var(--t-xs)/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-dim); }
.vfy__c { margin: var(--s-2) 0; padding: 10px 12px; border: 1px dashed var(--rule); border-radius: 6px; font: 400 var(--t-sm)/1.5 var(--mono); color: var(--ink); overflow-wrap: anywhere; user-select: all; }
`;
}
