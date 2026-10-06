#!/usr/bin/env node
// compliance/audit.mjs — scan the repo for the legal tripwires in rules.mjs.
//
//   node compliance/audit.mjs              # report; exit 1 on any HIGH finding
//   node compliance/audit.mjs --strict     # exit 1 on HIGH or MEDIUM
//   node compliance/audit.mjs --json       # machine-readable output
//   node compliance/audit.mjs --dir public # also scan a built output folder
//
// Known, accepted findings go in compliance/allow.json with a reason and a
// review date; an allow entry past its date stops suppressing the finding.
// Private terms to keep out of the repo come from the COMPLIANCE_PII_TERMS
// environment variable (a GitHub secret), comma-separated, never printed.
//
// Zero dependencies. Not legal advice.

import { readFileSync, readdirSync, statSync, existsSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, MANUAL } from './rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };

const SKIP_DIR = /(^|\/)(node_modules|\.git|data|dist|coverage|\.cache)(\/|$)/;
const TEXT = /\.(html?|mjs|cjs|js|jsx|ts|tsx|json|ya?ml|md|txt|css|py|sh|env|toml|vue|svelte|astro)$|(^|\/)\.env[^/]*$/i;
const MAX = 2_000_000;

function listFiles() {
  let paths;
  try {
    paths = execSync('git ls-files -z', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0').filter(Boolean);
  } catch {
    paths = walk(ROOT).map((p) => path.relative(ROOT, p));
  }
  const extra = opt('dir');
  if (extra && existsSync(path.join(ROOT, extra))) paths.push(...walk(path.join(ROOT, extra)).map((p) => path.relative(ROOT, p)));
  return [...new Set(paths)]
    .filter((p) => !SKIP_DIR.test(p) && TEXT.test(p) && !p.startsWith('compliance/'))
    .map((p) => {
      const abs = path.join(ROOT, p);
      try {
        if (statSync(abs).size > MAX) return null;
        return { path: p.split(path.sep).join('/'), text: readFileSync(abs, 'utf8') };
      } catch { return null; }
    })
    .filter(Boolean);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = path.relative(ROOT, abs);
    if (SKIP_DIR.test(rel)) continue;
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs)); else out.push(abs);
  }
  return out;
}

function loadJson(rel, fallback) {
  const p = path.join(ROOT, rel);
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${rel}: ${e.message}`); }
}

const files = listFiles();
const piiTerms = (process.env.COMPLIANCE_PII_TERMS || '').split(',').map((s) => s.trim()).filter((s) => s.length >= 4);
const allow = loadJson('compliance/allow.json', []);
const manualDone = new Set(loadJson('compliance/manual.json', { done: [] }).done || []);
const today = new Date().toISOString().slice(0, 10);

const findings = [];
for (const rule of RULES) {
  let res = [];
  try { res = rule.check({ files, piiTerms }) || []; }
  catch (e) { res = [{ file: '(auditor)', line: 0, detail: `rule crashed: ${e.message}` }]; }
  for (const r of res) {
    const a = allow.find((x) => x.rule === rule.id && (!x.file || r.file === x.file || r.file.startsWith(x.file)));
    const suppressed = a && (!a.until || a.until >= today);
    findings.push({ rule: rule.id, severity: rule.severity, title: rule.title, law: rule.law, fix: rule.fix, ...r,
      suppressed: !!suppressed, reason: suppressed ? a.reason : undefined });
  }
}

const live = findings.filter((f) => !f.suppressed);
const count = (s) => live.filter((f) => f.severity === s).length;
const failOn = flag('strict') ? ['high', 'medium'] : ['high'];
const failed = live.some((f) => failOn.includes(f.severity));
const manualOpen = MANUAL.filter((m) => !manualDone.has(m.id));

if (flag('json')) {
  console.log(JSON.stringify({ scanned: files.length, findings, manualOpen, failed }, null, 2));
} else {
  const icon = { high: '🔴', medium: '🟠', low: '🟡' };
  console.log(`Compliance audit — ${files.length} files, ${RULES.length} rules${piiTerms.length ? `, ${piiTerms.length} private terms` : ''}\n`);
  if (!live.length) console.log('✅ No open findings.\n');
  for (const rule of RULES) {
    const fs = live.filter((f) => f.rule === rule.id);
    if (!fs.length) continue;
    console.log(`${icon[rule.severity]} [${rule.severity.toUpperCase()}] ${rule.title}  (${rule.id})`);
    console.log(`   Law: ${rule.law}`);
    console.log(`   Fix: ${rule.fix}`);
    for (const f of fs.slice(0, 20)) console.log(`   - ${f.file}:${f.line}  ${f.detail}`);
    if (fs.length > 20) console.log(`   … and ${fs.length - 20} more`);
    console.log('');
  }
  const sup = findings.filter((f) => f.suppressed);
  if (sup.length) console.log(`Allowed by compliance/allow.json: ${sup.length}\n`);
  if (manualOpen.length) {
    console.log('Manual checks (mark done in compliance/manual.json):');
    for (const m of manualOpen) console.log(`   ☐ ${m.text}`);
    console.log('');
  }
  console.log(`High ${count('high')} · Medium ${count('medium')} · Low ${count('low')} → ${failed ? 'FAIL' : 'PASS'}`);
  console.log('Not legal advice. Have a lawyer review anything that takes money or user data.');
}

// GitHub Actions job summary.
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = live.map((f) => `| ${f.severity} | ${f.rule} | \`${f.file}:${f.line}\` | ${String(f.detail).replace(/\|/g, '\\|')} |`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    `## Compliance audit: ${failed ? '❌ FAIL' : '✅ PASS'}`,
    `${files.length} files · High ${count('high')} · Medium ${count('medium')} · Low ${count('low')}`, '',
    rows.length ? '| Severity | Rule | Where | Detail |\n|---|---|---|---|\n' + rows.join('\n') : 'No open findings.', '',
    manualOpen.length ? '### Manual checks still open\n' + manualOpen.map((m) => `- [ ] ${m.text}`).join('\n') : '', '',
  ].join('\n'));
}

process.exit(failed ? 1 : 0);
