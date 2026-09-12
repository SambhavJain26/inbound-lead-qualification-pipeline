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
