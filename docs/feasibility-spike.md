# Feasibility Spike — Tool And Service Verification

Last updated: 2026-09-11

Verified before `build-plan.md` was written, so the plan is not built on assumptions.
Constraint: **OpenAI is the only paid dependency.**

Status key: **VERIFIED** (confirmed against primary or strong secondary source) ·
**ASSUMED** (reasonable, unconfirmed — verify during the stage that uses it) ·
**BLOCKED** (cannot be used as intended).

---

## Summary Of What Changed

Two findings altered the Stage 0 design:

1. **Airtable Free is capped at 1,000 API calls per month, strictly enforced.** That is not
   survivable for an iteratively built and repeatedly rehearsed demo. → **State store moves
   to Postgres.**
2. **Cal.com cloud webhooks require HTTPS and block private IPs.** → the cloudflared tunnel
   is required for tour booking, not only for Telegram and DocuSign Connect.

Everything else confirmed as planned.

---

## State Store

### Airtable Free — **BLOCKED**

| Limit | Value |
|---|---|
| Records per base | 1,000 |
| **API calls per month, per workspace** | **1,000 — enforced since 22 Jan 2025** |
| Rate limit | 5 req/sec per base |
| Attachments | 1 GB per base |

[Airtable: managing API call limits](https://support.airtable.com/articles/7735693959-managing-api-call-limits-in-airtable) ·
[Enforcement announcement](https://community.make.com/t/important-update-airtable-enforcing-free-plan-api-limits/66395)

The record cap is fine for a demo. The **monthly call cap is not.** Four workflows doing
reads and writes burn 30–80 calls per full pipeline run. Development plus rehearsal would
exhaust a month's allowance in two or three days, and the failure mode is the demo dying
mid-pitch with a billing error.

### Decision — **Postgres**

Local Docker Postgres. Free, unlimited, relational (which suits leads → applications →
documents better than Airtable did anyway), and it is already a tool in the stack from
builds 01–04.

The manager-visible surface is **Telegram**, which build 04 proved is sufficient on its own.
If a visual board is wanted for the recording, build 03's read-only HTML board pattern is the
cheap option — it reads Postgres directly and costs nothing.

> If a paid Airtable workspace already exists, Airtable becomes viable again as a *display*
> layer. Do not make it the system of record.

---

## Income Verification

### Plaid Sandbox — **VERIFIED**

Free, "a free and fully-featured environment", unlimited test Items. Sandbox API keys come
from the Plaid dashboard on signup.
[Plaid Sandbox overview](https://plaid.com/docs/sandbox/)

Payroll income test flow without Link — **VERIFIED**:

1. `POST /user/create`
2. `POST /sandbox/public_token/create` with institution `ins_135842` (output discarded; the
   call initialises the user)
3. `POST /credit/payroll_income/get`

Only the default `user_good` user works with Sandbox payroll income. Via Link, credentials
are `user_good` / `pass_good` / SSN last-4 `1234`.
[Plaid payroll income docs](https://plaid.com/docs/income/payroll-income/) ·
[Sandbox test credentials](https://plaid.com/docs/sandbox/test-credentials/)

**ASSUMED — verify in the stage that builds it:** the exact response field names and shape of
`/credit/payroll_income/get`. Plaid's docs describe the flow but not the full payload.
Capture a real response into `fixtures/` on first successful call and build against that.

**Constraint — VERIFIED:** Sandbox performs **no OCR or image processing**. Plaid's identity
document product returns canned results there, so it is not a meaningful identity demo. Use
Plaid for income only; identity stays a labelled mock.

---

## E-Signature

### DocuSign Developer Sandbox — **VERIFIED, with a caution**

Free and unlimited for API development, Connect webhooks supported, every page carries a demo
watermark.

**Limits found:**
- **5 signers maximum per envelope** on free/developer plans (99 on paid). Irrelevant here —
  the demo lease has one signer.
- **An undocumented cumulative recipient cap across envelopes within a timeframe.** DocuSign
  moderators confirm this exists but will not state the threshold; support can lift it on
  request for testing.

[DocuSign community: recipient limits on free developer accounts](https://community.docusign.com/esignature-api-63/understanding-recipient-limits-on-free-docusign-developer-accounts-24644)

**Mitigations:** send to a small fixed pool of demo recipient addresses; iterate against
fixtures rather than firing real envelopes on every test; if the cap is hit, contact DocuSign
support to have it raised. Record the actual behaviour in `progress-notes.md` if encountered.

> Note for the demo narration: going live requires 20 consecutive error-free demo
> transactions to certify the integration key, then a paid plan from ~$50/mo. Worth saying
> out loud — it shows the prospect you know the production path.

DocuSeal (self-hosted, AGPLv3, unwatermarked) remains the documented alternative in the
architecture diagram.

---

## Scheduling

### Cal.com — **VERIFIED, with a design consequence**

Free plan includes unlimited event types and bookings, API access, and webhooks. API v2 rate
limit is 120 req/min on an API key. Native n8n trigger node exists.

**Design consequence — VERIFIED:** Cal.com **cloud** webhooks require an HTTPS subscriber URL
and **block private/internal IPs**. A booking webhook cannot reach `localhost:5678`. The
cloudflared tunnel is therefore required for WF1/WF2, not just for Telegram and DocuSign
Connect.

[Cal.com webhooks](https://cal.com/help/webhooks) ·
[API v2 introduction](https://cal.com/docs/api-reference/v2/introduction)

Self-hosted Cal.com accepts HTTP and private IPs, but needs its own Postgres and setup —
not worth it when the tunnel is already running.

---

## Prospect Channels

### n8n Chat Trigger — **VERIFIED**

Built in. **Hosted chat** mode provides an n8n-hosted chat UI with no extra setup — this is
the website-visitor surface. An embeddable widget (`@n8n/chat`) exists for the embedded mode.
A "public availability" toggle keeps it private during development.

Gotcha: the Chat *node* is unsupported in embedded mode — use Respond to Webhook there. Chat
node requires response mode "Using Response Nodes".
[n8n Chat Trigger docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger) ·
[Common issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/common-issues)

### Gmail lead intake — **VERIFIED as realistic**

Zillow delivers rental leads **by email**, with an **anonymised relay address** rather than
the prospect's real one, and the notification carries name and tour-request details but
**not** the phone number. Parsing a fixture lead email is the genuine integration pattern,
not a shortcut.
[Zillow rental lead email parsing behaviour](https://help.followupboss.com/hc/en-us/articles/360017780914-Zillow-Rentals)

**Design consequence:** the demo must reply to a relay address and must not expect a phone
number — matching real behaviour.

### SMS — **BLOCKED (deliberately)**

US A2P 10DLC carrier registration is a real barrier and Twilio trial accounts are restricted.
Email + web chat carry the prospect conversation; SMS appears in the architecture diagram as
the production swap.

---

## Consumer Reports

### Credit / eviction / criminal — **BLOCKED (licensing, not price)**

No developer sandbox exists at TransUnion SmartMove/ShareAble or Experian RentBureau. Access
requires FCRA permissible-purpose credentialing: a bureau contract, a business entity, and
typically a physical site inspection. Experian's developer portal gates these products behind
manual approval.
[Experian developer access](https://developer.experian.com/get-started) ·
[TransUnion ShareAble v3 API documentation (public PDF)](https://rentprep.com/wp-content/uploads/2024/05/TransUnion-v3-API-Docs.pdf)

**Approach:** `Screening Bureau (MOCK)` sub-workflow returning fixtures shaped to the public
ShareAble v3 response schema. Shape-accuracy is the point — swapping the mock for a live
endpoint becomes a one-node change, and it demonstrates to the prospect that the real contract
is understood.

---

## Open Items For The Build Stages

- [ ] Capture a real `/credit/payroll_income/get` Sandbox response into `fixtures/` and build
      the extraction/comparison logic against it.
- [ ] Confirm DocuSign demo cumulative recipient behaviour in practice; record the threshold
      if hit.
- [ ] Confirm the ShareAble v3 response shape from the public PDF before writing the mock.
- [ ] Decide whether a read-only HTML board is worth building for the recording, or whether
      Telegram alone carries it (build 04 precedent says it does).
