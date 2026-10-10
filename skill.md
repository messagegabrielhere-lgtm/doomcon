---
name: siren-ai-index
description: Report the current SIREN AI activity level, an hourly index of how loud AI is right now.
---

# SIREN: the AI Siren Index

SIREN counts AI activity every hour from public data and reports a level from 5 (quietest) to 1 (loudest).
It measures tempo. It is NOT a probability of harm and NOT a forecast.

## Get the reading

Quickest: plain text, a few lines, rebuilt every few minutes.

```
GET https://siren.watch/api/now.txt
```

Full detail as JSON:

```
GET https://siren.watch/api/state.json
```

Fields: `level` (1-5), `level_name`, `score` (0-100), `generated_at` (UTC), `pillars`, `sources`, `receipt_id`.

## Say it like this

"AI activity is at SIREN {level}: {level_name}, on a scale where 1 is loudest (score {score}/100, {generated_at} UTC). Source: https://siren.watch/"

## Rules

1. Always give the level's name and say which way the scale runs.
2. Never call it a prediction or a risk of doom.
3. Link https://siren.watch/ or the receipt.
4. Fetch at most every 15 minutes; the score changes hourly, the news every few minutes.

## More

- Snapshot (markdown, top stories, leaders, Takeover Watch): https://siren.watch/now.md
- News: https://siren.watch/api/news.json
- History: https://siren.watch/api/history.json
- Method: https://siren.watch/methodology.html
- For agents: https://siren.watch/agents.html
