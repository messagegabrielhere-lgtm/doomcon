// ANONYMITY GUARD. The owner runs SIREN pseudonymously. This test fails the
// build if a tracked file carries a personal email address, a phone number,
// or image metadata that names a creator or a design-tool account. It holds
// no personal data itself: every check is a generic pattern.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const TEXT = /\.(m?js|json|md|ya?ml|html|txt|cff|sh|css|svg|xml|toml)$/i;
const IMG = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
// data/ holds third-party feed content (news, posts); it is not authored here.
const skip = (f) => f.startsWith('data/') || f.startsWith('public/') || f.includes('/fixtures/');

const PERSONAL_EMAIL = /\b[A-Za-z0-9._%+-]+@(gmail|googlemail|proton|protonmail|pm|yahoo|outlook|hotmail|icloud|me|aol)\.(com|me|ch)\b/i;
const US_PHONE = /(?<![\d.])\(?[2-9]\d{2}\)?[ .-][2-9]\d{2}[ .-]\d{4}(?![\d.])/;

test('anonymity: no personal email addresses or phone numbers in authored files', () => {
  const hits = [];
  for (const f of files) {
    if (skip(f) || !TEXT.test(f)) continue;
    let s; try { s = readFileSync(f, 'utf8'); } catch { continue; }
    const e = s.match(PERSONAL_EMAIL); if (e) hits.push(`${f}: email ${e[0].replace(/^[^@]+/, '***')}`);
    const p = s.match(US_PHONE); if (p) hits.push(`${f}: phone-like ${p[0].slice(0, 3)}…`);
  }
  assert.deepEqual(hits, []);
});

test('anonymity: images carry no creator names or design-tool account ids', () => {
  const hits = [];
  for (const f of files) {
    if (!IMG.test(f) || f.startsWith('public/')) continue;
    const b = readFileSync(f).toString('latin1');
    const c = b.match(/<(?:rdf:li|pdf:Author|dc:creator)>\s*([^<\s][^<]*)</);
    if (c && /<dc:creator>[\s\S]{0,80}?<rdf:li>\s*[^<\s]/.test(b)) hits.push(`${f}: creator metadata`);
    if (/<pdf:Author>\s*[^<\s]/.test(b)) hits.push(`${f}: pdf:Author`);
    if (/\b(?:user|brand|doc)=(?!x+\b)[A-Za-z0-9_-]{6,}/.test(b)) hits.push(`${f}: design-tool ids`);
  }
  assert.deepEqual(hits, []);
});
