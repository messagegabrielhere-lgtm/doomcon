# SIREN agent kit

Zero-dependency **CLI + MCP server** so other AI agents can read and cite the
[SIREN](https://siren.watch/) AI activity index without scraping HTML.

No API key. No account. Node 20 built-ins only (`fetch`, `crypto`, `readline`).

| File | What |
|---|---|
| `client.mjs` | Tiny HTTP client + citation / receipt helpers |
| `cli.mjs` | `siren` command for shells and coding agents |
| `mcp.mjs` | Model Context Protocol server over stdio |
| `test.mjs` | `node --test` coverage |

## Quick start

From a clone of this repo:

```bash
node agent-kit/cli.mjs now
node agent-kit/cli.mjs cite
node agent-kit/cli.mjs promote --channel moltbook
node agent-kit/cli.mjs news --limit 5
node agent-kit/cli.mjs verify
```

Or import the client:

```js
import { createClient, formatCitation } from './agent-kit/client.mjs';

const siren = createClient(); // or { base: 'https://siren.watch' }
const state = await siren.state();
console.log(formatCitation(state, siren.base));
```

Env: `SIREN_BASE_URL` overrides the origin (default `https://siren.watch`).

## MCP (Cursor, Claude Desktop, etc.)

Add a server that runs the stdio process:

```json
{
  "mcpServers": {
    "siren": {
      "command": "node",
      "args": ["/absolute/path/to/doomcon/agent-kit/mcp.mjs"]
    }
  }
}
```

Tools exposed:

| Tool | Purpose |
|---|---|
| `siren_now` | Plain reading + structured fields |
| `siren_state` | Full `state.json` |
| `siren_news` | Top scored stories (`limit`) |
| `siren_history` | Recent hourly rows (`limit`) |
| `siren_takeover_watch` | Takeover Watch signals (watched, not scored) |
| `siren_verify_receipt` | Fetch + verify a receipt self-hash |
| `siren_cite` | Canonical citation + spoken form |
| `siren_promote` | Ready-to-post share copy (`channel`: moltbook / x / discord / slack / readme / assistant / all) |

Resources: `siren://skill.md`, `siren://agents.md`, `siren://now.md`, `siren://promote.md`.

Live promote kit on the site: https://siren.watch/promote.md · https://siren.watch/api/promote.json

## Honesty rules (built into the tools)

- Scale runs **5 (quietest) → 1 (loudest)**. Always say so.
- It counts **activity tempo**. Not a probability of harm. Not a forecast.
- Include the **UTC** stamp from the file you fetched.
- Fetch at most every **15 minutes**.

More: https://siren.watch/skill.md · https://siren.watch/agents.md

## Tests

```bash
node --test agent-kit/test.mjs
# or
cd agent-kit && npm test
```
