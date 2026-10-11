# Claude Code setup for SIREN

How to make Claude Code (and Cursor) sharper on this repo without breaking the
Node built-ins contract. The index pipeline still ships with zero plugin deps.

In-repo harness (always present):

- Root [`CLAUDE.md`](../CLAUDE.md) — Karpathy rules + SIREN hard rules
- [`.claude/skills/`](../.claude/skills/) — verify, TDD, handoff, tooling catalog
- [`.claude/agents/`](../.claude/agents/) — optional role briefs (voice still wins)
- [`.cursor/rules/`](../.cursor/rules/) — same constraints for Cursor

---

## 1. Install the Claude Code packs (operator machine)

Run these in your home environment, not inside the Docker collect job.

### mattpocock skills (daily engineering)

```bash
claude plugin install mattpocock-skills@claude-plugins-official
```

Then in a Claude Code session on this repo: `/setup-matt-pocock-skills`

Or editable copies via skills.sh:

```bash
npx skills@latest add mattpocock/skills -a claude-code
```

Do **not** install both the plugin and skills.sh copies for the same agent
(you get every skill twice). Upstream: https://github.com/mattpocock/skills

### ECC (skills, memory, security harness)

```bash
npx ecc-universal@2.2.3 setup
```

Choose one install path (guided setup **or** native plugin). Do not stack a
full manual Claude install on top. For Cursor + Claude Code on one machine, keep
memory roots separate (`ECC_AGENT_DATA_HOME` / Cursor `~/.cursor/ecc`) so they
do not overwrite each other.

Upstream: https://github.com/affaan-m/ECC

### Karpathy guidelines

Already adapted into root `CLAUDE.md` and `.claude/skills/karpathy-guidelines/`.
Optional upstream install: https://github.com/multica-ai/andrej-karpathy-skills

### claude-mem (cross-session memory)

```bash
npx claude-mem install
```

or:

```text
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Without the plugin, use the in-repo `session-handoff` skill →
`.claude/memory/handoff.md` (gitignored).

Upstream: https://github.com/thedotmack/claude-mem

---

## 2. Utility tools (optional)

These help content and ops. They are **not** part of the scoring pipeline.

| Tool | Role | Start |
|---|---|---|
| [diagram-design](https://github.com/cathrynlavery/diagram-design) | Brand diagrams (HTML+SVG) | `npx skills add cathrynlavery/diagram-design` |
| [ppt-master](https://github.com/hugohe3/ppt-master) | Editable PPTX from docs | See upstream README |
| [VoiceStudio](https://github.com/debpalash/VoiceStudio) | Local voice / dub / transcript | See upstream README |
| [paperclip](https://github.com/paperclipai/paperclip) | Multi-agent staff orchestration | See upstream README |
| [gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) | Browser 3D globe / traffic viz | See upstream README |
| [REA](https://github.com/morluto/rea) | Analyze software you are allowed to inspect | Operator-only; not for unauthorized RE |

When an agent should pick among these, load the `tooling-catalog` skill.

**Voice rule for decks and voiceovers:** numbers stay rigorous; no doom
probability or forecast claims (`docs/VOICE.md`).

---

## 3. What stays out of the SIREN tree

- No new `package.json` dependencies for collector/site/agent-kit
- No vendoring ECC / claude-mem / VoiceStudio into this git repo
- No secrets from any of these tools committed under `site/` or `.env`

---

## 4. Quick check that the in-repo harness is visible

```bash
test -f CLAUDE.md && test -d .claude/skills && echo ok
```

In Claude Code, skills under `.claude/skills/*/SKILL.md` should be discoverable.
In Cursor, `.cursor/rules/*.mdc` apply automatically.
