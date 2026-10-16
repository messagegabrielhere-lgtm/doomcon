// Shared NEWS_KEYWORD_LABS / probe needle matcher.
// FINDABILITY #310 — hyphen↔space equivalence so "GPT 6 Astra" matches
// lab "GPT-6 Astra" (and CERT-In / MAI-Base / Qwen3.8-27B space forms).

/**
 * Boundary regex for a lab / probe needle.
 * FINDABILITY #216 — Coinbase "Base" must not match the Base token inside
 * MAI-Base / MAI-Base-2 (hyphen is otherwise a valid non-alnum boundary).
 * FINDABILITY #310 — inside multi-token labs, `-` and whitespace are equivalent.
 *
 * @param {string} lab
 * @returns {RegExp}
 */
export function labNeedleRe(lab) {
  if (lab === 'Base') {
    const esc = String(lab).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^A-Za-z0-9-])${esc}(?:[^A-Za-z0-9]|$)`, 'i');
  }
  const parts = String(lab)
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const body = parts.join('[\\s\\-]+');
  return new RegExp(`(?:^|[^A-Za-z0-9])${body}(?:[^A-Za-z0-9]|$)`, 'i');
}
