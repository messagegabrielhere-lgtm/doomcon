// public/engage-sheet.html — human-only like/repost console.
//
// Keeps the operator's personal X account aligned with what siren.watch is
// already showing (X wire + newsroom status URLs). Opens X intent URLs so the
// like / repost is user-initiated. The automated @SIRENutf6 account must never
// use this sheet (POSTING.md §6 / X use-case text).
//
// NOT LINKED, NOT INDEXED. Same pizzint lesson as post-sheet.mjs: no Disallow
// announcement, no sitemap entry, noindex only.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildEngageSlate, loadAndBuild, MAX_ITEMS } from '../collector/x-engage.mjs';
import { loadBrand, DEFAULT_BRAND, utcStamp } from '../collector/card.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsonScript(value) {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}

const STYLES = `
:root{--bg:#07080a;--panel:#0d1117;--panel2:#11161d;--rule:#21262d;--ink:#e6edf3;--dim:#8b949e;--faint:#6e7681;--ok:#2ea043;--warn:#d29922;--bad:#f85149;--accent:#2f81f7}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.wrap{max-width:920px;margin:0 auto;padding:24px 16px 96px}
header.top{display:flex;flex-wrap:wrap;gap:16px;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--rule);padding-bottom:16px;margin-bottom:8px}
h1{font-size:22px;letter-spacing:3px;margin:0;font-weight:800}
.sub{color:var(--dim);font-size:13px}
.banner{border:1px solid var(--warn);background:rgba(210,153,34,.10);color:var(--warn);border-radius:8px;padding:10px 14px;margin:16px 0;font-size:13px;line-height:1.55}
.banner.bad{border-color:var(--bad);background:rgba(248,81,73,.10);color:var(--bad)}
.progress{display:flex;align-items:center;gap:12px;margin:18px 0 26px;font-size:13px;color:var(--dim)}
.bar{flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden}
.bar span{display:block;height:100%;background:var(--ok);width:0;transition:width .2s}
.card{border:1px solid var(--rule);border-radius:12px;background:var(--panel);margin:0 0 14px;overflow:hidden}
.card.done{opacity:.55}
.card.done .chead{background:rgba(46,160,67,.10)}
.chead{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:11px 14px;border-bottom:1px solid var(--rule);background:var(--panel2)}
.rank{font-weight:800;font-size:13px;color:var(--faint);min-width:22px}
.handle{font-weight:700}
.pill{font-size:11px;letter-spacing:1px;font-weight:700;border-radius:999px;padding:3px 9px;background:var(--rule);color:var(--dim)}
.pill.off{color:#79c0ff;background:rgba(47,129,247,.15)}
.spacer{flex:1}
label.tick{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dim);cursor:pointer;user-select:none}
label.tick input{width:18px;height:18px;accent-color:var(--ok);cursor:pointer}
.body{padding:14px 16px 16px}
.text{margin:0 0 10px;white-space:pre-wrap;color:var(--ink);font-size:14px;line-height:1.55}
.why{margin:0 0 12px;font-size:12px;color:var(--faint)}
.meta{margin:0 0 12px;font-size:12px;color:var(--dim)}
.btns{display:flex;flex-wrap:wrap;gap:8px}
a.btn,button{font:600 13px/1 inherit;padding:10px 14px;border-radius:8px;border:1px solid var(--rule);background:var(--panel2);color:var(--ink);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
a.btn:hover,button:hover{border-color:var(--faint)}
a.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
a.btn.ghost,button.ghost{background:transparent;color:var(--dim)}
footer{margin-top:40px;border-top:1px solid var(--rule);padding-top:16px;color:var(--faint);font-size:12px;line-height:1.8}
.empty{border:1px dashed var(--rule);border-radius:12px;padding:40px;text-align:center;color:var(--dim)}
`;

const CLIENT_JS = `
const KEY='siren.engagesheet.'+SLATE_ID;
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
let ticked=load();

function refreshProgress(){
  const total=ITEMS.length;
  const liked=ITEMS.filter(p=>ticked[p.id]&&ticked[p.id].liked).length;
  const reposted=ITEMS.filter(p=>ticked[p.id]&&ticked[p.id].reposted).length;
  const done=ITEMS.filter(p=>ticked[p.id]&&ticked[p.id].liked&&ticked[p.id].reposted).length;
  document.getElementById('pcount').textContent=done+' of '+total+' fully synced · '+liked+' liked · '+reposted+' reposted';
  document.getElementById('pbar').style.width=(total?100*done/total:0)+'%';
}

function mark(id, field){
  const row=ticked[id]||{};
  row[field]=new Date().toISOString();
  ticked[id]=row;
  save(ticked);
  const card=document.querySelector('.card[data-id="'+id+'"]');
  if(card){
    const box=card.querySelector('input[data-field="'+field+'"]');
    if(box) box.checked=true;
    const both=ticked[id].liked&&ticked[id].reposted;
    card.classList.toggle('done',Boolean(both));
  }
  refreshProgress();
}

document.querySelectorAll('.card').forEach(function(card){
  const id=card.dataset.id;
  const row=ticked[id]||{};
  card.querySelectorAll('input[type=checkbox]').forEach(function(box){
    const field=box.dataset.field;
    box.checked=Boolean(row[field]);
    box.addEventListener('change',function(){
      if(box.checked){
        mark(id, field);
      } else {
        if(ticked[id]) { delete ticked[id][field]; if(!ticked[id].liked && !ticked[id].reposted) delete ticked[id]; }
        save(ticked);
        card.classList.toggle('done',Boolean(ticked[id]&&ticked[id].liked&&ticked[id].reposted));
        refreshProgress();
      }
    });
  });
  card.classList.toggle('done',Boolean(row.liked&&row.reposted));
  card.querySelectorAll('a[data-mark]').forEach(function(a){
    a.addEventListener('click',function(){ mark(id, a.dataset.mark); });
  });
});

document.getElementById('reset').addEventListener('click',function(){
  ticked={}; save(ticked);
  document.querySelectorAll('.card').forEach(c=>{
    c.querySelectorAll('input[type=checkbox]').forEach(b=>b.checked=false);
    c.classList.remove('done');
  });
  refreshProgress();
});
refreshProgress();
`;

function engageCard(row) {
  const handle = `@${row.handle}`;
  return `
<article class="card" data-id="${escHtml(row.id)}">
  <div class="chead">
    <span class="rank">${row.order}</span>
    <span class="handle mono">${escHtml(handle)}</span>
    ${row.official ? '<span class="pill off">official</span>' : ''}
    <span class="pill">${escHtml(row.source)}</span>
    <span class="spacer"></span>
    <label class="tick"><input type="checkbox" data-field="liked"> liked</label>
    <label class="tick"><input type="checkbox" data-field="reposted"> reposted</label>
  </div>
  <div class="body">
    <p class="text">${escHtml(row.text || '(no text)')}</p>
    <p class="why">${escHtml(row.why || '')}</p>
    <p class="meta mono">rank ${escHtml(String(row.rank))} · ${row.posted_at ? escHtml(utcStamp(row.posted_at)) : 'time unknown'} · <a href="${escHtml(row.url)}" target="_blank" rel="noopener">open post</a>${row.site_path ? ` · <a href="${escHtml(row.site_path)}" target="_blank" rel="noopener">on site</a>` : ''}</p>
    <div class="btns">
      <a class="btn primary" data-mark="liked" href="${escHtml(row.like_url)}" target="_blank" rel="noopener">Like on X</a>
      <a class="btn primary" data-mark="reposted" href="${escHtml(row.repost_url)}" target="_blank" rel="noopener">Repost on X</a>
      <a class="btn ghost" href="${escHtml(row.url)}" target="_blank" rel="noopener">View</a>
    </div>
  </div>
</article>`;
}

/**
 * @param {{ slate?: object, brand?: object, state?: object }} ctx
 */
export function renderEngageSheet(ctx = {}) {
  const brand = ctx.brand || DEFAULT_BRAND;
  const slate = ctx.slate;
  if (!slate) throw new TypeError('renderEngageSheet: ctx.slate is required');
  const items = Array.isArray(slate.items) ? slate.items : [];
  const stateStamp = String(slate.generated_at || 'unknown').replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z');
  const levelLine = ctx.state && Number.isFinite(ctx.state.score)
    ? `${brand.name || brand.NAME} ${ctx.state.level} · ${Number(ctx.state.score).toFixed(1)} of 100 · ${utcStamp(ctx.state.generated_at)}`
    : `Slate ${utcStamp(slate.generated_at)} · ${items.length} of ${MAX_ITEMS} max`;

  const body = items.length
    ? items.map(engageCard).join('\n')
    : '<div class="empty">No X status URLs on the current siren.watch surface. Re-run collector/x-surface.mjs and the newsroom, then rebuild this sheet.</div>';

  const name = brand.name || brand.NAME || 'SIREN';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- INTERNAL CONSOLE. Do NOT add to sitemap.xml, nav, or robots Disallow. -->
<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">
<meta name="googlebot" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Engage console — ${escHtml(name)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <div>
    <h1>${escHtml(name)} ENGAGE CONSOLE</h1>
    <div class="sub mono">${escHtml(levelLine)}</div>
  </div>
  <div class="sub">Internal. Not linked, not indexed.<br>Use from your <b>human</b> X account — never @SIRENutf6.</div>
</header>

<div class="banner bad">
  <b>Policy hard stop.</b> Automated likes and reposts are prohibited for @SIRENutf6
  (X Developer Policy + the binding use-case text in POSTING.md §6). This sheet
  only opens X <code>intent</code> URLs so <b>you</b> confirm each action while
  signed in as the managing human account. Stay in sync with what siren.watch
  already published — do not invent engagement outside this list.
</div>

<div class="banner">
  Source mix: ${slate.counts?.from_x_surface ?? 0} from the X wire,
  ${slate.counts?.from_news ?? 0} newsroom status URLs,
  showing ${items.length}. Tick liked / reposted after you confirm in X.
</div>

<div class="progress">
  <span id="pcount" class="mono">0 of 0 fully synced</span>
  <span class="bar"><span id="pbar"></span></span>
  <button class="ghost" id="reset" type="button">Reset</button>
</div>

${body}

<footer>
  Built from <code>data/x-surface.json</code> and newsroom items whose canonical URL
  is an x.com status. Progress is local to this browser (localStorage), same shape
  as the posting console. Generated ${escHtml(utcStamp(slate.generated_at))}.
</footer>
</div>
<script>
const ITEMS=${jsonScript(items.map((it) => ({ id: it.id, status_id: it.status_id })))};
const SLATE_ID=${jsonScript(stateStamp)};
${CLIENT_JS}
</script>
</body>
</html>
`;
}

export const render = renderEngageSheet;
export default { render, renderEngageSheet, buildEngageSlate };

async function main(argv) {
  const outPath = argv[0] || 'public/engage-sheet.html';
  const slate = await loadAndBuild();
  // Also refresh the machine-readable slate next to news/x-surface.
  await writeFile(join(ROOT, 'data/x-engage.json'), `${JSON.stringify(slate, null, 2)}\n`, 'utf8');
  let state = null;
  try { state = JSON.parse(await readFile(join(ROOT, 'data/state.json'), 'utf8')); } catch { state = null; }
  const { brand } = await loadBrand();
  const html = renderEngageSheet({ slate, brand, state });
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
  process.stdout.write(`wrote ${outPath} (${html.length} bytes, ${slate.items.length} actions)\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`engage-sheet.mjs failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
