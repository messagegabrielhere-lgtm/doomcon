// Shared NEWS_KEYWORD_LABS / probe needle matcher.
// FINDABILITY #310 — hyphen↔space equivalence so "GPT 6 Astra" matches
// lab "GPT-6 Astra" (and CERT-In / MAI-Base / Qwen3.8-27B space forms).
// FINDABILITY #388 — letter↔digit boundary flex so glued version labs like
// "Qwen3.8" match live titles that write "Qwen 3.8" (and Nemotron3.5 /
// MI 300 forms). Hyphen/space separators stay optional between atoms.

/**
 * Boundary regex for a lab / probe needle.
 * FINDABILITY #216 — Coinbase "Base" must not match the Base token inside
 * MAI-Base / MAI-Base-2 (hyphen is otherwise a valid non-alnum boundary).
 * FINDABILITY #310 — inside multi-token labs, `-` and whitespace are equivalent.
 * FINDABILITY #388 — letter↔digit edges inside a token are also flexible
 * separators (Qwen3.8 ↔ Qwen 3.8).
 *
 * @param {string} lab
 * @returns {RegExp}
 */
export function labNeedleRe(lab) {
  if (lab === 'Base') {
    const esc = String(lab).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^A-Za-z0-9-])${esc}(?:[^A-Za-z0-9]|$)`, 'i');
  }
  const chunks = String(lab).split(/[\s\-]+/).filter(Boolean);
  const parts = [];
  for (const chunk of chunks) {
    // Split letter↔digit so "Qwen3.8" → ["Qwen","3.8"] and "27B" → ["27","B"].
    // Dots stay with digit runs (3.8 / 4.7 / 6.1).
    const atoms = chunk.split(/(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])/).filter(Boolean);
    for (const atom of atoms) parts.push(atom);
  }
  const esc = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Optional separators: glued (Qwen3.8), spaced (Qwen 3.8), or hyphenated.
  const body = esc.join('[\\s\\-]*');
  return new RegExp(`(?:^|[^A-Za-z0-9])${body}(?:[^A-Za-z0-9]|$)`, 'i');
}
