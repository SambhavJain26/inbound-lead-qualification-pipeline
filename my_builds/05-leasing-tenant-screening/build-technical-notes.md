# Build Technical Notes — Leasing And Tenant Screening

Last updated: 2026-09-17

Technical companion to [how-the-system-works.md](how-the-system-works.md). That document
explains the behavior to a property manager. This one records the implementation, the
boundaries, the failures that shaped it and the evidence behind the public claims.

There is no client and no production deployment. Every person, property, application,
document and screening result in the repository is synthetic. A verified result means the
local demo behaved as intended against test data. It does not mean the system has handled a
real rental application or passed a legal, security or production-readiness review.

## Measured Build Snapshot

The committed workflow exports currently contain **five workflows and 196 nodes**. The count
comes from parsing `n8n-workflows/*.json`, not from an earlier planning estimate.

| Workflow | Nodes | Responsibility |
|---|---:|---|
| WF1 `leasing-front` | 102 | Listing inquiry, renter Telegram conversation, retained email intake, public Cal.com webhook, tour-completed event and lead-pipeline mirroring |
| WF2 `application-and-verify` | 24 | Seven-section form, paystub extraction, Plaid Sandbox Payroll Income, mock screening checks, fixed criteria and manager review card |
| WF3 `telegram-router` | 16 | The manager bot's single callback entry, tour exceptions, application decisions, duplicate guards and decision mirroring |
| WF4 `lease-and-signature` | 25 | Fixed lease template, DocuSign envelope, Connect callback, signed state, welcome email and lease milestone mirroring |
| WF5 `tour-booking` | 29 | Cal.com slot lookup, property-local time handling, tour-policy exceptions, booking, renter confirmation and booking mirroring |

The schema has **six Postgres tables**:

- `criteria_config`;
- `tour_policy`;
- `units`;
- `leads`;
- `applications`;
- `message_log`.

Four current test files produce **69 passing checks**:

| Test file | Passing checks |
|---|---:|
| `scripts/test-leasing-lib.js` | 32 |
| `scripts/test-screening-lib.js` | 19 |
| `scripts/test-application-form.js` | 8 |
| `scripts/test-pipeline-mirror.js` | 10 |

Those checks cover shared logic, not the entire behavior of five cloud services. Stage gates
and hand-run evidence supply the integration proof described later.

The project has no npm dependencies. Builder, setup, verification, mail and server helpers
use Node's standard library.

## The Stack And Why Each Part Exists

| Layer | Choice | Reason |
|---|---|---|
| Orchestration | Self-hosted n8n in Docker | The workflows are inspectable exports, run locally and keep the operator in control of every consequential demo step |
| Authoritative state | Postgres 16 | Record matching, unique references, guarded decisions and evidence need database constraints and queries; Airtable is not trusted with those guarantees |
| Pipeline display | Airtable | It gives the demo a readable lead view while remaining disposable and non-blocking |
| Listing surface | Generated static HTML plus a zero-dependency Node server | The listing and the conversation read the same `units` rows, so public facts and permitted answers do not drift |
| Renter channel | Dedicated Telegram prospect bot | Fast conversational demo surface; explicitly a stand-in for a production-approved messaging route |
| Manager channel | Separate Telegram manager bot | Inline buttons provide a compact action surface and keep the renter and manager conversations isolated |
| Tour calendar | Cal.com cloud | Supplies actual slots and accepts real test bookings; public callbacks require HTTPS |
| Model work | OpenAI nodes with strict JSON Schema output | Used for bounded interpretation, extraction and wording; never for identity or rental decisions |
| Income evidence | Plaid Payroll Income Sandbox | Exercises the provider API and response parsing on canned data without a real applicant connection |
| Signature | DocuSign developer sandbox | Exercises envelope creation, signing and completion callbacks on a recognizable test service |
| Email | SMTP outbound and IMAP inbound | Sends lease/welcome mail and retains an email lead path without a Gmail OAuth project |
| Local exposure | Temporary Cloudflare quick tunnel | Gives Telegram, Cal.com and DocuSign a public HTTPS callback during local testing |

OpenAI is the only paid dependency in the local demo. That is a demo budget statement, not a
production-cost claim. A real deployment would add hosting, support and contracted provider,
screening, messaging and signature costs.

## Why The Workflows Have This Shape

### Two Telegram bots are required

Telegram permits one webhook per bot token. WF1 needs a webhook for renter messages and WF3
needs one for manager buttons. Sharing a token would let the last activated workflow silently
replace the first webhook.

Both credentials use the same n8n credential type, so resolving credentials by type is also
unsafe: the last match wins. The import path resolves the two Telegram credentials by their
configured names and refuses to fall back to a type-only match. Credential verification calls
`getMe` on both tokens and fails if the bot ids are equal.

### Tour booking became its own workflow

The renter asks for an appointment in plain language. WF5 reads real Cal.com slots, converts
the request from property-local time, selects a genuine slot and checks the configured tour
policy.

Routine appointments book immediately. Requests outside the published hours or minimum
notice window are held for the manager. A held request does not occupy the calendar. WF3
routes the manager's approval or decline back to WF5.

This responsibility moved out of WF1 because scheduling has its own API versions, time-zone
rules, exception state and manager action path. Keeping it separate makes the authority
boundary easier to audit.

### The listing site is not tunnelled

The generated site runs on `localhost:8080`. Its contact form uses a native HTML POST to the
local n8n webhook. A browser navigation can render the returned HTML without the CORS and
preflight problems introduced by `fetch()`.

The Cloudflare tunnel stays dedicated to n8n callbacks. Restarting the tunnel therefore does
not require rebuilding the listing pages.

### Postgres remains authoritative

Every lead, application, manager decision, envelope and message reference lives in Postgres.
Airtable receives selected projections at business phase boundaries. No workflow reads a
decision, income value or next action back from Airtable.

This is why the pipeline continues when Airtable is unavailable or its free allocation is
exhausted. The mirror can become stale. It cannot change the outcome.

## The Single Path From Review To A Lease

The consequential action in this build is sending a lease envelope. It is reachable only
after a manager callback and two state guards.

The path is:

```text
WF3 Manager Actions (Telegram)
  → Parse Manager Action
  → Load Application For Decision
  → Already Decided?
  → Record Decision
       WHERE decision IS NULL
  → Send Lease Now?
  → Start Lease Workflow
  → WF4 Load Application For Lease
       requires the recorded decision and envelope_id IS NULL
  → Build Fixed Lease Document
  → Create Lease Envelope
  → Record Envelope Sent
```

No schedule, applicant message, AI response or criteria result can enter WF4's envelope path
without the recorded manager action. The `does_not_meet` branch in WF2 never sends the
button-bearing decision card; it posts a stop-for-human notice instead.

The duplicate protection is deliberate:

- WF3 records a decision only while `decision IS NULL`.
- WF4 loads a sendable application only while `envelope_id IS NULL`.

A repeated or stale button therefore cannot create a second envelope for the same
application.

## Where AI Is Used

Four OpenAI nodes exist across the workflow exports.

| AI task | Input boundary | Output boundary |
|---|---|---|
| Renter conversation | Current renter message, recent conversation, approved unit facts and fixed collection state | Factual response, extracted stated fields and intent; fixed code chooses the next question and next action |
| Retained email lead reply | Inquiry plus approved unit facts | Grounded draft checked by Tier A controls before SMTP |
| Retained email pre-qualification | Reply plus fixed extraction schema | Stated fields only; fixed gate evaluates them |
| Paystub extraction | Text from the synthetic PDF | Requested fields and source evidence; no criteria or decision |

Strict schemas are load-bearing. Every property in an OpenAI strict schema must also appear
in `required`. The generated workflow code handles both direct and wrapped n8n response
shapes through one shared `unwrapAiPayload()` helper.

An empty or malformed model result throws. It does not become an empty outgoing message or
missing evidence that quietly passes a later check.

## Where AI Is Not Used

Fixed code or SQL owns:

- reference and chat identity matching;
- replay detection;
- the pre-qualification gate;
- the order and exact wording of collection questions;
- grounded-number controls;
- property-local time conversion;
- Cal.com slot matching;
- tour-policy classification;
- application normalization and consent validation;
- the three-source income comparison;
- every screening criterion;
- the manager decision record;
- lease variables and clauses;
- envelope/application matching;
- pipeline projections and upserts.

The criteria output schema has no place for a recommendation, applicant rank or AI risk
label. The shared screening tests serialize engine output and reject decision-like language.

## The Application And Evidence Path

The n8n Form Trigger renders a seven-section application from the shared definition in
`scripts/lib/application-form.js`. The same definition drives label normalization and the
fixture submitter, so display order and submitted field indices stay aligned.

The form requests a four-digit demo identity code. It does not request a full SSN or date of
birth. The normalization code still writes the value into the existing `ssn_last4` column,
but no raw full identifier exists to discard in the current user experience.

The uploaded file is keyed by its `field-N` name on arrival. It must be re-keyed before the
extract node, and extraction must happen before a Postgres node because Postgres nodes drop
binary data.

WF2 then performs:

```text
normalize form
  → load unit and criteria
  → create application record
  → extract paystub text
  → OpenAI field extraction
  → Plaid Sandbox user/item/payroll calls
  → compare claimed/document/Plaid values
  → attach mock bureau and identity fixtures
  → run fixed criteria
  → save evidence
  → manager card OR stopped-for-human notice
```

## What The Plaid Integration Really Proves

The demo makes three server-to-server Sandbox calls:

```text
POST /user/create
POST /sandbox/public_token/create
POST /credit/payroll_income/get
```

The Sandbox public-token call creates a fabricated test connection. The renter doesn't see
Plaid Link and doesn't connect a bank or payroll account. Plaid returns a canned payroll
record with gross earnings of $2,306 biweekly, which the shared parser converts to
$4,996.33 per month.

The integration proves:

- credentialed API access;
- provider user and test-item creation;
- retrieval of a real Payroll Income response shape;
- deterministic normalization;
- three-source comparison;
- storage and presentation to a manager.

It does not prove a real person's income or production eligibility for a Plaid product. The
current manager card still uses the display label `Bank verified` for this value. The public
narration and these documents use the more accurate phrase **Plaid Sandbox Payroll Income**.
That UI label should be corrected before presenting the card as a production design.

## Criteria And The Stop Path

`scripts/lib/screening-lib.js` owns the criteria engine. It reads thresholds from
`criteria_config`, not from a prompt. The engine records evidence for income multiple,
document comparison, credit, eviction and identity.

The latter three inputs are mock fixtures. Their thresholds exercise routing; they do not
represent a real consumer report or identity result.

Maya's synthetic values produce `meets_criteria`. Devon's produce `does_not_meet` because the
higher-rent fixture yields a 2.56x verified-income ratio and a 56.1% document variance.

The Devon result is not a fraud verdict. The workflow records `stopped_for_human`, sends no
applicant message, creates no envelope and leaves the unit available. It also does not draft
or send an adverse-action notice. Real report disputes, decisions and notices belong to an
authorized company process outside this demo.

## Prospect Messaging Controls

Tier A messages may send automatically only after fixed checks. The conversation's allowed
figures include approved unit facts and values the renter already stated. That lets the
assistant confirm “$5,000 a month” without permitting it to invent a rent or fee.

The Telegram node uses HTML parse mode. Message composition happens in Code nodes, where
`&`, `<` and `>` are escaped before delivery. This avoids the legacy Markdown failure in
which the underscore in `?ref_token=` made Telegram reject the whole message.

No conversational failure ends in silence:

- unsupported media receives a fixed text-only reply;
- a blocked answer receives a safe human-handoff message;
- malformed AI output sends the same safe fallback and alerts the manager;
- unknown property facts are acknowledged as unknown.

Fair-housing refusals avoid repeating the protected subject in the outbound wording, because
the guard checks the final text as well as the user's intent.

Post-screening applicant communication is not sent by an AI decision path. The demonstrated
approval goes to the fixed lease flow after a manager action; the stopped path sends the
applicant nothing.

## Airtable Mirroring

The mirror uses `PATCH` with `performUpsert.fieldsToMergeOn = ['Ref Token']`. A plain POST
created one row per conversation turn in an earlier version.

Current mirror points include:

- new lead;
- pre-qualification;
- tour booked;
- tour completed;
- application received;
- manager decision or review stop;
- lease sent;
- lease signed.

Writes are fire-and-forget. The same shared projection supplies live workflow nodes,
`scripts/sync-airtable.js` and the verification probe. The projection selects the latest
application for a lead and includes the application reference, next action, lease status,
last-sync time and synthetic-demo marker.

The existing Grid is the only required view. The user explicitly skipped optional Pipeline,
Needs Attention and Leased views.

## Constraints That Changed The Design

### Telegram

- One webhook per bot forced two bots and credential-by-name resolution.
- `callback_data` is limited to 64 bytes, so buttons carry short actions and references.
- A keyboard is baked into the original message; redeploying does not update an old card.
- The node always parses message entities, which forced HTML mode and escaping.
- Trigger webhooks validate a derived secret header; scripted test updates must reproduce it.

### Cal.com

- Cloud webhooks require public HTTPS.
- Slot and booking endpoints require different API-version headers.
- A zone-less model datetime means property-local time, not container UTC.
- API-created booking webhooks omit the metadata used to identify the lead, so WF5 records
  and confirms its own bookings while the public-page callback retains its separate path.
- Fixture domains such as `example.com` are rejected for attendees.

### n8n and Postgres

- Postgres query arrays drop `undefined`, so every nullable parameter is normalized.
- `NULLIF($n,'')` can still fail when Postgres infers an integer; `NULLIF($n::text,'')` pins
  the type first.
- After an HTTP node, `$json` is the provider response, not the prior business context.
- Form Trigger fields arrive as `field-0`, `field-1` and so on in declaration order.
- Postgres nodes remove binary data from the item.
- Every generated `$('Node Name')` reference is validated before an export is written.

### DocuSign

- Per-envelope Connect configuration removes a manual admin-console dependency.
- `eventNotification.events` requires both `deliveryMode: 'SIM'` and
  `eventData: { version: 'restv2.1' }`.
- The lease is HTML converted by DocuSign, with signature/date anchors in the fixed template.
- A callback is answered immediately; no execution waits on a person signing.

### Local operation

- Every Cloudflare quick tunnel has a new hostname.
- n8n reads `WEBHOOK_URL` at container start, so tunnel changes require container recreation
  and workflow re-import.
- Cal.com registration must also be updated after a tunnel change.
- Resetting Postgres between envelope send and signature destroys the application the callback
  needs. External envelopes outlive local demo state.

## Defects That Shaped The Final Build

### 1. Both Telegram workflows pointed at one bot

**Cause:** the importer resolved credentials by credential type, and both bot credentials use
`telegramApi`.

**Fix:** resolve each bot by its configured credential name and verify that their bot ids
differ.

**Lesson:** a one-to-one type map is invalid when the system intentionally has two accounts of
the same provider type.

### 2. The application URL broke Telegram delivery

**Cause:** the default Markdown parser treated the underscore in `ref_token` as an unfinished
formatting marker.

**Fix:** HTML parse mode, escaped composition in Code nodes and visible send failures.

**Lesson:** a generic provider error often hides a precise parsing failure in the execution
record.

### 3. The guard blocked Maya's own income

**Cause:** the figure allowlist contained unit facts but not the values the renter had just
stated.

**Fix:** add only recorded slot values to the conversation knowledge used by the guard.

**Lesson:** a control can block ordinary truthful behavior when its permitted context is too
narrow.

### 4. A correct fair-housing refusal blocked itself

**Cause:** the model repeated the protected subject while refusing to discuss it, so the
outbound text matched the same guard.

**Fix:** refuse without repeating the subject, provide permitted property facts and always
send a fixed handoff if the draft is blocked.

**Lesson:** safe refusal wording must pass the delivery controls, not only the prompt review.

### 5. A 2pm tour became 9:30am

**Cause:** `new Date()` interpreted a zone-less local datetime in the container's time zone.

**Fix:** convert naive property-local time to a UTC instant before comparing with slots, and
verify the booked time back in the property's zone.

**Lesson:** a booking API can succeed while the business action is wrong.

### 6. Cal.com could not return the lead metadata

**Cause:** metadata appeared in the API booking response but not the `BOOKING_CREATED`
webhook payload.

**Fix:** the workflow that creates the booking records and confirms it directly. The public
page webhook uses the token supplied through that separate route.

**Lesson:** provider webhooks are not guaranteed to echo the request that created the event.

### 7. Airtable duplicated every chat turn

**Cause:** each mirror write used POST.

**Fix:** upsert on Ref Token and write only after a business phase changes.

**Lesson:** a display mirror needs identity and transition rules even when it is not the state
store.

### 8. The mirror failed silently from day one

**Cause:** the expected table did not exist, and the Airtable credential stored the token in
`apiKey` instead of the credential type's real `accessToken` field. Mirror errors were
deliberately non-blocking, so neither failure interrupted a lead.

**Fix:** idempotent schema setup, correct credential field, an explicit live write check and
a rebuild command.

**Lesson:** “it never blocked the workflow” says nothing about whether a swallowed side effect
ever worked.

### 9. Form submissions succeeded with empty values

**Cause:** scripted submissions posted human labels rather than Form Trigger `field-N` names.
n8n accepted the request and mapped every missing field to null.

**Fix:** one shared field definition and a submitter that reads the built workflow's order.

**Lesson:** HTTP success is not evidence that the business payload arrived.

### 10. A signed envelope lost its application

**Cause:** the demo database was reset after approval but before the DocuSign callback.

**Fix:** never reset inside an in-flight lease, and route unknown-envelope callbacks to a
manager alert rather than continuing toward the welcome email.

**Lesson:** external actions often outlive local test state.

## Reproducibility And Secrets

Workflow JSON is generated from builder scripts. Shared behavior lives in:

- `scripts/lib/leasing-lib.js`;
- `scripts/lib/screening-lib.js`;
- `scripts/lib/application-form.js`;
- `scripts/lib/pipeline-mirror.js`;
- `scripts/lib/wf-common.js`.

Changing a shared library and hand-editing only the exported workflow would create two sources
of truth. The supported path is to change the library or builder, regenerate and import.

Committed workflow files contain placeholder credentials and identifiers. The importer writes
resolved copies into ignored temporary storage. Tokens, private keys, real email addresses,
chat ids, base ids and tunnel hostnames remain in ignored local configuration or n8n's
credential store.

The listing pages are also generated. `scripts/build-listing-site.js` reads current unit rows
and image names, and `scripts/serve-listing-site.js` serves the output locally.

## What Was Verified

The project has several layers of evidence:

1. **69 current local checks** for leasing logic, screening logic, form definitions and mirror
   mapping.
2. **Stage gates** that exercise credentials, schema, fixture assumptions, grounded messages,
   pre-qualification and tour paths.
3. **A genuine browser-entered Maya run** covering listing inquiry, renter messages and a real
   Cal.com booking.
4. **A live application submission** with the synthetic paystub, OpenAI extraction, real
   Plaid Sandbox Payroll Income calls, fixed criteria and a manager card.
5. **A genuine manager approval tap**, real DocuSign developer-sandbox envelope and browser
   signing flow.
6. **A real DocuSign Connect callback**, signed Postgres state, leased synthetic unit,
   delivered welcome email and visible manager confirmation.
7. **A reverified Devon stop path** showing no applicant message, decision, envelope or unit
   status change.
8. **Live and probe-backed Airtable milestones** confirming one upserted lead row can move
   through the displayed pipeline while Postgres remains authoritative.

This verifies a local synthetic demo. It does not establish accuracy across real applicants,
behavior under portfolio load, uptime, customer value, provider suitability or compliance.

## Known Limits

- Telegram is a messaging stand-in, not production SMS.
- The renter must start the Telegram bot before it can receive the referenced conversation.
- Plaid uses canned Sandbox Payroll Income and has no renter-facing Link flow.
- The current card's `Bank verified` label is less precise than the underlying Payroll Income
  call and should be corrected before using the card as a production example.
- Credit, eviction and identity results are mock fixtures.
- Tour completion is operator-triggered; the lock code is mocked.
- The application supports one applicant and one paystub layout. No co-applicant, guarantor,
  document-chase or dispute workflow is built.
- No live PMS, CRM, screening bureau, identity provider, smart lock, payment system or move-in
  process is connected.
- DocuSign uses one signer in a developer sandbox. Countersignatures, amendments, voids and
  production retention are outside the demo.
- Airtable is a Grid-only display mirror. Optional views were deliberately skipped.
- The local stack depends on Docker, a laptop and a temporary tunnel. It has no uptime,
  monitoring, backup or disaster-recovery commitment.
- The reset clears Postgres and Airtable demo rows, not Gmail, Telegram history, Cal.com
  bookings or DocuSign envelopes.
- The current test mailbox is a real Gmail account that must be cleaned or safely filtered
  before recording so unrelated messages never appear.
- Load, rate-limit, retry, provider-outage, concurrency and recovery behavior are not proven
  beyond the narrow guards described above.

The [production blueprint](production-leasing-tenant-screening-blueprint.md) addresses the
operating design behind those gaps. It is a proposed company implementation, not a claim
that the local demo already contains them.
