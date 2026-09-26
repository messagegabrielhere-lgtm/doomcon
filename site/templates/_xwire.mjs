// The X wire — posts from frontier labs and AI accounts, rendered wide.
//
// This is our answer to pizzint's OSINT column, and it is the one part of their
// page we could not simply copy. Theirs is a live X firehose, which needs paid
// read access: X ended its free tier on 2026-02-06 and scraping it carries an
// explicit permanent-suspension penalty.
//
// So collector/x-surface.mjs takes the legitimate route instead. It harvests
// x.com post URLs that appear in sources we already fetch lawfully — Techmeme,
// Hacker News, the press feeds — and resolves each through X's keyless oEmbed
// endpoint. The result is genuine X content, attributed to whoever surfaced it,
// at zero cost and inside the rules.
//
// That provenance is a feature, not an apology. Every card says who cited the
// post, so a reader can see the path from "a lab posted this" to "somebody who
// is not us thought it mattered". pizzint's column cannot show you that.
//
// We render the TEXT, not X's <blockquote> widget script. Three reasons: the
// widget is a third-party script on every page load, it renders nothing until
// it executes (so a screenshot before hydration is blank — the exact failure we
// beat pizzint on), and the text is already in the oEmbed payload.

import { esc } from './_html.mjs';

const MAX_HOME = 8;

function ago(iso, nowIso) {
  const t = Date.parse(iso);
  const n = Date.parse(nowIso);
  if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
  const s = Math.max(0, Math.round((n - t) / 1000));
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function clamp(text, n) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).replace(/[\s,.;:]+$/, '')}…`;
}

function card(it, nowIso) {
  const handle = it.author_handle ? `@${it.author_handle}` : 'unknown';
  const rel = ago(it.posted_at, nowIso);
  const cite = Array.isArray(it.cited_by) && it.cited_by.length ? it.cited_by[0] : null;

  // "official" means the account is a lab's own, matched by handle rather than
  // inferred from the text. It is the difference between the lab saying a thing
  // and somebody reporting that the lab said it, so it is worth a badge.
  const official = it.official === true;

  return `<li class="xw__i">
  <article class="xw__c">
    <header class="xw__h">
      <a class="xw__a" href="${esc(it.author_url || it.url)}" rel="nofollow noopener">
        <b class="xw__an">${esc(it.author_name || handle)}</b>
        <span class="xw__ah">${esc(handle)}</span>
      </a>
      ${official ? '<span class="xw__b" title="The lab’s own account">LAB</span>' : ''}
      ${rel ? `<time class="xw__t num" datetime="${esc(it.posted_at)}" title="${esc(it.posted_at)}">${esc(rel)}</time>` : ''}
    </header>
    <p class="xw__x">${esc(clamp(it.text, 260))}${
      it.text_truncated_by_x ? '<span class="xw__tr" title="X truncated this in the embed payload"> [truncated by X]</span>' : ''}</p>
    <footer class="xw__f">
      ${cite ? `<span class="xw__ci">via ${esc(cite.label || cite.source)}</span>` : '<span class="xw__ci">direct</span>'}
      <a class="xw__l" href="${esc(it.url)}" rel="nofollow noopener">open on X ↗</a>
    </footer>
  </article>
</li>`;
}

export function hasWire(ctx) {
  const x = ctx && ctx.x;
  return Boolean(x && Array.isArray(x.items) && x.items.length);
}

export function render(ctx, { limit = MAX_HOME } = {}) {
  if (!hasWire(ctx)) return '';
  const x = ctx.x;
  const items = x.items.slice(0, limit);
  const now = x.generated_at;

  return `${styleTag()}
<section class="sec xw" aria-labelledby="xw-h">
  <div class="xw__hd">
    <h2 class="sec__h" id="xw-h">The X wire</h2>
    <p class="xw__k">${esc(x.items.length)} posts · resolved
      <time datetime="${esc(now)}">${esc(String(now).slice(11, 16))}Z</time></p>
  </div>
  <p class="lede xw__lede">Posts from frontier labs and AI accounts, found where somebody else
     cited them — Techmeme, Hacker News, the press — and resolved through X’s public
     embed endpoint. No API key, no scraping, no cost.</p>
  <ul class="xw__grid">${items.map((it) => card(it, now)).join('')}</ul>
</section>`;
}

/** Scoped CSS. Wide by design: the operator asked for it wider, and a wall of
 *  narrow columns wastes the one section whose content is full sentences. */
export function styleTag() {
  return `<style>
.xw__hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 var(--s-3);justify-content:space-between}
.xw__k{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:0}
.xw__lede{margin:var(--s-2) 0 var(--s-3)}
.xw__grid{list-style:none;margin:0;padding:0;display:grid;gap:9px;grid-template-columns:1fr}
@media(min-width:720px){.xw__grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1180px){.xw__grid{grid-template-columns:repeat(3,1fr)}}
.xw__c{display:flex;flex-direction:column;gap:6px;height:100%;padding:11px 13px;
  background:var(--bg-raised);border:1px solid var(--rule);border-radius:var(--radius)}
.xw__h{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.xw__a{display:flex;align-items:baseline;gap:5px;text-decoration:none;color:inherit;min-width:0}
.xw__an{font-family:var(--mono);font-size:var(--t-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xw__ah{font-family:var(--mono);font-size: var(--t-2xs);color:var(--ink-faint)}
.xw__a:hover .xw__an{color:var(--accent)}
.xw__b{font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.12em;padding:1px 4px;
  border:1px solid var(--accent);color:var(--accent);border-radius:3px}
.xw__t{margin-left:auto;font-family:var(--mono);font-size: var(--t-2xs);color:var(--ink-faint);font-variant-numeric:tabular-nums}
.xw__x{margin:0;font-size:var(--t-xs);line-height:1.5;color:var(--ink)}
.xw__tr{color:var(--ink-faint)}
.xw__f{display:flex;align-items:center;gap:var(--s-2);margin-top:auto;padding-top:4px;
  font-family:var(--mono);font-size: var(--t-2xs);letter-spacing:.08em;text-transform:uppercase}
.xw__ci{color:var(--ink-faint)}
.xw__l{margin-left:auto;color:var(--ink-dim);text-decoration:none}
.xw__l:hover{color:var(--accent)}
</style>`;
}
