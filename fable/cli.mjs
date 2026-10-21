#!/usr/bin/env node
// Claude Fable autonomous paper trader CLI.
//
//   node fable/cli.mjs once --dir fable-out
//   node fable/cli.mjs guard --dir fable-out
//   node fable/cli.mjs loop --dir fable-out --every 3600
//   node fable/cli.mjs status --dir fable-out
//   node fable/cli.mjs learn --dir fable-out
//
// Not investment advice. Paper trading only.

import { tick } from './agent.mjs';
import { readStatus } from './journal.mjs';
import { AGENT_NAME, START_CASH, modelFor, modeLabel } from './config.mjs';
import { memoryPromptBlock } from './improve.mjs';

const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const flag = (k) => args.includes(k);
const opt = (k, d = null) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};

function help() {
  console.log(`Claude Fable stock & crypto paper trader (self-improving)

Usage:
  node fable/cli.mjs once   [--dir DIR]     one think + guard + improve tick
  node fable/cli.mjs guard  [--dir DIR]     stop/target guard + improve
  node fable/cli.mjs loop   [--dir DIR] [--every SEC]   repeat once ticks
  node fable/cli.mjs status [--dir DIR]     wallet + adapt summary
  node fable/cli.mjs learn  [--dir DIR]     print lessons / memory block
  node fable/cli.mjs help

Env:
  ANTHROPIC_API_KEY   required for the model (else rule fallback)
  FABLE_MODEL         default claude-fable-5-1
  FABLE_FALLBACK=1    force rule-based stand-in
  FABLE_REFLECT=0     skip model reflection after exits (rules still learn)
  FABLE_LIVE          must stay unset — live orders are not implemented

Self-improvement: each tick updates lessons + size/stop adapt knobs from
your own paper outcomes (and optional model reflection). See memory.json.

Not investment advice. Simulated fills against public Coinbase / Yahoo prices.`);
}

async function status(dir) {
  const state = await readStatus(dir);
  if (!state) {
    console.log(`no state yet in ${dir}`);
    return;
  }
  const w = state.wallet;
  const m = state.memory;
  const pos = Object.entries(w.positions || {}).map(([sym, p]) =>
    `  ${sym} qty=${+p.qty.toPrecision(6)} avg=${p.avg} stop=${p.stop} tp=${p.tp ?? '-'}`);
  console.log(`${AGENT_NAME} — ${modeLabel()} — model ${state.model || modelFor()}`);
  console.log(`cash $${w.cash?.toFixed?.(2) ?? w.cash}  equity $${w.equity ?? '?'}  start $${START_CASH}`);
  console.log(`status ${w.status}  turns ${w.turns}  bias ${w.bias || '-'}  servedBy ${w.servedBy || '-'}`);
  if (m?.stats) {
    console.log(
      `learn: closed ${m.stats.closed}  winRate ${m.stats.winRate ?? '-'}%  net $${m.stats.sumPnl ?? 0}`
      + `  stance ${m.adapt?.stance}  sizeScale ${m.adapt?.sizeScale}  lessons ${m.lessons?.length || 0}`,
    );
  }
  if (w.note) console.log(`note: ${w.note}`);
  if (w.error) console.log(`error: ${w.error}`);
  console.log(pos.length ? `positions:\n${pos.join('\n')}` : 'positions: (none)');
  console.log(`updated ${state.updatedAt ? new Date(state.updatedAt).toISOString() : '-'}`);
  console.log(state.disclaimer || 'Not investment advice.');
}

async function learn(dir) {
  const state = await readStatus(dir);
  if (!state?.memory) {
    console.log(`no memory yet in ${dir}`);
    return;
  }
  console.log(memoryPromptBlock(state.memory));
  if (state.memory.lastReflect?.note) {
    console.log(`\nLast model reflect: ${state.memory.lastReflect.note}`);
  }
}

async function once(dir, guardOnly) {
  const { ledger, state } = await tick({ dir, guardOnly });
  const w = state.wallet;
  const m = state.memory;
  console.log(
    `fable: ${guardOnly ? 'guard' : 'turn'} — equity $${w.equity} — ${ledger.length} ledger entries`
    + ` — lessons ${m?.lessons?.length || 0} stance ${m?.adapt?.stance || '-'} → ${dir}`,
  );
}

async function loop(dir, everySec) {
  const every = Math.max(30, Number(everySec) || 3600) * 1000;
  console.log(`fable loop every ${every / 1000}s → ${dir} (Ctrl+C to stop)`);
  for (;;) {
    try {
      await once(dir, false);
    } catch (e) {
      console.error(`tick failed: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, every));
  }
}

const dir = opt('--dir', 'fable-out');

if (cmd === 'help' || flag('--help') || flag('-h')) help();
else if (cmd === 'status') await status(dir);
else if (cmd === 'learn') await learn(dir);
else if (cmd === 'once') await once(dir, false);
else if (cmd === 'guard') await once(dir, true);
else if (cmd === 'loop') await loop(dir, opt('--every', '3600'));
else {
  console.error(`unknown command: ${cmd}`);
  help();
  process.exit(1);
}
