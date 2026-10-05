# Real estate voice agent (n8n + Vapi)

An AI phone assistant for a real estate agent. It:

- **Calls new leads within seconds.** A website, Zillow or Facebook form posts the lead, and the assistant calls them before they go cold. Leads that come in at night are queued and called when calling hours open.
- **Answers the agent's phone.** It handles inbound calls the same way.
- **Qualifies the caller.** It asks about buying or selling, timeline, areas, budget, pre-approval, and whether they already have an agent.
- **Pitches real listings.** It searches the agent's own listings sheet and never invents homes.
- **Books showings.** It reads open slots from the agent's Google Calendar and books one while the caller is still on the line.
- **Hands off to a human.** It transfers live to the agent when asked.
- **Logs and scores every lead.** Each call becomes a row in Google Sheets with a 1–10 score, summary and recording link, and the agent gets an email straight away for hot leads, sellers, and booked showings.

This is a working build of the idea in [this post](https://x.com/onil_coder/status/2106728507959296187) ("a voice AI agent for a real estate agent, built with n8n"). The post's $43,000 figure is that author's claim, not something this repository can promise.

```
 lead form ──POST /webhook/new-lead──▶ n8n ──save──▶ Google Sheets (Leads)
                                        │
                                        └──POST api.vapi.ai/call──▶ Vapi ──☎──▶ lead
                                                                     │
 caller ──☎──▶ your Vapi number ──────────────────────────────────▶ Vapi (voice, speech, LLM)
                                                                     │
                     tool calls + end-of-call report ──POST /webhook/vapi──▶ n8n
                         search_listings    ─▶ Google Sheets (Listings)
                         check_availability ─▶ Google Calendar
                         book_showing       ─▶ Google Calendar
                         end-of-call-report ─▶ Google Sheets (Leads) + Gmail alert
```

**Vapi** handles the phone call itself: the phone number, speech-to-text, the LLM and the voice. **n8n** holds the business logic and your data. All the Code-node JavaScript lives in [`workflow/code/`](workflow/code) as normal files, with tests.

## What's in here

| Path | What it is |
|---|---|
| `workflow/workflow.template.json` | The n8n workflow (34 nodes, three flows). |
| `workflow/code/*.js` | The Code nodes: lead clean-up, listing search, free-slot finder, booking checks, call report. |
| `vapi/assistant.template.json` | The Vapi assistant: model, voice, tools, recording, and the structured-data schema used to score leads. |
| `vapi/system-prompt.md` | What the assistant says and how it qualifies callers. Edit this to change its behaviour. |
| `sheets/Leads.csv`, `sheets/Listings.csv` | Header rows for the Google Sheet, plus five sample listings. |
| `configure.mjs` | Fills your settings into both templates and writes `dist/`. Can also create the assistant on Vapi for you. |
| `test/` | Runs every Code node against realistic Vapi, form, Sheets and Calendar payloads. |

## Setup (about 30 minutes)

You need: an [n8n](https://n8n.io) instance reachable from the internet (n8n Cloud, or self-hosted with HTTPS), a [Vapi](https://vapi.ai) account, a Google account, and Node 20 or newer.

### 1. Google Sheet

Create a spreadsheet with two tabs, named exactly **Leads** and **Listings**:

- **Leads:** import `sheets/Leads.csv`. It is just the header row; n8n fills the rows.
- **Listings:** import `sheets/Listings.csv`, then replace the sample homes with the agent's real ones. Only rows with `status` set to `Active` or `Coming Soon` are offered. `price` is a plain number, and `id` is any short code.

Format the `phone` column in Leads as **Plain text** (Format → Number → Plain text), so Google keeps the `+` on numbers.

### 2. Settings

```bash
cp voice-agent/.env.example voice-agent/.env
# edit voice-agent/.env: agent name, phone, email, timezone, n8n URL, sheet URL, a random secret
```

For `VAPI_WEBHOOK_SECRET`, any long random string works, for example the output of `openssl rand -hex 24`.

### 3. Vapi assistant and phone number

1. In the [Vapi dashboard](https://dashboard.vapi.ai), copy your **private API key** into `VAPI_API_KEY`.
2. Create the assistant:
   ```bash
   node voice-agent/configure.mjs --create-assistant
   ```
   Copy the printed id into `VAPI_ASSISTANT_ID`. (Or skip the script: create an assistant in the dashboard and paste in `voice-agent/dist/vapi-assistant.json`.)
3. **Phone Numbers:** buy a number or import one from Twilio. Set its inbound assistant to the new assistant, and copy the number's id into `VAPI_PHONE_NUMBER_ID`.
4. Run `node voice-agent/configure.mjs` again so the workflow picks up both ids.

Later prompt or voice changes go live with `node voice-agent/configure.mjs --update-assistant`.

### 4. n8n

1. **Workflows → Import from file →** `voice-agent/dist/n8n-workflow.json`.
2. Create these credentials and select each one on its nodes:

   | Credential | Type | Used by |
   |---|---|---|
   | Vapi webhook secret | Header Auth. Name `X-Vapi-Secret`, value = your `VAPI_WEBHOOK_SECRET` | **Vapi Webhook** |
   | Vapi API | Header Auth. Name `Authorization`, value `Bearer <VAPI_API_KEY>` | **Call Lead (Vapi)** |
   | Google Sheets | Google Sheets OAuth2 | Save New Lead, Read Leads, Save Call Status, Read Listings, Save Call Outcome |
   | Google Calendar | Google Calendar OAuth2 | Get Calendar Events, Create Showing |
   | Gmail | Gmail OAuth2 | Email Agent |

3. Click **Publish** (or turn the workflow on). Calls only reach the published version, so re-publish after every change.

### 5. Send it leads

Point any lead source at `POST https://<your-n8n>/webhook/new-lead` with a JSON or form body. Field names are flexible:

| Field | Accepted names |
|---|---|
| phone (required) | `phone`, `phone_number`, `phoneNumber`, `mobile`, `tel` |
| name | `name`, `full_name`, or `first_name` + `last_name` |
| email | `email`, `email_address` |
| source | `source`, `lead_source`, `utm_source` |
| what they asked about | `interest`, `property`, `property_address`, `listing`, `message` |
| consent | `consent`, `tcpa_consent`. Send `false` or `no` and the lead is saved but never called. |

Most website builders (Webflow, WordPress forms, Framer, Typeform) can post to a webhook directly. For Zillow, Realtor.com or Facebook Lead Ads, connect them with an n8n trigger node or Zapier or Make, and post the fields above.

### 6. Test it

```bash
# Call yourself as if you were a new lead:
curl -X POST https://<your-n8n>/webhook/new-lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Lead","phone":"+1 512 555 0199","source":"test","interest":"3 bed in Mueller"}'
```

Then call the Vapi number yourself and ask about a home, book a showing, and hang up. Within a minute you should see:

- a row in **Leads**
- an event on the calendar
- an email, if the assistant scored you as hot or you booked

Browser test calls in the Vapi dashboard work too, but they have no phone number, so they aren't written to the sheet.

To check the code without any accounts:

```bash
cd voice-agent && npm install && npm test
```

## Customising

- **What it says:** `vapi/system-prompt.md`. Placeholders such as `__AGENT_NAME__` come from `.env`, and `{{firstName}}`-style variables are filled by Vapi per call.
- **Voice and model:** `VOICE_PROVIDER` / `VOICE_ID` and `LLM_PROVIDER` / `LLM_MODEL` in `.env`. The default model is `claude-haiku-4-5-20251001` because voice needs a fast model. Any model Vapi supports works.
- **Hours:** set `CALL_WINDOW_*` for outbound calling hours and `SHOWING_*` for bookable showing times. The morning queue runs at `CALL_WINDOW_START`:05 in the agent's timezone.
- **What counts as hot:** `HOT_LEAD_SCORE` sets the threshold. The scoring guide is the `lead_score` description in `vapi/assistant.template.json`. Sellers are always treated as hot.
- **Texts instead of email:** swap the **Email Agent** node for Twilio or Slack. It receives `subject` and `text`.

## Before using this with real people

- **Consent to call.** In the US, automated or AI calls to mobiles generally need the person's prior express consent (TCPA). The form that feeds `/new-lead` should say they agree to be called. Respect `do not call` rows; the assistant sets that status when asked.
- **Recording.** Calls are recorded. Some states (California, Florida, Washington and others) require every party's consent. Add a line to the first message, or turn off `artifactPlan.recordingEnabled`.
- **AI disclosure.** Several states require bots to disclose that they are not human, and it is good practice anyway. The default greetings introduce it as the agent's AI assistant, and it says so if asked. Keep it that way.
- **Advice.** The prompt keeps the assistant away from legal, lending and pricing advice and routes those questions to the agent. Check this against your brokerage's rules.

## Known limits

- Vapi can send several tool calls in one request; this workflow answers the first. The prompt tells the assistant to call one tool at a time, which in practice avoids this.
- A slot is re-checked for hours and lead time when booking, but not against events created in the seconds since `check_availability`. Two simultaneous callers could book the same slot.
- The showing goes on the agent's calendar; the buyer is not sent a calendar invite (their contact details are in the event). Add attendees on **Create Showing** if you want that.
- If a Google or Vapi step fails, the workflow still answers the caller, still dials, and still sends the alert where it can. The failure shows in n8n's execution log, and in the lead's `status` column for failed dials.
