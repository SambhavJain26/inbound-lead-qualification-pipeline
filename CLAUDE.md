# Repository Guidelines (Claude Code)

This file is the Claude Code counterpart of `AGENTS.md`. Both files carry the same guidance; `AGENTS.md` is the Codex-facing copy. Keep them in sync — any rule added to one must be added to the other.

This repository is the planning and implementation workspace for a local-first n8n **leasing / tenant-screening coordination demo**. Treat it as an automation project, not a SaaS app or compiled software product. Core behavior lives in n8n workflow exports, a Postgres state store, synthetic fixtures, prompts/schemas, and helper scripts.

This is a **portfolio demo built to prove capability**, not a client deployment. It runs on synthetic data, on localhost, with the operator in the loop at every decision point. It is also the fifth build in a series — `my_builds/` holds the finished write-ups for builds 01–04 and sets the documentation bar this one must meet.

> **Scope status:** locked at Stage 0 on 2026-09-11 — both modules, front of funnel and screening engine. See `progress-notes.md` for the decision and the real-vs-mock boundary. Do not change scope, the tool surface, or the mock boundary without recording a plan revision there first.

## Read Order And Authority

Before making changes, read in this order (create each file at the stage that produces it; skip what does not exist yet):

1. `progress-notes.md` — current status, locked decisions, deviations, open items. **Newest entry wins.**
2. `build-plan.md` — staged implementation plan and verification gates.
3. `<project>-demo-build-plan.md` — detailed demo/workflow spec.
4. `05-<slug>.md` and `foundation-5-<slug>.md` — problem statement and domain background.
5. `what-we-are-building.md` — plain-language overview of the whole project. Good starting point.
6. `the-full-flow.md` — the end-to-end journey as a narrative, non-technical. What to hand a prospect.
7. `my_builds/0*/build-technical-notes.md` — how prior builds were actually assembled; reuse those patterns before inventing new ones.

If documents conflict, prefer the newest decision in `progress-notes.md`, then update the stale doc rather than guessing.

## Project Structure

Current contents are `my_builds/` reference docs only. When implementation begins, use:

- `n8n-workflows/` — importable workflow JSON exports, committed with **placeholder ids only**.
- `scripts/` — builder, import, setup, seed, reset, and verification helpers.
- `scripts/*-lib.js` — shared logic inlined into Code nodes by the `build-wf*.js` scripts. Never duplicate logic between a lib and a workflow JSON by hand.
- `fixtures/` — synthetic applicants, documents, replies, expected outcomes.
- `prompts/` — extraction/classification prompts and JSON schemas if kept outside workflow JSON.
- `db/` — Postgres schema SQL. Postgres is the system of record; Airtable is a display mirror only.
- `docs/` — runbooks, demo notes, production caveats, content-strategy drafts.
- `my_builds/` — finished public write-ups for builds 01–04. Read-only reference for tone, depth, and structure.
- `tmp/` and `data/` — generated local artifacts only; gitignored.

Use lowercase hyphenated filenames. Use `snake_case` for table columns and JSON fields unless an external API requires otherwise.

This directory is **not a git repository yet**. Run `git init` and add `.gitignore` before the first commit; do not commit anything until `.gitignore` exists.

## Local Services And Commands

Expected local service: n8n at `http://localhost:5678`, run via Docker Compose. Use a temporary cloudflared HTTPS tunnel only when a callback or inbound webhook needs it. No VPS, Caddy, domains, or production DNS/email authentication during the local build.

Useful commands:

- `rg --files` — list files quickly.
- `rg "term" .` — search docs and source.
- `Get-Content -Raw <file>` — read docs without truncation in PowerShell.
- `git status --short` / `git log --oneline -5` — check state before and after work.
- `docker compose config` — validate Compose configuration.
- `docker compose ps` / `docker compose logs n8n` — inspect services and failures.
- `docker compose up -d --force-recreate n8n` — recreate n8n after env, webhook, or tunnel URL changes.
- `docker compose exec -T n8n n8n import:workflow --input=/tmp/<name>.json` — CLI import.
- `docker compose exec -T n8n n8n update:workflow --id=<id> --active=<true|false>` — CLI activation.
- `docker compose exec -T n8n n8n export:workflow --all --output=/tmp/all.json` — bulk export for backup/diffing.
- `node scripts/build-wf<n>-*.js` — regenerate a workflow export after changing a shared library.
- `node scripts/import-workflows.js [name ...]` — substitute local ids, then import/activate.
- `node scripts/seed-demo.js` — reset the state store to the clean demo state.
- `node scripts/build-listing-site.js` — regenerate the listing site from the `units` rows.
- `node scripts/serve-listing-site.js [--detach|--stop]` — serve it on `localhost:8080`.
- `node scripts/simulate-prospect-message.js conversation R-xxxx` — drive the renter side of the Telegram conversation headlessly.
- `node scripts/start-tunnel.js` — re-establish the tunnel, repoint n8n, recreate the container.
- `.\scripts\verify-stage-1.ps1` — verify Docker, Compose config, and local n8n reachability.

Do not assume package managers, Docker images, API keys, Gmail OAuth credentials, Telegram bots, OpenAI credentials, tunnels, or n8n credentials already exist. Verify, then ask.

## Architecture Rules

- n8n orchestrates. **Postgres** (local Docker) is the system of record for everything. **Telegram** is the manager's action surface.
- The **listing site** is the front door: static HTML generated from the `units` rows by `scripts/build-listing-site.js`, served by a zero-dependency Node server on `:8080`. The listing a prospect reads and the facts the assistant may quote come from one record and cannot drift apart. It is not tunnelled — the quick tunnel maps one origin and that origin must stay n8n.
- **Telegram is both surfaces, on two bots.** The prospect conversation (WF1) runs on the prospect bot; the manager's decisions (WF3) on the manager bot. See the Telegram gotchas below before touching either.
- **Airtable is a display mirror, never the state store.** Lead-pipeline rows are mirrored out to Airtable so the demo has a visible board; Postgres stays the truth. Airtable Free caps API calls at 1,000/month per workspace, so the pipeline must keep running unaffected if the mirror fails or is capped: never read state back from Airtable, and never block a workflow on an Airtable write (fire-and-forget, errors logged not thrown).
- Mirror writes happen at **phase boundaries only** — lead created, pre-qualified, tour booked, applied, decided. Roughly five calls per lead lifecycle. Do not mirror on every field change, and skip mirroring during development iterations.
- `scripts/sync-airtable.js` rebuilds the Airtable board from Postgres in one command, so a stale or capped board is recoverable before a take.
- Application-level detail (extracted values, the three income numbers, criteria evidence) is surfaced on the **Telegram card**, not in Airtable.
- Approved tool surface, all free or test-mode except OpenAI: **n8n** (self-hosted, incl. Form Trigger and Chat Trigger), **Gmail**, **Telegram**, **Postgres**, **Airtable** (display mirror only), **Plaid Sandbox**, **Cal.com**, **DocuSign developer sandbox**, **OpenAI**. Do not introduce Google Sheets, Supabase, SMS/Twilio, real screening-bureau or PMS APIs, or community nodes unless `progress-notes.md` records a plan revision.
- **OpenAI is the only paid dependency.** If a design needs a paid API for anything else, stop and propose an alternative rather than spending.
- Plaid runs in **Sandbox only** (`sandbox.plaid.com`), which is free and unlimited. Use it for income verification only — Sandbox performs no OCR, so its identity-document product returns canned results and is not a meaningful demo.
- Cal.com cloud webhooks require HTTPS and reject private IPs, so the cloudflared tunnel is required for tour booking as well as for the Telegram Trigger and DocuSign Connect.
- Use the built-in OpenAI / OpenAI Chat Model nodes with **JSON Schema structured output**. Do not use HTTP Request for normal OpenAI calls unless a required feature is missing or you are debugging raw errors.
- Test `gpt-5.6-luna` first; fall back to `gpt-5.4-nano`, then `gpt-5.4-mini` if quality requires it.
- Email goes over **SMTP out / IMAP in**, not the Gmail API. A Gmail App Password (2FA required) is used, which means the credential is scriptable and no Google Cloud project, OAuth consent screen, or redirect URI is involved. One personal Gmail account is fine for local testing.
- The IMAP trigger polls rather than pushing, so inbound mail has a short delay. Match replies on the `[R-xxxx]` reference token in the subject and dedupe on message id; do not rely on unread state alone. Outbound mail lands in `[Gmail]/Sent` rather than `INBOX` **provided the recipient is a different account**, which is why the demo uses a separate prospect address.
- Telegram is the manager action surface: approvals, edits, and resolutions happen through inline buttons or a slash command. Send-message alerts need no tunnel; Telegram Trigger does.
- DocuSign runs in **sandbox only**, is webhook-driven, and must respond to the callback immediately — a human wait must never hold the HTTP response open. Iterate against fixtures, not live envelopes.
- Configure Connect **per envelope** via `eventNotification` in the create-envelope body, so nothing has to be set up in the DocuSign admin UI. The `events` array requires **`deliveryMode: "SIM"` and `eventData: { version: "restv2.1" }` together** — omit either and DocuSign rejects the entire envelope with `INVALID_REQUEST_PARAMETER`.
- Send the lease as `fileExtension: "html"` and let DocuSign convert it to PDF; generating a PDF inside a Code node is unnecessary work. Place tabs with `anchorString` markers in the HTML.
- The **Telegram Trigger validates a secret header**. n8n derives it as `${workflowId}_${nodeId}` with anything outside `[A-Za-z0-9_-]` stripped, and sends it as `X-Telegram-Bot-Api-Secret-Token`. Without it a posted update is rejected with 403, which matters when driving the router from a script rather than a phone.
- Activating a Telegram Trigger **registers a webhook on the bot**, which disables `getUpdates`. `scripts/get-telegram-chat-id.js` will stop working until that workflow is deactivated.
- The model never decides identity. Match applicants, replies, and documents **deterministically** by reference token first, then sender email. Never let the model emit or choose a record id.

## Domain Rules (Leasing And Tenant Screening)

Tenant screening is legally loaded — FCRA, the Fair Housing Act, HUD's AI guidance, and state/local source-of-income rules all bite here. A demo that looks like an AI deciding who gets an apartment is a liability story, not a sales story. These rules are non-negotiable and belong in the demo narrative, not just the code.

**The division of labour**

- **AI never decides.** The model's jobs are bounded to four: answer questions from a grounded property knowledge base, extract fields from documents with a citation for every value, classify intent, and draft messages for human approval. It must never output a decision, score, rank, risk label, or recommendation, and no output schema may contain a field that could carry one.
- **The gate drives the conversation, not the model.** In the Telegram conversation the model answers what was asked and extracts what was stated; `prequalGate()` decides the outcome and a fixed `COLLECT_ORDER` decides what is still outstanding. The next question is a **fixed string** from `QUESTION_PROMPTS`, and the prompt tells the model explicitly not to ask it. Identity is resolved in SQL from the `/start R-xxxx` deep-link payload, then by `chat_id` — never by the model.
- **The criteria engine is deterministic.** Pass/conditional/fail logic is plain JavaScript reading manager-configured thresholds from a config table. It never calls a model. It emits `meets_criteria`, `conditional`, or `does_not_meet` plus a per-criterion evidence trail naming the document, field, and value behind each result. Consistent published criteria applied identically to every applicant is the *compliant* pattern — the AI black box is the dangerous one.
- **A human makes every rental decision.** The engine classifies; the manager decides and the record shows who decided what, when.

**Hard stops**

- **No adverse action, ever.** Never generate, draft, or send a denial, pre-adverse-action, or adverse-action letter. Real adverse action is a formal two-step process (pre-adverse notice + copy of the report + FCRA Summary of Rights, a waiting period, then the final notice). `does_not_meet` stops the workflow and hands off to a human with a note listing what a real process requires. The stop is a feature; demo it as one.
- **Pre-qualification is not a decision.** Module 1 pre-qual uses self-reported, unverified answers and exists only to triage tour scheduling. A prospect who does not clear pre-qual is never told they are denied — they are offered alternatives and optionally routed to a human.
- **No protected-class inference.** Never infer, record, or use race, color, national origin, religion, sex, familial status, disability, age, marital status, or source of income. Prompts forbid it explicitly. The FAQ bot must refuse questions that would elicit it (e.g. "is this a good area for families?") and answer with property facts only.
- **No real consumer report data and no real PII.** No credit, criminal, or eviction data from any bureau — that requires FCRA permissible-purpose credentialing this project does not have. Fixtures use fabricated names, employers, and documents. Never place a real or realistic SSN, DOB, government ID, or bank account number anywhere in this repo, fixtures included. An SSN captured by the demo application form is masked to last-4 on arrival and the raw value is never stored.
- **Never generate legal notices, lease clauses, rent figures, or fair-housing language.** The lease is a fixed template with variable slots; the model never writes a clause.

**Messaging tiers**

Module 1's value is an instant reply, so a blanket "nothing sends automatically" rule is wrong here. Two tiers instead:

- **Tier A — auto-send allowed:** factual answers grounded in the property knowledge base, tour confirmations and reminders, application links, and status updates. Every Tier A message passes a guardrail check before it leaves (no rent negotiation, no availability commitment, no legal statement, no protected-class content, no invented fact) and is logged.
- **Tier B — human approval required:** anything touching an application outcome, conditional terms, a request for further documents, or any applicant-facing message once screening has begun. A manager approves each one individually.
- Guardrails run **again at send time** against whatever the state store currently holds, because a manager may have edited the wording after it was drafted.

**Mocks are labelled, never disguised**

Credit/eviction, identity document checks, smart-lock PINs, and listing-site feeds are synthetic in this build. Every mock carries `(MOCK)` in its n8n node name, writes `source: "mock"` on the record it produces, and is drawn as a swappable box in the architecture diagram. Never present mock output as real data, in the product or in the demo narration.

Every state change is logged with a timestamp and an actor.

## n8n Workflow Rules And Gotchas

Prefer editable workflow JSON exports over undocumented manual UI-only changes. Name every node descriptively (`Gate: Application Complete`, `Extract Paystub Fields`), never `Code`, `If`, or `OpenAI`.

Reference credentials **by name only**. Never hardcode OpenAI keys, Gmail tokens, Telegram bot tokens, DocuSign secrets, tunnel URLs, base ids, or real emails in workflow JSON. Committed JSON carries placeholders (`__AIRTABLE_BASE_ID__`, `__OPENAI_CREDENTIAL_ID__`, …); the import script resolves them from `.env` and the running n8n instance into an ignored `tmp/` copy. Nothing resolved is ever written back to a committed file.

Known gotchas, carried forward from builds 01–04:

**Telegram**
- The Telegram node takes `replyMarkup` as a top-level enum and reads buttons from a fixed collection. A JSON string in `additionalFields.reply_markup` is ignored and the card posts with no buttons. Keep one Telegram node per card layout and drive `callback_data` with an expression.
- **One webhook per bot.** This build runs **two bots** — a manager bot (WF3 router, every manager alert) and a prospect bot (WF1's leasing assistant). They must be different `@BotFather` bots: two Telegram Triggers on one token means the second registration silently evicts the first, and every approval button stops working with no error anywhere. `verify-credentials.js` calls `getMe` on both and fails if the ids match.
- **Two Telegram credentials share the type `telegramApi`, so `import-workflows.js` resolves them by NAME, not type.** The names live in `scripts/lib/credential-names.js` and are load-bearing across `setup-credentials.js`, `wf-common.js` and `import-workflows.js`. A type lookup is last-wins and points both placeholders at one bot — the failure above. There is deliberately no fallback to the type map.
- Telegram messages cap at **4096 characters**. Composed text (model output + appended fixed wording + a URL) must be truncated before sending.
- **The Telegram node always sends a `parse_mode`, so every message is parsed for entities whether you asked for it or not.** Left at the legacy Markdown default, a single underscore opens an italic run that never closes - the `_` in an application link's `?ref_token=` is enough - and Telegram rejects the whole message. The node surfaces this only as `Bad request - please check your parameters`; the real text (`can't parse entities ... at byte offset N`) is buried in the execution record. Pin `additionalFields.parse_mode` to `HTML` and escape `& < >` with `escapeTelegramHtml()` wherever the text is built. Compose message text in a **Code node**, not in the node's own parameter, so it can be escaped.
- **Read the real error out of n8n's own database** when a node reports something generic: `node -e` with `node:sqlite` against `/home/node/.n8n/database.sqlite`, `execution_entity` for the id and `execution_data` for the payload. Far faster than guessing from the workflow JSON.
- **The Airtable mirror must upsert, not POST.** A plain POST creates a row every time, so a lead mirrored at more than one phase boundary appears several times on the board. Use `PATCH` with `performUpsert.fieldsToMergeOn`, which needs no read-back, and gate the write on an actual phase change - a chat has many turns and Airtable Free allows 1000 calls a month.
- **A guardrail block must never mean silence for the prospect.** Every failure path in a conversation - a blocked message, a malformed model payload, an unsupported message type - has to send something. A renter mid-conversation whose assistant simply stops is the worst outcome a chat product has. Use a fixed fallback ("a colleague will pick this up"), which carries no figure, no commitment and no protected-class content and so is safe by construction.
- **A fair-housing refusal trips the fair-housing guardrail** if the model repeats the word it is refusing. "I can't say whether it's a good area for families" contains `families` and is blocked. Instruct the model to refuse *without naming the subject of the question* and to offer property facts instead.
- **Handle non-text Telegram messages deterministically.** Stickers, photos, voice notes and locations arrive with no `text`, and an empty message either produces a nonsense reply or an empty one. Detect the type in the first Code node and answer without a model call.
- **Every `$('Node Name')` reference is validated at build time** by `validateNodeReferences()` in `wf-common.js`. Renaming a node and missing one reference is invisible until that branch runs, and then it fails with "Node 'X' hasn't been executed", which reads like a wiring problem rather than a typo. Worse, a stale reference can point at a REAL node on another branch and only fail on runs where that branch did not execute - which is exactly how the email pre-qual path broke unnoticed while every Telegram run passed.
- **After an HTTP node, `$json` is that node's API response, not your data.** WF3's `Acknowledge Tap` answers Telegram, so every parsed field is gone by the next node: a condition reading `$json.is_tour_decision` silently sees `undefined` and takes the wrong branch with no error. Reference the producing node by name (`$('Parse Manager Action').first().json.x`) after any node that replaces the item.
- **A naive datetime from the model means PROPERTY-local time.** "Tuesday at 2pm" comes back as `2026-09-15T14:00`; `new Date()` reads a zone-less string in the runtime's zone, which is UTC in a container, so a 2pm request booked 9:30am. Nothing errors - you only notice by reading the booked time. Convert with `naiveLocalToUtcIso(value, tz)` before comparing against anything real.
- **Cal.com: the BOOKING_CREATED webhook does NOT carry metadata set via the API.** A booking created through `POST /v2/bookings` stores `metadata.ref_token` (the API response shows it) but the webhook payload omits it, so the lead cannot be identified from the webhook. A workflow that creates a booking must record and confirm it itself. The webhook stays useful only for bookings made on the public page, where the token travels in the URL.
- **Cal.com validates the attendee's email domain.** `example.com` is rejected outright with `email_domain_cannot_receive_mail`, so a fixture address cannot be used - override it to a deliverable one the way the DocuSign signer already is.
- **Cal.com API versions differ per endpoint**: slots need `cal-api-version: 2024-09-04`, bookings need `2024-08-13`. Mixing them 404s.
- **OpenAI strict mode requires EVERY key in `properties` to appear in `required`.** Adding a property without adding it there rejects the call with "Invalid schema for response_format" and breaks every turn.
- **`onError: "continueErrorOutput"`** gives a Code node a second output carrying the failure, so a throw can stay visible (manager alerted, execution marked failed) without also meaning the prospect hears nothing.
- **The Tier A guardrail's figure allowlist must include what the PROSPECT stated**, not just unit facts. In a chat, confirming a number someone just gave you ("$5,000 a month, got it") is the natural reply, and with only unit facts in the allowlist every such message is blocked and the conversation stalls in silence. `buildConversationKnowledge(unit, answers)` adds the recorded slot values and nothing else, so an invented rent is still caught.
- A message to the **prospect** must fail visibly, not swallow errors: the node after it writes a `message_log` row saying the message went out. `wf-common.js:telegramNode` takes `failOnError` for this; manager alerts keep `continueRegularOutput`.
- `callback_data` is capped at 64 bytes. A short action prefix plus a record id stays around 22 bytes.
- The keyboard is baked into the message at send time. Redeploying never updates an old card; re-trigger to get fresh buttons.

**n8n CLI and activation**
- `n8n publish:workflow` re-activates a workflow, undoing `update:workflow --active=false`. Skip publish for anything meant to stay inactive.
- CLI activation changes need an n8n restart to take effect.
- After a restart, active webhook registration can lag. Verify with a real HTTP probe or an execution record, not by assumption.
- Active webhooks may use the active workflow snapshot, not the editor draft.
- Running `n8n execute` inside the already-running container can fail because the task broker port is in use. Stop the service container, run `docker compose run --rm --no-deps n8n execute --id=<id> --rawOutput`, then start n8n again.
- Exported workflow JSON never contains credential secrets, but it does contain credential **names and ids** — strip or placeholder them before sharing an export.

**Postgres**
- Use the built-in Postgres node with a named credential. The container is reachable from n8n at host `postgres`, not `localhost`.
- Pass query parameters as an **array expression** (`={{ [a, b, c] }}`), never a comma-separated string: addresses contain commas and would split into extra parameters.
- The node **drops `undefined` entries** when flattening that array (`if (item === undefined) continue`), silently shortening the list. Postgres then reports `there is no parameter $N`. Coerce every nullable value with `?? ''` and unwrap it in SQL.
- Unwrap with **`NULLIF($n::text,'')`**, not `NULLIF($n,'')`. Postgres infers an untyped parameter's type from its surrounding context, so inside `COALESCE(NULLIF($n,'')::int, <int column>)` the empty string is parsed as an integer and fails with `invalid input syntax for type integer: ""` before `NULLIF` ever runs. The explicit `::text` pins the parameter first.
- Keep schema changes in versioned files under `db/`; never mutate the schema by hand in a running container.
- Airtable is a **display mirror only**, never the system of record: its free tier enforces 1,000 API calls per month per workspace. Mirror at phase boundaries, fire-and-forget, and rebuild the board from Postgres with `scripts/sync-airtable.js`.

**HTTP Request**
- Set `contentType: "json"` alongside `sendBody` and `specifyBody: "json"`. Without it the body is form-encoded and a JSON API answers 400 with nothing useful in the message.
- **`httpCustomAuth` is a GENERIC credential type**: `authentication: "genericCredentialType"` plus `genericAuthType: "httpCustomAuth"`. Declaring it as `predefinedCredentialType` applies no auth at all, and the API reports the credentials as missing as though they were never configured.
- Credential types like `airtableTokenApi` *are* predefined and use `authentication: "predefinedCredentialType"` with `nodeCredentialType`.
- **Credential field names differ per type — check the credential definition, never assume `apiKey`.** `airtableTokenApi` stores the token under `accessToken`; putting it in `apiKey` leaves the token empty and every request fails with "Authorization failed - please check your credentials", which reads like a bad token rather than a missing one.
- A mirror node with `onError: continueRegularOutput` will fail on every single run without ever showing up in a gate. Verify it writes at least once, explicitly.

**Code nodes and data shape**
- When generating Code nodes from a builder script, avoid backticks and escape sequences inside template literals; they are consumed before reaching the node. Parse every generated Code node before importing.
- Code nodes may not have reliable `$env` / `process.env`. Prefer config-table values or import-time substitution.
- Strict IF nodes require booleans. Normalize truthy strings in a Code node before routing.
- AI structured output may arrive wrapped. Downstream code should handle both wrapped and direct JSON shapes; `unwrapAiPayload(data, anchorKey)` in `scripts/lib/leasing-lib.js` probes for a known key rather than assuming a shape, and both AI-consuming Code nodes share it.
- **OpenAI node: `options.textFormat.textOptions` must be an OBJECT, not an array.** The field's own default shows an array, but the node reads `textFormat.textOptions.type` directly. Pass an array and the format is never sent - the model returns prose instead of JSON, with no error anywhere.
- The Responses payload nests as `output[0].content[0].text`. Always use the shared `unwrapAiPayload`; a trimmed local copy that forgets one hop reports "unexpected shape" on a payload that is perfectly correct, which is a genuinely confusing way to lose an hour.
- An empty or unexpected model payload must **throw**, not flow onward. A guardrail that finds no problems in an empty string will happily send a blank email.

**Webhooks, forms, tunnels**
- Imported Webhook/Form Trigger nodes may register under generated paths. Verify actual URLs after import.
- Form Trigger submissions can produce generic keys like `field-0`. Normalize before writing to the state store or an AI step.
- Scripted form submissions must use `multipart/form-data`.
- **A Form Trigger submits fields as `field-0`, `field-1`, ... in declaration order**, then maps them back to labels on arrival. Posting the labels themselves is accepted and every value arrives `null` - the submission looks successful and the workflow runs on empty data. Read the field order from the built workflow JSON rather than hardcoding indices.
- **An uploaded file is keyed after the submitted field name (`field-N`), not the field label.** Re-key it to a stable name in the first Code node; a downstream Extract From File node cannot rely on the label.
- **Postgres nodes drop binary data.** Anything that needs an uploaded file must reach the extract node before any database node runs.
- Respond-to-Webhook status-code expressions are unreliable. Use separate literal-status Respond nodes when status matters.
- **Returning HTML:** use `respondWith: "text"` plus an explicit `Content-Type: text/html; charset=utf-8` header. `respondWith: "json"` makes the browser download the page instead of rendering it, and `text` alone defaults to `text/plain`. Build the HTML in a Code node and point `responseBody` at a single variable, so quoting and newlines never reach the expression parser.
- `webhookNode` must only emit `responseData` in `lastNode` mode. A leftover response parameter in `responseNode` mode is the same failure class as the Form Trigger note above.
- **The listing site's contact form must be a native `<form method="post">`, never `fetch()`.** A native post is a top-level navigation: no CORS preflight, and the browser renders the HTML that comes back, which is the entire point of the handoff page. It also posts to `http://localhost:5678`, not the tunnel — which is why the site does not need rebuilding when the tunnel hostname changes.
- cloudflared quick tunnels get a new hostname every run, and n8n reads `WEBHOOK_URL` only at container start. Re-run the tunnel script after any tunnel or Docker restart, then re-import the trigger workflow.
- Docker Compose `restart` may not apply changed environment variables. Recreate the container when changing webhook/tunnel settings.

**Email (SMTP/IMAP)**
- The `emailSend` node appends an n8n attribution footer unless `options.appendAttribution` is false. Acceptable on internal alerts, wrong on prospect-facing mail.
- Gmail App Passwords require 2-Step Verification on the account. Plain account passwords have not worked for IMAP/SMTP since May 2022.
- Match replies on a `Re:` subject carrying the reference token and skip message ids already logged. Unread state alone is not a reliable signal.
- **The system mailbox and the demo prospect address must be different accounts.** Gmail delivers self-addressed mail to `INBOX` as well as `[Gmail]/Sent`, so if they are the same the IMAP trigger sees our own outbound mail and can re-process it as inbound — a send loop. With two addresses, outbound never reaches `INBOX` and no guard is needed. The prospect account has its own app password so `scripts/send-as-prospect.js` can send the fixture lead email and prospect replies, making a demo run one command. n8n never uses that credential - only the system mailbox is wired into n8n.
- The n8n IMAP trigger has had reported reliability issues across versions. If it misses mail, fall back to a Schedule Trigger polling an IMAP node, or to Gmail OAuth2 as a last resort.

**PowerShell**
- Piping JSON into native commands can introduce a UTF-8 BOM. If a workflow import fails at the first character, check encoding.
- Piping a raw string into `ConvertTo-Json` wraps it as `{ "value": "..." }`. Read file text explicitly and call `ConvertTo-Json -InputObject $text`.
- `ConvertFrom-Json` array results can cross function boundaries as one nested `Object[]`. Flatten explicitly before counting rows.

## Testing And Verification

Each stage in `build-plan.md` has required verification checks. Do not mark a stage complete in `progress-notes.md` until those pass. Prove behavior with an execution record, a stored row, or a received message — never by reasoning about the JSON.

Core invariants to design and test against:

- Re-ingesting an application must not reset workflow-owned fields (`status`, `sent_at`, `ref_token`, decision history).
- Messy or incomplete rows are flagged for a human, never silently dropped.
- Double-clicking an approve/send button must never produce a second email or a second envelope.
- A duplicate inbound webhook payload must not double-process.
- The model must never produce a decision, score, or protected-class field; a schema violation fails the run visibly.
- Edited wording passes the same guardrails as generated wording.
- OpenAI failure fails visible, not quiet.
- No path can send applicant-facing mail without a recorded human approval.

Record checks, failures, token/cost notes, and deviations in `progress-notes.md`.

## Security And Configuration

Never commit `.env`, credentials, tunnel URLs, Telegram tokens, Gmail tokens, DocuSign secrets, OpenAI keys, n8n credential exports, or any real applicant, tenant, or client data. Use placeholders in examples.

Reset and seed scripts must touch fixture/demo data only. Never run reset or delete logic against client infrastructure, production workflows, or real data.

## Completion Guidelines

Before finishing implementation work, decide whether the task exposed a durable command, workaround, gotcha, or rule. If yes, update `CLAUDE.md` and `AGENTS.md` (identical in substance) and `progress-notes.md`.

After every completed task, commit and push to `main` unless told otherwise. Use short imperative or conventional commit messages, e.g. `docs: lock stage 0 scope` or `feat: add wf1 application intake export`. If push fails because no remote or authentication is configured, say so clearly and include the local commit hash.

## Carousel Production

Use `carousel-kit/design-system.md` and the shared stylesheet for LinkedIn decks.
Render a named deck with `node carousel-kit/render-carousel.cjs <deck-name>`;
verify the final PDF with the bundled Python and `carousel-kit/verify-carousel.py`.
Inspect the PDF-derived contact sheet and full-size pages before delivery.
Request Switzer and Zodiak through separate Fontshare stylesheet links and check
the loaded faces; a successful fetch of one family does not prove both loaded.
Keep approved slide wording unchanged and never batch the remaining carousels
when the user has asked for one design proof before approval.

## Carousel Review And Revisions

User-authorized copy revisions update canonical scripts and HTML together; the
exact-copy checks then validate the revised wording. Keep internal build numbers
off public pages. Favor short claims and varied existing layouts, not a paragraph
on every slide. Compare rendered vendor COI references, the previous proof and
the revision; record weaknesses and trade-offs in the content-strategy assessment.
Use `node carousel-kit/assess-carousel.cjs --current` for repeatable comparison.
Count visible `innerText`, not `textContent`, which can merge words across breaks.
Content-band span measures block height including gaps, not actual ink coverage
or whitespace percentage. Technical fit does not establish design acceptance.

## Carousel Reference-Document Rules

The latest user direction is practical reader value, balanced explanatory copy
and 7–11 pages based on distinct content. Carousels must deliver a usable method,
checklist, worked example or worksheet, not only short opinions. Keep briefs,
scripts and current slide totals aligned; use the existing positioning and proof
boundaries, and preserve unrelated text/video scripts during carousel-only edits.
Mix blue boxes, pen marks and gold highlights across a deck, not on every page.
Quiet pages are valid; no mandatory device quota. Selected interior boxes are
allowed, overriding the old cover-only reference rule. Follow the current design
blueprint for teaching-page hierarchy and run check-carousel-copy.cjs for writing
checks. Mark superseded assets explicitly; do not claim new visual QA before a
matching source is rendered and inspected. One proof still precedes batch export.

## Teaching Carousel Export Checks

Shared teaching layouts live in carousel-template.css, including inverted colors;
never add per-page font sizes or automatic shrink-to-fit. Keep list-row spacing
separate from paragraph sibling margins. PDF text validation must check semantic
blocks in reading order, especially multi-column fields and wrapped scope footers,
because whole-page x/y sorting can interleave labels or page numbers. Managed
slide-N.png previews must be regenerated without stale names when page counts
change: Poppler pads after nine pages. Preserve historical proofs before replacing
them and inspect full-size final-PDF pages plus representative mobile previews.

## Written-Question Carousel Layout

Use the shared lesson-fields--questions modifier for complete two-column review
questions at the existing body scale. Measure selection padding plus punctuation;
keep a selected question's question mark inside its span. Use nb for short compound
words or closing phrases to avoid split hyphens and one-word orphans without
changing copy. Inspect circle curves against glyphs, not only their outer bounds.

## Content Campaign Reductions

Keep retained post IDs stable when retiring posts; publishing slots can be
contiguous without renaming scripts or exported assets. Update active briefs,
scripts, foundation handoffs, design maps and editorial checks together. Retired
drafts remain recoverable in Git; dated historical counts are not current totals.
