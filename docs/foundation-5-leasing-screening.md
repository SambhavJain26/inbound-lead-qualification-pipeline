# Foundation — How Leasing And Tenant Screening Actually Work

Last updated: 2026-09-11

Domain background for the build. What the real process looks like, who is involved, what the
legal constraints actually require, and which of those constraints change the design.

## Who Runs A Showing

A common misconception worth clearing up, because it shapes the front of the funnel.

Rental showings are generally **not** run by commission real-estate agents. Those belong to
home sales. Rental portfolios are operated by **property management companies**, and tours
are run by salaried or hourly **leasing agents** employed by the PMC — or increasingly by
nobody at all, via self-guided tours where the prospect verifies identity on their phone,
receives a one-time smart-lock code, and walks the unit alone.

Either way, the work *before* the tour — answering questions at 10pm, confirming
availability, qualifying, and booking the slot — is the part that scales badly and the part
automation actually addresses.

## Who Visits A Property Management Website

Four audiences with incompatible goals. Routing them apart matters, because treating an owner
lead like an apartment applicant wastes the most valuable visitor the site gets.

| Audience | Share of traffic | What they want |
|---|---|---|
| Prospective tenants | ~70–80% | Vacancies, pricing, pet/parking policy, tour booking, application link |
| Current residents | ~15–20% | Pay rent, submit maintenance, renewal and lease questions |
| Property owners / investors | ~5–10% | Management fees, rental analysis, owner portal — **highest value per visitor** |
| Vendors and contractors | <5% | Getting on the approved list, invoices, payment status |

This build addresses the first group only. Builds 01–04 cover pieces of the second and
fourth. The third is a sales problem, not an operations one.

## The Two-Phase Screening Model

Screening is not one event. It happens twice, and conflating them is a legal mistake.

```
Inquiry ──► PRE-SCREENING ──► Tour ──► Application ──► FORMAL SCREENING ──► Lease Offer
            (self-reported,              (consent +      (verified,
             unverified)                  fee)            FCRA-governed)
```

### Phase 1 — Pre-Screening (before the tour)

Low-friction qualifier questions asked conversationally: intended move-in date, whether the
prospect meets the stated income threshold, pets, vehicles, number of occupants.

Everything here is **self-reported and unverified**. Its only purpose is scheduling triage —
not sending an agent across town for a prospect whose move-in date is four months out.

**Design consequence:** pre-qualification must never be presented to a prospect as a
rejection. A prospect who does not clear it is offered alternatives, or routed to a human.
It is a scheduling filter, not a rental decision.

### Phase 2 — Formal Screening (after application and fee)

Triggered by a submitted application carrying explicit written consent. Only now may credit,
criminal, eviction, banking, and employment records legally be accessed.

The application fee (typically $30–$55) exists to cover the bureau's hard cost.

## What A Rental Application Contains

Five blocks. The build's form mirrors this structure.

1. **Identity** — legal name, DOB, contact, SSN/ITIN, government ID upload, and 2–3 years of
   address history with prior landlord contacts.
2. **Employment and income** — employer, title, start date, income figures, verified either
   the modern way (open-banking or payroll API pulling real deposit history) or the
   traditional way (uploaded pay stubs, W-2s, bank statements).
3. **Occupants, pets, vehicles** — every adult 18+ applies separately and is screened
   separately; minors are tracked for occupancy limits only; animals are recorded with a
   distinction between pets and Service/ESA animals, which cannot be charged pet rent;
   vehicles for parking assignment.
4. **Self-disclosures** — prior eviction filings, broken leases, bankruptcy, smoking.
5. **Consent and fee** — the FCRA written authorization, which is what makes Phase 2 lawful,
   plus the non-refundable fee.

**Design consequence:** the demo captures an SSN field because a real application has one,
but masks it to last-4 on arrival and never stores the raw value. Fixtures carry fabricated
numbers only.

## Why Screening Exists At All

Four reasons, in rough order of financial weight:

1. **Eviction is catastrophic.** Three to nine-plus months depending on state, $0 rent
   throughout, $3,500–$10,000+ in legal and court costs, and frequently property damage.
2. **Application fraud is rampant.** See `05-automated-leasing-tenant-screening.md` — 93% of
   providers hit in twelve months, 85% seeing falsified income documents.
3. **Duty of care.** In multifamily, the operator has obligations to existing residents and
   to the physical asset.
4. **Fair housing defence.** Counterintuitively, *formalising* screening protects the
   landlord. "I had a bad feeling about them" is indefensible. A published, objective rubric
   applied identically to every applicant, with a record of how it was applied, is the
   defence.

## The Legal Constraints That Change The Design

Three constraints found during research that directly alter what gets built.

### 1. HUD's May 2024 AI Guidance Is Effectively A Spec

HUD's guidance says screening tools should **implement, rather than set**, the housing
provider's policies, and should offer customizability as to criteria, standards, and weights.
It also says the obligation cannot be outsourced to a vendor or a model, and that a decision
being algorithmic does not shield it from civil-rights law.

**Design consequence:** thresholds live in a manager-editable config table, never in code or
a prompt. The engine is deterministic. The model is nowhere near the decision.

### 2. Questions That Cannot Be Asked

Federal Fair Housing protected classes: race, colour, national origin, religion, sex,
familial status, and disability. Many states and localities add age, marital status, sexual
orientation, and source of income.

Off-limits in any pre-screening conversation or application field:

- Children, their number, their ages, or a due date (familial status)
- Disability status, medical conditions, or why an animal is needed — an operator may ask
  only about occupancy limits, required property configuration, or a reasonable accommodation
- National origin, ethnicity, or citizenship status
- Religious practice
- **Arrest** records — conviction records may be reviewed, arrests may not

[Illegal rental application questions](https://snappt.com/blog/illegal-rental-application-questions/) ·
[Fair housing screening questions](https://rentprep.com/blog/tenant-screening-news/7-innocent-questions-landlords-cant-ask-rental-applicants/)

**Design consequence:** the FAQ and pre-qualification prompt carries an explicit prohibition
list, the output schema has no field that could carry a protected attribute, and the bot must
refuse to answer prospect questions that would elicit one — "is this a good building for
families?" gets a factual property answer, not a demographic one.

### 3. Source Of Income Changes The Income Rule

This is the finding that would have produced a wrong build.

As of 2026, **19 states, DC, Guam, and 100+ localities** prohibit source-of-income
discrimination — including six of the ten largest US cities. The most common violation is
refusing a Housing Choice Voucher holder.

Critically, the **3x rent rule interacts with this directly**. Requiring a voucher holder to
earn 3x the *full* rent from their own income is a bar almost no voucher holder can clear,
and it is treated as source-of-income discrimination where such laws apply. The correct
application is to subtract the subsidised portion and apply the multiple **only to the
tenant's share of rent**.

Even where no explicit statute exists, a blanket refusal can trigger disparate-impact
liability, because voucher holders skew toward protected groups. Income-to-rent rules
generally can carry disparate impact on women, families, and people with disabilities.

[PRRAC: State and local source-of-income nondiscrimination laws](https://www.prrac.org/appendixb/) ·
[Local Housing Solutions: source of income laws](https://www.localhousingsolutions.org/housing-policy-library/source-of-income-laws/)

**Design consequence — concrete:** the criteria engine must compute the income multiple
against **tenant-responsible rent**, not gross rent, and the config table needs a
`rental_assistance_amount` field. The demo should include one voucher-holder fixture to show
the engine handling it correctly. This is a genuinely good demo beat — it shows the prospect
the system understands something their spreadsheet does not.

### 4. FCRA Adverse Action Is A Process, Not A Letter

Denying based on a consumer report requires: a **pre-adverse-action notice** including a copy
of the report and the FCRA Summary of Rights, a **waiting period** (commonly five business
days) for the applicant to dispute, and only then a **final adverse-action notice**.

**Design consequence:** the build never generates any of these. A `does_not_meet` outcome
stops and hands off to a human, displaying what a real process requires. The stop is
demonstrated as a deliberate feature.

## How Verification Actually Works Now

The industry has moved off documents, which is the whole reason the fraud numbers are what
they are.

| Method | Turnaround | Trust |
|---|---|---|
| Calling employers, uploaded pay stubs | 2–7 business days | Low — the failure mode in the NMHC data |
| Open banking / payroll API (Plaid, Argyle, Truv) | Minutes | High — source data, unalterable by the applicant |

Reported turnaround for AI-assisted income verification has come down from roughly six hours
to under 90 minutes, while fully manual verification still runs 3–7 days.
[Tenant screening timelines](https://snappt.com/blog/how-long-does-tenant-screening-take/)

Background checks themselves are fast — most apartment checks conclude in 24–72 hours. The
bottleneck is income, which is exactly the piece this build verifies for real.

## Terminology

- **PMC** — property management company
- **ILS** — internet listing service (Zillow Rentals, Apartments.com, HotPads)
- **Days on market / time-to-lease** — days a unit is listed before a signed lease
- **Lead-to-lease** — conversion from inquiry to signature; a 10:4:1 lead:tour:lease ratio is
  a common benchmark
- **Adverse action** — the FCRA process for a denial based on a consumer report
- **Source of income** — protected class in many jurisdictions; includes housing vouchers
- **ESA** — emotional support animal; not a pet under federal law, cannot be charged pet rent
- **A2P 10DLC** — US carrier registration required for application-to-person SMS
