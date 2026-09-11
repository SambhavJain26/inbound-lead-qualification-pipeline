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
