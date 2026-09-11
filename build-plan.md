# Build Plan — Automated Leasing & Tenant Screening (POC)

Last updated: 2026-09-11

Six stages to a working demo. **This is a proof of concept for a meeting or a demo video,
not a production build.** One happy path that runs end to end, plus one fixture that lands on
the fraud flag. Nothing else.

## Ground Rules For This Plan

- **Happy path first, always.** If something works once, move on.
- **No edge-case matrix.** See "What We Are Not Testing" below — read it before adding a check.
- **One gate per stage.** A stage is done when its single check passes. Record it in
  `progress-notes.md` and move.
- **One of everything.** One unit, one lead-email format, one paystub layout, one lease
  template, one approval path.
- If a stage starts sprawling past a handful of nodes of real logic, stop — the Excalidraw
  diagram carries it instead.

## The Two Demo Outcomes

Both run through the **identical pipeline**. The only difference is fixture data, which is
why the second one is nearly free to build.

| Fixture | What happens | Why it's in the demo |
|---|---|---|
| **Maya Restrepo** | Claimed income, paystub, and Plaid all agree. Criteria met. Manager approves. Lease out, signed, unit leased. | The clean end-to-end run |
| **Devon Clarke** | Paystub says $7,800/mo. Plaid says $4,150/mo. Engine flags the mismatch and stops for a human. | **The moment that sells it** — NMHC says 85% of operators have seen falsified income docs |

Voucher / rental-assistance handling: the schema carries `rental_assistance_amount` and the
engine computes the income multiple against tenant-responsible rent (two lines of arithmetic,
worth getting right). **Not** a demo path — it is a talking point if a prospect raises it.

---

## Stage 1 — Environment

Docker Compose with n8n + Postgres. `.env` + `.env.example`. cloudflared tunnel script.
Credentials created by hand in the n8n UI: Postgres, OpenAI, Gmail OAuth2, Telegram, DocuSign,
and HTTP header auth for Plaid.

Accounts to create: Plaid (sandbox keys from dashboard), DocuSign developer, Cal.com free,
Telegram bot via BotFather.

**Gate:** `docker compose ps` shows both healthy, n8n opens at `localhost:5678`, the tunnel URL
resolves to it, and a manual test message reaches Telegram.

---

## Stage 2 — Schema, Fixtures, Seed

Four tables in `db/schema.sql`:

- `units` — property facts; doubles as the FAQ knowledge base
- `leads` — prospect, conversation state, pre-qual answers, tour booking
- `applications` — applicant details, extracted values, verification results, criteria
  outcome, decision, lease status
- `message_log` — every message in and out, with tier and guardrail result

Fixtures: one unit, two applicants (above), one Zillow-format lead email, two paystub PDFs
(fabricated employers, fabricated amounts), one lease template with merge slots.

`scripts/seed-demo.js` wipes and reseeds to a clean pre-demo state.

**Gate:** seed runs clean twice in a row and the tables hold the expected rows.

---

## Stage 3 — WF1 `leasing-front`

Lead in → normalize → grounded FAQ → pre-qualification → Cal.com tour link → one-time lock
code (MOCK) → post-tour application link.

Two entry points, one normalizer: Gmail trigger on the fixture Zillow email, and the n8n Chat
Trigger in hosted mode for the website visitor.

The FAQ prompt answers **only** from the `units` row and refuses anything outside it. It
carries the fair-housing prohibition list from `foundation-5-leasing-screening.md`.
Pre-qualification collects move-in date, income band, pets, vehicles, occupants — and is never
phrased to a prospect as a rejection.

**Gate:** drop the fixture lead email into the inbox, get a grounded reply back. Ask the chat
widget about the pet policy, get the right answer. Book a slot in Cal.com, see the `leads` row
update and the tour message arrive.

---

## Stage 4 — WF2 `application-and-verify`

Form Trigger application → SSN masked to last-4 on arrival → paystub/ID extraction → **Plaid
Sandbox income** → bureau check (MOCK) → deterministic criteria engine → decision card to
Telegram.

Plaid flow: `/user/create` → `/sandbox/public_token/create` with `ins_135842` →
`/credit/payroll_income/get`. **Capture the first real response into `fixtures/` and build
against that** — the field shape is not documented.

The criteria engine is plain JS reading thresholds from a config row. It emits
`meets_criteria` / `conditional` / `does_not_meet` plus a per-criterion evidence trail. It
never calls a model.

The Telegram card shows the three income numbers side by side — **claimed / extracted /
verified** — with their sources, then the criteria results, then the buttons.

**Gate:** submit both fixture applications. Maya's card shows three matching numbers and
criteria met. Devon's card shows the mismatch and a flag. Neither auto-decides anything.

---

## Stage 5 — WF3 `telegram-router` + WF4 `lease-and-signature`

WF3 is the single Telegram Trigger — all buttons and commands enter here. Approve / mark
conditional / send to review. There is deliberately **no button that sends a denial**;
`does_not_meet` routes to a human handoff note.

WF4 populates the lease template from verified fields, creates the DocuSign envelope, waits
on the Connect webhook, then marks the unit leased and sends the welcome message.

DocuSign responds to its callback immediately — never hold the HTTP response open waiting on
a human.

**Gate:** tap Approve on Maya's card. Envelope arrives, sign it, unit flips to leased, welcome
message sends. That is the full pipeline on camera.

---

## Stage 6 — Demo Polish

- `scripts/reset-demo.js` — back to clean state in one command, between takes
- Full dry run, twice, timing it
- `docs/recording-checklist.md` — tab order, what to say at each beat, where the fraud reveal lands
- **Excalidraw architecture diagram** — every mock box drawn with its production counterpart:
  bureau MOCK → TransUnion ShareAble · lock code MOCK → Rently/smart lock · Gmail lead → ILS
  feed · Postgres → PMS (Yardi/AppFolio/Entrata) · email → SMS via A2P · plus the FCRA
  adverse-action module a real deployment adds
- `my_builds/05-*/how-the-system-works.md` and `build-technical-notes.md` matching builds 01–04

**Gate:** a clean recorded run, start to finish, without a reset mid-take.

---

## What We Are Not Testing

Explicitly out of scope. Do not add these without a plan revision.

- Re-ingest / idempotency beyond the double-tap guard below
- Malformed or missing documents, OCR failures, unreadable uploads
- Multi-applicant households, co-signers, guarantors
- Partial-document chase loops
- Expired or withdrawn applications
- Concurrent applications on one unit
- Rate-limit and retry behaviour under load
- Token/cost optimisation
- Any edge case in Cal.com, DocuSign, or Plaid beyond the one path used

## The Three Invariants That Do Matter

Kept because a prospect will click around in a live meeting, and because they are cheap.

1. **Double-tapping an approve button must not send two envelopes.** People double-tap. Guard
   on the record's current state before acting.
2. **Nothing decides on its own.** No path reaches a lease without a recorded human tap. This
   is the compliance claim — it has to be true.
3. **Failures are visible.** An OpenAI or Plaid error posts to Telegram. Silent failure mid-demo
   is worse than a visible error you can talk through.

Everything else in `CLAUDE.md`'s invariant list is a production concern and is deferred.

## Effort

Rough, assuming the usual n8n friction:

| Stage | Effort |
|---|---|
| 1 — Environment | Half a day (mostly account signups and OAuth) |
| 2 — Schema + fixtures | Half a day |
| 3 — Leasing front | One day |
| 4 — Application + verify | One to one and a half days — the Plaid shape is the unknown |
| 5 — Router + lease | One day |
| 6 — Polish + diagram + write-ups | One day |

Call it **five to six working days** to a recorded demo.

## Risks

- **Plaid response shape is undocumented.** Capture it early in Stage 4 — if it surprises us,
  everything downstream shifts. Do this first in that stage.
- **DocuSign has an undocumented cumulative recipient cap** on developer accounts. Use a small
  fixed pool of recipient addresses; don't fire envelopes on every test iteration.
- **cloudflared gets a new hostname every run** and n8n reads `WEBHOOK_URL` only at container
  start. After any tunnel or Docker restart: re-run the tunnel script, then re-import the
  trigger workflows. This will bite at least once.
