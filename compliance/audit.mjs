#!/usr/bin/env node
// compliance/audit.mjs — scan the repo for the legal tripwires in rules.mjs,
// and fix what can be fixed safely.
//
//   node compliance/audit.mjs              # report; exit 1 on any HIGH finding
//   node compliance/audit.mjs --strict     # exit 1 on HIGH or MEDIUM
//   node compliance/audit.mjs --fix        # apply safe auto-fixes, then re-audit
//   node compliance/audit.mjs --report     # write compliance/REMEDIATION.md
//   node compliance/audit.mjs --json       # machine-readable output
//   node compliance/audit.mjs --dir public # also scan a built output folder
//
// Known, accepted findings go in compliance/allow.json with a reason and a
// review date; an allow entry past its date stops suppressing the finding.
// Private terms to keep out of the repo come from the COMPLIANCE_PII_TERMS
// environment variable (a GitHub secret), comma-separated, never printed.
//
// Zero dependencies. Not legal advice.

import { readFileSync, readdirSync, statSync, existsSync, appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, MANUAL } from './rules.mjs';
import { STEPS, AUTOFIX } from './remediate.mjs';

const ROOT = path.resolve(process.env.COMPLIANCE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };

const SKIP_DIR = /(^|\/)(node_modules|\.git|data|dist|coverage|\.cache)(\/|$)/;
const TEXT = /\.(html?|mjs|cjs|js|jsx|ts|tsx|json|ya?ml|md|txt|css|py|sh|env|toml|vue|svelte|astro)$|(^|\/)\.env[^/]*$/i;
const MAX = 2_000_000;
const buildDir = opt('dir');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (SKIP_DIR.test(path.relative(ROOT, abs))) continue;
    if (statSync(abs).isDirectory()) out.push(...walk(abs)); else out.push(abs);
  }
  return out;
}

function listFiles() {
  let paths;
  try {
    paths = execSync('git ls-files -z --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0').filter(Boolean);
  } catch {
    paths = walk(ROOT).map((p) => path.relative(ROOT, p));
  }
  if (buildDir && existsSync(path.join(ROOT, buildDir))) paths.push(...walk(path.join(ROOT, buildDir)).map((p) => path.relative(ROOT, p)));
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

function loadJson(rel, fallback) {
  const p = path.join(ROOT, rel);
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${rel}: ${e.message}`); }
}

const piiTerms = (process.env.COMPLIANCE_PII_TERMS || '').split(',').map((s) => s.trim()).filter((s) => s.length >= 4);
const allow = loadJson('compliance/allow.json', []);
const manualCfg = loadJson('compliance/manual.json', { done: [], na: [] });
const manualDone = new Set(manualCfg.done || []);
const manualNa = new Set(manualCfg.na || []); // not applicable today; re-check if the site changes
const today = new Date().toISOString().slice(0, 10);

function scan() {
  const files = listFiles();
  const findings = [];
  for (const rule of RULES) {
    let res = [];
    try { res = rule.check({ files, piiTerms }) || []; }
    catch (e) { res = [{ file: '(auditor)', line: 0, detail: `rule crashed: ${e.message}` }]; }
    for (const r of res) {
      const a = allow.find((x) => x.rule === rule.id && (!x.file || r.file === x.file || r.file.startsWith(x.file)));
      const suppressed = a && (!a.until || a.until >= today);
      findings.push({ rule: rule.id, severity: rule.severity, title: rule.title, law: rule.law, fix: rule.fix, ...r,
        autofix: !!AUTOFIX[rule.id], suppressed: !!suppressed, reason: suppressed ? a.reason : undefined });
    }
  }
  return { files, findings };
}

/** Apply every available auto-fix once per (rule, file). Returns the paths written. */
function applyFixes({ files, findings }) {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const done = new Set();
  const written = [];
  for (const f of findings) {
    if (f.suppressed || !AUTOFIX[f.rule]) continue;
    if (buildDir && f.file.startsWith(buildDir.replace(/\/$/, '') + '/')) continue; // never edit build output
    const key = `${f.rule}|${f.file}`;
    if (done.has(key)) continue;
    done.add(key);
    const file = byPath.get(f.file);
    if (!file) continue;
    const out = AUTOFIX[f.rule](file, { root: ROOT });
    if (!out) continue;
    for (const w of out) {
      const abs = path.join(ROOT, w.path);
      if (w.create && existsSync(abs)) continue;
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, w.text);
      const cur = byPath.get(w.path);
      if (cur) cur.text = w.text; // later fixes to the same file build on this one
      written.push(`${w.path}  (${f.rule})`);
    }
  }
  return written;
}

let result = scan();
let fixedPaths = [];
if (flag('fix')) {
  fixedPaths = applyFixes(result);
  if (fixedPaths.length) result = scan();
}
const { files, findings } = result;
const live = findings.filter((f) => !f.suppressed);
const count = (s) => live.filter((f) => f.severity === s).length;
const failOn = flag('strict') ? ['high', 'medium'] : ['high'];
const failed = live.some((f) => failOn.includes(f.severity));
const manualOpen = MANUAL.filter((m) => !manualDone.has(m.id) && !manualNa.has(m.id));
const icon = { high: '🔴', medium: '🟠', low: '🟡' };

if (flag('json')) {
  console.log(JSON.stringify({ scanned: files.length, fixed: fixedPaths, findings: findings.map((f) => ({ ...f, steps: STEPS[f.rule] || [] })), manualOpen, failed }, null, 2));
} else {
  console.log(`Compliance audit — ${files.length} files, ${RULES.length} rules${piiTerms.length ? `, ${piiTerms.length} private terms` : ''}\n`);
  if (fixedPaths.length) {
    console.log(`🔧 Auto-fixed ${fixedPaths.length}:`);
    for (const p of fixedPaths) console.log(`   ✓ ${p}`);
    console.log('   Review the diff (git diff) before committing.\n');
  } else if (flag('fix')) console.log('🔧 Nothing to auto-fix.\n');
  if (!live.length) console.log('✅ No open findings.\n');
  for (const rule of RULES) {
    const fs = live.filter((f) => f.rule === rule.id);
    if (!fs.length) continue;
    console.log(`${icon[rule.severity]} [${rule.severity.toUpperCase()}] ${rule.title}  (${rule.id})${AUTOFIX[rule.id] && !flag('fix') ? '  — run with --fix' : ''}`);
    console.log(`   Law: ${rule.law}`);
    for (const f of fs.slice(0, 20)) console.log(`   - ${f.file}:${f.line}  ${f.detail}`);
    if (fs.length > 20) console.log(`   … and ${fs.length - 20} more`);
    console.log('   Remediation:');
    (STEPS[rule.id] || [rule.fix]).forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
    console.log('');
  }
  const sup = findings.filter((f) => f.suppressed);
  if (sup.length) console.log(`Allowed by compliance/allow.json: ${sup.length}\n`);
  if (manualOpen.length) {
    console.log(`Manual checks open: ${manualOpen.length} (mark done in compliance/manual.json)`);
    for (const m of manualOpen) {
      console.log(`   ☐ ${m.text}  [${m.id}]`);
      if (flag('verbose')) (m.steps || []).forEach((s, i) => console.log(`       ${i + 1}. ${s}`));
    }
    if (!flag('verbose')) console.log('   (--verbose for step-by-step, or --report for compliance/REMEDIATION.md)');
    console.log('');
  }
  console.log(`High ${count('high')} · Medium ${count('medium')} · Low ${count('low')} → ${failed ? 'FAIL' : 'PASS'}`);
  console.log('Not legal advice. Have a lawyer review anything that takes money or user data.');
}

// A remediation plan a person can work through and tick off.
if (flag('report')) {
  const md = [
    '# Compliance remediation plan', '',
    `Generated by \`node compliance/audit.mjs --report\` on ${today}. ${files.length} files, ${RULES.length} rules.`, '',
    `**Status:** ${failed ? 'FAIL' : 'PASS'} · High ${count('high')} · Medium ${count('medium')} · Low ${count('low')} · Manual checks open ${manualOpen.length}`, '',
    '## Findings in the code', '',
  ];
  if (!live.length) md.push('None. Every automated rule passes.', '');
  for (const rule of RULES) {
    const fs = live.filter((f) => f.rule === rule.id);
    if (!fs.length) continue;
    md.push(`### ${icon[rule.severity]} ${rule.title} (\`${rule.id}\`, ${rule.severity})`, '', `*${rule.law}*`, '');
    for (const f of fs) md.push(`- \`${f.file}:${f.line}\` ${f.detail}`);
    md.push('', AUTOFIX[rule.id] ? '**Auto-fix available:** `node compliance/audit.mjs --fix`' : '**Needs a person.**', '');
    (STEPS[rule.id] || [rule.fix]).forEach((s) => md.push(`- [ ] ${s}`));
    md.push('');
  }
  md.push('## Checks only you can do', '', 'When one is done, add its id to `compliance/manual.json` under `"done"`.', '');
  for (const m of MANUAL) {
    const isDone = manualDone.has(m.id) || manualNa.has(m.id);
    md.push(`### ${manualDone.has(m.id) ? '✅' : manualNa.has(m.id) ? '➖ N/A' : '☐'} ${m.text} (\`${m.id}\`)`, '');
    if (!isDone) (m.steps || []).forEach((s) => md.push(`- [ ] ${s}`));
    md.push('');
  }
  md.push('---', 'Not legal advice. These are tripwires for common, costly mistakes, not a substitute for a lawyer.', '');
  writeFileSync(path.join(ROOT, 'compliance', 'REMEDIATION.md'), md.join('\n'));
  if (!flag('json')) console.log('\n📝 Wrote compliance/REMEDIATION.md');
}

// GitHub Actions job summary.
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = live.map((f) => `| ${f.severity} | ${f.rule} | \`${f.file}:${f.line}\` | ${String(f.detail).replace(/\|/g, '\\|')} | ${f.autofix ? '`--fix`' : 'manual'} |`);
  const steps = RULES.filter((r) => live.some((f) => f.rule === r.id))
    .map((r) => `**${r.id}**\n` + (STEPS[r.id] || [r.fix]).map((s, i) => `${i + 1}. ${s}`).join('\n')).join('\n\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    `## Compliance audit: ${failed ? '❌ FAIL' : '✅ PASS'}`,
    `${files.length} files · High ${count('high')} · Medium ${count('medium')} · Low ${count('low')}`, '',
    rows.length ? '| Severity | Rule | Where | Detail | Remedy |\n|---|---|---|---|---|\n' + rows.join('\n') : 'No open findings.', '',
    steps ? '### Remediation\n' + steps : '', '',
    manualOpen.length ? '### Manual checks still open\n' + manualOpen.map((m) => `- [ ] ${m.text}`).join('\n') : '', '',
  ].join('\n'));
}

process.exit(failed ? 1 : 0);
