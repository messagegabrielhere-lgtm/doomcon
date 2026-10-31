// Writes site/static/supply-depot.html from supply/catalog.mjs.
// Every row is plain HTML so crawlers see it; the inline script only adds
// search, filters and "have it" ticks kept in this browser.
//   node supply/build.mjs
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, amazonSearch } from './catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const total = CATALOG.reduce((n, c) => n + c[3].length, 0);
const TOTAL = total.toLocaleString('en-US');

const chips = CATALOG.map(([id, title, , items]) =>
  `<button type="button" data-c="${id}" aria-pressed="false">${esc(title)} <span>${items.length}</span></button>`).join('\n      ');

const sections = CATALOG.map(([id, title, intro, items]) => `
  <section class="sec" id="${id}" data-c="${id}">
    <div class="sec-h"><h2>${esc(title)}</h2><span class="sec-n" data-n="${id}">${items.length} items</span></div>
    <p class="sec-why">${esc(intro)}</p>
    <ul class="items">
${items.map(([name, why, q]) => {
    const key = `${id}-${slug(name)}`;
    return `      <li data-k="${key}"><input type="checkbox" id="h-${key}" aria-label="Have it: ${esc(name)}"><label for="h-${key}" class="t">${esc(name)}<small>${esc(why)}</small></label><a class="buy" href="${esc(amazonSearch(q || name))}" target="_blank" rel="sponsored noopener">AMAZON ↗</a></li>`;
  }).join('\n')}
    </ul>
  </section>`).join('\n');

const faq = [
  ['What is the Supply Depot?', `A checklist of ${TOTAL} emergency and off-grid supplies in ${CATALOG.length} categories, from water and food to power, radios, first aid and offline computers. Tick what you already have; your ticks stay in this browser.`],
  ['Are the links paid?', 'Yes. Every "Amazon" link is a paid link: as an Amazon Associate, SIREN earns from qualifying purchases. Each link searches Amazon for a kind of item rather than one product, and nothing here is a product review.'],
  ['Can I download this list?', 'Yes. The free downloads page has the full list as a spreadsheet and printable checklists, with no links inside the files.'],
  ['Is this professional advice?', 'No. It is general preparedness information. Follow your local emergency managers first, and take a first aid class before relying on medical supplies.'],
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Emergency preparedness supplies list: ${TOTAL} items, free checklist · SIREN</title>
<meta name="description" content="A free checklist of ${TOTAL} emergency and off-grid supplies in ${CATALOG.length} categories: water, food, power, solar, radios, first aid, tools, pets, kids and offline computing. Tick what you have, then shop what you still need.">
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: `The Supply Depot: ${TOTAL} emergency prep supplies`, url: 'https://siren.watch/supply-depot.html', isPartOf: { '@type': 'WebSite', name: 'SIREN', url: 'https://siren.watch/' } })}
</script>
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'SIREN', item: 'https://siren.watch/' }, { '@type': 'ListItem', position: 2, name: 'Supply Depot', item: 'https://siren.watch/supply-depot.html' }] })}
</script>
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}
</script>
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Emergency prep supply categories', numberOfItems: CATALOG.length, itemListElement: CATALOG.map(([id, title, , items], i) => ({ '@type': 'ListItem', position: i + 1, name: `${title} (${items.length} supplies)`, url: `https://siren.watch/supply-depot.html#${id}` })) })}
</script>
<link rel="stylesheet" href="fonts/fonts.css">
<style>
:root{--bg:#000;--raised:#0E131D;--rule:#232C3B;--ink:#E6EAF0;--dim:#AEB7C3;--faint:#6B7686;--green:#4ADE80;--amber:#FFB020;
  --mono:"IBM Plex Mono",ui-monospace,monospace;--sans:"IBM Plex Sans","Inter Tight",system-ui,-apple-system,"Segoe UI",sans-serif}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--sans)}
a{color:var(--green)}
:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.wrap{max-width:980px;margin:0 auto;padding:0 16px}
header.pc{padding:36px 0 20px;border-bottom:1px solid var(--rule)}
.eyebrow{font:600 12px/1 var(--mono);letter-spacing:.16em;color:var(--green);margin:0 0 10px}
h1{font:700 clamp(2rem,6vw,3.4rem)/1.02 var(--sans);margin:0;letter-spacing:-.02em}
.lede{color:var(--dim);max-width:64ch;margin:12px 0 0;font-size:1.05rem}
.disc{font-size:13px;color:var(--dim);border-left:3px solid var(--amber);padding:4px 12px;margin:16px 0 0;max-width:72ch}
.panel{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin:20px 0}
@media (max-width:760px){.panel{grid-template-columns:1fr}}
.card{background:var(--raised);border:1px solid var(--rule);border-radius:4px;padding:16px}
.card h2{font:600 12px/1 var(--mono);letter-spacing:.14em;color:var(--dim);margin:0 0 12px;text-transform:uppercase}
.card p{margin:0 0 10px;color:var(--dim);font-size:14px}
#q{width:100%;padding:11px 12px;background:#000;color:var(--ink);border:1px solid var(--rule);border-radius:4px;font:400 16px/1 var(--sans)}
.meter-row{display:flex;justify-content:space-between;align-items:baseline;font:600 13px/1 var(--mono)}
.meter-row b{font-size:28px;color:var(--green)}
.bar{height:12px;background:#000;border:1px solid var(--rule);margin:10px 0 14px;border-radius:2px;overflow:hidden}
.bar i{display:block;height:100%;width:0;background:var(--green);transition:width .3s}
.tools{display:flex;flex-wrap:wrap;gap:8px}
.tools button,.tools a,.chips button{all:unset;cursor:pointer;padding:8px 12px;border:1px solid var(--rule);border-radius:4px;font:600 12px/1 var(--mono);letter-spacing:.04em;color:var(--ink)}
.tools a{color:var(--green)}
.tools button:hover,.chips button:hover{border-color:var(--green)}
.tools button:focus-visible,.chips button:focus-visible,.tools a:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.chips{display:flex;gap:8px;overflow-x:auto;margin:4px 0 18px;position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:3;border-bottom:1px solid var(--rule)}
.chips button{white-space:nowrap}
.chips button span{color:var(--faint)}
.chips button[aria-pressed=true]{background:var(--green);color:#000;border-color:var(--green)}
.chips button[aria-pressed=true] span{color:#000}
section.sec{margin:0 0 28px}
.sec-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-bottom:1px solid var(--rule);padding-bottom:8px;margin-bottom:6px}
.sec-h h2{font:700 1.3rem/1.2 var(--sans);margin:0}
.sec-h span{font:600 12px/1 var(--mono);color:var(--faint);white-space:nowrap}
.sec-why{color:var(--dim);font-size:14px;margin:6px 0 8px}
ul.items{list-style:none;margin:0;padding:0}
ul.items li{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:start;padding:9px 4px;border-bottom:1px solid #121824}
ul.items li.have .t{color:var(--faint);text-decoration:line-through}
ul.items input{width:20px;height:20px;margin:2px 0 0;accent-color:var(--green)}
.t{font-weight:500}
.t small{display:block;color:var(--dim);font-weight:400;font-size:13px;margin-top:2px}
.buy{font:600 11px/1 var(--mono);white-space:nowrap;padding-top:4px}
.empty{color:var(--dim)}
.pc-faq{margin:28px 0 8px;max-width:64ch}
.pc-faq h2{font:600 1.125rem/1.2 var(--sans);margin:0 0 12px}
.pc-faq h3{font:600 1rem/1.3 var(--sans);margin:16px 0 8px}
.pc-faq p{color:var(--dim);margin:0 0 8px}
footer.pc{border-top:1px solid var(--rule);margin-top:24px;padding:20px 0 90px;color:var(--dim);font-size:13px}
@media print{.chips,.tools,#q,.buy,#sitebar,.site-disclosure,.v2sh,.pc-faq{display:none!important}body{background:#fff;color:#000}.card,.sec-h,ul.items li{border-color:#ccc}.t small,.sec-why{color:#333}a{color:#000}}
</style>
</head>
<body>
<header class="pc">
  <div class="wrap">
    <p class="eyebrow">A SIREN FIELD MANUAL · THE SUPPLY DEPOT</p>
    <h1>${TOTAL} emergency prep supplies, in one checklist</h1>
    <p class="lede">Water, food, power, solar, radios, first aid, tools, pets, kids and the offline computers that run <a href="survival-llm.html">Survival LLM</a>. Tick what you already have; your ticks stay in this browser. Then shop what you still need, or <a href="prep-downloads.html">download the whole list free</a>.</p>
    <p class="disc">"Amazon" links are paid links: as an Amazon Associate, SIREN earns from qualifying purchases. Each link searches Amazon for a kind of item, not one product. Nothing on this page is a product review.</p>
  </div>
</header>

<main class="wrap">
  <div class="panel">
    <div class="card">
      <h2>Find a supply</h2>
      <input id="q" type="search" placeholder="Search ${TOTAL} supplies: radio, solar, diapers…" aria-label="Search supplies">
      <p id="shown" style="margin:10px 0 0" aria-live="polite">${TOTAL} supplies shown</p>
    </div>
    <div class="card">
      <h2>What you have</h2>
      <div class="meter-row"><span id="m-label">0 of ${TOTAL}</span><b id="m-pct">0%</b></div>
      <div class="bar"><i id="m-fill"></i></div>
      <div class="tools">
        <button type="button" id="need">ONLY WHAT I NEED</button>
        <button type="button" id="print">PRINT</button>
        <button type="button" id="reset">RESET</button>
        <a href="prep-downloads.html">DOWNLOADS</a>
      </div>
    </div>
  </div>

  <div class="chips" role="toolbar" aria-label="Category">
      <button type="button" data-c="all" aria-pressed="true">All <span>${TOTAL}</span></button>
      ${chips}
  </div>

  <div id="list">${sections}
  </div>
  <p class="empty" id="none" hidden>No supplies match that search.</p>

  <section class="pc-faq">
    <h2>Questions</h2>
${faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
    <p>More: <a href="prepper-checklist.html">What belongs in a 72-hour prepper kit?</a> · <a href="bunker-kit.html">What free tools belong in a bunker kit?</a> · <a href="prep-downloads.html">Free prep spreadsheets and printable checklists</a></p>
  </section>
</main>

<footer class="pc">
  <div class="wrap">"Amazon" links are paid links: as an Amazon Associate, SIREN earns from qualifying purchases. General preparedness information, not professional advice.</div>
</footer>

<script>
(function () {
  var KEY = "siren-supply-depot";
  var have = new Set();
  try { have = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(Array.from(have))); } catch (e) {} }
  var rows = Array.prototype.slice.call(document.querySelectorAll("#list li"));
  var secs = Array.prototype.slice.call(document.querySelectorAll("#list section"));
  var cat = "all", needOnly = false, q = "";
  rows.forEach(function (li) {
    li._text = li.textContent.toLowerCase();
    var cb = li.querySelector("input");
    if (have.has(li.dataset.k)) { cb.checked = true; li.classList.add("have"); }
    cb.addEventListener("change", function () {
      if (cb.checked) have.add(li.dataset.k); else have.delete(li.dataset.k);
      li.classList.toggle("have", cb.checked); save(); apply();
    });
  });
  function apply() {
    var shown = 0, got = 0;
    rows.forEach(function (li) {
      var c = li.parentNode.parentNode.dataset.c;
      var isHave = have.has(li.dataset.k);
      if (isHave) got++;
      var ok = (cat === "all" || c === cat) && (!q || li._text.indexOf(q) !== -1) && !(needOnly && isHave);
      li.hidden = !ok; if (ok) shown++;
    });
    secs.forEach(function (s) { s.hidden = !s.querySelector("li:not([hidden])"); });
    document.getElementById("none").hidden = shown > 0;
    document.getElementById("shown").textContent = shown.toLocaleString("en-US") + " supplies shown";
    var pct = Math.round(got / rows.length * 100);
    document.getElementById("m-label").textContent = got.toLocaleString("en-US") + " of " + rows.length.toLocaleString("en-US");
    document.getElementById("m-pct").textContent = pct + "%";
    document.getElementById("m-fill").style.width = pct + "%";
  }
  document.getElementById("q").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); apply(); });
  document.querySelectorAll(".chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      cat = b.dataset.c;
      document.querySelectorAll(".chips button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      apply();
    });
  });
  document.getElementById("need").addEventListener("click", function (e) {
    needOnly = !needOnly; e.target.textContent = needOnly ? "SHOW EVERYTHING" : "ONLY WHAT I NEED"; apply();
  });
  document.getElementById("print").addEventListener("click", function () { window.print(); });
  document.getElementById("reset").addEventListener("click", function () {
    if (have.size && !window.confirm("Clear every tick on this list?")) return;
    have.clear(); save();
    rows.forEach(function (li) { li.querySelector("input").checked = false; li.classList.remove("have"); });
    apply();
  });
  apply();
})();
</script>
</body>
</html>
`;

await writeFile(path.join(ROOT, 'site', 'static', 'supply-depot.html'), html);
console.log(`supply-depot.html: ${total} items, ${CATALOG.length} categories, ${(html.length / 1024).toFixed(0)} KB`);
