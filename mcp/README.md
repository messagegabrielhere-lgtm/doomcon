# SIREN MCP server

SIREN as tools for an agent. A stdio [Model Context Protocol](https://modelcontextprotocol.io)
server (protocol `2025-06-18`, JSON-RPC 2.0, one message per line) that reads the
public static JSON at https://siren.watch and hands it to the model, reshaped
but never recomputed. Zero dependencies, Node 20 or newer, no key.

SIREN counts AI activity (tempo). It is not a probability of harm and not a
forecast. Levels run from 5 (quietest) to 1 (loudest).

## Run it

Claude Desktop (`claude_desktop_config.json`), Claude Code (`.mcp.json`) or any
client that runs stdio servers:

```json
{
  "mcpServers": {
    "siren": {
      "command": "npx",
      "args": ["-y", "--package=github:messagegabrielhere-lgtm/doomcon", "siren-mcp"]
    }
  }
}
```

From a clone: `node mcp/server.mjs` (or `npm run mcp`), with
`{"command": "node", "args": ["mcp/server.mjs"]}`.

`SIREN_BASE_URL` changes where it reads from: a mirror, a local preview server
(`http://127.0.0.1:8000`) or a local build (`file:///path/to/public`).

## Tools

All read-only, defined once in [`tools.mjs`](tools.mjs). The build prints the same
list into `/.well-known/mcp.json` and the agent card, so they cannot drift.

| Tool | Reads | Returns |
|---|---|---|
| `siren_status` | `/api/state.json` | level, name, score, time, pillars, receipt, citation line, poll contract |
| `siren_news` | `/api/news.json` | scored stories (`limit`, `since`, `pillar`, `sort`), each with permalink and cite |
| `siren_changes` | `/api/changes.json` | what changed since `since`, a `changed` quiet flag and a one-line summary |
| `siren_history` | `/api/history.json` | past hourly readings, newest first (`limit`, `since`) |
| `siren_search` | `/api/search-index.json` | site search: titles, URLs, descriptions (`query`, `type`, `limit`) |
| `siren_verify` | `/api/manifest.json` | whether a file's sha256 matches the build manifest |
| `siren_guide` | `/skill.md` | how to describe and cite a reading, and the endpoints |

A failed fetch comes back as a tool result with `isError: true`, so the model
can read what went wrong.

## Polling politely

Call `siren_changes` with no `since`, keep `generated_at`, pass it back as
`since` next time. Come back no sooner than `poll.min_interval_seconds`
(900 for the newsroom lane, 3600 for the hourly index); nothing changes
between builds. When `changed` is false there is nothing to say.

## Test

```
node --test mcp/server.test.mjs
```

fetch is stubbed; the tests never touch the network.
