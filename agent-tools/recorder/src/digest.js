'use strict';
// Turns the raw log into a short plain-English report for the agent's human.

function fmtBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

function digest(entries, { sinceMs = 24 * 3600 * 1000, now = Date.now(), verifyResult } = {}) {
  const from = now - sinceMs;
  const win = entries.filter(e => !e.__corrupt && Date.parse(e.ts) >= from);
  const files = win.filter(e => e.type === 'file');
  const net = win.filter(e => e.type === 'net');
  const cmds = win.filter(e => e.type === 'exec');

  const counts = { created: 0, modified: 0, deleted: 0 };
  const byPath = new Map();
  for (const f of files) {
    counts[f.data.action]++;
    byPath.set(f.data.path, (byPath.get(f.data.path) || 0) + 1);
  }

  const hosts = new Map();
  for (const n of net) {
    const h = hosts.get(n.data.host) || { calls: 0, out: 0, in: 0, first: false, errors: 0 };
    h.calls++; h.out += n.data.bytesOut || 0; h.in += n.data.bytesIn || 0;
    if (n.data.firstContact) h.first = true;
    if (n.data.error) h.errors++;
    hosts.set(n.data.host, h);
  }
  const failed = cmds.filter(c => c.data.exitCode !== 0);

  const L = [];
  const hours = Math.round(sinceMs / 3600000);
  L.push(`SIREN Flight Recorder — last ${hours}h (${new Date(from).toISOString().slice(0, 16).replace('T', ' ')} → ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC)`);
  L.push('');
  if (verifyResult) {
    L.push(verifyResult.ok
      ? `✅ Log integrity: all ${verifyResult.count} entries verified, nothing edited or removed.`
      : `🚨 Log integrity: ${verifyResult.problems.length} problem(s) — the record was altered. First: line ${verifyResult.problems[0].line}, ${verifyResult.problems[0].reason}.`);
    L.push('');
  }

  const attention = [];
  for (const [h, v] of hosts) if (v.first) attention.push(`First-ever contact with ${h} (${v.calls} call${v.calls > 1 ? 's' : ''}, sent ${fmtBytes(v.out)})`);
  for (const c of failed) attention.push(`Command failed (exit ${c.data.exitCode}): ${c.data.command}${c.data.stderrTail ? ` — "${c.data.stderrTail.split('\n').filter(Boolean).pop()}"` : ''}`);
  if (counts.deleted) attention.push(`${counts.deleted} file(s) deleted`);
  L.push('Needs your attention:');
  L.push(attention.length ? attention.map(a => '  • ' + a).join('\n') : '  • Nothing unusual.');
  L.push('');

  L.push(`Files: ${counts.created} created, ${counts.modified} modified, ${counts.deleted} deleted.`);
  const topFiles = [...byPath].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [p, n] of topFiles) L.push(`  • ${p} (${n} change${n > 1 ? 's' : ''})`);
  L.push('');

  const totalOut = [...hosts.values()].reduce((s, h) => s + h.out, 0);
  L.push(`Network: ${net.length} connection(s) to ${hosts.size} host(s), ${fmtBytes(totalOut)} sent.`);
  const topHosts = [...hosts].sort((a, b) => b[1].out - a[1].out).slice(0, 8);
  for (const [h, v] of topHosts) L.push(`  • ${h}: ${v.calls} call(s), sent ${fmtBytes(v.out)}, received ${fmtBytes(v.in)}${v.errors ? `, ${v.errors} failed` : ''}`);
  L.push('');

  if (cmds.length) L.push(`Commands: ${cmds.length} run, ${failed.length} failed.`);
  L.push('Undo any file change with:  siren-fr rollback <path>');
  return L.join('\n');
}

module.exports = { digest, fmtBytes };
