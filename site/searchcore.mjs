// THE SEARCH ENGINE, one copy. It runs in the browser twice — on /search.html
// and inside the header's "All rooms" finder (nav/site-nav.js) — and in node
// for the tests, so it is written once as a plain ES5 function and shipped as
// its own source text (SEARCH_CORE_JS). No library: the index is a few hundred
// rows, and a token scan over that is instant on any phone.
//
// The index (api/search-index.json, built by templates/catalogPages.mjs) is
//   { v, at, types: { key: label }, order: [key...], items: [[type, title, url, desc, keys, icon], ...] }
// url is site-relative ('/race.html') or absolute ('https://...') for outside links.

/* eslint-disable no-var */
export function sirenSearchCore() {
  var STOP = { the: 1, a: 1, an: 1, of: 1, and: 1, or: 1, to: 1, in: 1, on: 1, for: 1, is: 1, it: 1, at: 1, by: 1, with: 1 };
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function toks(q) {
    var t = norm(q).split(' ').filter(Boolean);
    var keep = t.filter(function (w) { return !STOP[w]; });
    return keep.length ? keep : t;
  }
  // Edit distance of at most one (insert, delete, substitute or swap two
  // neighbours): enough to forgive "datacenter"/"datacentre"-style slips.
  function near(a, b) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0;
    while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++;
    if (i === la && i === lb) return true;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  // 4 whole word, 3 word prefix, 1.5 inside a word, 1 one slip away, 0 none.
  function tokScore(tok, words, flat) {
    var best = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === tok) return 4;
      if (w.indexOf(tok) === 0) best = Math.max(best, 3);
      else if (best < 1 && tok.length >= 4 && near(tok, w)) best = 1;
    }
    if (best < 1.5 && tok.length >= 3 && flat.indexOf(tok) >= 0) best = 1.5;
    return best;
  }
  function prep(index) {
    var labels = (index && index.types) || {};
    return ((index && index.items) || []).map(function (it, n) {
      var t = norm(it[1]), k = norm((it[4] || '') + ' ' + (labels[it[0]] || it[0])), d = norm(it[3]);
      return { it: it, n: n, t: t, tw: t.split(' '), k: k, kw: k.split(' '), d: d, dw: d.split(' ') };
    });
  }
  // rows: prep(index). Returns [{ it, score }] best first; every token must hit.
  function search(rows, q, opt) {
    var tk = toks(q), out = [];
    if (!tk.length) return out;
    var only = opt && opt.type, phrase = norm(q);
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (only && row.it[0] !== only) continue;
      var total = 0, ok = true;
      for (var j = 0; j < tk.length; j++) {
        var s = Math.max(tokScore(tk[j], row.tw, row.t) * 3, tokScore(tk[j], row.kw, row.k) * 2, tokScore(tk[j], row.dw, row.d));
        if (!s) { ok = false; break; }
        total += s;
      }
      if (!ok) continue;
      if (phrase && row.t.indexOf(phrase) === 0) total += 8;
      else if (phrase.length > 3 && row.t.indexOf(phrase) >= 0) total += 4;
      out.push({ it: row.it, score: total - row.n * 1e-6 });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Escaped text with each query word marked where a word starts with it.
  function hl(text, q) {
    text = String(text == null ? '' : text);
    var tk = toks(q).filter(function (t) { return t.length > 1; }).sort(function (a, b) { return b.length - a.length; });
    if (!tk.length) return esc(text);
    var re = new RegExp('(' + tk.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    var out = '', last = 0, m;
    while ((m = re.exec(text))) {
      var prev = m.index ? text.charAt(m.index - 1) : ' ';
      if (/[a-z0-9]/i.test(prev)) { if (re.lastIndex === m.index) re.lastIndex++; continue; }
      out += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  return { norm: norm, toks: toks, near: near, prep: prep, search: search, hl: hl, esc: esc };
}

/** Browser source: defines window.sirenSearch once. */
export const SEARCH_CORE_JS = `window.sirenSearch=window.sirenSearch||(${sirenSearchCore.toString()})();`;
