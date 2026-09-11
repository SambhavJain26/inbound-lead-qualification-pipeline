# Repository Guidelines (Codex)

This file is the Codex counterpart of `CLAUDE.md`. Both files carry the same guidance; `CLAUDE.md` is the Claude Code-facing copy. Keep them in sync — any rule added to one must be added to the other.

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
6. `my_builds/0*/build-technical-notes.md` — how prior builds were actually assembled; reuse those patterns before inventing new ones.

If documents conflict, prefer the newest decision in `progress-notes.md`, then update the stale doc rather than guessing.

## Project Structure

Current contents are `my_builds/` reference docs only. When implementation begins, use:

- `n8n-workflows/` — importable workflow JSON exports, committed with **placeholder ids only**.
- `scripts/` — builder, import, setup, seed, reset, and verification helpers.
- `scripts/*-lib.js` — shared logic inlined into Code nodes by the `build-wf*.js` scripts. Never duplicate logic between a lib and a workflow JSON by hand.
- `fixtures/` — synthetic applicants, documents, replies, expected outcomes.
- `prompts/` — extraction/classification prompts and JSON schemas if kept outside workflow JSON.
- `db/` — Postgres schema SQL. Postgres is the system of record (Airtable Free's 1,000 API calls/month cap rules it out).
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
- `node scripts/start-tunnel.js` — re-establish the tunnel, repoint n8n, recreate the container.
- `.\scripts\verify-stage-1.ps1` — verify Docker, Compose config, and local n8n reachability.

Do not assume package managers, Docker images, API keys, Gmail OAuth credentials, Telegram bots, OpenAI credentials, tunnels, or n8n credentials already exist. Verify, then ask.

## Architecture Rules

- n8n orchestrates. **Postgres** (local Docker) is the system of record; **Telegram** is the manager's visible surface. Airtable is NOT the state store — its free tier caps API calls at 1,000/month.
- Approved tool surface, all free or test-mode except OpenAI: **n8n** (self-hosted, incl. Form Trigger and Chat Trigger), **Gmail**, **Telegram**, **Postgres**, **Plaid Sandbox**, **Cal.com**, **DocuSign developer sandbox**, **OpenAI**. Do not introduce Google Sheets, Supabase, SMS/Twilio, real screening-bureau or PMS APIs, or community nodes unless `progress-notes.md` records a plan revision.
- **OpenAI is the only paid dependency.** If a design needs a paid API for anything else, stop and propose an alternative rather than spending.
- Plaid runs in **Sandbox only** (`sandbox.plaid.com`), which is free and unlimited. Use it for income verification only — Sandbox performs no OCR, so its identity-document product returns canned results and is not a meaningful demo.
- Cal.com cloud webhooks require HTTPS and reject private IPs, so the cloudflared tunnel is required for tour booking as well as for the Telegram Trigger and DocuSign Connect.
- Use the built-in OpenAI / OpenAI Chat Model nodes with **JSON Schema structured output**. Do not use HTTP Request for normal OpenAI calls unless a required feature is missing or you are debugging raw errors.
- Test `gpt-5.6-luna` first; fall back to `gpt-5.4-nano`, then `gpt-5.4-mini` if quality requires it.
- Gmail OAuth2 is the email path. One non-professional Gmail account is acceptable for local testing.
- Telegram is the manager action surface: approvals, edits, and resolutions happen through inline buttons or a slash command. Send-message alerts need no tunnel; Telegram Trigger does.
- DocuSign runs in **sandbox only**, is webhook-driven, and must respond to the callback immediately — a human wait must never hold the HTTP response open. Iterate against fixtures, not live envelopes.
- The model never decides identity. Match applicants, replies, and documents **deterministically** by reference token first, then sender email. Never let the model emit or choose a record id.

## Domain Rules (Leasing And Tenant Screening)

Tenant screening is legally loaded — FCRA, the Fair Housing Act, HUD's AI guidance, and state/local source-of-income rules all bite here. A demo that looks like an AI deciding who gets an apartment is a liability story, not a sales story. These rules are non-negotiable and belong in the demo narrative, not just the code.

**The division of labour**

- **AI never decides.** The model's jobs are bounded to four: answer questions from a grounded property knowledge base, extract fields from documents with a citation for every value, classify intent, and draft messages for human approval. It must never output a decision, score, rank, risk label, or recommendation, and no output schema may contain a field that could carry one.
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
- One webhook per bot, so only one Telegram Trigger may be active. Every button and command enters through the single router workflow.
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
- Keep schema changes in versioned files under `db/`; never mutate the schema by hand in a running container.
- Airtable is deliberately not used: its free tier enforces 1,000 API calls per month per workspace, which a rehearsed demo exhausts in days.

**Code nodes and data shape**
- When generating Code nodes from a builder script, avoid backticks and escape sequences inside template literals; they are consumed before reaching the node. Parse every generated Code node before importing.
- Code nodes may not have reliable `$env` / `process.env`. Prefer config-table values or import-time substitution.
- Strict IF nodes require booleans. Normalize truthy strings in a Code node before routing.
- AI structured output may arrive wrapped. Downstream code should handle both wrapped and direct JSON shapes.

**Webhooks, forms, tunnels**
- Imported Webhook/Form Trigger nodes may register under generated paths. Verify actual URLs after import.
- Form Trigger submissions can produce generic keys like `field-0`. Normalize before writing to the state store or an AI step.
- Scripted form submissions must use `multipart/form-data`.
- Respond-to-Webhook status-code expressions are unreliable. Use separate literal-status Respond nodes when status matters.
- cloudflared quick tunnels get a new hostname every run, and n8n reads `WEBHOOK_URL` only at container start. Re-run the tunnel script after any tunnel or Docker restart, then re-import the trigger workflow.
- Docker Compose `restart` may not apply changed environment variables. Recreate the container when changing webhook/tunnel settings.

**Gmail**
- This demo sends and receives on one mailbox, so Gmail marks outbound mail read immediately. Never detect replies by unread state; match on a `Re:` subject carrying the reference token and skip message ids already logged.

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
