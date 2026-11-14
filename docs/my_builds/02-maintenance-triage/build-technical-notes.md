# Build Technical Notes

Companion to [how-the-system-works.md](how-the-system-works.md), which explains the same
system without naming a single tool. This file is for a builder, or an operator who codes.

**Everything here is measured from the committed build**, not remembered. Node counts come
from counting nodes in `workflows/*.json`. Limits come from the code that enforces them.
The audit in "The Single Path To An Irreversible Action" was done by walking the connection
graph, and you can redo it in about a minute.

**There is no client.** Every verification below is a test against synthetic fixtures.

## The Stack

| Layer | Choice | Why not the obvious alternative |
|---|---|---|
| Orchestration | n8n, self-hosted via Docker Compose | Not a hosted automation platform, because the client has to own the whole thing at handover. Not custom code, because the workflow graph is the deliverable a non-developer can be walked through. Note n8n's Sustainable Use Licence: building and selling workflows is explicitly fine, hosting a client's instance for a fee is the grey area, so production runs on hardware the client pays for |
| Authoritative state | PostgreSQL 16 | Not Airtable, despite Airtable being in the build. Airtable is not trusted to enforce unique ticket references, inbound-message idempotency, or one-send-only dispatch. Those three are the guarantees the product rests on, so they live where a unique constraint means something |
| Manager workspace | Airtable | Not a custom board. A custom board existed through Stage 8 and was replaced. A manager can filter, sort, and edit Airtable without being taught anything, and it costs nothing to maintain. It is a mirror, never a source of truth |
| Model calls | OpenAI Responses API via HTTP Request node | Not n8n's built-in OpenAI node: the installed n8n `2.29.10` ships the older hidden implementation, which does not expose the Responses API, strict JSON schema output, or reasoning settings. Not an agent or tool-calling loop either, because this is deterministic classification with a fixed output contract, and a loop makes the output shape harder to pin and costs more tokens |
| Model | `gpt-5.6-luna` | Not `gpt-5-nano`, which was the original choice and is cheaper. Nano showed classification instability on direct-demo messages during Stage 9. The Stage 3 scorecard in `docs/stage-3-scorecard.md` is a nano measurement and is now historical, not a description of current behaviour |
| Manager channel | Telegram | Not SMS. SMS needs brand and campaign registration under one EIN per client, taking weeks, which cannot sit on the critical path of a first sale. Telegram is free, has an inline-keyboard callback model that suits one-tap approval, and the manager is one known person who installs an app once |
| Tenant channel | A second, separate Telegram bot | Not the manager bot. Two identities on one bot cannot be told apart safely. Not SMS, for the same registration reason. This is explicitly an SMS stand-in and the docs say so |
| Mail | Gmail IMAP + SMTP | Not a transactional email API, because intake and outbound share one controlled mailbox in the demo. This choice directly caused a defect (see "The Vendor Email Loop") |

## The Workflows

Twenty workflow files are committed, totalling **243 nodes**. Only six are imported by the
Stage 9 importer, and only five are published.

| Workflow | n8n ID | Nodes | Owns |
|---|---|---|---|
| Maintenance Triage Engine | `maintenance-triage-core-stage-4` | 25 | Normalize, dedupe, classify, safety rules, persist, draft |
| Maintenance Tenant Intake | `mt-tenant-intake-stage-9` | 15 | IMAP and form intake, pairing token, onboarding email |
| Maintenance Tenant Telegram | `mt-tenant-telegram-stage-9` | 40 | Pairing, direct intake, buffering, clarification, status |
| Maintenance Manager Desk | `mt-manager-desk-stage-9` | 35 | Vendor matching, manager keyboards, the vendor send |
| Maintenance Operations | `mt-operations-stage-9` | 17 | Digest, heartbeat, escalation, conversation sync |
| **Active total** | | **132** | |
| Maintenance Triage Demo Tools | `mt-demo-tools-stage-9` | 4 | Fixture rehearsal. Imported, deliberately never published |

The remaining 13 files (107 nodes) are Stage 4 through Stage 8 exports kept for rollback.
`import-stage-9-workflows.ps1 -CleanupLegacy` unpublishes 14 named legacy IDs and refuses to
run at all unless `-PublishLiveTriggers` is also passed, so replacements go live before
predecessors are retired.

**Why the shape is what it is.** Two platform constraints drove it.

First, the Manager Desk is 35 nodes largely because Telegram inline keyboards must be
declared as explicit fixed-collection rows. Passing a keyboard as a single expression
produces a plain-text message with no buttons and no error. There are therefore four
literal keyboard variants for zero, one, two, and three vendor candidates, each behind its
own IF node, rather than one node building a keyboard dynamically. Eight nodes exist because
of one platform behaviour.

Second, workflows are called through Execute Sub-workflow, which returns nothing usable when
the called workflow exits through multiple routed branches. Callers therefore treat the
Triage Engine as a database-writing side effect and reselect state afterward rather than
consuming its output. That pattern is why intake workflows have a `Preserve Intake Context`
node before the engine call and reselect after it.

## The Single Path To An Irreversible Action

The irreversible action in this build is **sending an email to a vendor**. It is
irreversible in the way that matters commercially: a contractor has been contacted on the
client's behalf.

Measured across all 20 committed workflow files, **5 nodes can send email**. Across the 5
published workflows, **3 can**, out of 132 nodes:

| Node | Workflow | Sends |
|---|---|---|
| `SMTP Send Approved Vendor Email` | Manager Desk | The vendor email |
| `SMTP Send Telegram Onboarding` | Tenant Intake | One onboarding link to the tenant |
| `SMTP Send Daily Digest` | Operations | A summary to the operator, off by default |

**Exactly one node out of 132 can email a vendor.** Its only inbound connection is a single
linear chain with no branch merging into it:

```
ManagerTelegramTrigger          (a manager taps a button)
  -> Normalize Manager Callback
  -> Postgres Claim Vendor Send (INSERT ... ON CONFLICT (ticket_id) DO NOTHING)
  -> Prepare Vendor Email       (should_send = result === 'send')
  -> Should Send Vendor Email   (IF, strict boolean)
  -> SMTP Send Approved Vendor Email
```

There is no schedule, no webhook, no model output, and no other workflow that reaches it.
The chain begins at a human button press and nothing else can start it.

The one-send guarantee is a database constraint, not application logic.
`triage.vendor_send_attempts` declares `UNIQUE (ticket_id)`, and the claim is an
`INSERT ... ON CONFLICT (ticket_id) DO NOTHING ... RETURNING *`. A second tap inserts
nothing, so the CTE returns `already_handled`, so `should_send` is false, so the IF blocks.
The email node is never reached rather than being reached and told not to fire.

To verify: open `workflows/maintenance-triage-manager-desk.json`, search `emailSend`, and
walk `connections` backwards from that node name.

**Caveat worth stating.** The sender is hardcoded to a demo address in
`Prepare Vendor Email`. The **recipient is not**. It is `attempt.vendor_email`, read from the
Airtable vendor roster. Every seeded synthetic vendor in `setup-stage-9-airtable.py` uses the
controlled test mailbox, which is why testing is safe, but that safety comes from the seed
data rather than from a guard. Editing a vendor's email in Airtable would send real mail to
that address. There is no allowlist.

## How The Guardrails Work

**They are rules, not prompting, and they run after the model.**

`Apply Safety Rules` in the Triage Engine is a Code node with no model call in it. It checks
ten signals by word-boundary regex with a negation guard: `GAS`, `CARBON_MONOXIDE`,
`SMOKE_FIRE`, `FLOOD`, `SEWAGE`, `NO_HEAT`, `NO_WATER`, `NO_COOLING`, `SECURITY`,
`ELECTRICAL`. A hit forces priority to `EMERGENCY`. The merge is `maxPriority`, so the rules
can raise the model's answer and have no expression that lowers it.

**The second run is the one that matters.** The classification prompt in
`prompts/classification-system.txt` also describes safety semantics, so a well-behaved model
usually reaches the right answer on its own. That is the first pass and it is advisory. The
Code node is the second pass and it is binding. The reason to keep both is prompt injection:
a forwarded newsletter or a tenant quoting instructions can plausibly talk a model out of an
answer, and cannot talk a regex out of anything. The rules layer does not reason, so there
is nothing to argue with.

`NEEDS_REVIEW` is absent from the model's output schema by design. The model cannot elect to
defer. Only the rules layer sets it, on a failed or unparseable model response, on low
confidence alongside an active safety signal, on a non-request that nonetheless tripped a
safety rule, or on a message with too little information to act on.

Four narrow post-model boundaries were added after live runs showed instability, each one
documented in `progress-notes.md` at the date it was added: a contained ceiling drip with a
bucket stays `URGENT`; a squeaky hinge stays `ROUTINE` unless locking or access is affected;
a standalone fan failure with no hazard context is `ROUTINE`/`APPLIANCE` rather than
`ELECTRICAL`; and water at a plumbing fixture routes to `PLUMBING` even when the model
returns `GENERAL`, with gas explicitly excluded from that path.

## How Classification And Extraction Work

Two model calls, both `gpt-5.6-luna`, both through HTTP Request against the Responses API
with `strict: true` structured output.

| Call | Schema | Returns |
|---|---|---|
| Classification | `maintenance_triage`, in `prompts/maintenance-triage.schema.json` | Priority, trade, safety signals, missing info, human-only flag, summary, confidence, language, rationale |
| Drafting | `maintenance_drafts`, in `prompts/maintenance-drafts.schema.json` | Tenant reply subject and body, clarifying questions, vendor summary |

**Decided by fixed rules before the model is consulted at all:**

- Whether this is a duplicate or a reply to an open request, by body hash over 24 hours and
  by message threading.
- Whether a tenant message is a status question rather than a new problem. This is regex
  routing over status, update, progress, ETA, arrival, fixing, resolution and completion
  language, and it runs *before* ticket creation.
- Whether a tenant message is a bare command, a generic opening, or a concrete symptom.
- Trusted tenant profile for the dedicated tenant bot: name, email, property and unit are
  injected from local configuration, never asked for and never inferred.

**Decided by fixed rules after the model, overriding it:**

- All ten safety signals, escalate-only.
- The four narrow trade and priority boundaries above.
- `NEEDS_REVIEW` in all its forms.
- Removal of `CONTACT` from missing-info when a live reply channel already exists.
- Mapping a safety signal to a trade, but only when the model returned `UNKNOWN`, so
  ordinary classification stays primary.

**Left to the model:** the language understanding itself. Reading a rambling message and
identifying the real issue, summarizing it, judging urgency in the absence of a safety
keyword, and writing the tenant and vendor text.

## Constraints That Shaped The Build

Only the ones that changed a decision.

| Constraint | Effect on the design |
|---|---|
| Telegram `callback_data` is capped at 64 bytes | Approval callbacks carry `vendor:<ticket_id>:<vendor_id>` only, 30 bytes with a five-digit ticket ID and a 17-character Airtable record ID. The vendor's email address cannot travel in the button and is looked up server-side from `ticket_vendor_candidates` at claim time |
| Telegram inline keyboards must be literal fixed-collection rows | Four hardcoded keyboard variants instead of one dynamic builder. An expression-built keyboard renders as plain text with no buttons and no error |
| n8n `2.29.10` Form Trigger v2.6 ignores the older `defineForm`/`jsonOutput` format | The generator emits `formFields.values` with explicit field names. The earlier format rendered a form with no input controls at all |
| n8n `2.29.10` double-encodes space-bearing trigger node names | The form trigger is named `TenantIntakeForm`. A name with a space produced a URL requiring `%2520` |
| n8n `2.29.10` workflow IDs are `varchar(36)` | Short internal IDs like `mt-manager-desk-stage-9` with descriptive names carried separately |
| Setting `workflow_entity.active` does not retire a published snapshot in n8n `2.29.10` | Cleanup must call `n8n unpublish:workflow --id=<id>` and restart n8n. A database flag flip leaves the old trigger live |
| Airtable's public schema API cannot delete a table, convert a field type, amend select choices, or create native created/modified-time fields | Typed tables are created fresh after a manual delete in the UI. Timestamps are Postgres-backed `Created At` and `Last Synced` fields. Sync filters choices an older table does not have rather than failing the write |
| Airtable rejects an empty string written to a single-select with HTTP 422 | Sync omits absent select values entirely rather than sending `""` |
| Postgres data-only dumps do not carry sequence state | Restore tooling realigns the visible reference sequence, and `triage.next_ticket_ref()` skips collisions rather than trusting the sequence |
| Execute Sub-workflow returns nothing usable across multiple routed exit branches | Callers reselect ticket state after the engine call instead of consuming its output |
| Shared mailbox for both intake and outbound | Every system-generated email carries `[MT-SYSTEM]` or `[MT-SYSTEM][VENDOR]` and IMAP normalization skips those subjects case-insensitively, including with `Re:` prefixes |
| Pre-triage buffer growth is unbounded by default | `left(concat_ws(...), 4000)` caps accumulated preliminary conversation at 4,000 characters in SQL |

## The Defects That Shipped

The most useful section here. Each of these was live in the build.

### The vendor email loop

**Symptom.** Vendor emails for `MR-0011` and `MR-0012` came back as new tickets `MR-0014`
and `MR-0015`, each generating its own manager approval message.

**Cause.** Intake and outbound share one Gmail mailbox. The onboarding email had a
`[MT-SYSTEM]` subject prefix that IMAP intake skipped. The vendor email did not carry the
configured `[MT-SYSTEM][VENDOR]` prefix, so the system read its own outbound mail back in as
tenant requests.

**Fix.** Vendor subjects now carry the prefix, and inbound normalization matches prefixes
case-insensitively even with `Re:` or leading whitespace.

**Generalisation.** Any system that reads and writes the same channel will eventually
consume its own output. The exclusion marker has to be applied to *every* outbound path, and
adding a new outbound path is exactly when it gets forgotten. Test the loop deliberately
rather than waiting to observe it.

### The status question that became a ticket

**Symptom.** A tenant asked "When will all these issues be resolved?" and it was classified
as a new maintenance request, becoming `MR-0013`.

**Cause.** Status detection used a narrow arrival-only regex that did not cover resolution or
completion phrasing.

**Fix.** Status routing now covers resolution, progress and completion language, runs before
ticket creation, returns one consolidated per-request summary, and records the exchange
without invoking triage.

**Generalisation.** A classifier placed after an intent router inherits every gap in that
router. The failure mode is silent and looks like a legitimate ticket, so it will not appear
in error logs. Route intent before creating durable state, never after.

### Manager review alerts that were never sent

**Symptom.** A `NEEDS_REVIEW` request produced no manager alert at all. The tenant had been
asked for clarification and nobody was told.

**Cause.** The manager workflow treated `NEEDS_REVIEW` as ineligible for notification,
because eligibility had been written for vendor dispatch and then reused for notification.

**Fix.** Review paths now send a Hold-only keyboard with no vendor button. Vendor candidates
are suppressed until a request is dispatch-eligible, which is a separate question from
whether a human should be told.

**Generalisation.** "Can we act on this automatically?" and "should a person hear about
this?" are different predicates. Sharing one flag between them means the least automatable
cases go the quietest, which is exactly backwards.

### The Postgres node that ate its own input

**Symptom.** Direct tenant Telegram messages failed with `Stage 4 core requires source and
body_raw`.

**Cause.** `Postgres Load Tenant Chat` replaced the incoming item with its SQL result. The
normalized Telegram `text` was gone before the next node ran.

**Fix.** A `Reattach Tenant Event Context` node restores the normalized event immediately
after the lookup, and the validation script now asserts both that node and its connection
exist.

**Generalisation.** In most workflow engines a database node returns rows, not your item.
Anything you need downstream has to be either returned by the query or re-attached
explicitly. Assume every database node is destructive to context until proven otherwise.

### The ticket reference collision after restore

**Symptom.** `duplicate key value violates unique constraint "tickets_ref_key"` on tenant
ingestion, but only after restoring a populated snapshot.

**Cause.** Data-only dumps do not include sequence state. Restoring tickets containing
`MR-0001` left the sequence about to issue `MR-0001` again.

**Fix.** `triage.next_ticket_ref()`, a plpgsql allocator that loops until it finds an unused
reference, plus restore tooling that realigns the sequence. A regression test forces the
collision and asserts it returns `MR-0002`.

**Generalisation.** Sequences are not data and most dump modes will not carry them. Any
restore path needs a sequence realignment step, and any human-visible identifier should be
allocated defensively rather than trusting the counter.

### The stale approval button, whose symptom was nothing at all

**Symptom.** None. Never observed. Found by reasoning about the reset procedure rather than
by a failure.

**Cause.** Telegram approval buttons stay in chat history forever and carry an internal
ticket identifier. The reset originally restarted all identity sequences, which meant an old
button in an old chat could resolve to a newly created ticket and approve a vendor email for
a request nobody had looked at.

**Fix.** Reset restarts only the visible `MR-` reference sequence and deliberately continues
internal database identities, so an old callback can never resolve to a new ticket.

**Generalisation.** This is the most valuable defect in the list precisely because nothing
broke. Any external system holding your identifiers, especially chat clients with unbounded
history, turns identifier reuse into a correctness bug that testing will not find. Reset and
reuse are the same problem wearing different clothes.

### The documentation that silently poisoned generated work

**Symptom.** None, for weeks. Discovered while starting unrelated content work.

**Cause.** A Stage 9 documentation pass updated three docs and missed
`.agents/product-marketing.md`, which still described the Stage 8 build: a read-only board
that no longer existed, email tenant replies that had been replaced by Telegram, and the
claim that the system "never auto-replies," which Stage 9 had made false.

**Fix.** Rewritten, and `progress-notes.md` now names that file as part of the documentation
set that must be updated alongside any change to intake channels, tenant messaging, manager
approval or safety boundaries.

**Generalisation.** Context files that other tooling reads are code, not documentation. Over
a hundred skill files read that one before acting, so its staleness would have propagated
into everything generated afterward, confidently and invisibly. A stale doc that a human
reads is a nuisance; a stale doc that a machine reads is a defect with fan-out.

### The vague message that reached vendor approval

**Symptom.** "There is a problem in my bathroom" was classified as a complete request and
generated a manager vendor-approval message.

**Cause.** No gate distinguished a describable symptom from an opening pleasantry, and the
manager desk was invoked before clarification and again afterward.

**Fix.** Durable preliminary-message buffering on `tenant_chats`. Generic messages get a
deterministic request for a concrete symptom and create no ticket, no workspace record, no
manager alert and no vendor draft. New tickets pass a missing-details gate before the manager
is notified at all.

**Generalisation.** "Enough information to classify" and "enough information to act" are
different thresholds, and a model will happily produce a confident classification from the
first. Gate on the second before anything irreversible becomes reachable.

## Reproducibility

**Workflows are generated, not hand-edited.** `scripts/build-stage-4-workflows.py` and
`scripts/build-stage-9-workflows.py` emit the JSON in `workflows/`. Prompts and schemas are
read from `prompts/` at generation time and embedded, so the model contract is versioned in
readable files rather than buried in a node. Editing a workflow in the n8n UI and exporting
it back is not the supported path; change the generator and regenerate.

**Credentials never appear in committed files.** Workflow JSON carries credential *names*.
`import-stage-9-workflows.ps1` queries the local n8n credentials table, resolves each name to
that machine's actual credential ID, writes resolved copies to a temporary staging directory,
imports from there, and deletes the staging directory in a `finally` block. It throws if a
named credential is missing or if two credentials share a name and type.

**Local identifiers are not committed either.** The Airtable base ID, the tenant bot
username, the manager chat ID, the tunnel URL and the mailbox address are written into
`triage.config` by `configure-stage-9-airtable.ps1` and friends, or into an ignored `.env`.
The Airtable token is read from the local environment or ignored `.env` and never logged.

**Reused rather than reimplemented.** The Stage 9 build calls the Stage 4 Triage Engine
rather than reimplementing classification. `apply-stage-9.ps1` applies the Stage 4 migration
first, and the Stage 9 importer regenerates the Stage 4 core workflow before importing, so
the two cannot drift. The safety-rules layer, the strict schemas, the deterministic
boundaries and the `NEEDS_REVIEW` semantics are all Stage 4 code that Stage 9 inherited
without modification, which is why Stage 8's fixture rehearsal still passes against a Stage 9
build.

## What Was Verified, And What That Means

| Check | What it does |
|---|---|
| `validate-stage-9.ps1` | 32 assertion sites over the committed build. Most are structural regressions derived directly from the defects above: that the safe reference allocator is in use, that four keyboard variants exist, that no placeholder vendor buttons are generated, that the Telegram context-preservation node and its connection exist, that clarification has no two-round cap, that the classifier is `gpt-5.6-luna`, that vendor email carries the loop marker |
| `validate-stage-9.ps1 -LivePrerequisites` | Adds credential and configuration presence checks |
| `run-stage-9-rehearsal.ps1 -Runs 5` | Five clean runs of the six live-demo fixtures. Last recorded result: 30/30 expected priorities, zero tenant messages, zero vendor-send attempts |
| `test-stage-9-conversation-routing.js` | Replays the exact live message sequence that produced the status-question and vendor-loop defects |
| Fixture corpus | 30 synthetic messages with expected-output files, of which 6 are the live-demo set |

**This is testing, not a result.** The rehearsal number is six messages run five times, which
is a stability check, not an accuracy measurement. The 30-fixture corpus has **not** passed:
`progress-notes.md` records the full run as failing with under-escalations and missed safety
signals, and that is why no percentage appears anywhere in either document. No number in this
repository came from a property management company, because there is not one.

If you want an arithmetic sanity check on running cost, do it yourself rather than taking a
figure from here: two model calls per request, on the published per-token pricing for the
model named above, times your own request volume. That is arithmetic offered for you to
redo, not a benchmark.

## Known Limits Of The Current Build

- **No verified tenant identity.** The pairing link is a bearer token with no proof of who is
  holding it.
- **The tenant bot serves one configured tenant**, with name, email, property and unit
  injected from local config. Multi-tenant needs per-tenant identity binding or per-tenant
  bots.
- **The vendor recipient is not allowlisted.** Safety in testing comes from seeded vendor
  records pointing at a controlled mailbox, not from a guard in the code.
- **No PMS or work-order integration**, at all.
- **No photo interpretation, no voicemail, no phone.**
- **English and Spanish only** have been exercised.
- **No production email authentication.** Outbound goes from a demo Gmail address with no
  SPF/DKIM/DMARC story.
- **Telegram callbacks require a public HTTPS URL.** Local demos use a quick tunnel whose URL
  expires, and an expired URL breaks manager approval rather than degrading it.
- **No alert grouping.** Six requests from one burst pipe produce six manager alerts.
- **The larger fixture corpus does not pass**, and no broad accuracy claim can be made.
- **One operator, one machine, no monitoring, no backups, no uptime story.**
