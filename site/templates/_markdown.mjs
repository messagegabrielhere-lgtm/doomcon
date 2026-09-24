// A deliberately small Markdown renderer. Zero dependencies is a hard rule, and
// the only Markdown we render is our own docs/*.md - so this supports exactly
// the constructs those files use and throws on nothing else. It is not a
// CommonMark implementation and does not pretend to be.
//
// Security posture: raw HTML in the source is ESCAPED, never passed through.
// These files are ours, but a renderer that trusts its input is one bad merge
// away from being an XSS, and the cost of not trusting it is zero here.

import { esc, slug } from './_html.mjs';

const FENCE = /^```(\w*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const HR = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const UL = /^[-*+]\s+(.*)$/;
const OL = /^(\d+)[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const TABLE_SEP = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

// Anything not in this set becomes plain text rather than a link. Blocks
// javascript: and data: URLs at the one place URLs can enter the document.
const SAFE_SCHEME = /^(?:https?:\/\/|mailto:|#|\/|\.{1,2}\/)/i;

/**
 * @returns {{ html: string, sections: Array<{level:number,text:string,id:string,body:string}> }}
 *   `sections` carries the plain-text body under each heading. methodology.mjs
 *   uses it to build FAQPage JSON-LD out of the text that is actually visible
 *   on the page - structured data that does not match the rendered page is a
 *   manual action waiting to happen.
 */
export function renderMarkdown(source) {
  if (typeof source !== 'string') {
    throw new TypeError(`renderMarkdown(): expected a string, got ${typeof source}`);
  }
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const sections = [];
  const usedIds = new Set();
  let i = 0;

  const pushSectionText = (text) => {
    if (sections.length === 0 || !text.trim()) return;
    const s = sections[sections.length - 1];
    s.body = s.body ? `${s.body} ${text.trim()}` : text.trim();
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i += 1; continue; }

    const fence = line.match(FENCE);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) { body.push(lines[i]); i += 1; }
      if (i >= lines.length) {
        throw new Error('renderMarkdown(): unterminated ``` code fence');
      }
      i += 1; // closing fence
      const lang = fence[1] ? ` data-lang="${esc(fence[1])}"` : '';
      out.push(`<pre${lang}><code>${esc(body.join('\n'))}\n</code></pre>`);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      let id = slug(text) || `s${sections.length + 1}`;
      let n = 2;
      while (usedIds.has(id)) { id = `${slug(text)}-${n}`; n += 1; }
      usedIds.add(id);
      sections.push({ level, text, id, body: '' });
      const anchor = `<a class="anchor" href="#${esc(id)}" aria-label="Link to this section">#</a>`;
      out.push(`<h${level} id="${esc(id)}">${inline(text)} ${anchor}</h${level}>`);
      i += 1;
      continue;
    }

    if (HR.test(line)) { out.push('<hr class="rule">'); i += 1; continue; }

    // Table: a pipe row immediately followed by a dashes row. Checked before
    // the paragraph branch because a table's first line looks like prose.
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const head = splitRow(lines[i]);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        body.push(splitRow(lines[i]));
        i += 1;
      }
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
        `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
      pushSectionText(head.concat(...body).join(' '));
      continue;
    }

    if (QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && QUOTE.test(lines[i])) { body.push(lines[i].match(QUOTE)[1]); i += 1; }
      const text = body.join(' ').trim();
      out.push(`<blockquote><p>${inline(text)}</p></blockquote>`);
      pushSectionText(text);
      continue;
    }

    if (UL.test(line) || OL.test(line)) {
      const ordered = OL.test(line);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(ordered ? OL : UL);
        if (!m) break;
        let text = ordered ? m[2] : m[1];
        i += 1;
        // Lazy continuation: an indented line belongs to the item above it.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !UL.test(lines[i].trim()) && !OL.test(lines[i].trim())) {
          text += ` ${lines[i].trim()}`;
          i += 1;
        }
        items.push(text);
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      pushSectionText(items.join(' '));
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !HR.test(lines[i]) &&
           !UL.test(lines[i]) && !OL.test(lines[i]) && !QUOTE.test(lines[i]) && !FENCE.test(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    const text = para.join(' ');
    out.push(`<p>${inline(text)}</p>`);
    pushSectionText(text);
  }

  return { html: out.join('\n'), sections };
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

// Inline pass. Order matters: escape everything first so no markdown rule can
// ever manufacture a tag, then lift code spans out behind placeholders so their
// contents are immune to the emphasis rules below.
const CODE_MARK = '\u0000c';

export function inline(text) {
  const codes = [];
  let s = esc(String(text)).replace(/`([^`]+)`/g, (_, body) => {
    codes.push(body);
    return `${CODE_MARK}${codes.length - 1}\u0000`;
  });

  s = s.replace(/!?\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (whole, label, href, title) => {
    if (!SAFE_SCHEME.test(href)) return label; // unsafe scheme: keep the words, drop the link
    const external = /^https?:\/\//i.test(href);
    const rel = external ? ' rel="noopener"' : '';
    const t = title ? ` title="${esc(title)}"` : '';
    return `<a href="${href}"${rel}${t}>${label || href}</a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,;:!?)])/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:!?)])/g, '$1<em>$2</em>');

  return s.replace(new RegExp(`${CODE_MARK}(\\d+)\\u0000`, 'g'), (_, n) => `<code>${codes[Number(n)]}</code>`);
}

// Plain text for meta descriptions and JSON-LD answers.
export function stripMarkup(html, limit = 300) {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`;
}
