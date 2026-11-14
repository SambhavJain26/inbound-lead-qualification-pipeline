# Build Technical Notes

Last updated: 2026-08-22

The technical companion to `how-the-system-works.md`. That document is written for a
property manager and deliberately avoids naming a stack. This one is for a builder or a
technically minded operator asking how it is actually put together, and for answering
technical questions in public without guessing.

Everything here is measured from the committed build rather than remembered. Where a
number appears, it came from the code or from a live run.

## The stack, and why each piece

| Layer | Choice | Why not the obvious alternative |
|---|---|---|
| Orchestration | **Self-hosted n8n** in Docker | The client owns the instance. If I disappear, any n8n developer can maintain it. A hosted platform would put them on my infrastructure rather than their own |
| State | **Airtable** | It is the manager's screen and the database at the same time. Postgres would have needed a UI built on top, and building a UI is how this becomes software somebody has to log into |
| Action surface | **Telegram** | Approvals happen on a phone, in a chat the manager already has. A web dashboard was built in an earlier version and deleted |
| Resident channel | **Gmail** | Every lease roster carries an email address, and a reply comes back as text that can be matched deterministically. SMS reaches more people and needs the client's own registered provider and 10DLC setup |
| Model | **gpt-5.6-luna** via n8n's built-in OpenAI node | Cost-sensitive tier, adequate for drafting and classification under a fixed schema |

**Total: 88 nodes across 5 workflows.** Nothing else is running.

## The five workflows

| Workflow | Nodes | Owns |
|---|---|---|
| **WF6** Telegram router | 25 | The bot's single webhook. Every button press and slash command enters here and dispatches |
| **WF7** Outreach | 21 | Cadence selection, batch drafting, guardrails, writing drafts back, posting approval cards |
| **WF8** Replies | 21 | Finding a reply, matching it, classifying it, routing it, alerting |
| **WF9** Ops | 18 | Daily sweep, cohort recompute, escalation, metrics, and the error trigger for every other workflow |
| **WF10** Auto-poll | 3 | Calls WF8 once a minute. Silent when there is nothing |

**Why a router workflow exists at all:** Telegram permits exactly one webhook per bot. You
cannot have four workflows each listening for their own button. So one workflow owns the
trigger, decodes the callback, and dispatches. That constraint shaped the architecture more
than any design preference did.

## The single send path

Across all 88 nodes there is **exactly one node that can send a resident an email**:
`Gmail Send Resident Message`, in WF6, on the button-handler path.

- WF7 drafts messages and has **no Gmail node at all**.
- WF9 runs the sweep and has **no Gmail node at all**.
- WF8's only Gmail node is `getAll`, a read.

This is why "nothing reaches a resident without a person" is a structural claim rather than
a policy. There is no code path from a timer or a schedule to a resident's inbox. The only
route runs through a callback from a button somebody pressed.

## How the guardrails actually work

Not prompting. Fixed regular expressions in a code node, run against the assembled message.

Two separate guards:

- **`guardDraft()`** for outbound check-ins. Rejects rent, renewal, notice, offer, increase,
  expiry, deadline, signing, lease-term, legal, eviction and generic-resident wording; any
  money or percentage pattern; any date-like pattern; a generic greeting; a body outside
  35–95 words; a missing resident first name; anything other than exactly one question mark;
  exclamation marks, bullets and emoji; and any mention of automation or AI.
- **`guardReply()`** for replies and fix-confirmations. Looser, because a reply may reference
  the resident's issue and is not held to one question. Still rejects rent, renewal, lease
  terms, legal wording, money, dates, and **promised outcomes**, with a separate pattern catching
  "we will fix", "guarantee", "by Friday", "within 48 hours".

**Both run twice.** Once when the model produces a draft, and again at send time against
whatever the record currently holds. The second run is the one that matters, because a
manager can rewrite a draft in Airtable or from the chat between those two moments.

A draft failing the first guard is rewritten once. Failing twice, it is marked
`REVIEW_FAILED` and offered to the manager with no approve button.

## How classification works

Two stages, deliberately in this order.

**1. Fixed rules, before the model is consulted.** Opt-out, accommodation request,
habitability, legal threat, discrimination concern and obvious auto-replies are pattern
matched first. Published compliance analysis warns that a language model cannot reliably
distinguish a pet-rent question from an assistance-animal request, so those categories never
depend on one noticing.

**2. JSON Schema structured output** for everything else, through n8n's OpenAI Responses
operation. The schema is strict and closed: intent, grievance present, grievance summary,
grievance category, urgency, compliance flag, suggested human action, confidence. Enums are
fixed. There is no free-text field the model can wander into.

**The model never decides who a reply belongs to.** Matching is a reference token in the
subject line, then an exact normalised sender address. Neither matching means an unmatched
alert with no resident attached.

## Constraints that shaped the build

These are the ones that changed a design decision, not trivia.

**Telegram `callback_data` is capped at 64 bytes.** Action prefixes are three characters
plus an Airtable record id, measured at **22 bytes**, so there is headroom. The encoder
throws rather than letting Telegram silently reject a button.

**Telegram bakes the keyboard into a message at send time.** Redeploying never updates a
card already in the chat. Old cards keep old behaviour permanently, which is a live hazard
during a demo and the reason the recording checklist says clear the chat first.

**Telegram's node takes `replyMarkup` as a top-level enum** and reads buttons from a fixed
collection. It ignores a JSON string in `additionalFields.reply_markup`. Because button
labels are fixed per card type and only the record id varies, each card layout gets its own
Telegram node with a static grid and an expression-driven `callback_data`.

**Airtable allows 5 requests per second per base and 10 records per write.** Writes are
batched at ten and the client sleeps 220ms between calls, about 4.5/sec.

**The Airtable Meta API cannot create formula, rollup, lookup or count fields.** So
`days_to_expiry`, `cohort`, `tenure_months`, `data_quality`, `turnover_exposure` and
`days_to_resolve` are plain fields that n8n computes and writes. Arguably better for the
demo: `cohort` as a coloured single-select reads more clearly than a formula would.

**`gpt-5.6-luna` rejects `temperature`** through the Responses operation, and rejects
`max_output_tokens` below 16. Both were found by live smoke test, not documentation.

**One Gmail mailbox is both sender and recipient in this demo**, so Gmail marks the outbound
check-in read the moment it is sent. Unread state is useless as a filter. Replies are
identified by a `Re:` subject carrying the reference token, and messages already recorded in
the log are skipped.

**cloudflared quick tunnels get a new hostname every run**, and n8n only reads `WEBHOOK_URL`
at container start. A dropped tunnel silently kills every button. `demo-start.js` detects it,
re-tunnels, recreates the container and re-registers the bot webhook.

**`n8n publish:workflow` re-activates a workflow**, undoing `update:workflow --active=false`.
That is why an "inactive" workflow kept turning itself back on until publish was skipped for
anything meant to stay off.

## Five real defects, and what caused them

The useful part. Each of these shipped, and each has a root cause worth generalising.

### 1. Cards posted with no buttons

**Symptom:** approval cards arrived as plain text.
**Cause:** `reply_markup` passed as a JSON string in `additionalFields`, which the n8n
Telegram node ignores. It wants a top-level `replyMarkup` enum plus a structured collection.
**Fix:** one Telegram node per card layout, static button grid, expression-driven
`callback_data`.
**Generalises to:** a node that silently ignores an unknown property looks identical to one
that accepted it.

### 2. The Skip button rewound state

**Symptom:** none, for about three weeks.
**Cause:** Approve was guarded because it obviously sends an email. Skip is the do-nothing
button, so it had no guard. Pressed on an already-contacted resident it reset status to
`PENDING` and cleared the stored message, making that resident eligible for a **second**
check-in on the next run.
**Fix:** Skip refuses unless the row is `AWAITING_APPROVAL` or `REVIEW_FAILED`.
**Generalises to:** attention follows apparent consequence. The controls that look harmless
get built fast and reviewed lightly, and they are usually the ones that silently rewind
state. It was found by somebody asking what a button did, not by a test.

### 3. The guardrail checked at the wrong instant

**Symptom:** none until deliberately probed.
**Cause:** guardrails ran when the model produced a draft. They did not run at send. Between
those two moments sits an editable field, so a manager could paste rent wording into Airtable
and it would go out unchecked.
**Fix:** the same guards run again at send against the current record.
**Generalises to:** find the last point your system validates something, then ask what a
person can change after that point.

### 4. A stale inbox message processed as new

**Symptom:** a verification step that was meant to prove nothing was broken triggered a live
run, which found an hour-old rehearsal email and processed it as a fresh reply.
**Cause:** the reply check assumed everything in the mailbox belonged to the current run.
**Fix:** ignore any message that arrived before the demo's first send. Because a reset clears
every send timestamp, leftover mail is structurally invisible rather than merely filtered.
**Generalises to:** "it only looks at new messages" is a claim about senders, not about what
your system checks.

### 5. The cautious design was the risky one

**Symptom:** none technically. It worked as specified.
**Cause:** compliance-flagged replies were built to draft nothing and route straight to a
human. That produced two tiers of service: an instant drafted reply for a broken fan, and
silence plus a wait for a resident asking about a grab bar. Published fair-housing analysis
describes exactly that pattern as capable of constituting disparate impact, and HUD's 2024
guidance put algorithmic tools in scope with intent explicitly not a defence.
**Fix:** every category drafts at the same speed. The compliance flag changes what the
**manager** sees, not what the **resident** waits for.
**Generalises to:** audit the paths where your automation does *less*, not only where it does
more. Refusing is a behaviour and it is not automatically the safe one.

*Not legal advice. A client's own counsel owns the policy.*

## Reproducibility

Workflow JSON is generated, not hand-edited. `scripts/v2/build-wf*.js` assemble each export
and inline the shared libraries into Code nodes, so logic lives in one place and cannot drift
between workflows.

Committed JSON carries placeholders only: `__AIRTABLE_BASE_ID__`,
`__OPENAI_CREDENTIAL_ID__` and so on. `import-v2-workflows.js` resolves them from `.env` and
from the running n8n instance at import time, so no local runtime identifier or credential is
ever committed.

Cohort banding, draft guardrails, reply routing and sweep rules are reused verbatim from the
verified v1 libraries rather than reimplemented, so v2 cannot silently drift from behaviour
that was already tested.

## What was verified, and what that means

Run end to end against 40 synthetic residents with real Gmail, Telegram, OpenAI and Airtable:

- 14 of 14 drafts passed the guardrails on the first attempt, in 22 to 33 seconds
- a second approval tap sent nothing
- Skip on a sent resident was refused
- a real Gmail reply matched by reference token on the first attempt and classified as a
  high-urgency maintenance grievance
- an accommodation request was flagged before the model ran
- an unmatched reply alerted with zero residents touched
- a log audit confirmed every outbound email corresponded to an explicit human tap

**This is fixture testing, not a customer result.** There is no client. Reply rate is the
variable a pilot would actually turn on, and it has never been measured against real
residents.

## Known limits of the current build

Stated so nobody has to find them:

- One reply is processed per check run. The response reports how many remain.
- Airtable reads take a single 100-record page, which is ample at 40 residents and would need
  pagination at scale.
- The demo runs on one mailbox as both sender and recipient, which is why reply detection
  cannot use unread state.
- The tunnel is the most fragile piece and the most likely live failure.
- No PMS integration. Data arrives as a CSV export.
