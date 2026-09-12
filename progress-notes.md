# Progress Notes — Automated Leasing & Tenant Screening (Build 05)

Newest decision wins. Append entries; do not rewrite history.

---

## 2026-09-11 — Stage 0: Scope Locked

### Decision

Build **both modules** of the leasing pipeline as one connected demo:

- **Module 1 — Automated Leasing (front of funnel):** lead intake → AI FAQ grounded in property facts → pre-qualification → tour booking → post-tour application handoff.
- **Module 2 — Screening Engine (underwriting):** application intake → document extraction → income verification → bureau check → deterministic criteria engine → human decision → lease generation → e-signature → deposit → unit status update.

This is a **proof of concept demonstrating that the production build is achievable**, not a production system. It runs locally on synthetic data. Its job is to be shown to prospects alongside an Excalidraw architecture diagram that maps every demo component to its production equivalent.

Rejected alternative: building only the middle slice. The prospect story is stronger with the whole funnel visible, and the front of funnel is cheap relative to its narrative value.

### Depth Discipline (locked)

**Breadth over depth.** The build covers every stage of the funnel at a medium-high level of fidelity. It does not build production depth at any single stage.

What that means in practice:

- **Three demo paths only:** one clean approval, one fraud flag (claimed income ≠ verified income), one conditional. No exhaustive edge-case handling.
- **One representative case per stage is enough.** One paystub format, one lead-email format, one lease template, one unit type.
- Reliability invariants from `CLAUDE.md` (no duplicate sends, no silent drops, no auto-decision) still hold — they are cheap and they are what makes the demo survive being clicked at by a prospect.
- Anything beyond that is drawn in the Excalidraw diagram, not built.

If a stage starts growing past a couple of nodes of real logic, stop and ask whether the diagram can carry it instead.

### Cost Constraint

**OpenAI is the only paid dependency.** Everything else must be free, free-tier, sandbox, or test mode. If a design needs paid access, stop and propose an alternative.

### Real vs. Mock Boundary

This boundary is the core honesty commitment of the build. Every mock is labelled `(MOCK)` in its node name and writes `source: "mock"` on the record it produces.

**Real integrations, running against live APIs with test data**

| Capability | Tool | Why it is free |
|---|---|---|
| Orchestration | n8n self-hosted | Open source |
| Lead intake (listing sites) | Gmail + parsing | Zillow delivers rental leads as email with a relay address — this is the genuine integration, not a shortcut |
| Website prospect chat | n8n Chat Trigger | Built in, hosted, embeddable |
| AI FAQ, extraction, classification, drafting | OpenAI | Paid, accepted |
| Tour scheduling | Cal.com | Free tier with API + booking webhooks |
| Rental application form + uploads | n8n Form Trigger | Built in |
| **Income & employment verification** | **Plaid Sandbox** | Free, unlimited test Items, real API surface |
| Lease e-signature | **DocuSign developer sandbox** | Free and unlimited; stamps a demo watermark on every page. Chosen over DocuSeal for brand recognition with PM prospects |
| State + manager surface | Postgres (local Docker) + Telegram | Free and unlimited; see Revision 1 for why not Airtable |
| Manager actions | Telegram | Free |

**Mocked, with the reason**

| Capability | Why it cannot be real | How it is faked |
|---|---|---|
| Credit score, eviction records, criminal history | Requires FCRA permissible-purpose credentialing — a bureau contract, business entity, and site inspection. No developer sandbox exists at TransUnion SmartMove/ShareAble or Experian RentBureau. This is a licensing gate, not a pricing one. | `Screening Bureau (MOCK)` sub-workflow returning fixtures shaped to the public TransUnion ShareAble v3 response schema, so swapping in the live endpoint is a one-node change |
| Identity document + selfie verification | Plaid Sandbox performs no OCR; Stripe Identity test mode returns canned outcomes only | `Identity Check (MOCK)` returning a match/no-match fixture with a confidence value |
| Smart-lock PIN for self-guided tours | Rently / Tour24 / smart-lock hardware are paid | Generates and logs a one-time code, sends it in the pre-tour message |
| Listing-syndication API | Zillow has no public lead API | Fixture lead emails in Zillow's real notification format, delivered to the demo Gmail inbox |
| SMS to prospects | US A2P 10DLC registration is a real barrier and Twilio trial is restricted | Email + the website chat widget carry the prospect conversation; SMS is drawn in the diagram as the production swap |

### The Demo's Signature Moment

Plaid Sandbox returns verified payroll deposits for a fixture applicant whose uploaded paystub says something different. Three numbers are compared — **claimed income** (what the applicant typed), **document income** (what OpenAI extracted from the paystub), and **verified income** (what Plaid returned). When they disagree, the file is flagged for a human with all three values and their sources on screen.

That is the fraud-detection story the industry actually cares about, told with a real API, at zero cost.

### Compliance Posture

Recorded as a locked decision because it shapes every workflow:

- AI never decides, scores, ranks, or recommends. Extraction, grounded Q&A, classification, and drafting only.
- The criteria engine is deterministic JavaScript over manager-configured thresholds, emitting `meets_criteria` / `conditional` / `does_not_meet` with a per-criterion evidence trail.
- `does_not_meet` **stops and hands off to a human**. No adverse-action notice is ever generated or sent. The stop is demonstrated as a feature, with the real FCRA two-step requirement shown in the diagram as what a production deployment adds.
- Pre-qualification is unverified self-reported triage for tour scheduling, never framed to the prospect as a denial.
- Tier A messages (grounded FAQ answers, tour confirmations, application links, status updates) auto-send after a guardrail check. Tier B messages (anything touching an outcome or requesting documents post-application) require individual manager approval.

See `CLAUDE.md` → Domain Rules for the enforceable version.

### Planned Workflow Set

**Four** workflows. Numbering is locked here; do not renumber. Cut down from an earlier seven-workflow sketch under the depth-discipline rule above.

| ID | Name | Responsibility |
|---|---|---|
| WF1 | `leasing-front` | Lead in (fixture Zillow email via Gmail + website Chat Trigger) → normalize → grounded FAQ → pre-qualification → Cal.com tour link → smart-lock PIN (MOCK) → post-tour application link |
| WF2 | `application-and-verify` | Form Trigger intake + SSN masking + FCRA consent → paystub/ID extraction → Plaid Sandbox income → bureau check (MOCK) → deterministic criteria engine → decision card to Telegram |
| WF3 | `telegram-router` | The single Telegram Trigger. Manager approves / marks conditional / sends to review. Triggers WF4 |
| WF4 | `lease-and-signature` | Populate lease template → DocuSign sandbox envelope → completion webhook → unit marked leased → welcome message. Also carries the demo reset |

### State Model

Four Postgres tables, not nine:

- `units` — property facts, doubles as the FAQ knowledge base
- `leads` — prospect, conversation state, pre-qual answers, tour booking
- `applications` — applicant details, extracted document values, verification results, criteria outcome, decision, lease status
- `message_log` — every message in or out, with tier and guardrail result

### Cut From Scope

Dropped deliberately; drawn in the diagram instead of built:

- **Stripe application fee and deposit collection** — proves little beyond "a test card charged", adds a payment surface to maintain
- Separate documents / verifications / decisions / tours tables — folded into `leads` and `applications`
- A dedicated ops/metrics/sweep workflow — reset logic lives in WF4
- Multi-applicant households, co-signers, renewal of an expired application, partial-document chase loops

### Open Items

- [x] E-sign: **DocuSign developer sandbox** (decided 2026-09-11). Brand recognition with property-management prospects outweighs the demo watermark on every page. DocuSeal noted in the diagram as the self-hosted alternative.
- [ ] Write `build-plan.md` with staged verification gates.
- [ ] `git init` + `.gitignore` before any commit.
- [ ] Draft the Excalidraw production-architecture diagram mapping each mock to its real counterpart.

---

## 2026-09-11 — Stage 0 Revision: Research Pass Findings

Full research pass completed. Three documents added:
`05-automated-leasing-tenant-screening.md` (problem + market, cited),
`foundation-5-leasing-screening.md` (domain background), and
`docs/feasibility-spike.md` (tool verification).

### Revision 1 — State store moves from Airtable to Postgres

**Airtable Free is capped at 1,000 API calls per month per workspace, enforced since
22 Jan 2025.** A full pipeline run costs 30-80 calls; development plus rehearsal would
exhaust a month in days, and the failure mode is the demo dying mid-pitch on a billing error.

Postgres (local Docker) is now the system of record. Telegram remains the manager surface,
as in build 04. The four-table model is unchanged in substance; it becomes SQL in `db/`
rather than Airtable tables. If a paid Airtable workspace exists it may be used as a display
layer only, never as the system of record.

### Revision 2 — The tunnel is required earlier than planned

Cal.com **cloud** webhooks require HTTPS and block private IPs, so a booking cannot reach
`localhost:5678`. The cloudflared tunnel is needed for WF1/WF2, not just for the Telegram
Trigger and DocuSign Connect.

### Revision 3 — The criteria engine must handle rental assistance

19 states, DC, and 100+ localities prohibit source-of-income discrimination, including six of
the ten largest US cities. Requiring a voucher holder to earn 3x the **full** rent is treated
as source-of-income discrimination where those laws apply; the multiple must be applied to
**tenant-responsible rent** only.

Concrete changes:
- Criteria config gains a `rental_assistance_amount` field.
- The engine computes the income multiple against tenant-responsible rent, not gross rent.
- Add a voucher-holder fixture to the demo set. This becomes a fourth demo path and is a
  strong beat — it shows the system handling something a spreadsheet gets wrong.

### Revision 4 — Fair housing question prohibitions are now explicit

Pre-qualification and FAQ prompts must carry an explicit prohibition list (familial status,
disability, national origin, religion, arrest records) and the bot must refuse to answer
prospect questions that would elicit a protected attribute. See
`foundation-5-leasing-screening.md`.

### Confirmed Unchanged

- Plaid Sandbox free and unlimited; payroll-income test flow verified
  (`/user/create` → `/sandbox/public_token/create` with `ins_135842` → `/credit/payroll_income/get`).
  Response shape still to be captured empirically.
- DocuSign developer sandbox free; 5 signers/envelope (irrelevant, demo has one) plus an
  undocumented cumulative recipient cap — mitigate with a small recipient pool.
- n8n Chat Trigger hosted mode confirmed as the website chat surface.
- Gmail lead intake confirmed realistic: Zillow sends leads by email with an anonymised relay
  address and no phone number. The demo must match that behaviour.
- Consumer reports remain blocked by FCRA credentialing, not price. Mock in ShareAble v3 shape.

### Evidence Highlights Now Backing The Pitch

- NMHC: 93% of providers hit by fraud in 12 months; 85% saw falsified income documents;
  23.8% of evictions traced to fraudulent applications.
- RealPage/RentCafe: 34-41 days average time-to-lease; ~$55-60 lost per vacant day.
- HUD May 2024 guidance: screening tools should "implement, rather than set" the provider's
  policies and offer customizable criteria — which is a direct description of this build's
  architecture, and the strongest positioning asset in the project.

---

## 2026-09-11 — Build Plan Written

`build-plan.md` added. Six stages, one gate each, roughly five to six working days to a
recorded demo.

Scope reaffirmed at POC level on explicit instruction: **happy path only.** Two fixture
outcomes (clean approval, fraud flag) running through an identical pipeline, so the second
costs almost nothing to add. The build plan carries an explicit "What We Are Not Testing"
list — do not add checks from it without a plan revision.

Three invariants kept from the `CLAUDE.md` list because they protect a live meeting:
no duplicate send on a double-tap, no path to a lease without a recorded human tap, and
visible failure. The rest are deferred as production concerns.

Voucher handling demoted from a demo path to a correctness detail: the schema keeps
`rental_assistance_amount` and the engine applies the income multiple to tenant-responsible
rent, but no fixture is built around it. It is a talking point, not a beat.

Next: Stage 1 (environment).

---

## 2026-09-12 — Revision: Airtable Returns As A Display Mirror

Postgres alone gives the demo nothing to look at, and the lead pipeline is the part that
benefits most from a visible board. Airtable comes back, but as a **mirror, not a store**.

- **Postgres remains the system of record for everything.**
- **Airtable mirrors the lead pipeline** so the demo has a board on screen.
- Mirror writes at phase boundaries only — lead created, pre-qualified, tour booked, applied,
  decided. About five calls per lead lifecycle, which keeps the 1,000/month free cap
  comfortable even with heavy rehearsal.
- Mirror writes are **fire-and-forget**. Never read state back from Airtable and never block a
  workflow on an Airtable write. If the mirror is capped or failing, the pipeline runs on and
  only the board goes stale.
- `scripts/sync-airtable.js` rebuilds the board from Postgres in one command, so a stale board
  is recoverable before a take.
- Application-level detail — extracted values, the three income numbers, criteria evidence —
  stays on the **Telegram card**, which is already the richest visual in the demo.

Rejected: putting leads in Airtable as their home. That makes a capped free tier a
single point of failure in the middle of a live meeting.

Demo visual set is now: Airtable lead board → Telegram decision card → DocuSign envelope.

---

## 2026-09-12 — Stage 1: Infrastructure Up

Docker Compose stack running: `leasing-postgres` (Postgres 16.14, host port 5433) and
`leasing-n8n` (n8n 2.29.10, port 5678). n8n keeps its own state in SQLite inside its volume;
the Postgres service is the application database, not n8n's internal store.

`node scripts/verify-stage-1.js` passes all required checks. Credentials and tunnel are the
two optional checks still showing SKIP — both need the account signups in
`docs/stage-1-setup.md`, which is the remaining human step.

Scripts written:
- `scripts/lib/env.js` — .env read/write, no npm dependency
- `scripts/generate-secrets.js` — encryption key + Postgres password, refuses to clobber
- `scripts/setup-credentials.js` — imports Postgres, OpenAI, Telegram, Airtable, Cal.com,
  Plaid and DocuSign credentials into n8n from .env, each reported separately
- `scripts/get-telegram-chat-id.js` — resolves and writes the manager chat id
- `scripts/start-tunnel.js` — cloudflared, writes the hostname into .env, recreates n8n
- `scripts/verify-stage-1.js` — the Stage 1 gate

Decisions made during setup:
- Postgres exposed on host **5433** to avoid clashing with any local 5432 install.
- Plaid uses an `httpCustomAuth` credential carrying `PLAID-CLIENT-ID` and `PLAID-SECRET`
  headers, because `httpHeaderAuth` only holds one header pair.
- DocuSign uses a `jwtAuth` credential holding the RSA key, signed by n8n's built-in JWT node
  and exchanged for an access token by an HTTP Request node. The DocuSign community node
  exists but community nodes are out of scope per `CLAUDE.md`.
- Credential ids are fixed (`leasing-postgres`, `leasing-openai`, ...) so workflow JSON can
  carry stable placeholders.

Gotcha found: `.gitignore` pattern `*.private.key` does not match `docusign-private.key`.
Widened to `*.key` / `*.pem` / `*.p12` / `*.pfx` and verified with `git check-ignore`.

Next: the account signups in `docs/stage-1-setup.md`, then `node scripts/setup-credentials.js`.

---

## 2026-09-12 — Revision: Email Moves To SMTP/IMAP

Gmail OAuth2 replaced with **SMTP out / IMAP in**, using a Gmail App Password.

Why: OAuth2 required a Google Cloud project, an enabled Gmail API, an OAuth consent screen,
a test-user entry, an OAuth client, and a redirect URI — all manual, all browser-bound, and
the only credential that could not be scripted. SMTP/IMAP credentials are plain
host/port/user/password, so `scripts/setup-credentials.js` now creates **every** credential
in the project. Nothing has to be typed into an n8n credential screen.

Verified: Gmail App Passwords still work in 2026 and require 2-Step Verification on the
account. Plain account passwords have not worked for IMAP/SMTP since May 2022.

Secondary benefit: the build is no longer tied to Google. Any mailbox provider works, which
is a better story for a real client deployment.

Trade-offs accepted:
- The IMAP trigger polls rather than pushing, so inbound mail has a short delay. Fine for a
  demo and it makes timing easier to control on camera.
- No Gmail labels, threads, or search syntax. Not needed — replies are matched on the
  `[R-xxxx]` token in the subject and deduped on message id.
- The n8n IMAP trigger has had reported reliability issues across versions. Fallback if it
  misses mail: a Schedule Trigger polling an IMAP node, or Gmail OAuth2 as a last resort.

Note: the single-mailbox read-state gotcha carried over from build 04 does not apply here.
Outbound mail lands in `[Gmail]/Sent`, not `INBOX`, so it never appears to the IMAP trigger.

Credential set is now: postgres, smtp, imap, openai, telegram, airtable, calcom, plaid,
docusign.

---

## 2026-09-12 — Stage 1 Gate: PASS

All credentials created and verified against live APIs, not just present in `.env`.

`node scripts/verify-credentials.js` — new script, tests each service for real:

| Service | Result |
|---|---|
| OpenAI | 132 models reachable |
| Telegram | `@sambhav_leasing_demo_bot` |
| Plaid Sandbox | reachable, 10,089 institutions |
| Cal.com | v2 API ok |
| DocuSign JWT + consent | access token acquired (proves the RSA key AND the consent grant) |
| DocuSign account | `n8n-testing`, id matches `.env` |
| Airtable PAT + base | base reachable |
| SMTP | authenticated |
| IMAP | authenticated |

All nine credentials imported into n8n with fixed ids: `leasing-postgres`, `leasing-smtp`,
`leasing-imap`, `leasing-openai`, `leasing-telegram`, `leasing-airtable`, `leasing-calcom`,
`leasing-plaid`, `leasing-docusign-jwt`.

Tunnel up, Telegram test message delivered, `verify-stage-1.js` passes every check.

### Fixed during this stage

`setup-credentials.js` used `docker cp`, which writes into the container as root. The n8n
process runs as the `node` user, so the cleanup `rm` failed and all nine imports were
reported as failures even though every one had succeeded. Now the payload is piped in over
stdin so the `node` user owns the file, and cleanup is best-effort — a failed cleanup can no
longer be mistaken for a failed import.

### Open item for demo polish

The Cal.com event type is still the default **"30 min meeting"**. Rename it to **"Unit Tour"**
before recording — it appears on the booking page the prospect sees.

Next: Stage 2 — schema, fixtures, seed.

---

## 2026-09-12 — Stage 2 Gate: PASS

Schema, fixtures and seed complete. `node scripts/verify-stage-2.js` passes all eight checks.

### Plaid response captured first, out of plan order

`build-plan.md` put the Plaid capture in Stage 4. It had to move to Stage 2, because Sandbox
returns **fixed** income for every applicant and the fixtures have to be built around that
number rather than the other way round.

Captured to `fixtures/plaid-payroll-income.json`:

- employee `Josie Georgia Harrison` (Sandbox's canned identity)
- gross **$2,306 BIWEEKLY**
- so **verified monthly = 2306 x 26 / 12 = $4,996.33**

Working sandbox flow (the docs are misleading on this):

1. `POST /user/create` — returns `user_id` only. **`user_token` no longer comes back**; it is
   legacy and passing it fails with `INVALID_FIELD`.
2. `POST /sandbox/public_token/create` with `institution_id: ins_135842`, `initial_products:
   ["income_verification"]`, and **`user_id`**. An `income_verification` object in this call is
   rejected with `UNKNOWN_FIELDS`.
3. `POST /credit/payroll_income/get` with **`user_id`**.

Skipping `user_id` in step 2 yields `INCOME_VERIFICATION_NOT_FOUND` at step 3.

### Deviation: two units, not one

`build-plan.md` said one unit. Sandbox returns the same verified income for both applicants,
so the two demo paths cannot be separated by income — they are separated by **rent**:

| Applicant | Unit | Paper | Verified | Outcome |
|---|---|---|---|---|
| Maya | MAPLE-2B, $1,650 | 3.03x | 3.03x | `meets_criteria` |
| Devon | MAPLE-5A, $1,950 | 4.00x | 2.56x | `does_not_meet` |

This is a better demo than one unit would have been. Devon clears 4.0x on his paperwork and
would have been approved; verified against actual payroll deposits he is at 2.56x and fails,
with a 56% document mismatch on top. The second unit also gives the FAQ bot something real to
answer ("do you have anything bigger?").

### Deviation: five tables, not four

`criteria_config` added. `CLAUDE.md` requires the criteria engine to read manager-configured
thresholds from a config table, and HUD's "implement, rather than set" guidance is the single
strongest positioning asset in the project — so the thresholds had to be data, not code. The
table is tiny and holds one row.

### Built

- `db/schema.sql` — five tables, `updated_at` triggers, dedupe on `message_log.message_id`.
  No DOB column and no full SSN column anywhere; `ssn_last4` only.
- `fixtures/demo-data.js` — single source of truth for units, applicants, and the lead email.
- `fixtures/paystub-{maya,devon}.pdf` — generated by `scripts/generate-paystubs.js`, written as
  raw PDF so the project keeps zero npm dependencies. Verified to render correctly in a viewer;
  they appear on camera.
- `fixtures/lead-email-maya.txt` — Zillow-format lead with an anonymised relay reply-to and no
  phone number, matching real Zillow behaviour.
- `scripts/seed-demo.js` — idempotent, confirmed by running twice.
- `scripts/verify-stage-2.js` — the gate.

Two checks in the gate are worth keeping permanently: one asserts the captured Plaid figure
still matches what the fixtures assume (if Plaid changes its canned data the demo's premise
breaks silently), and one recomputes both demo paths to prove they still produce **different**
outcomes.

### Note for Stage 3

The fixture lead email has to arrive **from the prospect account**, not the system mailbox, or
the IMAP trigger re-processes our own send. Options: paste it by hand from the prospect Gmail,
or add a second app password so it can be scripted. Decide at the start of Stage 3.

Also: the containers had exited overnight and the tunnel is dead. `docker compose up -d` then
`node scripts/start-tunnel.js` before Stage 3.

---

## 2026-09-12 — Prospect Mail Round Trip Verified

`node scripts/send-as-prospect.js lead` → `node scripts/check-inbox.js` confirms the full
path works:

```
From:     "Zillow Rental Manager" <worksambhav26@gmail.com>
Reply-To: maya.restrepo.demo@convo.zillow.com
Subject:  New rental inquiry: 412 Maple Street, Apt 2B
Msg-ID:   <a7d6b159-...@gmail.com>
```

Display name survives, the relay Reply-To is intact, and a Message-ID is present for dedupe.
As expected, Gmail rewrites the From **address** to the authenticated account; only the
display name is ours. That is acceptable and matches how the demo is narrated.

Added `scripts/lib/imap.js` (dependency-free IMAP client) and `scripts/check-inbox.js`, which
reads either mailbox. Both will be the primary debugging tool for the Stage 3 IMAP trigger —
far better than guessing from n8n's execution list.

Mailbox variables consolidated: `DEMO_RECIPIENT_EMAIL` and `DEMO_FROM_EMAIL` are gone. There
are two mailboxes and two variables, `GMAIL_ADDRESS` and `PROSPECT_GMAIL_ADDRESS`, and each
mailbox both sends and receives.

### Two issues found, both needing a decision before Stage 3

**1. The IMAP trigger will see unrelated mail.** The system mailbox INBOX already holds 51
messages, including marketing from Plaid and Cal.com that arrived during setup. An IMAP
trigger on `UNSEEN` in INBOX would happily process those. Options:

- Search criteria on the trigger, e.g. only messages whose subject matches the lead or
  `[R-xxxx]` reply pattern
- A Gmail filter that labels demo mail and an IMAP trigger bound to that label/folder
- A first Code node that drops anything not matching, before any AI or DB step

The label approach is cleanest and is also the most production-honest: a real deployment
would have leads arriving to a dedicated address or label, not a human's general inbox.

**2. The prospect mailbox is not a throwaway account.** `worksambhav26@gmail.com` holds
**10,649 messages** — it is a real, in-use account. Two consequences:

- On camera, showing the prospect's inbox exposes thousands of real emails. Bad for the
  recording and a privacy problem if the video is shared.
- Demo mail is interleaved with real mail, making a clean take harder.

Recommendation: create a genuinely empty Gmail for the prospect before recording. If that is
not wanted, at minimum set up a label + filter so a clean filtered view can be shown instead
of the raw inbox.

---

## 2026-09-12 — Stage 3 Partial: Email Lead Path Working

### Working end to end, verified with real mail

`send-as-prospect.js lead` → IMAP trigger → parse → unit lookup → lead row → OpenAI draft →
guardrail → SMTP → message log. Confirmed by database rows and by the mail landing in the
prospect inbox.

The reply the model produced, unedited:

> Hi Maya,
>
> Thanks for your interest in the two-bedroom at 412 Maple Street, Apt 2B. One assigned
> surface parking space is included, and a second space may be available for $50/month. Small
> dogs are welcome if they are under 50 lbs; breed restrictions apply. The monthly pet fee is
> $35, with a maximum of two pets. The unit is available starting October 1, 2026, which may
> fit an early-October move-in.
>
> To check which units fit, rather than make a decision, could you share your intended move-in
> date, approximate gross monthly income, pets, number of vehicles, and how many adults will
> be living there?

Every figure traces to the `units` row. Guardrail passed. It even reproduced the "to check
which units fit, rather than make a decision" framing the instructions require.

### Open item: the prequal reply branch

The reply path triggers and reaches the database, but extracted answers come back empty and
the run ends in a `NodeOperationError` that the reference-encoded execution blob has not yet
given up. Next session: reproduce with the workflow opened in the n8n UI, where the failing
node and its input are visible directly, rather than decoding `execution_data` by hand.

The new-lead path is unaffected.

### Four n8n gotchas found, all now in CLAUDE.md

1. **`queryReplacement` drops `undefined` entries.** The Postgres node flattens an array
   expression with `if (item === undefined) continue`, so a single absent value silently
   shortens the parameter list and Postgres reports `there is no parameter $5`. Pass `?? ''`
   for anything nullable and unwrap with `NULLIF($n,'')` in SQL.
2. **`queryReplacement` as a comma-separated string is unsafe here anyway** — addresses
   contain commas. The array-expression form is correct.
3. **OpenAI `textFormat.textOptions` must be an object, not an array.** The field's own
   default shows an array, but the node reads `textFormat.textOptions.type` directly. Passing
   an array means no format is ever sent and the model returns prose instead of JSON, with no
   error anywhere.
4. **`emailSend` appends an n8n attribution footer** unless `options.appendAttribution` is
   false. Harmless on internal alerts, wrong on prospect-facing mail.

### Invariant added

An empty draft now throws instead of sending. The first version of the guardrail happily
passed an empty string (no findings = no problem) and sent a blank email — precisely the
quiet failure `CLAUDE.md` forbids. Both AI-consuming Code nodes now share `unwrapAiPayload`
from `leasing-lib.js` and fail loudly with the raw shape when the payload is not what the
schema promised.

### Built

- `scripts/lib/leasing-lib.js` — tokens, lead parsing, unit knowledge, Tier A guardrails,
  prequal gate, lock code, AI unwrap. 19 unit tests in `scripts/test-leasing-lib.js`, all
  passing, run outside n8n.
- `scripts/lib/wf-common.js` — node factories; parses every generated Code node before
  writing, wrapped in an async function so top-level `return` validates correctly.
- `scripts/build-wf1-leasing-front.js` — 28 nodes, three entry points.
- `scripts/import-workflows.js` — placeholder substitution and CLI import.
- `scripts/lib/smtp.js`, `scripts/lib/imap.js`, `scripts/check-inbox.js` — dependency-free
  mail tooling; `check-inbox.js --body` proved the empty-email bug faster than n8n's own logs.

---

## 2026-09-12 — Prequal Branch Fixed

Root cause found and fixed. The reply path now runs end to end.

### The bug

`Update Lead After Prequal` failed with `invalid input syntax for type integer: ""`.

Postgres infers an untyped parameter's type from its surrounding context. Inside
`COALESCE(NULLIF($5,'')::int, vehicles)` the target column is `integer`, so the empty-string
literal was parsed as an integer and failed **before** `NULLIF` ever ran. Casting the
parameter first — `NULLIF($5::text,'')::int` — pins it to text and the guard works as
intended.

Worth noting this was the second half of the same problem: the `?? ''` coercion added earlier
exists because the node drops `undefined` array entries, and that coercion is what introduced
the empty strings this cast now handles. Both halves are needed.

### How it was found without the n8n UI

Decoding `execution_data` by hand was going nowhere. What worked was parsing the blob as JSON
and filtering its string entries:

- listing which known node names appear → showed the run reached `Update Lead After Prequal`
  and that `Run Prequal Gate` had **succeeded**, ruling out the AI unwrap
- filtering strings matching error-shaped patterns → surfaced the exact Postgres message

Ruling out the schema first was also cheap and worth repeating: calling
`https://api.openai.com/v1/responses` directly with the same JSON Schema returned a correct
payload in one request, which eliminated the model as a suspect before any n8n debugging.

### Verified result

Prospect reply: *"October 5th works for me. I make about $5,000 a month gross. One small dog,
18 lbs. One car. Just me living there."*

```
ref_token             | R-9332
status                | prequalified
move_in_date          | 2026-10-05        <- relative date resolved
stated_monthly_income | 5000.00
pets                  | One small dog, 18 lbs.
vehicles              | 1
occupants             | 1
prequal_result        | clear
```

Evidence trail stored per criterion, with the income line reading
`$5000/mo stated against $1650 rent = 3.03x (unverified)` — the "(unverified)" label is
carried through from the library, which matters because pre-qualification is scheduling
triage on self-reported answers, not a rental decision.

Tour booking email delivered to the prospect with the Cal.com link and the ref token in the
query string, so the booking webhook can match it back to the lead.

### Remaining in Stage 3

- Register the Cal.com booking webhook against the current tunnel URL
- Test booking → lock code (MOCK) → confirmation email
- Test tour-completed → application link

---

## 2026-09-12 — Stage 3 Gate: PASS

WF1 complete. `node scripts/verify-stage-3.js` drives the whole front of funnel with real
mail and real webhooks, then asserts the resulting state:

```
PASS  WF1 imported and active
PASS  Cal.com webhook points at current tunnel
PASS  Clean demo state seeded
PASS  Lead created from listing email - R-4220
PASS  Grounded reply sent and logged - guardrail_passed=true, 613 chars
PASS  No invented figures in the reply - 2 figures, all grounded
PASS  Pre-qualification extracted and evaluated - clear, move-in 2026-10-05, $5000/mo, 1 vehicle
PASS  Prequal evidence labelled unverified, no decision language
PASS  Tour booking recorded with lock code - tour_booked, code 457194, source=mock
PASS  Application link sent after tour - status=toured
```

The gate is deliberately end-to-end rather than a set of unit checks. Every failure that
actually bit during this stage — a dropped query parameter, a JSON schema that was never
sent, an empty email — passed every static check and only appeared when a real message went
through.

Two checks in it are compliance assertions rather than plumbing checks, and are worth
keeping: one re-derives every dollar figure in the AI's reply and fails if any of them is not
in the unit facts; the other asserts the pre-qualification evidence trail still carries the
"unverified" label and contains no decision language.

### Added

- `scripts/register-calcom-webhook.js` — points BOOKING_CREATED at the current tunnel and
  cleans up dead `trycloudflare.com` subscribers from previous runs. **Must be re-run after
  every tunnel restart**: Cal.com does not surface delivery failures, so a webhook aimed at a
  dead hostname simply goes quiet.
- `scripts/verify-stage-3.js` — the gate. `--skip-mail` runs only the webhook paths in ~20s.

### Stage 3 deviation: no web chat

`build-plan.md` listed an n8n Chat Trigger alongside the email path in WF1. Not built. The
email path is the spine that connects to the rest of the funnel, and a second entry point
would have duplicated the FAQ logic for a surface that tells the same story. Under the depth
discipline rule this is diagram material, not build material. Revisit only if the recording
turns out to need a live-typing moment.

### Demo sequence for WF1, all one command each

```bash
node scripts/seed-demo.js
node scripts/send-as-prospect.js lead
node scripts/send-as-prospect.js reply "Re: 412 Maple Street, Apt 2B, Springfield [R-xxxx]" "..."
# book a slot on the Cal.com link, or POST the fixture payload
curl -X POST "$TUNNEL/webhook/tour-completed" -d '{"ref_token":"R-xxxx"}'
```

Next: Stage 4 — WF2 application intake and verification.

---

## 2026-09-12 — Stage 4: WF2 Working, Both Demo Paths Verified

The screening engine runs end to end on both fixtures, with a real Plaid Sandbox call in the
middle.

**Maya — clean approval**

```
extracted_monthly_income | 4996.33   <- AI read it off the uploaded PDF
verified_monthly_income  | 4996.33   <- real Plaid Sandbox call
credit_score             | 712
criteria_result          | meets_criteria
status                   | awaiting_decision
```

**Devon — the moment the demo exists for**

```
claimed_monthly_income   | 7800.00
extracted_monthly_income | 7800.00   <- what his pay stub says
verified_monthly_income  | 4996.33   <- what his payroll deposits show
document_variance_pct    | 56.1
criteria_result          | does_not_meet
status                   | stopped_for_human
```

Devon clears 4.0x on his paperwork. Verified against actual deposits he is at 2.56x. The
system stops, sends him nothing, and hands the manager the FCRA adverse-action requirements
rather than generating a denial.

### Built

- `scripts/lib/screening-lib.js` — SSN masking, Plaid normalisation, the three-number income
  comparison, and the deterministic criteria engine. 19 tests in
  `scripts/test-screening-lib.js`, including a source-of-income case proving the income
  multiple is applied to tenant-responsible rent, and an assertion that the engine's output
  never contains a decision, score, or recommendation.
- `scripts/build-wf2-application-verify.js` — 18 nodes.
- `scripts/submit-application.js` — submits a fixture application with its pay stub.

### Six n8n findings, all now in CLAUDE.md

Stage 4 cost more debugging than any other, almost entirely on n8n's own conventions rather
than on logic. Each of these failed *silently* or with a message pointing somewhere else:

1. **A Form Trigger submits `field-0`, `field-1`, ... in declaration order**, not by label.
   Posting labels is accepted and every field arrives `null` — the submission succeeds, the
   workflow runs, and the data is empty. `submit-application.js` now reads the field order
   out of the built workflow JSON so it cannot drift.
2. **An uploaded file is keyed after `field-N`, not the field label.** Re-keyed to `paystub`
   in the first Code node.
3. **Postgres nodes drop binary data.** The pay stub has to reach the extract node before any
   database node. WF2 is one sequential chain for this reason, not parallel branches.
4. **HTTP Request needs `contentType: "json"`** alongside `sendBody` and `specifyBody`.
   Without it the body is form-encoded and Plaid answered a bare 400.
5. **`httpCustomAuth` is a GENERIC credential type**, not a predefined one. Declared wrongly
   it applies no auth at all and Plaid reported `MISSING_FIELDS: client_id, secret` as though
   the credential had never been created.
6. **A trimmed copy of a shared helper is a bug waiting to happen.** WF2 had a local copy of
   the AI unwrapper missing the `text` hop, so a perfectly correct extraction was rejected as
   "unexpected shape". Both workflows now use `unwrapAiPayload` from the library. This is
   exactly what the "never duplicate logic between a lib and a workflow" rule is for.

Also worth remembering: `alwaysOutputData: true` on a Postgres node turns "no rows" into an
empty item, which then writes a null foreign key instead of failing. Removed from the unit
lookup so a missing unit fails loudly.

### Remaining in Stage 4

- Confirm the Telegram decision card renders with its three buttons, and the stop card with
  the adverse-action requirements
- Verify the double-tap guard once WF3 exists to receive the callbacks

---

## 2026-09-12 — Stage 5: Router And Lease Working

WF3 and WF4 built and verified. The pipeline now runs from a listing-site lead all the way
to a lease sitting in the applicant's inbox awaiting signature.

### Verified end to end

```
ref_token    | A-9135
full_name    | Maya Restrepo
credit_score | 712                                    <- name-keyed mock
decision     | approved
status       | lease_sent
lease_status | sent
envelope_id  | b4112766-bdfb-8e30-81d3-26adfe9d0cb7
```

Confirmed against the DocuSign API directly:

```
status:  sent | subject: Your lease for 412 Maple Street, Apt 2B, Springfield
signer:  Maya Restrepo <worksambhav26@gmail.com> | sent
```

### Double-tap guard proven

Two identical taps were sent four seconds apart. The first recorded the decision and created
the envelope; the second took the already-decided branch and did nothing. The guard is in two
places, deliberately:

- `Record Decision` has `WHERE ref_token = $1 AND decision IS NULL`
- `Load Application For Lease` has `WHERE ref_token = $1 AND envelope_id IS NULL`

Either alone would be enough in the happy case; both together mean a race between two taps
still cannot produce two envelopes.

### Design notes

- **Connect is configured per envelope** through `eventNotification` in the create body, so
  no setup is needed in the DocuSign admin UI and the callback follows the tunnel
  automatically on every rebuild.
- **The lease is sent as HTML** and DocuSign converts it to PDF. Signature placement uses
  `anchorString` markers (`/sig1/`, `/date1/`) in the template.
- **There is no denial button.** The card offers Approve, Conditional, and Send to review.
  `does_not_meet` never reaches this workflow at all.
- The signer address is overridden to `PROSPECT_GMAIL_ADDRESS` at submission time so the
  lease lands somewhere signable, while the committed fixture keeps a generic address.
- The mock bureau is keyed on applicant **name**, not email, because every demo applicant
  now shares one real mailbox.

### Three more n8n / DocuSign findings, in CLAUDE.md

1. **`eventNotification.events` requires `deliveryMode: "SIM"` and `eventData` together.**
   Omit either and DocuSign rejects the whole envelope with `INVALID_REQUEST_PARAMETER`.
2. **The Telegram Trigger validates a secret header**, derived as `${workflowId}_${nodeId}`
   with anything outside `[A-Za-z0-9_-]` stripped, sent as `X-Telegram-Bot-Api-Secret-Token`.
   A posted update without it gets a 403. `scripts/simulate-telegram-tap.js` derives it from
   the workflow JSON.
3. **Activating the Telegram Trigger registers a webhook on the bot**, which disables
   `getUpdates` — so `get-telegram-chat-id.js` stops working until WF3 is deactivated.

### Open

- The signature half of WF4 (`docusign-status` webhook → mark signed → unit leased → welcome
  packet) is built and registered but unverified: it needs the lease actually signed, which
  is a human action in DocuSign. Sign the envelope sitting in the prospect mailbox to close
  the loop.

---

## 2026-09-12 — Full Pipeline Closed

The lease was signed in DocuSign and the final path completed on its own:

```
status          | lease_signed
lease_status    | signed
lease_signed_at | 2026-09-12 08:27:30

MAPLE-2B -> leased
MAPLE-5A -> available
```

Welcome packet delivered 23 seconds after DocuSign's own completion notice:

```
08:27:07  Completed: Your lease for 412 Maple Street, Apt 2B   (DocuSign)
08:27:30  Welcome to 412 Maple Street, Apt 2B [A-9135]         (the system)
```

Every stage of the funnel now runs end to end on real services:

listing-site lead email -> grounded AI reply -> pre-qualification -> tour booked with a
one-time entry code -> application with documents -> paystub extraction -> **real Plaid
Sandbox income verification** -> mocked bureau in ShareAble shape -> deterministic criteria
engine -> human decision on Telegram -> DocuSign envelope -> signed -> unit marked leased ->
welcome packet.

Both demo outcomes are proven: Maya reaches a signed lease, Devon stops for a human with a
56% income mismatch and no adverse-action notice generated.

Stages 1 to 5 are complete. Only Stage 6 remains: demo reset, the Excalidraw architecture
diagram, the recording checklist, and the `my_builds/05-*` write-ups.

---

## 2026-09-12 — Stage 6: Demo Polish Complete

All six stages done. The build is demo-ready.

### Added

- `scripts/reset-demo.js` — clean state between takes, optionally clearing the Airtable
  mirror. Prints what it deliberately does not reset (DocuSign envelopes, mailboxes, Cal.com
  bookings) rather than silently leaving them.
- `scripts/generate-architecture-diagram.js` → `docs/architecture.excalidraw` — 12 pipeline
  stages, each with its production swap directly beneath. Green = real, amber = labelled
  mock, blue = the human decision, grey = what production puts there instead. Includes a
  "what the system never does" callout. Layout verified by rendering an SVG preview rather
  than trusting the coordinates.
- `docs/recording-checklist.md` — setup commands, window layout, the run beat by beat with
  suggested narration, a failure table, and the four lines worth saying to a prospect.
- `my_builds/05-leasing-tenant-screening/how-the-system-works.md` — plain-language write-up
  matching builds 01-04.
- `my_builds/05-leasing-tenant-screening/build-technical-notes.md` — how it was assembled,
  what broke, and what I would do differently.

### Final state

- 4 workflows, 71 nodes, 5 Postgres tables, **zero npm dependencies**
- 38 unit tests plus an end-to-end gate per stage, all passing
- Only paid dependency is OpenAI, a few dollars for the entire build
- Both demo outcomes proven end to end on real services

### The one thing still worth doing before recording

Swap `PROSPECT_GMAIL_ADDRESS` to a genuinely empty Gmail. The current one holds 10,000+ real
messages and will be on screen. One `.env` line.

Also rename the Cal.com event type from "30 min meeting" to "Unit Tour" — the prospect sees
that title on the booking page.

---

## 2026-09-12 — Airtable Board Fixed

The board had never worked. Two causes, both mine.

**1. The `Leads` table did not exist.** The base only had Airtable's default `Table 1`, so
every mirror write from WF1 404'd. Because the mirror node is fire-and-forget by design
(`onError: continueRegularOutput`), it failed silently on every run and never appeared in any
verification gate. Fixed by `scripts/setup-airtable-schema.js`, which creates the table and is
safe to re-run.

**2. The credential stored the token under the wrong key.** `airtableTokenApi` expects
`accessToken`; it was written as `apiKey`, so the token was empty. n8n reported
"Authorization failed - please check your credentials", which reads like a bad token rather
than a missing one — the PAT itself was fine the whole time and had just created the table.

**Lesson, now in CLAUDE.md:** a node whose errors are deliberately swallowed must be verified
to succeed at least once, explicitly. "It never broke anything" is not evidence it works.

### Added

- `scripts/setup-airtable-schema.js` — creates the `Leads` table with 11 fields, idempotent,
  adds only missing fields on re-run.
- `scripts/sync-airtable.js` — rebuilds the board from Postgres, upserting on `Ref Token` so
  repeated runs update rather than duplicate. Includes applications that have no lead, which
  would otherwise be invisible.
- `submit-application.js` now auto-links to the most recent lead, mirroring the real flow
  where the application link email carries `?ref_token=R-xxxx`. `--standalone` opts out.

### Verified

```
BOARD: 2 record(s)

  A-7506   Devon Clarke    Stopped For Review  MISMATCH 56% over verified
  R-2667   Maya Restrepo   Engaged
```

The mismatch flag renders on the board itself, which makes it a genuinely useful third window
during the demo rather than decoration.

One manual step remains: delete Airtable's default `Table 1` by hand. The Meta API can create
tables but cannot delete them.

---

## 2026-09-12 — HANDOFF: Current State

**Read this entry first. It is the state of the project as of the last session.**

### Status: build complete, demo not yet recorded

All six stages of `build-plan.md` are done and verified. The full pipeline runs end to end on
real services. What remains is recording the demo and two small pieces of housekeeping, both
listed under "Open items" below.

### What exists

| Workflow | Nodes | Status |
|---|---|---|
| WF1 `leasing-front` | 28 | Working. Lead intake, grounded FAQ, pre-qualification, tour booking, application handoff |
| WF2 `application-and-verify` | 18 | Working. Form intake, paystub extraction, Plaid income verification, mocked bureau, criteria engine, Telegram card |
| WF3 `telegram-router` | 10 | Working. The only Telegram Trigger. Decisions with a two-layer double-tap guard |
| WF4 `lease-and-signature` | 15 | Working. Lease generation, DocuSign envelope, signature return, unit status, welcome packet |

Five Postgres tables (`units`, `leads`, `applications`, `message_log`, `criteria_config`).
Airtable mirrors the lead pipeline for the demo board. Zero npm dependencies anywhere.

38 unit tests (`test-leasing-lib.js`, `test-screening-lib.js`) plus stage gates
(`verify-stage-1.js`, `verify-stage-2.js`, `verify-stage-3.js`, `verify-credentials.js`).
All passing as of this entry.

### Proven end to end, on real services

- Listing-site lead email → grounded AI reply (every figure traced to the unit record)
- Prospect reply → pre-qualification extracted, evaluated, evidence trail stored
- Cal.com booking → entry code (MOCK) → confirmation
- Tour completed → application link
- Application + pay stub → extraction → **real Plaid Sandbox call** → mocked bureau →
  deterministic criteria engine → Telegram card
- Approve tap → decision recorded → DocuSign envelope → signed → unit leased → welcome packet
  (welcome went out 23 seconds after signature)
- Devon's fraud path: 56% income mismatch → `does_not_meet` → stopped for human, nothing sent

### Restarting the environment

Nothing is running — Docker and the tunnel were stopped at the end of the last session.

```bash
docker compose up -d
node scripts/start-tunnel.js          # NEW hostname every run
node scripts/import-workflows.js      # must follow the tunnel
docker compose restart n8n
node scripts/register-calcom-webhook.js
node scripts/verify-stage-1.js --telegram
```

The order matters. The tunnel hostname changes on every run, so the workflow import and the
Cal.com webhook registration must both come after it. A Cal.com webhook pointing at a dead
tunnel fails silently.

### Running a demo

```bash
node scripts/reset-demo.js --with-airtable
node scripts/send-as-prospect.js lead
node scripts/send-as-prospect.js reply "Re: 412 Maple Street, Apt 2B, Springfield [R-xxxx]" "..."
node scripts/submit-application.js maya          # or devon for the fraud path
node scripts/simulate-telegram-tap.js approve A-xxxx
```

`docs/recording-checklist.md` has the full sequence with narration.

### Open items

1. **Swap `PROSPECT_GMAIL_ADDRESS` to an empty Gmail.** The current one
   (`worksambhav26@gmail.com`) holds 10,000+ real messages and will be on camera. One `.env`
   line, no code change.
2. **Rename the Cal.com event type** from "30 min meeting" to "Unit Tour" — the renter sees
   that title on the booking page. If the slug changes, update `CALCOM_BOOKING_URL` in `.env`.
3. **Delete Airtable's default `Table 1`** by hand. The Meta API creates tables but cannot
   delete them.
4. **Record the demo.**

### Deliberately not built

- **Web chat entry point.** Dropped in Stage 3 under the depth-discipline rule; the email
  path tells the same story and connects to the rest of the funnel.
- **Stripe application fee and deposit.** Cut at Stage 0 — proves little beyond "a test card
  charged".
- Multi-applicant households, co-signers, document chase loops, and everything else in the
  "What We Are Not Testing" list in `build-plan.md`.

Do not add any of these without recording a plan revision here first.

### Where the documentation lives

| File | For |
|---|---|
| `the-full-flow.md` | The end-to-end journey, non-technical, with components named. Hand this to a prospect |
| `what-we-are-building.md` | Plain-language project overview |
| `05-automated-leasing-tenant-screening.md` | Problem statement, every claim cited |
| `foundation-5-leasing-screening.md` | Domain background and the legal constraints that shaped the build |
| `docs/recording-checklist.md` | How to run the demo on camera |
| `docs/architecture.excalidraw` | The diagram, with production swaps beneath each stage |
| `docs/stage-1-setup.md` + `docs/account-setup-walkthrough.md` | Account setup, already done |
| `docs/feasibility-spike.md` | What is free, what is gated, and why |
| `my_builds/05-leasing-tenant-screening/` | The two portfolio write-ups |

`CLAUDE.md` carries every n8n gotcha found during this build. Read it before touching a
workflow — most of them cost an hour each to find and every one fails silently.

---

## 2026-09-12 — Revision: The Front Of Funnel Moves To A Listing Site + Telegram

Scope revision, agreed before any code was written. Stages 1-6 are unchanged and still pass;
this replaces how a lead arrives and how the prospect conversation happens.

### Why

Two problems with the email front of funnel, both about the demo rather than the code:

1. **The lead had nowhere to come from on camera.** "A lead email arrives" needed a script to
   stand in for a listing site. There was no listing to point at, so the story started mid-air.
2. **Email is a poor conversation surface.** One inbound, one outbound, and the IMAP trigger
   polls, so every turn cost up to a minute of dead air. The back-and-forth — three questions
   across four messages — is where a leasing assistant earns its keep, and email cannot show it.

### What changes

A renter browses a dummy listing site, submits the contact form on a unit, and is handed to the
leasing assistant **on Telegram**, where the rest of the conversation happens: questions
answered, pre-qualification gathered across turns, tour booked, application link delivered.

Everything downstream is unchanged in substance: Cal.com, the Form Trigger application, Plaid,
the mocked bureau, the criteria engine, the manager's decision card, DocuSign.

### Four decisions taken up front

| Decision | Choice |
|---|---|
| Listing photos | Generated SVG placeholders now; real photos drop into `site-assets/` by filename with no code change |
| The Zillow/IMAP email path | **Kept** as a proven second entry point. It works, it costs nothing to keep, and syndication leads really do arrive as email |
| The rental application form | **Kept** as the n8n Form Trigger, with `customCss` so it matches the site the prospect just left |
| Telegram bots | **Two.** One webhook per bot, and both WF1 and WF3 need a trigger |

### The compliance pivot, and it is an improvement

The old email path had the model compose the whole pre-qualification ask. The new one does not:

- `prequalGate()` decides the outcome; a fixed `COLLECT_ORDER` decides what is still outstanding.
- The next question is a **fixed string** from a static `QUESTION_PROMPTS` map in a Code node.
- The prompt tells the model explicitly: *never ask the next pre-qualification question yourself.*
- Identity is resolved in SQL — the `/start R-xxxx` deep-link payload first, then `chat_id`.

So the model answers what was asked and extracts what was stated, and nothing else. The gate
drives the conversation. That is a stronger version of the same claim the build already makes.

`prequalGate()` itself is untouched, deliberately. It only ever reports `move_in_date` and
`stated_monthly_income` as missing, because only those two gate anything — pets, vehicles and
occupants are collected for the file and never used to triage. Widening the gate to cover them
would have made every entry in `prequal_reasons` look like a criterion that mattered. The ask
order lives in WF1 instead.

### The mock boundary moves one line

The Zillow listing-syndication feed was a labelled mock. It is now **our own listing site**, so
that box turns green: it is a real site, really generating leads, with a real form post. The
production swap underneath it is the syndication API, not the site.

### Highest-consequence change: two bots

`import-workflows.js` mapped credential **type -> id**. Two `telegramApi` credentials collide
there, last wins, and both placeholders end up on one bot — at which point activating WF1
silently re-registers the manager bot's webhook onto WF1 and every approval button stops working
with no error anywhere.

Fixed by resolving Telegram credentials by **name**, with no fallback to the type map, plus:

- `scripts/lib/credential-names.js` — the names in one place, since three files must agree
- `verify-credentials.js` now calls `getMe` on both tokens and **fails if the bot ids match**

### Built so far

- `db/schema.sql` — `leads.telegram_chat_id` (+ a deliberately non-unique index),
  `telegram_username`, `last_prospect_message_at`, `source` gains `listing_site`,
  `message_log.channel` gains `web_form`, `units` gains `title`/`description`/`photos`.
  `conversation_state` is now written on every turn instead of sitting unused.
- `scripts/build-listing-site.js` + `scripts/serve-listing-site.js` + `site-assets/` — the site,
  generated from Postgres, served zero-dependency on `:8080`.
- WF1 rebuilt: 69 nodes across five clearly separated bands — listing inquiry, Telegram
  conversation, Cal.com, tour completed, and the retained email path.
- `scripts/lib/telegram-secret.js` — derives the trigger secret per workflow AND per node, now
  that there are two triggers with two different secrets.
- `scripts/simulate-prospect-message.js`, `scripts/verify-stage-7.js`.
- Form Trigger branding; `respondHtmlNode` and a `telegramTriggerNode` factory in `wf-common.js`.

Stage 2 gate re-run and passing against the new schema. All 38 unit tests passing.

### Deviations from the written plan

- **Placeholder photos are generated by the site builder**, not a separate
  `generate-placeholder-photos.js`. One command instead of two, and the builder already knows
  which keys need an image.
- **The site is tunnel-independent.** The plan assumed the contact form would post to the tunnel
  and the site would need rebuilding after every tunnel restart. It posts to `localhost:5678`
  instead, as a native form POST, so it does not. One less ordering trap.
- **WF1 is 69 nodes, not the ~48 estimated.** Acceptable: it is generated, the bands are
  separated on the canvas, and the editor stays closed on camera. Revisit only if it stops being
  legible.
- **Prospect-facing Telegram sends now fail visibly** (`failOnError`), while manager alerts keep
  swallowing errors. A swallowed failure on a prospect send would be logged by the next node as
  a message that went out — a `message_log` row that is simply untrue.

### Open, and blocking the live test

1. **Create the second Telegram bot** in `@BotFather` and set `TELEGRAM_PROSPECT_BOT_TOKEN` and
   `TELEGRAM_PROSPECT_BOT_USERNAME`. `import-workflows.js` refuses to import WF1 without them,
   which is the guard working.
2. Message the prospect bot once and capture its chat id for `verify-stage-7.js --chat`.
3. Real photos into `site-assets/`.
4. Not yet done, deliberately: `the-full-flow.md` and `docs/recording-checklist.md` still
   describe the email journey. They get rewritten **after** the live run, so the quotes and
   timings in them are real — that file's own premise is that every timing came from a real run.

---

## 2026-09-12 — Stage 7 Gate: PASS, And Three Failures Found By Running It

The listing site and the Telegram conversation run end to end on real services.
`node scripts/verify-stage-7.js --chat <id>` passes all 23 checks.

### Proven in one live run

listing site -> contact form -> lead row + HTML handoff page -> Telegram deep link ->
/start binds the chat -> grounded answer to the question typed on the site ->
pre-qualification gathered across turns -> tour booked with entry code (MOCK) ->
application link -> application + pay stub -> **real Plaid Sandbox call** -> mocked bureau ->
criteria engine -> decision card on the manager bot -> Approve -> DocuSign envelope sent.

```
lead  R-9949  listing_site  prequalified   move_in 2026-10-01, $5000/mo, small dog, 1 car, 1 adult
app   A-4216  claimed 5000.00 | extracted 4996.33 | verified 4996.33 | 712 | meets_criteria
      decision=approved by=@demo_manager  lease=sent  envelope=3d8220e9-e2c6-86ce-803d-2c04ec9c0c18
```

Both Telegram bots hold their own webhook, which is the whole point of the two-bot design:

```
manager   /webhook/leasing-telegram-router/webhook
prospect  /webhook/leasing-prospect-bot/webhook
```

### Three failures, none of which any static check would have caught

**1. Telegram rejects any message containing an underscore.**

The application link carries `?ref_token=`, and the send failed with
`Bad request - please check your parameters`. The real error was four layers down in the
execution record: `can't parse entities: Can't find end of the entity starting at byte
offset 208` - byte 208 being the `_` in `ref_token`.

**The Telegram node always sends a `parse_mode`**, so text is parsed for entities whether you
asked for it or not, and under the legacy Markdown default a lone underscore opens an italic
run that never closes. The tour confirmation worked only because it happens to contain no URL.

Fixed by pinning `parse_mode` to HTML, adding `escapeTelegramHtml()` to `leasing-lib.js`, and
moving message composition out of the Telegram node's own parameter into the Code node that
already runs before it - a parameter cannot be escaped, a Code node can. The guardrail and
`message_log` still see the real text; only the copy handed to Telegram is escaped.

**2. The guardrail blocked the assistant from repeating the prospect's own income.**

The prospect says "about $5,000 a month"; the assistant replies "got it, $5,000 a month" and
the Tier A unsupported-figure rule blocks it, because $5,000 is not a unit fact. Nothing is
sent, the prospect gets silence, and the conversation stalls on the most ordinary turn there
is. In the old email flow this never surfaced: the system replied with a fixed tour link and
never echoed anything.

The rule exists to stop the model inventing a rent or a fee, not to stop it confirming what
someone just told it. `buildConversationKnowledge(unit, answers)` now adds the recorded slot
values to the allowlist and nothing else, so an invented figure is still caught. Three unit
tests cover it, including one asserting a made-up rent is still blocked.

**3. The Airtable mirror created a row per turn instead of upserting.**

`airtableMirrorNode` POSTed, which always creates. With the old single mirror write per lead
that was invisible; a chat has many turns, and `R-1000` ended up on the board five times.

Now `PATCH` with `performUpsert.fieldsToMergeOn: ['Ref Token']` - one call, no read-back, so
Postgres stays the only thing ever read - and the write is gated on an actual status
transition, which is what "mirror at phase boundaries only" was supposed to mean. Verified:
one row, upserted New -> Prequalified, email preserved from the first write.

### A note on how the first one was found

n8n reported only `Bad request - please check your parameters`. The REST API needs auth and
there is no sqlite CLI in the container, but **Node's built-in `node:sqlite` is there**:

```bash
docker compose exec -T n8n sh -lc 'node -e "
const {DatabaseSync}=require(\"node:sqlite\");
const db=new DatabaseSync(\"/home/node/.n8n/database.sqlite\",{readOnly:true});
console.log(db.prepare(\"SELECT id,status FROM execution_entity ORDER BY id DESC LIMIT 5\").all());
"'
```

`execution_data` for that id carries the real provider error. This is now in CLAUDE.md and is
worth reaching for immediately whenever a node reports something generic.

### Also changed

- Prospect-facing Telegram sends use `failOnError`, so a failed send is never followed by a
  `message_log` row claiming the message went out. Manager alerts still swallow errors.
- `get-telegram-chat-id.js --prospect` writes `TELEGRAM_PROSPECT_CHAT_ID`. It initially wrote
  the manager variable - a string replacement that silently did not match, shipped because
  that one edit was not asserted. A private chat id is the user's own Telegram user id, so
  both variables legitimately hold the same number.

### Still open

1. Real photos into `site-assets/` (placeholders render fine meanwhile).
2. Sign the DocuSign envelope by hand to close the loop on this run, as in the earlier build.
3. `the-full-flow.md` and `docs/recording-checklist.md` still describe the email journey.
   Rewriting next, now that there are real quotes and timings to use.

---

## 2026-09-13 — Full Pipeline Closed On The New Front Of Funnel

The lease was signed and the final path completed on its own. Every stage of the rebuilt
pipeline is now proven end to end in this build, not carried over from the previous one.

```
lead R-1574   listing_site   prequalified -> tour_booked -> toured
app  A-8745   claimed 5000.00 | extracted 4996.33 | verified 4996.33 | credit 712
              meets_criteria -> approved -> lease sent
              envelope 057c2a1f-6fd1-8ced-81fc-48ad9b9b0cbd
              status=lease_signed  lease=signed  signed_at=2026-09-12 18:40:08

MAPLE-2B -> leased
MAPLE-5A -> available
```

The signature callback ran clean, and the guard added earlier took the correct branch:

```
18:40:07.966 -> 18:40:12.627   wf4-lease-and-signature   success

RAN  Signature Returned (DocuSign) -> Parse Connect Event -> Envelope Completed?
     -> Mark Lease Signed -> Application Found For Envelope?
     -> Signature Matches An Application? -> Mark Unit Leased
     -> Send Welcome Packet -> Notify Manager: Lease Signed
not run  Alert Manager: Unknown Envelope
```

**4.7 seconds** from DocuSign's completion callback to the welcome packet going out and the
unit flipping to leased.

### The whole journey, on real services

listing site -> contact form -> lead + HTML handoff page -> Telegram deep link -> /start binds
the chat -> grounded answer to the question typed on the site -> pre-qualification gathered
across turns -> Cal.com tour with a one-time entry code (MOCK) -> application link ->
application with a pay stub -> paystub extraction -> **real Plaid Sandbox income verification**
-> mocked bureau in ShareAble shape -> deterministic criteria engine -> decision card on the
**manager** bot -> Approve -> DocuSign envelope -> signed -> unit leased -> welcome packet.

### How the signature path came to be unverified in the first place

Worth recording because it was a process failure rather than a code one. The first signed
lease was approved, then the database was reset **underneath it** by running the Stage 7 gate
(which reseeds) and then `reset-demo`. The callback arrived against an application row that no
longer existed, so `Mark Lease Signed` matched nothing and the run died three nodes later at
`Send Welcome Packet` with `No recipients defined` - an error that says nothing at all about
the actual problem.

Two things came out of it:

- **A guard.** `Application Found For Envelope?` plus `Signature Matches An Application?` now
  stop the branch and alert the manager when a completion callback has no application behind
  it. This is the "messy rows are flagged for a human, never silently dropped" invariant
  applied to a path that did not have it.
- **A sequencing rule for demos:** never reset between an approval and a signature. The
  envelope outlives the database; DocuSign has no idea the demo was reseeded.

### Documentation rewritten

Held back deliberately until the new path had actually run, so the quotes are real output:

- `the-full-flow.md` - rewritten around the listing site and the Telegram conversation. The
  strongest new beat is one the email flow could not produce: the assistant does not ask for
  the move-in date, because the prospect already said "early October" on the listing page.
  Also adds the sharper version of the headline claim - the AI does not decide *what to ask
  next* either; the gate picks the slot and the wording is fixed text.
- `docs/recording-checklist.md` - new window layout (listing site, renter's chat, manager's
  chat, Airtable), beats 1-4 rebuilt, and a troubleshooting row for the failure that would be
  hardest to diagnose live: if both bot tokens are the same bot the approve button silently
  stops working.
- `docs/listing-site.md` - new. Photo drop-in, why the contact form must stay a plain HTML
  form and not `fetch()`, and what production replaces.

### Open

1. Real photos into `site-assets/` (placeholders render fine meanwhile).
2. `docs/architecture.excalidraw` still shows the email front of funnel - regenerate before
   recording.
3. Record the demo.

---

## 2026-09-13 — Assistant Hardened, And Telegram Taken Off The Listing Page

Two corrections on instruction, plus one accuracy fix in the prospect-facing documentation.

### 1. The listing site no longer mentions Telegram

A real rental listing does not advertise the operator's internal tooling, and naming a chat app
on the page made the site read as a demo *of that app*. The button is now "Send message" and
the note under it says an answer comes straight back. Zero occurrences of "Telegram" on any
listing page. The handoff is introduced on the confirmation page instead, where it has to be -
with a single small "Opens in Telegram" line so tapping the button is not a surprise.

### 2. The assistant now survives whatever a tenant sends it

The conversation logic was correct but brittle: several ordinary inputs ended with the prospect
getting **nothing at all**, which is the worst failure a chat product has.

**The fair-housing refusal was the sharpest case.** Asked "is this a good area for families?",
the model correctly refuses - and its refusal naturally repeats the word, which trips the
guardrail's own familial-status pattern. The message was blocked and the prospect was left in
silence. The most awkward question a tenant can ask was the one that made the bot go dead.

Fixed in two places:

- The prompt now tells the model to refuse **without naming the subject of the question**, and
  says why: repeating it trips the outbound check and the prospect hears nothing. Verified
  live - the refusal now sends: *"That is not something I can advise on, but I can share
  property details: two bedrooms, one bathroom, 880 square feet..."*
- **Nothing can now end in silence.** A blocked message, a malformed model payload and an
  unsupported message type all send a fixed fallback ("let me get a colleague to pick this up")
  and alert the manager. The fallback carries no figure, no commitment and no protected-class
  content, so it is safe by construction and needs no guardrail pass of its own.

Also added:

- **Non-text messages answered without a model call.** Stickers, photos, voice notes,
  locations, contacts and polls arrive with no `text`; an empty message would produce nonsense
  or nothing. Detected in the first Code node and answered deterministically. Verified live
  with a sticker and a voice note.
- **A malformed model payload keeps its throw** - a schema violation must fail visibly - but
  the Code node now uses `onError: "continueErrorOutput"`, so the error branch tells the
  prospect a human is coming and tells the manager what broke. Visible failure and a reply are
  not in tension; the old design just conflated them.
- **Inbound text capped at 1500 characters**, because a long message is almost always a paste.
- Prompt guidance for greetings, one-word replies, typos, nonsense, frustration, and questions
  about facts that were never supplied. Never claim to be an AI; never return an empty reply.

Verified live, all on a real chat: a fair-housing question, a sticker, a voice note, pure
nonsense (`asdkjh qwe lol`), and a question about facilities that do not exist. Every one got a
sensible reply and the conversation carried on. Sample:

```
"asdkjh qwe lol"       -> I'm not sure what you mean, but I'm happy to help with the
                          apartment. Could you rephrase your question?
"gym and rooftop pool?" -> I don't have information on a gym or rooftop pool for this
                          property. I'll check with the team and have someone follow up...
```

Stage 7 gate still PASS, 41 unit tests still pass. WF1 is now 74 nodes.

### 3. The Plaid claim in the flow document was overstated

`the-full-flow.md` said *"She connects her bank, and the system reads her actual payroll
deposits."* Neither half is true of the demo, and it is exactly the sort of claim that gets
caught in a prospect meeting.

What actually runs is three server-to-server Sandbox calls with **no user involvement at all**:
`/user/create`, `/sandbox/public_token/create`, `/credit/payroll_income/get`. That middle call
is a Sandbox-only shortcut that fabricates a connected account; in production it is **Plaid
Link**, the screen where the renter picks their bank and logs in. There is no Link anywhere in
this build. And Sandbox returns the same canned figure for every applicant, which is precisely
why Maya and Devon are separated by rent rather than income.

The document now says plainly: the integration is real, the data is not. Real API, real
credentials, real response shape, real parsing and comparison - against test data, with no
bank-login step. Switching it on is adding the Link screen and changing one URL.

### Known gap, carried forward

`message_log` does not record the tour confirmation, the application link, or the two new
fallback replies. They are delivered - execution records confirm it - but the log understates
what the renter actually received. This predates Stage 7 (the tour and application messages
were never logged either) and is worth closing before the board is used as evidence of "every
message in and out".
