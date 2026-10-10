// /charts.html — THIS WEEK IN CHARTS, SIREN EDITION. Live, creative charts
// for AI's week, each one shareable to X as an IMAGE with the reader's own
// words:
//   1. The odds race: who will have the best AI model (Polymarket, live)
//   2. Bubble board: the hottest AI bets by money traded today (live)
//   3. The SIREN dial (live)
//   4. The week as a heat strip: every hour's reading, day by day (live)
//   5. What's driving it: the pillars over 7 days (live)
//   6. The power race since 2000, and 7. the world's electricity as a waffle
// Every chart is an SVG drawn by one shared ES5 function set (CHART_JS) that
// runs at build time (static, no-JS readable) and again in the browser with
// live data. "Post with image" renders the card to a 1200x675 PNG: on phones
// it opens the share sheet with the image and text (pick X); on desktop it
// copies the image, opens X with the text, and the reader pastes the image.
// Nothing is estimated: a dark feed keeps the build-time chart.
import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { polymarketUrl } from '../monetize.mjs';

export const CHART_JS = String.raw`
var FONT = "IBM Plex Mono,Menlo,Consolas,monospace";
function _e(t){ return String(t == null ? "" : t).replace(/[<&>"]/g, function(c){ return { "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function _svg(W, H, label, body){ return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + _e(label) + '">' + body + '</svg>'; }
function _t(x, y, s, o){ o = o || {}; return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || "#E6EAF0") + '" font-size="' + (o.s || 12) + '" font-weight="' + (o.w || 600) + '" font-family="' + FONT + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + '>' + _e(s) + '</text>'; }

function sirenLine(series, o){
  o = o || {}; var W = o.w || 860, H = o.h || 300, L = 52, R = o.right || 170, T = 14, B = 28;
  var all = []; series.forEach(function(s){ s.pts.forEach(function(p){ all.push(p); }); });
  if (!all.length) return "";
  var x0 = Math.min.apply(null, all.map(function(p){return p[0];})), x1 = Math.max.apply(null, all.map(function(p){return p[0];}));
  var lo = o.ymin != null ? o.ymin : Math.min.apply(null, all.map(function(p){return p[1];}));
  var hi = o.ymax != null ? o.ymax : Math.max.apply(null, all.map(function(p){return p[1];}));
  if (hi === lo) { hi += 1; lo -= 1; }
  var pad = (hi - lo) * 0.06; if (o.ymin == null) lo -= pad; if (o.ymax == null) hi += pad;
  var fx = function(v){ return L + (v - x0) / ((x1 - x0) || 1) * (W - L - R); };
  var fy = function(v){ return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
  var fmt = o.fmt || function(v){ return Math.round(v); };
  var g = "";
  for (var i = 0; i <= 4; i++) { var v = lo + (hi - lo) * i / 4; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + fy(v).toFixed(1) + '" y2="' + fy(v).toFixed(1) + '" stroke="#1F2937"/>' + _t(L - 8, (fy(v) + 4).toFixed(1), fmt(v), { c: "#6B7686", s: 11, a: "end", w: 500 }); }
  var dl = o.dlabel || function(t){ var d = new Date(t); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate(); };
  g += _t(L, H - 8, dl(x0), { c: "#6B7686", s: 11, w: 500 }) + _t(W - R, H - 8, dl(x1), { c: "#6B7686", s: 11, a: "end", w: 500 });
  var labels = series.map(function(s){ var p = s.pts[s.pts.length - 1]; return { s: s, y: fy(p[1]), v: p[1] }; }).sort(function(a, b){ return a.y - b.y; });
  for (var k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < 14) labels[k].y = labels[k - 1].y + 14;
  var area = o.area && series.length === 1 ? (function(s){ var p = s.pts; return '<path d="M' + fx(p[0][0]).toFixed(1) + ',' + (H - B) + ' L' + p.map(function(q){ return fx(q[0]).toFixed(1) + "," + fy(q[1]).toFixed(1); }).join(" L") + ' L' + fx(p[p.length - 1][0]).toFixed(1) + ',' + (H - B) + ' Z" fill="' + s.color + '" fill-opacity=".12"/>'; })(series[0]) : "";
  var lines = series.map(function(s){ var p = s.pts.map(function(q){ return fx(q[0]).toFixed(1) + "," + fy(q[1]).toFixed(1); }).join(" "); var e = s.pts[s.pts.length - 1];
    return '<polyline fill="none" stroke="' + s.color + '" stroke-width="' + (s.w || 2.5) + '" stroke-linejoin="round" points="' + p + '"/><circle cx="' + fx(e[0]).toFixed(1) + '" cy="' + fy(e[1]).toFixed(1) + '" r="3.5" fill="' + s.color + '"/>'; }).join("");
  var lab = labels.map(function(l){ return _t(W - R + 8, (l.y + 4).toFixed(1), l.s.name + " " + fmt(l.v), { c: l.s.color, w: 700 }); }).join("");
  return _svg(W, H, o.label || "", g + area + lines + lab);
}

// Horse-race lanes: one lane per company, a faded bar for its 30-day range,
// a tail from where it started, and the runner at today's odds.
function sirenRace(rows, o){
  o = o || {}; var W = 860, lane = 52, T = 26, H = T + rows.length * lane + 24, L = 150, R = 70;
  var fx = function(v){ return L + v / 100 * (W - L - R); };
  var g = "";
  [0, 25, 50, 75, 100].forEach(function(v){ g += '<line x1="' + fx(v) + '" x2="' + fx(v) + '" y1="' + (T - 8) + '" y2="' + (H - 18) + '" stroke="#1F2937" stroke-dasharray="' + (v === 50 ? "0" : "3 4") + '"/>' + _t(fx(v), H - 4, v + "%", { c: "#6B7686", s: 11, a: "middle", w: 500 }); });
  rows.forEach(function(r, i){
    var y = T + i * lane + lane / 2, c = r.color;
    g += '<rect x="' + L + '" y="' + (y - 14) + '" width="' + (W - L - R) + '" height="28" rx="14" fill="#0A0E15" stroke="#1F2937"/>';
    if (r.min != null && r.max != null) g += '<rect x="' + fx(r.min).toFixed(1) + '" y="' + (y - 9) + '" width="' + Math.max(4, fx(r.max) - fx(r.min)).toFixed(1) + '" height="18" rx="9" fill="' + c + '" fill-opacity=".18"/>';
    if (r.start != null) g += '<line x1="' + fx(r.start).toFixed(1) + '" x2="' + fx(r.p).toFixed(1) + '" y1="' + y + '" y2="' + y + '" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-opacity=".6"/>';
    g += '<circle cx="' + fx(r.p).toFixed(1) + '" cy="' + y + '" r="12" fill="' + c + '" stroke="#05070B" stroke-width="3"/>' + _t(fx(r.p).toFixed(1), y + 4, String(i + 1), { c: "#05070B", s: 11, a: "middle", w: 800 });
    g += _t(L - 12, y + 5, r.name, { a: "end", s: 14, w: 700 }) + _t(W - R + 10, y + 5, Math.round(r.p) + "%", { c: c, s: 15, w: 800 });
    if (r.start != null) { var d = r.p - r.start; if (Math.abs(d) >= 0.5) g += _t(W - R + 10, y + 19, (d > 0 ? "▲" : "▼") + Math.abs(d).toFixed(0), { c: d > 0 ? "#4ADE80" : "#F87171", s: 10, w: 700 }); }
  });
  return _svg(W, H, o.label || "Odds race", g);
}

// Bubble board: area = money traded in 24 h; colour = this week's move.
function sirenBubbles(items, o){
  o = o || {}; var W = 860, H = 380;
  if (!items.length) return "";
  var mx = Math.max.apply(null, items.map(function(x){ return x.vol || 1; }));
  var placed = [], g = "";
  items.forEach(function(it, i){
    var r = 34 + 62 * Math.sqrt((it.vol || 1) / mx), best = null;
    for (var a = 0; a < 720 && !best; a += 7) { var rad = 4 * a / 7, ang = a * Math.PI / 180 * 2.4, cx = W / 2 + rad * Math.cos(ang) * 1.6, cy = H / 2 + rad * Math.sin(ang);
      if (cx - r < 4 || cx + r > W - 4 || cy - r < 4 || cy + r > H - 4) continue;
      var ok = placed.every(function(p){ return Math.hypot(p.x - cx, p.y - cy) > p.r + r + 6; }); if (ok) best = { x: cx, y: cy, r: r }; }
    if (!best) return; placed.push(best);
    var up = (it.wk || 0) >= 0, c = up ? "#4ADE80" : "#F87171";
    g += '<circle cx="' + best.x.toFixed(1) + '" cy="' + best.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + c + '" fill-opacity=".14" stroke="' + c + '" stroke-width="2"/>';
    g += _t(best.x.toFixed(1), (best.y - 4).toFixed(1), Math.round(it.p) + "%", { a: "middle", s: Math.round(Math.min(28, r / 2.2)), w: 800, c: "#FFFFFF" });
    var words = String(it.title).split(" "), line = "", lines = [], max = Math.max(8, Math.floor(r / 4.2));
    words.forEach(function(w){ if ((line + " " + w).trim().length > max) { lines.push(line.trim()); line = w; } else line += " " + w; }); lines.push(line.trim());
    lines.slice(0, 2).forEach(function(l, k){ g += _t(best.x.toFixed(1), (best.y + 14 + k * 12).toFixed(1), l + (k === 1 && lines.length > 2 ? "…" : ""), { a: "middle", s: 10, w: 600, c: "#CBD5E1" }); });
  });
  return _svg(W, H, o.label || "Hottest AI bets", g);
}

// The dial: SIREN's 0-100 score on a speedometer with its five level bands.
function sirenDial(score, level, o){
  o = o || {}; var W = 860, H = 350, cx = 430, cy = 214, R = 170;
  var bands = [[0, 34, "#4ADE80", "5 DORMANT"], [35, 54, "#A3E635", "4 ROUTINE"], [55, 69, "#FACC15", "3 ELEVATED"], [70, 84, "#FB923C", "2 ACCELERATED"], [85, 100, "#F87171", "1 UNPRECEDENTED"]];
  var pt = function(v, r){ var a = Math.PI * (1 - v / 100); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  var arc = function(a, b, r){ var p = pt(a, r), q = pt(b, r); return "M" + p[0].toFixed(1) + "," + p[1].toFixed(1) + " A" + r + "," + r + " 0 0 1 " + q[0].toFixed(1) + "," + q[1].toFixed(1); };
  var g = "";
  bands.forEach(function(b){ g += '<path d="' + arc(b[0], b[1] + 1, R) + '" fill="none" stroke="' + b[2] + '" stroke-width="34" stroke-opacity="' + (score >= b[0] && score <= b[1] + 0.99 ? 1 : 0.28) + '"/>'; var m = pt((b[0] + b[1]) / 2, R + 34); g += _t(m[0].toFixed(1), m[1].toFixed(1), b[3], { a: "middle", s: 10, w: 700, c: b[2] }); });
  for (var v = 0; v <= 100; v += 10) { var a = pt(v, R - 24), b = pt(v, R - 34); g += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="#475569" stroke-width="2"/>'; }
  var n = pt(Math.max(0, Math.min(100, score)), R - 40);
  g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + n[0].toFixed(1) + '" y2="' + n[1].toFixed(1) + '" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="14" fill="#FFFFFF"/><circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#05070B"/>';
  g += _t(cx, cy + 74, (+score).toFixed(1), { a: "middle", s: 50, w: 800, c: "#FFFFFF" }) + _t(cx, cy + 100, "SIREN LEVEL " + level, { a: "middle", s: 14, w: 700, c: "#FCA5A5" });
  if (o.delta != null) g += _t(cx, cy + 124, (o.delta >= 0 ? "▲ " : "▼ ") + Math.abs(o.delta).toFixed(1) + " on the week", { a: "middle", s: 13, w: 700, c: o.delta >= 0 ? "#F87171" : "#4ADE80" });
  return _svg(W, H, o.label || "SIREN dial", g);
}

// Heat strip: 7 days x 24 hours, each cell an hour's reading.
function sirenHeat(obs, o){
  o = o || {}; var W = 860, L = 74, T = 22, cw = (W - L - 10) / 24, ch = 30, days = {}, order = [];
  obs.forEach(function(r){ var d = new Date(r.t), k = d.toISOString().slice(0, 10); if (!days[k]) { days[k] = {}; order.push(k); } days[k][d.getUTCHours()] = r.score; });
  if (order.length) { var lastD = Date.parse(order[order.length - 1] + "T00:00:00Z"); order = []; for (var dd = 6; dd >= 0; dd--) { var kk = new Date(lastD - dd * 864e5).toISOString().slice(0, 10); order.push(kk); if (!days[kk]) days[kk] = {}; } }
  var H = T + order.length * (ch + 4) + 26, g = "";
  var col = function(s){ return s >= 85 ? "#F87171" : s >= 70 ? "#FB923C" : s >= 55 ? "#FACC15" : s >= 35 ? "#A3E635" : "#4ADE80"; };
  for (var h = 0; h < 24; h += 3) g += _t((L + h * cw + cw / 2).toFixed(1), T - 8, (h < 10 ? "0" : "") + h + "h", { a: "middle", s: 10, c: "#6B7686", w: 500 });
  order.forEach(function(k, i){ var y = T + i * (ch + 4), wd = new Date(k + "T00:00:00Z").toUTCString().slice(0, 3);
    g += _t(L - 10, y + ch / 2 + 4, wd + " " + k.slice(5), { a: "end", s: 11, c: "#94A3B8" });
    for (var h2 = 0; h2 < 24; h2++) { var s = days[k][h2]; g += '<rect x="' + (L + h2 * cw + 1).toFixed(1) + '" y="' + y + '" width="' + (cw - 2).toFixed(1) + '" height="' + ch + '" rx="4" fill="' + (s == null ? "#111827" : col(s)) + '" fill-opacity="' + (s == null ? 1 : (0.35 + 0.65 * Math.min(1, s / 80)).toFixed(2)) + '"><title>' + k + " " + h2 + ":00 UTC" + (s == null ? " · no reading" : " · " + s.toFixed(1)) + '</title></rect>'; } });
  g += _t(L, H - 6, "UTC hours · colour = SIREN level band, brighter = louder", { s: 10, c: "#6B7686", w: 500 });
  return _svg(W, H, o.label || "SIREN heat strip", g);
}

// Waffle: 100 squares of the world's electricity.
function sirenWaffle(parts, o){
  o = o || {}; var W = 860, H = 360, s = 30, gap = 4, X = 40, Y = 20, g = "", idx = 0;
  var cells = []; parts.forEach(function(p){ for (var i = 0; i < p.n; i++) cells.push(p.color); }); while (cells.length < 100) cells.push("#1F2937");
  for (var r = 0; r < 10; r++) for (var c = 0; c < 10; c++) { var col = cells[idx++]; g += '<rect x="' + (X + c * (s + gap)) + '" y="' + (Y + r * (s + gap)) + '" width="' + s + '" height="' + s + '" rx="5" fill="' + col + '"/>'; }
  var lx = X + 10 * (s + gap) + 40;
  parts.forEach(function(p, i){ var y = Y + 30 + i * 52; g += '<rect x="' + lx + '" y="' + (y - 18) + '" width="22" height="22" rx="4" fill="' + p.color + '"/>' + _t(lx + 34, y, p.name, { s: 16, w: 700 }) + _t(lx + 34, y + 18, p.n + "% · " + p.sub, { s: 12, c: "#94A3B8", w: 500 }); });
  return _svg(W, H, o.label || "World electricity waffle", g);
}`;
const CH = new Function(`${CHART_JS}; return { sirenLine, sirenRace, sirenBubbles, sirenDial, sirenHeat, sirenWaffle };`)();

const COLORS = ['#F87171', '#60A5FA', '#FACC15', '#4ADE80', '#C084FC', '#FB923C'];
const CSS = `<style>
.ch{max-width:1100px}.ch .eyebrow{font:700 12px/1 var(--mono);letter-spacing:.16em;color:#60A5FA;margin:0 0 10px}
.ch-c{border:1px solid var(--rule);border-radius:10px;background:var(--bg-raised,#0E131D);padding:16px;margin:16px 0;scroll-margin-top:90px}
.ch-c h2{margin:0;font:700 20px/1.25 var(--sans);color:#E6EAF0}
.ch-c .tk{margin:6px 0 10px;color:#FDE68A;font:600 15px/1.45 var(--sans)}
.ch-c [data-svg] svg{display:block;width:100%;height:auto}
.ch-f{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between;margin-top:8px;font:600 11.5px var(--mono);color:var(--ink-faint,#6B7686)}
.ch-f a{color:inherit}.ch-btns{display:flex;gap:8px;flex-wrap:wrap}
.ch-x{appearance:none;border:1px solid #60A5FA;background:#0B1220;color:#BFDBFE;padding:8px 12px;font:700 12.5px var(--mono);cursor:pointer;border-radius:3px}
.ch-x.img{border-color:#FACC15;color:#FDE68A;background:#14120A}
.ch-live{display:inline-flex;align-items:center;gap:6px;color:#4ADE80}.ch-live i{width:7px;height:7px;border-radius:50%;background:#4ADE80;animation:chP 2s infinite}
@keyframes chP{50%{opacity:.3}}@media (prefers-reduced-motion:reduce){.ch-live i{animation:none}}
.ch-toc{display:flex;flex-wrap:wrap;gap:6px}.ch-toc a{border:1px solid var(--rule);padding:5px 9px;border-radius:3px;font:600 12px var(--mono);color:var(--ink);text-decoration:none}
.ch-modal{position:fixed;inset:0;z-index:10050;background:rgba(2,4,8,.82);display:flex;align-items:center;justify-content:center;padding:16px}
.ch-modal[hidden]{display:none}
.ch-box{width:min(720px,100%);max-height:94vh;overflow:auto;background:#0B0F16;border:1px solid #334155;border-radius:12px;padding:16px}
.ch-box h3{margin:0 0 10px;font:700 15px var(--mono);color:#FDE68A;letter-spacing:.06em}
.ch-box img{display:block;width:100%;height:auto;border-radius:8px;border:1px solid #1F2937}
.ch-box textarea{width:100%;min-height:96px;margin:12px 0 4px;background:#05070B;color:#E6EAF0;border:1px solid #334155;border-radius:6px;padding:10px;font:500 15px/1.45 var(--sans);resize:vertical}
.ch-box .cnt{font:600 11px var(--mono);color:#6B7686;text-align:right}
.ch-box .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.ch-box .hint{font-size:12.5px;color:#94A3B8;margin:10px 0 0;line-height:1.45}
.ch-box .go{appearance:none;border:0;background:#E6EAF0;color:#05070B;font:800 14px var(--mono);padding:11px 16px;border-radius:6px;cursor:pointer}
.ch-box .sec{appearance:none;border:1px solid #334155;background:transparent;color:#E6EAF0;font:700 13px var(--mono);padding:10px 14px;border-radius:6px;cursor:pointer}
.ch-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:10060;background:#0B0F16;border:1px solid #FACC15;color:#FDE68A;padding:10px 14px;border-radius:8px;font:600 13px var(--sans);max-width:92vw}
</style>`;

function card(id, n, title, takeaway, svg, source, xTitle, live, share) {
  return `<article class="ch-c" id="${id}" data-title="${esc(title)}"><h2>${n}. ${esc(title)}</h2><p class="tk" data-tk>${esc(takeaway)}</p><div data-svg>${svg}</div>
  <div class="ch-f"><span>${live ? '<span class="ch-live"><i></i>LIVE</span> · ' : ''}<span data-src>${source}</span></span>
  <span class="ch-btns"><button type="button" class="ch-x img" data-img-post="${id}">🖼 Post with image</button><button type="button" class="ch-x" data-xpost="page" data-x-title="${esc(xTitle)}" data-x-src="SIREN" data-x-url="${share}#${id}">𝕏 Post link</button></span></div></article>`;
}

export function render(ctx, { history = [], race = null, power = null } = {}) {
  const share = esc(ctx.url ? ctx.url('/charts.html') : 'https://siren.watch/charts.html');
  const pmBase = polymarketUrl('https://polymarket.com/event/x', 'charts').split('?')[1] || '';
  const cut = Date.now() - 7 * 864e5;
  const h = history.filter((r) => r && !r.degraded && Number.isFinite(r.score) && Date.parse(r.t || r.generated_at) >= cut).map((r) => ({ ...r, t: Date.parse(r.t || r.generated_at) }));
  const first = h[0], last = h[h.length - 1];
  const delta = first && last ? last.score - first.score : null;
  // 1. odds race
  const pmH = race && race.markets && race.markets.polymarket && race.markets.polymarket.horizon;
  const legs = ((pmH && pmH.legs) || []).slice().sort((a, b) => b.probability - a.probability).slice(0, 6);
  const raceRows = legs.map((l, i) => ({ name: l.title, color: COLORS[i], p: l.probability * 100, start: l.change_7d != null ? Math.max(0, (l.probability - l.change_7d) * 100) : null }));
  const raceSvg = raceRows.length ? CH.sirenRace(raceRows, { label: 'Polymarket odds race: best AI model at the end of 2026' }) : '<p>Market data not collected yet.</p>';
  const raceTk = legs.length >= 2 ? `${legs[0].title} ${Math.round(legs[0].probability * 100)}% vs ${legs[1].title} ${Math.round(legs[1].probability * 100)}% to have the best AI model at the end of 2026.` : '';
  // 3. dial
  const dialSvg = last ? CH.sirenDial(last.score, last.level, { delta, label: `SIREN dial at ${last.score.toFixed(1)}` }) : '<p>Waiting for readings.</p>';
  const dialTk = last ? `SIREN reads ${last.score.toFixed(1)}, level ${last.level}${delta != null ? `, ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} on the week` : ''}.` : '';
  // 4. heat strip
  const heatSvg = h.length > 3 ? CH.sirenHeat(h, { label: 'SIREN hourly readings, last 7 days' }) : '<p>Not enough readings yet.</p>';
  const loud = h.slice().sort((a, b) => b.score - a.score)[0];
  const heatTk = loud ? `Loudest hour this week: ${new Date(loud.t).toUTCString().slice(0, 11)} ${String(new Date(loud.t).getUTCHours()).padStart(2, '0')}:00 UTC at ${loud.score.toFixed(1)}.` : '';
  // 5. pillars
  const P = [['capability', 'Capability', '#60A5FA'], ['compute', 'Compute & capital', '#FACC15'], ['attention', 'Attention', '#F87171'], ['governance', 'Governance', '#4ADE80'], ['markets', 'Markets', '#C084FC']];
  const pSeries = P.map(([k, name, color]) => ({ name, color, pts: h.filter((r) => r.pillars && Number.isFinite(r.pillars[k])).map((r) => [r.t, r.pillars[k]]) })).filter((s) => s.pts.length > 1);
  const pSvg = pSeries.length ? CH.sirenLine(pSeries, { label: 'SIREN pillars, last 7 days', fmt: (v) => v.toFixed(0), right: 200 }) : '<p>Not enough readings yet.</p>';
  const movers = pSeries.map((s) => ({ name: s.name, d: s.pts[s.pts.length - 1][1] - s.pts[0][1] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const pTk = movers.length ? `Biggest mover this week: ${movers[0].name}, ${movers[0].d >= 0 ? 'up' : 'down'} ${Math.abs(movers[0].d).toFixed(1)}.` : '';
  // 6 + 7. power
  const pr = power && power.race;
  const pw = pr ? [['China', '#F87171', pr.china], ['United States', '#60A5FA', pr.us], ['India', '#FB923C', pr.india], ['EU', '#C084FC', pr.eu]].filter((x) => x[2] && x[2].length).map(([name, color, s]) => ({ name, color, pts: s.map(([y, v]) => [Date.UTC(y, 0, 1), v]) })) : [];
  const pwSvg = pw.length ? CH.sirenLine(pw, { label: 'Electricity generated per year, TWh', fmt: (v) => Math.round(v).toLocaleString('en-US'), dlabel: (t) => String(new Date(t).getUTCFullYear()), ymin: 0 }) : '<p>Power data not collected yet.</p>';
  const cn = pr && pr.china && pr.china[pr.china.length - 1], us = pr && pr.us && pr.us[pr.us.length - 1];
  const pwTk = cn && us ? `China generated ${(cn[1] / us[1]).toFixed(1)}× the electricity of the US in ${cn[0]}. In 2000 it was less than a third.` : '';
  let wafSvg = '<p>Power data not collected yet.</p>', wafTk = '';
  if (power && power.world_twh && power.top) {
    const share = (iso) => { const c = power.top.find((x) => x.iso === iso); return c ? c.twh / power.world_twh : 0; };
    const rows = [['China', '#F87171', share('CHN')], ['United States', '#60A5FA', share('USA')], ['India', '#FB923C', share('IND')], ['Russia', '#94A3B8', share('RUS')], ['Japan', '#4ADE80', share('JPN')]].map(([name, color, s]) => ({ name, color, n: Math.round(s * 100), sub: `${Math.round(s * power.world_twh).toLocaleString('en-US')} TWh` }));
    const used = rows.reduce((a, r) => a + r.n, 0);
    rows.push({ name: 'Rest of the world', color: '#334155', n: Math.max(0, 100 - used), sub: `${power.count - 5} more countries` });
    wafSvg = CH.sirenWaffle(rows, { label: `World electricity ${power.year}, 100 squares` });
    wafTk = `Of every 100 units of electricity made on Earth in ${power.year}, China made ${rows[0].n} and the US ${rows[1].n}.`;
  }

  const main = `${CSS}<section class="ch">
  <p class="eyebrow">THIS WEEK IN CHARTS · LIVE</p>
  <h1 class="bp__h1">AI in charts, updating as you read</h1>
  <p class="lede">Seven charts on where AI is heading, live where the data allows. Hit <b>🖼 Post with image</b> on any chart to post it to X as a picture, with your own words.</p>
  <nav class="ch-toc" aria-label="Charts"><a href="#odds-race">Odds race</a><a href="#bubbles">Hottest bets</a><a href="#dial">The dial</a><a href="#heat">Week heat strip</a><a href="#pillars">Drivers</a><a href="#power">Power race</a><a href="#waffle">World waffle</a></nav>
  ${card('odds-race', 1, 'The odds race: best AI model at the end of 2026', raceTk, raceSvg, `Polymarket${pmH && pmH.url ? ` · <a href="${esc(polymarketUrl(pmH.url, 'charts'))}" target="_blank" rel="noopener">trade it</a>` : ''}`, raceTk ? `The best-AI-model race on Polymarket: ${raceTk.replace(/ to have the best.*$/, '')}` : 'Who will have the best AI model?', true, share)}
  ${card('bubbles', 2, 'The hottest AI bets right now', 'Bubble size is money traded in the last 24 hours; green rose this week, red fell.', '<p>Loading live markets…</p>', 'Polymarket, ranked by 24-hour volume', 'The hottest AI bets on Polymarket right now', true, share)}
  ${card('dial', 3, 'The SIREN dial', dialTk, dialSvg, `SIREN, hourly · <a href="${esc(ctx.href('/methodology.html'))}">method</a>`, dialTk, true, share)}
  ${card('heat', 4, 'The week as a heat strip', heatTk, heatSvg, 'SIREN hourly readings', heatTk || 'A week of AI, hour by hour', true, share)}
  ${card('pillars', 5, 'What’s driving it: the pillars', pTk, pSvg, 'SIREN pillar readings, hourly', pTk ? `What moved AI this week: ${pTk.replace('Biggest mover this week: ', '')}` : 'What moved AI this week', true, share)}
  ${card('power', 6, 'The power race since 2000 (TWh a year)', pwTk, pwSvg, `Our World in Data · <a href="${esc(ctx.href('/power.html'))}">full table</a>`, pwTk, false, share)}
  ${card('waffle', 7, 'The world’s electricity in 100 squares', wafTk, wafSvg, `Our World in Data · ${esc(power && power.year || '')}`, wafTk, false, share)}
  <p style="font-size:12.5px">Polymarket links carry SIREN’s tracking tag. Prediction markets are restricted in some places. Not financial advice. Every chart is drawn from the data shown; nothing is estimated.</p>
</section>
<div class="ch-modal" id="ch-modal" hidden role="dialog" aria-modal="true" aria-labelledby="ch-mh"><div class="ch-box">
  <h3 id="ch-mh">POST THIS CHART TO 𝕏</h3>
  <img id="ch-img" alt="Chart image to post">
  <label for="ch-txt" style="display:block;margin-top:10px;font:700 12px var(--mono);color:#94A3B8">YOUR WORDS (edit freely)</label>
  <textarea id="ch-txt" maxlength="280"></textarea><div class="cnt" id="ch-cnt"></div>
  <div class="row"><button type="button" class="go" id="ch-go">𝕏 Post with image</button><button type="button" class="sec" id="ch-new">↻ New wording</button><button type="button" class="sec" id="ch-dl">⬇ Download image</button><button type="button" class="sec" id="ch-close">Close</button></div>
  <p class="hint" id="ch-hint">On a phone this opens your share sheet with the picture and words: pick X. On a computer the picture is copied, X opens with your words, and you paste the picture into the post (⌘V or Ctrl+V).</p>
</div></div>
<script>${CHART_JS}
(function(){var C=${JSON.stringify(COLORS)},REF=${JSON.stringify(pmBase)},SHARE=${JSON.stringify(share)};
function $(id){return document.getElementById(id);}
function pm(slug){return "https://polymarket.com/event/"+encodeURIComponent(slug)+(REF?"?"+REF:"");}
function setX(id,t){var b=$(id)&&$(id).querySelector("[data-xpost]");if(b&&t)b.setAttribute("data-x-title",t);}
function setTk(id,t){var e=$(id)&&$(id).querySelector("[data-tk]");if(e&&t)e.textContent=t;}
function setSvg(id,s){var e=$(id)&&$(id).querySelector("[data-svg]");if(e&&s)e.innerHTML=s;}
function jget(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
function hist(tok,iv,fid){return jget("https://clob.polymarket.com/prices-history?market="+tok+"&interval="+iv+"&fidelity="+fid).then(function(j){return (j.history||[]).map(function(p){return [p.t*1000,p.p*100];});});}
function first(m){var p=0,t=null;try{p=+JSON.parse(m.outcomePrices)[0];}catch(e){}try{t=JSON.parse(m.clobTokenIds)[0];}catch(e){}return {p:p,tok:t};}
function oddsRace(){jget("https://gamma-api.polymarket.com/events?slug=which-company-has-best-ai-model-end-of-2026").then(function(j){
  var ms=(j[0]&&j[0].markets||[]).filter(function(m){return !m.closed;}).map(function(m){var f=first(m);return {name:m.groupItemTitle||m.question,p:f.p*100,tok:f.tok};}).filter(function(m){return m.tok;}).sort(function(a,b){return b.p-a.p;}).slice(0,6);
  return Promise.all(ms.map(function(m){return hist(m.tok,"1m",360).catch(function(){return [];});})).then(function(hs){
    var rows=ms.map(function(m,i){var ys=hs[i].map(function(p){return p[1];});return {name:m.name,color:C[i],p:m.p,start:ys.length?ys[0]:null,min:ys.length?Math.min.apply(null,ys.concat([m.p])):null,max:ys.length?Math.max.apply(null,ys.concat([m.p])):null};});
    setSvg("odds-race",sirenRace(rows,{label:"Polymarket odds race, 30 days"}));
    if(rows.length>1){setTk("odds-race",rows[0].name+" "+Math.round(rows[0].p)+"% vs "+rows[1].name+" "+Math.round(rows[1].p)+"% to have the best AI model at the end of 2026. Shaded bars: each company's 30-day range.");setX("odds-race","Polymarket right now: "+rows[0].name+" "+Math.round(rows[0].p)+"%, "+rows[1].name+" "+Math.round(rows[1].p)+"% to have the best AI model by year end");}
    $("odds-race").querySelector("[data-src]").innerHTML='Polymarket, 30 days, updated '+new Date().toISOString().slice(11,16)+' UTC · <a href="'+pm("which-company-has-best-ai-model-end-of-2026")+'" target="_blank" rel="noopener">trade it</a>';
  });}).catch(function(){});}
function bubbles(){jget("https://gamma-api.polymarket.com/events?tag_slug=ai&closed=false&order=volume24hr&ascending=false&limit=10").then(function(evs){
  var it=evs.map(function(e){var ms=(e.markets||[]).filter(function(m){return !m.closed;}).map(function(m){var f=first(m);return {q:m.groupItemTitle||"",p:f.p,wk:+m.oneWeekPriceChange||0};}).filter(function(m){return m.p<0.995&&m.p>0.005;}).sort(function(a,b){return b.p-a.p;});
    return ms[0]?{title:e.title.replace(/\.\.\.\?$/,"…")+(ms[0].q&&ms.length>1?" ("+ms[0].q+")":""),p:ms[0].p*100,wk:ms[0].wk*100,vol:+e.volume24hr||0,slug:e.slug}:null;}).filter(Boolean).slice(0,8);
  if(!it.length)return;setSvg("bubbles",sirenBubbles(it,{label:"Hottest AI bets on Polymarket by 24-hour volume"}));
  setTk("bubbles","Most money today: “"+it[0].title+"” ($"+Math.round(it[0].vol).toLocaleString("en-US")+" traded), now at "+Math.round(it[0].p)+"%.");
  setX("bubbles","Where the AI money is moving on Polymarket today: “"+it[0].title+"” leads with $"+Math.round(it[0].vol).toLocaleString("en-US")+" traded");
}).catch(function(){setSvg("bubbles",'<p>Polymarket did not answer. <a href="https://polymarket.com/predictions/ai" target="_blank" rel="noopener">See the AI markets →</a></p>');});}
function siren(){jget("api/history.json").then(function(j){
  var cut=Date.now()-7*864e5,o=(j.observations||[]).filter(function(r){return !r.degraded&&Date.parse(r.generated_at)>=cut&&isFinite(r.score);}).map(function(r){r.t=Date.parse(r.generated_at);return r;});
  if(o.length<2)return;var a=o[0],b=o[o.length-1],d=b.score-a.score;
  setSvg("dial",sirenDial(b.score,b.level,{delta:d}));var t="SIREN reads "+b.score.toFixed(1)+", level "+b.level+", "+(d>=0?"up ":"down ")+Math.abs(d).toFixed(1)+" on the week.";setTk("dial",t);setX("dial",t);
  setSvg("heat",sirenHeat(o,{}));var L=o.slice().sort(function(x,y){return y.score-x.score;})[0];var dt=new Date(L.t);var ht="Loudest hour this week: "+dt.toUTCString().slice(0,11)+" "+("0"+dt.getUTCHours()).slice(-2)+":00 UTC at "+L.score.toFixed(1)+".";setTk("heat",ht);setX("heat",ht);
  var P=[["capability","Capability","#60A5FA"],["compute","Compute & capital","#FACC15"],["attention","Attention","#F87171"],["governance","Governance","#4ADE80"],["markets","Markets","#C084FC"]];
  var s=P.map(function(p){return {name:p[1],color:p[2],pts:o.filter(function(r){return r.pillars&&r.pillars[p[0]]!=null&&isFinite(r.pillars[p[0]]);}).map(function(r){return [r.t,r.pillars[p[0]]];})};}).filter(function(x){return x.pts.length>1;});
  if(s.length){setSvg("pillars",sirenLine(s,{label:"SIREN pillars, last 7 days",fmt:function(v){return v.toFixed(0);},right:200}));var mv=s.map(function(x){return {n:x.name,d:x.pts[x.pts.length-1][1]-x.pts[0][1]};}).sort(function(x,y){return Math.abs(y.d)-Math.abs(x.d);})[0];var pt="Biggest mover this week: "+mv.n+", "+(mv.d>=0?"up ":"down ")+Math.abs(mv.d).toFixed(1)+".";setTk("pillars",pt);setX("pillars","What moved AI this week: "+mv.n+", "+(mv.d>=0?"up ":"down ")+Math.abs(mv.d).toFixed(1));}
}).catch(function(){});}
// ---- image share ----
var cur=null,imgBlob=null;
function wrapText(t,n){var w=String(t).split(" "),l="",out=[];w.forEach(function(x){if((l+" "+x).trim().length>n){out.push(l.trim());l=x;}else l+=" "+x;});out.push(l.trim());return out;}
function cardSvg(id){var c=$(id),svg=c.querySelector("[data-svg] svg");if(!svg)return null;var vb=(svg.getAttribute("viewBox")||"0 0 860 300").split(" ").map(Number);
  var W=1200,H=675,title=c.getAttribute("data-title"),tk=(c.querySelector("[data-tk]").textContent||"");var lines=wrapText(tk,78).slice(0,2);
  var ch=H-210,cw=W-80,sc=Math.min(cw/vb[2],ch/vb[3]),iw=vb[2]*sc,ih=vb[3]*sc;
  var inner=svg.outerHTML.replace(/^<svg[^>]*>/,'<svg xmlns="http://www.w3.org/2000/svg" x="'+((W-iw)/2).toFixed(0)+'" y="'+(150+(ch-ih)/2).toFixed(0)+'" width="'+iw.toFixed(0)+'" height="'+ih.toFixed(0)+'" viewBox="'+vb.join(" ")+'">');
  var t=function(x,y,s,sz,col,w){return '<text x="'+x+'" y="'+y+'" fill="'+col+'" font-size="'+sz+'" font-weight="'+w+'" font-family="IBM Plex Mono,Menlo,Consolas,monospace">'+String(s).replace(/[<&>]/g,function(m){return {"<":"&lt;","&":"&amp;",">":"&gt;"}[m];})+'</text>';};
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><rect width="'+W+'" height="'+H+'" fill="#05070B"/><rect x="0" y="0" width="'+W+'" height="6" fill="#F87171"/>'+t(40,58,title,30,"#FFFFFF",800)+lines.map(function(l,i){return t(40,96+i*26,l,19,"#FDE68A",600);}).join("")+inner+'<rect x="0" y="'+(H-46)+'" width="'+W+'" height="46" fill="#0B0F16"/>'+t(40,H-17,"🚨 SIREN · siren.watch/charts",17,"#E6EAF0",800)+'</svg>';}
function toPng(svgText){return new Promise(function(res,rej){var img=new Image();img.onload=function(){var cv=document.createElement("canvas");cv.width=1200;cv.height=675;var g=cv.getContext("2d");g.drawImage(img,0,0);cv.toBlob(function(b){b?res(b):rej(new Error("png"));},"image/png");};img.onerror=rej;img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svgText);});}
function compose(id){var b=$(id).querySelector("[data-xpost]");var base=b.getAttribute("data-x-title");return window.sirenX?window.sirenX.compose({kind:"page",title:base,src:"SIREN"}):base;}
function count(){var v=$("ch-txt").value,u=23;$("ch-cnt").textContent=(v.length+u+1)+" / 280 with link";}
function openShare(id){cur=id;var s=cardSvg(id);if(!s)return;toPng(s).then(function(b){imgBlob=b;$("ch-img").src=URL.createObjectURL(b);}).catch(function(){toast("Could not draw the image in this browser.");});
  $("ch-txt").value=compose(id);count();$("ch-modal").hidden=false;$("ch-txt").focus();}
function toast(m){var t=document.createElement("div");t.className="ch-toast";t.setAttribute("role","status");t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove();},6000);}
function url(){return SHARE+"#"+cur;}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-img-post]");if(b){e.preventDefault();openShare(b.getAttribute("data-img-post"));}});
$("ch-txt").addEventListener("input",count);
$("ch-new").addEventListener("click",function(){$("ch-txt").value=compose(cur);count();});
$("ch-close").addEventListener("click",function(){$("ch-modal").hidden=true;});
$("ch-modal").addEventListener("click",function(e){if(e.target.id==="ch-modal")$("ch-modal").hidden=true;});
document.addEventListener("keydown",function(e){if(e.key==="Escape")$("ch-modal").hidden=true;});
$("ch-dl").addEventListener("click",function(){if(!imgBlob)return;var a=document.createElement("a");a.href=URL.createObjectURL(imgBlob);a.download="siren-"+cur+".png";a.click();});
$("ch-go").addEventListener("click",function(){var text=$("ch-txt").value.trim(),u=url();if(!imgBlob){toast("Image still drawing, try again in a second.");return;}
  var file=new File([imgBlob],"siren-"+cur+".png",{type:"image/png"});
  var mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(mobile&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],text:text+" "+u}).catch(function(){});return;}
  var intent="https://x.com/intent/post?text="+encodeURIComponent(text)+"&url="+encodeURIComponent(u);
  var go=function(msg){toast(msg);window.open(intent,"_blank","noopener");};
  if(navigator.clipboard&&window.ClipboardItem){navigator.clipboard.write([new ClipboardItem({"image/png":imgBlob})]).then(function(){go("Picture copied. Paste it into your X post (⌘V / Ctrl+V), then post.");},function(){go("Couldn't copy the picture here: use Download image and attach it in X.");});}else go("Use Download image and attach the picture in X.");
});
oddsRace();bubbles();siren();setInterval(function(){oddsRace();bubbles();},120000);setInterval(siren,600000);
})();</script>`;
  return page({ ctx, path: '/charts.html',
    title: `This week in AI charts: live odds, SIREN dial, power race · ${brand.NAME}`,
    description: 'Live, creative AI charts you can post to X as images: the Polymarket odds race for best AI model, the hottest AI bets, the SIREN dial and week heat strip, and the China-US electricity race.',
    main });
}
