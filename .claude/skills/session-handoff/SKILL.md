---
name: session-handoff
description: Compact the current session into a handoff for the next agent. Use at end of work, when switching tasks, or when the user asks to save context for later. Complements claude-mem when that plugin is installed.
disable-model-invocation: false
---

# Session handoff

Leave a short, durable note so the next session does not start from scratch.

## Prefer claude-mem when available

If the **claude-mem** plugin is installed
([thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)), let it
capture observations automatically. Still write a human handoff when the user
asks for an explicit summary or the next session focus is narrow.

## Fallback file

Write (or replace) **`.claude/memory/handoff.md`** in the workspace.
That path is gitignored — never commit secrets or credentials into it.

Also optional: copy a redacted version to `$TMPDIR/siren-handoff.md` if the user
wants something outside the repo.

## Contents (keep short)

```markdown
# Handoff — YYYY-MM-DD

## Goal
One sentence: what we were doing.

## Done
- Bullet list of landed changes (paths + verify commands that passed)

## Not done / next
- Ordered next steps with success checks

## Decisions
- Only durable choices and why (skip transient chat)

## Pitfalls
- Surprising repo constraints hit this session

## Suggested skills
- List skill names the next agent should load (e.g. siren-verify, karpathy-guidelines)
```

## Rules

- Do not duplicate long specs — link to `docs/…`, issues, or commits.
- Redact API keys, tokens, emails, and private URLs.
- If the user stated a focus for the next session, tailor "Not done / next" to that.
- End by telling the user the path written.
