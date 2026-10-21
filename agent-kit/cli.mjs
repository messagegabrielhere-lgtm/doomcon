#!/usr/bin/env node
// siren — tiny CLI for agents and humans.
//
//   node agent-kit/cli.mjs now
//   node agent-kit/cli.mjs cite
//   node agent-kit/cli.mjs news --limit 5
//   node agent-kit/cli.mjs verify [receipt_id]
//   node agent-kit/cli.mjs state --json

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import {
  createClient,
  formatCitation,
  formatSpoken,
  formatPromote,
  topNews,
  recentHistory,
  verifyReceipt,
  NOT_CLAIM,
} from './client.mjs';

const USAGE = `siren — read the SIREN AI activity index

Usage:
  siren now                 Current reading (plain text)
  siren cite                Citation line + spoken form
  siren promote [--channel C]  Ready-to-post share copy (moltbook|x|discord|slack|readme|assistant|all)
  siren state [--json]      Full state.json
  siren news [--limit N]    Top scored stories
  siren history [--limit N] Recent hourly readings
  siren takeover            Takeover Watch signals
  siren verify [receipt_id] Verify a receipt self-hash
  siren skill               Print skill.md
  siren help

Env:
  SIREN_BASE_URL   Origin (default https://siren.watch)

${NOT_CLAIM}
Scale: 5 quietest → 1 loudest. Fetch at most every 15 minutes.
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--limit' || a === '-n') args.limit = Number.parseInt(argv[++i], 10);
    else if (a === '--channel' || a === '-c') args.channel = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('-')) throw new Error(`Unknown flag: ${a}`);
    else args._.push(a);
  }
  return args;
}

async function main(argv = process.argv.slice(2), { client = createClient(), stdout = console.log, stderr = console.error } = {}) {
  const args = parseArgs(argv);
  const cmd = args._[0] || 'now';
  if (args.help || cmd === 'help' || cmd === '--help') {
    stdout(USAGE.trimEnd());
    return 0;
  }

  switch (cmd) {
    case 'now': {
      stdout((await client.nowTxt()).trimEnd());
      return 0;
    }
    case 'cite': {
      const state = await client.state();
      stdout(formatCitation(state, client.base));
      stdout(formatSpoken(state));
      stdout(`Source: ${client.base}/`);
      return 0;
    }
    case 'promote': {
      const state = await client.state();
      const channel = args.channel || args._[1] || 'all';
      const kit = formatPromote(state, client.base, channel);
      if (args.json) {
        stdout(JSON.stringify(kit));
        return 0;
      }
      if (channel !== 'all' && kit.text) {
        stdout(kit.text);
        return 0;
      }
      stdout(`citation:\n${kit.citation}\n`);
      stdout(`spoken:\n${kit.spoken}\n`);
      stdout(`moltbook:\n${kit.moltbook}\n`);
      stdout(`x:\n${kit.x}\n`);
      stdout(`discord:\n${kit.discord}\n`);
      stdout(`slack:\n${kit.slack}\n`);
      stdout(`readme:\n${kit.readme}\n`);
      stdout(`assistant:\n${kit.assistant}`);
      return 0;
    }
    case 'state': {
      const state = await client.state();
      stdout(args.json ? JSON.stringify(state) : JSON.stringify(state, null, 2));
      return 0;
    }
    case 'news': {
      const news = await client.news();
      const items = topNews(news, args.limit);
      if (args.json) {
        stdout(JSON.stringify({ generated_at: news.generated_at || null, items }));
      } else {
        for (const [i, it] of items.entries()) {
          stdout(`${i + 1}. ${it.title} (${it.score})`);
          stdout(`   ${it.url}`);
        }
      }
      return 0;
    }
    case 'history': {
      const history = await client.history();
      const rows = recentHistory(history, args.limit);
      stdout(args.json ? JSON.stringify(rows) : JSON.stringify(rows, null, 2));
      return 0;
    }
    case 'takeover': {
      const sig = await client.siSignals();
      stdout(args.json ? JSON.stringify(sig) : JSON.stringify(sig, null, 2));
      return 0;
    }
    case 'verify': {
      let id = args._[1];
      if (!id) id = (await client.state()).receipt_id;
      const receipt = await client.receipt(id);
      const result = verifyReceipt(receipt);
      if (result.ok) {
        stdout(`OK ${result.id} ${result.actual}`);
        return 0;
      }
      stderr(`FAIL ${result.id || id}: ${result.error || `${result.expected} != ${result.actual}`}`);
      return 1;
    }
    case 'skill': {
      stdout((await client.skillMd()).trimEnd());
      return 0;
    }
    default:
      stderr(`Unknown command: ${cmd}\n\n${USAGE}`);
      return 2;
  }
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(entry)).href;
  } catch {
    return entry.endsWith('cli.mjs');
  }
}

if (isMainModule()) {
  main().then((code) => process.exit(code ?? 0)).catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}

export { main, parseArgs, USAGE };
